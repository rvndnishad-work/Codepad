/**
 * Practical JS coding-interview content — batch 26 (DSA round, hard tier — the
 * LAST five rows of the javascript-coding bank: JSON.parse polyfill, JSON.stringify
 * polyfill, deepEqual, deepClone, minimal Promise/A+). Titles were pulled from a live
 * DB query. Every code block in each answer is inserted from the SAME source text as the
 * runnable example, so the doc and the verified code cannot drift apart.
 *
 * Verified by real execution before writing (Node v24.19.0; timings are machine specific):
 *   - Promise/A+: the official promises-aplus-tests 2.1.2 suite, 872 passing; mutation runs
 *     (one feature removed at a time) fail 22 / 2 / 60 / 4 / 54 / 567 / 10 tests; side-by-side
 *     with the native Promise (order, finally, thenables, self resolution); returning a promise
 *     from then takes 3 ticks natively and 2 here; native reports unhandled rejections, this does not.
 *   - deepClone: 60,000 random graphs vs structuredClone / util.isDeepStrictEqual, 0 failures;
 *     shape, sharing, disjointness, no mutation; the classic bugs reproduced; depth and speed measured.
 *   - deepEqual: 240,000 pairs vs util.isDeepStrictEqual, 1 disagreement (Node wrong); memoised variant
 *     agrees with the plain one on all of them; diamond DAG 77 s at depth 24 vs 0.2 ms memoised.
 *   - JSON.parse: 813,615 exhaustive short strings, all 65,536 code units in 3 positions, 60,000 random
 *     documents, 240,000 corruptions, 120,000 reviver runs vs native, 0 mismatches.
 *   - JSON.stringify: 150,000 random triples, 30,000 replacer call sequences, all 65,536 code units,
 *     200,000 numbers vs native, 0 mismatches; each classic mistake reproduced.
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "JSON.parse Polyfill",
    seoDescription: "A recursive-descent JSON.parse that never evals matched native on 813,615 strings, all 65,536 code units and 300,000 documents: zero mismatches.",
    description: `**Problem, as an interviewer would state it:**
"Implement a secure polyfill for \`JSON.parse\` using a recursive descent parsing approach, validating characters to prevent arbitrary script execution. Discuss edge cases, runtime, and alternatives."

**Examples:**

\`\`\`
jsonParse('{"a":[1,2.5,-3e2,true,null],"b":{"c":"x\\\\ny"}}');   // { a: [1, 2.5, -300, true, null], b: { c: "x\\ny" } }
jsonParse('{"a":1,}');                                       // throws SyntaxError (trailing comma)
jsonParse('{"n":"2026-01-15T10:30:00.000Z"}', (k, v) => (k === "n" ? new Date(v) : v));   // reviver support
\`\`\`

**Clarifying questions expected:**
- How strict must it be (trailing commas, single quotes, comments, leading zeros, \`NaN\`)?
- Which error should it throw, and must the optional reviver be supported?
- How should \`__proto__\` keys, duplicate keys and very deep nesting behave?

**Code / implementation expected:** Yes — a real parser, checked against the native \`JSON.parse\` on many inputs.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** the parser was fuzzed against the native \`JSON.parse\` until nothing disagreed: 813,615 short strings from a structural alphabet (every string up to length 5), every one of the 65,536 UTF-16 code units in three positions, 60,000 random documents, 240,000 random corruptions of them, and six different revivers over 20,000 documents each. Zero mismatches, on both the accept-or-reject decision and the resulting value (key order, \`-0\` and an own \`__proto__\` key included). The runnable example repeats a smaller version of the same checks so it stays fast in a browser.

## 1. The problem, restated

Write \`jsonParse(text, reviver)\` that turns JSON text into a value without ever evaluating the text as code, using recursive descent: one function per grammar rule, a position index, and an error (\`SyntaxError\`) for anything that is not exactly valid JSON. It must also support the optional \`reviver\` that post-processes every value.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| How strict? | Exactly JSON: no trailing commas, single quotes, comments, unquoted keys, \`NaN\`, \`Infinity\`, leading zeros or \`+\`. Whitespace is only space, tab, newline and carriage return. |
| What error? | A \`SyntaxError\`. The native message text differs per engine, so tests should compare the error class, not the message. |
| The reviver? | Called bottom-up (children before parents) with \`this\` set to the holder object; returning \`undefined\` deletes the key. |
| Numbers? | Everything becomes a JavaScript number, so \`1e999\` is \`Infinity\`, \`-0\` stays \`-0\`, and integers beyond 2^53 lose precision, exactly like the native parser. |
| Special keys? | A key named \`__proto__\` must become an ordinary own property, and duplicate keys keep the last value. |

## 3. Thought process

The one-line brute force is \`eval("(" + text + ")")\` or \`new Function("return (" + text + ")")()\`. It is wrong twice. It accepts things that are not JSON (in the run below, all six probes were accepted: an unquoted key, single quotes, a trailing comma, hex and octal numbers, an arrow-function expression, and a comma expression that assigns to a global), and worse, it RUNS whatever it is given: the probe that assigned to \`globalThis\` really executed. The historical fix was to validate the text with a regular expression and then \`eval\` it, which is fragile because one gap in the regex is a code-execution hole. The robust answer is to never evaluate anything: parse the grammar directly. Each rule becomes a function that consumes exactly its own characters from the shared position \`i\`:

- **value** looks at one character and dispatches: \`{\` object, \`[\` array, \`"\` string, \`-\` or a digit number, otherwise one of the three literals \`true\`, \`false\`, \`null\`.
- **object and array** loop on "value, then \`,\` or the closing bracket", and treat a comma followed by a closer as an error (that is what rejects trailing commas).
- **string** copies plain runs with \`slice\`, rejects any raw character below U+0020, and decodes the eight short escapes and \`\\uXXXX\` (validating that exactly four hex digits follow).
- **number** follows the grammar by hand: optional \`-\`, then \`0\` or a non-zero digit followed by digits (so \`01\` cannot parse), optional fraction (needs a digit after the dot), optional exponent (needs a digit).
- After the top-level value only whitespace may remain.

Objects are filled with \`Object.defineProperty\`, not \`obj[key] = value\`, because assignment to \`"__proto__"\` would set the prototype instead of creating a key. The reviver is a separate bottom-up walk over the finished value, as the specification describes.

## 4. Verified solution

\`\`\`js
function jsonParse(text, reviver) {
  const src = String(text);
  let i = 0;

  const fail = (msg) => { throw new SyntaxError(msg + " at position " + i); };
  const isDigit = (c) => c >= "0" && c <= "9";
  const skipWs = () => {
    while (src[i] === " " || src[i] === "\\t" || src[i] === "\\n" || src[i] === "\\r") i++;
  };
  const define = (obj, key, value) =>
    Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });

  const ESCAPES = { '"': '"', "\\\\": "\\\\", "/": "/", b: "\\b", f: "\\f", n: "\\n", r: "\\r", t: "\\t" };

  function parseValue() {
    skipWs();
    const c = src[i];
    if (c === "{") return parseObject();
    if (c === "[") return parseArray();
    if (c === '"') return parseString();
    if (c === "-" || isDigit(c)) return parseNumber();
    if (src.startsWith("true", i)) { i += 4; return true; }
    if (src.startsWith("false", i)) { i += 5; return false; }
    if (src.startsWith("null", i)) { i += 4; return null; }
    return fail(c === undefined ? "Unexpected end of JSON input" : "Unexpected token " + c);
  }

  function parseObject() {
    i++;                                            // {
    const obj = {};
    skipWs();
    if (src[i] === "}") { i++; return obj; }
    for (;;) {
      skipWs();
      if (src[i] !== '"') fail("Expected a double-quoted property name");
      const key = parseString();
      skipWs();
      if (src[i] !== ":") fail("Expected ':' after property name");
      i++;
      define(obj, key, parseValue());               // own data property, even for "__proto__"
      skipWs();
      if (src[i] === ",") { i++; continue; }
      if (src[i] === "}") { i++; return obj; }
      fail("Expected ',' or '}' after property value");
    }
  }

  function parseArray() {
    i++;                                            // [
    const arr = [];
    skipWs();
    if (src[i] === "]") { i++; return arr; }
    for (;;) {
      arr.push(parseValue());
      skipWs();
      if (src[i] === ",") { i++; continue; }
      if (src[i] === "]") { i++; return arr; }
      fail("Expected ',' or ']' after array element");
    }
  }

  function parseString() {
    i++;                                            // opening quote
    let out = "";
    let chunk = i;                                  // start of the plain run we have not copied yet
    for (;;) {
      if (i >= src.length) fail("Unterminated string");
      const ch = src[i];
      if (ch === '"') { out += src.slice(chunk, i); i++; return out; }
      if (ch < " ") fail("Bad control character in string literal");
      if (ch === "\\\\") {
        out += src.slice(chunk, i);
        i++;
        const e = src[i];
        if (e === "u") {
          const hex = src.slice(i + 1, i + 5);
          if (hex.length < 4 || !/^[0-9a-fA-F]{4}$/.test(hex)) fail("Bad Unicode escape");
          out += String.fromCharCode(parseInt(hex, 16));
          i += 5;
        } else if (Object.hasOwn(ESCAPES, e)) {
          out += ESCAPES[e];
          i++;
        } else {
          fail("Bad escaped character");
        }
        chunk = i;
      } else {
        i++;
      }
    }
  }

  function parseNumber() {
    const start = i;
    if (src[i] === "-") i++;
    if (src[i] === "0") i++;                        // a leading zero cannot be followed by more digits
    else if (isDigit(src[i])) while (isDigit(src[i])) i++;
    else fail("No number after minus sign");
    if (src[i] === ".") {
      i++;
      if (!isDigit(src[i])) fail("Unterminated fractional number");
      while (isDigit(src[i])) i++;
    }
    if (src[i] === "e" || src[i] === "E") {
      i++;
      if (src[i] === "+" || src[i] === "-") i++;
      if (!isDigit(src[i])) fail("Exponent part is missing a number");
      while (isDigit(src[i])) i++;
    }
    return Number(src.slice(start, i));
  }

  const result = parseValue();
  skipWs();
  if (i < src.length) fail("Unexpected non-whitespace character after JSON");

  if (typeof reviver !== "function") return result;

  function walk(holder, key) {                      // bottom-up, like the spec InternalizeJSONProperty
    const value = holder[key];
    if (value !== null && typeof value === "object") {
      for (const k of Object.keys(value)) {
        const next = walk(value, k);
        if (next === undefined) delete value[k];
        else define(value, k, next);
      }
    }
    return reviver.call(holder, key, value);
  }
  return walk({ "": result }, "");
}
\`\`\`

\`\`\`
real, verified output (Node v24.19.0), compared with the native JSON.parse:

  same accept or reject decision, SyntaxError on both sides, identical value:
    81 hand-picked inputs                                                   0 mismatches
    every string up to length 5 over 15 structural characters (813,615)     0 mismatches (4,213 of them valid)
    all 65,536 code units inside quotes                                     0 mismatches (65,502 accepted: all but the 32 control characters, the quote and the backslash)
    all 65,536 characters after a backslash                                 0 mismatches (8 accepted: quote, backslash, slash, b, f, n, r, t)
    all 65,536 \\uXXXX escapes, mixed-case hex                          0 mismatches
    60,000 random valid documents                                           0 mismatches
    240,000 random corruptions (28,106 still valid, 211,894 rejected)       0 mismatches
    reviver, 6 revivers x 20,000 documents (call order, this, deletes)      0 mismatches
    call order for {"a":[1,{"b":2}],"c":3}                                  0 b 1 a c (root), identical to native

  security probes (unquoted key, single quotes, trailing comma, hex and octal, an expression, arbitrary code):
    new Function accepted all 6 and the code really ran (globalThis was modified)
    native JSON.parse and this parser rejected all 6

  "__proto__": {"__proto__":{"polluted":true}} -> an own key, parsed.polluted is undefined, Object.prototype clean
               a naive obj[key] = value on the same key makes the object INHERIT polluted (true)

  what differs from native (on purpose): the error message text
    {"a":1,}   native "Expected double-quoted property name in JSON at position 7 (line 1 column 8)"
               ours   "Expected a double-quoted property name at position 7"
    tru        native "Unexpected end of JSON input"     ours "Unexpected token t at position 0"

  limits and speed (timings vary by machine):
    nesting depth 5,011 parses, by 5,050 it throws RangeError; native handled 1,000,000
    a 3.80 MB document: native 56.7 ms, this parser 662.4 ms (11.7x slower), identical result
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="evaluating the text as code accepts things that are not JSON and can run them, while a recursive descent parser with one function per grammar rule reads characters one by one and can only ever produce data or throw a syntax error">
  <defs>
    <marker id="jsonparse-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Parse the grammar, never evaluate the text</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">eval or new Function</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">accepts non-JSON and runs code</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">one function per grammar rule</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">only data or a SyntaxError comes out</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">value, object, array, string, number, then the reviver as a separate bottom-up walk</text>
</svg>

## 5. Complexity

Time O(n) in the length of the text: every character is examined a constant number of times, and string contents are copied in slices rather than one character at a time. Space O(d) for the recursion (nesting depth \`d\`) plus the size of the result. The recursion is also the limit: this parser overflowed the call stack between nesting depths 5,011 and 5,050 on this Node, where the native parser handled a million.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Leading zero (\`01\`), \`+1\`, \`.5\`, \`5.\`, \`1e\` | \`SyntaxError\` | The number grammar allows none of them |
| Trailing comma (\`[1,]\`, \`{"a":1,}\`) | \`SyntaxError\` | After a comma a value or key is required |
| Single quotes, unquoted keys, comments | \`SyntaxError\` | Not JSON |
| Raw tab or newline inside a string | \`SyntaxError\` | Characters below U+0020 must be escaped |
| Bad escape (\`\\x41\`) or short unicode escape (\`\\u12\`) | \`SyntaxError\` | Only eight short escapes exist; \`\\u\` needs four hex digits |
| Lone surrogate escape (\`"\\ud800"\`) | Accepted | JSON allows it, like the native parser |
| Duplicate keys | Last value wins, first position kept | \`defineProperty\` on an existing key keeps its place |
| Key \`__proto__\` | Ordinary own property | \`defineProperty\`, not assignment |
| Integer-like keys | Come out in ascending numeric order | The engine orders them, not the text |
| \`1e999\`, \`-0\` | \`Infinity\`, \`-0\` | \`Number()\` of the validated slice |
| Text after the value, or empty text | \`SyntaxError\` | The end-of-input check |

## 7. Common Pitfalls

- **\`eval\` or \`new Function\`.** Accepts non-JSON (all six probes) and executes code (a probe modified \`globalThis\`). Never evaluate untrusted text.
- **Validating with a regex, then evaluating.** One gap in the regex is a code-execution hole; parse the grammar instead.
- **Assigning with \`obj[key] = value\`.** For the key \`__proto__\` it changes the object's prototype; the object then inherits the parsed properties (measured), which is how prototype-pollution bugs start. Use \`defineProperty\`.
- **Being lenient by accident.** Using \`Number()\` or \`parseFloat\` on an unvalidated slice accepts \`0x10\`, \`1e\`, and leading zeros; validate the number grammar first and convert only the exact slice.
- **Forgetting the control-character rule.** A raw tab or newline inside a string must be rejected (all 32 characters below U+0020 were checked).
- **Building strings one character at a time.** Copy plain runs with \`slice\`; the parser is already 11.7x slower than the native one on a large document.
- **Assuming the reviver runs top-down.** It runs bottom-up, children first, and the root last with the key \`""\` and \`this\` bound to a wrapper \`{ "": value }\`.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Exactly JSON: no trailing commas, single quotes or comments; SyntaxError on bad input; support the reviver; parse without eval. Right?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eval</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Function</code> on the text. It accepts non-JSON and runs code, so it is not an option for untrusted input."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"Being exactly as strict as the grammar: numbers, string escapes, control characters, trailing commas, and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__proto__</code> key."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"One function per rule with a shared index. Value dispatches on one character, object and array loop on comma or closer, string slices runs and decodes escapes, number follows the grammar by hand, then a bottom-up reviver walk."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">01</code>, a trailing comma, a raw tab in a string, a short unicode escape, a lone surrogate escape, duplicate keys, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__proto__</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not eval, or a regex check followed by eval?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Function</code> accepted all six non-JSON probes and really ran a statement that modified <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">globalThis</code>. A regex gate in front is fragile: one gap is a code-execution hole. Parsing the grammar means only data or a SyntaxError can come out.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why defineProperty for object keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj["__proto__"] = value</code> sets the prototype instead of creating a key: the naive object inherited <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">polluted</code> in the run. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineProperty</code> makes an ordinary own property, exactly like the native parser.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you remove the recursion limit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use an explicit stack of containers being filled instead of recursive calls, the same idea as this bank's iterative flatten question. This version overflowed between nesting depths 5,011 and 5,050; the native parser handled 1,000,000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it so much slower than the built-in, and what would you optimise?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The built-in is native code: 56.7 ms against 662.4 ms on a 3.80 MB document (11.7 times). Things to try in JavaScript are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">charCodeAt</code> instead of one-character strings and fewer slices, but measure before trusting any of it; that is not tested here.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the reviver work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It runs after parsing as a bottom-up walk: children first, the root last with the key <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> set to a wrapper <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ "": value }</code>; returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> deletes the key. The call order for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{"a":[1,{"b":2}],"c":3}</code> was 0 b 1 a c (root), identical to native.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Recursive descent** | Parsing by writing one function per grammar rule, each calling the rules it contains |
| **Production** | One rule of the grammar, such as "value" or "object" |
| **Reviver** | A callback that can replace or delete every parsed value, children before parents |
| **Prototype pollution** | Injecting properties into an object's prototype through a key such as \`__proto__\` |

---
**Conclusion:** a safe \`JSON.parse\` never evaluates its input. It reads the text with one function per grammar rule (value, object, array, string, number), rejects everything outside the strict grammar with a \`SyntaxError\`, builds objects with \`defineProperty\` so \`__proto__\` stays a plain key, and applies the reviver in a separate bottom-up walk. It agreed with the native parser on every one of 813,615 short strings, all 65,536 code units in three positions, 300,000 random documents and corruptions, and 120,000 reviver runs. Its costs are honest: it is recursive (overflowing near nesting depth 5,000 where native does not) and about 11.7 times slower than the built-in.`,
    examples: [
      {
        label: "Real, direct proof: the parser rejects and accepts exactly like the native JSON.parse on exhaustive, code-unit and random inputs, never evaluates text, and keeps __proto__ a plain key",
        tech: "javascript",
        runnable: true,
        code: `function jsonParse(text, reviver) {
  const src = String(text);
  let i = 0;

  const fail = (msg) => { throw new SyntaxError(msg + " at position " + i); };
  const isDigit = (c) => c >= "0" && c <= "9";
  const skipWs = () => {
    while (src[i] === " " || src[i] === "\\t" || src[i] === "\\n" || src[i] === "\\r") i++;
  };
  const define = (obj, key, value) =>
    Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });

  const ESCAPES = { '"': '"', "\\\\": "\\\\", "/": "/", b: "\\b", f: "\\f", n: "\\n", r: "\\r", t: "\\t" };

  function parseValue() {
    skipWs();
    const c = src[i];
    if (c === "{") return parseObject();
    if (c === "[") return parseArray();
    if (c === '"') return parseString();
    if (c === "-" || isDigit(c)) return parseNumber();
    if (src.startsWith("true", i)) { i += 4; return true; }
    if (src.startsWith("false", i)) { i += 5; return false; }
    if (src.startsWith("null", i)) { i += 4; return null; }
    return fail(c === undefined ? "Unexpected end of JSON input" : "Unexpected token " + c);
  }

  function parseObject() {
    i++;                                            // {
    const obj = {};
    skipWs();
    if (src[i] === "}") { i++; return obj; }
    for (;;) {
      skipWs();
      if (src[i] !== '"') fail("Expected a double-quoted property name");
      const key = parseString();
      skipWs();
      if (src[i] !== ":") fail("Expected ':' after property name");
      i++;
      define(obj, key, parseValue());               // own data property, even for "__proto__"
      skipWs();
      if (src[i] === ",") { i++; continue; }
      if (src[i] === "}") { i++; return obj; }
      fail("Expected ',' or '}' after property value");
    }
  }

  function parseArray() {
    i++;                                            // [
    const arr = [];
    skipWs();
    if (src[i] === "]") { i++; return arr; }
    for (;;) {
      arr.push(parseValue());
      skipWs();
      if (src[i] === ",") { i++; continue; }
      if (src[i] === "]") { i++; return arr; }
      fail("Expected ',' or ']' after array element");
    }
  }

  function parseString() {
    i++;                                            // opening quote
    let out = "";
    let chunk = i;                                  // start of the plain run we have not copied yet
    for (;;) {
      if (i >= src.length) fail("Unterminated string");
      const ch = src[i];
      if (ch === '"') { out += src.slice(chunk, i); i++; return out; }
      if (ch < " ") fail("Bad control character in string literal");
      if (ch === "\\\\") {
        out += src.slice(chunk, i);
        i++;
        const e = src[i];
        if (e === "u") {
          const hex = src.slice(i + 1, i + 5);
          if (hex.length < 4 || !/^[0-9a-fA-F]{4}$/.test(hex)) fail("Bad Unicode escape");
          out += String.fromCharCode(parseInt(hex, 16));
          i += 5;
        } else if (Object.hasOwn(ESCAPES, e)) {
          out += ESCAPES[e];
          i++;
        } else {
          fail("Bad escaped character");
        }
        chunk = i;
      } else {
        i++;
      }
    }
  }

  function parseNumber() {
    const start = i;
    if (src[i] === "-") i++;
    if (src[i] === "0") i++;                        // a leading zero cannot be followed by more digits
    else if (isDigit(src[i])) while (isDigit(src[i])) i++;
    else fail("No number after minus sign");
    if (src[i] === ".") {
      i++;
      if (!isDigit(src[i])) fail("Unterminated fractional number");
      while (isDigit(src[i])) i++;
    }
    if (src[i] === "e" || src[i] === "E") {
      i++;
      if (src[i] === "+" || src[i] === "-") i++;
      if (!isDigit(src[i])) fail("Exponent part is missing a number");
      while (isDigit(src[i])) i++;
    }
    return Number(src.slice(start, i));
  }

  const result = parseValue();
  skipWs();
  if (i < src.length) fail("Unexpected non-whitespace character after JSON");

  if (typeof reviver !== "function") return result;

  function walk(holder, key) {                      // bottom-up, like the spec InternalizeJSONProperty
    const value = holder[key];
    if (value !== null && typeof value === "object") {
      for (const k of Object.keys(value)) {
        const next = walk(value, k);
        if (next === undefined) delete value[k];
        else define(value, k, next);
      }
    }
    return reviver.call(holder, key, value);
  }
  return walk({ "": result }, "");
}

const attempt = (fn) => { try { return { ok: true, value: fn() }; } catch (e) { return { ok: false, err: e }; } };
function same(a, b) {
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== "object") return Object.is(a, b);
  if (Array.isArray(a) !== Array.isArray(b) || Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  const ka = Reflect.ownKeys(a), kb = Reflect.ownKeys(b);
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && same(a[k], b[k]));
}
// agree(): does the polyfill accept or reject exactly like the native JSON.parse, and return an identical value?
function agree(text, reviver) {
  const n = attempt(() => JSON.parse(text, reviver)), o = attempt(() => jsonParse(text, reviver));
  if (n.ok !== o.ok) return { agree: false };
  if (n.ok) return { agree: same(n.value, o.value), accepted: true };
  return { agree: n.err instanceof SyntaxError && o.err instanceof SyntaxError, accepted: false };
}
const chr = (...codes) => String.fromCharCode(...codes);
const NBSP = chr(0xa0), LINE_SEP = chr(0x2028), NUL_US = chr(0, 0x1f), SOH = chr(1), LONE = chr(0xd800), SMILEY = chr(0xd83d, 0xde00), NIHON = chr(0x65e5, 0x672c);

// 1. what it does
console.log("value:", JSON.stringify(jsonParse('{"a":[1,2.5,-3e2,true,null],"b":{"c":"x\\\\ny \\\\u00e9 \\\\ud83d\\\\ude00"}}')));
console.log("primitives at the top level:", jsonParse("42"), jsonParse('"s"'), jsonParse("true"), jsonParse("null"), "| -0 kept:", Object.is(jsonParse("-0"), -0), "| 1e999:", jsonParse("1e999"));
console.log("duplicate keys, last wins but keeps the first position:", JSON.stringify(jsonParse('{"b":1,"a":2,"b":3}')));
console.log("integer-like keys are ordered by the engine, not by the text:", Object.keys(jsonParse('{"b":1,"2":1,"a":1,"1":1}')).join(","));

// 2. the grammar is strict: everything below is NOT JSON, and each one is rejected exactly like the native parser
const invalid = ["", "01", "+1", ".5", "5.", "1e", "0x10", "NaN", "Infinity", "undefined", "[1,]", "[,1]", '{"a":1,}', "{a:1}", "{'a':1}", "'a'", '"tab' + chr(9) + 'here"', '"\\\\x41"', '"\\\\u12"', "[1] [2]", "// c\\n1", "/* c */1", NBSP + "1", "tru", "truee"];
console.log("invalid inputs rejected by both (" + invalid.length + "):", invalid.every((t) => !attempt(() => JSON.parse(t)).ok && !attempt(() => jsonParse(t)).ok));
console.log("error example:", attempt(() => jsonParse('{"a":1,}')).err.constructor.name + ": " + attempt(() => jsonParse('{"a":1,}')).err.message);

