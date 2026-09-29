/**
 * Practical JS coding-interview content — batch 18 (DSA round, easy tier —
 * finishing most of the remaining easy-tier array/object utilities:
 * dedupe, multiset intersection, tree traversal, move-zeroes, find
 * duplicates, in-place removal). See js-coding-augments-15/16/17.ts's
 * headers for the full template rationale and every standing gotcha
 * (card-backtick rule, literal-tag-outside-fence rule,
 * seoDescription-fix-by-editing rule).
 *
 * CRITICAL PROCESS NOTE (from batch 16): every title below was pulled
 * directly from a live DB query against technology='javascript-coding'
 * AND round='DSA' rows missing the '#1c140a' gold-card marker — NEVER
 * invented from memory.
 *
 * Fact-checked via real, direct execution before writing anything:
 *   - dedupe: verified first-occurrence order preservation, confirmed
 *     Set-based dedup correctly treats a real NaN as equal to itself
 *     (SameValueZero, matching this bank's own includes() question),
 *     and confirmed +0/-0 are treated as the same value too.
 *   - intersection: verified multiplicity is respected (an item
 *     appearing twice in both inputs appears twice in the result, not
 *     just once), confirmed the FIRST array's own relative order is
 *     preserved in the output, and confirmed a real "b has more copies
 *     than needed" case correctly caps at a's own count.
 *   - Object tree traversal: verified a real, deliberately 3-level-deep
 *     nested tree produces the exact correct dot-path + value pairs for
 *     every leaf, confirming a real array value is correctly treated as
 *     a LEAF (not recursed into further) even though arrays are
 *     genuinely objects too.
 *   - Move Zeroes to End: verified basic movement, confirmed relative
 *     order of non-zero elements is genuinely preserved (stable), and
 *     confirmed the array is mutated in place (same reference returned).
 *   - Find duplicates: verified basic detection, confirmed a
 *     no-duplicates input correctly returns an empty array, and
 *     confirmed the duplicate items themselves appear in their own
 *     first-occurrence order in the result.
 *   - Remove elements in-place: verified against real LeetCode-27-style
 *     semantics — correct new length returned, correct first-k elements
 *     in the mutated array, and confirmed the mutation is genuinely
 *     in-place (same array reference, with `.length` itself changed).
 */
import type { JsCodingAugment } from "./js-coding-augments.types";

const augments: JsCodingAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement dedupe / unique — remove duplicates preserving order",
    seoDescription:
      "A dedupe utility verified to preserve first-occurrence order, correctly treating NaN and +0/-0 as equal via real Set SameValueZero semantics.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`dedupe(array)\` — removing every duplicate value while preserving the original, real first-occurrence order of each unique element."

**Examples:**

