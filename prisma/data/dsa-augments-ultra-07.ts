/**
 * DSA ULTRA — batch 07: two pointers and sliding window. One complete answer per
 * language (Python, JavaScript, Java, C++). Every example was run with python3 /
 * node / javac+java / g++ -std=c++17 by scripts/verify-dsa-examples.ts and the
 * quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  {
    title: `What is the two-pointer technique?`,
    difficulty: "medium",
    seoDescription: `The two-pointer technique in Python, JavaScript, Java and C++: converging and same-direction pointers, why it is O(n), with verified runnable code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Explain the two-pointer technique. Then, in Python, use it to find two numbers in a sorted list that add up to a target, and tell me how it beats the obvious nested loop."

**What a strong answer should cover:**
- Two indices moving through the data under a rule; the two shapes (converging from both ends, and same-direction read/write).
- Why moving a pointer is safe: the sorted (monotonic) order lets one comparison rule out a whole element.
- O(n) time and O(1) extra space versus O(n²) for checking every pair; sorting first adds O(n log n).
- When a hash map is the better tool (unsorted input, original indices needed).
- Python specifics: tuple swap \`a[i], a[j] = a[j], a[i]\`, \`len(arr) - 1\` is -1 for an empty list so the loop simply does not run, and avoiding slices like \`arr[1:]\` inside the loop because each one copies.

**Clarifying questions expected:**
- "Is the list sorted, and can it contain duplicates or negative numbers?"
- "Should I return indices or values, and what if no pair exists?"

**Code / implementation expected:** Yes — a Python \`pair_sum(arr, target)\` with \`left\`/\`right\` indices, plus a same-direction example such as removing duplicates in place.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two friends are looking for two books on a long, alphabetised shelf whose page counts add up to exactly 500, so the pair fits a 500-page reading challenge. The slow way: pick the first book, compare it with every other book, then pick the second book, compare it with every other book, and so on. With 1,000 books that is about half a million comparisons.

The clever way: the shelf is sorted by page count. One friend stands at the thinnest book, the other at the thickest. They add the two page counts. Too many pages? The friend at the thick end steps one book inward, to something thinner. Too few? The friend at the thin end steps inward, to something thicker. Each step rules out a whole book for good, so they finish in at most 999 steps.

That is the whole technique: **two positions that walk through the data in a coordinated way, and a rule that says which one moves**. Because neither ever walks backwards, the work is proportional to the length of the data, not its square.

## 2. The Core Idea

A **pointer** here just means an index: a whole number saying which position in an array or string you are looking at. The technique keeps two of them and moves them according to a rule.

📌 **Interview term: Two-pointer technique** — solving an array or string problem with two indices that move through the data, each step moving one (or both) of them forward, so every element is visited a constant number of times and the total work is O(n).

There are two shapes, and recognising which one a problem needs is half the answer.

### Shape 1: opposite ends, moving towards each other

📌 **Interview term: Converging (opposite-direction) pointers** — one pointer starts at index 0, the other at the last index, and they move towards each other until they meet.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="Opposite-direction pointers on the sorted array 2 7 8 11 15 18, left starts at index 0 and right at index 5">
  <defs>
    <marker id="tp1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="75" y="30" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="170" y="30" text-anchor="middle">1</text>
  <rect class="d-box" x="135" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="170" y="70" text-anchor="middle">7</text>
  <text class="d-sub" x="265" y="30" text-anchor="middle">2</text>
  <rect class="d-box" x="230" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="265" y="70" text-anchor="middle">8</text>
  <text class="d-sub" x="360" y="30" text-anchor="middle">3</text>
  <rect class="d-box" x="325" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="360" y="70" text-anchor="middle">11</text>
  <text class="d-sub" x="455" y="30" text-anchor="middle">4</text>
  <rect class="d-box" x="420" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="455" y="70" text-anchor="middle">15</text>
  <text class="d-sub" x="550" y="30" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="515" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="550" y="70" text-anchor="middle">18</text>
  <path class="d-edge-accent" d="M 75 118 L 75 96" marker-end="url(#tp1-arrow)"/>
  <text class="d-text d-accent" x="75" y="136" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 550 118 L 550 96" marker-end="url(#tp1-arrow)"/>
  <text class="d-text d-accent" x="550" y="136" text-anchor="middle">right</text>
  <rect class="d-box-muted" x="40" y="168" width="260" height="62" rx="10"/>
  <text class="d-text" x="170" y="193" text-anchor="middle">sum too small</text>
  <text class="d-sub" x="170" y="215" text-anchor="middle">move left one step right</text>
  <rect class="d-box-muted" x="340" y="168" width="260" height="62" rx="10"/>
  <text class="d-text" x="470" y="193" text-anchor="middle">sum too big</text>
  <text class="d-sub" x="470" y="215" text-anchor="middle">move right one step left</text>
</svg>

On the sorted array \`[2, 7, 8, 11, 15, 18]\` with target 18 the pointers start at 2 and 18 (sum 20, too big, so \`right\` moves), then 2 and 15 (17, too small, so \`left\` moves), then 7 and 15 (22, too big), then 7 and 11 (18, found). Four checks.

Why it is safe to throw a value away: if \`arr[left] + arr[right]\` is too big, then \`arr[right]\` plus **any** remaining value is also too big, because every remaining value is at least \`arr[left]\`. So \`arr[right]\` cannot be part of any answer and can be dropped. The mirror argument drops \`arr[left]\` when the sum is too small. This only works because the array is sorted.

📌 **Interview term: Monotonic property** — a property that only ever goes one way as you move (for example, values only increase from left to right). Two pointers need one: it is what lets a single comparison rule out a whole element.

Problems with this shape: pair sum in a sorted array, [3Sum](/interview-question/how-do-you-solve-the-3sum-problem), [container with most water](/interview-question/how-do-you-solve-the-container-with-most-water-problem), [valid palindrome](/interview-question/how-do-you-check-if-a-string-is-a-valid-palindrome), reversing an array in place, and [trapping rain water](/interview-question/trapping-rain-water-with-two-pointers-why-does-leftmax-rightmax-work-in-o-1-spac).

### Shape 2: same direction, one reading and one writing

📌 **Interview term: Same-direction (read/write) pointers** — both pointers start at the front; a fast one reads every element and a slow one marks where the next kept element should be written.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 260" role="img" aria-label="Same-direction pointers while removing duplicates, slow marks the last kept value and fast reads ahead">
  <defs>
    <marker id="tp2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="58" y="30" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="30" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="58" y="70" text-anchor="middle">1</text>
  <text class="d-sub" x="128" y="30" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="100" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="128" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="198" y="30" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="170" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="198" y="70" text-anchor="middle">3</text>
  <text class="d-sub" x="268" y="30" text-anchor="middle">3</text>
  <rect class="d-box" x="240" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="268" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="338" y="30" text-anchor="middle">4</text>
  <rect class="d-box" x="310" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="338" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="408" y="30" text-anchor="middle">5</text>
  <rect class="d-box" x="380" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="408" y="70" text-anchor="middle">3</text>
  <text class="d-sub" x="478" y="30" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="450" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="478" y="70" text-anchor="middle">5</text>
  <text class="d-sub" x="548" y="30" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="520" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="548" y="70" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 198 118 L 198 96" marker-end="url(#tp2-arrow)"/>
  <text class="d-text d-accent" x="198" y="136" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 408 118 L 408 96" marker-end="url(#tp2-arrow)"/>
  <text class="d-text" x="408" y="136" text-anchor="middle">fast</text>
  <rect class="d-box-accent" x="30" y="172" width="160" height="62" rx="10"/>
  <text class="d-text" x="110" y="197" text-anchor="middle">indexes 0 to 2</text>
  <text class="d-sub" x="110" y="219" text-anchor="middle">kept, unique</text>
  <rect class="d-box" x="220" y="172" width="160" height="62" rx="10"/>
  <text class="d-text" x="300" y="197" text-anchor="middle">indexes 3 to 5</text>
  <text class="d-sub" x="300" y="219" text-anchor="middle">already read</text>
  <rect class="d-box-muted" x="410" y="172" width="160" height="62" rx="10"/>
  <text class="d-text" x="490" y="197" text-anchor="middle">indexes 6 to 7</text>
  <text class="d-sub" x="490" y="219" text-anchor="middle">not read yet</text>
</svg>

The picture shows removing duplicates from the sorted array \`[1, 1, 2, 2, 2, 3, 5, 5]\` just after \`fast\` has read index 5. Indexes 0 to 2 hold the unique values found so far (1, 2, 3), so \`slow\` points at index 2. Indexes 3 to 5 have been read but are now leftovers. Indexes 6 and 7 are still to be read.

📌 **Interview term: In place** — the algorithm rearranges the input array itself and uses only O(1) extra memory (a few variables), instead of building a new array.

📌 **Interview term: Loop invariant** — a statement that is true before and after every loop step, such as "everything before \`slow + 1\` is unique and in order". Saying the invariant out loud is the fastest way to convince an interviewer the code is correct.

Problems with this shape: remove duplicates, [move zeroes](/interview-question/how-do-you-move-all-zeroes-to-the-end-of-an-array-in-place), [merging two sorted arrays](/interview-question/how-do-you-merge-two-sorted-arrays), and the linked-list variant in [the fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique). The [Dutch national flag sort](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s) uses three pointers, combining both shapes.

### How it relates to sliding window

A [sliding window](/interview-question/what-is-the-sliding-window-technique) is a special case of same-direction pointers where you care about everything **between** the two pointers (a contiguous range), not just the two elements they point at.

### When not to use it

If the array is not sorted and you need a pair with a given sum, sorting first costs O(n log n). A hash map solves it in O(n) time and keeps the original indices; see [Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently). Two pointers win when the input is already sorted, when you must use O(1) extra space, or when the problem is about rearranging in place.

## 3. Brute Force First, Then Two Pointers in Python

The obvious approach checks every pair with two nested loops: about n²/2 checks, so O(n²). On a sorted array, two pointers do the same job in at most n - 1 checks. Python lists are dynamic arrays, so \`arr[i]\` is O(1) and the indices are plain \`int\`s. Python integers never overflow, so \`arr[left] + arr[right]\` is always exact.

~~~python
def pair_sum(arr, target):
    """Indices of two values in a sorted list that add up to target, else [-1, -1]."""
    left, right = 0, len(arr) - 1
    while left < right:
        s = arr[left] + arr[right]
        if s == target:
            return [left, right]
        if s < target:
            left += 1      # sum too small: the only way up is a bigger left value
        else:
            right -= 1     # sum too big: the only way down is a smaller right value
    return [-1, -1]
~~~

**Line by line:**

- \`left, right = 0, len(arr) - 1\` uses tuple assignment to set both indices at once. For an empty list \`right\` is \`-1\`, so \`left < right\` is false and the function returns \`[-1, -1]\` without touching the list. Note that \`arr[-1]\` would be legal Python (it means the last element), which is one more reason to keep the \`left < right\` guard.
- The loop condition is \`left < right\`, not \`<=\`: a pair needs two **different** positions.
- Each branch moves exactly one pointer, so the loop runs at most \`len(arr) - 1\` times.

📌 **Interview term: Tuple swap** — Python evaluates the right side of \`a, b = b, a\` into a tuple first and then assigns it, so two values are exchanged without a temporary variable.

### Same direction: remove duplicates and reverse

The same-direction shape in Python. \`nums[left], nums[right] = nums[right], nums[left]\` is Python's idiomatic swap: the right-hand side builds a tuple first, so no temporary variable is needed.

~~~python
def remove_duplicates(nums):
    """Sorted list, in place: keep one copy of each value at the front, return how many."""
    if not nums:
        return 0
    slow = 0                      # nums[0..slow] is the de-duplicated part
    for fast in range(1, len(nums)):
        if nums[fast] != nums[slow]:
            slow += 1
            nums[slow] = nums[fast]
    return slow + 1

def reverse_in_place(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        nums[left], nums[right] = nums[right], nums[left]   # tuple swap
        left += 1
        right -= 1
    return nums
~~~

**The invariant:** in \`remove_duplicates\`, positions \`0..slow\` hold each distinct value seen so far, once, in order. \`fast\` only moves forward, \`slow\` only moves forward, so the loop is O(n).

## 4. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — pair sum, plus brute force vs two pointers** prints:

~~~text
[1, 3]
[-1, -1]
[-1, -1]
[0, 1]
n=1000, no pair: brute force 499500 checks, two pointers 999 checks
~~~

**Example 2 — same-direction pointers** prints:

~~~text
4 [1, 2, 3, 5]
0 []
1 [7]
1 [0]
[5, 4, 3, 2, 1]
[2, 1]
[]
~~~

**What the numbers show:** the last line of Example 1 is the point of the technique. On 1,000 even numbers with an odd target (so no pair exists and both methods must do their full work), the nested loops did **499,500** checks and the two pointers did **999**.

## 5. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Nested loops over all pairs | O(n²) | O(1) | n(n-1)/2 pairs; 499,500 for n = 1,000 |
| Converging pointers (sorted input) | O(n) | O(1) | each step moves one pointer inward; at most n - 1 steps |
| Sort, then converging pointers | O(n log n) | depends on the sort | the sort dominates |
| Same-direction read/write | O(n) | O(1) | \`fast\` reads each element once |

Python's \`for fast in range(1, len(nums))\` does not build a list (a \`range\` object is lazy), so the loop itself adds no memory. For a refresher on reading this notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 6. Edge Cases

- **Empty array or one element:** no pair exists; the \`left < right\` check fails at once.
- **No valid pair:** the pointers meet and you return a sentinel (\`[-1, -1]\` here); say what you return before coding.
- **Duplicates:** \`[5, 5]\` with target 10 returns \`[0, 1]\`, because the pointers sit on different positions.
- **Negative numbers:** fine, as long as the array is sorted; the rule only needs order, not positivity.
- **Several valid pairs:** this returns the first one the pointers meet; ask whether the interviewer wants one pair or all of them.

## Common Pitfalls

- **Using it on unsorted data.** The skip rule is only valid on sorted input. Call \`arr.sort()\` (in place) or \`sorted(arr)\` (a new list) first, and say that sorting loses the original indices.
- **\`while left <= right\` in a pair search.** It lets both pointers sit on the same element, so \`[5]\` with target 10 would wrongly pair 5 with itself.
- **Slicing inside the loop.** \`arr[left:right]\` or recursing on \`arr[1:]\` copies the list every time and quietly turns O(n) into O(n²).
- **Forgetting that the function changed the caller list.** \`remove_duplicates\` and \`reverse_in_place\` mutate \`nums\`; if the caller needs the original, pass \`list(nums)\` or \`nums[:]\`.
- **Negative indices hiding bugs.** An off-by-one that makes an index \`-1\` does not crash in Python; it silently reads the last element. Keep the bounds checks explicit.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Two indices walk through the data under a rule, each element is visited a constant number of times, so pair problems drop from O(n²) to O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Two shapes:</strong> <span style="color:#f0e2c8;">Converging: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left = 0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right = len(arr) - 1</code>, move towards each other. Same direction: a fast reader and a slow writer, for in-place filtering.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it is correct:</strong> <span style="color:#f0e2c8;">On a sorted list, if the sum is too big then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr[right]</code> is too big with every remaining partner, so dropping it loses nothing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space; if the input is not sorted, sorting first makes it O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python details:</strong> <span style="color:#f0e2c8;">Tuple swap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i], a[j] = a[j], a[i]</code>, no integer overflow, and no slicing inside the loop because slices copy.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The list is not sorted. Do you still use two pointers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a pair sum, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> of seen values gives O(n) time and keeps original indices. Sorting and then two pointers is O(n log n) but O(1) extra space with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.sort()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">left &lt; right</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">left &lt;= right</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A pair needs two different positions. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> both pointers can land on one element and count it twice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you extend this to 3Sum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort, fix each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, then run converging pointers on the rest for target <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-nums[i]</code>, skipping equal neighbours to avoid duplicate triplets. That is O(n²).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nums[::-1]</code> the same as reversing in place?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[::-1]</code> builds a new list with O(n) extra memory. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums.reverse()</code> or the swap loop reverses in place with O(1) extra memory.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prove the pointer loop terminates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every iteration moves at least one pointer one step closer to the other, so the gap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right - left</code> strictly shrinks and reaches zero after at most n - 1 steps.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Two-pointer technique** | two indices moving through data under a rule, for O(n) work |
| **Converging (opposite-direction) pointers** | start at both ends and move towards each other |
| **Same-direction (read/write) pointers** | a fast reader and a slow writer moving the same way |
| **Monotonic property** | values only go one way, which lets one comparison rule out an element |
| **In place** | rearranging the input itself with O(1) extra memory |
| **Loop invariant** | a fact that holds before and after every iteration |
| **Tuple swap** | \`a, b = b, a\`: Python swaps two values without a temporary variable |

---
**Conclusion:** The two-pointer technique replaces "check every pair" with two indices that each only move forward (or inward), so the work is O(n) instead of O(n²) with O(1) extra memory. Use converging pointers when sorted order lets one comparison rule out an element, and same-direction read/write pointers when you filter or rearrange an array in place. In Python, the code is short, so what earns the marks is naming the shape, stating the invariant, handling the empty input, and knowing the language traps shown above.`,
        examples: [
          { label: `Pair sum with converging pointers, and a count of checks vs brute force`, code: `def pair_sum(arr, target):
    """Indices of two values in a sorted list that add up to target, else [-1, -1]."""
    left, right = 0, len(arr) - 1
    while left < right:
        s = arr[left] + arr[right]
        if s == target:
            return [left, right]
        if s < target:
            left += 1      # sum too small: the only way up is a bigger left value
        else:
            right -= 1     # sum too big: the only way down is a smaller right value
    return [-1, -1]


def brute_checks(arr, target):
    checks = 0
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            checks += 1
            if arr[i] + arr[j] == target:
                return checks
    return checks


def pointer_checks(arr, target):
    checks = 0
    left, right = 0, len(arr) - 1
    while left < right:
        checks += 1
        s = arr[left] + arr[right]
        if s == target:
            return checks
        if s < target:
            left += 1
        else:
            right -= 1
    return checks


big = [2 * i for i in range(1000)]  # 0, 2, 4, ... 1998: every sum is even

print(pair_sum([2, 7, 8, 11, 15, 18], 18))  # [1, 3]
print(pair_sum([1, 2, 3, 4], 100))  # [-1, -1]
print(pair_sum([], 5))  # [-1, -1]
print(pair_sum([5, 5], 10))  # [0, 1]
print("n=1000, no pair: brute force " + str(brute_checks(big, 1)) + " checks, two pointers " + str(pointer_checks(big, 1)) + " checks")` },
          { label: `Same-direction pointers: remove duplicates and reverse in place`, code: `def remove_duplicates(nums):
    """Sorted list, in place: keep one copy of each value at the front, return how many."""
    if not nums:
        return 0
    slow = 0                      # nums[0..slow] is the de-duplicated part
    for fast in range(1, len(nums)):
        if nums[fast] != nums[slow]:
            slow += 1
            nums[slow] = nums[fast]
    return slow + 1


def reverse_in_place(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        nums[left], nums[right] = nums[right], nums[left]   # tuple swap
        left += 1
        right -= 1
    return nums


def show_dedup(nums):
    k = remove_duplicates(nums)
    return str(k) + " " + str(nums[:k])


print(show_dedup([1, 1, 2, 2, 2, 3, 5, 5]))  # 4 [1, 2, 3, 5]
print(show_dedup([]))  # 0 []
print(show_dedup([7]))  # 1 [7]
print(show_dedup([0, 0, 0]))  # 1 [0]
print(reverse_in_place([1, 2, 3, 4, 5]))  # [5, 4, 3, 2, 1]
print(reverse_in_place([1, 2]))  # [2, 1]
print(reverse_in_place([]))  # []` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Explain the two-pointer technique. Then, in JavaScript, use it to find two numbers in a sorted array that add up to a target, and tell me how it beats the obvious nested loop."

**What a strong answer should cover:**
- Two indices moving through the data under a rule; the two shapes (converging from both ends, and same-direction read/write).
- Why moving a pointer is safe: the sorted (monotonic) order lets one comparison rule out a whole element.
- O(n) time and O(1) extra space versus O(n²) for checking every pair; sorting first adds O(n log n).
- When a hash map (\`Map\`) is the better tool: unsorted input, original indices needed.
- JavaScript specifics: \`arr.sort()\` without a comparator sorts numbers as strings, so sort with \`(a, b) => a - b\`; use \`===\`; numbers are doubles, so sums above \`Number.MAX_SAFE_INTEGER\` lose precision.

**Clarifying questions expected:**
- "Is the array sorted, and can it contain duplicates or negative numbers?"
- "Should I return indices or values, and what if no pair exists?"

**Code / implementation expected:** Yes — a JavaScript \`pairSum(arr, target)\` with \`left\`/\`right\` indices, plus a same-direction example such as removing duplicates in place.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two friends are looking for two books on a long, alphabetised shelf whose page counts add up to exactly 500, so the pair fits a 500-page reading challenge. The slow way: pick the first book, compare it with every other book, then pick the second book, compare it with every other book, and so on. With 1,000 books that is about half a million comparisons.

The clever way: the shelf is sorted by page count. One friend stands at the thinnest book, the other at the thickest. They add the two page counts. Too many pages? The friend at the thick end steps one book inward, to something thinner. Too few? The friend at the thin end steps inward, to something thicker. Each step rules out a whole book for good, so they finish in at most 999 steps.

That is the whole technique: **two positions that walk through the data in a coordinated way, and a rule that says which one moves**. Because neither ever walks backwards, the work is proportional to the length of the data, not its square.

## 2. The Core Idea

A **pointer** here just means an index: a whole number saying which position in an array or string you are looking at. The technique keeps two of them and moves them according to a rule.

📌 **Interview term: Two-pointer technique** — solving an array or string problem with two indices that move through the data, each step moving one (or both) of them forward, so every element is visited a constant number of times and the total work is O(n).

There are two shapes, and recognising which one a problem needs is half the answer.

### Shape 1: opposite ends, moving towards each other

📌 **Interview term: Converging (opposite-direction) pointers** — one pointer starts at index 0, the other at the last index, and they move towards each other until they meet.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="Opposite-direction pointers on the sorted array 2 7 8 11 15 18, left starts at index 0 and right at index 5">
  <defs>
    <marker id="tp1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="75" y="30" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="170" y="30" text-anchor="middle">1</text>
  <rect class="d-box" x="135" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="170" y="70" text-anchor="middle">7</text>
  <text class="d-sub" x="265" y="30" text-anchor="middle">2</text>
  <rect class="d-box" x="230" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="265" y="70" text-anchor="middle">8</text>
  <text class="d-sub" x="360" y="30" text-anchor="middle">3</text>
  <rect class="d-box" x="325" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="360" y="70" text-anchor="middle">11</text>
  <text class="d-sub" x="455" y="30" text-anchor="middle">4</text>
  <rect class="d-box" x="420" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="455" y="70" text-anchor="middle">15</text>
  <text class="d-sub" x="550" y="30" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="515" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="550" y="70" text-anchor="middle">18</text>
  <path class="d-edge-accent" d="M 75 118 L 75 96" marker-end="url(#tp1-arrow)"/>
  <text class="d-text d-accent" x="75" y="136" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 550 118 L 550 96" marker-end="url(#tp1-arrow)"/>
  <text class="d-text d-accent" x="550" y="136" text-anchor="middle">right</text>
  <rect class="d-box-muted" x="40" y="168" width="260" height="62" rx="10"/>
  <text class="d-text" x="170" y="193" text-anchor="middle">sum too small</text>
  <text class="d-sub" x="170" y="215" text-anchor="middle">move left one step right</text>
  <rect class="d-box-muted" x="340" y="168" width="260" height="62" rx="10"/>
  <text class="d-text" x="470" y="193" text-anchor="middle">sum too big</text>
  <text class="d-sub" x="470" y="215" text-anchor="middle">move right one step left</text>
</svg>

On the sorted array \`[2, 7, 8, 11, 15, 18]\` with target 18 the pointers start at 2 and 18 (sum 20, too big, so \`right\` moves), then 2 and 15 (17, too small, so \`left\` moves), then 7 and 15 (22, too big), then 7 and 11 (18, found). Four checks.

Why it is safe to throw a value away: if \`arr[left] + arr[right]\` is too big, then \`arr[right]\` plus **any** remaining value is also too big, because every remaining value is at least \`arr[left]\`. So \`arr[right]\` cannot be part of any answer and can be dropped. The mirror argument drops \`arr[left]\` when the sum is too small. This only works because the array is sorted.

📌 **Interview term: Monotonic property** — a property that only ever goes one way as you move (for example, values only increase from left to right). Two pointers need one: it is what lets a single comparison rule out a whole element.

Problems with this shape: pair sum in a sorted array, [3Sum](/interview-question/how-do-you-solve-the-3sum-problem), [container with most water](/interview-question/how-do-you-solve-the-container-with-most-water-problem), [valid palindrome](/interview-question/how-do-you-check-if-a-string-is-a-valid-palindrome), reversing an array in place, and [trapping rain water](/interview-question/trapping-rain-water-with-two-pointers-why-does-leftmax-rightmax-work-in-o-1-spac).

### Shape 2: same direction, one reading and one writing

📌 **Interview term: Same-direction (read/write) pointers** — both pointers start at the front; a fast one reads every element and a slow one marks where the next kept element should be written.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 260" role="img" aria-label="Same-direction pointers while removing duplicates, slow marks the last kept value and fast reads ahead">
  <defs>
    <marker id="tp2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="58" y="30" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="30" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="58" y="70" text-anchor="middle">1</text>
  <text class="d-sub" x="128" y="30" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="100" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="128" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="198" y="30" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="170" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="198" y="70" text-anchor="middle">3</text>
  <text class="d-sub" x="268" y="30" text-anchor="middle">3</text>
  <rect class="d-box" x="240" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="268" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="338" y="30" text-anchor="middle">4</text>
  <rect class="d-box" x="310" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="338" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="408" y="30" text-anchor="middle">5</text>
  <rect class="d-box" x="380" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="408" y="70" text-anchor="middle">3</text>
  <text class="d-sub" x="478" y="30" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="450" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="478" y="70" text-anchor="middle">5</text>
  <text class="d-sub" x="548" y="30" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="520" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="548" y="70" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 198 118 L 198 96" marker-end="url(#tp2-arrow)"/>
  <text class="d-text d-accent" x="198" y="136" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 408 118 L 408 96" marker-end="url(#tp2-arrow)"/>
  <text class="d-text" x="408" y="136" text-anchor="middle">fast</text>
  <rect class="d-box-accent" x="30" y="172" width="160" height="62" rx="10"/>
  <text class="d-text" x="110" y="197" text-anchor="middle">indexes 0 to 2</text>
  <text class="d-sub" x="110" y="219" text-anchor="middle">kept, unique</text>
  <rect class="d-box" x="220" y="172" width="160" height="62" rx="10"/>
  <text class="d-text" x="300" y="197" text-anchor="middle">indexes 3 to 5</text>
  <text class="d-sub" x="300" y="219" text-anchor="middle">already read</text>
  <rect class="d-box-muted" x="410" y="172" width="160" height="62" rx="10"/>
  <text class="d-text" x="490" y="197" text-anchor="middle">indexes 6 to 7</text>
  <text class="d-sub" x="490" y="219" text-anchor="middle">not read yet</text>
</svg>

The picture shows removing duplicates from the sorted array \`[1, 1, 2, 2, 2, 3, 5, 5]\` just after \`fast\` has read index 5. Indexes 0 to 2 hold the unique values found so far (1, 2, 3), so \`slow\` points at index 2. Indexes 3 to 5 have been read but are now leftovers. Indexes 6 and 7 are still to be read.

📌 **Interview term: In place** — the algorithm rearranges the input array itself and uses only O(1) extra memory (a few variables), instead of building a new array.

📌 **Interview term: Loop invariant** — a statement that is true before and after every loop step, such as "everything before \`slow + 1\` is unique and in order". Saying the invariant out loud is the fastest way to convince an interviewer the code is correct.

Problems with this shape: remove duplicates, [move zeroes](/interview-question/how-do-you-move-all-zeroes-to-the-end-of-an-array-in-place), [merging two sorted arrays](/interview-question/how-do-you-merge-two-sorted-arrays), and the linked-list variant in [the fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique). The [Dutch national flag sort](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s) uses three pointers, combining both shapes.

### How it relates to sliding window

A [sliding window](/interview-question/what-is-the-sliding-window-technique) is a special case of same-direction pointers where you care about everything **between** the two pointers (a contiguous range), not just the two elements they point at.

### When not to use it

If the array is not sorted and you need a pair with a given sum, sorting first costs O(n log n). A hash map solves it in O(n) time and keeps the original indices; see [Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently). Two pointers win when the input is already sorted, when you must use O(1) extra space, or when the problem is about rearranging in place.

## 3. Brute Force First, Then Two Pointers in JavaScript

The obvious approach checks every pair with two nested loops: about n²/2 checks, so O(n²). On a sorted array, two pointers do the same job in at most n - 1 checks. In JavaScript an array index is a plain number and \`arr[i]\` is O(1) for a normal dense array. Use \`let\` for the two pointers (they change) and \`const\` for values computed inside the loop.

~~~javascript
function pairSum(arr, target) {
  // Indices of two values in a sorted array that add up to target, else [-1, -1].
  let left = 0;
  let right = arr.length - 1;
  while (left < right) {
    const s = arr[left] + arr[right];
    if (s === target) return [left, right];
    if (s < target) left++;   // sum too small: the only way up is a bigger left value
    else right--;             // sum too big: the only way down is a smaller right value
  }
  return [-1, -1];
}
~~~

**Line by line:**

- \`right = arr.length - 1\` is \`-1\` for an empty array, so \`left < right\` is false and the function returns \`[-1, -1]\` immediately. Reading \`arr[-1]\` would not throw in JavaScript; it returns \`undefined\`, and \`undefined + 5\` is \`NaN\`, which is why the guard matters.
- \`===\` compares without type conversion. With \`==\`, a string \`"18"\` in the input would match the number 18.
- Each branch moves exactly one pointer, so the loop runs at most \`arr.length - 1\` times.

📌 **Interview term: Destructuring swap** — \`[a, b] = [b, a]\` builds an array of the old values on the right and unpacks it on the left, exchanging two variables or array slots in one statement.

### Same direction: remove duplicates and reverse

The same-direction shape in JavaScript. \`[nums[left], nums[right]] = [nums[right], nums[left]]\` is a destructuring swap: the right side is an array literal of the two old values, which are then assigned back. A temporary variable works just as well.

~~~javascript
function removeDuplicates(nums) {
  // Sorted array, in place: keep one copy of each value at the front, return how many.
  if (nums.length === 0) return 0;
  let slow = 0; // nums[0..slow] is the de-duplicated part
  for (let fast = 1; fast < nums.length; fast++) {
    if (nums[fast] !== nums[slow]) {
      slow++;
      nums[slow] = nums[fast];
    }
  }
  return slow + 1;
}

function reverseInPlace(nums) {
  let left = 0;
  let right = nums.length - 1;
  while (left < right) {
    [nums[left], nums[right]] = [nums[right], nums[left]]; // destructuring swap
    left++;
    right--;
  }
  return nums;
}
~~~

**The invariant:** in \`removeDuplicates\`, positions \`0..slow\` hold each distinct value seen so far, once, in order. \`fast\` only moves forward, \`slow\` only moves forward, so the loop is O(n).

## 4. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — pair sum, plus brute force vs two pointers** prints:

~~~text
[1, 3]
[-1, -1]
[-1, -1]
[0, 1]
n=1000, no pair: brute force 499500 checks, two pointers 999 checks
~~~

**Example 2 — same-direction pointers** prints:

~~~text
4 [1, 2, 3, 5]
0 []
1 [7]
1 [0]
[5, 4, 3, 2, 1]
[2, 1]
[]
~~~

**What the numbers show:** the last line of Example 1 is the point of the technique. On 1,000 even numbers with an odd target (so no pair exists and both methods must do their full work), the nested loops did **499,500** checks and the two pointers did **999**.

## 5. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Nested loops over all pairs | O(n²) | O(1) | n(n-1)/2 pairs; 499,500 for n = 1,000 |
| Converging pointers (sorted input) | O(n) | O(1) | each step moves one pointer inward; at most n - 1 steps |
| Sort, then converging pointers | O(n log n) | depends on the sort | the sort dominates |
| Same-direction read/write | O(n) | O(1) | \`fast\` reads each element once |

\`Array.prototype.reverse()\` also reverses in place; writing the loop yourself is what the interviewer usually wants to see. For a refresher on reading this notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 6. Edge Cases

- **Empty array or one element:** no pair exists; the \`left < right\` check fails at once.
- **No valid pair:** the pointers meet and you return a sentinel (\`[-1, -1]\` here); say what you return before coding.
- **Duplicates:** \`[5, 5]\` with target 10 returns \`[0, 1]\`, because the pointers sit on different positions.
- **Negative numbers:** fine, as long as the array is sorted; the rule only needs order, not positivity.
- **Several valid pairs:** this returns the first one the pointers meet; ask whether the interviewer wants one pair or all of them.

## Common Pitfalls

- **Sorting numbers with plain \`.sort()\`.** Without a comparator, JavaScript compares the string forms ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)). In Node, \`[10, 9, 1].sort()\` printed \`[ 1, 10, 9 ]\`. Two pointers on that order give wrong answers; use \`arr.sort((a, b) => a - b)\`.
- **\`while (left <= right)\` in a pair search.** Both pointers can land on one element and count it twice.
- **Reading out of bounds silently.** \`arr[-1]\` and \`arr[arr.length]\` are \`undefined\`, not an error, and arithmetic on them gives \`NaN\`, which fails every comparison. Bugs hide instead of crashing.
- **Huge values.** Numbers are 64-bit floats; \`2 ** 53 + 1 === 2 ** 53\` printed \`true\`. If sums can exceed \`Number.MAX_SAFE_INTEGER\` (9007199254740991), use \`BigInt\`.
- **Mutating the caller array by surprise.** \`removeDuplicates\` and \`reverseInPlace\` change \`nums\`. If the caller needs the original, pass \`nums.slice()\` (or \`[...nums]\`).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Two indices walk through the data under a rule, each element is visited a constant number of times, so pair problems drop from O(n²) to O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Two shapes:</strong> <span style="color:#f0e2c8;">Converging: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left = 0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right = arr.length - 1</code>, move towards each other. Same direction: a fast reader and a slow writer, for in-place filtering.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it is correct:</strong> <span style="color:#f0e2c8;">On a sorted array, if the sum is too big then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr[right]</code> is too big with every remaining partner, so dropping it loses nothing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space; if the input is not sorted, sorting first makes it O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript details:</strong> <span style="color:#f0e2c8;">Sort numbers with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code>, compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code>, and remember out-of-range reads give <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, not an error.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The array is not sorted. Do you still use two pointers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a pair sum, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from value to index gives O(n) time and keeps original indices. Sorting and then two pointers is O(n log n) with O(1) extra space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[10, 9, 1].sort()</code> matter here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without a comparator the default order compares strings, so it gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 10, 9]</code>. The pointer rule assumes numeric order, so the result would be wrong.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you extend this to 3Sum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort numerically, fix each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, run converging pointers on the rest for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-nums[i]</code>, and skip equal neighbours to avoid duplicate triplets. O(n²) overall.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[...arr].reverse()</code> in place?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: the spread copies the array first (O(n) extra memory). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr.reverse()</code> or the swap loop reverses in place.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prove the pointer loop terminates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every iteration moves one pointer one step closer to the other, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right - left</code> strictly shrinks and hits zero after at most n - 1 steps.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Two-pointer technique** | two indices moving through data under a rule, for O(n) work |
| **Converging (opposite-direction) pointers** | start at both ends and move towards each other |
| **Same-direction (read/write) pointers** | a fast reader and a slow writer moving the same way |
| **Monotonic property** | values only go one way, which lets one comparison rule out an element |
| **In place** | rearranging the input itself with O(1) extra memory |
| **Loop invariant** | a fact that holds before and after every iteration |
| **Destructuring swap** | \`[a, b] = [b, a]\`: swap two values in one statement |

---
**Conclusion:** The two-pointer technique replaces "check every pair" with two indices that each only move forward (or inward), so the work is O(n) instead of O(n²) with O(1) extra memory. Use converging pointers when sorted order lets one comparison rule out an element, and same-direction read/write pointers when you filter or rearrange an array in place. In JavaScript, the code is short, so what earns the marks is naming the shape, stating the invariant, handling the empty input, and knowing the language traps shown above.`,
        examples: [
          { label: `Pair sum with converging pointers, and a count of checks vs brute force`, code: `function pairSum(arr, target) {
  // Indices of two values in a sorted array that add up to target, else [-1, -1].
  let left = 0;
  let right = arr.length - 1;
  while (left < right) {
    const s = arr[left] + arr[right];
    if (s === target) return [left, right];
    if (s < target) left++;   // sum too small: the only way up is a bigger left value
    else right--;             // sum too big: the only way down is a smaller right value
  }
  return [-1, -1];
}

function bruteChecks(arr, target) {
  let checks = 0;
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      checks++;
      if (arr[i] + arr[j] === target) return checks;
    }
  }
  return checks;
}

function pointerChecks(arr, target) {
  let checks = 0;
  let left = 0;
  let right = arr.length - 1;
  while (left < right) {
    checks++;
    const s = arr[left] + arr[right];
    if (s === target) return checks;
    if (s < target) left++;
    else right--;
  }
  return checks;
}

const fmt = (a) => '[' + a.join(', ') + ']';
const big = Array.from({ length: 1000 }, (_, i) => 2 * i); // 0, 2, 4, ... 1998: every sum is even

console.log(fmt(pairSum([2, 7, 8, 11, 15, 18], 18))); // [1, 3]
console.log(fmt(pairSum([1, 2, 3, 4], 100))); // [-1, -1]
console.log(fmt(pairSum([], 5))); // [-1, -1]
console.log(fmt(pairSum([5, 5], 10))); // [0, 1]
console.log('n=1000, no pair: brute force ' + bruteChecks(big, 1) + ' checks, two pointers ' + pointerChecks(big, 1) + ' checks');` },
          { label: `Same-direction pointers: remove duplicates and reverse in place`, code: `function removeDuplicates(nums) {
  // Sorted array, in place: keep one copy of each value at the front, return how many.
  if (nums.length === 0) return 0;
  let slow = 0; // nums[0..slow] is the de-duplicated part
  for (let fast = 1; fast < nums.length; fast++) {
    if (nums[fast] !== nums[slow]) {
      slow++;
      nums[slow] = nums[fast];
    }
  }
  return slow + 1;
}

function reverseInPlace(nums) {
  let left = 0;
  let right = nums.length - 1;
  while (left < right) {
    [nums[left], nums[right]] = [nums[right], nums[left]]; // destructuring swap
    left++;
    right--;
  }
  return nums;
}

const fmt = (a) => '[' + a.join(', ') + ']';
function showDedup(nums) {
  const k = removeDuplicates(nums);
  return k + ' ' + fmt(nums.slice(0, k));
}

console.log(showDedup([1, 1, 2, 2, 2, 3, 5, 5])); // 4 [1, 2, 3, 5]
console.log(showDedup([])); // 0 []
console.log(showDedup([7])); // 1 [7]
console.log(showDedup([0, 0, 0])); // 1 [0]
console.log(fmt(reverseInPlace([1, 2, 3, 4, 5]))); // [5, 4, 3, 2, 1]
console.log(fmt(reverseInPlace([1, 2]))); // [2, 1]
console.log(fmt(reverseInPlace([]))); // []` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Explain the two-pointer technique. Then, in Java, use it to find two numbers in a sorted int array that add up to a target, and tell me how it beats the obvious nested loop."

**What a strong answer should cover:**
- Two indices moving through the data under a rule; the two shapes (converging from both ends, and same-direction read/write).
- Why moving a pointer is safe: the sorted (monotonic) order lets one comparison rule out a whole element.
- O(n) time and O(1) extra space versus O(n²) for checking every pair; sorting first adds O(n log n).
- When a \`HashMap\` is the better tool: unsorted input, original indices needed.
- Java specifics: \`arr[left] + arr[right]\` can overflow \`int\` silently (cast to \`long\`), swaps need a temporary variable, and \`Arrays.toString\` to print an array.

**Clarifying questions expected:**
- "Is the array sorted, and can values be large enough that a sum overflows \`int\`?"
- "Should I return indices or values, and what if no pair exists?"

**Code / implementation expected:** Yes — a Java \`static int[] pairSum(int[] arr, int target)\` with \`left\`/\`right\` indices, plus a same-direction example such as removing duplicates in place.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two friends are looking for two books on a long, alphabetised shelf whose page counts add up to exactly 500, so the pair fits a 500-page reading challenge. The slow way: pick the first book, compare it with every other book, then pick the second book, compare it with every other book, and so on. With 1,000 books that is about half a million comparisons.

The clever way: the shelf is sorted by page count. One friend stands at the thinnest book, the other at the thickest. They add the two page counts. Too many pages? The friend at the thick end steps one book inward, to something thinner. Too few? The friend at the thin end steps inward, to something thicker. Each step rules out a whole book for good, so they finish in at most 999 steps.

That is the whole technique: **two positions that walk through the data in a coordinated way, and a rule that says which one moves**. Because neither ever walks backwards, the work is proportional to the length of the data, not its square.

## 2. The Core Idea

A **pointer** here just means an index: a whole number saying which position in an array or string you are looking at. The technique keeps two of them and moves them according to a rule.

📌 **Interview term: Two-pointer technique** — solving an array or string problem with two indices that move through the data, each step moving one (or both) of them forward, so every element is visited a constant number of times and the total work is O(n).

There are two shapes, and recognising which one a problem needs is half the answer.

### Shape 1: opposite ends, moving towards each other

📌 **Interview term: Converging (opposite-direction) pointers** — one pointer starts at index 0, the other at the last index, and they move towards each other until they meet.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="Opposite-direction pointers on the sorted array 2 7 8 11 15 18, left starts at index 0 and right at index 5">
  <defs>
    <marker id="tp1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="75" y="30" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="170" y="30" text-anchor="middle">1</text>
  <rect class="d-box" x="135" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="170" y="70" text-anchor="middle">7</text>
  <text class="d-sub" x="265" y="30" text-anchor="middle">2</text>
  <rect class="d-box" x="230" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="265" y="70" text-anchor="middle">8</text>
  <text class="d-sub" x="360" y="30" text-anchor="middle">3</text>
  <rect class="d-box" x="325" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="360" y="70" text-anchor="middle">11</text>
  <text class="d-sub" x="455" y="30" text-anchor="middle">4</text>
  <rect class="d-box" x="420" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="455" y="70" text-anchor="middle">15</text>
  <text class="d-sub" x="550" y="30" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="515" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="550" y="70" text-anchor="middle">18</text>
  <path class="d-edge-accent" d="M 75 118 L 75 96" marker-end="url(#tp1-arrow)"/>
  <text class="d-text d-accent" x="75" y="136" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 550 118 L 550 96" marker-end="url(#tp1-arrow)"/>
  <text class="d-text d-accent" x="550" y="136" text-anchor="middle">right</text>
  <rect class="d-box-muted" x="40" y="168" width="260" height="62" rx="10"/>
  <text class="d-text" x="170" y="193" text-anchor="middle">sum too small</text>
  <text class="d-sub" x="170" y="215" text-anchor="middle">move left one step right</text>
  <rect class="d-box-muted" x="340" y="168" width="260" height="62" rx="10"/>
  <text class="d-text" x="470" y="193" text-anchor="middle">sum too big</text>
  <text class="d-sub" x="470" y="215" text-anchor="middle">move right one step left</text>
</svg>

On the sorted array \`[2, 7, 8, 11, 15, 18]\` with target 18 the pointers start at 2 and 18 (sum 20, too big, so \`right\` moves), then 2 and 15 (17, too small, so \`left\` moves), then 7 and 15 (22, too big), then 7 and 11 (18, found). Four checks.

Why it is safe to throw a value away: if \`arr[left] + arr[right]\` is too big, then \`arr[right]\` plus **any** remaining value is also too big, because every remaining value is at least \`arr[left]\`. So \`arr[right]\` cannot be part of any answer and can be dropped. The mirror argument drops \`arr[left]\` when the sum is too small. This only works because the array is sorted.

📌 **Interview term: Monotonic property** — a property that only ever goes one way as you move (for example, values only increase from left to right). Two pointers need one: it is what lets a single comparison rule out a whole element.

Problems with this shape: pair sum in a sorted array, [3Sum](/interview-question/how-do-you-solve-the-3sum-problem), [container with most water](/interview-question/how-do-you-solve-the-container-with-most-water-problem), [valid palindrome](/interview-question/how-do-you-check-if-a-string-is-a-valid-palindrome), reversing an array in place, and [trapping rain water](/interview-question/trapping-rain-water-with-two-pointers-why-does-leftmax-rightmax-work-in-o-1-spac).

### Shape 2: same direction, one reading and one writing

📌 **Interview term: Same-direction (read/write) pointers** — both pointers start at the front; a fast one reads every element and a slow one marks where the next kept element should be written.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 260" role="img" aria-label="Same-direction pointers while removing duplicates, slow marks the last kept value and fast reads ahead">
  <defs>
    <marker id="tp2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="58" y="30" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="30" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="58" y="70" text-anchor="middle">1</text>
  <text class="d-sub" x="128" y="30" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="100" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="128" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="198" y="30" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="170" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="198" y="70" text-anchor="middle">3</text>
  <text class="d-sub" x="268" y="30" text-anchor="middle">3</text>
  <rect class="d-box" x="240" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="268" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="338" y="30" text-anchor="middle">4</text>
  <rect class="d-box" x="310" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="338" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="408" y="30" text-anchor="middle">5</text>
  <rect class="d-box" x="380" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="408" y="70" text-anchor="middle">3</text>
  <text class="d-sub" x="478" y="30" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="450" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="478" y="70" text-anchor="middle">5</text>
  <text class="d-sub" x="548" y="30" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="520" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="548" y="70" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 198 118 L 198 96" marker-end="url(#tp2-arrow)"/>
  <text class="d-text d-accent" x="198" y="136" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 408 118 L 408 96" marker-end="url(#tp2-arrow)"/>
  <text class="d-text" x="408" y="136" text-anchor="middle">fast</text>
  <rect class="d-box-accent" x="30" y="172" width="160" height="62" rx="10"/>
  <text class="d-text" x="110" y="197" text-anchor="middle">indexes 0 to 2</text>
  <text class="d-sub" x="110" y="219" text-anchor="middle">kept, unique</text>
  <rect class="d-box" x="220" y="172" width="160" height="62" rx="10"/>
  <text class="d-text" x="300" y="197" text-anchor="middle">indexes 3 to 5</text>
  <text class="d-sub" x="300" y="219" text-anchor="middle">already read</text>
  <rect class="d-box-muted" x="410" y="172" width="160" height="62" rx="10"/>
  <text class="d-text" x="490" y="197" text-anchor="middle">indexes 6 to 7</text>
  <text class="d-sub" x="490" y="219" text-anchor="middle">not read yet</text>
</svg>

The picture shows removing duplicates from the sorted array \`[1, 1, 2, 2, 2, 3, 5, 5]\` just after \`fast\` has read index 5. Indexes 0 to 2 hold the unique values found so far (1, 2, 3), so \`slow\` points at index 2. Indexes 3 to 5 have been read but are now leftovers. Indexes 6 and 7 are still to be read.

📌 **Interview term: In place** — the algorithm rearranges the input array itself and uses only O(1) extra memory (a few variables), instead of building a new array.

📌 **Interview term: Loop invariant** — a statement that is true before and after every loop step, such as "everything before \`slow + 1\` is unique and in order". Saying the invariant out loud is the fastest way to convince an interviewer the code is correct.

Problems with this shape: remove duplicates, [move zeroes](/interview-question/how-do-you-move-all-zeroes-to-the-end-of-an-array-in-place), [merging two sorted arrays](/interview-question/how-do-you-merge-two-sorted-arrays), and the linked-list variant in [the fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique). The [Dutch national flag sort](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s) uses three pointers, combining both shapes.

### How it relates to sliding window

A [sliding window](/interview-question/what-is-the-sliding-window-technique) is a special case of same-direction pointers where you care about everything **between** the two pointers (a contiguous range), not just the two elements they point at.

### When not to use it

If the array is not sorted and you need a pair with a given sum, sorting first costs O(n log n). A hash map solves it in O(n) time and keeps the original indices; see [Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently). Two pointers win when the input is already sorted, when you must use O(1) extra space, or when the problem is about rearranging in place.

## 3. Brute Force First, Then Two Pointers in Java

The obvious approach checks every pair with two nested loops: about n²/2 checks, so O(n²). On a sorted array, two pointers do the same job in at most n - 1 checks. In Java the pointers are \`int\` indices into an \`int[]\`. Working on a primitive \`int[]\` (not \`List<Integer>\`) avoids boxing every value into an \`Integer\` object.

~~~java
// Indices of two values in a sorted array that add up to target, else [-1, -1].
static int[] pairSum(int[] arr, int target) {
    int left = 0, right = arr.length - 1;
    while (left < right) {
        int s = arr[left] + arr[right];
        if (s == target) return new int[]{left, right};
        if (s < target) left++;   // sum too small: the only way up is a bigger left value
        else right--;             // sum too big: the only way down is a smaller right value
    }
    return new int[]{-1, -1};
}
~~~

**Line by line:**

- \`right = arr.length - 1\` is \`-1\` for an empty array, so \`left < right\` is false and the method returns \`{-1, -1}\` without reading the array. Without the guard, \`arr[-1]\` would throw \`ArrayIndexOutOfBoundsException\`, so Java bugs here at least fail loudly.
- \`int s = arr[left] + arr[right]\` is fine for the demo values, but two large \`int\`s overflow silently: \`Integer.MAX_VALUE + 1\` printed \`-2147483648\` in a test run. For inputs near the limits, write \`long s = (long) arr[left] + arr[right];\`.
- Each branch moves exactly one pointer, so the loop runs at most \`arr.length - 1\` times.

📌 **Interview term: Integer overflow** — when a result does not fit in the type, Java \`int\` arithmetic wraps around (it does not throw), producing a wrong value with no warning.

### Same direction: remove duplicates and reverse

The same-direction shape in Java. Java has no tuple swap, so the reverse uses a temporary variable. Arrays are objects passed by reference value: the method changes the caller array, which is exactly what in place means.

~~~java
// Sorted array, in place: keep one copy of each value at the front, return how many.
static int removeDuplicates(int[] nums) {
    if (nums.length == 0) return 0;
    int slow = 0; // nums[0..slow] is the de-duplicated part
    for (int fast = 1; fast < nums.length; fast++) {
        if (nums[fast] != nums[slow]) {
            slow++;
            nums[slow] = nums[fast];
        }
    }
    return slow + 1;
}

static int[] reverseInPlace(int[] nums) {
    int left = 0, right = nums.length - 1;
    while (left < right) {
        int tmp = nums[left];   // Java has no tuple swap: use a temp
        nums[left] = nums[right];
        nums[right] = tmp;
        left++;
        right--;
    }
    return nums;
}
~~~

**The invariant:** in \`removeDuplicates\`, positions \`0..slow\` hold each distinct value seen so far, once, in order. \`fast\` only moves forward, \`slow\` only moves forward, so the loop is O(n).

## 4. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — pair sum, plus brute force vs two pointers** prints:

~~~text
[1, 3]
[-1, -1]
[-1, -1]
[0, 1]
n=1000, no pair: brute force 499500 checks, two pointers 999 checks
~~~

**Example 2 — same-direction pointers** prints:

~~~text
4 [1, 2, 3, 5]
0 []
1 [7]
1 [0]
[5, 4, 3, 2, 1]
[2, 1]
[]
~~~

**What the numbers show:** the last line of Example 1 is the point of the technique. On 1,000 even numbers with an odd target (so no pair exists and both methods must do their full work), the nested loops did **499,500** checks and the two pointers did **999**.

## 5. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Nested loops over all pairs | O(n²) | O(1) | n(n-1)/2 pairs; 499,500 for n = 1,000 |
| Converging pointers (sorted input) | O(n) | O(1) | each step moves one pointer inward; at most n - 1 steps |
| Sort, then converging pointers | O(n log n) | depends on the sort | the sort dominates |
| Same-direction read/write | O(n) | O(1) | \`fast\` reads each element once |

\`Arrays.copyOf(nums, k)\` in the demo allocates a new array only for printing; the algorithm itself allocates nothing. For a refresher on reading this notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 6. Edge Cases

- **Empty array or one element:** no pair exists; the \`left < right\` check fails at once.
- **No valid pair:** the pointers meet and you return a sentinel (\`[-1, -1]\` here); say what you return before coding.
- **Duplicates:** \`[5, 5]\` with target 10 returns \`[0, 1]\`, because the pointers sit on different positions.
- **Negative numbers:** fine, as long as the array is sorted; the rule only needs order, not positivity.
- **Several valid pairs:** this returns the first one the pointers meet; ask whether the interviewer wants one pair or all of them.

## Common Pitfalls

- **Using it on unsorted data.** Call \`Arrays.sort(arr)\` first and say that it costs O(n log n) and loses the original indices.
- **\`int\` overflow in the sum.** Two values near \`Integer.MAX_VALUE\` wrap around to a negative number with no exception. Use \`long\` for the sum when the constraints allow large values.
- **\`while (left <= right)\` in a pair search.** Both pointers can land on one element and count it twice.
- **Using \`List<Integer>\` and \`==\`.** \`Integer\` objects compared with \`==\` compare references: in a test, two \`Integer\` values of 127 compared equal but two of 128 did not (the small-value cache). Compare with \`.equals\` or use \`int[]\`.
- **Printing an array directly.** \`System.out.println(arr)\` printed \`[I@659e0bfd\` in a test run (type code plus a hash); use \`Arrays.toString(arr)\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Two indices walk through the data under a rule, each element is visited a constant number of times, so pair problems drop from O(n²) to O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Two shapes:</strong> <span style="color:#f0e2c8;">Converging: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left = 0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right = arr.length - 1</code>, move towards each other. Same direction: a fast reader and a slow writer, for in-place filtering.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it is correct:</strong> <span style="color:#f0e2c8;">On a sorted array, if the sum is too big then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr[right]</code> is too big with every remaining partner, so dropping it loses nothing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space; if the input is not sorted, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort</code> first makes it O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java details:</strong> <span style="color:#f0e2c8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List&lt;Integer&gt;</code>, a temp variable to swap, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> for the sum if values can be near <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The array is not sorted. Do you still use two pointers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a pair sum, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Integer, Integer&gt;</code> from value to index gives O(n) time and keeps original indices. Sorting first plus two pointers is O(n log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the two values are both 2 billion?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> addition overflows silently to a negative number, so the comparison goes the wrong way. Cast one operand to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> before adding.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you extend this to 3Sum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort, fix each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, run converging pointers on the rest for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-nums[i]</code>, and skip equal neighbours to avoid duplicate triplets. O(n²) overall.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the method change my array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Java passes the array reference by value, so the method and the caller share one array object. Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr.clone()</code> if you need to keep the original.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prove the pointer loop terminates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every iteration moves one pointer one step closer to the other, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right - left</code> strictly shrinks and hits zero after at most n - 1 steps.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Two-pointer technique** | two indices moving through data under a rule, for O(n) work |
| **Converging (opposite-direction) pointers** | start at both ends and move towards each other |
| **Same-direction (read/write) pointers** | a fast reader and a slow writer moving the same way |
| **Monotonic property** | values only go one way, which lets one comparison rule out an element |
| **In place** | rearranging the input itself with O(1) extra memory |
| **Loop invariant** | a fact that holds before and after every iteration |
| **Integer overflow** | a result too big for \`int\` wraps around to a wrong value with no error |

---
**Conclusion:** The two-pointer technique replaces "check every pair" with two indices that each only move forward (or inward), so the work is O(n) instead of O(n²) with O(1) extra memory. Use converging pointers when sorted order lets one comparison rule out an element, and same-direction read/write pointers when you filter or rearrange an array in place. In Java, the code is short, so what earns the marks is naming the shape, stating the invariant, handling the empty input, and knowing the language traps shown above.`,
        examples: [
          { label: `Pair sum with converging pointers, and a count of checks vs brute force`, code: `import java.util.Arrays;

public class Main {
    // Indices of two values in a sorted array that add up to target, else [-1, -1].
    static int[] pairSum(int[] arr, int target) {
        int left = 0, right = arr.length - 1;
        while (left < right) {
            int s = arr[left] + arr[right];
            if (s == target) return new int[]{left, right};
            if (s < target) left++;   // sum too small: the only way up is a bigger left value
            else right--;             // sum too big: the only way down is a smaller right value
        }
        return new int[]{-1, -1};
    }

    static long bruteChecks(int[] arr, int target) {
        long checks = 0;
        for (int i = 0; i < arr.length; i++)
            for (int j = i + 1; j < arr.length; j++) {
                checks++;
                if (arr[i] + arr[j] == target) return checks;
            }
        return checks;
    }

    static long pointerChecks(int[] arr, int target) {
        long checks = 0;
        int left = 0, right = arr.length - 1;
        while (left < right) {
            checks++;
            int s = arr[left] + arr[right];
            if (s == target) return checks;
            if (s < target) left++;
            else right--;
        }
        return checks;
    }

    public static void main(String[] args) {
        int[] big = new int[1000];
        for (int i = 0; i < big.length; i++) big[i] = 2 * i; // every sum is even

        System.out.println(Arrays.toString(pairSum(new int[]{2, 7, 8, 11, 15, 18}, 18))); // [1, 3]
        System.out.println(Arrays.toString(pairSum(new int[]{1, 2, 3, 4}, 100)));         // [-1, -1]
        System.out.println(Arrays.toString(pairSum(new int[]{}, 5)));                      // [-1, -1]
        System.out.println(Arrays.toString(pairSum(new int[]{5, 5}, 10)));                 // [0, 1]
        System.out.println("n=1000, no pair: brute force " + bruteChecks(big, 1)
            + " checks, two pointers " + pointerChecks(big, 1) + " checks");
    }
}` },
          { label: `Same-direction pointers: remove duplicates and reverse in place`, code: `import java.util.Arrays;

public class Main {
    // Sorted array, in place: keep one copy of each value at the front, return how many.
    static int removeDuplicates(int[] nums) {
        if (nums.length == 0) return 0;
        int slow = 0; // nums[0..slow] is the de-duplicated part
        for (int fast = 1; fast < nums.length; fast++) {
            if (nums[fast] != nums[slow]) {
                slow++;
                nums[slow] = nums[fast];
            }
        }
        return slow + 1;
    }

    static int[] reverseInPlace(int[] nums) {
        int left = 0, right = nums.length - 1;
        while (left < right) {
            int tmp = nums[left];   // Java has no tuple swap: use a temp
            nums[left] = nums[right];
            nums[right] = tmp;
            left++;
            right--;
        }
        return nums;
    }

    static String showDedup(int[] nums) {
        int k = removeDuplicates(nums);
        return k + " " + Arrays.toString(Arrays.copyOf(nums, k));
    }

    public static void main(String[] args) {
        System.out.println(showDedup(new int[]{1, 1, 2, 2, 2, 3, 5, 5}));            // 4 [1, 2, 3, 5]
        System.out.println(showDedup(new int[]{}));                                  // 0 []
        System.out.println(showDedup(new int[]{7}));                                 // 1 [7]
        System.out.println(showDedup(new int[]{0, 0, 0}));                           // 1 [0]
        System.out.println(Arrays.toString(reverseInPlace(new int[]{1, 2, 3, 4, 5}))); // [5, 4, 3, 2, 1]
        System.out.println(Arrays.toString(reverseInPlace(new int[]{1, 2})));          // [2, 1]
        System.out.println(Arrays.toString(reverseInPlace(new int[]{})));              // []
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Explain the two-pointer technique. Then, in C++, use it to find two numbers in a sorted vector that add up to a target, and tell me how it beats the obvious nested loop."

**What a strong answer should cover:**
- Two indices moving through the data under a rule; the two shapes (converging from both ends, and same-direction read/write).
- Why moving a pointer is safe: the sorted (monotonic) order lets one comparison rule out a whole element.
- O(n) time and O(1) extra space versus O(n²) for checking every pair; sorting first adds O(n log n).
- When an \`unordered_map\` is the better tool: unsorted input, original indices needed.
- C++ specifics: \`v.size() - 1\` on an empty vector wraps around because \`size()\` is unsigned, signed \`int\` overflow is undefined behaviour, \`std::swap\`, and passing by \`const&\` to avoid copies.

**Clarifying questions expected:**
- "Is the vector sorted, and can values be large enough that a sum overflows \`int\`?"
- "Should I return indices or values, and what if no pair exists?"

**Code / implementation expected:** Yes — a C++ \`pairSum(const vector<int>&, int)\` with \`left\`/\`right\` indices, plus a same-direction example such as removing duplicates in place.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two friends are looking for two books on a long, alphabetised shelf whose page counts add up to exactly 500, so the pair fits a 500-page reading challenge. The slow way: pick the first book, compare it with every other book, then pick the second book, compare it with every other book, and so on. With 1,000 books that is about half a million comparisons.

The clever way: the shelf is sorted by page count. One friend stands at the thinnest book, the other at the thickest. They add the two page counts. Too many pages? The friend at the thick end steps one book inward, to something thinner. Too few? The friend at the thin end steps inward, to something thicker. Each step rules out a whole book for good, so they finish in at most 999 steps.

That is the whole technique: **two positions that walk through the data in a coordinated way, and a rule that says which one moves**. Because neither ever walks backwards, the work is proportional to the length of the data, not its square.

## 2. The Core Idea

A **pointer** here just means an index: a whole number saying which position in an array or string you are looking at. The technique keeps two of them and moves them according to a rule.

📌 **Interview term: Two-pointer technique** — solving an array or string problem with two indices that move through the data, each step moving one (or both) of them forward, so every element is visited a constant number of times and the total work is O(n).

There are two shapes, and recognising which one a problem needs is half the answer.

### Shape 1: opposite ends, moving towards each other

📌 **Interview term: Converging (opposite-direction) pointers** — one pointer starts at index 0, the other at the last index, and they move towards each other until they meet.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="Opposite-direction pointers on the sorted array 2 7 8 11 15 18, left starts at index 0 and right at index 5">
  <defs>
    <marker id="tp1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="75" y="30" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="170" y="30" text-anchor="middle">1</text>
  <rect class="d-box" x="135" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="170" y="70" text-anchor="middle">7</text>
  <text class="d-sub" x="265" y="30" text-anchor="middle">2</text>
  <rect class="d-box" x="230" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="265" y="70" text-anchor="middle">8</text>
  <text class="d-sub" x="360" y="30" text-anchor="middle">3</text>
  <rect class="d-box" x="325" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="360" y="70" text-anchor="middle">11</text>
  <text class="d-sub" x="455" y="30" text-anchor="middle">4</text>
  <rect class="d-box" x="420" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="455" y="70" text-anchor="middle">15</text>
  <text class="d-sub" x="550" y="30" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="515" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="550" y="70" text-anchor="middle">18</text>
  <path class="d-edge-accent" d="M 75 118 L 75 96" marker-end="url(#tp1-arrow)"/>
  <text class="d-text d-accent" x="75" y="136" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 550 118 L 550 96" marker-end="url(#tp1-arrow)"/>
  <text class="d-text d-accent" x="550" y="136" text-anchor="middle">right</text>
  <rect class="d-box-muted" x="40" y="168" width="260" height="62" rx="10"/>
  <text class="d-text" x="170" y="193" text-anchor="middle">sum too small</text>
  <text class="d-sub" x="170" y="215" text-anchor="middle">move left one step right</text>
  <rect class="d-box-muted" x="340" y="168" width="260" height="62" rx="10"/>
  <text class="d-text" x="470" y="193" text-anchor="middle">sum too big</text>
  <text class="d-sub" x="470" y="215" text-anchor="middle">move right one step left</text>
</svg>

On the sorted array \`[2, 7, 8, 11, 15, 18]\` with target 18 the pointers start at 2 and 18 (sum 20, too big, so \`right\` moves), then 2 and 15 (17, too small, so \`left\` moves), then 7 and 15 (22, too big), then 7 and 11 (18, found). Four checks.

Why it is safe to throw a value away: if \`arr[left] + arr[right]\` is too big, then \`arr[right]\` plus **any** remaining value is also too big, because every remaining value is at least \`arr[left]\`. So \`arr[right]\` cannot be part of any answer and can be dropped. The mirror argument drops \`arr[left]\` when the sum is too small. This only works because the array is sorted.

📌 **Interview term: Monotonic property** — a property that only ever goes one way as you move (for example, values only increase from left to right). Two pointers need one: it is what lets a single comparison rule out a whole element.

Problems with this shape: pair sum in a sorted array, [3Sum](/interview-question/how-do-you-solve-the-3sum-problem), [container with most water](/interview-question/how-do-you-solve-the-container-with-most-water-problem), [valid palindrome](/interview-question/how-do-you-check-if-a-string-is-a-valid-palindrome), reversing an array in place, and [trapping rain water](/interview-question/trapping-rain-water-with-two-pointers-why-does-leftmax-rightmax-work-in-o-1-spac).

### Shape 2: same direction, one reading and one writing

📌 **Interview term: Same-direction (read/write) pointers** — both pointers start at the front; a fast one reads every element and a slow one marks where the next kept element should be written.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 260" role="img" aria-label="Same-direction pointers while removing duplicates, slow marks the last kept value and fast reads ahead">
  <defs>
    <marker id="tp2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="58" y="30" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="30" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="58" y="70" text-anchor="middle">1</text>
  <text class="d-sub" x="128" y="30" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="100" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="128" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="198" y="30" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="170" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="198" y="70" text-anchor="middle">3</text>
  <text class="d-sub" x="268" y="30" text-anchor="middle">3</text>
  <rect class="d-box" x="240" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="268" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="338" y="30" text-anchor="middle">4</text>
  <rect class="d-box" x="310" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="338" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="408" y="30" text-anchor="middle">5</text>
  <rect class="d-box" x="380" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="408" y="70" text-anchor="middle">3</text>
  <text class="d-sub" x="478" y="30" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="450" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="478" y="70" text-anchor="middle">5</text>
  <text class="d-sub" x="548" y="30" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="520" y="40" width="56" height="50" rx="6"/>
  <text class="d-text" x="548" y="70" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 198 118 L 198 96" marker-end="url(#tp2-arrow)"/>
  <text class="d-text d-accent" x="198" y="136" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 408 118 L 408 96" marker-end="url(#tp2-arrow)"/>
  <text class="d-text" x="408" y="136" text-anchor="middle">fast</text>
  <rect class="d-box-accent" x="30" y="172" width="160" height="62" rx="10"/>
  <text class="d-text" x="110" y="197" text-anchor="middle">indexes 0 to 2</text>
  <text class="d-sub" x="110" y="219" text-anchor="middle">kept, unique</text>
  <rect class="d-box" x="220" y="172" width="160" height="62" rx="10"/>
  <text class="d-text" x="300" y="197" text-anchor="middle">indexes 3 to 5</text>
  <text class="d-sub" x="300" y="219" text-anchor="middle">already read</text>
  <rect class="d-box-muted" x="410" y="172" width="160" height="62" rx="10"/>
  <text class="d-text" x="490" y="197" text-anchor="middle">indexes 6 to 7</text>
  <text class="d-sub" x="490" y="219" text-anchor="middle">not read yet</text>
</svg>

The picture shows removing duplicates from the sorted array \`[1, 1, 2, 2, 2, 3, 5, 5]\` just after \`fast\` has read index 5. Indexes 0 to 2 hold the unique values found so far (1, 2, 3), so \`slow\` points at index 2. Indexes 3 to 5 have been read but are now leftovers. Indexes 6 and 7 are still to be read.

📌 **Interview term: In place** — the algorithm rearranges the input array itself and uses only O(1) extra memory (a few variables), instead of building a new array.

📌 **Interview term: Loop invariant** — a statement that is true before and after every loop step, such as "everything before \`slow + 1\` is unique and in order". Saying the invariant out loud is the fastest way to convince an interviewer the code is correct.

Problems with this shape: remove duplicates, [move zeroes](/interview-question/how-do-you-move-all-zeroes-to-the-end-of-an-array-in-place), [merging two sorted arrays](/interview-question/how-do-you-merge-two-sorted-arrays), and the linked-list variant in [the fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique). The [Dutch national flag sort](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s) uses three pointers, combining both shapes.

### How it relates to sliding window

A [sliding window](/interview-question/what-is-the-sliding-window-technique) is a special case of same-direction pointers where you care about everything **between** the two pointers (a contiguous range), not just the two elements they point at.

### When not to use it

If the array is not sorted and you need a pair with a given sum, sorting first costs O(n log n). A hash map solves it in O(n) time and keeps the original indices; see [Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently). Two pointers win when the input is already sorted, when you must use O(1) extra space, or when the problem is about rearranging in place.

## 3. Brute Force First, Then Two Pointers in C++

The obvious approach checks every pair with two nested loops: about n²/2 checks, so O(n²). On a sorted array, two pointers do the same job in at most n - 1 checks. In C++ the pointers can be indices or real iterators; indices read more clearly in an interview. The vector is taken by \`const vector<int>&\`, so nothing is copied and the function promises not to modify it.

~~~cpp
// Indices of two values in a sorted vector that add up to target, else [-1, -1].
vector<int> pairSum(const vector<int>& arr, int target) {
    int left = 0, right = static_cast<int>(arr.size()) - 1;  // int, not size_t: empty input gives -1
    while (left < right) {
        int s = arr[left] + arr[right];
        if (s == target) return {left, right};
        if (s < target) left++;   // sum too small: the only way up is a bigger left value
        else right--;             // sum too big: the only way down is a smaller right value
    }
    return {-1, -1};
}
~~~

**Line by line:**

- \`right = static_cast<int>(arr.size()) - 1\` converts to a signed \`int\` **before** subtracting. \`arr.size()\` returns an unsigned \`size_t\`, and in a test run \`std::string().size() - 1\` printed \`18446744073709551615\`: with that as \`right\`, the loop would read far out of bounds. As an \`int\`, an empty vector gives \`-1\` and the loop does not run.
- \`int s = arr[left] + arr[right]\` is fine for the demo values, but signed overflow is undefined behaviour in C++, so for values near \`INT_MAX\` write \`long long s = 1LL * arr[left] + arr[right];\`.
- \`vector::operator[]\` does no bounds checking; \`arr.at(i)\` does, and throws \`std::out_of_range\`. Use \`at\` while debugging if you are unsure of an index.

📌 **Interview term: Unsigned wrap-around** — \`size_t\` cannot hold negative numbers, so \`0 - 1\` becomes the largest \`size_t\` value; this is defined behaviour, but it turns an index of -1 into a huge index.

### Same direction: remove duplicates and reverse

The same-direction shape in C++. \`std::swap\` (from \`<utility>\`) exchanges two elements. The \`reverseInPlace\` demo takes the vector by value so each call works on its own copy; a real in-place version takes \`vector<int>&\`. Note the \`nums.empty()\` guard before computing \`nums.size() - 1\` with \`size_t\` indices.

~~~cpp
// Sorted vector, in place: keep one copy of each value at the front, return how many.
int removeDuplicates(vector<int>& nums) {
    if (nums.empty()) return 0;
    size_t slow = 0;  // nums[0..slow] is the de-duplicated part
    for (size_t fast = 1; fast < nums.size(); fast++) {
        if (nums[fast] != nums[slow]) {
            slow++;
            nums[slow] = nums[fast];
        }
    }
    return static_cast<int>(slow + 1);
}

vector<int> reverseInPlace(vector<int> nums) {
    if (nums.empty()) return nums;   // nums.size() - 1 would wrap around for size_t
    size_t left = 0, right = nums.size() - 1;
    while (left < right) {
        swap(nums[left], nums[right]);
        left++;
        right--;
    }
    return nums;
}
~~~

**The invariant:** in \`removeDuplicates\`, positions \`0..slow\` hold each distinct value seen so far, once, in order. \`fast\` only moves forward, \`slow\` only moves forward, so the loop is O(n).

## 4. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — pair sum, plus brute force vs two pointers** prints:

~~~text
[1, 3]
[-1, -1]
[-1, -1]
[0, 1]
n=1000, no pair: brute force 499500 checks, two pointers 999 checks
~~~

**Example 2 — same-direction pointers** prints:

~~~text
4 [1, 2, 3, 5]
0 []
1 [7]
1 [0]
[5, 4, 3, 2, 1]
[2, 1]
[]
~~~

**What the numbers show:** the last line of Example 1 is the point of the technique. On 1,000 even numbers with an odd target (so no pair exists and both methods must do their full work), the nested loops did **499,500** checks and the two pointers did **999**.

## 5. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Nested loops over all pairs | O(n²) | O(1) | n(n-1)/2 pairs; 499,500 for n = 1,000 |
| Converging pointers (sorted input) | O(n) | O(1) | each step moves one pointer inward; at most n - 1 steps |
| Sort, then converging pointers | O(n log n) | depends on the sort | the sort dominates |
| Same-direction read/write | O(n) | O(1) | \`fast\` reads each element once |

The standard library already has both shapes: \`std::reverse\` reverses in place and \`std::unique\` removes adjacent duplicates in place (returning the new logical end), but interviewers usually want the loop. For a refresher on reading this notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 6. Edge Cases

- **Empty array or one element:** no pair exists; the \`left < right\` check fails at once.
- **No valid pair:** the pointers meet and you return a sentinel (\`[-1, -1]\` here); say what you return before coding.
- **Duplicates:** \`[5, 5]\` with target 10 returns \`[0, 1]\`, because the pointers sit on different positions.
- **Negative numbers:** fine, as long as the array is sorted; the rule only needs order, not positivity.
- **Several valid pairs:** this returns the first one the pointers meet; ask whether the interviewer wants one pair or all of them.

## Common Pitfalls

- **\`size() - 1\` on an empty container.** \`size()\` is unsigned, so it wraps to a huge number instead of \`-1\`. Cast to \`int\` first or check \`empty()\`.
- **Signed overflow.** \`arr[left] + arr[right]\` overflowing \`int\` is undefined behaviour, not just a wrong number. Use \`long long\` when values can be large.
- **\`while (left <= right)\` in a pair search.** Both pointers can land on one element and count it twice; with unsigned indices, \`right--\` at 0 also wraps around.
- **Passing the vector by value by accident.** \`void f(vector<int> v)\` copies the whole vector (O(n)) and in-place changes are lost; use \`vector<int>&\` to modify, \`const vector<int>&\` to read.
- **Using it on unsorted data.** Call \`std::sort(v.begin(), v.end())\` first and say that it costs O(n log n) and loses the original indices.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Two indices walk through the data under a rule, each element is visited a constant number of times, so pair problems drop from O(n²) to O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Two shapes:</strong> <span style="color:#f0e2c8;">Converging: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left = 0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right = int(v.size()) - 1</code>, move towards each other. Same direction: a fast reader and a slow writer, for in-place filtering.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it is correct:</strong> <span style="color:#f0e2c8;">On a sorted vector, if the sum is too big then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v[right]</code> is too big with every remaining partner, so dropping it loses nothing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space; if the input is not sorted, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> first makes it O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ details:</strong> <span style="color:#f0e2c8;">Never compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size() - 1</code> on an empty vector with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t</code>, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> for large sums, and pass by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The vector is not sorted. Do you still use two pointers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a pair sum, an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map&lt;int, int&gt;</code> from value to index gives O(n) average time and keeps original indices. Sorting first plus two pointers is O(n log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why cast <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">size()</code> to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size()</code> is unsigned, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size() - 1</code> on an empty vector wraps to 18446744073709551615 on a 64-bit build instead of -1, and the loop reads out of bounds.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you extend this to 3Sum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort, fix each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, run converging pointers on the rest for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-nums[i]</code>, and skip equal neighbours to avoid duplicate triplets. O(n²) overall.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you write this with iterators?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">auto l = v.begin(), r = v.end() - 1</code> (after checking <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!v.empty()</code>), with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*l + *r</code>. Indices are easier to explain and to return.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prove the pointer loop terminates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every iteration moves one pointer one step closer to the other, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right - left</code> strictly shrinks and hits zero after at most n - 1 steps.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Two-pointer technique** | two indices moving through data under a rule, for O(n) work |
| **Converging (opposite-direction) pointers** | start at both ends and move towards each other |
| **Same-direction (read/write) pointers** | a fast reader and a slow writer moving the same way |
| **Monotonic property** | values only go one way, which lets one comparison rule out an element |
| **In place** | rearranging the input itself with O(1) extra memory |
| **Loop invariant** | a fact that holds before and after every iteration |
| **Unsigned wrap-around** | \`size_t\` arithmetic below 0 wraps to a huge number instead of going negative |

---
**Conclusion:** The two-pointer technique replaces "check every pair" with two indices that each only move forward (or inward), so the work is O(n) instead of O(n²) with O(1) extra memory. Use converging pointers when sorted order lets one comparison rule out an element, and same-direction read/write pointers when you filter or rearrange an array in place. In C++, the code is short, so what earns the marks is naming the shape, stating the invariant, handling the empty input, and knowing the language traps shown above.`,
        examples: [
          { label: `Pair sum with converging pointers, and a count of checks vs brute force`, code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

// Indices of two values in a sorted vector that add up to target, else [-1, -1].
vector<int> pairSum(const vector<int>& arr, int target) {
    int left = 0, right = static_cast<int>(arr.size()) - 1;  // int, not size_t: empty input gives -1
    while (left < right) {
        int s = arr[left] + arr[right];
        if (s == target) return {left, right};
        if (s < target) left++;   // sum too small: the only way up is a bigger left value
        else right--;             // sum too big: the only way down is a smaller right value
    }
    return {-1, -1};
}

long long bruteChecks(const vector<int>& arr, int target) {
    long long checks = 0;
    for (size_t i = 0; i < arr.size(); i++)
        for (size_t j = i + 1; j < arr.size(); j++) {
            checks++;
            if (arr[i] + arr[j] == target) return checks;
        }
    return checks;
}

long long pointerChecks(const vector<int>& arr, int target) {
    long long checks = 0;
    int left = 0, right = static_cast<int>(arr.size()) - 1;
    while (left < right) {
        checks++;
        int s = arr[left] + arr[right];
        if (s == target) return checks;
        if (s < target) left++;
        else right--;
    }
    return checks;
}

string fmt(const vector<int>& a) {
    string out = "[";
    for (size_t i = 0; i < a.size(); i++) out += (i ? ", " : "") + to_string(a[i]);
    return out + "]";
}

int main() {
    vector<int> big(1000);
    for (int i = 0; i < 1000; i++) big[i] = 2 * i;  // every sum is even

    cout << fmt(pairSum({2, 7, 8, 11, 15, 18}, 18)) << "\\n";  // [1, 3]
    cout << fmt(pairSum({1, 2, 3, 4}, 100)) << "\\n";          // [-1, -1]
    cout << fmt(pairSum({}, 5)) << "\\n";                       // [-1, -1]
    cout << fmt(pairSum({5, 5}, 10)) << "\\n";                  // [0, 1]
    cout << "n=1000, no pair: brute force " << bruteChecks(big, 1)
         << " checks, two pointers " << pointerChecks(big, 1) << " checks\\n";
}` },
          { label: `Same-direction pointers: remove duplicates and reverse in place`, code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

// Sorted vector, in place: keep one copy of each value at the front, return how many.
int removeDuplicates(vector<int>& nums) {
    if (nums.empty()) return 0;
    size_t slow = 0;  // nums[0..slow] is the de-duplicated part
    for (size_t fast = 1; fast < nums.size(); fast++) {
        if (nums[fast] != nums[slow]) {
            slow++;
            nums[slow] = nums[fast];
        }
    }
    return static_cast<int>(slow + 1);
}

vector<int> reverseInPlace(vector<int> nums) {
    if (nums.empty()) return nums;   // nums.size() - 1 would wrap around for size_t
    size_t left = 0, right = nums.size() - 1;
    while (left < right) {
        swap(nums[left], nums[right]);
        left++;
        right--;
    }
    return nums;
}

string fmt(const vector<int>& a, size_t n) {
    string out = "[";
    for (size_t i = 0; i < n; i++) out += (i ? ", " : "") + to_string(a[i]);
    return out + "]";
}
string fmt(const vector<int>& a) { return fmt(a, a.size()); }

string showDedup(vector<int> nums) {
    int k = removeDuplicates(nums);
    return to_string(k) + " " + fmt(nums, k);
}

int main() {
    cout << showDedup({1, 1, 2, 2, 2, 3, 5, 5}) << "\\n";    // 4 [1, 2, 3, 5]
    cout << showDedup({}) << "\\n";                          // 0 []
    cout << showDedup({7}) << "\\n";                         // 1 [7]
    cout << showDedup({0, 0, 0}) << "\\n";                   // 1 [0]
    cout << fmt(reverseInPlace({1, 2, 3, 4, 5})) << "\\n";   // [5, 4, 3, 2, 1]
    cout << fmt(reverseInPlace({1, 2})) << "\\n";            // [2, 1]
    cout << fmt(reverseInPlace({})) << "\\n";                // []
}` },
        ],
      },
    },
  },
  {
    title: `What is the sliding window technique?`,
    difficulty: "medium",
    seoDescription: `Sliding window in Python, JavaScript, Java and C++: fixed and variable windows, the expand/shrink loop, why it is O(n), with verified code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"What is the sliding window technique? Show me, in Python, the largest sum of any k consecutive numbers, and then a version where the window size is not fixed."

**What a strong answer should cover:**
- A window is a contiguous range \`[left, right]\`; you update a running summary as it moves instead of recomputing it.
- Fixed window (subtract the leaving element, add the entering one) versus variable window (expand right, shrink left by a rule).
- O(n) time because each pointer moves forward at most n times (amortized), versus O(n·k) or O(n²) recomputing.
- When it fails: the rule must be monotonic, so sums with negative numbers need prefix sums instead.
- Python specifics: compute \`sum(arr[:k])\` once, never \`sum(arr[i:i+k])\` per step (each slice copies k items); \`collections.Counter\` or \`defaultdict(int)\` for character windows; \`float('inf')\` as a "no answer yet" sentinel; ints cannot overflow.

**Clarifying questions expected:**
- "Can the numbers be negative or zero?" — decides whether shrinking is valid.
- "What should I return if no window qualifies, or if k is larger than the array?"

**Code / implementation expected:** Yes — \`max_window_sum(arr, k)\` for the fixed window and one variable-window function such as \`min_subarray_len(target, nums)\`, in Python.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are on a train, looking out of a window that always shows exactly three houses. You want to know the moment the three visible houses have the most lit windows in total. The slow way: every time the view changes, count the lit windows of all three houses again from scratch. The smart way: when the train moves one house along, one house disappears on the left and one appears on the right. Take the old total, subtract the house that left, add the house that arrived. One subtraction and one addition per step, no matter how wide the window is.

That is the sliding window technique: **keep a summary of a contiguous range, and update it incrementally as the range moves**, instead of recomputing it. Some problems use a fixed-width window like the train window; others let the window stretch and shrink, like a rubber band that grows until a rule breaks and then pulls in from the left until the rule holds again.

## 2. The Core Idea

📌 **Interview term: Sliding window** — a technique for problems about **contiguous** subarrays or substrings: keep two indices \`left\` and \`right\` that mark the current range, and update a running summary (a sum, a count, a frequency map) as they move, so each element enters and leaves the window at most once.

📌 **Interview term: Contiguous subarray** — a run of elements that sit next to each other in the array, such as \`[4, 2, 9]\` inside \`[1, 4, 2, 9, 3]\`. A subsequence may skip elements; a subarray may not. Sliding window only works for subarrays and substrings.

It is a special case of the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique): both pointers move in the same direction, and what matters is everything between them.

### Flavour 1: fixed-size window

📌 **Interview term: Fixed-size window** — the window always holds exactly \`k\` elements; each step removes one element from the left and adds one on the right.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 260" role="img" aria-label="Fixed window of size 3 sliding one step on 1 4 2 9 3 5 1, the value at index 0 leaves and the value at index 3 enters">
  <defs>
    <marker id="sw1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="70" y="30" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="40" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="70" y="70" text-anchor="middle">1</text>
  <text class="d-sub" x="146" y="30" text-anchor="middle">1</text>
  <rect class="d-box" x="116" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="146" y="70" text-anchor="middle">4</text>
  <text class="d-sub" x="222" y="30" text-anchor="middle">2</text>
  <rect class="d-box" x="192" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="222" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="298" y="30" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="268" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="298" y="70" text-anchor="middle">9</text>
  <text class="d-sub" x="374" y="30" text-anchor="middle">4</text>
  <rect class="d-box" x="344" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="374" y="70" text-anchor="middle">3</text>
  <text class="d-sub" x="450" y="30" text-anchor="middle">5</text>
  <rect class="d-box" x="420" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="450" y="70" text-anchor="middle">5</text>
  <text class="d-sub" x="526" y="30" text-anchor="middle">6</text>
  <rect class="d-box" x="496" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="526" y="70" text-anchor="middle">1</text>
  <path class="d-edge" d="M 70 118 L 70 96" marker-end="url(#sw1-arrow)"/>
  <text class="d-text" x="70" y="136" text-anchor="middle">leaves</text>
  <path class="d-edge-accent" d="M 298 118 L 298 96" marker-end="url(#sw1-arrow)"/>
  <text class="d-text d-accent" x="298" y="136" text-anchor="middle">enters</text>
  <rect class="d-box-muted" x="40" y="172" width="220" height="62" rx="10"/>
  <text class="d-text" x="150" y="197" text-anchor="middle">old window 0 to 2</text>
  <text class="d-sub" x="150" y="219" text-anchor="middle">sum 1 + 4 + 2 = 7</text>
  <rect class="d-box-accent" x="300" y="172" width="256" height="62" rx="10"/>
  <text class="d-text" x="428" y="197" text-anchor="middle">new window 1 to 3</text>
  <text class="d-sub" x="428" y="219" text-anchor="middle">sum 7 - 1 + 9 = 15</text>
</svg>

Sliding from window 0..2 to window 1..3, the sum changes from 7 to 15 with one subtraction (the 1 leaving) and one addition (the 9 entering). Over \`[1, 4, 2, 9, 3, 5, 1]\` with \`k = 3\` the window sums are 7, 15, 14, 17 and 9, so the answer is 17.

### Flavour 2: variable-size window

📌 **Interview term: Variable-size window** — the window grows on the right one element at a time and shrinks from the left whenever a rule says so, so its length changes as it moves.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="The variable window loop, expand on the right, shrink from the left while the condition says so, record the best, repeat">
  <defs>
    <marker id="sw2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="180" height="100" rx="10"/>
  <text class="d-text" x="120" y="73" text-anchor="middle">1. Expand</text>
  <text class="d-sub" x="120" y="95" text-anchor="middle">right moves one step</text>
  <text class="d-sub" x="120" y="117" text-anchor="middle">add nums at right</text>
  <path class="d-edge" d="M 214 90 L 266 90" marker-end="url(#sw2-arrow)"/>
  <rect class="d-box-accent" x="270" y="40" width="180" height="100" rx="10"/>
  <text class="d-text" x="360" y="73" text-anchor="middle">2. Shrink</text>
  <text class="d-sub" x="360" y="95" text-anchor="middle">left moves while</text>
  <text class="d-sub" x="360" y="117" text-anchor="middle">the rule says so</text>
  <path class="d-edge" d="M 454 90 L 506 90" marker-end="url(#sw2-arrow)"/>
  <rect class="d-box-muted" x="510" y="40" width="180" height="100" rx="10"/>
  <text class="d-text" x="600" y="73" text-anchor="middle">3. Record</text>
  <text class="d-sub" x="600" y="95" text-anchor="middle">update the best</text>
  <text class="d-sub" x="600" y="117" text-anchor="middle">window length</text>
  <path class="d-edge-dashed" d="M 600 144 L 600 184 L 120 184 L 120 146" marker-end="url(#sw2-arrow)"/>
  <text class="d-sub" x="360" y="214" text-anchor="middle">repeat for the next right</text>
</svg>

Every variable-window solution is this loop. What changes from problem to problem is only the rule in step 2:

- **Shortest valid window** (for example, the shortest subarray with sum at least \`target\`): after expanding, **while the window is valid**, record it and shrink, because a shorter valid window might exist.
- **Longest valid window** (for example, the longest run of 1s if you may flip at most \`k\` zeros): after expanding, **while the window is invalid**, shrink; then record, because the window is valid again.

📌 **Interview term: Amortized O(n)** — the inner \`while\` loop looks like it could make the algorithm O(n²), but \`left\` only moves forward and can move at most n times **in total** across the whole run. So \`right\` moves n times and \`left\` moves at most n times: about 2n steps overall.

### When it works, and when it does not

Shrinking from the left is only correct when the window rule is **monotonic**: making a valid window bigger never makes it less valid (or making an invalid window smaller never makes it less invalid). With positive numbers, adding an element can only increase the sum, so "sum at least target" is monotonic. With **negative numbers** it is not: adding an element can lower the sum, so a window you shrank past might have been the answer. For "subarray with sum exactly k" on arrays with negatives, use the [prefix sum technique](/interview-question/what-is-the-prefix-sum-technique) with a hash map instead.

Problems that are classic sliding windows: [longest substring without repeating characters](/interview-question/how-do-you-find-the-longest-substring-without-repeating-characters), [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring) (with its [need/have counters](/interview-question/minimum-window-substring-how-does-the-sliding-window-with-need-have-counters-wor)), and [sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl). [Maximum subarray sum](/interview-question/how-do-you-find-the-maximum-subarray-sum) looks similar but is solved by Kadane, because negative numbers break the window rule.

## 3. Brute Force First, Then the Fixed Window in Python

Brute force for "largest sum of k consecutive values": for each of the n - k + 1 starting positions, add up k values. That is O(n·k), which becomes O(n²) when k grows with n. The sliding version builds the first sum once and then pays two operations per step. \`sum(arr[:k])\` builds a k-element slice once to get the first window; after that the loop does one subtraction and one addition per step. Python integers have arbitrary precision, so the running sum can never overflow.

~~~python
def max_window_sum(arr, k):
    """Largest sum of any k consecutive values (assumes 1 <= k <= len(arr))."""
    window = sum(arr[:k])          # first window, built once
    best = window
    for i in range(k, len(arr)):
        window += arr[i] - arr[i - k]   # add the value entering, drop the one leaving
        best = max(best, window)
    return best
~~~

## 4. The Variable Window in Python

Both variable-window shapes in Python. \`range(len(nums))\` drives \`right\`; \`left\` is a plain \`int\` that only moves forward inside the \`while\`.

~~~python
def min_subarray_len(target, nums):
    """Length of the shortest contiguous run with sum >= target (positive nums), else 0."""
    best = len(nums) + 1
    window = 0
    left = 0
    for right in range(len(nums)):
        window += nums[right]              # expand: take nums[right] in
        while window >= target:            # valid: record it, then try to shrink
            best = min(best, right - left + 1)
            window -= nums[left]
            left += 1
    return 0 if best == len(nums) + 1 else best

def longest_ones(nums, k):
    """Longest run of 1s if you may flip at most k zeros to 1."""
    zeros = 0
    left = 0
    best = 0
    for right in range(len(nums)):
        if nums[right] == 0:
            zeros += 1
        while zeros > k:                   # invalid: shrink until it holds again
            if nums[left] == 0:
                zeros -= 1
            left += 1
        best = max(best, right - left + 1)
    return best
~~~

**Trace of the shortest window** on \`target = 7\`, \`nums = [2, 3, 1, 2, 4, 3]\`: the window grows to \`[2, 3, 1, 2]\` (sum 8, valid, length 4), shrinks to \`[3, 1, 2]\` (6, invalid), grows to \`[3, 1, 2, 4]\` (10), shrinks through \`[1, 2, 4]\` (7, length 3) to \`[2, 4]\` (6), grows to \`[2, 4, 3]\` (9, length 3), and shrinks to \`[4, 3]\` (7, length 2). The answer is 2.

📌 **Interview term: Frequency map** — a map from item to how many times it is in the window, updated by +1 when an item enters and -1 when it leaves. It is the summary for most string windows (anagrams, distinct characters, minimum window substring).

For character windows, \`collections.Counter()\` or \`collections.defaultdict(int)\` keeps the counts (a missing key reads as 0), and \`collections.deque\` gives O(1) pops from both ends for the sliding-window-maximum follow-up.

## 5. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — fixed window, plus an operation count** prints:

~~~text
17
-6
4
12
n=10000, k=100: recompute 990100 additions, sliding 19900
~~~

**Example 2 — variable windows** prints:

~~~text
2
1
0
5
6
10
0
~~~

**What the numbers show:** for n = 10,000 and k = 100, recomputing every window costs 990,100 additions, the sliding window costs 19,900 (the first 100, then one add and one subtract for each of the 9,900 slides). That is about 50 times less work, and the gap grows with k.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Recompute every fixed window | O(n·k) | O(1) | n - k + 1 windows, k additions each |
| Fixed sliding window | O(n) | O(1) | k to start, then 2 operations per slide |
| Check every subarray (variable) | O(n²) | O(1) | n(n+1)/2 subarrays, with a running sum per start |
| Variable sliding window | O(n) | O(1), or O(alphabet) with a frequency map | \`right\` and \`left\` each move at most n times |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **k equals the array length:** one window, the whole array (\`[3, 3, 3, 3]\` with k = 4 gives 12).
- **k = 1:** the answer is the largest single element.
- **All negative values (fixed window):** still correct, because a fixed window never shrinks by a rule; \`[-5, -1, -8, -2]\` with k = 2 gives -6.
- **No valid window (variable):** return the agreed sentinel; \`min_subarray_len(11, [1, 1, 1, 1, 1, 1, 1, 1])\` returns 0.
- **k = 0 in the flip problem:** the window can only hold 1s; \`[0, 0, 0]\` gives 0.
- **k larger than the array, or empty input:** no full window exists; agree on the result before coding.

## Common Pitfalls

- **Recomputing with slices.** \`max(sum(arr[i:i+k]) for i in ...)\` is correct but copies k items per step: O(n·k), which is exactly the brute force.
- **Shrinking with negative numbers.** The variable window assumes adding an element never lowers the sum; with negatives, use prefix sums and a \`dict\`.
- **Off-by-one window length.** The length of \`[left, right]\` is \`right - left + 1\`; forgetting the \`+ 1\` is the most common bug.
- **Mixing up the two shapes.** For shortest-valid, record **inside** \`while valid\`; for longest-valid, shrink \`while invalid\` and record **after** the loop.
- **Deleting zero counts.** With a \`Counter\`, a key whose count drops to 0 still exists, so \`len(counter)\` over-counts distinct items; \`del counter[c]\` when it reaches 0.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Keep a window <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[left, right]</code> over a contiguous range and update a running summary as it moves, instead of recomputing it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Fixed window:</strong> <span style="color:#f0e2c8;">First sum once with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sum(arr[:k])</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window += arr[i] - arr[i - k]</code>: one add and one subtract per step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Variable window:</strong> <span style="color:#f0e2c8;">Expand <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> every step; shrink <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> while valid (shortest) or while invalid (longest); record the best <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right - left + 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why O(n):</strong> <span style="color:#f0e2c8;">Each pointer only moves forward, at most n times in total, so the inner <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code> is amortized O(1) per step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The catch:</strong> <span style="color:#f0e2c8;">The rule must be monotonic: with negative numbers, use prefix sums with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> instead.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the nested <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while</code> not O(n²)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> never moves back, so across the whole run it moves at most n times. Total work is about 2n pointer moves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the array has negative numbers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Shrinking is no longer safe, because adding an element can lower the sum. For sum exactly k, use a prefix sum with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> of counts: O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the maximum of every window of size k?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code> of indices whose values are decreasing; pop from the back while smaller, pop from the front when it leaves the window. O(n) total.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you track distinct characters in the window?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code> (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defaultdict(int)</code>), and delete a key when its count drops to 0 so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len()</code> is the distinct count.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if k is larger than the array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is no full window. Decide with the interviewer: return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>, raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueError</code>, or treat the whole array as the window.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Sliding window** | a moving contiguous range with a running summary updated incrementally |
| **Contiguous subarray** | a run of adjacent elements; no skipping |
| **Fixed-size window** | always k elements; one leaves and one enters per step |
| **Variable-size window** | grows on the right, shrinks on the left by a rule |
| **Amortized O(n)** | the inner loop is cheap on average because \`left\` moves at most n times in total |
| **Frequency map** | item to count, +1 on enter and -1 on leave |
| **collections.Counter** | a \`dict\` subclass for counting; missing keys read as 0 |

---
**Conclusion:** A sliding window turns "look at every contiguous range" into one forward pass: keep \`left\` and \`right\`, keep a running summary, and update it as elements enter and leave. Fixed windows subtract one and add one per step; variable windows expand every step and shrink by a rule that must be monotonic, which is why positive-only sums work and sums with negatives need prefix sums. In Python, the remaining marks come from the details shown above: the \`right - left + 1\` length, the right sentinel for "no window", and the language traps around sums and counts.`,
        examples: [
          { label: `Fixed window: largest sum of k consecutive values, and the work it saves`, code: `def max_window_sum(arr, k):
    """Largest sum of any k consecutive values (assumes 1 <= k <= len(arr))."""
    window = sum(arr[:k])          # first window, built once
    best = window
    for i in range(k, len(arr)):
        window += arr[i] - arr[i - k]   # add the value entering, drop the one leaving
        best = max(best, window)
    return best


def recompute_additions(n, k):
    return (n - k + 1) * k         # every window summed from scratch


def sliding_additions(n, k):
    return k + 2 * (n - k)         # first window, then one add and one subtract per slide


print(max_window_sum([1, 4, 2, 9, 3, 5, 1], 3))  # 17
print(max_window_sum([-5, -1, -8, -2], 2))  # -6
print(max_window_sum([4], 1))  # 4
print(max_window_sum([3, 3, 3, 3], 4))  # 12
print("n=10000, k=100: recompute " + str(recompute_additions(10000, 100)) + " additions, sliding " + str(sliding_additions(10000, 100)))` },
          { label: `Variable windows: shortest subarray with sum at least target, longest ones with k flips`, code: `def min_subarray_len(target, nums):
    """Length of the shortest contiguous run with sum >= target (positive nums), else 0."""
    best = len(nums) + 1
    window = 0
    left = 0
    for right in range(len(nums)):
        window += nums[right]              # expand: take nums[right] in
        while window >= target:            # valid: record it, then try to shrink
            best = min(best, right - left + 1)
            window -= nums[left]
            left += 1
    return 0 if best == len(nums) + 1 else best


def longest_ones(nums, k):
    """Longest run of 1s if you may flip at most k zeros to 1."""
    zeros = 0
    left = 0
    best = 0
    for right in range(len(nums)):
        if nums[right] == 0:
            zeros += 1
        while zeros > k:                   # invalid: shrink until it holds again
            if nums[left] == 0:
                zeros -= 1
            left += 1
        best = max(best, right - left + 1)
    return best


print(min_subarray_len(7, [2, 3, 1, 2, 4, 3]))  # 2
print(min_subarray_len(4, [1, 4, 4]))  # 1
print(min_subarray_len(11, [1, 1, 1, 1, 1, 1, 1, 1]))  # 0
print(min_subarray_len(15, [1, 2, 3, 4, 5]))  # 5
print(longest_ones([1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], 2))  # 6
print(longest_ones([0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1], 3))  # 10
print(longest_ones([0, 0, 0], 0))  # 0` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"What is the sliding window technique? Show me, in JavaScript, the largest sum of any k consecutive numbers, and then a version where the window size is not fixed."

**What a strong answer should cover:**
- A window is a contiguous range \`[left, right]\`; you update a running summary as it moves instead of recomputing it.
- Fixed window (subtract the leaving element, add the entering one) versus variable window (expand right, shrink left by a rule).
- O(n) time because each pointer moves forward at most n times (amortized), versus O(n·k) or O(n²) recomputing.
- When it fails: the rule must be monotonic, so sums with negative numbers need prefix sums instead.
- JavaScript specifics: avoid \`arr.slice(i, i + k).reduce(...)\` per step; a \`Map\` with \`(map.get(c) ?? 0) + 1\` for character counts; \`Infinity\` as a "no answer yet" sentinel; numbers are doubles, exact only up to \`Number.MAX_SAFE_INTEGER\`.

**Clarifying questions expected:**
- "Can the numbers be negative or zero?" — decides whether shrinking is valid.
- "What should I return if no window qualifies, or if k is larger than the array?"

**Code / implementation expected:** Yes — \`maxWindowSum(arr, k)\` for the fixed window and one variable-window function such as \`minSubarrayLen(target, nums)\`, in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are on a train, looking out of a window that always shows exactly three houses. You want to know the moment the three visible houses have the most lit windows in total. The slow way: every time the view changes, count the lit windows of all three houses again from scratch. The smart way: when the train moves one house along, one house disappears on the left and one appears on the right. Take the old total, subtract the house that left, add the house that arrived. One subtraction and one addition per step, no matter how wide the window is.

That is the sliding window technique: **keep a summary of a contiguous range, and update it incrementally as the range moves**, instead of recomputing it. Some problems use a fixed-width window like the train window; others let the window stretch and shrink, like a rubber band that grows until a rule breaks and then pulls in from the left until the rule holds again.

## 2. The Core Idea

📌 **Interview term: Sliding window** — a technique for problems about **contiguous** subarrays or substrings: keep two indices \`left\` and \`right\` that mark the current range, and update a running summary (a sum, a count, a frequency map) as they move, so each element enters and leaves the window at most once.

📌 **Interview term: Contiguous subarray** — a run of elements that sit next to each other in the array, such as \`[4, 2, 9]\` inside \`[1, 4, 2, 9, 3]\`. A subsequence may skip elements; a subarray may not. Sliding window only works for subarrays and substrings.

It is a special case of the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique): both pointers move in the same direction, and what matters is everything between them.

### Flavour 1: fixed-size window

📌 **Interview term: Fixed-size window** — the window always holds exactly \`k\` elements; each step removes one element from the left and adds one on the right.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 260" role="img" aria-label="Fixed window of size 3 sliding one step on 1 4 2 9 3 5 1, the value at index 0 leaves and the value at index 3 enters">
  <defs>
    <marker id="sw1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="70" y="30" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="40" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="70" y="70" text-anchor="middle">1</text>
  <text class="d-sub" x="146" y="30" text-anchor="middle">1</text>
  <rect class="d-box" x="116" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="146" y="70" text-anchor="middle">4</text>
  <text class="d-sub" x="222" y="30" text-anchor="middle">2</text>
  <rect class="d-box" x="192" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="222" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="298" y="30" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="268" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="298" y="70" text-anchor="middle">9</text>
  <text class="d-sub" x="374" y="30" text-anchor="middle">4</text>
  <rect class="d-box" x="344" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="374" y="70" text-anchor="middle">3</text>
  <text class="d-sub" x="450" y="30" text-anchor="middle">5</text>
  <rect class="d-box" x="420" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="450" y="70" text-anchor="middle">5</text>
  <text class="d-sub" x="526" y="30" text-anchor="middle">6</text>
  <rect class="d-box" x="496" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="526" y="70" text-anchor="middle">1</text>
  <path class="d-edge" d="M 70 118 L 70 96" marker-end="url(#sw1-arrow)"/>
  <text class="d-text" x="70" y="136" text-anchor="middle">leaves</text>
  <path class="d-edge-accent" d="M 298 118 L 298 96" marker-end="url(#sw1-arrow)"/>
  <text class="d-text d-accent" x="298" y="136" text-anchor="middle">enters</text>
  <rect class="d-box-muted" x="40" y="172" width="220" height="62" rx="10"/>
  <text class="d-text" x="150" y="197" text-anchor="middle">old window 0 to 2</text>
  <text class="d-sub" x="150" y="219" text-anchor="middle">sum 1 + 4 + 2 = 7</text>
  <rect class="d-box-accent" x="300" y="172" width="256" height="62" rx="10"/>
  <text class="d-text" x="428" y="197" text-anchor="middle">new window 1 to 3</text>
  <text class="d-sub" x="428" y="219" text-anchor="middle">sum 7 - 1 + 9 = 15</text>
</svg>

Sliding from window 0..2 to window 1..3, the sum changes from 7 to 15 with one subtraction (the 1 leaving) and one addition (the 9 entering). Over \`[1, 4, 2, 9, 3, 5, 1]\` with \`k = 3\` the window sums are 7, 15, 14, 17 and 9, so the answer is 17.

### Flavour 2: variable-size window

📌 **Interview term: Variable-size window** — the window grows on the right one element at a time and shrinks from the left whenever a rule says so, so its length changes as it moves.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="The variable window loop, expand on the right, shrink from the left while the condition says so, record the best, repeat">
  <defs>
    <marker id="sw2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="180" height="100" rx="10"/>
  <text class="d-text" x="120" y="73" text-anchor="middle">1. Expand</text>
  <text class="d-sub" x="120" y="95" text-anchor="middle">right moves one step</text>
  <text class="d-sub" x="120" y="117" text-anchor="middle">add nums at right</text>
  <path class="d-edge" d="M 214 90 L 266 90" marker-end="url(#sw2-arrow)"/>
  <rect class="d-box-accent" x="270" y="40" width="180" height="100" rx="10"/>
  <text class="d-text" x="360" y="73" text-anchor="middle">2. Shrink</text>
  <text class="d-sub" x="360" y="95" text-anchor="middle">left moves while</text>
  <text class="d-sub" x="360" y="117" text-anchor="middle">the rule says so</text>
  <path class="d-edge" d="M 454 90 L 506 90" marker-end="url(#sw2-arrow)"/>
  <rect class="d-box-muted" x="510" y="40" width="180" height="100" rx="10"/>
  <text class="d-text" x="600" y="73" text-anchor="middle">3. Record</text>
  <text class="d-sub" x="600" y="95" text-anchor="middle">update the best</text>
  <text class="d-sub" x="600" y="117" text-anchor="middle">window length</text>
  <path class="d-edge-dashed" d="M 600 144 L 600 184 L 120 184 L 120 146" marker-end="url(#sw2-arrow)"/>
  <text class="d-sub" x="360" y="214" text-anchor="middle">repeat for the next right</text>
</svg>

Every variable-window solution is this loop. What changes from problem to problem is only the rule in step 2:

- **Shortest valid window** (for example, the shortest subarray with sum at least \`target\`): after expanding, **while the window is valid**, record it and shrink, because a shorter valid window might exist.
- **Longest valid window** (for example, the longest run of 1s if you may flip at most \`k\` zeros): after expanding, **while the window is invalid**, shrink; then record, because the window is valid again.

📌 **Interview term: Amortized O(n)** — the inner \`while\` loop looks like it could make the algorithm O(n²), but \`left\` only moves forward and can move at most n times **in total** across the whole run. So \`right\` moves n times and \`left\` moves at most n times: about 2n steps overall.

### When it works, and when it does not

Shrinking from the left is only correct when the window rule is **monotonic**: making a valid window bigger never makes it less valid (or making an invalid window smaller never makes it less invalid). With positive numbers, adding an element can only increase the sum, so "sum at least target" is monotonic. With **negative numbers** it is not: adding an element can lower the sum, so a window you shrank past might have been the answer. For "subarray with sum exactly k" on arrays with negatives, use the [prefix sum technique](/interview-question/what-is-the-prefix-sum-technique) with a hash map instead.

Problems that are classic sliding windows: [longest substring without repeating characters](/interview-question/how-do-you-find-the-longest-substring-without-repeating-characters), [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring) (with its [need/have counters](/interview-question/minimum-window-substring-how-does-the-sliding-window-with-need-have-counters-wor)), and [sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl). [Maximum subarray sum](/interview-question/how-do-you-find-the-maximum-subarray-sum) looks similar but is solved by Kadane, because negative numbers break the window rule.

## 3. Brute Force First, Then the Fixed Window in JavaScript

Brute force for "largest sum of k consecutive values": for each of the n - k + 1 starting positions, add up k values. That is O(n·k), which becomes O(n²) when k grows with n. The sliding version builds the first sum once and then pays two operations per step. The first window is summed with a plain loop; after that each step does one subtraction and one addition. JavaScript numbers are 64-bit floats, so integer sums are exact only up to \`Number.MAX_SAFE_INTEGER\` (9007199254740991); beyond that, use \`BigInt\`.

~~~javascript
function maxWindowSum(arr, k) {
  // Largest sum of any k consecutive values (assumes 1 <= k <= arr.length).
  let window = 0;
  for (let i = 0; i < k; i++) window += arr[i]; // first window, built once
  let best = window;
  for (let i = k; i < arr.length; i++) {
    window += arr[i] - arr[i - k]; // add the value entering, drop the one leaving
    best = Math.max(best, window);
  }
  return best;
}
~~~

## 4. The Variable Window in JavaScript

Both variable-window shapes in JavaScript. \`Infinity\` is a convenient "nothing found yet" value because any real length is smaller.

~~~javascript
function minSubarrayLen(target, nums) {
  // Length of the shortest contiguous run with sum >= target (positive nums), else 0.
  let best = Infinity;
  let window = 0;
  let left = 0;
  for (let right = 0; right < nums.length; right++) {
    window += nums[right];          // expand: take nums[right] in
    while (window >= target) {      // valid: record it, then try to shrink
      best = Math.min(best, right - left + 1);
      window -= nums[left];
      left++;
    }
  }
  return best === Infinity ? 0 : best;
}

function longestOnes(nums, k) {
  // Longest run of 1s if you may flip at most k zeros to 1.
  let zeros = 0;
  let left = 0;
  let best = 0;
  for (let right = 0; right < nums.length; right++) {
    if (nums[right] === 0) zeros++;
    while (zeros > k) {             // invalid: shrink until it holds again
      if (nums[left] === 0) zeros--;
      left++;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}
~~~

**Trace of the shortest window** on \`target = 7\`, \`nums = [2, 3, 1, 2, 4, 3]\`: the window grows to \`[2, 3, 1, 2]\` (sum 8, valid, length 4), shrinks to \`[3, 1, 2]\` (6, invalid), grows to \`[3, 1, 2, 4]\` (10), shrinks through \`[1, 2, 4]\` (7, length 3) to \`[2, 4]\` (6), grows to \`[2, 4, 3]\` (9, length 3), and shrinks to \`[4, 3]\` (7, length 2). The answer is 2.

📌 **Interview term: Frequency map** — a map from item to how many times it is in the window, updated by +1 when an item enters and -1 when it leaves. It is the summary for most string windows (anagrams, distinct characters, minimum window substring).

For character windows use a \`Map\` (\`m.set(c, (m.get(c) ?? 0) + 1)\`) or, for lowercase letters only, an array of 26 counts indexed by \`c.charCodeAt(0) - 97\`. A plain object works too, but a \`Map\` has \`size\` and no inherited keys.

## 5. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — fixed window, plus an operation count** prints:

~~~text
17
-6
4
12
n=10000, k=100: recompute 990100 additions, sliding 19900
~~~

**Example 2 — variable windows** prints:

~~~text
2
1
0
5
6
10
0
~~~

**What the numbers show:** for n = 10,000 and k = 100, recomputing every window costs 990,100 additions, the sliding window costs 19,900 (the first 100, then one add and one subtract for each of the 9,900 slides). That is about 50 times less work, and the gap grows with k.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Recompute every fixed window | O(n·k) | O(1) | n - k + 1 windows, k additions each |
| Fixed sliding window | O(n) | O(1) | k to start, then 2 operations per slide |
| Check every subarray (variable) | O(n²) | O(1) | n(n+1)/2 subarrays, with a running sum per start |
| Variable sliding window | O(n) | O(1), or O(alphabet) with a frequency map | \`right\` and \`left\` each move at most n times |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **k equals the array length:** one window, the whole array (\`[3, 3, 3, 3]\` with k = 4 gives 12).
- **k = 1:** the answer is the largest single element.
- **All negative values (fixed window):** still correct, because a fixed window never shrinks by a rule; \`[-5, -1, -8, -2]\` with k = 2 gives -6.
- **No valid window (variable):** return the agreed sentinel; \`minSubarrayLen(11, [1, 1, 1, 1, 1, 1, 1, 1])\` returns 0.
- **k = 0 in the flip problem:** the window can only hold 1s; \`[0, 0, 0]\` gives 0.
- **k larger than the array, or empty input:** no full window exists; agree on the result before coding.

## Common Pitfalls

- **Recomputing with \`slice().reduce()\`.** It is correct but copies k items per step: O(n·k), which is exactly the brute force.
- **Shrinking with negative numbers.** The variable window assumes adding an element never lowers the sum; with negatives, use prefix sums and a \`Map\`.
- **Off-by-one window length.** The length of \`[left, right]\` is \`right - left + 1\`.
- **Reading past the end.** If \`k > arr.length\`, \`arr[i]\` is \`undefined\` and the sum becomes \`NaN\` silently; check \`k\` first.
- **Counting with a plain object.** \`counts[c]++\` on a missing key gives \`NaN\` (\`undefined + 1\`); initialise with \`(counts[c] || 0) + 1\` or use a \`Map\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Keep a window <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[left, right]</code> over a contiguous range and update a running summary as it moves, instead of recomputing it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Fixed window:</strong> <span style="color:#f0e2c8;">Sum the first k once, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window += arr[i] - arr[i - k]</code>: one add and one subtract per step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Variable window:</strong> <span style="color:#f0e2c8;">Expand <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> every step; shrink <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> while valid (shortest) or while invalid (longest); record the best <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right - left + 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why O(n):</strong> <span style="color:#f0e2c8;">Each pointer only moves forward, at most n times in total, so the inner <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code> is amortized O(1) per step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The catch:</strong> <span style="color:#f0e2c8;">The rule must be monotonic: with negative numbers, use prefix sums with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> instead.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the nested <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while</code> not O(n²)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> never moves back, so across the whole run it moves at most n times. Total work is about 2n pointer moves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the array has negative numbers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Shrinking is no longer safe. For sum exactly k, use a running prefix sum and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from prefix value to how often it was seen: O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the maximum of every window of size k?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a deque of indices with decreasing values. JavaScript has no built-in deque; an array with a moving head index avoids <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code>, which re-indexes every remaining element.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> or plain object for character counts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>: it has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code> for the distinct count, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code> for zero counts, and no prototype keys such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">constructor</code> to collide with.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if k is larger than the array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is no full window, and the loop would add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>. Check it first and return what the interviewer asks for, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Sliding window** | a moving contiguous range with a running summary updated incrementally |
| **Contiguous subarray** | a run of adjacent elements; no skipping |
| **Fixed-size window** | always k elements; one leaves and one enters per step |
| **Variable-size window** | grows on the right, shrinks on the left by a rule |
| **Amortized O(n)** | the inner loop is cheap on average because \`left\` moves at most n times in total |
| **Frequency map** | item to count, +1 on enter and -1 on leave |
| **Map** | JavaScript key-value collection with \`size\`, \`get\`, \`set\` and \`delete\` |

---
**Conclusion:** A sliding window turns "look at every contiguous range" into one forward pass: keep \`left\` and \`right\`, keep a running summary, and update it as elements enter and leave. Fixed windows subtract one and add one per step; variable windows expand every step and shrink by a rule that must be monotonic, which is why positive-only sums work and sums with negatives need prefix sums. In JavaScript, the remaining marks come from the details shown above: the \`right - left + 1\` length, the right sentinel for "no window", and the language traps around sums and counts.`,
        examples: [
          { label: `Fixed window: largest sum of k consecutive values, and the work it saves`, code: `function maxWindowSum(arr, k) {
  // Largest sum of any k consecutive values (assumes 1 <= k <= arr.length).
  let window = 0;
  for (let i = 0; i < k; i++) window += arr[i]; // first window, built once
  let best = window;
  for (let i = k; i < arr.length; i++) {
    window += arr[i] - arr[i - k]; // add the value entering, drop the one leaving
    best = Math.max(best, window);
  }
  return best;
}

const recomputeAdditions = (n, k) => (n - k + 1) * k; // every window summed from scratch
const slidingAdditions = (n, k) => k + 2 * (n - k);   // first window, then one add and one subtract per slide

console.log(maxWindowSum([1, 4, 2, 9, 3, 5, 1], 3)); // 17
console.log(maxWindowSum([-5, -1, -8, -2], 2)); // -6
console.log(maxWindowSum([4], 1)); // 4
console.log(maxWindowSum([3, 3, 3, 3], 4)); // 12
console.log('n=10000, k=100: recompute ' + recomputeAdditions(10000, 100) + ' additions, sliding ' + slidingAdditions(10000, 100));` },
          { label: `Variable windows: shortest subarray with sum at least target, longest ones with k flips`, code: `function minSubarrayLen(target, nums) {
  // Length of the shortest contiguous run with sum >= target (positive nums), else 0.
  let best = Infinity;
  let window = 0;
  let left = 0;
  for (let right = 0; right < nums.length; right++) {
    window += nums[right];          // expand: take nums[right] in
    while (window >= target) {      // valid: record it, then try to shrink
      best = Math.min(best, right - left + 1);
      window -= nums[left];
      left++;
    }
  }
  return best === Infinity ? 0 : best;
}

function longestOnes(nums, k) {
  // Longest run of 1s if you may flip at most k zeros to 1.
  let zeros = 0;
  let left = 0;
  let best = 0;
  for (let right = 0; right < nums.length; right++) {
    if (nums[right] === 0) zeros++;
    while (zeros > k) {             // invalid: shrink until it holds again
      if (nums[left] === 0) zeros--;
      left++;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}

console.log(minSubarrayLen(7, [2, 3, 1, 2, 4, 3])); // 2
console.log(minSubarrayLen(4, [1, 4, 4])); // 1
console.log(minSubarrayLen(11, [1, 1, 1, 1, 1, 1, 1, 1])); // 0
console.log(minSubarrayLen(15, [1, 2, 3, 4, 5])); // 5
console.log(longestOnes([1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], 2)); // 6
console.log(longestOnes([0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1], 3)); // 10
console.log(longestOnes([0, 0, 0], 0)); // 0` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"What is the sliding window technique? Show me, in Java, the largest sum of any k consecutive numbers, and then a version where the window size is not fixed."

**What a strong answer should cover:**
- A window is a contiguous range \`[left, right]\`; you update a running summary as it moves instead of recomputing it.
- Fixed window (subtract the leaving element, add the entering one) versus variable window (expand right, shrink left by a rule).
- O(n) time because each pointer moves forward at most n times (amortized), versus O(n·k) or O(n²) recomputing.
- When it fails: the rule must be monotonic, so sums with negative numbers need prefix sums instead.
- Java specifics: keep the running sum in a \`long\` because an \`int\` sum overflows silently; \`Integer.MAX_VALUE\` as a sentinel; an \`int[128]\` or \`HashMap\` with \`merge\` for character counts; \`ArrayDeque\` for the window-maximum follow-up.

**Clarifying questions expected:**
- "Can the numbers be negative or zero, and how large can they be?" — decides whether shrinking is valid and whether \`int\` is enough.
- "What should I return if no window qualifies, or if k is larger than the array?"

**Code / implementation expected:** Yes — \`static long maxWindowSum(int[] arr, int k)\` and one variable-window method such as \`minSubarrayLen(int target, int[] nums)\`, in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are on a train, looking out of a window that always shows exactly three houses. You want to know the moment the three visible houses have the most lit windows in total. The slow way: every time the view changes, count the lit windows of all three houses again from scratch. The smart way: when the train moves one house along, one house disappears on the left and one appears on the right. Take the old total, subtract the house that left, add the house that arrived. One subtraction and one addition per step, no matter how wide the window is.

That is the sliding window technique: **keep a summary of a contiguous range, and update it incrementally as the range moves**, instead of recomputing it. Some problems use a fixed-width window like the train window; others let the window stretch and shrink, like a rubber band that grows until a rule breaks and then pulls in from the left until the rule holds again.

## 2. The Core Idea

📌 **Interview term: Sliding window** — a technique for problems about **contiguous** subarrays or substrings: keep two indices \`left\` and \`right\` that mark the current range, and update a running summary (a sum, a count, a frequency map) as they move, so each element enters and leaves the window at most once.

📌 **Interview term: Contiguous subarray** — a run of elements that sit next to each other in the array, such as \`[4, 2, 9]\` inside \`[1, 4, 2, 9, 3]\`. A subsequence may skip elements; a subarray may not. Sliding window only works for subarrays and substrings.

It is a special case of the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique): both pointers move in the same direction, and what matters is everything between them.

### Flavour 1: fixed-size window

📌 **Interview term: Fixed-size window** — the window always holds exactly \`k\` elements; each step removes one element from the left and adds one on the right.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 260" role="img" aria-label="Fixed window of size 3 sliding one step on 1 4 2 9 3 5 1, the value at index 0 leaves and the value at index 3 enters">
  <defs>
    <marker id="sw1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="70" y="30" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="40" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="70" y="70" text-anchor="middle">1</text>
  <text class="d-sub" x="146" y="30" text-anchor="middle">1</text>
  <rect class="d-box" x="116" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="146" y="70" text-anchor="middle">4</text>
  <text class="d-sub" x="222" y="30" text-anchor="middle">2</text>
  <rect class="d-box" x="192" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="222" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="298" y="30" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="268" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="298" y="70" text-anchor="middle">9</text>
  <text class="d-sub" x="374" y="30" text-anchor="middle">4</text>
  <rect class="d-box" x="344" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="374" y="70" text-anchor="middle">3</text>
  <text class="d-sub" x="450" y="30" text-anchor="middle">5</text>
  <rect class="d-box" x="420" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="450" y="70" text-anchor="middle">5</text>
  <text class="d-sub" x="526" y="30" text-anchor="middle">6</text>
  <rect class="d-box" x="496" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="526" y="70" text-anchor="middle">1</text>
  <path class="d-edge" d="M 70 118 L 70 96" marker-end="url(#sw1-arrow)"/>
  <text class="d-text" x="70" y="136" text-anchor="middle">leaves</text>
  <path class="d-edge-accent" d="M 298 118 L 298 96" marker-end="url(#sw1-arrow)"/>
  <text class="d-text d-accent" x="298" y="136" text-anchor="middle">enters</text>
  <rect class="d-box-muted" x="40" y="172" width="220" height="62" rx="10"/>
  <text class="d-text" x="150" y="197" text-anchor="middle">old window 0 to 2</text>
  <text class="d-sub" x="150" y="219" text-anchor="middle">sum 1 + 4 + 2 = 7</text>
  <rect class="d-box-accent" x="300" y="172" width="256" height="62" rx="10"/>
  <text class="d-text" x="428" y="197" text-anchor="middle">new window 1 to 3</text>
  <text class="d-sub" x="428" y="219" text-anchor="middle">sum 7 - 1 + 9 = 15</text>
</svg>

Sliding from window 0..2 to window 1..3, the sum changes from 7 to 15 with one subtraction (the 1 leaving) and one addition (the 9 entering). Over \`[1, 4, 2, 9, 3, 5, 1]\` with \`k = 3\` the window sums are 7, 15, 14, 17 and 9, so the answer is 17.

### Flavour 2: variable-size window

📌 **Interview term: Variable-size window** — the window grows on the right one element at a time and shrinks from the left whenever a rule says so, so its length changes as it moves.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="The variable window loop, expand on the right, shrink from the left while the condition says so, record the best, repeat">
  <defs>
    <marker id="sw2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="180" height="100" rx="10"/>
  <text class="d-text" x="120" y="73" text-anchor="middle">1. Expand</text>
  <text class="d-sub" x="120" y="95" text-anchor="middle">right moves one step</text>
  <text class="d-sub" x="120" y="117" text-anchor="middle">add nums at right</text>
  <path class="d-edge" d="M 214 90 L 266 90" marker-end="url(#sw2-arrow)"/>
  <rect class="d-box-accent" x="270" y="40" width="180" height="100" rx="10"/>
  <text class="d-text" x="360" y="73" text-anchor="middle">2. Shrink</text>
  <text class="d-sub" x="360" y="95" text-anchor="middle">left moves while</text>
  <text class="d-sub" x="360" y="117" text-anchor="middle">the rule says so</text>
  <path class="d-edge" d="M 454 90 L 506 90" marker-end="url(#sw2-arrow)"/>
  <rect class="d-box-muted" x="510" y="40" width="180" height="100" rx="10"/>
  <text class="d-text" x="600" y="73" text-anchor="middle">3. Record</text>
  <text class="d-sub" x="600" y="95" text-anchor="middle">update the best</text>
  <text class="d-sub" x="600" y="117" text-anchor="middle">window length</text>
  <path class="d-edge-dashed" d="M 600 144 L 600 184 L 120 184 L 120 146" marker-end="url(#sw2-arrow)"/>
  <text class="d-sub" x="360" y="214" text-anchor="middle">repeat for the next right</text>
</svg>

Every variable-window solution is this loop. What changes from problem to problem is only the rule in step 2:

- **Shortest valid window** (for example, the shortest subarray with sum at least \`target\`): after expanding, **while the window is valid**, record it and shrink, because a shorter valid window might exist.
- **Longest valid window** (for example, the longest run of 1s if you may flip at most \`k\` zeros): after expanding, **while the window is invalid**, shrink; then record, because the window is valid again.

📌 **Interview term: Amortized O(n)** — the inner \`while\` loop looks like it could make the algorithm O(n²), but \`left\` only moves forward and can move at most n times **in total** across the whole run. So \`right\` moves n times and \`left\` moves at most n times: about 2n steps overall.

### When it works, and when it does not

Shrinking from the left is only correct when the window rule is **monotonic**: making a valid window bigger never makes it less valid (or making an invalid window smaller never makes it less invalid). With positive numbers, adding an element can only increase the sum, so "sum at least target" is monotonic. With **negative numbers** it is not: adding an element can lower the sum, so a window you shrank past might have been the answer. For "subarray with sum exactly k" on arrays with negatives, use the [prefix sum technique](/interview-question/what-is-the-prefix-sum-technique) with a hash map instead.

Problems that are classic sliding windows: [longest substring without repeating characters](/interview-question/how-do-you-find-the-longest-substring-without-repeating-characters), [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring) (with its [need/have counters](/interview-question/minimum-window-substring-how-does-the-sliding-window-with-need-have-counters-wor)), and [sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl). [Maximum subarray sum](/interview-question/how-do-you-find-the-maximum-subarray-sum) looks similar but is solved by Kadane, because negative numbers break the window rule.

## 3. Brute Force First, Then the Fixed Window in Java

Brute force for "largest sum of k consecutive values": for each of the n - k + 1 starting positions, add up k values. That is O(n·k), which becomes O(n²) when k grows with n. The sliding version builds the first sum once and then pays two operations per step. The running sum is a \`long\`. A window of k values each near \`Integer.MAX_VALUE\` would overflow an \`int\` silently (in a test run \`Integer.MAX_VALUE + 1\` printed \`-2147483648\`), and Java never throws on overflow. The \`(long)\` cast in \`arr[i] - (long) arr[i - k]\` makes the subtraction itself happen in 64 bits.

~~~java
// Largest sum of any k consecutive values (assumes 1 <= k <= arr.length).
// long, not int: k large values can overflow a 32-bit int.
static long maxWindowSum(int[] arr, int k) {
    long window = 0;
    for (int i = 0; i < k; i++) window += arr[i]; // first window, built once
    long best = window;
    for (int i = k; i < arr.length; i++) {
        window += arr[i] - (long) arr[i - k];     // add the value entering, drop the one leaving
        best = Math.max(best, window);
    }
    return best;
}
~~~

## 4. The Variable Window in Java

Both variable-window shapes in Java. \`Integer.MAX_VALUE\` is the "nothing found yet" sentinel for the shortest window.

~~~java
// Length of the shortest contiguous run with sum >= target (positive nums), else 0.
static int minSubarrayLen(int target, int[] nums) {
    int best = Integer.MAX_VALUE;
    long window = 0;
    int left = 0;
    for (int right = 0; right < nums.length; right++) {
        window += nums[right];              // expand: take nums[right] in
        while (window >= target) {          // valid: record it, then try to shrink
            best = Math.min(best, right - left + 1);
            window -= nums[left];
            left++;
        }
    }
    return best == Integer.MAX_VALUE ? 0 : best;
}

// Longest run of 1s if you may flip at most k zeros to 1.
static int longestOnes(int[] nums, int k) {
    int zeros = 0, left = 0, best = 0;
    for (int right = 0; right < nums.length; right++) {
        if (nums[right] == 0) zeros++;
        while (zeros > k) {                 // invalid: shrink until it holds again
            if (nums[left] == 0) zeros--;
            left++;
        }
        best = Math.max(best, right - left + 1);
    }
    return best;
}
~~~

**Trace of the shortest window** on \`target = 7\`, \`nums = [2, 3, 1, 2, 4, 3]\`: the window grows to \`[2, 3, 1, 2]\` (sum 8, valid, length 4), shrinks to \`[3, 1, 2]\` (6, invalid), grows to \`[3, 1, 2, 4]\` (10), shrinks through \`[1, 2, 4]\` (7, length 3) to \`[2, 4]\` (6), grows to \`[2, 4, 3]\` (9, length 3), and shrinks to \`[4, 3]\` (7, length 2). The answer is 2.

📌 **Interview term: Frequency map** — a map from item to how many times it is in the window, updated by +1 when an item enters and -1 when it leaves. It is the summary for most string windows (anagrams, distinct characters, minimum window substring).

For character windows, an \`int[128]\` indexed by the \`char\` (for ASCII input) is faster and simpler than a map; for general keys, \`map.merge(c, 1, Integer::sum)\` increments a \`HashMap\` count. \`ArrayDeque<Integer>\` is the deque for the window-maximum follow-up.

## 5. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — fixed window, plus an operation count** prints:

~~~text
17
-6
4
12
n=10000, k=100: recompute 990100 additions, sliding 19900
~~~

**Example 2 — variable windows** prints:

~~~text
2
1
0
5
6
10
0
~~~

**What the numbers show:** for n = 10,000 and k = 100, recomputing every window costs 990,100 additions, the sliding window costs 19,900 (the first 100, then one add and one subtract for each of the 9,900 slides). That is about 50 times less work, and the gap grows with k.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Recompute every fixed window | O(n·k) | O(1) | n - k + 1 windows, k additions each |
| Fixed sliding window | O(n) | O(1) | k to start, then 2 operations per slide |
| Check every subarray (variable) | O(n²) | O(1) | n(n+1)/2 subarrays, with a running sum per start |
| Variable sliding window | O(n) | O(1), or O(alphabet) with a frequency map | \`right\` and \`left\` each move at most n times |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **k equals the array length:** one window, the whole array (\`[3, 3, 3, 3]\` with k = 4 gives 12).
- **k = 1:** the answer is the largest single element.
- **All negative values (fixed window):** still correct, because a fixed window never shrinks by a rule; \`[-5, -1, -8, -2]\` with k = 2 gives -6.
- **No valid window (variable):** return the agreed sentinel; \`minSubarrayLen(11, [1, 1, 1, 1, 1, 1, 1, 1])\` returns 0.
- **k = 0 in the flip problem:** the window can only hold 1s; \`[0, 0, 0]\` gives 0.
- **k larger than the array, or empty input:** no full window exists; agree on the result before coding.

## Common Pitfalls

- **\`int\` overflow in the running sum.** It wraps silently to a negative number. Use \`long\` whenever values times k can exceed about 2.1 billion.
- **Shrinking with negative numbers.** The variable window assumes adding an element never lowers the sum; with negatives, use prefix sums and a \`HashMap\`.
- **Off-by-one window length.** The length of \`[left, right]\` is \`right - left + 1\`.
- **\`k > arr.length\`.** The first loop throws \`ArrayIndexOutOfBoundsException\`; validate \`k\` first.
- **Boxed counts compared with \`==\`.** \`map.get(a) == map.get(b)\` compares \`Integer\` references and is only reliably true for small values (in a test, 127 matched but 128 did not); use \`.equals\` or \`int[]\` counts.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Keep a window <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[left, right]</code> over a contiguous range and update a running summary as it moves, instead of recomputing it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Fixed window:</strong> <span style="color:#f0e2c8;">Sum the first k once into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window += arr[i] - arr[i - k]</code>: one add and one subtract per step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Variable window:</strong> <span style="color:#f0e2c8;">Expand <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> every step; shrink <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> while valid (shortest) or while invalid (longest); record the best <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right - left + 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why O(n):</strong> <span style="color:#f0e2c8;">Each pointer only moves forward, at most n times in total, so the inner <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code> is amortized O(1) per step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The catch:</strong> <span style="color:#f0e2c8;">The rule must be monotonic: with negative numbers, use prefix sums with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> instead.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the nested <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while</code> not O(n²)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> never moves back, so across the whole run it moves at most n times. Total work is about 2n pointer moves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long</code> for the window sum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Java <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> arithmetic wraps on overflow without an exception, so a large window could report a negative maximum. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> holds up to about 9.2 × 10^18.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the maximum of every window of size k?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque&lt;Integer&gt;</code> of indices with decreasing values: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pollLast</code> while smaller, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pollFirst</code> when the front leaves the window. O(n) total.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int[128]</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap&lt;Character, Integer&gt;</code> for counts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For ASCII input <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[128]</code> avoids boxing and hashing. Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">merge</code> when the alphabet is large or unknown.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the array has negative numbers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Shrinking is no longer safe. For sum exactly k, use a running prefix sum with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Long, Integer&gt;</code> of counts: O(n).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Sliding window** | a moving contiguous range with a running summary updated incrementally |
| **Contiguous subarray** | a run of adjacent elements; no skipping |
| **Fixed-size window** | always k elements; one leaves and one enters per step |
| **Variable-size window** | grows on the right, shrinks on the left by a rule |
| **Amortized O(n)** | the inner loop is cheap on average because \`left\` moves at most n times in total |
| **Frequency map** | item to count, +1 on enter and -1 on leave |
| **Integer overflow** | a result too big for \`int\` wraps around to a wrong value with no error |

---
**Conclusion:** A sliding window turns "look at every contiguous range" into one forward pass: keep \`left\` and \`right\`, keep a running summary, and update it as elements enter and leave. Fixed windows subtract one and add one per step; variable windows expand every step and shrink by a rule that must be monotonic, which is why positive-only sums work and sums with negatives need prefix sums. In Java, the remaining marks come from the details shown above: the \`right - left + 1\` length, the right sentinel for "no window", and the language traps around sums and counts.`,
        examples: [
          { label: `Fixed window: largest sum of k consecutive values, and the work it saves`, code: `public class Main {
    // Largest sum of any k consecutive values (assumes 1 <= k <= arr.length).
    // long, not int: k large values can overflow a 32-bit int.
    static long maxWindowSum(int[] arr, int k) {
        long window = 0;
        for (int i = 0; i < k; i++) window += arr[i]; // first window, built once
        long best = window;
        for (int i = k; i < arr.length; i++) {
            window += arr[i] - (long) arr[i - k];     // add the value entering, drop the one leaving
            best = Math.max(best, window);
        }
        return best;
    }

    static long recomputeAdditions(long n, long k) { return (n - k + 1) * k; }
    static long slidingAdditions(long n, long k) { return k + 2 * (n - k); }

    public static void main(String[] args) {
        System.out.println(maxWindowSum(new int[]{1, 4, 2, 9, 3, 5, 1}, 3)); // 17
        System.out.println(maxWindowSum(new int[]{-5, -1, -8, -2}, 2));     // -6
        System.out.println(maxWindowSum(new int[]{4}, 1));                  // 4
        System.out.println(maxWindowSum(new int[]{3, 3, 3, 3}, 4));         // 12
        System.out.println("n=10000, k=100: recompute " + recomputeAdditions(10000, 100)
            + " additions, sliding " + slidingAdditions(10000, 100));
    }
}` },
          { label: `Variable windows: shortest subarray with sum at least target, longest ones with k flips`, code: `public class Main {
    // Length of the shortest contiguous run with sum >= target (positive nums), else 0.
    static int minSubarrayLen(int target, int[] nums) {
        int best = Integer.MAX_VALUE;
        long window = 0;
        int left = 0;
        for (int right = 0; right < nums.length; right++) {
            window += nums[right];              // expand: take nums[right] in
            while (window >= target) {          // valid: record it, then try to shrink
                best = Math.min(best, right - left + 1);
                window -= nums[left];
                left++;
            }
        }
        return best == Integer.MAX_VALUE ? 0 : best;
    }

    // Longest run of 1s if you may flip at most k zeros to 1.
    static int longestOnes(int[] nums, int k) {
        int zeros = 0, left = 0, best = 0;
        for (int right = 0; right < nums.length; right++) {
            if (nums[right] == 0) zeros++;
            while (zeros > k) {                 // invalid: shrink until it holds again
                if (nums[left] == 0) zeros--;
                left++;
            }
            best = Math.max(best, right - left + 1);
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(minSubarrayLen(7, new int[]{2, 3, 1, 2, 4, 3}));        // 2
        System.out.println(minSubarrayLen(4, new int[]{1, 4, 4}));                 // 1
        System.out.println(minSubarrayLen(11, new int[]{1, 1, 1, 1, 1, 1, 1, 1})); // 0
        System.out.println(minSubarrayLen(15, new int[]{1, 2, 3, 4, 5}));          // 5
        System.out.println(longestOnes(new int[]{1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0}, 2)); // 6
        System.out.println(longestOnes(new int[]{0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1}, 3)); // 10
        System.out.println(longestOnes(new int[]{0, 0, 0}, 0));                    // 0
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"What is the sliding window technique? Show me, in C++, the largest sum of any k consecutive numbers, and then a version where the window size is not fixed."

**What a strong answer should cover:**
- A window is a contiguous range \`[left, right]\`; you update a running summary as it moves instead of recomputing it.
- Fixed window (subtract the leaving element, add the entering one) versus variable window (expand right, shrink left by a rule).
- O(n) time because each pointer moves forward at most n times (amortized), versus O(n·k) or O(n²) recomputing.
- When it fails: the rule must be monotonic, so sums with negative numbers need prefix sums instead.
- C++ specifics: keep the sum in \`long long\` because signed \`int\` overflow is undefined behaviour; \`INT_MAX\` from \`<climits>\` as a sentinel; \`std::array<int, 128>\` or \`unordered_map\` for counts; \`std::deque\` for the window-maximum follow-up.

**Clarifying questions expected:**
- "Can the numbers be negative or zero, and how large can they be?" — decides whether shrinking is valid and whether \`int\` is enough.
- "What should I return if no window qualifies, or if k is larger than the vector?"

**Code / implementation expected:** Yes — \`long long maxWindowSum(const vector<int>&, size_t k)\` and one variable-window function such as \`minSubarrayLen\`, in C++.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are on a train, looking out of a window that always shows exactly three houses. You want to know the moment the three visible houses have the most lit windows in total. The slow way: every time the view changes, count the lit windows of all three houses again from scratch. The smart way: when the train moves one house along, one house disappears on the left and one appears on the right. Take the old total, subtract the house that left, add the house that arrived. One subtraction and one addition per step, no matter how wide the window is.

That is the sliding window technique: **keep a summary of a contiguous range, and update it incrementally as the range moves**, instead of recomputing it. Some problems use a fixed-width window like the train window; others let the window stretch and shrink, like a rubber band that grows until a rule breaks and then pulls in from the left until the rule holds again.

## 2. The Core Idea

📌 **Interview term: Sliding window** — a technique for problems about **contiguous** subarrays or substrings: keep two indices \`left\` and \`right\` that mark the current range, and update a running summary (a sum, a count, a frequency map) as they move, so each element enters and leaves the window at most once.

📌 **Interview term: Contiguous subarray** — a run of elements that sit next to each other in the array, such as \`[4, 2, 9]\` inside \`[1, 4, 2, 9, 3]\`. A subsequence may skip elements; a subarray may not. Sliding window only works for subarrays and substrings.

It is a special case of the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique): both pointers move in the same direction, and what matters is everything between them.

### Flavour 1: fixed-size window

📌 **Interview term: Fixed-size window** — the window always holds exactly \`k\` elements; each step removes one element from the left and adds one on the right.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 260" role="img" aria-label="Fixed window of size 3 sliding one step on 1 4 2 9 3 5 1, the value at index 0 leaves and the value at index 3 enters">
  <defs>
    <marker id="sw1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="70" y="30" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="40" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="70" y="70" text-anchor="middle">1</text>
  <text class="d-sub" x="146" y="30" text-anchor="middle">1</text>
  <rect class="d-box" x="116" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="146" y="70" text-anchor="middle">4</text>
  <text class="d-sub" x="222" y="30" text-anchor="middle">2</text>
  <rect class="d-box" x="192" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="222" y="70" text-anchor="middle">2</text>
  <text class="d-sub" x="298" y="30" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="268" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="298" y="70" text-anchor="middle">9</text>
  <text class="d-sub" x="374" y="30" text-anchor="middle">4</text>
  <rect class="d-box" x="344" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="374" y="70" text-anchor="middle">3</text>
  <text class="d-sub" x="450" y="30" text-anchor="middle">5</text>
  <rect class="d-box" x="420" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="450" y="70" text-anchor="middle">5</text>
  <text class="d-sub" x="526" y="30" text-anchor="middle">6</text>
  <rect class="d-box" x="496" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="526" y="70" text-anchor="middle">1</text>
  <path class="d-edge" d="M 70 118 L 70 96" marker-end="url(#sw1-arrow)"/>
  <text class="d-text" x="70" y="136" text-anchor="middle">leaves</text>
  <path class="d-edge-accent" d="M 298 118 L 298 96" marker-end="url(#sw1-arrow)"/>
  <text class="d-text d-accent" x="298" y="136" text-anchor="middle">enters</text>
  <rect class="d-box-muted" x="40" y="172" width="220" height="62" rx="10"/>
  <text class="d-text" x="150" y="197" text-anchor="middle">old window 0 to 2</text>
  <text class="d-sub" x="150" y="219" text-anchor="middle">sum 1 + 4 + 2 = 7</text>
  <rect class="d-box-accent" x="300" y="172" width="256" height="62" rx="10"/>
  <text class="d-text" x="428" y="197" text-anchor="middle">new window 1 to 3</text>
  <text class="d-sub" x="428" y="219" text-anchor="middle">sum 7 - 1 + 9 = 15</text>
</svg>

Sliding from window 0..2 to window 1..3, the sum changes from 7 to 15 with one subtraction (the 1 leaving) and one addition (the 9 entering). Over \`[1, 4, 2, 9, 3, 5, 1]\` with \`k = 3\` the window sums are 7, 15, 14, 17 and 9, so the answer is 17.

### Flavour 2: variable-size window

📌 **Interview term: Variable-size window** — the window grows on the right one element at a time and shrinks from the left whenever a rule says so, so its length changes as it moves.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="The variable window loop, expand on the right, shrink from the left while the condition says so, record the best, repeat">
  <defs>
    <marker id="sw2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="180" height="100" rx="10"/>
  <text class="d-text" x="120" y="73" text-anchor="middle">1. Expand</text>
  <text class="d-sub" x="120" y="95" text-anchor="middle">right moves one step</text>
  <text class="d-sub" x="120" y="117" text-anchor="middle">add nums at right</text>
  <path class="d-edge" d="M 214 90 L 266 90" marker-end="url(#sw2-arrow)"/>
  <rect class="d-box-accent" x="270" y="40" width="180" height="100" rx="10"/>
  <text class="d-text" x="360" y="73" text-anchor="middle">2. Shrink</text>
  <text class="d-sub" x="360" y="95" text-anchor="middle">left moves while</text>
  <text class="d-sub" x="360" y="117" text-anchor="middle">the rule says so</text>
  <path class="d-edge" d="M 454 90 L 506 90" marker-end="url(#sw2-arrow)"/>
  <rect class="d-box-muted" x="510" y="40" width="180" height="100" rx="10"/>
  <text class="d-text" x="600" y="73" text-anchor="middle">3. Record</text>
  <text class="d-sub" x="600" y="95" text-anchor="middle">update the best</text>
  <text class="d-sub" x="600" y="117" text-anchor="middle">window length</text>
  <path class="d-edge-dashed" d="M 600 144 L 600 184 L 120 184 L 120 146" marker-end="url(#sw2-arrow)"/>
  <text class="d-sub" x="360" y="214" text-anchor="middle">repeat for the next right</text>
</svg>

Every variable-window solution is this loop. What changes from problem to problem is only the rule in step 2:

- **Shortest valid window** (for example, the shortest subarray with sum at least \`target\`): after expanding, **while the window is valid**, record it and shrink, because a shorter valid window might exist.
- **Longest valid window** (for example, the longest run of 1s if you may flip at most \`k\` zeros): after expanding, **while the window is invalid**, shrink; then record, because the window is valid again.

📌 **Interview term: Amortized O(n)** — the inner \`while\` loop looks like it could make the algorithm O(n²), but \`left\` only moves forward and can move at most n times **in total** across the whole run. So \`right\` moves n times and \`left\` moves at most n times: about 2n steps overall.

### When it works, and when it does not

Shrinking from the left is only correct when the window rule is **monotonic**: making a valid window bigger never makes it less valid (or making an invalid window smaller never makes it less invalid). With positive numbers, adding an element can only increase the sum, so "sum at least target" is monotonic. With **negative numbers** it is not: adding an element can lower the sum, so a window you shrank past might have been the answer. For "subarray with sum exactly k" on arrays with negatives, use the [prefix sum technique](/interview-question/what-is-the-prefix-sum-technique) with a hash map instead.

Problems that are classic sliding windows: [longest substring without repeating characters](/interview-question/how-do-you-find-the-longest-substring-without-repeating-characters), [minimum window substring](/interview-question/how-do-you-find-the-minimum-window-substring) (with its [need/have counters](/interview-question/minimum-window-substring-how-does-the-sliding-window-with-need-have-counters-wor)), and [sliding window median](/interview-question/sliding-window-median-how-do-you-maintain-median-with-two-heaps-as-the-window-sl). [Maximum subarray sum](/interview-question/how-do-you-find-the-maximum-subarray-sum) looks similar but is solved by Kadane, because negative numbers break the window rule.

## 3. Brute Force First, Then the Fixed Window in C++

Brute force for "largest sum of k consecutive values": for each of the n - k + 1 starting positions, add up k values. That is O(n·k), which becomes O(n²) when k grows with n. The sliding version builds the first sum once and then pays two operations per step. The running sum is a \`long long\`. In C++, signed integer overflow is undefined behaviour ([cppreference: arithmetic operators, overflows](https://en.cppreference.com/w/cpp/language/operator_arithmetic)), so the compiler is allowed to assume it never happens; widening the type is the only safe fix. The loop index is \`size_t\`, and \`i - k\` is safe because \`i >= k\` inside the loop.

~~~cpp
// Largest sum of any k consecutive values (assumes 1 <= k <= arr.size()).
// long long, not int: signed int overflow is undefined behaviour in C++.
long long maxWindowSum(const vector<int>& arr, size_t k) {
    long long window = 0;
    for (size_t i = 0; i < k; i++) window += arr[i];  // first window, built once
    long long best = window;
    for (size_t i = k; i < arr.size(); i++) {
        window += arr[i] - static_cast<long long>(arr[i - k]);  // add entering, drop leaving
        best = max(best, window);
    }
    return best;
}
~~~

## 4. The Variable Window in C++

Both variable-window shapes in C++. The indices are \`int\` (cast from \`nums.size()\` once), so \`right - left + 1\` is ordinary signed arithmetic.

~~~cpp
// Length of the shortest contiguous run with sum >= target (positive nums), else 0.
int minSubarrayLen(int target, const vector<int>& nums) {
    int best = INT_MAX;
    long long window = 0;
    int left = 0;
    for (int right = 0; right < static_cast<int>(nums.size()); right++) {
        window += nums[right];              // expand: take nums[right] in
        while (window >= target) {          // valid: record it, then try to shrink
            best = min(best, right - left + 1);
            window -= nums[left];
            left++;
        }
    }
    return best == INT_MAX ? 0 : best;
}

// Longest run of 1s if you may flip at most k zeros to 1.
int longestOnes(const vector<int>& nums, int k) {
    int zeros = 0, left = 0, best = 0;
    for (int right = 0; right < static_cast<int>(nums.size()); right++) {
        if (nums[right] == 0) zeros++;
        while (zeros > k) {                 // invalid: shrink until it holds again
            if (nums[left] == 0) zeros--;
            left++;
        }
        best = max(best, right - left + 1);
    }
    return best;
}
~~~

**Trace of the shortest window** on \`target = 7\`, \`nums = [2, 3, 1, 2, 4, 3]\`: the window grows to \`[2, 3, 1, 2]\` (sum 8, valid, length 4), shrinks to \`[3, 1, 2]\` (6, invalid), grows to \`[3, 1, 2, 4]\` (10), shrinks through \`[1, 2, 4]\` (7, length 3) to \`[2, 4]\` (6), grows to \`[2, 4, 3]\` (9, length 3), and shrinks to \`[4, 3]\` (7, length 2). The answer is 2.

📌 **Interview term: Frequency map** — a map from item to how many times it is in the window, updated by +1 when an item enters and -1 when it leaves. It is the summary for most string windows (anagrams, distinct characters, minimum window substring).

For character windows, \`std::array<int, 128> counts{}\` indexed by \`static_cast<unsigned char>(c)\` is the fastest option; \`std::unordered_map<char, int>\` works for any key, and \`counts[c]++\` on a missing key starts from 0. \`std::deque<int>\` is the deque for the window-maximum follow-up.

## 5. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — fixed window, plus an operation count** prints:

~~~text
17
-6
4
12
n=10000, k=100: recompute 990100 additions, sliding 19900
~~~

**Example 2 — variable windows** prints:

~~~text
2
1
0
5
6
10
0
~~~

**What the numbers show:** for n = 10,000 and k = 100, recomputing every window costs 990,100 additions, the sliding window costs 19,900 (the first 100, then one add and one subtract for each of the 9,900 slides). That is about 50 times less work, and the gap grows with k.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Recompute every fixed window | O(n·k) | O(1) | n - k + 1 windows, k additions each |
| Fixed sliding window | O(n) | O(1) | k to start, then 2 operations per slide |
| Check every subarray (variable) | O(n²) | O(1) | n(n+1)/2 subarrays, with a running sum per start |
| Variable sliding window | O(n) | O(1), or O(alphabet) with a frequency map | \`right\` and \`left\` each move at most n times |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **k equals the array length:** one window, the whole array (\`[3, 3, 3, 3]\` with k = 4 gives 12).
- **k = 1:** the answer is the largest single element.
- **All negative values (fixed window):** still correct, because a fixed window never shrinks by a rule; \`[-5, -1, -8, -2]\` with k = 2 gives -6.
- **No valid window (variable):** return the agreed sentinel; \`minSubarrayLen(11, [1, 1, 1, 1, 1, 1, 1, 1])\` returns 0.
- **k = 0 in the flip problem:** the window can only hold 1s; \`[0, 0, 0]\` gives 0.
- **k larger than the array, or empty input:** no full window exists; agree on the result before coding.

## Common Pitfalls

- **\`int\` overflow in the running sum.** It is undefined behaviour, not just a wrong value; use \`long long\`.
- **Shrinking with negative numbers.** The variable window assumes adding an element never lowers the sum; with negatives, use prefix sums and an \`unordered_map\`.
- **Off-by-one window length.** The length of \`[left, right]\` is \`right - left + 1\`.
- **\`k > nums.size()\`.** \`nums[i]\` does no bounds checking, so the first loop reads garbage instead of failing; validate \`k\` first (or use \`.at(i)\` while debugging).
- **Indexing counts with a plain \`char\`.** \`counts[c]\` with a negative \`char\` (non-ASCII bytes on platforms where \`char\` is signed) indexes before the array; cast to \`unsigned char\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Keep a window <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[left, right]</code> over a contiguous range and update a running summary as it moves, instead of recomputing it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Fixed window:</strong> <span style="color:#f0e2c8;">Sum the first k once into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">window += arr[i] - arr[i - k]</code>: one add and one subtract per step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Variable window:</strong> <span style="color:#f0e2c8;">Expand <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> every step; shrink <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> while valid (shortest) or while invalid (longest); record the best <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right - left + 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why O(n):</strong> <span style="color:#f0e2c8;">Each pointer only moves forward, at most n times in total, so the inner <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code> is amortized O(1) per step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The catch:</strong> <span style="color:#f0e2c8;">The rule must be monotonic: with negative numbers, use prefix sums with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> instead.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the nested <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while</code> not O(n²)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> never moves back, so across the whole run it moves at most n times. Total work is about 2n pointer moves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long long</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Signed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> overflow is undefined behaviour in C++, so the result is not even guaranteed to be a wrapped value. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> has room for large window sums.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the maximum of every window of size k?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::deque&lt;int&gt;</code> of indices with decreasing values: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_back</code> while smaller, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_front</code> when the front leaves the window. O(n) total.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::array&lt;int, 128&gt;</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_map</code> for counts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For byte-sized characters the array avoids hashing and allocation; index it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unsigned char</code>. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> for large or unknown key sets.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the array has negative numbers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Shrinking is no longer safe. For sum exactly k, use a running prefix sum with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map&lt;long long, int&gt;</code> of counts: O(n).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Sliding window** | a moving contiguous range with a running summary updated incrementally |
| **Contiguous subarray** | a run of adjacent elements; no skipping |
| **Fixed-size window** | always k elements; one leaves and one enters per step |
| **Variable-size window** | grows on the right, shrinks on the left by a rule |
| **Amortized O(n)** | the inner loop is cheap on average because \`left\` moves at most n times in total |
| **Frequency map** | item to count, +1 on enter and -1 on leave |
| **Undefined behaviour** | code the C++ standard gives no meaning to, such as signed overflow; anything may happen |

---
**Conclusion:** A sliding window turns "look at every contiguous range" into one forward pass: keep \`left\` and \`right\`, keep a running summary, and update it as elements enter and leave. Fixed windows subtract one and add one per step; variable windows expand every step and shrink by a rule that must be monotonic, which is why positive-only sums work and sums with negatives need prefix sums. In C++, the remaining marks come from the details shown above: the \`right - left + 1\` length, the right sentinel for "no window", and the language traps around sums and counts.`,
        examples: [
          { label: `Fixed window: largest sum of k consecutive values, and the work it saves`, code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

// Largest sum of any k consecutive values (assumes 1 <= k <= arr.size()).
// long long, not int: signed int overflow is undefined behaviour in C++.
long long maxWindowSum(const vector<int>& arr, size_t k) {
    long long window = 0;
    for (size_t i = 0; i < k; i++) window += arr[i];  // first window, built once
    long long best = window;
    for (size_t i = k; i < arr.size(); i++) {
        window += arr[i] - static_cast<long long>(arr[i - k]);  // add entering, drop leaving
        best = max(best, window);
    }
    return best;
}

long long recomputeAdditions(long long n, long long k) { return (n - k + 1) * k; }
long long slidingAdditions(long long n, long long k) { return k + 2 * (n - k); }

int main() {
    cout << maxWindowSum({1, 4, 2, 9, 3, 5, 1}, 3) << "\\n";  // 17
    cout << maxWindowSum({-5, -1, -8, -2}, 2) << "\\n";      // -6
    cout << maxWindowSum({4}, 1) << "\\n";                   // 4
    cout << maxWindowSum({3, 3, 3, 3}, 4) << "\\n";          // 12
    cout << "n=10000, k=100: recompute " << recomputeAdditions(10000, 100)
         << " additions, sliding " << slidingAdditions(10000, 100) << "\\n";
}` },
          { label: `Variable windows: shortest subarray with sum at least target, longest ones with k flips`, code: `#include <algorithm>
#include <climits>
#include <iostream>
#include <vector>
using namespace std;

// Length of the shortest contiguous run with sum >= target (positive nums), else 0.
int minSubarrayLen(int target, const vector<int>& nums) {
    int best = INT_MAX;
    long long window = 0;
    int left = 0;
    for (int right = 0; right < static_cast<int>(nums.size()); right++) {
        window += nums[right];              // expand: take nums[right] in
        while (window >= target) {          // valid: record it, then try to shrink
            best = min(best, right - left + 1);
            window -= nums[left];
            left++;
        }
    }
    return best == INT_MAX ? 0 : best;
}

// Longest run of 1s if you may flip at most k zeros to 1.
int longestOnes(const vector<int>& nums, int k) {
    int zeros = 0, left = 0, best = 0;
    for (int right = 0; right < static_cast<int>(nums.size()); right++) {
        if (nums[right] == 0) zeros++;
        while (zeros > k) {                 // invalid: shrink until it holds again
            if (nums[left] == 0) zeros--;
            left++;
        }
        best = max(best, right - left + 1);
    }
    return best;
}

int main() {
    cout << minSubarrayLen(7, {2, 3, 1, 2, 4, 3}) << "\\n";         // 2
    cout << minSubarrayLen(4, {1, 4, 4}) << "\\n";                  // 1
    cout << minSubarrayLen(11, {1, 1, 1, 1, 1, 1, 1, 1}) << "\\n";  // 0
    cout << minSubarrayLen(15, {1, 2, 3, 4, 5}) << "\\n";           // 5
    cout << longestOnes({1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0}, 2) << "\\n";  // 6
    cout << longestOnes({0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1}, 3) << "\\n";  // 10
    cout << longestOnes({0, 0, 0}, 0) << "\\n";                     // 0
}` },
        ],
      },
    },
  },
  {
    title: `How do you check if a string is a valid palindrome?`,
    difficulty: "easy",
    seoDescription: `Valid palindrome in Python, JavaScript, Java and C++: two pointers that skip non-alphanumerics and ignore case, O(1) space, plus the one-deletion variant.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a string, tell me whether it is a palindrome if you only look at letters and digits and ignore case. For example, "A man, a plan, a canal: Panama" should be true. Please write it in Python."

**What a strong answer should cover:**
- Converging two pointers that skip non-alphanumeric characters and compare case-insensitively; stop at the first mismatch.
- The inner skip loops also check \`left < right\`, so a string of only punctuation does not run out of bounds.
- O(n) time and O(1) extra space, versus O(n) extra space for the clean-and-reverse one-liner.
- Edge cases: empty string, only punctuation, single character, digits versus letters ("0P" is false).
- Python specifics: \`str.isalnum()\` and \`str.lower()\` are Unicode-aware; \`s[::-1]\` builds a full copy; \`casefold()\` is the stricter case-insensitive comparison.

**Clarifying questions expected:**
- "Only letters and digits, and is it case-insensitive?"
- "ASCII or full Unicode? And is an empty string a palindrome?"

**Code / implementation expected:** Yes — \`is_palindrome(s)\` with two indices in Python; the one-line cleaned version is a good warm-up to mention.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A sign painter is asked to paint "Was it a car or a cat I saw?" on a wall that people will read from both sides through a glass door. The client asks: does it read the same backwards? The painter does not care about the capital W, the spaces or the question mark; only the letters matter. So she puts one finger on the first letter, one on the last, and walks them towards each other, skipping anything that is not a letter, comparing as she goes. The first time two letters differ, she can stop: it is not a palindrome. If her fingers meet, it is.

That is exactly the interview question. A **palindrome** reads the same forwards and backwards. The "valid palindrome" version adds the real-world rule: **ignore case and ignore everything that is not a letter or a digit**. The skill being tested is the converging two-pointer pattern plus careful handling of the characters you skip.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which characters count: only letters and digits? | The classic version ignores spaces, punctuation and underscores; a strict version compares every character. |
| Is the comparison case-insensitive? | "Aa" is a palindrome only if case is ignored. |
| ASCII only, or any Unicode text? | Decides which "is alphanumeric" test and which lowercasing you use, and how characters are stored. |
| Is the empty string (or a string of only punctuation) a palindrome? | The usual answer is yes: nothing left to compare means nothing differs. |
| May I build a cleaned copy, or must it be O(1) extra space? | The copy-and-reverse version is simpler; the two-pointer version uses no extra memory. |
| Is deleting one character allowed? | That is the follow-up "valid palindrome II", with a different algorithm. |

## 3. The Core Idea

📌 **Interview term: Palindrome** — a sequence that reads the same forwards and backwards: position \`i\` equals position \`n - 1 - i\` for every \`i\`.

📌 **Interview term: Alphanumeric** — a character that is a letter or a digit. Spaces, commas, colons, question marks and underscores are not.

There are two standard solutions.

**Approach 1, clean and reverse.** Build a new string containing only the lowercase alphanumeric characters, then compare it with its reverse. Easy to get right, O(n) time, but O(n) extra memory for the copy (and another O(n) for the reversed copy).

**Approach 2, converging two pointers.** Put \`left\` at index 0 and \`right\` at the last index. Move \`left\` forward past anything that is not alphanumeric, move \`right\` backward the same way, compare the two characters case-insensitively, and step both inward. Same O(n) time, but O(1) extra memory: nothing is copied. This is the general [two-pointer technique](/interview-question/what-is-the-two-pointer-technique) in its converging shape.

<svg class="iq-diagram" width="100%" viewBox="0 0 630 270" role="img" aria-label="Two pointers on the string Race comma space car, left starts on R and right on r, the comma and the space are skipped">
  <defs>
    <marker id="vp1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="56" y="30" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="30" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="56" y="70" text-anchor="middle">R</text>
  <text class="d-sub" x="120" y="30" text-anchor="middle">1</text>
  <rect class="d-box" x="94" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="120" y="70" text-anchor="middle">a</text>
  <text class="d-sub" x="184" y="30" text-anchor="middle">2</text>
  <rect class="d-box" x="158" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="184" y="70" text-anchor="middle">c</text>
  <text class="d-sub" x="248" y="30" text-anchor="middle">3</text>
  <rect class="d-box" x="222" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="248" y="70" text-anchor="middle">e</text>
  <text class="d-sub" x="312" y="30" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="286" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="312" y="70" text-anchor="middle">,</text>
  <text class="d-sub" x="376" y="30" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="350" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="376" y="70" text-anchor="middle">·</text>
  <text class="d-sub" x="440" y="30" text-anchor="middle">6</text>
  <rect class="d-box" x="414" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="440" y="70" text-anchor="middle">c</text>
  <text class="d-sub" x="504" y="30" text-anchor="middle">7</text>
  <rect class="d-box" x="478" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="504" y="70" text-anchor="middle">a</text>
  <text class="d-sub" x="568" y="30" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="542" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="568" y="70" text-anchor="middle">r</text>
  <path class="d-edge-accent" d="M 56 118 L 56 96" marker-end="url(#vp1-arrow)"/>
  <text class="d-text d-accent" x="56" y="136" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 568 118 L 568 96" marker-end="url(#vp1-arrow)"/>
  <text class="d-text d-accent" x="568" y="136" text-anchor="middle">right</text>
  <rect class="d-box-accent" x="30" y="176" width="260" height="70" rx="10"/>
  <text class="d-text" x="160" y="205" text-anchor="middle">compare lowercase</text>
  <text class="d-sub" x="160" y="227" text-anchor="middle">r equals r, move both</text>
  <rect class="d-box-muted" x="334" y="176" width="260" height="70" rx="10"/>
  <text class="d-text" x="464" y="205" text-anchor="middle">comma and space</text>
  <text class="d-sub" x="464" y="227" text-anchor="middle">not alphanumeric: skip</text>
</svg>

In the picture the first comparison is R against r (equal after lowercasing). Later, when \`left\` reaches the comma at index 4 it skips it and the space at index 5, landing on c at index 6, where it meets \`right\`, and the loop ends: "Race, car" is a palindrome.

📌 **Interview term: Case-insensitive comparison** — comparing two characters after converting both to the same case, so "A" and "a" count as equal.

Two details make or break the code:

- The skipping loops need their own \`left < right\` check. Without it, a string of only punctuation such as \`".,"\` lets \`left\` run past \`right\` (or past the end).
- The outer loop is \`while left < right\`. When the pointers meet on the middle character of an odd-length string, that character matches itself and needs no check.

### The follow-up: allow one deletion

📌 **Interview term: Valid palindrome II** — the variant that asks whether the string can become a palindrome by deleting **at most one** character.

Run the same converging pointers. At the **first** mismatch you have exactly two choices: delete the left character or delete the right one. Check whether either remaining range \`[left + 1, right]\` or \`[left, right - 1]\` is a plain palindrome. If neither is, one deletion is not enough. Each check is O(n) and happens at most twice, so the whole thing stays O(n).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 280" role="img" aria-label="Valid palindrome with one deletion on abca, the mismatch b versus c splits into two checks, skip left or skip right">
  <defs>
    <marker id="vp2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="190" y="30" width="260" height="70" rx="10"/>
  <text class="d-text" x="320" y="59" text-anchor="middle">mismatch at 1 and 2</text>
  <text class="d-sub" x="320" y="81" text-anchor="middle">b versus c</text>
  <path class="d-edge" d="M 260 104 L 180 168" marker-end="url(#vp2-arrow)"/>
  <path class="d-edge" d="M 380 104 L 460 168" marker-end="url(#vp2-arrow)"/>
  <rect class="d-box-muted" x="30" y="172" width="260" height="80" rx="10"/>
  <text class="d-text" x="160" y="195" text-anchor="middle">skip left</text>
  <text class="d-sub" x="160" y="217" text-anchor="middle">check index 2 to 2</text>
  <text class="d-sub" x="160" y="239" text-anchor="middle">c is a palindrome</text>
  <rect class="d-box-muted" x="350" y="172" width="260" height="80" rx="10"/>
  <text class="d-text" x="480" y="195" text-anchor="middle">skip right</text>
  <text class="d-sub" x="480" y="217" text-anchor="middle">check index 1 to 1</text>
  <text class="d-sub" x="480" y="239" text-anchor="middle">b is a palindrome</text>
</svg>

For "abca" the first mismatch is b (index 1) against c (index 2). Skipping the left side leaves the range 2 to 2 ("c"), which is a palindrome, so the answer is true.

Related questions that use the same idea: [longest palindromic substring](/interview-question/how-do-you-find-the-longest-palindromic-substring) (expand from the centre instead of shrinking from the ends) and [palindrome linked list](/interview-question/how-do-you-check-if-a-linked-list-is-a-palindrome) (no random access, so it uses [fast and slow pointers](/interview-question/what-is-the-fast-and-slow-pointer-technique) and reverses half the list).

## 4. The Two-Pointer Solution in Python

Python strings are immutable sequences, so \`s[i]\` is O(1) and the two pointers never copy anything. \`ch.isalnum()\` is true for letters and digits; \`ch.lower()\` lowercases one character.

~~~python
def is_palindrome(s):
    """True if s reads the same both ways, looking only at letters and digits, ignoring case."""
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1                      # skip spaces, punctuation, underscores
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True
~~~

**Why each line is there:**

- \`while left < right and not s[left].isalnum()\` — the \`left < right\` part is what keeps \`"., "\` safe; the loop stops instead of running past the end.
- After skipping, \`s[left]\` and \`s[right]\` are both alphanumeric (or the pointers have met), so comparing \`lower()\` versus \`lower()\` is the whole test.
- The function returns \`False\` at the first mismatch; there is no need to look at the rest.

**Unicode in Python.** \`str.isalnum()\` follows Unicode, not just ASCII: in a test run \`'é'.isalnum()\` and the Arabic-Indic digit \`'٣'.isalnum()\` were both \`True\`, and \`'_'.isalnum()\` was \`False\`. If the interviewer wants ASCII only, test \`ch.isascii() and ch.isalnum()\`. For case, \`lower()\` is fine for ASCII, but \`casefold()\` is the stricter tool: \`'Straße'.casefold() == 'STRASSE'.casefold()\` printed \`True\` while the same comparison with \`lower()\` printed \`False\`.

### The one-liner, and what it costs

The Pythonic warm-up, which is also what \`clean_reverse\` does in Example 2:

~~~python
cleaned = "".join(ch.lower() for ch in s if ch.isalnum())
return cleaned == cleaned[::-1]
~~~

**Cost:** it is correct and readable, but it allocates the cleaned string and then a reversed copy (\`[::-1]\` always builds a new string): O(n) extra space.

### One deletion allowed

~~~python
def is_range_palindrome(s, left, right):
    while left < right:
        if s[left] != s[right]:
            return False
        left += 1
        right -= 1
    return True

def valid_palindrome_ii(s):
    """True if s is a palindrome after deleting at most one character."""
    left, right = 0, len(s) - 1
    while left < right:
        if s[left] != s[right]:
            # one mismatch allowed: try skipping either side, once
            return is_range_palindrome(s, left + 1, right) or is_range_palindrome(s, left, right - 1)
        left += 1
        right -= 1
    return True
~~~

**Why compare raw characters here:** the classic "valid palindrome II" problem uses lowercase letters only, so there is nothing to skip. If the input could contain punctuation, clean it first or add the same skip loops.

## 5. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — the main solution on tricky inputs** prints:

~~~text
[A man, a plan, a canal: Panama] => true
[race a car] => false
[] => true
[ ] => true
[0P] => false
[Was it a car or a cat I saw?] => true
[ab_a] => true
~~~

**Example 2 — one deletion allowed, and the clean-and-reverse check** prints:

~~~text
[aba] => true
[abca] => true
[abc] => false
[deeee] => true
[eccer] => true
[abcdba] => true
[abcdea] => false
clean and reverse: true
~~~

**Reading the output:** \`[ ]\` (a single space) and \`[]\` (empty) are both palindromes because nothing alphanumeric is left to compare; \`[0P]\` is not, because the digit 0 counts; \`[ab_a]\` is, because the underscore is skipped. In the second block, \`[abcdba]\` is true (delete c or d) while \`[abcdea]\` needs two deletions.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Clean, reverse, compare | O(n) | O(n) | the cleaned copy (and the reversed copy) |
| Converging two pointers | O(n) | O(1) | each index moves only inward, every character is visited once |
| One deletion allowed | O(n) | O(1) | one scan to the first mismatch, then at most two range checks |
| Try deleting every index | O(n²) | O(1) or O(n) | n deletions, each followed by an O(n) check |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Empty string:** a palindrome (nothing differs).
- **Only punctuation or spaces** (\`" "\`, \`".,"\`): a palindrome; this is the case that breaks a skip loop without its own bounds check.
- **One character:** a palindrome.
- **Mixed digits and letters** (\`"0P"\`): not a palindrome; digits are compared, not skipped.
- **Underscores** (\`"ab_a"\`): skipped as non-alphanumeric, so it is a palindrome.
- **Non-ASCII letters:** the answer depends on the language helpers above; agree on ASCII versus Unicode before coding.

## Common Pitfalls

- **Skipping without the bounds check.** \`while not s[left].isalnum(): left += 1\` raises \`IndexError\` on \`"..."\`. Always pair it with \`left < right\`.
- **Forgetting digits.** Using \`isalpha()\` instead of \`isalnum()\` makes \`"0P"\` look like \`"P"\` and returns \`True\`; the expected answer is \`False\`.
- **Lowercasing the whole string first.** \`s = s.lower()\` is O(n) extra memory; harmless in practice, but it undoes the point of the O(1)-space version if the interviewer asked for it.
- **Assuming ASCII.** \`isalnum()\` accepts accented letters and non-Latin digits. That is usually what you want, but say it out loud.
- **Using \`reversed(s) == s\`.** \`reversed()\` returns an iterator, never equal to a string; compare \`s == s[::-1]\` or \`"".join(reversed(s)) == s\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The approach:</strong> <span style="color:#f0e2c8;">Converging two pointers: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> from the start, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> from the end, skip anything where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isalnum()</code> is false, compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower()</code> versus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Stop early:</strong> <span style="color:#f0e2c8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code> at the first mismatch; if the pointers meet, it is a palindrome.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The guard:</strong> <span style="color:#f0e2c8;">Every skip loop also checks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left &lt; right</code>, so a string of only punctuation is handled and returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) extra space; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cleaned == cleaned[::-1]</code> version is O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isalnum()</code> is Unicode-aware; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">casefold()</code> for strict case-insensitive matching across languages.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if one deletion is allowed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At the first mismatch, return whether <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[left+1:right+1]</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[left:right]</code> is a palindrome, checked with index pointers rather than slices to stay O(1) space. Still O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">s == s[::-1]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It does not skip punctuation or ignore case, and the reversed copy costs O(n) memory. Clean first, or use pointers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"0P"</code> return and why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code>: both characters are alphanumeric and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"0"</code> does not equal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"p"</code>. Using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isalpha()</code> would wrongly skip the digit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">""</code> a palindrome?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes by the usual definition: there is nothing to compare, so nothing differs. The loop never runs and the function returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle full Unicode correctly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">casefold()</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower()</code>, and consider normalising with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unicodedata.normalize</code>, because an accented letter can be stored as one or two code points.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Palindrome** | reads the same forwards and backwards |
| **Alphanumeric** | a letter or a digit |
| **Case-insensitive comparison** | compare after converting both characters to one case |
| **Valid palindrome II** | palindrome after deleting at most one character |
| **casefold()** | Python lowercasing meant for case-insensitive comparison; folds ß to ss |

---
**Conclusion:** A valid palindrome check is the converging two-pointer pattern with one twist: skip every character that is not a letter or digit, and compare the rest case-insensitively. It is O(n) time and O(1) extra space, while the clean-and-reverse version trades O(n) memory for simplicity. The one-deletion follow-up keeps the same scan and tries both deletions at the first mismatch. In Python, the marks are in the details: the bounds check inside each skip loop, digits counting as characters, and knowing exactly what the language helpers treat as a letter.`,
        examples: [
          { label: `Two-pointer palindrome check on tricky inputs`, code: `def is_palindrome(s):
    """True if s reads the same both ways, looking only at letters and digits, ignoring case."""
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1                      # skip spaces, punctuation, underscores
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True


def show(s):
    return "[" + s + "] => " + str(is_palindrome(s)).lower()


print(show("A man, a plan, a canal: Panama"))  # [A man, a plan, a canal: Panama] => true
print(show("race a car"))  # [race a car] => false
print(show(""))  # [] => true
print(show(" "))  # [ ] => true
print(show("0P"))  # [0P] => false
print(show("Was it a car or a cat I saw?"))  # [Was it a car or a cat I saw?] => true
print(show("ab_a"))  # [ab_a] => true` },
          { label: `Valid palindrome II (one deletion) and the clean-and-reverse version`, code: `def is_range_palindrome(s, left, right):
    while left < right:
        if s[left] != s[right]:
            return False
        left += 1
        right -= 1
    return True


def valid_palindrome_ii(s):
    """True if s is a palindrome after deleting at most one character."""
    left, right = 0, len(s) - 1
    while left < right:
        if s[left] != s[right]:
            # one mismatch allowed: try skipping either side, once
            return is_range_palindrome(s, left + 1, right) or is_range_palindrome(s, left, right - 1)
        left += 1
        right -= 1
    return True


def clean_reverse(s):
    """The O(n)-extra-space version: build the cleaned string, compare with its reverse."""
    cleaned = "".join(ch.lower() for ch in s if ch.isalnum())
    return cleaned == cleaned[::-1]


def show(s):
    return "[" + s + "] => " + str(valid_palindrome_ii(s)).lower()


print(show("aba"))  # [aba] => true
print(show("abca"))  # [abca] => true
print(show("abc"))  # [abc] => false
print(show("deeee"))  # [deeee] => true
print(show("eccer"))  # [eccer] => true
print(show("abcdba"))  # [abcdba] => true
print(show("abcdea"))  # [abcdea] => false
print("clean and reverse: " + str(clean_reverse("No lemon, no melon")).lower())  # clean and reverse: true` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given a string, tell me whether it is a palindrome if you only look at letters and digits and ignore case. For example, "A man, a plan, a canal: Panama" should be true. Please write it in JavaScript."

**What a strong answer should cover:**
- Converging two pointers that skip non-alphanumeric characters and compare case-insensitively; stop at the first mismatch.
- The inner skip loops also check \`left < right\`, so a string of only punctuation does not run out of bounds.
- O(n) time and O(1) extra space, versus O(n) extra space for clean, \`split\`, \`reverse\`, \`join\`.
- Edge cases: empty string, only punctuation, single character, digits versus letters ("0P" is false).
- JavaScript specifics: there is no built-in \`isAlnum\`, so use a regex such as \`/[a-z0-9]/i\` (ASCII) or \`/[\\p{L}\\p{N}]/u\` (Unicode); strings are UTF-16, so \`split('')\` breaks emoji apart.

**Clarifying questions expected:**
- "Only letters and digits, and is it case-insensitive?"
- "ASCII or full Unicode? And is an empty string a palindrome?"

**Code / implementation expected:** Yes — \`isPalindrome(s)\` with two indices in JavaScript; the regex-and-reverse one-liner is a good warm-up to mention.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A sign painter is asked to paint "Was it a car or a cat I saw?" on a wall that people will read from both sides through a glass door. The client asks: does it read the same backwards? The painter does not care about the capital W, the spaces or the question mark; only the letters matter. So she puts one finger on the first letter, one on the last, and walks them towards each other, skipping anything that is not a letter, comparing as she goes. The first time two letters differ, she can stop: it is not a palindrome. If her fingers meet, it is.

That is exactly the interview question. A **palindrome** reads the same forwards and backwards. The "valid palindrome" version adds the real-world rule: **ignore case and ignore everything that is not a letter or a digit**. The skill being tested is the converging two-pointer pattern plus careful handling of the characters you skip.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which characters count: only letters and digits? | The classic version ignores spaces, punctuation and underscores; a strict version compares every character. |
| Is the comparison case-insensitive? | "Aa" is a palindrome only if case is ignored. |
| ASCII only, or any Unicode text? | Decides which "is alphanumeric" test and which lowercasing you use, and how characters are stored. |
| Is the empty string (or a string of only punctuation) a palindrome? | The usual answer is yes: nothing left to compare means nothing differs. |
| May I build a cleaned copy, or must it be O(1) extra space? | The copy-and-reverse version is simpler; the two-pointer version uses no extra memory. |
| Is deleting one character allowed? | That is the follow-up "valid palindrome II", with a different algorithm. |

## 3. The Core Idea

📌 **Interview term: Palindrome** — a sequence that reads the same forwards and backwards: position \`i\` equals position \`n - 1 - i\` for every \`i\`.

📌 **Interview term: Alphanumeric** — a character that is a letter or a digit. Spaces, commas, colons, question marks and underscores are not.

There are two standard solutions.

**Approach 1, clean and reverse.** Build a new string containing only the lowercase alphanumeric characters, then compare it with its reverse. Easy to get right, O(n) time, but O(n) extra memory for the copy (and another O(n) for the reversed copy).

**Approach 2, converging two pointers.** Put \`left\` at index 0 and \`right\` at the last index. Move \`left\` forward past anything that is not alphanumeric, move \`right\` backward the same way, compare the two characters case-insensitively, and step both inward. Same O(n) time, but O(1) extra memory: nothing is copied. This is the general [two-pointer technique](/interview-question/what-is-the-two-pointer-technique) in its converging shape.

<svg class="iq-diagram" width="100%" viewBox="0 0 630 270" role="img" aria-label="Two pointers on the string Race comma space car, left starts on R and right on r, the comma and the space are skipped">
  <defs>
    <marker id="vp1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="56" y="30" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="30" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="56" y="70" text-anchor="middle">R</text>
  <text class="d-sub" x="120" y="30" text-anchor="middle">1</text>
  <rect class="d-box" x="94" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="120" y="70" text-anchor="middle">a</text>
  <text class="d-sub" x="184" y="30" text-anchor="middle">2</text>
  <rect class="d-box" x="158" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="184" y="70" text-anchor="middle">c</text>
  <text class="d-sub" x="248" y="30" text-anchor="middle">3</text>
  <rect class="d-box" x="222" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="248" y="70" text-anchor="middle">e</text>
  <text class="d-sub" x="312" y="30" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="286" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="312" y="70" text-anchor="middle">,</text>
  <text class="d-sub" x="376" y="30" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="350" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="376" y="70" text-anchor="middle">·</text>
  <text class="d-sub" x="440" y="30" text-anchor="middle">6</text>
  <rect class="d-box" x="414" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="440" y="70" text-anchor="middle">c</text>
  <text class="d-sub" x="504" y="30" text-anchor="middle">7</text>
  <rect class="d-box" x="478" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="504" y="70" text-anchor="middle">a</text>
  <text class="d-sub" x="568" y="30" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="542" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="568" y="70" text-anchor="middle">r</text>
  <path class="d-edge-accent" d="M 56 118 L 56 96" marker-end="url(#vp1-arrow)"/>
  <text class="d-text d-accent" x="56" y="136" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 568 118 L 568 96" marker-end="url(#vp1-arrow)"/>
  <text class="d-text d-accent" x="568" y="136" text-anchor="middle">right</text>
  <rect class="d-box-accent" x="30" y="176" width="260" height="70" rx="10"/>
  <text class="d-text" x="160" y="205" text-anchor="middle">compare lowercase</text>
  <text class="d-sub" x="160" y="227" text-anchor="middle">r equals r, move both</text>
  <rect class="d-box-muted" x="334" y="176" width="260" height="70" rx="10"/>
  <text class="d-text" x="464" y="205" text-anchor="middle">comma and space</text>
  <text class="d-sub" x="464" y="227" text-anchor="middle">not alphanumeric: skip</text>
</svg>

In the picture the first comparison is R against r (equal after lowercasing). Later, when \`left\` reaches the comma at index 4 it skips it and the space at index 5, landing on c at index 6, where it meets \`right\`, and the loop ends: "Race, car" is a palindrome.

📌 **Interview term: Case-insensitive comparison** — comparing two characters after converting both to the same case, so "A" and "a" count as equal.

Two details make or break the code:

- The skipping loops need their own \`left < right\` check. Without it, a string of only punctuation such as \`".,"\` lets \`left\` run past \`right\` (or past the end).
- The outer loop is \`while left < right\`. When the pointers meet on the middle character of an odd-length string, that character matches itself and needs no check.

### The follow-up: allow one deletion

📌 **Interview term: Valid palindrome II** — the variant that asks whether the string can become a palindrome by deleting **at most one** character.

Run the same converging pointers. At the **first** mismatch you have exactly two choices: delete the left character or delete the right one. Check whether either remaining range \`[left + 1, right]\` or \`[left, right - 1]\` is a plain palindrome. If neither is, one deletion is not enough. Each check is O(n) and happens at most twice, so the whole thing stays O(n).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 280" role="img" aria-label="Valid palindrome with one deletion on abca, the mismatch b versus c splits into two checks, skip left or skip right">
  <defs>
    <marker id="vp2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="190" y="30" width="260" height="70" rx="10"/>
  <text class="d-text" x="320" y="59" text-anchor="middle">mismatch at 1 and 2</text>
  <text class="d-sub" x="320" y="81" text-anchor="middle">b versus c</text>
  <path class="d-edge" d="M 260 104 L 180 168" marker-end="url(#vp2-arrow)"/>
  <path class="d-edge" d="M 380 104 L 460 168" marker-end="url(#vp2-arrow)"/>
  <rect class="d-box-muted" x="30" y="172" width="260" height="80" rx="10"/>
  <text class="d-text" x="160" y="195" text-anchor="middle">skip left</text>
  <text class="d-sub" x="160" y="217" text-anchor="middle">check index 2 to 2</text>
  <text class="d-sub" x="160" y="239" text-anchor="middle">c is a palindrome</text>
  <rect class="d-box-muted" x="350" y="172" width="260" height="80" rx="10"/>
  <text class="d-text" x="480" y="195" text-anchor="middle">skip right</text>
  <text class="d-sub" x="480" y="217" text-anchor="middle">check index 1 to 1</text>
  <text class="d-sub" x="480" y="239" text-anchor="middle">b is a palindrome</text>
</svg>

For "abca" the first mismatch is b (index 1) against c (index 2). Skipping the left side leaves the range 2 to 2 ("c"), which is a palindrome, so the answer is true.

Related questions that use the same idea: [longest palindromic substring](/interview-question/how-do-you-find-the-longest-palindromic-substring) (expand from the centre instead of shrinking from the ends) and [palindrome linked list](/interview-question/how-do-you-check-if-a-linked-list-is-a-palindrome) (no random access, so it uses [fast and slow pointers](/interview-question/what-is-the-fast-and-slow-pointer-technique) and reverses half the list).

## 4. The Two-Pointer Solution in JavaScript

JavaScript has no \`isalnum\`, so the helper \`isAlnum\` tests one character with the regex \`/[a-z0-9]/i\` (the \`i\` flag ignores case). \`s[i]\` reads one UTF-16 code unit in O(1), and strings are immutable, so nothing is copied.

~~~javascript
const isAlnum = (ch) => /[a-z0-9]/i.test(ch); // ASCII letters and digits only

function isPalindrome(s) {
  // True if s reads the same both ways, looking only at letters and digits, ignoring case.
  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    while (left < right && !isAlnum(s[left])) left++;   // skip spaces, punctuation, underscores
    while (left < right && !isAlnum(s[right])) right--;
    if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;
    left++;
    right--;
  }
  return true;
}

function isPalindrome(s) {
  // True if s reads the same both ways, looking only at letters and digits, ignoring case.
  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    while (left < right && !isAlnum(s[left])) left++;   // skip spaces, punctuation, underscores
    while (left < right && !isAlnum(s[right])) right--;
    if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;
    left++;
    right--;
  }
  return true;
}
~~~

**Why each line is there:**

- \`while (left < right && !isAlnum(s[left])) left++;\` — the \`left < right\` part keeps \`".,"\` safe. Without it, \`s[left]\` would eventually be \`undefined\`, and \`/[a-z0-9]/i.test(undefined)\` tests the string \`"undefined"\`, which **matches**, a confusing bug.
- After skipping, both characters are alphanumeric (or the pointers have met), so \`toLowerCase()\` on each is the whole comparison.
- The function returns \`false\` at the first mismatch.

**Unicode in JavaScript.** \`/[a-z0-9]/i\` is ASCII only: in a test run \`/[a-z0-9]/i.test('é')\` printed \`false\`, while the Unicode-aware \`/[\\p{L}\\p{N}]/u.test('é')\` printed \`true\`. Strings are sequences of UTF-16 code units, so a character outside the basic range (most emoji) has \`length\` 2. For \`'ab😀ba'\`, \`s.split('').reverse().join('') === s\` printed \`false\` (the two halves of the emoji were swapped), while \`[...s].reverse().join('') === s\` printed \`true\`, because spreading a string iterates whole code points.

### The one-liner, and what it costs

The JavaScript warm-up, which is also what \`cleanReverse\` does in Example 2:

~~~javascript
const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
return cleaned === cleaned.split('').reverse().join('');
~~~

**Cost:** it allocates the cleaned string, an array of characters and the reversed string: O(n) extra space.

### One deletion allowed

~~~javascript
function isRangePalindrome(s, left, right) {
  while (left < right) {
    if (s[left] !== s[right]) return false;
    left++;
    right--;
  }
  return true;
}

function validPalindromeII(s) {
  // True if s is a palindrome after deleting at most one character.
  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    if (s[left] !== s[right]) {
      // one mismatch allowed: try skipping either side, once
      return isRangePalindrome(s, left + 1, right) || isRangePalindrome(s, left, right - 1);
    }
    left++;
    right--;
  }
  return true;
}
~~~

**Why compare raw characters here:** the classic "valid palindrome II" problem uses lowercase letters only, so there is nothing to skip. If the input could contain punctuation, clean it first or add the same skip loops.

## 5. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — the main solution on tricky inputs** prints:

~~~text
[A man, a plan, a canal: Panama] => true
[race a car] => false
[] => true
[ ] => true
[0P] => false
[Was it a car or a cat I saw?] => true
[ab_a] => true
~~~

**Example 2 — one deletion allowed, and the clean-and-reverse check** prints:

~~~text
[aba] => true
[abca] => true
[abc] => false
[deeee] => true
[eccer] => true
[abcdba] => true
[abcdea] => false
clean and reverse: true
~~~

**Reading the output:** \`[ ]\` (a single space) and \`[]\` (empty) are both palindromes because nothing alphanumeric is left to compare; \`[0P]\` is not, because the digit 0 counts; \`[ab_a]\` is, because the underscore is skipped. In the second block, \`[abcdba]\` is true (delete c or d) while \`[abcdea]\` needs two deletions.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Clean, reverse, compare | O(n) | O(n) | the cleaned copy (and the reversed copy) |
| Converging two pointers | O(n) | O(1) | each index moves only inward, every character is visited once |
| One deletion allowed | O(n) | O(1) | one scan to the first mismatch, then at most two range checks |
| Try deleting every index | O(n²) | O(1) or O(n) | n deletions, each followed by an O(n) check |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Empty string:** a palindrome (nothing differs).
- **Only punctuation or spaces** (\`" "\`, \`".,"\`): a palindrome; this is the case that breaks a skip loop without its own bounds check.
- **One character:** a palindrome.
- **Mixed digits and letters** (\`"0P"\`): not a palindrome; digits are compared, not skipped.
- **Underscores** (\`"ab_a"\`): skipped as non-alphanumeric, so it is a palindrome.
- **Non-ASCII letters:** the answer depends on the language helpers above; agree on ASCII versus Unicode before coding.

## Common Pitfalls

- **Skipping without the bounds check.** Reading past the end gives \`undefined\`, and a regex \`test(undefined)\` converts it to the string \`"undefined"\`, so the bug does not even crash.
- **Forgetting digits.** \`/[a-z]/i\` makes \`"0P"\` look like \`"P"\` and returns \`true\`; the expected answer is \`false\`.
- **Reversing with \`split('')\` on emoji or other astral characters.** It splits surrogate pairs; use \`[...s]\` or \`Array.from(s)\`.
- **Using \`==\` with mixed types.** Characters are strings, so \`===\` is all you need; \`==\` invites coercion bugs elsewhere.
- **Building a regex inside the loop.** A literal like \`/[a-z0-9]/i\` written in the loop body is cheap, but \`new RegExp(...)\` per character is not; keep the regex outside the loop.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The approach:</strong> <span style="color:#f0e2c8;">Converging two pointers: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> from the start, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> from the end, skip characters that fail <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/[a-z0-9]/i</code>, compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toLowerCase()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Stop early:</strong> <span style="color:#f0e2c8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> at the first mismatch; if the pointers meet, it is a palindrome.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The guard:</strong> <span style="color:#f0e2c8;">Every skip loop also checks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left &lt; right</code>, so a string of only punctuation returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code> instead of reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) extra space; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">replace</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">split().reverse().join()</code> version is O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/[\\p{L}\\p{N}]/u</code> for Unicode letters and digits, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...s]</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">split('')</code> when reversing.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if one deletion is allowed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At the first mismatch, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isRangePalindrome(s, left + 1, right) || isRangePalindrome(s, left, right - 1)</code>. Each check is O(n), so the total is O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">split('')</code> break on emoji?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">JavaScript strings are UTF-16 code units, and an emoji is two of them. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">split('')</code> separates the pair; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...s]</code> keeps code points together.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"0P"</code> return and why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>: both characters are alphanumeric and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"0"</code> does not equal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"p"</code>. A letters-only regex would wrongly skip the digit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">""</code> a palindrome?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes by the usual definition. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> starts at -1, the loop never runs, and the function returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support accented letters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Switch the test to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/[\\p{L}\\p{N}]/u</code>, and normalise first with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.normalize('NFC')</code> so an accented letter stored as two code points compares equal to the one-code-point form.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Palindrome** | reads the same forwards and backwards |
| **Alphanumeric** | a letter or a digit |
| **Case-insensitive comparison** | compare after converting both characters to one case |
| **Valid palindrome II** | palindrome after deleting at most one character |
| **UTF-16 code unit** | the 16-bit unit JavaScript strings are made of; some characters need two |

---
**Conclusion:** A valid palindrome check is the converging two-pointer pattern with one twist: skip every character that is not a letter or digit, and compare the rest case-insensitively. It is O(n) time and O(1) extra space, while the clean-and-reverse version trades O(n) memory for simplicity. The one-deletion follow-up keeps the same scan and tries both deletions at the first mismatch. In JavaScript, the marks are in the details: the bounds check inside each skip loop, digits counting as characters, and knowing exactly what the language helpers treat as a letter.`,
        examples: [
          { label: `Two-pointer palindrome check on tricky inputs`, code: `const isAlnum = (ch) => /[a-z0-9]/i.test(ch); // ASCII letters and digits only

function isPalindrome(s) {
  // True if s reads the same both ways, looking only at letters and digits, ignoring case.
  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    while (left < right && !isAlnum(s[left])) left++;   // skip spaces, punctuation, underscores
    while (left < right && !isAlnum(s[right])) right--;
    if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;
    left++;
    right--;
  }
  return true;
}

const show = (s) => '[' + s + '] => ' + isPalindrome(s);

console.log(show('A man, a plan, a canal: Panama')); // [A man, a plan, a canal: Panama] => true
console.log(show('race a car')); // [race a car] => false
console.log(show('')); // [] => true
console.log(show(' ')); // [ ] => true
console.log(show('0P')); // [0P] => false
console.log(show('Was it a car or a cat I saw?')); // [Was it a car or a cat I saw?] => true
console.log(show('ab_a')); // [ab_a] => true` },
          { label: `Valid palindrome II (one deletion) and the clean-and-reverse version`, code: `function isRangePalindrome(s, left, right) {
  while (left < right) {
    if (s[left] !== s[right]) return false;
    left++;
    right--;
  }
  return true;
}

function validPalindromeII(s) {
  // True if s is a palindrome after deleting at most one character.
  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    if (s[left] !== s[right]) {
      // one mismatch allowed: try skipping either side, once
      return isRangePalindrome(s, left + 1, right) || isRangePalindrome(s, left, right - 1);
    }
    left++;
    right--;
  }
  return true;
}

function cleanReverse(s) {
  // The O(n)-extra-space version: build the cleaned string, compare with its reverse.
  const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned === cleaned.split('').reverse().join('');
}

const show = (s) => '[' + s + '] => ' + validPalindromeII(s);

console.log(show('aba')); // [aba] => true
console.log(show('abca')); // [abca] => true
console.log(show('abc')); // [abc] => false
console.log(show('deeee')); // [deeee] => true
console.log(show('eccer')); // [eccer] => true
console.log(show('abcdba')); // [abcdba] => true
console.log(show('abcdea')); // [abcdea] => false
console.log('clean and reverse: ' + cleanReverse('No lemon, no melon')); // clean and reverse: true` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given a string, tell me whether it is a palindrome if you only look at letters and digits and ignore case. For example, "A man, a plan, a canal: Panama" should be true. Please write it in Java."

**What a strong answer should cover:**
- Converging two pointers that skip non-alphanumeric characters and compare case-insensitively; stop at the first mismatch.
- The inner skip loops also check \`left < right\`, so a string of only punctuation does not throw.
- O(n) time and O(1) extra space, versus O(n) extra space for building a cleaned \`StringBuilder\` and reversing it.
- Edge cases: empty string, only punctuation, single character, digits versus letters ("0P" is false).
- Java specifics: \`Character.isLetterOrDigit\` and \`Character.toLowerCase\` on \`char\`s from \`charAt\`; compare \`char\`s with \`==\` but \`String\`s with \`equals\`; \`charAt\` returns UTF-16 code units.

**Clarifying questions expected:**
- "Only letters and digits, and is it case-insensitive?"
- "ASCII or full Unicode? And is an empty string a palindrome?"

**Code / implementation expected:** Yes — \`static boolean isPalindrome(String s)\` with two indices in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A sign painter is asked to paint "Was it a car or a cat I saw?" on a wall that people will read from both sides through a glass door. The client asks: does it read the same backwards? The painter does not care about the capital W, the spaces or the question mark; only the letters matter. So she puts one finger on the first letter, one on the last, and walks them towards each other, skipping anything that is not a letter, comparing as she goes. The first time two letters differ, she can stop: it is not a palindrome. If her fingers meet, it is.

That is exactly the interview question. A **palindrome** reads the same forwards and backwards. The "valid palindrome" version adds the real-world rule: **ignore case and ignore everything that is not a letter or a digit**. The skill being tested is the converging two-pointer pattern plus careful handling of the characters you skip.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which characters count: only letters and digits? | The classic version ignores spaces, punctuation and underscores; a strict version compares every character. |
| Is the comparison case-insensitive? | "Aa" is a palindrome only if case is ignored. |
| ASCII only, or any Unicode text? | Decides which "is alphanumeric" test and which lowercasing you use, and how characters are stored. |
| Is the empty string (or a string of only punctuation) a palindrome? | The usual answer is yes: nothing left to compare means nothing differs. |
| May I build a cleaned copy, or must it be O(1) extra space? | The copy-and-reverse version is simpler; the two-pointer version uses no extra memory. |
| Is deleting one character allowed? | That is the follow-up "valid palindrome II", with a different algorithm. |

## 3. The Core Idea

📌 **Interview term: Palindrome** — a sequence that reads the same forwards and backwards: position \`i\` equals position \`n - 1 - i\` for every \`i\`.

📌 **Interview term: Alphanumeric** — a character that is a letter or a digit. Spaces, commas, colons, question marks and underscores are not.

There are two standard solutions.

**Approach 1, clean and reverse.** Build a new string containing only the lowercase alphanumeric characters, then compare it with its reverse. Easy to get right, O(n) time, but O(n) extra memory for the copy (and another O(n) for the reversed copy).

**Approach 2, converging two pointers.** Put \`left\` at index 0 and \`right\` at the last index. Move \`left\` forward past anything that is not alphanumeric, move \`right\` backward the same way, compare the two characters case-insensitively, and step both inward. Same O(n) time, but O(1) extra memory: nothing is copied. This is the general [two-pointer technique](/interview-question/what-is-the-two-pointer-technique) in its converging shape.

<svg class="iq-diagram" width="100%" viewBox="0 0 630 270" role="img" aria-label="Two pointers on the string Race comma space car, left starts on R and right on r, the comma and the space are skipped">
  <defs>
    <marker id="vp1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="56" y="30" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="30" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="56" y="70" text-anchor="middle">R</text>
  <text class="d-sub" x="120" y="30" text-anchor="middle">1</text>
  <rect class="d-box" x="94" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="120" y="70" text-anchor="middle">a</text>
  <text class="d-sub" x="184" y="30" text-anchor="middle">2</text>
  <rect class="d-box" x="158" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="184" y="70" text-anchor="middle">c</text>
  <text class="d-sub" x="248" y="30" text-anchor="middle">3</text>
  <rect class="d-box" x="222" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="248" y="70" text-anchor="middle">e</text>
  <text class="d-sub" x="312" y="30" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="286" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="312" y="70" text-anchor="middle">,</text>
  <text class="d-sub" x="376" y="30" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="350" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="376" y="70" text-anchor="middle">·</text>
  <text class="d-sub" x="440" y="30" text-anchor="middle">6</text>
  <rect class="d-box" x="414" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="440" y="70" text-anchor="middle">c</text>
  <text class="d-sub" x="504" y="30" text-anchor="middle">7</text>
  <rect class="d-box" x="478" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="504" y="70" text-anchor="middle">a</text>
  <text class="d-sub" x="568" y="30" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="542" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="568" y="70" text-anchor="middle">r</text>
  <path class="d-edge-accent" d="M 56 118 L 56 96" marker-end="url(#vp1-arrow)"/>
  <text class="d-text d-accent" x="56" y="136" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 568 118 L 568 96" marker-end="url(#vp1-arrow)"/>
  <text class="d-text d-accent" x="568" y="136" text-anchor="middle">right</text>
  <rect class="d-box-accent" x="30" y="176" width="260" height="70" rx="10"/>
  <text class="d-text" x="160" y="205" text-anchor="middle">compare lowercase</text>
  <text class="d-sub" x="160" y="227" text-anchor="middle">r equals r, move both</text>
  <rect class="d-box-muted" x="334" y="176" width="260" height="70" rx="10"/>
  <text class="d-text" x="464" y="205" text-anchor="middle">comma and space</text>
  <text class="d-sub" x="464" y="227" text-anchor="middle">not alphanumeric: skip</text>
</svg>

In the picture the first comparison is R against r (equal after lowercasing). Later, when \`left\` reaches the comma at index 4 it skips it and the space at index 5, landing on c at index 6, where it meets \`right\`, and the loop ends: "Race, car" is a palindrome.

📌 **Interview term: Case-insensitive comparison** — comparing two characters after converting both to the same case, so "A" and "a" count as equal.

Two details make or break the code:

- The skipping loops need their own \`left < right\` check. Without it, a string of only punctuation such as \`".,"\` lets \`left\` run past \`right\` (or past the end).
- The outer loop is \`while left < right\`. When the pointers meet on the middle character of an odd-length string, that character matches itself and needs no check.

### The follow-up: allow one deletion

📌 **Interview term: Valid palindrome II** — the variant that asks whether the string can become a palindrome by deleting **at most one** character.

Run the same converging pointers. At the **first** mismatch you have exactly two choices: delete the left character or delete the right one. Check whether either remaining range \`[left + 1, right]\` or \`[left, right - 1]\` is a plain palindrome. If neither is, one deletion is not enough. Each check is O(n) and happens at most twice, so the whole thing stays O(n).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 280" role="img" aria-label="Valid palindrome with one deletion on abca, the mismatch b versus c splits into two checks, skip left or skip right">
  <defs>
    <marker id="vp2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="190" y="30" width="260" height="70" rx="10"/>
  <text class="d-text" x="320" y="59" text-anchor="middle">mismatch at 1 and 2</text>
  <text class="d-sub" x="320" y="81" text-anchor="middle">b versus c</text>
  <path class="d-edge" d="M 260 104 L 180 168" marker-end="url(#vp2-arrow)"/>
  <path class="d-edge" d="M 380 104 L 460 168" marker-end="url(#vp2-arrow)"/>
  <rect class="d-box-muted" x="30" y="172" width="260" height="80" rx="10"/>
  <text class="d-text" x="160" y="195" text-anchor="middle">skip left</text>
  <text class="d-sub" x="160" y="217" text-anchor="middle">check index 2 to 2</text>
  <text class="d-sub" x="160" y="239" text-anchor="middle">c is a palindrome</text>
  <rect class="d-box-muted" x="350" y="172" width="260" height="80" rx="10"/>
  <text class="d-text" x="480" y="195" text-anchor="middle">skip right</text>
  <text class="d-sub" x="480" y="217" text-anchor="middle">check index 1 to 1</text>
  <text class="d-sub" x="480" y="239" text-anchor="middle">b is a palindrome</text>
</svg>

For "abca" the first mismatch is b (index 1) against c (index 2). Skipping the left side leaves the range 2 to 2 ("c"), which is a palindrome, so the answer is true.

Related questions that use the same idea: [longest palindromic substring](/interview-question/how-do-you-find-the-longest-palindromic-substring) (expand from the centre instead of shrinking from the ends) and [palindrome linked list](/interview-question/how-do-you-check-if-a-linked-list-is-a-palindrome) (no random access, so it uses [fast and slow pointers](/interview-question/what-is-the-fast-and-slow-pointer-technique) and reverses half the list).

## 4. The Two-Pointer Solution in Java

\`s.charAt(i)\` returns a primitive \`char\` in O(1) without copying, and \`char\` values compare correctly with \`==\`. \`Character.isLetterOrDigit\` and \`Character.toLowerCase\` work on single \`char\`s.

~~~java
// True if s reads the same both ways, looking only at letters and digits, ignoring case.
static boolean isPalindrome(String s) {
    int left = 0, right = s.length() - 1;
    while (left < right) {
        while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;   // skip punctuation
        while (left < right && !Character.isLetterOrDigit(s.charAt(right))) right--;
        if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right)))
            return false;
        left++;
        right--;
    }
    return true;
}
~~~

**Why each line is there:**

- \`while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;\` — the \`left < right\` part keeps \`".,"\` safe; without it \`charAt\` would throw \`StringIndexOutOfBoundsException\`.
- After skipping, both characters are letters or digits (or the pointers have met), so comparing \`Character.toLowerCase\` of each is the whole test.
- The method returns \`false\` at the first mismatch.

**Unicode in Java.** \`Character.isLetterOrDigit\` follows Unicode: in a test run it returned \`true\` for \`'é'\` and for the Arabic-Indic digit \`'\\u0663'\`, and \`false\` for \`'_'\`. A Java \`String\` is a sequence of UTF-16 code units, so a character outside the basic range (most emoji) takes two \`char\`s; if that matters, walk the string with \`codePointAt\` and \`Character.charCount\`. One nice detail: \`new StringBuilder("ab😀ba").reverse()\` kept the emoji intact in a test run (the reversed string equalled the original), so the clean-and-reverse version is safe for such characters.

### The one-liner, and what it costs

The clean-and-reverse version is \`cleanReverse\` in Example 2: append each letter or digit, lowercased, to a \`StringBuilder\`, then compare \`cleaned.equals(sb.reverse().toString())\`. It is O(n) extra space. Note \`equals\`, not \`==\`: in a test, \`"ab" == new String("ab")\` printed \`false\` because \`==\` compares references for objects.

### One deletion allowed

~~~java
static boolean isRangePalindrome(String s, int left, int right) {
    while (left < right) {
        if (s.charAt(left) != s.charAt(right)) return false;
        left++;
        right--;
    }
    return true;
}

// True if s is a palindrome after deleting at most one character.
static boolean validPalindromeII(String s) {
    int left = 0, right = s.length() - 1;
    while (left < right) {
        if (s.charAt(left) != s.charAt(right)) {
            // one mismatch allowed: try skipping either side, once
            return isRangePalindrome(s, left + 1, right) || isRangePalindrome(s, left, right - 1);
        }
        left++;
        right--;
    }
    return true;
}
~~~

**Why compare raw characters here:** the classic "valid palindrome II" problem uses lowercase letters only, so there is nothing to skip. If the input could contain punctuation, clean it first or add the same skip loops.

## 5. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — the main solution on tricky inputs** prints:

~~~text
[A man, a plan, a canal: Panama] => true
[race a car] => false
[] => true
[ ] => true
[0P] => false
[Was it a car or a cat I saw?] => true
[ab_a] => true
~~~

**Example 2 — one deletion allowed, and the clean-and-reverse check** prints:

~~~text
[aba] => true
[abca] => true
[abc] => false
[deeee] => true
[eccer] => true
[abcdba] => true
[abcdea] => false
clean and reverse: true
~~~

**Reading the output:** \`[ ]\` (a single space) and \`[]\` (empty) are both palindromes because nothing alphanumeric is left to compare; \`[0P]\` is not, because the digit 0 counts; \`[ab_a]\` is, because the underscore is skipped. In the second block, \`[abcdba]\` is true (delete c or d) while \`[abcdea]\` needs two deletions.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Clean, reverse, compare | O(n) | O(n) | the cleaned copy (and the reversed copy) |
| Converging two pointers | O(n) | O(1) | each index moves only inward, every character is visited once |
| One deletion allowed | O(n) | O(1) | one scan to the first mismatch, then at most two range checks |
| Try deleting every index | O(n²) | O(1) or O(n) | n deletions, each followed by an O(n) check |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Empty string:** a palindrome (nothing differs).
- **Only punctuation or spaces** (\`" "\`, \`".,"\`): a palindrome; this is the case that breaks a skip loop without its own bounds check.
- **One character:** a palindrome.
- **Mixed digits and letters** (\`"0P"\`): not a palindrome; digits are compared, not skipped.
- **Underscores** (\`"ab_a"\`): skipped as non-alphanumeric, so it is a palindrome.
- **Non-ASCII letters:** the answer depends on the language helpers above; agree on ASCII versus Unicode before coding.

## Common Pitfalls

- **Skipping without the bounds check.** \`charAt\` past the end throws \`StringIndexOutOfBoundsException\` on input like \`"..."\`.
- **Forgetting digits.** \`Character.isLetter\` makes \`"0P"\` look like \`"P"\` and returns \`true\`; the expected answer is \`false\`.
- **Comparing \`String\`s with \`==\`.** It compares references; use \`equals\`. (\`char\` with \`==\` is fine, it is a primitive.)
- **\`toLowerCase()\` on the whole string.** \`String.toLowerCase()\` without a \`Locale\` uses the default locale, which can change some letters (the Turkish dotted and dotless i); per-\`char\` \`Character.toLowerCase\` or \`toLowerCase(Locale.ROOT)\` avoids that.
- **String concatenation in a loop.** Building the cleaned string with \`+=\` creates a new \`String\` each time (O(n²) copying); use \`StringBuilder\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The approach:</strong> <span style="color:#f0e2c8;">Converging two pointers with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">charAt</code>: skip characters where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Character.isLetterOrDigit</code> is false, compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Character.toLowerCase</code> of each.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Stop early:</strong> <span style="color:#f0e2c8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> at the first mismatch; if the pointers meet, it is a palindrome.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The guard:</strong> <span style="color:#f0e2c8;">Every skip loop also checks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left &lt; right</code>, so a string of only punctuation returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code> instead of throwing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) extra space; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StringBuilder</code> clean-and-reverse version is O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char</code> compares with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">String</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">charAt</code> gives UTF-16 code units, not whole code points.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if one deletion is allowed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At the first mismatch, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isRangePalindrome(s, left + 1, right) || isRangePalindrome(s, left, right - 1)</code>. Each check is O(n), so the total is O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">new StringBuilder(s).reverse().toString().equals(s)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It does not skip punctuation or ignore case, and it allocates two copies. It is fine after cleaning, but uses O(n) memory.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"0P"</code> return and why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>: both characters are letters or digits and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'0'</code> does not equal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'p'</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Character.isLetter</code> would wrongly skip the digit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">""</code> a palindrome?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes by the usual definition. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> starts at -1, the loop never runs, and the method returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle emoji or other supplementary characters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Walk by code point: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.codePointAt(i)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Character.charCount(cp)</code> to step, moving backwards with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.codePointBefore(j)</code>. The logic stays the same.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Palindrome** | reads the same forwards and backwards |
| **Alphanumeric** | a letter or a digit |
| **Case-insensitive comparison** | compare after converting both characters to one case |
| **Valid palindrome II** | palindrome after deleting at most one character |
| **UTF-16 code unit** | one Java \`char\`; some characters need two of them |

---
**Conclusion:** A valid palindrome check is the converging two-pointer pattern with one twist: skip every character that is not a letter or digit, and compare the rest case-insensitively. It is O(n) time and O(1) extra space, while the clean-and-reverse version trades O(n) memory for simplicity. The one-deletion follow-up keeps the same scan and tries both deletions at the first mismatch. In Java, the marks are in the details: the bounds check inside each skip loop, digits counting as characters, and knowing exactly what the language helpers treat as a letter.`,
        examples: [
          { label: `Two-pointer palindrome check on tricky inputs`, code: `public class Main {
    // True if s reads the same both ways, looking only at letters and digits, ignoring case.
    static boolean isPalindrome(String s) {
        int left = 0, right = s.length() - 1;
        while (left < right) {
            while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;   // skip punctuation
            while (left < right && !Character.isLetterOrDigit(s.charAt(right))) right--;
            if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right)))
                return false;
            left++;
            right--;
        }
        return true;
    }

    static String show(String s) {
        return "[" + s + "] => " + isPalindrome(s);
    }

    public static void main(String[] args) {
        System.out.println(show("A man, a plan, a canal: Panama")); // [A man, a plan, a canal: Panama] => true
        System.out.println(show("race a car"));                     // [race a car] => false
        System.out.println(show(""));                               // [] => true
        System.out.println(show(" "));                              // [ ] => true
        System.out.println(show("0P"));                             // [0P] => false
        System.out.println(show("Was it a car or a cat I saw?"));   // [Was it a car or a cat I saw?] => true
        System.out.println(show("ab_a"));                           // [ab_a] => true
    }
}` },
          { label: `Valid palindrome II (one deletion) and the clean-and-reverse version`, code: `public class Main {
    static boolean isRangePalindrome(String s, int left, int right) {
        while (left < right) {
            if (s.charAt(left) != s.charAt(right)) return false;
            left++;
            right--;
        }
        return true;
    }

    // True if s is a palindrome after deleting at most one character.
    static boolean validPalindromeII(String s) {
        int left = 0, right = s.length() - 1;
        while (left < right) {
            if (s.charAt(left) != s.charAt(right)) {
                // one mismatch allowed: try skipping either side, once
                return isRangePalindrome(s, left + 1, right) || isRangePalindrome(s, left, right - 1);
            }
            left++;
            right--;
        }
        return true;
    }

    // The O(n)-extra-space version: build the cleaned string, compare with its reverse.
    static boolean cleanReverse(String s) {
        StringBuilder sb = new StringBuilder();
        for (char ch : s.toCharArray())
            if (Character.isLetterOrDigit(ch)) sb.append(Character.toLowerCase(ch));
        String cleaned = sb.toString();
        return cleaned.equals(sb.reverse().toString()); // equals, never == on Strings
    }

    static String show(String s) {
        return "[" + s + "] => " + validPalindromeII(s);
    }

    public static void main(String[] args) {
        System.out.println(show("aba"));     // [aba] => true
        System.out.println(show("abca"));    // [abca] => true
        System.out.println(show("abc"));     // [abc] => false
        System.out.println(show("deeee"));   // [deeee] => true
        System.out.println(show("eccer"));   // [eccer] => true
        System.out.println(show("abcdba"));  // [abcdba] => true
        System.out.println(show("abcdea"));  // [abcdea] => false
        System.out.println("clean and reverse: " + cleanReverse("No lemon, no melon")); // true
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a string, tell me whether it is a palindrome if you only look at letters and digits and ignore case. For example, "A man, a plan, a canal: Panama" should be true. Please write it in C++."

**What a strong answer should cover:**
- Converging two pointers that skip non-alphanumeric characters and compare case-insensitively; stop at the first mismatch.
- The inner skip loops also check \`left < right\`, so a string of only punctuation stays in bounds.
- O(n) time and O(1) extra space, versus O(n) extra space for building a cleaned copy.
- Edge cases: empty string, only punctuation, single character, digits versus letters ("0P" is false).
- C++ specifics: \`std::isalnum\` and \`std::tolower\` must get \`static_cast<unsigned char>(c)\` (a negative \`char\` is undefined behaviour); \`s.size() - 1\` wraps around for an empty string; \`std::string\` holds bytes, not Unicode characters.

**Clarifying questions expected:**
- "Only letters and digits, and is it case-insensitive?"
- "ASCII or UTF-8 text? And is an empty string a palindrome?"

**Code / implementation expected:** Yes — \`bool isPalindrome(const std::string&)\` with two indices in C++.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A sign painter is asked to paint "Was it a car or a cat I saw?" on a wall that people will read from both sides through a glass door. The client asks: does it read the same backwards? The painter does not care about the capital W, the spaces or the question mark; only the letters matter. So she puts one finger on the first letter, one on the last, and walks them towards each other, skipping anything that is not a letter, comparing as she goes. The first time two letters differ, she can stop: it is not a palindrome. If her fingers meet, it is.

That is exactly the interview question. A **palindrome** reads the same forwards and backwards. The "valid palindrome" version adds the real-world rule: **ignore case and ignore everything that is not a letter or a digit**. The skill being tested is the converging two-pointer pattern plus careful handling of the characters you skip.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which characters count: only letters and digits? | The classic version ignores spaces, punctuation and underscores; a strict version compares every character. |
| Is the comparison case-insensitive? | "Aa" is a palindrome only if case is ignored. |
| ASCII only, or any Unicode text? | Decides which "is alphanumeric" test and which lowercasing you use, and how characters are stored. |
| Is the empty string (or a string of only punctuation) a palindrome? | The usual answer is yes: nothing left to compare means nothing differs. |
| May I build a cleaned copy, or must it be O(1) extra space? | The copy-and-reverse version is simpler; the two-pointer version uses no extra memory. |
| Is deleting one character allowed? | That is the follow-up "valid palindrome II", with a different algorithm. |

## 3. The Core Idea

📌 **Interview term: Palindrome** — a sequence that reads the same forwards and backwards: position \`i\` equals position \`n - 1 - i\` for every \`i\`.

📌 **Interview term: Alphanumeric** — a character that is a letter or a digit. Spaces, commas, colons, question marks and underscores are not.

There are two standard solutions.

**Approach 1, clean and reverse.** Build a new string containing only the lowercase alphanumeric characters, then compare it with its reverse. Easy to get right, O(n) time, but O(n) extra memory for the copy (and another O(n) for the reversed copy).

**Approach 2, converging two pointers.** Put \`left\` at index 0 and \`right\` at the last index. Move \`left\` forward past anything that is not alphanumeric, move \`right\` backward the same way, compare the two characters case-insensitively, and step both inward. Same O(n) time, but O(1) extra memory: nothing is copied. This is the general [two-pointer technique](/interview-question/what-is-the-two-pointer-technique) in its converging shape.

<svg class="iq-diagram" width="100%" viewBox="0 0 630 270" role="img" aria-label="Two pointers on the string Race comma space car, left starts on R and right on r, the comma and the space are skipped">
  <defs>
    <marker id="vp1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="56" y="30" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="30" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="56" y="70" text-anchor="middle">R</text>
  <text class="d-sub" x="120" y="30" text-anchor="middle">1</text>
  <rect class="d-box" x="94" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="120" y="70" text-anchor="middle">a</text>
  <text class="d-sub" x="184" y="30" text-anchor="middle">2</text>
  <rect class="d-box" x="158" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="184" y="70" text-anchor="middle">c</text>
  <text class="d-sub" x="248" y="30" text-anchor="middle">3</text>
  <rect class="d-box" x="222" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="248" y="70" text-anchor="middle">e</text>
  <text class="d-sub" x="312" y="30" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="286" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="312" y="70" text-anchor="middle">,</text>
  <text class="d-sub" x="376" y="30" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="350" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="376" y="70" text-anchor="middle">·</text>
  <text class="d-sub" x="440" y="30" text-anchor="middle">6</text>
  <rect class="d-box" x="414" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="440" y="70" text-anchor="middle">c</text>
  <text class="d-sub" x="504" y="30" text-anchor="middle">7</text>
  <rect class="d-box" x="478" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="504" y="70" text-anchor="middle">a</text>
  <text class="d-sub" x="568" y="30" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="542" y="40" width="52" height="50" rx="6"/>
  <text class="d-text" x="568" y="70" text-anchor="middle">r</text>
  <path class="d-edge-accent" d="M 56 118 L 56 96" marker-end="url(#vp1-arrow)"/>
  <text class="d-text d-accent" x="56" y="136" text-anchor="middle">left</text>
  <path class="d-edge-accent" d="M 568 118 L 568 96" marker-end="url(#vp1-arrow)"/>
  <text class="d-text d-accent" x="568" y="136" text-anchor="middle">right</text>
  <rect class="d-box-accent" x="30" y="176" width="260" height="70" rx="10"/>
  <text class="d-text" x="160" y="205" text-anchor="middle">compare lowercase</text>
  <text class="d-sub" x="160" y="227" text-anchor="middle">r equals r, move both</text>
  <rect class="d-box-muted" x="334" y="176" width="260" height="70" rx="10"/>
  <text class="d-text" x="464" y="205" text-anchor="middle">comma and space</text>
  <text class="d-sub" x="464" y="227" text-anchor="middle">not alphanumeric: skip</text>
</svg>

In the picture the first comparison is R against r (equal after lowercasing). Later, when \`left\` reaches the comma at index 4 it skips it and the space at index 5, landing on c at index 6, where it meets \`right\`, and the loop ends: "Race, car" is a palindrome.

📌 **Interview term: Case-insensitive comparison** — comparing two characters after converting both to the same case, so "A" and "a" count as equal.

Two details make or break the code:

- The skipping loops need their own \`left < right\` check. Without it, a string of only punctuation such as \`".,"\` lets \`left\` run past \`right\` (or past the end).
- The outer loop is \`while left < right\`. When the pointers meet on the middle character of an odd-length string, that character matches itself and needs no check.

### The follow-up: allow one deletion

📌 **Interview term: Valid palindrome II** — the variant that asks whether the string can become a palindrome by deleting **at most one** character.

Run the same converging pointers. At the **first** mismatch you have exactly two choices: delete the left character or delete the right one. Check whether either remaining range \`[left + 1, right]\` or \`[left, right - 1]\` is a plain palindrome. If neither is, one deletion is not enough. Each check is O(n) and happens at most twice, so the whole thing stays O(n).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 280" role="img" aria-label="Valid palindrome with one deletion on abca, the mismatch b versus c splits into two checks, skip left or skip right">
  <defs>
    <marker id="vp2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="190" y="30" width="260" height="70" rx="10"/>
  <text class="d-text" x="320" y="59" text-anchor="middle">mismatch at 1 and 2</text>
  <text class="d-sub" x="320" y="81" text-anchor="middle">b versus c</text>
  <path class="d-edge" d="M 260 104 L 180 168" marker-end="url(#vp2-arrow)"/>
  <path class="d-edge" d="M 380 104 L 460 168" marker-end="url(#vp2-arrow)"/>
  <rect class="d-box-muted" x="30" y="172" width="260" height="80" rx="10"/>
  <text class="d-text" x="160" y="195" text-anchor="middle">skip left</text>
  <text class="d-sub" x="160" y="217" text-anchor="middle">check index 2 to 2</text>
  <text class="d-sub" x="160" y="239" text-anchor="middle">c is a palindrome</text>
  <rect class="d-box-muted" x="350" y="172" width="260" height="80" rx="10"/>
  <text class="d-text" x="480" y="195" text-anchor="middle">skip right</text>
  <text class="d-sub" x="480" y="217" text-anchor="middle">check index 1 to 1</text>
  <text class="d-sub" x="480" y="239" text-anchor="middle">b is a palindrome</text>
</svg>

For "abca" the first mismatch is b (index 1) against c (index 2). Skipping the left side leaves the range 2 to 2 ("c"), which is a palindrome, so the answer is true.

Related questions that use the same idea: [longest palindromic substring](/interview-question/how-do-you-find-the-longest-palindromic-substring) (expand from the centre instead of shrinking from the ends) and [palindrome linked list](/interview-question/how-do-you-check-if-a-linked-list-is-a-palindrome) (no random access, so it uses [fast and slow pointers](/interview-question/what-is-the-fast-and-slow-pointer-technique) and reverses half the list).

## 4. The Two-Pointer Solution in C++

The string is taken by \`const std::string&\`, so nothing is copied. The two tiny helpers wrap \`std::isalnum\` and \`std::tolower\` from \`<cctype>\`, because both must be given an \`unsigned char\` value.

~~~cpp
// <cctype> functions need an unsigned char value: a negative char is undefined behaviour.
bool alnum(char c) { return isalnum(static_cast<unsigned char>(c)) != 0; }
char lower(char c) { return static_cast<char>(tolower(static_cast<unsigned char>(c))); }

// True if s reads the same both ways, looking only at letters and digits, ignoring case.
bool isPalindrome(const string& s) {
    if (s.empty()) return true;           // s.size() - 1 would wrap around for size_t
    size_t left = 0, right = s.size() - 1;
    while (left < right) {
        while (left < right && !alnum(s[left])) left++;    // skip spaces, punctuation, underscores
        while (left < right && !alnum(s[right])) right--;
        if (lower(s[left]) != lower(s[right])) return false;
        left++;
        right--;
    }
    return true;
}
~~~

**Why each line is there:**

- \`if (s.empty()) return true;\` comes first because the indices are \`size_t\`: \`s.size() - 1\` on an empty string printed \`18446744073709551615\` in a test run, not -1.
- \`while (left < right && !alnum(s[left])) left++;\` — the \`left < right\` part keeps \`".,"\` in bounds. \`operator[]\` does not check bounds, so without it you would read past the string silently.
- \`right--\` cannot wrap below 0: the loop only runs while \`left < right\`, so \`right\` is at least 1 before it is decremented.

**Why the \`unsigned char\` cast.** cppreference states that the behaviour of \`std::isalnum\` is undefined if the argument is not representable as \`unsigned char\` and is not \`EOF\`, and recommends converting to \`unsigned char\` first ([cppreference: std::isalnum](https://en.cppreference.com/w/cpp/string/byte/isalnum)). On this test machine \`char\` is signed: the byte \`0xE9\` (é in Latin-1) read as a \`char\` printed \`-23\`. Bytes like that appear whenever the input is UTF-8 text with accents. Note also that \`std::string\` stores bytes: an accented letter in UTF-8 is two bytes, so this byte-wise check is correct for ASCII and only approximately right for other text. Say so if asked about Unicode.

### The one-liner, and what it costs

The clean-and-reverse version is \`cleanReverse\` in Example 2: build a cleaned \`std::string\`, then \`std::equal(cleaned.begin(), cleaned.end(), cleaned.rbegin())\` compares it with its own reverse through a reverse iterator, so no second copy is made. It is still O(n) extra space for the cleaned string.

### One deletion allowed

~~~cpp
bool isRangePalindrome(const string& s, int left, int right) {
    while (left < right) {
        if (s[left] != s[right]) return false;
        left++;
        right--;
    }
    return true;
}

// True if s is a palindrome after deleting at most one character.
bool validPalindromeII(const string& s) {
    int left = 0, right = static_cast<int>(s.size()) - 1;  // int, so an empty string gives -1
    while (left < right) {
        if (s[left] != s[right]) {
            // one mismatch allowed: try skipping either side, once
            return isRangePalindrome(s, left + 1, right) || isRangePalindrome(s, left, right - 1);
        }
        left++;
        right--;
    }
    return true;
}
~~~

**Why compare raw characters here:** the classic "valid palindrome II" problem uses lowercase letters only, so there is nothing to skip. If the input could contain punctuation, clean it first or add the same skip loops.

## 5. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — the main solution on tricky inputs** prints:

~~~text
[A man, a plan, a canal: Panama] => true
[race a car] => false
[] => true
[ ] => true
[0P] => false
[Was it a car or a cat I saw?] => true
[ab_a] => true
~~~

**Example 2 — one deletion allowed, and the clean-and-reverse check** prints:

~~~text
[aba] => true
[abca] => true
[abc] => false
[deeee] => true
[eccer] => true
[abcdba] => true
[abcdea] => false
clean and reverse: true
~~~

**Reading the output:** \`[ ]\` (a single space) and \`[]\` (empty) are both palindromes because nothing alphanumeric is left to compare; \`[0P]\` is not, because the digit 0 counts; \`[ab_a]\` is, because the underscore is skipped. In the second block, \`[abcdba]\` is true (delete c or d) while \`[abcdea]\` needs two deletions.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Clean, reverse, compare | O(n) | O(n) | the cleaned copy (and the reversed copy) |
| Converging two pointers | O(n) | O(1) | each index moves only inward, every character is visited once |
| One deletion allowed | O(n) | O(1) | one scan to the first mismatch, then at most two range checks |
| Try deleting every index | O(n²) | O(1) or O(n) | n deletions, each followed by an O(n) check |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Empty string:** a palindrome (nothing differs).
- **Only punctuation or spaces** (\`" "\`, \`".,"\`): a palindrome; this is the case that breaks a skip loop without its own bounds check.
- **One character:** a palindrome.
- **Mixed digits and letters** (\`"0P"\`): not a palindrome; digits are compared, not skipped.
- **Underscores** (\`"ab_a"\`): skipped as non-alphanumeric, so it is a palindrome.
- **Non-ASCII letters:** the answer depends on the language helpers above; agree on ASCII versus Unicode before coding.

## Common Pitfalls

- **Passing a plain \`char\` to \`isalnum\`/\`tolower\`.** Negative values are undefined behaviour; always cast to \`unsigned char\`.
- **\`size_t right = s.size() - 1\` on an empty string.** It wraps to a huge value and the first read is far out of bounds. Return early on \`empty()\` or use signed indices.
- **Skipping without the bounds check.** \`s[left]\` past the end is not checked by \`operator[]\`; with \`std::string\` you read the terminating \`'\\0'\` or worse.
- **Forgetting digits.** \`std::isalpha\` makes \`"0P"\` look like \`"P"\` and returns \`true\`; the expected answer is \`false\`.
- **Taking the string by value.** \`bool isPalindrome(std::string s)\` copies the whole string on every call; use \`const std::string&\` (or \`std::string_view\`).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The approach:</strong> <span style="color:#f0e2c8;">Converging two pointers: skip bytes where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::isalnum</code> is false, compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::tolower</code> of each, both called with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unsigned char</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Stop early:</strong> <span style="color:#f0e2c8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> at the first mismatch; if the pointers meet, it is a palindrome.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The guards:</strong> <span style="color:#f0e2c8;">Return early for an empty string (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size() - 1</code> would wrap), and give every skip loop its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left &lt; right</code> check.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) extra space; building a cleaned copy is O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;cctype&gt;</code> functions need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">static_cast&lt;unsigned char&gt;(c)</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::string</code> is bytes, so this is exact for ASCII only.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if one deletion is allowed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At the first mismatch, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isRangePalindrome(s, left + 1, right) || isRangePalindrome(s, left, right - 1)</code>. Each check is O(n), so the total is O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unsigned char</code> cast?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isalnum</code> is undefined for values that are not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EOF</code> and not representable as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unsigned char</code>. A signed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char</code> holding a UTF-8 byte is negative.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use iterators instead of indices?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">auto l = s.begin(); auto r = s.end();</code> and decrement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r</code> before reading. Or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::equal(c.begin(), c.end(), c.rbegin())</code> on a cleaned copy.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">""</code> a palindrome?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes by the usual definition; the early <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">empty()</code> return handles it before any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t</code> arithmetic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle real Unicode?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Decode UTF-8 into code points (or use a library such as ICU) and compare case-folded code points; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;cctype&gt;</code> only understands single bytes.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Palindrome** | reads the same forwards and backwards |
| **Alphanumeric** | a letter or a digit |
| **Case-insensitive comparison** | compare after converting both characters to one case |
| **Valid palindrome II** | palindrome after deleting at most one character |
| **Undefined behaviour** | code the C++ standard gives no meaning to, such as a negative value passed to \`isalnum\` |

---
**Conclusion:** A valid palindrome check is the converging two-pointer pattern with one twist: skip every character that is not a letter or digit, and compare the rest case-insensitively. It is O(n) time and O(1) extra space, while the clean-and-reverse version trades O(n) memory for simplicity. The one-deletion follow-up keeps the same scan and tries both deletions at the first mismatch. In C++, the marks are in the details: the bounds check inside each skip loop, digits counting as characters, and knowing exactly what the language helpers treat as a letter.`,
        examples: [
          { label: `Two-pointer palindrome check on tricky inputs`, code: `#include <cctype>
#include <iostream>
#include <string>
using namespace std;

// <cctype> functions need an unsigned char value: a negative char is undefined behaviour.
bool alnum(char c) { return isalnum(static_cast<unsigned char>(c)) != 0; }
char lower(char c) { return static_cast<char>(tolower(static_cast<unsigned char>(c))); }

// True if s reads the same both ways, looking only at letters and digits, ignoring case.
bool isPalindrome(const string& s) {
    if (s.empty()) return true;           // s.size() - 1 would wrap around for size_t
    size_t left = 0, right = s.size() - 1;
    while (left < right) {
        while (left < right && !alnum(s[left])) left++;    // skip spaces, punctuation, underscores
        while (left < right && !alnum(s[right])) right--;
        if (lower(s[left]) != lower(s[right])) return false;
        left++;
        right--;
    }
    return true;
}

string show(const string& s) {
    return "[" + s + "] => " + (isPalindrome(s) ? "true" : "false");
}

int main() {
    cout << show("A man, a plan, a canal: Panama") << "\\n";  // [A man, a plan, a canal: Panama] => true
    cout << show("race a car") << "\\n";                      // [race a car] => false
    cout << show("") << "\\n";                                // [] => true
    cout << show(" ") << "\\n";                               // [ ] => true
    cout << show("0P") << "\\n";                              // [0P] => false
    cout << show("Was it a car or a cat I saw?") << "\\n";    // [Was it a car or a cat I saw?] => true
    cout << show("ab_a") << "\\n";                            // [ab_a] => true
}` },
          { label: `Valid palindrome II (one deletion) and the clean-and-reverse version`, code: `#include <algorithm>
#include <cctype>
#include <iostream>
#include <string>
using namespace std;

bool isRangePalindrome(const string& s, int left, int right) {
    while (left < right) {
        if (s[left] != s[right]) return false;
        left++;
        right--;
    }
    return true;
}

// True if s is a palindrome after deleting at most one character.
bool validPalindromeII(const string& s) {
    int left = 0, right = static_cast<int>(s.size()) - 1;  // int, so an empty string gives -1
    while (left < right) {
        if (s[left] != s[right]) {
            // one mismatch allowed: try skipping either side, once
            return isRangePalindrome(s, left + 1, right) || isRangePalindrome(s, left, right - 1);
        }
        left++;
        right--;
    }
    return true;
}

// The O(n)-extra-space version: build the cleaned string, compare with its reverse.
bool cleanReverse(const string& s) {
    string cleaned;
    for (unsigned char ch : s)
        if (isalnum(ch)) cleaned += static_cast<char>(tolower(ch));
    return equal(cleaned.begin(), cleaned.end(), cleaned.rbegin());
}

string show(const string& s) {
    return "[" + s + "] => " + (validPalindromeII(s) ? "true" : "false");
}

int main() {
    cout << show("aba") << "\\n";     // [aba] => true
    cout << show("abca") << "\\n";    // [abca] => true
    cout << show("abc") << "\\n";     // [abc] => false
    cout << show("deeee") << "\\n";   // [deeee] => true
    cout << show("eccer") << "\\n";   // [eccer] => true
    cout << show("abcdba") << "\\n";  // [abcdba] => true
    cout << show("abcdea") << "\\n";  // [abcdea] => false
    cout << "clean and reverse: " << boolalpha << cleanReverse("No lemon, no melon") << "\\n";  // true
}` },
        ],
      },
    },
  },
  {
    title: `How do you move all zeroes to the end of an array in place?`,
    difficulty: "easy",
    seoDescription: `Move zeroes in place in Python, JavaScript, Java and C++: the read/write two-pointer pass that keeps order, O(n) time, O(1) space, with verified code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a list of integers, move all the zeros to the end while keeping the order of the non-zero numbers, and do it in place, without making a copy of the list. Please write it in Python."

**What a strong answer should cover:**
- Read/write two pointers: \`read\` scans every element, \`write\` marks the next slot for a non-zero; swap (or copy) non-zeros forward.
- The invariant (non-zeros in order before \`write\`, zeros between \`write\` and \`read\`) and why it guarantees order is kept.
- O(n) time, O(1) extra space; why \`remove\` plus \`append\` is O(n²) and a filtered copy is O(n) space.
- The two in-place variants (swap forward versus overwrite then fill) and their write counts.
- Python specifics: in place means mutating the list object, so \`nums = [...]\` inside the function does nothing for the caller, while \`nums[:] = ...\` does (but builds a temporary list); the function returns \`None\` by convention.

**Clarifying questions expected:**
- "Must the order of non-zero values be kept?"
- "Is a temporary copy allowed, or must it be O(1) extra space?"

**Code / implementation expected:** Yes — \`move_zeroes(nums)\` in Python with read and write indices, mutating the list and returning nothing.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A librarian has a shelf of books with some empty gaps where books were borrowed. She wants all the books pushed to the left, in the same order, and all the gaps at the right end, so new books can be added there. She does not have a second shelf to copy onto.

Her method: she keeps one hand at "the next spot where a book should go" and walks along the shelf with her eyes. Every time she sees a book, she moves it to the spot her hand marks and slides her hand one place right. Gaps she simply walks past. When she reaches the end, every book is on the left in its original order, and every gap has collected on the right. One walk, no second shelf.

That is the whole algorithm. The hand is the **write pointer**, the eyes are the **read pointer**, and "no second shelf" is what **in place** means.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must the non-zero values keep their original order? | If not, a faster swap-with-the-end trick works; the classic version says yes. |
| Must it be in place, with O(1) extra memory? | Rules out building a filtered copy, which is the easy answer. |
| Do you care about the number of writes? | Some variants minimise memory writes (for example, flash memory); it decides between the two in-place versions. |
| What counts as zero: only the integer 0, or also 0.0, -0, or null? | Changes the comparison, especially in dynamically typed languages. |
| Should the function return anything? | In-place functions usually return nothing; the caller sees the change in its own array. |

## 3. The Core Idea

📌 **Interview term: In place** — the algorithm rearranges the input array itself and uses only O(1) extra memory (a couple of index variables), instead of building a new array.

📌 **Interview term: Read/write pointers** — the same-direction form of the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique): \`read\` visits every element; \`write\` marks where the next element you want to keep should go. \`write\` never gets ahead of \`read\`.

📌 **Interview term: Stable (order-preserving)** — the non-zero values come out in the same relative order they went in. This is the same idea as a [stable sorting algorithm](/interview-question/what-is-a-stable-sorting-algorithm).

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="Move zeroes halfway through 0 1 0 3 12, write points at index 2 and read at index 4">
  <defs>
    <marker id="mz1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="85" y="30" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="50" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="85" y="70" text-anchor="middle">1</text>
  <text class="d-sub" x="185" y="30" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="150" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="185" y="70" text-anchor="middle">3</text>
  <text class="d-sub" x="285" y="30" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="250" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="285" y="70" text-anchor="middle">0</text>
  <text class="d-sub" x="385" y="30" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="350" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="385" y="70" text-anchor="middle">0</text>
  <text class="d-sub" x="485" y="30" text-anchor="middle">4</text>
  <rect class="d-box" x="450" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="485" y="70" text-anchor="middle">12</text>
  <path class="d-edge-accent" d="M 285 118 L 285 96" marker-end="url(#mz1-arrow)"/>
  <text class="d-text d-accent" x="285" y="136" text-anchor="middle">write</text>
  <path class="d-edge" d="M 485 118 L 485 96" marker-end="url(#mz1-arrow)"/>
  <text class="d-text" x="485" y="136" text-anchor="middle">read</text>
  <rect class="d-box-accent" x="30" y="176" width="160" height="66" rx="10"/>
  <text class="d-text" x="110" y="203" text-anchor="middle">0 to write-1</text>
  <text class="d-sub" x="110" y="225" text-anchor="middle">non-zeros, in order</text>
  <rect class="d-box-muted" x="220" y="176" width="160" height="66" rx="10"/>
  <text class="d-text" x="300" y="203" text-anchor="middle">write to read-1</text>
  <text class="d-sub" x="300" y="225" text-anchor="middle">only zeros</text>
  <rect class="d-box" x="410" y="176" width="160" height="66" rx="10"/>
  <text class="d-text" x="490" y="203" text-anchor="middle">read onward</text>
  <text class="d-sub" x="490" y="225" text-anchor="middle">not read yet</text>
</svg>

The picture is the array \`[0, 1, 0, 3, 12]\` after \`read\` has handled index 3. Three regions are always true (this is the **loop invariant**): positions before \`write\` hold the non-zeros seen so far, in order; positions from \`write\` up to \`read - 1\` hold only zeros; positions from \`read\` on are untouched. When \`read\` reaches 12 at index 4, it is swapped with the 0 at \`write\`, giving the final array below.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="Before and after moving zeroes, 0 1 0 3 12 becomes 1 3 12 0 0 with the non-zero order kept">
  <text class="d-text" x="40" y="70">before</text>
  <rect class="d-box-muted" x="160" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="190" y="70" text-anchor="middle">0</text>
  <rect class="d-box" x="244" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="274" y="70" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="328" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="358" y="70" text-anchor="middle">0</text>
  <rect class="d-box" x="412" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="442" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="496" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="526" y="70" text-anchor="middle">12</text>
  <text class="d-text" x="40" y="170">after</text>
  <rect class="d-box-accent" x="160" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="190" y="170" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="244" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="274" y="170" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="328" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="358" y="170" text-anchor="middle">12</text>
  <rect class="d-box-muted" x="412" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="442" y="170" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="496" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="526" y="170" text-anchor="middle">0</text>
</svg>

📌 **Interview term: Loop invariant** — a statement that holds before and after every iteration. Here it is "everything before \`write\` is the non-zeros in order, and everything from \`write\` to \`read - 1\` is zero". When the loop ends, \`read\` is at the end, so the invariant says the whole array is correct.

### Two in-place versions

- **Swap forward.** When \`read\` finds a non-zero, swap \`nums[read]\` with \`nums[write]\` and advance \`write\`. The zeros are carried along to the right by the swaps. Skipping the swap when \`read == write\` avoids useless writes at the start of the array.
- **Overwrite, then fill.** Copy each non-zero to \`nums[write]\` and advance \`write\`; after the loop, set every position from \`write\` to the end to 0. Always exactly n writes.

Neither is always better. Example 2 below counts the writes: with no zeros, swapping writes nothing while overwrite-and-fill writes n; with many leading zeros and many non-zeros, swapping writes about twice as much.

### Why not the obvious approaches

- **Remove each zero and append it at the end.** Removing from the middle of an array shifts everything after it, O(n) per removal, so O(n²) overall. Removing while iterating by index is also a classic bug (see the pitfalls).
- **Build a new array of non-zeros and pad with zeros.** O(n) time and correct, but O(n) extra memory, so it is not in place.
- **Sort with "is zero" as the key.** Works if the sort is stable, but it is O(n log n) for something that needs one pass.

This is also a building block: the same read/write pass removes any value, de-duplicates a sorted array, and is half of the [partition step in quicksort](/interview-question/how-do-merge-sort-and-quicksort-work). The coding-round version of this question is [Move Zeroes to End](/interview-question/move-zeroes-to-end).

## 4. The Solution in Python

In Python, "in place" means changing the list object the caller passed in. The function follows the standard-library convention for in-place operations (like \`list.sort()\`) and returns \`None\`.

~~~python
def move_zeroes(nums):
    """In place: non-zero values keep their order at the front, zeros go to the end."""
    write = 0                                  # next slot for a non-zero value
    for read in range(len(nums)):
        if nums[read] != 0:
            if read != write:
                nums[write], nums[read] = nums[read], nums[write]   # swap
            write += 1
~~~

**Line by line:**

- \`for read in range(len(nums))\` walks every index once.
- \`if read != write\` skips a pointless self-swap while there are no zeros yet; the result is the same without it, just with extra writes.
- \`nums[write], nums[read] = nums[read], nums[write]\` is Python's tuple swap: the right side is evaluated into a tuple first, then assigned.

### The other in-place variant

~~~python
def overwrite_then_fill(nums):
    """Variant A: copy non-zeros forward, then fill the tail with zeros. Returns writes."""
    writes = 0
    write = 0
    for x in nums:
        if x != 0:
            nums[write] = x
            write += 1
            writes += 1
    for i in range(write, len(nums)):
        nums[i] = 0
        writes += 1
    return writes
~~~

**The rebinding trap.** Assigning a new list to the parameter only rebinds the local name. In a test run, a function doing \`nums = [x for x in nums if x != 0] + [0] * nums.count(0)\` left the caller list \`[0, 1, 0, 3]\` unchanged; the same expression assigned with \`nums[:] = ...\` changed it to \`[1, 3, 0, 0]\`. Slice assignment works, but it builds the new list first, so it is O(n) extra space.

**The library one-liner.** \`nums.sort(key=lambda x: x == 0)\` sorts by \`False\` (non-zero) before \`True\` (zero). It keeps the non-zero order only because Python sorts are guaranteed to be stable ([Python Sorting HOW TO](https://docs.python.org/3/howto/sorting.html)). It is O(n log n) and not what the interviewer is testing, but it is a good thing to mention.

## 5. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — the main solution on edge cases** prints:

~~~text
[1, 3, 12, 0, 0]
[0]
[1, 2]
[]
[1, 0, 0]
[4, 2, 4, 3, 5, 1, 0, 0, 0]
[-1, -2, 0, 0]
~~~

**Example 2 — write counts of the two variants, plus a library one-liner** prints:

~~~text
[1, 2, 3, 4, 5] -> [1, 2, 3, 4, 5] | A writes 5, B writes 0
[0, 0, 0, 0, 1] -> [1, 0, 0, 0, 0] | A writes 5, B writes 2
[0, 1, 0, 3, 12] -> [1, 3, 12, 0, 0] | A writes 5, B writes 6
library one-liner: [1, 3, 12, 0, 0]
~~~

**What the write counts show:** overwrite-then-fill always does exactly n writes (5 here). Swap-forward does 0 writes when there are no zeros, 2 writes when one non-zero sits behind four zeros, but 6 writes on \`[0, 1, 0, 3, 12]\`, because three non-zeros each needed a two-write swap. Pick the variant to match the data if the interviewer asks about writes.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Remove each zero, append at end | O(n²) | O(1) | each removal shifts the rest of the array |
| Filtered copy, then pad with zeros | O(n) | O(n) | a second array |
| Stable sort by "is zero" | O(n log n) | depends on the sort | sorting for a one-pass job |
| Read/write swap forward | O(n) | O(1) | one pass; between 0 and about 2n writes |
| Read/write overwrite then fill | O(n) | O(1) | one pass plus the tail; exactly n writes |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Empty array:** nothing happens; the loop never runs.
- **No zeros** (\`[1, 2]\`): unchanged, and the swap version writes nothing.
- **All zeros** (\`[0]\`, \`[0, 0, 0]\`): unchanged.
- **Zeros only at the front** (\`[0, 0, 1]\`): becomes \`[1, 0, 0]\`.
- **Negative numbers** (\`[-1, 0, -2, 0]\`): they are non-zero, so they move forward in order: \`[-1, -2, 0, 0]\`.
- **Very large arrays:** still one pass and no allocation, which is the point of doing it in place.

## Common Pitfalls

- **Rebinding instead of mutating.** \`nums = new_list\` inside the function changes nothing for the caller; mutate with index assignment or \`nums[:] = ...\`.
- **\`remove(0)\` and \`append(0)\` in a loop.** Each \`remove\` shifts the rest of the list, O(n), so the whole thing is O(n²).
- **Counting zeros and then appending.** \`nums.count(0)\` plus a filtered list is fine, but it is not in place if you build a new list.
- **Returning the list and ignoring the mutation.** If you \`return nums\` and the caller also uses the original, they are the same object; be clear which you promise.
- **Treating \`0.0\` and \`False\` as different.** \`0.0 == 0\` and \`False == 0\` are both \`True\` in Python, so \`x != 0\` moves them too; ask if the list can contain them.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The approach:</strong> <span style="color:#f0e2c8;">Read/write pointers: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code> scans every index, and each non-zero is swapped to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[write]</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write += 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why order is kept:</strong> <span style="color:#f0e2c8;">Non-zeros are placed in the order <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code> meets them, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code> never passes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code>, so nothing overtakes anything.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space: one pass, two integers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The alternative:</strong> <span style="color:#f0e2c8;">Copy non-zeros forward, then fill the tail with zeros: always n writes, versus up to about 2n for swapping, and 0 when there are no zeros.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Mutate the list (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i] = ...</code>), do not rebind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums</code>; return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.sort()</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nums.remove(0)</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nums.append(0)</code> in a loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove</code> shifts every later element left, which is O(n), so k zeros cost O(n·k), up to O(n²).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if order does not matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use converging pointers: swap a zero at the front with a non-zero from the back. Fewer writes, but the non-zero order is lost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nums[:] = [x for x in nums if x] + [0] * nums.count(0)</code> in place?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It mutates the same list object, so the caller sees it, but it builds a temporary list: O(n) extra space, not O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you move all copies of some value <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">val</code> instead of 0?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same loop with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[read] != val</code>. That is also the "remove element" problem: return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code> as the new length.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prove it is correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">State the invariant: before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code> are the non-zeros seen so far in order, from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read - 1</code> are zeros. When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code> reaches the end, that is the answer.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **In place** | rearranging the input itself with O(1) extra memory |
| **Read/write pointers** | \`read\` scans everything, \`write\` marks where the next kept value goes |
| **Stable (order-preserving)** | equal-category elements keep their original relative order |
| **Loop invariant** | a fact that holds before and after every iteration |
| **Slice assignment** | \`nums[:] = ...\` replaces the contents of the same list object |

---
**Conclusion:** Moving zeros to the end in place is the read/write form of two pointers: \`read\` visits every element, \`write\` marks the next slot for a non-zero, and because \`write\` never passes \`read\`, the non-zero order is preserved. It is O(n) time and O(1) extra space, and the two in-place variants differ only in how many writes they make. In Python, the marks come from mutating the caller array correctly, avoiding the remove-while-iterating trap, and knowing which library shortcuts are in place and stable.`,
        examples: [
          { label: `Move zeroes with read/write pointers on edge cases`, code: `def move_zeroes(nums):
    """In place: non-zero values keep their order at the front, zeros go to the end."""
    write = 0                                  # next slot for a non-zero value
    for read in range(len(nums)):
        if nums[read] != 0:
            if read != write:
                nums[write], nums[read] = nums[read], nums[write]   # swap
            write += 1


def demo(nums):
    move_zeroes(nums)                          # returns None: the list itself changed
    return str(nums)


print(demo([0, 1, 0, 3, 12]))  # [1, 3, 12, 0, 0]
print(demo([0]))  # [0]
print(demo([1, 2]))  # [1, 2]
print(demo([]))  # []
print(demo([0, 0, 1]))  # [1, 0, 0]
print(demo([4, 2, 4, 0, 0, 3, 0, 5, 1]))  # [4, 2, 4, 3, 5, 1, 0, 0, 0]
print(demo([-1, 0, -2, 0]))  # [-1, -2, 0, 0]` },
          { label: `Swap forward vs overwrite then fill: counting writes`, code: `def overwrite_then_fill(nums):
    """Variant A: copy non-zeros forward, then fill the tail with zeros. Returns writes."""
    writes = 0
    write = 0
    for x in nums:
        if x != 0:
            nums[write] = x
            write += 1
            writes += 1
    for i in range(write, len(nums)):
        nums[i] = 0
        writes += 1
    return writes


def swap_forward(nums):
    """Variant B: swap each non-zero into place, skipping self-swaps. Returns writes."""
    writes = 0
    write = 0
    for read in range(len(nums)):
        if nums[read] != 0:
            if read != write:
                nums[write], nums[read] = nums[read], nums[write]
                writes += 2
            write += 1
    return writes


def compare(nums):
    a, b = list(nums), list(nums)          # list() copies: both variants get the same input
    wa = overwrite_then_fill(a)
    wb = swap_forward(b)
    return str(nums) + " -> " + str(a) + " | A writes " + str(wa) + ", B writes " + str(wb)


print(compare([1, 2, 3, 4, 5]))  # [1, 2, 3, 4, 5] -> [1, 2, 3, 4, 5] | A writes 5, B writes 0
print(compare([0, 0, 0, 0, 1]))  # [0, 0, 0, 0, 1] -> [1, 0, 0, 0, 0] | A writes 5, B writes 2
print(compare([0, 1, 0, 3, 12]))  # [0, 1, 0, 3, 12] -> [1, 3, 12, 0, 0] | A writes 5, B writes 6

# Library one-liner: list.sort is stable, and False < True, so non-zeros keep their order.
nums = [0, 1, 0, 3, 12]
nums.sort(key=lambda x: x == 0)
print("library one-liner: " + str(nums))  # library one-liner: [1, 3, 12, 0, 0]` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an array of integers, move all the zeros to the end while keeping the order of the non-zero numbers, and do it in place, without making a copy of the array. Please write it in JavaScript."

**What a strong answer should cover:**
- Read/write two pointers: \`read\` scans every element, \`write\` marks the next slot for a non-zero; swap (or copy) non-zeros forward.
- The invariant (non-zeros in order before \`write\`, zeros between \`write\` and \`read\`) and why it guarantees order is kept.
- O(n) time, O(1) extra space; why \`splice\` plus \`push\` is O(n²) (and buggy while iterating) and \`filter\` is O(n) space.
- The two in-place variants (swap forward versus overwrite then fill) and their write counts.
- JavaScript specifics: arrays are passed by reference so mutation is visible to the caller; \`filter\` and spread make copies; \`-0 === 0\` is \`true\`, so \`-0\` is treated as a zero.

**Clarifying questions expected:**
- "Must the order of non-zero values be kept?"
- "Is a temporary copy allowed, or must it be O(1) extra space?"

**Code / implementation expected:** Yes — \`moveZeroes(nums)\` in JavaScript with read and write indices, mutating the array and returning nothing.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A librarian has a shelf of books with some empty gaps where books were borrowed. She wants all the books pushed to the left, in the same order, and all the gaps at the right end, so new books can be added there. She does not have a second shelf to copy onto.

Her method: she keeps one hand at "the next spot where a book should go" and walks along the shelf with her eyes. Every time she sees a book, she moves it to the spot her hand marks and slides her hand one place right. Gaps she simply walks past. When she reaches the end, every book is on the left in its original order, and every gap has collected on the right. One walk, no second shelf.

That is the whole algorithm. The hand is the **write pointer**, the eyes are the **read pointer**, and "no second shelf" is what **in place** means.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must the non-zero values keep their original order? | If not, a faster swap-with-the-end trick works; the classic version says yes. |
| Must it be in place, with O(1) extra memory? | Rules out building a filtered copy, which is the easy answer. |
| Do you care about the number of writes? | Some variants minimise memory writes (for example, flash memory); it decides between the two in-place versions. |
| What counts as zero: only the integer 0, or also 0.0, -0, or null? | Changes the comparison, especially in dynamically typed languages. |
| Should the function return anything? | In-place functions usually return nothing; the caller sees the change in its own array. |

## 3. The Core Idea

📌 **Interview term: In place** — the algorithm rearranges the input array itself and uses only O(1) extra memory (a couple of index variables), instead of building a new array.

📌 **Interview term: Read/write pointers** — the same-direction form of the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique): \`read\` visits every element; \`write\` marks where the next element you want to keep should go. \`write\` never gets ahead of \`read\`.

📌 **Interview term: Stable (order-preserving)** — the non-zero values come out in the same relative order they went in. This is the same idea as a [stable sorting algorithm](/interview-question/what-is-a-stable-sorting-algorithm).

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="Move zeroes halfway through 0 1 0 3 12, write points at index 2 and read at index 4">
  <defs>
    <marker id="mz1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="85" y="30" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="50" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="85" y="70" text-anchor="middle">1</text>
  <text class="d-sub" x="185" y="30" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="150" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="185" y="70" text-anchor="middle">3</text>
  <text class="d-sub" x="285" y="30" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="250" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="285" y="70" text-anchor="middle">0</text>
  <text class="d-sub" x="385" y="30" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="350" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="385" y="70" text-anchor="middle">0</text>
  <text class="d-sub" x="485" y="30" text-anchor="middle">4</text>
  <rect class="d-box" x="450" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="485" y="70" text-anchor="middle">12</text>
  <path class="d-edge-accent" d="M 285 118 L 285 96" marker-end="url(#mz1-arrow)"/>
  <text class="d-text d-accent" x="285" y="136" text-anchor="middle">write</text>
  <path class="d-edge" d="M 485 118 L 485 96" marker-end="url(#mz1-arrow)"/>
  <text class="d-text" x="485" y="136" text-anchor="middle">read</text>
  <rect class="d-box-accent" x="30" y="176" width="160" height="66" rx="10"/>
  <text class="d-text" x="110" y="203" text-anchor="middle">0 to write-1</text>
  <text class="d-sub" x="110" y="225" text-anchor="middle">non-zeros, in order</text>
  <rect class="d-box-muted" x="220" y="176" width="160" height="66" rx="10"/>
  <text class="d-text" x="300" y="203" text-anchor="middle">write to read-1</text>
  <text class="d-sub" x="300" y="225" text-anchor="middle">only zeros</text>
  <rect class="d-box" x="410" y="176" width="160" height="66" rx="10"/>
  <text class="d-text" x="490" y="203" text-anchor="middle">read onward</text>
  <text class="d-sub" x="490" y="225" text-anchor="middle">not read yet</text>
</svg>

The picture is the array \`[0, 1, 0, 3, 12]\` after \`read\` has handled index 3. Three regions are always true (this is the **loop invariant**): positions before \`write\` hold the non-zeros seen so far, in order; positions from \`write\` up to \`read - 1\` hold only zeros; positions from \`read\` on are untouched. When \`read\` reaches 12 at index 4, it is swapped with the 0 at \`write\`, giving the final array below.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="Before and after moving zeroes, 0 1 0 3 12 becomes 1 3 12 0 0 with the non-zero order kept">
  <text class="d-text" x="40" y="70">before</text>
  <rect class="d-box-muted" x="160" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="190" y="70" text-anchor="middle">0</text>
  <rect class="d-box" x="244" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="274" y="70" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="328" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="358" y="70" text-anchor="middle">0</text>
  <rect class="d-box" x="412" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="442" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="496" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="526" y="70" text-anchor="middle">12</text>
  <text class="d-text" x="40" y="170">after</text>
  <rect class="d-box-accent" x="160" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="190" y="170" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="244" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="274" y="170" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="328" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="358" y="170" text-anchor="middle">12</text>
  <rect class="d-box-muted" x="412" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="442" y="170" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="496" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="526" y="170" text-anchor="middle">0</text>
</svg>

📌 **Interview term: Loop invariant** — a statement that holds before and after every iteration. Here it is "everything before \`write\` is the non-zeros in order, and everything from \`write\` to \`read - 1\` is zero". When the loop ends, \`read\` is at the end, so the invariant says the whole array is correct.

### Two in-place versions

- **Swap forward.** When \`read\` finds a non-zero, swap \`nums[read]\` with \`nums[write]\` and advance \`write\`. The zeros are carried along to the right by the swaps. Skipping the swap when \`read == write\` avoids useless writes at the start of the array.
- **Overwrite, then fill.** Copy each non-zero to \`nums[write]\` and advance \`write\`; after the loop, set every position from \`write\` to the end to 0. Always exactly n writes.

Neither is always better. Example 2 below counts the writes: with no zeros, swapping writes nothing while overwrite-and-fill writes n; with many leading zeros and many non-zeros, swapping writes about twice as much.

### Why not the obvious approaches

- **Remove each zero and append it at the end.** Removing from the middle of an array shifts everything after it, O(n) per removal, so O(n²) overall. Removing while iterating by index is also a classic bug (see the pitfalls).
- **Build a new array of non-zeros and pad with zeros.** O(n) time and correct, but O(n) extra memory, so it is not in place.
- **Sort with "is zero" as the key.** Works if the sort is stable, but it is O(n log n) for something that needs one pass.

This is also a building block: the same read/write pass removes any value, de-duplicates a sorted array, and is half of the [partition step in quicksort](/interview-question/how-do-merge-sort-and-quicksort-work). The coding-round version of this question is [Move Zeroes to End](/interview-question/move-zeroes-to-end).

## 4. The Solution in JavaScript

JavaScript passes the array object by reference, so writing \`nums[i] = ...\` inside the function changes the caller array. The function returns \`undefined\`, the usual signal that it works in place.

~~~javascript
function moveZeroes(nums) {
  // In place: non-zero values keep their order at the front, zeros go to the end.
  let write = 0; // next slot for a non-zero value
  for (let read = 0; read < nums.length; read++) {
    if (nums[read] !== 0) {
      if (read !== write) {
        [nums[write], nums[read]] = [nums[read], nums[write]]; // swap
      }
      write++;
    }
  }
}
~~~

**Line by line:**

- \`if (nums[read] !== 0)\` uses strict comparison, so a string \`"0"\` in the array is not treated as a zero (with \`!=\` it would be).
- \`if (read !== write)\` skips pointless self-swaps while there are no zeros yet.
- \`[nums[write], nums[read]] = [nums[read], nums[write]]\` is a destructuring swap; a temporary variable does the same.

### The other in-place variant

~~~javascript
function overwriteThenFill(nums) {
  // Variant A: copy non-zeros forward, then fill the tail with zeros. Returns writes.
  let writes = 0;
  let write = 0;
  for (const x of nums) {
    if (x !== 0) {
      nums[write++] = x;
      writes++;
    }
  }
  for (let i = write; i < nums.length; i++) {
    nums[i] = 0;
    writes++;
  }
  return writes;
}
~~~

**The splice trap.** Removing while iterating by index skips elements. In a test run, \`for (let i = 0; i < a.length; i++) if (a[i] === 0) { a.splice(i, 1); a.push(0); }\` turned \`[0, 0, 1]\` into \`[0, 1, 0]\`, which is wrong: after the first \`splice\`, the second zero slid into index 0, and \`i\` had already moved on. It is also O(n²), because each \`splice\` shifts the rest of the array.

**Copies are not in place.** \`nums.filter(x => x !== 0)\` and \`[...nums]\` build new arrays. They are fine when a copy is allowed, but they are O(n) extra space.

**The library one-liner.** \`nums.sort((x, y) => (x === 0) - (y === 0))\` keeps the non-zero order because \`Array.prototype.sort\` must be stable since ES2019 ([V8: stable Array.prototype.sort](https://v8.dev/features/stable-sort)). It is O(n log n) and it is the version used in Example 2. Also note that \`-0 === 0\` printed \`true\` in Node, so \`-0\` is moved like any other zero (\`Object.is(-0, 0)\` is the only common test that tells them apart).

## 5. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — the main solution on edge cases** prints:

~~~text
[1, 3, 12, 0, 0]
[0]
[1, 2]
[]
[1, 0, 0]
[4, 2, 4, 3, 5, 1, 0, 0, 0]
[-1, -2, 0, 0]
~~~

**Example 2 — write counts of the two variants, plus a library one-liner** prints:

~~~text
[1, 2, 3, 4, 5] -> [1, 2, 3, 4, 5] | A writes 5, B writes 0
[0, 0, 0, 0, 1] -> [1, 0, 0, 0, 0] | A writes 5, B writes 2
[0, 1, 0, 3, 12] -> [1, 3, 12, 0, 0] | A writes 5, B writes 6
library one-liner: [1, 3, 12, 0, 0]
~~~

**What the write counts show:** overwrite-then-fill always does exactly n writes (5 here). Swap-forward does 0 writes when there are no zeros, 2 writes when one non-zero sits behind four zeros, but 6 writes on \`[0, 1, 0, 3, 12]\`, because three non-zeros each needed a two-write swap. Pick the variant to match the data if the interviewer asks about writes.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Remove each zero, append at end | O(n²) | O(1) | each removal shifts the rest of the array |
| Filtered copy, then pad with zeros | O(n) | O(n) | a second array |
| Stable sort by "is zero" | O(n log n) | depends on the sort | sorting for a one-pass job |
| Read/write swap forward | O(n) | O(1) | one pass; between 0 and about 2n writes |
| Read/write overwrite then fill | O(n) | O(1) | one pass plus the tail; exactly n writes |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Empty array:** nothing happens; the loop never runs.
- **No zeros** (\`[1, 2]\`): unchanged, and the swap version writes nothing.
- **All zeros** (\`[0]\`, \`[0, 0, 0]\`): unchanged.
- **Zeros only at the front** (\`[0, 0, 1]\`): becomes \`[1, 0, 0]\`.
- **Negative numbers** (\`[-1, 0, -2, 0]\`): they are non-zero, so they move forward in order: \`[-1, -2, 0, 0]\`.
- **Very large arrays:** still one pass and no allocation, which is the point of doing it in place.

## Common Pitfalls

- **\`splice\` while looping forward.** It skips the element that slides into the current index; \`[0, 0, 1]\` became \`[0, 1, 0]\` in a test.
- **Thinking \`filter\` is in place.** It returns a new array; the original is untouched unless you copy back into it.
- **Reassigning the parameter.** \`nums = nums.filter(...)\` inside the function only changes the local variable; the caller array is unchanged.
- **Plain \`.sort()\` without a comparator.** It compares numbers as strings and puts the zeros first, not last; even with a comparator, sorting is O(n log n).
- **Loose comparison.** \`nums[read] != 0\` treats \`"0"\`, \`""\`, \`false\` and \`null\`-ish values inconsistently; use \`!== 0\` and ask what the array can contain.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The approach:</strong> <span style="color:#f0e2c8;">Read/write pointers: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code> scans every index, and each non-zero is swapped to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[write]</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write++</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why order is kept:</strong> <span style="color:#f0e2c8;">Non-zeros are placed in the order <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code> meets them, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code> never passes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code>, so nothing overtakes anything.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space: one pass, two numbers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The alternative:</strong> <span style="color:#f0e2c8;">Copy non-zeros forward, then fill the tail with zeros: always n writes, versus up to about 2n for swapping, and 0 when there are no zeros.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Mutate the array, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code> while looping forward, and remember <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter</code> and spread are copies.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">splice</code> each zero and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">push</code> it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code> shifts the rest of the array (O(n), so O(n²) total), and looping forward skips the element that slides into the removed slot.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if order does not matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use converging pointers: swap a zero at the front with a non-zero from the back. Fewer writes, but the non-zero order is lost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nums.sort((a, b) =&gt; (a === 0) - (b === 0))</code> correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, because sort is stable in ES2019 and later, so the non-zero order is kept. But it is O(n log n), and the question asks for the one-pass idea.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you move all copies of some value <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">val</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same loop with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[read] !== val</code>; returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code> gives the new length, which is the "remove element" problem.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">-0</code> count as zero here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-0 === 0</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!== 0</code> treats it as zero. Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is</code> distinguishes them.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **In place** | rearranging the input itself with O(1) extra memory |
| **Read/write pointers** | \`read\` scans everything, \`write\` marks where the next kept value goes |
| **Stable (order-preserving)** | equal-category elements keep their original relative order |
| **Loop invariant** | a fact that holds before and after every iteration |
| **Destructuring swap** | \`[a, b] = [b, a]\`: swap two slots in one statement |

---
**Conclusion:** Moving zeros to the end in place is the read/write form of two pointers: \`read\` visits every element, \`write\` marks the next slot for a non-zero, and because \`write\` never passes \`read\`, the non-zero order is preserved. It is O(n) time and O(1) extra space, and the two in-place variants differ only in how many writes they make. In JavaScript, the marks come from mutating the caller array correctly, avoiding the remove-while-iterating trap, and knowing which library shortcuts are in place and stable.`,
        examples: [
          { label: `Move zeroes with read/write pointers on edge cases`, code: `function moveZeroes(nums) {
  // In place: non-zero values keep their order at the front, zeros go to the end.
  let write = 0; // next slot for a non-zero value
  for (let read = 0; read < nums.length; read++) {
    if (nums[read] !== 0) {
      if (read !== write) {
        [nums[write], nums[read]] = [nums[read], nums[write]]; // swap
      }
      write++;
    }
  }
}

const fmt = (a) => '[' + a.join(', ') + ']';
function demo(nums) {
  moveZeroes(nums); // returns undefined: the array itself changed
  return fmt(nums);
}

console.log(demo([0, 1, 0, 3, 12])); // [1, 3, 12, 0, 0]
console.log(demo([0])); // [0]
console.log(demo([1, 2])); // [1, 2]
console.log(demo([])); // []
console.log(demo([0, 0, 1])); // [1, 0, 0]
console.log(demo([4, 2, 4, 0, 0, 3, 0, 5, 1])); // [4, 2, 4, 3, 5, 1, 0, 0, 0]
console.log(demo([-1, 0, -2, 0])); // [-1, -2, 0, 0]` },
          { label: `Swap forward vs overwrite then fill: counting writes`, code: `function overwriteThenFill(nums) {
  // Variant A: copy non-zeros forward, then fill the tail with zeros. Returns writes.
  let writes = 0;
  let write = 0;
  for (const x of nums) {
    if (x !== 0) {
      nums[write++] = x;
      writes++;
    }
  }
  for (let i = write; i < nums.length; i++) {
    nums[i] = 0;
    writes++;
  }
  return writes;
}

function swapForward(nums) {
  // Variant B: swap each non-zero into place, skipping self-swaps. Returns writes.
  let writes = 0;
  let write = 0;
  for (let read = 0; read < nums.length; read++) {
    if (nums[read] !== 0) {
      if (read !== write) {
        [nums[write], nums[read]] = [nums[read], nums[write]];
        writes += 2;
      }
      write++;
    }
  }
  return writes;
}

const fmt = (a) => '[' + a.join(', ') + ']';
function compare(nums) {
  const a = nums.slice(); // slice() copies: both variants get the same input
  const b = nums.slice();
  const wa = overwriteThenFill(a);
  const wb = swapForward(b);
  return fmt(nums) + ' -> ' + fmt(a) + ' | A writes ' + wa + ', B writes ' + wb;
}

console.log(compare([1, 2, 3, 4, 5])); // [1, 2, 3, 4, 5] -> [1, 2, 3, 4, 5] | A writes 5, B writes 0
console.log(compare([0, 0, 0, 0, 1])); // [0, 0, 0, 0, 1] -> [1, 0, 0, 0, 0] | A writes 5, B writes 2
console.log(compare([0, 1, 0, 3, 12])); // [0, 1, 0, 3, 12] -> [1, 3, 12, 0, 0] | A writes 5, B writes 6

// Library one-liner: sort with a comparator (Array.prototype.sort is stable in ES2019+).
const nums = [0, 1, 0, 3, 12];
nums.sort((x, y) => (x === 0) - (y === 0));
console.log('library one-liner: ' + fmt(nums)); // library one-liner: [1, 3, 12, 0, 0]` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an int array, move all the zeros to the end while keeping the order of the non-zero numbers, and do it in place, without allocating another array. Please write it in Java."

**What a strong answer should cover:**
- Read/write two pointers: \`read\` scans every element, \`write\` marks the next slot for a non-zero; swap (or copy) non-zeros forward.
- The invariant (non-zeros in order before \`write\`, zeros between \`write\` and \`read\`) and why it guarantees order is kept.
- O(n) time, O(1) extra space; why shifting elements for each zero is O(n²) and a stream-built array is O(n) space.
- The two in-place variants (swap forward versus overwrite then fill with \`Arrays.fill\`) and their write counts.
- Java specifics: the array reference is passed by value, so the method mutates the caller array; a primitive \`int[]\` avoids boxing; a \`List<Integer>\` would need \`.equals\` or unboxing for comparisons.

**Clarifying questions expected:**
- "Must the order of non-zero values be kept?"
- "Is a temporary array allowed, or must it be O(1) extra space?"

**Code / implementation expected:** Yes — \`static void moveZeroes(int[] nums)\` in Java with read and write indices.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A librarian has a shelf of books with some empty gaps where books were borrowed. She wants all the books pushed to the left, in the same order, and all the gaps at the right end, so new books can be added there. She does not have a second shelf to copy onto.

Her method: she keeps one hand at "the next spot where a book should go" and walks along the shelf with her eyes. Every time she sees a book, she moves it to the spot her hand marks and slides her hand one place right. Gaps she simply walks past. When she reaches the end, every book is on the left in its original order, and every gap has collected on the right. One walk, no second shelf.

That is the whole algorithm. The hand is the **write pointer**, the eyes are the **read pointer**, and "no second shelf" is what **in place** means.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must the non-zero values keep their original order? | If not, a faster swap-with-the-end trick works; the classic version says yes. |
| Must it be in place, with O(1) extra memory? | Rules out building a filtered copy, which is the easy answer. |
| Do you care about the number of writes? | Some variants minimise memory writes (for example, flash memory); it decides between the two in-place versions. |
| What counts as zero: only the integer 0, or also 0.0, -0, or null? | Changes the comparison, especially in dynamically typed languages. |
| Should the function return anything? | In-place functions usually return nothing; the caller sees the change in its own array. |

## 3. The Core Idea

📌 **Interview term: In place** — the algorithm rearranges the input array itself and uses only O(1) extra memory (a couple of index variables), instead of building a new array.

📌 **Interview term: Read/write pointers** — the same-direction form of the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique): \`read\` visits every element; \`write\` marks where the next element you want to keep should go. \`write\` never gets ahead of \`read\`.

📌 **Interview term: Stable (order-preserving)** — the non-zero values come out in the same relative order they went in. This is the same idea as a [stable sorting algorithm](/interview-question/what-is-a-stable-sorting-algorithm).

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="Move zeroes halfway through 0 1 0 3 12, write points at index 2 and read at index 4">
  <defs>
    <marker id="mz1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="85" y="30" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="50" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="85" y="70" text-anchor="middle">1</text>
  <text class="d-sub" x="185" y="30" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="150" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="185" y="70" text-anchor="middle">3</text>
  <text class="d-sub" x="285" y="30" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="250" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="285" y="70" text-anchor="middle">0</text>
  <text class="d-sub" x="385" y="30" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="350" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="385" y="70" text-anchor="middle">0</text>
  <text class="d-sub" x="485" y="30" text-anchor="middle">4</text>
  <rect class="d-box" x="450" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="485" y="70" text-anchor="middle">12</text>
  <path class="d-edge-accent" d="M 285 118 L 285 96" marker-end="url(#mz1-arrow)"/>
  <text class="d-text d-accent" x="285" y="136" text-anchor="middle">write</text>
  <path class="d-edge" d="M 485 118 L 485 96" marker-end="url(#mz1-arrow)"/>
  <text class="d-text" x="485" y="136" text-anchor="middle">read</text>
  <rect class="d-box-accent" x="30" y="176" width="160" height="66" rx="10"/>
  <text class="d-text" x="110" y="203" text-anchor="middle">0 to write-1</text>
  <text class="d-sub" x="110" y="225" text-anchor="middle">non-zeros, in order</text>
  <rect class="d-box-muted" x="220" y="176" width="160" height="66" rx="10"/>
  <text class="d-text" x="300" y="203" text-anchor="middle">write to read-1</text>
  <text class="d-sub" x="300" y="225" text-anchor="middle">only zeros</text>
  <rect class="d-box" x="410" y="176" width="160" height="66" rx="10"/>
  <text class="d-text" x="490" y="203" text-anchor="middle">read onward</text>
  <text class="d-sub" x="490" y="225" text-anchor="middle">not read yet</text>
</svg>

The picture is the array \`[0, 1, 0, 3, 12]\` after \`read\` has handled index 3. Three regions are always true (this is the **loop invariant**): positions before \`write\` hold the non-zeros seen so far, in order; positions from \`write\` up to \`read - 1\` hold only zeros; positions from \`read\` on are untouched. When \`read\` reaches 12 at index 4, it is swapped with the 0 at \`write\`, giving the final array below.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="Before and after moving zeroes, 0 1 0 3 12 becomes 1 3 12 0 0 with the non-zero order kept">
  <text class="d-text" x="40" y="70">before</text>
  <rect class="d-box-muted" x="160" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="190" y="70" text-anchor="middle">0</text>
  <rect class="d-box" x="244" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="274" y="70" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="328" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="358" y="70" text-anchor="middle">0</text>
  <rect class="d-box" x="412" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="442" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="496" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="526" y="70" text-anchor="middle">12</text>
  <text class="d-text" x="40" y="170">after</text>
  <rect class="d-box-accent" x="160" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="190" y="170" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="244" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="274" y="170" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="328" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="358" y="170" text-anchor="middle">12</text>
  <rect class="d-box-muted" x="412" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="442" y="170" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="496" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="526" y="170" text-anchor="middle">0</text>
</svg>

📌 **Interview term: Loop invariant** — a statement that holds before and after every iteration. Here it is "everything before \`write\` is the non-zeros in order, and everything from \`write\` to \`read - 1\` is zero". When the loop ends, \`read\` is at the end, so the invariant says the whole array is correct.

### Two in-place versions

- **Swap forward.** When \`read\` finds a non-zero, swap \`nums[read]\` with \`nums[write]\` and advance \`write\`. The zeros are carried along to the right by the swaps. Skipping the swap when \`read == write\` avoids useless writes at the start of the array.
- **Overwrite, then fill.** Copy each non-zero to \`nums[write]\` and advance \`write\`; after the loop, set every position from \`write\` to the end to 0. Always exactly n writes.

Neither is always better. Example 2 below counts the writes: with no zeros, swapping writes nothing while overwrite-and-fill writes n; with many leading zeros and many non-zeros, swapping writes about twice as much.

### Why not the obvious approaches

- **Remove each zero and append it at the end.** Removing from the middle of an array shifts everything after it, O(n) per removal, so O(n²) overall. Removing while iterating by index is also a classic bug (see the pitfalls).
- **Build a new array of non-zeros and pad with zeros.** O(n) time and correct, but O(n) extra memory, so it is not in place.
- **Sort with "is zero" as the key.** Works if the sort is stable, but it is O(n log n) for something that needs one pass.

This is also a building block: the same read/write pass removes any value, de-duplicates a sorted array, and is half of the [partition step in quicksort](/interview-question/how-do-merge-sort-and-quicksort-work). The coding-round version of this question is [Move Zeroes to End](/interview-question/move-zeroes-to-end).

## 4. The Solution in Java

The method is \`void\` and mutates the array it receives. Java passes the array reference by value, so the caller and the method share the same array object.

~~~java
// In place: non-zero values keep their order at the front, zeros go to the end.
static void moveZeroes(int[] nums) {
    int write = 0; // next slot for a non-zero value
    for (int read = 0; read < nums.length; read++) {
        if (nums[read] != 0) {
            if (read != write) {
                int tmp = nums[write];
                nums[write] = nums[read];
                nums[read] = tmp;
            }
            write++;
        }
    }
}
~~~

**Line by line:**

- \`for (int read = 0; read < nums.length; read++)\` visits every index once.
- \`if (read != write)\` skips pointless self-swaps while there are no zeros yet.
- Java has no tuple swap, so the swap uses a temporary \`int\`.

### The other in-place variant

~~~java
// Variant A: copy non-zeros forward, then fill the tail with zeros. Returns writes.
static int overwriteThenFill(int[] nums) {
    int writes = 0, write = 0;
    for (int x : nums) {
        if (x != 0) {
            nums[write++] = x;
            writes++;
        }
    }
    for (int i = write; i < nums.length; i++) {
        nums[i] = 0;
        writes++;
    }
    return writes;
}
~~~

**A tidier overwrite-then-fill.** The fill loop can be one call: \`Arrays.fill(nums, write, nums.length, 0)\` sets the range from \`write\` (inclusive) to the end (exclusive) to 0.

**Streams are not in place.** The "library one-liner" in Example 2 uses \`Arrays.stream(nums).filter(x -> x != 0).toArray()\` and \`IntStream.concat\`. It is readable, but it allocates new arrays, so it is O(n) extra space; say that if you mention it.

**Boxed lists.** On a \`List<Integer>\`, \`list.get(i) != 0\` unboxes and compares values, which is fine, but comparing two elements with \`list.get(i) == list.get(j)\` compares references: in a test, two \`Integer\` values of 127 compared equal and two of 128 did not. Prefer \`int[]\` for this problem.

## 5. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — the main solution on edge cases** prints:

~~~text
[1, 3, 12, 0, 0]
[0]
[1, 2]
[]
[1, 0, 0]
[4, 2, 4, 3, 5, 1, 0, 0, 0]
[-1, -2, 0, 0]
~~~

**Example 2 — write counts of the two variants, plus a library one-liner** prints:

~~~text
[1, 2, 3, 4, 5] -> [1, 2, 3, 4, 5] | A writes 5, B writes 0
[0, 0, 0, 0, 1] -> [1, 0, 0, 0, 0] | A writes 5, B writes 2
[0, 1, 0, 3, 12] -> [1, 3, 12, 0, 0] | A writes 5, B writes 6
library one-liner: [1, 3, 12, 0, 0]
~~~

**What the write counts show:** overwrite-then-fill always does exactly n writes (5 here). Swap-forward does 0 writes when there are no zeros, 2 writes when one non-zero sits behind four zeros, but 6 writes on \`[0, 1, 0, 3, 12]\`, because three non-zeros each needed a two-write swap. Pick the variant to match the data if the interviewer asks about writes.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Remove each zero, append at end | O(n²) | O(1) | each removal shifts the rest of the array |
| Filtered copy, then pad with zeros | O(n) | O(n) | a second array |
| Stable sort by "is zero" | O(n log n) | depends on the sort | sorting for a one-pass job |
| Read/write swap forward | O(n) | O(1) | one pass; between 0 and about 2n writes |
| Read/write overwrite then fill | O(n) | O(1) | one pass plus the tail; exactly n writes |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Empty array:** nothing happens; the loop never runs.
- **No zeros** (\`[1, 2]\`): unchanged, and the swap version writes nothing.
- **All zeros** (\`[0]\`, \`[0, 0, 0]\`): unchanged.
- **Zeros only at the front** (\`[0, 0, 1]\`): becomes \`[1, 0, 0]\`.
- **Negative numbers** (\`[-1, 0, -2, 0]\`): they are non-zero, so they move forward in order: \`[-1, -2, 0, 0]\`.
- **Very large arrays:** still one pass and no allocation, which is the point of doing it in place.

## Common Pitfalls

- **Allocating a new array and returning it.** Correct output, but not in place, and a \`void\` signature means the caller never sees it.
- **Reassigning the parameter.** \`nums = newArray;\` inside the method changes only the local reference; the caller array is untouched.
- **Shifting the tail for every zero.** A \`System.arraycopy\` per zero is O(n) each, O(n²) overall.
- **Removing from an \`ArrayList\` while iterating.** A for-each loop with \`list.remove(...)\` throws \`ConcurrentModificationException\`; an index loop skips elements.
- **Printing the array directly.** \`System.out.println(nums)\` prints a type-and-hash string; use \`Arrays.toString(nums)\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The approach:</strong> <span style="color:#f0e2c8;">Read/write pointers: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code> scans every index, and each non-zero is swapped to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[write]</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write++</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why order is kept:</strong> <span style="color:#f0e2c8;">Non-zeros are placed in the order <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code> meets them, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code> never passes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code>, so nothing overtakes anything.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space: one pass, two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>s.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The alternative:</strong> <span style="color:#f0e2c8;">Copy non-zeros forward, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.fill(nums, write, nums.length, 0)</code>: always n writes, versus up to about 2n for swapping.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">The method is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code> and mutates the shared array; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List&lt;Integer&gt;</code>, and print with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.toString</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the caller see the change if Java is pass-by-value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The value passed is the reference to the array, so both variables point at the same array object. Reassigning the parameter would not affect the caller.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if order does not matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use converging pointers: swap a zero at the front with a non-zero from the back. Fewer writes, but the non-zero order is lost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you do it on an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ArrayList&lt;Integer&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same read/write loop with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.set(write, list.get(read))</code>, then set the tail to 0. Avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove</code> in a loop: it shifts elements and is O(n²).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you move all copies of some value <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">val</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same loop with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[read] != val</code>; returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code> gives the new length, which is the "remove element" problem.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prove it is correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Invariant: before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code> are the non-zeros seen so far in order; from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read - 1</code> are zeros. At the end, that is the whole answer.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **In place** | rearranging the input itself with O(1) extra memory |
| **Read/write pointers** | \`read\` scans everything, \`write\` marks where the next kept value goes |
| **Stable (order-preserving)** | equal-category elements keep their original relative order |
| **Loop invariant** | a fact that holds before and after every iteration |
| **Pass reference by value** | Java copies the reference, so method and caller share one array object |

---
**Conclusion:** Moving zeros to the end in place is the read/write form of two pointers: \`read\` visits every element, \`write\` marks the next slot for a non-zero, and because \`write\` never passes \`read\`, the non-zero order is preserved. It is O(n) time and O(1) extra space, and the two in-place variants differ only in how many writes they make. In Java, the marks come from mutating the caller array correctly, avoiding the remove-while-iterating trap, and knowing which library shortcuts are in place and stable.`,
        examples: [
          { label: `Move zeroes with read/write pointers on edge cases`, code: `import java.util.Arrays;

public class Main {
    // In place: non-zero values keep their order at the front, zeros go to the end.
    static void moveZeroes(int[] nums) {
        int write = 0; // next slot for a non-zero value
        for (int read = 0; read < nums.length; read++) {
            if (nums[read] != 0) {
                if (read != write) {
                    int tmp = nums[write];
                    nums[write] = nums[read];
                    nums[read] = tmp;
                }
                write++;
            }
        }
    }

    static String demo(int[] nums) {
        moveZeroes(nums); // the array object itself changed; the reference was passed by value
        return Arrays.toString(nums);
    }

    public static void main(String[] args) {
        System.out.println(demo(new int[]{0, 1, 0, 3, 12}));             // [1, 3, 12, 0, 0]
        System.out.println(demo(new int[]{0}));                          // [0]
        System.out.println(demo(new int[]{1, 2}));                       // [1, 2]
        System.out.println(demo(new int[]{}));                           // []
        System.out.println(demo(new int[]{0, 0, 1}));                    // [1, 0, 0]
        System.out.println(demo(new int[]{4, 2, 4, 0, 0, 3, 0, 5, 1}));  // [4, 2, 4, 3, 5, 1, 0, 0, 0]
        System.out.println(demo(new int[]{-1, 0, -2, 0}));               // [-1, -2, 0, 0]
    }
}` },
          { label: `Swap forward vs overwrite then fill: counting writes`, code: `import java.util.Arrays;
import java.util.stream.IntStream;

public class Main {
    // Variant A: copy non-zeros forward, then fill the tail with zeros. Returns writes.
    static int overwriteThenFill(int[] nums) {
        int writes = 0, write = 0;
        for (int x : nums) {
            if (x != 0) {
                nums[write++] = x;
                writes++;
            }
        }
        for (int i = write; i < nums.length; i++) {
            nums[i] = 0;
            writes++;
        }
        return writes;
    }

    // Variant B: swap each non-zero into place, skipping self-swaps. Returns writes.
    static int swapForward(int[] nums) {
        int writes = 0, write = 0;
        for (int read = 0; read < nums.length; read++) {
            if (nums[read] != 0) {
                if (read != write) {
                    int tmp = nums[write];
                    nums[write] = nums[read];
                    nums[read] = tmp;
                    writes += 2;
                }
                write++;
            }
        }
        return writes;
    }

    static String compare(int[] nums) {
        int[] a = nums.clone(), b = nums.clone(); // clone(): both variants get the same input
        int wa = overwriteThenFill(a);
        int wb = swapForward(b);
        return Arrays.toString(nums) + " -> " + Arrays.toString(a) + " | A writes " + wa + ", B writes " + wb;
    }

    public static void main(String[] args) {
        System.out.println(compare(new int[]{1, 2, 3, 4, 5}));   // ... A writes 5, B writes 0
        System.out.println(compare(new int[]{0, 0, 0, 0, 1}));   // ... A writes 5, B writes 2
        System.out.println(compare(new int[]{0, 1, 0, 3, 12}));  // ... A writes 5, B writes 6

        // Library version: a stream builds a NEW array (O(n) extra space), not in place.
        int[] nums = {0, 1, 0, 3, 12};
        int[] nonZero = Arrays.stream(nums).filter(x -> x != 0).toArray();
        int[] result = IntStream.concat(Arrays.stream(nonZero), IntStream.range(0, nums.length - nonZero.length).map(i -> 0)).toArray();
        System.out.println("library one-liner: " + Arrays.toString(result)); // [1, 3, 12, 0, 0]
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a vector of ints, move all the zeros to the end while keeping the order of the non-zero numbers, and do it in place. Please write it in C++."

**What a strong answer should cover:**
- Read/write two pointers: \`read\` scans every element, \`write\` marks the next slot for a non-zero; swap (or copy) non-zeros forward.
- The invariant (non-zeros in order before \`write\`, zeros between \`write\` and \`read\`) and why it guarantees order is kept.
- O(n) time, O(1) extra space; why \`erase\` plus \`push_back\` per zero is O(n²).
- The two in-place variants (swap forward versus overwrite then fill) and their write counts.
- C++ specifics: take the vector by \`vector<int>&\` (by value would change a copy); the idiom \`std::fill(std::remove(v.begin(), v.end(), 0), v.end(), 0)\`; \`std::partition\` is not order-preserving, \`std::stable_partition\` is.

**Clarifying questions expected:**
- "Must the order of non-zero values be kept?"
- "Is a temporary buffer allowed, or must it be O(1) extra space?"

**Code / implementation expected:** Yes — \`void moveZeroes(std::vector<int>& nums)\` in C++ with read and write indices.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A librarian has a shelf of books with some empty gaps where books were borrowed. She wants all the books pushed to the left, in the same order, and all the gaps at the right end, so new books can be added there. She does not have a second shelf to copy onto.

Her method: she keeps one hand at "the next spot where a book should go" and walks along the shelf with her eyes. Every time she sees a book, she moves it to the spot her hand marks and slides her hand one place right. Gaps she simply walks past. When she reaches the end, every book is on the left in its original order, and every gap has collected on the right. One walk, no second shelf.

That is the whole algorithm. The hand is the **write pointer**, the eyes are the **read pointer**, and "no second shelf" is what **in place** means.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must the non-zero values keep their original order? | If not, a faster swap-with-the-end trick works; the classic version says yes. |
| Must it be in place, with O(1) extra memory? | Rules out building a filtered copy, which is the easy answer. |
| Do you care about the number of writes? | Some variants minimise memory writes (for example, flash memory); it decides between the two in-place versions. |
| What counts as zero: only the integer 0, or also 0.0, -0, or null? | Changes the comparison, especially in dynamically typed languages. |
| Should the function return anything? | In-place functions usually return nothing; the caller sees the change in its own array. |

## 3. The Core Idea

📌 **Interview term: In place** — the algorithm rearranges the input array itself and uses only O(1) extra memory (a couple of index variables), instead of building a new array.

📌 **Interview term: Read/write pointers** — the same-direction form of the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique): \`read\` visits every element; \`write\` marks where the next element you want to keep should go. \`write\` never gets ahead of \`read\`.

📌 **Interview term: Stable (order-preserving)** — the non-zero values come out in the same relative order they went in. This is the same idea as a [stable sorting algorithm](/interview-question/what-is-a-stable-sorting-algorithm).

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="Move zeroes halfway through 0 1 0 3 12, write points at index 2 and read at index 4">
  <defs>
    <marker id="mz1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="85" y="30" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="50" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="85" y="70" text-anchor="middle">1</text>
  <text class="d-sub" x="185" y="30" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="150" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="185" y="70" text-anchor="middle">3</text>
  <text class="d-sub" x="285" y="30" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="250" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="285" y="70" text-anchor="middle">0</text>
  <text class="d-sub" x="385" y="30" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="350" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="385" y="70" text-anchor="middle">0</text>
  <text class="d-sub" x="485" y="30" text-anchor="middle">4</text>
  <rect class="d-box" x="450" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="485" y="70" text-anchor="middle">12</text>
  <path class="d-edge-accent" d="M 285 118 L 285 96" marker-end="url(#mz1-arrow)"/>
  <text class="d-text d-accent" x="285" y="136" text-anchor="middle">write</text>
  <path class="d-edge" d="M 485 118 L 485 96" marker-end="url(#mz1-arrow)"/>
  <text class="d-text" x="485" y="136" text-anchor="middle">read</text>
  <rect class="d-box-accent" x="30" y="176" width="160" height="66" rx="10"/>
  <text class="d-text" x="110" y="203" text-anchor="middle">0 to write-1</text>
  <text class="d-sub" x="110" y="225" text-anchor="middle">non-zeros, in order</text>
  <rect class="d-box-muted" x="220" y="176" width="160" height="66" rx="10"/>
  <text class="d-text" x="300" y="203" text-anchor="middle">write to read-1</text>
  <text class="d-sub" x="300" y="225" text-anchor="middle">only zeros</text>
  <rect class="d-box" x="410" y="176" width="160" height="66" rx="10"/>
  <text class="d-text" x="490" y="203" text-anchor="middle">read onward</text>
  <text class="d-sub" x="490" y="225" text-anchor="middle">not read yet</text>
</svg>

The picture is the array \`[0, 1, 0, 3, 12]\` after \`read\` has handled index 3. Three regions are always true (this is the **loop invariant**): positions before \`write\` hold the non-zeros seen so far, in order; positions from \`write\` up to \`read - 1\` hold only zeros; positions from \`read\` on are untouched. When \`read\` reaches 12 at index 4, it is swapped with the 0 at \`write\`, giving the final array below.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="Before and after moving zeroes, 0 1 0 3 12 becomes 1 3 12 0 0 with the non-zero order kept">
  <text class="d-text" x="40" y="70">before</text>
  <rect class="d-box-muted" x="160" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="190" y="70" text-anchor="middle">0</text>
  <rect class="d-box" x="244" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="274" y="70" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="328" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="358" y="70" text-anchor="middle">0</text>
  <rect class="d-box" x="412" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="442" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="496" y="40" width="60" height="50" rx="6"/>
  <text class="d-text" x="526" y="70" text-anchor="middle">12</text>
  <text class="d-text" x="40" y="170">after</text>
  <rect class="d-box-accent" x="160" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="190" y="170" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="244" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="274" y="170" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="328" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="358" y="170" text-anchor="middle">12</text>
  <rect class="d-box-muted" x="412" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="442" y="170" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="496" y="140" width="60" height="50" rx="6"/>
  <text class="d-text" x="526" y="170" text-anchor="middle">0</text>
</svg>

📌 **Interview term: Loop invariant** — a statement that holds before and after every iteration. Here it is "everything before \`write\` is the non-zeros in order, and everything from \`write\` to \`read - 1\` is zero". When the loop ends, \`read\` is at the end, so the invariant says the whole array is correct.

### Two in-place versions

- **Swap forward.** When \`read\` finds a non-zero, swap \`nums[read]\` with \`nums[write]\` and advance \`write\`. The zeros are carried along to the right by the swaps. Skipping the swap when \`read == write\` avoids useless writes at the start of the array.
- **Overwrite, then fill.** Copy each non-zero to \`nums[write]\` and advance \`write\`; after the loop, set every position from \`write\` to the end to 0. Always exactly n writes.

Neither is always better. Example 2 below counts the writes: with no zeros, swapping writes nothing while overwrite-and-fill writes n; with many leading zeros and many non-zeros, swapping writes about twice as much.

### Why not the obvious approaches

- **Remove each zero and append it at the end.** Removing from the middle of an array shifts everything after it, O(n) per removal, so O(n²) overall. Removing while iterating by index is also a classic bug (see the pitfalls).
- **Build a new array of non-zeros and pad with zeros.** O(n) time and correct, but O(n) extra memory, so it is not in place.
- **Sort with "is zero" as the key.** Works if the sort is stable, but it is O(n log n) for something that needs one pass.

This is also a building block: the same read/write pass removes any value, de-duplicates a sorted array, and is half of the [partition step in quicksort](/interview-question/how-do-merge-sort-and-quicksort-work). The coding-round version of this question is [Move Zeroes to End](/interview-question/move-zeroes-to-end).

## 4. The Solution in C++

The parameter is \`vector<int>&\`, a reference, so the function edits the caller vector. Without the \`&\` it would receive a copy, rearrange the copy, and the caller would see nothing.

~~~cpp
// In place: non-zero values keep their order at the front, zeros go to the end.
// Takes vector<int>& : without the & the function would sort a copy.
void moveZeroes(vector<int>& nums) {
    size_t write = 0;  // next slot for a non-zero value
    for (size_t read = 0; read < nums.size(); read++) {
        if (nums[read] != 0) {
            if (read != write) swap(nums[write], nums[read]);
            write++;
        }
    }
}
~~~

**Line by line:**

- \`size_t\` indices are safe here because nothing is subtracted from them.
- \`if (read != write)\` skips pointless self-swaps while there are no zeros yet.
- \`std::swap(nums[write], nums[read])\` (from \`<utility>\`) exchanges the two elements.

### The other in-place variant

~~~cpp
// Variant A: copy non-zeros forward, then fill the tail with zeros. Returns writes.
int overwriteThenFill(vector<int>& nums) {
    int writes = 0;
    size_t write = 0;
    for (int x : nums)
        if (x != 0) { nums[write++] = x; writes++; }
    for (size_t i = write; i < nums.size(); i++) { nums[i] = 0; writes++; }
    return writes;
}
~~~

**The standard library version.** \`std::fill(std::remove(nums.begin(), nums.end(), 0), nums.end(), 0)\` is the idiomatic C++ one-liner and it is still in place. \`std::remove\` does not erase anything and does not change the size: it shifts the kept elements forward and returns the new logical end ([cppreference: std::remove](https://en.cppreference.com/w/cpp/algorithm/remove)). In a test run on \`{0, 1, 0, 3, 12}\`, the vector size stayed 5, the returned iterator was 3 positions from the start, and the contents were \`1 3 12 3 12\` (the tail is left-over values). \`std::fill\` then zeroes that tail, which is exactly the overwrite-then-fill variant.

**\`partition\` is not stable.** \`std::partition(v.begin(), v.end(), [](int x) { return x != 0; })\` on \`{1, 2, 0, 3, 0, 4, 5}\` produced \`1 2 5 3 4 0 0\` in a test run: zeros at the end, but the non-zero order changed. \`std::stable_partition\` produced \`1 2 3 4 5 0 0\`.

## 5. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — the main solution on edge cases** prints:

~~~text
[1, 3, 12, 0, 0]
[0]
[1, 2]
[]
[1, 0, 0]
[4, 2, 4, 3, 5, 1, 0, 0, 0]
[-1, -2, 0, 0]
~~~

**Example 2 — write counts of the two variants, plus a library one-liner** prints:

~~~text
[1, 2, 3, 4, 5] -> [1, 2, 3, 4, 5] | A writes 5, B writes 0
[0, 0, 0, 0, 1] -> [1, 0, 0, 0, 0] | A writes 5, B writes 2
[0, 1, 0, 3, 12] -> [1, 3, 12, 0, 0] | A writes 5, B writes 6
library one-liner: [1, 3, 12, 0, 0]
~~~

**What the write counts show:** overwrite-then-fill always does exactly n writes (5 here). Swap-forward does 0 writes when there are no zeros, 2 writes when one non-zero sits behind four zeros, but 6 writes on \`[0, 1, 0, 3, 12]\`, because three non-zeros each needed a two-write swap. Pick the variant to match the data if the interviewer asks about writes.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Remove each zero, append at end | O(n²) | O(1) | each removal shifts the rest of the array |
| Filtered copy, then pad with zeros | O(n) | O(n) | a second array |
| Stable sort by "is zero" | O(n log n) | depends on the sort | sorting for a one-pass job |
| Read/write swap forward | O(n) | O(1) | one pass; between 0 and about 2n writes |
| Read/write overwrite then fill | O(n) | O(1) | one pass plus the tail; exactly n writes |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Empty array:** nothing happens; the loop never runs.
- **No zeros** (\`[1, 2]\`): unchanged, and the swap version writes nothing.
- **All zeros** (\`[0]\`, \`[0, 0, 0]\`): unchanged.
- **Zeros only at the front** (\`[0, 0, 1]\`): becomes \`[1, 0, 0]\`.
- **Negative numbers** (\`[-1, 0, -2, 0]\`): they are non-zero, so they move forward in order: \`[-1, -2, 0, 0]\`.
- **Very large arrays:** still one pass and no allocation, which is the point of doing it in place.

## Common Pitfalls

- **Passing by value.** \`void moveZeroes(vector<int> nums)\` rearranges a copy; the caller sees nothing. Use \`vector<int>&\`.
- **\`erase\` in a loop.** \`nums.erase(it)\` shifts every later element, O(n) each, so O(n²) overall, and it invalidates iterators at and after the erased position.
- **Forgetting the fill after \`std::remove\`.** The tail after the returned iterator holds left-over values, not zeros; you must \`fill\` (or \`erase\`) it.
- **Using \`std::partition\` and expecting order.** It groups the zeros but may reorder the non-zeros; use \`stable_partition\` or the read/write loop.
- **\`int\` index compared with \`size()\`.** \`for (int i = 0; i < nums.size(); i++)\` compares signed with unsigned; it works for normal sizes but triggers \`-Wsign-compare\` warnings. Use \`size_t\` when you never subtract.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The approach:</strong> <span style="color:#f0e2c8;">Read/write pointers: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code> scans every index, and each non-zero is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::swap</code>ped to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[write]</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write++</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why order is kept:</strong> <span style="color:#f0e2c8;">Non-zeros are placed in the order <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code> meets them, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code> never passes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code>, so nothing overtakes anything.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space: one pass, two indices.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The library way:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::fill(std::remove(v.begin(), v.end(), 0), v.end(), 0)</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove</code> shifts kept values forward without changing the size, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fill</code> zeroes the tail.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;&amp;</code>, not a copy, and do not use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::partition</code> when order matters.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::remove</code> actually do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It moves the elements to keep to the front, in order, and returns an iterator to the new logical end. The size is unchanged; the tail holds left-over values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if order does not matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use converging pointers, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::partition</code>, which may reorder the non-zeros. Both still finish in one pass.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not erase each zero and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">push_back(0)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">erase</code> from the middle shifts the rest, O(n) per zero, so O(n²), and it invalidates iterators you might be holding.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you move all copies of some value <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">val</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same loop with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[read] != val</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::remove(v.begin(), v.end(), val)</code>; the distance to the returned iterator is the new length.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you prove it is correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Invariant: before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code> are the non-zeros seen so far in order; from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read - 1</code> are zeros. At the end, that is the whole answer.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **In place** | rearranging the input itself with O(1) extra memory |
| **Read/write pointers** | \`read\` scans everything, \`write\` marks where the next kept value goes |
| **Stable (order-preserving)** | equal-category elements keep their original relative order |
| **Loop invariant** | a fact that holds before and after every iteration |
| **std::remove** | shifts kept elements forward and returns the new logical end; does not resize |

---
**Conclusion:** Moving zeros to the end in place is the read/write form of two pointers: \`read\` visits every element, \`write\` marks the next slot for a non-zero, and because \`write\` never passes \`read\`, the non-zero order is preserved. It is O(n) time and O(1) extra space, and the two in-place variants differ only in how many writes they make. In C++, the marks come from mutating the caller array correctly, avoiding the remove-while-iterating trap, and knowing which library shortcuts are in place and stable.`,
        examples: [
          { label: `Move zeroes with read/write pointers on edge cases`, code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

// In place: non-zero values keep their order at the front, zeros go to the end.
// Takes vector<int>& : without the & the function would sort a copy.
void moveZeroes(vector<int>& nums) {
    size_t write = 0;  // next slot for a non-zero value
    for (size_t read = 0; read < nums.size(); read++) {
        if (nums[read] != 0) {
            if (read != write) swap(nums[write], nums[read]);
            write++;
        }
    }
}

string fmt(const vector<int>& a) {
    string out = "[";
    for (size_t i = 0; i < a.size(); i++) out += (i ? ", " : "") + to_string(a[i]);
    return out + "]";
}

string demo(vector<int> nums) {
    moveZeroes(nums);
    return fmt(nums);
}

int main() {
    cout << demo({0, 1, 0, 3, 12}) << "\\n";             // [1, 3, 12, 0, 0]
    cout << demo({0}) << "\\n";                          // [0]
    cout << demo({1, 2}) << "\\n";                       // [1, 2]
    cout << demo({}) << "\\n";                           // []
    cout << demo({0, 0, 1}) << "\\n";                    // [1, 0, 0]
    cout << demo({4, 2, 4, 0, 0, 3, 0, 5, 1}) << "\\n";  // [4, 2, 4, 3, 5, 1, 0, 0, 0]
    cout << demo({-1, 0, -2, 0}) << "\\n";               // [-1, -2, 0, 0]
}` },
          { label: `Swap forward vs overwrite then fill: counting writes`, code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

// Variant A: copy non-zeros forward, then fill the tail with zeros. Returns writes.
int overwriteThenFill(vector<int>& nums) {
    int writes = 0;
    size_t write = 0;
    for (int x : nums)
        if (x != 0) { nums[write++] = x; writes++; }
    for (size_t i = write; i < nums.size(); i++) { nums[i] = 0; writes++; }
    return writes;
}

// Variant B: swap each non-zero into place, skipping self-swaps. Returns writes.
int swapForward(vector<int>& nums) {
    int writes = 0;
    size_t write = 0;
    for (size_t read = 0; read < nums.size(); read++) {
        if (nums[read] != 0) {
            if (read != write) { swap(nums[write], nums[read]); writes += 2; }
            write++;
        }
    }
    return writes;
}

string fmt(const vector<int>& a) {
    string out = "[";
    for (size_t i = 0; i < a.size(); i++) out += (i ? ", " : "") + to_string(a[i]);
    return out + "]";
}

string compare(const vector<int>& nums) {
    vector<int> a = nums, b = nums;   // copy-assignment copies: same input for both
    int wa = overwriteThenFill(a);
    int wb = swapForward(b);
    return fmt(nums) + " -> " + fmt(a) + " | A writes " + to_string(wa) + ", B writes " + to_string(wb);
}

int main() {
    cout << compare({1, 2, 3, 4, 5}) << "\\n";   // ... A writes 5, B writes 0
    cout << compare({0, 0, 0, 0, 1}) << "\\n";   // ... A writes 5, B writes 2
    cout << compare({0, 1, 0, 3, 12}) << "\\n";  // ... A writes 5, B writes 6

    // Library version: std::remove shifts the kept values forward (it does not shrink the
    // vector) and returns the new logical end; std::fill zeroes the tail. Still in place.
    vector<int> nums = {0, 1, 0, 3, 12};
    fill(remove(nums.begin(), nums.end(), 0), nums.end(), 0);
    cout << "library one-liner: " << fmt(nums) << "\\n";  // [1, 3, 12, 0, 0]
}` },
        ],
      },
    },
  },
  {
    title: `How do you sort an array of 0s, 1s, and 2s?`,
    difficulty: "medium",
    seoDescription: `Sort 0s, 1s and 2s in one pass in Python, JavaScript, Java and C++: the Dutch national flag algorithm, counting sort, invariants, verified code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given a list that contains only 0s, 1s and 2s. Sort it in place, ideally in a single pass and without calling a sort function. Please write it in Python."

**What a strong answer should cover:**
- Counting sort (two passes, three counters) as the simple O(n) answer, then the one-pass Dutch national flag with \`low\`, \`mid\`, \`high\`.
- The invariant (0s, 1s, unknown, 2s) and why \`mid\` does not advance after swapping with \`high\`.
- O(n) time, O(1) extra space, exactly n loop iterations; versus O(n log n) for \`list.sort()\`.
- Edge cases: empty list, all one value, already sorted, reverse sorted.
- Python specifics: a \`while mid <= high\` loop (a \`for\` loop cannot hold \`mid\` still), the tuple swap, and that \`nums[:] = [0] * c0 + [1] * c1 + [2] * c2\` is in place for the caller but builds a temporary list.

**Clarifying questions expected:**
- "Are 0, 1 and 2 the only values, and is a library sort allowed?"
- "Does it have to be a single pass?"

**Code / implementation expected:** Yes — \`sort_colors(nums)\` in Python with three indices, mutating the list in place.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A cook has a tray of jelly beans in three flavours, red, white and blue, all mixed up in a single row, and wants them grouped: all red on the left, all white in the middle, all blue on the right. She could count each colour and then lay out a fresh row, but she has no second tray. So she uses two fingers as fences. Everything left of her left finger is red; everything right of her right finger is blue. She looks at beans one by one between the fences: a red bean gets swapped to just inside the left fence, which then moves right; a blue bean gets swapped to just inside the right fence, which then moves left; a white bean stays where it is. When the bean she is looking at reaches the right fence, the row is sorted, after a single pass.

This is the **Dutch national flag problem**, proposed by Edsger Dijkstra and named after the red, white and blue bands of the flag of the Netherlands ([Wikipedia: Dutch national flag problem](https://en.wikipedia.org/wiki/Dutch_national_flag_problem)). The interview version uses 0, 1 and 2 instead of colours (it is also called "Sort Colors"). The question tests whether you can maintain several regions of an array at once with pointers, and whether you see that a general sort is overkill when there are only three distinct values.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are 0, 1 and 2 the only possible values? | Both fast solutions depend on it; an unexpected value would be lost or misplaced. |
| Must it be in place? Is a library sort allowed? | A library sort is O(n log n) and usually not what is wanted; the follow-up is "do it in one pass". |
| Is one pass required, or are two passes fine? | Counting sort uses two passes and is simple; Dutch national flag uses one. |
| Are these plain numbers, or objects with a 0/1/2 key? | With objects, counting and rewriting values loses the objects, and stability may matter. |
| What about an empty array? | Should simply return without error. |

## 3. The Core Idea

There are three reasonable answers, in increasing order of what the interviewer is hoping for.

**1. Use the library sort.** Correct, O(n log n). It ignores the fact that there are only three values. See [how merge sort and quicksort work](/interview-question/how-do-merge-sort-and-quicksort-work) for why general sorting cannot beat n log n comparisons.

**2. Counting sort, two passes.** Count how many 0s, 1s and 2s there are, then overwrite the array: that many 0s, then 1s, then 2s. O(n) time, O(1) extra space (three counters).

📌 **Interview term: Counting sort** — sorting by counting how many times each possible value occurs and then writing the values out in order. It runs in O(n + k) for k possible values, which is O(n) here because k = 3.

**3. Dutch national flag, one pass.** Three pointers split the array into four regions and a single scan shrinks the unknown region to nothing.

📌 **Interview term: Dutch national flag algorithm** — Dijkstra's one-pass, in-place three-way partition: \`low\`, \`mid\` and \`high\` pointers keep 0s before \`low\`, 1s between \`low\` and \`mid\`, unknown values between \`mid\` and \`high\`, and 2s after \`high\`.

📌 **Interview term: Three-way partition** — splitting an array into "less than", "equal to" and "greater than" a pivot in one pass. Sort Colors is a three-way partition with pivot 1. The same routine makes quicksort fast on arrays with many duplicates, and it appears in [quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="The four regions of the Dutch national flag algorithm, 0s before low, 1s from low to mid, unknown from mid to high, 2s after high">
  <defs>
    <marker id="df1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="40" width="130" height="60" rx="10"/>
  <text class="d-text" x="105" y="75" text-anchor="middle">0s</text>
  <rect class="d-box" x="190" y="40" width="130" height="60" rx="10"/>
  <text class="d-text" x="255" y="75" text-anchor="middle">1s</text>
  <rect class="d-box-muted" x="340" y="40" width="140" height="60" rx="10"/>
  <text class="d-text" x="410" y="75" text-anchor="middle">unknown</text>
  <rect class="d-box-accent" x="500" y="40" width="100" height="60" rx="10"/>
  <text class="d-text" x="550" y="75" text-anchor="middle">2s</text>
  <path class="d-edge-accent" d="M 200 128 L 200 106" marker-end="url(#df1-arrow)"/>
  <text class="d-text d-accent" x="200" y="146" text-anchor="middle">low</text>
  <path class="d-edge-accent" d="M 350 128 L 350 106" marker-end="url(#df1-arrow)"/>
  <text class="d-text d-accent" x="350" y="146" text-anchor="middle">mid</text>
  <path class="d-edge-accent" d="M 470 128 L 470 106" marker-end="url(#df1-arrow)"/>
  <text class="d-text d-accent" x="470" y="146" text-anchor="middle">high</text>
  <rect class="d-box-muted" x="40" y="178" width="560" height="50" rx="10"/>
  <text class="d-text" x="320" y="208" text-anchor="middle">the loop runs while mid is not past high</text>
</svg>

📌 **Interview term: Loop invariant** — a statement true before and after every iteration. Here: positions \`[0, low)\` are all 0, \`[low, mid)\` are all 1, \`[mid, high]\` are not yet examined, and \`(high, end]\` are all 2. At the start the unknown region is the whole array; the loop ends when it is empty (\`mid > high\`), and then the invariant says the array is sorted.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 270" role="img" aria-label="What the algorithm does for each value at mid, 0 swaps with low and moves both, 1 moves mid, 2 swaps with high and moves only high">
  <defs>
    <marker id="df2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="220" y="24" width="220" height="56" rx="10"/>
  <text class="d-text" x="330" y="57" text-anchor="middle">look at nums at mid</text>
  <path class="d-edge" d="M 270 84 L 120 146" marker-end="url(#df2-arrow)"/>
  <path class="d-edge" d="M 330 84 L 330 146" marker-end="url(#df2-arrow)"/>
  <path class="d-edge" d="M 390 84 L 540 146" marker-end="url(#df2-arrow)"/>
  <rect class="d-box-muted" x="20" y="150" width="200" height="96" rx="10"/>
  <text class="d-text" x="120" y="181" text-anchor="middle">it is 0</text>
  <text class="d-sub" x="120" y="203" text-anchor="middle">swap with low</text>
  <text class="d-sub" x="120" y="225" text-anchor="middle">low and mid move</text>
  <rect class="d-box-muted" x="240" y="150" width="180" height="96" rx="10"/>
  <text class="d-text" x="330" y="181" text-anchor="middle">it is 1</text>
  <text class="d-sub" x="330" y="203" text-anchor="middle">already in place</text>
  <text class="d-sub" x="330" y="225" text-anchor="middle">mid moves</text>
  <rect class="d-box-muted" x="440" y="150" width="200" height="96" rx="10"/>
  <text class="d-text" x="540" y="181" text-anchor="middle">it is 2</text>
  <text class="d-sub" x="540" y="203" text-anchor="middle">swap with high</text>
  <text class="d-sub" x="540" y="225" text-anchor="middle">only high moves</text>
</svg>

The three rules, and why each one is safe:

- **\`nums[mid]\` is 0:** swap it with \`nums[low]\`, then move **both** \`low\` and \`mid\` forward. The value that comes back from \`low\` was already examined: it is a 1 (from the 1s region), or it is the same element when \`low == mid\`. Either way \`mid\` can move past it.
- **\`nums[mid]\` is 1:** it is already in the right region; move \`mid\` forward.
- **\`nums[mid]\` is 2:** swap it with \`nums[high]\` and move **only** \`high\` back. The value that came from \`high\` has never been examined, so \`mid\` must look at it next. Moving \`mid\` here is the classic bug.

Every iteration either moves \`mid\` forward or moves \`high\` back, so the unknown region shrinks by exactly one each time: the loop runs **exactly n times**. Example 2 confirms this on 1,000 values.

Other partition problems with the same pointer moves: [move zeroes](/interview-question/how-do-you-move-all-zeroes-to-the-end-of-an-array-in-place) is the two-region version, and [Partition Array](/interview-question/partition-array) is the coding-round version around a pivot. The general [two-pointer technique](/interview-question/what-is-the-two-pointer-technique) page covers both pointer shapes used here.

## 4. Counting Sort in Python

The two-pass answer first, because it is the easiest correct O(n) solution and a good thing to say before the one-pass version.

~~~python
def counting(nums):
    """Two passes: count each value, then overwrite the list in order."""
    counts = [0, 0, 0]
    for x in nums:
        counts[x] += 1
    i = 0
    for value in range(3):
        for _ in range(counts[value]):
            nums[i] = value
            i += 1
~~~

**Variations:** Counting with a list of three counters (indexes 0, 1, 2) avoids a \`dict\`. A shorter Python version is \`c = nums.count(0), nums.count(1)\`, then \`nums[:] = [0] * c[0] + [1] * c[1] + [2] * (len(nums) - c[0] - c[1])\`; it is still O(n), but \`count\` scans the list once per call and the slice assignment builds a temporary list.

## 5. Dutch National Flag in Python

This is the traced version from Example 1; without the \`print\` lines it is the whole solution. It must be a \`while\` loop: a \`for mid in range(...)\` loop always advances \`mid\`, which is wrong in the "2" branch.

~~~python
def sort_colors_traced(nums):
    """Dutch national flag, one pass, printing the three pointers before every step."""
    low, mid, high = 0, 0, len(nums) - 1
    # invariant: [0, low) are 0s, [low, mid) are 1s, [mid, high] unknown, (high, end] are 2s
    while mid <= high:
        print("low=" + str(low) + " mid=" + str(mid) + " high=" + str(high) + "  " + str(nums))
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1
            mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1             # do NOT move mid: the value swapped in is still unchecked
    print("done: " + str(nums))
~~~

**Line by line:**

- \`low, mid, high = 0, 0, len(nums) - 1\` — for an empty list \`high\` is \`-1\`, so \`mid <= high\` is false and nothing runs.
- \`nums[low], nums[mid] = nums[mid], nums[low]\` is the tuple swap; the right side is evaluated before anything is assigned.
- In the \`else\` branch only \`high -= 1\` runs. The comment is there because this is the line people get wrong.

## 6. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — a traced run on [2, 0, 2, 1, 1, 0]** prints:

~~~text
low=0 mid=0 high=5  [2, 0, 2, 1, 1, 0]
low=0 mid=0 high=4  [0, 0, 2, 1, 1, 2]
low=1 mid=1 high=4  [0, 0, 2, 1, 1, 2]
low=2 mid=2 high=4  [0, 0, 2, 1, 1, 2]
low=2 mid=2 high=3  [0, 0, 1, 1, 2, 2]
low=2 mid=3 high=3  [0, 0, 1, 1, 2, 2]
done: [0, 0, 1, 1, 2, 2]
~~~

**Example 2 — edge cases, and both methods on 1,000 values** prints:

~~~text
[0, 1, 2]
[]
[1]
[2, 2, 2]
[0, 0, 1, 1, 2, 2]
n=1000: zeros 324, ones 343, twos 333
n=1000: same result true, sorted true, dutch flag steps 1000
~~~

**Reading the trace:** the first step sees a 2 at \`mid\`, swaps it with the 0 at index 5 and only moves \`high\` (5 to 4); the second step then examines that 0 at index 0, which is why \`mid\` had to stay. The second and third steps find 0s while \`low == mid\`, so the swaps are self-swaps and both pointers move together; the fourth step is another 2-swap, after which only 1s are left to step over. Six lines before \`done\` means six iterations for six elements, and the 1,000-value run confirms the loop always runs exactly n times, while agreeing with counting sort and with the library sort.

## 7. Complexity

| Approach | Time | Extra space | Passes | Why |
| :--- | :--- | :--- | :--- | :--- |
| Library sort | O(n log n) | depends on the sort | many | general comparison sort ignores that there are only 3 values |
| Counting sort | O(n) | O(1) | 2 | one pass to count, one to rewrite |
| Dutch national flag | O(n) | O(1) | 1 | the unknown region shrinks by one each iteration: exactly n iterations |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 8. Edge Cases

- **Empty array:** \`high\` starts at -1, the loop does not run.
- **One element** (\`[1]\`): one iteration, unchanged.
- **All the same** (\`[2, 2, 2]\`): every step swaps with \`high\`, which only moves \`high\`; the array is unchanged.
- **Reverse sorted** (\`[2, 1, 0]\` or \`[2, 0, 1]\`): a good test that \`mid\` stays put after a 2-swap.
- **Already sorted:** still n iterations, with self-swaps when \`low == mid\`.
- **A value outside 0 to 2:** not handled; ask about it before coding.

## Common Pitfalls

- **Advancing \`mid\` after swapping with \`high\`.** The value swapped in from \`high\` has not been checked yet; in a test run the version that also moved \`mid\` turned \`[1, 2, 0]\` into \`[1, 0, 2]\`.
- **Using \`for mid in range(len(nums))\`.** It cannot keep \`mid\` still, and it does not stop at \`high\`.
- **\`while mid < high\`.** It stops one element early, so the last unknown element is never examined: in a test run that version turned \`[2, 0, 1]\` into \`[1, 0, 2]\` and left \`[1, 0]\` unchanged.
- **Rebinding instead of mutating.** \`nums = sorted(nums)\` inside the function leaves the caller list unchanged; use \`nums.sort()\` or \`nums[:] = ...\` if you take the library route.
- **Assuming only 0, 1, 2 without checking.** With a 3 in the list, counting with \`counts[x]\` raises \`IndexError\` and the flag algorithm leaves it in the 2s region. Ask, or validate.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Simple answer:</strong> <span style="color:#f0e2c8;">Counting sort: count the 0s, 1s and 2s, then overwrite the list. O(n), two passes, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. One pass:</strong> <span style="color:#f0e2c8;">Dutch national flag with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code>: 0 swaps to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> (both move), 1 moves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code>, 2 swaps to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> (only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> moves).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Invariant:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, low)</code> are 0s, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[low, mid)</code> are 1s, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[mid, high]</code> unknown, after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> are 2s; stop when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid &gt; high</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time, exactly n iterations, O(1) extra space; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.sort()</code> would be O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code> loop, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code>, and swap with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i], a[j] = a[j], a[i]</code>; mutate the list, do not rebind it.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">mid</code> move after a 0-swap but not after a 2-swap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> you get a value already examined (a 1, or the same element when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low == mid</code>). From <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> you get an unexamined value, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> must check it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Counting sort or Dutch flag: which do you prefer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Counting is simpler and also O(n). The flag is one pass, and it still works when the elements are objects with a 0/1/2 key, because it moves elements instead of rewriting values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many iterations does the loop run?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exactly n: each iteration moves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> forward or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> back by one, shrinking the unknown region by one. The 1,000-value run printed 1000 steps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if there are k colours instead of 3?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Counting sort generalises directly in O(n + k). A pointer approach would need k - 1 boundaries; for large k, counting is the practical answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the result stable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For plain integers stability is meaningless. For objects, the flag algorithm is not stable: swapping with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> can reorder equal keys.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Counting sort** | count each value, then write the values out in order: O(n + k) |
| **Dutch national flag algorithm** | one-pass three-pointer partition into 0s, 1s and 2s |
| **Three-way partition** | split into less than, equal to and greater than a pivot |
| **Loop invariant** | a fact that holds before and after every iteration |
| **Tuple swap** | \`a, b = b, a\`: Python swaps two values without a temporary variable |

---
**Conclusion:** Sorting an array of 0s, 1s and 2s does not need a general sort. Counting sort solves it in two O(n) passes with three counters; the Dutch national flag algorithm solves it in one pass with \`low\`, \`mid\` and \`high\`, keeping 0s, 1s, an unknown middle and 2s as four regions and shrinking the unknown region by exactly one element per iteration. The one rule that decides whether the code is right is that \`mid\` stays put after swapping with \`high\`. In Python, add the language details shown above, and the answer is complete.`,
        examples: [
          { label: `Dutch national flag, traced step by step`, code: `def sort_colors_traced(nums):
    """Dutch national flag, one pass, printing the three pointers before every step."""
    low, mid, high = 0, 0, len(nums) - 1
    # invariant: [0, low) are 0s, [low, mid) are 1s, [mid, high] unknown, (high, end] are 2s
    while mid <= high:
        print("low=" + str(low) + " mid=" + str(mid) + " high=" + str(high) + "  " + str(nums))
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1
            mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1             # do NOT move mid: the value swapped in is still unchecked
    print("done: " + str(nums))


sort_colors_traced([2, 0, 2, 1, 1, 0])` },
          { label: `Edge cases, and Dutch flag vs counting sort on 1,000 values`, code: `def dutch_flag(nums):
    """One pass, O(1) space. Returns the number of loop steps it took."""
    low, mid, high = 0, 0, len(nums) - 1
    steps = 0
    while mid <= high:
        steps += 1
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1
            mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1
    return steps


def counting(nums):
    """Two passes: count each value, then overwrite the list in order."""
    counts = [0, 0, 0]
    for x in nums:
        counts[x] += 1
    i = 0
    for value in range(3):
        for _ in range(counts[value]):
            nums[i] = value
            i += 1


def demo(nums):
    dutch_flag(nums)
    return str(nums)


print(demo([2, 0, 1]))  # [0, 1, 2]
print(demo([]))  # []
print(demo([1]))  # [1]
print(demo([2, 2, 2]))  # [2, 2, 2]
print(demo([0, 1, 2, 0, 1, 2]))  # [0, 0, 1, 1, 2, 2]

# 1000 pseudo-random values from a tiny deterministic generator (same in every language)
x = 7
data = []
for _ in range(1000):
    x = (x * 75 + 74) % 65537
    data.append(x % 3)
a, b = list(data), list(data)
steps = dutch_flag(a)
counting(b)
print("n=1000: zeros " + str(data.count(0)) + ", ones " + str(data.count(1)) + ", twos " + str(data.count(2)))
print("n=1000: same result " + str(a == b).lower() + ", sorted " + str(a == sorted(data)).lower() + ", dutch flag steps " + str(steps))` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given an array that contains only 0s, 1s and 2s. Sort it in place, ideally in a single pass and without calling a sort function. Please write it in JavaScript."

**What a strong answer should cover:**
- Counting sort (two passes, three counters) as the simple O(n) answer, then the one-pass Dutch national flag with \`low\`, \`mid\`, \`high\`.
- The invariant (0s, 1s, unknown, 2s) and why \`mid\` does not advance after swapping with \`high\`.
- O(n) time, O(1) extra space, exactly n loop iterations; versus O(n log n) for \`sort\`.
- Edge cases: empty array, all one value, already sorted, reverse sorted.
- JavaScript specifics: \`arr.sort()\` without a comparator compares strings (it happens to work for single digits, but it is O(n log n) and a bad habit); compare arrays element by element because \`===\` on arrays compares references.

**Clarifying questions expected:**
- "Are 0, 1 and 2 the only values, and is a library sort allowed?"
- "Does it have to be a single pass?"

**Code / implementation expected:** Yes — \`sortColors(nums)\` in JavaScript with three indices, mutating the array in place.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A cook has a tray of jelly beans in three flavours, red, white and blue, all mixed up in a single row, and wants them grouped: all red on the left, all white in the middle, all blue on the right. She could count each colour and then lay out a fresh row, but she has no second tray. So she uses two fingers as fences. Everything left of her left finger is red; everything right of her right finger is blue. She looks at beans one by one between the fences: a red bean gets swapped to just inside the left fence, which then moves right; a blue bean gets swapped to just inside the right fence, which then moves left; a white bean stays where it is. When the bean she is looking at reaches the right fence, the row is sorted, after a single pass.

This is the **Dutch national flag problem**, proposed by Edsger Dijkstra and named after the red, white and blue bands of the flag of the Netherlands ([Wikipedia: Dutch national flag problem](https://en.wikipedia.org/wiki/Dutch_national_flag_problem)). The interview version uses 0, 1 and 2 instead of colours (it is also called "Sort Colors"). The question tests whether you can maintain several regions of an array at once with pointers, and whether you see that a general sort is overkill when there are only three distinct values.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are 0, 1 and 2 the only possible values? | Both fast solutions depend on it; an unexpected value would be lost or misplaced. |
| Must it be in place? Is a library sort allowed? | A library sort is O(n log n) and usually not what is wanted; the follow-up is "do it in one pass". |
| Is one pass required, or are two passes fine? | Counting sort uses two passes and is simple; Dutch national flag uses one. |
| Are these plain numbers, or objects with a 0/1/2 key? | With objects, counting and rewriting values loses the objects, and stability may matter. |
| What about an empty array? | Should simply return without error. |

## 3. The Core Idea

There are three reasonable answers, in increasing order of what the interviewer is hoping for.

**1. Use the library sort.** Correct, O(n log n). It ignores the fact that there are only three values. See [how merge sort and quicksort work](/interview-question/how-do-merge-sort-and-quicksort-work) for why general sorting cannot beat n log n comparisons.

**2. Counting sort, two passes.** Count how many 0s, 1s and 2s there are, then overwrite the array: that many 0s, then 1s, then 2s. O(n) time, O(1) extra space (three counters).

📌 **Interview term: Counting sort** — sorting by counting how many times each possible value occurs and then writing the values out in order. It runs in O(n + k) for k possible values, which is O(n) here because k = 3.

**3. Dutch national flag, one pass.** Three pointers split the array into four regions and a single scan shrinks the unknown region to nothing.

📌 **Interview term: Dutch national flag algorithm** — Dijkstra's one-pass, in-place three-way partition: \`low\`, \`mid\` and \`high\` pointers keep 0s before \`low\`, 1s between \`low\` and \`mid\`, unknown values between \`mid\` and \`high\`, and 2s after \`high\`.

📌 **Interview term: Three-way partition** — splitting an array into "less than", "equal to" and "greater than" a pivot in one pass. Sort Colors is a three-way partition with pivot 1. The same routine makes quicksort fast on arrays with many duplicates, and it appears in [quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="The four regions of the Dutch national flag algorithm, 0s before low, 1s from low to mid, unknown from mid to high, 2s after high">
  <defs>
    <marker id="df1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="40" width="130" height="60" rx="10"/>
  <text class="d-text" x="105" y="75" text-anchor="middle">0s</text>
  <rect class="d-box" x="190" y="40" width="130" height="60" rx="10"/>
  <text class="d-text" x="255" y="75" text-anchor="middle">1s</text>
  <rect class="d-box-muted" x="340" y="40" width="140" height="60" rx="10"/>
  <text class="d-text" x="410" y="75" text-anchor="middle">unknown</text>
  <rect class="d-box-accent" x="500" y="40" width="100" height="60" rx="10"/>
  <text class="d-text" x="550" y="75" text-anchor="middle">2s</text>
  <path class="d-edge-accent" d="M 200 128 L 200 106" marker-end="url(#df1-arrow)"/>
  <text class="d-text d-accent" x="200" y="146" text-anchor="middle">low</text>
  <path class="d-edge-accent" d="M 350 128 L 350 106" marker-end="url(#df1-arrow)"/>
  <text class="d-text d-accent" x="350" y="146" text-anchor="middle">mid</text>
  <path class="d-edge-accent" d="M 470 128 L 470 106" marker-end="url(#df1-arrow)"/>
  <text class="d-text d-accent" x="470" y="146" text-anchor="middle">high</text>
  <rect class="d-box-muted" x="40" y="178" width="560" height="50" rx="10"/>
  <text class="d-text" x="320" y="208" text-anchor="middle">the loop runs while mid is not past high</text>
</svg>

📌 **Interview term: Loop invariant** — a statement true before and after every iteration. Here: positions \`[0, low)\` are all 0, \`[low, mid)\` are all 1, \`[mid, high]\` are not yet examined, and \`(high, end]\` are all 2. At the start the unknown region is the whole array; the loop ends when it is empty (\`mid > high\`), and then the invariant says the array is sorted.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 270" role="img" aria-label="What the algorithm does for each value at mid, 0 swaps with low and moves both, 1 moves mid, 2 swaps with high and moves only high">
  <defs>
    <marker id="df2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="220" y="24" width="220" height="56" rx="10"/>
  <text class="d-text" x="330" y="57" text-anchor="middle">look at nums at mid</text>
  <path class="d-edge" d="M 270 84 L 120 146" marker-end="url(#df2-arrow)"/>
  <path class="d-edge" d="M 330 84 L 330 146" marker-end="url(#df2-arrow)"/>
  <path class="d-edge" d="M 390 84 L 540 146" marker-end="url(#df2-arrow)"/>
  <rect class="d-box-muted" x="20" y="150" width="200" height="96" rx="10"/>
  <text class="d-text" x="120" y="181" text-anchor="middle">it is 0</text>
  <text class="d-sub" x="120" y="203" text-anchor="middle">swap with low</text>
  <text class="d-sub" x="120" y="225" text-anchor="middle">low and mid move</text>
  <rect class="d-box-muted" x="240" y="150" width="180" height="96" rx="10"/>
  <text class="d-text" x="330" y="181" text-anchor="middle">it is 1</text>
  <text class="d-sub" x="330" y="203" text-anchor="middle">already in place</text>
  <text class="d-sub" x="330" y="225" text-anchor="middle">mid moves</text>
  <rect class="d-box-muted" x="440" y="150" width="200" height="96" rx="10"/>
  <text class="d-text" x="540" y="181" text-anchor="middle">it is 2</text>
  <text class="d-sub" x="540" y="203" text-anchor="middle">swap with high</text>
  <text class="d-sub" x="540" y="225" text-anchor="middle">only high moves</text>
</svg>

The three rules, and why each one is safe:

- **\`nums[mid]\` is 0:** swap it with \`nums[low]\`, then move **both** \`low\` and \`mid\` forward. The value that comes back from \`low\` was already examined: it is a 1 (from the 1s region), or it is the same element when \`low == mid\`. Either way \`mid\` can move past it.
- **\`nums[mid]\` is 1:** it is already in the right region; move \`mid\` forward.
- **\`nums[mid]\` is 2:** swap it with \`nums[high]\` and move **only** \`high\` back. The value that came from \`high\` has never been examined, so \`mid\` must look at it next. Moving \`mid\` here is the classic bug.

Every iteration either moves \`mid\` forward or moves \`high\` back, so the unknown region shrinks by exactly one each time: the loop runs **exactly n times**. Example 2 confirms this on 1,000 values.

Other partition problems with the same pointer moves: [move zeroes](/interview-question/how-do-you-move-all-zeroes-to-the-end-of-an-array-in-place) is the two-region version, and [Partition Array](/interview-question/partition-array) is the coding-round version around a pivot. The general [two-pointer technique](/interview-question/what-is-the-two-pointer-technique) page covers both pointer shapes used here.

## 4. Counting Sort in JavaScript

The two-pass answer first, because it is the easiest correct O(n) solution and a good thing to say before the one-pass version.

~~~javascript
function counting(nums) {
  // Two passes: count each value, then overwrite the array in order.
  const counts = [0, 0, 0];
  for (const x of nums) counts[x]++;
  let i = 0;
  for (let value = 0; value < 3; value++) {
    for (let c = 0; c < counts[value]; c++) nums[i++] = value;
  }
}
~~~

**Variations:** The counts live in a plain array \`[0, 0, 0]\` indexed by the value. Another option is \`nums.fill(0, 0, c0).fill(1, c0, c0 + c1).fill(2, c0 + c1)\`: \`fill(value, start, end)\` mutates in place and returns the same array, so the calls chain.

## 5. Dutch National Flag in JavaScript

This is the traced version from Example 1; without the \`console.log\` lines it is the whole solution. The swaps use destructuring, and the function mutates the array it is given.

~~~javascript
function sortColorsTraced(nums) {
  // Dutch national flag, one pass, printing the three pointers before every step.
  let low = 0;
  let mid = 0;
  let high = nums.length - 1;
  // invariant: [0, low) are 0s, [low, mid) are 1s, [mid, high] unknown, (high, end] are 2s
  while (mid <= high) {
    console.log('low=' + low + ' mid=' + mid + ' high=' + high + '  ' + fmt(nums));
    if (nums[mid] === 0) {
      [nums[low], nums[mid]] = [nums[mid], nums[low]];
      low++;
      mid++;
    } else if (nums[mid] === 1) {
      mid++;
    } else {
      [nums[mid], nums[high]] = [nums[high], nums[mid]];
      high--; // do NOT move mid: the value swapped in is still unchecked
    }
  }
  console.log('done: ' + fmt(nums));
}
~~~

**Line by line:**

- \`let high = nums.length - 1\` — for an empty array \`high\` is \`-1\`, so \`mid <= high\` is false and nothing runs.
- \`[nums[low], nums[mid]] = [nums[mid], nums[low]]\` swaps two slots in one statement.
- In the \`else\` branch only \`high--\` runs. The comment is there because this is the line people get wrong.

## 6. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — a traced run on [2, 0, 2, 1, 1, 0]** prints:

~~~text
low=0 mid=0 high=5  [2, 0, 2, 1, 1, 0]
low=0 mid=0 high=4  [0, 0, 2, 1, 1, 2]
low=1 mid=1 high=4  [0, 0, 2, 1, 1, 2]
low=2 mid=2 high=4  [0, 0, 2, 1, 1, 2]
low=2 mid=2 high=3  [0, 0, 1, 1, 2, 2]
low=2 mid=3 high=3  [0, 0, 1, 1, 2, 2]
done: [0, 0, 1, 1, 2, 2]
~~~

**Example 2 — edge cases, and both methods on 1,000 values** prints:

~~~text
[0, 1, 2]
[]
[1]
[2, 2, 2]
[0, 0, 1, 1, 2, 2]
n=1000: zeros 324, ones 343, twos 333
n=1000: same result true, sorted true, dutch flag steps 1000
~~~

**Reading the trace:** the first step sees a 2 at \`mid\`, swaps it with the 0 at index 5 and only moves \`high\` (5 to 4); the second step then examines that 0 at index 0, which is why \`mid\` had to stay. The second and third steps find 0s while \`low == mid\`, so the swaps are self-swaps and both pointers move together; the fourth step is another 2-swap, after which only 1s are left to step over. Six lines before \`done\` means six iterations for six elements, and the 1,000-value run confirms the loop always runs exactly n times, while agreeing with counting sort and with the library sort.

## 7. Complexity

| Approach | Time | Extra space | Passes | Why |
| :--- | :--- | :--- | :--- | :--- |
| Library sort | O(n log n) | depends on the sort | many | general comparison sort ignores that there are only 3 values |
| Counting sort | O(n) | O(1) | 2 | one pass to count, one to rewrite |
| Dutch national flag | O(n) | O(1) | 1 | the unknown region shrinks by one each iteration: exactly n iterations |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 8. Edge Cases

- **Empty array:** \`high\` starts at -1, the loop does not run.
- **One element** (\`[1]\`): one iteration, unchanged.
- **All the same** (\`[2, 2, 2]\`): every step swaps with \`high\`, which only moves \`high\`; the array is unchanged.
- **Reverse sorted** (\`[2, 1, 0]\` or \`[2, 0, 1]\`): a good test that \`mid\` stays put after a 2-swap.
- **Already sorted:** still n iterations, with self-swaps when \`low == mid\`.
- **A value outside 0 to 2:** not handled; ask about it before coding.

## Common Pitfalls

- **Advancing \`mid\` after swapping with \`high\`.** The value swapped in from \`high\` has not been checked yet; in a test run the version that also moved \`mid\` turned \`[1, 2, 0]\` into \`[1, 0, 2]\`.
- **\`while (mid < high)\`.** It stops one element early and leaves the last unknown element unexamined: in a test run that version turned \`[2, 0, 1]\` into \`[1, 0, 2]\`.
- **Relying on \`.sort()\` with no comparator.** For 0, 1 and 2 the string order happens to match, but it converts every number to a string and is O(n log n); with any two-digit value it breaks (\`[10, 9, 1].sort()\` gave \`[ 1, 10, 9 ]\` in Node).
- **Checking the result with \`===\`.** \`[1, 2] === [1, 2]\` printed \`false\`: arrays compare by reference. Compare element by element, as Example 2 does with \`every\`.
- **Counting into a plain object without initialising.** \`counts[x]++\` on a missing key gives \`NaN\`; start from \`[0, 0, 0]\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Simple answer:</strong> <span style="color:#f0e2c8;">Counting sort: count the 0s, 1s and 2s, then overwrite the array (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fill</code> works). O(n), two passes, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. One pass:</strong> <span style="color:#f0e2c8;">Dutch national flag with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code>: 0 swaps to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> (both move), 1 moves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code>, 2 swaps to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> (only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> moves).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Invariant:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, low)</code> are 0s, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[low, mid)</code> are 1s, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[mid, high]</code> unknown, after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> are 2s; stop when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid &gt; high</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time, exactly n iterations, O(1) extra space; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort</code> would be O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Do not lean on default string sorting, and compare arrays element by element, never with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">mid</code> move after a 0-swap but not after a 2-swap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> you get a value already examined (a 1, or the same element when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low === mid</code>). From <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> you get an unexamined value, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> must check it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nums.sort()</code> acceptable here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It gives the right answer for single digits, but it is O(n log n) and compares strings. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code> it is correct in general, still O(n log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many iterations does the loop run?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exactly n: each iteration moves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> forward or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> back by one, shrinking the unknown region by one. The 1,000-value run printed 1000 steps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Counting sort or Dutch flag: which do you prefer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Counting is simpler and also O(n). The flag is one pass and works for objects with a 0/1/2 key, because it moves elements rather than rewriting values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the result stable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For plain numbers stability does not matter. For objects, the flag algorithm is not stable: swapping with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> can reorder equal keys.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Counting sort** | count each value, then write the values out in order: O(n + k) |
| **Dutch national flag algorithm** | one-pass three-pointer partition into 0s, 1s and 2s |
| **Three-way partition** | split into less than, equal to and greater than a pivot |
| **Loop invariant** | a fact that holds before and after every iteration |
| **Destructuring swap** | \`[a, b] = [b, a]\`: swap two slots in one statement |

---
**Conclusion:** Sorting an array of 0s, 1s and 2s does not need a general sort. Counting sort solves it in two O(n) passes with three counters; the Dutch national flag algorithm solves it in one pass with \`low\`, \`mid\` and \`high\`, keeping 0s, 1s, an unknown middle and 2s as four regions and shrinking the unknown region by exactly one element per iteration. The one rule that decides whether the code is right is that \`mid\` stays put after swapping with \`high\`. In JavaScript, add the language details shown above, and the answer is complete.`,
        examples: [
          { label: `Dutch national flag, traced step by step`, code: `const fmt = (a) => '[' + a.join(', ') + ']';

function sortColorsTraced(nums) {
  // Dutch national flag, one pass, printing the three pointers before every step.
  let low = 0;
  let mid = 0;
  let high = nums.length - 1;
  // invariant: [0, low) are 0s, [low, mid) are 1s, [mid, high] unknown, (high, end] are 2s
  while (mid <= high) {
    console.log('low=' + low + ' mid=' + mid + ' high=' + high + '  ' + fmt(nums));
    if (nums[mid] === 0) {
      [nums[low], nums[mid]] = [nums[mid], nums[low]];
      low++;
      mid++;
    } else if (nums[mid] === 1) {
      mid++;
    } else {
      [nums[mid], nums[high]] = [nums[high], nums[mid]];
      high--; // do NOT move mid: the value swapped in is still unchecked
    }
  }
  console.log('done: ' + fmt(nums));
}

sortColorsTraced([2, 0, 2, 1, 1, 0]);` },
          { label: `Edge cases, and Dutch flag vs counting sort on 1,000 values`, code: `function dutchFlag(nums) {
  // One pass, O(1) space. Returns the number of loop steps it took.
  let low = 0;
  let mid = 0;
  let high = nums.length - 1;
  let steps = 0;
  while (mid <= high) {
    steps++;
    if (nums[mid] === 0) {
      [nums[low], nums[mid]] = [nums[mid], nums[low]];
      low++;
      mid++;
    } else if (nums[mid] === 1) {
      mid++;
    } else {
      [nums[mid], nums[high]] = [nums[high], nums[mid]];
      high--;
    }
  }
  return steps;
}

function counting(nums) {
  // Two passes: count each value, then overwrite the array in order.
  const counts = [0, 0, 0];
  for (const x of nums) counts[x]++;
  let i = 0;
  for (let value = 0; value < 3; value++) {
    for (let c = 0; c < counts[value]; c++) nums[i++] = value;
  }
}

const fmt = (a) => '[' + a.join(', ') + ']';
function demo(nums) {
  dutchFlag(nums);
  return fmt(nums);
}

console.log(demo([2, 0, 1])); // [0, 1, 2]
console.log(demo([])); // []
console.log(demo([1])); // [1]
console.log(demo([2, 2, 2])); // [2, 2, 2]
console.log(demo([0, 1, 2, 0, 1, 2])); // [0, 0, 1, 1, 2, 2]

// 1000 pseudo-random values from a tiny deterministic generator (same in every language)
let x = 7;
const data = [];
for (let i = 0; i < 1000; i++) {
  x = (x * 75 + 74) % 65537;
  data.push(x % 3);
}
const a = data.slice();
const b = data.slice();
const steps = dutchFlag(a);
counting(b);
const sorted = data.slice().sort((p, q) => p - q); // numeric comparator: default sort compares strings
const same = a.every((v, i) => v === b[i]);        // === on two arrays compares references, not contents
const isSorted = a.every((v, i) => v === sorted[i]);
const count = (v) => data.filter((d) => d === v).length;
console.log('n=1000: zeros ' + count(0) + ', ones ' + count(1) + ', twos ' + count(2));
console.log('n=1000: same result ' + same + ', sorted ' + isSorted + ', dutch flag steps ' + steps);` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given an int array that contains only 0s, 1s and 2s. Sort it in place, ideally in a single pass and without calling Arrays.sort. Please write it in Java."

**What a strong answer should cover:**
- Counting sort (two passes, three counters) as the simple O(n) answer, then the one-pass Dutch national flag with \`low\`, \`mid\`, \`high\`.
- The invariant (0s, 1s, unknown, 2s) and why \`mid\` does not advance after swapping with \`high\`.
- O(n) time, O(1) extra space, exactly n loop iterations; versus O(n log n) for \`Arrays.sort\`.
- Edge cases: empty array, all one value, already sorted, reverse sorted.
- Java specifics: a small \`swap(int[] a, int i, int j)\` helper (no tuple swap), \`swap(nums, low++, mid++)\` relies on left-to-right argument evaluation, \`Arrays.equals\` versus \`==\` for checking, and \`Arrays.fill(nums, from, to, value)\` for the counting rewrite.

**Clarifying questions expected:**
- "Are 0, 1 and 2 the only values, and may I use \`Arrays.sort\`?"
- "Does it have to be a single pass?"

**Code / implementation expected:** Yes — \`static void sortColors(int[] nums)\` in Java with three indices, mutating the array in place.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A cook has a tray of jelly beans in three flavours, red, white and blue, all mixed up in a single row, and wants them grouped: all red on the left, all white in the middle, all blue on the right. She could count each colour and then lay out a fresh row, but she has no second tray. So she uses two fingers as fences. Everything left of her left finger is red; everything right of her right finger is blue. She looks at beans one by one between the fences: a red bean gets swapped to just inside the left fence, which then moves right; a blue bean gets swapped to just inside the right fence, which then moves left; a white bean stays where it is. When the bean she is looking at reaches the right fence, the row is sorted, after a single pass.

This is the **Dutch national flag problem**, proposed by Edsger Dijkstra and named after the red, white and blue bands of the flag of the Netherlands ([Wikipedia: Dutch national flag problem](https://en.wikipedia.org/wiki/Dutch_national_flag_problem)). The interview version uses 0, 1 and 2 instead of colours (it is also called "Sort Colors"). The question tests whether you can maintain several regions of an array at once with pointers, and whether you see that a general sort is overkill when there are only three distinct values.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are 0, 1 and 2 the only possible values? | Both fast solutions depend on it; an unexpected value would be lost or misplaced. |
| Must it be in place? Is a library sort allowed? | A library sort is O(n log n) and usually not what is wanted; the follow-up is "do it in one pass". |
| Is one pass required, or are two passes fine? | Counting sort uses two passes and is simple; Dutch national flag uses one. |
| Are these plain numbers, or objects with a 0/1/2 key? | With objects, counting and rewriting values loses the objects, and stability may matter. |
| What about an empty array? | Should simply return without error. |

## 3. The Core Idea

There are three reasonable answers, in increasing order of what the interviewer is hoping for.

**1. Use the library sort.** Correct, O(n log n). It ignores the fact that there are only three values. See [how merge sort and quicksort work](/interview-question/how-do-merge-sort-and-quicksort-work) for why general sorting cannot beat n log n comparisons.

**2. Counting sort, two passes.** Count how many 0s, 1s and 2s there are, then overwrite the array: that many 0s, then 1s, then 2s. O(n) time, O(1) extra space (three counters).

📌 **Interview term: Counting sort** — sorting by counting how many times each possible value occurs and then writing the values out in order. It runs in O(n + k) for k possible values, which is O(n) here because k = 3.

**3. Dutch national flag, one pass.** Three pointers split the array into four regions and a single scan shrinks the unknown region to nothing.

📌 **Interview term: Dutch national flag algorithm** — Dijkstra's one-pass, in-place three-way partition: \`low\`, \`mid\` and \`high\` pointers keep 0s before \`low\`, 1s between \`low\` and \`mid\`, unknown values between \`mid\` and \`high\`, and 2s after \`high\`.

📌 **Interview term: Three-way partition** — splitting an array into "less than", "equal to" and "greater than" a pivot in one pass. Sort Colors is a three-way partition with pivot 1. The same routine makes quicksort fast on arrays with many duplicates, and it appears in [quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="The four regions of the Dutch national flag algorithm, 0s before low, 1s from low to mid, unknown from mid to high, 2s after high">
  <defs>
    <marker id="df1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="40" width="130" height="60" rx="10"/>
  <text class="d-text" x="105" y="75" text-anchor="middle">0s</text>
  <rect class="d-box" x="190" y="40" width="130" height="60" rx="10"/>
  <text class="d-text" x="255" y="75" text-anchor="middle">1s</text>
  <rect class="d-box-muted" x="340" y="40" width="140" height="60" rx="10"/>
  <text class="d-text" x="410" y="75" text-anchor="middle">unknown</text>
  <rect class="d-box-accent" x="500" y="40" width="100" height="60" rx="10"/>
  <text class="d-text" x="550" y="75" text-anchor="middle">2s</text>
  <path class="d-edge-accent" d="M 200 128 L 200 106" marker-end="url(#df1-arrow)"/>
  <text class="d-text d-accent" x="200" y="146" text-anchor="middle">low</text>
  <path class="d-edge-accent" d="M 350 128 L 350 106" marker-end="url(#df1-arrow)"/>
  <text class="d-text d-accent" x="350" y="146" text-anchor="middle">mid</text>
  <path class="d-edge-accent" d="M 470 128 L 470 106" marker-end="url(#df1-arrow)"/>
  <text class="d-text d-accent" x="470" y="146" text-anchor="middle">high</text>
  <rect class="d-box-muted" x="40" y="178" width="560" height="50" rx="10"/>
  <text class="d-text" x="320" y="208" text-anchor="middle">the loop runs while mid is not past high</text>
</svg>

📌 **Interview term: Loop invariant** — a statement true before and after every iteration. Here: positions \`[0, low)\` are all 0, \`[low, mid)\` are all 1, \`[mid, high]\` are not yet examined, and \`(high, end]\` are all 2. At the start the unknown region is the whole array; the loop ends when it is empty (\`mid > high\`), and then the invariant says the array is sorted.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 270" role="img" aria-label="What the algorithm does for each value at mid, 0 swaps with low and moves both, 1 moves mid, 2 swaps with high and moves only high">
  <defs>
    <marker id="df2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="220" y="24" width="220" height="56" rx="10"/>
  <text class="d-text" x="330" y="57" text-anchor="middle">look at nums at mid</text>
  <path class="d-edge" d="M 270 84 L 120 146" marker-end="url(#df2-arrow)"/>
  <path class="d-edge" d="M 330 84 L 330 146" marker-end="url(#df2-arrow)"/>
  <path class="d-edge" d="M 390 84 L 540 146" marker-end="url(#df2-arrow)"/>
  <rect class="d-box-muted" x="20" y="150" width="200" height="96" rx="10"/>
  <text class="d-text" x="120" y="181" text-anchor="middle">it is 0</text>
  <text class="d-sub" x="120" y="203" text-anchor="middle">swap with low</text>
  <text class="d-sub" x="120" y="225" text-anchor="middle">low and mid move</text>
  <rect class="d-box-muted" x="240" y="150" width="180" height="96" rx="10"/>
  <text class="d-text" x="330" y="181" text-anchor="middle">it is 1</text>
  <text class="d-sub" x="330" y="203" text-anchor="middle">already in place</text>
  <text class="d-sub" x="330" y="225" text-anchor="middle">mid moves</text>
  <rect class="d-box-muted" x="440" y="150" width="200" height="96" rx="10"/>
  <text class="d-text" x="540" y="181" text-anchor="middle">it is 2</text>
  <text class="d-sub" x="540" y="203" text-anchor="middle">swap with high</text>
  <text class="d-sub" x="540" y="225" text-anchor="middle">only high moves</text>
</svg>

The three rules, and why each one is safe:

- **\`nums[mid]\` is 0:** swap it with \`nums[low]\`, then move **both** \`low\` and \`mid\` forward. The value that comes back from \`low\` was already examined: it is a 1 (from the 1s region), or it is the same element when \`low == mid\`. Either way \`mid\` can move past it.
- **\`nums[mid]\` is 1:** it is already in the right region; move \`mid\` forward.
- **\`nums[mid]\` is 2:** swap it with \`nums[high]\` and move **only** \`high\` back. The value that came from \`high\` has never been examined, so \`mid\` must look at it next. Moving \`mid\` here is the classic bug.

Every iteration either moves \`mid\` forward or moves \`high\` back, so the unknown region shrinks by exactly one each time: the loop runs **exactly n times**. Example 2 confirms this on 1,000 values.

Other partition problems with the same pointer moves: [move zeroes](/interview-question/how-do-you-move-all-zeroes-to-the-end-of-an-array-in-place) is the two-region version, and [Partition Array](/interview-question/partition-array) is the coding-round version around a pivot. The general [two-pointer technique](/interview-question/what-is-the-two-pointer-technique) page covers both pointer shapes used here.

## 4. Counting Sort in Java

The two-pass answer first, because it is the easiest correct O(n) solution and a good thing to say before the one-pass version.

~~~java
// Two passes: count each value, then overwrite the array in order.
static void counting(int[] nums) {
    int[] counts = new int[3];
    for (int x : nums) counts[x]++;
    int i = 0;
    for (int value = 0; value < 3; value++)
        for (int c = 0; c < counts[value]; c++) nums[i++] = value;
}
~~~

**Variations:** The rewrite can also be written with \`Arrays.fill(nums, 0, c0, 0); Arrays.fill(nums, c0, c0 + c1, 1); Arrays.fill(nums, c0 + c1, nums.length, 2);\` — each call fills the half-open range \`[from, to)\`.

## 5. Dutch National Flag in Java

This is the traced version from Example 1; without the \`println\` line it is the whole solution. The \`swap\` helper is three lines with a temporary variable.

~~~java
// Dutch national flag, one pass, printing the three pointers before every step.
static void sortColorsTraced(int[] nums) {
    int low = 0, mid = 0, high = nums.length - 1;
    // invariant: [0, low) are 0s, [low, mid) are 1s, [mid, high] unknown, (high, end] are 2s
    while (mid <= high) {
        System.out.println("low=" + low + " mid=" + mid + " high=" + high + "  " + Arrays.toString(nums));
        if (nums[mid] == 0) {
            swap(nums, low++, mid++);
        } else if (nums[mid] == 1) {
            mid++;
        } else {
            swap(nums, mid, high--); // do NOT move mid: the value swapped in is still unchecked
        }
    }
    System.out.println("done: " + Arrays.toString(nums));
}
~~~

**Line by line:**

- \`int high = nums.length - 1\` — for an empty array \`high\` is \`-1\`, so \`mid <= high\` is false and nothing runs.
- \`swap(nums, low++, mid++)\` passes the old values of \`low\` and \`mid\` and then increments both. It is well defined because Java evaluates method arguments left to right, each exactly once ([JLS §15.7.4](https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.7.4)).
- \`swap(nums, mid, high--)\` swaps with the old \`high\` and then decrements it; \`mid\` does not move.

## 6. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — a traced run on [2, 0, 2, 1, 1, 0]** prints:

~~~text
low=0 mid=0 high=5  [2, 0, 2, 1, 1, 0]
low=0 mid=0 high=4  [0, 0, 2, 1, 1, 2]
low=1 mid=1 high=4  [0, 0, 2, 1, 1, 2]
low=2 mid=2 high=4  [0, 0, 2, 1, 1, 2]
low=2 mid=2 high=3  [0, 0, 1, 1, 2, 2]
low=2 mid=3 high=3  [0, 0, 1, 1, 2, 2]
done: [0, 0, 1, 1, 2, 2]
~~~

**Example 2 — edge cases, and both methods on 1,000 values** prints:

~~~text
[0, 1, 2]
[]
[1]
[2, 2, 2]
[0, 0, 1, 1, 2, 2]
n=1000: zeros 324, ones 343, twos 333
n=1000: same result true, sorted true, dutch flag steps 1000
~~~

**Reading the trace:** the first step sees a 2 at \`mid\`, swaps it with the 0 at index 5 and only moves \`high\` (5 to 4); the second step then examines that 0 at index 0, which is why \`mid\` had to stay. The second and third steps find 0s while \`low == mid\`, so the swaps are self-swaps and both pointers move together; the fourth step is another 2-swap, after which only 1s are left to step over. Six lines before \`done\` means six iterations for six elements, and the 1,000-value run confirms the loop always runs exactly n times, while agreeing with counting sort and with the library sort.

## 7. Complexity

| Approach | Time | Extra space | Passes | Why |
| :--- | :--- | :--- | :--- | :--- |
| Library sort | O(n log n) | depends on the sort | many | general comparison sort ignores that there are only 3 values |
| Counting sort | O(n) | O(1) | 2 | one pass to count, one to rewrite |
| Dutch national flag | O(n) | O(1) | 1 | the unknown region shrinks by one each iteration: exactly n iterations |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 8. Edge Cases

- **Empty array:** \`high\` starts at -1, the loop does not run.
- **One element** (\`[1]\`): one iteration, unchanged.
- **All the same** (\`[2, 2, 2]\`): every step swaps with \`high\`, which only moves \`high\`; the array is unchanged.
- **Reverse sorted** (\`[2, 1, 0]\` or \`[2, 0, 1]\`): a good test that \`mid\` stays put after a 2-swap.
- **Already sorted:** still n iterations, with self-swaps when \`low == mid\`.
- **A value outside 0 to 2:** not handled; ask about it before coding.

## Common Pitfalls

- **Advancing \`mid\` after swapping with \`high\`.** The value swapped in from \`high\` has not been checked yet; in a test run the version that also moved \`mid\` turned \`[1, 2, 0]\` into \`[1, 0, 2]\`.
- **\`while (mid < high)\`.** It stops one element early and leaves the last unknown element unexamined: in a test run that version turned \`[2, 0, 1]\` into \`[1, 0, 2]\`.
- **Checking with \`==\`.** \`a == b\` on two arrays compares references; use \`Arrays.equals(a, b)\`, as Example 2 does.
- **Writing the swap inline with the wrong temp.** Without a helper it is easy to write \`nums[mid] = nums[high]; nums[high] = nums[mid];\` and lose a value. Use the three-line helper.
- **Values outside 0 to 2.** \`counts[x]++\` with a 3 throws \`ArrayIndexOutOfBoundsException\`, and the flag algorithm silently treats it as a 2. Ask, or validate.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Simple answer:</strong> <span style="color:#f0e2c8;">Counting sort: count the 0s, 1s and 2s into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[3]</code>, then rewrite with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.fill</code>. O(n), two passes, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. One pass:</strong> <span style="color:#f0e2c8;">Dutch national flag with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code>: 0 swaps to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> (both move), 1 moves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code>, 2 swaps to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> (only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> moves).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Invariant:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, low)</code> are 0s, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[low, mid)</code> are 1s, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[mid, high]</code> unknown, after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> are 2s; stop when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid &gt; high</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time, exactly n iterations, O(1) extra space; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort</code> would be O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">swap(int[], int, int)</code> helper, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">swap(nums, low++, mid++)</code> is safe because arguments are evaluated left to right, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.equals</code> to check.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">mid</code> move after a 0-swap but not after a 2-swap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> you get a value already examined (a 1, or the same element when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low == mid</code>). From <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> you get an unexamined value, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> must check it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Arrays.sort(nums)</code> acceptable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is correct but O(n log n), and it ignores that there are only three values. Mention it, then give the O(n) answers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many iterations does the loop run?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exactly n: each iteration moves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> forward or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> back by one, shrinking the unknown region by one. The 1,000-value run printed 1000 steps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the array holds objects with a colour field?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Counting sort would lose the objects (it rewrites values). The flag algorithm swaps whole elements, so it still works, though it is not stable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if there are k colours?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Counting sort generalises to O(n + k) with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[k]</code>. For k = 3 the flag algorithm is the classic one-pass answer.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Counting sort** | count each value, then write the values out in order: O(n + k) |
| **Dutch national flag algorithm** | one-pass three-pointer partition into 0s, 1s and 2s |
| **Three-way partition** | split into less than, equal to and greater than a pivot |
| **Loop invariant** | a fact that holds before and after every iteration |
| **Left-to-right evaluation** | Java evaluates method arguments in order, so \`swap(a, low++, mid++)\` is well defined |

---
**Conclusion:** Sorting an array of 0s, 1s and 2s does not need a general sort. Counting sort solves it in two O(n) passes with three counters; the Dutch national flag algorithm solves it in one pass with \`low\`, \`mid\` and \`high\`, keeping 0s, 1s, an unknown middle and 2s as four regions and shrinking the unknown region by exactly one element per iteration. The one rule that decides whether the code is right is that \`mid\` stays put after swapping with \`high\`. In Java, add the language details shown above, and the answer is complete.`,
        examples: [
          { label: `Dutch national flag, traced step by step`, code: `import java.util.Arrays;

public class Main {
    static void swap(int[] a, int i, int j) {
        int tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }

    // Dutch national flag, one pass, printing the three pointers before every step.
    static void sortColorsTraced(int[] nums) {
        int low = 0, mid = 0, high = nums.length - 1;
        // invariant: [0, low) are 0s, [low, mid) are 1s, [mid, high] unknown, (high, end] are 2s
        while (mid <= high) {
            System.out.println("low=" + low + " mid=" + mid + " high=" + high + "  " + Arrays.toString(nums));
            if (nums[mid] == 0) {
                swap(nums, low++, mid++);
            } else if (nums[mid] == 1) {
                mid++;
            } else {
                swap(nums, mid, high--); // do NOT move mid: the value swapped in is still unchecked
            }
        }
        System.out.println("done: " + Arrays.toString(nums));
    }

    public static void main(String[] args) {
        sortColorsTraced(new int[]{2, 0, 2, 1, 1, 0});
    }
}` },
          { label: `Edge cases, and Dutch flag vs counting sort on 1,000 values`, code: `import java.util.Arrays;

public class Main {
    static void swap(int[] a, int i, int j) {
        int tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }

    // One pass, O(1) space. Returns the number of loop steps it took.
    static int dutchFlag(int[] nums) {
        int low = 0, mid = 0, high = nums.length - 1, steps = 0;
        while (mid <= high) {
            steps++;
            if (nums[mid] == 0) swap(nums, low++, mid++);
            else if (nums[mid] == 1) mid++;
            else swap(nums, mid, high--);
        }
        return steps;
    }

    // Two passes: count each value, then overwrite the array in order.
    static void counting(int[] nums) {
        int[] counts = new int[3];
        for (int x : nums) counts[x]++;
        int i = 0;
        for (int value = 0; value < 3; value++)
            for (int c = 0; c < counts[value]; c++) nums[i++] = value;
    }

    static String demo(int[] nums) {
        dutchFlag(nums);
        return Arrays.toString(nums);
    }

    public static void main(String[] args) {
        System.out.println(demo(new int[]{2, 0, 1}));           // [0, 1, 2]
        System.out.println(demo(new int[]{}));                  // []
        System.out.println(demo(new int[]{1}));                 // [1]
        System.out.println(demo(new int[]{2, 2, 2}));           // [2, 2, 2]
        System.out.println(demo(new int[]{0, 1, 2, 0, 1, 2}));  // [0, 0, 1, 1, 2, 2]

        // 1000 pseudo-random values from a tiny deterministic generator (same in every language)
        int x = 7;
        int[] data = new int[1000];
        int[] counts = new int[3];
        for (int i = 0; i < 1000; i++) {
            x = (x * 75 + 74) % 65537;
            data[i] = x % 3;
            counts[data[i]]++;
        }
        int[] a = data.clone(), b = data.clone(), sorted = data.clone();
        int steps = dutchFlag(a);
        counting(b);
        Arrays.sort(sorted);
        System.out.println("n=1000: zeros " + counts[0] + ", ones " + counts[1] + ", twos " + counts[2]);
        // Arrays.equals compares contents; a == b would compare references
        System.out.println("n=1000: same result " + Arrays.equals(a, b) + ", sorted " + Arrays.equals(a, sorted)
            + ", dutch flag steps " + steps);
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given a vector that contains only 0s, 1s and 2s. Sort it in place, ideally in a single pass and without calling std::sort. Please write it in C++."

**What a strong answer should cover:**
- Counting sort (two passes, three counters) as the simple O(n) answer, then the one-pass Dutch national flag with \`low\`, \`mid\`, \`high\`.
- The invariant (0s, 1s, unknown, 2s) and why \`mid\` does not advance after swapping with \`high\`.
- O(n) time, O(1) extra space, exactly n loop iterations; versus O(n log n) for \`std::sort\`.
- Edge cases: empty vector, all one value, already sorted, reverse sorted.
- C++ specifics: signed \`int\` indices, because \`high\` starts at -1 for an empty vector and can drop below \`mid\` (with \`size_t\` it would wrap around); \`std::swap\`; \`vector<int>&\` parameter; \`vector ==\` compares contents.

**Clarifying questions expected:**
- "Are 0, 1 and 2 the only values, and may I use \`std::sort\`?"
- "Does it have to be a single pass?"

**Code / implementation expected:** Yes — \`void sortColors(std::vector<int>& nums)\` in C++ with three indices, mutating the vector in place.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A cook has a tray of jelly beans in three flavours, red, white and blue, all mixed up in a single row, and wants them grouped: all red on the left, all white in the middle, all blue on the right. She could count each colour and then lay out a fresh row, but she has no second tray. So she uses two fingers as fences. Everything left of her left finger is red; everything right of her right finger is blue. She looks at beans one by one between the fences: a red bean gets swapped to just inside the left fence, which then moves right; a blue bean gets swapped to just inside the right fence, which then moves left; a white bean stays where it is. When the bean she is looking at reaches the right fence, the row is sorted, after a single pass.

This is the **Dutch national flag problem**, proposed by Edsger Dijkstra and named after the red, white and blue bands of the flag of the Netherlands ([Wikipedia: Dutch national flag problem](https://en.wikipedia.org/wiki/Dutch_national_flag_problem)). The interview version uses 0, 1 and 2 instead of colours (it is also called "Sort Colors"). The question tests whether you can maintain several regions of an array at once with pointers, and whether you see that a general sort is overkill when there are only three distinct values.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are 0, 1 and 2 the only possible values? | Both fast solutions depend on it; an unexpected value would be lost or misplaced. |
| Must it be in place? Is a library sort allowed? | A library sort is O(n log n) and usually not what is wanted; the follow-up is "do it in one pass". |
| Is one pass required, or are two passes fine? | Counting sort uses two passes and is simple; Dutch national flag uses one. |
| Are these plain numbers, or objects with a 0/1/2 key? | With objects, counting and rewriting values loses the objects, and stability may matter. |
| What about an empty array? | Should simply return without error. |

## 3. The Core Idea

There are three reasonable answers, in increasing order of what the interviewer is hoping for.

**1. Use the library sort.** Correct, O(n log n). It ignores the fact that there are only three values. See [how merge sort and quicksort work](/interview-question/how-do-merge-sort-and-quicksort-work) for why general sorting cannot beat n log n comparisons.

**2. Counting sort, two passes.** Count how many 0s, 1s and 2s there are, then overwrite the array: that many 0s, then 1s, then 2s. O(n) time, O(1) extra space (three counters).

📌 **Interview term: Counting sort** — sorting by counting how many times each possible value occurs and then writing the values out in order. It runs in O(n + k) for k possible values, which is O(n) here because k = 3.

**3. Dutch national flag, one pass.** Three pointers split the array into four regions and a single scan shrinks the unknown region to nothing.

📌 **Interview term: Dutch national flag algorithm** — Dijkstra's one-pass, in-place three-way partition: \`low\`, \`mid\` and \`high\` pointers keep 0s before \`low\`, 1s between \`low\` and \`mid\`, unknown values between \`mid\` and \`high\`, and 2s after \`high\`.

📌 **Interview term: Three-way partition** — splitting an array into "less than", "equal to" and "greater than" a pivot in one pass. Sort Colors is a three-way partition with pivot 1. The same routine makes quicksort fast on arrays with many duplicates, and it appears in [quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="The four regions of the Dutch national flag algorithm, 0s before low, 1s from low to mid, unknown from mid to high, 2s after high">
  <defs>
    <marker id="df1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="40" width="130" height="60" rx="10"/>
  <text class="d-text" x="105" y="75" text-anchor="middle">0s</text>
  <rect class="d-box" x="190" y="40" width="130" height="60" rx="10"/>
  <text class="d-text" x="255" y="75" text-anchor="middle">1s</text>
  <rect class="d-box-muted" x="340" y="40" width="140" height="60" rx="10"/>
  <text class="d-text" x="410" y="75" text-anchor="middle">unknown</text>
  <rect class="d-box-accent" x="500" y="40" width="100" height="60" rx="10"/>
  <text class="d-text" x="550" y="75" text-anchor="middle">2s</text>
  <path class="d-edge-accent" d="M 200 128 L 200 106" marker-end="url(#df1-arrow)"/>
  <text class="d-text d-accent" x="200" y="146" text-anchor="middle">low</text>
  <path class="d-edge-accent" d="M 350 128 L 350 106" marker-end="url(#df1-arrow)"/>
  <text class="d-text d-accent" x="350" y="146" text-anchor="middle">mid</text>
  <path class="d-edge-accent" d="M 470 128 L 470 106" marker-end="url(#df1-arrow)"/>
  <text class="d-text d-accent" x="470" y="146" text-anchor="middle">high</text>
  <rect class="d-box-muted" x="40" y="178" width="560" height="50" rx="10"/>
  <text class="d-text" x="320" y="208" text-anchor="middle">the loop runs while mid is not past high</text>
</svg>

📌 **Interview term: Loop invariant** — a statement true before and after every iteration. Here: positions \`[0, low)\` are all 0, \`[low, mid)\` are all 1, \`[mid, high]\` are not yet examined, and \`(high, end]\` are all 2. At the start the unknown region is the whole array; the loop ends when it is empty (\`mid > high\`), and then the invariant says the array is sorted.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 270" role="img" aria-label="What the algorithm does for each value at mid, 0 swaps with low and moves both, 1 moves mid, 2 swaps with high and moves only high">
  <defs>
    <marker id="df2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="220" y="24" width="220" height="56" rx="10"/>
  <text class="d-text" x="330" y="57" text-anchor="middle">look at nums at mid</text>
  <path class="d-edge" d="M 270 84 L 120 146" marker-end="url(#df2-arrow)"/>
  <path class="d-edge" d="M 330 84 L 330 146" marker-end="url(#df2-arrow)"/>
  <path class="d-edge" d="M 390 84 L 540 146" marker-end="url(#df2-arrow)"/>
  <rect class="d-box-muted" x="20" y="150" width="200" height="96" rx="10"/>
  <text class="d-text" x="120" y="181" text-anchor="middle">it is 0</text>
  <text class="d-sub" x="120" y="203" text-anchor="middle">swap with low</text>
  <text class="d-sub" x="120" y="225" text-anchor="middle">low and mid move</text>
  <rect class="d-box-muted" x="240" y="150" width="180" height="96" rx="10"/>
  <text class="d-text" x="330" y="181" text-anchor="middle">it is 1</text>
  <text class="d-sub" x="330" y="203" text-anchor="middle">already in place</text>
  <text class="d-sub" x="330" y="225" text-anchor="middle">mid moves</text>
  <rect class="d-box-muted" x="440" y="150" width="200" height="96" rx="10"/>
  <text class="d-text" x="540" y="181" text-anchor="middle">it is 2</text>
  <text class="d-sub" x="540" y="203" text-anchor="middle">swap with high</text>
  <text class="d-sub" x="540" y="225" text-anchor="middle">only high moves</text>
</svg>

The three rules, and why each one is safe:

- **\`nums[mid]\` is 0:** swap it with \`nums[low]\`, then move **both** \`low\` and \`mid\` forward. The value that comes back from \`low\` was already examined: it is a 1 (from the 1s region), or it is the same element when \`low == mid\`. Either way \`mid\` can move past it.
- **\`nums[mid]\` is 1:** it is already in the right region; move \`mid\` forward.
- **\`nums[mid]\` is 2:** swap it with \`nums[high]\` and move **only** \`high\` back. The value that came from \`high\` has never been examined, so \`mid\` must look at it next. Moving \`mid\` here is the classic bug.

Every iteration either moves \`mid\` forward or moves \`high\` back, so the unknown region shrinks by exactly one each time: the loop runs **exactly n times**. Example 2 confirms this on 1,000 values.

Other partition problems with the same pointer moves: [move zeroes](/interview-question/how-do-you-move-all-zeroes-to-the-end-of-an-array-in-place) is the two-region version, and [Partition Array](/interview-question/partition-array) is the coding-round version around a pivot. The general [two-pointer technique](/interview-question/what-is-the-two-pointer-technique) page covers both pointer shapes used here.

## 4. Counting Sort in C++

The two-pass answer first, because it is the easiest correct O(n) solution and a good thing to say before the one-pass version.

~~~cpp
// Two passes: count each value, then overwrite the vector in order.
void counting(vector<int>& nums) {
    int counts[3] = {0, 0, 0};
    for (int x : nums) counts[x]++;
    size_t i = 0;
    for (int value = 0; value < 3; value++)
        for (int c = 0; c < counts[value]; c++) nums[i++] = value;
}
~~~

**Variations:** The rewrite can also use \`std::fill_n\`: \`auto it = std::fill_n(nums.begin(), c0, 0); it = std::fill_n(it, c1, 1); std::fill_n(it, c2, 2);\` — \`fill_n\` returns the iterator just past the last element written, so the calls chain.

## 5. Dutch National Flag in C++

This is the traced version from Example 1; without the \`cout\` line it is the whole solution. It takes \`vector<int>&\` so the caller vector is sorted, not a copy.

~~~cpp
// Dutch national flag, one pass, printing the three pointers before every step.
void sortColorsTraced(vector<int>& nums) {
    // int, not size_t: high starts at -1 for an empty vector and can drop below mid
    int low = 0, mid = 0, high = static_cast<int>(nums.size()) - 1;
    // invariant: [0, low) are 0s, [low, mid) are 1s, [mid, high] unknown, (high, end] are 2s
    while (mid <= high) {
        cout << "low=" << low << " mid=" << mid << " high=" << high << "  " << fmt(nums) << "\\n";
        if (nums[mid] == 0) {
            swap(nums[low++], nums[mid++]);
        } else if (nums[mid] == 1) {
            mid++;
        } else {
            swap(nums[mid], nums[high--]);  // do NOT move mid: the value swapped in is still unchecked
        }
    }
    cout << "done: " << fmt(nums) << "\\n";
}
~~~

**Line by line:**

- \`int high = static_cast<int>(nums.size()) - 1\` — signed on purpose. For an empty vector it is \`-1\`, and in the "2" branch \`high--\` can go below \`mid\`, which is exactly how the loop ends. With \`size_t\`, \`high--\` at 0 would wrap around to the largest \`size_t\` value, \`mid <= high\` would stay true, and the loop would read out of bounds.
- \`swap(nums[low++], nums[mid++])\` is fine: \`low\` and \`mid\` are different variables, each modified once, and both increments are complete before \`swap\` runs.
- \`swap(nums[mid], nums[high--])\` swaps with the old \`high\` and then decrements it; \`mid\` does not move.

## 6. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — a traced run on [2, 0, 2, 1, 1, 0]** prints:

~~~text
low=0 mid=0 high=5  [2, 0, 2, 1, 1, 0]
low=0 mid=0 high=4  [0, 0, 2, 1, 1, 2]
low=1 mid=1 high=4  [0, 0, 2, 1, 1, 2]
low=2 mid=2 high=4  [0, 0, 2, 1, 1, 2]
low=2 mid=2 high=3  [0, 0, 1, 1, 2, 2]
low=2 mid=3 high=3  [0, 0, 1, 1, 2, 2]
done: [0, 0, 1, 1, 2, 2]
~~~

**Example 2 — edge cases, and both methods on 1,000 values** prints:

~~~text
[0, 1, 2]
[]
[1]
[2, 2, 2]
[0, 0, 1, 1, 2, 2]
n=1000: zeros 324, ones 343, twos 333
n=1000: same result true, sorted true, dutch flag steps 1000
~~~

**Reading the trace:** the first step sees a 2 at \`mid\`, swaps it with the 0 at index 5 and only moves \`high\` (5 to 4); the second step then examines that 0 at index 0, which is why \`mid\` had to stay. The second and third steps find 0s while \`low == mid\`, so the swaps are self-swaps and both pointers move together; the fourth step is another 2-swap, after which only 1s are left to step over. Six lines before \`done\` means six iterations for six elements, and the 1,000-value run confirms the loop always runs exactly n times, while agreeing with counting sort and with the library sort.

## 7. Complexity

| Approach | Time | Extra space | Passes | Why |
| :--- | :--- | :--- | :--- | :--- |
| Library sort | O(n log n) | depends on the sort | many | general comparison sort ignores that there are only 3 values |
| Counting sort | O(n) | O(1) | 2 | one pass to count, one to rewrite |
| Dutch national flag | O(n) | O(1) | 1 | the unknown region shrinks by one each iteration: exactly n iterations |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 8. Edge Cases

- **Empty array:** \`high\` starts at -1, the loop does not run.
- **One element** (\`[1]\`): one iteration, unchanged.
- **All the same** (\`[2, 2, 2]\`): every step swaps with \`high\`, which only moves \`high\`; the array is unchanged.
- **Reverse sorted** (\`[2, 1, 0]\` or \`[2, 0, 1]\`): a good test that \`mid\` stays put after a 2-swap.
- **Already sorted:** still n iterations, with self-swaps when \`low == mid\`.
- **A value outside 0 to 2:** not handled; ask about it before coding.

## Common Pitfalls

- **Advancing \`mid\` after swapping with \`high\`.** The value swapped in from \`high\` has not been checked yet; in a test run the version that also moved \`mid\` turned \`[1, 2, 0]\` into \`[1, 0, 2]\`.
- **\`size_t\` for \`high\`.** Decrementing it at 0 wraps around instead of going to -1, so the loop never stops and reads out of bounds. Use \`int\`.
- **\`while (mid < high)\`.** It stops one element early and leaves the last unknown element unexamined: in a test run that version turned \`[2, 0, 1]\` into \`[1, 0, 2]\`.
- **Passing by value.** \`void sortColors(vector<int> nums)\` sorts a copy; the caller sees nothing.
- **Values outside 0 to 2.** \`counts[x]++\` with a 3 writes past the end of a C array (undefined behaviour), and the flag algorithm silently treats it as a 2. Ask, or validate.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Simple answer:</strong> <span style="color:#f0e2c8;">Counting sort: count the 0s, 1s and 2s into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int counts[3]</code>, then overwrite the vector. O(n), two passes, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. One pass:</strong> <span style="color:#f0e2c8;">Dutch national flag with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code>: 0 swaps to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> (both move), 1 moves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code>, 2 swaps to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> (only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> moves).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Invariant:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, low)</code> are 0s, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[low, mid)</code> are 1s, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[mid, high]</code> unknown, after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> are 2s; stop when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid &gt; high</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time, exactly n iterations, O(1) extra space; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> would be O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> indices because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> must be able to reach -1, take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;&amp;</code>, and swap with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::swap</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">mid</code> move after a 0-swap but not after a 2-swap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low</code> you get a value already examined (a 1, or the same element when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low == mid</code>). From <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> you get an unexamined value, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> must check it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">size_t</code> for the indices?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> has to go below <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> (to -1 for an empty or all-2 vector). With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 - 1</code> wraps to a huge value and the loop runs off the end.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many iterations does the loop run?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exactly n: each iteration moves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> forward or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">high</code> back by one, shrinking the unknown region by one. The 1,000-value run printed 1000 steps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::sort</code> acceptable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Correct but O(n log n). With only three values, counting or the flag algorithm is O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the elements are structs with a colour key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Counting would lose the structs. The flag algorithm swaps whole elements, so it works, though it is not stable; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stable_partition</code> twice would keep order.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Counting sort** | count each value, then write the values out in order: O(n + k) |
| **Dutch national flag algorithm** | one-pass three-pointer partition into 0s, 1s and 2s |
| **Three-way partition** | split into less than, equal to and greater than a pivot |
| **Loop invariant** | a fact that holds before and after every iteration |
| **Unsigned wrap-around** | \`size_t\` arithmetic below 0 wraps to a huge number instead of going negative |

---
**Conclusion:** Sorting an array of 0s, 1s and 2s does not need a general sort. Counting sort solves it in two O(n) passes with three counters; the Dutch national flag algorithm solves it in one pass with \`low\`, \`mid\` and \`high\`, keeping 0s, 1s, an unknown middle and 2s as four regions and shrinking the unknown region by exactly one element per iteration. The one rule that decides whether the code is right is that \`mid\` stays put after swapping with \`high\`. In C++, add the language details shown above, and the answer is complete.`,
        examples: [
          { label: `Dutch national flag, traced step by step`, code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

string fmt(const vector<int>& a) {
    string out = "[";
    for (size_t i = 0; i < a.size(); i++) out += (i ? ", " : "") + to_string(a[i]);
    return out + "]";
}

// Dutch national flag, one pass, printing the three pointers before every step.
void sortColorsTraced(vector<int>& nums) {
    // int, not size_t: high starts at -1 for an empty vector and can drop below mid
    int low = 0, mid = 0, high = static_cast<int>(nums.size()) - 1;
    // invariant: [0, low) are 0s, [low, mid) are 1s, [mid, high] unknown, (high, end] are 2s
    while (mid <= high) {
        cout << "low=" << low << " mid=" << mid << " high=" << high << "  " << fmt(nums) << "\\n";
        if (nums[mid] == 0) {
            swap(nums[low++], nums[mid++]);
        } else if (nums[mid] == 1) {
            mid++;
        } else {
            swap(nums[mid], nums[high--]);  // do NOT move mid: the value swapped in is still unchecked
        }
    }
    cout << "done: " << fmt(nums) << "\\n";
}

int main() {
    vector<int> nums = {2, 0, 2, 1, 1, 0};
    sortColorsTraced(nums);
}` },
          { label: `Edge cases, and Dutch flag vs counting sort on 1,000 values`, code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

// One pass, O(1) space. Returns the number of loop steps it took.
int dutchFlag(vector<int>& nums) {
    int low = 0, mid = 0, high = static_cast<int>(nums.size()) - 1, steps = 0;
    while (mid <= high) {
        steps++;
        if (nums[mid] == 0) swap(nums[low++], nums[mid++]);
        else if (nums[mid] == 1) mid++;
        else swap(nums[mid], nums[high--]);
    }
    return steps;
}

// Two passes: count each value, then overwrite the vector in order.
void counting(vector<int>& nums) {
    int counts[3] = {0, 0, 0};
    for (int x : nums) counts[x]++;
    size_t i = 0;
    for (int value = 0; value < 3; value++)
        for (int c = 0; c < counts[value]; c++) nums[i++] = value;
}

string fmt(const vector<int>& a) {
    string out = "[";
    for (size_t i = 0; i < a.size(); i++) out += (i ? ", " : "") + to_string(a[i]);
    return out + "]";
}

string demo(vector<int> nums) {
    dutchFlag(nums);
    return fmt(nums);
}

int main() {
    cout << demo({2, 0, 1}) << "\\n";           // [0, 1, 2]
    cout << demo({}) << "\\n";                  // []
    cout << demo({1}) << "\\n";                 // [1]
    cout << demo({2, 2, 2}) << "\\n";           // [2, 2, 2]
    cout << demo({0, 1, 2, 0, 1, 2}) << "\\n";  // [0, 0, 1, 1, 2, 2]

    // 1000 pseudo-random values from a tiny deterministic generator (same in every language)
    int x = 7;
    vector<int> data;
    for (int i = 0; i < 1000; i++) {
        x = (x * 75 + 74) % 65537;
        data.push_back(x % 3);
    }
    vector<int> a = data, b = data, sorted = data;
    int steps = dutchFlag(a);
    counting(b);
    sort(sorted.begin(), sorted.end());
    cout << "n=1000: zeros " << count(data.begin(), data.end(), 0) << ", ones "
         << count(data.begin(), data.end(), 1) << ", twos " << count(data.begin(), data.end(), 2) << "\\n";
    // vector == compares contents element by element
    cout << boolalpha << "n=1000: same result " << (a == b) << ", sorted " << (a == sorted)
         << ", dutch flag steps " << steps << "\\n";
}` },
        ],
      },
    },
  },
];

export default augments;
