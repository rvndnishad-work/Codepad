/**
 * Phase 2 — Batch "Operators & syntax": rewrite 9 operator/syntax stubs to
 * interview depth (TL;DR + SVG + table + tip + runnable example). Patch-in-place.
 *
 *   npx tsx scripts/js-rewrites-phase2-operators.ts
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
    title: "What are optional chaining and nullish coalescing?",
    answer: `**Core concept (TL;DR).** <code>?.</code> (optional chaining) safely reads a deep property: if any link is <code>null</code> or <code>undefined</code> it short-circuits and returns <code>undefined</code> instead of throwing. <code>??</code> (nullish coalescing) supplies a fallback **only** when the left side is <code>null</code>/<code>undefined</code> — unlike <code>||</code>, which also fires on <code>0</code>, <code>""</code>, and <code>false</code>.

${card(`<svg viewBox="0 0 520 184" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">?. bails to undefined · ?? only catches null/undefined</text>
  <rect x="20" y="42" width="230" height="122" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="135" y="62" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">user?.address?.city</text>
  <text x="135" y="88" fill="currentColor" font-size="10" text-anchor="middle">address is null →</text>
  <text x="135" y="108" fill="#22c55e" font-size="10" text-anchor="middle">returns undefined ✓</text>
  <text x="135" y="132" fill="currentColor" font-size="9.5" text-anchor="middle">no "cannot read city of null"</text>
  <rect x="270" y="42" width="230" height="122" rx="10" fill="#f59e0b" fill-opacity="0.08" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="385" y="62" fill="#f59e0b" font-size="11" font-weight="700" text-anchor="middle">0 ?? 5  vs  0 || 5</text>
  <text x="385" y="88" fill="#22c55e" font-size="10" text-anchor="middle">0 ?? 5 → 0   (0 is valid)</text>
  <text x="385" y="108" fill="#ef4444" font-size="10" text-anchor="middle">0 || 5 → 5   (0 is falsy)</text>
  <text x="385" y="132" fill="currentColor" font-size="9.5" text-anchor="middle">?? preserves 0 / "" / false</text>
</svg>`)}

**How it works.** Optional chaining stops evaluating the moment it meets a nullish link, so <code>user?.address?.city</code> never throws even when <code>user</code> or <code>address</code> is missing. It also guards calls (<code>obj.fn?.()</code>) and indexes (<code>arr?.[0]</code>). Nullish coalescing pairs naturally with it: <code>user?.name ?? "Guest"</code> falls back only on a genuinely absent value — keeping legitimate <code>0</code> or empty-string data intact.

### ?? vs ||
| Left value | <code>x ?? "fb"</code> | <code>x \\|\\| "fb"</code> |
| --- | --- | --- |
| <code>0</code> | <code>0</code> | <code>"fb"</code> |
| <code>""</code> | <code>""</code> | <code>"fb"</code> |
| <code>null</code> | <code>"fb"</code> | <code>"fb"</code> |
| <code>"hi"</code> | <code>"hi"</code> | <code>"hi"</code> |

> **Interview tip:** Use <code>??</code> for defaults when <code>0</code> / <code>""</code> / <code>false</code> are valid inputs; reach for <code>||</code> only when *any* falsy value should be replaced. Note you can't mix <code>??</code> with <code>&&</code>/<code>||</code> without parentheses — a deliberate syntax error to avoid ambiguity.`,
    examples: [
      {
        label: "Safe access + correct defaults",
        runnable: true,
        code: `const user = { name: "", settings: null };

// optional chaining — no throw on missing links
console.log(user?.settings?.theme);   // undefined
console.log(user?.profile?.bio);       // undefined

// ?? keeps valid falsy values; || would clobber them
console.log(user.name ?? "Guest");     // ""      (empty string is valid)
console.log(user.name || "Guest");     // "Guest" (|| treats "" as empty)
console.log(0 ?? 10, 0 || 10);          // 0 10

// guard a method call + array index
console.log(user.greet?.());            // undefined (no error)
console.log([1, 2]?.[5]);               // undefined`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are the logical assignment operators?",
    answer: `**Core concept (TL;DR).** ES2021 added three operators that fuse a logical test with assignment: <code>||=</code>, <code>&&=</code>, and <code>??=</code>. Each assigns to the variable **only if** the logical condition allows — and they *short-circuit*, so the right-hand side isn't even evaluated when it's not needed.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Assign only when the logical test passes</text>
  <rect x="18" y="42" width="152" height="110" rx="9" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="94" y="64" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">x ||= y</text>
  <text x="94" y="90" fill="currentColor" font-size="9.5" text-anchor="middle">assign if x is falsy</text>
  <text x="94" y="112" fill="currentColor" font-size="9" text-anchor="middle">x = x || y</text>
  <rect x="184" y="42" width="152" height="110" rx="9" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="260" y="64" fill="#f59e0b" font-size="11" font-weight="700" text-anchor="middle">x &amp;&amp;= y</text>
  <text x="260" y="90" fill="currentColor" font-size="9.5" text-anchor="middle">assign if x is truthy</text>
  <text x="260" y="112" fill="currentColor" font-size="9" text-anchor="middle">x = x &amp;&amp; y</text>
  <rect x="350" y="42" width="152" height="110" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e" stroke-width="1.5"/>
  <text x="426" y="64" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">x ??= y</text>
  <text x="426" y="90" fill="currentColor" font-size="9.5" text-anchor="middle">assign if x is null/undef</text>
  <text x="426" y="112" fill="currentColor" font-size="9" text-anchor="middle">x = x ?? y</text>
</svg>`)}

**How it works.** <code>x ??= y</code> is the most useful: it sets a default only when <code>x</code> is <code>null</code>/<code>undefined</code>, leaving valid <code>0</code> or <code>""</code> alone. Crucially they short-circuit — <code>x ||= expensive()</code> skips <code>expensive()</code> entirely when <code>x</code> is already truthy, and they only **assign** (not just evaluate) when needed, which can matter for setters/proxies.

### The three operators
| Operator | Assigns when <code>x</code> is | Equivalent |
| --- | --- | --- |
| <code>x \\|\\|= y</code> | falsy (<code>0</code>, <code>""</code>, <code>null</code>…) | <code>x \\|\\| (x = y)</code> |
| <code>x &&= y</code> | truthy | <code>x && (x = y)</code> |
| <code>x ??= y</code> | <code>null</code> / <code>undefined</code> | <code>x ?? (x = y)</code> |

> **Interview tip:** Highlight <code>??=</code> as the clean way to lazily initialise config/cache fields (<code>options.timeout ??= 3000</code>) without overwriting a deliberate <code>0</code>. Mention the short-circuit: the RHS runs only when assignment actually happens.`,
    examples: [
      {
        label: "Defaulting without clobbering valid values",
        runnable: true,
        code: `const opts = { timeout: 0, retries: undefined };

opts.timeout ??= 3000;   // 0 is valid → unchanged
opts.retries ??= 2;      // undefined → set to 2
console.log(opts);        // { timeout: 0, retries: 2 }

let title = "";
title ||= "Untitled";    // "" is falsy → replaced
console.log(title);       // "Untitled"

let user = { name: "Ada" };
user &&= { ...user, active: true }; // user is truthy → updated
console.log(user);        // { name: "Ada", active: true }`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are computed property names?",
    answer: `**Core concept (TL;DR).** Computed property names let you use an **expression** — wrapped in square brackets — as an object (or class) key inside the literal itself. The expression is evaluated at creation time and its result becomes the key, so you can build dynamic keys without a separate assignment step.

${card(`<svg viewBox="0 0 520 156" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">[expression] becomes the key</text>
  <rect x="40" y="44" width="150" height="40" rx="8" fill="#3b82f6" fill-opacity="0.13" stroke="#3b82f6"/>
  <text x="115" y="68" fill="currentColor" font-size="10" text-anchor="middle">const k = "role"</text>
  <path d="M 190 64 L 250 64" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#cp-a)"/>
  <rect x="252" y="40" width="230" height="50" rx="8" fill="#22c55e" fill-opacity="0.12" stroke="#22c55e"/>
  <text x="367" y="60" fill="currentColor" font-size="10" text-anchor="middle">{ [k]: "admin" }</text>
  <text x="367" y="80" fill="#22c55e" font-size="10" text-anchor="middle">→ { role: "admin" }</text>
  <text x="260" y="124" fill="currentColor" font-size="10" text-anchor="middle">works with template strings, symbols, and in classes too</text>
  <defs><marker id="cp-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** Before ES2015 you had to create the object and then assign a dynamic key with bracket notation. Computed keys fold that into the literal: <code>{ [expr]: value }</code>. The expression can be a variable, a template string, a function call, or a <code>Symbol</code> — which is exactly how you attach well-known symbols like <code>[Symbol.iterator]</code> directly in a literal or class body.

### Where they help
| Use | Example |
| --- | --- |
| Dynamic key from a variable | <code>{ [field]: value }</code> |
| Built key from a template | <code>{ [\`item_\${id}\`]: data }</code> |
| Symbol keys | <code>{ [Symbol.iterator]() {} }</code> |
| Reducers / grouping | build a lookup map by key |

> **Interview tip:** Pair this with the ES2015 *shorthand* — <code>{ name }</code> for <code>{ name: name }</code> — as the two object-literal upgrades. A clean use case is turning an array into a keyed lookup with <code>reduce</code> and a computed key.`,
    examples: [
      {
        label: "Dynamic keys in a literal",
        runnable: true,
        code: `const field = "role";
const id = 7;

const obj = {
  [field]: "admin",                 // variable as key
  ["item_" + id]: { qty: 2 },       // expression as key
  [\`status_\${id}\`]: "active",       // template string as key
};
console.log(obj); // { role: "admin", item_7: {qty:2}, status_7: "active" }

// build a lookup map with reduce + computed key
const users = [{ id: 1, name: "Ada" }, { id: 2, name: "Lin" }];
const byId = users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {});
console.log(byId); // { "1": "Ada", "2": "Lin" }`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are tagged template literals?",
    answer: `**Core concept (TL;DR).** A *tag* is a function placed directly before a template literal. Instead of building a string, JavaScript calls the function with the **static string parts** (as an array) and the **interpolated values** (as the rest of the arguments) — letting the function process and return *anything*.

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">tag\`text \${v}\` → tag(strings, ...values)</text>
  <rect x="20" y="46" width="200" height="50" rx="8" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6"/>
  <text x="120" y="66" fill="currentColor" font-size="10" text-anchor="middle">strings: ["User ", " won"]</text>
  <text x="120" y="86" fill="currentColor" font-size="10" text-anchor="middle">values: ["Ada"]</text>
  <path d="M 220 71 L 280 71" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#tt-a)"/>
  <rect x="282" y="46" width="120" height="50" rx="8" fill="#f59e0b" fill-opacity="0.13" stroke="#f59e0b"/>
  <text x="342" y="75" fill="#f59e0b" font-size="11" font-weight="700" text-anchor="middle">tag fn</text>
  <path d="M 402 71 L 462 71" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#tt-a)"/>
  <text x="475" y="75" fill="#22c55e" font-size="10" text-anchor="end">any value</text>
  <text x="260" y="132" fill="currentColor" font-size="10" text-anchor="middle">powers styled-components, gql, i18n, and HTML escaping</text>
  <defs><marker id="tt-a" markerWidth="7" markerHeight="7" refX="4" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="currentColor"/></marker></defs>
</svg>`)}

**How it works.** For <code>tag\`a\${x}b\`</code>, the engine calls <code>tag(["a","b"], x)</code> — the strings array always has exactly one more element than the values. Because the tag controls the output, it can sanitize/escape interpolations (preventing injection), build CSS (styled-components), parse a query (graphql-tag's <code>gql</code>), or localise text. The raw, un-escaped strings are also available via <code>strings.raw</code> (what <code>String.raw</code> uses).

### Real-world tags
| Library / API | Tag |
| --- | --- |
| styled-components | <code>styled.div\`...\`</code> |
| GraphQL | <code>gql\`...\`</code> |
| Built-in | <code>String.raw\`...\`</code> |
| Custom | escaping, i18n, logging |

> **Interview tip:** The key insight to state: the tag receives strings and values **separately**, so it can treat interpolated data differently from the literal template — that separation is what makes safe escaping and DSLs possible.`,
    examples: [
      {
        label: "A safe-highlighting tag function",
        runnable: true,
        code: `function highlight(strings, ...values) {
  return strings.reduce((out, str, i) => {
    const v = i < values.length ? "[" + values[i] + "]" : "";
    return out + str + v;
  }, "");
}

const name = "Ada";
const score = 99;
console.log(highlight\`User \${name} scored \${score}!\`);
// → "User [Ada] scored [99]!"

// String.raw keeps escape sequences literal
console.log(String.raw\`line1\\nstill line1\`); // "line1\\nstill line1"`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are template literals?",
    answer: `**Core concept (TL;DR).** Template literals are strings delimited by **backticks** that add three things over quoted strings: <code>\${...}</code> **interpolation** of any expression, real **multi-line** strings, and freedom from escaping the other quote characters. They're the default way to build strings in modern JavaScript.

${card(`<svg viewBox="0 0 520 152" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Backtick strings: interpolate · multiline · no escaping</text>
  <rect x="30" y="40" width="150" height="76" rx="9" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6" stroke-width="1.4"/>
  <text x="105" y="64" fill="#3b82f6" font-size="10.5" font-weight="700" text-anchor="middle">interpolation</text>
  <text x="105" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">\${name}</text>
  <text x="105" y="106" fill="currentColor" font-size="9" text-anchor="middle">any expression</text>
  <rect x="190" y="40" width="140" height="76" rx="9" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b" stroke-width="1.4"/>
  <text x="260" y="64" fill="#f59e0b" font-size="10.5" font-weight="700" text-anchor="middle">multi-line</text>
  <text x="260" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">newlines kept</text>
  <text x="260" y="106" fill="currentColor" font-size="9" text-anchor="middle">no \\n needed</text>
  <rect x="340" y="40" width="150" height="76" rx="9" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e" stroke-width="1.4"/>
  <text x="415" y="64" fill="#22c55e" font-size="10.5" font-weight="700" text-anchor="middle">no escaping</text>
  <text x="415" y="88" fill="currentColor" font-size="9.5" text-anchor="middle">' and " freely</text>
  <text x="415" y="106" fill="currentColor" font-size="9" text-anchor="middle">cleaner HTML</text>
</svg>`)}

**How it works.** Inside <code>\${ }</code> you can put any expression — variables, arithmetic, function calls, ternaries — and its result is stringified into place. Newlines inside the backticks are preserved literally, which makes multi-line HTML/SQL readable without <code>\\n</code> + concatenation. A template literal can also be *tagged* with a function for advanced processing (see tagged template literals).

### vs old-style strings
| | Quoted strings | Template literals |
| --- | --- | --- |
| Insert a variable | <code>"Hi " + name</code> | <code>\`Hi \${name}\`</code> |
| Multi-line | <code>"a\\n" + "b"</code> | real line breaks |
| Embed quotes | escape them | use freely |
| Advanced | — | tags, <code>String.raw</code> |

> **Interview tip:** Beyond convenience, note <code>\${}</code> accepts *any* expression (e.g. <code>\${a > b ? "hi" : "lo"}</code>), and that template literals underpin tagged templates — the foundation of libraries like styled-components.`,
    examples: [
      {
        label: "Interpolation and multi-line",
        runnable: true,
        code: `const name = "Ada";
const items = ["a", "b", "c"];

// expressions inside \${ }
console.log(\`Hi \${name}, you have \${items.length} item(s)\`);
console.log(\`Total next year: \${items.length + 1}\`);

// multi-line, no \\n or concatenation
const html = \`
  <ul>
    <li>\${items[0]}</li>
  </ul>\`;
console.log(html.trim());

// embed both quote types freely
console.log(\`She said "it's fine"\`);`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are the quirks of the typeof operator?",
    answer: `**Core concept (TL;DR).** <code>typeof</code> returns a **string** naming the operand's type. It's handy for primitives, but carries famous quirks: <code>typeof null</code> is <code>"object"</code> (a legacy bug), functions report <code>"function"</code> (not <code>"object"</code>), <code>typeof NaN</code> is <code>"number"</code>, and <code>typeof</code> on an **undeclared** variable is safely <code>"undefined"</code> instead of throwing.

${card(`<svg viewBox="0 0 520 176" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">typeof — the surprising results</text>
  <g font-size="10">
    <rect x="20" y="38" width="232" height="26" rx="5" fill="#ef4444" fill-opacity="0.10" stroke="#ef4444"/><text x="32" y="55" fill="currentColor">typeof null → "object"  (legacy bug)</text>
    <rect x="20" y="70" width="232" height="26" rx="5" fill="#3b82f6" fill-opacity="0.10" stroke="#3b82f6"/><text x="32" y="87" fill="currentColor">typeof (()=>{}) → "function"</text>
    <rect x="20" y="102" width="232" height="26" rx="5" fill="#f59e0b" fill-opacity="0.10" stroke="#f59e0b"/><text x="32" y="119" fill="currentColor">typeof NaN → "number"</text>
    <rect x="20" y="134" width="232" height="26" rx="5" fill="#22c55e" fill-opacity="0.10" stroke="#22c55e"/><text x="32" y="151" fill="currentColor">typeof undeclaredVar → "undefined"</text>
  </g>
  <g font-size="10">
    <rect x="268" y="38" width="232" height="26" rx="5" fill="#64748b" fill-opacity="0.10" stroke="#64748b"/><text x="280" y="55" fill="currentColor">typeof [] → "object"  (use isArray)</text>
    <rect x="268" y="70" width="232" height="26" rx="5" fill="#64748b" fill-opacity="0.10" stroke="#64748b"/><text x="280" y="87" fill="currentColor">typeof 10n → "bigint"</text>
    <rect x="268" y="102" width="232" height="26" rx="5" fill="#64748b" fill-opacity="0.10" stroke="#64748b"/><text x="280" y="119" fill="currentColor">typeof Symbol() → "symbol"</text>
    <rect x="268" y="134" width="232" height="26" rx="5" fill="#64748b" fill-opacity="0.10" stroke="#64748b"/><text x="280" y="151" fill="currentColor">typeof "x" → "string"</text>
  </g>
</svg>`)}

**How it works.** <code>typeof</code> reliably distinguishes the primitives (<code>"string"</code>, <code>"number"</code>, <code>"boolean"</code>, <code>"bigint"</code>, <code>"symbol"</code>, <code>"undefined"</code>) and <code>"function"</code>. Its blind spot is objects: arrays, dates, <code>null</code>, and plain objects all report <code>"object"</code>, so you need <code>Array.isArray()</code> or <code>Object.prototype.toString.call(x)</code> to tell them apart. The "safe on undeclared" behaviour makes <code>typeof x !== "undefined"</code> the classic existence check.

### typeof results
| Value | <code>typeof</code> |
| --- | --- |
| <code>null</code> | <code>"object"</code> ⚠️ |
| <code>[]</code>, <code>{}</code> | <code>"object"</code> |
| function | <code>"function"</code> |
| <code>NaN</code> | <code>"number"</code> |
| undeclared | <code>"undefined"</code> (no throw) |

> **Interview tip:** The headline quirk is <code>typeof null === "object"</code>. For precise object-type checks, cite <code>Object.prototype.toString.call(x)</code> (e.g. <code>"[object Array]"</code>) and <code>Array.isArray()</code>.`,
    examples: [
      {
        label: "The quirks, demonstrated",
        runnable: true,
        code: `console.log(typeof null);        // "object"   (historical bug)
console.log(typeof function(){}); // "function"
console.log(typeof NaN);          // "number"
console.log(typeof []);           // "object"   → use Array.isArray
console.log(typeof 10n);          // "bigint"
console.log(typeof Symbol());     // "symbol"

// safe on UNDECLARED identifiers (no ReferenceError)
console.log(typeof neverDeclared); // "undefined"

// precise object discrimination
console.log(Object.prototype.toString.call([]));  // "[object Array]"
console.log(Array.isArray([]));                     // true`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What does 'use strict' do?",
    answer: `**Core concept (TL;DR).** <code>"use strict"</code> opts a script or function into **strict mode** — a safer variant of JavaScript that turns previously-silent mistakes into thrown errors and removes confusing legacy behaviour. ES modules and <code>class</code> bodies are strict **automatically**, so you rarely write the directive by hand today.

${card(`<svg viewBox="0 0 520 160" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Strict mode turns silent failures into errors</text>
  <rect x="20" y="40" width="230" height="104" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.5"/>
  <text x="135" y="60" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">sloppy mode</text>
  <text x="135" y="84" fill="currentColor" font-size="9.5" text-anchor="middle">undeclared assign → global</text>
  <text x="135" y="104" fill="currentColor" font-size="9.5" text-anchor="middle">this → global object</text>
  <text x="135" y="124" fill="currentColor" font-size="9.5" text-anchor="middle">silent failures</text>
  <rect x="270" y="40" width="230" height="104" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="60" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">"use strict"</text>
  <text x="385" y="84" fill="currentColor" font-size="9.5" text-anchor="middle">undeclared assign → throws</text>
  <text x="385" y="104" fill="currentColor" font-size="9.5" text-anchor="middle">this → undefined</text>
  <text x="385" y="124" fill="currentColor" font-size="9.5" text-anchor="middle">catches typos early</text>
</svg>`)}

**How it works.** Place the literal string <code>"use strict";</code> at the top of a file or function. It then: throws on assignment to an **undeclared** variable; makes <code>this</code> <code>undefined</code> in plain function calls (instead of the global object); forbids duplicate parameter names; throws when writing to read-only/non-writable properties; and bans the legacy <code>with</code> statement. The net effect is fewer accidental globals and earlier, louder errors.

### Sloppy vs strict
| Behaviour | Sloppy | Strict |
| --- | --- | --- |
| Assign to undeclared var | creates a global | <code>ReferenceError</code> |
| <code>this</code> in a plain call | global object | <code>undefined</code> |
| Duplicate param names | allowed | <code>SyntaxError</code> |
| Write to read-only prop | silently ignored | <code>TypeError</code> |

> **Interview tip:** The most-quoted effect: a typo'd assignment that *silently created a global* now throws. Add that ES modules and class bodies are strict by default, so the explicit directive is mostly a legacy-script concern.`,
    examples: [
      {
        label: "A typo that strict mode catches",
        runnable: true,
        code: `(function sloppy() {
  undeclaredVar = 42;        // silently creates a global
  return undeclaredVar;
})();
console.log("sloppy created a global:", typeof undeclaredVar); // "number"

function strict() {
  "use strict";
  try {
    mistypedName = 99;       // would-be accidental global
  } catch (e) {
    return e.name;           // "ReferenceError"
  }
}
console.log("strict throws:", strict()); // "ReferenceError"`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What does the delete operator do?",
    answer: `**Core concept (TL;DR).** <code>delete</code> removes a **property** from an object and returns <code>true</code> on success. That's its whole job — it does **not** delete variables, functions, or free memory, and on an array it removes the element but leaves a *hole* (the <code>length</code> doesn't change).

${card(`<svg viewBox="0 0 520 160" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">delete removes a property — and leaves array holes</text>
  <rect x="20" y="40" width="230" height="104" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="135" y="60" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">delete obj.b</text>
  <text x="135" y="84" fill="currentColor" font-size="9.5" text-anchor="middle">{a,b,c} → {a,c}</text>
  <text x="135" y="104" fill="#22c55e" font-size="9.5" text-anchor="middle">returns true ✓</text>
  <text x="135" y="124" fill="currentColor" font-size="9" text-anchor="middle">key fully removed</text>
  <rect x="270" y="40" width="230" height="104" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.5"/>
  <text x="385" y="60" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">delete arr[1]</text>
  <text x="385" y="84" fill="currentColor" font-size="9.5" text-anchor="middle">[a,b,c] → [a, &lt;empty&gt;, c]</text>
  <text x="385" y="104" fill="#ef4444" font-size="9.5" text-anchor="middle">length stays 3 ⚠️</text>
  <text x="385" y="124" fill="currentColor" font-size="9" text-anchor="middle">use splice instead</text>
</svg>`)}

**How it works.** <code>delete obj.key</code> unbinds that key entirely — afterwards <code>"key" in obj</code> is <code>false</code> (different from merely setting it to <code>undefined</code>). It can't remove <code>var</code>/<code>let</code>/<code>const</code> bindings or function declarations (returns <code>false</code>, or throws in strict mode). On arrays it creates a sparse "empty" slot rather than shifting elements, so for real removal use <code>splice</code>, <code>filter</code>, or set to <code>undefined</code> deliberately.

### delete behaviour
| Target | Result |
| --- | --- |
| <code>delete obj.prop</code> | removes the key, returns <code>true</code> |
| <code>delete arr[i]</code> | leaves a hole, <code>length</code> unchanged |
| <code>delete variable</code> | <code>false</code> / strict <code>SyntaxError</code> |
| set to <code>undefined</code> | key **stays**, value is <code>undefined</code> |

> **Interview tip:** Two points score well: (1) <code>delete</code> on an array leaves a sparse hole — use <code>splice</code>/<code>filter</code> for true removal; (2) deleting a property is *not* the same as setting it to <code>undefined</code> — only <code>delete</code> makes <code>in</code> / <code>hasOwnProperty</code> report <code>false</code>.`,
    examples: [
      {
        label: "Property vs array behaviour",
        runnable: true,
        code: `const obj = { a: 1, b: 2, c: 3 };
console.log(delete obj.b);     // true
console.log(obj, "b" in obj);  // { a: 1, c: 3 }  false

// setting to undefined is NOT the same
const o2 = { x: 1 };
o2.x = undefined;
console.log("x" in o2);        // true — key still exists!

// arrays: delete leaves a hole, length unchanged
const arr = ["a", "b", "c"];
delete arr[1];
console.log(arr, arr.length);  // ["a", <empty>, "c"]  3
console.log(arr[1]);            // undefined

// real removal uses splice
const arr2 = ["a", "b", "c"];
arr2.splice(1, 1);
console.log(arr2, arr2.length); // ["a", "c"]  2`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is short-circuit evaluation?",
    answer: `**Core concept (TL;DR).** The logical operators <code>&&</code> and <code>||</code> stop evaluating as soon as the result is decided, and they **return one of the operands** (not a boolean). <code>&&</code> returns the first *falsy* operand (or the last if all truthy); <code>||</code> returns the first *truthy* operand (or the last if all falsy).

${card(`<svg viewBox="0 0 520 168" style="width:100%;display:block" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui">
  <text x="16" y="22" fill="currentColor" font-size="12" font-weight="700">Stop early · return an operand, not a boolean</text>
  <rect x="20" y="42" width="230" height="110" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="135" y="62" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">A && B</text>
  <text x="135" y="86" fill="currentColor" font-size="9.5" text-anchor="middle">A falsy → return A (skip B)</text>
  <text x="135" y="106" fill="currentColor" font-size="9.5" text-anchor="middle">A truthy → return B</text>
  <text x="135" y="130" fill="#3b82f6" font-size="9" text-anchor="middle">guard: cond && doThing()</text>
  <rect x="270" y="42" width="230" height="110" rx="10" fill="#22c55e" fill-opacity="0.08" stroke="#22c55e" stroke-width="1.5"/>
  <text x="385" y="62" fill="#22c55e" font-size="11" font-weight="700" text-anchor="middle">A || B</text>
  <text x="385" y="86" fill="currentColor" font-size="9.5" text-anchor="middle">A truthy → return A (skip B)</text>
  <text x="385" y="106" fill="currentColor" font-size="9.5" text-anchor="middle">A falsy → return B</text>
  <text x="385" y="130" fill="#22c55e" font-size="9" text-anchor="middle">default: name || "Guest"</text>
</svg>`)}

**How it works.** Because the operators return the *operand* (not <code>true</code>/<code>false</code>), they double as control flow. <code>cond && run()</code> calls <code>run()</code> only when <code>cond</code> is truthy (a guard). <code>value || fallback</code> supplies a default when <code>value</code> is falsy. The skipped side is **never evaluated**, so you can safely write <code>obj && obj.fn()</code> — though <code>?.</code> and <code>??</code> are now the clearer tools for nullish cases specifically.

### What each returns
| Expression | Returns |
| --- | --- |
| <code>0 && "x"</code> | <code>0</code> (first falsy) |
| <code>"a" && "b"</code> | <code>"b"</code> (last, all truthy) |
| <code>"" \\|\\| "fb"</code> | <code>"fb"</code> (first truthy) |
| <code>"a" \\|\\| "b"</code> | <code>"a"</code> (first truthy) |

> **Interview tip:** Emphasise that these return an **operand, not a boolean**, which is what enables the <code>cond && jsx</code> render pattern in React and <code>x || default</code> fallbacks. For purely nullish defaults prefer <code>??</code> so valid <code>0</code>/<code>""</code> survive.`,
    examples: [
      {
        label: "Operators return operands",
        runnable: true,
        code: `console.log(0 && "x");      // 0      (&&: first falsy)
console.log("a" && "b");    // "b"    (&&: last, all truthy)
console.log("" || "fb");    // "fb"   (||: first truthy)
console.log("a" || "b");    // "a"

// guard: run only when truthy (RHS skipped otherwise)
let calls = 0;
const run = () => { calls++; return "ran"; };
false && run();
console.log("skipped, calls =", calls); // 0
true && run();
console.log("executed, calls =", calls); // 1

// default value
const name = "";
console.log(name || "Guest"); // "Guest"`,
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
