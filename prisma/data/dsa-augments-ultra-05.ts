/**
 * DSA ULTRA — batch 05: arrays and hashing — Two Sum, valid anagram, group anagrams,
 * find the duplicate and the majority element. One complete answer per language (Python,
 * JavaScript, Java, C++). Every example was run with python3 / node / javac+java /
 * g++ -std=c++17 by scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you solve the Two Sum problem efficiently?",
    difficulty: "easy",
    seoDescription: "Two Sum in O(n) with a one-pass hash map: brute force vs sort vs hash, the store-after-check rule, and verified code in Python, JS, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a list of integers and a target, return the indices of the two numbers that add up to the target. You can assume there is exactly one answer and you cannot use the same element twice. Please code it in Python and tell me the time and space complexity."

**What a strong answer should cover:**
- The brute force first (check every pair, O(n²)), then the improvement: for each \`x\`, look up its complement \`target - x\`.
- A one-pass \`dict\` mapping value → index, with the lookup done **before** the insert so an element never pairs with itself.
- O(n) average time and O(n) extra space, and why "average": \`dict\` lookups are O(1) on average, not in the worst case.
- The sorted-input alternative: two pointers, O(n) time and O(1) space, and why sorting loses the original indices.
- Python specifics: \`enumerate\` for index + value, \`in\` on a \`dict\` is a hash lookup (on a \`list\` it is a linear scan), and Python ints never overflow.

**Clarifying questions expected:**
- Indices or values? Is the input sorted?
- What should happen when there is no pair?

**Code / implementation expected:** Yes — a \`two_sum(nums, target)\` function in Python using a \`dict\`, run on a few inputs including duplicates and a no-answer case.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know basic Python lists and loops; nothing else assumed.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually running the code with \`python3\` (3.13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

You walk into a shop with a gift card worth exactly **9**. It only works if you spend all of it on **exactly two items**. The shelf has items priced 2, 7, 11 and 15.

The slow way: pick up the first item, then try it with every other item; put it down, pick up the second item, try it with every item after it, and so on. With 4 items that is 6 tries. With 3,000 items it is about 4.5 million tries.

The smart way: carry a small notebook. Walk along the shelf once. At each item, ask one question: *"Is 9 minus this price already written in my notebook?"* If yes, you are done. If no, write this price (and where you saw it) in the notebook and move on. At the 7, you ask "is 2 in my notebook?" — it is, because you wrote it down one step earlier. One walk, one question per item.

That notebook is a **hash map**, and the question "what number would complete this pair?" is the whole trick. Two Sum is usually the first problem in any interview list because it teaches the single most reused move in array problems: **trade a little memory for a lot of time by remembering what you have already seen.**

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is there always exactly one answer? | Decides what you return when there is none (an empty result, \`-1\`s, or an error) and whether "first pair found" is good enough. |
| Do you want the **indices** or the **values**? | Indices rule out the simple "sort then two pointers" version unless you remember the original positions. |
| Can I use the same element twice? | \`[3]\` with target 6 must not return \`[0, 0]\`. This is why the lookup happens **before** the insert. |
| Is the array sorted? | If it is, two pointers solve it in O(n) time with O(1) extra space — better than the hash map. |
| How big are the numbers? Can they be negative? | Negatives are fine for the hash map (it does not care about order). Huge values matter for overflow in fixed-width integer languages. |
| If several pairs work, which one do you want? | The one-pass map returns the pair whose **second** index is smallest; say so. |

## 3. The Core Idea

For every number \`x\`, there is exactly one partner that would complete the pair: \`target - x\`. So instead of asking "which other number pairs with \`x\`?" (a search through the whole array), you ask "have I already **seen** \`target - x\`?" (a single lookup).

📌 **Interview term: Complement** — the value \`target - x\` that, added to \`x\`, gives the target. "Look up the complement" is the phrase interviewers expect.

📌 **Interview term: Hash map** — a key-value table that finds a key in **O(1) on average** by turning the key into an array position (a *hash*). How it works inside, and why the worst case is worse, is its own question: [How does a hash table work?](/interview-question/how-does-a-hash-table-work)

📌 **Interview term: One-pass** — the algorithm reads the array once, from left to right, doing the lookup and the insert in the same loop. A "two-pass" version first fills the map, then looks things up; it works too but needs an extra guard against pairing an element with itself.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Two Sum with target 9 on the array 2 7 11 15. At index 1 the value is 7, the complement is 2, the map already holds 2 at index 0, so the answer is 0 and 1">
  <defs>
    <marker id="ts05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="22" text-anchor="middle">Target 9: one pass, one lookup per element</text>
  <rect class="d-box-muted" x="30" y="42" width="64" height="44" rx="8"/>
  <text class="d-text" x="62" y="70" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="114" y="42" width="64" height="44" rx="8"/>
  <text class="d-text d-accent" x="146" y="70" text-anchor="middle">7</text>
  <rect class="d-box" x="198" y="42" width="64" height="44" rx="8"/>
  <text class="d-text" x="230" y="70" text-anchor="middle">11</text>
  <rect class="d-box" x="282" y="42" width="64" height="44" rx="8"/>
  <text class="d-text" x="314" y="70" text-anchor="middle">15</text>
  <text class="d-sub" x="62" y="106" text-anchor="middle">i = 0</text>
  <text class="d-sub" x="146" y="106" text-anchor="middle">i = 1</text>
  <text class="d-sub" x="230" y="106" text-anchor="middle">i = 2</text>
  <text class="d-sub" x="314" y="106" text-anchor="middle">i = 3</text>
  <path class="d-edge-accent" d="M 146 114 L 146 150" marker-end="url(#ts05-arrow)"/>
  <rect class="d-box" x="40" y="156" width="220" height="50" rx="8"/>
  <text class="d-text" x="150" y="186" text-anchor="middle">need = 9 - 7 = 2</text>
  <path class="d-edge" d="M 262 181 L 384 181" marker-end="url(#ts05-arrow)"/>
  <text class="d-sub" x="322" y="170" text-anchor="middle">look up</text>
  <rect class="d-box-muted" x="392" y="156" width="230" height="50" rx="8"/>
  <text class="d-text" x="507" y="186" text-anchor="middle">seen = { 2 : index 0 }</text>
  <path class="d-edge-accent" d="M 507 152 L 507 94" marker-end="url(#ts05-arrow)"/>
  <rect class="d-box-accent" x="402" y="42" width="210" height="44" rx="8"/>
  <text class="d-text d-accent" x="507" y="70" text-anchor="middle">found: return [0, 1]</text>
</svg>

At index 0 the map was empty, so the lookup for \`9 - 2 = 7\` failed and \`2 → 0\` was written down. At index 1 the lookup for \`2\` succeeds, and the loop stops after looking at only two elements.

## 4. From Brute Force to One Pass

There are three standard approaches. Knowing all three — and when each wins — is what separates a memorised answer from an understood one.

📌 **Interview term: Brute force** — trying every possibility directly. Here: every pair \`(i, j)\` with \`i < j\`. That is \`n(n-1)/2\` pairs, so **O(n²)** time and O(1) extra space. For a refresher on reading these labels, see [What is Big-O notation?](/interview-question/what-is-big-o-notation)

📌 **Interview term: Two pointers** — keep one index at the left end and one at the right end of a **sorted** array. If the sum is too small, move the left one right (to a bigger number); if too big, move the right one left. Each step discards one element for good, so the scan is O(n). Sorting first costs O(n log n), and because sorting moves elements you must carry the original indices along. The same idea, run once per element, solves [3Sum](/interview-question/how-do-you-solve-the-3sum-problem).

**Hash map (one pass)** — for each element, look up its complement, then record the element. **O(n)** time on average, **O(n)** extra space for the map.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="Work measured for n equals 3000 with the answer in the last two positions. Brute force did 4498500 checks, sort plus two pointers did 2999 checks after sorting, the hash map did 3000 lookups">
  <text class="d-text" x="330" y="22" text-anchor="middle">Measured work for n = 3000, answer at the very end</text>
  <rect class="d-box-muted" x="20" y="48" width="190" height="120" rx="10"/>
  <text class="d-text" x="115" y="78" text-anchor="middle">Brute force</text>
  <text class="d-sub" x="115" y="108" text-anchor="middle">every pair</text>
  <text class="d-text" x="115" y="140" text-anchor="middle">4498500 checks</text>
  <rect class="d-box" x="235" y="48" width="190" height="120" rx="10"/>
  <text class="d-text" x="330" y="78" text-anchor="middle">Sort + two pointers</text>
  <text class="d-sub" x="330" y="108" text-anchor="middle">O(n log n) sort first</text>
  <text class="d-text" x="330" y="140" text-anchor="middle">2999 checks</text>
  <rect class="d-box-accent" x="450" y="48" width="190" height="120" rx="10"/>
  <text class="d-text d-accent" x="545" y="78" text-anchor="middle">One-pass hash map</text>
  <text class="d-sub" x="545" y="108" text-anchor="middle">O(n) extra memory</text>
  <text class="d-text d-accent" x="545" y="140" text-anchor="middle">3000 lookups</text>
</svg>

These numbers are not estimates: they are printed by example 2 (see the Verified section). The brute force count is exactly \`3000 × 2999 / 2 = 4,498,500\`. Making \`n\` ten times bigger made brute force about 100 times slower and the hash map 10 times slower — quadratic versus linear growth you can see in the output.

**Which one should you pick?**

| Situation | Best choice | Why |
| :--- | :--- | :--- |
| Unsorted input, indices wanted (the classic) | One-pass hash map | O(n) time; the O(n) memory is the price |
| Input already sorted | Two pointers | O(n) time **and** O(1) extra space |
| Memory is extremely tight, input unsorted | Sort (with indices) + two pointers | O(n log n) time but no hash table |
| n is tiny (say, under 20) | Brute force is fine | Simplest code; constant factors dominate |

### The one rule that makes it correct: look up first, insert second

If you insert \`x\` into the map **before** looking up \`target - x\`, then when \`x\` is exactly half the target (3 with target 6), the lookup finds \`x\` itself and returns the same index twice. Looking up first means the map only ever contains elements from **earlier** positions, so a match is always a different index. It also handles real duplicates for free: in \`[3, 3]\` the second 3 finds the first one.

## 5. The Code in Python

~~~python
def two_sum(nums, target):
    """Return indices [i, j] with nums[i] + nums[j] == target, or [] if none."""
    seen = {}                      # value -> index where we saw it
    for i, x in enumerate(nums):
        need = target - x          # the partner we are looking for
        if need in seen:           # O(1) average dict lookup
            return [seen[need], i]
        seen[x] = i                # store AFTER the check: never pair x with itself
    return []


def fmt(pair):
    return "[" + ", ".join(str(v) for v in pair) + "]"


print(fmt(two_sum([2, 7, 11, 15], 9)))   # [0, 1]
print(fmt(two_sum([3, 2, 4], 6)))        # [1, 2]
print(fmt(two_sum([3, 3], 6)))           # [0, 1]
print(fmt(two_sum([-3, 4, 3, 90], 0)))   # [0, 2]
print(fmt(two_sum([1, 2, 3], 7)))        # []
print(fmt(two_sum([5], 10)))             # []
~~~

Line by line, with the Python parts that matter:

- **\`enumerate(nums)\`** yields \`(index, value)\` pairs, so you never write \`range(len(nums))\` and index twice.
- **\`seen = {}\`** is a \`dict\`, Python's built-in hash map. \`need in seen\` hashes \`need\` and checks one bucket: O(1) on average. The same \`in\` on a **list** would walk the whole list — writing \`if need in nums:\` silently turns the solution back into O(n²).
- **\`seen[need]\`** is only read after \`need in seen\` was true, so it never raises \`KeyError\`. (\`seen.get(need)\` returning \`None\` is the other common idiom; be careful, because a stored index of \`0\` is falsy, so \`if seen.get(need):\` is a bug for the pair that starts at index 0.)
- **\`seen[x] = i\` comes last.** That is the look-up-first rule from section 4.
- **\`return []\`** is the agreed "no pair" value. Some interviewers prefer \`None\` or raising \`ValueError\`; ask.

📌 **Interview term: Hashable** — a Python object that has a fixed hash value, so it can be a \`dict\` key or a \`set\` member. Ints, strings and tuples are hashable; lists are not. Two Sum keys are ints, so this never bites here, but it matters as soon as you key a \`dict\` by a pair or a sequence (see [grouping anagrams](/interview-question/how-do-you-group-anagrams-together)).

Here is what goes wrong if you insert before looking up — the classic bug:

~~~python
def two_sum_buggy(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        seen[x] = i                    # BUG: stored before the check
        if target - x in seen:
            return [seen[target - x], i]
    return []

print(two_sum_buggy([3, 2, 4], 6))    # pairs 3 with itself
~~~

~~~text
[0, 0]
~~~

\`[0, 0]\` uses the 3 at index 0 twice. The correct version returns \`[1, 2]\` for the same input (see the verified output below).

And two Python facts worth saying out loud in an interview, checked by running them:

~~~python
big = 10**30                              # Python ints never overflow
print(big - (-big))
seen = {}
try:
    seen[[1, 2]] = 0                      # a list is mutable, so not hashable
except TypeError as e:
    print("TypeError:", e)
seen[(1, 2)] = 0                          # a tuple is hashable
print(seen)
~~~

~~~text
2000000000000000000000000000000
TypeError: unhashable type: 'list'
{(1, 2): 0}
~~~

So \`target - x\` can never overflow in Python (it can in Java and C++), and a \`TypeError: unhashable type\` is what you get if you ever try to use a list as a key — convert it to a \`tuple\` first.

## 6. Verified: Running the Code

Both examples were saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). Example 1 — the solution on six inputs, including duplicates, negatives, no answer and a single element:

~~~text
[0, 1]
[1, 2]
[0, 1]
[0, 2]
[]
[]
~~~

Example 2 — the same problem solved three ways, counting the work when the only answer is the last two elements (the worst case for every approach):

~~~text
n=10 answer=[8, 9] same=true
  brute force checks:     45
  sort + two pointers:    9 (plus the sort)
  one-pass hash map:      10
n=100 answer=[98, 99] same=true
  brute force checks:     4950
  sort + two pointers:    99 (plus the sort)
  one-pass hash map:      100
n=1000 answer=[998, 999] same=true
  brute force checks:     499500
  sort + two pointers:    999 (plus the sort)
  one-pass hash map:      1000
n=3000 answer=[2998, 2999] same=true
  brute force checks:     4498500
  sort + two pointers:    2999 (plus the sort)
  one-pass hash map:      3000
~~~

\`same=true\` on every line confirms all three approaches agree. The counts show the growth rates directly: going from n=100 to n=1000, brute force went from 4,950 to 499,500 checks (×100), while the hash map went from 100 to 1,000 (×10).

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | \`n(n-1)/2\` pairs in the worst case |
| Sort + two pointers | O(n log n) | O(n) | \`sorted()\` dominates; the index list \`order\` costs O(n) (O(1) only if the input is already sorted and you may return values) |
| One-pass \`dict\` | O(n) average | O(n) | One O(1)-average lookup and insert per element; the \`dict\` can grow to n entries |

The "average" matters: a \`dict\` lookup is O(1) on average because keys spread across buckets. If many keys collided into the same bucket, lookups would degrade. With ordinary integer input this does not happen in practice, but a careful candidate says "O(n) expected" rather than "O(n) guaranteed". The full picture is in [time complexity of common operations](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance).

## Edge Cases

- **No solution** (\`[1, 2, 3]\`, target 7) — the loop finishes and returns an empty result. Agree the "not found" value with the interviewer.
- **Fewer than two elements** (\`[5]\`, target 10) — the loop runs once, finds nothing, returns empty. No special case needed.
- **Same value used twice legitimately** (\`[3, 3]\`, target 6) — returns \`[0, 1]\` because the first 3 is already in the map when the second arrives.
- **A value that is half the target, appearing once** (\`[3, 2, 4]\`, target 6) — must **not** return \`[0, 0]\`; look-up-before-insert guarantees that.
- **Negative numbers and zero** (\`[-3, 4, 3, 90]\`, target 0) — work unchanged; the hash map does not depend on order or sign.
- **Repeated values that are not part of the answer** — the map keeps the latest index for a value. That does not break correctness: any earlier copy would have been matched already if it could complete a pair.

## Common Pitfalls

- **Inserting before looking up** — returns \`[0, 0]\` for \`[3, 2, 4]\`, target 6, as shown above.
- **\`if need in nums:\` instead of \`if need in seen:\`** — \`in\` on a list is a linear scan, so the "fast" solution is secretly O(n²). It also gives you no index.
- **\`if seen.get(need):\`** — a stored index of \`0\` is falsy, so a pair starting at index 0 is missed. Use \`need in seen\` or \`seen.get(need) is not None\`.
- **Calling \`nums.index(need)\`** to find the partner — another hidden O(n) scan, and it returns the *first* occurrence, which can be the current element itself.
- **Sorting \`nums\` in place for two pointers** and then returning positions in the sorted list — they are not the original indices. Sort a list of indices (\`sorted(range(n), key=lambda k: nums[k])\`) instead.
- **Saying "O(1)" for the dict without "average"** — interviewers often follow up on worst-case hashing.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">For each number <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>, look up its complement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target - x</code> in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> of values already seen; if it is there, return both indices, otherwise store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x → i</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Looking up <strong style="color:#ffca28;">before</strong> inserting means the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> only holds earlier positions, so I never pair an element with itself, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[3, 3]</code> still works.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n) average time — one O(1)-average lookup and insert per element — and O(n) extra space for the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code>. Brute force is O(n²) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The alternative:</strong> <span style="color:#f0e2c8;">If the input is sorted, two pointers from both ends give O(n) time and O(1) space; on unsorted input, sorting costs O(n log n) and loses the original indices unless I sort indices.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Python detail:</strong> <span style="color:#f0e2c8;">I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">enumerate</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">need in seen</code> on the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code>, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">need in nums</code> on the list, which would be a hidden O(n) scan.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if there can be several valid pairs and you must return all of them?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Change the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> to map value → list of indices, and for each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> emit a pair with every stored index of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target - x</code>. The output itself can be O(n²) in size (all zeros with target 0), so say that the bound is now O(n + output).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the array is already sorted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use two pointers: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = 0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = len(nums) - 1</code>; if the sum is too small do <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo += 1</code>, too big <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi -= 1</code>. O(n) time, O(1) space, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use a set instead of a dict?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> tells you the complement exists but not <strong style="color:#ffca28;">where</strong>. You need its index, so you need a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code>. If the question only asks "does a pair exist?", a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> is enough.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the dict lookup really O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On average, yes; in the worst case many keys could collide into one bucket and a lookup degrades. So the honest answer is O(n) expected time. For plain integer input it is the right tool.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you need to worry about overflow in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">target - x</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in Python — ints have arbitrary precision; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">10<strong style="color:#ffca28;">30 - (-10</strong>30)</code> prints exactly. In Java or C++ with 32-bit ints I would widen to a 64-bit type first.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Complement** | \`target - x\`: the value that would complete the pair with \`x\` |
| **Hash map** | Key-value table with O(1) average lookup; in Python, \`dict\` |
| **One-pass** | Read the array once, looking up and inserting in the same loop |
| **Brute force** | Try every pair; O(n²) |
| **Two pointers** | Indices moving inward from both ends of a sorted array |
| **Hashable** | Usable as a \`dict\` key: ints, strings, tuples yes; lists no |

---
**Conclusion:** Two Sum is solved in O(n) average time by walking the list once with a \`dict\` from value to index and asking, for each \`x\`, whether \`target - x\` has been seen — looking up before inserting so an element never pairs with itself. Brute force is O(n²) and two pointers is the better choice only when the input is already sorted. In Python the traps are hidden linear scans (\`in\` on a list, \`list.index\`) and the falsy index \`0\`, not overflow, which Python ints do not have. The same "remember what you have seen" pattern returns in [counting subarrays that sum to k](/interview-question/how-do-you-count-subarrays-that-sum-to-k), [3Sum](/interview-question/how-do-you-solve-the-3sum-problem) and [finding a duplicate](/interview-question/how-do-you-find-a-duplicate-in-an-array).`,
        examples: [
          {
            label: "One-pass hash map Two Sum on six inputs",
            code: `def two_sum(nums, target):
    """Return indices [i, j] with nums[i] + nums[j] == target, or [] if none."""
    seen = {}                      # value -> index where we saw it
    for i, x in enumerate(nums):
        need = target - x          # the partner we are looking for
        if need in seen:           # O(1) average dict lookup
            return [seen[need], i]
        seen[x] = i                # store AFTER the check: never pair x with itself
    return []


def fmt(pair):
    return "[" + ", ".join(str(v) for v in pair) + "]"


print(fmt(two_sum([2, 7, 11, 15], 9)))   # [0, 1]
print(fmt(two_sum([3, 2, 4], 6)))        # [1, 2]
print(fmt(two_sum([3, 3], 6)))           # [0, 1]
print(fmt(two_sum([-3, 4, 3, 90], 0)))   # [0, 2]
print(fmt(two_sum([1, 2, 3], 7)))        # []
print(fmt(two_sum([5], 10)))             # []`,
          },
          {
            label: "Brute force vs sort + two pointers vs hash map: counting the work",
            code: `# Count the work each approach does when the answer is the LAST pair (worst case).

def brute_force(nums, target):
    checks = 0
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            checks += 1
            if nums[i] + nums[j] == target:
                return [i, j], checks
    return [], checks


def sort_two_pointers(nums, target):
    order = sorted(range(len(nums)), key=lambda k: nums[k])   # indices sorted by value
    lo, hi, checks = 0, len(nums) - 1, 0
    while lo < hi:
        checks += 1
        s = nums[order[lo]] + nums[order[hi]]
        if s == target:
            return sorted([order[lo], order[hi]]), checks
        if s < target:
            lo += 1
        else:
            hi -= 1
    return [], checks


def hash_map(nums, target):
    seen, checks = {}, 0
    for i, x in enumerate(nums):
        checks += 1
        if target - x in seen:
            return [seen[target - x], i], checks
        seen[x] = i
    return [], checks


def fmt(pair):
    return "[" + ", ".join(str(v) for v in pair) + "]"


for n in [10, 100, 1000, 3000]:
    nums = list(range(n))                 # 0, 1, ..., n-1
    target = (n - 2) + (n - 1)            # only the last two values add up
    a, ca = brute_force(nums, target)
    b, cb = sort_two_pointers(nums, target)
    c, cc = hash_map(nums, target)
    print("n=" + str(n) + " answer=" + fmt(c) + " same=" + str(a == b == c).lower())
    print("  brute force checks:     " + str(ca))
    print("  sort + two pointers:    " + str(cb) + " (plus the sort)")
    print("  one-pass hash map:      " + str(cc))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an array of integers and a target, return the indices of the two numbers that add up to the target. Assume exactly one answer exists and you may not use the same element twice. Please write it in JavaScript and walk me through the complexity."

**What a strong answer should cover:**
- Brute force first (every pair, O(n²)), then the key idea: for each \`x\`, look up the complement \`target - x\`.
- A one-pass \`Map\` from value → index, with \`has\` checked **before** \`set\` so an element never pairs with itself.
- O(n) average time and O(n) extra space; "average" because hash lookups are O(1) on average.
- The sorted-input alternative: two pointers in O(n) time and O(1) space; on unsorted input, sorting needs a numeric comparator and loses the original indices.
- JavaScript specifics: why \`Map\` over a plain object (object keys become strings), and that numbers are doubles, so integers beyond 2^53 lose precision.

**Clarifying questions expected:**
- Indices or values? Is the array sorted?
- What should be returned when no pair exists?

**Code / implementation expected:** Yes — a \`twoSum(nums, target)\` function in JavaScript using a \`Map\`, run on several inputs including duplicates and a no-answer case.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know basic JavaScript arrays and loops; nothing else assumed.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually running the code with \`node\` (v22); nothing is typed in by hand. The examples use only \`console.log\`, so they run the same in a browser.

## 1. Why This Even Matters — A Story First

You walk into a shop with a gift card worth exactly **9**. It only works if you spend all of it on **exactly two items**. The shelf has items priced 2, 7, 11 and 15.

The slow way: pick up the first item, then try it with every other item; put it down, pick up the second item, try it with every item after it, and so on. With 4 items that is 6 tries. With 3,000 items it is about 4.5 million tries.

The smart way: carry a small notebook. Walk along the shelf once. At each item, ask one question: *"Is 9 minus this price already written in my notebook?"* If yes, you are done. If no, write this price (and where you saw it) in the notebook and move on. At the 7, you ask "is 2 in my notebook?" — it is, because you wrote it down one step earlier. One walk, one question per item.

That notebook is a **hash map**, and the question "what number would complete this pair?" is the whole trick. Two Sum is usually the first problem in any interview list because it teaches the single most reused move in array problems: **trade a little memory for a lot of time by remembering what you have already seen.**

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is there always exactly one answer? | Decides what you return when there is none (an empty result, \`-1\`s, or an error) and whether "first pair found" is good enough. |
| Do you want the **indices** or the **values**? | Indices rule out the simple "sort then two pointers" version unless you remember the original positions. |
| Can I use the same element twice? | \`[3]\` with target 6 must not return \`[0, 0]\`. This is why the lookup happens **before** the insert. |
| Is the array sorted? | If it is, two pointers solve it in O(n) time with O(1) extra space — better than the hash map. |
| How big are the numbers? Can they be negative? | Negatives are fine for the hash map (it does not care about order). Huge values matter for overflow in fixed-width integer languages. |
| If several pairs work, which one do you want? | The one-pass map returns the pair whose **second** index is smallest; say so. |

## 3. The Core Idea

For every number \`x\`, there is exactly one partner that would complete the pair: \`target - x\`. So instead of asking "which other number pairs with \`x\`?" (a search through the whole array), you ask "have I already **seen** \`target - x\`?" (a single lookup).

📌 **Interview term: Complement** — the value \`target - x\` that, added to \`x\`, gives the target. "Look up the complement" is the phrase interviewers expect.

📌 **Interview term: Hash map** — a key-value table that finds a key in **O(1) on average** by turning the key into an array position (a *hash*). How it works inside, and why the worst case is worse, is its own question: [How does a hash table work?](/interview-question/how-does-a-hash-table-work)

📌 **Interview term: One-pass** — the algorithm reads the array once, from left to right, doing the lookup and the insert in the same loop. A "two-pass" version first fills the map, then looks things up; it works too but needs an extra guard against pairing an element with itself.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Two Sum with target 9 on the array 2 7 11 15. At index 1 the value is 7, the complement is 2, the map already holds 2 at index 0, so the answer is 0 and 1">
  <defs>
    <marker id="ts05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="22" text-anchor="middle">Target 9: one pass, one lookup per element</text>
  <rect class="d-box-muted" x="30" y="42" width="64" height="44" rx="8"/>
  <text class="d-text" x="62" y="70" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="114" y="42" width="64" height="44" rx="8"/>
  <text class="d-text d-accent" x="146" y="70" text-anchor="middle">7</text>
  <rect class="d-box" x="198" y="42" width="64" height="44" rx="8"/>
  <text class="d-text" x="230" y="70" text-anchor="middle">11</text>
  <rect class="d-box" x="282" y="42" width="64" height="44" rx="8"/>
  <text class="d-text" x="314" y="70" text-anchor="middle">15</text>
  <text class="d-sub" x="62" y="106" text-anchor="middle">i = 0</text>
  <text class="d-sub" x="146" y="106" text-anchor="middle">i = 1</text>
  <text class="d-sub" x="230" y="106" text-anchor="middle">i = 2</text>
  <text class="d-sub" x="314" y="106" text-anchor="middle">i = 3</text>
  <path class="d-edge-accent" d="M 146 114 L 146 150" marker-end="url(#ts05-arrow)"/>
  <rect class="d-box" x="40" y="156" width="220" height="50" rx="8"/>
  <text class="d-text" x="150" y="186" text-anchor="middle">need = 9 - 7 = 2</text>
  <path class="d-edge" d="M 262 181 L 384 181" marker-end="url(#ts05-arrow)"/>
  <text class="d-sub" x="322" y="170" text-anchor="middle">look up</text>
  <rect class="d-box-muted" x="392" y="156" width="230" height="50" rx="8"/>
  <text class="d-text" x="507" y="186" text-anchor="middle">seen = { 2 : index 0 }</text>
  <path class="d-edge-accent" d="M 507 152 L 507 94" marker-end="url(#ts05-arrow)"/>
  <rect class="d-box-accent" x="402" y="42" width="210" height="44" rx="8"/>
  <text class="d-text d-accent" x="507" y="70" text-anchor="middle">found: return [0, 1]</text>
</svg>

At index 0 the map was empty, so the lookup for \`9 - 2 = 7\` failed and \`2 → 0\` was written down. At index 1 the lookup for \`2\` succeeds, and the loop stops after looking at only two elements.

## 4. From Brute Force to One Pass

There are three standard approaches. Knowing all three — and when each wins — is what separates a memorised answer from an understood one.

📌 **Interview term: Brute force** — trying every possibility directly. Here: every pair \`(i, j)\` with \`i < j\`. That is \`n(n-1)/2\` pairs, so **O(n²)** time and O(1) extra space. For a refresher on reading these labels, see [What is Big-O notation?](/interview-question/what-is-big-o-notation)

📌 **Interview term: Two pointers** — keep one index at the left end and one at the right end of a **sorted** array. If the sum is too small, move the left one right (to a bigger number); if too big, move the right one left. Each step discards one element for good, so the scan is O(n). Sorting first costs O(n log n), and because sorting moves elements you must carry the original indices along. The same idea, run once per element, solves [3Sum](/interview-question/how-do-you-solve-the-3sum-problem).

**Hash map (one pass)** — for each element, look up its complement, then record the element. **O(n)** time on average, **O(n)** extra space for the map.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="Work measured for n equals 3000 with the answer in the last two positions. Brute force did 4498500 checks, sort plus two pointers did 2999 checks after sorting, the hash map did 3000 lookups">
  <text class="d-text" x="330" y="22" text-anchor="middle">Measured work for n = 3000, answer at the very end</text>
  <rect class="d-box-muted" x="20" y="48" width="190" height="120" rx="10"/>
  <text class="d-text" x="115" y="78" text-anchor="middle">Brute force</text>
  <text class="d-sub" x="115" y="108" text-anchor="middle">every pair</text>
  <text class="d-text" x="115" y="140" text-anchor="middle">4498500 checks</text>
  <rect class="d-box" x="235" y="48" width="190" height="120" rx="10"/>
  <text class="d-text" x="330" y="78" text-anchor="middle">Sort + two pointers</text>
  <text class="d-sub" x="330" y="108" text-anchor="middle">O(n log n) sort first</text>
  <text class="d-text" x="330" y="140" text-anchor="middle">2999 checks</text>
  <rect class="d-box-accent" x="450" y="48" width="190" height="120" rx="10"/>
  <text class="d-text d-accent" x="545" y="78" text-anchor="middle">One-pass hash map</text>
  <text class="d-sub" x="545" y="108" text-anchor="middle">O(n) extra memory</text>
  <text class="d-text d-accent" x="545" y="140" text-anchor="middle">3000 lookups</text>
</svg>

These numbers are not estimates: they are printed by example 2 (see the Verified section). The brute force count is exactly \`3000 × 2999 / 2 = 4,498,500\`. Making \`n\` ten times bigger made brute force about 100 times slower and the hash map 10 times slower — quadratic versus linear growth you can see in the output.

**Which one should you pick?**

| Situation | Best choice | Why |
| :--- | :--- | :--- |
| Unsorted input, indices wanted (the classic) | One-pass hash map | O(n) time; the O(n) memory is the price |
| Input already sorted | Two pointers | O(n) time **and** O(1) extra space |
| Memory is extremely tight, input unsorted | Sort (with indices) + two pointers | O(n log n) time but no hash table |
| n is tiny (say, under 20) | Brute force is fine | Simplest code; constant factors dominate |

### The one rule that makes it correct: look up first, insert second

If you insert \`x\` into the map **before** looking up \`target - x\`, then when \`x\` is exactly half the target (3 with target 6), the lookup finds \`x\` itself and returns the same index twice. Looking up first means the map only ever contains elements from **earlier** positions, so a match is always a different index. It also handles real duplicates for free: in \`[3, 3]\` the second 3 finds the first one.

## 5. The Code in JavaScript

~~~javascript
function twoSum(nums, target) {
  // Return indices [i, j] with nums[i] + nums[j] === target, or [] if none.
  const seen = new Map();          // value -> index where we saw it
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i]; // the partner we are looking for
    if (seen.has(need)) {          // O(1) average Map lookup
      return [seen.get(need), i];
    }
    seen.set(nums[i], i);          // store AFTER the check: never pair x with itself
  }
  return [];
}

function fmt(pair) {
  return '[' + pair.join(', ') + ']';
}

console.log(fmt(twoSum([2, 7, 11, 15], 9)));  // [0, 1]
console.log(fmt(twoSum([3, 2, 4], 6)));       // [1, 2]
console.log(fmt(twoSum([3, 3], 6)));          // [0, 1]
console.log(fmt(twoSum([-3, 4, 3, 90], 0)));  // [0, 2]
console.log(fmt(twoSum([1, 2, 3], 7)));       // []
console.log(fmt(twoSum([5], 10)));            // []
~~~

Line by line, with the JavaScript parts that matter:

- **\`new Map()\`** is JavaScript's general-purpose hash map. \`has\`, \`get\` and \`set\` are O(1) on average. A plain object \`{}\` also works for integer keys, but its keys are always converted to strings (see below), and it inherits properties from \`Object.prototype\`, so \`Map\` is the cleaner, interview-safe choice.
- **\`seen.has(need)\` before \`seen.get(need)\`** — \`get\` returns \`undefined\` for a missing key. Testing \`if (seen.get(need))\` would be a bug: a stored index of \`0\` is falsy.
- **\`seen.set(nums[i], i)\` comes last** — the look-up-first rule from section 4.
- **\`fmt\`** joins the pair with \`', '\`. Printing the array directly gives \`[ 0, 1 ]\` in Node but a different, interactive view in a browser console, so the examples format output themselves.

📌 **Interview term: Map vs object** — a \`Map\` keeps keys with their real type (the number \`1\` and the string \`'1'\` are different keys) and has no inherited keys; a plain object turns every key into a string. Checked by running it:

~~~javascript
const obj = {};
obj[1] = 'one';
console.log(Object.keys(obj), typeof Object.keys(obj)[0]);  // object keys become strings
const m = new Map();
m.set(1, 'number one').set('1', 'string one');
console.log(m.size, m.get(1), m.get('1'));                 // Map keeps 1 and '1' apart
console.log(2 ** 53 + 1 === 2 ** 53);                       // past 2^53, integers lose precision
console.log(Number.isSafeInteger(2 ** 53));
~~~

~~~text
[ '1' ] string
2 number one string one
true
false
~~~

The last two lines are the number-precision point: every JavaScript number is a 64-bit floating-point value, so above \`Number.MAX_SAFE_INTEGER\` (2^53 − 1) two different integers can compare equal. Two Sum inputs in interviews stay far below that, but if values could be huge you would switch to \`BigInt\` and a \`Map\` keyed by \`BigInt\`s.

Here is the classic bug — inserting before looking up:

~~~javascript
function twoSumBuggy(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    seen.set(nums[i], i);                 // BUG: stored before the check
    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
  }
  return [];
}

console.log(JSON.stringify(twoSumBuggy([3, 2, 4], 6)));  // pairs 3 with itself
~~~

~~~text
[0,0]
~~~

\`[0,0]\` uses the 3 at index 0 twice; the correct version returns \`[1, 2]\` for the same input.

## 6. Verified: Running the Code

Both examples were saved as \`main.js\` and run with \`node main.js\` (Node v22). Example 1 — six inputs, including duplicates, negatives, no answer and a single element:

~~~text
[0, 1]
[1, 2]
[0, 1]
[0, 2]
[]
[]
~~~

Example 2 — three approaches, counting the work when the only answer is the last two elements:

~~~text
n=10 answer=[8, 9] same=true
  brute force checks:     45
  sort + two pointers:    9 (plus the sort)
  one-pass hash map:      10
n=100 answer=[98, 99] same=true
  brute force checks:     4950
  sort + two pointers:    99 (plus the sort)
  one-pass hash map:      100
n=1000 answer=[998, 999] same=true
  brute force checks:     499500
  sort + two pointers:    999 (plus the sort)
  one-pass hash map:      1000
n=3000 answer=[2998, 2999] same=true
  brute force checks:     4498500
  sort + two pointers:    2999 (plus the sort)
  one-pass hash map:      3000
~~~

\`same=true\` confirms the three approaches agree. Going from n=100 to n=1000, brute force went from 4,950 to 499,500 checks (×100) while the hash map went from 100 to 1,000 (×10).

Note the comparator in \`sortTwoPointers\`: \`.sort((p, q) => nums[p] - nums[q])\`. Without a comparator, \`Array.prototype.sort\` compares elements **as strings**, which is easy to check:

~~~javascript
console.log([10, 9, 1].sort().join(', '));
console.log([10, 9, 1].sort((a, b) => a - b).join(', '));
~~~

~~~text
1, 10, 9
1, 9, 10
~~~

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | \`n(n-1)/2\` pairs in the worst case |
| Sort + two pointers | O(n log n) | O(n) | The sort dominates; the \`order\` index array is O(n) |
| One-pass \`Map\` | O(n) average | O(n) | One O(1)-average \`has\`/\`set\` per element; the \`Map\` can reach n entries |

Say "O(n) expected" rather than "guaranteed": hash lookups are O(1) on average, and the worst case depends on collisions. More in [time complexity of common operations](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance).

## Edge Cases

- **No solution** (\`[1, 2, 3]\`, target 7) — the loop finishes and returns an empty result. Agree the "not found" value with the interviewer.
- **Fewer than two elements** (\`[5]\`, target 10) — the loop runs once, finds nothing, returns empty. No special case needed.
- **Same value used twice legitimately** (\`[3, 3]\`, target 6) — returns \`[0, 1]\` because the first 3 is already in the map when the second arrives.
- **A value that is half the target, appearing once** (\`[3, 2, 4]\`, target 6) — must **not** return \`[0, 0]\`; look-up-before-insert guarantees that.
- **Negative numbers and zero** (\`[-3, 4, 3, 90]\`, target 0) — work unchanged; the hash map does not depend on order or sign.
- **Repeated values that are not part of the answer** — the map keeps the latest index for a value. That does not break correctness: any earlier copy would have been matched already if it could complete a pair.

## Common Pitfalls

- **Inserting before looking up** — returns \`[0,0]\` for \`[3, 2, 4]\`, target 6, as shown above.
- **\`if (seen.get(need))\`** — fails when the stored index is \`0\`, because \`0\` is falsy. Use \`seen.has(need)\`.
- **\`nums.indexOf(need)\` or \`nums.includes(need)\`** — both are linear scans, turning the solution back into O(n²), and \`indexOf\` can return the current element itself.
- **\`.sort()\` without a comparator** for the two-pointer version — sorts numbers as strings (\`[10, 9, 1]\` becomes \`1, 10, 9\`). Always pass \`(a, b) => a - b\`.
- **Using a plain object as the map** — works for small integers, but keys become strings, so \`-0\`, \`'1'\` vs \`1\` or keys like \`'__proto__'\` behave surprisingly. \`Map\` avoids all of it.
- **Huge integers** — above 2^53 sums lose precision; mention \`BigInt\` if the interviewer allows 64-bit values.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">For each number <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>, check whether its complement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target - x</code> is already in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> of value → index; if yes return both indices, otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set(x, i)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Checking <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code> <strong style="color:#ffca28;">before</strong> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> means the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> only holds earlier positions, so an element never pairs with itself, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[3, 3]</code> still returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 1]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n) average time, one O(1)-average lookup and insert per element, and O(n) extra space. Brute force is O(n²) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The alternative:</strong> <span style="color:#f0e2c8;">On sorted input, two pointers give O(n) time and O(1) space; on unsorted input I would need to sort an index array with a numeric comparator, O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript detail:</strong> <span style="color:#f0e2c8;">I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{}</code>, because object keys become strings, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code> rather than a truthiness check on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>, because index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> is falsy.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> and not a plain object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Object keys are always strings, objects inherit keys from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.prototype</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> keeps the number <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1</code> and the string <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'1'</code> apart. For integer keys an object happens to work, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> is correct for any key and has a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the numbers can exceed 2^53?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plain numbers lose precision there (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 <strong style="color:#ffca28;"> 53 + 1 === 2 </strong> 53</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>), so a sum could match falsely. I would read the values as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> and key the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you need all pairs, not just one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Map each value to an array of indices and, for each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>, emit a pair with every stored index of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target - x</code>. The output can be O(n²) in size, so the bound becomes O(n + output).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> lookup really O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On average. Hash maps can degrade when many keys collide, so I say O(n) expected time. For integer keys in an interview it is the standard answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you write the two-pointer version on sorted input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let lo = 0, hi = nums.length - 1;</code> then loop while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo &lt; hi</code>: if the sum equals the target return, if it is smaller do <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo++</code>, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi--</code>. O(n) time, O(1) space.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Complement** | \`target - x\`: the value that would complete the pair with \`x\` |
| **Hash map** | Key-value table with O(1) average lookup; in JavaScript, \`Map\` |
| **One-pass** | Read the array once, looking up and inserting in the same loop |
| **Brute force** | Try every pair; O(n²) |
| **Two pointers** | Indices moving inward from both ends of a sorted array |
| **Map vs object** | \`Map\` keeps key types and has no inherited keys; object keys are strings |

---
**Conclusion:** Two Sum is solved in O(n) average time with one pass and a \`Map\` from value to index: for each \`x\`, check \`seen.has(target - x)\` first, then \`seen.set(x, i)\`. Brute force is O(n²); two pointers win only when the array is already sorted. The JavaScript-specific traps are the falsy index \`0\`, hidden linear scans (\`indexOf\`, \`includes\`), the string-sorting default of \`.sort()\`, and plain-object keys turning into strings. The same "remember what you have seen" pattern comes back in [counting subarrays that sum to k](/interview-question/how-do-you-count-subarrays-that-sum-to-k), [3Sum](/interview-question/how-do-you-solve-the-3sum-problem) and [finding a duplicate](/interview-question/how-do-you-find-a-duplicate-in-an-array).`,
        examples: [
          {
            label: "One-pass hash map Two Sum on six inputs",
            code: `function twoSum(nums, target) {
  // Return indices [i, j] with nums[i] + nums[j] === target, or [] if none.
  const seen = new Map();          // value -> index where we saw it
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i]; // the partner we are looking for
    if (seen.has(need)) {          // O(1) average Map lookup
      return [seen.get(need), i];
    }
    seen.set(nums[i], i);          // store AFTER the check: never pair x with itself
  }
  return [];
}

function fmt(pair) {
  return '[' + pair.join(', ') + ']';
}

console.log(fmt(twoSum([2, 7, 11, 15], 9)));  // [0, 1]
console.log(fmt(twoSum([3, 2, 4], 6)));       // [1, 2]
console.log(fmt(twoSum([3, 3], 6)));          // [0, 1]
console.log(fmt(twoSum([-3, 4, 3, 90], 0)));  // [0, 2]
console.log(fmt(twoSum([1, 2, 3], 7)));       // []
console.log(fmt(twoSum([5], 10)));            // []`,
          },
          {
            label: "Brute force vs sort + two pointers vs hash map: counting the work",
            code: `// Count the work each approach does when the answer is the LAST pair (worst case).

function bruteForce(nums, target) {
  let checks = 0;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      checks++;
      if (nums[i] + nums[j] === target) return [[i, j], checks];
    }
  }
  return [[], checks];
}

function sortTwoPointers(nums, target) {
  const order = nums.map((_, k) => k).sort((p, q) => nums[p] - nums[q]); // numeric comparator!
  let lo = 0, hi = nums.length - 1, checks = 0;
  while (lo < hi) {
    checks++;
    const s = nums[order[lo]] + nums[order[hi]];
    if (s === target) return [[order[lo], order[hi]].sort((p, q) => p - q), checks];
    if (s < target) lo++;
    else hi--;
  }
  return [[], checks];
}

function hashMap(nums, target) {
  const seen = new Map();
  let checks = 0;
  for (let i = 0; i < nums.length; i++) {
    checks++;
    if (seen.has(target - nums[i])) return [[seen.get(target - nums[i]), i], checks];
    seen.set(nums[i], i);
  }
  return [[], checks];
}

function fmt(pair) {
  return '[' + pair.join(', ') + ']';
}

for (const n of [10, 100, 1000, 3000]) {
  const nums = Array.from({ length: n }, (_, k) => k);  // 0, 1, ..., n-1
  const target = (n - 2) + (n - 1);                    // only the last two values add up
  const [a, ca] = bruteForce(nums, target);
  const [b, cb] = sortTwoPointers(nums, target);
  const [c, cc] = hashMap(nums, target);
  const same = fmt(a) === fmt(b) && fmt(b) === fmt(c);
  console.log('n=' + n + ' answer=' + fmt(c) + ' same=' + same);
  console.log('  brute force checks:     ' + ca);
  console.log('  sort + two pointers:    ' + cb + ' (plus the sort)');
  console.log('  one-pass hash map:      ' + cc);
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an int array and a target, return the indices of the two numbers that add up to the target. Assume exactly one solution and that you may not use the same element twice. Please implement it in Java and explain the time and space complexity."

**What a strong answer should cover:**
- Brute force first (every pair, O(n²)), then the key idea: for each \`x\`, look up its complement \`target - x\`.
- A one-pass \`HashMap<Integer, Integer>\` from value → index, checking **before** inserting so an element never pairs with itself.
- O(n) average time and O(n) extra space; hash lookups are O(1) on average, not guaranteed.
- The sorted-input alternative: two pointers, O(n) time and O(1) space, and why sorting an \`int[]\` loses the indices.
- Java specifics: autoboxing \`int\` to \`Integer\` in the map, comparing \`Integer\`s with \`equals\` (not \`==\`), \`get\` returning \`null\` for a missing key, and \`int\` overflow in \`target - x\` at the extremes.

**Clarifying questions expected:**
- Indices or values? Is the array sorted?
- What to return when no pair exists — an empty array or an exception?

**Code / implementation expected:** Yes — a \`static int[] twoSum(int[] nums, int target)\` in Java using a \`HashMap\`, run on several inputs including duplicates and a no-answer case.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know basic Java arrays, loops and classes; nothing else assumed.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually compiling and running the code (\`javac\` and \`java\`, JDK 21); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

You walk into a shop with a gift card worth exactly **9**. It only works if you spend all of it on **exactly two items**. The shelf has items priced 2, 7, 11 and 15.

The slow way: pick up the first item, then try it with every other item; put it down, pick up the second item, try it with every item after it, and so on. With 4 items that is 6 tries. With 3,000 items it is about 4.5 million tries.

The smart way: carry a small notebook. Walk along the shelf once. At each item, ask one question: *"Is 9 minus this price already written in my notebook?"* If yes, you are done. If no, write this price (and where you saw it) in the notebook and move on. At the 7, you ask "is 2 in my notebook?" — it is, because you wrote it down one step earlier. One walk, one question per item.

That notebook is a **hash map**, and the question "what number would complete this pair?" is the whole trick. Two Sum is usually the first problem in any interview list because it teaches the single most reused move in array problems: **trade a little memory for a lot of time by remembering what you have already seen.**

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is there always exactly one answer? | Decides what you return when there is none (an empty result, \`-1\`s, or an error) and whether "first pair found" is good enough. |
| Do you want the **indices** or the **values**? | Indices rule out the simple "sort then two pointers" version unless you remember the original positions. |
| Can I use the same element twice? | \`[3]\` with target 6 must not return \`[0, 0]\`. This is why the lookup happens **before** the insert. |
| Is the array sorted? | If it is, two pointers solve it in O(n) time with O(1) extra space — better than the hash map. |
| How big are the numbers? Can they be negative? | Negatives are fine for the hash map (it does not care about order). Huge values matter for overflow in fixed-width integer languages. |
| If several pairs work, which one do you want? | The one-pass map returns the pair whose **second** index is smallest; say so. |

## 3. The Core Idea

For every number \`x\`, there is exactly one partner that would complete the pair: \`target - x\`. So instead of asking "which other number pairs with \`x\`?" (a search through the whole array), you ask "have I already **seen** \`target - x\`?" (a single lookup).

📌 **Interview term: Complement** — the value \`target - x\` that, added to \`x\`, gives the target. "Look up the complement" is the phrase interviewers expect.

📌 **Interview term: Hash map** — a key-value table that finds a key in **O(1) on average** by turning the key into an array position (a *hash*). How it works inside, and why the worst case is worse, is its own question: [How does a hash table work?](/interview-question/how-does-a-hash-table-work)

📌 **Interview term: One-pass** — the algorithm reads the array once, from left to right, doing the lookup and the insert in the same loop. A "two-pass" version first fills the map, then looks things up; it works too but needs an extra guard against pairing an element with itself.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Two Sum with target 9 on the array 2 7 11 15. At index 1 the value is 7, the complement is 2, the map already holds 2 at index 0, so the answer is 0 and 1">
  <defs>
    <marker id="ts05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="22" text-anchor="middle">Target 9: one pass, one lookup per element</text>
  <rect class="d-box-muted" x="30" y="42" width="64" height="44" rx="8"/>
  <text class="d-text" x="62" y="70" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="114" y="42" width="64" height="44" rx="8"/>
  <text class="d-text d-accent" x="146" y="70" text-anchor="middle">7</text>
  <rect class="d-box" x="198" y="42" width="64" height="44" rx="8"/>
  <text class="d-text" x="230" y="70" text-anchor="middle">11</text>
  <rect class="d-box" x="282" y="42" width="64" height="44" rx="8"/>
  <text class="d-text" x="314" y="70" text-anchor="middle">15</text>
  <text class="d-sub" x="62" y="106" text-anchor="middle">i = 0</text>
  <text class="d-sub" x="146" y="106" text-anchor="middle">i = 1</text>
  <text class="d-sub" x="230" y="106" text-anchor="middle">i = 2</text>
  <text class="d-sub" x="314" y="106" text-anchor="middle">i = 3</text>
  <path class="d-edge-accent" d="M 146 114 L 146 150" marker-end="url(#ts05-arrow)"/>
  <rect class="d-box" x="40" y="156" width="220" height="50" rx="8"/>
  <text class="d-text" x="150" y="186" text-anchor="middle">need = 9 - 7 = 2</text>
  <path class="d-edge" d="M 262 181 L 384 181" marker-end="url(#ts05-arrow)"/>
  <text class="d-sub" x="322" y="170" text-anchor="middle">look up</text>
  <rect class="d-box-muted" x="392" y="156" width="230" height="50" rx="8"/>
  <text class="d-text" x="507" y="186" text-anchor="middle">seen = { 2 : index 0 }</text>
  <path class="d-edge-accent" d="M 507 152 L 507 94" marker-end="url(#ts05-arrow)"/>
  <rect class="d-box-accent" x="402" y="42" width="210" height="44" rx="8"/>
  <text class="d-text d-accent" x="507" y="70" text-anchor="middle">found: return [0, 1]</text>
</svg>

At index 0 the map was empty, so the lookup for \`9 - 2 = 7\` failed and \`2 → 0\` was written down. At index 1 the lookup for \`2\` succeeds, and the loop stops after looking at only two elements.

## 4. From Brute Force to One Pass

There are three standard approaches. Knowing all three — and when each wins — is what separates a memorised answer from an understood one.

📌 **Interview term: Brute force** — trying every possibility directly. Here: every pair \`(i, j)\` with \`i < j\`. That is \`n(n-1)/2\` pairs, so **O(n²)** time and O(1) extra space. For a refresher on reading these labels, see [What is Big-O notation?](/interview-question/what-is-big-o-notation)

📌 **Interview term: Two pointers** — keep one index at the left end and one at the right end of a **sorted** array. If the sum is too small, move the left one right (to a bigger number); if too big, move the right one left. Each step discards one element for good, so the scan is O(n). Sorting first costs O(n log n), and because sorting moves elements you must carry the original indices along. The same idea, run once per element, solves [3Sum](/interview-question/how-do-you-solve-the-3sum-problem).

**Hash map (one pass)** — for each element, look up its complement, then record the element. **O(n)** time on average, **O(n)** extra space for the map.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="Work measured for n equals 3000 with the answer in the last two positions. Brute force did 4498500 checks, sort plus two pointers did 2999 checks after sorting, the hash map did 3000 lookups">
  <text class="d-text" x="330" y="22" text-anchor="middle">Measured work for n = 3000, answer at the very end</text>
  <rect class="d-box-muted" x="20" y="48" width="190" height="120" rx="10"/>
  <text class="d-text" x="115" y="78" text-anchor="middle">Brute force</text>
  <text class="d-sub" x="115" y="108" text-anchor="middle">every pair</text>
  <text class="d-text" x="115" y="140" text-anchor="middle">4498500 checks</text>
  <rect class="d-box" x="235" y="48" width="190" height="120" rx="10"/>
  <text class="d-text" x="330" y="78" text-anchor="middle">Sort + two pointers</text>
  <text class="d-sub" x="330" y="108" text-anchor="middle">O(n log n) sort first</text>
  <text class="d-text" x="330" y="140" text-anchor="middle">2999 checks</text>
  <rect class="d-box-accent" x="450" y="48" width="190" height="120" rx="10"/>
  <text class="d-text d-accent" x="545" y="78" text-anchor="middle">One-pass hash map</text>
  <text class="d-sub" x="545" y="108" text-anchor="middle">O(n) extra memory</text>
  <text class="d-text d-accent" x="545" y="140" text-anchor="middle">3000 lookups</text>
</svg>

These numbers are not estimates: they are printed by example 2 (see the Verified section). The brute force count is exactly \`3000 × 2999 / 2 = 4,498,500\`. Making \`n\` ten times bigger made brute force about 100 times slower and the hash map 10 times slower — quadratic versus linear growth you can see in the output.

**Which one should you pick?**

| Situation | Best choice | Why |
| :--- | :--- | :--- |
| Unsorted input, indices wanted (the classic) | One-pass hash map | O(n) time; the O(n) memory is the price |
| Input already sorted | Two pointers | O(n) time **and** O(1) extra space |
| Memory is extremely tight, input unsorted | Sort (with indices) + two pointers | O(n log n) time but no hash table |
| n is tiny (say, under 20) | Brute force is fine | Simplest code; constant factors dominate |

### The one rule that makes it correct: look up first, insert second

If you insert \`x\` into the map **before** looking up \`target - x\`, then when \`x\` is exactly half the target (3 with target 6), the lookup finds \`x\` itself and returns the same index twice. Looking up first means the map only ever contains elements from **earlier** positions, so a match is always a different index. It also handles real duplicates for free: in \`[3, 3]\` the second 3 finds the first one.

## 5. The Code in Java

~~~java
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class Main {
    // Return indices {i, j} with nums[i] + nums[j] == target, or {} if none.
    static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();   // value -> index
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];                // the partner we are looking for
            Integer j = seen.get(need);                 // null when absent
            if (j != null) {
                return new int[]{j, i};
            }
            seen.put(nums[i], i);                       // store AFTER the check
        }
        return new int[0];
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(twoSum(new int[]{2, 7, 11, 15}, 9)));  // [0, 1]
        System.out.println(Arrays.toString(twoSum(new int[]{3, 2, 4}, 6)));       // [1, 2]
        System.out.println(Arrays.toString(twoSum(new int[]{3, 3}, 6)));          // [0, 1]
        System.out.println(Arrays.toString(twoSum(new int[]{-3, 4, 3, 90}, 0)));  // [0, 2]
        System.out.println(Arrays.toString(twoSum(new int[]{1, 2, 3}, 7)));       // []
        System.out.println(Arrays.toString(twoSum(new int[]{5}, 10)));            // []
    }
}
~~~

Line by line, with the Java parts that matter:

- **\`Map<Integer, Integer> seen = new HashMap<>()\`** — Java collections cannot hold primitive \`int\`s, so every key and value is an \`Integer\` object.
- **\`Integer j = seen.get(need)\`** — \`get\` returns \`null\` when the key is missing. Storing the result in an \`Integer\` (not an \`int\`) and testing \`j != null\` does one lookup instead of the two that \`containsKey\` + \`get\` would do. Writing \`int j = seen.get(need);\` would throw a \`NullPointerException\` on the first miss, because Java tries to unbox \`null\`.
- **\`seen.put(nums[i], i)\` comes last** — the look-up-first rule from section 4.
- **\`Arrays.toString(int[])\`** prints \`[0, 1]\`; printing the array directly would print something like \`[I@1b6d3586\` (its type and identity hash), not the contents.

📌 **Interview term: Autoboxing** — Java automatically wraps a primitive \`int\` in an \`Integer\` object when you put it into a collection, and unwraps it (*unboxing*) when you read it into an \`int\`. It is convenient, costs an object per entry, and causes two classic bugs, both shown here:

~~~java
import java.util.HashMap;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        Map<Integer, Integer> seen = new HashMap<>();
        seen.put(1, 127);
        seen.put(2, 127);
        seen.put(3, 1000);
        seen.put(4, 1000);
        System.out.println(seen.get(1) == seen.get(2));      // compares references
        System.out.println(seen.get(3) == seen.get(4));      // compares references
        System.out.println(seen.get(3).equals(seen.get(4))); // compares values
        int target = Integer.MIN_VALUE, x = 1;
        System.out.println(target - x);                      // int wraps around
        System.out.println((long) target - x);               // widen first
    }
}
~~~

~~~text
true
false
true
2147483647
-2147483649
~~~

- \`==\` on two \`Integer\`s compares **object identity**. It printed \`true\` for 127 and \`false\` for 1000 in this run: small values came back as the same cached object, larger ones as separate objects (the JDK caches boxed values from −128 to 127; see [JDK-6239319](https://bugs.openjdk.org/browse/JDK-6239319), which also warns applications not to depend on what is cached). Never rely on it; compare values with \`equals\` (or unbox to \`int\` first).
- \`Integer.MIN_VALUE - 1\` wrapped around to \`2147483647\`. Java \`int\` arithmetic silently wraps on overflow. With the usual constraint (values and target within ±10^9) the difference stays within ±2·10^9, which fits in an \`int\`; if the range is wider, compute the complement in \`long\`.

Here is the classic bug — inserting before looking up:

~~~java
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class Main {
    static int[] twoSumBuggy(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            seen.put(nums[i], i);                        // BUG: stored before the check
            Integer j = seen.get(target - nums[i]);
            if (j != null) return new int[]{j, i};
        }
        return new int[0];
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(twoSumBuggy(new int[]{3, 2, 4}, 6)));  // pairs 3 with itself
    }
}
~~~

~~~text
[0, 0]
~~~

\`[0, 0]\` uses the 3 at index 0 twice; the correct version returns \`[1, 2]\` for the same input.

## 6. Verified: Running the Code

Both examples were saved as \`Main.java\` and run with \`javac Main.java && java Main\` (JDK 21). Example 1 — six inputs, including duplicates, negatives, no answer and a single element:

~~~text
[0, 1]
[1, 2]
[0, 1]
[0, 2]
[]
[]
~~~

Example 2 — three approaches, counting the work when the only answer is the last two elements:

~~~text
n=10 answer=[8, 9] same=true
  brute force checks:     45
  sort + two pointers:    9 (plus the sort)
  one-pass hash map:      10
n=100 answer=[98, 99] same=true
  brute force checks:     4950
  sort + two pointers:    99 (plus the sort)
  one-pass hash map:      100
n=1000 answer=[998, 999] same=true
  brute force checks:     499500
  sort + two pointers:    999 (plus the sort)
  one-pass hash map:      1000
n=3000 answer=[2998, 2999] same=true
  brute force checks:     4498500
  sort + two pointers:    2999 (plus the sort)
  one-pass hash map:      3000
~~~

\`same=true\` confirms all three agree (\`Arrays.equals\` compares array contents; \`==\` on arrays would compare references). Going from n=100 to n=1000, brute force went from 4,950 to 499,500 checks (×100), the hash map from 100 to 1,000 (×10).

In \`sortTwoPointers\` the index array is an \`Integer[]\`, not an \`int[]\`: \`Arrays.sort\` only accepts a comparator for object arrays, so sorting indices by value needs boxed indices. \`Integer.compare(nums[p], nums[q])\` is used instead of \`nums[p] - nums[q]\` because subtraction can overflow for values of opposite sign near the \`int\` limits.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | \`n(n-1)/2\` pairs in the worst case |
| Sort + two pointers | O(n log n) | O(n) | The sort dominates; the boxed \`Integer[]\` index array is O(n) |
| One-pass \`HashMap\` | O(n) average | O(n) | One O(1)-average \`get\`/\`put\` per element; up to n boxed entries |

The \`HashMap\` also has a real constant-factor cost in Java: each entry is an object holding two boxed \`Integer\`s. That is why, for the sorted case, two pointers on a plain \`int[]\` is faster in practice, not just in theory. Hash lookups are O(1) **on average**; see [time complexity of common operations](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance).

## Edge Cases

- **No solution** (\`[1, 2, 3]\`, target 7) — the loop finishes and returns an empty result. Agree the "not found" value with the interviewer.
- **Fewer than two elements** (\`[5]\`, target 10) — the loop runs once, finds nothing, returns empty. No special case needed.
- **Same value used twice legitimately** (\`[3, 3]\`, target 6) — returns \`[0, 1]\` because the first 3 is already in the map when the second arrives.
- **A value that is half the target, appearing once** (\`[3, 2, 4]\`, target 6) — must **not** return \`[0, 0]\`; look-up-before-insert guarantees that.
- **Negative numbers and zero** (\`[-3, 4, 3, 90]\`, target 0) — work unchanged; the hash map does not depend on order or sign.
- **Repeated values that are not part of the answer** — the map keeps the latest index for a value. That does not break correctness: any earlier copy would have been matched already if it could complete a pair.

## Common Pitfalls

- **Inserting before looking up** — returns \`[0, 0]\` for \`[3, 2, 4]\`, target 6, as shown above.
- **\`int j = seen.get(need);\`** — unboxing \`null\` throws \`NullPointerException\` on the first miss. Keep it as \`Integer\` and test for \`null\`, or use \`containsKey\`.
- **Comparing \`Integer\`s with \`==\`** — identity, not value: \`true\` for 127 and \`false\` for 1000 in the run above. Use \`equals\`.
- **Overflow in \`target - nums[i]\` or in a comparator \`a - b\`** — \`int\` wraps silently. Use \`long\` for the complement when the range allows it, and \`Integer.compare\` in comparators.
- **\`System.out.println(int[])\`** — prints a type tag and hash, not the elements. Use \`Arrays.toString\`.
- **Sorting \`nums\` itself with \`Arrays.sort(nums)\`** for two pointers and returning those positions — they are no longer the original indices.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">For each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>, look up <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target - x</code> in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Integer, Integer&gt;</code> of value → index; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> returns non-null I return both indices, otherwise I <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put(x, i)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Looking up <strong style="color:#ffca28;">before</strong> inserting means the map only holds earlier positions, so I never pair an element with itself, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[3, 3]</code> still gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 1]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n) average time and O(n) extra space; brute force is O(n²) time and O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The alternative:</strong> <span style="color:#f0e2c8;">If the array is sorted, two pointers give O(n) time and O(1) space with no boxing at all; on unsorted input that needs an O(n log n) sort of an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer[]</code> index array.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Java detail:</strong> <span style="color:#f0e2c8;">I keep the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> result as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> and test for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>, because unboxing a missing value throws, and I never compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code>s with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Integer j = seen.get(need)</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">containsKey</code> then <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">get</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is one hash lookup instead of two. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> for a missing key, which is unambiguous here because the map never stores <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">target - nums[i]</code> overflow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, Java <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> arithmetic wraps: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MIN_VALUE - 1</code> printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2147483647</code>. With values in ±10^9 it fits; for wider ranges I would compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(long) target - nums[i]</code> and key the map by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Long</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">==</code> do on two <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Integer</code> values from the map?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It compares object references. In the run above it was <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code> for 127 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> for 1000. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>, or unbox into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> variables before comparing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return "no solution"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either an empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[0]</code>, as here, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">throw new IllegalArgumentException("no two sum")</code>. I would ask which the caller expects; LeetCode-style signatures usually guarantee a solution.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is HashMap lookup always O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On average. With many collisions a bucket gets long, so the honest bound is O(n) expected. For integer keys in an interview it is the standard answer.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Complement** | \`target - x\`: the value that would complete the pair with \`x\` |
| **Hash map** | Key-value table with O(1) average lookup; in Java, \`HashMap\` |
| **One-pass** | Read the array once, looking up and inserting in the same loop |
| **Brute force** | Try every pair; O(n²) |
| **Two pointers** | Indices moving inward from both ends of a sorted array |
| **Autoboxing** | Automatic wrapping of \`int\` into \`Integer\` (and back) for collections |

---
**Conclusion:** Two Sum is solved in O(n) average time with one pass and a \`HashMap<Integer, Integer>\` from value to index: for each \`x\`, \`get(target - x)\` first and \`put(x, i)\` after, so an element never pairs with itself. Brute force is O(n²); two pointers win only on sorted input. The Java-specific traps are all about boxing and fixed-width ints: unboxing a \`null\`, comparing \`Integer\`s with \`==\`, and silent overflow in \`target - x\` or in a subtraction comparator. The same "remember what you have seen" pattern comes back in [counting subarrays that sum to k](/interview-question/how-do-you-count-subarrays-that-sum-to-k), [3Sum](/interview-question/how-do-you-solve-the-3sum-problem) and [finding a duplicate](/interview-question/how-do-you-find-a-duplicate-in-an-array).`,
        examples: [
          {
            label: "One-pass hash map Two Sum on six inputs",
            code: `import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class Main {
    // Return indices {i, j} with nums[i] + nums[j] == target, or {} if none.
    static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();   // value -> index
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];                // the partner we are looking for
            Integer j = seen.get(need);                 // null when absent
            if (j != null) {
                return new int[]{j, i};
            }
            seen.put(nums[i], i);                       // store AFTER the check
        }
        return new int[0];
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(twoSum(new int[]{2, 7, 11, 15}, 9)));  // [0, 1]
        System.out.println(Arrays.toString(twoSum(new int[]{3, 2, 4}, 6)));       // [1, 2]
        System.out.println(Arrays.toString(twoSum(new int[]{3, 3}, 6)));          // [0, 1]
        System.out.println(Arrays.toString(twoSum(new int[]{-3, 4, 3, 90}, 0)));  // [0, 2]
        System.out.println(Arrays.toString(twoSum(new int[]{1, 2, 3}, 7)));       // []
        System.out.println(Arrays.toString(twoSum(new int[]{5}, 10)));            // []
    }
}`,
          },
          {
            label: "Brute force vs sort + two pointers vs hash map: counting the work",
            code: `import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class Main {
    static long checks;   // work counter shared by the three approaches

    static int[] bruteForce(int[] nums, int target) {
        checks = 0;
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                checks++;
                if (nums[i] + nums[j] == target) return new int[]{i, j};
            }
        }
        return new int[0];
    }

    static int[] sortTwoPointers(int[] nums, int target) {
        Integer[] order = new Integer[nums.length];            // boxed so we can pass a comparator
        for (int k = 0; k < nums.length; k++) order[k] = k;
        Arrays.sort(order, (p, q) -> Integer.compare(nums[p], nums[q]));
        int lo = 0, hi = nums.length - 1;
        checks = 0;
        while (lo < hi) {
            checks++;
            int s = nums[order[lo]] + nums[order[hi]];
            if (s == target) {
                int[] r = {order[lo], order[hi]};
                Arrays.sort(r);
                return r;
            }
            if (s < target) lo++;
            else hi--;
        }
        return new int[0];
    }

    static int[] hashMap(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        checks = 0;
        for (int i = 0; i < nums.length; i++) {
            checks++;
            Integer j = seen.get(target - nums[i]);
            if (j != null) return new int[]{j, i};
            seen.put(nums[i], i);
        }
        return new int[0];
    }

    public static void main(String[] args) {
        for (int n : new int[]{10, 100, 1000, 3000}) {
            int[] nums = new int[n];
            for (int k = 0; k < n; k++) nums[k] = k;           // 0, 1, ..., n-1
            int target = (n - 2) + (n - 1);                    // only the last two values add up
            int[] a = bruteForce(nums, target);
            long ca = checks;
            int[] b = sortTwoPointers(nums, target);
            long cb = checks;
            int[] c = hashMap(nums, target);
            long cc = checks;
            boolean same = Arrays.equals(a, b) && Arrays.equals(b, c);
            System.out.println("n=" + n + " answer=" + Arrays.toString(c) + " same=" + same);
            System.out.println("  brute force checks:     " + ca);
            System.out.println("  sort + two pointers:    " + cb + " (plus the sort)");
            System.out.println("  one-pass hash map:      " + cc);
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a vector of integers and a target, return the indices of the two numbers that add up to the target. Assume exactly one answer and that the same element cannot be used twice. Please write it in C++ and tell me the time and space complexity."

**What a strong answer should cover:**
- Brute force first (every pair, O(n²)), then the key idea: for each \`x\`, look up its complement \`target - x\`.
- A one-pass \`std::unordered_map<int, int>\` from value → index, checking **before** inserting so an element never pairs with itself.
- O(n) average time and O(n) extra space; \`unordered_map\` lookups are O(1) on average, not guaranteed.
- The sorted-input alternative: two pointers, O(n) time and O(1) space, and why \`std::sort\` on the values loses the indices.
- C++ specifics: use \`find\` (or \`count\`), not \`operator[]\`, for lookups because \`operator[]\` inserts missing keys; signed \`int\` overflow in \`target - x\` is undefined behaviour, so widen to \`long long\` when the range demands it.

**Clarifying questions expected:**
- Indices or values? Is the input sorted?
- What should be returned when no pair exists?

**Code / implementation expected:** Yes — a \`vector<int> twoSum(const vector<int>& nums, int target)\` in C++17 using \`unordered_map\`, run on several inputs including duplicates and a no-answer case.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know basic C++ (\`vector\`, loops, functions); nothing else assumed.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by actually compiling and running the code with \`g++ -std=c++17\` (GCC 13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

You walk into a shop with a gift card worth exactly **9**. It only works if you spend all of it on **exactly two items**. The shelf has items priced 2, 7, 11 and 15.

The slow way: pick up the first item, then try it with every other item; put it down, pick up the second item, try it with every item after it, and so on. With 4 items that is 6 tries. With 3,000 items it is about 4.5 million tries.

The smart way: carry a small notebook. Walk along the shelf once. At each item, ask one question: *"Is 9 minus this price already written in my notebook?"* If yes, you are done. If no, write this price (and where you saw it) in the notebook and move on. At the 7, you ask "is 2 in my notebook?" — it is, because you wrote it down one step earlier. One walk, one question per item.

That notebook is a **hash map**, and the question "what number would complete this pair?" is the whole trick. Two Sum is usually the first problem in any interview list because it teaches the single most reused move in array problems: **trade a little memory for a lot of time by remembering what you have already seen.**

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is there always exactly one answer? | Decides what you return when there is none (an empty result, \`-1\`s, or an error) and whether "first pair found" is good enough. |
| Do you want the **indices** or the **values**? | Indices rule out the simple "sort then two pointers" version unless you remember the original positions. |
| Can I use the same element twice? | \`[3]\` with target 6 must not return \`[0, 0]\`. This is why the lookup happens **before** the insert. |
| Is the array sorted? | If it is, two pointers solve it in O(n) time with O(1) extra space — better than the hash map. |
| How big are the numbers? Can they be negative? | Negatives are fine for the hash map (it does not care about order). Huge values matter for overflow in fixed-width integer languages. |
| If several pairs work, which one do you want? | The one-pass map returns the pair whose **second** index is smallest; say so. |

## 3. The Core Idea

For every number \`x\`, there is exactly one partner that would complete the pair: \`target - x\`. So instead of asking "which other number pairs with \`x\`?" (a search through the whole array), you ask "have I already **seen** \`target - x\`?" (a single lookup).

📌 **Interview term: Complement** — the value \`target - x\` that, added to \`x\`, gives the target. "Look up the complement" is the phrase interviewers expect.

📌 **Interview term: Hash map** — a key-value table that finds a key in **O(1) on average** by turning the key into an array position (a *hash*). How it works inside, and why the worst case is worse, is its own question: [How does a hash table work?](/interview-question/how-does-a-hash-table-work)

📌 **Interview term: One-pass** — the algorithm reads the array once, from left to right, doing the lookup and the insert in the same loop. A "two-pass" version first fills the map, then looks things up; it works too but needs an extra guard against pairing an element with itself.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Two Sum with target 9 on the array 2 7 11 15. At index 1 the value is 7, the complement is 2, the map already holds 2 at index 0, so the answer is 0 and 1">
  <defs>
    <marker id="ts05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="330" y="22" text-anchor="middle">Target 9: one pass, one lookup per element</text>
  <rect class="d-box-muted" x="30" y="42" width="64" height="44" rx="8"/>
  <text class="d-text" x="62" y="70" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="114" y="42" width="64" height="44" rx="8"/>
  <text class="d-text d-accent" x="146" y="70" text-anchor="middle">7</text>
  <rect class="d-box" x="198" y="42" width="64" height="44" rx="8"/>
  <text class="d-text" x="230" y="70" text-anchor="middle">11</text>
  <rect class="d-box" x="282" y="42" width="64" height="44" rx="8"/>
  <text class="d-text" x="314" y="70" text-anchor="middle">15</text>
  <text class="d-sub" x="62" y="106" text-anchor="middle">i = 0</text>
  <text class="d-sub" x="146" y="106" text-anchor="middle">i = 1</text>
  <text class="d-sub" x="230" y="106" text-anchor="middle">i = 2</text>
  <text class="d-sub" x="314" y="106" text-anchor="middle">i = 3</text>
  <path class="d-edge-accent" d="M 146 114 L 146 150" marker-end="url(#ts05-arrow)"/>
  <rect class="d-box" x="40" y="156" width="220" height="50" rx="8"/>
  <text class="d-text" x="150" y="186" text-anchor="middle">need = 9 - 7 = 2</text>
  <path class="d-edge" d="M 262 181 L 384 181" marker-end="url(#ts05-arrow)"/>
  <text class="d-sub" x="322" y="170" text-anchor="middle">look up</text>
  <rect class="d-box-muted" x="392" y="156" width="230" height="50" rx="8"/>
  <text class="d-text" x="507" y="186" text-anchor="middle">seen = { 2 : index 0 }</text>
  <path class="d-edge-accent" d="M 507 152 L 507 94" marker-end="url(#ts05-arrow)"/>
  <rect class="d-box-accent" x="402" y="42" width="210" height="44" rx="8"/>
  <text class="d-text d-accent" x="507" y="70" text-anchor="middle">found: return [0, 1]</text>
</svg>

At index 0 the map was empty, so the lookup for \`9 - 2 = 7\` failed and \`2 → 0\` was written down. At index 1 the lookup for \`2\` succeeds, and the loop stops after looking at only two elements.

## 4. From Brute Force to One Pass

There are three standard approaches. Knowing all three — and when each wins — is what separates a memorised answer from an understood one.

📌 **Interview term: Brute force** — trying every possibility directly. Here: every pair \`(i, j)\` with \`i < j\`. That is \`n(n-1)/2\` pairs, so **O(n²)** time and O(1) extra space. For a refresher on reading these labels, see [What is Big-O notation?](/interview-question/what-is-big-o-notation)

📌 **Interview term: Two pointers** — keep one index at the left end and one at the right end of a **sorted** array. If the sum is too small, move the left one right (to a bigger number); if too big, move the right one left. Each step discards one element for good, so the scan is O(n). Sorting first costs O(n log n), and because sorting moves elements you must carry the original indices along. The same idea, run once per element, solves [3Sum](/interview-question/how-do-you-solve-the-3sum-problem).

**Hash map (one pass)** — for each element, look up its complement, then record the element. **O(n)** time on average, **O(n)** extra space for the map.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="Work measured for n equals 3000 with the answer in the last two positions. Brute force did 4498500 checks, sort plus two pointers did 2999 checks after sorting, the hash map did 3000 lookups">
  <text class="d-text" x="330" y="22" text-anchor="middle">Measured work for n = 3000, answer at the very end</text>
  <rect class="d-box-muted" x="20" y="48" width="190" height="120" rx="10"/>
  <text class="d-text" x="115" y="78" text-anchor="middle">Brute force</text>
  <text class="d-sub" x="115" y="108" text-anchor="middle">every pair</text>
  <text class="d-text" x="115" y="140" text-anchor="middle">4498500 checks</text>
  <rect class="d-box" x="235" y="48" width="190" height="120" rx="10"/>
  <text class="d-text" x="330" y="78" text-anchor="middle">Sort + two pointers</text>
  <text class="d-sub" x="330" y="108" text-anchor="middle">O(n log n) sort first</text>
  <text class="d-text" x="330" y="140" text-anchor="middle">2999 checks</text>
  <rect class="d-box-accent" x="450" y="48" width="190" height="120" rx="10"/>
  <text class="d-text d-accent" x="545" y="78" text-anchor="middle">One-pass hash map</text>
  <text class="d-sub" x="545" y="108" text-anchor="middle">O(n) extra memory</text>
  <text class="d-text d-accent" x="545" y="140" text-anchor="middle">3000 lookups</text>
</svg>

These numbers are not estimates: they are printed by example 2 (see the Verified section). The brute force count is exactly \`3000 × 2999 / 2 = 4,498,500\`. Making \`n\` ten times bigger made brute force about 100 times slower and the hash map 10 times slower — quadratic versus linear growth you can see in the output.

**Which one should you pick?**

| Situation | Best choice | Why |
| :--- | :--- | :--- |
| Unsorted input, indices wanted (the classic) | One-pass hash map | O(n) time; the O(n) memory is the price |
| Input already sorted | Two pointers | O(n) time **and** O(1) extra space |
| Memory is extremely tight, input unsorted | Sort (with indices) + two pointers | O(n log n) time but no hash table |
| n is tiny (say, under 20) | Brute force is fine | Simplest code; constant factors dominate |

### The one rule that makes it correct: look up first, insert second

If you insert \`x\` into the map **before** looking up \`target - x\`, then when \`x\` is exactly half the target (3 with target 6), the lookup finds \`x\` itself and returns the same index twice. Looking up first means the map only ever contains elements from **earlier** positions, so a match is always a different index. It also handles real duplicates for free: in \`[3, 3]\` the second 3 finds the first one.

## 5. The Code in C++

~~~cpp
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

// Return indices {i, j} with nums[i] + nums[j] == target, or {} if none.
vector<int> twoSum(const vector<int>& nums, int target) {
    unordered_map<int, int> seen;                 // value -> index
    for (int i = 0; i < (int)nums.size(); i++) {
        int need = target - nums[i];              // the partner we are looking for
        auto it = seen.find(need);                // find() never inserts
        if (it != seen.end()) {
            return {it->second, i};
        }
        seen[nums[i]] = i;                        // store AFTER the check
    }
    return {};
}

string fmt(const vector<int>& v) {
    string s = "[";
    for (size_t i = 0; i < v.size(); i++) {
        if (i) s += ", ";
        s += to_string(v[i]);
    }
    return s + "]";
}

int main() {
    cout << fmt(twoSum({2, 7, 11, 15}, 9)) << endl;  // [0, 1]
    cout << fmt(twoSum({3, 2, 4}, 6)) << endl;       // [1, 2]
    cout << fmt(twoSum({3, 3}, 6)) << endl;          // [0, 1]
    cout << fmt(twoSum({-3, 4, 3, 90}, 0)) << endl;  // [0, 2]
    cout << fmt(twoSum({1, 2, 3}, 7)) << endl;       // []
    cout << fmt(twoSum({5}, 10)) << endl;            // []
    return 0;
}
~~~

Line by line, with the C++ parts that matter:

- **\`unordered_map<int, int> seen\`** — the standard hash map. Lookup and insert are O(1) on average. (\`std::map\` is a balanced tree: O(log n) per operation and sorted keys, which Two Sum does not need.)
- **\`seen.find(need)\`** returns an iterator; comparing it with \`seen.end()\` tells you whether the key exists, and \`it->second\` is the stored index. One lookup, and it never changes the map.
- **\`seen[nums[i]] = i\`** — \`operator[]\` is fine for **writing**. It is a trap for **reading**, see below.
- **\`const vector<int>& nums\`** — pass by const reference so the vector is not copied on every call.
- **\`return {it->second, i};\`** — brace-initialises the returned \`vector<int>\`.

📌 **Interview term: \`operator[]\` inserts** — on an \`unordered_map\`, \`seen[k]\` with a missing key **creates** the entry \`k → 0\` and returns a reference to it. So \`if (seen[need] ...)\` as a membership test both gives a wrong answer (index 0 looks like "found at 0") and grows the map. Checked by running it:

~~~cpp
#include <iostream>
#include <unordered_map>
using namespace std;

int main() {
    unordered_map<int, int> seen;
    seen[7] = 0;
    cout << "size before: " << seen.size() << endl;
    if (seen[42] == 0) { }                       // operator[] on a missing key INSERTS 42 -> 0
    cout << "size after operator[]: " << seen.size() << endl;
    cout << "count(99): " << seen.count(99) << endl;   // count() and find() never insert
    cout << "size after count: " << seen.size() << endl;
}
~~~

~~~text
size before: 1
size after operator[]: 2
count(99): 0
size after count: 2
~~~

📌 **Interview term: Signed overflow (undefined behaviour)** — in C++, if an \`int\` calculation overflows (for example \`INT_MIN - 1\`), the program has *undefined behaviour*: the compiler may assume it never happens, so the result is not reliably "wrapped". It is not shown in a run here because an undefined result is not something a run can prove. With values within ±10^9 the complement \`target - x\` stays within ±2·10^9 and fits in a 32-bit \`int\`; for wider ranges compute it as \`(long long)target - x\` and key the map by \`long long\`.

Here is the classic bug — inserting before looking up:

~~~cpp
#include <iostream>
#include <unordered_map>
#include <vector>
using namespace std;

vector<int> twoSumBuggy(const vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < (int)nums.size(); i++) {
        seen[nums[i]] = i;                               // BUG: stored before the check
        auto it = seen.find(target - nums[i]);
        if (it != seen.end()) return {it->second, i};
    }
    return {};
}

int main() {
    vector<int> r = twoSumBuggy({3, 2, 4}, 6);           // pairs 3 with itself
    cout << "[" << r[0] << ", " << r[1] << "]" << endl;
}
~~~

~~~text
[0, 0]
~~~

\`[0, 0]\` uses the 3 at index 0 twice; the correct version returns \`[1, 2]\` for the same input.

## 6. Verified: Running the Code

Both examples were saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13; the verifier also compiles with \`-O2\`). Example 1 — six inputs, including duplicates, negatives, no answer and a single element:

~~~text
[0, 1]
[1, 2]
[0, 1]
[0, 2]
[]
[]
~~~

Example 2 — three approaches, counting the work when the only answer is the last two elements:

~~~text
n=10 answer=[8, 9] same=true
  brute force checks:     45
  sort + two pointers:    9 (plus the sort)
  one-pass hash map:      10
n=100 answer=[98, 99] same=true
  brute force checks:     4950
  sort + two pointers:    99 (plus the sort)
  one-pass hash map:      100
n=1000 answer=[998, 999] same=true
  brute force checks:     499500
  sort + two pointers:    999 (plus the sort)
  one-pass hash map:      1000
n=3000 answer=[2998, 2999] same=true
  brute force checks:     4498500
  sort + two pointers:    2999 (plus the sort)
  one-pass hash map:      3000
~~~

\`same=true\` confirms the three agree (\`vector\` has a real \`operator==\` that compares contents; \`std::boolalpha\` makes \`cout\` print \`true\` instead of \`1\`). From n=100 to n=1000, brute force went from 4,950 to 499,500 checks (×100), the hash map from 100 to 1,000 (×10).

In \`sortTwoPointers\`, \`std::iota\` fills \`order\` with \`0, 1, 2, ...\` and the lambda \`[&](int p, int q) { return nums[p] < nums[q]; }\` sorts those indices by value. A \`std::sort\` comparator must be a strict "less than" (\`<\`, never \`<=\`); with \`<=\` the sort is not guaranteed to work correctly.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | \`n(n-1)/2\` pairs in the worst case |
| Sort + two pointers | O(n log n) | O(n) | \`std::sort\` dominates; the \`order\` index vector is O(n) |
| One-pass \`unordered_map\` | O(n) average | O(n) | One O(1)-average \`find\` and insert per element |

Two practical notes: calling \`seen.reserve(nums.size())\` up front avoids repeated rehashing as the map grows, and \`unordered_map\` is O(1) **on average** only — many colliding keys degrade it. More in [time complexity of common operations](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance).

## Edge Cases

- **No solution** (\`[1, 2, 3]\`, target 7) — the loop finishes and returns an empty result. Agree the "not found" value with the interviewer.
- **Fewer than two elements** (\`[5]\`, target 10) — the loop runs once, finds nothing, returns empty. No special case needed.
- **Same value used twice legitimately** (\`[3, 3]\`, target 6) — returns \`[0, 1]\` because the first 3 is already in the map when the second arrives.
- **A value that is half the target, appearing once** (\`[3, 2, 4]\`, target 6) — must **not** return \`[0, 0]\`; look-up-before-insert guarantees that.
- **Negative numbers and zero** (\`[-3, 4, 3, 90]\`, target 0) — work unchanged; the hash map does not depend on order or sign.
- **Repeated values that are not part of the answer** — the map keeps the latest index for a value. That does not break correctness: any earlier copy would have been matched already if it could complete a pair.

## Common Pitfalls

- **Inserting before looking up** — returns \`[0, 0]\` for \`[3, 2, 4]\`, target 6, as shown above.
- **Using \`seen[need]\` to test membership** — \`operator[]\` inserts a \`0\` for a missing key, which both looks like "found at index 0" and grows the map. Use \`find\` or \`count\`.
- **Signed overflow in \`target - nums[i]\`** — undefined behaviour, not a predictable wrap. Widen to \`long long\` when inputs can be near the \`int\` limits.
- **\`std::sort\` with a non-strict comparator (\`<=\`)** — breaks the comparator contract; always use \`<\`.
- **Sorting \`nums\` itself for two pointers** and returning those positions — they are no longer the original indices. Sort an index vector instead.
- **Loop index type** — comparing \`int i\` with \`nums.size()\` (an unsigned \`size_t\`) triggers sign-compare warnings; cast once, as in \`(int)nums.size()\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">For each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>, I <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find(target - x)</code> in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map&lt;int, int&gt;</code> of value → index; if the iterator is not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">end()</code> I return both indices, otherwise I store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen[x] = i</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Looking up <strong style="color:#ffca28;">before</strong> inserting means the map only holds earlier positions, so an element never pairs with itself, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[3, 3]</code> still gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 1]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n) average time and O(n) extra space; brute force is O(n²) time and O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The alternative:</strong> <span style="color:#f0e2c8;">If the input is sorted, two pointers give O(n) time and O(1) space; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> on an index vector costs O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ detail:</strong> <span style="color:#f0e2c8;">I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code>, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code>, to test membership, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[]</code> inserts a default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>; and I widen to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target - x</code> could overflow, since signed overflow is undefined behaviour.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_map</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">map</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::map</code> is a balanced binary search tree: O(log n) per operation and keeps keys sorted. Two Sum needs no ordering, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> with O(1) average operations is the better fit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What exactly goes wrong with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">if (seen[need])</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a missing key, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> inserts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">need → 0</code> and returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>, so the test is false — but if the real partner was at index 0 it is also <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>. You lose correctness and grow the map; the run above showed the size going from 1 to 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can this overflow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target - nums[i]</code> can overflow a 32-bit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> if values are near the limits, and signed overflow is undefined behaviour in C++. With ±10^9 inputs it fits; otherwise compute it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you speed up the hash map version in practice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen.reserve(nums.size())</code> so the table does not rehash while growing, and pass the input by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code>. The complexity stays O(n); the constant factor drops.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the vector is already sorted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two pointers: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = 0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = n - 1</code>; move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code> up when the sum is too small and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> down when too big. O(n) time and O(1) extra space, and no hashing at all.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Complement** | \`target - x\`: the value that would complete the pair with \`x\` |
| **Hash map** | Key-value table with O(1) average lookup; in C++, \`std::unordered_map\` |
| **One-pass** | Read the array once, looking up and inserting in the same loop |
| **Brute force** | Try every pair; O(n²) |
| **Two pointers** | Indices moving inward from both ends of a sorted array |
| **\`operator[]\` inserts** | Reading a missing key with \`[]\` creates it with a default value |
| **Signed overflow (undefined behaviour)** | An \`int\` result out of range: the program has no defined meaning |

---
**Conclusion:** Two Sum is solved in O(n) average time with one pass and an \`unordered_map<int, int>\` from value to index: \`find(target - x)\` first, then \`seen[x] = i\`, so an element never pairs with itself. Brute force is O(n²); two pointers win only on sorted input. The C++-specific traps are \`operator[]\` silently inserting on a read, signed overflow being undefined behaviour rather than a wrap, and a non-strict \`std::sort\` comparator. The same "remember what you have seen" pattern comes back in [counting subarrays that sum to k](/interview-question/how-do-you-count-subarrays-that-sum-to-k), [3Sum](/interview-question/how-do-you-solve-the-3sum-problem) and [finding a duplicate](/interview-question/how-do-you-find-a-duplicate-in-an-array).`,
        examples: [
          {
            label: "One-pass hash map Two Sum on six inputs",
            code: `#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

// Return indices {i, j} with nums[i] + nums[j] == target, or {} if none.
vector<int> twoSum(const vector<int>& nums, int target) {
    unordered_map<int, int> seen;                 // value -> index
    for (int i = 0; i < (int)nums.size(); i++) {
        int need = target - nums[i];              // the partner we are looking for
        auto it = seen.find(need);                // find() never inserts
        if (it != seen.end()) {
            return {it->second, i};
        }
        seen[nums[i]] = i;                        // store AFTER the check
    }
    return {};
}

string fmt(const vector<int>& v) {
    string s = "[";
    for (size_t i = 0; i < v.size(); i++) {
        if (i) s += ", ";
        s += to_string(v[i]);
    }
    return s + "]";
}

int main() {
    cout << fmt(twoSum({2, 7, 11, 15}, 9)) << endl;  // [0, 1]
    cout << fmt(twoSum({3, 2, 4}, 6)) << endl;       // [1, 2]
    cout << fmt(twoSum({3, 3}, 6)) << endl;          // [0, 1]
    cout << fmt(twoSum({-3, 4, 3, 90}, 0)) << endl;  // [0, 2]
    cout << fmt(twoSum({1, 2, 3}, 7)) << endl;       // []
    cout << fmt(twoSum({5}, 10)) << endl;            // []
    return 0;
}`,
          },
          {
            label: "Brute force vs sort + two pointers vs hash map: counting the work",
            code: `#include <algorithm>
#include <iostream>
#include <numeric>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

long long checks;   // work counter shared by the three approaches

vector<int> bruteForce(const vector<int>& nums, int target) {
    checks = 0;
    for (size_t i = 0; i < nums.size(); i++)
        for (size_t j = i + 1; j < nums.size(); j++) {
            checks++;
            if (nums[i] + nums[j] == target) return {(int)i, (int)j};
        }
    return {};
}

vector<int> sortTwoPointers(const vector<int>& nums, int target) {
    vector<int> order(nums.size());
    iota(order.begin(), order.end(), 0);                     // 0, 1, 2, ...
    sort(order.begin(), order.end(), [&](int p, int q) { return nums[p] < nums[q]; });
    int lo = 0, hi = (int)nums.size() - 1;
    checks = 0;
    while (lo < hi) {
        checks++;
        int s = nums[order[lo]] + nums[order[hi]];
        if (s == target) return {min(order[lo], order[hi]), max(order[lo], order[hi])};
        if (s < target) lo++;
        else hi--;
    }
    return {};
}

vector<int> hashMap(const vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    checks = 0;
    for (int i = 0; i < (int)nums.size(); i++) {
        checks++;
        auto it = seen.find(target - nums[i]);
        if (it != seen.end()) return {it->second, i};
        seen[nums[i]] = i;
    }
    return {};
}

string fmt(const vector<int>& v) {
    string s = "[";
    for (size_t i = 0; i < v.size(); i++) s += (i ? ", " : "") + to_string(v[i]);
    return s + "]";
}

int main() {
    for (int n : {10, 100, 1000, 3000}) {
        vector<int> nums(n);
        iota(nums.begin(), nums.end(), 0);                   // 0, 1, ..., n-1
        int target = (n - 2) + (n - 1);                      // only the last two values add up
        vector<int> a = bruteForce(nums, target);
        long long ca = checks;
        vector<int> b = sortTwoPointers(nums, target);
        long long cb = checks;
        vector<int> c = hashMap(nums, target);
        long long cc = checks;
        cout << boolalpha;
        cout << "n=" << n << " answer=" << fmt(c) << " same=" << (a == b && b == c) << endl;
        cout << "  brute force checks:     " << ca << endl;
        cout << "  sort + two pointers:    " << cb << " (plus the sort)" << endl;
        cout << "  one-pass hash map:      " << cc << endl;
    }
    return 0;
}`,
          },
        ],
      },
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you check if two strings are anagrams?",
    difficulty: "easy",
    seoDescription: "Check if two strings are anagrams by sorting (O(n log n)) or counting characters (O(n)), with Unicode traps and verified Python, JS, Java and C++ code.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Write a Python function that takes two strings and returns whether one is an anagram of the other — same characters, same number of times, any order. Then tell me its complexity and how you would change it if case and spaces should be ignored."

**What a strong answer should cover:**
- The definition in terms of counts: anagrams have identical character frequencies, and different lengths mean \`False\` immediately.
- Two solutions: \`sorted(s) == sorted(t)\` in O(n log n), and counting in O(n) with a \`dict\` or \`collections.Counter\`.
- Space: O(k) for the counts (k distinct characters), or O(1) with a 26-slot list when input is guaranteed \`a\`–\`z\`.
- Normalising both strings the same way (\`.lower()\`, removing spaces) when the rules say case and spaces do not count.
- Python specifics: \`Counter(s) == Counter(t)\` is the idiomatic one-liner; \`sorted()\` on a \`str\` returns a list; Python strings are sequences of code points, but visually identical text can still differ (composed vs decomposed accents) without \`unicodedata.normalize\`.

**Clarifying questions expected:**
- Case-sensitive? Do spaces and punctuation count?
- Only lowercase \`a\`–\`z\`, or any Unicode?

**Code / implementation expected:** Yes — an \`is_anagram(s, t)\` function in Python, ideally the O(n) counting version, run on a few true/false cases.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Python strings, loops and dicts; nothing else assumed.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by running the code with \`python3\` (3.13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

Two friends are playing a word game. Each has a little bag of letter tiles, and you want to know: **do the two bags hold exactly the same tiles?** Not the same word — the same tiles. "listen" and "silent" would pass; "rat" and "car" would not; "aab" and "abb" would not either, even though both use only \`a\` and \`b\`.

There are two natural ways to check.

1. **Line them up.** Pour each bag out and arrange the tiles alphabetically. "listen" becomes \`e i l n s t\`, and so does "silent". If the two rows match tile for tile, the bags are the same. Sorting takes a bit of effort, but it is simple.
2. **Keep a tally.** Take a sheet of paper with one row per letter. For every tile in the first bag, add a mark to its row; for every tile in the second bag, rub one mark out. If every row ends at zero, the bags were identical. You touch each tile exactly once.

That is the whole problem. The second way — counting — is the one interviewers want to hear, because it is linear time and because the same "frequency table" idea solves a whole family of harder questions: [grouping anagrams](/interview-question/how-do-you-group-anagrams-together), finding anagrams inside a longer string with a [sliding window](/interview-question/what-is-the-sliding-window-technique), and the [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is it case-sensitive? Is "Listen" an anagram of "silent"? | Decides whether you lowercase first. The plain problem compares characters exactly. |
| Do spaces and punctuation count? ("Dirty room" vs "Dormitory") | Phrase anagrams ignore spaces; you normalise both strings before counting. |
| What characters can appear — only \`a\`–\`z\`, ASCII, or any Unicode? | Only \`a\`–\`z\` lets you use a fixed 26-slot array (O(1) space). Unicode needs a hash map and raises the "what is a character?" question. |
| Is a string an anagram of itself? Of the empty string? | Usually yes, and \`""\` vs \`""\` is \`true\`. Worth confirming for the return value. |
| How long can the strings be, and how many checks will run? | One check: any O(n) or O(n log n) method is fine. Millions of checks: precomputed counts or keys (see grouping anagrams). |

## 3. The Core Idea

Two strings are anagrams exactly when every character appears **the same number of times** in both. Order does not matter, only counts.

📌 **Interview term: Anagram** — a rearrangement of the characters of one string to form another, using every character exactly as many times as it occurs. "listen" → "silent".

📌 **Interview term: Frequency map (frequency table / histogram)** — a table from each distinct character to how many times it occurs. Two strings are anagrams if and only if their frequency maps are equal.

📌 **Interview term: Early exit on length** — if the lengths differ, the answer is \`false\` immediately, without looking at a single character. It is O(1) and it is also what makes the "add for one string, subtract for the other" trick safe.

The counting method, shown on "anagram" vs "nagaram": add 1 for each letter of the first string, subtract 1 for each letter of the second. Every row ends at zero, so they are anagrams.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="Counting table for anagram versus nagaram. Letters a n g r m. Plus counts from the first string are 3 1 1 1 1, minus counts from the second are 3 1 1 1 1, and every balance is 0">
  <text class="d-text" x="330" y="22" text-anchor="middle">Count up for s, count down for t</text>
  <text class="d-sub" x="70" y="78" text-anchor="middle">letter</text>
  <text class="d-sub" x="70" y="128" text-anchor="middle">+ from s</text>
  <text class="d-sub" x="70" y="178" text-anchor="middle">- from t</text>
  <text class="d-sub" x="70" y="226" text-anchor="middle">balance</text>
  <rect class="d-box-muted" x="140" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="180" y="78" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="240" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="280" y="78" text-anchor="middle">g</text>
  <rect class="d-box-muted" x="340" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="380" y="78" text-anchor="middle">m</text>
  <rect class="d-box-muted" x="440" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="480" y="78" text-anchor="middle">n</text>
  <rect class="d-box-muted" x="540" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="580" y="78" text-anchor="middle">r</text>
  <text class="d-text" x="180" y="128" text-anchor="middle">3</text>
  <text class="d-text" x="280" y="128" text-anchor="middle">1</text>
  <text class="d-text" x="380" y="128" text-anchor="middle">1</text>
  <text class="d-text" x="480" y="128" text-anchor="middle">1</text>
  <text class="d-text" x="580" y="128" text-anchor="middle">1</text>
  <text class="d-text" x="180" y="178" text-anchor="middle">3</text>
  <text class="d-text" x="280" y="178" text-anchor="middle">1</text>
  <text class="d-text" x="380" y="178" text-anchor="middle">1</text>
  <text class="d-text" x="480" y="178" text-anchor="middle">1</text>
  <text class="d-text" x="580" y="178" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="140" y="200" width="480" height="40" rx="8"/>
  <text class="d-text d-accent" x="180" y="226" text-anchor="middle">0</text>
  <text class="d-text d-accent" x="280" y="226" text-anchor="middle">0</text>
  <text class="d-text d-accent" x="380" y="226" text-anchor="middle">0</text>
  <text class="d-text d-accent" x="480" y="226" text-anchor="middle">0</text>
  <text class="d-text d-accent" x="580" y="226" text-anchor="middle">0</text>
</svg>

The frequencies \`a=3 g=1 m=1 n=1 r=1\` are exactly what example 2 prints for both strings. A single non-zero balance — for "aab" vs "abb", \`a\` ends at +1 and \`b\` at −1 — means "not an anagram".

The sorting method is even easier to picture: sort both strings and compare.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 170" role="img" aria-label="Sorting method. listen sorts to eilnst, silent sorts to eilnst, the two sorted strings are equal so the answer is true">
  <defs>
    <marker id="an05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="24" width="150" height="44" rx="8"/>
  <text class="d-text" x="105" y="52" text-anchor="middle">listen</text>
  <rect class="d-box" x="30" y="104" width="150" height="44" rx="8"/>
  <text class="d-text" x="105" y="132" text-anchor="middle">silent</text>
  <path class="d-edge" d="M 184 46 L 264 46" marker-end="url(#an05-arrow)"/>
  <path class="d-edge" d="M 184 126 L 264 126" marker-end="url(#an05-arrow)"/>
  <text class="d-sub" x="224" y="36" text-anchor="middle">sort</text>
  <text class="d-sub" x="224" y="116" text-anchor="middle">sort</text>
  <rect class="d-box-muted" x="272" y="24" width="150" height="44" rx="8"/>
  <text class="d-text" x="347" y="52" text-anchor="middle">eilnst</text>
  <rect class="d-box-muted" x="272" y="104" width="150" height="44" rx="8"/>
  <text class="d-text" x="347" y="132" text-anchor="middle">eilnst</text>
  <path class="d-edge-accent" d="M 426 46 L 486 80" marker-end="url(#an05-arrow)"/>
  <path class="d-edge-accent" d="M 426 126 L 486 92" marker-end="url(#an05-arrow)"/>
  <rect class="d-box-accent" x="494" y="64" width="140" height="44" rx="8"/>
  <text class="d-text d-accent" x="564" y="92" text-anchor="middle">equal: true</text>
</svg>

## 4. Three Approaches and When to Use Each

| Approach | Time | Extra space | Use it when |
| :--- | :--- | :--- | :--- |
| Sort both, compare | O(n log n) | O(n) for the sorted copies | You want the shortest correct code, or you also need a canonical "key" (as in grouping anagrams) |
| Hash-map counting | O(n) | O(k), k = distinct characters | Any character set: the general answer |
| Fixed array of 26 (or 256) counts | O(n) | O(1) — the array size does not grow with n | Characters are guaranteed to be \`a\`–\`z\` (or single bytes) |

📌 **Interview term: Counting sort idea** — when the set of possible values is small and known (26 letters), you can count into a fixed array indexed by the value instead of comparing elements. That is why the 26-slot version is O(n) time **and** O(1) space.

**One table or two?** You can build two frequency maps and compare them, but a single table — \`+1\` for each character of \`s\`, \`−1\` for each character of \`t\` — does the same job with half the memory. Because the lengths are equal (checked first), "every count is zero" is exactly "same multiset". A second common shape counts \`s\` up, then walks \`t\` and returns \`false\` the moment a count would go below zero — an earlier exit on mismatches.

**What "character" means is a real question.** The O(n) claim assumes each character is one unit of the string. Across languages that unit differs — a Unicode code point, a UTF-16 code unit, or a byte — and counting the wrong unit can call two different strings anagrams. Section 5 shows exactly what happens in this language, with a run.

## 5. The Code in Python

The counting version, written out so you can explain every step:

~~~python
def is_anagram(s, t):
    """True if t uses exactly the same characters as s, the same number of times."""
    if len(s) != len(t):           # different lengths can never match
        return False
    counts = {}                    # character -> (count in s) - (count in t)
    for a, b in zip(s, t):
        counts[a] = counts.get(a, 0) + 1
        counts[b] = counts.get(b, 0) - 1
    return all(v == 0 for v in counts.values())


def normalize(s):
    """Ignore case and spaces: "Dirty room" -> "dirtyroom"."""
    return "".join(ch.lower() for ch in s if ch != " ")


def show(s, t):
    print('"' + s + '" vs "' + t + '": ' + str(is_anagram(s, t)).lower())


show("anagram", "nagaram")
show("listen", "silent")
show("rat", "car")
show("aab", "abb")
show("a", "ab")
show("", "")
show("Dormitory", "dirtyroom")
print("normalized: " + str(is_anagram(normalize("Dormitory"), normalize("Dirty room"))).lower())
~~~

- **\`if len(s) != len(t): return False\`** — the O(1) early exit. It also makes the single-table trick valid: with equal lengths, "all balances zero" means "same counts".
- **\`zip(s, t)\`** walks both strings in step, one character from each per iteration.
- **\`counts.get(a, 0) + 1\`** — \`dict.get\` with a default avoids a \`KeyError\` for a character seen for the first time.
- **\`all(v == 0 for v in counts.values())\`** — stops at the first non-zero balance.
- **\`normalize\`** applies the same rule (lowercase, drop spaces) to **both** inputs; the comparison itself does not change.

In real Python code — and as your one-line answer in an interview — the standard library already has the frequency map:

~~~python
from collections import Counter

print(Counter("anagram"))
print(Counter("anagram") == Counter("nagaram"))
print(sorted("listen"))                       # sorted() on a str returns a LIST of characters
print(sorted("listen") == sorted("silent"))
~~~

~~~text
Counter({'a': 3, 'n': 1, 'g': 1, 'r': 1, 'm': 1})
True
['e', 'i', 'l', 'n', 's', 't']
True
~~~

📌 **Interview term: \`collections.Counter\`** — a \`dict\` subclass that counts hashable items. \`Counter("anagram")\` builds the frequency map in O(n), and \`==\` compares two Counters as maps. It is the most idiomatic O(n) anagram check in Python. Note that \`sorted("listen")\` returns a **list** of characters, which is why the sorting check compares lists, not strings (use \`"".join(sorted(s))\` when you need a string key).

### What a "character" is in Python

A Python \`str\` is a sequence of Unicode **code points** (one number per character in the Unicode table). That makes Python more forgiving than languages that count UTF-16 units or bytes — but it does not make "looks the same" equal to "is the same":

~~~python
import unicodedata
from collections import Counter

a = "\\U0001F600\\U0001D400"        # grinning face + bold capital A
b = "\\U0001F400\\U0001D600"        # rat + sans-serif bold small s
print(len(a), Counter(a) == Counter(b))   # str is a sequence of code points

composed = "café"            # e-acute as ONE code point
decomposed = "café"         # e + combining accent: TWO code points
print(len(composed), len(decomposed), Counter(composed) == Counter(decomposed))
nfc = unicodedata.normalize("NFC", decomposed)
print(Counter(composed) == Counter(nfc))
~~~

~~~text
2 False
4 5 False
True
~~~

- Line 1: the two emoji-like strings each have length 2 and are correctly **not** anagrams, because Python counts whole code points. (The JavaScript, Java and C++ versions of this page show the same pair being wrongly called anagrams when you count UTF-16 units or bytes.)
- Line 2: "café" can be stored as 4 code points (é as one) or 5 (e plus a combining accent). They print identically but their Counters differ.
- Line 3: \`unicodedata.normalize("NFC", ...)\` converts both to the same composed form, after which they match.

📌 **Interview term: Unicode normalisation** — converting text to one canonical form (NFC composes accents into single code points) so that visually identical strings compare equal. Mention it if the interviewer says "any Unicode".

## 6. Verified: Running the Code

Both examples were saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). Example 1 — the counting check on eight inputs:

~~~text
"anagram" vs "nagaram": true
"listen" vs "silent": true
"rat" vs "car": false
"aab" vs "abb": false
"a" vs "ab": false
"" vs "": true
"Dormitory" vs "dirtyroom": false
normalized: true
~~~

\`"Dormitory"\` vs \`"dirtyroom"\` is \`false\` because \`D\` and \`d\` are different characters; after normalising both, it is \`true\`.

Example 2 — three methods on the same pairs, plus the frequency maps from the diagram:

~~~text
anagram/nagaram: sort=true count=true array26=true
rat/car: sort=false count=false array26=false
aab/abb: sort=false count=false array26=false
abc/abcd: sort=false count=false array26=false
/: sort=true count=true array26=true
freq(anagram): a=3 g=1 m=1 n=1 r=1
freq(nagaram): a=3 g=1 m=1 n=1 r=1
~~~

All three methods agree on every pair, and the two frequency lines are identical — the definition of an anagram, printed.

## 7. Complexity

| Method | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`sorted(s) == sorted(t)\` | O(n log n) | O(n) | Sorting dominates; \`sorted\` builds two new lists |
| \`dict\` / \`Counter\` counting | O(n) | O(k) | One pass per string, O(1) average per dict update; k distinct characters |
| 26-slot list | O(n) | O(1) | Fixed-size list regardless of n; only valid for \`a\`–\`z\` |

In CPython the \`Counter\` one-liner is usually fast in practice because its counting loop runs in C, but the asymptotic answer is the same O(n). n is the string length; with the early length check, both strings have length n. More on reading these numbers: [What is Big-O notation?](/interview-question/what-is-big-o-notation)

## Edge Cases

- **Different lengths** (\`"a"\` vs \`"ab"\`) — \`false\` without counting.
- **Both empty** (\`""\` vs \`""\`) — \`true\`: two empty bags hold the same tiles.
- **Same letters, different counts** (\`"aab"\` vs \`"abb"\`) — \`false\`; this is the case that breaks a "same set of letters" check that ignores counts.
- **Identical strings** — \`true\` under the standard definition; confirm if the interviewer wants "a different word".
- **Case and spaces** (\`"Dormitory"\` vs \`"Dirty room"\`) — \`false\` as raw strings, \`true\` after lowercasing and removing spaces. Normalise **both** strings the same way before comparing.
- **Characters outside \`a\`–\`z\`** — break the 26-slot array (out-of-range index) and need the hash-map version.

## Common Pitfalls

- **Comparing sets instead of counts** — \`set(s) == set(t)\` says \`"aab"\` and \`"abb"\` are anagrams. Counts matter.
- **Forgetting the length check** in the \`zip\` version — \`zip\` silently stops at the shorter string, so without the check \`"a"\` vs \`"ab"\` only compares the first pair and returns \`True\` (checked by running it).
- **Normalising only one string** — \`s.lower()\` compared with an un-lowered \`t\` gives false negatives.
- **Using the 26-slot list on general input** — Python lists accept negative indices, so uppercase letters fail in two different ways (run below): \`"G"\` lands on index −26, which is the \`a\` slot, and \`"A"\` (index −32) raises \`IndexError\`.

~~~python
def by_array26(s, t):                 # assumes lowercase a-z only
    if len(s) != len(t):
        return False
    counts = [0] * 26
    for a, b in zip(s, t):
        counts[ord(a) - ord("a")] += 1
        counts[ord(b) - ord("a")] -= 1
    return all(c == 0 for c in counts)

print(by_array26("G", "a"))           # ord("G") - ord("a") is -26, which is index 0 = the "a" slot
try:
    by_array26("A", "a")              # -32 is out of range even for negative indexing
except IndexError as e:
    print("IndexError:", e)
~~~

~~~text
True
IndexError: list index out of range
~~~

- **Comparing \`sorted(s)\` with \`t\`** — \`sorted\` returns a list; a list never equals a string, so the result is always \`False\`.
- **Assuming visually equal Unicode is equal** — normalise with \`unicodedata.normalize\` when the input is arbitrary text.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Two strings are anagrams when every character appears the same number of times, so in Python I return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len(s) == len(t) and Counter(s) == Counter(t)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The two approaches:</strong> <span style="color:#f0e2c8;">Sorting — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(s) == sorted(t)</code> — is O(n log n); counting with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code> is O(n) time and O(k) space for k distinct characters.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The space optimisation:</strong> <span style="color:#f0e2c8;">If the input is guaranteed lowercase <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>–<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">z</code>, a list of 26 counts gives O(1) extra space — add for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code>, subtract for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">t</code>, check all zeros.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The rules question:</strong> <span style="color:#f0e2c8;">I would ask about case, spaces and the character set first, and normalise <strong style="color:#ffca28;">both</strong> strings identically, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.lower()</code> and removing spaces.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Python detail:</strong> <span style="color:#f0e2c8;">Python strings are code points, so emoji count correctly, but composed and decomposed accents differ until I apply <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unicodedata.normalize("NFC", s)</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">set(s) == set(t)</code> wrong?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A set forgets counts: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set("aab") == set("abb")</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>, but they are not anagrams. You need a multiset, which is exactly what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code> is.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which is faster in practice, sorting or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Counter</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Asymptotically <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code> wins, O(n) vs O(n log n). For short strings both are tiny; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code>'s counting loop runs in C, so it is the idiomatic and usually fast choice. I would say I would measure if it mattered.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle millions of comparisons against one fixed word?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compute the word's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code> (or sorted key) once and reuse it, so each comparison only processes the other string. For grouping many words, use a canonical key per word in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find all anagrams of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">p</code> inside a longer string <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">s</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A fixed-size sliding window of length <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len(p)</code> over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code>, updating a 26-count array as one character enters and one leaves, and comparing with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p</code>'s counts — O(len(s)) overall.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What breaks with the 26-slot list on uppercase input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Python allows negative indices, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"G"</code> maps to index −26, which is the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> slot — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">by_array26("G", "a")</code> returned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> in the run above — while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"A"</code> (−32) raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IndexError</code>. Validate the input or use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Anagram** | Same characters, same counts, any order |
| **Frequency map** | Table from character to how many times it appears |
| **Early exit on length** | Different lengths mean \`False\` immediately |
| **Counting sort idea** | Count into a fixed array indexed by value when the value range is small |
| **\`collections.Counter\`** | Python \`dict\` subclass that counts items; comparable with \`==\` |
| **Unicode normalisation** | Converting text to one canonical form so equal-looking strings compare equal |

---
**Conclusion:** Two strings are anagrams when their character counts match. In Python, \`Counter(s) == Counter(t)\` (or a hand-written \`dict\` count with an early length check) is the O(n) answer, and \`sorted(s) == sorted(t)\` is the O(n log n) one that also gives you a reusable key. Use a 26-slot list only when the input is guaranteed lowercase \`a\`–\`z\`, normalise both strings the same way when case or spaces do not count, and remember that Python counts code points — correct for most text, but not a substitute for Unicode normalisation. The same frequency-map idea powers [grouping anagrams](/interview-question/how-do-you-group-anagrams-together) and [finding the top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements).`,
        examples: [
          {
            label: "Counting anagram check on eight inputs, including case and spaces",
            code: `def is_anagram(s, t):
    """True if t uses exactly the same characters as s, the same number of times."""
    if len(s) != len(t):           # different lengths can never match
        return False
    counts = {}                    # character -> (count in s) - (count in t)
    for a, b in zip(s, t):
        counts[a] = counts.get(a, 0) + 1
        counts[b] = counts.get(b, 0) - 1
    return all(v == 0 for v in counts.values())


def normalize(s):
    """Ignore case and spaces: "Dirty room" -> "dirtyroom"."""
    return "".join(ch.lower() for ch in s if ch != " ")


def show(s, t):
    print('"' + s + '" vs "' + t + '": ' + str(is_anagram(s, t)).lower())


show("anagram", "nagaram")
show("listen", "silent")
show("rat", "car")
show("aab", "abb")
show("a", "ab")
show("", "")
show("Dormitory", "dirtyroom")
print("normalized: " + str(is_anagram(normalize("Dormitory"), normalize("Dirty room"))).lower())`,
          },
          {
            label: "Sorting vs hash-map counting vs 26-slot array: all three agree",
            code: `# Three ways to check an anagram, run on the same pairs. All must agree.

def by_sorting(s, t):
    return sorted(s) == sorted(t)                 # O(n log n)


def by_counting(s, t):
    if len(s) != len(t):
        return False
    counts = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    for ch in t:
        if counts.get(ch, 0) == 0:                # t has a character s ran out of
            return False
        counts[ch] -= 1
    return True                                   # O(n)


def by_array26(s, t):                             # only for lowercase a-z
    if len(s) != len(t):
        return False
    counts = [0] * 26
    for a, b in zip(s, t):
        counts[ord(a) - ord("a")] += 1
        counts[ord(b) - ord("a")] -= 1
    return all(c == 0 for c in counts)            # O(n), O(1) space


def freq(s):
    counts = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    return " ".join(ch + "=" + str(counts[ch]) for ch in sorted(counts))


pairs = [("anagram", "nagaram"), ("rat", "car"), ("aab", "abb"), ("abc", "abcd"), ("", "")]
for s, t in pairs:
    r = [by_sorting(s, t), by_counting(s, t), by_array26(s, t)]
    print(s + "/" + t + ": sort=" + str(r[0]).lower() + " count=" + str(r[1]).lower()
          + " array26=" + str(r[2]).lower())
print("freq(anagram): " + freq("anagram"))
print("freq(nagaram): " + freq("nagaram"))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Write a JavaScript function that returns true if two strings are anagrams of each other — the same characters the same number of times, in any order. Explain the complexity, and what changes if the input can contain any Unicode text."

**What a strong answer should cover:**
- The count-based definition, with an early \`false\` when the lengths differ.
- Two solutions: sort-and-compare (\`s.split('').sort().join('')\`), O(n log n), and counting with a \`Map\` or a 26-slot array, O(n).
- Space: O(k) for a \`Map\` of k distinct characters; O(1) for a fixed array when input is \`a\`–\`z\`.
- Normalising both strings the same way (\`toLowerCase()\`, removing spaces) when the rules require it.
- JavaScript specifics: string indexing and \`.length\` work on UTF-16 code units, so emoji and other astral characters are two units; iterate with \`for...of\` or \`[...s]\` to get code points. \`Map\` keeps key types; \`counts.get(ch) || 0\` is the usual default idiom.

**Clarifying questions expected:**
- Case-sensitive? Do spaces and punctuation count?
- ASCII letters only, or any Unicode?

**Code / implementation expected:** Yes — an \`isAnagram(s, t)\` function in JavaScript, preferably the O(n) counting version, run on several true/false cases.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know JavaScript strings, loops and objects; nothing else assumed.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by running the code with \`node\` (v22); nothing is typed in by hand. The examples only use \`console.log\`, so they behave the same in a browser.

## 1. Why This Even Matters — A Story First

Two friends are playing a word game. Each has a little bag of letter tiles, and you want to know: **do the two bags hold exactly the same tiles?** Not the same word — the same tiles. "listen" and "silent" would pass; "rat" and "car" would not; "aab" and "abb" would not either, even though both use only \`a\` and \`b\`.

There are two natural ways to check.

1. **Line them up.** Pour each bag out and arrange the tiles alphabetically. "listen" becomes \`e i l n s t\`, and so does "silent". If the two rows match tile for tile, the bags are the same. Sorting takes a bit of effort, but it is simple.
2. **Keep a tally.** Take a sheet of paper with one row per letter. For every tile in the first bag, add a mark to its row; for every tile in the second bag, rub one mark out. If every row ends at zero, the bags were identical. You touch each tile exactly once.

That is the whole problem. The second way — counting — is the one interviewers want to hear, because it is linear time and because the same "frequency table" idea solves a whole family of harder questions: [grouping anagrams](/interview-question/how-do-you-group-anagrams-together), finding anagrams inside a longer string with a [sliding window](/interview-question/what-is-the-sliding-window-technique), and the [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is it case-sensitive? Is "Listen" an anagram of "silent"? | Decides whether you lowercase first. The plain problem compares characters exactly. |
| Do spaces and punctuation count? ("Dirty room" vs "Dormitory") | Phrase anagrams ignore spaces; you normalise both strings before counting. |
| What characters can appear — only \`a\`–\`z\`, ASCII, or any Unicode? | Only \`a\`–\`z\` lets you use a fixed 26-slot array (O(1) space). Unicode needs a hash map and raises the "what is a character?" question. |
| Is a string an anagram of itself? Of the empty string? | Usually yes, and \`""\` vs \`""\` is \`true\`. Worth confirming for the return value. |
| How long can the strings be, and how many checks will run? | One check: any O(n) or O(n log n) method is fine. Millions of checks: precomputed counts or keys (see grouping anagrams). |

## 3. The Core Idea

Two strings are anagrams exactly when every character appears **the same number of times** in both. Order does not matter, only counts.

📌 **Interview term: Anagram** — a rearrangement of the characters of one string to form another, using every character exactly as many times as it occurs. "listen" → "silent".

📌 **Interview term: Frequency map (frequency table / histogram)** — a table from each distinct character to how many times it occurs. Two strings are anagrams if and only if their frequency maps are equal.

📌 **Interview term: Early exit on length** — if the lengths differ, the answer is \`false\` immediately, without looking at a single character. It is O(1) and it is also what makes the "add for one string, subtract for the other" trick safe.

The counting method, shown on "anagram" vs "nagaram": add 1 for each letter of the first string, subtract 1 for each letter of the second. Every row ends at zero, so they are anagrams.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="Counting table for anagram versus nagaram. Letters a n g r m. Plus counts from the first string are 3 1 1 1 1, minus counts from the second are 3 1 1 1 1, and every balance is 0">
  <text class="d-text" x="330" y="22" text-anchor="middle">Count up for s, count down for t</text>
  <text class="d-sub" x="70" y="78" text-anchor="middle">letter</text>
  <text class="d-sub" x="70" y="128" text-anchor="middle">+ from s</text>
  <text class="d-sub" x="70" y="178" text-anchor="middle">- from t</text>
  <text class="d-sub" x="70" y="226" text-anchor="middle">balance</text>
  <rect class="d-box-muted" x="140" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="180" y="78" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="240" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="280" y="78" text-anchor="middle">g</text>
  <rect class="d-box-muted" x="340" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="380" y="78" text-anchor="middle">m</text>
  <rect class="d-box-muted" x="440" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="480" y="78" text-anchor="middle">n</text>
  <rect class="d-box-muted" x="540" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="580" y="78" text-anchor="middle">r</text>
  <text class="d-text" x="180" y="128" text-anchor="middle">3</text>
  <text class="d-text" x="280" y="128" text-anchor="middle">1</text>
  <text class="d-text" x="380" y="128" text-anchor="middle">1</text>
  <text class="d-text" x="480" y="128" text-anchor="middle">1</text>
  <text class="d-text" x="580" y="128" text-anchor="middle">1</text>
  <text class="d-text" x="180" y="178" text-anchor="middle">3</text>
  <text class="d-text" x="280" y="178" text-anchor="middle">1</text>
  <text class="d-text" x="380" y="178" text-anchor="middle">1</text>
  <text class="d-text" x="480" y="178" text-anchor="middle">1</text>
  <text class="d-text" x="580" y="178" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="140" y="200" width="480" height="40" rx="8"/>
  <text class="d-text d-accent" x="180" y="226" text-anchor="middle">0</text>
  <text class="d-text d-accent" x="280" y="226" text-anchor="middle">0</text>
  <text class="d-text d-accent" x="380" y="226" text-anchor="middle">0</text>
  <text class="d-text d-accent" x="480" y="226" text-anchor="middle">0</text>
  <text class="d-text d-accent" x="580" y="226" text-anchor="middle">0</text>
</svg>

The frequencies \`a=3 g=1 m=1 n=1 r=1\` are exactly what example 2 prints for both strings. A single non-zero balance — for "aab" vs "abb", \`a\` ends at +1 and \`b\` at −1 — means "not an anagram".

The sorting method is even easier to picture: sort both strings and compare.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 170" role="img" aria-label="Sorting method. listen sorts to eilnst, silent sorts to eilnst, the two sorted strings are equal so the answer is true">
  <defs>
    <marker id="an05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="24" width="150" height="44" rx="8"/>
  <text class="d-text" x="105" y="52" text-anchor="middle">listen</text>
  <rect class="d-box" x="30" y="104" width="150" height="44" rx="8"/>
  <text class="d-text" x="105" y="132" text-anchor="middle">silent</text>
  <path class="d-edge" d="M 184 46 L 264 46" marker-end="url(#an05-arrow)"/>
  <path class="d-edge" d="M 184 126 L 264 126" marker-end="url(#an05-arrow)"/>
  <text class="d-sub" x="224" y="36" text-anchor="middle">sort</text>
  <text class="d-sub" x="224" y="116" text-anchor="middle">sort</text>
  <rect class="d-box-muted" x="272" y="24" width="150" height="44" rx="8"/>
  <text class="d-text" x="347" y="52" text-anchor="middle">eilnst</text>
  <rect class="d-box-muted" x="272" y="104" width="150" height="44" rx="8"/>
  <text class="d-text" x="347" y="132" text-anchor="middle">eilnst</text>
  <path class="d-edge-accent" d="M 426 46 L 486 80" marker-end="url(#an05-arrow)"/>
  <path class="d-edge-accent" d="M 426 126 L 486 92" marker-end="url(#an05-arrow)"/>
  <rect class="d-box-accent" x="494" y="64" width="140" height="44" rx="8"/>
  <text class="d-text d-accent" x="564" y="92" text-anchor="middle">equal: true</text>
</svg>

## 4. Three Approaches and When to Use Each

| Approach | Time | Extra space | Use it when |
| :--- | :--- | :--- | :--- |
| Sort both, compare | O(n log n) | O(n) for the sorted copies | You want the shortest correct code, or you also need a canonical "key" (as in grouping anagrams) |
| Hash-map counting | O(n) | O(k), k = distinct characters | Any character set: the general answer |
| Fixed array of 26 (or 256) counts | O(n) | O(1) — the array size does not grow with n | Characters are guaranteed to be \`a\`–\`z\` (or single bytes) |

📌 **Interview term: Counting sort idea** — when the set of possible values is small and known (26 letters), you can count into a fixed array indexed by the value instead of comparing elements. That is why the 26-slot version is O(n) time **and** O(1) space.

**One table or two?** You can build two frequency maps and compare them, but a single table — \`+1\` for each character of \`s\`, \`−1\` for each character of \`t\` — does the same job with half the memory. Because the lengths are equal (checked first), "every count is zero" is exactly "same multiset". A second common shape counts \`s\` up, then walks \`t\` and returns \`false\` the moment a count would go below zero — an earlier exit on mismatches.

**What "character" means is a real question.** The O(n) claim assumes each character is one unit of the string. Across languages that unit differs — a Unicode code point, a UTF-16 code unit, or a byte — and counting the wrong unit can call two different strings anagrams. Section 5 shows exactly what happens in this language, with a run.

## 5. The Code in JavaScript

~~~javascript
function isAnagram(s, t) {
  // True if t uses exactly the same characters as s, the same number of times.
  if (s.length !== t.length) return false;     // different lengths can never match
  const counts = new Map();                    // character -> (count in s) - (count in t)
  for (let i = 0; i < s.length; i++) {
    counts.set(s[i], (counts.get(s[i]) || 0) + 1);
    counts.set(t[i], (counts.get(t[i]) || 0) - 1);
  }
  for (const v of counts.values()) {
    if (v !== 0) return false;
  }
  return true;
}

function normalize(s) {
  // Ignore case and spaces: "Dirty room" -> "dirtyroom".
  return s.toLowerCase().split(' ').join('');
}

function show(s, t) {
  console.log('"' + s + '" vs "' + t + '": ' + isAnagram(s, t));
}

show('anagram', 'nagaram');
show('listen', 'silent');
show('rat', 'car');
show('aab', 'abb');
show('a', 'ab');
show('', '');
show('Dormitory', 'dirtyroom');
console.log('normalized: ' + isAnagram(normalize('Dormitory'), normalize('Dirty room')));
~~~

- **\`s.length !== t.length\`** — the O(1) early exit; it also makes the single \`Map\` (+1 for \`s\`, −1 for \`t\`) correct.
- **\`counts.get(s[i]) || 0\`** — \`get\` returns \`undefined\` for a new key, and \`undefined || 0\` is \`0\`. (Here a stored \`0\` also becomes \`0\`, so the idiom is safe for counts.)
- **\`for (const v of counts.values())\`** — iterates the balances and exits on the first non-zero one.
- **\`normalize\`** lowercases and removes spaces with \`split(' ').join('')\`, applied to **both** strings.

📌 **Interview term: UTF-16 code unit** — JavaScript strings are stored as a sequence of 16-bit units. Most characters are one unit, but characters outside the "Basic Multilingual Plane" (most emoji, many math symbols) are a **surrogate pair** of two units. \`s.length\`, \`s[i]\` and \`s.split('')\` all work on units; \`for...of\` and \`[...s]\` work on whole code points.

That difference changes the answer. Here two different pairs of characters, which share the same four UTF-16 units in a different combination, are compared both ways:

~~~javascript
const a = '\\u{1F600}\\u{1D400}';   // grinning face + bold capital A
const b = '\\u{1F400}\\u{1D600}';   // rat + sans-serif bold small s
const sortUnits = (s) => s.split('').sort().join('');       // UTF-16 code units
const sortPoints = (s) => [...s].sort().join('');            // code points
console.log(a.length, [...a].length);
console.log('code units say anagram: ' + (sortUnits(a) === sortUnits(b)));
console.log('code points say anagram: ' + (sortPoints(a) === sortPoints(b)));
~~~

~~~text
4 2
code units say anagram: true
code points say anagram: false
~~~

The string \`a\` has \`length\` 4 but only 2 characters, and the code-unit sort wrongly says "anagram". Iterating code points gets it right. The \`isAnagram\` above indexes with \`s[i]\`, so it counts code units: correct for ASCII inputs (all the tests), wrong for this pair. For general text, count with \`for (const ch of s)\` instead — which is what \`byCounting\` in example 2 does — and note that even code points do not handle composed vs decomposed accents; \`s.normalize('NFC')\` does.

📌 **Interview term: Unicode normalisation** — converting text to one canonical form (NFC composes accents into single code points) so that visually identical strings compare equal.

## 6. Verified: Running the Code

Both examples were saved as \`main.js\` and run with \`node main.js\` (Node v22). Example 1 — the counting check on eight inputs:

~~~text
"anagram" vs "nagaram": true
"listen" vs "silent": true
"rat" vs "car": false
"aab" vs "abb": false
"a" vs "ab": false
"" vs "": true
"Dormitory" vs "dirtyroom": false
normalized: true
~~~

\`"Dormitory"\` vs \`"dirtyroom"\` is \`false\` because \`D\` and \`d\` differ; after normalising both, it is \`true\`.

Example 2 — three methods on the same pairs, plus the frequency maps from the diagram:

~~~text
anagram/nagaram: sort=true count=true array26=true
rat/car: sort=false count=false array26=false
aab/abb: sort=false count=false array26=false
abc/abcd: sort=false count=false array26=false
/: sort=true count=true array26=true
freq(anagram): a=3 g=1 m=1 n=1 r=1
freq(nagaram): a=3 g=1 m=1 n=1 r=1
~~~

All three methods agree, and the two frequency lines are identical. \`bySorting\` relies on \`.sort()\` with no comparator, which compares strings by UTF-16 code units — exactly what you want for single characters here, and the reason it shares the surrogate-pair problem above.

## 7. Complexity

| Method | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`split('').sort().join('')\` | O(n log n) | O(n) | Sorting dominates; \`split\` builds arrays of n strings |
| \`Map\` counting | O(n) | O(k) | One pass per string, O(1) average per \`Map\` update |
| 26-slot array | O(n) | O(1) | Fixed-size array; only valid for \`a\`–\`z\` |

The 26-slot version uses \`charCodeAt(i) - 97\` (97 is the code of \`'a'\`) and is typically the fastest in practice because it avoids hashing. For more on these labels: [What is Big-O notation?](/interview-question/what-is-big-o-notation)

## Edge Cases

- **Different lengths** (\`"a"\` vs \`"ab"\`) — \`false\` without counting.
- **Both empty** (\`""\` vs \`""\`) — \`true\`: two empty bags hold the same tiles.
- **Same letters, different counts** (\`"aab"\` vs \`"abb"\`) — \`false\`; this is the case that breaks a "same set of letters" check that ignores counts.
- **Identical strings** — \`true\` under the standard definition; confirm if the interviewer wants "a different word".
- **Case and spaces** (\`"Dormitory"\` vs \`"Dirty room"\`) — \`false\` as raw strings, \`true\` after lowercasing and removing spaces. Normalise **both** strings the same way before comparing.
- **Characters outside \`a\`–\`z\`** — break the 26-slot array (out-of-range index) and need the hash-map version.

## Common Pitfalls

- **Comparing sets instead of counts** — \`new Set('aab')\` and \`new Set('abb')\` hold the same letters. Counts matter.
- **Counting code units on Unicode input** — \`s[i]\`, \`split('')\` and \`.length\` split emoji into surrogate halves, and the run above shows a false "anagram". Use \`for...of\` or \`[...s]\`.
- **Normalising only one string** — lowercase and strip spaces on both, the same way.
- **The 26-slot array on uppercase or non-letters** — \`'A'.charCodeAt(0) - 97\` is \`-32\`; \`counts[-32]++\` creates a non-index property instead of throwing, and \`every()\` never looks at it. The run below shows two different strings reported as anagrams.
- **Using an object \`{}\` as the counter** — it already "contains" inherited keys such as \`constructor\` (second line below), so \`key in counts\` checks can lie; a \`Map\` starts truly empty.

~~~javascript
function byArray26(s, t) {                     // assumes lowercase a-z only
  if (s.length !== t.length) return false;
  const counts = new Array(26).fill(0);
  for (let i = 0; i < s.length; i++) {
    counts[s.charCodeAt(i) - 97]++;            // 'A' gives -32: not an array index
    counts[t.charCodeAt(i) - 97]--;
  }
  return counts.every((c) => c === 0);         // every() only visits indices 0..25
}

console.log(byArray26('Ab', 'Bb'));            // different strings
console.log('constructor' in {});              // a plain object already has inherited keys
~~~

~~~text
true
true
~~~

- **Assuming \`.sort()\` without a comparator sorts by "alphabet"** — it sorts by UTF-16 code units: all uppercase letters come before lowercase ones.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Two strings are anagrams when every character appears the same number of times; I check the lengths, then count characters in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> and make sure every count balances to zero.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The two approaches:</strong> <span style="color:#f0e2c8;">Sorting both strings and comparing is O(n log n); counting is O(n) time and O(k) space for k distinct characters.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The space optimisation:</strong> <span style="color:#f0e2c8;">For lowercase <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>–<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">z</code>, a 26-slot array indexed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">charCodeAt(i) - 97</code> gives O(1) extra space and avoids hashing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The rules question:</strong> <span style="color:#f0e2c8;">I would ask about case, spaces and character set first, and normalise <strong style="color:#ffca28;">both</strong> strings the same way, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toLowerCase()</code> and removing spaces.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript detail:</strong> <span style="color:#f0e2c8;">String indices and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.length</code> are UTF-16 code units, so for real Unicode I iterate with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code> (code points) and apply <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">normalize('NFC')</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just sort both strings?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is correct for ASCII and short to write — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.split('').sort().join('')</code> — but O(n log n) and it splits surrogate pairs, so it can call two different emoji strings anagrams, as the run above showed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> instead of a plain object for counts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An object inherits keys from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.prototype</code>, and its keys are always strings. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> starts empty, keeps any key type, and has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code>. For letters both work, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> is the safe default.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find all anagrams of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">p</code> inside a longer string <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">s</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A sliding window of length <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p.length</code>: keep a 26-count array for the window, add the entering character and remove the leaving one each step, and compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p</code>'s counts. O(s.length) overall.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with the 26-slot array if the input has an uppercase letter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'A'.charCodeAt(0) - 97</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-32</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">counts[-32]++</code> silently creates a non-index property instead of throwing; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">every()</code> skips it, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">byArray26('Ab', 'Bb')</code> returned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code> in the run above. Validate the input or use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it with one pass over both strings?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: after the length check, loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> from 0 to n−1 doing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+1</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[i]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">−1</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">t[i]</code> in the same table, then check every count is zero.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Anagram** | Same characters, same counts, any order |
| **Frequency map** | Table from character to how many times it appears |
| **Early exit on length** | Different lengths mean \`false\` immediately |
| **Counting sort idea** | Count into a fixed array indexed by value when the value range is small |
| **UTF-16 code unit** | The 16-bit unit JavaScript strings are made of; emoji take two |
| **Unicode normalisation** | Converting text to one canonical form so equal-looking strings compare equal |

---
**Conclusion:** Two strings are anagrams when their character counts match. In JavaScript, check the lengths, then count with a \`Map\` (any characters) or a 26-slot array (\`a\`–\`z\` only) for an O(n) answer; sorting both strings is the O(n log n) shortcut. The JavaScript-specific catch is what a "character" is: indexing and \`split('')\` see UTF-16 code units, which can wrongly call two different emoji strings anagrams, so iterate with \`for...of\` for real text and normalise with \`normalize('NFC')\`. The same frequency-map idea powers [grouping anagrams](/interview-question/how-do-you-group-anagrams-together) and [finding the top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements).`,
        examples: [
          {
            label: "Counting anagram check on eight inputs, including case and spaces",
            code: `function isAnagram(s, t) {
  // True if t uses exactly the same characters as s, the same number of times.
  if (s.length !== t.length) return false;     // different lengths can never match
  const counts = new Map();                    // character -> (count in s) - (count in t)
  for (let i = 0; i < s.length; i++) {
    counts.set(s[i], (counts.get(s[i]) || 0) + 1);
    counts.set(t[i], (counts.get(t[i]) || 0) - 1);
  }
  for (const v of counts.values()) {
    if (v !== 0) return false;
  }
  return true;
}

function normalize(s) {
  // Ignore case and spaces: "Dirty room" -> "dirtyroom".
  return s.toLowerCase().split(' ').join('');
}

function show(s, t) {
  console.log('"' + s + '" vs "' + t + '": ' + isAnagram(s, t));
}

show('anagram', 'nagaram');
show('listen', 'silent');
show('rat', 'car');
show('aab', 'abb');
show('a', 'ab');
show('', '');
show('Dormitory', 'dirtyroom');
console.log('normalized: ' + isAnagram(normalize('Dormitory'), normalize('Dirty room')));`,
          },
          {
            label: "Sorting vs hash-map counting vs 26-slot array: all three agree",
            code: `// Three ways to check an anagram, run on the same pairs. All must agree.

function bySorting(s, t) {
  return s.split('').sort().join('') === t.split('').sort().join('');  // O(n log n)
}

function byCounting(s, t) {
  if (s.length !== t.length) return false;
  const counts = new Map();
  for (const ch of s) counts.set(ch, (counts.get(ch) || 0) + 1);
  for (const ch of t) {
    if (!counts.get(ch)) return false;           // t has a character s ran out of
    counts.set(ch, counts.get(ch) - 1);
  }
  return true;                                   // O(n)
}

function byArray26(s, t) {                       // only for lowercase a-z
  if (s.length !== t.length) return false;
  const counts = new Array(26).fill(0);
  for (let i = 0; i < s.length; i++) {
    counts[s.charCodeAt(i) - 97]++;              // 97 is 'a'
    counts[t.charCodeAt(i) - 97]--;
  }
  return counts.every((c) => c === 0);           // O(n), O(1) space
}

function freq(s) {
  const counts = new Map();
  for (const ch of s) counts.set(ch, (counts.get(ch) || 0) + 1);
  return [...counts.keys()].sort().map((ch) => ch + '=' + counts.get(ch)).join(' ');
}

const pairs = [['anagram', 'nagaram'], ['rat', 'car'], ['aab', 'abb'], ['abc', 'abcd'], ['', '']];
for (const [s, t] of pairs) {
  console.log(s + '/' + t + ': sort=' + bySorting(s, t) + ' count=' + byCounting(s, t) +
    ' array26=' + byArray26(s, t));
}
console.log('freq(anagram): ' + freq('anagram'));
console.log('freq(nagaram): ' + freq('nagaram'));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Implement \`boolean isAnagram(String s, String t)\` in Java: return true when \`t\` is a rearrangement of \`s\`, using every character the same number of times. Walk me through the complexity, and tell me what you would change for full Unicode input."

**What a strong answer should cover:**
- The count-based definition and the O(1) early return when \`s.length() != t.length()\`.
- Sort-and-compare (\`toCharArray()\`, \`Arrays.sort\`, \`Arrays.equals\`) in O(n log n) versus counting in O(n).
- The \`int[26]\` counting array (\`c - 'a'\`) for O(1) extra space when input is \`a\`–\`z\`, and a \`HashMap<Character, Integer>\` (\`merge\`) for general input.
- Normalising both strings (\`toLowerCase()\`, removing spaces) when case and spaces do not count.
- Java specifics: \`char\` is a UTF-16 code unit, so emoji are two \`char\`s — use \`codePoints()\` for real Unicode; compare \`String\`s with \`equals\`, never \`==\`; \`HashMap<Character, Integer>\` boxes every key and count.

**Clarifying questions expected:**
- Case-sensitive? Do spaces count?
- Only lowercase \`a\`–\`z\`, or any Unicode?

**Code / implementation expected:** Yes — an \`isAnagram\` method in Java, preferably the O(n) \`int[26]\` or \`HashMap\` version, run on several cases.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Java strings, arrays and loops; nothing else assumed.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by compiling and running the code (\`javac\` and \`java\`, JDK 21); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

Two friends are playing a word game. Each has a little bag of letter tiles, and you want to know: **do the two bags hold exactly the same tiles?** Not the same word — the same tiles. "listen" and "silent" would pass; "rat" and "car" would not; "aab" and "abb" would not either, even though both use only \`a\` and \`b\`.

There are two natural ways to check.

1. **Line them up.** Pour each bag out and arrange the tiles alphabetically. "listen" becomes \`e i l n s t\`, and so does "silent". If the two rows match tile for tile, the bags are the same. Sorting takes a bit of effort, but it is simple.
2. **Keep a tally.** Take a sheet of paper with one row per letter. For every tile in the first bag, add a mark to its row; for every tile in the second bag, rub one mark out. If every row ends at zero, the bags were identical. You touch each tile exactly once.

That is the whole problem. The second way — counting — is the one interviewers want to hear, because it is linear time and because the same "frequency table" idea solves a whole family of harder questions: [grouping anagrams](/interview-question/how-do-you-group-anagrams-together), finding anagrams inside a longer string with a [sliding window](/interview-question/what-is-the-sliding-window-technique), and the [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is it case-sensitive? Is "Listen" an anagram of "silent"? | Decides whether you lowercase first. The plain problem compares characters exactly. |
| Do spaces and punctuation count? ("Dirty room" vs "Dormitory") | Phrase anagrams ignore spaces; you normalise both strings before counting. |
| What characters can appear — only \`a\`–\`z\`, ASCII, or any Unicode? | Only \`a\`–\`z\` lets you use a fixed 26-slot array (O(1) space). Unicode needs a hash map and raises the "what is a character?" question. |
| Is a string an anagram of itself? Of the empty string? | Usually yes, and \`""\` vs \`""\` is \`true\`. Worth confirming for the return value. |
| How long can the strings be, and how many checks will run? | One check: any O(n) or O(n log n) method is fine. Millions of checks: precomputed counts or keys (see grouping anagrams). |

## 3. The Core Idea

Two strings are anagrams exactly when every character appears **the same number of times** in both. Order does not matter, only counts.

📌 **Interview term: Anagram** — a rearrangement of the characters of one string to form another, using every character exactly as many times as it occurs. "listen" → "silent".

📌 **Interview term: Frequency map (frequency table / histogram)** — a table from each distinct character to how many times it occurs. Two strings are anagrams if and only if their frequency maps are equal.

📌 **Interview term: Early exit on length** — if the lengths differ, the answer is \`false\` immediately, without looking at a single character. It is O(1) and it is also what makes the "add for one string, subtract for the other" trick safe.

The counting method, shown on "anagram" vs "nagaram": add 1 for each letter of the first string, subtract 1 for each letter of the second. Every row ends at zero, so they are anagrams.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="Counting table for anagram versus nagaram. Letters a n g r m. Plus counts from the first string are 3 1 1 1 1, minus counts from the second are 3 1 1 1 1, and every balance is 0">
  <text class="d-text" x="330" y="22" text-anchor="middle">Count up for s, count down for t</text>
  <text class="d-sub" x="70" y="78" text-anchor="middle">letter</text>
  <text class="d-sub" x="70" y="128" text-anchor="middle">+ from s</text>
  <text class="d-sub" x="70" y="178" text-anchor="middle">- from t</text>
  <text class="d-sub" x="70" y="226" text-anchor="middle">balance</text>
  <rect class="d-box-muted" x="140" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="180" y="78" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="240" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="280" y="78" text-anchor="middle">g</text>
  <rect class="d-box-muted" x="340" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="380" y="78" text-anchor="middle">m</text>
  <rect class="d-box-muted" x="440" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="480" y="78" text-anchor="middle">n</text>
  <rect class="d-box-muted" x="540" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="580" y="78" text-anchor="middle">r</text>
  <text class="d-text" x="180" y="128" text-anchor="middle">3</text>
  <text class="d-text" x="280" y="128" text-anchor="middle">1</text>
  <text class="d-text" x="380" y="128" text-anchor="middle">1</text>
  <text class="d-text" x="480" y="128" text-anchor="middle">1</text>
  <text class="d-text" x="580" y="128" text-anchor="middle">1</text>
  <text class="d-text" x="180" y="178" text-anchor="middle">3</text>
  <text class="d-text" x="280" y="178" text-anchor="middle">1</text>
  <text class="d-text" x="380" y="178" text-anchor="middle">1</text>
  <text class="d-text" x="480" y="178" text-anchor="middle">1</text>
  <text class="d-text" x="580" y="178" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="140" y="200" width="480" height="40" rx="8"/>
  <text class="d-text d-accent" x="180" y="226" text-anchor="middle">0</text>
  <text class="d-text d-accent" x="280" y="226" text-anchor="middle">0</text>
  <text class="d-text d-accent" x="380" y="226" text-anchor="middle">0</text>
  <text class="d-text d-accent" x="480" y="226" text-anchor="middle">0</text>
  <text class="d-text d-accent" x="580" y="226" text-anchor="middle">0</text>
</svg>

The frequencies \`a=3 g=1 m=1 n=1 r=1\` are exactly what example 2 prints for both strings. A single non-zero balance — for "aab" vs "abb", \`a\` ends at +1 and \`b\` at −1 — means "not an anagram".

The sorting method is even easier to picture: sort both strings and compare.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 170" role="img" aria-label="Sorting method. listen sorts to eilnst, silent sorts to eilnst, the two sorted strings are equal so the answer is true">
  <defs>
    <marker id="an05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="24" width="150" height="44" rx="8"/>
  <text class="d-text" x="105" y="52" text-anchor="middle">listen</text>
  <rect class="d-box" x="30" y="104" width="150" height="44" rx="8"/>
  <text class="d-text" x="105" y="132" text-anchor="middle">silent</text>
  <path class="d-edge" d="M 184 46 L 264 46" marker-end="url(#an05-arrow)"/>
  <path class="d-edge" d="M 184 126 L 264 126" marker-end="url(#an05-arrow)"/>
  <text class="d-sub" x="224" y="36" text-anchor="middle">sort</text>
  <text class="d-sub" x="224" y="116" text-anchor="middle">sort</text>
  <rect class="d-box-muted" x="272" y="24" width="150" height="44" rx="8"/>
  <text class="d-text" x="347" y="52" text-anchor="middle">eilnst</text>
  <rect class="d-box-muted" x="272" y="104" width="150" height="44" rx="8"/>
  <text class="d-text" x="347" y="132" text-anchor="middle">eilnst</text>
  <path class="d-edge-accent" d="M 426 46 L 486 80" marker-end="url(#an05-arrow)"/>
  <path class="d-edge-accent" d="M 426 126 L 486 92" marker-end="url(#an05-arrow)"/>
  <rect class="d-box-accent" x="494" y="64" width="140" height="44" rx="8"/>
  <text class="d-text d-accent" x="564" y="92" text-anchor="middle">equal: true</text>
</svg>

## 4. Three Approaches and When to Use Each

| Approach | Time | Extra space | Use it when |
| :--- | :--- | :--- | :--- |
| Sort both, compare | O(n log n) | O(n) for the sorted copies | You want the shortest correct code, or you also need a canonical "key" (as in grouping anagrams) |
| Hash-map counting | O(n) | O(k), k = distinct characters | Any character set: the general answer |
| Fixed array of 26 (or 256) counts | O(n) | O(1) — the array size does not grow with n | Characters are guaranteed to be \`a\`–\`z\` (or single bytes) |

📌 **Interview term: Counting sort idea** — when the set of possible values is small and known (26 letters), you can count into a fixed array indexed by the value instead of comparing elements. That is why the 26-slot version is O(n) time **and** O(1) space.

**One table or two?** You can build two frequency maps and compare them, but a single table — \`+1\` for each character of \`s\`, \`−1\` for each character of \`t\` — does the same job with half the memory. Because the lengths are equal (checked first), "every count is zero" is exactly "same multiset". A second common shape counts \`s\` up, then walks \`t\` and returns \`false\` the moment a count would go below zero — an earlier exit on mismatches.

**What "character" means is a real question.** The O(n) claim assumes each character is one unit of the string. Across languages that unit differs — a Unicode code point, a UTF-16 code unit, or a byte — and counting the wrong unit can call two different strings anagrams. Section 5 shows exactly what happens in this language, with a run.

## 5. The Code in Java

The general version, which works for any \`char\`:

~~~java
import java.util.HashMap;
import java.util.Map;

public class Main {
    // True if t uses exactly the same characters as s, the same number of times.
    static boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;         // different lengths can never match
        Map<Character, Integer> counts = new HashMap<>();   // char -> (count in s) - (count in t)
        for (int i = 0; i < s.length(); i++) {
            counts.merge(s.charAt(i), 1, Integer::sum);
            counts.merge(t.charAt(i), -1, Integer::sum);
        }
        for (int v : counts.values()) {
            if (v != 0) return false;
        }
        return true;
    }

    // Ignore case and spaces: "Dirty room" -> "dirtyroom".
    static String normalize(String s) {
        return s.toLowerCase().replace(" ", "");
    }

    static void show(String s, String t) {
        System.out.println("\\"" + s + "\\" vs \\"" + t + "\\": " + isAnagram(s, t));
    }

    public static void main(String[] args) {
        show("anagram", "nagaram");
        show("listen", "silent");
        show("rat", "car");
        show("aab", "abb");
        show("a", "ab");
        show("", "");
        show("Dormitory", "dirtyroom");
        System.out.println("normalized: " + isAnagram(normalize("Dormitory"), normalize("Dirty room")));
    }
}
~~~

- **\`s.length() != t.length()\`** — the O(1) early exit, which also makes the single map (+1 for \`s\`, −1 for \`t\`) correct.
- **\`counts.merge(key, 1, Integer::sum)\`** — "if the key is missing, store 1; otherwise store old + 1". It replaces the clumsy \`put(c, getOrDefault(c, 0) + 1)\`.
- **\`for (int v : counts.values())\`** — unboxes each \`Integer\` balance and returns on the first non-zero one.
- **\`normalize\`** uses \`toLowerCase()\` and \`replace(" ", "")\` and is applied to **both** strings.

📌 **Interview term: \`int[26]\` counting array** — \`new int[26]\` starts all zeros, and \`c - 'a'\` turns \`'a'..'z'\` into \`0..25\` (Java promotes the \`char\` subtraction to \`int\`). It avoids hashing and boxing entirely, so it is the fastest version when input is guaranteed lowercase. Outside that range it fails loudly:

~~~java
public class Main {
    static boolean byArray26(String s, String t) {      // assumes lowercase a-z only
        if (s.length() != t.length()) return false;
        int[] counts = new int[26];
        for (int i = 0; i < s.length(); i++) {
            counts[s.charAt(i) - 'a']++;                 // 'A' - 'a' is -32
            counts[t.charAt(i) - 'a']--;
        }
        for (int c : counts) if (c != 0) return false;
        return true;
    }

    public static void main(String[] args) {
        try {
            byArray26("Ab", "Bb");
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("ArrayIndexOutOfBoundsException: " + e.getMessage());
        }
    }
}
~~~

~~~text
ArrayIndexOutOfBoundsException: Index -32 out of bounds for length 26
~~~

Unlike some languages, Java checks every array index, so a bad character crashes instead of silently corrupting the count — but it still crashes, so use the 26-slot array only when the input is guaranteed.

### What a "character" is in Java

📌 **Interview term: UTF-16 code unit** — a Java \`char\` is a 16-bit UTF-16 unit, not a full Unicode character. Characters outside the Basic Multilingual Plane (most emoji, many math symbols) are a **surrogate pair** of two \`char\`s, and \`length()\` counts \`char\`s. Counting or sorting \`char\`s can therefore call two different strings anagrams:

~~~java
import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        String a = new String(Character.toChars(0x1F600)) + new String(Character.toChars(0x1D400));
        String b = new String(Character.toChars(0x1F400)) + new String(Character.toChars(0x1D600));
        char[] ca = a.toCharArray(), cb = b.toCharArray();          // UTF-16 code units
        Arrays.sort(ca);
        Arrays.sort(cb);
        int[] pa = a.codePoints().sorted().toArray();                // real code points
        int[] pb = b.codePoints().sorted().toArray();
        System.out.println(a.length() + " " + a.codePointCount(0, a.length()));
        System.out.println("chars say anagram: " + Arrays.equals(ca, cb));
        System.out.println("code points say anagram: " + Arrays.equals(pa, pb));
    }
}
~~~

~~~text
4 2
chars say anagram: true
code points say anagram: false
~~~

The string has \`length()\` 4 but 2 code points. Sorting \`char\`s said "anagram"; sorting \`codePoints()\` (an \`IntStream\` of real code points) correctly said no. For general text, count code points (\`s.codePoints().forEach(...)\` into a \`HashMap<Integer, Integer>\`), and apply \`java.text.Normalizer.normalize(s, Normalizer.Form.NFC)\` so composed and decomposed accents match.

📌 **Interview term: Unicode normalisation** — converting text to one canonical form (NFC composes accents into single code points) so visually identical strings compare equal.

One more Java trap that shows up in anagram code that sorts and rebuilds strings — \`==\` on \`String\`s:

~~~java
public class Main {
    public static void main(String[] args) {
        String s = "listen";
        String t = new StringBuilder("netsil").reverse().toString();   // "listen", built at run time
        System.out.println(s.equals(t));   // compares characters
        System.out.println(s == t);        // compares object identity
    }
}
~~~

~~~text
true
false
~~~

\`==\` compares whether both variables point to the same object; two strings with the same characters built at run time are different objects. Always compare with \`equals\` (or \`Arrays.equals\` for \`char[]\`).

## 6. Verified: Running the Code

Both examples were saved as \`Main.java\` and run with \`javac Main.java && java Main\` (JDK 21). Example 1 — the counting check on eight inputs:

~~~text
"anagram" vs "nagaram": true
"listen" vs "silent": true
"rat" vs "car": false
"aab" vs "abb": false
"a" vs "ab": false
"" vs "": true
"Dormitory" vs "dirtyroom": false
normalized: true
~~~

\`"Dormitory"\` vs \`"dirtyroom"\` is \`false\` because \`'D'\` and \`'d'\` differ; after normalising both, it is \`true\`.

Example 2 — three methods on the same pairs, plus the frequency maps from the diagram (built in a \`TreeMap\`, which keeps keys sorted, so the output is deterministic):

~~~text
anagram/nagaram: sort=true count=true array26=true
rat/car: sort=false count=false array26=false
aab/abb: sort=false count=false array26=false
abc/abcd: sort=false count=false array26=false
/: sort=true count=true array26=true
freq(anagram): a=3 g=1 m=1 n=1 r=1
freq(nagaram): a=3 g=1 m=1 n=1 r=1
~~~

All three methods agree, and the two frequency lines are identical.

## 7. Complexity

| Method | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`toCharArray\` + \`Arrays.sort\` + \`Arrays.equals\` | O(n log n) | O(n) | Sorting dominates; two \`char[]\` copies |
| \`HashMap<Character, Integer>\` counting | O(n) average | O(k) | O(1) average per \`merge\`; k distinct characters, each a boxed entry |
| \`int[26]\` counting | O(n) | O(1) | Fixed array, no hashing or boxing; only for \`a\`–\`z\` |

All three are linear or near-linear; in practice the \`int[26]\` version is much faster than the \`HashMap\` because it allocates nothing per character. For more on these labels: [What is Big-O notation?](/interview-question/what-is-big-o-notation)

## Edge Cases

- **Different lengths** (\`"a"\` vs \`"ab"\`) — \`false\` without counting.
- **Both empty** (\`""\` vs \`""\`) — \`true\`: two empty bags hold the same tiles.
- **Same letters, different counts** (\`"aab"\` vs \`"abb"\`) — \`false\`; this is the case that breaks a "same set of letters" check that ignores counts.
- **Identical strings** — \`true\` under the standard definition; confirm if the interviewer wants "a different word".
- **Case and spaces** (\`"Dormitory"\` vs \`"Dirty room"\`) — \`false\` as raw strings, \`true\` after lowercasing and removing spaces. Normalise **both** strings the same way before comparing.
- **Characters outside \`a\`–\`z\`** — break the 26-slot array (out-of-range index) and need the hash-map version.

## Common Pitfalls

- **Comparing sets instead of counts** — a \`HashSet\` of \`"aab"\` equals that of \`"abb"\`. Counts matter.
- **\`s == t\` or \`sortedS == sortedT\` on \`String\`s** — compares references; use \`equals\` (and \`Arrays.equals\` for \`char[]\`; \`a.equals(b)\` on arrays is also reference equality).
- **The \`int[26]\` array on unexpected input** — throws \`ArrayIndexOutOfBoundsException\` for \`'A'\` (index −32), as shown above.
- **Counting \`char\`s on Unicode input** — surrogate pairs are split; use \`codePoints()\`.
- **Normalising only one string** — lowercase and strip spaces on both. (\`toLowerCase()\` with no argument uses the default locale; \`toLowerCase(Locale.ROOT)\` makes the result independent of the machine settings.)
- **\`counts.get(c) - 1\` on a missing key** — \`get\` returns \`null\` and unboxing it throws \`NullPointerException\`; use \`getOrDefault\` or \`merge\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Two strings are anagrams when every character appears the same number of times; I check the lengths, then count with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[26]</code> (+1 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code>, −1 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">t</code>) and verify every slot is zero.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The two approaches:</strong> <span style="color:#f0e2c8;">Sorting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toCharArray()</code> copies and comparing with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.equals</code> is O(n log n); counting is O(n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Space:</strong> <span style="color:#f0e2c8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[26]</code> version is O(1) extra space and does no boxing; for arbitrary characters I switch to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Character, Integer&gt;</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">merge</code>, O(k) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The rules question:</strong> <span style="color:#f0e2c8;">I would ask about case, spaces and character set, and normalise <strong style="color:#ffca28;">both</strong> strings identically, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toLowerCase()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">replace(" ", "")</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Java detail:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char</code> is a UTF-16 unit, so for real Unicode I count <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">codePoints()</code>; and I compare strings with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap&lt;Character, Integer&gt;</code> everywhere?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works for any input, but each key and count is a boxed object and every update hashes. For guaranteed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>–<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">z</code> input, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[26]</code> is O(1) space and much cheaper per character.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int[26]</code> version gets an uppercase letter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'A' - 'a'</code> is −32, and Java bounds-checks arrays, so it throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayIndexOutOfBoundsException: Index -32 out of bounds for length 26</code> — the exact message from the run above.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support emoji correctly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Iterate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.codePoints()</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char</code>s, counting into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Integer, Integer&gt;</code>; the run above showed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char</code> sorting wrongly calling two emoji strings anagrams while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">codePoints()</code> did not.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you compare two sorted <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">char[]</code>s?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.equals(a, b)</code>. Both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a == b</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.equals(b)</code> compare references for arrays, so they would be <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> even for equal contents.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find all anagrams of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">p</code> in a longer string <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">s</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Slide a window of length <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p.length()</code> across <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code>, maintaining an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[26]</code> for the window (add the entering char, remove the leaving one) and compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p</code>'s counts using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.equals</code>. O(26 · n), which is O(n).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Anagram** | Same characters, same counts, any order |
| **Frequency map** | Table from character to how many times it appears |
| **Early exit on length** | Different lengths mean \`false\` immediately |
| **Counting sort idea** | Count into a fixed array indexed by value when the value range is small |
| **\`int[26]\` counting array** | Fixed counts indexed by \`c - 'a'\`; O(1) space, no boxing |
| **UTF-16 code unit** | What a Java \`char\` is; emoji take two |
| **Unicode normalisation** | Converting text to one canonical form so equal-looking strings compare equal |

---
**Conclusion:** Two strings are anagrams when their character counts match. In Java, check the lengths, then count into an \`int[26]\` for lowercase input or a \`HashMap<Character, Integer>\` with \`merge\` for general input — O(n) — or sort both \`char[]\`s and compare with \`Arrays.equals\` in O(n log n). The Java-specific catches are that \`char\` is a UTF-16 unit (use \`codePoints()\` for real Unicode), that \`String\` and array comparison need \`equals\`/\`Arrays.equals\` rather than \`==\`, and that the 26-slot array throws on anything outside \`a\`–\`z\`. The same frequency-map idea powers [grouping anagrams](/interview-question/how-do-you-group-anagrams-together) and [finding the top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements).`,
        examples: [
          {
            label: "Counting anagram check on eight inputs, including case and spaces",
            code: `import java.util.HashMap;
import java.util.Map;

public class Main {
    // True if t uses exactly the same characters as s, the same number of times.
    static boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;         // different lengths can never match
        Map<Character, Integer> counts = new HashMap<>();   // char -> (count in s) - (count in t)
        for (int i = 0; i < s.length(); i++) {
            counts.merge(s.charAt(i), 1, Integer::sum);
            counts.merge(t.charAt(i), -1, Integer::sum);
        }
        for (int v : counts.values()) {
            if (v != 0) return false;
        }
        return true;
    }

    // Ignore case and spaces: "Dirty room" -> "dirtyroom".
    static String normalize(String s) {
        return s.toLowerCase().replace(" ", "");
    }

    static void show(String s, String t) {
        System.out.println("\\"" + s + "\\" vs \\"" + t + "\\": " + isAnagram(s, t));
    }

    public static void main(String[] args) {
        show("anagram", "nagaram");
        show("listen", "silent");
        show("rat", "car");
        show("aab", "abb");
        show("a", "ab");
        show("", "");
        show("Dormitory", "dirtyroom");
        System.out.println("normalized: " + isAnagram(normalize("Dormitory"), normalize("Dirty room")));
    }
}`,
          },
          {
            label: "Sorting vs hash-map counting vs 26-slot array: all three agree",
            code: `import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;

public class Main {
    // Three ways to check an anagram, run on the same pairs. All must agree.

    static boolean bySorting(String s, String t) {           // O(n log n)
        char[] a = s.toCharArray(), b = t.toCharArray();
        Arrays.sort(a);
        Arrays.sort(b);
        return Arrays.equals(a, b);
    }

    static boolean byCounting(String s, String t) {          // O(n)
        if (s.length() != t.length()) return false;
        Map<Character, Integer> counts = new HashMap<>();
        for (char ch : s.toCharArray()) counts.merge(ch, 1, Integer::sum);
        for (char ch : t.toCharArray()) {
            int left = counts.getOrDefault(ch, 0);
            if (left == 0) return false;                     // t has a character s ran out of
            counts.put(ch, left - 1);
        }
        return true;
    }

    static boolean byArray26(String s, String t) {           // only for lowercase a-z
        if (s.length() != t.length()) return false;
        int[] counts = new int[26];
        for (int i = 0; i < s.length(); i++) {
            counts[s.charAt(i) - 'a']++;
            counts[t.charAt(i) - 'a']--;
        }
        for (int c : counts) if (c != 0) return false;
        return true;                                         // O(n), O(1) space
    }

    static String freq(String s) {
        Map<Character, Integer> counts = new TreeMap<>();    // TreeMap keeps keys sorted
        for (char ch : s.toCharArray()) counts.merge(ch, 1, Integer::sum);
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<Character, Integer> e : counts.entrySet()) {
            if (sb.length() > 0) sb.append(' ');
            sb.append(e.getKey()).append('=').append(e.getValue());
        }
        return sb.toString();
    }

    public static void main(String[] args) {
        String[][] pairs = {{"anagram", "nagaram"}, {"rat", "car"}, {"aab", "abb"}, {"abc", "abcd"}, {"", ""}};
        for (String[] p : pairs) {
            String s = p[0], t = p[1];
            System.out.println(s + "/" + t + ": sort=" + bySorting(s, t) + " count=" + byCounting(s, t)
                + " array26=" + byArray26(s, t));
        }
        System.out.println("freq(anagram): " + freq("anagram"));
        System.out.println("freq(nagaram): " + freq("nagaram"));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Write \`bool isAnagram(const std::string& s, const std::string& t)\` in C++: return true when \`t\` is a rearrangement of \`s\`, using every character the same number of times. Explain the complexity, and what changes if the strings contain UTF-8 text."

**What a strong answer should cover:**
- The count-based definition and the O(1) early return when the sizes differ.
- Sort-and-compare (\`std::sort\` on copies, then \`==\`) in O(n log n) versus counting in O(n).
- A fixed \`std::array<int, 26>\` (or 256 for all bytes) for O(1) extra space, versus \`std::unordered_map<char, int>\` for arbitrary keys.
- Normalising both strings (\`std::tolower\`, removing spaces) when case and spaces do not count.
- C++ specifics: \`char\` may be signed, so cast to \`unsigned char\` before indexing or calling \`tolower\`; \`operator[]\` on an \`unordered_map\` inserts missing keys; \`std::string\` holds bytes, so UTF-8 characters are several \`char\`s and byte counting can give false positives.

**Clarifying questions expected:**
- Case-sensitive? Do spaces count?
- ASCII only, or UTF-8 text?

**Code / implementation expected:** Yes — an \`isAnagram\` function in C++17 using a fixed counting array, run on several cases.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know basic C++ (\`std::string\`, loops, functions); nothing else assumed.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by compiling and running the code with \`g++ -std=c++17\` (GCC 13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

Two friends are playing a word game. Each has a little bag of letter tiles, and you want to know: **do the two bags hold exactly the same tiles?** Not the same word — the same tiles. "listen" and "silent" would pass; "rat" and "car" would not; "aab" and "abb" would not either, even though both use only \`a\` and \`b\`.

There are two natural ways to check.

1. **Line them up.** Pour each bag out and arrange the tiles alphabetically. "listen" becomes \`e i l n s t\`, and so does "silent". If the two rows match tile for tile, the bags are the same. Sorting takes a bit of effort, but it is simple.
2. **Keep a tally.** Take a sheet of paper with one row per letter. For every tile in the first bag, add a mark to its row; for every tile in the second bag, rub one mark out. If every row ends at zero, the bags were identical. You touch each tile exactly once.

That is the whole problem. The second way — counting — is the one interviewers want to hear, because it is linear time and because the same "frequency table" idea solves a whole family of harder questions: [grouping anagrams](/interview-question/how-do-you-group-anagrams-together), finding anagrams inside a longer string with a [sliding window](/interview-question/what-is-the-sliding-window-technique), and the [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is it case-sensitive? Is "Listen" an anagram of "silent"? | Decides whether you lowercase first. The plain problem compares characters exactly. |
| Do spaces and punctuation count? ("Dirty room" vs "Dormitory") | Phrase anagrams ignore spaces; you normalise both strings before counting. |
| What characters can appear — only \`a\`–\`z\`, ASCII, or any Unicode? | Only \`a\`–\`z\` lets you use a fixed 26-slot array (O(1) space). Unicode needs a hash map and raises the "what is a character?" question. |
| Is a string an anagram of itself? Of the empty string? | Usually yes, and \`""\` vs \`""\` is \`true\`. Worth confirming for the return value. |
| How long can the strings be, and how many checks will run? | One check: any O(n) or O(n log n) method is fine. Millions of checks: precomputed counts or keys (see grouping anagrams). |

## 3. The Core Idea

Two strings are anagrams exactly when every character appears **the same number of times** in both. Order does not matter, only counts.

📌 **Interview term: Anagram** — a rearrangement of the characters of one string to form another, using every character exactly as many times as it occurs. "listen" → "silent".

📌 **Interview term: Frequency map (frequency table / histogram)** — a table from each distinct character to how many times it occurs. Two strings are anagrams if and only if their frequency maps are equal.

📌 **Interview term: Early exit on length** — if the lengths differ, the answer is \`false\` immediately, without looking at a single character. It is O(1) and it is also what makes the "add for one string, subtract for the other" trick safe.

The counting method, shown on "anagram" vs "nagaram": add 1 for each letter of the first string, subtract 1 for each letter of the second. Every row ends at zero, so they are anagrams.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="Counting table for anagram versus nagaram. Letters a n g r m. Plus counts from the first string are 3 1 1 1 1, minus counts from the second are 3 1 1 1 1, and every balance is 0">
  <text class="d-text" x="330" y="22" text-anchor="middle">Count up for s, count down for t</text>
  <text class="d-sub" x="70" y="78" text-anchor="middle">letter</text>
  <text class="d-sub" x="70" y="128" text-anchor="middle">+ from s</text>
  <text class="d-sub" x="70" y="178" text-anchor="middle">- from t</text>
  <text class="d-sub" x="70" y="226" text-anchor="middle">balance</text>
  <rect class="d-box-muted" x="140" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="180" y="78" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="240" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="280" y="78" text-anchor="middle">g</text>
  <rect class="d-box-muted" x="340" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="380" y="78" text-anchor="middle">m</text>
  <rect class="d-box-muted" x="440" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="480" y="78" text-anchor="middle">n</text>
  <rect class="d-box-muted" x="540" y="52" width="80" height="40" rx="8"/>
  <text class="d-text" x="580" y="78" text-anchor="middle">r</text>
  <text class="d-text" x="180" y="128" text-anchor="middle">3</text>
  <text class="d-text" x="280" y="128" text-anchor="middle">1</text>
  <text class="d-text" x="380" y="128" text-anchor="middle">1</text>
  <text class="d-text" x="480" y="128" text-anchor="middle">1</text>
  <text class="d-text" x="580" y="128" text-anchor="middle">1</text>
  <text class="d-text" x="180" y="178" text-anchor="middle">3</text>
  <text class="d-text" x="280" y="178" text-anchor="middle">1</text>
  <text class="d-text" x="380" y="178" text-anchor="middle">1</text>
  <text class="d-text" x="480" y="178" text-anchor="middle">1</text>
  <text class="d-text" x="580" y="178" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="140" y="200" width="480" height="40" rx="8"/>
  <text class="d-text d-accent" x="180" y="226" text-anchor="middle">0</text>
  <text class="d-text d-accent" x="280" y="226" text-anchor="middle">0</text>
  <text class="d-text d-accent" x="380" y="226" text-anchor="middle">0</text>
  <text class="d-text d-accent" x="480" y="226" text-anchor="middle">0</text>
  <text class="d-text d-accent" x="580" y="226" text-anchor="middle">0</text>
</svg>

The frequencies \`a=3 g=1 m=1 n=1 r=1\` are exactly what example 2 prints for both strings. A single non-zero balance — for "aab" vs "abb", \`a\` ends at +1 and \`b\` at −1 — means "not an anagram".

The sorting method is even easier to picture: sort both strings and compare.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 170" role="img" aria-label="Sorting method. listen sorts to eilnst, silent sorts to eilnst, the two sorted strings are equal so the answer is true">
  <defs>
    <marker id="an05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="24" width="150" height="44" rx="8"/>
  <text class="d-text" x="105" y="52" text-anchor="middle">listen</text>
  <rect class="d-box" x="30" y="104" width="150" height="44" rx="8"/>
  <text class="d-text" x="105" y="132" text-anchor="middle">silent</text>
  <path class="d-edge" d="M 184 46 L 264 46" marker-end="url(#an05-arrow)"/>
  <path class="d-edge" d="M 184 126 L 264 126" marker-end="url(#an05-arrow)"/>
  <text class="d-sub" x="224" y="36" text-anchor="middle">sort</text>
  <text class="d-sub" x="224" y="116" text-anchor="middle">sort</text>
  <rect class="d-box-muted" x="272" y="24" width="150" height="44" rx="8"/>
  <text class="d-text" x="347" y="52" text-anchor="middle">eilnst</text>
  <rect class="d-box-muted" x="272" y="104" width="150" height="44" rx="8"/>
  <text class="d-text" x="347" y="132" text-anchor="middle">eilnst</text>
  <path class="d-edge-accent" d="M 426 46 L 486 80" marker-end="url(#an05-arrow)"/>
  <path class="d-edge-accent" d="M 426 126 L 486 92" marker-end="url(#an05-arrow)"/>
  <rect class="d-box-accent" x="494" y="64" width="140" height="44" rx="8"/>
  <text class="d-text d-accent" x="564" y="92" text-anchor="middle">equal: true</text>
</svg>

## 4. Three Approaches and When to Use Each

| Approach | Time | Extra space | Use it when |
| :--- | :--- | :--- | :--- |
| Sort both, compare | O(n log n) | O(n) for the sorted copies | You want the shortest correct code, or you also need a canonical "key" (as in grouping anagrams) |
| Hash-map counting | O(n) | O(k), k = distinct characters | Any character set: the general answer |
| Fixed array of 26 (or 256) counts | O(n) | O(1) — the array size does not grow with n | Characters are guaranteed to be \`a\`–\`z\` (or single bytes) |

📌 **Interview term: Counting sort idea** — when the set of possible values is small and known (26 letters), you can count into a fixed array indexed by the value instead of comparing elements. That is why the 26-slot version is O(n) time **and** O(1) space.

**One table or two?** You can build two frequency maps and compare them, but a single table — \`+1\` for each character of \`s\`, \`−1\` for each character of \`t\` — does the same job with half the memory. Because the lengths are equal (checked first), "every count is zero" is exactly "same multiset". A second common shape counts \`s\` up, then walks \`t\` and returns \`false\` the moment a count would go below zero — an earlier exit on mismatches.

**What "character" means is a real question.** The O(n) claim assumes each character is one unit of the string. Across languages that unit differs — a Unicode code point, a UTF-16 code unit, or a byte — and counting the wrong unit can call two different strings anagrams. Section 5 shows exactly what happens in this language, with a run.

## 5. The Code in C++

The general byte version: one count per possible byte value, so it handles any \`std::string\` without hashing.

~~~cpp
#include <array>
#include <cctype>
#include <iostream>
#include <string>
using namespace std;

// True if t uses exactly the same characters (bytes) as s, the same number of times.
bool isAnagram(const string& s, const string& t) {
    if (s.size() != t.size()) return false;           // different lengths can never match
    array<int, 256> counts{};                         // one slot per byte value, all zero
    for (size_t i = 0; i < s.size(); i++) {
        counts[(unsigned char)s[i]]++;                // cast: plain char may be signed
        counts[(unsigned char)t[i]]--;
    }
    for (int v : counts) {
        if (v != 0) return false;
    }
    return true;
}

// Ignore case and spaces: "Dirty room" -> "dirtyroom".
string normalize(const string& s) {
    string out;
    for (char c : s) {
        if (c != ' ') out += (char)tolower((unsigned char)c);
    }
    return out;
}

void show(const string& s, const string& t) {
    cout << "\\"" << s << "\\" vs \\"" << t << "\\": " << isAnagram(s, t) << endl;
}

int main() {
    cout << boolalpha;                                // print true/false, not 1/0
    show("anagram", "nagaram");
    show("listen", "silent");
    show("rat", "car");
    show("aab", "abb");
    show("a", "ab");
    show("", "");
    show("Dormitory", "dirtyroom");
    cout << "normalized: " << isAnagram(normalize("Dormitory"), normalize("Dirty room")) << endl;
    return 0;
}
~~~

- **\`array<int, 256> counts{}\`** — the \`{}\` value-initialises every slot to zero. 256 slots cover every value an 8-bit byte can take, so the array has a fixed size no matter how long the strings are: O(1) extra space.
- **\`(unsigned char)s[i]\`** — whether plain \`char\` is signed is implementation-defined. With the GCC 13 / x86-64 toolchain used here, \`std::is_signed<char>::value\` printed \`1\` and \`(int)(char)0xE9\` printed \`-23\`, so any byte above 127 becomes a negative index. Casting to \`unsigned char\` maps every byte to \`0..255\`.
- **\`tolower((unsigned char)c)\`** — the same cast is required for \`std::tolower\`, whose behaviour is undefined for negative values other than \`EOF\`.
- **\`cout << boolalpha\`** — makes \`bool\` print as \`true\`/\`false\` instead of \`1\`/\`0\`.

📌 **Interview term: \`std::array<int, 26>\` counting** — when input is guaranteed lowercase, \`c - 'a'\` maps \`'a'..'z'\` to \`0..25\`. The plain \`counts[i]\` does **not** check bounds: an out-of-range index is undefined behaviour and may silently corrupt memory. \`counts.at(i)\` checks and throws:

~~~cpp
#include <array>
#include <iostream>
#include <string>
using namespace std;

int main() {
    array<int, 26> counts{};
    string s = "Ab";
    int idx = s[0] - 'a';                       // 'A' - 'a'
    cout << "index for 'A': " << idx << endl;
    try {
        counts.at(idx)++;                       // at() checks bounds; counts[idx] would not
    } catch (const out_of_range&) {
        cout << "at() threw std::out_of_range" << endl;
    }
}
~~~

~~~text
index for 'A': -32
at() threw std::out_of_range
~~~

(\`at\` takes a \`size_t\`, so −32 converts to a huge unsigned number and is rejected.) Use the 26-slot array only when the input is guaranteed; otherwise use 256 slots with an \`unsigned char\` cast, as in example 1.

### What a "character" is in C++

📌 **Interview term: Bytes vs code points (UTF-8)** — \`std::string\` is a sequence of bytes. In UTF-8, ASCII characters are one byte, but é is two and most emoji are four. \`size()\` counts bytes, and counting or sorting bytes can call two **different** strings anagrams:

~~~cpp
#include <algorithm>
#include <iostream>
#include <string>
using namespace std;

int main() {
    string a = "\\xF0\\x9F\\x98\\x80\\xF0\\x9D\\x90\\x80";   // UTF-8 bytes of U+1F600 and U+1D400
    string b = "\\xF0\\x9F\\x90\\x80\\xF0\\x9D\\x98\\x80";   // UTF-8 bytes of U+1F400 and U+1D600
    cout << "bytes: " << a.size() << endl;          // std::string counts bytes
    string sa = a, sb = b;
    sort(sa.begin(), sa.end());
    sort(sb.begin(), sb.end());
    cout << boolalpha << "bytes say anagram: " << (sa == sb) << endl;
    cout << "strings equal: " << (a == b) << endl;
}
~~~

~~~text
bytes: 8
bytes say anagram: true
strings equal: false
~~~

The two strings are not equal and do not contain the same characters, but their eight bytes are the same multiset, so the byte sort says "anagram". For real text you need to decode UTF-8 into code points first (for example into a \`std::u32string\` with a small decoder or a library such as ICU — the standard library has no non-deprecated UTF-8 decoder in C++17) and count those. Unicode normalisation (composed vs decomposed accents) is also a library job in C++.

📌 **Interview term: Unicode normalisation** — converting text to one canonical form (NFC composes accents into single code points) so visually identical strings compare equal.

## 6. Verified: Running the Code

Both examples were saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). Example 1 — the counting check on eight inputs:

~~~text
"anagram" vs "nagaram": true
"listen" vs "silent": true
"rat" vs "car": false
"aab" vs "abb": false
"a" vs "ab": false
"" vs "": true
"Dormitory" vs "dirtyroom": false
normalized: true
~~~

\`"Dormitory"\` vs \`"dirtyroom"\` is \`false\` because \`'D'\` and \`'d'\` differ; after normalising both, it is \`true\`.

Example 2 — three methods on the same pairs, plus the frequency maps from the diagram (built in a \`std::map\`, which keeps keys sorted, so the output is deterministic):

~~~text
anagram/nagaram: sort=true count=true array26=true
rat/car: sort=false count=false array26=false
aab/abb: sort=false count=false array26=false
abc/abcd: sort=false count=false array26=false
/: sort=true count=true array26=true
freq(anagram): a=3 g=1 m=1 n=1 r=1
freq(nagaram): a=3 g=1 m=1 n=1 r=1
~~~

All three methods agree. Note \`bySorting(string s, string t)\` takes its parameters **by value**: it sorts its own copies, so the caller's strings are untouched. In \`byCounting\`, \`counts[ch]++\` relies on \`operator[]\` inserting a missing key with value 0, which is exactly what you want when **building** counts; the lookup loop then uses \`find\`, so it never inserts.

## 7. Complexity

| Method | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`std::sort\` copies, compare | O(n log n) | O(n) | Sorting dominates; two copies |
| \`unordered_map<char, int>\` counting | O(n) average | O(k) | O(1) average per update; k distinct bytes |
| \`std::array<int, 26 or 256>\` counting | O(n) | O(1) | Fixed array, no hashing; the fastest in practice |

With only 256 possible byte values, the fixed array is always at least as good as the hash map for \`char\` keys. For more on these labels: [What is Big-O notation?](/interview-question/what-is-big-o-notation)

## Edge Cases

- **Different lengths** (\`"a"\` vs \`"ab"\`) — \`false\` without counting.
- **Both empty** (\`""\` vs \`""\`) — \`true\`: two empty bags hold the same tiles.
- **Same letters, different counts** (\`"aab"\` vs \`"abb"\`) — \`false\`; this is the case that breaks a "same set of letters" check that ignores counts.
- **Identical strings** — \`true\` under the standard definition; confirm if the interviewer wants "a different word".
- **Case and spaces** (\`"Dormitory"\` vs \`"Dirty room"\`) — \`false\` as raw strings, \`true\` after lowercasing and removing spaces. Normalise **both** strings the same way before comparing.
- **Characters outside \`a\`–\`z\`** — break the 26-slot array (out-of-range index) and need the hash-map version.

## Common Pitfalls

- **Comparing sets instead of counts** — a \`std::set<char>\` of \`"aab"\` equals that of \`"abb"\`. Counts matter.
- **Indexing with a raw \`char\`** — plain \`char\` can be signed, so a non-ASCII byte becomes a negative index (undefined behaviour). Cast to \`unsigned char\`.
- **\`counts[c - 'a']\` on input that is not \`a\`–\`z\`** — no bounds check, undefined behaviour; use \`at()\` while debugging or 256 slots.
- **\`std::tolower(c)\` on a negative \`char\`** — undefined; call \`tolower((unsigned char)c)\`.
- **Counting bytes of UTF-8 text** — different characters can share bytes, and the run above shows a false "anagram". Decode to code points for real text.
- **Using \`operator[]\` for lookups** — on \`unordered_map\` it inserts missing keys, growing the map and hiding bugs; use \`find\` or \`count\` when only reading.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Two strings are anagrams when every character appears the same number of times; I check the sizes, then count into a fixed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::array&lt;int, 256&gt;</code> (+1 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code>, −1 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">t</code>) and verify all zeros.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The two approaches:</strong> <span style="color:#f0e2c8;">Sorting copies with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> and comparing is O(n log n); counting is O(n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Space:</strong> <span style="color:#f0e2c8;">The fixed array is O(1) extra space and needs no hashing; 26 slots with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c - 'a'</code> if the input is guaranteed lowercase.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The rules question:</strong> <span style="color:#f0e2c8;">I would ask about case, spaces and encoding first, and normalise <strong style="color:#ffca28;">both</strong> strings the same way — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tolower((unsigned char)c)</code> and skipping spaces.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ detail:</strong> <span style="color:#f0e2c8;">I cast to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unsigned char</code> before indexing because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char</code> may be signed, and I remember that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::string</code> is bytes, so UTF-8 text must be decoded to code points before counting.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unsigned char</code> and not just <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">char</code> for the index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Whether <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char</code> is signed is implementation-defined; where it is signed, any byte above 127 becomes negative and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">counts[c]</code> reads outside the array, which is undefined behaviour. The cast maps every byte into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0..255</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_map&lt;char, int&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works, but there are only 256 possible <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char</code> values, so a fixed array gives the same answer with no hashing, no allocation and O(1) space. A map makes sense for wider keys, such as decoded code points.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">counts.at(i)</code> buy you over <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">counts[i]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bounds checking: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">at</code> throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::out_of_range</code> for a bad index, as the run above showed for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'A' - 'a'</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[]</code> is unchecked and an out-of-range index is undefined behaviour.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle UTF-8 input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Decode the bytes into code points (a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::u32string</code> or a library like ICU), then count code points in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map&lt;char32_t, int&gt;</code>. Counting raw bytes can give a false positive, as the run above demonstrated.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find all anagrams of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">p</code> in a longer string <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">s</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A sliding window of size <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p.size()</code> over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::array&lt;int, 26&gt;</code> for the window, updated by one add and one remove per step and compared with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p</code>'s array using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>. O(26 · n), which is O(n).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Anagram** | Same characters, same counts, any order |
| **Frequency map** | Table from character to how many times it appears |
| **Early exit on length** | Different lengths mean \`false\` immediately |
| **Counting sort idea** | Count into a fixed array indexed by value when the value range is small |
| **\`std::array<int, 26>\` counting** | Fixed counts indexed by \`c - 'a'\`; no bounds check with \`[]\` |
| **Bytes vs code points (UTF-8)** | \`std::string\` holds bytes; one character can be several bytes |
| **Unicode normalisation** | Converting text to one canonical form so equal-looking strings compare equal |

---
**Conclusion:** Two strings are anagrams when their character counts match. In C++, check the sizes, then count into a fixed \`std::array\` — 26 slots for guaranteed lowercase, 256 slots with an \`unsigned char\` cast for any bytes — for an O(n), O(1)-space answer; sorting copies with \`std::sort\` is the O(n log n) alternative. The C++-specific catches are signed \`char\` indices, unchecked \`operator[]\` on arrays, \`operator[]\` inserting into maps, and the fact that \`std::string\` counts bytes, not characters, so UTF-8 text needs decoding first. The same frequency-map idea powers [grouping anagrams](/interview-question/how-do-you-group-anagrams-together) and [finding the top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements).`,
        examples: [
          {
            label: "Counting anagram check on eight inputs, including case and spaces",
            code: `#include <array>
#include <cctype>
#include <iostream>
#include <string>
using namespace std;

// True if t uses exactly the same characters (bytes) as s, the same number of times.
bool isAnagram(const string& s, const string& t) {
    if (s.size() != t.size()) return false;           // different lengths can never match
    array<int, 256> counts{};                         // one slot per byte value, all zero
    for (size_t i = 0; i < s.size(); i++) {
        counts[(unsigned char)s[i]]++;                // cast: plain char may be signed
        counts[(unsigned char)t[i]]--;
    }
    for (int v : counts) {
        if (v != 0) return false;
    }
    return true;
}

// Ignore case and spaces: "Dirty room" -> "dirtyroom".
string normalize(const string& s) {
    string out;
    for (char c : s) {
        if (c != ' ') out += (char)tolower((unsigned char)c);
    }
    return out;
}

void show(const string& s, const string& t) {
    cout << "\\"" << s << "\\" vs \\"" << t << "\\": " << isAnagram(s, t) << endl;
}

int main() {
    cout << boolalpha;                                // print true/false, not 1/0
    show("anagram", "nagaram");
    show("listen", "silent");
    show("rat", "car");
    show("aab", "abb");
    show("a", "ab");
    show("", "");
    show("Dormitory", "dirtyroom");
    cout << "normalized: " << isAnagram(normalize("Dormitory"), normalize("Dirty room")) << endl;
    return 0;
}`,
          },
          {
            label: "Sorting vs hash-map counting vs 26-slot array: all three agree",
            code: `#include <algorithm>
#include <array>
#include <iostream>
#include <map>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

// Three ways to check an anagram, run on the same pairs. All must agree.

bool bySorting(string s, string t) {                  // by value: we sort copies, O(n log n)
    sort(s.begin(), s.end());
    sort(t.begin(), t.end());
    return s == t;
}

bool byCounting(const string& s, const string& t) {   // O(n)
    if (s.size() != t.size()) return false;
    unordered_map<char, int> counts;
    for (char ch : s) counts[ch]++;                    // operator[] starts a new key at 0
    for (char ch : t) {
        auto it = counts.find(ch);
        if (it == counts.end() || it->second == 0) return false;   // s ran out of ch
        it->second--;
    }
    return true;
}

bool byArray26(const string& s, const string& t) {    // only for lowercase a-z
    if (s.size() != t.size()) return false;
    array<int, 26> counts{};
    for (size_t i = 0; i < s.size(); i++) {
        counts[s[i] - 'a']++;
        counts[t[i] - 'a']--;
    }
    return all_of(counts.begin(), counts.end(), [](int c) { return c == 0; });  // O(1) space
}

string freq(const string& s) {
    map<char, int> counts;                             // std::map keeps keys sorted
    for (char ch : s) counts[ch]++;
    string out;
    for (const auto& [ch, n] : counts) {
        if (!out.empty()) out += ' ';
        out += string(1, ch) + "=" + to_string(n);
    }
    return out;
}

int main() {
    cout << boolalpha;
    vector<pair<string, string>> pairs = {{"anagram", "nagaram"}, {"rat", "car"}, {"aab", "abb"}, {"abc", "abcd"}, {"", ""}};
    for (const auto& [s, t] : pairs) {
        cout << s << "/" << t << ": sort=" << bySorting(s, t) << " count=" << byCounting(s, t)
             << " array26=" << byArray26(s, t) << endl;
    }
    cout << "freq(anagram): " << freq("anagram") << endl;
    cout << "freq(nagaram): " << freq("nagaram") << endl;
    return 0;
}`,
          },
        ],
      },
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you group anagrams together?",
    difficulty: "medium",
    seoDescription: "Group anagrams with a hash map keyed by a canonical form: sorted-string key vs letter-count key, complexity, and verified Python, JS, Java and C++ code.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a list of strings, group the anagrams together and return the groups in any order — for example \`["eat", "tea", "tan", "ate", "nat", "bat"]\` becomes \`[["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]\`. Please solve it in Python and give me the complexity."

**What a strong answer should cover:**
- The idea of a canonical key shared by all anagrams, and a hash map from key to list of words, built in one pass.
- Two keys: the sorted letters, O(k log k) per word, and a 26-letter count, O(k) per word; total O(n · k log k) or O(n · k).
- O(n · k) space for keys and output, and why the pairwise brute force is O(n² · k).
- Python specifics: \`collections.defaultdict(list)\`; keys must be hashable, so \`"".join(sorted(w))\` or \`tuple(...)\`, never a list; \`dict\` preserves insertion order, so groups come out in first-seen order.
- Edge cases: empty list, empty string, same letters with different counts.

**Clarifying questions expected:**
- Only lowercase \`a\`–\`z\`? Does the output order matter?

**Code / implementation expected:** Yes — a \`group_anagrams(words)\` function in Python using a \`dict\`/\`defaultdict\`, run on the sample and on edge cases.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Python lists, strings and dicts; nothing else assumed.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by running the code with \`python3\` (3.13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

A post office receives a sack of letters with scrambled addresses — "eat", "tea", "ate", "tan", "nat", "bat". The rule is: letters whose addresses use exactly the same letters go to the same house. How do you sort the sack?

The slow way: take a letter, compare it with every other letter in the sack, pull out the matches, and repeat. That is a comparison for every pair of letters.

The smart way: give each letter a **label** that is the same for all its anagrams, and put it in the pigeonhole with that label. A simple label is "the address with its letters in alphabetical order": "eat", "tea" and "ate" are all labelled \`aet\`; "tan" and "nat" are \`ant\`; "bat" is \`abt\`. You look at each letter **once**, compute its label, and drop it in the right pigeonhole. When the sack is empty, each pigeonhole is a group.

The pigeonholes are a hash map, and the label is a **canonical key**. This is the step up from [checking whether two strings are anagrams](/interview-question/how-do-you-check-if-two-strings-are-anagrams): instead of comparing strings with each other, you turn each string into a key that equal strings share. The same trick — "compute a signature, bucket by it" — is how you group anything by an equivalence (shifted strings, isomorphic patterns, points on the same line).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the words only lowercase \`a\`–\`z\`? | Allows the 26-count key (O(k) per word instead of O(k log k)). Otherwise use the sorted key. |
| Does the order of groups, or of words inside a group, matter? | Usually "any order". If not, you must sort, and hash-map iteration order becomes a real issue. |
| Can the list contain duplicates or empty strings? | \`["", ""]\` is one group of two empty strings; duplicates stay in the same group. |
| How many words, and how long is the longest? | Decides whether the \`log k\` of the sorted key matters. With n = 10^4 words of length ≤ 100 either key is fine. |
| Should case or spaces be ignored? | Normalise each word before computing its key — but keep the original word in the group. |

## 3. The Core Idea

Two words belong in the same group exactly when they are anagrams. So you need a function \`key(word)\` with one property: **\`key(a) == key(b)\` if and only if \`a\` and \`b\` are anagrams**. Then a hash map from key to a list of words does all the grouping in a single pass.

📌 **Interview term: Canonical form (canonical key)** — one standard representative that every member of an equivalence class maps to. For anagrams, the sorted letters (\`"tea"\` → \`"aet"\`) or the letter counts (\`a1e1t1\`) are both canonical.

📌 **Interview term: Bucketing** — putting items into groups by a computed key using a hash map, instead of comparing items with each other. Grouping becomes O(n × cost of one key).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Six words eat tea tan ate nat bat each map to a sorted key. eat tea and ate map to aet, tan and nat map to ant, bat maps to abt. Each key is a bucket holding its words">
  <defs>
    <marker id="ga05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="90" y="24" text-anchor="middle">word</text>
  <text class="d-text" x="330" y="24" text-anchor="middle">key = sorted letters</text>
  <text class="d-text" x="570" y="24" text-anchor="middle">bucket</text>
  <rect class="d-box" x="40" y="40" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="60" text-anchor="middle">eat</text>
  <rect class="d-box" x="40" y="80" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="100" text-anchor="middle">tea</text>
  <rect class="d-box" x="40" y="120" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="140" text-anchor="middle">ate</text>
  <rect class="d-box" x="40" y="170" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="190" text-anchor="middle">tan</text>
  <rect class="d-box" x="40" y="210" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="230" text-anchor="middle">nat</text>
  <rect class="d-box" x="40" y="258" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="278" text-anchor="middle">bat</text>
  <path class="d-edge" d="M 144 55 L 274 90" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 95 L 274 95" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 135 L 274 100" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 185 L 274 205" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 225 L 274 210" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 273 L 274 273" marker-end="url(#ga05-arrow)"/>
  <rect class="d-box-muted" x="280" y="78" width="100" height="36" rx="6"/>
  <text class="d-text" x="330" y="101" text-anchor="middle">aet</text>
  <rect class="d-box-muted" x="280" y="190" width="100" height="36" rx="6"/>
  <text class="d-text" x="330" y="213" text-anchor="middle">ant</text>
  <rect class="d-box-muted" x="280" y="256" width="100" height="36" rx="6"/>
  <text class="d-text" x="330" y="279" text-anchor="middle">abt</text>
  <path class="d-edge-accent" d="M 384 96 L 464 96" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge-accent" d="M 384 208 L 464 208" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge-accent" d="M 384 274 L 464 274" marker-end="url(#ga05-arrow)"/>
  <rect class="d-box-accent" x="470" y="78" width="190" height="36" rx="6"/>
  <text class="d-text d-accent" x="565" y="101" text-anchor="middle">eat, tea, ate</text>
  <rect class="d-box-accent" x="470" y="190" width="190" height="36" rx="6"/>
  <text class="d-text d-accent" x="565" y="213" text-anchor="middle">tan, nat</text>
  <rect class="d-box-accent" x="470" y="256" width="190" height="36" rx="6"/>
  <text class="d-text d-accent" x="565" y="279" text-anchor="middle">bat</text>
</svg>

Each word is read once and its key computed once; the map does the matching. Inside a bucket, words keep the order in which they arrived — \`eat, tea, ate\`.

### Two choices of key

<svg class="iq-diagram" width="100%" viewBox="0 0 680 190" role="img" aria-label="Two keys for the word banana. Sorting gives aaabnn in k log k time. Counting letters gives a3b1n2 in k plus 26 time. Both keys are equal for every anagram of banana">
  <defs>
    <marker id="ga05-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="70" width="140" height="50" rx="8"/>
  <text class="d-text" x="100" y="100" text-anchor="middle">banana</text>
  <path class="d-edge" d="M 174 85 L 300 46" marker-end="url(#ga05-arrow2)"/>
  <path class="d-edge" d="M 174 105 L 300 144" marker-end="url(#ga05-arrow2)"/>
  <rect class="d-box-muted" x="306" y="20" width="160" height="50" rx="8"/>
  <text class="d-text" x="386" y="50" text-anchor="middle">aaabnn</text>
  <rect class="d-box-muted" x="306" y="120" width="160" height="50" rx="8"/>
  <text class="d-text" x="386" y="150" text-anchor="middle">a3b1n2</text>
  <rect class="d-box" x="510" y="20" width="150" height="50" rx="8"/>
  <text class="d-sub" x="585" y="42" text-anchor="middle">sorted key</text>
  <text class="d-sub" x="585" y="60" text-anchor="middle">O(k log k)</text>
  <rect class="d-box-accent" x="510" y="120" width="150" height="50" rx="8"/>
  <text class="d-sub" x="585" y="142" text-anchor="middle">count key</text>
  <text class="d-sub" x="585" y="160" text-anchor="middle">O(k + 26)</text>
</svg>

Both keys for "banana" are exactly what example 2 prints. The count key needs a **separator-safe** encoding: writing the 26 counts with a letter (or a \`#\`) between them, because plain concatenation of counts is ambiguous — counts \`1, 11\` and \`11, 1\` would both become \`111\`.

## 4. From Brute Force to One Pass

📌 **Interview term: Equivalence class** — a set of items that are all "equal" under some rule (here: being anagrams of each other). Grouping anagrams means partitioning the input into equivalence classes.

**Brute force.** For each word not yet placed, compare it with every remaining word using an [anagram check](/interview-question/how-do-you-check-if-two-strings-are-anagrams). That is O(n²) comparisons of O(k) each: **O(n² · k)**. For 10,000 words that is about 50 million comparisons.

**Sorted key + hash map.** For each word, sort its letters to get the key and append the word to \`groups[key]\`. Sorting a word of length k is O(k log k), so the total is **O(n · k log k)** time and O(n · k) space for the keys and the output.

**Count key + hash map.** Count the 26 letters (O(k)) and encode the counts as the key (O(26)). Total **O(n · (k + 26))**, which is O(n · k) — asymptotically better than sorting when words are long. It requires a known, small alphabet.

| Approach | Time | Space | When |
| :--- | :--- | :--- | :--- |
| Pairwise comparison | O(n² · k) | O(n · k) | Never in an interview, except as the starting point |
| Sorted key | O(n · k log k) | O(n · k) | The default; works for any characters |
| Count key | O(n · k) | O(n · k) | Lowercase \`a\`–\`z\` and long words |

For short words the difference is small: the \`log k\` factor for a 5-letter word is tiny, while the count key always pays for 26 slots. (That is a reasoning point, not a benchmark — measure if it matters.) Mention both, implement the sorted key, and offer the count key as the optimisation.

**Why the hash map, not sorting the whole list?** You could sort the words by their key and then cut the sorted list into runs of equal keys. That works in O(n log n · k) but is more code and slower than one pass with a map. The map is the standard answer; the idea is the same one used in [How does a hash table work?](/interview-question/how-does-a-hash-table-work)

## 5. The Code in Python

~~~python
from collections import defaultdict


def group_anagrams(words):
    groups = defaultdict(list)            # key -> list of words with that key
    for w in words:
        key = "".join(sorted(w))          # "eat", "tea", "ate" all become "aet"
        groups[key].append(w)
    return list(groups.values())


def canonical(groups):
    """Sort inside each group, then sort the groups, so output order is fixed."""
    return sorted(sorted(g) for g in groups)


def fmt(groups):
    return "[" + ", ".join("[" + ", ".join('"' + w + '"' for w in g) + "]" for g in groups) + "]"


print(fmt(canonical(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))))  # [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]
print(fmt(canonical(group_anagrams([""]))))  # [[""]]
print(fmt(canonical(group_anagrams(["a"]))))  # [["a"]]
print(fmt(canonical(group_anagrams(["abc", "bca", "xyz", "zyx", "q", "cab"]))))  # [["abc", "bca", "cab"], ["q"], ["xyz", "zyx"]]
print(fmt(canonical(group_anagrams(["ab", "ba", "abb", "bab", "aab"]))))  # [["aab"], ["ab", "ba"], ["abb", "bab"]]
print(fmt(canonical(group_anagrams([]))))  # []
~~~

- **\`defaultdict(list)\`** — a \`dict\` that creates an empty list the first time a missing key is used, so \`groups[key].append(w)\` needs no "is the key there yet?" check. The plain-\`dict\` equivalent is \`groups.setdefault(key, []).append(w)\` (used in example 2).
- **\`"".join(sorted(w))\`** — \`sorted\` on a string returns a **list** of characters; \`"".join\` turns it back into a string, which is hashable and so can be a key.
- **\`list(groups.values())\`** — the groups, one list per key.
- **\`canonical\` and \`fmt\`** exist only so the printed output is in a fixed order and identical across the four language versions of this page. A real solution returns \`list(groups.values())\` directly.

📌 **Interview term: Hashable key** — a \`dict\` key must have a hash that never changes, so it must be immutable: \`str\`, \`int\`, \`tuple\` yes; \`list\` no. This is the single most common Python error in this problem:

~~~python
from collections import defaultdict

groups = defaultdict(list)
for w in ["eat", "tea", "tan", "ate", "nat", "bat"]:
    groups[tuple(sorted(w))].append(w)      # a tuple of characters is hashable
print(list(groups.values()))                # groups appear in first-seen order
print(list(groups)[0])

try:
    {}[sorted("eat")] = ["eat"]             # sorted() returns a list: not hashable
except TypeError as e:
    print("TypeError:", e)
~~~

~~~text
[['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]
('a', 'e', 't')
TypeError: unhashable type: 'list'
~~~

Line 1 also shows the order the groups come out in **without** the canonical sort: first-seen order. That is guaranteed, not luck — the Python documentation states "Dictionary order is guaranteed to be insertion order" (changed in version 3.7; checked in the 3.13 docs bundled with the interpreter, \`pydoc_data\`). Line 2 shows the alternative key \`tuple(sorted(w))\`, a tuple of characters. Both work; the string key is shorter to print and slightly cheaper to hash. A count key can also be a tuple: \`tuple(counts)\` of the 26 integers is hashable and unambiguous with no separator.

## 6. Verified: Running the Code

Both examples were saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). Example 1 — the sample input and five edge cases (empty string, one word, more groups, same letters with different counts, empty list):

~~~text
[["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]
[[""]]
[["a"]]
[["abc", "bca", "cab"], ["q"], ["xyz", "zyx"]]
[["aab"], ["ab", "ba"], ["abb", "bab"]]
[]
~~~

Example 2 — the sorted key and the count key side by side on 11 words:

~~~text
eat: sorted_key=aet count_key=a1e1t1
tea: sorted_key=aet count_key=a1e1t1
listen: sorted_key=eilnst count_key=e1i1l1n1s1t1
google: sorted_key=eggloo count_key=e1g2l1o2
banana: sorted_key=aaabnn count_key=a3b1n2
groups: 6, same=true
largest group: ate eat tea
~~~

\`same=true\` confirms both keys produce identical groups. The count key \`e1g2l1o2\` for "google" shows why it needs letters between the numbers: without them, counts of 1 and 12 and of 11 and 2 would collide.

## 7. Complexity

n = number of words, k = length of the longest word.

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Pairwise comparison | O(n² · k) | O(n · k) | Every pair compared with an O(k) anagram check |
| Sorted key (\`"".join(sorted(w))\`) | O(n · k log k) | O(n · k) | One sort per word; keys and output hold every character |
| Count key (26 counts) | O(n · (k + 26)) = O(n · k) | O(n · k) | One counting pass per word plus building a 26-entry key |

\`dict\` inserts and lookups are O(1) **on average** (hashing a key of length k itself costs O(k), which the bounds above already include). More background: [the time complexity of common operations](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance).

## Edge Cases

- **Empty input list** — returns no groups: \`[]\`.
- **A single empty string** (\`[""]\`) — one group containing \`""\`; the empty string's key is the empty string, which is a valid map key.
- **One word** — one group of one.
- **No anagrams at all** — n groups of one word each.
- **Same letters, different counts** (\`"ab"\`, \`"abb"\`, \`"aab"\`) — three different groups. The count key handles this because counts are in the key; a "set of letters" key would wrongly merge them. Example 1 checks this case.
- **Duplicate words** (\`["a", "a"]\`) — both copies land in the same group; nothing is de-duplicated unless asked.

## Common Pitfalls

- **Using \`sorted(w)\` (a list) as the key** — \`TypeError: unhashable type: 'list'\`, as shown above. Use \`"".join(sorted(w))\` or \`tuple(sorted(w))\`.
- **Building a count key by plain concatenation** — \`"".join(map(str, counts))\` makes \`[1, 11]\` and \`[11, 1]\` both \`"111"\`. Use \`tuple(counts)\` or put separators between the numbers.
- **Using \`set(w)\` as the key** — \`"ab"\` and \`"abb"\` share a set, so different groups merge. Example 1 shows they must stay apart.
- **Comparing every pair** — O(n² · k); the interviewer asked for grouping precisely to see the hash-map key idea.
- **Returning \`groups\` instead of \`list(groups.values())\`** — the function should return lists of words, not a \`dict\` (or a \`dict_values\` view if the caller expects a list).
- **Forgetting to normalise when case should be ignored** — compute the key from \`w.lower()\` but append the original \`w\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">I give each word a key that all its anagrams share — its sorted letters — and append it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">groups[key]</code> in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defaultdict(list)</code>; the values are the groups.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">Two words are anagrams exactly when their sorted letters are equal, so equal keys means same group, and the hash map does the matching in one pass.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n · k log k) time for n words of length up to k, and O(n · k) space; the pairwise brute force would be O(n² · k).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The optimisation:</strong> <span style="color:#f0e2c8;">For lowercase <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>–<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">z</code> I can use a 26-count <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tuple</code> as the key, O(k) per word, so O(n · k) total.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Python detail:</strong> <span style="color:#f0e2c8;">The key must be hashable, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"".join(sorted(w))</code> or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tuple</code>, not a list; and since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> keeps insertion order, groups come out in first-seen order.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sorted(w)</code> directly as the key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It returns a list, and lists are mutable and not hashable, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: unhashable type: 'list'</code>. Convert it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"".join(...)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tuple(...)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is the count key better than the sorted key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When words are long: O(k) beats O(k log k). For short words the 26-slot overhead dominates and the gain is small, so I would start with the sorted key and mention the count key as the optimisation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the groups sorted, for a deterministic test?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(sorted(g) for g in groups.values())</code> — sort words inside each group, then sort the groups. That adds O(total · log) work, so I only do it if the output order is part of the requirement.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the words can contain any Unicode characters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The count key breaks (it assumes 26 letters); the sorted key still works because Python sorts code points. I would also normalise with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unicodedata.normalize("NFC", w)</code> so composed and decomposed accents get the same key.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a stream of words too large for memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compute the key per word and write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(key, word)</code> pairs out partitioned by a hash of the key, so each partition fits in memory; then group each partition separately. Same key idea, applied in chunks.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Canonical form (canonical key)** | One standard representative shared by all anagrams, e.g. sorted letters |
| **Bucketing** | Grouping items by a computed key in a hash map |
| **Equivalence class** | A set of items that are all "equal" under a rule |
| **Hashable key** | An immutable value usable as a \`dict\` key: \`str\`, \`tuple\`, not \`list\` |

---
**Conclusion:** Group anagrams by giving every word a canonical key that all its anagrams share and bucketing with a \`defaultdict(list)\` in one pass. The sorted-letters key costs O(k log k) per word and works for any characters; the 26-count key costs O(k) and needs a fixed alphabet and an unambiguous encoding (a tuple is perfect in Python). The Python details to say aloud are that the key must be hashable — a string or tuple, never a list — and that groups come out in first-seen order because \`dict\` preserves insertion order. The building block is [the two-string anagram check](/interview-question/how-do-you-check-if-two-strings-are-anagrams), and the bucket-by-count idea continues in [top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements).`,
        examples: [
          {
            label: "Group anagrams with a sorted-string key on six inputs",
            code: `from collections import defaultdict


def group_anagrams(words):
    groups = defaultdict(list)            # key -> list of words with that key
    for w in words:
        key = "".join(sorted(w))          # "eat", "tea", "ate" all become "aet"
        groups[key].append(w)
    return list(groups.values())


def canonical(groups):
    """Sort inside each group, then sort the groups, so output order is fixed."""
    return sorted(sorted(g) for g in groups)


def fmt(groups):
    return "[" + ", ".join("[" + ", ".join('"' + w + '"' for w in g) + "]" for g in groups) + "]"


print(fmt(canonical(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))))  # [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]
print(fmt(canonical(group_anagrams([""]))))  # [[""]]
print(fmt(canonical(group_anagrams(["a"]))))  # [["a"]]
print(fmt(canonical(group_anagrams(["abc", "bca", "xyz", "zyx", "q", "cab"]))))  # [["abc", "bca", "cab"], ["q"], ["xyz", "zyx"]]
print(fmt(canonical(group_anagrams(["ab", "ba", "abb", "bab", "aab"]))))  # [["aab"], ["ab", "ba"], ["abb", "bab"]]
print(fmt(canonical(group_anagrams([]))))  # []`,
          },
          {
            label: "Sorted key vs letter-count key: same groups, different cost",
            code: `# Two ways to build the group key. Both must produce the same groups.

def sorted_key(w):
    return "".join(sorted(w))                     # O(k log k) per word


def count_key(w):
    counts = [0] * 26                             # O(k + 26) per word, lowercase a-z only
    for ch in w:
        counts[ord(ch) - ord("a")] += 1
    return "".join(chr(ord("a") + i) + str(c) for i, c in enumerate(counts) if c > 0)


def group(words, key_fn):
    groups = {}
    for w in words:
        groups.setdefault(key_fn(w), []).append(w)
    return sorted(sorted(g) for g in groups.values())


words = ["eat", "tea", "tan", "ate", "nat", "bat", "listen", "silent", "enlist", "google", "banana"]
for w in ["eat", "tea", "listen", "google", "banana"]:
    print(w + ": sorted_key=" + sorted_key(w) + " count_key=" + count_key(w))
a = group(words, sorted_key)
b = group(words, count_key)
print("groups: " + str(len(a)) + ", same=" + str(a == b).lower())
print("largest group: " + " ".join(max(a, key=len)))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an array of strings, group the anagrams together and return the groups in any order — for example \`['eat', 'tea', 'tan', 'ate', 'nat', 'bat']\` becomes \`[['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]\`. Please write it in JavaScript and explain the complexity."

**What a strong answer should cover:**
- A canonical key shared by all anagrams and a hash map from key to array of words, built in one pass.
- Two keys: the sorted letters (\`w.split('').sort().join('')\`), O(k log k) per word, and a 26-letter count, O(k) per word.
- O(n · k log k) or O(n · k) time, O(n · k) space; the pairwise brute force is O(n² · k).
- JavaScript specifics: use a \`Map\` with a **string** key — an array key is compared by reference, so it never matches; \`Map\` iterates in insertion order; \`.sort()\` without a comparator compares UTF-16 code units, which is fine for single characters.
- Edge cases: empty array, empty string, same letters with different counts.

**Clarifying questions expected:**
- Only lowercase \`a\`–\`z\`? Does output order matter?

**Code / implementation expected:** Yes — a \`groupAnagrams(words)\` function in JavaScript using a \`Map\`, run on the sample and edge cases.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know JavaScript arrays, strings and objects; nothing else assumed.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by running the code with \`node\` (v22); nothing is typed in by hand. The examples only use \`console.log\`, so they behave the same in a browser.

## 1. Why This Even Matters — A Story First

A post office receives a sack of letters with scrambled addresses — "eat", "tea", "ate", "tan", "nat", "bat". The rule is: letters whose addresses use exactly the same letters go to the same house. How do you sort the sack?

The slow way: take a letter, compare it with every other letter in the sack, pull out the matches, and repeat. That is a comparison for every pair of letters.

The smart way: give each letter a **label** that is the same for all its anagrams, and put it in the pigeonhole with that label. A simple label is "the address with its letters in alphabetical order": "eat", "tea" and "ate" are all labelled \`aet\`; "tan" and "nat" are \`ant\`; "bat" is \`abt\`. You look at each letter **once**, compute its label, and drop it in the right pigeonhole. When the sack is empty, each pigeonhole is a group.

The pigeonholes are a hash map, and the label is a **canonical key**. This is the step up from [checking whether two strings are anagrams](/interview-question/how-do-you-check-if-two-strings-are-anagrams): instead of comparing strings with each other, you turn each string into a key that equal strings share. The same trick — "compute a signature, bucket by it" — is how you group anything by an equivalence (shifted strings, isomorphic patterns, points on the same line).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the words only lowercase \`a\`–\`z\`? | Allows the 26-count key (O(k) per word instead of O(k log k)). Otherwise use the sorted key. |
| Does the order of groups, or of words inside a group, matter? | Usually "any order". If not, you must sort, and hash-map iteration order becomes a real issue. |
| Can the list contain duplicates or empty strings? | \`["", ""]\` is one group of two empty strings; duplicates stay in the same group. |
| How many words, and how long is the longest? | Decides whether the \`log k\` of the sorted key matters. With n = 10^4 words of length ≤ 100 either key is fine. |
| Should case or spaces be ignored? | Normalise each word before computing its key — but keep the original word in the group. |

## 3. The Core Idea

Two words belong in the same group exactly when they are anagrams. So you need a function \`key(word)\` with one property: **\`key(a) == key(b)\` if and only if \`a\` and \`b\` are anagrams**. Then a hash map from key to a list of words does all the grouping in a single pass.

📌 **Interview term: Canonical form (canonical key)** — one standard representative that every member of an equivalence class maps to. For anagrams, the sorted letters (\`"tea"\` → \`"aet"\`) or the letter counts (\`a1e1t1\`) are both canonical.

📌 **Interview term: Bucketing** — putting items into groups by a computed key using a hash map, instead of comparing items with each other. Grouping becomes O(n × cost of one key).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Six words eat tea tan ate nat bat each map to a sorted key. eat tea and ate map to aet, tan and nat map to ant, bat maps to abt. Each key is a bucket holding its words">
  <defs>
    <marker id="ga05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="90" y="24" text-anchor="middle">word</text>
  <text class="d-text" x="330" y="24" text-anchor="middle">key = sorted letters</text>
  <text class="d-text" x="570" y="24" text-anchor="middle">bucket</text>
  <rect class="d-box" x="40" y="40" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="60" text-anchor="middle">eat</text>
  <rect class="d-box" x="40" y="80" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="100" text-anchor="middle">tea</text>
  <rect class="d-box" x="40" y="120" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="140" text-anchor="middle">ate</text>
  <rect class="d-box" x="40" y="170" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="190" text-anchor="middle">tan</text>
  <rect class="d-box" x="40" y="210" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="230" text-anchor="middle">nat</text>
  <rect class="d-box" x="40" y="258" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="278" text-anchor="middle">bat</text>
  <path class="d-edge" d="M 144 55 L 274 90" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 95 L 274 95" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 135 L 274 100" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 185 L 274 205" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 225 L 274 210" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 273 L 274 273" marker-end="url(#ga05-arrow)"/>
  <rect class="d-box-muted" x="280" y="78" width="100" height="36" rx="6"/>
  <text class="d-text" x="330" y="101" text-anchor="middle">aet</text>
  <rect class="d-box-muted" x="280" y="190" width="100" height="36" rx="6"/>
  <text class="d-text" x="330" y="213" text-anchor="middle">ant</text>
  <rect class="d-box-muted" x="280" y="256" width="100" height="36" rx="6"/>
  <text class="d-text" x="330" y="279" text-anchor="middle">abt</text>
  <path class="d-edge-accent" d="M 384 96 L 464 96" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge-accent" d="M 384 208 L 464 208" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge-accent" d="M 384 274 L 464 274" marker-end="url(#ga05-arrow)"/>
  <rect class="d-box-accent" x="470" y="78" width="190" height="36" rx="6"/>
  <text class="d-text d-accent" x="565" y="101" text-anchor="middle">eat, tea, ate</text>
  <rect class="d-box-accent" x="470" y="190" width="190" height="36" rx="6"/>
  <text class="d-text d-accent" x="565" y="213" text-anchor="middle">tan, nat</text>
  <rect class="d-box-accent" x="470" y="256" width="190" height="36" rx="6"/>
  <text class="d-text d-accent" x="565" y="279" text-anchor="middle">bat</text>
</svg>

Each word is read once and its key computed once; the map does the matching. Inside a bucket, words keep the order in which they arrived — \`eat, tea, ate\`.

### Two choices of key

<svg class="iq-diagram" width="100%" viewBox="0 0 680 190" role="img" aria-label="Two keys for the word banana. Sorting gives aaabnn in k log k time. Counting letters gives a3b1n2 in k plus 26 time. Both keys are equal for every anagram of banana">
  <defs>
    <marker id="ga05-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="70" width="140" height="50" rx="8"/>
  <text class="d-text" x="100" y="100" text-anchor="middle">banana</text>
  <path class="d-edge" d="M 174 85 L 300 46" marker-end="url(#ga05-arrow2)"/>
  <path class="d-edge" d="M 174 105 L 300 144" marker-end="url(#ga05-arrow2)"/>
  <rect class="d-box-muted" x="306" y="20" width="160" height="50" rx="8"/>
  <text class="d-text" x="386" y="50" text-anchor="middle">aaabnn</text>
  <rect class="d-box-muted" x="306" y="120" width="160" height="50" rx="8"/>
  <text class="d-text" x="386" y="150" text-anchor="middle">a3b1n2</text>
  <rect class="d-box" x="510" y="20" width="150" height="50" rx="8"/>
  <text class="d-sub" x="585" y="42" text-anchor="middle">sorted key</text>
  <text class="d-sub" x="585" y="60" text-anchor="middle">O(k log k)</text>
  <rect class="d-box-accent" x="510" y="120" width="150" height="50" rx="8"/>
  <text class="d-sub" x="585" y="142" text-anchor="middle">count key</text>
  <text class="d-sub" x="585" y="160" text-anchor="middle">O(k + 26)</text>
</svg>

Both keys for "banana" are exactly what example 2 prints. The count key needs a **separator-safe** encoding: writing the 26 counts with a letter (or a \`#\`) between them, because plain concatenation of counts is ambiguous — counts \`1, 11\` and \`11, 1\` would both become \`111\`.

## 4. From Brute Force to One Pass

📌 **Interview term: Equivalence class** — a set of items that are all "equal" under some rule (here: being anagrams of each other). Grouping anagrams means partitioning the input into equivalence classes.

**Brute force.** For each word not yet placed, compare it with every remaining word using an [anagram check](/interview-question/how-do-you-check-if-two-strings-are-anagrams). That is O(n²) comparisons of O(k) each: **O(n² · k)**. For 10,000 words that is about 50 million comparisons.

**Sorted key + hash map.** For each word, sort its letters to get the key and append the word to \`groups[key]\`. Sorting a word of length k is O(k log k), so the total is **O(n · k log k)** time and O(n · k) space for the keys and the output.

**Count key + hash map.** Count the 26 letters (O(k)) and encode the counts as the key (O(26)). Total **O(n · (k + 26))**, which is O(n · k) — asymptotically better than sorting when words are long. It requires a known, small alphabet.

| Approach | Time | Space | When |
| :--- | :--- | :--- | :--- |
| Pairwise comparison | O(n² · k) | O(n · k) | Never in an interview, except as the starting point |
| Sorted key | O(n · k log k) | O(n · k) | The default; works for any characters |
| Count key | O(n · k) | O(n · k) | Lowercase \`a\`–\`z\` and long words |

For short words the difference is small: the \`log k\` factor for a 5-letter word is tiny, while the count key always pays for 26 slots. (That is a reasoning point, not a benchmark — measure if it matters.) Mention both, implement the sorted key, and offer the count key as the optimisation.

**Why the hash map, not sorting the whole list?** You could sort the words by their key and then cut the sorted list into runs of equal keys. That works in O(n log n · k) but is more code and slower than one pass with a map. The map is the standard answer; the idea is the same one used in [How does a hash table work?](/interview-question/how-does-a-hash-table-work)

## 5. The Code in JavaScript

~~~javascript
function groupAnagrams(words) {
  const groups = new Map();                       // key -> array of words with that key
  for (const w of words) {
    const key = w.split('').sort().join('');      // "eat", "tea", "ate" all become "aet"
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(w);
  }
  return [...groups.values()];
}

function canonical(groups) {
  // Sort inside each group, then sort the groups by their first word, so output order is fixed.
  const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  return groups.map((g) => [...g].sort(byCodeUnit)).sort((g, h) => byCodeUnit(g[0], h[0]));
}

function fmt(groups) {
  return '[' + groups.map((g) => '[' + g.map((w) => '"' + w + '"').join(', ') + ']').join(', ') + ']';
}

console.log(fmt(canonical(groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat']))));  // [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]
console.log(fmt(canonical(groupAnagrams(['']))));  // [[""]]
console.log(fmt(canonical(groupAnagrams(['a']))));  // [["a"]]
console.log(fmt(canonical(groupAnagrams(['abc', 'bca', 'xyz', 'zyx', 'q', 'cab']))));  // [["abc", "bca", "cab"], ["q"], ["xyz", "zyx"]]
console.log(fmt(canonical(groupAnagrams(['ab', 'ba', 'abb', 'bab', 'aab']))));  // [["aab"], ["ab", "ba"], ["abb", "bab"]]
console.log(fmt(canonical(groupAnagrams([]))));  // []
~~~

- **\`w.split('').sort().join('')\`** — split into single characters, sort, and join back into a string key. With no comparator, \`.sort()\` compares strings by UTF-16 code units, which for single lowercase letters is alphabetical order.
- **\`new Map()\`** with \`has\`/\`set\`/\`get\` — the "create the array the first time" pattern. (\`(groups.get(key) ?? groups.set(key, []).get(key)).push(w)\` is a terser variant; the explicit version is clearer in an interview.)
- **\`[...groups.values()]\`** — spreads the \`Map\`'s values iterator into an array of groups.
- **\`canonical\` and \`fmt\`** only fix the printed order so the output matches the other three language versions; a real solution returns \`[...groups.values()]\` directly. \`canonical\` copies each group with \`[...g]\` before sorting, because \`.sort()\` sorts **in place**.

📌 **Interview term: Reference equality (for keys)** — a \`Map\` compares object keys (arrays included) by identity: two different arrays with the same contents are different keys. Only primitives (strings, numbers) compare by value. Checked by running it:

~~~javascript
const groups = new Map();
for (const w of ['eat', 'tea', 'tan', 'ate', 'nat', 'bat']) {
  const key = w.split('').sort().join('');
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(w);
}
console.log(JSON.stringify([...groups.values()]));    // groups appear in first-seen order

const byArray = new Map();
byArray.set(['a', 'e', 't'], 'eat');                  // an array key is compared by reference
console.log(byArray.get(['a', 'e', 't']));            // a different array with the same contents
console.log(byArray.size);
~~~

~~~text
[["eat","tea","ate"],["tan","nat"],["bat"]]
undefined
1
~~~

Line 1 shows the raw output order without the canonical sort: first-seen order, because a \`Map\` iterates its entries in insertion order ([MDN: Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)). Lines 2–3 show the reference trap: looking up a **new** array \`['a', 'e', 't']\` returns \`undefined\` even though an array with the same contents is in the map. That is why the key must be a string. A count key works the same way — join the 26 counts into a string with separators (\`counts.join('#')\`), not use the array itself.

## 6. Verified: Running the Code

Both examples were saved as \`main.js\` and run with \`node main.js\` (Node v22). Example 1 — the sample input and five edge cases (empty string, one word, more groups, same letters with different counts, empty array):

~~~text
[["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]
[[""]]
[["a"]]
[["abc", "bca", "cab"], ["q"], ["xyz", "zyx"]]
[["aab"], ["ab", "ba"], ["abb", "bab"]]
[]
~~~

Example 2 — the sorted key and the count key side by side on 11 words:

~~~text
eat: sorted_key=aet count_key=a1e1t1
tea: sorted_key=aet count_key=a1e1t1
listen: sorted_key=eilnst count_key=e1i1l1n1s1t1
google: sorted_key=eggloo count_key=e1g2l1o2
banana: sorted_key=aaabnn count_key=a3b1n2
groups: 6, same=true
largest group: ate eat tea
~~~

\`same=true\` confirms both keys produce identical groups (compared with \`JSON.stringify\`, because \`===\` on two arrays compares references). The count key \`e1g2l1o2\` for "google" shows why it needs letters between the numbers.

## 7. Complexity

n = number of words, k = length of the longest word.

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Pairwise comparison | O(n² · k) | O(n · k) | Every pair compared with an O(k) anagram check |
| Sorted key | O(n · k log k) | O(n · k) | \`split\` + \`sort\` + \`join\` per word; keys and output hold every character |
| Count key (26 counts) | O(n · (k + 26)) = O(n · k) | O(n · k) | One counting pass per word plus a 26-slot key string |

\`Map\` operations are O(1) on average, plus O(k) to hash a key string of length k. More background: [the time complexity of common operations](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance).

## Edge Cases

- **Empty input list** — returns no groups: \`[]\`.
- **A single empty string** (\`[""]\`) — one group containing \`""\`; the empty string's key is the empty string, which is a valid map key.
- **One word** — one group of one.
- **No anagrams at all** — n groups of one word each.
- **Same letters, different counts** (\`"ab"\`, \`"abb"\`, \`"aab"\`) — three different groups. The count key handles this because counts are in the key; a "set of letters" key would wrongly merge them. Example 1 checks this case.
- **Duplicate words** (\`["a", "a"]\`) — both copies land in the same group; nothing is de-duplicated unless asked.

## Common Pitfalls

- **Using an array as the \`Map\` key** — compared by reference, so every word gets its own group (the run above shows \`get\` returning \`undefined\`). Join it into a string.
- **Using a plain object with a count array as the key** — \`obj[counts]\` converts the array to \`"1,0,0,..."\` via \`toString\`, which happens to work, but it is implicit and easy to break; build the string key explicitly.
- **Building a count key without separators** — \`[1, 11]\` and \`[11, 1]\` both become \`"111"\`. Use \`counts.join('#')\` or letter-count pairs as in example 2.
- **Sorting the group arrays in place when you meant to keep them** — \`.sort()\` mutates; copy first with \`[...g]\`.
- **Comparing results with \`===\`** — arrays are compared by reference; compare serialised forms or element by element.
- **Splitting with \`split('')\` on Unicode input** — emoji become two surrogate halves; use \`[...w].sort().join('')\` to sort code points.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">I give each word a key that all its anagrams share — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w.split('').sort().join('')</code> — and push the word into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from key to array; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>'s values are the groups.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">Two words are anagrams exactly when their sorted letters are equal, so the map puts exactly the anagrams together, in one pass.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n · k log k) time for n words of length up to k and O(n · k) space; pairwise comparison would be O(n² · k).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The optimisation:</strong> <span style="color:#f0e2c8;">For lowercase <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>–<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">z</code>, a 26-count key built as a string with separators is O(k) per word, so O(n · k) total.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript detail:</strong> <span style="color:#f0e2c8;">The key must be a string — an array key is compared by reference and never matches — and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> keeps insertion order, so groups come out in first-seen order.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not use the sorted character array as the key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> compares arrays by identity. A new array with the same letters is a different key, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> (shown in the run above) and every word would start its own group.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use a plain object instead of a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — with string keys, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">groups[key] = groups[key] || []</code> works and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.values(groups)</code> returns the groups. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> is cleaner: no inherited keys, a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code>, and documented insertion-order iteration for every key type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does the count key beat the sorted key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For long words: O(k) vs O(k log k). For short words the 26-slot overhead dominates, so I would implement the sorted key first and offer the count key as the optimisation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make the output deterministic for a test?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Copy and sort each group, then sort the groups by first word, as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">canonical</code> does. Remember <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.sort()</code> mutates, so copy with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...g]</code> if the original matters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for Unicode input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The count key no longer applies; for the sorted key, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...w].sort().join('')</code> so emoji are not split into surrogate halves, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w.normalize('NFC')</code> so composed and decomposed accents share a key.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Canonical form (canonical key)** | One standard representative shared by all anagrams, e.g. sorted letters |
| **Bucketing** | Grouping items by a computed key in a hash map |
| **Equivalence class** | A set of items that are all "equal" under a rule |
| **Reference equality (for keys)** | Objects and arrays as \`Map\` keys match only the very same object |

---
**Conclusion:** Group anagrams by giving every word a canonical key that all its anagrams share and bucketing in a \`Map\` in one pass. The sorted-letters key (\`split('').sort().join('')\`) costs O(k log k) per word; the 26-count key costs O(k) and needs a fixed alphabet and separators. The JavaScript details are that the key must be a **string** — arrays are compared by reference and never match — and that a \`Map\` returns the groups in first-seen order. The building block is [the two-string anagram check](/interview-question/how-do-you-check-if-two-strings-are-anagrams), and the bucket-by-count idea continues in [top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements).`,
        examples: [
          {
            label: "Group anagrams with a sorted-string key on six inputs",
            code: `function groupAnagrams(words) {
  const groups = new Map();                       // key -> array of words with that key
  for (const w of words) {
    const key = w.split('').sort().join('');      // "eat", "tea", "ate" all become "aet"
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(w);
  }
  return [...groups.values()];
}

function canonical(groups) {
  // Sort inside each group, then sort the groups by their first word, so output order is fixed.
  const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  return groups.map((g) => [...g].sort(byCodeUnit)).sort((g, h) => byCodeUnit(g[0], h[0]));
}

function fmt(groups) {
  return '[' + groups.map((g) => '[' + g.map((w) => '"' + w + '"').join(', ') + ']').join(', ') + ']';
}

console.log(fmt(canonical(groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat']))));  // [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]
console.log(fmt(canonical(groupAnagrams(['']))));  // [[""]]
console.log(fmt(canonical(groupAnagrams(['a']))));  // [["a"]]
console.log(fmt(canonical(groupAnagrams(['abc', 'bca', 'xyz', 'zyx', 'q', 'cab']))));  // [["abc", "bca", "cab"], ["q"], ["xyz", "zyx"]]
console.log(fmt(canonical(groupAnagrams(['ab', 'ba', 'abb', 'bab', 'aab']))));  // [["aab"], ["ab", "ba"], ["abb", "bab"]]
console.log(fmt(canonical(groupAnagrams([]))));  // []`,
          },
          {
            label: "Sorted key vs letter-count key: same groups, different cost",
            code: `// Two ways to build the group key. Both must produce the same groups.

function sortedKey(w) {
  return w.split('').sort().join('');             // O(k log k) per word
}

function countKey(w) {
  const counts = new Array(26).fill(0);           // O(k + 26) per word, lowercase a-z only
  for (let i = 0; i < w.length; i++) counts[w.charCodeAt(i) - 97]++;
  let key = '';
  for (let i = 0; i < 26; i++) {
    if (counts[i] > 0) key += String.fromCharCode(97 + i) + counts[i];
  }
  return key;
}

function group(words, keyFn) {
  const groups = new Map();
  for (const w of words) {
    const k = keyFn(w);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(w);
  }
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  return [...groups.values()].map((g) => [...g].sort(cmp)).sort((g, h) => cmp(g[0], h[0]));
}

const words = ['eat', 'tea', 'tan', 'ate', 'nat', 'bat', 'listen', 'silent', 'enlist', 'google', 'banana'];
for (const w of ['eat', 'tea', 'listen', 'google', 'banana']) {
  console.log(w + ': sorted_key=' + sortedKey(w) + ' count_key=' + countKey(w));
}
const a = group(words, sortedKey);
const b = group(words, countKey);
console.log('groups: ' + a.length + ', same=' + (JSON.stringify(a) === JSON.stringify(b)));
let largest = a[0];
for (const g of a) if (g.length > largest.length) largest = g;
console.log('largest group: ' + largest.join(' '));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given a \`String[]\`, group the anagrams together and return a \`List<List<String>>\` in any order — for example \`{"eat", "tea", "tan", "ate", "nat", "bat"}\` becomes \`[[eat, tea, ate], [tan, nat], [bat]]\`. Please implement it in Java and explain the complexity."

**What a strong answer should cover:**
- A canonical key shared by all anagrams and a \`HashMap<String, List<String>>\` from key to words, built in one pass.
- Two keys: sorted letters (\`toCharArray\`, \`Arrays.sort\`, \`new String(chars)\`), O(k log k) per word, and a 26-count key from an \`int[26]\`, O(k) per word.
- O(n · k log k) or O(n · k) time and O(n · k) space; pairwise comparison is O(n² · k).
- Java specifics: a \`char[]\` or \`int[]\` cannot be the key because arrays use identity \`equals\`/\`hashCode\` — convert to a \`String\`; \`computeIfAbsent(key, k -> new ArrayList<>())\`; \`HashMap\` iteration order is not something to rely on.
- Edge cases: empty array, empty string, same letters with different counts.

**Clarifying questions expected:**
- Only lowercase \`a\`–\`z\`? Does the output order matter?

**Code / implementation expected:** Yes — \`List<List<String>> groupAnagrams(String[] words)\` in Java with a \`HashMap\`, run on the sample and edge cases.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Java arrays, strings and collections (\`List\`, \`Map\`); nothing else assumed.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by compiling and running the code (\`javac\` and \`java\`, JDK 21); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

A post office receives a sack of letters with scrambled addresses — "eat", "tea", "ate", "tan", "nat", "bat". The rule is: letters whose addresses use exactly the same letters go to the same house. How do you sort the sack?

The slow way: take a letter, compare it with every other letter in the sack, pull out the matches, and repeat. That is a comparison for every pair of letters.

The smart way: give each letter a **label** that is the same for all its anagrams, and put it in the pigeonhole with that label. A simple label is "the address with its letters in alphabetical order": "eat", "tea" and "ate" are all labelled \`aet\`; "tan" and "nat" are \`ant\`; "bat" is \`abt\`. You look at each letter **once**, compute its label, and drop it in the right pigeonhole. When the sack is empty, each pigeonhole is a group.

The pigeonholes are a hash map, and the label is a **canonical key**. This is the step up from [checking whether two strings are anagrams](/interview-question/how-do-you-check-if-two-strings-are-anagrams): instead of comparing strings with each other, you turn each string into a key that equal strings share. The same trick — "compute a signature, bucket by it" — is how you group anything by an equivalence (shifted strings, isomorphic patterns, points on the same line).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the words only lowercase \`a\`–\`z\`? | Allows the 26-count key (O(k) per word instead of O(k log k)). Otherwise use the sorted key. |
| Does the order of groups, or of words inside a group, matter? | Usually "any order". If not, you must sort, and hash-map iteration order becomes a real issue. |
| Can the list contain duplicates or empty strings? | \`["", ""]\` is one group of two empty strings; duplicates stay in the same group. |
| How many words, and how long is the longest? | Decides whether the \`log k\` of the sorted key matters. With n = 10^4 words of length ≤ 100 either key is fine. |
| Should case or spaces be ignored? | Normalise each word before computing its key — but keep the original word in the group. |

## 3. The Core Idea

Two words belong in the same group exactly when they are anagrams. So you need a function \`key(word)\` with one property: **\`key(a) == key(b)\` if and only if \`a\` and \`b\` are anagrams**. Then a hash map from key to a list of words does all the grouping in a single pass.

📌 **Interview term: Canonical form (canonical key)** — one standard representative that every member of an equivalence class maps to. For anagrams, the sorted letters (\`"tea"\` → \`"aet"\`) or the letter counts (\`a1e1t1\`) are both canonical.

📌 **Interview term: Bucketing** — putting items into groups by a computed key using a hash map, instead of comparing items with each other. Grouping becomes O(n × cost of one key).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Six words eat tea tan ate nat bat each map to a sorted key. eat tea and ate map to aet, tan and nat map to ant, bat maps to abt. Each key is a bucket holding its words">
  <defs>
    <marker id="ga05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="90" y="24" text-anchor="middle">word</text>
  <text class="d-text" x="330" y="24" text-anchor="middle">key = sorted letters</text>
  <text class="d-text" x="570" y="24" text-anchor="middle">bucket</text>
  <rect class="d-box" x="40" y="40" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="60" text-anchor="middle">eat</text>
  <rect class="d-box" x="40" y="80" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="100" text-anchor="middle">tea</text>
  <rect class="d-box" x="40" y="120" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="140" text-anchor="middle">ate</text>
  <rect class="d-box" x="40" y="170" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="190" text-anchor="middle">tan</text>
  <rect class="d-box" x="40" y="210" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="230" text-anchor="middle">nat</text>
  <rect class="d-box" x="40" y="258" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="278" text-anchor="middle">bat</text>
  <path class="d-edge" d="M 144 55 L 274 90" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 95 L 274 95" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 135 L 274 100" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 185 L 274 205" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 225 L 274 210" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 273 L 274 273" marker-end="url(#ga05-arrow)"/>
  <rect class="d-box-muted" x="280" y="78" width="100" height="36" rx="6"/>
  <text class="d-text" x="330" y="101" text-anchor="middle">aet</text>
  <rect class="d-box-muted" x="280" y="190" width="100" height="36" rx="6"/>
  <text class="d-text" x="330" y="213" text-anchor="middle">ant</text>
  <rect class="d-box-muted" x="280" y="256" width="100" height="36" rx="6"/>
  <text class="d-text" x="330" y="279" text-anchor="middle">abt</text>
  <path class="d-edge-accent" d="M 384 96 L 464 96" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge-accent" d="M 384 208 L 464 208" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge-accent" d="M 384 274 L 464 274" marker-end="url(#ga05-arrow)"/>
  <rect class="d-box-accent" x="470" y="78" width="190" height="36" rx="6"/>
  <text class="d-text d-accent" x="565" y="101" text-anchor="middle">eat, tea, ate</text>
  <rect class="d-box-accent" x="470" y="190" width="190" height="36" rx="6"/>
  <text class="d-text d-accent" x="565" y="213" text-anchor="middle">tan, nat</text>
  <rect class="d-box-accent" x="470" y="256" width="190" height="36" rx="6"/>
  <text class="d-text d-accent" x="565" y="279" text-anchor="middle">bat</text>
</svg>

Each word is read once and its key computed once; the map does the matching. Inside a bucket, words keep the order in which they arrived — \`eat, tea, ate\`.

### Two choices of key

<svg class="iq-diagram" width="100%" viewBox="0 0 680 190" role="img" aria-label="Two keys for the word banana. Sorting gives aaabnn in k log k time. Counting letters gives a3b1n2 in k plus 26 time. Both keys are equal for every anagram of banana">
  <defs>
    <marker id="ga05-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="70" width="140" height="50" rx="8"/>
  <text class="d-text" x="100" y="100" text-anchor="middle">banana</text>
  <path class="d-edge" d="M 174 85 L 300 46" marker-end="url(#ga05-arrow2)"/>
  <path class="d-edge" d="M 174 105 L 300 144" marker-end="url(#ga05-arrow2)"/>
  <rect class="d-box-muted" x="306" y="20" width="160" height="50" rx="8"/>
  <text class="d-text" x="386" y="50" text-anchor="middle">aaabnn</text>
  <rect class="d-box-muted" x="306" y="120" width="160" height="50" rx="8"/>
  <text class="d-text" x="386" y="150" text-anchor="middle">a3b1n2</text>
  <rect class="d-box" x="510" y="20" width="150" height="50" rx="8"/>
  <text class="d-sub" x="585" y="42" text-anchor="middle">sorted key</text>
  <text class="d-sub" x="585" y="60" text-anchor="middle">O(k log k)</text>
  <rect class="d-box-accent" x="510" y="120" width="150" height="50" rx="8"/>
  <text class="d-sub" x="585" y="142" text-anchor="middle">count key</text>
  <text class="d-sub" x="585" y="160" text-anchor="middle">O(k + 26)</text>
</svg>

Both keys for "banana" are exactly what example 2 prints. The count key needs a **separator-safe** encoding: writing the 26 counts with a letter (or a \`#\`) between them, because plain concatenation of counts is ambiguous — counts \`1, 11\` and \`11, 1\` would both become \`111\`.

## 4. From Brute Force to One Pass

📌 **Interview term: Equivalence class** — a set of items that are all "equal" under some rule (here: being anagrams of each other). Grouping anagrams means partitioning the input into equivalence classes.

**Brute force.** For each word not yet placed, compare it with every remaining word using an [anagram check](/interview-question/how-do-you-check-if-two-strings-are-anagrams). That is O(n²) comparisons of O(k) each: **O(n² · k)**. For 10,000 words that is about 50 million comparisons.

**Sorted key + hash map.** For each word, sort its letters to get the key and append the word to \`groups[key]\`. Sorting a word of length k is O(k log k), so the total is **O(n · k log k)** time and O(n · k) space for the keys and the output.

**Count key + hash map.** Count the 26 letters (O(k)) and encode the counts as the key (O(26)). Total **O(n · (k + 26))**, which is O(n · k) — asymptotically better than sorting when words are long. It requires a known, small alphabet.

| Approach | Time | Space | When |
| :--- | :--- | :--- | :--- |
| Pairwise comparison | O(n² · k) | O(n · k) | Never in an interview, except as the starting point |
| Sorted key | O(n · k log k) | O(n · k) | The default; works for any characters |
| Count key | O(n · k) | O(n · k) | Lowercase \`a\`–\`z\` and long words |

For short words the difference is small: the \`log k\` factor for a 5-letter word is tiny, while the count key always pays for 26 slots. (That is a reasoning point, not a benchmark — measure if it matters.) Mention both, implement the sorted key, and offer the count key as the optimisation.

**Why the hash map, not sorting the whole list?** You could sort the words by their key and then cut the sorted list into runs of equal keys. That works in O(n log n · k) but is more code and slower than one pass with a map. The map is the standard answer; the idea is the same one used in [How does a hash table work?](/interview-question/how-does-a-hash-table-work)

## 5. The Code in Java

~~~java
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Main {
    static List<List<String>> groupAnagrams(String[] words) {
        Map<String, List<String>> groups = new HashMap<>();     // key -> words with that key
        for (String w : words) {
            char[] cs = w.toCharArray();
            Arrays.sort(cs);
            String key = new String(cs);                         // "eat", "tea", "ate" -> "aet"
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(w);
        }
        return new ArrayList<>(groups.values());
    }

    // Sort inside each group, then sort the groups by their first word, so output order is fixed.
    static List<List<String>> canonical(List<List<String>> groups) {
        for (List<String> g : groups) Collections.sort(g);
        groups.sort((g, h) -> g.get(0).compareTo(h.get(0)));
        return groups;
    }

    static String fmt(List<List<String>> groups) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < groups.size(); i++) {
            if (i > 0) sb.append(", ");
            sb.append("[");
            List<String> g = groups.get(i);
            for (int j = 0; j < g.size(); j++) {
                if (j > 0) sb.append(", ");
                sb.append('"').append(g.get(j)).append('"');
            }
            sb.append("]");
        }
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        System.out.println(fmt(canonical(groupAnagrams(new String[]{"eat", "tea", "tan", "ate", "nat", "bat"}))));
        System.out.println(fmt(canonical(groupAnagrams(new String[]{""}))));
        System.out.println(fmt(canonical(groupAnagrams(new String[]{"a"}))));
        System.out.println(fmt(canonical(groupAnagrams(new String[]{"abc", "bca", "xyz", "zyx", "q", "cab"}))));
        System.out.println(fmt(canonical(groupAnagrams(new String[]{"ab", "ba", "abb", "bab", "aab"}))));
        System.out.println(fmt(canonical(groupAnagrams(new String[]{}))));
    }
}
~~~

- **\`w.toCharArray()\` + \`Arrays.sort(cs)\` + \`new String(cs)\`** — \`String\` is immutable, so you sort a \`char[]\` copy and build a new \`String\` from it. That \`String\` is the key.
- **\`groups.computeIfAbsent(key, k -> new ArrayList<>()).add(w)\`** — returns the existing list for \`key\`, or creates, stores and returns a new one. One call replaces the \`if (!containsKey) put(...)\` dance.
- **\`new ArrayList<>(groups.values())\`** — \`values()\` is a live view of the map; copying it gives an independent \`List\` the caller can modify.
- **\`canonical\` and \`fmt\`** only fix the printed order so the output matches the other three language versions. A real solution returns \`new ArrayList<>(groups.values())\` directly, in whatever order the \`HashMap\` iterates — which you should treat as arbitrary: the \`HashMap\` documentation says the class makes no guarantees as to the order of the map, nor that the order stays constant over time ([Java 17 HashMap docs](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HashMap.html)).

📌 **Interview term: Identity equality (arrays as keys)** — Java arrays do not override \`equals\` and \`hashCode\`, so two arrays with the same contents are different keys. A \`String\` (or a \`List\`) compares by content. Checked by running it:

~~~java
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        Map<char[], String> byArray = new HashMap<>();
        char[] k1 = "eat".toCharArray();
        Arrays.sort(k1);
        byArray.put(k1, "eat");
        char[] k2 = "tea".toCharArray();
        Arrays.sort(k2);                                  // same contents: a, e, t
        System.out.println(byArray.get(k2));              // arrays use identity equals/hashCode
        Map<String, String> byString = new HashMap<>();
        byString.put(new String(k1), "eat");
        System.out.println(byString.get(new String(k2))); // String compares by content
    }
}
~~~

~~~text
null
eat
~~~

\`get\` with a second sorted array holding the same letters returned \`null\`. Converting to \`String\` fixed it. For the count key, the same rule applies: do not key by the \`int[26]\`; build a \`String\` from it (example 2 uses letter-count pairs like \`a1e1t1\`), or use \`Arrays.toString(counts)\`, which produces an unambiguous \`"[1, 0, 0, ...]"\`.

## 6. Verified: Running the Code

Both examples were saved as \`Main.java\` and run with \`javac Main.java && java Main\` (JDK 21). Example 1 — the sample input and five edge cases (empty string, one word, more groups, same letters with different counts, empty array):

~~~text
[["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]
[[""]]
[["a"]]
[["abc", "bca", "cab"], ["q"], ["xyz", "zyx"]]
[["aab"], ["ab", "ba"], ["abb", "bab"]]
[]
~~~

Example 2 — the sorted key and the count key side by side on 11 words:

~~~text
eat: sorted_key=aet count_key=a1e1t1
tea: sorted_key=aet count_key=a1e1t1
listen: sorted_key=eilnst count_key=e1i1l1n1s1t1
google: sorted_key=eggloo count_key=e1g2l1o2
banana: sorted_key=aaabnn count_key=a3b1n2
groups: 6, same=true
largest group: ate eat tea
~~~

\`same=true\` comes from \`a.equals(b)\`: \`List.equals\` compares element by element (and \`ArrayList\` of \`String\` compares the strings by content), unlike arrays. \`Main::sortedKey\` and \`Main::countKey\` are method references passed as a \`Function<String, String>\`, so one \`group\` method works with either key.

## 7. Complexity

n = number of words, k = length of the longest word.

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Pairwise comparison | O(n² · k) | O(n · k) | Every pair compared with an O(k) anagram check |
| Sorted key | O(n · k log k) | O(n · k) | \`Arrays.sort\` on a \`char[]\` per word; keys and output hold every character |
| Count key (\`int[26]\`) | O(n · (k + 26)) = O(n · k) | O(n · k) | One counting pass per word plus a short key string |

\`HashMap\` operations are O(1) on average, plus O(k) to hash a key \`String\` the first time (\`String\` caches its hash code after that). More background: [the time complexity of common operations](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance).

## Edge Cases

- **Empty input list** — returns no groups: \`[]\`.
- **A single empty string** (\`[""]\`) — one group containing \`""\`; the empty string's key is the empty string, which is a valid map key.
- **One word** — one group of one.
- **No anagrams at all** — n groups of one word each.
- **Same letters, different counts** (\`"ab"\`, \`"abb"\`, \`"aab"\`) — three different groups. The count key handles this because counts are in the key; a "set of letters" key would wrongly merge them. Example 1 checks this case.
- **Duplicate words** (\`["a", "a"]\`) — both copies land in the same group; nothing is de-duplicated unless asked.

## Common Pitfalls

- **Using \`char[]\` or \`int[]\` as the key** — identity equality, so every word gets its own group; the run above shows \`get\` returning \`null\`. Convert to a \`String\`.
- **\`cs.toString()\` instead of \`new String(cs)\`** — \`toString()\` on an array returns something like \`[C@1b6d3586\` (type plus identity hash), not the letters, so every key is unique.
- **Building a count key by concatenating numbers without separators** — counts \`1, 11\` and \`11, 1\` both give \`"111"\`. Use letter-count pairs or \`Arrays.toString(counts)\`.
- **Relying on \`HashMap\` iteration order** in tests — sort the output, or use a \`LinkedHashMap\` if insertion order is required.
- **Returning \`groups.values()\` directly** when the signature is \`List<List<String>>\` — it is a \`Collection\`, not a \`List\`; wrap it in \`new ArrayList<>(...)\`.
- **Comparing keys with \`==\`** anywhere in a hand-written variant — \`String\` content needs \`equals\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">For each word I sort a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char[]</code> copy, turn it into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">String</code> key with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new String(cs)</code>, and add the word to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">groups.computeIfAbsent(key, k -&gt; new ArrayList&lt;&gt;())</code>; the map's values are the groups.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">Two words are anagrams exactly when their sorted letters are equal, so equal keys means same group, and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> matches them in one pass.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n · k log k) time for n words of length up to k, and O(n · k) space; pairwise comparison would be O(n² · k).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The optimisation:</strong> <span style="color:#f0e2c8;">For lowercase <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>–<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">z</code>, I count into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[26]</code> and build a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">String</code> key such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a1e1t1</code>, O(k) per word, so O(n · k).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Java detail:</strong> <span style="color:#f0e2c8;">Arrays cannot be keys because they use identity <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hashCode</code>, so I always convert to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">String</code>; and I never rely on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> iteration order.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not use the sorted <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">char[]</code> as the key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Arrays inherit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hashCode</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object</code>, which compare identity. A second array with the same letters is a different key, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>, as in the run above.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">new String(cs)</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">cs.toString()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new String(cs)</code> builds a string from the characters. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cs.toString()</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.toString</code>: the type code plus an identity hash, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[C@1b6d3586</code>, so every key would be unique.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return groups in first-seen order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LinkedHashMap</code> instead of a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code>; it keeps insertion order. The complexity is unchanged.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it with streams?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.stream(words).collect(Collectors.groupingBy(Main::sortedKey))</code> returns a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map&lt;String, List&lt;String&gt;&gt;</code>; wrap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">values()</code> in a new <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code>. Same complexity, less code, but I would write the loop first in an interview.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is the count key better?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For long words: O(k) beats O(k log k). For short words the 26-slot loop and the string building dominate, so I would start with the sorted key and offer the count key as the optimisation.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Canonical form (canonical key)** | One standard representative shared by all anagrams, e.g. sorted letters |
| **Bucketing** | Grouping items by a computed key in a hash map |
| **Equivalence class** | A set of items that are all "equal" under a rule |
| **Identity equality (arrays as keys)** | Arrays compare by reference in Java, so they cannot be content-based keys |

---
**Conclusion:** Group anagrams by giving every word a canonical key that all its anagrams share and bucketing in a \`HashMap<String, List<String>>\` with \`computeIfAbsent\`, in one pass. The sorted-letters key costs O(k log k) per word; the \`int[26]\` count key costs O(k) once turned into an unambiguous \`String\`. The Java details to say aloud are that arrays cannot be map keys (identity equality — convert to \`String\`), that \`new String(chars)\` is not \`chars.toString()\`, and that \`HashMap\` order is arbitrary. The building block is [the two-string anagram check](/interview-question/how-do-you-check-if-two-strings-are-anagrams), and the bucket-by-count idea continues in [top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements).`,
        examples: [
          {
            label: "Group anagrams with a sorted-string key on six inputs",
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Main {
    static List<List<String>> groupAnagrams(String[] words) {
        Map<String, List<String>> groups = new HashMap<>();     // key -> words with that key
        for (String w : words) {
            char[] cs = w.toCharArray();
            Arrays.sort(cs);
            String key = new String(cs);                         // "eat", "tea", "ate" -> "aet"
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(w);
        }
        return new ArrayList<>(groups.values());
    }

    // Sort inside each group, then sort the groups by their first word, so output order is fixed.
    static List<List<String>> canonical(List<List<String>> groups) {
        for (List<String> g : groups) Collections.sort(g);
        groups.sort((g, h) -> g.get(0).compareTo(h.get(0)));
        return groups;
    }

    static String fmt(List<List<String>> groups) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < groups.size(); i++) {
            if (i > 0) sb.append(", ");
            sb.append("[");
            List<String> g = groups.get(i);
            for (int j = 0; j < g.size(); j++) {
                if (j > 0) sb.append(", ");
                sb.append('"').append(g.get(j)).append('"');
            }
            sb.append("]");
        }
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        System.out.println(fmt(canonical(groupAnagrams(new String[]{"eat", "tea", "tan", "ate", "nat", "bat"}))));
        System.out.println(fmt(canonical(groupAnagrams(new String[]{""}))));
        System.out.println(fmt(canonical(groupAnagrams(new String[]{"a"}))));
        System.out.println(fmt(canonical(groupAnagrams(new String[]{"abc", "bca", "xyz", "zyx", "q", "cab"}))));
        System.out.println(fmt(canonical(groupAnagrams(new String[]{"ab", "ba", "abb", "bab", "aab"}))));
        System.out.println(fmt(canonical(groupAnagrams(new String[]{}))));
    }
}`,
          },
          {
            label: "Sorted key vs letter-count key: same groups, different cost",
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

public class Main {
    // Two ways to build the group key. Both must produce the same groups.

    static String sortedKey(String w) {                       // O(k log k) per word
        char[] cs = w.toCharArray();
        Arrays.sort(cs);
        return new String(cs);
    }

    static String countKey(String w) {                        // O(k + 26) per word, a-z only
        int[] counts = new int[26];
        for (int i = 0; i < w.length(); i++) counts[w.charAt(i) - 'a']++;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 26; i++) {
            if (counts[i] > 0) sb.append((char) ('a' + i)).append(counts[i]);
        }
        return sb.toString();
    }

    static List<List<String>> group(String[] words, Function<String, String> keyFn) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String w : words) groups.computeIfAbsent(keyFn.apply(w), k -> new ArrayList<>()).add(w);
        List<List<String>> out = new ArrayList<>(groups.values());
        for (List<String> g : out) Collections.sort(g);
        out.sort((g, h) -> g.get(0).compareTo(h.get(0)));
        return out;
    }

    public static void main(String[] args) {
        String[] words = {"eat", "tea", "tan", "ate", "nat", "bat", "listen", "silent", "enlist", "google", "banana"};
        for (String w : new String[]{"eat", "tea", "listen", "google", "banana"}) {
            System.out.println(w + ": sorted_key=" + sortedKey(w) + " count_key=" + countKey(w));
        }
        List<List<String>> a = group(words, Main::sortedKey);
        List<List<String>> b = group(words, Main::countKey);
        System.out.println("groups: " + a.size() + ", same=" + a.equals(b));   // List.equals compares contents
        List<String> largest = a.get(0);
        for (List<String> g : a) if (g.size() > largest.size()) largest = g;
        System.out.println("largest group: " + String.join(" ", largest));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a \`std::vector<std::string>\`, group the anagrams together and return a \`vector<vector<string>>\` in any order — for example \`{"eat", "tea", "tan", "ate", "nat", "bat"}\` becomes \`{{"eat", "tea", "ate"}, {"tan", "nat"}, {"bat"}}\`. Please write it in C++ and explain the complexity."

**What a strong answer should cover:**
- A canonical key shared by all anagrams and an \`unordered_map<string, vector<string>>\` from key to words, built in one pass.
- Two keys: sorted letters (\`std::sort\` on a copy), O(k log k) per word, and a 26-count key, O(k) per word.
- O(n · k log k) or O(n · k) time and O(n · k) space; pairwise comparison is O(n² · k).
- C++ specifics: \`groups[key].push_back(w)\` relies on \`operator[]\` creating an empty vector; \`std::hash\` has no specialisation for \`std::array\`, so an \`array<int, 26>\` key needs a custom hash or a \`std::map\`; \`std::move\` the groups out instead of copying; \`unordered_map\` iteration order is unspecified.
- Edge cases: empty input, empty string, same letters with different counts.

**Clarifying questions expected:**
- Only lowercase \`a\`–\`z\`? Does the output order matter?

**Code / implementation expected:** Yes — \`vector<vector<string>> groupAnagrams(const vector<string>&)\` in C++17 using \`unordered_map\`, run on the sample and edge cases.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know basic C++ (\`std::string\`, \`std::vector\`, loops); nothing else assumed.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by compiling and running the code with \`g++ -std=c++17\` (GCC 13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

A post office receives a sack of letters with scrambled addresses — "eat", "tea", "ate", "tan", "nat", "bat". The rule is: letters whose addresses use exactly the same letters go to the same house. How do you sort the sack?

The slow way: take a letter, compare it with every other letter in the sack, pull out the matches, and repeat. That is a comparison for every pair of letters.

The smart way: give each letter a **label** that is the same for all its anagrams, and put it in the pigeonhole with that label. A simple label is "the address with its letters in alphabetical order": "eat", "tea" and "ate" are all labelled \`aet\`; "tan" and "nat" are \`ant\`; "bat" is \`abt\`. You look at each letter **once**, compute its label, and drop it in the right pigeonhole. When the sack is empty, each pigeonhole is a group.

The pigeonholes are a hash map, and the label is a **canonical key**. This is the step up from [checking whether two strings are anagrams](/interview-question/how-do-you-check-if-two-strings-are-anagrams): instead of comparing strings with each other, you turn each string into a key that equal strings share. The same trick — "compute a signature, bucket by it" — is how you group anything by an equivalence (shifted strings, isomorphic patterns, points on the same line).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the words only lowercase \`a\`–\`z\`? | Allows the 26-count key (O(k) per word instead of O(k log k)). Otherwise use the sorted key. |
| Does the order of groups, or of words inside a group, matter? | Usually "any order". If not, you must sort, and hash-map iteration order becomes a real issue. |
| Can the list contain duplicates or empty strings? | \`["", ""]\` is one group of two empty strings; duplicates stay in the same group. |
| How many words, and how long is the longest? | Decides whether the \`log k\` of the sorted key matters. With n = 10^4 words of length ≤ 100 either key is fine. |
| Should case or spaces be ignored? | Normalise each word before computing its key — but keep the original word in the group. |

## 3. The Core Idea

Two words belong in the same group exactly when they are anagrams. So you need a function \`key(word)\` with one property: **\`key(a) == key(b)\` if and only if \`a\` and \`b\` are anagrams**. Then a hash map from key to a list of words does all the grouping in a single pass.

📌 **Interview term: Canonical form (canonical key)** — one standard representative that every member of an equivalence class maps to. For anagrams, the sorted letters (\`"tea"\` → \`"aet"\`) or the letter counts (\`a1e1t1\`) are both canonical.

📌 **Interview term: Bucketing** — putting items into groups by a computed key using a hash map, instead of comparing items with each other. Grouping becomes O(n × cost of one key).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Six words eat tea tan ate nat bat each map to a sorted key. eat tea and ate map to aet, tan and nat map to ant, bat maps to abt. Each key is a bucket holding its words">
  <defs>
    <marker id="ga05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="90" y="24" text-anchor="middle">word</text>
  <text class="d-text" x="330" y="24" text-anchor="middle">key = sorted letters</text>
  <text class="d-text" x="570" y="24" text-anchor="middle">bucket</text>
  <rect class="d-box" x="40" y="40" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="60" text-anchor="middle">eat</text>
  <rect class="d-box" x="40" y="80" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="100" text-anchor="middle">tea</text>
  <rect class="d-box" x="40" y="120" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="140" text-anchor="middle">ate</text>
  <rect class="d-box" x="40" y="170" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="190" text-anchor="middle">tan</text>
  <rect class="d-box" x="40" y="210" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="230" text-anchor="middle">nat</text>
  <rect class="d-box" x="40" y="258" width="100" height="30" rx="6"/>
  <text class="d-text" x="90" y="278" text-anchor="middle">bat</text>
  <path class="d-edge" d="M 144 55 L 274 90" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 95 L 274 95" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 135 L 274 100" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 185 L 274 205" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 225 L 274 210" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge" d="M 144 273 L 274 273" marker-end="url(#ga05-arrow)"/>
  <rect class="d-box-muted" x="280" y="78" width="100" height="36" rx="6"/>
  <text class="d-text" x="330" y="101" text-anchor="middle">aet</text>
  <rect class="d-box-muted" x="280" y="190" width="100" height="36" rx="6"/>
  <text class="d-text" x="330" y="213" text-anchor="middle">ant</text>
  <rect class="d-box-muted" x="280" y="256" width="100" height="36" rx="6"/>
  <text class="d-text" x="330" y="279" text-anchor="middle">abt</text>
  <path class="d-edge-accent" d="M 384 96 L 464 96" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge-accent" d="M 384 208 L 464 208" marker-end="url(#ga05-arrow)"/>
  <path class="d-edge-accent" d="M 384 274 L 464 274" marker-end="url(#ga05-arrow)"/>
  <rect class="d-box-accent" x="470" y="78" width="190" height="36" rx="6"/>
  <text class="d-text d-accent" x="565" y="101" text-anchor="middle">eat, tea, ate</text>
  <rect class="d-box-accent" x="470" y="190" width="190" height="36" rx="6"/>
  <text class="d-text d-accent" x="565" y="213" text-anchor="middle">tan, nat</text>
  <rect class="d-box-accent" x="470" y="256" width="190" height="36" rx="6"/>
  <text class="d-text d-accent" x="565" y="279" text-anchor="middle">bat</text>
</svg>

Each word is read once and its key computed once; the map does the matching. Inside a bucket, words keep the order in which they arrived — \`eat, tea, ate\`.

### Two choices of key

<svg class="iq-diagram" width="100%" viewBox="0 0 680 190" role="img" aria-label="Two keys for the word banana. Sorting gives aaabnn in k log k time. Counting letters gives a3b1n2 in k plus 26 time. Both keys are equal for every anagram of banana">
  <defs>
    <marker id="ga05-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="70" width="140" height="50" rx="8"/>
  <text class="d-text" x="100" y="100" text-anchor="middle">banana</text>
  <path class="d-edge" d="M 174 85 L 300 46" marker-end="url(#ga05-arrow2)"/>
  <path class="d-edge" d="M 174 105 L 300 144" marker-end="url(#ga05-arrow2)"/>
  <rect class="d-box-muted" x="306" y="20" width="160" height="50" rx="8"/>
  <text class="d-text" x="386" y="50" text-anchor="middle">aaabnn</text>
  <rect class="d-box-muted" x="306" y="120" width="160" height="50" rx="8"/>
  <text class="d-text" x="386" y="150" text-anchor="middle">a3b1n2</text>
  <rect class="d-box" x="510" y="20" width="150" height="50" rx="8"/>
  <text class="d-sub" x="585" y="42" text-anchor="middle">sorted key</text>
  <text class="d-sub" x="585" y="60" text-anchor="middle">O(k log k)</text>
  <rect class="d-box-accent" x="510" y="120" width="150" height="50" rx="8"/>
  <text class="d-sub" x="585" y="142" text-anchor="middle">count key</text>
  <text class="d-sub" x="585" y="160" text-anchor="middle">O(k + 26)</text>
</svg>

Both keys for "banana" are exactly what example 2 prints. The count key needs a **separator-safe** encoding: writing the 26 counts with a letter (or a \`#\`) between them, because plain concatenation of counts is ambiguous — counts \`1, 11\` and \`11, 1\` would both become \`111\`.

## 4. From Brute Force to One Pass

📌 **Interview term: Equivalence class** — a set of items that are all "equal" under some rule (here: being anagrams of each other). Grouping anagrams means partitioning the input into equivalence classes.

**Brute force.** For each word not yet placed, compare it with every remaining word using an [anagram check](/interview-question/how-do-you-check-if-two-strings-are-anagrams). That is O(n²) comparisons of O(k) each: **O(n² · k)**. For 10,000 words that is about 50 million comparisons.

**Sorted key + hash map.** For each word, sort its letters to get the key and append the word to \`groups[key]\`. Sorting a word of length k is O(k log k), so the total is **O(n · k log k)** time and O(n · k) space for the keys and the output.

**Count key + hash map.** Count the 26 letters (O(k)) and encode the counts as the key (O(26)). Total **O(n · (k + 26))**, which is O(n · k) — asymptotically better than sorting when words are long. It requires a known, small alphabet.

| Approach | Time | Space | When |
| :--- | :--- | :--- | :--- |
| Pairwise comparison | O(n² · k) | O(n · k) | Never in an interview, except as the starting point |
| Sorted key | O(n · k log k) | O(n · k) | The default; works for any characters |
| Count key | O(n · k) | O(n · k) | Lowercase \`a\`–\`z\` and long words |

For short words the difference is small: the \`log k\` factor for a 5-letter word is tiny, while the count key always pays for 26 slots. (That is a reasoning point, not a benchmark — measure if it matters.) Mention both, implement the sorted key, and offer the count key as the optimisation.

**Why the hash map, not sorting the whole list?** You could sort the words by their key and then cut the sorted list into runs of equal keys. That works in O(n log n · k) but is more code and slower than one pass with a map. The map is the standard answer; the idea is the same one used in [How does a hash table work?](/interview-question/how-does-a-hash-table-work)

## 5. The Code in C++

~~~cpp
#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

vector<vector<string>> groupAnagrams(const vector<string>& words) {
    unordered_map<string, vector<string>> groups;     // key -> words with that key
    for (const string& w : words) {
        string key = w;
        sort(key.begin(), key.end());                 // "eat", "tea", "ate" -> "aet"
        groups[key].push_back(w);                     // operator[] creates an empty vector the first time
    }
    vector<vector<string>> out;
    out.reserve(groups.size());
    for (auto& kv : groups) out.push_back(move(kv.second));   // move, do not copy, each group
    return out;
}

// Sort inside each group, then sort the groups by their first word, so output order is fixed.
vector<vector<string>> canonical(vector<vector<string>> groups) {
    for (auto& g : groups) sort(g.begin(), g.end());
    sort(groups.begin(), groups.end(), [](const auto& g, const auto& h) { return g[0] < h[0]; });
    return groups;
}

string fmt(const vector<vector<string>>& groups) {
    string s = "[";
    for (size_t i = 0; i < groups.size(); i++) {
        if (i) s += ", ";
        s += "[";
        for (size_t j = 0; j < groups[i].size(); j++) {
            if (j) s += ", ";
            s += "\\"" + groups[i][j] + "\\"";
        }
        s += "]";
    }
    return s + "]";
}

int main() {
    cout << fmt(canonical(groupAnagrams({"eat", "tea", "tan", "ate", "nat", "bat"}))) << endl;
    cout << fmt(canonical(groupAnagrams({""}))) << endl;
    cout << fmt(canonical(groupAnagrams({"a"}))) << endl;
    cout << fmt(canonical(groupAnagrams({"abc", "bca", "xyz", "zyx", "q", "cab"}))) << endl;
    cout << fmt(canonical(groupAnagrams({"ab", "ba", "abb", "bab", "aab"}))) << endl;
    cout << fmt(canonical(groupAnagrams({}))) << endl;
    return 0;
}
~~~

- **\`string key = w; sort(key.begin(), key.end());\`** — copy, then sort the copy in place. \`std::string\` is mutable, so no conversion is needed.
- **\`groups[key].push_back(w)\`** — here \`operator[]\` inserting a missing key is exactly what you want: the first time a key appears it creates an empty \`vector<string>\`, then appends.
- **\`out.push_back(move(kv.second))\`** — moves each group's vector into the result instead of copying every string. After the move, the map's vectors are left valid but unspecified (in practice empty), which is fine because the map is about to be destroyed.
- **\`canonical\` and \`fmt\`** only fix the printed order so the output matches the other three language versions. A real solution returns \`out\` directly, in whatever order the \`unordered_map\` iterates — which is unspecified.

📌 **Interview term: Custom hash (for \`std::array\` keys)** — \`unordered_map<K, V>\` needs \`std::hash<K>\`. The standard library provides it for \`std::string\` and the built-in numbers, but not for \`std::array\`, so a count key of type \`array<int, 26>\` does not compile. Trying it with GCC 13 fails at the map's constructor:

~~~text
error: use of deleted function 'std::unordered_map<_Key, _Tp, _Hash, _Pred, _Alloc>::unordered_map() [with _Key = std::array<int, 26>; ...
~~~

(trimmed: the full message is several hundred characters long). Three fixes: turn the counts into a \`string\` key (example 2), write a small hash struct and pass it as the third template argument, or use \`std::map\`, which only needs \`operator<\` — and \`std::array\` has one:

~~~cpp
#include <array>
#include <iostream>
#include <map>
#include <string>
#include <vector>
using namespace std;

int main() {
    map<array<int, 26>, vector<string>> groups;   // std::map only needs operator<, which array has
    for (string w : {"eat", "tea", "tan", "ate", "nat", "bat"}) {
        array<int, 26> key{};
        for (char ch : w) key[ch - 'a']++;
        groups[key].push_back(w);
    }
    cout << "groups: " << groups.size() << endl;
    for (const auto& kv : groups) {
        for (const auto& w : kv.second) cout << w << " ";
        cout << endl;
    }
}
~~~

~~~text
groups: 3
tan nat
eat tea ate
bat
~~~

\`std::map\` keeps keys sorted, so the groups come out in the order of their count arrays (the \`tan\` key compares smaller than the \`eat\` key at the \`e\` slot). The price is O(log g) comparisons of 26 integers per insert instead of an O(1)-average hash lookup.

## 6. Verified: Running the Code

Both examples were saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). Example 1 — the sample input and five edge cases (empty string, one word, more groups, same letters with different counts, empty input):

~~~text
[["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]
[[""]]
[["a"]]
[["abc", "bca", "cab"], ["q"], ["xyz", "zyx"]]
[["aab"], ["ab", "ba"], ["abb", "bab"]]
[]
~~~

Example 2 — the sorted key and the count key side by side on 11 words:

~~~text
eat: sorted_key=aet count_key=a1e1t1
tea: sorted_key=aet count_key=a1e1t1
listen: sorted_key=eilnst count_key=e1i1l1n1s1t1
google: sorted_key=eggloo count_key=e1g2l1o2
banana: sorted_key=aaabnn count_key=a3b1n2
groups: 6, same=true
largest group: ate eat tea
~~~

\`same=true\` comes from \`a == b\`: \`vector\`'s \`operator==\` compares element by element, and \`string\`'s compares characters. \`group\` takes a \`const function<string(const string&)>&\`, so both key functions plug in; \`sortedKey(string w)\` takes its argument by value because it sorts its own copy.

## 7. Complexity

n = number of words, k = length of the longest word.

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Pairwise comparison | O(n² · k) | O(n · k) | Every pair compared with an O(k) anagram check |
| Sorted key | O(n · k log k) | O(n · k) | \`std::sort\` per word; keys and output hold every character |
| Count key (26 counts) | O(n · (k + 26)) = O(n · k) | O(n · k) | One counting pass per word plus a short key string |
| \`std::map<array<int,26>, ...>\` | O(n · (k + 26 log g)) | O(n · k) | Tree insert: O(log g) comparisons of 26 ints, g = number of groups |

\`unordered_map\` operations are O(1) on average, plus O(k) to hash a key string. More background: [the time complexity of common operations](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance).

## Edge Cases

- **Empty input list** — returns no groups: \`[]\`.
- **A single empty string** (\`[""]\`) — one group containing \`""\`; the empty string's key is the empty string, which is a valid map key.
- **One word** — one group of one.
- **No anagrams at all** — n groups of one word each.
- **Same letters, different counts** (\`"ab"\`, \`"abb"\`, \`"aab"\`) — three different groups. The count key handles this because counts are in the key; a "set of letters" key would wrongly merge them. Example 1 checks this case.
- **Duplicate words** (\`["a", "a"]\`) — both copies land in the same group; nothing is de-duplicated unless asked.

## Common Pitfalls

- **\`unordered_map<array<int, 26>, ...>\` without a hash** — does not compile (error above). Use a string key, a custom hash, or \`std::map\`.
- **Copying groups out of the map** — \`out.push_back(kv.second)\` copies every string; \`std::move\` avoids it.
- **Sorting \`w\` itself** when iterating by \`const string&\` — it does not compile; iterating by non-const reference would compile and scramble the input words. Sort a copy.
- **Building a count key without separators** — counts \`1, 11\` and \`11, 1\` both give \`"111"\`. Use letter-count pairs or a delimiter.
- **\`counts[ch - 'a']\` on input outside \`a\`–\`z\`** — unchecked out-of-range index, undefined behaviour. Validate or use the sorted key.
- **Relying on \`unordered_map\` iteration order** in tests — it is unspecified; sort the output.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">For each word I sort a copy to get the key and do <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">groups[key].push_back(w)</code> in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map&lt;string, vector&lt;string&gt;&gt;</code>; then I move each vector into the result.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">Two words are anagrams exactly when their sorted letters are equal, so equal keys means same group, and the hash map matches them in one pass.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n · k log k) time for n words of length up to k, and O(n · k) space; pairwise comparison would be O(n² · k).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The optimisation:</strong> <span style="color:#f0e2c8;">For lowercase <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>–<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">z</code>, count into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">array&lt;int, 26&gt;</code> and encode it as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code> key, O(k) per word, so O(n · k).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::hash</code> has no specialisation for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::array</code>, so I use a string key (or a custom hash, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::map</code>), and I <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::move</code> the groups out instead of copying.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">operator[]</code> work well here when it is a trap elsewhere?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because inserting a default value is exactly what we want: the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">groups[key]</code> creates an empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;string&gt;</code> to push into. It is only a trap when you mean to <strong style="color:#ffca28;">read</strong> without inserting.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you use the 26-count array directly as the key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either a custom hash — a struct whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator()</code> combines the 26 ints — passed as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map&lt;array&lt;int, 26&gt;, vector&lt;string&gt;, ArrayHash&gt;</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::map&lt;array&lt;int, 26&gt;, ...&gt;</code>, which only needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator&lt;</code> and was shown working above.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::move(kv.second)</code> change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It transfers the vector's buffer into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">out</code> instead of copying every string, so building the result is O(number of groups) pointer moves rather than O(n · k) character copies.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the output order deterministic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> iteration order is unspecified and can change between library versions. If the order matters, sort each group and then the groups, or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::map</code> keyed by the sorted string.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does the count key beat the sorted key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For long words: O(k) vs O(k log k). For short words, building a 26-slot key costs about as much as sorting, so I would start with the sorted key.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Canonical form (canonical key)** | One standard representative shared by all anagrams, e.g. sorted letters |
| **Bucketing** | Grouping items by a computed key in a hash map |
| **Equivalence class** | A set of items that are all "equal" under a rule |
| **Custom hash (for \`std::array\` keys)** | A hash function you supply because \`std::hash\` does not cover the key type |

---
**Conclusion:** Group anagrams by giving every word a canonical key that all its anagrams share and bucketing in an \`unordered_map<string, vector<string>>\` in one pass, with \`groups[key].push_back(w)\` creating each group on first use. The sorted-letters key costs O(k log k) per word; the 26-count key costs O(k) but must become a \`string\` (or get a custom hash, or live in a \`std::map\`) because \`std::hash\` does not cover \`std::array\`. Move the groups out with \`std::move\`, and never depend on \`unordered_map\` order. The building block is [the two-string anagram check](/interview-question/how-do-you-check-if-two-strings-are-anagrams), and the bucket-by-count idea continues in [top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements).`,
        examples: [
          {
            label: "Group anagrams with a sorted-string key on six inputs",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

vector<vector<string>> groupAnagrams(const vector<string>& words) {
    unordered_map<string, vector<string>> groups;     // key -> words with that key
    for (const string& w : words) {
        string key = w;
        sort(key.begin(), key.end());                 // "eat", "tea", "ate" -> "aet"
        groups[key].push_back(w);                     // operator[] creates an empty vector the first time
    }
    vector<vector<string>> out;
    out.reserve(groups.size());
    for (auto& kv : groups) out.push_back(move(kv.second));   // move, do not copy, each group
    return out;
}

// Sort inside each group, then sort the groups by their first word, so output order is fixed.
vector<vector<string>> canonical(vector<vector<string>> groups) {
    for (auto& g : groups) sort(g.begin(), g.end());
    sort(groups.begin(), groups.end(), [](const auto& g, const auto& h) { return g[0] < h[0]; });
    return groups;
}

string fmt(const vector<vector<string>>& groups) {
    string s = "[";
    for (size_t i = 0; i < groups.size(); i++) {
        if (i) s += ", ";
        s += "[";
        for (size_t j = 0; j < groups[i].size(); j++) {
            if (j) s += ", ";
            s += "\\"" + groups[i][j] + "\\"";
        }
        s += "]";
    }
    return s + "]";
}

int main() {
    cout << fmt(canonical(groupAnagrams({"eat", "tea", "tan", "ate", "nat", "bat"}))) << endl;
    cout << fmt(canonical(groupAnagrams({""}))) << endl;
    cout << fmt(canonical(groupAnagrams({"a"}))) << endl;
    cout << fmt(canonical(groupAnagrams({"abc", "bca", "xyz", "zyx", "q", "cab"}))) << endl;
    cout << fmt(canonical(groupAnagrams({"ab", "ba", "abb", "bab", "aab"}))) << endl;
    cout << fmt(canonical(groupAnagrams({}))) << endl;
    return 0;
}`,
          },
          {
            label: "Sorted key vs letter-count key: same groups, different cost",
            code: `#include <algorithm>
#include <array>
#include <functional>
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

// Two ways to build the group key. Both must produce the same groups.

string sortedKey(string w) {                       // by value: we sort a copy, O(k log k)
    sort(w.begin(), w.end());
    return w;
}

string countKey(const string& w) {                 // O(k + 26) per word, a-z only
    array<int, 26> counts{};
    for (char ch : w) counts[ch - 'a']++;
    string key;
    for (int i = 0; i < 26; i++) {
        if (counts[i] > 0) key += string(1, (char)('a' + i)) + to_string(counts[i]);
    }
    return key;
}

vector<vector<string>> group(const vector<string>& words, const function<string(const string&)>& keyFn) {
    unordered_map<string, vector<string>> groups;
    for (const string& w : words) groups[keyFn(w)].push_back(w);
    vector<vector<string>> out;
    for (auto& kv : groups) out.push_back(move(kv.second));
    for (auto& g : out) sort(g.begin(), g.end());
    sort(out.begin(), out.end(), [](const auto& g, const auto& h) { return g[0] < h[0]; });
    return out;
}

int main() {
    vector<string> words = {"eat", "tea", "tan", "ate", "nat", "bat", "listen", "silent", "enlist", "google", "banana"};
    for (string w : {"eat", "tea", "listen", "google", "banana"}) {
        cout << w << ": sorted_key=" << sortedKey(w) << " count_key=" << countKey(w) << endl;
    }
    auto a = group(words, sortedKey);
    auto b = group(words, countKey);
    cout << boolalpha << "groups: " << a.size() << ", same=" << (a == b) << endl;
    const vector<string>* largest = &a[0];
    for (const auto& g : a) if (g.size() > largest->size()) largest = &g;
    string joined;
    for (const auto& w : *largest) joined += (joined.empty() ? "" : " ") + w;
    cout << "largest group: " << joined << endl;
    return 0;
}`,
          },
        ],
      },
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you find a duplicate in an array?",
    difficulty: "easy",
    seoDescription: "Find a duplicate in an array with a hash set, sorting, index negation or Floyd cycle detection, picked by constraints, with verified code in 4 languages.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a list of integers, find a number that appears more than once. First solve it in general, then for the classic version — n + 1 numbers, each between 1 and n, without modifying the list and with O(1) extra space. Please code it in Python."

**What a strong answer should cover:**
- Asking about the constraints first: value range, whether the list may be modified, the memory budget, one or several repeated values.
- The general answer: scan with a \`set\`, return the first value already in it — O(n) time, O(n) space.
- The alternatives: sort and compare neighbours (O(n log n)), index negation (O(n), O(1) space, modifies the list), and Floyd's cycle detection on \`i → nums[i]\` (O(n), O(1) space, read-only), with why the pigeonhole principle guarantees a duplicate.
- Why Floyd works: two indices point to the duplicate, so it is the entrance of the cycle.
- Python specifics: \`x in seen\` on a \`set\` is O(1) average but on a \`list\` is O(n); \`sorted()\` returns a copy while \`list.sort()\` mutates; \`len(set(nums)) != len(nums)\` for a yes/no; negative indices are valid in Python, so some index bugs are silent.

**Clarifying questions expected:**
- What is the value range? May I modify the list? How much extra space?

**Code / implementation expected:** Yes — a set-based \`find_duplicate\` in Python, plus the Floyd version for the 1..n constraint.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Python lists, loops and sets; nothing else assumed.
**Difficulty:** Easy (the general version); the O(1)-space Floyd variant is often graded Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by running the code with \`python3\` (3.13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

A theatre cloakroom has hooks numbered 1 to 4. At the end of the night, the attendant finds **five** coat tickets in the box, each with a hook number written on it. Five tickets, four hooks: at least two tickets **must** name the same hook. Which hook was given out twice?

- The simplest method: read the tickets one by one and keep a checklist of hook numbers already seen. The first number already ticked is the answer. Fast, but you need the checklist.
- If you may rearrange the tickets: sort them; the repeated number ends up next to itself.
- If you may write on the tickets: when you read hook \`h\`, put a mark on ticket number \`h\`. Meeting a ticket that is already marked tells you its number was reached twice.
- And if you may not write anything down at all and must leave the tickets exactly as they are? There is a beautiful trick: treat each ticket as an arrow "go to ticket h". Following the arrows must eventually loop, and the loop starts exactly at the duplicated number.

That is the whole question: the **constraints** (any values or 1..n? may I modify the array? how much extra memory?) decide the method. Interviewers ask "find the duplicate" precisely to see whether you ask about them.

📌 **Interview term: Pigeonhole principle** — if you put n + 1 items into n boxes, at least one box holds two items. It is why an array of length n + 1 with values in \`1..n\` is **guaranteed** to contain a duplicate.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What range are the values in? Is it \`1..n\` with n + 1 elements? | The bounded version enables the O(1)-space tricks (index marking, Floyd). Arbitrary values need a set or a sort. |
| May I modify the array? | Sorting in place or negating entries is O(1) extra space but destroys the input. |
| How much extra memory is allowed? | O(n) allows a hash set — the simplest O(n) solution. O(1) forces sorting, marking or Floyd. |
| Is exactly one value repeated (possibly many times), or can several values repeat? | With several, different methods may return different (all valid) duplicates — example 2 shows it. |
| Return the value, a yes/no, or all duplicates? | "Contains duplicate?" is a set-size check; "all duplicates" needs a count map. |

## 3. The Core Idea

📌 **Interview term: Hash set** — a collection of distinct values with O(1) average "is it in here?" and "add it" operations. Scanning with a set and stopping at the first value already present is the general-purpose answer: O(n) time, O(n) space, works for any values. (How the O(1) lookup works: [How does a hash table work?](/interview-question/how-does-a-hash-table-work))

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="Hash set scan of 3 1 3 4 2. After 3 the set is 3. After 1 the set is 3 and 1. The next 3 is already in the set so the duplicate is 3">
  <text class="d-text" x="330" y="22" text-anchor="middle">Scan left to right, stop at the first value already in the set</text>
  <rect class="d-box" x="60" y="44" width="70" height="44" rx="8"/>
  <text class="d-text" x="95" y="72" text-anchor="middle">3</text>
  <rect class="d-box" x="170" y="44" width="70" height="44" rx="8"/>
  <text class="d-text" x="205" y="72" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="280" y="44" width="70" height="44" rx="8"/>
  <text class="d-text d-accent" x="315" y="72" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="390" y="44" width="70" height="44" rx="8"/>
  <text class="d-sub" x="425" y="72" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="500" y="44" width="70" height="44" rx="8"/>
  <text class="d-sub" x="535" y="72" text-anchor="middle">2</text>
  <text class="d-sub" x="95" y="118" text-anchor="middle">seen: 3</text>
  <text class="d-sub" x="205" y="118" text-anchor="middle">seen: 3, 1</text>
  <text class="d-sub" x="425" y="118" text-anchor="middle">never read</text>
  <rect class="d-box-accent" x="230" y="140" width="170" height="44" rx="8"/>
  <text class="d-text d-accent" x="315" y="168" text-anchor="middle">3 is in seen</text>
</svg>

The scan stops at index 2, so the last two elements are never read. The set version returns the value whose **second** occurrence comes first.

### The O(1)-space trick: the array is a linked list

When the array has n + 1 elements and every value is in \`1..n\`, read each index \`i\` as a node with one arrow pointing to node \`nums[i]\`. Every node has exactly one outgoing arrow, so following arrows from node 0 must eventually repeat a node — it enters a **cycle**. Two different indices hold the duplicate value \`d\`, so node \`d\` has two incoming arrows: one from the path, one from inside the loop. That makes \`d\` exactly the node where the path **enters** the cycle.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 210" role="img" aria-label="Index graph for 1 3 4 2 2. Index 0 points to 1, 1 points to 3, 3 points to 2, 2 points to 4, and 4 points back to 2. The cycle is 2 and 4 and its entrance is 2, the duplicate">
  <defs>
    <marker id="fd05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="330" y="22" text-anchor="middle">nums = [1,3,4,2,2]</text>
  <circle class="d-box" cx="70" cy="110" r="28"/>
  <text class="d-text" x="70" y="115" text-anchor="middle">0</text>
  <circle class="d-box" cx="190" cy="110" r="28"/>
  <text class="d-text" x="190" y="115" text-anchor="middle">1</text>
  <circle class="d-box" cx="310" cy="110" r="28"/>
  <text class="d-text" x="310" y="115" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="430" cy="110" r="28"/>
  <text class="d-text d-accent" x="430" y="115" text-anchor="middle">2</text>
  <circle class="d-box" cx="570" cy="110" r="28"/>
  <text class="d-text" x="570" y="115" text-anchor="middle">4</text>
  <path class="d-edge" d="M 100 110 L 156 110" marker-end="url(#fd05-arrow)"/>
  <path class="d-edge" d="M 220 110 L 276 110" marker-end="url(#fd05-arrow)"/>
  <path class="d-edge" d="M 340 110 L 396 110" marker-end="url(#fd05-arrow)"/>
  <path class="d-edge-accent" d="M 460 102 L 536 102" marker-end="url(#fd05-arrow)"/>
  <path class="d-edge-accent" d="M 556 136 C 530 180, 470 180, 446 140" marker-end="url(#fd05-arrow)"/>
  <text class="d-sub" x="500" y="66" text-anchor="middle">cycle</text>
  <text class="d-sub" x="430" y="196" text-anchor="middle">entrance = duplicate</text>
</svg>

Each node is an index, with an arrow to the index named by its value. Index 3 and index 4 both hold the value 2, so node 2 has two incoming arrows (from 3 and from 4), and it is where the path from 0 enters the loop 2 → 4 → 2. Node 0 is a safe start because no value is 0, so nothing points back to it.

📌 **Interview term: Floyd's cycle detection (tortoise and hare)** — two pointers move along the arrows, \`slow\` one step at a time and \`fast\` two. Inside the cycle \`fast\` gains one step per move, so they must meet. Then restart \`slow\` from the beginning and move both one step at a time: they meet exactly at the cycle entrance. The full proof is in [the fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique) and [finding where a linked-list cycle begins](/interview-question/how-do-you-find-the-node-where-a-linked-list-cycle-begins); here the "linked list" is just the array read as \`i → nums[i]\`.

## 4. Choosing the Approach by Constraint

| Constraints | Method | Time | Extra space | Modifies input? |
| :--- | :--- | :--- | :--- | :--- |
| Any values (the general case) | Hash set, stop at first repeat | O(n) | O(n) | No |
| Any values, O(1) space, modifying allowed | Sort in place, compare neighbours | O(n log n) | O(1)* | Yes |
| Values in \`1..n\`, modifying allowed | Negate \`nums[abs(x)]\` as a "seen" mark | O(n) | O(1) | Yes (restorable) |
| Values in \`1..n\`, read-only, O(1) space | Floyd cycle detection on \`i → nums[i]\` | O(n) | O(1) | No |
| Brute force | Compare every pair | O(n²) | O(1) | No |

\\* O(1) beyond whatever the sort itself uses internally; sorting a copy costs O(n).

📌 **Interview term: Index marking (negation trick)** — when values are valid indices, you can record "value v was seen" by flipping the sign of \`nums[v]\`. Reading \`x\`, look at \`nums[abs(x)]\`: if it is already negative, \`abs(x)\` has been seen before. It needs values ≥ 1 (a \`0\` cannot be negated into a mark) and it writes to the array, so restore the signs afterwards if the caller needs the input back.

**When several values repeat, the answers can differ — and all are correct.** The set returns the value whose second copy appears first; sorting returns the **smallest** repeated value; negation returns the first value it meets twice in its own scan order; Floyd returns whichever duplicate is the entrance of the cycle reachable from index 0. Example 2 runs all four on \`[2, 3, 3, 2, 1]\` and gets \`3, 2, 3, 2\`. If the problem says "exactly one value repeats" (the usual statement), they all agree.

**Related variants.** "Does any duplicate exist?" is the same scan returning a boolean (or a one-line set-size comparison). "Find all duplicates" uses a count map ([top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements) uses the same counting). "Find the missing number" in \`0..n\` is the mirror problem, solved with a sum or XOR: [How do you find the missing number in 0..n?](/interview-question/how-do-you-find-the-missing-number-in-0-n)

## 5. The Code in Python

~~~python
def find_duplicate_set(nums):
    """Any values: return the first value seen twice (scanning left to right), or -1."""
    seen = set()
    for x in nums:
        if x in seen:
            return x
        seen.add(x)
    return -1


def find_duplicate_floyd(nums):
    """Values in 1..n, length n + 1, read-only: O(1) extra space."""
    slow = fast = nums[0]
    while True:                       # phase 1: find a meeting point inside the cycle
        slow = nums[slow]
        fast = nums[nums[fast]]
        if slow == fast:
            break
    slow = nums[0]                    # phase 2: walk to the cycle entrance
    while slow != fast:
        slow = nums[slow]
        fast = nums[fast]
    return slow


def fmt(a):
    return "[" + ", ".join(str(v) for v in a) + "]"


for nums in [[1, 3, 4, 2, 2], [3, 1, 3, 4, 2], [2, 2, 2, 2, 2], [1, 1], [2, 5, 9, 6, 9, 3, 8, 9, 7, 1]]:
    print(fmt(nums) + ": set=" + str(find_duplicate_set(nums)) + " floyd=" + str(find_duplicate_floyd(nums)))
for nums in [[10, -4, 7, -4], [1, 2, 3], []]:      # outside 1..n: only the set version applies
    print(fmt(nums) + ": set=" + str(find_duplicate_set(nums)))
~~~

- **\`seen = set()\`** — \`x in seen\` and \`seen.add(x)\` are O(1) on average. Do **not** use a list here: \`x in some_list\` scans the whole list, which makes the loop O(n²).
- **\`return x\` on the first hit** — stops early; the rest of the list is never read.
- **\`slow = fast = nums[0]\`**, then \`slow = nums[slow]\` (one step) and \`fast = nums[nums[fast]]\` (two steps). Python has no \`do ... while\`, so phase 1 is \`while True:\` with a \`break\` once they meet — both pointers have to move at least once before they are compared, because they start equal.
- **Phase 2** restarts \`slow\` at \`nums[0]\` and moves both one step at a time; where they meet is the duplicate.
- The second loop runs only the set version: \`[10, -4, 7, -4]\` and \`[1, 2, 3]\` break Floyd's precondition (values in \`1..n\` with n + 1 elements).

📌 **Interview term: Precondition** — a condition the input must satisfy for the algorithm to be correct. Floyd's precondition is "length n + 1, values in \`1..n\`". Outside it, \`nums[slow]\` can index out of range or loop forever; say this out loud when you present the trick.

The everyday Python idioms for the related variants, checked by running them:

~~~python
from collections import Counter

nums = [4, 1, 4, 2, 1, 4]
print(len(set(nums)) != len(nums))                    # "is there any duplicate?" in one line
print(sorted(x for x, c in Counter(nums).items() if c > 1))   # every value that repeats
print(Counter(nums).most_common(1))                   # the most repeated value and its count
~~~

~~~text
True
[1, 4]
[(4, 3)]
~~~

\`len(set(nums)) != len(nums)\` answers "is there any duplicate?" in one line (O(n) time and space, but it always builds the full set, so no early exit). \`collections.Counter\` answers "which values repeat?" and "how often?".

## 6. Verified: Running the Code

Both examples were saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). Example 1 — the set and Floyd versions on the bounded inputs, then the set version on three inputs outside \`1..n\`:

~~~text
[1, 3, 4, 2, 2]: set=2 floyd=2
[3, 1, 3, 4, 2]: set=3 floyd=3
[2, 2, 2, 2, 2]: set=2 floyd=2
[1, 1]: set=1 floyd=1
[2, 5, 9, 6, 9, 3, 8, 9, 7, 1]: set=9 floyd=9
[10, -4, 7, -4]: set=-4
[1, 2, 3]: set=-1
[]: set=-1
~~~

Example 2 — a trace of Floyd's two phases, then all four approaches side by side:

~~~text
trace for [1, 3, 4, 2, 2]:
  phase 1 (slow,fast): (3,2) (2,2)
  phase 2 (slow,fast): (3,4) (2,2)
  duplicate = 2
[1, 3, 4, 2, 2]: set=2 sort=2 negate=2 floyd=2
[3, 1, 3, 4, 2]: set=3 sort=3 negate=3 floyd=3
[4, 3, 1, 4, 2]: set=4 sort=4 negate=4 floyd=4
[2, 3, 3, 2, 1]: set=3 sort=2 negate=3 floyd=2
~~~

The trace matches the index-graph diagram: phase 1 moves \`slow\` 1 → 3 → 2 and \`fast\` 1 → 2 → 2, meeting at 2 inside the cycle; phase 2 walks \`slow\` from the start (0 → 1 → 3 → 2) and \`fast\` around the loop (2 → 4 → 2) until both are at 2. The last line is the "several duplicates" case from section 4: \`[2, 3, 3, 2, 1]\` has two repeated values and the methods return \`3, 2, 3, 2\` — each a correct duplicate.

\`by_sort\` uses \`sorted(nums)\`, which returns a **new** list; \`nums.sort()\` would sort the caller's list in place. \`by_negation\` copies with \`list(nums)\` because it writes negative values into the list it scans.

## 7. Complexity

| Method | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`set\` scan | O(n) average | O(n) | One O(1)-average membership test and insert per element |
| \`sorted()\` + neighbours | O(n log n) | O(n) | \`sorted\` builds a copy; \`nums.sort()\` in place would be O(1) extra beyond the sort |
| Index negation | O(n) | O(1) (O(n) here, because the example copies) | One read and one write per element |
| Floyd | O(n) | O(1) | Each phase takes at most a constant multiple of n steps |
| Brute force pairs | O(n²) | O(1) | n(n−1)/2 comparisons |

For the meaning of these labels, see [What is Big-O notation?](/interview-question/what-is-big-o-notation)

## Edge Cases

- **No duplicate** (\`[1, 2, 3]\`) — only possible when the values are not bounded to \`1..n\` with n + 1 elements; the set version returns \`-1\`. Floyd must not be used here: without the pigeonhole guarantee it can loop forever or index out of bounds.
- **Empty array** — the set version returns \`-1\` immediately; Floyd's \`nums[0]\` would fail, which again is outside its precondition.
- **The duplicate repeats many times** (\`[2, 2, 2, 2, 2]\`) — every method returns 2; for Floyd, node 2 points to itself, a cycle of length 1.
- **Smallest case** (\`[1, 1]\`) — n = 1, both methods return 1.
- **Negative numbers** (\`[10, -4, 7, -4]\`) — fine for the set and sort methods; the index tricks require values in \`1..n\`.
- **Several different duplicated values** — methods may disagree on which one they return (see section 4). Ask whether any duplicate is acceptable.

## Common Pitfalls

- **Using a list for \`seen\`** — \`x in seen_list\` is a linear scan, so the "O(n)" solution becomes O(n²).
- **Starting Floyd with \`slow = fast = 0\` and comparing before moving** — the loop condition is true immediately; move both pointers before the first comparison (here: \`while True\` + \`break\`).
- **Running Floyd or negation outside \`1..n\`** — sometimes it fails loudly (Floyd on \`[1, 2, 3]\` and on \`[10, -4, 7, -4]\` both raised \`IndexError: list index out of range\` when run), but small negative values are valid Python indices (\`nums[-4]\` reads the fourth element from the end), so other inputs can give a wrong answer silently. Check the precondition.
- **Forgetting \`abs()\` in the negation trick** — after a value has been negated, \`nums[x]\` with a negative \`x\` reads from the end of the list.
- **Calling \`nums.sort()\` on the caller's list** when the problem says "do not modify the input" — use \`sorted(nums)\` (O(n) extra space) or a different method.
- **Expecting all methods to return the same value** when several values repeat — they may not, as example 2 shows.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">It depends on the constraints; in general I scan with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> and return the first value already in it — O(n) time, O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The constraint questions:</strong> <span style="color:#f0e2c8;">I ask about the value range, whether I may modify the list, the memory budget, and whether several values can repeat.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The O(1)-space options:</strong> <span style="color:#f0e2c8;">Sort in place and compare neighbours in O(n log n), or — with values in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1..n</code> — negate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[abs(x)]</code> as a seen-mark in O(n), which modifies the list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The read-only trick:</strong> <span style="color:#f0e2c8;">With n + 1 values in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1..n</code>, I read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i → nums[i]</code> as a linked list; two indices point to the duplicate, so it is the cycle entrance, and Floyd finds it in O(n) time and O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Python detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x in seen</code> must be on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>, not a list; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted()</code> copies while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.sort()</code> mutates; and negative indices can make index bugs silent.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is a duplicate guaranteed in the 1..n version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The pigeonhole principle: n + 1 values but only n possible values, so at least two positions hold the same value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does Floyd's phase 2 find the duplicate and not just any node of the cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After the meeting point, the distance from the start to the cycle entrance equals the distance from the meeting point to the entrance (modulo the cycle length), so moving both one step at a time makes them meet exactly at the entrance — and the entrance is the node with two incoming arrows, the duplicate.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if I just need to know whether any duplicate exists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return len(set(nums)) != len(nums)</code> — one line, O(n). The explicit loop is better when I want to stop at the first repeat without building the whole set.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if I must return all values that repeat?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[x for x, c in Counter(nums).items() if c &gt; 1]</code> — O(n) time and O(k) space for k distinct values. In the 1..n version, the negation trick can also collect every value it sees twice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use the negation trick and still leave the input unchanged?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — after finding the answer, loop once more and set every element back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abs(x)</code>. The time stays O(n), but a concurrent reader could see the temporary negative values, which is why "read-only" points to Floyd.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pigeonhole principle** | n + 1 items in n boxes means some box holds two |
| **Hash set** | Distinct values with O(1) average lookup and insert |
| **Floyd's cycle detection** | Slow and fast pointers meet in a cycle; a restart finds its entrance |
| **Index marking (negation trick)** | Flip \`nums[v]\` negative to remember that v was seen |
| **Precondition** | What the input must satisfy for the algorithm to be correct |

---
**Conclusion:** "Find a duplicate" is really "which constraints apply?". For any values, a \`set\` scan is O(n) time and O(n) space and stops at the first repeat. With values in \`1..n\` and n + 1 elements, the pigeonhole principle guarantees a duplicate, and reading the list as \`i → nums[i]\` turns it into a linked list whose cycle entrance is the duplicate — Floyd finds it in O(n) time and O(1) space without touching the list. In Python, watch for hidden linear scans (\`in\` on a list), \`sort()\` vs \`sorted()\`, and negative indices that can hide index bugs. The pointer technique is the one from [detecting a cycle in a linked list](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list), and the mirror problem is [finding the missing number](/interview-question/how-do-you-find-the-missing-number-in-0-n).`,
        examples: [
          {
            label: "Hash set (any values) and Floyd cycle detection (values 1..n)",
            code: `def find_duplicate_set(nums):
    """Any values: return the first value seen twice (scanning left to right), or -1."""
    seen = set()
    for x in nums:
        if x in seen:
            return x
        seen.add(x)
    return -1


def find_duplicate_floyd(nums):
    """Values in 1..n, length n + 1, read-only: O(1) extra space."""
    slow = fast = nums[0]
    while True:                       # phase 1: find a meeting point inside the cycle
        slow = nums[slow]
        fast = nums[nums[fast]]
        if slow == fast:
            break
    slow = nums[0]                    # phase 2: walk to the cycle entrance
    while slow != fast:
        slow = nums[slow]
        fast = nums[fast]
    return slow


def fmt(a):
    return "[" + ", ".join(str(v) for v in a) + "]"


for nums in [[1, 3, 4, 2, 2], [3, 1, 3, 4, 2], [2, 2, 2, 2, 2], [1, 1], [2, 5, 9, 6, 9, 3, 8, 9, 7, 1]]:
    print(fmt(nums) + ": set=" + str(find_duplicate_set(nums)) + " floyd=" + str(find_duplicate_floyd(nums)))
for nums in [[10, -4, 7, -4], [1, 2, 3], []]:      # outside 1..n: only the set version applies
    print(fmt(nums) + ": set=" + str(find_duplicate_set(nums)))`,
          },
          {
            label: "Four approaches side by side, with a Floyd trace",
            code: `# Four approaches, plus a trace of Floyd's two phases.

def by_set(nums):
    seen = set()
    for x in nums:
        if x in seen:
            return x
        seen.add(x)
    return -1


def by_sort(nums):
    s = sorted(nums)                      # a sorted COPY; nums is untouched
    for i in range(1, len(s)):
        if s[i] == s[i - 1]:
            return s[i]
    return -1


def by_negation(nums):
    a = list(nums)                        # work on a copy: this method writes to the array
    for x in a:
        i = abs(x)
        if a[i] < 0:                      # index i was already marked: value i seen before
            return i
        a[i] = -a[i]
    return -1


def by_floyd(nums, trace=False):
    slow = fast = nums[0]
    steps = []
    while True:
        slow = nums[slow]
        fast = nums[nums[fast]]
        steps.append("(" + str(slow) + "," + str(fast) + ")")
        if slow == fast:
            break
    if trace:
        print("  phase 1 (slow,fast): " + " ".join(steps))
    slow, steps = nums[0], []
    while slow != fast:
        slow = nums[slow]
        fast = nums[fast]
        steps.append("(" + str(slow) + "," + str(fast) + ")")
    if trace:
        print("  phase 2 (slow,fast): " + (" ".join(steps) if steps else "already equal"))
    return slow


def fmt(a):
    return "[" + ", ".join(str(v) for v in a) + "]"


print("trace for [1, 3, 4, 2, 2]:")
print("  duplicate = " + str(by_floyd([1, 3, 4, 2, 2], True)))
for nums in [[1, 3, 4, 2, 2], [3, 1, 3, 4, 2], [4, 3, 1, 4, 2], [2, 3, 3, 2, 1]]:
    print(fmt(nums) + ": set=" + str(by_set(nums)) + " sort=" + str(by_sort(nums))
          + " negate=" + str(by_negation(nums)) + " floyd=" + str(by_floyd(nums)))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an array of integers, find a value that appears more than once. Start with the general case; then solve the classic version — n + 1 numbers each between 1 and n — without modifying the array and with O(1) extra space. Please write it in JavaScript."

**What a strong answer should cover:**
- Asking about the constraints first: value range, whether the array may be modified, memory budget, one or several repeated values.
- The general answer: scan with a \`Set\`, return the first value already in it — O(n) time, O(n) space.
- The alternatives: sort and compare neighbours (O(n log n)), index negation (O(n), O(1) space, modifies the array), Floyd's cycle detection on \`i → nums[i]\` (O(n), O(1) space, read-only), and the pigeonhole guarantee.
- Why Floyd works: two indices point to the duplicate, so it is the entrance of the cycle.
- JavaScript specifics: \`Set\` membership vs \`includes\`/\`indexOf\` (linear); \`.sort()\` mutates and compares as strings without a comparator; \`new Set(nums).size !== nums.length\` for a yes/no; out-of-range indices return \`undefined\` instead of throwing.

**Clarifying questions expected:**
- What is the value range? May I modify the array? How much extra space?

**Code / implementation expected:** Yes — a \`Set\`-based \`findDuplicate\` in JavaScript, plus the Floyd version for the 1..n constraint.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know JavaScript arrays and loops; nothing else assumed.
**Difficulty:** Easy (the general version); the O(1)-space Floyd variant is often graded Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by running the code with \`node\` (v22); nothing is typed in by hand. The examples only use \`console.log\`, so they behave the same in a browser.

## 1. Why This Even Matters — A Story First

A theatre cloakroom has hooks numbered 1 to 4. At the end of the night, the attendant finds **five** coat tickets in the box, each with a hook number written on it. Five tickets, four hooks: at least two tickets **must** name the same hook. Which hook was given out twice?

- The simplest method: read the tickets one by one and keep a checklist of hook numbers already seen. The first number already ticked is the answer. Fast, but you need the checklist.
- If you may rearrange the tickets: sort them; the repeated number ends up next to itself.
- If you may write on the tickets: when you read hook \`h\`, put a mark on ticket number \`h\`. Meeting a ticket that is already marked tells you its number was reached twice.
- And if you may not write anything down at all and must leave the tickets exactly as they are? There is a beautiful trick: treat each ticket as an arrow "go to ticket h". Following the arrows must eventually loop, and the loop starts exactly at the duplicated number.

That is the whole question: the **constraints** (any values or 1..n? may I modify the array? how much extra memory?) decide the method. Interviewers ask "find the duplicate" precisely to see whether you ask about them.

📌 **Interview term: Pigeonhole principle** — if you put n + 1 items into n boxes, at least one box holds two items. It is why an array of length n + 1 with values in \`1..n\` is **guaranteed** to contain a duplicate.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What range are the values in? Is it \`1..n\` with n + 1 elements? | The bounded version enables the O(1)-space tricks (index marking, Floyd). Arbitrary values need a set or a sort. |
| May I modify the array? | Sorting in place or negating entries is O(1) extra space but destroys the input. |
| How much extra memory is allowed? | O(n) allows a hash set — the simplest O(n) solution. O(1) forces sorting, marking or Floyd. |
| Is exactly one value repeated (possibly many times), or can several values repeat? | With several, different methods may return different (all valid) duplicates — example 2 shows it. |
| Return the value, a yes/no, or all duplicates? | "Contains duplicate?" is a set-size check; "all duplicates" needs a count map. |

## 3. The Core Idea

📌 **Interview term: Hash set** — a collection of distinct values with O(1) average "is it in here?" and "add it" operations. Scanning with a set and stopping at the first value already present is the general-purpose answer: O(n) time, O(n) space, works for any values. (How the O(1) lookup works: [How does a hash table work?](/interview-question/how-does-a-hash-table-work))

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="Hash set scan of 3 1 3 4 2. After 3 the set is 3. After 1 the set is 3 and 1. The next 3 is already in the set so the duplicate is 3">
  <text class="d-text" x="330" y="22" text-anchor="middle">Scan left to right, stop at the first value already in the set</text>
  <rect class="d-box" x="60" y="44" width="70" height="44" rx="8"/>
  <text class="d-text" x="95" y="72" text-anchor="middle">3</text>
  <rect class="d-box" x="170" y="44" width="70" height="44" rx="8"/>
  <text class="d-text" x="205" y="72" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="280" y="44" width="70" height="44" rx="8"/>
  <text class="d-text d-accent" x="315" y="72" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="390" y="44" width="70" height="44" rx="8"/>
  <text class="d-sub" x="425" y="72" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="500" y="44" width="70" height="44" rx="8"/>
  <text class="d-sub" x="535" y="72" text-anchor="middle">2</text>
  <text class="d-sub" x="95" y="118" text-anchor="middle">seen: 3</text>
  <text class="d-sub" x="205" y="118" text-anchor="middle">seen: 3, 1</text>
  <text class="d-sub" x="425" y="118" text-anchor="middle">never read</text>
  <rect class="d-box-accent" x="230" y="140" width="170" height="44" rx="8"/>
  <text class="d-text d-accent" x="315" y="168" text-anchor="middle">3 is in seen</text>
</svg>

The scan stops at index 2, so the last two elements are never read. The set version returns the value whose **second** occurrence comes first.

### The O(1)-space trick: the array is a linked list

When the array has n + 1 elements and every value is in \`1..n\`, read each index \`i\` as a node with one arrow pointing to node \`nums[i]\`. Every node has exactly one outgoing arrow, so following arrows from node 0 must eventually repeat a node — it enters a **cycle**. Two different indices hold the duplicate value \`d\`, so node \`d\` has two incoming arrows: one from the path, one from inside the loop. That makes \`d\` exactly the node where the path **enters** the cycle.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 210" role="img" aria-label="Index graph for 1 3 4 2 2. Index 0 points to 1, 1 points to 3, 3 points to 2, 2 points to 4, and 4 points back to 2. The cycle is 2 and 4 and its entrance is 2, the duplicate">
  <defs>
    <marker id="fd05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="330" y="22" text-anchor="middle">nums = [1,3,4,2,2]</text>
  <circle class="d-box" cx="70" cy="110" r="28"/>
  <text class="d-text" x="70" y="115" text-anchor="middle">0</text>
  <circle class="d-box" cx="190" cy="110" r="28"/>
  <text class="d-text" x="190" y="115" text-anchor="middle">1</text>
  <circle class="d-box" cx="310" cy="110" r="28"/>
  <text class="d-text" x="310" y="115" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="430" cy="110" r="28"/>
  <text class="d-text d-accent" x="430" y="115" text-anchor="middle">2</text>
  <circle class="d-box" cx="570" cy="110" r="28"/>
  <text class="d-text" x="570" y="115" text-anchor="middle">4</text>
  <path class="d-edge" d="M 100 110 L 156 110" marker-end="url(#fd05-arrow)"/>
  <path class="d-edge" d="M 220 110 L 276 110" marker-end="url(#fd05-arrow)"/>
  <path class="d-edge" d="M 340 110 L 396 110" marker-end="url(#fd05-arrow)"/>
  <path class="d-edge-accent" d="M 460 102 L 536 102" marker-end="url(#fd05-arrow)"/>
  <path class="d-edge-accent" d="M 556 136 C 530 180, 470 180, 446 140" marker-end="url(#fd05-arrow)"/>
  <text class="d-sub" x="500" y="66" text-anchor="middle">cycle</text>
  <text class="d-sub" x="430" y="196" text-anchor="middle">entrance = duplicate</text>
</svg>

Each node is an index, with an arrow to the index named by its value. Index 3 and index 4 both hold the value 2, so node 2 has two incoming arrows (from 3 and from 4), and it is where the path from 0 enters the loop 2 → 4 → 2. Node 0 is a safe start because no value is 0, so nothing points back to it.

📌 **Interview term: Floyd's cycle detection (tortoise and hare)** — two pointers move along the arrows, \`slow\` one step at a time and \`fast\` two. Inside the cycle \`fast\` gains one step per move, so they must meet. Then restart \`slow\` from the beginning and move both one step at a time: they meet exactly at the cycle entrance. The full proof is in [the fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique) and [finding where a linked-list cycle begins](/interview-question/how-do-you-find-the-node-where-a-linked-list-cycle-begins); here the "linked list" is just the array read as \`i → nums[i]\`.

## 4. Choosing the Approach by Constraint

| Constraints | Method | Time | Extra space | Modifies input? |
| :--- | :--- | :--- | :--- | :--- |
| Any values (the general case) | Hash set, stop at first repeat | O(n) | O(n) | No |
| Any values, O(1) space, modifying allowed | Sort in place, compare neighbours | O(n log n) | O(1)* | Yes |
| Values in \`1..n\`, modifying allowed | Negate \`nums[abs(x)]\` as a "seen" mark | O(n) | O(1) | Yes (restorable) |
| Values in \`1..n\`, read-only, O(1) space | Floyd cycle detection on \`i → nums[i]\` | O(n) | O(1) | No |
| Brute force | Compare every pair | O(n²) | O(1) | No |

\\* O(1) beyond whatever the sort itself uses internally; sorting a copy costs O(n).

📌 **Interview term: Index marking (negation trick)** — when values are valid indices, you can record "value v was seen" by flipping the sign of \`nums[v]\`. Reading \`x\`, look at \`nums[abs(x)]\`: if it is already negative, \`abs(x)\` has been seen before. It needs values ≥ 1 (a \`0\` cannot be negated into a mark) and it writes to the array, so restore the signs afterwards if the caller needs the input back.

**When several values repeat, the answers can differ — and all are correct.** The set returns the value whose second copy appears first; sorting returns the **smallest** repeated value; negation returns the first value it meets twice in its own scan order; Floyd returns whichever duplicate is the entrance of the cycle reachable from index 0. Example 2 runs all four on \`[2, 3, 3, 2, 1]\` and gets \`3, 2, 3, 2\`. If the problem says "exactly one value repeats" (the usual statement), they all agree.

**Related variants.** "Does any duplicate exist?" is the same scan returning a boolean (or a one-line set-size comparison). "Find all duplicates" uses a count map ([top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements) uses the same counting). "Find the missing number" in \`0..n\` is the mirror problem, solved with a sum or XOR: [How do you find the missing number in 0..n?](/interview-question/how-do-you-find-the-missing-number-in-0-n)

## 5. The Code in JavaScript

~~~javascript
function findDuplicateSet(nums) {
  // Any values: return the first value seen twice (scanning left to right), or -1.
  const seen = new Set();
  for (const x of nums) {
    if (seen.has(x)) return x;
    seen.add(x);
  }
  return -1;
}

function findDuplicateFloyd(nums) {
  // Values in 1..n, length n + 1, read-only: O(1) extra space.
  let slow = nums[0], fast = nums[0];
  do {                                // phase 1: find a meeting point inside the cycle
    slow = nums[slow];
    fast = nums[nums[fast]];
  } while (slow !== fast);
  slow = nums[0];                     // phase 2: walk to the cycle entrance
  while (slow !== fast) {
    slow = nums[slow];
    fast = nums[fast];
  }
  return slow;
}

function fmt(a) {
  return '[' + a.join(', ') + ']';
}

for (const nums of [[1, 3, 4, 2, 2], [3, 1, 3, 4, 2], [2, 2, 2, 2, 2], [1, 1], [2, 5, 9, 6, 9, 3, 8, 9, 7, 1]]) {
  console.log(fmt(nums) + ': set=' + findDuplicateSet(nums) + ' floyd=' + findDuplicateFloyd(nums));
}
for (const nums of [[10, -4, 7, -4], [1, 2, 3], []]) {   // outside 1..n: only the set version applies
  console.log(fmt(nums) + ': set=' + findDuplicateSet(nums));
}
~~~

- **\`new Set()\`** with \`has\` and \`add\` — O(1) on average. \`nums.includes(x)\` or \`nums.indexOf(x)\` would scan the array each time, making the loop O(n²).
- **\`do { ... } while (slow !== fast)\`** — JavaScript has \`do...while\`, which is exactly the shape of Floyd's phase 1: both pointers start equal, so they must move once before the first comparison.
- **Phase 2** restarts \`slow\` at \`nums[0]\` and moves both one step at a time; they meet at the duplicate.
- The second loop runs only the \`Set\` version: \`[10, -4, 7, -4]\` and \`[1, 2, 3]\` break Floyd's precondition.

📌 **Interview term: Precondition** — a condition the input must satisfy for the algorithm to be correct. Floyd's precondition is "length n + 1, values in \`1..n\`". In JavaScript, breaking it does not throw: an out-of-range read such as \`nums[10]\` is just \`undefined\`, and \`nums[undefined]\` is \`undefined\` too, so both pointers drift to \`undefined\` and "meet" there. Running \`findDuplicateFloyd\` on \`[1, 2, 3]\` and on \`[10, -4, 7, -4]\` returned \`undefined\` both times, with no error. Validate the input instead of trusting the trick.

Two JavaScript facts that matter for this problem, checked by running them:

~~~javascript
const nums = [4, 1, 4, 2, 1, 4];
console.log(new Set(nums).size !== nums.length);     // "is there any duplicate?" in one line

const weird = [NaN, 0, NaN, -0];
console.log(NaN === NaN);                            // === says NaN is never equal to itself
console.log(new Set(weird).size);                    // a Set treats NaN as equal to NaN, and 0 as -0
~~~

~~~text
true
false
2
~~~

\`new Set(nums).size !== nums.length\` answers "is there any duplicate?" in one line (no early exit, though). And a \`Set\` treats \`NaN\` as equal to \`NaN\` and \`0\` as equal to \`-0\`, while \`===\` says \`NaN\` never equals itself — so a hand-written \`===\` pairwise check would miss repeated \`NaN\`s that a \`Set\` catches. For integer input this never matters, but it is a good answer to "how does \`Set\` compare values?".

## 6. Verified: Running the Code

Both examples were saved as \`main.js\` and run with \`node main.js\` (Node v22). Example 1 — the \`Set\` and Floyd versions on bounded inputs, then the \`Set\` version on three inputs outside \`1..n\`:

~~~text
[1, 3, 4, 2, 2]: set=2 floyd=2
[3, 1, 3, 4, 2]: set=3 floyd=3
[2, 2, 2, 2, 2]: set=2 floyd=2
[1, 1]: set=1 floyd=1
[2, 5, 9, 6, 9, 3, 8, 9, 7, 1]: set=9 floyd=9
[10, -4, 7, -4]: set=-4
[1, 2, 3]: set=-1
[]: set=-1
~~~

Example 2 — a trace of Floyd's two phases, then all four approaches side by side:

~~~text
trace for [1, 3, 4, 2, 2]:
  phase 1 (slow,fast): (3,2) (2,2)
  phase 2 (slow,fast): (3,4) (2,2)
  duplicate = 2
[1, 3, 4, 2, 2]: set=2 sort=2 negate=2 floyd=2
[3, 1, 3, 4, 2]: set=3 sort=3 negate=3 floyd=3
[4, 3, 1, 4, 2]: set=4 sort=4 negate=4 floyd=4
[2, 3, 3, 2, 1]: set=3 sort=2 negate=3 floyd=2
~~~

The trace matches the index-graph diagram: phase 1 meets at 2 inside the cycle; phase 2 walks \`slow\` from the start and \`fast\` around the loop until both are at 2. The last line is the "several duplicates" case: \`[2, 3, 3, 2, 1]\` returns \`3, 2, 3, 2\` — each a correct duplicate.

\`bySort\` copies with \`[...nums]\` and passes \`(a, b) => a - b\`: \`.sort()\` sorts **in place**, and without a comparator it compares elements as strings (so \`[10, 9, 1]\` would sort to \`1, 10, 9\`). Equal numbers still end up adjacent under string order, but the "smallest duplicate" property and any later numeric logic would break, so always pass the comparator. \`byNegation\` copies too, because it writes into the array.

## 7. Complexity

| Method | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`Set\` scan | O(n) average | O(n) | One O(1)-average \`has\`/\`add\` per element |
| Sorted copy + neighbours | O(n log n) | O(n) | The copy plus the sort; sorting the input in place would be O(1) extra beyond the sort |
| Index negation | O(n) | O(1) (O(n) here, because the example copies) | One read and one write per element |
| Floyd | O(n) | O(1) | Each phase is at most a constant multiple of n steps |
| Brute force pairs | O(n²) | O(1) | n(n−1)/2 comparisons |

For the meaning of these labels, see [What is Big-O notation?](/interview-question/what-is-big-o-notation)

## Edge Cases

- **No duplicate** (\`[1, 2, 3]\`) — only possible when the values are not bounded to \`1..n\` with n + 1 elements; the set version returns \`-1\`. Floyd must not be used here: without the pigeonhole guarantee it can loop forever or index out of bounds.
- **Empty array** — the set version returns \`-1\` immediately; Floyd's \`nums[0]\` would fail, which again is outside its precondition.
- **The duplicate repeats many times** (\`[2, 2, 2, 2, 2]\`) — every method returns 2; for Floyd, node 2 points to itself, a cycle of length 1.
- **Smallest case** (\`[1, 1]\`) — n = 1, both methods return 1.
- **Negative numbers** (\`[10, -4, 7, -4]\`) — fine for the set and sort methods; the index tricks require values in \`1..n\`.
- **Several different duplicated values** — methods may disagree on which one they return (see section 4). Ask whether any duplicate is acceptable.

## Common Pitfalls

- **\`includes\`/\`indexOf\` instead of a \`Set\`** — linear scans inside a loop turn O(n) into O(n²).
- **\`.sort()\` without a comparator** — sorts numbers as strings; and it mutates the caller's array. Copy and pass \`(a, b) => a - b\`.
- **Running Floyd or negation outside \`1..n\`** — out-of-range reads return \`undefined\` rather than throwing, so the failure is a silent \`undefined\` answer (as in the two runs above) or, for unlucky inputs, an endless loop.
- **Forgetting \`Math.abs\` in the negation trick** — \`a[-3]\` is not "third from the end" in JavaScript, it is a missing property (\`undefined\`), and \`undefined < 0\` is \`false\`, so marks are silently missed.
- **Using \`while\` instead of \`do...while\` for phase 1** — with \`slow === fast\` at the start, a \`while (slow !== fast)\` loop never runs.
- **Expecting all methods to agree** when several values repeat — example 2 shows they may not.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">It depends on the constraints; in general I scan with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> and return the first value it already has — O(n) time, O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The constraint questions:</strong> <span style="color:#f0e2c8;">I ask about the value range, whether I may modify the array, the memory budget, and whether several values can repeat.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The O(1)-space options:</strong> <span style="color:#f0e2c8;">Sort and compare neighbours in O(n log n), or — with values in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1..n</code> — negate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[Math.abs(x)]</code> as a seen-mark in O(n), which modifies the array.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The read-only trick:</strong> <span style="color:#f0e2c8;">With n + 1 values in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1..n</code>, I treat <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i → nums[i]</code> as a linked list; two indices point to the duplicate, so it is the cycle entrance, and Floyd finds it in O(n) time and O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript detail:</strong> <span style="color:#f0e2c8;">I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set.has</code>, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">includes</code> in the loop; I copy and pass a numeric comparator before sorting; and I validate input because bad indices give <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, not an error.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is a duplicate guaranteed in the 1..n version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The pigeonhole principle: n + 1 positions but only n possible values, so two positions must share a value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">do...while</code> for Floyd?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both pointers start at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[0]</code>, so they are equal before any move. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">do...while</code> moves them once before the first comparison; a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while (slow !== fast)</code> would exit immediately.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Set</code> decide two values are the same?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code>: the run above shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN === NaN</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>, yet a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[NaN, 0, NaN, -0]</code> has size 2, so it treats <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code> as equal to itself and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> as equal to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-0</code>. For integers it behaves like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return every repeated value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">counts.set(x, (counts.get(x) || 0) + 1)</code>) and collect keys with count &gt; 1 — O(n) time. Sort the result if the order matters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does Floyd's phase 2 land exactly on the duplicate?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The distance from the start to the cycle entrance equals the distance from the meeting point to the entrance, modulo the cycle length, so stepping both pointers one at a time makes them meet at the entrance — the node with two incoming arrows.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pigeonhole principle** | n + 1 items in n boxes means some box holds two |
| **Hash set** | Distinct values with O(1) average lookup and insert; in JavaScript, \`Set\` |
| **Floyd's cycle detection** | Slow and fast pointers meet in a cycle; a restart finds its entrance |
| **Index marking (negation trick)** | Flip \`nums[v]\` negative to remember that v was seen |
| **Precondition** | What the input must satisfy for the algorithm to be correct |

---
**Conclusion:** "Find a duplicate" is really "which constraints apply?". For any values, a \`Set\` scan is O(n) time and O(n) space and stops at the first repeat. With values in \`1..n\` and n + 1 elements, the pigeonhole principle guarantees a duplicate, and reading the array as \`i → nums[i]\` makes it a linked list whose cycle entrance is the duplicate — Floyd finds it in O(n) time and O(1) space, read-only, with a natural \`do...while\`. In JavaScript, watch for linear \`includes\` calls, \`.sort()\` mutating and sorting as strings, and out-of-range reads that return \`undefined\` instead of failing. The pointer technique is the one from [detecting a cycle in a linked list](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list), and the mirror problem is [finding the missing number](/interview-question/how-do-you-find-the-missing-number-in-0-n).`,
        examples: [
          {
            label: "Hash set (any values) and Floyd cycle detection (values 1..n)",
            code: `function findDuplicateSet(nums) {
  // Any values: return the first value seen twice (scanning left to right), or -1.
  const seen = new Set();
  for (const x of nums) {
    if (seen.has(x)) return x;
    seen.add(x);
  }
  return -1;
}

function findDuplicateFloyd(nums) {
  // Values in 1..n, length n + 1, read-only: O(1) extra space.
  let slow = nums[0], fast = nums[0];
  do {                                // phase 1: find a meeting point inside the cycle
    slow = nums[slow];
    fast = nums[nums[fast]];
  } while (slow !== fast);
  slow = nums[0];                     // phase 2: walk to the cycle entrance
  while (slow !== fast) {
    slow = nums[slow];
    fast = nums[fast];
  }
  return slow;
}

function fmt(a) {
  return '[' + a.join(', ') + ']';
}

for (const nums of [[1, 3, 4, 2, 2], [3, 1, 3, 4, 2], [2, 2, 2, 2, 2], [1, 1], [2, 5, 9, 6, 9, 3, 8, 9, 7, 1]]) {
  console.log(fmt(nums) + ': set=' + findDuplicateSet(nums) + ' floyd=' + findDuplicateFloyd(nums));
}
for (const nums of [[10, -4, 7, -4], [1, 2, 3], []]) {   // outside 1..n: only the set version applies
  console.log(fmt(nums) + ': set=' + findDuplicateSet(nums));
}`,
          },
          {
            label: "Four approaches side by side, with a Floyd trace",
            code: `// Four approaches, plus a trace of Floyd's two phases.

function bySet(nums) {
  const seen = new Set();
  for (const x of nums) {
    if (seen.has(x)) return x;
    seen.add(x);
  }
  return -1;
}

function bySort(nums) {
  const s = [...nums].sort((a, b) => a - b);    // a sorted COPY, numeric comparator
  for (let i = 1; i < s.length; i++) {
    if (s[i] === s[i - 1]) return s[i];
  }
  return -1;
}

function byNegation(nums) {
  const a = [...nums];                          // work on a copy: this method writes to the array
  for (const x of a) {
    const i = Math.abs(x);
    if (a[i] < 0) return i;                     // index i was already marked: value i seen before
    a[i] = -a[i];
  }
  return -1;
}

function byFloyd(nums, trace) {
  let slow = nums[0], fast = nums[0];
  let steps = [];
  do {
    slow = nums[slow];
    fast = nums[nums[fast]];
    steps.push('(' + slow + ',' + fast + ')');
  } while (slow !== fast);
  if (trace) console.log('  phase 1 (slow,fast): ' + steps.join(' '));
  slow = nums[0];
  steps = [];
  while (slow !== fast) {
    slow = nums[slow];
    fast = nums[fast];
    steps.push('(' + slow + ',' + fast + ')');
  }
  if (trace) console.log('  phase 2 (slow,fast): ' + (steps.length ? steps.join(' ') : 'already equal'));
  return slow;
}

function fmt(a) {
  return '[' + a.join(', ') + ']';
}

console.log('trace for [1, 3, 4, 2, 2]:');
console.log('  duplicate = ' + byFloyd([1, 3, 4, 2, 2], true));
for (const nums of [[1, 3, 4, 2, 2], [3, 1, 3, 4, 2], [4, 3, 1, 4, 2], [2, 3, 3, 2, 1]]) {
  console.log(fmt(nums) + ': set=' + bySet(nums) + ' sort=' + bySort(nums) +
    ' negate=' + byNegation(nums) + ' floyd=' + byFloyd(nums, false));
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an \`int[]\`, find a value that appears more than once. Start with the general case; then solve the classic version — n + 1 numbers, each between 1 and n — without modifying the array and using O(1) extra space. Please implement it in Java."

**What a strong answer should cover:**
- Asking about the constraints first: value range, whether the array may be modified, memory budget, one or several repeated values.
- The general answer: scan with a \`HashSet<Integer>\`, return the first value whose \`add\` returns \`false\` — O(n) time, O(n) space.
- The alternatives: sort and compare neighbours (O(n log n)), index negation (O(n), O(1) space, modifies the array), Floyd's cycle detection on \`i → nums[i]\` (O(n), O(1) space, read-only), and the pigeonhole guarantee.
- Why Floyd works: two indices point to the duplicate, so it is the entrance of the cycle.
- Java specifics: \`Set.add\` returns \`false\` for an existing element (one call instead of \`contains\` + \`add\`); every element is autoboxed into the \`HashSet\`; \`Arrays.sort(int[])\` sorts the caller's array in place, so \`clone()\` first if the input must stay intact; Java bounds-checks arrays, so a broken precondition throws.

**Clarifying questions expected:**
- What is the value range? May I modify the array? How much extra space?

**Code / implementation expected:** Yes — a \`HashSet\`-based \`findDuplicate\` in Java, plus the Floyd version for the 1..n constraint.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Java arrays, loops and basic collections; nothing else assumed.
**Difficulty:** Easy (the general version); the O(1)-space Floyd variant is often graded Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by compiling and running the code (\`javac\` and \`java\`, JDK 21); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

A theatre cloakroom has hooks numbered 1 to 4. At the end of the night, the attendant finds **five** coat tickets in the box, each with a hook number written on it. Five tickets, four hooks: at least two tickets **must** name the same hook. Which hook was given out twice?

- The simplest method: read the tickets one by one and keep a checklist of hook numbers already seen. The first number already ticked is the answer. Fast, but you need the checklist.
- If you may rearrange the tickets: sort them; the repeated number ends up next to itself.
- If you may write on the tickets: when you read hook \`h\`, put a mark on ticket number \`h\`. Meeting a ticket that is already marked tells you its number was reached twice.
- And if you may not write anything down at all and must leave the tickets exactly as they are? There is a beautiful trick: treat each ticket as an arrow "go to ticket h". Following the arrows must eventually loop, and the loop starts exactly at the duplicated number.

That is the whole question: the **constraints** (any values or 1..n? may I modify the array? how much extra memory?) decide the method. Interviewers ask "find the duplicate" precisely to see whether you ask about them.

📌 **Interview term: Pigeonhole principle** — if you put n + 1 items into n boxes, at least one box holds two items. It is why an array of length n + 1 with values in \`1..n\` is **guaranteed** to contain a duplicate.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What range are the values in? Is it \`1..n\` with n + 1 elements? | The bounded version enables the O(1)-space tricks (index marking, Floyd). Arbitrary values need a set or a sort. |
| May I modify the array? | Sorting in place or negating entries is O(1) extra space but destroys the input. |
| How much extra memory is allowed? | O(n) allows a hash set — the simplest O(n) solution. O(1) forces sorting, marking or Floyd. |
| Is exactly one value repeated (possibly many times), or can several values repeat? | With several, different methods may return different (all valid) duplicates — example 2 shows it. |
| Return the value, a yes/no, or all duplicates? | "Contains duplicate?" is a set-size check; "all duplicates" needs a count map. |

## 3. The Core Idea

📌 **Interview term: Hash set** — a collection of distinct values with O(1) average "is it in here?" and "add it" operations. Scanning with a set and stopping at the first value already present is the general-purpose answer: O(n) time, O(n) space, works for any values. (How the O(1) lookup works: [How does a hash table work?](/interview-question/how-does-a-hash-table-work))

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="Hash set scan of 3 1 3 4 2. After 3 the set is 3. After 1 the set is 3 and 1. The next 3 is already in the set so the duplicate is 3">
  <text class="d-text" x="330" y="22" text-anchor="middle">Scan left to right, stop at the first value already in the set</text>
  <rect class="d-box" x="60" y="44" width="70" height="44" rx="8"/>
  <text class="d-text" x="95" y="72" text-anchor="middle">3</text>
  <rect class="d-box" x="170" y="44" width="70" height="44" rx="8"/>
  <text class="d-text" x="205" y="72" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="280" y="44" width="70" height="44" rx="8"/>
  <text class="d-text d-accent" x="315" y="72" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="390" y="44" width="70" height="44" rx="8"/>
  <text class="d-sub" x="425" y="72" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="500" y="44" width="70" height="44" rx="8"/>
  <text class="d-sub" x="535" y="72" text-anchor="middle">2</text>
  <text class="d-sub" x="95" y="118" text-anchor="middle">seen: 3</text>
  <text class="d-sub" x="205" y="118" text-anchor="middle">seen: 3, 1</text>
  <text class="d-sub" x="425" y="118" text-anchor="middle">never read</text>
  <rect class="d-box-accent" x="230" y="140" width="170" height="44" rx="8"/>
  <text class="d-text d-accent" x="315" y="168" text-anchor="middle">3 is in seen</text>
</svg>

The scan stops at index 2, so the last two elements are never read. The set version returns the value whose **second** occurrence comes first.

### The O(1)-space trick: the array is a linked list

When the array has n + 1 elements and every value is in \`1..n\`, read each index \`i\` as a node with one arrow pointing to node \`nums[i]\`. Every node has exactly one outgoing arrow, so following arrows from node 0 must eventually repeat a node — it enters a **cycle**. Two different indices hold the duplicate value \`d\`, so node \`d\` has two incoming arrows: one from the path, one from inside the loop. That makes \`d\` exactly the node where the path **enters** the cycle.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 210" role="img" aria-label="Index graph for 1 3 4 2 2. Index 0 points to 1, 1 points to 3, 3 points to 2, 2 points to 4, and 4 points back to 2. The cycle is 2 and 4 and its entrance is 2, the duplicate">
  <defs>
    <marker id="fd05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="330" y="22" text-anchor="middle">nums = [1,3,4,2,2]</text>
  <circle class="d-box" cx="70" cy="110" r="28"/>
  <text class="d-text" x="70" y="115" text-anchor="middle">0</text>
  <circle class="d-box" cx="190" cy="110" r="28"/>
  <text class="d-text" x="190" y="115" text-anchor="middle">1</text>
  <circle class="d-box" cx="310" cy="110" r="28"/>
  <text class="d-text" x="310" y="115" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="430" cy="110" r="28"/>
  <text class="d-text d-accent" x="430" y="115" text-anchor="middle">2</text>
  <circle class="d-box" cx="570" cy="110" r="28"/>
  <text class="d-text" x="570" y="115" text-anchor="middle">4</text>
  <path class="d-edge" d="M 100 110 L 156 110" marker-end="url(#fd05-arrow)"/>
  <path class="d-edge" d="M 220 110 L 276 110" marker-end="url(#fd05-arrow)"/>
  <path class="d-edge" d="M 340 110 L 396 110" marker-end="url(#fd05-arrow)"/>
  <path class="d-edge-accent" d="M 460 102 L 536 102" marker-end="url(#fd05-arrow)"/>
  <path class="d-edge-accent" d="M 556 136 C 530 180, 470 180, 446 140" marker-end="url(#fd05-arrow)"/>
  <text class="d-sub" x="500" y="66" text-anchor="middle">cycle</text>
  <text class="d-sub" x="430" y="196" text-anchor="middle">entrance = duplicate</text>
</svg>

Each node is an index, with an arrow to the index named by its value. Index 3 and index 4 both hold the value 2, so node 2 has two incoming arrows (from 3 and from 4), and it is where the path from 0 enters the loop 2 → 4 → 2. Node 0 is a safe start because no value is 0, so nothing points back to it.

📌 **Interview term: Floyd's cycle detection (tortoise and hare)** — two pointers move along the arrows, \`slow\` one step at a time and \`fast\` two. Inside the cycle \`fast\` gains one step per move, so they must meet. Then restart \`slow\` from the beginning and move both one step at a time: they meet exactly at the cycle entrance. The full proof is in [the fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique) and [finding where a linked-list cycle begins](/interview-question/how-do-you-find-the-node-where-a-linked-list-cycle-begins); here the "linked list" is just the array read as \`i → nums[i]\`.

## 4. Choosing the Approach by Constraint

| Constraints | Method | Time | Extra space | Modifies input? |
| :--- | :--- | :--- | :--- | :--- |
| Any values (the general case) | Hash set, stop at first repeat | O(n) | O(n) | No |
| Any values, O(1) space, modifying allowed | Sort in place, compare neighbours | O(n log n) | O(1)* | Yes |
| Values in \`1..n\`, modifying allowed | Negate \`nums[abs(x)]\` as a "seen" mark | O(n) | O(1) | Yes (restorable) |
| Values in \`1..n\`, read-only, O(1) space | Floyd cycle detection on \`i → nums[i]\` | O(n) | O(1) | No |
| Brute force | Compare every pair | O(n²) | O(1) | No |

\\* O(1) beyond whatever the sort itself uses internally; sorting a copy costs O(n).

📌 **Interview term: Index marking (negation trick)** — when values are valid indices, you can record "value v was seen" by flipping the sign of \`nums[v]\`. Reading \`x\`, look at \`nums[abs(x)]\`: if it is already negative, \`abs(x)\` has been seen before. It needs values ≥ 1 (a \`0\` cannot be negated into a mark) and it writes to the array, so restore the signs afterwards if the caller needs the input back.

**When several values repeat, the answers can differ — and all are correct.** The set returns the value whose second copy appears first; sorting returns the **smallest** repeated value; negation returns the first value it meets twice in its own scan order; Floyd returns whichever duplicate is the entrance of the cycle reachable from index 0. Example 2 runs all four on \`[2, 3, 3, 2, 1]\` and gets \`3, 2, 3, 2\`. If the problem says "exactly one value repeats" (the usual statement), they all agree.

**Related variants.** "Does any duplicate exist?" is the same scan returning a boolean (or a one-line set-size comparison). "Find all duplicates" uses a count map ([top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements) uses the same counting). "Find the missing number" in \`0..n\` is the mirror problem, solved with a sum or XOR: [How do you find the missing number in 0..n?](/interview-question/how-do-you-find-the-missing-number-in-0-n)

## 5. The Code in Java

~~~java
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class Main {
    // Any values: return the first value seen twice (scanning left to right), or -1.
    static int findDuplicateSet(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int x : nums) {
            if (!seen.add(x)) return x;      // add() returns false when x was already there
        }
        return -1;
    }

    // Values in 1..n, length n + 1, read-only: O(1) extra space.
    static int findDuplicateFloyd(int[] nums) {
        int slow = nums[0], fast = nums[0];
        do {                                 // phase 1: find a meeting point inside the cycle
            slow = nums[slow];
            fast = nums[nums[fast]];
        } while (slow != fast);
        slow = nums[0];                      // phase 2: walk to the cycle entrance
        while (slow != fast) {
            slow = nums[slow];
            fast = nums[fast];
        }
        return slow;
    }

    public static void main(String[] args) {
        int[][] bounded = {{1, 3, 4, 2, 2}, {3, 1, 3, 4, 2}, {2, 2, 2, 2, 2}, {1, 1}, {2, 5, 9, 6, 9, 3, 8, 9, 7, 1}};
        for (int[] nums : bounded) {
            System.out.println(Arrays.toString(nums) + ": set=" + findDuplicateSet(nums) + " floyd=" + findDuplicateFloyd(nums));
        }
        int[][] general = {{10, -4, 7, -4}, {1, 2, 3}, {}};   // outside 1..n: only the set version applies
        for (int[] nums : general) {
            System.out.println(Arrays.toString(nums) + ": set=" + findDuplicateSet(nums));
        }
    }
}
~~~

- **\`if (!seen.add(x)) return x;\`** — \`Set.add\` returns \`true\` if the element was added and \`false\` if it was already present. One hash lookup does both the "have I seen it?" test and the insert.
- **\`Set<Integer>\`** — collections hold objects, so each \`int\` is autoboxed into an \`Integer\`. That is fine for correctness, but it allocates for most values and is the main reason the O(1)-space methods are also faster in practice in Java.
- **\`do { ... } while (slow != fast);\`** — Java's \`do...while\` is the natural shape of Floyd's phase 1: both pointers start equal and must move once before the first comparison. Comparing \`int\`s with \`!=\` is a value comparison; it would **not** be if \`slow\` and \`fast\` were \`Integer\`s.
- **\`Arrays.toString(nums)\`** prints \`[1, 3, 4, 2, 2]\`; printing the array directly prints a type tag and hash.

📌 **Interview term: Precondition** — a condition the input must satisfy for the algorithm to be correct. Floyd's precondition is "length n + 1, values in \`1..n\`". Java checks every array index, so breaking it fails loudly rather than silently:

~~~java
public class Main {
    static int findDuplicateFloyd(int[] nums) {
        int slow = nums[0], fast = nums[0];
        do {
            slow = nums[slow];
            fast = nums[nums[fast]];
        } while (slow != fast);
        slow = nums[0];
        while (slow != fast) {
            slow = nums[slow];
            fast = nums[fast];
        }
        return slow;
    }

    public static void main(String[] args) {
        try {
            findDuplicateFloyd(new int[]{1, 2, 3});           // breaks the 1..n, length n + 1 rule
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("ArrayIndexOutOfBoundsException: " + e.getMessage());
        }
    }
}
~~~

~~~text
ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3
~~~

That is better than a wrong answer, but it is still a crash — check the precondition (or use the \`HashSet\` version) when the input is not guaranteed.

Two Java idioms for related variants, checked by running them:

~~~java
import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[] nums = {4, 1, 4, 2, 1, 4};
        System.out.println(Arrays.stream(nums).distinct().count() != nums.length);  // any duplicate?
        int[] mine = {3, 1, 3, 2};
        Arrays.sort(mine);                                 // sorts the CALLER'S array in place
        System.out.println(Arrays.toString(mine));
    }
}
~~~

~~~text
true
[1, 2, 3, 3]
~~~

\`Arrays.stream(nums).distinct().count() != nums.length\` answers "is there any duplicate?" in one line. The second line shows that \`Arrays.sort\` rearranged the caller's own array — which is why \`bySort\` and \`byNegation\` in example 2 work on \`nums.clone()\`.

## 6. Verified: Running the Code

Both examples were saved as \`Main.java\` and run with \`javac Main.java && java Main\` (JDK 21). Example 1 — the set and Floyd versions on bounded inputs, then the set version on three inputs outside \`1..n\`:

~~~text
[1, 3, 4, 2, 2]: set=2 floyd=2
[3, 1, 3, 4, 2]: set=3 floyd=3
[2, 2, 2, 2, 2]: set=2 floyd=2
[1, 1]: set=1 floyd=1
[2, 5, 9, 6, 9, 3, 8, 9, 7, 1]: set=9 floyd=9
[10, -4, 7, -4]: set=-4
[1, 2, 3]: set=-1
[]: set=-1
~~~

Example 2 — a trace of Floyd's two phases, then all four approaches side by side:

~~~text
trace for [1, 3, 4, 2, 2]:
  phase 1 (slow,fast): (3,2) (2,2)
  phase 2 (slow,fast): (3,4) (2,2)
  duplicate = 2
[1, 3, 4, 2, 2]: set=2 sort=2 negate=2 floyd=2
[3, 1, 3, 4, 2]: set=3 sort=3 negate=3 floyd=3
[4, 3, 1, 4, 2]: set=4 sort=4 negate=4 floyd=4
[2, 3, 3, 2, 1]: set=3 sort=2 negate=3 floyd=2
~~~

The trace matches the index-graph diagram: phase 1 meets at 2 inside the cycle; phase 2 walks \`slow\` from the start and \`fast\` around the loop until both are at 2. The last line is the "several duplicates" case: \`[2, 3, 3, 2, 1]\` returns \`3, 2, 3, 2\` — each a correct duplicate.

## 7. Complexity

| Method | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`HashSet\` scan | O(n) average | O(n) | One O(1)-average \`add\` per element, each a boxed \`Integer\` |
| \`clone()\` + \`Arrays.sort\` + neighbours | O(n log n) | O(n) for the clone | Sorting in place without the clone would need no extra array |
| Index negation | O(n) | O(1) (O(n) here, because the example clones) | One read and one write per element |
| Floyd | O(n) | O(1) | Each phase is at most a constant multiple of n steps; no allocation |
| Brute force pairs | O(n²) | O(1) | n(n−1)/2 comparisons |

For the meaning of these labels, see [What is Big-O notation?](/interview-question/what-is-big-o-notation)

## Edge Cases

- **No duplicate** (\`[1, 2, 3]\`) — only possible when the values are not bounded to \`1..n\` with n + 1 elements; the set version returns \`-1\`. Floyd must not be used here: without the pigeonhole guarantee it can loop forever or index out of bounds.
- **Empty array** — the set version returns \`-1\` immediately; Floyd's \`nums[0]\` would fail, which again is outside its precondition.
- **The duplicate repeats many times** (\`[2, 2, 2, 2, 2]\`) — every method returns 2; for Floyd, node 2 points to itself, a cycle of length 1.
- **Smallest case** (\`[1, 1]\`) — n = 1, both methods return 1.
- **Negative numbers** (\`[10, -4, 7, -4]\`) — fine for the set and sort methods; the index tricks require values in \`1..n\`.
- **Several different duplicated values** — methods may disagree on which one they return (see section 4). Ask whether any duplicate is acceptable.

## Common Pitfalls

- **\`contains\` then \`add\`** — two hash lookups where \`add\`'s return value gives you the answer in one.
- **\`Arrays.sort(nums)\` on the caller's array** when the input must not change — clone first, or pick Floyd.
- **Running Floyd or negation outside \`1..n\`** — throws \`ArrayIndexOutOfBoundsException\`, as the run above shows.
- **Comparing boxed values with \`==\`** — if you ever store the pointers or results as \`Integer\`, \`==\` compares references; keep them as \`int\`.
- **Using \`while\` instead of \`do...while\` for phase 1** — both pointers start equal, so a \`while (slow != fast)\` loop never runs.
- **Expecting all methods to agree** when several values repeat — example 2 shows they may not.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">It depends on the constraints; in general I scan with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet&lt;Integer&gt;</code> and return the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> for which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen.add(x)</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> — O(n) time, O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The constraint questions:</strong> <span style="color:#f0e2c8;">I ask about the value range, whether I may modify the array, the memory budget, and whether several values can repeat.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The O(1)-space options:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort</code> and compare neighbours in O(n log n), or — with values in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1..n</code> — negate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[Math.abs(x)]</code> as a seen-mark in O(n); both modify the array.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The read-only trick:</strong> <span style="color:#f0e2c8;">With n + 1 values in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1..n</code>, I treat <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i → nums[i]</code> as a linked list; two indices point to the duplicate, so it is the cycle entrance, and Floyd finds it in O(n) time and O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add</code> returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> saves a second lookup, the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet</code> boxes every element, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort</code> sorts the caller's array, so I <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clone()</code> when the input must survive.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is a duplicate guaranteed in the 1..n version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The pigeonhole principle: n + 1 positions but only n possible values, so two positions must share a value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you run Floyd on an array that breaks the precondition?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Java bounds-checks, so it throws — the run above printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1, 2, 3}</code>. I would validate the input or fall back to the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet</code> version.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does Floyd's phase 2 land exactly on the duplicate?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The distance from the start to the cycle entrance equals the distance from the meeting point to the entrance, modulo the cycle length, so stepping both one at a time makes them meet at the entrance — the node with two incoming arrows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return all repeated values?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Integer, Integer&gt;</code> using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">merge(x, 1, Integer::sum)</code> and collect keys with count &gt; 1, or in the 1..n version collect every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.abs(x)</code> whose slot is already negative. Both O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashSet</code> version slow in Java?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is O(n), but each element is boxed and hashed, so its constant factor is much higher than Floyd's two array reads per step. For large primitive arrays where the constraint holds, Floyd or negation is the faster choice.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pigeonhole principle** | n + 1 items in n boxes means some box holds two |
| **Hash set** | Distinct values with O(1) average lookup and insert; in Java, \`HashSet\` |
| **Floyd's cycle detection** | Slow and fast pointers meet in a cycle; a restart finds its entrance |
| **Index marking (negation trick)** | Flip \`nums[v]\` negative to remember that v was seen |
| **Precondition** | What the input must satisfy for the algorithm to be correct |

---
**Conclusion:** "Find a duplicate" is really "which constraints apply?". For any values, a \`HashSet\` scan with \`if (!seen.add(x)) return x;\` is O(n) time and O(n) space. With values in \`1..n\` and n + 1 elements, the pigeonhole principle guarantees a duplicate, and reading the array as \`i → nums[i]\` makes it a linked list whose cycle entrance is the duplicate — Floyd finds it in O(n) time and O(1) space, read-only, with no boxing at all. In Java, remember that \`Arrays.sort\` mutates the caller's array, that \`add\` already tells you about duplicates, and that a broken precondition throws \`ArrayIndexOutOfBoundsException\`. The pointer technique is the one from [detecting a cycle in a linked list](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list), and the mirror problem is [finding the missing number](/interview-question/how-do-you-find-the-missing-number-in-0-n).`,
        examples: [
          {
            label: "Hash set (any values) and Floyd cycle detection (values 1..n)",
            code: `import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class Main {
    // Any values: return the first value seen twice (scanning left to right), or -1.
    static int findDuplicateSet(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int x : nums) {
            if (!seen.add(x)) return x;      // add() returns false when x was already there
        }
        return -1;
    }

    // Values in 1..n, length n + 1, read-only: O(1) extra space.
    static int findDuplicateFloyd(int[] nums) {
        int slow = nums[0], fast = nums[0];
        do {                                 // phase 1: find a meeting point inside the cycle
            slow = nums[slow];
            fast = nums[nums[fast]];
        } while (slow != fast);
        slow = nums[0];                      // phase 2: walk to the cycle entrance
        while (slow != fast) {
            slow = nums[slow];
            fast = nums[fast];
        }
        return slow;
    }

    public static void main(String[] args) {
        int[][] bounded = {{1, 3, 4, 2, 2}, {3, 1, 3, 4, 2}, {2, 2, 2, 2, 2}, {1, 1}, {2, 5, 9, 6, 9, 3, 8, 9, 7, 1}};
        for (int[] nums : bounded) {
            System.out.println(Arrays.toString(nums) + ": set=" + findDuplicateSet(nums) + " floyd=" + findDuplicateFloyd(nums));
        }
        int[][] general = {{10, -4, 7, -4}, {1, 2, 3}, {}};   // outside 1..n: only the set version applies
        for (int[] nums : general) {
            System.out.println(Arrays.toString(nums) + ": set=" + findDuplicateSet(nums));
        }
    }
}`,
          },
          {
            label: "Four approaches side by side, with a Floyd trace",
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class Main {
    // Four approaches, plus a trace of Floyd's two phases.

    static int bySet(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int x : nums) if (!seen.add(x)) return x;
        return -1;
    }

    static int bySort(int[] nums) {
        int[] s = nums.clone();                   // a sorted COPY; nums is untouched
        Arrays.sort(s);
        for (int i = 1; i < s.length; i++) if (s[i] == s[i - 1]) return s[i];
        return -1;
    }

    static int byNegation(int[] nums) {
        int[] a = nums.clone();                   // work on a copy: this method writes to the array
        for (int x : a) {
            int i = Math.abs(x);
            if (a[i] < 0) return i;               // index i was already marked: value i seen before
            a[i] = -a[i];
        }
        return -1;
    }

    static int byFloyd(int[] nums, boolean trace) {
        int slow = nums[0], fast = nums[0];
        List<String> steps = new ArrayList<>();
        do {
            slow = nums[slow];
            fast = nums[nums[fast]];
            steps.add("(" + slow + "," + fast + ")");
        } while (slow != fast);
        if (trace) System.out.println("  phase 1 (slow,fast): " + String.join(" ", steps));
        slow = nums[0];
        steps.clear();
        while (slow != fast) {
            slow = nums[slow];
            fast = nums[fast];
            steps.add("(" + slow + "," + fast + ")");
        }
        if (trace) System.out.println("  phase 2 (slow,fast): " + (steps.isEmpty() ? "already equal" : String.join(" ", steps)));
        return slow;
    }

    public static void main(String[] args) {
        System.out.println("trace for [1, 3, 4, 2, 2]:");
        int d = byFloyd(new int[]{1, 3, 4, 2, 2}, true);
        System.out.println("  duplicate = " + d);
        int[][] tests = {{1, 3, 4, 2, 2}, {3, 1, 3, 4, 2}, {4, 3, 1, 4, 2}, {2, 3, 3, 2, 1}};
        for (int[] nums : tests) {
            System.out.println(Arrays.toString(nums) + ": set=" + bySet(nums) + " sort=" + bySort(nums)
                + " negate=" + byNegation(nums) + " floyd=" + byFloyd(nums, false));
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a \`std::vector<int>\`, find a value that appears more than once. Start with the general case; then solve the classic version — n + 1 numbers, each between 1 and n — without modifying the vector and using O(1) extra space. Please write it in C++."

**What a strong answer should cover:**
- Asking about the constraints first: value range, whether the vector may be modified, memory budget, one or several repeated values.
- The general answer: scan with an \`unordered_set<int>\`, return the first value whose \`insert(x).second\` is \`false\` — O(n) time, O(n) space.
- The alternatives: \`std::sort\` plus \`std::adjacent_find\` (O(n log n)), index negation (O(n), O(1) space, modifies the vector), Floyd's cycle detection on \`i → nums[i]\` (O(n), O(1) space, read-only), and the pigeonhole guarantee.
- Why Floyd works: two indices point to the duplicate, so it is the entrance of the cycle.
- C++ specifics: \`insert\` returns a \`pair<iterator, bool>\`; pass by \`const&\` when you only read and by value when you need a scratch copy; \`operator[]\` on a \`vector\` does not bounds-check, so a broken precondition is undefined behaviour (use \`.at()\` while testing).

**Clarifying questions expected:**
- What is the value range? May I modify the vector? How much extra space?

**Code / implementation expected:** Yes — an \`unordered_set\`-based \`findDuplicate\` in C++17, plus the Floyd version for the 1..n constraint.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know basic C++ (\`std::vector\`, loops, functions); nothing else assumed.
**Difficulty:** Easy (the general version); the O(1)-space Floyd variant is often graded Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by compiling and running the code with \`g++ -std=c++17\` (GCC 13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

A theatre cloakroom has hooks numbered 1 to 4. At the end of the night, the attendant finds **five** coat tickets in the box, each with a hook number written on it. Five tickets, four hooks: at least two tickets **must** name the same hook. Which hook was given out twice?

- The simplest method: read the tickets one by one and keep a checklist of hook numbers already seen. The first number already ticked is the answer. Fast, but you need the checklist.
- If you may rearrange the tickets: sort them; the repeated number ends up next to itself.
- If you may write on the tickets: when you read hook \`h\`, put a mark on ticket number \`h\`. Meeting a ticket that is already marked tells you its number was reached twice.
- And if you may not write anything down at all and must leave the tickets exactly as they are? There is a beautiful trick: treat each ticket as an arrow "go to ticket h". Following the arrows must eventually loop, and the loop starts exactly at the duplicated number.

That is the whole question: the **constraints** (any values or 1..n? may I modify the array? how much extra memory?) decide the method. Interviewers ask "find the duplicate" precisely to see whether you ask about them.

📌 **Interview term: Pigeonhole principle** — if you put n + 1 items into n boxes, at least one box holds two items. It is why an array of length n + 1 with values in \`1..n\` is **guaranteed** to contain a duplicate.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What range are the values in? Is it \`1..n\` with n + 1 elements? | The bounded version enables the O(1)-space tricks (index marking, Floyd). Arbitrary values need a set or a sort. |
| May I modify the array? | Sorting in place or negating entries is O(1) extra space but destroys the input. |
| How much extra memory is allowed? | O(n) allows a hash set — the simplest O(n) solution. O(1) forces sorting, marking or Floyd. |
| Is exactly one value repeated (possibly many times), or can several values repeat? | With several, different methods may return different (all valid) duplicates — example 2 shows it. |
| Return the value, a yes/no, or all duplicates? | "Contains duplicate?" is a set-size check; "all duplicates" needs a count map. |

## 3. The Core Idea

📌 **Interview term: Hash set** — a collection of distinct values with O(1) average "is it in here?" and "add it" operations. Scanning with a set and stopping at the first value already present is the general-purpose answer: O(n) time, O(n) space, works for any values. (How the O(1) lookup works: [How does a hash table work?](/interview-question/how-does-a-hash-table-work))

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="Hash set scan of 3 1 3 4 2. After 3 the set is 3. After 1 the set is 3 and 1. The next 3 is already in the set so the duplicate is 3">
  <text class="d-text" x="330" y="22" text-anchor="middle">Scan left to right, stop at the first value already in the set</text>
  <rect class="d-box" x="60" y="44" width="70" height="44" rx="8"/>
  <text class="d-text" x="95" y="72" text-anchor="middle">3</text>
  <rect class="d-box" x="170" y="44" width="70" height="44" rx="8"/>
  <text class="d-text" x="205" y="72" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="280" y="44" width="70" height="44" rx="8"/>
  <text class="d-text d-accent" x="315" y="72" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="390" y="44" width="70" height="44" rx="8"/>
  <text class="d-sub" x="425" y="72" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="500" y="44" width="70" height="44" rx="8"/>
  <text class="d-sub" x="535" y="72" text-anchor="middle">2</text>
  <text class="d-sub" x="95" y="118" text-anchor="middle">seen: 3</text>
  <text class="d-sub" x="205" y="118" text-anchor="middle">seen: 3, 1</text>
  <text class="d-sub" x="425" y="118" text-anchor="middle">never read</text>
  <rect class="d-box-accent" x="230" y="140" width="170" height="44" rx="8"/>
  <text class="d-text d-accent" x="315" y="168" text-anchor="middle">3 is in seen</text>
</svg>

The scan stops at index 2, so the last two elements are never read. The set version returns the value whose **second** occurrence comes first.

### The O(1)-space trick: the array is a linked list

When the array has n + 1 elements and every value is in \`1..n\`, read each index \`i\` as a node with one arrow pointing to node \`nums[i]\`. Every node has exactly one outgoing arrow, so following arrows from node 0 must eventually repeat a node — it enters a **cycle**. Two different indices hold the duplicate value \`d\`, so node \`d\` has two incoming arrows: one from the path, one from inside the loop. That makes \`d\` exactly the node where the path **enters** the cycle.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 210" role="img" aria-label="Index graph for 1 3 4 2 2. Index 0 points to 1, 1 points to 3, 3 points to 2, 2 points to 4, and 4 points back to 2. The cycle is 2 and 4 and its entrance is 2, the duplicate">
  <defs>
    <marker id="fd05-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="330" y="22" text-anchor="middle">nums = [1,3,4,2,2]</text>
  <circle class="d-box" cx="70" cy="110" r="28"/>
  <text class="d-text" x="70" y="115" text-anchor="middle">0</text>
  <circle class="d-box" cx="190" cy="110" r="28"/>
  <text class="d-text" x="190" y="115" text-anchor="middle">1</text>
  <circle class="d-box" cx="310" cy="110" r="28"/>
  <text class="d-text" x="310" y="115" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="430" cy="110" r="28"/>
  <text class="d-text d-accent" x="430" y="115" text-anchor="middle">2</text>
  <circle class="d-box" cx="570" cy="110" r="28"/>
  <text class="d-text" x="570" y="115" text-anchor="middle">4</text>
  <path class="d-edge" d="M 100 110 L 156 110" marker-end="url(#fd05-arrow)"/>
  <path class="d-edge" d="M 220 110 L 276 110" marker-end="url(#fd05-arrow)"/>
  <path class="d-edge" d="M 340 110 L 396 110" marker-end="url(#fd05-arrow)"/>
  <path class="d-edge-accent" d="M 460 102 L 536 102" marker-end="url(#fd05-arrow)"/>
  <path class="d-edge-accent" d="M 556 136 C 530 180, 470 180, 446 140" marker-end="url(#fd05-arrow)"/>
  <text class="d-sub" x="500" y="66" text-anchor="middle">cycle</text>
  <text class="d-sub" x="430" y="196" text-anchor="middle">entrance = duplicate</text>
</svg>

Each node is an index, with an arrow to the index named by its value. Index 3 and index 4 both hold the value 2, so node 2 has two incoming arrows (from 3 and from 4), and it is where the path from 0 enters the loop 2 → 4 → 2. Node 0 is a safe start because no value is 0, so nothing points back to it.

📌 **Interview term: Floyd's cycle detection (tortoise and hare)** — two pointers move along the arrows, \`slow\` one step at a time and \`fast\` two. Inside the cycle \`fast\` gains one step per move, so they must meet. Then restart \`slow\` from the beginning and move both one step at a time: they meet exactly at the cycle entrance. The full proof is in [the fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique) and [finding where a linked-list cycle begins](/interview-question/how-do-you-find-the-node-where-a-linked-list-cycle-begins); here the "linked list" is just the array read as \`i → nums[i]\`.

## 4. Choosing the Approach by Constraint

| Constraints | Method | Time | Extra space | Modifies input? |
| :--- | :--- | :--- | :--- | :--- |
| Any values (the general case) | Hash set, stop at first repeat | O(n) | O(n) | No |
| Any values, O(1) space, modifying allowed | Sort in place, compare neighbours | O(n log n) | O(1)* | Yes |
| Values in \`1..n\`, modifying allowed | Negate \`nums[abs(x)]\` as a "seen" mark | O(n) | O(1) | Yes (restorable) |
| Values in \`1..n\`, read-only, O(1) space | Floyd cycle detection on \`i → nums[i]\` | O(n) | O(1) | No |
| Brute force | Compare every pair | O(n²) | O(1) | No |

\\* O(1) beyond whatever the sort itself uses internally; sorting a copy costs O(n).

📌 **Interview term: Index marking (negation trick)** — when values are valid indices, you can record "value v was seen" by flipping the sign of \`nums[v]\`. Reading \`x\`, look at \`nums[abs(x)]\`: if it is already negative, \`abs(x)\` has been seen before. It needs values ≥ 1 (a \`0\` cannot be negated into a mark) and it writes to the array, so restore the signs afterwards if the caller needs the input back.

**When several values repeat, the answers can differ — and all are correct.** The set returns the value whose second copy appears first; sorting returns the **smallest** repeated value; negation returns the first value it meets twice in its own scan order; Floyd returns whichever duplicate is the entrance of the cycle reachable from index 0. Example 2 runs all four on \`[2, 3, 3, 2, 1]\` and gets \`3, 2, 3, 2\`. If the problem says "exactly one value repeats" (the usual statement), they all agree.

**Related variants.** "Does any duplicate exist?" is the same scan returning a boolean (or a one-line set-size comparison). "Find all duplicates" uses a count map ([top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements) uses the same counting). "Find the missing number" in \`0..n\` is the mirror problem, solved with a sum or XOR: [How do you find the missing number in 0..n?](/interview-question/how-do-you-find-the-missing-number-in-0-n)

## 5. The Code in C++

~~~cpp
#include <iostream>
#include <string>
#include <unordered_set>
#include <vector>
using namespace std;

// Any values: return the first value seen twice (scanning left to right), or -1.
int findDuplicateSet(const vector<int>& nums) {
    unordered_set<int> seen;
    for (int x : nums) {
        if (!seen.insert(x).second) return x;    // insert().second is false when x was already there
    }
    return -1;
}

// Values in 1..n, length n + 1, read-only: O(1) extra space.
int findDuplicateFloyd(const vector<int>& nums) {
    int slow = nums[0], fast = nums[0];
    do {                                         // phase 1: find a meeting point inside the cycle
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow != fast);
    slow = nums[0];                              // phase 2: walk to the cycle entrance
    while (slow != fast) {
        slow = nums[slow];
        fast = nums[fast];
    }
    return slow;
}

string fmt(const vector<int>& a) {
    string s = "[";
    for (size_t i = 0; i < a.size(); i++) s += (i ? ", " : "") + to_string(a[i]);
    return s + "]";
}

int main() {
    vector<vector<int>> bounded = {{1, 3, 4, 2, 2}, {3, 1, 3, 4, 2}, {2, 2, 2, 2, 2}, {1, 1}, {2, 5, 9, 6, 9, 3, 8, 9, 7, 1}};
    for (const auto& nums : bounded) {
        cout << fmt(nums) << ": set=" << findDuplicateSet(nums) << " floyd=" << findDuplicateFloyd(nums) << endl;
    }
    vector<vector<int>> general = {{10, -4, 7, -4}, {1, 2, 3}, {}};   // outside 1..n: only the set version applies
    for (const auto& nums : general) {
        cout << fmt(nums) << ": set=" << findDuplicateSet(nums) << endl;
    }
    return 0;
}
~~~

- **\`seen.insert(x).second\`** — \`insert\` returns a \`pair<iterator, bool>\`; the \`bool\` is \`false\` when \`x\` was already present. One hash lookup does both the test and the insert.
- **\`const vector<int>& nums\`** — both functions only read, so they take a const reference: no copy, and the compiler stops you from modifying the input by accident. In example 2, \`bySort(vector<int> s)\` and \`byNegation(vector<int> a)\` deliberately take their parameter **by value**, which gives each a private copy to sort or mark.
- **\`do { ... } while (slow != fast);\`** — the natural shape of Floyd's phase 1: both pointers start equal and must move once before the first comparison.
- The second loop runs only the set version: \`{10, -4, 7, -4}\` and \`{1, 2, 3}\` break Floyd's precondition.

📌 **Interview term: Precondition (and undefined behaviour)** — Floyd requires "length n + 1, values in \`1..n\`". With \`nums[i]\`, an out-of-range index is **undefined behaviour**: no error is guaranteed, and the program may print garbage, crash or appear to work. While testing, \`.at(i)\` bounds-checks and throws instead:

~~~cpp
#include <iostream>
#include <stdexcept>
#include <vector>
using namespace std;

int findDuplicateFloydChecked(const vector<int>& nums) {   // .at() instead of [] while testing
    int slow = nums.at(0), fast = nums.at(0);
    do {
        slow = nums.at(slow);
        fast = nums.at(nums.at(fast));
    } while (slow != fast);
    slow = nums.at(0);
    while (slow != fast) {
        slow = nums.at(slow);
        fast = nums.at(fast);
    }
    return slow;
}

int main() {
    try {
        findDuplicateFloydChecked({1, 2, 3});                // breaks the 1..n, length n + 1 rule
    } catch (const out_of_range&) {
        cout << "at() threw std::out_of_range" << endl;
    }
    cout << findDuplicateFloydChecked({1, 3, 4, 2, 2}) << endl;
}
~~~

~~~text
at() threw std::out_of_range
2
~~~

The checked version still returns 2 on valid input. Switch back to \`[]\` once the precondition is guaranteed, if speed matters.

The standard-library way to do the sort approach, checked by running it:

~~~cpp
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {4, 1, 4, 2, 1, 4};
    vector<int> s = nums;                                   // copy, so the input stays as it was
    sort(s.begin(), s.end());
    auto it = adjacent_find(s.begin(), s.end());            // first pair of equal neighbours
    cout << (it != s.end() ? *it : -1) << endl;
    cout << nums[0] << " " << nums[1] << endl;              // the original order is untouched
}
~~~

~~~text
1
4 1
~~~

\`std::adjacent_find\` returns an iterator to the first element equal to its neighbour, or \`end()\` if there is none — exactly "compare neighbours after sorting". Sorting the copy \`s\` left \`nums\` in its original order (\`4 1\`).

## 6. Verified: Running the Code

Both examples were saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). Example 1 — the set and Floyd versions on bounded inputs, then the set version on three inputs outside \`1..n\`:

~~~text
[1, 3, 4, 2, 2]: set=2 floyd=2
[3, 1, 3, 4, 2]: set=3 floyd=3
[2, 2, 2, 2, 2]: set=2 floyd=2
[1, 1]: set=1 floyd=1
[2, 5, 9, 6, 9, 3, 8, 9, 7, 1]: set=9 floyd=9
[10, -4, 7, -4]: set=-4
[1, 2, 3]: set=-1
[]: set=-1
~~~

Example 2 — a trace of Floyd's two phases, then all four approaches side by side:

~~~text
trace for [1, 3, 4, 2, 2]:
  phase 1 (slow,fast): (3,2) (2,2)
  phase 2 (slow,fast): (3,4) (2,2)
  duplicate = 2
[1, 3, 4, 2, 2]: set=2 sort=2 negate=2 floyd=2
[3, 1, 3, 4, 2]: set=3 sort=3 negate=3 floyd=3
[4, 3, 1, 4, 2]: set=4 sort=4 negate=4 floyd=4
[2, 3, 3, 2, 1]: set=3 sort=2 negate=3 floyd=2
~~~

The trace matches the index-graph diagram: phase 1 meets at 2 inside the cycle; phase 2 walks \`slow\` from the start and \`fast\` around the loop until both are at 2. The last line is the "several duplicates" case: \`{2, 3, 3, 2, 1}\` returns \`3, 2, 3, 2\` — each a correct duplicate. The long \`cout << ... << byFloyd(nums, false)\` chain is safe to rely on for ordering because C++17 sequences the operands of \`<<\` left to right.

## 7. Complexity

| Method | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`unordered_set\` scan | O(n) average | O(n) | One O(1)-average \`insert\` per element (one node allocation each) |
| Sort copy + \`adjacent_find\` | O(n log n) | O(n) for the copy | Sorting in place without the copy needs no extra vector |
| Index negation | O(n) | O(1) (O(n) here, because the example copies) | One read and one write per element |
| Floyd | O(n) | O(1) | Each phase is at most a constant multiple of n steps; no allocation |
| Brute force pairs | O(n²) | O(1) | n(n−1)/2 comparisons |

For the meaning of these labels, see [What is Big-O notation?](/interview-question/what-is-big-o-notation)

## Edge Cases

- **No duplicate** (\`[1, 2, 3]\`) — only possible when the values are not bounded to \`1..n\` with n + 1 elements; the set version returns \`-1\`. Floyd must not be used here: without the pigeonhole guarantee it can loop forever or index out of bounds.
- **Empty array** — the set version returns \`-1\` immediately; Floyd's \`nums[0]\` would fail, which again is outside its precondition.
- **The duplicate repeats many times** (\`[2, 2, 2, 2, 2]\`) — every method returns 2; for Floyd, node 2 points to itself, a cycle of length 1.
- **Smallest case** (\`[1, 1]\`) — n = 1, both methods return 1.
- **Negative numbers** (\`[10, -4, 7, -4]\`) — fine for the set and sort methods; the index tricks require values in \`1..n\`.
- **Several different duplicated values** — methods may disagree on which one they return (see section 4). Ask whether any duplicate is acceptable.

## Common Pitfalls

- **\`count(x)\` then \`insert(x)\`** — two lookups where \`insert(x).second\` answers in one.
- **Sorting the caller's vector** when the input must not change — take a copy (pass by value) or pick Floyd.
- **Running Floyd or negation outside \`1..n\` with \`[]\`** — undefined behaviour, not a reliable error; use \`.at()\` while testing, as shown above.
- **\`abs\` on \`INT_MIN\`** in the negation trick — the result does not fit in \`int\` (undefined behaviour); impossible when values are in \`1..n\`, but a reason not to use the trick on arbitrary input.
- **Using \`while\` instead of \`do...while\` for phase 1** — both pointers start equal, so a \`while (slow != fast)\` loop never runs.
- **Expecting all methods to agree** when several values repeat — example 2 shows they may not.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">It depends on the constraints; in general I scan with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_set&lt;int&gt;</code> and return the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> for which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert(x).second</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> — O(n) time, O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The constraint questions:</strong> <span style="color:#f0e2c8;">I ask about the value range, whether I may modify the vector, the memory budget, and whether several values can repeat.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The O(1)-space options:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::adjacent_find</code> in O(n log n), or — with values in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1..n</code> — negate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[abs(x)]</code> as a seen-mark in O(n); both modify the vector.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The read-only trick:</strong> <span style="color:#f0e2c8;">With n + 1 values in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1..n</code>, I treat <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i → nums[i]</code> as a linked list; two indices point to the duplicate, so it is the cycle entrance, and Floyd finds it in O(n) time and O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert().second</code> saves a lookup, I take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code> to read and by-value to get a scratch copy, and I remember <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[]</code> is unchecked, so a broken precondition is undefined behaviour.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is a duplicate guaranteed in the 1..n version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The pigeonhole principle: n + 1 positions but only n possible values, so two positions must share a value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if Floyd runs on input that breaks the precondition?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> it is undefined behaviour — no guaranteed error. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.at(i)</code> it throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::out_of_range</code>, as the run above showed for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1, 2, 3}</code>. I would validate the input or use the set version.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does Floyd's phase 2 land exactly on the duplicate?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The distance from the start to the cycle entrance equals the distance from the meeting point to the entrance, modulo the cycle length, so stepping both one at a time makes them meet at the entrance — the node with two incoming arrows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return all repeated values?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map&lt;int, int&gt;</code> (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">++counts[x]</code> — here <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> inserting 0 is what we want) and collect keys with count &gt; 1, then sort them if the order matters. O(n) average.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_set</code> version be slow in practice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each insert can allocate a node and every lookup hashes, so the constant factor is much higher than Floyd's two array reads per step. When the 1..n constraint holds, Floyd is O(1) space and cache-friendly.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pigeonhole principle** | n + 1 items in n boxes means some box holds two |
| **Hash set** | Distinct values with O(1) average lookup and insert; in C++, \`std::unordered_set\` |
| **Floyd's cycle detection** | Slow and fast pointers meet in a cycle; a restart finds its entrance |
| **Index marking (negation trick)** | Flip \`nums[v]\` negative to remember that v was seen |
| **Precondition (and undefined behaviour)** | What the input must satisfy; breaking it with unchecked \`[]\` has no defined result |

---
**Conclusion:** "Find a duplicate" is really "which constraints apply?". For any values, an \`unordered_set\` scan with \`if (!seen.insert(x).second) return x;\` is O(n) time and O(n) space. With values in \`1..n\` and n + 1 elements, the pigeonhole principle guarantees a duplicate, and reading the vector as \`i → nums[i]\` makes it a linked list whose cycle entrance is the duplicate — Floyd finds it in O(n) time and O(1) space, read-only and allocation-free. In C++, use \`insert().second\` for the one-lookup test, \`std::sort\` + \`std::adjacent_find\` for the sorting version, pass by value when you need a scratch copy, and remember that unchecked \`[]\` makes a broken precondition undefined behaviour. The pointer technique is the one from [detecting a cycle in a linked list](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list), and the mirror problem is [finding the missing number](/interview-question/how-do-you-find-the-missing-number-in-0-n).`,
        examples: [
          {
            label: "Hash set (any values) and Floyd cycle detection (values 1..n)",
            code: `#include <iostream>
#include <string>
#include <unordered_set>
#include <vector>
using namespace std;

// Any values: return the first value seen twice (scanning left to right), or -1.
int findDuplicateSet(const vector<int>& nums) {
    unordered_set<int> seen;
    for (int x : nums) {
        if (!seen.insert(x).second) return x;    // insert().second is false when x was already there
    }
    return -1;
}

// Values in 1..n, length n + 1, read-only: O(1) extra space.
int findDuplicateFloyd(const vector<int>& nums) {
    int slow = nums[0], fast = nums[0];
    do {                                         // phase 1: find a meeting point inside the cycle
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow != fast);
    slow = nums[0];                              // phase 2: walk to the cycle entrance
    while (slow != fast) {
        slow = nums[slow];
        fast = nums[fast];
    }
    return slow;
}

string fmt(const vector<int>& a) {
    string s = "[";
    for (size_t i = 0; i < a.size(); i++) s += (i ? ", " : "") + to_string(a[i]);
    return s + "]";
}

int main() {
    vector<vector<int>> bounded = {{1, 3, 4, 2, 2}, {3, 1, 3, 4, 2}, {2, 2, 2, 2, 2}, {1, 1}, {2, 5, 9, 6, 9, 3, 8, 9, 7, 1}};
    for (const auto& nums : bounded) {
        cout << fmt(nums) << ": set=" << findDuplicateSet(nums) << " floyd=" << findDuplicateFloyd(nums) << endl;
    }
    vector<vector<int>> general = {{10, -4, 7, -4}, {1, 2, 3}, {}};   // outside 1..n: only the set version applies
    for (const auto& nums : general) {
        cout << fmt(nums) << ": set=" << findDuplicateSet(nums) << endl;
    }
    return 0;
}`,
          },
          {
            label: "Four approaches side by side, with a Floyd trace",
            code: `#include <algorithm>
#include <cstdlib>
#include <iostream>
#include <string>
#include <unordered_set>
#include <vector>
using namespace std;

// Four approaches, plus a trace of Floyd's two phases.

int bySet(const vector<int>& nums) {
    unordered_set<int> seen;
    for (int x : nums) if (!seen.insert(x).second) return x;
    return -1;
}

int bySort(vector<int> s) {                       // by value: we sort a COPY
    sort(s.begin(), s.end());
    for (size_t i = 1; i < s.size(); i++) if (s[i] == s[i - 1]) return s[i];
    return -1;
}

int byNegation(vector<int> a) {                   // by value: this method writes to the array
    for (int x : a) {
        int i = abs(x);
        if (a[i] < 0) return i;                   // index i was already marked: value i seen before
        a[i] = -a[i];
    }
    return -1;
}

string join(const vector<string>& v) {
    string s;
    for (size_t i = 0; i < v.size(); i++) s += (i ? " " : "") + v[i];
    return s;
}

int byFloyd(const vector<int>& nums, bool trace) {
    int slow = nums[0], fast = nums[0];
    vector<string> steps;
    do {
        slow = nums[slow];
        fast = nums[nums[fast]];
        steps.push_back("(" + to_string(slow) + "," + to_string(fast) + ")");
    } while (slow != fast);
    if (trace) cout << "  phase 1 (slow,fast): " << join(steps) << endl;
    slow = nums[0];
    steps.clear();
    while (slow != fast) {
        slow = nums[slow];
        fast = nums[fast];
        steps.push_back("(" + to_string(slow) + "," + to_string(fast) + ")");
    }
    if (trace) cout << "  phase 2 (slow,fast): " << (steps.empty() ? "already equal" : join(steps)) << endl;
    return slow;
}

string fmt(const vector<int>& a) {
    string s = "[";
    for (size_t i = 0; i < a.size(); i++) s += (i ? ", " : "") + to_string(a[i]);
    return s + "]";
}

int main() {
    cout << "trace for [1, 3, 4, 2, 2]:" << endl;
    int d = byFloyd({1, 3, 4, 2, 2}, true);
    cout << "  duplicate = " << d << endl;
    vector<vector<int>> tests = {{1, 3, 4, 2, 2}, {3, 1, 3, 4, 2}, {4, 3, 1, 4, 2}, {2, 3, 3, 2, 1}};
    for (const auto& nums : tests) {
        cout << fmt(nums) << ": set=" << bySet(nums) << " sort=" << bySort(nums)
             << " negate=" << byNegation(nums) << " floyd=" << byFloyd(nums, false) << endl;
    }
    return 0;
}`,
          },
        ],
      },
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you find the majority element?",
    difficulty: "easy",
    seoDescription: "Find the majority element with Boyer-Moore voting in O(n) time and O(1) space, why it works, the verify pass, and verified code in four languages.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a list of integers, return the majority element — the value that appears more than n/2 times. First assume one always exists, then tell me what changes if it might not. Please code it in Python and aim for O(1) extra space."

**What a strong answer should cover:**
- The definition: more than ⌊n/2⌋ occurrences, so at most one majority can exist; exactly half is not a majority.
- The simple answers: counting with a \`dict\`/\`Counter\` (O(n) time, O(n) space) and sorting then taking index \`n // 2\` (O(n log n)).
- Boyer-Moore voting: one candidate and one counter, O(n) time and O(1) space, with the cancelling-pairs argument for why it is correct.
- The verification pass when a majority is not guaranteed (\`[1, 2, 3]\` yields candidate 3).
- Python specifics: \`Counter(nums).most_common(1)\`, \`nums.count(candidate)\` for the verify pass, \`//\` for floor division, and that \`statistics.mode\` returns the most common value, which is not necessarily a majority.

**Clarifying questions expected:**
- Is a majority guaranteed? What should be returned if there is none?

**Code / implementation expected:** Yes — a Boyer-Moore \`majority(nums)\` in Python with an optional verify pass, run on inputs with and without a majority.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Python lists and loops; nothing else assumed.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by running the code with \`python3\` (3.13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

A crowd of supporters from different football clubs is in a hall. You are told that **more than half** of the people support one club, and you need to find out which — but you have no paper, and you can only remember one club name and one number at a time.

Here is a trick. Ask people to walk out of the hall in pairs, and every pair must be two supporters of **different** clubs. Keep going until no such pair can be formed. The people left in the hall all support the same club — and it has to be the majority club. Why? Each pair that leaves takes away **at most one** majority supporter, but also one other person. Since the majority club has more people than everybody else combined, the others run out first.

You do not even need to arrange the pairs in advance. Let people come up one at a time. Keep a "current club" and a counter. If the counter is 0, the newcomer's club becomes the current club. If the newcomer supports the current club, add 1; otherwise subtract 1 (that newcomer "pairs off" with one supporter of the current club). After everyone has come up, the current club is the majority.

That is the **Boyer-Moore majority vote algorithm**: one pass, one remembered value, one counter. It is a favourite interview question because the obvious answer (count everything in a hash map) is easy, while the O(1)-space answer needs a genuinely clever argument — and you have to be able to explain why it is correct.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is a majority element guaranteed to exist? | If yes, the vote's candidate is the answer. If not, you need a second pass to **verify** it — the vote always produces some candidate. |
| Does "majority" mean strictly more than n/2? | The standard definition is more than ⌊n/2⌋. Exactly half (\`[1, 1, 2, 2]\`) is **not** a majority. |
| What should I return when there is none, or for an empty array? | \`-1\`, \`null\`/\`None\`, or an exception — agree on it. |
| Is O(1) extra space required? | Decides between the hash-map count (simple, O(n) space) and Boyer-Moore (O(1) space). |
| Is the data a stream I can read only once? | The vote works on one pass; the verify step needs a second pass or a guarantee. |

## 3. The Core Idea

📌 **Interview term: Majority element** — a value that appears **more than ⌊n/2⌋ times** in an array of length n. There can be at most one: two different values cannot each fill more than half the positions.

📌 **Interview term: Boyer-Moore majority vote** — keep a \`candidate\` and a \`count\`. For each element: if \`count\` is 0, make the element the candidate; then add 1 if the element equals the candidate, otherwise subtract 1. If a majority exists, the final candidate is it.

Here is the vote on \`[2, 2, 1, 1, 1, 2, 2]\`, exactly as example 2 prints it:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 210" role="img" aria-label="Trace of Boyer-Moore voting on 2 2 1 1 1 2 2. Candidate row 2 2 2 2 1 1 2. Count row 1 2 1 0 1 0 1. The final candidate is 2">
  <text class="d-sub" x="60" y="62" text-anchor="middle">read</text>
  <text class="d-sub" x="60" y="122" text-anchor="middle">candidate</text>
  <text class="d-sub" x="60" y="182" text-anchor="middle">count</text>
  <text class="d-sub" x="152" y="24" text-anchor="middle">1</text>
  <text class="d-sub" x="232" y="24" text-anchor="middle">2</text>
  <text class="d-sub" x="312" y="24" text-anchor="middle">3</text>
  <text class="d-sub" x="392" y="24" text-anchor="middle">4</text>
  <text class="d-sub" x="472" y="24" text-anchor="middle">5</text>
  <text class="d-sub" x="552" y="24" text-anchor="middle">6</text>
  <text class="d-sub" x="632" y="24" text-anchor="middle">7</text>
  <rect class="d-box" x="124" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="152" y="63" text-anchor="middle">2</text>
  <rect class="d-box" x="204" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="232" y="63" text-anchor="middle">2</text>
  <rect class="d-box" x="284" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="312" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="364" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="392" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="444" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="472" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="524" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="552" y="63" text-anchor="middle">2</text>
  <rect class="d-box" x="604" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="632" y="63" text-anchor="middle">2</text>
  <text class="d-text" x="152" y="123" text-anchor="middle">2</text>
  <text class="d-text" x="232" y="123" text-anchor="middle">2</text>
  <text class="d-text" x="312" y="123" text-anchor="middle">2</text>
  <text class="d-text" x="392" y="123" text-anchor="middle">2</text>
  <text class="d-text d-accent" x="472" y="123" text-anchor="middle">1</text>
  <text class="d-text d-accent" x="552" y="123" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="604" y="98" width="56" height="38" rx="6"/>
  <text class="d-text d-accent" x="632" y="123" text-anchor="middle">2</text>
  <text class="d-text" x="152" y="183" text-anchor="middle">1</text>
  <text class="d-text" x="232" y="183" text-anchor="middle">2</text>
  <text class="d-text" x="312" y="183" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="364" y="158" width="56" height="38" rx="6"/>
  <text class="d-text" x="392" y="183" text-anchor="middle">0</text>
  <text class="d-text" x="472" y="183" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="524" y="158" width="56" height="38" rx="6"/>
  <text class="d-text" x="552" y="183" text-anchor="middle">0</text>
  <text class="d-text" x="632" y="183" text-anchor="middle">1</text>
</svg>

The count hit 0 twice (steps 4 and 6). Each time, the next element became the new candidate — at step 5 that was \`1\`, which looks like the "wrong" answer for a while. The majority still wins at the end, because it outnumbers everything else.

### Why it works: cancelling pairs

<svg class="iq-diagram" width="100%" viewBox="0 0 700 170" role="img" aria-label="Pairs of different values cancel. In 2 2 1 1 1 2 2 the pairs 2 and 1, 2 and 1, 1 and 2 cancel, leaving one 2, the majority">
  <rect class="d-box-muted" x="40" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="68" y="56" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="106" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="134" y="56" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="212" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="240" y="56" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="278" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="306" y="56" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="384" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="412" y="56" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="450" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="478" y="56" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="584" y="30" width="56" height="40" rx="6"/>
  <text class="d-text d-accent" x="612" y="56" text-anchor="middle">2</text>
  <text class="d-sub" x="101" y="110" text-anchor="middle">pair cancels</text>
  <text class="d-sub" x="273" y="110" text-anchor="middle">pair cancels</text>
  <text class="d-sub" x="445" y="110" text-anchor="middle">pair cancels</text>
  <text class="d-text d-accent" x="612" y="110" text-anchor="middle">survivor</text>
</svg>

Every "subtract 1" pairs the current element with one copy of the candidate, and the two are different values. Removing a pair of **different** values from the array never destroys a majority: the pair contains at most one copy of the majority value, so if the majority had more than half of n elements before, it still has more than half of the n − 2 that remain. When the count drops to 0, the whole prefix read so far has been split into such pairs, so the algorithm can forget it and start fresh — which is exactly what "if count is 0, take a new candidate" does. Whatever survives all the cancelling is the majority.

📌 **Interview term: Verification pass** — if a majority is **not** guaranteed, the vote still outputs a candidate (on \`[1, 2, 3]\` it outputs \`3\`). A second pass that counts the candidate and checks \`count > n / 2\` turns "candidate" into "answer or none". It keeps the algorithm O(n) time and O(1) space.

## 4. All the Approaches

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| Brute force: count each value with a full scan | O(n²) | O(1) | The starting point only |
| Hash-map counting | O(n) | O(k), k distinct values | Simple; can stop as soon as a count exceeds n/2 |
| Sort, take the middle element | O(n log n) | O(1) to O(n), depending on the sort | A majority always covers index ⌊n/2⌋ of the sorted array |
| Selection of the median (quickselect) | O(n) average | O(1) | Same "middle element" idea without a full sort; see [quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element) |
| **Boyer-Moore vote** (+ verify) | **O(n)** | **O(1)** | The expected optimal answer |

📌 **Interview term: The middle-index argument** — a value that occupies more than half the positions of a sorted array forms one contiguous run longer than n/2, and any such run must cover the middle index ⌊n/2⌋. So \`sorted(nums)[n // 2]\` is the majority if one exists (and still needs verifying if it might not).

**Generalisation.** The same cancelling idea finds all values appearing more than n/3 times with **two** candidates and two counters (at most two such values can exist), and in general more than n/k times with k − 1 candidates. Always verify the candidates in a second pass. For the related "most frequent k values" problem — where there is no majority guarantee — use counting plus a heap: [top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements).

## 5. The Code in Python

~~~python
def majority(nums):
    """Return the value that appears more than len(nums) // 2 times, or -1 if none."""
    candidate, count = None, 0
    for x in nums:                     # phase 1: Boyer-Moore voting
        if count == 0:
            candidate = x              # nobody is ahead: x becomes the candidate
        count += 1 if x == candidate else -1
    if nums.count(candidate) > len(nums) // 2:   # phase 2: verify (skip if a majority is guaranteed)
        return candidate
    return -1


print(majority([3, 2, 3]))              # 3
print(majority([2, 2, 1, 1, 1, 2, 2]))  # 2
print(majority([1]))                    # 1
print(majority([6, 6, 6, 7, 7]))        # 6
print(majority([1, 2, 3]))              # -1
print(majority([1, 1, 2, 2]))           # -1
print(majority([]))                     # -1
~~~

- **\`candidate, count = None, 0\`** — \`None\` is a safe "no candidate yet" because \`count == 0\` replaces it on the first element.
- **\`count += 1 if x == candidate else -1\`** — Python's conditional expression keeps the update on one line.
- **\`nums.count(candidate) > len(nums) // 2\`** — the verify pass. \`list.count\` is a C-level O(n) scan; \`//\` is floor division, so for n = 7 the threshold is 3 and the value needs at least 4 copies. (For an empty list the candidate is still \`None\`, \`nums.count(None)\` is 0, and the function returns -1 without special-casing.)
- If the problem **guarantees** a majority, drop the verify pass and return \`candidate\`.

The library one-liners, and one trap, checked by running them:

~~~python
import statistics
from collections import Counter

nums = [2, 2, 1, 1, 1, 2, 2]
value, freq = Counter(nums).most_common(1)[0]     # most frequent value and its count
print(value, freq, freq > len(nums) // 2)
print(sorted(nums)[len(nums) // 2])                # the middle of the sorted list
no_majority = [1, 2, 3, 1, 2]
print(statistics.mode(no_majority))                 # the most common value, NOT a majority
~~~

~~~text
2 4 True
2
1
~~~

\`Counter(nums).most_common(1)\` gives the most frequent value and its count (here \`2\`, 4 times, and \`4 > 7 // 2\` is \`True\`) — O(n) time and O(k) space. \`sorted(nums)[len(nums) // 2]\` is the middle-index argument in code. And \`statistics.mode\` answered \`1\` for \`[1, 2, 3, 1, 2]\`, which has **no** majority: \`mode\` returns the most common value (its docstring says it returns the first one encountered when several tie), so it still needs the \`count > n // 2\` check.

## 6. Verified: Running the Code

Both examples were saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). Example 1 — the vote plus verify on seven inputs, including no majority, exactly half and empty:

~~~text
3
2
1
6
-1
-1
-1
~~~

Example 2 — the vote step by step, the no-majority trap, and three methods side by side:

~~~text
vote on [2, 2, 1, 1, 1, 2, 2]:
  read 2 -> candidate=2 count=1
  read 2 -> candidate=2 count=2
  read 1 -> candidate=2 count=1
  read 1 -> candidate=2 count=0
  read 1 -> candidate=1 count=1
  read 2 -> candidate=1 count=0
  read 2 -> candidate=2 count=1
  winner = 2
vote on [1, 2, 3] (no majority):
  read 1 -> candidate=1 count=1
  read 2 -> candidate=1 count=0
  read 3 -> candidate=3 count=1
  candidate = 3, but it appears once, so verify says -1
[2, 2, 1, 1, 1, 2, 2]: vote=2 count=2 sort=2
[5, 1, 5, 2, 5]: vote=5 count=5 sort=5
[1, 2, 3]: vote=-1 count=-1 sort=-1
[4, 4, 4, 4]: vote=4 count=4 sort=4
~~~

The first trace is the one in the diagram: the candidate switches to \`1\` at the fifth element and back to \`2\` at the last one. The second trace shows the trap: on \`[1, 2, 3]\` the vote ends with candidate \`3\` and count 1, even though 3 appears once — only verification catches that. All three methods agree on every test array.

## 7. Complexity

| Method | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Boyer-Moore vote | O(n) | O(1) | One pass, two variables |
| Vote + verify | O(n) | O(1) | A second O(n) pass with \`nums.count\` |
| \`dict\` / \`Counter\` | O(n) average | O(k) | One O(1)-average update per element |
| \`sorted()\` + middle | O(n log n) | O(n) | \`sorted\` builds a new list; \`nums.sort()\` would sort in place |
| Brute force | O(n²) | O(1) | \`nums.count(x)\` for every \`x\` |

For the meaning of these labels, see [What is Big-O notation?](/interview-question/what-is-big-o-notation)

## Edge Cases

- **Single element** (\`[1]\`) — it is the majority (1 > ⌊1/2⌋ = 0).
- **Exactly half** (\`[1, 1, 2, 2]\`) — no majority: 2 is not more than ⌊4/2⌋ = 2. The verify pass returns \`-1\`.
- **No majority at all** (\`[1, 2, 3]\`) — the vote's candidate is \`3\`; only verification catches it.
- **Empty array** — no candidate; return the agreed "none" value without reading \`nums[0]\`.
- **All equal** (\`[4, 4, 4, 4]\`) — the count just climbs; the answer is 4.
- **Majority at the very end** (\`[2, 2, 1, 1, 1, 2, 2]\`) — the candidate switches to 1 mid-way and back to 2; the vote does not need the majority to lead early.

## Common Pitfalls

- **Skipping verification when a majority is not guaranteed** — \`[1, 2, 3]\` returns 3.
- **\`/\` instead of \`//\`** — \`len(nums) / 2\` is a float (\`3.5\`); the comparison still works, but \`nums[len(nums) / 2]\` raises \`TypeError: list indices must be integers or slices, not float\`.
- **Using \`>=\` instead of \`>\`** — makes \`[1, 1, 2, 2]\` report 1 as a majority.
- **Treating \`statistics.mode\` or \`most_common(1)\` as "the majority"** — they return the most frequent value whether or not it exceeds half; check the count.
- **Starting with \`candidate = nums[0]\`** — a common variant, but it raises \`IndexError\` on an empty list; starting from \`None\` with \`count = 0\` needs no special case.
- **Calling \`nums.count(x)\` inside the main loop** — that is the O(n²) brute force in disguise.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">I use the Boyer-Moore vote — keep a candidate and a count; when the count is 0 the current element becomes the candidate; add 1 on a match, subtract 1 otherwise.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Each −1 cancels the element against one copy of the candidate, a pair of different values; removing such pairs never destroys a majority, because the majority outnumbers everything else combined.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code> approach is O(n) time but O(n) space, and sorting is O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The verify pass:</strong> <span style="color:#f0e2c8;">If a majority is not guaranteed, I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums.count(candidate) &gt; len(nums) // 2</code>, because the vote always returns some candidate — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 3]</code> gives 3.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Python detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter(nums).most_common(1)</code> is the idiomatic O(n)-space answer, I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">//</code> for the threshold, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">statistics.mode</code> is the most common value, not necessarily a majority.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is there at most one majority element?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two different values each appearing more than n/2 times would need more than n positions in total.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the vote return when there is no majority?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Some candidate anyway — the run above returned 3 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 3]</code>. That is why the verify pass exists; with a guarantee, you can skip it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find all elements appearing more than n/3 times?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Extended Boyer-Moore with two candidates and two counters: match either candidate to increment, fill an empty slot when a counter is 0, otherwise decrement both. Then verify both candidates with a second pass. O(n) time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the middle element of the sorted list work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The majority's copies form one contiguous run of more than n/2 positions in the sorted list, and every such run covers index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n // 2</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can this run on a stream?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The vote needs one pass and O(1) memory, so it fits a stream. Verification needs a second pass, so on a one-pass stream you can only report a candidate unless a majority is guaranteed.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Majority element** | A value appearing more than ⌊n/2⌋ times; at most one exists |
| **Boyer-Moore majority vote** | One candidate plus a counter; +1 for a match, −1 otherwise, new candidate at 0 |
| **Verification pass** | A second scan that checks the candidate really exceeds n/2 |
| **The middle-index argument** | A majority always occupies the middle position of the sorted array |

---
**Conclusion:** The majority element appears more than ⌊n/2⌋ times, so at most one exists. Counting with a \`Counter\` is O(n) time and O(n) space, sorting and reading index \`n // 2\` is O(n log n), and the Boyer-Moore vote — one candidate, one counter, +1 on a match, −1 otherwise — is O(n) time and O(1) space, correct because cancelling pairs of different values can never eliminate a majority. If a majority is not guaranteed, add a \`nums.count(candidate) > len(nums) // 2\` check, and do not mistake \`statistics.mode\` for a majority test. The same counting toolkit appears in [top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements) and [finding a duplicate](/interview-question/how-do-you-find-a-duplicate-in-an-array).`,
        examples: [
          {
            label: "Boyer-Moore voting with a verify pass on seven inputs",
            code: `def majority(nums):
    """Return the value that appears more than len(nums) // 2 times, or -1 if none."""
    candidate, count = None, 0
    for x in nums:                     # phase 1: Boyer-Moore voting
        if count == 0:
            candidate = x              # nobody is ahead: x becomes the candidate
        count += 1 if x == candidate else -1
    if nums.count(candidate) > len(nums) // 2:   # phase 2: verify (skip if a majority is guaranteed)
        return candidate
    return -1


print(majority([3, 2, 3]))              # 3
print(majority([2, 2, 1, 1, 1, 2, 2]))  # 2
print(majority([1]))                    # 1
print(majority([6, 6, 6, 7, 7]))        # 6
print(majority([1, 2, 3]))              # -1
print(majority([1, 1, 2, 2]))           # -1
print(majority([]))                     # -1`,
          },
          {
            label: "Trace of the vote, the no-majority trap, and vote vs count vs sort",
            code: `# Watch the vote, see why the verify pass matters, and compare three methods.

def trace(nums):
    candidate, count = None, 0
    for x in nums:
        if count == 0:
            candidate = x
        count += 1 if x == candidate else -1
        print("  read " + str(x) + " -> candidate=" + str(candidate) + " count=" + str(count))
    return candidate


def by_vote(nums):                    # O(n) time, O(1) space, includes the verify pass
    candidate, count = None, 0
    for x in nums:
        if count == 0:
            candidate = x
        count += 1 if x == candidate else -1
    return candidate if nums.count(candidate) > len(nums) // 2 else -1


def by_counting(nums):                # O(n) time, O(k) space
    counts = {}
    for x in nums:
        counts[x] = counts.get(x, 0) + 1
        if counts[x] > len(nums) // 2:
            return x
    return -1


def by_sorting(nums):                 # O(n log n): the middle element of the sorted list
    if not nums:
        return -1
    mid = sorted(nums)[len(nums) // 2]
    return mid if nums.count(mid) > len(nums) // 2 else -1


print("vote on [2, 2, 1, 1, 1, 2, 2]:")
print("  winner = " + str(trace([2, 2, 1, 1, 1, 2, 2])))
print("vote on [1, 2, 3] (no majority):")
print("  candidate = " + str(trace([1, 2, 3])) + ", but it appears once, so verify says -1")
for nums in [[2, 2, 1, 1, 1, 2, 2], [5, 1, 5, 2, 5], [1, 2, 3], [4, 4, 4, 4]]:
    print("[" + ", ".join(str(v) for v in nums) + "]: vote=" + str(by_vote(nums))
          + " count=" + str(by_counting(nums)) + " sort=" + str(by_sorting(nums)))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an array of integers, return the majority element — the value that appears more than n/2 times. Assume one exists first, then tell me what changes if it might not. Please write it in JavaScript with O(1) extra space."

**What a strong answer should cover:**
- The definition: more than ⌊n/2⌋ occurrences, so at most one majority exists; exactly half is not a majority.
- The simple answers: counting with a \`Map\` (O(n) time, O(n) space) and sorting then taking the middle (O(n log n)).
- Boyer-Moore voting: one candidate and one counter, O(n) time and O(1) space, with the cancelling-pairs argument.
- The verification pass when a majority is not guaranteed (\`[1, 2, 3]\` yields candidate 3).
- JavaScript specifics: \`n / 2\` is not an integer for odd n, so use \`Math.floor(n / 2)\` for the threshold and the middle index; \`.sort()\` needs \`(a, b) => a - b\` and mutates; \`counts.get(x) || 0\` as the default.

**Clarifying questions expected:**
- Is a majority guaranteed? What should be returned if there is none?

**Code / implementation expected:** Yes — a Boyer-Moore \`majority(nums)\` in JavaScript with an optional verify pass, run on inputs with and without a majority.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know JavaScript arrays and loops; nothing else assumed.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by running the code with \`node\` (v22); nothing is typed in by hand. The examples only use \`console.log\`, so they behave the same in a browser.

## 1. Why This Even Matters — A Story First

A crowd of supporters from different football clubs is in a hall. You are told that **more than half** of the people support one club, and you need to find out which — but you have no paper, and you can only remember one club name and one number at a time.

Here is a trick. Ask people to walk out of the hall in pairs, and every pair must be two supporters of **different** clubs. Keep going until no such pair can be formed. The people left in the hall all support the same club — and it has to be the majority club. Why? Each pair that leaves takes away **at most one** majority supporter, but also one other person. Since the majority club has more people than everybody else combined, the others run out first.

You do not even need to arrange the pairs in advance. Let people come up one at a time. Keep a "current club" and a counter. If the counter is 0, the newcomer's club becomes the current club. If the newcomer supports the current club, add 1; otherwise subtract 1 (that newcomer "pairs off" with one supporter of the current club). After everyone has come up, the current club is the majority.

That is the **Boyer-Moore majority vote algorithm**: one pass, one remembered value, one counter. It is a favourite interview question because the obvious answer (count everything in a hash map) is easy, while the O(1)-space answer needs a genuinely clever argument — and you have to be able to explain why it is correct.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is a majority element guaranteed to exist? | If yes, the vote's candidate is the answer. If not, you need a second pass to **verify** it — the vote always produces some candidate. |
| Does "majority" mean strictly more than n/2? | The standard definition is more than ⌊n/2⌋. Exactly half (\`[1, 1, 2, 2]\`) is **not** a majority. |
| What should I return when there is none, or for an empty array? | \`-1\`, \`null\`/\`None\`, or an exception — agree on it. |
| Is O(1) extra space required? | Decides between the hash-map count (simple, O(n) space) and Boyer-Moore (O(1) space). |
| Is the data a stream I can read only once? | The vote works on one pass; the verify step needs a second pass or a guarantee. |

## 3. The Core Idea

📌 **Interview term: Majority element** — a value that appears **more than ⌊n/2⌋ times** in an array of length n. There can be at most one: two different values cannot each fill more than half the positions.

📌 **Interview term: Boyer-Moore majority vote** — keep a \`candidate\` and a \`count\`. For each element: if \`count\` is 0, make the element the candidate; then add 1 if the element equals the candidate, otherwise subtract 1. If a majority exists, the final candidate is it.

Here is the vote on \`[2, 2, 1, 1, 1, 2, 2]\`, exactly as example 2 prints it:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 210" role="img" aria-label="Trace of Boyer-Moore voting on 2 2 1 1 1 2 2. Candidate row 2 2 2 2 1 1 2. Count row 1 2 1 0 1 0 1. The final candidate is 2">
  <text class="d-sub" x="60" y="62" text-anchor="middle">read</text>
  <text class="d-sub" x="60" y="122" text-anchor="middle">candidate</text>
  <text class="d-sub" x="60" y="182" text-anchor="middle">count</text>
  <text class="d-sub" x="152" y="24" text-anchor="middle">1</text>
  <text class="d-sub" x="232" y="24" text-anchor="middle">2</text>
  <text class="d-sub" x="312" y="24" text-anchor="middle">3</text>
  <text class="d-sub" x="392" y="24" text-anchor="middle">4</text>
  <text class="d-sub" x="472" y="24" text-anchor="middle">5</text>
  <text class="d-sub" x="552" y="24" text-anchor="middle">6</text>
  <text class="d-sub" x="632" y="24" text-anchor="middle">7</text>
  <rect class="d-box" x="124" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="152" y="63" text-anchor="middle">2</text>
  <rect class="d-box" x="204" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="232" y="63" text-anchor="middle">2</text>
  <rect class="d-box" x="284" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="312" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="364" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="392" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="444" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="472" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="524" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="552" y="63" text-anchor="middle">2</text>
  <rect class="d-box" x="604" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="632" y="63" text-anchor="middle">2</text>
  <text class="d-text" x="152" y="123" text-anchor="middle">2</text>
  <text class="d-text" x="232" y="123" text-anchor="middle">2</text>
  <text class="d-text" x="312" y="123" text-anchor="middle">2</text>
  <text class="d-text" x="392" y="123" text-anchor="middle">2</text>
  <text class="d-text d-accent" x="472" y="123" text-anchor="middle">1</text>
  <text class="d-text d-accent" x="552" y="123" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="604" y="98" width="56" height="38" rx="6"/>
  <text class="d-text d-accent" x="632" y="123" text-anchor="middle">2</text>
  <text class="d-text" x="152" y="183" text-anchor="middle">1</text>
  <text class="d-text" x="232" y="183" text-anchor="middle">2</text>
  <text class="d-text" x="312" y="183" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="364" y="158" width="56" height="38" rx="6"/>
  <text class="d-text" x="392" y="183" text-anchor="middle">0</text>
  <text class="d-text" x="472" y="183" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="524" y="158" width="56" height="38" rx="6"/>
  <text class="d-text" x="552" y="183" text-anchor="middle">0</text>
  <text class="d-text" x="632" y="183" text-anchor="middle">1</text>
</svg>

The count hit 0 twice (steps 4 and 6). Each time, the next element became the new candidate — at step 5 that was \`1\`, which looks like the "wrong" answer for a while. The majority still wins at the end, because it outnumbers everything else.

### Why it works: cancelling pairs

<svg class="iq-diagram" width="100%" viewBox="0 0 700 170" role="img" aria-label="Pairs of different values cancel. In 2 2 1 1 1 2 2 the pairs 2 and 1, 2 and 1, 1 and 2 cancel, leaving one 2, the majority">
  <rect class="d-box-muted" x="40" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="68" y="56" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="106" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="134" y="56" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="212" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="240" y="56" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="278" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="306" y="56" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="384" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="412" y="56" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="450" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="478" y="56" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="584" y="30" width="56" height="40" rx="6"/>
  <text class="d-text d-accent" x="612" y="56" text-anchor="middle">2</text>
  <text class="d-sub" x="101" y="110" text-anchor="middle">pair cancels</text>
  <text class="d-sub" x="273" y="110" text-anchor="middle">pair cancels</text>
  <text class="d-sub" x="445" y="110" text-anchor="middle">pair cancels</text>
  <text class="d-text d-accent" x="612" y="110" text-anchor="middle">survivor</text>
</svg>

Every "subtract 1" pairs the current element with one copy of the candidate, and the two are different values. Removing a pair of **different** values from the array never destroys a majority: the pair contains at most one copy of the majority value, so if the majority had more than half of n elements before, it still has more than half of the n − 2 that remain. When the count drops to 0, the whole prefix read so far has been split into such pairs, so the algorithm can forget it and start fresh — which is exactly what "if count is 0, take a new candidate" does. Whatever survives all the cancelling is the majority.

📌 **Interview term: Verification pass** — if a majority is **not** guaranteed, the vote still outputs a candidate (on \`[1, 2, 3]\` it outputs \`3\`). A second pass that counts the candidate and checks \`count > n / 2\` turns "candidate" into "answer or none". It keeps the algorithm O(n) time and O(1) space.

## 4. All the Approaches

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| Brute force: count each value with a full scan | O(n²) | O(1) | The starting point only |
| Hash-map counting | O(n) | O(k), k distinct values | Simple; can stop as soon as a count exceeds n/2 |
| Sort, take the middle element | O(n log n) | O(1) to O(n), depending on the sort | A majority always covers index ⌊n/2⌋ of the sorted array |
| Selection of the median (quickselect) | O(n) average | O(1) | Same "middle element" idea without a full sort; see [quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element) |
| **Boyer-Moore vote** (+ verify) | **O(n)** | **O(1)** | The expected optimal answer |

📌 **Interview term: The middle-index argument** — a value that occupies more than half the positions of a sorted array forms one contiguous run longer than n/2, and any such run must cover the middle index ⌊n/2⌋. So \`sorted(nums)[n // 2]\` is the majority if one exists (and still needs verifying if it might not).

**Generalisation.** The same cancelling idea finds all values appearing more than n/3 times with **two** candidates and two counters (at most two such values can exist), and in general more than n/k times with k − 1 candidates. Always verify the candidates in a second pass. For the related "most frequent k values" problem — where there is no majority guarantee — use counting plus a heap: [top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements).

## 5. The Code in JavaScript

~~~javascript
function majority(nums) {
  // Return the value that appears more than Math.floor(n / 2) times, or -1 if none.
  let candidate = null, count = 0;
  for (const x of nums) {              // phase 1: Boyer-Moore voting
    if (count === 0) candidate = x;    // nobody is ahead: x becomes the candidate
    count += x === candidate ? 1 : -1;
  }
  let occurrences = 0;                 // phase 2: verify (skip if a majority is guaranteed)
  for (const x of nums) if (x === candidate) occurrences++;
  return occurrences > Math.floor(nums.length / 2) ? candidate : -1;
}

console.log(majority([3, 2, 3]));              // 3
console.log(majority([2, 2, 1, 1, 1, 2, 2]));  // 2
console.log(majority([1]));                    // 1
console.log(majority([6, 6, 6, 7, 7]));        // 6
console.log(majority([1, 2, 3]));              // -1
console.log(majority([1, 1, 2, 2]));           // -1
console.log(majority([]));                     // -1
~~~

- **\`let candidate = null, count = 0\`** — \`null\` means "no candidate yet"; the first element replaces it because \`count === 0\`.
- **\`count += x === candidate ? 1 : -1\`** — strict equality, so \`1\` and \`'1'\` would never be counted as the same value.
- **The verify loop** counts occurrences of the candidate and compares with \`Math.floor(nums.length / 2)\`. For an empty array the candidate stays \`null\`, the count is 0 and the function returns -1 without a special case.
- If the problem **guarantees** a majority, drop the verify pass and \`return candidate\`.

📌 **Interview term: Integer division (in JavaScript)** — JavaScript has no integer division operator; \`/\` always produces a floating-point number. That is harmless in a comparison (\`occurrences > 3.5\` works) but breaks indexing, checked by running it:

~~~javascript
const nums = [2, 2, 1, 1, 1, 2, 2];
console.log(nums.length / 2);                       // not an integer for odd lengths
console.log(nums[nums.length / 2]);                 // index 3.5 does not exist
const sorted = [...nums].sort((a, b) => a - b);
console.log(sorted[Math.floor(nums.length / 2)]);   // the middle of the sorted copy
~~~

~~~text
3.5
undefined
2
~~~

\`nums[3.5]\` is \`undefined\` — there is no element at a fractional index — so the middle of the sorted array needs \`Math.floor(nums.length / 2)\` (or \`nums.length >> 1\` for non-huge lengths). The copy-and-sort line uses a numeric comparator: without one, \`.sort()\` compares as strings.

## 6. Verified: Running the Code

Both examples were saved as \`main.js\` and run with \`node main.js\` (Node v22). Example 1 — the vote plus verify on seven inputs, including no majority, exactly half and empty:

~~~text
3
2
1
6
-1
-1
-1
~~~

Example 2 — the vote step by step, the no-majority trap, and three methods side by side:

~~~text
vote on [2, 2, 1, 1, 1, 2, 2]:
  read 2 -> candidate=2 count=1
  read 2 -> candidate=2 count=2
  read 1 -> candidate=2 count=1
  read 1 -> candidate=2 count=0
  read 1 -> candidate=1 count=1
  read 2 -> candidate=1 count=0
  read 2 -> candidate=2 count=1
  winner = 2
vote on [1, 2, 3] (no majority):
  read 1 -> candidate=1 count=1
  read 2 -> candidate=1 count=0
  read 3 -> candidate=3 count=1
  candidate = 3, but it appears once, so verify says -1
[2, 2, 1, 1, 1, 2, 2]: vote=2 count=2 sort=2
[5, 1, 5, 2, 5]: vote=5 count=5 sort=5
[1, 2, 3]: vote=-1 count=-1 sort=-1
[4, 4, 4, 4]: vote=4 count=4 sort=4
~~~

The first trace is the one in the diagram: the candidate switches to \`1\` at the fifth element and back to \`2\` at the last one. The second trace shows the trap: on \`[1, 2, 3]\` the vote ends with candidate \`3\`, though 3 appears once — only verification catches it. All three methods agree on every test array. \`byCounting\` can return early: as soon as one count exceeds \`Math.floor(n / 2)\`, no other value can catch up.

## 7. Complexity

| Method | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Boyer-Moore vote | O(n) | O(1) | One pass, two variables |
| Vote + verify | O(n) | O(1) | A second O(n) counting pass |
| \`Map\` counting | O(n) average | O(k) | One O(1)-average \`get\`/\`set\` per element |
| Sorted copy + middle | O(n log n) | O(n) | \`[...nums]\` copy plus the sort |
| Brute force | O(n²) | O(1) | A full count for every element |

For the meaning of these labels, see [What is Big-O notation?](/interview-question/what-is-big-o-notation)

## Edge Cases

- **Single element** (\`[1]\`) — it is the majority (1 > ⌊1/2⌋ = 0).
- **Exactly half** (\`[1, 1, 2, 2]\`) — no majority: 2 is not more than ⌊4/2⌋ = 2. The verify pass returns \`-1\`.
- **No majority at all** (\`[1, 2, 3]\`) — the vote's candidate is \`3\`; only verification catches it.
- **Empty array** — no candidate; return the agreed "none" value without reading \`nums[0]\`.
- **All equal** (\`[4, 4, 4, 4]\`) — the count just climbs; the answer is 4.
- **Majority at the very end** (\`[2, 2, 1, 1, 1, 2, 2]\`) — the candidate switches to 1 mid-way and back to 2; the vote does not need the majority to lead early.

## Common Pitfalls

- **Skipping verification when a majority is not guaranteed** — \`[1, 2, 3]\` returns 3.
- **\`nums[nums.length / 2]\`** — \`undefined\` for odd lengths, as shown above; use \`Math.floor\`.
- **\`.sort()\` without a comparator, on the original array** — compares as strings and mutates the caller's data. Copy and pass \`(a, b) => a - b\`.
- **Using \`>=\` instead of \`>\`** — makes \`[1, 1, 2, 2]\` report 1 as a majority.
- **Loose equality \`==\`** — \`1 == '1'\` is \`true\`, so mixed-type input would be miscounted; use \`===\`.
- **Starting with \`candidate = nums[0]\`** — on an empty array that is \`undefined\`, which then "wins" silently; start with \`count = 0\` and a verify pass.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">I use the Boyer-Moore vote — a candidate and a count; when the count is 0 the current element becomes the candidate; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+1</code> on a match, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code> otherwise.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code> cancels the element against one copy of the candidate; removing pairs of different values never destroys a majority, because it outnumbers everything else combined.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> count is O(n) space, and sorting is O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The verify pass:</strong> <span style="color:#f0e2c8;">If a majority is not guaranteed, I count the candidate again and check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt; Math.floor(n / 2)</code>, because the vote always returns something — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 3]</code> gives 3.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n / 2</code> is a float, so I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.floor</code> for the threshold and the middle index, and I sort a copy with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is there at most one majority element?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two different values each appearing more than n/2 times would need more than n positions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the vote return with no majority?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Some candidate anyway — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 3]</code> in the run above — so I verify unless a majority is guaranteed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find all elements appearing more than n/3 times?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two candidates and two counters: increment the matching one, fill an empty slot when a counter is 0, otherwise decrement both; then verify both in a second pass. O(n) time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> version ever better?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is simpler to explain and can stop early once a count passes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.floor(n / 2)</code>; it also generalises to "most frequent" questions. The cost is O(k) memory for k distinct values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What breaks with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nums[nums.length / 2]</code> after sorting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For an odd length the index is fractional, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3.5</code>, and the read returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> — the run above shows it. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.floor(nums.length / 2)</code> fixes it.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Majority element** | A value appearing more than ⌊n/2⌋ times; at most one exists |
| **Boyer-Moore majority vote** | One candidate plus a counter; +1 for a match, −1 otherwise, new candidate at 0 |
| **Verification pass** | A second scan that checks the candidate really exceeds n/2 |
| **The middle-index argument** | A majority always occupies the middle position of the sorted array |
| **Integer division (in JavaScript)** | There is none: use \`Math.floor(a / b)\` for a whole-number result |

---
**Conclusion:** The majority element appears more than ⌊n/2⌋ times, so at most one exists. A \`Map\` count is O(n) time and O(n) space, sorting a copy and reading the middle is O(n log n), and the Boyer-Moore vote — one candidate, one counter — is O(n) time and O(1) space, correct because cancelling pairs of different values never eliminates a majority. If a majority is not guaranteed, verify the candidate in a second pass. In JavaScript, remember that \`/\` never gives an integer index and that \`.sort()\` needs a numeric comparator. The same counting toolkit appears in [top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements) and [finding a duplicate](/interview-question/how-do-you-find-a-duplicate-in-an-array).`,
        examples: [
          {
            label: "Boyer-Moore voting with a verify pass on seven inputs",
            code: `function majority(nums) {
  // Return the value that appears more than Math.floor(n / 2) times, or -1 if none.
  let candidate = null, count = 0;
  for (const x of nums) {              // phase 1: Boyer-Moore voting
    if (count === 0) candidate = x;    // nobody is ahead: x becomes the candidate
    count += x === candidate ? 1 : -1;
  }
  let occurrences = 0;                 // phase 2: verify (skip if a majority is guaranteed)
  for (const x of nums) if (x === candidate) occurrences++;
  return occurrences > Math.floor(nums.length / 2) ? candidate : -1;
}

console.log(majority([3, 2, 3]));              // 3
console.log(majority([2, 2, 1, 1, 1, 2, 2]));  // 2
console.log(majority([1]));                    // 1
console.log(majority([6, 6, 6, 7, 7]));        // 6
console.log(majority([1, 2, 3]));              // -1
console.log(majority([1, 1, 2, 2]));           // -1
console.log(majority([]));                     // -1`,
          },
          {
            label: "Trace of the vote, the no-majority trap, and vote vs count vs sort",
            code: `// Watch the vote, see why the verify pass matters, and compare three methods.

function trace(nums) {
  let candidate = null, count = 0;
  for (const x of nums) {
    if (count === 0) candidate = x;
    count += x === candidate ? 1 : -1;
    console.log('  read ' + x + ' -> candidate=' + candidate + ' count=' + count);
  }
  return candidate;
}

function countOf(nums, v) {
  let c = 0;
  for (const x of nums) if (x === v) c++;
  return c;
}

function byVote(nums) {               // O(n) time, O(1) space, includes the verify pass
  let candidate = null, count = 0;
  for (const x of nums) {
    if (count === 0) candidate = x;
    count += x === candidate ? 1 : -1;
  }
  return countOf(nums, candidate) > Math.floor(nums.length / 2) ? candidate : -1;
}

function byCounting(nums) {           // O(n) time, O(k) space
  const counts = new Map();
  for (const x of nums) {
    counts.set(x, (counts.get(x) || 0) + 1);
    if (counts.get(x) > Math.floor(nums.length / 2)) return x;
  }
  return -1;
}

function bySorting(nums) {            // O(n log n): the middle element of the sorted copy
  if (nums.length === 0) return -1;
  const mid = [...nums].sort((a, b) => a - b)[Math.floor(nums.length / 2)];
  return countOf(nums, mid) > Math.floor(nums.length / 2) ? mid : -1;
}

console.log('vote on [2, 2, 1, 1, 1, 2, 2]:');
console.log('  winner = ' + trace([2, 2, 1, 1, 1, 2, 2]));
console.log('vote on [1, 2, 3] (no majority):');
console.log('  candidate = ' + trace([1, 2, 3]) + ', but it appears once, so verify says -1');
for (const nums of [[2, 2, 1, 1, 1, 2, 2], [5, 1, 5, 2, 5], [1, 2, 3], [4, 4, 4, 4]]) {
  console.log('[' + nums.join(', ') + ']: vote=' + byVote(nums) +
    ' count=' + byCounting(nums) + ' sort=' + bySorting(nums));
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an \`int[]\`, return the majority element — the value that appears more than n/2 times. Assume one exists, then tell me what changes if it might not. Please implement it in Java using O(1) extra space."

**What a strong answer should cover:**
- The definition: more than ⌊n/2⌋ occurrences, so at most one majority exists; exactly half is not a majority.
- The simple answers: a \`HashMap<Integer, Integer>\` count (O(n) time, O(n) space) and \`Arrays.sort\` then the middle element (O(n log n)).
- Boyer-Moore voting: one candidate and one counter, O(n) time and O(1) space, and why it is correct (cancelling pairs).
- The verification pass when a majority is not guaranteed (\`{1, 2, 3}\` yields candidate 3).
- Java specifics: \`n / 2\` is integer division (floors for non-negative n); \`Map.merge\` returns the new count; \`Arrays.sort(int[])\` sorts the caller's array; \`Collectors.counting()\` produces \`Long\` values; the vote itself uses plain \`int\`s with no boxing.

**Clarifying questions expected:**
- Is a majority guaranteed? What should be returned if there is none?

**Code / implementation expected:** Yes — a Boyer-Moore \`majority(int[] nums)\` in Java with an optional verify pass, run on inputs with and without a majority.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know Java arrays and loops; nothing else assumed.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by compiling and running the code (\`javac\` and \`java\`, JDK 21); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

A crowd of supporters from different football clubs is in a hall. You are told that **more than half** of the people support one club, and you need to find out which — but you have no paper, and you can only remember one club name and one number at a time.

Here is a trick. Ask people to walk out of the hall in pairs, and every pair must be two supporters of **different** clubs. Keep going until no such pair can be formed. The people left in the hall all support the same club — and it has to be the majority club. Why? Each pair that leaves takes away **at most one** majority supporter, but also one other person. Since the majority club has more people than everybody else combined, the others run out first.

You do not even need to arrange the pairs in advance. Let people come up one at a time. Keep a "current club" and a counter. If the counter is 0, the newcomer's club becomes the current club. If the newcomer supports the current club, add 1; otherwise subtract 1 (that newcomer "pairs off" with one supporter of the current club). After everyone has come up, the current club is the majority.

That is the **Boyer-Moore majority vote algorithm**: one pass, one remembered value, one counter. It is a favourite interview question because the obvious answer (count everything in a hash map) is easy, while the O(1)-space answer needs a genuinely clever argument — and you have to be able to explain why it is correct.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is a majority element guaranteed to exist? | If yes, the vote's candidate is the answer. If not, you need a second pass to **verify** it — the vote always produces some candidate. |
| Does "majority" mean strictly more than n/2? | The standard definition is more than ⌊n/2⌋. Exactly half (\`[1, 1, 2, 2]\`) is **not** a majority. |
| What should I return when there is none, or for an empty array? | \`-1\`, \`null\`/\`None\`, or an exception — agree on it. |
| Is O(1) extra space required? | Decides between the hash-map count (simple, O(n) space) and Boyer-Moore (O(1) space). |
| Is the data a stream I can read only once? | The vote works on one pass; the verify step needs a second pass or a guarantee. |

## 3. The Core Idea

📌 **Interview term: Majority element** — a value that appears **more than ⌊n/2⌋ times** in an array of length n. There can be at most one: two different values cannot each fill more than half the positions.

📌 **Interview term: Boyer-Moore majority vote** — keep a \`candidate\` and a \`count\`. For each element: if \`count\` is 0, make the element the candidate; then add 1 if the element equals the candidate, otherwise subtract 1. If a majority exists, the final candidate is it.

Here is the vote on \`[2, 2, 1, 1, 1, 2, 2]\`, exactly as example 2 prints it:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 210" role="img" aria-label="Trace of Boyer-Moore voting on 2 2 1 1 1 2 2. Candidate row 2 2 2 2 1 1 2. Count row 1 2 1 0 1 0 1. The final candidate is 2">
  <text class="d-sub" x="60" y="62" text-anchor="middle">read</text>
  <text class="d-sub" x="60" y="122" text-anchor="middle">candidate</text>
  <text class="d-sub" x="60" y="182" text-anchor="middle">count</text>
  <text class="d-sub" x="152" y="24" text-anchor="middle">1</text>
  <text class="d-sub" x="232" y="24" text-anchor="middle">2</text>
  <text class="d-sub" x="312" y="24" text-anchor="middle">3</text>
  <text class="d-sub" x="392" y="24" text-anchor="middle">4</text>
  <text class="d-sub" x="472" y="24" text-anchor="middle">5</text>
  <text class="d-sub" x="552" y="24" text-anchor="middle">6</text>
  <text class="d-sub" x="632" y="24" text-anchor="middle">7</text>
  <rect class="d-box" x="124" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="152" y="63" text-anchor="middle">2</text>
  <rect class="d-box" x="204" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="232" y="63" text-anchor="middle">2</text>
  <rect class="d-box" x="284" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="312" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="364" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="392" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="444" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="472" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="524" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="552" y="63" text-anchor="middle">2</text>
  <rect class="d-box" x="604" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="632" y="63" text-anchor="middle">2</text>
  <text class="d-text" x="152" y="123" text-anchor="middle">2</text>
  <text class="d-text" x="232" y="123" text-anchor="middle">2</text>
  <text class="d-text" x="312" y="123" text-anchor="middle">2</text>
  <text class="d-text" x="392" y="123" text-anchor="middle">2</text>
  <text class="d-text d-accent" x="472" y="123" text-anchor="middle">1</text>
  <text class="d-text d-accent" x="552" y="123" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="604" y="98" width="56" height="38" rx="6"/>
  <text class="d-text d-accent" x="632" y="123" text-anchor="middle">2</text>
  <text class="d-text" x="152" y="183" text-anchor="middle">1</text>
  <text class="d-text" x="232" y="183" text-anchor="middle">2</text>
  <text class="d-text" x="312" y="183" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="364" y="158" width="56" height="38" rx="6"/>
  <text class="d-text" x="392" y="183" text-anchor="middle">0</text>
  <text class="d-text" x="472" y="183" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="524" y="158" width="56" height="38" rx="6"/>
  <text class="d-text" x="552" y="183" text-anchor="middle">0</text>
  <text class="d-text" x="632" y="183" text-anchor="middle">1</text>
</svg>

The count hit 0 twice (steps 4 and 6). Each time, the next element became the new candidate — at step 5 that was \`1\`, which looks like the "wrong" answer for a while. The majority still wins at the end, because it outnumbers everything else.

### Why it works: cancelling pairs

<svg class="iq-diagram" width="100%" viewBox="0 0 700 170" role="img" aria-label="Pairs of different values cancel. In 2 2 1 1 1 2 2 the pairs 2 and 1, 2 and 1, 1 and 2 cancel, leaving one 2, the majority">
  <rect class="d-box-muted" x="40" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="68" y="56" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="106" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="134" y="56" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="212" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="240" y="56" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="278" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="306" y="56" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="384" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="412" y="56" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="450" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="478" y="56" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="584" y="30" width="56" height="40" rx="6"/>
  <text class="d-text d-accent" x="612" y="56" text-anchor="middle">2</text>
  <text class="d-sub" x="101" y="110" text-anchor="middle">pair cancels</text>
  <text class="d-sub" x="273" y="110" text-anchor="middle">pair cancels</text>
  <text class="d-sub" x="445" y="110" text-anchor="middle">pair cancels</text>
  <text class="d-text d-accent" x="612" y="110" text-anchor="middle">survivor</text>
</svg>

Every "subtract 1" pairs the current element with one copy of the candidate, and the two are different values. Removing a pair of **different** values from the array never destroys a majority: the pair contains at most one copy of the majority value, so if the majority had more than half of n elements before, it still has more than half of the n − 2 that remain. When the count drops to 0, the whole prefix read so far has been split into such pairs, so the algorithm can forget it and start fresh — which is exactly what "if count is 0, take a new candidate" does. Whatever survives all the cancelling is the majority.

📌 **Interview term: Verification pass** — if a majority is **not** guaranteed, the vote still outputs a candidate (on \`[1, 2, 3]\` it outputs \`3\`). A second pass that counts the candidate and checks \`count > n / 2\` turns "candidate" into "answer or none". It keeps the algorithm O(n) time and O(1) space.

## 4. All the Approaches

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| Brute force: count each value with a full scan | O(n²) | O(1) | The starting point only |
| Hash-map counting | O(n) | O(k), k distinct values | Simple; can stop as soon as a count exceeds n/2 |
| Sort, take the middle element | O(n log n) | O(1) to O(n), depending on the sort | A majority always covers index ⌊n/2⌋ of the sorted array |
| Selection of the median (quickselect) | O(n) average | O(1) | Same "middle element" idea without a full sort; see [quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element) |
| **Boyer-Moore vote** (+ verify) | **O(n)** | **O(1)** | The expected optimal answer |

📌 **Interview term: The middle-index argument** — a value that occupies more than half the positions of a sorted array forms one contiguous run longer than n/2, and any such run must cover the middle index ⌊n/2⌋. So \`sorted(nums)[n // 2]\` is the majority if one exists (and still needs verifying if it might not).

**Generalisation.** The same cancelling idea finds all values appearing more than n/3 times with **two** candidates and two counters (at most two such values can exist), and in general more than n/k times with k − 1 candidates. Always verify the candidates in a second pass. For the related "most frequent k values" problem — where there is no majority guarantee — use counting plus a heap: [top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements).

## 5. The Code in Java

~~~java
public class Main {
    // Return the value that appears more than n / 2 times, or -1 if none.
    static int majority(int[] nums) {
        int candidate = 0, count = 0;
        for (int x : nums) {                 // phase 1: Boyer-Moore voting
            if (count == 0) candidate = x;   // nobody is ahead: x becomes the candidate
            count += (x == candidate) ? 1 : -1;
        }
        int occurrences = 0;                 // phase 2: verify (skip if a majority is guaranteed)
        for (int x : nums) if (x == candidate) occurrences++;
        return occurrences > nums.length / 2 ? candidate : -1;   // int division floors for n >= 0
    }

    public static void main(String[] args) {
        System.out.println(majority(new int[]{3, 2, 3}));              // 3
        System.out.println(majority(new int[]{2, 2, 1, 1, 1, 2, 2}));  // 2
        System.out.println(majority(new int[]{1}));                    // 1
        System.out.println(majority(new int[]{6, 6, 6, 7, 7}));        // 6
        System.out.println(majority(new int[]{1, 2, 3}));              // -1
        System.out.println(majority(new int[]{1, 1, 2, 2}));           // -1
        System.out.println(majority(new int[]{}));                     // -1
    }
}
~~~

- **\`int candidate = 0, count = 0\`** — the initial \`candidate\` value never matters: with \`count == 0\`, the first element replaces it.
- **\`count += (x == candidate) ? 1 : -1\`** — \`==\` on two \`int\`s compares values. (If these were \`Integer\`s, \`==\` would compare references.)
- **\`occurrences > nums.length / 2\`** — \`nums.length / 2\` is **integer division**: for length 7 it is 3, so the value needs at least 4 copies. For an empty array, \`occurrences\` is 0 and \`0 > 0\` is false, so it returns -1 with no special case.
- If the problem **guarantees** a majority, drop the verify loop and return \`candidate\`.

📌 **Interview term: Integer division** — dividing two \`int\`s in Java discards the fractional part (rounds toward zero), so \`7 / 2\` is \`3\`. That is exactly the ⌊n/2⌋ in the definition, and it is a valid array index for the middle element.

Two Java idioms for the counting approach, checked by running them:

~~~java
import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public class Main {
    public static void main(String[] args) {
        int[] nums = {2, 2, 1, 1, 1, 2, 2};
        Map<Integer, Long> counts = Arrays.stream(nums).boxed()
            .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
        System.out.println(counts.get(2) + " " + counts.get(1));   // counting() gives Long values
        System.out.println(7 / 2);                                 // int division drops the .5
    }
}
~~~

~~~text
4 3
3
~~~

The stream version groups and counts in one expression; note that \`Collectors.counting()\` produces \`Long\` values, so comparing them with an \`int\` threshold works through widening, but comparing two counts with \`==\` would compare \`Long\` references. In example 2, \`counts.merge(x, 1, Integer::sum)\` both updates the map and **returns** the new count, which lets \`byCounting\` stop early.

## 6. Verified: Running the Code

Both examples were saved as \`Main.java\` and run with \`javac Main.java && java Main\` (JDK 21). Example 1 — the vote plus verify on seven inputs, including no majority, exactly half and empty:

~~~text
3
2
1
6
-1
-1
-1
~~~

Example 2 — the vote step by step, the no-majority trap, and three methods side by side:

~~~text
vote on [2, 2, 1, 1, 1, 2, 2]:
  read 2 -> candidate=2 count=1
  read 2 -> candidate=2 count=2
  read 1 -> candidate=2 count=1
  read 1 -> candidate=2 count=0
  read 1 -> candidate=1 count=1
  read 2 -> candidate=1 count=0
  read 2 -> candidate=2 count=1
  winner = 2
vote on [1, 2, 3] (no majority):
  read 1 -> candidate=1 count=1
  read 2 -> candidate=1 count=0
  read 3 -> candidate=3 count=1
  candidate = 3, but it appears once, so verify says -1
[2, 2, 1, 1, 1, 2, 2]: vote=2 count=2 sort=2
[5, 1, 5, 2, 5]: vote=5 count=5 sort=5
[1, 2, 3]: vote=-1 count=-1 sort=-1
[4, 4, 4, 4]: vote=4 count=4 sort=4
~~~

The first trace is the one in the diagram: the candidate switches to \`1\` at the fifth element and back to \`2\` at the last one. The second trace shows the trap: on \`{1, 2, 3}\` the vote ends with candidate \`3\`, though 3 appears once — only verification catches it. All three methods agree. \`bySorting\` sorts \`nums.clone()\`, because \`Arrays.sort(int[])\` sorts the array you pass, in place.

## 7. Complexity

| Method | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Boyer-Moore vote | O(n) | O(1) | One pass, two \`int\`s, no allocation |
| Vote + verify | O(n) | O(1) | A second O(n) counting pass |
| \`HashMap\` counting | O(n) average | O(k) | One O(1)-average \`merge\` per element, boxed entries |
| \`clone()\` + \`Arrays.sort\` + middle | O(n log n) | O(n) for the clone | Sorting in place without the clone needs no extra array |
| Brute force | O(n²) | O(1) | A full count for every element |

For the meaning of these labels, see [What is Big-O notation?](/interview-question/what-is-big-o-notation)

## Edge Cases

- **Single element** (\`[1]\`) — it is the majority (1 > ⌊1/2⌋ = 0).
- **Exactly half** (\`[1, 1, 2, 2]\`) — no majority: 2 is not more than ⌊4/2⌋ = 2. The verify pass returns \`-1\`.
- **No majority at all** (\`[1, 2, 3]\`) — the vote's candidate is \`3\`; only verification catches it.
- **Empty array** — no candidate; return the agreed "none" value without reading \`nums[0]\`.
- **All equal** (\`[4, 4, 4, 4]\`) — the count just climbs; the answer is 4.
- **Majority at the very end** (\`[2, 2, 1, 1, 1, 2, 2]\`) — the candidate switches to 1 mid-way and back to 2; the vote does not need the majority to lead early.

## Common Pitfalls

- **Skipping verification when a majority is not guaranteed** — \`{1, 2, 3}\` returns 3.
- **Using \`>=\` instead of \`>\`** — makes \`{1, 1, 2, 2}\` report 1 as a majority.
- **\`Arrays.sort(nums)\` on the caller's array** in the sorting approach — it reorders their data; clone first.
- **Comparing counts from a \`Map<Integer, Integer>\` or \`Map<Integer, Long>\` with \`==\`** — reference comparison on boxed values; use \`equals\` or unbox.
- **\`int candidate = nums[0]\`** — a common variant, but on an empty array it throws \`ArrayIndexOutOfBoundsException\`; start from \`count = 0\` instead.
- **Returning a sentinel like \`-1\` when \`-1\` can be a real value** — if inputs can be negative, return \`OptionalInt\` or throw instead.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">I use the Boyer-Moore vote — an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> candidate and count; when the count is 0 the current element becomes the candidate; +1 on a match, −1 otherwise.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Each −1 cancels the element against one copy of the candidate; removing pairs of different values never destroys a majority, because it outnumbers everything else combined.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space with no boxing; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> count is O(n) space, and sorting is O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The verify pass:</strong> <span style="color:#f0e2c8;">If a majority is not guaranteed, I count the candidate again and check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt; nums.length / 2</code>, because the vote always returns something — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1, 2, 3}</code> gives 3.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums.length / 2</code> is integer division, so it is exactly ⌊n/2⌋; and if I sort, I sort <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums.clone()</code> because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort</code> works in place.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is there at most one majority element?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two different values each appearing more than n/2 times would need more than n positions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the vote return with no majority?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Some candidate anyway — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1, 2, 3}</code> in the run above — so I verify unless a majority is guaranteed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find all elements appearing more than n/3 times?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two candidates and two counters: increment the matching one, fill an empty slot when a counter is 0, otherwise decrement both; then verify both in a second pass and return a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List&lt;Integer&gt;</code>. O(n) time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you return if there is no majority and any <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code> can be a valid answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code>: I would return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OptionalInt.empty()</code> (and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OptionalInt.of(candidate)</code> otherwise), or throw an exception, so the caller cannot confuse "none" with a real value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the vote faster than the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap</code> in Java, beyond Big-O space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It touches only two local <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>s per element; the map boxes keys and counts into objects and hashes every element, so it allocates and has a much larger constant factor.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Majority element** | A value appearing more than ⌊n/2⌋ times; at most one exists |
| **Boyer-Moore majority vote** | One candidate plus a counter; +1 for a match, −1 otherwise, new candidate at 0 |
| **Verification pass** | A second scan that checks the candidate really exceeds n/2 |
| **The middle-index argument** | A majority always occupies the middle position of the sorted array |
| **Integer division** | \`int / int\` drops the fraction: \`7 / 2\` is \`3\` |

---
**Conclusion:** The majority element appears more than ⌊n/2⌋ times, so at most one exists. A \`HashMap\` count is O(n) time and O(n) space, sorting a clone and reading \`s[n / 2]\` is O(n log n), and the Boyer-Moore vote — one candidate, one counter, all plain \`int\`s — is O(n) time and O(1) space, correct because cancelling pairs of different values never eliminates a majority. If a majority is not guaranteed, verify the candidate in a second pass. In Java, \`n / 2\` is already the floor, \`merge\` returns the updated count, \`Arrays.sort\` mutates its argument, and boxed counts must not be compared with \`==\`. The same counting toolkit appears in [top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements) and [finding a duplicate](/interview-question/how-do-you-find-a-duplicate-in-an-array).`,
        examples: [
          {
            label: "Boyer-Moore voting with a verify pass on seven inputs",
            code: `public class Main {
    // Return the value that appears more than n / 2 times, or -1 if none.
    static int majority(int[] nums) {
        int candidate = 0, count = 0;
        for (int x : nums) {                 // phase 1: Boyer-Moore voting
            if (count == 0) candidate = x;   // nobody is ahead: x becomes the candidate
            count += (x == candidate) ? 1 : -1;
        }
        int occurrences = 0;                 // phase 2: verify (skip if a majority is guaranteed)
        for (int x : nums) if (x == candidate) occurrences++;
        return occurrences > nums.length / 2 ? candidate : -1;   // int division floors for n >= 0
    }

    public static void main(String[] args) {
        System.out.println(majority(new int[]{3, 2, 3}));              // 3
        System.out.println(majority(new int[]{2, 2, 1, 1, 1, 2, 2}));  // 2
        System.out.println(majority(new int[]{1}));                    // 1
        System.out.println(majority(new int[]{6, 6, 6, 7, 7}));        // 6
        System.out.println(majority(new int[]{1, 2, 3}));              // -1
        System.out.println(majority(new int[]{1, 1, 2, 2}));           // -1
        System.out.println(majority(new int[]{}));                     // -1
    }
}`,
          },
          {
            label: "Trace of the vote, the no-majority trap, and vote vs count vs sort",
            code: `import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class Main {
    // Watch the vote, see why the verify pass matters, and compare three methods.

    static int trace(int[] nums) {
        int candidate = 0, count = 0;
        for (int x : nums) {
            if (count == 0) candidate = x;
            count += (x == candidate) ? 1 : -1;
            System.out.println("  read " + x + " -> candidate=" + candidate + " count=" + count);
        }
        return candidate;
    }

    static int countOf(int[] nums, int v) {
        int c = 0;
        for (int x : nums) if (x == v) c++;
        return c;
    }

    static int byVote(int[] nums) {            // O(n) time, O(1) space, includes the verify pass
        int candidate = 0, count = 0;
        for (int x : nums) {
            if (count == 0) candidate = x;
            count += (x == candidate) ? 1 : -1;
        }
        return countOf(nums, candidate) > nums.length / 2 ? candidate : -1;
    }

    static int byCounting(int[] nums) {        // O(n) time, O(k) space
        Map<Integer, Integer> counts = new HashMap<>();
        for (int x : nums) {
            int c = counts.merge(x, 1, Integer::sum);   // merge returns the new count
            if (c > nums.length / 2) return x;
        }
        return -1;
    }

    static int bySorting(int[] nums) {         // O(n log n): the middle element of a sorted copy
        if (nums.length == 0) return -1;
        int[] s = nums.clone();
        Arrays.sort(s);
        int mid = s[nums.length / 2];
        return countOf(nums, mid) > nums.length / 2 ? mid : -1;
    }

    public static void main(String[] args) {
        System.out.println("vote on [2, 2, 1, 1, 1, 2, 2]:");
        int w = trace(new int[]{2, 2, 1, 1, 1, 2, 2});
        System.out.println("  winner = " + w);
        System.out.println("vote on [1, 2, 3] (no majority):");
        int c = trace(new int[]{1, 2, 3});
        System.out.println("  candidate = " + c + ", but it appears once, so verify says -1");
        int[][] tests = {{2, 2, 1, 1, 1, 2, 2}, {5, 1, 5, 2, 5}, {1, 2, 3}, {4, 4, 4, 4}};
        for (int[] nums : tests) {
            System.out.println(Arrays.toString(nums) + ": vote=" + byVote(nums)
                + " count=" + byCounting(nums) + " sort=" + bySorting(nums));
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a \`std::vector<int>\`, return the majority element — the value that appears more than n/2 times. Assume one exists, then tell me what changes if it might not. Please write it in C++ with O(1) extra space."

**What a strong answer should cover:**
- The definition: more than ⌊n/2⌋ occurrences, so at most one majority exists; exactly half is not a majority.
- The simple answers: an \`unordered_map<int, int>\` count (O(n) time, O(n) space) and sorting then the middle element (O(n log n)), or \`std::nth_element\` for the middle in O(n) average.
- Boyer-Moore voting: one candidate and one counter, O(n) time and O(1) space, and why it is correct (cancelling pairs).
- The verification pass when a majority is not guaranteed (\`{1, 2, 3}\` yields candidate 3), using \`std::count\`.
- C++ specifics: \`++counts[x]\` relies on \`operator[]\` value-initialising a new key to 0; \`nums.size() / 2\` is unsigned \`size_t\` arithmetic, so mixing it with signed counts needs care; \`std::nth_element\` rearranges its range, so work on a copy.

**Clarifying questions expected:**
- Is a majority guaranteed? What should be returned if there is none?

**Code / implementation expected:** Yes — a Boyer-Moore \`majority(const vector<int>&)\` in C++17 with an optional verify pass, run on inputs with and without a majority.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you know basic C++ (\`std::vector\`, loops, functions); nothing else assumed.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown was produced by compiling and running the code with \`g++ -std=c++17\` (GCC 13); nothing is typed in by hand.

## 1. Why This Even Matters — A Story First

A crowd of supporters from different football clubs is in a hall. You are told that **more than half** of the people support one club, and you need to find out which — but you have no paper, and you can only remember one club name and one number at a time.

Here is a trick. Ask people to walk out of the hall in pairs, and every pair must be two supporters of **different** clubs. Keep going until no such pair can be formed. The people left in the hall all support the same club — and it has to be the majority club. Why? Each pair that leaves takes away **at most one** majority supporter, but also one other person. Since the majority club has more people than everybody else combined, the others run out first.

You do not even need to arrange the pairs in advance. Let people come up one at a time. Keep a "current club" and a counter. If the counter is 0, the newcomer's club becomes the current club. If the newcomer supports the current club, add 1; otherwise subtract 1 (that newcomer "pairs off" with one supporter of the current club). After everyone has come up, the current club is the majority.

That is the **Boyer-Moore majority vote algorithm**: one pass, one remembered value, one counter. It is a favourite interview question because the obvious answer (count everything in a hash map) is easy, while the O(1)-space answer needs a genuinely clever argument — and you have to be able to explain why it is correct.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is a majority element guaranteed to exist? | If yes, the vote's candidate is the answer. If not, you need a second pass to **verify** it — the vote always produces some candidate. |
| Does "majority" mean strictly more than n/2? | The standard definition is more than ⌊n/2⌋. Exactly half (\`[1, 1, 2, 2]\`) is **not** a majority. |
| What should I return when there is none, or for an empty array? | \`-1\`, \`null\`/\`None\`, or an exception — agree on it. |
| Is O(1) extra space required? | Decides between the hash-map count (simple, O(n) space) and Boyer-Moore (O(1) space). |
| Is the data a stream I can read only once? | The vote works on one pass; the verify step needs a second pass or a guarantee. |

## 3. The Core Idea

📌 **Interview term: Majority element** — a value that appears **more than ⌊n/2⌋ times** in an array of length n. There can be at most one: two different values cannot each fill more than half the positions.

📌 **Interview term: Boyer-Moore majority vote** — keep a \`candidate\` and a \`count\`. For each element: if \`count\` is 0, make the element the candidate; then add 1 if the element equals the candidate, otherwise subtract 1. If a majority exists, the final candidate is it.

Here is the vote on \`[2, 2, 1, 1, 1, 2, 2]\`, exactly as example 2 prints it:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 210" role="img" aria-label="Trace of Boyer-Moore voting on 2 2 1 1 1 2 2. Candidate row 2 2 2 2 1 1 2. Count row 1 2 1 0 1 0 1. The final candidate is 2">
  <text class="d-sub" x="60" y="62" text-anchor="middle">read</text>
  <text class="d-sub" x="60" y="122" text-anchor="middle">candidate</text>
  <text class="d-sub" x="60" y="182" text-anchor="middle">count</text>
  <text class="d-sub" x="152" y="24" text-anchor="middle">1</text>
  <text class="d-sub" x="232" y="24" text-anchor="middle">2</text>
  <text class="d-sub" x="312" y="24" text-anchor="middle">3</text>
  <text class="d-sub" x="392" y="24" text-anchor="middle">4</text>
  <text class="d-sub" x="472" y="24" text-anchor="middle">5</text>
  <text class="d-sub" x="552" y="24" text-anchor="middle">6</text>
  <text class="d-sub" x="632" y="24" text-anchor="middle">7</text>
  <rect class="d-box" x="124" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="152" y="63" text-anchor="middle">2</text>
  <rect class="d-box" x="204" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="232" y="63" text-anchor="middle">2</text>
  <rect class="d-box" x="284" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="312" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="364" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="392" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="444" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="472" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="524" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="552" y="63" text-anchor="middle">2</text>
  <rect class="d-box" x="604" y="38" width="56" height="38" rx="6"/>
  <text class="d-text" x="632" y="63" text-anchor="middle">2</text>
  <text class="d-text" x="152" y="123" text-anchor="middle">2</text>
  <text class="d-text" x="232" y="123" text-anchor="middle">2</text>
  <text class="d-text" x="312" y="123" text-anchor="middle">2</text>
  <text class="d-text" x="392" y="123" text-anchor="middle">2</text>
  <text class="d-text d-accent" x="472" y="123" text-anchor="middle">1</text>
  <text class="d-text d-accent" x="552" y="123" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="604" y="98" width="56" height="38" rx="6"/>
  <text class="d-text d-accent" x="632" y="123" text-anchor="middle">2</text>
  <text class="d-text" x="152" y="183" text-anchor="middle">1</text>
  <text class="d-text" x="232" y="183" text-anchor="middle">2</text>
  <text class="d-text" x="312" y="183" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="364" y="158" width="56" height="38" rx="6"/>
  <text class="d-text" x="392" y="183" text-anchor="middle">0</text>
  <text class="d-text" x="472" y="183" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="524" y="158" width="56" height="38" rx="6"/>
  <text class="d-text" x="552" y="183" text-anchor="middle">0</text>
  <text class="d-text" x="632" y="183" text-anchor="middle">1</text>
</svg>

The count hit 0 twice (steps 4 and 6). Each time, the next element became the new candidate — at step 5 that was \`1\`, which looks like the "wrong" answer for a while. The majority still wins at the end, because it outnumbers everything else.

### Why it works: cancelling pairs

<svg class="iq-diagram" width="100%" viewBox="0 0 700 170" role="img" aria-label="Pairs of different values cancel. In 2 2 1 1 1 2 2 the pairs 2 and 1, 2 and 1, 1 and 2 cancel, leaving one 2, the majority">
  <rect class="d-box-muted" x="40" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="68" y="56" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="106" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="134" y="56" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="212" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="240" y="56" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="278" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="306" y="56" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="384" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="412" y="56" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="450" y="30" width="56" height="40" rx="6"/>
  <text class="d-sub" x="478" y="56" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="584" y="30" width="56" height="40" rx="6"/>
  <text class="d-text d-accent" x="612" y="56" text-anchor="middle">2</text>
  <text class="d-sub" x="101" y="110" text-anchor="middle">pair cancels</text>
  <text class="d-sub" x="273" y="110" text-anchor="middle">pair cancels</text>
  <text class="d-sub" x="445" y="110" text-anchor="middle">pair cancels</text>
  <text class="d-text d-accent" x="612" y="110" text-anchor="middle">survivor</text>
</svg>

Every "subtract 1" pairs the current element with one copy of the candidate, and the two are different values. Removing a pair of **different** values from the array never destroys a majority: the pair contains at most one copy of the majority value, so if the majority had more than half of n elements before, it still has more than half of the n − 2 that remain. When the count drops to 0, the whole prefix read so far has been split into such pairs, so the algorithm can forget it and start fresh — which is exactly what "if count is 0, take a new candidate" does. Whatever survives all the cancelling is the majority.

📌 **Interview term: Verification pass** — if a majority is **not** guaranteed, the vote still outputs a candidate (on \`[1, 2, 3]\` it outputs \`3\`). A second pass that counts the candidate and checks \`count > n / 2\` turns "candidate" into "answer or none". It keeps the algorithm O(n) time and O(1) space.

## 4. All the Approaches

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| Brute force: count each value with a full scan | O(n²) | O(1) | The starting point only |
| Hash-map counting | O(n) | O(k), k distinct values | Simple; can stop as soon as a count exceeds n/2 |
| Sort, take the middle element | O(n log n) | O(1) to O(n), depending on the sort | A majority always covers index ⌊n/2⌋ of the sorted array |
| Selection of the median (quickselect) | O(n) average | O(1) | Same "middle element" idea without a full sort; see [quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element) |
| **Boyer-Moore vote** (+ verify) | **O(n)** | **O(1)** | The expected optimal answer |

📌 **Interview term: The middle-index argument** — a value that occupies more than half the positions of a sorted array forms one contiguous run longer than n/2, and any such run must cover the middle index ⌊n/2⌋. So \`sorted(nums)[n // 2]\` is the majority if one exists (and still needs verifying if it might not).

**Generalisation.** The same cancelling idea finds all values appearing more than n/3 times with **two** candidates and two counters (at most two such values can exist), and in general more than n/k times with k − 1 candidates. Always verify the candidates in a second pass. For the related "most frequent k values" problem — where there is no majority guarantee — use counting plus a heap: [top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements).

## 5. The Code in C++

~~~cpp
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

// Return the value that appears more than n / 2 times, or -1 if none.
int majority(const vector<int>& nums) {
    int candidate = 0, count = 0;
    for (int x : nums) {                     // phase 1: Boyer-Moore voting
        if (count == 0) candidate = x;       // nobody is ahead: x becomes the candidate
        count += (x == candidate) ? 1 : -1;
    }
    // phase 2: verify (skip if a majority is guaranteed)
    long long occurrences = std::count(nums.begin(), nums.end(), candidate);
    return occurrences > (long long)nums.size() / 2 ? candidate : -1;
}

int main() {
    cout << majority({3, 2, 3}) << endl;              // 3
    cout << majority({2, 2, 1, 1, 1, 2, 2}) << endl;  // 2
    cout << majority({1}) << endl;                    // 1
    cout << majority({6, 6, 6, 7, 7}) << endl;        // 6
    cout << majority({1, 2, 3}) << endl;              // -1
    cout << majority({1, 1, 2, 2}) << endl;           // -1
    cout << majority({}) << endl;                     // -1
    return 0;
}
~~~

- **\`int candidate = 0, count = 0\`** — the initial candidate never matters: with \`count == 0\`, the first element replaces it.
- **\`std::count(nums.begin(), nums.end(), candidate)\`** — the verify pass in one standard-library call; it returns a signed \`ptrdiff_t\`.
- **\`occurrences > (long long)nums.size() / 2\`** — \`nums.size()\` is an unsigned \`size_t\`. Comparing a signed count directly with an unsigned value converts the signed side to unsigned (and \`-Wall\` warns about it). Casting both sides to \`long long\` keeps the comparison signed and obvious. For an empty vector, \`0 > 0\` is false and the function returns -1 with no special case.
- If the problem **guarantees** a majority, drop the verify pass and return \`candidate\`.

📌 **Interview term: \`std::nth_element\`** — rearranges a range so that the element at a chosen position is the one that would be there if the range were sorted, with smaller-or-equal elements before it and greater-or-equal after it. cppreference lists its complexity as linear on average ([cppreference: nth_element](https://en.cppreference.com/w/cpp/algorithm/nth_element)). For the majority problem, the middle element \`n / 2\` is enough, so \`bySorting\` in example 2 uses \`nth_element\` instead of a full \`std::sort\`: the middle-index argument in O(n) average time. Because it rearranges the range, \`bySorting\` takes its vector **by value** and keeps an unmodified copy for the verify step.

## 6. Verified: Running the Code

Both examples were saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). Example 1 — the vote plus verify on seven inputs, including no majority, exactly half and empty:

~~~text
3
2
1
6
-1
-1
-1
~~~

Example 2 — the vote step by step, the no-majority trap, and three methods side by side (the \`sort=\` column comes from \`nth_element\`):

~~~text
vote on [2, 2, 1, 1, 1, 2, 2]:
  read 2 -> candidate=2 count=1
  read 2 -> candidate=2 count=2
  read 1 -> candidate=2 count=1
  read 1 -> candidate=2 count=0
  read 1 -> candidate=1 count=1
  read 2 -> candidate=1 count=0
  read 2 -> candidate=2 count=1
  winner = 2
vote on [1, 2, 3] (no majority):
  read 1 -> candidate=1 count=1
  read 2 -> candidate=1 count=0
  read 3 -> candidate=3 count=1
  candidate = 3, but it appears once, so verify says -1
[2, 2, 1, 1, 1, 2, 2]: vote=2 count=2 sort=2
[5, 1, 5, 2, 5]: vote=5 count=5 sort=5
[1, 2, 3]: vote=-1 count=-1 sort=-1
[4, 4, 4, 4]: vote=4 count=4 sort=4
~~~

The first trace is the one in the diagram: the candidate switches to \`1\` at the fifth element and back to \`2\` at the last one. The second trace shows the trap: on \`{1, 2, 3}\` the vote ends with candidate \`3\`, though 3 appears once — only verification catches it. All three methods agree. In \`byCounting\`, \`++counts[x]\` is the one place where \`operator[]\` inserting a missing key with value 0 is exactly what you want.

## 7. Complexity

| Method | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Boyer-Moore vote | O(n) | O(1) | One pass, two \`int\`s |
| Vote + verify | O(n) | O(1) | \`std::count\` is one more O(n) pass |
| \`unordered_map\` counting | O(n) average | O(k) | One O(1)-average update per element, one node per distinct value |
| \`nth_element\` on a copy + verify | O(n) average | O(n) for the copy | Linear on average per cppreference; in place without the copy |
| \`std::sort\` + middle | O(n log n) | O(n) for a copy | Full sort when only one position is needed |
| Brute force | O(n²) | O(1) | \`std::count\` for every element |

For the meaning of these labels, see [What is Big-O notation?](/interview-question/what-is-big-o-notation)

## Edge Cases

- **Single element** (\`[1]\`) — it is the majority (1 > ⌊1/2⌋ = 0).
- **Exactly half** (\`[1, 1, 2, 2]\`) — no majority: 2 is not more than ⌊4/2⌋ = 2. The verify pass returns \`-1\`.
- **No majority at all** (\`[1, 2, 3]\`) — the vote's candidate is \`3\`; only verification catches it.
- **Empty array** — no candidate; return the agreed "none" value without reading \`nums[0]\`.
- **All equal** (\`[4, 4, 4, 4]\`) — the count just climbs; the answer is 4.
- **Majority at the very end** (\`[2, 2, 1, 1, 1, 2, 2]\`) — the candidate switches to 1 mid-way and back to 2; the vote does not need the majority to lead early.

## Common Pitfalls

- **Skipping verification when a majority is not guaranteed** — \`{1, 2, 3}\` returns 3.
- **Using \`>=\` instead of \`>\`** — makes \`{1, 1, 2, 2}\` report 1 as a majority.
- **Signed/unsigned comparison with \`nums.size()\`** — \`count > nums.size() / 2\` converts a signed \`count\` to unsigned; a negative value would become huge. Cast deliberately.
- **\`nth_element\` or \`sort\` on the caller's vector** — both rearrange it. Pass by value or copy first.
- **\`int candidate = nums[0]\`** — undefined behaviour on an empty vector (unchecked \`[]\`); start from \`count = 0\` instead.
- **Returning \`-1\` as "none" when \`-1\` can be a real value** — use \`std::optional<int>\` (C++17) instead.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">I use the Boyer-Moore vote — an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> candidate and count; when the count is 0 the current element becomes the candidate; +1 on a match, −1 otherwise.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Each −1 cancels the element against one copy of the candidate; removing pairs of different values never destroys a majority, because it outnumbers everything else combined.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space; an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> count is O(n) space, and a full <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> is O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The verify pass:</strong> <span style="color:#f0e2c8;">If a majority is not guaranteed, I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::count(...) &gt; n / 2</code>, because the vote always returns something — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1, 2, 3}</code> gives 3.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ detail:</strong> <span style="color:#f0e2c8;">I keep the comparison with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums.size() / 2</code> signed on purpose, and if I want the middle-element approach I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::nth_element</code> on a copy instead of a full sort.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is there at most one majority element?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two different values each appearing more than n/2 times would need more than n positions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the vote return with no majority?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Some candidate anyway — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1, 2, 3}</code> in the run above — so I verify unless a majority is guaranteed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find all elements appearing more than n/3 times?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two candidates and two counters: increment the matching one, fill an empty slot when a counter is 0, otherwise decrement both; then verify both with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::count</code> and return a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;</code>. O(n) time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nth_element</code> rather than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sort</code> for the middle-element approach?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only one position matters. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nth_element</code> places the correct element at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n / 2</code> in linear time on average, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort</code> orders everything in O(n log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you signal "no majority" without a sentinel?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::optional&lt;int&gt;</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::nullopt</code> when the verify fails, the candidate otherwise. The caller then cannot mistake <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code> for a real value.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Majority element** | A value appearing more than ⌊n/2⌋ times; at most one exists |
| **Boyer-Moore majority vote** | One candidate plus a counter; +1 for a match, −1 otherwise, new candidate at 0 |
| **Verification pass** | A second scan that checks the candidate really exceeds n/2 |
| **The middle-index argument** | A majority always occupies the middle position of the sorted array |
| **\`std::nth_element\`** | Puts the element that belongs at position k there, linear on average |

---
**Conclusion:** The majority element appears more than ⌊n/2⌋ times, so at most one exists. An \`unordered_map\` count is O(n) time and O(n) space, \`std::nth_element\` finds the middle element in O(n) average time on a copy, and the Boyer-Moore vote — one candidate, one counter — is O(n) time and O(1) space, correct because cancelling pairs of different values never eliminates a majority. If a majority is not guaranteed, verify with \`std::count\`. In C++, watch signed/unsigned comparisons with \`size()\`, remember that \`nth_element\` and \`sort\` rearrange their input, and prefer \`std::optional<int>\` over a sentinel. The same counting toolkit appears in [top K frequent elements](/interview-question/how-do-you-find-the-top-k-frequent-elements) and [finding a duplicate](/interview-question/how-do-you-find-a-duplicate-in-an-array).`,
        examples: [
          {
            label: "Boyer-Moore voting with a verify pass on seven inputs",
            code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

// Return the value that appears more than n / 2 times, or -1 if none.
int majority(const vector<int>& nums) {
    int candidate = 0, count = 0;
    for (int x : nums) {                     // phase 1: Boyer-Moore voting
        if (count == 0) candidate = x;       // nobody is ahead: x becomes the candidate
        count += (x == candidate) ? 1 : -1;
    }
    // phase 2: verify (skip if a majority is guaranteed)
    long long occurrences = std::count(nums.begin(), nums.end(), candidate);
    return occurrences > (long long)nums.size() / 2 ? candidate : -1;
}

int main() {
    cout << majority({3, 2, 3}) << endl;              // 3
    cout << majority({2, 2, 1, 1, 1, 2, 2}) << endl;  // 2
    cout << majority({1}) << endl;                    // 1
    cout << majority({6, 6, 6, 7, 7}) << endl;        // 6
    cout << majority({1, 2, 3}) << endl;              // -1
    cout << majority({1, 1, 2, 2}) << endl;           // -1
    cout << majority({}) << endl;                     // -1
    return 0;
}`,
          },
          {
            label: "Trace of the vote, the no-majority trap, and vote vs count vs sort",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

// Watch the vote, see why the verify pass matters, and compare three methods.

int trace(const vector<int>& nums) {
    int candidate = 0, count = 0;
    for (int x : nums) {
        if (count == 0) candidate = x;
        count += (x == candidate) ? 1 : -1;
        cout << "  read " << x << " -> candidate=" << candidate << " count=" << count << endl;
    }
    return candidate;
}

bool isMajority(const vector<int>& nums, int v) {
    return (long long)std::count(nums.begin(), nums.end(), v) > (long long)nums.size() / 2;
}

int byVote(const vector<int>& nums) {         // O(n) time, O(1) space, includes the verify pass
    int candidate = 0, count = 0;
    for (int x : nums) {
        if (count == 0) candidate = x;
        count += (x == candidate) ? 1 : -1;
    }
    return isMajority(nums, candidate) ? candidate : -1;
}

int byCounting(const vector<int>& nums) {     // O(n) time, O(k) space
    unordered_map<int, int> counts;
    for (int x : nums) {
        if (++counts[x] > (int)nums.size() / 2) return x;   // operator[] starts a new key at 0
    }
    return -1;
}

int bySorting(vector<int> s) {                // by value: a copy we may rearrange
    if (s.empty()) return -1;
    vector<int> original = s;
    nth_element(s.begin(), s.begin() + s.size() / 2, s.end());   // O(n) average, no full sort
    int mid = s[s.size() / 2];
    return isMajority(original, mid) ? mid : -1;
}

string fmt(const vector<int>& a) {
    string s = "[";
    for (size_t i = 0; i < a.size(); i++) s += (i ? ", " : "") + to_string(a[i]);
    return s + "]";
}

int main() {
    cout << "vote on [2, 2, 1, 1, 1, 2, 2]:" << endl;
    int w = trace({2, 2, 1, 1, 1, 2, 2});
    cout << "  winner = " << w << endl;
    cout << "vote on [1, 2, 3] (no majority):" << endl;
    int c = trace({1, 2, 3});
    cout << "  candidate = " << c << ", but it appears once, so verify says -1" << endl;
    vector<vector<int>> tests = {{2, 2, 1, 1, 1, 2, 2}, {5, 1, 5, 2, 5}, {1, 2, 3}, {4, 4, 4, 4}};
    for (const auto& nums : tests) {
        cout << fmt(nums) << ": vote=" << byVote(nums) << " count=" << byCounting(nums)
             << " sort=" << bySorting(nums) << endl;
    }
    return 0;
}`,
          },
        ],
      },
    },
  },

];

export default augments;