\`\`\`
dedupe([3,1,2,3,1,4,2]); // [3,1,2,4]
\`\`\`

**Clarifying questions expected:**
- Does the real ORDER of the surviving unique elements need to genuinely match their FIRST occurrence in the input, or is any order acceptable?
- What comparison algorithm should genuinely determine "duplicate" — should a real \`NaN\` be treated as a duplicate of another \`NaN\`?
- Is a one-line \`[...new Set(array)]\` an acceptable, real, idiomatic solution, or does the interviewer want the underlying mechanism demonstrated explicitly?

**Code / implementation expected:** Yes — real, direct proof of order preservation, plus a real, direct demonstration of the underlying comparison algorithm's edge cases (NaN, +0/-0).`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the real, easy-to-overlook detail this question tests — exactly which values a JavaScript \`Set\` considers "the same" for deduplication purposes — was verified directly: a real \`NaN\` was correctly deduplicated against another \`NaN\` (unlike \`===\`, which never treats two \`NaN\`s as equal), and \`+0\`/\`-0\` were also confirmed to collapse into a single entry.

## 1. The problem, restated

Remove every duplicate value from an array, keeping exactly ONE copy of each distinct value — positioned at its real, original FIRST occurrence — using JavaScript's real, native \`Set\`, which is genuinely defined to use the "SameValueZero" comparison algorithm (the identical algorithm this bank's own \`includes()\` question covers) to determine whether two values count as duplicates.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Order preservation required? | Yes, genuinely — the real, useful contract is that surviving elements appear in their real, original first-occurrence order, not an arbitrary or sorted one. |
| Comparison algorithm for "duplicate"? | SameValueZero, matching real, native \`Set\`'s own documented behavior — genuinely, correctly treating two \`NaN\`s as duplicates of each other. |
| Is \`[...new Set(array)]\` acceptable? | Genuinely, yes, as the final, real, idiomatic one-liner — but demonstrating the underlying \`seen\`-tracking mechanism explicitly is often what the interviewer actually wants to see reasoned through. |

## 3. Thought process

The mechanism tracks every value already seen in a real \`Set\` (chosen specifically for its real O(1) average-case membership check, and its correct, native SameValueZero comparison semantics), looping through the input array ONCE, in order — for each element, if it is genuinely NOT already in \`seen\`, it is added to both \`seen\` and the real result array; if it IS already present, it is simply, correctly skipped. Because the loop processes elements in their real, original order, and only the FIRST occurrence of each value ever gets pushed (every subsequent occurrence is skipped as already-seen), the real, natural result preserves each surviving element's genuine first-occurrence position.

## 4. Verified solution

\`\`\`js
function dedupe(array) {
  const seen = new Set();
  const result = [];
  for (const item of array) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}
\`\`\`

\`\`\`
real, verified proof:
  dedupe([3,1,2,3,1,4,2]) -> [3,1,2,4]   -- first-occurrence order preserved

  dedupe([NaN,1,NaN,2]) -> [NaN,1,2]   -- Set correctly treats NaN as equal to itself (SameValueZero)

  dedupe([0,-0]).length -> 1   -- Set treats +0 and -0 as the SAME value too
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the mechanism tracks every value already seen in a real Set chosen specifically for its real O of one average case membership check and its correct native SameValueZero comparison semantics looping through the input array once in order for each element if it is genuinely not already in seen it is added to both seen and the real result array if it is already present it is simply correctly skipped because the loop processes elements in their real original order and only the first occurrence of each value ever gets pushed the natural result preserves each surviving elements genuine first occurrence position verified directly a real NaN was correctly deduplicated against another NaN and plus zero and minus zero were confirmed to collapse into a single entry">
  <defs>
    <marker id="dedupepoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a real Set correctly deduplicates NaN and collapses +0/-0</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">a Set tracks every value already seen</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">O(1) average membership check, SameValueZero comparison</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">only the FIRST occurrence is pushed</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">a single forward pass naturally preserves order</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">Set uses SameValueZero, the same comparison this bank own includes() question relies on</text>
</svg>

## 5. Complexity

Time: O(n) average — each element does an O(1) average-case Set lookup and possible insert. Space: O(n) for the Set plus the result array in the worst case (no duplicates at all).

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| An empty input array | Correctly returns a genuinely empty array | The loop simply never runs |
| An already-unique array | Correctly returns an unchanged copy, in the same order | Every element is genuinely new to \`seen\` |
| Multiple real \`NaN\` values | Correctly collapsed to a single \`NaN\` in the result | \`Set\` uses SameValueZero, which treats \`NaN\` as equal to itself |
| Both \`+0\` and \`-0\` present | Correctly collapsed to a single entry | \`Set\`'s SameValueZero treats them as the same value |

## 7. Common Pitfalls

- **Using \`indexOf\`/\`includes\` on a plain array to check "already seen" instead of a real \`Set\`.** Genuinely correct for SMALL inputs, but real \`indexOf\`/\`includes\` are O(n) per check, making the WHOLE dedup process O(n²) — a real, meaningful performance regression for a large array, versus the \`Set\`'s real O(1) average-case check.
- **Assuming \`[...new Set(array)]\` alone genuinely explains the mechanism in an interview setting.** A real, valid final answer, but an interviewer often wants the underlying \`seen\`-tracking loop reasoned through explicitly first, to confirm real understanding rather than memorized syntax.
- **Not considering the real SameValueZero comparison's specific NaN/+0/-0 behavior when asked directly.** A real, easy detail to be caught off guard by if not explicitly reasoned through and verified beforehand.
- **Deduplicating a real array of OBJECTS by reference and expecting value-based deduplication.** A real, common confusion — \`Set\` (and this implementation) dedupe by REFERENCE for objects, so two different, equal-looking object literals are genuinely NOT considered duplicates; a genuine value-based dedup would need this bank's own \`deepEqual\` question's logic instead.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Remove duplicates -- does the real order of surviving elements need to match their first occurrence?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the Set-based approach:</strong> <span style="color:#f0e2c8;">"Track seen values in a Set for O(1) average membership checks, avoiding an O(n squared) indexOf-based approach."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the comparison algorithm:</strong> <span style="color:#f0e2c8;">"Set uses SameValueZero, so NaN is genuinely deduplicated correctly, unlike a naive === based check."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"loop the array once, push and mark seen only for a genuinely new value."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually feed in a real NaN and confirm it's correctly deduplicated, not treated as always distinct."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you dedupe an array of objects by a specific property, like id?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, direct variation: track seen VALUES OF THAT PROPERTY in the Set instead of the objects themselves — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if (!seen.has(item.id)) { seen.add(item.id); result.push(item); }</code> — the identical real mechanism, just keying the Set by a real, primitive derived value instead of the whole object reference.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the one-liner [...new Set(array)] genuinely work, and what does it lose compared to the explicit loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Real native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> already, genuinely preserves real INSERTION order internally, so spreading it back into an array naturally reproduces the identical first-occurrence order this loop achieves manually — the one-liner loses NOTHING in terms of correctness, only the explicit, real narration of the underlying mechanism an interviewer may specifically want to hear reasoned through.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement this to keep the LAST occurrence of each duplicate instead of the first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A genuinely elegant, real trick: reverse the input, run the IDENTICAL first-occurrence <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dedupe</code> logic, then reverse the result back — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dedupe([...array].reverse()).reverse()</code> — since "first occurrence when scanning backward" is precisely "last occurrence" in the original, real order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this implementation genuinely mutate the original input array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no — the original array is only ever READ (via the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code> loop); every write goes into the genuinely new, freshly-created <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result</code> array, leaving the caller's own original input completely, correctly untouched.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **dedupe / unique** | Removes duplicates, keeping the first occurrence of each value |
| **SameValueZero** | Set's real comparison algorithm — treats NaN as equal to itself |
| **Insertion order** | A real Set preserves the order values were first added in |

---
**Conclusion:** \`dedupe\` tracks every value already seen in a real \`Set\` (chosen for its O(1) average membership check and its correct, native SameValueZero comparison), looping the input once in order — only a genuinely NEW value is pushed to the result and marked seen, so the real, natural output preserves each surviving element's genuine first-occurrence position. Verified directly: correct first-occurrence order preservation, PLUS direct confirmation of \`Set\`'s real, defining SameValueZero comparison quirks — a genuine \`NaN\` correctly deduplicated against another \`NaN\`, and \`+0\`/\`-0\` correctly collapsed into a single entry.`,
    examples: [
      {
        label: "Real, direct proof: dedupe() preserves first-occurrence order, and correctly treats a real NaN and +0/-0 as duplicates via Set's SameValueZero comparison",
        tech: "javascript",
        runnable: true,
        code: `function dedupe(array) {
  const seen = new Set();
  const result = [];
  for (const item of array) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

console.log("dedupe preserves first-occurrence order:", JSON.stringify(dedupe([3, 1, 2, 3, 1, 4, 2])));
console.log("dedupe on an already-unique array is unchanged:", JSON.stringify(dedupe([1, 2, 3])));
console.log("dedupe correctly treats a real NaN as equal to itself (Set's SameValueZero):", dedupe([NaN, 1, NaN, 2]).length);
console.log("dedupe treats +0 and -0 as the same value too:", dedupe([0, -0]).length);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Implement intersection of arrays (with duplicates & order)",
    seoDescription:
      "An intersection utility was verified to respect real multiplicity across both inputs while preserving the first array's own relative element order.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`intersection(a, b)\` — returning every element common to BOTH arrays, respecting real MULTIPLICITY (an item appearing twice in both should appear twice in the result), and preserving array \`a\`'s own relative order."

**Examples:**

\`\`\`
intersection([1,2,2,3], [2,2,4]); // [2,2]
\`\`\`

**Clarifying questions expected:**
- If an element appears multiple times in BOTH arrays, does the result need to genuinely reflect that multiplicity, or should it be de-duplicated to a single occurrence?
- Which array's own relative order should the result preserve — array \`a\`'s, array \`b\`'s, or does it not matter?
- What is the real, correct count when array \`a\` has fewer copies of an item than array \`b\` does (or vice versa)?

**Code / implementation expected:** Yes — real, direct proof that multiplicity is respected (not collapsed to a set-style intersection), and that array \`a\`'s own relative order is preserved in the result.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the real, defining "with duplicates" requirement this question tests — that the result genuinely reflects real MULTIPLICITY, not a deduplicated set-style intersection — was verified directly: \`intersection([1,2,2,3], [2,2,4])\` correctly returned \`[2,2]\` (both copies), not just a single \`[2]\`.

## 1. The problem, restated

Return every element genuinely present in BOTH input arrays — where an element appearing \`k\` times in one array and \`m\` times in the other should appear \`min(k, m)\` times in the result (real, standard multiset-intersection semantics, distinct from a set-based intersection which would only ever produce ONE copy) — preserving array \`a\`'s own real, relative element order.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Multiplicity respected? | Yes, genuinely — this is the real, defining "with duplicates" requirement distinguishing this from a plain set intersection. |
| Which array's order? | Array \`a\`'s — the real, natural, most common convention (the "primary" array being filtered against the "lookup" array \`b\`). |
| Count when one array has fewer copies? | The real, correct count is \`min(count in a, count in b)\` — the result can never exceed what EITHER array actually has. |

## 3. Thought process

The mechanism first builds a REAL FREQUENCY MAP of array \`b\`'s own elements (via a real \`Map\`, counting each value's occurrences) — this is what allows an O(1) average-case "how many of this value does \`b\` still have available" check. It then loops over array \`a\` ONCE, in its own real, original order: for each element, if \`b\`'s frequency map still shows a REMAINING count greater than zero for it, the element is pushed to the result AND \`b\`'s count for it is DECREMENTED — this decrement is the real, key mechanism that correctly caps the result at \`min(count in a, count in b)\`, since once \`b\`'s available count for a value hits zero, no further matches for it are found, even if \`a\` still has more copies.

## 4. Verified solution

\`\`\`js
function intersection(a, b) {
  const bCounts = new Map();
  for (const item of b) bCounts.set(item, (bCounts.get(item) || 0) + 1);
  const result = [];
  for (const item of a) {
    const count = bCounts.get(item) || 0;
    if (count > 0) {
      result.push(item);
      bCounts.set(item, count - 1);
    }
  }
  return result;
}
\`\`\`

\`\`\`
real, verified proof:
  intersection([1,2,2,3], [2,2,4]) -> [2,2]   -- multiplicity respected, not collapsed to [2]

  intersection([4,1,2,2,3], [2,1,4]) -> [4,1,2]   -- preserves a's own relative order

  intersection([1,2], [3,4]) -> []   -- no overlap

  intersection([2], [2,2,2]) -> [2]   -- a only has 1 copy, so the result caps at min(1,3) = 1
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the mechanism first builds a real frequency map of array b own elements via a real Map counting each values occurrences this is what allows an O of one average case how many of this value does b still have available check it then loops over array a once in its own real original order for each element if b frequency map still shows a remaining count greater than zero for it the element is pushed to the result and b count for it is decremented this decrement is the real key mechanism that correctly caps the result at the minimum of count in a and count in b verified directly multiplicity is respected not collapsed to a set style intersection and array a own relative order is preserved in the result">
  <defs>
    <marker id="intersectpoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: multiplicity is respected, capped at min(count in a, count in b)</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">build a frequency map of array b</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">O(1) average lookup of remaining available count</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">loop a, push and DECREMENT on a match</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">the decrement caps the result at min(a own count, b own count)</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">looping a in its own order naturally preserves a own relative order in the output</text>
</svg>

## 5. Complexity

Time: O(n + m) where \`n\` and \`m\` are the two input arrays' lengths — one pass to build the frequency map, one pass to filter. Space: O(m) for the frequency map, plus O(k) for the result where \`k\` is the intersection size.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| No overlapping elements at all | Correctly returns a genuinely empty array | Every lookup against \`bCounts\` returns \`0\` |
| An element appears MORE times in \`a\` than in \`b\` | Correctly capped at \`b\`'s own available count | The decrement mechanism exhausts \`b\`'s count, then further matches correctly fail |
| Either input array is genuinely empty | Correctly returns a genuinely empty array | Either the frequency map is empty, or the main loop never runs |
| The SAME array passed as both \`a\` and \`b\` | Correctly returns the exact original array's own content | Every element's frequency in "b" exactly matches its own count in "a" |

## 7. Common Pitfalls

- **Using a plain Set instead of a frequency Map, collapsing multiplicity.** A real, easy, WRONG simplification for this specific question — a Set-based intersection would incorrectly produce only ONE copy of a value even if it genuinely appears multiple times in both inputs, failing the real, explicit "with duplicates" requirement.
- **Forgetting to DECREMENT the count after a match.** Without it, an element with only 1 real copy in \`b\` could incorrectly match EVERY occurrence in \`a\`, producing a result larger than the real, correct multiset intersection allows.
- **Building the frequency map from \`a\` instead of \`b\`, then trying to preserve \`a\`'s order from the WRONG loop.** A real, easy mix-up — building the lookup map from \`b\` and looping \`a\` (as this implementation does) is precisely what naturally achieves BOTH the correct multiplicity cap AND \`a\`'s own preserved order in one coherent pass.
- **Using nested loops (checking every element of \`a\` against every element of \`b\`) instead of a frequency map.** Genuinely correct, but a real O(n*m) approach — a real, meaningful performance regression compared to this implementation's O(n+m).

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Common elements between two arrays -- does multiplicity genuinely need to be respected, or is a set-style intersection fine?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the frequency-map approach:</strong> <span style="color:#f0e2c8;">"Build a count map of b, then loop a checking and decrementing on each match -- avoids an O(n*m) nested loop."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the decrement's role:</strong> <span style="color:#f0e2c8;">"Decrementing after a match is what correctly caps the result at min of both arrays' own counts."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"build bCounts, loop a, push and decrement when the count is still positive."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually test where a has fewer copies than b and confirm the result caps correctly."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement a real SET-style intersection instead, ignoring multiplicity entirely?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuinely simpler variant: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const bSet = new Set(b); return [...new Set(a)].filter(x =&gt; bSet.has(x));</code> — deduplicating BOTH inputs first via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>, then filtering <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>'s own unique values against <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code>'s membership, correctly producing at most ONE copy of any common value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you extend this to a real N-array intersection, not just two?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuinely direct application of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduce</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arrays.reduce((acc, arr) =&gt; intersection(acc, arr))</code> — repeatedly, correctly intersecting the running accumulated result with each further array; this bank's own separate, dedicated N-array intersection question covers a more real, performance-conscious variant of this exact idea.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why build the frequency map from b and loop a, rather than the reverse?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, this choice is precisely what makes the result preserve <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>'s own order specifically — since the REQUIREMENT is "preserve a's order," the array actually being LOOPED THROUGH to build the result must be <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>, which naturally means the LOOKUP structure needs to be built from the OTHER array, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code>, instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this implementation genuinely mutate either of the original input arrays?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no — both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code> are only ever READ; the frequency counts live in a genuinely SEPARATE, real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>, and the result is built into a genuinely new, separate array, leaving both original inputs completely, correctly untouched.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Multiset intersection** | Respects real element counts, unlike a plain set intersection |
| **Frequency map** | Tracks how many of each value an array contains |
| **Decrement-on-match** | The real mechanism that caps the result at min(count a, count b) |

---
**Conclusion:** \`intersection\` builds a real frequency map of array \`b\`'s own elements, then loops array \`a\` in its own real, original order — for each element with a REMAINING available count in \`b\`'s map, it is pushed to the result and that count is DECREMENTED, correctly capping the result at \`min(count in a, count in b)\` for every value. Verified directly: real multiplicity is genuinely respected (not collapsed to a plain set-style intersection), array \`a\`'s own relative order is preserved in the output, and a real "one array has fewer copies than the other" case correctly caps at the smaller count.`,
    examples: [
      {
        label: "Real, direct proof: intersection() respects real multiplicity across both arrays while preserving array a's own relative element order",
        tech: "javascript",
        runnable: true,
        code: `function intersection(a, b) {
  const bCounts = new Map();
  for (const item of b) bCounts.set(item, (bCounts.get(item) || 0) + 1);
  const result = [];
  for (const item of a) {
    const count = bCounts.get(item) || 0;
    if (count > 0) {
      result.push(item);
      bCounts.set(item, count - 1);
    }
  }
  return result;
}

console.log("intersection respects multiplicity:", JSON.stringify(intersection([1, 2, 2, 3], [2, 2, 4])));
console.log("intersection preserves the FIRST array's own relative order:", JSON.stringify(intersection([4, 1, 2, 2, 3], [2, 1, 4])));
console.log("intersection with no overlap:", JSON.stringify(intersection([1, 2], [3, 4])));
console.log("intersection where b has MORE copies than a needs -- capped by a's own count:", JSON.stringify(intersection([2], [2, 2, 2])));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Object tree traversal",
    seoDescription:
      "An object tree traversal verified against a real 3-level-deep nested tree, confirming a real array value is treated as a leaf, not recursed into.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`traverseTree(obj)\` — recursively walking a nested plain-object tree and collecting every LEAF value together with its own full dot-notation path."

**Examples:**

\`\`\`
traverseTree({a: 1, b: {c: 2}});
// [{path: "a", value: 1}, {path: "b.c", value: 2}]
\`\`\`

**Clarifying questions expected:**
- Should a real ARRAY value be treated as a leaf itself, or recursed into like a nested object — since arrays are genuinely objects too in JavaScript?
- What real, correct format should the path take — a dot-separated string, or an array of keys?
- Does the traversal need to visit keys in any particular real order (e.g. matching \`Object.keys\`'s own order)?

**Code / implementation expected:** Yes — real, direct proof against a genuinely nested, multi-level tree, confirming correct leaf detection including the real array-as-leaf edge case.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the real, easy-to-miss edge case this question tests — that a real ARRAY value must be treated as a LEAF, not recursed into further, even though a JavaScript array is genuinely, technically an object too — was verified directly against a tree containing a real array value: it correctly appeared as a single leaf entry, not decomposed into per-index entries.

## 1. The problem, restated

Recursively walk a nested plain-object tree, and for every genuine LEAF (a value that is NOT itself a plain object to recurse into — critically including a real ARRAY, which must be treated as a leaf despite technically being an object), collect that leaf's own value together with the FULL dot-notation path of keys leading to it from the root.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Arrays: leaf or recurse? | Treated as a LEAF — a real, deliberate design choice, since most real, practical use cases want an array's contents kept together, not exploded into individual per-index path entries. |
| Path format? | A dot-separated string (e.g. \`"b.d.e"\`) — the real, common, human-readable convention this bank's own \`lodash.get\`/\`lodash.set\` questions also use. |
| Key visit order? | Real, standard \`Object.keys\` iteration order — no special sorting needed. |

## 3. Thought process

The mechanism is a genuinely RECURSIVE depth-first walk: for every own key at the CURRENT level, it builds that key's own full path (the parent path plus this key), then checks whether the corresponding value is a genuine "plain object to recurse into" — explicitly EXCLUDING both \`null\` (which technically has \`typeof "object"\` but is not a real container to recurse into) and real ARRAYS (via an explicit \`!Array.isArray\` check, since the DEFAULT \`typeof value === "object"\` check alone would incorrectly also match a real array). If it genuinely IS a plain object, the function recurses into it with the extended path; otherwise (a real primitive, \`null\`, or an array), the current path/value pair is pushed directly as a genuine leaf entry.

## 4. Verified solution

\`\`\`js
function traverseTree(obj, path = [], results = []) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const currentPath = [...path, key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      traverseTree(value, currentPath, results);
    } else {
      results.push({ path: currentPath.join("."), value });
    }
  }
  return results;
}
\`\`\`

\`\`\`
real, verified proof against a real, deliberately 3-level-deep nested tree:
  { a:1, b:{c:2, d:{e:3}}, f:[1,2,3] }

  traverseTree(tree) ->
    [{path:"a",value:1}, {path:"b.c",value:2}, {path:"b.d.e",value:3}, {path:"f",value:[1,2,3]}]

  the real array at "f" was correctly treated as a SINGLE LEAF (its own full array value kept
  together), NOT decomposed into "f.0", "f.1", "f.2" entries
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the mechanism is a genuinely recursive depth first walk for every own key at the current level it builds that keys own full path the parent path plus this key then checks whether the corresponding value is a genuine plain object to recurse into explicitly excluding both null which technically has typeof object but is not a real container to recurse into and real arrays via an explicit not Array dot isArray check if it genuinely is a plain object the function recurses into it with the extended path otherwise a real primitive null or an array the current path value pair is pushed directly as a genuine leaf entry verified directly a real array value was correctly treated as a single leaf not decomposed into per index entries">
  <defs>
    <marker id="treewalkpoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: a real array value is correctly treated as a single leaf, not recursed into</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">value is a plain object (not array, not null)</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">recurse into it with the extended path</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">a primitive, null, or an array</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">push directly as a genuine leaf entry</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">typeof value === "object" alone would incorrectly also match an array, hence the explicit exclusion</text>
</svg>

## 5. Complexity

Time: O(n) where \`n\` is the total number of keys/leaves across every level of the tree — each is visited exactly once. Space: O(n) for the results array, plus O(d) recursion-stack depth where \`d\` is the tree's own max nesting depth.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| A top-level primitive value | Correctly collected as a leaf with a single-segment path | The \`typeof value === "object"\` check is false |
| A value that is genuinely \`null\` | Correctly treated as a leaf, NOT recursed into | The explicit \`value &&\` truthiness check short-circuits before the \`typeof\` check even runs, since \`null\` is falsy |
| An array value, even an EMPTY one | Correctly treated as a single leaf | The explicit \`!Array.isArray(value)\` exclusion |
| A genuinely empty object (\`{}\`) at some level | Contributes NO leaf entries at all for that branch | \`Object.keys({})\` is empty, so the inner loop simply never runs |

## 7. Common Pitfalls

- **Forgetting the explicit \`!Array.isArray\` check**, assuming \`typeof value === "object"\` alone correctly identifies "things to recurse into." A real, easy, classic JavaScript gotcha — arrays genuinely, technically ARE objects, so omitting this check would incorrectly explode every array into per-index path entries.
- **Forgetting to guard against \`null\`** before the \`typeof\` check. A real, classic, separate JavaScript quirk — \`typeof null === "object"\`, so without the \`value &&\` truthiness guard, a genuine \`null\` value would incorrectly attempt to recurse via \`Object.keys(null)\`, which genuinely THROWS a real \`TypeError\`.
- **Mutating a SHARED \`results\` array incorrectly across separate, independent top-level calls.** A real, subtle bug risk if the default parameter's mutable array is accidentally reused across calls in some environments — this implementation is safe because a fresh default \`[]\` is genuinely created per top-level call (JavaScript re-evaluates default parameters on each invocation), but it is worth being explicit about this reasoning if asked.
- **Using a dot-separated STRING path when the interviewer specifically wants an array of keys, or vice versa.** A real, easy mismatch to accidentally introduce — always confirm the real, expected path FORMAT explicitly as a clarifying question up front.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Collect every leaf with its full path -- should a real array value be treated as a leaf, or recursed into?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the recursive DFS shape:</strong> <span style="color:#f0e2c8;">"For each key, build the extended path, then recurse if it's a genuine plain object, otherwise collect it as a leaf."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the two classic JS gotchas:</strong> <span style="color:#f0e2c8;">"Need to explicitly exclude arrays, since they're technically objects too, and guard against null since typeof null is also object."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"loop Object.keys, build the current path, check the plain-object condition, recurse or push a leaf."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually include an array value in the test tree and confirm it's correctly kept as a single leaf, not exploded."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you rewrite this to genuinely explode array elements into their own indexed paths too, like "f.0", "f.1"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, direct change: simply REMOVE the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!Array.isArray(value)</code> exclusion from the recursion condition — since a real array's own indices are already genuinely enumerable via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys</code> (returning the real string indices <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"0"</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"1"</code>, etc.), the SAME recursive mechanism would then naturally, correctly produce per-index leaf paths too.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to this bank's own Flatten a Nested Object question?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, a very close, real cousin — this question's OWN result (an array of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{path, value}</code> pairs) is essentially the raw MATERIAL a "flatten" operation would turn into a single, real flat object of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{[path]: value}</code> entries instead; the underlying recursive walk is functionally the identical real mechanism, just differing in the final, real output SHAPE.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would this implementation correctly handle a genuinely CIRCULAR object reference (an object that contains itself)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, no — as written, a real circular reference would cause genuinely INFINITE recursion, eventually throwing a real "Maximum call stack size exceeded" error; a real, robust version would need to track already-visited objects (via a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakSet</code>, matching this bank's own dedicated circular-reference-detection question's exact technique) to correctly detect and handle that case.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use a mutable results array passed through recursive calls, rather than concatenating return values?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuine performance choice — accumulating directly into a SHARED array via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.push()</code> avoids real, repeated array CONCATENATION/spreading at every recursive level (which would genuinely create a real, new intermediate array at every single nesting level); a genuinely equivalent, more purely functional version could instead have each call RETURN its own array and the caller concatenate them, at some real, additional allocation cost.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Leaf** | A value that is not itself a plain object to recurse into |
| **Array-as-leaf** | A real array is treated as one leaf, not exploded per-index |
| **Depth-first traversal** | Fully explores one branch before moving to the next |

---
**Conclusion:** \`traverseTree\` recursively walks the tree depth-first, building each key's own full path as it descends — for a genuine PLAIN OBJECT value (explicitly excluding both \`null\`, via a truthiness guard, and real arrays, via \`!Array.isArray\`), it recurses further; for everything else (a primitive, \`null\`, or an array), it collects the current path/value pair as a real leaf entry. Verified directly against a genuinely 3-level-deep nested tree: every leaf's exact dot-path and value correctly collected, with the real, deliberate confirmation that a real array value was correctly treated as a SINGLE leaf, not decomposed into per-index path entries.`,
    examples: [
      {
        label: "Real, direct proof: traverseTree() collects every leaf's exact path and value from a real nested tree, correctly treating a real array value as a single leaf",
        tech: "javascript",
        runnable: true,
        code: `function traverseTree(obj, path = [], results = []) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const currentPath = [...path, key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      traverseTree(value, currentPath, results);
    } else {
      results.push({ path: currentPath.join("."), value });
    }
  }
  return results;
}

const tree = { a: 1, b: { c: 2, d: { e: 3 } }, f: [1, 2, 3] };
console.log("traverseTree collects every leaf with its full dot path:", JSON.stringify(traverseTree(tree)));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Move Zeroes to End",
    seoDescription:
      "A moveZeroes utility was verified for genuine in-place mutation and stable relative ordering of non-zero elements, confirmed via a same-reference check.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`moveZeroes(arr)\` — moving every \`0\` in the array to the END, while preserving the relative order of all non-zero elements, mutating the array IN PLACE (no new array allocated)."

**Examples:**

\`\`\`
moveZeroes([0,1,0,3,12]); // [1,3,12,0,0]
\`\`\`

**Clarifying questions expected:**
- Does this genuinely need to mutate the array IN PLACE, or would returning a new array be acceptable?
- Should the RELATIVE order of the non-zero elements be preserved (a stable operation), or is any final order of non-zero elements acceptable?
- Should a genuinely negative zero (\`-0\`) be treated the same as a plain \`0\`?

**Code / implementation expected:** Yes — real, direct proof of in-place mutation (via a same-reference check), plus confirmation the relative order of non-zero elements is genuinely, stably preserved.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the real, defining "in-place" requirement this question tests — that the SAME array reference is mutated and returned, with no new array secretly allocated — was verified directly: a real \`===\` check confirmed the array passed in and the array returned were genuinely, literally the same object.

## 1. The problem, restated

Rearrange an array so every \`0\` ends up at the END, while every non-zero element keeps its own original RELATIVE order among the other non-zero elements — mutating the ORIGINAL array in place (no new array allocated) and using only O(1) extra space beyond a couple of index variables.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| In-place mutation required? | Yes, genuinely — the real, explicit constraint that distinguishes this from a simpler "filter zeroes out, then concat zeroes back" approach that would allocate new arrays. |
| Relative order preserved? | Yes — the real, defining "stable" requirement; the non-zero elements must keep their own original left-to-right ordering among themselves. |
| \`-0\` treated as a zero? | Genuinely, yes — a real \`-0 === 0\` comparison is \`true\` in JavaScript, so this naturally, correctly falls out of the implementation without any special-casing. |

## 3. Thought process

The mechanism uses the classic real "two-pointer" technique: an \`insertPos\` pointer tracks where the NEXT non-zero element should be written, starting at \`0\`. A single forward scan with index \`i\` checks every element — whenever a genuinely NON-ZERO value is found, it is written to \`arr[insertPos]\` (overwriting whatever was there, which is always safe since \`insertPos\` never runs AHEAD of \`i\`), and \`insertPos\` advances. After this first pass, every non-zero element has been correctly compacted to the FRONT of the array, in its own original relative order, and \`insertPos\` now correctly marks exactly how many non-zero elements there were — a SECOND, short pass then fills every remaining slot from \`insertPos\` to the end with \`0\`.

## 4. Verified solution

\`\`\`js
function moveZeroes(arr) {
  let insertPos = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) {
      arr[insertPos] = arr[i];
      insertPos++;
    }
  }
  while (insertPos < arr.length) {
    arr[insertPos] = 0;
    insertPos++;
  }
  return arr;
}
\`\`\`

\`\`\`
real, verified proof:
  moveZeroes([0,1,0,3,12]) -> [1,3,12,0,0]

  moveZeroes([4,0,5,0,0,6]) -> [4,5,6,0,0,0]   -- relative order of 4,5,6 genuinely preserved

  moveZeroes([1,2,3]) -> [1,2,3]   -- no zeroes, unchanged
  moveZeroes([0,0,0]) -> [0,0,0]   -- all zeroes, unchanged

  const original = [0,1,0]; const returned = moveZeroes(original);
  original === returned -> true   -- genuinely mutated IN PLACE, no new array
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the mechanism uses the classic real two pointer technique an insertPos pointer tracks where the next non zero element should be written starting at zero a single forward scan with index i checks every element whenever a genuinely non zero value is found it is written to arr of insertPos overwriting whatever was there which is always safe since insertPos never runs ahead of i and insertPos advances after this first pass every non zero element has been correctly compacted to the front of the array in its own original relative order and insertPos now correctly marks exactly how many non zero elements there were a second short pass then fills every remaining slot from insertPos to the end with zero verified directly a real triple equals check confirmed the array passed in and the array returned were genuinely the same object">
  <defs>
    <marker id="movezeroespoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: genuine in-place mutation, confirmed via a same-reference check</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">pass 1: compact non-zero elements forward</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">insertPos tracks the next write slot, order preserved</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">pass 2: fill the remaining tail with zeroes</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">insertPos now marks exactly how many were non-zero</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">insertPos never runs ahead of i, so overwriting arr[insertPos] is always genuinely safe</text>
</svg>

## 5. Complexity

Time: O(n) — two linear passes over the array (though the combined work across both never exceeds \`n\` total writes). Space: O(1) — only the \`insertPos\`/\`i\` index variables, genuinely no auxiliary array.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| An array with no zeroes at all | Correctly left unchanged (every element is its own insert target) | The first pass writes every element to its own current position |
| An array that is ALL zeroes | Correctly left unchanged (all zeroes, no non-zero elements to compact) | \`insertPos\` stays at \`0\`, and the second pass fills every slot with \`0\` (a no-op) |
| An empty array | Correctly returns the same, genuinely empty array | Both loops simply never run |
| A real \`-0\` value present | Correctly treated identically to a plain \`0\` | JavaScript's \`!==\` comparison treats \`-0\` and \`0\` as equal |

## 7. Common Pitfalls

- **Filtering zeroes out and concatenating them back, allocating a new array.** Genuinely correct for the final VALUES, but explicitly violates the real "in-place, O(1) extra space" constraint this specific question is testing.
- **Using a naive "swap zero with next non-zero" approach without tracking a clean \`insertPos\`.** A real, easy source of subtle bugs — without a clear compaction pointer, it is easy to accidentally disturb the relative order of the remaining non-zero elements.
- **Forgetting the SECOND pass to explicitly fill trailing slots with zero.** A real, easy oversight — after compacting non-zero elements forward, the ORIGINAL values still linger in the tail slots unless explicitly overwritten with \`0\`.
- **Assuming \`arr[insertPos] = arr[i]\` could ever overwrite an as-yet-unprocessed element.** A real, subtle but genuinely FALSE worry — since \`insertPos\` is mathematically always \`<= i\` throughout the loop, the write target is always either the current index itself or an already-processed one, never a future one.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Move zeroes to the end, in place -- does the relative order of the non-zero elements need to be preserved?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the two-pointer technique:</strong> <span style="color:#f0e2c8;">"An insertPos pointer tracks where the next non-zero element should be compacted to, in a single forward scan."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the two-pass structure:</strong> <span style="color:#f0e2c8;">"First pass compacts non-zero elements forward, second pass fills the remaining tail with zeroes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"loop checking non-zero, write to insertPos and advance, then a second loop filling zero from insertPos onward."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually check with === that the returned array is the same reference as the one passed in."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you solve this with a single pass instead of two, using a swap-based approach?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes — a real, single-pass swap variant: whenever <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr[i] !== 0</code>, SWAP <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr[i]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr[insertPos]</code> (instead of just overwriting), then advance <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insertPos</code> — this correctly achieves the identical real result in one combined pass, at the real, minor cost of a few extra no-op swaps when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i === insertPos</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you generalize this to move any arbitrary target value to the end, not just zero?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuinely trivial parameterization: replace every literal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> comparison and fill value with a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code> parameter — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function moveToEnd(arr, target) { ... if (arr[i] !== target) ... }</code> — the identical two-pointer mechanism works, genuinely unchanged, for any target value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does writing arr[insertPos] = arr[i] never risk overwriting a not-yet-processed value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuine loop invariant: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insertPos</code> only ever increments when a non-zero is found, and it increments to AT MOST the current <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i + 1</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insertPos</code> is mathematically ALWAYS <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;= i</code> at the moment of each write — meaning the write target is always either the current index (a genuine no-op) or an ALREADY-VISITED earlier index, never a genuinely future, unprocessed one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would this implementation correctly handle a real -0 value the same way as a plain 0?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, automatically, with no special-casing needed — JavaScript's own real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!==</code> (strict inequality) comparison genuinely treats <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-0</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> as EQUAL (unlike the stricter, real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is(-0, 0)</code>, which correctly, genuinely distinguishes them), so a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-0</code> in the input is correctly identified as "a zero" and moved to the end exactly like a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> would be.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Two-pointer technique** | Using a second index (insertPos) to compact elements in place |
| **In-place mutation** | The original array is modified directly, no new array allocated |
| **Stable operation** | Non-zero elements keep their own original relative order |

---
**Conclusion:** \`moveZeroes\` uses the classic two-pointer technique — a single forward scan compacts every non-zero element to the front (writing to \`arr[insertPos]\` and advancing it, which is always safe since \`insertPos\` never runs ahead of the scan index \`i\`), preserving each one's own original relative order; a short second pass then fills every remaining trailing slot with \`0\`. Verified directly: correct movement in multiple real scenarios, genuine stable preservation of relative non-zero order, and — the real, defining in-place requirement — a direct \`===\` check confirming the array passed in and the array returned are genuinely the exact same object reference.`,
    examples: [
      {
        label: "Real, direct proof: moveZeroes() genuinely mutates in place (same array reference) while stably preserving the relative order of non-zero elements",
        tech: "javascript",
        runnable: true,
        code: `function moveZeroes(arr) {
  let insertPos = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) {
      arr[insertPos] = arr[i];
      insertPos++;
    }
  }
  while (insertPos < arr.length) {
    arr[insertPos] = 0;
    insertPos++;
  }
  return arr;
}

console.log("moveZeroes basic case:", JSON.stringify(moveZeroes([0, 1, 0, 3, 12])));
console.log("moveZeroes preserves relative order of non-zero elements:", JSON.stringify(moveZeroes([4, 0, 5, 0, 0, 6])));

const original = [0, 1, 0];
const returned = moveZeroes(original);
console.log("moveZeroes mutates in place, same array reference:", original === returned);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Find duplicates in array",
    seoDescription:
      "A findDuplicates utility was verified to correctly return an empty array for unique input, and confirmed duplicate items appear in first-occurrence order.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`findDuplicates(arr)\` — returning every element that appears MORE THAN ONCE in the array, with each duplicate value appearing exactly ONCE in the output."

**Examples:**

\`\`\`
findDuplicates([1,2,3,2,4,3,3]); // [2,3]
\`\`\`

**Clarifying questions expected:**
- Should each duplicate VALUE appear exactly once in the output, regardless of how many total times it repeated in the input?
- What real, correct order should the duplicate values themselves appear in — their own first-occurrence order, or any order?
- Does this need to also report HOW MANY times each duplicate appeared, or just identify which values are duplicated?

**Code / implementation expected:** Yes — real, direct proof of correct duplicate detection, confirmation an already-unique array correctly produces an empty result, and confirmation of the output's own real order.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** a real, easy-to-overlook detail this question tests — the CORRECT real order of the duplicate VALUES themselves in the output — was verified directly: \`findDuplicates([3,1,3,2,1])\` correctly produced \`[3,1]\`, matching the real order in which \`3\` and \`1\` FIRST appeared in the input, not an arbitrary or sorted order.

## 1. The problem, restated

Identify every DISTINCT value that appears more than once in the array, returning each one EXACTLY ONCE in the output (regardless of how many total times it actually repeated) — in the real order each duplicate value FIRST appeared in the original input.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Each duplicate appears once in the output? | Yes — the output identifies WHICH values are duplicated, not every extra repeated occurrence. |
| Real output order? | Each duplicate value's own real first-occurrence order in the input — a real, natural, predictable convention. |
| Occurrence counts needed? | Genuinely, no, for this specific question — just the SET of duplicated values; a related, separate "frequency counter" question in this bank covers actual counts. |

## 3. Thought process

The mechanism builds a real frequency \`Map\`, counting every element's own total occurrences across a single forward pass. It then iterates that \`Map\` (which, being a real, native JavaScript \`Map\`, genuinely preserves real KEY INSERTION order — meaning the order keys were FIRST added, which naturally corresponds to each value's own first-occurrence position in the original array) and collects every key whose count is genuinely greater than \`1\` into the result. Because the \`Map\`'s own real iteration order directly reflects first-insertion (hence first-occurrence) order, the result naturally, correctly comes out in the real, expected order with no additional sorting needed.

## 4. Verified solution

\`\`\`js
function findDuplicates(arr) {
  const counts = new Map();
  for (const item of arr) counts.set(item, (counts.get(item) || 0) + 1);
  const result = [];
  for (const [item, count] of counts) {
    if (count > 1) result.push(item);
  }
  return result;
}
\`\`\`

\`\`\`
real, verified proof:
  findDuplicates([1,2,3,2,4,3,3]) -> [2,3]

  findDuplicates([1,2,3]) -> []   -- no duplicates present, correctly empty

  findDuplicates([3,1,3,2,1]) -> [3,1]   -- duplicate VALUES appear in their own real first-occurrence order
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the mechanism builds a real frequency Map counting every elements own total occurrences across a single forward pass it then iterates that Map which being a real native JavaScript Map genuinely preserves real key insertion order meaning the order keys were first added which naturally corresponds to each values own first occurrence position in the original array and collects every key whose count is genuinely greater than one into the result because the Map own real iteration order directly reflects first insertion hence first occurrence order the result naturally correctly comes out in the real expected order with no additional sorting needed verified directly the duplicate values themselves appeared in their own real first occurrence order in the output">
  <defs>
    <marker id="finddupspoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: duplicate values appear in their own real first-occurrence order</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">build a frequency Map in one forward pass</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">counts every element own total occurrences</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">iterate the Map, keep counts greater than 1</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">Map preserves real key insertion order</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">Map own real insertion-order iteration naturally produces first-occurrence order with no extra sorting</text>
</svg>

## 5. Complexity

Time: O(n) — one pass to build the frequency map, one pass over the map's own keys (bounded by the number of DISTINCT values, which is at most \`n\`). Space: O(n) for the frequency map in the worst case (every element distinct).

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| An already-unique array | Correctly returns a genuinely empty array | Every count in the map is exactly \`1\` |
| Every element identical (e.g. \`[5,5,5,5]\`) | Correctly returns a single-element result, \`[5]\` | Only ONE distinct key exists, with a count of \`4\` |
| An empty input array | Correctly returns a genuinely empty array | The frequency map itself ends up empty |
| A value appearing exactly twice vs. many times | Both correctly, identically appear ONCE in the output | The condition is simply \`count > 1\`, not tied to the exact count |

## 7. Common Pitfalls

- **Pushing EVERY extra repeated occurrence instead of the distinct value once.** A real, easy misreading of the requirement — the correct output identifies WHICH values are duplicated, not how many extra times each one repeated.
- **Using \`indexOf\`/\`lastIndexOf\` comparisons to detect a duplicate instead of a real frequency map.** Genuinely correct but a real O(n²) approach for a large input — a real, meaningful performance regression compared to the O(n) frequency-map approach.
- **Assuming a plain object (\`{}\`) as the frequency counter would behave identically to a real \`Map\` for ordering purposes.** A real, subtle risk — while modern JS engines DO largely preserve insertion order for non-numeric-string plain-object keys too, a genuinely numeric-looking key (like \`"2"\`) would be reordered to sort NUMERICALLY FIRST on a plain object, a real, documented quirk a \`Map\` does NOT have (a \`Map\`'s real keys are always ordered by pure insertion, regardless of whether they look numeric).
- **Not testing the already-unique, zero-duplicates case explicitly.** A real, easy thing to assume works rather than directly verify — the correct, real output for that case is a genuinely empty array, not \`null\`/\`undefined\`.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Find every value appearing more than once -- should each duplicate appear once in the output, or every extra occurrence?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the frequency-map approach:</strong> <span style="color:#f0e2c8;">"Build a count map in one pass, avoiding an O(n squared) indexOf-based check."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the Map ordering guarantee:</strong> <span style="color:#f0e2c8;">"A real Map preserves key insertion order, so iterating it naturally reproduces first-occurrence order for free."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"loop building counts, then iterate the map keeping only keys with a count greater than 1."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually test an already-unique array and confirm the output is genuinely empty."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you extend this to also report each duplicate's own real occurrence count?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuinely direct change: push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{value: item, count}</code> pairs instead of just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">item</code> — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if (count &gt; 1) result.push({ value: item, count });</code> — the identical frequency-map mechanism already computed everything genuinely needed for this, this bank's own dedicated Frequency Counter question covers a closely related, more general version of exactly this idea.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could this problem be solved in O(1) extra space if the input array is known to only contain integers within a fixed range?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes, under that SPECIFIC additional constraint — a real, classic technique NEGATES the value at each visited index (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr[Math.abs(arr[i])] *= -1</code>), using the array itself as an implicit "seen" marker; encountering an ALREADY-negative value at a target index means that value was genuinely seen before — a real, clever space optimization, but genuinely only valid when the input is constrained to indices within the array's own bounds, unlike this doc's general-purpose version.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this implementation genuinely distinguish a real NaN duplicate correctly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, yes — a real, native <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> also uses SameValueZero for its own key comparisons (identical to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>, this bank's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">includes()</code> question, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dedupe()</code> question), so multiple genuine <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code> values in the input are correctly counted together under one, real, shared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code> key, correctly reported as a duplicate if it appears more than once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would sorting the output before returning it genuinely change the real, expected result for this question?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, only if the interviewer specifically wants a SORTED result instead of first-occurrence order — without an explicit real requirement either way, this implementation's own real, natural first-occurrence ordering (via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>'s own insertion-order iteration) is the more common, expected, real convention; stating this choice explicitly as a design decision, rather than an accident, is worth doing out loud.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **findDuplicates** | Returns each value appearing more than once, exactly once |
| **Frequency map** | Tracks how many times each distinct value occurred |
| **Map insertion order** | A real Map iterates keys in the order they were first added |

---
**Conclusion:** \`findDuplicates\` builds a real frequency \`Map\` in a single forward pass, then iterates that map (which genuinely preserves real key insertion order, corresponding to each value's own first-occurrence position) collecting every key whose count exceeds \`1\` — this naturally, correctly produces the result in the real, expected first-occurrence order with no additional sorting needed. Verified directly: correct duplicate detection, an already-unique array correctly producing a genuinely empty result, and confirmation that the duplicate VALUES themselves appear in their own real first-occurrence order in the output.`,
    examples: [
      {
        label: "Real, direct proof: findDuplicates() correctly identifies repeated values, returns an empty array for unique input, and preserves first-occurrence order of the duplicates",
        tech: "javascript",
        runnable: true,
        code: `function findDuplicates(arr) {
  const counts = new Map();
  for (const item of arr) counts.set(item, (counts.get(item) || 0) + 1);
  const result = [];
  for (const [item, count] of counts) {
    if (count > 1) result.push(item);
  }
  return result;
}

console.log("findDuplicates basic case:", JSON.stringify(findDuplicates([1, 2, 3, 2, 4, 3, 3])));
console.log("findDuplicates with no duplicates:", JSON.stringify(findDuplicates([1, 2, 3])));
console.log("duplicate VALUES appear in their own first-occurrence order:", JSON.stringify(findDuplicates([3, 1, 3, 2, 1])));`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Remove elements in-place",
    seoDescription:
      "A removeElement utility was verified against real LeetCode-27-style semantics, confirming genuine in-place mutation via a same-reference and length check.",
    description: `**Problem, as an interviewer would state it:**
"Implement \`removeElement(arr, val)\` — removing every occurrence of \`val\` from the array IN PLACE, returning the new, real length, matching the well-known LeetCode-27-style contract."

**Examples:**

\`\`\`
const arr = [3,2,2,3];
removeElement(arr, 3); // returns 2, arr's first 2 elements are now [2,2]
\`\`\`

**Clarifying questions expected:**
- Does the ORDER of the remaining elements need to be preserved, or is any final order of the survivors acceptable?
- Should this genuinely allocate a new array, or must it mutate the original array in place (matching the real LeetCode-27 convention)?
- What is the real, correct meaning of the RETURNED length — is the caller expected to only look at the first \`k\` elements of the mutated array afterward?

**Code / implementation expected:** Yes — real, direct proof of correct in-place mutation (same array reference, with \`.length\` itself updated), returning the correct new length, matching real LeetCode-27 semantics.`,
    answer: `**Target Audience:** Engineers preparing for practical JavaScript coding interviews.
**Difficulty:** Easy

> **How to read this doc:** the real, defining "in-place, return-the-new-length" contract this question tests (matching the well-known real LeetCode 27 problem's own exact convention) was verified directly: after calling \`removeElement\`, the ORIGINAL array reference was confirmed unchanged (\`===\`) while its own real \`.length\` property was confirmed to have been genuinely, directly updated to the correct new value.

## 1. The problem, restated

Remove every occurrence of a target value \`val\` from the array, mutating it IN PLACE (matching the well-known LeetCode-27-style contract: no new array allocated, the caller's array itself changes) and returning the new, real length \`k\` — with the convention that only the array's own FIRST \`k\` elements after the call are considered meaningful, the rest may be discarded/ignored.

## 2. Clarifying questions a strong candidate asks

| Question | Why it matters |
| :--- | :--- |
| Order preservation? | Yes — the real, common, expected convention preserves the remaining elements' own original relative order. |
| In-place required? | Yes, genuinely — this is the real, defining LeetCode-27-style contract; a new-array-allocating solution, while simpler, does not match the intended constraint. |
| Meaning of the returned length? | The count of genuinely KEPT elements — the caller is expected to only look at \`arr[0..k-1]\` afterward; anything beyond that is real, meaningless leftover data. |

## 3. Thought process

The mechanism uses the identical real two-pointer compaction technique this bank's own \`moveZeroes\` question relies on: a write pointer \`k\` starts at \`0\`, and a single forward scan checks every element — whenever the CURRENT element does NOT equal \`val\`, it is written to \`arr[k]\` (a genuine no-op if \`k\` already equals the read index) and \`k\` advances. Because \`k\` mathematically never exceeds the current read index, every write is always safe. After the scan, \`arr.length = k\` is explicitly set — this final step is what makes the operation genuinely, fully match the real LeetCode-27 convention (not just leaving stale trailing data present but ignorable, but ACTUALLY shortening the real array), and \`k\` itself is returned as the new, correct length.

## 4. Verified solution

\`\`\`js
function removeElement(arr, val) {
  let k = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== val) {
      arr[k] = arr[i];
      k++;
    }
  }
  arr.length = k;
  return k;
}
\`\`\`

\`\`\`
real, verified proof:
  const arr1 = [3,2,2,3];
  removeElement(arr1, 3) -> returns 2, arr1 is now [2,2]

  const arr2 = [0,1,2,2,3,0,4,2];
  removeElement(arr2, 2) -> returns 5, arr2 is now [0,1,3,0,4]

  const original = [1,1,1]; const ref = original;
  removeElement(original, 1);
  original === ref -> true   -- genuinely in-place, same reference
  original.length -> 0   -- the array's own real length was directly updated too
\`\`\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="the mechanism uses the identical real two pointer compaction technique this banks own moveZeroes question relies on a write pointer k starts at zero and a single forward scan checks every element whenever the current element does not equal val it is written to arr of k a genuine no op if k already equals the read index and k advances because k mathematically never exceeds the current read index every write is always safe after the scan arr dot length equals k is explicitly set this final step is what makes the operation genuinely fully match the real LeetCode 27 convention and k itself is returned as the new correct length verified directly the original array reference was confirmed unchanged while its own real length property was confirmed to have been genuinely directly updated">
  <defs>
    <marker id="removeelpoly-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Verified: same array reference, with .length itself genuinely updated</text>
  <rect class="d-box-accent" x="24" y="46" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="159" y="70" text-anchor="middle">single scan, write to k when not equal to val</text>
  <text class="d-sub" x="159" y="90" text-anchor="middle">the identical two-pointer technique as moveZeroes</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="60" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">arr.length = k truncates the real array</text>
  <text class="d-sub" x="476" y="90" text-anchor="middle">matches the exact real LeetCode-27 contract</text>
  <rect class="d-box" x="24" y="122" width="592" height="34" rx="8"/>
  <text class="d-sub" x="320" y="143" text-anchor="middle">k mathematically never exceeds the read index i, so every compaction write is always safe</text>
</svg>

## 5. Complexity

Time: O(n) — a single forward pass. Space: O(1) — only the \`k\`/\`i\` index variables, genuinely no auxiliary array.

## 6. Edge cases

| Case | Expected behavior | Why |
| :--- | :--- | :--- |
| \`val\` does not appear in the array at all | Correctly returns the ORIGINAL length, array unchanged | Every element gets written to itself |
| Every element equals \`val\` | Correctly returns \`0\`, and \`arr.length\` becomes genuinely \`0\` too | \`k\` never advances past \`0\` |
| An empty input array | Correctly returns \`0\` immediately | The loop simply never runs |
| \`val\` is a real \`NaN\` | Genuinely, correctly NEVER matches anything via the \`!==\` comparison, since \`NaN !== NaN\` is always \`true\` | A real, honest limitation of this specific \`!==\`-based implementation, worth naming if a caller genuinely needs NaN-aware removal |

## 7. Common Pitfalls

- **Using \`.filter()\` or \`.splice()\` in a loop, allocating a new array or causing real O(n²) shifting.** Both are genuinely correct for the FINAL values, but \`.filter()\` allocates a whole new array (violating the real in-place constraint), and repeatedly \`.splice()\`-ing inside a loop causes real, repeated O(n) internal shifting per removal, degrading to real O(n²) overall.
- **Forgetting to explicitly set \`arr.length = k\` at the end.** Without it, the array's own real length remains UNCHANGED, leaving genuine stale, leftover data beyond index \`k\` — functionally the caller is TOLD to ignore it via the returned \`k\`, but the real LeetCode-27 convention specifically expects the array to actually be shortened too.
- **Assuming this specific \`!==\`-based implementation correctly removes a real \`NaN\` target value.** A real, easy, genuine gotcha — \`NaN !== NaN\` is always \`true\`, so a naive call with \`val = NaN\` would genuinely never remove anything at all; a real NaN-aware version would need \`Number.isNaN\` or \`Object.is\` instead of \`!==\`.
- **Confusing this question with this bank's own \`moveZeroes\` question.** A real, genuinely CLOSE cousin — both use the identical real two-pointer compaction pattern — but \`moveZeroes\` keeps EVERY element (just reordering zeroes to the end), while \`removeElement\` genuinely DISCARDS every matching element entirely, correctly shrinking the array's own real length.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to work through this live</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The process</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Restate and clarify:</strong> <span style="color:#f0e2c8;">"Remove every occurrence of val, in place, returning the new length -- does order need to be preserved?"</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the two-pointer approach:</strong> <span style="color:#f0e2c8;">"The identical technique as moveZeroes -- a write pointer k, writing whenever the current element doesn't match val."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Flag the length-truncation step:</strong> <span style="color:#f0e2c8;">"Explicitly setting arr.length equal to k at the end genuinely shortens the array, matching the real LeetCode-27 contract."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code it, narrating as you go:</strong> <span style="color:#f0e2c8;">"loop, write to k when not equal to val, advance k, then truncate length to k and return it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test your own edge case out loud:</strong> <span style="color:#f0e2c8;">"Let me actually check with === that the array reference is unchanged, and confirm .length was genuinely updated."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to this bank's own moveZeroes question — could you implement one in terms of the other?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Genuinely, they share the IDENTICAL real two-pointer compaction core, differing only in what happens to the "removed" slots afterward — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moveZeroes</code> keeps them (refilled with the target value at the end), while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">removeElement</code> discards them (via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr.length = k</code>); a real, direct <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">removeElement</code> could theoretically call moveZeroes-style logic and then simply truncate, though writing it directly (as done here) is more genuinely straightforward.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does real LeetCode-27-style code care about returning a length k, rather than just returning the mutated array directly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, historical convention from LANGUAGES where an array's real length cannot always be dynamically resized after allocation (like C/C++ fixed-size arrays) — the real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> return value is what tells the caller how many of the array's own leading slots are genuinely meaningful; JavaScript arrays genuinely CAN be resized directly (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr.length = k</code>), which this implementation also does for real, extra correctness beyond just returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you fix this implementation to correctly remove a real NaN target value too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A real, genuinely direct fix: replace <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr[i] !== val</code> with a real SameValueZero-based check, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!Object.is(arr[i], val) || (Number.isNaN(arr[i]) !== Number.isNaN(val))</code> — or more simply, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!(arr[i] === val || (Number.isNaN(arr[i]) && Number.isNaN(val)))</code> — matching this bank's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">includes()</code> question's identical SameValueZero technique.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the order of the remaining elements in [0,1,3,0,4] genuinely guaranteed, or could a different valid implementation produce a different order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Real LeetCode-27 itself explicitly does NOT require a specific order for the surviving elements (any valid order is accepted by its own real grading) — but THIS specific implementation happens to genuinely, deterministically preserve the original relative order too, since it processes elements strictly left to right; a caller relying on order stability should verify a given implementation actually provides it, rather than assuming it from the problem statement alone.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **removeElement** | Removes every occurrence of a value in place, returns new length |
| **In-place, LeetCode-27 style** | The original array is mutated and shortened, no new array |
| **Two-pointer compaction** | The identical technique this bank's moveZeroes question uses |

---
**Conclusion:** \`removeElement\` uses the identical two-pointer compaction technique as this bank's own \`moveZeroes\` question — a write pointer \`k\` advances only when the current element does NOT match \`val\`, writing it to \`arr[k]\` (always safe, since \`k\` never exceeds the read index) — and, critically, explicitly sets \`arr.length = k\` afterward to genuinely shorten the real array, matching the exact real LeetCode-27 contract, then returns \`k\` as the new length. Verified directly: correct removal across multiple real scenarios, and — the real, defining in-place requirement — direct confirmation via \`===\` that the original array reference is unchanged, while its own real \`.length\` property was genuinely, directly updated to the correct new value.`,
    examples: [
      {
        label: "Real, direct proof: removeElement() correctly removes every occurrence of a target value in place, matching real LeetCode-27 semantics with a genuinely updated array length",
        tech: "javascript",
        runnable: true,
        code: `function removeElement(arr, val) {
  let k = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== val) {
      arr[k] = arr[i];
      k++;
    }
  }
  arr.length = k;
  return k;
}

const arr1 = [3, 2, 2, 3];
const newLen1 = removeElement(arr1, 3);
console.log("removeElement returns new length:", newLen1, "and the array's own first k elements are:", JSON.stringify(arr1));

const arr2 = [0, 1, 2, 2, 3, 0, 4, 2];
const newLen2 = removeElement(arr2, 2);
console.log("removeElement with multiple occurrences:", newLen2, JSON.stringify(arr2));

const original = [1, 1, 1];
const ref = original;
removeElement(original, 1);
console.log("removeElement mutates in place, same reference, length genuinely changed:", original === ref, original.length);`,
      },
    ],
  },
];

export default augments;
