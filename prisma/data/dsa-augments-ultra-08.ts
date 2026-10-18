/**
 * DSA ULTRA — batch 08: two pointers and sliding window (3Sum, container with most
 * water, longest substring without repeats, minimum window substring, need/have counters).
 * One complete answer per language (Python, JavaScript, Java, C++). Every example was run
 * with python3 / node / javac+java / g++ -std=c++17 by scripts/verify-dsa-examples.ts and the
 * quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How do you solve the 3Sum problem?`,
    difficulty: "medium",
    seoDescription: `Solve 3Sum by sorting and using two pointers per anchor: O(n²) time, duplicates skipped, with verified Python, JavaScript, Java and C++ code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given an array of integers, find all unique triplets that sum to zero. Each triplet should appear only once in the output, even if the array has duplicates. Please write it in Python and tell me the time and space complexity."

**What a strong answer should cover:**
- Brute force is three nested loops, O(n³); the expected solution sorts first and then, for each anchor, runs a two-pointer scan: O(n²) time.
- Why moving a pointer is safe on a sorted array: a too-small sum means the left value can never work with this anchor, a too-big sum means the right value cannot.
- Duplicate handling by skipping equal neighbours (anchor and middle), instead of a set of results.
- Early exit when the anchor is positive, and edge cases: fewer than three elements, all zeros.
- Python specifics: \`sorted()\` returns a new list (the caller's list stays untouched) while \`list.sort()\` sorts in place; lists are unhashable, so a set-based dedupe needs tuples; Python integers never overflow.

**Clarifying questions expected:**
- "Do you want values or indices?" — sorting loses the original indices.
- "Must each distinct triplet appear once, and may I sort the input in place?"

**Code / implementation expected:** Yes — a \`three_sum(nums)\` function in Python that sorts once and runs a two-pointer scan per anchor.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array and a loop are; nothing else is assumed.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`python3\`.

## 1. Why This Even Matters — A Story First

Imagine a shop that sells weights, some positive (they push the scale down) and some negative (balloons that pull it up). A customer wants every different set of **exactly three items** that leaves the scale perfectly at zero. You could try every possible trio — with 1,000 items that is about 166 million trios. Or you could line the items up from lightest to heaviest, hold one item in your hand, and walk two fingers in from both ends of the shelf: if the scale tips down, move the right finger to something lighter; if it tips up, move the left finger to something heavier. Each finger only ever moves one way, so for each item in your hand you scan the shelf once.

That is 3Sum: **sort, fix one number, then solve a two-number problem with two pointers**. It is asked constantly because it tests three things at once: whether you can reduce a problem to one you already know ([Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently)), whether you know the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique), and whether you can handle duplicates without a messy set of results.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want the values or the indices of the triplets? | Sorting destroys original indices. If indices are needed, store (value, index) pairs or use a hash-based approach. |
| Must the output contain each distinct triplet only once? | The classic version says yes: [-1, 0, 1] once, even if the array has several -1s. This drives the duplicate-skipping logic. |
| Is the target always 0, or any number k? | The same algorithm works for any target; you compare against k instead of 0. |
| How large is n, and how large are the values? | n up to a few thousand makes O(n²) fine. Large values can overflow fixed-width integers when three are added. |
| May I reorder (sort) the input array? | Sorting in place mutates the caller's data; copying costs O(n) extra memory. |
| Does the order of triplets in the output matter? | Usually not. Sorting gives you a natural ascending order for free. |

## 3. The Core Idea in Plain Language

**The problem:** given an array of integers, return every distinct triplet [a, b, c] of values at three different positions with a + b + c = 0.

📌 **Interview term: Triplet** — a group of three elements taken from three different positions in the array.

📌 **Interview term: Brute force** — trying every possible combination. Here that is three nested loops over i < j < k, which is O(n³) — see [Big-O notation](/interview-question/what-is-big-o-notation) if that notation is new.

The trick is to notice that once you **fix the first number** a[i], you only need two more numbers that add to −a[i]. That is a Two Sum on the rest of the array. And on a **sorted** array, Two Sum does not need a hash map: put one pointer at the left end and one at the right end.

📌 **Interview term: Two pointers (converging)** — two indices that start at opposite ends of a sorted array and move toward each other, each step discarding a value that can no longer be part of an answer.

📌 **Interview term: Anchor** — the fixed element a[i] of the outer loop; the inner two-pointer scan searches for its two partners.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="Sorted array with anchor i at index 1, L at index 2 and R at index 5">
  <defs>
    <marker id="b08q1a-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="28" text-anchor="middle">Sorted: fix anchor i, move L and R inward</text>
  <rect class="d-box-muted" x="54" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="90" y="92" text-anchor="middle">-4</text>
  <rect class="d-box-accent" x="146" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="182" y="92" text-anchor="middle">-1</text>
  <rect class="d-box" x="238" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="274" y="92" text-anchor="middle">-1</text>
  <rect class="d-box-muted" x="330" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="366" y="92" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="422" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="458" y="92" text-anchor="middle">1</text>
  <rect class="d-box" x="514" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="550" y="92" text-anchor="middle">2</text>
  <path class="d-edge-accent" d="M 182 172 L 182 124" marker-end="url(#b08q1a-python)"/>
  <text class="d-text d-accent" x="182" y="200" text-anchor="middle">i</text>
  <path class="d-edge-accent" d="M 274 172 L 274 124" marker-end="url(#b08q1a-python)"/>
  <text class="d-text d-accent" x="274" y="200" text-anchor="middle">L</text>
  <path class="d-edge-accent" d="M 550 172 L 550 124" marker-end="url(#b08q1a-python)"/>
  <text class="d-text d-accent" x="550" y="200" text-anchor="middle">R</text>
</svg>

In the picture the anchor is a[1] = −1, L points at −1 and R at 2. The sum is −1 + (−1) + 2 = 0, so [-1, -1, 2] is recorded.

### Why moving a pointer is safe

The array is sorted, so a[L] is the smallest candidate and a[R] is the largest:

- If the sum is **too small**, pairing a[L] with anything at or left of R gives a sum at most this one, so a[L] can never work. Discard it: L moves right.
- If the sum is **too big**, a[R] paired with anything at or right of L is at least this big, so a[R] can never work. Discard it: R moves left.
- If it is **exactly zero**, record it and move both.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 270" role="img" aria-label="Decision rule: compare the sum with zero and move one pointer">
  <defs>
    <marker id="b08q1b-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="200" y="20" width="300" height="60" rx="10"/>
  <text class="d-text" x="350" y="47" text-anchor="middle">sum = a[i] + a[L] + a[R]</text>
  <text class="d-sub" x="350" y="68" text-anchor="middle">compare with 0</text>
  <path class="d-edge" d="M 300 80 L 130 150" marker-end="url(#b08q1b-python)"/>
  <path class="d-edge" d="M 350 80 L 350 150" marker-end="url(#b08q1b-python)"/>
  <path class="d-edge" d="M 400 80 L 570 150" marker-end="url(#b08q1b-python)"/>
  <rect class="d-box" x="30" y="154" width="190" height="96" rx="10"/>
  <text class="d-text" x="125" y="184" text-anchor="middle">sum below 0</text>
  <text class="d-sub" x="125" y="208" text-anchor="middle">L moves right</text>
  <text class="d-sub" x="125" y="230" text-anchor="middle">to a bigger value</text>
  <rect class="d-box" x="255" y="154" width="190" height="96" rx="10"/>
  <text class="d-text" x="350" y="184" text-anchor="middle">sum equals 0</text>
  <text class="d-sub" x="350" y="208" text-anchor="middle">record, move both</text>
  <text class="d-sub" x="350" y="230" text-anchor="middle">skip equal values</text>
  <rect class="d-box" x="480" y="154" width="190" height="96" rx="10"/>
  <text class="d-text" x="575" y="184" text-anchor="middle">sum above 0</text>
  <text class="d-sub" x="575" y="208" text-anchor="middle">R moves left</text>
  <text class="d-sub" x="575" y="230" text-anchor="middle">to a smaller value</text>
</svg>

Every step discards one value for this anchor, so the inner scan is at most n steps, and the whole algorithm is O(n²).

### Handling duplicates without a set

📌 **Interview term: Deduplication** — making sure each distinct triplet appears once. Because the array is sorted, equal values sit next to each other, so you skip them:

1. **Anchor skip:** if a[i] equals a[i−1], every triplet it could form was already found by the previous anchor. Skip it.
2. **Middle skip:** after recording a triplet, move L past every copy of the value just used. (R then lands on a new value naturally, because a matching R must pair with a new L.)

📌 **Interview term: Early termination** — if the anchor a[i] is already positive, the two values to its right are positive too, so no zero sum is possible. Stop the outer loop.

## 4. From Brute Force to the Optimal Solution

| Approach | Time | Space | Verdict |
| :--- | :--- | :--- | :--- |
| Three nested loops + set of sorted triplets | O(n³) | O(m) for m results | Correct but too slow beyond a few hundred elements |
| Fix one, hash-set Two Sum on the rest | O(n²) | O(n) | Fast, but dedupe needs a set of sorted triplets |
| **Sort + fix one + two pointers** | **O(n²)** | **O(1) extra besides the sort** | The expected answer: no hashing, natural dedupe |

### The Python code

~~~python
def three_sum(nums):
    nums = sorted(nums)          # sorted() returns a new list; the caller's list is untouched
    n = len(nums)
    result = []
    for i in range(n - 2):
        if nums[i] > 0:          # smallest of the three is positive: no zero sum is possible
            break
        if i > 0 and nums[i] == nums[i - 1]:
            continue             # same anchor value as last time: skip duplicate triplets
        left, right = i + 1, n - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total < 0:
                left += 1
            elif total > 0:
                right -= 1
            else:
                result.append([nums[i], nums[left], nums[right]])
                left += 1
                right -= 1
                while left < right and nums[left] == nums[left - 1]:
                    left += 1    # skip repeated middle values
    return result
~~~

Things worth saying out loud while you write it:

- \`sorted(nums)\` returns a **new** list, so the caller's list is not reordered. \`nums.sort()\` would sort in place and save O(n) memory, but it mutates the argument — ask first.
- \`for i in range(n - 2)\` simply does not run when n < 3, so the empty and short inputs need no special case.
- Python integers have arbitrary precision, so \`nums[i] + nums[left] + nums[right]\` can never overflow, unlike Java or C++.
- The result is a list of lists. If you wanted to dedupe with a set instead of skipping, you would have to store **tuples**: in the lab \`{[1, 2]}\` raised \`TypeError: unhashable type: 'list'\`.

## 5. Verified: Running the Code

Both programs below are the runnable examples on this page; each was run with \`python3 main.py\`.

**Example 1 — the solution on six inputs** (the classic one, all zeros, no answer, empty, two answers, many duplicates):

~~~text
[[-1, -1, 2], [-1, 0, 1]]
[[0, 0, 0]]
[]
[]
[[-2, 0, 2], [-2, 1, 1]]
[[-4, -2, 6], [-4, 0, 4], [-4, 1, 3], [-4, 2, 2], [-2, -2, 4], [-2, 0, 2]]
~~~

**Example 2 — brute force vs two pointers on the same generated input** (values in [-50, 50]), counting the work:

~~~text
n=50 triplets=81 same=true brute_checks=19600 two_pointer_steps=618
n=100 triplets=332 same=true brute_checks=161700 two_pointer_steps=1761
n=200 triplets=876 same=true brute_checks=1313400 two_pointer_steps=4494
~~~

Both methods find exactly the same triplets (\`same=true\`). The brute force always does C(n, 3) checks — 1,313,400 for n = 200 — while the two-pointer version did 4,494 inner steps. That is far below the n²/2 worst case because the input has only 101 distinct values, so most anchors are skipped as duplicates and the early exit fires once anchors turn positive. In the worst case (all values distinct, no early exit) each anchor scans its whole remaining range, which adds up to about n²/2 steps — still quadratic, never cubic.

## 6. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n²) | n anchors × at most n pointer moves each; Python's \`sorted\` is O(n log n); the nested scan is O(n²) and dominates. |
| Space | O(n) or O(1) | O(n) for the sorted copy (O(1) extra if you sort in place), not counting the output. |
| Output | O(m) | m distinct triplets; m can itself be about n² in the worst case |

## Edge Cases to Mention

- **Fewer than three elements** ([] or [0, 1]): no triplet, return an empty list. The loop bound n − 2 handles this.
- **All zeros** ([0, 0, 0, 0]): exactly one triplet, [0, 0, 0]. This is the test that catches missing duplicate skips.
- **No answer** ([0, 1, 1]): empty list.
- **Many duplicates** (the 15-element input in the example): six distinct triplets, no repeats.
- **All positive or all negative:** the early-termination check exits almost immediately for all-positive input.

## Common Pitfalls

- **Deduping with a set of lists.** Lists are unhashable; use tuples (\`tuple(sorted(t))\`) if you go the set route — and the set route still needs O(n²) work plus extra memory.
- **Sorting the caller's list by accident.** \`nums.sort()\` changes the argument; \`sorted(nums)\` does not. Interviewers notice side effects.
- **Skipping duplicates of the anchor with \`nums[i] == nums[i + 1]\`.** That skips the *first* copy and loses triplets such as [-1, -1, 2]. Compare with the previous element: \`nums[i] == nums[i - 1]\`.
- **Forgetting the middle skip.** Without \`while left < right and nums[left] == nums[left - 1]\`, [0, 0, 0, 0] returns [0, 0, 0] twice.
- **Reaching for \`itertools.combinations(nums, 3)\`.** It is neat but it is the O(n³) brute force; use it only as a test oracle.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Sort with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted()</code>, fix each element as an anchor, then find its two partners with two pointers moving inward: O(n²) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why the pointers work:</strong> <span style="color:#f0e2c8;">On a sorted list, a sum that is too small means the left value is useless for this anchor, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left += 1</code>; too big means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right -= 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Duplicates:</strong> <span style="color:#f0e2c8;">Skip an anchor equal to the previous one, and after a hit move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> past equal values. No set needed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted()</code> copies, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.sort()</code> mutates; integers never overflow; a set dedupe needs tuples because lists are unhashable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Comparing the anchor with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i + 1]</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i - 1]</code> drops valid triplets like [-1, -1, 2].</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do better than O(n²)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only by tiny factors: Grønlund and Pettie (2014, arXiv:1404.0799) gave algorithms slightly below n², but nobody knows an O(n^1.99) algorithm. In an interview, O(n²) is the expected optimum.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you solve it without sorting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, run a hash-set Two Sum over the elements after it. Still O(n²), but you must dedupe with a set of sorted tuples, which uses more memory.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for 3Sum Closest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same loop, but track the sum with the smallest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abs(total - target)</code> and move pointers by comparing with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code>; no duplicate skipping needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this extend to 4Sum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add one more outer loop: fix two anchors, two-pointer the rest. O(n³). In general k-Sum is O(n^(k-1)).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">itertools.combinations</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It enumerates all C(n, 3) trios: 1,313,400 for n = 200 in the verified run, versus 4,494 two-pointer steps.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Triplet** | Three elements from three different positions |
| **Brute force** | Trying every combination; O(n³) here |
| **Two pointers (converging)** | Indices from both ends of a sorted array moving inward |
| **Anchor** | The fixed first element of each triplet |
| **Deduplication** | Making each distinct triplet appear exactly once |
| **Early termination** | Stopping as soon as no answer is possible (anchor above 0) |

---
**Conclusion:** In Python, 3Sum is \`sorted()\` plus a two-pointer scan per anchor: O(n²) time, O(n) for the sorted copy, with duplicates handled by two simple equality skips instead of a set of tuples. The idea to carry to other problems is the reduction: fix one element and the rest becomes a problem you already know — here [Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently) on a sorted range, the same converging-pointer move used in [container with most water](/interview-question/how-do-you-solve-the-container-with-most-water-problem).`,
        examples: [
          {
            label: `3Sum with sort + two pointers on six inputs`,
            code: `def three_sum(nums):
    nums = sorted(nums)          # sorted() returns a new list; the caller's list is untouched
    n = len(nums)
    result = []
    for i in range(n - 2):
        if nums[i] > 0:          # smallest of the three is positive: no zero sum is possible
            break
        if i > 0 and nums[i] == nums[i - 1]:
            continue             # same anchor value as last time: skip duplicate triplets
        left, right = i + 1, n - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total < 0:
                left += 1
            elif total > 0:
                right -= 1
            else:
                result.append([nums[i], nums[left], nums[right]])
                left += 1
                right -= 1
                while left < right and nums[left] == nums[left - 1]:
                    left += 1    # skip repeated middle values
    return result


def fmt(triplets):
    return "[" + ", ".join("[" + ", ".join(str(x) for x in t) + "]" for t in triplets) + "]"


print(fmt(three_sum([-1, 0, 1, 2, -1, -4])))  # [[-1, -1, 2], [-1, 0, 1]]
print(fmt(three_sum([0, 0, 0, 0])))  # [[0, 0, 0]]
print(fmt(three_sum([0, 1, 1])))  # []
print(fmt(three_sum([])))  # []
print(fmt(three_sum([-2, 0, 1, 1, 2])))  # [[-2, 0, 2], [-2, 1, 1]]
print(fmt(three_sum([-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6])))  # [[-4, -2, 6], [-4, 0, 4], [-4, 1, 3], [-4, 2, 2], [-2, -2, 4], [-2, 0, 2]]`,
          },
          {
            label: `Brute force vs two pointers: same triplets, far less work`,
            code: `# Brute force O(n^3) vs sort + two pointers O(n^2), counting the work each does.
def make_input(n, seed):
    # A tiny deterministic generator (MINSTD), so every language gets the same numbers
    nums = []
    for _ in range(n):
        seed = seed * 48271 % 2147483647
        nums.append(seed % 101 - 50)  # values in [-50, 50]
    return nums


def brute_force(nums):
    n = len(nums)
    found = set()
    checks = 0
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n):
                checks += 1
                if nums[i] + nums[j] + nums[k] == 0:
                    found.add(tuple(sorted((nums[i], nums[j], nums[k]))))
    return sorted(found), checks


def two_pointers(nums):
    nums = sorted(nums)
    n = len(nums)
    result = []
    steps = 0
    for i in range(n - 2):
        if nums[i] > 0:
            break
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        left, right = i + 1, n - 1
        while left < right:
            steps += 1
            total = nums[i] + nums[left] + nums[right]
            if total < 0:
                left += 1
            elif total > 0:
                right -= 1
            else:
                result.append((nums[i], nums[left], nums[right]))
                left += 1
                right -= 1
                while left < right and nums[left] == nums[left - 1]:
                    left += 1
    return result, steps


for n in [50, 100, 200]:
    nums = make_input(n, 42)
    a, checks = brute_force(nums)
    b, steps = two_pointers(nums)
    same = "true" if a == b else "false"
    print("n=" + str(n) + " triplets=" + str(len(b)) + " same=" + same
          + " brute_checks=" + str(checks) + " two_pointer_steps=" + str(steps))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an array of integers, find all unique triplets that sum to zero. Each triplet should appear only once in the output, even if the array has duplicates. Please write it in JavaScript and tell me the time and space complexity."

**What a strong answer should cover:**
- Brute force is three nested loops, O(n³); the expected solution sorts first and then, for each anchor, runs a two-pointer scan: O(n²) time.
- Why moving a pointer is safe on a sorted array: a too-small sum means the left value can never work with this anchor, a too-big sum means the right value cannot.
- Duplicate handling by skipping equal neighbours (anchor and middle), instead of a set of results.
- Early exit when the anchor is positive, and edge cases: fewer than three elements, all zeros.
- JavaScript specifics: \`Array.prototype.sort()\` without a comparator sorts numbers as strings, so \`(a, b) => a - b\` is required; a \`Set\` of arrays compares by reference, so it cannot dedupe triplets; numbers are doubles, exact up to 2^53.

**Clarifying questions expected:**
- "Do you want values or indices?" — sorting loses the original indices.
- "Must each distinct triplet appear once, and may I sort the input in place?"

**Code / implementation expected:** Yes — a \`threeSum(nums)\` function in JavaScript with a numeric sort and a two-pointer inner loop.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array and a loop are; nothing else is assumed.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`node\` (the examples are plain browser-safe scripts).

## 1. Why This Even Matters — A Story First

Imagine a shop that sells weights, some positive (they push the scale down) and some negative (balloons that pull it up). A customer wants every different set of **exactly three items** that leaves the scale perfectly at zero. You could try every possible trio — with 1,000 items that is about 166 million trios. Or you could line the items up from lightest to heaviest, hold one item in your hand, and walk two fingers in from both ends of the shelf: if the scale tips down, move the right finger to something lighter; if it tips up, move the left finger to something heavier. Each finger only ever moves one way, so for each item in your hand you scan the shelf once.

That is 3Sum: **sort, fix one number, then solve a two-number problem with two pointers**. It is asked constantly because it tests three things at once: whether you can reduce a problem to one you already know ([Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently)), whether you know the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique), and whether you can handle duplicates without a messy set of results.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want the values or the indices of the triplets? | Sorting destroys original indices. If indices are needed, store (value, index) pairs or use a hash-based approach. |
| Must the output contain each distinct triplet only once? | The classic version says yes: [-1, 0, 1] once, even if the array has several -1s. This drives the duplicate-skipping logic. |
| Is the target always 0, or any number k? | The same algorithm works for any target; you compare against k instead of 0. |
| How large is n, and how large are the values? | n up to a few thousand makes O(n²) fine. Large values can overflow fixed-width integers when three are added. |
| May I reorder (sort) the input array? | Sorting in place mutates the caller's data; copying costs O(n) extra memory. |
| Does the order of triplets in the output matter? | Usually not. Sorting gives you a natural ascending order for free. |

## 3. The Core Idea in Plain Language

**The problem:** given an array of integers, return every distinct triplet [a, b, c] of values at three different positions with a + b + c = 0.

📌 **Interview term: Triplet** — a group of three elements taken from three different positions in the array.

📌 **Interview term: Brute force** — trying every possible combination. Here that is three nested loops over i < j < k, which is O(n³) — see [Big-O notation](/interview-question/what-is-big-o-notation) if that notation is new.

The trick is to notice that once you **fix the first number** a[i], you only need two more numbers that add to −a[i]. That is a Two Sum on the rest of the array. And on a **sorted** array, Two Sum does not need a hash map: put one pointer at the left end and one at the right end.

📌 **Interview term: Two pointers (converging)** — two indices that start at opposite ends of a sorted array and move toward each other, each step discarding a value that can no longer be part of an answer.

📌 **Interview term: Anchor** — the fixed element a[i] of the outer loop; the inner two-pointer scan searches for its two partners.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="Sorted array with anchor i at index 1, L at index 2 and R at index 5">
  <defs>
    <marker id="b08q1a-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="28" text-anchor="middle">Sorted: fix anchor i, move L and R inward</text>
  <rect class="d-box-muted" x="54" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="90" y="92" text-anchor="middle">-4</text>
  <rect class="d-box-accent" x="146" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="182" y="92" text-anchor="middle">-1</text>
  <rect class="d-box" x="238" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="274" y="92" text-anchor="middle">-1</text>
  <rect class="d-box-muted" x="330" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="366" y="92" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="422" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="458" y="92" text-anchor="middle">1</text>
  <rect class="d-box" x="514" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="550" y="92" text-anchor="middle">2</text>
  <path class="d-edge-accent" d="M 182 172 L 182 124" marker-end="url(#b08q1a-javascript)"/>
  <text class="d-text d-accent" x="182" y="200" text-anchor="middle">i</text>
  <path class="d-edge-accent" d="M 274 172 L 274 124" marker-end="url(#b08q1a-javascript)"/>
  <text class="d-text d-accent" x="274" y="200" text-anchor="middle">L</text>
  <path class="d-edge-accent" d="M 550 172 L 550 124" marker-end="url(#b08q1a-javascript)"/>
  <text class="d-text d-accent" x="550" y="200" text-anchor="middle">R</text>
</svg>

In the picture the anchor is a[1] = −1, L points at −1 and R at 2. The sum is −1 + (−1) + 2 = 0, so [-1, -1, 2] is recorded.

### Why moving a pointer is safe

The array is sorted, so a[L] is the smallest candidate and a[R] is the largest:

- If the sum is **too small**, pairing a[L] with anything at or left of R gives a sum at most this one, so a[L] can never work. Discard it: L moves right.
- If the sum is **too big**, a[R] paired with anything at or right of L is at least this big, so a[R] can never work. Discard it: R moves left.
- If it is **exactly zero**, record it and move both.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 270" role="img" aria-label="Decision rule: compare the sum with zero and move one pointer">
  <defs>
    <marker id="b08q1b-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="200" y="20" width="300" height="60" rx="10"/>
  <text class="d-text" x="350" y="47" text-anchor="middle">sum = a[i] + a[L] + a[R]</text>
  <text class="d-sub" x="350" y="68" text-anchor="middle">compare with 0</text>
  <path class="d-edge" d="M 300 80 L 130 150" marker-end="url(#b08q1b-javascript)"/>
  <path class="d-edge" d="M 350 80 L 350 150" marker-end="url(#b08q1b-javascript)"/>
  <path class="d-edge" d="M 400 80 L 570 150" marker-end="url(#b08q1b-javascript)"/>
  <rect class="d-box" x="30" y="154" width="190" height="96" rx="10"/>
  <text class="d-text" x="125" y="184" text-anchor="middle">sum below 0</text>
  <text class="d-sub" x="125" y="208" text-anchor="middle">L moves right</text>
  <text class="d-sub" x="125" y="230" text-anchor="middle">to a bigger value</text>
  <rect class="d-box" x="255" y="154" width="190" height="96" rx="10"/>
  <text class="d-text" x="350" y="184" text-anchor="middle">sum equals 0</text>
  <text class="d-sub" x="350" y="208" text-anchor="middle">record, move both</text>
  <text class="d-sub" x="350" y="230" text-anchor="middle">skip equal values</text>
  <rect class="d-box" x="480" y="154" width="190" height="96" rx="10"/>
  <text class="d-text" x="575" y="184" text-anchor="middle">sum above 0</text>
  <text class="d-sub" x="575" y="208" text-anchor="middle">R moves left</text>
  <text class="d-sub" x="575" y="230" text-anchor="middle">to a smaller value</text>
</svg>

Every step discards one value for this anchor, so the inner scan is at most n steps, and the whole algorithm is O(n²).

### Handling duplicates without a set

📌 **Interview term: Deduplication** — making sure each distinct triplet appears once. Because the array is sorted, equal values sit next to each other, so you skip them:

1. **Anchor skip:** if a[i] equals a[i−1], every triplet it could form was already found by the previous anchor. Skip it.
2. **Middle skip:** after recording a triplet, move L past every copy of the value just used. (R then lands on a new value naturally, because a matching R must pair with a new L.)

📌 **Interview term: Early termination** — if the anchor a[i] is already positive, the two values to its right are positive too, so no zero sum is possible. Stop the outer loop.

## 4. From Brute Force to the Optimal Solution

| Approach | Time | Space | Verdict |
| :--- | :--- | :--- | :--- |
| Three nested loops + set of sorted triplets | O(n³) | O(m) for m results | Correct but too slow beyond a few hundred elements |
| Fix one, hash-set Two Sum on the rest | O(n²) | O(n) | Fast, but dedupe needs a set of sorted triplets |
| **Sort + fix one + two pointers** | **O(n²)** | **O(1) extra besides the sort** | The expected answer: no hashing, natural dedupe |

### The JavaScript code

~~~javascript
function threeSum(nums) {
  // Copy, then sort NUMERICALLY: the default sort compares values as strings
  const a = [...nums].sort((x, y) => x - y);
  const n = a.length;
  const result = [];
  for (let i = 0; i < n - 2; i++) {
    if (a[i] > 0) break;                      // smallest value positive: no zero sum left
    if (i > 0 && a[i] === a[i - 1]) continue; // duplicate anchor
    let left = i + 1, right = n - 1;
    while (left < right) {
      const total = a[i] + a[left] + a[right];
      if (total < 0) {
        left++;
      } else if (total > 0) {
        right--;
      } else {
        result.push([a[i], a[left], a[right]]);
        left++;
        right--;
        while (left < right && a[left] === a[left - 1]) left++; // skip repeated middles
      }
    }
  }
  return result;
}
~~~

Things worth saying out loud while you write it:

- **The comparator is mandatory.** Without it, \`sort()\` converts numbers to strings. In the lab \`[10, 9, 1, -5, 2].sort()\` printed \`[ -5, 1, 10, 2, 9 ]\`, which would silently break the two-pointer logic.
- \`[...nums]\` copies the array first, because \`sort()\` sorts **in place** and returns the same array.
- Use \`===\` for the duplicate checks; values are numbers so \`==\` would also work, but strict equality is the habit interviewers expect.
- JavaScript numbers are 64-bit floats, exact for integers up to \`Number.MAX_SAFE_INTEGER\` (9007199254740991 in the lab). Even three values near 10⁹ sum to only 3×10⁹, far below that, so there is no overflow concern here.

## 5. Verified: Running the Code

Both programs below are the runnable examples on this page; each was run with \`node main.js\`.

**Example 1 — the solution on six inputs** (the classic one, all zeros, no answer, empty, two answers, many duplicates):

~~~text
[[-1, -1, 2], [-1, 0, 1]]
[[0, 0, 0]]
[]
[]
[[-2, 0, 2], [-2, 1, 1]]
[[-4, -2, 6], [-4, 0, 4], [-4, 1, 3], [-4, 2, 2], [-2, -2, 4], [-2, 0, 2]]
~~~

**Example 2 — brute force vs two pointers on the same generated input** (values in [-50, 50]), counting the work:

~~~text
n=50 triplets=81 same=true brute_checks=19600 two_pointer_steps=618
n=100 triplets=332 same=true brute_checks=161700 two_pointer_steps=1761
n=200 triplets=876 same=true brute_checks=1313400 two_pointer_steps=4494
~~~

Both methods find exactly the same triplets (\`same=true\`). The brute force always does C(n, 3) checks — 1,313,400 for n = 200 — while the two-pointer version did 4,494 inner steps. That is far below the n²/2 worst case because the input has only 101 distinct values, so most anchors are skipped as duplicates and the early exit fires once anchors turn positive. In the worst case (all values distinct, no early exit) each anchor scans its whole remaining range, which adds up to about n²/2 steps — still quadratic, never cubic.

## 6. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n²) | n anchors × at most n pointer moves each; The sort is O(n log n); the nested scan is O(n²) and dominates. |
| Space | O(n) or O(1) | O(n) for the sorted copy, not counting the output. |
| Output | O(m) | m distinct triplets; m can itself be about n² in the worst case |

## Edge Cases to Mention

- **Fewer than three elements** ([] or [0, 1]): no triplet, return an empty list. The loop bound n − 2 handles this.
- **All zeros** ([0, 0, 0, 0]): exactly one triplet, [0, 0, 0]. This is the test that catches missing duplicate skips.
- **No answer** ([0, 1, 1]): empty list.
- **Many duplicates** (the 15-element input in the example): six distinct triplets, no repeats.
- **All positive or all negative:** the early-termination check exits almost immediately for all-positive input.

## Common Pitfalls

- **Calling \`sort()\` without a comparator.** It sorts as strings: \`[10, 9, 1, -5, 2]\` became \`[ -5, 1, 10, 2, 9 ]\` in the lab. Always pass \`(a, b) => a - b\`.
- **Deduping with \`new Set()\` of arrays.** Arrays compare by reference: \`new Set([[1,2],[1,2]]).size\` is 2. Use a string key such as \`a + ',' + b + ',' + c\` if you need a set at all.
- **Mutating the input.** \`nums.sort(...)\` reorders the caller's array; copy with \`[...nums]\` or \`nums.slice()\` first.
- **Comparing the anchor with the next element instead of the previous one.** \`a[i] === a[i + 1]\` skips the first copy and loses triplets such as [-1, -1, 2].
- **Printing arrays with \`console.log\`.** Node prints \`[ -1, 0, 1 ]\` with spaces; format explicitly (as the examples do) when output must match exactly.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Copy and sort numerically, fix each element as an anchor, and find its two partners with two pointers moving inward: O(n²).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why the pointers work:</strong> <span style="color:#f0e2c8;">On a sorted array, a sum that is too small means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[left]</code> cannot help this anchor, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left++</code>; too big means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right--</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Duplicates:</strong> <span style="color:#f0e2c8;">Skip an anchor equal to the previous one and move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> past equal values after a hit, so each triplet appears once without a Set.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. JavaScript details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort()</code> needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code> or it sorts as strings; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort()</code> mutates, so copy with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...nums]</code>; a Set of arrays does not dedupe.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">The default string sort. It looks fine on single-digit tests and breaks on [10, 9, 1, -5, 2].</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do better than O(n²)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only by tiny factors: Grønlund and Pettie (2014, arXiv:1404.0799) gave algorithms slightly below n², but nobody knows an O(n^1.99) algorithm. In an interview, O(n²) is the expected optimum.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you solve it without sorting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, run a hash-based Two Sum with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> over the rest. Still O(n²), but dedupe needs string keys like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'-1,0,1'</code> because arrays compare by reference.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for 3Sum Closest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track the total with the smallest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.abs(total - target)</code>, move pointers by comparing with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code>, and drop the duplicate skips.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this extend to 4Sum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add one more outer loop: two anchors plus two pointers, O(n³). In general k-Sum costs O(n^(k-1)).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the values are huge, beyond 2^53?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Number arithmetic loses precision there, so use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> values (and a BigInt-safe comparator) or confirm the input range first.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Triplet** | Three elements from three different positions |
| **Brute force** | Trying every combination; O(n³) here |
| **Two pointers (converging)** | Indices from both ends of a sorted array moving inward |
| **Anchor** | The fixed first element of each triplet |
| **Deduplication** | Making each distinct triplet appear exactly once |
| **Early termination** | Stopping as soon as no answer is possible (anchor above 0) |
| **Comparator** | The function passed to \`sort()\` that says which of two items goes first |

---
**Conclusion:** In JavaScript, 3Sum is a numeric \`sort((a, b) => a - b)\` on a copy plus a two-pointer scan per anchor: O(n²) time, O(n) space, duplicates handled by equality skips — and the one bug that catches most people is the default string sort. The idea to carry to other problems is the reduction: fix one element and the rest becomes a problem you already know — here [Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently) on a sorted range, the same converging-pointer move used in [container with most water](/interview-question/how-do-you-solve-the-container-with-most-water-problem).`,
        examples: [
          {
            label: `3Sum with sort + two pointers on six inputs`,
            code: `function threeSum(nums) {
  // Copy, then sort NUMERICALLY: the default sort compares values as strings
  const a = [...nums].sort((x, y) => x - y);
  const n = a.length;
  const result = [];
  for (let i = 0; i < n - 2; i++) {
    if (a[i] > 0) break;                      // smallest value positive: no zero sum left
    if (i > 0 && a[i] === a[i - 1]) continue; // duplicate anchor
    let left = i + 1, right = n - 1;
    while (left < right) {
      const total = a[i] + a[left] + a[right];
      if (total < 0) {
        left++;
      } else if (total > 0) {
        right--;
      } else {
        result.push([a[i], a[left], a[right]]);
        left++;
        right--;
        while (left < right && a[left] === a[left - 1]) left++; // skip repeated middles
      }
    }
  }
  return result;
}

function fmt(triplets) {
  return '[' + triplets.map(t => '[' + t.join(', ') + ']').join(', ') + ']';
}

console.log(fmt(threeSum([-1, 0, 1, 2, -1, -4]))); // [[-1, -1, 2], [-1, 0, 1]]
console.log(fmt(threeSum([0, 0, 0, 0]))); // [[0, 0, 0]]
console.log(fmt(threeSum([0, 1, 1]))); // []
console.log(fmt(threeSum([]))); // []
console.log(fmt(threeSum([-2, 0, 1, 1, 2]))); // [[-2, 0, 2], [-2, 1, 1]]
console.log(fmt(threeSum([-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6]))); // [[-4, -2, 6], [-4, 0, 4], [-4, 1, 3], [-4, 2, 2], [-2, -2, 4], [-2, 0, 2]]`,
          },
          {
            label: `Brute force vs two pointers: same triplets, far less work`,
            code: `// Brute force O(n^3) vs sort + two pointers O(n^2), counting the work each does.
function makeInput(n, seed) {
  // MINSTD generator; seed * 48271 stays below 2^53, so Number arithmetic is exact
  const nums = [];
  for (let i = 0; i < n; i++) {
    seed = (seed * 48271) % 2147483647;
    nums.push((seed % 101) - 50);
  }
  return nums;
}

function bruteForce(nums) {
  const n = nums.length;
  const found = new Set(); // arrays compare by reference, so store a string key
  let checks = 0;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) {
        checks++;
        if (nums[i] + nums[j] + nums[k] === 0) {
          const t = [nums[i], nums[j], nums[k]].sort((x, y) => x - y);
          found.add(t.join(','));
        }
      }
  return { keys: [...found], checks };
}

function twoPointers(nums) {
  const a = [...nums].sort((x, y) => x - y);
  const n = a.length;
  const keys = [];
  let steps = 0;
  for (let i = 0; i < n - 2; i++) {
    if (a[i] > 0) break;
    if (i > 0 && a[i] === a[i - 1]) continue;
    let left = i + 1, right = n - 1;
    while (left < right) {
      steps++;
      const total = a[i] + a[left] + a[right];
      if (total < 0) left++;
      else if (total > 0) right--;
      else {
        keys.push(a[i] + ',' + a[left] + ',' + a[right]);
        left++;
        right--;
        while (left < right && a[left] === a[left - 1]) left++;
      }
    }
  }
  return { keys, steps };
}

for (const n of [50, 100, 200]) {
  const nums = makeInput(n, 42);
  const b = bruteForce(nums);
  const t = twoPointers(nums);
  const sb = new Set(b.keys);
  const same = sb.size === t.keys.length && t.keys.every(k => sb.has(k));
  console.log('n=' + n + ' triplets=' + t.keys.length + ' same=' + same +
    ' brute_checks=' + b.checks + ' two_pointer_steps=' + t.steps);
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an array of integers, find all unique triplets that sum to zero. Each triplet should appear only once in the output, even if the array has duplicates. Please write it in Java and tell me the time and space complexity."

**What a strong answer should cover:**
- Brute force is three nested loops, O(n³); the expected solution sorts first and then, for each anchor, runs a two-pointer scan: O(n²) time.
- Why moving a pointer is safe on a sorted array: a too-small sum means the left value can never work with this anchor, a too-big sum means the right value cannot.
- Duplicate handling by skipping equal neighbours (anchor and middle), instead of a set of results.
- Early exit when the anchor is positive, and edge cases: fewer than three elements, all zeros.
- Java specifics: \`Arrays.sort\` on a primitive \`int[]\` avoids boxing; the result is a \`List<List<Integer>>\`; \`List.equals\`/\`hashCode\` are content-based so a \`HashSet<List<Integer>>\` dedupes, but comparing boxed \`Integer\`s with \`==\` is a bug; \`int\` sums can overflow.

**Clarifying questions expected:**
- "Do you want values or indices?" — sorting loses the original indices.
- "Must each distinct triplet appear once, and may I sort the input in place?"

**Code / implementation expected:** Yes — a \`static List<List<Integer>> threeSum(int[] nums)\` method in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array and a loop are; nothing else is assumed.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`javac\` and \`java\`.

## 1. Why This Even Matters — A Story First

Imagine a shop that sells weights, some positive (they push the scale down) and some negative (balloons that pull it up). A customer wants every different set of **exactly three items** that leaves the scale perfectly at zero. You could try every possible trio — with 1,000 items that is about 166 million trios. Or you could line the items up from lightest to heaviest, hold one item in your hand, and walk two fingers in from both ends of the shelf: if the scale tips down, move the right finger to something lighter; if it tips up, move the left finger to something heavier. Each finger only ever moves one way, so for each item in your hand you scan the shelf once.

That is 3Sum: **sort, fix one number, then solve a two-number problem with two pointers**. It is asked constantly because it tests three things at once: whether you can reduce a problem to one you already know ([Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently)), whether you know the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique), and whether you can handle duplicates without a messy set of results.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want the values or the indices of the triplets? | Sorting destroys original indices. If indices are needed, store (value, index) pairs or use a hash-based approach. |
| Must the output contain each distinct triplet only once? | The classic version says yes: [-1, 0, 1] once, even if the array has several -1s. This drives the duplicate-skipping logic. |
| Is the target always 0, or any number k? | The same algorithm works for any target; you compare against k instead of 0. |
| How large is n, and how large are the values? | n up to a few thousand makes O(n²) fine. Large values can overflow fixed-width integers when three are added. |
| May I reorder (sort) the input array? | Sorting in place mutates the caller's data; copying costs O(n) extra memory. |
| Does the order of triplets in the output matter? | Usually not. Sorting gives you a natural ascending order for free. |

## 3. The Core Idea in Plain Language

**The problem:** given an array of integers, return every distinct triplet [a, b, c] of values at three different positions with a + b + c = 0.

📌 **Interview term: Triplet** — a group of three elements taken from three different positions in the array.

📌 **Interview term: Brute force** — trying every possible combination. Here that is three nested loops over i < j < k, which is O(n³) — see [Big-O notation](/interview-question/what-is-big-o-notation) if that notation is new.

The trick is to notice that once you **fix the first number** a[i], you only need two more numbers that add to −a[i]. That is a Two Sum on the rest of the array. And on a **sorted** array, Two Sum does not need a hash map: put one pointer at the left end and one at the right end.

📌 **Interview term: Two pointers (converging)** — two indices that start at opposite ends of a sorted array and move toward each other, each step discarding a value that can no longer be part of an answer.

📌 **Interview term: Anchor** — the fixed element a[i] of the outer loop; the inner two-pointer scan searches for its two partners.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="Sorted array with anchor i at index 1, L at index 2 and R at index 5">
  <defs>
    <marker id="b08q1a-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="28" text-anchor="middle">Sorted: fix anchor i, move L and R inward</text>
  <rect class="d-box-muted" x="54" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="90" y="92" text-anchor="middle">-4</text>
  <rect class="d-box-accent" x="146" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="182" y="92" text-anchor="middle">-1</text>
  <rect class="d-box" x="238" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="274" y="92" text-anchor="middle">-1</text>
  <rect class="d-box-muted" x="330" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="366" y="92" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="422" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="458" y="92" text-anchor="middle">1</text>
  <rect class="d-box" x="514" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="550" y="92" text-anchor="middle">2</text>
  <path class="d-edge-accent" d="M 182 172 L 182 124" marker-end="url(#b08q1a-java)"/>
  <text class="d-text d-accent" x="182" y="200" text-anchor="middle">i</text>
  <path class="d-edge-accent" d="M 274 172 L 274 124" marker-end="url(#b08q1a-java)"/>
  <text class="d-text d-accent" x="274" y="200" text-anchor="middle">L</text>
  <path class="d-edge-accent" d="M 550 172 L 550 124" marker-end="url(#b08q1a-java)"/>
  <text class="d-text d-accent" x="550" y="200" text-anchor="middle">R</text>
</svg>

In the picture the anchor is a[1] = −1, L points at −1 and R at 2. The sum is −1 + (−1) + 2 = 0, so [-1, -1, 2] is recorded.

### Why moving a pointer is safe

The array is sorted, so a[L] is the smallest candidate and a[R] is the largest:

- If the sum is **too small**, pairing a[L] with anything at or left of R gives a sum at most this one, so a[L] can never work. Discard it: L moves right.
- If the sum is **too big**, a[R] paired with anything at or right of L is at least this big, so a[R] can never work. Discard it: R moves left.
- If it is **exactly zero**, record it and move both.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 270" role="img" aria-label="Decision rule: compare the sum with zero and move one pointer">
  <defs>
    <marker id="b08q1b-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="200" y="20" width="300" height="60" rx="10"/>
  <text class="d-text" x="350" y="47" text-anchor="middle">sum = a[i] + a[L] + a[R]</text>
  <text class="d-sub" x="350" y="68" text-anchor="middle">compare with 0</text>
  <path class="d-edge" d="M 300 80 L 130 150" marker-end="url(#b08q1b-java)"/>
  <path class="d-edge" d="M 350 80 L 350 150" marker-end="url(#b08q1b-java)"/>
  <path class="d-edge" d="M 400 80 L 570 150" marker-end="url(#b08q1b-java)"/>
  <rect class="d-box" x="30" y="154" width="190" height="96" rx="10"/>
  <text class="d-text" x="125" y="184" text-anchor="middle">sum below 0</text>
  <text class="d-sub" x="125" y="208" text-anchor="middle">L moves right</text>
  <text class="d-sub" x="125" y="230" text-anchor="middle">to a bigger value</text>
  <rect class="d-box" x="255" y="154" width="190" height="96" rx="10"/>
  <text class="d-text" x="350" y="184" text-anchor="middle">sum equals 0</text>
  <text class="d-sub" x="350" y="208" text-anchor="middle">record, move both</text>
  <text class="d-sub" x="350" y="230" text-anchor="middle">skip equal values</text>
  <rect class="d-box" x="480" y="154" width="190" height="96" rx="10"/>
  <text class="d-text" x="575" y="184" text-anchor="middle">sum above 0</text>
  <text class="d-sub" x="575" y="208" text-anchor="middle">R moves left</text>
  <text class="d-sub" x="575" y="230" text-anchor="middle">to a smaller value</text>
</svg>

Every step discards one value for this anchor, so the inner scan is at most n steps, and the whole algorithm is O(n²).

### Handling duplicates without a set

📌 **Interview term: Deduplication** — making sure each distinct triplet appears once. Because the array is sorted, equal values sit next to each other, so you skip them:

1. **Anchor skip:** if a[i] equals a[i−1], every triplet it could form was already found by the previous anchor. Skip it.
2. **Middle skip:** after recording a triplet, move L past every copy of the value just used. (R then lands on a new value naturally, because a matching R must pair with a new L.)

📌 **Interview term: Early termination** — if the anchor a[i] is already positive, the two values to its right are positive too, so no zero sum is possible. Stop the outer loop.

## 4. From Brute Force to the Optimal Solution

| Approach | Time | Space | Verdict |
| :--- | :--- | :--- | :--- |
| Three nested loops + set of sorted triplets | O(n³) | O(m) for m results | Correct but too slow beyond a few hundred elements |
| Fix one, hash-set Two Sum on the rest | O(n²) | O(n) | Fast, but dedupe needs a set of sorted triplets |
| **Sort + fix one + two pointers** | **O(n²)** | **O(1) extra besides the sort** | The expected answer: no hashing, natural dedupe |

### The Java code

~~~java
static List<List<Integer>> threeSum(int[] input) {
    int[] nums = input.clone();          // do not reorder the caller's array
    Arrays.sort(nums);                   // primitive int[]: no boxing while sorting
    int n = nums.length;
    List<List<Integer>> result = new ArrayList<>();
    for (int i = 0; i < n - 2; i++) {
        if (nums[i] > 0) break;          // smallest value positive: no zero sum left
        if (i > 0 && nums[i] == nums[i - 1]) continue; // duplicate anchor
        int left = i + 1, right = n - 1;
        while (left < right) {
            int total = nums[i] + nums[left] + nums[right];
            if (total < 0) {
                left++;
            } else if (total > 0) {
                right--;
            } else {
                result.add(List.of(nums[i], nums[left], nums[right]));
                left++;
                right--;
                while (left < right && nums[left] == nums[left - 1]) left++;
            }
        }
    }
    return result;
}
~~~

Things worth saying out loud while you write it:

- \`input.clone()\` then \`Arrays.sort(nums)\`: sorting a primitive \`int[]\` keeps the work on plain ints, with no \`Integer\` objects, and the clone means the caller's array is not reordered.
- The comparisons \`nums[i] == nums[i - 1]\` are on primitive \`int\`s, so \`==\` is correct. If you ever hold \`Integer\` objects, \`==\` compares references: in the lab \`Integer a = 127, b = 127\` gave \`a == b\` true but 128 gave **false**, because only small values are cached. Use \`.equals()\` or unbox.
- \`List.of(...)\` builds a small **immutable** list; calling \`add\` on it threw \`UnsupportedOperationException\` in the lab. That is fine for results you only read.
- \`int total\` is safe while |value| stays below about 7×10⁸ (three of them then fit under 2³¹ − 1). With values near 10⁹, three of them overflow: \`1000000000 + 1000000000 + 1000000000\` printed \`-1294967296\` in the lab. Use \`long\` there.

## 5. Verified: Running the Code

Both programs below are the runnable examples on this page; each was run with \`javac Main.java && java Main\`.

**Example 1 — the solution on six inputs** (the classic one, all zeros, no answer, empty, two answers, many duplicates):

~~~text
[[-1, -1, 2], [-1, 0, 1]]
[[0, 0, 0]]
[]
[]
[[-2, 0, 2], [-2, 1, 1]]
[[-4, -2, 6], [-4, 0, 4], [-4, 1, 3], [-4, 2, 2], [-2, -2, 4], [-2, 0, 2]]
~~~

**Example 2 — brute force vs two pointers on the same generated input** (values in [-50, 50]), counting the work:

~~~text
n=50 triplets=81 same=true brute_checks=19600 two_pointer_steps=618
n=100 triplets=332 same=true brute_checks=161700 two_pointer_steps=1761
n=200 triplets=876 same=true brute_checks=1313400 two_pointer_steps=4494
~~~

Both methods find exactly the same triplets (\`same=true\`). The brute force always does C(n, 3) checks — 1,313,400 for n = 200 — while the two-pointer version did 4,494 inner steps. That is far below the n²/2 worst case because the input has only 101 distinct values, so most anchors are skipped as duplicates and the early exit fires once anchors turn positive. In the worst case (all values distinct, no early exit) each anchor scans its whole remaining range, which adds up to about n²/2 steps — still quadratic, never cubic.

## 6. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n²) | n anchors × at most n pointer moves each; \`Arrays.sort(int[])\` is O(n log n); the nested scan is O(n²) and dominates. |
| Space | O(n) or O(1) | O(n) for the cloned array, not counting the output lists. |
| Output | O(m) | m distinct triplets; m can itself be about n² in the worst case |

## Edge Cases to Mention

- **Fewer than three elements** ([] or [0, 1]): no triplet, return an empty list. The loop bound n − 2 handles this.
- **All zeros** ([0, 0, 0, 0]): exactly one triplet, [0, 0, 0]. This is the test that catches missing duplicate skips.
- **No answer** ([0, 1, 1]): empty list.
- **Many duplicates** (the 15-element input in the example): six distinct triplets, no repeats.
- **All positive or all negative:** the early-termination check exits almost immediately for all-positive input.

## Common Pitfalls

- **\`int\` overflow on large values.** Three values near 10⁹ overflow \`int\` (the lab printed \`-1294967296\`). Cast to \`long\` before adding when the range is large.
- **Comparing \`Integer\` objects with \`==\`.** Works for -128..127 because of caching and fails above (127 → true, 128 → false in the lab). Keep the array primitive.
- **Sorting an \`Integer[]\` instead of \`int[]\`.** It boxes every element and is slower; there is no reason to here.
- **Comparing the anchor with \`nums[i + 1]\`.** It skips the first copy and loses triplets such as [-1, -1, 2]; compare with the previous element.
- **Mutating a \`List.of\` result later.** It is immutable; use \`new ArrayList<>(List.of(...))\` or \`Arrays.asList\` if callers must modify triplets.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Clone and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort</code> the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>, fix each element as an anchor, then find its two partners with two pointers moving inward: O(n²).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why the pointers work:</strong> <span style="color:#f0e2c8;">Sorted order means a too-small sum makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[left]</code> useless for this anchor, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left++</code>; a too-big sum means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right--</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Duplicates:</strong> <span style="color:#f0e2c8;">Skip an anchor equal to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i - 1]</code>; after a hit move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> past equal values. No <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet&lt;List&lt;Integer&gt;&gt;</code> needed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Java details:</strong> <span style="color:#f0e2c8;">Primitive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> avoids boxing and makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> safe; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List.of</code> is immutable; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> if three values could overflow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;">Boxed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> comparisons with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>: correct up to 127, wrong from 128 on.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do better than O(n²)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only by tiny factors: Grønlund and Pettie (2014, arXiv:1404.0799) gave algorithms slightly below n², but nobody knows an O(n^1.99) algorithm. In an interview, O(n²) is the expected optimum.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you solve it without sorting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet&lt;Integer&gt;</code> Two Sum over the rest, collecting sorted triplets into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet&lt;List&lt;Integer&gt;&gt;</code> (content-based <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>). Still O(n²), more memory and boxing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashSet&lt;List&lt;Integer&gt;&gt;</code> dedupe correctly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List.equals</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hashCode</code> are defined on the elements, so two lists with the same values are equal. In the lab, adding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List.of(1, 2)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.asList(1, 2)</code> left the set at size 1.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this extend to 4Sum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two anchors plus two pointers, O(n³). Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> for the sum: with values up to 10⁹, four of them overflow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for 3Sum Closest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track the total with the smallest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.abs(total - target)</code>, move pointers relative to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code>, and drop the duplicate skips.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Triplet** | Three elements from three different positions |
| **Brute force** | Trying every combination; O(n³) here |
| **Two pointers (converging)** | Indices from both ends of a sorted array moving inward |
| **Anchor** | The fixed first element of each triplet |
| **Deduplication** | Making each distinct triplet appear exactly once |
| **Early termination** | Stopping as soon as no answer is possible (anchor above 0) |
| **Boxing** | Wrapping a primitive \`int\` in an \`Integer\` object |

---
**Conclusion:** In Java, 3Sum is \`Arrays.sort\` on a cloned \`int[]\` plus a two-pointer scan per anchor: O(n²) time, O(n) space, with duplicates skipped by primitive \`==\` checks — and the Java-specific traps are boxed-\`Integer\` equality and \`int\` overflow on large values. The idea to carry to other problems is the reduction: fix one element and the rest becomes a problem you already know — here [Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently) on a sorted range, the same converging-pointer move used in [container with most water](/interview-question/how-do-you-solve-the-container-with-most-water-problem).`,
        examples: [
          {
            label: `3Sum with sort + two pointers on six inputs`,
            code: `import java.util.*;

public class Main {
    static List<List<Integer>> threeSum(int[] input) {
        int[] nums = input.clone();          // do not reorder the caller's array
        Arrays.sort(nums);                   // primitive int[]: no boxing while sorting
        int n = nums.length;
        List<List<Integer>> result = new ArrayList<>();
        for (int i = 0; i < n - 2; i++) {
            if (nums[i] > 0) break;          // smallest value positive: no zero sum left
            if (i > 0 && nums[i] == nums[i - 1]) continue; // duplicate anchor
            int left = i + 1, right = n - 1;
            while (left < right) {
                int total = nums[i] + nums[left] + nums[right];
                if (total < 0) {
                    left++;
                } else if (total > 0) {
                    right--;
                } else {
                    result.add(List.of(nums[i], nums[left], nums[right]));
                    left++;
                    right--;
                    while (left < right && nums[left] == nums[left - 1]) left++;
                }
            }
        }
        return result;
    }

    static String fmt(List<List<Integer>> triplets) {
        StringBuilder sb = new StringBuilder("[");
        for (int t = 0; t < triplets.size(); t++) {
            if (t > 0) sb.append(", ");
            List<Integer> x = triplets.get(t);
            sb.append("[").append(x.get(0)).append(", ").append(x.get(1)).append(", ").append(x.get(2)).append("]");
        }
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        System.out.println(fmt(threeSum(new int[]{-1, 0, 1, 2, -1, -4}))); // [[-1, -1, 2], [-1, 0, 1]]
        System.out.println(fmt(threeSum(new int[]{0, 0, 0, 0})));          // [[0, 0, 0]]
        System.out.println(fmt(threeSum(new int[]{0, 1, 1})));             // []
        System.out.println(fmt(threeSum(new int[]{})));                    // []
        System.out.println(fmt(threeSum(new int[]{-2, 0, 1, 1, 2})));      // [[-2, 0, 2], [-2, 1, 1]]
        System.out.println(fmt(threeSum(new int[]{-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6})));
    }
}`,
          },
          {
            label: `Brute force vs two pointers: same triplets, far less work`,
            code: `import java.util.*;

// Brute force O(n^3) vs sort + two pointers O(n^2), counting the work each does.
public class Main {
    static int[] makeInput(int n, long seed) {
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            seed = seed * 48271L % 2147483647L;   // long: the product does not fit in an int
            nums[i] = (int) (seed % 101) - 50;
        }
        return nums;
    }

    static long checks, steps;

    static Set<List<Integer>> bruteForce(int[] nums) {
        int n = nums.length;
        Set<List<Integer>> found = new HashSet<>(); // List.equals compares contents
        checks = 0;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                for (int k = j + 1; k < n; k++) {
                    checks++;
                    if (nums[i] + nums[j] + nums[k] == 0) {
                        int[] t = {nums[i], nums[j], nums[k]};
                        Arrays.sort(t);
                        found.add(List.of(t[0], t[1], t[2]));
                    }
                }
        return found;
    }

    static List<List<Integer>> twoPointers(int[] input) {
        int[] a = input.clone();
        Arrays.sort(a);
        int n = a.length;
        List<List<Integer>> result = new ArrayList<>();
        steps = 0;
        for (int i = 0; i < n - 2; i++) {
            if (a[i] > 0) break;
            if (i > 0 && a[i] == a[i - 1]) continue;
            int left = i + 1, right = n - 1;
            while (left < right) {
                steps++;
                int total = a[i] + a[left] + a[right];
                if (total < 0) left++;
                else if (total > 0) right--;
                else {
                    result.add(List.of(a[i], a[left], a[right]));
                    left++;
                    right--;
                    while (left < right && a[left] == a[left - 1]) left++;
                }
            }
        }
        return result;
    }

    public static void main(String[] args) {
        for (int n : new int[]{50, 100, 200}) {
            int[] nums = makeInput(n, 42);
            Set<List<Integer>> b = bruteForce(nums);
            List<List<Integer>> t = twoPointers(nums);
            boolean same = b.size() == t.size() && b.containsAll(t);
            System.out.println("n=" + n + " triplets=" + t.size() + " same=" + same
                + " brute_checks=" + checks + " two_pointer_steps=" + steps);
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given an array of integers, find all unique triplets that sum to zero. Each triplet should appear only once in the output, even if the array has duplicates. Please write it in C++ and tell me the time and space complexity."

**What a strong answer should cover:**
- Brute force is three nested loops, O(n³); the expected solution sorts first and then, for each anchor, runs a two-pointer scan: O(n²) time.
- Why moving a pointer is safe on a sorted array: a too-small sum means the left value can never work with this anchor, a too-big sum means the right value cannot.
- Duplicate handling by skipping equal neighbours (anchor and middle), instead of a set of results.
- Early exit when the anchor is positive, and edge cases: fewer than three elements, all zeros.
- C++ specifics: \`std::sort\` on a \`std::vector<int>\` taken by value (a copy), \`nums.size() - 2\` wraps around for small inputs because \`size()\` is unsigned, signed \`int\` overflow is undefined behaviour, and \`std::set<std::array<int,3>>\` works for set-based dedupe.

**Clarifying questions expected:**
- "Do you want values or indices?" — sorting loses the original indices.
- "Must each distinct triplet appear once, and may I sort the input in place?"

**Code / implementation expected:** Yes — a \`vector<vector<int>> threeSum(vector<int> nums)\` function in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array and a loop are; nothing else is assumed.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`g++ -std=c++17\`.

## 1. Why This Even Matters — A Story First

Imagine a shop that sells weights, some positive (they push the scale down) and some negative (balloons that pull it up). A customer wants every different set of **exactly three items** that leaves the scale perfectly at zero. You could try every possible trio — with 1,000 items that is about 166 million trios. Or you could line the items up from lightest to heaviest, hold one item in your hand, and walk two fingers in from both ends of the shelf: if the scale tips down, move the right finger to something lighter; if it tips up, move the left finger to something heavier. Each finger only ever moves one way, so for each item in your hand you scan the shelf once.

That is 3Sum: **sort, fix one number, then solve a two-number problem with two pointers**. It is asked constantly because it tests three things at once: whether you can reduce a problem to one you already know ([Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently)), whether you know the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique), and whether you can handle duplicates without a messy set of results.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want the values or the indices of the triplets? | Sorting destroys original indices. If indices are needed, store (value, index) pairs or use a hash-based approach. |
| Must the output contain each distinct triplet only once? | The classic version says yes: [-1, 0, 1] once, even if the array has several -1s. This drives the duplicate-skipping logic. |
| Is the target always 0, or any number k? | The same algorithm works for any target; you compare against k instead of 0. |
| How large is n, and how large are the values? | n up to a few thousand makes O(n²) fine. Large values can overflow fixed-width integers when three are added. |
| May I reorder (sort) the input array? | Sorting in place mutates the caller's data; copying costs O(n) extra memory. |
| Does the order of triplets in the output matter? | Usually not. Sorting gives you a natural ascending order for free. |

## 3. The Core Idea in Plain Language

**The problem:** given an array of integers, return every distinct triplet [a, b, c] of values at three different positions with a + b + c = 0.

📌 **Interview term: Triplet** — a group of three elements taken from three different positions in the array.

📌 **Interview term: Brute force** — trying every possible combination. Here that is three nested loops over i < j < k, which is O(n³) — see [Big-O notation](/interview-question/what-is-big-o-notation) if that notation is new.

The trick is to notice that once you **fix the first number** a[i], you only need two more numbers that add to −a[i]. That is a Two Sum on the rest of the array. And on a **sorted** array, Two Sum does not need a hash map: put one pointer at the left end and one at the right end.

📌 **Interview term: Two pointers (converging)** — two indices that start at opposite ends of a sorted array and move toward each other, each step discarding a value that can no longer be part of an answer.

📌 **Interview term: Anchor** — the fixed element a[i] of the outer loop; the inner two-pointer scan searches for its two partners.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="Sorted array with anchor i at index 1, L at index 2 and R at index 5">
  <defs>
    <marker id="b08q1a-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="28" text-anchor="middle">Sorted: fix anchor i, move L and R inward</text>
  <rect class="d-box-muted" x="54" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="90" y="92" text-anchor="middle">-4</text>
  <rect class="d-box-accent" x="146" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="182" y="92" text-anchor="middle">-1</text>
  <rect class="d-box" x="238" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="274" y="92" text-anchor="middle">-1</text>
  <rect class="d-box-muted" x="330" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="366" y="92" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="422" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="458" y="92" text-anchor="middle">1</text>
  <rect class="d-box" x="514" y="60" width="72" height="52" rx="8"/>
  <text class="d-text" x="550" y="92" text-anchor="middle">2</text>
  <path class="d-edge-accent" d="M 182 172 L 182 124" marker-end="url(#b08q1a-cpp)"/>
  <text class="d-text d-accent" x="182" y="200" text-anchor="middle">i</text>
  <path class="d-edge-accent" d="M 274 172 L 274 124" marker-end="url(#b08q1a-cpp)"/>
  <text class="d-text d-accent" x="274" y="200" text-anchor="middle">L</text>
  <path class="d-edge-accent" d="M 550 172 L 550 124" marker-end="url(#b08q1a-cpp)"/>
  <text class="d-text d-accent" x="550" y="200" text-anchor="middle">R</text>
</svg>

In the picture the anchor is a[1] = −1, L points at −1 and R at 2. The sum is −1 + (−1) + 2 = 0, so [-1, -1, 2] is recorded.

### Why moving a pointer is safe

The array is sorted, so a[L] is the smallest candidate and a[R] is the largest:

- If the sum is **too small**, pairing a[L] with anything at or left of R gives a sum at most this one, so a[L] can never work. Discard it: L moves right.
- If the sum is **too big**, a[R] paired with anything at or right of L is at least this big, so a[R] can never work. Discard it: R moves left.
- If it is **exactly zero**, record it and move both.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 270" role="img" aria-label="Decision rule: compare the sum with zero and move one pointer">
  <defs>
    <marker id="b08q1b-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="200" y="20" width="300" height="60" rx="10"/>
  <text class="d-text" x="350" y="47" text-anchor="middle">sum = a[i] + a[L] + a[R]</text>
  <text class="d-sub" x="350" y="68" text-anchor="middle">compare with 0</text>
  <path class="d-edge" d="M 300 80 L 130 150" marker-end="url(#b08q1b-cpp)"/>
  <path class="d-edge" d="M 350 80 L 350 150" marker-end="url(#b08q1b-cpp)"/>
  <path class="d-edge" d="M 400 80 L 570 150" marker-end="url(#b08q1b-cpp)"/>
  <rect class="d-box" x="30" y="154" width="190" height="96" rx="10"/>
  <text class="d-text" x="125" y="184" text-anchor="middle">sum below 0</text>
  <text class="d-sub" x="125" y="208" text-anchor="middle">L moves right</text>
  <text class="d-sub" x="125" y="230" text-anchor="middle">to a bigger value</text>
  <rect class="d-box" x="255" y="154" width="190" height="96" rx="10"/>
  <text class="d-text" x="350" y="184" text-anchor="middle">sum equals 0</text>
  <text class="d-sub" x="350" y="208" text-anchor="middle">record, move both</text>
  <text class="d-sub" x="350" y="230" text-anchor="middle">skip equal values</text>
  <rect class="d-box" x="480" y="154" width="190" height="96" rx="10"/>
  <text class="d-text" x="575" y="184" text-anchor="middle">sum above 0</text>
  <text class="d-sub" x="575" y="208" text-anchor="middle">R moves left</text>
  <text class="d-sub" x="575" y="230" text-anchor="middle">to a smaller value</text>
</svg>

Every step discards one value for this anchor, so the inner scan is at most n steps, and the whole algorithm is O(n²).

### Handling duplicates without a set

📌 **Interview term: Deduplication** — making sure each distinct triplet appears once. Because the array is sorted, equal values sit next to each other, so you skip them:

1. **Anchor skip:** if a[i] equals a[i−1], every triplet it could form was already found by the previous anchor. Skip it.
2. **Middle skip:** after recording a triplet, move L past every copy of the value just used. (R then lands on a new value naturally, because a matching R must pair with a new L.)

📌 **Interview term: Early termination** — if the anchor a[i] is already positive, the two values to its right are positive too, so no zero sum is possible. Stop the outer loop.

## 4. From Brute Force to the Optimal Solution

| Approach | Time | Space | Verdict |
| :--- | :--- | :--- | :--- |
| Three nested loops + set of sorted triplets | O(n³) | O(m) for m results | Correct but too slow beyond a few hundred elements |
| Fix one, hash-set Two Sum on the rest | O(n²) | O(n) | Fast, but dedupe needs a set of sorted triplets |
| **Sort + fix one + two pointers** | **O(n²)** | **O(1) extra besides the sort** | The expected answer: no hashing, natural dedupe |

### The C++ code

~~~cpp
vector<vector<int>> threeSum(vector<int> nums) {   // taken by value: we sort our own copy
    sort(nums.begin(), nums.end());
    int n = static_cast<int>(nums.size());         // int, so n - 2 cannot wrap around
    vector<vector<int>> result;
    for (int i = 0; i < n - 2; i++) {
        if (nums[i] > 0) break;                    // smallest value positive: no zero sum left
        if (i > 0 && nums[i] == nums[i - 1]) continue; // duplicate anchor
        int left = i + 1, right = n - 1;
        while (left < right) {
            int total = nums[i] + nums[left] + nums[right];
            if (total < 0) {
                left++;
            } else if (total > 0) {
                right--;
            } else {
                result.push_back({nums[i], nums[left], nums[right]});
                left++;
                right--;
                while (left < right && nums[left] == nums[left - 1]) left++;
            }
        }
    }
    return result;
}
~~~

Things worth saying out loud while you write it:

- The parameter is \`vector<int> nums\` **by value**, so the function sorts its own copy. Taking \`vector<int>&\` and sorting would reorder the caller's data.
- \`int n = static_cast<int>(nums.size())\` matters. \`size()\` returns an unsigned \`size_t\`, so for an empty vector \`nums.size() - 2\` is not −2: the lab printed \`18446744073709551614\`, and a loop up to that would read far out of bounds.
- \`std::sort\` sorts with \`<\` by default, which for \`int\` is numeric order — no comparator needed.
- \`int total\` is fine while |value| stays below about 7×10⁸. With values near 10⁹, three of them overflow \`int\`, and signed overflow is **undefined behaviour** in C++ (not just a wrong number). Use \`long long\` for the sum when the range is large.

## 5. Verified: Running the Code

Both programs below are the runnable examples on this page; each was run with \`g++ -std=c++17 main.cpp && ./a.out\`.

**Example 1 — the solution on six inputs** (the classic one, all zeros, no answer, empty, two answers, many duplicates):

~~~text
[[-1, -1, 2], [-1, 0, 1]]
[[0, 0, 0]]
[]
[]
[[-2, 0, 2], [-2, 1, 1]]
[[-4, -2, 6], [-4, 0, 4], [-4, 1, 3], [-4, 2, 2], [-2, -2, 4], [-2, 0, 2]]
~~~

**Example 2 — brute force vs two pointers on the same generated input** (values in [-50, 50]), counting the work:

~~~text
n=50 triplets=81 same=true brute_checks=19600 two_pointer_steps=618
n=100 triplets=332 same=true brute_checks=161700 two_pointer_steps=1761
n=200 triplets=876 same=true brute_checks=1313400 two_pointer_steps=4494
~~~

Both methods find exactly the same triplets (\`same=true\`). The brute force always does C(n, 3) checks — 1,313,400 for n = 200 — while the two-pointer version did 4,494 inner steps. That is far below the n²/2 worst case because the input has only 101 distinct values, so most anchors are skipped as duplicates and the early exit fires once anchors turn positive. In the worst case (all values distinct, no early exit) each anchor scans its whole remaining range, which adds up to about n²/2 steps — still quadratic, never cubic.

## 6. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n²) | n anchors × at most n pointer moves each; \`std::sort\` is O(n log n); the nested scan is O(n²) and dominates. |
| Space | O(n) or O(1) | O(n) for the by-value copy, not counting the output. |
| Output | O(m) | m distinct triplets; m can itself be about n² in the worst case |

## Edge Cases to Mention

- **Fewer than three elements** ([] or [0, 1]): no triplet, return an empty list. The loop bound n − 2 handles this.
- **All zeros** ([0, 0, 0, 0]): exactly one triplet, [0, 0, 0]. This is the test that catches missing duplicate skips.
- **No answer** ([0, 1, 1]): empty list.
- **Many duplicates** (the 15-element input in the example): six distinct triplets, no repeats.
- **All positive or all negative:** the early-termination check exits almost immediately for all-positive input.

## Common Pitfalls

- **Unsigned wraparound in the loop bound.** \`for (size_t i = 0; i < nums.size() - 2; i++)\` on an empty vector loops to 18446744073709551614. Convert the size to \`int\` first.
- **Signed overflow.** Adding three large \`int\`s is undefined behaviour; use \`long long total = 0LL + a + b + c;\` when values can be near 10⁹.
- **Sorting the caller's vector.** Taking \`vector<int>&\` and calling \`sort\` mutates it; take by value or copy.
- **Comparing the anchor with \`nums[i + 1]\`.** It skips the first copy and loses [-1, -1, 2]; compare with the previous element, and only when \`i > 0\`.
- **Reading \`nums[left - 1]\` before checking \`left < right\`.** Keep the bounds check first in the \`&&\` so it short-circuits.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Take the vector by value, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> it, fix each element as an anchor, and find its two partners with two pointers moving inward: O(n²).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why the pointers work:</strong> <span style="color:#f0e2c8;">Sorted order means a too-small sum makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[left]</code> useless for this anchor, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left++</code>; a too-big sum means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right--</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Duplicates:</strong> <span style="color:#f0e2c8;">Skip an anchor equal to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i - 1]</code>; after a hit move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> past equal values. No <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::set</code> needed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. C++ details:</strong> <span style="color:#f0e2c8;">Cast <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size()</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - 2</code> cannot wrap; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> if three values could overflow, because signed overflow is undefined behaviour.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap to avoid:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums.size() - 2</code> on an empty vector is 18446744073709551614, not -2.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do better than O(n²)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only by tiny factors: Grønlund and Pettie (2014, arXiv:1404.0799) gave algorithms slightly below n², but nobody knows an O(n^1.99) algorithm. In an interview, O(n²) is the expected optimum.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you dedupe with a container instead of skipping?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Insert each sorted triplet into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::set&lt;std::array&lt;int, 3&gt;&gt;</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::array</code> has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator&lt;</code>, so it works out of the box. It adds O(log m) per insert and extra memory.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why take the vector by value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sorting needs a mutable copy anyway; by value makes the copy explicit, keeps the caller's data intact, and lets the caller <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::move</code> in if they do not need the original.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this extend to 4Sum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two anchors plus two pointers, O(n³), and the sum should be <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>: with values up to 10⁹, four of them overflow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for 3Sum Closest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track the total with the smallest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::abs(total - target)</code>, move pointers relative to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code>, and drop the duplicate skips.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Triplet** | Three elements from three different positions |
| **Brute force** | Trying every combination; O(n³) here |
| **Two pointers (converging)** | Indices from both ends of a sorted array moving inward |
| **Anchor** | The fixed first element of each triplet |
| **Deduplication** | Making each distinct triplet appear exactly once |
| **Early termination** | Stopping as soon as no answer is possible (anchor above 0) |
| **Undefined behaviour** | Code the C++ standard gives no meaning to, such as signed overflow; anything may happen |

---
**Conclusion:** In C++, 3Sum is \`std::sort\` on a by-value copy plus a two-pointer scan per anchor: O(n²) time, O(n) space, duplicates skipped by neighbour comparisons — and the C++ traps are the unsigned \`size() - 2\` and signed overflow on large inputs. The idea to carry to other problems is the reduction: fix one element and the rest becomes a problem you already know — here [Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently) on a sorted range, the same converging-pointer move used in [container with most water](/interview-question/how-do-you-solve-the-container-with-most-water-problem).`,
        examples: [
          {
            label: `3Sum with sort + two pointers on six inputs`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

vector<vector<int>> threeSum(vector<int> nums) {   // taken by value: we sort our own copy
    sort(nums.begin(), nums.end());
    int n = static_cast<int>(nums.size());         // int, so n - 2 cannot wrap around
    vector<vector<int>> result;
    for (int i = 0; i < n - 2; i++) {
        if (nums[i] > 0) break;                    // smallest value positive: no zero sum left
        if (i > 0 && nums[i] == nums[i - 1]) continue; // duplicate anchor
        int left = i + 1, right = n - 1;
        while (left < right) {
            int total = nums[i] + nums[left] + nums[right];
            if (total < 0) {
                left++;
            } else if (total > 0) {
                right--;
            } else {
                result.push_back({nums[i], nums[left], nums[right]});
                left++;
                right--;
                while (left < right && nums[left] == nums[left - 1]) left++;
            }
        }
    }
    return result;
}

string fmt(const vector<vector<int>>& triplets) {
    string s = "[";
    for (size_t t = 0; t < triplets.size(); t++) {
        if (t > 0) s += ", ";
        s += "[" + to_string(triplets[t][0]) + ", " + to_string(triplets[t][1]) + ", " +
             to_string(triplets[t][2]) + "]";
    }
    return s + "]";
}

int main() {
    cout << fmt(threeSum({-1, 0, 1, 2, -1, -4})) << "\\n"; // [[-1, -1, 2], [-1, 0, 1]]
    cout << fmt(threeSum({0, 0, 0, 0})) << "\\n";          // [[0, 0, 0]]
    cout << fmt(threeSum({0, 1, 1})) << "\\n";             // []
    cout << fmt(threeSum({})) << "\\n";                    // []
    cout << fmt(threeSum({-2, 0, 1, 1, 2})) << "\\n";      // [[-2, 0, 2], [-2, 1, 1]]
    cout << fmt(threeSum({-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6})) << "\\n";
}`,
          },
          {
            label: `Brute force vs two pointers: same triplets, far less work`,
            code: `#include <algorithm>
#include <array>
#include <iostream>
#include <set>
#include <vector>
using namespace std;

// Brute force O(n^3) vs sort + two pointers O(n^2), counting the work each does.
vector<int> makeInput(int n, long long seed) {
    vector<int> nums;
    for (int i = 0; i < n; i++) {
        seed = seed * 48271LL % 2147483647LL;   // long long: the product overflows int
        nums.push_back(static_cast<int>(seed % 101) - 50);
    }
    return nums;
}

long long checks = 0, steps = 0;

set<array<int, 3>> bruteForce(const vector<int>& nums) {
    int n = static_cast<int>(nums.size());
    set<array<int, 3>> found;                   // std::array has operator<, so set works
    checks = 0;
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
            for (int k = j + 1; k < n; k++) {
                checks++;
                if (nums[i] + nums[j] + nums[k] == 0) {
                    array<int, 3> t = {nums[i], nums[j], nums[k]};
                    sort(t.begin(), t.end());
                    found.insert(t);
                }
            }
    return found;
}

vector<array<int, 3>> twoPointers(vector<int> a) {
    sort(a.begin(), a.end());
    int n = static_cast<int>(a.size());
    vector<array<int, 3>> result;
    steps = 0;
    for (int i = 0; i < n - 2; i++) {
        if (a[i] > 0) break;
        if (i > 0 && a[i] == a[i - 1]) continue;
        int left = i + 1, right = n - 1;
        while (left < right) {
            steps++;
            int total = a[i] + a[left] + a[right];
            if (total < 0) left++;
            else if (total > 0) right--;
            else {
                result.push_back({a[i], a[left], a[right]});
                left++;
                right--;
                while (left < right && a[left] == a[left - 1]) left++;
            }
        }
    }
    return result;
}

int main() {
    cout << boolalpha;
    for (int n : {50, 100, 200}) {
        vector<int> nums = makeInput(n, 42);
        set<array<int, 3>> b = bruteForce(nums);
        vector<array<int, 3>> t = twoPointers(nums);
        bool same = vector<array<int, 3>>(b.begin(), b.end()) == t; // both in sorted order
        cout << "n=" << n << " triplets=" << t.size() << " same=" << same
             << " brute_checks=" << checks << " two_pointer_steps=" << steps << "\\n";
    }
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How do you solve the container with most water problem?`,
    difficulty: "medium",
    seoDescription: `Container with most water: two pointers from both ends, always moving the shorter wall, O(n) time and O(1) space, with a proof and verified code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You get an array where each value is the height of a vertical line. Pick two lines that, together with the x-axis, hold the most water, and return that amount. Please code it in Python, and convince me your approach cannot miss the best pair."

**What a strong answer should cover:**
- The area of a pair is min(height[i], height[j]) × (j − i); the brute force checks all pairs in O(n²).
- Two pointers from both ends, always moving the **shorter** wall: O(n) time, O(1) space.
- The elimination argument: every container that keeps the shorter wall is narrower and capped by that same wall, so discarding it is safe; moving the taller wall can never help.
- Equal walls (move either) and edge cases: fewer than two lines, zeros, best pair adjacent.
- Python specifics: \`min()\`/\`max()\` built-ins and tuple assignment keep it short; Python integers never overflow, so height × width is always exact.

**Clarifying questions expected:**
- "Do you want the area only or the two indices too?"
- "How large can heights and n get?" — decides whether the area needs a 64-bit type.

**Code / implementation expected:** Yes — a \`max_area(height)\` function in Python, ideally returning the pair of indices as well.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and loops; nothing else is assumed.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`python3\`.

## 1. Why This Even Matters — A Story First

Picture a row of fence posts of different heights. You may pick any two posts, stretch a waterproof sheet between them along the ground, and pour in water. The water level can only rise to the **shorter** of the two posts — any higher and it spills over. The amount of water is that level times the distance between the posts. Which two posts hold the most?

Trying every pair works, but with 100,000 posts that is about five billion pairs. The two-pointer insight cuts this to one pass: start with the two outermost posts (the widest possible container), and keep giving up the **shorter** post, because it is the one holding the level down. This question is a favourite because the code is ten lines, but the interviewer really wants to hear **why** it is safe to throw a post away — a short proof, not just a pattern.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want the maximum area only, or also which two lines form it? | Returning the indices needs two extra variables; the algorithm is the same. |
| Can heights be zero? Can there be fewer than two lines? | Zero heights give zero area; fewer than two lines means no container (return 0). |
| How large can heights and n be? | The area is height × width; large values can overflow a 32-bit integer. |
| Is this the same as trapping rain water? | No — that problem sums water over every bar. Here you pick one best pair. Saying this shows you know both. |

## 3. The Core Idea in Plain Language

**The problem:** given \`height[0..n-1]\`, choose indices i < j to maximise **min(height[i], height[j]) × (j − i)**.

📌 **Interview term: Area formula** — the water a pair holds is the shorter wall times the distance between them. The shorter wall is the *bottleneck*.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Bars of heights 1 8 6 2 5 4 8 3 7 with water between bar 1 and bar 8">
  <text class="d-text" x="320" y="26" text-anchor="middle">Best pair: index 1 and index 8, area 7 x 7 = 49</text>
  <rect class="d-box-accent" x="104" y="82" width="488" height="168" rx="2" fill-opacity="0.25"/>
  <rect class="d-box" x="40" y="226" width="40" height="24" rx="3"/>
  <text class="d-sub" x="60" y="278" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="104" y="58" width="40" height="192" rx="3"/>
  <text class="d-sub" x="124" y="278" text-anchor="middle">8</text>
  <rect class="d-box" x="168" y="106" width="40" height="144" rx="3"/>
  <text class="d-sub" x="188" y="278" text-anchor="middle">6</text>
  <rect class="d-box" x="232" y="202" width="40" height="48" rx="3"/>
  <text class="d-sub" x="252" y="278" text-anchor="middle">2</text>
  <rect class="d-box" x="296" y="130" width="40" height="120" rx="3"/>
  <text class="d-sub" x="316" y="278" text-anchor="middle">5</text>
  <rect class="d-box" x="360" y="154" width="40" height="96" rx="3"/>
  <text class="d-sub" x="380" y="278" text-anchor="middle">4</text>
  <rect class="d-box" x="424" y="58" width="40" height="192" rx="3"/>
  <text class="d-sub" x="444" y="278" text-anchor="middle">8</text>
  <rect class="d-box" x="488" y="178" width="40" height="72" rx="3"/>
  <text class="d-sub" x="508" y="278" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="552" y="82" width="40" height="168" rx="3"/>
  <text class="d-sub" x="572" y="278" text-anchor="middle">7</text>
</svg>

In the classic input the best pair is index 1 (height 8) and index 8 (height 7). The level is min(8, 7) = 7 and the width is 8 − 1 = 7, so the area is 49. Notice the tallest bar pair (8 and 8, indices 1 and 6) only gives 8 × 5 = 40: width matters as much as height.

📌 **Interview term: Two pointers (converging)** — one index at each end of the array, moving toward each other; at every step one of them moves inward, so the scan ends after n − 1 steps. See [the two-pointer technique](/interview-question/what-is-the-two-pointer-technique).

### The rule: always move the shorter wall

Start with \`left = 0\`, \`right = n − 1\` — the widest container. Compute its area. Then move the pointer at the **shorter** wall one step inward. Repeat until the pointers meet.

### Why is that safe? (the proof interviewers want)

Say \`height[left] < height[right]\`. Consider every container that keeps \`left\` and uses some wall \`k\` with left < k < right instead of \`right\`:

- its width \`k − left\` is **smaller** than \`right − left\`, and
- its level is \`min(height[left], height[k])\`, which is **at most** \`height[left]\` — the short wall still caps it.

So every one of those containers is no better than the one we just measured. Wall \`left\` has been fully used: no unseen pair containing it can win. Discarding it loses nothing. The same argument applies to \`right\` when it is the shorter one.

📌 **Interview term: Exchange / elimination argument** — proving a greedy move is safe by showing that every option it throws away is no better than one already considered.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="Moving the taller wall can only lose area, moving the shorter wall might gain">
  <rect class="d-box-muted" x="30" y="30" width="290" height="150" rx="12"/>
  <text class="d-text" x="175" y="64" text-anchor="middle">Move the TALLER wall</text>
  <text class="d-sub" x="175" y="96" text-anchor="middle">width shrinks by 1</text>
  <text class="d-sub" x="175" y="122" text-anchor="middle">level still capped by short wall</text>
  <text class="d-sub" x="175" y="148" text-anchor="middle">area can only fall</text>
  <rect class="d-box-accent" x="360" y="30" width="290" height="150" rx="12"/>
  <text class="d-text d-accent" x="505" y="64" text-anchor="middle">Move the SHORTER wall</text>
  <text class="d-sub" x="505" y="96" text-anchor="middle">width shrinks by 1</text>
  <text class="d-sub" x="505" y="122" text-anchor="middle">level may rise</text>
  <text class="d-sub" x="505" y="148" text-anchor="middle">the only move that can help</text>
</svg>

Moving the taller wall would be the mistake: the width shrinks and the short wall still caps the level, so nothing can improve. When the two walls are **equal**, moving either one is fine — any better container must drop both of them, because keeping either one caps the level at the same height with less width.

📌 **Interview term: Greedy choice** — committing to the locally best-looking move (drop the bottleneck) without backtracking, justified by the elimination argument above.

## 4. From Brute Force to Two Pointers

| Approach | Time | Space | Verdict |
| :--- | :--- | :--- | :--- |
| Check every pair i < j | O(n²) | O(1) | Correct; too slow for 10⁵ lines (about 5 × 10⁹ pairs) |
| **Two pointers, move the shorter wall** | **O(n)** | **O(1)** | The expected answer, backed by the elimination argument |

### The Python code

~~~python
def max_area(height):
    left, right = 0, len(height) - 1
    best, best_l, best_r = 0, -1, -1
    while left < right:
        h = min(height[left], height[right])     # the shorter wall sets the water level
        area = h * (right - left)
        if area > best:
            best, best_l, best_r = area, left, right
        if height[left] < height[right]:
            left += 1                            # move the shorter wall inward
        else:
            right -= 1
    return best, best_l, best_r
~~~

Things to point out while writing it:

- \`left, right = 0, len(height) - 1\` and \`best, best_l, best_r = area, left, right\` use **tuple assignment**: every right-hand value is evaluated before anything is assigned.
- \`min(height[left], height[right])\` is the built-in; no import needed.
- Python integers are arbitrary precision, so \`h * (right - left)\` cannot overflow no matter how large the input.
- With \`len(height) < 2\`, \`right\` is at most 0, so \`while left < right\` never runs and the function returns \`(0, -1, -1)\`.

## 5. Verified: Running the Code

Both programs are the runnable examples on this page; each was run with \`python3 main.py\`.

**Example 1 — the solution on seven inputs**, printing the area and the pair of indices:

~~~text
49 at (1, 8)
1 at (0, 1)
16 at (0, 4)
2 at (0, 2)
17 at (4, 5)
0 at (-1, -1)
0 at (-1, -1)
~~~

**Example 2 — a step-by-step trace, then two pointers vs brute force:**

~~~text
L=0 R=8 walls=1,7 area=8 best=8 move left
L=1 R=8 walls=8,7 area=49 best=49 move right
L=1 R=7 walls=8,3 area=18 best=49 move right
L=1 R=6 walls=8,8 area=40 best=49 move right
L=1 R=5 walls=8,4 area=16 best=49 move right
L=1 R=4 walls=8,5 area=15 best=49 move right
L=1 R=3 walls=8,2 area=4 best=49 move right
L=1 R=2 walls=8,6 area=6 best=49 move right
random tests: 500, mismatches: 0
n=1000 brute=9302580 in 499500 steps, two pointers=9302580 in 999 steps
~~~

The trace shows the rule in action. The first container (walls 1 and 7) has area 8; the left wall is shorter, so it moves. From then on the right wall is always the shorter (or equal) one, so \`right\` walks inward while \`best\` stays at 49. Across 500 random arrays the two-pointer answer matched brute force every time, and on 1,000 bars it took 999 steps against 499,500 pair checks.

## 6. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n) | Each step moves one pointer inward, so there are exactly n − 1 steps (999 for n = 1000 in the run) |
| Space | O(1) | O(1) — four integers, whatever the input size. |
| Brute force | O(n²) time | n(n − 1)/2 pairs: 499,500 for n = 1000 |

## Edge Cases to Mention

- **Two lines** (\`[1, 1]\`): one container, area 1 at (0, 1).
- **Fewer than two lines** (\`[7]\` or \`[]\`): the loop never runs, area 0; the examples return indices (-1, -1) for "no container".
- **All zeros** (\`[0, 0, 0]\`): area 0. Because the code only records strictly larger areas, no pair is recorded.
- **Equal tallest walls at both ends** (\`[4, 3, 2, 1, 4]\`): the outermost pair wins immediately, 4 × 4 = 16.
- **The best pair is adjacent** (\`[2, 3, 4, 5, 18, 17, 6]\`): 17 at (4, 5) — width 1, but the walls are so tall that nothing wider beats it.

## Common Pitfalls

- **Moving the taller wall, or both walls.** Either can skip the optimal pair; only the shorter wall is provably safe to discard.
- **Using \`max(height)\` thinking.** The tallest bars are not necessarily the answer: in the example the 8-and-8 pair gives 40, the 8-and-7 pair gives 49.
- **Confusing it with trapping rain water.** That problem sums water above every bar; this one picks one pair. Different answers on the same input.
- **Writing the nested-loop version with \`itertools.combinations\` and calling it done.** It is O(n²): 499,500 pair checks for 1,000 bars in the verified run, versus 999 steps.
- **Recording \`>=\` instead of \`>\`.** It still gives the right area, but the reported indices change to the last tie instead of the first; say which you return.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Two pointers at both ends; compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min(h[l], h[r]) * (r - l)</code>, then move the shorter wall inward; O(n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is safe:</strong> <span style="color:#f0e2c8;">With the short wall fixed, every narrower container is capped by the same short wall and has less width, so none can beat the one just measured.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What never works:</strong> <span style="color:#f0e2c8;">Moving the taller wall: width shrinks and the level cannot rise above the short wall.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python details:</strong> <span style="color:#f0e2c8;">Tuple assignment for the pointers and best pair; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min()</code> built-in; integers never overflow; no special case for fewer than two bars.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verified:</strong> <span style="color:#f0e2c8;">On 500 random arrays the two-pointer answer matched brute force every time; 999 steps vs 499,500 for n = 1000.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you do when both walls are equal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Move either one. Any better container must drop both, because keeping either caps the level at the same height with less width.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from trapping rain water?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Trapping rain water sums the water above every bar using left and right maxima; container picks the single best pair. See <a href="/interview-question/how-do-you-solve-the-trapping-rain-water-problem" style="color:#ffca28;text-decoration:underline;">trapping rain water</a>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you skip some steps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: after moving the short wall, keep moving while the new wall is not taller than the one you left; those walls cannot do better. It is still O(n) worst case.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare against the O(n²) brute force on hundreds of random arrays, as example 2 does (0 mismatches in 500 tests), plus the edge cases [7], [0, 0, 0] and [1, 1].</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Area formula** | Shorter wall × distance between the walls |
| **Two pointers (converging)** | One index at each end, moving inward |
| **Exchange / elimination argument** | Proof that every discarded option is no better than one already seen |
| **Greedy choice** | Committing to the locally best move without backtracking |

---
**Conclusion:** In Python, container with most water is a ten-line two-pointer loop: start at both ends, measure \`min(...) * width\`, and drop the shorter wall each time, for O(n) time and O(1) space. What makes the answer strong is the one-paragraph proof: the shorter wall caps every narrower container it could be part of, so it can be discarded. The same converging-pointer pattern drives [3Sum](/interview-question/how-do-you-solve-the-3sum-problem) and [valid palindrome](/interview-question/how-do-you-check-if-a-string-is-a-valid-palindrome), and the closely related [trapping rain water with two pointers](/interview-question/trapping-rain-water-with-two-pointers-why-does-leftmax-rightmax-work-in-o-1-spac) uses a similar "move the smaller side" argument.`,
        examples: [
          {
            label: `Two pointers on seven inputs, with the winning pair`,
            code: `def max_area(height):
    left, right = 0, len(height) - 1
    best, best_l, best_r = 0, -1, -1
    while left < right:
        h = min(height[left], height[right])     # the shorter wall sets the water level
        area = h * (right - left)
        if area > best:
            best, best_l, best_r = area, left, right
        if height[left] < height[right]:
            left += 1                            # move the shorter wall inward
        else:
            right -= 1
    return best, best_l, best_r


def fmt(result):
    area, l, r = result
    return str(area) + " at (" + str(l) + ", " + str(r) + ")"


print(fmt(max_area([1, 8, 6, 2, 5, 4, 8, 3, 7])))  # 49 at (1, 8)
print(fmt(max_area([1, 1])))  # 1 at (0, 1)
print(fmt(max_area([4, 3, 2, 1, 4])))  # 16 at (0, 4)
print(fmt(max_area([1, 2, 1])))  # 2 at (0, 2)
print(fmt(max_area([2, 3, 4, 5, 18, 17, 6])))  # 17 at (4, 5)
print(fmt(max_area([0, 0, 0])))  # 0 at (-1, -1)
print(fmt(max_area([7])))  # 0 at (-1, -1)`,
          },
          {
            label: `Trace, then two pointers vs brute force on random arrays`,
            code: `# 1) Trace the two pointers on the classic input.
# 2) Check them against brute force on many generated inputs, counting the work.
def trace(height):
    left, right, best = 0, len(height) - 1, 0
    while left < right:
        area = min(height[left], height[right]) * (right - left)
        best = max(best, area)
        move = "left" if height[left] < height[right] else "right"
        print("L=" + str(left) + " R=" + str(right) + " walls=" + str(height[left]) + "," + str(height[right])
              + " area=" + str(area) + " best=" + str(best) + " move " + move)
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1


def two_pointers(height):
    left, right, best, steps = 0, len(height) - 1, 0, 0
    while left < right:
        steps += 1
        best = max(best, min(height[left], height[right]) * (right - left))
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return best, steps


def brute_force(height):
    best, steps = 0, 0
    for i in range(len(height)):
        for j in range(i + 1, len(height)):
            steps += 1
            best = max(best, min(height[i], height[j]) * (j - i))
    return best, steps


seed = 7
def next_rand():
    global seed
    seed = seed * 48271 % 2147483647
    return seed


trace([1, 8, 6, 2, 5, 4, 8, 3, 7])
mismatches = 0
for _ in range(500):
    n = next_rand() % 60 + 2
    h = [next_rand() % 100 for _ in range(n)]
    if two_pointers(h)[0] != brute_force(h)[0]:
        mismatches += 1
print("random tests: 500, mismatches: " + str(mismatches))
h = [next_rand() % 10000 for _ in range(1000)]
a, s1 = brute_force(h)
b, s2 = two_pointers(h)
print("n=1000 brute=" + str(a) + " in " + str(s1) + " steps, two pointers=" + str(b) + " in " + str(s2) + " steps")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You get an array where each value is the height of a vertical line. Pick two lines that, together with the x-axis, hold the most water, and return that amount. Please code it in JavaScript, and convince me your approach cannot miss the best pair."

**What a strong answer should cover:**
- The area of a pair is min(height[i], height[j]) × (j − i); the brute force checks all pairs in O(n²).
- Two pointers from both ends, always moving the **shorter** wall: O(n) time, O(1) space.
- The elimination argument: every container that keeps the shorter wall is narrower and capped by that same wall, so discarding it is safe; moving the taller wall can never help.
- Equal walls (move either) and edge cases: fewer than two lines, zeros, best pair adjacent.
- JavaScript specifics: \`Math.min\`/\`Math.max\`, returning a small array or object for the index pair, and Numbers being exact integers up to 2^53, so height × width cannot lose precision at realistic sizes.

**Clarifying questions expected:**
- "Do you want the area only or the two indices too?"
- "How large can heights and n get?" — decides whether the area needs a 64-bit type.

**Code / implementation expected:** Yes — a \`maxArea(height)\` function in JavaScript, ideally also returning the two indices.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and loops; nothing else is assumed.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`node\` (the examples are plain browser-safe scripts).

## 1. Why This Even Matters — A Story First

Picture a row of fence posts of different heights. You may pick any two posts, stretch a waterproof sheet between them along the ground, and pour in water. The water level can only rise to the **shorter** of the two posts — any higher and it spills over. The amount of water is that level times the distance between the posts. Which two posts hold the most?

Trying every pair works, but with 100,000 posts that is about five billion pairs. The two-pointer insight cuts this to one pass: start with the two outermost posts (the widest possible container), and keep giving up the **shorter** post, because it is the one holding the level down. This question is a favourite because the code is ten lines, but the interviewer really wants to hear **why** it is safe to throw a post away — a short proof, not just a pattern.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want the maximum area only, or also which two lines form it? | Returning the indices needs two extra variables; the algorithm is the same. |
| Can heights be zero? Can there be fewer than two lines? | Zero heights give zero area; fewer than two lines means no container (return 0). |
| How large can heights and n be? | The area is height × width; large values can overflow a 32-bit integer. |
| Is this the same as trapping rain water? | No — that problem sums water over every bar. Here you pick one best pair. Saying this shows you know both. |

## 3. The Core Idea in Plain Language

**The problem:** given \`height[0..n-1]\`, choose indices i < j to maximise **min(height[i], height[j]) × (j − i)**.

📌 **Interview term: Area formula** — the water a pair holds is the shorter wall times the distance between them. The shorter wall is the *bottleneck*.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Bars of heights 1 8 6 2 5 4 8 3 7 with water between bar 1 and bar 8">
  <text class="d-text" x="320" y="26" text-anchor="middle">Best pair: index 1 and index 8, area 7 x 7 = 49</text>
  <rect class="d-box-accent" x="104" y="82" width="488" height="168" rx="2" fill-opacity="0.25"/>
  <rect class="d-box" x="40" y="226" width="40" height="24" rx="3"/>
  <text class="d-sub" x="60" y="278" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="104" y="58" width="40" height="192" rx="3"/>
  <text class="d-sub" x="124" y="278" text-anchor="middle">8</text>
  <rect class="d-box" x="168" y="106" width="40" height="144" rx="3"/>
  <text class="d-sub" x="188" y="278" text-anchor="middle">6</text>
  <rect class="d-box" x="232" y="202" width="40" height="48" rx="3"/>
  <text class="d-sub" x="252" y="278" text-anchor="middle">2</text>
  <rect class="d-box" x="296" y="130" width="40" height="120" rx="3"/>
  <text class="d-sub" x="316" y="278" text-anchor="middle">5</text>
  <rect class="d-box" x="360" y="154" width="40" height="96" rx="3"/>
  <text class="d-sub" x="380" y="278" text-anchor="middle">4</text>
  <rect class="d-box" x="424" y="58" width="40" height="192" rx="3"/>
  <text class="d-sub" x="444" y="278" text-anchor="middle">8</text>
  <rect class="d-box" x="488" y="178" width="40" height="72" rx="3"/>
  <text class="d-sub" x="508" y="278" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="552" y="82" width="40" height="168" rx="3"/>
  <text class="d-sub" x="572" y="278" text-anchor="middle">7</text>
</svg>

In the classic input the best pair is index 1 (height 8) and index 8 (height 7). The level is min(8, 7) = 7 and the width is 8 − 1 = 7, so the area is 49. Notice the tallest bar pair (8 and 8, indices 1 and 6) only gives 8 × 5 = 40: width matters as much as height.

📌 **Interview term: Two pointers (converging)** — one index at each end of the array, moving toward each other; at every step one of them moves inward, so the scan ends after n − 1 steps. See [the two-pointer technique](/interview-question/what-is-the-two-pointer-technique).

### The rule: always move the shorter wall

Start with \`left = 0\`, \`right = n − 1\` — the widest container. Compute its area. Then move the pointer at the **shorter** wall one step inward. Repeat until the pointers meet.

### Why is that safe? (the proof interviewers want)

Say \`height[left] < height[right]\`. Consider every container that keeps \`left\` and uses some wall \`k\` with left < k < right instead of \`right\`:

- its width \`k − left\` is **smaller** than \`right − left\`, and
- its level is \`min(height[left], height[k])\`, which is **at most** \`height[left]\` — the short wall still caps it.

So every one of those containers is no better than the one we just measured. Wall \`left\` has been fully used: no unseen pair containing it can win. Discarding it loses nothing. The same argument applies to \`right\` when it is the shorter one.

📌 **Interview term: Exchange / elimination argument** — proving a greedy move is safe by showing that every option it throws away is no better than one already considered.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="Moving the taller wall can only lose area, moving the shorter wall might gain">
  <rect class="d-box-muted" x="30" y="30" width="290" height="150" rx="12"/>
  <text class="d-text" x="175" y="64" text-anchor="middle">Move the TALLER wall</text>
  <text class="d-sub" x="175" y="96" text-anchor="middle">width shrinks by 1</text>
  <text class="d-sub" x="175" y="122" text-anchor="middle">level still capped by short wall</text>
  <text class="d-sub" x="175" y="148" text-anchor="middle">area can only fall</text>
  <rect class="d-box-accent" x="360" y="30" width="290" height="150" rx="12"/>
  <text class="d-text d-accent" x="505" y="64" text-anchor="middle">Move the SHORTER wall</text>
  <text class="d-sub" x="505" y="96" text-anchor="middle">width shrinks by 1</text>
  <text class="d-sub" x="505" y="122" text-anchor="middle">level may rise</text>
  <text class="d-sub" x="505" y="148" text-anchor="middle">the only move that can help</text>
</svg>

Moving the taller wall would be the mistake: the width shrinks and the short wall still caps the level, so nothing can improve. When the two walls are **equal**, moving either one is fine — any better container must drop both of them, because keeping either one caps the level at the same height with less width.

📌 **Interview term: Greedy choice** — committing to the locally best-looking move (drop the bottleneck) without backtracking, justified by the elimination argument above.

## 4. From Brute Force to Two Pointers

| Approach | Time | Space | Verdict |
| :--- | :--- | :--- | :--- |
| Check every pair i < j | O(n²) | O(1) | Correct; too slow for 10⁵ lines (about 5 × 10⁹ pairs) |
| **Two pointers, move the shorter wall** | **O(n)** | **O(1)** | The expected answer, backed by the elimination argument |

### The JavaScript code

~~~javascript
function maxArea(height) {
  let left = 0, right = height.length - 1;
  let best = 0, bestL = -1, bestR = -1;
  while (left < right) {
    const h = Math.min(height[left], height[right]); // the shorter wall sets the level
    const area = h * (right - left);
    if (area > best) {
      best = area; bestL = left; bestR = right;
    }
    if (height[left] < height[right]) left++;        // move the shorter wall inward
    else right--;
  }
  return [best, bestL, bestR];
}
~~~

Things to point out while writing it:

- \`Math.min(height[left], height[right])\` is the level; \`Math.min\` with no arguments returns \`Infinity\`, so always pass both values.
- The function returns \`[best, bestL, bestR]\`; destructuring (\`const [area, l, r] = maxArea(h)\`) reads it nicely.
- Numbers are 64-bit floats but exact for integers up to \`Number.MAX_SAFE_INTEGER\`, so \`h * (right - left)\` is exact for any realistic input.
- For \`height.length < 2\`, \`right\` starts at 0 or −1 and the loop never runs.

## 5. Verified: Running the Code

Both programs are the runnable examples on this page; each was run with \`node main.js\`.

**Example 1 — the solution on seven inputs**, printing the area and the pair of indices:

~~~text
49 at (1, 8)
1 at (0, 1)
16 at (0, 4)
2 at (0, 2)
17 at (4, 5)
0 at (-1, -1)
0 at (-1, -1)
~~~

**Example 2 — a step-by-step trace, then two pointers vs brute force:**

~~~text
L=0 R=8 walls=1,7 area=8 best=8 move left
L=1 R=8 walls=8,7 area=49 best=49 move right
L=1 R=7 walls=8,3 area=18 best=49 move right
L=1 R=6 walls=8,8 area=40 best=49 move right
L=1 R=5 walls=8,4 area=16 best=49 move right
L=1 R=4 walls=8,5 area=15 best=49 move right
L=1 R=3 walls=8,2 area=4 best=49 move right
L=1 R=2 walls=8,6 area=6 best=49 move right
random tests: 500, mismatches: 0
n=1000 brute=9302580 in 499500 steps, two pointers=9302580 in 999 steps
~~~

The trace shows the rule in action. The first container (walls 1 and 7) has area 8; the left wall is shorter, so it moves. From then on the right wall is always the shorter (or equal) one, so \`right\` walks inward while \`best\` stays at 49. Across 500 random arrays the two-pointer answer matched brute force every time, and on 1,000 bars it took 999 steps against 499,500 pair checks.

## 6. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n) | Each step moves one pointer inward, so there are exactly n − 1 steps (999 for n = 1000 in the run) |
| Space | O(1) | O(1) — a handful of numbers. |
| Brute force | O(n²) time | n(n − 1)/2 pairs: 499,500 for n = 1000 |

## Edge Cases to Mention

- **Two lines** (\`[1, 1]\`): one container, area 1 at (0, 1).
- **Fewer than two lines** (\`[7]\` or \`[]\`): the loop never runs, area 0; the examples return indices (-1, -1) for "no container".
- **All zeros** (\`[0, 0, 0]\`): area 0. Because the code only records strictly larger areas, no pair is recorded.
- **Equal tallest walls at both ends** (\`[4, 3, 2, 1, 4]\`): the outermost pair wins immediately, 4 × 4 = 16.
- **The best pair is adjacent** (\`[2, 3, 4, 5, 18, 17, 6]\`): 17 at (4, 5) — width 1, but the walls are so tall that nothing wider beats it.

## Common Pitfalls

- **Moving the taller wall, or both walls.** Either can skip the optimal pair; only the shorter wall is provably safe to discard.
- **Using \`height.indexOf(Math.max(...height))\`.** Picking the tallest bars is not the answer: 8-and-8 gives 40 while 8-and-7 gives 49 in the example. \`Math.max(...arr)\` also fails on very large arrays: in the lab (Node 22) spreading 1,000,000 elements threw \`RangeError: Maximum call stack size exceeded\`.
- **Confusing it with trapping rain water.** That sums water over every bar; this picks one pair.
- **Comparing \`left <= right\`.** When the pointers meet the width is 0; \`<\` is the correct condition.
- **Leaving the O(n²) version in.** It made 499,500 pair checks for 1,000 bars in the verified run, versus 999 steps.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Two pointers at both ends; compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min(h[l], h[r]) * (r - l)</code>, then move the shorter wall inward: O(n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is safe:</strong> <span style="color:#f0e2c8;">With the short wall fixed, every narrower container is capped by the same short wall and has less width, so none beats the one just measured.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What never works:</strong> <span style="color:#f0e2c8;">Moving the taller wall: width shrinks and the level cannot rise above the short wall.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. JavaScript details:</strong> <span style="color:#f0e2c8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[area, l, r]</code> and destructure it; Numbers are exact integers up to 2^53, so no overflow concern.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verified:</strong> <span style="color:#f0e2c8;">500 random arrays matched brute force with 0 mismatches; 999 steps vs 499,500 for n = 1000.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you do when both walls are equal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Move either one. Any better container must drop both, because keeping either caps the level at the same height with less width.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from trapping rain water?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Trapping rain water sums the water above every bar using left and right maxima; container picks one pair. See <a href="/interview-question/how-do-you-solve-the-trapping-rain-water-problem" style="color:#ffca28;text-decoration:underline;">trapping rain water</a>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you skip some steps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After moving the short wall, keep moving while the new wall is not taller than the one you left; those cannot do better. Still O(n) worst case.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare with the O(n²) brute force on random arrays, as example 2 does (0 mismatches in 500 tests), plus edge cases like [7], [0, 0, 0] and [1, 1].</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Area formula** | Shorter wall × distance between the walls |
| **Two pointers (converging)** | One index at each end, moving inward |
| **Exchange / elimination argument** | Proof that every discarded option is no better than one already seen |
| **Greedy choice** | Committing to the locally best move without backtracking |

---
**Conclusion:** In JavaScript, container with most water is a short two-pointer loop with \`Math.min\`: start at both ends, measure, and drop the shorter wall each time — O(n) time, O(1) space. What makes the answer strong is the one-paragraph proof: the shorter wall caps every narrower container it could be part of, so it can be discarded. The same converging-pointer pattern drives [3Sum](/interview-question/how-do-you-solve-the-3sum-problem) and [valid palindrome](/interview-question/how-do-you-check-if-a-string-is-a-valid-palindrome), and the closely related [trapping rain water with two pointers](/interview-question/trapping-rain-water-with-two-pointers-why-does-leftmax-rightmax-work-in-o-1-spac) uses a similar "move the smaller side" argument.`,
        examples: [
          {
            label: `Two pointers on seven inputs, with the winning pair`,
            code: `function maxArea(height) {
  let left = 0, right = height.length - 1;
  let best = 0, bestL = -1, bestR = -1;
  while (left < right) {
    const h = Math.min(height[left], height[right]); // the shorter wall sets the level
    const area = h * (right - left);
    if (area > best) {
      best = area; bestL = left; bestR = right;
    }
    if (height[left] < height[right]) left++;        // move the shorter wall inward
    else right--;
  }
  return [best, bestL, bestR];
}

function fmt(r) {
  return r[0] + ' at (' + r[1] + ', ' + r[2] + ')';
}

console.log(fmt(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7]))); // 49 at (1, 8)
console.log(fmt(maxArea([1, 1]))); // 1 at (0, 1)
console.log(fmt(maxArea([4, 3, 2, 1, 4]))); // 16 at (0, 4)
console.log(fmt(maxArea([1, 2, 1]))); // 2 at (0, 2)
console.log(fmt(maxArea([2, 3, 4, 5, 18, 17, 6]))); // 17 at (4, 5)
console.log(fmt(maxArea([0, 0, 0]))); // 0 at (-1, -1)
console.log(fmt(maxArea([7]))); // 0 at (-1, -1)`,
          },
          {
            label: `Trace, then two pointers vs brute force on random arrays`,
            code: `// 1) Trace the two pointers on the classic input.
// 2) Check them against brute force on many generated inputs, counting the work.
function trace(height) {
  let left = 0, right = height.length - 1, best = 0;
  while (left < right) {
    const area = Math.min(height[left], height[right]) * (right - left);
    best = Math.max(best, area);
    const move = height[left] < height[right] ? 'left' : 'right';
    console.log('L=' + left + ' R=' + right + ' walls=' + height[left] + ',' + height[right] +
      ' area=' + area + ' best=' + best + ' move ' + move);
    if (height[left] < height[right]) left++;
    else right--;
  }
}

function twoPointers(height) {
  let left = 0, right = height.length - 1, best = 0, steps = 0;
  while (left < right) {
    steps++;
    best = Math.max(best, Math.min(height[left], height[right]) * (right - left));
    if (height[left] < height[right]) left++;
    else right--;
  }
  return [best, steps];
}

function bruteForce(height) {
  let best = 0, steps = 0;
  for (let i = 0; i < height.length; i++)
    for (let j = i + 1; j < height.length; j++) {
      steps++;
      best = Math.max(best, Math.min(height[i], height[j]) * (j - i));
    }
  return [best, steps];
}

let seed = 7;
function nextRand() {
  seed = (seed * 48271) % 2147483647; // exact: the product stays below 2^53
  return seed;
}

trace([1, 8, 6, 2, 5, 4, 8, 3, 7]);
let mismatches = 0;
for (let t = 0; t < 500; t++) {
  const n = nextRand() % 60 + 2;
  const h = [];
  for (let i = 0; i < n; i++) h.push(nextRand() % 100);
  if (twoPointers(h)[0] !== bruteForce(h)[0]) mismatches++;
}
console.log('random tests: 500, mismatches: ' + mismatches);
const big = [];
for (let i = 0; i < 1000; i++) big.push(nextRand() % 10000);
const a = bruteForce(big), b = twoPointers(big);
console.log('n=1000 brute=' + a[0] + ' in ' + a[1] + ' steps, two pointers=' + b[0] + ' in ' + b[1] + ' steps');`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You get an array where each value is the height of a vertical line. Pick two lines that, together with the x-axis, hold the most water, and return that amount. Please code it in Java, and convince me your approach cannot miss the best pair."

**What a strong answer should cover:**
- The area of a pair is min(height[i], height[j]) × (j − i); the brute force checks all pairs in O(n²).
- Two pointers from both ends, always moving the **shorter** wall: O(n) time, O(1) space.
- The elimination argument: every container that keeps the shorter wall is narrower and capped by that same wall, so discarding it is safe; moving the taller wall can never help.
- Equal walls (move either) and edge cases: fewer than two lines, zeros, best pair adjacent.
- Java specifics: work on the primitive \`int[]\`, use \`Math.min\`/\`Math.max\`, and know when \`int\` area overflows (height × width at or above 2^31) and a \`long\` is needed.

**Clarifying questions expected:**
- "Do you want the area only or the two indices too?"
- "How large can heights and n get?" — decides whether the area needs a 64-bit type.

**Code / implementation expected:** Yes — a \`static int maxArea(int[] height)\` method in Java (the example returns the indices too).`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and loops; nothing else is assumed.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`javac\` and \`java\`.

## 1. Why This Even Matters — A Story First

Picture a row of fence posts of different heights. You may pick any two posts, stretch a waterproof sheet between them along the ground, and pour in water. The water level can only rise to the **shorter** of the two posts — any higher and it spills over. The amount of water is that level times the distance between the posts. Which two posts hold the most?

Trying every pair works, but with 100,000 posts that is about five billion pairs. The two-pointer insight cuts this to one pass: start with the two outermost posts (the widest possible container), and keep giving up the **shorter** post, because it is the one holding the level down. This question is a favourite because the code is ten lines, but the interviewer really wants to hear **why** it is safe to throw a post away — a short proof, not just a pattern.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want the maximum area only, or also which two lines form it? | Returning the indices needs two extra variables; the algorithm is the same. |
| Can heights be zero? Can there be fewer than two lines? | Zero heights give zero area; fewer than two lines means no container (return 0). |
| How large can heights and n be? | The area is height × width; large values can overflow a 32-bit integer. |
| Is this the same as trapping rain water? | No — that problem sums water over every bar. Here you pick one best pair. Saying this shows you know both. |

## 3. The Core Idea in Plain Language

**The problem:** given \`height[0..n-1]\`, choose indices i < j to maximise **min(height[i], height[j]) × (j − i)**.

📌 **Interview term: Area formula** — the water a pair holds is the shorter wall times the distance between them. The shorter wall is the *bottleneck*.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Bars of heights 1 8 6 2 5 4 8 3 7 with water between bar 1 and bar 8">
  <text class="d-text" x="320" y="26" text-anchor="middle">Best pair: index 1 and index 8, area 7 x 7 = 49</text>
  <rect class="d-box-accent" x="104" y="82" width="488" height="168" rx="2" fill-opacity="0.25"/>
  <rect class="d-box" x="40" y="226" width="40" height="24" rx="3"/>
  <text class="d-sub" x="60" y="278" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="104" y="58" width="40" height="192" rx="3"/>
  <text class="d-sub" x="124" y="278" text-anchor="middle">8</text>
  <rect class="d-box" x="168" y="106" width="40" height="144" rx="3"/>
  <text class="d-sub" x="188" y="278" text-anchor="middle">6</text>
  <rect class="d-box" x="232" y="202" width="40" height="48" rx="3"/>
  <text class="d-sub" x="252" y="278" text-anchor="middle">2</text>
  <rect class="d-box" x="296" y="130" width="40" height="120" rx="3"/>
  <text class="d-sub" x="316" y="278" text-anchor="middle">5</text>
  <rect class="d-box" x="360" y="154" width="40" height="96" rx="3"/>
  <text class="d-sub" x="380" y="278" text-anchor="middle">4</text>
  <rect class="d-box" x="424" y="58" width="40" height="192" rx="3"/>
  <text class="d-sub" x="444" y="278" text-anchor="middle">8</text>
  <rect class="d-box" x="488" y="178" width="40" height="72" rx="3"/>
  <text class="d-sub" x="508" y="278" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="552" y="82" width="40" height="168" rx="3"/>
  <text class="d-sub" x="572" y="278" text-anchor="middle">7</text>
</svg>

In the classic input the best pair is index 1 (height 8) and index 8 (height 7). The level is min(8, 7) = 7 and the width is 8 − 1 = 7, so the area is 49. Notice the tallest bar pair (8 and 8, indices 1 and 6) only gives 8 × 5 = 40: width matters as much as height.

📌 **Interview term: Two pointers (converging)** — one index at each end of the array, moving toward each other; at every step one of them moves inward, so the scan ends after n − 1 steps. See [the two-pointer technique](/interview-question/what-is-the-two-pointer-technique).

### The rule: always move the shorter wall

Start with \`left = 0\`, \`right = n − 1\` — the widest container. Compute its area. Then move the pointer at the **shorter** wall one step inward. Repeat until the pointers meet.

### Why is that safe? (the proof interviewers want)

Say \`height[left] < height[right]\`. Consider every container that keeps \`left\` and uses some wall \`k\` with left < k < right instead of \`right\`:

- its width \`k − left\` is **smaller** than \`right − left\`, and
- its level is \`min(height[left], height[k])\`, which is **at most** \`height[left]\` — the short wall still caps it.

So every one of those containers is no better than the one we just measured. Wall \`left\` has been fully used: no unseen pair containing it can win. Discarding it loses nothing. The same argument applies to \`right\` when it is the shorter one.

📌 **Interview term: Exchange / elimination argument** — proving a greedy move is safe by showing that every option it throws away is no better than one already considered.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="Moving the taller wall can only lose area, moving the shorter wall might gain">
  <rect class="d-box-muted" x="30" y="30" width="290" height="150" rx="12"/>
  <text class="d-text" x="175" y="64" text-anchor="middle">Move the TALLER wall</text>
  <text class="d-sub" x="175" y="96" text-anchor="middle">width shrinks by 1</text>
  <text class="d-sub" x="175" y="122" text-anchor="middle">level still capped by short wall</text>
  <text class="d-sub" x="175" y="148" text-anchor="middle">area can only fall</text>
  <rect class="d-box-accent" x="360" y="30" width="290" height="150" rx="12"/>
  <text class="d-text d-accent" x="505" y="64" text-anchor="middle">Move the SHORTER wall</text>
  <text class="d-sub" x="505" y="96" text-anchor="middle">width shrinks by 1</text>
  <text class="d-sub" x="505" y="122" text-anchor="middle">level may rise</text>
  <text class="d-sub" x="505" y="148" text-anchor="middle">the only move that can help</text>
</svg>

Moving the taller wall would be the mistake: the width shrinks and the short wall still caps the level, so nothing can improve. When the two walls are **equal**, moving either one is fine — any better container must drop both of them, because keeping either one caps the level at the same height with less width.

📌 **Interview term: Greedy choice** — committing to the locally best-looking move (drop the bottleneck) without backtracking, justified by the elimination argument above.

## 4. From Brute Force to Two Pointers

| Approach | Time | Space | Verdict |
| :--- | :--- | :--- | :--- |
| Check every pair i < j | O(n²) | O(1) | Correct; too slow for 10⁵ lines (about 5 × 10⁹ pairs) |
| **Two pointers, move the shorter wall** | **O(n)** | **O(1)** | The expected answer, backed by the elimination argument |

### The Java code

~~~java
// Returns {area, left index, right index}
static int[] maxArea(int[] height) {
    int left = 0, right = height.length - 1;
    int best = 0, bestL = -1, bestR = -1;
    while (left < right) {
        int h = Math.min(height[left], height[right]); // the shorter wall sets the level
        int area = h * (right - left);   // int is fine while height * width stays below 2^31
        if (area > best) {
            best = area; bestL = left; bestR = right;
        }
        if (height[left] < height[right]) left++;      // move the shorter wall inward
        else right--;
    }
    return new int[]{best, bestL, bestR};
}
~~~

Things to point out while writing it:

- The method returns an \`int[]{area, left, right}\`, a common lightweight way to return several values in Java without a class. A small \`record\` would be the tidier option.
- \`int area = h * (right - left)\` is safe while the product stays below 2³¹ − 1 = 2,147,483,647. If heights and n can both be large, compute \`(long) h * (right - left)\`; example 2 does that. In the lab \`46341 * 46341\` in \`int\` printed \`-2147479015\` — overflow wraps silently in Java, no exception.
- Primitive \`int[]\` keeps everything unboxed; there is no reason to use \`List<Integer>\` here.

## 5. Verified: Running the Code

Both programs are the runnable examples on this page; each was run with \`javac Main.java && java Main\`.

**Example 1 — the solution on seven inputs**, printing the area and the pair of indices:

~~~text
49 at (1, 8)
1 at (0, 1)
16 at (0, 4)
2 at (0, 2)
17 at (4, 5)
0 at (-1, -1)
0 at (-1, -1)
~~~

**Example 2 — a step-by-step trace, then two pointers vs brute force:**

~~~text
L=0 R=8 walls=1,7 area=8 best=8 move left
L=1 R=8 walls=8,7 area=49 best=49 move right
L=1 R=7 walls=8,3 area=18 best=49 move right
L=1 R=6 walls=8,8 area=40 best=49 move right
L=1 R=5 walls=8,4 area=16 best=49 move right
L=1 R=4 walls=8,5 area=15 best=49 move right
L=1 R=3 walls=8,2 area=4 best=49 move right
L=1 R=2 walls=8,6 area=6 best=49 move right
random tests: 500, mismatches: 0
n=1000 brute=9302580 in 499500 steps, two pointers=9302580 in 999 steps
~~~

The trace shows the rule in action. The first container (walls 1 and 7) has area 8; the left wall is shorter, so it moves. From then on the right wall is always the shorter (or equal) one, so \`right\` walks inward while \`best\` stays at 49. Across 500 random arrays the two-pointer answer matched brute force every time, and on 1,000 bars it took 999 steps against 499,500 pair checks.

## 6. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n) | Each step moves one pointer inward, so there are exactly n − 1 steps (999 for n = 1000 in the run) |
| Space | O(1) | O(1) — a few \`int\` locals. |
| Brute force | O(n²) time | n(n − 1)/2 pairs: 499,500 for n = 1000 |

## Edge Cases to Mention

- **Two lines** (\`[1, 1]\`): one container, area 1 at (0, 1).
- **Fewer than two lines** (\`[7]\` or \`[]\`): the loop never runs, area 0; the examples return indices (-1, -1) for "no container".
- **All zeros** (\`[0, 0, 0]\`): area 0. Because the code only records strictly larger areas, no pair is recorded.
- **Equal tallest walls at both ends** (\`[4, 3, 2, 1, 4]\`): the outermost pair wins immediately, 4 × 4 = 16.
- **The best pair is adjacent** (\`[2, 3, 4, 5, 18, 17, 6]\`): 17 at (4, 5) — width 1, but the walls are so tall that nothing wider beats it.

## Common Pitfalls

- **Silent \`int\` overflow.** Java wraps on overflow without an error (46341 × 46341 gave -2147479015). Cast to \`long\` when height × width can pass 2³¹.
- **Moving the taller wall, or both walls.** Only the shorter wall is provably safe to discard.
- **Picking the tallest bars.** 8-and-8 gives 40 while 8-and-7 gives 49 in the example; width matters.
- **Confusing it with trapping rain water.** That sums water over every bar; this picks one pair.
- **Using \`List<Integer>\` and \`get(i)\` in the loop.** It works, but every read unboxes an \`Integer\`; keep \`int[]\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Two pointers at both ends; compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min(h[l], h[r]) * (r - l)</code>, then move the shorter wall inward: O(n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is safe:</strong> <span style="color:#f0e2c8;">With the short wall fixed, every narrower container is capped by the same short wall and has less width, so none beats the one just measured.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What never works:</strong> <span style="color:#f0e2c8;">Moving the taller wall: width shrinks and the level cannot rise above the short wall.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Java details:</strong> <span style="color:#f0e2c8;">Primitive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>; return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]{area, l, r}</code> or a record; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> if height × width can pass 2^31 because Java overflow wraps silently.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verified:</strong> <span style="color:#f0e2c8;">500 random arrays matched brute force with 0 mismatches; 999 steps vs 499,500 for n = 1000.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you do when both walls are equal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Move either one. Any better container must drop both, because keeping either caps the level at the same height with less width.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from trapping rain water?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Trapping rain water sums the water above every bar using left and right maxima; container picks one pair. See <a href="/interview-question/how-do-you-solve-the-trapping-rain-water-problem" style="color:#ffca28;text-decoration:underline;">trapping rain water</a>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you switch the area to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the maximum height times the maximum width can exceed 2,147,483,647. Compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(long) Math.min(a, b) * width</code> so the multiplication itself happens in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare with the O(n²) brute force on random arrays, as example 2 does (0 mismatches in 500 tests), plus edge cases like {7}, {0, 0, 0} and {1, 1}.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Area formula** | Shorter wall × distance between the walls |
| **Two pointers (converging)** | One index at each end, moving inward |
| **Exchange / elimination argument** | Proof that every discarded option is no better than one already seen |
| **Greedy choice** | Committing to the locally best move without backtracking |
| **Integer overflow** | A result too big for the type; Java \`int\` wraps around silently |

---
**Conclusion:** In Java, container with most water is a two-pointer loop over a primitive \`int[]\`: start at both ends, measure with \`Math.min\`, drop the shorter wall — O(n) time, O(1) space — with a \`long\` for the area when the input can be large. What makes the answer strong is the one-paragraph proof: the shorter wall caps every narrower container it could be part of, so it can be discarded. The same converging-pointer pattern drives [3Sum](/interview-question/how-do-you-solve-the-3sum-problem) and [valid palindrome](/interview-question/how-do-you-check-if-a-string-is-a-valid-palindrome), and the closely related [trapping rain water with two pointers](/interview-question/trapping-rain-water-with-two-pointers-why-does-leftmax-rightmax-work-in-o-1-spac) uses a similar "move the smaller side" argument.`,
        examples: [
          {
            label: `Two pointers on seven inputs, with the winning pair`,
            code: `public class Main {
    // Returns {area, left index, right index}
    static int[] maxArea(int[] height) {
        int left = 0, right = height.length - 1;
        int best = 0, bestL = -1, bestR = -1;
        while (left < right) {
            int h = Math.min(height[left], height[right]); // the shorter wall sets the level
            int area = h * (right - left);   // int is fine while height * width stays below 2^31
            if (area > best) {
                best = area; bestL = left; bestR = right;
            }
            if (height[left] < height[right]) left++;      // move the shorter wall inward
            else right--;
        }
        return new int[]{best, bestL, bestR};
    }

    static String fmt(int[] r) {
        return r[0] + " at (" + r[1] + ", " + r[2] + ")";
    }

    public static void main(String[] args) {
        System.out.println(fmt(maxArea(new int[]{1, 8, 6, 2, 5, 4, 8, 3, 7}))); // 49 at (1, 8)
        System.out.println(fmt(maxArea(new int[]{1, 1})));                      // 1 at (0, 1)
        System.out.println(fmt(maxArea(new int[]{4, 3, 2, 1, 4})));             // 16 at (0, 4)
        System.out.println(fmt(maxArea(new int[]{1, 2, 1})));                   // 2 at (0, 2)
        System.out.println(fmt(maxArea(new int[]{2, 3, 4, 5, 18, 17, 6})));    // 17 at (4, 5)
        System.out.println(fmt(maxArea(new int[]{0, 0, 0})));                   // 0 at (-1, -1)
        System.out.println(fmt(maxArea(new int[]{7})));                         // 0 at (-1, -1)
    }
}`,
          },
          {
            label: `Trace, then two pointers vs brute force on random arrays`,
            code: `// 1) Trace the two pointers on the classic input.
// 2) Check them against brute force on many generated inputs, counting the work.
public class Main {
    static void trace(int[] height) {
        int left = 0, right = height.length - 1, best = 0;
        while (left < right) {
            int area = Math.min(height[left], height[right]) * (right - left);
            best = Math.max(best, area);
            String move = height[left] < height[right] ? "left" : "right";
            System.out.println("L=" + left + " R=" + right + " walls=" + height[left] + "," + height[right]
                + " area=" + area + " best=" + best + " move " + move);
            if (height[left] < height[right]) left++;
            else right--;
        }
    }

    static long[] twoPointers(int[] height) {
        int left = 0, right = height.length - 1;
        long best = 0, steps = 0;
        while (left < right) {
            steps++;
            best = Math.max(best, (long) Math.min(height[left], height[right]) * (right - left));
            if (height[left] < height[right]) left++;
            else right--;
        }
        return new long[]{best, steps};
    }

    static long[] bruteForce(int[] height) {
        long best = 0, steps = 0;
        for (int i = 0; i < height.length; i++)
            for (int j = i + 1; j < height.length; j++) {
                steps++;
                best = Math.max(best, (long) Math.min(height[i], height[j]) * (j - i));
            }
        return new long[]{best, steps};
    }

    static long seed = 7;
    static int nextRand() {
        seed = seed * 48271L % 2147483647L;
        return (int) seed;
    }

    public static void main(String[] args) {
        trace(new int[]{1, 8, 6, 2, 5, 4, 8, 3, 7});
        int mismatches = 0;
        for (int t = 0; t < 500; t++) {
            int n = nextRand() % 60 + 2;
            int[] h = new int[n];
            for (int i = 0; i < n; i++) h[i] = nextRand() % 100;
            if (twoPointers(h)[0] != bruteForce(h)[0]) mismatches++;
        }
        System.out.println("random tests: 500, mismatches: " + mismatches);
        int[] big = new int[1000];
        for (int i = 0; i < 1000; i++) big[i] = nextRand() % 10000;
        long[] a = bruteForce(big), b = twoPointers(big);
        System.out.println("n=1000 brute=" + a[0] + " in " + a[1] + " steps, two pointers=" + b[0] + " in " + b[1] + " steps");
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You get an array where each value is the height of a vertical line. Pick two lines that, together with the x-axis, hold the most water, and return that amount. Please code it in C++, and convince me your approach cannot miss the best pair."

**What a strong answer should cover:**
- The area of a pair is min(height[i], height[j]) × (j − i); the brute force checks all pairs in O(n²).
- Two pointers from both ends, always moving the **shorter** wall: O(n) time, O(1) space.
- The elimination argument: every container that keeps the shorter wall is narrower and capped by that same wall, so discarding it is safe; moving the taller wall can never help.
- Equal walls (move either) and edge cases: fewer than two lines, zeros, best pair adjacent.
- C++ specifics: take the \`vector<int>\` by \`const&\`, convert \`size()\` to \`int\` before subtracting 1 (unsigned wraparound on an empty vector), and use \`long long\` for the area because signed overflow is undefined behaviour.

**Clarifying questions expected:**
- "Do you want the area only or the two indices too?"
- "How large can heights and n get?" — decides whether the area needs a 64-bit type.

**Code / implementation expected:** Yes — a \`maxArea(const vector<int>& height)\` function in C++17 (the example returns the indices too).`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and loops; nothing else is assumed.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`g++ -std=c++17\`.

## 1. Why This Even Matters — A Story First

Picture a row of fence posts of different heights. You may pick any two posts, stretch a waterproof sheet between them along the ground, and pour in water. The water level can only rise to the **shorter** of the two posts — any higher and it spills over. The amount of water is that level times the distance between the posts. Which two posts hold the most?

Trying every pair works, but with 100,000 posts that is about five billion pairs. The two-pointer insight cuts this to one pass: start with the two outermost posts (the widest possible container), and keep giving up the **shorter** post, because it is the one holding the level down. This question is a favourite because the code is ten lines, but the interviewer really wants to hear **why** it is safe to throw a post away — a short proof, not just a pattern.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want the maximum area only, or also which two lines form it? | Returning the indices needs two extra variables; the algorithm is the same. |
| Can heights be zero? Can there be fewer than two lines? | Zero heights give zero area; fewer than two lines means no container (return 0). |
| How large can heights and n be? | The area is height × width; large values can overflow a 32-bit integer. |
| Is this the same as trapping rain water? | No — that problem sums water over every bar. Here you pick one best pair. Saying this shows you know both. |

## 3. The Core Idea in Plain Language

**The problem:** given \`height[0..n-1]\`, choose indices i < j to maximise **min(height[i], height[j]) × (j − i)**.

📌 **Interview term: Area formula** — the water a pair holds is the shorter wall times the distance between them. The shorter wall is the *bottleneck*.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Bars of heights 1 8 6 2 5 4 8 3 7 with water between bar 1 and bar 8">
  <text class="d-text" x="320" y="26" text-anchor="middle">Best pair: index 1 and index 8, area 7 x 7 = 49</text>
  <rect class="d-box-accent" x="104" y="82" width="488" height="168" rx="2" fill-opacity="0.25"/>
  <rect class="d-box" x="40" y="226" width="40" height="24" rx="3"/>
  <text class="d-sub" x="60" y="278" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="104" y="58" width="40" height="192" rx="3"/>
  <text class="d-sub" x="124" y="278" text-anchor="middle">8</text>
  <rect class="d-box" x="168" y="106" width="40" height="144" rx="3"/>
  <text class="d-sub" x="188" y="278" text-anchor="middle">6</text>
  <rect class="d-box" x="232" y="202" width="40" height="48" rx="3"/>
  <text class="d-sub" x="252" y="278" text-anchor="middle">2</text>
  <rect class="d-box" x="296" y="130" width="40" height="120" rx="3"/>
  <text class="d-sub" x="316" y="278" text-anchor="middle">5</text>
  <rect class="d-box" x="360" y="154" width="40" height="96" rx="3"/>
  <text class="d-sub" x="380" y="278" text-anchor="middle">4</text>
  <rect class="d-box" x="424" y="58" width="40" height="192" rx="3"/>
  <text class="d-sub" x="444" y="278" text-anchor="middle">8</text>
  <rect class="d-box" x="488" y="178" width="40" height="72" rx="3"/>
  <text class="d-sub" x="508" y="278" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="552" y="82" width="40" height="168" rx="3"/>
  <text class="d-sub" x="572" y="278" text-anchor="middle">7</text>
</svg>

In the classic input the best pair is index 1 (height 8) and index 8 (height 7). The level is min(8, 7) = 7 and the width is 8 − 1 = 7, so the area is 49. Notice the tallest bar pair (8 and 8, indices 1 and 6) only gives 8 × 5 = 40: width matters as much as height.

📌 **Interview term: Two pointers (converging)** — one index at each end of the array, moving toward each other; at every step one of them moves inward, so the scan ends after n − 1 steps. See [the two-pointer technique](/interview-question/what-is-the-two-pointer-technique).

### The rule: always move the shorter wall

Start with \`left = 0\`, \`right = n − 1\` — the widest container. Compute its area. Then move the pointer at the **shorter** wall one step inward. Repeat until the pointers meet.

### Why is that safe? (the proof interviewers want)

Say \`height[left] < height[right]\`. Consider every container that keeps \`left\` and uses some wall \`k\` with left < k < right instead of \`right\`:

- its width \`k − left\` is **smaller** than \`right − left\`, and
- its level is \`min(height[left], height[k])\`, which is **at most** \`height[left]\` — the short wall still caps it.

So every one of those containers is no better than the one we just measured. Wall \`left\` has been fully used: no unseen pair containing it can win. Discarding it loses nothing. The same argument applies to \`right\` when it is the shorter one.

📌 **Interview term: Exchange / elimination argument** — proving a greedy move is safe by showing that every option it throws away is no better than one already considered.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="Moving the taller wall can only lose area, moving the shorter wall might gain">
  <rect class="d-box-muted" x="30" y="30" width="290" height="150" rx="12"/>
  <text class="d-text" x="175" y="64" text-anchor="middle">Move the TALLER wall</text>
  <text class="d-sub" x="175" y="96" text-anchor="middle">width shrinks by 1</text>
  <text class="d-sub" x="175" y="122" text-anchor="middle">level still capped by short wall</text>
  <text class="d-sub" x="175" y="148" text-anchor="middle">area can only fall</text>
  <rect class="d-box-accent" x="360" y="30" width="290" height="150" rx="12"/>
  <text class="d-text d-accent" x="505" y="64" text-anchor="middle">Move the SHORTER wall</text>
  <text class="d-sub" x="505" y="96" text-anchor="middle">width shrinks by 1</text>
  <text class="d-sub" x="505" y="122" text-anchor="middle">level may rise</text>
  <text class="d-sub" x="505" y="148" text-anchor="middle">the only move that can help</text>
</svg>

Moving the taller wall would be the mistake: the width shrinks and the short wall still caps the level, so nothing can improve. When the two walls are **equal**, moving either one is fine — any better container must drop both of them, because keeping either one caps the level at the same height with less width.

📌 **Interview term: Greedy choice** — committing to the locally best-looking move (drop the bottleneck) without backtracking, justified by the elimination argument above.

## 4. From Brute Force to Two Pointers

| Approach | Time | Space | Verdict |
| :--- | :--- | :--- | :--- |
| Check every pair i < j | O(n²) | O(1) | Correct; too slow for 10⁵ lines (about 5 × 10⁹ pairs) |
| **Two pointers, move the shorter wall** | **O(n)** | **O(1)** | The expected answer, backed by the elimination argument |

### The C++ code

~~~cpp
struct Result { long long area; int left, right; };

Result maxArea(const vector<int>& height) {
    int left = 0, right = static_cast<int>(height.size()) - 1; // int: size()-1 on an empty
    Result best{0, -1, -1};                                    // vector would wrap if unsigned
    while (left < right) {
        long long h = min(height[left], height[right]);        // the shorter wall sets the level
        long long area = h * (right - left);
        if (area > best.area) best = {area, left, right};
        if (height[left] < height[right]) left++;              // move the shorter wall inward
        else right--;
    }
    return best;
}
~~~

Things to point out while writing it:

- \`const vector<int>&\` avoids copying the input; this algorithm never modifies it.
- \`static_cast<int>(height.size()) - 1\` matters: \`size()\` is unsigned, so on an empty vector \`height.size() - 1\` would be a huge number rather than −1.
- The area is \`long long\`: multiplying two \`int\`s that overflow is **undefined behaviour** in C++, not a predictable wraparound. Making \`h\` a \`long long\` first means the multiplication happens in 64 bits.
- The small \`Result\` struct with brace initialisation (\`best = {area, left, right}\`) keeps the return value readable.

## 5. Verified: Running the Code

Both programs are the runnable examples on this page; each was run with \`g++ -std=c++17 main.cpp && ./a.out\`.

**Example 1 — the solution on seven inputs**, printing the area and the pair of indices:

~~~text
49 at (1, 8)
1 at (0, 1)
16 at (0, 4)
2 at (0, 2)
17 at (4, 5)
0 at (-1, -1)
0 at (-1, -1)
~~~

**Example 2 — a step-by-step trace, then two pointers vs brute force:**

~~~text
L=0 R=8 walls=1,7 area=8 best=8 move left
L=1 R=8 walls=8,7 area=49 best=49 move right
L=1 R=7 walls=8,3 area=18 best=49 move right
L=1 R=6 walls=8,8 area=40 best=49 move right
L=1 R=5 walls=8,4 area=16 best=49 move right
L=1 R=4 walls=8,5 area=15 best=49 move right
L=1 R=3 walls=8,2 area=4 best=49 move right
L=1 R=2 walls=8,6 area=6 best=49 move right
random tests: 500, mismatches: 0
n=1000 brute=9302580 in 499500 steps, two pointers=9302580 in 999 steps
~~~

The trace shows the rule in action. The first container (walls 1 and 7) has area 8; the left wall is shorter, so it moves. From then on the right wall is always the shorter (or equal) one, so \`right\` walks inward while \`best\` stays at 49. Across 500 random arrays the two-pointer answer matched brute force every time, and on 1,000 bars it took 999 steps against 499,500 pair checks.

## 6. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n) | Each step moves one pointer inward, so there are exactly n − 1 steps (999 for n = 1000 in the run) |
| Space | O(1) | O(1) — a few integers and a small struct. |
| Brute force | O(n²) time | n(n − 1)/2 pairs: 499,500 for n = 1000 |

## Edge Cases to Mention

- **Two lines** (\`[1, 1]\`): one container, area 1 at (0, 1).
- **Fewer than two lines** (\`[7]\` or \`[]\`): the loop never runs, area 0; the examples return indices (-1, -1) for "no container".
- **All zeros** (\`[0, 0, 0]\`): area 0. Because the code only records strictly larger areas, no pair is recorded.
- **Equal tallest walls at both ends** (\`[4, 3, 2, 1, 4]\`): the outermost pair wins immediately, 4 × 4 = 16.
- **The best pair is adjacent** (\`[2, 3, 4, 5, 18, 17, 6]\`): 17 at (4, 5) — width 1, but the walls are so tall that nothing wider beats it.

## Common Pitfalls

- **Signed overflow.** \`int\` area can overflow for large inputs, and that is undefined behaviour; compute in \`long long\` (\`1LL * min(a, b) * width\`).
- **\`height.size() - 1\` on an empty vector.** It wraps to a huge unsigned value; cast to \`int\` first.
- **Moving the taller wall, or both walls.** Only the shorter wall is provably safe to discard.
- **Picking the tallest bars with \`max_element\`.** 8-and-8 gives 40 while 8-and-7 gives 49 in the example; width matters.
- **Passing the vector by value.** It copies n ints for nothing; use \`const&\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Two pointers at both ends; compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min(h[l], h[r]) * (r - l)</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>, then move the shorter wall inward: O(n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is safe:</strong> <span style="color:#f0e2c8;">With the short wall fixed, every narrower container is capped by the same short wall and has less width, so none beats the one just measured.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What never works:</strong> <span style="color:#f0e2c8;">Moving the taller wall: width shrinks and the level cannot rise above the short wall.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. C++ details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const vector&lt;int&gt;&amp;</code>, cast <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size()</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">- 1</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> area because signed overflow is undefined behaviour.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verified:</strong> <span style="color:#f0e2c8;">500 random arrays matched brute force with 0 mismatches; 999 steps vs 499,500 for n = 1000.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you do when both walls are equal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Move either one. Any better container must drop both, because keeping either caps the level at the same height with less width.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from trapping rain water?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Trapping rain water sums the water above every bar using left and right maxima; container picks one pair. See <a href="/interview-question/how-do-you-solve-the-trapping-rain-water-problem" style="color:#ffca28;text-decoration:underline;">trapping rain water</a>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">1LL * min(a, b) * width</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long long(min(a, b) * width)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The second multiplies in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> first and only converts the (possibly already overflowed) result. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1LL</code> forces the multiplication itself into 64 bits.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare with the O(n²) brute force on random arrays, as example 2 does (0 mismatches in 500 tests), plus edge cases like {7}, {0, 0, 0} and {1, 1}.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Area formula** | Shorter wall × distance between the walls |
| **Two pointers (converging)** | One index at each end, moving inward |
| **Exchange / elimination argument** | Proof that every discarded option is no better than one already seen |
| **Greedy choice** | Committing to the locally best move without backtracking |
| **Undefined behaviour** | Code the C++ standard gives no meaning to, such as signed overflow |

---
**Conclusion:** In C++, container with most water is a two-pointer loop over a \`const vector<int>&\`: start at both ends, measure in \`long long\`, drop the shorter wall — O(n) time, O(1) space — with the \`size()\` cast and overflow handled explicitly. What makes the answer strong is the one-paragraph proof: the shorter wall caps every narrower container it could be part of, so it can be discarded. The same converging-pointer pattern drives [3Sum](/interview-question/how-do-you-solve-the-3sum-problem) and [valid palindrome](/interview-question/how-do-you-check-if-a-string-is-a-valid-palindrome), and the closely related [trapping rain water with two pointers](/interview-question/trapping-rain-water-with-two-pointers-why-does-leftmax-rightmax-work-in-o-1-spac) uses a similar "move the smaller side" argument.`,
        examples: [
          {
            label: `Two pointers on seven inputs, with the winning pair`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

struct Result { long long area; int left, right; };

Result maxArea(const vector<int>& height) {
    int left = 0, right = static_cast<int>(height.size()) - 1; // int: size()-1 on an empty
    Result best{0, -1, -1};                                    // vector would wrap if unsigned
    while (left < right) {
        long long h = min(height[left], height[right]);        // the shorter wall sets the level
        long long area = h * (right - left);
        if (area > best.area) best = {area, left, right};
        if (height[left] < height[right]) left++;              // move the shorter wall inward
        else right--;
    }
    return best;
}

string fmt(const Result& r) {
    return to_string(r.area) + " at (" + to_string(r.left) + ", " + to_string(r.right) + ")";
}

int main() {
    cout << fmt(maxArea({1, 8, 6, 2, 5, 4, 8, 3, 7})) << "\\n"; // 49 at (1, 8)
    cout << fmt(maxArea({1, 1})) << "\\n";                      // 1 at (0, 1)
    cout << fmt(maxArea({4, 3, 2, 1, 4})) << "\\n";             // 16 at (0, 4)
    cout << fmt(maxArea({1, 2, 1})) << "\\n";                   // 2 at (0, 2)
    cout << fmt(maxArea({2, 3, 4, 5, 18, 17, 6})) << "\\n";     // 17 at (4, 5)
    cout << fmt(maxArea({0, 0, 0})) << "\\n";                   // 0 at (-1, -1)
    cout << fmt(maxArea({7})) << "\\n";                         // 0 at (-1, -1)
}`,
          },
          {
            label: `Trace, then two pointers vs brute force on random arrays`,
            code: `#include <algorithm>
#include <iostream>
#include <utility>
#include <vector>
using namespace std;

// 1) Trace the two pointers on the classic input.
// 2) Check them against brute force on many generated inputs, counting the work.
void trace(const vector<int>& height) {
    int left = 0, right = static_cast<int>(height.size()) - 1, best = 0;
    while (left < right) {
        int area = min(height[left], height[right]) * (right - left);
        best = max(best, area);
        const char* move = height[left] < height[right] ? "left" : "right";
        cout << "L=" << left << " R=" << right << " walls=" << height[left] << "," << height[right]
             << " area=" << area << " best=" << best << " move " << move << "\\n";
        if (height[left] < height[right]) left++;
        else right--;
    }
}

pair<long long, long long> twoPointers(const vector<int>& height) {
    int left = 0, right = static_cast<int>(height.size()) - 1;
    long long best = 0, steps = 0;
    while (left < right) {
        steps++;
        best = max(best, 1LL * min(height[left], height[right]) * (right - left));
        if (height[left] < height[right]) left++;
        else right--;
    }
    return {best, steps};
}

pair<long long, long long> bruteForce(const vector<int>& height) {
    long long best = 0, steps = 0;
    int n = static_cast<int>(height.size());
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++) {
            steps++;
            best = max(best, 1LL * min(height[i], height[j]) * (j - i));
        }
    return {best, steps};
}

long long seed = 7;
int nextRand() {
    seed = seed * 48271LL % 2147483647LL;
    return static_cast<int>(seed);
}

int main() {
    trace({1, 8, 6, 2, 5, 4, 8, 3, 7});
    int mismatches = 0;
    for (int t = 0; t < 500; t++) {
        int n = nextRand() % 60 + 2;
        vector<int> h(n);
        for (int i = 0; i < n; i++) h[i] = nextRand() % 100;
        if (twoPointers(h).first != bruteForce(h).first) mismatches++;
    }
    cout << "random tests: 500, mismatches: " << mismatches << "\\n";
    vector<int> big(1000);
    for (int i = 0; i < 1000; i++) big[i] = nextRand() % 10000;
    auto a = bruteForce(big);
    auto b = twoPointers(big);
    cout << "n=1000 brute=" << a.first << " in " << a.second << " steps, two pointers=" << b.first
         << " in " << b.second << " steps\\n";
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How do you find the longest substring without repeating characters?`,
    difficulty: "medium",
    seoDescription: `Longest substring without repeating characters with a sliding window and last-seen indices: O(n), the max() guard explained, verified code in 4 languages.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a string, find the length of the longest substring that has no repeating characters. For example, for 'abcabcbb' the answer is 3, for 'abc'. Please write it in Python and walk me through its complexity."

**What a strong answer should cover:**
- Brute force over all substrings is O(n²) to O(n³); the expected answer is a variable-size sliding window in O(n).
- A last-seen index map so \`left\` can jump past the earlier copy, and why the jump must be \`max(left, last + 1)\` (stale indices, the "abba" case).
- The window invariant: no repeats inside \`s[left..right]\`, \`left\` never decreases; window length is \`right - left + 1\`.
- Space O(min(n, k)) for alphabet size k, and the set-based alternative that shrinks one step at a time.
- Python specifics: a \`dict\` as the last-seen map (or a \`set\` for the shrinking variant), \`enumerate\` for index and character together, and the fact that Python strings index by Unicode code point, so an emoji counts as one character.

**Clarifying questions expected:**
- "What is the character set — ASCII, lowercase only, or Unicode?"
- "Do you want the length or the substring itself?"

**Code / implementation expected:** Yes — a \`longest_unique(s)\` function in Python returning the length (and optionally the substring).`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know strings, loops and what a map is.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`python3\`.

## 1. Why This Even Matters — A Story First

You are reading a long necklace of coloured beads through a magnifying glass, and you want the longest stretch where **no colour repeats**. You slide the glass to the right one bead at a time. The moment a colour shows up that is already under the glass, you do not start over — you just slide the **left edge** of the glass past the earlier bead of that colour, and keep going. The glass only ever moves forward, on both edges.

That magnifying glass is a **sliding window**, and this problem is the textbook example of a *variable-size* window: it grows on the right and shrinks on the left as needed. It is one of the most asked string questions because it is short, the brute force is obvious, and the optimal version has one subtle line (\`left = max(left, last + 1)\`) that separates people who memorised it from people who understand it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want the length only, or the substring itself? | Returning the substring needs the start index of the best window. |
| What characters can appear — lowercase letters, ASCII, any Unicode? | Decides whether a fixed array of 26 or 128 slots works or a hash map is needed, and how "a character" is counted in your language. |
| Is it case-sensitive? Do spaces count? | "A" and "a" are different characters unless told otherwise; a space is a character. |
| Substring or subsequence? | A substring is contiguous. A subsequence may skip characters — a different problem. |

## 3. The Core Idea in Plain Language

📌 **Interview term: Substring** — a contiguous run of characters, such as "bca" inside "abcabcbb". (A *subsequence* may skip characters; this problem is about substrings.)

📌 **Interview term: Sliding window** — two indices \`left\` and \`right\` that mark a range \`s[left..right]\`; \`right\` advances every step and \`left\` advances only when the range breaks a rule. Here the rule is "no repeated character". The general pattern has its own page: [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).

The brute force checks every substring, O(n²) of them, and checking each for repeats costs up to O(n) more: O(n³), or O(n²) with an incremental set. The window does it in one pass, because of one observation: if \`s[left..right-1]\` has no repeats and \`s[right]\` repeats something inside it, then **every** window that starts at or before that earlier copy and ends at \`right\` also contains the repeat. So \`left\` can jump straight past the earlier copy.

📌 **Interview term: Last-seen index map** — a map from character to the index where it last appeared. It lets \`left\` jump in O(1) instead of creeping forward one step at a time.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="String abcabcbb at right 3: the repeat of a moves left to index 1">
  <defs>
    <marker id="b08q3a-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="28" text-anchor="middle">right = 3 sees a again: left jumps to 1</text>
  <rect class="d-box-muted" x="47" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="75" y="92" text-anchor="middle">a</text>
  <rect class="d-box-accent" x="117" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="145" y="92" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="187" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="215" y="92" text-anchor="middle">c</text>
  <rect class="d-box-accent" x="257" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="285" y="92" text-anchor="middle">a</text>
  <rect class="d-box" x="327" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="355" y="92" text-anchor="middle">b</text>
  <rect class="d-box" x="397" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="425" y="92" text-anchor="middle">c</text>
  <rect class="d-box" x="467" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="495" y="92" text-anchor="middle">b</text>
  <rect class="d-box" x="537" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="565" y="92" text-anchor="middle">b</text>
  <path class="d-edge-accent" d="M 145 172 L 145 124" marker-end="url(#b08q3a-python)"/>
  <text class="d-text d-accent" x="145" y="200" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 285 172 L 285 124" marker-end="url(#b08q3a-python)"/>
  <text class="d-text d-accent" x="285" y="200" text-anchor="middle">right</text>
</svg>

At \`right = 3\` the character is \`a\`, last seen at index 0. The window "abc" becomes "bca": \`left\` jumps to 0 + 1 = 1.

### The subtle line: why max(left, last + 1)

The last-seen map is never cleaned up, so it can hold an index from **before** the current window. Take "abba":

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="String abba at right 3: last a is index 0, which is behind left, so left stays at 2">
  <defs>
    <marker id="b08q3b-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="28" text-anchor="middle">abba, right = 3: last a is 0, left stays 2</text>
  <rect class="d-box-muted" x="120" y="60" width="70" height="52" rx="8"/>
  <text class="d-text" x="155" y="92" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="230" y="60" width="70" height="52" rx="8"/>
  <text class="d-text" x="265" y="92" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="340" y="60" width="70" height="52" rx="8"/>
  <text class="d-text" x="375" y="92" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="450" y="60" width="70" height="52" rx="8"/>
  <text class="d-text" x="485" y="92" text-anchor="middle">a</text>
  <path class="d-edge-accent" d="M 155 172 L 155 124" marker-end="url(#b08q3b-python)"/>
  <text class="d-text d-accent" x="155" y="200" text-anchor="middle">stale</text>
  <path class="d-edge-accent" d="M 375 172 L 375 124" marker-end="url(#b08q3b-python)"/>
  <text class="d-text d-accent" x="375" y="200" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 485 172 L 485 124" marker-end="url(#b08q3b-python)"/>
  <text class="d-text d-accent" x="485" y="200" text-anchor="middle">right</text>
</svg>

At \`right = 2\` the second \`b\` pushes \`left\` to 2. At \`right = 3\`, \`a\` was last seen at index 0 — but index 0 is already outside the window. Setting \`left = 0 + 1 = 1\` would move \`left\` **backwards** and re-admit the duplicate \`b\`, giving the wrong answer 3 ("bba"). Taking \`max(left, last + 1)\` keeps \`left\` at 2.

📌 **Interview term: Window invariant** — a fact that is true after every step. Here: \`s[left..right]\` contains no repeated character, and \`left\` never decreases. Every line of the loop exists to keep that invariant.

📌 **Interview term: Amortised O(n)** — total work over the whole run is linear even if a single step does more; in the set-based variant, \`left\` moves at most n times in total.

## 4. From Brute Force to One Pass

| Approach | Time | Space | Verdict |
| :--- | :--- | :--- | :--- |
| Every substring, check for repeats | O(n³) | O(k) | Correct, far too slow |
| Every start, extend with a set until a repeat | O(n²) | O(k) | Better; still quadratic |
| Sliding window with a set, shrink step by step | O(n) | O(k) | Each index enters and leaves once |
| **Sliding window with last-seen indices** | **O(n)** | **O(k)** | One jump per repeat; the expected answer |

### The Python code

~~~python
def longest_unique(s):
    last = {}                      # char -> index where we last saw it
    left = 0
    best, best_start = 0, 0
    for right, ch in enumerate(s):
        if ch in last:
            left = max(left, last[ch] + 1)   # jump past the repeat, never move backwards
        last[ch] = right
        if right - left + 1 > best:
            best, best_start = right - left + 1, left
    return best, s[best_start:best_start + best]
~~~

Python points worth saying:

- \`for right, ch in enumerate(s)\` gives the index and the character together.
- \`last\` is a plain \`dict\`; \`ch in last\` is an average O(1) hash lookup ([how hash tables work](/interview-question/how-does-a-hash-table-work)).
- The slice \`s[best_start:best_start + best]\` runs **once**, at the end. Slicing inside the loop would copy a substring on every step and make the loop O(n · k).
- Python \`str\` indexes by Unicode code point: in the lab \`len("😀")\` was 1, so emoji and accented characters each count as one character without extra work.

## 5. Verified: Running the Code

Both programs are the runnable examples on this page; each was run with \`python3 main.py\`.

**Example 1 — the solution on eight inputs**, printing the length and the substring in parentheses:

~~~text
3 (abc)
1 (b)
3 (wke)
0 ()
1 ( )
3 (vdf)
2 (ab)
5 (mzuxt)
~~~

**Example 2 — a trace of "abba", then the correct jump, the buggy jump without \`max\`, and the set version:**

~~~text
right=0 ch=a left=0 window=a best=1
right=1 ch=b left=0 window=ab best=2
right=2 ch=b left=2 window=b best=2
right=3 ch=a left=2 window=ba best=2
abba: fixed=2 buggy=3 set=2 (left moved 2 times)
tmmzuxt: fixed=5 buggy=6 set=5 (left moved 2 times)
abcabcbb: fixed=3 buggy=3 set=3 (left moved 7 times)
pwwkew: fixed=3 buggy=3 set=3 (left moved 3 times)
~~~

The trace shows \`left\` staying at 2 when the stale \`a\` is seen at \`right = 3\`. The buggy version, which drops the \`max\`, returns 3 for "abba" and 6 for "tmmzuxt" — both impossible, because those windows contain a repeat. On inputs without stale indices ("abcabcbb", "pwwkew") the bug is invisible, which is why "abba" is the test to write. The set version gets the same answers while moving \`left\` one step at a time (7 moves on "abcabcbb").

## 6. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n) | \`right\` visits each index once and each step does O(1) map work; \`left\` only jumps forward |
| Space | O(min(n, k)) | O(min(n, k)) — the dict holds at most one entry per distinct character (k = alphabet size). |
| Set variant | O(n) time | \`left\` moves at most n times in total, so the inner \`while\` is amortised O(1) |

## Edge Cases to Mention

- **Empty string:** length 0, the loop never runs.
- **One character or a single space** (" "): length 1 — a space is a character.
- **All the same** ("bbbbb"): length 1; \`left\` follows \`right\` every step.
- **All distinct:** the whole string; \`left\` never moves.
- **Stale index** ("abba", "tmmzuxt"): the cases that break the version without \`max\`.
- **The answer is in the middle** ("pwwkew" → "wke"): the best window is recorded when found, not at the end.

## Common Pitfalls

- **Dropping the \`max()\`.** \`left = last[ch] + 1\` moves \`left\` backwards on stale entries: "abba" gives 3 and "tmmzuxt" gives 6 in the verified run instead of 2 and 5.
- **Updating \`last[ch]\` before reading it.** Then \`last[ch]\` is always \`right\`, and \`left\` jumps to \`right + 1\`. Read first, then write.
- **Slicing in the loop to remember the best window.** Store \`best_start\` and slice once at the end.
- **Using \`s.find\` or \`in s[left:right]\` to detect repeats.** That rescans the window each step — O(n²) or worse.
- **Measuring the window as \`right - left\`.** The window \`s[left..right]\` has \`right - left + 1\` characters.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Sliding window with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> of last-seen indices: move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> every step, and on a repeat jump <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(left, last[ch] + 1)</code>: O(n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The invariant:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[left..right]</code> never has a repeat and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> never moves backwards; the answer is the largest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right - left + 1</code> seen.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The subtle line:</strong> <span style="color:#f0e2c8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code> guards against stale indices from before the window: without it "abba" returns 3.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">enumerate</code> for index and char, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> for last-seen, slice once at the end; Python strings index by code point, so an emoji is one character.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Alternative:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> plus a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code> loop that removes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[left]</code> until the repeat is gone; still O(n) because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> moves at most n times.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Dict of indices or set: which would you pick?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The dict lets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> jump in one step; the set version moves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> one character at a time (7 moves on "abcabcbb" in the run). Both are O(n); the dict is fewer operations, the set is easier to get right.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use a fixed array instead of a dict?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, if the alphabet is small and known, e.g. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-1] * 128</code> indexed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ord(ch)</code> for ASCII. It avoids hashing but breaks on characters outside that range.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the space complexity exactly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(min(n, k)) where k is the number of distinct characters possible: the map cannot hold more entries than either.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this change for "at most k distinct characters"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a count per character instead of a last index and shrink while the number of distinct keys exceeds k. Same window, different validity rule.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Substring** | A contiguous run of characters |
| **Sliding window** | A range \`[left, right]\` that grows on the right and shrinks on the left |
| **Last-seen index map** | Character → index of its latest occurrence |
| **Window invariant** | No repeats inside the window; \`left\` never decreases |
| **Amortised O(n)** | Linear total work even if one step does more |

---
**Conclusion:** In Python, the longest substring without repeats is one \`enumerate\` loop with a last-seen \`dict\` and \`left = max(left, last[ch] + 1)\`: O(n) time, O(min(n, k)) space, and code-point strings so Unicode just works. The same grow-right, shrink-left window, with a different validity rule, solves [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring), where the window must *contain* characters instead of *avoid* repeats.`,
        examples: [
          {
            label: `Sliding window with last-seen indices on eight inputs`,
            code: `def longest_unique(s):
    last = {}                      # char -> index where we last saw it
    left = 0
    best, best_start = 0, 0
    for right, ch in enumerate(s):
        if ch in last:
            left = max(left, last[ch] + 1)   # jump past the repeat, never move backwards
        last[ch] = right
        if right - left + 1 > best:
            best, best_start = right - left + 1, left
    return best, s[best_start:best_start + best]


def fmt(result):
    return str(result[0]) + " (" + result[1] + ")"


print(fmt(longest_unique("abcabcbb")))  # 3 (abc)
print(fmt(longest_unique("bbbbb")))  # 1 (b)
print(fmt(longest_unique("pwwkew")))  # 3 (wke)
print(fmt(longest_unique("")))  # 0 ()
print(fmt(longest_unique(" ")))  # 1 ( )
print(fmt(longest_unique("dvdf")))  # 3 (vdf)
print(fmt(longest_unique("abba")))  # 2 (ab)
print(fmt(longest_unique("tmmzuxt")))  # 5 (mzuxt)`,
          },
          {
            label: `Why max(left, last + 1): trace and buggy vs fixed vs set`,
            code: `# Why left = max(left, last + 1)? Trace "abba", then compare three versions.
def fixed(s, show=False):
    last, left, best = {}, 0, 0
    for right, ch in enumerate(s):
        if ch in last:
            left = max(left, last[ch] + 1)
        last[ch] = right
        best = max(best, right - left + 1)
        if show:
            print("right=" + str(right) + " ch=" + ch + " left=" + str(left)
                  + " window=" + s[left:right + 1] + " best=" + str(best))
    return best


def buggy(s):
    # Forgets the max(): a stale index from before the window drags left backwards
    last, left, best = {}, 0, 0
    for right, ch in enumerate(s):
        if ch in last:
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best


def set_version(s):
    # Alternative: shrink one step at a time with a set; counts how often left moves
    window, left, best, moves = set(), 0, 0, 0
    for right, ch in enumerate(s):
        while ch in window:
            window.remove(s[left])
            left += 1
            moves += 1
        window.add(ch)
        best = max(best, right - left + 1)
    return best, moves


fixed("abba", show=True)
for s in ["abba", "tmmzuxt", "abcabcbb", "pwwkew"]:
    b, moves = set_version(s)
    print(s + ": fixed=" + str(fixed(s)) + " buggy=" + str(buggy(s))
          + " set=" + str(b) + " (left moved " + str(moves) + " times)")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given a string, find the length of the longest substring that has no repeating characters. For example, for 'abcabcbb' the answer is 3, for 'abc'. Please write it in JavaScript and walk me through its complexity."

**What a strong answer should cover:**
- Brute force over all substrings is O(n²) to O(n³); the expected answer is a variable-size sliding window in O(n).
- A last-seen index map so \`left\` can jump past the earlier copy, and why the jump must be \`max(left, last + 1)\` (stale indices, the "abba" case).
- The window invariant: no repeats inside \`s[left..right]\`, \`left\` never decreases; window length is \`right - left + 1\`.
- Space O(min(n, k)) for alphabet size k, and the set-based alternative that shrinks one step at a time.
- JavaScript specifics: a \`Map\` as the last-seen map (not a plain object), and the fact that strings are UTF-16, so \`s[i]\` and \`s.length\` count code units and an emoji is two of them.

**Clarifying questions expected:**
- "What is the character set — ASCII, lowercase only, or Unicode?"
- "Do you want the length or the substring itself?"

**Code / implementation expected:** Yes — a \`longestUnique(s)\` function in JavaScript returning the length (and optionally the substring).`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know strings, loops and what a map is.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`node\` (the examples are plain browser-safe scripts).

## 1. Why This Even Matters — A Story First

You are reading a long necklace of coloured beads through a magnifying glass, and you want the longest stretch where **no colour repeats**. You slide the glass to the right one bead at a time. The moment a colour shows up that is already under the glass, you do not start over — you just slide the **left edge** of the glass past the earlier bead of that colour, and keep going. The glass only ever moves forward, on both edges.

That magnifying glass is a **sliding window**, and this problem is the textbook example of a *variable-size* window: it grows on the right and shrinks on the left as needed. It is one of the most asked string questions because it is short, the brute force is obvious, and the optimal version has one subtle line (\`left = max(left, last + 1)\`) that separates people who memorised it from people who understand it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want the length only, or the substring itself? | Returning the substring needs the start index of the best window. |
| What characters can appear — lowercase letters, ASCII, any Unicode? | Decides whether a fixed array of 26 or 128 slots works or a hash map is needed, and how "a character" is counted in your language. |
| Is it case-sensitive? Do spaces count? | "A" and "a" are different characters unless told otherwise; a space is a character. |
| Substring or subsequence? | A substring is contiguous. A subsequence may skip characters — a different problem. |

## 3. The Core Idea in Plain Language

📌 **Interview term: Substring** — a contiguous run of characters, such as "bca" inside "abcabcbb". (A *subsequence* may skip characters; this problem is about substrings.)

📌 **Interview term: Sliding window** — two indices \`left\` and \`right\` that mark a range \`s[left..right]\`; \`right\` advances every step and \`left\` advances only when the range breaks a rule. Here the rule is "no repeated character". The general pattern has its own page: [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).

The brute force checks every substring, O(n²) of them, and checking each for repeats costs up to O(n) more: O(n³), or O(n²) with an incremental set. The window does it in one pass, because of one observation: if \`s[left..right-1]\` has no repeats and \`s[right]\` repeats something inside it, then **every** window that starts at or before that earlier copy and ends at \`right\` also contains the repeat. So \`left\` can jump straight past the earlier copy.

📌 **Interview term: Last-seen index map** — a map from character to the index where it last appeared. It lets \`left\` jump in O(1) instead of creeping forward one step at a time.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="String abcabcbb at right 3: the repeat of a moves left to index 1">
  <defs>
    <marker id="b08q3a-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="28" text-anchor="middle">right = 3 sees a again: left jumps to 1</text>
  <rect class="d-box-muted" x="47" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="75" y="92" text-anchor="middle">a</text>
  <rect class="d-box-accent" x="117" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="145" y="92" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="187" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="215" y="92" text-anchor="middle">c</text>
  <rect class="d-box-accent" x="257" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="285" y="92" text-anchor="middle">a</text>
  <rect class="d-box" x="327" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="355" y="92" text-anchor="middle">b</text>
  <rect class="d-box" x="397" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="425" y="92" text-anchor="middle">c</text>
  <rect class="d-box" x="467" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="495" y="92" text-anchor="middle">b</text>
  <rect class="d-box" x="537" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="565" y="92" text-anchor="middle">b</text>
  <path class="d-edge-accent" d="M 145 172 L 145 124" marker-end="url(#b08q3a-javascript)"/>
  <text class="d-text d-accent" x="145" y="200" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 285 172 L 285 124" marker-end="url(#b08q3a-javascript)"/>
  <text class="d-text d-accent" x="285" y="200" text-anchor="middle">right</text>
</svg>

At \`right = 3\` the character is \`a\`, last seen at index 0. The window "abc" becomes "bca": \`left\` jumps to 0 + 1 = 1.

### The subtle line: why max(left, last + 1)

The last-seen map is never cleaned up, so it can hold an index from **before** the current window. Take "abba":

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="String abba at right 3: last a is index 0, which is behind left, so left stays at 2">
  <defs>
    <marker id="b08q3b-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="28" text-anchor="middle">abba, right = 3: last a is 0, left stays 2</text>
  <rect class="d-box-muted" x="120" y="60" width="70" height="52" rx="8"/>
  <text class="d-text" x="155" y="92" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="230" y="60" width="70" height="52" rx="8"/>
  <text class="d-text" x="265" y="92" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="340" y="60" width="70" height="52" rx="8"/>
  <text class="d-text" x="375" y="92" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="450" y="60" width="70" height="52" rx="8"/>
  <text class="d-text" x="485" y="92" text-anchor="middle">a</text>
  <path class="d-edge-accent" d="M 155 172 L 155 124" marker-end="url(#b08q3b-javascript)"/>
  <text class="d-text d-accent" x="155" y="200" text-anchor="middle">stale</text>
  <path class="d-edge-accent" d="M 375 172 L 375 124" marker-end="url(#b08q3b-javascript)"/>
  <text class="d-text d-accent" x="375" y="200" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 485 172 L 485 124" marker-end="url(#b08q3b-javascript)"/>
  <text class="d-text d-accent" x="485" y="200" text-anchor="middle">right</text>
</svg>

At \`right = 2\` the second \`b\` pushes \`left\` to 2. At \`right = 3\`, \`a\` was last seen at index 0 — but index 0 is already outside the window. Setting \`left = 0 + 1 = 1\` would move \`left\` **backwards** and re-admit the duplicate \`b\`, giving the wrong answer 3 ("bba"). Taking \`max(left, last + 1)\` keeps \`left\` at 2.

📌 **Interview term: Window invariant** — a fact that is true after every step. Here: \`s[left..right]\` contains no repeated character, and \`left\` never decreases. Every line of the loop exists to keep that invariant.

📌 **Interview term: Amortised O(n)** — total work over the whole run is linear even if a single step does more; in the set-based variant, \`left\` moves at most n times in total.

## 4. From Brute Force to One Pass

| Approach | Time | Space | Verdict |
| :--- | :--- | :--- | :--- |
| Every substring, check for repeats | O(n³) | O(k) | Correct, far too slow |
| Every start, extend with a set until a repeat | O(n²) | O(k) | Better; still quadratic |
| Sliding window with a set, shrink step by step | O(n) | O(k) | Each index enters and leaves once |
| **Sliding window with last-seen indices** | **O(n)** | **O(k)** | One jump per repeat; the expected answer |

### The JavaScript code

~~~javascript
function longestUnique(s) {
  const last = new Map();        // char -> index where we last saw it
  let left = 0, best = 0, bestStart = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (last.has(ch)) {
      left = Math.max(left, last.get(ch) + 1); // jump past the repeat, never backwards
    }
    last.set(ch, right);
    if (right - left + 1 > best) {
      best = right - left + 1;
      bestStart = left;
    }
  }
  return [best, s.slice(bestStart, bestStart + best)];
}
~~~

JavaScript points worth saying:

- A \`Map\` is the right tool: \`has\`, \`get\` and \`set\` are average O(1), keys can be any string, and there are no inherited keys. A plain object also works for single characters, but \`{}\` inherits keys from \`Object.prototype\`, so \`Map\` is the safer habit for arbitrary keys.
- \`s.slice(bestStart, bestStart + best)\` runs once at the end.
- **Strings are UTF-16.** \`s[i]\` returns one 16-bit code unit. In the lab, for \`"a😀b"\`, \`s.length\` was 4 while \`[...s].length\` was 3: the emoji is two code units. If the input can contain emoji, iterate with \`for (const ch of s)\` or \`Array.from(s)\`, which split by code point.

## 5. Verified: Running the Code

Both programs are the runnable examples on this page; each was run with \`node main.js\`.

**Example 1 — the solution on eight inputs**, printing the length and the substring in parentheses:

~~~text
3 (abc)
1 (b)
3 (wke)
0 ()
1 ( )
3 (vdf)
2 (ab)
5 (mzuxt)
~~~

**Example 2 — a trace of "abba", then the correct jump, the buggy jump without \`max\`, and the set version:**

~~~text
right=0 ch=a left=0 window=a best=1
right=1 ch=b left=0 window=ab best=2
right=2 ch=b left=2 window=b best=2
right=3 ch=a left=2 window=ba best=2
abba: fixed=2 buggy=3 set=2 (left moved 2 times)
tmmzuxt: fixed=5 buggy=6 set=5 (left moved 2 times)
abcabcbb: fixed=3 buggy=3 set=3 (left moved 7 times)
pwwkew: fixed=3 buggy=3 set=3 (left moved 3 times)
~~~

The trace shows \`left\` staying at 2 when the stale \`a\` is seen at \`right = 3\`. The buggy version, which drops the \`max\`, returns 3 for "abba" and 6 for "tmmzuxt" — both impossible, because those windows contain a repeat. On inputs without stale indices ("abcabcbb", "pwwkew") the bug is invisible, which is why "abba" is the test to write. The set version gets the same answers while moving \`left\` one step at a time (7 moves on "abcabcbb").

## 6. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n) | \`right\` visits each index once and each step does O(1) map work; \`left\` only jumps forward |
| Space | O(min(n, k)) | O(min(n, k)) — the Map holds at most one entry per distinct character. |
| Set variant | O(n) time | \`left\` moves at most n times in total, so the inner \`while\` is amortised O(1) |

## Edge Cases to Mention

- **Empty string:** length 0, the loop never runs.
- **One character or a single space** (" "): length 1 — a space is a character.
- **All the same** ("bbbbb"): length 1; \`left\` follows \`right\` every step.
- **All distinct:** the whole string; \`left\` never moves.
- **Stale index** ("abba", "tmmzuxt"): the cases that break the version without \`max\`.
- **The answer is in the middle** ("pwwkew" → "wke"): the best window is recorded when found, not at the end.

## Common Pitfalls

- **Dropping the \`Math.max\`.** \`left = last.get(ch) + 1\` moves \`left\` backwards on stale entries: "abba" gives 3 and "tmmzuxt" gives 6 in the verified run.
- **Testing \`if (last.get(ch))\` instead of \`last.has(ch)\`.** Index 0 is falsy, so a character last seen at position 0 is treated as unseen — exactly the "abba" case.
- **Counting UTF-16 code units as characters.** \`"a😀b".length\` is 4; use \`Array.from(s)\` if the interviewer says characters are Unicode.
- **Using \`s.indexOf(ch, left)\` to find repeats.** It rescans the window every step: O(n²).
- **Off-by-one window length.** The window \`s[left..right]\` has \`right - left + 1\` characters.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Sliding window with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> of last-seen indices: move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> every step, and on a repeat set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left = Math.max(left, last.get(ch) + 1)</code>: O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The invariant:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[left..right]</code> never has a repeat and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> never moves backwards; the answer is the largest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right - left + 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The subtle line:</strong> <span style="color:#f0e2c8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max</code> guards against stale indices: without it "abba" returns 3.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. JavaScript details:</strong> <span style="color:#f0e2c8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code>, not a truthiness check (index 0 is falsy); strings are UTF-16, so use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from(s)</code> for emoji-safe characters.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Alternative:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code> loop deleting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[left]</code> until the repeat is gone; still O(n) because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> moves at most n times.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Map of indices or Set: which would you pick?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The Map lets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> jump in one step; the Set version moves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> one character at a time (7 moves on "abcabcbb" in the run). Both O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a plain object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> has no prototype keys, reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code>, and keeps insertion order. For single letters an object works, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> is the safer default.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about an array of 128 slots?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For ASCII, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Array(128).fill(-1)</code> indexed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.charCodeAt(i)</code> avoids hashing. It breaks for codes of 128 and above.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this change for "at most k distinct characters"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep counts in a Map and shrink while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map.size</code> exceeds k, deleting keys whose count reaches 0.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Substring** | A contiguous run of characters |
| **Sliding window** | A range \`[left, right]\` that grows on the right and shrinks on the left |
| **Last-seen index map** | Character → index of its latest occurrence |
| **Window invariant** | No repeats inside the window; \`left\` never decreases |
| **Amortised O(n)** | Linear total work even if one step does more |
| **UTF-16 code unit** | One 16-bit piece of a JavaScript string; an emoji uses two |

---
**Conclusion:** In JavaScript, the longest substring without repeats is one loop with a last-seen \`Map\` and \`left = Math.max(left, last.get(ch) + 1)\`: O(n) time, O(min(n, k)) space — with \`has\` instead of a truthiness check, and UTF-16 in mind if the input is not plain ASCII. The same grow-right, shrink-left window, with a different validity rule, solves [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring), where the window must *contain* characters instead of *avoid* repeats.`,
        examples: [
          {
            label: `Sliding window with last-seen indices on eight inputs`,
            code: `function longestUnique(s) {
  const last = new Map();        // char -> index where we last saw it
  let left = 0, best = 0, bestStart = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (last.has(ch)) {
      left = Math.max(left, last.get(ch) + 1); // jump past the repeat, never backwards
    }
    last.set(ch, right);
    if (right - left + 1 > best) {
      best = right - left + 1;
      bestStart = left;
    }
  }
  return [best, s.slice(bestStart, bestStart + best)];
}

function fmt(r) {
  return r[0] + ' (' + r[1] + ')';
}

console.log(fmt(longestUnique('abcabcbb'))); // 3 (abc)
console.log(fmt(longestUnique('bbbbb'))); // 1 (b)
console.log(fmt(longestUnique('pwwkew'))); // 3 (wke)
console.log(fmt(longestUnique(''))); // 0 ()
console.log(fmt(longestUnique(' '))); // 1 ( )
console.log(fmt(longestUnique('dvdf'))); // 3 (vdf)
console.log(fmt(longestUnique('abba'))); // 2 (ab)
console.log(fmt(longestUnique('tmmzuxt'))); // 5 (mzuxt)`,
          },
          {
            label: `Why max(left, last + 1): trace and buggy vs fixed vs set`,
            code: `// Why left = Math.max(left, last + 1)? Trace "abba", then compare three versions.
function fixed(s, show) {
  const last = new Map();
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (last.has(ch)) left = Math.max(left, last.get(ch) + 1);
    last.set(ch, right);
    best = Math.max(best, right - left + 1);
    if (show) {
      console.log('right=' + right + ' ch=' + ch + ' left=' + left +
        ' window=' + s.slice(left, right + 1) + ' best=' + best);
    }
  }
  return best;
}

function buggy(s) {
  // Forgets the max(): a stale index from before the window drags left backwards
  const last = new Map();
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (last.has(ch)) left = last.get(ch) + 1;
    last.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}

function setVersion(s) {
  // Alternative: shrink one step at a time with a Set; counts how often left moves
  const window = new Set();
  let left = 0, best = 0, moves = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    while (window.has(ch)) {
      window.delete(s[left]);
      left++;
      moves++;
    }
    window.add(ch);
    best = Math.max(best, right - left + 1);
  }
  return [best, moves];
}

fixed('abba', true);
for (const s of ['abba', 'tmmzuxt', 'abcabcbb', 'pwwkew']) {
  const r = setVersion(s);
  console.log(s + ': fixed=' + fixed(s, false) + ' buggy=' + buggy(s) +
    ' set=' + r[0] + ' (left moved ' + r[1] + ' times)');
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given a string, find the length of the longest substring that has no repeating characters. For example, for 'abcabcbb' the answer is 3, for 'abc'. Please write it in Java and walk me through its complexity."

**What a strong answer should cover:**
- Brute force over all substrings is O(n²) to O(n³); the expected answer is a variable-size sliding window in O(n).
- A last-seen index map so \`left\` can jump past the earlier copy, and why the jump must be \`max(left, last + 1)\` (stale indices, the "abba" case).
- The window invariant: no repeats inside \`s[left..right]\`, \`left\` never decreases; window length is \`right - left + 1\`.
- Space O(min(n, k)) for alphabet size k, and the set-based alternative that shrinks one step at a time.
- Java specifics: an \`int[128]\` (or \`int[256]\`) last-seen table for ASCII vs a \`HashMap<Character, Integer>\` with boxing for general input; \`charAt\` returns a UTF-16 \`char\`, so an emoji is two chars.

**Clarifying questions expected:**
- "What is the character set — ASCII, lowercase only, or Unicode?"
- "Do you want the length or the substring itself?"

**Code / implementation expected:** Yes — a \`static int lengthOfLongestSubstring(String s)\` style method in Java (the example returns the substring).`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know strings, loops and what a map is.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`javac\` and \`java\`.

## 1. Why This Even Matters — A Story First

You are reading a long necklace of coloured beads through a magnifying glass, and you want the longest stretch where **no colour repeats**. You slide the glass to the right one bead at a time. The moment a colour shows up that is already under the glass, you do not start over — you just slide the **left edge** of the glass past the earlier bead of that colour, and keep going. The glass only ever moves forward, on both edges.

That magnifying glass is a **sliding window**, and this problem is the textbook example of a *variable-size* window: it grows on the right and shrinks on the left as needed. It is one of the most asked string questions because it is short, the brute force is obvious, and the optimal version has one subtle line (\`left = max(left, last + 1)\`) that separates people who memorised it from people who understand it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want the length only, or the substring itself? | Returning the substring needs the start index of the best window. |
| What characters can appear — lowercase letters, ASCII, any Unicode? | Decides whether a fixed array of 26 or 128 slots works or a hash map is needed, and how "a character" is counted in your language. |
| Is it case-sensitive? Do spaces count? | "A" and "a" are different characters unless told otherwise; a space is a character. |
| Substring or subsequence? | A substring is contiguous. A subsequence may skip characters — a different problem. |

## 3. The Core Idea in Plain Language

📌 **Interview term: Substring** — a contiguous run of characters, such as "bca" inside "abcabcbb". (A *subsequence* may skip characters; this problem is about substrings.)

📌 **Interview term: Sliding window** — two indices \`left\` and \`right\` that mark a range \`s[left..right]\`; \`right\` advances every step and \`left\` advances only when the range breaks a rule. Here the rule is "no repeated character". The general pattern has its own page: [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).

The brute force checks every substring, O(n²) of them, and checking each for repeats costs up to O(n) more: O(n³), or O(n²) with an incremental set. The window does it in one pass, because of one observation: if \`s[left..right-1]\` has no repeats and \`s[right]\` repeats something inside it, then **every** window that starts at or before that earlier copy and ends at \`right\` also contains the repeat. So \`left\` can jump straight past the earlier copy.

📌 **Interview term: Last-seen index map** — a map from character to the index where it last appeared. It lets \`left\` jump in O(1) instead of creeping forward one step at a time.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="String abcabcbb at right 3: the repeat of a moves left to index 1">
  <defs>
    <marker id="b08q3a-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="28" text-anchor="middle">right = 3 sees a again: left jumps to 1</text>
  <rect class="d-box-muted" x="47" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="75" y="92" text-anchor="middle">a</text>
  <rect class="d-box-accent" x="117" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="145" y="92" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="187" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="215" y="92" text-anchor="middle">c</text>
  <rect class="d-box-accent" x="257" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="285" y="92" text-anchor="middle">a</text>
  <rect class="d-box" x="327" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="355" y="92" text-anchor="middle">b</text>
  <rect class="d-box" x="397" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="425" y="92" text-anchor="middle">c</text>
  <rect class="d-box" x="467" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="495" y="92" text-anchor="middle">b</text>
  <rect class="d-box" x="537" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="565" y="92" text-anchor="middle">b</text>
  <path class="d-edge-accent" d="M 145 172 L 145 124" marker-end="url(#b08q3a-java)"/>
  <text class="d-text d-accent" x="145" y="200" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 285 172 L 285 124" marker-end="url(#b08q3a-java)"/>
  <text class="d-text d-accent" x="285" y="200" text-anchor="middle">right</text>
</svg>

At \`right = 3\` the character is \`a\`, last seen at index 0. The window "abc" becomes "bca": \`left\` jumps to 0 + 1 = 1.

### The subtle line: why max(left, last + 1)

The last-seen map is never cleaned up, so it can hold an index from **before** the current window. Take "abba":

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="String abba at right 3: last a is index 0, which is behind left, so left stays at 2">
  <defs>
    <marker id="b08q3b-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="28" text-anchor="middle">abba, right = 3: last a is 0, left stays 2</text>
  <rect class="d-box-muted" x="120" y="60" width="70" height="52" rx="8"/>
  <text class="d-text" x="155" y="92" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="230" y="60" width="70" height="52" rx="8"/>
  <text class="d-text" x="265" y="92" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="340" y="60" width="70" height="52" rx="8"/>
  <text class="d-text" x="375" y="92" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="450" y="60" width="70" height="52" rx="8"/>
  <text class="d-text" x="485" y="92" text-anchor="middle">a</text>
  <path class="d-edge-accent" d="M 155 172 L 155 124" marker-end="url(#b08q3b-java)"/>
  <text class="d-text d-accent" x="155" y="200" text-anchor="middle">stale</text>
  <path class="d-edge-accent" d="M 375 172 L 375 124" marker-end="url(#b08q3b-java)"/>
  <text class="d-text d-accent" x="375" y="200" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 485 172 L 485 124" marker-end="url(#b08q3b-java)"/>
  <text class="d-text d-accent" x="485" y="200" text-anchor="middle">right</text>
</svg>

At \`right = 2\` the second \`b\` pushes \`left\` to 2. At \`right = 3\`, \`a\` was last seen at index 0 — but index 0 is already outside the window. Setting \`left = 0 + 1 = 1\` would move \`left\` **backwards** and re-admit the duplicate \`b\`, giving the wrong answer 3 ("bba"). Taking \`max(left, last + 1)\` keeps \`left\` at 2.

📌 **Interview term: Window invariant** — a fact that is true after every step. Here: \`s[left..right]\` contains no repeated character, and \`left\` never decreases. Every line of the loop exists to keep that invariant.

📌 **Interview term: Amortised O(n)** — total work over the whole run is linear even if a single step does more; in the set-based variant, \`left\` moves at most n times in total.

## 4. From Brute Force to One Pass

| Approach | Time | Space | Verdict |
| :--- | :--- | :--- | :--- |
| Every substring, check for repeats | O(n³) | O(k) | Correct, far too slow |
| Every start, extend with a set until a repeat | O(n²) | O(k) | Better; still quadratic |
| Sliding window with a set, shrink step by step | O(n) | O(k) | Each index enters and leaves once |
| **Sliding window with last-seen indices** | **O(n)** | **O(k)** | One jump per repeat; the expected answer |

### The Java code

~~~java
// Returns the substring itself; its length() is the answer.
static String longestUnique(String s) {
    int[] last = new int[128];     // ASCII input: index = char code, value = last index
    Arrays.fill(last, -1);
    int left = 0, best = 0, bestStart = 0;
    for (int right = 0; right < s.length(); right++) {
        char ch = s.charAt(right);
        if (last[ch] >= 0) {
            left = Math.max(left, last[ch] + 1); // jump past the repeat, never backwards
        }
        last[ch] = right;
        if (right - left + 1 > best) {
            best = right - left + 1;
            bestStart = left;
        }
    }
    return s.substring(bestStart, bestStart + best);
}
~~~

Java points worth saying:

- \`int[] last = new int[128]\` filled with −1 is the fastest last-seen map for ASCII input: indexing by a \`char\` is just an array access, with no hashing or boxing. It is also a trap: in the lab, indexing it with \`'é'\` threw \`ArrayIndexOutOfBoundsException: Index 233 out of bounds for length 128\`. For arbitrary input use \`HashMap<Character, Integer>\` (example 2 does) or an \`int[65536]\` table.
- With a \`HashMap\`, \`get\` returns a boxed \`Integer\` or \`null\`; example 2 checks \`prev != null\` before unboxing, because unboxing \`null\` throws \`NullPointerException\`.
- \`s.substring(bestStart, bestStart + best)\` runs once at the end.
- Java \`char\` is a UTF-16 code unit: in the lab \`"😀".length()\` was 2. Use \`s.codePoints()\` if characters must be full Unicode code points.

## 5. Verified: Running the Code

Both programs are the runnable examples on this page; each was run with \`javac Main.java && java Main\`.

**Example 1 — the solution on eight inputs**, printing the length and the substring in parentheses:

~~~text
3 (abc)
1 (b)
3 (wke)
0 ()
1 ( )
3 (vdf)
2 (ab)
5 (mzuxt)
~~~

**Example 2 — a trace of "abba", then the correct jump, the buggy jump without \`max\`, and the set version:**

~~~text
right=0 ch=a left=0 window=a best=1
right=1 ch=b left=0 window=ab best=2
right=2 ch=b left=2 window=b best=2
right=3 ch=a left=2 window=ba best=2
abba: fixed=2 buggy=3 set=2 (left moved 2 times)
tmmzuxt: fixed=5 buggy=6 set=5 (left moved 2 times)
abcabcbb: fixed=3 buggy=3 set=3 (left moved 7 times)
pwwkew: fixed=3 buggy=3 set=3 (left moved 3 times)
~~~

The trace shows \`left\` staying at 2 when the stale \`a\` is seen at \`right = 3\`. The buggy version, which drops the \`max\`, returns 3 for "abba" and 6 for "tmmzuxt" — both impossible, because those windows contain a repeat. On inputs without stale indices ("abcabcbb", "pwwkew") the bug is invisible, which is why "abba" is the test to write. The set version gets the same answers while moving \`left\` one step at a time (7 moves on "abcabcbb").

## 6. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n) | \`right\` visits each index once and each step does O(1) map work; \`left\` only jumps forward |
| Space | O(min(n, k)) | O(1) for the fixed 128-slot array; O(min(n, k)) for a HashMap. |
| Set variant | O(n) time | \`left\` moves at most n times in total, so the inner \`while\` is amortised O(1) |

## Edge Cases to Mention

- **Empty string:** length 0, the loop never runs.
- **One character or a single space** (" "): length 1 — a space is a character.
- **All the same** ("bbbbb"): length 1; \`left\` follows \`right\` every step.
- **All distinct:** the whole string; \`left\` never moves.
- **Stale index** ("abba", "tmmzuxt"): the cases that break the version without \`max\`.
- **The answer is in the middle** ("pwwkew" → "wke"): the best window is recorded when found, not at the end.

## Common Pitfalls

- **Dropping the \`Math.max\`.** \`left = last[ch] + 1\` moves \`left\` backwards on stale entries: "abba" gives 3 and "tmmzuxt" gives 6 in the verified run.
- **Assuming ASCII with \`int[128]\`.** A character like 'é' (code 233) throws \`ArrayIndexOutOfBoundsException\`; confirm the alphabet or use a map.
- **Unboxing a \`null\`.** \`int prev = map.get(ch);\` throws \`NullPointerException\` for an unseen character; check \`containsKey\` or compare the \`Integer\` with \`null\` first.
- **Building the best substring inside the loop.** Each \`substring\` call copies characters; keep the start index and call it once.
- **Counting \`char\`s as Unicode characters.** An emoji is two \`char\`s; use \`codePoints()\` when that matters.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Sliding window with a last-seen table: move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> every step, and on a repeat set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left = Math.max(left, last[ch] + 1)</code>: O(n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The invariant:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[left..right]</code> never has a repeat and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> never moves backwards; the answer is the largest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right - left + 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The subtle line:</strong> <span style="color:#f0e2c8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max</code> guards against stale indices: without it "abba" returns 3.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Java details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[128]</code> for ASCII is fastest but throws on 'é'; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Character, Integer&gt;</code> is general but boxes and can return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Alternative:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet&lt;Character&gt;</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code> loop removing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.charAt(left)</code>; still O(n) because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> moves at most n times.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Array or HashMap: which would you pick?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Ask about the alphabet. For ASCII the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[128]</code> avoids hashing and boxing; for unknown input a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Character, Integer&gt;</code> is safe. Both keep the algorithm O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">map.get(ch)</code> return for an unseen key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>. Assigning it to an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> auto-unboxes and throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NullPointerException</code>, so test for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getOrDefault(ch, -1)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle emoji?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Iterate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.codePoints().toArray()</code> and key the map by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> code point instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char</code>, since an emoji is two UTF-16 chars.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this change for "at most k distinct characters"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep counts in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> and shrink while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map.size() &gt; k</code>, removing keys whose count drops to 0.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Substring** | A contiguous run of characters |
| **Sliding window** | A range \`[left, right]\` that grows on the right and shrinks on the left |
| **Last-seen index map** | Character → index of its latest occurrence |
| **Window invariant** | No repeats inside the window; \`left\` never decreases |
| **Amortised O(n)** | Linear total work even if one step does more |
| **Auto-unboxing** | Java turning an \`Integer\` into an \`int\` automatically; fails on \`null\` |

---
**Conclusion:** In Java, the longest substring without repeats is one loop with a last-seen table and \`left = Math.max(left, last[ch] + 1)\`: O(n) time, O(1) space with \`int[128]\` for ASCII or O(min(n, k)) with a \`HashMap\` — pick by asking about the alphabet. The same grow-right, shrink-left window, with a different validity rule, solves [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring), where the window must *contain* characters instead of *avoid* repeats.`,
        examples: [
          {
            label: `Sliding window with last-seen indices on eight inputs`,
            code: `import java.util.Arrays;

public class Main {
    // Returns the substring itself; its length() is the answer.
    static String longestUnique(String s) {
        int[] last = new int[128];     // ASCII input: index = char code, value = last index
        Arrays.fill(last, -1);
        int left = 0, best = 0, bestStart = 0;
        for (int right = 0; right < s.length(); right++) {
            char ch = s.charAt(right);
            if (last[ch] >= 0) {
                left = Math.max(left, last[ch] + 1); // jump past the repeat, never backwards
            }
            last[ch] = right;
            if (right - left + 1 > best) {
                best = right - left + 1;
                bestStart = left;
            }
        }
        return s.substring(bestStart, bestStart + best);
    }

    static String fmt(String w) {
        return w.length() + " (" + w + ")";
    }

    public static void main(String[] args) {
        System.out.println(fmt(longestUnique("abcabcbb"))); // 3 (abc)
        System.out.println(fmt(longestUnique("bbbbb")));    // 1 (b)
        System.out.println(fmt(longestUnique("pwwkew")));   // 3 (wke)
        System.out.println(fmt(longestUnique("")));         // 0 ()
        System.out.println(fmt(longestUnique(" ")));        // 1 ( )
        System.out.println(fmt(longestUnique("dvdf")));     // 3 (vdf)
        System.out.println(fmt(longestUnique("abba")));     // 2 (ab)
        System.out.println(fmt(longestUnique("tmmzuxt")));  // 5 (mzuxt)
    }
}`,
          },
          {
            label: `Why max(left, last + 1): trace and buggy vs fixed vs set`,
            code: `import java.util.*;

// Why left = Math.max(left, last + 1)? Trace "abba", then compare three versions.
public class Main {
    static int fixed(String s, boolean show) {
        Map<Character, Integer> last = new HashMap<>();
        int left = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            char ch = s.charAt(right);
            Integer prev = last.get(ch);           // null when unseen (boxed Integer)
            if (prev != null) left = Math.max(left, prev + 1);
            last.put(ch, right);
            best = Math.max(best, right - left + 1);
            if (show) {
                System.out.println("right=" + right + " ch=" + ch + " left=" + left
                    + " window=" + s.substring(left, right + 1) + " best=" + best);
            }
        }
        return best;
    }

    static int buggy(String s) {
        // Forgets the max(): a stale index from before the window drags left backwards
        Map<Character, Integer> last = new HashMap<>();
        int left = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            char ch = s.charAt(right);
            if (last.containsKey(ch)) left = last.get(ch) + 1;
            last.put(ch, right);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }

    static int[] setVersion(String s) {
        // Alternative: shrink one step at a time with a HashSet; counts how often left moves
        Set<Character> window = new HashSet<>();
        int left = 0, best = 0, moves = 0;
        for (int right = 0; right < s.length(); right++) {
            char ch = s.charAt(right);
            while (window.contains(ch)) {
                window.remove(s.charAt(left));
                left++;
                moves++;
            }
            window.add(ch);
            best = Math.max(best, right - left + 1);
        }
        return new int[]{best, moves};
    }

    public static void main(String[] args) {
        fixed("abba", true);
        for (String s : new String[]{"abba", "tmmzuxt", "abcabcbb", "pwwkew"}) {
            int[] r = setVersion(s);
            System.out.println(s + ": fixed=" + fixed(s, false) + " buggy=" + buggy(s)
                + " set=" + r[0] + " (left moved " + r[1] + " times)");
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a string, find the length of the longest substring that has no repeating characters. For example, for 'abcabcbb' the answer is 3, for 'abc'. Please write it in C++ and walk me through its complexity."

**What a strong answer should cover:**
- Brute force over all substrings is O(n²) to O(n³); the expected answer is a variable-size sliding window in O(n).
- A last-seen index map so \`left\` can jump past the earlier copy, and why the jump must be \`max(left, last + 1)\` (stale indices, the "abba" case).
- The window invariant: no repeats inside \`s[left..right]\`, \`left\` never decreases; window length is \`right - left + 1\`.
- Space O(min(n, k)) for alphabet size k, and the set-based alternative that shrinks one step at a time.
- C++ specifics: an \`array<int, 256>\` last-seen table indexed by \`unsigned char\` (a plain \`char\` can be negative), \`unordered_map::find\` instead of \`operator[]\` (which inserts), and \`std::string\` being bytes, so a UTF-8 emoji is four of them.

**Clarifying questions expected:**
- "What is the character set — ASCII, lowercase only, or Unicode?"
- "Do you want the length or the substring itself?"

**Code / implementation expected:** Yes — a \`longestUnique(const string& s)\` style function in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know strings, loops and what a map is.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`g++ -std=c++17\`.

## 1. Why This Even Matters — A Story First

You are reading a long necklace of coloured beads through a magnifying glass, and you want the longest stretch where **no colour repeats**. You slide the glass to the right one bead at a time. The moment a colour shows up that is already under the glass, you do not start over — you just slide the **left edge** of the glass past the earlier bead of that colour, and keep going. The glass only ever moves forward, on both edges.

That magnifying glass is a **sliding window**, and this problem is the textbook example of a *variable-size* window: it grows on the right and shrinks on the left as needed. It is one of the most asked string questions because it is short, the brute force is obvious, and the optimal version has one subtle line (\`left = max(left, last + 1)\`) that separates people who memorised it from people who understand it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want the length only, or the substring itself? | Returning the substring needs the start index of the best window. |
| What characters can appear — lowercase letters, ASCII, any Unicode? | Decides whether a fixed array of 26 or 128 slots works or a hash map is needed, and how "a character" is counted in your language. |
| Is it case-sensitive? Do spaces count? | "A" and "a" are different characters unless told otherwise; a space is a character. |
| Substring or subsequence? | A substring is contiguous. A subsequence may skip characters — a different problem. |

## 3. The Core Idea in Plain Language

📌 **Interview term: Substring** — a contiguous run of characters, such as "bca" inside "abcabcbb". (A *subsequence* may skip characters; this problem is about substrings.)

📌 **Interview term: Sliding window** — two indices \`left\` and \`right\` that mark a range \`s[left..right]\`; \`right\` advances every step and \`left\` advances only when the range breaks a rule. Here the rule is "no repeated character". The general pattern has its own page: [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).

The brute force checks every substring, O(n²) of them, and checking each for repeats costs up to O(n) more: O(n³), or O(n²) with an incremental set. The window does it in one pass, because of one observation: if \`s[left..right-1]\` has no repeats and \`s[right]\` repeats something inside it, then **every** window that starts at or before that earlier copy and ends at \`right\` also contains the repeat. So \`left\` can jump straight past the earlier copy.

📌 **Interview term: Last-seen index map** — a map from character to the index where it last appeared. It lets \`left\` jump in O(1) instead of creeping forward one step at a time.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="String abcabcbb at right 3: the repeat of a moves left to index 1">
  <defs>
    <marker id="b08q3a-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="28" text-anchor="middle">right = 3 sees a again: left jumps to 1</text>
  <rect class="d-box-muted" x="47" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="75" y="92" text-anchor="middle">a</text>
  <rect class="d-box-accent" x="117" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="145" y="92" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="187" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="215" y="92" text-anchor="middle">c</text>
  <rect class="d-box-accent" x="257" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="285" y="92" text-anchor="middle">a</text>
  <rect class="d-box" x="327" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="355" y="92" text-anchor="middle">b</text>
  <rect class="d-box" x="397" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="425" y="92" text-anchor="middle">c</text>
  <rect class="d-box" x="467" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="495" y="92" text-anchor="middle">b</text>
  <rect class="d-box" x="537" y="60" width="56" height="52" rx="8"/>
  <text class="d-text" x="565" y="92" text-anchor="middle">b</text>
  <path class="d-edge-accent" d="M 145 172 L 145 124" marker-end="url(#b08q3a-cpp)"/>
  <text class="d-text d-accent" x="145" y="200" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 285 172 L 285 124" marker-end="url(#b08q3a-cpp)"/>
  <text class="d-text d-accent" x="285" y="200" text-anchor="middle">right</text>
</svg>

At \`right = 3\` the character is \`a\`, last seen at index 0. The window "abc" becomes "bca": \`left\` jumps to 0 + 1 = 1.

### The subtle line: why max(left, last + 1)

The last-seen map is never cleaned up, so it can hold an index from **before** the current window. Take "abba":

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="String abba at right 3: last a is index 0, which is behind left, so left stays at 2">
  <defs>
    <marker id="b08q3b-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="28" text-anchor="middle">abba, right = 3: last a is 0, left stays 2</text>
  <rect class="d-box-muted" x="120" y="60" width="70" height="52" rx="8"/>
  <text class="d-text" x="155" y="92" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="230" y="60" width="70" height="52" rx="8"/>
  <text class="d-text" x="265" y="92" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="340" y="60" width="70" height="52" rx="8"/>
  <text class="d-text" x="375" y="92" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="450" y="60" width="70" height="52" rx="8"/>
  <text class="d-text" x="485" y="92" text-anchor="middle">a</text>
  <path class="d-edge-accent" d="M 155 172 L 155 124" marker-end="url(#b08q3b-cpp)"/>
  <text class="d-text d-accent" x="155" y="200" text-anchor="middle">stale</text>
  <path class="d-edge-accent" d="M 375 172 L 375 124" marker-end="url(#b08q3b-cpp)"/>
  <text class="d-text d-accent" x="375" y="200" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 485 172 L 485 124" marker-end="url(#b08q3b-cpp)"/>
  <text class="d-text d-accent" x="485" y="200" text-anchor="middle">right</text>
</svg>

At \`right = 2\` the second \`b\` pushes \`left\` to 2. At \`right = 3\`, \`a\` was last seen at index 0 — but index 0 is already outside the window. Setting \`left = 0 + 1 = 1\` would move \`left\` **backwards** and re-admit the duplicate \`b\`, giving the wrong answer 3 ("bba"). Taking \`max(left, last + 1)\` keeps \`left\` at 2.

📌 **Interview term: Window invariant** — a fact that is true after every step. Here: \`s[left..right]\` contains no repeated character, and \`left\` never decreases. Every line of the loop exists to keep that invariant.

📌 **Interview term: Amortised O(n)** — total work over the whole run is linear even if a single step does more; in the set-based variant, \`left\` moves at most n times in total.

## 4. From Brute Force to One Pass

| Approach | Time | Space | Verdict |
| :--- | :--- | :--- | :--- |
| Every substring, check for repeats | O(n³) | O(k) | Correct, far too slow |
| Every start, extend with a set until a repeat | O(n²) | O(k) | Better; still quadratic |
| Sliding window with a set, shrink step by step | O(n) | O(k) | Each index enters and leaves once |
| **Sliding window with last-seen indices** | **O(n)** | **O(k)** | One jump per repeat; the expected answer |

### The C++ code

~~~cpp
// Returns the substring itself; its size() is the answer.
string longestUnique(const string& s) {
    array<int, 256> last;          // one slot per byte value
    last.fill(-1);
    int left = 0, best = 0, bestStart = 0;
    for (int right = 0; right < static_cast<int>(s.size()); right++) {
        unsigned char ch = s[right];   // unsigned: a plain char may be negative
        if (last[ch] >= 0) {
            left = max(left, last[ch] + 1); // jump past the repeat, never backwards
        }
        last[ch] = right;
        if (right - left + 1 > best) {
            best = right - left + 1;
            bestStart = left;
        }
    }
    return s.substr(bestStart, best);
}
~~~

C++ points worth saying:

- \`array<int, 256>\` with \`fill(-1)\` covers every byte value, so it works for any \`std::string\`, with no hashing.
- \`unsigned char ch = s[right]\` is important. Whether plain \`char\` is signed is implementation-defined; on this x86-64 lab machine it is signed: the first byte of "é" read as \`char\` printed -61 and as \`unsigned char\` 195. A negative index into the array would be undefined behaviour.
- In example 2 (the \`unordered_map\` version) the code uses \`last.find(ch)\` — \`last[ch]\` would **insert** a zero entry for an unseen key, which reads as "seen at index 0".
- \`std::string\` stores bytes, not characters: in the lab \`std::string("😀").size()\` was 4 (UTF-8). This solution treats each byte as a character, which is right for ASCII and wrong for multi-byte text.

## 5. Verified: Running the Code

Both programs are the runnable examples on this page; each was run with \`g++ -std=c++17 main.cpp && ./a.out\`.

**Example 1 — the solution on eight inputs**, printing the length and the substring in parentheses:

~~~text
3 (abc)
1 (b)
3 (wke)
0 ()
1 ( )
3 (vdf)
2 (ab)
5 (mzuxt)
~~~

**Example 2 — a trace of "abba", then the correct jump, the buggy jump without \`max\`, and the set version:**

~~~text
right=0 ch=a left=0 window=a best=1
right=1 ch=b left=0 window=ab best=2
right=2 ch=b left=2 window=b best=2
right=3 ch=a left=2 window=ba best=2
abba: fixed=2 buggy=3 set=2 (left moved 2 times)
tmmzuxt: fixed=5 buggy=6 set=5 (left moved 2 times)
abcabcbb: fixed=3 buggy=3 set=3 (left moved 7 times)
pwwkew: fixed=3 buggy=3 set=3 (left moved 3 times)
~~~

The trace shows \`left\` staying at 2 when the stale \`a\` is seen at \`right = 3\`. The buggy version, which drops the \`max\`, returns 3 for "abba" and 6 for "tmmzuxt" — both impossible, because those windows contain a repeat. On inputs without stale indices ("abcabcbb", "pwwkew") the bug is invisible, which is why "abba" is the test to write. The set version gets the same answers while moving \`left\` one step at a time (7 moves on "abcabcbb").

## 6. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n) | \`right\` visits each index once and each step does O(1) map work; \`left\` only jumps forward |
| Space | O(min(n, k)) | O(1) — a fixed 256-entry array (O(min(n, k)) with an \`unordered_map\`). |
| Set variant | O(n) time | \`left\` moves at most n times in total, so the inner \`while\` is amortised O(1) |

## Edge Cases to Mention

- **Empty string:** length 0, the loop never runs.
- **One character or a single space** (" "): length 1 — a space is a character.
- **All the same** ("bbbbb"): length 1; \`left\` follows \`right\` every step.
- **All distinct:** the whole string; \`left\` never moves.
- **Stale index** ("abba", "tmmzuxt"): the cases that break the version without \`max\`.
- **The answer is in the middle** ("pwwkew" → "wke"): the best window is recorded when found, not at the end.

## Common Pitfalls

- **Dropping the \`max\`.** \`left = last[ch] + 1\` moves \`left\` backwards on stale entries: "abba" gives 3 and "tmmzuxt" gives 6 in the verified run.
- **Indexing with a signed \`char\`.** Bytes above 127 become negative on this machine (-61 for the first byte of 'é'); cast to \`unsigned char\` first.
- **\`map[ch]\` as a lookup.** \`operator[]\` inserts a default 0, which looks like "seen at index 0"; use \`find\` or \`count\`.
- **Mixing \`int\` and \`size_t\` in the loop.** Comparing a signed \`right\` with \`s.size()\` gives warnings and wrap-around surprises; cast the size once.
- **Treating UTF-8 bytes as characters.** "😀" is 4 bytes; decode code points first if the input is Unicode.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Sliding window with a last-seen table: move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> every step, and on a repeat set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left = max(left, last[ch] + 1)</code>: O(n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The invariant:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[left..right]</code> never has a repeat and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> never moves backwards; the answer is the largest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right - left + 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The subtle line:</strong> <span style="color:#f0e2c8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code> guards against stale indices: without it "abba" returns 3.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. C++ details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">array&lt;int, 256&gt;</code> indexed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unsigned char</code> (plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char</code> was signed in the lab); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> on maps; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::string</code> is bytes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Alternative:</strong> <span style="color:#f0e2c8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_set&lt;char&gt;</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code> loop erasing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[left]</code>; still O(n) because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> moves at most n times.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Array or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_map</code>: which would you pick?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For byte strings, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">array&lt;int, 256&gt;</code>: no hashing, no allocation, O(1) space. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> is needed only for wider keys such as decoded code points.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">last[ch]</code> dangerous on an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_map</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> inserts a value-initialised entry (0) when the key is missing, so an unseen character looks like it was seen at index 0. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle UTF-8 input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Decode to code points first (for example into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::u32string</code>) and key the table by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char32_t</code> in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code>, because one character can be 1 to 4 bytes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this change for "at most k distinct characters"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep counts and a distinct-count integer; shrink while it exceeds k, decrementing it when a count drops to 0.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Substring** | A contiguous run of characters |
| **Sliding window** | A range \`[left, right]\` that grows on the right and shrinks on the left |
| **Last-seen index map** | Character → index of its latest occurrence |
| **Window invariant** | No repeats inside the window; \`left\` never decreases |
| **Amortised O(n)** | Linear total work even if one step does more |
| **Implementation-defined** | Behaviour the compiler chooses and documents, such as whether \`char\` is signed |

---
**Conclusion:** In C++, the longest substring without repeats is one loop with an \`array<int, 256>\` last-seen table indexed by \`unsigned char\` and \`left = max(left, last[ch] + 1)\`: O(n) time, O(1) space — with care for signed \`char\`, map \`operator[]\` and UTF-8 bytes. The same grow-right, shrink-left window, with a different validity rule, solves [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring), where the window must *contain* characters instead of *avoid* repeats.`,
        examples: [
          {
            label: `Sliding window with last-seen indices on eight inputs`,
            code: `#include <algorithm>
#include <array>
#include <iostream>
#include <string>
using namespace std;

// Returns the substring itself; its size() is the answer.
string longestUnique(const string& s) {
    array<int, 256> last;          // one slot per byte value
    last.fill(-1);
    int left = 0, best = 0, bestStart = 0;
    for (int right = 0; right < static_cast<int>(s.size()); right++) {
        unsigned char ch = s[right];   // unsigned: a plain char may be negative
        if (last[ch] >= 0) {
            left = max(left, last[ch] + 1); // jump past the repeat, never backwards
        }
        last[ch] = right;
        if (right - left + 1 > best) {
            best = right - left + 1;
            bestStart = left;
        }
    }
    return s.substr(bestStart, best);
}

string fmt(const string& w) {
    return to_string(w.size()) + " (" + w + ")";
}

int main() {
    cout << fmt(longestUnique("abcabcbb")) << "\\n"; // 3 (abc)
    cout << fmt(longestUnique("bbbbb")) << "\\n";    // 1 (b)
    cout << fmt(longestUnique("pwwkew")) << "\\n";   // 3 (wke)
    cout << fmt(longestUnique("")) << "\\n";         // 0 ()
    cout << fmt(longestUnique(" ")) << "\\n";        // 1 ( )
    cout << fmt(longestUnique("dvdf")) << "\\n";     // 3 (vdf)
    cout << fmt(longestUnique("abba")) << "\\n";     // 2 (ab)
    cout << fmt(longestUnique("tmmzuxt")) << "\\n";  // 5 (mzuxt)
}`,
          },
          {
            label: `Why max(left, last + 1): trace and buggy vs fixed vs set`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
using namespace std;

// Why left = max(left, last + 1)? Trace "abba", then compare three versions.
int fixedVersion(const string& s, bool show) {
    unordered_map<char, int> last;
    int left = 0, best = 0;
    for (int right = 0; right < static_cast<int>(s.size()); right++) {
        char ch = s[right];
        auto it = last.find(ch);           // find, not last[ch]: operator[] would insert 0
        if (it != last.end()) left = max(left, it->second + 1);
        last[ch] = right;
        best = max(best, right - left + 1);
        if (show) {
            cout << "right=" << right << " ch=" << ch << " left=" << left
                 << " window=" << s.substr(left, right - left + 1) << " best=" << best << "\\n";
        }
    }
    return best;
}

int buggy(const string& s) {
    // Forgets the max(): a stale index from before the window drags left backwards
    unordered_map<char, int> last;
    int left = 0, best = 0;
    for (int right = 0; right < static_cast<int>(s.size()); right++) {
        char ch = s[right];
        if (last.count(ch)) left = last[ch] + 1;
        last[ch] = right;
        best = max(best, right - left + 1);
    }
    return best;
}

pair<int, int> setVersion(const string& s) {
    // Alternative: shrink one step at a time with a set; counts how often left moves
    unordered_set<char> window;
    int left = 0, best = 0, moves = 0;
    for (int right = 0; right < static_cast<int>(s.size()); right++) {
        char ch = s[right];
        while (window.count(ch)) {
            window.erase(s[left]);
            left++;
            moves++;
        }
        window.insert(ch);
        best = max(best, right - left + 1);
    }
    return {best, moves};
}

int main() {
    fixedVersion("abba", true);
    for (string s : {"abba", "tmmzuxt", "abcabcbb", "pwwkew"}) {
        auto r = setVersion(s);
        cout << s << ": fixed=" << fixedVersion(s, false) << " buggy=" << buggy(s)
             << " set=" << r.first << " (left moved " << r.second << " times)\\n";
    }
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How do you find the minimum window substring?`,
    difficulty: "hard",
    seoDescription: `Minimum window substring with an expand/shrink sliding window and need/have counters: O(|s| + |t|) time, edge cases, verified code in 4 languages.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given two strings s and t, return the smallest substring of s that contains every character of t, including duplicates. If there is none, return an empty string. For s = 'ADOBECODEBANC' and t = 'ABC' the answer is 'BANC'. Please solve it in Python in linear time."

**What a strong answer should cover:**
- Brute force over all substrings is at least O(n²); the expected answer is a variable-size sliding window: expand right until valid, shrink left while valid, O(|s| + |t|).
- Frequency maps for t (\`need\`) and the window, because duplicates in t matter.
- An O(1) validity check with need/have counters: \`have\` changes only when a count crosses its threshold.
- Recording the answer inside the shrink loop, the leftmost-on-ties rule, and the no-window case.
- Python specifics: \`collections.Counter(t)\` builds the need map in one line and returns 0 for missing keys; \`float("inf")\` as the 'no window yet' length; slice once at the end.

**Clarifying questions expected:**
- "Do duplicate characters in t have to appear that many times?"
- "What do I return if no window exists, or if t is empty?"

**Code / implementation expected:** Yes — a \`min_window(s, t)\` function in Python with expand/shrink and need/have counters.`,
        answer: `**Target Audience:** Intermediate candidates — you should know strings, maps and the basic sliding window idea; every term is still defined here.
**Difficulty:** Hard
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`python3\`.

## 1. Why This Even Matters — A Story First

You have a shopping list — one apple, one banana, one carrot — and a long market street where stalls sell one item each, in a fixed order. You want the **shortest stretch of consecutive stalls** where you can buy everything on your list. You walk forward, adding stalls to your stretch until you have everything. Then you try to drop stalls from the back of your stretch while you still have everything, because a shorter stretch is better. When dropping one more would lose something you need, you walk forward again.

That is minimum window substring: a sliding window that **expands** until it is valid and **shrinks** while it stays valid. It is rated hard not because the idea is exotic, but because the bookkeeping — counts with duplicates, knowing in O(1) when the window is valid, the exact moment to record the answer — has several places to go wrong. Interviewers use it to see whether you can keep an invariant straight under pressure.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do duplicates in t count? (t = "AABC" needs two A's?) | Yes in the classic problem; this is why you need counts, not a set. |
| What should be returned when no window exists? | Usually the empty string. Also ask about an empty t. |
| Is it case-sensitive, and what is the character set? | Decides between a fixed array of 128 counts and a hash map. |
| If several windows have the minimum length, which one? | The usual answer is the leftmost; recording only strictly smaller windows gives that. |
| How long are s and t? | With s up to 10⁵, an O(n²) scan is too slow; the window is O(\\|s\\| + \\|t\\|). |

## 3. The Core Idea in Plain Language

**The problem:** given strings s and t, return the shortest substring of s that contains every character of t, **including duplicates**. For s = "ADOBECODEBANC" and t = "ABC" the answer is "BANC".

📌 **Interview term: Covering window** — a substring of s that contains each character of t at least as many times as t does. We want the shortest covering window.

📌 **Interview term: Frequency map** — a count of each character, e.g. t = "AABC" gives {A: 2, B: 1, C: 1}. Here it is called \`need\`, and a second map \`window\` counts what is inside the current window.

<svg class="iq-diagram" width="100%" viewBox="0 0 696 230" role="img" aria-label="String ADOBECODEBANC with the smallest window BANC at indices 9 to 12">
  <defs>
    <marker id="b08q4a-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="348" y="28" text-anchor="middle">s = ADOBECODEBANC, t = ABC: the answer is BANC</text>
  <rect class="d-box" x="40" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="60" y="92" text-anchor="middle">A</text>
  <rect class="d-box" x="88" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="108" y="92" text-anchor="middle">D</text>
  <rect class="d-box" x="136" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="156" y="92" text-anchor="middle">O</text>
  <rect class="d-box" x="184" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="204" y="92" text-anchor="middle">B</text>
  <rect class="d-box" x="232" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="252" y="92" text-anchor="middle">E</text>
  <rect class="d-box" x="280" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="300" y="92" text-anchor="middle">C</text>
  <rect class="d-box" x="328" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="348" y="92" text-anchor="middle">O</text>
  <rect class="d-box" x="376" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="396" y="92" text-anchor="middle">D</text>
  <rect class="d-box" x="424" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="444" y="92" text-anchor="middle">E</text>
  <rect class="d-box-accent" x="472" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="492" y="92" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="520" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="540" y="92" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="568" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="588" y="92" text-anchor="middle">N</text>
  <rect class="d-box-accent" x="616" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="636" y="92" text-anchor="middle">C</text>
  <path class="d-edge-accent" d="M 60 172 L 60 124" marker-end="url(#b08q4a-python)"/>
  <text class="d-text d-accent" x="60" y="200" text-anchor="middle">first</text>
  <path class="d-edge-accent" d="M 492 172 L 492 124" marker-end="url(#b08q4a-python)"/>
  <text class="d-text d-accent" x="492" y="200" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 636 172 L 636 124" marker-end="url(#b08q4a-python)"/>
  <text class="d-text d-accent" x="636" y="200" text-anchor="middle">right</text>
</svg>

The first covering window found is "ADOBEC" (indices 0 to 5). Shrinking and expanding later finds "BANC" (indices 9 to 12), which is shorter.

### Expand, then shrink

📌 **Interview term: Variable-size sliding window** — a window whose right edge moves every step and whose left edge moves only to restore or exploit a condition. See [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Expand right until the window is valid, then shrink left while it stays valid">
  <defs>
    <marker id="b08q4b-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="64" width="250" height="104" rx="12"/>
  <text class="d-text" x="165" y="96" text-anchor="middle">EXPAND</text>
  <text class="d-sub" x="165" y="124" text-anchor="middle">right moves one step</text>
  <text class="d-sub" x="165" y="148" text-anchor="middle">add s[right] to counts</text>
  <rect class="d-box-accent" x="390" y="64" width="250" height="104" rx="12"/>
  <text class="d-text d-accent" x="515" y="96" text-anchor="middle">SHRINK</text>
  <text class="d-sub" x="515" y="124" text-anchor="middle">record best window</text>
  <text class="d-sub" x="515" y="148" text-anchor="middle">drop s[left], left + 1</text>
  <path class="d-edge-accent" d="M 294 92 L 386 92" marker-end="url(#b08q4b-python)"/>
  <text class="d-sub" x="340" y="44" text-anchor="middle">valid</text>
  <path class="d-edge-dashed" d="M 386 140 L 294 140" marker-end="url(#b08q4b-python)"/>
  <text class="d-sub" x="340" y="200" text-anchor="middle">invalid again</text>
</svg>

1. **Expand:** move \`right\` one step and add \`s[right]\` to \`window\`.
2. **While the window covers t:** record it if it is the shortest so far, then remove \`s[left]\` and move \`left\` forward.
3. Repeat until \`right\` reaches the end.

Why shrinking greedily is safe: when the window \`[left, right]\` is valid, every window \`[left, r']\` with r' > right is longer, so \`left\` can never be the start of a *shorter* answer later. Recording and dropping it loses nothing. Both edges only move forward, so each character is added once and removed at most once.

### Knowing "is it valid?" in O(1)

Checking every character of \`need\` against \`window\` on every step costs O(k) each time. The standard trick keeps one integer:

📌 **Interview term: need/have counters** — \`required\` is the number of **distinct** characters in t; \`have\` is how many of them currently have \`window[c] >= need[c]\`. The window is valid exactly when \`have == required\`. \`have\` changes only when a count **crosses** its threshold: up when \`window[c]\` becomes equal to \`need[c]\`, down when it drops below. The full mechanics, a step-by-step trace and the classic off-by-one bugs are in the companion question [need/have counters explained](/interview-question/minimum-window-substring-how-does-the-sliding-window-with-need-have-counters-wor).

## 4. From Brute Force to the Sliding Window

| Approach | Time | Space | Verdict |
| :--- | :--- | :--- | :--- |
| Every substring, count and compare | O(n² · k) or worse | O(k) | Too slow |
| Every start, extend until covering, then stop | O(n²) worst case | O(k) | Example 2 uses this as the test oracle |
| **Expand/shrink window with need/have** | **O(\\|s\\| + \\|t\\|)** | **O(k)** | The expected answer |

### The Python code

~~~python
def min_window(s, t):
    if not s or not t:
        return ""
    need = Counter(t)              # char -> how many copies the window must hold
    required = len(need)           # distinct chars that must be satisfied
    window = {}
    have = 0                       # distinct chars currently satisfied
    best_len, best_start = float("inf"), 0
    left = 0
    for right, ch in enumerate(s):
        window[ch] = window.get(ch, 0) + 1
        if ch in need and window[ch] == need[ch]:
            have += 1              # this char just became satisfied
        while have == required:    # valid: try to shrink from the left
            if right - left + 1 < best_len:
                best_len, best_start = right - left + 1, left
            out = s[left]
            window[out] -= 1
            if out in need and window[out] < need[out]:
                have -= 1          # removing it broke the window
            left += 1
    return "" if best_len == float("inf") else s[best_start:best_start + best_len]
~~~

Python points worth saying:

- \`Counter(t)\` is a \`dict\` subclass that counts for you. Looking up a missing key returns 0 instead of raising: in the lab \`Counter("ABC")["Z"]\` was 0, while \`"Z" in c\` stayed \`False\` (the lookup does not insert).
- \`len(need)\` is the number of **distinct** characters: 3 for "ABC", and still 3 for "AABC".
- \`ch in need and window[ch] == need[ch]\` — the \`in\` check matters because characters not in t must never change \`have\`.
- \`float("inf")\` marks "no window found yet"; the final line turns it into "".
- Only the start and length of the best window are stored; the slice happens once.

## 5. Verified: Running the Code

Both programs are the runnable examples on this page; each was run with \`python3 main.py\`.

**Example 1 — the solution on eight inputs**, printing the length and the window in parentheses (empty parentheses mean no window):

~~~text
4 (BANC)
1 (a)
0 ()
2 (aa)
1 (b)
2 (ba)
0 ()
4 (cwae)
~~~

**Example 2 — brute force vs sliding window:** 300 random pairs over the alphabet "abc", then one 3,000-character string over ten letters with t = "aabbccj":

~~~text
random tests: 300, mismatches: 0
n=3000 brute length=8 steps=94288
n=3000 sliding length=8 steps=5957
same window: true
~~~

The two methods agree on every random case and on the large one. The brute force stops extending from a start as soon as it covers t, which keeps it well under n² on this input, but it still did about 16 times more work (94,288 steps vs 5,957). The sliding window's 5,957 steps are the 3,000 expansions plus 2,957 shrink steps — under 2n, as the analysis promises.

## 6. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(\\|s\\| + \\|t\\|) | Building \`need\` is \\|t\\|; each character of s is added once and removed at most once |
| Space | O(k) | O(k) for \`need\` and \`window\`, where k is the number of distinct characters in s and t. |
| Validity check | O(1) per step | The \`have\` counter replaces an O(k) comparison of the two maps |

## Edge Cases to Mention

- **t longer than s, or t needs more copies than s has** (s = "a", t = "aa"): no window, return "".
- **Empty t or empty s:** return "" (state your convention).
- **s equals t** (s = "aa", t = "aa"): the whole string.
- **Answer at the very start or end:** "ab" with t = "b" gives "b"; "bba" with t = "ab" gives "ba".
- **Characters of t interleaved with many extras** ("cabwefgewcwaefgcf", t = "cae"): answer "cwae" — the window must skip letters not in t on both sides.

## Common Pitfalls

- **Using a \`set\` for t.** It loses duplicates: t = "AABC" would accept a window with one A.
- **Incrementing \`have\` with \`>=\` instead of \`==\`.** It counts the same character again for every extra copy; the companion question shows it returning "BA" for the classic input.
- **Recording the best window after the shrink loop.** By then the window is invalid. Record inside the \`while\`, before removing \`s[left]\`.
- **Slicing \`s[left:right + 1]\` on every valid step.** It copies characters each time; store indices and slice once.
- **Rescanning \`all(window[c] >= need[c] for c in need)\` every step.** Correct but O(k) per step; the \`have\` counter makes it O(1).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Sliding window: expand <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> and count characters; while the window covers t, record it and shrink from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code>. O(|s| + |t|) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Validity in O(1):</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">required = len(Counter(t))</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> counts characters whose window count reached the need. Valid exactly when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have == required</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When counters change:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have += 1</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window[c] == need[c]</code> after adding; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have -= 1</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window[c] &lt; need[c]</code> after removing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code> for need (missing keys read as 0), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float("inf")</code> as the sentinel, slice once at the end.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verified:</strong> <span style="color:#f0e2c8;">Matched an O(n²) brute force on 300 random strings; on n = 3000 it took 5,957 steps against 94,288.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it O(|s| + |t|) when there is a nested <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> only moves forward and never passes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code>, so across the whole run the inner loop executes at most |s| times. Building <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">need</code> costs |t|.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why count distinct characters in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">required</code>, not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">len(t)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> counts characters whose quota is fully met. The alternative single counter <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">missing = len(t)</code> counts copies instead; both work if updated consistently.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you speed it up when s has many characters not in t?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pre-filter: build a list of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(index, char)</code> for characters in t only, and run the window over that list. Same complexity, fewer steps when t is small.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if several windows have the same minimum length?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recording only on strictly smaller length returns the leftmost one; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> to get the rightmost.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Covering window** | A substring holding every character of t, with multiplicity |
| **Frequency map** | Character → count |
| **Variable-size sliding window** | Right edge moves every step, left edge moves to restore or exploit a condition |
| **need/have counters** | \`have\` = distinct characters at quota; valid when \`have == required\` |

---
**Conclusion:** In Python, minimum window substring is \`Counter(t)\` plus an expand/shrink loop with \`have\` and \`required\`: O(|s| + |t|) time, O(k) space, with the answer recorded inside the shrink loop and sliced once at the end. It is the same window as [longest substring without repeating characters](/interview-question/how-do-you-find-the-longest-substring-without-repeating-characters) with the rule flipped: there the window must avoid repeats and we want it long; here it must cover t and we want it short.`,
        examples: [
          {
            label: `Minimum window substring on eight inputs`,
            code: `from collections import Counter


def min_window(s, t):
    if not s or not t:
        return ""
    need = Counter(t)              # char -> how many copies the window must hold
    required = len(need)           # distinct chars that must be satisfied
    window = {}
    have = 0                       # distinct chars currently satisfied
    best_len, best_start = float("inf"), 0
    left = 0
    for right, ch in enumerate(s):
        window[ch] = window.get(ch, 0) + 1
        if ch in need and window[ch] == need[ch]:
            have += 1              # this char just became satisfied
        while have == required:    # valid: try to shrink from the left
            if right - left + 1 < best_len:
                best_len, best_start = right - left + 1, left
            out = s[left]
            window[out] -= 1
            if out in need and window[out] < need[out]:
                have -= 1          # removing it broke the window
            left += 1
    return "" if best_len == float("inf") else s[best_start:best_start + best_len]


def fmt(w):
    return str(len(w)) + " (" + w + ")"


print(fmt(min_window("ADOBECODEBANC", "ABC")))  # 4 (BANC)
print(fmt(min_window("a", "a")))  # 1 (a)
print(fmt(min_window("a", "aa")))  # 0 ()
print(fmt(min_window("aa", "aa")))  # 2 (aa)
print(fmt(min_window("ab", "b")))  # 1 (b)
print(fmt(min_window("bba", "ab")))  # 2 (ba)
print(fmt(min_window("ADOBECODEBANC", "")))  # 0 ()
print(fmt(min_window("cabwefgewcwaefgcf", "cae")))  # 4 (cwae)`,
          },
          {
            label: `Brute force vs sliding window: same answers, far fewer steps`,
            code: `# Brute force O(n^2) vs sliding window O(n): same answers, very different work.
def covers(counts, need):
    return all(counts[c] >= k for c, k in need.items())


def brute_force(s, t):
    need = {}
    for c in t:
        need[c] = need.get(c, 0) + 1
    best, steps = "", 0
    for i in range(len(s)):
        counts = {c: 0 for c in need}
        for j in range(i, len(s)):
            steps += 1
            if s[j] in counts:
                counts[s[j]] += 1
            if covers(counts, need):
                if best == "" or j - i + 1 < len(best):
                    best = s[i:j + 1]
                break              # longer windows from this start cannot be shorter
    return best, steps


def sliding(s, t):
    need = {}
    for c in t:
        need[c] = need.get(c, 0) + 1
    required, have, window = len(need), 0, {}
    best_len, best_start, left, steps = -1, 0, 0, 0
    for right, ch in enumerate(s):
        steps += 1
        window[ch] = window.get(ch, 0) + 1
        if ch in need and window[ch] == need[ch]:
            have += 1
        while have == required:
            steps += 1
            if best_len == -1 or right - left + 1 < best_len:
                best_len, best_start = right - left + 1, left
            out = s[left]
            window[out] -= 1
            if out in need and window[out] < need[out]:
                have -= 1
            left += 1
    return ("" if best_len == -1 else s[best_start:best_start + best_len]), steps


seed = 2024
def next_rand():
    global seed
    seed = seed * 48271 % 2147483647
    return seed


def rand_string(n, alphabet):
    return "".join(alphabet[next_rand() % len(alphabet)] for _ in range(n))


mismatches = 0
for _ in range(300):
    s = rand_string(next_rand() % 30, "abc")
    t = rand_string(next_rand() % 4 + 1, "abc")
    if brute_force(s, t)[0] != sliding(s, t)[0]:
        mismatches += 1
print("random tests: 300, mismatches: " + str(mismatches))
s = rand_string(3000, "abcdefghij")
t = "aabbccj"
w1, steps1 = brute_force(s, t)
w2, steps2 = sliding(s, t)
print("n=3000 brute length=" + str(len(w1)) + " steps=" + str(steps1))
print("n=3000 sliding length=" + str(len(w2)) + " steps=" + str(steps2))
print("same window: " + str(w1 == w2).lower())`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given two strings s and t, return the smallest substring of s that contains every character of t, including duplicates. If there is none, return an empty string. For s = 'ADOBECODEBANC' and t = 'ABC' the answer is 'BANC'. Please solve it in JavaScript in linear time."

**What a strong answer should cover:**
- Brute force over all substrings is at least O(n²); the expected answer is a variable-size sliding window: expand right until valid, shrink left while valid, O(|s| + |t|).
- Frequency maps for t (\`need\`) and the window, because duplicates in t matter.
- An O(1) validity check with need/have counters: \`have\` changes only when a count crosses its threshold.
- Recording the answer inside the shrink loop, the leftmost-on-ties rule, and the no-window case.
- JavaScript specifics: \`Map\` for need and window counts with \`(map.get(c) || 0) + 1\`, \`need.size\` as the distinct count, \`Infinity\` as the sentinel, and \`===\` for the threshold checks.

**Clarifying questions expected:**
- "Do duplicate characters in t have to appear that many times?"
- "What do I return if no window exists, or if t is empty?"

**Code / implementation expected:** Yes — a \`minWindow(s, t)\` function in JavaScript with expand/shrink and need/have counters.`,
        answer: `**Target Audience:** Intermediate candidates — you should know strings, maps and the basic sliding window idea; every term is still defined here.
**Difficulty:** Hard
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`node\` (the examples are plain browser-safe scripts).

## 1. Why This Even Matters — A Story First

You have a shopping list — one apple, one banana, one carrot — and a long market street where stalls sell one item each, in a fixed order. You want the **shortest stretch of consecutive stalls** where you can buy everything on your list. You walk forward, adding stalls to your stretch until you have everything. Then you try to drop stalls from the back of your stretch while you still have everything, because a shorter stretch is better. When dropping one more would lose something you need, you walk forward again.

That is minimum window substring: a sliding window that **expands** until it is valid and **shrinks** while it stays valid. It is rated hard not because the idea is exotic, but because the bookkeeping — counts with duplicates, knowing in O(1) when the window is valid, the exact moment to record the answer — has several places to go wrong. Interviewers use it to see whether you can keep an invariant straight under pressure.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do duplicates in t count? (t = "AABC" needs two A's?) | Yes in the classic problem; this is why you need counts, not a set. |
| What should be returned when no window exists? | Usually the empty string. Also ask about an empty t. |
| Is it case-sensitive, and what is the character set? | Decides between a fixed array of 128 counts and a hash map. |
| If several windows have the minimum length, which one? | The usual answer is the leftmost; recording only strictly smaller windows gives that. |
| How long are s and t? | With s up to 10⁵, an O(n²) scan is too slow; the window is O(\\|s\\| + \\|t\\|). |

## 3. The Core Idea in Plain Language

**The problem:** given strings s and t, return the shortest substring of s that contains every character of t, **including duplicates**. For s = "ADOBECODEBANC" and t = "ABC" the answer is "BANC".

📌 **Interview term: Covering window** — a substring of s that contains each character of t at least as many times as t does. We want the shortest covering window.

📌 **Interview term: Frequency map** — a count of each character, e.g. t = "AABC" gives {A: 2, B: 1, C: 1}. Here it is called \`need\`, and a second map \`window\` counts what is inside the current window.

<svg class="iq-diagram" width="100%" viewBox="0 0 696 230" role="img" aria-label="String ADOBECODEBANC with the smallest window BANC at indices 9 to 12">
  <defs>
    <marker id="b08q4a-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="348" y="28" text-anchor="middle">s = ADOBECODEBANC, t = ABC: the answer is BANC</text>
  <rect class="d-box" x="40" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="60" y="92" text-anchor="middle">A</text>
  <rect class="d-box" x="88" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="108" y="92" text-anchor="middle">D</text>
  <rect class="d-box" x="136" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="156" y="92" text-anchor="middle">O</text>
  <rect class="d-box" x="184" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="204" y="92" text-anchor="middle">B</text>
  <rect class="d-box" x="232" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="252" y="92" text-anchor="middle">E</text>
  <rect class="d-box" x="280" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="300" y="92" text-anchor="middle">C</text>
  <rect class="d-box" x="328" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="348" y="92" text-anchor="middle">O</text>
  <rect class="d-box" x="376" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="396" y="92" text-anchor="middle">D</text>
  <rect class="d-box" x="424" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="444" y="92" text-anchor="middle">E</text>
  <rect class="d-box-accent" x="472" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="492" y="92" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="520" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="540" y="92" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="568" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="588" y="92" text-anchor="middle">N</text>
  <rect class="d-box-accent" x="616" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="636" y="92" text-anchor="middle">C</text>
  <path class="d-edge-accent" d="M 60 172 L 60 124" marker-end="url(#b08q4a-javascript)"/>
  <text class="d-text d-accent" x="60" y="200" text-anchor="middle">first</text>
  <path class="d-edge-accent" d="M 492 172 L 492 124" marker-end="url(#b08q4a-javascript)"/>
  <text class="d-text d-accent" x="492" y="200" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 636 172 L 636 124" marker-end="url(#b08q4a-javascript)"/>
  <text class="d-text d-accent" x="636" y="200" text-anchor="middle">right</text>
</svg>

The first covering window found is "ADOBEC" (indices 0 to 5). Shrinking and expanding later finds "BANC" (indices 9 to 12), which is shorter.

### Expand, then shrink

📌 **Interview term: Variable-size sliding window** — a window whose right edge moves every step and whose left edge moves only to restore or exploit a condition. See [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Expand right until the window is valid, then shrink left while it stays valid">
  <defs>
    <marker id="b08q4b-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="64" width="250" height="104" rx="12"/>
  <text class="d-text" x="165" y="96" text-anchor="middle">EXPAND</text>
  <text class="d-sub" x="165" y="124" text-anchor="middle">right moves one step</text>
  <text class="d-sub" x="165" y="148" text-anchor="middle">add s[right] to counts</text>
  <rect class="d-box-accent" x="390" y="64" width="250" height="104" rx="12"/>
  <text class="d-text d-accent" x="515" y="96" text-anchor="middle">SHRINK</text>
  <text class="d-sub" x="515" y="124" text-anchor="middle">record best window</text>
  <text class="d-sub" x="515" y="148" text-anchor="middle">drop s[left], left + 1</text>
  <path class="d-edge-accent" d="M 294 92 L 386 92" marker-end="url(#b08q4b-javascript)"/>
  <text class="d-sub" x="340" y="44" text-anchor="middle">valid</text>
  <path class="d-edge-dashed" d="M 386 140 L 294 140" marker-end="url(#b08q4b-javascript)"/>
  <text class="d-sub" x="340" y="200" text-anchor="middle">invalid again</text>
</svg>

1. **Expand:** move \`right\` one step and add \`s[right]\` to \`window\`.
2. **While the window covers t:** record it if it is the shortest so far, then remove \`s[left]\` and move \`left\` forward.
3. Repeat until \`right\` reaches the end.

Why shrinking greedily is safe: when the window \`[left, right]\` is valid, every window \`[left, r']\` with r' > right is longer, so \`left\` can never be the start of a *shorter* answer later. Recording and dropping it loses nothing. Both edges only move forward, so each character is added once and removed at most once.

### Knowing "is it valid?" in O(1)

Checking every character of \`need\` against \`window\` on every step costs O(k) each time. The standard trick keeps one integer:

📌 **Interview term: need/have counters** — \`required\` is the number of **distinct** characters in t; \`have\` is how many of them currently have \`window[c] >= need[c]\`. The window is valid exactly when \`have == required\`. \`have\` changes only when a count **crosses** its threshold: up when \`window[c]\` becomes equal to \`need[c]\`, down when it drops below. The full mechanics, a step-by-step trace and the classic off-by-one bugs are in the companion question [need/have counters explained](/interview-question/minimum-window-substring-how-does-the-sliding-window-with-need-have-counters-wor).

## 4. From Brute Force to the Sliding Window

| Approach | Time | Space | Verdict |
| :--- | :--- | :--- | :--- |
| Every substring, count and compare | O(n² · k) or worse | O(k) | Too slow |
| Every start, extend until covering, then stop | O(n²) worst case | O(k) | Example 2 uses this as the test oracle |
| **Expand/shrink window with need/have** | **O(\\|s\\| + \\|t\\|)** | **O(k)** | The expected answer |

### The JavaScript code

~~~javascript
function minWindow(s, t) {
  if (s.length === 0 || t.length === 0) return '';
  const need = new Map();            // char -> copies the window must hold
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  const required = need.size;        // distinct chars that must be satisfied
  const window = new Map();
  let have = 0;                      // distinct chars currently satisfied
  let bestLen = Infinity, bestStart = 0, left = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    window.set(ch, (window.get(ch) || 0) + 1);
    if (need.has(ch) && window.get(ch) === need.get(ch)) have++;
    while (have === required) {      // valid: try to shrink from the left
      if (right - left + 1 < bestLen) {
        bestLen = right - left + 1;
        bestStart = left;
      }
      const out = s[left];
      window.set(out, window.get(out) - 1);
      if (need.has(out) && window.get(out) < need.get(out)) have--; // broke it
      left++;
    }
  }
  return bestLen === Infinity ? '' : s.slice(bestStart, bestStart + bestLen);
}
~~~

JavaScript points worth saying:

- \`(need.get(c) || 0) + 1\` is the counting idiom: \`get\` returns \`undefined\` for a missing key, and \`undefined || 0\` is 0.
- \`need.size\` is the number of **distinct** characters (3 for both "ABC" and "AABC").
- \`need.has(ch) && window.get(ch) === need.get(ch)\` — the \`has\` check keeps characters that are not in t from ever touching \`have\`.
- \`Infinity\` is a real Number, so \`right - left + 1 < bestLen\` works without a special case on the first window.
- \`s.slice(bestStart, bestStart + bestLen)\` takes start and **end**, not start and length.

## 5. Verified: Running the Code

Both programs are the runnable examples on this page; each was run with \`node main.js\`.

**Example 1 — the solution on eight inputs**, printing the length and the window in parentheses (empty parentheses mean no window):

~~~text
4 (BANC)
1 (a)
0 ()
2 (aa)
1 (b)
2 (ba)
0 ()
4 (cwae)
~~~

**Example 2 — brute force vs sliding window:** 300 random pairs over the alphabet "abc", then one 3,000-character string over ten letters with t = "aabbccj":

~~~text
random tests: 300, mismatches: 0
n=3000 brute length=8 steps=94288
n=3000 sliding length=8 steps=5957
same window: true
~~~

The two methods agree on every random case and on the large one. The brute force stops extending from a start as soon as it covers t, which keeps it well under n² on this input, but it still did about 16 times more work (94,288 steps vs 5,957). The sliding window's 5,957 steps are the 3,000 expansions plus 2,957 shrink steps — under 2n, as the analysis promises.

## 6. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(\\|s\\| + \\|t\\|) | Building \`need\` is \\|t\\|; each character of s is added once and removed at most once |
| Space | O(k) | O(k) for the two Maps (k distinct characters). |
| Validity check | O(1) per step | The \`have\` counter replaces an O(k) comparison of the two maps |

## Edge Cases to Mention

- **t longer than s, or t needs more copies than s has** (s = "a", t = "aa"): no window, return "".
- **Empty t or empty s:** return "" (state your convention).
- **s equals t** (s = "aa", t = "aa"): the whole string.
- **Answer at the very start or end:** "ab" with t = "b" gives "b"; "bba" with t = "ab" gives "ba".
- **Characters of t interleaved with many extras** ("cabwefgewcwaefgcf", t = "cae"): answer "cwae" — the window must skip letters not in t on both sides.

## Common Pitfalls

- **Using a \`Set\` for t.** It loses duplicates: t = "AABC" would accept a window with one A.
- **Incrementing \`have\` with \`>=\` instead of \`===\`.** It counts the same character again for every extra copy; the companion question shows it returning "BA" for the classic input.
- **\`window.get(ch) + 1\` without \`|| 0\`.** \`undefined + 1\` is \`NaN\`, and every comparison with \`NaN\` is false, so the window never becomes valid.
- **Confusing \`slice(start, end)\` with \`substr(start, length)\`.** \`substr\` is a legacy method; use \`slice\` with an end index.
- **Recording the best window after the shrink loop.** The window is invalid by then; record inside the \`while\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Sliding window: expand <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> and count characters in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>; while the window covers t, record it and shrink from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code>. O(|s| + |t|).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Validity in O(1):</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">required = need.size</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> counts characters whose window count reached the need. Valid exactly when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have === required</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When counters change:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have++</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window.get(c) === need.get(c)</code> after adding; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have--</code> when it drops below after removing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. JavaScript details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(map.get(c) || 0) + 1</code> avoids <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Infinity</code> as the sentinel; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice(start, end)</code> once at the end.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verified:</strong> <span style="color:#f0e2c8;">Matched an O(n²) brute force on 300 random strings; on n = 3000 it took 5,957 steps against 94,288.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it O(|s| + |t|) with a nested <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> only moves forward and never passes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code>, so the inner loop runs at most |s| times in total. Building <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">need</code> costs |t|.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Map or an array of 128 counts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For ASCII, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Array(128).fill(0)</code> indexed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">charCodeAt</code> avoids hashing; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> handles any character. Both keep the same complexity.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why count distinct characters, not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">t.length</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> counts characters whose quota is fully met. A single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">missing = t.length</code> counter that counts copies is an equally valid alternative.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if several windows tie for the minimum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recording only on strictly smaller length keeps the leftmost; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> would keep the rightmost.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Covering window** | A substring holding every character of t, with multiplicity |
| **Frequency map** | Character → count |
| **Variable-size sliding window** | Right edge moves every step, left edge moves to restore or exploit a condition |
| **need/have counters** | \`have\` = distinct characters at quota; valid when \`have == required\` |

---
**Conclusion:** In JavaScript, minimum window substring is two \`Map\`s plus an expand/shrink loop with \`have\` and \`required\`: O(|s| + |t|) time, O(k) space — with \`|| 0\` guarding every count and the answer recorded inside the shrink loop. It is the same window as [longest substring without repeating characters](/interview-question/how-do-you-find-the-longest-substring-without-repeating-characters) with the rule flipped: there the window must avoid repeats and we want it long; here it must cover t and we want it short.`,
        examples: [
          {
            label: `Minimum window substring on eight inputs`,
            code: `function minWindow(s, t) {
  if (s.length === 0 || t.length === 0) return '';
  const need = new Map();            // char -> copies the window must hold
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  const required = need.size;        // distinct chars that must be satisfied
  const window = new Map();
  let have = 0;                      // distinct chars currently satisfied
  let bestLen = Infinity, bestStart = 0, left = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    window.set(ch, (window.get(ch) || 0) + 1);
    if (need.has(ch) && window.get(ch) === need.get(ch)) have++;
    while (have === required) {      // valid: try to shrink from the left
      if (right - left + 1 < bestLen) {
        bestLen = right - left + 1;
        bestStart = left;
      }
      const out = s[left];
      window.set(out, window.get(out) - 1);
      if (need.has(out) && window.get(out) < need.get(out)) have--; // broke it
      left++;
    }
  }
  return bestLen === Infinity ? '' : s.slice(bestStart, bestStart + bestLen);
}

function fmt(w) {
  return w.length + ' (' + w + ')';
}

console.log(fmt(minWindow('ADOBECODEBANC', 'ABC'))); // 4 (BANC)
console.log(fmt(minWindow('a', 'a'))); // 1 (a)
console.log(fmt(minWindow('a', 'aa'))); // 0 ()
console.log(fmt(minWindow('aa', 'aa'))); // 2 (aa)
console.log(fmt(minWindow('ab', 'b'))); // 1 (b)
console.log(fmt(minWindow('bba', 'ab'))); // 2 (ba)
console.log(fmt(minWindow('ADOBECODEBANC', ''))); // 0 ()
console.log(fmt(minWindow('cabwefgewcwaefgcf', 'cae'))); // 4 (cwae)`,
          },
          {
            label: `Brute force vs sliding window: same answers, far fewer steps`,
            code: `// Brute force O(n^2) vs sliding window O(n): same answers, very different work.
function countChars(t) {
  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  return need;
}

function bruteForce(s, t) {
  const need = countChars(t);
  let best = '', steps = 0;
  for (let i = 0; i < s.length; i++) {
    const counts = new Map();
    for (let j = i; j < s.length; j++) {
      steps++;
      counts.set(s[j], (counts.get(s[j]) || 0) + 1);
      let ok = true;
      for (const [c, k] of need) if ((counts.get(c) || 0) < k) ok = false;
      if (ok) {
        if (best === '' || j - i + 1 < best.length) best = s.slice(i, j + 1);
        break;                       // longer windows from this start cannot be shorter
      }
    }
  }
  return [best, steps];
}

function sliding(s, t) {
  const need = countChars(t);
  const required = need.size, window = new Map();
  let have = 0, bestLen = -1, bestStart = 0, left = 0, steps = 0;
  for (let right = 0; right < s.length; right++) {
    steps++;
    const ch = s[right];
    window.set(ch, (window.get(ch) || 0) + 1);
    if (need.has(ch) && window.get(ch) === need.get(ch)) have++;
    while (have === required) {
      steps++;
      if (bestLen === -1 || right - left + 1 < bestLen) {
        bestLen = right - left + 1;
        bestStart = left;
      }
      const out = s[left];
      window.set(out, window.get(out) - 1);
      if (need.has(out) && window.get(out) < need.get(out)) have--;
      left++;
    }
  }
  return [bestLen === -1 ? '' : s.slice(bestStart, bestStart + bestLen), steps];
}

let seed = 2024;
function nextRand() {
  seed = (seed * 48271) % 2147483647;
  return seed;
}

function randString(n, alphabet) {
  let out = '';
  for (let i = 0; i < n; i++) out += alphabet[nextRand() % alphabet.length];
  return out;
}

let mismatches = 0;
for (let k = 0; k < 300; k++) {
  const s = randString(nextRand() % 30, 'abc');
  const t = randString(nextRand() % 4 + 1, 'abc');
  if (bruteForce(s, t)[0] !== sliding(s, t)[0]) mismatches++;
}
console.log('random tests: 300, mismatches: ' + mismatches);
const s = randString(3000, 'abcdefghij');
const t = 'aabbccj';
const a = bruteForce(s, t), b = sliding(s, t);
console.log('n=3000 brute length=' + a[0].length + ' steps=' + a[1]);
console.log('n=3000 sliding length=' + b[0].length + ' steps=' + b[1]);
console.log('same window: ' + (a[0] === b[0]));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given two strings s and t, return the smallest substring of s that contains every character of t, including duplicates. If there is none, return an empty string. For s = 'ADOBECODEBANC' and t = 'ABC' the answer is 'BANC'. Please solve it in Java in linear time."

**What a strong answer should cover:**
- Brute force over all substrings is at least O(n²); the expected answer is a variable-size sliding window: expand right until valid, shrink left while valid, O(|s| + |t|).
- Frequency maps for t (\`need\`) and the window, because duplicates in t matter.
- An O(1) validity check with need/have counters: \`have\` changes only when a count crosses its threshold.
- Recording the answer inside the shrink loop, the leftmost-on-ties rule, and the no-window case.
- Java specifics: \`int[128]\` count arrays for ASCII (no boxing; a \`HashMap<Character, Integer>\` otherwise), \`Integer.MAX_VALUE\` as the sentinel, and comparing \`String\` results with \`equals\`, never \`==\`.

**Clarifying questions expected:**
- "Do duplicate characters in t have to appear that many times?"
- "What do I return if no window exists, or if t is empty?"

**Code / implementation expected:** Yes — a \`static String minWindow(String s, String t)\` method in Java.`,
        answer: `**Target Audience:** Intermediate candidates — you should know strings, maps and the basic sliding window idea; every term is still defined here.
**Difficulty:** Hard
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`javac\` and \`java\`.

## 1. Why This Even Matters — A Story First

You have a shopping list — one apple, one banana, one carrot — and a long market street where stalls sell one item each, in a fixed order. You want the **shortest stretch of consecutive stalls** where you can buy everything on your list. You walk forward, adding stalls to your stretch until you have everything. Then you try to drop stalls from the back of your stretch while you still have everything, because a shorter stretch is better. When dropping one more would lose something you need, you walk forward again.

That is minimum window substring: a sliding window that **expands** until it is valid and **shrinks** while it stays valid. It is rated hard not because the idea is exotic, but because the bookkeeping — counts with duplicates, knowing in O(1) when the window is valid, the exact moment to record the answer — has several places to go wrong. Interviewers use it to see whether you can keep an invariant straight under pressure.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do duplicates in t count? (t = "AABC" needs two A's?) | Yes in the classic problem; this is why you need counts, not a set. |
| What should be returned when no window exists? | Usually the empty string. Also ask about an empty t. |
| Is it case-sensitive, and what is the character set? | Decides between a fixed array of 128 counts and a hash map. |
| If several windows have the minimum length, which one? | The usual answer is the leftmost; recording only strictly smaller windows gives that. |
| How long are s and t? | With s up to 10⁵, an O(n²) scan is too slow; the window is O(\\|s\\| + \\|t\\|). |

## 3. The Core Idea in Plain Language

**The problem:** given strings s and t, return the shortest substring of s that contains every character of t, **including duplicates**. For s = "ADOBECODEBANC" and t = "ABC" the answer is "BANC".

📌 **Interview term: Covering window** — a substring of s that contains each character of t at least as many times as t does. We want the shortest covering window.

📌 **Interview term: Frequency map** — a count of each character, e.g. t = "AABC" gives {A: 2, B: 1, C: 1}. Here it is called \`need\`, and a second map \`window\` counts what is inside the current window.

<svg class="iq-diagram" width="100%" viewBox="0 0 696 230" role="img" aria-label="String ADOBECODEBANC with the smallest window BANC at indices 9 to 12">
  <defs>
    <marker id="b08q4a-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="348" y="28" text-anchor="middle">s = ADOBECODEBANC, t = ABC: the answer is BANC</text>
  <rect class="d-box" x="40" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="60" y="92" text-anchor="middle">A</text>
  <rect class="d-box" x="88" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="108" y="92" text-anchor="middle">D</text>
  <rect class="d-box" x="136" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="156" y="92" text-anchor="middle">O</text>
  <rect class="d-box" x="184" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="204" y="92" text-anchor="middle">B</text>
  <rect class="d-box" x="232" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="252" y="92" text-anchor="middle">E</text>
  <rect class="d-box" x="280" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="300" y="92" text-anchor="middle">C</text>
  <rect class="d-box" x="328" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="348" y="92" text-anchor="middle">O</text>
  <rect class="d-box" x="376" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="396" y="92" text-anchor="middle">D</text>
  <rect class="d-box" x="424" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="444" y="92" text-anchor="middle">E</text>
  <rect class="d-box-accent" x="472" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="492" y="92" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="520" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="540" y="92" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="568" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="588" y="92" text-anchor="middle">N</text>
  <rect class="d-box-accent" x="616" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="636" y="92" text-anchor="middle">C</text>
  <path class="d-edge-accent" d="M 60 172 L 60 124" marker-end="url(#b08q4a-java)"/>
  <text class="d-text d-accent" x="60" y="200" text-anchor="middle">first</text>
  <path class="d-edge-accent" d="M 492 172 L 492 124" marker-end="url(#b08q4a-java)"/>
  <text class="d-text d-accent" x="492" y="200" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 636 172 L 636 124" marker-end="url(#b08q4a-java)"/>
  <text class="d-text d-accent" x="636" y="200" text-anchor="middle">right</text>
</svg>

The first covering window found is "ADOBEC" (indices 0 to 5). Shrinking and expanding later finds "BANC" (indices 9 to 12), which is shorter.

### Expand, then shrink

📌 **Interview term: Variable-size sliding window** — a window whose right edge moves every step and whose left edge moves only to restore or exploit a condition. See [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Expand right until the window is valid, then shrink left while it stays valid">
  <defs>
    <marker id="b08q4b-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="64" width="250" height="104" rx="12"/>
  <text class="d-text" x="165" y="96" text-anchor="middle">EXPAND</text>
  <text class="d-sub" x="165" y="124" text-anchor="middle">right moves one step</text>
  <text class="d-sub" x="165" y="148" text-anchor="middle">add s[right] to counts</text>
  <rect class="d-box-accent" x="390" y="64" width="250" height="104" rx="12"/>
  <text class="d-text d-accent" x="515" y="96" text-anchor="middle">SHRINK</text>
  <text class="d-sub" x="515" y="124" text-anchor="middle">record best window</text>
  <text class="d-sub" x="515" y="148" text-anchor="middle">drop s[left], left + 1</text>
  <path class="d-edge-accent" d="M 294 92 L 386 92" marker-end="url(#b08q4b-java)"/>
  <text class="d-sub" x="340" y="44" text-anchor="middle">valid</text>
  <path class="d-edge-dashed" d="M 386 140 L 294 140" marker-end="url(#b08q4b-java)"/>
  <text class="d-sub" x="340" y="200" text-anchor="middle">invalid again</text>
</svg>

1. **Expand:** move \`right\` one step and add \`s[right]\` to \`window\`.
2. **While the window covers t:** record it if it is the shortest so far, then remove \`s[left]\` and move \`left\` forward.
3. Repeat until \`right\` reaches the end.

Why shrinking greedily is safe: when the window \`[left, right]\` is valid, every window \`[left, r']\` with r' > right is longer, so \`left\` can never be the start of a *shorter* answer later. Recording and dropping it loses nothing. Both edges only move forward, so each character is added once and removed at most once.

### Knowing "is it valid?" in O(1)

Checking every character of \`need\` against \`window\` on every step costs O(k) each time. The standard trick keeps one integer:

📌 **Interview term: need/have counters** — \`required\` is the number of **distinct** characters in t; \`have\` is how many of them currently have \`window[c] >= need[c]\`. The window is valid exactly when \`have == required\`. \`have\` changes only when a count **crosses** its threshold: up when \`window[c]\` becomes equal to \`need[c]\`, down when it drops below. The full mechanics, a step-by-step trace and the classic off-by-one bugs are in the companion question [need/have counters explained](/interview-question/minimum-window-substring-how-does-the-sliding-window-with-need-have-counters-wor).

## 4. From Brute Force to the Sliding Window

| Approach | Time | Space | Verdict |
| :--- | :--- | :--- | :--- |
| Every substring, count and compare | O(n² · k) or worse | O(k) | Too slow |
| Every start, extend until covering, then stop | O(n²) worst case | O(k) | Example 2 uses this as the test oracle |
| **Expand/shrink window with need/have** | **O(\\|s\\| + \\|t\\|)** | **O(k)** | The expected answer |

### The Java code

~~~java
static String minWindow(String s, String t) {
    if (s.isEmpty() || t.isEmpty()) return "";
    int[] need = new int[128];          // ASCII: index = char code, value = copies needed
    int required = 0;                   // distinct chars that must be satisfied
    for (char c : t.toCharArray()) {
        if (need[c] == 0) required++;
        need[c]++;
    }
    int[] window = new int[128];
    int have = 0;                       // distinct chars currently satisfied
    int bestLen = Integer.MAX_VALUE, bestStart = 0, left = 0;
    for (int right = 0; right < s.length(); right++) {
        char ch = s.charAt(right);
        window[ch]++;
        if (need[ch] > 0 && window[ch] == need[ch]) have++;
        while (have == required) {      // valid: try to shrink from the left
            if (right - left + 1 < bestLen) {
                bestLen = right - left + 1;
                bestStart = left;
            }
            char out = s.charAt(left);
            window[out]--;
            if (need[out] > 0 && window[out] < need[out]) have--; // broke it
            left++;
        }
    }
    return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestStart, bestStart + bestLen);
}
~~~

Java points worth saying:

- Two \`int[128]\` arrays replace the maps: \`need[c]\` and \`window[c]\` index directly by \`char\`, with no hashing and no \`Integer\` boxing. That assumes ASCII; for wider input, use \`HashMap<Character, Integer>\` with \`merge(c, 1, Integer::sum)\`.
- \`required\` is counted while building \`need\`: it goes up only when a character's count goes from 0 to 1, so it equals the number of **distinct** characters.
- \`need[ch] > 0 && window[ch] == need[ch]\` — for characters not in t, \`need[ch]\` is 0, so they never change \`have\`.
- \`Integer.MAX_VALUE\` marks "no window yet".
- Example 2 compares answers with \`equals\`. In the lab, two equal strings built differently gave \`x == y\` **false** and \`x.equals(y)\` true, because \`==\` compares references.

## 5. Verified: Running the Code

Both programs are the runnable examples on this page; each was run with \`javac Main.java && java Main\`.

**Example 1 — the solution on eight inputs**, printing the length and the window in parentheses (empty parentheses mean no window):

~~~text
4 (BANC)
1 (a)
0 ()
2 (aa)
1 (b)
2 (ba)
0 ()
4 (cwae)
~~~

**Example 2 — brute force vs sliding window:** 300 random pairs over the alphabet "abc", then one 3,000-character string over ten letters with t = "aabbccj":

~~~text
random tests: 300, mismatches: 0
n=3000 brute length=8 steps=94288
n=3000 sliding length=8 steps=5957
same window: true
~~~

The two methods agree on every random case and on the large one. The brute force stops extending from a start as soon as it covers t, which keeps it well under n² on this input, but it still did about 16 times more work (94,288 steps vs 5,957). The sliding window's 5,957 steps are the 3,000 expansions plus 2,957 shrink steps — under 2n, as the analysis promises.

## 6. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(\\|s\\| + \\|t\\|) | Building \`need\` is \\|t\\|; each character of s is added once and removed at most once |
| Space | O(k) | O(1) — two fixed arrays of 128 ints (O(k) with HashMaps). |
| Validity check | O(1) per step | The \`have\` counter replaces an O(k) comparison of the two maps |

## Edge Cases to Mention

- **t longer than s, or t needs more copies than s has** (s = "a", t = "aa"): no window, return "".
- **Empty t or empty s:** return "" (state your convention).
- **s equals t** (s = "aa", t = "aa"): the whole string.
- **Answer at the very start or end:** "ab" with t = "b" gives "b"; "bba" with t = "ab" gives "ba".
- **Characters of t interleaved with many extras** ("cabwefgewcwaefgcf", t = "cae"): answer "cwae" — the window must skip letters not in t on both sides.

## Common Pitfalls

- **Comparing strings with \`==\`.** It compares references (false for equal content in the lab); use \`equals\`.
- **Using a \`HashSet<Character>\` for t.** It loses duplicates; t = "AABC" needs two A's.
- **Comparing boxed counts with \`==\`.** With \`HashMap<Character, Integer>\`, \`window.get(c) == need.get(c)\` compares \`Integer\` references and fails once counts exceed 127; unbox or use \`equals\`.
- **Incrementing \`have\` with \`>=\` instead of \`==\`.** It counts the same character again for every extra copy; the companion question shows the wrong answers.
- **Indexing \`int[128]\` with a non-ASCII char.** It throws \`ArrayIndexOutOfBoundsException\`; ask about the alphabet.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Sliding window: expand <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> and count characters; while the window covers t, record it and shrink from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code>. O(|s| + |t|) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Validity in O(1):</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">required</code> = distinct characters of t; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> counts those whose window count reached the need. Valid exactly when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have == required</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When counters change:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have++</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window[c] == need[c]</code> after adding; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have--</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window[c] &lt; need[c]</code> after removing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Java details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[128]</code> counts avoid boxing; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code> sentinel; compare strings with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>; with HashMaps, never compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code>s with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verified:</strong> <span style="color:#f0e2c8;">Matched an O(n²) brute force on 300 random strings; on n = 3000 it took 5,957 steps against 94,288.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it O(|s| + |t|) with a nested <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> only moves forward and never passes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code>, so the inner loop runs at most |s| times overall. Building <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">need</code> costs |t|.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Arrays or HashMap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Ask about the alphabet. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[128]</code> is O(1) space and fastest for ASCII; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Character, Integer&gt;</code> handles anything but boxes every count.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes wrong with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">window.get(c) == need.get(c)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both sides are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> objects, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> compares references. It happens to work for values in the cache range -128..127 and silently fails above it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if several windows tie for the minimum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recording only on strictly smaller length keeps the leftmost; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> would keep the rightmost.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Covering window** | A substring holding every character of t, with multiplicity |
| **Frequency map** | Character → count |
| **Variable-size sliding window** | Right edge moves every step, left edge moves to restore or exploit a condition |
| **need/have counters** | \`have\` = distinct characters at quota; valid when \`have == required\` |
| **Reference equality** | \`==\` on objects: same object, not same content |

---
**Conclusion:** In Java, minimum window substring is two \`int[128]\` count arrays plus an expand/shrink loop with \`have\` and \`required\`: O(|s| + |t|) time, O(1) space for ASCII — and the Java traps are \`==\` on \`String\`s and on boxed \`Integer\` counts. It is the same window as [longest substring without repeating characters](/interview-question/how-do-you-find-the-longest-substring-without-repeating-characters) with the rule flipped: there the window must avoid repeats and we want it long; here it must cover t and we want it short.`,
        examples: [
          {
            label: `Minimum window substring on eight inputs`,
            code: `public class Main {
    static String minWindow(String s, String t) {
        if (s.isEmpty() || t.isEmpty()) return "";
        int[] need = new int[128];          // ASCII: index = char code, value = copies needed
        int required = 0;                   // distinct chars that must be satisfied
        for (char c : t.toCharArray()) {
            if (need[c] == 0) required++;
            need[c]++;
        }
        int[] window = new int[128];
        int have = 0;                       // distinct chars currently satisfied
        int bestLen = Integer.MAX_VALUE, bestStart = 0, left = 0;
        for (int right = 0; right < s.length(); right++) {
            char ch = s.charAt(right);
            window[ch]++;
            if (need[ch] > 0 && window[ch] == need[ch]) have++;
            while (have == required) {      // valid: try to shrink from the left
                if (right - left + 1 < bestLen) {
                    bestLen = right - left + 1;
                    bestStart = left;
                }
                char out = s.charAt(left);
                window[out]--;
                if (need[out] > 0 && window[out] < need[out]) have--; // broke it
                left++;
            }
        }
        return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestStart, bestStart + bestLen);
    }

    static String fmt(String w) {
        return w.length() + " (" + w + ")";
    }

    public static void main(String[] args) {
        System.out.println(fmt(minWindow("ADOBECODEBANC", "ABC")));      // 4 (BANC)
        System.out.println(fmt(minWindow("a", "a")));                    // 1 (a)
        System.out.println(fmt(minWindow("a", "aa")));                   // 0 ()
        System.out.println(fmt(minWindow("aa", "aa")));                  // 2 (aa)
        System.out.println(fmt(minWindow("ab", "b")));                   // 1 (b)
        System.out.println(fmt(minWindow("bba", "ab")));                 // 2 (ba)
        System.out.println(fmt(minWindow("ADOBECODEBANC", "")));         // 0 ()
        System.out.println(fmt(minWindow("cabwefgewcwaefgcf", "cae")));  // 4 (cwae)
    }
}`,
          },
          {
            label: `Brute force vs sliding window: same answers, far fewer steps`,
            code: `// Brute force O(n^2) vs sliding window O(n): same answers, very different work.
public class Main {
    static long steps;

    static int[] countChars(String t) {
        int[] need = new int[128];
        for (char c : t.toCharArray()) need[c]++;
        return need;
    }

    static String bruteForce(String s, String t) {
        int[] need = countChars(t);
        String best = "";
        steps = 0;
        for (int i = 0; i < s.length(); i++) {
            int[] counts = new int[128];
            for (int j = i; j < s.length(); j++) {
                steps++;
                counts[s.charAt(j)]++;
                boolean ok = true;
                for (int c = 0; c < 128; c++) if (counts[c] < need[c]) { ok = false; break; }
                if (ok) {
                    if (best.isEmpty() || j - i + 1 < best.length()) best = s.substring(i, j + 1);
                    break;                  // longer windows from this start cannot be shorter
                }
            }
        }
        return best;
    }

    static String sliding(String s, String t) {
        int[] need = countChars(t);
        int required = 0;
        for (int c = 0; c < 128; c++) if (need[c] > 0) required++;
        int[] window = new int[128];
        int have = 0, bestLen = -1, bestStart = 0, left = 0;
        steps = 0;
        for (int right = 0; right < s.length(); right++) {
            steps++;
            char ch = s.charAt(right);
            window[ch]++;
            if (need[ch] > 0 && window[ch] == need[ch]) have++;
            while (have == required) {
                steps++;
                if (bestLen == -1 || right - left + 1 < bestLen) {
                    bestLen = right - left + 1;
                    bestStart = left;
                }
                char out = s.charAt(left);
                window[out]--;
                if (need[out] > 0 && window[out] < need[out]) have--;
                left++;
            }
        }
        return bestLen == -1 ? "" : s.substring(bestStart, bestStart + bestLen);
    }

    static long seed = 2024;
    static int nextRand() {
        seed = seed * 48271L % 2147483647L;
        return (int) seed;
    }

    static String randString(int n, String alphabet) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append(alphabet.charAt(nextRand() % alphabet.length()));
        return sb.toString();
    }

    public static void main(String[] args) {
        int mismatches = 0;
        for (int k = 0; k < 300; k++) {
            String s = randString(nextRand() % 30, "abc");
            String t = randString(nextRand() % 4 + 1, "abc");
            if (!bruteForce(s, t).equals(sliding(s, t))) mismatches++; // equals, never ==
        }
        System.out.println("random tests: 300, mismatches: " + mismatches);
        String s = randString(3000, "abcdefghij");
        String t = "aabbccj";
        String w1 = bruteForce(s, t);
        long steps1 = steps;
        String w2 = sliding(s, t);
        long steps2 = steps;
        System.out.println("n=3000 brute length=" + w1.length() + " steps=" + steps1);
        System.out.println("n=3000 sliding length=" + w2.length() + " steps=" + steps2);
        System.out.println("same window: " + w1.equals(w2));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given two strings s and t, return the smallest substring of s that contains every character of t, including duplicates. If there is none, return an empty string. For s = 'ADOBECODEBANC' and t = 'ABC' the answer is 'BANC'. Please solve it in C++ in linear time."

**What a strong answer should cover:**
- Brute force over all substrings is at least O(n²); the expected answer is a variable-size sliding window: expand right until valid, shrink left while valid, O(|s| + |t|).
- Frequency maps for t (\`need\`) and the window, because duplicates in t matter.
- An O(1) validity check with need/have counters: \`have\` changes only when a count crosses its threshold.
- Recording the answer inside the shrink loop, the leftmost-on-ties rule, and the no-window case.
- C++ specifics: \`std::array<int, 128>{}\` zero-initialised counts (or \`unordered_map<char, int>\`), \`INT_MAX\` as the sentinel, and \`substr(pos, count)\` taking a length, not an end index.

**Clarifying questions expected:**
- "Do duplicate characters in t have to appear that many times?"
- "What do I return if no window exists, or if t is empty?"

**Code / implementation expected:** Yes — a \`string minWindow(const string& s, const string& t)\` function in C++17.`,
        answer: `**Target Audience:** Intermediate candidates — you should know strings, maps and the basic sliding window idea; every term is still defined here.
**Difficulty:** Hard
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`g++ -std=c++17\`.

## 1. Why This Even Matters — A Story First

You have a shopping list — one apple, one banana, one carrot — and a long market street where stalls sell one item each, in a fixed order. You want the **shortest stretch of consecutive stalls** where you can buy everything on your list. You walk forward, adding stalls to your stretch until you have everything. Then you try to drop stalls from the back of your stretch while you still have everything, because a shorter stretch is better. When dropping one more would lose something you need, you walk forward again.

That is minimum window substring: a sliding window that **expands** until it is valid and **shrinks** while it stays valid. It is rated hard not because the idea is exotic, but because the bookkeeping — counts with duplicates, knowing in O(1) when the window is valid, the exact moment to record the answer — has several places to go wrong. Interviewers use it to see whether you can keep an invariant straight under pressure.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do duplicates in t count? (t = "AABC" needs two A's?) | Yes in the classic problem; this is why you need counts, not a set. |
| What should be returned when no window exists? | Usually the empty string. Also ask about an empty t. |
| Is it case-sensitive, and what is the character set? | Decides between a fixed array of 128 counts and a hash map. |
| If several windows have the minimum length, which one? | The usual answer is the leftmost; recording only strictly smaller windows gives that. |
| How long are s and t? | With s up to 10⁵, an O(n²) scan is too slow; the window is O(\\|s\\| + \\|t\\|). |

## 3. The Core Idea in Plain Language

**The problem:** given strings s and t, return the shortest substring of s that contains every character of t, **including duplicates**. For s = "ADOBECODEBANC" and t = "ABC" the answer is "BANC".

📌 **Interview term: Covering window** — a substring of s that contains each character of t at least as many times as t does. We want the shortest covering window.

📌 **Interview term: Frequency map** — a count of each character, e.g. t = "AABC" gives {A: 2, B: 1, C: 1}. Here it is called \`need\`, and a second map \`window\` counts what is inside the current window.

<svg class="iq-diagram" width="100%" viewBox="0 0 696 230" role="img" aria-label="String ADOBECODEBANC with the smallest window BANC at indices 9 to 12">
  <defs>
    <marker id="b08q4a-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="348" y="28" text-anchor="middle">s = ADOBECODEBANC, t = ABC: the answer is BANC</text>
  <rect class="d-box" x="40" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="60" y="92" text-anchor="middle">A</text>
  <rect class="d-box" x="88" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="108" y="92" text-anchor="middle">D</text>
  <rect class="d-box" x="136" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="156" y="92" text-anchor="middle">O</text>
  <rect class="d-box" x="184" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="204" y="92" text-anchor="middle">B</text>
  <rect class="d-box" x="232" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="252" y="92" text-anchor="middle">E</text>
  <rect class="d-box" x="280" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="300" y="92" text-anchor="middle">C</text>
  <rect class="d-box" x="328" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="348" y="92" text-anchor="middle">O</text>
  <rect class="d-box" x="376" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="396" y="92" text-anchor="middle">D</text>
  <rect class="d-box" x="424" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="444" y="92" text-anchor="middle">E</text>
  <rect class="d-box-accent" x="472" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="492" y="92" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="520" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="540" y="92" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="568" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="588" y="92" text-anchor="middle">N</text>
  <rect class="d-box-accent" x="616" y="60" width="40" height="52" rx="8"/>
  <text class="d-text" x="636" y="92" text-anchor="middle">C</text>
  <path class="d-edge-accent" d="M 60 172 L 60 124" marker-end="url(#b08q4a-cpp)"/>
  <text class="d-text d-accent" x="60" y="200" text-anchor="middle">first</text>
  <path class="d-edge-accent" d="M 492 172 L 492 124" marker-end="url(#b08q4a-cpp)"/>
  <text class="d-text d-accent" x="492" y="200" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 636 172 L 636 124" marker-end="url(#b08q4a-cpp)"/>
  <text class="d-text d-accent" x="636" y="200" text-anchor="middle">right</text>
</svg>

The first covering window found is "ADOBEC" (indices 0 to 5). Shrinking and expanding later finds "BANC" (indices 9 to 12), which is shorter.

### Expand, then shrink

📌 **Interview term: Variable-size sliding window** — a window whose right edge moves every step and whose left edge moves only to restore or exploit a condition. See [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Expand right until the window is valid, then shrink left while it stays valid">
  <defs>
    <marker id="b08q4b-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="64" width="250" height="104" rx="12"/>
  <text class="d-text" x="165" y="96" text-anchor="middle">EXPAND</text>
  <text class="d-sub" x="165" y="124" text-anchor="middle">right moves one step</text>
  <text class="d-sub" x="165" y="148" text-anchor="middle">add s[right] to counts</text>
  <rect class="d-box-accent" x="390" y="64" width="250" height="104" rx="12"/>
  <text class="d-text d-accent" x="515" y="96" text-anchor="middle">SHRINK</text>
  <text class="d-sub" x="515" y="124" text-anchor="middle">record best window</text>
  <text class="d-sub" x="515" y="148" text-anchor="middle">drop s[left], left + 1</text>
  <path class="d-edge-accent" d="M 294 92 L 386 92" marker-end="url(#b08q4b-cpp)"/>
  <text class="d-sub" x="340" y="44" text-anchor="middle">valid</text>
  <path class="d-edge-dashed" d="M 386 140 L 294 140" marker-end="url(#b08q4b-cpp)"/>
  <text class="d-sub" x="340" y="200" text-anchor="middle">invalid again</text>
</svg>

1. **Expand:** move \`right\` one step and add \`s[right]\` to \`window\`.
2. **While the window covers t:** record it if it is the shortest so far, then remove \`s[left]\` and move \`left\` forward.
3. Repeat until \`right\` reaches the end.

Why shrinking greedily is safe: when the window \`[left, right]\` is valid, every window \`[left, r']\` with r' > right is longer, so \`left\` can never be the start of a *shorter* answer later. Recording and dropping it loses nothing. Both edges only move forward, so each character is added once and removed at most once.

### Knowing "is it valid?" in O(1)

Checking every character of \`need\` against \`window\` on every step costs O(k) each time. The standard trick keeps one integer:

📌 **Interview term: need/have counters** — \`required\` is the number of **distinct** characters in t; \`have\` is how many of them currently have \`window[c] >= need[c]\`. The window is valid exactly when \`have == required\`. \`have\` changes only when a count **crosses** its threshold: up when \`window[c]\` becomes equal to \`need[c]\`, down when it drops below. The full mechanics, a step-by-step trace and the classic off-by-one bugs are in the companion question [need/have counters explained](/interview-question/minimum-window-substring-how-does-the-sliding-window-with-need-have-counters-wor).

## 4. From Brute Force to the Sliding Window

| Approach | Time | Space | Verdict |
| :--- | :--- | :--- | :--- |
| Every substring, count and compare | O(n² · k) or worse | O(k) | Too slow |
| Every start, extend until covering, then stop | O(n²) worst case | O(k) | Example 2 uses this as the test oracle |
| **Expand/shrink window with need/have** | **O(\\|s\\| + \\|t\\|)** | **O(k)** | The expected answer |

### The C++ code

~~~cpp
string minWindow(const string& s, const string& t) {
    if (s.empty() || t.empty()) return "";
    array<int, 128> need{};                 // {} zero-fills; ASCII char code -> copies needed
    int required = 0;                       // distinct chars that must be satisfied
    for (char c : t) {
        if (need[c] == 0) required++;
        need[c]++;
    }
    array<int, 128> window{};
    int have = 0;                           // distinct chars currently satisfied
    int bestLen = INT_MAX, bestStart = 0, left = 0;
    for (int right = 0; right < static_cast<int>(s.size()); right++) {
        char ch = s[right];
        window[ch]++;
        if (need[ch] > 0 && window[ch] == need[ch]) have++;
        while (have == required) {          // valid: try to shrink from the left
            if (right - left + 1 < bestLen) {
                bestLen = right - left + 1;
                bestStart = left;
            }
            char out = s[left];
            window[out]--;
            if (need[out] > 0 && window[out] < need[out]) have--; // broke it
            left++;
        }
    }
    return bestLen == INT_MAX ? "" : s.substr(bestStart, bestLen);
}
~~~

C++ points worth saying:

- \`array<int, 128> need{};\` — the empty braces **value-initialise** every element to 0. Without them, a local \`std::array<int, 128>\` holds indeterminate values.
- \`need[c]\` with a plain \`char\` index assumes ASCII (0 to 127). A byte above 127 is negative when \`char\` is signed, as it is on the x86-64 lab machine; cast to \`unsigned char\` and size the array 256 if the input may contain such bytes.
- \`INT_MAX\` (from \`<climits>\`) marks "no window yet".
- \`s.substr(bestStart, bestLen)\` takes a start and a **length**, unlike JavaScript \`slice\` or Java \`substring\`, which take an end index.
- \`const string&\` parameters avoid copying both strings.

## 5. Verified: Running the Code

Both programs are the runnable examples on this page; each was run with \`g++ -std=c++17 main.cpp && ./a.out\`.

**Example 1 — the solution on eight inputs**, printing the length and the window in parentheses (empty parentheses mean no window):

~~~text
4 (BANC)
1 (a)
0 ()
2 (aa)
1 (b)
2 (ba)
0 ()
4 (cwae)
~~~

**Example 2 — brute force vs sliding window:** 300 random pairs over the alphabet "abc", then one 3,000-character string over ten letters with t = "aabbccj":

~~~text
random tests: 300, mismatches: 0
n=3000 brute length=8 steps=94288
n=3000 sliding length=8 steps=5957
same window: true
~~~

The two methods agree on every random case and on the large one. The brute force stops extending from a start as soon as it covers t, which keeps it well under n² on this input, but it still did about 16 times more work (94,288 steps vs 5,957). The sliding window's 5,957 steps are the 3,000 expansions plus 2,957 shrink steps — under 2n, as the analysis promises.

## 6. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(\\|s\\| + \\|t\\|) | Building \`need\` is \\|t\\|; each character of s is added once and removed at most once |
| Space | O(k) | O(1) — two fixed arrays of 128 ints (O(k) with \`unordered_map\`). |
| Validity check | O(1) per step | The \`have\` counter replaces an O(k) comparison of the two maps |

## Edge Cases to Mention

- **t longer than s, or t needs more copies than s has** (s = "a", t = "aa"): no window, return "".
- **Empty t or empty s:** return "" (state your convention).
- **s equals t** (s = "aa", t = "aa"): the whole string.
- **Answer at the very start or end:** "ab" with t = "b" gives "b"; "bba" with t = "ab" gives "ba".
- **Characters of t interleaved with many extras** ("cabwefgewcwaefgcf", t = "cae"): answer "cwae" — the window must skip letters not in t on both sides.

## Common Pitfalls

- **Forgetting \`{}\` on a local \`std::array\`.** The counts start as garbage; \`array<int, 128> need{};\` zero-fills.
- **Passing an end index to \`substr\`.** The second argument is a length: \`substr(start, end)\` returns a longer string than intended.
- **Negative \`char\` indices.** Bytes above 127 are negative with signed \`char\`; cast to \`unsigned char\` before indexing.
- **Incrementing \`have\` with \`>=\` instead of \`==\`.** It counts the same character again for every extra copy; the companion question shows the wrong answers.
- **Recording the best window after the shrink loop.** The window is invalid by then; record inside the \`while\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Sliding window: expand <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> and count characters; while the window covers t, record it and shrink from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code>. O(|s| + |t|) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Validity in O(1):</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">required</code> = distinct characters of t; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> counts those whose window count reached the need. Valid exactly when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have == required</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When counters change:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have++</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window[c] == need[c]</code> after adding; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have--</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window[c] &lt; need[c]</code> after removing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. C++ details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">array&lt;int, 128&gt;{}</code> zero-fills; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INT_MAX</code> sentinel; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">substr(pos, count)</code> takes a length; cast to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unsigned char</code> for non-ASCII bytes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Verified:</strong> <span style="color:#f0e2c8;">Matched an O(n²) brute force on 300 random strings; on n = 3000 it took 5,957 steps against 94,288.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it O(|s| + |t|) with a nested <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> only moves forward and never passes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code>, so the inner loop runs at most |s| times overall. Building <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">need</code> costs |t|.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">array</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_map</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For byte strings a fixed array: no hashing, no allocation. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map&lt;char, int&gt;</code> is fine too, but use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> for lookups since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> inserts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why store <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">bestStart</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">bestLen</code> instead of the string?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Assigning a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::string</code> copies characters; storing two ints is O(1), and one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">substr</code> at the end does the only copy.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if several windows tie for the minimum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recording only on strictly smaller length keeps the leftmost; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> would keep the rightmost.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Covering window** | A substring holding every character of t, with multiplicity |
| **Frequency map** | Character → count |
| **Variable-size sliding window** | Right edge moves every step, left edge moves to restore or exploit a condition |
| **need/have counters** | \`have\` = distinct characters at quota; valid when \`have == required\` |
| **Value-initialisation** | \`{}\` on a \`std::array\`: every element starts at 0 |

---
**Conclusion:** In C++, minimum window substring is two zero-initialised \`array<int, 128>\` counts plus an expand/shrink loop with \`have\` and \`required\`: O(|s| + |t|) time, O(1) space — with \`substr(pos, count)\` and \`char\` signedness as the language-specific traps. It is the same window as [longest substring without repeating characters](/interview-question/how-do-you-find-the-longest-substring-without-repeating-characters) with the rule flipped: there the window must avoid repeats and we want it long; here it must cover t and we want it short.`,
        examples: [
          {
            label: `Minimum window substring on eight inputs`,
            code: `#include <array>
#include <climits>
#include <iostream>
#include <string>
using namespace std;

string minWindow(const string& s, const string& t) {
    if (s.empty() || t.empty()) return "";
    array<int, 128> need{};                 // {} zero-fills; ASCII char code -> copies needed
    int required = 0;                       // distinct chars that must be satisfied
    for (char c : t) {
        if (need[c] == 0) required++;
        need[c]++;
    }
    array<int, 128> window{};
    int have = 0;                           // distinct chars currently satisfied
    int bestLen = INT_MAX, bestStart = 0, left = 0;
    for (int right = 0; right < static_cast<int>(s.size()); right++) {
        char ch = s[right];
        window[ch]++;
        if (need[ch] > 0 && window[ch] == need[ch]) have++;
        while (have == required) {          // valid: try to shrink from the left
            if (right - left + 1 < bestLen) {
                bestLen = right - left + 1;
                bestStart = left;
            }
            char out = s[left];
            window[out]--;
            if (need[out] > 0 && window[out] < need[out]) have--; // broke it
            left++;
        }
    }
    return bestLen == INT_MAX ? "" : s.substr(bestStart, bestLen);
}

string fmt(const string& w) {
    return to_string(w.size()) + " (" + w + ")";
}

int main() {
    cout << fmt(minWindow("ADOBECODEBANC", "ABC")) << "\\n";     // 4 (BANC)
    cout << fmt(minWindow("a", "a")) << "\\n";                   // 1 (a)
    cout << fmt(minWindow("a", "aa")) << "\\n";                  // 0 ()
    cout << fmt(minWindow("aa", "aa")) << "\\n";                 // 2 (aa)
    cout << fmt(minWindow("ab", "b")) << "\\n";                  // 1 (b)
    cout << fmt(minWindow("bba", "ab")) << "\\n";                // 2 (ba)
    cout << fmt(minWindow("ADOBECODEBANC", "")) << "\\n";        // 0 ()
    cout << fmt(minWindow("cabwefgewcwaefgcf", "cae")) << "\\n"; // 4 (cwae)
}`,
          },
          {
            label: `Brute force vs sliding window: same answers, far fewer steps`,
            code: `#include <array>
#include <iostream>
#include <string>
using namespace std;

// Brute force O(n^2) vs sliding window O(n): same answers, very different work.
long long steps = 0;

array<int, 128> countChars(const string& t) {
    array<int, 128> need{};
    for (char c : t) need[c]++;
    return need;
}

string bruteForce(const string& s, const string& t) {
    array<int, 128> need = countChars(t);
    string best;
    steps = 0;
    int n = static_cast<int>(s.size());
    for (int i = 0; i < n; i++) {
        array<int, 128> counts{};
        for (int j = i; j < n; j++) {
            steps++;
            counts[s[j]]++;
            bool ok = true;
            for (int c = 0; c < 128; c++) if (counts[c] < need[c]) { ok = false; break; }
            if (ok) {
                if (best.empty() || j - i + 1 < static_cast<int>(best.size())) best = s.substr(i, j - i + 1);
                break;                      // longer windows from this start cannot be shorter
            }
        }
    }
    return best;
}

string sliding(const string& s, const string& t) {
    array<int, 128> need = countChars(t);
    int required = 0;
    for (int c = 0; c < 128; c++) if (need[c] > 0) required++;
    array<int, 128> window{};
    int have = 0, bestLen = -1, bestStart = 0, left = 0;
    steps = 0;
    for (int right = 0; right < static_cast<int>(s.size()); right++) {
        steps++;
        char ch = s[right];
        window[ch]++;
        if (need[ch] > 0 && window[ch] == need[ch]) have++;
        while (have == required) {
            steps++;
            if (bestLen == -1 || right - left + 1 < bestLen) {
                bestLen = right - left + 1;
                bestStart = left;
            }
            char out = s[left];
            window[out]--;
            if (need[out] > 0 && window[out] < need[out]) have--;
            left++;
        }
    }
    return bestLen == -1 ? "" : s.substr(bestStart, bestLen);
}

long long seed = 2024;
int nextRand() {
    seed = seed * 48271LL % 2147483647LL;
    return static_cast<int>(seed);
}

string randString(int n, const string& alphabet) {
    string out;
    for (int i = 0; i < n; i++) out += alphabet[nextRand() % alphabet.size()];
    return out;
}

int main() {
    cout << boolalpha;
    int mismatches = 0;
    for (int k = 0; k < 300; k++) {
        int n = nextRand() % 30;            // separate statements: C++ argument evaluation
        string s = randString(n, "abc");    // order is unspecified, so keep the calls in order
        int m = nextRand() % 4 + 1;
        string t = randString(m, "abc");
        if (bruteForce(s, t) != sliding(s, t)) mismatches++;
    }
    cout << "random tests: 300, mismatches: " << mismatches << "\\n";
    string s = randString(3000, "abcdefghij");
    string t = "aabbccj";
    string w1 = bruteForce(s, t);
    long long steps1 = steps;
    string w2 = sliding(s, t);
    long long steps2 = steps;
    cout << "n=3000 brute length=" << w1.size() << " steps=" << steps1 << "\\n";
    cout << "n=3000 sliding length=" << w2.size() << " steps=" << steps2 << "\\n";
    cout << "same window: " << (w1 == w2) << "\\n";
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `Minimum window substring: how does the sliding window with need/have counters work?`,
    difficulty: "hard",
    seoDescription: `How the need/have counters in minimum window substring work: when have changes, why the check is O(1), the missing variant and two classic bugs.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"In the minimum window substring problem, people keep a 'need' map and a 'have' counter. Explain exactly what each one holds, when each counter changes, and why that makes the window check constant time. Then write the solution in Python."

**What a strong answer should cover:**
- \`need\` = counts of t; \`window\` = counts in the current slice; \`required\` = distinct characters of t; \`have\` = distinct characters whose window count is at least their need.
- The window is valid exactly when \`have == required\`, so the check is O(1) instead of O(k).
- \`have\` changes only on threshold crossings: \`+1\` when a count reaches its need after adding, \`-1\` when it drops below after removing; spare copies change nothing.
- The equivalent \`missing\` counter over total copies, and the two classic bugs (\`>=\` on add, \`<=\` on remove).
- Python specifics: \`Counter(t)\` for \`need\` and \`len(need)\` for \`required\`; \`ch in need\` before comparing, because characters outside t must not touch \`have\`; \`need.get(c, 0)\` for the missing-counter variant.

**Clarifying questions expected:**
- "Do duplicate characters in t have to be matched with multiplicity?" — this is what makes counts necessary.

**Code / implementation expected:** Yes — the min-window function in Python, explaining each counter update as it is written.`,
        answer: `**Target Audience:** Intermediate candidates who know the sliding window idea and want to explain the counters precisely; every term is defined.
**Difficulty:** Hard
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`python3\`.

## 1. Why This Even Matters — A Story First

A teacher is checking whether a group of students can form a team: the rule is **two** people who speak French, **one** who codes and **one** who draws. As students walk into the room one by one, she could re-read the whole rule list after every arrival — or she could keep a single tally on the board: "requirements met: 0 of 3". When the second French speaker walks in, the French requirement flips from unmet to met, so the tally goes to 1 of 3. A third French speaker changes nothing; the requirement was already met. When someone leaves, the tally drops only if their departure makes a requirement unmet again.

That tally is \`have\`, the number of requirements is \`required\`, and the per-skill counts are \`need\` and \`window\`. This question is asked separately from the plain [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring) because interviewers want you to explain the **mechanism**: exactly when each counter changes, why that makes the validity check O(1), and why the two most common off-by-one variants are wrong.

## 2. The Four Pieces of State

📌 **Interview term: need map** — the count of each character in t. For t = "AABC": {A: 2, B: 1, C: 1}. It never changes during the scan.

📌 **Interview term: window map** — the count of each character currently inside \`s[left..right]\`. It changes on every expand and every shrink.

📌 **Interview term: required** — the number of **distinct** characters in t (3 for "AABC"). Also constant.

📌 **Interview term: have** — the number of distinct characters c whose quota is met: \`window[c] >= need[c]\`. The window covers t exactly when \`have == required\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="need counts, window counts at right 5, and have equals 3 of 3">
  <text class="d-text" x="350" y="26" text-anchor="middle">t = ABC, window ADOBEC at right = 5</text>
  <rect class="d-box-muted" x="30" y="56" width="190" height="160" rx="12"/>
  <text class="d-text" x="125" y="88" text-anchor="middle">need</text>
  <text class="d-sub" x="125" y="122" text-anchor="middle">A: 1</text>
  <text class="d-sub" x="125" y="150" text-anchor="middle">B: 1</text>
  <text class="d-sub" x="125" y="178" text-anchor="middle">C: 1</text>
  <rect class="d-box" x="255" y="56" width="190" height="160" rx="12"/>
  <text class="d-text" x="350" y="88" text-anchor="middle">window</text>
  <text class="d-sub" x="350" y="122" text-anchor="middle">A: 1  B: 1  C: 1</text>
  <text class="d-sub" x="350" y="150" text-anchor="middle">D: 1  O: 1  E: 1</text>
  <text class="d-sub" x="350" y="178" text-anchor="middle">extras never count</text>
  <rect class="d-box-accent" x="480" y="56" width="190" height="160" rx="12"/>
  <text class="d-text d-accent" x="575" y="88" text-anchor="middle">have = 3</text>
  <text class="d-sub" x="575" y="122" text-anchor="middle">required = 3</text>
  <text class="d-sub" x="575" y="150" text-anchor="middle">equal, so</text>
  <text class="d-sub" x="575" y="178" text-anchor="middle">the window is valid</text>
</svg>

Characters that are not in t (D, O and E here) are counted in \`window\` but can never change \`have\`: their need is 0, so they are not requirements.

## 3. The One Rule: Count Crossings, Not Copies

\`have\` is a summary of the comparison \`window[c] >= need[c]\` for every c. That comparison only changes from false to true at the moment \`window[c]\` **reaches** \`need[c]\`, and only changes back at the moment it **drops below**. So:

- **After adding** a character c: if \`window[c] == need[c]\`, do \`have += 1\` (it just reached its quota). Any larger count means the quota was already met.
- **After removing** a character c: if \`window[c] < need[c]\` (that is, it was exactly at quota a moment ago), do \`have -= 1\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Count of B with need 1 going 0 1 2 1 0; have changes only at the crossings">
  <defs>
    <marker id="b08q5b-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="350" y="26" text-anchor="middle">B needs 1: the window count of B over time</text>
  <rect class="d-box-muted" x="30" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="70" y="146" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="170" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="210" y="146" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="310" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="350" y="146" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="450" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="490" y="146" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="590" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="630" y="146" text-anchor="middle">0</text>
  <path class="d-edge" d="M 114 140 L 166 140" marker-end="url(#b08q5b-python)"/>
  <text class="d-text d-accent" x="140" y="80" text-anchor="middle">have + 1</text>
  <path class="d-edge" d="M 254 140 L 306 140" marker-end="url(#b08q5b-python)"/>
  <text class="d-sub" x="280" y="80" text-anchor="middle">no change</text>
  <path class="d-edge" d="M 394 140 L 446 140" marker-end="url(#b08q5b-python)"/>
  <text class="d-sub" x="420" y="80" text-anchor="middle">no change</text>
  <path class="d-edge" d="M 534 140 L 586 140" marker-end="url(#b08q5b-python)"/>
  <text class="d-text d-accent" x="560" y="80" text-anchor="middle">have - 1</text>
</svg>

B goes 0 → 1 → 2 → 1 → 0. Only the first and last arrows change \`have\`; the middle two are spare copies coming and going.

📌 **Interview term: Invariant** — after every update, \`have\` equals the number of characters with \`window[c] >= need[c]\`. Each update keeps it true because it only fires on a crossing.

📌 **Interview term: Threshold crossing** — a count moving from one side of \`need[c]\` to the other. Detecting crossings with \`==\` (on add) and \`<\` (on remove) makes every update O(1), instead of re-comparing all k characters.

## 4. The Reference Implementation

This is the same function as the example on the [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring) page (verified there); the comments mark the counter updates:

~~~python
def min_window(s, t):
    if not s or not t:
        return ""
    need = Counter(t)              # char -> how many copies the window must hold
    required = len(need)           # distinct chars that must be satisfied
    window = {}
    have = 0                       # distinct chars currently satisfied
    best_len, best_start = float("inf"), 0
    left = 0
    for right, ch in enumerate(s):
        window[ch] = window.get(ch, 0) + 1
        if ch in need and window[ch] == need[ch]:
            have += 1              # this char just became satisfied
        while have == required:    # valid: try to shrink from the left
            if right - left + 1 < best_len:
                best_len, best_start = right - left + 1, left
            out = s[left]
            window[out] -= 1
            if out in need and window[out] < need[out]:
                have -= 1          # removing it broke the window
            left += 1
    return "" if best_len == float("inf") else s[best_start:best_start + best_len]
~~~

- \`need = Counter(t)\` and \`required = len(need)\` — the length of a Counter is the number of **distinct** keys.
- The guard \`ch in need and ...\` is not optional: without it a character outside t would be compared with \`need[ch]\`, which for a \`Counter\` silently reads 0.
- \`window\` is a plain \`dict\` with \`window.get(ch, 0) + 1\`; a second \`Counter\` works too.
- Python integers make the counters overflow-free, and \`float("inf")\` is a clean "no window yet" value.

## 5. The Equivalent Single Counter: missing

📌 **Interview term: missing counter** — instead of counting satisfied *distinct* characters, count the total **copies** of t's characters still owed: start at \`len(t)\`; decrement when an added character was still owed (\`window[c] <= need[c]\` after adding); increment when a removed character becomes owed again (\`window[c] < need[c]\` after removing). The window is valid when \`missing == 0\`.

Both are correct; \`have\`/\`required\` is easier to explain, \`missing\` is one variable shorter. Example 2 runs both side by side, and they agree on every case.

## 6. The Two Classic Bugs

| Bug | What it does | Verified result on ADOBECODEBANC / ABC |
| :--- | :--- | :--- |
| \`have += 1\` when \`window[c] >= need[c]\` (on add) | Counts the same character again for every extra copy, so \`have\` can exceed \`required\` or reach it too early | "BA" — does not even contain C |
| \`have -= 1\` when \`window[c] <= need[c]\` (on remove) | Also fires when a spare copy leaves, so \`have\` drops while the window is still valid | "ADOBEC" — misses the shorter "BANC" |

The case "aaflslflsldkalskaaa" / "aaa" gives "aaa" for all four versions: a test that only uses one kind of character can pass with both bugs. Use inputs with duplicates and spare copies, such as "AAB" / "AB" (the add bug returns "A").

## 7. Verified: Running the Code

Both programs are the runnable examples on this page; each was run with \`python3 main.py\`.

**Example 1 — every counter change on s = "ADOBECODEBANC", t = "ABC":**

~~~text
need=A:1,B:1,C:1 required=3
r=0 add A -> A satisfied, have=1
r=1 add D -> have=1
r=2 add O -> have=1
r=3 add B -> B satisfied, have=2
r=4 add E -> have=2
r=5 add C -> C satisfied, have=3
   valid ADOBEC (6) new best
   drop A -> A short, have=2
r=6 add O -> have=2
r=7 add D -> have=2
r=8 add E -> have=2
r=9 add B -> have=2
r=10 add A -> A satisfied, have=3
   valid DOBECODEBA (10)
   drop D
   valid OBECODEBA (9)
   drop O
   valid BECODEBA (8)
   drop B
   valid ECODEBA (7)
   drop E
   valid CODEBA (6)
   drop C -> C short, have=2
r=11 add N -> have=2
r=12 add C -> C satisfied, have=3
   valid ODEBANC (7)
   drop O
   valid DEBANC (6)
   drop D
   valid EBANC (5) new best
   drop E
   valid BANC (4) new best
   drop B -> B short, have=2
answer: BANC
~~~

Read it top to bottom. \`have\` reaches 3 at r = 5 ("ADOBEC", the first valid window) and dropping A breaks it. At r = 10 the window holds **two** B's, so later dropping the first B ("drop B" without "short") keeps it valid — a spare copy leaving. The shrink only stops when C leaves. At r = 12 the shrink walks down to "BANC", and dropping the only B ends it.

**Example 2 — the have/required scheme, the missing counter, and the two bugs on six inputs:**

~~~text
ADOBECODEBANC / ABC: have=(BANC) missing=(BANC) bug_add=(BA) bug_remove=(ADOBEC)
AAB / AB: have=(AB) missing=(AB) bug_add=(A) bug_remove=(AAB)
ADOBECODEBANC / AABC: have=(ADOBECODEBA) missing=(ADOBECODEBA) bug_add=(BANC) bug_remove=(ADOBECODEBA)
aaflslflsldkalskaaa / aaa: have=(aaa) missing=(aaa) bug_add=(aaa) bug_remove=(aaa)
BAAB / AB: have=(BA) missing=(BA) bug_add=(A) bug_remove=(BA)
xyz / xx: have=() missing=() bug_add=() bug_remove=()
~~~

\`have\` and \`missing\` agree everywhere. \`bug_add\` returns windows that do not cover t ("BA", "A"); \`bug_remove\` returns windows that cover t but are not the shortest ("ADOBEC", "AAB"). On "ADOBECODEBANC" / "AABC" the remove bug happens to give the right answer, and on the "aaa" case both bugs do — which is why a single passing test proves little.

## 8. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Each counter update | O(1) | One character, one comparison with its quota |
| Validity check | O(1) | \`have == required\` (or \`missing == 0\`) instead of comparing k counts |
| Whole scan | O(\\|s\\| + \\|t\\|) | Each character of s is added once and removed at most once |
| Space | O(k) | \`need\` and \`window\` hold one count per distinct character (fixed 128 slots for ASCII) |

## Edge Cases to Mention

- **t with duplicates** ("AABC"): \`required\` is 3, but A's quota is 2 — \`have\` counts A only when the window holds two A's.
- **Characters of s not in t:** counted in \`window\`, never touch \`have\`.
- **Impossible t** ("xyz" / "xx"): \`have\` never reaches \`required\`; return "".
- **Spare copies leaving:** removing a character whose count stays at or above quota keeps the window valid.

## Common Pitfalls

- **Using \`>=\` when incrementing \`have\`.** It counts every extra copy ("BA" on the classic input in the verified run).
- **Using \`<=\` when decrementing \`have\`.** It fires on spare copies ("ADOBEC" instead of "BANC").
- **Setting \`required = len(t)\` while counting distinct characters in \`have\`.** For t = "AABC" that is 4 vs at most 3: the window is never valid. Mix the two schemes and nothing matches.
- **Dropping the \`ch in need\` guard.** With a \`Counter\`, \`need[ch]\` reads 0 for an outsider, so \`window[ch] == need[ch]\` is false — but with a plain dict it raises \`KeyError\`.
- **Testing only with t made of one repeated letter.** Both bugs passed "aaa" in the run; include duplicates plus spare copies.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">need</code> counts t, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code> counts the current slice, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">required</code> is the number of distinct characters in t, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> is how many of them are at quota. Valid iff <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have == required</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When have changes:</strong> <span style="color:#f0e2c8;">Up when an added char makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window[c] == need[c]</code>; down when a removed char makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window[c] &lt; need[c]</code>. Only crossings count.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it is O(1):</strong> <span style="color:#f0e2c8;">Each update looks at one character, so the validity check never rescans the k characters of t; the whole scan is O(|s| + |t|).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter(t)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len(need)</code>; guard with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ch in need</code>; slice once at the end.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The bugs:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;=</code> on add returned "BA"; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> on remove returned "ADOBEC". The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">missing</code> counter variant is an equally correct alternative.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why count distinct characters and not total characters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> tracks requirements, and a requirement is per distinct character with its own quota. If you prefer counting copies, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">missing = len(t)</code> instead, as example 2 shows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why compare with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">==</code> on add, not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;=</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> fires exactly once per crossing. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;=</code> fires again on every extra copy, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> overshoots; the verified run returned "BA".</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the shrink loop's <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">have -= 1</code> mean for the window?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That the window just stopped covering t, so the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code> ends and the next <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> step starts expanding again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you avoid <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">have</code> entirely?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, by checking <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">all(window[c] &gt;= need[c] for c in need)</code> each step, but that is O(k) per step; the counter makes it O(1).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **need map** | Counts of each character of t; constant |
| **window map** | Counts of each character in the current slice |
| **required** | Number of distinct characters in t |
| **have** | Distinct characters currently at or above quota |
| **Invariant** | A fact restored after every update |
| **Threshold crossing** | A count moving across \`need[c]\` |
| **missing counter** | Total copies still owed; valid when it is 0 |

---
**Conclusion:** In Python, the need/have scheme is \`Counter(t)\`, \`len(need)\` and one integer that changes only when a count crosses its quota — \`==\` after adding, \`<\` after removing — which turns the validity check into an O(1) comparison. The same "count crossings, not copies" idea works for any window rule stated as per-key quotas, such as finding anagrams of a pattern inside a text; see also [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).`,
        examples: [
          {
            label: `Trace every need/have change on ADOBECODEBANC / ABC`,
            code: `# Trace the need/have counters on s = "ADOBECODEBANC", t = "ABC".
def min_window_traced(s, t):
    need = {}
    for c in t:
        need[c] = need.get(c, 0) + 1
    required = len(need)
    window, have = {}, 0
    best_len, best_start, left = -1, 0, 0
    print("need=" + ",".join(c + ":" + str(need[c]) for c in sorted(need)) + " required=" + str(required))
    for right, ch in enumerate(s):
        window[ch] = window.get(ch, 0) + 1
        if ch in need and window[ch] == need[ch]:
            have += 1
            print("r=" + str(right) + " add " + ch + " -> " + ch + " satisfied, have=" + str(have))
        else:
            print("r=" + str(right) + " add " + ch + " -> have=" + str(have))
        while have == required:
            size = right - left + 1
            if best_len == -1 or size < best_len:
                best_len, best_start = size, left
                print("   valid " + s[left:right + 1] + " (" + str(size) + ") new best")
            else:
                print("   valid " + s[left:right + 1] + " (" + str(size) + ")")
            out = s[left]
            window[out] -= 1
            if out in need and window[out] < need[out]:
                have -= 1
                print("   drop " + out + " -> " + out + " short, have=" + str(have))
            else:
                print("   drop " + out)
            left += 1
    return "" if best_len == -1 else s[best_start:best_start + best_len]


print("answer: " + min_window_traced("ADOBECODEBANC", "ABC"))`,
          },
          {
            label: `have vs missing counters, and the two classic off-by-one bugs`,
            code: `# Three ways to count "is the window valid?", and two classic off-by-one bugs.
def solve(s, t, mode):
    need = {}
    for c in t:
        need[c] = need.get(c, 0) + 1
    window = {}
    if mode == "missing":
        missing = len(t)               # one counter: total characters still owed
    else:
        have, required = 0, len(need)  # distinct characters satisfied / needed
    best_len, best_start, left = -1, 0, 0
    for right, ch in enumerate(s):
        window[ch] = window.get(ch, 0) + 1
        if mode == "missing":
            if window[ch] <= need.get(ch, 0):
                missing -= 1           # this copy was still owed
        elif mode == "bug_add":
            if ch in need and window[ch] >= need[ch]:
                have += 1              # BUG: counts the same char again on every extra copy
        elif ch in need and window[ch] == need[ch]:
            have += 1                  # correct and bug_remove: exactly at the threshold
        while (missing == 0) if mode == "missing" else (have == required):
            if best_len == -1 or right - left + 1 < best_len:
                best_len, best_start = right - left + 1, left
            out = s[left]
            window[out] -= 1
            if mode == "missing":
                if window[out] < need.get(out, 0):
                    missing += 1
            elif mode == "bug_remove":
                if out in need and window[out] <= need[out]:
                    have -= 1          # BUG: also fires when a spare copy leaves
            elif out in need and window[out] < need[out]:
                have -= 1
            left += 1
    return "" if best_len == -1 else s[best_start:best_start + best_len]


cases = [("ADOBECODEBANC", "ABC"), ("AAB", "AB"), ("ADOBECODEBANC", "AABC"),
         ("aaflslflsldkalskaaa", "aaa"), ("BAAB", "AB"), ("xyz", "xx")]
for s, t in cases:
    line = s + " / " + t + ":"
    for mode in ["have", "missing", "bug_add", "bug_remove"]:
        line += " " + mode + "=(" + solve(s, t, mode) + ")"
    print(line)`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"In the minimum window substring problem, people keep a 'need' map and a 'have' counter. Explain exactly what each one holds, when each counter changes, and why that makes the window check constant time. Then write the solution in JavaScript."

**What a strong answer should cover:**
- \`need\` = counts of t; \`window\` = counts in the current slice; \`required\` = distinct characters of t; \`have\` = distinct characters whose window count is at least their need.
- The window is valid exactly when \`have == required\`, so the check is O(1) instead of O(k).
- \`have\` changes only on threshold crossings: \`+1\` when a count reaches its need after adding, \`-1\` when it drops below after removing; spare copies change nothing.
- The equivalent \`missing\` counter over total copies, and the two classic bugs (\`>=\` on add, \`<=\` on remove).
- JavaScript specifics: \`Map\` counts with \`(m.get(c) || 0)\`, \`need.size\` for \`required\`, \`need.has(c)\` as the guard, and strict \`===\` for the threshold check.

**Clarifying questions expected:**
- "Do duplicate characters in t have to be matched with multiplicity?" — this is what makes counts necessary.

**Code / implementation expected:** Yes — the min-window function in JavaScript, explaining each counter update as it is written.`,
        answer: `**Target Audience:** Intermediate candidates who know the sliding window idea and want to explain the counters precisely; every term is defined.
**Difficulty:** Hard
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`node\` (the examples are plain browser-safe scripts).

## 1. Why This Even Matters — A Story First

A teacher is checking whether a group of students can form a team: the rule is **two** people who speak French, **one** who codes and **one** who draws. As students walk into the room one by one, she could re-read the whole rule list after every arrival — or she could keep a single tally on the board: "requirements met: 0 of 3". When the second French speaker walks in, the French requirement flips from unmet to met, so the tally goes to 1 of 3. A third French speaker changes nothing; the requirement was already met. When someone leaves, the tally drops only if their departure makes a requirement unmet again.

That tally is \`have\`, the number of requirements is \`required\`, and the per-skill counts are \`need\` and \`window\`. This question is asked separately from the plain [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring) because interviewers want you to explain the **mechanism**: exactly when each counter changes, why that makes the validity check O(1), and why the two most common off-by-one variants are wrong.

## 2. The Four Pieces of State

📌 **Interview term: need map** — the count of each character in t. For t = "AABC": {A: 2, B: 1, C: 1}. It never changes during the scan.

📌 **Interview term: window map** — the count of each character currently inside \`s[left..right]\`. It changes on every expand and every shrink.

📌 **Interview term: required** — the number of **distinct** characters in t (3 for "AABC"). Also constant.

📌 **Interview term: have** — the number of distinct characters c whose quota is met: \`window[c] >= need[c]\`. The window covers t exactly when \`have == required\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="need counts, window counts at right 5, and have equals 3 of 3">
  <text class="d-text" x="350" y="26" text-anchor="middle">t = ABC, window ADOBEC at right = 5</text>
  <rect class="d-box-muted" x="30" y="56" width="190" height="160" rx="12"/>
  <text class="d-text" x="125" y="88" text-anchor="middle">need</text>
  <text class="d-sub" x="125" y="122" text-anchor="middle">A: 1</text>
  <text class="d-sub" x="125" y="150" text-anchor="middle">B: 1</text>
  <text class="d-sub" x="125" y="178" text-anchor="middle">C: 1</text>
  <rect class="d-box" x="255" y="56" width="190" height="160" rx="12"/>
  <text class="d-text" x="350" y="88" text-anchor="middle">window</text>
  <text class="d-sub" x="350" y="122" text-anchor="middle">A: 1  B: 1  C: 1</text>
  <text class="d-sub" x="350" y="150" text-anchor="middle">D: 1  O: 1  E: 1</text>
  <text class="d-sub" x="350" y="178" text-anchor="middle">extras never count</text>
  <rect class="d-box-accent" x="480" y="56" width="190" height="160" rx="12"/>
  <text class="d-text d-accent" x="575" y="88" text-anchor="middle">have = 3</text>
  <text class="d-sub" x="575" y="122" text-anchor="middle">required = 3</text>
  <text class="d-sub" x="575" y="150" text-anchor="middle">equal, so</text>
  <text class="d-sub" x="575" y="178" text-anchor="middle">the window is valid</text>
</svg>

Characters that are not in t (D, O and E here) are counted in \`window\` but can never change \`have\`: their need is 0, so they are not requirements.

## 3. The One Rule: Count Crossings, Not Copies

\`have\` is a summary of the comparison \`window[c] >= need[c]\` for every c. That comparison only changes from false to true at the moment \`window[c]\` **reaches** \`need[c]\`, and only changes back at the moment it **drops below**. So:

- **After adding** a character c: if \`window[c] == need[c]\`, do \`have += 1\` (it just reached its quota). Any larger count means the quota was already met.
- **After removing** a character c: if \`window[c] < need[c]\` (that is, it was exactly at quota a moment ago), do \`have -= 1\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Count of B with need 1 going 0 1 2 1 0; have changes only at the crossings">
  <defs>
    <marker id="b08q5b-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="350" y="26" text-anchor="middle">B needs 1: the window count of B over time</text>
  <rect class="d-box-muted" x="30" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="70" y="146" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="170" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="210" y="146" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="310" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="350" y="146" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="450" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="490" y="146" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="590" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="630" y="146" text-anchor="middle">0</text>
  <path class="d-edge" d="M 114 140 L 166 140" marker-end="url(#b08q5b-javascript)"/>
  <text class="d-text d-accent" x="140" y="80" text-anchor="middle">have + 1</text>
  <path class="d-edge" d="M 254 140 L 306 140" marker-end="url(#b08q5b-javascript)"/>
  <text class="d-sub" x="280" y="80" text-anchor="middle">no change</text>
  <path class="d-edge" d="M 394 140 L 446 140" marker-end="url(#b08q5b-javascript)"/>
  <text class="d-sub" x="420" y="80" text-anchor="middle">no change</text>
  <path class="d-edge" d="M 534 140 L 586 140" marker-end="url(#b08q5b-javascript)"/>
  <text class="d-text d-accent" x="560" y="80" text-anchor="middle">have - 1</text>
</svg>

B goes 0 → 1 → 2 → 1 → 0. Only the first and last arrows change \`have\`; the middle two are spare copies coming and going.

📌 **Interview term: Invariant** — after every update, \`have\` equals the number of characters with \`window[c] >= need[c]\`. Each update keeps it true because it only fires on a crossing.

📌 **Interview term: Threshold crossing** — a count moving from one side of \`need[c]\` to the other. Detecting crossings with \`==\` (on add) and \`<\` (on remove) makes every update O(1), instead of re-comparing all k characters.

## 4. The Reference Implementation

This is the same function as the example on the [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring) page (verified there); the comments mark the counter updates:

~~~javascript
function minWindow(s, t) {
  if (s.length === 0 || t.length === 0) return '';
  const need = new Map();            // char -> copies the window must hold
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  const required = need.size;        // distinct chars that must be satisfied
  const window = new Map();
  let have = 0;                      // distinct chars currently satisfied
  let bestLen = Infinity, bestStart = 0, left = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    window.set(ch, (window.get(ch) || 0) + 1);
    if (need.has(ch) && window.get(ch) === need.get(ch)) have++;
    while (have === required) {      // valid: try to shrink from the left
      if (right - left + 1 < bestLen) {
        bestLen = right - left + 1;
        bestStart = left;
      }
      const out = s[left];
      window.set(out, window.get(out) - 1);
      if (need.has(out) && window.get(out) < need.get(out)) have--; // broke it
      left++;
    }
  }
  return bestLen === Infinity ? '' : s.slice(bestStart, bestStart + bestLen);
}
~~~

- \`need.size\` is the number of **distinct** keys, which is exactly \`required\`.
- \`need.has(ch) && window.get(ch) === need.get(ch)\` — the \`has\` guard keeps outsiders away from \`have\`; without it, \`window.get(ch) === undefined\` is simply false, which hides the mistake rather than reporting it.
- \`(window.get(ch) || 0) + 1\` avoids \`undefined + 1\`, which is \`NaN\`.
- Counts are small integers, so Number precision is not a concern.

## 5. The Equivalent Single Counter: missing

📌 **Interview term: missing counter** — instead of counting satisfied *distinct* characters, count the total **copies** of t's characters still owed: start at \`len(t)\`; decrement when an added character was still owed (\`window[c] <= need[c]\` after adding); increment when a removed character becomes owed again (\`window[c] < need[c]\` after removing). The window is valid when \`missing == 0\`.

Both are correct; \`have\`/\`required\` is easier to explain, \`missing\` is one variable shorter. Example 2 runs both side by side, and they agree on every case.

## 6. The Two Classic Bugs

| Bug | What it does | Verified result on ADOBECODEBANC / ABC |
| :--- | :--- | :--- |
| \`have += 1\` when \`window[c] >= need[c]\` (on add) | Counts the same character again for every extra copy, so \`have\` can exceed \`required\` or reach it too early | "BA" — does not even contain C |
| \`have -= 1\` when \`window[c] <= need[c]\` (on remove) | Also fires when a spare copy leaves, so \`have\` drops while the window is still valid | "ADOBEC" — misses the shorter "BANC" |

The case "aaflslflsldkalskaaa" / "aaa" gives "aaa" for all four versions: a test that only uses one kind of character can pass with both bugs. Use inputs with duplicates and spare copies, such as "AAB" / "AB" (the add bug returns "A").

## 7. Verified: Running the Code

Both programs are the runnable examples on this page; each was run with \`node main.js\`.

**Example 1 — every counter change on s = "ADOBECODEBANC", t = "ABC":**

~~~text
need=A:1,B:1,C:1 required=3
r=0 add A -> A satisfied, have=1
r=1 add D -> have=1
r=2 add O -> have=1
r=3 add B -> B satisfied, have=2
r=4 add E -> have=2
r=5 add C -> C satisfied, have=3
   valid ADOBEC (6) new best
   drop A -> A short, have=2
r=6 add O -> have=2
r=7 add D -> have=2
r=8 add E -> have=2
r=9 add B -> have=2
r=10 add A -> A satisfied, have=3
   valid DOBECODEBA (10)
   drop D
   valid OBECODEBA (9)
   drop O
   valid BECODEBA (8)
   drop B
   valid ECODEBA (7)
   drop E
   valid CODEBA (6)
   drop C -> C short, have=2
r=11 add N -> have=2
r=12 add C -> C satisfied, have=3
   valid ODEBANC (7)
   drop O
   valid DEBANC (6)
   drop D
   valid EBANC (5) new best
   drop E
   valid BANC (4) new best
   drop B -> B short, have=2
answer: BANC
~~~

Read it top to bottom. \`have\` reaches 3 at r = 5 ("ADOBEC", the first valid window) and dropping A breaks it. At r = 10 the window holds **two** B's, so later dropping the first B ("drop B" without "short") keeps it valid — a spare copy leaving. The shrink only stops when C leaves. At r = 12 the shrink walks down to "BANC", and dropping the only B ends it.

**Example 2 — the have/required scheme, the missing counter, and the two bugs on six inputs:**

~~~text
ADOBECODEBANC / ABC: have=(BANC) missing=(BANC) bug_add=(BA) bug_remove=(ADOBEC)
AAB / AB: have=(AB) missing=(AB) bug_add=(A) bug_remove=(AAB)
ADOBECODEBANC / AABC: have=(ADOBECODEBA) missing=(ADOBECODEBA) bug_add=(BANC) bug_remove=(ADOBECODEBA)
aaflslflsldkalskaaa / aaa: have=(aaa) missing=(aaa) bug_add=(aaa) bug_remove=(aaa)
BAAB / AB: have=(BA) missing=(BA) bug_add=(A) bug_remove=(BA)
xyz / xx: have=() missing=() bug_add=() bug_remove=()
~~~

\`have\` and \`missing\` agree everywhere. \`bug_add\` returns windows that do not cover t ("BA", "A"); \`bug_remove\` returns windows that cover t but are not the shortest ("ADOBEC", "AAB"). On "ADOBECODEBANC" / "AABC" the remove bug happens to give the right answer, and on the "aaa" case both bugs do — which is why a single passing test proves little.

## 8. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Each counter update | O(1) | One character, one comparison with its quota |
| Validity check | O(1) | \`have == required\` (or \`missing == 0\`) instead of comparing k counts |
| Whole scan | O(\\|s\\| + \\|t\\|) | Each character of s is added once and removed at most once |
| Space | O(k) | \`need\` and \`window\` hold one count per distinct character (fixed 128 slots for ASCII) |

## Edge Cases to Mention

- **t with duplicates** ("AABC"): \`required\` is 3, but A's quota is 2 — \`have\` counts A only when the window holds two A's.
- **Characters of s not in t:** counted in \`window\`, never touch \`have\`.
- **Impossible t** ("xyz" / "xx"): \`have\` never reaches \`required\`; return "".
- **Spare copies leaving:** removing a character whose count stays at or above quota keeps the window valid.

## Common Pitfalls

- **Using \`>=\` when incrementing \`have\`.** It counts every extra copy ("BA" on the classic input in the verified run).
- **Using \`<=\` when decrementing \`have\`.** It fires on spare copies ("ADOBEC" instead of "BANC").
- **Setting \`required = t.length\` while counting distinct characters.** For "AABC" that is 4 vs at most 3: never valid.
- **Forgetting \`|| 0\`.** \`window.get(ch) + 1\` on a new key is \`NaN\`, and \`NaN === 1\` is false, so \`have\` never increases.
- **Testing only with one repeated letter.** Both bugs passed "aaa" in the run; include duplicates plus spare copies.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">need</code> counts t, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code> counts the slice, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">required = need.size</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> is how many distinct characters are at quota. Valid iff <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have === required</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When have changes:</strong> <span style="color:#f0e2c8;">Up when an added char makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window.get(c) === need.get(c)</code>; down when a removed char drops below. Only crossings count.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it is O(1):</strong> <span style="color:#f0e2c8;">Each update touches one character, so validity never rescans t; the whole scan is O(|s| + |t|).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. JavaScript details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">|| 0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">need.size</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">need.has(c)</code> guard, strict <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The bugs:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;=</code> on add returned "BA"; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> on remove returned "ADOBEC". The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">missing</code> counter is an equally correct alternative.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why count distinct characters and not total characters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> tracks requirements, one per distinct character. To count copies, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">missing = t.length</code> instead, as example 2 does.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">===</code> on add, not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;=</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code> fires exactly once per crossing; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;=</code> fires again on every extra copy, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> overshoots ("BA" in the run).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Map or plain object for the counts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">required</code>, no prototype keys and clear <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>. An object needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys(o).length</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code> checks.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you avoid <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">have</code> entirely?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, by checking every key of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">need</code> against <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code> each step, but that is O(k) per step; the counter makes it O(1).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **need map** | Counts of each character of t; constant |
| **window map** | Counts of each character in the current slice |
| **required** | Number of distinct characters in t |
| **have** | Distinct characters currently at or above quota |
| **Invariant** | A fact restored after every update |
| **Threshold crossing** | A count moving across \`need[c]\` |
| **missing counter** | Total copies still owed; valid when it is 0 |

---
**Conclusion:** In JavaScript, the need/have scheme is two \`Map\`s, \`need.size\` and one integer that changes only on a crossing — \`===\` after adding, \`<\` after removing — which makes the validity check O(1). The same "count crossings, not copies" idea works for any window rule stated as per-key quotas, such as finding anagrams of a pattern inside a text; see also [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).`,
        examples: [
          {
            label: `Trace every need/have change on ADOBECODEBANC / ABC`,
            code: `// Trace the need/have counters on s = "ADOBECODEBANC", t = "ABC".
function minWindowTraced(s, t) {
  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  const required = need.size;
  const window = new Map();
  let have = 0, bestLen = -1, bestStart = 0, left = 0;
  const keys = [...need.keys()].sort(); // fine for single characters
  console.log('need=' + keys.map(c => c + ':' + need.get(c)).join(',') + ' required=' + required);
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    window.set(ch, (window.get(ch) || 0) + 1);
    if (need.has(ch) && window.get(ch) === need.get(ch)) {
      have++;
      console.log('r=' + right + ' add ' + ch + ' -> ' + ch + ' satisfied, have=' + have);
    } else {
      console.log('r=' + right + ' add ' + ch + ' -> have=' + have);
    }
    while (have === required) {
      const size = right - left + 1;
      if (bestLen === -1 || size < bestLen) {
        bestLen = size;
        bestStart = left;
        console.log('   valid ' + s.slice(left, right + 1) + ' (' + size + ') new best');
      } else {
        console.log('   valid ' + s.slice(left, right + 1) + ' (' + size + ')');
      }
      const out = s[left];
      window.set(out, window.get(out) - 1);
      if (need.has(out) && window.get(out) < need.get(out)) {
        have--;
        console.log('   drop ' + out + ' -> ' + out + ' short, have=' + have);
      } else {
        console.log('   drop ' + out);
      }
      left++;
    }
  }
  return bestLen === -1 ? '' : s.slice(bestStart, bestStart + bestLen);
}

console.log('answer: ' + minWindowTraced('ADOBECODEBANC', 'ABC'));`,
          },
          {
            label: `have vs missing counters, and the two classic off-by-one bugs`,
            code: `// Three ways to count "is the window valid?", and two classic off-by-one bugs.
function solve(s, t, mode) {
  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  const window = new Map();
  let missing = t.length;              // "missing": total characters still owed
  let have = 0;                        // the others: distinct characters satisfied
  const required = need.size;
  let bestLen = -1, bestStart = 0, left = 0;
  const valid = () => (mode === 'missing' ? missing === 0 : have === required);
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    window.set(ch, (window.get(ch) || 0) + 1);
    const w = window.get(ch), k = need.get(ch) || 0;
    if (mode === 'missing') {
      if (w <= k) missing--;           // this copy was still owed
    } else if (mode === 'bug_add') {
      if (k > 0 && w >= k) have++;     // BUG: counts the same char again on every extra copy
    } else if (k > 0 && w === k) {
      have++;                          // correct and bug_remove: exactly at the threshold
    }
    while (valid()) {
      if (bestLen === -1 || right - left + 1 < bestLen) {
        bestLen = right - left + 1;
        bestStart = left;
      }
      const out = s[left];
      window.set(out, window.get(out) - 1);
      const wo = window.get(out), ko = need.get(out) || 0;
      if (mode === 'missing') {
        if (wo < ko) missing++;
      } else if (mode === 'bug_remove') {
        if (ko > 0 && wo <= ko) have--; // BUG: also fires when a spare copy leaves
      } else if (ko > 0 && wo < ko) {
        have--;
      }
      left++;
    }
  }
  return bestLen === -1 ? '' : s.slice(bestStart, bestStart + bestLen);
}

const cases = [['ADOBECODEBANC', 'ABC'], ['AAB', 'AB'], ['ADOBECODEBANC', 'AABC'],
  ['aaflslflsldkalskaaa', 'aaa'], ['BAAB', 'AB'], ['xyz', 'xx']];
for (const [s, t] of cases) {
  let line = s + ' / ' + t + ':';
  for (const mode of ['have', 'missing', 'bug_add', 'bug_remove']) {
    line += ' ' + mode + '=(' + solve(s, t, mode) + ')';
  }
  console.log(line);
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"In the minimum window substring problem, people keep a 'need' map and a 'have' counter. Explain exactly what each one holds, when each counter changes, and why that makes the window check constant time. Then write the solution in Java."

**What a strong answer should cover:**
- \`need\` = counts of t; \`window\` = counts in the current slice; \`required\` = distinct characters of t; \`have\` = distinct characters whose window count is at least their need.
- The window is valid exactly when \`have == required\`, so the check is O(1) instead of O(k).
- \`have\` changes only on threshold crossings: \`+1\` when a count reaches its need after adding, \`-1\` when it drops below after removing; spare copies change nothing.
- The equivalent \`missing\` counter over total copies, and the two classic bugs (\`>=\` on add, \`<=\` on remove).
- Java specifics: \`int[128]\` counts (no boxing) or \`HashMap<Character, Integer>\` with \`merge\`; with maps, never compare two \`Integer\` counts with \`==\`; \`required\` counted when a need goes from 0 to 1.

**Clarifying questions expected:**
- "Do duplicate characters in t have to be matched with multiplicity?" — this is what makes counts necessary.

**Code / implementation expected:** Yes — the min-window method in Java, explaining each counter update as it is written.`,
        answer: `**Target Audience:** Intermediate candidates who know the sliding window idea and want to explain the counters precisely; every term is defined.
**Difficulty:** Hard
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`javac\` and \`java\`.

## 1. Why This Even Matters — A Story First

A teacher is checking whether a group of students can form a team: the rule is **two** people who speak French, **one** who codes and **one** who draws. As students walk into the room one by one, she could re-read the whole rule list after every arrival — or she could keep a single tally on the board: "requirements met: 0 of 3". When the second French speaker walks in, the French requirement flips from unmet to met, so the tally goes to 1 of 3. A third French speaker changes nothing; the requirement was already met. When someone leaves, the tally drops only if their departure makes a requirement unmet again.

That tally is \`have\`, the number of requirements is \`required\`, and the per-skill counts are \`need\` and \`window\`. This question is asked separately from the plain [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring) because interviewers want you to explain the **mechanism**: exactly when each counter changes, why that makes the validity check O(1), and why the two most common off-by-one variants are wrong.

## 2. The Four Pieces of State

📌 **Interview term: need map** — the count of each character in t. For t = "AABC": {A: 2, B: 1, C: 1}. It never changes during the scan.

📌 **Interview term: window map** — the count of each character currently inside \`s[left..right]\`. It changes on every expand and every shrink.

📌 **Interview term: required** — the number of **distinct** characters in t (3 for "AABC"). Also constant.

📌 **Interview term: have** — the number of distinct characters c whose quota is met: \`window[c] >= need[c]\`. The window covers t exactly when \`have == required\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="need counts, window counts at right 5, and have equals 3 of 3">
  <text class="d-text" x="350" y="26" text-anchor="middle">t = ABC, window ADOBEC at right = 5</text>
  <rect class="d-box-muted" x="30" y="56" width="190" height="160" rx="12"/>
  <text class="d-text" x="125" y="88" text-anchor="middle">need</text>
  <text class="d-sub" x="125" y="122" text-anchor="middle">A: 1</text>
  <text class="d-sub" x="125" y="150" text-anchor="middle">B: 1</text>
  <text class="d-sub" x="125" y="178" text-anchor="middle">C: 1</text>
  <rect class="d-box" x="255" y="56" width="190" height="160" rx="12"/>
  <text class="d-text" x="350" y="88" text-anchor="middle">window</text>
  <text class="d-sub" x="350" y="122" text-anchor="middle">A: 1  B: 1  C: 1</text>
  <text class="d-sub" x="350" y="150" text-anchor="middle">D: 1  O: 1  E: 1</text>
  <text class="d-sub" x="350" y="178" text-anchor="middle">extras never count</text>
  <rect class="d-box-accent" x="480" y="56" width="190" height="160" rx="12"/>
  <text class="d-text d-accent" x="575" y="88" text-anchor="middle">have = 3</text>
  <text class="d-sub" x="575" y="122" text-anchor="middle">required = 3</text>
  <text class="d-sub" x="575" y="150" text-anchor="middle">equal, so</text>
  <text class="d-sub" x="575" y="178" text-anchor="middle">the window is valid</text>
</svg>

Characters that are not in t (D, O and E here) are counted in \`window\` but can never change \`have\`: their need is 0, so they are not requirements.

## 3. The One Rule: Count Crossings, Not Copies

\`have\` is a summary of the comparison \`window[c] >= need[c]\` for every c. That comparison only changes from false to true at the moment \`window[c]\` **reaches** \`need[c]\`, and only changes back at the moment it **drops below**. So:

- **After adding** a character c: if \`window[c] == need[c]\`, do \`have += 1\` (it just reached its quota). Any larger count means the quota was already met.
- **After removing** a character c: if \`window[c] < need[c]\` (that is, it was exactly at quota a moment ago), do \`have -= 1\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Count of B with need 1 going 0 1 2 1 0; have changes only at the crossings">
  <defs>
    <marker id="b08q5b-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="350" y="26" text-anchor="middle">B needs 1: the window count of B over time</text>
  <rect class="d-box-muted" x="30" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="70" y="146" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="170" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="210" y="146" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="310" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="350" y="146" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="450" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="490" y="146" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="590" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="630" y="146" text-anchor="middle">0</text>
  <path class="d-edge" d="M 114 140 L 166 140" marker-end="url(#b08q5b-java)"/>
  <text class="d-text d-accent" x="140" y="80" text-anchor="middle">have + 1</text>
  <path class="d-edge" d="M 254 140 L 306 140" marker-end="url(#b08q5b-java)"/>
  <text class="d-sub" x="280" y="80" text-anchor="middle">no change</text>
  <path class="d-edge" d="M 394 140 L 446 140" marker-end="url(#b08q5b-java)"/>
  <text class="d-sub" x="420" y="80" text-anchor="middle">no change</text>
  <path class="d-edge" d="M 534 140 L 586 140" marker-end="url(#b08q5b-java)"/>
  <text class="d-text d-accent" x="560" y="80" text-anchor="middle">have - 1</text>
</svg>

B goes 0 → 1 → 2 → 1 → 0. Only the first and last arrows change \`have\`; the middle two are spare copies coming and going.

📌 **Interview term: Invariant** — after every update, \`have\` equals the number of characters with \`window[c] >= need[c]\`. Each update keeps it true because it only fires on a crossing.

📌 **Interview term: Threshold crossing** — a count moving from one side of \`need[c]\` to the other. Detecting crossings with \`==\` (on add) and \`<\` (on remove) makes every update O(1), instead of re-comparing all k characters.

## 4. The Reference Implementation

This is the same function as the example on the [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring) page (verified there); the comments mark the counter updates:

~~~java
static String minWindow(String s, String t) {
    if (s.isEmpty() || t.isEmpty()) return "";
    int[] need = new int[128];          // ASCII: index = char code, value = copies needed
    int required = 0;                   // distinct chars that must be satisfied
    for (char c : t.toCharArray()) {
        if (need[c] == 0) required++;
        need[c]++;
    }
    int[] window = new int[128];
    int have = 0;                       // distinct chars currently satisfied
    int bestLen = Integer.MAX_VALUE, bestStart = 0, left = 0;
    for (int right = 0; right < s.length(); right++) {
        char ch = s.charAt(right);
        window[ch]++;
        if (need[ch] > 0 && window[ch] == need[ch]) have++;
        while (have == required) {      // valid: try to shrink from the left
            if (right - left + 1 < bestLen) {
                bestLen = right - left + 1;
                bestStart = left;
            }
            char out = s.charAt(left);
            window[out]--;
            if (need[out] > 0 && window[out] < need[out]) have--; // broke it
            left++;
        }
    }
    return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestStart, bestStart + bestLen);
}
~~~

- With \`int[128]\`, \`required\` is counted while building \`need\`: increment it when \`need[c]\` goes from 0 to 1.
- \`need[ch] > 0\` is the guard: outsiders have a need of 0 and never change \`have\`.
- Example 1 uses \`HashMap\`s. \`window.merge(ch, 1, Integer::sum)\` returns the new count, unboxed into an \`int w\`, and \`w == need.get(ch)\` compares an \`int\` with an \`Integer\`, which unboxes the \`Integer\` — safe. Comparing **two** \`Integer\`s with \`==\` compares references and fails above 127 (in the lab \`Integer\` 127 == 127 was true, 128 == 128 false).
- \`TreeMap\` is used in example 1 only so the \`need\` line prints in sorted order.

## 5. The Equivalent Single Counter: missing

📌 **Interview term: missing counter** — instead of counting satisfied *distinct* characters, count the total **copies** of t's characters still owed: start at \`len(t)\`; decrement when an added character was still owed (\`window[c] <= need[c]\` after adding); increment when a removed character becomes owed again (\`window[c] < need[c]\` after removing). The window is valid when \`missing == 0\`.

Both are correct; \`have\`/\`required\` is easier to explain, \`missing\` is one variable shorter. Example 2 runs both side by side, and they agree on every case.

## 6. The Two Classic Bugs

| Bug | What it does | Verified result on ADOBECODEBANC / ABC |
| :--- | :--- | :--- |
| \`have += 1\` when \`window[c] >= need[c]\` (on add) | Counts the same character again for every extra copy, so \`have\` can exceed \`required\` or reach it too early | "BA" — does not even contain C |
| \`have -= 1\` when \`window[c] <= need[c]\` (on remove) | Also fires when a spare copy leaves, so \`have\` drops while the window is still valid | "ADOBEC" — misses the shorter "BANC" |

The case "aaflslflsldkalskaaa" / "aaa" gives "aaa" for all four versions: a test that only uses one kind of character can pass with both bugs. Use inputs with duplicates and spare copies, such as "AAB" / "AB" (the add bug returns "A").

## 7. Verified: Running the Code

Both programs are the runnable examples on this page; each was run with \`javac Main.java && java Main\`.

**Example 1 — every counter change on s = "ADOBECODEBANC", t = "ABC":**

~~~text
need=A:1,B:1,C:1 required=3
r=0 add A -> A satisfied, have=1
r=1 add D -> have=1
r=2 add O -> have=1
r=3 add B -> B satisfied, have=2
r=4 add E -> have=2
r=5 add C -> C satisfied, have=3
   valid ADOBEC (6) new best
   drop A -> A short, have=2
r=6 add O -> have=2
r=7 add D -> have=2
r=8 add E -> have=2
r=9 add B -> have=2
r=10 add A -> A satisfied, have=3
   valid DOBECODEBA (10)
   drop D
   valid OBECODEBA (9)
   drop O
   valid BECODEBA (8)
   drop B
   valid ECODEBA (7)
   drop E
   valid CODEBA (6)
   drop C -> C short, have=2
r=11 add N -> have=2
r=12 add C -> C satisfied, have=3
   valid ODEBANC (7)
   drop O
   valid DEBANC (6)
   drop D
   valid EBANC (5) new best
   drop E
   valid BANC (4) new best
   drop B -> B short, have=2
answer: BANC
~~~

Read it top to bottom. \`have\` reaches 3 at r = 5 ("ADOBEC", the first valid window) and dropping A breaks it. At r = 10 the window holds **two** B's, so later dropping the first B ("drop B" without "short") keeps it valid — a spare copy leaving. The shrink only stops when C leaves. At r = 12 the shrink walks down to "BANC", and dropping the only B ends it.

**Example 2 — the have/required scheme, the missing counter, and the two bugs on six inputs:**

~~~text
ADOBECODEBANC / ABC: have=(BANC) missing=(BANC) bug_add=(BA) bug_remove=(ADOBEC)
AAB / AB: have=(AB) missing=(AB) bug_add=(A) bug_remove=(AAB)
ADOBECODEBANC / AABC: have=(ADOBECODEBA) missing=(ADOBECODEBA) bug_add=(BANC) bug_remove=(ADOBECODEBA)
aaflslflsldkalskaaa / aaa: have=(aaa) missing=(aaa) bug_add=(aaa) bug_remove=(aaa)
BAAB / AB: have=(BA) missing=(BA) bug_add=(A) bug_remove=(BA)
xyz / xx: have=() missing=() bug_add=() bug_remove=()
~~~

\`have\` and \`missing\` agree everywhere. \`bug_add\` returns windows that do not cover t ("BA", "A"); \`bug_remove\` returns windows that cover t but are not the shortest ("ADOBEC", "AAB"). On "ADOBECODEBANC" / "AABC" the remove bug happens to give the right answer, and on the "aaa" case both bugs do — which is why a single passing test proves little.

## 8. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Each counter update | O(1) | One character, one comparison with its quota |
| Validity check | O(1) | \`have == required\` (or \`missing == 0\`) instead of comparing k counts |
| Whole scan | O(\\|s\\| + \\|t\\|) | Each character of s is added once and removed at most once |
| Space | O(k) | \`need\` and \`window\` hold one count per distinct character (fixed 128 slots for ASCII) |

## Edge Cases to Mention

- **t with duplicates** ("AABC"): \`required\` is 3, but A's quota is 2 — \`have\` counts A only when the window holds two A's.
- **Characters of s not in t:** counted in \`window\`, never touch \`have\`.
- **Impossible t** ("xyz" / "xx"): \`have\` never reaches \`required\`; return "".
- **Spare copies leaving:** removing a character whose count stays at or above quota keeps the window valid.

## Common Pitfalls

- **Using \`>=\` when incrementing \`have\`.** It counts every extra copy ("BA" on the classic input in the verified run).
- **Using \`<=\` when decrementing \`have\`.** It fires on spare copies ("ADOBEC" instead of "BANC").
- **\`window.get(c) == need.get(c)\` with two \`Integer\`s.** Reference comparison: works up to 127, fails at 128.
- **Setting \`required = t.length()\` while counting distinct characters.** For "AABC" that is 4 vs at most 3: never valid.
- **Testing only with one repeated letter.** Both bugs passed "aaa" in the run; include duplicates plus spare copies.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">need</code> counts t, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code> counts the slice, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">required</code> is the number of distinct characters, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> is how many are at quota. Valid iff <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have == required</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When have changes:</strong> <span style="color:#f0e2c8;">Up when an added char makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window[c] == need[c]</code>; down when a removed char makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window[c] &lt; need[c]</code>. Only crossings count.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it is O(1):</strong> <span style="color:#f0e2c8;">Each update touches one character, so validity never rescans t; the whole scan is O(|s| + |t|).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Java details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[128]</code> avoids boxing; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code>, unbox before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> 128 == 128 is false.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The bugs:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;=</code> on add returned "BA"; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> on remove returned "ADOBEC". The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">missing</code> counter is an equally correct alternative.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why count distinct characters and not total characters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> tracks requirements, one per distinct character. To count copies, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">missing = t.length()</code> instead, as example 2 does.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">==</code> on add, not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;=</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> fires exactly once per crossing; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;=</code> fires again on every extra copy, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> overshoots ("BA" in the run).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">w == need.get(ch)</code> safe in your trace code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w</code> is a primitive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, so Java unboxes the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code>. If both sides were <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> it would compare references.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you avoid <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">have</code> entirely?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, by looping over all 128 slots each step, but that is O(k) per step; the counter makes it O(1).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **need map** | Counts of each character of t; constant |
| **window map** | Counts of each character in the current slice |
| **required** | Number of distinct characters in t |
| **have** | Distinct characters currently at or above quota |
| **Invariant** | A fact restored after every update |
| **Threshold crossing** | A count moving across \`need[c]\` |
| **missing counter** | Total copies still owed; valid when it is 0 |

---
**Conclusion:** In Java, the need/have scheme is two \`int[128]\` count arrays (or HashMaps with careful unboxing) and one integer that changes only on a crossing — \`==\` after adding, \`<\` after removing — which makes the validity check O(1). The same "count crossings, not copies" idea works for any window rule stated as per-key quotas, such as finding anagrams of a pattern inside a text; see also [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).`,
        examples: [
          {
            label: `Trace every need/have change on ADOBECODEBANC / ABC`,
            code: `import java.util.*;

// Trace the need/have counters on s = "ADOBECODEBANC", t = "ABC".
public class Main {
    static String minWindowTraced(String s, String t) {
        Map<Character, Integer> need = new TreeMap<>();   // TreeMap: keys print in sorted order
        for (char c : t.toCharArray()) need.merge(c, 1, Integer::sum);
        int required = need.size();
        Map<Character, Integer> window = new HashMap<>();
        int have = 0, bestLen = -1, bestStart = 0, left = 0;
        StringBuilder head = new StringBuilder("need=");
        for (Map.Entry<Character, Integer> e : need.entrySet()) {
            if (head.length() > 5) head.append(",");
            head.append(e.getKey()).append(":").append(e.getValue());
        }
        System.out.println(head + " required=" + required);
        for (int right = 0; right < s.length(); right++) {
            char ch = s.charAt(right);
            int w = window.merge(ch, 1, Integer::sum);       // unboxed into an int here
            if (need.containsKey(ch) && w == need.get(ch)) { // int == Integer: unboxes, safe
                have++;
                System.out.println("r=" + right + " add " + ch + " -> " + ch + " satisfied, have=" + have);
            } else {
                System.out.println("r=" + right + " add " + ch + " -> have=" + have);
            }
            while (have == required) {
                int size = right - left + 1;
                if (bestLen == -1 || size < bestLen) {
                    bestLen = size;
                    bestStart = left;
                    System.out.println("   valid " + s.substring(left, right + 1) + " (" + size + ") new best");
                } else {
                    System.out.println("   valid " + s.substring(left, right + 1) + " (" + size + ")");
                }
                char out = s.charAt(left);
                int wo = window.merge(out, -1, Integer::sum);
                if (need.containsKey(out) && wo < need.get(out)) {
                    have--;
                    System.out.println("   drop " + out + " -> " + out + " short, have=" + have);
                } else {
                    System.out.println("   drop " + out);
                }
                left++;
            }
        }
        return bestLen == -1 ? "" : s.substring(bestStart, bestStart + bestLen);
    }

    public static void main(String[] args) {
        System.out.println("answer: " + minWindowTraced("ADOBECODEBANC", "ABC"));
    }
}`,
          },
          {
            label: `have vs missing counters, and the two classic off-by-one bugs`,
            code: `// Three ways to count "is the window valid?", and two classic off-by-one bugs.
public class Main {
    static String solve(String s, String t, String mode) {
        int[] need = new int[128];
        int required = 0;
        for (char c : t.toCharArray()) {
            if (need[c] == 0) required++;
            need[c]++;
        }
        int[] window = new int[128];
        int missing = t.length();              // "missing": total characters still owed
        int have = 0;                          // the others: distinct characters satisfied
        boolean useMissing = mode.equals("missing"); // equals, not ==, for String contents
        int bestLen = -1, bestStart = 0, left = 0;
        for (int right = 0; right < s.length(); right++) {
            char ch = s.charAt(right);
            window[ch]++;
            if (useMissing) {
                if (window[ch] <= need[ch]) missing--;           // this copy was still owed
            } else if (mode.equals("bug_add")) {
                if (need[ch] > 0 && window[ch] >= need[ch]) have++; // BUG: counts every extra copy
            } else if (need[ch] > 0 && window[ch] == need[ch]) {
                have++;                                          // exactly at the threshold
            }
            while (useMissing ? missing == 0 : have == required) {
                if (bestLen == -1 || right - left + 1 < bestLen) {
                    bestLen = right - left + 1;
                    bestStart = left;
                }
                char out = s.charAt(left);
                window[out]--;
                if (useMissing) {
                    if (window[out] < need[out]) missing++;
                } else if (mode.equals("bug_remove")) {
                    if (need[out] > 0 && window[out] <= need[out]) have--; // BUG: spare copy too
                } else if (need[out] > 0 && window[out] < need[out]) {
                    have--;
                }
                left++;
            }
        }
        return bestLen == -1 ? "" : s.substring(bestStart, bestStart + bestLen);
    }

    public static void main(String[] args) {
        String[][] cases = {{"ADOBECODEBANC", "ABC"}, {"AAB", "AB"}, {"ADOBECODEBANC", "AABC"},
            {"aaflslflsldkalskaaa", "aaa"}, {"BAAB", "AB"}, {"xyz", "xx"}};
        for (String[] c : cases) {
            StringBuilder line = new StringBuilder(c[0] + " / " + c[1] + ":");
            for (String mode : new String[]{"have", "missing", "bug_add", "bug_remove"}) {
                line.append(" ").append(mode).append("=(").append(solve(c[0], c[1], mode)).append(")");
            }
            System.out.println(line);
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"In the minimum window substring problem, people keep a 'need' map and a 'have' counter. Explain exactly what each one holds, when each counter changes, and why that makes the window check constant time. Then write the solution in C++."

**What a strong answer should cover:**
- \`need\` = counts of t; \`window\` = counts in the current slice; \`required\` = distinct characters of t; \`have\` = distinct characters whose window count is at least their need.
- The window is valid exactly when \`have == required\`, so the check is O(1) instead of O(k).
- \`have\` changes only on threshold crossings: \`+1\` when a count reaches its need after adding, \`-1\` when it drops below after removing; spare copies change nothing.
- The equivalent \`missing\` counter over total copies, and the two classic bugs (\`>=\` on add, \`<=\` on remove).
- C++ specifics: \`array<int, 128>{}\` counts or \`unordered_map<char, int>\` with \`find\` (since \`operator[]\` inserts), \`need[c] > 0\` as the guard, and \`++window[c]\` returning the new count.

**Clarifying questions expected:**
- "Do duplicate characters in t have to be matched with multiplicity?" — this is what makes counts necessary.

**Code / implementation expected:** Yes — the min-window function in C++17, explaining each counter update as it is written.`,
        answer: `**Target Audience:** Intermediate candidates who know the sliding window idea and want to explain the counters precisely; every term is defined.
**Difficulty:** Hard
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged \`📌 Interview term:\` with the exact vocabulary an interviewer expects. Every output quoted in the **Verified** section was printed by actually running the code shown with \`g++ -std=c++17\`.

## 1. Why This Even Matters — A Story First

A teacher is checking whether a group of students can form a team: the rule is **two** people who speak French, **one** who codes and **one** who draws. As students walk into the room one by one, she could re-read the whole rule list after every arrival — or she could keep a single tally on the board: "requirements met: 0 of 3". When the second French speaker walks in, the French requirement flips from unmet to met, so the tally goes to 1 of 3. A third French speaker changes nothing; the requirement was already met. When someone leaves, the tally drops only if their departure makes a requirement unmet again.

That tally is \`have\`, the number of requirements is \`required\`, and the per-skill counts are \`need\` and \`window\`. This question is asked separately from the plain [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring) because interviewers want you to explain the **mechanism**: exactly when each counter changes, why that makes the validity check O(1), and why the two most common off-by-one variants are wrong.

## 2. The Four Pieces of State

📌 **Interview term: need map** — the count of each character in t. For t = "AABC": {A: 2, B: 1, C: 1}. It never changes during the scan.

📌 **Interview term: window map** — the count of each character currently inside \`s[left..right]\`. It changes on every expand and every shrink.

📌 **Interview term: required** — the number of **distinct** characters in t (3 for "AABC"). Also constant.

📌 **Interview term: have** — the number of distinct characters c whose quota is met: \`window[c] >= need[c]\`. The window covers t exactly when \`have == required\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="need counts, window counts at right 5, and have equals 3 of 3">
  <text class="d-text" x="350" y="26" text-anchor="middle">t = ABC, window ADOBEC at right = 5</text>
  <rect class="d-box-muted" x="30" y="56" width="190" height="160" rx="12"/>
  <text class="d-text" x="125" y="88" text-anchor="middle">need</text>
  <text class="d-sub" x="125" y="122" text-anchor="middle">A: 1</text>
  <text class="d-sub" x="125" y="150" text-anchor="middle">B: 1</text>
  <text class="d-sub" x="125" y="178" text-anchor="middle">C: 1</text>
  <rect class="d-box" x="255" y="56" width="190" height="160" rx="12"/>
  <text class="d-text" x="350" y="88" text-anchor="middle">window</text>
  <text class="d-sub" x="350" y="122" text-anchor="middle">A: 1  B: 1  C: 1</text>
  <text class="d-sub" x="350" y="150" text-anchor="middle">D: 1  O: 1  E: 1</text>
  <text class="d-sub" x="350" y="178" text-anchor="middle">extras never count</text>
  <rect class="d-box-accent" x="480" y="56" width="190" height="160" rx="12"/>
  <text class="d-text d-accent" x="575" y="88" text-anchor="middle">have = 3</text>
  <text class="d-sub" x="575" y="122" text-anchor="middle">required = 3</text>
  <text class="d-sub" x="575" y="150" text-anchor="middle">equal, so</text>
  <text class="d-sub" x="575" y="178" text-anchor="middle">the window is valid</text>
</svg>

Characters that are not in t (D, O and E here) are counted in \`window\` but can never change \`have\`: their need is 0, so they are not requirements.

## 3. The One Rule: Count Crossings, Not Copies

\`have\` is a summary of the comparison \`window[c] >= need[c]\` for every c. That comparison only changes from false to true at the moment \`window[c]\` **reaches** \`need[c]\`, and only changes back at the moment it **drops below**. So:

- **After adding** a character c: if \`window[c] == need[c]\`, do \`have += 1\` (it just reached its quota). Any larger count means the quota was already met.
- **After removing** a character c: if \`window[c] < need[c]\` (that is, it was exactly at quota a moment ago), do \`have -= 1\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Count of B with need 1 going 0 1 2 1 0; have changes only at the crossings">
  <defs>
    <marker id="b08q5b-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="350" y="26" text-anchor="middle">B needs 1: the window count of B over time</text>
  <rect class="d-box-muted" x="30" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="70" y="146" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="170" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="210" y="146" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="310" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="350" y="146" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="450" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="490" y="146" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="590" y="110" width="80" height="60" rx="10"/>
  <text class="d-text" x="630" y="146" text-anchor="middle">0</text>
  <path class="d-edge" d="M 114 140 L 166 140" marker-end="url(#b08q5b-cpp)"/>
  <text class="d-text d-accent" x="140" y="80" text-anchor="middle">have + 1</text>
  <path class="d-edge" d="M 254 140 L 306 140" marker-end="url(#b08q5b-cpp)"/>
  <text class="d-sub" x="280" y="80" text-anchor="middle">no change</text>
  <path class="d-edge" d="M 394 140 L 446 140" marker-end="url(#b08q5b-cpp)"/>
  <text class="d-sub" x="420" y="80" text-anchor="middle">no change</text>
  <path class="d-edge" d="M 534 140 L 586 140" marker-end="url(#b08q5b-cpp)"/>
  <text class="d-text d-accent" x="560" y="80" text-anchor="middle">have - 1</text>
</svg>

B goes 0 → 1 → 2 → 1 → 0. Only the first and last arrows change \`have\`; the middle two are spare copies coming and going.

📌 **Interview term: Invariant** — after every update, \`have\` equals the number of characters with \`window[c] >= need[c]\`. Each update keeps it true because it only fires on a crossing.

📌 **Interview term: Threshold crossing** — a count moving from one side of \`need[c]\` to the other. Detecting crossings with \`==\` (on add) and \`<\` (on remove) makes every update O(1), instead of re-comparing all k characters.

## 4. The Reference Implementation

This is the same function as the example on the [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring) page (verified there); the comments mark the counter updates:

~~~cpp
string minWindow(const string& s, const string& t) {
    if (s.empty() || t.empty()) return "";
    array<int, 128> need{};                 // {} zero-fills; ASCII char code -> copies needed
    int required = 0;                       // distinct chars that must be satisfied
    for (char c : t) {
        if (need[c] == 0) required++;
        need[c]++;
    }
    array<int, 128> window{};
    int have = 0;                           // distinct chars currently satisfied
    int bestLen = INT_MAX, bestStart = 0, left = 0;
    for (int right = 0; right < static_cast<int>(s.size()); right++) {
        char ch = s[right];
        window[ch]++;
        if (need[ch] > 0 && window[ch] == need[ch]) have++;
        while (have == required) {          // valid: try to shrink from the left
            if (right - left + 1 < bestLen) {
                bestLen = right - left + 1;
                bestStart = left;
            }
            char out = s[left];
            window[out]--;
            if (need[out] > 0 && window[out] < need[out]) have--; // broke it
            left++;
        }
    }
    return bestLen == INT_MAX ? "" : s.substr(bestStart, bestLen);
}
~~~

- With \`array<int, 128> need{}\`, \`required\` is counted while building \`need\`: increment it when \`need[c]\` goes from 0 to 1.
- \`need[ch] > 0\` is the guard: outsiders have a need of 0 and never change \`have\`.
- Example 1 uses maps. \`int w = ++window[ch];\` uses the fact that \`operator[]\` inserts 0 for a new key and then the pre-increment returns the new value. For \`need\`, it uses \`need.find(ch)\`: \`need[ch]\` would insert a zero entry, filling \`need\` with characters that are not requirements and changing \`need.size()\`.
- Example 1 also shows a C++17 ordering trap: \`cout << "answer: " << f()\` evaluates left to right, so "answer: " is printed **before** \`f()\` runs its own prints. In the lab that put the label on the first line (\`answer: need=A:1,B:1,C:1 required=3\`); the example now calls \`f()\` first.

## 5. The Equivalent Single Counter: missing

📌 **Interview term: missing counter** — instead of counting satisfied *distinct* characters, count the total **copies** of t's characters still owed: start at \`len(t)\`; decrement when an added character was still owed (\`window[c] <= need[c]\` after adding); increment when a removed character becomes owed again (\`window[c] < need[c]\` after removing). The window is valid when \`missing == 0\`.

Both are correct; \`have\`/\`required\` is easier to explain, \`missing\` is one variable shorter. Example 2 runs both side by side, and they agree on every case.

## 6. The Two Classic Bugs

| Bug | What it does | Verified result on ADOBECODEBANC / ABC |
| :--- | :--- | :--- |
| \`have += 1\` when \`window[c] >= need[c]\` (on add) | Counts the same character again for every extra copy, so \`have\` can exceed \`required\` or reach it too early | "BA" — does not even contain C |
| \`have -= 1\` when \`window[c] <= need[c]\` (on remove) | Also fires when a spare copy leaves, so \`have\` drops while the window is still valid | "ADOBEC" — misses the shorter "BANC" |

The case "aaflslflsldkalskaaa" / "aaa" gives "aaa" for all four versions: a test that only uses one kind of character can pass with both bugs. Use inputs with duplicates and spare copies, such as "AAB" / "AB" (the add bug returns "A").

## 7. Verified: Running the Code

Both programs are the runnable examples on this page; each was run with \`g++ -std=c++17 main.cpp && ./a.out\`.

**Example 1 — every counter change on s = "ADOBECODEBANC", t = "ABC":**

~~~text
need=A:1,B:1,C:1 required=3
r=0 add A -> A satisfied, have=1
r=1 add D -> have=1
r=2 add O -> have=1
r=3 add B -> B satisfied, have=2
r=4 add E -> have=2
r=5 add C -> C satisfied, have=3
   valid ADOBEC (6) new best
   drop A -> A short, have=2
r=6 add O -> have=2
r=7 add D -> have=2
r=8 add E -> have=2
r=9 add B -> have=2
r=10 add A -> A satisfied, have=3
   valid DOBECODEBA (10)
   drop D
   valid OBECODEBA (9)
   drop O
   valid BECODEBA (8)
   drop B
   valid ECODEBA (7)
   drop E
   valid CODEBA (6)
   drop C -> C short, have=2
r=11 add N -> have=2
r=12 add C -> C satisfied, have=3
   valid ODEBANC (7)
   drop O
   valid DEBANC (6)
   drop D
   valid EBANC (5) new best
   drop E
   valid BANC (4) new best
   drop B -> B short, have=2
answer: BANC
~~~

Read it top to bottom. \`have\` reaches 3 at r = 5 ("ADOBEC", the first valid window) and dropping A breaks it. At r = 10 the window holds **two** B's, so later dropping the first B ("drop B" without "short") keeps it valid — a spare copy leaving. The shrink only stops when C leaves. At r = 12 the shrink walks down to "BANC", and dropping the only B ends it.

**Example 2 — the have/required scheme, the missing counter, and the two bugs on six inputs:**

~~~text
ADOBECODEBANC / ABC: have=(BANC) missing=(BANC) bug_add=(BA) bug_remove=(ADOBEC)
AAB / AB: have=(AB) missing=(AB) bug_add=(A) bug_remove=(AAB)
ADOBECODEBANC / AABC: have=(ADOBECODEBA) missing=(ADOBECODEBA) bug_add=(BANC) bug_remove=(ADOBECODEBA)
aaflslflsldkalskaaa / aaa: have=(aaa) missing=(aaa) bug_add=(aaa) bug_remove=(aaa)
BAAB / AB: have=(BA) missing=(BA) bug_add=(A) bug_remove=(BA)
xyz / xx: have=() missing=() bug_add=() bug_remove=()
~~~

\`have\` and \`missing\` agree everywhere. \`bug_add\` returns windows that do not cover t ("BA", "A"); \`bug_remove\` returns windows that cover t but are not the shortest ("ADOBEC", "AAB"). On "ADOBECODEBANC" / "AABC" the remove bug happens to give the right answer, and on the "aaa" case both bugs do — which is why a single passing test proves little.

## 8. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Each counter update | O(1) | One character, one comparison with its quota |
| Validity check | O(1) | \`have == required\` (or \`missing == 0\`) instead of comparing k counts |
| Whole scan | O(\\|s\\| + \\|t\\|) | Each character of s is added once and removed at most once |
| Space | O(k) | \`need\` and \`window\` hold one count per distinct character (fixed 128 slots for ASCII) |

## Edge Cases to Mention

- **t with duplicates** ("AABC"): \`required\` is 3, but A's quota is 2 — \`have\` counts A only when the window holds two A's.
- **Characters of s not in t:** counted in \`window\`, never touch \`have\`.
- **Impossible t** ("xyz" / "xx"): \`have\` never reaches \`required\`; return "".
- **Spare copies leaving:** removing a character whose count stays at or above quota keeps the window valid.

## Common Pitfalls

- **Using \`>=\` when incrementing \`have\`.** It counts every extra copy ("BA" on the classic input in the verified run).
- **Using \`<=\` when decrementing \`have\`.** It fires on spare copies ("ADOBEC" instead of "BANC").
- **Reading \`need[ch]\` on a \`map\`/\`unordered_map\`.** It inserts a zero entry; if \`required\` is \`need.size()\`, computing it after such reads gives the wrong number.
- **Setting \`required = t.size()\` while counting distinct characters.** For "AABC" that is 4 vs at most 3: never valid.
- **Testing only with one repeated letter.** Both bugs passed "aaa" in the run; include duplicates plus spare copies.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">need</code> counts t, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window</code> counts the slice, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">required</code> is the number of distinct characters, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> is how many are at quota. Valid iff <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have == required</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When have changes:</strong> <span style="color:#f0e2c8;">Up when an added char makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window[c] == need[c]</code>; down when a removed char makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window[c] &lt; need[c]</code>. Only crossings count.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it is O(1):</strong> <span style="color:#f0e2c8;">Each update touches one character, so validity never rescans t; the whole scan is O(|s| + |t|).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. C++ details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">array&lt;int, 128&gt;{}</code> zero-fills; with maps use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> inserts; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">++window[c]</code> yields the new count.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The bugs:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;=</code> on add returned "BA"; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> on remove returned "ADOBEC". The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">missing</code> counter is an equally correct alternative.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why count distinct characters and not total characters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> tracks requirements, one per distinct character. To count copies, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">missing = t.size()</code> instead, as example 2 does.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">==</code> on add, not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;=</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> fires exactly once per crossing; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;=</code> fires again on every extra copy, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">have</code> overshoots ("BA" in the run).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">need.find(ch)</code> matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">need[ch]</code> on a map inserts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ch, 0}</code>. That would not break the comparison, but it grows the map and changes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">need.size()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you avoid <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">have</code> entirely?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, by comparing all 128 slots each step, but that is O(k) per step; the counter makes it O(1).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **need map** | Counts of each character of t; constant |
| **window map** | Counts of each character in the current slice |
| **required** | Number of distinct characters in t |
| **have** | Distinct characters currently at or above quota |
| **Invariant** | A fact restored after every update |
| **Threshold crossing** | A count moving across \`need[c]\` |
| **missing counter** | Total copies still owed; valid when it is 0 |

---
**Conclusion:** In C++, the need/have scheme is two zero-initialised count arrays (or maps read with \`find\`) and one integer that changes only on a crossing — \`==\` after adding, \`<\` after removing — which makes the validity check O(1). The same "count crossings, not copies" idea works for any window rule stated as per-key quotas, such as finding anagrams of a pattern inside a text; see also [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).`,
        examples: [
          {
            label: `Trace every need/have change on ADOBECODEBANC / ABC`,
            code: `#include <iostream>
#include <map>
#include <string>
#include <unordered_map>
using namespace std;

// Trace the need/have counters on s = "ADOBECODEBANC", t = "ABC".
string minWindowTraced(const string& s, const string& t) {
    map<char, int> need;                    // std::map iterates keys in sorted order
    for (char c : t) need[c]++;
    int required = static_cast<int>(need.size());
    unordered_map<char, int> window;
    int have = 0, bestLen = -1, bestStart = 0, left = 0;
    cout << "need=";
    bool first = true;
    for (const auto& [c, k] : need) {       // C++17 structured binding
        cout << (first ? "" : ",") << c << ":" << k;
        first = false;
    }
    cout << " required=" << required << "\\n";
    for (int right = 0; right < static_cast<int>(s.size()); right++) {
        char ch = s[right];
        int w = ++window[ch];               // operator[] inserts 0 first, then ++
        auto it = need.find(ch);            // find: need[ch] would insert a 0 entry
        if (it != need.end() && w == it->second) {
            have++;
            cout << "r=" << right << " add " << ch << " -> " << ch << " satisfied, have=" << have << "\\n";
        } else {
            cout << "r=" << right << " add " << ch << " -> have=" << have << "\\n";
        }
        while (have == required) {
            int size = right - left + 1;
            if (bestLen == -1 || size < bestLen) {
                bestLen = size;
                bestStart = left;
                cout << "   valid " << s.substr(left, size) << " (" << size << ") new best\\n";
            } else {
                cout << "   valid " << s.substr(left, size) << " (" << size << ")\\n";
            }
            char out = s[left];
            int wo = --window[out];
            auto jt = need.find(out);
            if (jt != need.end() && wo < jt->second) {
                have--;
                cout << "   drop " << out << " -> " << out << " short, have=" << have << "\\n";
            } else {
                cout << "   drop " << out << "\\n";
            }
            left++;
        }
    }
    return bestLen == -1 ? "" : s.substr(bestStart, bestLen);
}

int main() {
    // Call first, print after: in one cout chain, C++17 prints "answer: " before the
    // function runs, so the trace lines would appear after that label.
    string answer = minWindowTraced("ADOBECODEBANC", "ABC");
    cout << "answer: " << answer << "\\n";
}`,
          },
          {
            label: `have vs missing counters, and the two classic off-by-one bugs`,
            code: `#include <array>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

// Three ways to count "is the window valid?", and two classic off-by-one bugs.
string solve(const string& s, const string& t, const string& mode) {
    array<int, 128> need{};
    int required = 0;
    for (char c : t) {
        if (need[c] == 0) required++;
        need[c]++;
    }
    array<int, 128> window{};
    int missing = static_cast<int>(t.size()); // "missing": total characters still owed
    int have = 0;                             // the others: distinct characters satisfied
    bool useMissing = mode == "missing";      // std::string == compares contents
    int bestLen = -1, bestStart = 0, left = 0;
    for (int right = 0; right < static_cast<int>(s.size()); right++) {
        char ch = s[right];
        window[ch]++;
        if (useMissing) {
            if (window[ch] <= need[ch]) missing--;              // this copy was still owed
        } else if (mode == "bug_add") {
            if (need[ch] > 0 && window[ch] >= need[ch]) have++; // BUG: counts every extra copy
        } else if (need[ch] > 0 && window[ch] == need[ch]) {
            have++;                                             // exactly at the threshold
        }
        while (useMissing ? missing == 0 : have == required) {
            if (bestLen == -1 || right - left + 1 < bestLen) {
                bestLen = right - left + 1;
                bestStart = left;
            }
            char out = s[left];
            window[out]--;
            if (useMissing) {
                if (window[out] < need[out]) missing++;
            } else if (mode == "bug_remove") {
                if (need[out] > 0 && window[out] <= need[out]) have--; // BUG: spare copy too
            } else if (need[out] > 0 && window[out] < need[out]) {
                have--;
            }
            left++;
        }
    }
    return bestLen == -1 ? "" : s.substr(bestStart, bestLen);
}

int main() {
    vector<pair<string, string>> cases = {{"ADOBECODEBANC", "ABC"}, {"AAB", "AB"},
        {"ADOBECODEBANC", "AABC"}, {"aaflslflsldkalskaaa", "aaa"}, {"BAAB", "AB"}, {"xyz", "xx"}};
    for (const auto& [s, t] : cases) {
        string line = s + " / " + t + ":";
        for (string mode : {"have", "missing", "bug_add", "bug_remove"}) {
            line += " " + mode + "=(" + solve(s, t, mode) + ")";
        }
        cout << line << "\\n";
    }
}`,
          },
        ],
      },
    },
  },
];

export default augments;
