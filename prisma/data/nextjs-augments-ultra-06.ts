/**
 * Next.js ULTRA — batch 06: Server Actions (how they work, forms, optimistic UI, security), Server Actions vs Route Handlers,
 * Route Handlers vs Pages API routes, Middleware/Proxy, runtimes.
 * Generated from markdown sources by a build script; Verified blocks are real output from a Next.js 16.3.4 lab (next build /
 * next start, curl against Route Handlers, proxy.ts and action ids, and a real browser session for useOptimistic).
 */
import type { NextAugment } from "./nextjs-augments.types";

const augments: NextAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Server Actions in Next.js and how do they work?",
    seoDescription: "A Server Action is a server function the client calls by id with a POST; it mutates data and revalidates in one round trip. Observed on Next 16.3.4.",
    description: `**Question presented to candidate:**
"Explain what happens, end to end, when a user clicks a button that calls a Server Action. What travels over the network, and what does the action return?"

**What a strong answer should cover:**
- A Server Action (React Server Function) is an async function marked with 'use server'; it runs only on the server.
- The client never gets the code: it gets a reference (an action id) and calls it with a POST to the current route, carrying the arguments.
- The response is an RSC stream with the return value, and it can also carry a fresh render of the page when the action revalidates.
- Actions can be passed to forms (\`action={fn}\`), called from event handlers, or used with \`useActionState\`.
- Every action is a public HTTP endpoint: authenticate and authorise inside it; the client dispatches actions one at a time.

**Clarifying questions expected:**
- "Is this a mutation or a read?" — actions are designed for mutations.
- "Who is allowed to trigger it?" — the check belongs inside the action.

**Code / implementation expected:** Yes — an actions file, a form and a button calling it.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

A Server Action is like a numbered intercom button in a hotel room. The guest does not get access to the kitchen; they get a button labelled "room service" that sends a request to the kitchen, which does the work and sends back the result. Anyone who learns the button number can press it from the corridor, which is why the kitchen must still check which room is ordering.

## 2. The Core Idea

📌 **Interview term: Server Action** — an async function marked with 'use server' that runs on the server and can be called from the client by reference; React calls these Server Functions.

📌 **Interview term: Action id** — the encrypted, build-specific identifier the client uses to call an action; it is sent in the Next-Action request header.

📌 **Interview term: 'use server'** — a directive at the top of a file (all exports become actions) or at the top of an async function (that function becomes an action).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="One click, one POST, one round trip. client, POST /same-route, response">
  <defs>
    <marker id="nx01khmk-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One click, one POST, one round trip</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="111.33333333333333" y="82" text-anchor="middle">client</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">calls the action reference</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">id + arguments sent</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx01khmk-arrow)"/>
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
    <text class="d-text" x="330" y="82" text-anchor="middle">POST /same-route</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">Next-Action header</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">action runs on the server</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx01khmk-arrow)"/>
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
    <text class="d-text" x="548.6666666666666" y="82" text-anchor="middle">response</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">RSC stream: return value</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">plus UI if revalidated</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">the client never gets the function code, only an id that anyone can call: check auth inside</text>
  </g>
</svg>

A Server Action removes the hand-written API layer, not the API itself. The endpoint still exists; Next.js just generates and names it for you.

## 3. Where actions can be used

| Use | Example |
| :--- | :--- |
| Form action (works without JavaScript) | \`<form action={createPost}>\` |
| Event handler in a Client Component | \`onClick={() => deleteItem(id)}\` |
| With state and pending status | \`const [state, formAction, pending] = useActionState(action, initial)\` |
| Passed as a prop from a Server Component | \`<LikeButton onLike={likePost} />\` |
| Inline in a Server Component | \`async function save() { "use server"; ... }\` |

## 4. What the action should do

Validate the input (it arrives from the network), check the session, perform the mutation, then call \`revalidatePath\`, \`revalidateTag\`, \`updateTag\` or \`redirect\`. The revalidation rides back in the same response, so the UI updates without a second request. Security details are in [Server Action security](/interview-question/what-are-the-security-considerations-for-server-actions-in-next-js), and the comparison with endpoints you write yourself in [Server Actions vs Route Handlers](/interview-question/how-do-server-actions-differ-from-route-handlers-in-next-js).

## 5. Verified — What Travels Over the Network (Next.js 16.3.4, next start)

A click that called a \`useActionState\` action produced one POST to the page URL; its response body was an RSC stream with the return value on row 1:

\`\`\`
0:{"a":"$@1","f":"","q":"","i":false,"b":"3kud7HFKojFa3yG3hwQ0L"}
1:{"count":1}
\`\`\`

The action is reachable by its id alone: the id of \`deleteItem\` was read from a public client chunk and called with \`curl\`:

\`\`\`
action id of deleteItem, read from a public client chunk: 40f4f5e2ef4b... (42 hex chars)
curl, no cookies, no UI (deleteItem('1'))    -> HTTP 200  "deleted":true,"remaining":1
same request, Origin: https://evil.example   -> HTTP 500  the body is only an error row E{"digest":...}; the action did not run
same request, Origin: http://localhost:4100  -> HTTP 200  "deleted":false,"remaining":1

server log for the two requests:
⚠ Missing \`origin\` header from a forwarded Server Actions request.        (the curl call without Origin: it still ran)
\`x-forwarded-host\` header with value \`localhost:4100\` does not match \`origin\` header with value \`evil.example\` from a forwarded Server Actions request. Aborting the action.
\`\`\`

And form actions work before any JavaScript runs:

\`\`\`
GET /actions (server-rendered HTML, no JavaScript involved), the first form:
  <form action="" encType="multipart/form-data" method="POST">
  hidden inputs: $ACTION_ID_<id>, text
a plain multipart POST of those fields (what a browser does with JavaScript disabled):
  -> HTTP 200; items before 1, after 2
the second form uses an inline action that closes over a server variable (closure-secret-...):
  secret text present anywhere in the HTML: false
  bound-argument fields sent instead: $ACTION_REF_2, $ACTION_2:1, $ACTION_2:0, $ACTION_2:2, x
\`\`\`

## 6. Common Pitfalls

- **Treating an action as private.** It is an HTTP endpoint; the lab called one with curl and no session. Check authentication and authorisation inside every action.
- **Trusting argument types.** Arguments are deserialized from the request; validate them (for example with zod) before use.
- **Using actions for reads.** The client runs them one at a time; parallel data loading belongs in Server Components or Route Handlers.
- **Returning sensitive data.** The return value is sent to the browser; return only what the UI needs.
- **Forgetting to revalidate.** Without revalidatePath or a tag call, the page keeps showing the old data.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">A Server Action is an async function marked 'use server' that runs only on the server.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">The client holds an id, not the code; calling it sends a POST to the current route with a Next-Action header and the arguments.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">The response is an RSC stream with the return value, and can include fresh UI when the action revalidates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Use them from forms (works without JavaScript), event handlers, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useActionState</code> for pending and result state.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Every action is a public endpoint: validate input and check the session inside it, as the curl replay in the lab shows.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the client know which function to call?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The build replaces the function with a reference containing an encrypted, build-specific id. Calls send that id in the Next-Action header, and the server looks up the real function.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can an action redirect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">redirect()</code> from next/navigation inside it; for form submissions this navigates after the action finishes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the action throws?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The error goes to the nearest error boundary in the browser; in production only a digest is sent. For expected failures, return an error value instead and show it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useActionState</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is there a request body size limit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Actions parse the request body on the server; the default limit is 1 MB and can be raised with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">serverActions.bodySizeLimit</code> in next.config.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Server Action** | Server function called from the client by id |
| **Action id** | Encrypted reference in the Next-Action header |
| **useActionState** | Hook for action result and pending state |
| **Revalidation** | Refreshing cached data after a mutation |

---
**Conclusion:** Server Actions turn a server function into a callable reference: the client sends an id and arguments in a POST, and the server replies with the result and, if needed, fresh UI. They remove the hand-written API layer, but the endpoint is still there, as the curl replay proved, so validation and authorisation inside the action are not optional.`,
    examples: [
      {
        label: "An actions file, a form and a client button",
        tech: "tsx",
        runnable: false,
        code: `// app/posts/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";

export async function createPost(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Not signed in");
  const title = z.string().min(1).max(120).parse(formData.get("title"));
  await db.post.create({ data: { title, authorId: session.userId } });
  revalidatePath("/posts");
}

// app/posts/page.tsx (Server Component)
import { createPost } from "./actions";
export default function Posts() {
  return (
    <form action={createPost}>
      <input name="title" />
      <button type="submit">Create</button>
    </form>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you handle forms with Server Actions in Next.js (progressive enhancement)?",
    seoDescription: "A Server Action form works before JavaScript loads: the HTML has a hidden action id and posts multipart data. Checked with a plain POST on 16.3.4.",
    description: `**Question presented to candidate:**
"Build a signup form with Server Actions. How does it behave before the JavaScript has loaded, and how do you show validation errors and a pending state?"

**What a strong answer should cover:**
- Pass the action to \`<form action={...}>\`; the action receives a \`FormData\`.
- The server-rendered HTML is a real multipart POST form with a hidden action id, so it submits even before or without JavaScript.
- After hydration React intercepts the submit, calls the action without a page reload, and keeps client state.
- \`useActionState\` returns the action result (such as validation errors) and a pending flag; \`useFormStatus\` gives pending state to a submit button.
- Validate on the server in the action; client-side validation is a convenience, not a guarantee.

**Clarifying questions expected:**
- "Must it work without JavaScript?" — then errors must come back through the action result, not client-only state.
- "Where should the user go after success?" — \`redirect()\` inside the action.

**Code / implementation expected:** Yes — a form with useActionState and a pending button.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

A progressive form is a letterbox with a doorbell. If the house is dark (no JavaScript yet), you still drop the letter in and the post office delivers it. If someone is home (JavaScript loaded), they take it from your hand, say thanks, and you never have to walk away from the door. Either way the letter arrives; the doorbell only makes it nicer.

## 2. The Core Idea

📌 **Interview term: Progressive enhancement** — building the page so the basic function works with plain HTML, then improving it when JavaScript loads.

📌 **Interview term: useActionState** — a React hook that wraps an action and returns its latest result, a form action to pass to the form, and a pending flag.

📌 **Interview term: useFormStatus** — a React hook, used in a component inside a form, that reports whether that form is submitting.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="The same form, before and after hydration. server HTML, no JavaScript yet, after hydration">
  <defs>
    <marker id="nx02cmze-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">The same form, before and after hydration</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="111.33333333333333" y="82" text-anchor="middle">server HTML</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">POST form, multipart</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">hidden action id input</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx02cmze-arrow)"/>
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
    <text class="d-text" x="330" y="82" text-anchor="middle">no JavaScript yet</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">browser posts the form</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">page reloads, result in</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx02cmze-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 420.3333333333333 107 L 458.3333333333333 107"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.7s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="461.3333333333333" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="477.3333333333333" cy="48" r="12"/>
    <text class="d-text d-accent" x="477.3333333333333" y="53" text-anchor="middle">3</text>
    <text class="d-text d-accent" x="548.6666666666666" y="82" text-anchor="middle">after hydration</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">React intercepts submit</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">no reload, pending shown</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">in the lab, a plain multipart POST of the server HTML fields added an item: 1 item before, 2 after</text>
  </g>
</svg>

The HTML the server sends is already a working form. JavaScript turns a page reload into an in-place update, but it is not required for the submission to succeed.

## 3. Showing results and pending state

| Need | Tool |
| :--- | :--- |
| Field errors from the server | Return \`{ errors }\` from the action, read via \`useActionState\` |
| Disable the button while submitting | \`pending\` from \`useActionState\`, or \`useFormStatus()\` in the button |
| Keep the values after an error | Return the submitted values, or use \`defaultValue\` from state |
| Navigate after success | \`redirect('/welcome')\` inside the action |
| Reset the form after success | Uncontrolled inputs reset automatically after a successful action in React 19 |

## 4. Validation

Always validate in the action: the no-JavaScript path skips any client code, and anyone can call the action directly. A schema library like zod keeps the rules in one place; add HTML attributes like \`required\` and \`type="email"\` for instant browser feedback. For the underlying mechanism see [Server Actions](/interview-question/what-are-server-actions-in-next-js-and-how-do-they-work).

## 5. Verified — Submitting Without JavaScript (Next.js 16.3.4, next start)

The form was read from the server HTML of \`/actions\`, and its fields were posted as plain multipart data, exactly as a browser does before or without JavaScript:

\`\`\`
GET /actions (server-rendered HTML, no JavaScript involved), the first form:
  <form action="" encType="multipart/form-data" method="POST">
  hidden inputs: $ACTION_ID_<id>, text
a plain multipart POST of those fields (what a browser does with JavaScript disabled):
  -> HTTP 200; items before 1, after 2
the second form uses an inline action that closes over a server variable (closure-secret-...):
  secret text present anywhere in the HTML: false
  bound-argument fields sent instead: $ACTION_REF_2, $ACTION_2:1, $ACTION_2:0, $ACTION_2:2, x
\`\`\`

A form with an inline action that uses a server variable keeps that variable out of the HTML: only encrypted, bound-argument fields are rendered.

## 6. Common Pitfalls

- **Client-only validation.** The no-JavaScript path and direct calls skip it; validate in the action.
- **Controlled inputs with no fallback.** A form that depends on \`useState\` values does not submit meaningfully before hydration; prefer named uncontrolled inputs.
- **Using \`useFormStatus\` in the component that renders the form.** It only reports on a parent form; put it in the submit button component.
- **Throwing for validation errors.** Throwing shows the error boundary; return an errors object instead.
- **Forgetting the field names.** FormData is keyed by \`name\`; an input without a name is not submitted.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Give the form <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">action={serverAction}</code>; the action receives FormData.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">The server HTML is a real multipart POST with a hidden action id, so it submits before JavaScript loads; in the lab a plain POST added an item.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">After hydration React submits without a reload and exposes pending state.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Return validation errors from the action and read them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useActionState</code>; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useFormStatus</code> in the submit button.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Validate on the server every time, because both the no-JavaScript path and direct calls bypass client code.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How are errors shown when JavaScript is off?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The action result is rendered by the server in the response page. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useActionState</code>, the server render after the submission includes the returned state, so the error message is in the HTML.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you pass an extra argument, like a record id, to a form action?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bind it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">action={updateItem.bind(null, item.id)}</code>. The bound value travels with the form as an encrypted field, as seen in the lab HTML.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pending</code> from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useActionState</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useFormStatus</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useActionState</code> tracks one action wherever it is used; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useFormStatus</code> is read inside a component nested in a form and reports that form submission, which suits a reusable submit button.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the form reset after submission?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In React 19, uncontrolled fields are reset after a successful form action. Controlled fields keep whatever state you hold.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Progressive enhancement** | Works with HTML, improves with JavaScript |
| **FormData** | Key-value data of a submitted form |
| **useActionState** | Action result, form action and pending flag |
| **useFormStatus** | Submission state of the parent form |

---
**Conclusion:** A Server Action form is a real HTML form first and a React-enhanced one second. The lab showed the plain POST path working with the server-rendered fields alone. Build on that: return errors through the action result, show pending state with the hooks, and validate on the server, because that is the only code every path goes through.`,
    examples: [
      {
        label: "A signup form with server errors and a pending button",
        tech: "tsx",
        runnable: false,
        code: `// app/signup/actions.ts
"use server";
import { redirect } from "next/navigation";
export type SignupState = { errors?: { email?: string }; email?: string };
export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const email = String(formData.get("email") ?? "");
  if (!email.includes("@")) return { errors: { email: "Enter a valid email" }, email };
  await db.user.create({ data: { email } });
  redirect("/welcome");
}

// app/signup/SignupForm.tsx
"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signup, type SignupState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "Creating..." : "Sign up"}</button>;
}

export function SignupForm() {
  const [state, formAction] = useActionState<SignupState, FormData>(signup, {});
  return (
    <form action={formAction}>
      <input name="email" type="email" defaultValue={state.email} required />
      {state.errors?.email && <p role="alert">{state.errors.email}</p>}
      <Submit />
    </form>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you do optimistic updates in Next.js (useOptimistic, useActionState)?",
    seoDescription: "useOptimistic shows the expected result at once while an action runs and rolls back on failure. Browser timeline: 57 ms to the optimistic value.",
    description: `**Question presented to candidate:**
"A like button feels slow because the server takes a second and a half. How do you make it feel instant with useOptimistic, and what happens if the server rejects the like?"

**What a strong answer should cover:**
- \`useOptimistic(state, updateFn)\` returns a value that shows an optimistic change while an action or transition is pending.
- Call the optimistic setter inside a transition (a form action or \`startTransition\`) together with the real action.
- When the action finishes, React discards the optimistic value and shows the real state from the server.
- If the action fails or returns an unchanged state, the optimistic change disappears automatically; show an error from the action result.
- \`useActionState\` holds the server result and a pending flag; the two hooks are usually used together.

**Clarifying questions expected:**
- "Can the action fail, and how should that look?" — decides the error message and whether to retry.
- "Is the change safe to show before it is confirmed?" — optimistic UI suits likes and toggles, not payments.

**Code / implementation expected:** Yes — a like button with useOptimistic and useActionState.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Posting a letter and immediately ticking it off your to-do list is optimistic: you assume it will arrive. If it comes back undelivered, you untick it and fix the address. useOptimistic is that tick: shown right away, replaced by the truth when the post office answers.

## 2. The Core Idea

📌 **Interview term: useOptimistic** — a React hook that returns a temporary value reflecting an expected change while an async action is pending, then reverts to the real state.

📌 **Interview term: Transition** — a React update that runs without blocking the UI; optimistic updates must happen inside one, such as a form action or startTransition.

📌 **Interview term: Rollback** — returning to the confirmed state when the pending action ends without the expected change.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="A like with a 1.5 s action, measured in the browser. click, action pending, action result">
  <defs>
    <marker id="nx03h9wd-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">A like with a 1.5 s action, measured in the browser</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="111.33333333333333" y="82" text-anchor="middle">click</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">optimistic value shown</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">shown=1 after 57 ms</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx03h9wd-arrow)"/>
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
    <text class="d-text" x="330" y="82" text-anchor="middle">action pending</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">server still at 0</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">pending=true</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx03h9wd-arrow)"/>
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
    <text class="d-text" x="548.6666666666666" y="82" text-anchor="middle">action result</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">real state replaces it</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">or rolls back on failure</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">the failing like showed 2 while pending, then returned to 1 with the error from the server</text>
  </g>
</svg>

The optimistic value is never written to real state. React keeps it on the side for the duration of the transition, which is why rollback needs no code of its own.

## 3. The pattern

| Step | Code |
| :--- | :--- |
| Hold server state | \`const [state, formAction, pending] = useActionState(like, initial)\` |
| Derive the optimistic view | \`const [optimistic, addOptimistic] = useOptimistic(state.count, (c) => c + 1)\` |
| Trigger both together | \`startTransition(() => { addOptimistic(); formAction(fd); })\` |
| Show errors | Return \`{ error }\` from the action and render \`state.error\` |

## 4. When not to use it

Optimistic UI is for actions that almost always succeed and are cheap to undo: likes, toggles, reordering, adding a comment. For payments, bookings or anything with side effects the user must trust, show the pending state instead of pretending it succeeded. The underlying form mechanics are in [forms with Server Actions](/interview-question/how-do-you-handle-forms-with-server-actions-in-next-js-progressive-enhancement).

## 5. Verified — The Timeline in a Real Browser (Next.js 16.3.4, next start)

The action waits 1500 ms; the second button makes the server reject the like. The component printed its values at each moment:

\`\`\`
real browser, next start; the like action waits 1500 ms; the component uses useActionState + useOptimistic
t=    0 ms  before click               shown=0 server=0 pending=false error=none
t=   57 ms  50 ms after "like"         shown=1 server=0 pending=true error=none
t=  761 ms  750 ms                     shown=1 server=0 pending=true error=none
t= 1867 ms  1850 ms (action done)      shown=1 server=1 pending=false error=none
t= 1925 ms  50 ms after failing like   shown=2 server=1 pending=true error=none
t= 3733 ms  1850 ms (action done)      shown=1 server=1 pending=false error=server rejected the like
each click was one POST to /optimistic; the first response body (the action result as an RSC stream):
0:{"a":"$@1","f":"","q":"","i":false,"b":"3kud7HFKojFa3yG3hwQ0L"}
1:{"count":1}
\`\`\`

The rollback required no code: once the failing action returned, React dropped the optimistic \`2\` and showed the server count \`1\` with the returned error.

## 6. Common Pitfalls

- **Calling the optimistic setter outside a transition.** React warns and the value does not behave as optimistic; wrap it in \`startTransition\` or use it in a form action.
- **Writing the optimistic value into real state.** Then there is nothing to roll back to; keep server state and optimistic view separate.
- **Silent failures.** The rollback is automatic but invisible; return and render an error so the user knows.
- **Optimistic UI for irreversible actions.** Showing "paid" before the payment succeeds is a trust problem, not a UX win.
- **Forgetting revalidation.** Other components still show old data unless the action revalidates.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useOptimistic</code> shows an expected change immediately while an action is pending, then yields to the real state.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Call the optimistic setter and the action together inside a transition, usually with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useActionState</code> holding the server result.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">In the lab the optimistic value appeared 57 ms after the click while the action took 1.5 s.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">If the action fails or returns unchanged state, the optimistic value disappears automatically: the failing like went 2 back to 1.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Use it for reversible, low-risk actions, and always render the server error.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does React know when to drop the optimistic value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It lives for the duration of the transition. When the transition ends (the action resolved and the new state rendered), the optimistic value is recomputed from the real state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can several optimistic updates stack?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Each call applies the update function to the current optimistic value, so three quick likes show +3 until the actions finish.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you use it without useActionState?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the confirmed state yourself (for example from props after revalidation) and call the action inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startTransition</code> with the optimistic setter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the server need to do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Perform the change, revalidate the affected data, and return the new state or an error. The client relies on that result to replace the optimistic view.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **useOptimistic** | Temporary expected value during an action |
| **useActionState** | Server result plus pending flag |
| **Transition** | Non-blocking update that scopes the optimistic value |
| **Rollback** | Returning to confirmed state after failure |

---
**Conclusion:** useOptimistic makes slow actions feel instant by showing the expected result during the transition and replacing it with the confirmed state afterwards. The browser timeline in the lab showed both paths: an instant +1 that the server confirmed, and a +1 that rolled back with an error. Pair it with useActionState, render errors, and keep it for actions that are safe to show before they are confirmed.`,
    examples: [
      {
        label: "A like button that updates instantly and rolls back on failure",
        tech: "tsx",
        runnable: false,
        code: `"use client";
import { useActionState, useOptimistic, startTransition } from "react";
import { like } from "./actions"; // (prev, formData) => Promise<{ count: number; error?: string }>

export function LikeButton({ postId, initial }: { postId: string; initial: number }) {
  const [state, likeAction, pending] = useActionState(like, { count: initial });
  const [shown, addOptimistic] = useOptimistic(state.count, (c: number) => c + 1);

  function onLike() {
    const fd = new FormData();
    fd.set("postId", postId);
    startTransition(() => {
      addOptimistic(null);
      likeAction(fd);
    });
  }

  return (
    <div>
      <button onClick={onLike} disabled={pending}>Like ({shown})</button>
      {state.error && <p role="alert">{state.error}</p>}
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are the security considerations for Server Actions in Next.js?",
    seoDescription: "Server Actions are public POST endpoints: an id from a client chunk let curl call one without a session. What Next.js guards, and what you must.",
    description: `**Question presented to candidate:**
"Your team moved all mutations to Server Actions. What are the security risks, which ones does Next.js handle for you, and what must every action still do?"

**What a strong answer should cover:**
- Every exported action is a public HTTP endpoint: its id is in client code, and anyone can call it with a POST.
- So every action must authenticate and authorise the caller itself; hiding the button is not access control.
- Arguments and FormData come from the network: validate types and ranges on the server.
- Next.js adds protections: POST only, an Origin versus Host check against CSRF, encrypted non-deterministic ids, removal of unused actions from the client bundle, encrypted closure variables, a 1 MB default body limit.
- Keep return values minimal, because they are sent to the browser, and keep secrets out of action closures anyway.

**Clarifying questions expected:**
- "Where is authentication checked today: in the page or in the action?" — it must be in the action.
- "Is the app behind a reverse proxy?" — the Origin check may need \`serverActions.allowedOrigins\`.

**Code / implementation expected:** Yes — an action with authentication, authorisation and validation.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Hard

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

A Server Action is a door with a keypad on the side of a building. The fact that the lobby has no sign pointing to it does not make it private; anyone walking along the street can try the keypad. Next.js fits a good lock (origin checks, encrypted ids), but deciding who may enter is still the job of the guard inside, which is your code.

## 2. The Core Idea

📌 **Interview term: CSRF** — cross-site request forgery: a malicious site makes a browser send an authenticated request to your app; Server Actions mitigate it with POST-only calls and an Origin check.

📌 **Interview term: Authorisation** — checking that the authenticated user is allowed to perform this specific action on this specific record.

📌 **Interview term: Closure encryption** — Next.js encrypts variables an inline action captures from its surrounding component before they are sent to the client and back.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="Who protects what in a Server Action. Next.js does, you must">
  <defs>
    <marker id="nx041va0-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Who protects what in a Server Action</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="164" y="78" text-anchor="middle">Next.js does</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">POST only, Origin must match Host</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">encrypted, changing action ids</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">unused actions removed from bundle</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx041va0-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="496" y="78" text-anchor="middle">you must</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">check the session in the action</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">check ownership of the record</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">validate every argument</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">lab: curl with an id from a public chunk ran deleteItem; a foreign Origin was rejected</text>
  </g>
</svg>

The framework stops other websites from triggering your actions through a user browser. It cannot stop a person from calling your action directly, which is why the checks inside the action matter most.

## 3. A checklist per action

| Check | Why |
| :--- | :--- |
| Authenticate: \`const session = await auth()\` | The endpoint is callable without the UI |
| Authorise: does this user own this record? | An id in the arguments can point at anyone data |
| Validate input with a schema | Arguments are untrusted network input |
| Rate-limit sensitive actions | Actions can be called in a loop |
| Return only what the UI needs | The result is sent to the browser |
| Keep secrets out of closures | Encrypted, but the docs advise not to rely on it alone |

## 4. Organising it

Put actions in dedicated files with 'use server' and a data-access layer that performs auth checks close to the data, so a page that forgets to check cannot expose anything. Configure \`serverActions.allowedOrigins\` if a reverse proxy changes the host, and raise \`bodySizeLimit\` only where uploads need it. Related: [Server Actions](/interview-question/what-are-server-actions-in-next-js-and-how-do-they-work) and [authentication](/interview-question/how-do-you-handle-authentication-in-next-js).

## 5. Verified — Calling an Action Directly (Next.js 16.3.4, next start)

The id of \`deleteItem\` was found in a client chunk served to every visitor, then used with \`curl\`:

\`\`\`
action id of deleteItem, read from a public client chunk: 40f4f5e2ef4b... (42 hex chars)
curl, no cookies, no UI (deleteItem('1'))    -> HTTP 200  "deleted":true,"remaining":1
same request, Origin: https://evil.example   -> HTTP 500  the body is only an error row E{"digest":...}; the action did not run
same request, Origin: http://localhost:4100  -> HTTP 200  "deleted":false,"remaining":1

server log for the two requests:
⚠ Missing \`origin\` header from a forwarded Server Actions request.        (the curl call without Origin: it still ran)
\`x-forwarded-host\` header with value \`localhost:4100\` does not match \`origin\` header with value \`evil.example\` from a forwarded Server Actions request. Aborting the action.
\`\`\`

Two conclusions: the direct call without cookies succeeded (no UI, no session), and the Origin check stopped the cross-site variant. A request with no Origin header at all was logged as a warning but still executed, which is exactly the case of a script calling your endpoint directly rather than a browser, so the Origin check is a CSRF defence, not authentication.

Inline actions keep captured server values out of the HTML:

\`\`\`
GET /actions (server-rendered HTML, no JavaScript involved), the first form:
  <form action="" encType="multipart/form-data" method="POST">
  hidden inputs: $ACTION_ID_<id>, text
a plain multipart POST of those fields (what a browser does with JavaScript disabled):
  -> HTTP 200; items before 1, after 2
the second form uses an inline action that closes over a server variable (closure-secret-...):
  secret text present anywhere in the HTML: false
  bound-argument fields sent instead: $ACTION_REF_2, $ACTION_2:1, $ACTION_2:0, $ACTION_2:2, x
\`\`\`

## 6. Common Pitfalls

- **Authorising in the page, not the action.** The page check only hides the button; the action stays callable.
- **Trusting ids from the client.** \`deleteItem(id)\` must verify that the id belongs to the current user.
- **Assuming the Origin check is authentication.** It blocks cross-site browser requests; a direct call without an Origin still ran in the lab.
- **Returning whole records.** The return value reaches the browser; strip private fields.
- **Relying on closure encryption for secrets.** Read secrets inside the action from the environment instead of capturing them.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Every Server Action is a public POST endpoint: its id ships in client code, and the lab called one with curl and no session.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">So authenticate and authorise inside each action, and validate every argument as untrusted input.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Next.js handles CSRF (POST only, Origin must match Host), encrypts and rotates ids, and drops unused actions from the bundle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">The Origin check rejected a foreign origin in the lab, but a request with no Origin still ran: it is not access control.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Return minimal data, keep secrets out of closures, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">allowedOrigins</code> behind reverse proxies.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If an action is never imported by a client component, is it callable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Next.js removes unused actions from the client bundle so their ids are not exposed. Anything a page or component uses is exposed, so treat all used actions as public.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you share auth checks across actions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put them in a data-access layer (for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">requireUser()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getPostForOwner(id)</code>) that every action calls first, so the check lives next to the data.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">serverActions.allowedOrigins</code> for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When a reverse proxy or another domain forwards requests, the Origin no longer matches the Host; listing the trusted origins keeps the check working instead of disabling it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are Server Actions safe against CSRF by default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Largely: they only accept POST, SameSite cookies block most cross-site requests, and Next.js aborts when Origin and Host differ, as the lab showed with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Aborting the action</code>.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **CSRF** | Forged cross-site request using the victim session |
| **Authorisation** | Permission to act on a specific record |
| **Origin check** | Abort when Origin and Host headers differ |
| **allowedOrigins** | Trusted origins for proxied deployments |

---
**Conclusion:** Server Actions remove boilerplate, not attack surface. Next.js handles the browser-driven threats (CSRF via POST and the Origin check, id encryption, dead-code removal), but the lab proved that anyone holding an action id can call it directly. Every action therefore needs its own authentication, authorisation and input validation.`,
    examples: [
      {
        label: "An action that checks identity, ownership and input",
        tech: "tsx",
        runnable: false,
        code: `// app/posts/actions.ts
"use server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { requireUser } from "@/lib/dal";    // throws if there is no valid session

const Input = z.object({ id: z.string().uuid() });

export async function deletePost(raw: unknown) {
  const user = await requireUser();                       // authentication
  const { id } = Input.parse(raw);                         // validation
  const post = await db.post.findUnique({ where: { id } });
  if (!post || post.authorId !== user.id) {               // authorisation
    return { ok: false as const, error: "Not allowed" };
  }
  await db.post.delete({ where: { id } });
  revalidateTag("posts", "max");
  return { ok: true as const };                             // minimal return value
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do Server Actions differ from Route Handlers in Next.js?",
    seoDescription: "Server Actions are generated POST endpoints for your own UI; Route Handlers are HTTP endpoints you design for any client. How to choose.",
    description: `**Question presented to candidate:**
"When would you write a Route Handler instead of a Server Action? Give me concrete cases for each."

**What a strong answer should cover:**
- Server Actions: functions you call from your own React UI; Next.js generates the endpoint, uses POST, handles serialization and revalidation in the same round trip.
- Route Handlers: \`route.ts\` files exporting HTTP methods; you design the URL, method, status codes and payloads for any client.
- Use actions for mutations triggered by your own forms and buttons.
- Use Route Handlers for webhooks, public or mobile APIs, file downloads, GET endpoints that others call, and anything that needs custom headers or streaming responses.
- Both run on the server and both need their own authentication.

**Clarifying questions expected:**
- "Who calls this: our React UI or someone else?" — the main deciding question.
- "Does the caller need a stable URL and method?" — only Route Handlers give that.

**Code / implementation expected:** Yes — the same mutation as an action and as a Route Handler.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

A Server Action is the internal phone line between two departments of the same company: quick, no directory needed, and only useful for people inside. A Route Handler is the public switchboard number printed on the website: anyone can call it, it has a stable number, and it must answer in a format outsiders understand.

## 2. The Core Idea

📌 **Interview term: Route Handler** — a route.ts file in the app directory that exports functions named after HTTP methods and returns a Web Response.

📌 **Interview term: Server Action** — a 'use server' function called from your React UI through a generated POST endpoint.

📌 **Interview term: Webhook** — an HTTP request another service sends to your app when something happens, which needs a stable public URL.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="Two ways to run code on the server. Server Action, Route Handler">
  <defs>
    <marker id="nx052006-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Two ways to run code on the server</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="164" y="78" text-anchor="middle">Server Action</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">called from your own UI</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">generated POST, id-based</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">revalidation in the same response</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx052006-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="496" y="78" text-anchor="middle">Route Handler</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">called by anyone over HTTP</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">your URL, method, status</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">webhooks, APIs, downloads</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">both are public endpoints and both need authentication inside</text>
  </g>
</svg>

The choice is about the caller. If the only caller is your React UI, an action saves a layer; if anything else calls it, you want a URL you control.

## 3. Side by side

| | Server Action | Route Handler |
| :--- | :--- | :--- |
| Defined as | \`'use server'\` function | \`export async function GET/POST/...\` in \`route.ts\` |
| HTTP method | POST only | Any, 405 for unexported methods |
| URL | The current page, chosen by Next.js | The file path, chosen by you |
| Input and output | Serialized arguments and return value | Request and Response you shape |
| Works without JavaScript | Yes, in a form | Only with a plain form or link |
| Revalidates the UI in one round trip | Yes | No, the client must refresh |
| Good for | Mutations from your own UI | Webhooks, public APIs, files, streaming, GET |

## 4. Choosing

A form that creates a post: action. A Stripe webhook: Route Handler (Stripe needs a URL and raw body). A mobile app endpoint: Route Handler. A CSV download: Route Handler with the right headers. Details on each: [Server Actions](/interview-question/what-are-server-actions-in-next-js-and-how-do-they-work) and [Route Handlers](/interview-question/what-are-route-handlers-in-next-js-and-how-do-they-differ-from-pages-api-routes).

## 5. Verified — Both Kinds of Endpoint in One Lab App (Next.js 16.3.4)

Route Handlers answered with the methods, status codes and headers they were written with:

\`\`\`
GET /api/items/42?fields=name,price (cookie theme=dark) -> 200 x-lab: route-handler  {"id":"42","fields":"name,price","theme":"dark","ua":"node"}
DELETE /api/items/42 -> 204 x-deleted: 42  body length 0
PATCH /api/items/42 (no PATCH export) -> 405 allow: null
POST /api/echo JSON -> 201 {"got":{"a":1}}
POST /api/echo broken JSON -> 400 {"error":"invalid JSON"}
POST /api/echo form -> 200 {"gotForm":{"name":"ana"}}
POST /api/legacy?x=1 (pages/api, same app) -> 200 {"router":"pages","method":"POST","query":{"x":"1"}}
\`\`\`

The Server Action endpoint is the page URL itself, reached with a POST and a Next-Action header:

\`\`\`
action id of deleteItem, read from a public client chunk: 40f4f5e2ef4b... (42 hex chars)
curl, no cookies, no UI (deleteItem('1'))    -> HTTP 200  "deleted":true,"remaining":1
same request, Origin: https://evil.example   -> HTTP 500  the body is only an error row E{"digest":...}; the action did not run
same request, Origin: http://localhost:4100  -> HTTP 200  "deleted":false,"remaining":1

server log for the two requests:
⚠ Missing \`origin\` header from a forwarded Server Actions request.        (the curl call without Origin: it still ran)
\`x-forwarded-host\` header with value \`localhost:4100\` does not match \`origin\` header with value \`evil.example\` from a forwarded Server Actions request. Aborting the action.
\`\`\`

## 6. Common Pitfalls

- **Calling your own Route Handler from a Server Component.** It is an extra HTTP hop; call the function directly.
- **Using actions for reads.** They run one at a time on the client and are POST-only; read in Server Components or Route Handlers.
- **Building a public API out of actions.** Their ids can change between builds and their protocol is internal; external clients need Route Handlers.
- **Forgetting to refresh after a Route Handler mutation.** The client cache does not know; call \`router.refresh()\`.
- **Skipping auth in either one.** Both are callable by anyone who finds them.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Server Actions are functions your own UI calls; Route Handlers are HTTP endpoints you design for any client.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Actions are POST-only with a generated endpoint and bring revalidated UI back in the same response.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Route Handlers give you the URL, methods, status codes and headers; in the lab a missing PATCH export returned 405.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">Use actions for UI mutations, Route Handlers for webhooks, public or mobile APIs, downloads and streaming.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Both are public, so both need authentication and validation.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a Server Action be called from a mobile app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Technically, with the right headers and id, but the id can change between builds and the protocol is internal. Use a Route Handler for external clients.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a Route Handler revalidate the cache?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with revalidatePath or revalidateTag, but it cannot refresh the browser that called it; that client must call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">router.refresh()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which one should a webhook use?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A Route Handler: the sender needs a stable URL, and you often need the raw request body to verify a signature.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can both share business logic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Put the logic in a server module and call it from a thin action and a thin Route Handler.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Route Handler** | route.ts file with HTTP method functions |
| **Server Action** | UI-called server function over a generated POST |
| **Webhook** | Inbound HTTP call from another service |
| **405** | Status for an unexported HTTP method |

---
**Conclusion:** The difference is the caller. Server Actions are the best choice for mutations from your own UI, with revalidated UI returned in the same round trip. Route Handlers are for everything with an external caller or HTTP-level needs: webhooks, public APIs, downloads, streaming. The lab showed both living in one app, each on its own terms.`,
    examples: [
      {
        label: "The same mutation both ways, sharing one function",
        tech: "tsx",
        runnable: false,
        code: `// lib/comments.ts
import "server-only";
export async function addComment(userId: string, postId: string, text: string) {
  return db.comment.create({ data: { userId, postId, text } });
}

// app/posts/[id]/actions.ts  -> for our own React UI
"use server";
import { revalidatePath } from "next/cache";
export async function addCommentAction(postId: string, formData: FormData) {
  const user = await requireUser();
  await addComment(user.id, postId, String(formData.get("text")));
  revalidatePath(\`/posts/\${postId}\`);
}

// app/api/posts/[id]/comments/route.ts  -> for the mobile app
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(req);          // token auth for external clients
  const { id } = await ctx.params;
  const { text } = await req.json();
  return Response.json(await addComment(user.id, id, text), { status: 201 });
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Route Handlers in Next.js and how do they differ from Pages API routes?",
    seoDescription: "Route Handlers are route.ts files exporting HTTP methods with Web Request and Response; Pages API routes use one req/res handler. Both tested.",
    description: `**Question presented to candidate:**
"You are moving /pages/api endpoints to the App Router. What are Route Handlers, how is the code different, and what do you need to watch for?"

**What a strong answer should cover:**
- A Route Handler is a \`route.ts\` file in \`app/\` that exports functions named after HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS).
- It uses the Web standard \`Request\` and \`Response\` (plus \`NextRequest\` and \`NextResponse\` helpers), not Node-style \`req\` and \`res\`.
- Unexported methods return 405 automatically; dynamic segments arrive as an awaited \`params\` Promise in the second argument.
- GET handlers are dynamic by default since Next.js 15; opt into static output with \`export const dynamic = 'force-static'\`.
- Pages API routes still work side by side; there is one default-exported \`handler(req, res)\` per file with a method switch.

**Clarifying questions expected:**
- "Do any endpoints rely on Node-specific res methods or body parser config?" — they need rewriting.
- "Should any GET endpoint be static?" — it now needs an explicit opt-in.

**Code / implementation expected:** Yes — the same endpoint in both styles.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

A Pages API route is a receptionist who answers every call to one number and then asks "what do you want?" before deciding what to do. A Route Handler is an office with separate doors marked GET, POST and DELETE: you walk through the door for what you want, and a door that is not there is simply a locked wall with a 405 sign.

## 2. The Core Idea

📌 **Interview term: Route Handler** — an App Router file named route.ts that exports one function per HTTP method and returns a Web Response.

📌 **Interview term: NextRequest** — an extension of the Web Request with helpers such as nextUrl and cookies.

📌 **Interview term: Pages API route** — a file in pages/api that default-exports a handler receiving Node-style req and res objects.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="The same endpoint, two routers. pages/api/items.ts, app/api/items/route.ts">
  <defs>
    <marker id="nx06e66t-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">The same endpoint, two routers</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="164" y="78" text-anchor="middle">pages/api/items.ts</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">one handler(req, res)</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">switch on req.method</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">res.status(200).json(...)</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx06e66t-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="496" y="78" text-anchor="middle">app/api/items/route.ts</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">export GET, POST, DELETE</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">Web Request and Response</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">405 for other methods</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">in the lab both styles ran in the same app, and an unexported PATCH returned 405</text>
  </g>
</svg>

The move is mostly mechanical: split the method switch into exports and return Responses instead of calling res methods.

## 3. Translating code

| Pages API | Route Handler |
| :--- | :--- |
| \`export default function handler(req, res)\` | \`export async function GET(req) {}\` and one per method |
| \`req.query.id\` (dynamic segment) | \`const { id } = await ctx.params\` |
| \`req.query.fields\` (query string) | \`req.nextUrl.searchParams.get("fields")\` |
| \`req.body\` (parsed by config) | \`await req.json()\`, \`await req.formData()\`, \`await req.text()\` |
| \`res.status(201).json(data)\` | \`return Response.json(data, { status: 201 })\` |
| \`res.setHeader("x-a", "1")\` | \`new Response(body, { headers: { "x-a": "1" } })\` |
| \`req.cookies.theme\` | \`(await cookies()).get("theme")\` or \`req.cookies.get("theme")\` |
| \`export const config = { api: { bodyParser: false } }\` | Not needed: read the raw body with \`req.text()\` or \`req.arrayBuffer()\` |

## 4. Things to watch

A \`route.ts\` cannot sit in the same segment as a \`page.tsx\`. GET handlers are not cached unless you opt in. Memoization of fetch does not apply inside Route Handlers, because they are not part of the React tree. For choosing between endpoints and actions see [Server Actions vs Route Handlers](/interview-question/how-do-server-actions-differ-from-route-handlers-in-next-js).

## 5. Verified — Route Handlers and a Pages API Route Side by Side (Next.js 16.3.4)

Build output (both routers in one project):

\`\`\`
├ ƒ /api/echo
├ ƒ /api/items/[id]
Route (pages)
─ ƒ /api/legacy
\`\`\`

Requests on \`next start\`:

\`\`\`
GET /api/items/42?fields=name,price (cookie theme=dark) -> 200 x-lab: route-handler  {"id":"42","fields":"name,price","theme":"dark","ua":"node"}
DELETE /api/items/42 -> 204 x-deleted: 42  body length 0
PATCH /api/items/42 (no PATCH export) -> 405 allow: null
POST /api/echo JSON -> 201 {"got":{"a":1}}
POST /api/echo broken JSON -> 400 {"error":"invalid JSON"}
POST /api/echo form -> 200 {"gotForm":{"name":"ana"}}
POST /api/legacy?x=1 (pages/api, same app) -> 200 {"router":"pages","method":"POST","query":{"x":"1"}}
\`\`\`

GET handler caching, with and without \`force-static\`:

\`\`\`
two GET requests 1.1 s apart
/api/time          first 2026-09-23T05:51:51.080Z  second 2026-09-23T05:51:52.197Z  same: false  cache-control: null
/api/time-static   first 2026-09-23T05:51:35.925Z  second 2026-09-23T05:51:35.925Z  same: true  cache-control: s-maxage=31536000
\`\`\`

## 6. Common Pitfalls

- **Forgetting to await params.** \`ctx.params\` is a Promise since Next.js 15.
- **Expecting cached GET responses.** Since 15 they are dynamic unless you export \`dynamic = 'force-static'\` or a revalidate time.
- **Porting res helpers.** There is no \`res\`; build and return a Response.
- **Parsing JSON without a try.** Malformed bodies throw; return a 400 as in the lab.
- **Putting route.ts next to page.tsx.** One segment cannot be both a page and an endpoint.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">A Route Handler is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">route.ts</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app/</code> exporting one function per HTTP method, using Web Request and Response.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Unexported methods get 405 automatically; dynamic params arrive as an awaited Promise.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Compared with Pages API routes there is no req/res and no body parser config: you read the body and return a Response.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">GET handlers are dynamic by default since 15; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">force-static</code> gave a build-time response in the lab.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Pages API routes keep working alongside, so migration can be gradual.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stream a response from a Route Handler?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Response</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReadableStream</code> body; for server-sent events set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">content-type: text/event-stream</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you read the raw body for signature checks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await req.text()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await req.arrayBuffer()</code> before parsing; there is no body parser to turn off.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do Route Handlers run in Proxy order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Proxy (formerly middleware) runs first for matched paths, then the Route Handler, the same as for pages.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you set CORS headers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return them on each response and export an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OPTIONS</code> handler for preflight requests, or set them centrally in proxy.ts or next.config headers.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Route Handler** | route.ts with HTTP method exports |
| **NextRequest** | Request with nextUrl and cookies helpers |
| **Pages API route** | pages/api handler with req and res |
| **force-static** | Build-time GET response |

---
**Conclusion:** Route Handlers are the App Router version of API routes: one exported function per HTTP method, built on Web Request and Response. The lab ran both styles in one app, returned 405 for a missing method and 400 for bad JSON, and cached a GET only when asked. Migration is mostly splitting method switches and replacing res calls with returned Responses.`,
    examples: [
      {
        label: "A Pages API route and its Route Handler version",
        tech: "tsx",
        runnable: false,
        code: `// pages/api/items/[id].ts  (Pages Router)
import type { NextApiRequest, NextApiResponse } from "next";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return res.status(200).json(await getItem(String(req.query.id)));
  if (req.method === "DELETE") { await deleteItem(String(req.query.id)); return res.status(204).end(); }
  res.setHeader("Allow", "GET, DELETE").status(405).end();
}

// app/api/items/[id]/route.ts  (App Router)
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return Response.json(await getItem(id));
}
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await deleteItem(id);
  return new Response(null, { status: 204 });
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is Middleware in Next.js and what can it do?",
    seoDescription: "Middleware runs before matched requests to rewrite, redirect or set headers. In Next 16 it is proxy.ts on Node.js; middleware.ts is deprecated.",
    description: `**Question presented to candidate:**
"What is middleware in Next.js, what is it good for and what should it not do? And what changed with Next.js 16?"

**What a strong answer should cover:**
- Middleware runs code before a request reaches a route, for paths chosen with a \`matcher\`.
- It can redirect, rewrite to another path, set request and response headers or cookies, or return a response directly.
- Typical uses: auth redirects based on a cookie, locale or A/B routing, bot filtering, adding security headers.
- It should stay fast and light: no heavy data fetching or full authorization logic; verify permissions again close to the data.
- In Next.js 16 the file is \`proxy.ts\` with a \`proxy\` function, running on Node.js by default; \`middleware.ts\` is deprecated and still runs on the Edge runtime.

**Clarifying questions expected:**
- "Is this for every request or only some paths?" — decides the matcher.
- "Which Next.js version?" — decides the file name and the runtime.

**Code / implementation expected:** Yes — a proxy.ts with a matcher, a redirect, a rewrite and a header.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Middleware is the doorman at the building entrance. They glance at your badge, send you to the right floor, or turn you back, all before you reach any office. They are good at quick decisions at the door, but they are not the place to check whether you may read a particular file in the archive; that check happens at the archive.

## 2. The Core Idea

📌 **Interview term: Proxy** — the Next.js 16 name for middleware: a proxy.ts file whose proxy function runs before matched requests, on the Node.js runtime by default.

📌 **Interview term: matcher** — the config that lists which paths the proxy runs for, using path patterns such as /dashboard/:path*.

📌 **Interview term: Rewrite** — serving a different path than the one requested while the browser URL stays the same.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="A request passing through proxy.ts. request, decision, route">
  <defs>
    <marker id="nx07tt6m-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">A request passing through proxy.ts</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="174.66666666666666" height="118" rx="10"/>
    <circle class="d-box-accent" cx="40" cy="48" r="12"/>
    <text class="d-text d-accent" x="40" y="53" text-anchor="middle">1</text>
    <text class="d-text d-accent" x="111.33333333333333" y="82" text-anchor="middle">request</text>
    <text class="d-sub" x="111.33333333333333" y="108" text-anchor="middle">path matches the matcher</text>
    <text class="d-sub" x="111.33333333333333" y="130" text-anchor="middle">proxy function runs</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 201.66666666666666 107 L 239.66666666666666 107" marker-end="url(#nx07tt6m-arrow)"/>
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
    <text class="d-text" x="330" y="82" text-anchor="middle">decision</text>
    <text class="d-sub" x="330" y="108" text-anchor="middle">redirect, rewrite, header</text>
    <text class="d-sub" x="330" y="130" text-anchor="middle">or return a response</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 420.3333333333333 107 L 458.3333333333333 107" marker-end="url(#nx07tt6m-arrow)"/>
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
    <text class="d-text" x="548.6666666666666" y="82" text-anchor="middle">route</text>
    <text class="d-sub" x="548.6666666666666" y="108" text-anchor="middle">page or Route Handler</text>
    <text class="d-sub" x="548.6666666666666" y="130" text-anchor="middle">renders as usual</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="188" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="215" text-anchor="middle">lab: the same code failed as middleware.ts (Edge) and ran as proxy.ts on Node.js 24.19.0</text>
  </g>
</svg>

Everything the proxy does happens before rendering starts, which is what makes it the right place for routing decisions and the wrong place for heavy work.

## 3. What it can return

| Action | Code | Lab result |
| :--- | :--- | :--- |
| Redirect | \`NextResponse.redirect(new URL("/blog", req.url))\` | 307 with \`location: /blog\` |
| Rewrite | \`NextResponse.rewrite(new URL("/about", req.url))\` | \`/p/old\` served the about page, URL unchanged |
| Add a header | \`NextResponse.next()\` then \`res.headers.set(...)\` | \`x-proxy: seen /about\` |
| Respond directly | \`NextResponse.json({...})\` | JSON from \`/p/who\` |
| Cookie-based gate | redirect when a cookie is missing | 307 without the cookie, passed through with it |

## 4. Next.js 16: middleware becomes proxy

Rename the file to \`proxy.ts\` and the function to \`proxy\` (codemod: \`middleware-to-proxy\`). Proxy runs on Node.js by default and the \`runtime\` option is not available in it. The full migration is covered in [proxy.ts in Next.js 16](/interview-question/what-is-proxy-ts-in-next-js-16-and-how-do-you-migrate-from-middleware-ts); authentication patterns in [authentication in Next.js](/interview-question/how-do-you-handle-authentication-in-next-js).

## 5. Verified — proxy.ts on Next.js 16.3.4 (next start)

Matcher \`['/p/:path*', '/about']\`:

\`\`\`
proxy.ts at the project root, matcher ['/p/:path*', '/about']
/p/who       (cookie theme=dark) -> 200  {"runtimeNode":"24.19.0","sawCookie":"dark"}
/p/old       -> 200  page text: about (route group, URL has no group)
/p/go        -> 307 location: /blog  page text: /blog
/p/guard     -> 307 location: /about?from=guard  page text: /about?from=guard
/p/guard     (cookie session=abc) -> 404 x-proxy: seen /p/guard  page text: 404: This page could not be found.  body{color:#000;backgrou
/about       -> 200 x-proxy: seen /about  page text: about (route group, URL has no group)
/blog        -> 200  page text: blog index
\`\`\`

The last row of the guard pair (\`/p/guard\` with a session cookie) returned 404 only because no page exists at that path; the proxy let it through and added its header. The same file under the old name:

\`\`\`
the same file renamed to middleware.ts (function renamed to middleware), next build:
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
  npx @next/codemod@canary middleware-to-proxy .
Error: A Node.js API is used (process.versions at line: 4) which is not supported in the Edge Runtime.

as proxy.ts, the same line ran on Node.js: GET /p/who -> {"runtimeNode":"24.19.0","sawCookie":"dark"}
\`\`\`

## 6. Common Pitfalls

- **Using it as the only authorization check.** It sees paths and cookies, not your data rules; verify again in the page, action or data layer.
- **Heavy work per request.** It runs before every matched request, including prefetches; keep it to quick decisions.
- **A matcher that is too broad.** Without one it runs for static assets too; exclude \`_next/static\`, images and favicons.
- **Keeping middleware.ts in 16.** It is deprecated and still uses the Edge runtime, so Node APIs fail to build, as the lab showed.
- **Redirect loops.** A redirect target that the matcher also covers can bounce forever; exclude it or check the path first.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Middleware runs before matched requests and can redirect, rewrite, set headers and cookies, or answer directly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Choose paths with a matcher, and keep the work quick: it runs on every matched request, including prefetches.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Use it for routing decisions such as auth redirects, locales and headers, and re-check permissions near the data.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">In Next.js 16 it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">proxy.ts</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">proxy</code> function, on Node.js by default; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">middleware.ts</code> is deprecated.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">In the lab the same code failed to build as middleware.ts (Edge runtime) and ran as proxy.ts on Node.js 24.19.0.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between a rewrite and a redirect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A redirect tells the browser to request a new URL (307 or 308, the address bar changes). A rewrite serves another path for the same request, so the URL stays as typed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can it read the request body?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It can, but it should not do heavy work there; body-based logic belongs in the Route Handler or action that receives it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why was middleware renamed to proxy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The docs say the name proxy clarifies what it does: a network boundary in front of the app that can run outside the main runtime, not general-purpose Express-style middleware.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does it pass data to the page?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By setting request headers or cookies that the page reads with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">headers()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cookies()</code>, which makes that page dynamic.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Proxy** | Next 16 name for middleware, runs before routes |
| **matcher** | Paths the proxy runs for |
| **Rewrite** | Serve another path, keep the URL |
| **Redirect** | Tell the browser to go to another URL |

---
**Conclusion:** Middleware, now proxy.ts, is the doorman in front of your routes: quick redirects, rewrites and headers for matched paths, before any rendering. Next.js 16 renamed it and moved it to the Node.js runtime, and the lab showed why that matters: the same code built as proxy.ts and failed as middleware.ts. Keep it light, and never let it be the only authorization check.`,
    examples: [
      {
        label: "A proxy.ts with an auth gate, a rewrite and a security header",
        tech: "tsx",
        runnable: false,
        code: `// proxy.ts (project root, Next.js 16)
import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard") && !req.cookies.get("session")) {
    return NextResponse.redirect(new URL(\`/login?next=\${pathname}\`, req.url));
  }
  if (pathname === "/old-pricing") {
    return NextResponse.rewrite(new URL("/pricing", req.url));
  }

  const res = NextResponse.next();
  res.headers.set("x-frame-options", "DENY");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What runtimes does Next.js support (Node.js vs Edge runtime)?",
    seoDescription: "Next.js runs server code on Node.js by default; the Edge runtime is deprecated in Next 16 and disables static generation. Build output from 16.3.4.",
    description: `**Question presented to candidate:**
"What is the difference between the Node.js and Edge runtimes in Next.js, when would you have chosen Edge, and what is the recommendation today?"

**What a strong answer should cover:**
- Node.js runtime: the default for pages, layouts, Route Handlers and, in Next.js 16, Proxy; full Node APIs and npm compatibility.
- Edge runtime: a smaller runtime based on Web APIs, historically chosen for low latency and fast cold starts close to users.
- Edge limits: no Node built-ins such as \`fs\`, restricted packages, size limits; the lab showed \`process.versions\` missing.
- In Next.js 16.3.4 the Edge runtime is deprecated: the build warns, and on a page it disables static generation.
- The recommendation is the Node.js runtime everywhere, including proxy.ts, which now runs on Node by default.

**Clarifying questions expected:**
- "Does the code need Node APIs or native packages?" — they only work on Node.js.
- "Is the goal latency?" — caching and static rendering usually beat moving compute.

**Code / implementation expected:** Optional — the runtime export and what the build says.`,
    answer: `**Target Audience:** Frontend engineers preparing for Next.js interviews — assumes basic React and App Router familiarity.
**Difficulty:** Medium

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\`. Every behaviour claim was checked against the Next.js 16.3.4 docs shipped with the package and, in the **Verified** section, against real output from a build or a running server.

## 1. Why This Even Matters — A Story First

Think of two kitchens. The Node.js kitchen is a full restaurant kitchen with every appliance. The Edge kitchen was a food truck parked near each neighbourhood: quick to reach, but with a small menu because there is no room for the big appliances. Next.js 16 is retiring the food trucks and recommending the full kitchen, with caching to make the food arrive quickly anyway.

## 2. The Core Idea

📌 **Interview term: Node.js runtime** — the default server runtime in Next.js with the full Node.js API and npm ecosystem.

📌 **Interview term: Edge runtime** — a lightweight Web-API-based runtime with a limited API surface; deprecated in Next.js 16.

📌 **Interview term: runtime export** — the route segment config that selects the runtime for a page, layout or Route Handler; not available in proxy.ts.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 268" role="img" aria-label="Two runtimes in Next.js 16.3.4. Node.js (default), Edge (deprecated)">
  <defs>
    <marker id="nx086fyy-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Two runtimes in Next.js 16.3.4</text>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.1s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-accent" x="24" y="48" width="280" height="136" rx="10"/>
    <text class="d-text d-accent" x="164" y="78" text-anchor="middle">Node.js (default)</text>
    <text class="d-sub" x="164" y="106" text-anchor="middle">full Node APIs and npm packages</text>
    <text class="d-sub" x="164" y="128" text-anchor="middle">pages, Route Handlers, proxy.ts</text>
    <text class="d-sub" x="164" y="150" text-anchor="middle">static generation works</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.5s" dur="0.4s" fill="freeze"/>
    <path class="d-edge" d="M 307 116 L 353 116" marker-end="url(#nx086fyy-arrow)"/>
    <circle class="d-accent" r="5">
      <animateMotion dur="2s" repeatCount="indefinite" path="M 307 116 L 353 116"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.5s" fill="freeze"/>
    <rect class="d-box-muted" x="356" y="48" width="280" height="136" rx="10"/>
    <text class="d-text" x="496" y="78" text-anchor="middle">Edge (deprecated)</text>
    <text class="d-sub" x="496" y="106" text-anchor="middle">Web APIs only, no fs</text>
    <text class="d-sub" x="496" y="128" text-anchor="middle">build warns: use nodejs</text>
    <text class="d-sub" x="496" y="150" text-anchor="middle">disables static generation</text>
  </g>
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="1.3s" dur="0.6s" fill="freeze"/>
    <rect class="d-box-muted" x="24" y="206" width="612" height="44" rx="10"/>
    <text class="d-sub" x="330" y="233" text-anchor="middle">lab: the edge Route Handler reported no process.versions; the proxy ran on Node 24.19.0</text>
  </g>
</svg>

For most apps the question is no longer which runtime to pick, but how to remove the remaining edge exports without breaking anything.

## 3. Comparison

| | Node.js runtime | Edge runtime |
| :--- | :--- | :--- |
| Status in 16.3.4 | Default, recommended | Deprecated |
| APIs | Full Node.js (\`fs\`, \`crypto\`, streams, native addons) | Web APIs (\`fetch\`, \`Request\`, Web Crypto) |
| npm packages | All | Only those without Node dependencies |
| Static generation of a page | Yes | Disabled (build warning) |
| Proxy (middleware) | Default in 16 | Only via the deprecated middleware.ts |
| Selected with | Nothing (default) | \`export const runtime = "edge"\` |

## 4. Migrating off Edge

Remove \`export const runtime = "edge"\` from routes, and rename middleware.ts to proxy.ts. Check that the code no longer needs Edge-specific workarounds (for example Web Crypto instead of \`crypto\`), and use caching or static rendering for latency. See [route segment config](/interview-question/what-is-the-route-segment-config-in-next-js-dynamic-revalidate-runtime) and [Middleware](/interview-question/what-is-middleware-in-next-js-and-what-can-it-do).

## 5. Verified — Edge on Next.js 16.3.4

A page and a Route Handler with \`export const runtime = "edge"\`:

\`\`\`
next build with  export const runtime = "edge"  in app/edge-page/page.tsx and app/api/edge-time/route.ts:
⚠ The Edge Runtime is deprecated. You can use the "nodejs" runtime instead. Learn more: https://nextjs.org/docs/messages/edge-runtime-deprecated
⚠ Using edge runtime on a page currently disables static generation for that page
build table:  ƒ /api/edge-time   ƒ /edge-page
GET /api/edge-time -> {"at":"2026-09-23T06:03:14.300Z","hasProcessVersions":false}   (no Node process.versions in the edge sandbox)
\`\`\`

Node APIs in Proxy, which now defaults to Node.js, versus the old middleware.ts that still uses Edge:

\`\`\`
the same file renamed to middleware.ts (function renamed to middleware), next build:
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
  npx @next/codemod@canary middleware-to-proxy .
Error: A Node.js API is used (process.versions at line: 4) which is not supported in the Edge Runtime.

as proxy.ts, the same line ran on Node.js: GET /p/who -> {"runtimeNode":"24.19.0","sawCookie":"dark"}
\`\`\`

## 6. Common Pitfalls

- **Adding runtime = "edge" by habit in new code.** It is deprecated and turns off static generation for a page.
- **Keeping middleware.ts after upgrading.** It stays on the Edge runtime; Node APIs fail at build time, as the lab showed.
- **Edge-only workarounds left behind.** Polyfills and Web Crypto shims added for Edge can be simplified on Node.
- **Assuming Edge means faster.** Cached or static output is faster than any compute; latency problems are usually caching problems.
- **Native packages in Edge code.** Database drivers and image libraries with native parts only run on Node.js.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Next.js runs server code on the Node.js runtime by default: pages, layouts, Route Handlers and, in 16, proxy.ts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">The Edge runtime offered Web APIs only, fast starts and small size, with no fs or native packages.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">In 16.3.4 Edge is deprecated: the build warns, and an edge page loses static generation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The detail to add:</strong> <span style="color:#f0e2c8;">In the lab an edge Route Handler had no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">process.versions</code>, while proxy.ts ran on Node.js 24.19.0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Recommend Node.js everywhere and use caching for latency; migrate middleware.ts to proxy.ts.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why would teams have chosen Edge before?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fast cold starts and running close to users on platforms that deploy Edge functions globally, often for middleware and lightweight APIs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What replaces Edge for low latency?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Static rendering, PPR and CDN caching of responses, plus regions chosen by the hosting platform. Moving compute helps less than not computing per request.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can proxy.ts use Node APIs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Proxy defaults to Node.js in Next.js 16 and the runtime option is not available there; the lab proxy returned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">process.versions.node</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the deprecation warning say?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The Edge Runtime is deprecated. You can use the nodejs runtime instead.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Node.js runtime** | Default server runtime with full Node APIs |
| **Edge runtime** | Web-API runtime, deprecated in 16 |
| **runtime export** | Segment config choosing the runtime |
| **Cold start** | Delay when a server function starts fresh |

---
**Conclusion:** Next.js supports two server runtimes, but in 16.3.4 only one is recommended: Node.js, now also for proxy.ts. The Edge runtime still works for existing code, with a deprecation warning and no static generation for pages. For latency, rely on caching and prerendering rather than a smaller runtime.`,
    examples: [
      {
        label: "Removing the edge runtime and moving middleware to proxy",
        tech: "tsx",
        runnable: false,
        code: `// Before (Next.js 14/15)
// app/api/geo/route.ts
export const runtime = "edge";
export async function GET() { return Response.json({ ok: true }); }

// After (Next.js 16): no runtime export, Node.js by default
export async function GET() { return Response.json({ ok: true }); }

// middleware.ts -> proxy.ts   (npx @next/codemod@canary middleware-to-proxy .)
import { NextRequest, NextResponse } from "next/server";
export function proxy(req: NextRequest) {
  return NextResponse.next();
}`,
      },
    ],
  },
];

export default augments;
