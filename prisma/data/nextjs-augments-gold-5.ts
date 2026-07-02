/**
 * Next.js Phase — Batch 5 (Memoization, Next 15 caching, Server Actions).
 * See nextjs-augments-gold-1.ts for conventions.
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is request memoization in Next.js?",
    answer: `**TL;DR.** Within a **single server render**, Next.js **memoizes identical <code>fetch()</code> calls** (same URL + options) so multiple components requesting the same data trigger only **one** network call. This lets you fetch **where you need data** without prop-drilling or manual deduping.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Three components fetch the same URL, deduped to one call'>
  <rect class='d-box' x='20' y='30' width='120' height='28' rx='6'/><text class='d-sub' x='80' y='49' text-anchor='middle'>layout fetch /u</text>
  <rect class='d-box' x='20' y='62' width='120' height='28' rx='6'/><text class='d-sub' x='80' y='81' text-anchor='middle'>page fetch /u</text>
  <rect class='d-box' x='20' y='94' width='120' height='28' rx='6'/><text class='d-sub' x='80' y='113' text-anchor='middle'>header fetch /u</text>
  <path class='d-edge-accent' d='M142 44 L200 66' marker-end='url(#ne1)'/>
  <path class='d-edge-accent' d='M142 76 H200' marker-end='url(#ne1)'/>
  <path class='d-edge-accent' d='M142 108 L200 86' marker-end='url(#ne1)'/>
  <rect class='d-box-accent' x='202' y='55' width='130' height='44' rx='8'/><text class='d-text' x='267' y='81' text-anchor='middle'>1 actual call</text>
  <defs><marker id='ne1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** During one render pass, if a layout, a page, and a component all <code>fetch('/api/user')</code> with the same options, Next.js issues the request **once** and shares the result — a per-render cache keyed by URL+options. This is distinct from the **Data Cache** (which persists across requests): memoization lives only for the **current render** and is automatic for <code>fetch</code>. The benefit is architectural — you can fetch data **exactly where a component needs it** (colocated), rather than fetching once high up and threading props down, and you won't pay for duplicate requests. For **non-<code>fetch</code>** data access (ORM/DB queries), wrap the function in React's <code>cache()</code> to get the same per-render deduping. It only dedupes <code>GET</code>-like reads with identical inputs.

### Memoization vs Data Cache
| | Request Memoization | Data Cache |
| --- | --- | --- |
| Lifetime | one render | across requests/deploys |
| Auto for | <code>fetch</code> | <code>fetch</code> (opt-in) |
| Non-fetch | React <code>cache()</code> | <code>unstable_cache</code> |
| Purpose | dedupe in render | reuse data over time |

> **Interview tip:** Distinguish it from the Data Cache (**per-render** vs persistent) and note it enables **colocated fetching** without prop-drilling. Use React <code>cache()</code> to dedupe non-fetch reads.`,
    examples: [
      {
        label: "Colocated fetches deduped; cache() for DB",
        tech: "tsx",
        runnable: false,
        code: `// Both call getUser() in the same render → one DB query
import { cache } from 'react';
export const getUser = cache(async (id: string) => db.user.find(id));

// layout.tsx and page.tsx can each await getUser(id) freely — deduped.
async function Layout({ params }) { const u = await getUser(params.id); /* ... */ }
async function Page({ params })   { const u = await getUser(params.id); /* same, cached */ }`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle loading and error states for data fetching in Next.js?",
    answer: `**TL;DR.** Use <code>loading.js</code> (or <code>&lt;Suspense fallback&gt;</code>) to show **loading UI** while Server Component data resolves, and <code>error.js</code> to catch fetch/render **failures** with a retry. For **expected** states (empty, not found), handle them in code — often with <code>notFound()</code>.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='loading, error and not-found cover the fetch lifecycle'>
  <rect class='d-box-accent' x='20' y='55' width='120' height='40' rx='8'/><text class='d-sub' x='80' y='79' text-anchor='middle'>loading.js</text>
  <rect class='d-box' x='170' y='55' width='120' height='40' rx='8'/><text class='d-sub' x='230' y='79' text-anchor='middle'>error.js + reset</text>
  <rect class='d-box-muted' x='320' y='55' width='120' height='40' rx='8'/><text class='d-sub' x='380' y='79' text-anchor='middle'>notFound()</text>
  <text class='d-sub' x='80' y='120' text-anchor='middle'>pending</text>
  <text class='d-sub' x='230' y='120' text-anchor='middle'>unexpected error</text>
  <text class='d-sub' x='380' y='120' text-anchor='middle'>expected empty</text>
