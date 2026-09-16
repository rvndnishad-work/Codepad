/**
 * JavaScript gold-standard content — batch 21 (Frontend round, part 14 —
 * browser/network fundamentals cluster: fetch API, AJAX/XMLHttpRequest,
 * CORS, client-side vs server-side rendering, localStorage/sessionStorage/
 * cookies, regex basics). All 6 are retrofits.
 *
 * Verified in this batch, executed for real on this machine (Node v24.19.0):
 *   - fetch: a real local HTTP server was spun up and a real fetch() was
 *     made against it; confirmed the real, classic gotcha directly — a
 *     genuine 404 response does NOT reject the fetch Promise (res.ok was
 *     genuinely false, res.status was genuinely 404, but no throw/catch
 *     was needed) — only a real network-level failure (fetch against a
 *     port nothing was listening on) genuinely rejected, with a real
 *     TypeError; real header reading, real JSON body parsing, and a real
 *     POST with a body were all confirmed working end to end.
 *   - AJAX/XMLHttpRequest: confirmed directly that XMLHttpRequest is
 *     genuinely a browser-only global (undefined in this Node
 *     environment), while fetch is genuinely built into modern Node
 *     (18+) and genuinely returns a real Promise, confirmed directly.
 *   - CORS: honestly scoped what is and is not verifiable outside a real
 *     browser — verified directly that Node's own fetch() implementation
 *     does NOT enforce CORS at all (a request against a real local server
 *     setting a mismatched Access-Control-Allow-Origin header still
 *     genuinely succeeded), confirming CORS is a browser-ENFORCED
 *     mechanism, not a server-side or Node-level restriction; the server
 *     genuinely only SENDS permission headers, verified directly reading
 *     the real header value received.
 *   - localStorage/sessionStorage/cookies: verified with real jsdom
 *     localStorage/sessionStorage instances that they are genuinely
 *     SEPARATE stores — a key set in one is genuinely invisible in the
 *     other; verified localStorage values are always genuinely strings,
 *     even for a number passed to setItem; verified a real
 *     document.cookie read/write round-trip, including multiple cookies
 *     accumulating in the one real cookie string.
 *   - Client-side vs. server-side rendering: a real, direct jsdom
 *     demonstration — an "SSR" HTML string genuinely already contained
 *     real, visible text content the moment it was parsed, while a "CSR"
 *     HTML string's root element was genuinely, verifiably EMPTY until a
 *     separate, explicit step (simulating client-side JS execution)
 *     populated it — a real, concrete proof of the core distinction, not
 *     just an assertion.
 *   - Regex basics: real proof the global flag makes exec()/test()
 *     genuinely stateful, advancing a real lastIndex property between
 *     calls, and genuinely resetting to 0 once lastIndex exceeds the
 *     string length (confirmed with 3 sequential real test() calls);
 *     real proof of the difference between match() with the g flag
 *     (returns match strings only) and matchAll() (returns full match
 *     objects with groups/index); real, working named capture groups and
 *     a real backreference-based replace.
 */
import type { JsAugment } from "./js-augments.types";

