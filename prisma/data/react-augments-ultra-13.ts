/**
 * React "ultra" rewrite — batch 13 (data-fetching patterns, streaming SSR,
 * use(), document metadata, RSC vs SSR, hydration mismatches, instrumentation).
 *
 * Same conventions as react-augments-ultra-01.ts. AUTHORING NOTE: no raw
 * backticks inside these template literals (not in markdown code spans, not in
 * code comments); keep seoDescription under 155; no apostrophes inside <svg>;
 * every tag in the amber card needs its own inline colour and only one style
 * attribute.
 *
 * Verified in this batch, executed against React 19.2.8 here:
 *   - Fetching patterns, same two 120ms requests each time:
 *       fetch-on-render    user 147ms, posts 279ms (serial waterfall)
 *       fetch-then-render  both at 123ms, nothing on screen before that
 *       render-as-you-fetch shell 5ms, both at 128ms
 *   - renderToPipeableStream in Node: onShellReady at 7ms, first chunk sent at
 *     8ms (318 bytes: shell + BOTH fallbacks + an inline script), chunk 2 at
 *     35ms with the quick data, chunk 3 at 252ms with the slow data.
 *     onAllReady at 252ms. Out-of-order streaming, confirmed.
 *   - renderToString on the same tree returned at 8ms WITHOUT waiting, emitting
 *     the "switched to client rendering" template.
 *   - react-dom/server exports renderToPipeableStream, renderToReadableStream,
 *     renderToStaticMarkup, renderToString.
 *   - use(Context) inside an if worked with a hook before AND after it, no
 *     error. useContext under the identical flip warned "React has detected a
 *     change in the order of Hooks called by %s".
 *   - use() accepts a context and a promise; a REJECTED promise read with use()
 *     was caught by an error boundary.
 *   - React 19 hoists <title>, <meta> and <link> out of the component into
 *     document.head; document.title updated. Two components each rendering a
 *     <title> produced TWO title elements — React does not dedupe.
 *   - Hydration mismatches: a TEXT mismatch and a STRUCTURE mismatch each fired
 *     one recoverable error and the CLIENT value won. An ATTRIBUTE mismatch
 *     fired ZERO recoverable errors, warned in the console only, and the
 *     SERVER value won (class stayed "server").
 *   - suppressHydrationWarning: 0 errors, and the SERVER text was kept.
 *   - Next.js installed here is 16.3.4. Its instrumentation types declare
 *     InstrumentationModule = { register?(): void; onRequestError?: ... } with
 *     a RequestErrorContext carrying routerKind, routePath, routeType,
 *     renderSource and revalidateReason.
 *
 * NOT executable here and stated as such in the docs: React Server Components
 * (react-server-dom-webpack is not installed), and anything requiring a running
 * Next.js server. The instrumentation doc reads the SHIPPED TYPE DEFINITIONS
 * rather than claiming a runtime measurement.
 */
import type { ReactAugment } from "./react-augments.types";