</svg>

**How it works.** The App Router maps each state to a React primitive. **Loading**: add <code>loading.tsx</code> to wrap the segment in Suspense (streamed fallback), or place explicit <code>&lt;Suspense&gt;</code> around individual slow components so the rest of the page renders immediately. **Errors**: <code>error.tsx</code> is a Client Component **error boundary** catching thrown errors (including from failed fetches in Server Components) and offering <code>reset()</code> to retry; <code>global-error.tsx</code> covers the root. **Expected outcomes** (a missing record, empty list) aren't "errors" — handle them in the component: call <code>notFound()</code> for 404 semantics or render an empty state. For **client-side** fetching (SWR/React Query), you use the hook's <code>isLoading</code>/<code>error</code> flags instead. The principle: use framework boundaries for **unexpected** failures and explicit code for **expected** states.

### State → mechanism
| State | Mechanism |
| --- | --- |
| loading | <code>loading.js</code> / <code>&lt;Suspense&gt;</code> |
| unexpected error | <code>error.js</code> (+ reset) |
| not found (expected) | <code>notFound()</code> |
| client fetch states | SWR/RQ <code>isLoading</code>/<code>error</code> |

> **Interview tip:** Separate **expected** (empty/404 → handle in code) from **unexpected** (throw → <code>error.js</code>), and map loading to **Suspense**. That distinction shows real App Router fluency.`,
    examples: [
      {
        label: "Loading + error + expected empty",
        tech: "tsx",
        runnable: false,
        code: `// app/products/loading.tsx → streamed fallback
export default function Loading() { return <Skeleton />; }

