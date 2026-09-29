/**
 * Next.js ULTRA — batch 05: ISR, on-demand revalidation, generateStaticParams, route segment config, what makes a route dynamic,
 * async params, cacheLife/cacheTag, choosing PPR vs ISR vs SSR, client-side fetching.
 * Generated from markdown sources by a build script; Verified blocks are real output from Next.js 16.3.4 lab apps (with and
 * without cacheComponents), a hit-counting test API, and a real browser session for SWR.
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is ISR (Incremental Static Regeneration) in Next.js and how do you implement it?",
    seoDescription: "ISR serves a stored page and regenerates it in the background after its revalidate time. The real stale-then-fresh sequence from a Next.js 16.3.4 lab.",
    description: `**Question presented to candidate:**
"Our blog has 20,000 posts. Rebuilding everything on each publish takes too long, and rendering every request is too expensive. How does ISR help, and how do you set it up?"

**What a strong answer should cover:**
- ISR keeps a page static (prerendered, served from storage) but lets it be regenerated after deploy, without a rebuild.
- Time-based: \`export const revalidate = n\` on the route, or \`next: { revalidate: n }\` on a fetch.
- It is stale-while-revalidate: the first request after expiry still gets the old page and triggers a regeneration in the background.
- On-demand: \`revalidatePath\` or \`revalidateTag\` mark content stale from a Server Action or webhook.
- Pages not listed in \`generateStaticParams\` can be generated on first request and then cached, which is how ISR scales to many pages.

**Clarifying questions expected:**
- "How stale may a post be after an edit?" — decides between time-based and on-demand.
- "How many pages are there?" — decides how many to prerender at build time.

**Code / implementation expected:** Yes — a route with a revalidate time and a partial generateStaticParams list.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

A newspaper stand shows today's printed paper. Instead of reprinting every paper each time someone walks past (dynamic), or printing one edition at launch and never again (static), the vendor has a rule: if the paper on display is older than an hour when a customer comes, hand them that paper anyway and send someone to print a fresh one for the next customer. That is ISR: nobody waits for the press, and the display never drifts far from current.

## 2. The Core Idea

📌 **Interview term: Incremental Static Regeneration** — keeping a route static while regenerating it in the background after a set time or on demand, without rebuilding the site.

📌 **Interview term: revalidate** — the lifetime in seconds of a static route or cached fetch; after it passes, the next request triggers a regeneration.

📌 **Interview term: Stale-while-revalidate** — serving the stored version immediately and refreshing it in the background for later requests.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="One page, regenerated without a rebuild. build, expired request, next request">
  <defs>
    <marker id="nx01al2t-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One page, regenerated without a rebuild</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="111.33333333333333" y="82" text-anchor="middle">build</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">page rendered once</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">served from storage</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx01al2t-arrow)"/>
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
    <text class="d-text" x="330" y="82" text-anchor="middle">expired request</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">old page returned</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">regeneration starts</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx01al2t-arrow)"/>
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
    <text class="d-text" x="548.6666666666666" y="82" text-anchor="middle">next request</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">fresh page served</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">stored until it expires</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">nobody waits for the regeneration: the request that triggers it still receives the stale page</text>
  </g>
</svg>

ISR trades a bounded amount of staleness for static speed. The important detail is that expiry does not make anyone wait; it only schedules work.

## 3. Setting it up

| Need | How |
| :--- | :--- |
| Whole route refreshes at most every hour | \`export const revalidate = 3600\` in the page or layout |
| One data source refreshes every 60 s | \`fetch(url, { next: { revalidate: 60 } })\` |
| Refresh immediately when content changes | \`revalidatePath('/blog/slug')\` or \`revalidateTag('posts', 'max')\` in a Server Action or webhook |
| Build only the popular pages | Return those from \`generateStaticParams\`; others are generated on first visit |
| Cache Components enabled | \`cacheLife\` on 'use cache' functions instead of \`revalidate\` exports |

## 4. Hosting

ISR needs a server that can regenerate pages: \`next start\`, a Docker image, or a platform with ISR support. A static export (\`output: 'export'\`) cannot regenerate. With several server instances, configure a shared cache handler so they do not each keep their own copy. See [on-demand revalidation](/interview-question/what-is-on-demand-revalidation-in-next-js-revalidatepath-revalidatetag) and [generateStaticParams](/interview-question/what-is-generatestaticparams-in-next-js-and-how-does-it-enable-ssg-for-dynamic-r).

## 5. Verified — The Regeneration Sequence (Next.js 16.3.4, next start)

The page prints its own render time, so each regeneration is visible. The build table listed it as \`○ /isr5  5s  1y\`.

\`\`\`
GET /isr5 (export const revalidate = 5; the page prints its own render time)
t= 6.2s  request 1 (build copy expired) rendered=2026-09-23T06:00:04.222Z  x-nextjs-cache: STALE
t= 6.2s  request 2 (immediately after)  rendered=2026-09-23T06:00:04.222Z  x-nextjs-cache: STALE
t= 7.2s  request 3 (1 s later)          rendered=2026-09-23T06:00:40.971Z  x-nextjs-cache: HIT
t= 7.3s  request 4                      rendered=2026-09-23T06:00:40.971Z  x-nextjs-cache: HIT
t=13.3s  request 5 (6 s later: stale)   rendered=2026-09-23T06:00:40.971Z  x-nextjs-cache: STALE
t=14.1s  request 6                      rendered=2026-09-23T06:00:48.084Z  x-nextjs-cache: HIT
\`\`\`

Requests 1 and 2 got the build copy marked \`STALE\` while one regeneration ran; from request 3 on, the new version was a \`HIT\`. After another expiry the same pattern repeated.

Pages outside the \`generateStaticParams\` list were generated on the first request and cached for the next:

\`\`\`
generateStaticParams returns a and b; /gsp-strict also sets dynamicParams = false
/gsp-open/a        HTTP 200  x-nextjs-cache: HIT    GSP-OPEN slug=a rendered=2026-09-23T06:00:04.527Z
/gsp-open/zzz      HTTP 200  x-nextjs-cache: MISS   GSP-OPEN slug=zzz rendered=2026-09-23T06:00:50.203Z
/gsp-open/zzz      HTTP 200  x-nextjs-cache: HIT    GSP-OPEN slug=zzz rendered=2026-09-23T06:00:50.203Z
/gsp-strict/a      HTTP 200  x-nextjs-cache: HIT    GSP-STRICT slug=a
/gsp-strict/zzz    HTTP 404  x-nextjs-cache: HIT    (not found)
\`\`\`

## 6. Common Pitfalls

- **Expecting a timer.** Nothing regenerates until a request arrives after expiry, and that request still gets the old page.
- **Very low revalidate values.** A few seconds on a busy page means near-constant regeneration; use on-demand revalidation for "update right after edit".
- **Static export.** \`output: 'export'\` produces plain files with no server, so revalidate has no effect.
- **Multiple instances without a shared cache.** Each instance regenerates and stores its own copy, so users can see different versions.
- **Mixing in request-time APIs.** Reading cookies in the route makes it dynamic, and ISR no longer applies.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">ISR keeps a route static but regenerates it after deploy, either after a lifetime or on demand.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export const revalidate = n</code> on the route or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next: { revalidate: n }</code> on a fetch; with Cache Components use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheLife</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">It is stale-while-revalidate: in the lab, the requests after expiry got the old page and the next one got the new page.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">For immediate updates call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidatePath</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidateTag</code> from a Server Action or webhook.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">It needs a running server and, with several instances, a shared cache; static export cannot regenerate.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does ISR handle 20,000 posts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prerender only the most visited ones with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateStaticParams</code>; the rest are rendered on their first request and then stored. In the lab <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/gsp-open/zzz</code> was a MISS the first time and a HIT after that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if a regeneration fails?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The previously stored page keeps being served, and the next request after expiry tries again. Users do not see the error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is ISR the same as the Full Route Cache?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">ISR is the Full Route Cache with a lifetime: the stored route is regenerated when it expires or is revalidated.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this look with Cache Components?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put 'use cache' on the data or component and pick a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheLife</code> profile; the route table then shows the revalidate and expire times, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1h 1d</code> for the hours profile.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **ISR** | Static page regenerated in the background |
| **revalidate** | Lifetime in seconds before regeneration |
| **Stale-while-revalidate** | Serve the old copy, refresh for the next |
| **On-demand revalidation** | Mark content stale from code |

---
**Conclusion:** ISR gives static speed with bounded staleness: pages are served from storage and regenerated in the background when they expire or are revalidated. The lab showed the exact sequence: stale copies served while one regeneration runs, then fresh copies. Combine it with a partial generateStaticParams list to scale to any number of pages.`,
    examples: [
      {
        label: "Time-based ISR with a partial prerender list",
        tech: "tsx",
        runnable: false,
        code: `// app/blog/[slug]/page.tsx
export const revalidate = 3600; // regenerate at most once an hour

export async function generateStaticParams() {
  const top = await getTopPosts(100);        // build only the popular posts
  return top.map((p) => ({ slug: p.slug }));  // the rest are generated on first visit
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  return <article><h1>{post.title}</h1><div>{post.body}</div></article>;
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is on-demand revalidation in Next.js (revalidatePath / revalidateTag)?",
    seoDescription: "revalidateTag clears tagged data everywhere, revalidatePath clears one route; in Next 16 revalidateTag takes a profile and updateTag is Server Action only.",
    description: `**Question presented to candidate:**
"An editor publishes a change in the CMS and wants it live within seconds, not after the next hourly regeneration. How do you do that in Next.js, and when would you use a tag instead of a path?"

**What a strong answer should cover:**
- \`revalidatePath(path)\` marks the cached output of one route as stale.
- \`revalidateTag(tag, profile)\` marks every cached fetch or 'use cache' entry with that tag as stale, across all routes that use it.
- In Next.js 16 \`revalidateTag\` takes a second argument; with \`'max'\` the next request is served stale while it refreshes, with \`{ expire: 0 }\` it refetches immediately. The single-argument form is deprecated.
- \`updateTag\` expires a tag immediately for read-your-own-writes, but only inside Server Actions.
- Trigger them from a Server Action after a mutation, or from a Route Handler used as a webhook.

**Clarifying questions expected:**
- "Is the change triggered by our own form or by an external system?" — Server Action versus webhook Route Handler.
- "Must the editor see the change on the very next request?" — decides between \`max\`, \`expire: 0\` and \`updateTag\`.

**Code / implementation expected:** Yes — tagging a fetch, a webhook that revalidates it, and a Server Action.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Think of labels on jars in a pantry. revalidatePath is emptying one shelf because that shelf is out of date. revalidateTag is throwing away every jar labelled "tomato sauce", wherever it sits, because the recipe changed. Labels are the better tool when the same sauce is used on many shelves, which is exactly how shared data behaves across pages.

## 2. The Core Idea

📌 **Interview term: revalidatePath** — a next/cache function that marks the cached output of a route path as stale so it is re-rendered on the next request.

📌 **Interview term: revalidateTag** — a next/cache function that marks all cache entries with a given tag as stale; in Next.js 16 it takes a second argument that controls the stale window.

📌 **Interview term: updateTag** — a next/cache function that expires a tag immediately so the same request sees fresh data; it can only be called from a Server Action.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="Clearing by path or by tag. revalidatePath, revalidateTag">
  <defs>
    <marker id="nx02885o-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Clearing by path or by tag</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="164" y="78" text-anchor="middle">revalidatePath</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">one route</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">its data and output</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">simple for page-shaped edits</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx02885o-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="496" y="78" text-anchor="middle">revalidateTag</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">every entry with the tag</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">on any route</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">best for shared data</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">Next 16: revalidateTag(tag, max) serves stale once; updateTag works only in Server Actions</text>
  </g>
</svg>

Paths are how routes are stored; tags are how data is shared. Pick the one that matches what actually changed.

## 3. Choosing the call

| Call | Where | What the next request sees |
| :--- | :--- | :--- |
| \`revalidateTag('posts', 'max')\` | Server Action or Route Handler | The old version once (stale), then fresh |
| \`revalidateTag('posts', { expire: 0 })\` | Server Action or Route Handler | Fresh data immediately |
| \`updateTag('posts')\` | Server Action only | Fresh data, including for the same user right away |
| \`revalidatePath('/blog')\` | Server Action or Route Handler | Fresh render of that route |
| \`revalidateTag('posts')\` (one argument) | Deprecated in 16 | Behaves like \`{ expire: 0 }\` |

## 4. Tagging

With fetch, add \`next: { tags: ['posts'] }\`. With Cache Components, call \`cacheTag('posts')\` inside a 'use cache' function. Next.js also gives every route implicit tags such as \`_N_T_/blog\`, which is what \`revalidatePath\` uses. For the differences with \`refresh()\` see [revalidateTag, updateTag and refresh](/interview-question/what-is-the-difference-between-revalidatetag-updatetag-and-refresh-in-next-js-16).

## 5. Verified — Each Call Against a Tagged Fetch (Next.js 16.3.4, next start)

\`/tagged\` is a static page whose fetch uses \`{ cache: 'force-cache', next: { tags: ['news'] } }\`. A Route Handler calls the revalidation functions; the test API counts real calls.

\`\`\`
/tagged fetches with { cache: 'force-cache', next: { tags: ['news'] } }; /api/reval calls revalidateTag or revalidatePath
GET /tagged                                  page hit=1  x-nextjs-cache: HIT    API calls so far: 1
GET /tagged                                  page hit=1  x-nextjs-cache: HIT    API calls so far: 1
POST /api/reval?tag=news                     -> 200
GET /tagged (1st after revalidateTag, max)   page hit=1  x-nextjs-cache: STALE  API calls so far: 1
GET /tagged (2nd after revalidateTag, max)   page hit=2  x-nextjs-cache: HIT    API calls so far: 2
POST /api/reval?tag=news&profile=expire0     -> 200
GET /tagged (1st after { expire: 0 })        page hit=3  x-nextjs-cache: MISS   API calls so far: 3
POST /api/reval?path=/tagged                 -> 200
GET /tagged (1st after revalidatePath)       page hit=4  x-nextjs-cache: MISS   API calls so far: 4
GET /tagged (2nd after revalidatePath)       page hit=4  x-nextjs-cache: HIT    API calls so far: 4
POST /api/update  (updateTag inside a Route Handler) -> 500 {"error":"updateTag can only be called from within a Server Action. To invalidate cache tags in Route Handlers or other contexts, use revalidateTag instead. See more info here: https://nextjs.org/docs/app/api-reference/f
\`\`\`

With the \`max\` profile the first request after revalidation was served the old data (\`STALE\`) and the refresh happened in the background; \`{ expire: 0 }\` and \`revalidatePath\` gave fresh data on the very next request (\`MISS\`). \`updateTag\` refused to run outside a Server Action.

## 6. Common Pitfalls

- **Using the one-argument revalidateTag.** It is deprecated in Next.js 16; pass \`'max'\` or an explicit expire, or use \`updateTag\` in actions.
- **Expecting the editor to see their change instantly with \`'max'\`.** The next request gets the stale version; use \`updateTag\` in the Server Action for read-your-own-writes.
- **Calling updateTag from a webhook.** It throws outside Server Actions, as the lab shows; webhooks use \`revalidateTag\`.
- **Forgetting to tag.** Untagged fetches can only be cleared by path or time.
- **Unprotected webhook routes.** A public revalidation endpoint lets anyone flush your cache; check a secret.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">On-demand revalidation marks cached content stale from code instead of waiting for a lifetime to pass.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidatePath</code> clears one route; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidateTag</code> clears every entry with a tag, on any route.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">In Next.js 16 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidateTag</code> takes a profile: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'max'</code> serves stale once, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ expire: 0 }</code> refetches immediately; the one-argument form is deprecated.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">updateTag</code> gives read-your-own-writes but only inside Server Actions; in the lab it threw in a Route Handler.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Call it after mutations in Server Actions, or from a secret-protected webhook for external systems.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the recommended profile <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">'max'</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It keeps serving the stored version while a fresh one is produced, so no request waits. The docs call it the point past which correctness beats speed; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'max'</code> sets that to a year.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you build a CMS webhook?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A Route Handler that checks a shared secret, reads the changed slug or tag from the body, and calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidateTag</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidatePath</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does revalidation clear the browser cache?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Called from a Server Action, yes: the response tells the router to refetch. Called from a webhook, browsers that already have the page keep it until they navigate or refresh.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is a path better than a tag?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the change belongs to one page only, such as a single post, and you did not tag its data. Tags win whenever the same data appears on several routes.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **revalidatePath** | Mark one route stale |
| **revalidateTag** | Mark all entries with a tag stale |
| **updateTag** | Immediate expiry, Server Actions only |
| **Cache tag** | Label on cached data for targeted clearing |

---
**Conclusion:** On-demand revalidation replaces waiting with a call: revalidatePath for one route, revalidateTag for shared data. Next.js 16 made the trade-off explicit with the profile argument, and added updateTag for read-your-own-writes inside Server Actions. The lab showed each option, including the stale-once behaviour of 'max' and the error updateTag throws outside an action.`,
    examples: [
      {
        label: "Tagging data, a webhook, and a Server Action",
        tech: "tsx",
        runnable: false,
        code: `// lib/posts.ts
export async function getPosts() {
  return fetch("https://cms.example.com/posts", { next: { tags: ["posts"] } }).then((r) => r.json());
}

// app/api/cms-webhook/route.ts
import { revalidateTag } from "next/cache";
export async function POST(req: Request) {
  if (req.headers.get("x-secret") !== process.env.CMS_SECRET) return new Response("no", { status: 401 });
  revalidateTag("posts", "max"); // serve stale once, refresh in the background
  return Response.json({ ok: true });
}

// app/admin/actions.ts
"use server";
import { updateTag } from "next/cache";
export async function savePost(formData: FormData) {
  await db.post.update({ /* ... */ });
  updateTag("posts"); // the editor sees their own change immediately
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is generateStaticParams in Next.js and how does it enable SSG for dynamic routes?",
    seoDescription: "generateStaticParams lists dynamic route values to prerender at build; others render on first visit unless dynamicParams is false, which returns 404.",
    description: `**Question presented to candidate:**
"You have app/products/[id]/page.tsx and 50,000 products. What does generateStaticParams do, what happens to an id you did not list, and how would you split the work between build time and runtime?"

**What a strong answer should cover:**
- \`generateStaticParams\` returns the list of params to prerender at build time for a dynamic segment; the build shows them with the ● symbol.
- It replaces \`getStaticPaths\` from the Pages Router.
- By default (\`dynamicParams = true\`) other values are rendered on first request and then cached.
- With \`dynamicParams = false\`, values not in the list return 404.
- Returning a subset (or an empty array) trades build time for a first-visit render; fetches inside it are memoized with the page.

**Clarifying questions expected:**
- "Which pages get most of the traffic?" — those are worth prerendering.
- "Can valid ids appear after the build?" — then \`dynamicParams\` must stay true.

**Code / implementation expected:** Yes — a subset list plus the dynamicParams switch.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

A caterer knows the regular orders for tomorrow and prepares them tonight. If a walk-in customer orders something else, the kitchen can either make it fresh and keep the recipe ready for the next person (dynamicParams true), or say "sorry, only the prepared menu today" (dynamicParams false). generateStaticParams is the list of dishes prepared the night before.

## 2. The Core Idea

📌 **Interview term: generateStaticParams** — a function exported from a dynamic route that returns the params to prerender at build time.

📌 **Interview term: dynamicParams** — a segment config option; when true (default) unlisted params render on demand, when false they return 404.

📌 **Interview term: SSG** — static site generation: rendering pages at build time; the build output marks prerendered dynamic params with ●.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="Listed params are built, unlisted ones depend on dynamicParams. build, dynamicParams true, dynamicParams false">
  <defs>
    <marker id="nx035woo-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Listed params are built, unlisted ones depend on dynamicParams</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="111.33333333333333" y="82" text-anchor="middle">build</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">generateStaticParams</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">a and b prerendered (●)</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx035woo-arrow)"/>
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
    <text class="d-text" x="330" y="82" text-anchor="middle">dynamicParams true</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">unknown id: render once</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">then cached (MISS, HIT)</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx035woo-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 420.3333333333333 107 L 458.3333333333333 107"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="461.3333333333333" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="477.3333333333333" cy="48" r="12"/>
    <text class="d-text d-accent" x="477.3333333333333" y="53" text-anchor="middle">3</text>
    <text class="d-text" x="548.6666666666666" y="82" text-anchor="middle">dynamicParams false</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">unknown id</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">404</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">prerender the popular values, let the long tail render on its first visit</text>
  </g>
</svg>

generateStaticParams decides what is ready before the first user arrives; dynamicParams decides what happens to everything else.

## 3. Patterns

| Goal | generateStaticParams returns | dynamicParams |
| :--- | :--- | :--- |
| Small, fixed set (docs pages) | Every value | \`false\` for a strict 404 |
| Large catalogue | The top N by traffic | \`true\` (default) |
| Nothing at build, cache on first visit | \`[]\` | \`true\` |
| Nested segments \`[category]/[id]\` | Objects with both keys, or parents pass params down | as needed |

## 4. With Cache Components

\`dynamicParams\` is not available when Cache Components is enabled (the docs say so explicitly). Unlisted params are then rendered on request, and what can be cached is controlled with 'use cache'. See [ISR](/interview-question/what-is-isr-incremental-static-regeneration-in-next-js-and-how-do-you-implement-) for how on-demand pages are refreshed afterwards.

## 5. Verified — Listed, Unlisted and Strict Params (Next.js 16.3.4)

Build table for two routes that both list \`a\` and \`b\`:

\`\`\`
├   /gsp-open/[slug]
│ ├ ● /gsp-open/a
│ └ ● /gsp-open/b
├   /gsp-strict/[slug]
│ ├ ● /gsp-strict/a
│ └ ● /gsp-strict/b
\`\`\`

Requests on \`next start\` (\`/gsp-strict\` sets \`dynamicParams = false\`):

\`\`\`
generateStaticParams returns a and b; /gsp-strict also sets dynamicParams = false
/gsp-open/a        HTTP 200  x-nextjs-cache: HIT    GSP-OPEN slug=a rendered=2026-09-23T06:00:04.527Z
/gsp-open/zzz      HTTP 200  x-nextjs-cache: MISS   GSP-OPEN slug=zzz rendered=2026-09-23T06:00:50.203Z
/gsp-open/zzz      HTTP 200  x-nextjs-cache: HIT    GSP-OPEN slug=zzz rendered=2026-09-23T06:00:50.203Z
/gsp-strict/a      HTTP 200  x-nextjs-cache: HIT    GSP-STRICT slug=a
/gsp-strict/zzz    HTTP 404  x-nextjs-cache: HIT    (not found)
\`\`\`

## 6. Common Pitfalls

- **Prerendering everything.** 50,000 pages at build time makes deploys slow; build the popular subset.
- **Setting dynamicParams = false with growing data.** New ids created after the build return 404 until the next deploy.
- **Returning numbers.** Params are strings; return \`{ id: String(p.id) }\`.
- **Forgetting that params are a Promise.** In the page, \`await params\` before reading the value.
- **Expecting it to run per request.** It runs at build time (and not at all for unlisted params); it cannot read cookies or headers.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">generateStaticParams</code> lists the values of a dynamic segment to prerender at build time; they show as ● in the build table.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Unlisted values render on their first request and are then cached, unless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dynamicParams = false</code>, which returns 404.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">In the lab, an unlisted slug was a MISS once and a HIT after that, and the strict route answered 404.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">For large sets return only the popular values, or an empty array, and let the rest render on demand.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">With Cache Components <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dynamicParams</code> is not available; caching is controlled with 'use cache'.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is it different from getStaticPaths?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It returns a plain array of params instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ paths, fallback }</code>; the fallback behaviour moved to the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dynamicParams</code> segment option.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does fetching the list and fetching the page hit the API twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fetches in generateStaticParams are memoized with the same fetch in the layouts and pages of that build, so the same request is reused.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you generate params for nested dynamic segments?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return objects with every key, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ category: "shoes", id: "42" }</code>, or let a parent segment generate its params and receive them in the child function.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you revalidate a page that was generated on first visit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the same way as a prerendered one: a revalidate time or revalidatePath and revalidateTag.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **generateStaticParams** | Params to prerender at build time |
| **dynamicParams** | What happens to unlisted params |
| **SSG** | Rendering pages at build time |
| **● symbol** | Build-table marker for prerendered params |

---
**Conclusion:** generateStaticParams decides which dynamic pages exist before the first request; dynamicParams decides whether the rest are rendered on demand or return 404. The lab showed both paths: a first-visit MISS followed by a cached HIT, and a strict 404. For big catalogues, prerender the popular part and let the long tail fill in on demand.`,
    examples: [
      {
        label: "Prerender the top products, render the rest on demand",
        tech: "tsx",
        runnable: false,
        code: `// app/products/[id]/page.tsx
export const revalidate = 86400;
// export const dynamicParams = false;   // uncomment to 404 anything not listed

export async function generateStaticParams() {
  const top = await fetch("https://api.example.com/products?top=500").then((r) => r.json());
  return top.map((p: { id: number }) => ({ id: String(p.id) }));
}

export default async function Product({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await fetch(\`https://api.example.com/products/\${id}\`).then((r) => r.json());
  return <h1>{product.name}</h1>;
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the route segment config in Next.js (dynamic, revalidate, runtime)?",
    seoDescription: "Segment config exports tune a page, layout or Route Handler. In Next 16, dynamic and revalidate are the previous model and runtime edge is deprecated.",
    description: `**Question presented to candidate:**
"What are the export const options you can put in a page, layout or route file, what do dynamic, revalidate and runtime do, and what changed in Next.js 16?"

**What a strong answer should cover:**
- Segment config is a set of named exports in a page, layout or Route Handler that tune how that segment is rendered.
- The classic set: \`dynamic\`, \`dynamicParams\`, \`revalidate\`, \`fetchCache\`, \`runtime\`, \`preferredRegion\`, \`maxDuration\`.
- \`dynamic\` forces static or dynamic rendering (\`'force-dynamic'\`, \`'force-static'\`, \`'error'\`); \`revalidate\` sets the ISR lifetime.
- In Next.js 16, with Cache Components enabled, \`dynamic\`, \`dynamicParams\`, \`revalidate\` and \`fetchCache\` are removed (the build rejects them); caching moves to 'use cache' and \`cacheLife\`.
- \`runtime = 'edge'\` and \`preferredRegion\` are deprecated in 16; the default Node.js runtime is the recommendation.

**Clarifying questions expected:**
- "Is Cache Components enabled in this project?" — it changes which exports are allowed.
- "Is the goal caching, timing, or hosting?" — different options serve each.

**Code / implementation expected:** Yes — the common exports and their Next.js 16 replacements.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Segment config is the settings panel on the back of each room in a building: lights always on, lights on a timer, which power supply to use, how long a machine may run. Next.js 16 rewired the building: the light switches (caching) moved into the rooms themselves as 'use cache', and the special low-power supply (edge) is being retired. The panel still exists, but with fewer switches.

## 2. The Core Idea

📌 **Interview term: Route segment config** — named exports such as revalidate or maxDuration in a page, layout or Route Handler that configure that route segment.

📌 **Interview term: force-dynamic** — a value of the dynamic export that renders the segment on every request, as if a request-time API were used.

📌 **Interview term: maxDuration** — the maximum execution time in seconds for server work in a segment, enforced by the hosting platform.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="Segment config in Next.js 16. still current, previous model or deprecated">
  <defs>
    <marker id="nx04lfwl-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Segment config in Next.js 16</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="164" y="78" text-anchor="middle">still current</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">dynamicParams, maxDuration</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">runtime nodejs (default)</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">instant, prefetch (Cache Components)</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx04lfwl-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="496" y="78" text-anchor="middle">previous model or deprecated</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">dynamic, revalidate, fetchCache</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">rejected with cacheComponents</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">runtime edge, preferredRegion</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">with Cache Components, express caching with use cache and cacheLife instead of exports</text>
  </g>
</svg>

The shift is from configuring caching per file to declaring it where the data is loaded. Most segment config questions in interviews are really about that shift.

## 3. The options

| Export | Values | Status in 16.3.4 |
| :--- | :--- | :--- |
| \`dynamic\` | \`'auto'\`, \`'force-dynamic'\`, \`'force-static'\`, \`'error'\` | Previous model; rejected with Cache Components |
| \`revalidate\` | \`false\`, \`0\`, seconds | Previous model; rejected with Cache Components |
| \`fetchCache\` | \`'auto'\`, \`'force-cache'\`, \`'force-no-store'\`, ... | Previous model; removed with Cache Components |
| \`dynamicParams\` | \`true\`, \`false\` | Current; not available with Cache Components |
| \`runtime\` | \`'nodejs'\` (default), \`'edge'\` | \`'edge'\` deprecated |
| \`preferredRegion\` | \`'auto'\`, \`'global'\`, \`'home'\`, region ids | Deprecated |
| \`maxDuration\` | seconds | Current |
| \`instant\`, \`prefetch\` | route-specific | New, Cache Components only |

## 4. What the dynamic values mean

\`'force-dynamic'\` renders on every request. \`'force-static'\` prerenders and makes \`cookies()\`, \`headers()\` and \`useSearchParams()\` return empty values. \`'error'\` prerenders and fails the build if anything dynamic is used. Details of static versus dynamic are in [what makes a route dynamic](/interview-question/what-makes-a-route-dynamic-in-the-next-js-app-router).

## 5. Verified — What the Build Accepts (Next.js 16.3.4)

Without Cache Components, the exports work as documented (from the lab build table and headers):

\`\`\`
○ /isr5              5s      1y        <- export const revalidate = 5
ƒ /dyn/forced                          <- export const dynamic = "force-dynamic"
○ /api/time-static                     <- export const dynamic = "force-static" on a GET Route Handler
\`\`\`

The edge runtime:

\`\`\`
next build with  export const runtime = "edge"  in app/edge-page/page.tsx and app/api/edge-time/route.ts:
⚠ The Edge Runtime is deprecated. You can use the "nodejs" runtime instead. Learn more: https://nextjs.org/docs/messages/edge-runtime-deprecated
⚠ Using edge runtime on a page currently disables static generation for that page
build table:  ƒ /api/edge-time   ƒ /edge-page
GET /api/edge-time -> {"at":"2026-09-23T06:03:14.300Z","hasProcessVersions":false}   (no Node process.versions in the edge sandbox)
\`\`\`

With \`cacheComponents: true\`:

\`\`\`
next build, cacheComponents: true, with a segment config export:
Error: Route segment config "revalidate" is not compatible with \`nextConfig.cacheComponents\`. Please remove it.
Error: Route segment config "dynamic" is not compatible with \`nextConfig.cacheComponents\`. Please remove it.
\`\`\`

## 6. Common Pitfalls

- **Keeping \`dynamic\` or \`revalidate\` after enabling Cache Components.** The build fails with "not compatible with nextConfig.cacheComponents".
- **Reaching for runtime = 'edge' by habit.** It is deprecated, and on a page it disables static generation (the build says so).
- **Using force-static to read cookies.** Under force-static they return empty values, which silently breaks personalised code.
- **Setting config in a layout and expecting only that layout to change.** Some options apply to the whole route below it; the most restrictive value wins.
- **Using maxDuration for slow pages instead of fixing them.** It only raises the platform limit; long server work should move to background jobs or streaming.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Segment config is a set of named exports in a page, layout or Route Handler that tune that segment.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dynamic</code> forces static or dynamic rendering, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidate</code> sets the ISR lifetime, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">runtime</code> picks Node.js or edge, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxDuration</code> caps execution time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">In Next.js 16, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dynamic</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidate</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dynamicParams</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetchCache</code> belong to the previous model: with Cache Components the build rejects them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">The edge runtime and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preferredRegion</code> are deprecated; the lab build warned for both an edge page and an edge Route Handler.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">New code on Cache Components expresses caching with 'use cache' and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheLife</code> instead of exports.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dynamic = 'error'</code> do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It prerenders the segment and fails the build if anything in it uses a request-time API or uncached data, which is a guard against pages silently becoming dynamic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the edge runtime deprecated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The docs recommend the Node.js runtime, which now also runs in Proxy (formerly middleware). The build prints "The Edge Runtime is deprecated. You can use the nodejs runtime instead."</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What replaces <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">export const revalidate</code> under Cache Components?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheLife</code> inside a 'use cache' function or component; the build table then shows its revalidate and expire times.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">instant</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">prefetch</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Segment options introduced for Cache Components: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">instant = false</code> allows a route to block on request data instead of prerendering a shell, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefetch</code> controls how links to the route are prefetched.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Segment config** | Named exports that tune a route segment |
| **force-dynamic** | Render on every request |
| **force-static** | Prerender, request APIs return empty values |
| **maxDuration** | Execution time limit for server work |

---
**Conclusion:** Route segment config is the per-file settings panel of the App Router. In Next.js 16 it is smaller: caching exports belong to the previous model and are rejected with Cache Components, and the edge runtime is deprecated. The lab showed both the working exports and the exact build messages, which are the quickest way to spot old config in an upgraded project.`,
    examples: [
      {
        label: "Common exports, and the Cache Components replacement",
        tech: "tsx",
        runnable: false,
        code: `// Previous model (cacheComponents off)
export const revalidate = 600;            // ISR lifetime for this route
export const dynamic = "force-static";    // or "force-dynamic" / "error"
export const maxDuration = 30;            // platform limit for server work

// With cacheComponents: true, drop dynamic/revalidate and cache the data instead:
import { cacheLife } from "next/cache";
async function getCatalogue() {
  "use cache";
  cacheLife("minutes");
  return db.product.findMany();
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What makes a route dynamic in the Next.js App Router?",
    seoDescription: "A route turns dynamic when it reads request data: cookies, headers, searchParams, connection() or no-store fetches, even in a layout. Tested on 16.3.4.",
    description: `**Question presented to candidate:**
"A marketing page that should be static shows up as dynamic in the build output. How do you find out why, and what are the things that make a route dynamic?"

**What a strong answer should cover:**
- A route is dynamic when rendering it needs information that only exists at request time.
- Request-time APIs: \`cookies()\`, \`headers()\`, \`searchParams\`, \`connection()\`, \`draftMode()\`; plus \`fetch\` with \`cache: 'no-store'\` or \`revalidate: 0\`.
- \`export const dynamic = 'force-dynamic'\` forces it explicitly.
- A dynamic layout makes every page under it dynamic, even pages that read nothing.
- The build table (ƒ) and a \`private, no-store\` cache-control header show the result; with Cache Components the build instead demands a Suspense boundary.

**Clarifying questions expected:**
- "Which layouts wrap this page?" — the cause is often in a shared layout.
- "Does the page need that request data for its first paint?" — if not, move it into Suspense.

**Code / implementation expected:** Yes — the triggers, and moving one into a Suspense boundary.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Picture a print shop that prepares posters ahead of time. The moment an order says "put the customer name on it" or "use today's weather", it can no longer be printed in advance; it has to be printed when the customer arrives. And if the frame the poster goes into (the layout) needs the customer name, every poster in that frame waits, even the ones that never mention a name.

## 2. The Core Idea

📌 **Interview term: Dynamic route** — a route rendered on each request because it depends on request-time data; marked ƒ in the build output.

📌 **Interview term: Request-time API** — an API that reads the incoming request, such as cookies(), headers(), searchParams or connection().

📌 **Interview term: connection()** — a next/server function that waits for an incoming request, explicitly marking the render as dynamic without reading any request data.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 336" role="img" aria-label="What turned lab routes dynamic (all returned private, no-store). searchParams, connection(), force-dynamic, dynamic layout">
  <defs>
    <marker id="nx05zee8-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">What turned lab routes dynamic (all returned private, no-store)</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="46" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="68" r="12"/>
    <text class="d-text d-accent" x="46" y="73" text-anchor="middle">1</text>
    <text class="d-text" x="70" y="73">searchParams</text>
    <text class="d-sub" x="262" y="72">awaited in the page: /dyn/sp?q=shoes</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="102" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="124" r="12"/>
    <text class="d-text d-accent" x="46" y="129" text-anchor="middle">2</text>
    <text class="d-text" x="70" y="129">connection()</text>
    <text class="d-sub" x="262" y="128">waits for a request without reading it</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="158" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="180" r="12"/>
    <text class="d-text d-accent" x="46" y="185" text-anchor="middle">3</text>
    <text class="d-text" x="70" y="185">force-dynamic</text>
    <text class="d-sub" x="262" y="184">export const dynamic = force-dynamic</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="214" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="236" r="12"/>
    <text class="d-text d-accent" x="46" y="241" text-anchor="middle">4</text>
    <text class="d-text d-accent" x="70" y="241">dynamic layout</text>
    <text class="d-sub" x="262" y="240">layout awaits headers(): child page dynamic too</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="274" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="301" text-anchor="middle">cookies(), headers() and no-store fetches did the same in earlier lab routes</text>
  </g>
</svg>

The layout row is the one that surprises people. Dynamic-ness flows down the tree: a page cannot be static if something wrapping it must run per request.

## 3. Triggers

| Trigger | Example | Notes |
| :--- | :--- | :--- |
| \`cookies()\` | \`(await cookies()).get("theme")\` | Also in a layout |
| \`headers()\` | \`(await headers()).get("user-agent")\` | Also in a layout |
| \`searchParams\` | \`await searchParams\` in a page | \`useSearchParams\` in a client component needs Suspense instead |
| \`connection()\` | \`await connection()\` | For code that must run per request, such as random values |
| Uncached fetch | \`{ cache: 'no-store' }\` or \`revalidate: 0\` | Plain fetch without options does not |
| Segment config | \`export const dynamic = 'force-dynamic'\` | Previous model only |

## 4. Keeping pages static

Move the request-time read into the component that needs it and wrap it in Suspense (streaming today, PPR with Cache Components). Keep layouts free of cookies and headers where possible, and read the build table after each change. See [static versus dynamic rendering](/interview-question/what-is-the-difference-between-static-and-dynamic-rendering-in-the-next-js-app-r) and [Partial Prerendering](/interview-question/what-is-partial-prerendering-ppr-in-next-js).

## 5. Verified — Each Trigger in a Real Build (Next.js 16.3.4)

Build symbols: \`ƒ /dyn/sp\`, \`ƒ /dyn/conn\`, \`ƒ /dyn/forced\`, \`ƒ /dynlayout/child\`, \`ƒ /cookies\`, \`ƒ /data/nostore\`; \`○ /data/plain\` stayed static with a fetch that had no options. Response headers on \`next start\`:

\`\`\`
/dyn/sp?q=shoes    cache-control: private, no-cache, no-store, max-age=0, must-revalidate    <- awaits searchParams
/dyn/conn          cache-control: private, no-cache, no-store, max-age=0, must-revalidate    <- awaits connection()
/dyn/forced        cache-control: private, no-cache, no-store, max-age=0, must-revalidate    <- export const dynamic = 'force-dynamic'
/dynlayout/child   cache-control: private, no-cache, no-store, max-age=0, must-revalidate    <- page has no request API; its layout awaits headers()
\`\`\`

For comparison, static routes answered with \`s-maxage\`:

\`\`\`
/            cache-control: s-maxage=31536000 | x-nextjs-cache: HIT
/counter     cache-control: s-maxage=31536000 | x-nextjs-cache: HIT
/isr         cache-control: s-maxage=30, stale-while-revalidate=31535970 | x-nextjs-cache: STALE
/cookies     cache-control: private, no-cache, no-store, max-age=0, must-revalidate | x-nextjs-cache: (none)
/blog/one    cache-control: s-maxage=31536000 | x-nextjs-cache: HIT
\`\`\`

## 6. Common Pitfalls

- **Reading cookies in the root layout.** For example for a theme or locale: every page of the app becomes dynamic.
- **Assuming a plain fetch makes a route dynamic.** It does not; the lab page with a plain fetch stayed static and was fetched once at build.
- **Using \`Math.random()\` or \`Date.now()\` and expecting fresh values.** In a static route they run once at build; use \`connection()\` if they must be per request.
- **\`useSearchParams\` in a client component without Suspense.** It forces client-side rendering up to the nearest Suspense boundary; wrap it.
- **Fixing it with force-static.** That silences request data (empty cookies) instead of removing the dependency.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">A route is dynamic when rendering it needs request-time information.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Triggers are cookies(), headers(), searchParams, connection(), draftMode() and uncached fetches, or force-dynamic in the previous model.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">A dynamic layout makes all pages below it dynamic; in the lab a page with no request API became dynamic through its layout.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Check the build table for ƒ and the response for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">private, no-store</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Keep pages static by moving request reads into Suspense boundaries and out of shared layouts.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the cause when a page is unexpectedly dynamic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Look for request-time APIs in the page and in every layout above it, and for no-store fetches. Enabling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dynamic = 'error'</code> temporarily makes the build point at the offending code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does connection() exist?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For code that must run per request but reads no request data, such as generating a random id or reading the current time. Without it the value would be computed once at build.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does draftMode() make a route dynamic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, it reads a request cookie; that is how CMS preview modes render fresh content only for editors.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes with Cache Components?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Routes are dynamic by default and the build requires request-time reads to sit inside Suspense (or be cached), so the static shell is still prerendered.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Dynamic route** | Rendered per request (ƒ) |
| **Request-time API** | Reads the incoming request |
| **connection()** | Marks code as per-request without reading data |
| **draftMode()** | Preview mode switch based on a cookie |

---
**Conclusion:** A route becomes dynamic whenever its render depends on the request: cookies, headers, search params, connection() or uncached data, including anything in its layouts. The lab showed each trigger and the layout inheritance explicitly. The fix is rarely to force the route static; it is to push the request-dependent part into a Suspense boundary.`,
    examples: [
      {
        label: "Keeping the page static by isolating the request read",
        tech: "tsx",
        runnable: false,
        code: `// Before: the whole route is dynamic because the page reads cookies.
// After:
import { Suspense } from "react";
import { cookies } from "next/headers";

async function CartCount() {
  const count = (await cookies()).get("cart")?.value ?? "0";
  return <span>Cart ({count})</span>;
}

export default function Page() {
  return (
    <main>
      <h1>Summer sale</h1>                           {/* no request data */}
      <Suspense fallback={<span>Cart</span>}>
        <CartCount />                                 {/* only this part needs the request */}
      </Suspense>
    </main>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "App Router 15 — why are params and searchParams now Promises?",
    seoDescription: "Since Next 15, params and searchParams are Promises so rendering can start early. In 16.3.4, reading them without await gives undefined.",
    description: `**Question presented to candidate:**
"After upgrading, TypeScript complains that params is a Promise in every page. Why did Next.js make params and searchParams async, and what happens if you still read them synchronously?"

**What a strong answer should cover:**
- Since Next.js 15, \`params\` and \`searchParams\` in pages, layouts, \`generateMetadata\` and Route Handlers are Promises you must \`await\` (or unwrap with \`use()\` in a client component).
- The same release made \`cookies()\`, \`headers()\` and \`draftMode()\` async.
- The reason: Next.js can start rendering (and prerender the parts that do not need request data) before the request-specific values are resolved, which is what enables streaming and PPR.
- Next.js 15 kept a temporary synchronous fallback with a warning; in 16 synchronous access is gone and reading a property of the Promise gives \`undefined\`.
- A codemod (\`next-async-request-api\`) rewrites most code automatically.

**Clarifying questions expected:**
- "Is this a Server or Client Component?" — await in server code, \`use()\` in client code, or \`useParams()\` from next/navigation.
- "Which Next version are you upgrading to?" — 16 has no sync fallback.

**Code / implementation expected:** Yes — the async signature in a page and in a client component.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Imagine a restaurant that used to wait until your whole order was written down before starting any cooking. Now the kitchen starts the bread and the sauce straight away, and the part that depends on your choice is added when your choice arrives. Handing the kitchen a promise of the order instead of the order itself is what lets it start early; you just have to wait for the promise before cooking the dish that needs it.

## 2. The Core Idea

📌 **Interview term: Async request APIs** — params, searchParams, cookies(), headers() and draftMode(), which return Promises since Next.js 15.

📌 **Interview term: use()** — the React API that reads a Promise inside a component; the way to unwrap params in a Client Component page.

📌 **Interview term: Codemod** — an automated source transform; next-async-request-api converts synchronous access to the async form.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="Reading params in Next.js 16. synchronous access, awaited">
  <defs>
    <marker id="nx06z3f6-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Reading params in Next.js 16</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="164" y="78" text-anchor="middle">synchronous access</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">props.params.id</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">undefined in 16.3.4</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">Next 15 warned, 16 removed it</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx06z3f6-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="496" y="78" text-anchor="middle">awaited</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">const { id } = await params</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">works in pages and layouts</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">use(params) in a client page</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">the Promise lets Next.js render and prerender before request values are known</text>
  </g>
</svg>

The change looks like ceremony, but it is what allows a page to start streaming before the dynamic values exist.

## 3. The new signatures

| Place | Before (14) | Now (15 and 16) |
| :--- | :--- | :--- |
| Page | \`({ params }: { params: { id: string } })\` | \`({ params }: { params: Promise<{ id: string }> })\` then \`await params\` |
| searchParams | \`searchParams.q\` | \`(await searchParams).q\` |
| Route Handler | \`(req, { params })\` with \`params.id\` | \`(await params).id\` |
| Client Component page | \`params.id\` | \`use(params).id\`, or \`useParams()\` |
| cookies / headers | \`cookies().get(...)\` | \`(await cookies()).get(...)\` |

## 4. Why it helps rendering

With synchronous props, Next.js needed the request values before calling your component at all. As Promises, the framework can call components, render everything that does not await the value, and stream or prerender that part. It is the same idea that makes [Partial Prerendering](/interview-question/what-is-partial-prerendering-ppr-in-next-js) possible: request-dependent work becomes an explicit await that can sit inside a Suspense boundary.

## 5. Verified — Synchronous Access on Next.js 16.3.4

A page typed with \`any\` so TypeScript does not intervene, reading the values without \`await\`:

\`\`\`
GET /sync-params/42?q=hello, page reads props.params.id and props.searchParams.q WITHOUT await
HTTP 200: SYNC id=undefined q=undefined paramsIsPromise=true
\`\`\`

No error is thrown and nothing is logged: the values are just \`undefined\`, because \`params\` really is a Promise. Awaited, the same props work, as in every other lab page (\`post one\`, \`SP q=shoes\`).

## 6. Common Pitfalls

- **Silencing TypeScript with \`any\`.** The lab shows the result: undefined values and no error. Keep the \`Promise<...>\` type.
- **Forgetting generateMetadata and Route Handlers.** They changed too; the codemod covers them, manual edits often miss them.
- **Destructuring in the signature.** \`({ params: { id } })\` reads a property of a Promise; destructure after the await.
- **Awaiting too early.** Awaiting searchParams at the top of a page makes the whole render wait; await it in the component that needs it.
- **Using \`await\` in a Client Component.** Client Components cannot be async; use \`use(params)\` or \`useParams()\`.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Since Next.js 15, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">params</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">searchParams</code> (and cookies, headers, draftMode) are Promises that you await.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">The reason is rendering: Next.js can start and prerender the parts that do not need request values before they are resolved.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Next.js 15 still allowed synchronous access with a warning; in 16 it is gone and a property read gives undefined, as the lab showed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">In Client Components unwrap with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">use(params)</code> or read with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useParams()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Run the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next-async-request-api</code> codemod when upgrading, then fix what it could not reach.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not keep them synchronous and just make the framework smarter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A synchronous value must exist before the component runs. Making the dependency an explicit await lets the framework see where request data is needed and render everything else first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you type it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ params: Promise&lt;{ slug: string }&gt; }</code>. Next.js 16 also generates helper types such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PageProps&lt;'/blog/[slug]'&gt;</code> for typed routes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useParams</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useSearchParams</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Those client hooks return plain objects and did not change. The Promise change applies to the props the server passes to pages and layouts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does awaiting params make the route dynamic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only for params not known at build time. With generateStaticParams the values are known for the listed pages, which stay static.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Async request APIs** | params, searchParams, cookies, headers as Promises |
| **use()** | Reads a Promise inside a component |
| **useParams()** | Client hook returning the current params |
| **Codemod** | Automated upgrade transform |

---
**Conclusion:** params and searchParams became Promises so that Next.js can render before request values are known, which underpins streaming and PPR. Next.js 16 removed the synchronous fallback: in the lab, reading params.id without await silently produced undefined. Await in server code, use() in client code, and keep the Promise types honest.`,
    examples: [
      {
        label: "Awaiting params in a page, unwrapping them in a client page",
        tech: "tsx",
        runnable: false,
        code: `// app/blog/[slug]/page.tsx  (Server Component)
export default async function Post({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { slug } = await params;
  const { ref } = await searchParams;
  return <h1>{slug} {ref ? \`(from \${ref})\` : null}</h1>;
}

// app/tools/[id]/page.tsx  (Client Component page)
"use client";
import { use } from "react";
export default function Tool({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <p>Tool {id}</p>;
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "`cacheLife` and `cacheTag` — how do you configure TTL profiles?",
    seoDescription: "cacheLife sets stale, revalidate and expire times for a use cache entry; cacheTag labels it for invalidation. Profiles tested on Next 16.3.4.",
    description: `**Question presented to candidate:**
"With Cache Components on, how do you control how long a cached function lives and how do you invalidate it? Show me a custom profile."

**What a strong answer should cover:**
- \`cacheLife(profile)\` inside a 'use cache' function or component sets three times: \`stale\` (client), \`revalidate\` (background refresh) and \`expire\` (hard limit).
- Built-in profiles: \`default\`, \`seconds\`, \`minutes\`, \`hours\`, \`days\`, \`weeks\`, \`max\`; custom ones go in \`cacheLife\` in next.config.ts.
- \`cacheTag('name')\` labels the entry; \`revalidateTag('name', 'max')\` or \`updateTag('name')\` invalidates it.
- The build table shows each route revalidate and expire times, and responses get a matching \`s-maxage\` and \`stale-while-revalidate\`.
- Short lifetimes (under 30 s stale, such as \`seconds\`) are excluded from prerendering and must sit inside Suspense.

**Clarifying questions expected:**
- "How stale may this data be, and for whom?" — decides the profile; per-user data should not be cached this way at all.
- "What event should refresh it?" — decides the tag.

**Code / implementation expected:** Yes — a built-in profile, a custom profile, and a tag with invalidation.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Think of labels on food in a shop fridge. stale is how long the shelf staff may hand it out without checking; revalidate is when they start preparing a fresh batch in the back while still selling the current one; expire is the date after which it must be thrown away no matter what. A profile is a pre-printed label with those three dates, and cacheTag is the product name that lets the manager recall every batch of it at once.

## 2. The Core Idea

📌 **Interview term: cacheLife** — a next/cache function called inside 'use cache' that sets the stale, revalidate and expire times of the entry, by profile name or object.

📌 **Interview term: cacheTag** — a next/cache function called inside 'use cache' that adds tags to the entry so revalidateTag or updateTag can invalidate it.

📌 **Interview term: Cache profile** — a named set of stale, revalidate and expire values, built in or defined under cacheLife in next.config.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 280" role="img" aria-label="The three times inside one cache profile. stale, revalidate, expire">
  <defs>
    <marker id="nx07vwv4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">The three times inside one cache profile</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="46" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="68" r="12"/>
    <text class="d-text d-accent" x="46" y="73" text-anchor="middle">1</text>
    <text class="d-text" x="70" y="73">stale</text>
    <text class="d-sub" x="262" y="72">how long the browser reuses it without asking the server</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="102" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="124" r="12"/>
    <text class="d-text d-accent" x="46" y="129" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="70" y="129">revalidate</text>
    <text class="d-sub" x="262" y="128">after this, serve the entry and refresh it in the background</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="158" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="180" r="12"/>
    <text class="d-text d-accent" x="46" y="185" text-anchor="middle">3</text>
    <text class="d-text d-accent" x="70" y="185">expire</text>
    <text class="d-sub" x="262" y="184">after this, the entry is not served at all</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="218" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="245" text-anchor="middle">hours profile in the lab: route table 1h 1d, header s-maxage=3600, stale-while-revalidate=82800</text>
  </g>
</svg>

Two of the three times are for the server and one is for the browser. Most bugs come from picking a profile by its name without reading its three numbers.

## 3. Built-in profiles (from the 16.3.4 docs)

| Profile | stale | revalidate | expire |
| :--- | :--- | :--- | :--- |
| \`default\` | 5 minutes | 15 minutes | never |
| \`seconds\` | 30 seconds | 1 second | 1 minute |
| \`minutes\` | 5 minutes | 1 minute | 1 hour |
| \`hours\` | 5 minutes | 1 hour | 1 day |
| \`days\` | 5 minutes | 1 day | 1 week |
| \`weeks\` | 5 minutes | 1 week | 30 days |
| \`max\` | 5 minutes | 30 days | 1 year |

## 4. Custom profiles and tags

Define a profile once in next.config.ts under \`cacheLife\` and use it by name, so lifetimes are reviewed in one place. Add \`cacheTag\` for every entity the entry depends on (for example \`product-42\` and \`products\`), then invalidate from a Server Action with \`updateTag\` or from a webhook with \`revalidateTag(tag, 'max')\`. See [Cache Components](/interview-question/what-are-cache-components-in-next-js-16-and-how-does-the-use-cache-directive-wor) and [on-demand revalidation](/interview-question/what-is-on-demand-revalidation-in-next-js-revalidatepath-revalidatetag).

## 5. Verified — Profiles, Headers and Tags (Next.js 16.3.4, cacheComponents: true)

next.config.ts defines \`cacheLife: { biweekly: { stale: 3600, revalidate: 1209600, expire: 2592000 } }\`. The build table:

\`\`\`
Route (app)        Revalidate  Expire
┌ ○ /
├ ○ /_not-found
├ ƒ /api/bust
├ ○ /cached                1h      1d
├ ○ /life-custom           2w     30d
├ ◐ /life-seconds
├ ○ /life-tagged           1d      1w
└ ◐ /ppr


○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
ƒ  (Dynamic)            server-rendered on demand
\`\`\`

Responses and invalidation on \`next start\`:

\`\`\`
next start, cacheComponents: true
/cached        cache-control: s-maxage=3600, stale-while-revalidate=82800
/life-custom   cache-control: s-maxage=1209600, stale-while-revalidate=1382400
/life-tagged   cache-control: s-maxage=86400, stale-while-revalidate=518400
/life-seconds  cache-control: private, no-cache, no-store, max-age=0, must-revalidate

/life-seconds twice, 2.5 s apart: 2026-09-23T06:02:23.362Z -> 2026-09-23T06:02:25.938Z   (changed: true)
/life-tagged: before 2026-09-23T06:02:05.914Z  | 1st after revalidateTag("prices", "max") 2026-09-23T06:02:05.914Z (STALE)  | 2nd 2026-09-23T06:02:26.016Z (HIT)
\`\`\`

A \`seconds\` profile with no Suspense around it failed the build, because entries that short are excluded from prerendering:

\`\`\`
next build, cacheComponents: true; /life-seconds renders a component with "use cache" + cacheLife("seconds") and no Suspense around it:
Error: Route "/life-seconds": Next.js encountered uncached or runtime data during prerendering.

\`fetch(...)\`, \`cookies()\`, \`headers()\`, \`params\`, \`searchParams\`, or \`connection()\` accessed outside of \`<Suspense>\` prevents the route from being prerendered, blocking the page load and leading to a slower user experience.
\`\`\`

With a Suspense boundary the same route built as \`◐\` and recomputed on every request, as shown above.

## 6. Common Pitfalls

- **Using a short profile in the static shell.** \`seconds\` outside Suspense fails the build; wrap it or pick a longer profile.
- **Caching per-user output.** A 'use cache' entry is shared; keep personal data in dynamic holes.
- **Forgetting that stale is a client setting.** It controls the browser Client Cache (minimum 30 s for prerendered data), not the CDN header.
- **Tag names that are too broad.** \`revalidateTag('all')\` throws away everything; tag by entity and by collection.
- **Scattering object literals.** Inline \`cacheLife({ ... })\` everywhere makes lifetimes impossible to audit; define named profiles.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheLife</code> sets three times for a 'use cache' entry: stale for the browser, revalidate for background refresh, expire as the hard limit.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Use a built-in profile (seconds to max) or define custom ones under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheLife</code> in next.config.ts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cacheTag</code> labels the entry so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">revalidateTag(tag, 'max')</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">updateTag(tag)</code> can invalidate it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">The build table and headers reflect the profile: the lab hours profile showed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1h 1d</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s-maxage=3600</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Short profiles like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seconds</code> cannot be prerendered: outside Suspense the build failed.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between revalidate and expire?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After revalidate the entry is still served while a fresh one is computed in the background; after expire it is not served at all and the next request waits for a new value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where can cacheLife be called?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inside a function or component that has the 'use cache' directive; it configures that entry. The lifetime of a page is derived from the entries it uses.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did the custom profile show up in the lab?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2w 30d</code> in the build table and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s-maxage=1209600, stale-while-revalidate=1382400</code> on the response, matching the configured revalidate and expire values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does revalidateTag with 'max' do to a tagged entry?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Marks it stale; the next request still gets the old value (the lab showed STALE with the old timestamp) and the one after gets the recomputed value.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **cacheLife** | Lifetime profile for a use cache entry |
| **cacheTag** | Label for targeted invalidation |
| **stale** | Client reuse time |
| **expire** | Hard limit after which the entry is dropped |

---
**Conclusion:** cacheLife and cacheTag are the lifetime and invalidation controls of the Cache Components model: one names how long an entry lives, the other names what can clear it. The lab showed the profiles flowing into the build table and response headers, the stale-once behaviour of revalidateTag, and the build refusing a too-short profile in the static shell.`,
    examples: [
      {
        label: "A custom profile, a tagged cached function, and invalidation",
        tech: "tsx",
        runnable: false,
        code: `// next.config.ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    catalogue: { stale: 300, revalidate: 3600, expire: 86400 },
  },
};
export default nextConfig;

// lib/catalogue.ts
import { cacheLife, cacheTag } from "next/cache";
export async function getProduct(id: string) {
  "use cache";
  cacheLife("catalogue");
  cacheTag("products", \`product-\${id}\`);
  return db.product.findUnique({ where: { id } });
}

// app/admin/actions.ts
"use server";
import { updateTag } from "next/cache";
export async function saveProduct(id: string) {
  await db.product.update({ /* ... */ });
  updateTag(\`product-\${id}\`); // read-your-own-writes for the editor
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "PPR vs ISR vs SSR — how do you pick the rendering strategy in Next 15?",
    seoDescription: "Pick SSR, ISR or PPR from two questions: is the data per request, and how stale may it be. Real first-byte timings from a Next.js 16.3.4 lab.",
    description: `**Question presented to candidate:**
"You are designing a product page, a blog and an account dashboard. For each, would you use static with ISR, fully dynamic SSR, or Partial Prerendering, and why?"

**What a strong answer should cover:**
- Static or ISR: content is the same for everyone and may be minutes or hours stale; fastest first byte, cheapest to serve.
- Dynamic (SSR): content depends on the request and must be exact; every request renders, and the first byte waits for data unless you stream.
- PPR: mostly shared content with a few personal parts; the shell is prerendered and the personal holes stream in the same response.
- Streaming with loading.js or Suspense improves dynamic pages when PPR is not available.
- In Next.js 16, PPR comes with Cache Components (\`cacheComponents: true\`), no longer an experimental flag.

**Clarifying questions expected:**
- "Which parts of the page differ per user?" — those decide whether the page needs holes.
- "How quickly must edits appear?" — decides lifetime and on-demand revalidation.

**Code / implementation expected:** Optional — the configuration for each strategy.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Three restaurants. One sells sandwiches wrapped in the morning: instant, identical, refreshed every few hours (ISR). One cooks everything to order: exactly what you asked for, but you wait (SSR). The third hands you the bread basket and the starter the moment you sit down and brings your personalised main course as soon as it is ready (PPR). Most real menus are the third kind.

## 2. The Core Idea

📌 **Interview term: SSR** — server-side rendering on every request; used when the content depends on the request.

📌 **Interview term: ISR** — static rendering with background regeneration after a lifetime or on demand.

📌 **Interview term: PPR** — a prerendered static shell with Suspense holes rendered per request, streamed in one response.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 336" role="img" aria-label="First byte for each strategy in the lab (page work 1.2 to 1.5 s). static / ISR, PPR, SSR + streaming, SSR, no streaming">
  <defs>
    <marker id="nx085npo-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">First byte for each strategy in the lab (page work 1.2 to 1.5 s)</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="46" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="68" r="12"/>
    <text class="d-text d-accent" x="46" y="73" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="70" y="73">static / ISR</text>
    <text class="d-sub" x="262" y="72">about 12 to 22 ms: served from the stored page</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="102" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="124" r="12"/>
    <text class="d-text d-accent" x="46" y="129" text-anchor="middle">2</text>
    <text class="d-text d-accent" x="70" y="129">PPR</text>
    <text class="d-sub" x="262" y="128">16 ms for the shell, personal hole at about 1.2 s</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.45s" fill="freeze"/>
    <rect class="d-box" x="24" y="158" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="180" r="12"/>
    <text class="d-text d-accent" x="46" y="185" text-anchor="middle">3</text>
    <text class="d-text" x="70" y="185">SSR + streaming</text>
    <text class="d-sub" x="262" y="184">24 ms for the fallback, content at about 1.5 s</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.45s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="214" width="612" height="44" rx="10"/>
    <circle class="d-box-accent" cx="46" cy="236" r="12"/>
    <text class="d-text d-accent" x="46" y="241" text-anchor="middle">4</text>
    <text class="d-text" x="70" y="241">SSR, no streaming</text>
    <text class="d-sub" x="262" y="240">1546 ms before the first byte</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="274" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="301" text-anchor="middle">pick by two questions: is the data per request, and how stale may it be</text>
  </g>
</svg>

The strategies differ less in total time than in when the user sees the first content. That is why PPR and streaming matter so much for dynamic pages.

## 3. A decision table

| Page | Data per request? | Staleness allowed | Strategy |
| :--- | :--- | :--- | :--- |
| Blog post | No | Minutes to hours | Static + ISR, on-demand revalidation on publish |
| Product page with cart count | Mostly no, one part yes | Minutes for the product | PPR: cached product, dynamic cart hole |
| Account dashboard | Yes | None | Dynamic, streamed with Suspense |
| Search results | Yes (query) | Seconds | Dynamic, cache the underlying data |
| Pricing that changes rarely | No | Until changed | Static with a tag, revalidateTag on change |

## 4. Mixing is normal

These are per-route choices, and with PPR they become per-component. In Next.js 16 with Cache Components, the default is dynamic and you opt parts into caching with 'use cache', which makes the "mostly static page with a few personal parts" the natural shape. See [PPR](/interview-question/what-is-partial-prerendering-ppr-in-next-js), [ISR](/interview-question/what-is-isr-incremental-static-regeneration-in-next-js-and-how-do-you-implement-) and [static versus dynamic](/interview-question/what-is-the-difference-between-static-and-dynamic-rendering-in-the-next-js-app-r).

## 5. Verified — The Same Work, Four Ways (Next.js 16.3.4, next start)

Each route was requested twice and the second request timed:

\`\`\`
each route requested twice (first request warms it), second one timed; page work = 1500 ms for the dynamic ones, 1200 ms for the PPR hole
static page (○)              first byte    12 ms   complete    13 ms   served from the prerendered file
ISR page (○ + 30s)           first byte    22 ms   complete    22 ms   prerendered, revalidated in the background
dynamic, no loading.js (ƒ)   first byte  1546 ms   complete  1548 ms   server waits 1500 ms before sending anything
dynamic + loading.js (ƒ)     first byte    24 ms   complete  1533 ms   fallback streams first, then the content
Partial Prerender (◐)        first byte    16 ms   complete  1233 ms   static shell + fallback first, hole streams in
\`\`\`

The build tables show the chosen strategy per route (○ static, ◐ partial prerender, ƒ dynamic):

\`\`\`
Route (app)        Revalidate  Expire
┌ ○ /
├ ○ /_not-found
├ ƒ /api/bust
├ ○ /cached                1h      1d
├ ○ /life-custom           2w     30d
├ ◐ /life-seconds
├ ○ /life-tagged           1d      1w
└ ◐ /ppr


○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
ƒ  (Dynamic)            server-rendered on demand
\`\`\`

## 6. Common Pitfalls

- **Choosing SSR for a whole page because of one personal widget.** Put the widget in a Suspense hole (PPR or streaming) and keep the rest fast.
- **Choosing ISR for personal data.** It is shared by everyone; one user would see another user data.
- **Very short ISR lifetimes instead of on-demand revalidation.** Revalidate on publish instead of regenerating every few seconds.
- **Ignoring the first byte.** A dynamic page without streaming makes users wait for the slowest query; the lab showed 1546 ms against 24 ms with streaming.
- **Following Next 15 PPR instructions.** In 16 the flag is \`cacheComponents\`; \`experimental.ppr\` fails the build.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Ask two questions: is the data different per request, and how stale may it be.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Shared data that may be stale: static with ISR and on-demand revalidation, served in about 12 to 22 ms in the lab.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Per-request data: dynamic rendering, streamed with Suspense so the first byte is not held by the slowest query.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Mostly shared with a few personal parts: PPR, where the shell came in 16 ms and the hole about 1.2 s later.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">In Next.js 16, PPR comes with Cache Components; choose per component, not only per route.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is PPR always better than ISR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. For a page with no personal parts, ISR serves the whole page from storage with no per-request rendering at all. PPR is for pages that genuinely have per-request parts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about pure client-side rendering?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It still has a place for highly interactive, private screens behind login, often with SWR or TanStack Query, but the first HTML then has no data, so it is a poor choice for SEO pages.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a product page where stock must be exact?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Cache the product details, and render the stock count as a dynamic hole (PPR) or fetch it on the client. Do not make the whole page dynamic for one number.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the choice cost in hosting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Static and ISR pages are served from storage or a CDN; dynamic and PPR holes need server work on every request, which costs compute.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **SSR** | Render on every request |
| **ISR** | Static with background regeneration |
| **PPR** | Static shell plus dynamic holes |
| **Streaming** | Sending HTML in pieces as it becomes ready |

---
**Conclusion:** The choice between ISR, SSR and PPR comes from two questions: per-request data, and tolerated staleness. The lab put numbers on it: stored pages answer in milliseconds, a blocking dynamic page waited 1.5 s for its first byte, and streaming or PPR brought the first byte back to milliseconds while the personal part followed. Most real pages are mixed, which is why Next.js 16 makes the choice per component.`,
    examples: [
      {
        label: "The three strategies side by side",
        tech: "tsx",
        runnable: false,
        code: `// Blog post: static + ISR
export const revalidate = 3600;
export default async function Post() { /* shared content */ }

// Dashboard: dynamic, streamed
import { Suspense } from "react";
export default function Dashboard() {
  return <Suspense fallback={<Skeleton />}><Charts /></Suspense>; // Charts reads cookies()
}

// Product: PPR (next.config.ts: cacheComponents: true)
export default function Product() {
  return (
    <>
      <ProductDetails />                                  {/* 'use cache' inside */}
      <Suspense fallback={<p>Cart</p>}><CartCount /></Suspense>  {/* reads cookies() */}
    </>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you fetch data in Next.js Client Components (SWR, React Query, use)?",
    seoDescription: "Client-side fetching in Next.js: SWR or TanStack Query for interactive data, use() for promises from the server. SWR deduped three hooks into one request.",
    description: `**Question presented to candidate:**
"Some data in our dashboard changes while the user is on the page and needs refetching. How do you fetch in a Client Component, and when would you do it on the client at all instead of on the server?"

**What a strong answer should cover:**
- Prefer server fetching for the initial data; use the client for data that changes while the page is open, depends on client state, or is user-triggered.
- Use a library: SWR or TanStack Query give caching, request deduplication, revalidation on focus, retries and mutations.
- Avoid raw \`useEffect\` + \`fetch\`: it has race conditions, no cache, and double-fetches in Strict Mode development.
- To stream server data into a client component, pass a Promise from a Server Component and read it with React \`use()\` inside Suspense.
- Client-fetched data is not in the server HTML, so it does not help SEO or the first paint.

**Clarifying questions expected:**
- "Does this data need to be in the first HTML?" — if so, fetch on the server.
- "Does it change while the user is looking?" — that is where a client library earns its place.

**Code / implementation expected:** Yes — an SWR hook, and a server promise unwrapped with use().`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Server fetching is the waiter bringing your meal already plated. Client fetching is the drinks trolley that comes round during the meal: useful for things that keep changing (refills), but nobody wants to wait for the trolley before they get any food. SWR and TanStack Query are a trolley that remembers who ordered what and does not bring three identical coffees to one table.

## 2. The Core Idea

📌 **Interview term: SWR** — a React data-fetching library named after stale-while-revalidate; it caches by key, deduplicates requests and revalidates on focus and reconnect.

📌 **Interview term: TanStack Query** — a React data-fetching and caching library (formerly React Query) with queries, mutations, retries and cache invalidation.

📌 **Interview term: use()** — a React API that reads a Promise in a component, suspending until it resolves; used to read server-started requests on the client.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="Where the data for a component comes from. server fetch or use(), SWR / TanStack Query">
  <defs>
    <marker id="nx099ldj-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Where the data for a component comes from</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="164" y="78" text-anchor="middle">server fetch or use()</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">in the first HTML</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">good for SEO and first paint</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">promise passed from the server</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx099ldj-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="496" y="78" text-anchor="middle">SWR / TanStack Query</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">after hydration</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">cached, deduped, refetched</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">for live or user-driven data</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">lab: three useSWR hooks with one key made one request; a window focus event made one more</text>
  </g>
</svg>

The two approaches are complements, not rivals: the server gives the first picture, the client keeps it fresh.

## 3. Choosing

| Need | Tool |
| :--- | :--- |
| Initial page data, SEO | Server Component fetch |
| Server data, but render in a client component | Pass the Promise, \`use()\` it inside Suspense |
| Data that changes while open (notifications, prices) | SWR or TanStack Query with polling or focus revalidation |
| Search as you type, filters in client state | SWR or TanStack Query keyed by the filter |
| Mutations with optimistic UI | Server Actions with \`useOptimistic\`, or a library mutation |

## 4. Combining them

A common pattern is to fetch on the server and hand the result to the client library as initial data (SWR \`fallback\`, TanStack Query \`initialData\` or hydration), so the first render has data and later updates come from the client. Route Handlers or Server Actions serve as the client endpoints. See [passing data to Client Components](/interview-question/how-do-you-pass-data-from-server-components-to-client-components-in-next-js).

## 5. Verified — SWR in a Real Browser (Next.js 16.3.4, next start)

Three Client Components on one page call \`useSWR("/api/time", fetcher)\`:

\`\`\`
/swr: a static page with three client components, each calling useSWR("/api/time", fetcher)
server HTML (what arrives before JavaScript): SWR-one loading|SWR-two loading|SWR-three loading|
browser, after hydration:     SWR-one 2026-09-23T06:00:55.890Z | SWR-two 2026-09-23T06:00:55.890Z | SWR-three 2026-09-23T06:00:55.890Z
requests to /api/time after load: 1   (three hooks, one shared key, one request)
after a window focus event:       2   (SWR revalidates on focus)
\`\`\`

The server HTML contains only the loading state, which is the SEO trade-off in one line. The server-promise path, for comparison, arrived resolved in the first response:

\`\`\`
serial/promise  -> type=[object String] value=resolved on the server
\`\`\`

## 6. Common Pitfalls

- **Fetching the initial data on the client.** The first HTML is empty, the user waits for JavaScript and a second round trip, and crawlers see a spinner.
- **Raw useEffect fetching.** No cache, no dedupe, race conditions on fast changes, and double requests in Strict Mode development.
- **Calling a Server Component-only function from the client.** Client code needs an HTTP endpoint (Route Handler) or a Server Action.
- **Unstable keys.** A key built from a new object each render refetches constantly; use strings or stable arrays.
- **Forgetting Suspense around \`use()\`.** Without a boundary the whole route suspends.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Fetch initial data on the server; use the client for data that changes while the page is open or depends on client state.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Use SWR or TanStack Query rather than raw useEffect: caching, dedupe, focus revalidation, retries.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">In the lab three useSWR hooks with the same key made one request, and a focus event made one more.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">For server data rendered in a client component, pass the Promise and read it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">use()</code> inside Suspense.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Client-fetched data is not in the server HTML, so it costs first paint and SEO.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is useEffect + fetch acceptable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a one-off, non-critical request in a small component, with an abort controller and an ignore flag for races. Anything shared or refreshed deserves a library.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you give SWR initial data from the server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fetch on the server and pass it to an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SWRConfig</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fallback</code> keyed by the same key, or to the hook <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fallbackData</code>; the first render then has data and SWR revalidates afterwards.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does TanStack Query add over SWR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A richer mutation and invalidation API, query cancellation, pagination helpers and devtools. SWR is smaller and simpler; both solve the same core problem.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a Client Component call a Server Action to load data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It can, but Server Actions are designed for mutations and run one at a time per client; for reads prefer a Route Handler or server-side fetching.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **SWR** | Stale-while-revalidate data hooks |
| **TanStack Query** | Query and mutation caching library |
| **use()** | Reads a Promise in a component |
| **fallbackData** | Initial value for an SWR hook |

---
**Conclusion:** Client-side fetching is for data that changes after the page is shown; the initial picture belongs on the server. When you fetch on the client, use a library: the lab showed SWR merging three identical hooks into one request and refreshing on focus, which raw useEffect code does not do. For server data rendered in a client component, pass a Promise and use() it.`,
    examples: [
      {
        label: "An SWR hook and a server promise read with use()",
        tech: "tsx",
        runnable: false,
        code: `// components/Notifications.tsx
"use client";
import useSWR from "swr";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Notifications() {
  const { data, error, isLoading } = useSWR("/api/notifications", fetcher, { refreshInterval: 30_000 });
  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Could not load notifications</p>;
  return <ul>{data.map((n: { id: string; text: string }) => <li key={n.id}>{n.text}</li>)}</ul>;
}

// app/page.tsx (Server Component) -> components/Stats.tsx ("use client")
//   <Suspense fallback={<p>Loading stats</p>}><Stats statsPromise={getStats()} /></Suspense>
//   inside Stats:  const stats = use(statsPromise);`,
      },
    ],
  },
];

export default augments;
