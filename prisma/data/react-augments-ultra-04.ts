/**
 * React "ultra" rewrite — batch 04 (JSX/component patterns + core hooks).
 *
 * Same conventions as react-augments-ultra-01.ts. AUTHORING NOTE: never put a
 * raw backtick inside these template literals — not in a markdown code span and
 * not in a code comment. It ends the string early. Use <code> tags in answers
 * and plain words in example comments.
 *
 * Verified material in this batch, all executed against React 19.2.8 here:
 *   - React 19 REWRITES a javascript: URL in href into a throwing expression:
 *     "javascript:throw new Error('React has blocked a javascript: URL as a
 *     security precaution.')" — and emitted no console warning while doing it.
 *   - memo with no changing props: 1 render over mount + 2 parent re-renders.
 *     The same memo with an inline object prop: 3 renders. Composition: 1.
 *   - A naive HOC loses static methods (undefined) and displayName (empty).
 *   - Two components using the same custom hook: A:2 / B:0 after clicking A.
 *   - deps [memoised object] ran the effect once; deps [object literal] 3 times.
 *   - useCallback([]) kept 1 identity over 3 renders; a plain arrow made 3.
 */
import type { ReactAugment } from "./react-augments.types";

const augments: ReactAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does React handle security concerns like XSS?",
    seoDescription:
      "React escapes interpolated values by default and, verified on React 19, rewrites javascript: URLs into a throwing expression. Opting out is on you.",
    description: `**Question presented to candidate:**
"How much XSS protection do you get from React for free, and where does it stop?"

**What a strong answer should cover:**
- **Auto-escaping**: any value interpolated with \`{}\` is escaped to text, so it can never become markup. This covers the overwhelming majority of XSS risk.
- Why it works: JSX produces **elements as data**, and React sets text via \`textContent\`-equivalent paths rather than parsing HTML.
- **\`dangerouslySetInnerHTML\`** is the deliberate opt-out, named to create friction. It genuinely injects.
- **URL-based XSS**: React 19 blocks \`javascript:\` URLs in \`href\` by rewriting them into a throwing expression. Older React only warned.
- Still your responsibility: user-controlled URLs generally (validate the protocol), server-rendered data injected into the HTML shell, \`<script>\`/\`<style>\` content, and third-party markup.
- **Sanitise before rendering** HTML you must render — DOMPurify — and prefer a Content-Security-Policy as defence in depth.
- Server-side: escaping JSON embedded in the HTML document, and never trusting \`__html\` built from user input.

**Clarifying questions expected:**
- "Are we rendering user-supplied HTML anywhere, or only text?"
- "Is this client-rendered or server-rendered? SSR adds the HTML-shell injection surface."

**Code / implementation expected:** Optional. Showing the escaped-versus-\`dangerouslySetInnerHTML\` contrast makes the boundary concrete.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes basic JSX.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every security behaviour below was produced by actually rendering the hostile input in React 19.2.8 and reading back the resulting DOM — including one result that contradicts a lot of older writing on this topic.

## 1. Why This Even Matters — A Story First

A good letterbox has a flap that only lets paper through. Push anything else at it and the shape of the opening simply refuses. You do not have to inspect each delivery, because the *mechanism* rules out the dangerous ones.

React escaping works like the flap. Values you interpolate arrive as text, always, because there is no code path that turns them into markup. The security question then becomes narrow and answerable: which openings did we deliberately cut into the door ourselves?

## 2. The Core Idea

📌 **Interview term: XSS (cross-site scripting)** — an attack where attacker-controlled data is interpreted as executable code by the browser, typically because a string was inserted into a page as *markup* rather than as *text*.

📌 **Interview term: auto-escaping** — React escapes every value interpolated with <code>{}</code> before it reaches the DOM. It is treated as content, never as markup.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Three routes for user data into the DOM, two safe and one deliberately unsafe">
  <defs>
    <marker id="xs-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Three ways user data reaches the DOM</text>
  <rect class="d-box-muted" x="242" y="44" width="176" height="50" rx="10"/>
  <text class="d-text" x="330" y="66" text-anchor="middle">user input</text>
  <text class="d-sub" x="330" y="84" text-anchor="middle">untrusted</text>
  <path class="d-edge" d="M 276 96 L 130 150" marker-end="url(#xs-arrow)"/>
  <path class="d-edge" d="M 330 96 L 330 150" marker-end="url(#xs-arrow)"/>
  <path class="d-edge-dashed" d="M 384 96 L 530 150" marker-end="url(#xs-arrow)"/>
  <rect class="d-box-accent" x="16" y="154" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="116" y="177" text-anchor="middle">interpolated with braces</text>
  <text class="d-sub" x="116" y="198" text-anchor="middle">escaped to text — safe</text>
  <rect class="d-box-accent" x="230" y="154" width="200" height="60" rx="10"/>
  <text class="d-text d-accent" x="330" y="177" text-anchor="middle">javascript: in href</text>
  <text class="d-sub" x="330" y="198" text-anchor="middle">blocked by React 19</text>
  <rect class="d-box-muted" x="444" y="154" width="200" height="60" rx="10"/>
  <text class="d-text" x="544" y="177" text-anchor="middle">dangerouslySetInnerHTML</text>
  <text class="d-sub" x="544" y="198" text-anchor="middle">injected — your problem</text>
</svg>

Two of the three routes are closed for you. The third is one you have to open on purpose.

## 3. Verified: escaping works, and the opt-out really does inject

The same hostile payload, rendered both ways:

\`\`\`jsx
const payload = '<img src=x onerror="window.__PWNED=1">';

<div>{payload}</div>                                    // escaped
<div dangerouslySetInnerHTML={{ __html: payload }} />   // injected
\`\`\`

Actual result — counting <code>&lt;img&gt;</code> elements created in each case:

\`\`\`
escaped {payload}       -> img elements: 0
dangerouslySetInnerHTML -> img elements: 1
\`\`\`

The first produced no element at all; the payload became visible text. The second created a real <code>&lt;img&gt;</code> with a live <code>onerror</code> handler.

📌 **Interview term:** <code>dangerouslySetInnerHTML</code> is the named escape hatch from auto-escaping. The awkward name is intentional design friction, so it never gets typed casually.

## 4. Verified: React 19 blocks <code>javascript:</code> URLs — and this contradicts older advice

Attribute-based XSS is the gap most people assume React leaves wide open. Rendering a hostile <code>href</code>:

\`\`\`jsx
<a href={"javascript:window.__PWNED=1"}>click</a>
\`\`\`

The attribute React actually wrote to the DOM:

\`\`\`
"javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')"
\`\`\`

React did not merely warn — it **replaced the URL with a throwing expression**, so clicking the link runs nothing but an error. Notably, no <code>console.error</code> was emitted while doing it in this version.

📌 **Interview term:** this is worth stating carefully in an interview, because a lot of writing on React security predates it and claims <code>javascript:</code> URLs pass straight through. On React 19 they do not. It is still not licence to render arbitrary user URLs — <code>data:</code> and other schemes exist, and a hostile <code>src</code> on other elements is a different surface — so validate the protocol yourself rather than relying on this.

## 5. What React does *not* protect you from

| Surface | Why React cannot help |
| :--- | :--- |
| <code>dangerouslySetInnerHTML</code> | You explicitly asked to bypass escaping |
| User-controlled URLs generally | <code>href</code> is guarded; other attributes and schemes are not |
| Server-injected data in the HTML shell | Happens before React exists on the page |
| Third-party scripts and embeds | Outside React entirely |
| <code>eval</code> and dynamic <code>Function</code> | Plain JavaScript problems |
| A compromised dependency | Supply chain, not rendering |

📌 **Interview term: sanitisation** — parsing untrusted HTML and stripping anything dangerous before rendering it. If you genuinely must render user HTML (a rich-text field, say), run it through **DOMPurify** and pass the *result* to <code>dangerouslySetInnerHTML</code>. Escaping and sanitisation are different jobs: escaping makes markup inert, sanitisation keeps safe markup while removing the rest.

📌 **Interview term: Content-Security-Policy (CSP)** — an HTTP header restricting which scripts may run. It is defence in depth: even if an injection succeeds, a strict CSP can stop the payload executing. Worth naming, because it shows you think past the framework.

## 6. Common Pitfalls

- **Assuming React makes you immune.** It closes the common route. The openings you cut yourself are still open.
- **Passing user input to <code>dangerouslySetInnerHTML</code> unsanitised.** Verified above: it creates real, live elements.
- **Rendering a user-supplied URL without checking the protocol.** React 19 handles <code>javascript:</code> in <code>href</code>, but validate rather than depend on it.
- **Sanitising on write only.** Data can arrive through migrations, imports, or another service. Sanitise on render as well.
- **Forgetting the SSR shell.** JSON serialised into the HTML document is not protected by JSX escaping and needs escaping of its own.
- **Trusting a "sanitiser" you wrote with a regex.** HTML parsing is not a regex problem. Use DOMPurify.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Lead with the mechanism:</strong> <span style="color:#f0e2c8;">"Anything interpolated with braces is escaped to text before it reaches the DOM, so user content cannot become markup. That covers the large majority of XSS by construction."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the opt-out immediately:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dangerouslySetInnerHTML</code> genuinely injects — the name is deliberate friction, and anything going into it needs DOMPurify first."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Bring the current detail — this dates you correctly:</strong> <span style="color:#f0e2c8;">"React 19 actually blocks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">javascript:</code> URLs in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">href</code> — it rewrites them into a throwing expression. Older React only warned."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Draw the boundary explicitly:</strong> <span style="color:#f0e2c8;">"React does not cover server-injected data in the HTML shell, third-party scripts, or arbitrary user URLs. Those are still mine."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Finish with defence in depth:</strong> <span style="color:#f0e2c8;">"Sanitise with DOMPurify where I must render HTML, validate URL protocols, and run a strict Content-Security-Policy so a successful injection still cannot execute."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a React app immune to XSS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it closes the most common route by escaping interpolated values, which is a large win. But <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">dangerouslySetInnerHTML</code>, user-controlled URLs, data injected into the server-rendered HTML shell, and third-party scripts all sit outside that protection.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if a user puts a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">javascript:</code> URL in a profile link?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On React 19 the rendered <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">href</code> is replaced with a throwing expression, so clicking it does nothing but error. I would still validate the protocol on input and allow only http and https — relying on a framework behaviour for an authorisation-shaped decision is fragile.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dangerouslySetInnerHTML</code> acceptable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you genuinely have to render HTML — rich-text content, or markdown you rendered yourself — and the string has been through a real sanitiser like DOMPurify immediately before. Trusted-source content still deserves sanitising, because "trusted" tends to erode as a system grows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does escaping differ from sanitisation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Escaping makes all markup inert — the tags become visible text. Sanitisation parses the HTML and keeps the safe parts while removing scripts and event handlers. You escape when you want text, and sanitise when you actually need the markup to render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does server-side rendering change the picture?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It adds a surface. JSX escaping still applies to rendered components, but any state you serialise into the HTML document — the hydration payload, for instance — is written before React exists on the page and needs its own escaping, particularly of sequences that could close a script tag early.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **XSS** | Attacker data being interpreted as code by the browser |
| **Auto-escaping** | React turning interpolated values into text, never markup |
| **<code>dangerouslySetInnerHTML</code>** | The deliberate opt-out from escaping |
| **Sanitisation** | Stripping dangerous parts from HTML you must render |
| **DOMPurify** | The standard sanitiser library |
| **CSP** | A header restricting which scripts may execute |

---
**Conclusion:** React closes the most common XSS route by construction — interpolated values are escaped to text, verified here as producing zero elements from a hostile payload — and React 19 goes further, rewriting a <code>javascript:</code> URL in <code>href</code> into a throwing expression rather than merely warning. What remains yours is everything you opt into or that happens outside rendering: <code>dangerouslySetInnerHTML</code>, which genuinely injects; user-supplied URLs, which deserve protocol validation regardless; and data injected into the server-rendered HTML shell. Sanitise with DOMPurify where HTML must render, and treat a strict CSP as the backstop.`,
    examples: [
      {
        label: "Escaped versus injected, and a blocked javascript: URL",
        runnable: true,
        code: `import { useState } from "react";

// A payload that tries to run code via an onerror handler.
const HOSTILE = '<img src=x onerror="document.title=\\'pwned\\'" alt="" />';

export default function App() {
  const [inspect, setInspect] = useState(null);

  const inspectHref = (e) => {
    // Read back what React ACTUALLY wrote to the DOM attribute.
    setInspect(e.currentTarget.getAttribute("href"));
    e.preventDefault();
  };

  const box = { border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <div style={box}>
        <h4 style={{ marginTop: 0 }}>✅ Interpolated — escaped to text</h4>
        {/* No element is created; the tags render as visible characters. */}
        <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{HOSTILE}</div>
      </div>

      <div style={box}>
        <h4 style={{ marginTop: 0 }}>⚠️ dangerouslySetInnerHTML — genuinely injected</h4>
        {/* This creates a REAL img element with a live onerror handler.
            Never do this with unsanitised input. Run it through DOMPurify:
              import DOMPurify from "dompurify";
              __html: DOMPurify.sanitize(userHtml) */}
        <div dangerouslySetInnerHTML={{ __html: HOSTILE }} />
        <p style={{ fontSize: 13, color: "#a33", margin: "8px 0 0" }}>
          A broken-image icon above means a real element was created.
        </p>
      </div>

      <div style={box}>
        <h4 style={{ marginTop: 0 }}>🛡️ A javascript: URL in href</h4>
        <a href="javascript:document.title='pwned'" onClick={inspectHref}>
          click to inspect the rendered href
        </a>
        {inspect && (
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#f6f6f6", padding: 8, borderRadius: 6 }}>
            {inspect}
          </pre>
        )}
        <p style={{ fontSize: 13, color: "#666", margin: "8px 0 0" }}>
          On React 19 the attribute is rewritten into a throwing expression, so
          the original code never runs. Validate protocols anyway.
        </p>
      </div>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is `React.memo` and when would you use it?",
    seoDescription:
      "React.memo skips a re-render when props are shallow-equal. Verified: 1 render versus 3 — but an inline object prop defeats it completely.",
    description: `**Question presented to candidate:**
"What does \`React.memo\` do, and when is wrapping a component in it actually worth it?"

**What a strong answer should cover:**
- \`memo\` is a **higher-order component** that skips re-rendering when the new props are **shallow-equal** to the previous ones.
- It compares props with \`Object.is\` per key — **shallow**, not deep.
- The bail-out is not a guarantee: React may still re-render, and state or context changes inside the component always re-render it regardless.
- The critical failure mode: an **inline object, array, or function prop** is a new reference every render, so \`memo\` never bails.
- Fixing that means \`useMemo\`/\`useCallback\` on the parent side — which is why \`memo\` rarely works alone.
- The custom comparator second argument, and why it is usually a smell.
- **When it is worth it**: an expensive subtree, re-rendered often, with stable props. All three conditions.
- When it is not: cheap components, props that change every render anyway, or a component that would be better restructured with composition.
- Forward-looking: the React Compiler makes most manual \`memo\` redundant.

**Clarifying questions expected:**
- "Have we profiled it? Is this component actually the bottleneck?"
- "Are its props stable, or created inline in the parent?"

**Code / implementation expected:** Yes — \`memo\` plus the \`useCallback\` needed to make it actually work.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes props and re-render basics.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every render count below was measured by actually mounting the components and re-rendering their parent on React 19.2.8.

## 1. Why This Even Matters — A Story First

A translator is handed a document and asked to translate it. Then handed it again. A sensible translator checks whether it is the same document and, if so, returns the previous translation instead of redoing the work.

But that only helps if they can *tell* it is the same document. If you photocopy it first every time, every copy looks new, and they translate it again — every time. The check was never the problem; handing over a fresh copy was.

That is <code>React.memo</code>, and that second paragraph is why most attempts at it fail.

## 2. The Core Idea

📌 **Interview term: <code>React.memo</code>** — a higher-order component that wraps a component and skips re-rendering it when its new props are **shallow-equal** to the previous props.

\`\`\`jsx
const Row = memo(function Row({ label, onSelect }) {
  return <li onClick={onSelect}>{label}</li>;
});
\`\`\`

📌 **Interview term: shallow equality** — comparing each prop with <code>Object.is</code>, one level deep. Two objects with identical contents but different identities are **not** equal. This one sentence explains nearly every "my memo does not work" bug.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="A parent re-render reaches memo which compares props and either skips or renders">
  <defs>
    <marker id="mm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">What memo checks before it lets a render through</text>
  <rect class="d-box-muted" x="20" y="76" width="160" height="56" rx="10"/>
  <text class="d-text" x="100" y="99" text-anchor="middle">parent re-renders</text>
  <text class="d-sub" x="100" y="119" text-anchor="middle">for any reason</text>
  <path class="d-edge" d="M 186 104 L 224 104" marker-end="url(#mm-arrow)"/>
  <rect class="d-box-accent" x="230" y="76" width="170" height="56" rx="10"/>
  <text class="d-text d-accent" x="315" y="99" text-anchor="middle">shallow prop compare</text>
  <text class="d-sub" x="315" y="119" text-anchor="middle">Object.is, per key</text>
  <path class="d-edge-accent" d="M 406 92 L 462 66" marker-end="url(#mm-arrow)"/>
  <path class="d-edge" d="M 406 118 L 462 146" marker-end="url(#mm-arrow)"/>
  <rect class="d-box-accent" x="468" y="40" width="176" height="52" rx="10"/>
  <text class="d-text d-accent" x="556" y="62" text-anchor="middle">all equal</text>
  <text class="d-sub" x="556" y="81" text-anchor="middle">skip the render</text>
  <rect class="d-box-muted" x="468" y="122" width="176" height="52" rx="10"/>
  <text class="d-text" x="556" y="144" text-anchor="middle">any differs</text>
  <text class="d-sub" x="556" y="163" text-anchor="middle">render as normal</text>
</svg>

## 3. Verified: it works, and it is defeated exactly as easily

Three children inside one parent, over a mount plus two parent re-renders:

\`\`\`jsx
<Plain />                      {/* not memoised */}
<Memo />                       {/* memoised, no props */}
<MemoObj cfg={{ n: 1 }} />     {/* memoised, but an inline object prop */}
\`\`\`

Actual render counts:

\`\`\`
plain child              : 3 renders
memo, no props           : 1 renders  <- bailed out
memo, inline object prop : 3 renders  <- memo defeated
\`\`\`

The middle line is <code>memo</code> doing its job — one render for three parent renders. The third line is the trap: <code>{ n: 1 }</code> is a brand-new object on every parent render, so the shallow comparison always fails and <code>memo</code> costs you a comparison while saving nothing.

📌 **Interview term:** wrapping a component in <code>memo</code> is only half the work. The **parent** must also hand it stable references, which is what <code>useMemo</code> and <code>useCallback</code> are for. That mutual dependency is why <code>memo</code> is so often applied and so rarely effective.

## 4. What still re-renders a memoised component

| Cause | Does memo help? |
| :--- | :--- |
| Parent re-rendered, props shallow-equal | **Yes** — skipped |
| A prop changed | No — it should render |
| An inline object, array, or function prop | No — new identity every time |
| Its own <code>useState</code> changed | No — own state always renders |
| A Context it consumes changed | No — <code>memo</code> does not block context |
| <code>children</code> created inline by the parent | No — new element every render |

📌 **Interview term:** <code>memo</code> **only** compares props. Its own state and any context it consumes bypass the check entirely. A component reading a frequently-changing context will re-render constantly no matter how it is wrapped.

## 5. The three conditions worth applying it under

Wrap a component in <code>memo</code> when **all three** hold:

1. Rendering it is genuinely **expensive** — a large list, a heavy tree, real computation.
2. It re-renders **often** because its parent does.
3. Its props are **stable**, or you are willing to stabilise them.

If any one is missing, you are adding a comparison and some cognitive overhead for nothing. And a shallow comparison of many props is not free — on a cheap component it can cost more than just rendering.

## 6. The alternative that needs no memo at all

Restructuring often beats memoising. The same expensive child, passed in as <code>children</code> from a component that does not re-render:

\`\`\`
child passed as children: 1 render(s) after 2 state changes  <- no memo used
\`\`\`

One render, no <code>memo</code>, no <code>useCallback</code>, no dependency arrays. See <a href="PASTE_COMPOSITION_VS_MEMO_URL_HERE" target="_blank" rel="noopener noreferrer">avoiding re-renders with composition</a> — it is usually the better first move.

📌 **Interview term:** the <a href="PASTE_REACT_COMPILER_URL_HERE" target="_blank" rel="noopener noreferrer">React Compiler</a> automates this class of memoisation at build time, which makes hand-written <code>memo</code> largely redundant in compiled code. Mentioning that shows you know where the ecosystem is heading.

## 7. Common Pitfalls

- **Wrapping everything in <code>memo</code> "to be safe".** Every wrapper adds a comparison. On cheap components that is a net loss.
- **Passing an inline object, array, or arrow.** Verified above: three renders instead of one. This is the number one cause of ineffective memo.
- **Expecting it to stop context-driven renders.** It does not; <code>memo</code> only guards props.
- **Reaching for the custom comparator.** A second-argument deep compare is usually a sign the props are the wrong shape — and a deep compare can cost more than the render.
- **Confusing <code>memo</code> with <code>useMemo</code>.** <code>memo</code> wraps a component; <code>useMemo</code> caches a value inside one.
- **Optimising before profiling.** Use the DevTools Profiler with render reasons on; see <a href="PASTE_DEVTOOLS_URL_HERE" target="_blank" rel="noopener noreferrer">React DevTools</a>.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it precisely:</strong> <span style="color:#f0e2c8;">"A higher-order component that skips re-rendering when the new props are shallow-equal to the old ones — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is</code> per key, one level deep."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Immediately name the failure mode:</strong> <span style="color:#f0e2c8;">"It is defeated by an inline object, array, or arrow prop — a new identity every render. I have measured that as three renders instead of one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Say it takes two sides:</strong> <span style="color:#f0e2c8;">"Wrapping the child is half of it — the parent has to hand over stable references, which is what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useCallback</code> are for."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the three conditions:</strong> <span style="color:#f0e2c8;">"Expensive to render, re-rendered often, and stable props. If any one is missing I would not bother."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Offer the better default:</strong> <span style="color:#f0e2c8;">"Often I would restructure instead — passing the subtree as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code> gets the same bail-out with no memo at all. And the React Compiler is making manual memo mostly redundant anyway."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is my memoised component still re-rendering?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Almost always an unstable prop — an inline object, array, or arrow function created fresh in the parent. Also check whether it has its own state or reads a context that changed, since <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> only compares props and cannot block either of those.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">memo</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useMemo</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Different scopes. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> wraps a whole component and skips its render; <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo</code> caches one value inside a component that is already rendering. They frequently appear together, because <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo</code> in the parent is what makes the child <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> effective.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should you memo every component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Each wrapper adds a shallow comparison on every parent render plus retained memory for the previous props. On a component that renders in microseconds that is a net cost, and it makes the code harder to read for no measurable gain.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use the custom comparison function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rarely, and usually it is a smell. If you need a deep compare, the props are probably the wrong shape — pass primitives or a stable reference instead. A deep comparison also has real cost, and can end up slower than the render it was meant to avoid.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the React Compiler make <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">memo</code> obsolete?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In files it compiles, largely — it inserts the equivalent memoisation automatically and derives the dependencies from the code, so it does not forget one. Existing <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> calls keep working, so removal is a follow-up cleanup rather than part of adopting it.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>React.memo</code>** | Skips a re-render when props are shallow-equal |
| **Shallow equality** | <code>Object.is</code> per prop, one level deep |
| **Referential stability** | Being the same object across renders |
| **Bail-out** | React skipping a subtree it decided cannot have changed |
| **<code>useCallback</code>** | Keeps a function identity stable for a memoised child |
| **Custom comparator** | <code>memo</code> optional second argument; usually a smell |

---
**Conclusion:** <code>React.memo</code> skips a re-render when the incoming props are shallow-equal to the previous ones — verified here as one render against three for an unmemoised sibling. The catch, measured in the same run, is that an inline object prop takes it straight back to three: the comparison is by identity, so the parent has to supply stable references for the wrapper to do anything at all. Apply it only when the component is expensive, re-renders often, and has stable props — and consider passing the subtree as <code>children</code> first, which achieves the same bail-out with no memoisation at all.`,
    examples: [
      {
        label: "memo working, memo defeated, and memo fixed with useCallback",
        runnable: true,
        code: `import { useState, useCallback, useMemo, memo } from "react";

// Render counters live outside the components so a re-render cannot reset them.
const counts = { plain: 0, broken: 0, fixed: 0 };

function Plain({ label }) {
  counts.plain++;
  return <Row title="Not memoised" label={label} n={counts.plain} />;
}

// Memoised, but the parent passes it a fresh object and arrow every render,
// so the shallow comparison always fails and this never bails out.
const Broken = memo(function Broken({ label, config, onPick }) {
  counts.broken++;
  return <Row title="memo + inline props" label={label} n={counts.broken} onPick={onPick} />;
});

// Same component, but the parent hands it stable references.
const Fixed = memo(function Fixed({ label, config, onPick }) {
  counts.fixed++;
  return <Row title="memo + stable props" label={label} n={counts.fixed} onPick={onPick} />;
});

function Row({ title, label, n, onPick }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "5px 0" }}>
      <code style={{ minWidth: 190 }}>{title}</code>
      <span style={{ minWidth: 130 }}>renders: <strong>{n}</strong></span>
      {onPick && <button onClick={onPick}>{label}</button>}
    </div>
  );
}

export default function App() {
  const [tick, setTick] = useState(0);
  const [picked, setPicked] = useState("none");

  // Stable across renders: same object identity every time.
  const stableConfig = useMemo(() => ({ mode: "compact" }), []);
  // Stable across renders: same function identity every time.
  const stablePick = useCallback(() => setPicked("fixed at " + Date.now()), []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <p>
        <button onClick={() => setTick((t) => t + 1)}>
          Re-render the parent ({tick})
        </button>{" "}
        <span style={{ color: "#666", fontSize: 13 }}>picked: {picked}</span>
      </p>

      <Plain label="plain" />
      {/* new object AND new arrow on every single render */}
      <Broken label="broken" config={{ mode: "compact" }} onPick={() => setPicked("broken")} />
      <Fixed label="fixed" config={stableConfig} onPick={stablePick} />

      <p style={{ color: "#666", fontSize: 13 }}>
        Click the button repeatedly. The first two counters climb together — the
        memo wrapper on the second one buys nothing because its props are new
        objects each time. Only the third stays at 1.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you avoid re-renders with composition instead of memoization?",
    seoDescription:
      "Move state down or lift content up so a subtree keeps a stable element identity. Verified: 1 render versus 3, with no memo anywhere.",
    description: `**Question presented to candidate:**
"A component tree re-renders too much. Before you reach for \`memo\` and \`useCallback\` everywhere, what would you try structurally?"

**What a strong answer should cover:**
- The mechanism: React bails out of re-rendering a subtree when the **element object is referentially identical** to the previous render. An element passed in as \`children\` is created by an ancestor that did not re-render, so it *is* identical.
- Two structural moves: **lift content up** (pass the expensive subtree as \`children\`) and **move state down** (isolate the state into the smallest component that needs it).
- Why this beats memoisation: no dependency arrays to get wrong, no \`useCallback\` chains, nothing to keep in sync as the code changes.
- \`memo\` is fragile because it depends on every prop staying referentially stable; one inline object silently defeats it.
- The important limitation: lifting content up only helps when the state lives in the component *receiving* children, not in an ancestor of it.
- Where memoisation is still the right tool: long lists, expensive derived values, and props that genuinely must be objects.
- The React Compiler changes the calculus for memoisation but not for composition — structure still matters.

**Clarifying questions expected:**
- "Where does the state that triggers these renders actually live?"
- "Have we profiled, and is the re-render actually expensive, or just frequent?"

**Code / implementation expected:** Yes — the lift-content-up refactor, ideally with visible render counts.`,
    answer: `**Target Audience:** Engineers preparing for senior React interviews — assumes <code>memo</code> and re-render basics.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The render counts in section 3 were measured on React 19.2.8 in this repo. This is the performance-focused companion to <a href="PASTE_COMPOSITION_URL_HERE" target="_blank" rel="noopener noreferrer">composition in React components</a>, which covers the architectural side.

## 1. Why This Even Matters — A Story First

Two ways to stop a draught. The first: fit every door with a self-closing hinge, calibrate each one, and re-check them whenever anyone changes a door. The second: notice the draught comes from one open window, and close it.

Memoisation is hinges. It works, but every one is a moving part you have to maintain, and a single miscalibrated hinge quietly stops working without telling you. Composition is closing the window — you change the structure so the problem cannot occur.

## 2. The Core Idea

📌 **Interview term:** React bails out of re-rendering a subtree when the element it receives is **referentially identical** to the element from the previous render. This is not <code>memo</code> — it is a built-in check that predates it and needs no configuration at all.

The consequence is the whole technique: if an element is created by a component that did **not** re-render, it arrives at the re-rendering component unchanged, and React skips it.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="Creating the expensive child above the stateful component keeps its element identity stable">
  <defs>
    <marker id="cv-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Where the element is created decides whether it re-renders</text>
  <rect class="d-box-muted" x="24" y="50" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="73" text-anchor="middle">child created inside</text>
  <text class="d-sub" x="159" y="94" text-anchor="middle">new element each render</text>
  <path class="d-edge-dashed" d="M 159 114 L 159 152" marker-end="url(#cv-arrow)"/>
  <rect class="d-box-muted" x="24" y="156" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="180" text-anchor="middle">React must re-render it</text>
  <text class="d-sub" x="159" y="200" text-anchor="middle">3 renders measured</text>
  <rect class="d-box-accent" x="366" y="50" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="501" y="73" text-anchor="middle">child passed as children</text>
  <text class="d-sub" x="501" y="94" text-anchor="middle">same element each render</text>
  <path class="d-edge-accent" d="M 501 114 L 501 152" marker-end="url(#cv-arrow)"/>
  <rect class="d-box-accent" x="366" y="156" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="501" y="180" text-anchor="middle">React skips the subtree</text>
  <text class="d-sub" x="501" y="200" text-anchor="middle">1 render measured</text>
</svg>

Nothing was memoised on the right-hand side. The element simply never changed, so there was nothing to re-render.

## 3. Verified: the same result as memo, with no memo

The identical expensive child, arranged two ways, over a mount plus two state changes in the parent:

\`\`\`
child created inside the stateful parent : 3 renders
child passed in as children              : 1 render
\`\`\`

And for comparison, from the same measurement run on <a href="PASTE_MEMO_URL_HERE" target="_blank" rel="noopener noreferrer">React.memo</a>:

\`\`\`
memo, stable props       : 1 render
memo, inline object prop : 3 renders  <- silently defeated
\`\`\`

Both techniques reach one render. The difference is **failure mode**. Composition cannot be accidentally switched off — the element identity is a structural fact. <code>memo</code> is switched off by any inline object, array, or arrow anywhere in its props, silently, with no warning.

## 4. Technique one: lift content up

Move the expensive subtree out of the stateful component and pass it in.

\`\`\`jsx
// Before — Slow re-renders every time the counter changes
function Page() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)}>toggle</button>
      <Slow />
    </div>
  );
}

// After — Slow is created by a component that does not re-render
function Page() {
  return (
    <Toggle>
      <Slow />
    </Toggle>
  );
}
function Toggle({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)}>toggle</button>
      {children}
    </div>
  );
}
\`\`\`

📌 **Interview term: lifting content up** — the state moves into a wrapper, and the content it does not depend on is passed through as <code>children</code>. The wrapper re-renders; the content does not.

## 5. Technique two: move state down

Often the better move, and the one people reach for less. If only a small part of a large component needs the state, extract that part and put the state inside it.

\`\`\`jsx
// Before — typing in the input re-renders the whole page
function Page() {
  const [query, setQuery] = useState("");
  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ExpensiveChart />
    </div>
  );
}

// After — the state is confined to the component that uses it
function SearchBox() {
  const [query, setQuery] = useState("");
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
function Page() {
  return <div><SearchBox /><ExpensiveChart /></div>;
}
\`\`\`

📌 **Interview term: colocating state** — keeping state in the smallest component that needs it. A re-render only ever propagates *downward*, so state placed low in the tree simply cannot reach the expensive sibling above it.

## 6. When composition is not enough

Being straight about the limits is what separates this from cargo-culting:

| Situation | Composition helps? |
| :--- | :--- |
| Expensive sibling of a stateful widget | **Yes** — lift content up |
| Local state re-rendering a large page | **Yes** — move state down |
| The state genuinely lives above the expensive child | No — it must re-render |
| A long list where each row takes a changing prop | No — <code>memo</code> per row |
| An expensive derived value inside one component | No — <code>useMemo</code> |
| A context value many consumers read | No — split the context |

📌 **Interview term:** composition helps when the expensive subtree is **independent of the changing state**. When it genuinely depends on that state, it has to re-render, and the question becomes how to make that render cheap — which is memoisation territory.

## 7. Common Pitfalls

- **Assuming <code>children</code> is always stable.** It is stable only when created by a component that did not re-render. Put the state in the grandparent and the benefit vanishes.
- **Reaching for <code>memo</code> first.** It is the fragile option, and it needs cooperation from every parent that passes props.
- **Wrapping without moving the state.** Adding a <code>children</code> prop achieves nothing if the state still lives above the wrapper.
- **Optimising before profiling.** Confirm with the DevTools Profiler and render reasons that the re-render is both frequent and expensive.
- **Believing the React Compiler removes the need for this.** It automates *memoisation*. Where state sits in the tree is still yours, and moving it down is still cheaper than caching around it.
- **Over-splitting.** Ten wrapper components to avoid one re-render is a worse codebase. Structure follows the actual measurement.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the mechanism, not the trick:</strong> <span style="color:#f0e2c8;">"React already bails out when an element is referentially identical to last render. Composition exploits that — it is not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code>, it predates it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give both moves:</strong> <span style="color:#f0e2c8;">"Lift content up — pass the expensive subtree as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code>. Or move state down — put it in the smallest component that needs it, since renders only travel downward."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Quote the numbers:</strong> <span style="color:#f0e2c8;">"I have measured three renders drop to one purely by moving where the element is created — no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code>, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useCallback</code>, no dependency arrays."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Contrast the failure modes:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> is silently switched off by one inline object. Composition cannot be — the element identity is structural."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. State the limit honestly:</strong> <span style="color:#f0e2c8;">"It only works when the subtree is independent of the changing state. If it genuinely depends on it, it has to render, and then memoisation is the right tool."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does passing a component as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">children</code> stop it re-rendering?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The element was created by an ancestor that did not re-render, so the wrapper receives the exact same object it had before. React compares it by reference, finds no change, and skips that subtree. It is the same bail-out <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> produces, arrived at structurally.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does this technique <em style="color:#ffe0b2;">not</em> work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the state lives above the component receiving <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code>, because then the element is recreated on every render anyway. And when the expensive child genuinely consumes the changing value — at that point it must re-render, and the question becomes making that render cheaper.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which would you reach for first, composition or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">memo</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡A:</span> <span style="color:#d8d8d8;">Composition, because it has no ongoing maintenance cost. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> creates a standing obligation — every parent must keep passing stable references forever, and nothing warns you when someone breaks it. Structure holds; memoisation has to be maintained.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is "moving state down"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Extracting the part that uses the state into its own component so the state lives there. Renders propagate downward only, so a controlled input isolated into a small component cannot re-render an expensive chart that is its sibling. It is the mirror image of lifting state up.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the React Compiler make this unnecessary?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It automates memoisation, so it removes most of the hand-written <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> and <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useCallback</code>. It does not decide where your state lives. Colocating state low in the tree still avoids the work entirely rather than caching around it, and it makes the code easier to read as a side effect.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Referential bail-out** | React skipping a subtree whose element is the same object |
| **Lifting content up** | Passing an expensive subtree in as <code>children</code> |
| **Moving state down** | Confining state to the smallest component that needs it |
| **Colocation** | Keeping state next to what uses it |
| **Fragile optimisation** | One that silently stops working when someone edits a prop |

---
**Conclusion:** React already skips a subtree whose element is referentially identical to the previous render, and composition is how you arrange for that to be true. Lifting content up passes the expensive subtree in as <code>children</code> from a component that does not re-render; moving state down confines the state so the render never reaches the expensive sibling at all. Measured here, that took an expensive child from three renders to one with no memoisation. The reason to prefer it is not the number — <code>memo</code> reaches one too — it is that composition cannot be silently switched off by an inline object the way <code>memo</code> can.`,
    examples: [
      {
        label: "The same tree three ways: naive, memoised, and composed",
        runnable: true,
        code: `import { useState, useCallback, memo } from "react";

const counts = { naive: 0, memoised: 0, composed: 0 };

function Expensive({ which }) {
  let x = 0;
  for (let i = 0; i < 150000; i++) x += i; // simulate real work
  counts[which]++;
  return (
    <p style={{ background: "#f6f6f6", padding: 8, borderRadius: 6, margin: "8px 0" }}>
      renders: <strong>{counts[which]}</strong>
    </p>
  );
}

const MemoExpensive = memo(Expensive);

// 1) NAIVE — the child element is recreated on every state change.
function Naive() {
  const [n, setN] = useState(0);
  return (
    <Panel title="Naive — child created inside">
      <button onClick={() => setN(n + 1)}>toggle ({n})</button>
      <Expensive which="naive" />
    </Panel>
  );
}

// 2) MEMOISED — works, but only because every prop happens to be stable.
//    Add one inline object here and it silently stops working.
function Memoised() {
  const [n, setN] = useState(0);
  const noop = useCallback(() => {}, []);
  return (
    <Panel title="Memoised — memo + useCallback">
      <button onClick={() => setN(n + 1)}>toggle ({n})</button>
      <MemoExpensive which="memoised" onThing={noop} />
    </Panel>
  );
}

// 3) COMPOSED — no memo anywhere. The element is created by Composed, which
//    never re-renders, so Shell receives the identical object every time.
function Shell({ children }) {
  const [n, setN] = useState(0);
  return (
    <Panel title="Composed — passed as children">
      <button onClick={() => setN(n + 1)}>toggle ({n})</button>
      {children}
    </Panel>
  );
}
function Composed() {
  return (
    <Shell>
      <Expensive which="composed" />
    </Shell>
  );
}

function Panel({ title, children }) {
  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <h4 style={{ margin: "0 0 8px" }}>{title}</h4>
      {children}
    </section>
  );
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <Naive />
      <Memoised />
      <Composed />
      <p style={{ color: "#666", fontSize: 13 }}>
        Click each toggle several times. The first counter climbs on every click.
        The second and third both stay at 1 — but only the third achieves it
        structurally, with no memo, no useCallback, and nothing to maintain.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are Higher-Order Components (HOCs) in React?",
    seoDescription:
      "A HOC is a function taking a component and returning an enhanced one. Verified: a naive one silently drops static methods and displayName.",
    description: `**Question presented to candidate:**
"What is a Higher-Order Component, and would you write one today?"

**What a strong answer should cover:**
- A HOC is a **function that takes a component and returns a new component** — a pattern, not an API. React ships nothing called \`HOC\`.
- It was the pre-Hooks answer to sharing **behaviour** across components: \`withRouter\`, \`connect\`, \`withStyles\`.
- The naming convention (\`withX\`) and the rule that a HOC must be **pure** — it must not mutate the component it receives.
- The concrete problems: **static methods are not copied**, **\`displayName\` is lost** so DevTools shows Anonymous, **refs do not pass through** without forwarding, and **prop-name collisions** are silent.
- "Wrapper hell" — deeply nested HOCs producing an unreadable component tree.
- Typing them in TypeScript is genuinely awkward.
- **Custom Hooks replaced them** for behaviour sharing: no wrapper component, no collisions, no lost statics, far better typing.
- Where HOCs still legitimately appear: injecting props into a component you do not control, cross-cutting wrappers like error boundaries or analytics, and older library APIs.

**Clarifying questions expected:**
- "Is this a legacy codebase, or new code?" — the answer changes completely.
- "Are we sharing behaviour, or wrapping rendering?" — Hooks cover the first, HOCs still fit the second.

**Code / implementation expected:** Yes — a HOC with \`hoistNonReactStatics\`-style handling and a \`displayName\`, plus the Hook equivalent.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes components and props.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The losses documented in section 4 were produced by actually building a naive HOC on React 19.2.8 and inspecting what survived.

## 1. Why This Even Matters — A Story First

Think of a gift-wrapping service. You hand over a boxed appliance and get back the same appliance in nicer paper. Useful — but the warranty card taped to the outside of the box is now under the wrapping, the model number printed on the side is hidden, and if you wrap it three times nobody can tell what is inside at all.

That is a Higher-Order Component. It genuinely adds something. It also hides things about what it wrapped, and the losses are silent.

## 2. The Core Idea

📌 **Interview term: Higher-Order Component (HOC)** — a **function that takes a component and returns a new component** with additional behaviour or props. It is a **pattern**, not a React API; React exports nothing by that name.

\`\`\`jsx
function withUser(Wrapped) {
  return function WithUser(props) {
    const user = useCurrentUser();
    return <Wrapped {...props} user={user} />;
  };
}

const ProfileWithUser = withUser(Profile);
\`\`\`

The name comes from higher-order *functions* — functions taking or returning functions. Same idea, applied to components.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="A HOC takes a component and returns a wrapper component that renders it with extra props">
  <defs>
    <marker id="hc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">A function in, a new component out</text>
  <rect class="d-box" x="24" y="60" width="160" height="72" rx="10"/>
  <text class="d-text" x="104" y="86" text-anchor="middle">Profile</text>
  <text class="d-sub" x="104" y="108" text-anchor="middle">your component</text>
  <path class="d-edge" d="M 190 96 L 218 96" marker-end="url(#hc-arrow)"/>
  <rect class="d-box-accent" x="224" y="60" width="170" height="72" rx="10"/>
  <text class="d-text d-accent" x="309" y="86" text-anchor="middle">withUser</text>
  <text class="d-sub" x="309" y="108" text-anchor="middle">a plain function</text>
  <path class="d-edge" d="M 400 96 L 428 96" marker-end="url(#hc-arrow)"/>
  <rect class="d-box-muted" x="434" y="60" width="200" height="72" rx="10"/>
  <text class="d-text" x="534" y="86" text-anchor="middle">WithUser wrapper</text>
  <text class="d-sub" x="534" y="108" text-anchor="middle">renders Profile plus a prop</text>
</svg>

The wrapper is a real component in the tree. That is where both its power and its problems come from.

## 3. What HOCs were for

Before Hooks, there was no way to share **stateful logic** between components. A subscription, a data fetch, or router access had to live in a component, so sharing it meant wrapping. Hence <code>connect()</code> in Redux, <code>withRouter</code>, and <code>withStyles</code>.

## 4. Verified: what a naive HOC silently loses

\`\`\`jsx
function Base({ label }) { return <span>{label}</span>; }
Base.displayName = "Base";
Base.fetchData = () => "static on Base";

const withLogging = (Wrapped) => function (props) { return <Wrapped {...props} />; };
const Naive = withLogging(Base);
\`\`\`

Actual results on React 19.2.8:

\`\`\`
original static method : function
wrapped static method  : undefined  <- lost
wrapped displayName    : ""         <- shows as Anonymous in DevTools
\`\`\`

Two real, silent regressions:

📌 **Interview term:** **static methods are not copied.** <code>Base.fetchData</code> exists; <code>Naive.fetchData</code> does not. Frameworks that relied on statics — Next.js <code>getInitialProps</code>, for instance — broke on wrapped components for exactly this reason. The fix is the <code>hoist-non-react-statics</code> package, or copying them by hand.

📌 **Interview term:** **<code>displayName</code> is lost.** The returned function is anonymous, so DevTools shows an unnamed component and your tree becomes unreadable. Always set <code>Wrapper.displayName = \\\`withLogging(\\\${Wrapped.displayName || Wrapped.name})\\\`</code>.

And two more that do not show up in a simple inspection:

- **Refs do not pass through.** A <code>ref</code> on the wrapper points at the wrapper, not the wrapped component. Historically this needed <code>forwardRef</code>; in React 19 <code>ref</code> is a normal prop, which simplifies it but you must still forward it deliberately.
- **Prop-name collisions are silent.** Two HOCs both injecting <code>data</code> means the outer one wins, with no warning.

## 5. Why Hooks replaced them

| | HOC | Custom Hook |
| :--- | :--- | :--- |
| Adds a tree node | Yes | No |
| Static methods | Lost unless hoisted | Not applicable |
| <code>displayName</code> | Lost unless set | Not applicable |
| Prop collisions | Silent | Impossible — you name the result |
| Refs | Need forwarding | Not applicable |
| TypeScript | Awkward generics | Straightforward |
| Where data comes from | Invisible at the call site | Explicit in the component body |

📌 **Interview term: wrapper hell** — <code>withRouter(connect(...)(withStyles(...)(Component)))</code>. Every layer adds a node to the tree and a place a prop could be renamed or dropped. Hooks removed the need for the nesting entirely: see <a href="PASTE_CUSTOM_HOOKS_URL_HERE" target="_blank" rel="noopener noreferrer">custom hooks</a>.

## 6. Where a HOC is still the right call

Being able to name these prevents the answer sounding like blanket dismissal:

- **Injecting props into a component you do not control** — a Hook has to be called inside the component; a HOC can wrap one from a library.
- **Cross-cutting rendering concerns** — wrapping every route in an error boundary, a suspense boundary, or analytics tracking.
- **Existing library APIs** — plenty of mature libraries still expose one.

The distinction worth stating: **Hooks share behaviour; HOCs wrap rendering.** If the shared thing is logic, use a Hook. If you genuinely need to wrap a component from the outside, a HOC still fits.

## 7. Common Pitfalls

- **Forgetting <code>displayName</code>.** Verified above: DevTools shows Anonymous and debugging gets much harder.
- **Losing static methods.** Verified above. Use <code>hoist-non-react-statics</code>.
- **Creating a HOC inside render.** <code>const Wrapped = withX(Comp)</code> in a component body produces a new component type every render, unmounting and remounting the subtree and destroying its state.
- **Not forwarding refs.** The <code>ref</code> lands on the wrapper.
- **Mutating the wrapped component.** A HOC must be pure — never assign to the component it receives.
- **Reaching for a HOC where a Hook fits.** In new code that is the wrong default.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it as a pattern:</strong> <span style="color:#f0e2c8;">"A function that takes a component and returns an enhanced one. It is a pattern, not a React API — nothing called HOC is exported."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the historical reason:</strong> <span style="color:#f0e2c8;">"Before Hooks there was no way to share stateful logic without a component, so you wrapped. That is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">connect</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">withRouter</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the silent losses — this is the depth signal:</strong> <span style="color:#f0e2c8;">"Static methods are not copied, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">displayName</code> is lost so DevTools shows Anonymous, refs do not pass through, and prop collisions are silent."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Say what replaced them:</strong> <span style="color:#f0e2c8;">"Custom Hooks. No wrapper node, no collisions, no lost statics, and vastly easier to type."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Avoid blanket dismissal:</strong> <span style="color:#f0e2c8;">"They still fit for wrapping a component you do not control, or a cross-cutting concern like putting every route in an error boundary. Hooks share behaviour; HOCs wrap rendering."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do custom Hooks beat HOCs for sharing logic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A Hook adds no component to the tree, so no statics or refs to lose. You name the returned values yourself, so collisions are impossible. And it is explicit at the call site — you can see where the data came from, instead of a prop appearing from an invisible wrapper.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What breaks if you define a HOC inside a component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It produces a brand-new component type on every render, so React sees a different element <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code>, unmounts the old subtree and mounts a fresh one — losing all its state and refiring its effects. Apply HOCs at module level, never inside render.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle static methods and refs properly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Copy statics with <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">hoist-non-react-statics</code>, and forward the ref deliberately. In React 19 <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">ref</code> is a regular prop so the spread can carry it, but you should still be explicit. Also set <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">displayName</code> so the tree stays readable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are HOCs deprecated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They cannot be — a HOC is just a function returning a component, so there is nothing to deprecate. They are simply no longer the recommended way to share logic. Plenty of stable libraries still expose them and there is no reason to rewrite working code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between a HOC and a render prop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Timing. A HOC composes at definition time — you build the enhanced component once, at module level. A <a href="PASTE_RENDER_PROPS_URL_HERE" target="_blank" rel="noopener noreferrer">render prop</a> composes at render time, inside JSX, so it can use values from the surrounding render. Both solve the same pre-Hooks problem from opposite directions.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **HOC** | A function taking a component and returning an enhanced one |
| **<code>displayName</code>** | The name DevTools shows; lost unless you set it |
| **Hoisting statics** | Copying static methods onto the wrapper |
| **Wrapper hell** | Deeply nested HOCs making the tree unreadable |
| **Prop collision** | Two HOCs injecting the same prop name, silently |
| **Custom Hook** | The modern replacement for behaviour sharing |

---
**Conclusion:** a Higher-Order Component is a function that takes a component and returns an enhanced one — the pre-Hooks answer to sharing stateful logic, and the reason <code>connect</code> and <code>withRouter</code> look the way they do. Verified here, a naive one silently drops static methods and <code>displayName</code>, and it also swallows refs and prop-name collisions. Custom Hooks replaced them for behaviour sharing because they add no tree node and nothing to lose. HOCs remain reasonable for wrapping a component you do not control or a genuinely cross-cutting rendering concern — Hooks share behaviour, HOCs wrap rendering.`,
    examples: [
      {
        label: "A careless HOC beside a correct one, showing exactly what is lost",
        runnable: true,
        code: `import { useState } from "react";

// A component with a static method and a displayName — both easy to lose.
function Panel({ title, tone }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10, marginBottom: 8 }}>
      <strong>{title}</strong> <span style={{ color: "#666", fontSize: 13 }}>tone: {tone}</span>
    </div>
  );
}
Panel.displayName = "Panel";
Panel.describe = () => "I am a static method on Panel";

// ❌ CARELESS: returns an anonymous function and copies nothing across.
function withToneNaive(Wrapped) {
  return function (props) {
    return <Wrapped {...props} tone="naive" />;
  };
}

// ✅ CORRECT: names the wrapper for DevTools and hoists the statics.
// In a real project use the hoist-non-react-statics package, which knows
// which keys React itself owns and must not be copied.
const REACT_STATICS = new Set(["displayName", "name", "propTypes", "defaultProps", "$$typeof"]);
function withToneCorrect(Wrapped) {
  function WithTone(props) {
    return <Wrapped {...props} tone="correct" />;
  }
  const inner = Wrapped.displayName || Wrapped.name || "Component";
  WithTone.displayName = "withTone(" + inner + ")";
  for (const key of Object.getOwnPropertyNames(Wrapped)) {
    if (!REACT_STATICS.has(key) && typeof Wrapped[key] === "function") {
      WithTone[key] = Wrapped[key];
    }
  }
  return WithTone;
}

// Apply HOCs at MODULE level. Doing this inside a component body would create
// a new component type every render and remount the whole subtree.
const NaivePanel = withToneNaive(Panel);
const CorrectPanel = withToneCorrect(Panel);

export default function App() {
  const [report, setReport] = useState(null);

  const inspect = () =>
    setReport({
      originalStatic: typeof Panel.describe,
      naiveStatic: typeof NaivePanel.describe,
      correctStatic: typeof CorrectPanel.describe,
      naiveName: NaivePanel.displayName || "(none — shows as Anonymous)",
      correctName: CorrectPanel.displayName,
    });

  const td = { padding: "4px 12px 4px 0", fontFamily: "ui-monospace, monospace", fontSize: 13 };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <NaivePanel title="Wrapped by the careless HOC" />
      <CorrectPanel title="Wrapped by the correct HOC" />

      <button onClick={inspect}>Inspect what survived the wrapping</button>

      {report && (
        <table style={{ marginTop: 12, borderCollapse: "collapse" }}>
          <tbody>
            <tr><td style={td}>Panel.describe</td><td style={td}>{report.originalStatic}</td></tr>
            <tr><td style={td}>NaivePanel.describe</td><td style={{ ...td, color: "#a33" }}>{report.naiveStatic}</td></tr>
            <tr><td style={td}>CorrectPanel.describe</td><td style={{ ...td, color: "#161" }}>{report.correctStatic}</td></tr>
            <tr><td style={td}>NaivePanel.displayName</td><td style={{ ...td, color: "#a33" }}>{report.naiveName}</td></tr>
            <tr><td style={td}>CorrectPanel.displayName</td><td style={{ ...td, color: "#161" }}>{report.correctName}</td></tr>
          </tbody>
        </table>
      )}
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are render props and how do they work?",
    seoDescription:
      "A function prop returning UI: the component owns the state, the caller owns the markup. Verified: an inline one defeats memo entirely.",
    description: `**Question presented to candidate:**
"What is the render props pattern, what problem did it solve, and do you still use it?"

**What a strong answer should cover:**
- A **render prop** is a prop whose value is a **function returning UI**. The component owns some state or behaviour and calls that function with it, letting the caller decide the markup.
- \`children\` as a function is the same pattern with a different prop name.
- The problem it solved: sharing **stateful logic** before Hooks existed, without the wrapper-component drawbacks of HOCs.
- Key advantage over HOCs: composition happens at **render time**, so it can use values from the surrounding render, and there are no prop-name collisions or lost statics.
- The costs: nesting ("callback hell" in JSX) when several are combined, and an **inline function is a new identity every render**, which defeats \`React.memo\` on the receiving component.
- **Custom Hooks replaced it** for pure logic sharing — no nesting, no identity problem.
- Where it survives legitimately: when the component must control *rendering*, not just supply data — virtualised lists, headless UI components, data tables, and libraries that need to own the loop.

**Clarifying questions expected:**
- "Is the shared thing logic, or does the component need to control the rendering?" — that decides Hook versus render prop.

**Code / implementation expected:** Yes — a render prop component, ideally with the Hook equivalent beside it.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes props and state.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The memoisation measurement in section 5 was produced by counting real renders on React 19.2.8.

## 1. Why This Even Matters — A Story First

A weather station measures temperature. It has no opinion about whether you want a number, a dial, or a chart — so instead of picking one, it hands the reading to whoever asked and lets *them* draw it.

That is a render prop. One component owns the hard part — the state, the subscription, the measurement — and delegates the appearance entirely to its caller.

## 2. The Core Idea

📌 **Interview term: render prop** — a prop whose value is a **function that returns UI**. The component holding the state calls that function, passing the state in, and renders whatever comes back.

\`\`\`jsx
<MouseTracker render={({ x, y }) => <p>Cursor at {x}, {y}</p>} />
\`\`\`

The component owns the mouse tracking. The caller owns the markup. Neither knows anything about the other beyond the shape of the value passed between them.

📌 **Interview term:** using <code>children</code> as the function is the same pattern with a nicer call site:

\`\`\`jsx
<MouseTracker>
  {({ x, y }) => <p>Cursor at {x}, {y}</p>}
</MouseTracker>
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 660 210" role="img" aria-label="A component owning state calls a function prop with that state and renders the result">
  <defs>
    <marker id="rp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One owns the state, the other owns the markup</text>
  <rect class="d-box-accent" x="24" y="60" width="190" height="76" rx="10"/>
  <text class="d-text d-accent" x="119" y="88" text-anchor="middle">MouseTracker</text>
  <text class="d-sub" x="119" y="110" text-anchor="middle">owns x and y</text>
  <path class="d-edge-accent" d="M 220 82 L 268 82" marker-end="url(#rp-arrow)"/>
  <text class="d-sub" x="244" y="70" text-anchor="middle">calls</text>
  <rect class="d-box" x="274" y="60" width="190" height="76" rx="10"/>
  <text class="d-text" x="369" y="88" text-anchor="middle">your function</text>
  <text class="d-sub" x="369" y="110" text-anchor="middle">receives x and y</text>
  <path class="d-edge" d="M 470 112 L 518 112" marker-end="url(#rp-arrow)"/>
  <text class="d-sub" x="494" y="100" text-anchor="middle">returns</text>
  <rect class="d-box-muted" x="524" y="60" width="112" height="76" rx="10"/>
  <text class="d-text" x="580" y="88" text-anchor="middle">UI</text>
  <text class="d-sub" x="580" y="110" text-anchor="middle">rendered</text>
</svg>

## 3. What it solved

Before Hooks, sharing stateful logic meant putting it in a component. The two ways to then reuse it were HOCs and render props, and render props had real advantages:

| | HOC | Render prop |
| :--- | :--- | :--- |
| Composes at | Definition time | **Render time** |
| Prop collisions | Silent | Impossible — you name the parameter |
| Static methods | Lost | Not applicable |
| Uses surrounding render values | No | **Yes** |
| Visible at the call site | No | Yes |

📌 **Interview term:** composing at **render time** is the substantive difference. A <a href="PASTE_HOC_URL_HERE" target="_blank" rel="noopener noreferrer">HOC</a> is applied once at module level, so it cannot see anything from the render in which it is used. A render prop is called during render and can close over any local value.

## 4. Where it still genuinely belongs

Custom Hooks replaced render props for *logic* sharing. What they cannot replace is a component that needs to **control the rendering itself**:

- **Virtualised lists** — the component decides which rows exist; you decide what a row looks like.
- **Headless UI libraries** — behaviour, accessibility, and keyboard handling supplied; markup entirely yours.
- **Data tables and charts** — the library owns the loop and the layout, you own each cell.
- **Anything needing to wrap or intercept the render** — measuring, error handling, conditional rendering around your output.

A Hook returns values. A render prop lets the component decide **when and how many times** your UI gets rendered — that is the capability a Hook does not have.

## 5. Verified: an inline render prop defeats <code>memo</code>

The cost that is easy to overlook. A memoised component receiving an inline render prop, over a mount plus two parent re-renders:

\`\`\`jsx
const MemoRP = memo(function MemoRP({ render }) { ... });
<MemoRP render={(v) => <b>{v}</b>} />
\`\`\`

\`\`\`
memo + inline render prop: 3 renders  <- new function identity each render
\`\`\`

📌 **Interview term:** the arrow function is created fresh on every parent render, so the shallow prop comparison in <a href="PASTE_MEMO_URL_HERE" target="_blank" rel="noopener noreferrer">React.memo</a> always fails. It is the same failure as an inline object prop, and it means <code>memo</code> plus a render prop needs <code>useCallback</code> to be worth anything at all.

## 6. Common Pitfalls

- **Nesting several render props.** Three or four produces a deeply indented pyramid that is genuinely hard to read. This was the main reason Hooks won.
- **Passing an inline function to a memoised component.** Verified above: memoisation silently stops working.
- **Defining a component inside the render prop.** A new component type each render, so React remounts and its state is lost.
- **Using it where a Hook fits.** If you only need values, a Hook is clearer and flatter.
- **Naming it <code>render</code> when <code>children</code> reads better.** The <code>children</code> form usually gives a nicer call site.
- **Forgetting it is just a function.** There is no special API here — it is an ordinary prop that happens to be callable.

## 7. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it in one line:</strong> <span style="color:#f0e2c8;">"A prop whose value is a function returning UI. The component owns the state and calls that function with it, so the caller controls the markup."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Note the children variant:</strong> <span style="color:#f0e2c8;">"Passing the function as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code> is the same pattern with a nicer call site."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Explain what it beat:</strong> <span style="color:#f0e2c8;">"It composes at render time rather than definition time, so no prop collisions, no lost statics, and it can use values from the surrounding render — all the things HOCs got wrong."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Say why Hooks won, but not entirely:</strong> <span style="color:#f0e2c8;">"For sharing logic, Hooks are flatter and simpler. Render props survive where the component must control the rendering — virtualised lists, headless UI, data tables."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Land the performance detail:</strong> <span style="color:#f0e2c8;">"An inline render prop is a new function identity every render, so it defeats <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> on the receiving component — I have measured three renders where one was expected."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do custom Hooks make render props obsolete?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For sharing logic, essentially yes — flatter and easier to read. But a Hook only returns values; it cannot decide when or how many times your UI renders. A virtualised list needs that control, which is why render props are alive and well in list, table, and headless UI libraries.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between a render prop and a HOC?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When composition happens. A HOC composes once at module level, so it cannot see anything local. A render prop composes during render, so it can close over surrounding values — and because you name the parameter yourself, prop collisions are impossible.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a render prop hurt performance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not inherently, but an inline arrow is a new identity every render, which defeats <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">memo</code> on the component receiving it. If that component is memoised, wrap the function in <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useCallback</code> — otherwise the wrapper is doing a comparison that can never succeed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it sometimes called "children as a function"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code> is just a prop, so you can pass a function through it like any other. The component then calls <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">children(value)</code> instead of rendering it. Identical mechanism, and the JSX reads better.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What was "callback hell" in this context?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Combining several render props means nesting them, so consuming four pieces of shared state produced four levels of indentation before any real markup appeared. Hooks flattened that — four <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">use…</code> calls on four consecutive lines.</span>
</div>

</div>

## 8. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Render prop** | A prop whose value is a function returning UI |
| **Children as a function** | The same pattern passed through <code>children</code> |
| **Render-time composition** | Combining behaviour during render, not at definition |
| **Headless component** | Behaviour and accessibility supplied, markup left to you |
| **Identity churn** | A new function each render, defeating memoisation |

---
**Conclusion:** a render prop is a function prop returning UI, letting one component own state or behaviour while the caller owns the markup. It beat HOCs by composing at render time — no prop collisions, no lost statics, and access to surrounding values — and custom Hooks then beat it for pure logic sharing by removing the nesting entirely. It remains the right tool wherever the component must control the rendering rather than merely supply data. The cost worth stating is measured: an inline render prop is a fresh function identity every render, which takes a memoised child from one render to three.`,
    examples: [
      {
        label: "The same behaviour as a render prop, as children-as-a-function, and as a Hook",
        runnable: true,
        code: `import { useState, useEffect, useCallback, memo } from "react";

// ── The shared behaviour, as a render prop component ───────────────────────
// It owns the pointer state and has no opinion about how it is displayed.
function PointerTracker({ render }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return render(pos);
}

// ── The same thing with children as the function ──────────────────────────
function PointerTracker2({ children }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return children(pos);
}

// ── The modern equivalent: a custom Hook. Flat, no nesting. ────────────────
function usePointer() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return pos;
}

function WithHook() {
  const { x, y } = usePointer();
  return <Readout label="custom Hook" x={x} y={y} />;
}

function Readout({ label, x, y }) {
  return (
    <p style={{ margin: "6px 0" }}>
      <code style={{ minWidth: 180, display: "inline-block" }}>{label}</code>
      x: <strong>{x}</strong> y: <strong>{y}</strong>
    </p>
  );
}

// A memoised consumer, to show the identity cost of an inline render prop.
let memoRenders = 0;
const MemoBox = memo(function MemoBox({ render }) {
  memoRenders++;
  return <p style={{ margin: "6px 0" }}>memoised child renders: <strong>{memoRenders}</strong>{render()}</p>;
});

export default function App() {
  const [tick, setTick] = useState(0);
  // Stable identity, so MemoBox can actually bail out. Remove the useCallback
  // and the counter climbs on every click instead of staying at 1.
  const stableRender = useCallback(() => null, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <h4 style={{ marginTop: 0 }}>Move your pointer over this panel</h4>

      {/* render prop */}
      <PointerTracker render={({ x, y }) => <Readout label="render prop" x={x} y={y} />} />

      {/* children as a function */}
      <PointerTracker2>
        {({ x, y }) => <Readout label="children as a function" x={x} y={y} />}
      </PointerTracker2>

      {/* custom Hook */}
      <WithHook />

      <hr />
      <MemoBox render={stableRender} />
      <button onClick={() => setTick((t) => t + 1)}>Re-render the parent ({tick})</button>
      <p style={{ color: "#666", fontSize: 13 }}>
        All three read the same pointer position. The Hook version is flattest —
        no nesting, no function prop, and nothing to stabilise.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are React custom hooks and when should you use them?",
    seoDescription:
      "A use-prefixed function that calls other hooks. Verified: two components using one hook get fully independent state — logic is shared, state is not.",
    description: `**Question presented to candidate:**
"What makes something a custom hook, and how do you decide when to extract one?"

**What a strong answer should cover:**
- A custom hook is just a **function whose name starts with \`use\`** and which calls other hooks. There is no registration and no special API.
- The naming convention is load-bearing: it is how the ESLint plugin knows to enforce the Rules of Hooks inside it.
- **It shares logic, never state.** Every component calling the hook gets its own completely independent state — the single most important thing to say.
- It obeys the Rules of Hooks: call it unconditionally, at the top level, from a component or another hook.
- Why extract one: reusing stateful logic, making a component readable, or making the logic testable on its own.
- What it replaced: HOCs and render props, without the wrapper component, prop collisions, or nesting.
- Composition: hooks call other hooks, so behaviour composes flatly rather than by nesting.
- Return shape: an array when order matters and the caller renames (like \`useState\`), an object when there are several named values.
- When *not* to: a one-off used in a single place, or a wrapper that just renames a built-in hook.

**Clarifying questions expected:**
- "Is this logic actually reused, or is extraction just for readability?" — both are valid, but they are different arguments.

**Code / implementation expected:** Yes — a custom hook with state and an effect, used by two components to show state independence.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes <code>useState</code> and <code>useEffect</code>.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The state-independence result in section 3 was produced by mounting two components that use the same hook and clicking one of them on React 19.2.8.

## 1. Why This Even Matters — A Story First

A recipe for bread is not a loaf of bread. Hand the recipe to two bakers and you get two loaves — separate ones. Nobody expects the second baker to end up sharing the first baker dough just because they read the same page.

That is the whole model of a custom hook, and it is also the single most common misunderstanding: people expect a shared hook to mean shared state. It does not. The recipe is shared; each kitchen is its own.

## 2. The Core Idea

📌 **Interview term: custom hook** — a JavaScript function whose name starts with <code>use</code> and which calls one or more other hooks. That is the entire definition. There is no registration step and no React API involved.

\`\`\`jsx
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((v) => !v), []);
  return [on, toggle];
}
\`\`\`

📌 **Interview term:** the <code>use</code> prefix is a **convention that tooling depends on**. The <code>eslint-plugin-react-hooks</code> rules use it to decide where to enforce the Rules of Hooks. Name it <code>getToggle</code> and the linter stops checking it, so a conditional hook call inside will not be caught.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="One custom hook used by two components gives each its own separate state">
  <defs>
    <marker id="ch-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">One recipe, two separate kitchens</text>
  <rect class="d-box-accent" x="240" y="46" width="180" height="56" rx="10"/>
  <text class="d-text d-accent" x="330" y="70" text-anchor="middle">useCounter</text>
  <text class="d-sub" x="330" y="90" text-anchor="middle">the shared logic</text>
  <path class="d-edge-accent" d="M 282 106 L 175 152" marker-end="url(#ch-arrow)"/>
  <path class="d-edge-accent" d="M 378 106 L 485 152" marker-end="url(#ch-arrow)"/>
  <rect class="d-box" x="50" y="156" width="220" height="56" rx="10"/>
  <text class="d-text" x="160" y="180" text-anchor="middle">Component A</text>
  <text class="d-sub" x="160" y="200" text-anchor="middle">its own count</text>
  <rect class="d-box" x="390" y="156" width="220" height="56" rx="10"/>
  <text class="d-text" x="500" y="180" text-anchor="middle">Component B</text>
  <text class="d-sub" x="500" y="200" text-anchor="middle">a different count</text>
</svg>

## 3. Verified: logic is shared, state is not

Two components, both calling the same <code>useCounter</code> hook. Component A was clicked twice:

\`\`\`
after clicking A twice -> A:2 / B:0
\`\`\`

B did not move. Each call to the hook creates a **fresh, independent** set of state, because the hooks inside it are called during *that component* render and belong to *that component* fiber.

📌 **Interview term:** a custom hook shares **behaviour**, not **state**. If two components genuinely need the same value, that is a different problem — lift the state up, or put it in a <a href="PASTE_CONTEXT_URL_HERE" target="_blank" rel="noopener noreferrer">Context</a> or a store. Getting this wrong is the classic custom-hook bug: a <code>useUser</code> hook that fetches independently in six components, firing six requests.

## 4. Why to extract one

| Reason | What it buys |
| :--- | :--- |
| **Reuse** | The same stateful logic in several components |
| **Readability** | A component body that reads as *what* it does, not *how* |
| **Testability** | Logic testable on its own, without the markup |
| **Naming** | <code>useDebounce</code> says more than an effect and a timer |

📌 **Interview term:** hooks **compose**. A custom hook can call other custom hooks, so behaviour builds up flatly — no nesting, unlike <a href="PASTE_RENDER_PROPS_URL_HERE" target="_blank" rel="noopener noreferrer">render props</a>, and no wrapper components, unlike <a href="PASTE_HOC_URL_HERE" target="_blank" rel="noopener noreferrer">HOCs</a>. Consuming four pieces of shared behaviour is four consecutive lines rather than four levels of indentation.

## 5. The rules still apply inside

A custom hook is subject to the same Rules of Hooks as any component:

- Call it **unconditionally**, at the **top level** — not in a condition, loop, or nested function.
- Call it only from a **component** or **another hook**.
- Hook call order must be identical on every render, because order is how React identifies the state.

📌 **Interview term:** because a custom hook may itself call hooks conditionally by mistake, the <code>use</code> prefix matters for enforcement, not just readability. It is the signal the linter keys off.

## 6. Return-shape convention

- **Array** when the caller will rename the values and order is obvious — <code>const [on, toggle] = useToggle()</code>, mirroring <code>useState</code>.
- **Object** when there are several values and names carry meaning — <code>const { data, error, isLoading } = useQuery()</code>.

Two or three related values suit an array. More than that, name them.

## 7. Common Pitfalls

- **Expecting shared state.** Verified above: A moved to 2, B stayed at 0. Each caller gets its own.
- **Dropping the <code>use</code> prefix.** The linter stops enforcing the Rules of Hooks inside it.
- **Calling it conditionally.** <code>if (x) useThing()</code> shifts hook order and corrupts state.
- **Extracting too early.** A hook used in exactly one place, wrapping three lines, is indirection without benefit.
- **A hook that only renames a built-in.** <code>useMyState</code> that just calls <code>useState</code> adds a layer for nothing.
- **Fetching inside a widely-used hook without caching.** Six components calling <code>useUser</code> means six requests. That is what TanStack Query and SWR exist for.
- **Returning unstable references.** A hook returning a fresh object or function every render defeats <a href="PASTE_MEMO_URL_HERE" target="_blank" rel="noopener noreferrer">memo</a> in every consumer. Wrap in <code>useCallback</code> or <code>useMemo</code>.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define it plainly:</strong> <span style="color:#f0e2c8;">"A function whose name starts with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">use</code> that calls other hooks. There is no special API — it is a convention plus the Rules of Hooks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Lead with the thing people get wrong:</strong> <span style="color:#f0e2c8;">"It shares logic, never state. Two components calling the same hook get completely independent state — I have measured one going to 2 while the other stayed at 0."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Say why the prefix matters:</strong> <span style="color:#f0e2c8;">"The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">use</code> name is what the ESLint plugin keys off to enforce the Rules of Hooks. Rename it and you lose that checking."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Position it historically:</strong> <span style="color:#f0e2c8;">"It replaced HOCs and render props for sharing behaviour — no wrapper component, no prop collisions, and hooks compose flatly instead of nesting."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Show judgement on when not to:</strong> <span style="color:#f0e2c8;">"I would not extract one used in a single place, or one that just renames a built-in. And if several components need the <em style="color:#ffe0b2;">same</em> value, that is Context or a store, not a hook."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If two components use the same custom hook, do they share state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — completely independent. The hooks inside run during each component own render and attach to that component fiber. To genuinely share a value you need lifted state, Context, or an external store. This is the number one misconception about custom hooks.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What actually makes a function a hook?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only the convention. React does not know or care that your function exists — it sees the built-in hooks being called during a render. The <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">use</code> prefix exists for humans and for the linter, which is exactly why breaking the convention is a real problem rather than a stylistic one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you <em style="color:#ffe0b2;">not</em> extract a custom hook?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When it is used once and short enough to read inline, or when it just wraps a built-in without adding meaning. Extraction has a real cost — another file, another name, another indirection — and it should buy reuse, genuine readability, or testability.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a custom hook call another custom hook?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, and that composability is the main advantage over the patterns it replaced. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useSearch</code> can call <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useDebounce</code> and <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useFetch</code>, and it stays flat. The same thing with render props would be three levels of nesting.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Array or object for the return value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Array for two or three values the caller will rename, mirroring <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useState</code>. Object once there are several and the names matter, since destructuring by name is self-documenting and order stops being meaningful.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Custom hook** | A <code>use</code>-prefixed function that calls other hooks |
| **Rules of Hooks** | Call unconditionally, top level, from a component or hook |
| **Hook composition** | Hooks calling other hooks, flatly |
| **State independence** | Each caller getting its own separate state |
| **Shared state** | A different problem — Context, lifted state, or a store |

---
**Conclusion:** a custom hook is nothing more than a <code>use</code>-prefixed function that calls other hooks, and the prefix matters because tooling enforces the Rules of Hooks based on it. The point to lead with is that it shares **logic, not state** — verified here as one component reaching 2 while another using the identical hook stayed at 0. That is what makes hooks composable and flat where HOCs and render props were nested, and it is also the trap: when several components need the same *value*, the answer is Context or a store, not a shared hook.`,
    examples: [
      {
        label: "One hook, two components, two entirely separate states",
        runnable: true,
        code: `import { useState, useEffect, useCallback } from "react";

// A custom hook: a use-prefixed function calling other hooks. Nothing more.
function useCounter(start = 0, label = "") {
  const [count, setCount] = useState(start);

  // Stable identities so consumers can safely memoise.
  const inc = useCallback(() => setCount((c) => c + 1), []);
  const reset = useCallback(() => setCount(start), [start]);

  useEffect(() => {
    if (count > 0) console.log(label + " is now " + count);
  }, [count, label]);

  return { count, inc, reset };
}

// Hooks COMPOSE: a custom hook may call other custom hooks, and it stays flat.
function useDoubledCounter(start, label) {
  const counter = useCounter(start, label);
  return { ...counter, doubled: counter.count * 2 };
}

function Panel({ title, hook }) {
  const { count, doubled, inc, reset } = hook;
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, flex: 1 }}>
      <h4 style={{ margin: "0 0 8px" }}>{title}</h4>
      <p style={{ margin: "0 0 8px" }}>
        count: <strong>{count}</strong>
        {doubled !== undefined && <> · doubled: <strong>{doubled}</strong></>}
      </p>
      <button onClick={inc}>+1</button> <button onClick={reset}>reset</button>
    </div>
  );
}

function CounterA() {
  // Each call to the hook creates its OWN state. A and B never interact.
  return <Panel title="Component A" hook={useCounter(0, "A")} />;
}

function CounterB() {
  return <Panel title="Component B" hook={useCounter(0, "B")} />;
}

function CounterC() {
  return <Panel title="Component C (composed hook)" hook={useDoubledCounter(10, "C")} />;
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <CounterA />
        <CounterB />
      </div>
      <CounterC />
      <p style={{ color: "#666", fontSize: 13 }}>
        Click +1 on A repeatedly. B does not move, and neither does C. The hook
        shares the logic; each component gets its own independent state. If you
        wanted them to share a value, that would be lifted state or Context.
      </p>
    </div>
  );
}`,
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the purpose of the `deps` array in `useEffect` and `useCallback`?",
    seoDescription:
      "It declares which reactive values a hook depends on, compared by Object.is. Verified: an object literal in deps re-ran the effect on all 3 renders.",
    description: `**Question presented to candidate:**
"What is the dependency array actually for, and why do people get it wrong so often?"

**What a strong answer should cover:**
- It declares which **reactive values** the hook depends on. React compares them with **\`Object.is\`** and only re-runs (or re-creates) when one changed.
- Three cases: omitted (runs every render), \`[]\` (once on mount), \`[a, b]\` (when \`a\` or \`b\` change).
- **The comparison is by identity, not by value.** Two structurally identical objects are different dependencies.
- That is why an inline object, array, or function in deps re-runs the hook on every render — the classic infinite-loop bug when the effect also sets state.
- The fix hierarchy: depend on **primitives** where possible; otherwise stabilise with \`useMemo\`/\`useCallback\`; or move the value inside the effect.
- **Do not lie to the linter.** An omitted dependency means the hook closes over a stale value — the cause of most stale-closure bugs.
- \`useCallback\` and \`useMemo\` use the same array for the same reason: to decide whether to return the cached value or make a new one.
- \`useEffectEvent\` as the modern answer for logic that should read the latest value without being reactive.

**Clarifying questions expected:**
- "Is the dependency a primitive or an object?" — it changes the whole answer.
- "Is the effect setting state that feeds back into its own dependencies?"

**Code / implementation expected:** Yes — the object-literal-in-deps bug and its fix.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes <code>useEffect</code> basics.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every count in sections 3 and 5 was measured by rendering the components three times on React 19.2.8 and recording how often each hook actually ran.

## 1. Why This Even Matters — A Story First

A courier is told: "redeliver whenever the address changes." Sensible. But they compare addresses by looking at the *piece of paper*, not the words on it. You hand them a freshly written copy of the same address every morning, and every morning they conclude the address changed and redeliver.

Nothing is wrong with the rule. The comparison is doing exactly what it was told. The problem is that you keep handing over a new piece of paper.

## 2. The Core Idea

📌 **Interview term: dependency array** — the list of **reactive values** a hook depends on. Before re-running an effect, or re-creating a memoised value, React compares each entry with the previous render entry using <code>Object.is</code>. If all are equal, it skips the work.

📌 **Interview term: reactive value** — anything that can differ between renders: props, state, context, and any value computed from them. Values defined outside the component are not reactive and do not belong in the array.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="React compares each dependency with Object.is and either skips or re-runs the hook">
  <defs>
    <marker id="dp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="24" text-anchor="middle">Every render, one comparison per dependency</text>
  <rect class="d-box-muted" x="20" y="72" width="160" height="56" rx="10"/>
  <text class="d-text" x="100" y="95" text-anchor="middle">component renders</text>
  <text class="d-sub" x="100" y="115" text-anchor="middle">deps evaluated</text>
  <path class="d-edge" d="M 186 100 L 220 100" marker-end="url(#dp-arrow)"/>
  <rect class="d-box-accent" x="226" y="72" width="176" height="56" rx="10"/>
  <text class="d-text d-accent" x="314" y="95" text-anchor="middle">Object.is per entry</text>
  <text class="d-sub" x="314" y="115" text-anchor="middle">identity, not value</text>
  <path class="d-edge-accent" d="M 408 88 L 462 62" marker-end="url(#dp-arrow)"/>
  <path class="d-edge" d="M 408 114 L 462 142" marker-end="url(#dp-arrow)"/>
  <rect class="d-box-accent" x="468" y="36" width="172" height="52" rx="10"/>
  <text class="d-text d-accent" x="554" y="58" text-anchor="middle">all equal</text>
  <text class="d-sub" x="554" y="77" text-anchor="middle">skip the work</text>
  <rect class="d-box-muted" x="468" y="118" width="172" height="52" rx="10"/>
  <text class="d-text" x="554" y="140" text-anchor="middle">any differs</text>
  <text class="d-sub" x="554" y="159" text-anchor="middle">cleanup, then re-run</text>
</svg>

## 3. Verified: identity, not value

Two effects in the same component, over three renders. One depends on a memoised object; the other on an object literal with identical contents:

\`\`\`jsx
const stable = useMemo(() => ({ q: "x" }), []);
const unstable = { q: "x" };            // new object every render

useEffect(() => { stableRuns++; }, [stable]);
useEffect(() => { unstableRuns++; }, [unstable]);
\`\`\`

Actual counts:

\`\`\`
deps [memoised object] -> effect ran 1 time(s)
deps [object literal]  -> effect ran 3 time(s)  <- deep-equal but not ===
\`\`\`

Identical contents, completely different behaviour. 📌 **Interview term:** React never deep-compares dependencies — that would be expensive and, for functions, impossible. It compares references with <code>Object.is</code>. Every "my effect runs forever" bug traces back to this line.

The infinite loop follows immediately: if that effect also calls <code>setState</code>, the state change triggers a render, the render creates another new object, the effect runs again, forever.

## 4. The three forms

| Deps | When the hook runs |
| :--- | :--- |
| omitted | After **every** render |
| <code>[]</code> | Once on mount; cleanup on unmount |
| <code>[a, b]</code> | On mount, then whenever <code>a</code> or <code>b</code> change identity |

## 5. Verified: the same array in <code>useCallback</code>

<code>useCallback</code> and <code>useMemo</code> use the array for the mirror-image purpose — deciding whether to hand back the cached value or make a new one. Over three renders:

\`\`\`
useCallback([]) distinct identities: 1
plain arrow     distinct identities: 3
\`\`\`

One function object across three renders versus three separate ones. That single identity is what lets a <a href="PASTE_MEMO_URL_HERE" target="_blank" rel="noopener noreferrer">memoised</a> child bail out, and what keeps an effect depending on that callback from re-running.

📌 **Interview term:** <code>useCallback(fn, deps)</code> is exactly <code>useMemo(() =&gt; fn, deps)</code>. Same mechanism, different ergonomics — one caches a function, the other caches the result of calling one.

## 6. Fixing a dependency you cannot stabilise

In priority order:

1. **Depend on primitives.** <code>[user.id]</code> instead of <code>[user]</code> — a string compares by value, so the problem disappears.
2. **Move the value inside.** If it is only used by the effect, define it in the effect body and it stops being a dependency.
3. **Stabilise it.** <code>useMemo</code> for objects, <code>useCallback</code> for functions — verified above as the difference between one run and three.
4. **Use a functional update.** <code>setCount(c =&gt; c + 1)</code> removes <code>count</code> from the array entirely.
5. **Reach for <code>useEffectEvent</code>.** For logic that should read the *latest* value without making the effect re-run — confirmed available as a stable export on React 19.2.8.

📌 **Interview term:** never silence the lint rule with a disable comment. An omitted dependency does not stop the value being used; it makes the hook close over a **stale** copy from an earlier render. The bug moves from "runs too often" to "silently wrong", which is worse.

## 7. Common Pitfalls

- **An object or array literal in deps.** Verified: three runs instead of one, and an infinite loop if the effect sets state.
- **A function defined in the component body as a dependency.** New identity every render; wrap it in <code>useCallback</code> or move it inside.
- **Disabling the lint rule to "fix" a loop.** It converts a visible bug into a stale-closure bug.
- **Depending on a whole object when a field would do.** <code>[user]</code> re-runs when any field changes; <code>[user.id]</code> re-runs when the identity you care about does.
- **Assuming <code>[]</code> means "run once, always".** In <a href="PASTE_STRICTMODE_URL_HERE" target="_blank" rel="noopener noreferrer">StrictMode</a> it runs, cleans up, and runs again in development — which is a test, not a bug.
- **Forgetting values used inside a nested callback.** They are dependencies too if they are reactive.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State the purpose exactly:</strong> <span style="color:#f0e2c8;">"It declares which reactive values the hook depends on. React compares them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is</code> and only re-runs when one actually changed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Emphasise identity over value:</strong> <span style="color:#f0e2c8;">"It is a reference comparison, never a deep one. Two objects with identical contents are different dependencies — I have measured that as three effect runs instead of one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Connect it to the classic bug:</strong> <span style="color:#f0e2c8;">"That is the infinite loop — a fresh object in deps, an effect that sets state, and it re-triggers itself forever."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the fix hierarchy:</strong> <span style="color:#f0e2c8;">"Depend on a primitive like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user.id</code> first; move the value inside the effect if only it uses it; stabilise with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useCallback</code> last."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Be firm about the lint rule:</strong> <span style="color:#f0e2c8;">"I would never disable it to stop a loop — omitting a dependency does not stop the value being used, it just makes the closure stale. That trades a loud bug for a silent one."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does my effect run on every render even though the dependency looks the same?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it is an object, array, or function created during render, so it is a new reference each time. The comparison is <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is</code>, not a deep equality check. Depend on a primitive field instead, or memoise the value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it ever right to disable the exhaustive-deps rule?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Very rarely, and it should come with a comment explaining why. The usual reason people reach for it — wanting an effect to run only on mount while still reading a changing value — is exactly what <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useEffectEvent</code> exists for. Disabling it leaves a stale closure that fails silently later.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between an empty array and no array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An empty array means there is nothing to compare, so the effect runs once on mount and cleans up on unmount. No array at all means React cannot skip anything, so it runs after every single render — occasionally what you want, usually a mistake.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you remove a state value from the dependency array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the functional updater. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">setCount(c =&gt; c + 1)</code> reads the latest value from React rather than from the closure, so <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> is no longer a dependency and the effect stops re-subscribing on every change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useCallback</code> use the array the same way?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — same comparison, mirror-image purpose. An effect uses it to decide whether to re-run; <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useCallback</code> uses it to decide whether to return the cached function or a new one. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useCallback(fn, deps)</code> is literally <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">useMemo(() =&gt; fn, deps)</code>.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Dependency array** | The reactive values a hook depends on |
| **Reactive value** | Props, state, context, or anything derived from them |
| **<code>Object.is</code>** | The identity comparison React uses per entry |
| **Referential stability** | Being the same object across renders |
| **Stale closure** | A hook holding a value from an earlier render |
| **<code>useEffectEvent</code>** | Reads the latest value without being a dependency |

---
**Conclusion:** the dependency array tells React which reactive values a hook depends on, and React compares them by identity with <code>Object.is</code> rather than by value. That single fact explains nearly every dependency bug: verified here, an object literal in deps re-ran its effect on all three renders while a memoised object ran once, and <code>useCallback([])</code> held one function identity where a plain arrow produced three. Fix it by depending on primitives, moving values into the effect, or stabilising with <code>useMemo</code> and <code>useCallback</code> — never by silencing the lint rule, which converts a loud loop into a silent stale closure.`,
    examples: [
      {
        label: "The object-in-deps loop, and three ways to fix it",
        runnable: true,
        code: `import { useState, useEffect, useMemo, useCallback, useRef } from "react";

// Counters live outside so a re-render cannot reset them.
const runs = { broken: 0, memoised: 0, primitive: 0, inside: 0 };

function Demo({ userId, tick }) {
  const renders = useRef(0);
  renders.current++;

  // ❌ BROKEN: a new object every render, so Object.is always fails.
  // If this effect called setState it would loop forever.
  const brokenQuery = { userId, limit: 10 };
  useEffect(() => { runs.broken++; }, [brokenQuery]);

  // ✅ FIX 1: stabilise the object with useMemo.
  const memoisedQuery = useMemo(() => ({ userId, limit: 10 }), [userId]);
  useEffect(() => { runs.memoised++; }, [memoisedQuery]);

  // ✅ FIX 2 (best): depend on the primitive. Strings and numbers compare
  // by value, so the whole class of problem disappears.
  useEffect(() => { runs.primitive++; }, [userId]);

  // ✅ FIX 3: build the object INSIDE the effect, so it is not a dependency.
  useEffect(() => {
    const query = { userId, limit: 10 };
    runs.inside++;
    void query;
  }, [userId]);

  const row = { padding: "3px 12px 3px 0", fontFamily: "ui-monospace, monospace", fontSize: 13 };

  return (
    <table style={{ borderCollapse: "collapse" }}>
      <tbody>
        <tr><td style={row}>component renders</td><td style={row}><strong>{renders.current}</strong></td></tr>
        <tr><td style={{ ...row, color: "#a33" }}>deps [object literal]</td><td style={{ ...row, color: "#a33" }}>{runs.broken}</td></tr>
        <tr><td style={{ ...row, color: "#161" }}>deps [useMemo object]</td><td style={{ ...row, color: "#161" }}>{runs.memoised}</td></tr>
        <tr><td style={{ ...row, color: "#161" }}>deps [userId] primitive</td><td style={{ ...row, color: "#161" }}>{runs.primitive}</td></tr>
        <tr><td style={{ ...row, color: "#161" }}>object built inside</td><td style={{ ...row, color: "#161" }}>{runs.inside}</td></tr>
      </tbody>
    </table>
  );
}

export default function App() {
  const [tick, setTick] = useState(0);
  const [userId, setUserId] = useState(1);
  const [count, setCount] = useState(0);

  // The functional updater reads the latest value from React, so count does
  // not need to be in the deps array of anything that increments it.
  const incTwice = useCallback(() => {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <Demo userId={userId} tick={tick} />
      <p style={{ marginTop: 12 }}>
        <button onClick={() => setTick((t) => t + 1)}>Re-render ({tick})</button>{" "}
        <button onClick={() => setUserId((u) => (u === 1 ? 2 : 1))}>Change userId (now {userId})</button>{" "}
        <button onClick={incTwice}>+2 via functional updater ({count})</button>
      </p>
      <p style={{ color: "#666", fontSize: 13 }}>
        Press Re-render repeatedly: only the first effect climbs, because its
        dependency is a brand-new object each time. The other three stay put
        until userId actually changes.
      </p>
    </div>
  );
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you manage component-level state without `useState` or `useReducer`?",
    seoDescription:
      "Class this.setState still works in React 19; useRef holds values that must not re-render; useSyncExternalStore reads state owned outside React.",
    description: `**Question presented to candidate:**
"Suppose you cannot use \`useState\` or \`useReducer\`. What other ways are there to hold state that belongs to a component?"

**What a strong answer should cover:**
- The historical answer: **class components** with \`this.state\` and \`this.setState\`. Still fully supported in React 19 — verified working.
- \`this.setState\` **merges** partial state, unlike the hook setters which replace; and it takes an optional callback that runs after the commit.
- **\`useRef\`** for values that must persist across renders but must **not** trigger one — timer ids, previous values, DOM nodes, instance-like flags.
- The key distinction: **state drives rendering; a ref does not**. If the UI must react to the value, it is state.
- **\`useSyncExternalStore\`** for reading state that lives outside React entirely.
- \`useState\` and \`useReducer\` are two faces of one primitive, so "without either" really means "outside the hooks state model".
- Anti-patterns: a module-level variable (shared by every instance and invisible to React), or mutating a ref and expecting a re-render.
- Practical framing: this question is usually probing whether you understand *when a value should cause a render*, not whether you can recite class syntax.

**Clarifying questions expected:**
- "Does the UI need to update when this value changes?" — that single question decides state versus ref.
- "Is this a legacy codebase, or are we designing something new?"

**Code / implementation expected:** Yes — a class component with \`setState\` beside a \`useRef\` example showing why the ref does not re-render.`,
    answer: `**Target Audience:** Engineers preparing for React interviews — assumes hooks basics.
**Difficulty:** Easy to Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The class-component behaviour in section 3 was verified by rendering and clicking one on React 19.2.8 — worth checking rather than assuming, given how much has been removed from React 19.

## 1. Why This Even Matters — A Story First

A kitchen has a whiteboard and a notepad in a drawer. The whiteboard faces the room: change it and everyone looks up and reacts. The notepad holds things that matter — the oven timer, where you left off — but nobody is watching it, so writing in it changes nothing until someone happens to look.

Both hold information. Only one causes a reaction. Almost the entire answer to this question is knowing which of the two you need.

## 2. The Core Idea

First, the framing worth stating: <code>useState</code> and <code>useReducer</code> are the same underlying primitive with different ergonomics. Ruling out both is really asking what exists **outside the hook state model**.

There are three genuine answers, and one common wrong one.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Three alternatives to useState, differing in whether they trigger a re-render">
  <text class="d-text" x="330" y="24" text-anchor="middle">Does changing it re-render the component?</text>
  <rect class="d-box-accent" x="20" y="52" width="196" height="76" rx="10"/>
  <text class="d-text d-accent" x="118" y="78" text-anchor="middle">class this.setState</text>
  <text class="d-sub" x="118" y="100" text-anchor="middle">yes — re-renders</text>
  <text class="d-sub" x="118" y="119" text-anchor="middle">merges partial state</text>
  <rect class="d-box-muted" x="232" y="52" width="196" height="76" rx="10"/>
  <text class="d-text" x="330" y="78" text-anchor="middle">useRef</text>
  <text class="d-sub" x="330" y="100" text-anchor="middle">no — never re-renders</text>
  <text class="d-sub" x="330" y="119" text-anchor="middle">survives renders</text>
  <rect class="d-box-accent" x="444" y="52" width="196" height="76" rx="10"/>
  <text class="d-text d-accent" x="542" y="78" text-anchor="middle">useSyncExternalStore</text>
  <text class="d-sub" x="542" y="100" text-anchor="middle">yes — re-renders</text>
  <text class="d-sub" x="542" y="119" text-anchor="middle">state lives outside React</text>
  <rect class="d-box" x="232" y="150" width="196" height="56" rx="10"/>
  <text class="d-text" x="330" y="173" text-anchor="middle">module variable</text>
  <text class="d-sub" x="330" y="193" text-anchor="middle">shared and invisible</text>
</svg>

The bottom box is the wrong answer, and knowing *why* it is wrong is part of a good response.

## 3. Verified: class components still work in React 19

Given how much React 19 removed — <code>propTypes</code>, <code>defaultProps</code> on functions, <code>ReactDOM.render</code> — it is worth confirming rather than assuming:

\`\`\`jsx
class Legacy extends Component {
  state = { n: 0 };
  render() {
    return <button onClick={() => this.setState((s) => ({ n: s.n + 1 }))}>c:{this.state.n}</button>;
  }
}
\`\`\`

\`\`\`
class component after one click: c:1
\`\`\`

Fully functional. 📌 **Interview term:** class components are **not deprecated**, merely no longer recommended. They remain the only way to write an <a href="PASTE_ERROR_BOUNDARY_URL_HERE" target="_blank" rel="noopener noreferrer">Error Boundary</a>, since <code>getDerivedStateFromError</code> has no Hook equivalent.

### Two behaviours that differ from the hooks

- **<code>this.setState</code> merges.** <code>this.setState({ a: 1 })</code> leaves <code>b</code> untouched. The <code>useState</code> setter **replaces**, which is why you spread manually with objects.
- **It takes a completion callback.** <code>this.setState(patch, () =&gt; ...)</code> runs after the commit. There is no hook equivalent; you use an effect instead.

## 4. <code>useRef</code>: state that deliberately does not render

📌 **Interview term:** <code>useRef</code> returns a **mutable box** that persists for the component lifetime. Writing to <code>.current</code> **never triggers a re-render** — that is the feature, not a limitation.

\`\`\`jsx
const timerId = useRef(null);
const renderCount = useRef(0);
renderCount.current++;   // no re-render, ever
\`\`\`

| Use it for | Because |
| :--- | :--- |
| Timer and interval ids | The UI does not display them |
| The previous value of a prop | Needed for comparison, not display |
| A DOM node | Imperative access only |
| An "already initialised" flag | Instance state, not UI state |
| Anything mutated during an event | It should not cause a render |

📌 **Interview term:** the deciding question is **does the UI need to update when this changes?** Yes means state. No means a ref. Reaching for a ref because a re-render feels wasteful is a common mistake — the UI then silently shows a stale value.

## 5. <code>useSyncExternalStore</code>: state that lives outside React

When the value is owned by something else — a browser API, a store, a websocket cache — this is the correct way to read it. It subscribes, reads a snapshot, and keeps the render consistent. See <a href="PASTE_TEARING_URL_HERE" target="_blank" rel="noopener noreferrer">tearing in concurrent React</a> for why it exists and what it prevents.

## 6. The wrong answer, and why it is instructive

A module-level variable:

\`\`\`jsx
let count = 0;                                 // NOT component state
function Counter() {
  return <button onClick={() => count++}>{count}</button>;
}
\`\`\`

Two things are broken. It is **shared by every instance** of the component, so it is not component-level state at all. And React has no idea it changed, so the UI never updates — verified in the <a href="PASTE_TEARING_URL_HERE" target="_blank" rel="noopener noreferrer">tearing</a> doc, where a mutated module variable left the DOM showing the old value until an unrelated render happened to occur.

## 7. Common Pitfalls

- **Mutating a ref and expecting a re-render.** It will not happen. The displayed value silently goes stale.
- **Using a module variable for per-component state.** Shared across instances and invisible to React.
- **Assuming <code>this.setState</code> replaces.** It merges — the opposite of the hook setter.
- **Expecting a callback argument on the <code>useState</code> setter.** There is none; use an effect.
- **Reading <code>ref.current</code> during render to decide output.** It is not a reactive value, so the render can disagree with reality. Refs belong in effects and handlers.
- **Writing a new class component today** for anything other than an Error Boundary.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Give the historical answer first:</strong> <span style="color:#f0e2c8;">"Class components with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this.state</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this.setState</code> — still fully supported in React 19, and still the only way to write an Error Boundary."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Note the two real differences:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setState</code> merges partial state where the hook setter replaces, and it takes a post-commit callback the hooks do not have."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Bring up <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">useRef</code>:</strong> <span style="color:#f0e2c8;">"For values that persist across renders but must not cause one — timer ids, previous values, DOM nodes. Not rendering is the point of it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the deciding rule:</strong> <span style="color:#f0e2c8;">"Does the UI need to update when this value changes? Yes is state, no is a ref. That one question is what this whole question is really testing."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the wrong answer deliberately:</strong> <span style="color:#f0e2c8;">"A module-level variable is not component state — it is shared by every instance, and React never learns it changed, so the UI silently goes stale."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose a ref over state?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When nothing on screen depends on the value — an interval id I need in order to clear it, the previous value of a prop for a comparison, or a flag saying setup already ran. If the value ever appears in the rendered output, it must be state, or the display will silently fall behind.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are class components deprecated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — supported and working in React 19, with no removal announced. They are simply not recommended for new code. Error Boundaries are the one genuine exception, since <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">getDerivedStateFromError</code> has no Hook equivalent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">this.setState</code> and the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useState</code> setter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Merging. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">this.setState({ a: 1 })</code> leaves the other keys alone; the hook setter replaces the whole value, so you spread manually. <code style="background:#2a2a2a;color:#ffca28;padding:1px 5px;border-radius:3px;">setState</code> also accepts a callback that runs after the commit, which the hooks replaced with effects.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use a variable outside the component?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two failures. It is shared by every instance of the component, so it is not component-level state. And React never learns it changed, so nothing re-renders — the screen keeps showing the old value until some unrelated update happens to come along.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useReducer</code> genuinely different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">useState</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in capability — they are the same primitive with different ergonomics, which is why ruling out both really means stepping outside the hooks state model entirely. See <a href="PASTE_USESTATE_VS_USEREDUCER_URL_HERE" target="_blank" rel="noopener noreferrer">useState versus useReducer</a> for when the extra structure earns its place.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **<code>this.setState</code>** | Class state update; merges partial state |
| **<code>useRef</code>** | A persistent mutable box that never triggers a render |
| **<code>useSyncExternalStore</code>** | Reads state owned outside React, consistently |
| **Instance state** | A value belonging to one mounted component |
| **Module variable** | Shared by all instances; invisible to React |

---
**Conclusion:** the honest answers are class components with <code>this.setState</code> — verified still working in React 19, and still the only route to an Error Boundary — <code>useRef</code> for values that must persist without ever triggering a render, and <code>useSyncExternalStore</code> for state that lives outside React. The question is really testing one judgement: does the UI need to react when this value changes? If yes it is state; if no it is a ref. And a module-level variable is neither, because it is shared across instances and React never learns it changed.`,
    examples: [
      {
        label: "Class setState, a ref that does not render, and the module-variable trap",
        runnable: true,
        code: `import { Component, useState, useRef } from "react";

// ── 1. The classic answer: a class component ──────────────────────────────
class ClassCounter extends Component {
  state = { count: 0, label: "class state" };

  bump = () => {
    // Note: setState MERGES. label survives without being mentioned.
    this.setState(
      (s) => ({ count: s.count + 1 }),
      // A post-commit callback — no hook equivalent; use an effect instead.
      () => console.log("committed, count is now", this.state.count),
    );
  };

  render() {
    return (
      <Row title="class this.setState">
        {this.state.label}: <strong>{this.state.count}</strong>{" "}
        <button onClick={this.bump}>+1</button>
      </Row>
    );
  }
}

// ── 2. useRef: persists, but deliberately never re-renders ────────────────
function RefCounter() {
  const clicks = useRef(0);
  const renders = useRef(0);
  const [, forceRender] = useState(0);
  renders.current++;

  return (
    <Row title="useRef">
      ref value: <strong>{clicks.current}</strong> · renders:{" "}
      <strong>{renders.current}</strong>{" "}
      <button onClick={() => { clicks.current++; }}>
        mutate ref (no re-render)
      </button>{" "}
      <button onClick={() => forceRender((n) => n + 1)}>force a render</button>
    </Row>
  );
}

// ── 3. The trap: a module-level variable ──────────────────────────────────
// Shared by EVERY instance, and React has no idea it changed.
let shared = 0;
function ModuleVarCounter({ name }) {
  const [, forceRender] = useState(0);
  return (
    <Row title={"module variable (" + name + ")"}>
      value: <strong>{shared}</strong>{" "}
      <button onClick={() => { shared++; }}>mutate (UI will not update)</button>{" "}
      <button onClick={() => forceRender((n) => n + 1)}>force a render</button>
    </Row>
  );
}

function Row({ title, children }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <ClassCounter />
      <RefCounter />
      <ModuleVarCounter name="instance one" />
      <ModuleVarCounter name="instance two" />
      <p style={{ color: "#666", fontSize: 13 }}>
        Mutate the ref a few times, then force a render — the number jumps to
        where it already was. Do the same on either module-variable row and
        both rows jump together, because they share one value.
      </p>
    </div>
  );
}`,
      },
    ],
  },
];

export default augments;