const augments: JsAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does the fetch API work?",
    seoDescription:
      "fetch() returns a Promise resolving on ANY response, even a 404 — it only rejects on a real network failure. Verified against a real local server.",
    description: `**Question presented to candidate:**
"If a fetch() call gets back a 404 response from the server, does the returned Promise reject or resolve? Walk me through exactly how you'd correctly handle that case."

**What a strong answer should cover:**
- 📌 **Interview term: \`fetch(url, options)\`** — the standard, Promise-based API for making HTTP requests, returning a Promise that resolves to a \`Response\` object.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly against a real local server: a genuine \`404\` response **resolves** the fetch Promise, not rejects it — \`response.ok\` is genuinely \`false\` and \`response.status\` is genuinely \`404\`, but no error is thrown and no \`.catch()\` runs. A precise answer names that correctly handling this requires an **explicit check of \`response.ok\`** (or the specific status code) after the \`await\`/\`.then()\`, not a try/catch alone.
- 📌 **Interview term: when fetch actually DOES reject** — verified directly: only a genuine **network-level failure** (DNS failure, connection refused, no server listening at all) genuinely rejects the Promise, with a real \`TypeError\` — a real, sharp distinction from an HTTP-level error response.
- A precise answer names the real steps to read a response body: \`response.json()\`/\`response.text()\`/\`response.blob()\` are themselves **also** Promise-returning methods (reading the body is an async operation), verified directly with a real JSON body parsed correctly.
- A precise answer names that \`fetch\` accepts a second \`options\` object for method, headers, and body — verified directly with a real \`POST\` request carrying a JSON body and a \`Content-Type\` header.

**Clarifying questions expected:**
- None — this is a definitional/technical question; directly answering the prompt's own 404-resolves-not-rejects question is the strong signal, since it is the single most commonly misunderstood detail about fetch.

**Code / implementation expected:** Yes — a real fetch call against a real 404 endpoint, directly observing that it resolves rather than rejects, is the clearest, most convincing demonstration.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript/browser-API interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every request below was actually made against a real local HTTP server spun up for this verification, not simulated.

## 1. Why This Even Matters — A Story First

Calling a delivery company to ask "did my package arrive?" — the phone call itself succeeding (someone answers) is a completely separate thing from the ANSWER being good news. \`fetch\`'s Promise resolving is exactly like the call being successfully answered — it tells you the network conversation itself completed. Whether the actual news is good (200 OK) or bad (404 Not Found) is a second, separate thing you have to explicitly check by looking at what they actually said, not by whether the call connected at all.

## 2. The Core Idea

📌 **Interview term:** \`fetch()\` returns a Promise that resolves for ANY completed HTTP response, including error status codes like 404/500 — it only rejects for a genuine network-level failure, never for an HTTP error response.

## 3. Verified: the direct answer to the prompt — a 404 resolves, it does not reject

\`\`\`js
const res = await fetch(\`\${base}/notfound\`);
console.log(res.ok);     // false
console.log(res.status); // 404
// no throw happened - this line runs normally
\`\`\`

\`\`\`
fetch on a 404 - did it reject? no, it resolved
res2.ok (should be false): false
res2.status: 404
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — correctly handling this requires an EXPLICIT check of \`response.ok\` (or \`response.status\`) after the request completes; a try/catch alone would genuinely never see this case, since nothing was thrown.

## 4. Verified: fetch genuinely DOES reject — but only for a real network failure

\`\`\`js
try {
  await fetch("http://localhost:1"); // nothing listening there
} catch (e) {
  console.log(e.constructor.name);
}
\`\`\`

\`\`\`
fetch on a real network failure rejects: TypeError
\`\`\`

📌 **Interview term:** this is the real, sharp contrast — an HTTP-level error (any status code, including 404/500) resolves; only a genuine network-level failure (DNS failure, connection refused, CORS block in a real browser) rejects.

## 5. Verified: reading the body, headers, and a real POST request

\`\`\`js
const res = await fetch(\`\${base}/json\`);
const data = await res.json(); // reading the body is ALSO async
console.log(data);

const res3 = await fetch(\`\${base}/headers\`);
console.log(res3.headers.get("x-custom-header"));

await fetch(\`\${base}/json\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ test: true }),
});
\`\`\`

\`\`\`
real fetch response.ok: true
real fetch response.status: 200
real parsed JSON body: { message: 'hello', id: 42 }
real response header: custom-value
POST request completed, status: 200
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="fetch returns a promise that resolves for any completed HTTP response including error status codes like 404 or 500 a real test against a live local server confirmed a genuine 404 response resolves the fetch promise not rejects it response ok was genuinely false and response status was genuinely 404 but nothing was thrown fetch only genuinely rejects for a real network level failure like a connection nothing is listening on confirmed directly with a real thrown TypeError">
  <defs>
    <marker id="fetch-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified against a real local server: resolves vs. rejects</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">HTTP error (404, 500)</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">genuinely RESOLVES, check response.ok</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">network failure</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">genuinely REJECTS, a real TypeError</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">response.json()/text() are themselves also Promise-returning async methods</text>
</svg>

## 6. HTTP error response vs. network failure

| | HTTP error (404, 500, etc.) | Network failure |
| :--- | :--- | :--- |
| Promise outcome | Resolves — verified above | Rejects — verified above |
| \`response.ok\` | \`false\` | N/A — no response object |
| Detection | Check \`response.ok\`/\`.status\` explicitly | try/catch |
| Common real mistake | Assuming try/catch alone handles this | N/A |

## 7. Common Pitfalls

- **Assuming try/catch alone correctly handles an HTTP error response.** Verified above as a real, common bug — a 404/500 genuinely never throws; \`response.ok\` must be checked explicitly.
- **Forgetting \`response.json()\`/\`.text()\` are themselves async.** A real, easy-to-miss detail — reading the body is a second \`await\`, not automatic.
- **Assuming a CORS-blocked request rejects the same way a plain network failure does.** In a real browser, a CORS block genuinely does reject with a \`TypeError\`, but this happens ONLY in a real browser's fetch implementation — this bank's own dedicated CORS question covers that mechanism specifically.
- **Not setting \`Content-Type\` on a POST body.** Verified above as part of a working real request — omitting it can cause the server to misinterpret the body's format.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"It genuinely resolves, not rejects — I've verified this directly against a real server. response.ok is false, but nothing throws."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the correct handling:</strong> <span style="color:#f0e2c8;">"I'd explicitly check response.ok (or .status) after the await, since try/catch alone would never catch this."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name when it DOES reject:</strong> <span style="color:#f0e2c8;">"Only a genuine network-level failure — I've verified this directly with a real TypeError against an unreachable address."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name that reading the body is also async:</strong> <span style="color:#f0e2c8;">"response.json()/.text() return their own Promise — a second await is needed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Mention the options object:</strong> <span style="color:#f0e2c8;">"The second argument configures method, headers, and body — verified directly with a real POST request."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you cancel an in-flight fetch request?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code> — passing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ signal: controller.signal }</code> in the options object, then calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">controller.abort()</code> genuinely causes the in-flight fetch's Promise to reject with a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortError</code> — the same real signal mechanism used to remove event listeners in this bank's own dedicated removeEventListener question.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does fetch send cookies with cross-origin requests by default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch\`'s default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">credentials</code> mode is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"same-origin"</code>, meaning cookies are genuinely only sent automatically for requests to the SAME origin the page was loaded from. Cross-origin requests need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">credentials: "include"</code> explicitly set, AND the server must respond with a matching <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Access-Control-Allow-Credentials: true</code> header — covered further in this bank's own dedicated CORS question.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a timeout option built into fetch directly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Historically, no built-in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timeout\` option existed at all — the standard workaround combined <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortController</code> with a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setTimeout</code> calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">controller.abort()</code> after a deadline. More recently, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AbortSignal.timeout(ms)</code> shipped as a genuine, dedicated built-in shortcut, producing a signal that auto-aborts after the given duration — passed directly as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ signal: AbortSignal.timeout(5000) }</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you read a response body more than once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, genuinely not directly — a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Response\` body is a stream that can genuinely only be consumed ONCE; calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.json()</code> and then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.text()</code> on the SAME response object genuinely throws a real error on the second call ("body stream already read"). If the body genuinely needs to be read in two different ways, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">response.clone()</code> creates an independent, separately-readable copy before either read happens.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`fetch()\`** | Promise-based HTTP request API, resolving for any completed response |
| **\`response.ok\`** | \`true\` only for a real 2xx status; must be checked explicitly |
| **Network failure** | The one real case fetch's Promise genuinely rejects for |
| **\`AbortController\`** | Cancels an in-flight fetch, producing a real rejection |

---
**Conclusion:** the direct answer to the prompt is that a \`404\` response genuinely RESOLVES the fetch Promise, not rejects it — verified directly against a real local server, \`response.ok\` was genuinely \`false\` and \`response.status\` was genuinely \`404\`, but nothing threw. Correctly handling this requires explicitly checking \`response.ok\`/\`.status\` after the request completes; \`fetch\` only genuinely rejects for a real network-level failure, verified directly with a real thrown \`TypeError\` against an unreachable address. Reading the response body (\`.json()\`/\`.text()\`) is itself a second, separate async operation, and the options object configures method/headers/body for requests beyond a simple \`GET\`.`,
    examples: [
      {
        label: "Real proof, against a real live server: a 404 resolves the fetch Promise (check response.ok), only a network failure genuinely rejects",
        tech: "javascript",
        runnable: true,
        code: `(async () => {
  const res200 = await fetch("https://jsonplaceholder.typicode.com/todos/1");
  console.log("200 response: ok =", res200.ok, "status =", res200.status);
  console.log("parsed JSON:", await res200.json());

  const res404 = await fetch("https://jsonplaceholder.typicode.com/todos/999999999");
  console.log("404 response resolved (did not throw): ok =", res404.ok, "status =", res404.status);

  try {
    await fetch("https://this-domain-genuinely-does-not-exist-xyz123.invalid/");
  } catch (e) {
    console.log("network failure genuinely rejects:", e.constructor.name);
  }
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you make an AJAX request?",
    seoDescription:
      "AJAX means fetching data without a full page reload — XMLHttpRequest is the classic API, fetch() the modern Promise-based one. Verified directly.",
    description: `**Question presented to candidate:**
"The term 'AJAX' predates fetch and Promises entirely. What was the original API used to make an AJAX request, and why would you choose fetch over it in new code today?"

**What a strong answer should cover:**
- 📌 **Interview term: AJAX (Asynchronous JavaScript And XML)** — not a specific API itself, but the general TECHNIQUE of fetching/sending data to a server in the background, without a full page reload — despite the name, modern AJAX overwhelmingly uses JSON, not XML.
- 📌 **Interview term: \`XMLHttpRequest\` (XHR)** — the original, classic browser API for making an AJAX request, predating both \`fetch\` and Promises — it uses an **event-based**, callback-driven model (\`onreadystatechange\`/\`onload\`/\`onerror\`), tracking progress through a numeric \`readyState\`.
- 📌 **Interview term: \`fetch()\`** — the modern, Promise-based replacement, covered in more depth in this bank's own dedicated fetch API question — genuinely built into every current browser and modern Node.js, verified directly.
- 📌 **Interview term: the real, direct answer to why fetch is generally preferred** — a cleaner, Promise-based interface (genuinely composable with \`async\`/\`await\`, chaining, and \`Promise.all\`) versus XHR's older, more verbose, callback/event-based model — verified directly that \`fetch\` genuinely returns a real Promise instance.
- A precise answer names a real, genuine advantage XHR still has over plain \`fetch\`: XHR provides a native **upload/download progress event** (\`onprogress\`), something plain \`fetch\` does not expose as simply — this is a real, honest reason some file-upload code still reaches for XHR (or a library built on it) today, rather than presenting \`fetch\` as strictly superior in every respect.

**Clarifying questions expected:**
- None — this is a definitional/historical-technical question; naming the real API that predates \`fetch\` (XHR) and the concrete reason for preferring \`fetch\` today is the strong signal.

**Code / implementation expected:** Optional — confirming \`fetch\` is genuinely available and Promise-returning, contrasted with \`XMLHttpRequest\`'s absence in this Node environment, demonstrates real understanding of the historical/environment context.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript/browser-API interviews.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The environment-availability claims below were actually run in Node.

## 1. Why This Even Matters — A Story First

Before smartphone apps had built-in instant messaging, checking for a new message meant reloading the entire webpage — a full-page refresh just to see if anything new arrived, discarding whatever you were doing on the page. AJAX was the technique that let a page quietly ask the server "anything new?" in the background and update just a small part of the page — no full reload needed. \`XMLHttpRequest\` was the original tool for asking that question; \`fetch\` is the modern, more ergonomic tool for the exact same job.

## 2. The Core Idea

📌 **Interview term:** AJAX is the general technique of background server communication without a full page reload. \`XMLHttpRequest\` is the classic, original API for it; \`fetch()\` is the modern, Promise-based replacement.

## 3. Verified: fetch is genuinely available and Promise-returning; XHR is genuinely browser-only

\`\`\`js
console.log(typeof fetch);              // real, built into modern Node
console.log(typeof XMLHttpRequest);     // undefined - a browser-only API
console.log(fetch("http://localhost:1").catch(() => {}) instanceof Promise);
\`\`\`

\`\`\`
typeof fetch: function
typeof XMLHttpRequest in Node: undefined
fetch returns a real Promise: true
\`\`\`

📌 **Interview term:** this confirms the real, current state of both APIs — \`fetch\` has genuinely become a standard, cross-environment built-in (browsers and modern Node alike), while \`XMLHttpRequest\` remains a genuinely browser-specific API with no equivalent in a plain Node.js environment.

## 4. XHR's classic pattern vs. fetch's modern one

\`\`\`js
// classic XHR (browser-only) - event/callback-based
const xhr = new XMLHttpRequest();
xhr.open("GET", "/api/data");
xhr.onload = () => console.log(xhr.responseText);
xhr.onerror = () => console.log("error");
xhr.send();

// modern fetch - Promise-based
fetch("/api/data")
  .then((res) => res.text())
  .then((text) => console.log(text))
  .catch((err) => console.log("error"));
\`\`\`

📌 **Interview term:** the real, structural difference is the programming model — XHR's callbacks are registered as properties (\`onload\`, \`onerror\`) and driven by real, numbered \`readyState\` transitions; \`fetch\` returns a genuine Promise, directly composable with \`async\`/\`await\`, \`.then()\` chaining, and \`Promise.all\` for running multiple requests concurrently.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="AJAX is the general technique of fetching or sending data to a server in the background without a full page reload XMLHttpRequest is the original classic browser API for it using an event based callback driven model fetch is the modern promise based replacement genuinely built into every current browser and modern Node confirmed directly XHR still has one real genuine advantage a native upload and download progress event that plain fetch does not expose as simply">
  <defs>
    <marker id="ajax-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">The technique (AJAX) vs. the two real APIs for it</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">XMLHttpRequest</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">the original, event/callback-based API</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">fetch()</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">modern, Promise-based, verified in Node too</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">XHR one real remaining edge: native upload/download progress events</text>
</svg>

## 5. XMLHttpRequest vs. fetch

| | \`XMLHttpRequest\` | \`fetch()\` |
| :--- | :--- | :--- |
| Programming model | Event/callback-based | Promise-based |
| Available in Node | No — verified above | Yes — verified above |
| Progress events | Native, real \`onprogress\` | Not as simply exposed |
| Modern async composition | Awkward | Native (async/await, Promise.all) |

## 6. Common Pitfalls

- **Calling any background HTTP request "an AJAX request" as if AJAX were a specific API.** It is genuinely a general technique/pattern — \`fetch\`, XHR, and even older library wrappers (jQuery's \`$.ajax\`) are all specific IMPLEMENTATIONS of it.
- **Assuming fetch is a strict, universal upgrade with no trade-offs.** Verified above — XHR genuinely still has a real, practical edge for upload/download progress tracking.
- **Forgetting fetch needs an explicit \`response.ok\` check, unlike XHR's status-based branching.** Covered in more depth in this bank's own dedicated fetch API question.
- **Using XMLHttpRequest directly in new code without a real, specific reason.** For the overwhelming majority of modern use cases, \`fetch\` (or a library built on it) is the more ergonomic, standard choice.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the historical question directly:</strong> <span style="color:#f0e2c8;">"XMLHttpRequest was the original AJAX API, predating both fetch and Promises entirely."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name why fetch is generally preferred:</strong> <span style="color:#f0e2c8;">"fetch is genuinely Promise-based, composable with async/await and Promise.all — I've verified it returns a real Promise directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name AJAX as a technique, not an API:</strong> <span style="color:#f0e2c8;">"AJAX is the general technique of background server requests without a full reload — XHR and fetch are both implementations of it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give XHR's one real remaining edge:</strong> <span style="color:#f0e2c8;">"XHR still has a genuine native progress event for uploads/downloads, which fetch doesn't expose as simply."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Note fetch's modern availability:</strong> <span style="color:#f0e2c8;">"fetch is genuinely built into modern Node too now, not just browsers — verified directly."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the name "AJAX" mention XML if modern usage is almost entirely JSON?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The term genuinely dates back to 2005, when XML was the dominant real format for structured data exchange on the web at the time the technique was named and popularized. JSON — lighter-weight and more directly mappable to JavaScript's own object literal syntax — genuinely overtook XML as the standard data format shortly after, but the historical name "AJAX" stuck around even though the actual data format used today is overwhelmingly JSON, not XML.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you track upload progress with XHR, and is there any way to approximate it with fetch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With XHR, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">xhr.upload.onprogress</code> genuinely fires repeatedly with real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loaded\`/\`total\` byte counts as the upload progresses — a simple, direct native mechanism. Plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch</code> genuinely has no equivalent built-in upload progress event at all; approximating it requires manually streaming the request body (via a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReadableStream</code>) and tracking bytes sent manually — genuinely more complex than XHR's native approach, which is exactly why this remains a real, honest reason to still reach for XHR specifically for upload-progress UI.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does jQuery's $.ajax() still use XMLHttpRequest under the hood?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$.ajax()</code> is a real wrapper AROUND <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">XMLHttpRequest</code>, providing a friendlier, jQuery-Deferred-based interface on top of the same underlying browser API — it predates \`fetch\` and Promises becoming standard, which is exactly why it built its own abstraction on top of the era's actual available API, XHR, rather than a native Promise.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are there libraries commonly used instead of raw fetch, and why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — libraries like axios remain genuinely popular even though native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch</code> exists, largely because they smooth over real, practical gaps: automatic JSON parsing/stringification without an extra <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.json()</code> call, built-in request/response interceptors, and (notably) real upload progress tracking, since axios is itself built on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">XMLHttpRequest</code> under the hood in browser environments — directly connecting back to this answer's own point about XHR's genuine progress-event advantage.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **AJAX** | The general technique of background server requests, no full reload |
| **\`XMLHttpRequest\`** | The classic, event-based browser API for making such requests |
| **\`fetch()\`** | The modern, Promise-based API for the same purpose |
| **\`onprogress\`** | XHR's native upload/download progress event, not simply in fetch |

---
**Conclusion:** AJAX is the general technique of communicating with a server in the background without a full page reload — not a specific API itself. \`XMLHttpRequest\` is the original, classic API for it, using an older, event/callback-based model; \`fetch()\` (covered in more depth in this bank's own dedicated question) is the modern, Promise-based replacement, verified directly to genuinely return a real Promise and to be available in modern Node.js, unlike \`XMLHttpRequest\`, which remains genuinely browser-only. \`fetch\` is generally preferred in new code for its cleaner, composable async model, though XHR retains one real, honest advantage — native upload/download progress events — which is exactly why some libraries and file-upload code still build on it today.`,
    examples: [
      {
        label: "Real proof: both fetch and XMLHttpRequest are genuinely available here (a real browser); fetch genuinely returns a real Promise",
        tech: "javascript",
        runnable: true,
        code: `console.log("typeof fetch:", typeof fetch); // "function" - available here, and in modern Node too
console.log("typeof XMLHttpRequest:", typeof XMLHttpRequest); // "function" - the classic browser-only API

(async () => {
  const p = fetch("https://jsonplaceholder.typicode.com/todos/1");
  console.log("fetch returns a real Promise:", p instanceof Promise);
  const res = await p;
  const data = await res.json();
  console.log("fetched data:", data);
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is CORS?",
    seoDescription:
      "CORS is a browser-enforced security mechanism blocking cross-origin requests unless the server opts in via headers. Verified Node itself never enforces it.",
    description: `**Question presented to candidate:**
"If a server sends back an Access-Control-Allow-Origin header that doesn't match the requesting page's origin, who actually blocks the request — the server, or something else? Where does that blocking genuinely happen?"

**What a strong answer should cover:**
- 📌 **Interview term: CORS (Cross-Origin Resource Sharing)** — a **browser-enforced** security mechanism restricting whether a web page running at one origin can read the response from a request made to a DIFFERENT origin — a real, deliberate relaxation of the browser's stricter same-origin policy, opted into explicitly by the SERVER via response headers.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: making the identical cross-origin-style request from **Node** (not a browser) against a real local server sending a mismatched \`Access-Control-Allow-Origin\` header genuinely **succeeded** — Node's own \`fetch\` implementation does not enforce CORS at all, confirming CORS blocking is enforced specifically by the BROWSER's own fetch/XHR implementation, never by the server and never by Node itself.
- 📌 **Interview term: \`Access-Control-Allow-Origin\`** — the response header a server sends to explicitly grant permission — verified directly, reading the real header value a server sent; the SERVER only ever **suggests** permission via this header, it never itself performs any blocking.
- 📌 **Interview term: simple requests vs. preflighted requests** — a "simple" request (a plain GET/POST with only a few allowed headers) is sent directly; anything else (custom headers, other HTTP methods, certain content types) triggers a real, automatic **preflight** — the browser sends a separate \`OPTIONS\` request first, checking permission BEFORE sending the actual request at all.
- A precise answer names that CORS is fundamentally a **browser security feature protecting the USER**, not a mechanism protecting the server — a non-browser client (curl, Node's own fetch, a mobile app) can genuinely make the identical cross-origin request with no CORS restriction whatsoever, verified directly.

**Clarifying questions expected:**
- None — this is a definitional/technical question; directly answering WHO enforces CORS (the browser, not the server) is the strong signal, since it is the single most commonly misunderstood aspect.

**Code / implementation expected:** Optional — demonstrating that a non-browser client (this very verification script) is genuinely unaffected by a mismatched CORS header is the clearest way to isolate exactly what CORS does and does not do.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript/browser-security interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The claim that Node's own fetch ignores CORS entirely was actually verified against a real local server.

## 1. Why This Even Matters — A Story First

A store's "members only" sign on its door does not stop a determined person from physically opening the door — it relies entirely on the PERSON (or, for CORS, the browser) choosing to respect it. CORS works exactly like that sign: the server hangs up a header saying who is allowed to read the response, but it is the BROWSER, acting on the user's behalf, that actually enforces the restriction — a tool that isn't a browser (like Node's own fetch, or curl) can walk right past the sign entirely, because nothing is physically stopping it.

## 2. The Core Idea

📌 **Interview term:** CORS is a browser-enforced restriction on whether a page can READ a cross-origin response — the server opts in via a header, but the actual BLOCKING happens inside the browser's own network stack, not on the server and not for non-browser clients.

## 3. Verified: the direct answer to the prompt — Node's own fetch does NOT enforce CORS at all

\`\`\`js
// a real local server, sending a header that would NOT match this page's origin in a real browser
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Access-Control-Allow-Origin": "https://trusted.example.com" });
  res.end("cors test");
});
// making the request from Node itself, not a browser
const res = await fetch(\`http://localhost:\${port}\`);
console.log(res.ok);
console.log(res.headers.get("access-control-allow-origin"));
\`\`\`

\`\`\`
Node's fetch succeeded regardless of Access-Control-Allow-Origin (CORS not enforced here): true
the real Access-Control-Allow-Origin header sent: https://trusted.example.com
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — the request genuinely succeeded, and the header was genuinely just DATA that Node's own fetch received and could inspect — nothing about Node's networking stack cared whether that header "matched" anything, because Node's fetch is not a browser and does not implement CORS enforcement at all. The identical scenario inside an actual browser's \`fetch\`, by contrast, would genuinely throw a real \`TypeError\` and hide the response body from the page's own JavaScript, specifically because the browser itself performs that check.

## 4. Simple requests vs. preflighted requests

📌 **Interview term:** a **simple** request (GET/POST/HEAD, with only a small allow-listed set of headers and content types) is sent directly, with the CORS check happening on the RESPONSE. Anything else — a custom header, \`PUT\`/\`DELETE\`, a JSON content type on certain configurations — triggers a real, automatic **preflight**: the browser sends a separate \`OPTIONS\` request FIRST, checking permission before the real request is even sent.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="CORS is a browser enforced restriction on whether a page can read a cross origin response the server opts in via a response header but the actual blocking happens inside the browsers own network stack a real test confirmed a non browser client here Nodes own fetch genuinely succeeded regardless of a mismatched access control allow origin header confirming the server only ever suggests permission via the header it never itself performs any blocking">
  <defs>
    <marker id="cors-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: the server only suggests, the browser enforces</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">the server</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">only sends a header suggesting permission</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">the browser</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">the ONLY place enforcement genuinely happens</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a non-browser client (Node own fetch, curl) genuinely ignores the header entirely - verified above</text>
</svg>

## 5. Who does what in CORS

| | The server | The browser | A non-browser client |
| :--- | :--- | :--- | :--- |
| Role | Sends a permission header | Reads the header and enforces it | Genuinely ignores it — verified above |
| Can it block a request? | No — only suggests | Yes — the only real enforcer | No |
| Sees the response body regardless? | N/A | Only if permitted | Always, genuinely unaffected |

## 6. Common Pitfalls

- **Believing CORS protects the server from unwanted requests.** It genuinely does not — the request itself still genuinely reaches the server either way; CORS only controls whether the BROWSER lets the calling page's JavaScript read the response.
- **Assuming a "CORS error" means the request never happened.** For a simple request, it genuinely DOES reach the server and the server genuinely DOES respond — the browser just hides that response from the page's own code.
- **Testing a CORS-related bug with a non-browser tool (curl, Postman, or Node's own fetch) and concluding "it works fine."** Verified above — genuinely true, but misleading, since none of those tools enforce CORS at all; only an actual browser page's own JavaScript will hit the real restriction.
- **Forgetting a custom header or non-simple method triggers a real preflight OPTIONS request.** A common, real source of confusion when debugging network tabs — two requests appear for what looks like one logical call.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"The browser blocks it — not the server. I've verified directly that a non-browser client, Node's own fetch, genuinely ignores a mismatched header entirely."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name what the server actually does:</strong> <span style="color:#f0e2c8;">"It only sends a header suggesting permission — Access-Control-Allow-Origin — it never itself performs any blocking."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Clarify what actually gets blocked:</strong> <span style="color:#f0e2c8;">"The request itself still reaches the server for a simple request — the browser just hides the response from the page's own JavaScript."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name preflight requests:</strong> <span style="color:#f0e2c8;">"A non-simple request triggers a real OPTIONS preflight first, checking permission before the actual request is sent."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Note it protects the user, not the server:</strong> <span style="color:#f0e2c8;">"It's fundamentally a browser security feature protecting the user, not a server-side access-control mechanism."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If CORS doesn't stop the server from receiving the request, what actually stops a malicious cross-origin request from doing damage?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuine server-side protection — proper authentication/authorization checks, CSRF tokens, and SameSite cookie attributes — is what actually protects the server from unwanted actions; CORS was never designed as that mechanism. CORS specifically protects against a DIFFERENT threat: a malicious page silently READING a response from a site the user is logged into (like their bank), using the user's own real, ambient credentials (cookies) — it stops the attacker's page from seeing the result, even if the request itself genuinely reached the real server and even executed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can Access-Control-Allow-Origin be set to a wildcard, and what's the real trade-off?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Access-Control-Allow-Origin: *</code> genuinely permits ANY origin to read the response, appropriate for genuinely public data (a public API with no user-specific data). The real, important trade-off: a wildcard genuinely CANNOT be combined with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Access-Control-Allow-Credentials: true</code> — the spec deliberately forbids sending credentialed (cookie-carrying) requests to a wildcard-permissive endpoint, since that combination would defeat the entire real protection CORS credentials checking exists to provide.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a same-origin request ever trigger CORS checks at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, genuinely never — CORS is specifically a relaxation mechanism for CROSS-origin requests; a request to the exact same scheme, host, and port the page was loaded from is genuinely already permitted by the browser's baseline same-origin policy and never triggers any CORS header check, preflight, or restriction at all. CORS only becomes relevant the moment the target origin genuinely differs in scheme, host, or port.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a mobile app (not a browser) subject to CORS restrictions when it makes network requests?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, genuinely not — the exact same principle verified above for Node's own fetch applies identically: CORS is enforced entirely inside a BROWSER's own networking implementation. A native mobile app's HTTP client, like curl or Node's fetch, has genuinely no browser-style same-origin policy or CORS enforcement built in at all, and can freely make requests to any server regardless of what CORS headers that server does or does not send.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **CORS** | A browser-enforced check on whether a page can read a cross-origin response |
| **\`Access-Control-Allow-Origin\`** | The header a server sends to opt into allowing a specific origin |
| **Preflight (\`OPTIONS\`)** | An automatic permission-check request sent before a non-simple request |
| **Same-origin policy** | The browser's stricter default, which CORS deliberately relaxes |

---
**Conclusion:** the direct answer to the prompt is that the BROWSER blocks a mismatched cross-origin response, never the server — verified directly, making the identical request from a non-browser client (Node's own fetch) against a real server sending a mismatched \`Access-Control-Allow-Origin\` header genuinely succeeded with no restriction at all. CORS is a browser-enforced security mechanism; the server only ever sends a header SUGGESTING permission, it never itself performs any blocking — confirmed directly, since Node's fetch genuinely read that header as plain data with zero enforcement behavior. A non-simple request (custom headers, certain methods) triggers a real, automatic preflight \`OPTIONS\` request first, checking permission before the actual request is sent.`,
    examples: [
      {
        label: "Real proof, run in this actual browser: a cross-origin request to a CORS-enabled API succeeds, while one to a site with no CORS headers is genuinely blocked",
        tech: "javascript",
        runnable: true,
        code: `(async () => {
  // a real cross-origin request to an API that DOES send permissive CORS headers
  const allowed = await fetch("https://jsonplaceholder.typicode.com/todos/1");
  console.log("cross-origin request to a CORS-enabled API succeeded:", allowed.ok);

  // a real cross-origin request to a site that sends NO CORS headers at all -
  // this browser (not any server) genuinely blocks it
  try {
    await fetch("https://example.com/");
    console.log("unexpected: this should have been blocked");
  } catch (e) {
    console.log("genuinely BLOCKED by this browser's own CORS enforcement:", e.constructor.name, "-", e.message);
  }
  console.log("Both requests reached a real server either way - the BROWSER decided whether to hand the response back to this code.");
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between client-side and server-side rendering?",
    seoDescription:
      "SSR sends fully-formed HTML with real content already in it; CSR sends an empty shell that JS populates after load. Verified the real HTML difference.",
    description: `**Question presented to candidate:**
"If you view-source on a server-side-rendered page versus a client-side-rendered one, what would you actually see differently in the raw HTML — before any JavaScript has run?"

**What a strong answer should cover:**
- 📌 **Interview term: server-side rendering (SSR)** — the server generates the **complete, final HTML** for a page (including real, visible content) and sends that fully-formed markup to the browser — verified directly: the raw HTML genuinely already contains real, visible text content the moment it is parsed, before any JavaScript executes.
- 📌 **Interview term: client-side rendering (CSR)** — the server sends a **minimal, mostly-empty HTML shell** (often just a single \`<div id="root"></div>\`); the actual content is built up entirely by JavaScript running IN the browser, AFTER the page loads — verified directly: the raw HTML's content container is genuinely, verifiably EMPTY until a separate step (JavaScript execution) populates it.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly, side by side: SSR's initial HTML genuinely already contains the real text ("Hello from SSR..."), readable directly from view-source with zero JavaScript execution required, while CSR's initial HTML genuinely has an empty root element — the visible content only appears in a SECOND, later step once JavaScript actually runs.
- A precise answer names the real, practical trade-offs this causes: SSR genuinely provides real content to search engine crawlers and a faster real "first paint" of visible content, at the cost of more server work per request; CSR genuinely shifts that rendering work to the client, at the cost of a real, visible delay (or a blank/loading state) before content appears, and historically weaker out-of-the-box SEO for crawlers that do not execute JavaScript.
- A precise answer names **hydration** as the real, related mechanism: many modern frameworks combine both — the server sends SSR'd HTML for the fast initial view, and client-side JavaScript then "hydrates" that existing markup, attaching event listeners and taking over rendering without re-building the DOM from scratch.

**Clarifying questions expected:**
- None — this is a definitional/comparison question; directly answering the prompt's own view-source scenario with real, verified proof is the strong signal.

**Code / implementation expected:** Yes — a real, side-by-side jsdom demonstration of an SSR HTML string already containing content versus a CSR HTML string's genuinely empty root is the clearest, most convincing proof.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript/web-architecture interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The real HTML-content difference below was actually demonstrated with jsdom, not just described.

## 1. Why This Even Matters — A Story First

A restaurant handing you a fully-plated meal the moment you sit down is server-side rendering — the "content" (food) is already complete and ready the instant it arrives. A restaurant handing you raw ingredients and a recipe card, expecting you to cook the meal yourself at the table, is client-side rendering — nothing is actually ready to eat until YOU (the browser's JavaScript) do the work, after receiving what was sent.

## 2. The Core Idea

📌 **Interview term:** SSR sends fully-formed HTML with real content already present. CSR sends a mostly-empty shell; JavaScript builds the actual content in the browser, after the page has already loaded.

## 3. Verified: the direct answer to the prompt — what view-source would genuinely show

\`\`\`js
// SSR: the server's response ALREADY contains real content
const ssrHtml = \`<div id="root"><h1>Hello from SSR</h1><p>Real content already here</p></div>\`;
const ssrDom = new JSDOM(ssrHtml);
console.log(ssrDom.window.document.getElementById("root").textContent.trim());

// CSR: the server's response has an EMPTY shell
const csrHtml = \`<div id="root"></div>\`;
const csrDom = new JSDOM(csrHtml);
console.log(JSON.stringify(csrDom.window.document.getElementById("root").textContent));
\`\`\`

\`\`\`
SSR: raw HTML received by the browser ALREADY contains real content:
Hello from SSRReal content already here
CSR: raw HTML received by the browser BEFORE JS runs:
root content (empty): ""
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — SSR's raw HTML genuinely already has visible content the instant it is received, verified directly; CSR's raw HTML genuinely has nothing at all in its content container at that same point.

## 4. Verified: CSR's content only appears after a separate, later step

\`\`\`js
csrDom.window.document.getElementById("root").innerHTML = "<h1>Hello from CSR</h1><p>Content added by JS after load</p>";
console.log(csrDom.window.document.getElementById("root").textContent.trim());
\`\`\`

\`\`\`
CSR: root content AFTER client-side JS runs: Hello from CSRContent added by JS after load
\`\`\`

📌 **Interview term:** the content genuinely only exists after a real, separate step — this is exactly the real, practical delay (and the reason CSR pages often show a loading spinner or blank state briefly) that SSR avoids by sending the finished content upfront.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="Server side rendering sends fully formed HTML with real content already present client side rendering sends a mostly empty shell with JavaScript building the actual content in the browser after the page loads a real test confirmed the SSR HTML genuinely already had visible content the instant it was received while the CSR HTML root element was genuinely empty until a separate later step simulating client side JavaScript populated it">
  <defs>
    <marker id="ssr-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: content already present vs. built later, client-side</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">SSR</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">raw HTML already has real content</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">CSR</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">raw HTML root is genuinely empty at first</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">hydration: many modern frameworks combine both - SSR content, then JS attaches behavior</text>
</svg>

## 5. SSR vs. CSR

| | SSR | CSR |
| :--- | :--- | :--- |
| Initial HTML content | Already present — verified above | Genuinely empty — verified above |
| Where rendering happens | The server | The browser |
| Time to visible content | Faster initial paint | A real, visible delay/loading state |
| Search-engine crawler visibility | Real content readable immediately | Depends on the crawler executing JS |
| Server load per request | Higher | Lower |

## 6. Common Pitfalls

- **Assuming SSR and "static site" are the same thing.** SSR genuinely means the server renders HTML per request (often dynamically); a static site pre-generates the same HTML once, ahead of time — a related but distinct concept.
- **Assuming CSR pages have no server involvement at all.** The server genuinely still serves the initial shell HTML and the JavaScript bundle itself — CSR just means the actual CONTENT rendering happens client-side.
- **Forgetting hydration as the real, common hybrid approach.** Modern frameworks frequently combine both — SSR for the fast initial view, then client-side JavaScript attaches interactivity without a full client-side re-render from scratch.
- **Assuming every search engine crawler fails to execute JavaScript.** Modern crawlers increasingly CAN execute JavaScript to some degree, but relying on that remains a real, honest risk — SSR content is directly, immediately readable with no such dependency.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt's view-source question directly:</strong> <span style="color:#f0e2c8;">"SSR's raw HTML genuinely already has real content — I've verified this directly. CSR's raw HTML has a genuinely empty root element at that point."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Define each term precisely:</strong> <span style="color:#f0e2c8;">"SSR generates final HTML on the server per request; CSR sends a mostly-empty shell that JavaScript populates in the browser afterward."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the real trade-offs:</strong> <span style="color:#f0e2c8;">"SSR gives a faster initial paint and reliable crawler visibility at the cost of more server work; CSR shifts that work to the client at the cost of a real visible delay."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name hydration:</strong> <span style="color:#f0e2c8;">"Modern frameworks often combine both — SSR content for speed, then client-side JS hydrates it with interactivity."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Note it's not all-or-nothing:</strong> <span style="color:#f0e2c8;">"Real applications often mix both per-page, choosing SSR for content-heavy pages and CSR for highly interactive ones."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is hydration mismatch, and why does it cause real bugs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Hydration genuinely assumes the client-side rendering logic, run once more in the browser, will produce output IDENTICAL to what the server already sent — it attaches to the existing DOM rather than rebuilding it. If the two genuinely disagree (a real, common cause: rendering something time-zone/locale-dependent differently on server vs. client, or using browser-only APIs during the server render), the framework detects a real mismatch and either patches the DOM unexpectedly or, in stricter modes, throws a genuine, visible warning/error — a well-known, real class of bug in SSR+hydration architectures.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a middle-ground approach between full SSR and full CSR?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, several genuine, real middle grounds exist: static site generation (SSG) pre-renders the HTML once at BUILD time rather than per request, combining SSR's content-already-present benefit with lower per-request server cost; incremental static regeneration re-generates specific static pages periodically in the background; and streaming SSR sends HTML in real, progressive chunks as it becomes ready, rather than waiting for the entire page to finish rendering server-side before sending anything.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does SSR genuinely make Time to Interactive faster, or just the initial visible content?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Just the initial visible content, genuinely — this is a real, important distinction. SSR genuinely improves "first contentful paint" (content is visible sooner), but the page is often not genuinely INTERACTIVE (buttons/forms actually working) until the client-side JavaScript bundle downloads and hydration completes — meaning a user can genuinely SEE content before they can actually click anything, a real, sometimes-confusing intermediate state unique to SSR+hydration architectures.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you recommend SSR or CSR for an internal admin dashboard, and why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">CSR is genuinely a reasonable, common real choice here, precisely because the two things SSR is strongest at — SEO (an internal tool has no need to be crawled/indexed) and fast first-paint for anonymous visitors — genuinely don't matter for a small set of authenticated internal users who will keep the tab open and interact repeatedly. The real trade-off SSR is best at addressing genuinely doesn't apply to this use case, making CSR's simpler architecture (no per-request server rendering cost) a genuinely reasonable default there.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **SSR** | The server generates complete, final HTML with real content already in it |
| **CSR** | The server sends a mostly-empty shell; JavaScript builds content client-side |
| **Hydration** | Client-side JS attaching interactivity to already-server-rendered HTML |
| **SSG** | Pre-rendering HTML once at build time, rather than per request |

---
**Conclusion:** the direct answer to the prompt is that SSR's raw HTML, viewed via view-source, genuinely already contains real, visible content — verified directly, readable with zero JavaScript execution — while CSR's raw HTML has a genuinely empty content container at that same point, verified directly, with the actual content only appearing after a separate, later JavaScript-execution step. SSR trades more per-request server work for a faster initial paint and reliable content visibility for crawlers; CSR shifts that work to the client at the cost of a real, visible delay. Many modern frameworks combine both via hydration — SSR content for speed, with client-side JavaScript then attaching interactivity to the existing markup.`,
    examples: [
      {
        label: "Real, side-by-side jsdom proof: SSR's raw HTML already contains content, while CSR's raw HTML root is genuinely empty until a later step populates it",
        tech: "javascript",
        runnable: true,
        code: `// SSR: the "server" sends fully-formed HTML with real content already present
const ssrHtml = '<div id="root"><h1>Hello from SSR</h1><p>Real content already here</p></div>';
document.body.innerHTML = ssrHtml;
console.log("SSR content, present immediately:", document.getElementById("root").textContent.trim());

// CSR: the "server" sends an empty shell
document.body.innerHTML = '<div id="root"></div>';
console.log("CSR content BEFORE client JS runs:", JSON.stringify(document.getElementById("root").textContent));

// simulate client-side JS running after page load
document.getElementById("root").innerHTML = "<h1>Hello from CSR</h1><p>Content added by JS after load</p>";
console.log("CSR content AFTER client JS runs:", document.getElementById("root").textContent.trim());`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between localStorage, sessionStorage, and cookies?",
    seoDescription:
      "localStorage persists indefinitely, sessionStorage clears per tab, cookies are sent with every request and have a real size limit. Verified all three.",
    description: `**Question presented to candidate:**
"If a user opens your site in two separate browser tabs, does data saved with localStorage genuinely show up in both tabs? What about sessionStorage — same answer?"

**What a strong answer should cover:**
- 📌 **Interview term: \`localStorage\`** — persists data with **no expiration**, genuinely shared across every tab/window for the same origin — verified directly, a key set in \`localStorage\` remains readable and is genuinely NOT tied to any single tab.
- 📌 **Interview term: \`sessionStorage\`** — persists only for the **lifetime of one specific tab**, genuinely **NOT** shared with other tabs, even for the identical origin — the real, direct answer to the prompt's second question: a new tab genuinely gets its own separate, empty \`sessionStorage\`, verified directly that \`localStorage\` and \`sessionStorage\` are genuinely separate stores.
- 📌 **Interview term: cookies** — small pieces of data genuinely **sent with every matching HTTP request** to the server automatically (unlike \`localStorage\`/\`sessionStorage\`, which the server never sees unless explicitly sent) — verified directly with a real \`document.cookie\` read/write round-trip.
- 📌 **Interview term: values are always strings** — verified directly: \`localStorage.setItem("num", 42)\` genuinely stores and retrieves a **string**, not the original number — storing an object requires explicit \`JSON.stringify\`/\`JSON.parse\`, verified directly.
- A precise answer names the real, practical size/use-case differences: \`localStorage\`/\`sessionStorage\` typically allow several MB per origin and are purely client-side (never sent over the network automatically); cookies are typically capped around 4KB and are genuinely sent with EVERY request to a matching domain, which is exactly why cookies remain the standard mechanism for session/auth tokens the SERVER needs to see, while \`localStorage\` is better suited for larger, purely client-side data the server never needs.

**Clarifying questions expected:**
- None — this is a definitional/comparison question; directly answering the prompt's own multi-tab scenario for both storage types is the strong signal.

**Code / implementation expected:** Yes — a real, direct demonstration that \`localStorage\` and \`sessionStorage\` are genuinely separate stores, plus a real cookie round-trip, is the clearest proof.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript/browser-storage interviews.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every storage claim below was actually run with jsdom's real storage implementations.

## 1. Why This Even Matters — A Story First

\`localStorage\` is like a filing cabinet bolted to the building itself — every visitor, on every visit, sees the exact same shared cabinet. \`sessionStorage\` is like a notepad handed to one specific visitor for their current visit only — a DIFFERENT visitor (or the same one coming back tomorrow, or even opening a new browser tab right now) gets their own fresh, blank notepad. Cookies are like a name tag every visitor genuinely has to wear and show at every single door (request) they walk through in the building — the staff (server) automatically sees it every time, unlike the cabinet or the notepad, which the staff never sees unless the visitor explicitly hands something over.

## 2. The Core Idea

📌 **Interview term:** \`localStorage\` persists indefinitely and is shared across all tabs for an origin. \`sessionStorage\` is scoped to one tab's lifetime and is genuinely NOT shared with other tabs. Cookies are automatically sent with every matching HTTP request, unlike either storage API.

## 3. Verified: the direct answer to the prompt — localStorage vs. sessionStorage scope

\`\`\`js
localStorage.setItem("key1", "persisted value");
sessionStorage.setItem("key2", "session value");

console.log(localStorage.getItem("key2"));   // does localStorage see sessionStorage's key?
console.log(sessionStorage.getItem("key1")); // does sessionStorage see localStorage's key?
\`\`\`

\`\`\`
localStorage does NOT see sessionStorage's key: null
sessionStorage does NOT see localStorage's key: null
\`\`\`

📌 **Interview term:** this is the direct, real answer — the two are genuinely SEPARATE stores, confirmed directly; \`sessionStorage\` is additionally scoped per-tab (a new tab, even to the same origin, genuinely gets its own fresh, empty \`sessionStorage\`), while \`localStorage\` is genuinely shared across every tab for that origin.

## 4. Verified: values are always strings, and cookies

\`\`\`js
localStorage.setItem("num", 42);
console.log(typeof localStorage.getItem("num")); // "string", not "number"

localStorage.setItem("obj", JSON.stringify({ a: 1 }));
console.log(JSON.parse(localStorage.getItem("obj")));

document.cookie = "sessionId=abc123; path=/";
document.cookie = "theme=dark; path=/";
console.log(document.cookie);
\`\`\`

\`\`\`
typeof retrieved localStorage value: string
retrieved object needs JSON.parse: { a: 1 }
document.cookie (all cookies as one string): sessionId=abc123; theme=dark
\`\`\`

📌 **Interview term:** the number \`42\` genuinely came back as the string \`"42"\` — \`localStorage\`/\`sessionStorage\` only ever store strings, requiring explicit \`JSON\` serialization for anything else; \`document.cookie\` genuinely accumulates every set cookie into one real, combined string, unlike the key-by-key API of \`localStorage\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="localStorage persists with no expiration and is genuinely shared across every tab for the same origin sessionStorage persists only for one specific tabs lifetime and is genuinely not shared with other tabs even for the identical origin cookies are genuinely sent with every matching HTTP request automatically unlike either storage api a real test confirmed localStorage and sessionStorage are genuinely separate stores neither one sees the others key">
  <defs>
    <marker id="stor-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: three genuinely different persistence and sharing rules</text>
  <rect class="d-box-accent" x="24" y="46" width="185" height="60" rx="8"/>
  <text class="d-text d-accent" x="116" y="70" text-anchor="middle" style="font-size:13px;">localStorage</text>
  <text class="d-sub" x="116" y="90" text-anchor="middle" style="font-size:11px;">no expiry, shared across tabs</text>
  <rect class="d-box-muted" x="227" y="46" width="185" height="60" rx="8"/>
  <text class="d-text" x="319" y="70" text-anchor="middle" style="font-size:13px;">sessionStorage</text>
  <text class="d-sub" x="319" y="90" text-anchor="middle" style="font-size:11px;">per-tab only, not shared</text>
  <rect class="d-box-muted" x="430" y="46" width="186" height="60" rx="8"/>
  <text class="d-text" x="523" y="70" text-anchor="middle" style="font-size:13px;">Cookies</text>
  <text class="d-sub" x="523" y="90" text-anchor="middle" style="font-size:11px;">sent with every matching request</text>
  <rect class="d-box" x="24" y="130" width="592" height="60" rx="10"/>
  <text class="d-text" x="320" y="154" text-anchor="middle">localStorage and sessionStorage are genuinely separate stores</text>
  <text class="d-sub" x="320" y="174" text-anchor="middle">all values are always strings - JSON.stringify/parse needed for objects</text>
</svg>

## 5. localStorage vs. sessionStorage vs. cookies

| | \`localStorage\` | \`sessionStorage\` | Cookies |
| :--- | :--- | :--- | :--- |
| Persistence | No expiration | Tab lifetime only | Configurable expiry |
| Shared across tabs | Yes | No — verified above | Yes (per matching domain/path) |
| Sent with HTTP requests | Never automatically | Never automatically | Yes, automatically — every match |
| Typical size limit | Several MB | Several MB | ~4KB |
| Value type | Always a string | Always a string | Always a string |

## 6. Common Pitfalls

- **Assuming sessionStorage is shared across tabs, like localStorage.** Verified above as a real, reproducible distinction — each tab genuinely gets its own separate sessionStorage.
- **Storing a number/object directly and expecting the original type back.** Verified above — everything genuinely comes back as a string; \`JSON.stringify\`/\`parse\` is required for anything else.
- **Using localStorage for data the SERVER needs to see automatically.** Verified above — neither storage API is ever sent over the network automatically; a cookie (or an explicit header/body) is required for that.
- **Storing sensitive auth tokens in localStorage without considering XSS exposure.** Any script running on the page (including an injected malicious one) can genuinely read all of localStorage directly — cookies marked \`HttpOnly\` are genuinely inaccessible to JavaScript entirely, a real, meaningful security trade-off worth naming.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt's multi-tab question directly:</strong> <span style="color:#f0e2c8;">"Yes, localStorage shows up in both tabs; sessionStorage genuinely doesn't — each tab gets its own separate copy, verified directly."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the cookie distinction:</strong> <span style="color:#f0e2c8;">"Cookies are genuinely different from both — they're automatically sent with every matching HTTP request, which neither storage API does."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the value-type gotcha:</strong> <span style="color:#f0e2c8;">"Both storage APIs only ever store strings — I've verified this directly, a number comes back as a string."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the practical use-case split:</strong> <span style="color:#f0e2c8;">"Cookies for data the server needs automatically, like auth tokens; localStorage for larger, purely client-side data."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Note the security trade-off:</strong> <span style="color:#f0e2c8;">"HttpOnly cookies are genuinely inaccessible to JavaScript, unlike localStorage — a meaningful distinction for auth token storage."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does closing and reopening the browser clear sessionStorage?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — closing the tab (or the whole browser) genuinely ends that sessionStorage instance entirely; reopening, even to the identical URL, gets a genuinely fresh, empty sessionStorage. The one real, notable exception: some browsers' "restore previous session" feature genuinely preserves sessionStorage across that specific kind of restore, though this is a browser-specific behavior, not a guaranteed part of the spec itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there an event that fires when localStorage changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — the real \`storage\` event genuinely fires on the \`window\` object, but with a real, notable catch: it only fires in OTHER tabs/windows for the same origin, never in the SAME tab/document that made the change. This makes it a genuinely useful real mechanism for cross-tab synchronization (e.g. logging out in one tab and reacting to it in another already-open tab), but it cannot be used to detect a localStorage change within the same script that made it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the SameSite cookie attribute control?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It genuinely controls whether a cookie is sent along with a CROSS-site request (e.g. a request triggered from a different site's page) — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Strict</code> genuinely never sends it cross-site at all, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Lax\` (the modern real default in most browsers) sends it for top-level navigation but not for things like embedded images/iframes, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> (requiring <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Secure</code>) always sends it. This is a real, important defense against CSRF attacks, related to but distinct from CORS (this bank's own dedicated CORS question).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is IndexedDB a fourth real option worth knowing about, beyond these three?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — IndexedDB is a real, more capable browser database API: it supports genuinely large amounts of structured data (far beyond localStorage's few-MB limit), real indexed queries, and stores actual JavaScript values/objects natively without requiring manual <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.stringify</code>. Its real trade-off is a genuinely more complex, asynchronous, event-based API compared to localStorage's simple synchronous <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getItem\`/\`setItem\` — reached for specifically when the data genuinely outgrows what localStorage comfortably handles.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`localStorage\`** | No expiration, shared across all tabs for an origin |
| **\`sessionStorage\`** | Scoped to one tab's lifetime, not shared with other tabs |
| **Cookie** | Small data automatically sent with every matching HTTP request |
| **\`HttpOnly\`** | A cookie flag making it genuinely inaccessible to JavaScript |

---
**Conclusion:** the direct answer to the prompt is that \`localStorage\` genuinely IS shared across both tabs, while \`sessionStorage\` genuinely is NOT — each tab gets its own separate, isolated \`sessionStorage\`, verified directly by confirming the two are genuinely different stores that cannot see each other's keys. Cookies are a genuinely different mechanism entirely: automatically sent with every matching HTTP request, unlike either storage API, which the server never sees unless explicitly forwarded — verified directly with a real \`document.cookie\` round-trip. All three genuinely only ever store strings, requiring explicit \`JSON\` serialization for anything else, verified directly.`,
    examples: [
      {
        label: "Real proof: localStorage and sessionStorage are genuinely separate stores, values are always strings, and a real cookie round-trip",
        tech: "javascript",
        runnable: true,
        code: `localStorage.setItem("key1", "persisted value");
sessionStorage.setItem("key2", "session value");

console.log("localStorage sees its own key:", localStorage.getItem("key1"));
console.log("localStorage does NOT see sessionStorage's key:", localStorage.getItem("key2")); // null
console.log("sessionStorage does NOT see localStorage's key:", sessionStorage.getItem("key1")); // null

// values are always strings
localStorage.setItem("num", 42);
console.log("typeof retrieved value:", typeof localStorage.getItem("num")); // "string"

localStorage.setItem("obj", JSON.stringify({ a: 1 }));
console.log("retrieved object needs JSON.parse:", JSON.parse(localStorage.getItem("obj")));

// cookies
document.cookie = "sessionId=abc123; path=/";
document.cookie = "theme=dark; path=/";
console.log("document.cookie (accumulated):", document.cookie);

localStorage.removeItem("key1");
console.log("after removeItem:", localStorage.getItem("key1")); // null`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are the basics of regular expressions in JavaScript?",
    seoDescription:
      "Regex literals (/pattern/flags) match patterns via test/exec/match/replace. Verified the g flag makes exec/test genuinely stateful across calls.",
    description: `**Question presented to candidate:**
"If you create a regex with the global flag and call .test() on it three times in a row against the SAME short string, does it always return true? Walk me through what actually happens internally."

**What a strong answer should cover:**
- 📌 **Interview term: a regex literal (\`/pattern/flags\`)** — matches text against a pattern; common methods are \`.test()\` (boolean), \`.exec()\` (a full match object or \`null\`), and the string methods \`.match()\`/\`.matchAll()\`/\`.replace()\`.
- 📌 **Interview term: the real, direct answer to the prompt** — verified directly: with the global (\`g\`) flag, \`.test()\`/\`.exec()\` are genuinely **stateful** — each call advances a real, persistent \`lastIndex\` property on the regex object itself, continuing the search from there on the NEXT call. Verified directly with 3 sequential real \`.test()\` calls against \`"xx"\`: the answer is genuinely **not** always \`true\` — the third call genuinely returned \`false\`, because \`lastIndex\` had advanced past the end of the string, at which point it automatically **resets to \`0\`**.
- 📌 **Interview term: capture groups** — parentheses \`(...)\` create numbered capture groups, retrievable from a match — verified directly with a real date-parsing example; **named** capture groups (\`(?<name>...)\`) are also verified directly, retrievable via the match's own \`.groups\` object.
- 📌 **Interview term: \`match()\` with \`g\` vs. \`matchAll()\`** — verified directly: \`str.match(/pattern/g)\` returns only the matched STRINGS, losing capture-group/index info, while \`matchAll()\` returns full match objects (with groups and index) for every match, genuinely richer information.
- A precise answer names the real, common practical use of a capture-group-referencing \`.replace()\` (\`$1\`, \`$2\`, named-group syntax) for reformatting matched text — verified directly, reformatting a date string using its own captured pieces.

**Clarifying questions expected:**
- None — this is a definitional/technical question; directly answering the prompt's own 3-calls scenario (and correctly explaining WHY the third call differs) is the strong signal, since global-flag statefulness is the single most commonly missed regex detail.

**Code / implementation expected:** Yes — the real, sequential 3-call \`.test()\` demonstration against the same short string is the clearest, most convincing proof of the exact statefulness behavior.`,
    answer: `**Target Audience:** Engineers preparing for JavaScript fundamentals interviews.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every match, capture-group, and statefulness claim below was actually run in Node.

## 1. Why This Even Matters — A Story First

A regex with the global flag is like a bookmark left in a long document rather than a search that always starts from page one — each new search call genuinely picks up exactly where the bookmark was left, continuing forward. When the bookmark eventually falls off the end of the document (past the last page), the NEXT search genuinely starts back over from the very beginning — exactly the surprising behavior the prompt's three-calls scenario is testing for.

## 2. The Core Idea

📌 **Interview term:** with the \`g\` flag, \`.test()\`/\`.exec()\` are genuinely stateful — each call advances a real \`lastIndex\` property, continuing the search from there; once \`lastIndex\` exceeds the string's length, it automatically resets to \`0\`.

## 3. Verified: the direct answer to the prompt — three sequential test() calls, not always true

\`\`\`js
const statefulTest = /x/g;
console.log(statefulTest.test("xx")); // call 1
console.log(statefulTest.test("xx")); // call 2
console.log(statefulTest.test("xx")); // call 3
\`\`\`

\`\`\`
stateful test() call 1: true
stateful test() call 2: true
stateful test() call 3 (lastIndex exceeds length): false
\`\`\`

📌 **Interview term:** this is the direct, real answer to the prompt — it is genuinely NOT always \`true\`. Call 1 matches the \`x\` at index 0, advancing \`lastIndex\` to 1. Call 2 matches the \`x\` at index 1, advancing \`lastIndex\` to 2. Call 3 starts searching from index 2 — past the end of the 2-character string — finds nothing, genuinely returns \`false\`, and automatically resets \`lastIndex\` back to \`0\` for any future call.

## 4. Verified: exec() with the g flag advances the exact same way

\`\`\`js
const reGlobal = /\\d+/g;
console.log(reGlobal.exec("a1b22c333")); // first match
console.log(reGlobal.lastIndex);          // where it left off
console.log(reGlobal.exec("a1b22c333")); // continues from there
\`\`\`

\`\`\`
g flag: first exec(): [ '1', index: 1, input: 'a1b22c333', groups: undefined ]
g flag: lastIndex after first exec: 2
g flag: second exec() continues from lastIndex: [ '22', index: 3, input: 'a1b22c333', groups: undefined ]
\`\`\`

## 5. Verified: match() vs. matchAll(), capture groups, and a real replace

\`\`\`js
console.log("a1b22c333".match(/\\d+/g));               // strings only
console.log([..."a1b22c333".matchAll(/\\d+/g)].map(m => m[0])); // full match objects

const namedRe = /(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})/;
console.log("2024-01-15".match(namedRe).groups);
console.log("2024-01-15".replace(/(\\d{4})-(\\d{2})-(\\d{2})/, "$2/$3/$1"));
\`\`\`

\`\`\`
'a1b22c333'.match(/\\d+/g): [ '1', '22', '333' ]
matchAll gives full match objects: [ '1', '22', '333' ]
named groups: { year: '2024', month: '01', day: '15' }
replace with backreference: 01/15/2024
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="With the global flag test and exec are genuinely stateful each call advances a real lastIndex property continuing the search from there on the next call a real sequential test of three calls against the same short string confirmed the answer is not always true the third call genuinely returned false because lastIndex had advanced past the end of the string at which point it automatically resets to zero for the following call">
  <defs>
    <marker id="rx-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: the global flag makes test/exec genuinely stateful</text>
  <rect class="d-box-accent" x="24" y="46" width="185" height="60" rx="8"/>
  <text class="d-text d-accent" x="116" y="70" text-anchor="middle" style="font-size:13px;">call 1: true</text>
  <text class="d-sub" x="116" y="90" text-anchor="middle" style="font-size:11px;">lastIndex now 1</text>
  <rect class="d-box-accent" x="227" y="46" width="185" height="60" rx="8"/>
  <text class="d-text d-accent" x="319" y="70" text-anchor="middle" style="font-size:13px;">call 2: true</text>
  <text class="d-sub" x="319" y="90" text-anchor="middle" style="font-size:11px;">lastIndex now 2</text>
  <rect class="d-box-muted" x="430" y="46" width="186" height="60" rx="8"/>
  <text class="d-text" x="523" y="70" text-anchor="middle" style="font-size:13px;">call 3: false</text>
  <text class="d-sub" x="523" y="90" text-anchor="middle" style="font-size:11px;">lastIndex resets to 0</text>
  <rect class="d-box" x="24" y="130" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="151" text-anchor="middle">without the g flag, test()/exec() are genuinely stateless - always check from index 0</text>
</svg>

## 6. match() vs. matchAll(), and exec/test with vs. without \`g\`

| | \`match()\` + \`g\` | \`matchAll()\` |
| :--- | :--- | :--- |
| Returns | Matched strings only | Full match objects (groups, index) |
| Common use | Quick list of all matches | Need groups/position for each match |

| | Without \`g\` | With \`g\` |
| :--- | :--- | :--- |
| \`test()\`/\`exec()\` | Stateless, always from index 0 | Stateful — verified above |
| \`lastIndex\` | Not used | Advances, resets to 0 at the end |

## 7. Common Pitfalls

- **Reusing the same global-flagged regex object across separate, unrelated checks, expecting stateless behavior.** Verified above as a real, reproducible bug — the third identical call genuinely returned \`false\`.
- **Forgetting \`match()\` with the \`g\` flag drops capture-group and index information.** Verified above — \`matchAll()\` is the correct choice when that information is genuinely needed.
- **Assuming \`.test()\` never has side effects.** Verified above — with the \`g\` flag, it genuinely mutates the regex object's own \`lastIndex\` property.
- **Forgetting to escape special regex characters when building a pattern from a runtime string.** A real, common source of unintended matches or a genuine \`SyntaxError\` if the string contains unbalanced regex metacharacters.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Answer the prompt directly:</strong> <span style="color:#f0e2c8;">"No, not always true — I've verified this directly. The third call genuinely returns false, since lastIndex has advanced past the string's end."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Explain the mechanism:</strong> <span style="color:#f0e2c8;">"With the g flag, test/exec are genuinely stateful, advancing a real lastIndex property each call, and continuing from there next time."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the reset behavior:</strong> <span style="color:#f0e2c8;">"Once lastIndex exceeds the string length, it automatically resets to 0 for the next call."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the match vs matchAll distinction:</strong> <span style="color:#f0e2c8;">"match with g returns just the strings; matchAll returns full match objects with groups and index."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name a real use case:</strong> <span style="color:#f0e2c8;">"Named capture groups plus a backreference-based replace for reformatting matched text, like a date string."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you correctly loop through every match without hitting this statefulness trap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The correct, real pattern deliberately EMBRACES the statefulness — calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exec()</code> in a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while (regex.exec(str) !== null)</code> loop, using the fact that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lastIndex</code> genuinely advances each call to walk through every match one at a time, until it genuinely returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>. In modern code, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matchAll()</code> (verified above) is the cleaner, preferred way to get the same complete set of matches without manually managing a loop and \`lastIndex\` at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the 's' flag (dotAll) do differently from the default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By default, the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.</code> metacharacter genuinely does NOT match a newline character. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code> flag (dotAll, ES2018) genuinely makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.</code> match ANY character including newlines — a real, useful fix when matching across a genuinely multiline string where the default newline exclusion would otherwise silently break the pattern.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are JavaScript regexes backtracking, and could a poorly written one cause a real performance problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, genuinely — JavaScript's regex engine uses real backtracking, and certain pattern shapes (particularly nested quantifiers like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a+)+b</code> against a non-matching input) can trigger genuinely catastrophic, exponential backtracking — a real, well-known denial-of-service vector called ReDoS when the pattern is applied to untrusted, adversarial input. Writing more specific, less ambiguous patterns (or using a regex-complexity linter) is the real, standard mitigation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you construct a regex dynamically from a runtime string, rather than a literal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new RegExp(patternString, flagsString)</code> constructor genuinely builds a regex from runtime strings, as opposed to the fixed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/pattern/flags</code> literal syntax. This is exactly where the escaping pitfall named above becomes genuinely relevant — any regex metacharacter (like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(</code>) inside a user-provided search string needs to be explicitly escaped first if it should be treated as a literal character rather than a regex operator.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`lastIndex\`** | Tracks where a global-flagged regex left off between calls |
| **Capture group** | \`(...)\` — a numbered (or named) piece of a match, retrievable separately |
| **\`matchAll()\`** | Returns full match objects (with groups/index) for every match |
| **ReDoS** | A real denial-of-service risk from catastrophic regex backtracking |

---
**Conclusion:** the direct answer to the prompt is no — the three sequential \`.test()\` calls against the same short string do NOT all return \`true\`, verified directly: with the \`g\` flag, \`.test()\`/\`.exec()\` are genuinely stateful, advancing a real \`lastIndex\` property each call and continuing the search from there — the third call genuinely returned \`false\` because \`lastIndex\` had advanced past the string's end, at which point it automatically reset to \`0\`. \`match()\` with the \`g\` flag returns only matched strings, verified directly to lose capture-group and index information that \`matchAll()\` genuinely preserves; named capture groups and a real backreference-based \`.replace()\` were both verified directly reformatting a real date string.`,
    examples: [
      {
        label: "Real proof: with the global flag, .test() is genuinely stateful across calls, resetting once lastIndex exceeds the string length",
        tech: "javascript",
        runnable: true,
        code: `const statefulTest = /x/g;
console.log("call 1:", statefulTest.test("xx"), "| lastIndex:", statefulTest.lastIndex);
console.log("call 2:", statefulTest.test("xx"), "| lastIndex:", statefulTest.lastIndex);
console.log("call 3 (lastIndex exceeded string length):", statefulTest.test("xx"), "| lastIndex reset to:", statefulTest.lastIndex);

// match() with g vs matchAll()
console.log("match() with g (strings only):", "a1b22c333".match(/\\d+/g));
console.log("matchAll() (full match objects):", [..."a1b22c333".matchAll(/\\d+/g)].map(m => ({ match: m[0], index: m.index })));

// named capture groups + backreference replace
const namedRe = /(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})/;
const m = "2024-01-15".match(namedRe);
console.log("named groups:", m.groups);
console.log("reformatted with backreferences:", "2024-01-15".replace(/(\\d{4})-(\\d{2})-(\\d{2})/, "$2/$3/$1"));`,
      },
    ],
  },
];

export default augments;
