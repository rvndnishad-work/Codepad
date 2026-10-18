/**
 * DSA ULTRA — batch 28: dynamic programming I (1D), part 2 — maximum product
 * subarray, coin change (fewest coins and number of ways), unique paths in a
 * grid, decode ways (the 0 and 06 edge cases) and word break. One complete
 * answer per language (Python, JavaScript, Java, C++). Every example was run
 * with python3 / node / javac+java / g++ -std=c++17 by
 * scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  {
    title: `How do you find the maximum product subarray?`,
    difficulty: "medium",
    seoDescription: `Maximum product subarray in O(n): track the largest and smallest product ending here, handle negatives and zeros, with verified Python, JS, Java, C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given an integer array that can contain negative numbers and zeros, find the contiguous subarray with the largest product and return that product. Walk me through your idea, then code it in Python."

**What a strong answer should cover:**
- Why plain Kadane (keep only the best product ending here) fails: a negative number turns the smallest product into the largest, so you must track both the maximum and the minimum product ending at each index.
- The recurrence: at each \`x\`, the new max is the largest of \`x\`, \`max * x\` and \`min * x\` (and the new min is the smallest of the same three); a zero resets both to 0, and the running best is updated every step.
- O(n) time and O(1) extra space, compared with the O(n²) brute force that tries every start and end.
- The alternative prefix/suffix scan (multiply left to right and right to left, restarting after a zero) and why it works: inside a stretch with no zero, the best product is always a prefix or a suffix of that stretch.
- Python details: \`int\` has arbitrary precision so products never overflow (they just get bigger and slower), the tuple swap \`hi, lo = lo, hi\`, and that \`nums[1:]\` copies the list.

**Clarifying questions expected:**
- Can the array contain zeros and negatives, and can it be empty?
- Is the answer guaranteed to fit in a 32-bit (or 64-bit) integer?
- Do you want just the product, or also the start and end indices of the subarray?

**Code / implementation expected:** Yes — a one-pass Python function that keeps the max and min product ending at each index.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, arrays and the idea of a running best value.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a game show where your score is a number and every round you draw a **multiplier card**. A ×3 card triples your score. A ×0 card wipes it out. And the nasty one: a ×(−2) card turns a big positive score into a big **negative** score.

Here is the twist that makes the game interesting. Suppose you are sitting on −40 points, the worst score in the room. Everyone pities you. Then you draw ×(−2) — and suddenly you have **+80**, the best score in the room. The worst position became the best position in a single card.

So a smart player does not only remember "what is the best score I could have right now?". They also remember "what is the **worst** score I could have right now?", because one negative card will flip the two. That is the whole trick of this problem. You may also leave the game and rejoin at any round (start a fresh run), which is what lets you dodge a ×0 card.

The maximum product subarray question is this game on an array: the cards are the numbers, a run of consecutive rounds is a subarray, and you want the largest score any run can reach.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the array contain zeros and negatives? | Zeros and negatives are the whole difficulty; with only positives the answer is the product of everything |
| Can the array be empty? | The usual code starts from \`nums[0]\`; an empty array needs an explicit rule |
| Does the answer fit in 32 bits, or 64? | Products grow very fast, so this decides the number type (see the Python notes below) |
| Do you need the subarray itself, or only the product? | Returning start and end indices means also tracking where each run began |
| Must the subarray be non-empty? | It always is in the standard version, so for \`[-2]\` the answer is −2, not 1 |

## 3. Why the Maximum-Sum Trick Breaks

📌 **Interview term: Subarray** — a contiguous slice of an array: some elements in a row, with nothing skipped. \`[3, -2]\` is a subarray of \`[2, 3, -2, 4]\`; \`[2, -2]\` is not.

If you have seen the [maximum subarray sum](/interview-question/how-do-you-find-the-maximum-subarray-sum) problem, you know Kadane's algorithm: walk the array, keep "the best sum of a subarray that **ends here**", and at each element either extend that run or start fresh. It works because for sums, a bigger running total is always a better starting point for the next element.

For **products** that is false. Look at \`[-2, 3, -4]\`:

- At index 1 the best product ending there is 3 (just \`[3]\`), because −2 × 3 = −6 is worse.
- At index 2 a "best only" algorithm would compute max(−4, 3 × −4) = −4.
- But the real answer is −2 × 3 × −4 = **24**. It came from −6, the **worst** product at index 1, multiplied by a negative.

A negative number turns the smallest product into the largest. So we must carry two numbers, not one.

📌 **Interview term: State** — the small set of values a dynamic programming solution remembers about the part of the input it has already seen. Here the state at each index is two numbers: the largest and the smallest product of a subarray ending at that index.

## 4. The Fix: Track the Largest and the Smallest Product Ending Here

At each element \`x\`, a subarray ending at \`x\` either is \`x\` alone, or extends the best or worst subarray that ended one step earlier. So there are only three candidates:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Three candidates feed the new maximum and the new minimum: x alone, the old maximum times x, and the old minimum times x">
  <defs>
    <marker id="b28q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="200" height="56" rx="10"/>
  <text class="d-text" x="120" y="54" text-anchor="middle">x alone</text>
  <rect class="d-box" x="20" y="102" width="200" height="56" rx="10"/>
  <text class="d-text" x="120" y="136" text-anchor="middle">old max times x</text>
  <rect class="d-box" x="20" y="184" width="200" height="56" rx="10"/>
  <text class="d-text" x="120" y="218" text-anchor="middle">old min times x</text>
  <path class="d-edge" d="M 222 48 L 452 72" marker-end="url(#b28q1-arrow)"/>
  <path class="d-edge" d="M 222 130 L 452 80" marker-end="url(#b28q1-arrow)"/>
  <path class="d-edge" d="M 222 212 L 452 88" marker-end="url(#b28q1-arrow)"/>
  <path class="d-edge-dashed" d="M 222 48 L 452 172"/>
  <path class="d-edge-dashed" d="M 222 130 L 452 180"/>
  <path class="d-edge-dashed" d="M 222 212 L 452 188"/>
  <rect class="d-box-accent" x="456" y="46" width="240" height="64" rx="10"/>
  <text class="d-text" x="576" y="74" text-anchor="middle">new max</text>
  <text class="d-sub" x="576" y="96" text-anchor="middle">largest of the three</text>
  <rect class="d-box-muted" x="456" y="150" width="240" height="64" rx="10"/>
  <text class="d-text" x="576" y="178" text-anchor="middle">new min</text>
  <text class="d-sub" x="576" y="200" text-anchor="middle">smallest of the three</text>
</svg>

Both new values are picked from the same three candidates, computed from the **old** max and min. Taking \`x\` alone is how a run restarts — that is how the algorithm steps past a zero: after a 0 both max and min become 0, and the next element is better off starting fresh.

There is a neat shortcut. When \`x\` is negative, multiplying by it reverses the order of numbers, so the old **min** times \`x\` becomes the big candidate and the old **max** times \`x\` the small one. Swapping max and min **before** multiplying lets you write just two lines: \`max = largest(x, max·x)\` and \`min = smallest(x, min·x)\`.

📌 **Interview term: Max/min product ending here** — the pair of values \`hi[i]\` (largest product of a subarray that ends exactly at index i) and \`lo[i]\` (smallest such product). The answer is the largest \`hi[i]\` over all i.

📌 **Interview term: Sign flip** — multiplying by a negative number reverses order: if a > b then a·x < b·x for x < 0. It is why the minimum must be tracked.

The recurrence, written out:

~~~text
hi[0] = lo[0] = nums[0]
hi[i] = max(nums[i], hi[i-1] * nums[i], lo[i-1] * nums[i])
lo[i] = min(nums[i], hi[i-1] * nums[i], lo[i-1] * nums[i])
answer = max over i of hi[i]
~~~

Each value only depends on the previous index, so the whole table collapses into three variables, \`hi\`, \`lo\` and \`best\`. This is a [dynamic programming](/interview-question/what-is-dynamic-programming) solution with O(1) space, exactly like [Kadane](/interview-question/maximum-subarray-kadane-vs-divide-and-conquer-proof-of-correctness) but with two values of state instead of one.

## 5. Walk-Through on [2, -5, -2, -4, 3]

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="The max and min product ending at each index of 2, -5, -2, -4, 3. Max reaches 20 at index 2 and 24 at index 4">
  <text class="d-sub" x="20" y="60">x</text>
  <text class="d-sub" x="20" y="140">max</text>
  <text class="d-sub" x="20" y="220">min</text>
  <rect class="d-box" x="110" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="150" y="61" text-anchor="middle">2</text>
  <rect class="d-box" x="220" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="260" y="61" text-anchor="middle">-5</text>
  <rect class="d-box" x="330" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="370" y="61" text-anchor="middle">-2</text>
  <rect class="d-box" x="440" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="480" y="61" text-anchor="middle">-4</text>
  <rect class="d-box" x="550" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="590" y="61" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="110" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="150" y="141" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="220" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="260" y="141" text-anchor="middle">-5</text>
  <rect class="d-box-accent" x="330" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="370" y="141" text-anchor="middle">20</text>
  <rect class="d-box-muted" x="440" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="480" y="141" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="550" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="590" y="141" text-anchor="middle">24</text>
  <rect class="d-box-muted" x="110" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="150" y="221" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="220" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="260" y="221" text-anchor="middle">-10</text>
  <rect class="d-box-muted" x="330" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="370" y="221" text-anchor="middle">-2</text>
  <rect class="d-box-muted" x="440" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="480" y="221" text-anchor="middle">-80</text>
  <rect class="d-box-muted" x="550" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="590" y="221" text-anchor="middle">-240</text>
  <path class="d-edge-accent" d="M 300 210 L 336 158"/>
</svg>

Read the table column by column (these numbers are the trace printed by example 1):

| i | x | max ending here | min ending here | best so far | what happened |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 0 | 2 | 2 | 2 | 2 | start |
| 1 | −5 | −5 | −10 | 2 | negative: 2 × −5 = −10 becomes the min; −5 alone is the max |
| 2 | −2 | **20** | −2 | 20 | the old **min** −10 × −2 = 20 — the worst became the best (the accent line) |
| 3 | −4 | 8 | −80 | 20 | negative again: 20 × −4 = −80 is now the min, −2 × −4 = 8 the max |
| 4 | 3 | **24** | −240 | **24** | 8 × 3 = 24, the subarray \`[-2, -4, 3]\` |

Without the \`min\` column, index 2 would have been max(−2, −5 × −2) = 10, and the run would never reach 24 — that subarray needs \`[-2, -4, 3]\` built on 8, which itself came from the min.

## 6. From Brute Force to One Pass in Python

**Brute force.** Try every start index \`i\`, and from it multiply forward one element at a time, keeping the best product seen. That is n(n+1)/2 multiplications — O(n²). It is a perfectly good first thing to say in an interview, and it is the reference that example 2 checks the fast versions against. (For n = 2000 it made 2,001,000 multiplications in our run.)

**One pass.** Keep \`hi\`, \`lo\` and \`best\`, and update them per element as in section 4:

~~~python
def max_product(nums):
    hi = lo = best = nums[0]      # largest / smallest product ending here
    for x in nums[1:]:
        if x < 0:                 # a negative flips big and small
            hi, lo = lo, hi
        hi = max(x, hi * x)       # extend the run, or start fresh at x
        lo = min(x, lo * x)
        best = max(best, hi)
    return best
~~~

**What to point out in this code:**

- \`hi, lo = lo, hi\` swaps in one line: the right side builds a tuple of the old values first, then unpacks it, so no temporary variable is needed.
- The order matters: swap first, then compute \`hi\` and \`lo\` from the swapped values. Each line uses \`hi\` or \`lo\` only from before this step, because \`hi = max(x, hi * x)\` reads \`hi\` before it writes it, and the \`lo\` line does not use \`hi\` at all.
- \`for x in nums[1:]\` is readable but **copies** the list (a slice is a new list). For a huge input, loop over indices or use \`itertools.islice(nums, 1, None)\`.
- Python \`int\` has **arbitrary precision**: \`hi * x\` never overflows, no matter how many numbers you multiply. The cost is that very large products become slow, many-digit numbers instead of failing.
- \`max()\` and \`min()\` take any number of arguments, so the no-swap version \`max(x, hi * x, lo * x)\` is also one line — but you must then compute both new values from the old pair (save them first), or the \`lo\` line would use the new \`hi\`.

## 7. Another O(n) Way: the Prefix/Suffix Scan

There is a second linear solution that is easy to remember and makes a good follow-up answer.

Think about a stretch of the array that contains no zero. If it has an **even** number of negatives, its whole product is positive and is the best you can do in that stretch. If it has an **odd** number, you must drop one negative: either everything up to and including the **first** negative, or everything from the **last** negative on. Either way, the best subarray is a **prefix** or a **suffix** of the stretch.

So multiply from the left and from the right at the same time, take the best of all the running products, and restart a running product at 1 whenever it hits a zero:

~~~python
def prefix_suffix(nums):
    n, best, left, right = len(nums), nums[0], 1, 1
    for i in range(n):
        left = (left if left != 0 else 1) * nums[i]          # restart after a zero
        right = (right if right != 0 else 1) * nums[n - 1 - i]
        best = max(best, left, right)
    return best
~~~

📌 **Interview term: Zero-free segment** — a maximal run of the array between zeros. No product subarray that beats 0 can cross a zero, so each segment can be solved on its own.

The two methods do the same O(n) work. The max/min version is the one interviewers usually expect because it is the general DP pattern; the prefix/suffix version is easier to prove correct. Example 2 runs both against the brute force on 300 random arrays.

## 8. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. Example 2 builds its random arrays with a small deterministic generator (MINSTD, \`seed = seed * 48271 mod 2147483647\`), so every language tests the same arrays.

**Example 1 — the one-pass solution on edge cases, plus the trace from section 5** prints:

~~~text
[2, 3, -2, 4] -> 6
[-2, 0, -1] -> 0
[-2] -> -2
[-2, 3, -4] -> 24
[0, 2] -> 2
[2, -5, -2, -4, 3] -> 24
[-1, -2, -3, 0, 4] -> 6
[-3, -1, -1] -> 3
trace of [2, -5, -2, -4, 3]:
i=0 x=2 hi=2 lo=2 best=2
i=1 x=-5 hi=-5 lo=-10 best=2
i=2 x=-2 hi=20 lo=-2 best=20
i=3 x=-4 hi=8 lo=-80 best=20
i=4 x=3 hi=24 lo=-240 best=24
~~~

What to read from this:

- \`[-2, 3, -4] -> 24\` is the case that breaks a "max only" solution: the 24 comes from the min −6 times −4.
- \`[-2, 0, -1] -> 0\`: every subarray containing a negative alone is negative, so the zero wins. \`[-2] -> -2\`: the subarray may not be empty, so a single negative is the answer.
- \`[-1, -2, -3, 0, 4] -> 6\`: the zero splits the array; on the left the best is −2 × −3 = 6 (dropping the first negative), which beats the 4 on the right.
- The trace is the table in section 5, line for line.

**Example 2 — brute force vs one pass vs prefix/suffix** prints:

~~~text
random arrays where all three methods agree: 300 of 300
n=2000: brute force answer 1 after 2001000 products
n=2000: one pass answer 1 after 1999 steps
~~~

All three methods agree on 300 random arrays of length 1–10 with values from −3 to 3 (lots of zeros and negatives). On 2,000 elements of ±1 the brute force needed 2,001,000 multiplications — that is n(n+1)/2 — while the one-pass version did 1,999 update steps.

## 9. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (every start, extend forward) | O(n²) | O(1) | n(n+1)/2 products; 2,001,000 for n = 2000 in example 2 |
| Max/min one pass | O(n) | O(1) | one constant-time update per element; only \`hi\`, \`lo\`, \`best\` are stored |
| Prefix/suffix scan | O(n) | O(1) | two running products, both updated once per index |

One Python-specific caveat: the O(1)-per-step claim assumes the numbers stay small. Because \`int\` never overflows, a long run of large factors produces a product with thousands of digits, and multiplying such numbers is no longer constant time. With the usual "fits in 32 bits" promise this never happens.

## 10. Edge Cases

- **A single element**, including a single negative: \`[-2]\` returns −2. Initialise \`best\` with \`nums[0]\`, never with 0 or 1.
- **Zeros**: \`[-2, 0, -1]\` returns 0; \`[0, 2]\` returns 2. The \`x alone\` candidate is what restarts a run after a zero.
- **An even number of negatives**: \`[-2, 3, -4]\` uses the whole array.
- **An odd number of negatives**: \`[-3, -1, -1]\` returns 3, dropping one negative from the left end.
- **All negatives with zeros between them**: the answer may be 0 even though no element is positive.
- **Very large products**: decide the number type before coding (see the pitfalls below).

## Common Pitfalls

- **Tracking only the maximum.** It is Kadane for sums, and it returns −4 instead of 24 on \`[-2, 3, -4]\`.
- **Updating \`hi\` and then using the new \`hi\` to compute \`lo\`** in the no-swap version (\`hi = max(x, hi*x, lo*x)\` followed by \`lo = min(x, hi*x, lo*x)\`). Save the old values first, or use the swap form.
- **Starting \`best\` at 0 or \`float("-inf")\` and forgetting to update it on the first element.** \`best = nums[0]\` handles a single negative element correctly.
- **Assuming overflow like other languages.** Python ints do not overflow, so a "fits in 32 bits" assumption cannot fail loudly here — but if you port the code to Java or C++, it will.
- **\`for x in nums[1:]\` on a huge list** creates a full copy; iterate by index when memory matters.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The trap:</strong> <span style="color:#f0e2c8;">Plain Kadane fails because a negative number turns the <strong style="color:#ffca28;">smallest</strong> product into the largest: on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-2, 3, -4]</code> the 24 comes from −6 × −4.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The state:</strong> <span style="color:#f0e2c8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code>, the largest and smallest product of a subarray ending here, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The update:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &lt; 0</code>, swap with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi, lo = lo, hi</code>; then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = max(x, hi * x)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = min(x, lo * x)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best = max(best, hi)</code>. Taking <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> alone restarts after a zero.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) space, compared with O(n²) for trying every start; for n = 2000 that was 1,999 steps against 2,001,000 products.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> never overflows, so there is no 32-bit worry, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[1:]</code> copies the list, so loop by index on huge inputs.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need the minimum at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because multiplying by a negative reverses order. The most negative product so far is the one that becomes the largest after the next negative, as −10 × −2 = 20 does in the trace.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a solution without tracking the minimum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the prefix/suffix scan: multiply from both ends, reset to 1 after a zero, take the best running product. In a zero-free stretch the best subarray is always a prefix or a suffix.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the subarray, not just the product?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Also track where the current <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code> runs started (swap the start indices when you swap the values, and reset a start to i when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> alone wins), and record start and end whenever <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> improves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the numbers were floats between 0 and 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same algorithm works, but multiplying many values below 1 shrinks the product, so a single element can beat any longer run, and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x alone</code> candidate covers that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does overflow matter in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for correctness, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> is arbitrary precision; but huge products make each multiplication slower, so mention it if the inputs are unbounded.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subarray** | A contiguous slice of an array, nothing skipped |
| **State** | What a DP remembers about the part of the input already seen |
| **Max/min product ending here** | The largest and smallest product of a subarray that ends exactly at index i |
| **Sign flip** | Multiplying by a negative reverses order, so the minimum can become the maximum |
| **Zero-free segment** | A run of the array between zeros; the best positive product lives inside one |

---
**Conclusion:** Maximum product subarray is Kadane with two values of state instead of one. Because a negative number flips the smallest product into the largest, you carry both the max and the min product ending at each index, swap them on a negative, let \`x\` alone restart a run after a zero, and keep the best max seen — O(n) time and O(1) space. In Python, the loop is a few lines with a tuple swap and no overflow worries, though huge products get slow. Our run checked it on the edge cases and against the brute force on 300 random arrays, and the prefix/suffix scan gives a second linear answer for the follow-up.`,
        examples: [
          {
            label: `Max product subarray: max/min tracking on edge cases, with a trace`,
            code: `def max_product(nums):
    hi = lo = best = nums[0]      # largest / smallest product ending here
    for x in nums[1:]:
        if x < 0:                 # a negative flips big and small
            hi, lo = lo, hi
        hi = max(x, hi * x)       # extend the run, or start fresh at x
        lo = min(x, lo * x)
        best = max(best, hi)
    return best


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


def trace(nums):
    hi = lo = best = nums[0]
    print("i=0 x=" + str(nums[0]) + " hi=" + str(hi) + " lo=" + str(lo) + " best=" + str(best))
    for i in range(1, len(nums)):
        x = nums[i]
        if x < 0:
            hi, lo = lo, hi
        hi = max(x, hi * x)
        lo = min(x, lo * x)
        best = max(best, hi)
        print("i=" + str(i) + " x=" + str(x) + " hi=" + str(hi) + " lo=" + str(lo) + " best=" + str(best))


for nums in [[2, 3, -2, 4], [-2, 0, -1], [-2], [-2, 3, -4], [0, 2],
             [2, -5, -2, -4, 3], [-1, -2, -3, 0, 4], [-3, -1, -1]]:
    print(fmt(nums) + " -> " + str(max_product(nums)))
print("trace of [2, -5, -2, -4, 3]:")
trace([2, -5, -2, -4, 3])`,
          },
          {
            label: `Brute force vs one pass vs prefix/suffix scan on random arrays`,
            code: `def max_product(nums):
    hi = lo = best = nums[0]      # largest / smallest product ending here
    for x in nums[1:]:
        if x < 0:                 # a negative flips big and small
            hi, lo = lo, hi
        hi = max(x, hi * x)       # extend the run, or start fresh at x
        lo = min(x, lo * x)
        best = max(best, hi)
    return best


def brute(nums):
    global products
    best = nums[0]
    for i in range(len(nums)):
        p = 1
        for j in range(i, len(nums)):
            p *= nums[j]
            products += 1
            best = max(best, p)
    return best


def prefix_suffix(nums):
    n, best, left, right = len(nums), nums[0], 1, 1
    for i in range(n):
        left = (left if left != 0 else 1) * nums[i]          # restart after a zero
        right = (right if right != 0 else 1) * nums[n - 1 - i]
        best = max(best, left, right)
    return best


seed = 12345
def nxt():
    global seed
    seed = seed * 48271 % 2147483647
    return seed


products = 0
agree = 0
for _ in range(300):
    arr = [nxt() % 7 - 3 for _ in range(1 + nxt() % 10)]   # values -3..3
    a, b, c = brute(arr), max_product(arr), prefix_suffix(arr)
    if a == b == c:
        agree += 1
print("random arrays where all three methods agree: " + str(agree) + " of 300")

big = [1 if nxt() % 2 else -1 for _ in range(2000)]
products = 0
r1 = brute(big)
r2 = max_product(big)
print("n=2000: brute force answer " + str(r1) + " after " + str(products) + " products")
print("n=2000: one pass answer " + str(r2) + " after " + str(len(big) - 1) + " steps")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an integer array that can contain negative numbers and zeros, find the contiguous subarray with the largest product and return that product. Walk me through your idea, then code it in JavaScript."

**What a strong answer should cover:**
- Why plain Kadane (keep only the best product ending here) fails: a negative number turns the smallest product into the largest, so you must track both the maximum and the minimum product ending at each index.
- The recurrence: at each \`x\`, the new max is the largest of \`x\`, \`max * x\` and \`min * x\` (and the new min is the smallest of the same three); a zero resets both to 0, and the running best is updated every step.
- O(n) time and O(1) extra space, compared with the O(n²) brute force that tries every start and end.
- The alternative prefix/suffix scan (multiply left to right and right to left, restarting after a zero) and why it works: inside a stretch with no zero, the best product is always a prefix or a suffix of that stretch.
- JavaScript details: every number is a 64-bit float, so products above \`Number.MAX_SAFE_INTEGER\` (2^53 - 1) silently lose precision; \`0 * -3\` is \`-0\`; the destructuring swap \`[hi, lo] = [lo, hi]\`.

**Clarifying questions expected:**
- Can the array contain zeros and negatives, and can it be empty?
- Is the answer guaranteed to fit in a 32-bit (or 64-bit) integer?
- Do you want just the product, or also the start and end indices of the subarray?

**Code / implementation expected:** Yes — a one-pass JavaScript function that keeps the max and min product ending at each index.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, arrays and the idea of a running best value.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a game show where your score is a number and every round you draw a **multiplier card**. A ×3 card triples your score. A ×0 card wipes it out. And the nasty one: a ×(−2) card turns a big positive score into a big **negative** score.

Here is the twist that makes the game interesting. Suppose you are sitting on −40 points, the worst score in the room. Everyone pities you. Then you draw ×(−2) — and suddenly you have **+80**, the best score in the room. The worst position became the best position in a single card.

So a smart player does not only remember "what is the best score I could have right now?". They also remember "what is the **worst** score I could have right now?", because one negative card will flip the two. That is the whole trick of this problem. You may also leave the game and rejoin at any round (start a fresh run), which is what lets you dodge a ×0 card.

The maximum product subarray question is this game on an array: the cards are the numbers, a run of consecutive rounds is a subarray, and you want the largest score any run can reach.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the array contain zeros and negatives? | Zeros and negatives are the whole difficulty; with only positives the answer is the product of everything |
| Can the array be empty? | The usual code starts from \`nums[0]\`; an empty array needs an explicit rule |
| Does the answer fit in 32 bits, or 64? | Products grow very fast, so this decides the number type (see the JavaScript notes below) |
| Do you need the subarray itself, or only the product? | Returning start and end indices means also tracking where each run began |
| Must the subarray be non-empty? | It always is in the standard version, so for \`[-2]\` the answer is −2, not 1 |

## 3. Why the Maximum-Sum Trick Breaks

📌 **Interview term: Subarray** — a contiguous slice of an array: some elements in a row, with nothing skipped. \`[3, -2]\` is a subarray of \`[2, 3, -2, 4]\`; \`[2, -2]\` is not.

If you have seen the [maximum subarray sum](/interview-question/how-do-you-find-the-maximum-subarray-sum) problem, you know Kadane's algorithm: walk the array, keep "the best sum of a subarray that **ends here**", and at each element either extend that run or start fresh. It works because for sums, a bigger running total is always a better starting point for the next element.

For **products** that is false. Look at \`[-2, 3, -4]\`:

- At index 1 the best product ending there is 3 (just \`[3]\`), because −2 × 3 = −6 is worse.
- At index 2 a "best only" algorithm would compute max(−4, 3 × −4) = −4.
- But the real answer is −2 × 3 × −4 = **24**. It came from −6, the **worst** product at index 1, multiplied by a negative.

A negative number turns the smallest product into the largest. So we must carry two numbers, not one.

📌 **Interview term: State** — the small set of values a dynamic programming solution remembers about the part of the input it has already seen. Here the state at each index is two numbers: the largest and the smallest product of a subarray ending at that index.

## 4. The Fix: Track the Largest and the Smallest Product Ending Here

At each element \`x\`, a subarray ending at \`x\` either is \`x\` alone, or extends the best or worst subarray that ended one step earlier. So there are only three candidates:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Three candidates feed the new maximum and the new minimum: x alone, the old maximum times x, and the old minimum times x">
  <defs>
    <marker id="b28q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="200" height="56" rx="10"/>
  <text class="d-text" x="120" y="54" text-anchor="middle">x alone</text>
  <rect class="d-box" x="20" y="102" width="200" height="56" rx="10"/>
  <text class="d-text" x="120" y="136" text-anchor="middle">old max times x</text>
  <rect class="d-box" x="20" y="184" width="200" height="56" rx="10"/>
  <text class="d-text" x="120" y="218" text-anchor="middle">old min times x</text>
  <path class="d-edge" d="M 222 48 L 452 72" marker-end="url(#b28q1-arrow)"/>
  <path class="d-edge" d="M 222 130 L 452 80" marker-end="url(#b28q1-arrow)"/>
  <path class="d-edge" d="M 222 212 L 452 88" marker-end="url(#b28q1-arrow)"/>
  <path class="d-edge-dashed" d="M 222 48 L 452 172"/>
  <path class="d-edge-dashed" d="M 222 130 L 452 180"/>
  <path class="d-edge-dashed" d="M 222 212 L 452 188"/>
  <rect class="d-box-accent" x="456" y="46" width="240" height="64" rx="10"/>
  <text class="d-text" x="576" y="74" text-anchor="middle">new max</text>
  <text class="d-sub" x="576" y="96" text-anchor="middle">largest of the three</text>
  <rect class="d-box-muted" x="456" y="150" width="240" height="64" rx="10"/>
  <text class="d-text" x="576" y="178" text-anchor="middle">new min</text>
  <text class="d-sub" x="576" y="200" text-anchor="middle">smallest of the three</text>
</svg>

Both new values are picked from the same three candidates, computed from the **old** max and min. Taking \`x\` alone is how a run restarts — that is how the algorithm steps past a zero: after a 0 both max and min become 0, and the next element is better off starting fresh.

There is a neat shortcut. When \`x\` is negative, multiplying by it reverses the order of numbers, so the old **min** times \`x\` becomes the big candidate and the old **max** times \`x\` the small one. Swapping max and min **before** multiplying lets you write just two lines: \`max = largest(x, max·x)\` and \`min = smallest(x, min·x)\`.

📌 **Interview term: Max/min product ending here** — the pair of values \`hi[i]\` (largest product of a subarray that ends exactly at index i) and \`lo[i]\` (smallest such product). The answer is the largest \`hi[i]\` over all i.

📌 **Interview term: Sign flip** — multiplying by a negative number reverses order: if a > b then a·x < b·x for x < 0. It is why the minimum must be tracked.

The recurrence, written out:

~~~text
hi[0] = lo[0] = nums[0]
hi[i] = max(nums[i], hi[i-1] * nums[i], lo[i-1] * nums[i])
lo[i] = min(nums[i], hi[i-1] * nums[i], lo[i-1] * nums[i])
answer = max over i of hi[i]
~~~

Each value only depends on the previous index, so the whole table collapses into three variables, \`hi\`, \`lo\` and \`best\`. This is a [dynamic programming](/interview-question/what-is-dynamic-programming) solution with O(1) space, exactly like [Kadane](/interview-question/maximum-subarray-kadane-vs-divide-and-conquer-proof-of-correctness) but with two values of state instead of one.

## 5. Walk-Through on [2, -5, -2, -4, 3]

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="The max and min product ending at each index of 2, -5, -2, -4, 3. Max reaches 20 at index 2 and 24 at index 4">
  <text class="d-sub" x="20" y="60">x</text>
  <text class="d-sub" x="20" y="140">max</text>
  <text class="d-sub" x="20" y="220">min</text>
  <rect class="d-box" x="110" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="150" y="61" text-anchor="middle">2</text>
  <rect class="d-box" x="220" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="260" y="61" text-anchor="middle">-5</text>
  <rect class="d-box" x="330" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="370" y="61" text-anchor="middle">-2</text>
  <rect class="d-box" x="440" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="480" y="61" text-anchor="middle">-4</text>
  <rect class="d-box" x="550" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="590" y="61" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="110" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="150" y="141" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="220" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="260" y="141" text-anchor="middle">-5</text>
  <rect class="d-box-accent" x="330" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="370" y="141" text-anchor="middle">20</text>
  <rect class="d-box-muted" x="440" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="480" y="141" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="550" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="590" y="141" text-anchor="middle">24</text>
  <rect class="d-box-muted" x="110" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="150" y="221" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="220" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="260" y="221" text-anchor="middle">-10</text>
  <rect class="d-box-muted" x="330" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="370" y="221" text-anchor="middle">-2</text>
  <rect class="d-box-muted" x="440" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="480" y="221" text-anchor="middle">-80</text>
  <rect class="d-box-muted" x="550" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="590" y="221" text-anchor="middle">-240</text>
  <path class="d-edge-accent" d="M 300 210 L 336 158"/>
</svg>

Read the table column by column (these numbers are the trace printed by example 1):

| i | x | max ending here | min ending here | best so far | what happened |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 0 | 2 | 2 | 2 | 2 | start |
| 1 | −5 | −5 | −10 | 2 | negative: 2 × −5 = −10 becomes the min; −5 alone is the max |
| 2 | −2 | **20** | −2 | 20 | the old **min** −10 × −2 = 20 — the worst became the best (the accent line) |
| 3 | −4 | 8 | −80 | 20 | negative again: 20 × −4 = −80 is now the min, −2 × −4 = 8 the max |
| 4 | 3 | **24** | −240 | **24** | 8 × 3 = 24, the subarray \`[-2, -4, 3]\` |

Without the \`min\` column, index 2 would have been max(−2, −5 × −2) = 10, and the run would never reach 24 — that subarray needs \`[-2, -4, 3]\` built on 8, which itself came from the min.

## 6. From Brute Force to One Pass in JavaScript

**Brute force.** Try every start index \`i\`, and from it multiply forward one element at a time, keeping the best product seen. That is n(n+1)/2 multiplications — O(n²). It is a perfectly good first thing to say in an interview, and it is the reference that example 2 checks the fast versions against. (For n = 2000 it made 2,001,000 multiplications in our run.)

**One pass.** Keep \`hi\`, \`lo\` and \`best\`, and update them per element as in section 4:

~~~javascript
function maxProduct(nums) {
  let hi = nums[0], lo = nums[0], best = nums[0]; // largest / smallest product ending here
  for (let i = 1; i < nums.length; i++) {
    const x = nums[i];
    if (x < 0) [hi, lo] = [lo, hi];   // a negative flips big and small
    hi = Math.max(x, hi * x);         // extend the run, or start fresh at x
    lo = Math.min(x, lo * x);
    best = Math.max(best, hi);
  }
  return best;
}
~~~

**What to point out in this code:**

- \`[hi, lo] = [lo, hi]\` is a destructuring swap. It builds a tiny two-element array each time; that is fine here, and a temporary variable works equally well.
- The order matters: swap first, then compute \`hi\` and \`lo\` from the swapped values. \`hi = Math.max(x, hi * x)\` reads \`hi\` before writing it, and the \`lo\` line does not read \`hi\`, so no extra temporary is needed.
- Every JavaScript number is an IEEE-754 double. Integers are exact only up to \`Number.MAX_SAFE_INTEGER\` = 9007199254740991 (2^53 − 1). Above that, products are rounded silently: in Node, \`3 ** 34\` printed 16677181699666568 while the exact value (\`3n ** 34n\` as a \`BigInt\`) is 16677181699666569. If products can grow that large, use \`BigInt\`, which has no \`Math.max\`, so you compare with \`>\`.
- \`0 * -3\` is \`-0\` in JavaScript. It compares equal to \`0\` and prints as \`0\` in string concatenation, but \`console.log(-0)\` shows \`-0\` — a confusing sight in a debug print after a zero element.
- An empty array makes \`nums[0]\` \`undefined\` and the function returns \`undefined\` rather than throwing; decide the rule with the interviewer and check \`nums.length === 0\` first.

## 7. Another O(n) Way: the Prefix/Suffix Scan

There is a second linear solution that is easy to remember and makes a good follow-up answer.

Think about a stretch of the array that contains no zero. If it has an **even** number of negatives, its whole product is positive and is the best you can do in that stretch. If it has an **odd** number, you must drop one negative: either everything up to and including the **first** negative, or everything from the **last** negative on. Either way, the best subarray is a **prefix** or a **suffix** of the stretch.

So multiply from the left and from the right at the same time, take the best of all the running products, and restart a running product at 1 whenever it hits a zero:

~~~javascript
function prefixSuffix(nums) {
  const n = nums.length;
  let best = nums[0], left = 1, right = 1;
  for (let i = 0; i < n; i++) {
    left = (left !== 0 ? left : 1) * nums[i];          // restart after a zero
    right = (right !== 0 ? right : 1) * nums[n - 1 - i];
    best = Math.max(best, left, right);
  }
  return best;
}
~~~

📌 **Interview term: Zero-free segment** — a maximal run of the array between zeros. No product subarray that beats 0 can cross a zero, so each segment can be solved on its own.

The two methods do the same O(n) work. The max/min version is the one interviewers usually expect because it is the general DP pattern; the prefix/suffix version is easier to prove correct. Example 2 runs both against the brute force on 300 random arrays.

## 8. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22; the same file runs unchanged in the page). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. Example 2 builds its random arrays with a small deterministic generator (MINSTD, \`seed = seed * 48271 mod 2147483647\`), so every language tests the same arrays.

**Example 1 — the one-pass solution on edge cases, plus the trace from section 5** prints:

~~~text
[2, 3, -2, 4] -> 6
[-2, 0, -1] -> 0
[-2] -> -2
[-2, 3, -4] -> 24
[0, 2] -> 2
[2, -5, -2, -4, 3] -> 24
[-1, -2, -3, 0, 4] -> 6
[-3, -1, -1] -> 3
trace of [2, -5, -2, -4, 3]:
i=0 x=2 hi=2 lo=2 best=2
i=1 x=-5 hi=-5 lo=-10 best=2
i=2 x=-2 hi=20 lo=-2 best=20
i=3 x=-4 hi=8 lo=-80 best=20
i=4 x=3 hi=24 lo=-240 best=24
~~~

What to read from this:

- \`[-2, 3, -4] -> 24\` is the case that breaks a "max only" solution: the 24 comes from the min −6 times −4.
- \`[-2, 0, -1] -> 0\`: every subarray containing a negative alone is negative, so the zero wins. \`[-2] -> -2\`: the subarray may not be empty, so a single negative is the answer.
- \`[-1, -2, -3, 0, 4] -> 6\`: the zero splits the array; on the left the best is −2 × −3 = 6 (dropping the first negative), which beats the 4 on the right.
- The trace is the table in section 5, line for line.

**Example 2 — brute force vs one pass vs prefix/suffix** prints:

~~~text
random arrays where all three methods agree: 300 of 300
n=2000: brute force answer 1 after 2001000 products
n=2000: one pass answer 1 after 1999 steps
~~~

All three methods agree on 300 random arrays of length 1–10 with values from −3 to 3 (lots of zeros and negatives). On 2,000 elements of ±1 the brute force needed 2,001,000 multiplications — that is n(n+1)/2 — while the one-pass version did 1,999 update steps.

## 9. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (every start, extend forward) | O(n²) | O(1) | n(n+1)/2 products; 2,001,000 for n = 2000 in example 2 |
| Max/min one pass | O(n) | O(1) | one constant-time update per element; only \`hi\`, \`lo\`, \`best\` are stored |
| Prefix/suffix scan | O(n) | O(1) | two running products, both updated once per index |

These bounds hold for JavaScript numbers because every multiplication is one floating-point operation; switching to \`BigInt\` for huge products keeps the result exact but makes each multiplication cost grow with the number of digits.

## 10. Edge Cases

- **A single element**, including a single negative: \`[-2]\` returns −2. Initialise \`best\` with \`nums[0]\`, never with 0 or 1.
- **Zeros**: \`[-2, 0, -1]\` returns 0; \`[0, 2]\` returns 2. The \`x alone\` candidate is what restarts a run after a zero.
- **An even number of negatives**: \`[-2, 3, -4]\` uses the whole array.
- **An odd number of negatives**: \`[-3, -1, -1]\` returns 3, dropping one negative from the left end.
- **All negatives with zeros between them**: the answer may be 0 even though no element is positive.
- **Very large products**: decide the number type before coding (see the pitfalls below).

## Common Pitfalls

- **Tracking only the maximum.** It is Kadane for sums, and it returns −4 instead of 24 on \`[-2, 3, -4]\`.
- **Computing the new \`lo\` from the new \`hi\`** in the no-swap version (\`hi = Math.max(x, hi*x, lo*x)\` then \`lo = Math.min(x, hi*x, lo*x)\`). Keep the old values in \`const\`s first, or use the swap form.
- **Trusting large products.** Beyond 2^53 − 1 a \`Number\` is rounded silently; use \`BigInt\` if the inputs allow huge products.
- **Initialising \`best\` with \`0\` or \`-Infinity\` and skipping the first element.** \`best = nums[0]\` handles \`[-2]\` correctly.
- **Being surprised by \`-0\`** in debug output after a zero; it is equal to \`0\` (\`-0 === 0\` is true) and does not change the answer.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The trap:</strong> <span style="color:#f0e2c8;">Plain Kadane fails because a negative number turns the <strong style="color:#ffca28;">smallest</strong> product into the largest: on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-2, 3, -4]</code> the 24 comes from −6 × −4.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The state:</strong> <span style="color:#f0e2c8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code>, the largest and smallest product of a subarray ending here, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The update:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &lt; 0</code>, swap with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[hi, lo] = [lo, hi]</code>; then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = Math.max(x, hi * x)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = Math.min(x, lo * x)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best = Math.max(best, hi)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) space, compared with O(n²) for trying every start; for n = 2000 that was 1,999 steps against 2,001,000 products.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Numbers are doubles: exact only up to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number.MAX_SAFE_INTEGER</code>, so huge products need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need the minimum at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because multiplying by a negative reverses order. The most negative product so far is the one that becomes the largest after the next negative, as −10 × −2 = 20 does in the trace.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a solution without tracking the minimum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the prefix/suffix scan: multiply from both ends, reset to 1 after a zero, take the best running product. In a zero-free stretch the best subarray is always a prefix or a suffix.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the subarray, not just the product?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Also track where the current <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code> runs started (swap the starts when you swap the values, reset a start when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> alone wins), and record start and end whenever <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> improves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with very large products in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They are rounded once they pass 2^53 − 1: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3 ** 34</code> printed 16677181699666568, one less than the exact value. Switch to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> and compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;</code> because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max</code> does not accept <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a debug print show -0?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 * -3</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-0</code> in IEEE-754. It equals <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code> and prints as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> in string concatenation, so it never changes the answer.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subarray** | A contiguous slice of an array, nothing skipped |
| **State** | What a DP remembers about the part of the input already seen |
| **Max/min product ending here** | The largest and smallest product of a subarray that ends exactly at index i |
| **Sign flip** | Multiplying by a negative reverses order, so the minimum can become the maximum |
| **Zero-free segment** | A run of the array between zeros; the best positive product lives inside one |

---
**Conclusion:** Maximum product subarray is Kadane with two values of state instead of one. Because a negative number flips the smallest product into the largest, you carry both the max and the min product ending at each index, swap them on a negative, let \`x\` alone restart a run after a zero, and keep the best max seen — O(n) time and O(1) space. In JavaScript, the loop is a few lines with a destructuring swap, as long as products stay below 2^53. Our run checked it on the edge cases and against the brute force on 300 random arrays, and the prefix/suffix scan gives a second linear answer for the follow-up.`,
        examples: [
          {
            label: `Max product subarray: max/min tracking on edge cases, with a trace`,
            code: `function maxProduct(nums) {
  let hi = nums[0], lo = nums[0], best = nums[0]; // largest / smallest product ending here
  for (let i = 1; i < nums.length; i++) {
    const x = nums[i];
    if (x < 0) [hi, lo] = [lo, hi];   // a negative flips big and small
    hi = Math.max(x, hi * x);         // extend the run, or start fresh at x
    lo = Math.min(x, lo * x);
    best = Math.max(best, hi);
  }
  return best;
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

function trace(nums) {
  let hi = nums[0], lo = nums[0], best = nums[0];
  console.log('i=0 x=' + nums[0] + ' hi=' + hi + ' lo=' + lo + ' best=' + best);
  for (let i = 1; i < nums.length; i++) {
    const x = nums[i];
    if (x < 0) [hi, lo] = [lo, hi];
    hi = Math.max(x, hi * x);
    lo = Math.min(x, lo * x);
    best = Math.max(best, hi);
    console.log('i=' + i + ' x=' + x + ' hi=' + hi + ' lo=' + lo + ' best=' + best);
  }
}

const cases = [[2, 3, -2, 4], [-2, 0, -1], [-2], [-2, 3, -4], [0, 2],
  [2, -5, -2, -4, 3], [-1, -2, -3, 0, 4], [-3, -1, -1]];
for (const nums of cases) console.log(fmt(nums) + ' -> ' + maxProduct(nums));
console.log('trace of [2, -5, -2, -4, 3]:');
trace([2, -5, -2, -4, 3]);`,
          },
          {
            label: `Brute force vs one pass vs prefix/suffix scan on random arrays`,
            code: `function maxProduct(nums) {
  let hi = nums[0], lo = nums[0], best = nums[0]; // largest / smallest product ending here
  for (let i = 1; i < nums.length; i++) {
    const x = nums[i];
    if (x < 0) [hi, lo] = [lo, hi];   // a negative flips big and small
    hi = Math.max(x, hi * x);         // extend the run, or start fresh at x
    lo = Math.min(x, lo * x);
    best = Math.max(best, hi);
  }
  return best;
}

let products = 0;

function brute(nums) {
  let best = nums[0];
  for (let i = 0; i < nums.length; i++) {
    let p = 1;
    for (let j = i; j < nums.length; j++) {
      p *= nums[j];
      products++;
      best = Math.max(best, p);
    }
  }
  return best;
}

function prefixSuffix(nums) {
  const n = nums.length;
  let best = nums[0], left = 1, right = 1;
  for (let i = 0; i < n; i++) {
    left = (left !== 0 ? left : 1) * nums[i];          // restart after a zero
    right = (right !== 0 ? right : 1) * nums[n - 1 - i];
    best = Math.max(best, left, right);
  }
  return best;
}

let seed = 12345;
function next() {
  seed = (seed * 48271) % 2147483647; // stays below 2^53, so exact
  return seed;
}

let agree = 0;
for (let t = 0; t < 300; t++) {
  const len = 1 + next() % 10;
  const arr = [];
  for (let k = 0; k < len; k++) arr.push(next() % 7 - 3); // values -3..3
  const a = brute(arr), b = maxProduct(arr), c = prefixSuffix(arr);
  if (a === b && b === c) agree++;
}
console.log('random arrays where all three methods agree: ' + agree + ' of 300');

const big = [];
for (let k = 0; k < 2000; k++) big.push(next() % 2 ? 1 : -1);
products = 0;
const r1 = brute(big);
const r2 = maxProduct(big);
console.log('n=2000: brute force answer ' + r1 + ' after ' + products + ' products');
console.log('n=2000: one pass answer ' + r2 + ' after ' + (big.length - 1) + ' steps');`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an integer array that can contain negative numbers and zeros, find the contiguous subarray with the largest product and return that product. Walk me through your idea, then code it in Java."

**What a strong answer should cover:**
- Why plain Kadane (keep only the best product ending here) fails: a negative number turns the smallest product into the largest, so you must track both the maximum and the minimum product ending at each index.
- The recurrence: at each \`x\`, the new max is the largest of \`x\`, \`max * x\` and \`min * x\` (and the new min is the smallest of the same three); a zero resets both to 0, and the running best is updated every step.
- O(n) time and O(1) extra space, compared with the O(n²) brute force that tries every start and end.
- The alternative prefix/suffix scan (multiply left to right and right to left, restarting after a zero) and why it works: inside a stretch with no zero, the best product is always a prefix or a suffix of that stretch.
- Java details: \`int\` multiplication wraps around silently on overflow, so keep \`hi\`/\`lo\` in \`long\` (or use \`Math.multiplyExact\` to fail loudly), and there is no tuple swap, so use a temporary.

**Clarifying questions expected:**
- Can the array contain zeros and negatives, and can it be empty?
- Is the answer guaranteed to fit in a 32-bit (or 64-bit) integer?
- Do you want just the product, or also the start and end indices of the subarray?

**Code / implementation expected:** Yes — a one-pass Java function that keeps the max and min product ending at each index.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, arrays and the idea of a running best value.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a game show where your score is a number and every round you draw a **multiplier card**. A ×3 card triples your score. A ×0 card wipes it out. And the nasty one: a ×(−2) card turns a big positive score into a big **negative** score.

Here is the twist that makes the game interesting. Suppose you are sitting on −40 points, the worst score in the room. Everyone pities you. Then you draw ×(−2) — and suddenly you have **+80**, the best score in the room. The worst position became the best position in a single card.

So a smart player does not only remember "what is the best score I could have right now?". They also remember "what is the **worst** score I could have right now?", because one negative card will flip the two. That is the whole trick of this problem. You may also leave the game and rejoin at any round (start a fresh run), which is what lets you dodge a ×0 card.

The maximum product subarray question is this game on an array: the cards are the numbers, a run of consecutive rounds is a subarray, and you want the largest score any run can reach.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the array contain zeros and negatives? | Zeros and negatives are the whole difficulty; with only positives the answer is the product of everything |
| Can the array be empty? | The usual code starts from \`nums[0]\`; an empty array needs an explicit rule |
| Does the answer fit in 32 bits, or 64? | Products grow very fast, so this decides the number type (see the Java notes below) |
| Do you need the subarray itself, or only the product? | Returning start and end indices means also tracking where each run began |
| Must the subarray be non-empty? | It always is in the standard version, so for \`[-2]\` the answer is −2, not 1 |

## 3. Why the Maximum-Sum Trick Breaks

📌 **Interview term: Subarray** — a contiguous slice of an array: some elements in a row, with nothing skipped. \`[3, -2]\` is a subarray of \`[2, 3, -2, 4]\`; \`[2, -2]\` is not.

If you have seen the [maximum subarray sum](/interview-question/how-do-you-find-the-maximum-subarray-sum) problem, you know Kadane's algorithm: walk the array, keep "the best sum of a subarray that **ends here**", and at each element either extend that run or start fresh. It works because for sums, a bigger running total is always a better starting point for the next element.

For **products** that is false. Look at \`[-2, 3, -4]\`:

- At index 1 the best product ending there is 3 (just \`[3]\`), because −2 × 3 = −6 is worse.
- At index 2 a "best only" algorithm would compute max(−4, 3 × −4) = −4.
- But the real answer is −2 × 3 × −4 = **24**. It came from −6, the **worst** product at index 1, multiplied by a negative.

A negative number turns the smallest product into the largest. So we must carry two numbers, not one.

📌 **Interview term: State** — the small set of values a dynamic programming solution remembers about the part of the input it has already seen. Here the state at each index is two numbers: the largest and the smallest product of a subarray ending at that index.

## 4. The Fix: Track the Largest and the Smallest Product Ending Here

At each element \`x\`, a subarray ending at \`x\` either is \`x\` alone, or extends the best or worst subarray that ended one step earlier. So there are only three candidates:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Three candidates feed the new maximum and the new minimum: x alone, the old maximum times x, and the old minimum times x">
  <defs>
    <marker id="b28q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="200" height="56" rx="10"/>
  <text class="d-text" x="120" y="54" text-anchor="middle">x alone</text>
  <rect class="d-box" x="20" y="102" width="200" height="56" rx="10"/>
  <text class="d-text" x="120" y="136" text-anchor="middle">old max times x</text>
  <rect class="d-box" x="20" y="184" width="200" height="56" rx="10"/>
  <text class="d-text" x="120" y="218" text-anchor="middle">old min times x</text>
  <path class="d-edge" d="M 222 48 L 452 72" marker-end="url(#b28q1-arrow)"/>
  <path class="d-edge" d="M 222 130 L 452 80" marker-end="url(#b28q1-arrow)"/>
  <path class="d-edge" d="M 222 212 L 452 88" marker-end="url(#b28q1-arrow)"/>
  <path class="d-edge-dashed" d="M 222 48 L 452 172"/>
  <path class="d-edge-dashed" d="M 222 130 L 452 180"/>
  <path class="d-edge-dashed" d="M 222 212 L 452 188"/>
  <rect class="d-box-accent" x="456" y="46" width="240" height="64" rx="10"/>
  <text class="d-text" x="576" y="74" text-anchor="middle">new max</text>
  <text class="d-sub" x="576" y="96" text-anchor="middle">largest of the three</text>
  <rect class="d-box-muted" x="456" y="150" width="240" height="64" rx="10"/>
  <text class="d-text" x="576" y="178" text-anchor="middle">new min</text>
  <text class="d-sub" x="576" y="200" text-anchor="middle">smallest of the three</text>
</svg>

Both new values are picked from the same three candidates, computed from the **old** max and min. Taking \`x\` alone is how a run restarts — that is how the algorithm steps past a zero: after a 0 both max and min become 0, and the next element is better off starting fresh.

There is a neat shortcut. When \`x\` is negative, multiplying by it reverses the order of numbers, so the old **min** times \`x\` becomes the big candidate and the old **max** times \`x\` the small one. Swapping max and min **before** multiplying lets you write just two lines: \`max = largest(x, max·x)\` and \`min = smallest(x, min·x)\`.

📌 **Interview term: Max/min product ending here** — the pair of values \`hi[i]\` (largest product of a subarray that ends exactly at index i) and \`lo[i]\` (smallest such product). The answer is the largest \`hi[i]\` over all i.

📌 **Interview term: Sign flip** — multiplying by a negative number reverses order: if a > b then a·x < b·x for x < 0. It is why the minimum must be tracked.

The recurrence, written out:

~~~text
hi[0] = lo[0] = nums[0]
hi[i] = max(nums[i], hi[i-1] * nums[i], lo[i-1] * nums[i])
lo[i] = min(nums[i], hi[i-1] * nums[i], lo[i-1] * nums[i])
answer = max over i of hi[i]
~~~

Each value only depends on the previous index, so the whole table collapses into three variables, \`hi\`, \`lo\` and \`best\`. This is a [dynamic programming](/interview-question/what-is-dynamic-programming) solution with O(1) space, exactly like [Kadane](/interview-question/maximum-subarray-kadane-vs-divide-and-conquer-proof-of-correctness) but with two values of state instead of one.

## 5. Walk-Through on [2, -5, -2, -4, 3]

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="The max and min product ending at each index of 2, -5, -2, -4, 3. Max reaches 20 at index 2 and 24 at index 4">
  <text class="d-sub" x="20" y="60">x</text>
  <text class="d-sub" x="20" y="140">max</text>
  <text class="d-sub" x="20" y="220">min</text>
  <rect class="d-box" x="110" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="150" y="61" text-anchor="middle">2</text>
  <rect class="d-box" x="220" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="260" y="61" text-anchor="middle">-5</text>
  <rect class="d-box" x="330" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="370" y="61" text-anchor="middle">-2</text>
  <rect class="d-box" x="440" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="480" y="61" text-anchor="middle">-4</text>
  <rect class="d-box" x="550" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="590" y="61" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="110" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="150" y="141" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="220" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="260" y="141" text-anchor="middle">-5</text>
  <rect class="d-box-accent" x="330" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="370" y="141" text-anchor="middle">20</text>
  <rect class="d-box-muted" x="440" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="480" y="141" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="550" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="590" y="141" text-anchor="middle">24</text>
  <rect class="d-box-muted" x="110" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="150" y="221" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="220" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="260" y="221" text-anchor="middle">-10</text>
  <rect class="d-box-muted" x="330" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="370" y="221" text-anchor="middle">-2</text>
  <rect class="d-box-muted" x="440" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="480" y="221" text-anchor="middle">-80</text>
  <rect class="d-box-muted" x="550" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="590" y="221" text-anchor="middle">-240</text>
  <path class="d-edge-accent" d="M 300 210 L 336 158"/>
</svg>

Read the table column by column (these numbers are the trace printed by example 1):

| i | x | max ending here | min ending here | best so far | what happened |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 0 | 2 | 2 | 2 | 2 | start |
| 1 | −5 | −5 | −10 | 2 | negative: 2 × −5 = −10 becomes the min; −5 alone is the max |
| 2 | −2 | **20** | −2 | 20 | the old **min** −10 × −2 = 20 — the worst became the best (the accent line) |
| 3 | −4 | 8 | −80 | 20 | negative again: 20 × −4 = −80 is now the min, −2 × −4 = 8 the max |
| 4 | 3 | **24** | −240 | **24** | 8 × 3 = 24, the subarray \`[-2, -4, 3]\` |

Without the \`min\` column, index 2 would have been max(−2, −5 × −2) = 10, and the run would never reach 24 — that subarray needs \`[-2, -4, 3]\` built on 8, which itself came from the min.

## 6. From Brute Force to One Pass in Java

**Brute force.** Try every start index \`i\`, and from it multiply forward one element at a time, keeping the best product seen. That is n(n+1)/2 multiplications — O(n²). It is a perfectly good first thing to say in an interview, and it is the reference that example 2 checks the fast versions against. (For n = 2000 it made 2,001,000 multiplications in our run.)

**One pass.** Keep \`hi\`, \`lo\` and \`best\`, and update them per element as in section 4:

~~~java
static long maxProduct(int[] nums) {
    long hi = nums[0], lo = nums[0], best = nums[0]; // largest / smallest product ending here
    for (int i = 1; i < nums.length; i++) {
        long x = nums[i];
        if (x < 0) { long t = hi; hi = lo; lo = t; }   // a negative flips big and small
        hi = Math.max(x, hi * x);                      // extend the run, or start fresh at x
        lo = Math.min(x, lo * x);
        best = Math.max(best, hi);
    }
    return best;
}
~~~

**What to point out in this code:**

- Java has no tuple swap, so the swap uses a temporary \`t\`. The order matters: swap first, then compute \`hi\` and \`lo\` from the swapped values.
- The state is kept in \`long\`, not \`int\`. Java \`int\` arithmetic **wraps around silently** on overflow: in our run \`100000 * 100000\` printed 1410065408. A \`long\` holds 64 bits, which covers every product that fits the usual "answer fits in 32 bits" promise. If you must stay in \`int\`, \`Math.multiplyExact(a, b)\` throws \`ArithmeticException: integer overflow\` instead of returning garbage.
- \`long x = nums[i];\` widens before multiplying. Writing \`hi * nums[i]\` would also work here because \`hi\` is already a \`long\`, but \`nums[i] * nums[j]\` with two \`int\`s would overflow before any widening happens.
- \`Math.max(long, long)\` is a plain static method; with \`int\` arrays and \`long\` state, Java widens the \`int\` argument for you.
- For an empty array \`nums[0]\` throws \`ArrayIndexOutOfBoundsException\`; check \`nums.length == 0\` first if the interviewer allows empty input.

## 7. Another O(n) Way: the Prefix/Suffix Scan

There is a second linear solution that is easy to remember and makes a good follow-up answer.

Think about a stretch of the array that contains no zero. If it has an **even** number of negatives, its whole product is positive and is the best you can do in that stretch. If it has an **odd** number, you must drop one negative: either everything up to and including the **first** negative, or everything from the **last** negative on. Either way, the best subarray is a **prefix** or a **suffix** of the stretch.

So multiply from the left and from the right at the same time, take the best of all the running products, and restart a running product at 1 whenever it hits a zero:

~~~java
static long prefixSuffix(int[] nums) {
    int n = nums.length;
    long best = nums[0], left = 1, right = 1;
    for (int i = 0; i < n; i++) {
        left = (left != 0 ? left : 1) * nums[i];          // restart after a zero
        right = (right != 0 ? right : 1) * nums[n - 1 - i];
        best = Math.max(best, Math.max(left, right));
    }
    return best;
}
~~~

📌 **Interview term: Zero-free segment** — a maximal run of the array between zeros. No product subarray that beats 0 can cross a zero, so each segment can be solved on its own.

The two methods do the same O(n) work. The max/min version is the one interviewers usually expect because it is the general DP pattern; the prefix/suffix version is easier to prove correct. Example 2 runs both against the brute force on 300 random arrays.

## 8. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (JDK 21, compiled as Java 17+ source). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. Example 2 builds its random arrays with a small deterministic generator (MINSTD, \`seed = seed * 48271 mod 2147483647\`), so every language tests the same arrays.

**Example 1 — the one-pass solution on edge cases, plus the trace from section 5** prints:

~~~text
[2, 3, -2, 4] -> 6
[-2, 0, -1] -> 0
[-2] -> -2
[-2, 3, -4] -> 24
[0, 2] -> 2
[2, -5, -2, -4, 3] -> 24
[-1, -2, -3, 0, 4] -> 6
[-3, -1, -1] -> 3
trace of [2, -5, -2, -4, 3]:
i=0 x=2 hi=2 lo=2 best=2
i=1 x=-5 hi=-5 lo=-10 best=2
i=2 x=-2 hi=20 lo=-2 best=20
i=3 x=-4 hi=8 lo=-80 best=20
i=4 x=3 hi=24 lo=-240 best=24
~~~

What to read from this:

- \`[-2, 3, -4] -> 24\` is the case that breaks a "max only" solution: the 24 comes from the min −6 times −4.
- \`[-2, 0, -1] -> 0\`: every subarray containing a negative alone is negative, so the zero wins. \`[-2] -> -2\`: the subarray may not be empty, so a single negative is the answer.
- \`[-1, -2, -3, 0, 4] -> 6\`: the zero splits the array; on the left the best is −2 × −3 = 6 (dropping the first negative), which beats the 4 on the right.
- The trace is the table in section 5, line for line.

**Example 2 — brute force vs one pass vs prefix/suffix** prints:

~~~text
random arrays where all three methods agree: 300 of 300
n=2000: brute force answer 1 after 2001000 products
n=2000: one pass answer 1 after 1999 steps
~~~

All three methods agree on 300 random arrays of length 1–10 with values from −3 to 3 (lots of zeros and negatives). On 2,000 elements of ±1 the brute force needed 2,001,000 multiplications — that is n(n+1)/2 — while the one-pass version did 1,999 update steps.

## 9. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (every start, extend forward) | O(n²) | O(1) | n(n+1)/2 products; 2,001,000 for n = 2000 in example 2 |
| Max/min one pass | O(n) | O(1) | one constant-time update per element; only \`hi\`, \`lo\`, \`best\` are stored |
| Prefix/suffix scan | O(n) | O(1) | two running products, both updated once per index |

Using \`long\` instead of \`int\` costs nothing in time on a 64-bit JVM and only two extra words of memory.

## 10. Edge Cases

- **A single element**, including a single negative: \`[-2]\` returns −2. Initialise \`best\` with \`nums[0]\`, never with 0 or 1.
- **Zeros**: \`[-2, 0, -1]\` returns 0; \`[0, 2]\` returns 2. The \`x alone\` candidate is what restarts a run after a zero.
- **An even number of negatives**: \`[-2, 3, -4]\` uses the whole array.
- **An odd number of negatives**: \`[-3, -1, -1]\` returns 3, dropping one negative from the left end.
- **All negatives with zeros between them**: the answer may be 0 even though no element is positive.
- **Very large products**: decide the number type before coding (see the pitfalls below).

## Common Pitfalls

- **Tracking only the maximum.** It is Kadane for sums, and it returns −4 instead of 24 on \`[-2, 3, -4]\`.
- **Keeping the state in \`int\`.** Overflow wraps silently (\`100000 * 100000\` gave 1410065408), so a wrong answer appears with no error. Use \`long\`, or \`Math.multiplyExact\` to throw.
- **Computing the new \`lo\` from the new \`hi\`** in the no-swap version. Copy the old values into locals first, or swap.
- **Initialising \`best\` with \`0\` or \`Integer.MIN_VALUE\` and skipping index 0.** \`best = nums[0]\` is simplest and handles a single negative.
- **Returning \`long\` when the interface says \`int\`.** Cast with \`(int) best\` only after confirming the promise that the answer fits.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The trap:</strong> <span style="color:#f0e2c8;">Plain Kadane fails because a negative number turns the <strong style="color:#ffca28;">smallest</strong> product into the largest: on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-2, 3, -4]</code> the 24 comes from −6 × −4.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The state:</strong> <span style="color:#f0e2c8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code>, the largest and smallest product of a subarray ending here, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code>, all as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The update:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &lt; 0</code>, swap through a temporary; then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = Math.max(x, hi * x)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = Math.min(x, lo * x)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best = Math.max(best, hi)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) space, compared with O(n²) for trying every start; for n = 2000 that was 1,999 steps against 2,001,000 products.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> overflow wraps silently, so use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> state, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.multiplyExact</code> to throw on overflow.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need the minimum at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because multiplying by a negative reverses order. The most negative product so far is the one that becomes the largest after the next negative, as −10 × −2 = 20 does in the trace.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a solution without tracking the minimum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the prefix/suffix scan: multiply from both ends, reset to 1 after a zero, take the best running product. In a zero-free stretch the best subarray is always a prefix or a suffix.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the subarray, not just the product?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Also track where the current <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code> runs started (swap the starts when you swap the values, reset a start when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> alone wins), and record start and end whenever <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> improves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does int overflow look like here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing fails: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">100000 * 100000</code> evaluates to 1410065408. That is why the state is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.multiplyExact</code> turns the same overflow into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArithmeticException</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if products could exceed 64 bits?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">java.math.BigInteger</code> and its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">multiply</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">compareTo</code>; each operation then costs time proportional to the number of digits.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subarray** | A contiguous slice of an array, nothing skipped |
| **State** | What a DP remembers about the part of the input already seen |
| **Max/min product ending here** | The largest and smallest product of a subarray that ends exactly at index i |
| **Sign flip** | Multiplying by a negative reverses order, so the minimum can become the maximum |
| **Zero-free segment** | A run of the array between zeros; the best positive product lives inside one |

---
**Conclusion:** Maximum product subarray is Kadane with two values of state instead of one. Because a negative number flips the smallest product into the largest, you carry both the max and the min product ending at each index, swap them on a negative, let \`x\` alone restart a run after a zero, and keep the best max seen — O(n) time and O(1) space. In Java, the loop is a few lines with a temporary swap and \`long\` state so overflow cannot wrap silently. Our run checked it on the edge cases and against the brute force on 300 random arrays, and the prefix/suffix scan gives a second linear answer for the follow-up.`,
        examples: [
          {
            label: `Max product subarray: max/min tracking on edge cases, with a trace`,
            code: `import java.util.*;

public class Main {
    static long maxProduct(int[] nums) {
        long hi = nums[0], lo = nums[0], best = nums[0]; // largest / smallest product ending here
        for (int i = 1; i < nums.length; i++) {
            long x = nums[i];
            if (x < 0) { long t = hi; hi = lo; lo = t; }   // a negative flips big and small
            hi = Math.max(x, hi * x);                      // extend the run, or start fresh at x
            lo = Math.min(x, lo * x);
            best = Math.max(best, hi);
        }
        return best;
    }

    static String fmt(int[] xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < xs.length; i++) sb.append(i > 0 ? ", " : "").append(xs[i]);
        return sb.append("]").toString();
    }

    static void trace(int[] nums) {
        long hi = nums[0], lo = nums[0], best = nums[0];
        System.out.println("i=0 x=" + nums[0] + " hi=" + hi + " lo=" + lo + " best=" + best);
        for (int i = 1; i < nums.length; i++) {
            long x = nums[i];
            if (x < 0) { long t = hi; hi = lo; lo = t; }
            hi = Math.max(x, hi * x);
            lo = Math.min(x, lo * x);
            best = Math.max(best, hi);
            System.out.println("i=" + i + " x=" + x + " hi=" + hi + " lo=" + lo + " best=" + best);
        }
    }

    public static void main(String[] args) {
        int[][] cases = {{2, 3, -2, 4}, {-2, 0, -1}, {-2}, {-2, 3, -4}, {0, 2},
            {2, -5, -2, -4, 3}, {-1, -2, -3, 0, 4}, {-3, -1, -1}};
        for (int[] nums : cases) System.out.println(fmt(nums) + " -> " + maxProduct(nums));
        System.out.println("trace of [2, -5, -2, -4, 3]:");
        trace(new int[]{2, -5, -2, -4, 3});
    }
}`,
          },
          {
            label: `Brute force vs one pass vs prefix/suffix scan on random arrays`,
            code: `public class Main {
    static long maxProduct(int[] nums) {
        long hi = nums[0], lo = nums[0], best = nums[0]; // largest / smallest product ending here
        for (int i = 1; i < nums.length; i++) {
            long x = nums[i];
            if (x < 0) { long t = hi; hi = lo; lo = t; }   // a negative flips big and small
            hi = Math.max(x, hi * x);                      // extend the run, or start fresh at x
            lo = Math.min(x, lo * x);
            best = Math.max(best, hi);
        }
        return best;
    }

    static long products = 0;
    static long seed = 12345;

    static long next() {
        seed = seed * 48271 % 2147483647L;
        return seed;
    }

    static long brute(int[] nums) {
        long best = nums[0];
        for (int i = 0; i < nums.length; i++) {
            long p = 1;
            for (int j = i; j < nums.length; j++) {
                p *= nums[j];
                products++;
                best = Math.max(best, p);
            }
        }
        return best;
    }

    static long prefixSuffix(int[] nums) {
        int n = nums.length;
        long best = nums[0], left = 1, right = 1;
        for (int i = 0; i < n; i++) {
            left = (left != 0 ? left : 1) * nums[i];          // restart after a zero
            right = (right != 0 ? right : 1) * nums[n - 1 - i];
            best = Math.max(best, Math.max(left, right));
        }
        return best;
    }

    public static void main(String[] args) {
        int agree = 0;
        for (int t = 0; t < 300; t++) {
            int len = (int) (1 + next() % 10);
            int[] arr = new int[len];
            for (int k = 0; k < len; k++) arr[k] = (int) (next() % 7 - 3); // values -3..3
            long a = brute(arr), b = maxProduct(arr), c = prefixSuffix(arr);
            if (a == b && b == c) agree++;
        }
        System.out.println("random arrays where all three methods agree: " + agree + " of 300");

        int[] big = new int[2000];
        for (int k = 0; k < 2000; k++) big[k] = next() % 2 == 1 ? 1 : -1;
        products = 0;
        long r1 = brute(big);
        long r2 = maxProduct(big);
        System.out.println("n=2000: brute force answer " + r1 + " after " + products + " products");
        System.out.println("n=2000: one pass answer " + r2 + " after " + (big.length - 1) + " steps");
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given an integer array that can contain negative numbers and zeros, find the contiguous subarray with the largest product and return that product. Walk me through your idea, then code it in C++."

**What a strong answer should cover:**
- Why plain Kadane (keep only the best product ending here) fails: a negative number turns the smallest product into the largest, so you must track both the maximum and the minimum product ending at each index.
- The recurrence: at each \`x\`, the new max is the largest of \`x\`, \`max * x\` and \`min * x\` (and the new min is the smallest of the same three); a zero resets both to 0, and the running best is updated every step.
- O(n) time and O(1) extra space, compared with the O(n²) brute force that tries every start and end.
- The alternative prefix/suffix scan (multiply left to right and right to left, restarting after a zero) and why it works: inside a stretch with no zero, the best product is always a prefix or a suffix of that stretch.
- C++ details: signed overflow is undefined behaviour, so keep \`hi\`/\`lo\` in \`long long\`; \`std::swap(hi, lo)\`; and \`std::max\` needs both arguments of the same type.

**Clarifying questions expected:**
- Can the array contain zeros and negatives, and can it be empty?
- Is the answer guaranteed to fit in a 32-bit (or 64-bit) integer?
- Do you want just the product, or also the start and end indices of the subarray?

**Code / implementation expected:** Yes — a one-pass C++ function that keeps the max and min product ending at each index.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, arrays and the idea of a running best value.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a game show where your score is a number and every round you draw a **multiplier card**. A ×3 card triples your score. A ×0 card wipes it out. And the nasty one: a ×(−2) card turns a big positive score into a big **negative** score.

Here is the twist that makes the game interesting. Suppose you are sitting on −40 points, the worst score in the room. Everyone pities you. Then you draw ×(−2) — and suddenly you have **+80**, the best score in the room. The worst position became the best position in a single card.

So a smart player does not only remember "what is the best score I could have right now?". They also remember "what is the **worst** score I could have right now?", because one negative card will flip the two. That is the whole trick of this problem. You may also leave the game and rejoin at any round (start a fresh run), which is what lets you dodge a ×0 card.

The maximum product subarray question is this game on an array: the cards are the numbers, a run of consecutive rounds is a subarray, and you want the largest score any run can reach.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the array contain zeros and negatives? | Zeros and negatives are the whole difficulty; with only positives the answer is the product of everything |
| Can the array be empty? | The usual code starts from \`nums[0]\`; an empty array needs an explicit rule |
| Does the answer fit in 32 bits, or 64? | Products grow very fast, so this decides the number type (see the C++ notes below) |
| Do you need the subarray itself, or only the product? | Returning start and end indices means also tracking where each run began |
| Must the subarray be non-empty? | It always is in the standard version, so for \`[-2]\` the answer is −2, not 1 |

## 3. Why the Maximum-Sum Trick Breaks

📌 **Interview term: Subarray** — a contiguous slice of an array: some elements in a row, with nothing skipped. \`[3, -2]\` is a subarray of \`[2, 3, -2, 4]\`; \`[2, -2]\` is not.

If you have seen the [maximum subarray sum](/interview-question/how-do-you-find-the-maximum-subarray-sum) problem, you know Kadane's algorithm: walk the array, keep "the best sum of a subarray that **ends here**", and at each element either extend that run or start fresh. It works because for sums, a bigger running total is always a better starting point for the next element.

For **products** that is false. Look at \`[-2, 3, -4]\`:

- At index 1 the best product ending there is 3 (just \`[3]\`), because −2 × 3 = −6 is worse.
- At index 2 a "best only" algorithm would compute max(−4, 3 × −4) = −4.
- But the real answer is −2 × 3 × −4 = **24**. It came from −6, the **worst** product at index 1, multiplied by a negative.

A negative number turns the smallest product into the largest. So we must carry two numbers, not one.

📌 **Interview term: State** — the small set of values a dynamic programming solution remembers about the part of the input it has already seen. Here the state at each index is two numbers: the largest and the smallest product of a subarray ending at that index.

## 4. The Fix: Track the Largest and the Smallest Product Ending Here

At each element \`x\`, a subarray ending at \`x\` either is \`x\` alone, or extends the best or worst subarray that ended one step earlier. So there are only three candidates:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Three candidates feed the new maximum and the new minimum: x alone, the old maximum times x, and the old minimum times x">
  <defs>
    <marker id="b28q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="200" height="56" rx="10"/>
  <text class="d-text" x="120" y="54" text-anchor="middle">x alone</text>
  <rect class="d-box" x="20" y="102" width="200" height="56" rx="10"/>
  <text class="d-text" x="120" y="136" text-anchor="middle">old max times x</text>
  <rect class="d-box" x="20" y="184" width="200" height="56" rx="10"/>
  <text class="d-text" x="120" y="218" text-anchor="middle">old min times x</text>
  <path class="d-edge" d="M 222 48 L 452 72" marker-end="url(#b28q1-arrow)"/>
  <path class="d-edge" d="M 222 130 L 452 80" marker-end="url(#b28q1-arrow)"/>
  <path class="d-edge" d="M 222 212 L 452 88" marker-end="url(#b28q1-arrow)"/>
  <path class="d-edge-dashed" d="M 222 48 L 452 172"/>
  <path class="d-edge-dashed" d="M 222 130 L 452 180"/>
  <path class="d-edge-dashed" d="M 222 212 L 452 188"/>
  <rect class="d-box-accent" x="456" y="46" width="240" height="64" rx="10"/>
  <text class="d-text" x="576" y="74" text-anchor="middle">new max</text>
  <text class="d-sub" x="576" y="96" text-anchor="middle">largest of the three</text>
  <rect class="d-box-muted" x="456" y="150" width="240" height="64" rx="10"/>
  <text class="d-text" x="576" y="178" text-anchor="middle">new min</text>
  <text class="d-sub" x="576" y="200" text-anchor="middle">smallest of the three</text>
</svg>

Both new values are picked from the same three candidates, computed from the **old** max and min. Taking \`x\` alone is how a run restarts — that is how the algorithm steps past a zero: after a 0 both max and min become 0, and the next element is better off starting fresh.

There is a neat shortcut. When \`x\` is negative, multiplying by it reverses the order of numbers, so the old **min** times \`x\` becomes the big candidate and the old **max** times \`x\` the small one. Swapping max and min **before** multiplying lets you write just two lines: \`max = largest(x, max·x)\` and \`min = smallest(x, min·x)\`.

📌 **Interview term: Max/min product ending here** — the pair of values \`hi[i]\` (largest product of a subarray that ends exactly at index i) and \`lo[i]\` (smallest such product). The answer is the largest \`hi[i]\` over all i.

📌 **Interview term: Sign flip** — multiplying by a negative number reverses order: if a > b then a·x < b·x for x < 0. It is why the minimum must be tracked.

The recurrence, written out:

~~~text
hi[0] = lo[0] = nums[0]
hi[i] = max(nums[i], hi[i-1] * nums[i], lo[i-1] * nums[i])
lo[i] = min(nums[i], hi[i-1] * nums[i], lo[i-1] * nums[i])
answer = max over i of hi[i]
~~~

Each value only depends on the previous index, so the whole table collapses into three variables, \`hi\`, \`lo\` and \`best\`. This is a [dynamic programming](/interview-question/what-is-dynamic-programming) solution with O(1) space, exactly like [Kadane](/interview-question/maximum-subarray-kadane-vs-divide-and-conquer-proof-of-correctness) but with two values of state instead of one.

## 5. Walk-Through on [2, -5, -2, -4, 3]

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="The max and min product ending at each index of 2, -5, -2, -4, 3. Max reaches 20 at index 2 and 24 at index 4">
  <text class="d-sub" x="20" y="60">x</text>
  <text class="d-sub" x="20" y="140">max</text>
  <text class="d-sub" x="20" y="220">min</text>
  <rect class="d-box" x="110" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="150" y="61" text-anchor="middle">2</text>
  <rect class="d-box" x="220" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="260" y="61" text-anchor="middle">-5</text>
  <rect class="d-box" x="330" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="370" y="61" text-anchor="middle">-2</text>
  <rect class="d-box" x="440" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="480" y="61" text-anchor="middle">-4</text>
  <rect class="d-box" x="550" y="30" width="80" height="50" rx="8"/>
  <text class="d-text" x="590" y="61" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="110" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="150" y="141" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="220" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="260" y="141" text-anchor="middle">-5</text>
  <rect class="d-box-accent" x="330" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="370" y="141" text-anchor="middle">20</text>
  <rect class="d-box-muted" x="440" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="480" y="141" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="550" y="110" width="80" height="50" rx="8"/>
  <text class="d-text" x="590" y="141" text-anchor="middle">24</text>
  <rect class="d-box-muted" x="110" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="150" y="221" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="220" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="260" y="221" text-anchor="middle">-10</text>
  <rect class="d-box-muted" x="330" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="370" y="221" text-anchor="middle">-2</text>
  <rect class="d-box-muted" x="440" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="480" y="221" text-anchor="middle">-80</text>
  <rect class="d-box-muted" x="550" y="190" width="80" height="50" rx="8"/>
  <text class="d-text" x="590" y="221" text-anchor="middle">-240</text>
  <path class="d-edge-accent" d="M 300 210 L 336 158"/>
</svg>

Read the table column by column (these numbers are the trace printed by example 1):

| i | x | max ending here | min ending here | best so far | what happened |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 0 | 2 | 2 | 2 | 2 | start |
| 1 | −5 | −5 | −10 | 2 | negative: 2 × −5 = −10 becomes the min; −5 alone is the max |
| 2 | −2 | **20** | −2 | 20 | the old **min** −10 × −2 = 20 — the worst became the best (the accent line) |
| 3 | −4 | 8 | −80 | 20 | negative again: 20 × −4 = −80 is now the min, −2 × −4 = 8 the max |
| 4 | 3 | **24** | −240 | **24** | 8 × 3 = 24, the subarray \`[-2, -4, 3]\` |

Without the \`min\` column, index 2 would have been max(−2, −5 × −2) = 10, and the run would never reach 24 — that subarray needs \`[-2, -4, 3]\` built on 8, which itself came from the min.

## 6. From Brute Force to One Pass in C++

**Brute force.** Try every start index \`i\`, and from it multiply forward one element at a time, keeping the best product seen. That is n(n+1)/2 multiplications — O(n²). It is a perfectly good first thing to say in an interview, and it is the reference that example 2 checks the fast versions against. (For n = 2000 it made 2,001,000 multiplications in our run.)

**One pass.** Keep \`hi\`, \`lo\` and \`best\`, and update them per element as in section 4:

~~~cpp
long long maxProduct(const std::vector<int>& nums) {
    long long hi = nums[0], lo = nums[0], best = nums[0]; // largest / smallest product ending here
    for (size_t i = 1; i < nums.size(); i++) {
        long long x = nums[i];
        if (x < 0) std::swap(hi, lo);          // a negative flips big and small
        hi = std::max(x, hi * x);              // extend the run, or start fresh at x
        lo = std::min(x, lo * x);
        best = std::max(best, hi);
    }
    return best;
}
~~~

**What to point out in this code:**

- \`std::swap(hi, lo)\` from \`<utility>\` (also pulled in by \`<algorithm>\`) swaps the two values. The order matters: swap first, then compute \`hi\` and \`lo\` from the swapped values.
- The state is \`long long\`. In C++, **signed integer overflow is undefined behaviour** — the compiler may assume it never happens, so an overflowing \`int\` product is not even guaranteed to wrap. Widening to 64 bits avoids it for any input whose answer fits in 32 bits.
- \`std::max\` is a template that needs **both arguments of the same type**. \`std::max(x, hi * x)\` compiles because both are \`long long\`; mixing them, as in \`std::max(intValue, longLongValue)\`, fails with "no matching function for call to max(int&, long long int&)" (we compiled it to check). That is why \`x\` is copied into a \`long long\` first.
- \`best = std::max({best, left, right})\` in the prefix/suffix version uses the \`std::initializer_list\` overload to take the max of three values.
- The vector is taken by \`const std::vector<int>&\` so it is not copied. For an empty vector \`nums[0]\` is undefined behaviour (no exception), so check \`nums.empty()\` first if empty input is allowed.

## 7. Another O(n) Way: the Prefix/Suffix Scan

There is a second linear solution that is easy to remember and makes a good follow-up answer.

Think about a stretch of the array that contains no zero. If it has an **even** number of negatives, its whole product is positive and is the best you can do in that stretch. If it has an **odd** number, you must drop one negative: either everything up to and including the **first** negative, or everything from the **last** negative on. Either way, the best subarray is a **prefix** or a **suffix** of the stretch.

So multiply from the left and from the right at the same time, take the best of all the running products, and restart a running product at 1 whenever it hits a zero:

~~~cpp
long long prefixSuffix(const std::vector<int>& nums) {
    size_t n = nums.size();
    long long best = nums[0], left = 1, right = 1;
    for (size_t i = 0; i < n; i++) {
        left = (left != 0 ? left : 1) * nums[i];          // restart after a zero
        right = (right != 0 ? right : 1) * nums[n - 1 - i];
        best = std::max({best, left, right});
    }
    return best;
}
~~~

📌 **Interview term: Zero-free segment** — a maximal run of the array between zeros. No product subarray that beats 0 can cross a zero, so each segment can be solved on its own.

The two methods do the same O(n) work. The max/min version is the one interviewers usually expect because it is the general DP pattern; the prefix/suffix version is easier to prove correct. Example 2 runs both against the brute force on 300 random arrays.

## 8. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. Example 2 builds its random arrays with a small deterministic generator (MINSTD, \`seed = seed * 48271 mod 2147483647\`), so every language tests the same arrays.

**Example 1 — the one-pass solution on edge cases, plus the trace from section 5** prints:

~~~text
[2, 3, -2, 4] -> 6
[-2, 0, -1] -> 0
[-2] -> -2
[-2, 3, -4] -> 24
[0, 2] -> 2
[2, -5, -2, -4, 3] -> 24
[-1, -2, -3, 0, 4] -> 6
[-3, -1, -1] -> 3
trace of [2, -5, -2, -4, 3]:
i=0 x=2 hi=2 lo=2 best=2
i=1 x=-5 hi=-5 lo=-10 best=2
i=2 x=-2 hi=20 lo=-2 best=20
i=3 x=-4 hi=8 lo=-80 best=20
i=4 x=3 hi=24 lo=-240 best=24
~~~

What to read from this:

- \`[-2, 3, -4] -> 24\` is the case that breaks a "max only" solution: the 24 comes from the min −6 times −4.
- \`[-2, 0, -1] -> 0\`: every subarray containing a negative alone is negative, so the zero wins. \`[-2] -> -2\`: the subarray may not be empty, so a single negative is the answer.
- \`[-1, -2, -3, 0, 4] -> 6\`: the zero splits the array; on the left the best is −2 × −3 = 6 (dropping the first negative), which beats the 4 on the right.
- The trace is the table in section 5, line for line.

**Example 2 — brute force vs one pass vs prefix/suffix** prints:

~~~text
random arrays where all three methods agree: 300 of 300
n=2000: brute force answer 1 after 2001000 products
n=2000: one pass answer 1 after 1999 steps
~~~

All three methods agree on 300 random arrays of length 1–10 with values from −3 to 3 (lots of zeros and negatives). On 2,000 elements of ±1 the brute force needed 2,001,000 multiplications — that is n(n+1)/2 — while the one-pass version did 1,999 update steps.

## 9. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (every start, extend forward) | O(n²) | O(1) | n(n+1)/2 products; 2,001,000 for n = 2000 in example 2 |
| Max/min one pass | O(n) | O(1) | one constant-time update per element; only \`hi\`, \`lo\`, \`best\` are stored |
| Prefix/suffix scan | O(n) | O(1) | two running products, both updated once per index |

\`long long\` arithmetic is one machine instruction on any 64-bit target, so widening the state costs nothing measurable.

## 10. Edge Cases

- **A single element**, including a single negative: \`[-2]\` returns −2. Initialise \`best\` with \`nums[0]\`, never with 0 or 1.
- **Zeros**: \`[-2, 0, -1]\` returns 0; \`[0, 2]\` returns 2. The \`x alone\` candidate is what restarts a run after a zero.
- **An even number of negatives**: \`[-2, 3, -4]\` uses the whole array.
- **An odd number of negatives**: \`[-3, -1, -1]\` returns 3, dropping one negative from the left end.
- **All negatives with zeros between them**: the answer may be 0 even though no element is positive.
- **Very large products**: decide the number type before coding (see the pitfalls below).

## Common Pitfalls

- **Tracking only the maximum.** It is Kadane for sums, and it returns −4 instead of 24 on \`[-2, 3, -4]\`.
- **Keeping the state in \`int\`.** Signed overflow is undefined behaviour, not just a wrong number; with optimisations on, the compiler may transform the code assuming it never happens. Use \`long long\`.
- **Mixing types in \`std::max\`.** \`std::max(nums[i], hi * nums[i])\` with \`long long hi\` is \`max(int, long long)\` and does not compile; copy \`x\` into a \`long long\` or write \`std::max<long long>(...)\`.
- **Computing the new \`lo\` from the new \`hi\`** in the no-swap version. Save the old pair first, or \`std::swap\`.
- **Reading \`nums[0]\` on an empty vector.** \`operator[]\` does no bounds check, so it is undefined behaviour rather than an exception.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The trap:</strong> <span style="color:#f0e2c8;">Plain Kadane fails because a negative number turns the <strong style="color:#ffca28;">smallest</strong> product into the largest: on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-2, 3, -4]</code> the 24 comes from −6 × −4.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The state:</strong> <span style="color:#f0e2c8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code>, the largest and smallest product of a subarray ending here, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code>, all as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The update:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &lt; 0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::swap(hi, lo)</code>; then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = std::max(x, hi * x)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = std::min(x, lo * x)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best = std::max(best, hi)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) space, compared with O(n²) for trying every start; for n = 2000 that was 1,999 steps against 2,001,000 products.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Signed overflow is undefined behaviour, so widen to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>, and give <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::max</code> two arguments of the same type.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need the minimum at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because multiplying by a negative reverses order. The most negative product so far is the one that becomes the largest after the next negative, as −10 × −2 = 20 does in the trace.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a solution without tracking the minimum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the prefix/suffix scan: multiply from both ends, reset to 1 after a zero, take the best running product. In a zero-free stretch the best subarray is always a prefix or a suffix.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the subarray, not just the product?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Also track where the current <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo</code> runs started (swap the starts with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::swap</code> too, reset a start when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> alone wins), and record start and end whenever <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> improves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just let int overflow wrap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For signed types it is undefined behaviour, so there is no guaranteed wrap at all; the optimiser may assume it cannot happen. Unsigned types wrap by definition, but products of negatives need signed values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did std::max fail to compile in your first draft?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It deduces one type <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> from both arguments; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> disagree, so no template matches. Convert first or write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::max&lt;long long&gt;(a, b)</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subarray** | A contiguous slice of an array, nothing skipped |
| **State** | What a DP remembers about the part of the input already seen |
| **Max/min product ending here** | The largest and smallest product of a subarray that ends exactly at index i |
| **Sign flip** | Multiplying by a negative reverses order, so the minimum can become the maximum |
| **Zero-free segment** | A run of the array between zeros; the best positive product lives inside one |

---
**Conclusion:** Maximum product subarray is Kadane with two values of state instead of one. Because a negative number flips the smallest product into the largest, you carry both the max and the min product ending at each index, swap them on a negative, let \`x\` alone restart a run after a zero, and keep the best max seen — O(n) time and O(1) space. In C++, the loop is a few lines with \`std::swap\` and \`long long\` state so signed overflow cannot occur. Our run checked it on the edge cases and against the brute force on 300 random arrays, and the prefix/suffix scan gives a second linear answer for the follow-up.`,
        examples: [
          {
            label: `Max product subarray: max/min tracking on edge cases, with a trace`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

long long maxProduct(const std::vector<int>& nums) {
    long long hi = nums[0], lo = nums[0], best = nums[0]; // largest / smallest product ending here
    for (size_t i = 1; i < nums.size(); i++) {
        long long x = nums[i];
        if (x < 0) std::swap(hi, lo);          // a negative flips big and small
        hi = std::max(x, hi * x);              // extend the run, or start fresh at x
        lo = std::min(x, lo * x);
        best = std::max(best, hi);
    }
    return best;
}

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

void trace(const std::vector<int>& nums) {
    long long hi = nums[0], lo = nums[0], best = nums[0];
    std::cout << "i=0 x=" << nums[0] << " hi=" << hi << " lo=" << lo << " best=" << best << "\\n";
    for (size_t i = 1; i < nums.size(); i++) {
        long long x = nums[i];
        if (x < 0) std::swap(hi, lo);
        hi = std::max(x, hi * x);
        lo = std::min(x, lo * x);
        best = std::max(best, hi);
        std::cout << "i=" << i << " x=" << x << " hi=" << hi << " lo=" << lo << " best=" << best << "\\n";
    }
}

int main() {
    std::vector<std::vector<int>> cases = {{2, 3, -2, 4}, {-2, 0, -1}, {-2}, {-2, 3, -4}, {0, 2},
        {2, -5, -2, -4, 3}, {-1, -2, -3, 0, 4}, {-3, -1, -1}};
    for (const auto& nums : cases) std::cout << fmt(nums) << " -> " << maxProduct(nums) << "\\n";
    std::cout << "trace of [2, -5, -2, -4, 3]:\\n";
    trace({2, -5, -2, -4, 3});
}`,
          },
          {
            label: `Brute force vs one pass vs prefix/suffix scan on random arrays`,
            code: `#include <algorithm>
#include <iostream>
#include <vector>

long long maxProduct(const std::vector<int>& nums) {
    long long hi = nums[0], lo = nums[0], best = nums[0]; // largest / smallest product ending here
    for (size_t i = 1; i < nums.size(); i++) {
        long long x = nums[i];
        if (x < 0) std::swap(hi, lo);          // a negative flips big and small
        hi = std::max(x, hi * x);              // extend the run, or start fresh at x
        lo = std::min(x, lo * x);
        best = std::max(best, hi);
    }
    return best;
}

long long products = 0;
long long seed = 12345;

long long next() {
    seed = seed * 48271 % 2147483647LL;
    return seed;
}

long long brute(const std::vector<int>& nums) {
    long long best = nums[0];
    for (size_t i = 0; i < nums.size(); i++) {
        long long p = 1;
        for (size_t j = i; j < nums.size(); j++) {
            p *= nums[j];
            products++;
            best = std::max(best, p);
        }
    }
    return best;
}

long long prefixSuffix(const std::vector<int>& nums) {
    size_t n = nums.size();
    long long best = nums[0], left = 1, right = 1;
    for (size_t i = 0; i < n; i++) {
        left = (left != 0 ? left : 1) * nums[i];          // restart after a zero
        right = (right != 0 ? right : 1) * nums[n - 1 - i];
        best = std::max({best, left, right});
    }
    return best;
}

int main() {
    int agree = 0;
    for (int t = 0; t < 300; t++) {
        int len = 1 + next() % 10;
        std::vector<int> arr;
        for (int k = 0; k < len; k++) arr.push_back(next() % 7 - 3); // values -3..3
        long long a = brute(arr), b = maxProduct(arr), c = prefixSuffix(arr);
        if (a == b && b == c) agree++;
    }
    std::cout << "random arrays where all three methods agree: " << agree << " of 300\\n";

    std::vector<int> big;
    for (int k = 0; k < 2000; k++) big.push_back(next() % 2 ? 1 : -1);
    products = 0;
    long long r1 = brute(big);
    long long r2 = maxProduct(big);
    std::cout << "n=2000: brute force answer " << r1 << " after " << products << " products\\n";
    std::cout << "n=2000: one pass answer " << r2 << " after " << big.size() - 1 << " steps\\n";
}`,
          },
        ],
      },
    },
  },
  {
    title: `How do you solve the coin change problem?`,
    difficulty: "medium",
    seoDescription: `Coin change with bottom-up DP: fewest coins, rebuilding the coins used, why greedy fails, and counting combinations vs orders, verified in four languages.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given coin denominations and a target amount. Return the fewest coins needed to make that amount exactly, or -1 if it cannot be made; you have an unlimited supply of each coin. Explain why the obvious greedy idea does not work, then code a solution in Python."

**What a strong answer should cover:**
- Why greedy (always take the biggest coin) is wrong in general: with coins \`[1, 3, 4]\` and amount 6 it uses 4 + 1 + 1 = 3 coins, but 3 + 3 = 2 coins is optimal.
- The DP state and recurrence: \`dp[a]\` = fewest coins that make \`a\`; \`dp[0] = 0\`; \`dp[a] = 1 + min(dp[a - c])\` over coins \`c <= a\`; an "impossible" sentinel such as \`amount + 1\`.
- O(amount × number of coins) time and O(amount) space, and why it is pseudo-polynomial (it depends on the value of \`amount\`, not its digit count).
- Rebuilding the actual coins by storing the last coin used per amount, and the related "number of ways" variant, where the loop order decides whether you count combinations or orders.
- Python details: a list \`[0] + [INF] * amount\`, \`amount + 1\` (or \`float("inf")\`) as the sentinel, and \`functools.lru_cache\` for a top-down version, which hits the default recursion limit of 1000 for large amounts.

**Clarifying questions expected:**
- Is the supply of each coin unlimited, and are all coin values positive?
- What should be returned when the amount cannot be made, and what for amount 0?
- Do you need the count only, or also which coins to use?

**Code / implementation expected:** Yes — a bottom-up Python function over amounts 0..amount; rebuilding the coins used is a common follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, arrays and a first idea of what dynamic programming is.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You run a vending machine in a country with strange coins: 1, 3 and 4 cents. A customer is owed 6 cents of change, and the machine wants to hand back as few coins as possible because coins are expensive to restock.

The obvious rule is the one a cashier uses: grab the biggest coin that fits, repeat. 4 fits, leaving 2. Then 1, then 1. Three coins. But a slightly smarter machine notices that **3 + 3** is also 6 — only two coins. The "biggest first" rule took a coin that looked great right now and paid for it later.

How would the smart machine find the best answer for **any** amount, without trying every possible pile of coins? It works its way up: "what is the best way to give 1 cent? 2 cents? 3 cents?", and each new amount reuses the answers it already worked out. To give 6 cents, the last coin is a 1, a 3 or a 4, so the answer is one coin plus the best answer for 5, 3 or 2 cents — all of which it already knows. That reuse of small answers is the coin change problem, and it is one of the cleanest examples of [dynamic programming](/interview-question/what-is-dynamic-programming).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the supply of each coin unlimited? | Unlimited coins gives the 1D recurrence below; "each coin at most once" is the [0/1 knapsack](/interview-question/how-do-you-solve-the-0-1-knapsack-problem) pattern instead |
| Are all coins positive, and can there be duplicates? | A 0 coin would make the recurrence loop on itself; duplicates are harmless |
| What should I return when the amount cannot be made? | The standard answer is −1, which needs an "impossible" marker inside the table |
| What is the answer for amount 0? | 0 coins — the base case of the whole table |
| Do you want the fewest coins, the coins themselves, or the number of ways? | Three related problems; the first two share one table, the third needs a different one |
| How large can the amount be? | The table has \`amount + 1\` entries, so a huge amount (say 10^9) needs a different idea |

## 3. Why Greedy Fails

📌 **Interview term: Greedy algorithm** — an algorithm that makes the choice that looks best right now and never reconsiders it. See [What is a greedy algorithm?](/interview-question/what-is-a-greedy-algorithm) for when that is safe.

Greedy is correct for some coin systems (the everyday 1, 5, 10, 25 cents is one of them), but not for all, and in an interview you are given arbitrary coins. Two failures, both printed by example 1:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="Making 6 from coins 1, 3 and 4. Greedy takes 4, 1, 1 for three coins. The optimal answer takes 3 and 3 for two coins">
  <text class="d-sub" x="20" y="62">greedy</text>
  <rect class="d-box-muted" x="130" y="30" width="80" height="50" rx="25"/>
  <text class="d-text" x="170" y="61" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="250" y="30" width="80" height="50" rx="25"/>
  <text class="d-text" x="290" y="61" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="370" y="30" width="80" height="50" rx="25"/>
  <text class="d-text" x="410" y="61" text-anchor="middle">1</text>
  <text class="d-text" x="520" y="62">3 coins</text>
  <text class="d-sub" x="20" y="172">optimal</text>
  <rect class="d-box-accent" x="130" y="140" width="80" height="50" rx="25"/>
  <text class="d-text" x="170" y="171" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="250" y="140" width="80" height="50" rx="25"/>
  <text class="d-text" x="290" y="171" text-anchor="middle">3</text>
  <text class="d-text" x="520" y="172">2 coins</text>
</svg>

- Coins \`[1, 3, 4]\`, amount 6: greedy gives 4 + 1 + 1 (3 coins); the best is 3 + 3 (2 coins). Greedy is **not optimal**.
- Coins \`[5, 2]\`, amount 6: greedy takes 5 and is stuck with 1 left, so it reports −1; but 2 + 2 + 2 works. Greedy is not even **complete** — it can miss a solution that exists.

So we need a method that considers every choice for the last coin, without the exponential cost of trying every pile.

## 4. The DP Idea

Look at any optimal way to make amount \`a\`. Its **last coin** is some coin \`c\`. Remove it, and what is left must be an optimal way to make \`a − c\` (if there were a better way to make \`a − c\`, adding \`c\` to it would beat our "optimal" answer for \`a\`). So:

~~~text
dp[0] = 0
dp[a] = 1 + min( dp[a - c] )   over every coin c with c <= a
dp[a] = impossible            if no coin gives a possible dp[a - c]
answer = dp[amount], or -1 if it is impossible
~~~

📌 **Interview term: Optimal substructure** — an optimal answer to the problem is built from optimal answers to smaller versions of it. Here: an optimal pile for \`a\` minus its last coin is an optimal pile for \`a − c\`.

📌 **Interview term: Overlapping subproblems** — the same smaller question is asked again and again. \`dp[3]\` is needed for amounts 4, 6 and 7 when the coins are 1, 3 and 4; the table computes it once.

Here is the table for coins \`[1, 3, 4]\` (these values are the last line of example 1). To fill \`dp[6]\`, look back by each coin:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="The dp table for coins 1, 3 and 4 over amounts 0 to 6. dp of 6 looks back at dp of 5, 3 and 2 and takes the smallest plus one">
  <path class="d-edge" d="M 605 158 C 590 110, 540 110, 520 148"/>
  <path class="d-edge-accent" d="M 610 158 C 580 70, 360 70, 330 148"/>
  <path class="d-edge" d="M 615 158 C 560 0, 270 0, 240 148"/>
  <text class="d-sub" x="564" y="112" text-anchor="middle">minus 1</text>
  <text class="d-sub" x="470" y="82" text-anchor="middle">minus 3</text>
  <text class="d-sub" x="418" y="26" text-anchor="middle">minus 4</text>
  <rect class="d-box-muted" x="30" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="65" y="191" text-anchor="middle">0</text>
  <rect class="d-box" x="120" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="155" y="191" text-anchor="middle">1</text>
  <rect class="d-box" x="210" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="245" y="191" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="335" y="191" text-anchor="middle">1</text>
  <rect class="d-box" x="390" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="425" y="191" text-anchor="middle">1</text>
  <rect class="d-box" x="480" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="515" y="191" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="570" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="605" y="191" text-anchor="middle">2</text>
  <text class="d-sub" x="65" y="245" text-anchor="middle">a=0</text>
  <text class="d-sub" x="155" y="245" text-anchor="middle">a=1</text>
  <text class="d-sub" x="245" y="245" text-anchor="middle">a=2</text>
  <text class="d-sub" x="335" y="245" text-anchor="middle">a=3</text>
  <text class="d-sub" x="425" y="245" text-anchor="middle">a=4</text>
  <text class="d-sub" x="515" y="245" text-anchor="middle">a=5</text>
  <text class="d-sub" x="605" y="245" text-anchor="middle">a=6</text>
</svg>

\`dp[6] = 1 + min(dp[5], dp[3], dp[2]) = 1 + min(2, 1, 2) = 2\`, and the minimum came from the coin 3 (the accent arc). Following that choice back — 6 → 3 → 0 — gives the coins 3 + 3.

📌 **Interview term: Sentinel value** — a special value that means "impossible" inside the table. Using \`amount + 1\` works because no real answer can need more than \`amount\` coins (that would take more than \`amount\` coins of value at least 1).

📌 **Interview term: Bottom-up (tabulation)** — filling the table from the smallest subproblem upward, so every value you read is already computed. The other style, top-down memoization, is compared in [What is dynamic programming?](/interview-question/what-is-dynamic-programming).

## 5. The Code in Python

The function below fills \`dp\` from 1 up to \`amount\`, and also records \`last[a]\`, the coin that gave the best value, so the actual coins can be rebuilt by walking back from \`amount\`.

~~~python
def coin_change(coins, amount):
    """Return (fewest coins, the coins used) or (-1, []) if amount is unreachable."""
    INF = amount + 1                       # more coins than any real answer can need
    dp = [0] + [INF] * amount              # dp[a] = fewest coins that make a
    last = [0] * (amount + 1)              # last[a] = coin used to reach a
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
                last[a] = c
    if dp[amount] == INF:
        return -1, []
    used, a = [], amount
    while a > 0:                           # walk back through the choices
        used.append(last[a])
        a -= last[a]
    return dp[amount], used
~~~

**What to point out in this code:**

- \`[0] + [INF] * amount\` builds the whole table in one expression; list repetition with \`*\` is safe here because the elements are \`int\`s (repeating a list of lists would share the inner lists).
- \`INF = amount + 1\` instead of \`float("inf")\` keeps the whole table as \`int\`s and makes the "impossible" test a plain \`==\`. \`float("inf")\` also works (\`inf + 1\` is still \`inf\`), but then \`dp\` mixes \`int\` and \`float\`.
- The test \`dp[a - c] + 1 < dp[a]\` handles impossible sub-amounts for free: \`INF + 1\` is never smaller than \`dp[a]\`, which is at most \`INF\`.
- The function returns a tuple \`(count, used)\`; Python callers unpack it with \`n, used = coin_change(...)\`.
- The walk-back loop \`while a > 0: a -= last[a]\` terminates because every \`last[a]\` is a positive coin.

## 6. The Other Classic Version: Counting the Ways

A popular follow-up asks **how many different ways** there are to make the amount. The recurrence looks almost the same — \`ways[a] += ways[a - c]\`, with \`ways[0] = 1\` (one way to make 0: take nothing) — but the **order of the two loops** changes what is counted:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Coins outer loop counts each combination once, giving 4 ways to make 5 from 1, 2 and 5. Amount outer loop counts every order, giving 9">
  <rect class="d-box" x="20" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="170" y="62" text-anchor="middle">coin loop outside</text>
  <text class="d-sub" x="170" y="88" text-anchor="middle">1 + 2 + 2 counted once</text>
  <rect class="d-box" x="380" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="530" y="62" text-anchor="middle">amount loop outside</text>
  <text class="d-sub" x="530" y="88" text-anchor="middle">1+2+2, 2+1+2, 2+2+1 all counted</text>
  <rect class="d-box-accent" x="70" y="150" width="200" height="50" rx="10"/>
  <text class="d-text" x="170" y="181" text-anchor="middle">combinations: 4</text>
  <rect class="d-box-accent" x="430" y="150" width="200" height="50" rx="10"/>
  <text class="d-text" x="530" y="181" text-anchor="middle">orders: 9</text>
  <path class="d-edge" d="M 170 112 L 170 148"/>
  <path class="d-edge" d="M 530 112 L 530 148"/>
</svg>

~~~python
def count_combinations(coins, amount):
    ways = [1] + [0] * amount
    for c in coins:                        # coin loop OUTSIDE: each multiset once
        for a in range(c, amount + 1):
            ways[a] += ways[a - c]
    return ways[amount]

def count_orders(coins, amount):
    ways = [1] + [0] * amount
    for a in range(1, amount + 1):         # amount loop OUTSIDE: every order counted
        for c in coins:
            if c <= a:
                ways[a] += ways[a - c]
    return ways[amount]
~~~

Why the loop order matters: with the **coin loop outside**, by the time coin 2 is processed, coin 1 has already been fully used, so every pile is built in the order "all 1s, then all 2s, then all 5s" — each multiset of coins is generated exactly once. With the **amount loop outside**, every amount considers every coin as its last coin, so 1 + 2 + 2 and 2 + 1 + 2 are different paths and both are counted. Counting orders with coins \`{1, 2}\` is exactly the [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem) problem.

📌 **Interview term: Combinations vs permutations (in counting DP)** — combinations treat \`1+2+2\` and \`2+1+2\` as the same pile; permutations (orders) count them separately. The loop nesting chooses which.

These counts get big quickly: 8,577,828,731,901 orders for 100 cents in example 2. Python \`int\` holds that without any change.

## 7. Top-Down vs Bottom-Up vs Plain Recursion

The same recurrence can be written as a recursive function. Without a cache it re-solves the same amounts again and again; with a cache (memoization) each amount is solved once. Example 2 counts the calls for coins \`[1, 2, 5]\` and amount 25:

| Version | Work for amount 25 | Why |
| :--- | :--- | :--- |
| Plain recursion | 924,876 calls | each call branches up to 3 ways; the tree grows exponentially |
| Memoized recursion | 71 calls | each amount is computed once; the rest are cache hits |
| Bottom-up table | 75 inner steps | 25 amounts × 3 coins |

In Python, a top-down version is usually written with \`@functools.lru_cache(maxsize=None)\` (or its shorthand \`@functools.cache\`). Be careful: each recursive call uses a stack frame, and Python's default recursion limit is 1000 — in our run, a memoized function recursing 5,000 levels deep raised \`RecursionError: maximum recursion depth exceeded\`. With coin 1 present, the recursion depth equals the amount, so the bottom-up loop is the safe choice for large amounts.

## 8. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — fewest coins, the coins used, and greedy failing** prints:

~~~text
coins [1, 2, 5], amount 11 -> 3 coins: 1 + 5 + 5
coins [2], amount 3 -> -1
coins [1], amount 0 -> 0 coins: (none)
coins [1, 3, 4], amount 6 -> 2 coins: 3 + 3
coins [186, 419, 83, 408], amount 6249 -> 20 coins: 186 + 186 + 186 + 419 + 419 + 419 + 419 + 419 + 83 + 83 + 83 + 83 + 408 + 408 + 408 + 408 + 408 + 408 + 408 + 408
greedy [1, 3, 4], amount 6 -> 3 coins: 4 + 1 + 1
greedy [5, 2], amount 6 -> -1
dp for [1, 3, 4], amounts 0..6: [0, 1, 2, 1, 1, 2, 2]
~~~

What to read from this:

- \`[1, 2, 5]\`, 11 → 3 coins (1 + 5 + 5). The coins come out in walk-back order: \`last[11]\` is 1, then \`last[10]\` is 5, then \`last[5]\` is 5.
- \`[2]\`, 3 → −1: no pile of 2s makes an odd amount. \`[1]\`, 0 → 0 coins: the base case.
- \`[186, 419, 83, 408]\`, 6249 → 20 coins: a case where no simple rule finds the answer.
- Greedy gives 3 coins on \`[1, 3, 4]\` where DP finds 2, and −1 on \`[5, 2]\` where 2 + 2 + 2 exists.
- The last line is the table drawn in section 4.

**Example 2 — the number of ways, and plain vs memoized recursion** prints:

~~~text
ways to make 5 from [1, 2, 5]: combinations 4, orders 9
ways to make 100 from [1, 5, 10, 25]: combinations 242, orders 8577828731901
ways to make 3 from [2]: combinations 0, orders 0
naive recursion, amount 25: answer 5 after 924876 calls
memoized recursion, amount 25: answer 5 after 71 calls
bottom-up table, amount 25: answer 5 after 75 inner steps
~~~

The 4 combinations to make 5 from \`[1, 2, 5]\` are 5, 2+2+1, 2+1+1+1 and 1+1+1+1+1; counting orders turns those into 9. For amount 25 the plain recursion made 924,876 calls while the memoized version made 71 and the table did 75 steps — the whole point of DP in three lines.

## 9. Complexity

Let A = amount and k = number of coins.

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential in A | O(A) stack | every call branches into up to k calls (924,876 calls for A = 25, k = 3) |
| Memoized recursion | O(A · k) | O(A) memo + O(A) stack | each amount is computed once with k look-backs |
| Bottom-up table (fewest coins) | O(A · k) | O(A) | A entries, each a min over k coins |
| Counting ways (either loop order) | O(A · k) | O(A) | same table shape, sums instead of mins |

📌 **Interview term: Pseudo-polynomial time** — a running time that is polynomial in the **numeric value** of an input (here A) rather than in its size in digits. Doubling the number of digits in A squares the work, so a huge A needs another method.

## 10. Edge Cases

- **Amount 0:** the answer is 0 coins; the table has one entry.
- **Unreachable amount:** \`[2]\` and 3. The sentinel survives to \`dp[amount]\`, so return −1.
- **A coin larger than the amount:** skipped by the \`c <= a\` test.
- **Coin 1 present:** every amount is reachable, and the answer is at most \`amount\`.
- **Unsorted coins or duplicate coins:** the DP does not care about order or duplicates; only greedy needs sorting.
- **Large amount:** the table has \`amount + 1\` entries — fine for 10^4 or 10^5, not for 10^9.

## Common Pitfalls

- **Using greedy.** It is wrong on \`[1, 3, 4]\` (3 coins instead of 2) and incomplete on \`[5, 2]\` (−1 instead of 3).
- **Forgetting to turn the sentinel into −1.** Returning \`amount + 1\` or \`inf\` as "the answer" is a common slip.
- **Mixing up the loop order in the counting version.** Coin loop outside counts combinations; amount loop outside counts orders.
- **Recursing top-down on a big amount.** \`lru_cache\` does not remove the stack depth; with coin 1, the depth equals the amount and passes Python's default limit of 1000.
- **\`0] * n] * m\` habits.** Not needed here, but repeating a list of lists with \`*\` shares the inner list — use a comprehension when you go 2D.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reject greedy:</strong> <span style="color:#f0e2c8;">Biggest-coin-first fails on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 3, 4]</code> for 6: it gives 4 + 1 + 1, but 3 + 3 is better. I need to consider every possible last coin.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[a]</code> is the fewest coins that make <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0] = 0</code>; everything else starts at the sentinel <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount + 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The recurrence:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[a] = 1 + min(dp[a - c])</code> over coins <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c &lt;= a</code>, filled for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> from 1 to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount</code>; return −1 if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[amount]</code> is still the sentinel.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(amount × coins) time and O(amount) space — pseudo-polynomial, because it depends on the value of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">A list <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0] + [INF] * amount</code> and two loops; I avoid a top-down <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lru_cache</code> version for big amounts because of the 1000-frame recursion limit.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the coins themselves?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">last[a]</code>, the coin that improved <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[a]</code>, then walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a -= last[a]</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount</code> down to 0. For 11 with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 5]</code> that gives 1, 5, 5.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many ways are there to make the amount?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[0] = 1</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[a] += ways[a - c]</code>. With the coin loop outside you count combinations (4 for 5 from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 5]</code>), with the amount loop outside you count orders (9).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">amount + 1</code> a safe sentinel?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every coin is at least 1, so no real answer uses more than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount</code> coins; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount + 1</code> can never be a real answer and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+ 1</code> on it cannot beat a real one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is greedy actually correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For some coin systems, like 1, 5, 10, 25; those are called canonical. For arbitrary coins you cannot assume it, so DP is the safe answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if each coin can be used only once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then it is 0/1 knapsack: loop amounts <strong style="color:#ffca28;">downward</strong> inside the coin loop, so each coin is counted at most once.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Greedy algorithm** | Always take the choice that looks best now, never reconsider |
| **Optimal substructure** | An optimal answer is built from optimal answers to smaller subproblems |
| **Overlapping subproblems** | The same smaller question is asked many times, so caching pays off |
| **Sentinel value** | A special value (here \`amount + 1\`) meaning "impossible" inside the table |
| **Bottom-up (tabulation)** | Fill the table from the smallest subproblem upward |
| **Combinations vs permutations** | Whether \`1+2+2\` and \`2+1+2\` count as one way or two; chosen by loop order |
| **Pseudo-polynomial time** | Polynomial in the numeric value of the input, not in its number of digits |

---
**Conclusion:** Coin change is the textbook case where greedy breaks and dynamic programming does not. Define \`dp[a]\` as the fewest coins that make \`a\`, start from \`dp[0] = 0\`, and fill upward with \`dp[a] = 1 + min(dp[a - c])\`, using \`amount + 1\` as the "impossible" marker and turning it into −1 at the end — O(amount × coins) time and O(amount) space. Store the last coin per amount to rebuild the answer, and for the "number of ways" follow-up remember that the loop order picks combinations or orders. [[In Python the table is one list and two loops, and the bottom-up form avoids the recursion limit.`,
        examples: [
          {
            label: `Fewest coins: bottom-up DP, the coins used, and greedy failing`,
            code: `def coin_change(coins, amount):
    """Return (fewest coins, the coins used) or (-1, []) if amount is unreachable."""
    INF = amount + 1                       # more coins than any real answer can need
    dp = [0] + [INF] * amount              # dp[a] = fewest coins that make a
    last = [0] * (amount + 1)              # last[a] = coin used to reach a
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
                last[a] = c
    if dp[amount] == INF:
        return -1, []
    used, a = [], amount
    while a > 0:                           # walk back through the choices
        used.append(last[a])
        a -= last[a]
    return dp[amount], used


def greedy(coins, amount):
    used = []
    for c in sorted(coins, reverse=True):  # biggest coin first
        while amount >= c:
            amount -= c
            used.append(c)
    return (len(used), used) if amount == 0 else (-1, [])


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


def show(label, result):
    n, used = result
    if n == -1:
        return label + " -> -1"
    return label + " -> " + str(n) + " coins: " + (" + ".join(str(c) for c in used) if used else "(none)")


for coins, amount in [([1, 2, 5], 11), ([2], 3), ([1], 0), ([1, 3, 4], 6), ([186, 419, 83, 408], 6249)]:
    print(show("coins " + fmt(coins) + ", amount " + str(amount), coin_change(coins, amount)))
print(show("greedy [1, 3, 4], amount 6", greedy([1, 3, 4], 6)))
print(show("greedy [5, 2], amount 6", greedy([5, 2], 6)))
print("dp for [1, 3, 4], amounts 0..6: " + fmt([coin_change([1, 3, 4], a)[0] for a in range(7)]))`,
          },
          {
            label: `Number of ways: combinations vs orders, and naive vs memoized recursion`,
            code: `def count_combinations(coins, amount):
    ways = [1] + [0] * amount
    for c in coins:                        # coin loop OUTSIDE: each multiset once
        for a in range(c, amount + 1):
            ways[a] += ways[a - c]
    return ways[amount]


def count_orders(coins, amount):
    ways = [1] + [0] * amount
    for a in range(1, amount + 1):         # amount loop OUTSIDE: every order counted
        for c in coins:
            if c <= a:
                ways[a] += ways[a - c]
    return ways[amount]


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


calls = 0
INF = 10 ** 9


def naive(coins, a):
    global calls
    calls += 1
    if a == 0:
        return 0
    best = INF
    for c in coins:
        if c <= a:
            best = min(best, naive(coins, a - c) + 1)
    return best


def memo(coins, a, cache):
    global calls
    calls += 1
    if a == 0:
        return 0
    if a in cache:
        return cache[a]
    best = INF
    for c in coins:
        if c <= a:
            best = min(best, memo(coins, a - c, cache) + 1)
    cache[a] = best
    return best


for coins, amount in [([1, 2, 5], 5), ([1, 5, 10, 25], 100), ([2], 3)]:
    print("ways to make " + str(amount) + " from " + fmt(coins) + ": combinations "
          + str(count_combinations(coins, amount)) + ", orders " + str(count_orders(coins, amount)))

calls = 0
r = naive([1, 2, 5], 25)
print("naive recursion, amount 25: answer " + str(r) + " after " + str(calls) + " calls")
calls = 0
r = memo([1, 2, 5], 25, {})
print("memoized recursion, amount 25: answer " + str(r) + " after " + str(calls) + " calls")
steps = 0
dp = [0] + [INF] * 25
for a in range(1, 26):
    for c in [1, 2, 5]:
        steps += 1
        if c <= a:
            dp[a] = min(dp[a], dp[a - c] + 1)
print("bottom-up table, amount 25: answer " + str(dp[25]) + " after " + str(steps) + " inner steps")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given coin denominations and a target amount. Return the fewest coins needed to make that amount exactly, or -1 if it cannot be made; you have an unlimited supply of each coin. Explain why the obvious greedy idea does not work, then code a solution in JavaScript."

**What a strong answer should cover:**
- Why greedy (always take the biggest coin) is wrong in general: with coins \`[1, 3, 4]\` and amount 6 it uses 4 + 1 + 1 = 3 coins, but 3 + 3 = 2 coins is optimal.
- The DP state and recurrence: \`dp[a]\` = fewest coins that make \`a\`; \`dp[0] = 0\`; \`dp[a] = 1 + min(dp[a - c])\` over coins \`c <= a\`; an "impossible" sentinel such as \`amount + 1\`.
- O(amount × number of coins) time and O(amount) space, and why it is pseudo-polynomial (it depends on the value of \`amount\`, not its digit count).
- Rebuilding the actual coins by storing the last coin used per amount, and the related "number of ways" variant, where the loop order decides whether you count combinations or orders.
- JavaScript details: \`new Array(n).fill(INF)\` (or \`Infinity\`), that \`Array.prototype.sort()\` sorts numbers as strings unless you pass a comparator, and a \`Map\` for a memo table.

**Clarifying questions expected:**
- Is the supply of each coin unlimited, and are all coin values positive?
- What should be returned when the amount cannot be made, and what for amount 0?
- Do you need the count only, or also which coins to use?

**Code / implementation expected:** Yes — a bottom-up JavaScript function over amounts 0..amount; rebuilding the coins used is a common follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, arrays and a first idea of what dynamic programming is.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You run a vending machine in a country with strange coins: 1, 3 and 4 cents. A customer is owed 6 cents of change, and the machine wants to hand back as few coins as possible because coins are expensive to restock.

The obvious rule is the one a cashier uses: grab the biggest coin that fits, repeat. 4 fits, leaving 2. Then 1, then 1. Three coins. But a slightly smarter machine notices that **3 + 3** is also 6 — only two coins. The "biggest first" rule took a coin that looked great right now and paid for it later.

How would the smart machine find the best answer for **any** amount, without trying every possible pile of coins? It works its way up: "what is the best way to give 1 cent? 2 cents? 3 cents?", and each new amount reuses the answers it already worked out. To give 6 cents, the last coin is a 1, a 3 or a 4, so the answer is one coin plus the best answer for 5, 3 or 2 cents — all of which it already knows. That reuse of small answers is the coin change problem, and it is one of the cleanest examples of [dynamic programming](/interview-question/what-is-dynamic-programming).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the supply of each coin unlimited? | Unlimited coins gives the 1D recurrence below; "each coin at most once" is the [0/1 knapsack](/interview-question/how-do-you-solve-the-0-1-knapsack-problem) pattern instead |
| Are all coins positive, and can there be duplicates? | A 0 coin would make the recurrence loop on itself; duplicates are harmless |
| What should I return when the amount cannot be made? | The standard answer is −1, which needs an "impossible" marker inside the table |
| What is the answer for amount 0? | 0 coins — the base case of the whole table |
| Do you want the fewest coins, the coins themselves, or the number of ways? | Three related problems; the first two share one table, the third needs a different one |
| How large can the amount be? | The table has \`amount + 1\` entries, so a huge amount (say 10^9) needs a different idea |

## 3. Why Greedy Fails

📌 **Interview term: Greedy algorithm** — an algorithm that makes the choice that looks best right now and never reconsiders it. See [What is a greedy algorithm?](/interview-question/what-is-a-greedy-algorithm) for when that is safe.

Greedy is correct for some coin systems (the everyday 1, 5, 10, 25 cents is one of them), but not for all, and in an interview you are given arbitrary coins. Two failures, both printed by example 1:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="Making 6 from coins 1, 3 and 4. Greedy takes 4, 1, 1 for three coins. The optimal answer takes 3 and 3 for two coins">
  <text class="d-sub" x="20" y="62">greedy</text>
  <rect class="d-box-muted" x="130" y="30" width="80" height="50" rx="25"/>
  <text class="d-text" x="170" y="61" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="250" y="30" width="80" height="50" rx="25"/>
  <text class="d-text" x="290" y="61" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="370" y="30" width="80" height="50" rx="25"/>
  <text class="d-text" x="410" y="61" text-anchor="middle">1</text>
  <text class="d-text" x="520" y="62">3 coins</text>
  <text class="d-sub" x="20" y="172">optimal</text>
  <rect class="d-box-accent" x="130" y="140" width="80" height="50" rx="25"/>
  <text class="d-text" x="170" y="171" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="250" y="140" width="80" height="50" rx="25"/>
  <text class="d-text" x="290" y="171" text-anchor="middle">3</text>
  <text class="d-text" x="520" y="172">2 coins</text>
</svg>

- Coins \`[1, 3, 4]\`, amount 6: greedy gives 4 + 1 + 1 (3 coins); the best is 3 + 3 (2 coins). Greedy is **not optimal**.
- Coins \`[5, 2]\`, amount 6: greedy takes 5 and is stuck with 1 left, so it reports −1; but 2 + 2 + 2 works. Greedy is not even **complete** — it can miss a solution that exists.

So we need a method that considers every choice for the last coin, without the exponential cost of trying every pile.

## 4. The DP Idea

Look at any optimal way to make amount \`a\`. Its **last coin** is some coin \`c\`. Remove it, and what is left must be an optimal way to make \`a − c\` (if there were a better way to make \`a − c\`, adding \`c\` to it would beat our "optimal" answer for \`a\`). So:

~~~text
dp[0] = 0
dp[a] = 1 + min( dp[a - c] )   over every coin c with c <= a
dp[a] = impossible            if no coin gives a possible dp[a - c]
answer = dp[amount], or -1 if it is impossible
~~~

📌 **Interview term: Optimal substructure** — an optimal answer to the problem is built from optimal answers to smaller versions of it. Here: an optimal pile for \`a\` minus its last coin is an optimal pile for \`a − c\`.

📌 **Interview term: Overlapping subproblems** — the same smaller question is asked again and again. \`dp[3]\` is needed for amounts 4, 6 and 7 when the coins are 1, 3 and 4; the table computes it once.

Here is the table for coins \`[1, 3, 4]\` (these values are the last line of example 1). To fill \`dp[6]\`, look back by each coin:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="The dp table for coins 1, 3 and 4 over amounts 0 to 6. dp of 6 looks back at dp of 5, 3 and 2 and takes the smallest plus one">
  <path class="d-edge" d="M 605 158 C 590 110, 540 110, 520 148"/>
  <path class="d-edge-accent" d="M 610 158 C 580 70, 360 70, 330 148"/>
  <path class="d-edge" d="M 615 158 C 560 0, 270 0, 240 148"/>
  <text class="d-sub" x="564" y="112" text-anchor="middle">minus 1</text>
  <text class="d-sub" x="470" y="82" text-anchor="middle">minus 3</text>
  <text class="d-sub" x="418" y="26" text-anchor="middle">minus 4</text>
  <rect class="d-box-muted" x="30" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="65" y="191" text-anchor="middle">0</text>
  <rect class="d-box" x="120" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="155" y="191" text-anchor="middle">1</text>
  <rect class="d-box" x="210" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="245" y="191" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="335" y="191" text-anchor="middle">1</text>
  <rect class="d-box" x="390" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="425" y="191" text-anchor="middle">1</text>
  <rect class="d-box" x="480" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="515" y="191" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="570" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="605" y="191" text-anchor="middle">2</text>
  <text class="d-sub" x="65" y="245" text-anchor="middle">a=0</text>
  <text class="d-sub" x="155" y="245" text-anchor="middle">a=1</text>
  <text class="d-sub" x="245" y="245" text-anchor="middle">a=2</text>
  <text class="d-sub" x="335" y="245" text-anchor="middle">a=3</text>
  <text class="d-sub" x="425" y="245" text-anchor="middle">a=4</text>
  <text class="d-sub" x="515" y="245" text-anchor="middle">a=5</text>
  <text class="d-sub" x="605" y="245" text-anchor="middle">a=6</text>
</svg>

\`dp[6] = 1 + min(dp[5], dp[3], dp[2]) = 1 + min(2, 1, 2) = 2\`, and the minimum came from the coin 3 (the accent arc). Following that choice back — 6 → 3 → 0 — gives the coins 3 + 3.

📌 **Interview term: Sentinel value** — a special value that means "impossible" inside the table. Using \`amount + 1\` works because no real answer can need more than \`amount\` coins (that would take more than \`amount\` coins of value at least 1).

📌 **Interview term: Bottom-up (tabulation)** — filling the table from the smallest subproblem upward, so every value you read is already computed. The other style, top-down memoization, is compared in [What is dynamic programming?](/interview-question/what-is-dynamic-programming).

## 5. The Code in JavaScript

The function below fills \`dp\` from 1 up to \`amount\`, and also records \`last[a]\`, the coin that gave the best value, so the actual coins can be rebuilt by walking back from \`amount\`.

~~~javascript
// Returns { count, used } — count is -1 when the amount cannot be made.
function coinChange(coins, amount) {
  const INF = amount + 1;                          // more coins than any real answer can need
  const dp = new Array(amount + 1).fill(INF);      // dp[a] = fewest coins that make a
  const last = new Array(amount + 1).fill(0);      // last[a] = coin used to reach a
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a && dp[a - c] + 1 < dp[a]) {
        dp[a] = dp[a - c] + 1;
        last[a] = c;
      }
    }
  }
  if (dp[amount] === INF) return { count: -1, used: [] };
  const used = [];
  for (let a = amount; a > 0; a -= last[a]) used.push(last[a]); // walk back through the choices
  return { count: dp[amount], used };
}
~~~

**What to point out in this code:**

- \`new Array(amount + 1).fill(INF)\` creates a dense array of numbers. (\`fill\` with an object or array would put the **same** object in every slot; with numbers it is safe.)
- \`INF = amount + 1\` keeps everything a small integer. \`Infinity\` also works in JavaScript (\`Infinity + 1 === Infinity\`), and is a common choice; just remember to turn it into −1 at the end.
- The test \`dp[a - c] + 1 < dp[a]\` handles impossible sub-amounts for free: \`INF + 1\` is never smaller than \`dp[a]\`, which is at most \`INF\`.
- \`for (const c of coins)\` iterates the values; \`for...in\` would iterate the **index strings** "0", "1", … — a classic JavaScript slip in loops like this.
- The function returns an object \`{ count, used }\` (shorthand properties); the caller reads \`r.count\` and \`r.used\`.

## 6. The Other Classic Version: Counting the Ways

A popular follow-up asks **how many different ways** there are to make the amount. The recurrence looks almost the same — \`ways[a] += ways[a - c]\`, with \`ways[0] = 1\` (one way to make 0: take nothing) — but the **order of the two loops** changes what is counted:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Coins outer loop counts each combination once, giving 4 ways to make 5 from 1, 2 and 5. Amount outer loop counts every order, giving 9">
  <rect class="d-box" x="20" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="170" y="62" text-anchor="middle">coin loop outside</text>
  <text class="d-sub" x="170" y="88" text-anchor="middle">1 + 2 + 2 counted once</text>
  <rect class="d-box" x="380" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="530" y="62" text-anchor="middle">amount loop outside</text>
  <text class="d-sub" x="530" y="88" text-anchor="middle">1+2+2, 2+1+2, 2+2+1 all counted</text>
  <rect class="d-box-accent" x="70" y="150" width="200" height="50" rx="10"/>
  <text class="d-text" x="170" y="181" text-anchor="middle">combinations: 4</text>
  <rect class="d-box-accent" x="430" y="150" width="200" height="50" rx="10"/>
  <text class="d-text" x="530" y="181" text-anchor="middle">orders: 9</text>
  <path class="d-edge" d="M 170 112 L 170 148"/>
  <path class="d-edge" d="M 530 112 L 530 148"/>
</svg>

~~~javascript
function countCombinations(coins, amount) {
  const ways = new Array(amount + 1).fill(0);
  ways[0] = 1;
  for (const c of coins) {                 // coin loop OUTSIDE: each multiset once
    for (let a = c; a <= amount; a++) ways[a] += ways[a - c];
  }
  return ways[amount];
}

function countOrders(coins, amount) {
  const ways = new Array(amount + 1).fill(0);
  ways[0] = 1;
  for (let a = 1; a <= amount; a++) {      // amount loop OUTSIDE: every order counted
    for (const c of coins) if (c <= a) ways[a] += ways[a - c];
  }
  return ways[amount];
}
~~~

Why the loop order matters: with the **coin loop outside**, by the time coin 2 is processed, coin 1 has already been fully used, so every pile is built in the order "all 1s, then all 2s, then all 5s" — each multiset of coins is generated exactly once. With the **amount loop outside**, every amount considers every coin as its last coin, so 1 + 2 + 2 and 2 + 1 + 2 are different paths and both are counted. Counting orders with coins \`{1, 2}\` is exactly the [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem) problem.

📌 **Interview term: Combinations vs permutations (in counting DP)** — combinations treat \`1+2+2\` and \`2+1+2\` as the same pile; permutations (orders) count them separately. The loop nesting chooses which.

These counts get big quickly: 8,577,828,731,901 orders for 100 cents in example 2. That is still below \`Number.MAX_SAFE_INTEGER\` (9,007,199,254,740,991), so a \`Number\` is exact here — but a slightly bigger amount would cross it, and then you need \`BigInt\` (\`ways[a] += ways[a - c]\` works the same on \`BigInt\` arrays filled with \`0n\`).

## 7. Top-Down vs Bottom-Up vs Plain Recursion

The same recurrence can be written as a recursive function. Without a cache it re-solves the same amounts again and again; with a cache (memoization) each amount is solved once. Example 2 counts the calls for coins \`[1, 2, 5]\` and amount 25:

| Version | Work for amount 25 | Why |
| :--- | :--- | :--- |
| Plain recursion | 924,876 calls | each call branches up to 3 ways; the tree grows exponentially |
| Memoized recursion | 71 calls | each amount is computed once; the rest are cache hits |
| Bottom-up table | 75 inner steps | 25 amounts × 3 coins |

In JavaScript a top-down version usually keeps a \`Map\` from amount to answer (as example 2 does). The call stack is limited too: the exact depth depends on the engine and frame size, so for large amounts the bottom-up loop is the safe choice. See [What is memoization?](/interview-question/what-is-memoization) for the general JavaScript pattern.

## 8. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22; the same file runs unchanged in the page). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — fewest coins, the coins used, and greedy failing** prints:

~~~text
coins [1, 2, 5], amount 11 -> 3 coins: 1 + 5 + 5
coins [2], amount 3 -> -1
coins [1], amount 0 -> 0 coins: (none)
coins [1, 3, 4], amount 6 -> 2 coins: 3 + 3
coins [186, 419, 83, 408], amount 6249 -> 20 coins: 186 + 186 + 186 + 419 + 419 + 419 + 419 + 419 + 83 + 83 + 83 + 83 + 408 + 408 + 408 + 408 + 408 + 408 + 408 + 408
greedy [1, 3, 4], amount 6 -> 3 coins: 4 + 1 + 1
greedy [5, 2], amount 6 -> -1
dp for [1, 3, 4], amounts 0..6: [0, 1, 2, 1, 1, 2, 2]
~~~

What to read from this:

- \`[1, 2, 5]\`, 11 → 3 coins (1 + 5 + 5). The coins come out in walk-back order: \`last[11]\` is 1, then \`last[10]\` is 5, then \`last[5]\` is 5.
- \`[2]\`, 3 → −1: no pile of 2s makes an odd amount. \`[1]\`, 0 → 0 coins: the base case.
- \`[186, 419, 83, 408]\`, 6249 → 20 coins: a case where no simple rule finds the answer.
- Greedy gives 3 coins on \`[1, 3, 4]\` where DP finds 2, and −1 on \`[5, 2]\` where 2 + 2 + 2 exists.
- The last line is the table drawn in section 4.

**Example 2 — the number of ways, and plain vs memoized recursion** prints:

~~~text
ways to make 5 from [1, 2, 5]: combinations 4, orders 9
ways to make 100 from [1, 5, 10, 25]: combinations 242, orders 8577828731901
ways to make 3 from [2]: combinations 0, orders 0
naive recursion, amount 25: answer 5 after 924876 calls
memoized recursion, amount 25: answer 5 after 71 calls
bottom-up table, amount 25: answer 5 after 75 inner steps
~~~

The 4 combinations to make 5 from \`[1, 2, 5]\` are 5, 2+2+1, 2+1+1+1 and 1+1+1+1+1; counting orders turns those into 9. For amount 25 the plain recursion made 924,876 calls while the memoized version made 71 and the table did 75 steps — the whole point of DP in three lines.

## 9. Complexity

Let A = amount and k = number of coins.

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential in A | O(A) stack | every call branches into up to k calls (924,876 calls for A = 25, k = 3) |
| Memoized recursion | O(A · k) | O(A) memo + O(A) stack | each amount is computed once with k look-backs |
| Bottom-up table (fewest coins) | O(A · k) | O(A) | A entries, each a min over k coins |
| Counting ways (either loop order) | O(A · k) | O(A) | same table shape, sums instead of mins |

📌 **Interview term: Pseudo-polynomial time** — a running time that is polynomial in the **numeric value** of an input (here A) rather than in its size in digits. Doubling the number of digits in A squares the work, so a huge A needs another method.

## 10. Edge Cases

- **Amount 0:** the answer is 0 coins; the table has one entry.
- **Unreachable amount:** \`[2]\` and 3. The sentinel survives to \`dp[amount]\`, so return −1.
- **A coin larger than the amount:** skipped by the \`c <= a\` test.
- **Coin 1 present:** every amount is reachable, and the answer is at most \`amount\`.
- **Unsorted coins or duplicate coins:** the DP does not care about order or duplicates; only greedy needs sorting.
- **Large amount:** the table has \`amount + 1\` entries — fine for 10^4 or 10^5, not for 10^9.

## Common Pitfalls

- **Using greedy.** It is wrong on \`[1, 3, 4]\` (3 coins instead of 2) and incomplete on \`[5, 2]\` (−1 instead of 3).
- **Sorting coins with \`coins.sort()\`.** The default sort compares strings: \`[5, 10, 25, 1].sort()\` gave \`1,10,25,5\` in Node. Pass \`(x, y) => y - x\` for descending numbers, and copy with \`[...coins]\` if you must not change the caller's array.
- **Forgetting to turn the sentinel (or \`Infinity\`) into −1** before returning.
- **Mixing up the loop order in the counting version.** Coin loop outside counts combinations; amount loop outside counts orders.
- **Counting ways past 2^53.** A \`Number\` silently rounds there; switch to \`BigInt\` or a modulus.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reject greedy:</strong> <span style="color:#f0e2c8;">Biggest-coin-first fails on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 3, 4]</code> for 6: it gives 4 + 1 + 1, but 3 + 3 is better. I need to consider every possible last coin.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[a]</code> is the fewest coins that make <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0] = 0</code>; everything else starts at the sentinel <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount + 1</code> (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Infinity</code>).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The recurrence:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[a] = 1 + min(dp[a - c])</code> over coins <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c &lt;= a</code>, filled for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> from 1 to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount</code>; return −1 if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[amount]</code> is still the sentinel.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(amount × coins) time and O(amount) space — pseudo-polynomial, because it depends on the value of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Array(amount + 1).fill(INF)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code> over the coins, and a numeric comparator if I ever sort them.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the coins themselves?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">last[a]</code>, the coin that improved <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[a]</code>, then walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a -= last[a]</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount</code> down to 0. For 11 with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 5]</code> that gives 1, 5, 5.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many ways are there to make the amount?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[0] = 1</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[a] += ways[a - c]</code>. With the coin loop outside you count combinations (4 for 5 from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 5]</code>), with the amount loop outside you count orders (9).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did your greedy sort go wrong at first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.prototype.sort()</code> without a comparator compares strings, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[5, 10, 25, 1]</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1,10,25,5</code>. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(x, y) =&gt; y - x</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the count of ways gets huge?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Orders for 100 cents is already 8,577,828,731,901, close to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number.MAX_SAFE_INTEGER</code>. Past that, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> or return the count modulo a prime.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if each coin can be used only once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then it is 0/1 knapsack: loop amounts <strong style="color:#ffca28;">downward</strong> inside the coin loop, so each coin is counted at most once.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Greedy algorithm** | Always take the choice that looks best now, never reconsider |
| **Optimal substructure** | An optimal answer is built from optimal answers to smaller subproblems |
| **Overlapping subproblems** | The same smaller question is asked many times, so caching pays off |
| **Sentinel value** | A special value (here \`amount + 1\`) meaning "impossible" inside the table |
| **Bottom-up (tabulation)** | Fill the table from the smallest subproblem upward |
| **Combinations vs permutations** | Whether \`1+2+2\` and \`2+1+2\` count as one way or two; chosen by loop order |
| **Pseudo-polynomial time** | Polynomial in the numeric value of the input, not in its number of digits |

---
**Conclusion:** Coin change is the textbook case where greedy breaks and dynamic programming does not. Define \`dp[a]\` as the fewest coins that make \`a\`, start from \`dp[0] = 0\`, and fill upward with \`dp[a] = 1 + min(dp[a - c])\`, using \`amount + 1\` as the "impossible" marker and turning it into −1 at the end — O(amount × coins) time and O(amount) space. Store the last coin per amount to rebuild the answer, and for the "number of ways" follow-up remember that the loop order picks combinations or orders. In JavaScript the table is one filled array, and a numeric sort comparator and the 2^53 limit are the traps to mention.`,
        examples: [
          {
            label: `Fewest coins: bottom-up DP, the coins used, and greedy failing`,
            code: `// Returns { count, used } — count is -1 when the amount cannot be made.
function coinChange(coins, amount) {
  const INF = amount + 1;                          // more coins than any real answer can need
  const dp = new Array(amount + 1).fill(INF);      // dp[a] = fewest coins that make a
  const last = new Array(amount + 1).fill(0);      // last[a] = coin used to reach a
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a && dp[a - c] + 1 < dp[a]) {
        dp[a] = dp[a - c] + 1;
        last[a] = c;
      }
    }
  }
  if (dp[amount] === INF) return { count: -1, used: [] };
  const used = [];
  for (let a = amount; a > 0; a -= last[a]) used.push(last[a]); // walk back through the choices
  return { count: dp[amount], used };
}

function greedy(coins, amount) {
  const used = [];
  const sorted = [...coins].sort((x, y) => y - x); // numeric sort, biggest coin first
  for (const c of sorted) {
    while (amount >= c) {
      amount -= c;
      used.push(c);
    }
  }
  return amount === 0 ? { count: used.length, used } : { count: -1, used: [] };
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

function show(label, r) {
  if (r.count === -1) return label + ' -> -1';
  return label + ' -> ' + r.count + ' coins: ' + (r.used.length ? r.used.join(' + ') : '(none)');
}

const cases = [[[1, 2, 5], 11], [[2], 3], [[1], 0], [[1, 3, 4], 6], [[186, 419, 83, 408], 6249]];
for (const [coins, amount] of cases) {
  console.log(show('coins ' + fmt(coins) + ', amount ' + amount, coinChange(coins, amount)));
}
console.log(show('greedy [1, 3, 4], amount 6', greedy([1, 3, 4], 6)));
console.log(show('greedy [5, 2], amount 6', greedy([5, 2], 6)));
const table = [];
for (let a = 0; a <= 6; a++) table.push(coinChange([1, 3, 4], a).count);
console.log('dp for [1, 3, 4], amounts 0..6: ' + fmt(table));`,
          },
          {
            label: `Number of ways: combinations vs orders, and naive vs memoized recursion`,
            code: `function countCombinations(coins, amount) {
  const ways = new Array(amount + 1).fill(0);
  ways[0] = 1;
  for (const c of coins) {                 // coin loop OUTSIDE: each multiset once
    for (let a = c; a <= amount; a++) ways[a] += ways[a - c];
  }
  return ways[amount];
}

function countOrders(coins, amount) {
  const ways = new Array(amount + 1).fill(0);
  ways[0] = 1;
  for (let a = 1; a <= amount; a++) {      // amount loop OUTSIDE: every order counted
    for (const c of coins) if (c <= a) ways[a] += ways[a - c];
  }
  return ways[amount];
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

let calls = 0;
const INF = 1e9;

function naive(coins, a) {
  calls++;
  if (a === 0) return 0;
  let best = INF;
  for (const c of coins) if (c <= a) best = Math.min(best, naive(coins, a - c) + 1);
  return best;
}

function memo(coins, a, cache) {
  calls++;
  if (a === 0) return 0;
  if (cache.has(a)) return cache.get(a);
  let best = INF;
  for (const c of coins) if (c <= a) best = Math.min(best, memo(coins, a - c, cache) + 1);
  cache.set(a, best);
  return best;
}

for (const [coins, amount] of [[[1, 2, 5], 5], [[1, 5, 10, 25], 100], [[2], 3]]) {
  console.log('ways to make ' + amount + ' from ' + fmt(coins) + ': combinations ' +
    countCombinations(coins, amount) + ', orders ' + countOrders(coins, amount));
}

calls = 0;
let r = naive([1, 2, 5], 25);
console.log('naive recursion, amount 25: answer ' + r + ' after ' + calls + ' calls');
calls = 0;
r = memo([1, 2, 5], 25, new Map());
console.log('memoized recursion, amount 25: answer ' + r + ' after ' + calls + ' calls');
let steps = 0;
const dp = new Array(26).fill(INF);
dp[0] = 0;
for (let a = 1; a <= 25; a++) {
  for (const c of [1, 2, 5]) {
    steps++;
    if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
  }
}
console.log('bottom-up table, amount 25: answer ' + dp[25] + ' after ' + steps + ' inner steps');`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given coin denominations and a target amount. Return the fewest coins needed to make that amount exactly, or -1 if it cannot be made; you have an unlimited supply of each coin. Explain why the obvious greedy idea does not work, then code a solution in Java."

**What a strong answer should cover:**
- Why greedy (always take the biggest coin) is wrong in general: with coins \`[1, 3, 4]\` and amount 6 it uses 4 + 1 + 1 = 3 coins, but 3 + 3 = 2 coins is optimal.
- The DP state and recurrence: \`dp[a]\` = fewest coins that make \`a\`; \`dp[0] = 0\`; \`dp[a] = 1 + min(dp[a - c])\` over coins \`c <= a\`; an "impossible" sentinel such as \`amount + 1\`.
- O(amount × number of coins) time and O(amount) space, and why it is pseudo-polynomial (it depends on the value of \`amount\`, not its digit count).
- Rebuilding the actual coins by storing the last coin used per amount, and the related "number of ways" variant, where the loop order decides whether you count combinations or orders.
- Java details: \`Arrays.fill(dp, amount + 1)\` rather than \`Integer.MAX_VALUE\` (adding 1 to it overflows to a negative number), \`long\` for the "number of ways" counts, and boxing cost if you memoize in a \`HashMap<Integer, Integer>\`.

**Clarifying questions expected:**
- Is the supply of each coin unlimited, and are all coin values positive?
- What should be returned when the amount cannot be made, and what for amount 0?
- Do you need the count only, or also which coins to use?

**Code / implementation expected:** Yes — a bottom-up Java function over amounts 0..amount; rebuilding the coins used is a common follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, arrays and a first idea of what dynamic programming is.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You run a vending machine in a country with strange coins: 1, 3 and 4 cents. A customer is owed 6 cents of change, and the machine wants to hand back as few coins as possible because coins are expensive to restock.

The obvious rule is the one a cashier uses: grab the biggest coin that fits, repeat. 4 fits, leaving 2. Then 1, then 1. Three coins. But a slightly smarter machine notices that **3 + 3** is also 6 — only two coins. The "biggest first" rule took a coin that looked great right now and paid for it later.

How would the smart machine find the best answer for **any** amount, without trying every possible pile of coins? It works its way up: "what is the best way to give 1 cent? 2 cents? 3 cents?", and each new amount reuses the answers it already worked out. To give 6 cents, the last coin is a 1, a 3 or a 4, so the answer is one coin plus the best answer for 5, 3 or 2 cents — all of which it already knows. That reuse of small answers is the coin change problem, and it is one of the cleanest examples of [dynamic programming](/interview-question/what-is-dynamic-programming).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the supply of each coin unlimited? | Unlimited coins gives the 1D recurrence below; "each coin at most once" is the [0/1 knapsack](/interview-question/how-do-you-solve-the-0-1-knapsack-problem) pattern instead |
| Are all coins positive, and can there be duplicates? | A 0 coin would make the recurrence loop on itself; duplicates are harmless |
| What should I return when the amount cannot be made? | The standard answer is −1, which needs an "impossible" marker inside the table |
| What is the answer for amount 0? | 0 coins — the base case of the whole table |
| Do you want the fewest coins, the coins themselves, or the number of ways? | Three related problems; the first two share one table, the third needs a different one |
| How large can the amount be? | The table has \`amount + 1\` entries, so a huge amount (say 10^9) needs a different idea |

## 3. Why Greedy Fails

📌 **Interview term: Greedy algorithm** — an algorithm that makes the choice that looks best right now and never reconsiders it. See [What is a greedy algorithm?](/interview-question/what-is-a-greedy-algorithm) for when that is safe.

Greedy is correct for some coin systems (the everyday 1, 5, 10, 25 cents is one of them), but not for all, and in an interview you are given arbitrary coins. Two failures, both printed by example 1:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="Making 6 from coins 1, 3 and 4. Greedy takes 4, 1, 1 for three coins. The optimal answer takes 3 and 3 for two coins">
  <text class="d-sub" x="20" y="62">greedy</text>
  <rect class="d-box-muted" x="130" y="30" width="80" height="50" rx="25"/>
  <text class="d-text" x="170" y="61" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="250" y="30" width="80" height="50" rx="25"/>
  <text class="d-text" x="290" y="61" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="370" y="30" width="80" height="50" rx="25"/>
  <text class="d-text" x="410" y="61" text-anchor="middle">1</text>
  <text class="d-text" x="520" y="62">3 coins</text>
  <text class="d-sub" x="20" y="172">optimal</text>
  <rect class="d-box-accent" x="130" y="140" width="80" height="50" rx="25"/>
  <text class="d-text" x="170" y="171" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="250" y="140" width="80" height="50" rx="25"/>
  <text class="d-text" x="290" y="171" text-anchor="middle">3</text>
  <text class="d-text" x="520" y="172">2 coins</text>
</svg>

- Coins \`[1, 3, 4]\`, amount 6: greedy gives 4 + 1 + 1 (3 coins); the best is 3 + 3 (2 coins). Greedy is **not optimal**.
- Coins \`[5, 2]\`, amount 6: greedy takes 5 and is stuck with 1 left, so it reports −1; but 2 + 2 + 2 works. Greedy is not even **complete** — it can miss a solution that exists.

So we need a method that considers every choice for the last coin, without the exponential cost of trying every pile.

## 4. The DP Idea

Look at any optimal way to make amount \`a\`. Its **last coin** is some coin \`c\`. Remove it, and what is left must be an optimal way to make \`a − c\` (if there were a better way to make \`a − c\`, adding \`c\` to it would beat our "optimal" answer for \`a\`). So:

~~~text
dp[0] = 0
dp[a] = 1 + min( dp[a - c] )   over every coin c with c <= a
dp[a] = impossible            if no coin gives a possible dp[a - c]
answer = dp[amount], or -1 if it is impossible
~~~

📌 **Interview term: Optimal substructure** — an optimal answer to the problem is built from optimal answers to smaller versions of it. Here: an optimal pile for \`a\` minus its last coin is an optimal pile for \`a − c\`.

📌 **Interview term: Overlapping subproblems** — the same smaller question is asked again and again. \`dp[3]\` is needed for amounts 4, 6 and 7 when the coins are 1, 3 and 4; the table computes it once.

Here is the table for coins \`[1, 3, 4]\` (these values are the last line of example 1). To fill \`dp[6]\`, look back by each coin:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="The dp table for coins 1, 3 and 4 over amounts 0 to 6. dp of 6 looks back at dp of 5, 3 and 2 and takes the smallest plus one">
  <path class="d-edge" d="M 605 158 C 590 110, 540 110, 520 148"/>
  <path class="d-edge-accent" d="M 610 158 C 580 70, 360 70, 330 148"/>
  <path class="d-edge" d="M 615 158 C 560 0, 270 0, 240 148"/>
  <text class="d-sub" x="564" y="112" text-anchor="middle">minus 1</text>
  <text class="d-sub" x="470" y="82" text-anchor="middle">minus 3</text>
  <text class="d-sub" x="418" y="26" text-anchor="middle">minus 4</text>
  <rect class="d-box-muted" x="30" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="65" y="191" text-anchor="middle">0</text>
  <rect class="d-box" x="120" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="155" y="191" text-anchor="middle">1</text>
  <rect class="d-box" x="210" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="245" y="191" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="335" y="191" text-anchor="middle">1</text>
  <rect class="d-box" x="390" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="425" y="191" text-anchor="middle">1</text>
  <rect class="d-box" x="480" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="515" y="191" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="570" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="605" y="191" text-anchor="middle">2</text>
  <text class="d-sub" x="65" y="245" text-anchor="middle">a=0</text>
  <text class="d-sub" x="155" y="245" text-anchor="middle">a=1</text>
  <text class="d-sub" x="245" y="245" text-anchor="middle">a=2</text>
  <text class="d-sub" x="335" y="245" text-anchor="middle">a=3</text>
  <text class="d-sub" x="425" y="245" text-anchor="middle">a=4</text>
  <text class="d-sub" x="515" y="245" text-anchor="middle">a=5</text>
  <text class="d-sub" x="605" y="245" text-anchor="middle">a=6</text>
</svg>

\`dp[6] = 1 + min(dp[5], dp[3], dp[2]) = 1 + min(2, 1, 2) = 2\`, and the minimum came from the coin 3 (the accent arc). Following that choice back — 6 → 3 → 0 — gives the coins 3 + 3.

📌 **Interview term: Sentinel value** — a special value that means "impossible" inside the table. Using \`amount + 1\` works because no real answer can need more than \`amount\` coins (that would take more than \`amount\` coins of value at least 1).

📌 **Interview term: Bottom-up (tabulation)** — filling the table from the smallest subproblem upward, so every value you read is already computed. The other style, top-down memoization, is compared in [What is dynamic programming?](/interview-question/what-is-dynamic-programming).

## 5. The Code in Java

The function below fills \`dp\` from 1 up to \`amount\`, and also records \`last[a]\`, the coin that gave the best value, so the actual coins can be rebuilt by walking back from \`amount\`.

~~~java
// Returns the fewest coins (or -1) and fills \`used\` with the coins chosen.
static int coinChange(int[] coins, int amount, List<Integer> used) {
    int INF = amount + 1;                  // more coins than any real answer can need
    int[] dp = new int[amount + 1];        // dp[a] = fewest coins that make a
    int[] last = new int[amount + 1];      // last[a] = coin used to reach a
    Arrays.fill(dp, INF);
    dp[0] = 0;
    for (int a = 1; a <= amount; a++) {
        for (int c : coins) {
            if (c <= a && dp[a - c] + 1 < dp[a]) {
                dp[a] = dp[a - c] + 1;
                last[a] = c;
            }
        }
    }
    if (dp[amount] == INF) return -1;
    for (int a = amount; a > 0; a -= last[a]) used.add(last[a]); // walk back through the choices
    return dp[amount];
}
~~~

**What to point out in this code:**

- \`Arrays.fill(dp, INF)\` with \`INF = amount + 1\`. **Do not** use \`Integer.MAX_VALUE\` as the sentinel: \`dp[a - c] + 1\` would overflow to \`Integer.MIN_VALUE\` (−2147483648), which is smaller than everything and silently wins every \`min\`.
- \`int[]\` arrays are zero-initialised by Java, so \`last\` needs no fill, and \`dp[0] = 0\` is set explicitly for clarity after the fill.
- The coins chosen are returned through a \`List<Integer>\` parameter that the caller passes in, because Java methods return one value; a small \`record\` would be the other clean option in Java 17+.
- \`for (int c : coins)\` is the enhanced for loop over a primitive \`int[]\`, so there is no boxing in the hot loop. Boxing only appears in the result list.
- The walk-back loop \`for (int a = amount; a > 0; a -= last[a])\` terminates because every \`last[a]\` is a positive coin.

## 6. The Other Classic Version: Counting the Ways

A popular follow-up asks **how many different ways** there are to make the amount. The recurrence looks almost the same — \`ways[a] += ways[a - c]\`, with \`ways[0] = 1\` (one way to make 0: take nothing) — but the **order of the two loops** changes what is counted:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Coins outer loop counts each combination once, giving 4 ways to make 5 from 1, 2 and 5. Amount outer loop counts every order, giving 9">
  <rect class="d-box" x="20" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="170" y="62" text-anchor="middle">coin loop outside</text>
  <text class="d-sub" x="170" y="88" text-anchor="middle">1 + 2 + 2 counted once</text>
  <rect class="d-box" x="380" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="530" y="62" text-anchor="middle">amount loop outside</text>
  <text class="d-sub" x="530" y="88" text-anchor="middle">1+2+2, 2+1+2, 2+2+1 all counted</text>
  <rect class="d-box-accent" x="70" y="150" width="200" height="50" rx="10"/>
  <text class="d-text" x="170" y="181" text-anchor="middle">combinations: 4</text>
  <rect class="d-box-accent" x="430" y="150" width="200" height="50" rx="10"/>
  <text class="d-text" x="530" y="181" text-anchor="middle">orders: 9</text>
  <path class="d-edge" d="M 170 112 L 170 148"/>
  <path class="d-edge" d="M 530 112 L 530 148"/>
</svg>

~~~java
static long countCombinations(int[] coins, int amount) {
    long[] ways = new long[amount + 1];
    ways[0] = 1;
    for (int c : coins)                    // coin loop OUTSIDE: each multiset once
        for (int a = c; a <= amount; a++) ways[a] += ways[a - c];
    return ways[amount];
}

static long countOrders(int[] coins, int amount) {
    long[] ways = new long[amount + 1];
    ways[0] = 1;
    for (int a = 1; a <= amount; a++)      // amount loop OUTSIDE: every order counted
        for (int c : coins) if (c <= a) ways[a] += ways[a - c];
    return ways[amount];
}
~~~

Why the loop order matters: with the **coin loop outside**, by the time coin 2 is processed, coin 1 has already been fully used, so every pile is built in the order "all 1s, then all 2s, then all 5s" — each multiset of coins is generated exactly once. With the **amount loop outside**, every amount considers every coin as its last coin, so 1 + 2 + 2 and 2 + 1 + 2 are different paths and both are counted. Counting orders with coins \`{1, 2}\` is exactly the [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem) problem.

📌 **Interview term: Combinations vs permutations (in counting DP)** — combinations treat \`1+2+2\` and \`2+1+2\` as the same pile; permutations (orders) count them separately. The loop nesting chooses which.

These counts get big quickly: 8,577,828,731,901 orders for 100 cents in example 2, far beyond \`int\`'s 2,147,483,647, which is why \`ways\` is a \`long[]\`. Beyond 2^63 − 1 you would need \`BigInteger\` or the answer modulo some prime.

## 7. Top-Down vs Bottom-Up vs Plain Recursion

The same recurrence can be written as a recursive function. Without a cache it re-solves the same amounts again and again; with a cache (memoization) each amount is solved once. Example 2 counts the calls for coins \`[1, 2, 5]\` and amount 25:

| Version | Work for amount 25 | Why |
| :--- | :--- | :--- |
| Plain recursion | 924,876 calls | each call branches up to 3 ways; the tree grows exponentially |
| Memoized recursion | 71 calls | each amount is computed once; the rest are cache hits |
| Bottom-up table | 75 inner steps | 25 amounts × 3 coins |

In Java a top-down version keeps an \`int[]\` memo (best) or a \`HashMap<Integer, Integer>\` (as example 2 does, which boxes every key and value). Deep recursion can end in \`StackOverflowError\`; the depth you can reach depends on the thread stack size (\`-Xss\`), so for large amounts the bottom-up loop is the safe choice.

## 8. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (JDK 21, compiled as Java 17+ source). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — fewest coins, the coins used, and greedy failing** prints:

~~~text
coins [1, 2, 5], amount 11 -> 3 coins: 1 + 5 + 5
coins [2], amount 3 -> -1
coins [1], amount 0 -> 0 coins: (none)
coins [1, 3, 4], amount 6 -> 2 coins: 3 + 3
coins [186, 419, 83, 408], amount 6249 -> 20 coins: 186 + 186 + 186 + 419 + 419 + 419 + 419 + 419 + 83 + 83 + 83 + 83 + 408 + 408 + 408 + 408 + 408 + 408 + 408 + 408
greedy [1, 3, 4], amount 6 -> 3 coins: 4 + 1 + 1
greedy [5, 2], amount 6 -> -1
dp for [1, 3, 4], amounts 0..6: [0, 1, 2, 1, 1, 2, 2]
~~~

What to read from this:

- \`[1, 2, 5]\`, 11 → 3 coins (1 + 5 + 5). The coins come out in walk-back order: \`last[11]\` is 1, then \`last[10]\` is 5, then \`last[5]\` is 5.
- \`[2]\`, 3 → −1: no pile of 2s makes an odd amount. \`[1]\`, 0 → 0 coins: the base case.
- \`[186, 419, 83, 408]\`, 6249 → 20 coins: a case where no simple rule finds the answer.
- Greedy gives 3 coins on \`[1, 3, 4]\` where DP finds 2, and −1 on \`[5, 2]\` where 2 + 2 + 2 exists.
- The last line is the table drawn in section 4.

**Example 2 — the number of ways, and plain vs memoized recursion** prints:

~~~text
ways to make 5 from [1, 2, 5]: combinations 4, orders 9
ways to make 100 from [1, 5, 10, 25]: combinations 242, orders 8577828731901
ways to make 3 from [2]: combinations 0, orders 0
naive recursion, amount 25: answer 5 after 924876 calls
memoized recursion, amount 25: answer 5 after 71 calls
bottom-up table, amount 25: answer 5 after 75 inner steps
~~~

The 4 combinations to make 5 from \`[1, 2, 5]\` are 5, 2+2+1, 2+1+1+1 and 1+1+1+1+1; counting orders turns those into 9. For amount 25 the plain recursion made 924,876 calls while the memoized version made 71 and the table did 75 steps — the whole point of DP in three lines.

## 9. Complexity

Let A = amount and k = number of coins.

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential in A | O(A) stack | every call branches into up to k calls (924,876 calls for A = 25, k = 3) |
| Memoized recursion | O(A · k) | O(A) memo + O(A) stack | each amount is computed once with k look-backs |
| Bottom-up table (fewest coins) | O(A · k) | O(A) | A entries, each a min over k coins |
| Counting ways (either loop order) | O(A · k) | O(A) | same table shape, sums instead of mins |

📌 **Interview term: Pseudo-polynomial time** — a running time that is polynomial in the **numeric value** of an input (here A) rather than in its size in digits. Doubling the number of digits in A squares the work, so a huge A needs another method.

## 10. Edge Cases

- **Amount 0:** the answer is 0 coins; the table has one entry.
- **Unreachable amount:** \`[2]\` and 3. The sentinel survives to \`dp[amount]\`, so return −1.
- **A coin larger than the amount:** skipped by the \`c <= a\` test.
- **Coin 1 present:** every amount is reachable, and the answer is at most \`amount\`.
- **Unsorted coins or duplicate coins:** the DP does not care about order or duplicates; only greedy needs sorting.
- **Large amount:** the table has \`amount + 1\` entries — fine for 10^4 or 10^5, not for 10^9.

## Common Pitfalls

- **Using greedy.** It is wrong on \`[1, 3, 4]\` (3 coins instead of 2) and incomplete on \`[5, 2]\` (−1 instead of 3).
- **\`Integer.MAX_VALUE\` as the sentinel.** \`Integer.MAX_VALUE + 1\` wraps to −2147483648, which then wins every \`Math.min\`. Use \`amount + 1\`.
- **Counting ways in an \`int[]\`.** Counts overflow quickly (8,577,828,731,901 for 100 cents in orders); use \`long[]\` or a modulus.
- **Comparing boxed memo values with \`==\`.** \`Integer\` objects outside the small cached range (−128 to 127 by default) are different objects; compare with \`.equals\` or unbox to \`int\` first, as example 2 does with \`Integer hit\` then \`return hit\`.
- **Mixing up the loop order in the counting version.** Coin loop outside counts combinations; amount loop outside counts orders.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reject greedy:</strong> <span style="color:#f0e2c8;">Biggest-coin-first fails on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 3, 4]</code> for 6: it gives 4 + 1 + 1, but 3 + 3 is better. I need to consider every possible last coin.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[a]</code> is the fewest coins that make <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0] = 0</code>; everything else starts at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount + 1</code> via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.fill</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The recurrence:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[a] = 1 + min(dp[a - c])</code> over coins <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c &lt;= a</code>, filled for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> from 1 to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount</code>; return −1 if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[amount]</code> is still the sentinel.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(amount × coins) time and O(amount) space — pseudo-polynomial, because it depends on the value of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code> as the sentinel, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+ 1</code> wraps negative; and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long[]</code> when counting ways.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the coins themselves?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">last[a]</code>, the coin that improved <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[a]</code>, then walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a -= last[a]</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount</code> down to 0. For 11 with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 5]</code> that gives 1, 5, 5.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many ways are there to make the amount?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[0] = 1</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[a] += ways[a - c]</code>. With the coin loop outside you count combinations (4 for 5 from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 5]</code>), with the amount loop outside you count orders (9).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not Integer.MAX_VALUE for impossible?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[a - c] + 1</code> would overflow to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MIN_VALUE</code>, the smallest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, and win every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount + 1</code> cannot overflow and is still bigger than any real answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you memoize with a HashMap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> memo is better: no boxing, no hashing. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Integer, Integer&gt;</code> works but boxes each key and value, and deep recursion can still throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if each coin can be used only once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then it is 0/1 knapsack: loop amounts <strong style="color:#ffca28;">downward</strong> inside the coin loop, so each coin is counted at most once.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Greedy algorithm** | Always take the choice that looks best now, never reconsider |
| **Optimal substructure** | An optimal answer is built from optimal answers to smaller subproblems |
| **Overlapping subproblems** | The same smaller question is asked many times, so caching pays off |
| **Sentinel value** | A special value (here \`amount + 1\`) meaning "impossible" inside the table |
| **Bottom-up (tabulation)** | Fill the table from the smallest subproblem upward |
| **Combinations vs permutations** | Whether \`1+2+2\` and \`2+1+2\` count as one way or two; chosen by loop order |
| **Pseudo-polynomial time** | Polynomial in the numeric value of the input, not in its number of digits |

---
**Conclusion:** Coin change is the textbook case where greedy breaks and dynamic programming does not. Define \`dp[a]\` as the fewest coins that make \`a\`, start from \`dp[0] = 0\`, and fill upward with \`dp[a] = 1 + min(dp[a - c])\`, using \`amount + 1\` as the "impossible" marker and turning it into −1 at the end — O(amount × coins) time and O(amount) space. Store the last coin per amount to rebuild the answer, and for the "number of ways" follow-up remember that the loop order picks combinations or orders. In Java the traps are an \`Integer.MAX_VALUE\` sentinel that overflows and \`int\` counts that are too small.`,
        examples: [
          {
            label: `Fewest coins: bottom-up DP, the coins used, and greedy failing`,
            code: `import java.util.*;

public class Main {
    // Returns the fewest coins (or -1) and fills \`used\` with the coins chosen.
    static int coinChange(int[] coins, int amount, List<Integer> used) {
        int INF = amount + 1;                  // more coins than any real answer can need
        int[] dp = new int[amount + 1];        // dp[a] = fewest coins that make a
        int[] last = new int[amount + 1];      // last[a] = coin used to reach a
        Arrays.fill(dp, INF);
        dp[0] = 0;
        for (int a = 1; a <= amount; a++) {
            for (int c : coins) {
                if (c <= a && dp[a - c] + 1 < dp[a]) {
                    dp[a] = dp[a - c] + 1;
                    last[a] = c;
                }
            }
        }
        if (dp[amount] == INF) return -1;
        for (int a = amount; a > 0; a -= last[a]) used.add(last[a]); // walk back through the choices
        return dp[amount];
    }

    static int greedy(int[] coins, int amount, List<Integer> used) {
        int[] sorted = coins.clone();
        Arrays.sort(sorted);                   // ascending, so walk it from the end
        for (int i = sorted.length - 1; i >= 0; i--) {
            while (amount >= sorted[i]) {
                amount -= sorted[i];
                used.add(sorted[i]);
            }
        }
        if (amount != 0) { used.clear(); return -1; }
        return used.size();
    }

    static String fmt(int[] xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < xs.length; i++) sb.append(i > 0 ? ", " : "").append(xs[i]);
        return sb.append("]").toString();
    }

    static String show(String label, int n, List<Integer> used) {
        if (n == -1) return label + " -> -1";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < used.size(); i++) sb.append(i > 0 ? " + " : "").append(used.get(i));
        return label + " -> " + n + " coins: " + (used.isEmpty() ? "(none)" : sb.toString());
    }

    public static void main(String[] args) {
        int[][] coinSets = {{1, 2, 5}, {2}, {1}, {1, 3, 4}, {186, 419, 83, 408}};
        int[] amounts = {11, 3, 0, 6, 6249};
        for (int i = 0; i < amounts.length; i++) {
            List<Integer> used = new ArrayList<>();
            int n = coinChange(coinSets[i], amounts[i], used);
            System.out.println(show("coins " + fmt(coinSets[i]) + ", amount " + amounts[i], n, used));
        }
        List<Integer> g1 = new ArrayList<>();
        int n1 = greedy(new int[]{1, 3, 4}, 6, g1);
        System.out.println(show("greedy [1, 3, 4], amount 6", n1, g1));
        List<Integer> g2 = new ArrayList<>();
        int n2 = greedy(new int[]{5, 2}, 6, g2);
        System.out.println(show("greedy [5, 2], amount 6", n2, g2));
        int[] table = new int[7];
        for (int a = 0; a <= 6; a++) table[a] = coinChange(new int[]{1, 3, 4}, a, new ArrayList<>());
        System.out.println("dp for [1, 3, 4], amounts 0..6: " + fmt(table));
    }
}`,
          },
          {
            label: `Number of ways: combinations vs orders, and naive vs memoized recursion`,
            code: `import java.util.*;

public class Main {
    static long countCombinations(int[] coins, int amount) {
        long[] ways = new long[amount + 1];
        ways[0] = 1;
        for (int c : coins)                    // coin loop OUTSIDE: each multiset once
            for (int a = c; a <= amount; a++) ways[a] += ways[a - c];
        return ways[amount];
    }

    static long countOrders(int[] coins, int amount) {
        long[] ways = new long[amount + 1];
        ways[0] = 1;
        for (int a = 1; a <= amount; a++)      // amount loop OUTSIDE: every order counted
            for (int c : coins) if (c <= a) ways[a] += ways[a - c];
        return ways[amount];
    }

    static long calls = 0;
    static final int INF = 1_000_000_000;

    static String fmt(int[] xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < xs.length; i++) sb.append(i > 0 ? ", " : "").append(xs[i]);
        return sb.append("]").toString();
    }

    static int naive(int[] coins, int a) {
        calls++;
        if (a == 0) return 0;
        int best = INF;
        for (int c : coins) if (c <= a) best = Math.min(best, naive(coins, a - c) + 1);
        return best;
    }

    static int memo(int[] coins, int a, Map<Integer, Integer> cache) {
        calls++;
        if (a == 0) return 0;
        Integer hit = cache.get(a);
        if (hit != null) return hit;
        int best = INF;
        for (int c : coins) if (c <= a) best = Math.min(best, memo(coins, a - c, cache) + 1);
        cache.put(a, best);
        return best;
    }

    public static void main(String[] args) {
        int[][] coinSets = {{1, 2, 5}, {1, 5, 10, 25}, {2}};
        int[] amounts = {5, 100, 3};
        for (int i = 0; i < 3; i++) {
            System.out.println("ways to make " + amounts[i] + " from " + fmt(coinSets[i]) + ": combinations "
                + countCombinations(coinSets[i], amounts[i]) + ", orders " + countOrders(coinSets[i], amounts[i]));
        }
        int[] coins = {1, 2, 5};
        calls = 0;
        int r = naive(coins, 25);
        System.out.println("naive recursion, amount 25: answer " + r + " after " + calls + " calls");
        calls = 0;
        r = memo(coins, 25, new HashMap<>());
        System.out.println("memoized recursion, amount 25: answer " + r + " after " + calls + " calls");
        int steps = 0;
        int[] dp = new int[26];
        Arrays.fill(dp, INF);
        dp[0] = 0;
        for (int a = 1; a <= 25; a++) {
            for (int c : coins) {
                steps++;
                if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
            }
        }
        System.out.println("bottom-up table, amount 25: answer " + dp[25] + " after " + steps + " inner steps");
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given coin denominations and a target amount. Return the fewest coins needed to make that amount exactly, or -1 if it cannot be made; you have an unlimited supply of each coin. Explain why the obvious greedy idea does not work, then code a solution in C++."

**What a strong answer should cover:**
- Why greedy (always take the biggest coin) is wrong in general: with coins \`[1, 3, 4]\` and amount 6 it uses 4 + 1 + 1 = 3 coins, but 3 + 3 = 2 coins is optimal.
- The DP state and recurrence: \`dp[a]\` = fewest coins that make \`a\`; \`dp[0] = 0\`; \`dp[a] = 1 + min(dp[a - c])\` over coins \`c <= a\`; an "impossible" sentinel such as \`amount + 1\`.
- O(amount × number of coins) time and O(amount) space, and why it is pseudo-polynomial (it depends on the value of \`amount\`, not its digit count).
- Rebuilding the actual coins by storing the last coin used per amount, and the related "number of ways" variant, where the loop order decides whether you count combinations or orders.
- C++ details: \`std::vector<int> dp(amount + 1, amount + 1)\` rather than \`INT_MAX\` (adding 1 to it is signed overflow, which is undefined behaviour), \`long long\` for the "number of ways" counts, and \`std::greater<int>()\` to sort coins descending.

**Clarifying questions expected:**
- Is the supply of each coin unlimited, and are all coin values positive?
- What should be returned when the amount cannot be made, and what for amount 0?
- Do you need the count only, or also which coins to use?

**Code / implementation expected:** Yes — a bottom-up C++ function over amounts 0..amount; rebuilding the coins used is a common follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, arrays and a first idea of what dynamic programming is.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You run a vending machine in a country with strange coins: 1, 3 and 4 cents. A customer is owed 6 cents of change, and the machine wants to hand back as few coins as possible because coins are expensive to restock.

The obvious rule is the one a cashier uses: grab the biggest coin that fits, repeat. 4 fits, leaving 2. Then 1, then 1. Three coins. But a slightly smarter machine notices that **3 + 3** is also 6 — only two coins. The "biggest first" rule took a coin that looked great right now and paid for it later.

How would the smart machine find the best answer for **any** amount, without trying every possible pile of coins? It works its way up: "what is the best way to give 1 cent? 2 cents? 3 cents?", and each new amount reuses the answers it already worked out. To give 6 cents, the last coin is a 1, a 3 or a 4, so the answer is one coin plus the best answer for 5, 3 or 2 cents — all of which it already knows. That reuse of small answers is the coin change problem, and it is one of the cleanest examples of [dynamic programming](/interview-question/what-is-dynamic-programming).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the supply of each coin unlimited? | Unlimited coins gives the 1D recurrence below; "each coin at most once" is the [0/1 knapsack](/interview-question/how-do-you-solve-the-0-1-knapsack-problem) pattern instead |
| Are all coins positive, and can there be duplicates? | A 0 coin would make the recurrence loop on itself; duplicates are harmless |
| What should I return when the amount cannot be made? | The standard answer is −1, which needs an "impossible" marker inside the table |
| What is the answer for amount 0? | 0 coins — the base case of the whole table |
| Do you want the fewest coins, the coins themselves, or the number of ways? | Three related problems; the first two share one table, the third needs a different one |
| How large can the amount be? | The table has \`amount + 1\` entries, so a huge amount (say 10^9) needs a different idea |

## 3. Why Greedy Fails

📌 **Interview term: Greedy algorithm** — an algorithm that makes the choice that looks best right now and never reconsiders it. See [What is a greedy algorithm?](/interview-question/what-is-a-greedy-algorithm) for when that is safe.

Greedy is correct for some coin systems (the everyday 1, 5, 10, 25 cents is one of them), but not for all, and in an interview you are given arbitrary coins. Two failures, both printed by example 1:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="Making 6 from coins 1, 3 and 4. Greedy takes 4, 1, 1 for three coins. The optimal answer takes 3 and 3 for two coins">
  <text class="d-sub" x="20" y="62">greedy</text>
  <rect class="d-box-muted" x="130" y="30" width="80" height="50" rx="25"/>
  <text class="d-text" x="170" y="61" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="250" y="30" width="80" height="50" rx="25"/>
  <text class="d-text" x="290" y="61" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="370" y="30" width="80" height="50" rx="25"/>
  <text class="d-text" x="410" y="61" text-anchor="middle">1</text>
  <text class="d-text" x="520" y="62">3 coins</text>
  <text class="d-sub" x="20" y="172">optimal</text>
  <rect class="d-box-accent" x="130" y="140" width="80" height="50" rx="25"/>
  <text class="d-text" x="170" y="171" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="250" y="140" width="80" height="50" rx="25"/>
  <text class="d-text" x="290" y="171" text-anchor="middle">3</text>
  <text class="d-text" x="520" y="172">2 coins</text>
</svg>

- Coins \`[1, 3, 4]\`, amount 6: greedy gives 4 + 1 + 1 (3 coins); the best is 3 + 3 (2 coins). Greedy is **not optimal**.
- Coins \`[5, 2]\`, amount 6: greedy takes 5 and is stuck with 1 left, so it reports −1; but 2 + 2 + 2 works. Greedy is not even **complete** — it can miss a solution that exists.

So we need a method that considers every choice for the last coin, without the exponential cost of trying every pile.

## 4. The DP Idea

Look at any optimal way to make amount \`a\`. Its **last coin** is some coin \`c\`. Remove it, and what is left must be an optimal way to make \`a − c\` (if there were a better way to make \`a − c\`, adding \`c\` to it would beat our "optimal" answer for \`a\`). So:

~~~text
dp[0] = 0
dp[a] = 1 + min( dp[a - c] )   over every coin c with c <= a
dp[a] = impossible            if no coin gives a possible dp[a - c]
answer = dp[amount], or -1 if it is impossible
~~~

📌 **Interview term: Optimal substructure** — an optimal answer to the problem is built from optimal answers to smaller versions of it. Here: an optimal pile for \`a\` minus its last coin is an optimal pile for \`a − c\`.

📌 **Interview term: Overlapping subproblems** — the same smaller question is asked again and again. \`dp[3]\` is needed for amounts 4, 6 and 7 when the coins are 1, 3 and 4; the table computes it once.

Here is the table for coins \`[1, 3, 4]\` (these values are the last line of example 1). To fill \`dp[6]\`, look back by each coin:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="The dp table for coins 1, 3 and 4 over amounts 0 to 6. dp of 6 looks back at dp of 5, 3 and 2 and takes the smallest plus one">
  <path class="d-edge" d="M 605 158 C 590 110, 540 110, 520 148"/>
  <path class="d-edge-accent" d="M 610 158 C 580 70, 360 70, 330 148"/>
  <path class="d-edge" d="M 615 158 C 560 0, 270 0, 240 148"/>
  <text class="d-sub" x="564" y="112" text-anchor="middle">minus 1</text>
  <text class="d-sub" x="470" y="82" text-anchor="middle">minus 3</text>
  <text class="d-sub" x="418" y="26" text-anchor="middle">minus 4</text>
  <rect class="d-box-muted" x="30" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="65" y="191" text-anchor="middle">0</text>
  <rect class="d-box" x="120" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="155" y="191" text-anchor="middle">1</text>
  <rect class="d-box" x="210" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="245" y="191" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="335" y="191" text-anchor="middle">1</text>
  <rect class="d-box" x="390" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="425" y="191" text-anchor="middle">1</text>
  <rect class="d-box" x="480" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="515" y="191" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="570" y="160" width="70" height="50" rx="8"/>
  <text class="d-text" x="605" y="191" text-anchor="middle">2</text>
  <text class="d-sub" x="65" y="245" text-anchor="middle">a=0</text>
  <text class="d-sub" x="155" y="245" text-anchor="middle">a=1</text>
  <text class="d-sub" x="245" y="245" text-anchor="middle">a=2</text>
  <text class="d-sub" x="335" y="245" text-anchor="middle">a=3</text>
  <text class="d-sub" x="425" y="245" text-anchor="middle">a=4</text>
  <text class="d-sub" x="515" y="245" text-anchor="middle">a=5</text>
  <text class="d-sub" x="605" y="245" text-anchor="middle">a=6</text>
</svg>

\`dp[6] = 1 + min(dp[5], dp[3], dp[2]) = 1 + min(2, 1, 2) = 2\`, and the minimum came from the coin 3 (the accent arc). Following that choice back — 6 → 3 → 0 — gives the coins 3 + 3.

📌 **Interview term: Sentinel value** — a special value that means "impossible" inside the table. Using \`amount + 1\` works because no real answer can need more than \`amount\` coins (that would take more than \`amount\` coins of value at least 1).

📌 **Interview term: Bottom-up (tabulation)** — filling the table from the smallest subproblem upward, so every value you read is already computed. The other style, top-down memoization, is compared in [What is dynamic programming?](/interview-question/what-is-dynamic-programming).

## 5. The Code in C++

The function below fills \`dp\` from 1 up to \`amount\`, and also records \`last[a]\`, the coin that gave the best value, so the actual coins can be rebuilt by walking back from \`amount\`.

~~~cpp
// Returns the fewest coins (or -1) and fills \`used\` with the coins chosen.
int coinChange(const std::vector<int>& coins, int amount, std::vector<int>& used) {
    const int INF = amount + 1;                 // more coins than any real answer can need
    std::vector<int> dp(amount + 1, INF);       // dp[a] = fewest coins that make a
    std::vector<int> last(amount + 1, 0);       // last[a] = coin used to reach a
    dp[0] = 0;
    for (int a = 1; a <= amount; a++) {
        for (int c : coins) {
            if (c <= a && dp[a - c] + 1 < dp[a]) {
                dp[a] = dp[a - c] + 1;
                last[a] = c;
            }
        }
    }
    if (dp[amount] == INF) return -1;
    for (int a = amount; a > 0; a -= last[a]) used.push_back(last[a]); // walk back through the choices
    return dp[amount];
}
~~~

**What to point out in this code:**

- \`std::vector<int> dp(amount + 1, INF)\` sizes and fills in one constructor call. **Do not** use \`INT_MAX\` as the sentinel: \`dp[a - c] + 1\` would be signed overflow, which is undefined behaviour in C++, not a guaranteed wrap.
- The coins vector is taken by \`const std::vector<int>&\` so it is not copied, and the chosen coins are written to \`used\`, passed by non-const reference.
- \`for (int c : coins)\` is a range-based for loop over the values.
- The walk-back loop \`for (int a = amount; a > 0; a -= last[a])\` terminates because every \`last[a]\` is a positive coin.
- In \`greedy\`, the coins vector is taken **by value** on purpose: the function sorts its own copy with \`std::sort(..., std::greater<int>())\` without changing the caller's vector.

## 6. The Other Classic Version: Counting the Ways

A popular follow-up asks **how many different ways** there are to make the amount. The recurrence looks almost the same — \`ways[a] += ways[a - c]\`, with \`ways[0] = 1\` (one way to make 0: take nothing) — but the **order of the two loops** changes what is counted:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Coins outer loop counts each combination once, giving 4 ways to make 5 from 1, 2 and 5. Amount outer loop counts every order, giving 9">
  <rect class="d-box" x="20" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="170" y="62" text-anchor="middle">coin loop outside</text>
  <text class="d-sub" x="170" y="88" text-anchor="middle">1 + 2 + 2 counted once</text>
  <rect class="d-box" x="380" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="530" y="62" text-anchor="middle">amount loop outside</text>
  <text class="d-sub" x="530" y="88" text-anchor="middle">1+2+2, 2+1+2, 2+2+1 all counted</text>
  <rect class="d-box-accent" x="70" y="150" width="200" height="50" rx="10"/>
  <text class="d-text" x="170" y="181" text-anchor="middle">combinations: 4</text>
  <rect class="d-box-accent" x="430" y="150" width="200" height="50" rx="10"/>
  <text class="d-text" x="530" y="181" text-anchor="middle">orders: 9</text>
  <path class="d-edge" d="M 170 112 L 170 148"/>
  <path class="d-edge" d="M 530 112 L 530 148"/>
</svg>

~~~cpp
long long countCombinations(const std::vector<int>& coins, int amount) {
    std::vector<long long> ways(amount + 1, 0);
    ways[0] = 1;
    for (int c : coins)                         // coin loop OUTSIDE: each multiset once
        for (int a = c; a <= amount; a++) ways[a] += ways[a - c];
    return ways[amount];
}

long long countOrders(const std::vector<int>& coins, int amount) {
    std::vector<long long> ways(amount + 1, 0);
    ways[0] = 1;
    for (int a = 1; a <= amount; a++)           // amount loop OUTSIDE: every order counted
        for (int c : coins) if (c <= a) ways[a] += ways[a - c];
    return ways[amount];
}
~~~

Why the loop order matters: with the **coin loop outside**, by the time coin 2 is processed, coin 1 has already been fully used, so every pile is built in the order "all 1s, then all 2s, then all 5s" — each multiset of coins is generated exactly once. With the **amount loop outside**, every amount considers every coin as its last coin, so 1 + 2 + 2 and 2 + 1 + 2 are different paths and both are counted. Counting orders with coins \`{1, 2}\` is exactly the [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem) problem.

📌 **Interview term: Combinations vs permutations (in counting DP)** — combinations treat \`1+2+2\` and \`2+1+2\` as the same pile; permutations (orders) count them separately. The loop nesting chooses which.

These counts get big quickly: 8,577,828,731,901 orders for 100 cents in example 2, far beyond a 32-bit \`int\`, which is why \`ways\` is a \`std::vector<long long>\`. Many interview versions ask for the count modulo 1,000,000,007 to keep it in range.

## 7. Top-Down vs Bottom-Up vs Plain Recursion

The same recurrence can be written as a recursive function. Without a cache it re-solves the same amounts again and again; with a cache (memoization) each amount is solved once. Example 2 counts the calls for coins \`[1, 2, 5]\` and amount 25:

| Version | Work for amount 25 | Why |
| :--- | :--- | :--- |
| Plain recursion | 924,876 calls | each call branches up to 3 ways; the tree grows exponentially |
| Memoized recursion | 71 calls | each amount is computed once; the rest are cache hits |
| Bottom-up table | 75 inner steps | 25 amounts × 3 coins |

In C++ a top-down version keeps a \`std::vector<int>\` memo (best) or a \`std::unordered_map<int, int>\` (as example 2 does). Deep recursion can overflow the call stack and crash the process with no exception to catch, so for large amounts the bottom-up loop is the safe choice.

## 8. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — fewest coins, the coins used, and greedy failing** prints:

~~~text
coins [1, 2, 5], amount 11 -> 3 coins: 1 + 5 + 5
coins [2], amount 3 -> -1
coins [1], amount 0 -> 0 coins: (none)
coins [1, 3, 4], amount 6 -> 2 coins: 3 + 3
coins [186, 419, 83, 408], amount 6249 -> 20 coins: 186 + 186 + 186 + 419 + 419 + 419 + 419 + 419 + 83 + 83 + 83 + 83 + 408 + 408 + 408 + 408 + 408 + 408 + 408 + 408
greedy [1, 3, 4], amount 6 -> 3 coins: 4 + 1 + 1
greedy [5, 2], amount 6 -> -1
dp for [1, 3, 4], amounts 0..6: [0, 1, 2, 1, 1, 2, 2]
~~~

What to read from this:

- \`[1, 2, 5]\`, 11 → 3 coins (1 + 5 + 5). The coins come out in walk-back order: \`last[11]\` is 1, then \`last[10]\` is 5, then \`last[5]\` is 5.
- \`[2]\`, 3 → −1: no pile of 2s makes an odd amount. \`[1]\`, 0 → 0 coins: the base case.
- \`[186, 419, 83, 408]\`, 6249 → 20 coins: a case where no simple rule finds the answer.
- Greedy gives 3 coins on \`[1, 3, 4]\` where DP finds 2, and −1 on \`[5, 2]\` where 2 + 2 + 2 exists.
- The last line is the table drawn in section 4.

**Example 2 — the number of ways, and plain vs memoized recursion** prints:

~~~text
ways to make 5 from [1, 2, 5]: combinations 4, orders 9
ways to make 100 from [1, 5, 10, 25]: combinations 242, orders 8577828731901
ways to make 3 from [2]: combinations 0, orders 0
naive recursion, amount 25: answer 5 after 924876 calls
memoized recursion, amount 25: answer 5 after 71 calls
bottom-up table, amount 25: answer 5 after 75 inner steps
~~~

The 4 combinations to make 5 from \`[1, 2, 5]\` are 5, 2+2+1, 2+1+1+1 and 1+1+1+1+1; counting orders turns those into 9. For amount 25 the plain recursion made 924,876 calls while the memoized version made 71 and the table did 75 steps — the whole point of DP in three lines.

## 9. Complexity

Let A = amount and k = number of coins.

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential in A | O(A) stack | every call branches into up to k calls (924,876 calls for A = 25, k = 3) |
| Memoized recursion | O(A · k) | O(A) memo + O(A) stack | each amount is computed once with k look-backs |
| Bottom-up table (fewest coins) | O(A · k) | O(A) | A entries, each a min over k coins |
| Counting ways (either loop order) | O(A · k) | O(A) | same table shape, sums instead of mins |

📌 **Interview term: Pseudo-polynomial time** — a running time that is polynomial in the **numeric value** of an input (here A) rather than in its size in digits. Doubling the number of digits in A squares the work, so a huge A needs another method.

## 10. Edge Cases

- **Amount 0:** the answer is 0 coins; the table has one entry.
- **Unreachable amount:** \`[2]\` and 3. The sentinel survives to \`dp[amount]\`, so return −1.
- **A coin larger than the amount:** skipped by the \`c <= a\` test.
- **Coin 1 present:** every amount is reachable, and the answer is at most \`amount\`.
- **Unsorted coins or duplicate coins:** the DP does not care about order or duplicates; only greedy needs sorting.
- **Large amount:** the table has \`amount + 1\` entries — fine for 10^4 or 10^5, not for 10^9.

## Common Pitfalls

- **Using greedy.** It is wrong on \`[1, 3, 4]\` (3 coins instead of 2) and incomplete on \`[5, 2]\` (−1 instead of 3).
- **\`INT_MAX\` as the sentinel.** \`INT_MAX + 1\` is signed overflow — undefined behaviour. Use \`amount + 1\`.
- **Counting ways in \`int\`.** Counts overflow quickly (8,577,828,731,901 for 100 cents in orders); use \`long long\` or a modulus.
- **Using \`cache[a]\` to test for a memo hit.** \`operator[]\` on an \`unordered_map\` **inserts** a default 0 when the key is missing, which then looks like a valid answer. Use \`find\` (as example 2 does) or \`count\`.
- **Mixing up the loop order in the counting version.** Coin loop outside counts combinations; amount loop outside counts orders.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reject greedy:</strong> <span style="color:#f0e2c8;">Biggest-coin-first fails on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 3, 4]</code> for 6: it gives 4 + 1 + 1, but 3 + 3 is better. I need to consider every possible last coin.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[a]</code> is the fewest coins that make <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0] = 0</code>; everything else starts at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount + 1</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt; dp(amount + 1, amount + 1)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The recurrence:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[a] = 1 + min(dp[a - c])</code> over coins <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c &lt;= a</code>, filled for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> from 1 to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount</code>; return −1 if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[amount]</code> is still the sentinel.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(amount × coins) time and O(amount) space — pseudo-polynomial, because it depends on the value of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INT_MAX</code> as the sentinel, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+ 1</code> is undefined behaviour; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> when counting ways.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the coins themselves?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">last[a]</code>, the coin that improved <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[a]</code>, then walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a -= last[a]</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount</code> down to 0. For 11 with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 5]</code> that gives 1, 5, 5.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many ways are there to make the amount?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[0] = 1</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[a] += ways[a - c]</code>. With the coin loop outside you count combinations (4 for 5 from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 5]</code>), with the amount loop outside you count orders (9).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not INT_MAX for impossible?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[a - c] + 1</code> would be signed overflow, which is undefined behaviour in C++. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">amount + 1</code> is safe and still bigger than any real answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Any trap in a memoized version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache[a]</code> on an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> inserts a 0 when the key is missing, which looks like a real answer. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> to test for a hit; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt;</code> memo with a -2 marker is simpler still.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if each coin can be used only once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then it is 0/1 knapsack: loop amounts <strong style="color:#ffca28;">downward</strong> inside the coin loop, so each coin is counted at most once.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Greedy algorithm** | Always take the choice that looks best now, never reconsider |
| **Optimal substructure** | An optimal answer is built from optimal answers to smaller subproblems |
| **Overlapping subproblems** | The same smaller question is asked many times, so caching pays off |
| **Sentinel value** | A special value (here \`amount + 1\`) meaning "impossible" inside the table |
| **Bottom-up (tabulation)** | Fill the table from the smallest subproblem upward |
| **Combinations vs permutations** | Whether \`1+2+2\` and \`2+1+2\` count as one way or two; chosen by loop order |
| **Pseudo-polynomial time** | Polynomial in the numeric value of the input, not in its number of digits |

---
**Conclusion:** Coin change is the textbook case where greedy breaks and dynamic programming does not. Define \`dp[a]\` as the fewest coins that make \`a\`, start from \`dp[0] = 0\`, and fill upward with \`dp[a] = 1 + min(dp[a - c])\`, using \`amount + 1\` as the "impossible" marker and turning it into −1 at the end — O(amount × coins) time and O(amount) space. Store the last coin per amount to rebuild the answer, and for the "number of ways" follow-up remember that the loop order picks combinations or orders. In C++ the traps are an \`INT_MAX\` sentinel whose \`+ 1\` is undefined behaviour and \`operator[]\` inserting into a memo map.`,
        examples: [
          {
            label: `Fewest coins: bottom-up DP, the coins used, and greedy failing`,
            code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <string>
#include <vector>

// Returns the fewest coins (or -1) and fills \`used\` with the coins chosen.
int coinChange(const std::vector<int>& coins, int amount, std::vector<int>& used) {
    const int INF = amount + 1;                 // more coins than any real answer can need
    std::vector<int> dp(amount + 1, INF);       // dp[a] = fewest coins that make a
    std::vector<int> last(amount + 1, 0);       // last[a] = coin used to reach a
    dp[0] = 0;
    for (int a = 1; a <= amount; a++) {
        for (int c : coins) {
            if (c <= a && dp[a - c] + 1 < dp[a]) {
                dp[a] = dp[a - c] + 1;
                last[a] = c;
            }
        }
    }
    if (dp[amount] == INF) return -1;
    for (int a = amount; a > 0; a -= last[a]) used.push_back(last[a]); // walk back through the choices
    return dp[amount];
}

int greedy(std::vector<int> coins, int amount, std::vector<int>& used) {
    std::sort(coins.begin(), coins.end(), std::greater<int>()); // biggest coin first
    for (int c : coins) {
        while (amount >= c) {
            amount -= c;
            used.push_back(c);
        }
    }
    if (amount != 0) { used.clear(); return -1; }
    return static_cast<int>(used.size());
}

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

std::string show(const std::string& label, int n, const std::vector<int>& used) {
    if (n == -1) return label + " -> -1";
    std::string s;
    for (size_t i = 0; i < used.size(); i++) s += (i ? " + " : "") + std::to_string(used[i]);
    return label + " -> " + std::to_string(n) + " coins: " + (used.empty() ? "(none)" : s);
}

int main() {
    std::vector<std::pair<std::vector<int>, int>> cases = {
        {{1, 2, 5}, 11}, {{2}, 3}, {{1}, 0}, {{1, 3, 4}, 6}, {{186, 419, 83, 408}, 6249}};
    for (const auto& [coins, amount] : cases) {
        std::vector<int> used;
        int n = coinChange(coins, amount, used);
        std::cout << show("coins " + fmt(coins) + ", amount " + std::to_string(amount), n, used) << "\\n";
    }
    std::vector<int> g1, g2;
    int n1 = greedy({1, 3, 4}, 6, g1);
    std::cout << show("greedy [1, 3, 4], amount 6", n1, g1) << "\\n";
    int n2 = greedy({5, 2}, 6, g2);
    std::cout << show("greedy [5, 2], amount 6", n2, g2) << "\\n";
    std::vector<int> table;
    for (int a = 0; a <= 6; a++) {
        std::vector<int> ignore;
        table.push_back(coinChange({1, 3, 4}, a, ignore));
    }
    std::cout << "dp for [1, 3, 4], amounts 0..6: " << fmt(table) << "\\n";
}`,
          },
          {
            label: `Number of ways: combinations vs orders, and naive vs memoized recursion`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

long long countCombinations(const std::vector<int>& coins, int amount) {
    std::vector<long long> ways(amount + 1, 0);
    ways[0] = 1;
    for (int c : coins)                         // coin loop OUTSIDE: each multiset once
        for (int a = c; a <= amount; a++) ways[a] += ways[a - c];
    return ways[amount];
}

long long countOrders(const std::vector<int>& coins, int amount) {
    std::vector<long long> ways(amount + 1, 0);
    ways[0] = 1;
    for (int a = 1; a <= amount; a++)           // amount loop OUTSIDE: every order counted
        for (int c : coins) if (c <= a) ways[a] += ways[a - c];
    return ways[amount];
}

long long calls = 0;
const int INF = 1000000000;

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

int naive(const std::vector<int>& coins, int a) {
    calls++;
    if (a == 0) return 0;
    int best = INF;
    for (int c : coins) if (c <= a) best = std::min(best, naive(coins, a - c) + 1);
    return best;
}

int memo(const std::vector<int>& coins, int a, std::unordered_map<int, int>& cache) {
    calls++;
    if (a == 0) return 0;
    auto it = cache.find(a);
    if (it != cache.end()) return it->second;
    int best = INF;
    for (int c : coins) if (c <= a) best = std::min(best, memo(coins, a - c, cache) + 1);
    cache[a] = best;
    return best;
}

int main() {
    std::vector<std::pair<std::vector<int>, int>> cases = {{{1, 2, 5}, 5}, {{1, 5, 10, 25}, 100}, {{2}, 3}};
    for (const auto& [coins, amount] : cases)
        std::cout << "ways to make " << amount << " from " << fmt(coins) << ": combinations "
                  << countCombinations(coins, amount) << ", orders " << countOrders(coins, amount) << "\\n";
    std::vector<int> coins = {1, 2, 5};
    calls = 0;
    int r = naive(coins, 25);
    std::cout << "naive recursion, amount 25: answer " << r << " after " << calls << " calls\\n";
    calls = 0;
    std::unordered_map<int, int> cache;
    r = memo(coins, 25, cache);
    std::cout << "memoized recursion, amount 25: answer " << r << " after " << calls << " calls\\n";
    int steps = 0;
    std::vector<int> dp(26, INF);
    dp[0] = 0;
    for (int a = 1; a <= 25; a++) {
        for (int c : coins) {
            steps++;
            if (c <= a) dp[a] = std::min(dp[a], dp[a - c] + 1);
        }
    }
    std::cout << "bottom-up table, amount 25: answer " << dp[25] << " after " << steps << " inner steps\\n";
}`,
          },
        ],
      },
    },
  },
  {
    title: `How do you count unique paths in a grid?`,
    difficulty: "medium",
    seoDescription: `Count unique grid paths three ways: 2D DP, a single rolling row and the binomial formula, plus obstacles, with verified Python, JS, Java and C++ code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"A robot starts in the top-left corner of an m × n grid and can only move right or down. How many different paths can it take to the bottom-right corner? After that, what changes if some cells are blocked? Please code it in Python."

**What a strong answer should cover:**
- The recurrence: a cell can only be entered from above or from the left, so \`paths[r][c] = paths[r-1][c] + paths[r][c-1]\`, with the whole first row and first column equal to 1.
- O(m·n) time; space from O(m·n) down to O(n) by keeping a single row and updating it left to right.
- The closed form: every path is m−1 downs and n−1 rights in some order, so the answer is the binomial coefficient C(m+n−2, m−1), computable in O(min(m, n)) with exact integer steps.
- The obstacles variant: a blocked cell has 0 paths, and a blocked start or end makes the answer 0 — the formula no longer applies, the DP does.
- Python details: build 2D tables with a comprehension, not \`[[1] * n] * m\` (which shares one inner list), \`//\` for exact integer division, and \`math.comb\` for the binomial — with no overflow at any size.

**Clarifying questions expected:**
- Are the moves only right and down?
- How large can m and n be — does the answer fit in 32 or 64 bits?
- Are there obstacles, and can the start or end cell itself be blocked?

**Code / implementation expected:** Yes — a Python DP over the grid (one row of space is a plus); the binomial formula is a good follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need nested loops and 2D arrays; no prior DP knowledge is assumed.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a city laid out as a perfect grid of streets, like a chessboard. You live at the top-left corner and your office is at the bottom-right. Every block you walk must bring you closer to work, so you only ever walk **east** or **south**. On Monday you go east-east-south; on Tuesday south-east-east. How many different routes could you take before you have to repeat one?

You could try to list them all, but for a 10 × 10 grid there are 48,620 of them. There is a much calmer way to think. Stand on any street corner and ask: "how did I get here?" You arrived either from the corner directly **north** of you or from the corner directly **west**. So the number of routes to your corner is the routes to the north corner plus the routes to the west corner. Start at home with 1 route (stand still), fill in the corners one by one, and the number at the office is your answer.

That "my count = the count above me + the count to my left" rule is the whole problem. It is the 2D cousin of [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem), and the first grid problem most people meet in [dynamic programming](/interview-question/what-is-dynamic-programming).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the only moves right and down? | Allowing up or left lets paths loop forever; the counting problem would change completely |
| How large are m and n? | 100 × 100 has about 2.3 × 10^58 paths, far past 64-bit integers |
| Are there blocked cells (obstacles)? | The closed-form formula no longer works; the DP still does |
| Can the start or the end be blocked? | Then the answer is 0 — easy to miss in code |
| Do you need the count or the paths themselves? | Listing all paths is exponential output; counting is polynomial |

## 3. The Core Idea: Above Plus Left

Number the rows \`r = 0 .. m−1\` and the columns \`c = 0 .. n−1\`. Let \`paths[r][c]\` be the number of right/down routes from the start \`(0, 0)\` to the cell \`(r, c)\`.

- Every cell in the **first row** can only be reached by walking right the whole way: exactly 1 route.
- Every cell in the **first column** can only be reached by walking down: exactly 1 route.
- Any other cell is entered either from above \`(r−1, c)\` or from the left \`(r, c−1)\`, and those two groups of routes never overlap (their last step differs). So the counts **add**.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 230" role="img" aria-label="A cell is reached from the cell above or the cell to its left, so its path count is the sum of the two">
  <defs>
    <marker id="b28q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="300" y="20" width="150" height="64" rx="10"/>
  <text class="d-text" x="375" y="48" text-anchor="middle">above</text>
  <text class="d-sub" x="375" y="70" text-anchor="middle">paths r-1, c</text>
  <rect class="d-box" x="60" y="140" width="150" height="64" rx="10"/>
  <text class="d-text" x="135" y="168" text-anchor="middle">left</text>
  <text class="d-sub" x="135" y="190" text-anchor="middle">paths r, c-1</text>
  <rect class="d-box-accent" x="300" y="140" width="150" height="64" rx="10"/>
  <text class="d-text" x="375" y="168" text-anchor="middle">this cell</text>
  <text class="d-sub" x="375" y="190" text-anchor="middle">above plus left</text>
  <path class="d-edge" d="M 375 86 L 375 136" marker-end="url(#b28q3-arrow)"/>
  <path class="d-edge" d="M 212 172 L 296 172" marker-end="url(#b28q3-arrow)"/>
</svg>

~~~text
paths[0][c] = 1, paths[r][0] = 1
paths[r][c] = paths[r-1][c] + paths[r][c-1]
answer = paths[m-1][n-1]
~~~

📌 **Interview term: Grid DP** — a dynamic programming table shaped like the grid itself, where each cell's value is computed from neighbouring cells that were filled earlier (here: the one above and the one to the left).

📌 **Interview term: Base case** — the values you know without computing: the first row and first column are all 1. See [What is recursion and what is a base case?](/interview-question/what-is-recursion-and-what-is-a-base-case).

Here is the full table for a 3 × 7 grid (example 1 prints it):

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The path count table for a 3 by 7 grid. The first row and column are 1 and the bottom right cell is 28">
  <rect class="d-box-muted" x="30" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="70" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="122" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="162" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="214" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="254" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="306" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="346" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="398" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="438" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="490" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="530" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="582" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="622" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="30" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="70" y="126" text-anchor="middle">1</text>
  <rect class="d-box" x="122" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="162" y="126" text-anchor="middle">2</text>
  <rect class="d-box" x="214" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="254" y="126" text-anchor="middle">3</text>
  <rect class="d-box" x="306" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="346" y="126" text-anchor="middle">4</text>
  <rect class="d-box" x="398" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="438" y="126" text-anchor="middle">5</text>
  <rect class="d-box" x="490" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="530" y="126" text-anchor="middle">6</text>
  <rect class="d-box" x="582" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="622" y="126" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="30" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="70" y="198" text-anchor="middle">1</text>
  <rect class="d-box" x="122" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="162" y="198" text-anchor="middle">3</text>
  <rect class="d-box" x="214" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="254" y="198" text-anchor="middle">6</text>
  <rect class="d-box" x="306" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="346" y="198" text-anchor="middle">10</text>
  <rect class="d-box" x="398" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="438" y="198" text-anchor="middle">15</text>
  <rect class="d-box" x="490" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="530" y="198" text-anchor="middle">21</text>
  <rect class="d-box-accent" x="582" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="622" y="198" text-anchor="middle">28</text>
</svg>

Check one cell: the 21 in the bottom row is 6 (above it) + 15 (to its left). The answer for 3 × 7 is the bottom-right 28.

## 4. Brute Force First, Then the Table, in Python

**Brute force.** A recursive function \`count(r, c)\` returns 1 at the target, 0 outside the grid, and otherwise \`count(r+1, c) + count(r, c+1)\`. It is correct but it re-walks the same sub-grids again and again: example 2 shows **3,997,447 calls** for a 12 × 12 grid, while the table fills **144 cells**. Adding a cache (memoization) to that recursion would fix it, but the table is just as simple.

📌 **Interview term: Overlapping subproblems** — the same smaller question asked many times. \`count(5, 5)\` is reached from both \`count(4, 5)\` and \`count(5, 4)\`, and each of those is reached many times too.

**The table:**

~~~python
def path_table(m, n):
    """dp[r][c] = number of right/down paths from (0, 0) to (r, c)."""
    dp = [[1] * n for _ in range(m)]       # first row and first column are all 1
    for r in range(1, m):
        for c in range(1, n):
            dp[r][c] = dp[r - 1][c] + dp[r][c - 1]   # arrive from above or from the left
    return dp

def unique_paths(m, n):
    return path_table(m, n)[m - 1][n - 1]
~~~

**What to point out in this code:**

- \`1] * n for _ in range(m)]\` builds **m separate rows**. The tempting \`[[1] * n] * m\` creates m references to **one** list: in our run, setting \`g[1][0] = 9\` on such a grid changed both rows to \`[9, 1, 1]\`.
- Starting every cell at 1 handles the first row and first column for free; the loops start at index 1 and overwrite everything else.
- Python \`int\` has arbitrary precision, so the counts never overflow, even for a 100 × 100 grid.
- \`path_table\` returns the full table so it can be printed; \`unique_paths\` just reads the corner.

## 5. One Row Is Enough

Look at the recurrence again: row \`r\` only needs row \`r − 1\`. Better still, if you keep **one** array \`row\` and sweep it left to right, then just before you update \`row[c]\`:

- \`row[c]\` still holds the value from the previous row — that is **above**;
- \`row[c − 1]\` has already been updated in this row — that is **left**.

So \`row[c] += row[c − 1]\` is the whole recurrence, in O(n) space.

📌 **Interview term: Rolling array** — keeping only the last row (or last few values) of a DP table because the recurrence never looks further back. It turns O(m·n) space into O(n).

~~~python
def unique_paths_row(m, n):
    row = [1] * n                          # row r of the table, reused in place
    for _ in range(1, m):
        for c in range(1, n):
            row[c] += row[c - 1]           # old row[c] is "above", row[c - 1] is "left"
    return row[n - 1]

def unique_paths_formula(m, n):
    k = min(m - 1, n - 1)                  # choose which k of the m+n-2 moves go the short way
    total = m + n - 2
    res = 1
    for i in range(1, k + 1):
        res = res * (total - k + i) // i  # exact: res is C(total - k + i, i) after each step
    return res
~~~

The second function above is the closed form, explained next.

## 6. The Math Shortcut: a Binomial Coefficient

Every path from the top-left to the bottom-right of an m × n grid makes exactly **m − 1 down moves** and **n − 1 right moves**, in some order — 8 moves for a 3 × 7 grid, 2 of them down:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 140" role="img" aria-label="One path through a 3 by 7 grid written as eight moves: R R D R R R D R. Choosing where the two D moves go fixes the path">
  <rect class="d-box" x="20" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="52" y="74" text-anchor="middle">R</text>
  <rect class="d-box" x="102" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="134" y="74" text-anchor="middle">R</text>
  <rect class="d-box-accent" x="184" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="216" y="74" text-anchor="middle">D</text>
  <rect class="d-box" x="266" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="298" y="74" text-anchor="middle">R</text>
  <rect class="d-box" x="348" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="380" y="74" text-anchor="middle">R</text>
  <rect class="d-box" x="430" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="462" y="74" text-anchor="middle">R</text>
  <rect class="d-box-accent" x="512" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="544" y="74" text-anchor="middle">D</text>
  <rect class="d-box" x="594" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="626" y="74" text-anchor="middle">R</text>
</svg>

A path is decided entirely by **which positions** hold the D moves. So the count is "choose m − 1 positions out of m + n − 2", the binomial coefficient:

~~~text
paths(m, n) = C(m + n - 2, m - 1) = (m + n - 2)! / ((m - 1)! (n - 1)!)
3 x 7:  C(8, 2) = 28
10 x 10: C(18, 9) = 48620
~~~

📌 **Interview term: Binomial coefficient C(N, k)** — the number of ways to choose k items out of N, ignoring order ("N choose k"). The path table is Pascal's triangle turned on its side.

Computing factorials directly overflows almost immediately, so the code multiplies and divides one step at a time: after step i, \`res\` equals C(total − k + i, i), which is always a whole number, so each division is exact. Choosing \`k = min(m − 1, n − 1)\` keeps the loop short: O(min(m, n)) steps.

Python also has this built in: \`math.comb(n, k)\` ([added in Python 3.8](https://docs.python.org/3/library/math.html#math.comb)). It returns an exact \`int\` at any size — \`math.comb(198, 99)\`, the 100 × 100 answer, is a 59-digit number. Note the \`//\` in the loop: \`/\` would produce a \`float\` and lose exactness for large values.

## 7. With Obstacles

The follow-up ("Unique Paths II") puts rocks on some cells. A rock cell has **0 paths** to it, and the formula is useless now, but the row DP adapts in two lines: set \`row[c] = 0\` on a rock, otherwise add the left neighbour. The start cell gets 1 only if it is free.

~~~python
def paths_with_obstacles(grid):
    m, n = len(grid), len(grid[0])
    row = [0] * n
    row[0] = 1 if grid[0][0] == 0 else 0   # a blocked start means no paths at all
    for r in range(m):
        for c in range(n):
            if grid[r][c] == 1:
                row[c] = 0                 # nobody can stand on a rock
            elif c > 0:
                row[c] += row[c - 1]
    return row[n - 1]
~~~

Unlike the plain version, the first row and column are **not** all 1 any more: everything to the right of a rock in row 0 (or below a rock in column 0) is unreachable. Starting the row at 0 and letting the loop handle row 0 too — the \`c > 0\` test skips the left neighbour of column 0 — covers that without special cases.

## 8. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the 2D table, the single row and the binomial formula agree** prints:

~~~text
grid 1x1: table 1, one row 1, formula 1
grid 3x7: table 28, one row 28, formula 28
grid 3x2: table 3, one row 3, formula 3
grid 7x3: table 28, one row 28, formula 28
grid 10x10: table 48620, one row 48620, formula 48620
grid 17x17: table 601080390, one row 601080390, formula 601080390
grid 23x12: table 193536720, one row 193536720, formula 193536720
table for 3x7:
1 1 1 1 1 1 1
1 2 3 4 5 6 7
1 3 6 10 15 21 28
~~~

The three methods give the same answer on every size, including the 1 × 1 grid (one path: stand still), the symmetric pair 3 × 7 and 7 × 3 (both 28, because C(8, 2) = C(8, 6)), and 17 × 17 with 601,080,390 paths. The table at the end is the one in section 3.

**Example 2 — obstacles, and brute force vs DP** prints:

~~~text
obstacles 000/010/000 -> 2
obstacles 01/00 -> 1
obstacles 10 -> 0
obstacles 00/01 -> 0
obstacles 0000/0100/0001/1000 -> 3
brute force 6x6: 252 paths after 1343 calls; DP fills 36 cells
brute force 9x9: 12870 paths after 71499 calls; DP fills 81 cells
brute force 12x12: 705432 paths after 3997447 calls; DP fills 144 cells
~~~

Grids are printed row by row with \`/\` between rows (1 = rock):

- \`000/010/000\` → 2: the rock in the middle leaves only the two routes around the edge.
- \`10\` → 0 (start blocked) and \`00/01\` → 0 (end blocked).
- The brute-force recursion needed 1,343 calls for 6 × 6, 71,499 for 9 × 9 and 3,997,447 for 12 × 12, while the DP filled 36, 81 and 144 cells. The call count grows roughly like the number of paths itself; the table grows like the grid area.

## 9. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute-force recursion | exponential (about C(m+n−2, m−1) leaves) | O(m + n) stack | every path is walked separately; 3,997,447 calls for 12 × 12 |
| 2D table | O(m · n) | O(m · n) | each cell is one addition |
| One row | O(m · n) | O(n) | the same additions, one row kept (use the shorter side as n) |
| Binomial formula | O(min(m, n)) | O(1) | k multiply-and-divide steps |
| Obstacles (row DP) | O(m · n) | O(n) | one pass over the grid |

## 10. Edge Cases

- **1 × 1 grid:** 1 path (you are already there). **1 × n or m × 1:** 1 path, a straight line.
- **m and n swapped:** same answer, since C(m+n−2, m−1) = C(m+n−2, n−1).
- **Large grids:** the count overflows 32-bit integers from 18 × 18, and 64-bit long before 100 × 100.
- **Obstacles:** a blocked start or end gives 0; a full row of rocks gives 0.
- **Empty grid (m or n = 0):** not a valid input in the usual statement; decide with the interviewer.

## Common Pitfalls

- **\`[[1] * n] * m\`** shares one row m times, so writing one cell writes the whole column. Use a comprehension.
- **Using \`/\` instead of \`//\`** in the binomial loop turns the result into a \`float\`, which loses exactness once values pass 2^53.
- **Forgetting that the first row and column are 1** (or, with obstacles, that they are not all 1 after a rock).
- **Recursing without a cache.** The brute force is exponential (3,997,447 calls for 12 × 12); with \`functools.lru_cache\` it becomes O(m·n), but deep grids still meet the recursion limit.
- **Mixing up rows and columns** when m ≠ n — test with 3 × 7 and 7 × 3, which must both give 28.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The recurrence:</strong> <span style="color:#f0e2c8;">A cell is entered only from above or from the left, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">paths[r][c] = paths[r-1][c] + paths[r][c-1]</code>, with the first row and column all 1.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The table:</strong> <span style="color:#f0e2c8;">Fill it row by row; the answer is the bottom-right cell. O(m·n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Less space:</strong> <span style="color:#f0e2c8;">One row is enough: sweeping left to right, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row[c] += row[c - 1]</code> adds left to the old value above. O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The formula:</strong> <span style="color:#f0e2c8;">Every path is m−1 downs and n−1 rights in some order, so the answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">math.comb(m + n - 2, m - 1)</code>, exact in Python at any size.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Build 2D lists with a comprehension, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[1] * n] * m</code>, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">//</code> in a hand-written binomial loop.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes with obstacles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A rock cell gets 0 and the formula stops working. The row DP becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row[c] = 0</code> on a rock, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row[c] += row[c - 1]</code>; a blocked start gives 0 right away.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the binomial loop never produce a fraction?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After step i the value is C(total − k + i, i), a whole number, and multiplying before dividing keeps every step exact.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How big do the answers get?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">17 × 17 is 601,080,390 and 100 × 100 is a 59-digit number. Python ints handle that; in Java or C++ you would need big integers or a modulus.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you do it recursively?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@lru_cache</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count(r, c)</code>, which makes it O(m·n). Without the cache it is exponential: 3,997,447 calls for a 12 × 12 grid in our run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if moves could also go diagonally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add the third neighbour: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">paths[r][c] = above + left + diagonal</code>. The DP shape is the same; the binomial formula no longer applies.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Grid DP** | A DP table shaped like the grid, each cell computed from earlier neighbours |
| **Base case** | Values known without computing; here the first row and column are 1 |
| **Overlapping subproblems** | The same sub-grid is counted many times by plain recursion |
| **Rolling array** | Keeping only the last row of a DP table to save space |
| **Binomial coefficient C(N, k)** | The number of ways to choose k positions out of N |

---
**Conclusion:** Counting unique grid paths comes down to one observation: a cell is reached only from above or from the left, so its count is the sum of those two. Fill the table row by row in O(m·n) time, shrink it to one row with \`row[c] += row[c - 1]\`, or skip the table entirely with C(m+n−2, m−1) because every path is just an arrangement of downs and rights. The obstacles variant breaks the formula but not the DP. [[In Python the counts never overflow and \`math.comb\` gives the exact answer at any size; just build 2D lists with a comprehension.`,
        examples: [
          {
            label: `Unique paths: 2D table, one row, and the binomial formula`,
            code: `def path_table(m, n):
    """dp[r][c] = number of right/down paths from (0, 0) to (r, c)."""
    dp = [[1] * n for _ in range(m)]       # first row and first column are all 1
    for r in range(1, m):
        for c in range(1, n):
            dp[r][c] = dp[r - 1][c] + dp[r][c - 1]   # arrive from above or from the left
    return dp


def unique_paths(m, n):
    return path_table(m, n)[m - 1][n - 1]


def unique_paths_row(m, n):
    row = [1] * n                          # row r of the table, reused in place
    for _ in range(1, m):
        for c in range(1, n):
            row[c] += row[c - 1]           # old row[c] is "above", row[c - 1] is "left"
    return row[n - 1]


def unique_paths_formula(m, n):
    k = min(m - 1, n - 1)                  # choose which k of the m+n-2 moves go the short way
    total = m + n - 2
    res = 1
    for i in range(1, k + 1):
        res = res * (total - k + i) // i  # exact: res is C(total - k + i, i) after each step
    return res


for m, n in [(1, 1), (3, 7), (3, 2), (7, 3), (10, 10), (17, 17), (23, 12)]:
    print("grid " + str(m) + "x" + str(n) + ": table " + str(unique_paths(m, n))
          + ", one row " + str(unique_paths_row(m, n)) + ", formula " + str(unique_paths_formula(m, n)))
print("table for 3x7:")
for r in path_table(3, 7):
    print(" ".join(str(v) for v in r))`,
          },
          {
            label: `Obstacles, and brute-force recursion vs DP call counts`,
            code: `def paths_with_obstacles(grid):
    m, n = len(grid), len(grid[0])
    row = [0] * n
    row[0] = 1 if grid[0][0] == 0 else 0   # a blocked start means no paths at all
    for r in range(m):
        for c in range(n):
            if grid[r][c] == 1:
                row[c] = 0                 # nobody can stand on a rock
            elif c > 0:
                row[c] += row[c - 1]
    return row[n - 1]


calls = 0


def brute(r, c, m, n):
    global calls
    calls += 1
    if r == m - 1 and c == n - 1:
        return 1
    if r >= m or c >= n:
        return 0
    return brute(r + 1, c, m, n) + brute(r, c + 1, m, n)


grids = [
    [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
    [[0, 1], [0, 0]],
    [[1, 0]],
    [[0, 0], [0, 1]],
    [[0, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1], [1, 0, 0, 0]],
]
for g in grids:
    print("obstacles " + "/".join("".join(str(v) for v in row) for row in g) + " -> " + str(paths_with_obstacles(g)))

for size in [6, 9, 12]:
    calls = 0
    ways = brute(0, 0, size, size)
    print("brute force " + str(size) + "x" + str(size) + ": " + str(ways) + " paths after " + str(calls) + " calls; DP fills " + str(size * size) + " cells")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"A robot starts in the top-left corner of an m × n grid and can only move right or down. How many different paths can it take to the bottom-right corner? After that, what changes if some cells are blocked? Please code it in JavaScript."

**What a strong answer should cover:**
- The recurrence: a cell can only be entered from above or from the left, so \`paths[r][c] = paths[r-1][c] + paths[r][c-1]\`, with the whole first row and first column equal to 1.
- O(m·n) time; space from O(m·n) down to O(n) by keeping a single row and updating it left to right.
- The closed form: every path is m−1 downs and n−1 rights in some order, so the answer is the binomial coefficient C(m+n−2, m−1), computable in O(min(m, n)) with exact integer steps.
- The obstacles variant: a blocked cell has 0 paths, and a blocked start or end makes the answer 0 — the formula no longer applies, the DP does.
- JavaScript details: build 2D tables with \`Array.from({ length: m }, ...)\`, not \`new Array(m).fill(new Array(n))\` (one shared row), and that numbers are exact only up to 2^53 − 1, so large grids need \`BigInt\`.

**Clarifying questions expected:**
- Are the moves only right and down?
- How large can m and n be — does the answer fit in 32 or 64 bits?
- Are there obstacles, and can the start or end cell itself be blocked?

**Code / implementation expected:** Yes — a JavaScript DP over the grid (one row of space is a plus); the binomial formula is a good follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need nested loops and 2D arrays; no prior DP knowledge is assumed.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a city laid out as a perfect grid of streets, like a chessboard. You live at the top-left corner and your office is at the bottom-right. Every block you walk must bring you closer to work, so you only ever walk **east** or **south**. On Monday you go east-east-south; on Tuesday south-east-east. How many different routes could you take before you have to repeat one?

You could try to list them all, but for a 10 × 10 grid there are 48,620 of them. There is a much calmer way to think. Stand on any street corner and ask: "how did I get here?" You arrived either from the corner directly **north** of you or from the corner directly **west**. So the number of routes to your corner is the routes to the north corner plus the routes to the west corner. Start at home with 1 route (stand still), fill in the corners one by one, and the number at the office is your answer.

That "my count = the count above me + the count to my left" rule is the whole problem. It is the 2D cousin of [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem), and the first grid problem most people meet in [dynamic programming](/interview-question/what-is-dynamic-programming).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the only moves right and down? | Allowing up or left lets paths loop forever; the counting problem would change completely |
| How large are m and n? | 100 × 100 has about 2.3 × 10^58 paths, far past 64-bit integers |
| Are there blocked cells (obstacles)? | The closed-form formula no longer works; the DP still does |
| Can the start or the end be blocked? | Then the answer is 0 — easy to miss in code |
| Do you need the count or the paths themselves? | Listing all paths is exponential output; counting is polynomial |

## 3. The Core Idea: Above Plus Left

Number the rows \`r = 0 .. m−1\` and the columns \`c = 0 .. n−1\`. Let \`paths[r][c]\` be the number of right/down routes from the start \`(0, 0)\` to the cell \`(r, c)\`.

- Every cell in the **first row** can only be reached by walking right the whole way: exactly 1 route.
- Every cell in the **first column** can only be reached by walking down: exactly 1 route.
- Any other cell is entered either from above \`(r−1, c)\` or from the left \`(r, c−1)\`, and those two groups of routes never overlap (their last step differs). So the counts **add**.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 230" role="img" aria-label="A cell is reached from the cell above or the cell to its left, so its path count is the sum of the two">
  <defs>
    <marker id="b28q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="300" y="20" width="150" height="64" rx="10"/>
  <text class="d-text" x="375" y="48" text-anchor="middle">above</text>
  <text class="d-sub" x="375" y="70" text-anchor="middle">paths r-1, c</text>
  <rect class="d-box" x="60" y="140" width="150" height="64" rx="10"/>
  <text class="d-text" x="135" y="168" text-anchor="middle">left</text>
  <text class="d-sub" x="135" y="190" text-anchor="middle">paths r, c-1</text>
  <rect class="d-box-accent" x="300" y="140" width="150" height="64" rx="10"/>
  <text class="d-text" x="375" y="168" text-anchor="middle">this cell</text>
  <text class="d-sub" x="375" y="190" text-anchor="middle">above plus left</text>
  <path class="d-edge" d="M 375 86 L 375 136" marker-end="url(#b28q3-arrow)"/>
  <path class="d-edge" d="M 212 172 L 296 172" marker-end="url(#b28q3-arrow)"/>
</svg>

~~~text
paths[0][c] = 1, paths[r][0] = 1
paths[r][c] = paths[r-1][c] + paths[r][c-1]
answer = paths[m-1][n-1]
~~~

📌 **Interview term: Grid DP** — a dynamic programming table shaped like the grid itself, where each cell's value is computed from neighbouring cells that were filled earlier (here: the one above and the one to the left).

📌 **Interview term: Base case** — the values you know without computing: the first row and first column are all 1. See [What is recursion and what is a base case?](/interview-question/what-is-recursion-and-what-is-a-base-case).

Here is the full table for a 3 × 7 grid (example 1 prints it):

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The path count table for a 3 by 7 grid. The first row and column are 1 and the bottom right cell is 28">
  <rect class="d-box-muted" x="30" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="70" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="122" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="162" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="214" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="254" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="306" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="346" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="398" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="438" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="490" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="530" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="582" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="622" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="30" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="70" y="126" text-anchor="middle">1</text>
  <rect class="d-box" x="122" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="162" y="126" text-anchor="middle">2</text>
  <rect class="d-box" x="214" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="254" y="126" text-anchor="middle">3</text>
  <rect class="d-box" x="306" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="346" y="126" text-anchor="middle">4</text>
  <rect class="d-box" x="398" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="438" y="126" text-anchor="middle">5</text>
  <rect class="d-box" x="490" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="530" y="126" text-anchor="middle">6</text>
  <rect class="d-box" x="582" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="622" y="126" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="30" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="70" y="198" text-anchor="middle">1</text>
  <rect class="d-box" x="122" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="162" y="198" text-anchor="middle">3</text>
  <rect class="d-box" x="214" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="254" y="198" text-anchor="middle">6</text>
  <rect class="d-box" x="306" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="346" y="198" text-anchor="middle">10</text>
  <rect class="d-box" x="398" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="438" y="198" text-anchor="middle">15</text>
  <rect class="d-box" x="490" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="530" y="198" text-anchor="middle">21</text>
  <rect class="d-box-accent" x="582" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="622" y="198" text-anchor="middle">28</text>
</svg>

Check one cell: the 21 in the bottom row is 6 (above it) + 15 (to its left). The answer for 3 × 7 is the bottom-right 28.

## 4. Brute Force First, Then the Table, in JavaScript

**Brute force.** A recursive function \`count(r, c)\` returns 1 at the target, 0 outside the grid, and otherwise \`count(r+1, c) + count(r, c+1)\`. It is correct but it re-walks the same sub-grids again and again: example 2 shows **3,997,447 calls** for a 12 × 12 grid, while the table fills **144 cells**. Adding a cache (memoization) to that recursion would fix it, but the table is just as simple.

📌 **Interview term: Overlapping subproblems** — the same smaller question asked many times. \`count(5, 5)\` is reached from both \`count(4, 5)\` and \`count(5, 4)\`, and each of those is reached many times too.

**The table:**

~~~javascript
// dp[r][c] = number of right/down paths from (0, 0) to (r, c)
function pathTable(m, n) {
  const dp = Array.from({ length: m }, () => new Array(n).fill(1)); // first row and column are 1
  for (let r = 1; r < m; r++) {
    for (let c = 1; c < n; c++) {
      dp[r][c] = dp[r - 1][c] + dp[r][c - 1]; // arrive from above or from the left
    }
  }
  return dp;
}

function uniquePaths(m, n) {
  return pathTable(m, n)[m - 1][n - 1];
}
~~~

**What to point out in this code:**

- \`Array.from({ length: m }, () => new Array(n).fill(1))\` calls the arrow function once per row, so every row is a **separate** array. \`new Array(m).fill(new Array(n).fill(1))\` puts the **same** row object in every slot: in our run, setting \`g[1][0] = 9\` changed both rows to \`[9,1,1]\`.
- Starting every cell at 1 handles the first row and first column for free; the loops start at index 1 and overwrite everything else.
- The counts are \`Number\`s (doubles). They are exact up to \`Number.MAX_SAFE_INTEGER\` (2^53 − 1); every grid in example 1 is far below that.
- \`pathTable\` returns the full table so it can be printed; \`uniquePaths\` just reads the corner.

## 5. One Row Is Enough

Look at the recurrence again: row \`r\` only needs row \`r − 1\`. Better still, if you keep **one** array \`row\` and sweep it left to right, then just before you update \`row[c]\`:

- \`row[c]\` still holds the value from the previous row — that is **above**;
- \`row[c − 1]\` has already been updated in this row — that is **left**.

So \`row[c] += row[c − 1]\` is the whole recurrence, in O(n) space.

📌 **Interview term: Rolling array** — keeping only the last row (or last few values) of a DP table because the recurrence never looks further back. It turns O(m·n) space into O(n).

~~~javascript
function uniquePathsRow(m, n) {
  const row = new Array(n).fill(1);        // row r of the table, reused in place
  for (let r = 1; r < m; r++) {
    for (let c = 1; c < n; c++) row[c] += row[c - 1]; // old row[c] is "above", row[c - 1] is "left"
  }
  return row[n - 1];
}

function uniquePathsFormula(m, n) {
  const k = Math.min(m - 1, n - 1);        // choose which k of the m+n-2 moves go the short way
  const total = m + n - 2;
  let res = 1;
  for (let i = 1; i <= k; i++) {
    res = res * (total - k + i) / i;       // exact: res is C(total - k + i, i) after each step
  }
  return res;
}
~~~

The second function above is the closed form, explained next.

## 6. The Math Shortcut: a Binomial Coefficient

Every path from the top-left to the bottom-right of an m × n grid makes exactly **m − 1 down moves** and **n − 1 right moves**, in some order — 8 moves for a 3 × 7 grid, 2 of them down:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 140" role="img" aria-label="One path through a 3 by 7 grid written as eight moves: R R D R R R D R. Choosing where the two D moves go fixes the path">
  <rect class="d-box" x="20" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="52" y="74" text-anchor="middle">R</text>
  <rect class="d-box" x="102" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="134" y="74" text-anchor="middle">R</text>
  <rect class="d-box-accent" x="184" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="216" y="74" text-anchor="middle">D</text>
  <rect class="d-box" x="266" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="298" y="74" text-anchor="middle">R</text>
  <rect class="d-box" x="348" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="380" y="74" text-anchor="middle">R</text>
  <rect class="d-box" x="430" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="462" y="74" text-anchor="middle">R</text>
  <rect class="d-box-accent" x="512" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="544" y="74" text-anchor="middle">D</text>
  <rect class="d-box" x="594" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="626" y="74" text-anchor="middle">R</text>
</svg>

A path is decided entirely by **which positions** hold the D moves. So the count is "choose m − 1 positions out of m + n − 2", the binomial coefficient:

~~~text
paths(m, n) = C(m + n - 2, m - 1) = (m + n - 2)! / ((m - 1)! (n - 1)!)
3 x 7:  C(8, 2) = 28
10 x 10: C(18, 9) = 48620
~~~

📌 **Interview term: Binomial coefficient C(N, k)** — the number of ways to choose k items out of N, ignoring order ("N choose k"). The path table is Pascal's triangle turned on its side.

Computing factorials directly overflows almost immediately, so the code multiplies and divides one step at a time: after step i, \`res\` equals C(total − k + i, i), which is always a whole number, so each division is exact. Choosing \`k = min(m − 1, n − 1)\` keeps the loop short: O(min(m, n)) steps.

In JavaScript \`res * (total - k + i) / i\` uses floating-point division, but because every intermediate value is a whole number below 2^53 it stays exact for all the grids in example 1. For a 100 × 100 grid the same loop printed \`2.2750883079422927e+58\` in our run, while the exact value is 22750883079422934966181954039568885395604168260154104734000 — correct only in its first 15 digits. For exact large answers, use \`BigInt\` (\`res = res * BigInt(total - k + i) / BigInt(i)\`; \`BigInt\` division truncates, which is exact here).

## 7. With Obstacles

The follow-up ("Unique Paths II") puts rocks on some cells. A rock cell has **0 paths** to it, and the formula is useless now, but the row DP adapts in two lines: set \`row[c] = 0\` on a rock, otherwise add the left neighbour. The start cell gets 1 only if it is free.

~~~javascript
function pathsWithObstacles(grid) {
  const m = grid.length, n = grid[0].length;
  const row = new Array(n).fill(0);
  row[0] = grid[0][0] === 0 ? 1 : 0;       // a blocked start means no paths at all
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === 1) row[c] = 0;    // nobody can stand on a rock
      else if (c > 0) row[c] += row[c - 1];
    }
  }
  return row[n - 1];
}
~~~

Unlike the plain version, the first row and column are **not** all 1 any more: everything to the right of a rock in row 0 (or below a rock in column 0) is unreachable. Starting the row at 0 and letting the loop handle row 0 too — the \`c > 0\` test skips the left neighbour of column 0 — covers that without special cases.

## 8. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22; the same file runs unchanged in the page). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the 2D table, the single row and the binomial formula agree** prints:

~~~text
grid 1x1: table 1, one row 1, formula 1
grid 3x7: table 28, one row 28, formula 28
grid 3x2: table 3, one row 3, formula 3
grid 7x3: table 28, one row 28, formula 28
grid 10x10: table 48620, one row 48620, formula 48620
grid 17x17: table 601080390, one row 601080390, formula 601080390
grid 23x12: table 193536720, one row 193536720, formula 193536720
table for 3x7:
1 1 1 1 1 1 1
1 2 3 4 5 6 7
1 3 6 10 15 21 28
~~~

The three methods give the same answer on every size, including the 1 × 1 grid (one path: stand still), the symmetric pair 3 × 7 and 7 × 3 (both 28, because C(8, 2) = C(8, 6)), and 17 × 17 with 601,080,390 paths. The table at the end is the one in section 3.

**Example 2 — obstacles, and brute force vs DP** prints:

~~~text
obstacles 000/010/000 -> 2
obstacles 01/00 -> 1
obstacles 10 -> 0
obstacles 00/01 -> 0
obstacles 0000/0100/0001/1000 -> 3
brute force 6x6: 252 paths after 1343 calls; DP fills 36 cells
brute force 9x9: 12870 paths after 71499 calls; DP fills 81 cells
brute force 12x12: 705432 paths after 3997447 calls; DP fills 144 cells
~~~

Grids are printed row by row with \`/\` between rows (1 = rock):

- \`000/010/000\` → 2: the rock in the middle leaves only the two routes around the edge.
- \`10\` → 0 (start blocked) and \`00/01\` → 0 (end blocked).
- The brute-force recursion needed 1,343 calls for 6 × 6, 71,499 for 9 × 9 and 3,997,447 for 12 × 12, while the DP filled 36, 81 and 144 cells. The call count grows roughly like the number of paths itself; the table grows like the grid area.

## 9. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute-force recursion | exponential (about C(m+n−2, m−1) leaves) | O(m + n) stack | every path is walked separately; 3,997,447 calls for 12 × 12 |
| 2D table | O(m · n) | O(m · n) | each cell is one addition |
| One row | O(m · n) | O(n) | the same additions, one row kept (use the shorter side as n) |
| Binomial formula | O(min(m, n)) | O(1) | k multiply-and-divide steps |
| Obstacles (row DP) | O(m · n) | O(n) | one pass over the grid |

## 10. Edge Cases

- **1 × 1 grid:** 1 path (you are already there). **1 × n or m × 1:** 1 path, a straight line.
- **m and n swapped:** same answer, since C(m+n−2, m−1) = C(m+n−2, n−1).
- **Large grids:** the count overflows 32-bit integers from 18 × 18, and 64-bit long before 100 × 100.
- **Obstacles:** a blocked start or end gives 0; a full row of rocks gives 0.
- **Empty grid (m or n = 0):** not a valid input in the usual statement; decide with the interviewer.

## Common Pitfalls

- **\`new Array(m).fill(new Array(n))\`** puts one shared row in every slot. Use \`Array.from({ length: m }, () => ...)\`.
- **Trusting very large counts.** Past 2^53 − 1 a \`Number\` is rounded; the 100 × 100 answer was off after 15 digits. Use \`BigInt\` for big grids.
- **Forgetting that the first row and column are 1** (or, with obstacles, that they are not all 1 after a rock).
- **Recursing without a cache.** The brute force is exponential (3,997,447 calls for 12 × 12); a \`Map\` keyed by \`r + ',' + c\` fixes the complexity but the table is simpler.
- **Mixing up rows and columns** when m ≠ n — test with 3 × 7 and 7 × 3, which must both give 28.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The recurrence:</strong> <span style="color:#f0e2c8;">A cell is entered only from above or from the left, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">paths[r][c] = paths[r-1][c] + paths[r][c-1]</code>, with the first row and column all 1.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The table:</strong> <span style="color:#f0e2c8;">Fill it row by row; the answer is the bottom-right cell. O(m·n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Less space:</strong> <span style="color:#f0e2c8;">One row is enough: sweeping left to right, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row[c] += row[c - 1]</code> adds left to the old value above. O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The formula:</strong> <span style="color:#f0e2c8;">Every path is m−1 downs and n−1 rights in some order, so the answer is C(m+n−2, m−1), computed by multiply-then-divide steps.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Build rows with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from</code>, never one shared row via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fill</code>, and switch to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> once counts can pass 2^53 − 1.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes with obstacles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A rock cell gets 0 and the formula stops working. The row DP becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row[c] = 0</code> on a rock, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row[c] += row[c - 1]</code>; a blocked start gives 0 right away.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the binomial loop never produce a fraction?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After step i the value is C(total − k + i, i), a whole number; with doubles it stays exact as long as the values are below 2^53.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens for a 100 × 100 grid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number</code> loop printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2.2750883079422927e+58</code>, right only in its first 15 digits. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> the same loop is exact.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you do it recursively?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> memo on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count(r, c)</code>, which makes it O(m·n). Without the memo it is exponential: 3,997,447 calls for a 12 × 12 grid in our run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if moves could also go diagonally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add the third neighbour: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">paths[r][c] = above + left + diagonal</code>. The DP shape is the same; the binomial formula no longer applies.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Grid DP** | A DP table shaped like the grid, each cell computed from earlier neighbours |
| **Base case** | Values known without computing; here the first row and column are 1 |
| **Overlapping subproblems** | The same sub-grid is counted many times by plain recursion |
| **Rolling array** | Keeping only the last row of a DP table to save space |
| **Binomial coefficient C(N, k)** | The number of ways to choose k positions out of N |

---
**Conclusion:** Counting unique grid paths comes down to one observation: a cell is reached only from above or from the left, so its count is the sum of those two. Fill the table row by row in O(m·n) time, shrink it to one row with \`row[c] += row[c - 1]\`, or skip the table entirely with C(m+n−2, m−1) because every path is just an arrangement of downs and rights. The obstacles variant breaks the formula but not the DP. In JavaScript build rows with \`Array.from\` and remember that counts past 2^53 − 1 need \`BigInt\`.`,
        examples: [
          {
            label: `Unique paths: 2D table, one row, and the binomial formula`,
            code: `// dp[r][c] = number of right/down paths from (0, 0) to (r, c)
function pathTable(m, n) {
  const dp = Array.from({ length: m }, () => new Array(n).fill(1)); // first row and column are 1
  for (let r = 1; r < m; r++) {
    for (let c = 1; c < n; c++) {
      dp[r][c] = dp[r - 1][c] + dp[r][c - 1]; // arrive from above or from the left
    }
  }
  return dp;
}

function uniquePaths(m, n) {
  return pathTable(m, n)[m - 1][n - 1];
}

function uniquePathsRow(m, n) {
  const row = new Array(n).fill(1);        // row r of the table, reused in place
  for (let r = 1; r < m; r++) {
    for (let c = 1; c < n; c++) row[c] += row[c - 1]; // old row[c] is "above", row[c - 1] is "left"
  }
  return row[n - 1];
}

function uniquePathsFormula(m, n) {
  const k = Math.min(m - 1, n - 1);        // choose which k of the m+n-2 moves go the short way
  const total = m + n - 2;
  let res = 1;
  for (let i = 1; i <= k; i++) {
    res = res * (total - k + i) / i;       // exact: res is C(total - k + i, i) after each step
  }
  return res;
}

for (const [m, n] of [[1, 1], [3, 7], [3, 2], [7, 3], [10, 10], [17, 17], [23, 12]]) {
  console.log('grid ' + m + 'x' + n + ': table ' + uniquePaths(m, n) +
    ', one row ' + uniquePathsRow(m, n) + ', formula ' + uniquePathsFormula(m, n));
}
console.log('table for 3x7:');
for (const r of pathTable(3, 7)) console.log(r.join(' '));`,
          },
          {
            label: `Obstacles, and brute-force recursion vs DP call counts`,
            code: `function pathsWithObstacles(grid) {
  const m = grid.length, n = grid[0].length;
  const row = new Array(n).fill(0);
  row[0] = grid[0][0] === 0 ? 1 : 0;       // a blocked start means no paths at all
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === 1) row[c] = 0;    // nobody can stand on a rock
      else if (c > 0) row[c] += row[c - 1];
    }
  }
  return row[n - 1];
}

let calls = 0;

function brute(r, c, m, n) {
  calls++;
  if (r === m - 1 && c === n - 1) return 1;
  if (r >= m || c >= n) return 0;
  return brute(r + 1, c, m, n) + brute(r, c + 1, m, n);
}

const grids = [
  [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
  [[0, 1], [0, 0]],
  [[1, 0]],
  [[0, 0], [0, 1]],
  [[0, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1], [1, 0, 0, 0]],
];
for (const g of grids) {
  console.log('obstacles ' + g.map((row) => row.join('')).join('/') + ' -> ' + pathsWithObstacles(g));
}

for (const size of [6, 9, 12]) {
  calls = 0;
  const ways = brute(0, 0, size, size);
  console.log('brute force ' + size + 'x' + size + ': ' + ways + ' paths after ' + calls +
    ' calls; DP fills ' + size * size + ' cells');
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"A robot starts in the top-left corner of an m × n grid and can only move right or down. How many different paths can it take to the bottom-right corner? After that, what changes if some cells are blocked? Please code it in Java."

**What a strong answer should cover:**
- The recurrence: a cell can only be entered from above or from the left, so \`paths[r][c] = paths[r-1][c] + paths[r][c-1]\`, with the whole first row and first column equal to 1.
- O(m·n) time; space from O(m·n) down to O(n) by keeping a single row and updating it left to right.
- The closed form: every path is m−1 downs and n−1 rights in some order, so the answer is the binomial coefficient C(m+n−2, m−1), computable in O(min(m, n)) with exact integer steps.
- The obstacles variant: a blocked cell has 0 paths, and a blocked start or end makes the answer 0 — the formula no longer applies, the DP does.
- Java details: \`long\` for the counts and for the binomial loop's intermediate product (\`res * (total - k + i)\` overflows \`int\` long before the answer does), and \`BigInteger\` when the answer passes 2^63 − 1.

**Clarifying questions expected:**
- Are the moves only right and down?
- How large can m and n be — does the answer fit in 32 or 64 bits?
- Are there obstacles, and can the start or end cell itself be blocked?

**Code / implementation expected:** Yes — a Java DP over the grid (one row of space is a plus); the binomial formula is a good follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need nested loops and 2D arrays; no prior DP knowledge is assumed.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a city laid out as a perfect grid of streets, like a chessboard. You live at the top-left corner and your office is at the bottom-right. Every block you walk must bring you closer to work, so you only ever walk **east** or **south**. On Monday you go east-east-south; on Tuesday south-east-east. How many different routes could you take before you have to repeat one?

You could try to list them all, but for a 10 × 10 grid there are 48,620 of them. There is a much calmer way to think. Stand on any street corner and ask: "how did I get here?" You arrived either from the corner directly **north** of you or from the corner directly **west**. So the number of routes to your corner is the routes to the north corner plus the routes to the west corner. Start at home with 1 route (stand still), fill in the corners one by one, and the number at the office is your answer.

That "my count = the count above me + the count to my left" rule is the whole problem. It is the 2D cousin of [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem), and the first grid problem most people meet in [dynamic programming](/interview-question/what-is-dynamic-programming).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the only moves right and down? | Allowing up or left lets paths loop forever; the counting problem would change completely |
| How large are m and n? | 100 × 100 has about 2.3 × 10^58 paths, far past 64-bit integers |
| Are there blocked cells (obstacles)? | The closed-form formula no longer works; the DP still does |
| Can the start or the end be blocked? | Then the answer is 0 — easy to miss in code |
| Do you need the count or the paths themselves? | Listing all paths is exponential output; counting is polynomial |

## 3. The Core Idea: Above Plus Left

Number the rows \`r = 0 .. m−1\` and the columns \`c = 0 .. n−1\`. Let \`paths[r][c]\` be the number of right/down routes from the start \`(0, 0)\` to the cell \`(r, c)\`.

- Every cell in the **first row** can only be reached by walking right the whole way: exactly 1 route.
- Every cell in the **first column** can only be reached by walking down: exactly 1 route.
- Any other cell is entered either from above \`(r−1, c)\` or from the left \`(r, c−1)\`, and those two groups of routes never overlap (their last step differs). So the counts **add**.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 230" role="img" aria-label="A cell is reached from the cell above or the cell to its left, so its path count is the sum of the two">
  <defs>
    <marker id="b28q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="300" y="20" width="150" height="64" rx="10"/>
  <text class="d-text" x="375" y="48" text-anchor="middle">above</text>
  <text class="d-sub" x="375" y="70" text-anchor="middle">paths r-1, c</text>
  <rect class="d-box" x="60" y="140" width="150" height="64" rx="10"/>
  <text class="d-text" x="135" y="168" text-anchor="middle">left</text>
  <text class="d-sub" x="135" y="190" text-anchor="middle">paths r, c-1</text>
  <rect class="d-box-accent" x="300" y="140" width="150" height="64" rx="10"/>
  <text class="d-text" x="375" y="168" text-anchor="middle">this cell</text>
  <text class="d-sub" x="375" y="190" text-anchor="middle">above plus left</text>
  <path class="d-edge" d="M 375 86 L 375 136" marker-end="url(#b28q3-arrow)"/>
  <path class="d-edge" d="M 212 172 L 296 172" marker-end="url(#b28q3-arrow)"/>
</svg>

~~~text
paths[0][c] = 1, paths[r][0] = 1
paths[r][c] = paths[r-1][c] + paths[r][c-1]
answer = paths[m-1][n-1]
~~~

📌 **Interview term: Grid DP** — a dynamic programming table shaped like the grid itself, where each cell's value is computed from neighbouring cells that were filled earlier (here: the one above and the one to the left).

📌 **Interview term: Base case** — the values you know without computing: the first row and first column are all 1. See [What is recursion and what is a base case?](/interview-question/what-is-recursion-and-what-is-a-base-case).

Here is the full table for a 3 × 7 grid (example 1 prints it):

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The path count table for a 3 by 7 grid. The first row and column are 1 and the bottom right cell is 28">
  <rect class="d-box-muted" x="30" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="70" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="122" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="162" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="214" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="254" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="306" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="346" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="398" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="438" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="490" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="530" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="582" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="622" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="30" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="70" y="126" text-anchor="middle">1</text>
  <rect class="d-box" x="122" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="162" y="126" text-anchor="middle">2</text>
  <rect class="d-box" x="214" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="254" y="126" text-anchor="middle">3</text>
  <rect class="d-box" x="306" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="346" y="126" text-anchor="middle">4</text>
  <rect class="d-box" x="398" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="438" y="126" text-anchor="middle">5</text>
  <rect class="d-box" x="490" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="530" y="126" text-anchor="middle">6</text>
  <rect class="d-box" x="582" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="622" y="126" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="30" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="70" y="198" text-anchor="middle">1</text>
  <rect class="d-box" x="122" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="162" y="198" text-anchor="middle">3</text>
  <rect class="d-box" x="214" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="254" y="198" text-anchor="middle">6</text>
  <rect class="d-box" x="306" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="346" y="198" text-anchor="middle">10</text>
  <rect class="d-box" x="398" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="438" y="198" text-anchor="middle">15</text>
  <rect class="d-box" x="490" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="530" y="198" text-anchor="middle">21</text>
  <rect class="d-box-accent" x="582" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="622" y="198" text-anchor="middle">28</text>
</svg>

Check one cell: the 21 in the bottom row is 6 (above it) + 15 (to its left). The answer for 3 × 7 is the bottom-right 28.

## 4. Brute Force First, Then the Table, in Java

**Brute force.** A recursive function \`count(r, c)\` returns 1 at the target, 0 outside the grid, and otherwise \`count(r+1, c) + count(r, c+1)\`. It is correct but it re-walks the same sub-grids again and again: example 2 shows **3,997,447 calls** for a 12 × 12 grid, while the table fills **144 cells**. Adding a cache (memoization) to that recursion would fix it, but the table is just as simple.

📌 **Interview term: Overlapping subproblems** — the same smaller question asked many times. \`count(5, 5)\` is reached from both \`count(4, 5)\` and \`count(5, 4)\`, and each of those is reached many times too.

**The table:**

~~~java
// dp[r][c] = number of right/down paths from (0, 0) to (r, c)
static long[][] pathTable(int m, int n) {
    long[][] dp = new long[m][n];
    for (long[] row : dp) Arrays.fill(row, 1);   // first row and column are 1
    for (int r = 1; r < m; r++)
        for (int c = 1; c < n; c++)
            dp[r][c] = dp[r - 1][c] + dp[r][c - 1]; // arrive from above or from the left
    return dp;
}

static long uniquePaths(int m, int n) {
    return pathTable(m, n)[m - 1][n - 1];
}
~~~

**What to point out in this code:**

- \`new long[m][n]\` creates m separate rows, all zero; \`Arrays.fill(row, 1)\` sets each row to 1, which handles the first row and first column for free.
- The counts are \`long\`. A grid as small as 18 × 18 already has C(34, 17) = 2,333,606,220 paths, more than \`int\`'s maximum of 2,147,483,647, and \`int\` addition would wrap silently.
- The enhanced for loop \`for (long[] row : dp)\` iterates the row arrays themselves, so filling \`row\` fills the table.
- \`pathTable\` returns the full table so it can be printed; \`uniquePaths\` just reads the corner.

## 5. One Row Is Enough

Look at the recurrence again: row \`r\` only needs row \`r − 1\`. Better still, if you keep **one** array \`row\` and sweep it left to right, then just before you update \`row[c]\`:

- \`row[c]\` still holds the value from the previous row — that is **above**;
- \`row[c − 1]\` has already been updated in this row — that is **left**.

So \`row[c] += row[c − 1]\` is the whole recurrence, in O(n) space.

📌 **Interview term: Rolling array** — keeping only the last row (or last few values) of a DP table because the recurrence never looks further back. It turns O(m·n) space into O(n).

~~~java
static long uniquePathsRow(int m, int n) {
    long[] row = new long[n];                    // row r of the table, reused in place
    Arrays.fill(row, 1);
    for (int r = 1; r < m; r++)
        for (int c = 1; c < n; c++) row[c] += row[c - 1]; // old row[c] is "above", row[c - 1] is "left"
    return row[n - 1];
}

static long uniquePathsFormula(int m, int n) {
    int k = Math.min(m - 1, n - 1);              // choose which k of the m+n-2 moves go the short way
    int total = m + n - 2;
    long res = 1;
    for (int i = 1; i <= k; i++) {
        res = res * (total - k + i) / i;         // exact: res is C(total - k + i, i) after each step
    }
    return res;
}
~~~

The second function above is the closed form, explained next.

## 6. The Math Shortcut: a Binomial Coefficient

Every path from the top-left to the bottom-right of an m × n grid makes exactly **m − 1 down moves** and **n − 1 right moves**, in some order — 8 moves for a 3 × 7 grid, 2 of them down:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 140" role="img" aria-label="One path through a 3 by 7 grid written as eight moves: R R D R R R D R. Choosing where the two D moves go fixes the path">
  <rect class="d-box" x="20" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="52" y="74" text-anchor="middle">R</text>
  <rect class="d-box" x="102" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="134" y="74" text-anchor="middle">R</text>
  <rect class="d-box-accent" x="184" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="216" y="74" text-anchor="middle">D</text>
  <rect class="d-box" x="266" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="298" y="74" text-anchor="middle">R</text>
  <rect class="d-box" x="348" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="380" y="74" text-anchor="middle">R</text>
  <rect class="d-box" x="430" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="462" y="74" text-anchor="middle">R</text>
  <rect class="d-box-accent" x="512" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="544" y="74" text-anchor="middle">D</text>
  <rect class="d-box" x="594" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="626" y="74" text-anchor="middle">R</text>
</svg>

A path is decided entirely by **which positions** hold the D moves. So the count is "choose m − 1 positions out of m + n − 2", the binomial coefficient:

~~~text
paths(m, n) = C(m + n - 2, m - 1) = (m + n - 2)! / ((m - 1)! (n - 1)!)
3 x 7:  C(8, 2) = 28
10 x 10: C(18, 9) = 48620
~~~

📌 **Interview term: Binomial coefficient C(N, k)** — the number of ways to choose k items out of N, ignoring order ("N choose k"). The path table is Pascal's triangle turned on its side.

Computing factorials directly overflows almost immediately, so the code multiplies and divides one step at a time: after step i, \`res\` equals C(total − k + i, i), which is always a whole number, so each division is exact. Choosing \`k = min(m − 1, n − 1)\` keeps the loop short: O(min(m, n)) steps.

In Java the loop runs in \`long\`, and the **multiplication happens before the division**: \`res * (total - k + i)\` can be up to roughly \`total\` times larger than the final answer, so it can overflow \`long\` even when the answer would fit. For exact large answers use \`java.math.BigInteger\` with \`multiply\` and \`divide\`.

## 7. With Obstacles

The follow-up ("Unique Paths II") puts rocks on some cells. A rock cell has **0 paths** to it, and the formula is useless now, but the row DP adapts in two lines: set \`row[c] = 0\` on a rock, otherwise add the left neighbour. The start cell gets 1 only if it is free.

~~~java
static long pathsWithObstacles(int[][] grid) {
    int m = grid.length, n = grid[0].length;
    long[] row = new long[n];
    row[0] = grid[0][0] == 0 ? 1 : 0;            // a blocked start means no paths at all
    for (int r = 0; r < m; r++) {
        for (int c = 0; c < n; c++) {
            if (grid[r][c] == 1) row[c] = 0;     // nobody can stand on a rock
            else if (c > 0) row[c] += row[c - 1];
        }
    }
    return row[n - 1];
}
~~~

Unlike the plain version, the first row and column are **not** all 1 any more: everything to the right of a rock in row 0 (or below a rock in column 0) is unreachable. Starting the row at 0 and letting the loop handle row 0 too — the \`c > 0\` test skips the left neighbour of column 0 — covers that without special cases.

## 8. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (JDK 21, compiled as Java 17+ source). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the 2D table, the single row and the binomial formula agree** prints:

~~~text
grid 1x1: table 1, one row 1, formula 1
grid 3x7: table 28, one row 28, formula 28
grid 3x2: table 3, one row 3, formula 3
grid 7x3: table 28, one row 28, formula 28
grid 10x10: table 48620, one row 48620, formula 48620
grid 17x17: table 601080390, one row 601080390, formula 601080390
grid 23x12: table 193536720, one row 193536720, formula 193536720
table for 3x7:
1 1 1 1 1 1 1
1 2 3 4 5 6 7
1 3 6 10 15 21 28
~~~

The three methods give the same answer on every size, including the 1 × 1 grid (one path: stand still), the symmetric pair 3 × 7 and 7 × 3 (both 28, because C(8, 2) = C(8, 6)), and 17 × 17 with 601,080,390 paths. The table at the end is the one in section 3.

**Example 2 — obstacles, and brute force vs DP** prints:

~~~text
obstacles 000/010/000 -> 2
obstacles 01/00 -> 1
obstacles 10 -> 0
obstacles 00/01 -> 0
obstacles 0000/0100/0001/1000 -> 3
brute force 6x6: 252 paths after 1343 calls; DP fills 36 cells
brute force 9x9: 12870 paths after 71499 calls; DP fills 81 cells
brute force 12x12: 705432 paths after 3997447 calls; DP fills 144 cells
~~~

Grids are printed row by row with \`/\` between rows (1 = rock):

- \`000/010/000\` → 2: the rock in the middle leaves only the two routes around the edge.
- \`10\` → 0 (start blocked) and \`00/01\` → 0 (end blocked).
- The brute-force recursion needed 1,343 calls for 6 × 6, 71,499 for 9 × 9 and 3,997,447 for 12 × 12, while the DP filled 36, 81 and 144 cells. The call count grows roughly like the number of paths itself; the table grows like the grid area.

## 9. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute-force recursion | exponential (about C(m+n−2, m−1) leaves) | O(m + n) stack | every path is walked separately; 3,997,447 calls for 12 × 12 |
| 2D table | O(m · n) | O(m · n) | each cell is one addition |
| One row | O(m · n) | O(n) | the same additions, one row kept (use the shorter side as n) |
| Binomial formula | O(min(m, n)) | O(1) | k multiply-and-divide steps |
| Obstacles (row DP) | O(m · n) | O(n) | one pass over the grid |

## 10. Edge Cases

- **1 × 1 grid:** 1 path (you are already there). **1 × n or m × 1:** 1 path, a straight line.
- **m and n swapped:** same answer, since C(m+n−2, m−1) = C(m+n−2, n−1).
- **Large grids:** the count overflows 32-bit integers from 18 × 18, and 64-bit long before 100 × 100.
- **Obstacles:** a blocked start or end gives 0; a full row of rocks gives 0.
- **Empty grid (m or n = 0):** not a valid input in the usual statement; decide with the interviewer.

## Common Pitfalls

- **Counting in \`int\`.** 18 × 18 already overflows it, silently. Use \`long\`, and \`BigInteger\` beyond 2^63 − 1.
- **Dividing before multiplying** in the binomial loop (\`res / i * (total - k + i)\`): integer division truncates, so the result is wrong. Multiply first, then divide.
- **Forgetting that the first row and column are 1** (or, with obstacles, that they are not all 1 after a rock).
- **Recursing without a cache.** The brute force is exponential (3,997,447 calls for 12 × 12), and a very deep recursion can also throw \`StackOverflowError\`.
- **Mixing up rows and columns** when m ≠ n — test with 3 × 7 and 7 × 3, which must both give 28.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The recurrence:</strong> <span style="color:#f0e2c8;">A cell is entered only from above or from the left, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">paths[r][c] = paths[r-1][c] + paths[r][c-1]</code>, with the first row and column all 1.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The table:</strong> <span style="color:#f0e2c8;">Fill it row by row; the answer is the bottom-right cell. O(m·n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Less space:</strong> <span style="color:#f0e2c8;">One row is enough: sweeping left to right, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row[c] += row[c - 1]</code> adds left to the old value above. O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The formula:</strong> <span style="color:#f0e2c8;">Every path is m−1 downs and n−1 rights in some order, so the answer is C(m+n−2, m−1), computed by multiply-then-divide steps in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> counts, because 18 × 18 already overflows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> silently; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInteger</code> beyond 64 bits.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes with obstacles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A rock cell gets 0 and the formula stops working. The row DP becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row[c] = 0</code> on a rock, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row[c] += row[c - 1]</code>; a blocked start gives 0 right away.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why multiply before dividing in the formula?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Integer division truncates. After a multiply, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">res * (total - k + i)</code> is divisible by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> because the result is C(total − k + i, i); dividing first would lose the remainder.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the formula overflow when the answer fits?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: the intermediate product is up to about <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total</code> times the answer. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInteger</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.multiplyExact</code> to detect it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you do it recursively?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long[][]</code> memo, which makes it O(m·n). Without the memo it is exponential: 3,997,447 calls for a 12 × 12 grid in our run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if moves could also go diagonally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add the third neighbour: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">paths[r][c] = above + left + diagonal</code>. The DP shape is the same; the binomial formula no longer applies.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Grid DP** | A DP table shaped like the grid, each cell computed from earlier neighbours |
| **Base case** | Values known without computing; here the first row and column are 1 |
| **Overlapping subproblems** | The same sub-grid is counted many times by plain recursion |
| **Rolling array** | Keeping only the last row of a DP table to save space |
| **Binomial coefficient C(N, k)** | The number of ways to choose k positions out of N |

---
**Conclusion:** Counting unique grid paths comes down to one observation: a cell is reached only from above or from the left, so its count is the sum of those two. Fill the table row by row in O(m·n) time, shrink it to one row with \`row[c] += row[c - 1]\`, or skip the table entirely with C(m+n−2, m−1) because every path is just an arrangement of downs and rights. The obstacles variant breaks the formula but not the DP. In Java keep the counts in \`long\`, multiply before dividing in the formula, and reach for \`BigInteger\` for huge grids.`,
        examples: [
          {
            label: `Unique paths: 2D table, one row, and the binomial formula`,
            code: `import java.util.*;

public class Main {
    // dp[r][c] = number of right/down paths from (0, 0) to (r, c)
    static long[][] pathTable(int m, int n) {
        long[][] dp = new long[m][n];
        for (long[] row : dp) Arrays.fill(row, 1);   // first row and column are 1
        for (int r = 1; r < m; r++)
            for (int c = 1; c < n; c++)
                dp[r][c] = dp[r - 1][c] + dp[r][c - 1]; // arrive from above or from the left
        return dp;
    }

    static long uniquePaths(int m, int n) {
        return pathTable(m, n)[m - 1][n - 1];
    }

    static long uniquePathsRow(int m, int n) {
        long[] row = new long[n];                    // row r of the table, reused in place
        Arrays.fill(row, 1);
        for (int r = 1; r < m; r++)
            for (int c = 1; c < n; c++) row[c] += row[c - 1]; // old row[c] is "above", row[c - 1] is "left"
        return row[n - 1];
    }

    static long uniquePathsFormula(int m, int n) {
        int k = Math.min(m - 1, n - 1);              // choose which k of the m+n-2 moves go the short way
        int total = m + n - 2;
        long res = 1;
        for (int i = 1; i <= k; i++) {
            res = res * (total - k + i) / i;         // exact: res is C(total - k + i, i) after each step
        }
        return res;
    }

    public static void main(String[] args) {
        int[][] sizes = {{1, 1}, {3, 7}, {3, 2}, {7, 3}, {10, 10}, {17, 17}, {23, 12}};
        for (int[] s : sizes) {
            int m = s[0], n = s[1];
            System.out.println("grid " + m + "x" + n + ": table " + uniquePaths(m, n)
                + ", one row " + uniquePathsRow(m, n) + ", formula " + uniquePathsFormula(m, n));
        }
        System.out.println("table for 3x7:");
        for (long[] r : pathTable(3, 7)) {
            StringBuilder sb = new StringBuilder();
            for (int c = 0; c < r.length; c++) sb.append(c > 0 ? " " : "").append(r[c]);
            System.out.println(sb);
        }
    }
}`,
          },
          {
            label: `Obstacles, and brute-force recursion vs DP call counts`,
            code: `public class Main {
    static long pathsWithObstacles(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        long[] row = new long[n];
        row[0] = grid[0][0] == 0 ? 1 : 0;            // a blocked start means no paths at all
        for (int r = 0; r < m; r++) {
            for (int c = 0; c < n; c++) {
                if (grid[r][c] == 1) row[c] = 0;     // nobody can stand on a rock
                else if (c > 0) row[c] += row[c - 1];
            }
        }
        return row[n - 1];
    }

    static long calls = 0;

    static long brute(int r, int c, int m, int n) {
        calls++;
        if (r == m - 1 && c == n - 1) return 1;
        if (r >= m || c >= n) return 0;
        return brute(r + 1, c, m, n) + brute(r, c + 1, m, n);
    }

    static String show(int[][] g) {
        StringBuilder sb = new StringBuilder();
        for (int r = 0; r < g.length; r++) {
            if (r > 0) sb.append("/");
            for (int v : g[r]) sb.append(v);
        }
        return sb.toString();
    }

    public static void main(String[] args) {
        int[][][] grids = {
            {{0, 0, 0}, {0, 1, 0}, {0, 0, 0}},
            {{0, 1}, {0, 0}},
            {{1, 0}},
            {{0, 0}, {0, 1}},
            {{0, 0, 0, 0}, {0, 1, 0, 0}, {0, 0, 0, 1}, {1, 0, 0, 0}},
        };
        for (int[][] g : grids) System.out.println("obstacles " + show(g) + " -> " + pathsWithObstacles(g));
        for (int size : new int[]{6, 9, 12}) {
            calls = 0;
            long ways = brute(0, 0, size, size);
            System.out.println("brute force " + size + "x" + size + ": " + ways + " paths after " + calls
                + " calls; DP fills " + size * size + " cells");
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"A robot starts in the top-left corner of an m × n grid and can only move right or down. How many different paths can it take to the bottom-right corner? After that, what changes if some cells are blocked? Please code it in C++."

**What a strong answer should cover:**
- The recurrence: a cell can only be entered from above or from the left, so \`paths[r][c] = paths[r-1][c] + paths[r][c-1]\`, with the whole first row and first column equal to 1.
- O(m·n) time; space from O(m·n) down to O(n) by keeping a single row and updating it left to right.
- The closed form: every path is m−1 downs and n−1 rights in some order, so the answer is the binomial coefficient C(m+n−2, m−1), computable in O(min(m, n)) with exact integer steps.
- The obstacles variant: a blocked cell has 0 paths, and a blocked start or end makes the answer 0 — the formula no longer applies, the DP does.
- C++ details: \`long long\` for the counts and the binomial loop (signed overflow is undefined behaviour), multiplying before dividing so every step stays exact, and that the standard library has no big-integer type for very large grids.

**Clarifying questions expected:**
- Are the moves only right and down?
- How large can m and n be — does the answer fit in 32 or 64 bits?
- Are there obstacles, and can the start or end cell itself be blocked?

**Code / implementation expected:** Yes — a C++ DP over the grid (one row of space is a plus); the binomial formula is a good follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need nested loops and 2D arrays; no prior DP knowledge is assumed.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a city laid out as a perfect grid of streets, like a chessboard. You live at the top-left corner and your office is at the bottom-right. Every block you walk must bring you closer to work, so you only ever walk **east** or **south**. On Monday you go east-east-south; on Tuesday south-east-east. How many different routes could you take before you have to repeat one?

You could try to list them all, but for a 10 × 10 grid there are 48,620 of them. There is a much calmer way to think. Stand on any street corner and ask: "how did I get here?" You arrived either from the corner directly **north** of you or from the corner directly **west**. So the number of routes to your corner is the routes to the north corner plus the routes to the west corner. Start at home with 1 route (stand still), fill in the corners one by one, and the number at the office is your answer.

That "my count = the count above me + the count to my left" rule is the whole problem. It is the 2D cousin of [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem), and the first grid problem most people meet in [dynamic programming](/interview-question/what-is-dynamic-programming).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the only moves right and down? | Allowing up or left lets paths loop forever; the counting problem would change completely |
| How large are m and n? | 100 × 100 has about 2.3 × 10^58 paths, far past 64-bit integers |
| Are there blocked cells (obstacles)? | The closed-form formula no longer works; the DP still does |
| Can the start or the end be blocked? | Then the answer is 0 — easy to miss in code |
| Do you need the count or the paths themselves? | Listing all paths is exponential output; counting is polynomial |

## 3. The Core Idea: Above Plus Left

Number the rows \`r = 0 .. m−1\` and the columns \`c = 0 .. n−1\`. Let \`paths[r][c]\` be the number of right/down routes from the start \`(0, 0)\` to the cell \`(r, c)\`.

- Every cell in the **first row** can only be reached by walking right the whole way: exactly 1 route.
- Every cell in the **first column** can only be reached by walking down: exactly 1 route.
- Any other cell is entered either from above \`(r−1, c)\` or from the left \`(r, c−1)\`, and those two groups of routes never overlap (their last step differs). So the counts **add**.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 230" role="img" aria-label="A cell is reached from the cell above or the cell to its left, so its path count is the sum of the two">
  <defs>
    <marker id="b28q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="300" y="20" width="150" height="64" rx="10"/>
  <text class="d-text" x="375" y="48" text-anchor="middle">above</text>
  <text class="d-sub" x="375" y="70" text-anchor="middle">paths r-1, c</text>
  <rect class="d-box" x="60" y="140" width="150" height="64" rx="10"/>
  <text class="d-text" x="135" y="168" text-anchor="middle">left</text>
  <text class="d-sub" x="135" y="190" text-anchor="middle">paths r, c-1</text>
  <rect class="d-box-accent" x="300" y="140" width="150" height="64" rx="10"/>
  <text class="d-text" x="375" y="168" text-anchor="middle">this cell</text>
  <text class="d-sub" x="375" y="190" text-anchor="middle">above plus left</text>
  <path class="d-edge" d="M 375 86 L 375 136" marker-end="url(#b28q3-arrow)"/>
  <path class="d-edge" d="M 212 172 L 296 172" marker-end="url(#b28q3-arrow)"/>
</svg>

~~~text
paths[0][c] = 1, paths[r][0] = 1
paths[r][c] = paths[r-1][c] + paths[r][c-1]
answer = paths[m-1][n-1]
~~~

📌 **Interview term: Grid DP** — a dynamic programming table shaped like the grid itself, where each cell's value is computed from neighbouring cells that were filled earlier (here: the one above and the one to the left).

📌 **Interview term: Base case** — the values you know without computing: the first row and first column are all 1. See [What is recursion and what is a base case?](/interview-question/what-is-recursion-and-what-is-a-base-case).

Here is the full table for a 3 × 7 grid (example 1 prints it):

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The path count table for a 3 by 7 grid. The first row and column are 1 and the bottom right cell is 28">
  <rect class="d-box-muted" x="30" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="70" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="122" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="162" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="214" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="254" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="306" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="346" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="398" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="438" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="490" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="530" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="582" y="20" width="80" height="56" rx="8"/>
  <text class="d-text" x="622" y="54" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="30" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="70" y="126" text-anchor="middle">1</text>
  <rect class="d-box" x="122" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="162" y="126" text-anchor="middle">2</text>
  <rect class="d-box" x="214" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="254" y="126" text-anchor="middle">3</text>
  <rect class="d-box" x="306" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="346" y="126" text-anchor="middle">4</text>
  <rect class="d-box" x="398" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="438" y="126" text-anchor="middle">5</text>
  <rect class="d-box" x="490" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="530" y="126" text-anchor="middle">6</text>
  <rect class="d-box" x="582" y="92" width="80" height="56" rx="8"/>
  <text class="d-text" x="622" y="126" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="30" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="70" y="198" text-anchor="middle">1</text>
  <rect class="d-box" x="122" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="162" y="198" text-anchor="middle">3</text>
  <rect class="d-box" x="214" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="254" y="198" text-anchor="middle">6</text>
  <rect class="d-box" x="306" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="346" y="198" text-anchor="middle">10</text>
  <rect class="d-box" x="398" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="438" y="198" text-anchor="middle">15</text>
  <rect class="d-box" x="490" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="530" y="198" text-anchor="middle">21</text>
  <rect class="d-box-accent" x="582" y="164" width="80" height="56" rx="8"/>
  <text class="d-text" x="622" y="198" text-anchor="middle">28</text>
</svg>

Check one cell: the 21 in the bottom row is 6 (above it) + 15 (to its left). The answer for 3 × 7 is the bottom-right 28.

## 4. Brute Force First, Then the Table, in C++

**Brute force.** A recursive function \`count(r, c)\` returns 1 at the target, 0 outside the grid, and otherwise \`count(r+1, c) + count(r, c+1)\`. It is correct but it re-walks the same sub-grids again and again: example 2 shows **3,997,447 calls** for a 12 × 12 grid, while the table fills **144 cells**. Adding a cache (memoization) to that recursion would fix it, but the table is just as simple.

📌 **Interview term: Overlapping subproblems** — the same smaller question asked many times. \`count(5, 5)\` is reached from both \`count(4, 5)\` and \`count(5, 4)\`, and each of those is reached many times too.

**The table:**

~~~cpp
// dp[r][c] = number of right/down paths from (0, 0) to (r, c)
std::vector<std::vector<long long>> pathTable(int m, int n) {
    std::vector<std::vector<long long>> dp(m, std::vector<long long>(n, 1)); // first row and column are 1
    for (int r = 1; r < m; r++)
        for (int c = 1; c < n; c++)
            dp[r][c] = dp[r - 1][c] + dp[r][c - 1];  // arrive from above or from the left
    return dp;
}

long long uniquePaths(int m, int n) {
    return pathTable(m, n)[m - 1][n - 1];
}
~~~

**What to point out in this code:**

- \`std::vector<std::vector<long long>> dp(m, std::vector<long long>(n, 1))\` copies the inner vector m times, so every row is separate and starts at 1, which handles the first row and first column for free.
- The counts are \`long long\`. A grid as small as 18 × 18 already has C(34, 17) = 2,333,606,220 paths, more than a 32-bit \`int\` holds, and signed overflow is undefined behaviour.
- A vector of vectors allocates each row separately. For speed you can use one flat \`std::vector<long long>(m * n)\` and index \`r * n + c\` — or, better, the single row below.
- \`pathTable\` returns the full table by value; C++17 guarantees copy elision only for prvalues, but returning a named local is moved (or elided in practice), so this is not a deep copy.

## 5. One Row Is Enough

Look at the recurrence again: row \`r\` only needs row \`r − 1\`. Better still, if you keep **one** array \`row\` and sweep it left to right, then just before you update \`row[c]\`:

- \`row[c]\` still holds the value from the previous row — that is **above**;
- \`row[c − 1]\` has already been updated in this row — that is **left**.

So \`row[c] += row[c − 1]\` is the whole recurrence, in O(n) space.

📌 **Interview term: Rolling array** — keeping only the last row (or last few values) of a DP table because the recurrence never looks further back. It turns O(m·n) space into O(n).

~~~cpp
long long uniquePathsRow(int m, int n) {
    std::vector<long long> row(n, 1);               // row r of the table, reused in place
    for (int r = 1; r < m; r++)
        for (int c = 1; c < n; c++) row[c] += row[c - 1]; // old row[c] is "above", row[c - 1] is "left"
    return row[n - 1];
}

long long uniquePathsFormula(int m, int n) {
    int k = std::min(m - 1, n - 1);                 // choose which k of the m+n-2 moves go the short way
    int total = m + n - 2;
    long long res = 1;
    for (int i = 1; i <= k; i++) {
        res = res * (total - k + i) / i;            // exact: res is C(total - k + i, i) after each step
    }
    return res;
}
~~~

The second function above is the closed form, explained next.

## 6. The Math Shortcut: a Binomial Coefficient

Every path from the top-left to the bottom-right of an m × n grid makes exactly **m − 1 down moves** and **n − 1 right moves**, in some order — 8 moves for a 3 × 7 grid, 2 of them down:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 140" role="img" aria-label="One path through a 3 by 7 grid written as eight moves: R R D R R R D R. Choosing where the two D moves go fixes the path">
  <rect class="d-box" x="20" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="52" y="74" text-anchor="middle">R</text>
  <rect class="d-box" x="102" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="134" y="74" text-anchor="middle">R</text>
  <rect class="d-box-accent" x="184" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="216" y="74" text-anchor="middle">D</text>
  <rect class="d-box" x="266" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="298" y="74" text-anchor="middle">R</text>
  <rect class="d-box" x="348" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="380" y="74" text-anchor="middle">R</text>
  <rect class="d-box" x="430" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="462" y="74" text-anchor="middle">R</text>
  <rect class="d-box-accent" x="512" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="544" y="74" text-anchor="middle">D</text>
  <rect class="d-box" x="594" y="40" width="64" height="56" rx="8"/>
  <text class="d-text" x="626" y="74" text-anchor="middle">R</text>
</svg>

A path is decided entirely by **which positions** hold the D moves. So the count is "choose m − 1 positions out of m + n − 2", the binomial coefficient:

~~~text
paths(m, n) = C(m + n - 2, m - 1) = (m + n - 2)! / ((m - 1)! (n - 1)!)
3 x 7:  C(8, 2) = 28
10 x 10: C(18, 9) = 48620
~~~

📌 **Interview term: Binomial coefficient C(N, k)** — the number of ways to choose k items out of N, ignoring order ("N choose k"). The path table is Pascal's triangle turned on its side.

Computing factorials directly overflows almost immediately, so the code multiplies and divides one step at a time: after step i, \`res\` equals C(total − k + i, i), which is always a whole number, so each division is exact. Choosing \`k = min(m − 1, n − 1)\` keeps the loop short: O(min(m, n)) steps.

In C++ the loop runs in \`long long\`, and the **multiplication happens before the division**: \`res * (total - k + i)\` can be up to roughly \`total\` times larger than the final answer, so it can overflow even when the answer would fit. Unlike Python and Java, the C++ standard library has no big-integer type, so very large grids need a hand-written big number or an answer modulo a prime (with modular inverses for the division).

## 7. With Obstacles

The follow-up ("Unique Paths II") puts rocks on some cells. A rock cell has **0 paths** to it, and the formula is useless now, but the row DP adapts in two lines: set \`row[c] = 0\` on a rock, otherwise add the left neighbour. The start cell gets 1 only if it is free.

~~~cpp
long long pathsWithObstacles(const std::vector<std::vector<int>>& grid) {
    int m = grid.size(), n = grid[0].size();
    std::vector<long long> row(n, 0);
    row[0] = grid[0][0] == 0 ? 1 : 0;               // a blocked start means no paths at all
    for (int r = 0; r < m; r++) {
        for (int c = 0; c < n; c++) {
            if (grid[r][c] == 1) row[c] = 0;        // nobody can stand on a rock
            else if (c > 0) row[c] += row[c - 1];
        }
    }
    return row[n - 1];
}
~~~

Unlike the plain version, the first row and column are **not** all 1 any more: everything to the right of a rock in row 0 (or below a rock in column 0) is unreachable. Starting the row at 0 and letting the loop handle row 0 too — the \`c > 0\` test skips the left neighbour of column 0 — covers that without special cases.

## 8. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the 2D table, the single row and the binomial formula agree** prints:

~~~text
grid 1x1: table 1, one row 1, formula 1
grid 3x7: table 28, one row 28, formula 28
grid 3x2: table 3, one row 3, formula 3
grid 7x3: table 28, one row 28, formula 28
grid 10x10: table 48620, one row 48620, formula 48620
grid 17x17: table 601080390, one row 601080390, formula 601080390
grid 23x12: table 193536720, one row 193536720, formula 193536720
table for 3x7:
1 1 1 1 1 1 1
1 2 3 4 5 6 7
1 3 6 10 15 21 28
~~~

The three methods give the same answer on every size, including the 1 × 1 grid (one path: stand still), the symmetric pair 3 × 7 and 7 × 3 (both 28, because C(8, 2) = C(8, 6)), and 17 × 17 with 601,080,390 paths. The table at the end is the one in section 3.

**Example 2 — obstacles, and brute force vs DP** prints:

~~~text
obstacles 000/010/000 -> 2
obstacles 01/00 -> 1
obstacles 10 -> 0
obstacles 00/01 -> 0
obstacles 0000/0100/0001/1000 -> 3
brute force 6x6: 252 paths after 1343 calls; DP fills 36 cells
brute force 9x9: 12870 paths after 71499 calls; DP fills 81 cells
brute force 12x12: 705432 paths after 3997447 calls; DP fills 144 cells
~~~

Grids are printed row by row with \`/\` between rows (1 = rock):

- \`000/010/000\` → 2: the rock in the middle leaves only the two routes around the edge.
- \`10\` → 0 (start blocked) and \`00/01\` → 0 (end blocked).
- The brute-force recursion needed 1,343 calls for 6 × 6, 71,499 for 9 × 9 and 3,997,447 for 12 × 12, while the DP filled 36, 81 and 144 cells. The call count grows roughly like the number of paths itself; the table grows like the grid area.

## 9. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute-force recursion | exponential (about C(m+n−2, m−1) leaves) | O(m + n) stack | every path is walked separately; 3,997,447 calls for 12 × 12 |
| 2D table | O(m · n) | O(m · n) | each cell is one addition |
| One row | O(m · n) | O(n) | the same additions, one row kept (use the shorter side as n) |
| Binomial formula | O(min(m, n)) | O(1) | k multiply-and-divide steps |
| Obstacles (row DP) | O(m · n) | O(n) | one pass over the grid |

## 10. Edge Cases

- **1 × 1 grid:** 1 path (you are already there). **1 × n or m × 1:** 1 path, a straight line.
- **m and n swapped:** same answer, since C(m+n−2, m−1) = C(m+n−2, n−1).
- **Large grids:** the count overflows 32-bit integers from 18 × 18, and 64-bit long before 100 × 100.
- **Obstacles:** a blocked start or end gives 0; a full row of rocks gives 0.
- **Empty grid (m or n = 0):** not a valid input in the usual statement; decide with the interviewer.

## Common Pitfalls

- **Counting in \`int\`.** 18 × 18 already overflows it, and signed overflow is undefined behaviour. Use \`long long\`.
- **Dividing before multiplying** in the binomial loop (\`res / i * (total - k + i)\`): integer division truncates, so the result is wrong. Multiply first, then divide.
- **Forgetting that the first row and column are 1** (or, with obstacles, that they are not all 1 after a rock).
- **\`int m = grid.size()\`** narrows a \`size_t\` to \`int\`; fine for interview-sized grids, but compilers warn with \`-Wconversion\`, and comparing \`size_t\` with a negative \`int\` is a classic bug.
- **Mixing up rows and columns** when m ≠ n — test with 3 × 7 and 7 × 3, which must both give 28.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The recurrence:</strong> <span style="color:#f0e2c8;">A cell is entered only from above or from the left, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">paths[r][c] = paths[r-1][c] + paths[r][c-1]</code>, with the first row and column all 1.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The table:</strong> <span style="color:#f0e2c8;">Fill it row by row; the answer is the bottom-right cell. O(m·n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Less space:</strong> <span style="color:#f0e2c8;">One row is enough: sweeping left to right, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row[c] += row[c - 1]</code> adds left to the old value above. O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The formula:</strong> <span style="color:#f0e2c8;">Every path is m−1 downs and n−1 rights in some order, so the answer is C(m+n−2, m−1), computed by multiply-then-divide steps in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> counts, because 18 × 18 already overflows a 32-bit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, and signed overflow is undefined behaviour.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes with obstacles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A rock cell gets 0 and the formula stops working. The row DP becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row[c] = 0</code> on a rock, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row[c] += row[c - 1]</code>; a blocked start gives 0 right away.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why multiply before dividing in the formula?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Integer division truncates. After a multiply, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">res * (total - k + i)</code> is divisible by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> because the result is C(total − k + i, i); dividing first would lose the remainder.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the answer does not fit in 64 bits?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">C++ has no standard big integer. Either write a small big-number type, or return the count modulo a prime and replace the division with a modular inverse.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you do it recursively?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with a memo table, which makes it O(m·n). Without it it is exponential: 3,997,447 calls for a 12 × 12 grid in our run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if moves could also go diagonally?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add the third neighbour: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">paths[r][c] = above + left + diagonal</code>. The DP shape is the same; the binomial formula no longer applies.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Grid DP** | A DP table shaped like the grid, each cell computed from earlier neighbours |
| **Base case** | Values known without computing; here the first row and column are 1 |
| **Overlapping subproblems** | The same sub-grid is counted many times by plain recursion |
| **Rolling array** | Keeping only the last row of a DP table to save space |
| **Binomial coefficient C(N, k)** | The number of ways to choose k positions out of N |

---
**Conclusion:** Counting unique grid paths comes down to one observation: a cell is reached only from above or from the left, so its count is the sum of those two. Fill the table row by row in O(m·n) time, shrink it to one row with \`row[c] += row[c - 1]\`, or skip the table entirely with C(m+n−2, m−1) because every path is just an arrangement of downs and rights. The obstacles variant breaks the formula but not the DP. In C++ keep the counts in \`long long\`, multiply before dividing in the formula, and use a modulus when the answer outgrows 64 bits.`,
        examples: [
          {
            label: `Unique paths: 2D table, one row, and the binomial formula`,
            code: `#include <algorithm>
#include <iostream>
#include <vector>

// dp[r][c] = number of right/down paths from (0, 0) to (r, c)
std::vector<std::vector<long long>> pathTable(int m, int n) {
    std::vector<std::vector<long long>> dp(m, std::vector<long long>(n, 1)); // first row and column are 1
    for (int r = 1; r < m; r++)
        for (int c = 1; c < n; c++)
            dp[r][c] = dp[r - 1][c] + dp[r][c - 1];  // arrive from above or from the left
    return dp;
}

long long uniquePaths(int m, int n) {
    return pathTable(m, n)[m - 1][n - 1];
}

long long uniquePathsRow(int m, int n) {
    std::vector<long long> row(n, 1);               // row r of the table, reused in place
    for (int r = 1; r < m; r++)
        for (int c = 1; c < n; c++) row[c] += row[c - 1]; // old row[c] is "above", row[c - 1] is "left"
    return row[n - 1];
}

long long uniquePathsFormula(int m, int n) {
    int k = std::min(m - 1, n - 1);                 // choose which k of the m+n-2 moves go the short way
    int total = m + n - 2;
    long long res = 1;
    for (int i = 1; i <= k; i++) {
        res = res * (total - k + i) / i;            // exact: res is C(total - k + i, i) after each step
    }
    return res;
}

int main() {
    std::vector<std::pair<int, int>> sizes = {{1, 1}, {3, 7}, {3, 2}, {7, 3}, {10, 10}, {17, 17}, {23, 12}};
    for (auto [m, n] : sizes) {
        std::cout << "grid " << m << "x" << n << ": table " << uniquePaths(m, n)
                  << ", one row " << uniquePathsRow(m, n) << ", formula " << uniquePathsFormula(m, n) << "\\n";
    }
    std::cout << "table for 3x7:\\n";
    for (const auto& r : pathTable(3, 7)) {
        for (size_t c = 0; c < r.size(); c++) std::cout << (c ? " " : "") << r[c];
        std::cout << "\\n";
    }
}`,
          },
          {
            label: `Obstacles, and brute-force recursion vs DP call counts`,
            code: `#include <iostream>
#include <string>
#include <vector>

long long pathsWithObstacles(const std::vector<std::vector<int>>& grid) {
    int m = grid.size(), n = grid[0].size();
    std::vector<long long> row(n, 0);
    row[0] = grid[0][0] == 0 ? 1 : 0;               // a blocked start means no paths at all
    for (int r = 0; r < m; r++) {
        for (int c = 0; c < n; c++) {
            if (grid[r][c] == 1) row[c] = 0;        // nobody can stand on a rock
            else if (c > 0) row[c] += row[c - 1];
        }
    }
    return row[n - 1];
}

long long calls = 0;

long long brute(int r, int c, int m, int n) {
    calls++;
    if (r == m - 1 && c == n - 1) return 1;
    if (r >= m || c >= n) return 0;
    return brute(r + 1, c, m, n) + brute(r, c + 1, m, n);
}

std::string show(const std::vector<std::vector<int>>& g) {
    std::string s;
    for (size_t r = 0; r < g.size(); r++) {
        if (r) s += "/";
        for (int v : g[r]) s += std::to_string(v);
    }
    return s;
}

int main() {
    std::vector<std::vector<std::vector<int>>> grids = {
        {{0, 0, 0}, {0, 1, 0}, {0, 0, 0}},
        {{0, 1}, {0, 0}},
        {{1, 0}},
        {{0, 0}, {0, 1}},
        {{0, 0, 0, 0}, {0, 1, 0, 0}, {0, 0, 0, 1}, {1, 0, 0, 0}},
    };
    for (const auto& g : grids) std::cout << "obstacles " << show(g) << " -> " << pathsWithObstacles(g) << "\\n";
    for (int size : {6, 9, 12}) {
        calls = 0;
        long long ways = brute(0, 0, size, size);
        std::cout << "brute force " << size << "x" << size << ": " << ways << " paths after " << calls
                  << " calls; DP fills " << size * size << " cells\\n";
    }
}`,
          },
        ],
      },
    },
  },
  {
    title: `Decode ways DP: how do you handle 0 and 06 edge cases?`,
    difficulty: "medium",
    seoDescription: `Decode Ways DP: why a 0 cannot stand alone, why 06 is not a letter, the two-variable recurrence, and verified Python, JavaScript, Java and C++ code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"A message of letters A to Z was encoded as numbers, A = 1, B = 2, up to Z = 26, and the numbers were written next to each other with no separators. Given the digit string, count how many ways it can be decoded. Pay special attention to zeros — what do you do with a string like '06' or '100'? Code it in Python."

**What a strong answer should cover:**
- The state: \`dp[i]\` = number of ways to decode the first \`i\` digits, with \`dp[0] = 1\` (the empty prefix has one decoding: nothing).
- The two moves: the last letter used one digit (allowed only if that digit is not \`0\`, add \`dp[i-1]\`) or two digits (allowed only if they form 10 to 26, add \`dp[i-2]\`).
- The zero rules: a \`0\` can never stand alone, so it must be the second digit of \`10\` or \`20\`; \`06\` is not a letter because a two-digit code cannot start with \`0\`; \`30\`, \`00\` or a leading \`0\` make the whole answer 0.
- O(n) time and O(1) space with two rolling variables, compared with the exponential plain recursion (the all-\`1\` string grows like Fibonacci).
- Python details: comparing single characters (\`s[i - 1] == "2" and s[i] <= "6"\`) instead of \`int(s[i-1:i+1])\` avoids building a slice each step, and \`int("06")\` returns 6, which is exactly the bug the question is fishing for.

**Clarifying questions expected:**
- Can the string contain zeros, and can it start with one?
- What should an empty string return?
- Can the answer be large — should it be returned modulo something?

**Code / implementation expected:** Yes — a one-pass Python DP with two rolling variables, tested on \`"06"\`, \`"10"\`, \`"100"\` and \`"226"\`.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, strings and characters; the DP idea is built up from scratch.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two kids invent a secret code: A is 1, B is 2, and so on up to Z = 26. One of them passes a note that just says **226**. The other kid frowns: is that 2-2-6 (**BBF**), 22-6 (**VF**) or 2-26 (**BZ**)? All three are real words in their code. The note has **three** possible meanings, because they forgot to put spaces between the numbers.

The next note says **06**. That one is broken: there is no letter 0, and "06" is not how anyone would write 6. And **10** has exactly one meaning, J, because the 0 cannot be a letter on its own, so it must be glued to the 1 in front of it.

Counting how many meanings a note can have — without listing them, because a long note can have millions — is the Decode Ways problem. The counting part is easy dynamic programming; the zeros are where almost everyone loses points, so this page spends most of its time on them.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the string contain \`0\`, and can it start with \`0\`? | Zeros are the whole difficulty; a leading \`0\` makes the answer 0 at once |
| Is \`06\` a valid code for F? | The standard rule is no — a two-digit code must be 10 to 26 — but confirm it |
| What should an empty string return? | The DP naturally says 1 (one empty decoding); some interviewers want 0 |
| Is the input only digits? | Otherwise you need validation first |
| How long can the string be — could the count overflow? | An all-\`1\` string of length 40 already has 165,580,141 decodings |

## 3. The Core Idea: Look at the Last Letter

📌 **Interview term: Prefix DP** — a DP where \`dp[i]\` answers the question for the first \`i\` characters of the input, and is built from shorter prefixes.

Let \`dp[i]\` be the number of ways to decode the **first \`i\` digits**. Every decoding of those \`i\` digits ends with some letter, and that last letter used either **one** digit or **two**:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The last letter uses one digit, allowed when that digit is not zero, or two digits, allowed when they form 10 to 26">
  <defs>
    <marker id="b28q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="200" height="60" rx="10"/>
  <text class="d-text" x="350" y="46" text-anchor="middle">dp of i</text>
  <text class="d-sub" x="350" y="68" text-anchor="middle">first i digits</text>
  <path class="d-edge" d="M 300 82 L 170 140" marker-end="url(#b28q4-arrow)"/>
  <path class="d-edge" d="M 400 82 L 530 140" marker-end="url(#b28q4-arrow)"/>
  <rect class="d-box" x="30" y="144" width="280" height="80" rx="10"/>
  <text class="d-text" x="170" y="174" text-anchor="middle">last letter is 1 digit</text>
  <text class="d-sub" x="170" y="200" text-anchor="middle">digit is 1 to 9: add dp of i-1</text>
  <rect class="d-box" x="390" y="144" width="280" height="80" rx="10"/>
  <text class="d-text" x="530" y="174" text-anchor="middle">last letter is 2 digits</text>
  <text class="d-sub" x="530" y="200" text-anchor="middle">10 to 26: add dp of i-2</text>
</svg>

~~~text
dp[0] = 1                                   the empty prefix: one way (decode nothing)
dp[i] = (s[i-1] != '0'            ? dp[i-1] : 0)
      + (10 <= s[i-2..i-1] <= 26  ? dp[i-2] : 0)
answer = dp[n]
~~~

The two cases never overlap (the last letter has a different length), so the counts **add**. This is the same shape as [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem) — take one step or two — except that each step is only allowed when the digits form a real letter.

📌 **Interview term: Empty-prefix base case** — \`dp[0] = 1\`. It is not "the answer for an empty string" so much as a bookkeeping value: when the first two digits form a letter, \`dp[2]\` must count that one decoding, and it does so by adding \`dp[0]\`.

## 4. The Zero Rules — Where the Points Are

The letters are 1 to 26. That one fact gives every zero rule:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Zero rules. A single 0 is not a letter. 06 is not a letter because a two digit code cannot start with 0. 10 and 20 are letters J and T. 30 to 90 are not letters">
  <rect class="d-box-muted" x="20" y="20" width="310" height="70" rx="10"/>
  <text class="d-text" x="175" y="50" text-anchor="middle">0 alone</text>
  <text class="d-sub" x="175" y="74" text-anchor="middle">no letter 0: one-digit move is banned</text>
  <rect class="d-box-muted" x="370" y="20" width="310" height="70" rx="10"/>
  <text class="d-text" x="525" y="50" text-anchor="middle">06, 05, 00</text>
  <text class="d-sub" x="525" y="74" text-anchor="middle">two digits starting with 0 are banned</text>
  <rect class="d-box-accent" x="20" y="130" width="310" height="70" rx="10"/>
  <text class="d-text" x="175" y="160" text-anchor="middle">10 and 20</text>
  <text class="d-sub" x="175" y="184" text-anchor="middle">J and T: the only home for a 0</text>
  <rect class="d-box-muted" x="370" y="130" width="310" height="70" rx="10"/>
  <text class="d-text" x="525" y="160" text-anchor="middle">30, 40, up to 90</text>
  <text class="d-sub" x="525" y="184" text-anchor="middle">bigger than 26: the 0 is stranded</text>
  <rect class="d-box" x="195" y="230" width="310" height="56" rx="10"/>
  <text class="d-text" x="350" y="264" text-anchor="middle">stranded 0 means 0 ways in total</text>
</svg>

Put together:

- **A \`0\` can never be a letter by itself.** So the one-digit move is skipped when \`s[i-1]\` is \`0\`.
- **A two-digit code must be 10 to 26.** \`06\` is not F: the first digit of a two-digit code must be \`1\`, or \`2\` with a second digit of \`0\` to \`6\`. Checking the characters this way rules out \`06\` automatically.
- **So every \`0\` must be the second half of \`10\` or \`20\`.** If the digit before it is anything else (\`0\`, \`3\` to \`9\`) or there is no digit before it (a leading \`0\`), that zero cannot be placed, both moves are banned at that position, \`dp\` becomes 0, and the whole answer is 0: \`"06"\`, \`"0"\`, \`"100"\`, \`"230"\` all give 0.
- **A zero also removes options from its neighbour.** In \`"2101"\`, the \`1\` before the \`0\` cannot be its own letter — it is needed for \`10\` — so \`"2101"\` has just one decoding, BJA.

📌 **Interview term: Leading zero** — a \`0\` at the start of a number, as in \`06\`. In this problem a code with a leading zero is invalid, and a string whose first digit is \`0\` has no decoding at all.

**The \`int("06")\` trap.** The natural way to test the two-digit case is to convert the two characters to a number and check \`10 <= x <= 26\`. That works — as long as you check \`>= 10\`, not \`>= 1\`. Converting \`"06"\` gives 6 in every language (we ran it: Python \`int\`, JavaScript \`Number\` and \`parseInt\`, Java \`Integer.parseInt\`, C++ \`std::stoi\` all returned 6), so a check like \`x <= 26\` alone happily accepts \`06\` as a letter. The character test \`first == '1' or (first == '2' and second <= '6')\` cannot make that mistake.

## 5. The Table on "11106"

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="dp table for 11106 is 1, 1, 2, 3, 2, 2. At the zero only the two digit move 10 is allowed, and at the final 6 only the one digit move is allowed because 06 is not a letter">
  <rect class="d-box-muted" x="20" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="65" y="94" text-anchor="middle">1</text>
  <rect class="d-box" x="130" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="175" y="94" text-anchor="middle">1</text>
  <rect class="d-box" x="240" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="285" y="94" text-anchor="middle">2</text>
  <rect class="d-box" x="350" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="395" y="94" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="460" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="505" y="94" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="570" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="615" y="94" text-anchor="middle">2</text>
  <text class="d-sub" x="65" y="40" text-anchor="middle">empty</text>
  <text class="d-sub" x="175" y="40" text-anchor="middle">1</text>
  <text class="d-sub" x="285" y="40" text-anchor="middle">11</text>
  <text class="d-sub" x="395" y="40" text-anchor="middle">111</text>
  <text class="d-sub" x="505" y="40" text-anchor="middle">1110</text>
  <text class="d-sub" x="615" y="40" text-anchor="middle">11106</text>
  <text class="d-sub" x="505" y="150" text-anchor="middle">only 10</text>
  <text class="d-sub" x="505" y="172" text-anchor="middle">dp 2 copied</text>
  <text class="d-sub" x="615" y="150" text-anchor="middle">only 6</text>
  <text class="d-sub" x="615" y="172" text-anchor="middle">06 banned</text>
</svg>

| i | prefix | one-digit move | two-digit move | dp[i] |
| :--- | :--- | :--- | :--- | :--- |
| 0 | (empty) | — | — | 1 |
| 1 | 1 | \`1\` ok → dp[0] = 1 | — | 1 |
| 2 | 11 | \`1\` ok → dp[1] = 1 | \`11\` ok → dp[0] = 1 | 2 |
| 3 | 111 | \`1\` ok → dp[2] = 2 | \`11\` ok → dp[1] = 1 | 3 |
| 4 | 1110 | \`0\` **banned** | \`10\` ok → dp[2] = 2 | 2 |
| 5 | 11106 | \`6\` ok → dp[4] = 2 | \`06\` **banned** | 2 |

The two decodings are AAJF (1-1-10-6) and KJF (11-10-6), exactly what example 1 lists. Notice row 4: the zero **removed** the option "111 then 0" and forced the 1 before it into \`10\`, so dp dropped from 3 to 2.

## 6. From Recursion to Two Variables in Python

**Plain recursion** follows the definition: \`ways(i)\` returns 1 at the end of the string, 0 at a \`0\`, otherwise \`ways(i+1)\` plus (if the next two digits form 10 to 26) \`ways(i+2)\`. It is correct but exponential: on a string of thirty \`1\`s it made **3,524,577 calls** in example 2, because \`ways(i+2)\` is recomputed inside \`ways(i+1)\` too.

📌 **Interview term: Overlapping subproblems** — the same \`ways(i)\` is asked for again and again by different branches; caching or tabulating it makes each one cost O(1).

**The table** (\`dp\` array of length n + 1) fixes that. Since \`dp[i]\` only reads \`dp[i-1]\` and \`dp[i-2]\`, two variables are enough:

~~~python
def num_decodings(s):
    if not s:
        return 1                           # one way to decode nothing (ask your interviewer)
    prev, cur = 1, (1 if s[0] != "0" else 0)   # dp[i-1], dp[i] for i = 1
    for i in range(1, len(s)):
        nxt = 0
        if s[i] != "0":                    # s[i] alone is a letter 1..9
            nxt = cur
        if s[i - 1] == "1" or (s[i - 1] == "2" and s[i] <= "6"):   # 10..26, never 06
            nxt += prev
        prev, cur = cur, nxt
    return cur
~~~

**What to point out in this code:**

- \`prev\` and \`cur\` play the roles of \`dp[i-1]\` and \`dp[i]\`; the tuple assignment \`prev, cur = cur, nxt\` shifts both at once.
- \`cur\` starts as \`1 if s[0] != "0" else 0\`, so a leading zero zeroes the count immediately — and since every later step adds multiples of \`cur\` and \`prev\`, the answer stays 0.
- \`s[i] <= "6"\` compares two one-character strings, which compares their code points; for single digits that is the same as comparing the numbers. It would **not** be safe for longer strings (\`"10" <= "6"\` is \`True\`).
- No slicing or \`int()\` in the loop, so each step is O(1) with no new objects; the table version in example 1 uses \`int(s[i - 2:i])\` with the \`>= 10\` check to show the other style.
- The empty-string rule (\`return 1\`) is a choice — say it out loud and change it if the interviewer prefers 0.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the zero edge cases, with every decoding listed by a small backtracking search** prints:

~~~text
"12" -> 2: AB, L
"226" -> 3: BBF, BZ, VF
"06" -> 0
"0" -> 0
"10" -> 1: J
"100" -> 0
"2101" -> 1: BJA
"27" -> 1: BG
"11106" -> 2: AAJF, KJF
"230" -> 0
"1201234" -> 3: ATABCD, ATAWD, ATLCD
dp table for "11106": [1, 1, 2, 3, 2, 2]
dp table for "226": [1, 1, 2, 3]
~~~

Read it against the rules from section 4:

- \`"06" -> 0\` and \`"0" -> 0\`: a leading zero has nowhere to go.
- \`"10" -> 1\` (J) — the zero is glued to the 1. \`"100" -> 0\` — the second zero has only another zero before it, and \`00\` is not a letter.
- \`"230" -> 0\`: \`30\` is above 26, so the zero is stranded even though \`23\` alone is a fine letter.
- \`"2101" -> 1\`: the zero forces \`10\`, which removes every other split.
- \`"1201234" -> 3\`: the zero forces \`20\`, then \`1234\` decodes three ways (ABCD, AWD, LCD), each prefixed by A and T.
- The two dp tables match section 5 and the 226 story: \`[1, 1, 2, 3]\`.

**Example 2 — plain recursion vs the DP** prints:

~~~text
n=10 ones: naive 89 after 232 calls, DP 89 in one pass
n=20 ones: naive 10946 after 28656 calls, DP 10946 in one pass
n=30 ones: naive 1346269 after 3524577 calls, DP 1346269 in one pass
n=40 ones: DP 165580141
n=40 of 2 then 7 repeated: DP 1
n=40 of 26 repeated: DP 1048576
~~~

For a string of n ones the count is a Fibonacci number (89, 10946, 1346269, …), because every position can take one digit or two — exactly climbing stairs. The plain recursion's calls grow at the same rate (232 → 28,656 → 3,524,577) while the DP makes one pass. \`"27"\` repeated has only 1 decoding (27 is not a letter), and \`"26"\` repeated 20 times has 2^20 = 1,048,576, because each \`26\` independently splits or not.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential (Fibonacci-like) | O(n) stack | \`ways(i+2)\` is recomputed inside \`ways(i+1)\`; 3,524,577 calls for n = 30 |
| Memoized recursion | O(n) | O(n) memo + O(n) stack | each \`ways(i)\` computed once |
| DP table | O(n) | O(n) | one pass, \`dp\` of length n + 1 |
| Two variables | O(n) | O(1) | only \`dp[i-1]\` and \`dp[i-2]\` are ever read |

The memoized recursive version in Python would need one stack frame per digit; with the default recursion limit of 1000, a string of a few thousand digits raises \`RecursionError\`, which the loop version cannot.

## 9. Edge Cases

- **Leading zero** (\`"0"\`, \`"06"\`, \`"012"\`): answer 0.
- **\`10\` and \`20\`:** exactly one way to place the zero. \`"10"\` → 1, \`"20"\` → 1.
- **\`00\` anywhere, or \`30\` to \`90\`:** answer 0 — the second zero, or the zero after a 3 to 9, has nowhere to go.
- **\`27\` to \`99\` with no zero:** only the one-digit move; \`"27"\` → 1.
- **Long runs of \`1\` and \`2\`:** the count grows like Fibonacci; check the number type (or a modulus).
- **Empty string:** the DP returns 1; confirm what the interviewer wants.

## Common Pitfalls

- **Testing \`int(two) <= 26\` without \`>= 10\`.** \`int("06")\` is 6, so \`06\` slips through as F. Use the character test, or check both bounds.
- **Forgetting the one-digit ban on \`0\`.** Without it, \`"10"\` counts 2 (1-0 and 10) instead of 1.
- **\`dp[0] = 0\` instead of 1.** Then \`"12"\` gives 1 instead of 2, because the "12 as one letter" decoding has nothing to build on.
- **Comparing multi-character strings** such as \`s[i-1:i+1] <= "26"\`. String comparison is lexicographic: \`"3" <= "26"\` is \`False\` but \`"100" <= "26"\` is \`True\`. Compare numbers, or single characters.
- **Recursion without a cache** — exponential (3,524,577 calls for thirty \`1\`s) — and with a cache, the 1000-frame recursion limit on long strings.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i]</code> is the number of ways to decode the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> digits, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0] = 1</code> for the empty prefix.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The two moves:</strong> <span style="color:#f0e2c8;">The last letter is one digit (only if it is not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i-1]</code>) or two digits (only if they form 10 to 26, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i-2]</code>).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The zero rules:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> must be the second half of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">10</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">20</code>. A leading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">00</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">30</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">90</code> strands it, and the answer becomes 0. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">06</code> is not F.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n) time, and O(1) space with two variables, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i]</code> only reads the previous two values.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">I compare characters, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[i - 1] == "2" and s[i] &lt;= "6"</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int("06")</code> is 6 and would sneak <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">06</code> in as a letter.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does "100" return, and why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">0. The first zero pairs with the 1 to make J, but the second zero has only a 0 before it, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">00</code> is not a letter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is dp[0] equal to 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the one way to decode nothing. Without it, a string like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"12"</code> would not count the decoding that uses both digits as one letter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you list the decodings, not just count them?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Backtracking: at each index try a one-digit letter and, if valid, a two-digit letter, and record the path at the end. The output can be exponential, as for long runs of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1</code>s.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the string can contain <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">*</code> as a wildcard for 1 to 9?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same DP, but each move is multiplied by how many digits the wildcard can be (9 for one digit, 15 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">**</code> as two digits), usually returned modulo 1,000,000,007.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is recursion with lru_cache fine?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is O(n), but uses one stack frame per digit, so Python raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RecursionError</code> past about 1000 digits by default. The loop version has no such limit.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix DP** | \`dp[i]\` answers the question for the first \`i\` characters |
| **Empty-prefix base case** | \`dp[0] = 1\`: one way to decode nothing, the seed of the recurrence |
| **Leading zero** | A \`0\` at the start of a code; \`06\` is not a valid two-digit letter |
| **Overlapping subproblems** | The same suffix is decoded many times by plain recursion |

---
**Conclusion:** Decode Ways is climbing stairs with rules: \`dp[i]\` counts decodings of the first \`i\` digits, the last letter takes one digit (never a lone \`0\`) or two digits (only 10 to 26), and \`dp[0] = 1\` seeds it all. The zeros are the real question: a \`0\` must be the second half of \`10\` or \`20\`, so a leading zero, \`00\`, or \`30\` to \`90\` make the answer 0, and \`06\` is never F. Two variables give O(n) time and O(1) space. In Python, test the two-digit case with characters rather than \`int()\`, because \`int("06")\` is 6.`,
        examples: [
          {
            label: `Decode ways on the zero edge cases, with every decoding listed`,
            code: `def num_decodings(s):
    if not s:
        return 1                           # one way to decode nothing (ask your interviewer)
    prev, cur = 1, (1 if s[0] != "0" else 0)   # dp[i-1], dp[i] for i = 1
    for i in range(1, len(s)):
        nxt = 0
        if s[i] != "0":                    # s[i] alone is a letter 1..9
            nxt = cur
        if s[i - 1] == "1" or (s[i - 1] == "2" and s[i] <= "6"):   # 10..26, never 06
            nxt += prev
        prev, cur = cur, nxt
    return cur


def decode_table(s):
    n = len(s)
    dp = [0] * (n + 1)                     # dp[i] = ways to decode the first i digits
    dp[0] = 1
    for i in range(1, n + 1):
        if s[i - 1] != "0":
            dp[i] += dp[i - 1]             # last letter uses one digit
        if i >= 2 and 10 <= int(s[i - 2:i]) <= 26:
            dp[i] += dp[i - 2]             # last letter uses two digits
    return dp


def all_decodings(s, i=0, path=""):
    if i == len(s):
        return [path]
    out = []
    if s[i] != "0":
        out += all_decodings(s, i + 1, path + chr(64 + int(s[i])))
        if i + 1 < len(s) and 10 <= int(s[i:i + 2]) <= 26:
            out += all_decodings(s, i + 2, path + chr(64 + int(s[i:i + 2])))
    return out


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


for s in ["12", "226", "06", "0", "10", "100", "2101", "27", "11106", "230", "1201234"]:
    ways = num_decodings(s)
    line = '"' + s + '" -> ' + str(ways)
    if ways > 0:
        line += ": " + ", ".join(all_decodings(s))
    print(line)
print('dp table for "11106": ' + fmt(decode_table("11106")))
print('dp table for "226": ' + fmt(decode_table("226")))`,
          },
          {
            label: `Naive recursion vs DP: call counts and the Fibonacci pattern`,
            code: `def num_decodings(s):
    if not s:
        return 1                           # one way to decode nothing (ask your interviewer)
    prev, cur = 1, (1 if s[0] != "0" else 0)   # dp[i-1], dp[i] for i = 1
    for i in range(1, len(s)):
        nxt = 0
        if s[i] != "0":                    # s[i] alone is a letter 1..9
            nxt = cur
        if s[i - 1] == "1" or (s[i - 1] == "2" and s[i] <= "6"):   # 10..26, never 06
            nxt += prev
        prev, cur = cur, nxt
    return cur


calls = 0


def naive(s, i):
    global calls
    calls += 1
    if i == len(s):
        return 1
    if s[i] == "0":
        return 0
    ways = naive(s, i + 1)
    if i + 1 < len(s) and (s[i] == "1" or (s[i] == "2" and s[i + 1] <= "6")):
        ways += naive(s, i + 2)
    return ways


for n in [10, 20, 30]:
    s = "1" * n
    calls = 0
    a = naive(s, 0)
    print("n=" + str(n) + " ones: naive " + str(a) + " after " + str(calls) + " calls, DP " + str(num_decodings(s)) + " in one pass")
print("n=40 ones: DP " + str(num_decodings("1" * 40)))
print("n=40 of 2 then 7 repeated: DP " + str(num_decodings("27" * 20)))
print("n=40 of 26 repeated: DP " + str(num_decodings("26" * 20)))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"A message of letters A to Z was encoded as numbers, A = 1, B = 2, up to Z = 26, and the numbers were written next to each other with no separators. Given the digit string, count how many ways it can be decoded. Pay special attention to zeros — what do you do with a string like '06' or '100'? Code it in JavaScript."

**What a strong answer should cover:**
- The state: \`dp[i]\` = number of ways to decode the first \`i\` digits, with \`dp[0] = 1\` (the empty prefix has one decoding: nothing).
- The two moves: the last letter used one digit (allowed only if that digit is not \`0\`, add \`dp[i-1]\`) or two digits (allowed only if they form 10 to 26, add \`dp[i-2]\`).
- The zero rules: a \`0\` can never stand alone, so it must be the second digit of \`10\` or \`20\`; \`06\` is not a letter because a two-digit code cannot start with \`0\`; \`30\`, \`00\` or a leading \`0\` make the whole answer 0.
- O(n) time and O(1) space with two rolling variables, compared with the exponential plain recursion (the all-\`1\` string grows like Fibonacci).
- JavaScript details: comparing characters (\`s[i] <= '6'\` compares strings, which works for single digits) and that \`Number('06')\` and \`parseInt('06')\` both return 6, which is exactly the bug the question is fishing for.

**Clarifying questions expected:**
- Can the string contain zeros, and can it start with one?
- What should an empty string return?
- Can the answer be large — should it be returned modulo something?

**Code / implementation expected:** Yes — a one-pass JavaScript DP with two rolling variables, tested on \`"06"\`, \`"10"\`, \`"100"\` and \`"226"\`.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, strings and characters; the DP idea is built up from scratch.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two kids invent a secret code: A is 1, B is 2, and so on up to Z = 26. One of them passes a note that just says **226**. The other kid frowns: is that 2-2-6 (**BBF**), 22-6 (**VF**) or 2-26 (**BZ**)? All three are real words in their code. The note has **three** possible meanings, because they forgot to put spaces between the numbers.

The next note says **06**. That one is broken: there is no letter 0, and "06" is not how anyone would write 6. And **10** has exactly one meaning, J, because the 0 cannot be a letter on its own, so it must be glued to the 1 in front of it.

Counting how many meanings a note can have — without listing them, because a long note can have millions — is the Decode Ways problem. The counting part is easy dynamic programming; the zeros are where almost everyone loses points, so this page spends most of its time on them.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the string contain \`0\`, and can it start with \`0\`? | Zeros are the whole difficulty; a leading \`0\` makes the answer 0 at once |
| Is \`06\` a valid code for F? | The standard rule is no — a two-digit code must be 10 to 26 — but confirm it |
| What should an empty string return? | The DP naturally says 1 (one empty decoding); some interviewers want 0 |
| Is the input only digits? | Otherwise you need validation first |
| How long can the string be — could the count overflow? | An all-\`1\` string of length 40 already has 165,580,141 decodings |

## 3. The Core Idea: Look at the Last Letter

📌 **Interview term: Prefix DP** — a DP where \`dp[i]\` answers the question for the first \`i\` characters of the input, and is built from shorter prefixes.

Let \`dp[i]\` be the number of ways to decode the **first \`i\` digits**. Every decoding of those \`i\` digits ends with some letter, and that last letter used either **one** digit or **two**:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The last letter uses one digit, allowed when that digit is not zero, or two digits, allowed when they form 10 to 26">
  <defs>
    <marker id="b28q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="200" height="60" rx="10"/>
  <text class="d-text" x="350" y="46" text-anchor="middle">dp of i</text>
  <text class="d-sub" x="350" y="68" text-anchor="middle">first i digits</text>
  <path class="d-edge" d="M 300 82 L 170 140" marker-end="url(#b28q4-arrow)"/>
  <path class="d-edge" d="M 400 82 L 530 140" marker-end="url(#b28q4-arrow)"/>
  <rect class="d-box" x="30" y="144" width="280" height="80" rx="10"/>
  <text class="d-text" x="170" y="174" text-anchor="middle">last letter is 1 digit</text>
  <text class="d-sub" x="170" y="200" text-anchor="middle">digit is 1 to 9: add dp of i-1</text>
  <rect class="d-box" x="390" y="144" width="280" height="80" rx="10"/>
  <text class="d-text" x="530" y="174" text-anchor="middle">last letter is 2 digits</text>
  <text class="d-sub" x="530" y="200" text-anchor="middle">10 to 26: add dp of i-2</text>
</svg>

~~~text
dp[0] = 1                                   the empty prefix: one way (decode nothing)
dp[i] = (s[i-1] != '0'            ? dp[i-1] : 0)
      + (10 <= s[i-2..i-1] <= 26  ? dp[i-2] : 0)
answer = dp[n]
~~~

The two cases never overlap (the last letter has a different length), so the counts **add**. This is the same shape as [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem) — take one step or two — except that each step is only allowed when the digits form a real letter.

📌 **Interview term: Empty-prefix base case** — \`dp[0] = 1\`. It is not "the answer for an empty string" so much as a bookkeeping value: when the first two digits form a letter, \`dp[2]\` must count that one decoding, and it does so by adding \`dp[0]\`.

## 4. The Zero Rules — Where the Points Are

The letters are 1 to 26. That one fact gives every zero rule:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Zero rules. A single 0 is not a letter. 06 is not a letter because a two digit code cannot start with 0. 10 and 20 are letters J and T. 30 to 90 are not letters">
  <rect class="d-box-muted" x="20" y="20" width="310" height="70" rx="10"/>
  <text class="d-text" x="175" y="50" text-anchor="middle">0 alone</text>
  <text class="d-sub" x="175" y="74" text-anchor="middle">no letter 0: one-digit move is banned</text>
  <rect class="d-box-muted" x="370" y="20" width="310" height="70" rx="10"/>
  <text class="d-text" x="525" y="50" text-anchor="middle">06, 05, 00</text>
  <text class="d-sub" x="525" y="74" text-anchor="middle">two digits starting with 0 are banned</text>
  <rect class="d-box-accent" x="20" y="130" width="310" height="70" rx="10"/>
  <text class="d-text" x="175" y="160" text-anchor="middle">10 and 20</text>
  <text class="d-sub" x="175" y="184" text-anchor="middle">J and T: the only home for a 0</text>
  <rect class="d-box-muted" x="370" y="130" width="310" height="70" rx="10"/>
  <text class="d-text" x="525" y="160" text-anchor="middle">30, 40, up to 90</text>
  <text class="d-sub" x="525" y="184" text-anchor="middle">bigger than 26: the 0 is stranded</text>
  <rect class="d-box" x="195" y="230" width="310" height="56" rx="10"/>
  <text class="d-text" x="350" y="264" text-anchor="middle">stranded 0 means 0 ways in total</text>
</svg>

Put together:

- **A \`0\` can never be a letter by itself.** So the one-digit move is skipped when \`s[i-1]\` is \`0\`.
- **A two-digit code must be 10 to 26.** \`06\` is not F: the first digit of a two-digit code must be \`1\`, or \`2\` with a second digit of \`0\` to \`6\`. Checking the characters this way rules out \`06\` automatically.
- **So every \`0\` must be the second half of \`10\` or \`20\`.** If the digit before it is anything else (\`0\`, \`3\` to \`9\`) or there is no digit before it (a leading \`0\`), that zero cannot be placed, both moves are banned at that position, \`dp\` becomes 0, and the whole answer is 0: \`"06"\`, \`"0"\`, \`"100"\`, \`"230"\` all give 0.
- **A zero also removes options from its neighbour.** In \`"2101"\`, the \`1\` before the \`0\` cannot be its own letter — it is needed for \`10\` — so \`"2101"\` has just one decoding, BJA.

📌 **Interview term: Leading zero** — a \`0\` at the start of a number, as in \`06\`. In this problem a code with a leading zero is invalid, and a string whose first digit is \`0\` has no decoding at all.

**The \`int("06")\` trap.** The natural way to test the two-digit case is to convert the two characters to a number and check \`10 <= x <= 26\`. That works — as long as you check \`>= 10\`, not \`>= 1\`. Converting \`"06"\` gives 6 in every language (we ran it: Python \`int\`, JavaScript \`Number\` and \`parseInt\`, Java \`Integer.parseInt\`, C++ \`std::stoi\` all returned 6), so a check like \`x <= 26\` alone happily accepts \`06\` as a letter. The character test \`first == '1' or (first == '2' and second <= '6')\` cannot make that mistake.

## 5. The Table on "11106"

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="dp table for 11106 is 1, 1, 2, 3, 2, 2. At the zero only the two digit move 10 is allowed, and at the final 6 only the one digit move is allowed because 06 is not a letter">
  <rect class="d-box-muted" x="20" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="65" y="94" text-anchor="middle">1</text>
  <rect class="d-box" x="130" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="175" y="94" text-anchor="middle">1</text>
  <rect class="d-box" x="240" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="285" y="94" text-anchor="middle">2</text>
  <rect class="d-box" x="350" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="395" y="94" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="460" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="505" y="94" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="570" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="615" y="94" text-anchor="middle">2</text>
  <text class="d-sub" x="65" y="40" text-anchor="middle">empty</text>
  <text class="d-sub" x="175" y="40" text-anchor="middle">1</text>
  <text class="d-sub" x="285" y="40" text-anchor="middle">11</text>
  <text class="d-sub" x="395" y="40" text-anchor="middle">111</text>
  <text class="d-sub" x="505" y="40" text-anchor="middle">1110</text>
  <text class="d-sub" x="615" y="40" text-anchor="middle">11106</text>
  <text class="d-sub" x="505" y="150" text-anchor="middle">only 10</text>
  <text class="d-sub" x="505" y="172" text-anchor="middle">dp 2 copied</text>
  <text class="d-sub" x="615" y="150" text-anchor="middle">only 6</text>
  <text class="d-sub" x="615" y="172" text-anchor="middle">06 banned</text>
</svg>

| i | prefix | one-digit move | two-digit move | dp[i] |
| :--- | :--- | :--- | :--- | :--- |
| 0 | (empty) | — | — | 1 |
| 1 | 1 | \`1\` ok → dp[0] = 1 | — | 1 |
| 2 | 11 | \`1\` ok → dp[1] = 1 | \`11\` ok → dp[0] = 1 | 2 |
| 3 | 111 | \`1\` ok → dp[2] = 2 | \`11\` ok → dp[1] = 1 | 3 |
| 4 | 1110 | \`0\` **banned** | \`10\` ok → dp[2] = 2 | 2 |
| 5 | 11106 | \`6\` ok → dp[4] = 2 | \`06\` **banned** | 2 |

The two decodings are AAJF (1-1-10-6) and KJF (11-10-6), exactly what example 1 lists. Notice row 4: the zero **removed** the option "111 then 0" and forced the 1 before it into \`10\`, so dp dropped from 3 to 2.

## 6. From Recursion to Two Variables in JavaScript

**Plain recursion** follows the definition: \`ways(i)\` returns 1 at the end of the string, 0 at a \`0\`, otherwise \`ways(i+1)\` plus (if the next two digits form 10 to 26) \`ways(i+2)\`. It is correct but exponential: on a string of thirty \`1\`s it made **3,524,577 calls** in example 2, because \`ways(i+2)\` is recomputed inside \`ways(i+1)\` too.

📌 **Interview term: Overlapping subproblems** — the same \`ways(i)\` is asked for again and again by different branches; caching or tabulating it makes each one cost O(1).

**The table** (\`dp\` array of length n + 1) fixes that. Since \`dp[i]\` only reads \`dp[i-1]\` and \`dp[i-2]\`, two variables are enough:

~~~javascript
function numDecodings(s) {
  if (s.length === 0) return 1;            // one way to decode nothing (ask your interviewer)
  let prev = 1, cur = s[0] !== '0' ? 1 : 0; // dp[i-1], dp[i] for i = 1
  for (let i = 1; i < s.length; i++) {
    let next = 0;
    if (s[i] !== '0') next = cur;          // s[i] alone is a letter 1..9
    if (s[i - 1] === '1' || (s[i - 1] === '2' && s[i] <= '6')) next += prev; // 10..26, never 06
    prev = cur;
    cur = next;
  }
  return cur;
}
~~~

**What to point out in this code:**

- \`prev\` and \`cur\` play the roles of \`dp[i-1]\` and \`dp[i]\`; \`prev = cur; cur = next;\` shifts them (the order of those two lines matters).
- \`cur\` starts at \`s[0] !== '0' ? 1 : 0\`, so a leading zero zeroes the count immediately, and the answer stays 0.
- \`s[i]\` on a string returns a one-character string, and \`s[i] <= '6'\` compares strings by UTF-16 code units — correct for single digits. It is **not** safe for longer strings: in Node, \`'10' <= '6'\` is \`true\`.
- Use \`!==\` and \`===\`: with \`==\`, \`'0' == 0\` is \`true\` because of type coercion, which hides bugs if a number ever sneaks in.
- No \`slice\` or \`Number()\` in the loop, so each step is O(1) with no new strings; the table version in example 1 uses \`Number(s.slice(i - 2, i))\` with the \`>= 10\` check to show the other style.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22; the same file runs unchanged in the page). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the zero edge cases, with every decoding listed by a small backtracking search** prints:

~~~text
"12" -> 2: AB, L
"226" -> 3: BBF, BZ, VF
"06" -> 0
"0" -> 0
"10" -> 1: J
"100" -> 0
"2101" -> 1: BJA
"27" -> 1: BG
"11106" -> 2: AAJF, KJF
"230" -> 0
"1201234" -> 3: ATABCD, ATAWD, ATLCD
dp table for "11106": [1, 1, 2, 3, 2, 2]
dp table for "226": [1, 1, 2, 3]
~~~

Read it against the rules from section 4:

- \`"06" -> 0\` and \`"0" -> 0\`: a leading zero has nowhere to go.
- \`"10" -> 1\` (J) — the zero is glued to the 1. \`"100" -> 0\` — the second zero has only another zero before it, and \`00\` is not a letter.
- \`"230" -> 0\`: \`30\` is above 26, so the zero is stranded even though \`23\` alone is a fine letter.
- \`"2101" -> 1\`: the zero forces \`10\`, which removes every other split.
- \`"1201234" -> 3\`: the zero forces \`20\`, then \`1234\` decodes three ways (ABCD, AWD, LCD), each prefixed by A and T.
- The two dp tables match section 5 and the 226 story: \`[1, 1, 2, 3]\`.

**Example 2 — plain recursion vs the DP** prints:

~~~text
n=10 ones: naive 89 after 232 calls, DP 89 in one pass
n=20 ones: naive 10946 after 28656 calls, DP 10946 in one pass
n=30 ones: naive 1346269 after 3524577 calls, DP 1346269 in one pass
n=40 ones: DP 165580141
n=40 of 2 then 7 repeated: DP 1
n=40 of 26 repeated: DP 1048576
~~~

For a string of n ones the count is a Fibonacci number (89, 10946, 1346269, …), because every position can take one digit or two — exactly climbing stairs. The plain recursion's calls grow at the same rate (232 → 28,656 → 3,524,577) while the DP makes one pass. \`"27"\` repeated has only 1 decoding (27 is not a letter), and \`"26"\` repeated 20 times has 2^20 = 1,048,576, because each \`26\` independently splits or not.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential (Fibonacci-like) | O(n) stack | \`ways(i+2)\` is recomputed inside \`ways(i+1)\`; 3,524,577 calls for n = 30 |
| Memoized recursion | O(n) | O(n) memo + O(n) stack | each \`ways(i)\` computed once |
| DP table | O(n) | O(n) | one pass, \`dp\` of length n + 1 |
| Two variables | O(n) | O(1) | only \`dp[i-1]\` and \`dp[i-2]\` are ever read |

A memoized recursive version in JavaScript uses one stack frame per digit and can hit the engine's call-stack limit on very long strings; the loop version cannot.

## 9. Edge Cases

- **Leading zero** (\`"0"\`, \`"06"\`, \`"012"\`): answer 0.
- **\`10\` and \`20\`:** exactly one way to place the zero. \`"10"\` → 1, \`"20"\` → 1.
- **\`00\` anywhere, or \`30\` to \`90\`:** answer 0 — the second zero, or the zero after a 3 to 9, has nowhere to go.
- **\`27\` to \`99\` with no zero:** only the one-digit move; \`"27"\` → 1.
- **Long runs of \`1\` and \`2\`:** the count grows like Fibonacci; check the number type (or a modulus).
- **Empty string:** the DP returns 1; confirm what the interviewer wants.

## Common Pitfalls

- **Testing \`Number(two) <= 26\` without \`>= 10\`.** \`Number('06')\` and \`parseInt('06')\` are both 6, so \`06\` slips through as F. Use the character test, or check both bounds.
- **Forgetting the one-digit ban on \`0\`.** Without it, \`"10"\` counts 2 (1-0 and 10) instead of 1.
- **\`dp[0] = 0\` instead of 1.** Then \`"12"\` gives 1 instead of 2.
- **Comparing multi-character strings.** \`'10' <= '6'\` is \`true\` in JavaScript (lexicographic), so \`s.slice(i - 1, i + 1) <= '26'\` is wrong. Compare numbers, or single characters.
- **\`==\` instead of \`===\`.** \`'0' == 0\` is \`true\`; mixing a digit character and a number then "works" by accident in one place and fails in another.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i]</code> is the number of ways to decode the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> digits, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0] = 1</code> for the empty prefix.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The two moves:</strong> <span style="color:#f0e2c8;">The last letter is one digit (only if it is not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i-1]</code>) or two digits (only if they form 10 to 26, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i-2]</code>).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The zero rules:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> must be the second half of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">10</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">20</code>. A leading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">00</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">30</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">90</code> strands it, and the answer becomes 0. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">06</code> is not F.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n) time, and O(1) space with two variables, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i]</code> only reads the previous two values.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">I compare single characters with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number('06')</code> is 6 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'10' &lt;= '6'</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code> for whole strings.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does "100" return, and why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">0. The first zero pairs with the 1 to make J, but the second zero has only a 0 before it, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">00</code> is not a letter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is dp[0] equal to 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the one way to decode nothing. Without it, a string like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"12"</code> would not count the decoding that uses both digits as one letter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you list the decodings, not just count them?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Backtracking: at each index try a one-digit letter and, if valid, a two-digit letter, and record the path at the end. The output can be exponential, as for long runs of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1</code>s.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the string can contain <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">*</code> as a wildcard for 1 to 9?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same DP, but each move is multiplied by how many digits the wildcard can be (9 for one digit, 15 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">**</code> as two digits), usually returned modulo 1,000,000,007.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the count lose precision?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, past <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number.MAX_SAFE_INTEGER</code>. Long runs of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1</code>s grow like Fibonacci, so for very long strings use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> or a modulus.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix DP** | \`dp[i]\` answers the question for the first \`i\` characters |
| **Empty-prefix base case** | \`dp[0] = 1\`: one way to decode nothing, the seed of the recurrence |
| **Leading zero** | A \`0\` at the start of a code; \`06\` is not a valid two-digit letter |
| **Overlapping subproblems** | The same suffix is decoded many times by plain recursion |

---
**Conclusion:** Decode Ways is climbing stairs with rules: \`dp[i]\` counts decodings of the first \`i\` digits, the last letter takes one digit (never a lone \`0\`) or two digits (only 10 to 26), and \`dp[0] = 1\` seeds it all. The zeros are the real question: a \`0\` must be the second half of \`10\` or \`20\`, so a leading zero, \`00\`, or \`30\` to \`90\` make the answer 0, and \`06\` is never F. Two variables give O(n) time and O(1) space. In JavaScript, compare single characters with \`===\`, because \`Number('06')\` is 6 and whole-string comparisons are lexicographic.`,
        examples: [
          {
            label: `Decode ways on the zero edge cases, with every decoding listed`,
            code: `function numDecodings(s) {
  if (s.length === 0) return 1;            // one way to decode nothing (ask your interviewer)
  let prev = 1, cur = s[0] !== '0' ? 1 : 0; // dp[i-1], dp[i] for i = 1
  for (let i = 1; i < s.length; i++) {
    let next = 0;
    if (s[i] !== '0') next = cur;          // s[i] alone is a letter 1..9
    if (s[i - 1] === '1' || (s[i - 1] === '2' && s[i] <= '6')) next += prev; // 10..26, never 06
    prev = cur;
    cur = next;
  }
  return cur;
}

function decodeTable(s) {
  const n = s.length;
  const dp = new Array(n + 1).fill(0);     // dp[i] = ways to decode the first i digits
  dp[0] = 1;
  for (let i = 1; i <= n; i++) {
    if (s[i - 1] !== '0') dp[i] += dp[i - 1];          // last letter uses one digit
    if (i >= 2) {
      const two = Number(s.slice(i - 2, i));
      if (two >= 10 && two <= 26) dp[i] += dp[i - 2];  // last letter uses two digits
    }
  }
  return dp;
}

function allDecodings(s, i, path) {
  if (i === s.length) return [path];
  let out = [];
  if (s[i] !== '0') {
    out = out.concat(allDecodings(s, i + 1, path + String.fromCharCode(64 + Number(s[i]))));
    if (i + 1 < s.length) {
      const two = Number(s.slice(i, i + 2));
      if (two >= 10 && two <= 26) out = out.concat(allDecodings(s, i + 2, path + String.fromCharCode(64 + two)));
    }
  }
  return out;
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

for (const s of ['12', '226', '06', '0', '10', '100', '2101', '27', '11106', '230', '1201234']) {
  const ways = numDecodings(s);
  let line = '"' + s + '" -> ' + ways;
  if (ways > 0) line += ': ' + allDecodings(s, 0, '').join(', ');
  console.log(line);
}
console.log('dp table for "11106": ' + fmt(decodeTable('11106')));
console.log('dp table for "226": ' + fmt(decodeTable('226')));`,
          },
          {
            label: `Naive recursion vs DP: call counts and the Fibonacci pattern`,
            code: `function numDecodings(s) {
  if (s.length === 0) return 1;            // one way to decode nothing (ask your interviewer)
  let prev = 1, cur = s[0] !== '0' ? 1 : 0; // dp[i-1], dp[i] for i = 1
  for (let i = 1; i < s.length; i++) {
    let next = 0;
    if (s[i] !== '0') next = cur;          // s[i] alone is a letter 1..9
    if (s[i - 1] === '1' || (s[i - 1] === '2' && s[i] <= '6')) next += prev; // 10..26, never 06
    prev = cur;
    cur = next;
  }
  return cur;
}

let calls = 0;

function naive(s, i) {
  calls++;
  if (i === s.length) return 1;
  if (s[i] === '0') return 0;
  let ways = naive(s, i + 1);
  if (i + 1 < s.length && (s[i] === '1' || (s[i] === '2' && s[i + 1] <= '6'))) ways += naive(s, i + 2);
  return ways;
}

for (const n of [10, 20, 30]) {
  const s = '1'.repeat(n);
  calls = 0;
  const a = naive(s, 0);
  console.log('n=' + n + ' ones: naive ' + a + ' after ' + calls + ' calls, DP ' + numDecodings(s) + ' in one pass');
}
console.log('n=40 ones: DP ' + numDecodings('1'.repeat(40)));
console.log('n=40 of 2 then 7 repeated: DP ' + numDecodings('27'.repeat(20)));
console.log('n=40 of 26 repeated: DP ' + numDecodings('26'.repeat(20)));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"A message of letters A to Z was encoded as numbers, A = 1, B = 2, up to Z = 26, and the numbers were written next to each other with no separators. Given the digit string, count how many ways it can be decoded. Pay special attention to zeros — what do you do with a string like '06' or '100'? Code it in Java."

**What a strong answer should cover:**
- The state: \`dp[i]\` = number of ways to decode the first \`i\` digits, with \`dp[0] = 1\` (the empty prefix has one decoding: nothing).
- The two moves: the last letter used one digit (allowed only if that digit is not \`0\`, add \`dp[i-1]\`) or two digits (allowed only if they form 10 to 26, add \`dp[i-2]\`).
- The zero rules: a \`0\` can never stand alone, so it must be the second digit of \`10\` or \`20\`; \`06\` is not a letter because a two-digit code cannot start with \`0\`; \`30\`, \`00\` or a leading \`0\` make the whole answer 0.
- O(n) time and O(1) space with two rolling variables, compared with the exponential plain recursion (the all-\`1\` string grows like Fibonacci).
- Java details: \`s.charAt(i)\` and \`char\` comparisons instead of \`Integer.parseInt(s.substring(...))\`, which allocates a new \`String\` each step and also turns \`"06"\` into 6 — exactly the bug the question is fishing for.

**Clarifying questions expected:**
- Can the string contain zeros, and can it start with one?
- What should an empty string return?
- Can the answer be large — should it be returned modulo something?

**Code / implementation expected:** Yes — a one-pass Java DP with two rolling variables, tested on \`"06"\`, \`"10"\`, \`"100"\` and \`"226"\`.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, strings and characters; the DP idea is built up from scratch.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two kids invent a secret code: A is 1, B is 2, and so on up to Z = 26. One of them passes a note that just says **226**. The other kid frowns: is that 2-2-6 (**BBF**), 22-6 (**VF**) or 2-26 (**BZ**)? All three are real words in their code. The note has **three** possible meanings, because they forgot to put spaces between the numbers.

The next note says **06**. That one is broken: there is no letter 0, and "06" is not how anyone would write 6. And **10** has exactly one meaning, J, because the 0 cannot be a letter on its own, so it must be glued to the 1 in front of it.

Counting how many meanings a note can have — without listing them, because a long note can have millions — is the Decode Ways problem. The counting part is easy dynamic programming; the zeros are where almost everyone loses points, so this page spends most of its time on them.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the string contain \`0\`, and can it start with \`0\`? | Zeros are the whole difficulty; a leading \`0\` makes the answer 0 at once |
| Is \`06\` a valid code for F? | The standard rule is no — a two-digit code must be 10 to 26 — but confirm it |
| What should an empty string return? | The DP naturally says 1 (one empty decoding); some interviewers want 0 |
| Is the input only digits? | Otherwise you need validation first |
| How long can the string be — could the count overflow? | An all-\`1\` string of length 40 already has 165,580,141 decodings |

## 3. The Core Idea: Look at the Last Letter

📌 **Interview term: Prefix DP** — a DP where \`dp[i]\` answers the question for the first \`i\` characters of the input, and is built from shorter prefixes.

Let \`dp[i]\` be the number of ways to decode the **first \`i\` digits**. Every decoding of those \`i\` digits ends with some letter, and that last letter used either **one** digit or **two**:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The last letter uses one digit, allowed when that digit is not zero, or two digits, allowed when they form 10 to 26">
  <defs>
    <marker id="b28q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="200" height="60" rx="10"/>
  <text class="d-text" x="350" y="46" text-anchor="middle">dp of i</text>
  <text class="d-sub" x="350" y="68" text-anchor="middle">first i digits</text>
  <path class="d-edge" d="M 300 82 L 170 140" marker-end="url(#b28q4-arrow)"/>
  <path class="d-edge" d="M 400 82 L 530 140" marker-end="url(#b28q4-arrow)"/>
  <rect class="d-box" x="30" y="144" width="280" height="80" rx="10"/>
  <text class="d-text" x="170" y="174" text-anchor="middle">last letter is 1 digit</text>
  <text class="d-sub" x="170" y="200" text-anchor="middle">digit is 1 to 9: add dp of i-1</text>
  <rect class="d-box" x="390" y="144" width="280" height="80" rx="10"/>
  <text class="d-text" x="530" y="174" text-anchor="middle">last letter is 2 digits</text>
  <text class="d-sub" x="530" y="200" text-anchor="middle">10 to 26: add dp of i-2</text>
</svg>

~~~text
dp[0] = 1                                   the empty prefix: one way (decode nothing)
dp[i] = (s[i-1] != '0'            ? dp[i-1] : 0)
      + (10 <= s[i-2..i-1] <= 26  ? dp[i-2] : 0)
answer = dp[n]
~~~

The two cases never overlap (the last letter has a different length), so the counts **add**. This is the same shape as [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem) — take one step or two — except that each step is only allowed when the digits form a real letter.

📌 **Interview term: Empty-prefix base case** — \`dp[0] = 1\`. It is not "the answer for an empty string" so much as a bookkeeping value: when the first two digits form a letter, \`dp[2]\` must count that one decoding, and it does so by adding \`dp[0]\`.

## 4. The Zero Rules — Where the Points Are

The letters are 1 to 26. That one fact gives every zero rule:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Zero rules. A single 0 is not a letter. 06 is not a letter because a two digit code cannot start with 0. 10 and 20 are letters J and T. 30 to 90 are not letters">
  <rect class="d-box-muted" x="20" y="20" width="310" height="70" rx="10"/>
  <text class="d-text" x="175" y="50" text-anchor="middle">0 alone</text>
  <text class="d-sub" x="175" y="74" text-anchor="middle">no letter 0: one-digit move is banned</text>
  <rect class="d-box-muted" x="370" y="20" width="310" height="70" rx="10"/>
  <text class="d-text" x="525" y="50" text-anchor="middle">06, 05, 00</text>
  <text class="d-sub" x="525" y="74" text-anchor="middle">two digits starting with 0 are banned</text>
  <rect class="d-box-accent" x="20" y="130" width="310" height="70" rx="10"/>
  <text class="d-text" x="175" y="160" text-anchor="middle">10 and 20</text>
  <text class="d-sub" x="175" y="184" text-anchor="middle">J and T: the only home for a 0</text>
  <rect class="d-box-muted" x="370" y="130" width="310" height="70" rx="10"/>
  <text class="d-text" x="525" y="160" text-anchor="middle">30, 40, up to 90</text>
  <text class="d-sub" x="525" y="184" text-anchor="middle">bigger than 26: the 0 is stranded</text>
  <rect class="d-box" x="195" y="230" width="310" height="56" rx="10"/>
  <text class="d-text" x="350" y="264" text-anchor="middle">stranded 0 means 0 ways in total</text>
</svg>

Put together:

- **A \`0\` can never be a letter by itself.** So the one-digit move is skipped when \`s[i-1]\` is \`0\`.
- **A two-digit code must be 10 to 26.** \`06\` is not F: the first digit of a two-digit code must be \`1\`, or \`2\` with a second digit of \`0\` to \`6\`. Checking the characters this way rules out \`06\` automatically.
- **So every \`0\` must be the second half of \`10\` or \`20\`.** If the digit before it is anything else (\`0\`, \`3\` to \`9\`) or there is no digit before it (a leading \`0\`), that zero cannot be placed, both moves are banned at that position, \`dp\` becomes 0, and the whole answer is 0: \`"06"\`, \`"0"\`, \`"100"\`, \`"230"\` all give 0.
- **A zero also removes options from its neighbour.** In \`"2101"\`, the \`1\` before the \`0\` cannot be its own letter — it is needed for \`10\` — so \`"2101"\` has just one decoding, BJA.

📌 **Interview term: Leading zero** — a \`0\` at the start of a number, as in \`06\`. In this problem a code with a leading zero is invalid, and a string whose first digit is \`0\` has no decoding at all.

**The \`int("06")\` trap.** The natural way to test the two-digit case is to convert the two characters to a number and check \`10 <= x <= 26\`. That works — as long as you check \`>= 10\`, not \`>= 1\`. Converting \`"06"\` gives 6 in every language (we ran it: Python \`int\`, JavaScript \`Number\` and \`parseInt\`, Java \`Integer.parseInt\`, C++ \`std::stoi\` all returned 6), so a check like \`x <= 26\` alone happily accepts \`06\` as a letter. The character test \`first == '1' or (first == '2' and second <= '6')\` cannot make that mistake.

## 5. The Table on "11106"

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="dp table for 11106 is 1, 1, 2, 3, 2, 2. At the zero only the two digit move 10 is allowed, and at the final 6 only the one digit move is allowed because 06 is not a letter">
  <rect class="d-box-muted" x="20" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="65" y="94" text-anchor="middle">1</text>
  <rect class="d-box" x="130" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="175" y="94" text-anchor="middle">1</text>
  <rect class="d-box" x="240" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="285" y="94" text-anchor="middle">2</text>
  <rect class="d-box" x="350" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="395" y="94" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="460" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="505" y="94" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="570" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="615" y="94" text-anchor="middle">2</text>
  <text class="d-sub" x="65" y="40" text-anchor="middle">empty</text>
  <text class="d-sub" x="175" y="40" text-anchor="middle">1</text>
  <text class="d-sub" x="285" y="40" text-anchor="middle">11</text>
  <text class="d-sub" x="395" y="40" text-anchor="middle">111</text>
  <text class="d-sub" x="505" y="40" text-anchor="middle">1110</text>
  <text class="d-sub" x="615" y="40" text-anchor="middle">11106</text>
  <text class="d-sub" x="505" y="150" text-anchor="middle">only 10</text>
  <text class="d-sub" x="505" y="172" text-anchor="middle">dp 2 copied</text>
  <text class="d-sub" x="615" y="150" text-anchor="middle">only 6</text>
  <text class="d-sub" x="615" y="172" text-anchor="middle">06 banned</text>
</svg>

| i | prefix | one-digit move | two-digit move | dp[i] |
| :--- | :--- | :--- | :--- | :--- |
| 0 | (empty) | — | — | 1 |
| 1 | 1 | \`1\` ok → dp[0] = 1 | — | 1 |
| 2 | 11 | \`1\` ok → dp[1] = 1 | \`11\` ok → dp[0] = 1 | 2 |
| 3 | 111 | \`1\` ok → dp[2] = 2 | \`11\` ok → dp[1] = 1 | 3 |
| 4 | 1110 | \`0\` **banned** | \`10\` ok → dp[2] = 2 | 2 |
| 5 | 11106 | \`6\` ok → dp[4] = 2 | \`06\` **banned** | 2 |

The two decodings are AAJF (1-1-10-6) and KJF (11-10-6), exactly what example 1 lists. Notice row 4: the zero **removed** the option "111 then 0" and forced the 1 before it into \`10\`, so dp dropped from 3 to 2.

## 6. From Recursion to Two Variables in Java

**Plain recursion** follows the definition: \`ways(i)\` returns 1 at the end of the string, 0 at a \`0\`, otherwise \`ways(i+1)\` plus (if the next two digits form 10 to 26) \`ways(i+2)\`. It is correct but exponential: on a string of thirty \`1\`s it made **3,524,577 calls** in example 2, because \`ways(i+2)\` is recomputed inside \`ways(i+1)\` too.

📌 **Interview term: Overlapping subproblems** — the same \`ways(i)\` is asked for again and again by different branches; caching or tabulating it makes each one cost O(1).

**The table** (\`dp\` array of length n + 1) fixes that. Since \`dp[i]\` only reads \`dp[i-1]\` and \`dp[i-2]\`, two variables are enough:

~~~java
static long numDecodings(String s) {
    if (s.isEmpty()) return 1;               // one way to decode nothing (ask your interviewer)
    long prev = 1, cur = s.charAt(0) != '0' ? 1 : 0; // dp[i-1], dp[i] for i = 1
    for (int i = 1; i < s.length(); i++) {
        char a = s.charAt(i - 1), b = s.charAt(i);
        long next = 0;
        if (b != '0') next = cur;            // b alone is a letter 1..9
        if (a == '1' || (a == '2' && b <= '6')) next += prev; // 10..26, never 06
        prev = cur;
        cur = next;
    }
    return cur;
}
~~~

**What to point out in this code:**

- \`prev\` and \`cur\` play the roles of \`dp[i-1]\` and \`dp[i]\`; \`prev = cur; cur = next;\` shifts them (the order of those two lines matters).
- \`cur\` starts at \`s.charAt(0) != '0' ? 1 : 0\`, so a leading zero zeroes the count immediately, and the answer stays 0.
- \`char\` is a numeric type in Java, so \`b <= '6'\` compares character codes, which for digits matches their numeric order. No \`String\` objects are created in the loop.
- The count is \`long\`. Thirty \`1\`s give 1,346,269 decodings and forty give 165,580,141; the Fibonacci-like growth passes \`int\`'s 2,147,483,647 at about 45 digits.
- The table version in example 1 uses \`Integer.parseInt(s.substring(i - 2, i))\` with the \`>= 10\` check to show the other style; each call allocates a new \`String\`.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (JDK 21, compiled as Java 17+ source). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the zero edge cases, with every decoding listed by a small backtracking search** prints:

~~~text
"12" -> 2: AB, L
"226" -> 3: BBF, BZ, VF
"06" -> 0
"0" -> 0
"10" -> 1: J
"100" -> 0
"2101" -> 1: BJA
"27" -> 1: BG
"11106" -> 2: AAJF, KJF
"230" -> 0
"1201234" -> 3: ATABCD, ATAWD, ATLCD
dp table for "11106": [1, 1, 2, 3, 2, 2]
dp table for "226": [1, 1, 2, 3]
~~~

Read it against the rules from section 4:

- \`"06" -> 0\` and \`"0" -> 0\`: a leading zero has nowhere to go.
- \`"10" -> 1\` (J) — the zero is glued to the 1. \`"100" -> 0\` — the second zero has only another zero before it, and \`00\` is not a letter.
- \`"230" -> 0\`: \`30\` is above 26, so the zero is stranded even though \`23\` alone is a fine letter.
- \`"2101" -> 1\`: the zero forces \`10\`, which removes every other split.
- \`"1201234" -> 3\`: the zero forces \`20\`, then \`1234\` decodes three ways (ABCD, AWD, LCD), each prefixed by A and T.
- The two dp tables match section 5 and the 226 story: \`[1, 1, 2, 3]\`.

**Example 2 — plain recursion vs the DP** prints:

~~~text
n=10 ones: naive 89 after 232 calls, DP 89 in one pass
n=20 ones: naive 10946 after 28656 calls, DP 10946 in one pass
n=30 ones: naive 1346269 after 3524577 calls, DP 1346269 in one pass
n=40 ones: DP 165580141
n=40 of 2 then 7 repeated: DP 1
n=40 of 26 repeated: DP 1048576
~~~

For a string of n ones the count is a Fibonacci number (89, 10946, 1346269, …), because every position can take one digit or two — exactly climbing stairs. The plain recursion's calls grow at the same rate (232 → 28,656 → 3,524,577) while the DP makes one pass. \`"27"\` repeated has only 1 decoding (27 is not a letter), and \`"26"\` repeated 20 times has 2^20 = 1,048,576, because each \`26\` independently splits or not.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential (Fibonacci-like) | O(n) stack | \`ways(i+2)\` is recomputed inside \`ways(i+1)\`; 3,524,577 calls for n = 30 |
| Memoized recursion | O(n) | O(n) memo + O(n) stack | each \`ways(i)\` computed once |
| DP table | O(n) | O(n) | one pass, \`dp\` of length n + 1 |
| Two variables | O(n) | O(1) | only \`dp[i-1]\` and \`dp[i-2]\` are ever read |

A memoized recursive version in Java uses one stack frame per digit and can throw \`StackOverflowError\` on very long strings, depending on the thread stack size; the loop version cannot.

## 9. Edge Cases

- **Leading zero** (\`"0"\`, \`"06"\`, \`"012"\`): answer 0.
- **\`10\` and \`20\`:** exactly one way to place the zero. \`"10"\` → 1, \`"20"\` → 1.
- **\`00\` anywhere, or \`30\` to \`90\`:** answer 0 — the second zero, or the zero after a 3 to 9, has nowhere to go.
- **\`27\` to \`99\` with no zero:** only the one-digit move; \`"27"\` → 1.
- **Long runs of \`1\` and \`2\`:** the count grows like Fibonacci; check the number type (or a modulus).
- **Empty string:** the DP returns 1; confirm what the interviewer wants.

## Common Pitfalls

- **Testing \`Integer.parseInt(two) <= 26\` without \`>= 10\`.** \`Integer.parseInt("06")\` is 6, so \`06\` slips through as F. Use the \`char\` test, or check both bounds.
- **Forgetting the one-digit ban on \`0\`.** Without it, \`"10"\` counts 2 (1-0 and 10) instead of 1.
- **\`dp[0] = 0\` instead of 1.** Then \`"12"\` gives 1 instead of 2.
- **Comparing strings with \`==\`.** \`s.substring(i, i + 1) == "0"\` compares references, not contents, and is usually false. Compare \`char\`s with \`==\`, or \`String\`s with \`.equals\`.
- **Using \`int\` for the count.** It passes 2^31 − 1 at about 45 digits of \`1\`s and wraps silently; use \`long\` or the modulus the interviewer gives.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i]</code> is the number of ways to decode the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> digits, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0] = 1</code> for the empty prefix.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The two moves:</strong> <span style="color:#f0e2c8;">The last letter is one digit (only if it is not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i-1]</code>) or two digits (only if they form 10 to 26, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i-2]</code>).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The zero rules:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> must be the second half of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">10</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">20</code>. A leading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">00</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">30</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">90</code> strands it, and the answer becomes 0. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">06</code> is not F.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n) time, and O(1) space with two variables, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i]</code> only reads the previous two values.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">I compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char</code>s from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.charAt(i)</code>, which allocates nothing, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.parseInt("06")</code> is 6 and would sneak <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">06</code> in as a letter.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does "100" return, and why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">0. The first zero pairs with the 1 to make J, but the second zero has only a 0 before it, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">00</code> is not a letter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is dp[0] equal to 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the one way to decode nothing. Without it, a string like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"12"</code> would not count the decoding that uses both digits as one letter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you list the decodings, not just count them?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Backtracking with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List&lt;String&gt;</code> and a growing path: try a one-digit letter and, if valid, a two-digit letter. The output can be exponential.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the string can contain <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">*</code> as a wildcard for 1 to 9?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same DP, but each move is multiplied by how many digits the wildcard can be (9 for one digit, 15 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">**</code> as two digits), returned modulo 1,000,000,007 in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why long and not int?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The count grows like Fibonacci and passes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code> at about 45 ones, wrapping silently. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> lasts to about 90 digits; beyond that, use a modulus.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix DP** | \`dp[i]\` answers the question for the first \`i\` characters |
| **Empty-prefix base case** | \`dp[0] = 1\`: one way to decode nothing, the seed of the recurrence |
| **Leading zero** | A \`0\` at the start of a code; \`06\` is not a valid two-digit letter |
| **Overlapping subproblems** | The same suffix is decoded many times by plain recursion |

---
**Conclusion:** Decode Ways is climbing stairs with rules: \`dp[i]\` counts decodings of the first \`i\` digits, the last letter takes one digit (never a lone \`0\`) or two digits (only 10 to 26), and \`dp[0] = 1\` seeds it all. The zeros are the real question: a \`0\` must be the second half of \`10\` or \`20\`, so a leading zero, \`00\`, or \`30\` to \`90\` make the answer 0, and \`06\` is never F. Two variables give O(n) time and O(1) space. In Java, compare \`char\`s instead of parsing substrings, and keep the count in a \`long\`.`,
        examples: [
          {
            label: `Decode ways on the zero edge cases, with every decoding listed`,
            code: `import java.util.*;

public class Main {
    static long numDecodings(String s) {
        if (s.isEmpty()) return 1;               // one way to decode nothing (ask your interviewer)
        long prev = 1, cur = s.charAt(0) != '0' ? 1 : 0; // dp[i-1], dp[i] for i = 1
        for (int i = 1; i < s.length(); i++) {
            char a = s.charAt(i - 1), b = s.charAt(i);
            long next = 0;
            if (b != '0') next = cur;            // b alone is a letter 1..9
            if (a == '1' || (a == '2' && b <= '6')) next += prev; // 10..26, never 06
            prev = cur;
            cur = next;
        }
        return cur;
    }

    static long[] decodeTable(String s) {
        int n = s.length();
        long[] dp = new long[n + 1];             // dp[i] = ways to decode the first i digits
        dp[0] = 1;
        for (int i = 1; i <= n; i++) {
            if (s.charAt(i - 1) != '0') dp[i] += dp[i - 1];          // last letter uses one digit
            if (i >= 2) {
                int two = Integer.parseInt(s.substring(i - 2, i));
                if (two >= 10 && two <= 26) dp[i] += dp[i - 2];       // last letter uses two digits
            }
        }
        return dp;
    }

    static void allDecodings(String s, int i, String path, List<String> out) {
        if (i == s.length()) { out.add(path); return; }
        if (s.charAt(i) == '0') return;
        allDecodings(s, i + 1, path + (char) ('A' + s.charAt(i) - '1'), out);
        if (i + 1 < s.length()) {
            int two = Integer.parseInt(s.substring(i, i + 2));
            if (two >= 10 && two <= 26) allDecodings(s, i + 2, path + (char) ('A' + two - 1), out);
        }
    }

    static String fmt(long[] xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < xs.length; i++) sb.append(i > 0 ? ", " : "").append(xs[i]);
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        for (String s : new String[]{"12", "226", "06", "0", "10", "100", "2101", "27", "11106", "230", "1201234"}) {
            long ways = numDecodings(s);
            String line = "\\"" + s + "\\" -> " + ways;
            if (ways > 0) {
                List<String> out = new ArrayList<>();
                allDecodings(s, 0, "", out);
                line += ": " + String.join(", ", out);
            }
            System.out.println(line);
        }
        System.out.println("dp table for \\"11106\\": " + fmt(decodeTable("11106")));
        System.out.println("dp table for \\"226\\": " + fmt(decodeTable("226")));
    }
}`,
          },
          {
            label: `Naive recursion vs DP: call counts and the Fibonacci pattern`,
            code: `public class Main {
    static long numDecodings(String s) {
        if (s.isEmpty()) return 1;               // one way to decode nothing (ask your interviewer)
        long prev = 1, cur = s.charAt(0) != '0' ? 1 : 0; // dp[i-1], dp[i] for i = 1
        for (int i = 1; i < s.length(); i++) {
            char a = s.charAt(i - 1), b = s.charAt(i);
            long next = 0;
            if (b != '0') next = cur;            // b alone is a letter 1..9
            if (a == '1' || (a == '2' && b <= '6')) next += prev; // 10..26, never 06
            prev = cur;
            cur = next;
        }
        return cur;
    }

    static long calls = 0;

    static long naive(String s, int i) {
        calls++;
        if (i == s.length()) return 1;
        if (s.charAt(i) == '0') return 0;
        long ways = naive(s, i + 1);
        if (i + 1 < s.length() && (s.charAt(i) == '1' || (s.charAt(i) == '2' && s.charAt(i + 1) <= '6')))
            ways += naive(s, i + 2);
        return ways;
    }

    public static void main(String[] args) {
        for (int n : new int[]{10, 20, 30}) {
            String s = "1".repeat(n);
            calls = 0;
            long a = naive(s, 0);
            System.out.println("n=" + n + " ones: naive " + a + " after " + calls + " calls, DP " + numDecodings(s) + " in one pass");
        }
        System.out.println("n=40 ones: DP " + numDecodings("1".repeat(40)));
        System.out.println("n=40 of 2 then 7 repeated: DP " + numDecodings("27".repeat(20)));
        System.out.println("n=40 of 26 repeated: DP " + numDecodings("26".repeat(20)));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"A message of letters A to Z was encoded as numbers, A = 1, B = 2, up to Z = 26, and the numbers were written next to each other with no separators. Given the digit string, count how many ways it can be decoded. Pay special attention to zeros — what do you do with a string like '06' or '100'? Code it in C++."

**What a strong answer should cover:**
- The state: \`dp[i]\` = number of ways to decode the first \`i\` digits, with \`dp[0] = 1\` (the empty prefix has one decoding: nothing).
- The two moves: the last letter used one digit (allowed only if that digit is not \`0\`, add \`dp[i-1]\`) or two digits (allowed only if they form 10 to 26, add \`dp[i-2]\`).
- The zero rules: a \`0\` can never stand alone, so it must be the second digit of \`10\` or \`20\`; \`06\` is not a letter because a two-digit code cannot start with \`0\`; \`30\`, \`00\` or a leading \`0\` make the whole answer 0.
- O(n) time and O(1) space with two rolling variables, compared with the exponential plain recursion (the all-\`1\` string grows like Fibonacci).
- C++ details: \`char\` arithmetic such as \`(s[i-1] - '0') * 10 + (s[i] - '0')\` instead of \`std::stoi(s.substr(...))\`, which allocates and also turns \`"06"\` into 6 — exactly the bug the question is fishing for.

**Clarifying questions expected:**
- Can the string contain zeros, and can it start with one?
- What should an empty string return?
- Can the answer be large — should it be returned modulo something?

**Code / implementation expected:** Yes — a one-pass C++ DP with two rolling variables, tested on \`"06"\`, \`"10"\`, \`"100"\` and \`"226"\`.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, strings and characters; the DP idea is built up from scratch.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two kids invent a secret code: A is 1, B is 2, and so on up to Z = 26. One of them passes a note that just says **226**. The other kid frowns: is that 2-2-6 (**BBF**), 22-6 (**VF**) or 2-26 (**BZ**)? All three are real words in their code. The note has **three** possible meanings, because they forgot to put spaces between the numbers.

The next note says **06**. That one is broken: there is no letter 0, and "06" is not how anyone would write 6. And **10** has exactly one meaning, J, because the 0 cannot be a letter on its own, so it must be glued to the 1 in front of it.

Counting how many meanings a note can have — without listing them, because a long note can have millions — is the Decode Ways problem. The counting part is easy dynamic programming; the zeros are where almost everyone loses points, so this page spends most of its time on them.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the string contain \`0\`, and can it start with \`0\`? | Zeros are the whole difficulty; a leading \`0\` makes the answer 0 at once |
| Is \`06\` a valid code for F? | The standard rule is no — a two-digit code must be 10 to 26 — but confirm it |
| What should an empty string return? | The DP naturally says 1 (one empty decoding); some interviewers want 0 |
| Is the input only digits? | Otherwise you need validation first |
| How long can the string be — could the count overflow? | An all-\`1\` string of length 40 already has 165,580,141 decodings |

## 3. The Core Idea: Look at the Last Letter

📌 **Interview term: Prefix DP** — a DP where \`dp[i]\` answers the question for the first \`i\` characters of the input, and is built from shorter prefixes.

Let \`dp[i]\` be the number of ways to decode the **first \`i\` digits**. Every decoding of those \`i\` digits ends with some letter, and that last letter used either **one** digit or **two**:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="The last letter uses one digit, allowed when that digit is not zero, or two digits, allowed when they form 10 to 26">
  <defs>
    <marker id="b28q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="200" height="60" rx="10"/>
  <text class="d-text" x="350" y="46" text-anchor="middle">dp of i</text>
  <text class="d-sub" x="350" y="68" text-anchor="middle">first i digits</text>
  <path class="d-edge" d="M 300 82 L 170 140" marker-end="url(#b28q4-arrow)"/>
  <path class="d-edge" d="M 400 82 L 530 140" marker-end="url(#b28q4-arrow)"/>
  <rect class="d-box" x="30" y="144" width="280" height="80" rx="10"/>
  <text class="d-text" x="170" y="174" text-anchor="middle">last letter is 1 digit</text>
  <text class="d-sub" x="170" y="200" text-anchor="middle">digit is 1 to 9: add dp of i-1</text>
  <rect class="d-box" x="390" y="144" width="280" height="80" rx="10"/>
  <text class="d-text" x="530" y="174" text-anchor="middle">last letter is 2 digits</text>
  <text class="d-sub" x="530" y="200" text-anchor="middle">10 to 26: add dp of i-2</text>
</svg>

~~~text
dp[0] = 1                                   the empty prefix: one way (decode nothing)
dp[i] = (s[i-1] != '0'            ? dp[i-1] : 0)
      + (10 <= s[i-2..i-1] <= 26  ? dp[i-2] : 0)
answer = dp[n]
~~~

The two cases never overlap (the last letter has a different length), so the counts **add**. This is the same shape as [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem) — take one step or two — except that each step is only allowed when the digits form a real letter.

📌 **Interview term: Empty-prefix base case** — \`dp[0] = 1\`. It is not "the answer for an empty string" so much as a bookkeeping value: when the first two digits form a letter, \`dp[2]\` must count that one decoding, and it does so by adding \`dp[0]\`.

## 4. The Zero Rules — Where the Points Are

The letters are 1 to 26. That one fact gives every zero rule:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Zero rules. A single 0 is not a letter. 06 is not a letter because a two digit code cannot start with 0. 10 and 20 are letters J and T. 30 to 90 are not letters">
  <rect class="d-box-muted" x="20" y="20" width="310" height="70" rx="10"/>
  <text class="d-text" x="175" y="50" text-anchor="middle">0 alone</text>
  <text class="d-sub" x="175" y="74" text-anchor="middle">no letter 0: one-digit move is banned</text>
  <rect class="d-box-muted" x="370" y="20" width="310" height="70" rx="10"/>
  <text class="d-text" x="525" y="50" text-anchor="middle">06, 05, 00</text>
  <text class="d-sub" x="525" y="74" text-anchor="middle">two digits starting with 0 are banned</text>
  <rect class="d-box-accent" x="20" y="130" width="310" height="70" rx="10"/>
  <text class="d-text" x="175" y="160" text-anchor="middle">10 and 20</text>
  <text class="d-sub" x="175" y="184" text-anchor="middle">J and T: the only home for a 0</text>
  <rect class="d-box-muted" x="370" y="130" width="310" height="70" rx="10"/>
  <text class="d-text" x="525" y="160" text-anchor="middle">30, 40, up to 90</text>
  <text class="d-sub" x="525" y="184" text-anchor="middle">bigger than 26: the 0 is stranded</text>
  <rect class="d-box" x="195" y="230" width="310" height="56" rx="10"/>
  <text class="d-text" x="350" y="264" text-anchor="middle">stranded 0 means 0 ways in total</text>
</svg>

Put together:

- **A \`0\` can never be a letter by itself.** So the one-digit move is skipped when \`s[i-1]\` is \`0\`.
- **A two-digit code must be 10 to 26.** \`06\` is not F: the first digit of a two-digit code must be \`1\`, or \`2\` with a second digit of \`0\` to \`6\`. Checking the characters this way rules out \`06\` automatically.
- **So every \`0\` must be the second half of \`10\` or \`20\`.** If the digit before it is anything else (\`0\`, \`3\` to \`9\`) or there is no digit before it (a leading \`0\`), that zero cannot be placed, both moves are banned at that position, \`dp\` becomes 0, and the whole answer is 0: \`"06"\`, \`"0"\`, \`"100"\`, \`"230"\` all give 0.
- **A zero also removes options from its neighbour.** In \`"2101"\`, the \`1\` before the \`0\` cannot be its own letter — it is needed for \`10\` — so \`"2101"\` has just one decoding, BJA.

📌 **Interview term: Leading zero** — a \`0\` at the start of a number, as in \`06\`. In this problem a code with a leading zero is invalid, and a string whose first digit is \`0\` has no decoding at all.

**The \`int("06")\` trap.** The natural way to test the two-digit case is to convert the two characters to a number and check \`10 <= x <= 26\`. That works — as long as you check \`>= 10\`, not \`>= 1\`. Converting \`"06"\` gives 6 in every language (we ran it: Python \`int\`, JavaScript \`Number\` and \`parseInt\`, Java \`Integer.parseInt\`, C++ \`std::stoi\` all returned 6), so a check like \`x <= 26\` alone happily accepts \`06\` as a letter. The character test \`first == '1' or (first == '2' and second <= '6')\` cannot make that mistake.

## 5. The Table on "11106"

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="dp table for 11106 is 1, 1, 2, 3, 2, 2. At the zero only the two digit move 10 is allowed, and at the final 6 only the one digit move is allowed because 06 is not a letter">
  <rect class="d-box-muted" x="20" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="65" y="94" text-anchor="middle">1</text>
  <rect class="d-box" x="130" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="175" y="94" text-anchor="middle">1</text>
  <rect class="d-box" x="240" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="285" y="94" text-anchor="middle">2</text>
  <rect class="d-box" x="350" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="395" y="94" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="460" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="505" y="94" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="570" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="615" y="94" text-anchor="middle">2</text>
  <text class="d-sub" x="65" y="40" text-anchor="middle">empty</text>
  <text class="d-sub" x="175" y="40" text-anchor="middle">1</text>
  <text class="d-sub" x="285" y="40" text-anchor="middle">11</text>
  <text class="d-sub" x="395" y="40" text-anchor="middle">111</text>
  <text class="d-sub" x="505" y="40" text-anchor="middle">1110</text>
  <text class="d-sub" x="615" y="40" text-anchor="middle">11106</text>
  <text class="d-sub" x="505" y="150" text-anchor="middle">only 10</text>
  <text class="d-sub" x="505" y="172" text-anchor="middle">dp 2 copied</text>
  <text class="d-sub" x="615" y="150" text-anchor="middle">only 6</text>
  <text class="d-sub" x="615" y="172" text-anchor="middle">06 banned</text>
</svg>

| i | prefix | one-digit move | two-digit move | dp[i] |
| :--- | :--- | :--- | :--- | :--- |
| 0 | (empty) | — | — | 1 |
| 1 | 1 | \`1\` ok → dp[0] = 1 | — | 1 |
| 2 | 11 | \`1\` ok → dp[1] = 1 | \`11\` ok → dp[0] = 1 | 2 |
| 3 | 111 | \`1\` ok → dp[2] = 2 | \`11\` ok → dp[1] = 1 | 3 |
| 4 | 1110 | \`0\` **banned** | \`10\` ok → dp[2] = 2 | 2 |
| 5 | 11106 | \`6\` ok → dp[4] = 2 | \`06\` **banned** | 2 |

The two decodings are AAJF (1-1-10-6) and KJF (11-10-6), exactly what example 1 lists. Notice row 4: the zero **removed** the option "111 then 0" and forced the 1 before it into \`10\`, so dp dropped from 3 to 2.

## 6. From Recursion to Two Variables in C++

**Plain recursion** follows the definition: \`ways(i)\` returns 1 at the end of the string, 0 at a \`0\`, otherwise \`ways(i+1)\` plus (if the next two digits form 10 to 26) \`ways(i+2)\`. It is correct but exponential: on a string of thirty \`1\`s it made **3,524,577 calls** in example 2, because \`ways(i+2)\` is recomputed inside \`ways(i+1)\` too.

📌 **Interview term: Overlapping subproblems** — the same \`ways(i)\` is asked for again and again by different branches; caching or tabulating it makes each one cost O(1).

**The table** (\`dp\` array of length n + 1) fixes that. Since \`dp[i]\` only reads \`dp[i-1]\` and \`dp[i-2]\`, two variables are enough:

~~~cpp
long long numDecodings(const std::string& s) {
    if (s.empty()) return 1;                    // one way to decode nothing (ask your interviewer)
    long long prev = 1, cur = s[0] != '0' ? 1 : 0; // dp[i-1], dp[i] for i = 1
    for (size_t i = 1; i < s.size(); i++) {
        char a = s[i - 1], b = s[i];
        long long next = 0;
        if (b != '0') next = cur;               // b alone is a letter 1..9
        if (a == '1' || (a == '2' && b <= '6')) next += prev; // 10..26, never 06
        prev = cur;
        cur = next;
    }
    return cur;
}
~~~

**What to point out in this code:**

- \`prev\` and \`cur\` play the roles of \`dp[i-1]\` and \`dp[i]\`; \`prev = cur; cur = next;\` shifts them (the order of those two lines matters).
- \`cur\` starts at \`s[0] != '0' ? 1 : 0\`, so a leading zero zeroes the count immediately, and the answer stays 0.
- \`char\` comparisons like \`b <= '6'\` compare character codes; the C++ standard guarantees that \`'0'\` to \`'9'\` are contiguous and increasing, which is also why \`s[i] - '0'\` gives the digit value.
- The string is taken by \`const std::string&\`, so nothing is copied, and the loop creates no temporary strings. \`std::stoi(s.substr(i - 1, 2))\` would allocate on every step.
- The count is \`long long\`; the Fibonacci-like growth passes a 32-bit \`int\` at about 45 digits.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the zero edge cases, with every decoding listed by a small backtracking search** prints:

~~~text
"12" -> 2: AB, L
"226" -> 3: BBF, BZ, VF
"06" -> 0
"0" -> 0
"10" -> 1: J
"100" -> 0
"2101" -> 1: BJA
"27" -> 1: BG
"11106" -> 2: AAJF, KJF
"230" -> 0
"1201234" -> 3: ATABCD, ATAWD, ATLCD
dp table for "11106": [1, 1, 2, 3, 2, 2]
dp table for "226": [1, 1, 2, 3]
~~~

Read it against the rules from section 4:

- \`"06" -> 0\` and \`"0" -> 0\`: a leading zero has nowhere to go.
- \`"10" -> 1\` (J) — the zero is glued to the 1. \`"100" -> 0\` — the second zero has only another zero before it, and \`00\` is not a letter.
- \`"230" -> 0\`: \`30\` is above 26, so the zero is stranded even though \`23\` alone is a fine letter.
- \`"2101" -> 1\`: the zero forces \`10\`, which removes every other split.
- \`"1201234" -> 3\`: the zero forces \`20\`, then \`1234\` decodes three ways (ABCD, AWD, LCD), each prefixed by A and T.
- The two dp tables match section 5 and the 226 story: \`[1, 1, 2, 3]\`.

**Example 2 — plain recursion vs the DP** prints:

~~~text
n=10 ones: naive 89 after 232 calls, DP 89 in one pass
n=20 ones: naive 10946 after 28656 calls, DP 10946 in one pass
n=30 ones: naive 1346269 after 3524577 calls, DP 1346269 in one pass
n=40 ones: DP 165580141
n=40 of 2 then 7 repeated: DP 1
n=40 of 26 repeated: DP 1048576
~~~

For a string of n ones the count is a Fibonacci number (89, 10946, 1346269, …), because every position can take one digit or two — exactly climbing stairs. The plain recursion's calls grow at the same rate (232 → 28,656 → 3,524,577) while the DP makes one pass. \`"27"\` repeated has only 1 decoding (27 is not a letter), and \`"26"\` repeated 20 times has 2^20 = 1,048,576, because each \`26\` independently splits or not.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential (Fibonacci-like) | O(n) stack | \`ways(i+2)\` is recomputed inside \`ways(i+1)\`; 3,524,577 calls for n = 30 |
| Memoized recursion | O(n) | O(n) memo + O(n) stack | each \`ways(i)\` computed once |
| DP table | O(n) | O(n) | one pass, \`dp\` of length n + 1 |
| Two variables | O(n) | O(1) | only \`dp[i-1]\` and \`dp[i-2]\` are ever read |

A memoized recursive version in C++ uses one stack frame per digit and can overflow the stack (a crash, not an exception) on very long strings; the loop version cannot.

## 9. Edge Cases

- **Leading zero** (\`"0"\`, \`"06"\`, \`"012"\`): answer 0.
- **\`10\` and \`20\`:** exactly one way to place the zero. \`"10"\` → 1, \`"20"\` → 1.
- **\`00\` anywhere, or \`30\` to \`90\`:** answer 0 — the second zero, or the zero after a 3 to 9, has nowhere to go.
- **\`27\` to \`99\` with no zero:** only the one-digit move; \`"27"\` → 1.
- **Long runs of \`1\` and \`2\`:** the count grows like Fibonacci; check the number type (or a modulus).
- **Empty string:** the DP returns 1; confirm what the interviewer wants.

## Common Pitfalls

- **Testing \`std::stoi(two) <= 26\` without \`>= 10\`.** \`std::stoi("06")\` is 6, so \`06\` slips through as F. Use the \`char\` test, or check both bounds.
- **Forgetting the one-digit ban on \`0\`.** Without it, \`"10"\` counts 2 (1-0 and 10) instead of 1.
- **\`dp[0] = 0\` instead of 1.** Then \`"12"\` gives 1 instead of 2.
- **Comparing a \`char\` with a string literal.** \`s[i] == "0"\` compares a \`char\` with a pointer and does not compile cleanly (it is an error in standard C++); write \`s[i] == '0'\`.
- **Using \`int\` for the count, or \`s.size() - 2\` on a short string.** \`size_t\` is unsigned, so \`s.size() - 2\` for a one-character string wraps to a huge number; loop from index 1 as the code does.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i]</code> is the number of ways to decode the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> digits, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0] = 1</code> for the empty prefix.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The two moves:</strong> <span style="color:#f0e2c8;">The last letter is one digit (only if it is not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i-1]</code>) or two digits (only if they form 10 to 26, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i-2]</code>).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The zero rules:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> must be the second half of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">10</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">20</code>. A leading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">00</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">30</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">90</code> strands it, and the answer becomes 0. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">06</code> is not F.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n) time, and O(1) space with two variables, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i]</code> only reads the previous two values.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">I compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char</code>s and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[i] - '0'</code> for digit values, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stoi("06")</code> is 6 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">substr</code> allocates on every step.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does "100" return, and why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">0. The first zero pairs with the 1 to make J, but the second zero has only a 0 before it, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">00</code> is not a letter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is dp[0] equal to 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the one way to decode nothing. Without it, a string like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"12"</code> would not count the decoding that uses both digits as one letter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you list the decodings, not just count them?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Backtracking with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;std::string&gt;</code> and a growing path: try a one-digit letter and, if valid, a two-digit letter. The output can be exponential.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the string can contain <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">*</code> as a wildcard for 1 to 9?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same DP, but each move is multiplied by how many digits the wildcard can be (9 for one digit, 15 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">**</code> as two digits), returned modulo 1,000,000,007 in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is s[i] - '0' guaranteed to work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The C++ standard requires the digit characters <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'0'</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'9'</code> to be contiguous and increasing, so subtracting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'0'</code> always gives the digit value.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix DP** | \`dp[i]\` answers the question for the first \`i\` characters |
| **Empty-prefix base case** | \`dp[0] = 1\`: one way to decode nothing, the seed of the recurrence |
| **Leading zero** | A \`0\` at the start of a code; \`06\` is not a valid two-digit letter |
| **Overlapping subproblems** | The same suffix is decoded many times by plain recursion |

---
**Conclusion:** Decode Ways is climbing stairs with rules: \`dp[i]\` counts decodings of the first \`i\` digits, the last letter takes one digit (never a lone \`0\`) or two digits (only 10 to 26), and \`dp[0] = 1\` seeds it all. The zeros are the real question: a \`0\` must be the second half of \`10\` or \`20\`, so a leading zero, \`00\`, or \`30\` to \`90\` make the answer 0, and \`06\` is never F. Two variables give O(n) time and O(1) space. In C++, compare \`char\`s and use \`s[i] - '0'\`, avoiding \`std::stoi\` on substrings and keeping the count in \`long long\`.`,
        examples: [
          {
            label: `Decode ways on the zero edge cases, with every decoding listed`,
            code: `#include <iostream>
#include <string>
#include <vector>

long long numDecodings(const std::string& s) {
    if (s.empty()) return 1;                    // one way to decode nothing (ask your interviewer)
    long long prev = 1, cur = s[0] != '0' ? 1 : 0; // dp[i-1], dp[i] for i = 1
    for (size_t i = 1; i < s.size(); i++) {
        char a = s[i - 1], b = s[i];
        long long next = 0;
        if (b != '0') next = cur;               // b alone is a letter 1..9
        if (a == '1' || (a == '2' && b <= '6')) next += prev; // 10..26, never 06
        prev = cur;
        cur = next;
    }
    return cur;
}

std::vector<long long> decodeTable(const std::string& s) {
    size_t n = s.size();
    std::vector<long long> dp(n + 1, 0);        // dp[i] = ways to decode the first i digits
    dp[0] = 1;
    for (size_t i = 1; i <= n; i++) {
        if (s[i - 1] != '0') dp[i] += dp[i - 1];                  // last letter uses one digit
        if (i >= 2) {
            int two = (s[i - 2] - '0') * 10 + (s[i - 1] - '0');
            if (two >= 10 && two <= 26) dp[i] += dp[i - 2];       // last letter uses two digits
        }
    }
    return dp;
}

void allDecodings(const std::string& s, size_t i, const std::string& path, std::vector<std::string>& out) {
    if (i == s.size()) { out.push_back(path); return; }
    if (s[i] == '0') return;
    allDecodings(s, i + 1, path + char('A' + s[i] - '1'), out);
    if (i + 1 < s.size()) {
        int two = (s[i] - '0') * 10 + (s[i + 1] - '0');
        if (two >= 10 && two <= 26) allDecodings(s, i + 2, path + char('A' + two - 1), out);
    }
}

std::string fmt(const std::vector<long long>& xs) {
    std::string r = "[";
    for (size_t i = 0; i < xs.size(); i++) r += (i ? ", " : "") + std::to_string(xs[i]);
    return r + "]";
}

int main() {
    for (std::string s : {"12", "226", "06", "0", "10", "100", "2101", "27", "11106", "230", "1201234"}) {
        long long ways = numDecodings(s);
        std::string line = "\\"" + s + "\\" -> " + std::to_string(ways);
        if (ways > 0) {
            std::vector<std::string> out;
            allDecodings(s, 0, "", out);
            line += ": ";
            for (size_t k = 0; k < out.size(); k++) line += (k ? ", " : "") + out[k];
        }
        std::cout << line << "\\n";
    }
    std::cout << "dp table for \\"11106\\": " << fmt(decodeTable("11106")) << "\\n";
    std::cout << "dp table for \\"226\\": " << fmt(decodeTable("226")) << "\\n";
}`,
          },
          {
            label: `Naive recursion vs DP: call counts and the Fibonacci pattern`,
            code: `#include <iostream>
#include <string>

long long numDecodings(const std::string& s) {
    if (s.empty()) return 1;                    // one way to decode nothing (ask your interviewer)
    long long prev = 1, cur = s[0] != '0' ? 1 : 0; // dp[i-1], dp[i] for i = 1
    for (size_t i = 1; i < s.size(); i++) {
        char a = s[i - 1], b = s[i];
        long long next = 0;
        if (b != '0') next = cur;               // b alone is a letter 1..9
        if (a == '1' || (a == '2' && b <= '6')) next += prev; // 10..26, never 06
        prev = cur;
        cur = next;
    }
    return cur;
}

long long calls = 0;

long long naive(const std::string& s, size_t i) {
    calls++;
    if (i == s.size()) return 1;
    if (s[i] == '0') return 0;
    long long ways = naive(s, i + 1);
    if (i + 1 < s.size() && (s[i] == '1' || (s[i] == '2' && s[i + 1] <= '6'))) ways += naive(s, i + 2);
    return ways;
}

std::string repeat(const std::string& part, int times) {
    std::string r;
    for (int k = 0; k < times; k++) r += part;
    return r;
}

int main() {
    for (int n : {10, 20, 30}) {
        std::string s(n, '1');
        calls = 0;
        long long a = naive(s, 0);
        std::cout << "n=" << n << " ones: naive " << a << " after " << calls << " calls, DP " << numDecodings(s) << " in one pass\\n";
    }
    std::cout << "n=40 ones: DP " << numDecodings(std::string(40, '1')) << "\\n";
    std::cout << "n=40 of 2 then 7 repeated: DP " << numDecodings(repeat("27", 20)) << "\\n";
    std::cout << "n=40 of 26 repeated: DP " << numDecodings(repeat("26", 20)) << "\\n";
}`,
          },
        ],
      },
    },
  },
  {
    title: `How do you solve the word break problem?`,
    difficulty: "medium",
    seoDescription: `Word break with 1D DP: dp[i] means the first i letters split into words, max-length pruning, rebuilding the split, verified in Python, JS, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a string and a dictionary of words, decide whether the string can be split into a sequence of one or more dictionary words, using any word as many times as you like. For example, 'applepenapple' with the words 'apple' and 'pen' is true. Explain the approach and code it in Python."

**What a strong answer should cover:**
- The state: \`ok[i]\` is true when the first \`i\` characters can be split into words, with \`ok[0] = true\` for the empty prefix.
- The transition: \`ok[i]\` is true if some \`j < i\` has \`ok[j]\` true and \`s[j:i]\` in the dictionary; put the words in a hash set first, and stop at the first \`j\` that works.
- Complexity: O(n²) substring checks (each costing up to O(n) to build and hash), reduced to O(n · L) checks when \`j\` only goes back as far as the longest word length L.
- Why plain recursion explodes (a string of \`a\`s ending in \`b\`, with words \`a\`, \`aa\`, \`aaa\`…) and how memoization on the start index fixes it; how to rebuild one split by remembering where the last word starts.
- Python details: \`set(words)\` for O(1) average lookups, that \`s[j:i]\` builds a new string each time, and \`max((len(w) for w in words), default=0)\` for an empty dictionary.

**Clarifying questions expected:**
- Can dictionary words be reused, and is the empty string considered breakable?
- How long are the string and the words — is the dictionary large?
- Do you need just true/false, one split, or all possible splits?

**Code / implementation expected:** Yes — a bottom-up Python DP over prefix lengths with a hash set; rebuilding one split is a common follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, strings and hash sets; the DP is built up from scratch.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Your friend sends a text with the space bar broken: **"catsanddog"**. You read it instantly as "cats and dog" — or was it "cat sand dog"? Either way, you are sure it is made of real words. Now they send **"catsandog"**. You try "cats and og"… "cat sand og"… there is no word "og". That message cannot be split into words at all.

Your brain did something clever there. It did not try every possible way of cutting the string. It remembered facts like "the first 3 letters, *cat*, are fine" and "the first 7 letters, *catsand*, are fine", and then only asked "is the rest a word?". Remembering which **prefixes** are fine is the entire Word Break solution.

Search engines, spell checkers and input methods for languages written without spaces face exactly this task: given a run of characters and a dictionary, find whether — and how — it splits into words.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can a dictionary word be used more than once? | The standard version says yes; "at most once" is a different, harder problem |
| Is the empty string breakable? | The DP says yes (zero words); confirm the expected answer |
| How long is the string, and how long are the words? | The longest word length L limits how far back each step must look |
| How big is the dictionary? | Large dictionaries favour a hash set or a [trie](/interview-question/what-is-a-trie-and-when-is-it-useful) over scanning the word list |
| Do you want true/false, one split, or every split? | One split is a small addition; every split (Word Break II) can be exponential output |

## 3. The Core Idea: Which Prefixes Can Be Split?

📌 **Interview term: Prefix DP** — \`dp[i]\` answers the question for the first \`i\` characters, built from answers for shorter prefixes.

Let \`ok[i]\` mean "the first \`i\` characters of \`s\` can be split into dictionary words". The empty prefix can always be split (into zero words), so \`ok[0] = true\`.

To decide \`ok[i]\`, think about the **last word** of a split. It is some slice \`s[j:i]\`. The split works if that slice is a dictionary word **and** everything before it, the first \`j\` characters, can itself be split — which is exactly \`ok[j]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="ok of i is true when some earlier position j has ok of j true and the slice from j to i is a dictionary word">
  <defs>
    <marker id="b28q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="260" height="70" rx="10"/>
  <text class="d-text" x="150" y="60" text-anchor="middle">first j letters</text>
  <text class="d-sub" x="150" y="84" text-anchor="middle">ok of j is true</text>
  <rect class="d-box" x="300" y="30" width="200" height="70" rx="10"/>
  <text class="d-text" x="400" y="60" text-anchor="middle">slice j to i</text>
  <text class="d-sub" x="400" y="84" text-anchor="middle">is in the word set</text>
  <path class="d-edge" d="M 260 102 L 330 146" marker-end="url(#b28q5-arrow)"/>
  <path class="d-edge" d="M 400 102 L 380 146" marker-end="url(#b28q5-arrow)"/>
  <rect class="d-box-accent" x="250" y="150" width="200" height="56" rx="10"/>
  <text class="d-text" x="350" y="184" text-anchor="middle">ok of i is true</text>
</svg>

~~~text
ok[0] = true
ok[i] = true  if some j < i has  ok[j] == true  and  s[j:i] in words
answer = ok[n]
~~~

📌 **Interview term: Hash set** — a set with O(1) average-time membership tests, built by hashing each word once. See [How does a hash table work?](/interview-question/how-does-a-hash-table-work). Putting the dictionary in a set is what makes each \`s[j:i] in words\` test fast.

Here is the table for \`"applepenapple"\` with the words \`apple\` and \`pen\`. Only four positions are reachable, and each is reached by a word that starts at an earlier reachable position:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 190" role="img" aria-label="Reachable positions for applepenapple are 0, 5, 8 and 13, joined by the words apple, pen and apple">
  <path class="d-edge-accent" d="M 40 120 C 80 40, 260 40, 300 120"/>
  <path class="d-edge-accent" d="M 300 120 C 330 60, 430 60, 456 120"/>
  <path class="d-edge-accent" d="M 456 120 C 500 40, 640 40, 676 120"/>
  <text class="d-sub" x="170" y="40" text-anchor="middle">apple</text>
  <text class="d-sub" x="378" y="58" text-anchor="middle">pen</text>
  <text class="d-sub" x="566" y="40" text-anchor="middle">apple</text>
  <rect class="d-box-accent" x="22" y="124" width="36" height="40" rx="6"/>
  <text class="d-text" x="40" y="150" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="282" y="124" width="36" height="40" rx="6"/>
  <text class="d-text" x="300" y="150" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="438" y="124" width="36" height="40" rx="6"/>
  <text class="d-text" x="456" y="150" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="644" y="124" width="48" height="40" rx="6"/>
  <text class="d-text" x="668" y="150" text-anchor="middle">13</text>
</svg>

\`ok[0]\`, \`ok[5]\`, \`ok[8]\` and \`ok[13]\` are true; \`ok[13]\` is the whole string, so the answer is true. For \`"catsandog"\` the reachable positions are 0, 3 (cat), 4 (cats) and 7 (cat+sand or cats+and), but no word starts at 7 and ends at 9 ("og"), so \`ok[9]\` stays false.

📌 **Interview term: Reachability** — reading \`ok[i]\` as "position i can be reached from position 0 by hopping over dictionary words". It shows that word break is also a graph problem: a [BFS](/interview-question/what-is-the-difference-between-bfs-and-dfs) from 0 over word-hops gives the same answer.

## 4. Why Plain Recursion Is Too Slow

The obvious recursive solution is: "try every word that the string starts with, and recurse on the rest". It is correct, but on the right input it explodes. Take twenty \`a\`s followed by a \`b\`, with the words \`a\`, \`aa\`, \`aaa\`, \`aaaa\`, \`aaaaa\`. Every way of cutting the \`a\`s into pieces of length 1 to 5 is explored, and every one of them fails at the \`b\`. In example 2 that took **814,296 calls** and **1,657,292** substring checks.

📌 **Interview term: Memoization** — caching the result of a function for each input so it is computed once. Here the only input that changes is the start index \`i\`, so there are at most n + 1 different calls; with a cache, the same string took 91 calls. See [What is memoization?](/interview-question/what-is-memoization) and [What is dynamic programming?](/interview-question/what-is-dynamic-programming) for the two styles.

The bottom-up table below does the same work as the memoized recursion, without the recursion.

## 5. The Code in Python

The function returns one valid split (so the caller can print it), or "none" when there is no split. Two refinements are built in:

- **Only look back as far as the longest word.** A last word longer than \`max_len\` cannot be in the dictionary, so \`j\` starts at \`i − max_len\`. On the \`a…ab\` string that cut the table from 161 to 25 substring checks.
- **Stop at the first \`j\` that works** (\`break\`), and remember it in \`cut[i]\` so the split can be rebuilt by walking back from \`n\`.

📌 **Interview term: Pruning** — skipping work that cannot change the answer, here every \`j\` that would make the last word longer than any dictionary word.

~~~python
def word_break(s, words):
    """Return the list of words in one valid split of s, or None if there is none."""
    word_set = set(words)                  # O(1) average membership tests
    max_len = max((len(w) for w in words), default=0)
    n = len(s)
    ok = [False] * (n + 1)                 # ok[i]: the first i letters can be split
    ok[0] = True                           # the empty prefix splits trivially
    cut = [-1] * (n + 1)                   # cut[i]: where the last word of that split starts
    for i in range(1, n + 1):
        for j in range(max(0, i - max_len), i):   # the last word is s[j:i]
            if ok[j] and s[j:i] in word_set:
                ok[i] = True
                cut[i] = j
                break
    if not ok[n]:
        return None
    parts, i = [], n
    while i > 0:                           # walk the cuts back to the start
        parts.append(s[cut[i]:i])
        i = cut[i]
    return parts[::-1]
~~~

**What to point out in this code:**

- \`set(words)\` turns the list into a hash set once, so \`s[j:i] in word_set\` is an O(1) average lookup (plus the cost of hashing the slice). \`in\` on the original **list** would scan it every time.
- \`s[j:i]\` creates a **new string** on every check — slicing is O(length) in Python. With the max-length pruning, each slice is at most L characters.
- \`max(..., default=0)\` handles an empty dictionary; without \`default\`, \`max()\` of an empty sequence raises \`ValueError\`.
- \`[False] * (n + 1)\` is safe because \`bool\`s are immutable; \`parts[::-1]\` reverses the rebuilt list (or use \`parts.reverse()\` in place).
- The function returns \`None\` for "no split" and \`[]\` for the empty string, so the caller tests \`split is not None\`, not \`if split:\` — an empty list is falsy.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the DP on the classic cases, with one split rebuilt** prints:

~~~text
"leetcode" -> true: leet | code
"applepenapple" -> true: apple | pen | apple
"catsandog" -> false
"catsanddog" -> true: cat | sand | dog
"aaaaaaa" -> true: aaa | aaaa
"cars" -> true: ca | rs
"a" -> false
"" -> true
~~~

What to read from this:

- \`"catsandog" -> false\` while \`"catsanddog" -> true\`. The split found is \`cat | sand | dog\`; \`cats | and | dog\` is also valid — the code keeps the first \`j\` it finds for each position, scanning from the farthest allowed start.
- \`"aaaaaaa"\` with \`aaaa\` and \`aaa\` splits as \`aaa | aaaa\`: 7 = 3 + 4, even though neither word alone divides 7.
- \`"cars"\` with \`car\`, \`ca\`, \`rs\` shows why greedy "take the longest word" fails: \`car\` leaves \`s\`, which is not a word, while \`ca | rs\` works.
- \`"" -> true\`: the empty string splits into zero words (\`ok[0] = true\`).

**Example 2 — plain recursion vs memoization vs the table** prints:

~~~text
naive recursion: false, 814296 calls, 1657292 substring checks
memoized recursion: false, 91 calls, 231 substring checks
dp table, no length limit: false, 161 substring checks
dp table, max word length 5: false, 25 substring checks
same dictionary on 20 a: true, 20 substring checks
~~~

On twenty \`a\`s followed by \`b\`, plain recursion made 814,296 calls; memoization cut that to 91 calls; the table needed 161 substring checks, and only 25 once \`j\` was limited to the longest word length (5). The last line shows the same dictionary on twenty \`a\`s with no \`b\`: true, after 20 checks, because the \`break\` stops at the first word that fits.

## 7. Complexity

Let n = length of \`s\`, L = length of the longest word, and W = number of words.

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential | O(n) stack | every way of cutting the string is tried; 814,296 calls for 21 characters |
| Memoized recursion | O(n²) checks | O(n) memo + O(n) stack | each start index is solved once, trying up to n ends |
| DP table | O(n²) checks | O(n) | for each \`i\`, up to \`i\` values of \`j\` |
| DP table with max-length pruning | O(n · L) checks | O(n) | only the last L values of \`j\` |
| Building the word set | O(total letters in the dictionary) | same | each word is hashed once |

Each "check" also builds and hashes a substring of length up to L, so the honest time is O(n · L²) with pruning (O(n³) without it). With a [trie](/interview-question/what-is-a-trie-and-when-is-it-useful) you can walk forward from each reachable \`j\` one character at a time and test every word starting there in O(L), which makes the whole run O(n · L).

## 8. Edge Cases

- **Empty string:** \`ok[0]\` is the answer, true.
- **Empty dictionary:** nothing can be split except the empty string.
- **A word longer than the string:** never matches; the pruning bound handles it.
- **Many overlapping words** (\`a\`, \`aa\`, \`aaa\`…): the worst case for plain recursion; fine for the DP.
- **Greedy traps** (\`"cars"\` with \`car\`, \`ca\`, \`rs\`): taking the longest word first fails; the DP tries every last word.
- **Duplicate words in the dictionary:** the set removes them.

## Common Pitfalls

- **Looking words up in a list.** \`s[j:i] in words\` on a list is O(W) per check; build \`set(words)\` first.
- **Forgetting \`ok[0] = True\`.** Then nothing is ever reachable and every answer is \`False\`.
- **Treating an empty result as failure.** \`if split:\` is \`False\` for \`[]\`, the valid split of the empty string; compare with \`None\`.
- **Greedy longest-match.** It fails on \`"cars"\` with \`car\`, \`ca\`, \`rs\`; the DP considers every possible last word.
- **Recursing without \`lru_cache\` (or a dict).** Exponential on \`a…ab\` (814,296 calls for 21 characters); and with a cache, deep strings meet the 1000-frame recursion limit — the loop has no limit.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[i]</code> is true when the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> letters can be split into words; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[0] = True</code> for the empty prefix.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The transition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[i]</code> is true if some <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j &lt; i</code> has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[j]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[j:i] in word_set</code>; I break at the first such <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The speed-ups:</strong> <span style="color:#f0e2c8;">Words go into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> only goes back the longest word length, which cut 161 checks to 25 in my test.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n · L) checks and O(n) space; each check slices and hashes up to L characters.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Slicing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[j:i]</code> copies, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> gives O(1) lookups, and the loop avoids the recursion limit a top-down version would hit.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the actual words?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cut[i] = j</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[i]</code> becomes true, then walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cut</code> and reverse. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catsanddog</code> that gave cat, sand, dog.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about returning every possible split?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is Word Break II: memoize, for each start index, the list of sentences of the suffix. The output itself can be exponential, so first check with this DP that any split exists.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not greedy longest match?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It fails on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"cars"</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">car</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ca</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rs</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">car</code> leaves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code>. The DP tries every possible last word.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would a trie help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From each reachable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code>, walk the trie forward letter by letter; every end-of-word node marks a reachable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>. That tests all words starting at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> in O(L) with no slicing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it with BFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: positions are nodes and words are edges from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j + len(word)</code>. A BFS from 0 with a visited set reaches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> exactly when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[n]</code> is true.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix DP** | \`dp[i]\` answers the question for the first \`i\` characters |
| **Hash set** | A set with O(1) average membership tests |
| **Reachability** | Reading \`ok[i]\` as "position i can be reached by hopping over words from 0" |
| **Memoization** | Caching a function result per input so it is computed once |
| **Pruning** | Skipping work that cannot change the answer, such as last words longer than any dictionary word |

---
**Conclusion:** Word break is a prefix DP: \`ok[i]\` says the first \`i\` letters split into words, \`ok[0]\` is true, and \`ok[i]\` becomes true as soon as some reachable \`j\` is followed by a dictionary word \`s[j:i]\`. With the words in a hash set and \`j\` limited to the longest word length, that is O(n · L) checks and O(n) space, where plain recursion took 814,296 calls on a 21-character string. Remember the cut position for each \`i\` to rebuild a split, and mention a trie or BFS for the follow-ups. In Python, build a \`set\` once, remember that slices copy, and prefer the loop to a recursive version that meets the recursion limit.`,
        examples: [
          {
            label: `Word break DP on classic cases, with one split rebuilt`,
            code: `def word_break(s, words):
    """Return the list of words in one valid split of s, or None if there is none."""
    word_set = set(words)                  # O(1) average membership tests
    max_len = max((len(w) for w in words), default=0)
    n = len(s)
    ok = [False] * (n + 1)                 # ok[i]: the first i letters can be split
    ok[0] = True                           # the empty prefix splits trivially
    cut = [-1] * (n + 1)                   # cut[i]: where the last word of that split starts
    for i in range(1, n + 1):
        for j in range(max(0, i - max_len), i):   # the last word is s[j:i]
            if ok[j] and s[j:i] in word_set:
                ok[i] = True
                cut[i] = j
                break
    if not ok[n]:
        return None
    parts, i = [], n
    while i > 0:                           # walk the cuts back to the start
        parts.append(s[cut[i]:i])
        i = cut[i]
    return parts[::-1]


def b(x):
    return str(x).lower()  # Python prints True; the other languages print true


cases = [
    ("leetcode", ["leet", "code"]),
    ("applepenapple", ["apple", "pen"]),
    ("catsandog", ["cats", "dog", "sand", "and", "cat"]),
    ("catsanddog", ["cats", "dog", "sand", "and", "cat"]),
    ("aaaaaaa", ["aaaa", "aaa"]),
    ("cars", ["car", "ca", "rs"]),
    ("a", ["b"]),
    ("", ["a"]),
]
for s, words in cases:
    split = word_break(s, words)
    line = '"' + s + '" -> ' + b(split is not None)
    if split:
        line += ": " + " | ".join(split)
    print(line)`,
          },
          {
            label: `Naive recursion vs memo vs DP: how many checks each one makes`,
            code: `calls = 0
checks = 0


def naive(s, i, word_set):
    global calls, checks
    calls += 1
    if i == len(s):
        return True
    for j in range(i + 1, len(s) + 1):
        checks += 1
        if s[i:j] in word_set and naive(s, j, word_set):
            return True
    return False


def memo(s, i, word_set, cache):
    global calls, checks
    calls += 1
    if i == len(s):
        return True
    if i in cache:
        return cache[i]
    result = False
    for j in range(i + 1, len(s) + 1):
        checks += 1
        if s[i:j] in word_set and memo(s, j, word_set, cache):
            result = True
            break
    cache[i] = result
    return result


def table(s, word_set, max_len):
    global checks
    n = len(s)
    ok = [False] * (n + 1)
    ok[0] = True
    for i in range(1, n + 1):
        for j in range(max(0, i - max_len), i):
            if ok[j]:
                checks += 1
                if s[j:i] in word_set:
                    ok[i] = True
                    break
    return ok[n]


def b(x):
    return str(x).lower()


words = {"a", "aa", "aaa", "aaaa", "aaaaa"}
s = "a" * 20 + "b"                        # the b at the end makes every split fail
calls = checks = 0
r = naive(s, 0, words)
print("naive recursion: " + b(r) + ", " + str(calls) + " calls, " + str(checks) + " substring checks")
calls = checks = 0
r = memo(s, 0, words, {})
print("memoized recursion: " + b(r) + ", " + str(calls) + " calls, " + str(checks) + " substring checks")
checks = 0
r = table(s, words, len(s))
print("dp table, no length limit: " + b(r) + ", " + str(checks) + " substring checks")
checks = 0
r = table(s, words, 5)
print("dp table, max word length 5: " + b(r) + ", " + str(checks) + " substring checks")
checks = 0
r = table("a" * 20, words, 5)
print("same dictionary on 20 a: " + b(r) + ", " + str(checks) + " substring checks")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given a string and a dictionary of words, decide whether the string can be split into a sequence of one or more dictionary words, using any word as many times as you like. For example, 'applepenapple' with the words 'apple' and 'pen' is true. Explain the approach and code it in JavaScript."

**What a strong answer should cover:**
- The state: \`ok[i]\` is true when the first \`i\` characters can be split into words, with \`ok[0] = true\` for the empty prefix.
- The transition: \`ok[i]\` is true if some \`j < i\` has \`ok[j]\` true and \`s[j:i]\` in the dictionary; put the words in a hash set first, and stop at the first \`j\` that works.
- Complexity: O(n²) substring checks (each costing up to O(n) to build and hash), reduced to O(n · L) checks when \`j\` only goes back as far as the longest word length L.
- Why plain recursion explodes (a string of \`a\`s ending in \`b\`, with words \`a\`, \`aa\`, \`aaa\`…) and how memoization on the start index fixes it; how to rebuild one split by remembering where the last word starts.
- JavaScript details: \`new Set(words)\` and \`set.has(s.slice(j, i))\`, \`new Array(n + 1).fill(false)\`, and that \`Math.max(...words.map(...))\` returns \`-Infinity\` for an empty dictionary.

**Clarifying questions expected:**
- Can dictionary words be reused, and is the empty string considered breakable?
- How long are the string and the words — is the dictionary large?
- Do you need just true/false, one split, or all possible splits?

**Code / implementation expected:** Yes — a bottom-up JavaScript DP over prefix lengths with a hash set; rebuilding one split is a common follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, strings and hash sets; the DP is built up from scratch.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Your friend sends a text with the space bar broken: **"catsanddog"**. You read it instantly as "cats and dog" — or was it "cat sand dog"? Either way, you are sure it is made of real words. Now they send **"catsandog"**. You try "cats and og"… "cat sand og"… there is no word "og". That message cannot be split into words at all.

Your brain did something clever there. It did not try every possible way of cutting the string. It remembered facts like "the first 3 letters, *cat*, are fine" and "the first 7 letters, *catsand*, are fine", and then only asked "is the rest a word?". Remembering which **prefixes** are fine is the entire Word Break solution.

Search engines, spell checkers and input methods for languages written without spaces face exactly this task: given a run of characters and a dictionary, find whether — and how — it splits into words.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can a dictionary word be used more than once? | The standard version says yes; "at most once" is a different, harder problem |
| Is the empty string breakable? | The DP says yes (zero words); confirm the expected answer |
| How long is the string, and how long are the words? | The longest word length L limits how far back each step must look |
| How big is the dictionary? | Large dictionaries favour a hash set or a [trie](/interview-question/what-is-a-trie-and-when-is-it-useful) over scanning the word list |
| Do you want true/false, one split, or every split? | One split is a small addition; every split (Word Break II) can be exponential output |

## 3. The Core Idea: Which Prefixes Can Be Split?

📌 **Interview term: Prefix DP** — \`dp[i]\` answers the question for the first \`i\` characters, built from answers for shorter prefixes.

Let \`ok[i]\` mean "the first \`i\` characters of \`s\` can be split into dictionary words". The empty prefix can always be split (into zero words), so \`ok[0] = true\`.

To decide \`ok[i]\`, think about the **last word** of a split. It is some slice \`s[j:i]\`. The split works if that slice is a dictionary word **and** everything before it, the first \`j\` characters, can itself be split — which is exactly \`ok[j]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="ok of i is true when some earlier position j has ok of j true and the slice from j to i is a dictionary word">
  <defs>
    <marker id="b28q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="260" height="70" rx="10"/>
  <text class="d-text" x="150" y="60" text-anchor="middle">first j letters</text>
  <text class="d-sub" x="150" y="84" text-anchor="middle">ok of j is true</text>
  <rect class="d-box" x="300" y="30" width="200" height="70" rx="10"/>
  <text class="d-text" x="400" y="60" text-anchor="middle">slice j to i</text>
  <text class="d-sub" x="400" y="84" text-anchor="middle">is in the word set</text>
  <path class="d-edge" d="M 260 102 L 330 146" marker-end="url(#b28q5-arrow)"/>
  <path class="d-edge" d="M 400 102 L 380 146" marker-end="url(#b28q5-arrow)"/>
  <rect class="d-box-accent" x="250" y="150" width="200" height="56" rx="10"/>
  <text class="d-text" x="350" y="184" text-anchor="middle">ok of i is true</text>
</svg>

~~~text
ok[0] = true
ok[i] = true  if some j < i has  ok[j] == true  and  s[j:i] in words
answer = ok[n]
~~~

📌 **Interview term: Hash set** — a set with O(1) average-time membership tests, built by hashing each word once. See [How does a hash table work?](/interview-question/how-does-a-hash-table-work). Putting the dictionary in a set is what makes each \`s[j:i] in words\` test fast.

Here is the table for \`"applepenapple"\` with the words \`apple\` and \`pen\`. Only four positions are reachable, and each is reached by a word that starts at an earlier reachable position:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 190" role="img" aria-label="Reachable positions for applepenapple are 0, 5, 8 and 13, joined by the words apple, pen and apple">
  <path class="d-edge-accent" d="M 40 120 C 80 40, 260 40, 300 120"/>
  <path class="d-edge-accent" d="M 300 120 C 330 60, 430 60, 456 120"/>
  <path class="d-edge-accent" d="M 456 120 C 500 40, 640 40, 676 120"/>
  <text class="d-sub" x="170" y="40" text-anchor="middle">apple</text>
  <text class="d-sub" x="378" y="58" text-anchor="middle">pen</text>
  <text class="d-sub" x="566" y="40" text-anchor="middle">apple</text>
  <rect class="d-box-accent" x="22" y="124" width="36" height="40" rx="6"/>
  <text class="d-text" x="40" y="150" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="282" y="124" width="36" height="40" rx="6"/>
  <text class="d-text" x="300" y="150" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="438" y="124" width="36" height="40" rx="6"/>
  <text class="d-text" x="456" y="150" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="644" y="124" width="48" height="40" rx="6"/>
  <text class="d-text" x="668" y="150" text-anchor="middle">13</text>
</svg>

\`ok[0]\`, \`ok[5]\`, \`ok[8]\` and \`ok[13]\` are true; \`ok[13]\` is the whole string, so the answer is true. For \`"catsandog"\` the reachable positions are 0, 3 (cat), 4 (cats) and 7 (cat+sand or cats+and), but no word starts at 7 and ends at 9 ("og"), so \`ok[9]\` stays false.

📌 **Interview term: Reachability** — reading \`ok[i]\` as "position i can be reached from position 0 by hopping over dictionary words". It shows that word break is also a graph problem: a [BFS](/interview-question/what-is-the-difference-between-bfs-and-dfs) from 0 over word-hops gives the same answer.

## 4. Why Plain Recursion Is Too Slow

The obvious recursive solution is: "try every word that the string starts with, and recurse on the rest". It is correct, but on the right input it explodes. Take twenty \`a\`s followed by a \`b\`, with the words \`a\`, \`aa\`, \`aaa\`, \`aaaa\`, \`aaaaa\`. Every way of cutting the \`a\`s into pieces of length 1 to 5 is explored, and every one of them fails at the \`b\`. In example 2 that took **814,296 calls** and **1,657,292** substring checks.

📌 **Interview term: Memoization** — caching the result of a function for each input so it is computed once. Here the only input that changes is the start index \`i\`, so there are at most n + 1 different calls; with a cache, the same string took 91 calls. See [What is memoization?](/interview-question/what-is-memoization) and [What is dynamic programming?](/interview-question/what-is-dynamic-programming) for the two styles.

The bottom-up table below does the same work as the memoized recursion, without the recursion.

## 5. The Code in JavaScript

The function returns one valid split (so the caller can print it), or "none" when there is no split. Two refinements are built in:

- **Only look back as far as the longest word.** A last word longer than \`max_len\` cannot be in the dictionary, so \`j\` starts at \`i − max_len\`. On the \`a…ab\` string that cut the table from 161 to 25 substring checks.
- **Stop at the first \`j\` that works** (\`break\`), and remember it in \`cut[i]\` so the split can be rebuilt by walking back from \`n\`.

📌 **Interview term: Pruning** — skipping work that cannot change the answer, here every \`j\` that would make the last word longer than any dictionary word.

~~~javascript
// Returns the words of one valid split of s, or null if there is none.
function wordBreak(s, words) {
  const wordSet = new Set(words);          // O(1) average membership tests
  let maxLen = 0;
  for (const w of words) maxLen = Math.max(maxLen, w.length);
  const n = s.length;
  const ok = new Array(n + 1).fill(false); // ok[i]: the first i letters can be split
  ok[0] = true;                            // the empty prefix splits trivially
  const cut = new Array(n + 1).fill(-1);   // cut[i]: where the last word of that split starts
  for (let i = 1; i <= n; i++) {
    for (let j = Math.max(0, i - maxLen); j < i; j++) { // the last word is s.slice(j, i)
      if (ok[j] && wordSet.has(s.slice(j, i))) {
        ok[i] = true;
        cut[i] = j;
        break;
      }
    }
  }
  if (!ok[n]) return null;
  const parts = [];
  for (let i = n; i > 0; i = cut[i]) parts.push(s.slice(cut[i], i)); // walk the cuts back
  return parts.reverse();
}
~~~

**What to point out in this code:**

- \`new Set(words)\` turns the array into a hash set once, so \`wordSet.has(...)\` is an O(1) average lookup. \`words.includes(...)\` would scan the array every time.
- \`s.slice(j, i)\` creates a new string for each check (engines may share memory internally, but you should count it as O(length) work). With the max-length pruning, each slice is at most L characters.
- \`new Array(n + 1).fill(false)\` creates a real, dense boolean array; \`new Array(n + 1)\` alone has empty slots, and \`ok[j]\` on an empty slot is \`undefined\`, which happens to be falsy but is easy to misread.
- \`maxLen\` is computed with a loop. The one-liner \`Math.max(...words.map(w => w.length))\` returns \`-Infinity\` for an empty dictionary (we ran it) and spreads the whole array as arguments, which can fail for very large arrays.
- The function returns \`null\` for "no split" and \`[]\` for the empty string, so the caller tests \`split !== null\`.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22; the same file runs unchanged in the page). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the DP on the classic cases, with one split rebuilt** prints:

~~~text
"leetcode" -> true: leet | code
"applepenapple" -> true: apple | pen | apple
"catsandog" -> false
"catsanddog" -> true: cat | sand | dog
"aaaaaaa" -> true: aaa | aaaa
"cars" -> true: ca | rs
"a" -> false
"" -> true
~~~

What to read from this:

- \`"catsandog" -> false\` while \`"catsanddog" -> true\`. The split found is \`cat | sand | dog\`; \`cats | and | dog\` is also valid — the code keeps the first \`j\` it finds for each position, scanning from the farthest allowed start.
- \`"aaaaaaa"\` with \`aaaa\` and \`aaa\` splits as \`aaa | aaaa\`: 7 = 3 + 4, even though neither word alone divides 7.
- \`"cars"\` with \`car\`, \`ca\`, \`rs\` shows why greedy "take the longest word" fails: \`car\` leaves \`s\`, which is not a word, while \`ca | rs\` works.
- \`"" -> true\`: the empty string splits into zero words (\`ok[0] = true\`).

**Example 2 — plain recursion vs memoization vs the table** prints:

~~~text
naive recursion: false, 814296 calls, 1657292 substring checks
memoized recursion: false, 91 calls, 231 substring checks
dp table, no length limit: false, 161 substring checks
dp table, max word length 5: false, 25 substring checks
same dictionary on 20 a: true, 20 substring checks
~~~

On twenty \`a\`s followed by \`b\`, plain recursion made 814,296 calls; memoization cut that to 91 calls; the table needed 161 substring checks, and only 25 once \`j\` was limited to the longest word length (5). The last line shows the same dictionary on twenty \`a\`s with no \`b\`: true, after 20 checks, because the \`break\` stops at the first word that fits.

## 7. Complexity

Let n = length of \`s\`, L = length of the longest word, and W = number of words.

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential | O(n) stack | every way of cutting the string is tried; 814,296 calls for 21 characters |
| Memoized recursion | O(n²) checks | O(n) memo + O(n) stack | each start index is solved once, trying up to n ends |
| DP table | O(n²) checks | O(n) | for each \`i\`, up to \`i\` values of \`j\` |
| DP table with max-length pruning | O(n · L) checks | O(n) | only the last L values of \`j\` |
| Building the word set | O(total letters in the dictionary) | same | each word is hashed once |

Each "check" also builds and hashes a substring of length up to L, so the honest time is O(n · L²) with pruning (O(n³) without it). With a [trie](/interview-question/what-is-a-trie-and-when-is-it-useful) you can walk forward from each reachable \`j\` one character at a time and test every word starting there in O(L), which makes the whole run O(n · L).

## 8. Edge Cases

- **Empty string:** \`ok[0]\` is the answer, true.
- **Empty dictionary:** nothing can be split except the empty string.
- **A word longer than the string:** never matches; the pruning bound handles it.
- **Many overlapping words** (\`a\`, \`aa\`, \`aaa\`…): the worst case for plain recursion; fine for the DP.
- **Greedy traps** (\`"cars"\` with \`car\`, \`ca\`, \`rs\`): taking the longest word first fails; the DP tries every last word.
- **Duplicate words in the dictionary:** the set removes them.

## Common Pitfalls

- **Looking words up in an array.** \`words.includes(s.slice(j, i))\` is O(W) per check; build \`new Set(words)\` first.
- **Forgetting \`ok[0] = true\`.** Then nothing is ever reachable and every answer is \`false\`.
- **Confusing \`slice\` and \`substr\`/\`substring\` arguments.** \`slice(j, i)\` takes an end index; the legacy \`substr(j, len)\` takes a length. Mixing them builds the wrong word without any error.
- **Greedy longest-match.** It fails on \`"cars"\` with \`car\`, \`ca\`, \`rs\`; the DP considers every possible last word.
- **Recursing without a memo \`Map\`.** Exponential on \`a…ab\` (814,296 calls for 21 characters); a recursive version on a very long string can also hit the call-stack limit.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[i]</code> is true when the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> letters can be split into words; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[0] = true</code> for the empty prefix.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The transition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[i]</code> is true if some <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j &lt; i</code> has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[j]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wordSet.has(s.slice(j, i))</code>; I break at the first such <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The speed-ups:</strong> <span style="color:#f0e2c8;">Words go into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> only goes back the longest word length, which cut 161 checks to 25 in my test.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n · L) checks and O(n) space; each check builds and hashes a slice of up to L characters.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Set(words)</code> not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">includes</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fill(false)</code> for a dense table, and a loop rather than spreading a huge array into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the actual words?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cut[i] = j</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[i]</code> becomes true, then walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cut</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reverse()</code>. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catsanddog</code> that gave cat, sand, dog.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about returning every possible split?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is Word Break II: memoize, for each start index, the list of sentences of the suffix. The output itself can be exponential, so first check with this DP that any split exists.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not greedy longest match?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It fails on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"cars"</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">car</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ca</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rs</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">car</code> leaves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code>. The DP tries every possible last word.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would a trie help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From each reachable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code>, walk the trie forward letter by letter; every end-of-word node marks a reachable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>. That tests all words starting at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> in O(L) with no slicing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it with BFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: positions are nodes and words are edges from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j + word.length</code>. A BFS from 0 with a visited set reaches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> exactly when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[n]</code> is true.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix DP** | \`dp[i]\` answers the question for the first \`i\` characters |
| **Hash set** | A set with O(1) average membership tests |
| **Reachability** | Reading \`ok[i]\` as "position i can be reached by hopping over words from 0" |
| **Memoization** | Caching a function result per input so it is computed once |
| **Pruning** | Skipping work that cannot change the answer, such as last words longer than any dictionary word |

---
**Conclusion:** Word break is a prefix DP: \`ok[i]\` says the first \`i\` letters split into words, \`ok[0]\` is true, and \`ok[i]\` becomes true as soon as some reachable \`j\` is followed by a dictionary word \`s[j:i]\`. With the words in a hash set and \`j\` limited to the longest word length, that is O(n · L) checks and O(n) space, where plain recursion took 814,296 calls on a 21-character string. Remember the cut position for each \`i\` to rebuild a split, and mention a trie or BFS for the follow-ups. In JavaScript, use a \`Set\` rather than \`includes\`, a filled boolean array, and \`slice\` with an end index.`,
        examples: [
          {
            label: `Word break DP on classic cases, with one split rebuilt`,
            code: `// Returns the words of one valid split of s, or null if there is none.
function wordBreak(s, words) {
  const wordSet = new Set(words);          // O(1) average membership tests
  let maxLen = 0;
  for (const w of words) maxLen = Math.max(maxLen, w.length);
  const n = s.length;
  const ok = new Array(n + 1).fill(false); // ok[i]: the first i letters can be split
  ok[0] = true;                            // the empty prefix splits trivially
  const cut = new Array(n + 1).fill(-1);   // cut[i]: where the last word of that split starts
  for (let i = 1; i <= n; i++) {
    for (let j = Math.max(0, i - maxLen); j < i; j++) { // the last word is s.slice(j, i)
      if (ok[j] && wordSet.has(s.slice(j, i))) {
        ok[i] = true;
        cut[i] = j;
        break;
      }
    }
  }
  if (!ok[n]) return null;
  const parts = [];
  for (let i = n; i > 0; i = cut[i]) parts.push(s.slice(cut[i], i)); // walk the cuts back
  return parts.reverse();
}

const cases = [
  ['leetcode', ['leet', 'code']],
  ['applepenapple', ['apple', 'pen']],
  ['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']],
  ['catsanddog', ['cats', 'dog', 'sand', 'and', 'cat']],
  ['aaaaaaa', ['aaaa', 'aaa']],
  ['cars', ['car', 'ca', 'rs']],
  ['a', ['b']],
  ['', ['a']],
];
for (const [s, words] of cases) {
  const split = wordBreak(s, words);
  let line = '"' + s + '" -> ' + (split !== null);
  if (split && split.length > 0) line += ': ' + split.join(' | ');
  console.log(line);
}`,
          },
          {
            label: `Naive recursion vs memo vs DP: how many checks each one makes`,
            code: `let calls = 0;
let checks = 0;

function naive(s, i, wordSet) {
  calls++;
  if (i === s.length) return true;
  for (let j = i + 1; j <= s.length; j++) {
    checks++;
    if (wordSet.has(s.slice(i, j)) && naive(s, j, wordSet)) return true;
  }
  return false;
}

function memo(s, i, wordSet, cache) {
  calls++;
  if (i === s.length) return true;
  if (cache.has(i)) return cache.get(i);
  let result = false;
  for (let j = i + 1; j <= s.length; j++) {
    checks++;
    if (wordSet.has(s.slice(i, j)) && memo(s, j, wordSet, cache)) {
      result = true;
      break;
    }
  }
  cache.set(i, result);
  return result;
}

function table(s, wordSet, maxLen) {
  const n = s.length;
  const ok = new Array(n + 1).fill(false);
  ok[0] = true;
  for (let i = 1; i <= n; i++) {
    for (let j = Math.max(0, i - maxLen); j < i; j++) {
      if (ok[j]) {
        checks++;
        if (wordSet.has(s.slice(j, i))) {
          ok[i] = true;
          break;
        }
      }
    }
  }
  return ok[n];
}

const words = new Set(['a', 'aa', 'aaa', 'aaaa', 'aaaaa']);
const s = 'a'.repeat(20) + 'b';          // the b at the end makes every split fail
calls = 0; checks = 0;
let r = naive(s, 0, words);
console.log('naive recursion: ' + r + ', ' + calls + ' calls, ' + checks + ' substring checks');
calls = 0; checks = 0;
r = memo(s, 0, words, new Map());
console.log('memoized recursion: ' + r + ', ' + calls + ' calls, ' + checks + ' substring checks');
checks = 0;
r = table(s, words, s.length);
console.log('dp table, no length limit: ' + r + ', ' + checks + ' substring checks');
checks = 0;
r = table(s, words, 5);
console.log('dp table, max word length 5: ' + r + ', ' + checks + ' substring checks');
checks = 0;
r = table('a'.repeat(20), words, 5);
console.log('same dictionary on 20 a: ' + r + ', ' + checks + ' substring checks');`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given a string and a dictionary of words, decide whether the string can be split into a sequence of one or more dictionary words, using any word as many times as you like. For example, 'applepenapple' with the words 'apple' and 'pen' is true. Explain the approach and code it in Java."

**What a strong answer should cover:**
- The state: \`ok[i]\` is true when the first \`i\` characters can be split into words, with \`ok[0] = true\` for the empty prefix.
- The transition: \`ok[i]\` is true if some \`j < i\` has \`ok[j]\` true and \`s[j:i]\` in the dictionary; put the words in a hash set first, and stop at the first \`j\` that works.
- Complexity: O(n²) substring checks (each costing up to O(n) to build and hash), reduced to O(n · L) checks when \`j\` only goes back as far as the longest word length L.
- Why plain recursion explodes (a string of \`a\`s ending in \`b\`, with words \`a\`, \`aa\`, \`aaa\`…) and how memoization on the start index fixes it; how to rebuild one split by remembering where the last word starts.
- Java details: a \`HashSet<String>\` (which uses \`equals\`/\`hashCode\`, not \`==\`), that \`s.substring(j, i)\` allocates a new \`String\`, and a \`boolean[]\` table that starts all \`false\`.

**Clarifying questions expected:**
- Can dictionary words be reused, and is the empty string considered breakable?
- How long are the string and the words — is the dictionary large?
- Do you need just true/false, one split, or all possible splits?

**Code / implementation expected:** Yes — a bottom-up Java DP over prefix lengths with a hash set; rebuilding one split is a common follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, strings and hash sets; the DP is built up from scratch.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Your friend sends a text with the space bar broken: **"catsanddog"**. You read it instantly as "cats and dog" — or was it "cat sand dog"? Either way, you are sure it is made of real words. Now they send **"catsandog"**. You try "cats and og"… "cat sand og"… there is no word "og". That message cannot be split into words at all.

Your brain did something clever there. It did not try every possible way of cutting the string. It remembered facts like "the first 3 letters, *cat*, are fine" and "the first 7 letters, *catsand*, are fine", and then only asked "is the rest a word?". Remembering which **prefixes** are fine is the entire Word Break solution.

Search engines, spell checkers and input methods for languages written without spaces face exactly this task: given a run of characters and a dictionary, find whether — and how — it splits into words.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can a dictionary word be used more than once? | The standard version says yes; "at most once" is a different, harder problem |
| Is the empty string breakable? | The DP says yes (zero words); confirm the expected answer |
| How long is the string, and how long are the words? | The longest word length L limits how far back each step must look |
| How big is the dictionary? | Large dictionaries favour a hash set or a [trie](/interview-question/what-is-a-trie-and-when-is-it-useful) over scanning the word list |
| Do you want true/false, one split, or every split? | One split is a small addition; every split (Word Break II) can be exponential output |

## 3. The Core Idea: Which Prefixes Can Be Split?

📌 **Interview term: Prefix DP** — \`dp[i]\` answers the question for the first \`i\` characters, built from answers for shorter prefixes.

Let \`ok[i]\` mean "the first \`i\` characters of \`s\` can be split into dictionary words". The empty prefix can always be split (into zero words), so \`ok[0] = true\`.

To decide \`ok[i]\`, think about the **last word** of a split. It is some slice \`s[j:i]\`. The split works if that slice is a dictionary word **and** everything before it, the first \`j\` characters, can itself be split — which is exactly \`ok[j]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="ok of i is true when some earlier position j has ok of j true and the slice from j to i is a dictionary word">
  <defs>
    <marker id="b28q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="260" height="70" rx="10"/>
  <text class="d-text" x="150" y="60" text-anchor="middle">first j letters</text>
  <text class="d-sub" x="150" y="84" text-anchor="middle">ok of j is true</text>
  <rect class="d-box" x="300" y="30" width="200" height="70" rx="10"/>
  <text class="d-text" x="400" y="60" text-anchor="middle">slice j to i</text>
  <text class="d-sub" x="400" y="84" text-anchor="middle">is in the word set</text>
  <path class="d-edge" d="M 260 102 L 330 146" marker-end="url(#b28q5-arrow)"/>
  <path class="d-edge" d="M 400 102 L 380 146" marker-end="url(#b28q5-arrow)"/>
  <rect class="d-box-accent" x="250" y="150" width="200" height="56" rx="10"/>
  <text class="d-text" x="350" y="184" text-anchor="middle">ok of i is true</text>
</svg>

~~~text
ok[0] = true
ok[i] = true  if some j < i has  ok[j] == true  and  s[j:i] in words
answer = ok[n]
~~~

📌 **Interview term: Hash set** — a set with O(1) average-time membership tests, built by hashing each word once. See [How does a hash table work?](/interview-question/how-does-a-hash-table-work). Putting the dictionary in a set is what makes each \`s[j:i] in words\` test fast.

Here is the table for \`"applepenapple"\` with the words \`apple\` and \`pen\`. Only four positions are reachable, and each is reached by a word that starts at an earlier reachable position:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 190" role="img" aria-label="Reachable positions for applepenapple are 0, 5, 8 and 13, joined by the words apple, pen and apple">
  <path class="d-edge-accent" d="M 40 120 C 80 40, 260 40, 300 120"/>
  <path class="d-edge-accent" d="M 300 120 C 330 60, 430 60, 456 120"/>
  <path class="d-edge-accent" d="M 456 120 C 500 40, 640 40, 676 120"/>
  <text class="d-sub" x="170" y="40" text-anchor="middle">apple</text>
  <text class="d-sub" x="378" y="58" text-anchor="middle">pen</text>
  <text class="d-sub" x="566" y="40" text-anchor="middle">apple</text>
  <rect class="d-box-accent" x="22" y="124" width="36" height="40" rx="6"/>
  <text class="d-text" x="40" y="150" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="282" y="124" width="36" height="40" rx="6"/>
  <text class="d-text" x="300" y="150" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="438" y="124" width="36" height="40" rx="6"/>
  <text class="d-text" x="456" y="150" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="644" y="124" width="48" height="40" rx="6"/>
  <text class="d-text" x="668" y="150" text-anchor="middle">13</text>
</svg>

\`ok[0]\`, \`ok[5]\`, \`ok[8]\` and \`ok[13]\` are true; \`ok[13]\` is the whole string, so the answer is true. For \`"catsandog"\` the reachable positions are 0, 3 (cat), 4 (cats) and 7 (cat+sand or cats+and), but no word starts at 7 and ends at 9 ("og"), so \`ok[9]\` stays false.

📌 **Interview term: Reachability** — reading \`ok[i]\` as "position i can be reached from position 0 by hopping over dictionary words". It shows that word break is also a graph problem: a [BFS](/interview-question/what-is-the-difference-between-bfs-and-dfs) from 0 over word-hops gives the same answer.

## 4. Why Plain Recursion Is Too Slow

The obvious recursive solution is: "try every word that the string starts with, and recurse on the rest". It is correct, but on the right input it explodes. Take twenty \`a\`s followed by a \`b\`, with the words \`a\`, \`aa\`, \`aaa\`, \`aaaa\`, \`aaaaa\`. Every way of cutting the \`a\`s into pieces of length 1 to 5 is explored, and every one of them fails at the \`b\`. In example 2 that took **814,296 calls** and **1,657,292** substring checks.

📌 **Interview term: Memoization** — caching the result of a function for each input so it is computed once. Here the only input that changes is the start index \`i\`, so there are at most n + 1 different calls; with a cache, the same string took 91 calls. See [What is memoization?](/interview-question/what-is-memoization) and [What is dynamic programming?](/interview-question/what-is-dynamic-programming) for the two styles.

The bottom-up table below does the same work as the memoized recursion, without the recursion.

## 5. The Code in Java

The function returns one valid split (so the caller can print it), or "none" when there is no split. Two refinements are built in:

- **Only look back as far as the longest word.** A last word longer than \`max_len\` cannot be in the dictionary, so \`j\` starts at \`i − max_len\`. On the \`a…ab\` string that cut the table from 161 to 25 substring checks.
- **Stop at the first \`j\` that works** (\`break\`), and remember it in \`cut[i]\` so the split can be rebuilt by walking back from \`n\`.

📌 **Interview term: Pruning** — skipping work that cannot change the answer, here every \`j\` that would make the last word longer than any dictionary word.

~~~java
// Returns the words of one valid split of s, or null if there is none.
static List<String> wordBreak(String s, List<String> words) {
    Set<String> wordSet = new HashSet<>(words);  // O(1) average membership tests
    int maxLen = 0;
    for (String w : words) maxLen = Math.max(maxLen, w.length());
    int n = s.length();
    boolean[] ok = new boolean[n + 1];           // ok[i]: the first i letters can be split
    ok[0] = true;                                // the empty prefix splits trivially
    int[] cut = new int[n + 1];                  // cut[i]: where the last word of that split starts
    for (int i = 1; i <= n; i++) {
        for (int j = Math.max(0, i - maxLen); j < i; j++) { // the last word is s.substring(j, i)
            if (ok[j] && wordSet.contains(s.substring(j, i))) {
                ok[i] = true;
                cut[i] = j;
                break;
            }
        }
    }
    if (!ok[n]) return null;
    LinkedList<String> parts = new LinkedList<>();
    for (int i = n; i > 0; i = cut[i]) parts.addFirst(s.substring(cut[i], i)); // walk the cuts back
    return parts;
}
~~~

**What to point out in this code:**

- \`new HashSet<>(words)\` copies the list into a hash set once, so \`contains\` is an O(1) average lookup that uses \`String.equals\` and \`hashCode\`. \`List.contains\` would scan the list every time.
- \`s.substring(j, i)\` creates a new \`String\` object for each check, and hashing it reads every character. With the max-length pruning, each substring is at most L characters.
- \`boolean[] ok = new boolean[n + 1]\` starts all \`false\` and \`int[] cut\` all \`0\` — Java zero-initialises arrays, so only \`ok[0] = true\` is needed.
- The split is rebuilt into a \`LinkedList\` with \`addFirst\`, which avoids reversing at the end; an \`ArrayList\` plus \`Collections.reverse\` is equally fine.
- The method returns \`null\` for "no split" and an empty list for the empty string, so the caller tests \`split != null\`.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (JDK 21, compiled as Java 17+ source). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the DP on the classic cases, with one split rebuilt** prints:

~~~text
"leetcode" -> true: leet | code
"applepenapple" -> true: apple | pen | apple
"catsandog" -> false
"catsanddog" -> true: cat | sand | dog
"aaaaaaa" -> true: aaa | aaaa
"cars" -> true: ca | rs
"a" -> false
"" -> true
~~~

What to read from this:

- \`"catsandog" -> false\` while \`"catsanddog" -> true\`. The split found is \`cat | sand | dog\`; \`cats | and | dog\` is also valid — the code keeps the first \`j\` it finds for each position, scanning from the farthest allowed start.
- \`"aaaaaaa"\` with \`aaaa\` and \`aaa\` splits as \`aaa | aaaa\`: 7 = 3 + 4, even though neither word alone divides 7.
- \`"cars"\` with \`car\`, \`ca\`, \`rs\` shows why greedy "take the longest word" fails: \`car\` leaves \`s\`, which is not a word, while \`ca | rs\` works.
- \`"" -> true\`: the empty string splits into zero words (\`ok[0] = true\`).

**Example 2 — plain recursion vs memoization vs the table** prints:

~~~text
naive recursion: false, 814296 calls, 1657292 substring checks
memoized recursion: false, 91 calls, 231 substring checks
dp table, no length limit: false, 161 substring checks
dp table, max word length 5: false, 25 substring checks
same dictionary on 20 a: true, 20 substring checks
~~~

On twenty \`a\`s followed by \`b\`, plain recursion made 814,296 calls; memoization cut that to 91 calls; the table needed 161 substring checks, and only 25 once \`j\` was limited to the longest word length (5). The last line shows the same dictionary on twenty \`a\`s with no \`b\`: true, after 20 checks, because the \`break\` stops at the first word that fits.

## 7. Complexity

Let n = length of \`s\`, L = length of the longest word, and W = number of words.

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential | O(n) stack | every way of cutting the string is tried; 814,296 calls for 21 characters |
| Memoized recursion | O(n²) checks | O(n) memo + O(n) stack | each start index is solved once, trying up to n ends |
| DP table | O(n²) checks | O(n) | for each \`i\`, up to \`i\` values of \`j\` |
| DP table with max-length pruning | O(n · L) checks | O(n) | only the last L values of \`j\` |
| Building the word set | O(total letters in the dictionary) | same | each word is hashed once |

Each "check" also builds and hashes a substring of length up to L, so the honest time is O(n · L²) with pruning (O(n³) without it). With a [trie](/interview-question/what-is-a-trie-and-when-is-it-useful) you can walk forward from each reachable \`j\` one character at a time and test every word starting there in O(L), which makes the whole run O(n · L).

## 8. Edge Cases

- **Empty string:** \`ok[0]\` is the answer, true.
- **Empty dictionary:** nothing can be split except the empty string.
- **A word longer than the string:** never matches; the pruning bound handles it.
- **Many overlapping words** (\`a\`, \`aa\`, \`aaa\`…): the worst case for plain recursion; fine for the DP.
- **Greedy traps** (\`"cars"\` with \`car\`, \`ca\`, \`rs\`): taking the longest word first fails; the DP tries every last word.
- **Duplicate words in the dictionary:** the set removes them.

## Common Pitfalls

- **Looking words up in a \`List\`.** \`words.contains(...)\` is O(W) per check; build a \`HashSet<String>\` first.
- **Forgetting \`ok[0] = true\`.** Then nothing is ever reachable and every answer is \`false\`.
- **Comparing strings with \`==\`.** \`s.substring(j, i) == word\` compares references and is almost always false; \`HashSet.contains\` uses \`equals\`, which is what you want.
- **Greedy longest-match.** It fails on \`"cars"\` with \`car\`, \`ca\`, \`rs\`; the DP considers every possible last word.
- **A \`Boolean[]\` memo with \`==\` checks.** \`cache[i] != null\` is right for "not computed yet", but compare values with \`.equals\` or unbox first; or use a \`byte[]\` with three states, which avoids boxing.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[i]</code> is true when the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> letters can be split into words; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[0] = true</code> for the empty prefix.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The transition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[i]</code> is true if some <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j &lt; i</code> has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[j]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wordSet.contains(s.substring(j, i))</code>; I break at the first such <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The speed-ups:</strong> <span style="color:#f0e2c8;">Words go into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> only goes back the longest word length, which cut 161 checks to 25 in my test.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n · L) checks and O(n) space; each check allocates and hashes a substring of up to L characters.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet.contains</code> uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">substring</code> allocates; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[]</code> starts all false.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the actual words?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cut[i] = j</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[i]</code> becomes true, then walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cut</code>, adding each word with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addFirst</code>. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catsanddog</code> that gave cat, sand, dog.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about returning every possible split?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is Word Break II: memoize, for each start index, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List&lt;String&gt;</code> of sentences of the suffix. The output itself can be exponential, so first check with this DP that any split exists.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not greedy longest match?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It fails on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"cars"</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">car</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ca</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rs</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">car</code> leaves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code>. The DP tries every possible last word.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would a trie help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From each reachable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code>, walk the trie forward letter by letter; every end-of-word node marks a reachable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>. That tests all words starting at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> in O(L) with no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">substring</code> allocations.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it with BFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: positions are nodes and words are edges from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j + word.length()</code>. An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> BFS from 0 with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[]</code> visited reaches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> exactly when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[n]</code> is true.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix DP** | \`dp[i]\` answers the question for the first \`i\` characters |
| **Hash set** | A set with O(1) average membership tests |
| **Reachability** | Reading \`ok[i]\` as "position i can be reached by hopping over words from 0" |
| **Memoization** | Caching a function result per input so it is computed once |
| **Pruning** | Skipping work that cannot change the answer, such as last words longer than any dictionary word |

---
**Conclusion:** Word break is a prefix DP: \`ok[i]\` says the first \`i\` letters split into words, \`ok[0]\` is true, and \`ok[i]\` becomes true as soon as some reachable \`j\` is followed by a dictionary word \`s[j:i]\`. With the words in a hash set and \`j\` limited to the longest word length, that is O(n · L) checks and O(n) space, where plain recursion took 814,296 calls on a 21-character string. Remember the cut position for each \`i\` to rebuild a split, and mention a trie or BFS for the follow-ups. In Java, use a \`HashSet<String>\` so lookups use \`equals\`, and remember that every \`substring\` allocates.`,
        examples: [
          {
            label: `Word break DP on classic cases, with one split rebuilt`,
            code: `import java.util.*;

public class Main {
    // Returns the words of one valid split of s, or null if there is none.
    static List<String> wordBreak(String s, List<String> words) {
        Set<String> wordSet = new HashSet<>(words);  // O(1) average membership tests
        int maxLen = 0;
        for (String w : words) maxLen = Math.max(maxLen, w.length());
        int n = s.length();
        boolean[] ok = new boolean[n + 1];           // ok[i]: the first i letters can be split
        ok[0] = true;                                // the empty prefix splits trivially
        int[] cut = new int[n + 1];                  // cut[i]: where the last word of that split starts
        for (int i = 1; i <= n; i++) {
            for (int j = Math.max(0, i - maxLen); j < i; j++) { // the last word is s.substring(j, i)
                if (ok[j] && wordSet.contains(s.substring(j, i))) {
                    ok[i] = true;
                    cut[i] = j;
                    break;
                }
            }
        }
        if (!ok[n]) return null;
        LinkedList<String> parts = new LinkedList<>();
        for (int i = n; i > 0; i = cut[i]) parts.addFirst(s.substring(cut[i], i)); // walk the cuts back
        return parts;
    }

    public static void main(String[] args) {
        String[] texts = {"leetcode", "applepenapple", "catsandog", "catsanddog", "aaaaaaa", "cars", "a", ""};
        List<List<String>> dicts = List.of(
            List.of("leet", "code"),
            List.of("apple", "pen"),
            List.of("cats", "dog", "sand", "and", "cat"),
            List.of("cats", "dog", "sand", "and", "cat"),
            List.of("aaaa", "aaa"),
            List.of("car", "ca", "rs"),
            List.of("b"),
            List.of("a"));
        for (int k = 0; k < texts.length; k++) {
            List<String> split = wordBreak(texts[k], dicts.get(k));
            String line = "\\"" + texts[k] + "\\" -> " + (split != null);
            if (split != null && !split.isEmpty()) line += ": " + String.join(" | ", split);
            System.out.println(line);
        }
    }
}`,
          },
          {
            label: `Naive recursion vs memo vs DP: how many checks each one makes`,
            code: `import java.util.*;

public class Main {
    static long calls = 0, checks = 0;

    static boolean naive(String s, int i, Set<String> wordSet) {
        calls++;
        if (i == s.length()) return true;
        for (int j = i + 1; j <= s.length(); j++) {
            checks++;
            if (wordSet.contains(s.substring(i, j)) && naive(s, j, wordSet)) return true;
        }
        return false;
    }

    static boolean memo(String s, int i, Set<String> wordSet, Boolean[] cache) {
        calls++;
        if (i == s.length()) return true;
        if (cache[i] != null) return cache[i];
        boolean result = false;
        for (int j = i + 1; j <= s.length(); j++) {
            checks++;
            if (wordSet.contains(s.substring(i, j)) && memo(s, j, wordSet, cache)) {
                result = true;
                break;
            }
        }
        cache[i] = result;
        return result;
    }

    static boolean table(String s, Set<String> wordSet, int maxLen) {
        int n = s.length();
        boolean[] ok = new boolean[n + 1];
        ok[0] = true;
        for (int i = 1; i <= n; i++) {
            for (int j = Math.max(0, i - maxLen); j < i; j++) {
                if (ok[j]) {
                    checks++;
                    if (wordSet.contains(s.substring(j, i))) {
                        ok[i] = true;
                        break;
                    }
                }
            }
        }
        return ok[n];
    }

    public static void main(String[] args) {
        Set<String> words = new HashSet<>(List.of("a", "aa", "aaa", "aaaa", "aaaaa"));
        String s = "a".repeat(20) + "b";             // the b at the end makes every split fail
        calls = 0; checks = 0;
        boolean r = naive(s, 0, words);
        System.out.println("naive recursion: " + r + ", " + calls + " calls, " + checks + " substring checks");
        calls = 0; checks = 0;
        r = memo(s, 0, words, new Boolean[s.length() + 1]);
        System.out.println("memoized recursion: " + r + ", " + calls + " calls, " + checks + " substring checks");
        checks = 0;
        r = table(s, words, s.length());
        System.out.println("dp table, no length limit: " + r + ", " + checks + " substring checks");
        checks = 0;
        r = table(s, words, 5);
        System.out.println("dp table, max word length 5: " + r + ", " + checks + " substring checks");
        checks = 0;
        r = table("a".repeat(20), words, 5);
        System.out.println("same dictionary on 20 a: " + r + ", " + checks + " substring checks");
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a string and a dictionary of words, decide whether the string can be split into a sequence of one or more dictionary words, using any word as many times as you like. For example, 'applepenapple' with the words 'apple' and 'pen' is true. Explain the approach and code it in C++."

**What a strong answer should cover:**
- The state: \`ok[i]\` is true when the first \`i\` characters can be split into words, with \`ok[0] = true\` for the empty prefix.
- The transition: \`ok[i]\` is true if some \`j < i\` has \`ok[j]\` true and \`s[j:i]\` in the dictionary; put the words in a hash set first, and stop at the first \`j\` that works.
- Complexity: O(n²) substring checks (each costing up to O(n) to build and hash), reduced to O(n · L) checks when \`j\` only goes back as far as the longest word length L.
- Why plain recursion explodes (a string of \`a\`s ending in \`b\`, with words \`a\`, \`aa\`, \`aaa\`…) and how memoization on the start index fixes it; how to rebuild one split by remembering where the last word starts.
- C++ details: \`std::unordered_set<std::string>\`, that \`s.substr(j, i - j)\` allocates (a \`std::string_view\` key needs C++20 transparent hashing to look up without a copy), and \`size_t\` underflow in \`i - maxLen\`.

**Clarifying questions expected:**
- Can dictionary words be reused, and is the empty string considered breakable?
- How long are the string and the words — is the dictionary large?
- Do you need just true/false, one split, or all possible splits?

**Code / implementation expected:** Yes — a bottom-up C++ DP over prefix lengths with a hash set; rebuilding one split is a common follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, strings and hash sets; the DP is built up from scratch.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Your friend sends a text with the space bar broken: **"catsanddog"**. You read it instantly as "cats and dog" — or was it "cat sand dog"? Either way, you are sure it is made of real words. Now they send **"catsandog"**. You try "cats and og"… "cat sand og"… there is no word "og". That message cannot be split into words at all.

Your brain did something clever there. It did not try every possible way of cutting the string. It remembered facts like "the first 3 letters, *cat*, are fine" and "the first 7 letters, *catsand*, are fine", and then only asked "is the rest a word?". Remembering which **prefixes** are fine is the entire Word Break solution.

Search engines, spell checkers and input methods for languages written without spaces face exactly this task: given a run of characters and a dictionary, find whether — and how — it splits into words.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can a dictionary word be used more than once? | The standard version says yes; "at most once" is a different, harder problem |
| Is the empty string breakable? | The DP says yes (zero words); confirm the expected answer |
| How long is the string, and how long are the words? | The longest word length L limits how far back each step must look |
| How big is the dictionary? | Large dictionaries favour a hash set or a [trie](/interview-question/what-is-a-trie-and-when-is-it-useful) over scanning the word list |
| Do you want true/false, one split, or every split? | One split is a small addition; every split (Word Break II) can be exponential output |

## 3. The Core Idea: Which Prefixes Can Be Split?

📌 **Interview term: Prefix DP** — \`dp[i]\` answers the question for the first \`i\` characters, built from answers for shorter prefixes.

Let \`ok[i]\` mean "the first \`i\` characters of \`s\` can be split into dictionary words". The empty prefix can always be split (into zero words), so \`ok[0] = true\`.

To decide \`ok[i]\`, think about the **last word** of a split. It is some slice \`s[j:i]\`. The split works if that slice is a dictionary word **and** everything before it, the first \`j\` characters, can itself be split — which is exactly \`ok[j]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="ok of i is true when some earlier position j has ok of j true and the slice from j to i is a dictionary word">
  <defs>
    <marker id="b28q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="260" height="70" rx="10"/>
  <text class="d-text" x="150" y="60" text-anchor="middle">first j letters</text>
  <text class="d-sub" x="150" y="84" text-anchor="middle">ok of j is true</text>
  <rect class="d-box" x="300" y="30" width="200" height="70" rx="10"/>
  <text class="d-text" x="400" y="60" text-anchor="middle">slice j to i</text>
  <text class="d-sub" x="400" y="84" text-anchor="middle">is in the word set</text>
  <path class="d-edge" d="M 260 102 L 330 146" marker-end="url(#b28q5-arrow)"/>
  <path class="d-edge" d="M 400 102 L 380 146" marker-end="url(#b28q5-arrow)"/>
  <rect class="d-box-accent" x="250" y="150" width="200" height="56" rx="10"/>
  <text class="d-text" x="350" y="184" text-anchor="middle">ok of i is true</text>
</svg>

~~~text
ok[0] = true
ok[i] = true  if some j < i has  ok[j] == true  and  s[j:i] in words
answer = ok[n]
~~~

📌 **Interview term: Hash set** — a set with O(1) average-time membership tests, built by hashing each word once. See [How does a hash table work?](/interview-question/how-does-a-hash-table-work). Putting the dictionary in a set is what makes each \`s[j:i] in words\` test fast.

Here is the table for \`"applepenapple"\` with the words \`apple\` and \`pen\`. Only four positions are reachable, and each is reached by a word that starts at an earlier reachable position:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 190" role="img" aria-label="Reachable positions for applepenapple are 0, 5, 8 and 13, joined by the words apple, pen and apple">
  <path class="d-edge-accent" d="M 40 120 C 80 40, 260 40, 300 120"/>
  <path class="d-edge-accent" d="M 300 120 C 330 60, 430 60, 456 120"/>
  <path class="d-edge-accent" d="M 456 120 C 500 40, 640 40, 676 120"/>
  <text class="d-sub" x="170" y="40" text-anchor="middle">apple</text>
  <text class="d-sub" x="378" y="58" text-anchor="middle">pen</text>
  <text class="d-sub" x="566" y="40" text-anchor="middle">apple</text>
  <rect class="d-box-accent" x="22" y="124" width="36" height="40" rx="6"/>
  <text class="d-text" x="40" y="150" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="282" y="124" width="36" height="40" rx="6"/>
  <text class="d-text" x="300" y="150" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="438" y="124" width="36" height="40" rx="6"/>
  <text class="d-text" x="456" y="150" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="644" y="124" width="48" height="40" rx="6"/>
  <text class="d-text" x="668" y="150" text-anchor="middle">13</text>
</svg>

\`ok[0]\`, \`ok[5]\`, \`ok[8]\` and \`ok[13]\` are true; \`ok[13]\` is the whole string, so the answer is true. For \`"catsandog"\` the reachable positions are 0, 3 (cat), 4 (cats) and 7 (cat+sand or cats+and), but no word starts at 7 and ends at 9 ("og"), so \`ok[9]\` stays false.

📌 **Interview term: Reachability** — reading \`ok[i]\` as "position i can be reached from position 0 by hopping over dictionary words". It shows that word break is also a graph problem: a [BFS](/interview-question/what-is-the-difference-between-bfs-and-dfs) from 0 over word-hops gives the same answer.

## 4. Why Plain Recursion Is Too Slow

The obvious recursive solution is: "try every word that the string starts with, and recurse on the rest". It is correct, but on the right input it explodes. Take twenty \`a\`s followed by a \`b\`, with the words \`a\`, \`aa\`, \`aaa\`, \`aaaa\`, \`aaaaa\`. Every way of cutting the \`a\`s into pieces of length 1 to 5 is explored, and every one of them fails at the \`b\`. In example 2 that took **814,296 calls** and **1,657,292** substring checks.

📌 **Interview term: Memoization** — caching the result of a function for each input so it is computed once. Here the only input that changes is the start index \`i\`, so there are at most n + 1 different calls; with a cache, the same string took 91 calls. See [What is memoization?](/interview-question/what-is-memoization) and [What is dynamic programming?](/interview-question/what-is-dynamic-programming) for the two styles.

The bottom-up table below does the same work as the memoized recursion, without the recursion.

## 5. The Code in C++

The function returns one valid split (so the caller can print it), or "none" when there is no split. Two refinements are built in:

- **Only look back as far as the longest word.** A last word longer than \`max_len\` cannot be in the dictionary, so \`j\` starts at \`i − max_len\`. On the \`a…ab\` string that cut the table from 161 to 25 substring checks.
- **Stop at the first \`j\` that works** (\`break\`), and remember it in \`cut[i]\` so the split can be rebuilt by walking back from \`n\`.

📌 **Interview term: Pruning** — skipping work that cannot change the answer, here every \`j\` that would make the last word longer than any dictionary word.

~~~cpp
// Returns true and fills \`parts\` with one valid split, or returns false.
bool wordBreak(const std::string& s, const std::vector<std::string>& words, std::vector<std::string>& parts) {
    std::unordered_set<std::string> wordSet(words.begin(), words.end()); // O(1) average lookups
    size_t maxLen = 0;
    for (const auto& w : words) maxLen = std::max(maxLen, w.size());
    size_t n = s.size();
    std::vector<bool> ok(n + 1, false);          // ok[i]: the first i letters can be split
    ok[0] = true;                                // the empty prefix splits trivially
    std::vector<size_t> cut(n + 1, 0);           // cut[i]: where the last word of that split starts
    for (size_t i = 1; i <= n; i++) {
        size_t from = i > maxLen ? i - maxLen : 0;   // careful: size_t cannot go negative
        for (size_t j = from; j < i; j++) {      // the last word is s.substr(j, i - j)
            if (ok[j] && wordSet.count(s.substr(j, i - j))) {
                ok[i] = true;
                cut[i] = j;
                break;
            }
        }
    }
    if (!ok[n]) return false;
    for (size_t i = n; i > 0; i = cut[i]) parts.push_back(s.substr(cut[i], i - cut[i])); // walk back
    std::reverse(parts.begin(), parts.end());
    return true;
}
~~~

**What to point out in this code:**

- \`std::unordered_set<std::string> wordSet(words.begin(), words.end())\` builds the hash set once, so \`count\` is an O(1) average lookup. \`std::find\` on the vector would scan it every time.
- \`s.substr(j, i - j)\` builds a new \`std::string\` for each check (its second argument is a **length**, not an end index). In C++17 you cannot look up an \`unordered_set<std::string>\` with a \`std::string_view\` without building a string: lookups by another key type need transparent hash and equality functors, which \`unordered_set::find\` only accepts [from C++20](https://en.cppreference.com/w/cpp/container/unordered_set/find.html).
- \`size_t\` is unsigned, so \`i - maxLen\` would wrap around to a huge number when \`maxLen > i\`. The code computes \`from = i > maxLen ? i - maxLen : 0\` instead.
- \`std::vector<bool>\` is a packed bit vector, not a real array of \`bool\`s; reading and writing it is fine here, but you cannot take a \`bool&\` to an element. A \`std::vector<char>\` is the usual alternative when that matters.
- The function returns \`bool\` and fills \`parts\` through a reference, then \`std::reverse\` puts the words in order.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the DP on the classic cases, with one split rebuilt** prints:

~~~text
"leetcode" -> true: leet | code
"applepenapple" -> true: apple | pen | apple
"catsandog" -> false
"catsanddog" -> true: cat | sand | dog
"aaaaaaa" -> true: aaa | aaaa
"cars" -> true: ca | rs
"a" -> false
"" -> true
~~~

What to read from this:

- \`"catsandog" -> false\` while \`"catsanddog" -> true\`. The split found is \`cat | sand | dog\`; \`cats | and | dog\` is also valid — the code keeps the first \`j\` it finds for each position, scanning from the farthest allowed start.
- \`"aaaaaaa"\` with \`aaaa\` and \`aaa\` splits as \`aaa | aaaa\`: 7 = 3 + 4, even though neither word alone divides 7.
- \`"cars"\` with \`car\`, \`ca\`, \`rs\` shows why greedy "take the longest word" fails: \`car\` leaves \`s\`, which is not a word, while \`ca | rs\` works.
- \`"" -> true\`: the empty string splits into zero words (\`ok[0] = true\`).

**Example 2 — plain recursion vs memoization vs the table** prints:

~~~text
naive recursion: false, 814296 calls, 1657292 substring checks
memoized recursion: false, 91 calls, 231 substring checks
dp table, no length limit: false, 161 substring checks
dp table, max word length 5: false, 25 substring checks
same dictionary on 20 a: true, 20 substring checks
~~~

On twenty \`a\`s followed by \`b\`, plain recursion made 814,296 calls; memoization cut that to 91 calls; the table needed 161 substring checks, and only 25 once \`j\` was limited to the longest word length (5). The last line shows the same dictionary on twenty \`a\`s with no \`b\`: true, after 20 checks, because the \`break\` stops at the first word that fits.

## 7. Complexity

Let n = length of \`s\`, L = length of the longest word, and W = number of words.

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential | O(n) stack | every way of cutting the string is tried; 814,296 calls for 21 characters |
| Memoized recursion | O(n²) checks | O(n) memo + O(n) stack | each start index is solved once, trying up to n ends |
| DP table | O(n²) checks | O(n) | for each \`i\`, up to \`i\` values of \`j\` |
| DP table with max-length pruning | O(n · L) checks | O(n) | only the last L values of \`j\` |
| Building the word set | O(total letters in the dictionary) | same | each word is hashed once |

Each "check" also builds and hashes a substring of length up to L, so the honest time is O(n · L²) with pruning (O(n³) without it). With a [trie](/interview-question/what-is-a-trie-and-when-is-it-useful) you can walk forward from each reachable \`j\` one character at a time and test every word starting there in O(L), which makes the whole run O(n · L).

## 8. Edge Cases

- **Empty string:** \`ok[0]\` is the answer, true.
- **Empty dictionary:** nothing can be split except the empty string.
- **A word longer than the string:** never matches; the pruning bound handles it.
- **Many overlapping words** (\`a\`, \`aa\`, \`aaa\`…): the worst case for plain recursion; fine for the DP.
- **Greedy traps** (\`"cars"\` with \`car\`, \`ca\`, \`rs\`): taking the longest word first fails; the DP tries every last word.
- **Duplicate words in the dictionary:** the set removes them.

## Common Pitfalls

- **\`substr(j, i)\` instead of \`substr(j, i - j)\`.** The second argument is a length. Passing an end index silently builds a longer string than intended.
- **\`size_t\` underflow.** \`i - maxLen\` with \`maxLen > i\` wraps to a huge value, and the loop does nothing (or runs wild). Guard it as the code does.
- **Forgetting \`ok[0] = true\`.** Then nothing is ever reachable and every answer is \`false\`.
- **Greedy longest-match.** It fails on \`"cars"\` with \`car\`, \`ca\`, \`rs\`; the DP considers every possible last word.
- **Recursing without a memo.** Exponential on \`a…ab\` (814,296 calls for 21 characters), and a deep recursion on a long string can overflow the stack with no exception to catch.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[i]</code> is true when the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> letters can be split into words; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[0] = true</code> for the empty prefix.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The transition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[i]</code> is true if some <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j &lt; i</code> has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[j]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wordSet.count(s.substr(j, i - j))</code>; I break at the first such <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The speed-ups:</strong> <span style="color:#f0e2c8;">Words go into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_set</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> only goes back the longest word length, which cut 161 checks to 25 in my test.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n · L) checks and O(n) space; each check builds and hashes a substring of up to L characters.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">substr</code> takes a length, not an end; guard <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - maxLen</code> against <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t</code> wrap-around.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the actual words?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cut[i] = j</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[i]</code> becomes true, then walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cut</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::reverse</code> the words. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catsanddog</code> that gave cat, sand, dog.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about returning every possible split?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is Word Break II: memoize, for each start index, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;std::string&gt;</code> of sentences of the suffix. The output itself can be exponential, so first check with this DP that any split exists.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you avoid the substring copies?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In C++17 the set lookup needs a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::string</code>. Options: a trie walked character by character, or C++20 transparent hashing, which lets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> take a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::string_view</code> directly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would a trie help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From each reachable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code>, walk the trie forward letter by letter; every end-of-word node marks a reachable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>. That tests all words starting at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> in O(L) with no allocations.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it with BFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: positions are nodes and words are edges from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j + word.size()</code>. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code> BFS from 0 with a visited vector reaches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> exactly when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ok[n]</code> is true.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix DP** | \`dp[i]\` answers the question for the first \`i\` characters |
| **Hash set** | A set with O(1) average membership tests |
| **Reachability** | Reading \`ok[i]\` as "position i can be reached by hopping over words from 0" |
| **Memoization** | Caching a function result per input so it is computed once |
| **Pruning** | Skipping work that cannot change the answer, such as last words longer than any dictionary word |

---
**Conclusion:** Word break is a prefix DP: \`ok[i]\` says the first \`i\` letters split into words, \`ok[0]\` is true, and \`ok[i]\` becomes true as soon as some reachable \`j\` is followed by a dictionary word \`s[j:i]\`. With the words in a hash set and \`j\` limited to the longest word length, that is O(n · L) checks and O(n) space, where plain recursion took 814,296 calls on a 21-character string. Remember the cut position for each \`i\` to rebuild a split, and mention a trie or BFS for the follow-ups. In C++, use an \`unordered_set<std::string>\`, pass \`substr\` a length, and guard \`size_t\` subtraction against wrap-around.`,
        examples: [
          {
            label: `Word break DP on classic cases, with one split rebuilt`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_set>
#include <vector>

// Returns true and fills \`parts\` with one valid split, or returns false.
bool wordBreak(const std::string& s, const std::vector<std::string>& words, std::vector<std::string>& parts) {
    std::unordered_set<std::string> wordSet(words.begin(), words.end()); // O(1) average lookups
    size_t maxLen = 0;
    for (const auto& w : words) maxLen = std::max(maxLen, w.size());
    size_t n = s.size();
    std::vector<bool> ok(n + 1, false);          // ok[i]: the first i letters can be split
    ok[0] = true;                                // the empty prefix splits trivially
    std::vector<size_t> cut(n + 1, 0);           // cut[i]: where the last word of that split starts
    for (size_t i = 1; i <= n; i++) {
        size_t from = i > maxLen ? i - maxLen : 0;   // careful: size_t cannot go negative
        for (size_t j = from; j < i; j++) {      // the last word is s.substr(j, i - j)
            if (ok[j] && wordSet.count(s.substr(j, i - j))) {
                ok[i] = true;
                cut[i] = j;
                break;
            }
        }
    }
    if (!ok[n]) return false;
    for (size_t i = n; i > 0; i = cut[i]) parts.push_back(s.substr(cut[i], i - cut[i])); // walk back
    std::reverse(parts.begin(), parts.end());
    return true;
}

int main() {
    std::vector<std::pair<std::string, std::vector<std::string>>> cases = {
        {"leetcode", {"leet", "code"}},
        {"applepenapple", {"apple", "pen"}},
        {"catsandog", {"cats", "dog", "sand", "and", "cat"}},
        {"catsanddog", {"cats", "dog", "sand", "and", "cat"}},
        {"aaaaaaa", {"aaaa", "aaa"}},
        {"cars", {"car", "ca", "rs"}},
        {"a", {"b"}},
        {"", {"a"}},
    };
    std::cout << std::boolalpha;
    for (const auto& [s, words] : cases) {
        std::vector<std::string> parts;
        bool found = wordBreak(s, words, parts);
        std::cout << "\\"" << s << "\\" -> " << found;
        for (size_t k = 0; k < parts.size(); k++) std::cout << (k ? " | " : ": ") << parts[k];
        std::cout << "\\n";
    }
}`,
          },
          {
            label: `Naive recursion vs memo vs DP: how many checks each one makes`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_set>
#include <vector>

long long calls = 0, checks = 0;

bool naive(const std::string& s, size_t i, const std::unordered_set<std::string>& wordSet) {
    calls++;
    if (i == s.size()) return true;
    for (size_t j = i + 1; j <= s.size(); j++) {
        checks++;
        if (wordSet.count(s.substr(i, j - i)) && naive(s, j, wordSet)) return true;
    }
    return false;
}

bool memo(const std::string& s, size_t i, const std::unordered_set<std::string>& wordSet, std::vector<int>& cache) {
    calls++;
    if (i == s.size()) return true;
    if (cache[i] != -1) return cache[i] == 1;
    bool result = false;
    for (size_t j = i + 1; j <= s.size(); j++) {
        checks++;
        if (wordSet.count(s.substr(i, j - i)) && memo(s, j, wordSet, cache)) {
            result = true;
            break;
        }
    }
    cache[i] = result ? 1 : 0;
    return result;
}

bool table(const std::string& s, const std::unordered_set<std::string>& wordSet, size_t maxLen) {
    size_t n = s.size();
    std::vector<bool> ok(n + 1, false);
    ok[0] = true;
    for (size_t i = 1; i <= n; i++) {
        for (size_t j = i > maxLen ? i - maxLen : 0; j < i; j++) {
            if (ok[j]) {
                checks++;
                if (wordSet.count(s.substr(j, i - j))) {
                    ok[i] = true;
                    break;
                }
            }
        }
    }
    return ok[n];
}

int main() {
    std::unordered_set<std::string> words = {"a", "aa", "aaa", "aaaa", "aaaaa"};
    std::string s = std::string(20, 'a') + "b";      // the b at the end makes every split fail
    std::cout << std::boolalpha;
    calls = checks = 0;
    bool r = naive(s, 0, words);
    std::cout << "naive recursion: " << r << ", " << calls << " calls, " << checks << " substring checks\\n";
    calls = checks = 0;
    std::vector<int> cache(s.size() + 1, -1);
    r = memo(s, 0, words, cache);
    std::cout << "memoized recursion: " << r << ", " << calls << " calls, " << checks << " substring checks\\n";
    checks = 0;
    r = table(s, words, s.size());
    std::cout << "dp table, no length limit: " << r << ", " << checks << " substring checks\\n";
    checks = 0;
    r = table(s, words, 5);
    std::cout << "dp table, max word length 5: " << r << ", " << checks << " substring checks\\n";
    checks = 0;
    r = table(std::string(20, 'a'), words, 5);
    std::cout << "same dictionary on 20 a: " << r << ", " << checks << " substring checks\\n";
}`,
          },
        ],
      },
    },
  },
];

export default augments;