// 3. the reviver: bottom-up, this = the holder, undefined deletes, and it can rebuild richer types
const order = [];
jsonParse('{"a":[1,{"b":2}],"c":3}', function (k, v) { order.push(k === "" ? "(root)" : k); return v; });
const nativeOrder = [];
JSON.parse('{"a":[1,{"b":2}],"c":3}', function (k, v) { nativeOrder.push(k === "" ? "(root)" : k); return v; });
console.log("reviver call order:", order.join(" "), "| same as native:", order.join(" ") === nativeOrder.join(" "));
console.log("reviver deletes with undefined:", JSON.stringify(jsonParse('{"keep":1,"drop":2,"nested":{"drop":3,"ok":4}}', (k, v) => (k === "drop" ? undefined : v))));
const revived = jsonParse('{"when":"2026-01-15T10:30:00.000Z","n":1}', (k, v) => (typeof v === "string" && /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(v) ? new Date(v) : v));
console.log("reviver builds a Date:", revived.when instanceof Date, revived.when.toISOString());

// 4. security: the parser never evaluates anything, and "__proto__" stays an ordinary key
const evalStyle = (t) => new Function("return (" + t + ")")();
const attacks = [["{a:1}", "unquoted key"], ["{'a':1}", "single quotes"], ['{"a":1,}', "trailing comma"], ["[0x10, 010]", "hex and octal"], ["[1,2].map(x => x * 2)", "an expression"], ['(globalThis.__ran = "yes", {"a":1})', "arbitrary code"]];
for (const [text, what] of attacks) {
  console.log(what.padEnd(16), "| new Function accepts:", attempt(() => evalStyle(text)).ok, "| JSON.parse:", attempt(() => JSON.parse(text)).ok, "| ours:", attempt(() => jsonParse(text)).ok);
}
console.log("code smuggled through new Function ran:", globalThis.__ran === "yes");
delete globalThis.__ran;
const parsed = jsonParse('{"__proto__":{"polluted":true},"ok":1}');
const naive = {}; naive["__proto__"] = { polluted: true };
console.log("__proto__ is an own key:", Object.hasOwn(parsed, "__proto__"), "| does not pollute the object:", parsed.polluted, "| Object.prototype clean:", ({}).polluted, "| a naive obj[key] = value DOES:", naive.polluted);

// 5. equivalence with the native parser
const corpus = ["0", "-0", "1.5", "1e3", "1E-3", "123456789012345678901234567890", "5e-324", "1e-400", "true", "false", "null", '""', "[]", "{}", ' \\t\\n\\r[ 1 , 2 ]\\r\\n ', "01", "-01", "--1", "1e+", '{"a" 1}', '"a', '"a\\nb"', '"\\\\"', "1" + LINE_SEP, '"' + LINE_SEP + '"', '{"__proto__":{"x":1}}', '{"2":1,"1":2,"b":3,"a":4}', '["\\\\ud800"]', "[1 2]", '{"a":tru}'];
console.log("fixed corpus (" + corpus.length + "): mismatches", corpus.filter((t) => !agree(t).agree).length);

const alphabet = ["[", "]", "{", "}", ",", ":", '"', "0", "1", "-"];
let strings = 0, accepted = 0, mismatch = 0;
(function grow(prefix, left) {
  strings++;
  const r = agree(prefix);
  if (r.accepted) accepted++;
  if (!r.agree) mismatch++;
  if (left) for (const c of alphabet) grow(prefix + c, left - 1);
})("", 4);
console.log("every string up to length 4 over " + alphabet.length + " characters (" + strings + " strings, " + accepted + " valid): mismatches", mismatch);

let raw = 0, rawOk = 0, esc = 0, escOk = 0, escTried = 0, uni = 0, uniTried = 0;
for (let c = 0; c < 65536; c++) {
  const ch = String.fromCharCode(c);
  const r = agree('"' + ch + '"');
  if (!r.agree) raw++; else if (r.accepted) rawOk++;
  if (c < 128 || c % 251 === 0) { escTried++; const e = agree('"\\\\' + ch + '"'); if (!e.agree) esc++; else if (e.accepted) escOk++; }
  if (c % 61 === 0) { uniTried++; if (!agree('"\\\\u' + c.toString(16).padStart(4, "0").toUpperCase() + '"').agree) uni++; }
}
console.log("every one of the 65,536 code units inside quotes: mismatches", raw, "(" + rawOk + " accepted) | after a backslash (" + escTried + " tried): mismatches", esc, "(" + escOk + " accepted) | as a unicode escape (" + uniTried + " tried): mismatches", uni);

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20260921), pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const stringPool = ["", "a", 'quote"in', "back\\\\slash", "line\\nbreak", NUL_US, LINE_SEP, LONE, SMILEY, NIHON, "/"];
function randValue(depth) {
  const r = rnd();
  if (depth > 3 || r < 0.35) return pick([null, true, false, Math.floor(rnd() * 2000) - 1000, (rnd() - 0.5) * 10 ** Math.floor(rnd() * 30 - 10), 0, -0, 1e21, 5e-324, ...stringPool]);
  if (r < 0.65) return Array.from({ length: Math.floor(rnd() * 5) }, () => randValue(depth + 1));
  const o = {};
  for (let i = 0, n = Math.floor(rnd() * 5); i < n; i++) Object.defineProperty(o, pick(["a", "b", "10", "2", "__proto__", "", "key with space"]), { value: randValue(depth + 1), enumerable: true, writable: true, configurable: true });
  return o;
}
const noise = ["[", "]", "{", "}", ",", ":", '"', "\\\\", "0", "9", "-", "+", ".", "e", " ", "\\n", SOH, NBSP, "t", "n", "u", "'", "/"];
function mutate(t) {
  for (let k = 0, ops = 1 + Math.floor(rnd() * 3); k < ops && t.length; k++) {
    const p = Math.floor(rnd() * t.length), m = Math.floor(rnd() * 5);
    t = m === 0 ? t.slice(0, p) + t.slice(p + 1)
      : m === 1 ? t.slice(0, p) + pick(noise) + t.slice(p)
      : m === 2 ? t.slice(0, p) + pick(noise) + t.slice(p + 1)
      : m === 3 ? t.slice(0, p) : t + pick(noise);
  }
  return t;
}
let docs = 0, docBad = 0, muts = 0, mutAccepted = 0, mutBad = 0;
for (let n = 0; n < 3000; n++) {
  const text = JSON.stringify(randValue(0));
  docs++;
  if (!agree(text).agree) docBad++;
  for (let m = 0; m < 4; m++) { const r = agree(mutate(text)); muts++; if (r.accepted) mutAccepted++; if (!r.agree) mutBad++; }
}
console.log("random valid documents (" + docs + "): mismatches", docBad, "| random corruptions (" + muts + ", " + mutAccepted + " still valid): mismatches", mutBad);

let revBad = 0;
for (let n = 0; n < 2000; n++) {
  const text = JSON.stringify(randValue(0));
  for (const make of [() => (k, v) => (typeof v === "number" ? v * 2 : v), () => (k, v) => (typeof v === "string" ? undefined : v), () => (k, v) => (k === "a" ? undefined : v)]) {
    if (!agree(text, make()).agree) revBad++;
  }
}
console.log("6,000 reviver runs against the native parser: mismatches", revBad);