// app/products/page.tsx
import { notFound } from 'next/navigation';
export default async function Page() {
  const products = await getProducts();       // throw → caught by error.tsx
  if (products.length === 0) return <Empty />; // expected: handle inline
  return <Grid products={products} />;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What changed about caching defaults in Next.js 15?",
    answer: `**TL;DR.** Next.js 15 made caching **opt-in rather than aggressive-by-default**: <code>fetch</code> and <code>GET</code> Route Handlers are **no longer cached** by default, and the client **Router Cache no longer reuses page segments** by default (<code>staleTime</code> 0). You now opt **into** caching explicitly when you want it.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Next 14 cached by default versus Next 15 opt-in caching'>
  <rect class='d-box-muted' x='20' y='30' width='200' height='100' rx='10'/><text class='d-text' x='120' y='54' text-anchor='middle'>Next 14</text><text class='d-sub' x='120' y='78' text-anchor='middle'>fetch cached by default</text><text class='d-sub' x='120' y='98' text-anchor='middle'>Router reuses segments</text><text class='d-sub' x='120' y='118' text-anchor='middle'>surprising staleness</text>
  <rect class='d-box-accent' x='240' y='30' width='200' height='100' rx='10'/><text class='d-text' x='340' y='54' text-anchor='middle'>Next 15</text><text class='d-sub' x='340' y='78' text-anchor='middle'>fetch/GET uncached default</text><text class='d-sub' x='340' y='98' text-anchor='middle'>Router staleTime 0</text><text class='d-sub' x='340' y='118' text-anchor='middle'>opt in to cache</text>
</svg>

**How it works.** Earlier App Router versions cached **aggressively** — <code>fetch</code> defaulted to <code>force-cache</code>, <code>GET</code> Route Handlers were cached, and the client Router Cache reused page data — which caused confusing "why is my data stale?" bugs. **Next.js 15 flipped these defaults to be less surprising**: <code>fetch</code> is **uncached** unless you set <code>cache: 'force-cache'</code> or <code>next: { revalidate }</code>; <code>GET</code> Route Handlers aren't cached unless you opt in (e.g. <code>export const dynamic = 'force-static'</code>); and the client Router Cache's page-segment <code>staleTime</code> defaults to **0**, so navigating re-fetches fresh data (layouts still cached). You can still cache everything you want — the change just makes **freshness the default** and caching **explicit**. (Other 15 changes: async <code>cookies</code>/<code>headers</code>/<code>params</code>/<code>searchParams</code> APIs.) Configure Router staleness via <code>experimental.staleTimes</code>.

### Default flips in Next 15
| Thing | Was | Now |
| --- | --- | --- |
| <code>fetch</code> | cached | uncached |
| <code>GET</code> handlers | cached | uncached |
| Router page segments | reused | staleTime 0 |
| philosophy | cache-first | opt-in caching |

> **Interview tip:** Summarize it as **"caching became opt-in"** in Next 15 (fetch/GET uncached, Router staleTime 0) to fix stale-data surprises — plus the **async request APIs** change.`,
    examples: [
      {
        label: "Opt back into caching in Next 15",
        tech: "tsx",
        runnable: false,
        code: `// Next 15: fetch is NOT cached by default — opt in explicitly:
await fetch('/api/posts', { next: { revalidate: 60 } });   // ISR
await fetch('/api/config', { cache: 'force-cache' });       // persist

// Cache a GET Route Handler:
// app/api/posts/route.ts
export const dynamic = 'force-static';`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are Server Actions in Next.js and how do they work?",
    answer: `**TL;DR.** **Server Actions** are async functions marked <code>'use server'</code> that **run on the server** and can be called directly from components/forms — Next.js creates an **RPC endpoint** under the hood. They handle **mutations** (DB writes, revalidation) without you writing an API route.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Client invokes a use server function that runs on the server'>
  <rect class='d-box' x='20' y='52' width='130' height='46' rx='8'/><text class='d-text' x='85' y='73' text-anchor='middle'>form / button</text><text class='d-sub' x='85' y='90' text-anchor='middle'>calls action</text>
  <path class='d-edge-accent' d='M152 75 H210' marker-end='url(#ne2)'/>
  <text class='d-sub' x='181' y='66' text-anchor='middle'>RPC</text>
  <rect class='d-box-accent' x='212' y='45' width='150' height='60' rx='8'/><text class='d-text' x='287' y='70' text-anchor='middle'>'use server' fn</text><text class='d-sub' x='287' y='88' text-anchor='middle'>DB write + revalidate</text>
  <defs><marker id='ne2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** You define an async function with the <code>'use server'</code> directive (at the top of a file, or inline in a Server Component). Next.js registers it as a **server endpoint** and gives the client a **reference**; when called (from a form <code>action</code>, an <code>onClick</code>, or a transition), the arguments are serialized, the function executes **on the server** (with full DB/secret access), and the result comes back. This replaces hand-written API routes for **your own UI mutations**: create/update/delete, then <code>revalidatePath</code>/<code>revalidateTag</code> or <code>redirect</code>. Because they integrate with forms, they enable **progressive enhancement** (work before JS loads) and pair with <code>useActionState</code>/<code>useOptimistic</code> for pending/optimistic UI. Security note: they're **public endpoints**, so you must authenticate/authorize and validate inputs inside each one.

### Server Action facts
| Aspect | Detail |
| --- | --- |
| Directive | <code>'use server'</code> |
| Runs | on the server (RPC) |
| Use for | mutations + revalidation |
| Pairs with | forms, <code>useActionState</code>, <code>useOptimistic</code> |

> **Interview tip:** Frame them as **built-in RPC for mutations** — no API route needed — that also enable **progressive-enhancement forms**. Always add the caveat: they're **public endpoints** needing authz + validation.`,
    examples: [
      {
        label: "A Server Action mutating + revalidating",
        tech: "tsx",
        runnable: false,
        code: `// app/actions.ts
'use server';
import { revalidatePath } from 'next/cache';

export async function addTodo(formData: FormData) {
  const title = String(formData.get('title'));
  await db.todo.create({ data: { title } });   // runs on the server
  revalidatePath('/todos');                     // refresh the list
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle forms with Server Actions in Next.js (progressive enhancement)?",
    answer: `**TL;DR.** Pass a Server Action to a <code>&lt;form action={...}&gt;</code>; it receives <code>FormData</code> and runs on the server. Because it works **without client JS**, forms are **progressively enhanced** — they submit even before hydration — and you pair it with <code>useActionState</code> for pending/error UI.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Form action posts FormData to a server action, works without JS'>
  <rect class='d-box-accent' x='20' y='52' width='140' height='46' rx='8'/><text class='d-text' x='90' y='73' text-anchor='middle'>&lt;form action&gt;</text><text class='d-sub' x='90' y='90' text-anchor='middle'>FormData</text>
  <path class='d-edge-accent' d='M162 75 H230' marker-end='url(#ne3)'/>
  <text class='d-sub' x='196' y='66' text-anchor='middle'>submit (JS or not)</text>
  <rect class='d-box' x='232' y='52' width='150' height='46' rx='8'/><text class='d-text' x='307' y='73' text-anchor='middle'>server action</text><text class='d-sub' x='307' y='90' text-anchor='middle'>validate + mutate</text>
  <defs><marker id='ne3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** In a Server Component, you can bind an action straight to a form: <code>&lt;form action={createPost}&gt;</code>. On submit, the browser (or Next's client runtime) sends the form's <code>FormData</code> to the server action, which validates and mutates, then revalidates or redirects. The key advantage is **progressive enhancement**: because it's a real form POST, it works even if JavaScript hasn't loaded or is disabled — hydration only **enhances** it (client-side transition, no full reload). For UX you add <code>useActionState(action, initialState)</code> (Client Component) to track the action's **return value** and **pending** status for inline errors and disabled buttons, and <code>useFormStatus()</code> inside the form for a submit spinner. Always **validate** the FormData server-side (zod) and check auth — never trust the client.

### Form + action pieces
| Piece | Role |
| --- | --- |
| <code>&lt;form action={fn}&gt;</code> | wire action, FormData |
| progressive enhancement | works pre-hydration |
| <code>useActionState</code> | result + pending state |
| <code>useFormStatus</code> | submit spinner |

> **Interview tip:** The headline is **progressive enhancement** — the form submits without JS. Add <code>useActionState</code>/<code>useFormStatus</code> for pending/error UI and stress **server-side validation**.`,
    examples: [
      {
        label: "Form + useActionState for errors/pending",
        tech: "tsx",
        runnable: false,
        code: `'use client';
import { useActionState } from 'react';
import { createPost } from './actions';

export function PostForm() {
  const [state, formAction, pending] = useActionState(createPost, { error: null });
  return (
    <form action={formAction}>
      <input name="title" required />
      {state.error && <p>{state.error}</p>}
      <button disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>
    </form>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you do optimistic updates in Next.js (useOptimistic, useActionState)?",
    answer: `**TL;DR.** <code>useOptimistic</code> applies a **temporary optimistic state immediately** while the Server Action is pending, **reverting** if it fails. <code>useActionState</code> tracks the action's **result and pending status**. Together they give responsive forms/mutations with proper **rollback**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Optimistic UI shown instantly, confirmed or reverted after the action'>
  <rect class='d-box-accent' x='20' y='52' width='130' height='46' rx='8'/><text class='d-text' x='85' y='73' text-anchor='middle'>optimistic UI</text><text class='d-sub' x='85' y='90' text-anchor='middle'>shown instantly</text>
  <path class='d-edge-accent' d='M152 75 H210' marker-end='url(#ne4)'/>
  <rect class='d-box' x='212' y='52' width='120' height='46' rx='8'/><text class='d-text' x='272' y='73' text-anchor='middle'>action runs</text><text class='d-sub' x='272' y='90' text-anchor='middle'>server confirms</text>
  <path class='d-edge-dashed' d='M334 75 H392' marker-end='url(#ne4)'/>
  <rect class='d-box-muted' x='394' y='52' width='56' height='46' rx='8'/><text class='d-sub' x='422' y='79' text-anchor='middle'>revert on fail</text>
  <defs><marker id='ne4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Optimistic UI shows the **expected result immediately** rather than waiting for the server round-trip, which makes mutations feel instant. <code>useOptimistic(state, updateFn)</code> gives you an optimistic copy of state plus a function to apply a predicted change; you render the optimistic value, dispatch the change, and call the Server Action. If the action **succeeds**, the revalidated real data replaces the optimistic value; if it **fails or the component re-renders with real state**, React automatically **reverts** to the actual state — no manual rollback. Pair with <code>useActionState</code> to surface the action's return (errors) and <code>pending</code> flag. The pattern shines for likes, todos, comments — high-frequency actions where latency would otherwise feel sluggish. Always reconcile with server truth (revalidate) so the optimistic guess doesn't drift.

### Optimistic hooks
| Hook | Role |
| --- | --- |
| <code>useOptimistic</code> | instant predicted state + auto-revert |
| <code>useActionState</code> | result + pending status |
| revalidate after | reconcile with server truth |
| best for | likes/todos/comments |

> **Interview tip:** Emphasize <code>useOptimistic</code> gives **instant UI with automatic rollback** on failure/re-render, and you still **revalidate** to reconcile with server state. Pair with <code>useActionState</code> for pending/errors.`,
    examples: [
      {
        label: "Optimistic like button",
        tech: "tsx",
        runnable: false,
        code: `'use client';
import { useOptimistic } from 'react';
import { toggleLike } from './actions';

export function Like({ post }) {
  const [likes, addOptimistic] = useOptimistic(post.likes);
  return (
    <form action={async () => { addOptimistic(likes + 1); await toggleLike(post.id); }}>
      <button>♥ {likes}</button>   {/* updates instantly, reverts if action fails */}
    </form>
  );
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you revalidate data after a mutation in Next.js?",
    answer: `**TL;DR.** After a Server Action mutates data, call <code>revalidatePath()</code> or <code>revalidateTag()</code> to invalidate the affected caches, or <code>router.refresh()</code> on the client, so the UI reflects the change. Redirecting with <code>redirect()</code> also re-renders the target route fresh.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Mutation followed by revalidate refreshes the UI'>
  <rect class='d-box-accent' x='20' y='52' width='120' height='46' rx='8'/><text class='d-text' x='80' y='73' text-anchor='middle'>mutation</text><text class='d-sub' x='80' y='90' text-anchor='middle'>DB write</text>
  <path class='d-edge-accent' d='M142 75 H200' marker-end='url(#ne5)'/>
  <rect class='d-box' x='202' y='52' width='150' height='46' rx='8'/><text class='d-text' x='277' y='73' text-anchor='middle'>revalidatePath/Tag</text><text class='d-sub' x='277' y='90' text-anchor='middle'>purge caches</text>
  <path class='d-edge-accent' d='M354 75 H402' marker-end='url(#ne5)'/>
  <rect class='d-box-muted' x='404' y='52' width='46' height='46' rx='8'/><text class='d-sub' x='427' y='79' text-anchor='middle'>fresh UI</text>
  <defs><marker id='ne5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** A mutation changes server data, but cached routes/data (Data Cache, Full Route Cache, client Router Cache) may still show the **old** value — so you explicitly invalidate. From a **Server Action**: call <code>revalidatePath('/todos')</code> to refresh a specific route, or <code>revalidateTag('todos')</code> to refresh **all** data tagged that way (more flexible when many pages share the data). These mark caches stale so the next render regenerates; they also clear matching client Router Cache entries. If the action **navigates** (e.g. after creating a resource), <code>redirect('/todos/123')</code> renders the destination fresh. From the **client** (e.g. after a non-action mutation), <code>router.refresh()</code> re-fetches the current route's server data. The pattern: **mutate → revalidate/redirect → UI reflects truth**, optionally with an optimistic update in between for instant feedback.

### Post-mutation refresh
| Tool | Refreshes |
| --- | --- |
| <code>revalidateTag(tag)</code> | all data with tag |
| <code>revalidatePath(path)</code> | one route |
| <code>redirect(url)</code> | target route fresh |
| <code>router.refresh()</code> | current route (client) |

> **Interview tip:** The loop is **mutate → revalidate → fresh UI**. Prefer **tags** when data spans pages; use <code>router.refresh()</code> for client-triggered refreshes and <code>redirect()</code> when navigating after the mutation.`,
    examples: [
      {
        label: "Mutate then revalidate + redirect",
        tech: "tsx",
        runnable: false,
        code: `'use server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createTodo(data) {
  const todo = await db.todo.create({ data });
  revalidateTag('todos');            // refresh anything tagged 'todos'
  revalidatePath('/todos');          // and this specific route
  redirect('/todos/' + todo.id);     // navigate to the fresh page
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are the security considerations for Server Actions in Next.js?",
    answer: `**TL;DR.** Server Actions are **public HTTP endpoints**, so you must **authenticate/authorize inside each one**, **validate all inputs** (zod), and **never trust client-provided ids**. Next.js adds protections (encrypted action ids, same-origin checks), but auth and validation are **your** responsibility.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Every server action must check auth, validate input, and authorize'>
  <rect class='d-box' x='20' y='55' width='100' height='44' rx='8'/><text class='d-sub' x='70' y='81' text-anchor='middle'>authn</text>
  <path class='d-edge-accent' d='M122 77 H150' marker-end='url(#ne6)'/>
  <rect class='d-box' x='152' y='55' width='100' height='44' rx='8'/><text class='d-sub' x='202' y='81' text-anchor='middle'>validate</text>
  <path class='d-edge-accent' d='M254 77 H282' marker-end='url(#ne6)'/>
  <rect class='d-box' x='284' y='55' width='100' height='44' rx='8'/><text class='d-sub' x='334' y='81' text-anchor='middle'>authz</text>
  <path class='d-edge-accent' d='M386 77 H414' marker-end='url(#ne6)'/>
  <rect class='d-box-accent' x='416' y='55' width='34' height='44' rx='8'/><text class='d-sub' x='433' y='81' text-anchor='middle'>run</text>
  <defs><marker id='ne6' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** It's tempting to treat a Server Action like a trusted internal function, but Next.js exposes it as a **callable endpoint** anyone can hit with arbitrary arguments. So each action must, on its own: **authenticate** (read the session — don't assume the caller is logged in), **authorize** (verify this user may perform this action on this resource — never rely on the UI having hidden a button), **validate/sanitize** every argument (parse <code>FormData</code>/args with zod; reject bad shapes), and **not trust client-sent ownership** (derive the user from the session, look up the resource, confirm it belongs to them). Next.js provides defenses — action ids are non-guessable and encrypted, dead-code-eliminated when unused, and there are **origin/CSRF** checks for the POST — but those don't replace app-level authz. Also avoid leaking secrets in return values and rate-limit sensitive actions. Treat every action like a public API route.

### Action security checklist
| Do | Why |
| --- | --- |
| authenticate in the action | callable by anyone |
| authorize per resource | valid session ≠ permission |
| validate inputs (zod) | reject malformed/malicious args |
| derive ids from session | don't trust client ids |

> **Interview tip:** The one-liner: **treat a Server Action like a public API endpoint** — authn + authz + input validation inside it. Next's encrypted ids/CSRF checks help but don't replace app-level authorization.`,
    examples: [
      {
        label: "A hardened Server Action",
        tech: "tsx",
        runnable: false,
        code: `'use server';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const Schema = z.object({ postId: z.string().uuid() });

export async function deletePost(input: unknown) {
  const session = await auth();
  if (!session) throw new Error('unauthenticated');          // authn
  const { postId } = Schema.parse(input);                     // validate
  const post = await db.post.find(postId);
  if (post.authorId !== session.user.id) throw new Error('forbidden'); // authz
  await db.post.delete(postId);
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do Server Actions differ from Route Handlers in Next.js?",
    answer: `**TL;DR.** **Server Actions** are **RPC-like** functions co-located with components, ideal for **form mutations** and progressive enhancement. **Route Handlers** (<code>route.js</code>) are **explicit HTTP endpoints** for webhooks, third-party clients, or public APIs. Use **Actions** for your own UI mutations, **Handlers** for external/HTTP needs.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Server Actions for internal UI mutations, Route Handlers for external HTTP'>
  <rect class='d-box-accent' x='20' y='30' width='200' height='100' rx='10'/><text class='d-text' x='120' y='54' text-anchor='middle'>Server Actions</text><text class='d-sub' x='120' y='78' text-anchor='middle'>RPC, co-located</text><text class='d-sub' x='120' y='98' text-anchor='middle'>forms + mutations</text><text class='d-sub' x='120' y='118' text-anchor='middle'>your own UI</text>
  <rect class='d-box-muted' x='240' y='30' width='200' height='100' rx='10'/><text class='d-text' x='340' y='54' text-anchor='middle'>Route Handlers</text><text class='d-sub' x='340' y='78' text-anchor='middle'>explicit HTTP verbs</text><text class='d-sub' x='340' y='98' text-anchor='middle'>webhooks / public API</text><text class='d-sub' x='340' y='118' text-anchor='middle'>external clients</text>
</svg>

**How it works.** Both run on the server, but they suit different callers. **Server Actions** are the ergonomic choice for **your app's own mutations**: bind them to forms/buttons, get progressive enhancement, integrate with <code>useActionState</code>/<code>useOptimistic</code>, and revalidate — no manual endpoint wiring, arguments are typed and serialized for you. **Route Handlers** define real **REST/HTTP** endpoints (<code>GET</code>/<code>POST</code>/etc. exports in <code>route.ts</code>) using Web <code>Request</code>/<code>Response</code>; use them when a **non-UI or external** consumer needs a stable URL: third-party **webhooks** (Stripe), **public/mobile APIs**, OAuth callbacks, cron endpoints, or when you need full control over headers/status/streaming. Rule of thumb: **internal UI mutation → Server Action; external or HTTP contract → Route Handler**. You can also call a Route Handler from a client fetch when you want explicit HTTP semantics.

### Actions vs Handlers
| | Server Actions | Route Handlers |
| --- | --- | --- |
| Style | RPC, co-located | HTTP endpoint |
| Caller | your UI/forms | external/any HTTP |
| Progressive enh. | ✅ | ❌ |
| Use for | mutations | webhooks/public API |

> **Interview tip:** Decide by **caller**: your own UI mutation → **Server Action**; webhook/public/mobile/OAuth → **Route Handler**. Actions give progressive enhancement; handlers give explicit HTTP contracts.`,
    examples: [
      {
        label: "Same intent, two mechanisms",
        tech: "tsx",
        runnable: false,
        code: `// Server Action — internal UI mutation
'use server';
export async function subscribe(formData: FormData) { /* ... */ }

// Route Handler — external webhook (Stripe)
// app/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const event = verifyStripe(await req.text(), req.headers);
  // ... handle event
  return Response.json({ received: true });
}`,
      },
    ],
  },
];

export default augments;