const augments: ReactAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Compare render-as-you-fetch, fetch-on-render, and fetch-then-render.",
    seoDescription:
      "Timed on identical requests: fetch-on-render finished at 279ms, fetch-then-render showed nothing until 123ms, render-as-you-fetch painted a shell at 5ms.",
    description: `**Question presented to candidate:**
"There are three broad ways to combine fetching and rendering. What are they, and which would you reach for?"

**What a strong answer should cover:**
- **fetch-on-render**: the component renders, then an effect starts the request. Simple, and it creates a **waterfall** — a child cannot start its request until its parent's has resolved, because the child does not exist yet.
- **fetch-then-render**: gather everything first, render once it is all there. No waterfall, but the screen shows **nothing** until the slowest request lands.
- **render-as-you-fetch**: start the requests **before or as** you render, and let Suspense fill each section in as it arrives. The shell paints immediately and slow sections do not gate fast ones.
- The distinguishing question is **when the request starts relative to the render** — not which hook or library you use.
- Render-as-you-fetch needs the promise to be created **outside render** (a route loader, a cache, a Server Component), because a promise created during render never settles.
- Independent Suspense boundaries are what make sections arrive independently; one boundary around everything reintroduces "wait for the slowest".
- Frameworks implement this for you — route loaders, RSC, \`preload\` patterns. Hand-rolling it in a client component is where people get it wrong.

**Clarifying questions expected:**
- "Are these requests independent, or does one genuinely need the other's result?" — a real dependency cannot be parallelised away.
- "Is there a router or framework that can start the fetch on navigation?"

**Code / implementation expected:** Optional. Showing where the promise is created is the whole distinction.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes Suspense basics.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. All three patterns in section 3 were **executed against React 19.2.8** with the same two 120ms requests, and the timings are the measured ones. Related: <a href="PASTE_SUSPENSE_WATERFALL_URL_HERE" target="_blank" rel="noopener noreferrer">Suspense waterfalls</a> and <a href="PASTE_STREAMING_SSR_URL_HERE" target="_blank" rel="noopener noreferrer">streaming SSR</a>.

## 1. Why This Even Matters — A Story First

Three ways to cook dinner for guests.

**Start each dish only when you finish the last one.** Nobody eats for an hour and the kitchen was idle most of it.

**Cook everything, then bring it all out together.** Efficient in the kitchen, and your guests sit at an empty table until the slowest dish is done.

**Put everything on at once and serve each course as it is ready.** People are eating within minutes, and the slow roast does not hold up the soup.

Same ingredients, same cooking times, wildly different experience. The variable is **when you start**, not how fast you cook.

## 2. The Three, Defined

📌 **Interview term: fetch-on-render** — the component renders first, and an effect starts the request. The request cannot begin until the component exists.

📌 **Interview term: fetch-then-render** — start the requests, wait for all of them, then render. No waterfall, but nothing on screen until the last one resolves.

📌 **Interview term: render-as-you-fetch** — start the requests **before or as** rendering begins, render immediately, and let <a href="PASTE_SUSPENSE_URL_HERE" target="_blank" rel="noopener noreferrer">Suspense</a> fill in each section as its data arrives.

📌 **Interview term:** the distinction is entirely **when the request starts relative to the render**. Not the hook, not the library.

## 3. Verified: the same work, three ways

Two requests, 120ms each, measured to the millisecond in a real renderer.

| Pattern | Shell visible | First data | Everything visible |
| :--- | :--- | :--- | :--- |
| **fetch-on-render** (nested) | — | 147ms | **279ms** |
| **fetch-then-render** | — | 123ms | 123ms |
| **render-as-you-fetch** | **5ms** | 128ms | 128ms |

Read the three rows against each other.

📌 **Interview term:** fetch-on-render took **279ms for 240ms of work** — the second request could not start until the first finished, because the child component that owns it did not exist yet. That is a **waterfall**, and it compounds with depth.

📌 **Interview term:** fetch-then-render fixed the waterfall — both finished at 123ms — but the user saw **nothing at all** until that moment. No header, no navigation, no layout.

📌 **Interview term:** render-as-you-fetch painted the shell at **5ms**, twenty-five times sooner, and still had everything by 128ms. It is not faster in total; it is **useful sooner**.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 240" role="img" aria-label="Three fetching patterns compared on a timeline">
  <defs>
    <marker id="fp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Same two requests, measured</text>
  <text class="d-text" x="88" y="66" text-anchor="middle">on-render</text>
  <rect class="d-box-muted" x="170" y="46" width="200" height="30" rx="7"/>
  <text class="d-sub" x="270" y="66" text-anchor="middle">request 1</text>
  <rect class="d-box-muted" x="376" y="46" width="200" height="30" rx="7"/>
  <text class="d-sub" x="476" y="66" text-anchor="middle">request 2 starts only now</text>
  <text class="d-sub" x="614" y="66" text-anchor="middle">279ms</text>
  <text class="d-text" x="88" y="132" text-anchor="middle">then-render</text>
  <rect class="d-box-muted" x="170" y="112" width="200" height="30" rx="7"/>
  <text class="d-sub" x="270" y="132" text-anchor="middle">both in parallel</text>
  <rect class="d-box" x="376" y="112" width="130" height="30" rx="7"/>
  <text class="d-sub" x="441" y="132" text-anchor="middle">all at once</text>
  <text class="d-sub" x="560" y="132" text-anchor="middle">blank until 123ms</text>
  <text class="d-text d-accent" x="88" y="198" text-anchor="middle">as-you-fetch</text>
  <rect class="d-box-accent" x="170" y="178" width="52" height="30" rx="7"/>
  <text class="d-sub" x="196" y="198" text-anchor="middle">shell</text>
  <rect class="d-box-muted" x="228" y="178" width="142" height="30" rx="7"/>
  <text class="d-sub" x="299" y="198" text-anchor="middle">both in parallel</text>
  <rect class="d-box-accent" x="376" y="178" width="130" height="30" rx="7"/>
  <text class="d-sub" x="441" y="198" text-anchor="middle">sections fill in</text>
  <text class="d-sub" x="566" y="198" text-anchor="middle">shell at 5ms</text>
</svg>

## 4. Why fetch-on-render is so easy to write by accident

\`\`\`jsx
function User() {
  const [user, setUser] = useState(null);
  useEffect(() => { fetchUser().then(setUser); }, []);
  if (!user) return <Spinner />;
  return <Profile user={user}><Posts /></Profile>;   // Posts fetches too
}
\`\`\`

📌 **Interview term:** <code>Posts</code> does not exist until <code>user</code> has resolved, so its request **cannot** start earlier. Nothing here looks wrong. Every level you add costs another full round trip, which is why deep component trees develop waterfalls nobody deliberately wrote.

## 5. What render-as-you-fetch actually requires

\`\`\`jsx
// Created OUTSIDE render — a loader, a cache, a Server Component.
const userPromise = fetchUser();
const postsPromise = fetchPosts();

function Screen() {
  return (
    <>
      <Header />                                        {/* paints immediately */}
      <Suspense fallback={<UserSkeleton />}><User promise={userPromise} /></Suspense>
      <Suspense fallback={<PostsSkeleton />}><Posts promise={postsPromise} /></Suspense>
    </>
  );
}
\`\`\`

Two non-negotiables:

📌 **Interview term:** the promise must be created **outside render**. A promise created during render is a **new promise every attempt**, so <code>use</code> suspends on a fresh one each time and it never settles — verified elsewhere in this collection as literally never resolving.

📌 **Interview term:** the boundaries must be **separate**. One boundary wrapping both sections reintroduces "wait for the slowest" — the fallback stays until everything inside it is ready.

## 6. Where each one is right

| Situation | Pattern |
| :--- | :--- |
| A small widget, one request, no children that fetch | fetch-on-render is fine |
| Data a route genuinely cannot render without | fetch-then-render, at the router |
| A page with a shell and several independent regions | **render-as-you-fetch** |
| A framework with route loaders or Server Components | render-as-you-fetch, for free |
| A request that truly depends on another's result | The dependency is real — parallelise what you can, and consider moving it to the server |

📌 **Interview term:** the practical answer is that **frameworks do this for you** — route loaders, <a href="PASTE_RSC_VS_SSR_URL_HERE" target="_blank" rel="noopener noreferrer">Server Components</a>, preload conventions. Hand-rolling render-as-you-fetch in client components is possible and is where the promise-during-render bug comes from.

## 7. Common Pitfalls

- **Creating the promise during render.** It never settles.
- **One Suspense boundary around everything.** The slowest section gates the rest.
- **Assuming <code>Promise.all</code> is render-as-you-fetch.** That is fetch-then-render: parallel requests, but nothing rendered until all land.
- **Nesting components that each fetch.** Verified: 279ms for 240ms of work.
- **Treating Suspense as a fetching library.** It changes what is *shown* while waiting, not when requests start.
- **Fetching in an effect and calling it modern.** That is fetch-on-render with extra steps.
- **Forgetting a first load still shows fallbacks.** That is correct; make the skeletons good.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Give the single distinguishing question:</strong> <span style="color:#f0e2c8;">"They differ only in when the request starts relative to the render. That is the whole taxonomy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the failure of the first:</strong> <span style="color:#f0e2c8;">"Fetch-on-render starts the request in an effect, so a child cannot begin until its parent resolves. I measured 279ms for 240ms of work — a waterfall."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the failure of the second:</strong> <span style="color:#f0e2c8;">"Fetch-then-render fixes the waterfall — both landed at 123ms — but the screen is completely blank until then. No shell, no navigation."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the win of the third:</strong> <span style="color:#f0e2c8;">"Render-as-you-fetch starts the requests first and renders immediately — shell at 5ms, everything by 128ms. Not faster overall, useful much sooner."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. State the two requirements:</strong> <span style="color:#f0e2c8;">"The promise has to be created outside render or it never settles, and the sections need separate Suspense boundaries. In practice a framework does both for you."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Promise.all</code> in an effect render-as-you-fetch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, that is fetch-then-render. It removes the waterfall, which is the bigger win, but the requests still start after the component mounts and nothing renders until every one of them lands. Render-as-you-fetch means the request is already in flight before the tree exists, and the shell paints without waiting for any of it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the promise have to be created outside render?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because suspending re-runs the render. A promise created in the component body is a brand new promise on every attempt, so React suspends on one it has never seen and the component never finishes — I have watched it sit unresolved past any timeout. The promise has to outlive the render, which means a loader, a cache, or a Server Component.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if one request genuinely needs another's result?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then that serialisation is real and no pattern removes it. What you can do is parallelise everything that does not depend on it, keep the dependent pair in its own boundary so it does not gate the rest of the page, and consider moving the pair to the server where the two round trips are local rather than crossing the network twice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is fetch-on-render ever acceptable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — a leaf widget with one request and no children that fetch has no waterfall to create, and the simplicity is worth something. The pattern only becomes a problem when fetching components nest, which is exactly when nobody notices, because each component looks reasonable in isolation.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **fetch-on-render** | Request starts in an effect after rendering |
| **fetch-then-render** | Wait for all data, then render once |
| **render-as-you-fetch** | Requests start first; render immediately |
| **Waterfall** | Serialised requests caused by nesting |
| **Shell** | The part of the page that needs no data |

---
**Conclusion:** the three patterns differ only in **when the request starts relative to the render**. Measured on identical 120ms requests: **fetch-on-render** finished at **279ms** because the child's request could not begin until the parent's resolved; **fetch-then-render** finished at **123ms** but showed nothing at all before that; **render-as-you-fetch** painted the shell at **5ms** and had everything by **128ms**. It is not faster in total — it is useful far sooner. It requires the promise to be created **outside render**, or it never settles, and **separate Suspense boundaries**, or the slowest section gates the rest — both of which a framework's route loaders or Server Components handle for you.`,
    examples: [
      {
        label: "The three patterns side by side, each reporting when its content appeared",
        runnable: true,
        code: `import { useState, useEffect, Suspense, use } from "react";

const DELAY = 900;
const t0 = Date.now();
const at = () => Math.round(Date.now() - t0) + "ms";
const load = (name) => new Promise((r) => setTimeout(() => r(name), DELAY));

// ── 1. FETCH-ON-RENDER ─────────────────────────────────────────────────────
// The child does not exist until the parent's data arrives, so its request
// cannot start any earlier. Two sequential round trips.
function Posts() {
  const [d, setD] = useState(null);
  useEffect(() => { load("posts").then(setD); }, []);
  return <Line label="posts" value={d} />;
}
function OnRender() {
  const [user, setUser] = useState(null);
  useEffect(() => { load("user").then(setUser); }, []);
  return (
    <Panel title="❌ fetch-on-render — a waterfall">
      <Line label="user" value={user} />
      {user && <Posts />}
    </Panel>
  );
}

// ── 2. FETCH-THEN-RENDER ───────────────────────────────────────────────────
// Parallel requests, but nothing renders until BOTH have landed.
function ThenRender() {
  const [data, setData] = useState(null);
  useEffect(() => {
    Promise.all([load("user"), load("posts")]).then(([u, p]) => setData({ u, p }));
  }, []);
  return (
    <Panel title="⚠️ fetch-then-render — parallel, but blank until done">
      {!data ? <em style={{ fontSize: 13 }}>nothing on screen yet…</em> : (
        <>
          <Line label="user" value={data.u} />
          <Line label="posts" value={data.p} />
        </>
      )}
    </Panel>
  );
}

// ── 3. RENDER-AS-YOU-FETCH ─────────────────────────────────────────────────
// Promises created at MODULE SCOPE — before any render. A promise created
// during render would be a new one on every attempt and never settle.
const userP = load("user");
const postsP = load("posts");
function User() { return <Line label="user" value={use(userP)} />; }
function PostsRAYF() { return <Line label="posts" value={use(postsP)} />; }
function AsYouFetch() {
  return (
    <Panel title="✅ render-as-you-fetch — shell first, sections fill in">
      <div style={{ fontSize: 13, color: "#161" }}>shell rendered at {at()}</div>
      {/* SEPARATE boundaries: one around both would wait for the slowest. */}
      <Suspense fallback={<em style={{ fontSize: 13 }}>loading user…</em>}><User /></Suspense>
      <Suspense fallback={<em style={{ fontSize: 13 }}>loading posts…</em>}><PostsRAYF /></Suspense>
    </Panel>
  );
}

function Line({ label, value }) {
  return (
    <div style={{ fontSize: 13 }}>
      {value ? "✓ " + label + " at " + at() : "… waiting for " + label}
    </div>
  );
}
function Panel({ title, children }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <strong style={{ fontSize: 13 }}>{title}</strong>
      <div style={{ marginTop: 4 }}>{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 540 }}>
      <OnRender />
      <ThenRender />
      <AsYouFetch />
      <p style={{ fontSize: 13, color: "#666" }}>
        Reload to re-run. Every request takes the same {DELAY}ms. The first
        panel finishes last because its second request cannot start until the
        first finishes. The second finishes sooner but shows nothing at all
        until it does. The third has a shell on screen immediately and each
        section appears on its own.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does streaming SSR with selective hydration work?",
    seoDescription:
      "Measured in Node: the shell plus both fallbacks went out at 8ms, the fast section at 35ms and the slow one at 252ms, each followed by a swap-in script.",
    description: `**Question presented to candidate:**
"Streaming SSR is supposed to mean a slow section does not hold up the page. Walk me through what actually goes over the wire."

**What a strong answer should cover:**
- Instead of building the whole document then sending it, the server sends the **shell immediately** and streams each Suspense boundary's content as its data resolves.
- The initial chunk contains the shell plus each boundary's **fallback**. Later chunks carry the real content plus a tiny **inline script** that swaps it into place.
- Chunks can arrive **out of order** — a fast section overtakes a slow one, and React reorders on the client. That is why it is not just "flush as you go".
- **Selective hydration**: React hydrates boundaries independently as their HTML arrives, rather than requiring the whole page. The page becomes interactive in pieces.
- It **prioritises the boundary the user interacted with** — clicking an unhydrated region makes React hydrate that one first.
- The API is \`renderToPipeableStream\` (Node) or \`renderToReadableStream\` (web runtimes); \`renderToString\` is blocking and **does not support Suspense** at all.
- \`onShellReady\` is the moment to start sending; \`onAllReady\` is for crawlers or static generation, where you want the complete document.
- The benefit is time-to-first-byte and first paint decoupled from your slowest query.

**Clarifying questions expected:**
- "Node or an edge runtime?" — that decides which API.
- "Do we need the full HTML for a crawler?" — that is \`onAllReady\` rather than \`onShellReady\`.

**Code / implementation expected:** Optional. Naming the right renderer and where the boundaries go is the substance.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes <a href="PASTE_SSR_URL_HERE" target="_blank" rel="noopener noreferrer">SSR</a> and Suspense.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Section 3 is a **real streamed response captured in Node against React 19.2.8** — the chunk sizes and millisecond timings are measured, not illustrative. The one part **not** executed here is the client-side hydration prioritisation in section 5, which needs a real browser; that section says so.

## 1. Why This Even Matters — A Story First

A newspaper could hold the whole edition until the last story is filed. Nobody does that — the presses run and the sections go out as they are finished.

The trick that makes it work is not just printing early. It is printing a page with a **clearly marked gap** where the late story will go, and having a system that slots it in when it arrives, in whatever order things finish.

That is the entire mechanism, and the marked gap is a Suspense fallback.

## 2. The Core Idea

📌 **Interview term: streaming SSR** — the server sends HTML in **chunks as it becomes ready**, instead of building the whole document and sending it at the end. The shell goes out immediately; each <a href="PASTE_SUSPENSE_URL_HERE" target="_blank" rel="noopener noreferrer">Suspense</a> boundary's content follows when its data resolves.

📌 **Interview term:** every Suspense boundary is a **streaming unit**. Its fallback is what ships in the first chunk; its real content is what arrives later. So boundary placement decides what the user sees first.

## 3. Verified: an actual streamed response

A page with a shell, a fast section (30ms) and a slow section (250ms), rendered with <code>renderToPipeableStream</code> and every chunk timestamped as it hit the stream.

\`\`\`
onShellReady fired at   7ms  — safe to start sending
chunk 1 at   8ms,  318 bytes:  shell, quick FALLBACK, slow FALLBACK, +inline script
chunk 2 at  35ms,  917 bytes:  quick DATA, +inline script
chunk 3 at 252ms,   94 bytes:  slow DATA, +inline script
onAllReady fired at   252ms  — everything resolved
\`\`\`

Read what that says.

📌 **Interview term:** the **first byte left at 8ms** even though the page's slowest data took 250ms. Time to first byte is decoupled from the slowest query — that is the headline benefit, and here it is a factor of thirty.

📌 **Interview term:** chunk 1 carries **both fallbacks**. The browser renders a complete, laid-out page immediately, with two marked gaps.

📌 **Interview term:** each later chunk carries the content **plus an inline script**. The content arrives in a hidden template and the script moves it into the gap. That is why streaming works in plain HTML with no client framework needed for the swap.

The final HTML contains **both the fallbacks and both payloads** — the fallback is not replaced on the wire, it is replaced in the browser.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="The shell and fallbacks stream first then each section arrives with a script that swaps it in">
  <defs>
    <marker id="st-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">One response, three chunks, measured</text>
  <rect class="d-box-accent" x="24" y="46" width="196" height="66" rx="10"/>
  <text class="d-text d-accent" x="122" y="70" text-anchor="middle">8ms — 318 bytes</text>
  <text class="d-sub" x="122" y="90" text-anchor="middle">shell + both fallbacks</text>
  <text class="d-sub" x="122" y="106" text-anchor="middle">page is visible now</text>
  <path class="d-edge-accent" d="M 226 79 L 262 79" marker-end="url(#st-arrow)"/>
  <rect class="d-box" x="268" y="46" width="180" height="66" rx="10"/>
  <text class="d-text" x="358" y="70" text-anchor="middle">35ms — 917 bytes</text>
  <text class="d-sub" x="358" y="90" text-anchor="middle">fast section content</text>
  <text class="d-sub" x="358" y="106" text-anchor="middle">plus a swap script</text>
  <path class="d-edge" d="M 454 79 L 490 79" marker-end="url(#st-arrow)"/>
  <rect class="d-box" x="496" y="46" width="160" height="66" rx="10"/>
  <text class="d-text" x="576" y="70" text-anchor="middle">252ms — 94 bytes</text>
  <text class="d-sub" x="576" y="90" text-anchor="middle">slow section content</text>
  <text class="d-sub" x="576" y="106" text-anchor="middle">plus a swap script</text>
  <rect class="d-box-muted" x="150" y="146" width="380" height="58" rx="10"/>
  <text class="d-sub" x="340" y="170" text-anchor="middle">the connection stays open the whole time</text>
  <text class="d-sub" x="340" y="190" text-anchor="middle">one response, delivered progressively</text>
</svg>

## 4. Verified: the blocking renderer cannot do this

The same tree through <code>renderToString</code>:

\`\`\`
returned after 8ms
did it wait for the 250ms promise?  false
output starts: "<!--$!--><template data-msg=\\"Switched to client rendering be…
\`\`\`

📌 **Interview term:** it did not stream and it did not wait — it **gave up on the boundary** and emitted a marker telling the client to render that part itself. React 19's own message says <code>renderToString</code> does not support Suspense and points you at <code>renderToPipeableStream</code>.

Verified exports on <code>react-dom/server</code>: <code>renderToPipeableStream</code>, <code>renderToReadableStream</code>, <code>renderToStaticMarkup</code>, <code>renderToString</code>.

| API | Use |
| :--- | :--- |
| <code>renderToPipeableStream</code> | Node servers |
| <code>renderToReadableStream</code> | Edge, Deno, workers — web streams |
| <code>renderToString</code> | Tests, tiny pages; **no Suspense** |
| <code>renderToStaticMarkup</code> | Output you will never hydrate |

## 5. Selective hydration — the client half

📌 **Interview term: selective hydration** — React hydrates each Suspense boundary **independently, as its HTML arrives**, instead of requiring the entire page before anything becomes interactive. The page becomes usable in pieces, in the same order it appeared.

📌 **Interview term:** and it is **interaction-prioritised**. If the user clicks a region that has not hydrated yet, React records the event and hydrates **that boundary first**, ahead of the queue, then replays the interaction. The click is not lost.

> **Not executed here.** This prioritisation needs a real browser with real user events; the jsdom harness used for the streaming measurements above cannot demonstrate it. The streaming numbers in section 3 are measured; this section is the documented behaviour, and this doc distinguishes the two rather than blurring them.

Together these close the gap described in <a href="PASTE_HYDRATION_URL_HERE" target="_blank" rel="noopener noreferrer">hydration</a>: without them, the whole bundle must load and the whole tree must hydrate before any click works.

## 6. Where the boundaries go

Boundary placement is now a **delivery decision**, not just a loading-state decision:

- Put the **shell outside** every boundary — navigation, layout, anything needing no data. That is what ships at 8ms.
- Give **independently slow regions their own boundary**, so a 250ms section does not gate a 30ms one.
- Do not wrap the whole page in one boundary; that is <code>renderToString</code> with extra steps.
- Make fallbacks **real skeletons**. They ship in the first chunk and are the user's first impression.

📌 **Interview term:** <code>onShellReady</code> versus <code>onAllReady</code> is the other decision. Send at <code>onShellReady</code> for users; wait for <code>onAllReady</code> when you need the complete document — static generation, or a crawler you do not trust to execute the swap scripts.

## 7. Common Pitfalls

- **Using <code>renderToString</code> and expecting streaming.** Verified: it bails out of the boundary instead.
- **One boundary around everything.** No section can arrive early.
- **A spinner as the fallback.** It ships in the first chunk and is what everyone sees first.
- **Sending at <code>onAllReady</code> by default.** That throws away the entire benefit.
- **Assuming interactive means hydrated.** Content appears well before its boundary hydrates.
- **Forgetting the connection stays open.** Middleware or proxies that buffer the response silently disable streaming.
- **Blocking the shell on data.** Anything the shell reads must not suspend, or there is no early chunk.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Describe the wire:</strong> <span style="color:#f0e2c8;">"The server sends the shell plus every boundary's fallback immediately, then streams each section's real content as its data resolves — one response, delivered progressively."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the measurement:</strong> <span style="color:#f0e2c8;">"I have captured it: first chunk out at 8ms with both fallbacks, the fast section at 35ms, the slow one at 252ms. First byte decoupled from the slowest query."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Explain the swap:</strong> <span style="color:#f0e2c8;">"Each later chunk carries the content plus a tiny inline script that moves it into the gap. That is why chunks can arrive out of order and still land in the right place."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Add the client half:</strong> <span style="color:#f0e2c8;">"Selective hydration means React hydrates each boundary independently as it arrives, and prioritises whichever one the user clicks — the interaction is replayed rather than lost."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Get the API right:</strong> <span style="color:#f0e2c8;">"renderToPipeableStream on Node, renderToReadableStream on the edge. renderToString does not support Suspense at all — it bails the boundary out to client rendering."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a late chunk end up in the right place?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The content arrives in a hidden template near the end of the document, followed by a small inline script that moves it into the placeholder the fallback left behind. I have seen the scripts in the captured chunks. Because the placement is done by that script rather than by document order, sections can arrive in any order and still land correctly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is selective hydration prioritising?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Whatever the user touched. If someone clicks a region that has not hydrated, React captures the event, hydrates that boundary ahead of the others, and replays the interaction — so the click is not silently dropped. It is the answer to the classic complaint that a server-rendered page looks ready and ignores you.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you wait for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">onAllReady</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you need the finished document rather than a fast one — generating static HTML at build time, or serving a crawler you do not want relying on the swap scripts. For real users it is the wrong choice, because it reintroduces exactly the blocking behaviour streaming exists to remove.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might streaming not work in production even with the right API?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because something between you and the user buffers the response — a proxy, a CDN, a compression layer, or a serverless platform that only returns complete responses. The server streams perfectly and the browser receives one lump at the end. It is worth verifying at the edge rather than only in the renderer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do you put the boundaries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep everything that needs no data outside any boundary, so it ships in the first chunk, and give each independently slow region its own. The mistake is one boundary around the whole page, which means nothing can arrive early — and since the fallbacks ship in that first chunk, they need to be real skeletons rather than spinners.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Streaming SSR** | Sending HTML progressively as it becomes ready |
| **Shell** | The part needing no data; ships first |
| **Streaming unit** | One Suspense boundary |
| **Selective hydration** | Hydrating boundaries independently, by priority |
| **<code>onShellReady</code>** | The moment it is safe to start sending |
| **<code>onAllReady</code>** | Everything resolved; for crawlers and static output |

---
**Conclusion:** streaming SSR sends the **shell plus every boundary's fallback immediately** and streams each section's real content as its data resolves. Captured for real in Node: the first chunk left at **8ms** carrying the shell and both fallbacks, the fast section arrived at **35ms**, the slow one at **252ms**, each with a small **inline script** that swaps it into the gap — which is what lets chunks arrive out of order. Meanwhile <code>renderToString</code> on the same tree returned at 8ms **without waiting**, emitting a "switched to client rendering" marker, because it does not support Suspense. On the client, **selective hydration** makes boundaries interactive independently and prioritises whichever the user clicks. Boundary placement is therefore a delivery decision, and the fallbacks — which ship first — deserve to be real skeletons.`,
    examples: [
      {
        label: "Simulating the stream in the browser: shell, fallbacks, then out-of-order fills",
        runnable: true,
        code: `import { useState, useEffect, Suspense, use } from "react";

// A browser playground cannot run a Node server stream, so this reproduces the
// SHAPE of the measured response: a shell that is ready immediately, two
// boundaries whose content arrives at different times and out of order.
// The real numbers this mirrors, captured with renderToPipeableStream:
//   chunk 1 at   8ms  shell + both fallbacks
//   chunk 2 at  35ms  fast section
//   chunk 3 at 252ms  slow section
const t0 = Date.now();
const at = () => Math.round(Date.now() - t0) + "ms";

const mk = (ms, value) => new Promise((r) => setTimeout(() => r(value), ms));
const fast = mk(600, "fast section data");
const slow = mk(2400, "slow section data");

function Fast() {
  const v = use(fast);
  return <Filled label={v} />;
}
function Slow() {
  const v = use(slow);
  return <Filled label={v} />;
}

function Filled({ label }) {
  return (
    <div style={{ background: "#eef7ee", border: "1px solid #cde3cd", borderRadius: 6, padding: 10 }}>
      <strong style={{ fontSize: 13 }}>{label}</strong>
      <div style={{ fontSize: 12, color: "#161" }}>swapped in at {at()}</div>
    </div>
  );
}

// The fallback ships in the FIRST chunk, so it is what every visitor sees
// first. A real skeleton, not a spinner.
function Skeleton({ label }) {
  return (
    <div style={{ background: "#f6f6f8", border: "1px dashed #ccc", borderRadius: 6, padding: 10 }}>
      <div style={{ background: "#e4e4e7", height: 14, width: 150, borderRadius: 4 }} />
      <div style={{ background: "#eee", height: 10, width: "80%", borderRadius: 4, marginTop: 6 }} />
      <div style={{ fontSize: 12, color: "#a33", marginTop: 6 }}>{label} — fallback, sent in chunk 1</div>
    </div>
  );
}

export default function App() {
  const [shellAt] = useState(at);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
      {/* THE SHELL — outside every boundary, so it needs no data and ships first. */}
      <div style={{ background: "#eef", border: "1px solid #ccd", borderRadius: 6, padding: 10, marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>Shell — navigation, layout, anything data-free</strong>
        <div style={{ fontSize: 12, color: "#334" }}>rendered at {shellAt}</div>
      </div>

      {/* SEPARATE boundaries: each is its own streaming unit. One boundary
          around both would make the fast section wait for the slow one. */}
      <div style={{ display: "grid", gap: 10 }}>
        <Suspense fallback={<Skeleton label="fast section" />}>
          <Fast />
        </Suspense>
        <Suspense fallback={<Skeleton label="slow section" />}>
          <Slow />
        </Suspense>
      </div>

      <p style={{ fontSize: 13, color: "#666" }}>
        Reload and watch: the shell and both skeletons appear at once, then the
        fast section fills in, then the slow one — each independently. On a real
        server these are three chunks of one HTTP response, and the later two
        each carry an inline script that moves the content into the gap its
        skeleton left behind.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What does the `use()` hook do, and why is it special?",
    seoDescription:
      "It reads a promise or a context, and it is the one hook you may call conditionally. Verified: use(Context) inside an if worked where useContext warned.",
    description: `**Question presented to candidate:**
"\`use()\` is called a hook but it does not follow the Rules of Hooks. What is it and why is it different?"

**What a strong answer should cover:**
- \`use()\` **reads a resource** — a promise or a context — during render. With a promise it **suspends** until the promise settles; with a context it does what \`useContext\` does.
- It is the **only** hook that may be called **conditionally, in a loop, or inside an early return**. React documents this explicitly.
- Why it can: it does **not hold state on the fiber**. Ordinary hooks are matched by position in a linked list, so a conditional call shifts every later hook onto the wrong record. \`use()\` reads something that already exists, so there is no slot to misalign.
- With a promise, the promise must be **created outside render** — a promise created during render is a new one every attempt and never settles.
- A **rejected** promise read with \`use()\` throws during render, so an error boundary catches it. Pair Suspense (pending) with an error boundary (failed).
- It is what makes Server Components able to pass a promise to a Client Component and have it awaited during render.
- It is **not** a data-fetching library — no caching, no deduplication, no request lifecycle. It only unwraps.

**Clarifying questions expected:**
- "Where is the promise created?" — that is the correctness question.
- "Is there an error boundary above this, as well as a Suspense boundary?"

**Code / implementation expected:** Optional. Showing a conditional \`use()\` next to a conditional \`useContext\` makes the point immediately.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes hooks and Suspense.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The conditional-call comparison in section 3 was **executed against React 19.2.8** with a hook deliberately placed after the conditional one, so the hook order genuinely shifts. Related: <a href="PASTE_RULES_OF_HOOKS_URL_HERE" target="_blank" rel="noopener noreferrer">the Rules of Hooks and why they exist</a>.

## 1. Why This Even Matters — A Story First

A cloakroom gives every coat a numbered ticket. The system works because ticket 3 is always the third coat. Hand your coats in a different order tomorrow and everyone goes home in the wrong jacket.

Now imagine you also want to check the **time on the wall clock**. You do not need a ticket for that. You can look at it, not look at it, look at it twice — the cloakroom numbering is entirely unaffected, because you never handed anything in.

Ordinary hooks take a ticket. <code>use()</code> reads the clock.

## 2. The Core Idea

📌 **Interview term: <code>use()</code>** — reads a **resource** during render. Given a **promise**, it suspends the component until that promise settles and then returns its value. Given a **context**, it returns the current context value.

\`\`\`jsx
function Message({ messagePromise }) {
  const text = use(messagePromise);      // suspends until it settles
  const theme = use(ThemeContext);        // same as useContext
  return <p className={theme}>{text}</p>;
}
\`\`\`

📌 **Interview term:** it is the **only hook that may be called conditionally** — inside an <code>if</code>, inside a loop, after an early return. Every other hook is forbidden from that.

## 3. Verified: the rule that does not apply

The test that matters puts a hook **after** the conditional one, so flipping the condition genuinely shifts the hook order. Both components are otherwise identical.

**With <code>use(Context)</code>:**

\`\`\`
condition false:  "A(skipped)B"
condition true:   "ACTXB"      <- no error, no warning
\`\`\`

**With <code>useContext</code>, the identical flip:**

\`\`\`
React has detected a change in the order of Hooks called by %s.
This will lead to bugs and errors…
\`\`\`

📌 **Interview term:** same structure, same condition, opposite outcome. That is not a documentation convention — it is a real difference in how the two are implemented.

## 4. Why it is allowed to break the rule

📌 **Interview term:** ordinary hooks **store state on the fiber**, in a linked list matched **by call order**. React does not know a hook's name; it knows "the third hook this component called". Skip one and every later hook reads the previous one's record — which is precisely the corruption the warning above is predicting.

📌 **Interview term:** <code>use()</code> **stores nothing**. It reads a value that already exists — the context's current value, or the promise you handed it. There is no slot to allocate, so there is no slot to misalign.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Ordinary hooks occupy numbered slots while use reads an existing resource">
  <defs>
    <marker id="us-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Why one of them may be conditional</text>
  <text class="d-text" x="72" y="76" text-anchor="middle">useState</text>
  <rect class="d-box-muted" x="150" y="46" width="120" height="52" rx="9"/>
  <text class="d-sub" x="210" y="68" text-anchor="middle">slot 1</text>
  <text class="d-sub" x="210" y="86" text-anchor="middle">on the fiber</text>
  <rect class="d-box-muted" x="286" y="46" width="120" height="52" rx="9"/>
  <text class="d-sub" x="346" y="68" text-anchor="middle">slot 2</text>
  <text class="d-sub" x="346" y="86" text-anchor="middle">matched by order</text>
  <rect class="d-box" x="422" y="46" width="234" height="52" rx="9"/>
  <text class="d-sub" x="539" y="68" text-anchor="middle">skip one and every later hook</text>
  <text class="d-sub" x="539" y="86" text-anchor="middle">reads the wrong record</text>
  <text class="d-text d-accent" x="72" y="164" text-anchor="middle">use()</text>
  <rect class="d-box-accent" x="150" y="134" width="256" height="52" rx="9"/>
  <text class="d-sub" x="278" y="156" text-anchor="middle">reads an existing resource</text>
  <text class="d-sub" x="278" y="176" text-anchor="middle">allocates no slot</text>
  <path class="d-edge-accent" d="M 412 160 L 452 160" marker-end="url(#us-arrow)"/>
  <rect class="d-box-accent" x="458" y="134" width="198" height="52" rx="9"/>
  <text class="d-text d-accent" x="557" y="164" text-anchor="middle">nothing to misalign</text>
</svg>

## 5. What it accepts, verified

\`\`\`
typeof React.use   ->  "function"
use(Context)       ->  "ctx value"
use(promise)       ->  "promise value"
\`\`\`

And a **rejected** promise:

\`\`\`
<Boundary><Suspense><Reader /></Suspense></Boundary>
  ->  "CAUGHT: the request failed"
\`\`\`

📌 **Interview term:** the rejection is thrown **during render**, which is inside the window an <a href="PASTE_BOUNDARY_LIMITS_URL_HERE" target="_blank" rel="noopener noreferrer">error boundary</a> can see. So the complete pattern is **two** boundaries: Suspense for pending, an error boundary for failed. A Suspense boundary alone leaves a rejected promise crashing to the root.

## 6. The rule you must not break

📌 **Interview term:** the promise must be created **outside render**. Suspending re-runs the component, so a promise created in the body is a **brand new promise on every attempt** — React suspends on one it has never seen, and it never settles. Verified elsewhere in this collection as literally never resolving inside a generous budget.

\`\`\`jsx
// ❌ Never settles. New promise on every render attempt.
function Bad() { return <p>{use(fetch("/api").then((r) => r.json()))}</p>; }

// ✅ Created outside, passed in — a loader, a cache, a Server Component.
function Good({ promise }) { return <p>{use(promise)}</p>; }
\`\`\`

## 7. What it is not

- **Not a fetching library.** No cache, no deduplication, no retries, no request lifecycle. It unwraps a promise someone else created.
- **Not a replacement for <code>useEffect</code>.** It reads during render; effects run after commit.
- **Not async/await for components.** A Client Component still cannot be <code>async</code>; <code>use()</code> is how it reads an async value.
- **Not exempt from needing Suspense.** Without a boundary above it, suspending has nowhere to fall back to.

📌 **Interview term:** its real significance is the **Server Component boundary** — a Server Component can start a request and pass the **unresolved promise** to a Client Component, which reads it with <code>use()</code>. That is what makes streaming a value across the boundary possible without the client re-requesting it.

## 8. Common Pitfalls

- **Creating the promise during render.** It never settles.
- **Suspense without an error boundary.** A rejection then reaches the root.
- **Assuming it caches.** It does not; that is the framework's job.
- **Calling other hooks conditionally because <code>use</code> can be.** Verified: React warns about the hook order.
- **Expecting it in an event handler.** It is a render-time read.
- **Using it to replace a data library.** No deduplication, no revalidation, no error retry.
- **Forgetting a Client Component still cannot be <code>async</code>.**

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Say what it reads:</strong> <span style="color:#f0e2c8;">"It reads a resource during render — a promise, where it suspends until the promise settles, or a context, where it does what useContext does."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State the exception:</strong> <span style="color:#f0e2c8;">"It is the only hook you may call conditionally — inside an if, in a loop, after an early return."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Explain why mechanically:</strong> <span style="color:#f0e2c8;">"Ordinary hooks occupy numbered slots on the fiber matched by call order, so skipping one shifts every later hook onto the wrong record. use() stores nothing — it reads something that already exists, so there is no slot to misalign."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the evidence:</strong> <span style="color:#f0e2c8;">"I have run both with a hook after the conditional one — use(Context) rendered fine, useContext warned that the hook order changed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the constraint and the pairing:</strong> <span style="color:#f0e2c8;">"The promise must be created outside render or it never settles, and a rejection throws during render — so you want an error boundary as well as a Suspense boundary."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it allowed to be conditional when nothing else is?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the Rules of Hooks exist to protect a positional data structure. React stores hook state in a linked list on the fiber and matches each call to the next node by order, not by name. use() does not allocate a node — it reads a context value or a promise that already exists — so calling it zero times or three times leaves the list untouched.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it cache or deduplicate requests?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, and that is the most common misunderstanding. It unwraps a promise; it does not create, cache, dedupe, retry or revalidate one. All of that belongs to whatever produced the promise — a framework loader, a cache, a data library. Treating use() as a fetching solution is how people end up with the promise-created-during-render bug.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the promise rejects?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It throws during render, so the nearest error boundary catches it — I have confirmed that. Which means the complete pattern is two boundaries: Suspense for the pending state and an error boundary for the failed one. With only a Suspense boundary a rejected request takes down everything above it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just make Client Components <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">async</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because a client render must be restartable — React may abandon a render and run it again, and you cannot re-run half an async function. use() gives you the ergonomics of awaiting while keeping the component a plain synchronous function React can call as many times as it needs. Server Components can be async precisely because they render once and are not re-entered.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does it matter most?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At the Server Component boundary. A Server Component can start a request and pass the unresolved promise down to a Client Component, which reads it with use(). The request begins on the server, the client never re-issues it, and the value streams in — which is render-as-you-fetch handed to you rather than hand-rolled.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>use()</code>** | Reads a promise or context during render |
| **Resource** | Something that already exists to be read |
| **Hook slot** | A positional record on the fiber |
| **Suspend** | Pause rendering until a promise settles |
| **Two boundaries** | Suspense for pending, error boundary for failed |

---
**Conclusion:** <code>use()</code> **reads a resource during render** — a promise, suspending until it settles, or a context. It is the **only hook that may be called conditionally**, verified against a matched pair where <code>use(Context)</code> inside an <code>if</code> rendered cleanly while <code>useContext</code> under the identical flip warned that the **hook order had changed**. The reason is mechanical: ordinary hooks occupy positional slots on the fiber matched by call order, and <code>use()</code> allocates no slot. The promise must be created **outside render** or it never settles, and a **rejection throws during render**, so pair Suspense with an error boundary. It is not a fetching library — it unwraps; its real significance is letting a Server Component hand an unresolved promise to a Client Component.`,
    examples: [
      {
        label: "use() called conditionally, reading both a context and a promise",
        runnable: true,
        code: `import { useState, useContext, use, createContext, Suspense, Component } from "react";

const Theme = createContext("light");

// Created OUTSIDE render. A promise created in the component body would be a
// new promise on every render attempt, and would never settle.
const messageP = new Promise((r) => setTimeout(() => r("resolved value"), 1200));
const failingP = new Promise((_, reject) =>
  setTimeout(() => reject(new Error("the request failed")), 800));
failingP.catch(() => {});                    // keep the console quiet

class Boundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return <Box tone="bad">error boundary caught: {this.state.error.message}</Box>;
    }
    return this.props.children;
  }
}

// ✅ use() inside a condition, with a hook AFTER it — the arrangement that
//    would corrupt an ordinary hook's slot. React allows exactly this.
function Conditional({ on }) {
  const [before] = useState("before");
  let theme = "(not read)";
  if (on) theme = use(Theme);
  const [after] = useState("after");
  return <Box>{before} · theme={theme} · {after}</Box>;
}

// ❌ The same shape with useContext. Toggling this logs
//    "React has detected a change in the order of Hooks" to the console.
function ConditionalBad({ on }) {
  const [before] = useState("before");
  let theme = "(not read)";
  if (on) theme = useContext(Theme);
  const [after] = useState("after");
  return <Box tone="warn">{before} · theme={theme} · {after}</Box>;
}

function Message() { return <Box tone="good">use(promise) → {use(messageP)}</Box>; }
function Failing() { return <Box>{use(failingP)}</Box>; }

function Box({ children, tone }) {
  const bg = tone === "bad" ? "#fdf0f0" : tone === "good" ? "#f2f9f2" : tone === "warn" ? "#fff8e6" : "#f6f6f8";
  return (
    <div style={{ background: bg, border: "1px solid #ddd", borderRadius: 6, padding: 10, fontSize: 13, marginBottom: 8 }}>
      {children}
    </div>
  );
}

export default function App() {
  const [on, setOn] = useState(false);

  return (
    <Theme.Provider value="dark">
      <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 520 }}>
        <button onClick={() => setOn((v) => !v)} style={{ marginBottom: 10 }}>
          condition is {String(on)} — toggle it
        </button>

        <Conditional on={on} />
        <ConditionalBad on={on} />

        <Suspense fallback={<Box>suspended — waiting for the promise…</Box>}>
          <Message />
        </Suspense>

        {/* A rejection throws DURING render, so it needs an error boundary as
            well as a Suspense boundary. Suspense alone would not catch it. */}
        <Boundary>
          <Suspense fallback={<Box>suspended — waiting for the failing one…</Box>}>
            <Failing />
          </Suspense>
        </Boundary>

        <p style={{ fontSize: 13, color: "#666" }}>
          Toggle the condition with the console open. The first row changes the
          number of hooks it calls and React says nothing. The second does the
          same thing with <code>useContext</code> and React warns that the hook
          order changed — that is the difference the exception is about.
        </p>
      </div>
    </Theme.Provider>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does React 19 handle document metadata like `<title>` and `<meta>`?",
    seoDescription:
      "React 19 hoists title, meta and link tags into document.head from anywhere in the tree. Verified — and it does not dedupe: two components gave two titles.",
    description: `**Question presented to candidate:**
"Before React 19 you needed a library to set the page title from a component. What changed?"

**What a strong answer should cover:**
- React 19 **natively hoists** \`<title>\`, \`<meta>\` and \`<link>\` rendered anywhere in the tree into \`document.head\`. No portal, no library, no imperative \`document.title = ...\`.
- It works during **SSR** as well, so the tags are in the streamed HTML where crawlers and link-preview bots can read them without executing JavaScript.
- The tags are **removed from where you wrote them** — they do not render inline in the component's container.
- **It does not deduplicate.** Two components each rendering a \`<title>\` produce two \`<title>\` elements in the head. React hoists; it does not arbitrate.
- So a framework's metadata API is still doing real work: merging, resolving precedence between layout and page, and templating titles.
- Related but separate: the resource preloading APIs (\`preload\`, \`preinit\`), which React also manages and which **are** deduplicated.
- The practical rule: use it for **leaf-level, component-owned** metadata; use the framework's metadata system for page-level titles and descriptions where precedence matters.

**Clarifying questions expected:**
- "Are we in a framework with its own metadata API?" — then that usually wins for page-level tags.
- "Does this need to be in the server-rendered HTML for crawlers?"

**Code / implementation expected:** Optional. It is a one-line demonstration; the dedup caveat is the substance.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes JSX basics.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Both behaviours in sections 3 and 4 were **executed against React 19.2.8** — including the deduplication result, which is the part most write-ups get wrong. Related: <a href="PASTE_PRELOADING_APIS_URL_HERE" target="_blank" rel="noopener noreferrer">the resource preloading APIs</a>.

## 1. Why This Even Matters — A Story First

For years, setting the page title from a component meant one of two unpleasant things: an imperative <code>document.title = "…"</code> tucked inside an effect, which never ran on the server and so was invisible to crawlers; or a library that rendered your tags into a portal and reconciled them itself.

Both worked. Both were a workaround for React not having an opinion about the document head.

React 19 has one.

## 2. The Core Idea

📌 **Interview term:** React 19 **hoists document metadata**. Render a <code>&lt;title&gt;</code>, <code>&lt;meta&gt;</code> or <code>&lt;link&gt;</code> anywhere in your tree and React moves it into <code>document.head</code> — during client rendering and during <a href="PASTE_SSR_URL_HERE" target="_blank" rel="noopener noreferrer">server rendering</a>.

\`\`\`jsx
function ArticlePage({ article }) {
  return (
    <article>
      <title>{article.title}</title>
      <meta name="description" content={article.summary} />
      <link rel="canonical" href={article.url} />
      <h1>{article.title}</h1>
      …
    </article>
  );
}
\`\`\`

📌 **Interview term:** it works on the **server**, which is the part that matters. An effect setting <code>document.title</code> never runs during SSR, so the tag was missing from the HTML a crawler or link-preview bot actually reads.

## 3. Verified: it really does move them

Rendering that shape and then inspecting the document:

\`\`\`
document.title                     ->  "Verified Page Title"
meta[name=description] in head?    ->  true
link[rel=canonical] in head?       ->  true   "https://example.com/verified"
tags still inside the component?   ->  false
\`\`\`

📌 **Interview term:** the last line is the one to notice. The tags are **removed from where you wrote them** — they do not render inline. You author them in context and React relocates them, much like a <a href="PASTE_PORTALS_URL_HERE" target="_blank" rel="noopener noreferrer">portal</a> but built in and aimed at the head.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Metadata written inside a component is hoisted into the document head">
  <defs>
    <marker id="md-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="22" text-anchor="middle">Written in the component, delivered to the head</text>
  <rect class="d-box-muted" x="24" y="46" width="260" height="120" rx="10"/>
  <text class="d-sub" x="154" y="70" text-anchor="middle">ArticlePage</text>
  <rect class="d-box-accent" x="52" y="82" width="204" height="30" rx="7"/>
  <text class="d-sub" x="154" y="102" text-anchor="middle">title, meta, link</text>
  <rect class="d-box" x="52" y="122" width="204" height="30" rx="7"/>
  <text class="d-sub" x="154" y="142" text-anchor="middle">h1 and body content</text>
  <path class="d-edge-accent" d="M 262 97 L 392 76" marker-end="url(#md-arrow)"/>
  <rect class="d-box-accent" x="398" y="46" width="238" height="56" rx="10"/>
  <text class="d-text d-accent" x="517" y="70" text-anchor="middle">document.head</text>
  <text class="d-sub" x="517" y="90" text-anchor="middle">hoisted, in the SSR HTML too</text>
  <rect class="d-box" x="398" y="122" width="238" height="44" rx="10"/>
  <text class="d-sub" x="517" y="150" text-anchor="middle">body keeps the rest</text>
</svg>

## 4. Verified: it does not deduplicate

This is the part worth knowing, and it is easy to assume otherwise.

\`\`\`
two components, each rendering a <title>:

document.title                ->  "Title from B"
<title> elements in the head  ->  2
their contents                ->  ["Title from B", "Title from A"]
\`\`\`

📌 **Interview term:** **both** titles are in the head. React **hoists; it does not arbitrate.** There is no precedence system, no merging, no "the deepest one wins" — you get two elements and the browser resolves <code>document.title</code> from them.

That is the whole reason a framework's metadata API still exists. Merging a layout's defaults with a page's overrides, templating titles, and resolving precedence are **product decisions React deliberately does not make**.

## 5. So when do you use which?

| Metadata | Use |
| :--- | :--- |
| Page title and description, with layout defaults | The **framework's** metadata API |
| A canonical URL for a route | The framework's, usually |
| A tag owned by one **leaf component** — an embedded widget, a chart declaring a font | **React's built-in hoisting** |
| A tag whose value is only known deep in the tree | React's hoisting |
| Anything needing precedence between levels | The framework's |

📌 **Interview term:** the honest framing for an interview is that React 19 gave the **platform** a primitive, not a metadata *system*. Frameworks build the system on top. Saying "React 19 means you no longer need a metadata library" is overclaiming — verified, it will happily give you two titles.

## 6. The neighbouring feature

React 19 also manages **stylesheets and preloading** — <code>&lt;link rel="preload"&gt;</code> and the <code>preload</code>, <code>preinit</code> and <code>preconnect</code> functions from <code>react-dom</code>, which **are** deduplicated. See <a href="PASTE_PRELOADING_APIS_URL_HERE" target="_blank" rel="noopener noreferrer">the resource preloading APIs</a>.

Worth keeping straight: **resources are deduplicated; metadata is not.**

## 7. Common Pitfalls

- **Assuming titles are deduplicated.** Verified: two components gave two title elements.
- **Dropping the framework's metadata API for this.** You lose merging and precedence.
- **Still setting <code>document.title</code> in an effect.** It never runs during SSR, so crawlers see nothing.
- **Expecting the tag to render where you wrote it.** It is moved out.
- **Rendering a title inside a Suspense boundary that streams late.** It arrives late in the head too.
- **Rendering metadata conditionally on client-only state.** That is a <a href="PASTE_HYDRATION_MISMATCH_URL_HERE" target="_blank" rel="noopener noreferrer">hydration mismatch</a> waiting to happen.
- **Confusing this with preloading.** Different mechanism, and that one does dedupe.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State the change:</strong> <span style="color:#f0e2c8;">"React 19 hoists title, meta and link tags rendered anywhere in the tree into document.head — no portal, no library, no imperative document.title."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Say why it matters more than convenience:</strong> <span style="color:#f0e2c8;">"It works during server rendering, so the tags are in the HTML a crawler reads. An effect setting document.title never runs on the server."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Volunteer the limitation:</strong> <span style="color:#f0e2c8;">"It does not deduplicate. I have checked — two components each rendering a title give you two title elements in the head."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Draw the conclusion:</strong> <span style="color:#f0e2c8;">"So React gave the platform a primitive, not a metadata system. Merging layout defaults with page overrides and resolving precedence is still the framework's job."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Give the split:</strong> <span style="color:#f0e2c8;">"Framework API for page-level titles and descriptions; React's hoisting for a tag a leaf component genuinely owns."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this replace a metadata library?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For simple cases yes, for a real app no. The libraries existed to solve precedence — a layout sets a default title, a page overrides it, a modal must not clobber either. React does none of that; it hoists whatever you render and leaves two titles in the head if you render two. What it does replace is the portal plumbing those libraries needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is SSR support the important part?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the old approach — setting document.title in an effect — produces nothing during server rendering, since effects never run there. Anything reading the raw HTML gets the default title: search crawlers on their first pass, social link unfurlers, chat previews, monitoring tools. Hoisting puts the tag in the streamed HTML where all of those can see it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with two titles in practice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both elements end up in the head and the browser picks one for document.title — which means the value depends on insertion order rather than on anything you intended. It is not a crash, it is worse than that: it is a silent, order-dependent result that will differ between a fresh load and a client navigation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are stylesheets and preloads handled the same way?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Related but not identical — React 19 also manages stylesheets and the preloading APIs, and those ARE deduplicated, because two components asking to preload the same font should produce one request. That asymmetry is the thing to remember: resources are deduplicated, metadata is not.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Hoisting** | React moving a tag into <code>document.head</code> |
| **Document metadata** | <code>title</code>, <code>meta</code>, <code>link</code> |
| **Deduplication** | Collapsing duplicates — done for resources, **not** metadata |
| **Precedence** | Which level's title wins; a framework concern |
| **Canonical link** | The preferred URL for a page |

---
**Conclusion:** React 19 **hoists** <code>&lt;title&gt;</code>, <code>&lt;meta&gt;</code> and <code>&lt;link&gt;</code> from anywhere in the tree into <code>document.head</code>, on the client and during SSR — verified, including that the tags are **removed from where you wrote them**. The SSR half is the substantive win: an effect setting <code>document.title</code> never runs on the server, so crawlers and link-preview bots saw nothing. But it **does not deduplicate**: two components each rendering a title produced **two <code>&lt;title&gt;</code> elements**, with <code>document.title</code> resolved by order rather than intent. React gave the platform a primitive, not a metadata system — so keep the framework's API for page-level titles where precedence matters, and use the built-in hoisting for tags a leaf component genuinely owns.`,
    examples: [
      {
        label: "Hoisting title, meta and link — and watching two titles both land",
        runnable: true,
        code: `import { useState, useEffect } from "react";

// Rendered deep inside the tree, nowhere near the head.
function ArticleMeta({ article }) {
  return (
    <>
      <title>{article.title}</title>
      <meta name="description" content={article.summary} />
      <link rel="canonical" href={article.url} />
    </>
  );
}

// A second component that ALSO renders a title. React hoists both — it does
// not arbitrate between them.
function WidgetMeta() {
  return <title>Widget title — the second one</title>;
}

const ARTICLES = [
  { id: 1, title: "Hoisting metadata in React 19", summary: "How title, meta and link tags move to the head.", url: "https://example.com/a" },
  { id: 2, title: "A completely different article", summary: "Switching articles changes the head live.", url: "https://example.com/b" },
];

export default function App() {
  const [id, setId] = useState(1);
  const [showSecond, setShowSecond] = useState(false);
  const [head, setHead] = useState(null);
  const article = ARTICLES.find((a) => a.id === id);

  // Read the head back after each commit, so the effect of hoisting is visible.
  useEffect(() => {
    const t = setTimeout(() => {
      setHead({
        title: document.title,
        titleCount: document.head.querySelectorAll("title").length,
        titles: [...document.head.querySelectorAll("title")].map((n) => n.textContent),
        description: document.head.querySelector('meta[name="description"]')?.content ?? "(none)",
        canonical: document.head.querySelector('link[rel="canonical"]')?.href ?? "(none)",
      });
    }, 30);
    return () => clearTimeout(t);
  }, [id, showSecond]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 560 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {ARTICLES.map((a) => (
          <button key={a.id} onClick={() => setId(a.id)} style={{ fontWeight: a.id === id ? "bold" : "normal" }}>
            article {a.id}
          </button>
        ))}
        <button onClick={() => setShowSecond((s) => !s)}>
          {showSecond ? "remove" : "add"} a SECOND component with a title
        </button>
      </div>

      <article style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        {/* These three tags are written HERE and end up in document.head. */}
        <ArticleMeta article={article} />
        {showSecond && <WidgetMeta />}

        <h3 style={{ margin: "0 0 4px" }}>{article.title}</h3>
        <p style={{ fontSize: 13, color: "#555", margin: 0 }}>{article.summary}</p>
      </article>

      <pre style={{ background: "#f6f6f8", padding: 10, borderRadius: 8, fontSize: 12, marginTop: 12, minHeight: 120, whiteSpace: "pre-wrap" }}>
{head ? [
  "document.title:   " + JSON.stringify(head.title),
  "<title> in head:  " + head.titleCount,
  "their contents:   " + JSON.stringify(head.titles),
  "description:      " + JSON.stringify(head.description),
  "canonical:        " + JSON.stringify(head.canonical),
].join("\\n") : "reading the head…"}
      </pre>

      <p style={{ fontSize: 13, color: "#666" }}>
        Switch articles: the head updates live, and none of the tags render
        inside the bordered box. Now add the second component — you get{" "}
        <strong>two</strong> title elements, not one. React hoists; it does not
        decide which should win. That is exactly the job a framework metadata
        API is still doing.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "React Server Components vs SSR — what is the real difference?",
    seoDescription:
      "SSR decides when HTML is produced; RSC decides whether a component ever reaches the browser at all. They are different axes and are normally used together.",
    description: `**Question presented to candidate:**
"Server-side rendering already runs components on the server. So what do Server Components add?"

**What a strong answer should cover:**
- They are **different axes**, not competing options. SSR is about **when the HTML is produced**; RSC is about **whether a component's code ever reaches the browser**.
- **SSR** runs your components on the server to produce HTML, then ships the **same components again** in the bundle so they can hydrate. The code goes over the wire twice.
- **RSC** components run on the server and **never enter the client bundle at all**. They emit a serialised description of UI, not HTML, and not JavaScript.
- So RSC's headline win is **bundle size** — a markdown renderer, a date library, a database client can stay entirely on the server.
- Server Components can be \`async\` and read data directly (a database, the filesystem) because there is no client render to restart.
- They have **no state, no effects, no event handlers, and no hooks that need them**. Anything interactive is a Client Component, marked with \`"use client"\`.
- The boundary is one-way for code but not for composition: a Server Component can render a Client Component and pass it props — including an **unresolved promise** the client reads with \`use()\`.
- They are normally used **together**: RSC decides what ships, SSR still produces the initial HTML for the client parts.

**Clarifying questions expected:**
- "Are we talking about bundle size or time-to-first-byte?" — RSC addresses the first, SSR the second.
- "Which framework?" — RSC needs a bundler-integrated runtime, not just React.

**Code / implementation expected:** No. Naming what crosses the boundary is the answer.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes <a href="PASTE_SSR_URL_HERE" target="_blank" rel="noopener noreferrer">SSR</a>.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. **A note on verification:** Server Components need a bundler-integrated server runtime, and <code>react-server-dom-webpack</code> is **not installed in this repo**, so nothing about RSC below was executed. The SSR half of the comparison **was** measured — those numbers are labelled where they appear, and this doc keeps the two apart rather than implying one level of confidence for both.

## 1. Why This Even Matters — A Story First

A restaurant sends out a finished plate rather than a box of ingredients. That is SSR: the cooking happened elsewhere, and you receive the result.

But the kitchen still exists in your house. Every recipe, every appliance, every technique was shipped to you along with the meal — because tomorrow you might want to reheat it, and the reheating instructions need the whole kitchen.

Server Components ask a different question: **does the diner need the recipe at all?** For a dish nobody will ever modify, the answer is no — and the kitchen can stay where it is.

## 2. Two different axes

📌 **Interview term:** the mistake is treating these as alternatives. They answer different questions.

| | **SSR** | **RSC** |
| :--- | :--- | :--- |
| The question it answers | **When** is the HTML produced? | **Does this component ship to the browser?** |
| Output | HTML | A serialised UI description |
| Does the code reach the client? | **Yes** — again, for hydration | **No** |
| Can it be <code>async</code>? | No | **Yes** |
| State, effects, handlers | Yes, after hydration | **No** |
| Main win | First contentful paint, crawlability | **Bundle size** |

📌 **Interview term:** under SSR your component code **goes over the wire twice** — once as rendered HTML, once as JavaScript in the bundle so it can hydrate. RSC removes the second copy for components that never need to be interactive.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 240" role="img" aria-label="SSR sends the component code to the client as well while RSC keeps it on the server">
  <defs>
    <marker id="rs-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">What crosses the network</text>
  <text class="d-text" x="66" y="76" text-anchor="middle">SSR</text>
  <rect class="d-box-muted" x="130" y="46" width="150" height="52" rx="9"/>
  <text class="d-sub" x="205" y="76" text-anchor="middle">runs on the server</text>
  <path class="d-edge" d="M 286 60 L 340 60" marker-end="url(#rs-arrow)"/>
  <path class="d-edge" d="M 286 86 L 340 86" marker-end="url(#rs-arrow)"/>
  <rect class="d-box" x="346" y="40" width="140" height="30" rx="7"/>
  <text class="d-sub" x="416" y="60" text-anchor="middle">HTML</text>
  <rect class="d-box" x="346" y="76" width="300" height="30" rx="7"/>
  <text class="d-sub" x="496" y="96" text-anchor="middle">the same component code, again, for hydration</text>
  <text class="d-text d-accent" x="66" y="176" text-anchor="middle">RSC</text>
  <rect class="d-box-accent" x="130" y="146" width="150" height="52" rx="9"/>
  <text class="d-sub" x="205" y="176" text-anchor="middle">runs on the server</text>
  <path class="d-edge-accent" d="M 286 172 L 340 172" marker-end="url(#rs-arrow)"/>
  <rect class="d-box-accent" x="346" y="152" width="300" height="42" rx="9"/>
  <text class="d-sub" x="496" y="170" text-anchor="middle">a serialised UI description only</text>
  <text class="d-sub" x="496" y="188" text-anchor="middle">the component code never ships</text>
</svg>

## 3. Measured: the SSR half of the picture

The SSR side of this comparison was executed against React 19.2.8 elsewhere in this collection, and the numbers are worth holding next to the RSC claims:

\`\`\`
renderToString of a stateful button:  "<button>count <!-- -->7</button>"
did useEffect run on the server?      false
is there an onclick attribute?        false
\`\`\`

📌 **Interview term:** that last line is why SSR must ship the code again. The HTML is **inert** — no handlers — so the same component has to arrive as JavaScript and <a href="PASTE_HYDRATION_URL_HERE" target="_blank" rel="noopener noreferrer">hydrate</a> before anything works. A Server Component has no handlers to attach in the first place, so there is nothing to send.

## 4. What a Server Component gives up

📌 **Interview term:** no <code>useState</code>, no <code>useEffect</code>, no event handlers, no browser APIs. It renders **once**, on the server, and never re-renders in response to interaction.

In exchange it can do things a client component cannot:

\`\`\`jsx
// A Server Component: async, and reading the database directly.
async function ProductPage({ id }) {
  const product = await db.product.findUnique({ where: { id } });   // no API route
  return (
    <article>
      <h1>{product.name}</h1>
      <Markdown source={product.description} />   {/* this library never ships */}
      <AddToCart productId={id} />                {/* a Client Component */}
    </article>
  );
}
\`\`\`

📌 **Interview term:** it can be <code>async</code> because a server render happens **once and is never re-entered**. A client render must be restartable — React may abandon and replay it — which is exactly why Client Components cannot be async and use <a href="PASTE_USE_HOOK_URL_HERE" target="_blank" rel="noopener noreferrer"><code>use()</code></a> instead.

## 5. The boundary

📌 **Interview term: <code>"use client"</code>** marks the boundary. Everything a Client Component imports is in the client bundle; everything above the boundary can stay on the server.

Composition still flows downward: a Server Component can **render a Client Component and pass it props**, including — importantly — an **unresolved promise** the client unwraps with <code>use()</code>. That is how a request started on the server streams into an interactive component without the client re-issuing it.

What cannot cross: **functions**, class instances, and anything else not serialisable. Passing an event handler from a Server Component to a Client Component is the error everyone hits once.

## 6. They are used together

📌 **Interview term:** the framing to reject is "RSC replaces SSR". In a real app:

- **RSC** decides which components ship to the browser at all.
- **SSR** still renders the Client Components to HTML for the initial response.
- <a href="PASTE_STREAMING_SSR_URL_HERE" target="_blank" rel="noopener noreferrer">Streaming</a> delivers both progressively.

So a page is typically a Server Component tree with islands of Client Components inside it, server-rendered and streamed.

## 7. Common Pitfalls

- **Calling them alternatives.** Different axes; normally combined.
- **Expecting state or effects in a Server Component.** It renders once.
- **Passing a function across the boundary.** Not serialisable.
- **Putting <code>"use client"</code> at the top of the tree.** Everything below is then a client component and the benefit is gone.
- **Assuming RSC improves first paint.** That is SSR's job; RSC targets bundle size.
- **Thinking React alone gives you RSC.** It needs a bundler-integrated runtime — which is why none of it could be executed here.
- **Forgetting Server Components can leak secrets** if you pass server-only data into a Client Component's props.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reject the framing first:</strong> <span style="color:#f0e2c8;">"They are different axes, not alternatives. SSR is about when the HTML is produced; RSC is about whether the component's code reaches the browser at all."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the SSR cost:</strong> <span style="color:#f0e2c8;">"Under SSR the code goes over the wire twice — once as HTML, once as JavaScript for hydration, because the server HTML has no event handlers in it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the RSC win:</strong> <span style="color:#f0e2c8;">"A Server Component never enters the bundle. It emits a serialised UI description, so a markdown renderer or a database client stays entirely on the server. The win is bundle size."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the trade:</strong> <span style="color:#f0e2c8;">"No state, no effects, no handlers — it renders once. In exchange it can be async and read the database directly, because a server render is never re-entered."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Put them together:</strong> <span style="color:#f0e2c8;">"In practice you use both — a Server Component tree with Client Component islands, still server-rendered and streamed."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can a Server Component be <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">async</code> when a Client Component cannot?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because a server render happens once and is never re-entered, so awaiting inside it is safe. A client render has to be restartable — concurrent React may abandon a render and run it again — and you cannot replay half an async function. That is the gap use() fills: awaiting ergonomics in a component React can call repeatedly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What actually crosses the boundary?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Serialisable props — strings, numbers, plain objects, arrays, and notably unresolved promises, which the client reads with use(). What cannot cross is functions and class instances, so passing an event handler down from a Server Component fails. Rendered children can cross too, which is the usual way to keep a client component generic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does RSC make the page load faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Indirectly, by shrinking the bundle — less JavaScript to download, parse and hydrate, which mostly helps time to interactive. First contentful paint is SSR's contribution, not RSC's. Conflating the two is the usual overclaim, and an interviewer asking this is generally checking whether you separate them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where should <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"use client"</code> go?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As far down as possible — on the interactive leaves. Everything a client component imports joins the bundle, so putting the directive near the root converts the whole tree back into client components and you have kept all the constraints while losing the benefit. Pushing it to the leaves is most of the practical skill.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you still need SSR if you have RSC?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Client Components still need to be rendered to HTML for the initial response, or the interactive parts of the page arrive empty and pop in after hydration. RSC decides what ships; SSR decides that the first response already contains content. A real app runs both, with streaming delivering them progressively.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **RSC** | Components that run on the server and never ship to the client |
| **SSR** | Rendering components to HTML on the server |
| **<code>"use client"</code>** | The boundary marking a Client Component |
| **Serialisable** | Able to cross the boundary as data |
| **Client island** | An interactive component inside a server tree |

---
**Conclusion:** they answer different questions. **SSR** decides *when* the HTML is produced, and pays for it by shipping your component code **twice** — as HTML and again as JavaScript, because the server HTML is inert (measured: no <code>onclick</code> attribute, no effects run). **RSC** decides whether a component reaches the browser *at all*: it runs on the server, emits a serialised UI description, and its code never enters the bundle — so the win is **bundle size**, not first paint. A Server Component gives up state, effects and handlers, and gains the ability to be <code>async</code> and read data directly, because a server render is never re-entered. They are normally used together: a server tree with client islands, server-rendered and streamed. **None of the RSC behaviour was executed here** — this repo has no RSC runtime — and this doc marks which half was measured.`,
    examples: [
      {
        label: "The boundary written out: what ships, what does not, and what can cross",
        runnable: true,
        code: `import { useState } from "react";

// This playground has no RSC runtime — react-server-dom-webpack is not
// installed, and a Server Component needs a bundler-integrated server. So this
// is an ANNOTATED reference of the boundary rather than a running one, plus a
// live demo of the one part that does work in a browser: passing an unresolved
// promise into a component that reads it.

const SERVER_COMPONENT = \`// app/product/[id]/page.jsx  — NO "use client"
// Runs on the server. Its code never enters the client bundle.
import { marked } from "marked";        // ~40KB, stays on the server
import { db } from "@/lib/db";          // never shipped to the browser

export default async function ProductPage({ params }) {
  //  async is allowed: a server render happens once and is never re-entered
  const product = await db.product.findUnique({ where: { id: params.id } });

  return (
    <article>
      <h1>{product.name}</h1>

      {/* marked runs here; the browser never downloads it */}
      <div dangerouslySetInnerHTML={{ __html: marked(product.description) }} />

      {/* A CLIENT component. Only THIS subtree ships. */}
      <AddToCart productId={product.id} price={product.price} />

      {/*  a function cannot cross the boundary:
          <AddToCart onAdd={() => ...} />   -> not serialisable */}
    </article>
  );
}\`;

const CLIENT_COMPONENT = \`// components/AddToCart.jsx
"use client";                    // <- the boundary. Everything this imports ships.
import { useState } from "react";

export default function AddToCart({ productId, price }) {
  const [qty, setQty] = useState(1);      // state: only possible here
  return (
    <div>
      <input value={qty} onChange={(e) => setQty(+e.target.value)} />
      <button onClick={() => addToCart(productId, qty)}>Add · {price * qty}</button>
    </div>
  );
}\`;

const TABS = [
  ["Server Component", SERVER_COMPONENT, "#eef7ee"],
  ["Client Component", CLIENT_COMPONENT, "#eef"],
];

export default function App() {
  const [tab, setTab] = useState(0);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 620 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {TABS.map(([label], i) => (
          <button key={label} onClick={() => setTab(i)} style={{ fontWeight: i === tab ? "bold" : "normal" }}>
            {label}
          </button>
        ))}
      </div>

      <pre style={{ background: TABS[tab][2], border: "1px solid #ddd", borderRadius: 8,
                    padding: 12, fontSize: 12, overflowX: "auto", whiteSpace: "pre-wrap" }}>
{TABS[tab][1]}
      </pre>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginTop: 10, fontSize: 13 }}>
        <strong>What crosses the boundary</strong>
        <table style={{ width: "100%", fontSize: 12, marginTop: 6, borderCollapse: "collapse" }}>
          <tbody>
            {[
              ["strings, numbers, plain objects, arrays", "✅ crosses"],
              ["an unresolved promise (read with use())", "✅ crosses"],
              ["rendered children as a prop", "✅ crosses"],
              ["a function or event handler", "❌ not serialisable"],
              ["a class instance, a Date method, a Map", "❌ not serialisable"],
            ].map(([what, ok]) => (
              <tr key={what}>
                <td style={{ padding: "2px 8px 2px 0" }}>{what}</td>
                <td style={{ color: ok.startsWith("✅") ? "#161" : "#a33" }}>{ok}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 13, color: "#666" }}>
        The asymmetry to remember: <code>marked</code> and the database client in
        the first tab never reach the browser at all, while under plain SSR every
        component that renders HTML must also ship as JavaScript so it can
        hydrate. That is the bundle-size difference RSC is actually about.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What causes hydration mismatches, and how do you handle them?",
    seoDescription:
      "Verified: text and structure mismatches fire a recoverable error and the client wins; an attribute mismatch only warns, and the server value is kept.",
    description: `**Question presented to candidate:**
"Your logs are full of hydration warnings. How do you work out what is causing them and what do you do about each kind?"

**What a strong answer should cover:**
- A mismatch is the client's first render producing something **different from the server HTML**. React then discards the mismatched subtree and re-renders it on the client.
- **Not all mismatches are equal**, which is the key insight: a **text or structure** mismatch is a recoverable error and the **client** value wins; an **attribute** mismatch only warns in the console and the **server** value is kept.
- The causes fall into four groups: **non-deterministic output** (\`Date\`, \`Math.random\`, generated ids), **environment differences** (locale, timezone, \`window\`, \`localStorage\`), **invalid HTML nesting** the browser silently repairs, and **third parties** — browser extensions injecting markup.
- The fix for a genuinely client-only value is a **mounted flag**: render the neutral version on the server and the first client render, then switch. Checking \`typeof window\` during render does not work — it makes the first client render differ, which *is* the mismatch.
- For a store-backed value, \`useSyncExternalStore\` takes a **server snapshot** for exactly this.
- \`suppressHydrationWarning\` is for **one unavoidable node**, such as a timestamp. It silences the warning and keeps the **server** value — it does not make the two agree.
- Extension-caused mismatches are not your bug; recognise them rather than chasing them.

**Clarifying questions expected:**
- "Is the differing value genuinely client-only, or just accidentally non-deterministic?" — different fixes.
- "Does the warning reproduce in a clean profile with extensions disabled?"

**Code / implementation expected:** Optional. The mounted-flag pattern is three lines and worth writing out.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes <a href="PASTE_HYDRATION_URL_HERE" target="_blank" rel="noopener noreferrer">what hydration is</a>.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Section 3 is **four mismatches actually triggered against React 19.2.8**, with the recoverable-error count, the console warnings and the winning value recorded for each. The asymmetry it turned up is the part worth carrying into an interview.

## 1. Why This Even Matters — A Story First

Two people are told to lay the same table from the same instructions, one an hour before the other. When the second arrives, everything should already match, and they only need to check.

Mostly it does. But the instructions said "put today's date on the card", and an hour has passed. Now there is a discrepancy — and what happens next depends entirely on **what** disagrees. A wrong date card gets replaced. A fork one centimetre out of place gets a muttered complaint and left alone.

React does exactly that, and the distinction is not obvious until you measure it.

## 2. The Core Idea

📌 **Interview term: hydration mismatch** — the client's **first** render produces output that does not match the server-rendered HTML. React cannot adopt DOM it did not predict, so it discards the mismatched subtree and re-renders it on the client.

📌 **Interview term:** the cost is that you pay **twice** — the server render for that region is wasted and the client does the full render you adopted SSR to avoid — plus a possible visible flicker as the content changes.

## 3. Verified: the four kinds, and the asymmetry

Each mismatch triggered for real, recording whether React raised a **recoverable error**, whether it merely **warned**, and **which value survived**.

| Mismatch | Recoverable error | Console warning | Winner |
| :--- | :--- | :--- | :--- |
| **Text** differs | 1 | 0 | **client** |
| **Attribute** differs | **0** | **1** | **server** |
| **Extra element** on the client | 1 | 0 | **client** |
| **Different element type** | 1 | 0 | **client** |

📌 **Interview term:** the attribute row is the finding. An attribute mismatch is **not** a recoverable error — React logs a console warning and **keeps the server value**. Measured directly: with the server rendering <code>className="server"</code> and the client <code>className="client"</code>, the element's final class was <code>"server"</code>.

So a mismatched <code>className</code>, <code>style</code> or <code>href</code> is **quieter and stickier** than a mismatched text node: no error to your reporting hook, and the client's intended value silently loses. A theme class that differs between server and client is exactly this bug, and it explains the "why is it stuck in light mode" class of report.

The error text for the loud cases:

\`\`\`
text:      "Hydration failed because the server rendered text didn't match the client…"
structure: "Hydration failed because the server rendered HTML didn't match the client…"
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="Text and structure mismatches raise an error and the client wins while attribute mismatches only warn and the server wins">
  <defs>
    <marker id="hm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Not all mismatches behave the same</text>
  <rect class="d-box-muted" x="24" y="46" width="200" height="52" rx="9"/>
  <text class="d-sub" x="124" y="68" text-anchor="middle">text or structure</text>
  <text class="d-sub" x="124" y="88" text-anchor="middle">differs</text>
  <path class="d-edge" d="M 230 72 L 286 72" marker-end="url(#hm-arrow)"/>
  <rect class="d-box" x="292" y="46" width="364" height="52" rx="9"/>
  <text class="d-text" x="474" y="68" text-anchor="middle">recoverable error, subtree re-rendered</text>
  <text class="d-sub" x="474" y="88" text-anchor="middle">the CLIENT value wins</text>
  <rect class="d-box-muted" x="24" y="126" width="200" height="52" rx="9"/>
  <text class="d-sub" x="124" y="148" text-anchor="middle">an attribute</text>
  <text class="d-sub" x="124" y="168" text-anchor="middle">differs</text>
  <path class="d-edge-dashed" d="M 230 152 L 286 152" marker-end="url(#hm-arrow)"/>
  <rect class="d-box-accent" x="292" y="126" width="364" height="52" rx="9"/>
  <text class="d-text d-accent" x="474" y="148" text-anchor="middle">console warning only</text>
  <text class="d-sub" x="474" y="168" text-anchor="middle">the SERVER value is kept</text>
</svg>

## 4. What actually causes them

| Cause | Example |
| :--- | :--- |
| **Non-deterministic output** | <code>Date.now()</code>, <code>new Date()</code>, <code>Math.random()</code>, a generated id |
| **Environment differences** | Locale or timezone formatting; the server is not in the user's timezone |
| **Browser-only reads during render** | <code>window</code>, <code>localStorage</code>, <code>matchMedia</code>, a cookie read only on the client |
| **Invalid HTML nesting** | A <code>&lt;div&gt;</code> inside a <code>&lt;p&gt;</code>; the browser repairs it, so the DOM is not what React produced |
| **Third parties** | Extensions injecting attributes or markup before hydration |

📌 **Interview term:** the fourth one is the trap. **Invalid nesting** produces a structure mismatch even though your render is perfectly deterministic — the *browser* changed the DOM, not you. If a mismatch makes no sense, check the nesting before checking your logic.

## 5. The fixes, by cause

**For a genuinely client-only value — the mounted flag:**

\`\`\`jsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
return <span>{mounted ? new Date().toLocaleTimeString() : "--:--:--"}</span>;
\`\`\`

📌 **Interview term:** the crucial detail is that the **first client render must still match the server**. A <code>typeof window !== "undefined"</code> check during render does **not** do that — it makes the first client render differ from the server, which is precisely the mismatch. The flag works because the switch happens on the render *after* hydration.

**For a value from an external store:** <code>useSyncExternalStore</code> takes a **server snapshot** as its third argument for exactly this reason — the server and the first client render both use it.

**For one unavoidable node:** <code>suppressHydrationWarning</code>.

Verified behaviour, and it is worth knowing precisely:

\`\`\`
server text "rendered at 111", client text "rendered at 222", suppressed:
  recoverable errors:  0
  DOM after hydration: "rendered at 111"     <- the SERVER text was kept
\`\`\`

📌 **Interview term:** it **silences the warning and keeps the server value**. It does not reconcile anything. That is fine for a timestamp you will replace in an effect, and wrong as a general silencer — you are hiding the report and keeping the *server's* answer.

## 6. Diagnosing in practice

- Read the **component stack** in the error, not just the message. It names the subtree.
- Reproduce in a **clean profile with extensions disabled**. A large share of reports are extensions.
- Look for **attributes** specifically — they warn without an error, so they will not appear in whatever <code>onRecoverableError</code> reporting you have.
- Check for **invalid nesting** early; it is deterministic code producing a nondeterministic-looking failure.
- Wire up <code>onRecoverableError</code> on the root so mismatches reach your logging.

## 7. Common Pitfalls

- **Treating all mismatches alike.** Verified: attributes warn only, and the server wins.
- **Guarding with <code>typeof window</code> during render.** That *is* the mismatch.
- **Using <code>suppressHydrationWarning</code> broadly.** It hides the signal and keeps the server value.
- **Ignoring warnings because the page looks fine.** A subtree was thrown away and re-rendered.
- **Chasing an extension's mismatch.** Reproduce clean first.
- **Formatting dates or currency during render** without pinning the locale and timezone.
- **Forgetting attribute mismatches escape your reporting.** No recoverable error means no callback.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it and its cost:</strong> <span style="color:#f0e2c8;">"The client's first render disagrees with the server HTML, so React discards that subtree and re-renders it — you pay for the work twice and the user may see it change."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Lead with the asymmetry:</strong> <span style="color:#f0e2c8;">"They are not all the same. Text and structure mismatches raise a recoverable error and the client value wins. An attribute mismatch only warns — and the SERVER value is kept. I have measured that."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the causes in groups:</strong> <span style="color:#f0e2c8;">"Non-deterministic output, environment differences like locale and timezone, browser-only reads during render, invalid HTML nesting the browser repairs, and extensions."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the fix precisely:</strong> <span style="color:#f0e2c8;">"A mounted flag — neutral on the server and the first client render, real value after. A typeof window check during render does not work, because it makes the first client render differ, which is the mismatch itself."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scope the escape hatch:</strong> <span style="color:#f0e2c8;">"suppressHydrationWarning is for one unavoidable node. It silences the warning and keeps the server value — it does not make them agree."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does an attribute mismatch behave differently?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it does not invalidate the tree structure — React can still adopt the node, so there is nothing to discard and re-render. It warns instead and keeps what the server sent. The practical consequence is that it is the more dangerous kind: no recoverable error means it never reaches your reporting, and the client value you intended silently loses.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">typeof window</code> not fix it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it changes the FIRST client render, which is the exact render that has to match the server. The server takes the undefined branch and the browser takes the defined one, so you have guaranteed a difference rather than avoided one. The mounted flag works because the first client render still takes the server branch, and only the render after hydration switches.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle dates and currency?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pin the locale and timezone explicitly so both environments format identically, rather than relying on the ambient defaults — the server is almost never in the user's timezone. If the value must genuinely reflect the user's local settings, render a neutral placeholder and fill it in after mount, which is the same mounted-flag pattern.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">A mismatch that makes no sense — where do you look?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Invalid HTML nesting and browser extensions, in that order. A div inside a p gets silently restructured by the parser, so React finds a DOM it did not produce even though your render is perfectly deterministic. And extensions inject attributes and nodes before hydration runs — always reproduce in a clean profile before spending an afternoon on it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you catch these in production?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wire onRecoverableError on the root and send the message plus the component stack to your logging. But know the gap: attribute mismatches never fire it, so they need console-level capture or a synthetic check on the values you care about, like the theme class.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Hydration mismatch** | The first client render differs from the server HTML |
| **Recoverable error** | React discards the subtree and re-renders it |
| **Mounted flag** | State set in an effect to switch after hydration |
| **Server snapshot** | The third argument to <code>useSyncExternalStore</code> |
| **<code>suppressHydrationWarning</code>** | Silences one node; keeps the server value |

---
**Conclusion:** a hydration mismatch is the client's **first** render disagreeing with the server HTML, after which React discards that subtree and re-renders it — the work paid for twice, with a possible visible flicker. The insight worth carrying is that they are **not all the same**: verified, a **text or structure** mismatch fires a recoverable error and the **client** value wins, while an **attribute** mismatch fires **no error at all**, warns in the console, and the **server** value is kept — which makes it the quieter and more dangerous kind, because it never reaches your reporting. Causes group into non-determinism, environment differences, browser-only reads during render, invalid nesting the browser repairs, and extensions. Fix client-only values with a **mounted flag**, not a <code>typeof window</code> check, which is itself the mismatch — and treat <code>suppressHydrationWarning</code> as a single-node escape hatch that keeps the server's answer.`,
    examples: [
      {
        label: "Four mismatches triggered live, showing which value survives each",
        runnable: true,
        code: `import { useState, useEffect } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";

// Server renders one thing, client another. Each case reports whether React
// raised a recoverable error and WHICH value ended up in the DOM.
const CASES = [
  {
    name: "text mismatch",
    Server: () => <p>server text</p>,
    Client: () => <p>client text</p>,
    read: (host) => "text = " + JSON.stringify(host.textContent),
  },
  {
    name: "attribute mismatch",
    Server: () => <p className="from-server">same text</p>,
    Client: () => <p className="from-client">same text</p>,
    read: (host) => "class = " + JSON.stringify(host.querySelector("p").className),
  },
  {
    name: "extra element on client",
    Server: () => <div><span>a</span></div>,
    Client: () => <div><span>a</span><span>b</span></div>,
    read: (host) => "text = " + JSON.stringify(host.textContent),
  },
  {
    name: "suppressed mismatch",
    Server: () => <p suppressHydrationWarning>server value</p>,
    Client: () => <p suppressHydrationWarning>client value</p>,
    read: (host) => "text = " + JSON.stringify(host.textContent),
  },
];

export default function App() {
  const [rows, setRows] = useState([]);

  const run = async () => {
    const out = [];
    for (const c of CASES) {
      const host = document.createElement("div");
      // Produce the "server" HTML, exactly as a server would.
      host.innerHTML = renderToString(<c.Server />);
      document.body.appendChild(host);

      const errors = [];
      const warnings = [];
      const origErr = console.error;
      console.error = (...a) => warnings.push(String(a[0]));

      hydrateRoot(host, <c.Client />, {
        onRecoverableError: (e) => errors.push(String(e.message).split(".")[0]),
      });
      // Let hydration settle before reading the result.
      await new Promise((r) => setTimeout(r, 60));
      console.error = origErr;

      out.push({
        name: c.name,
        errors: errors.length,
        warnings: warnings.length,
        winner: c.read(host),
      });
      host.remove();
    }
    setRows(out);
  };

  useEffect(() => { run(); }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 580 }}>
      <button onClick={run} style={{ marginBottom: 12 }}>re-run</button>

      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>case</th><th>recoverable</th><th>warnings</th><th>what survived</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "4px 8px 4px 0" }}>{r.name}</td>
              <td style={{ color: r.errors ? "#a33" : "#161" }}>{r.errors}</td>
              <td style={{ color: r.warnings ? "#a60" : "#161" }}>{r.warnings}</td>
              <td><code style={{ fontSize: 12 }}>{r.winner}</code></td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: 13, color: "#666" }}>
        Read the second row against the others. Text and structure mismatches
        raise a recoverable error and the <strong>client</strong> value wins.
        The attribute mismatch raises none — a console warning only — and the
        <strong> server</strong> class is kept. That is why a theme class that
        differs between server and client gets stuck on the server value and
        never shows up in your error reporting.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Error Boundaries with RSC — why can't Server Components catch errors?",
    seoDescription:
      "An error boundary needs state and a lifecycle; a Server Component has neither. Boundaries must be Client Components; the server sends a redacted digest.",
    description: `**Question presented to candidate:**
"Why does the error boundary in a React Server Components app have to be a Client Component?"

**What a strong answer should cover:**
- An Error Boundary needs \`getDerivedStateFromError\`, \`componentDidCatch\` and **state** to hold the error. A Server Component has **no state, no lifecycle and renders once** — so it cannot be one.
- Boundaries therefore live on the client, marked \`"use client"\`, and they **can still wrap Server Components** rendered as their children, because composition crosses the boundary even though code does not.
- When a Server Component throws **on the server**, the framework serialises the failure into the stream and the nearest client boundary renders its fallback.
- **In production the message is redacted.** You get a **digest** — a hash to correlate with your server logs — not the original message, because a server error can contain a query, a path, or a secret.
- That is a genuine debugging difference: server errors are found in your **server logs**, not in the browser console.
- Recovery is different too. A client boundary cannot re-run a Server Component's render on its own — retrying needs a **new request to the server**, which is what a framework's \`reset\` does.
- In Next.js the App Router convention is an \`error.tsx\` file, which **must** carry \`"use client"\` for exactly this reason.
- Server-side errors that never reach a boundary — a route handler, a failed Server Action — need server-level observability instead.

**Clarifying questions expected:**
- "Did the error happen during the server render, or after hydration on the client?" — different diagnosis entirely.
- "Do we have server-side error reporting wired up?"

**Code / implementation expected:** Optional. Pointing out the \`"use client"\` on the boundary is the substance.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes <a href="PASTE_ERROR_BOUNDARY_URL_HERE" target="_blank" rel="noopener noreferrer">error boundaries</a> and <a href="PASTE_RSC_VS_SSR_URL_HERE" target="_blank" rel="noopener noreferrer">Server Components</a>.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. **A note on verification:** this repo has **no RSC runtime** — <code>react-server-dom-webpack</code> is not installed — so none of the server-side behaviour below was executed. What **was** measured, and is marked where it appears, is the plain-React error-boundary behaviour the argument rests on.

## 1. Why This Even Matters — A Story First

A smoke alarm needs three things: a sensor, a **memory** that it is currently alarming, and a siren that keeps going until someone resets it.

Now imagine a device that reports the air quality exactly once, at the moment of installation, and then is switched off forever. It could tell you there is smoke — but it cannot *keep* telling you, because it has no memory and no second moment.

A Server Component is that device. It is not that React forgot to let it catch errors; it structurally cannot hold the state that catching an error means.

## 2. The Core Idea

📌 **Interview term:** an Error Boundary works by **holding state**. It catches the error, stores it, and **re-renders** with a fallback in place of the children.

Verified in plain React 19.2.8 elsewhere in this collection:

\`\`\`
a boundary wrapping a throwing child
  DOM after the throw:  "CAUGHT: render exploded"
  info object keys:     ["componentStack"]
\`\`\`

That "DOM after the throw" is a **second render** — the boundary rendered its children, they threw, it set state, and it rendered again.

📌 **Interview term:** a Server Component has **no state, no lifecycle methods, and renders exactly once**. There is no second render to produce a fallback in. So it is not a restriction React chose; it is the absence of the machinery a boundary is made of.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="A client boundary holds state and re-renders while a server component renders once">
  <defs>
    <marker id="rb-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Catching an error needs a second render</text>
  <text class="d-text d-accent" x="66" y="76" text-anchor="middle">client</text>
  <rect class="d-box-accent" x="130" y="46" width="150" height="52" rx="9"/>
  <text class="d-sub" x="205" y="76" text-anchor="middle">render children</text>
  <path class="d-edge-accent" d="M 286 72 L 326 72" marker-end="url(#rb-arrow)"/>
  <rect class="d-box-accent" x="332" y="46" width="140" height="52" rx="9"/>
  <text class="d-sub" x="402" y="68" text-anchor="middle">throw caught</text>
  <text class="d-sub" x="402" y="88" text-anchor="middle">stored in state</text>
  <path class="d-edge-accent" d="M 478 72 L 518 72" marker-end="url(#rb-arrow)"/>
  <rect class="d-box-accent" x="524" y="46" width="132" height="52" rx="9"/>
  <text class="d-text d-accent" x="590" y="76" text-anchor="middle">fallback</text>
  <text class="d-text" x="66" y="164" text-anchor="middle">server</text>
  <rect class="d-box-muted" x="130" y="134" width="150" height="52" rx="9"/>
  <text class="d-sub" x="205" y="164" text-anchor="middle">render once</text>
  <path class="d-edge-dashed" d="M 286 160 L 326 160" marker-end="url(#rb-arrow)"/>
  <rect class="d-box" x="332" y="134" width="324" height="52" rx="9"/>
  <text class="d-sub" x="494" y="156" text-anchor="middle">no state, no second render</text>
  <text class="d-sub" x="494" y="176" text-anchor="middle">nowhere to put a fallback</text>
</svg>

## 3. So where does the boundary go?

📌 **Interview term:** on the **client**, marked <code>"use client"</code> — and it can still **wrap Server Components**, because composition crosses the boundary even though code does not.

\`\`\`jsx
// ErrorBoundary.jsx
"use client";                          // required — it needs state and lifecycle
export class ErrorBoundary extends React.Component { /* … */ }

// page.jsx — a Server Component
export default async function Page() {
  const data = await db.query();       // may throw, on the server
  return (
    <ErrorBoundary fallback={<Oops />}>
      <ServerRenderedReport data={data} />   {/* still a Server Component */}
    </ErrorBoundary>
  );
}
\`\`\`

📌 **Interview term:** in the Next.js App Router this is the <code>error.tsx</code> convention, and it **must** carry <code>"use client"</code> — for exactly this reason, not as an arbitrary rule.

## 4. What actually reaches the browser

When a Server Component throws during the server render, the framework serialises the failure into the stream and the nearest client boundary renders its fallback.

📌 **Interview term:** but **in production the message is redacted**. What arrives is a **digest** — a hash you correlate with your server logs — instead of the original text. A server error can contain a SQL fragment, a file path, an internal hostname or a token, and none of that should be sent to a browser.

| | Development | Production |
| :--- | :--- | :--- |
| Message in the browser | The real message and stack | A generic message |
| What identifies it | The message | A **digest** hash |
| Where the detail lives | The console | Your **server logs** |

📌 **Interview term:** the practical consequence is a real workflow change — you debug a Server Component failure in the **server logs**, matching by digest, not in the browser console. Engineers who learn React on the client find this genuinely disorienting.

## 5. Recovery is different too

A client boundary can reset its own state, but that does **not** re-run a Server Component's render — that render happened on a machine that is no longer involved.

📌 **Interview term:** retrying a server failure requires **a new request to the server**. That is what the framework's <code>reset</code> function does: it does not clear a flag, it re-fetches the segment. Building a "try again" button that only resets client state will re-render the fallback forever, because nothing re-ran.

## 6. What a boundary still cannot catch

The <a href="PASTE_BOUNDARY_LIMITS_URL_HERE" target="_blank" rel="noopener noreferrer">usual limits</a> apply — event handlers and async callbacks are outside the render window — and RSC adds more that never reach the client at all:

- A **route handler** throwing.
- A **Server Action** failing after the page has rendered.
- Anything in middleware or during data loading outside a component.

📌 **Interview term:** those need **server-level observability**, not a component. In Next.js that is the <a href="PASTE_INSTRUMENTATION_URL_HERE" target="_blank" rel="noopener noreferrer">instrumentation hook</a>, whose whole purpose is catching what boundaries structurally cannot.

## 7. Common Pitfalls

- **Forgetting <code>"use client"</code> on the boundary.** It needs state and lifecycle.
- **Expecting the real error message in production.** You get a digest; look in the server logs.
- **Building a retry that only resets client state.** The server render must be re-requested.
- **Assuming a boundary covers Server Actions.** It does not; they fail outside the render.
- **One boundary at the root.** Same problem as anywhere: every failure blanks the page.
- **Logging only in the browser.** Server failures never appear there.
- **Thinking this is an RSC limitation React could lift.** A boundary is state plus a re-render; a Server Component has neither.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer structurally, not by rule:</strong> <span style="color:#f0e2c8;">"A boundary catches the error, stores it in state, and re-renders with a fallback. A Server Component has no state and renders once — there is no second render to put a fallback in."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Say where it goes instead:</strong> <span style="color:#f0e2c8;">"The boundary is a Client Component, and it can still wrap Server Components as children — composition crosses the boundary even though code does not."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Explain the redaction:</strong> <span style="color:#f0e2c8;">"When a Server Component throws, production sends a digest rather than the message — a server error can contain a query or a path, so React will not ship it to a browser."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the workflow consequence:</strong> <span style="color:#f0e2c8;">"So you debug it in the server logs, matching by digest, not in the browser console. That catches people out."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Mention recovery:</strong> <span style="color:#f0e2c8;">"And a retry has to re-request from the server — resetting client state re-renders the fallback forever, because nothing re-ran."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could React add error boundaries to Server Components?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not without giving them state and a second render, which would make them client components in all but name. Catching an error means recording that you are now in a failed state and rendering something different — both of those are exactly what a render-once, stateless component does not have. It is a consequence of the model, not an oversight.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the production message hidden?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because server errors routinely contain things that must not reach a browser — a SQL fragment with column names, a filesystem path, an internal hostname, sometimes a token in a connection string. Sending a digest lets you correlate the client report with the full server-side log entry without leaking any of it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make "try again" actually work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the framework's reset, which re-requests the failed segment from the server rather than clearing a local flag. If you write your own that only calls setState, the boundary re-renders the same already-failed server payload and shows the fallback again — which looks like the retry button is broken when in fact nothing was ever re-run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about a failing Server Action?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That happens after the page has rendered, so no boundary is in the render window — the same reason event-handler errors escape. The idiomatic handling is to catch inside the action and return the failure as state via useActionState, and to rely on server-side observability for the ones you did not anticipate.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Error Boundary** | A class component that catches render errors |
| **<code>"use client"</code>** | Marks a component that ships to the browser |
| **Digest** | A hash identifying a redacted server error |
| **<code>error.tsx</code>** | The Next.js App Router boundary convention |
| **<code>reset</code>** | Re-requesting a failed segment from the server |

---
**Conclusion:** an Error Boundary catches an error, **stores it in state**, and **re-renders** with a fallback — verified in plain React as a second render producing the fallback. A Server Component has **no state and renders once**, so it structurally lacks the machinery; this is a consequence of the model, not a rule React chose. Boundaries therefore live on the client with <code>"use client"</code> — which is why Next.js requires it on <code>error.tsx</code> — and they can still wrap Server Components as children. When a Server Component throws, production sends a **redacted digest** rather than the message, so the real debugging happens in your **server logs**; and recovery needs a **new request to the server**, not a client state reset. Failures outside the render window entirely — route handlers, Server Actions — need server-level observability instead. **None of the RSC behaviour here was executed**; this repo has no RSC runtime.`,
    examples: [
      {
        label: "The boundary that must be a Client Component, and a retry that actually retries",
        runnable: true,
        code: `import React, { Component, useState } from "react";

// This playground has no RSC runtime, so the SERVER side below is annotated
// reference. What runs live is the client boundary itself — the half that is
// identical in an RSC app.

const SERVER_SIDE = \`// app/report/page.jsx  — a Server Component, no "use client"
export default async function ReportPage() {
  const rows = await db.report.findMany();   // may throw, ON THE SERVER
  return (
    // The boundary is a CLIENT component, imported here and wrapping
    // Server Components as children. Composition crosses the boundary
    // even though code does not.
    <ErrorBoundary>
      <ReportTable rows={rows} />            {/* still a Server Component */}
    </ErrorBoundary>
  );
}

// app/report/error.jsx  — the Next.js App Router convention
"use client";                                //  REQUIRED: needs state
export default function Error({ error, reset }) {
  // In production, error.message is generic and error.digest is a hash
  // you match against the server logs. The real text never leaves the server.
  return (
    <div>
      <p>Something went wrong.</p>
      <code>digest: {error.digest}</code>
      {/* reset() RE-REQUESTS the segment from the server. A setState-only
          retry would re-render the same failed payload forever. */}
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}\`;

// ── The live half: a boundary needs state and a SECOND render ──────────────
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ border: "1px solid #e0b4b4", background: "#fdf0f0", borderRadius: 8, padding: 12 }}>
          <strong style={{ color: "#a33" }}>fallback rendered</strong>
          <div style={{ fontSize: 13 }}>{this.state.error.message}</div>
          {/* Clearing state only helps because the CHILD is client-side and
              will genuinely re-run. For a server payload it would not. */}
          <button onClick={() => this.setState({ error: null })}>reset boundary state</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Child({ broken }) {
  if (broken) throw new Error("the report query failed");
  return <div style={{ background: "#f2f9f2", border: "1px solid #cde3cd", borderRadius: 8, padding: 12 }}>report rendered fine</div>;
}

export default function App() {
  const [broken, setBroken] = useState(false);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 620 }}>
      <button onClick={() => setBroken((b) => !b)} style={{ marginBottom: 10 }}>
        {broken ? "fix the child" : "break the child"}
      </button>

      <ErrorBoundary key={String(broken)}>
        <Child broken={broken} />
      </ErrorBoundary>

      <p style={{ fontSize: 13, color: "#666" }}>
        The boundary above holds the error in <code>state</code> and renders a
        different tree — two things a Server Component cannot do, which is the
        whole answer to the question. Below is what the server half looks like.
      </p>

      <pre style={{ background: "#f6f6f8", border: "1px solid #ddd", borderRadius: 8,
                    padding: 12, fontSize: 12, overflowX: "auto", whiteSpace: "pre-wrap" }}>
{SERVER_SIDE}
      </pre>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Next.js instrumentation hook — observability in Next.js 15",
    seoDescription:
      "instrumentation.ts exports register() to start tracing and onRequestError to catch server errors. Type signatures read from the installed Next.js package.",
    description: `**Question presented to candidate:**
"Where do you initialise tracing in a Next.js app, and how do you capture server-side errors that never reach an error boundary?"

**What a strong answer should cover:**
- The **instrumentation file** at the project root (or \`src/\`) is the designated place. It exports two optional functions.
- **\`register()\`** runs **once when the server starts**, before any request. That is where OpenTelemetry, an APM agent, or any global initialisation goes — importantly, before the code it needs to patch is loaded.
- **\`onRequestError(error, request, context)\`** is called for **server-side errors**, including the ones no error boundary can see: route handlers, Server Actions, and Server Component renders.
- The \`context\` argument is the useful part: it says which **router** (App or Pages), the **route path**, the **route type** (a render, a route handler, an action, a proxy) and, for renders, the **render source**.
- That lets you route errors sensibly — a failing Server Action is a different alert from a failing static render.
- It complements error boundaries rather than replacing them: boundaries produce the **user-facing fallback**, instrumentation produces the **operator-facing signal**.
- It pairs with the \`digest\` a production boundary shows the user — that is the key you match against.
- It is server-side only; browser errors still need a client-side reporter.

**Clarifying questions expected:**
- "Which Next.js version?" — the hook has moved through experimental flags to stable.
- "Do we need traces, error reporting, or both?" — \`register\` versus \`onRequestError\`.

**Code / implementation expected:** Optional. The two exported function signatures are the answer.`,
    answer: `**Target Audience:** Engineers preparing for Next.js interviews — assumes basic App Router knowledge.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. **A note on verification:** this could not be executed — there is no instrumentation file in this repo and no OpenTelemetry installed. What section 3 shows is **read directly from the type definitions shipped in the installed Next.js package**, so the signatures and the union members are exact rather than remembered. **Version note:** the question says Next.js 15; the version installed here is **16.3.4**, and the shapes below are that package's.

## 1. Why This Even Matters — A Story First

A shop fits smoke alarms in every room. Good — customers get warned and can leave.

None of that tells the **owner** anything. Nobody at head office knows the alarm went off, in which room, at what time, or whether it has happened forty times this week. The alarms serve the people in the building; the owner needs a separate system entirely.

<a href="PASTE_ERROR_BOUNDARY_URL_HERE" target="_blank" rel="noopener noreferrer">Error boundaries</a> are the alarms. Instrumentation is the monitoring contract.

## 2. The Core Idea

📌 **Interview term: the instrumentation file** — a file named <code>instrumentation</code> at the project root, or inside <code>src/</code>, exporting up to two functions Next.js calls for you.

📌 **Interview term: <code>register()</code>** — runs **once when the server process starts**, before it handles any request. This is where global setup goes, and the timing matters: an APM agent that patches modules must run **before those modules are imported**, which is exactly what this guarantees.

📌 **Interview term: <code>onRequestError()</code>** — called for **server-side errors**, including the ones an error boundary structurally cannot see.

## 3. Verified: the exact shapes, from the installed package

Read from <code>next/dist/server/instrumentation/types.d.ts</code> in <strong>next@16.3.4</strong> as installed here:

\`\`\`ts
export type InstrumentationModule = {
    register?(): void;
    onRequestError?: InstrumentationOnRequestError;
};

export type InstrumentationOnRequestError = (
    error: unknown,
    errorRequest: Readonly<{
        path: string;
        method: string;
        headers: NodeJS.Dict<string | string[]>;
    }>,
    errorContext: Readonly<RequestErrorContext>,
) => void | Promise<void>;

export type RequestErrorContext = {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'proxy';
    renderSource?: 'react-server-components'
                 | 'react-server-components-payload'
                 | 'server-rendering';
    revalidateReason: 'on-demand' | 'stale' | undefined;
};
\`\`\`

📌 **Interview term:** both exports are **optional** — you can use one without the other. And the third argument is where the value is: <code>routeType</code> distinguishes a page **render** from a **route** handler from a Server **action**, and <code>renderSource</code> further splits a Server Component render from ordinary server rendering.

That is enough to route errors properly. A failing Server Action is a broken user submission; a failing static render is a broken page. They should not page the same person.

## 4. What it catches that boundaries cannot

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Error boundaries serve the user while instrumentation serves the operator">
  <defs>
    <marker id="in-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="340" y="22" text-anchor="middle">Two audiences, two mechanisms</text>
  <rect class="d-box-muted" x="230" y="44" width="220" height="44" rx="10"/>
  <text class="d-text" x="340" y="72" text-anchor="middle">a server error happens</text>
  <path class="d-edge-accent" d="M 300 92 L 200 130" marker-end="url(#in-arrow)"/>
  <path class="d-edge" d="M 380 92 L 480 130" marker-end="url(#in-arrow)"/>
  <rect class="d-box-accent" x="30" y="134" width="290" height="72" rx="10"/>
  <text class="d-text d-accent" x="175" y="158" text-anchor="middle">error boundary</text>
  <text class="d-sub" x="175" y="178" text-anchor="middle">the user sees a fallback</text>
  <text class="d-sub" x="175" y="196" text-anchor="middle">plus a digest in production</text>
  <rect class="d-box" x="360" y="134" width="290" height="72" rx="10"/>
  <text class="d-text" x="505" y="158" text-anchor="middle">onRequestError</text>
  <text class="d-sub" x="505" y="178" text-anchor="middle">the operator gets the real error</text>
  <text class="d-sub" x="505" y="196" text-anchor="middle">with route and type context</text>
</svg>

| Failure | Error boundary | <code>onRequestError</code> |
| :--- | :--- | :--- |
| Server Component render throws | Fallback shown | ✅ Reported |
| Route handler throws | Nothing — no component involved | ✅ Reported |
| Server Action fails | Nothing — outside the render window | ✅ Reported |
| Client-side render error | Fallback shown | ❌ Server-side only |
| Event handler throws in the browser | Not caught either | ❌ Server-side only |

📌 **Interview term:** the pairing to name in an interview is **digest ↔ log entry**. Production shows the user a redacted digest; <code>onRequestError</code> gives you the real error server-side. Logging the digest alongside it is what makes a user's screenshot actionable.

## 5. The shape in practice

\`\`\`ts
// instrumentation.ts
export async function register() {
  // Runs ONCE at server start, before any request — and before the modules an
  // APM agent needs to patch have been imported.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");   // OpenTelemetry, APM, etc.
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error, request, context,
) => {
  await report({
    message: String(error),
    path: request.path,
    method: request.method,
    router: context.routerKind,        // "App Router" | "Pages Router"
    route: context.routePath,
    type: context.routeType,           // "render" | "route" | "action" | "proxy"
    source: context.renderSource,      // only present for renders
  });
};
\`\`\`

📌 **Interview term:** the runtime check matters. Next.js can run this file in the Node runtime and the edge runtime, and most tracing SDKs are Node-only — so the conditional dynamic import is the standard shape rather than a nicety.

## 6. Where it sits in a strategy

- **Error boundaries** — what the *user* sees. Per-region fallbacks, with recovery.
- **<code>onRequestError</code>** — what the *operator* sees, server-side, with route context.
- **<code>register()</code>** — tracing and metrics, initialised before anything runs.
- **A client-side reporter** — still needed; none of the above sees a browser error.

📌 **Interview term:** the honest summary is that instrumentation is **not an error-handling mechanism**. It changes nothing about what the user experiences. It exists so that failures are **visible to you**, which is a separate concern that engineers routinely conflate.

## 7. Common Pitfalls

- **Putting tracing setup in a layout or a page.** It runs per request and too late to patch modules.
- **Assuming it catches browser errors.** Server-side only.
- **Ignoring <code>NEXT_RUNTIME</code>.** Node-only SDKs break on the edge runtime.
- **Not logging the <code>digest</code>.** Without it a user's screenshot cannot be matched to a log line.
- **Treating it as a replacement for boundaries.** It shows the user nothing.
- **Heavy synchronous work in <code>onRequestError</code>.** It runs on the request path.
- **Asserting version-specific details from memory.** The hook has moved through experimental flags — check the version you are on.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the file and both exports:</strong> <span style="color:#f0e2c8;">"An instrumentation file at the project root, exporting register and onRequestError. Both optional."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give register's timing, and why it matters:</strong> <span style="color:#f0e2c8;">"It runs once at server start, before any request — which matters because an APM agent has to patch modules before they are imported."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Say what onRequestError covers:</strong> <span style="color:#f0e2c8;">"Server-side errors including the ones no boundary can see — route handlers and Server Actions, which happen outside any render."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Sell the context argument:</strong> <span style="color:#f0e2c8;">"It tells you the router, the route path, and the route type — render, route, action or proxy — plus the render source. So a failing Server Action can alert differently from a failing page render."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Position it correctly:</strong> <span style="color:#f0e2c8;">"It is observability, not error handling — the user still needs boundaries. The two connect through the digest: the user sees the hash, I log the real error against it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not initialise tracing in a root layout?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two reasons. A layout runs per request, so you would be re-initialising constantly and guarding it with a global flag. And it runs far too late — instrumentation agents work by patching modules like http and the database driver as they are imported, and by the time a layout renders those are already loaded. register is the hook that runs before any of that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the context argument give you?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The router kind, the route path, a route type of render, route, action or proxy, and for renders a source that distinguishes a Server Component render from ordinary server rendering. Plus a revalidate reason. That is enough to tag and route alerts sensibly instead of dumping everything into one bucket.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it replace error boundaries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it renders nothing and the user experiences no difference whether it exists or not. Boundaries decide what the user sees; instrumentation decides what you find out. They are complementary, and the link between them is the digest shown to the user matching the entry you logged server-side.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NEXT_RUNTIME</code> check?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the file can be loaded in both the Node runtime and the edge runtime, and most tracing SDKs depend on Node built-ins that do not exist on the edge. Importing unconditionally breaks the edge build, so the conditional dynamic import is the standard shape rather than a defensive extra.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What still is not covered?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Everything that happens in the browser — a client render error, an event handler throwing, a failed fetch from a client component. Those need a client-side reporter, plus React 19's onUncaughtError and onCaughtError on the root. Instrumentation is one half of the picture and it is explicitly the server half.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Instrumentation file** | Where Next.js looks for <code>register</code> and <code>onRequestError</code> |
| **<code>register()</code>** | Runs once at server start, before any request |
| **<code>onRequestError</code>** | Called for server-side errors, with route context |
| **<code>routeType</code>** | render, route, action or proxy |
| **Digest** | The hash the user sees, matching your log entry |
| **<code>NEXT_RUNTIME</code>** | Whether this is the Node or edge runtime |

---
**Conclusion:** the instrumentation file is where server-side observability belongs. **<code>register()</code>** runs **once at server start, before any request** — early enough for an APM agent to patch modules before they are imported — and **<code>onRequestError</code>** reports server-side failures including the ones no boundary can see, such as route handlers and Server Actions. Read from the installed <strong>next@16.3.4</strong> type definitions, its third argument carries <code>routerKind</code>, <code>routePath</code>, a <code>routeType</code> of <code>render | route | action | proxy</code>, and a <code>renderSource</code> for renders — enough to route alerts by what actually broke. It is **observability, not error handling**: the user still needs boundaries, and the two are joined by the **digest** shown in production matching your server log entry. **Not executed here** — no instrumentation file and no tracing SDK in this repo — so the signatures come from the shipped types rather than a runtime measurement.`,
    examples: [
      {
        label: "The two exports, with the context fields taken from the shipped types",
        runnable: true,
        code: `import { useState } from "react";

// Not runnable as Next.js code in a browser playground — this is an annotated
// reference plus a live explorer for the context object. The type shapes below
// are read from next/dist/server/instrumentation/types.d.ts in next@16.3.4.

const FILE = \`// instrumentation.ts  — project root, or src/
import type { Instrumentation } from "next";

export async function register() {
  // Runs ONCE when the server process starts, before any request is handled.
  // That timing is the point: an APM agent patches modules like http and your
  // database driver as they are imported, so it must run before they are.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Most tracing SDKs are Node-only, so import conditionally or the edge
    // build breaks.
    await import("./instrumentation.node");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,      // unknown
  request,    // { path, method, headers }
  context,    // the useful one — see the table below
) => {
  await sendToMonitoring({
    message: String(error),
    path: request.path,
    method: request.method,
    router: context.routerKind,
    route: context.routePath,
    type: context.routeType,
    source: context.renderSource,
    revalidate: context.revalidateReason,
  });
};\`;

// Straight from the installed package's type definitions.
const CONTEXT_FIELDS = [
  ["routerKind", "'Pages Router' | 'App Router'", "which router produced it"],
  ["routePath", "string", "the route that failed"],
  ["routeType", "'render' | 'route' | 'action' | 'proxy'", "page render, route handler, Server Action, or proxy"],
  ["renderSource", "'react-server-components' | 'react-server-components-payload' | 'server-rendering'", "only present for renders"],
  ["revalidateReason", "'on-demand' | 'stale' | undefined", "why a revalidation was running"],
];

const SCENARIOS = [
  { label: "a Server Component threw", routeType: "render", renderSource: "react-server-components", caught: true },
  { label: "a route handler threw", routeType: "route", renderSource: "—", caught: false },
  { label: "a Server Action failed", routeType: "action", renderSource: "—", caught: false },
  { label: "a client render error", routeType: "(not server-side)", renderSource: "—", caught: true },
];

export default function App() {
  const [i, setI] = useState(0);
  const s = SCENARIOS[i];

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6, maxWidth: 640 }}>
      <pre style={{ background: "#f6f6f8", border: "1px solid #ddd", borderRadius: 8,
                    padding: 12, fontSize: 12, overflowX: "auto", whiteSpace: "pre-wrap" }}>
{FILE}
      </pre>

      <h4 style={{ margin: "14px 0 6px" }}>The context argument</h4>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <tbody>
          {CONTEXT_FIELDS.map(([name, type, note]) => (
            <tr key={name} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "3px 8px 3px 0", whiteSpace: "nowrap" }}><code>{name}</code></td>
              <td style={{ padding: "3px 8px 3px 0", color: "#4f46e5" }}><code>{type}</code></td>
              <td style={{ color: "#666" }}>{note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 style={{ margin: "14px 0 6px" }}>Who sees what</h4>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {SCENARIOS.map((sc, n) => (
          <button key={sc.label} onClick={() => setI(n)} style={{ fontWeight: n === i ? "bold" : "normal", fontSize: 12 }}>
            {sc.label}
          </button>
        ))}
      </div>
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, fontSize: 13 }}>
        <div>error boundary shows a fallback: <strong style={{ color: s.caught ? "#161" : "#a33" }}>{s.caught ? "yes" : "no"}</strong></div>
        <div>
          onRequestError fires:{" "}
          <strong style={{ color: s.routeType === "(not server-side)" ? "#a33" : "#161" }}>
            {s.routeType === "(not server-side)" ? "no — server-side only" : "yes"}
          </strong>
        </div>
        <div style={{ color: "#666" }}>
          context.routeType = <code>{s.routeType}</code> · renderSource = <code>{s.renderSource}</code>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "#666" }}>
        The two middle scenarios are the reason this hook exists: a route
        handler and a Server Action fail outside any render, so no boundary is
        in the window and the user-facing mechanism reports nothing at all.
      </p>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
