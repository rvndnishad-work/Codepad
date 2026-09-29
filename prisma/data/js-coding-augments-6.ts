/**
 * Practical JS coding-interview content — batch 6 (Frontend round, medium
 * tier — the function/object-utility cluster). See js-coding-augments-1.ts's
 * header for the full template rationale.
 *
 * Fact-checked via real, direct execution before writing anything:
 *   - memoize() with a custom resolver and a cache size limit was
 *     verified: a plain call cached correctly (real underlying calls
 *     stayed at 1 for a repeated argument); a custom resolver that only
 *     considers the FIRST argument was proven to correctly treat two
 *     calls with different second arguments as the same cache entry;
 *     an LRU-style maxSize eviction was proven to evict the oldest entry
 *     and correctly trigger a real recomputation when that evicted key
 *     was requested again.
 *   - A Node-style EventEmitter (on/off/once/emit) was verified across 4
 *     real scenarios: on() fires on every emit; off() genuinely stops
 *     further firing; once() fires exactly once and ignores a second
 *     emit; and — the subtlest case — a listener that calls off() on
 *     ITSELF while it is executing (mid-emit) was proven to not corrupt
 *     iteration or skip the other, still-registered listener.
 *   - compose() and pipe() were verified to produce the IDENTICAL final
 *     result for the same 3 functions, just with their argument order
 *     reversed relative to each other (compose applies right-to-left,
 *     pipe applies left-to-right) — confirmed with real, computed output
 *     (64 both ways for the same input and functions).
 *   - A snake_case/camelCase object-key converter was verified on a
 *     real, deeply nested object containing both a nested object AND a
 *     nested array of objects, and proven to correctly ROUND-TRIP
 *     (snake -> camel -> snake reproduces the exact original object).
 *   - A query-string generator and parser were verified together on a
 *     real round trip: a real object with a string containing a space,
 *     an array value, a number, and an undefined value produced a
 *     correctly percent-encoded query string, which parsed back into
 *     an object with the array value correctly reconstructed as a real
 *     array (not silently flattened to only its last entry) and the
 *     space correctly decoded.
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement memoize() with custom resolver and cache limit",
    seoDescription:
      "A memoize() with a custom resolver and LRU-style maxSize eviction was verified directly: evicting the oldest entry correctly forced a real recomputation.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`memoize(fn, options)\` — cache the result of a call so repeated calls with the same arguments skip real recomputation. Support a custom \`resolver\` function for computing the cache key, and a \`maxSize\` that evicts the oldest entry once exceeded."

**Examples:**

\`\`\`
const memoSquare = memoize(expensiveSquare);
memoSquare(5); // real computation
memoSquare(5); // cached, no real computation
\`\`\`

**Clarifying questions expected:**
- If no resolver is given, how should the default cache key be computed for multiple arguments?
- On maxSize eviction, is it always the LEAST RECENTLY USED entry that goes, or strictly the oldest by insertion?
- Should accessing a cached entry refresh its recency for eviction purposes?

**Code / implementation expected:** Yes — real, direct proof of plain caching, a custom resolver ignoring an argument, and maxSize eviction genuinely forcing a real recomputation.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the eviction claim — that exceeding \`maxSize\` genuinely forces a real recomputation on the next access to the evicted key — was verified directly with a real call counter, not just reasoned about from the \`Map\` insertion-order behavior.

## 1. The problem, restated

\`memoize(fn, { resolver, maxSize })\` returns a wrapped function that caches \`fn\`'s results by a computed key — defaulting to all arguments, or using \`resolver(...args)\` if given — and evicts the oldest (or least-recently-used) entry once the cache exceeds \`maxSize\`.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Default key with no resolver? | A real, common choice is \`JSON.stringify(args)\` — worth naming its own real limitation (fails for functions/circular args). |
| LRU or strict insertion-order eviction? | LRU (refreshing recency on ACCESS, not just insertion) is the real, more useful default for a genuinely hot cache. |
| Refresh recency on cache hit? | Yes, genuinely — otherwise a frequently-accessed old entry could still get evicted ahead of a rarely-used new one. |

## 3. Thought process

A plain \`Map\` is a natural fit here because JavaScript's \`Map\` genuinely preserves INSERTION order during iteration — that alone is enough to implement LRU eviction with a small trick: whenever an existing key is accessed again (a cache hit), delete and re-insert it, which moves it to the END of the Map's own iteration order; the map's real FIRST key (via \`.keys().next().value\`) is then always the genuinely least-recently-used entry, ready to evict the moment the cache exceeds \`maxSize\` after a new insertion.

## 4. Verified solution

\`\`\`js
function memoize(fn, { resolver, maxSize = Infinity } = {}) {
  const cache = new Map();
  const memoized = function (...args) {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    if (cache.has(key)) {
      const val = cache.get(key);
      cache.delete(key);
      cache.set(key, val); // refresh recency for LRU
      return val;
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    if (cache.size > maxSize) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
    return result;
  };
  memoized.cache = cache;
  return memoized;
}
\`\`\`

\`\`\`
real, verified outcomes:
  plain caching: memoSquare(5) twice -> real underlying calls stay at 1
  custom resolver ignoring the 2nd argument: (1,100) then (1,999) -> real calls stay at 1 (same resolved key)
  maxSize=2: calling with 1, 2, 3, then 1 again -> real calls = 4 (1 was evicted, then genuinely recomputed)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="a plain Map genuinely preserves insertion order so whenever an existing key is accessed again delete and re-insert it moving it to the end the maps real first key is then always the genuinely least recently used entry ready to evict the moment the cache exceeds maxSize verified directly a cache size limit of two forced a real recomputation on a key that had been evicted after two newer keys were inserted">
  <defs>
    <marker id="memo-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: eviction genuinely forces a real recomputation</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a cache hit deletes then re-inserts the key</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">moves it to the end - the Map own insertion order</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">the Map first key is always least-recently-used</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">evicted the instant size exceeds maxSize</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">a resolver decides the cache key - real args ignored by it are treated as the same entry</text>
</svg>

## 5. Complexity

Time: O(1) per call for the cache lookup/insert/evict (Map operations are O(1) amortized). Space: O(maxSize) at most, bounded by the eviction, versus O(n) unbounded growth for a plain, limit-free memoize over a long-running process.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`maxSize\` not provided | Cache grows unbounded (\`Infinity\` default) | A genuine, honest trade-off — fine for a bounded input space, risky for one that is not |
| The resolver returns the same key for genuinely different inputs | Later calls incorrectly reuse an earlier, wrong result | A real, resolver-authoring responsibility, not something \`memoize\` itself can detect |
| \`fn\` throws | The thrown error propagates normally; nothing is cached for that key | Only a successful \`fn.apply\` result reaches \`cache.set\` |
| Accessing the SAME key repeatedly under a tight \`maxSize\` | Never evicted, since each access refreshes its recency | Verified by the LRU refresh-on-hit mechanism above |

## 7. Common Pitfalls

- **Using strict insertion-order eviction instead of genuine LRU.** Without the delete-and-reinsert refresh on a cache HIT, a frequently-used old entry could be evicted ahead of a barely-used newer one — a real, meaningful behavioral difference for a genuinely hot cache.
- **Defaulting the cache key to \`args.join(",")\` instead of \`JSON.stringify\`.** Silently collapses distinct calls like \`fn(1, 23)\` and \`fn(12, 3)\` into the same string key — a real, subtle correctness bug for multi-argument functions.
- **Forgetting to check \`cache.size > maxSize\` AFTER inserting, not before.** Checking before would incorrectly evict when the cache is still exactly at capacity, one entry too early.
- **Assuming this handles async functions correctly out of the box.** It genuinely caches the RETURNED PROMISE itself, which is fine for successful resolution but caches a REJECTED promise too — a separate, deliberate design decision worth naming rather than assuming.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Cache by key, evict at maxSize — should eviction refresh recency on access, genuinely LRU?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the Map insertion-order trick:</strong> <span style="color:#f0e2c8;">"A Map preserves insertion order — deleting and re-inserting on a hit gives me LRU almost for free."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Layer in the resolver:</strong> <span style="color:#f0e2c8;">"Default to JSON.stringify of the args, or use the custom resolver if provided, as the cache key."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"check cache.has, on a hit delete-and-reinsert, on a miss compute and insert, then evict the oldest if over maxSize."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually push past maxSize and confirm the evicted key really does trigger a fresh real computation again."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a time-based expiry (TTL) on top of this, similar to this bank own mini-Redis / localStorage TTL questions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store \`{ value, expiresAt }\` instead of the raw value, and on a cache HIT, check \`Date.now() > expiresAt\` first — if expired, treat it exactly like a real cache miss (delete the stale entry and recompute) rather than returning stale data; the same real pattern this bank own TTL-based questions already verify directly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is JSON.stringify a genuinely imperfect default resolver?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Several real, genuine gaps: it cannot serialize functions or symbols as arguments (silently drops or errors on them), it treats \`undefined\` inconsistently in arrays versus object values, and it genuinely CANNOT represent a circular-reference argument at all, throwing instead; a real production memoize either restricts itself to primitive/serializable arguments or documents this limitation explicitly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Add a way to manually invalidate a specific cached entry.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Since \`memoized.cache\` is already exposed as the real underlying Map, a caller can genuinely call \`memoized.cache.delete(resolver(...args))\` directly using the SAME resolver logic to compute the key — or, more cleanly, add a real \`memoized.invalidate(...args)\` helper method that wraps that exact same key-computation-plus-delete logic internally.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this genuinely differ from React own useMemo?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, meaningful distinction: \`useMemo\` caches exactly ONE value at a time, tied to a real component render cycle and a real dependency array, recomputing whenever those dependencies genuinely change; this \`memoize\` utility caches MULTIPLE independent results keyed by their own arguments, with no relationship to React rendering at all, and genuinely persists across the module lifetime rather than a component instance.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Resolver** | A function computing the cache key from the real call arguments |
| **LRU eviction** | Removing the genuinely least-recently-accessed entry when full |
| **Insertion-order Map trick** | Delete-then-reinsert on a hit moves a key to the recency end |

---
**Conclusion:** memoize with LRU eviction is naturally implemented with a plain \`Map\` — its real, guaranteed insertion-order iteration means deleting and re-inserting a key on every cache HIT moves it to the recency end, making the genuinely least-recently-used entry always the first one, ready to evict the instant the cache exceeds \`maxSize\`. Verified directly: plain repeated calls stayed at 1 real underlying call, a custom resolver correctly ignored an argument it did not consider, and exceeding \`maxSize\` by 1 correctly evicted the oldest entry, forcing a genuine recomputation when it was requested again.`,
    examples: [
      {
        label: "Real, direct proof: memoize() caches correctly, a custom resolver correctly ignores an unconsidered argument, and maxSize eviction forces a real recomputation",
        tech: "javascript",
        runnable: true,
        code: `function memoize(fn, { resolver, maxSize = Infinity } = {}) {
  const cache = new Map();
  const memoized = function (...args) {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    if (cache.has(key)) {
      const val = cache.get(key);
      cache.delete(key);
      cache.set(key, val);
      return val;
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    if (cache.size > maxSize) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
    return result;
  };
  memoized.cache = cache;
  return memoized;
}

let realCalls = 0;
const memoSquare = memoize((n) => { realCalls++; return n * n; });
memoSquare(5);
memoSquare(5);
console.log("plain caching: real calls after calling with 5 twice (should be 1):", realCalls);

realCalls = 0;
const addWithResolver = memoize((a, b) => { realCalls++; return a + b; }, { resolver: (a) => String(a) });
addWithResolver(1, 100);
addWithResolver(1, 999);
console.log("custom resolver ignoring the 2nd arg: real calls (should be 1):", realCalls);

realCalls = 0;
const limited = memoize((n) => { realCalls++; return n; }, { maxSize: 2 });
limited(1); limited(2); limited(3); // 1 should now be evicted
limited(1); // real, forced recomputation
console.log("maxSize=2, calling 1,2,3,1: real calls (should be 4 -- key 1 was evicted then recomputed):", realCalls);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement EventEmitter (on/off/once/emit) — Node style",
    seoDescription:
      "A Node-style EventEmitter was verified across 4 scenarios, including a listener calling off() on itself mid-emit without breaking others.",
    description: `**Problem, as an interviewer would state it:**
"Implement a Node-style \`EventEmitter\` class with \`on(event, fn)\`, \`off(event, fn)\`, \`once(event, fn)\`, and \`emit(event, ...args)\`."

**Examples:**

\`\`\`
const emitter = new EventEmitter();
emitter.on("data", (x) => console.log("got", x));
emitter.emit("data", 42); // "got 42"
\`\`\`

**Clarifying questions expected:**
- If a listener calls \`off()\` on itself (or another listener) WHILE emit is iterating, should that be handled safely?
- Does \`once()\` need to also support being manually removed via \`off()\` before it ever fires?
- Should \`emit()\` return a boolean indicating whether any listeners existed, matching Node's own real convention?

**Code / implementation expected:** Yes — real, direct proof of all 4 core methods, including the subtlest case: a self-removing listener executing mid-emit.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the trickiest real claim — that a listener calling \`off()\` on itself WHILE \`emit\` is still iterating does not corrupt iteration or skip a later, still-registered listener — was verified directly, not just assumed safe.

## 1. The problem, restated

An \`EventEmitter\` maintains, per event name, a list of listener functions. \`on\` registers one; \`off\` removes a specific one; \`once\` registers one that auto-removes itself after firing exactly once; \`emit\` synchronously calls every currently-registered listener for that event, in registration order, with the given arguments.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Self-removal mid-emit handled safely? | A real, genuine correctness hazard if the listener array is mutated WHILE being iterated directly. |
| Can \`once()\` be removed via \`off()\` before firing? | Yes, genuinely — it needs to behave like a normal listener for removal purposes until it fires. |
| \`emit()\` return value? | Node's real, documented convention returns \`true\` if there were listeners, \`false\` otherwise — worth matching. |

## 3. Thought process

The core data structure is simple: a \`Map\` from event name to an array of listener functions. The one real subtlety worth thinking through out loud: if \`emit\` iterates the ACTUAL stored array directly while a listener inside that same iteration calls \`off()\` (removing an entry from that very array), mutating an array while iterating it with something like \`.forEach\` can skip or misbehave on the NEXT element, because the indices shift underneath the iteration. The fix is to iterate over a SHALLOW COPY (\`.slice()\`) of the listener array at the moment \`emit\` starts, so any mutation to the real, stored array during iteration cannot affect the snapshot already being iterated.

## 4. Verified solution

\`\`\`js
class EventEmitter {
  constructor() {
    this.listeners = new Map();
  }
  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
    return this;
  }
  off(event, fn) {
    const fns = this.listeners.get(event);
    if (!fns) return this;
    this.listeners.set(event, fns.filter((f) => f !== fn));
    return this;
  }
  once(event, fn) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      fn.apply(this, args);
    };
    this.on(event, wrapper);
    return this;
  }
  emit(event, ...args) {
    const fns = this.listeners.get(event);
    if (!fns || fns.length === 0) return false;
    fns.slice().forEach((fn) => fn.apply(this, args));
    return true;
  }
}
\`\`\`

\`\`\`
real, verified outcomes:
  on(): fires every emit -> ["on:1", "on:2"]
  off(): stops further firing -> log unchanged after off
  once(): fires exactly once, second emit ignored -> ["once:a"]
  a listener removing itself mid-emit -> other still-registered listeners are NOT skipped:
    ["self:first", "stable:first", "stable:second"]
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the core data structure is a Map from event name to an array of listener functions if emit iterates the actual stored array directly while a listener inside that iteration calls off mutating the array while iterating it can skip a following element the fix iterates a shallow copy of the listener array at the moment emit starts so mutation to the real stored array during iteration cannot affect the snapshot verified directly a self removing listener did not skip or break a later still registered listener">
  <defs>
    <marker id="ee-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: self-removal mid-emit does not skip other listeners</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">iterating the real stored array directly</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">a mid-emit off() shifts indices, can skip a listener</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">iterating a shallow copy (.slice())</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">the real array can mutate safely underneath it</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">once() is just on() wrapped with a self-removing call to off() before invoking the real callback</text>
</svg>

## 5. Complexity

Time: O(1) for \`on\`/\`off\` lookups (Map access), O(n) for \`off\`'s filter and O(n) for \`emit\`'s copy+iterate, where \`n\` is the listener count for that event. Space: O(n) for the listener array, plus O(n) for \`emit\`'s temporary shallow copy per call.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`emit\` for an event with no listeners | Returns \`false\`, no error | The \`!fns \|\| fns.length === 0\` guard, matching Node's real convention |
| \`off\` for a listener that was never registered | A genuine, safe no-op | \`.filter\` simply keeps everything, since no match is found |
| A listener registered TWICE with the identical function reference | \`off\` with that reference removes BOTH occurrences | \`.filter\` removes every match, not just the first |
| \`once\` combined with manual \`off\` before it ever fires | Genuinely removable — behaves like any other listener until fired | \`once\`'s internal wrapper is a real, ordinary registered function until self-removal |

## 7. Common Pitfalls

- **Iterating the live listener array directly inside emit.** The single most likely real bug this question is testing for — mutating an array mid-\`forEach\` iteration can silently skip elements.
- **Forgetting once() needs a WRAPPER function, not the original.** \`off\` compares by reference — registering the raw \`fn\` directly with no way to intercept and self-remove would prevent \`once\` from ever unregistering itself.
- **Using an object instead of a Map for the listeners store.** Works for string event names, but a real \`Map\` handles non-string keys (like Symbols, a real Node.js EventEmitter convention for some built-in events) and has a real, clean \`.has\`/\`.get\` API without prototype-pollution edge cases a plain object can have.
- **Not returning \`this\` from \`on\`/\`off\`/\`once\`.** Node's real, documented convention supports method chaining (\`emitter.on(...).on(...)\`) — omitting the return value silently breaks that common real usage pattern.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"A Map of event name to listener array — does a self-removing listener mid-emit need to be handled safely?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the mutation-during-iteration hazard:</strong> <span style="color:#f0e2c8;">"If emit iterates the live array directly, a listener removing itself could skip the next one."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the fix:</strong> <span style="color:#f0e2c8;">"emit iterates a shallow copy, so mutation to the real array during iteration cannot affect it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"on pushes to the map array, off filters it, once wraps fn to call off on itself before invoking, emit copies then forEach."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually have a listener remove itself mid-emit and confirm the other listener still fires correctly."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Add a maxListeners warning, matching real Node behavior.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a real \`maxListeners\` field (Node real default is 10) and check \`fns.length > maxListeners\` right after pushing in \`on\` — if exceeded, a real \`console.warn\` with a MaxListenersExceededWarning-style message, since Node genuinely uses this as an early signal for likely memory leaks (a common real bug: repeatedly calling \`.on\` inside a loop or a re-rendering component without ever calling \`.off\`).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make emit genuinely async, so listeners run on separate microtasks rather than synchronously?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wrap each real listener call in \`queueMicrotask(() => fn.apply(this, args))\` (or \`Promise.resolve().then(...)\`) instead of calling it directly — a genuine, deliberate trade-off, since real Node's own EventEmitter is intentionally SYNCHRONOUS by design (so a caller can rely on all listeners having run by the time \`emit\` returns), and this change would break that real guarantee.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if a listener genuinely throws during emit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As written, a real thrown error inside one listener genuinely propagates out of \`emit\` immediately, meaning any LATER listeners in that same \`forEach\` never run at all — a real, honest limitation worth naming; a more defensive version could wrap each individual listener call in its own try/catch, logging the error but continuing to the next listener, a real, deliberate design choice trading strict fail-fast behavior for real listener isolation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to this bank own Pub-Sub question?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely the same real, underlying pattern — a topic-to-subscribers map with subscribe/unsubscribe/publish — just under real Node's OWN specific naming convention (\`on\`/\`off\`/\`emit\`) plus the added \`once\` behavior; recognizing this as "the same shape I already built" is a genuinely strong real interview signal of pattern recognition across superficially different-sounding questions.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Listener** | A registered function that runs when its event is emitted |
| **Shallow-copy iteration** | Snapshotting the array before iterating, safe against mid-emit mutation |
| **\`once()\` self-removal** | A wrapper that calls off() on itself right before invoking the real callback |

---
**Conclusion:** a \`Map\` of event name to listener array, combined with iterating a SHALLOW COPY of that array inside \`emit\` (never the live array directly), correctly implements \`on\`/\`off\`/\`once\`/\`emit\` — the copy is what makes a listener safely able to remove itself (or others) mid-emit without corrupting iteration. Verified directly across all 4 core behaviors, including the subtlest case: a self-removing listener mid-emit did not skip or break a later, still-registered listener.`,
    examples: [
      {
        label: "Real, direct proof: EventEmitter correctly handles on/off/once, and a listener removing itself mid-emit does not break other listeners",
        tech: "javascript",
        runnable: true,
        code: `class EventEmitter {
  constructor() { this.listeners = new Map(); }
  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
    return this;
  }
  off(event, fn) {
    const fns = this.listeners.get(event);
    if (!fns) return this;
    this.listeners.set(event, fns.filter((f) => f !== fn));
    return this;
  }
  once(event, fn) {
    const wrapper = (...args) => { this.off(event, wrapper); fn.apply(this, args); };
    this.on(event, wrapper);
    return this;
  }
  emit(event, ...args) {
    const fns = this.listeners.get(event);
    if (!fns || fns.length === 0) return false;
    fns.slice().forEach((fn) => fn.apply(this, args));
    return true;
  }
}

const emitter = new EventEmitter();
const log = [];

emitter.once("data", (x) => log.push("once:" + x));
emitter.emit("data", "a");
emitter.emit("data", "b");
console.log("once() fires exactly once, ignores the second emit:", log);

log.length = 0;
const selfRemoving = (x) => { log.push("self:" + x); emitter.off("data", selfRemoving); };
const stable = (x) => log.push("stable:" + x);
emitter.on("data", selfRemoving);
emitter.on("data", stable);
emitter.emit("data", "first");
emitter.emit("data", "second");
console.log("a listener removing itself mid-emit does not skip the other listener:", log);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement compose() and pipe() for function composition",
    seoDescription:
      "compose() and pipe() were verified to produce the identical result (64) for the same 3 functions, with only their argument order reversed.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`compose(...fns)\` and \`pipe(...fns)\` — both combine multiple single-argument functions into one, differing only in the ORDER they apply."

**Examples:**

\`\`\`
compose(square, double, addOne)(3); // square(double(addOne(3))) -- right to left
pipe(addOne, double, square)(3);    // square(double(addOne(3))) -- left to right, SAME result
\`\`\`

**Clarifying questions expected:**
- Which direction does "compose" apply by real, standard convention — right-to-left, or left-to-right?
- Do the combined functions need to support multiple arguments, or just a single value threaded through?
- What should an empty \`fns\` list (\`compose()\`) return?

**Code / implementation expected:** Yes — real, direct proof that compose and pipe produce the identical result for the same functions with reversed call order.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the claim that compose and pipe produce the IDENTICAL final result when given the same functions in REVERSED order was verified directly with real computed output (64, both ways, for the same input).

## 1. The problem, restated

\`compose(f, g, h)(x)\` applies RIGHT TO LEFT: \`f(g(h(x)))\`. \`pipe(f, g, h)(x)\` applies LEFT TO RIGHT: \`h(g(f(x)))\`... more precisely, \`pipe\` applies its arguments in the order GIVEN, left to right, while \`compose\` applies its arguments in REVERSE, right to left — the real, standard, math-notation-inspired convention (\`compose\` mirrors mathematical function composition \`(f ∘ g)(x) = f(g(x))\`).

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| compose direction? | Right-to-left — matching real, standard math notation \`f ∘ g\`, a real, common point of confusion worth confirming explicitly. |
| Single value or multi-argument threading? | Single value threaded through is the real, standard convention — only the FIRST function in a \`pipe\` chain could meaningfully accept multiple arguments. |
| Empty \`fns\` list? | The real, sensible default returns the identity function — \`compose()(x) === x\`. |

## 3. Thought process

Both are genuinely the SAME underlying idea — reduce an array of functions down to one, threading a value through each — just differing in reduce DIRECTION: \`pipe\` is a plain, left-to-right \`.reduce\`, applying each function to the accumulated result in the order given; \`compose\` is the same shape but using \`.reduceRight\` instead, applying them in REVERSE order. Recognizing that \`pipe(...)\` and \`compose(...)\` are trivially expressible in terms of each other (\`compose = (...fns) => pipe(...fns.reverse())\`) is a genuinely strong signal of understanding the real relationship, rather than treating them as two unrelated implementations.

## 4. Verified solution

\`\`\`js
const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);
const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);
\`\`\`

\`\`\`
const addOne = (n) => n + 1;
const double = (n) => n * 2;
const square = (n) => n * n;

compose(square, double, addOne)(3)  -> 64   (square(double(addOne(3))) = square(double(4)) = square(8))
pipe(addOne, double, square)(3)     -> 64   (SAME functions, reversed order, identical real result)
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="both compose and pipe reduce an array of functions down to one threading a value through each differing only in reduce direction pipe is a plain left to right reduce compose is the same shape using reduceRight instead applying them in reverse order verified directly with real computed output sixty four both ways for the same three functions with reversed argument order relative to each other">
  <defs>
    <marker id="comp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: reversed function order, identical real result (64)</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">pipe(addOne, double, square)</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">left-to-right, a plain reduce</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">compose(square, double, addOne)</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">right-to-left, a reduceRight</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">same three functions, arguments listed in reversed order, identical real final result</text>
</svg>

## 5. Complexity

Time: O(n) for the reduce over \`n\` combined functions, each running once per call to the resulting composed function. Space: O(1) beyond the functions array itself — no intermediate array is built, just a threaded accumulator value.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`compose()\` or \`pipe()\` with zero functions | Returns \`x\` unchanged (acts as identity) | \`.reduce\`/\`.reduceRight\` with an initial value and an empty array simply return that initial value |
| A single function passed | Behaves identically to calling that function directly | The reduce runs exactly once |
| One function in the chain throws | The whole composed call throws, no later functions run | A synchronous reduce genuinely stops at the first error |
| Functions with side effects (not pure) | Still run in the correct, real order (compose: last-to-first written; pipe: first-to-last written) | Order is determined purely by the reduce direction, independent of purity |

## 7. Common Pitfalls

- **Confusing which direction compose applies.** The single most common real mix-up on this topic — compose is RIGHT-to-left, matching math notation, which reads backwards from how the arguments are visually listed.
- **Implementing pipe and compose as two, entirely separate implementations.** Missing the genuinely strong real insight that they are the SAME reduce shape, just in opposite directions (or trivially expressible via each other with a \`.reverse()\`).
- **Assuming every function in the chain can take multiple arguments.** Only the FIRST function applied (last argument to \`compose\`, first argument to \`pipe\`) can meaningfully receive multiple arguments in the real, standard convention — every function AFTER it receives exactly the single, threaded return value of the previous one.
- **Not handling the zero-function case explicitly.** While \`.reduce\`/\`.reduceRight\` handle it correctly by default given an initial value, failing to test it can leave an untested, easy-to-miss edge case.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Combine functions into one - does compose genuinely apply right-to-left, matching math notation?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the shared shape:</strong> <span style="color:#f0e2c8;">"Both are the same reduce over an array of functions, threading a value through - just opposite directions."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Start with pipe (simpler to reason about left-to-right):</strong> <span style="color:#f0e2c8;">"fns.reduce, applying each function to the accumulator, starting from x."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code compose, narrating the direction swap:</strong> <span style="color:#f0e2c8;">"identical shape, but reduceRight instead of reduce, for right-to-left application."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually run the same three functions through both, with reversed order, and confirm the results genuinely match."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where would you genuinely use compose/pipe in real, everyday frontend code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, common case: Redux middleware composition (\`applyMiddleware\` internally uses \`compose\`), or chaining several independent data-transformation steps on an API response (trim whitespace, then normalize casing, then validate) — expressing that chain as \`pipe(trim, normalize, validate)\` is genuinely more readable than deeply nested function calls or a long chain of intermediate variables.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support functions that return a promise, threading async results through the chain?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, this is exactly the SAME real shape as this bank own Promise Waterfall question — replace the plain \`.reduce\` accumulator step with one that \`await\`s the previous result before calling the next function, and mark the returned composed function as \`async\`; the reduce DIRECTION logic (left-to-right for pipe, right-to-left for compose) stays identical, only the per-step application becomes asynchronous.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Write compose in terms of pipe, without duplicating the reduce logic.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely direct, one-line real expression of the relationship: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const compose = (...fns) =&gt; pipe(...fns.reverse());\` — reversing the argument array before delegating to the already-correct \`pipe\` implementation, avoiding any duplicated reduce logic between the two.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does .reverse() inside that compose-via-pipe implementation risk mutating the caller own array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely sharp catch — \`fns\` here is the rest-parameter array created FRESH by the \`(...fns)\` destructuring on each call, not the original caller-supplied arguments array, so \`.reverse()\` mutating it is genuinely safe; if instead an already-existing outside array had been passed directly and reversed in place, that WOULD be a real, genuine mutation bug worth guarding against with a real \`[...fns].reverse()\` copy first.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **compose** | Combines functions, applying RIGHT to LEFT (math-notation convention) |
| **pipe** | Combines functions, applying LEFT to RIGHT (reads top-to-bottom naturally) |
| **Threaded accumulator** | The single value passed from one function's output to the next's input |

---
**Conclusion:** compose and pipe are the identical underlying reduce-over-functions shape, differing only in direction — pipe is a plain left-to-right \`.reduce\`, compose is the same shape via \`.reduceRight\`, and each can trivially be expressed in terms of the other with a \`.reverse()\`. Verified directly: the same three functions, listed in reversed order between the two, produced the identical real computed result (64) both ways.`,
    examples: [
      {
        label: "Real, direct proof: compose() and pipe() produce the identical result for the same functions, with only their argument order reversed",
        tech: "javascript",
        runnable: true,
        code: `const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);
const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);

const addOne = (n) => n + 1;
const double = (n) => n * 2;
const square = (n) => n * n;

const composedResult = compose(square, double, addOne)(3);
const pipedResult = pipe(addOne, double, square)(3);

console.log("compose(square, double, addOne)(3):", composedResult, "-- square(double(addOne(3)))");
console.log("pipe(addOne, double, square)(3):", pipedResult, "-- same functions, reversed order");
console.log("identical real result both ways:", composedResult === pipedResult);

// compose expressed in terms of pipe, no duplicated reduce logic
const composeViaPipe = (...fns) => pipe(...fns.reverse());
console.log("compose-via-pipe gives the same result:", composeViaPipe(square, double, addOne)(3));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Convert Between snake_case and camelCase Object Keys (Including Nested Objects)",
    seoDescription:
      "A snake_case/camelCase key converter was verified on a deeply nested object with arrays, and proven to correctly round-trip back to the exact original.",
    description: `**Problem, as an interviewer would state it:**
"Write \`snakeToCamel(obj)\` and \`camelToSnake(obj)\` — recursively convert every object key between snake_case and camelCase, correctly handling nested objects and arrays of objects."

**Examples:**

\`\`\`
snakeToCamel({ user_id: 1, address_info: { zip_code: "10001" } });
// { userId: 1, addressInfo: { zipCode: "10001" } }
\`\`\`

**Clarifying questions expected:**
- Should this recurse into arrays too, converting keys of objects INSIDE an array value?
- What about keys that are already in the target case, or contain numbers?
- Should Date objects or other non-plain-object values be recursed into, or left alone?

**Code / implementation expected:** Yes — real, direct proof on a genuinely nested structure (object + array of objects), including a full round-trip back to the original.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the round-trip claim — snake to camel, then camel back to snake, reproducing the EXACT original object — was verified directly with a real, deeply nested test object containing both a nested object and a nested array of objects.

## 1. The problem, restated

\`snakeToCamel\`/\`camelToSnake\` recursively walk an object (and any nested objects or arrays of objects within it), converting every KEY between the two naming conventions while leaving VALUES untouched.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Recurse into arrays? | Yes, genuinely required — a real API response commonly has arrays of nested objects (e.g. a list of address records) that also need their keys converted. |
| Keys already in the target case? | The regex-based transform is naturally a genuine no-op on them — worth confirming as intentional, not accidental. |
| Date/other special objects? | Should genuinely be left alone, not recursed into as if they were plain data objects — a real, easy-to-miss edge case. |

## 3. Thought process

Two, cleanly separable pieces: (1) a STRING transform for a single key (\`user_id\` -> \`userId\` via a regex replacing \`_x\` with the uppercased \`X\`; the reverse via a regex inserting \`_\` before each uppercase letter, lowercased), and (2) a RECURSIVE STRUCTURAL walk that applies that string transform to every key at every level. The structural walk needs three real cases: an array recurses into each element; a plain object recurses into each entry, transforming the key and recursively transforming the value; anything else (a primitive, or — importantly — a real \`Date\` instance, which technically has \`typeof === "object"\`) is returned as-is, since recursing into a \`Date\`'s own internal structure would be both meaningless and wrong.

## 4. Verified solution

\`\`\`js
function toCamel(str) {
  return str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}
function toSnake(str) {
  return str.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
}
function transformKeys(obj, transformer) {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeys(item, transformer));
  }
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [transformer(k), transformKeys(v, transformer)])
    );
  }
  return obj;
}
const snakeToCamel = (obj) => transformKeys(obj, toCamel);
const camelToSnake = (obj) => transformKeys(obj, toSnake);
\`\`\`

\`\`\`
real, verified round trip:
  input:  { user_id: 1, first_name: "Ada", address_info: { zip_code: "10001", nested_list: [{ item_id: 1 }, { item_id: 2 }] } }
  camel:  { userId: 1, firstName: "Ada", addressInfo: { zipCode: "10001", nestedList: [{ itemId: 1 }, { itemId: 2 }] } }
  back to snake: EXACTLY matches the original input, verified with a real deep-equality check
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="two cleanly separable pieces a string transform for a single key and a recursive structural walk that applies it to every key at every level the structural walk needs three cases an array recurses into each element a plain object recurses into each entry transforming the key anything else including a real Date instance is returned as is since recursing into a Date own internal structure would be meaningless verified directly on a deeply nested object with a nested array of objects correctly round tripping back to the exact original">
  <defs>
    <marker id="snake-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a full round trip reproduces the exact original object</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a string transform for one key</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">regex-based, snake underscore to camel upper</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">a recursive structural walk</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">arrays recurse per-element, objects recurse per-entry</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">Date and other special objects are returned as-is, never recursed into as plain data</text>
</svg>

## 5. Complexity

Time: O(n) where \`n\` is the total number of keys across every nesting level — each key visited exactly once. Space: O(n) for the newly-constructed output structure (this implementation is non-mutating, building fresh objects/arrays rather than modifying the input in place).

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A key already in the target case | Left effectively unchanged | The regex genuinely finds no matches to transform |
| A \`null\` value | Returned as-is, not recursed into | The explicit \`obj !== null\` guard, since \`typeof null === "object"\` would otherwise incorrectly match the object branch |
| A \`Date\` value nested inside the object | Returned as-is, not treated as a plain object to recurse into | The explicit \`!(obj instanceof Date)\` guard |
| An array of PRIMITIVES (not objects) | Each element passed through unchanged (no keys to transform) | The primitive branch of \`transformKeys\` simply returns the value as-is |

## 7. Common Pitfalls

- **Forgetting to recurse into arrays.** A real, common gap — many real API payloads have arrays of nested objects, and skipping array recursion silently leaves those inner keys unconverted.
- **Not guarding against \`null\` and \`Date\` before the generic object branch.** Both have \`typeof value === "object"\`, so an unguarded implementation would incorrectly try to treat \`null\` as a real object (crashing on \`Object.entries(null)\`) or mangle a Date's own internal structure.
- **Mutating the input object in place instead of building a new one.** A caller passing in data they still need in its original form would be genuinely surprised if the conversion silently mutated it — building a fresh, new structure is the safer, more predictable default.
- **Using a regex that also matches leading/trailing underscores incorrectly.** A key like \`_id\` (a real, common MongoDB-style convention) needs explicit consideration — the shown regex would leave a leading underscore untouched since it requires a lowercase letter/digit immediately after the underscore that is not itself at position 0 in a way that changes the very first character, worth testing explicitly rather than assuming.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Recursively convert keys - does this need to recurse into arrays of nested objects too?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Separate the two concerns:</strong> <span style="color:#f0e2c8;">"A string transform for one key, and a separate recursive structural walk applying it everywhere."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the special-case guards needed:</strong> <span style="color:#f0e2c8;">"Arrays recurse per-element, null and Date instances need explicit guards before the generic object branch."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"toCamel and toSnake regexes for a single key, transformKeys handling array, object, and fallback cases."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually run a full snake-to-camel-to-snake round trip on a deeply nested object and diff it against the original."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does this genuinely come up in a real frontend codebase?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, extremely common case: a backend (often Python/Ruby/Postgres-conventioned) returning snake_case JSON, while the frontend codebase genuinely prefers camelCase per standard JS/TS style — a real API client layer commonly runs every response through exactly this kind of transform at the network boundary, so the rest of the app never has to think about the backend own naming convention at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a key that is already correctly cased, mixed in the same object as ones that need conversion?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely handled correctly already, without special-casing — the regex-based \`toCamel\`/\`toSnake\` transforms are naturally idempotent no-ops on a key that has no underscore (for \`toCamel\`) or no uppercase letter (for \`toSnake\`) to match, so mixed-convention objects convert correctly key-by-key with no extra logic needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about a real Map or Set value nested inside the object — does this handle those correctly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Honestly, no, genuinely not as written — a real \`Map\`/\`Set\` has \`typeof === "object"\` and is NOT an instance of \`Date\`, so this implementation would incorrectly try \`Object.entries()\` on it, which does not iterate a Map/Set own real entries the intended way; a more complete version would add explicit \`instanceof Map\`/\`instanceof Set\` guards alongside the existing \`Date\` guard, matching this bank own deepClone/deepEqual questions which handle exactly this same real class of special-object cases.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could this run into a real stack overflow on a very deeply nested, or circular, real object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For extremely deep nesting, genuinely yes, a real, honest risk given the recursive implementation — though in real practice, a genuinely useful API-response structure rarely nests deep enough to matter; a CIRCULAR reference is a more genuinely dangerous case, since this implementation has no cycle detection at all and would recurse infinitely — this bank own deepClone/detect-a-circular-reference questions cover the real \`WeakSet\`-based technique needed to guard against that specific case.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Structural recursion** | Walking through nested objects/arrays, transforming at every level |
| **Idempotent transform** | Running the transform on an already-correct key is safely a no-op |
| **Special-object guard** | Checks (like \`instanceof Date\`) that stop recursion into non-plain-data values |

---
**Conclusion:** the conversion cleanly splits into a string-level key transform (a simple regex each direction) and a separate recursive structural walk applying it through nested objects and arrays — with explicit guards to stop recursion at \`null\` and \`Date\` (and, more completely, other special object types like \`Map\`/\`Set\`) rather than treating them as plain data to walk into. Verified directly: a genuinely deeply nested object, including a nested array of objects, correctly round-tripped from snake_case to camelCase and back to the EXACT original.`,
    examples: [
      {
        label: "Real, direct proof: snakeToCamel/camelToSnake correctly convert a deeply nested object (including a nested array of objects) and round-trip exactly",
        tech: "javascript",
        runnable: true,
        code: `function toCamel(str) { return str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase()); }
function toSnake(str) { return str.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase()); }
function transformKeys(obj, transformer) {
  if (Array.isArray(obj)) return obj.map((item) => transformKeys(item, transformer));
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [transformer(k), transformKeys(v, transformer)]));
  }
  return obj;
}
const snakeToCamel = (obj) => transformKeys(obj, toCamel);
const camelToSnake = (obj) => transformKeys(obj, toSnake);

const input = {
  user_id: 1,
  first_name: "Ada",
  address_info: { zip_code: "10001", nested_list: [{ item_id: 1 }, { item_id: 2 }] },
};

const camelResult = snakeToCamel(input);
console.log("snake_case -> camelCase (nested + arrays):", JSON.stringify(camelResult));

const roundTrip = camelToSnake(camelResult);
console.log("round trip back to snake_case matches the exact original:", JSON.stringify(roundTrip) === JSON.stringify(input));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Query String Generator",
    seoDescription:
      "A query-string generator and parser round trip was verified: a real array value, a space, and an undefined field all produced and parsed back correctly.",
    description: `**Problem, as an interviewer would state it:**
"Write \`toQueryString(obj)\` — convert a plain object into a URL query string, correctly percent-encoding values, handling array values as repeated keys, and skipping \`null\`/\`undefined\`."

**Examples:**

\`\`\`
toQueryString({ search: "hello world", tags: ["js", "react"], page: 2 });
// "search=hello%20world&tags=js&tags=react&page=2"
\`\`\`

**Clarifying questions expected:**
- Should array values become repeated \`key=val\` pairs, or a single comma-joined value?
- Should \`null\`/\`undefined\` values be skipped entirely, or included as an empty string?
- Does the key itself ever need encoding too, not just the value?

**Code / implementation expected:** Yes — real, direct proof handling a string with a space, an array value, a number, and an undefined field, verified against real \`encodeURIComponent\` output.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** every encoding claim below was verified against the REAL, built-in \`encodeURIComponent\` — nothing here reimplements percent-encoding from scratch, since that would be reinventing a real, already-correct browser/Node primitive.

## 1. The problem, restated

\`toQueryString(obj)\` converts a plain object's entries into a real \`key=value&key2=value2\`-style string: array values become multiple repeated \`key=element\` pairs, and \`null\`/\`undefined\` values are skipped entirely (not included as an empty or literal "undefined" string).

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Array values: repeated keys or comma-joined? | Repeated keys (\`tags=a&tags=b\`) is the real, more standard convention most servers correctly parse; comma-joining is a real, valid alternative some APIs expect instead. |
| Skip null/undefined, or include as empty? | Skipping is the real, safer default — an included empty value can be ambiguous with a genuinely empty string the user provided. |
| Encode the key too? | Yes, genuinely — a key containing a real special character (like \`&\` or \`=\`) would otherwise corrupt the resulting string's own structure. |

## 3. Thought process

The real, correct building block already exists natively: \`encodeURIComponent\`, which correctly percent-encodes a string for safe inclusion in a URL component — there is no real reason to hand-roll percent-encoding logic. The remaining work is purely about STRUCTURE: iterate the object's entries, skip \`null\`/\`undefined\` values, and for an array value, produce one \`key=element\` pair PER element (encoding both the key and each element) rather than a single combined pair — then join every produced pair with \`&\`.

## 4. Verified solution

\`\`\`js
function toQueryString(obj) {
  const parts = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => parts.push(\`\${encodeURIComponent(key)}=\${encodeURIComponent(v)}\`));
    } else {
      parts.push(\`\${encodeURIComponent(key)}=\${encodeURIComponent(value)}\`);
    }
  }
  return parts.join("&");
}
\`\`\`

\`\`\`
real, verified output:
  toQueryString({ search: "hello world", tags: ["js", "react"], page: 2, empty: undefined })
  -> "search=hello%20world&tags=js&tags=react&page=2"
  (the "empty" key, being undefined, is genuinely skipped entirely - not "empty=undefined")
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="the real correct building block already exists natively encodeURIComponent correctly percent encodes a string for safe inclusion in a URL component the remaining work is purely structural iterate entries skip null and undefined values and for an array value produce one key equals element pair per element rather than a single combined pair then join every produced pair with an ampersand verified directly against real encodeURIComponent output including a string with a space an array value and an undefined field genuinely skipped">
  <defs>
    <marker id="qsg-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: real encodeURIComponent output, array fan-out, skip null/undefined</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a scalar value</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">one encoded key=value pair</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">an array value</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">one repeated key=element pair PER element</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">null and undefined values are skipped entirely, not encoded as literal text</text>
</svg>

## 5. Complexity

Time: O(k + m) where \`k\` is the number of top-level keys and \`m\` is the total number of array elements across all array-valued keys — every value contributes exactly one encoded pair. Space: O(k + m) for the resulting \`parts\` array before joining.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| An empty object \`{}\` | Returns an empty string \`""\` | \`parts\` stays empty, and \`[].join("&")\` is \`""\` |
| A value that is the number \`0\` or the boolean \`false\` | INCLUDED, not skipped | Only \`null\`/\`undefined\` are explicitly checked — \`0\`/\`false\` are real, valid, meaningful values |
| An empty array value | Contributes ZERO pairs for that key | \`.forEach\` on an empty array simply never pushes anything |
| A key or value containing \`&\`, \`=\`, or \`#\` | Correctly percent-encoded, not left raw | \`encodeURIComponent\` handles every URL-reserved character correctly, by real spec |

## 7. Common Pitfalls

- **Hand-rolling percent-encoding instead of using \`encodeURIComponent\`.** A real, unnecessary reinvention that is highly likely to miss an edge case the native, spec-compliant implementation already handles correctly.
- **Including \`null\`/\`undefined\` as literal \`"null"\`/\`"undefined"\` strings.** A real, common, subtle bug — silently sending a garbage literal string value to a real server instead of omitting the field entirely.
- **Comma-joining array values without confirming the real target server expects that convention.** Repeated keys and comma-joined values are BOTH real, legitimate conventions used by different real APIs — assuming one without checking a real spec/documentation is a genuine risk.
- **Forgetting to encode the KEY, only encoding the value.** A key containing a real reserved character would corrupt the resulting query string's own structure, not just carry a wrong value.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Object to query string - should an array value become repeated keys, or a single comma-joined one?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the real building block to reuse:</strong> <span style="color:#f0e2c8;">"encodeURIComponent already handles percent-encoding correctly - no need to reimplement it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the structural plan:</strong> <span style="color:#f0e2c8;">"Iterate entries, skip null/undefined, fan out array values into repeated pairs, join with ampersand."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"for-of over Object.entries, continue on null/undefined, Array.isArray branch, encode both key and value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually run this with a space, an array, and an undefined field, and check the real encoded output."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use URLSearchParams instead of hand-writing this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, for the SCALAR case — a real, built-in \`URLSearchParams\` object handles encoding and joining automatically (\`new URLSearchParams({search: "hello world"}).toString()\`); the real reason to still know how to write this by hand: \`URLSearchParams\`'s constructor does NOT natively handle array values the repeated-key way shown here (it would stringify the whole array into one value), so a real, correct array-aware wrapper still needs an explicit \`.append(key, val)\` loop per array element rather than relying on the constructor alone.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a nested object value, not just arrays and scalars?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is genuinely no single, universal real convention for this — some real APIs expect bracket notation (\`filter[status]=active\`), others expect the nested object JSON-stringified into one value; either way, the CURRENT implementation would need an explicit real branch recognizing a nested plain object and recursively building prefixed keys, rather than silently mis-encoding it via \`encodeURIComponent(value)\` on a real object (which would produce the useless literal string \`"[object%20Object]"\`).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would this work correctly with a real Map instead of a plain object as input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not as written — \`Object.entries\` only works on a real, plain object (or array), not a \`Map\`, which has its OWN, separate real \`.entries()\` method; a small, genuine adjustment (accepting either, or normalizing with \`obj instanceof Map ? obj.entries() : Object.entries(obj)\`) would be needed to support both real input shapes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this correctly handle a value that is a real number like 0, or a boolean false?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, correctly, by design — the explicit \`value === undefined \|\| value === null\` check deliberately does NOT match \`0\` or \`false\`, since a real, common bug in this exact function is accidentally using a general truthiness check (\`if (!value) continue;\`) instead, which WOULD incorrectly and silently skip a real, meaningful \`0\` or \`false\` value — a genuinely important, easy-to-miss distinction.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Percent-encoding** | Escaping special/reserved characters for safe inclusion in a URL |
| **Repeated-key array convention** | \`tags=a&tags=b\` instead of a single comma-joined value |
| **\`URLSearchParams\`** | A real, native browser/Node API handling the scalar case natively |

---
**Conclusion:** the real, correct building block for encoding is already native (\`encodeURIComponent\`) — the actual work is purely structural: skip \`null\`/\`undefined\` explicitly (never via a loose truthiness check, which would wrongly also skip \`0\`/\`false\`), and fan an array value out into one repeated \`key=element\` pair per element rather than a single combined pair. Verified directly against real \`encodeURIComponent\` output: a string with a space, an array value, a number, and an undefined field all produced the correct, expected query string.`,
    examples: [
      {
        label: "Real, direct proof: toQueryString() correctly percent-encodes a space, fans out an array into repeated keys, and skips an undefined field",
        tech: "javascript",
        runnable: true,
        code: `function toQueryString(obj) {
  const parts = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => parts.push(\`\${encodeURIComponent(key)}=\${encodeURIComponent(v)}\`));
    } else {
      parts.push(\`\${encodeURIComponent(key)}=\${encodeURIComponent(value)}\`);
    }
  }
  return parts.join("&");
}

const result = toQueryString({ search: "hello world", tags: ["js", "react"], page: 2, empty: undefined, disabled: false });
console.log("real generated query string:", result);
console.log("the space in 'hello world' is correctly percent-encoded:", result.includes("hello%20world"));
console.log("the undefined field is genuinely skipped entirely:", !result.includes("empty"));
console.log("false is correctly included, not skipped (only null/undefined are skipped):", result.includes("disabled=false"));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Query String Parser",
    seoDescription:
      "A query-string parser was verified to correctly reconstruct an array-valued key from repeated pairs and correctly decode a percent-encoded space.",
    description: `**Problem, as an interviewer would state it:**
"Write \`parseQueryString(qs)\` — the inverse of a query-string generator: convert \`key=value&key=value2\` back into an object, correctly reconstructing a REPEATED key as an array value."

**Examples:**

\`\`\`
parseQueryString("search=hello%20world&tags=js&tags=react&page=2");
// { search: "hello world", tags: ["js", "react"], page: "2" }
\`\`\`

**Clarifying questions expected:**
- Should a genuinely repeated key produce an array, while a key that appears only once stays a plain string?
- Are all parsed values genuinely strings, even ones that look numeric (like "2")?
- Should a leading "?" be stripped automatically, or is the caller responsible for passing a clean string?

**Code / implementation expected:** Yes — real, direct proof of a full round trip: generate a query string with an array-valued key, parse it back, and confirm the array is correctly reconstructed.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Medium

> **How to read this doc:** the array-reconstruction claim — that a key appearing TWICE in the query string correctly becomes an array on parse, while a key appearing ONCE stays a plain string — was verified directly through a real generate-then-parse round trip.

## 1. The problem, restated

\`parseQueryString(qs)\` splits a query string on \`&\`, then each pair on \`=\`, decoding both key and value — critically, if the SAME key appears multiple times, the result should collect those into an array rather than the later occurrence silently overwriting the earlier one.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Repeated key becomes an array, single key stays scalar? | Yes, genuinely — mirrors the real generator's own repeated-key convention for array values, needing the SAME asymmetric shape on the way back. |
| Are all values genuinely strings? | Yes — a query string has no real, inherent type information; \`"2"\` and \`2\` are indistinguishable at the string level, so callers needing a number must convert explicitly. |
| Strip a leading "?"? | A real, small convenience worth adding, since callers commonly pass \`location.search\` directly, which includes it. |

## 3. Thought process

The natural approach: split on \`&\` to get individual pairs, split each pair on \`=\` to get a raw key/value, and \`decodeURIComponent\` both — the real inverse of the generator's own \`encodeURIComponent\` calls. The one genuine subtlety, directly mirroring the generator's array fan-out: when building the result object, check if the key ALREADY EXISTS from an earlier pair in this same string — if it does not, set it as a plain scalar; if it already exists as a scalar, convert it into a two-element array; if it already exists as an array, push the new value onto it. This asymmetric logic (scalar by default, only becoming an array on a genuine SECOND occurrence) is what correctly mirrors the generator's own repeated-key convention without every single-valued key becoming an unnecessary one-element array.

## 4. Verified solution

\`\`\`js
function parseQueryString(qs) {
  const result = {};
  const cleaned = qs.startsWith("?") ? qs.slice(1) : qs;
  if (!cleaned) return result;
  for (const pair of cleaned.split("&")) {
    const [rawKey, rawVal = ""] = pair.split("=");
    const key = decodeURIComponent(rawKey);
    const val = decodeURIComponent(rawVal);
    if (key in result) {
      result[key] = Array.isArray(result[key]) ? [...result[key], val] : [result[key], val];
    } else {
      result[key] = val;
    }
  }
  return result;
}
\`\`\`

\`\`\`
real, verified full round trip:
  generated: "search=hello%20world&tags=js&tags=react&page=2"
  parsed:    { search: "hello world", tags: ["js", "react"], page: "2" }

  tags (a genuinely repeated key) -> correctly reconstructed as a real array of length 2
  search (a percent-encoded space) -> correctly decoded back to "hello world"
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="split on ampersand to get pairs split each pair on equals decode both key and value the real inverse of the generator encodeURIComponent calls when building the result check if the key already exists from an earlier pair if not set it as a plain scalar if it already exists as a scalar convert it into a two element array if it already exists as an array push the new value verified directly through a real generate then parse round trip a repeated key correctly reconstructed as a real array a single key correctly stayed a plain string">
  <defs>
    <marker id="qsp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a full generate-then-parse round trip, array reconstructed</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="65" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a key seen for the first time</text>
  <text class="d-sub" x="159" y="93" text-anchor="middle">stored as a plain scalar string</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="65" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">the SAME key seen again</text>
  <text class="d-sub" x="476" y="93" text-anchor="middle">promoted to (or extended as) a real array</text>
  <rect class="d-box" x="24" y="128" width="592" height="50" rx="8"/>
  <text class="d-sub" x="320" y="157" text-anchor="middle">mirrors the generator asymmetric repeated-key convention exactly, on the way back</text>
</svg>

## 5. Complexity

Time: O(n) where \`n\` is the total number of key=value pairs in the string — each pair is processed once. Space: O(n) for the result object, plus O(k) extra for any array-valued key with \`k\` occurrences (a bounded, one-time array-growth cost via spread).

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| An empty string, or just \`"?"\` | Returns an empty object \`{}\` | The explicit empty-after-cleaning guard |
| A key with no \`=\` at all (e.g. just \`"flag"\`) | Parsed with an empty-string value | The destructuring default \`rawVal = ""\` handles a missing second part |
| The exact same key appearing THREE or more times | Correctly grows into a 3+-element array | The \`Array.isArray\` check on each occurrence keeps extending it correctly, not just handling exactly 2 |
| A leading \`?\` (as in \`location.search\`) | Automatically stripped before parsing | The explicit \`startsWith("?")\` check, a real, common convenience |

## 7. Common Pitfalls

- **Letting a later occurrence of a key silently overwrite an earlier one.** The single most likely real bug this question tests for — a plain \`result[key] = val\` with no existence check would silently lose all but the LAST value for a repeated key.
- **Every single-valued key becoming an unnecessary one-element array.** Overcorrecting the above bug by ALWAYS pushing into an array, even for keys that appear only once, breaks the real, expected asymmetric shape (scalar for one occurrence, array only for genuinely repeated ones) that mirrors the generator.
- **Forgetting to decode BOTH the key and the value.** A real key itself could theoretically be percent-encoded too (though less common in practice) — decoding only the value is an easy, incomplete half-fix.
- **Assuming parsed numeric-looking values are real numbers.** \`"2"\` (a string) and \`2\` (a number) are genuinely, permanently indistinguishable once round-tripped through a query string — a caller needing real numeric comparison must explicitly convert (\`Number(parsed.page)\`), since the parser itself has no real, reliable way to know the ORIGINAL intended type.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Parse key=value pairs - does a repeated key need to become an array, mirroring the generator side?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the risk of the naive approach:</strong> <span style="color:#f0e2c8;">"A plain assignment would let a later occurrence silently overwrite an earlier one for a repeated key."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. State the asymmetric fix:</strong> <span style="color:#f0e2c8;">"Check if the key already exists - first time stays scalar, second time promotes to an array, third+ extends it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"split on ampersand, split each pair on equals, decode both, then the key-in-result check for the array logic."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually generate a query string with a repeated key, parse it back, and confirm the array is correctly reconstructed."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use the real, native URLSearchParams instead of hand-writing this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, for reading individual values — \`new URLSearchParams(qs).get("page")\` or \`.getAll("tags")\` handles decoding and repeated keys natively and correctly; the real, honest reason to still know how to write this by hand: converting a \`URLSearchParams\` instance into a PLAIN OBJECT with the exact scalar-vs-array asymmetric shape shown here still requires writing essentially this same real logic on top of it, since \`URLSearchParams\` itself has no built-in "give me a plain object" method with that specific convention.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this correctly handle a value that itself contains a literal equals sign?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no, not as written — a real value containing a literal \`=\` should have been percent-encoded by the generator into \`%3D\` before ever appearing in the query string, but if it somehow was not, a plain \`pair.split("=")\` would incorrectly split on EVERY \`=\` in the pair, not just the first; a more defensive real parser would split only on the FIRST \`=\` (e.g. via \`indexOf("=")\` and \`slice\`) to correctly handle that malformed-but-real-world-possible input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use a Map instead of a plain object for the result, and why or why not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuine, defensible alternative — a real \`Map\` would sidestep the prototype-pollution-adjacent risk of a query key literally being the string \`"__proto__"\` (which, on a PLAIN object, could interact strangely with the object own prototype chain), while a plain object remains the more common, real, expected return shape for this specific kind of utility since callers genuinely expect to access fields with normal dot/bracket notation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you write a real test confirming this is genuinely the correct inverse of the generator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, direct round-trip test — exactly the one already run in this doc own verification: generate a query string from a real object with a mix of scalar and array values, parse that generated string back, and assert the array-valued keys correctly became real arrays again with the right elements, while scalar keys stayed scalars, rather than merely checking the generator and parser in isolation from each other.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Asymmetric array promotion** | Scalar on first occurrence of a key, array only from the second on |
| **\`URLSearchParams\`** | A real, native API for reading query values, without the object-shape convention shown here |
| **Percent-decoding** | Reversing percent-encoding, via the real, built-in \`decodeURIComponent\` |

---
**Conclusion:** parsing correctly mirrors the generator's own repeated-key convention through an asymmetric check — a key seen for the first time is stored as a plain scalar, and only a GENUINE second (or later) occurrence promotes it into (or extends) a real array, rather than either silently overwriting earlier values or wastefully wrapping every single-valued key in an unnecessary array. Verified directly through a real, full generate-then-parse round trip: a repeated key correctly reconstructed as a real 2-element array, and a percent-encoded space correctly decoded back to a literal space.`,
    examples: [
      {
        label: "Real, direct proof: a full generate-then-parse round trip correctly reconstructs a repeated key as an array and decodes a percent-encoded space",
        tech: "javascript",
        runnable: true,
        code: `function toQueryString(obj) {
  const parts = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => parts.push(\`\${encodeURIComponent(key)}=\${encodeURIComponent(v)}\`));
    } else {
      parts.push(\`\${encodeURIComponent(key)}=\${encodeURIComponent(value)}\`);
    }
  }
  return parts.join("&");
}

function parseQueryString(qs) {
  const result = {};
  const cleaned = qs.startsWith("?") ? qs.slice(1) : qs;
  if (!cleaned) return result;
  for (const pair of cleaned.split("&")) {
    const [rawKey, rawVal = ""] = pair.split("=");
    const key = decodeURIComponent(rawKey);
    const val = decodeURIComponent(rawVal);
    if (key in result) {
      result[key] = Array.isArray(result[key]) ? [...result[key], val] : [result[key], val];
    } else {
      result[key] = val;
    }
  }
  return result;
}

const original = { search: "hello world", tags: ["js", "react"], page: 2 };
const qs = toQueryString(original);
console.log("real generated query string:", qs);

const parsedBack = parseQueryString(qs);
console.log("parsed back:", JSON.stringify(parsedBack));
console.log("repeated key 'tags' correctly reconstructed as a real array:", Array.isArray(parsedBack.tags) && parsedBack.tags.length === 2);
console.log("single key 'page' correctly stayed a plain string, not an array:", !Array.isArray(parsedBack.page) && parsedBack.page === "2");
console.log("percent-encoded space correctly decoded:", parsedBack.search === "hello world");`,
      },
    ],
  },
];

export default augments;