// 6. limits: it is recursive, so very deep nesting overflows the call stack where the native parser does not
for (const depth of [1000, 100000]) {
  const text = "[".repeat(depth) + "]".repeat(depth);
  console.log("nesting depth", depth, "| native:", attempt(() => JSON.parse(text)).ok ? "ok" : "RangeError", "| ours:", attempt(() => jsonParse(text)).ok ? "ok" : "RangeError");
}
const big = JSON.stringify(Array.from({ length: 5000 }, (_, i) => ({ id: i, name: "user " + i, score: i * 1.5, tags: ["a", "b"], ok: i % 2 === 0, note: 'some "quoted" text\\nwith escapes' })));
const time = (fn) => { fn(); const ts = []; for (let i = 0; i < 5; i++) { const t = Date.now(); fn(); ts.push(Date.now() - t); } return ts.sort((a, b) => a - b)[2]; };
console.log("a " + (big.length / 1000).toFixed(0) + " KB document: native", time(() => JSON.parse(big)), "ms | ours", time(() => jsonParse(big)), "ms (both vary by machine; the polyfill is many times slower) | identical result:", same(JSON.parse(big), jsonParse(big)));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "JSON.stringify Polyfill",
    seoDescription: "A full JSON.stringify (toJSON, replacer, space, cycles) matched the native one on 150,000 random inputs and all 65,536 code units, with zero mismatches.",
    description: `**Problem, as an interviewer would state it:**
"Implement a basic version of \`JSON.stringify\`. Discuss edge cases, runtime, and alternatives."

**Examples:**

\`\`\`
jsonStringify({ a: 1, b: undefined, c: [undefined, NaN, new Date(0)] });   // '{"a":1,"c":[null,null,"1970-01-01T00:00:00.000Z"]}'
jsonStringify({ a: [1, { b: 2 }] }, null, 2);                              // pretty-printed with 2 spaces
jsonStringify(circular);                                                    // throws TypeError
\`\`\`

**Clarifying questions expected:**
- How much of the contract: \`toJSON\`, the replacer function and array, \`space\`?
- What happens to \`undefined\`, functions, symbols, \`NaN\`, \`BigInt\` and circular structures?
- Which keys are included, and in what order?

**Code / implementation expected:** Yes — real code, checked against the native \`JSON.stringify\` on many inputs.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** "a basic \`JSON.stringify\`" hides a dozen rules, so this one implements the full contract (\`toJSON\`, replacer function, replacer array, \`space\`, cycle detection, string escaping) and was fuzzed against the native function: 150,000 random \`(value, replacer, space)\` triples (132,751 produced text, 8,534 produced \`undefined\`, 8,715 threw), the call sequence of 30,000 replacer runs, every one of the 65,536 UTF-16 code units alone and next to a surrogate, and 200,000 random numbers. Zero mismatches. Each classic mistake was also reproduced, so the pitfalls below are observed, not assumed.

## 1. The problem, restated

Write \`jsonStringify(value, replacer, space)\` that returns JSON text (or \`undefined\`) exactly like the built-in: values that JSON cannot represent are omitted, turned into \`null\`, or rejected; objects may customise themselves with \`toJSON\`; a replacer function or key list can filter and transform; \`space\` pretty-prints; and a circular structure is an error, not an infinite loop.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| How much of the contract? | Basic: values, arrays, objects, strings. Full: also \`toJSON\`, both replacer forms, \`space\`, cycle detection, escaping. This solution does the full contract. |
| What about \`undefined\`, functions, symbols? | Omitted inside objects, \`null\` inside arrays, and the whole result is \`undefined\` at the top level. |
| Numbers? | \`NaN\`, \`Infinity\` and \`-Infinity\` become \`null\`; \`-0\` becomes \`0\`. |
| Unsupported values? | A \`BigInt\` throws a \`TypeError\` (unless it has a \`toJSON\`), a cycle throws a \`TypeError\`. |
| Which keys? | Own enumerable string keys in the same order as \`Object.keys\`; symbol keys and non-enumerable keys are skipped. |

## 3. Thought process

The naive version is a \`typeof\` switch that concatenates strings. It is correct on the demo input and wrong on the rules that matter:

- **Order of the hooks.** \`toJSON\` runs first, then the replacer function, then unwrapping of boxed primitives (\`new Number(3)\` becomes \`3\`). Swapping the first two changes what the replacer sees: measured, a replacer running first sees a \`Date\` object where native gives it the already converted string.
- **The replacer function** is called for every value with \`this\` set to the holder, and the first call has the key \`""\` and a wrapper \`{ "": value }\`. A replacer **array** is an allow-list of keys for objects only (arrays are unaffected), it dedupes, converts numbers to strings, and, because it reads properties with a plain \`Get\`, it also finds inherited ones.
- **Omitting versus \`null\`.** A value that serialises to \`undefined\` (undefined, function, symbol) is skipped in an object but written as \`null\` in an array; so \`serialize\` returns \`undefined\` and the two callers decide.
- **Strings** need more than quotes and backslashes: the short escapes (\`\\n\`, \`\\t\`, ...), every other character below U+0020 as \`\\u00xx\`, and lone surrogates as \`\\udxxx\` so the output stays valid; U+2028 and U+2029 are not escaped. Escaping only the quote and the backslash produced text with a raw newline that \`JSON.parse\` rejects (measured).
- **Cycles.** Track the objects CURRENTLY being serialized (add on entry, remove on exit). A set that never forgets reports a merely shared reference as a cycle (measured: \`{x: shared, y: shared}\` threw).
- **Indentation.** \`space\` is a number (clamped to 10) or a string (first 10 characters), and empty \`{}\` and \`[]\` print without a line break.

## 4. Verified solution

\`\`\`js
function jsonStringify(value, replacer, space) {
  const ESC = { 8: "\\\\b", 9: "\\\\t", 10: "\\\\n", 12: "\\\\f", 13: "\\\\r", 34: '\\\\"', 92: "\\\\\\\\" };

  function quote(s) {
    let out = '"';
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i);
      if (ESC[code]) out += ESC[code];
      else if (code < 0x20) out += "\\\\u" + code.toString(16).padStart(4, "0");
      else if (code >= 0xd800 && code <= 0xdfff) {
        const next = s.charCodeAt(i + 1);
        if (code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) { out += s[i] + s[i + 1]; i++; }
        else out += "\\\\u" + code.toString(16);            // lone surrogate stays valid JSON text
      } else out += s[i];
    }
    return out + '"';
  }

  // indentation: a number (max 10 spaces) or a string (first 10 characters)
  if (space instanceof Number) space = Number(space);
  else if (space instanceof String) space = String(space);
  const gap = typeof space === "number" ? " ".repeat(Math.max(0, Math.min(10, Math.floor(space))))
    : typeof space === "string" ? space.slice(0, 10) : "";

  // replacer: a function is called for every value; an array is an allow-list of keys
  const replacerFn = typeof replacer === "function" ? replacer : null;
  let allow = null;
  if (!replacerFn && Array.isArray(replacer)) {
    allow = [];
    for (const item of replacer) {
      const key = typeof item === "string" || typeof item === "number" || item instanceof String || item instanceof Number
        ? String(item) : undefined;
      if (key !== undefined && !allow.includes(key)) allow.push(key);
    }
  }

  const path = new Set();                                  // objects currently being serialized

  function serialize(holder, key, indent) {
    let v = holder[key];
    if ((typeof v === "object" && v !== null) || typeof v === "bigint") {
      if (typeof v.toJSON === "function") v = v.toJSON(key);   // toJSON runs BEFORE the replacer
    }
    if (replacerFn) v = replacerFn.call(holder, key, v);
    if (typeof v === "object" && v !== null) {               // unwrap new Number(1), new String("a"), ...
      if (v instanceof Number) v = Number(v);
      else if (v instanceof String) v = String(v);
      else if (v instanceof Boolean || v instanceof BigInt) v = v.valueOf();
    }
    if (v === null) return "null";
    if (v === true) return "true";
    if (v === false) return "false";
    if (typeof v === "string") return quote(v);
    if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
    if (typeof v === "bigint") throw new TypeError("Do not know how to serialize a BigInt");
    if (typeof v !== "object") return undefined;             // undefined, function, symbol: skipped
    if (path.has(v)) throw new TypeError("Converting circular structure to JSON");
    path.add(v);
    const inner = indent + gap;
    const parts = [];
    let open, close;
    if (Array.isArray(v)) {
      open = "["; close = "]";
      for (let i = 0; i < v.length; i++) parts.push(serialize(v, String(i), inner) ?? "null");
    } else {
      open = "{"; close = "}";
      for (const k of allow ?? Object.keys(v)) {
        const s = serialize(v, k, inner);
        if (s !== undefined) parts.push(quote(k) + (gap ? ": " : ":") + s);
      }
    }
    path.delete(v);
    if (parts.length === 0) return open + close;
    return gap === "" ? open + parts.join(",") + close
      : open + "\\n" + inner + parts.join(",\\n" + inner) + "\\n" + indent + close;
  }

  return serialize({ "": value }, "", "");
}
\`\`\`

\`\`\`
real, verified output (Node v24.19.0), compared with the native JSON.stringify:

  150,000 random (value, replacer, space) triples: 132,751 texts, 8,534 undefined results, 8,715 exceptions  -> 0 mismatches
    values: undefined, functions, symbols, NaN, Infinity, -0, BigInt, Dates (valid and invalid), boxed primitives,
    Map, Set, typed arrays, RegExp, Error, class instances with inherited properties, arrays with holes and extra
    properties, symbol and non-enumerable keys, getters, toJSON on values and on objects, lone surrogates
    replacers: 18 variants incl. functions that drop, wrap or upper-case values, and key lists with duplicates, numbers, boxed values, empties
    space: numbers (0, 1, 2, 10, 11, 100, negative, 2.7, NaN, Infinity), strings (short and over 10 characters), boxed values, null, true, {}
  replacer call sequences (key, type, holder) on 30,000 values                   0 mismatches
  all 65,536 UTF-16 code units, alone and next to a surrogate                    0 mismatches
  200,000 random numbers                                                         0 mismatches

  a few of the rules, as printed by the example below:
    { a:1, b:undefined, c(){}, d:Symbol(), e:2 }      {"a":1,"e":2}
    [1, undefined, function(){}, Symbol(), 2]          [1,null,null,null,2]
    [NaN, Infinity, -Infinity, -0, 1e21, 1e-7]         [null,null,null,0,1e+21,1e-7]
    { n: 10n }                                         TypeError (with a toJSON on BigInt.prototype: {"n":"10n"})
    { ok: new Date(0), bad: new Date(NaN) }            {"ok":"1970-01-01T00:00:00.000Z","bad":null}
    [new Map, new Set, /x/g, new Error("e")]           [{},{},{},{}]
    call order for { when: { toJSON } } with a replacer   replacer:"" > toJSON:when > replacer:"when", identical to native
    { a:1, b:{ a:2, c:3 }, c:4 } with ["a","b"]        {"a":1,"b":{"a":2}}
    { a:1, b:2, 1:"one" } with ["b","a","a",1]         {"b":2,"a":1,"1":"one"}
    space 100 clamps to 10 spaces; space "--" indents with --; space 2.7 is 2
    "lone surrogates": "\\ud800|\\udc00|(a real pair, untouched)|\\ud83d"     valid JSON that parses back
    a cycle: TypeError     a shared reference: {"x":{"s":1},"y":{"s":1},"z":[{"s":1},{"s":1}]}

  the classic mistakes, measured:
    a Date when toJSON is ignored                      {"d":{}}          (native: the ISO string)
    replacer called before toJSON                      the replacer sees a Date instead of the string
    escaping only the quote and the backslash          text with a raw newline, JSON.parse throws SyntaxError
    a path set that is never cleared                   TypeError "Converting circular structure to JSON" on a shared reference
    NaN written as text                                NaN, which JSON.parse rejects

  limits and speed (timings vary by machine):
    nesting depth: native OK up to about 4,764 levels, this version about 3,792; both throw RangeError beyond
    a 3.80 MB document: native 37.9 ms, this version 294.6 ms (7.8x slower), identical text
    the error message for a cycle differs from native (native adds a description of the loop); only the class is compared
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="every value goes through the same steps in order: toJSON first, then the replacer function, then unwrapping of boxed primitives, then a switch on the type where undefined, functions and symbols return nothing so objects skip them and arrays write null">
  <defs>
    <marker id="jsonstringify-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">The same steps, in the same order, for every value</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">toJSON, replacer, unwrap</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">in this order, or the replacer sees the wrong thing</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">nothing to write: undefined</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">objects skip it, arrays write null</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a path set (add on entry, remove on exit) separates a cycle from a shared reference</text>
</svg>

## 5. Complexity

Time O(n) in the size of the output plus the size of the input structure: each value is visited once and string escaping is linear in the string. Space O(d) for the path set and recursion (nesting depth \`d\`) plus the output. The recursion is the practical limit: this version overflowed the stack near 3,792 levels and the native one near 4,764 on this Node.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Top-level \`undefined\`, function, symbol | Result is \`undefined\`, not a string | \`serialize\` returns \`undefined\` and nothing wraps it |
| \`undefined\` in an object versus an array | Omitted versus \`null\` | The object loop skips it, the array loop uses \`?? "null"\` |
| \`NaN\`, \`Infinity\`, \`-0\` | \`null\`, \`null\`, \`0\` | \`Number.isFinite\` check and \`String(-0)\` |
| \`BigInt\` | \`TypeError\` | No JSON form (unless a \`toJSON\` exists) |
| Invalid \`Date\` | \`null\` | Its \`toJSON\` returns \`null\` |
| Circular structure | \`TypeError\` | The value is already in the path set |
| Shared, non-circular reference | Serialized at each place | It leaves the path set on exit |
| Sparse array | Holes become \`null\` | The loop reads every index |
| Lone surrogate | \`\\udxxx\` escape | Keeps the output valid JSON |
| Replacer array | Allow-list for objects only, order and duplicates handled | Built once, applied where keys are enumerated |

## 7. Common Pitfalls

- **Ignoring \`toJSON\`.** A \`Date\` becomes \`{}\` instead of its ISO string (measured).
- **Calling the replacer before \`toJSON\`.** It then sees a \`Date\` object where native gives it a string.
- **Dropping \`undefined\` in arrays.** Native writes \`null\` there (\`[null,null]\` for \`[undefined, function(){}]\`), which keeps indices stable; only objects omit it.
- **Escaping only \`"\` and \`\\\`.** Control characters must be escaped too; a raw newline made the output invalid.
- **Writing \`NaN\` or \`Infinity\` as text.** They are not JSON; use \`null\`.
- **A global "seen" set for cycles.** It flags shared references as cycles; track only the objects on the current path.
- **Forgetting the wrapper.** The first replacer call has the key \`""\` and \`this\` is \`{ "": value }\`, which lets a replacer replace the whole value.
- **Trusting the polyfill on deep or huge data.** It overflowed near 3,792 levels and was 7.8x slower than the built-in.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"The full contract or a basic version? toJSON, replacer function and array, space? What happens to undefined, functions, NaN, BigInt and cycles?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof</code> switch that concatenates strings. It is right on the demo input and wrong on toJSON, key omission, escaping and cycles."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"The order of the hooks (toJSON, then replacer, then unwrap), omit-in-objects versus null-in-arrays, full string escaping, and cycle detection that still allows shared references."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">serialize(holder, key, indent)</code> that runs the hooks in order, returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> for nothing-to-write so the object loop skips it and the array loop writes null, with a path set for cycles."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"undefined at the top level, in an object and in an array; NaN and -0; a Date; a shared reference; a cycle; a lone surrogate; and space 100."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does toJSON run before the replacer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is the specification's order: the replacer receives the value after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toJSON</code> has converted it, so a Date reaches the replacer as its ISO string. With the order swapped the replacer saw a Date object (measured).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you tell a cycle from a shared reference?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track only the objects on the current path: add on entry, remove on exit. A set that was never cleared reported <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ x: shared, y: shared }</code> as a cycle (a TypeError) in the run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are undefined and functions skipped in objects but null in arrays?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An object can simply omit the key, but an array must keep its indices, so the element becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>; at the top level there is nothing to omit, so the result is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, not a string. Native gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[null,null]</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[undefined, function(){}]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code> for the object equivalent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the replacer array do differently from the function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is an allow-list of keys for objects (arrays are not filtered); it removes duplicates, converts numbers to strings, keeps its own order and, because it reads with a plain get, also finds inherited properties such as class prototype fields.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle BigInt?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By default it throws a TypeError, like the native function. Define <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt.prototype.toJSON</code> (the example returns a string ending in n) or use a replacer function that converts it; which representation is right depends on what the reader expects.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`toJSON\`** | A method an object can define to say what it should serialize as (\`Date\` has one) |
| **Replacer** | A function or key list that filters or transforms values while serializing |
| **Holder** | The object or array that contains the value currently being serialized |
| **Lone surrogate** | Half of a UTF-16 pair with no partner; JSON output escapes it |

---
**Conclusion:** a faithful \`JSON.stringify\` runs every value through the same ordered steps: \`toJSON\`, the replacer function, unwrapping of boxed primitives, then a switch on the type in which \`undefined\`, functions and symbols yield nothing (skipped in objects, \`null\` in arrays). Strings escape controls and lone surrogates, cycles are detected with a path set that is cleared on exit, and \`space\` is clamped to 10 characters. It matched the native function on 150,000 random triples, 30,000 replacer call sequences, all 65,536 code units and 200,000 numbers, and each classic mistake (ignoring \`toJSON\`, swapping the hooks, weak escaping, a forgetful path set, \`NaN\` as text) was reproduced and shown to break it. The built-in is still about 7.8 times faster, so this is for learning, not for replacing it.`,
    examples: [
      {
        label: "Real, direct proof: the polyfill matches the native JSON.stringify on random values, replacers and spaces, on every UTF-16 code unit, and prints each rule",
        tech: "javascript",
        runnable: true,
        code: `function jsonStringify(value, replacer, space) {
  const ESC = { 8: "\\\\b", 9: "\\\\t", 10: "\\\\n", 12: "\\\\f", 13: "\\\\r", 34: '\\\\"', 92: "\\\\\\\\" };

  function quote(s) {
    let out = '"';
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i);
      if (ESC[code]) out += ESC[code];
      else if (code < 0x20) out += "\\\\u" + code.toString(16).padStart(4, "0");
      else if (code >= 0xd800 && code <= 0xdfff) {
        const next = s.charCodeAt(i + 1);
        if (code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) { out += s[i] + s[i + 1]; i++; }
        else out += "\\\\u" + code.toString(16);            // lone surrogate stays valid JSON text
      } else out += s[i];
    }
    return out + '"';
  }

  // indentation: a number (max 10 spaces) or a string (first 10 characters)
  if (space instanceof Number) space = Number(space);
  else if (space instanceof String) space = String(space);
  const gap = typeof space === "number" ? " ".repeat(Math.max(0, Math.min(10, Math.floor(space))))
    : typeof space === "string" ? space.slice(0, 10) : "";

  // replacer: a function is called for every value; an array is an allow-list of keys
  const replacerFn = typeof replacer === "function" ? replacer : null;
  let allow = null;
  if (!replacerFn && Array.isArray(replacer)) {
    allow = [];
    for (const item of replacer) {
      const key = typeof item === "string" || typeof item === "number" || item instanceof String || item instanceof Number
        ? String(item) : undefined;
      if (key !== undefined && !allow.includes(key)) allow.push(key);
    }
  }

  const path = new Set();                                  // objects currently being serialized

  function serialize(holder, key, indent) {
    let v = holder[key];
    if ((typeof v === "object" && v !== null) || typeof v === "bigint") {
      if (typeof v.toJSON === "function") v = v.toJSON(key);   // toJSON runs BEFORE the replacer
    }
    if (replacerFn) v = replacerFn.call(holder, key, v);
    if (typeof v === "object" && v !== null) {               // unwrap new Number(1), new String("a"), ...
      if (v instanceof Number) v = Number(v);
      else if (v instanceof String) v = String(v);
      else if (v instanceof Boolean || v instanceof BigInt) v = v.valueOf();
    }
    if (v === null) return "null";
    if (v === true) return "true";
    if (v === false) return "false";
    if (typeof v === "string") return quote(v);
    if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
    if (typeof v === "bigint") throw new TypeError("Do not know how to serialize a BigInt");
    if (typeof v !== "object") return undefined;             // undefined, function, symbol: skipped
    if (path.has(v)) throw new TypeError("Converting circular structure to JSON");
    path.add(v);
    const inner = indent + gap;
    const parts = [];
    let open, close;
    if (Array.isArray(v)) {
      open = "["; close = "]";
      for (let i = 0; i < v.length; i++) parts.push(serialize(v, String(i), inner) ?? "null");
    } else {
      open = "{"; close = "}";
      for (const k of allow ?? Object.keys(v)) {
        const s = serialize(v, k, inner);
        if (s !== undefined) parts.push(quote(k) + (gap ? ": " : ":") + s);
      }
    }
    path.delete(v);
    if (parts.length === 0) return open + close;
    return gap === "" ? open + parts.join(",") + close
      : open + "\\n" + inner + parts.join(",\\n" + inner) + "\\n" + indent + close;
  }

  return serialize({ "": value }, "", "");
}

const attempt = (fn) => { try { return { ok: true, value: fn() }; } catch (e) { return { ok: false, err: e }; } };
const chr = (...codes) => String.fromCharCode(...codes);
const both = (label, ...args) => {
  const n = attempt(() => JSON.stringify(...args)), o = attempt(() => jsonStringify(...args));
  const fmt = (r) => (r.ok ? String(r.value) : r.err.constructor.name);
  console.log(label.padEnd(44), fmt(o), fmt(n) === fmt(o) ? "" : "   <-- DIFFERENT from native: " + fmt(n));
};

// 1. values JSON cannot represent are dropped, nulled or rejected
both("top level undefined / function / symbol:", undefined);
both("in an object (omitted):", { a: 1, b: undefined, c() {}, d: Symbol("s"), e: 2 });
both("in an array (become null):", [1, undefined, function () {}, Symbol("s"), 2]);
both("NaN, Infinity, -Infinity, -0:", [NaN, Infinity, -Infinity, -0, 1e21, 1e-7]);
both("BigInt (no representation, so a TypeError):", { n: 10n });
BigInt.prototype.toJSON = function () { return this.toString() + "n"; };
both("BigInt with a toJSON of your own:", { n: 10n });
delete BigInt.prototype.toJSON;
both("Date (toJSON) and an invalid Date:", { ok: new Date(0), bad: new Date(NaN) });
both("Map, Set, RegExp, Error become {}:", [new Map([[1, 2]]), new Set([1]), /x/g, new Error("e")]);
both("boxed primitives are unwrapped:", [new Number(3), new String("s"), new Boolean(false)]);
both("symbol keys and non-enumerable keys are skipped:", Object.defineProperty({ [Symbol("k")]: 1, shown: 2 }, "hidden", { value: 3, enumerable: false }));
both("typed arrays are objects with index keys:", new Uint8Array([1, 2]));
both("array holes and extra properties:", Object.assign([1, , 3], { extra: "ignored" }));

// 2. toJSON runs before the replacer; the replacer sees every value with this = its holder
const callLog = (stringify) => {
  const log = [];
  stringify({ when: { toJSON(key) { log.push("toJSON:" + key); return "T"; } } }, function (k, v) { log.push("replacer:" + JSON.stringify(k) + ":" + typeof v); return v; });
  return log.join(" > ");
};
console.log("call order, ours  :", callLog(jsonStringify));
console.log("call order, native:", callLog(JSON.stringify));
both("replacer function drops numbers:", { a: 1, b: "x", c: [2, "y"] }, (k, v) => (typeof v === "number" ? undefined : v));
both("replacer function wraps a key:", { a: 1, b: 2 }, (k, v) => (k === "b" ? { wrapped: v } : v));
both("replacer array is an allow-list for objects:", { a: 1, b: { a: 2, c: 3 }, c: 4 }, ["a", "b"]);
both("allow-list order, duplicates and numbers:", { a: 1, b: 2, 1: "one" }, ["b", "a", "a", 1]);
both("allow-list does not filter array elements:", { a: [{ a: 1, z: 2 }, 3] }, ["a"]);

// 3. indentation
both("space = 2:", { a: [1, { b: 2 }], c: {} , d: [] }, null, 2);
both("space = a string (first 10 characters):", { a: [1, 2] }, null, "--");
both("space = 100 is clamped to 10:", { a: 1 }, null, 100);
both("space = 2.7 (the fraction is dropped):", { a: 1 }, null, 2.7);
both("space = 0 or negative means no indentation:", { a: [1] }, null, -3);
both("space as a boxed Number:", [1], null, new Number(1));

// 4. strings
both("escapes and control characters:", 'quote" back\\\\slash new\\nline tab' + chr(9) + " bell" + chr(7) + " unit" + chr(0x1f));
both("lone surrogates are escaped, pairs are not:", chr(0xd800) + "|" + chr(0xdc00) + "|" + chr(0xd83d, 0xde00) + "|" + chr(0xd83d));
both("U+2028, U+2029 and slash are left alone:", chr(0x2028, 0x2029) + "/</script>");
console.log("the lone-surrogate output is valid JSON text that parses back:", jsonStringify(chr(0xd800)), "->", JSON.parse(jsonStringify(chr(0xd800))) === chr(0xd800));

// 5. cycles, sharing and getters
const loop = { name: "root" }; loop.self = loop;
both("a cycle throws a TypeError:", loop);
const shared = { s: 1 };
both("a shared reference is NOT a cycle:", { x: shared, y: shared, z: [shared, shared] });
both("getters run, inherited keys are skipped:", Object.assign(Object.create({ inherited: 1 }), { own: 2, get computed() { return "got"; } }));
class Point { constructor() { this.x = 1; } get magnitude() { return 5; } }
Point.prototype.viaProto = "not own";
both("class instance: own enumerable fields only:", new Point());
both("but an allow-list also finds inherited keys:", new Point(), ["x", "viaProto", "magnitude"]);

// 6. equivalence with the native serializer on random inputs
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(777), pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const stringPool = ["", "a", 'quote"in', "back\\\\slash", "line\\nbreak", chr(0, 1, 0x1f), chr(0x2028), chr(0xd800), chr(0xdc00) + "x", "a" + chr(0xd83d) + "z", chr(0xd83d, 0xde00), chr(0x65e5, 0x672c), "</script>"];
function randPrim() {
  switch (Math.floor(rnd() * 20)) {
    case 0: return null; case 1: return undefined; case 2: return true; case 3: return false;
    case 4: return Math.floor(rnd() * 2000) - 1000;
    case 5: return (rnd() - 0.5) * 10 ** Math.floor(rnd() * 30 - 10);
    case 6: return pick([NaN, Infinity, -Infinity, -0, 0, 1e21, 1e-7]);
    case 7: return function f() {}; case 8: return Symbol("s");
    case 9: return new Date(pick([0, 1700000000000, NaN]));
    case 10: return new Number(pick([1, NaN, -0])); case 11: return new String(pick(stringPool)); case 12: return new Boolean(false);
    case 13: return new Map([[1, 2]]); case 14: return new Set([1]); case 15: return new Uint8Array([1, 2]);
    case 16: return { toJSON(key) { return "toJSON got key:" + key; } };
    case 17: return 10n;
    default: return pick(stringPool);
  }
}
function randValue(depth) {
  if (depth > 3 || rnd() < 0.3) return randPrim();
  if (rnd() < 0.45) {
    const n = Math.floor(rnd() * 5), a = Array.from({ length: n }, () => randValue(depth + 1));
    if (rnd() < 0.15 && n) delete a[Math.floor(rnd() * n)];
    if (rnd() < 0.1) a.extra = "ignored";
    return a;
  }
  const o = {};
  for (let i = 0, n = Math.floor(rnd() * 5); i < n; i++) o[pick(["a", "b", "c", "10", "2", "1", "key with space", "q\\"uote", chr(10)])] = randValue(depth + 1);
  if (rnd() < 0.1) o[Symbol("k")] = 1;
  if (rnd() < 0.08) Object.defineProperty(o, "getter", { get() { return "got"; }, enumerable: true });
  if (rnd() < 0.05) o.toJSON = function (k) { return { replaced: k }; };
  return o;
}
const spaces = [undefined, 0, 1, 2, 4, 10, 11, -1, 2.7, NaN, "  ", "--", "abcdefghijklmnop", new Number(3), new String("xy"), null, true, {}];
const replacers = [() => undefined, () => (k, v) => v, () => (k, v) => (typeof v === "number" ? undefined : v), () => (k, v) => (typeof v === "string" ? v.toUpperCase() : v), () => function (k, v) { return k === "a" ? undefined : v; }, () => ["a", "b"], () => ["a", "a", 1, "1"], () => [], () => null];
let cases = 0, mismatches = 0;
const outcomes = { text: 0, undefined: 0, threw: 0 };
for (let n = 0; n < 20000; n++) {
  const value = randValue(0), space = pick(spaces), mk = pick(replacers);
  const a = attempt(() => JSON.stringify(value, mk(), space)), b = attempt(() => jsonStringify(value, mk(), space));
  cases++;
  outcomes[!a.ok ? "threw" : a.value === undefined ? "undefined" : "text"]++;
  if (a.ok !== b.ok || (a.ok ? a.value !== b.value : a.err.constructor !== b.err.constructor)) mismatches++;
}
console.log("20,000 random (value, replacer, space) triples:", JSON.stringify(outcomes), "| mismatches:", mismatches);

let callBad = 0;
for (let n = 0; n < 5000; n++) {
  const value = randValue(0);
  const make = () => { const log = []; return { log, fn: function (k, v) { log.push([k, typeof v, Array.isArray(this)]); return v; } }; };
  const x = make(), y = make();
  const rn = attempt(() => JSON.stringify(value, x.fn)), ro = attempt(() => jsonStringify(value, y.fn));
  if (rn.ok !== ro.ok || (rn.ok && rn.value !== ro.value) || JSON.stringify(x.log) !== JSON.stringify(y.log)) callBad++;
}
console.log("replacer call sequences on 5,000 values, mismatches:", callBad);

let strBad = 0;
for (let c = 0; c < 65536; c++) {
  const s = chr(c), s2 = "a" + s + "b", s3 = s + chr(0xdc00), s4 = chr(0xd83d) + s;
  if (JSON.stringify(s) !== jsonStringify(s) || JSON.stringify(s2) !== jsonStringify(s2) || JSON.stringify(s3) !== jsonStringify(s3) || JSON.stringify(s4) !== jsonStringify(s4)) strBad++;
}
console.log("every UTF-16 code unit, alone and next to a surrogate (262,144 strings), mismatches:", strBad);
let numBad = 0;
for (let n = 0; n < 50000; n++) {
  const x = rnd() < 0.5 ? (rnd() - 0.5) * 10 ** Math.floor(rnd() * 60 - 25) : Math.floor((rnd() - 0.5) * 2 ** Math.floor(rnd() * 60));
  if (JSON.stringify(x) !== jsonStringify(x)) numBad++;
}
console.log("50,000 random numbers, mismatches:", numBad);

// 7. limits
for (const depth of [1000, 10000]) {
  let deep = [];
  for (let i = 0; i < depth; i++) deep = [deep];
  console.log("nesting depth", depth, "| native:", attempt(() => JSON.stringify(deep)).ok ? "ok" : "RangeError", "| ours:", attempt(() => jsonStringify(deep)).ok ? "ok" : "RangeError");
}
const big = Array.from({ length: 5000 }, (_, i) => ({ id: i, name: "user " + i, score: i * 1.5, tags: ["a", "b"], ok: i % 2 === 0, note: 'some "quoted" text\\nwith escapes' }));
const time = (fn) => { fn(); const ts = []; for (let i = 0; i < 5; i++) { const t = Date.now(); fn(); ts.push(Date.now() - t); } return ts.sort((a, b) => a - b)[2]; };
console.log("a " + (JSON.stringify(big).length / 1000).toFixed(0) + " KB document: native", time(() => JSON.stringify(big)), "ms | ours", time(() => jsonStringify(big)), "ms (both vary by machine; the polyfill is several times slower) | identical text:", JSON.stringify(big) === jsonStringify(big));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement deepEqual(a, b) handling NaN, -0, Dates, RegExp & circular refs",
    seoDescription: "deepEqual (NaN, -0, Date, RegExp, Map, Set, cycles) differed from isDeepStrictEqual on 1 of 240,000 pairs, where Node erred; memoising fixes shared DAGs.",
    description: `**Problem, as an interviewer would state it:**
"Create \`isEqual\` (deep equality) that correctly handles \`NaN === NaN\`, \`-0\` versus \`+0\`, Dates, RegExps, arrays, plain objects, and circular references. Discuss edge cases, runtime, and alternatives."

**Examples:**

\`\`\`
deepEqual(NaN, NaN);                        // true   (=== says false)
deepEqual(0, -0);                           // false  (=== says true)
deepEqual({ a: [1, new Date(0)] }, { a: [1, new Date(0)] });   // true
const x = { v: 1 }; x.self = x;  const y = { v: 1 }; y.self = y;
deepEqual(x, y);                            // true, and it terminates
\`\`\`

**Clarifying questions expected:**
- Which equality for primitives (\`Object.is\`), and do prototypes and key order matter?
- Should \`Map\` and \`Set\` ignore order, and how are object members matched?
- What should two circular structures do, and how much data will it see?

**Code / implementation expected:** Yes — real code, checked against a trusted implementation and on cycles and shared structure.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** equality has no single right answer, so this doc first pins the semantics down, then checks them. \`deepEqual\` was compared with Node's \`util.isDeepStrictEqual\` on 240,000 pairs (each of 60,000 random graphs compared with itself, with its clone, with a clone that had exactly one change, and with an unrelated graph): 148,923 equal, 91,077 unequal, and ONE disagreement, where \`deepEqual\` gave the correct answer and \`isDeepStrictEqual\` did not. A second, memoised version fixes an exponential-time problem that both implementations have on shared structure.

## 1. The problem, restated

Write \`deepEqual(a, b)\` that decides whether two values are structurally the same. It must treat \`NaN\` as equal to \`NaN\`, tell \`+0\` from \`-0\`, compare \`Date\` by time, \`RegExp\` by pattern and flags, compare arrays, plain objects, \`Map\` and \`Set\`, and terminate on circular references. The semantics chosen here match \`assert.deepStrictEqual\`: primitives by \`Object.is\`, prototypes must match, own enumerable keys are compared (string and symbol), and key order does not matter.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Which equality for primitives? | \`Object.is\`: \`NaN\` equals \`NaN\`, \`+0\` does not equal \`-0\`. Node's \`assert.deepStrictEqual(0, -0)\` throws, while the loose \`assert.deepEqual(0, -0)\` does not (both checked). |
| Do prototypes matter? | Yes, in strict mode: \`new A()\` and \`new B()\` with the same fields are different, and so are \`{}\` and \`Object.create(null)\`. |
| Which keys count? | Own enumerable string and symbol keys, in any order. \`{a: undefined}\` is not \`{}\`, and a hole is not \`undefined\`. |
| Special types? | \`Date\` by time (two invalid dates are equal), \`RegExp\` by source, flags and \`lastIndex\`, boxed primitives by value, \`Error\` by name and message, \`Map\` and \`Set\` without regard to order, functions by reference. |
| Cycles? | A pair already being compared further up the stack counts as equal. Two cyclic graphs are equal when they unfold identically. |

## 3. Thought process

The tempting shortcuts fail measurably: \`a === b\` is reference equality (\`[1] === [1]\` is false), \`typeof x === "object"\` lets \`null\` in, and \`JSON.stringify(a) === JSON.stringify(b)\` returns false for objects that are equal but have a different key order, and true for \`{a: NaN}\` vs \`{a: null}\`, for \`{a: undefined}\` vs \`{}\`, for two \`Map\`s with different contents, and for a \`Date\` vs its ISO string. So the real solution recurses. Start with \`Object.is\` (it settles every primitive and identical-reference case), then require both sides to be objects with the same prototype and the same type tag. For each type compare what defines it (the time of a \`Date\`, the pattern of a \`RegExp\`, the value of a boxed primitive), then compare the own enumerable keys: same count, each key of \`x\` present in \`y\`, and the values equal by recursion. \`Map\` and \`Set\` need matching rather than position: primitive members are looked up directly, and object members are paired with an unused deep-equal member of the other side, each member used only once.

Cycles need a guard, and the detail that matters is its lifetime. Without one, two self-referencing objects recurse until the stack overflows (\`RangeError\`, checked). The guard is a record of the pairs CURRENTLY being compared on the stack: meeting a pair that is already in progress means we have gone around a cycle, so assume it is equal. The pair must be removed when its comparison finishes. If pairs are kept forever, a pair tried and rejected while matching \`Set\` members stays "assumed equal" and later produces a wrong \`true\` (measured: 1,408 wrong answers on 200,000 random Sets of objects that share parts).

## 4. Verified solution

\`\`\`js
function deepEqual(a, b) {
  const comparing = new WeakMap();                  // a -> Set of b that are being compared further up the stack
  const tagOf = (v) => Object.prototype.toString.call(v);
  const isObj = (v) => typeof v === "object" && v !== null;
  const ownEnumerable = (o) =>
    Reflect.ownKeys(o).filter((k) => Object.prototype.propertyIsEnumerable.call(o, k));

  function eq(x, y) {
    if (Object.is(x, y)) return true;               // NaN equals NaN, but +0 does not equal -0
    if (!isObj(x) || !isObj(y)) return false;       // different primitives, or functions that are not the same one
    if (Object.getPrototypeOf(x) !== Object.getPrototypeOf(y)) return false;
    const tag = tagOf(x);
    if (tag !== tagOf(y)) return false;

    let open = comparing.get(x);
    if (open && open.has(y)) return true;           // already comparing this pair: a cycle, so assume equal
    if (!open) comparing.set(x, (open = new Set()));
    open.add(y);
    try { return sameContents(x, y, tag); } finally { open.delete(y); }
  }

  function sameContents(x, y, tag) {
    switch (tag) {
      case "[object Date]": if (!Object.is(x.getTime(), y.getTime())) return false; break;
      case "[object RegExp]":
        if (x.source !== y.source || x.flags !== y.flags || x.lastIndex !== y.lastIndex) return false;
        break;
      case "[object Number]": case "[object String]": case "[object Boolean]":
        if (!Object.is(x.valueOf(), y.valueOf())) return false;
        break;
      case "[object Error]": if (x.name !== y.name || x.message !== y.message) return false; break;
      case "[object Array]": if (x.length !== y.length) return false; break;
      case "[object Map]": if (!sameMaps(x, y)) return false; break;
      case "[object Set]": if (!sameSets(x, y)) return false; break;
    }
    const keys = ownEnumerable(x);
    if (keys.length !== ownEnumerable(y).length) return false;
    return keys.every((k) => Object.prototype.propertyIsEnumerable.call(y, k) && eq(x[k], y[k]));
  }

  function sameSets(x, y) {                         // order does not matter; object members match by deep equality
    if (x.size !== y.size) return false;
    const unmatched = [...y].filter(isObj);
    for (const item of x) {
      if (!isObj(item)) { if (!y.has(item)) return false; continue; }
      const at = unmatched.findIndex((other) => eq(item, other));
      if (at === -1) return false;
      unmatched.splice(at, 1);                      // each member of y can be paired only once
    }
    return true;
  }

  function sameMaps(x, y) {
    if (x.size !== y.size) return false;
    const unmatched = [...y].filter(([k]) => isObj(k));
    for (const [k, v] of x) {
      if (!isObj(k)) { if (!y.has(k) || !eq(v, y.get(k))) return false; continue; }
      const at = unmatched.findIndex(([k2, v2]) => eq(k, k2) && eq(v, v2));
      if (at === -1) return false;
      unmatched.splice(at, 1);
    }
    return true;
  }

  return eq(a, b);
}
\`\`\`

\`\`\`
real, verified output (Node v24.19.0):

  240,000 pairs against util.isDeepStrictEqual: 148,923 equal, 91,077 unequal, 1 disagreement
  the one disagreement (reduced): a = {}; a.s = new Set([{c:1}, a])   b = {}; b.s = new Set([b, {c:1}])
    the two graphs are identical apart from the order of the Set members
    deepEqual true (correct)   util.isDeepStrictEqual false (wrong: its own docs say Set order is ignored)
    in a variant with the members in the same order, both say true

  semantics (the example below prints all of these):
    NaN vs NaN true | 0 vs -0 false | [0] vs [-0] false | Date(NaN) vs Date(NaN) true | /a/g vs /a/i false
    {a:1,b:2} vs {b:2,a:1} true | [1, ,3] vs [1,undefined,3] false | {a:undefined} vs {} false
    {} vs Object.create(null) false | new A() vs new B() false | new Number(1) vs 1 false
    () => 1 vs () => 1 false | Error("x") vs Error("y") false | Set([0]) vs Set([-0]) true (a Set stores -0 as +0)
    Set([{a:1},{b:2}]) vs the same reordered true | Set([{a:1},{a:1}]) vs Set([{a:1},{a:2}]) false
    two self-referencing objects: same data true, one value differs false

  a design choice where Node disagrees: a cycle of length 1 vs a cycle of length 2 (same infinite unfolding)
    deepEqual true | util.isDeepStrictEqual false

  property tests, 20,000 graphs (5,616 with extra cycles or sharing), no oracle needed:
    a structuredClone copy not reported equal             0
    one leaf changed (4,780 changes), still reported equal 0
    a Map or Set reordered (3,050), reported unequal       0

  the pitfalls, measured:
    no cycle guard                        RangeError on two self-referencing objects
    pairs never removed from the guard    1,408 wrong answers in 200,000 random Set comparisons

  shared structure: a "diamond" chain of depth d has 2^d paths, and the plain version follows every one
    depth   plain deepEqual   util.isDeepStrictEqual   memoised deepEqual
    16          453.6 ms            127.4 ms                 -
    20        4,146.5 ms          2,238.2 ms                 -
    24       77,375.4 ms         29,518.7 ms              0.2 ms
    1000            -                   -                   6.1 ms
    (the memoised version agreed with the plain one on all 240,000 pairs)

  recursion limits: deepEqual ok at nesting 1,000 and RangeError at 5,000; isDeepStrictEqual RangeError already at 3,000
\`\`\`

**Level up: shared structure.** A value that is reachable along many paths (a "diamond") makes the plain version do work proportional to the NUMBER OF PATHS, which is exponential in the depth: 77 seconds at depth 24, and \`isDeepStrictEqual\` is exponential too. The fix is to remember the pairs already proven equal, with one important condition. A \`true\` result that leaned on a cycle assumption (an ancestor pair "assumed equal") is only valid while that ancestor is still being compared, so it must not be cached. Count how many times an assumption has been used; if the count did not change while comparing a pair, its \`true\` is unconditional and safe to cache. The changes to the plain version are these (the full memoised function is in the runnable example):

\`\`\`js
const proven = new WeakMap();   // pairs already proven equal WITHOUT leaning on a cycle assumption
let assumed = 0;                // how many times a cycle assumption has been used so far
if (isProven(x, y)) return true;
if (open && open.has(y)) { assumed++; return true; }
const before = assumed;
try {
  const same = sameContents(x, y, tag);
  if (same && assumed === before) remember(x, y);   // true no matter what is above us, so it is safe to cache
  return same;
} finally { open.delete(y); }
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="primitives are settled by Object.is, objects need the same prototype and type, then their contents are compared by recursion, and a pair already being compared further up the stack is assumed equal, which is how cycles terminate, while the pair is removed again when its comparison finishes">
  <defs>
    <marker id="deepequal-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Settle primitives fast, then recurse with a stack-scoped guard</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">Object.is, prototype, type tag</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">NaN equal, zero signs differ</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">pair already in progress: equal</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">added on entry, removed on exit</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">Map and Set members are paired by deep equality, each partner used once</text>
</svg>

## 5. Complexity

The plain version is O(n) on trees, where \`n\` is the number of values. On shared structure it can be exponential (every path is followed), and on \`Set\` and \`Map\` members it is O(m^2) comparisons in the worst case, since each object member is matched by scanning the unused members of the other side. The memoised version is O(n) on the diamond chain (6.1 ms at depth 1000). Space is O(depth) for the guard, plus the cache in the memoised version.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`NaN\` vs \`NaN\`, \`+0\` vs \`-0\` | Equal, not equal | \`Object.is\` |
| Key order | Ignored | Keys are looked up, not compared by position |
| \`{a: undefined}\` vs \`{}\`, hole vs \`undefined\` | Not equal | Own key lists differ |
| Two invalid \`Date\`s | Equal | Their times are both \`NaN\`, compared with \`Object.is\` |
| \`RegExp\` | Equal only with the same source, flags and \`lastIndex\` | Compared explicitly (the same rule as \`isDeepStrictEqual\`) |
| Different prototype or type tag | Not equal | Checked before any content |
| \`Set\` or \`Map\` with object members | Order ignored, each member paired once | Matching by deep equality over the unused members |
| Circular structures | Terminate | A pair already in progress is assumed equal |
| Functions | Equal only if the same function | \`Object.is\` |
| Not covered by the tests here | Typed arrays, \`ArrayBuffer\`, \`DataView\`, \`WeakMap\`, \`WeakSet\` | Out of scope; add branches if you need them |

## 7. Common Pitfalls

- **\`===\`, or a bare \`typeof x === "object"\`.** Reference equality is not deep equality, and \`typeof null\` is \`"object"\`.
- **Comparing \`JSON.stringify\` output.** It reports unequal objects as equal (\`NaN\` vs \`null\`, \`undefined\` vs a missing key, different \`Map\`s, a \`Date\` vs its string) and equal objects as unequal (different key order).
- **Using \`==\` or \`===\` for numbers.** \`NaN === NaN\` is false and \`0 === -0\` is true; use \`Object.is\`.
- **Comparing keys only by count.** \`{a: 1, b: 2}\` and \`{a: 1, c: 2}\` have the same count; each key of one side must exist in the other.
- **No cycle guard, or a guard that never forgets.** The first overflows the stack, the second gives wrong answers when a comparison is tried and rejected.
- **Using \`Set.prototype.has\` for object members.** It checks identity, so two equal-looking objects never match; pair members by deep equality and use each partner once (\`Set([{a:1},{a:1}])\` is not equal to \`Set([{a:1},{a:2}])\`).
- **Ignoring shared structure.** Deep DAGs make the plain version exponential (77 s at depth 24); memoise proven pairs, and only pairs proven without a cycle assumption.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Does NaN equal NaN and does +0 equal -0? Do prototypes matter? Should Set and Map ignore order? What about cycles?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a === b</code>, or compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.stringify</code> output. The first is reference equality; the second gets key order, NaN, undefined, Map and Date wrong."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"Type-specific rules, unordered Map and Set matching, and cycles, which need a guard that lives only as long as the pair is on the stack."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is</code> first, then prototype and type tag, then per-type content, then own enumerable keys by recursion. Set and Map members are paired by deep equality; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakMap</code> of in-progress pairs stops cycles."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"NaN, 0 versus -0, a hole versus undefined, two classes with equal fields, a Set of equal-looking objects, and a self-referencing pair."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the cycle guard remove a pair when it finishes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A pair that was tried and rejected (for example while matching Set members) would otherwise stay "assumed equal" and produce a wrong <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code> later. Keeping pairs forever gave 1,408 wrong answers on 200,000 random Set comparisons.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you compare Sets of objects when order does not matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Primitive members are looked up with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code>. Object members are paired with an unused deep-equal member of the other set, each partner used once, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set([{a:1},{a:1}])</code> differs from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set([{a:1},{a:2}])</code>. The worst case is O(m^2).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your version said true where Node's isDeepStrictEqual said false. Who is right?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two different cases. For a Set that contains its own parent with the members in a different order, the graphs are identical, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code> is right and Node was wrong (the single disagreement in 240,000 pairs). For a cycle of length 1 against a cycle of length 2 (the same infinite unfolding) it is a design choice: this version says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>, Node says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What makes it exponential on shared structure, and how do you fix it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A diamond chain has 2^depth paths and the plain version follows every one: 77 seconds at depth 24 (Node's function took 29.5 s). Cache the pairs proven equal, but only those proven without relying on a cycle assumption; that took depth 24 to 0.2 ms and depth 1,000 to 6.1 ms.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should +0 and -0 be equal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It depends on the contract, so state it. This version follows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is</code> (like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert.deepStrictEqual</code>); the loose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert.deepEqual</code> treats them as equal. As Set members or Map keys they are the same value anyway, because both store -0 as +0.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`Object.is\`** | Equality that treats \`NaN\` as equal to itself and tells \`+0\` from \`-0\` |
| **Strict deep equality** | Deep equality that also requires the same prototypes and type |
| **In-progress pair** | A pair of objects currently being compared higher up the call stack |
| **Diamond** | A structure where the same object is reachable along many paths |

---
**Conclusion:** deep equality is \`Object.is\` for primitives, then a check of prototype and type tag, then a comparison of what defines each type, then own enumerable keys by recursion, with \`Map\` and \`Set\` members paired by deep equality. Cycles terminate because a pair that is already being compared is assumed equal, but only while it is on the stack: the guard entry must be removed on exit. Against \`util.isDeepStrictEqual\` it disagreed on exactly 1 of 240,000 pairs, and there \`isDeepStrictEqual\` was wrong. On shared structure both go exponential (77 seconds at depth 24 for the plain version), and caching only the pairs proven without a cycle assumption brought that to 0.2 ms.`,
    examples: [
      {
        label: "Real, direct proof: deepEqual settles every semantic question, survives cycles, passes property tests, and the memoised version removes the exponential blow-up",
        tech: "javascript",
        runnable: true,
        code: `function deepEqual(a, b) {
  const comparing = new WeakMap();                  // a -> Set of b that are being compared further up the stack
  const tagOf = (v) => Object.prototype.toString.call(v);
  const isObj = (v) => typeof v === "object" && v !== null;
  const ownEnumerable = (o) =>
    Reflect.ownKeys(o).filter((k) => Object.prototype.propertyIsEnumerable.call(o, k));

  function eq(x, y) {
    if (Object.is(x, y)) return true;               // NaN equals NaN, but +0 does not equal -0
    if (!isObj(x) || !isObj(y)) return false;       // different primitives, or functions that are not the same one
    if (Object.getPrototypeOf(x) !== Object.getPrototypeOf(y)) return false;
    const tag = tagOf(x);
    if (tag !== tagOf(y)) return false;

    let open = comparing.get(x);
    if (open && open.has(y)) return true;           // already comparing this pair: a cycle, so assume equal
    if (!open) comparing.set(x, (open = new Set()));
    open.add(y);
    try { return sameContents(x, y, tag); } finally { open.delete(y); }
  }

  function sameContents(x, y, tag) {
    switch (tag) {
      case "[object Date]": if (!Object.is(x.getTime(), y.getTime())) return false; break;
      case "[object RegExp]":
        if (x.source !== y.source || x.flags !== y.flags || x.lastIndex !== y.lastIndex) return false;
        break;
      case "[object Number]": case "[object String]": case "[object Boolean]":
        if (!Object.is(x.valueOf(), y.valueOf())) return false;
        break;
      case "[object Error]": if (x.name !== y.name || x.message !== y.message) return false; break;
      case "[object Array]": if (x.length !== y.length) return false; break;
      case "[object Map]": if (!sameMaps(x, y)) return false; break;
      case "[object Set]": if (!sameSets(x, y)) return false; break;
    }
    const keys = ownEnumerable(x);
    if (keys.length !== ownEnumerable(y).length) return false;
    return keys.every((k) => Object.prototype.propertyIsEnumerable.call(y, k) && eq(x[k], y[k]));
  }

  function sameSets(x, y) {                         // order does not matter; object members match by deep equality
    if (x.size !== y.size) return false;
    const unmatched = [...y].filter(isObj);
    for (const item of x) {
      if (!isObj(item)) { if (!y.has(item)) return false; continue; }
      const at = unmatched.findIndex((other) => eq(item, other));
      if (at === -1) return false;
      unmatched.splice(at, 1);                      // each member of y can be paired only once
    }
    return true;
  }

  function sameMaps(x, y) {
    if (x.size !== y.size) return false;
    const unmatched = [...y].filter(([k]) => isObj(k));
    for (const [k, v] of x) {
      if (!isObj(k)) { if (!y.has(k) || !eq(v, y.get(k))) return false; continue; }
      const at = unmatched.findIndex(([k2, v2]) => eq(k, k2) && eq(v, v2));
      if (at === -1) return false;
      unmatched.splice(at, 1);
    }
    return true;
  }

  return eq(a, b);
}

function deepEqualMemo(a, b) {
  const comparing = new WeakMap();                  // pairs being compared further up the stack (cycle guard)
  const proven = new WeakMap();                     // pairs already proven equal WITHOUT leaning on a cycle assumption
  let assumed = 0;                                  // how many times a cycle assumption has been used so far
  const tagOf = (v) => Object.prototype.toString.call(v);
  const isObj = (v) => typeof v === "object" && v !== null;
  const ownEnumerable = (o) =>
    Reflect.ownKeys(o).filter((k) => Object.prototype.propertyIsEnumerable.call(o, k));
  const isProven = (x, y) => proven.has(x) && proven.get(x).has(y);
  const remember = (x, y) => { if (!proven.has(x)) proven.set(x, new Set()); proven.get(x).add(y); };

  function eq(x, y) {
    if (Object.is(x, y)) return true;
    if (!isObj(x) || !isObj(y)) return false;
    if (Object.getPrototypeOf(x) !== Object.getPrototypeOf(y)) return false;
    const tag = tagOf(x);
    if (tag !== tagOf(y)) return false;
    if (isProven(x, y)) return true;

    let open = comparing.get(x);
    if (open && open.has(y)) { assumed++; return true; }
    if (!open) comparing.set(x, (open = new Set()));
    open.add(y);
    const before = assumed;
    try {
      const same = sameContents(x, y, tag);
      if (same && assumed === before) remember(x, y);   // true no matter what is above us, so it is safe to cache
      return same;
    } finally { open.delete(y); }
  }

  function sameContents(x, y, tag) {
    switch (tag) {
      case "[object Date]": if (!Object.is(x.getTime(), y.getTime())) return false; break;
      case "[object RegExp]":
        if (x.source !== y.source || x.flags !== y.flags || x.lastIndex !== y.lastIndex) return false;
        break;
      case "[object Number]": case "[object String]": case "[object Boolean]":
        if (!Object.is(x.valueOf(), y.valueOf())) return false;
        break;
      case "[object Error]": if (x.name !== y.name || x.message !== y.message) return false; break;
      case "[object Array]": if (x.length !== y.length) return false; break;
      case "[object Map]": if (!sameMaps(x, y)) return false; break;
      case "[object Set]": if (!sameSets(x, y)) return false; break;
    }
    const keys = ownEnumerable(x);
    if (keys.length !== ownEnumerable(y).length) return false;
    return keys.every((k) => Object.prototype.propertyIsEnumerable.call(y, k) && eq(x[k], y[k]));
  }

  function sameSets(x, y) {
    if (x.size !== y.size) return false;
    const unmatched = [...y].filter(isObj);
    for (const item of x) {
      if (!isObj(item)) { if (!y.has(item)) return false; continue; }
      const at = unmatched.findIndex((other) => eq(item, other));
      if (at === -1) return false;
      unmatched.splice(at, 1);
    }
    return true;
  }

  function sameMaps(x, y) {
    if (x.size !== y.size) return false;
    const unmatched = [...y].filter(([k]) => isObj(k));
    for (const [k, v] of x) {
      if (!isObj(k)) { if (!y.has(k) || !eq(v, y.get(k))) return false; continue; }
      const at = unmatched.findIndex(([k2, v2]) => eq(k, k2) && eq(v, v2));
      if (at === -1) return false;
      unmatched.splice(at, 1);
    }
    return true;
  }

  return eq(a, b);
}

const show = (label, a, b) => console.log(label.padEnd(50), deepEqual(a, b));

// 1. the questions the title asks: NaN, -0, Date, RegExp, cycles
show("NaN vs NaN (=== says false):", NaN, NaN);
show("0 vs -0 (=== says true):", 0, -0);
show("{a: NaN} vs {a: NaN}:", { a: NaN }, { a: NaN });
show("[0] vs [-0]:", [0], [-0]);
show("new Date(0) vs new Date(0):", new Date(0), new Date(0));
show("new Date(0) vs new Date(1):", new Date(0), new Date(1));
show("new Date(NaN) vs new Date(NaN):", new Date(NaN), new Date(NaN));
show("/a/g vs /a/g:", /a/g, /a/g);
show("/a/g vs /a/i:", /a/g, /a/i);
show("{a:1, b:2} vs {b:2, a:1} (key order ignored):", { a: 1, b: 2 }, { b: 2, a: 1 });

// 2. strictness
show("[1, ,3] vs [1, undefined, 3] (hole is not a value):", [1, , 3], [1, undefined, 3]);
show("{a: undefined} vs {} (a key is not a missing key):", { a: undefined }, {});
show("[] vs {}:", [], {});
show("{} vs Object.create(null):", {}, Object.create(null));
class A { constructor() { this.x = 1; } }
class B { constructor() { this.x = 1; } }
show("new A() vs new B() with the same fields:", new A(), new B());
show("new Number(1) vs 1:", new Number(1), 1);
show("() => 1 vs () => 1 (functions by reference):", () => 1, () => 1);
show("new Error(x) vs new Error(y):", new Error("x"), new Error("y"));
show("Set([0]) vs Set([-0]) (a Set stores -0 as +0):", new Set([0]), new Set([-0]));

// 3. unordered collections with object members
show("Set([{a:1}, {b:2}]) vs Set([{b:2}, {a:1}]):", new Set([{ a: 1 }, { b: 2 }]), new Set([{ b: 2 }, { a: 1 }]));
show("Set([{a:1}, {a:1}]) vs Set([{a:1}, {a:2}]) (each member pairs once):", new Set([{ a: 1 }, { a: 1 }]), new Set([{ a: 1 }, { a: 2 }]));
show("Map with an object key, same content:", new Map([[{ k: 1 }, "v"]]), new Map([[{ k: 1 }, "v"]]));
show("Map with an object key, different value:", new Map([[{ k: 1 }, "v"]]), new Map([[{ k: 1 }, "w"]]));

// 4. cycles
const c1 = { name: "n", v: 1 }; c1.self = c1;
const c2 = { name: "n", v: 1 }; c2.self = c2;
const c3 = { name: "n", v: 2 }; c3.self = c3;
show("two self-referencing objects, same data:", c1, c2);
show("two self-referencing objects, one value differs:", c1, c3);
const p1 = { id: 1 }, q1 = { id: 2, peer: p1 }; p1.peer = q1;
const p2 = { id: 1 }, q2 = { id: 2, peer: p2 }; p2.peer = q2;
show("two mutually referencing pairs:", p1, p2);
const one = {}; one.x = one;
const two = { x: {} }; two.x.x = two;
show("a cycle of length 1 vs a cycle of length 2 (same unfolding):", one, two);
const s1 = {}; s1.s = new Set([true, { c: 1 }, s1]);
const s2 = {}; s2.s = new Set([s2, { c: 1 }, true]);
show("a Set that contains its own parent, members reordered:", s1, s2);

// 5. why the shortcuts fail
const viaJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
console.log("JSON.stringify: key order:", viaJson({ a: 1, b: 2 }, { b: 2, a: 1 }), "| {a:NaN} vs {a:null}:", viaJson({ a: NaN }, { a: null }), "| {a:undefined} vs {}:", viaJson({ a: undefined }, {}), "| two Maps with different content:", viaJson(new Map([[1, 2]]), new Map([[3, 4]])), "| a Date vs its ISO string:", viaJson(new Date(0), new Date(0).toISOString()));
console.log("=== on two equal arrays:", [1] === [1], "| typeof null:", typeof null, "(so a typeof check alone lets null into the object branch)");

// 6. property test with no oracle: a copy must be equal, and changing one leaf must make it unequal
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(4711), pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const isObj = (v) => typeof v === "object" && v !== null;
function gen(depth) {
  if (depth > 3 || rnd() < 0.3) return pick([null, undefined, true, false, 0, -0, 1, 42, 3.14, NaN, Infinity, "", "a", "hello", 10n]);
  const r = rnd();
  if (r < 0.25) { const a = Array.from({ length: Math.floor(rnd() * 4) }, () => gen(depth + 1)); if (a.length && rnd() < 0.2) delete a[0]; return a; }
  if (r < 0.55) { const o = {}; for (let i = 0, n = Math.floor(rnd() * 4); i < n; i++) Object.defineProperty(o, pick(["a", "b", "c", "1", "__proto__", "d e"]), { value: gen(depth + 1), writable: true, enumerable: true, configurable: true }); return o; }
  if (r < 0.65) return new Date(pick([0, 1e12, NaN]));
  if (r < 0.72) return new RegExp(pick(["a+", "^x$", ""]), pick(["", "g", "gi", "m"]));
  if (r < 0.78) return pick([new Number(5), new Number(NaN), new String("ab"), new Boolean(false)]);
  if (r < 0.9) { const m = new Map(); for (let i = 0, n = Math.floor(rnd() * 3); i < n; i++) m.set(rnd() < 0.5 ? pick(["k", 1, NaN]) : gen(depth + 1), gen(depth + 1)); return m; }
  const s = new Set(); for (let i = 0, n = Math.floor(rnd() * 4); i < n; i++) s.add(rnd() < 0.5 ? pick(["k", 1, NaN]) : gen(depth + 1)); return s;
}
function nodesOf(root) {
  const seen = new Set();
  (function walk(v) {
    if (!isObj(v) || seen.has(v)) return;
    seen.add(v);
    if (v instanceof Map) for (const [k, x] of v) { walk(k); walk(x); }
    if (v instanceof Set) for (const x of v) walk(x);
    for (const k of Reflect.ownKeys(v)) if (Object.prototype.propertyIsEnumerable.call(v, k)) walk(v[k]);
  })(root);
  return [...seen];
}
let graphs = 0, cyclic = 0, copyNotEqual = 0, changedStillEqual = 0, changes = 0, reorderNotEqual = 0, reorders = 0, memoDisagrees = 0;
for (let n = 0; n < 20000; n++) {
  const x = gen(0);
  if (isObj(x) && rnd() < 0.4) {
    const nodes = nodesOf(x), host = pick(nodes), target = pick(nodes), t = Object.prototype.toString.call(host);
    if (Array.isArray(host)) host.push(target); else if (host instanceof Map) host.set("cyc", target); else if (host instanceof Set) host.add(target); else if (t === "[object Object]") host.cyc = target;
    cyclic++;
  }
  graphs++;
  const c = structuredClone(x);
  if (!deepEqual(x, c)) copyNotEqual++;
  if (deepEqualMemo(x, c) !== deepEqual(x, c)) memoDisagrees++;
  if (!isObj(c)) continue;
  const holders = nodesOf(c).filter((o) => ["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(o)));
  const slots = holders.flatMap((h) => Object.keys(h).filter((k) => !isObj(h[k])).map((k) => [h, k]));
  if (slots.length) {
    const [h, k] = pick(slots);
    h[k] = Object.is(h[k], "changed!") ? "changed?" : "changed!";
    changes++;
    if (deepEqual(x, c)) changedStillEqual++;
    if (deepEqualMemo(x, c) !== deepEqual(x, c)) memoDisagrees++;
  }
  const c2 = structuredClone(x);
  const target = pick(nodesOf(c2));
  if (target instanceof Set) { const e = [...target]; target.clear(); for (const v of e.reverse()) target.add(v); reorders++; if (!deepEqual(x, c2)) reorderNotEqual++; }
  else if (target instanceof Map) { const e = [...target]; target.clear(); for (const [k, v] of e.reverse()) target.set(k, v); reorders++; if (!deepEqual(x, c2)) reorderNotEqual++; }
}
console.log("20,000 random graphs (" + cyclic + " with extra cycles or sharing): a structuredClone copy not equal:", copyNotEqual);
console.log("  after changing one leaf (" + changes + " changes), still reported equal:", changedStillEqual, "| after reordering a Map or Set (" + reorders + "), reported unequal:", reorderNotEqual, "| memoised variant disagrees:", memoDisagrees);

// 7. shared structure: a diamond chain has 2^depth paths, so the plain version does exponential work
function diamond(depth) { let n = { leaf: 1 }; for (let i = 0; i < depth; i++) n = { l: n, r: n }; return n; }
const timeIt = (fn) => { const t = Date.now(); const r = fn(); return [r, Date.now() - t]; };
for (const d of [12, 14, 16]) {
  const [r1, t1] = timeIt(() => deepEqual(diamond(d), diamond(d)));
  const [r2, t2] = timeIt(() => deepEqualMemo(diamond(d), diamond(d)));
  console.log("diamond depth", d, "| plain:", r1, t1 + " ms | memoised:", r2, t2 + " ms");
}
const [big, tBig] = timeIt(() => deepEqualMemo(diamond(1000), diamond(1000)));
console.log("memoised, diamond depth 1000:", big, tBig + " ms (timings vary by machine; the growth is the point)");
let leafChanged = { leaf: 2 }; for (let i = 0; i < 30; i++) leafChanged = { l: leafChanged, r: leafChanged };
console.log("memoised, a depth-30 diamond whose leaf differs is unequal:", !deepEqualMemo(diamond(30), leafChanged));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement deepClone — handle Dates, RegExp, Map, Set & circular refs",
    seoDescription: "deepClone handling Dates, RegExp, Map, Set and cycles matched structuredClone on 60,000 random graphs and keeps classes, symbols and shared references.",
    description: `**Problem, as an interviewer would state it:**
"Write \`deepClone(obj)\` that correctly clones plain objects, arrays, Dates, RegExps, Maps and Sets, and handles circular references. Discuss edge cases, runtime, and alternatives."

**Examples:**

\`\`\`
const a = { d: new Date(0), m: new Map([["k", { deep: 1 }]]), list: [1, [2]] };
a.self = a;
const b = deepClone(a);
b.self === b;     // true  (the cycle points at the copy, not the original)
b.m !== a.m;      // true  (nothing is shared with the original)
\`\`\`

**Clarifying questions expected:**
- Should class instances keep their prototype, and are functions copied or shared?
- Are Map keys cloned as well as values, and what about symbol keys and non-enumerable properties?
- Why not \`structuredClone\`, and which kinds (Errors, typed arrays) are out of scope?

**Code / implementation expected:** Yes — real code, checked against \`structuredClone\` and on circular and shared structures.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** the solution was checked, not just demoed. On 60,000 random object graphs (16,710 of them with extra cycles or shared references) the clone matched the original under Node's \`isDeepStrictEqual\`, matched the native \`structuredClone\`, kept the exact graph shape (cycles and sharing), shared no object with the input, and never mutated it: 0 failures in every check. Then each classic bug (JSON round trip, no seen-map, registering the copy too late, the \`__proto__\` key) was reproduced so the explanations below rest on observed behaviour.

## 1. The problem, restated

Write \`deepClone(value)\` that returns a completely independent copy: plain objects, arrays, \`Date\`, \`RegExp\`, \`Map\` and \`Set\` are copied recursively, and circular references must work. This version also keeps class instances working (same prototype), copies symbol keys, keeps array holes, returns functions by reference, and preserves shared references (two properties pointing at one object still point at one object in the copy).

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Why not \`structuredClone\`? | It is the right default when it fits. Write your own when you need prototypes, symbol keys or functions preserved: the native one drops the class, drops symbol keys and throws on functions (all shown below). |
| Which property kinds count? | Own enumerable string and symbol keys. Non-enumerable properties and inherited ones are not copied. |
| Map keys: clone them too? | Yes here, like \`structuredClone\`. A Map keyed by objects should not share key objects with the original. |
| Functions? | Returned by reference; there is no meaningful way to copy a closure. |
| What is out of scope? | Errors, typed arrays and \`ArrayBuffer\`, \`WeakMap\`, DOM nodes: they need their own branch (measured behaviour below). |

## 3. Thought process

The one-liner \`JSON.parse(JSON.stringify(x))\` is the brute force, and it breaks in many ways at once: in the run below a \`Date\` became a string, \`undefined\` values vanished, \`NaN\` became \`null\`, \`Map\`, \`Set\` and \`RegExp\` became \`{}\`, \`-0\` became \`0\`, and a cycle threw a \`TypeError\`. The next idea is plain recursion over \`Object.keys\`, and its problem is cycles: without a record of what has been copied, a self-reference recurses until the stack overflows (\`RangeError\`). The fix is a \`WeakMap\` from each original to its clone, and the crucial detail is WHEN to fill it: the empty copy must be registered BEFORE recursing into the children. Registering it after (a very common mistake) still overflows on a cycle, because the child never finds the copy under construction. The same map makes shared references stay shared: the second time an object is reached, its existing clone is returned. The rest is choosing the right empty shell by type (\`Object.prototype.toString\` gives a reliable tag), then copying own enumerable keys with \`Object.defineProperty\`, not assignment, so a key named \`__proto__\` stays an ordinary key.

## 4. Verified solution

\`\`\`js
function deepClone(root) {
  const seen = new WeakMap();                       // original -> its clone (handles cycles AND shared references)
  const tagOf = (v) => Object.prototype.toString.call(v);

  function clone(value) {
    if (value === null || typeof value !== "object") return value;   // primitives and functions are returned as they are
    if (seen.has(value)) return seen.get(value);

    const tag = tagOf(value);
    let copy;
    switch (tag) {
      case "[object Date]": copy = new Date(value.getTime()); break;
      case "[object RegExp]":
        copy = new RegExp(value.source, value.flags);
        copy.lastIndex = value.lastIndex;
        break;
      case "[object Number]": case "[object String]": case "[object Boolean]":
        copy = Object(value.valueOf()); break;
      case "[object Map]": copy = new Map(); break;
      case "[object Set]": copy = new Set(); break;
      case "[object Array]": copy = new Array(value.length); break;    // holes stay holes
      default: copy = Object.create(Object.getPrototypeOf(value));    // keeps class instances working
    }
    seen.set(value, copy);                          // register BEFORE recursing, so a cycle finds the copy

    if (tag === "[object Map]") for (const [k, v] of value) copy.set(clone(k), clone(v));
    else if (tag === "[object Set]") for (const v of value) copy.add(clone(v));

    for (const key of Reflect.ownKeys(value)) {     // own enumerable string AND symbol keys
      if (!Object.prototype.propertyIsEnumerable.call(value, key)) continue;
      const existing = Object.getOwnPropertyDescriptor(copy, key);
      if (existing && !existing.configurable) continue;               // e.g. the index keys of a boxed String
      Object.defineProperty(copy, key, {            // defineProperty, not copy[key] = ..., so "__proto__" stays a plain key
        value: clone(value[key]), writable: true, enumerable: true, configurable: true,
      });
    }
    return copy;
  }
  return clone(root);
}
\`\`\`

\`\`\`
real, verified output:

  60,000 random graphs (Date, RegExp, boxed primitives, Map, Set, arrays, objects incl. a "__proto__" key,
  16,710 of them with extra cycles or shared references), Node v24.19.0:
    clone deep-equals the input (util.isDeepStrictEqual)   0 failures
    clone equals structuredClone of the same graph          0 failures (structuredClone threw 0 times)
    same graph shape, cycles and sharing preserved          0 failures
    shares any object with the input                        0
    input mutated by the clone                              0

  what deepClone keeps that structuredClone does not:
    class instance keeps its prototype and methods          true (norm() works)   | structuredClone: prototype lost
    symbol key copied                                       true                  | structuredClone: 0 symbol keys
    function property kept by reference                     true                  | structuredClone: DataCloneError
    RegExp lastIndex copied                                 3                     | structuredClone: reset to 0
    (both keep array holes and extra array properties; deepClone also keeps a null prototype)

  the JSON round trip on { Date, undefined, NaN, Map, Set, RegExp, -0 }:
    {"d":"1970-01-01T00:00:00.000Z","n":null,"m":{},"s":{},"r":{},"z":0}   (d is now a string, u is gone, -0 became 0)
    on a cycle: TypeError

  the classic mistakes:
    recursion with no seen-map on a cycle                   RangeError
    registering the copy AFTER recursing on a cycle         RangeError
    a clone without a seen-map splits a shared reference    true (a and b become different objects)
    naive copy[key] = value for the key "__proto__"         the copy inherits injected: true
    deepClone with defineProperty                           own "__proto__" key kept, nothing inherited, Object.prototype clean

  not handled (checked): Error -> message becomes "" (structuredClone keeps "boom"), typed arrays -> TypeError

  limits and speed (Node v24.19.0, timings vary by machine):
    nesting depth 5,000:   deepClone ok, structuredClone RangeError
    nesting depth 10,000:  deepClone RangeError, structuredClone RangeError
    30,000 objects (nested, with Dates): deepClone 564 ms, structuredClone 196 ms, JSON round trip 257 ms
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="a table from each original object to its clone is filled with the empty copy before the children are visited, so a cycle finds the copy already there and a shared reference finds the same copy again, which keeps both shapes intact">
  <defs>
    <marker id="deepclone-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Register the copy before visiting the children</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">register the copy after</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">a cycle never finds it, RangeError</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">register the empty copy first</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">cycles and shared references both work</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">fill the copy with defineProperty so a key named __proto__ stays an ordinary key</text>
</svg>

## 5. Complexity

Time O(n) in the number of objects and properties (each original is cloned once, thanks to the \`WeakMap\`). Space O(n) for the copy plus the map; the call stack grows with the nesting depth, which is why very deep structures overflow.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Circular reference | Copy has the same cycle, pointing at the copy | The copy is registered before its children are visited |
| Shared reference | Stays shared in the copy (and is a new object) | The \`WeakMap\` returns the existing clone |
| Invalid \`Date\`, \`NaN\`, \`-0\` | Preserved | \`getTime()\` and primitives are copied as they are |
| \`RegExp\` | Same source, flags and \`lastIndex\` | Rebuilt from \`source\` and \`flags\`, then \`lastIndex\` set |
| \`Map\` with object keys | Keys and values both cloned | Both go through \`clone\` |
| Array holes and extra properties | Kept | \`new Array(length)\` plus copying own enumerable keys |
| Key named \`__proto__\` | An ordinary own key in the copy | \`defineProperty\`, not assignment |
| Class instance | Same prototype, methods still work | \`Object.create(Object.getPrototypeOf(value))\` |
| Function or symbol value | Returned as is | Not \`typeof "object"\` |
| Getter | Read once, the copy holds the plain value | \`value[key]\` runs the getter; the copy gets a data property |
| Frozen input | The copy is not frozen | Properties are recreated as writable and configurable |
| Error, typed array | Not supported (Error loses its message, typed arrays throw) | They need their own branch |

## 7. Common Pitfalls

- **\`JSON.parse(JSON.stringify(x))\`.** Fine for plain data, wrong for everything in the list above; it also throws on cycles.
- **No seen-map, or registering the copy too late.** Both overflow the stack on a cycle, and the first one also splits shared references into duplicates.
- **Assigning with \`copy[key] = ...\`.** For a key named \`__proto__\` (easy to create with \`JSON.parse\`), assignment changes the copy's prototype instead of creating a key, so the copy inherits properties (measured: \`injected\` was inherited). \`defineProperty\` avoids it. The global \`Object.prototype\` was not affected either way, only the copy.
- **Cloning by \`Object.keys\` only.** That loses symbol keys, and building \`{}\` for everything loses class prototypes.
- **Assuming \`structuredClone\` is a drop-in replacement.** It drops prototypes and symbol keys, resets \`lastIndex\`, and throws on functions. It is also the faster choice on plain data (196 ms vs 564 ms here), so use it when it fits.
- **Forgetting the unsupported kinds.** An \`Error\` came back with an empty message and a typed array threw a \`TypeError\`; decide explicitly what to do with them (add a branch, or throw).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Plain objects, arrays, Date, RegExp, Map, Set and cycles. Should class instances keep working, and are functions copied or shared?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"JSON.parse(JSON.stringify(x)). It turns Dates into strings, drops undefined, nulls NaN, empties Map and Set, and throws on a cycle."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"Cycles and shared references: I need a record of what is already copied, and it must be filled BEFORE I recurse into the children."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakMap</code> from original to clone; pick the empty shell by type tag; register it; fill Map and Set entries; copy own enumerable keys with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineProperty</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"A self-reference, a shared reference, an invalid Date, -0, a class instance, and a key named <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__proto__</code>."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use structuredClone?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the right default: about 3 times faster here (196 ms against 564 ms on 30,000 objects). But it drops class prototypes and symbol keys, resets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lastIndex</code> and throws a DataCloneError on functions (all shown in the example). Write your own only when you need those.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why register the copy before recursing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So a cycle finds the copy under construction. Registering it after still overflowed the stack on a cycle (checked). The same map keeps a shared reference shared: without it the copy split one shared object into two.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why defineProperty instead of assignment?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a key named <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__proto__</code> (easy to get from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.parse</code>), assignment sets the prototype instead of creating a key: the naive copy inherited the injected property in the run. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defineProperty</code> creates an ordinary own key.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you avoid the stack limit on very deep data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replace the recursion with an explicit stack of pending (original, copy) pairs, the same idea as this bank's iterative flatten question. Recursion overflowed at nesting depth 10,000 here and was fine at 5,000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you add for Errors and typed arrays?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each needs its own branch: an Error came back with an empty message (native keeps it) and a typed array threw a TypeError. Copy a typed array with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice()</code> and rebuild an Error from its constructor, then copy message, stack and cause. Those two suggestions are not tested here.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Shallow vs deep copy** | A shallow copy shares nested objects; a deep copy duplicates them all |
| **Circular reference** | An object that can be reached from itself, for example \`a.self = a\` |
| **Seen-map** | A \`WeakMap\` from each original to its clone, used to break cycles and keep sharing |
| **Structured clone** | The browser and Node algorithm behind \`structuredClone\`, with its own list of supported types |

---
**Conclusion:** a correct \`deepClone\` picks the right empty shell for each type, registers it in a \`WeakMap\` BEFORE visiting the children (which handles cycles and keeps shared references shared), then copies own enumerable string and symbol keys with \`defineProperty\`. It matched \`structuredClone\` and \`isDeepStrictEqual\` on 60,000 random graphs with zero failures, keeps class instances, symbols, holes and functions that the native function drops or rejects, and every classic bug (JSON round trip, no seen-map, registering too late, the \`__proto__\` key) was reproduced rather than assumed. For plain data the native \`structuredClone\` was about 3 times faster on this machine, so reach for it first and write your own only when its limits get in the way.`,
    examples: [
      {
        label: "Real, direct proof: deepClone reproduces the exact graph shape (cycles and sharing) on random graphs, keeps what structuredClone drops, and reproduces each classic bug",
        tech: "javascript",
        runnable: true,
        code: `function deepClone(root) {
  const seen = new WeakMap();                       // original -> its clone (handles cycles AND shared references)
  const tagOf = (v) => Object.prototype.toString.call(v);

  function clone(value) {
    if (value === null || typeof value !== "object") return value;   // primitives and functions are returned as they are
    if (seen.has(value)) return seen.get(value);

    const tag = tagOf(value);
    let copy;
    switch (tag) {
      case "[object Date]": copy = new Date(value.getTime()); break;
      case "[object RegExp]":
        copy = new RegExp(value.source, value.flags);
        copy.lastIndex = value.lastIndex;
        break;
      case "[object Number]": case "[object String]": case "[object Boolean]":
        copy = Object(value.valueOf()); break;
      case "[object Map]": copy = new Map(); break;
      case "[object Set]": copy = new Set(); break;
      case "[object Array]": copy = new Array(value.length); break;    // holes stay holes
      default: copy = Object.create(Object.getPrototypeOf(value));    // keeps class instances working
    }
    seen.set(value, copy);                          // register BEFORE recursing, so a cycle finds the copy

    if (tag === "[object Map]") for (const [k, v] of value) copy.set(clone(k), clone(v));
    else if (tag === "[object Set]") for (const v of value) copy.add(clone(v));

    for (const key of Reflect.ownKeys(value)) {     // own enumerable string AND symbol keys
      if (!Object.prototype.propertyIsEnumerable.call(value, key)) continue;
      const existing = Object.getOwnPropertyDescriptor(copy, key);
      if (existing && !existing.configurable) continue;               // e.g. the index keys of a boxed String
      Object.defineProperty(copy, key, {            // defineProperty, not copy[key] = ..., so "__proto__" stays a plain key
        value: clone(value[key]), writable: true, enumerable: true, configurable: true,
      });
    }
    return copy;
  }
  return clone(root);
}

const isObj = (v) => typeof v === "object" && v !== null;
const tag = (v) => Object.prototype.toString.call(v);

// signature(): a string describing the WHOLE graph: values, kinds, keys, and which objects are shared or cyclic
function signature(root) {
  const ids = new Map(), out = [];
  (function walk(v) {
    if (!isObj(v)) { out.push(typeof v === "number" && Object.is(v, -0) ? "-0" : typeof v + ":" + String(v)); return; }
    if (ids.has(v)) { out.push("ref" + ids.get(v)); return; }
    ids.set(v, ids.size);
    out.push("obj" + ids.get(v) + ":" + tag(v) + ":" + (Object.getPrototypeOf(v) === null ? "null-proto" : "proto"));
    if (v instanceof Date) out.push("time" + v.getTime());
    if (v instanceof RegExp) out.push("re" + v.source + "/" + v.flags + "/" + v.lastIndex);
    if (v instanceof Map) for (const [k, x] of v) { walk(k); walk(x); }
    if (v instanceof Set) for (const x of v) walk(x);
    if (["[object Number]", "[object String]", "[object Boolean]"].includes(tag(v))) out.push("box" + String(v.valueOf()));
    if (Array.isArray(v)) out.push("len" + v.length);
    for (const k of Reflect.ownKeys(v)) if (Object.prototype.propertyIsEnumerable.call(v, k)) { out.push("key:" + String(k)); walk(v[k]); }
  })(root);
  return out.join("|");
}
function reachable(root) {
  const seen = new Set();
  (function walk(v) {
    if (!isObj(v) || seen.has(v)) return;
    seen.add(v);
    if (v instanceof Map) for (const [k, x] of v) { walk(k); walk(x); }
    if (v instanceof Set) for (const x of v) walk(x);
    for (const k of Reflect.ownKeys(v)) if (Object.prototype.propertyIsEnumerable.call(v, k)) walk(v[k]);
  })(root);
  return seen;
}

// 1. the shapes deepClone is meant to handle, in one object with a cycle and a shared reference
const shared = { note: "shared" };
const input = {
  date: new Date(0), invalidDate: new Date(NaN), re: /a+/gi, map: new Map([["k", { deep: 1 }], [{ objKey: 1 }, "v"]]),
  set: new Set([1, { inSet: true }]), list: [1, [2, [3]]], nan: NaN, negZero: -0, boxed: new Number(5), a: shared, b: shared,
};
input.self = input;
const copy = deepClone(input);
console.log("Date:", copy.date instanceof Date && copy.date !== input.date && copy.date.getTime() === 0, "| invalid Date stays invalid:", Number.isNaN(copy.invalidDate.getTime()));
console.log("RegExp:", String(copy.re), copy.re !== input.re, "| Map:", copy.map instanceof Map, copy.map.get("k").deep, copy.map.get("k") !== input.map.get("k"), "| Set:", copy.set.size);
console.log("NaN:", Number.isNaN(copy.nan), "| -0 kept:", Object.is(copy.negZero, -0), "| boxed Number:", copy.boxed instanceof Number, copy.boxed.valueOf());
console.log("cycle preserved:", copy.self === copy, "| the copy does not point back at the input:", copy.self !== input);
console.log("shared reference stays shared:", copy.a === copy.b, "| but is a new object:", copy.a !== shared);
console.log("same graph shape:", signature(copy) === signature(input), "| shares no object with the input:", ![...reachable(copy)].some((o) => reachable(input).has(o)));

// 2. things structuredClone cannot do (or does differently)
class Point { constructor(x) { this.x = x; } norm() { return Math.abs(this.x); } }
const sym = Symbol("s");
const rich = { p: new Point(-3), [sym]: "symbol value", fn: function named() {}, holes: [1, , 3], arr: Object.assign([1, 2], { extra: "e" }), re: Object.assign(/a/g, { lastIndex: 3 }) };
const rc = deepClone(rich);
console.log("deepClone keeps the class:", Object.getPrototypeOf(rc.p) === Point.prototype, rc.p.norm(), "| symbol key:", rc[sym], "| function by reference:", rc.fn === rich.fn, "| holes:", !(1 in rc.holes), "| array extra prop:", rc.arr.extra, "| lastIndex:", rc.re.lastIndex);
try { structuredClone(rich); } catch (e) { console.log("structuredClone(rich) throws:", e.constructor.name); }
const sc = structuredClone({ p: new Point(-3), [sym]: 1, re: Object.assign(/a/g, { lastIndex: 3 }) });
console.log("structuredClone drops the class:", Object.getPrototypeOf(sc.p) === Point.prototype, "| symbol keys:", Object.getOwnPropertySymbols(sc).length, "| lastIndex reset to:", sc.re.lastIndex);

// 3. the usual shortcut and the usual bugs
const viaJson = JSON.parse(JSON.stringify({ d: new Date(0), u: undefined, n: NaN, m: new Map([[1, 2]]), s: new Set([1]), r: /x/g, z: -0 }));
console.log("JSON round trip:", JSON.stringify(viaJson), "| d is a", typeof viaJson.d, "| -0 kept:", Object.is(viaJson.z, -0));
const cycle = {}; cycle.self = cycle;
try { JSON.parse(JSON.stringify(cycle)); } catch (e) { console.log("JSON round trip on a cycle:", e.constructor.name); }
function noSeen(v) { if (!isObj(v)) return v; const o = Array.isArray(v) ? [] : {}; for (const k of Object.keys(v)) o[k] = noSeen(v[k]); return o; }
try { noSeen(cycle); } catch (e) { console.log("recursing without a seen map:", e.constructor.name); }
function seenTooLate(v, seen = new WeakMap()) { if (!isObj(v)) return v; if (seen.has(v)) return seen.get(v); const o = Array.isArray(v) ? [] : {}; for (const k of Object.keys(v)) o[k] = seenTooLate(v[k], seen); seen.set(v, o); return o; }
try { seenTooLate(cycle); } catch (e) { console.log("registering the copy after recursing:", e.constructor.name); }
const two = { a: shared, b: shared }, split = noSeen(two);
console.log("without a seen map the shared reference splits in two:", split.a !== split.b);

const poisoned = JSON.parse('{"__proto__": {"injected": true}, "ok": 1}');
const naive = {}; for (const k of Object.keys(poisoned)) naive[k] = poisoned[k];
const safe = deepClone(poisoned);
console.log("__proto__ key, naive copy inherits injected:", naive.injected, "| deepClone keeps it as own data:", Object.hasOwn(safe, "__proto__"), "inherits:", safe.injected, "| Object.prototype clean:", ({}).injected);
console.log("Error is NOT handled: deepClone message:", JSON.stringify(deepClone(new Error("boom")).message), "| structuredClone message:", JSON.stringify(structuredClone(new Error("boom")).message));

// 4. random graphs: deepClone must reproduce the shape exactly and share nothing with the input
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(99), pick = (arr) => arr[Math.floor(rnd() * arr.length)];
function gen(depth) {
  if (depth > 3 || rnd() < 0.3) return pick([null, undefined, true, 0, -0, 1, 42, 3.14, NaN, Infinity, "", "a", 10n]);
  const r = rnd();
  if (r < 0.25) return Array.from({ length: Math.floor(rnd() * 4) }, () => gen(depth + 1));
  if (r < 0.55) { const o = {}; for (let i = 0, n = Math.floor(rnd() * 4); i < n; i++) Object.defineProperty(o, pick(["a", "b", "1", "__proto__", "d e"]), { value: gen(depth + 1), writable: true, enumerable: true, configurable: true }); return o; }
  if (r < 0.65) return new Date(pick([0, 1e12, NaN]));
  if (r < 0.72) return new RegExp(pick(["a+", "^x$", ""]), pick(["", "g", "gi", "m"]));
  if (r < 0.78) return pick([new Number(5), new String("ab"), new Boolean(false)]);
  if (r < 0.9) { const m = new Map(); for (let i = 0, n = Math.floor(rnd() * 3); i < n; i++) m.set(rnd() < 0.5 ? pick(["k", 1, NaN]) : gen(depth + 1), gen(depth + 1)); return m; }
  const s = new Set(); for (let i = 0, n = Math.floor(rnd() * 4); i < n; i++) s.add(rnd() < 0.5 ? pick(["k", 1, NaN]) : gen(depth + 1)); return s;
}
let cases = 0, cyclic = 0, badShape = 0, badShared = 0, badNative = 0;
for (let n = 0; n < 20000; n++) {
  const x = gen(0);
  if (isObj(x) && rnd() < 0.4) {
    const nodes = [...reachable(x)], host = pick(nodes), target = pick(nodes);
    if (Array.isArray(host)) host.push(target); else if (host instanceof Map) host.set("cyc", target); else if (host instanceof Set) host.add(target); else if (tag(host) === "[object Object]") host.cyc = target;
    cyclic++;
  }
  const c = deepClone(x);
  cases++;
  if (signature(c) !== signature(x)) badShape++;
  const rx = reachable(x);
  if ([...reachable(c)].some((o) => rx.has(o))) badShared++;
  if (signature(c) !== signature(structuredClone(x))) badNative++;
}
console.log("20,000 random graphs (" + cyclic + " with extra cycles or sharing): shape differs from the input:", badShape, "| shares an object with it:", badShared, "| differs from structuredClone:", badNative);

// 5. limits
for (const depth of [1000, 5000, 10000]) {
  let deep = {}, cur = deep;
  for (let i = 0; i < depth; i++) { cur.next = {}; cur = cur.next; }
  let mine = "ok", native = "ok";
  try { deepClone(deep); } catch (e) { mine = e.constructor.name; }
  try { structuredClone(deep); } catch (e) { native = e.constructor.name; }
  console.log("nesting depth", depth, "| deepClone:", mine, "| structuredClone:", native);
}`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement a minimal Promise/A+ (MyPromise) with then/catch",
    seoDescription: "A minimal Promise/A+ MyPromise passes all 872 official tests; removing one feature fails 2 to 567 of them, and native promises differ only in tick counts.",
    description: `**Problem, as an interviewer would state it:**
"Implement a \`MyPromise\` class with a constructor that takes an executor, \`then\`, \`catch\`, and static \`resolve\` and \`reject\`. It must handle chaining and thenables. Discuss edge cases, runtime, and alternatives."

**Examples:**

\`\`\`
MyPromise.resolve(1).then((v) => v + 1).then((v) => { throw new Error("boom " + v); })
  .catch((e) => e.message).then((v) => v + "!");                      // "boom 2!"
MyPromise.resolve({ then(resolve) { resolve("adopted"); } });          // a thenable is adopted: "adopted"
\`\`\`

**Clarifying questions expected:**
- Which specification should it follow (Promises/A+), and how asynchronous must the callbacks be?
- Should it accept any thenable (an object with a \`then\` method), not just its own instances?
- Which extras are wanted: \`finally\`, \`all\`, \`race\`, unhandled-rejection reporting?

**Code / implementation expected:** Yes — a real, working class, ideally run against the official Promises/A+ conformance suite.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Hard

> **How to read this doc:** Promises/A+ is a small spec (a few rules about \`then\` plus one resolution procedure) and it has an official test suite, so this solution was not just demoed: it was run against \`promises-aplus-tests\` version 2.1.2 and passed all 872 tests. Then the design was stress-tested by removing ONE feature at a time and re-running the suite (each removal fails between 2 and 567 tests), and compared with the native \`Promise\`, which showed one real difference: how many microtask ticks things take.

## 1. The problem, restated

Build a \`MyPromise\` class: a constructor taking an \`executor(resolve, reject)\`, a \`then(onFulfilled, onRejected)\` that returns a NEW promise (that is what makes chaining work), a \`catch\`, and static \`resolve\` and \`reject\`. It must follow Promises/A+: a promise settles once, callbacks always run asynchronously, and returning a promise (or any "thenable", an object with a \`then\` method) from a callback makes the next promise adopt its outcome. As a bonus, \`finally\` is included.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Which spec? | Promises/A+ defines \`then\` and the resolution procedure. ECMAScript adds more: exact tick counts, unhandled-rejection tracking, \`all\`/\`race\`/\`any\`, subclassing. |
| How asynchronous? | A+ only requires callbacks to run "from a fresh stack". A microtask (\`queueMicrotask\`) matches native behaviour; \`setTimeout\` also passes the suite but runs later than native callbacks. |
| Thenables? | Yes: any object or function with a \`then\` method must be adopted, not only your own class. |
| Extras? | \`finally\`, \`all\` and \`race\` are ECMAScript features, not A+. \`finally\` is shown here; the rest are follow-ups. |
| Unhandled rejections? | Not part of A+. The native promise reports them; this class stays silent (checked in Node). |

## 3. Thought process

The brute-force version is a state machine: \`state\`, \`value\`, and a list of callbacks; \`then\` pushes a callback, and \`resolve\` runs them. It breaks on four things, and each one is a feature of the final design.

- **\`then\` must return a promise.** The returned promise settles with whatever the callback returns (or rejects if it throws), so \`then\` wraps the callback inside a new \`MyPromise\`.
- **Callbacks must be asynchronous**, even for an already-settled promise, otherwise the same code is sometimes synchronous and sometimes not (nicknamed "Zalgo"). Running them synchronously fails 22 of the 872 tests.
- **Returning a promise or thenable must be adopted.** That is the A+ resolution procedure: reject a promise resolved with itself, and otherwise, if the value has a \`then\` function, call it and follow it.
- **Misbehaving thenables must be contained.** A thenable may call both callbacks, call them repeatedly, throw before or after calling them, or have a \`then\` getter that throws. Once-only guards and \`try/catch\` handle all of these.

The insight is that those four requirements need only one state machine, one handler queue and one recursive resolution function.

## 4. Verified solution

\`\`\`js
const PENDING = 0, FULFILLED = 1, REJECTED = 2;

class MyPromise {
  constructor(executor) {
    this.state = PENDING;
    this.value = undefined;
    this.handlers = [];
    let locked = false;                         // resolve/reject may only act once
    const resolve = (x) => { if (locked) return; locked = true; this.resolveWith(x); };
    const reject = (r) => { if (locked) return; locked = true; this.settle(REJECTED, r); };
    try { executor(resolve, reject); } catch (e) { reject(e); }
  }

  // the Promises/A+ resolution procedure, [[Resolve]](promise, x)
  resolveWith(x) {
    if (x === this) return this.settle(REJECTED, new TypeError("Chaining cycle detected for promise"));
    if (x !== null && (typeof x === "object" || typeof x === "function")) {
      let then;
      try { then = x.then; } catch (e) { return this.settle(REJECTED, e); }
      if (typeof then === "function") {
        let called = false;
        try {
          then.call(
            x,
            (y) => { if (called) return; called = true; this.resolveWith(y); },
            (r) => { if (called) return; called = true; this.settle(REJECTED, r); }
          );
        } catch (e) {
          if (!called) { called = true; this.settle(REJECTED, e); }
        }
        return;
      }
    }
    this.settle(FULFILLED, x);
  }

  settle(state, value) {
    if (this.state !== PENDING) return;
    this.state = state;
    this.value = value;
    const queued = this.handlers;
    this.handlers = [];
    for (const run of queued) queueMicrotask(run);
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const run = () => {
        const ok = this.state === FULFILLED;
        const cb = ok ? onFulfilled : onRejected;
        if (typeof cb !== "function") return (ok ? resolve : reject)(this.value);
        try { resolve(cb(this.value)); } catch (e) { reject(e); }
      };
      if (this.state === PENDING) this.handlers.push(run);
      else queueMicrotask(run);
    });
  }

  catch(onRejected) { return this.then(undefined, onRejected); }

  finally(fn) {
    return this.then(
      (v) => MyPromise.resolve(fn()).then(() => v),
      (r) => MyPromise.resolve(fn()).then(() => { throw r; })
    );
  }

  static resolve(x) { return x instanceof MyPromise ? x : new MyPromise((res) => res(x)); }
  static reject(r) { return new MyPromise((_, rej) => rej(r)); }
}
\`\`\`

\`\`\`
real, verified output:

  the official Promises/A+ conformance suite (promises-aplus-tests 2.1.2, Node v24.19.0):
    872 passing, 0 failing

  the same suite with ONE feature removed at a time (number of failing tests):
    callbacks run synchronously instead of from a microtask                    22
    no check for a promise resolved with itself                                 2
    thenable callbacks not guarded to run only once                            60
    resolve and reject not locked, and settle no longer ignores a second settle 4
    x.then read outside try/catch                                              54
    only MyPromise instances adopted, not general thenables                   567
    an exception in a then callback not turned into a rejection                10

  behaviour checked side by side with the native Promise (the example below prints these):
    executor runs synchronously, callbacks never do            same order as native
    chain: resolve(1).then(+1).then(throw).then(skipped).catch(message).then(+"!")  -> "boom 2!"
    thenable calls resolve, reject, resolve                      first call wins ("first")
    thenable throws after resolving                              ignored ("kept")
    thenable throws before resolving, or its then getter throws  rejection with that error
    a promise resolved with itself                               TypeError (Chaining cycle detected)
    resolve(p) === p                                             true, like native
    finally: value ignored, throw overrides, rejected promise overrides, waits for a returned promise   5 of 5 same as native
    await on a MyPromise                                         works (await adopts any thenable)
    a 100,000-link then chain                                    resolves, no stack growth

  where it is NOT identical to the native promise:
    a then callback that returns a same-class promise, next then runs after:  native 3 ticks, MyPromise 2 ticks
    (returning a plain value: identical, 1 tick)
    an unhandled rejection: native emits unhandledRejection in Node, MyPromise emits nothing
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="a promise settles once and then queues its callbacks as microtasks, and the value handed to the next promise goes through one resolution procedure that rejects self resolution, adopts anything with a then method, and otherwise fulfills">
  <defs>
    <marker id="mypromise-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">One resolution procedure decides every outcome</text>
  <rect class="d-box-muted" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text" x="159" y="70" text-anchor="middle">state: pending, then settled once</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">handlers wait in a queue until it settles</text>
  <rect class="d-box-accent" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text d-accent" x="476" y="70" text-anchor="middle">resolve(x): self, thenable, or value</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">TypeError, adopt via then, or fulfill</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">every callback runs from a microtask, never synchronously, so the order is always predictable</text>
</svg>

## 5. Complexity

\`then\`, \`resolve\` and \`reject\` are O(1) apart from queuing; settling a promise with \`h\` waiting handlers costs O(h), since each handler runs exactly once. A chain of \`n\` promises costs O(n) time and memory, and it never recurses: every handler runs from the microtask queue, which is why the 100,000-link chain finished without growing the call stack.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| Resolve a promise with itself | Rejects with a \`TypeError\` | The \`x === this\` check would otherwise wait on itself forever |
| Thenable calls \`resolve\` then \`reject\` | The first call wins | The \`called\` flag makes the callbacks once-only |
| Thenable throws after resolving | Ignored | The exception is caught but \`called\` is already true |
| Reading \`x.then\` throws | The promise rejects with that error | The read sits inside \`try/catch\` |
| \`then\` given a non-function | The value or reason passes through | \`typeof cb !== "function"\` skips it |
| Executor throws after \`resolve\` | Ignored | \`resolve\` and \`reject\` are locked after the first call |
| Handlers added before or after settling | Run in registration order, always asynchronously | A queue while pending, \`queueMicrotask\` afterwards |

## 7. Common Pitfalls

- **Running callbacks synchronously.** The most common bug. It looks fine in a demo and fails 22 official tests, because it makes ordering depend on whether the promise happened to be settled already.
- **Forgetting the once-only guards.** Without the \`called\` flags in the thenable branch, 60 tests fail; without locking \`resolve\` and \`reject\` in the constructor, 4 fail.
- **Reading \`x.then\` outside \`try/catch\`.** A getter can throw, so the read needs protecting (54 tests fail without it), and A+ wants the property read once, which is why the code stores it in a variable first.
- **Adopting only your own class.** Checking \`x instanceof MyPromise\` instead of looking for a \`then\` function fails 567 tests and breaks interoperability with every other promise library and with \`await\`.
- **Letting \`finally\` change the result.** Its callback's return value must be ignored, except that a throw or a rejected promise overrides; the five cases in the example match the native promise.
- **Assuming "A+ compliant" means "same timing as native".** It does not: a callback that returns a promise takes 3 ticks natively and 2 here, and A+ says nothing about tick counts.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"A class with an executor, then, catch, static resolve and reject, following Promises/A+. Callbacks must be asynchronous and any thenable must be adopted -- is that right?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brute force first:</strong> <span style="color:#f0e2c8;">"A state, a value and a callback list; resolve runs the callbacks. It has no chaining, runs callbacks synchronously, and cannot adopt a promise returned from a callback."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the bottleneck:</strong> <span style="color:#f0e2c8;">"Four things: then must return a new promise, callbacks must be asynchronous, a returned promise or thenable must be adopted through one resolution procedure, and a misbehaving thenable must be contained."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"State plus a handler queue. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">then</code> wraps the callback in a new MyPromise and schedules it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queueMicrotask</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">resolveWith</code> rejects self-resolution and otherwise follows any thenable inside once-only guards."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"I would run the official promises-aplus-tests suite, plus a thenable that calls resolve twice, one whose then getter throws, and a promise resolved with itself."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must callbacks run asynchronously, even for an already-settled promise?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So the same code never behaves two ways (nicknamed "Zalgo"): callbacks always run after the current code finishes, so ordering is predictable. In the mutation run, calling them synchronously failed 22 of the 872 official tests.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is passing the Promises/A+ suite the same as behaving like the native Promise?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A+ says nothing about how many microtask ticks things take. Measured here: when a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">then</code> callback returns a promise, the next <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">then</code> ran after 3 ticks on the native promise but 2 on MyPromise; for a plain return value they are identical. The native specification queues an extra job to call the thenable's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">then</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you report unhandled rejections?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Remember whether a rejected promise ever received a handler, and check after the microtask queue has drained (for example from a timer). Node emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unhandledRejection</code> for the native promise and, as checked here, nothing for MyPromise.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add Promise.all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return a new MyPromise; wrap each item with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MyPromise.resolve</code> so plain values and thenables work; store each result by index and count completions; resolve with the array when the count reaches the length; reject on the first rejection; an empty iterable resolves immediately with an empty array. This is a design sketch, not part of the tested code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does await work with it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> adopts any thenable, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await MyPromise.resolve("awaited")</code> works (it is checked in the example).</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Thenable** | Any object or function with a \`then\` method; it can be adopted by a promise |
| **Resolution procedure** | The A+ algorithm that decides what a promise becomes when given a value \`x\` |
| **Microtask** | A callback queued to run right after the current code finishes, before timers |
| **Zalgo** | An API that is sometimes synchronous and sometimes asynchronous, making ordering unpredictable |

---
**Conclusion:** a minimal Promise/A+ is a state machine (pending, then settled once), a queue of handlers, a \`then\` that returns a new promise, and one resolution procedure that rejects self-resolution, adopts any thenable inside once-only guards and \`try/catch\`, and otherwise fulfills. Every callback runs from a microtask. It passed all 872 official tests, and removing any single one of those pieces made between 2 and 567 tests fail, which is a measure of how much each one carries. The one measured difference from the native promise is timing: returning a promise from a callback takes 3 microtask ticks natively and 2 here.`,
    examples: [
      {
        label: "Real, direct proof: MyPromise matches the native Promise on chaining, thenables, once-only guards and finally, and differs only in microtask tick counts",
        tech: "javascript",
        runnable: true,
        code: `const PENDING = 0, FULFILLED = 1, REJECTED = 2;

class MyPromise {
  constructor(executor) {
    this.state = PENDING;
    this.value = undefined;
    this.handlers = [];
    let locked = false;                         // resolve/reject may only act once
    const resolve = (x) => { if (locked) return; locked = true; this.resolveWith(x); };
    const reject = (r) => { if (locked) return; locked = true; this.settle(REJECTED, r); };
    try { executor(resolve, reject); } catch (e) { reject(e); }
  }

  // the Promises/A+ resolution procedure, [[Resolve]](promise, x)
  resolveWith(x) {
    if (x === this) return this.settle(REJECTED, new TypeError("Chaining cycle detected for promise"));
    if (x !== null && (typeof x === "object" || typeof x === "function")) {
      let then;
      try { then = x.then; } catch (e) { return this.settle(REJECTED, e); }
      if (typeof then === "function") {
        let called = false;
        try {
          then.call(
            x,
            (y) => { if (called) return; called = true; this.resolveWith(y); },
            (r) => { if (called) return; called = true; this.settle(REJECTED, r); }
          );
        } catch (e) {
          if (!called) { called = true; this.settle(REJECTED, e); }
        }
        return;
      }
    }
    this.settle(FULFILLED, x);
  }

  settle(state, value) {
    if (this.state !== PENDING) return;
    this.state = state;
    this.value = value;
    const queued = this.handlers;
    this.handlers = [];
    for (const run of queued) queueMicrotask(run);
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const run = () => {
        const ok = this.state === FULFILLED;
        const cb = ok ? onFulfilled : onRejected;
        if (typeof cb !== "function") return (ok ? resolve : reject)(this.value);
        try { resolve(cb(this.value)); } catch (e) { reject(e); }
      };
      if (this.state === PENDING) this.handlers.push(run);
      else queueMicrotask(run);
    });
  }

  catch(onRejected) { return this.then(undefined, onRejected); }

  finally(fn) {
    return this.then(
      (v) => MyPromise.resolve(fn()).then(() => v),
      (r) => MyPromise.resolve(fn()).then(() => { throw r; })
    );
  }

  static resolve(x) { return x instanceof MyPromise ? x : new MyPromise((res) => res(x)); }
  static reject(r) { return new MyPromise((_, rej) => rej(r)); }
}

(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const settle = async (p) => {
    try { return "fulfilled:" + String(await p); } catch (e) { return "rejected:" + (e && e.message ? e.message : String(e)); }
  };

  // 1. the executor runs synchronously, callbacks never do (same as the native Promise)
  for (const [label, P] of [["native   ", Promise], ["MyPromise", MyPromise]]) {
    const log = [];
    log.push("sync-1");
    new P((resolve) => { log.push("executor"); resolve(1); }).then(() => log.push("then callback"));
    log.push("sync-2");
    await wait(10);
    console.log(label, "order:", log.join(" > "));
  }

  // 2. chaining, error propagation and recovery
  const chained = MyPromise.resolve(1)
    .then((v) => v + 1)
    .then((v) => { throw new Error("boom " + v); })
    .then(() => "skipped")
    .catch((e) => e.message)
    .then((v) => v + "!");
  console.log("chain:", await settle(chained));
  console.log("callbacks that are not functions are skipped:", await settle(MyPromise.resolve(5).then(undefined).then(null).then(7)));
  console.log("a rejection skips then(ok) and reaches the next catch:", await settle(MyPromise.reject(new Error("e")).then(1, undefined)));

  // 3. thenables (any object with a then method) are adopted, and their misbehaviour is contained
  console.log("plain thenable:", await settle(MyPromise.resolve({ then(res) { res("from thenable"); } })));
  console.log("thenable returned from a then callback:", await settle(MyPromise.resolve(1).then(() => ({ then(res) { res("adopted"); } }))));
  console.log("callbacks called more than once, first wins:", await settle(MyPromise.resolve({ then(res, rej) { res("first"); rej(new Error("second")); res("third"); } })));
  console.log("then throws after resolving, ignored:", await settle(MyPromise.resolve({ then(res) { res("kept"); throw new Error("ignored"); } })));
  console.log("then throws before resolving, rejection:", await settle(MyPromise.resolve({ then() { throw new Error("then threw"); } })));
  console.log("reading .then throws, rejection:", await settle(MyPromise.resolve(Object.defineProperty({}, "then", { get() { throw new Error("getter threw"); } }))));
  console.log("nested thenables unwrap:", await settle(MyPromise.resolve({ then(res) { res({ then(r2) { r2("two levels"); } }); } })));

  // 4. a promise can never be resolved with itself
  let self;
  self = new MyPromise((res) => setTimeout(() => res(self), 0));
  console.log("resolve(self):", await settle(self), "| native:", await settle((() => { let p; p = new Promise((res) => setTimeout(() => res(p), 0)); return p; })()));

  // 5. executor errors and resolve/reject only counting once
  console.log("executor throws before resolving:", await settle(new MyPromise(() => { throw new Error("executor threw"); })));
  console.log("executor throws after resolving, ignored:", await settle(new MyPromise((res) => { res("kept"); throw new Error("ignored"); })));
  console.log("reject after resolve is ignored:", await settle(new MyPromise((res, rej) => { res("a"); rej(new Error("b")); })));

  // 6. await works with it because await adopts any thenable
  console.log("await on a MyPromise:", await MyPromise.resolve("awaited"));

  // 7. static resolve returns the same promise for a MyPromise, like the native one
  const mp = MyPromise.resolve(1), np = Promise.resolve(1);
  console.log("resolve(p) === p, MyPromise:", MyPromise.resolve(mp) === mp, "| native:", Promise.resolve(np) === np);

  // 8. finally: same outcomes as the native promise
  const finallyCases = {
    "callback returns a value": (P) => P.resolve("ok").finally(() => "ignored"),
    "callback throws": (P) => P.resolve("ok").finally(() => { throw new Error("from finally"); }),
    "callback returns a rejected promise": (P) => P.resolve("ok").finally(() => P.reject(new Error("rejected in finally"))),
    "rejection passes through": (P) => P.reject(new Error("original")).finally(() => "ignored"),
    "waits for a returned promise": (P) => P.resolve("ok").finally(() => new P((r) => setTimeout(r, 5))),
  };
  for (const [name, make] of Object.entries(finallyCases)) {
    const a = await settle(make(Promise)), b = await settle(make(MyPromise));
    console.log("finally,", name + ":", b, a === b ? "(same as native)" : "(DIFFERENT from native: " + a + ")");
  }

  // 9. Promises/A+ does not fix how many microtask ticks things take; the native promise is slower for thenables
  const ticks = async (P, returnsPromise) => {
    const log = [];
    P.resolve().then(returnsPromise ? () => P.resolve("v") : () => "v").then(() => log.push("A"));
    let b = P.resolve();
    for (let i = 1; i <= 5; i++) b = b.then(() => log.push("B" + i));
    await wait(10);
    return log.join(" ");
  };
  console.log("chain A returns a plain value  , native:", await ticks(Promise, false), "| MyPromise:", await ticks(MyPromise, false));
  console.log("chain A returns a same-class promise, native:", await ticks(Promise, true), "| MyPromise:", await ticks(MyPromise, true));

  // 10. a long chain does not grow the call stack, because every handler runs from the microtask queue
  let chain = MyPromise.resolve(0);
  for (let i = 0; i < 100000; i++) chain = chain.then((v) => v + 1);
  console.log("100,000-link chain resolves to", await chain);
})();`,
      },
    ],
  },
];

export default augments;
