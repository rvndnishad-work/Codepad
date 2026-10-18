/**
 * DSA ULTRA — batch 02: foundations — how to approach a DSA problem, arrays vs
 * linked lists, stacks vs queues, how hash tables work, and stable sorting.
 * One complete answer per language (Python, JavaScript, Java, C++). Every
 * example was run with python3 / node / javac+java / g++ -std=c++17 by
 * scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How should you approach a DSA problem in a coding interview?",
    difficulty: "easy",
    seoDescription: "A six-step method for coding interviews: clarify, examples, brute force, optimise, code, test. Worked in Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Before we start the coding part: walk me through how you approach a data-structures problem you have not seen before. Then show me on a small problem — count the pairs in a list that add up to a target — and write it in Python."

**What a strong answer should cover:**
- A clear, repeatable sequence: clarify, examples, brute force, optimise, code, test — and talking through each step.
- Clarifying questions that change the algorithm (input size, duplicates, negatives, empty input, output format).
- Stating the brute force and its complexity before optimising, then naming the bottleneck and the data structure that removes it.
- The space-time trade-off of the optimised version (O(n) time for O(n) extra memory).
- Testing: a dry run, edge cases, and how a stress test against the brute force would catch bugs.
- Python specifics: \`dict.get(key, 0)\` or \`collections.Counter\`/\`defaultdict(int)\` for counting, integers never overflow, and the default recursion limit of 1000 matters for deep recursion.

**Clarifying questions expected:**
- "How large can the input be, and can values repeat or be negative?"
- "Do you want the number of pairs, or the pairs themselves?"

**Code / implementation expected:** Yes — a brute force and an O(n) solution in Python using a dict, plus a few test calls.`,
        answer: `**Target Audience:** Anyone preparing for their first coding interviews — no prior algorithms knowledge assumed.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`python3 main.py\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A plumber is called to a flat with water on the floor. A bad plumber starts ripping out pipes straight away. A good one asks three questions first (where is the water, since when, is it hot or cold), looks at the obvious cause, fixes it the simple way if that is good enough, and then turns the tap on again to check. Both plumbers might end up replacing the same pipe, but only one of them can explain why, and only one of them is still trusted when the first guess is wrong.

A coding interview works the same way. The interviewer is not only checking whether you reach the right code; they are watching **how** you get there, because that is what working with you will feel like. A candidate who silently writes a perfect answer gets less credit than you might expect, and a candidate who talks through a clear process, finds a bug in testing and fixes it often does well. A repeatable method also protects you from panic: when you do not know the trick yet, you still know the next step.

## 2. The Six-Step Method at a Glance

The steps below are one common way to structure the time. Interview guides use different names for them, but almost all contain the same pieces.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The six steps in order: clarify, examples, brute force, optimise, code, test">
  <defs>
    <marker id="b02q1-python-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="120" y="72" text-anchor="middle">1. Clarify</text>
  <text class="d-sub" x="120" y="98" text-anchor="middle">inputs, limits, output</text>
  <path class="d-edge" d="M 214 80 L 264 80" marker-end="url(#b02q1-python-arrow)"/>
  <rect class="d-box-muted" x="270" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="360" y="72" text-anchor="middle">2. Examples</text>
  <text class="d-sub" x="360" y="98" text-anchor="middle">normal and edge cases</text>
  <path class="d-edge" d="M 454 80 L 504 80" marker-end="url(#b02q1-python-arrow)"/>
  <rect class="d-box-muted" x="510" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="600" y="72" text-anchor="middle">3. Brute force</text>
  <text class="d-sub" x="600" y="98" text-anchor="middle">say it, state its cost</text>
  <path class="d-edge" d="M 600 124 L 600 184" marker-end="url(#b02q1-python-arrow)"/>
  <rect class="d-box-accent" x="510" y="190" width="180" height="80" rx="10"/>
  <text class="d-text d-accent" x="600" y="222" text-anchor="middle">4. Optimise</text>
  <text class="d-sub" x="600" y="248" text-anchor="middle">remove the bottleneck</text>
  <path class="d-edge" d="M 506 230 L 456 230" marker-end="url(#b02q1-python-arrow)"/>
  <rect class="d-box-muted" x="270" y="190" width="180" height="80" rx="10"/>
  <text class="d-text" x="360" y="222" text-anchor="middle">5. Code</text>
  <text class="d-sub" x="360" y="248" text-anchor="middle">talk while you type</text>
  <path class="d-edge" d="M 266 230 L 216 230" marker-end="url(#b02q1-python-arrow)"/>
  <rect class="d-box-muted" x="30" y="190" width="180" height="80" rx="10"/>
  <text class="d-text" x="120" y="222" text-anchor="middle">6. Test</text>
  <text class="d-sub" x="120" y="248" text-anchor="middle">dry run, edge cases</text>
</svg>

Steps 1 to 4 happen before you write real code. They usually take a third or more of the time, and that is fine: an interviewer would rather see a correct plan written in five minutes than wrong code written in two.

📌 **Interview term: Clarifying questions** — questions you ask before solving, to pin down the input, the limits and the expected output. They show you do not assume.

📌 **Interview term: Brute force** — the simplest correct solution, usually trying every possibility. It is slow, but it proves you understand the problem and gives you something to improve.

📌 **Interview term: Time complexity** — how the running time grows as the input grows, written in Big-O (for example O(n²)). If Big-O is new to you, read [What is Big-O notation?](/interview-question/what-is-big-o-notation) first.

📌 **Interview term: Bottleneck** — the part of a solution that does most of the work. Optimising means finding it and making it cheaper.

📌 **Interview term: Dry run** — stepping through your code by hand with a small input, writing down the variables, to find bugs before (or without) running it.

## 3. Step 1 — Clarify: Questions to Ask Your Interviewer First

We will use one problem for the whole doc: **"Given a list of integers \`nums\` and a target \`k\`, count the pairs of positions i < j with nums[i] + nums[j] == k."** Here is what a strong candidate asks before writing anything:

| Question | Why it matters here |
| :--- | :--- |
| How large can the list be? | 1,000 items allows O(n²); 100,000 items needs about O(n) or O(n log n) |
| Can values repeat? | With \`[3, 3, 3]\` and k = 6 the answer is 3 pairs, not 1; duplicates change the algorithm |
| Can values be negative or zero? | Rules out tricks that only work for positive numbers |
| Do you want the count, or the pairs themselves? | Listing the pairs can take O(n²) output on its own |
| Can an element pair with itself? | Usually no (i < j), and the code must respect that |
| What should an empty list return? | 0, and the code must not crash on it |

You do not need all of these every time. Pick the ones that change your algorithm, ask them in one or two sentences, and write the answers down where the interviewer can see them.

📌 **Interview term: Constraints** — the limits on input size and values given in the problem (for example "n ≤ 10⁵"). They tell you how fast the solution must be.

A common rule of thumb (an estimate, not a law) assumes a judge or interviewer expects roughly 10⁸ simple operations per second at most:

| Input size n | Usually acceptable complexity |
| :--- | :--- |
| up to about 20 | O(2ⁿ), trying all subsets |
| up to about 1,000 | O(n²) |
| up to about 10⁵ to 10⁶ | O(n log n) or O(n) |
| larger, or many queries | O(log n) or O(1) per query |

## 4. Step 2 — Work Through Examples by Hand

Write two or three small inputs and their answers before coding. Include at least one normal case and the edge cases from your questions:

- \`[1, 5, 7, -1, 5]\`, k = 6 → 3 pairs: (1, 5), (1, 5) using the second 5, and (7, -1)
- \`[3, 3, 3]\`, k = 6 → 3 pairs, because positions (0,1), (0,2) and (1,2) all work
- \`[]\` → 0, and \`[3]\` with k = 6 → 0, because one element cannot pair with itself

Doing this by hand often reveals the algorithm. Here, noticing that each new 5 pairs with **every earlier** 1 is the whole idea of the fast solution.

📌 **Interview term: Edge case** — an input at the boundary of what is allowed (empty, one element, all equal, negative, maximum size) where code most often breaks.

## 5. Step 3 — State the Brute Force, Then Its Cost

Say it in one sentence: "Check every pair i < j and count the ones that add up to k." There are n(n-1)/2 pairs, so this is **O(n²) time and O(1) extra space**. Say the cost out loud even if you will not code it; it gives the interviewer a baseline and buys you time to think.

## 6. Step 4 — Optimise: Find the Bottleneck

Ask: *what work does the brute force repeat?* For every \`nums[j]\` it scans all earlier elements looking for one value: \`k - nums[j]\`. "Search for a value again and again" is the signal for a hash map, which answers "how many times have I seen value v?" in O(1) on average (see [How does a hash table work?](/interview-question/how-does-a-hash-table-work)).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Brute force checks every pair; the optimised version replaces the inner loop with one map lookup">
  <defs>
    <marker id="b02q1b-python-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="230" height="170" rx="10"/>
  <text class="d-text" x="145" y="62" text-anchor="middle">Brute force</text>
  <text class="d-sub" x="145" y="94" text-anchor="middle">for each i</text>
  <text class="d-sub" x="145" y="118" text-anchor="middle">for each j after i</text>
  <text class="d-sub" x="145" y="142" text-anchor="middle">check the sum</text>
  <text class="d-text" x="145" y="178" text-anchor="middle">n(n-1)/2 checks</text>
  <path class="d-edge-accent" d="M 270 115 L 450 115" marker-end="url(#b02q1b-python-arrow)"/>
  <text class="d-sub" x="360" y="96" text-anchor="middle">inner loop</text>
  <text class="d-sub" x="360" y="142" text-anchor="middle">becomes a lookup</text>
  <rect class="d-box-accent" x="460" y="30" width="230" height="170" rx="10"/>
  <text class="d-text d-accent" x="575" y="62" text-anchor="middle">Optimised</text>
  <text class="d-sub" x="575" y="94" text-anchor="middle">for each x</text>
  <text class="d-sub" x="575" y="118" text-anchor="middle">add count of k minus x</text>
  <text class="d-sub" x="575" y="142" text-anchor="middle">then record x</text>
  <text class="d-text" x="575" y="178" text-anchor="middle">n lookups</text>
</svg>

The inner loop disappears: one pass, one lookup and one update per element, so **O(n) time and O(n) extra space**. Notice the trade: we bought speed with memory. Saying that trade-off out loud is part of a strong answer.

Useful questions when you are stuck on the optimisation:

- Am I searching for something repeatedly? → hash map or set, or sort plus [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements)
- Is the input sorted, or would sorting help? → [two pointers](/interview-question/what-is-the-two-pointer-technique)
- Am I recomputing sums of ranges? → [prefix sums](/interview-question/what-is-the-prefix-sum-technique)
- Am I looking at a contiguous range that grows and shrinks? → [sliding window](/interview-question/what-is-the-sliding-window-technique)
- Am I solving the same smaller problem many times? → [dynamic programming](/interview-question/what-is-dynamic-programming)

📌 **Interview term: Space-time trade-off** — using extra memory (here a hash map) to make a solution faster, or accepting a slower solution to save memory.

## 7. Step 5 — Code It in Python

Write the function signature first, say what each variable means, and use the standard library where it is clearer.

~~~python
def count_pairs_fast(nums, k):
    seen = {}                           # value -> how many times seen so far
    pairs = 0
    for x in nums:
        pairs += seen.get(k - x, 0)     # every earlier partner makes a pair
        seen[x] = seen.get(x, 0) + 1    # record x only AFTER the lookup
    return pairs
~~~

Python tools worth naming while you type:

- \`dict.get(key, default)\` returns the default for a missing key instead of raising \`KeyError\`.
- \`collections.Counter\` and \`collections.defaultdict(int)\` do the same counting with less code. Using \`seen[x] += 1\` on a \`defaultdict(int)\` is idiomatic; on a plain dict it raises \`KeyError\` for a new key.
- Python integers have arbitrary precision, so the pair count cannot overflow. Example 2 shows 100,000 zeros produce 4,999,950,000 pairs, a number that would not fit in a 32-bit int in Java or C++.
- \`sys.getrecursionlimit()\` is 1000 by default (checked on Python 3.13), so a recursive solution on a 10⁵-element input fails with \`RecursionError\`; prefer a loop, or explain how you would raise the limit. More in [space complexity and recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).
- Keep helpers small and named (\`count_pairs_brute\`, \`count_pairs_fast\`). It makes the brute-force comparison in Step 6 a one-liner.

## 8. Step 6 — Test: Dry Run, Edge Cases, Then a Stress Test

Testing in an interview has three levels. Do the first two every time; mention the third.

1. **Dry run** one small example by hand. For \`[1, 5, 7, -1, 5]\`, k = 6, write the map after each element: after 1: {1:1}; at 5, k-5 = 1 is in the map once, pairs = 1; at 7, k-7 = -1 is absent; at -1, k-(-1) = 7 is present once, pairs = 2; at the last 5, 1 is present once, pairs = 3. ✔
2. **Edge cases** from Step 1: empty list, one element, all duplicates, negatives.
3. **Stress test**: compare the fast solution with the brute force on hundreds of small random inputs. This is how you would test it at work, and Example 2 shows it catching a real bug: recording \`x\` in the map *before* looking up \`k - x\` lets an element pair with itself when 2x = k.

📌 **Interview term: Stress test** — automatically comparing an optimised solution with a simple, trusted one on many random inputs, so any difference reveals a bug.

## 9. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`python3 main.py\`; the blocks are the exact standard output.

**Example 1 — brute force and hash map on the same inputs, with a step counter**

~~~text
[1, 5, 7, -1, 5] k=6 -> brute=3 fast=3 | steps 10 vs 5
[] k=4 -> brute=0 fast=0 | steps 0 vs 0
[3] k=6 -> brute=0 fast=0 | steps 0 vs 1
[3, 3, 3] k=6 -> brute=3 fast=3 | steps 3 vs 3
[2, 2, 2, 2] k=4 -> brute=6 fast=6 | steps 6 vs 4
[-2, 0, 2] k=0 -> brute=1 fast=1 | steps 3 vs 3
n=2000 k=0 -> brute=94445 fast=94445 | steps 1999000 vs 2000
~~~

**Example 2 — a stress test that catches a real bug, and the overflow check**

~~~text
fast:       ok, 300 random tests passed
fast_buggy: FAIL nums=[0, -1] k=-2 expected 0 got 1
pairs in 100000 zeros: 4999950000 (a 32-bit int would hold 704982704)
~~~

**What the numbers show:** the step counts are the point of Example 1: for n = 2000 the brute force made 1,999,000 comparisons and the hash map version 2,000 lookups, and both returned 94,445. Example 2 shows why you test against the brute force: the buggy version passes the hand-picked examples but fails on \`[0, -1]\` with k = -2, where -1 pairs with itself.

## 10. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | n(n-1)/2 pairs checked; only counters stored |
| Hash map | O(n) average | O(n) | one lookup and one update per element; the map holds up to n distinct values |
| Hash map, worst case | O(n²) | O(n) | only if many keys collide in the hash table, which is rare for integers |

The measured step counts in Example 1 match the table: 1,999,000 checks against 2,000 lookups for n = 2000, which is exactly n(n-1)/2 against n.

## 11. Common Pitfalls

- **Coding before clarifying.** If you assume "values are distinct", \`[3, 3, 3]\` breaks your answer later and you lose more time than the question would have cost.
- **Updating the dict before the lookup.** \`seen[x] += 1\` followed by \`seen.get(k - x)\` counts x with itself when 2x == k. Example 2 shows the stress test catching exactly this.
- **\`seen[x] += 1\` on a plain dict.** It raises \`KeyError\` for the first occurrence; use \`seen.get(x, 0) + 1\`, \`defaultdict(int)\` or \`Counter\`.
- **Using \`list.pop(0)\` or \`x in some_list\` inside a loop.** Both are O(n) on a Python list, which silently turns an O(n) plan into O(n²). Use \`collections.deque\` and a \`set\` or \`dict\`.
- **Deep recursion on big inputs.** The default limit of 1000 frames is far below typical constraints of 10⁵.
- **Never stating complexity.** Say time and space for the brute force and for the final answer, without being asked.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The shape:</strong> <span style="color:#f0e2c8;">I use six steps: clarify, work examples by hand, state the brute force and its cost, optimise the bottleneck, code, and test.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Clarify first:</strong> <span style="color:#f0e2c8;">I ask about input size, duplicates, negatives, empty input and output format, because each one can change the algorithm.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Brute force then optimise:</strong> <span style="color:#f0e2c8;">I say the O(n²) version out loud, then ask what work it repeats; here it is searching for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k - x</code>, so a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> makes it O(n) time and O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code in Python:</strong> <span style="color:#f0e2c8;">I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict.get(k - x, 0)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code>, name helpers clearly, and look up before I record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> so an element never pairs with itself.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test:</strong> <span style="color:#f0e2c8;">I dry run a small example, then try empty, single element and duplicates, and mention a stress test against the brute force.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you cannot find the optimal solution?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Code the brute force cleanly and correctly, state its complexity, and explain where the bottleneck is. A working O(n²) answer with a clear explanation beats unfinished O(n) code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know which complexity is fast enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From the constraints. A rough budget is around 10⁸ simple operations, so n = 10⁵ needs O(n log n) or better, while n = 1,000 allows O(n²).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a dict and not a list for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">seen</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k - x in seen</code> is O(1) on average for a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>, but O(n) for a list, which would bring back the O(n²) you just removed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the count overflow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in Python: integers grow as needed. In Java or C++ the count must be a 64-bit type, because 100,000 equal values give about 5 × 10⁹ pairs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test this beyond a few examples?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write a stress test: random small lists, compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count_pairs_fast</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count_pairs_brute</code>, and print the first input where they differ.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Clarifying questions** | Questions asked before solving to pin down input, limits and output |
| **Constraints** | Given limits on input size and values; they set the speed you need |
| **Edge case** | A boundary input (empty, one item, duplicates) where code often breaks |
| **Brute force** | The simplest correct solution, usually trying everything |
| **Time complexity** | How running time grows with input size, in Big-O |
| **Bottleneck** | The part of a solution doing most of the work |
| **Space-time trade-off** | Spending memory to save time, or the reverse |
| **Dry run** | Tracing code by hand on a small input |
| **Stress test** | Comparing a fast solution with a brute force on many random inputs |
| **Counter** | A dict subclass in collections that counts hashable items |

---
**Conclusion:** A good interview answer is a process you can repeat: clarify the input, work examples by hand, state the brute force with its cost, find the bottleneck and remove it, code it in clear Python, and test with a dry run and edge cases. On the pair-counting problem that process took us from n(n-1)/2 checks to n dict lookups, and the stress test in Example 2 caught the one bug that the obvious "optimised" version contains. That is the story an interviewer wants to hear: not only the right code, but how you reached it and how you know it works.`,
        examples: [
          {
            label: "Brute force vs hash map, with a step counter",
            code: `# Count pairs (i < j) with nums[i] + nums[j] == k.
# Step 3 of the framework (brute force) and step 4 (optimise), side by side.

def count_pairs_brute(nums, k):
    pairs, steps = 0, 0
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            steps += 1                      # one comparison
            if nums[i] + nums[j] == k:
                pairs += 1
    return pairs, steps

def count_pairs_fast(nums, k):
    seen = {}                               # value -> how many times seen so far
    pairs, steps = 0, 0
    for x in nums:
        steps += 1                          # one dictionary lookup + one update
        pairs += seen.get(k - x, 0)         # every earlier partner makes a pair
        seen[x] = seen.get(x, 0) + 1
    return pairs, steps

def fmt(nums):
    return "[" + ", ".join(str(x) for x in nums) + "]"

tests = [
    ([1, 5, 7, -1, 5], 6),   # normal case, a value used in two pairs
    ([], 4),                 # empty input
    ([3], 6),                # one element cannot pair with itself
    ([3, 3, 3], 6),          # duplicates: 3 pairs, not 1
    ([2, 2, 2, 2], 4),       # 4 choose 2 = 6
    ([-2, 0, 2], 0),         # negatives
]
for nums, k in tests:
    b, bs = count_pairs_brute(nums, k)
    f, fs = count_pairs_fast(nums, k)
    print(fmt(nums) + " k=" + str(k) + " -> brute=" + str(b) + " fast=" + str(f)
          + " | steps " + str(bs) + " vs " + str(fs))

# A bigger input from a tiny deterministic generator (same numbers in every language).
x = 7
big = []
for _ in range(2000):
    x = x * 48271 % 2147483647
    big.append(x % 21 - 10)                 # values in -10..10
b, bs = count_pairs_brute(big, 0)
f, fs = count_pairs_fast(big, 0)
print("n=2000 k=0 -> brute=" + str(b) + " fast=" + str(f) + " | steps " + str(bs) + " vs " + str(fs))`,
          },
          {
            label: "Stress test against the brute force, and an overflow check",
            code: `# Step 6 of the framework: test. A stress test compares the fast answer with
# the brute force on hundreds of small random inputs, and catches a real bug.

def brute(nums, k):
    return sum(1 for i in range(len(nums)) for j in range(i + 1, len(nums)) if nums[i] + nums[j] == k)

def fast(nums, k):
    seen, pairs = {}, 0
    for x in nums:
        pairs += seen.get(k - x, 0)      # look up partners first...
        seen[x] = seen.get(x, 0) + 1     # ...then record x
    return pairs

def fast_buggy(nums, k):
    seen, pairs = {}, 0
    for x in nums:
        seen[x] = seen.get(x, 0) + 1     # BUG: x is recorded before the lookup,
        pairs += seen.get(k - x, 0)      # so x pairs with itself when 2 * x == k
    return pairs

state = 12345
def rand(n):                             # deterministic generator, same in every language
    global state
    state = state * 48271 % 2147483647
    return state % n

def stress(solution, rounds):
    for _ in range(rounds):
        nums = [rand(7) - 3 for _ in range(rand(10))]
        k = rand(7) - 3
        if solution(nums, k) != brute(nums, k):
            return "FAIL nums=[" + ", ".join(map(str, nums)) + "] k=" + str(k) + " expected " + str(brute(nums, k)) + " got " + str(solution(nums, k))
    return "ok, " + str(rounds) + " random tests passed"

print("fast:       " + stress(fast, 300))
print("fast_buggy: " + stress(fast_buggy, 300))

# Overflow check: 100000 zeros with k = 0 gives n * (n - 1) / 2 pairs.
n = 100000
total = fast([0] * n, 0)
wrapped = (total + 2**31) % 2**32 - 2**31   # what a 32-bit int would hold
print("pairs in 100000 zeros: " + str(total) + " (a 32-bit int would hold " + str(wrapped) + ")")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Before we start the coding part: walk me through how you approach a data-structures problem you have not seen before. Then show me on a small problem — count the pairs in a list that add up to a target — and write it in JavaScript."

**What a strong answer should cover:**
- A clear, repeatable sequence: clarify, examples, brute force, optimise, code, test — and talking through each step.
- Clarifying questions that change the algorithm (input size, duplicates, negatives, empty input, output format).
- Stating the brute force and its complexity before optimising, then naming the bottleneck and the data structure that removes it.
- The space-time trade-off of the optimised version (O(n) time for O(n) extra memory).
- Testing: a dry run, edge cases, and how a stress test against the brute force would catch bugs.
- JavaScript specifics: \`Map\` rather than a plain object for counting (any key type, no inherited keys), numbers are exact only up to 2⁵³ − 1, and \`Array.prototype.sort()\` compares as strings unless you pass a comparator.

**Clarifying questions expected:**
- "How large can the input be, and can values repeat or be negative?"
- "Do you want the number of pairs, or the pairs themselves?"

**Code / implementation expected:** Yes — a brute force and an O(n) solution in JavaScript using a \`Map\`, plus a few test calls.`,
        answer: `**Target Audience:** Anyone preparing for their first coding interviews — no prior algorithms knowledge assumed.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`node main.js\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A plumber is called to a flat with water on the floor. A bad plumber starts ripping out pipes straight away. A good one asks three questions first (where is the water, since when, is it hot or cold), looks at the obvious cause, fixes it the simple way if that is good enough, and then turns the tap on again to check. Both plumbers might end up replacing the same pipe, but only one of them can explain why, and only one of them is still trusted when the first guess is wrong.

A coding interview works the same way. The interviewer is not only checking whether you reach the right code; they are watching **how** you get there, because that is what working with you will feel like. A candidate who silently writes a perfect answer gets less credit than you might expect, and a candidate who talks through a clear process, finds a bug in testing and fixes it often does well. A repeatable method also protects you from panic: when you do not know the trick yet, you still know the next step.

## 2. The Six-Step Method at a Glance

The steps below are one common way to structure the time. Interview guides use different names for them, but almost all contain the same pieces.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The six steps in order: clarify, examples, brute force, optimise, code, test">
  <defs>
    <marker id="b02q1-javascript-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="120" y="72" text-anchor="middle">1. Clarify</text>
  <text class="d-sub" x="120" y="98" text-anchor="middle">inputs, limits, output</text>
  <path class="d-edge" d="M 214 80 L 264 80" marker-end="url(#b02q1-javascript-arrow)"/>
  <rect class="d-box-muted" x="270" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="360" y="72" text-anchor="middle">2. Examples</text>
  <text class="d-sub" x="360" y="98" text-anchor="middle">normal and edge cases</text>
  <path class="d-edge" d="M 454 80 L 504 80" marker-end="url(#b02q1-javascript-arrow)"/>
  <rect class="d-box-muted" x="510" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="600" y="72" text-anchor="middle">3. Brute force</text>
  <text class="d-sub" x="600" y="98" text-anchor="middle">say it, state its cost</text>
  <path class="d-edge" d="M 600 124 L 600 184" marker-end="url(#b02q1-javascript-arrow)"/>
  <rect class="d-box-accent" x="510" y="190" width="180" height="80" rx="10"/>
  <text class="d-text d-accent" x="600" y="222" text-anchor="middle">4. Optimise</text>
  <text class="d-sub" x="600" y="248" text-anchor="middle">remove the bottleneck</text>
  <path class="d-edge" d="M 506 230 L 456 230" marker-end="url(#b02q1-javascript-arrow)"/>
  <rect class="d-box-muted" x="270" y="190" width="180" height="80" rx="10"/>
  <text class="d-text" x="360" y="222" text-anchor="middle">5. Code</text>
  <text class="d-sub" x="360" y="248" text-anchor="middle">talk while you type</text>
  <path class="d-edge" d="M 266 230 L 216 230" marker-end="url(#b02q1-javascript-arrow)"/>
  <rect class="d-box-muted" x="30" y="190" width="180" height="80" rx="10"/>
  <text class="d-text" x="120" y="222" text-anchor="middle">6. Test</text>
  <text class="d-sub" x="120" y="248" text-anchor="middle">dry run, edge cases</text>
</svg>

Steps 1 to 4 happen before you write real code. They usually take a third or more of the time, and that is fine: an interviewer would rather see a correct plan written in five minutes than wrong code written in two.

📌 **Interview term: Clarifying questions** — questions you ask before solving, to pin down the input, the limits and the expected output. They show you do not assume.

📌 **Interview term: Brute force** — the simplest correct solution, usually trying every possibility. It is slow, but it proves you understand the problem and gives you something to improve.

📌 **Interview term: Time complexity** — how the running time grows as the input grows, written in Big-O (for example O(n²)). If Big-O is new to you, read [What is Big-O notation?](/interview-question/what-is-big-o-notation) first.

📌 **Interview term: Bottleneck** — the part of a solution that does most of the work. Optimising means finding it and making it cheaper.

📌 **Interview term: Dry run** — stepping through your code by hand with a small input, writing down the variables, to find bugs before (or without) running it.

## 3. Step 1 — Clarify: Questions to Ask Your Interviewer First

We will use one problem for the whole doc: **"Given a list of integers \`nums\` and a target \`k\`, count the pairs of positions i < j with nums[i] + nums[j] == k."** Here is what a strong candidate asks before writing anything:

| Question | Why it matters here |
| :--- | :--- |
| How large can the list be? | 1,000 items allows O(n²); 100,000 items needs about O(n) or O(n log n) |
| Can values repeat? | With \`[3, 3, 3]\` and k = 6 the answer is 3 pairs, not 1; duplicates change the algorithm |
| Can values be negative or zero? | Rules out tricks that only work for positive numbers |
| Do you want the count, or the pairs themselves? | Listing the pairs can take O(n²) output on its own |
| Can an element pair with itself? | Usually no (i < j), and the code must respect that |
| What should an empty list return? | 0, and the code must not crash on it |

You do not need all of these every time. Pick the ones that change your algorithm, ask them in one or two sentences, and write the answers down where the interviewer can see them.

📌 **Interview term: Constraints** — the limits on input size and values given in the problem (for example "n ≤ 10⁵"). They tell you how fast the solution must be.

A common rule of thumb (an estimate, not a law) assumes a judge or interviewer expects roughly 10⁸ simple operations per second at most:

| Input size n | Usually acceptable complexity |
| :--- | :--- |
| up to about 20 | O(2ⁿ), trying all subsets |
| up to about 1,000 | O(n²) |
| up to about 10⁵ to 10⁶ | O(n log n) or O(n) |
| larger, or many queries | O(log n) or O(1) per query |

## 4. Step 2 — Work Through Examples by Hand

Write two or three small inputs and their answers before coding. Include at least one normal case and the edge cases from your questions:

- \`[1, 5, 7, -1, 5]\`, k = 6 → 3 pairs: (1, 5), (1, 5) using the second 5, and (7, -1)
- \`[3, 3, 3]\`, k = 6 → 3 pairs, because positions (0,1), (0,2) and (1,2) all work
- \`[]\` → 0, and \`[3]\` with k = 6 → 0, because one element cannot pair with itself

Doing this by hand often reveals the algorithm. Here, noticing that each new 5 pairs with **every earlier** 1 is the whole idea of the fast solution.

📌 **Interview term: Edge case** — an input at the boundary of what is allowed (empty, one element, all equal, negative, maximum size) where code most often breaks.

## 5. Step 3 — State the Brute Force, Then Its Cost

Say it in one sentence: "Check every pair i < j and count the ones that add up to k." There are n(n-1)/2 pairs, so this is **O(n²) time and O(1) extra space**. Say the cost out loud even if you will not code it; it gives the interviewer a baseline and buys you time to think.

## 6. Step 4 — Optimise: Find the Bottleneck

Ask: *what work does the brute force repeat?* For every \`nums[j]\` it scans all earlier elements looking for one value: \`k - nums[j]\`. "Search for a value again and again" is the signal for a hash map, which answers "how many times have I seen value v?" in O(1) on average (see [How does a hash table work?](/interview-question/how-does-a-hash-table-work)).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Brute force checks every pair; the optimised version replaces the inner loop with one map lookup">
  <defs>
    <marker id="b02q1b-javascript-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="230" height="170" rx="10"/>
  <text class="d-text" x="145" y="62" text-anchor="middle">Brute force</text>
  <text class="d-sub" x="145" y="94" text-anchor="middle">for each i</text>
  <text class="d-sub" x="145" y="118" text-anchor="middle">for each j after i</text>
  <text class="d-sub" x="145" y="142" text-anchor="middle">check the sum</text>
  <text class="d-text" x="145" y="178" text-anchor="middle">n(n-1)/2 checks</text>
  <path class="d-edge-accent" d="M 270 115 L 450 115" marker-end="url(#b02q1b-javascript-arrow)"/>
  <text class="d-sub" x="360" y="96" text-anchor="middle">inner loop</text>
  <text class="d-sub" x="360" y="142" text-anchor="middle">becomes a lookup</text>
  <rect class="d-box-accent" x="460" y="30" width="230" height="170" rx="10"/>
  <text class="d-text d-accent" x="575" y="62" text-anchor="middle">Optimised</text>
  <text class="d-sub" x="575" y="94" text-anchor="middle">for each x</text>
  <text class="d-sub" x="575" y="118" text-anchor="middle">add count of k minus x</text>
  <text class="d-sub" x="575" y="142" text-anchor="middle">then record x</text>
  <text class="d-text" x="575" y="178" text-anchor="middle">n lookups</text>
</svg>

The inner loop disappears: one pass, one lookup and one update per element, so **O(n) time and O(n) extra space**. Notice the trade: we bought speed with memory. Saying that trade-off out loud is part of a strong answer.

Useful questions when you are stuck on the optimisation:

- Am I searching for something repeatedly? → hash map or set, or sort plus [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements)
- Is the input sorted, or would sorting help? → [two pointers](/interview-question/what-is-the-two-pointer-technique)
- Am I recomputing sums of ranges? → [prefix sums](/interview-question/what-is-the-prefix-sum-technique)
- Am I looking at a contiguous range that grows and shrinks? → [sliding window](/interview-question/what-is-the-sliding-window-technique)
- Am I solving the same smaller problem many times? → [dynamic programming](/interview-question/what-is-dynamic-programming)

📌 **Interview term: Space-time trade-off** — using extra memory (here a hash map) to make a solution faster, or accepting a slower solution to save memory.

## 7. Step 5 — Code It in JavaScript

Write the function signature first, say what each variable means, and use the built-ins where they are clearer.

~~~javascript
function countPairsFast(nums, k) {
  const seen = new Map();                  // value -> how many times seen so far
  let pairs = 0;
  for (const x of nums) {
    pairs += seen.get(k - x) || 0;         // every earlier partner makes a pair
    seen.set(x, (seen.get(x) || 0) + 1);   // record x only AFTER the lookup
  }
  return pairs;
}
~~~

JavaScript details worth naming while you type:

- **\`Map\` over a plain object.** A \`Map\` keeps number keys as numbers and has no inherited keys; an object turns every key into a string and inherits names such as \`constructor\` from its prototype.
- \`seen.get(missing)\` returns \`undefined\`, and \`undefined + 1\` is \`NaN\`, so write \`(seen.get(x) || 0) + 1\`.
- **Number precision.** All JS numbers are 64-bit floats, exact for integers only up to \`Number.MAX_SAFE_INTEGER\` (9007199254740991). Pair counts here stay far below that, but products and hashes can exceed it; use \`BigInt\` or a modulus when they might.
- **Sorting.** \`[10, 9, 1, 100].sort()\` returns \`[1, 10, 100, 9]\` (checked in Node 22) because the default sort compares strings. Always pass \`(a, b) => a - b\` for numbers.
- There is no built-in heap or deque. If you need one, say so and write a small class; \`array.shift()\` is O(n) in practice.

## 8. Step 6 — Test: Dry Run, Edge Cases, Then a Stress Test

Testing in an interview has three levels. Do the first two every time; mention the third.

1. **Dry run** one small example by hand. For \`[1, 5, 7, -1, 5]\`, k = 6, write the map after each element: after 1: {1:1}; at 5, k-5 = 1 is in the map once, pairs = 1; at 7, k-7 = -1 is absent; at -1, k-(-1) = 7 is present once, pairs = 2; at the last 5, 1 is present once, pairs = 3. ✔
2. **Edge cases** from Step 1: empty list, one element, all duplicates, negatives.
3. **Stress test**: compare the fast solution with the brute force on hundreds of small random inputs. This is how you would test it at work, and Example 2 shows it catching a real bug: recording \`x\` in the map *before* looking up \`k - x\` lets an element pair with itself when 2x = k.

📌 **Interview term: Stress test** — automatically comparing an optimised solution with a simple, trusted one on many random inputs, so any difference reveals a bug.

## 9. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`node main.js\`; the blocks are the exact standard output.

**Example 1 — brute force and hash map on the same inputs, with a step counter**

~~~text
[1, 5, 7, -1, 5] k=6 -> brute=3 fast=3 | steps 10 vs 5
[] k=4 -> brute=0 fast=0 | steps 0 vs 0
[3] k=6 -> brute=0 fast=0 | steps 0 vs 1
[3, 3, 3] k=6 -> brute=3 fast=3 | steps 3 vs 3
[2, 2, 2, 2] k=4 -> brute=6 fast=6 | steps 6 vs 4
[-2, 0, 2] k=0 -> brute=1 fast=1 | steps 3 vs 3
n=2000 k=0 -> brute=94445 fast=94445 | steps 1999000 vs 2000
~~~

**Example 2 — a stress test that catches a real bug, and the overflow check**

~~~text
fast:       ok, 300 random tests passed
fast_buggy: FAIL nums=[0, -1] k=-2 expected 0 got 1
pairs in 100000 zeros: 4999950000 (a 32-bit int would hold 704982704)
~~~

**What the numbers show:** the step counts are the point of Example 1: for n = 2000 the brute force made 1,999,000 comparisons and the hash map version 2,000 lookups, and both returned 94,445. Example 2 shows why you test against the brute force: the buggy version passes the hand-picked examples but fails on \`[0, -1]\` with k = -2, where -1 pairs with itself.

## 10. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | n(n-1)/2 pairs checked; only counters stored |
| Hash map | O(n) average | O(n) | one lookup and one update per element; the map holds up to n distinct values |
| Hash map, worst case | O(n²) | O(n) | only if many keys collide in the hash table, which is rare for integers |

The measured step counts in Example 1 match the table: 1,999,000 checks against 2,000 lookups for n = 2000, which is exactly n(n-1)/2 against n.

## 11. Common Pitfalls

- **Coding before clarifying.** If you assume "values are distinct", \`[3, 3, 3]\` breaks your answer later and you lose more time than the question would have cost.
- **Updating the map before the lookup.** It lets x pair with itself when 2x === k; Example 2 shows the stress test catching exactly this.
- **\`seen.get(x) + 1\` without a default.** The first time it is \`undefined + 1\`, which is \`NaN\`, and the count is silently wrong from then on.
- **Using an object as a counter.** \`{}\` has prototype keys (\`'constructor' in {}\` is \`true\`) and turns \`1\` and \`'1'\` into the same key. Use \`Map\`, or \`Object.create(null)\` if you must.
- **\`nums.sort()\` without a comparator.** It sorts numbers as strings.
- **\`==\` instead of \`===\`.** Loose equality converts types (\`'0' == 0\` is \`true\`), which hides bugs in comparisons.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The shape:</strong> <span style="color:#f0e2c8;">I use six steps: clarify, work examples by hand, state the brute force and its cost, optimise the bottleneck, code, and test.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Clarify first:</strong> <span style="color:#f0e2c8;">I ask about input size, duplicates, negatives, empty input and output format, because each one can change the algorithm.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Brute force then optimise:</strong> <span style="color:#f0e2c8;">I say the O(n²) version out loud, then ask what work it repeats; here it is searching for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k - x</code>, so a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> makes it O(n) time and O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code in JavaScript:</strong> <span style="color:#f0e2c8;">I use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(seen.get(x) || 0) + 1</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code> for comparisons, and look up before I record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> so an element never pairs with itself.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test:</strong> <span style="color:#f0e2c8;">I dry run a small example, then try empty, single element and duplicates, and mention a stress test against the brute force.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you cannot find the optimal solution?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Code the brute force cleanly, state its complexity, and explain where the bottleneck is. A working O(n²) answer with a clear explanation beats unfinished O(n) code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> and not an object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> keeps key types, has no inherited keys like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">constructor</code>, has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.size</code>, and keeps insertion order. An object converts keys to strings.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could the count lose precision?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only above 2⁵³ − 1, about 9 × 10¹⁵. 100,000 equal values give about 5 × 10⁹ pairs, which is exact. For bigger values I would use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know which complexity is fast enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From the constraints. A rough budget is around 10⁸ simple operations, so n = 10⁵ needs O(n log n) or better, while n = 1,000 allows O(n²).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test this beyond a few examples?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write a stress test: random small arrays, compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">countPairsFast</code> with the brute force, and print the first input where they differ.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Clarifying questions** | Questions asked before solving to pin down input, limits and output |
| **Constraints** | Given limits on input size and values; they set the speed you need |
| **Edge case** | A boundary input (empty, one item, duplicates) where code often breaks |
| **Brute force** | The simplest correct solution, usually trying everything |
| **Time complexity** | How running time grows with input size, in Big-O |
| **Bottleneck** | The part of a solution doing most of the work |
| **Space-time trade-off** | Spending memory to save time, or the reverse |
| **Dry run** | Tracing code by hand on a small input |
| **Stress test** | Comparing a fast solution with a brute force on many random inputs |
| **Map** | JavaScript built-in hash map: any key type, insertion-ordered, has .size |

---
**Conclusion:** A good interview answer is a process you can repeat: clarify the input, work examples by hand, state the brute force with its cost, find the bottleneck and remove it, code it in clear JavaScript, and test with a dry run and edge cases. On the pair-counting problem that process took us from n(n-1)/2 checks to n \`Map\` lookups, and the stress test in Example 2 caught the one bug the obvious "optimised" version contains. Along the way, the JavaScript-specific habits (a \`Map\` instead of an object, a default for missing keys, a numeric comparator for sorting) are what separate a careful candidate from a lucky one.`,
        examples: [
          {
            label: "Brute force vs hash map, with a step counter",
            code: `// Count pairs (i < j) with nums[i] + nums[j] === k.
// Step 3 of the framework (brute force) and step 4 (optimise), side by side.

function countPairsBrute(nums, k) {
  let pairs = 0, steps = 0;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      steps++;                                  // one comparison
      if (nums[i] + nums[j] === k) pairs++;
    }
  }
  return [pairs, steps];
}

function countPairsFast(nums, k) {
  const seen = new Map();                       // value -> how many times seen so far
  let pairs = 0, steps = 0;
  for (const x of nums) {
    steps++;                                    // one Map lookup + one update
    pairs += seen.get(k - x) || 0;              // every earlier partner makes a pair
    seen.set(x, (seen.get(x) || 0) + 1);
  }
  return [pairs, steps];
}

function fmt(nums) {
  return '[' + nums.join(', ') + ']';
}

const tests = [
  [[1, 5, 7, -1, 5], 6],   // normal case, a value used in two pairs
  [[], 4],                 // empty input
  [[3], 6],                // one element cannot pair with itself
  [[3, 3, 3], 6],          // duplicates: 3 pairs, not 1
  [[2, 2, 2, 2], 4],       // 4 choose 2 = 6
  [[-2, 0, 2], 0],         // negatives
];
for (const [nums, k] of tests) {
  const [b, bs] = countPairsBrute(nums, k);
  const [f, fs] = countPairsFast(nums, k);
  console.log(fmt(nums) + ' k=' + k + ' -> brute=' + b + ' fast=' + f + ' | steps ' + bs + ' vs ' + fs);
}

// A bigger input from a tiny deterministic generator (same numbers in every language).
let x = 7;
const big = [];
for (let i = 0; i < 2000; i++) {
  x = (x * 48271) % 2147483647;               // stays below 2^53, so exact in a JS number
  big.push((x % 21) - 10);                     // values in -10..10
}
const [b, bs] = countPairsBrute(big, 0);
const [f, fs] = countPairsFast(big, 0);
console.log('n=2000 k=0 -> brute=' + b + ' fast=' + f + ' | steps ' + bs + ' vs ' + fs);`,
          },
          {
            label: "Stress test against the brute force, and an overflow check",
            code: `// Step 6 of the framework: test. A stress test compares the fast answer with
// the brute force on hundreds of small random inputs, and catches a real bug.

function brute(nums, k) {
  let c = 0;
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++) if (nums[i] + nums[j] === k) c++;
  return c;
}

function fast(nums, k) {
  const seen = new Map();
  let pairs = 0;
  for (const x of nums) {
    pairs += seen.get(k - x) || 0;          // look up partners first...
    seen.set(x, (seen.get(x) || 0) + 1);    // ...then record x
  }
  return pairs;
}

function fastBuggy(nums, k) {
  const seen = new Map();
  let pairs = 0;
  for (const x of nums) {
    seen.set(x, (seen.get(x) || 0) + 1);    // BUG: x is recorded before the lookup,
    pairs += seen.get(k - x) || 0;          // so x pairs with itself when 2 * x === k
  }
  return pairs;
}

let state = 12345;
function rand(n) {                          // deterministic generator, same in every language
  state = (state * 48271) % 2147483647;
  return state % n;
}

function stress(solution, rounds) {
  for (let r = 0; r < rounds; r++) {
    const len = rand(10);
    const nums = [];
    for (let i = 0; i < len; i++) nums.push(rand(7) - 3);
    const k = rand(7) - 3;
    if (solution(nums, k) !== brute(nums, k))
      return 'FAIL nums=[' + nums.join(', ') + '] k=' + k + ' expected ' + brute(nums, k) + ' got ' + solution(nums, k);
  }
  return 'ok, ' + rounds + ' random tests passed';
}

console.log('fast:       ' + stress(fast, 300));
console.log('fast_buggy: ' + stress(fastBuggy, 300));

// Overflow check: 100000 zeros with k = 0 gives n * (n - 1) / 2 pairs.
const n = 100000;
const total = fast(new Array(n).fill(0), 0);  // a JS number is exact up to 2^53
const wrapped = total | 0;                    // what a 32-bit int would hold
console.log('pairs in 100000 zeros: ' + total + ' (a 32-bit int would hold ' + wrapped + ')');`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Before we start the coding part: walk me through how you approach a data-structures problem you have not seen before. Then show me on a small problem — count the pairs in a list that add up to a target — and write it in Java."

**What a strong answer should cover:**
- A clear, repeatable sequence: clarify, examples, brute force, optimise, code, test — and talking through each step.
- Clarifying questions that change the algorithm (input size, duplicates, negatives, empty input, output format).
- Stating the brute force and its complexity before optimising, then naming the bottleneck and the data structure that removes it.
- The space-time trade-off of the optimised version (O(n) time for O(n) extra memory).
- Testing: a dry run, edge cases, and how a stress test against the brute force would catch bugs.
- Java specifics: \`HashMap<Integer, Integer>\` boxes every int (\`getOrDefault\`, \`merge\`), counts that can exceed 2³¹ − 1 need \`long\`, and \`Integer\` objects must be compared with \`equals\`, not \`==\`.

**Clarifying questions expected:**
- "How large can the input be, and can values repeat or be negative?"
- "Do you want the number of pairs, or the pairs themselves?"

**Code / implementation expected:** Yes — a brute force and an O(n) solution in Java using a \`HashMap\`, inside a \`Main\` class with a few test calls.`,
        answer: `**Target Audience:** Anyone preparing for their first coding interviews — no prior algorithms knowledge assumed.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`javac Main.java && java Main\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A plumber is called to a flat with water on the floor. A bad plumber starts ripping out pipes straight away. A good one asks three questions first (where is the water, since when, is it hot or cold), looks at the obvious cause, fixes it the simple way if that is good enough, and then turns the tap on again to check. Both plumbers might end up replacing the same pipe, but only one of them can explain why, and only one of them is still trusted when the first guess is wrong.

A coding interview works the same way. The interviewer is not only checking whether you reach the right code; they are watching **how** you get there, because that is what working with you will feel like. A candidate who silently writes a perfect answer gets less credit than you might expect, and a candidate who talks through a clear process, finds a bug in testing and fixes it often does well. A repeatable method also protects you from panic: when you do not know the trick yet, you still know the next step.

## 2. The Six-Step Method at a Glance

The steps below are one common way to structure the time. Interview guides use different names for them, but almost all contain the same pieces.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The six steps in order: clarify, examples, brute force, optimise, code, test">
  <defs>
    <marker id="b02q1-java-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="120" y="72" text-anchor="middle">1. Clarify</text>
  <text class="d-sub" x="120" y="98" text-anchor="middle">inputs, limits, output</text>
  <path class="d-edge" d="M 214 80 L 264 80" marker-end="url(#b02q1-java-arrow)"/>
  <rect class="d-box-muted" x="270" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="360" y="72" text-anchor="middle">2. Examples</text>
  <text class="d-sub" x="360" y="98" text-anchor="middle">normal and edge cases</text>
  <path class="d-edge" d="M 454 80 L 504 80" marker-end="url(#b02q1-java-arrow)"/>
  <rect class="d-box-muted" x="510" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="600" y="72" text-anchor="middle">3. Brute force</text>
  <text class="d-sub" x="600" y="98" text-anchor="middle">say it, state its cost</text>
  <path class="d-edge" d="M 600 124 L 600 184" marker-end="url(#b02q1-java-arrow)"/>
  <rect class="d-box-accent" x="510" y="190" width="180" height="80" rx="10"/>
  <text class="d-text d-accent" x="600" y="222" text-anchor="middle">4. Optimise</text>
  <text class="d-sub" x="600" y="248" text-anchor="middle">remove the bottleneck</text>
  <path class="d-edge" d="M 506 230 L 456 230" marker-end="url(#b02q1-java-arrow)"/>
  <rect class="d-box-muted" x="270" y="190" width="180" height="80" rx="10"/>
  <text class="d-text" x="360" y="222" text-anchor="middle">5. Code</text>
  <text class="d-sub" x="360" y="248" text-anchor="middle">talk while you type</text>
  <path class="d-edge" d="M 266 230 L 216 230" marker-end="url(#b02q1-java-arrow)"/>
  <rect class="d-box-muted" x="30" y="190" width="180" height="80" rx="10"/>
  <text class="d-text" x="120" y="222" text-anchor="middle">6. Test</text>
  <text class="d-sub" x="120" y="248" text-anchor="middle">dry run, edge cases</text>
</svg>

Steps 1 to 4 happen before you write real code. They usually take a third or more of the time, and that is fine: an interviewer would rather see a correct plan written in five minutes than wrong code written in two.

📌 **Interview term: Clarifying questions** — questions you ask before solving, to pin down the input, the limits and the expected output. They show you do not assume.

📌 **Interview term: Brute force** — the simplest correct solution, usually trying every possibility. It is slow, but it proves you understand the problem and gives you something to improve.

📌 **Interview term: Time complexity** — how the running time grows as the input grows, written in Big-O (for example O(n²)). If Big-O is new to you, read [What is Big-O notation?](/interview-question/what-is-big-o-notation) first.

📌 **Interview term: Bottleneck** — the part of a solution that does most of the work. Optimising means finding it and making it cheaper.

📌 **Interview term: Dry run** — stepping through your code by hand with a small input, writing down the variables, to find bugs before (or without) running it.

## 3. Step 1 — Clarify: Questions to Ask Your Interviewer First

We will use one problem for the whole doc: **"Given a list of integers \`nums\` and a target \`k\`, count the pairs of positions i < j with nums[i] + nums[j] == k."** Here is what a strong candidate asks before writing anything:

| Question | Why it matters here |
| :--- | :--- |
| How large can the list be? | 1,000 items allows O(n²); 100,000 items needs about O(n) or O(n log n) |
| Can values repeat? | With \`[3, 3, 3]\` and k = 6 the answer is 3 pairs, not 1; duplicates change the algorithm |
| Can values be negative or zero? | Rules out tricks that only work for positive numbers |
| Do you want the count, or the pairs themselves? | Listing the pairs can take O(n²) output on its own |
| Can an element pair with itself? | Usually no (i < j), and the code must respect that |
| What should an empty list return? | 0, and the code must not crash on it |

You do not need all of these every time. Pick the ones that change your algorithm, ask them in one or two sentences, and write the answers down where the interviewer can see them.

📌 **Interview term: Constraints** — the limits on input size and values given in the problem (for example "n ≤ 10⁵"). They tell you how fast the solution must be.

A common rule of thumb (an estimate, not a law) assumes a judge or interviewer expects roughly 10⁸ simple operations per second at most:

| Input size n | Usually acceptable complexity |
| :--- | :--- |
| up to about 20 | O(2ⁿ), trying all subsets |
| up to about 1,000 | O(n²) |
| up to about 10⁵ to 10⁶ | O(n log n) or O(n) |
| larger, or many queries | O(log n) or O(1) per query |

## 4. Step 2 — Work Through Examples by Hand

Write two or three small inputs and their answers before coding. Include at least one normal case and the edge cases from your questions:

- \`[1, 5, 7, -1, 5]\`, k = 6 → 3 pairs: (1, 5), (1, 5) using the second 5, and (7, -1)
- \`[3, 3, 3]\`, k = 6 → 3 pairs, because positions (0,1), (0,2) and (1,2) all work
- \`[]\` → 0, and \`[3]\` with k = 6 → 0, because one element cannot pair with itself

Doing this by hand often reveals the algorithm. Here, noticing that each new 5 pairs with **every earlier** 1 is the whole idea of the fast solution.

📌 **Interview term: Edge case** — an input at the boundary of what is allowed (empty, one element, all equal, negative, maximum size) where code most often breaks.

## 5. Step 3 — State the Brute Force, Then Its Cost

Say it in one sentence: "Check every pair i < j and count the ones that add up to k." There are n(n-1)/2 pairs, so this is **O(n²) time and O(1) extra space**. Say the cost out loud even if you will not code it; it gives the interviewer a baseline and buys you time to think.

## 6. Step 4 — Optimise: Find the Bottleneck

Ask: *what work does the brute force repeat?* For every \`nums[j]\` it scans all earlier elements looking for one value: \`k - nums[j]\`. "Search for a value again and again" is the signal for a hash map, which answers "how many times have I seen value v?" in O(1) on average (see [How does a hash table work?](/interview-question/how-does-a-hash-table-work)).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Brute force checks every pair; the optimised version replaces the inner loop with one map lookup">
  <defs>
    <marker id="b02q1b-java-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="230" height="170" rx="10"/>
  <text class="d-text" x="145" y="62" text-anchor="middle">Brute force</text>
  <text class="d-sub" x="145" y="94" text-anchor="middle">for each i</text>
  <text class="d-sub" x="145" y="118" text-anchor="middle">for each j after i</text>
  <text class="d-sub" x="145" y="142" text-anchor="middle">check the sum</text>
  <text class="d-text" x="145" y="178" text-anchor="middle">n(n-1)/2 checks</text>
  <path class="d-edge-accent" d="M 270 115 L 450 115" marker-end="url(#b02q1b-java-arrow)"/>
  <text class="d-sub" x="360" y="96" text-anchor="middle">inner loop</text>
  <text class="d-sub" x="360" y="142" text-anchor="middle">becomes a lookup</text>
  <rect class="d-box-accent" x="460" y="30" width="230" height="170" rx="10"/>
  <text class="d-text d-accent" x="575" y="62" text-anchor="middle">Optimised</text>
  <text class="d-sub" x="575" y="94" text-anchor="middle">for each x</text>
  <text class="d-sub" x="575" y="118" text-anchor="middle">add count of k minus x</text>
  <text class="d-sub" x="575" y="142" text-anchor="middle">then record x</text>
  <text class="d-text" x="575" y="178" text-anchor="middle">n lookups</text>
</svg>

The inner loop disappears: one pass, one lookup and one update per element, so **O(n) time and O(n) extra space**. Notice the trade: we bought speed with memory. Saying that trade-off out loud is part of a strong answer.

Useful questions when you are stuck on the optimisation:

- Am I searching for something repeatedly? → hash map or set, or sort plus [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements)
- Is the input sorted, or would sorting help? → [two pointers](/interview-question/what-is-the-two-pointer-technique)
- Am I recomputing sums of ranges? → [prefix sums](/interview-question/what-is-the-prefix-sum-technique)
- Am I looking at a contiguous range that grows and shrinks? → [sliding window](/interview-question/what-is-the-sliding-window-technique)
- Am I solving the same smaller problem many times? → [dynamic programming](/interview-question/what-is-dynamic-programming)

📌 **Interview term: Space-time trade-off** — using extra memory (here a hash map) to make a solution faster, or accepting a slower solution to save memory.

## 7. Step 5 — Code It in Java

Write the method signature first, say what each variable means, and use the collections API where it is clearer.

~~~java
static long countPairsFast(int[] nums, int k) {
    Map<Integer, Integer> seen = new HashMap<>();   // value -> times seen so far
    long pairs = 0;                                 // long: can exceed int range
    for (int x : nums) {
        pairs += seen.getOrDefault(k - x, 0);       // every earlier partner makes a pair
        seen.merge(x, 1, Integer::sum);             // record x only AFTER the lookup
    }
    return pairs;
}
~~~

Java details worth naming while you type:

- **\`getOrDefault\` and \`merge\`.** \`seen.get(missing)\` returns \`null\`, and unboxing \`null\` into an \`int\` throws \`NullPointerException\`. \`getOrDefault(key, 0)\` avoids that; \`merge(x, 1, Integer::sum)\` inserts 1 or adds 1 in one call.
- **Overflow.** \`int\` holds up to 2,147,483,647. Example 2 counts 4,999,950,000 pairs in 100,000 zeros; stored in an \`int\` that value becomes 704,982,704 with no error. Use \`long\` for counts and for products such as \`x * 48271\`.
- **Boxing.** \`HashMap<Integer, Integer>\` stores \`Integer\` objects, not \`int\`s. It is still O(1) on average but has a constant cost; mention it if the interviewer asks about performance.
- **\`==\` on \`Integer\`.** Small values are cached, so \`Integer a = 127, b = 127; a == b\` is \`true\`, but with 128 it is \`false\` (checked on OpenJDK 21). Compare boxed values with \`equals\`.
- Prefer \`ArrayDeque\` for stacks and queues and \`StringBuilder\` for building strings in loops.

## 8. Step 6 — Test: Dry Run, Edge Cases, Then a Stress Test

Testing in an interview has three levels. Do the first two every time; mention the third.

1. **Dry run** one small example by hand. For \`[1, 5, 7, -1, 5]\`, k = 6, write the map after each element: after 1: {1:1}; at 5, k-5 = 1 is in the map once, pairs = 1; at 7, k-7 = -1 is absent; at -1, k-(-1) = 7 is present once, pairs = 2; at the last 5, 1 is present once, pairs = 3. ✔
2. **Edge cases** from Step 1: empty list, one element, all duplicates, negatives.
3. **Stress test**: compare the fast solution with the brute force on hundreds of small random inputs. This is how you would test it at work, and Example 2 shows it catching a real bug: recording \`x\` in the map *before* looking up \`k - x\` lets an element pair with itself when 2x = k.

📌 **Interview term: Stress test** — automatically comparing an optimised solution with a simple, trusted one on many random inputs, so any difference reveals a bug.

## 9. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`javac Main.java && java Main\`; the blocks are the exact standard output.

**Example 1 — brute force and hash map on the same inputs, with a step counter**

~~~text
[1, 5, 7, -1, 5] k=6 -> brute=3 fast=3 | steps 10 vs 5
[] k=4 -> brute=0 fast=0 | steps 0 vs 0
[3] k=6 -> brute=0 fast=0 | steps 0 vs 1
[3, 3, 3] k=6 -> brute=3 fast=3 | steps 3 vs 3
[2, 2, 2, 2] k=4 -> brute=6 fast=6 | steps 6 vs 4
[-2, 0, 2] k=0 -> brute=1 fast=1 | steps 3 vs 3
n=2000 k=0 -> brute=94445 fast=94445 | steps 1999000 vs 2000
~~~

**Example 2 — a stress test that catches a real bug, and the overflow check**

~~~text
fast:       ok, 300 random tests passed
fast_buggy: FAIL nums=[0, -1] k=-2 expected 0 got 1
pairs in 100000 zeros: 4999950000 (a 32-bit int would hold 704982704)
~~~

**What the numbers show:** the step counts are the point of Example 1: for n = 2000 the brute force made 1,999,000 comparisons and the hash map version 2,000 lookups, and both returned 94,445. Example 2 shows why you test against the brute force: the buggy version passes the hand-picked examples but fails on \`[0, -1]\` with k = -2, where -1 pairs with itself.

## 10. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | n(n-1)/2 pairs checked; only counters stored |
| Hash map | O(n) average | O(n) | one lookup and one update per element; the map holds up to n distinct values |
| Hash map, worst case | O(n²) | O(n) | only if many keys collide in the hash table, which is rare for integers |

The measured step counts in Example 1 match the table: 1,999,000 checks against 2,000 lookups for n = 2000, which is exactly n(n-1)/2 against n.

## 11. Common Pitfalls

- **Coding before clarifying.** If you assume "values are distinct", \`[3, 3, 3]\` breaks your answer later and you lose more time than the question would have cost.
- **Updating the map before the lookup.** It lets x pair with itself when 2x == k; Example 2 shows the stress test catching exactly this.
- **\`int\` for a count that can reach n²/2.** It wraps silently. Example 2 shows 4999950000 becoming 704982704.
- **\`map.get(key) + 1\` for a new key.** \`get\` returns \`null\`, and unboxing it throws \`NullPointerException\`. Use \`getOrDefault\` or \`merge\`.
- **Comparing \`Integer\` or \`Long\` with \`==\`.** It compares references and only appears to work for small cached values. Example 2 compares \`Long\` results with \`equals\` for this reason.
- **Never stating complexity.** Say time and space for the brute force and for the final answer, without being asked.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The shape:</strong> <span style="color:#f0e2c8;">I use six steps: clarify, work examples by hand, state the brute force and its cost, optimise the bottleneck, code, and test.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Clarify first:</strong> <span style="color:#f0e2c8;">I ask about input size, duplicates, negatives, empty input and output format, because each one can change the algorithm.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Brute force then optimise:</strong> <span style="color:#f0e2c8;">I say the O(n²) version out loud, then ask what work it repeats; here it is searching for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k - x</code>, so a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> makes it O(n) time and O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code in Java:</strong> <span style="color:#f0e2c8;">I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getOrDefault</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">merge</code>, return a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> because the count can pass 2³¹, and look up before I record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> so an element never pairs with itself.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test:</strong> <span style="color:#f0e2c8;">I dry run a small example, then try empty, single element and duplicates, and mention a stress test against the brute force.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you cannot find the optimal solution?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Code the brute force cleanly, state its complexity, and explain where the bottleneck is. A working O(n²) answer with a clear explanation beats unfinished O(n) code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">n equal values give n(n-1)/2 pairs. For n = 100,000 that is 4,999,950,000, more than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code>; an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> would wrap to 704,982,704 without any error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does boxing in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap&lt;Integer, Integer&gt;</code> change the complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, operations stay O(1) on average, but each entry is an object, so it is slower and uses more memory than a primitive array. If values are in a small range, an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> of counts is faster.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know which complexity is fast enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From the constraints. A rough budget is around 10⁸ simple operations, so n = 10⁵ needs O(n log n) or better, while n = 1,000 allows O(n²).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test this beyond a few examples?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write a stress test: random small arrays, compare the fast method with the brute force, and print the first input where they differ.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Clarifying questions** | Questions asked before solving to pin down input, limits and output |
| **Constraints** | Given limits on input size and values; they set the speed you need |
| **Edge case** | A boundary input (empty, one item, duplicates) where code often breaks |
| **Brute force** | The simplest correct solution, usually trying everything |
| **Time complexity** | How running time grows with input size, in Big-O |
| **Bottleneck** | The part of a solution doing most of the work |
| **Space-time trade-off** | Spending memory to save time, or the reverse |
| **Dry run** | Tracing code by hand on a small input |
| **Stress test** | Comparing a fast solution with a brute force on many random inputs |
| **Autoboxing** | Java converting an int to an Integer object automatically, as when it goes into a HashMap |

---
**Conclusion:** A good interview answer is a process you can repeat: clarify the input, work examples by hand, state the brute force with its cost, find the bottleneck and remove it, code it in clear Java, and test with a dry run and edge cases. On the pair-counting problem that process took us from n(n-1)/2 checks to n \`HashMap\` lookups, and the stress test in Example 2 caught the bug the obvious "optimised" version contains. In Java the same process also catches the two silent killers, an \`int\` that overflows and a \`null\` that is unboxed, before the interviewer does.`,
        examples: [
          {
            label: "Brute force vs hash map, with a step counter",
            code: `import java.util.*;

public class Main {
    // Count pairs (i < j) with nums[i] + nums[j] == k.
    // Returns {pairs, steps}. long, because pair counts grow like n*n/2 and overflow int.
    static long[] countPairsBrute(int[] nums, int k) {
        long pairs = 0, steps = 0;
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                steps++;                                     // one comparison
                if (nums[i] + nums[j] == k) pairs++;
            }
        }
        return new long[]{pairs, steps};
    }

    static long[] countPairsFast(int[] nums, int k) {
        Map<Integer, Integer> seen = new HashMap<>();        // value -> times seen so far
        long pairs = 0, steps = 0;
        for (int x : nums) {
            steps++;                                         // one lookup + one update
            pairs += seen.getOrDefault(k - x, 0);            // every earlier partner makes a pair
            seen.merge(x, 1, Integer::sum);
        }
        return new long[]{pairs, steps};
    }

    static String fmt(int[] nums) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < nums.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append(nums[i]);
        }
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        int[][] inputs = {{1, 5, 7, -1, 5}, {}, {3}, {3, 3, 3}, {2, 2, 2, 2}, {-2, 0, 2}};
        int[] ks = {6, 4, 6, 6, 4, 0};
        for (int t = 0; t < inputs.length; t++) {
            long[] b = countPairsBrute(inputs[t], ks[t]);
            long[] f = countPairsFast(inputs[t], ks[t]);
            System.out.println(fmt(inputs[t]) + " k=" + ks[t] + " -> brute=" + b[0] + " fast=" + f[0]
                    + " | steps " + b[1] + " vs " + f[1]);
        }

        // A bigger input from a tiny deterministic generator (same numbers in every language).
        long x = 7;
        int[] big = new int[2000];
        for (int i = 0; i < big.length; i++) {
            x = x * 48271 % 2147483647L;                     // long: the product exceeds int range
            big[i] = (int) (x % 21) - 10;                     // values in -10..10
        }
        long[] b = countPairsBrute(big, 0);
        long[] f = countPairsFast(big, 0);
        System.out.println("n=2000 k=0 -> brute=" + b[0] + " fast=" + f[0] + " | steps " + b[1] + " vs " + f[1]);
    }
}`,
          },
          {
            label: "Stress test against the brute force, and an overflow check",
            code: `import java.util.*;
import java.util.function.BiFunction;

public class Main {
    // Step 6 of the framework: test. A stress test compares the fast answer with
    // the brute force on hundreds of small random inputs, and catches a real bug.

    static long brute(int[] nums, int k) {
        long c = 0;
        for (int i = 0; i < nums.length; i++)
            for (int j = i + 1; j < nums.length; j++) if (nums[i] + nums[j] == k) c++;
        return c;
    }

    static long fast(int[] nums, int k) {
        Map<Integer, Integer> seen = new HashMap<>();
        long pairs = 0;
        for (int x : nums) {
            pairs += seen.getOrDefault(k - x, 0);   // look up partners first...
            seen.merge(x, 1, Integer::sum);         // ...then record x
        }
        return pairs;
    }

    static long fastBuggy(int[] nums, int k) {
        Map<Integer, Integer> seen = new HashMap<>();
        long pairs = 0;
        for (int x : nums) {
            seen.merge(x, 1, Integer::sum);         // BUG: x is recorded before the lookup,
            pairs += seen.getOrDefault(k - x, 0);   // so x pairs with itself when 2 * x == k
        }
        return pairs;
    }

    static long state = 12345;
    static int rand(int n) {                        // deterministic generator, same in every language
        state = state * 48271 % 2147483647L;
        return (int) (state % n);
    }

    static String stress(BiFunction<int[], Integer, Long> solution, int rounds) {
        for (int r = 0; r < rounds; r++) {
            int[] nums = new int[rand(10)];
            for (int i = 0; i < nums.length; i++) nums[i] = rand(7) - 3;
            int k = rand(7) - 3;
            if (!solution.apply(nums, k).equals(brute(nums, k))) {   // Long objects: equals, not ==
                StringJoiner sj = new StringJoiner(", ", "[", "]");
                for (int v : nums) sj.add(String.valueOf(v));
                return "FAIL nums=" + sj + " k=" + k + " expected " + brute(nums, k) + " got " + solution.apply(nums, k);
            }
        }
        return "ok, " + rounds + " random tests passed";
    }

    public static void main(String[] args) {
        System.out.println("fast:       " + stress(Main::fast, 300));
        System.out.println("fast_buggy: " + stress(Main::fastBuggy, 300));

        // Overflow check: 100000 zeros with k = 0 gives n * (n - 1) / 2 pairs.
        int n = 100000;
        long total = fast(new int[n], 0);
        int wrapped = (int) total;                  // what a 32-bit int would hold
        System.out.println("pairs in 100000 zeros: " + total + " (a 32-bit int would hold " + wrapped + ")");
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Before we start the coding part: walk me through how you approach a data-structures problem you have not seen before. Then show me on a small problem — count the pairs in a list that add up to a target — and write it in C++."

**What a strong answer should cover:**
- A clear, repeatable sequence: clarify, examples, brute force, optimise, code, test — and talking through each step.
- Clarifying questions that change the algorithm (input size, duplicates, negatives, empty input, output format).
- Stating the brute force and its complexity before optimising, then naming the bottleneck and the data structure that removes it.
- The space-time trade-off of the optimised version (O(n) time for O(n) extra memory).
- Testing: a dry run, edge cases, and how a stress test against the brute force would catch bugs.
- C++ specifics: \`std::unordered_map\` with \`find\` (because \`operator[]\` inserts a missing key), \`long long\` for counts that can exceed 2³¹ − 1 (signed overflow is undefined behaviour), and passing containers by \`const&\`.

**Clarifying questions expected:**
- "How large can the input be, and can values repeat or be negative?"
- "Do you want the number of pairs, or the pairs themselves?"

**Code / implementation expected:** Yes — a brute force and an O(n) solution in C++17 using \`std::unordered_map\`, with a \`main\` that runs a few tests.`,
        answer: `**Target Audience:** Anyone preparing for their first coding interviews — no prior algorithms knowledge assumed.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`g++ -std=c++17 main.cpp && ./a.out\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A plumber is called to a flat with water on the floor. A bad plumber starts ripping out pipes straight away. A good one asks three questions first (where is the water, since when, is it hot or cold), looks at the obvious cause, fixes it the simple way if that is good enough, and then turns the tap on again to check. Both plumbers might end up replacing the same pipe, but only one of them can explain why, and only one of them is still trusted when the first guess is wrong.

A coding interview works the same way. The interviewer is not only checking whether you reach the right code; they are watching **how** you get there, because that is what working with you will feel like. A candidate who silently writes a perfect answer gets less credit than you might expect, and a candidate who talks through a clear process, finds a bug in testing and fixes it often does well. A repeatable method also protects you from panic: when you do not know the trick yet, you still know the next step.

## 2. The Six-Step Method at a Glance

The steps below are one common way to structure the time. Interview guides use different names for them, but almost all contain the same pieces.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="The six steps in order: clarify, examples, brute force, optimise, code, test">
  <defs>
    <marker id="b02q1-cpp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="120" y="72" text-anchor="middle">1. Clarify</text>
  <text class="d-sub" x="120" y="98" text-anchor="middle">inputs, limits, output</text>
  <path class="d-edge" d="M 214 80 L 264 80" marker-end="url(#b02q1-cpp-arrow)"/>
  <rect class="d-box-muted" x="270" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="360" y="72" text-anchor="middle">2. Examples</text>
  <text class="d-sub" x="360" y="98" text-anchor="middle">normal and edge cases</text>
  <path class="d-edge" d="M 454 80 L 504 80" marker-end="url(#b02q1-cpp-arrow)"/>
  <rect class="d-box-muted" x="510" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="600" y="72" text-anchor="middle">3. Brute force</text>
  <text class="d-sub" x="600" y="98" text-anchor="middle">say it, state its cost</text>
  <path class="d-edge" d="M 600 124 L 600 184" marker-end="url(#b02q1-cpp-arrow)"/>
  <rect class="d-box-accent" x="510" y="190" width="180" height="80" rx="10"/>
  <text class="d-text d-accent" x="600" y="222" text-anchor="middle">4. Optimise</text>
  <text class="d-sub" x="600" y="248" text-anchor="middle">remove the bottleneck</text>
  <path class="d-edge" d="M 506 230 L 456 230" marker-end="url(#b02q1-cpp-arrow)"/>
  <rect class="d-box-muted" x="270" y="190" width="180" height="80" rx="10"/>
  <text class="d-text" x="360" y="222" text-anchor="middle">5. Code</text>
  <text class="d-sub" x="360" y="248" text-anchor="middle">talk while you type</text>
  <path class="d-edge" d="M 266 230 L 216 230" marker-end="url(#b02q1-cpp-arrow)"/>
  <rect class="d-box-muted" x="30" y="190" width="180" height="80" rx="10"/>
  <text class="d-text" x="120" y="222" text-anchor="middle">6. Test</text>
  <text class="d-sub" x="120" y="248" text-anchor="middle">dry run, edge cases</text>
</svg>

Steps 1 to 4 happen before you write real code. They usually take a third or more of the time, and that is fine: an interviewer would rather see a correct plan written in five minutes than wrong code written in two.

📌 **Interview term: Clarifying questions** — questions you ask before solving, to pin down the input, the limits and the expected output. They show you do not assume.

📌 **Interview term: Brute force** — the simplest correct solution, usually trying every possibility. It is slow, but it proves you understand the problem and gives you something to improve.

📌 **Interview term: Time complexity** — how the running time grows as the input grows, written in Big-O (for example O(n²)). If Big-O is new to you, read [What is Big-O notation?](/interview-question/what-is-big-o-notation) first.

📌 **Interview term: Bottleneck** — the part of a solution that does most of the work. Optimising means finding it and making it cheaper.

📌 **Interview term: Dry run** — stepping through your code by hand with a small input, writing down the variables, to find bugs before (or without) running it.

## 3. Step 1 — Clarify: Questions to Ask Your Interviewer First

We will use one problem for the whole doc: **"Given a list of integers \`nums\` and a target \`k\`, count the pairs of positions i < j with nums[i] + nums[j] == k."** Here is what a strong candidate asks before writing anything:

| Question | Why it matters here |
| :--- | :--- |
| How large can the list be? | 1,000 items allows O(n²); 100,000 items needs about O(n) or O(n log n) |
| Can values repeat? | With \`[3, 3, 3]\` and k = 6 the answer is 3 pairs, not 1; duplicates change the algorithm |
| Can values be negative or zero? | Rules out tricks that only work for positive numbers |
| Do you want the count, or the pairs themselves? | Listing the pairs can take O(n²) output on its own |
| Can an element pair with itself? | Usually no (i < j), and the code must respect that |
| What should an empty list return? | 0, and the code must not crash on it |

You do not need all of these every time. Pick the ones that change your algorithm, ask them in one or two sentences, and write the answers down where the interviewer can see them.

📌 **Interview term: Constraints** — the limits on input size and values given in the problem (for example "n ≤ 10⁵"). They tell you how fast the solution must be.

A common rule of thumb (an estimate, not a law) assumes a judge or interviewer expects roughly 10⁸ simple operations per second at most:

| Input size n | Usually acceptable complexity |
| :--- | :--- |
| up to about 20 | O(2ⁿ), trying all subsets |
| up to about 1,000 | O(n²) |
| up to about 10⁵ to 10⁶ | O(n log n) or O(n) |
| larger, or many queries | O(log n) or O(1) per query |

## 4. Step 2 — Work Through Examples by Hand

Write two or three small inputs and their answers before coding. Include at least one normal case and the edge cases from your questions:

- \`[1, 5, 7, -1, 5]\`, k = 6 → 3 pairs: (1, 5), (1, 5) using the second 5, and (7, -1)
- \`[3, 3, 3]\`, k = 6 → 3 pairs, because positions (0,1), (0,2) and (1,2) all work
- \`[]\` → 0, and \`[3]\` with k = 6 → 0, because one element cannot pair with itself

Doing this by hand often reveals the algorithm. Here, noticing that each new 5 pairs with **every earlier** 1 is the whole idea of the fast solution.

📌 **Interview term: Edge case** — an input at the boundary of what is allowed (empty, one element, all equal, negative, maximum size) where code most often breaks.

## 5. Step 3 — State the Brute Force, Then Its Cost

Say it in one sentence: "Check every pair i < j and count the ones that add up to k." There are n(n-1)/2 pairs, so this is **O(n²) time and O(1) extra space**. Say the cost out loud even if you will not code it; it gives the interviewer a baseline and buys you time to think.

## 6. Step 4 — Optimise: Find the Bottleneck

Ask: *what work does the brute force repeat?* For every \`nums[j]\` it scans all earlier elements looking for one value: \`k - nums[j]\`. "Search for a value again and again" is the signal for a hash map, which answers "how many times have I seen value v?" in O(1) on average (see [How does a hash table work?](/interview-question/how-does-a-hash-table-work)).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Brute force checks every pair; the optimised version replaces the inner loop with one map lookup">
  <defs>
    <marker id="b02q1b-cpp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="230" height="170" rx="10"/>
  <text class="d-text" x="145" y="62" text-anchor="middle">Brute force</text>
  <text class="d-sub" x="145" y="94" text-anchor="middle">for each i</text>
  <text class="d-sub" x="145" y="118" text-anchor="middle">for each j after i</text>
  <text class="d-sub" x="145" y="142" text-anchor="middle">check the sum</text>
  <text class="d-text" x="145" y="178" text-anchor="middle">n(n-1)/2 checks</text>
  <path class="d-edge-accent" d="M 270 115 L 450 115" marker-end="url(#b02q1b-cpp-arrow)"/>
  <text class="d-sub" x="360" y="96" text-anchor="middle">inner loop</text>
  <text class="d-sub" x="360" y="142" text-anchor="middle">becomes a lookup</text>
  <rect class="d-box-accent" x="460" y="30" width="230" height="170" rx="10"/>
  <text class="d-text d-accent" x="575" y="62" text-anchor="middle">Optimised</text>
  <text class="d-sub" x="575" y="94" text-anchor="middle">for each x</text>
  <text class="d-sub" x="575" y="118" text-anchor="middle">add count of k minus x</text>
  <text class="d-sub" x="575" y="142" text-anchor="middle">then record x</text>
  <text class="d-text" x="575" y="178" text-anchor="middle">n lookups</text>
</svg>

The inner loop disappears: one pass, one lookup and one update per element, so **O(n) time and O(n) extra space**. Notice the trade: we bought speed with memory. Saying that trade-off out loud is part of a strong answer.

Useful questions when you are stuck on the optimisation:

- Am I searching for something repeatedly? → hash map or set, or sort plus [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements)
- Is the input sorted, or would sorting help? → [two pointers](/interview-question/what-is-the-two-pointer-technique)
- Am I recomputing sums of ranges? → [prefix sums](/interview-question/what-is-the-prefix-sum-technique)
- Am I looking at a contiguous range that grows and shrinks? → [sliding window](/interview-question/what-is-the-sliding-window-technique)
- Am I solving the same smaller problem many times? → [dynamic programming](/interview-question/what-is-dynamic-programming)

📌 **Interview term: Space-time trade-off** — using extra memory (here a hash map) to make a solution faster, or accepting a slower solution to save memory.

## 7. Step 5 — Code It in C++

Write the function signature first, say what each variable means, and use the standard library where it is clearer.

~~~cpp
long long countPairsFast(const std::vector<int>& nums, int k) {
    std::unordered_map<int, long long> seen;      // value -> times seen so far
    long long pairs = 0;                          // 64-bit: can exceed int range
    for (int x : nums) {
        auto it = seen.find(k - x);               // find() does not insert
        if (it != seen.end()) pairs += it->second;
        seen[x]++;                                // record x only AFTER the lookup
    }
    return pairs;
}
~~~

C++ details worth naming while you type:

- **\`find\` versus \`operator[]\`.** \`seen[k - x]\` would *insert* a zero entry for every missing key, growing the map with junk. Use \`find\` (or \`count\`, or \`contains\` from C++20) to look without inserting; \`seen[x]++\` is fine when you do want to insert.
- **Overflow.** A 32-bit \`int\` holds up to 2,147,483,647, and signed overflow is undefined behaviour in C++, so the compiler may assume it never happens. Use \`long long\` for counts and for products such as \`x * 48271\`.
- **Pass by \`const&\`.** \`const std::vector<int>& nums\` avoids copying the whole input on every call.
- **Unsigned sizes.** \`v.size()\` is unsigned, so \`v.size() - 1\` on an empty vector is 18446744073709551615, not -1 (checked with g++ 13). Write \`i + 1 < v.size()\` instead of \`i < v.size() - 1\`.
- If memory or speed matters and values are in a small range, a \`std::vector<int>\` of counts beats a hash map.

## 8. Step 6 — Test: Dry Run, Edge Cases, Then a Stress Test

Testing in an interview has three levels. Do the first two every time; mention the third.

1. **Dry run** one small example by hand. For \`[1, 5, 7, -1, 5]\`, k = 6, write the map after each element: after 1: {1:1}; at 5, k-5 = 1 is in the map once, pairs = 1; at 7, k-7 = -1 is absent; at -1, k-(-1) = 7 is present once, pairs = 2; at the last 5, 1 is present once, pairs = 3. ✔
2. **Edge cases** from Step 1: empty list, one element, all duplicates, negatives.
3. **Stress test**: compare the fast solution with the brute force on hundreds of small random inputs. This is how you would test it at work, and Example 2 shows it catching a real bug: recording \`x\` in the map *before* looking up \`k - x\` lets an element pair with itself when 2x = k.

📌 **Interview term: Stress test** — automatically comparing an optimised solution with a simple, trusted one on many random inputs, so any difference reveals a bug.

## 9. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`g++ -std=c++17 main.cpp && ./a.out\`; the blocks are the exact standard output.

**Example 1 — brute force and hash map on the same inputs, with a step counter**

~~~text
[1, 5, 7, -1, 5] k=6 -> brute=3 fast=3 | steps 10 vs 5
[] k=4 -> brute=0 fast=0 | steps 0 vs 0
[3] k=6 -> brute=0 fast=0 | steps 0 vs 1
[3, 3, 3] k=6 -> brute=3 fast=3 | steps 3 vs 3
[2, 2, 2, 2] k=4 -> brute=6 fast=6 | steps 6 vs 4
[-2, 0, 2] k=0 -> brute=1 fast=1 | steps 3 vs 3
n=2000 k=0 -> brute=94445 fast=94445 | steps 1999000 vs 2000
~~~

**Example 2 — a stress test that catches a real bug, and the overflow check**

~~~text
fast:       ok, 300 random tests passed
fast_buggy: FAIL nums=[0, -1] k=-2 expected 0 got 1
pairs in 100000 zeros: 4999950000 (a 32-bit int would hold 704982704)
~~~

**What the numbers show:** the step counts are the point of Example 1: for n = 2000 the brute force made 1,999,000 comparisons and the hash map version 2,000 lookups, and both returned 94,445. Example 2 shows why you test against the brute force: the buggy version passes the hand-picked examples but fails on \`[0, -1]\` with k = -2, where -1 pairs with itself.

## 10. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | n(n-1)/2 pairs checked; only counters stored |
| Hash map | O(n) average | O(n) | one lookup and one update per element; the map holds up to n distinct values |
| Hash map, worst case | O(n²) | O(n) | only if many keys collide in the hash table, which is rare for integers |

The measured step counts in Example 1 match the table: 1,999,000 checks against 2,000 lookups for n = 2000, which is exactly n(n-1)/2 against n.

## 11. Common Pitfalls

- **Coding before clarifying.** If you assume "values are distinct", \`[3, 3, 3]\` breaks your answer later and you lose more time than the question would have cost.
- **Updating the map before the lookup.** It lets x pair with itself when 2x == k; Example 2 shows the stress test catching exactly this.
- **\`int\` for a count that can reach n²/2.** Signed overflow is undefined behaviour; use \`long long\`. Example 2 shows the value 4999950000 does not fit in 32 bits.
- **\`map[key]\` used only to read.** It inserts the key with a default value, so the map grows and \`size()\` lies. Use \`find\`.
- **\`i < v.size() - 1\` with an empty vector.** The unsigned subtraction wraps around to a huge number and the loop reads out of bounds.
- **Passing big containers by value.** Each call copies the vector, which adds O(n) to every call.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The shape:</strong> <span style="color:#f0e2c8;">I use six steps: clarify, work examples by hand, state the brute force and its cost, optimise the bottleneck, code, and test.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Clarify first:</strong> <span style="color:#f0e2c8;">I ask about input size, duplicates, negatives, empty input and output format, because each one can change the algorithm.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Brute force then optimise:</strong> <span style="color:#f0e2c8;">I say the O(n²) version out loud, then ask what work it repeats; here it is searching for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k - x</code>, so an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> makes it O(n) time and O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Code in C++:</strong> <span style="color:#f0e2c8;">I pass the vector by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code>, look up with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> so I do not insert, count in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>, and look up before I record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Test:</strong> <span style="color:#f0e2c8;">I dry run a small example, then try empty, single element and duplicates, and mention a stress test against the brute force.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you cannot find the optimal solution?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Code the brute force cleanly, state its complexity, and explain where the bottleneck is. A working O(n²) answer with a clear explanation beats unfinished O(n) code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">find</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">seen[k - x]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> inserts a default-constructed value for a missing key. The answer would still be right here, but the map would fill with useless zero entries and use more memory.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long long</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">n equal values give n(n-1)/2 pairs, about 5 × 10⁹ for n = 100,000, which does not fit in a 32-bit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>; signed overflow is undefined behaviour, so it is a correctness bug, not just a wrong number.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::map</code> work instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, but it is a balanced tree with O(log n) operations, so the whole solution becomes O(n log n). Use it when you need keys in sorted order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test this beyond a few examples?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write a stress test: random small vectors, compare the fast function with the brute force, and print the first input where they differ.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Clarifying questions** | Questions asked before solving to pin down input, limits and output |
| **Constraints** | Given limits on input size and values; they set the speed you need |
| **Edge case** | A boundary input (empty, one item, duplicates) where code often breaks |
| **Brute force** | The simplest correct solution, usually trying everything |
| **Time complexity** | How running time grows with input size, in Big-O |
| **Bottleneck** | The part of a solution doing most of the work |
| **Space-time trade-off** | Spending memory to save time, or the reverse |
| **Dry run** | Tracing code by hand on a small input |
| **Stress test** | Comparing a fast solution with a brute force on many random inputs |
| **Undefined behaviour** | C++ code the standard gives no meaning to, such as signed int overflow; anything may happen |

---
**Conclusion:** A good interview answer is a process you can repeat: clarify the input, work examples by hand, state the brute force with its cost, find the bottleneck and remove it, code it in clear C++, and test with a dry run and edge cases. On the pair-counting problem that process took us from n(n-1)/2 checks to n \`unordered_map\` lookups, and the stress test in Example 2 caught the bug the obvious "optimised" version contains. In C++ the same discipline also catches the language traps, \`operator[]\` inserting, signed overflow and unsigned sizes, before they cost you the interview.`,
        examples: [
          {
            label: "Brute force vs hash map, with a step counter",
            code: `#include <iostream>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

// Count pairs (i < j) with nums[i] + nums[j] == k. Returns {pairs, steps}.
// long long, because pair counts grow like n*n/2 and overflow a 32-bit int.
std::pair<long long, long long> countPairsBrute(const std::vector<int>& nums, int k) {
    long long pairs = 0, steps = 0;
    for (size_t i = 0; i < nums.size(); i++) {
        for (size_t j = i + 1; j < nums.size(); j++) {
            steps++;                                         // one comparison
            if (nums[i] + nums[j] == k) pairs++;
        }
    }
    return {pairs, steps};
}

std::pair<long long, long long> countPairsFast(const std::vector<int>& nums, int k) {
    std::unordered_map<int, int> seen;                       // value -> times seen so far
    long long pairs = 0, steps = 0;
    for (int x : nums) {
        steps++;                                             // one lookup + one update
        auto it = seen.find(k - x);                          // find() does not insert; seen[k - x] would
        if (it != seen.end()) pairs += it->second;
        seen[x]++;
    }
    return {pairs, steps};
}

std::string fmt(const std::vector<int>& nums) {
    std::string s = "[";
    for (size_t i = 0; i < nums.size(); i++) {
        if (i > 0) s += ", ";
        s += std::to_string(nums[i]);
    }
    return s + "]";
}

int main() {
    std::vector<std::pair<std::vector<int>, int>> tests = {
        {{1, 5, 7, -1, 5}, 6}, {{}, 4}, {{3}, 6}, {{3, 3, 3}, 6}, {{2, 2, 2, 2}, 4}, {{-2, 0, 2}, 0}};
    for (const auto& [nums, k] : tests) {
        auto [b, bs] = countPairsBrute(nums, k);
        auto [f, fs] = countPairsFast(nums, k);
        std::cout << fmt(nums) << " k=" << k << " -> brute=" << b << " fast=" << f
                  << " | steps " << bs << " vs " << fs << "\\n";
    }

    // A bigger input from a tiny deterministic generator (same numbers in every language).
    long long x = 7;
    std::vector<int> big;
    for (int i = 0; i < 2000; i++) {
        x = x * 48271 % 2147483647LL;                        // 64-bit: the product exceeds int range
        big.push_back(static_cast<int>(x % 21) - 10);        // values in -10..10
    }
    auto [b, bs] = countPairsBrute(big, 0);
    auto [f, fs] = countPairsFast(big, 0);
    std::cout << "n=2000 k=0 -> brute=" << b << " fast=" << f << " | steps " << bs << " vs " << fs << "\\n";
}`,
          },
          {
            label: "Stress test against the brute force, and an overflow check",
            code: `#include <cstdint>
#include <functional>
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

// Step 6 of the framework: test. A stress test compares the fast answer with
// the brute force on hundreds of small random inputs, and catches a real bug.

long long brute(const std::vector<int>& nums, int k) {
    long long c = 0;
    for (size_t i = 0; i < nums.size(); i++)
        for (size_t j = i + 1; j < nums.size(); j++) if (nums[i] + nums[j] == k) c++;
    return c;
}

long long fast(const std::vector<int>& nums, int k) {
    std::unordered_map<int, long long> seen;
    long long pairs = 0;
    for (int x : nums) {
        auto it = seen.find(k - x);                 // look up partners first...
        if (it != seen.end()) pairs += it->second;
        seen[x]++;                                  // ...then record x
    }
    return pairs;
}

long long fastBuggy(const std::vector<int>& nums, int k) {
    std::unordered_map<int, long long> seen;
    long long pairs = 0;
    for (int x : nums) {
        seen[x]++;                                  // BUG: x is recorded before the lookup,
        auto it = seen.find(k - x);                 // so x pairs with itself when 2 * x == k
        if (it != seen.end()) pairs += it->second;
    }
    return pairs;
}

long long state = 12345;
int rand_(int n) {                                  // deterministic generator, same in every language
    state = state * 48271 % 2147483647LL;
    return static_cast<int>(state % n);
}

std::string stress(const std::function<long long(const std::vector<int>&, int)>& solution, int rounds) {
    for (int r = 0; r < rounds; r++) {
        std::vector<int> nums(rand_(10));
        for (auto& v : nums) v = rand_(7) - 3;
        int k = rand_(7) - 3;
        if (solution(nums, k) != brute(nums, k)) {
            std::string s = "[";
            for (size_t i = 0; i < nums.size(); i++) s += (i ? ", " : "") + std::to_string(nums[i]);
            return "FAIL nums=" + s + "] k=" + std::to_string(k) + " expected " + std::to_string(brute(nums, k)) +
                   " got " + std::to_string(solution(nums, k));
        }
    }
    return "ok, " + std::to_string(rounds) + " random tests passed";
}

int main() {
    std::cout << "fast:       " << stress(fast, 300) << "\\n";
    std::cout << "fast_buggy: " << stress(fastBuggy, 300) << "\\n";

    // Overflow check: 100000 zeros with k = 0 gives n * (n - 1) / 2 pairs.
    int n = 100000;
    long long total = fast(std::vector<int>(n, 0), 0);
    auto wrapped = static_cast<std::int32_t>(total);  // what a 32-bit int would hold (wraps since C++20; implementation-defined before)
    std::cout << "pairs in 100000 zeros: " << total << " (a 32-bit int would hold " << wrapped << ")\\n";
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between an array and a linked list?",
    difficulty: "easy",
    seoDescription: "Arrays vs linked lists: contiguous memory and O(1) indexing vs nodes and O(1) relinking, with counted costs in Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Explain the difference between an array and a linked list. When would you pick one over the other, and what does each look like in Python? If there is time, sketch a small linked list in Python."

**What a strong answer should cover:**
- Memory layout: one contiguous block versus separate nodes joined by references.
- Costs: O(1) indexing versus O(n) walking; O(n) front inserts versus O(1) relinking at a node you already hold (and that finding the node is still O(n)).
- Dynamic arrays and amortized O(1) appends; the extra memory per node in a linked list.
- Cache locality as the practical reason arrays usually win.
- Python specifics: \`list\` is a dynamic array (of references), the standard library has no linked list class, and \`collections.deque\` is the tool for O(1) work at both ends.

**Code / implementation expected:** Optional — a small \`Node\` class with insert, delete and traversal in Python is a common follow-up.`,
        answer: `**Target Audience:** Beginners learning data structures — no prior knowledge assumed.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`python3 main.py\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture two ways of storing a class's homework. In the first, every notebook goes into a row of numbered lockers, side by side: if you want notebook number 37, you walk straight to locker 37. But if a new student must go in at locker 1, everyone in lockers 1 to 40 has to move one locker to the right.

In the second, the notebooks are spread all over the school, and each one has a sticky note saying where the next one is. Adding a new first notebook is easy: write a sticky note pointing to the old first one, and you are done. But to find notebook 37 you must follow 36 sticky notes, one after another.

The lockers are an **array**. The sticky-note trail is a **linked list**. Neither is better; each makes a different operation cheap. The interview question is really: *which operation does your program do most, and which structure makes that operation cheap?*

## 2. The Array: One Block, Instant Indexing

An array stores its items **next to each other** in one block of memory. Because every slot has the same size, the computer can compute where item i lives with one multiplication: \`address = start + i × size\`. That is why reading \`a[i]\` takes the same time for i = 0 or i = 1,000,000.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="An array stores its items next to each other, so the address of item i is the start plus i times the item size">
  <text class="d-text" x="360" y="30" text-anchor="middle">Array: one block of memory</text>
  <rect class="d-box-accent" x="85" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="140" y="96" text-anchor="middle">10</text>
  <rect class="d-box" x="195" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="250" y="96" text-anchor="middle">20</text>
  <rect class="d-box" x="305" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="360" y="96" text-anchor="middle">30</text>
  <rect class="d-box" x="415" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="470" y="96" text-anchor="middle">40</text>
  <rect class="d-box" x="525" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="580" y="96" text-anchor="middle">50</text>
  <text class="d-sub" x="140" y="146" text-anchor="middle">index 0</text>
  <text class="d-sub" x="250" y="146" text-anchor="middle">index 1</text>
  <text class="d-sub" x="360" y="146" text-anchor="middle">index 2</text>
  <text class="d-sub" x="470" y="146" text-anchor="middle">index 3</text>
  <text class="d-sub" x="580" y="146" text-anchor="middle">index 4</text>
  <text class="d-sub" x="140" y="174" text-anchor="middle">addr 1000</text>
  <text class="d-sub" x="250" y="174" text-anchor="middle">addr 1004</text>
  <text class="d-sub" x="360" y="174" text-anchor="middle">addr 1008</text>
  <text class="d-sub" x="470" y="174" text-anchor="middle">addr 1012</text>
  <text class="d-sub" x="580" y="174" text-anchor="middle">addr 1016</text>
</svg>

With 4-byte integers, item 3 lives at 1000 + 3 × 4 = 1012; no searching is involved.

📌 **Interview term: Contiguous memory** — stored in one unbroken block, item after item, with no gaps.

📌 **Interview term: Random access** — reading any position directly by its index in O(1), without visiting the items before it.

The price: to insert or delete anywhere except the end, every later item must shift by one slot, which is O(n). And a fixed-size block can fill up, which is what dynamic arrays solve (below).

## 3. The Linked List: Nodes and Pointers

A linked list stores each item in its own small object called a **node**, which can live anywhere in memory. Each node holds the value and a **pointer** (a reference) to the next node. The list itself only remembers the first node, the **head**.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 190" role="img" aria-label="A linked list stores nodes anywhere in memory; each node holds a value and the address of the next node">
  <defs>
    <marker id="b02q2-python-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="85" y="34" text-anchor="middle">head</text>
  <path class="d-edge-accent" d="M 85 42 L 85 70" marker-end="url(#b02q2-python-arrow)"/>
  <rect class="d-box-accent" x="30" y="76" width="110" height="80" rx="10"/>
  <text class="d-text" x="85" y="108" text-anchor="middle">10</text>
  <text class="d-sub" x="85" y="136" text-anchor="middle">at 7200</text>
  <path class="d-edge" d="M 144 116 L 204 116" marker-end="url(#b02q2-python-arrow)"/>
  <rect class="d-box" x="210" y="76" width="110" height="80" rx="10"/>
  <text class="d-text" x="265" y="108" text-anchor="middle">20</text>
  <text class="d-sub" x="265" y="136" text-anchor="middle">at 3104</text>
  <path class="d-edge" d="M 324 116 L 384 116" marker-end="url(#b02q2-python-arrow)"/>
  <rect class="d-box" x="390" y="76" width="110" height="80" rx="10"/>
  <text class="d-text" x="445" y="108" text-anchor="middle">30</text>
  <text class="d-sub" x="445" y="136" text-anchor="middle">at 9952</text>
  <path class="d-edge" d="M 504 116 L 564 116" marker-end="url(#b02q2-python-arrow)"/>
  <rect class="d-box-muted" x="570" y="76" width="110" height="80" rx="10"/>
  <text class="d-text" x="625" y="108" text-anchor="middle">40</text>
  <text class="d-sub" x="625" y="136" text-anchor="middle">next is null</text>
</svg>

The addresses jump around (7200, 3104, 9952...), so there is no formula for "where is item i?". You must start at the head and follow i pointers: O(n).

📌 **Interview term: Node** — one element of a linked structure: a value plus one or more references to other nodes.

📌 **Interview term: Head (and tail)** — the first node of a linked list (and the last). Keeping a tail reference makes appending O(1).

📌 **Interview term: Singly vs doubly linked list** — in a singly linked list each node points only to the next one; in a doubly linked list it also points to the previous one, which allows walking backwards and O(1) removal of a node you already hold.

## 4. Where Each One Wins: Inserting at the Front

Inserting at the front shows the trade-off most clearly. In an array, every item moves:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="Inserting 5 at the front of an array moves every existing item one slot to the right">
  <defs>
    <marker id="b02q2a-python-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="60" y="72" text-anchor="middle">before</text>
  <rect class="d-box" x="130" y="45" width="100" height="50" rx="4"/>
  <text class="d-text" x="180" y="76" text-anchor="middle">10</text>
  <rect class="d-box" x="230" y="45" width="100" height="50" rx="4"/>
  <text class="d-text" x="280" y="76" text-anchor="middle">20</text>
  <rect class="d-box" x="330" y="45" width="100" height="50" rx="4"/>
  <text class="d-text" x="380" y="76" text-anchor="middle">30</text>
  <rect class="d-box" x="430" y="45" width="100" height="50" rx="4"/>
  <text class="d-text" x="480" y="76" text-anchor="middle">40</text>
  <rect class="d-box-muted" x="530" y="45" width="100" height="50" rx="4"/>
  <text class="d-sub" x="580" y="76" text-anchor="middle">free</text>
  <path class="d-edge-dashed" d="M 180 99 L 274 160" marker-end="url(#b02q2a-python-arrow)"/>
  <path class="d-edge-dashed" d="M 280 99 L 374 160" marker-end="url(#b02q2a-python-arrow)"/>
  <path class="d-edge-dashed" d="M 380 99 L 474 160" marker-end="url(#b02q2a-python-arrow)"/>
  <path class="d-edge-dashed" d="M 480 99 L 574 160" marker-end="url(#b02q2a-python-arrow)"/>
  <text class="d-sub" x="60" y="197" text-anchor="middle">after</text>
  <rect class="d-box-accent" x="130" y="170" width="100" height="50" rx="4"/>
  <text class="d-text d-accent" x="180" y="201" text-anchor="middle">5</text>
  <rect class="d-box" x="230" y="170" width="100" height="50" rx="4"/>
  <text class="d-text" x="280" y="201" text-anchor="middle">10</text>
  <rect class="d-box" x="330" y="170" width="100" height="50" rx="4"/>
  <text class="d-text" x="380" y="201" text-anchor="middle">20</text>
  <rect class="d-box" x="430" y="170" width="100" height="50" rx="4"/>
  <text class="d-text" x="480" y="201" text-anchor="middle">30</text>
  <rect class="d-box" x="530" y="170" width="100" height="50" rx="4"/>
  <text class="d-text" x="580" y="201" text-anchor="middle">40</text>
</svg>

In a linked list, you create one node and point it at the old head. Nothing else moves:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 170" role="img" aria-label="Inserting 5 at the front of a linked list creates one node and points it at the old head; nothing else moves">
  <defs>
    <marker id="b02q2b-python-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="85" y="34" text-anchor="middle">new head</text>
  <rect class="d-box-accent" x="30" y="60" width="110" height="60" rx="10"/>
  <text class="d-text d-accent" x="85" y="96" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 144 90 L 214 90" marker-end="url(#b02q2b-python-arrow)"/>
  <rect class="d-box" x="220" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="275" y="96" text-anchor="middle">10</text>
  <path class="d-edge" d="M 334 90 L 404 90" marker-end="url(#b02q2b-python-arrow)"/>
  <rect class="d-box" x="410" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="465" y="96" text-anchor="middle">20</text>
  <path class="d-edge" d="M 524 90 L 584 90" marker-end="url(#b02q2b-python-arrow)"/>
  <rect class="d-box-muted" x="590" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="645" y="96" text-anchor="middle">30</text>
  <text class="d-sub" x="275" y="150" text-anchor="middle">old head, not moved</text>
</svg>

The same holds anywhere in the list **once you already hold the node** you want to insert after: relinking is O(1). The catch interviewers look for: *finding* that node from the head is still O(n). So "linked lists have O(1) insertion in the middle" is only true if you are already there. Example 1 counts it: inserting in the middle of 100,000 items costs the array 50,000 moves, and costs the list 49,999 hops to get there plus 1 relink.

## 5. Dynamic Arrays: Why Appending Is Still Cheap

Real programs rarely know the final size up front. A **dynamic array** keeps a block with spare room (its **capacity**). Appending writes into the spare room, which is O(1). When the room runs out, it allocates a bigger block (typically 1.5 to 2 times larger), copies everything over, and frees the old one. That copy is O(n), but it happens so rarely that the average cost per append stays O(1). This is the classic example of [amortized analysis](/interview-question/what-is-amortized-analysis).

📌 **Interview term: Dynamic array** — an array that grows automatically by reallocating into a bigger block when full (Python \`list\`, JavaScript arrays, Java \`ArrayList\`, C++ \`std::vector\`).

📌 **Interview term: Amortized O(1)** — an operation that is occasionally expensive but averages out to constant time over a long sequence of operations.

## 6. The Hidden Factor: Cache Locality

Big-O treats every memory read as equal, but real CPUs read memory in chunks (cache lines) and keep recently used chunks close by. Walking an array reads neighbouring items that are already in the cache; walking a linked list jumps to a new, possibly uncached address at every node. So even for an O(n) walk that both structures share, arrays are usually much faster in practice. This is why dynamic arrays are the default choice in almost every language, and linked lists are used only when their specific strength is needed.

📌 **Interview term: Cache locality** — the speed benefit of accessing memory locations close to ones accessed recently; arrays have it, linked lists mostly do not.

## 7. Side-by-Side Comparison

| Operation | Array (dynamic) | Singly linked list | Why |
| :--- | :--- | :--- | :--- |
| Read item i | **O(1)** | O(n) | address formula vs walking i nodes |
| Insert/delete at front | O(n) | **O(1)** | shift everything vs relink the head |
| Insert/delete at end | **O(1)** amortized | O(1) with a tail pointer (delete at end is O(n) without a previous pointer) | spare capacity vs tail link |
| Insert/delete in the middle, given the position | O(n) | **O(1)** relink, but O(n) to find the spot | shifting vs relinking |
| Search for a value | O(n) (O(log n) if sorted) | O(n) | arrays allow binary search; lists cannot jump |
| Extra memory per item | none (plus spare capacity) | one or two pointers per node | the links themselves |
| Cache behaviour | excellent | poor | contiguous vs scattered |

Linked lists show up in interviews mostly as a structure to manipulate: [reversing a list](/interview-question/how-do-you-reverse-a-linked-list), [finding the middle](/interview-question/how-do-you-find-the-middle-of-a-linked-list), [detecting a cycle](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list), and as a building block, for example the doubly linked list inside an [LRU cache](/interview-question/how-do-you-design-an-lru-cache).

## 8. In Python: list, deque, and a Hand-Made Linked List

- **\`list\` is a dynamic array of references.** CPython stores pointers to the objects in one contiguous block, so \`a[i]\` is O(1), \`append\` is amortized O(1), and \`insert(0, x)\` or \`pop(0)\` shift everything: O(n). You can watch the spare capacity grow with \`sys.getsizeof\`; on Python 3.13 (64-bit) the size jumped at lengths 1, 5, 9, 17, 25, 33, 41, 53 and 65, which means capacities of 4, 8, 16, 24, 32, 40, 52, 64 and 76 slots:

~~~text
len 0: 56 bytes; len 1: 88 bytes; len 5: 120 bytes; len 9: 184 bytes; len 17: 248 bytes; len 25: 312 bytes; len 33: 376 bytes; len 41: 472 bytes; len 53: 568 bytes; len 65: 664 bytes
~~~

* **There is no built-in linked list.** For a queue or anything that adds and removes at both ends, use \`collections.deque\`. Its docstring describes it as "a list-like sequence optimized for data accesses near its endpoints"; the docs add that indexing is O(1) at both ends but O(n) in the middle. On the machine used for this doc, popping all items from the front of a 100,000-item \`list\` took 0.795 s, and from a \`deque\` 0.003 s.
- **For interview problems you write the node class yourself:**

~~~python
class Node:
    __slots__ = ("val", "next")      # no per-instance __dict__: smaller, faster nodes
    def __init__(self, val, nxt=None):
        self.val, self.next = val, nxt
~~~

\`__slots__\` is optional, but it is a nice detail to mention: each node no longer carries its own attribute dictionary. Compare nodes with \`is\` (\`node is self.tail\`), not \`==\`, because you mean "the same object".

## 9. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`python3 main.py\`; the blocks are the exact standard output.

**Example 1 — counting array moves and list hops for n = 10, 1,000 and 100,000**

~~~text
n=10: get(last) array=1 list=9 | insert(0) array=10 list=1 | insert(mid) array=5 list=4+1
n=1000: get(last) array=1 list=999 | insert(0) array=1000 list=1 | insert(mid) array=500 list=499+1
n=100000: get(last) array=1 list=99999 | insert(0) array=100000 list=1 | insert(mid) array=50000 list=49999+1
~~~

**Example 2 — a singly linked list with push, insert, remove and print**

~~~text
empty:            null
after pushes:     10 -> 20 -> 40 -> null
insert 30 after 20: 10 -> 20 -> 30 -> 40 -> null
remove 10: true  -> 20 -> 30 -> 40 -> null
remove 40: true  -> 20 -> 30 -> null
remove 99: false -> 20 -> 30 -> null
push_back 50:     20 -> 30 -> 50 -> null  (size 3)
~~~

**Reading Example 1:** \`get(last)\` costs the array 1 step at every size, while the list needs n − 1 hops. Inserting at index 0 reverses the picture: n moves for the array, 1 link for the list. In the middle, the list's insert is cheap only after it has walked there, so both end up proportional to n.

## 10. Complexity of the Example Code

| Operation in Example 2 | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| push front | O(1) | O(1) | one new node, one link |
| push back (with tail) | O(1) | O(1) | the tail reference avoids a walk |
| find | O(n) | O(1) | must walk from the head |
| insert after a held node | O(1) | O(1) | two link changes |
| remove by value | O(n) | O(1) | walk to find the previous node, then one link change |
| print | O(n) | O(n) | visits every node and builds the string |

## 11. Edge Cases to Mention

- **Empty structure:** \`head\` is null; every operation must check it (Example 2 prints \`null\` for an empty list).
- **One node:** removing it must update both head and tail.
- **Removing the head or the tail:** these are special cases in a singly linked list; forgetting to update \`tail\` leaves it pointing at a removed node.
- **Value not found:** return false or null instead of crashing (Example 2: \`remove 99: false\`).
- **Index out of range:** arrays need a bounds check; a list walk must stop at null.

## 12. Common Pitfalls

- **Saying "linked lists have O(1) insertion" without the condition.** Only when you already hold the neighbouring node; finding it is O(n).
- **Using \`list.insert(0, x)\` or \`list.pop(0)\` in a loop.** Each call shifts the whole list, so a loop of n of them is O(n²). Use \`collections.deque\`.
- **Forgetting to update \`tail\` when removing the last node.** \`push_back\` then links onto a node that is no longer in the list.
- **Comparing nodes with \`==\` instead of \`is\`.** If a node class defines \`__eq__\` by value, two different nodes with equal values look "the same".
- **Losing the rest of the list.** In \`insert_after\`, set the new node's \`next\` before changing \`node.next\`, or the tail of the list becomes unreachable.
- **Assuming a Python list stores the numbers themselves.** It stores references; the integers live elsewhere, so a list of ints uses more memory than a C array (the \`array\` module stores raw values).

## 13. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core difference:</strong> <span style="color:#f0e2c8;">An array keeps items side by side in one block; a linked list keeps separate nodes joined by references.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What each makes cheap:</strong> <span style="color:#f0e2c8;">Arrays give O(1) indexing and good cache use; linked lists give O(1) insert or delete at a node you already hold, but O(n) to reach item i.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Dynamic arrays:</strong> <span style="color:#f0e2c8;">Python <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code> is a dynamic array: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code> is amortized O(1) because it over-allocates, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert(0, x)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop(0)</code> are O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. In Python practice:</strong> <span style="color:#f0e2c8;">There is no built-in linked list; for both-ends work I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code>, and in interviews I write a small <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Node</code> class with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__slots__</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The default:</strong> <span style="color:#f0e2c8;">Unless I need cheap inserts at known positions, I choose the array, because cache locality makes it faster in practice.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is indexing an array O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every slot has the same size, so the address of item i is start plus i times the slot size: one calculation, no walk.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">deque</code> a linked list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It behaves like one at the ends: O(1) <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">appendleft</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popleft</code>. Its docs say indexing is O(1) at the ends but O(n) in the middle, so it is not a replacement for a list when you need random access.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">append</code> O(1) if the list sometimes has to copy everything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It over-allocates. On Python 3.13 the capacity went 4, 8, 16, 24, 32 and so on, so copies are rare and the average cost per append is constant: amortized O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you really use a linked list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you hold references to nodes and must insert or remove them in O(1), as in an LRU cache built from a dict plus a doubly linked list.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How much extra memory does a linked list use?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One reference per node for a singly linked list (two for doubly), plus the object overhead of each node, which is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__slots__</code> helps in Python.</span>
</div>

</div>

## 14. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Contiguous memory** | Stored in one unbroken block, item after item |
| **Random access** | Reading any index directly in O(1) |
| **Node** | A value plus references to other nodes |
| **Head (and tail)** | First (and last) node of a linked list |
| **Singly vs doubly linked list** | Links to the next node only, or to next and previous |
| **Dynamic array** | An array that grows by reallocating into a bigger block |
| **Amortized O(1)** | Occasionally expensive, constant on average over many operations |
| **Cache locality** | Speed gained by reading memory near what was just read |
| **deque** | collections.deque: O(1) appends and pops at both ends |

---
**Conclusion:** An array keeps its items in one contiguous block, so it can jump to any index in O(1) and walks memory in the cache-friendly way, but inserting anywhere except the end shifts items in O(n). A linked list keeps nodes joined by references, so relinking at a node you already hold is O(1), but reaching item i costs i hops. Example 1 made both costs visible with counters, and Example 2 built the list operations an interviewer asks for. In Python, the everyday choice is the \`list\` (a dynamic array) and \`collections.deque\` for both-ends work; a hand-written \`Node\` class is for interview problems and for structures like an LRU cache that need O(1) relinking.`,
        examples: [
          {
            label: "Counting the work: array moves vs list hops",
            code: `# Count the work, do not time it: element moves for the array,
# pointer hops for the linked list.

class Node:
    __slots__ = ("val", "next")          # smaller nodes, no per-node __dict__
    def __init__(self, val, nxt=None):
        self.val, self.next = val, nxt

def build_list(n):
    head = None
    for v in range(n - 1, -1, -1):       # push_front n times: 0 -> 1 -> ... -> n-1
        head = Node(v, head)
    return head

def list_get(head, i):                   # walk i hops from the head
    hops, node = 0, head
    while hops < i:
        node, hops = node.next, hops + 1
    return node.val, hops

def array_insert(arr, i, val):           # what list.insert(i, val) does inside, made visible
    arr.append(None)
    moves = 0
    for j in range(len(arr) - 1, i, -1): # shift everything after i one slot right
        arr[j] = arr[j - 1]
        moves += 1
    arr[i] = val
    return moves

for n in [10, 1000, 100000]:
    head = build_list(n)
    _, hops_last = list_get(head, n - 1)          # array: arr[n - 1] is 1 step
    front_moves = array_insert(list(range(n)), 0, -1)  # list: 1 new node, 1 link
    mid = n // 2
    mid_moves = array_insert(list(range(n)), mid, -1)
    _, hops_mid = list_get(head, mid - 1)         # list must first walk to the node before mid
    print("n=" + str(n) + ": get(last) array=1 list=" + str(hops_last)
          + " | insert(0) array=" + str(front_moves) + " list=1"
          + " | insert(mid) array=" + str(mid_moves) + " list=" + str(hops_mid) + "+1")`,
          },
          {
            label: "A singly linked list from scratch",
            code: `# A singly linked list from scratch: the operations an interviewer asks for.

class Node:
    __slots__ = ("val", "next")
    def __init__(self, val, nxt=None):
        self.val, self.next = val, nxt

class LinkedList:
    def __init__(self):
        self.head = None
        self.tail = None                 # keeping a tail makes push_back O(1)
        self.size = 0

    def push_front(self, val):
        self.head = Node(val, self.head)
        if self.tail is None:
            self.tail = self.head
        self.size += 1

    def push_back(self, val):
        node = Node(val)
        if self.tail is None:
            self.head = self.tail = node
        else:
            self.tail.next = node
            self.tail = node
        self.size += 1

    def find(self, val):                 # O(n): no index, so we must walk
        node = self.head
        while node is not None and node.val != val:
            node = node.next
        return node

    def insert_after(self, node, val):   # O(1) once you hold the node
        node.next = Node(val, node.next)
        if node is self.tail:
            self.tail = node.next
        self.size += 1

    def remove(self, val):               # O(n) to find the node before it, O(1) to unlink
        prev, node = None, self.head
        while node is not None and node.val != val:
            prev, node = node, node.next
        if node is None:
            return False
        if prev is None:
            self.head = node.next
        else:
            prev.next = node.next
        if node is self.tail:
            self.tail = prev
        self.size -= 1
        return True

    def __str__(self):
        parts, node = [], self.head
        while node is not None:
            parts.append(str(node.val))
            node = node.next
        return " -> ".join(parts + ["null"])

lst = LinkedList()
print("empty:            " + str(lst))
lst.push_front(20)
lst.push_front(10)
lst.push_back(40)
print("after pushes:     " + str(lst))
lst.insert_after(lst.find(20), 30)
print("insert 30 after 20: " + str(lst))
print("remove 10: " + str(lst.remove(10)).lower() + "  -> " + str(lst))
print("remove 40: " + str(lst.remove(40)).lower() + "  -> " + str(lst))
print("remove 99: " + str(lst.remove(99)).lower() + " -> " + str(lst))
lst.push_back(50)
print("push_back 50:     " + str(lst) + "  (size " + str(lst.size) + ")")  # push_back 50:     20 -> 30 -> 50 -> null  (size 3)`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Explain the difference between an array and a linked list. When would you pick one over the other, and what does each look like in JavaScript? If there is time, sketch a small linked list in JavaScript."

**What a strong answer should cover:**
- Memory layout: one contiguous block versus separate nodes joined by references.
- Costs: O(1) indexing versus O(n) walking; O(n) front inserts versus O(1) relinking at a node you already hold (and that finding the node is still O(n)).
- Dynamic arrays and amortized O(1) appends; the extra memory per node in a linked list.
- Cache locality as the practical reason arrays usually win.
- JavaScript specifics: arrays are dynamic and grow automatically, there is no built-in linked list, and \`shift\`/\`unshift\`/\`splice\` near the front are O(n), which matters in queues.

**Code / implementation expected:** Optional — a small \`Node\` class with insert, delete and traversal in JavaScript is a common follow-up.`,
        answer: `**Target Audience:** Beginners learning data structures — no prior knowledge assumed.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`node main.js\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture two ways of storing a class's homework. In the first, every notebook goes into a row of numbered lockers, side by side: if you want notebook number 37, you walk straight to locker 37. But if a new student must go in at locker 1, everyone in lockers 1 to 40 has to move one locker to the right.

In the second, the notebooks are spread all over the school, and each one has a sticky note saying where the next one is. Adding a new first notebook is easy: write a sticky note pointing to the old first one, and you are done. But to find notebook 37 you must follow 36 sticky notes, one after another.

The lockers are an **array**. The sticky-note trail is a **linked list**. Neither is better; each makes a different operation cheap. The interview question is really: *which operation does your program do most, and which structure makes that operation cheap?*

## 2. The Array: One Block, Instant Indexing

An array stores its items **next to each other** in one block of memory. Because every slot has the same size, the computer can compute where item i lives with one multiplication: \`address = start + i × size\`. That is why reading \`a[i]\` takes the same time for i = 0 or i = 1,000,000.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="An array stores its items next to each other, so the address of item i is the start plus i times the item size">
  <text class="d-text" x="360" y="30" text-anchor="middle">Array: one block of memory</text>
  <rect class="d-box-accent" x="85" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="140" y="96" text-anchor="middle">10</text>
  <rect class="d-box" x="195" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="250" y="96" text-anchor="middle">20</text>
  <rect class="d-box" x="305" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="360" y="96" text-anchor="middle">30</text>
  <rect class="d-box" x="415" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="470" y="96" text-anchor="middle">40</text>
  <rect class="d-box" x="525" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="580" y="96" text-anchor="middle">50</text>
  <text class="d-sub" x="140" y="146" text-anchor="middle">index 0</text>
  <text class="d-sub" x="250" y="146" text-anchor="middle">index 1</text>
  <text class="d-sub" x="360" y="146" text-anchor="middle">index 2</text>
  <text class="d-sub" x="470" y="146" text-anchor="middle">index 3</text>
  <text class="d-sub" x="580" y="146" text-anchor="middle">index 4</text>
  <text class="d-sub" x="140" y="174" text-anchor="middle">addr 1000</text>
  <text class="d-sub" x="250" y="174" text-anchor="middle">addr 1004</text>
  <text class="d-sub" x="360" y="174" text-anchor="middle">addr 1008</text>
  <text class="d-sub" x="470" y="174" text-anchor="middle">addr 1012</text>
  <text class="d-sub" x="580" y="174" text-anchor="middle">addr 1016</text>
</svg>

With 4-byte integers, item 3 lives at 1000 + 3 × 4 = 1012; no searching is involved.

📌 **Interview term: Contiguous memory** — stored in one unbroken block, item after item, with no gaps.

📌 **Interview term: Random access** — reading any position directly by its index in O(1), without visiting the items before it.

The price: to insert or delete anywhere except the end, every later item must shift by one slot, which is O(n). And a fixed-size block can fill up, which is what dynamic arrays solve (below).

## 3. The Linked List: Nodes and Pointers

A linked list stores each item in its own small object called a **node**, which can live anywhere in memory. Each node holds the value and a **pointer** (a reference) to the next node. The list itself only remembers the first node, the **head**.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 190" role="img" aria-label="A linked list stores nodes anywhere in memory; each node holds a value and the address of the next node">
  <defs>
    <marker id="b02q2-javascript-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="85" y="34" text-anchor="middle">head</text>
  <path class="d-edge-accent" d="M 85 42 L 85 70" marker-end="url(#b02q2-javascript-arrow)"/>
  <rect class="d-box-accent" x="30" y="76" width="110" height="80" rx="10"/>
  <text class="d-text" x="85" y="108" text-anchor="middle">10</text>
  <text class="d-sub" x="85" y="136" text-anchor="middle">at 7200</text>
  <path class="d-edge" d="M 144 116 L 204 116" marker-end="url(#b02q2-javascript-arrow)"/>
  <rect class="d-box" x="210" y="76" width="110" height="80" rx="10"/>
  <text class="d-text" x="265" y="108" text-anchor="middle">20</text>
  <text class="d-sub" x="265" y="136" text-anchor="middle">at 3104</text>
  <path class="d-edge" d="M 324 116 L 384 116" marker-end="url(#b02q2-javascript-arrow)"/>
  <rect class="d-box" x="390" y="76" width="110" height="80" rx="10"/>
  <text class="d-text" x="445" y="108" text-anchor="middle">30</text>
  <text class="d-sub" x="445" y="136" text-anchor="middle">at 9952</text>
  <path class="d-edge" d="M 504 116 L 564 116" marker-end="url(#b02q2-javascript-arrow)"/>
  <rect class="d-box-muted" x="570" y="76" width="110" height="80" rx="10"/>
  <text class="d-text" x="625" y="108" text-anchor="middle">40</text>
  <text class="d-sub" x="625" y="136" text-anchor="middle">next is null</text>
</svg>

The addresses jump around (7200, 3104, 9952...), so there is no formula for "where is item i?". You must start at the head and follow i pointers: O(n).

📌 **Interview term: Node** — one element of a linked structure: a value plus one or more references to other nodes.

📌 **Interview term: Head (and tail)** — the first node of a linked list (and the last). Keeping a tail reference makes appending O(1).

📌 **Interview term: Singly vs doubly linked list** — in a singly linked list each node points only to the next one; in a doubly linked list it also points to the previous one, which allows walking backwards and O(1) removal of a node you already hold.

## 4. Where Each One Wins: Inserting at the Front

Inserting at the front shows the trade-off most clearly. In an array, every item moves:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="Inserting 5 at the front of an array moves every existing item one slot to the right">
  <defs>
    <marker id="b02q2a-javascript-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="60" y="72" text-anchor="middle">before</text>
  <rect class="d-box" x="130" y="45" width="100" height="50" rx="4"/>
  <text class="d-text" x="180" y="76" text-anchor="middle">10</text>
  <rect class="d-box" x="230" y="45" width="100" height="50" rx="4"/>
  <text class="d-text" x="280" y="76" text-anchor="middle">20</text>
  <rect class="d-box" x="330" y="45" width="100" height="50" rx="4"/>
  <text class="d-text" x="380" y="76" text-anchor="middle">30</text>
  <rect class="d-box" x="430" y="45" width="100" height="50" rx="4"/>
  <text class="d-text" x="480" y="76" text-anchor="middle">40</text>
  <rect class="d-box-muted" x="530" y="45" width="100" height="50" rx="4"/>
  <text class="d-sub" x="580" y="76" text-anchor="middle">free</text>
  <path class="d-edge-dashed" d="M 180 99 L 274 160" marker-end="url(#b02q2a-javascript-arrow)"/>
  <path class="d-edge-dashed" d="M 280 99 L 374 160" marker-end="url(#b02q2a-javascript-arrow)"/>
  <path class="d-edge-dashed" d="M 380 99 L 474 160" marker-end="url(#b02q2a-javascript-arrow)"/>
  <path class="d-edge-dashed" d="M 480 99 L 574 160" marker-end="url(#b02q2a-javascript-arrow)"/>
  <text class="d-sub" x="60" y="197" text-anchor="middle">after</text>
  <rect class="d-box-accent" x="130" y="170" width="100" height="50" rx="4"/>
  <text class="d-text d-accent" x="180" y="201" text-anchor="middle">5</text>
  <rect class="d-box" x="230" y="170" width="100" height="50" rx="4"/>
  <text class="d-text" x="280" y="201" text-anchor="middle">10</text>
  <rect class="d-box" x="330" y="170" width="100" height="50" rx="4"/>
  <text class="d-text" x="380" y="201" text-anchor="middle">20</text>
  <rect class="d-box" x="430" y="170" width="100" height="50" rx="4"/>
  <text class="d-text" x="480" y="201" text-anchor="middle">30</text>
  <rect class="d-box" x="530" y="170" width="100" height="50" rx="4"/>
  <text class="d-text" x="580" y="201" text-anchor="middle">40</text>
</svg>

In a linked list, you create one node and point it at the old head. Nothing else moves:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 170" role="img" aria-label="Inserting 5 at the front of a linked list creates one node and points it at the old head; nothing else moves">
  <defs>
    <marker id="b02q2b-javascript-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="85" y="34" text-anchor="middle">new head</text>
  <rect class="d-box-accent" x="30" y="60" width="110" height="60" rx="10"/>
  <text class="d-text d-accent" x="85" y="96" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 144 90 L 214 90" marker-end="url(#b02q2b-javascript-arrow)"/>
  <rect class="d-box" x="220" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="275" y="96" text-anchor="middle">10</text>
  <path class="d-edge" d="M 334 90 L 404 90" marker-end="url(#b02q2b-javascript-arrow)"/>
  <rect class="d-box" x="410" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="465" y="96" text-anchor="middle">20</text>
  <path class="d-edge" d="M 524 90 L 584 90" marker-end="url(#b02q2b-javascript-arrow)"/>
  <rect class="d-box-muted" x="590" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="645" y="96" text-anchor="middle">30</text>
  <text class="d-sub" x="275" y="150" text-anchor="middle">old head, not moved</text>
</svg>

The same holds anywhere in the list **once you already hold the node** you want to insert after: relinking is O(1). The catch interviewers look for: *finding* that node from the head is still O(n). So "linked lists have O(1) insertion in the middle" is only true if you are already there. Example 1 counts it: inserting in the middle of 100,000 items costs the array 50,000 moves, and costs the list 49,999 hops to get there plus 1 relink.

## 5. Dynamic Arrays: Why Appending Is Still Cheap

Real programs rarely know the final size up front. A **dynamic array** keeps a block with spare room (its **capacity**). Appending writes into the spare room, which is O(1). When the room runs out, it allocates a bigger block (typically 1.5 to 2 times larger), copies everything over, and frees the old one. That copy is O(n), but it happens so rarely that the average cost per append stays O(1). This is the classic example of [amortized analysis](/interview-question/what-is-amortized-analysis).

📌 **Interview term: Dynamic array** — an array that grows automatically by reallocating into a bigger block when full (Python \`list\`, JavaScript arrays, Java \`ArrayList\`, C++ \`std::vector\`).

📌 **Interview term: Amortized O(1)** — an operation that is occasionally expensive but averages out to constant time over a long sequence of operations.

## 6. The Hidden Factor: Cache Locality

Big-O treats every memory read as equal, but real CPUs read memory in chunks (cache lines) and keep recently used chunks close by. Walking an array reads neighbouring items that are already in the cache; walking a linked list jumps to a new, possibly uncached address at every node. So even for an O(n) walk that both structures share, arrays are usually much faster in practice. This is why dynamic arrays are the default choice in almost every language, and linked lists are used only when their specific strength is needed.

📌 **Interview term: Cache locality** — the speed benefit of accessing memory locations close to ones accessed recently; arrays have it, linked lists mostly do not.

## 7. Side-by-Side Comparison

| Operation | Array (dynamic) | Singly linked list | Why |
| :--- | :--- | :--- | :--- |
| Read item i | **O(1)** | O(n) | address formula vs walking i nodes |
| Insert/delete at front | O(n) | **O(1)** | shift everything vs relink the head |
| Insert/delete at end | **O(1)** amortized | O(1) with a tail pointer (delete at end is O(n) without a previous pointer) | spare capacity vs tail link |
| Insert/delete in the middle, given the position | O(n) | **O(1)** relink, but O(n) to find the spot | shifting vs relinking |
| Search for a value | O(n) (O(log n) if sorted) | O(n) | arrays allow binary search; lists cannot jump |
| Extra memory per item | none (plus spare capacity) | one or two pointers per node | the links themselves |
| Cache behaviour | excellent | poor | contiguous vs scattered |

Linked lists show up in interviews mostly as a structure to manipulate: [reversing a list](/interview-question/how-do-you-reverse-a-linked-list), [finding the middle](/interview-question/how-do-you-find-the-middle-of-a-linked-list), [detecting a cycle](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list), and as a building block, for example the doubly linked list inside an [LRU cache](/interview-question/how-do-you-design-an-lru-cache).

## 8. In JavaScript: Arrays, and a Hand-Made Linked List

- **Arrays are dynamic.** \`push\` and \`pop\` work at the end in amortized O(1); \`unshift\`, \`shift\` and \`splice\` near the front must move the other elements. The language specification describes behaviour, not memory layout, but engines such as V8 store dense arrays in a contiguous backing store. Measured in Node 22 on the machine used for this doc, emptying an array with \`shift()\` grew much faster than linearly:

~~~text
shift 100000 908 ms
shift 200000 3190 ms
shift 400000 16977 ms
pop 100000 2 ms
pop 200000 4 ms
pop 400000 0 ms
~~~

**Reading the numbers:** doubling the size roughly quadrupled the time for \`shift\`, the signature of O(n) per call, while \`pop\` stayed in single milliseconds.
* **Holes make arrays slower.** \`const a = []; a[1000000] = 1;\` creates a sparse array; engines may switch it to a slower dictionary-like representation. Keep arrays dense.
* **There is no built-in linked list.** For interview problems you write the node class:

~~~javascript
class Node {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}
~~~

**Using it:** compare nodes with \`===\` (same object), use \`null\` for "no next node", and remember that objects are passed by reference, so \`let node = head\` lets you walk without changing \`head\`.

## 9. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`node main.js\`; the blocks are the exact standard output.

**Example 1 — counting array moves and list hops for n = 10, 1,000 and 100,000**

~~~text
n=10: get(last) array=1 list=9 | insert(0) array=10 list=1 | insert(mid) array=5 list=4+1
n=1000: get(last) array=1 list=999 | insert(0) array=1000 list=1 | insert(mid) array=500 list=499+1
n=100000: get(last) array=1 list=99999 | insert(0) array=100000 list=1 | insert(mid) array=50000 list=49999+1
~~~

**Example 2 — a singly linked list with push, insert, remove and print**

~~~text
empty:            null
after pushes:     10 -> 20 -> 40 -> null
insert 30 after 20: 10 -> 20 -> 30 -> 40 -> null
remove 10: true  -> 20 -> 30 -> 40 -> null
remove 40: true  -> 20 -> 30 -> null
remove 99: false -> 20 -> 30 -> null
push_back 50:     20 -> 30 -> 50 -> null  (size 3)
~~~

**Reading Example 1:** \`get(last)\` costs the array 1 step at every size, while the list needs n − 1 hops. Inserting at index 0 reverses the picture: n moves for the array, 1 link for the list. In the middle, the list's insert is cheap only after it has walked there, so both end up proportional to n.

## 10. Complexity of the Example Code

| Operation in Example 2 | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| push front | O(1) | O(1) | one new node, one link |
| push back (with tail) | O(1) | O(1) | the tail reference avoids a walk |
| find | O(n) | O(1) | must walk from the head |
| insert after a held node | O(1) | O(1) | two link changes |
| remove by value | O(n) | O(1) | walk to find the previous node, then one link change |
| print | O(n) | O(n) | visits every node and builds the string |

## 11. Edge Cases to Mention

- **Empty structure:** \`head\` is null; every operation must check it (Example 2 prints \`null\` for an empty list).
- **One node:** removing it must update both head and tail.
- **Removing the head or the tail:** these are special cases in a singly linked list; forgetting to update \`tail\` leaves it pointing at a removed node.
- **Value not found:** return false or null instead of crashing (Example 2: \`remove 99: false\`).
- **Index out of range:** arrays need a bounds check; a list walk must stop at null.

## 12. Common Pitfalls

- **Saying "linked lists have O(1) insertion" without the condition.** Only when you already hold the neighbouring node; finding it is O(n).
- **Using \`shift()\` or \`unshift()\` in a loop.** Each call moves the remaining elements, so a loop over n items is O(n²); the measurement above shows it.
- **Forgetting to update \`tail\` when removing the last node.** \`pushBack\` then links onto a node that is no longer in the list.
- **Moving \`head\` while walking.** Use a separate variable (\`let node = this.head\`) or you lose the start of the list.
- **Losing the rest of the list.** In \`insertAfter\`, create the new node with \`next\` set to \`node.next\` before changing \`node.next\`.
- **Mixing \`null\` and \`undefined\`.** Pick one for "no node" (here \`null\`) and compare with \`===\`, or end-of-list checks become inconsistent.

## 13. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core difference:</strong> <span style="color:#f0e2c8;">An array keeps items side by side; a linked list keeps separate node objects joined by references.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What each makes cheap:</strong> <span style="color:#f0e2c8;">Arrays give O(1) indexing and good cache use; linked lists give O(1) insert or delete at a node you already hold, but O(n) to reach item i.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Dynamic arrays:</strong> <span style="color:#f0e2c8;">JS arrays grow automatically: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code> are amortized O(1), while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unshift</code> and front <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code> are O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. In JavaScript practice:</strong> <span style="color:#f0e2c8;">There is no built-in linked list, so in interviews I write a small <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Node</code> class with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> consistently.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The default:</strong> <span style="color:#f0e2c8;">Unless I need cheap inserts at known positions, I choose the array, because contiguous memory is faster in practice.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is indexing an array O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every slot has the same size, so the address of item i is start plus i times the slot size: one calculation, no walk.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shift()</code> really O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In practice, yes. In Node 22, emptying a 400,000-item array with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code> took about 17 seconds against 908 ms for 100,000: four times the items, almost twenty times the time. For a queue, keep a head index instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are JS arrays really contiguous?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The spec does not say; it defines behaviour only. Engines like V8 use a contiguous store for dense arrays and can fall back to a slower representation for sparse ones, which is one reason to avoid holes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you really use a linked list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you hold references to nodes and must insert or remove them in O(1), as in an LRU cache built from a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> plus a doubly linked list.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you reverse a linked list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Walk it once with three references, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>, pointing each node back at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code>; O(n) time and O(1) space.</span>
</div>

</div>

## 14. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Contiguous memory** | Stored in one unbroken block, item after item |
| **Random access** | Reading any index directly in O(1) |
| **Node** | A value plus references to other nodes |
| **Head (and tail)** | First (and last) node of a linked list |
| **Singly vs doubly linked list** | Links to the next node only, or to next and previous |
| **Dynamic array** | An array that grows by reallocating into a bigger block |
| **Amortized O(1)** | Occasionally expensive, constant on average over many operations |
| **Cache locality** | Speed gained by reading memory near what was just read |
| **Sparse array** | A JS array with holes (missing indices); engines may store it more slowly |

---
**Conclusion:** An array keeps its items side by side, so it can jump to any index in O(1) and walks memory in a cache-friendly way, but inserting anywhere except the end shifts items in O(n). A linked list keeps nodes joined by references, so relinking at a node you already hold is O(1), but reaching item i costs i hops. Example 1 made both costs visible with counters, and Example 2 built the list operations an interviewer asks for. In JavaScript, everyday code uses arrays (and avoids \`shift\` in hot loops); a hand-written \`Node\` class is for interview problems and for structures like an LRU cache that need O(1) relinking.`,
        examples: [
          {
            label: "Counting the work: array moves vs list hops",
            code: `// Count the work, do not time it: element moves for the array,
// pointer hops for the linked list.

class Node {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

function buildList(n) {
  let head = null;
  for (let v = n - 1; v >= 0; v--) head = new Node(v, head);  // 0 -> 1 -> ... -> n-1
  return head;
}

function listGet(head, i) {               // walk i hops from the head
  let hops = 0, node = head;
  while (hops < i) { node = node.next; hops++; }
  return [node.val, hops];
}

function arrayInsert(arr, i, val) {       // what arr.splice(i, 0, val) has to do, made visible
  arr.push(undefined);
  let moves = 0;
  for (let j = arr.length - 1; j > i; j--) { arr[j] = arr[j - 1]; moves++; }
  arr[i] = val;
  return moves;
}

function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}

for (const n of [10, 1000, 100000]) {
  const head = buildList(n);
  const hopsLast = listGet(head, n - 1)[1];          // array: arr[n - 1] is 1 step
  const frontMoves = arrayInsert(range(n), 0, -1);   // list: 1 new node, 1 link
  const mid = Math.floor(n / 2);
  const midMoves = arrayInsert(range(n), mid, -1);
  const hopsMid = listGet(head, mid - 1)[1];         // list must first walk to the node before mid
  console.log('n=' + n + ': get(last) array=1 list=' + hopsLast +
    ' | insert(0) array=' + frontMoves + ' list=1' +
    ' | insert(mid) array=' + midMoves + ' list=' + hopsMid + '+1');
}`,
          },
          {
            label: "A singly linked list from scratch",
            code: `// A singly linked list from scratch: the operations an interviewer asks for.

class Node {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

class LinkedList {
  constructor() {
    this.head = null;
    this.tail = null;                    // keeping a tail makes pushBack O(1)
    this.size = 0;
  }
  pushFront(val) {
    this.head = new Node(val, this.head);
    if (this.tail === null) this.tail = this.head;
    this.size++;
  }
  pushBack(val) {
    const node = new Node(val);
    if (this.tail === null) this.head = this.tail = node;
    else { this.tail.next = node; this.tail = node; }
    this.size++;
  }
  find(val) {                            // O(n): no index, so we must walk
    let node = this.head;
    while (node !== null && node.val !== val) node = node.next;
    return node;
  }
  insertAfter(node, val) {               // O(1) once you hold the node
    node.next = new Node(val, node.next);
    if (node === this.tail) this.tail = node.next;
    this.size++;
  }
  remove(val) {                          // O(n) to find the node before it, O(1) to unlink
    let prev = null, node = this.head;
    while (node !== null && node.val !== val) { prev = node; node = node.next; }
    if (node === null) return false;
    if (prev === null) this.head = node.next;
    else prev.next = node.next;
    if (node === this.tail) this.tail = prev;
    this.size--;
    return true;
  }
  toString() {
    const parts = [];
    for (let node = this.head; node !== null; node = node.next) parts.push(String(node.val));
    parts.push('null');
    return parts.join(' -> ');
  }
}

const lst = new LinkedList();
console.log('empty:            ' + lst); // empty:            null
lst.pushFront(20);
lst.pushFront(10);
lst.pushBack(40);
console.log('after pushes:     ' + lst); // after pushes:     10 -> 20 -> 40 -> null
lst.insertAfter(lst.find(20), 30);
console.log('insert 30 after 20: ' + lst); // insert 30 after 20: 10 -> 20 -> 30 -> 40 -> null
console.log('remove 10: ' + lst.remove(10) + '  -> ' + lst); // remove 10: true  -> 20 -> 30 -> 40 -> null
console.log('remove 40: ' + lst.remove(40) + '  -> ' + lst); // remove 40: true  -> 20 -> 30 -> null
console.log('remove 99: ' + lst.remove(99) + ' -> ' + lst); // remove 99: false -> 20 -> 30 -> null
lst.pushBack(50);
console.log('push_back 50:     ' + lst + '  (size ' + lst.size + ')'); // push_back 50:     20 -> 30 -> 50 -> null  (size 3)`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Explain the difference between an array and a linked list. When would you pick one over the other, and what does each look like in Java? If there is time, sketch a small linked list in Java."

**What a strong answer should cover:**
- Memory layout: one contiguous block versus separate nodes joined by references.
- Costs: O(1) indexing versus O(n) walking; O(n) front inserts versus O(1) relinking at a node you already hold (and that finding the node is still O(n)).
- Dynamic arrays and amortized O(1) appends; the extra memory per node in a linked list.
- Cache locality as the practical reason arrays usually win.
- Java specifics: \`ArrayList\` (a dynamic array over \`Object[]\`) versus \`LinkedList\` (doubly linked, also a \`Deque\`), boxing in \`ArrayList<Integer>\` versus a primitive \`int[]\`, and why \`LinkedList.get(i)\` in a loop is O(n²).

**Code / implementation expected:** Optional — a small \`Node\` class with insert, delete and traversal in Java is a common follow-up.`,
        answer: `**Target Audience:** Beginners learning data structures — no prior knowledge assumed.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`javac Main.java && java Main\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture two ways of storing a class's homework. In the first, every notebook goes into a row of numbered lockers, side by side: if you want notebook number 37, you walk straight to locker 37. But if a new student must go in at locker 1, everyone in lockers 1 to 40 has to move one locker to the right.

In the second, the notebooks are spread all over the school, and each one has a sticky note saying where the next one is. Adding a new first notebook is easy: write a sticky note pointing to the old first one, and you are done. But to find notebook 37 you must follow 36 sticky notes, one after another.

The lockers are an **array**. The sticky-note trail is a **linked list**. Neither is better; each makes a different operation cheap. The interview question is really: *which operation does your program do most, and which structure makes that operation cheap?*

## 2. The Array: One Block, Instant Indexing

An array stores its items **next to each other** in one block of memory. Because every slot has the same size, the computer can compute where item i lives with one multiplication: \`address = start + i × size\`. That is why reading \`a[i]\` takes the same time for i = 0 or i = 1,000,000.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="An array stores its items next to each other, so the address of item i is the start plus i times the item size">
  <text class="d-text" x="360" y="30" text-anchor="middle">Array: one block of memory</text>
  <rect class="d-box-accent" x="85" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="140" y="96" text-anchor="middle">10</text>
  <rect class="d-box" x="195" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="250" y="96" text-anchor="middle">20</text>
  <rect class="d-box" x="305" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="360" y="96" text-anchor="middle">30</text>
  <rect class="d-box" x="415" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="470" y="96" text-anchor="middle">40</text>
  <rect class="d-box" x="525" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="580" y="96" text-anchor="middle">50</text>
  <text class="d-sub" x="140" y="146" text-anchor="middle">index 0</text>
  <text class="d-sub" x="250" y="146" text-anchor="middle">index 1</text>
  <text class="d-sub" x="360" y="146" text-anchor="middle">index 2</text>
  <text class="d-sub" x="470" y="146" text-anchor="middle">index 3</text>
  <text class="d-sub" x="580" y="146" text-anchor="middle">index 4</text>
  <text class="d-sub" x="140" y="174" text-anchor="middle">addr 1000</text>
  <text class="d-sub" x="250" y="174" text-anchor="middle">addr 1004</text>
  <text class="d-sub" x="360" y="174" text-anchor="middle">addr 1008</text>
  <text class="d-sub" x="470" y="174" text-anchor="middle">addr 1012</text>
  <text class="d-sub" x="580" y="174" text-anchor="middle">addr 1016</text>
</svg>

With 4-byte integers, item 3 lives at 1000 + 3 × 4 = 1012; no searching is involved.

📌 **Interview term: Contiguous memory** — stored in one unbroken block, item after item, with no gaps.

📌 **Interview term: Random access** — reading any position directly by its index in O(1), without visiting the items before it.

The price: to insert or delete anywhere except the end, every later item must shift by one slot, which is O(n). And a fixed-size block can fill up, which is what dynamic arrays solve (below).

## 3. The Linked List: Nodes and Pointers

A linked list stores each item in its own small object called a **node**, which can live anywhere in memory. Each node holds the value and a **pointer** (a reference) to the next node. The list itself only remembers the first node, the **head**.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 190" role="img" aria-label="A linked list stores nodes anywhere in memory; each node holds a value and the address of the next node">
  <defs>
    <marker id="b02q2-java-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="85" y="34" text-anchor="middle">head</text>
  <path class="d-edge-accent" d="M 85 42 L 85 70" marker-end="url(#b02q2-java-arrow)"/>
  <rect class="d-box-accent" x="30" y="76" width="110" height="80" rx="10"/>
  <text class="d-text" x="85" y="108" text-anchor="middle">10</text>
  <text class="d-sub" x="85" y="136" text-anchor="middle">at 7200</text>
  <path class="d-edge" d="M 144 116 L 204 116" marker-end="url(#b02q2-java-arrow)"/>
  <rect class="d-box" x="210" y="76" width="110" height="80" rx="10"/>
  <text class="d-text" x="265" y="108" text-anchor="middle">20</text>
  <text class="d-sub" x="265" y="136" text-anchor="middle">at 3104</text>
  <path class="d-edge" d="M 324 116 L 384 116" marker-end="url(#b02q2-java-arrow)"/>
  <rect class="d-box" x="390" y="76" width="110" height="80" rx="10"/>
  <text class="d-text" x="445" y="108" text-anchor="middle">30</text>
  <text class="d-sub" x="445" y="136" text-anchor="middle">at 9952</text>
  <path class="d-edge" d="M 504 116 L 564 116" marker-end="url(#b02q2-java-arrow)"/>
  <rect class="d-box-muted" x="570" y="76" width="110" height="80" rx="10"/>
  <text class="d-text" x="625" y="108" text-anchor="middle">40</text>
  <text class="d-sub" x="625" y="136" text-anchor="middle">next is null</text>
</svg>

The addresses jump around (7200, 3104, 9952...), so there is no formula for "where is item i?". You must start at the head and follow i pointers: O(n).

📌 **Interview term: Node** — one element of a linked structure: a value plus one or more references to other nodes.

📌 **Interview term: Head (and tail)** — the first node of a linked list (and the last). Keeping a tail reference makes appending O(1).

📌 **Interview term: Singly vs doubly linked list** — in a singly linked list each node points only to the next one; in a doubly linked list it also points to the previous one, which allows walking backwards and O(1) removal of a node you already hold.

## 4. Where Each One Wins: Inserting at the Front

Inserting at the front shows the trade-off most clearly. In an array, every item moves:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="Inserting 5 at the front of an array moves every existing item one slot to the right">
  <defs>
    <marker id="b02q2a-java-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="60" y="72" text-anchor="middle">before</text>
  <rect class="d-box" x="130" y="45" width="100" height="50" rx="4"/>
  <text class="d-text" x="180" y="76" text-anchor="middle">10</text>
  <rect class="d-box" x="230" y="45" width="100" height="50" rx="4"/>
  <text class="d-text" x="280" y="76" text-anchor="middle">20</text>
  <rect class="d-box" x="330" y="45" width="100" height="50" rx="4"/>
  <text class="d-text" x="380" y="76" text-anchor="middle">30</text>
  <rect class="d-box" x="430" y="45" width="100" height="50" rx="4"/>
  <text class="d-text" x="480" y="76" text-anchor="middle">40</text>
  <rect class="d-box-muted" x="530" y="45" width="100" height="50" rx="4"/>
  <text class="d-sub" x="580" y="76" text-anchor="middle">free</text>
  <path class="d-edge-dashed" d="M 180 99 L 274 160" marker-end="url(#b02q2a-java-arrow)"/>
  <path class="d-edge-dashed" d="M 280 99 L 374 160" marker-end="url(#b02q2a-java-arrow)"/>
  <path class="d-edge-dashed" d="M 380 99 L 474 160" marker-end="url(#b02q2a-java-arrow)"/>
  <path class="d-edge-dashed" d="M 480 99 L 574 160" marker-end="url(#b02q2a-java-arrow)"/>
  <text class="d-sub" x="60" y="197" text-anchor="middle">after</text>
  <rect class="d-box-accent" x="130" y="170" width="100" height="50" rx="4"/>
  <text class="d-text d-accent" x="180" y="201" text-anchor="middle">5</text>
  <rect class="d-box" x="230" y="170" width="100" height="50" rx="4"/>
  <text class="d-text" x="280" y="201" text-anchor="middle">10</text>
  <rect class="d-box" x="330" y="170" width="100" height="50" rx="4"/>
  <text class="d-text" x="380" y="201" text-anchor="middle">20</text>
  <rect class="d-box" x="430" y="170" width="100" height="50" rx="4"/>
  <text class="d-text" x="480" y="201" text-anchor="middle">30</text>
  <rect class="d-box" x="530" y="170" width="100" height="50" rx="4"/>
  <text class="d-text" x="580" y="201" text-anchor="middle">40</text>
</svg>

In a linked list, you create one node and point it at the old head. Nothing else moves:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 170" role="img" aria-label="Inserting 5 at the front of a linked list creates one node and points it at the old head; nothing else moves">
  <defs>
    <marker id="b02q2b-java-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="85" y="34" text-anchor="middle">new head</text>
  <rect class="d-box-accent" x="30" y="60" width="110" height="60" rx="10"/>
  <text class="d-text d-accent" x="85" y="96" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 144 90 L 214 90" marker-end="url(#b02q2b-java-arrow)"/>
  <rect class="d-box" x="220" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="275" y="96" text-anchor="middle">10</text>
  <path class="d-edge" d="M 334 90 L 404 90" marker-end="url(#b02q2b-java-arrow)"/>
  <rect class="d-box" x="410" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="465" y="96" text-anchor="middle">20</text>
  <path class="d-edge" d="M 524 90 L 584 90" marker-end="url(#b02q2b-java-arrow)"/>
  <rect class="d-box-muted" x="590" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="645" y="96" text-anchor="middle">30</text>
  <text class="d-sub" x="275" y="150" text-anchor="middle">old head, not moved</text>
</svg>

The same holds anywhere in the list **once you already hold the node** you want to insert after: relinking is O(1). The catch interviewers look for: *finding* that node from the head is still O(n). So "linked lists have O(1) insertion in the middle" is only true if you are already there. Example 1 counts it: inserting in the middle of 100,000 items costs the array 50,000 moves, and costs the list 49,999 hops to get there plus 1 relink.

## 5. Dynamic Arrays: Why Appending Is Still Cheap

Real programs rarely know the final size up front. A **dynamic array** keeps a block with spare room (its **capacity**). Appending writes into the spare room, which is O(1). When the room runs out, it allocates a bigger block (typically 1.5 to 2 times larger), copies everything over, and frees the old one. That copy is O(n), but it happens so rarely that the average cost per append stays O(1). This is the classic example of [amortized analysis](/interview-question/what-is-amortized-analysis).

📌 **Interview term: Dynamic array** — an array that grows automatically by reallocating into a bigger block when full (Python \`list\`, JavaScript arrays, Java \`ArrayList\`, C++ \`std::vector\`).

📌 **Interview term: Amortized O(1)** — an operation that is occasionally expensive but averages out to constant time over a long sequence of operations.

## 6. The Hidden Factor: Cache Locality

Big-O treats every memory read as equal, but real CPUs read memory in chunks (cache lines) and keep recently used chunks close by. Walking an array reads neighbouring items that are already in the cache; walking a linked list jumps to a new, possibly uncached address at every node. So even for an O(n) walk that both structures share, arrays are usually much faster in practice. This is why dynamic arrays are the default choice in almost every language, and linked lists are used only when their specific strength is needed.

📌 **Interview term: Cache locality** — the speed benefit of accessing memory locations close to ones accessed recently; arrays have it, linked lists mostly do not.

## 7. Side-by-Side Comparison

| Operation | Array (dynamic) | Singly linked list | Why |
| :--- | :--- | :--- | :--- |
| Read item i | **O(1)** | O(n) | address formula vs walking i nodes |
| Insert/delete at front | O(n) | **O(1)** | shift everything vs relink the head |
| Insert/delete at end | **O(1)** amortized | O(1) with a tail pointer (delete at end is O(n) without a previous pointer) | spare capacity vs tail link |
| Insert/delete in the middle, given the position | O(n) | **O(1)** relink, but O(n) to find the spot | shifting vs relinking |
| Search for a value | O(n) (O(log n) if sorted) | O(n) | arrays allow binary search; lists cannot jump |
| Extra memory per item | none (plus spare capacity) | one or two pointers per node | the links themselves |
| Cache behaviour | excellent | poor | contiguous vs scattered |

Linked lists show up in interviews mostly as a structure to manipulate: [reversing a list](/interview-question/how-do-you-reverse-a-linked-list), [finding the middle](/interview-question/how-do-you-find-the-middle-of-a-linked-list), [detecting a cycle](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list), and as a building block, for example the doubly linked list inside an [LRU cache](/interview-question/how-do-you-design-an-lru-cache).

## 8. In Java: int[], ArrayList and LinkedList

- **\`int[]\`** is a true contiguous array of primitive values with a fixed length.
- **\`ArrayList<E>\`** is a dynamic array over an \`Object[]\`. Reading the private \`elementData\` field by reflection on OpenJDK 21 showed the capacity growing by about 1.5 times each time it filled:

~~~text
ArrayList capacities: 10 15 22 33 49 73 109 163 244
~~~

  **Boxing:** because it stores references, \`ArrayList<Integer>\` holds pointers to boxed \`Integer\` objects, not the numbers themselves, which costs memory and locality compared with \`int[]\`.
* **\`LinkedList<E>\`** is a doubly linked list that also implements \`Deque\`. Its Javadoc says that operations that index into the list "traverse the list from the beginning or the end, whichever is closer", so \`get(i)\` is O(n). A loop \`for (int i = 0; i < list.size(); i++) list.get(i)\` is therefore O(n²); iterate with for-each or an \`Iterator\` instead.
* **Prefer \`ArrayDeque\`** for stacks and queues; it is array-based and avoids one node object per element.
* **For interview problems you write the node class:**

~~~java
static final class Node {
    int val;
    Node next;
    Node(int val, Node next) { this.val = val; this.next = next; }
}
~~~

**Why \`static\`:** making it a \`static\` nested class means it does not hold a hidden reference to an outer \`Main\` instance. Compare nodes with \`==\` (same object), which is exactly right here, unlike for \`Integer\` values.

## 9. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`javac Main.java && java Main\`; the blocks are the exact standard output.

**Example 1 — counting array moves and list hops for n = 10, 1,000 and 100,000**

~~~text
n=10: get(last) array=1 list=9 | insert(0) array=10 list=1 | insert(mid) array=5 list=4+1
n=1000: get(last) array=1 list=999 | insert(0) array=1000 list=1 | insert(mid) array=500 list=499+1
n=100000: get(last) array=1 list=99999 | insert(0) array=100000 list=1 | insert(mid) array=50000 list=49999+1
~~~

**Example 2 — a singly linked list with push, insert, remove and print**

~~~text
empty:            null
after pushes:     10 -> 20 -> 40 -> null
insert 30 after 20: 10 -> 20 -> 30 -> 40 -> null
remove 10: true  -> 20 -> 30 -> 40 -> null
remove 40: true  -> 20 -> 30 -> null
remove 99: false -> 20 -> 30 -> null
push_back 50:     20 -> 30 -> 50 -> null  (size 3)
~~~

**Reading Example 1:** \`get(last)\` costs the array 1 step at every size, while the list needs n − 1 hops. Inserting at index 0 reverses the picture: n moves for the array, 1 link for the list. In the middle, the list's insert is cheap only after it has walked there, so both end up proportional to n.

## 10. Complexity of the Example Code

| Operation in Example 2 | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| push front | O(1) | O(1) | one new node, one link |
| push back (with tail) | O(1) | O(1) | the tail reference avoids a walk |
| find | O(n) | O(1) | must walk from the head |
| insert after a held node | O(1) | O(1) | two link changes |
| remove by value | O(n) | O(1) | walk to find the previous node, then one link change |
| print | O(n) | O(n) | visits every node and builds the string |

## 11. Edge Cases to Mention

- **Empty structure:** \`head\` is null; every operation must check it (Example 2 prints \`null\` for an empty list).
- **One node:** removing it must update both head and tail.
- **Removing the head or the tail:** these are special cases in a singly linked list; forgetting to update \`tail\` leaves it pointing at a removed node.
- **Value not found:** return false or null instead of crashing (Example 2: \`remove 99: false\`).
- **Index out of range:** arrays need a bounds check; a list walk must stop at null.

## 12. Common Pitfalls

- **Saying "linked lists have O(1) insertion" without the condition.** Only when you already hold the neighbouring node (with \`LinkedList\`, through a \`ListIterator\`); finding it is O(n).
- **Calling \`LinkedList.get(i)\` in a loop.** Each call walks from an end, so the loop is O(n²). Use for-each.
- **Choosing \`LinkedList\` for a queue by habit.** \`ArrayDeque\` is usually faster and uses less memory.
- **Removing from a list while iterating with for-each.** It throws \`ConcurrentModificationException\`; use \`Iterator.remove()\` or \`removeIf\`.
- **Forgetting to update \`tail\` when removing the last node** in a hand-written list; \`pushBack\` then links onto a removed node.
- **Confusing \`ArrayList.remove(int index)\` with \`remove(Object o)\`.** On an \`ArrayList<Integer>\`, \`remove(1)\` removes index 1, not the value 1; use \`remove(Integer.valueOf(1))\` for the value.

## 13. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core difference:</strong> <span style="color:#f0e2c8;">An array keeps items side by side in one block; a linked list keeps separate node objects joined by references.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What each makes cheap:</strong> <span style="color:#f0e2c8;">Arrays give O(1) indexing and good cache use; linked lists give O(1) insert or delete at a node you already hold, but O(n) to reach item i.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Java classes:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> is fixed and primitive, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code> is a dynamic array (about 1.5x growth on OpenJDK 21, amortized O(1) <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add</code>), and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LinkedList</code> is doubly linked and also a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deque</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Java traps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LinkedList.get(i)</code> walks the list, so indexed loops are O(n²); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList&lt;Integer&gt;</code> boxes every value; for queues I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The default:</strong> <span style="color:#f0e2c8;">Unless I need O(1) inserts at positions I already hold, I choose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>, because contiguous memory is faster in practice.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is indexing an array O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every slot has the same size, so the address of item i is start plus i times the slot size: one calculation, no walk.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LinkedList.add(0, x)</code> faster than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ArrayList.add(0, x)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In Big-O, yes: O(1) against O(n), because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code> shifts every element with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">System.arraycopy</code>. For small lists the copy is very fast, so measure before switching.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ArrayList.add</code> amortized O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the backing array is full it allocates one about 1.5 times larger and copies; copies are rare enough that the average cost per add stays constant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you really use a linked list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you hold references to nodes and must remove or insert them in O(1), as in an LRU cache; Java even ships one as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LinkedHashMap</code> with access order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the memory cost of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LinkedList&lt;Integer&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Per element: a node object with three references (item, next, prev) plus the boxed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code>, against one reference slot in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code>, or 4 bytes in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>.</span>
</div>

</div>

## 14. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Contiguous memory** | Stored in one unbroken block, item after item |
| **Random access** | Reading any index directly in O(1) |
| **Node** | A value plus references to other nodes |
| **Head (and tail)** | First (and last) node of a linked list |
| **Singly vs doubly linked list** | Links to the next node only, or to next and previous |
| **Dynamic array** | An array that grows by reallocating into a bigger block |
| **Amortized O(1)** | Occasionally expensive, constant on average over many operations |
| **Cache locality** | Speed gained by reading memory near what was just read |
| **ArrayList** | Java dynamic array over Object[]; amortized O(1) add, O(1) get |

---
**Conclusion:** An array keeps its items in one contiguous block, so it can jump to any index in O(1) and walks memory in a cache-friendly way, but inserting anywhere except the end shifts items in O(n). A linked list keeps nodes joined by references, so relinking at a node you already hold is O(1), but reaching item i costs i hops. Example 1 made both costs visible with counters, and Example 2 built the list operations an interviewer asks for. In Java, that means \`ArrayList\` or \`int[]\` by default, \`ArrayDeque\` for stacks and queues, and \`LinkedList\` or a hand-written \`Node\` only when O(1) relinking is the point.`,
        examples: [
          {
            label: "Counting the work: array moves vs list hops",
            code: `import java.util.*;

public class Main {
    // Count the work, do not time it: element moves for the array,
    // pointer hops for the linked list.

    static final class Node {
        int val;
        Node next;
        Node(int val, Node next) { this.val = val; this.next = next; }
    }

    static Node buildList(int n) {
        Node head = null;
        for (int v = n - 1; v >= 0; v--) head = new Node(v, head);   // 0 -> 1 -> ... -> n-1
        return head;
    }

    static int listGetHops(Node head, int i) {      // walk i hops from the head
        int hops = 0;
        Node node = head;
        while (hops < i) { node = node.next; hops++; }
        return hops;
    }

    // What ArrayList.add(i, val) has to do inside (it uses System.arraycopy), made visible.
    static int arrayInsert(int[] arr, int size, int i, int val) {
        int moves = 0;
        for (int j = size; j > i; j--) { arr[j] = arr[j - 1]; moves++; }
        arr[i] = val;
        return moves;
    }

    static int[] range(int n) {
        int[] a = new int[n + 1];                    // one spare slot for the insert
        for (int i = 0; i < n; i++) a[i] = i;
        return a;
    }

    public static void main(String[] args) {
        for (int n : new int[]{10, 1000, 100000}) {
            Node head = buildList(n);
            int hopsLast = listGetHops(head, n - 1);              // array: arr[n - 1] is 1 step
            int frontMoves = arrayInsert(range(n), n, 0, -1);     // list: 1 new node, 1 link
            int mid = n / 2;
            int midMoves = arrayInsert(range(n), n, mid, -1);
            int hopsMid = listGetHops(head, mid - 1);             // list walks to the node before mid
            System.out.println("n=" + n + ": get(last) array=1 list=" + hopsLast
                    + " | insert(0) array=" + frontMoves + " list=1"
                    + " | insert(mid) array=" + midMoves + " list=" + hopsMid + "+1");
        }
    }
}`,
          },
          {
            label: "A singly linked list from scratch",
            code: `public class Main {
    // A singly linked list from scratch: the operations an interviewer asks for.

    static final class Node {
        int val;
        Node next;
        Node(int val, Node next) { this.val = val; this.next = next; }
    }

    static final class LinkedList {
        Node head, tail;                 // keeping a tail makes pushBack O(1)
        int size;

        void pushFront(int val) {
            head = new Node(val, head);
            if (tail == null) tail = head;
            size++;
        }
        void pushBack(int val) {
            Node node = new Node(val, null);
            if (tail == null) head = tail = node;
            else { tail.next = node; tail = node; }
            size++;
        }
        Node find(int val) {             // O(n): no index, so we must walk
            Node node = head;
            while (node != null && node.val != val) node = node.next;
            return node;
        }
        void insertAfter(Node node, int val) {   // O(1) once you hold the node
            node.next = new Node(val, node.next);
            if (node == tail) tail = node.next;
            size++;
        }
        boolean remove(int val) {        // O(n) to find the node before it, O(1) to unlink
            Node prev = null, node = head;
            while (node != null && node.val != val) { prev = node; node = node.next; }
            if (node == null) return false;
            if (prev == null) head = node.next;
            else prev.next = node.next;
            if (node == tail) tail = prev;
            size--;
            return true;
        }
        @Override public String toString() {
            StringBuilder sb = new StringBuilder();
            for (Node n = head; n != null; n = n.next) sb.append(n.val).append(" -> ");
            return sb.append("null").toString();
        }
    }

    public static void main(String[] args) {
        LinkedList lst = new LinkedList();
        System.out.println("empty:            " + lst);
        lst.pushFront(20);
        lst.pushFront(10);
        lst.pushBack(40);
        System.out.println("after pushes:     " + lst);
        lst.insertAfter(lst.find(20), 30);
        System.out.println("insert 30 after 20: " + lst);
        System.out.println("remove 10: " + lst.remove(10) + "  -> " + lst);
        System.out.println("remove 40: " + lst.remove(40) + "  -> " + lst);
        System.out.println("remove 99: " + lst.remove(99) + " -> " + lst);
        lst.pushBack(50);
        System.out.println("push_back 50:     " + lst + "  (size " + lst.size + ")");
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Explain the difference between an array and a linked list. When would you pick one over the other, and what does each look like in C++? If there is time, sketch a small linked list in C++."

**What a strong answer should cover:**
- Memory layout: one contiguous block versus separate nodes joined by references.
- Costs: O(1) indexing versus O(n) walking; O(n) front inserts versus O(1) relinking at a node you already hold (and that finding the node is still O(n)).
- Dynamic arrays and amortized O(1) appends; the extra memory per node in a linked list.
- Cache locality as the practical reason arrays usually win.
- C++ specifics: \`std::vector\` (contiguous, amortized O(1) \`push_back\`) versus \`std::list\`/\`std::forward_list\`, iterator and pointer invalidation when a vector reallocates, and who frees the nodes of a hand-written list.

**Code / implementation expected:** Optional — a small \`Node\` struct with insert, delete, traversal and correct cleanup in C++ is a common follow-up.`,
        answer: `**Target Audience:** Beginners learning data structures — no prior knowledge assumed.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`g++ -std=c++17 main.cpp && ./a.out\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture two ways of storing a class's homework. In the first, every notebook goes into a row of numbered lockers, side by side: if you want notebook number 37, you walk straight to locker 37. But if a new student must go in at locker 1, everyone in lockers 1 to 40 has to move one locker to the right.

In the second, the notebooks are spread all over the school, and each one has a sticky note saying where the next one is. Adding a new first notebook is easy: write a sticky note pointing to the old first one, and you are done. But to find notebook 37 you must follow 36 sticky notes, one after another.

The lockers are an **array**. The sticky-note trail is a **linked list**. Neither is better; each makes a different operation cheap. The interview question is really: *which operation does your program do most, and which structure makes that operation cheap?*

## 2. The Array: One Block, Instant Indexing

An array stores its items **next to each other** in one block of memory. Because every slot has the same size, the computer can compute where item i lives with one multiplication: \`address = start + i × size\`. That is why reading \`a[i]\` takes the same time for i = 0 or i = 1,000,000.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="An array stores its items next to each other, so the address of item i is the start plus i times the item size">
  <text class="d-text" x="360" y="30" text-anchor="middle">Array: one block of memory</text>
  <rect class="d-box-accent" x="85" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="140" y="96" text-anchor="middle">10</text>
  <rect class="d-box" x="195" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="250" y="96" text-anchor="middle">20</text>
  <rect class="d-box" x="305" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="360" y="96" text-anchor="middle">30</text>
  <rect class="d-box" x="415" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="470" y="96" text-anchor="middle">40</text>
  <rect class="d-box" x="525" y="60" width="110" height="60" rx="4"/>
  <text class="d-text" x="580" y="96" text-anchor="middle">50</text>
  <text class="d-sub" x="140" y="146" text-anchor="middle">index 0</text>
  <text class="d-sub" x="250" y="146" text-anchor="middle">index 1</text>
  <text class="d-sub" x="360" y="146" text-anchor="middle">index 2</text>
  <text class="d-sub" x="470" y="146" text-anchor="middle">index 3</text>
  <text class="d-sub" x="580" y="146" text-anchor="middle">index 4</text>
  <text class="d-sub" x="140" y="174" text-anchor="middle">addr 1000</text>
  <text class="d-sub" x="250" y="174" text-anchor="middle">addr 1004</text>
  <text class="d-sub" x="360" y="174" text-anchor="middle">addr 1008</text>
  <text class="d-sub" x="470" y="174" text-anchor="middle">addr 1012</text>
  <text class="d-sub" x="580" y="174" text-anchor="middle">addr 1016</text>
</svg>

With 4-byte integers, item 3 lives at 1000 + 3 × 4 = 1012; no searching is involved.

📌 **Interview term: Contiguous memory** — stored in one unbroken block, item after item, with no gaps.

📌 **Interview term: Random access** — reading any position directly by its index in O(1), without visiting the items before it.

The price: to insert or delete anywhere except the end, every later item must shift by one slot, which is O(n). And a fixed-size block can fill up, which is what dynamic arrays solve (below).

## 3. The Linked List: Nodes and Pointers

A linked list stores each item in its own small object called a **node**, which can live anywhere in memory. Each node holds the value and a **pointer** (a reference) to the next node. The list itself only remembers the first node, the **head**.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 190" role="img" aria-label="A linked list stores nodes anywhere in memory; each node holds a value and the address of the next node">
  <defs>
    <marker id="b02q2-cpp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="85" y="34" text-anchor="middle">head</text>
  <path class="d-edge-accent" d="M 85 42 L 85 70" marker-end="url(#b02q2-cpp-arrow)"/>
  <rect class="d-box-accent" x="30" y="76" width="110" height="80" rx="10"/>
  <text class="d-text" x="85" y="108" text-anchor="middle">10</text>
  <text class="d-sub" x="85" y="136" text-anchor="middle">at 7200</text>
  <path class="d-edge" d="M 144 116 L 204 116" marker-end="url(#b02q2-cpp-arrow)"/>
  <rect class="d-box" x="210" y="76" width="110" height="80" rx="10"/>
  <text class="d-text" x="265" y="108" text-anchor="middle">20</text>
  <text class="d-sub" x="265" y="136" text-anchor="middle">at 3104</text>
  <path class="d-edge" d="M 324 116 L 384 116" marker-end="url(#b02q2-cpp-arrow)"/>
  <rect class="d-box" x="390" y="76" width="110" height="80" rx="10"/>
  <text class="d-text" x="445" y="108" text-anchor="middle">30</text>
  <text class="d-sub" x="445" y="136" text-anchor="middle">at 9952</text>
  <path class="d-edge" d="M 504 116 L 564 116" marker-end="url(#b02q2-cpp-arrow)"/>
  <rect class="d-box-muted" x="570" y="76" width="110" height="80" rx="10"/>
  <text class="d-text" x="625" y="108" text-anchor="middle">40</text>
  <text class="d-sub" x="625" y="136" text-anchor="middle">next is null</text>
</svg>

The addresses jump around (7200, 3104, 9952...), so there is no formula for "where is item i?". You must start at the head and follow i pointers: O(n).

📌 **Interview term: Node** — one element of a linked structure: a value plus one or more references to other nodes.

📌 **Interview term: Head (and tail)** — the first node of a linked list (and the last). Keeping a tail reference makes appending O(1).

📌 **Interview term: Singly vs doubly linked list** — in a singly linked list each node points only to the next one; in a doubly linked list it also points to the previous one, which allows walking backwards and O(1) removal of a node you already hold.

## 4. Where Each One Wins: Inserting at the Front

Inserting at the front shows the trade-off most clearly. In an array, every item moves:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="Inserting 5 at the front of an array moves every existing item one slot to the right">
  <defs>
    <marker id="b02q2a-cpp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="60" y="72" text-anchor="middle">before</text>
  <rect class="d-box" x="130" y="45" width="100" height="50" rx="4"/>
  <text class="d-text" x="180" y="76" text-anchor="middle">10</text>
  <rect class="d-box" x="230" y="45" width="100" height="50" rx="4"/>
  <text class="d-text" x="280" y="76" text-anchor="middle">20</text>
  <rect class="d-box" x="330" y="45" width="100" height="50" rx="4"/>
  <text class="d-text" x="380" y="76" text-anchor="middle">30</text>
  <rect class="d-box" x="430" y="45" width="100" height="50" rx="4"/>
  <text class="d-text" x="480" y="76" text-anchor="middle">40</text>
  <rect class="d-box-muted" x="530" y="45" width="100" height="50" rx="4"/>
  <text class="d-sub" x="580" y="76" text-anchor="middle">free</text>
  <path class="d-edge-dashed" d="M 180 99 L 274 160" marker-end="url(#b02q2a-cpp-arrow)"/>
  <path class="d-edge-dashed" d="M 280 99 L 374 160" marker-end="url(#b02q2a-cpp-arrow)"/>
  <path class="d-edge-dashed" d="M 380 99 L 474 160" marker-end="url(#b02q2a-cpp-arrow)"/>
  <path class="d-edge-dashed" d="M 480 99 L 574 160" marker-end="url(#b02q2a-cpp-arrow)"/>
  <text class="d-sub" x="60" y="197" text-anchor="middle">after</text>
  <rect class="d-box-accent" x="130" y="170" width="100" height="50" rx="4"/>
  <text class="d-text d-accent" x="180" y="201" text-anchor="middle">5</text>
  <rect class="d-box" x="230" y="170" width="100" height="50" rx="4"/>
  <text class="d-text" x="280" y="201" text-anchor="middle">10</text>
  <rect class="d-box" x="330" y="170" width="100" height="50" rx="4"/>
  <text class="d-text" x="380" y="201" text-anchor="middle">20</text>
  <rect class="d-box" x="430" y="170" width="100" height="50" rx="4"/>
  <text class="d-text" x="480" y="201" text-anchor="middle">30</text>
  <rect class="d-box" x="530" y="170" width="100" height="50" rx="4"/>
  <text class="d-text" x="580" y="201" text-anchor="middle">40</text>
</svg>

In a linked list, you create one node and point it at the old head. Nothing else moves:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 170" role="img" aria-label="Inserting 5 at the front of a linked list creates one node and points it at the old head; nothing else moves">
  <defs>
    <marker id="b02q2b-cpp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="85" y="34" text-anchor="middle">new head</text>
  <rect class="d-box-accent" x="30" y="60" width="110" height="60" rx="10"/>
  <text class="d-text d-accent" x="85" y="96" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 144 90 L 214 90" marker-end="url(#b02q2b-cpp-arrow)"/>
  <rect class="d-box" x="220" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="275" y="96" text-anchor="middle">10</text>
  <path class="d-edge" d="M 334 90 L 404 90" marker-end="url(#b02q2b-cpp-arrow)"/>
  <rect class="d-box" x="410" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="465" y="96" text-anchor="middle">20</text>
  <path class="d-edge" d="M 524 90 L 584 90" marker-end="url(#b02q2b-cpp-arrow)"/>
  <rect class="d-box-muted" x="590" y="60" width="110" height="60" rx="10"/>
  <text class="d-text" x="645" y="96" text-anchor="middle">30</text>
  <text class="d-sub" x="275" y="150" text-anchor="middle">old head, not moved</text>
</svg>

The same holds anywhere in the list **once you already hold the node** you want to insert after: relinking is O(1). The catch interviewers look for: *finding* that node from the head is still O(n). So "linked lists have O(1) insertion in the middle" is only true if you are already there. Example 1 counts it: inserting in the middle of 100,000 items costs the array 50,000 moves, and costs the list 49,999 hops to get there plus 1 relink.

## 5. Dynamic Arrays: Why Appending Is Still Cheap

Real programs rarely know the final size up front. A **dynamic array** keeps a block with spare room (its **capacity**). Appending writes into the spare room, which is O(1). When the room runs out, it allocates a bigger block (typically 1.5 to 2 times larger), copies everything over, and frees the old one. That copy is O(n), but it happens so rarely that the average cost per append stays O(1). This is the classic example of [amortized analysis](/interview-question/what-is-amortized-analysis).

📌 **Interview term: Dynamic array** — an array that grows automatically by reallocating into a bigger block when full (Python \`list\`, JavaScript arrays, Java \`ArrayList\`, C++ \`std::vector\`).

📌 **Interview term: Amortized O(1)** — an operation that is occasionally expensive but averages out to constant time over a long sequence of operations.

## 6. The Hidden Factor: Cache Locality

Big-O treats every memory read as equal, but real CPUs read memory in chunks (cache lines) and keep recently used chunks close by. Walking an array reads neighbouring items that are already in the cache; walking a linked list jumps to a new, possibly uncached address at every node. So even for an O(n) walk that both structures share, arrays are usually much faster in practice. This is why dynamic arrays are the default choice in almost every language, and linked lists are used only when their specific strength is needed.

📌 **Interview term: Cache locality** — the speed benefit of accessing memory locations close to ones accessed recently; arrays have it, linked lists mostly do not.

## 7. Side-by-Side Comparison

| Operation | Array (dynamic) | Singly linked list | Why |
| :--- | :--- | :--- | :--- |
| Read item i | **O(1)** | O(n) | address formula vs walking i nodes |
| Insert/delete at front | O(n) | **O(1)** | shift everything vs relink the head |
| Insert/delete at end | **O(1)** amortized | O(1) with a tail pointer (delete at end is O(n) without a previous pointer) | spare capacity vs tail link |
| Insert/delete in the middle, given the position | O(n) | **O(1)** relink, but O(n) to find the spot | shifting vs relinking |
| Search for a value | O(n) (O(log n) if sorted) | O(n) | arrays allow binary search; lists cannot jump |
| Extra memory per item | none (plus spare capacity) | one or two pointers per node | the links themselves |
| Cache behaviour | excellent | poor | contiguous vs scattered |

Linked lists show up in interviews mostly as a structure to manipulate: [reversing a list](/interview-question/how-do-you-reverse-a-linked-list), [finding the middle](/interview-question/how-do-you-find-the-middle-of-a-linked-list), [detecting a cycle](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list), and as a building block, for example the doubly linked list inside an [LRU cache](/interview-question/how-do-you-design-an-lru-cache).

## 8. In C++: std::vector, std::list and a Hand-Made List

- **\`std::vector<T>\`** stores its elements contiguously (\`v.data()\` gives a pointer to a plain array). \`push_back\` is amortized O(1). The growth factor is up to the library; with g++ 13 (libstdc++) the capacity doubled each time:

~~~text
1 2 4 8 16 32 64 128
~~~

  **Tip:** use \`reserve(n)\` when you know the final size to avoid every reallocation.
* **Iterator invalidation.** When a vector reallocates, its elements move to a new block, so every iterator, pointer and reference into it becomes invalid. Nodes of a \`std::list\` never move. A small check with g++ 13:

~~~text
capacity before: 3
capacity after: 6, buffer moved: true
list front still at same address: true
~~~

* **\`std::list<T>\`** is doubly linked and **\`std::forward_list<T>\`** singly linked. Both give O(1) \`insert\`/\`erase\` at an iterator you hold, \`splice\` to move nodes between lists without copying, and no \`operator[]\`.
- **A hand-written list must free its nodes.** With raw \`new\`, write a destructor that walks and deletes every node, and delete (or implement) copying, otherwise a copy would free the same nodes twice. Example 2 does both; \`std::unique_ptr<Node>\` for \`next\` is the alternative, but very long lists then risk a deep recursive destructor.

~~~cpp
struct Node {
    int val;
    Node* next;
};
~~~

## 9. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`g++ -std=c++17 main.cpp && ./a.out\`; the blocks are the exact standard output.

**Example 1 — counting array moves and list hops for n = 10, 1,000 and 100,000**

~~~text
n=10: get(last) array=1 list=9 | insert(0) array=10 list=1 | insert(mid) array=5 list=4+1
n=1000: get(last) array=1 list=999 | insert(0) array=1000 list=1 | insert(mid) array=500 list=499+1
n=100000: get(last) array=1 list=99999 | insert(0) array=100000 list=1 | insert(mid) array=50000 list=49999+1
~~~

**Example 2 — a singly linked list with push, insert, remove and print**

~~~text
empty:            null
after pushes:     10 -> 20 -> 40 -> null
insert 30 after 20: 10 -> 20 -> 30 -> 40 -> null
remove 10: true  -> 20 -> 30 -> 40 -> null
remove 40: true  -> 20 -> 30 -> null
remove 99: false -> 20 -> 30 -> null
push_back 50:     20 -> 30 -> 50 -> null  (size 3)
~~~

**Reading Example 1:** \`get(last)\` costs the array 1 step at every size, while the list needs n − 1 hops. Inserting at index 0 reverses the picture: n moves for the array, 1 link for the list. In the middle, the list's insert is cheap only after it has walked there, so both end up proportional to n.

## 10. Complexity of the Example Code

| Operation in Example 2 | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| push front | O(1) | O(1) | one new node, one link |
| push back (with tail) | O(1) | O(1) | the tail reference avoids a walk |
| find | O(n) | O(1) | must walk from the head |
| insert after a held node | O(1) | O(1) | two link changes |
| remove by value | O(n) | O(1) | walk to find the previous node, then one link change |
| print | O(n) | O(n) | visits every node and builds the string |

## 11. Edge Cases to Mention

- **Empty structure:** \`head\` is null; every operation must check it (Example 2 prints \`null\` for an empty list).
- **One node:** removing it must update both head and tail.
- **Removing the head or the tail:** these are special cases in a singly linked list; forgetting to update \`tail\` leaves it pointing at a removed node.
- **Value not found:** return false or null instead of crashing (Example 2: \`remove 99: false\`).
- **Index out of range:** arrays need a bounds check; a list walk must stop at null.

## 12. Common Pitfalls

- **Saying "linked lists have O(1) insertion" without the condition.** Only at an iterator or node you already hold; finding it is O(n).
- **Keeping a pointer, reference or iterator into a vector across \`push_back\`.** A reallocation invalidates it, and using it is undefined behaviour. Reserve first, or store indices.
- **Leaking or double-freeing nodes.** A raw-pointer list needs a destructor, and copying must be deleted or written as a deep copy (rule of three).
- **Calling \`delete\` on a node and then reading \`node->next\`.** Save \`next\` first, as \`freeList\` does in Example 1.
- **Choosing \`std::list\` for speed by default.** Its nodes are scattered, so traversal is much slower than a vector in practice; benchmark before choosing it.
- **\`vector::erase\` in a loop with a stale iterator.** \`erase\` returns the next valid iterator; use \`it = v.erase(it)\`.

## 13. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core difference:</strong> <span style="color:#f0e2c8;">An array keeps items side by side in one block; a linked list keeps separate nodes joined by pointers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What each makes cheap:</strong> <span style="color:#f0e2c8;">Arrays give O(1) indexing and good cache use; linked lists give O(1) insert or erase at an iterator you hold, but O(n) to reach item i.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. C++ containers:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> is contiguous with amortized O(1) <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::list</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::forward_list</code> are doubly and singly linked with O(1) <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">erase</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. C++ traps:</strong> <span style="color:#f0e2c8;">A vector reallocation invalidates all iterators, pointers and references; a hand-written list must free its nodes and must not be copied shallowly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The default:</strong> <span style="color:#f0e2c8;">I choose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> unless I need stable addresses or O(1) splicing, because contiguous memory wins in practice.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is indexing a vector O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Elements are contiguous and equally sized, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v[i]</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*(v.data() + i)</code>: one address calculation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When are vector iterators invalidated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On reallocation, all of them. On <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">erase</code> without reallocation, those at or after the change point. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reserve</code> up front avoids reallocations.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">push_back</code> amortized O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When full, the vector allocates a bigger block (libstdc++ doubled it in our run) and moves the elements; the rare O(n) moves average out to O(1) per call.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you really use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::list</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When elements must keep their address, or when you splice ranges between lists in O(1), as in an LRU cache keyed by iterators.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unique_ptr</code> for the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">next</code> pointer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It removes manual <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code>, but destroying a very long list then recurses once per node and can overflow the stack, so a loop-based destructor is still needed.</span>
</div>

</div>

## 14. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Contiguous memory** | Stored in one unbroken block, item after item |
| **Random access** | Reading any index directly in O(1) |
| **Node** | A value plus references to other nodes |
| **Head (and tail)** | First (and last) node of a linked list |
| **Singly vs doubly linked list** | Links to the next node only, or to next and previous |
| **Dynamic array** | An array that grows by reallocating into a bigger block |
| **Amortized O(1)** | Occasionally expensive, constant on average over many operations |
| **Cache locality** | Speed gained by reading memory near what was just read |
| **Iterator invalidation** | An iterator, pointer or reference becoming unusable because the container moved or removed its element |

---
**Conclusion:** An array keeps its items in one contiguous block, so it can jump to any index in O(1) and walks memory in a cache-friendly way, but inserting anywhere except the end shifts items in O(n). A linked list keeps nodes joined by pointers, so relinking at a node you already hold is O(1), but reaching item i costs i hops. Example 1 made both costs visible with counters, and Example 2 built the list operations an interviewer asks for, including freeing the nodes. In C++, \`std::vector\` is the default; \`std::list\` earns its place only when stable addresses or O(1) splicing matter, and either way you must know when iterators are invalidated.`,
        examples: [
          {
            label: "Counting the work: array moves vs list hops",
            code: `#include <iostream>
#include <vector>

// Count the work, do not time it: element moves for the array,
// pointer hops for the linked list.

struct Node {
    int val;
    Node* next;
};

Node* buildList(int n) {
    Node* head = nullptr;
    for (int v = n - 1; v >= 0; v--) head = new Node{v, head};   // 0 -> 1 -> ... -> n-1
    return head;
}

void freeList(Node* head) {                     // no garbage collector: free every node
    while (head) { Node* next = head->next; delete head; head = next; }
}

int listGetHops(Node* head, int i) {            // walk i hops from the head
    int hops = 0;
    while (hops < i) { head = head->next; hops++; }
    return hops;
}

// What vector::insert(begin() + i, val) has to do inside, made visible.
int arrayInsert(std::vector<int> arr, int i, int val) {
    arr.push_back(0);
    int moves = 0;
    for (int j = static_cast<int>(arr.size()) - 1; j > i; j--) { arr[j] = arr[j - 1]; moves++; }
    arr[i] = val;
    return moves;
}

int main() {
    for (int n : {10, 1000, 100000}) {
        std::vector<int> arr(n);
        for (int i = 0; i < n; i++) arr[i] = i;
        Node* head = buildList(n);
        int hopsLast = listGetHops(head, n - 1);                // vector: arr[n - 1] is 1 step
        int frontMoves = arrayInsert(arr, 0, -1);               // list: 1 new node, 1 link
        int mid = n / 2;
        int midMoves = arrayInsert(arr, mid, -1);
        int hopsMid = listGetHops(head, mid - 1);               // list walks to the node before mid
        std::cout << "n=" << n << ": get(last) array=1 list=" << hopsLast
                  << " | insert(0) array=" << frontMoves << " list=1"
                  << " | insert(mid) array=" << midMoves << " list=" << hopsMid << "+1\\n";
        freeList(head);
    }
}`,
          },
          {
            label: "A singly linked list from scratch",
            code: `#include <iostream>
#include <string>

// A singly linked list from scratch: the operations an interviewer asks for.

struct Node {
    int val;
    Node* next;
};

class LinkedList {
public:
    Node* head = nullptr;
    Node* tail = nullptr;                // keeping a tail makes pushBack O(1)
    int size = 0;

    LinkedList() = default;
    LinkedList(const LinkedList&) = delete;            // copying would double-free the nodes
    LinkedList& operator=(const LinkedList&) = delete;
    ~LinkedList() {                                    // free every node we allocated
        while (head) { Node* next = head->next; delete head; head = next; }
    }

    void pushFront(int val) {
        head = new Node{val, head};
        if (!tail) tail = head;
        size++;
    }
    void pushBack(int val) {
        Node* node = new Node{val, nullptr};
        if (!tail) head = tail = node;
        else { tail->next = node; tail = node; }
        size++;
    }
    Node* find(int val) const {          // O(n): no index, so we must walk
        Node* node = head;
        while (node && node->val != val) node = node->next;
        return node;
    }
    void insertAfter(Node* node, int val) {   // O(1) once you hold the node
        node->next = new Node{val, node->next};
        if (node == tail) tail = node->next;
        size++;
    }
    bool remove(int val) {               // O(n) to find the node before it, O(1) to unlink
        Node* prev = nullptr;
        Node* node = head;
        while (node && node->val != val) { prev = node; node = node->next; }
        if (!node) return false;
        if (!prev) head = node->next;
        else prev->next = node->next;
        if (node == tail) tail = prev;
        delete node;
        size--;
        return true;
    }
    std::string str() const {
        std::string s;
        for (Node* n = head; n; n = n->next) s += std::to_string(n->val) + " -> ";
        return s + "null";
    }
};

int main() {
    std::cout << std::boolalpha;
    LinkedList lst;
    std::cout << "empty:            " << lst.str() << "\\n";
    lst.pushFront(20);
    lst.pushFront(10);
    lst.pushBack(40);
    std::cout << "after pushes:     " << lst.str() << "\\n";
    lst.insertAfter(lst.find(20), 30);
    std::cout << "insert 30 after 20: " << lst.str() << "\\n";
    bool r = lst.remove(10);
    std::cout << "remove 10: " << r << "  -> " << lst.str() << "\\n";
    r = lst.remove(40);
    std::cout << "remove 40: " << r << "  -> " << lst.str() << "\\n";
    r = lst.remove(99);
    std::cout << "remove 99: " << r << " -> " << lst.str() << "\\n";
    lst.pushBack(50);
    std::cout << "push_back 50:     " << lst.str() << "  (size " << lst.size << ")\\n";
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between a stack and a queue?",
    difficulty: "easy",
    seoDescription: "Stack (LIFO) vs queue (FIFO): operations, O(1) costs, real uses like undo and scheduling, and the right built-ins in Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"What is the difference between a stack and a queue? Give me a real use for each, and tell me which Python types you would use to implement them and what each operation costs."

**What a strong answer should cover:**
- LIFO versus FIFO, with the operation names (push, pop, peek; enqueue, dequeue).
- All core operations are O(1), and why a queue needs a structure that is cheap at both ends.
- Concrete uses: call stack, undo, bracket matching and DFS for stacks; BFS, scheduling and buffers for queues.
- Related structures: deque, priority queue, circular buffer, a queue built from two stacks.
- Python specifics: a \`list\` is a fine stack (\`append\`/\`pop\`), but a queue needs \`collections.deque\` (\`append\`/\`popleft\`), because \`list.pop(0)\` is O(n); \`queue.Queue\` is for threads, and \`heapq\` for priority queues.

**Code / implementation expected:** Optional — using the right Python built-ins, or a short undo or round-robin example.`,
        answer: `**Target Audience:** Beginners learning data structures — no prior knowledge assumed.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`python3 main.py\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

In a restaurant kitchen, clean plates go onto a pile. The dishwasher puts each new plate **on top**, and the cook takes the plate **from the top**. The plate washed last is used first; the one at the bottom may sit there all evening. That pile is a **stack**.

At the bakery counter outside, customers stand in a line. New customers join **at the back**, and the baker serves **from the front**. Whoever arrived first is served first, which is exactly what makes the line feel fair. That line is a **queue**.

Both hold a collection of things and both only let you add and remove at fixed places, which is what makes them fast and simple. The single difference is *which* item comes out next: the newest (stack) or the oldest (queue). Choosing the wrong one gives you an undo button that undoes your first edit, or a printer that prints the most recent page first.

## 2. The Stack: Last In, First Out

A stack allows three operations, all at one end called the **top**: \`push\` (add on top), \`pop\` (remove from the top) and \`peek\` (look at the top without removing it).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A stack: push and pop both happen at the top, so the last item pushed is the first popped">
  <defs>
    <marker id="b02q3-python-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="110" y="165" text-anchor="middle">Stack (LIFO)</text>
  <text class="d-sub" x="250" y="38" text-anchor="middle">push</text>
  <path class="d-edge" d="M 300 20 L 300 72" marker-end="url(#b02q3-python-arrow)"/>
  <text class="d-sub" x="470" y="38" text-anchor="middle">pop</text>
  <path class="d-edge-accent" d="M 420 76 L 420 24" marker-end="url(#b02q3-python-arrow)"/>
  <rect class="d-box-accent" x="260" y="80" width="200" height="50" rx="4"/>
  <text class="d-text d-accent" x="360" y="111" text-anchor="middle">D (last in)</text>
  <rect class="d-box" x="260" y="130" width="200" height="50" rx="4"/>
  <text class="d-text" x="360" y="161" text-anchor="middle">C</text>
  <rect class="d-box" x="260" y="180" width="200" height="50" rx="4"/>
  <text class="d-text" x="360" y="211" text-anchor="middle">B</text>
  <rect class="d-box-muted" x="260" y="230" width="200" height="50" rx="4"/>
  <text class="d-text" x="360" y="261" text-anchor="middle">A (first in)</text>
  <path class="d-edge-dashed" d="M 560 105 L 466 105" marker-end="url(#b02q3-python-arrow)"/>
  <text class="d-sub" x="600" y="110" text-anchor="middle">top</text>
</svg>

Pushing A, B, C, D and then popping four times gives D, C, B, A: the reverse of the arrival order.

📌 **Interview term: LIFO (Last In, First Out)** — the rule that the most recently added item is the first one removed. It defines a stack.

📌 **Interview term: Push / pop / peek** — add to the top, remove from the top, read the top without removing it. Each is O(1).

📌 **Interview term: Stack underflow** — trying to pop or peek an empty stack. Every language handles it differently (an exception, \`undefined\`, or undefined behaviour), so check for empty first.

## 3. The Queue: First In, First Out

A queue adds at one end (the **back**, or rear) and removes from the other (the **front**). The operations are usually called \`enqueue\` (or \`offer\`, \`push\`, \`append\`) and \`dequeue\` (or \`poll\`, \`popleft\`).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="A queue: items join at the back and leave from the front, so the first item in is the first out">
  <defs>
    <marker id="b02q3q-python-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="34" text-anchor="middle">Queue (FIFO)</text>
  <path class="d-edge-accent" d="M 176 100 L 66 100" marker-end="url(#b02q3q-python-arrow)"/>
  <text class="d-sub" x="115" y="82" text-anchor="middle">dequeue</text>
  <rect class="d-box-accent" x="180" y="70" width="90" height="60" rx="4"/>
  <text class="d-text d-accent" x="225" y="106" text-anchor="middle">A</text>
  <rect class="d-box" x="270" y="70" width="90" height="60" rx="4"/>
  <text class="d-text" x="315" y="106" text-anchor="middle">B</text>
  <rect class="d-box" x="360" y="70" width="90" height="60" rx="4"/>
  <text class="d-text" x="405" y="106" text-anchor="middle">C</text>
  <rect class="d-box-muted" x="450" y="70" width="90" height="60" rx="4"/>
  <text class="d-text" x="495" y="106" text-anchor="middle">D</text>
  <path class="d-edge" d="M 680 100 L 548 100" marker-end="url(#b02q3q-python-arrow)"/>
  <text class="d-sub" x="615" y="82" text-anchor="middle">enqueue</text>
  <text class="d-sub" x="225" y="162" text-anchor="middle">front</text>
  <text class="d-sub" x="495" y="162" text-anchor="middle">back</text>
</svg>

Enqueuing A, B, C, D and then dequeuing four times gives A, B, C, D: the same order they arrived in.

📌 **Interview term: FIFO (First In, First Out)** — the rule that the oldest item is removed first. It defines a queue.

📌 **Interview term: Enqueue / dequeue** — add at the back, remove from the front. Each must be O(1); a queue whose dequeue shifts every element is a bug, not a queue.

## 4. Side-by-Side Comparison

| | Stack | Queue |
| :--- | :--- | :--- |
| Removal order | newest first (LIFO) | oldest first (FIFO) |
| Where you add | top | back |
| Where you remove | top (same end) | front (other end) |
| Core operations | push, pop, peek — all O(1) | enqueue, dequeue, peek — all O(1) |
| Simplest backing | dynamic array, using its end | circular buffer, deque, or linked list with head and tail |
| Typical uses | function calls, undo, matching brackets, depth-first search, expression evaluation | scheduling, buffering, breadth-first search, rate limiting, message queues |

The backing row is the subtle part. A stack only touches one end, so a dynamic array works perfectly: its end is O(1) to add and remove. A queue touches **both** ends, and removing from the front of a plain array shifts everything left, which is O(n). That is why each language has a separate structure for queues (see the language section below).

## 5. Where Each One Shows Up

**Stacks** appear whenever you must come back to something in reverse order:

- **The call stack.** Every function call pushes a frame and every return pops it. Recursion is a stack you do not see; see [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).
- **Undo.** Each edit pushes the previous state; undo pops the most recent one (Example 2).
- **Matching brackets.** Push each opening bracket, pop when a closing one arrives and check that they match: [valid parentheses](/interview-question/how-do-you-check-for-valid-balanced-parentheses).
- **Depth-first search** with an explicit stack, and the [monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it) pattern for "next greater element" problems.

**Queues** appear whenever things must be handled in arrival order:

- **Breadth-first search** visits nodes level by level using a queue; see [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs) and [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree).
- **Scheduling.** Round-robin CPU scheduling gives each task a time slice and sends unfinished tasks to the back (Example 2).
- **Buffers** between a producer and a consumer: keyboard input, network packets, print jobs.

📌 **Interview term: Call stack** — the stack of active function calls the runtime keeps; deep recursion can overflow it.

## 6. Relatives Worth Naming

- **Deque (double-ended queue):** add and remove at both ends in O(1). It can act as a stack or a queue, which is why several languages use one deque type for both.
- **Priority queue:** removes the item with the highest priority, not the oldest; usually a binary heap with O(log n) operations. See [heaps and priority queues](/interview-question/what-is-a-heap-priority-queue).
- **Circular buffer (ring buffer):** a fixed-size array with head and tail indices that wrap around, giving an O(1) queue without shifting.
- **A queue from two stacks:** a classic interview exercise with amortized O(1) operations; see [implementing a queue using two stacks](/interview-question/how-do-you-implement-a-queue-using-two-stacks). The reverse direction is the [min stack](/interview-question/how-do-you-design-a-min-stack-with-o-1-getmin) family of design questions.

📌 **Interview term: Deque** — a double-ended queue, pronounced "deck", with O(1) insertion and removal at both ends.

📌 **Interview term: Priority queue** — a queue that always removes the highest-priority item next, regardless of arrival order.

## 7. In Python: list for Stacks, deque for Queues

~~~python
from collections import deque

stack = []
stack.append("A")      # push
top = stack[-1]        # peek
stack.pop()            # pop -> "A"

queue = deque()
queue.append("A")      # enqueue at the back
front = queue[0]       # peek
queue.popleft()        # dequeue from the front -> "A"
~~~

* **\`list\` as a stack** is idiomatic: \`append\` and \`pop()\` both work at the end of the dynamic array.
* **\`list\` as a queue is the trap.** \`list.pop(0)\` shifts every remaining element. On the machine used for this doc, draining 100,000 items took 0.795 s with \`list.pop(0)\` and 0.003 s with \`deque.popleft()\`, measured with \`timeit\`.
* **Empty structures raise.** \`[].pop()\` raises \`IndexError: pop from empty list\` and \`deque().popleft()\` raises \`IndexError: pop from an empty deque\` (checked on Python 3.13). Check \`if stack:\` first.
* **\`queue.Queue\`** (in the \`queue\` module) is a thread-safe queue with locking for producer and consumer threads. It is slower and unnecessary for single-threaded algorithms; use \`deque\` there.
* **\`heapq\`** turns a list into a min-heap for a priority queue (\`heappush\`, \`heappop\`).

## 8. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`python3 main.py\`; the blocks are the exact standard output.

**Example 1 — the same four arrivals through a stack and a queue**

~~~text
arrivals:     A B C D
stack peek:   D
queue peek:   A
stack pops:   D C B A   (LIFO)
queue pops:   A B C D   (FIFO)
both empty:   true
~~~

**Example 2 — undo with a stack, round-robin scheduling with a queue**

~~~text
type "Hel" -> "Hel"
type "lo" -> "Hello"
type " wrld" -> "Hello wrld"
undo        -> "Hello"
type " world" -> "Hello world"
t=2: A ran 2, 1 left, back of the queue
t=3: B ran 1, finished
t=5: C ran 2, 3 left, back of the queue
t=6: A ran 1, finished
t=8: C ran 2, 1 left, back of the queue
t=9: C ran 1, finished
~~~

**Reading Example 2:** the undo removed " wrld", the most recent edit, which only a stack gives you. In the scheduler, B finished first (at t=3) because it needed one slice, and C, which needed five units, kept going to the back of the queue until it finished at t=9: every task got a fair turn in arrival order.

## 9. Complexity

| Operation | Stack | Queue (proper) | Queue backed by a plain array with front removal |
| :--- | :--- | :--- | :--- |
| add | O(1) amortized | O(1) amortized | O(1) amortized |
| remove | O(1) | O(1) | **O(n)** — every remaining item shifts |
| peek | O(1) | O(1) | O(1) |
| space | O(n) | O(n) | O(n) |

"Amortized" because a dynamic array occasionally grows by copying; see [amortized analysis](/interview-question/what-is-amortized-analysis). In Example 2, the round-robin loop does one dequeue and at most one enqueue per time slice, so its cost is O(total slices).

## 10. Edge Cases to Mention

- **Pop, peek or dequeue on an empty structure:** decide whether to throw, return a sentinel, or check \`is empty\` first (see the language notes for what actually happens).
- **A bounded queue that is full:** a ring buffer must reject, block, or overwrite the oldest item; say which.
- **One element:** after removing it, both ends must agree the structure is empty.
- **Interleaved operations:** push, pop, push again; the next pop must return the most recent push, not an older item.

## 11. Common Pitfalls

- **Using \`list.pop(0)\` as a dequeue.** It is O(n) per call; a BFS over n nodes becomes O(n²). Use \`collections.deque\`.
- **Popping an empty list or deque.** Both raise \`IndexError\`; test \`if stack:\` or \`while queue:\` first.
- **Reaching for \`queue.Queue\` in an algorithm.** It adds locking you do not need; \`deque\` is the single-threaded tool.
- **Confusing \`deque.pop()\` with \`popleft()\`.** \`pop()\` removes from the right, so a "queue" that uses \`append\` + \`pop\` is really a stack.
- **Deep recursion instead of an explicit stack.** The default recursion limit is 1000 frames, so an iterative DFS with a list as the stack is safer on large inputs.
- **Using a stack where order matters.** An undo history must pop the newest edit; a print spooler must serve the oldest job. Say which order you need before choosing.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core difference:</strong> <span style="color:#f0e2c8;">A stack removes the newest item first (LIFO); a queue removes the oldest item first (FIFO).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Operations:</strong> <span style="color:#f0e2c8;">Stack: push, pop, peek at one end. Queue: enqueue at the back, dequeue at the front. All O(1) when implemented properly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. In Python:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code> is a stack with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code>; a queue is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popleft</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.pop(0)</code> is O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where they are used:</strong> <span style="color:#f0e2c8;">Stacks: call stack, undo, bracket matching, DFS. Queues: BFS, scheduling, buffers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Relatives:</strong> <span style="color:#f0e2c8;">A deque does both ends in O(1); a priority queue (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code>) removes by priority, not arrival order, in O(log n).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use a list as a queue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop(0)</code> moves every remaining element left, so it is O(n). Draining 100,000 items took 0.795 s that way against 0.003 s with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque.popleft()</code> in our measurement.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you pop an empty stack?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In Python, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IndexError: pop from empty list</code>. In an interview, check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if stack:</code> before popping, for example when a closing bracket arrives with no opener.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you implement a queue with two stacks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inbox</code> list; to dequeue, if the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code> is empty, pop everything from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inbox</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code>, then pop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code>. Each item moves at most twice, so operations are amortized O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">queue.Queue</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When separate threads produce and consume items; it handles locking and blocking. For an algorithm in one thread, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque</code> is simpler and faster.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which one does BFS use, and which DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS uses a queue so it visits nodes in order of distance; DFS uses a stack (explicit, or the call stack through recursion) so it goes deep first.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **LIFO** | Last In, First Out: the newest item leaves first (stack) |
| **FIFO** | First In, First Out: the oldest item leaves first (queue) |
| **Push / pop / peek** | Add to, remove from, and read the top of a stack |
| **Enqueue / dequeue** | Add at the back, remove from the front of a queue |
| **Stack underflow** | Popping or peeking an empty stack |
| **Call stack** | The runtime stack of active function calls |
| **Deque** | Double-ended queue: O(1) at both ends |
| **Priority queue** | Removes the highest-priority item next, usually a heap |
| **collections.deque** | Python double-ended queue with O(1) append and popleft |

---
**Conclusion:** A stack and a queue both restrict where you can add and remove, which keeps every operation O(1); the only difference is which item leaves next. A stack returns the newest item (LIFO) and fits undo, the call stack, bracket matching and DFS; a queue returns the oldest (FIFO) and fits BFS, scheduling and buffering. In Python, a \`list\` is the stack and \`collections.deque\` is the queue, and Example 1's output (D C B A against A B C D) shows the whole difference in two lines. The one trap to avoid is \`list.pop(0)\`, which quietly turns an O(1) dequeue into O(n).`,
        examples: [
          {
            label: "Same arrivals, opposite exits",
            code: `# Same arrivals, opposite exits.
from collections import deque

arrivals = ["A", "B", "C", "D"]

stack = []                 # a Python list is a fine stack: append/pop work at the end
queue = deque()            # deque: O(1) at both ends; list.pop(0) would shift everything
for item in arrivals:
    stack.append(item)     # push
    queue.append(item)     # enqueue at the back

print("arrivals:     " + " ".join(arrivals))  # arrivals:     A B C D
print("stack peek:   " + stack[-1])
print("queue peek:   " + queue[0])

out = []
while stack:
    out.append(stack.pop())        # pop from the top (the end)
print("stack pops:   " + " ".join(out) + "   (LIFO)")

out = []
while queue:
    out.append(queue.popleft())    # dequeue from the front
print("queue pops:   " + " ".join(out) + "   (FIFO)")  # queue pops:   A B C D   (FIFO)
print("both empty:   " + str(len(stack) == 0 and len(queue) == 0).lower())  # both empty:   true`,
          },
          {
            label: "Undo with a stack, round-robin with a queue",
            code: `# One real job each: undo needs a stack, fair turn-taking needs a queue.
from collections import deque

# 1. Undo: every edit pushes the previous text; undo pops the most recent one.
text, history = "", []
def type_text(s):
    global text
    history.append(text)
    text += s
    print('type "' + s + '" -> "' + text + '"')
def undo():
    global text
    text = history.pop() if history else text
    print('undo        -> "' + text + '"')

type_text("Hel")
type_text("lo")
type_text(" wrld")
undo()                       # removes the LAST edit, not the first
type_text(" world")

# 2. Round-robin scheduling: each task runs for at most 2 time units,
#    then goes to the back of the line if it still has work left.
tasks = deque([("A", 3), ("B", 1), ("C", 5)])
clock, quantum = 0, 2
while tasks:
    name, left = tasks.popleft()
    run = min(quantum, left)
    clock += run
    if left - run > 0:
        tasks.append((name, left - run))
        print("t=" + str(clock) + ": " + name + " ran " + str(run) + ", " + str(left - run) + " left, back of the queue")
    else:
        print("t=" + str(clock) + ": " + name + " ran " + str(run) + ", finished")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"What is the difference between a stack and a queue? Give me a real use for each, and tell me which JavaScript types you would use to implement them and what each operation costs."

**What a strong answer should cover:**
- LIFO versus FIFO, with the operation names (push, pop, peek; enqueue, dequeue).
- All core operations are O(1), and why a queue needs a structure that is cheap at both ends.
- Concrete uses: call stack, undo, bracket matching and DFS for stacks; BFS, scheduling and buffers for queues.
- Related structures: deque, priority queue, circular buffer, a queue built from two stacks.
- JavaScript specifics: an array is a fine stack (\`push\`/\`pop\`), but \`shift()\` is O(n), so a real queue needs a head index or a linked list; \`pop()\` on an empty array returns \`undefined\` instead of throwing.

**Code / implementation expected:** Optional — using the right JavaScript built-ins, or a short undo or round-robin example.`,
        answer: `**Target Audience:** Beginners learning data structures — no prior knowledge assumed.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`node main.js\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

In a restaurant kitchen, clean plates go onto a pile. The dishwasher puts each new plate **on top**, and the cook takes the plate **from the top**. The plate washed last is used first; the one at the bottom may sit there all evening. That pile is a **stack**.

At the bakery counter outside, customers stand in a line. New customers join **at the back**, and the baker serves **from the front**. Whoever arrived first is served first, which is exactly what makes the line feel fair. That line is a **queue**.

Both hold a collection of things and both only let you add and remove at fixed places, which is what makes them fast and simple. The single difference is *which* item comes out next: the newest (stack) or the oldest (queue). Choosing the wrong one gives you an undo button that undoes your first edit, or a printer that prints the most recent page first.

## 2. The Stack: Last In, First Out

A stack allows three operations, all at one end called the **top**: \`push\` (add on top), \`pop\` (remove from the top) and \`peek\` (look at the top without removing it).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A stack: push and pop both happen at the top, so the last item pushed is the first popped">
  <defs>
    <marker id="b02q3-javascript-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="110" y="165" text-anchor="middle">Stack (LIFO)</text>
  <text class="d-sub" x="250" y="38" text-anchor="middle">push</text>
  <path class="d-edge" d="M 300 20 L 300 72" marker-end="url(#b02q3-javascript-arrow)"/>
  <text class="d-sub" x="470" y="38" text-anchor="middle">pop</text>
  <path class="d-edge-accent" d="M 420 76 L 420 24" marker-end="url(#b02q3-javascript-arrow)"/>
  <rect class="d-box-accent" x="260" y="80" width="200" height="50" rx="4"/>
  <text class="d-text d-accent" x="360" y="111" text-anchor="middle">D (last in)</text>
  <rect class="d-box" x="260" y="130" width="200" height="50" rx="4"/>
  <text class="d-text" x="360" y="161" text-anchor="middle">C</text>
  <rect class="d-box" x="260" y="180" width="200" height="50" rx="4"/>
  <text class="d-text" x="360" y="211" text-anchor="middle">B</text>
  <rect class="d-box-muted" x="260" y="230" width="200" height="50" rx="4"/>
  <text class="d-text" x="360" y="261" text-anchor="middle">A (first in)</text>
  <path class="d-edge-dashed" d="M 560 105 L 466 105" marker-end="url(#b02q3-javascript-arrow)"/>
  <text class="d-sub" x="600" y="110" text-anchor="middle">top</text>
</svg>

Pushing A, B, C, D and then popping four times gives D, C, B, A: the reverse of the arrival order.

📌 **Interview term: LIFO (Last In, First Out)** — the rule that the most recently added item is the first one removed. It defines a stack.

📌 **Interview term: Push / pop / peek** — add to the top, remove from the top, read the top without removing it. Each is O(1).

📌 **Interview term: Stack underflow** — trying to pop or peek an empty stack. Every language handles it differently (an exception, \`undefined\`, or undefined behaviour), so check for empty first.

## 3. The Queue: First In, First Out

A queue adds at one end (the **back**, or rear) and removes from the other (the **front**). The operations are usually called \`enqueue\` (or \`offer\`, \`push\`, \`append\`) and \`dequeue\` (or \`poll\`, \`popleft\`).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="A queue: items join at the back and leave from the front, so the first item in is the first out">
  <defs>
    <marker id="b02q3q-javascript-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="34" text-anchor="middle">Queue (FIFO)</text>
  <path class="d-edge-accent" d="M 176 100 L 66 100" marker-end="url(#b02q3q-javascript-arrow)"/>
  <text class="d-sub" x="115" y="82" text-anchor="middle">dequeue</text>
  <rect class="d-box-accent" x="180" y="70" width="90" height="60" rx="4"/>
  <text class="d-text d-accent" x="225" y="106" text-anchor="middle">A</text>
  <rect class="d-box" x="270" y="70" width="90" height="60" rx="4"/>
  <text class="d-text" x="315" y="106" text-anchor="middle">B</text>
  <rect class="d-box" x="360" y="70" width="90" height="60" rx="4"/>
  <text class="d-text" x="405" y="106" text-anchor="middle">C</text>
  <rect class="d-box-muted" x="450" y="70" width="90" height="60" rx="4"/>
  <text class="d-text" x="495" y="106" text-anchor="middle">D</text>
  <path class="d-edge" d="M 680 100 L 548 100" marker-end="url(#b02q3q-javascript-arrow)"/>
  <text class="d-sub" x="615" y="82" text-anchor="middle">enqueue</text>
  <text class="d-sub" x="225" y="162" text-anchor="middle">front</text>
  <text class="d-sub" x="495" y="162" text-anchor="middle">back</text>
</svg>

Enqueuing A, B, C, D and then dequeuing four times gives A, B, C, D: the same order they arrived in.

📌 **Interview term: FIFO (First In, First Out)** — the rule that the oldest item is removed first. It defines a queue.

📌 **Interview term: Enqueue / dequeue** — add at the back, remove from the front. Each must be O(1); a queue whose dequeue shifts every element is a bug, not a queue.

## 4. Side-by-Side Comparison

| | Stack | Queue |
| :--- | :--- | :--- |
| Removal order | newest first (LIFO) | oldest first (FIFO) |
| Where you add | top | back |
| Where you remove | top (same end) | front (other end) |
| Core operations | push, pop, peek — all O(1) | enqueue, dequeue, peek — all O(1) |
| Simplest backing | dynamic array, using its end | circular buffer, deque, or linked list with head and tail |
| Typical uses | function calls, undo, matching brackets, depth-first search, expression evaluation | scheduling, buffering, breadth-first search, rate limiting, message queues |

The backing row is the subtle part. A stack only touches one end, so a dynamic array works perfectly: its end is O(1) to add and remove. A queue touches **both** ends, and removing from the front of a plain array shifts everything left, which is O(n). That is why each language has a separate structure for queues (see the language section below).

## 5. Where Each One Shows Up

**Stacks** appear whenever you must come back to something in reverse order:

- **The call stack.** Every function call pushes a frame and every return pops it. Recursion is a stack you do not see; see [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).
- **Undo.** Each edit pushes the previous state; undo pops the most recent one (Example 2).
- **Matching brackets.** Push each opening bracket, pop when a closing one arrives and check that they match: [valid parentheses](/interview-question/how-do-you-check-for-valid-balanced-parentheses).
- **Depth-first search** with an explicit stack, and the [monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it) pattern for "next greater element" problems.

**Queues** appear whenever things must be handled in arrival order:

- **Breadth-first search** visits nodes level by level using a queue; see [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs) and [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree).
- **Scheduling.** Round-robin CPU scheduling gives each task a time slice and sends unfinished tasks to the back (Example 2).
- **Buffers** between a producer and a consumer: keyboard input, network packets, print jobs.

📌 **Interview term: Call stack** — the stack of active function calls the runtime keeps; deep recursion can overflow it.

## 6. Relatives Worth Naming

- **Deque (double-ended queue):** add and remove at both ends in O(1). It can act as a stack or a queue, which is why several languages use one deque type for both.
- **Priority queue:** removes the item with the highest priority, not the oldest; usually a binary heap with O(log n) operations. See [heaps and priority queues](/interview-question/what-is-a-heap-priority-queue).
- **Circular buffer (ring buffer):** a fixed-size array with head and tail indices that wrap around, giving an O(1) queue without shifting.
- **A queue from two stacks:** a classic interview exercise with amortized O(1) operations; see [implementing a queue using two stacks](/interview-question/how-do-you-implement-a-queue-using-two-stacks). The reverse direction is the [min stack](/interview-question/how-do-you-design-a-min-stack-with-o-1-getmin) family of design questions.

📌 **Interview term: Deque** — a double-ended queue, pronounced "deck", with O(1) insertion and removal at both ends.

📌 **Interview term: Priority queue** — a queue that always removes the highest-priority item next, regardless of arrival order.

## 7. In JavaScript: Arrays for Stacks, a Head Index for Queues

~~~javascript
const stack = [];
stack.push('A');                       // push
const top = stack[stack.length - 1];   // peek (or stack.at(-1))
stack.pop();                           // pop -> 'A'

class Queue {                          // O(1) dequeue with a moving head index
  constructor() { this.items = []; this.head = 0; }
  enqueue(x) { this.items.push(x); }
  dequeue() { return this.items[this.head++]; }
  get size() { return this.items.length - this.head; }
}
~~~

* **An array is a perfect stack:** \`push\` and \`pop\` both work at the end.
* **\`shift()\` is the trap.** It removes index 0 and moves every other element down. Measured in Node 22 on the machine used for this doc, draining arrays with \`shift()\` took 908 ms for 100,000 items and 16,977 ms for 400,000, while \`pop()\` took a few milliseconds. Four times the items, almost twenty times the time: O(n) per call.
* **A head index fixes it.** Example 1's \`Queue\` class reads from \`items[head++]\` and, when more than half the array is dead, slices it off so memory is reused. That keeps dequeue O(1) amortized.
* **Empty structures do not throw.** \`[].pop()\` and \`[].shift()\` both return \`undefined\` (checked in Node 22). A bug that pops too often therefore produces \`undefined\` values instead of an error; check \`length\` first.
* There is no built-in deque or priority queue; write a binary heap if you need one.

## 8. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`node main.js\`; the blocks are the exact standard output.

**Example 1 — the same four arrivals through a stack and a queue**

~~~text
arrivals:     A B C D
stack peek:   D
queue peek:   A
stack pops:   D C B A   (LIFO)
queue pops:   A B C D   (FIFO)
both empty:   true
~~~

**Example 2 — undo with a stack, round-robin scheduling with a queue**

~~~text
type "Hel" -> "Hel"
type "lo" -> "Hello"
type " wrld" -> "Hello wrld"
undo        -> "Hello"
type " world" -> "Hello world"
t=2: A ran 2, 1 left, back of the queue
t=3: B ran 1, finished
t=5: C ran 2, 3 left, back of the queue
t=6: A ran 1, finished
t=8: C ran 2, 1 left, back of the queue
t=9: C ran 1, finished
~~~

**Reading Example 2:** the undo removed " wrld", the most recent edit, which only a stack gives you. In the scheduler, B finished first (at t=3) because it needed one slice, and C, which needed five units, kept going to the back of the queue until it finished at t=9: every task got a fair turn in arrival order.

## 9. Complexity

| Operation | Stack | Queue (proper) | Queue backed by a plain array with front removal |
| :--- | :--- | :--- | :--- |
| add | O(1) amortized | O(1) amortized | O(1) amortized |
| remove | O(1) | O(1) | **O(n)** — every remaining item shifts |
| peek | O(1) | O(1) | O(1) |
| space | O(n) | O(n) | O(n) |

"Amortized" because a dynamic array occasionally grows by copying; see [amortized analysis](/interview-question/what-is-amortized-analysis). In Example 2, the round-robin loop does one dequeue and at most one enqueue per time slice, so its cost is O(total slices).

## 10. Edge Cases to Mention

- **Pop, peek or dequeue on an empty structure:** decide whether to throw, return a sentinel, or check \`is empty\` first (see the language notes for what actually happens).
- **A bounded queue that is full:** a ring buffer must reject, block, or overwrite the oldest item; say which.
- **One element:** after removing it, both ends must agree the structure is empty.
- **Interleaved operations:** push, pop, push again; the next pop must return the most recent push, not an older item.

## 11. Common Pitfalls

- **Using \`shift()\` as a dequeue in BFS.** It is O(n) per call, so the search becomes O(n²) on large graphs. Use a head index or a linked list.
- **Popping an empty array silently.** \`pop()\` returns \`undefined\`, so \`undefined\` flows into later code; check \`stack.length > 0\` first.
- **A head-index queue that never compacts.** Without slicing off consumed items, a long-running queue keeps every old element alive in memory.
- **Mixing ends.** \`push\` + \`shift\` is a queue, \`push\` + \`pop\` is a stack, \`unshift\` + \`pop\` is also a queue, but \`unshift\` is O(n) too.
- **Deep recursion instead of an explicit stack.** Engines limit the call stack depth, and a deep recursive DFS throws \`RangeError: Maximum call stack size exceeded\`; an array-based stack avoids it.
- **Using a stack where order matters.** An undo history must pop the newest edit; a print spooler must serve the oldest job.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core difference:</strong> <span style="color:#f0e2c8;">A stack removes the newest item first (LIFO); a queue removes the oldest item first (FIFO).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Operations:</strong> <span style="color:#f0e2c8;">Stack: push, pop, peek at one end. Queue: enqueue at the back, dequeue at the front. All O(1) when implemented properly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. In JavaScript:</strong> <span style="color:#f0e2c8;">An array is a stack with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code>; for a queue I keep a head index, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code> moves every element and is O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where they are used:</strong> <span style="color:#f0e2c8;">Stacks: call stack, undo, bracket matching, DFS. Queues: BFS, task scheduling, event and message buffers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Relatives:</strong> <span style="color:#f0e2c8;">A deque does both ends in O(1); a priority queue removes by priority, usually with a hand-written binary heap in JS.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shift()</code> for a queue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is O(n): in Node 22, draining 400,000 items with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code> took about 17 seconds, against a few milliseconds with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>. A head index makes dequeue O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pop()</code> return on an empty array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, without any error. That is why bracket-matching code checks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stack.length === 0</code> before popping on a closing bracket.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you implement a queue with two stacks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inbox</code> array; to dequeue, if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code> is empty, pop everything from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inbox</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code>, then pop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code>. Each item moves at most twice: amortized O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the JavaScript event loop a queue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its task queue and microtask queue behave as FIFO queues: callbacks run in the order they were queued within each queue, which is why the analogy fits.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which one does BFS use, and which DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS uses a queue so it visits nodes in order of distance; DFS uses a stack (an array, or recursion) so it goes deep first.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **LIFO** | Last In, First Out: the newest item leaves first (stack) |
| **FIFO** | First In, First Out: the oldest item leaves first (queue) |
| **Push / pop / peek** | Add to, remove from, and read the top of a stack |
| **Enqueue / dequeue** | Add at the back, remove from the front of a queue |
| **Stack underflow** | Popping or peeking an empty stack |
| **Call stack** | The runtime stack of active function calls |
| **Deque** | Double-ended queue: O(1) at both ends |
| **Priority queue** | Removes the highest-priority item next, usually a heap |
| **Head index** | A queue technique: read from items[head++] instead of shifting the array |

---
**Conclusion:** A stack and a queue both restrict where you can add and remove, which keeps every operation O(1); the only difference is which item leaves next. A stack returns the newest item (LIFO) and fits undo, the call stack, bracket matching and DFS; a queue returns the oldest (FIFO) and fits BFS, scheduling and buffering. In JavaScript, an array is already a good stack, but a good queue needs a head index (or a linked list), because \`shift()\` is O(n), as the Node 22 measurement shows. Example 1's output (D C B A against A B C D) is the whole difference in two lines.`,
        examples: [
          {
            label: "Same arrivals, opposite exits",
            code: `// Same arrivals, opposite exits.

// A queue with a moving head index: dequeue is O(1).
// arr.shift() would move every remaining element each time.
class Queue {
  constructor() { this.items = []; this.head = 0; }
  enqueue(x) { this.items.push(x); }
  dequeue() {
    const x = this.items[this.head++];
    if (this.head * 2 >= this.items.length) {   // compact now and then so memory is reused
      this.items = this.items.slice(this.head);
      this.head = 0;
    }
    return x;
  }
  peek() { return this.items[this.head]; }
  get size() { return this.items.length - this.head; }
}

const arrivals = ['A', 'B', 'C', 'D'];
const stack = [];          // an array is a fine stack: push/pop work at the end
const queue = new Queue();
for (const item of arrivals) {
  stack.push(item);
  queue.enqueue(item);
}

console.log('arrivals:     ' + arrivals.join(' ')); // arrivals:     A B C D
console.log('stack peek:   ' + stack[stack.length - 1]); // stack peek:   D
console.log('queue peek:   ' + queue.peek()); // queue peek:   A

let out = [];
while (stack.length > 0) out.push(stack.pop());      // pop from the top (the end)
console.log('stack pops:   ' + out.join(' ') + '   (LIFO)'); // stack pops:   D C B A   (LIFO)

out = [];
while (queue.size > 0) out.push(queue.dequeue());    // dequeue from the front
console.log('queue pops:   ' + out.join(' ') + '   (FIFO)'); // queue pops:   A B C D   (FIFO)
console.log('both empty:   ' + (stack.length === 0 && queue.size === 0)); // both empty:   true`,
          },
          {
            label: "Undo with a stack, round-robin with a queue",
            code: `// One real job each: undo needs a stack, fair turn-taking needs a queue.

// 1. Undo: every edit pushes the previous text; undo pops the most recent one.
let text = '';
const history = [];
function typeText(s) {
  history.push(text);
  text += s;
  console.log('type "' + s + '" -> "' + text + '"');
}
function undo() {
  if (history.length > 0) text = history.pop();
  console.log('undo        -> "' + text + '"');
}

typeText('Hel');
typeText('lo');
typeText(' wrld');
undo();                      // removes the LAST edit, not the first
typeText(' world');

// 2. Round-robin scheduling: each task runs for at most 2 time units,
//    then goes to the back of the line if it still has work left.
//    Few items here, so a head index over an array is enough (no shift()).
const tasks = [['A', 3], ['B', 1], ['C', 5]];
let head = 0, clock = 0;
const quantum = 2;
while (head < tasks.length) {
  const [name, left] = tasks[head++];
  const run = Math.min(quantum, left);
  clock += run;
  if (left - run > 0) {
    tasks.push([name, left - run]);
    console.log('t=' + clock + ': ' + name + ' ran ' + run + ', ' + (left - run) + ' left, back of the queue');
  } else {
    console.log('t=' + clock + ': ' + name + ' ran ' + run + ', finished');
  }
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"What is the difference between a stack and a queue? Give me a real use for each, and tell me which Java types you would use to implement them and what each operation costs."

**What a strong answer should cover:**
- LIFO versus FIFO, with the operation names (push, pop, peek; enqueue, dequeue).
- All core operations are O(1), and why a queue needs a structure that is cheap at both ends.
- Concrete uses: call stack, undo, bracket matching and DFS for stacks; BFS, scheduling and buffers for queues.
- Related structures: deque, priority queue, circular buffer, a queue built from two stacks.
- Java specifics: use \`ArrayDeque\` for both (\`push\`/\`pop\`/\`peek\` and \`offer\`/\`poll\`/\`peek\`) rather than the legacy \`Stack\` class; know which methods throw (\`pop\`, \`remove\`) and which return \`null\` (\`poll\`, \`peek\`), and that \`ArrayDeque\` rejects \`null\`.

**Code / implementation expected:** Optional — using the right Java built-ins, or a short undo or round-robin example.`,
        answer: `**Target Audience:** Beginners learning data structures — no prior knowledge assumed.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`javac Main.java && java Main\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

In a restaurant kitchen, clean plates go onto a pile. The dishwasher puts each new plate **on top**, and the cook takes the plate **from the top**. The plate washed last is used first; the one at the bottom may sit there all evening. That pile is a **stack**.

At the bakery counter outside, customers stand in a line. New customers join **at the back**, and the baker serves **from the front**. Whoever arrived first is served first, which is exactly what makes the line feel fair. That line is a **queue**.

Both hold a collection of things and both only let you add and remove at fixed places, which is what makes them fast and simple. The single difference is *which* item comes out next: the newest (stack) or the oldest (queue). Choosing the wrong one gives you an undo button that undoes your first edit, or a printer that prints the most recent page first.

## 2. The Stack: Last In, First Out

A stack allows three operations, all at one end called the **top**: \`push\` (add on top), \`pop\` (remove from the top) and \`peek\` (look at the top without removing it).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A stack: push and pop both happen at the top, so the last item pushed is the first popped">
  <defs>
    <marker id="b02q3-java-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="110" y="165" text-anchor="middle">Stack (LIFO)</text>
  <text class="d-sub" x="250" y="38" text-anchor="middle">push</text>
  <path class="d-edge" d="M 300 20 L 300 72" marker-end="url(#b02q3-java-arrow)"/>
  <text class="d-sub" x="470" y="38" text-anchor="middle">pop</text>
  <path class="d-edge-accent" d="M 420 76 L 420 24" marker-end="url(#b02q3-java-arrow)"/>
  <rect class="d-box-accent" x="260" y="80" width="200" height="50" rx="4"/>
  <text class="d-text d-accent" x="360" y="111" text-anchor="middle">D (last in)</text>
  <rect class="d-box" x="260" y="130" width="200" height="50" rx="4"/>
  <text class="d-text" x="360" y="161" text-anchor="middle">C</text>
  <rect class="d-box" x="260" y="180" width="200" height="50" rx="4"/>
  <text class="d-text" x="360" y="211" text-anchor="middle">B</text>
  <rect class="d-box-muted" x="260" y="230" width="200" height="50" rx="4"/>
  <text class="d-text" x="360" y="261" text-anchor="middle">A (first in)</text>
  <path class="d-edge-dashed" d="M 560 105 L 466 105" marker-end="url(#b02q3-java-arrow)"/>
  <text class="d-sub" x="600" y="110" text-anchor="middle">top</text>
</svg>

Pushing A, B, C, D and then popping four times gives D, C, B, A: the reverse of the arrival order.

📌 **Interview term: LIFO (Last In, First Out)** — the rule that the most recently added item is the first one removed. It defines a stack.

📌 **Interview term: Push / pop / peek** — add to the top, remove from the top, read the top without removing it. Each is O(1).

📌 **Interview term: Stack underflow** — trying to pop or peek an empty stack. Every language handles it differently (an exception, \`undefined\`, or undefined behaviour), so check for empty first.

## 3. The Queue: First In, First Out

A queue adds at one end (the **back**, or rear) and removes from the other (the **front**). The operations are usually called \`enqueue\` (or \`offer\`, \`push\`, \`append\`) and \`dequeue\` (or \`poll\`, \`popleft\`).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="A queue: items join at the back and leave from the front, so the first item in is the first out">
  <defs>
    <marker id="b02q3q-java-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="34" text-anchor="middle">Queue (FIFO)</text>
  <path class="d-edge-accent" d="M 176 100 L 66 100" marker-end="url(#b02q3q-java-arrow)"/>
  <text class="d-sub" x="115" y="82" text-anchor="middle">dequeue</text>
  <rect class="d-box-accent" x="180" y="70" width="90" height="60" rx="4"/>
  <text class="d-text d-accent" x="225" y="106" text-anchor="middle">A</text>
  <rect class="d-box" x="270" y="70" width="90" height="60" rx="4"/>
  <text class="d-text" x="315" y="106" text-anchor="middle">B</text>
  <rect class="d-box" x="360" y="70" width="90" height="60" rx="4"/>
  <text class="d-text" x="405" y="106" text-anchor="middle">C</text>
  <rect class="d-box-muted" x="450" y="70" width="90" height="60" rx="4"/>
  <text class="d-text" x="495" y="106" text-anchor="middle">D</text>
  <path class="d-edge" d="M 680 100 L 548 100" marker-end="url(#b02q3q-java-arrow)"/>
  <text class="d-sub" x="615" y="82" text-anchor="middle">enqueue</text>
  <text class="d-sub" x="225" y="162" text-anchor="middle">front</text>
  <text class="d-sub" x="495" y="162" text-anchor="middle">back</text>
</svg>

Enqueuing A, B, C, D and then dequeuing four times gives A, B, C, D: the same order they arrived in.

📌 **Interview term: FIFO (First In, First Out)** — the rule that the oldest item is removed first. It defines a queue.

📌 **Interview term: Enqueue / dequeue** — add at the back, remove from the front. Each must be O(1); a queue whose dequeue shifts every element is a bug, not a queue.

## 4. Side-by-Side Comparison

| | Stack | Queue |
| :--- | :--- | :--- |
| Removal order | newest first (LIFO) | oldest first (FIFO) |
| Where you add | top | back |
| Where you remove | top (same end) | front (other end) |
| Core operations | push, pop, peek — all O(1) | enqueue, dequeue, peek — all O(1) |
| Simplest backing | dynamic array, using its end | circular buffer, deque, or linked list with head and tail |
| Typical uses | function calls, undo, matching brackets, depth-first search, expression evaluation | scheduling, buffering, breadth-first search, rate limiting, message queues |

The backing row is the subtle part. A stack only touches one end, so a dynamic array works perfectly: its end is O(1) to add and remove. A queue touches **both** ends, and removing from the front of a plain array shifts everything left, which is O(n). That is why each language has a separate structure for queues (see the language section below).

## 5. Where Each One Shows Up

**Stacks** appear whenever you must come back to something in reverse order:

- **The call stack.** Every function call pushes a frame and every return pops it. Recursion is a stack you do not see; see [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).
- **Undo.** Each edit pushes the previous state; undo pops the most recent one (Example 2).
- **Matching brackets.** Push each opening bracket, pop when a closing one arrives and check that they match: [valid parentheses](/interview-question/how-do-you-check-for-valid-balanced-parentheses).
- **Depth-first search** with an explicit stack, and the [monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it) pattern for "next greater element" problems.

**Queues** appear whenever things must be handled in arrival order:

- **Breadth-first search** visits nodes level by level using a queue; see [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs) and [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree).
- **Scheduling.** Round-robin CPU scheduling gives each task a time slice and sends unfinished tasks to the back (Example 2).
- **Buffers** between a producer and a consumer: keyboard input, network packets, print jobs.

📌 **Interview term: Call stack** — the stack of active function calls the runtime keeps; deep recursion can overflow it.

## 6. Relatives Worth Naming

- **Deque (double-ended queue):** add and remove at both ends in O(1). It can act as a stack or a queue, which is why several languages use one deque type for both.
- **Priority queue:** removes the item with the highest priority, not the oldest; usually a binary heap with O(log n) operations. See [heaps and priority queues](/interview-question/what-is-a-heap-priority-queue).
- **Circular buffer (ring buffer):** a fixed-size array with head and tail indices that wrap around, giving an O(1) queue without shifting.
- **A queue from two stacks:** a classic interview exercise with amortized O(1) operations; see [implementing a queue using two stacks](/interview-question/how-do-you-implement-a-queue-using-two-stacks). The reverse direction is the [min stack](/interview-question/how-do-you-design-a-min-stack-with-o-1-getmin) family of design questions.

📌 **Interview term: Deque** — a double-ended queue, pronounced "deck", with O(1) insertion and removal at both ends.

📌 **Interview term: Priority queue** — a queue that always removes the highest-priority item next, regardless of arrival order.

## 7. In Java: ArrayDeque for Both

~~~java
Deque<String> stack = new ArrayDeque<>();
stack.push("A");                 // addFirst: the top is the FRONT of the deque
String top = stack.peek();       // null if empty
stack.pop();                     // removeFirst; throws if empty

Queue<String> queue = new ArrayDeque<>();
queue.offer("A");                // addLast: join at the back
String front = queue.peek();     // null if empty
queue.poll();                    // removeFirst; null if empty
~~~

* **Prefer \`ArrayDeque\` to \`Stack\`.** The \`Stack\` class extends the synchronized \`Vector\`, and its own Javadoc says a more complete and consistent set of LIFO operations is provided by the \`Deque\` interface, which should be used in preference. \`ArrayDeque\` is a resizable-array implementation of \`Deque\`, and adding or removing at either end is O(1) amortized.
* **Throwing versus returning \`null\`.** On an empty \`ArrayDeque\`, \`poll()\` and \`peek()\` return \`null\`, while \`pop()\` and \`remove()\` throw \`java.util.NoSuchElementException\` (checked on OpenJDK 21). Pick one style and use it consistently.
* **No \`null\` elements.** \`push(null)\` on an \`ArrayDeque\` throws \`NullPointerException\`, because \`null\` is reserved to mean "empty" for \`poll\` and \`peek\`.
* **\`push\` adds at the front.** When you iterate or print an \`ArrayDeque\` used as a stack, you see the top first.
* **\`LinkedList\`** also implements \`Deque\` and accepts \`null\`, but allocates a node per element. **\`PriorityQueue\`** is a min-heap by default; pass a comparator for other orders.

## 8. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`javac Main.java && java Main\`; the blocks are the exact standard output.

**Example 1 — the same four arrivals through a stack and a queue**

~~~text
arrivals:     A B C D
stack peek:   D
queue peek:   A
stack pops:   D C B A   (LIFO)
queue pops:   A B C D   (FIFO)
both empty:   true
~~~

**Example 2 — undo with a stack, round-robin scheduling with a queue**

~~~text
type "Hel" -> "Hel"
type "lo" -> "Hello"
type " wrld" -> "Hello wrld"
undo        -> "Hello"
type " world" -> "Hello world"
t=2: A ran 2, 1 left, back of the queue
t=3: B ran 1, finished
t=5: C ran 2, 3 left, back of the queue
t=6: A ran 1, finished
t=8: C ran 2, 1 left, back of the queue
t=9: C ran 1, finished
~~~

**Reading Example 2:** the undo removed " wrld", the most recent edit, which only a stack gives you. In the scheduler, B finished first (at t=3) because it needed one slice, and C, which needed five units, kept going to the back of the queue until it finished at t=9: every task got a fair turn in arrival order.

## 9. Complexity

| Operation | Stack | Queue (proper) | Queue backed by a plain array with front removal |
| :--- | :--- | :--- | :--- |
| add | O(1) amortized | O(1) amortized | O(1) amortized |
| remove | O(1) | O(1) | **O(n)** — every remaining item shifts |
| peek | O(1) | O(1) | O(1) |
| space | O(n) | O(n) | O(n) |

"Amortized" because a dynamic array occasionally grows by copying; see [amortized analysis](/interview-question/what-is-amortized-analysis). In Example 2, the round-robin loop does one dequeue and at most one enqueue per time slice, so its cost is O(total slices).

## 10. Edge Cases to Mention

- **Pop, peek or dequeue on an empty structure:** decide whether to throw, return a sentinel, or check \`is empty\` first (see the language notes for what actually happens).
- **A bounded queue that is full:** a ring buffer must reject, block, or overwrite the oldest item; say which.
- **One element:** after removing it, both ends must agree the structure is empty.
- **Interleaved operations:** push, pop, push again; the next pop must return the most recent push, not an older item.

## 11. Common Pitfalls

- **Using \`java.util.Stack\`.** It is synchronized and extends \`Vector\`, so it also allows index access that breaks the stack idea; its Javadoc recommends \`Deque\`.
- **Calling \`pop()\` on an empty deque.** It throws \`NoSuchElementException\`; use \`isEmpty()\` or \`poll()\` when empty is a normal case.
- **Mixing \`push\` with \`offer\` on the same \`ArrayDeque\`.** \`push\` adds at the front and \`offer\` at the back, so the result is neither a stack nor a queue.
- **Storing \`null\`.** \`ArrayDeque\` throws on \`null\` elements; use a sentinel object or \`Optional\` if you need "nothing".
- **Expecting \`PriorityQueue\` to iterate in priority order.** Only \`poll()\` returns items in order; iteration and \`toString()\` show the heap layout.
- **Deep recursion instead of an explicit stack.** The default thread stack overflows on very deep recursion (\`StackOverflowError\`); an iterative DFS with an \`ArrayDeque\` is safer.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core difference:</strong> <span style="color:#f0e2c8;">A stack removes the newest item first (LIFO); a queue removes the oldest item first (FIFO).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Operations:</strong> <span style="color:#f0e2c8;">Stack: push, pop, peek at one end. Queue: enqueue at the back, dequeue at the front. All O(1) when implemented properly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. In Java:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> does both: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek</code> for a stack and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">offer</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">poll</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek</code> for a queue; I avoid the legacy <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Stack</code> class.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where they are used:</strong> <span style="color:#f0e2c8;">Stacks: call stack, undo, bracket matching, DFS. Queues: BFS, scheduling, producer and consumer buffers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Relatives:</strong> <span style="color:#f0e2c8;">A deque does both ends in O(1); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code> removes by priority in O(log n), smallest first by default.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">java.util.Stack</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It extends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vector</code>, so every call is synchronized and it exposes index-based methods. Its own Javadoc recommends the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deque</code> interface, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">poll()</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">remove()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On an empty queue, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">poll()</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove()</code> throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoSuchElementException</code>. The same split exists for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">element()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ArrayDeque</code> not hold <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">null</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">poll</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek</code> use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> to mean the deque is empty; allowing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> elements would make that ambiguous, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push(null)</code> throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NullPointerException</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you implement a queue with two stacks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inbox</code> deque; to dequeue, if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code> is empty, move everything from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inbox</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code>, then pop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code>. Each element moves at most twice: amortized O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which one does BFS use, and which DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS uses a queue (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">offer</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">poll</code>) so it visits by distance; DFS uses a stack, explicit or the call stack, so it goes deep first.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **LIFO** | Last In, First Out: the newest item leaves first (stack) |
| **FIFO** | First In, First Out: the oldest item leaves first (queue) |
| **Push / pop / peek** | Add to, remove from, and read the top of a stack |
| **Enqueue / dequeue** | Add at the back, remove from the front of a queue |
| **Stack underflow** | Popping or peeking an empty stack |
| **Call stack** | The runtime stack of active function calls |
| **Deque** | Double-ended queue: O(1) at both ends |
| **Priority queue** | Removes the highest-priority item next, usually a heap |
| **ArrayDeque** | Java resizable circular array deque; the recommended stack and queue |

---
**Conclusion:** A stack and a queue both restrict where you can add and remove, which keeps every operation O(1); the only difference is which item leaves next. A stack returns the newest item (LIFO) and fits undo, the call stack, bracket matching and DFS; a queue returns the oldest (FIFO) and fits BFS, scheduling and buffering. In Java, one class covers both: \`ArrayDeque\`, used with \`push\`/\`pop\` or \`offer\`/\`poll\`, with the legacy \`Stack\` left alone. Know which methods throw and which return \`null\`, and Example 1's output (D C B A against A B C D) says the rest.`,
        examples: [
          {
            label: "Same arrivals, opposite exits",
            code: `import java.util.*;

public class Main {
    // Same arrivals, opposite exits. ArrayDeque serves as both: prefer it to the
    // legacy Stack class (a synchronized Vector) and to LinkedList.
    public static void main(String[] args) {
        String[] arrivals = {"A", "B", "C", "D"};
        Deque<String> stack = new ArrayDeque<>();
        Queue<String> queue = new ArrayDeque<>();
        for (String item : arrivals) {
            stack.push(item);      // push = addFirst: the top is the FRONT of the deque
            queue.offer(item);     // offer = addLast: join at the back
        }

        System.out.println("arrivals:     " + String.join(" ", arrivals));
        System.out.println("stack peek:   " + stack.peek());
        System.out.println("queue peek:   " + queue.peek());

        StringJoiner out = new StringJoiner(" ");
        while (!stack.isEmpty()) out.add(stack.pop());       // pop = removeFirst
        System.out.println("stack pops:   " + out + "   (LIFO)");

        out = new StringJoiner(" ");
        while (!queue.isEmpty()) out.add(queue.poll());      // poll = removeFirst, null if empty
        System.out.println("queue pops:   " + out + "   (FIFO)");
        System.out.println("both empty:   " + (stack.isEmpty() && queue.isEmpty()));
    }
}`,
          },
          {
            label: "Undo with a stack, round-robin with a queue",
            code: `import java.util.*;

public class Main {
    // One real job each: undo needs a stack, fair turn-taking needs a queue.

    static String text = "";
    static final Deque<String> history = new ArrayDeque<>();

    static void typeText(String s) {
        history.push(text);                  // remember the state before this edit
        text += s;
        System.out.println("type \\"" + s + "\\" -> \\"" + text + "\\"");
    }

    static void undo() {
        if (!history.isEmpty()) text = history.pop();
        System.out.println("undo        -> \\"" + text + "\\"");
    }

    record Task(String name, int left) {}

    public static void main(String[] args) {
        // 1. Undo: every edit pushes the previous text; undo pops the most recent one.
        typeText("Hel");
        typeText("lo");
        typeText(" wrld");
        undo();                              // removes the LAST edit, not the first
        typeText(" world");

        // 2. Round-robin scheduling: each task runs for at most 2 time units,
        //    then goes to the back of the line if it still has work left.
        Queue<Task> tasks = new ArrayDeque<>(List.of(new Task("A", 3), new Task("B", 1), new Task("C", 5)));
        int clock = 0, quantum = 2;
        while (!tasks.isEmpty()) {
            Task t = tasks.poll();
            int run = Math.min(quantum, t.left());
            clock += run;
            if (t.left() - run > 0) {
                tasks.offer(new Task(t.name(), t.left() - run));
                System.out.println("t=" + clock + ": " + t.name() + " ran " + run + ", " + (t.left() - run) + " left, back of the queue");
            } else {
                System.out.println("t=" + clock + ": " + t.name() + " ran " + run + ", finished");
            }
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"What is the difference between a stack and a queue? Give me a real use for each, and tell me which C++ types you would use to implement them and what each operation costs."

**What a strong answer should cover:**
- LIFO versus FIFO, with the operation names (push, pop, peek; enqueue, dequeue).
- All core operations are O(1), and why a queue needs a structure that is cheap at both ends.
- Concrete uses: call stack, undo, bracket matching and DFS for stacks; BFS, scheduling and buffers for queues.
- Related structures: deque, priority queue, circular buffer, a queue built from two stacks.
- C++ specifics: \`std::stack\` and \`std::queue\` are container adapters (over \`std::deque\` by default), \`pop()\` returns \`void\` so you read \`top()\`/\`front()\` first, and calling those on an empty adapter is undefined behaviour.

**Code / implementation expected:** Optional — using the right C++ built-ins, or a short undo or round-robin example.`,
        answer: `**Target Audience:** Beginners learning data structures — no prior knowledge assumed.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`g++ -std=c++17 main.cpp && ./a.out\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

In a restaurant kitchen, clean plates go onto a pile. The dishwasher puts each new plate **on top**, and the cook takes the plate **from the top**. The plate washed last is used first; the one at the bottom may sit there all evening. That pile is a **stack**.

At the bakery counter outside, customers stand in a line. New customers join **at the back**, and the baker serves **from the front**. Whoever arrived first is served first, which is exactly what makes the line feel fair. That line is a **queue**.

Both hold a collection of things and both only let you add and remove at fixed places, which is what makes them fast and simple. The single difference is *which* item comes out next: the newest (stack) or the oldest (queue). Choosing the wrong one gives you an undo button that undoes your first edit, or a printer that prints the most recent page first.

## 2. The Stack: Last In, First Out

A stack allows three operations, all at one end called the **top**: \`push\` (add on top), \`pop\` (remove from the top) and \`peek\` (look at the top without removing it).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A stack: push and pop both happen at the top, so the last item pushed is the first popped">
  <defs>
    <marker id="b02q3-cpp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="110" y="165" text-anchor="middle">Stack (LIFO)</text>
  <text class="d-sub" x="250" y="38" text-anchor="middle">push</text>
  <path class="d-edge" d="M 300 20 L 300 72" marker-end="url(#b02q3-cpp-arrow)"/>
  <text class="d-sub" x="470" y="38" text-anchor="middle">pop</text>
  <path class="d-edge-accent" d="M 420 76 L 420 24" marker-end="url(#b02q3-cpp-arrow)"/>
  <rect class="d-box-accent" x="260" y="80" width="200" height="50" rx="4"/>
  <text class="d-text d-accent" x="360" y="111" text-anchor="middle">D (last in)</text>
  <rect class="d-box" x="260" y="130" width="200" height="50" rx="4"/>
  <text class="d-text" x="360" y="161" text-anchor="middle">C</text>
  <rect class="d-box" x="260" y="180" width="200" height="50" rx="4"/>
  <text class="d-text" x="360" y="211" text-anchor="middle">B</text>
  <rect class="d-box-muted" x="260" y="230" width="200" height="50" rx="4"/>
  <text class="d-text" x="360" y="261" text-anchor="middle">A (first in)</text>
  <path class="d-edge-dashed" d="M 560 105 L 466 105" marker-end="url(#b02q3-cpp-arrow)"/>
  <text class="d-sub" x="600" y="110" text-anchor="middle">top</text>
</svg>

Pushing A, B, C, D and then popping four times gives D, C, B, A: the reverse of the arrival order.

📌 **Interview term: LIFO (Last In, First Out)** — the rule that the most recently added item is the first one removed. It defines a stack.

📌 **Interview term: Push / pop / peek** — add to the top, remove from the top, read the top without removing it. Each is O(1).

📌 **Interview term: Stack underflow** — trying to pop or peek an empty stack. Every language handles it differently (an exception, \`undefined\`, or undefined behaviour), so check for empty first.

## 3. The Queue: First In, First Out

A queue adds at one end (the **back**, or rear) and removes from the other (the **front**). The operations are usually called \`enqueue\` (or \`offer\`, \`push\`, \`append\`) and \`dequeue\` (or \`poll\`, \`popleft\`).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="A queue: items join at the back and leave from the front, so the first item in is the first out">
  <defs>
    <marker id="b02q3q-cpp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="34" text-anchor="middle">Queue (FIFO)</text>
  <path class="d-edge-accent" d="M 176 100 L 66 100" marker-end="url(#b02q3q-cpp-arrow)"/>
  <text class="d-sub" x="115" y="82" text-anchor="middle">dequeue</text>
  <rect class="d-box-accent" x="180" y="70" width="90" height="60" rx="4"/>
  <text class="d-text d-accent" x="225" y="106" text-anchor="middle">A</text>
  <rect class="d-box" x="270" y="70" width="90" height="60" rx="4"/>
  <text class="d-text" x="315" y="106" text-anchor="middle">B</text>
  <rect class="d-box" x="360" y="70" width="90" height="60" rx="4"/>
  <text class="d-text" x="405" y="106" text-anchor="middle">C</text>
  <rect class="d-box-muted" x="450" y="70" width="90" height="60" rx="4"/>
  <text class="d-text" x="495" y="106" text-anchor="middle">D</text>
  <path class="d-edge" d="M 680 100 L 548 100" marker-end="url(#b02q3q-cpp-arrow)"/>
  <text class="d-sub" x="615" y="82" text-anchor="middle">enqueue</text>
  <text class="d-sub" x="225" y="162" text-anchor="middle">front</text>
  <text class="d-sub" x="495" y="162" text-anchor="middle">back</text>
</svg>

Enqueuing A, B, C, D and then dequeuing four times gives A, B, C, D: the same order they arrived in.

📌 **Interview term: FIFO (First In, First Out)** — the rule that the oldest item is removed first. It defines a queue.

📌 **Interview term: Enqueue / dequeue** — add at the back, remove from the front. Each must be O(1); a queue whose dequeue shifts every element is a bug, not a queue.

## 4. Side-by-Side Comparison

| | Stack | Queue |
| :--- | :--- | :--- |
| Removal order | newest first (LIFO) | oldest first (FIFO) |
| Where you add | top | back |
| Where you remove | top (same end) | front (other end) |
| Core operations | push, pop, peek — all O(1) | enqueue, dequeue, peek — all O(1) |
| Simplest backing | dynamic array, using its end | circular buffer, deque, or linked list with head and tail |
| Typical uses | function calls, undo, matching brackets, depth-first search, expression evaluation | scheduling, buffering, breadth-first search, rate limiting, message queues |

The backing row is the subtle part. A stack only touches one end, so a dynamic array works perfectly: its end is O(1) to add and remove. A queue touches **both** ends, and removing from the front of a plain array shifts everything left, which is O(n). That is why each language has a separate structure for queues (see the language section below).

## 5. Where Each One Shows Up

**Stacks** appear whenever you must come back to something in reverse order:

- **The call stack.** Every function call pushes a frame and every return pops it. Recursion is a stack you do not see; see [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).
- **Undo.** Each edit pushes the previous state; undo pops the most recent one (Example 2).
- **Matching brackets.** Push each opening bracket, pop when a closing one arrives and check that they match: [valid parentheses](/interview-question/how-do-you-check-for-valid-balanced-parentheses).
- **Depth-first search** with an explicit stack, and the [monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it) pattern for "next greater element" problems.

**Queues** appear whenever things must be handled in arrival order:

- **Breadth-first search** visits nodes level by level using a queue; see [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs) and [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree).
- **Scheduling.** Round-robin CPU scheduling gives each task a time slice and sends unfinished tasks to the back (Example 2).
- **Buffers** between a producer and a consumer: keyboard input, network packets, print jobs.

📌 **Interview term: Call stack** — the stack of active function calls the runtime keeps; deep recursion can overflow it.

## 6. Relatives Worth Naming

- **Deque (double-ended queue):** add and remove at both ends in O(1). It can act as a stack or a queue, which is why several languages use one deque type for both.
- **Priority queue:** removes the item with the highest priority, not the oldest; usually a binary heap with O(log n) operations. See [heaps and priority queues](/interview-question/what-is-a-heap-priority-queue).
- **Circular buffer (ring buffer):** a fixed-size array with head and tail indices that wrap around, giving an O(1) queue without shifting.
- **A queue from two stacks:** a classic interview exercise with amortized O(1) operations; see [implementing a queue using two stacks](/interview-question/how-do-you-implement-a-queue-using-two-stacks). The reverse direction is the [min stack](/interview-question/how-do-you-design-a-min-stack-with-o-1-getmin) family of design questions.

📌 **Interview term: Deque** — a double-ended queue, pronounced "deck", with O(1) insertion and removal at both ends.

📌 **Interview term: Priority queue** — a queue that always removes the highest-priority item next, regardless of arrival order.

## 7. In C++: std::stack and std::queue Adapters

~~~cpp
#include <queue>
#include <stack>

std::stack<std::string> st;
st.push("A");                    // push on top
std::string top = st.top();      // read first...
st.pop();                        // ...then remove: pop() returns void

std::queue<std::string> q;
q.push("A");                     // enqueue at the back
std::string front = q.front();   // read first...
q.pop();                         // ...then remove from the front
~~~

* **Adapters, not containers.** \`std::stack<T>\` and \`std::queue<T>\` wrap another container and expose only the allowed operations. In libstdc++ (g++ 13) both are declared with \`typename _Sequence = deque<_Tp>\`, so the default underlying container is \`std::deque\`. You can choose another: \`std::stack<int, std::vector<int>>\` is common.
* **\`pop()\` returns \`void\`.** You must call \`top()\` or \`front()\` first. The usual explanation is exception safety: if \`pop()\` returned the element by value and the copy threw, the element would already be gone.
* **Empty means undefined behaviour.** Calling \`top()\`, \`front()\` or \`pop()\` on an empty adapter is undefined behaviour: no exception, possibly a crash or garbage. Always check \`empty()\`.
* **Copy before pop.** \`auto [name, left] = tasks.front(); tasks.pop();\` in Example 2 copies the values out; holding a reference to \`front()\` across \`pop()\` would dangle.
* **\`std::priority_queue\`** is a **max-heap** by default; use \`std::greater<T>\` as the comparator for a min-heap. Its \`push\` and \`pop\` are O(log n).

## 8. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`g++ -std=c++17 main.cpp && ./a.out\`; the blocks are the exact standard output.

**Example 1 — the same four arrivals through a stack and a queue**

~~~text
arrivals:     A B C D
stack peek:   D
queue peek:   A
stack pops:   D C B A   (LIFO)
queue pops:   A B C D   (FIFO)
both empty:   true
~~~

**Example 2 — undo with a stack, round-robin scheduling with a queue**

~~~text
type "Hel" -> "Hel"
type "lo" -> "Hello"
type " wrld" -> "Hello wrld"
undo        -> "Hello"
type " world" -> "Hello world"
t=2: A ran 2, 1 left, back of the queue
t=3: B ran 1, finished
t=5: C ran 2, 3 left, back of the queue
t=6: A ran 1, finished
t=8: C ran 2, 1 left, back of the queue
t=9: C ran 1, finished
~~~

**Reading Example 2:** the undo removed " wrld", the most recent edit, which only a stack gives you. In the scheduler, B finished first (at t=3) because it needed one slice, and C, which needed five units, kept going to the back of the queue until it finished at t=9: every task got a fair turn in arrival order.

## 9. Complexity

| Operation | Stack | Queue (proper) | Queue backed by a plain array with front removal |
| :--- | :--- | :--- | :--- |
| add | O(1) amortized | O(1) amortized | O(1) amortized |
| remove | O(1) | O(1) | **O(n)** — every remaining item shifts |
| peek | O(1) | O(1) | O(1) |
| space | O(n) | O(n) | O(n) |

"Amortized" because a dynamic array occasionally grows by copying; see [amortized analysis](/interview-question/what-is-amortized-analysis). In Example 2, the round-robin loop does one dequeue and at most one enqueue per time slice, so its cost is O(total slices).

## 10. Edge Cases to Mention

- **Pop, peek or dequeue on an empty structure:** decide whether to throw, return a sentinel, or check \`is empty\` first (see the language notes for what actually happens).
- **A bounded queue that is full:** a ring buffer must reject, block, or overwrite the oldest item; say which.
- **One element:** after removing it, both ends must agree the structure is empty.
- **Interleaved operations:** push, pop, push again; the next pop must return the most recent push, not an older item.

## 11. Common Pitfalls

- **\`int x = st.pop();\`** does not compile: \`pop()\` returns \`void\`. Read \`top()\` first.
- **Calling \`top()\`/\`front()\`/\`pop()\` on an empty adapter.** It is undefined behaviour, not an exception; check \`empty()\`.
- **Keeping a reference to \`front()\` across \`pop()\`.** The element is destroyed, so the reference dangles. Copy (or move) it out first.
- **Expecting \`std::priority_queue\` to give the smallest item.** It is a max-heap by default; use \`std::priority_queue<int, std::vector<int>, std::greater<int>>\` for a min-heap.
- **Using \`std::vector\` with \`erase(begin())\` as a queue.** That shifts every element: O(n) per dequeue. Use \`std::queue\` or \`std::deque\`.
- **Deep recursion instead of an explicit stack.** The thread stack is small (often a few MB), so a deep recursive DFS can crash; an explicit \`std::stack\` or \`std::vector\` avoids it.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core difference:</strong> <span style="color:#f0e2c8;">A stack removes the newest item first (LIFO); a queue removes the oldest item first (FIFO).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Operations:</strong> <span style="color:#f0e2c8;">Stack: push, pop, top at one end. Queue: push at the back, pop and front at the front. All O(1) amortized with the default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::deque</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. In C++:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code> are adapters over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::deque</code> by default; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code>, so I read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">front()</code> first.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where they are used:</strong> <span style="color:#f0e2c8;">Stacks: call stack, undo, bracket matching, DFS. Queues: BFS, scheduling, producer and consumer buffers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The traps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> on an empty adapter is undefined behaviour, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::priority_queue</code> is a max-heap unless I pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::greater</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pop()</code> return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">void</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Returning the removed element by value could throw while copying, after the element was already removed, so it would be lost. Splitting read (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top</code>) and remove (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code>) avoids that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the default container of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::stack</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::deque</code>; libstdc++ declares <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack</code> with a default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_Sequence</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> works too for a stack, but not for a queue, because a vector has no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_front</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens on <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">top()</code> of an empty stack?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Undefined behaviour: no exception is thrown. Bracket-matching code must check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">empty()</code> before reading the top on a closing bracket.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you implement a queue with two stacks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inbox</code> stack; to dequeue, if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code> is empty, move everything from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inbox</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code>, then pop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code>. Each element moves at most twice: amortized O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which one does BFS use, and which DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS uses a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code> so it visits by distance; DFS uses a stack, explicit or the call stack, so it goes deep first.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **LIFO** | Last In, First Out: the newest item leaves first (stack) |
| **FIFO** | First In, First Out: the oldest item leaves first (queue) |
| **Push / pop / peek** | Add to, remove from, and read the top of a stack |
| **Enqueue / dequeue** | Add at the back, remove from the front of a queue |
| **Stack underflow** | Popping or peeking an empty stack |
| **Call stack** | The runtime stack of active function calls |
| **Deque** | Double-ended queue: O(1) at both ends |
| **Priority queue** | Removes the highest-priority item next, usually a heap |
| **Container adapter** | A C++ wrapper (stack, queue, priority_queue) that restricts another container to a few operations |

---
**Conclusion:** A stack and a queue both restrict where you can add and remove, which keeps every operation O(1); the only difference is which item leaves next. A stack returns the newest item (LIFO) and fits undo, the call stack, bracket matching and DFS; a queue returns the oldest (FIFO) and fits BFS, scheduling and buffering. In C++, \`std::stack\` and \`std::queue\` are thin adapters over \`std::deque\`, with two rules to remember: read \`top()\` or \`front()\` before the \`void\` \`pop()\`, and never touch an empty one. Example 1's output (D C B A against A B C D) shows the whole difference in two lines.`,
        examples: [
          {
            label: "Same arrivals, opposite exits",
            code: `#include <iostream>
#include <queue>
#include <stack>
#include <string>
#include <vector>

// Same arrivals, opposite exits. std::stack and std::queue are adapters over
// std::deque by default; pop() returns void, so read top()/front() first.
int main() {
    std::vector<std::string> arrivals = {"A", "B", "C", "D"};
    std::stack<std::string> st;
    std::queue<std::string> q;
    for (const auto& item : arrivals) {
        st.push(item);
        q.push(item);          // queue::push adds at the back
    }

    std::string line;
    for (const auto& a : arrivals) line += (line.empty() ? "" : " ") + a;
    std::cout << "arrivals:     " << line << "\\n";
    std::cout << "stack peek:   " << st.top() << "\\n";
    std::cout << "queue peek:   " << q.front() << "\\n";

    line.clear();
    while (!st.empty()) {
        line += (line.empty() ? "" : " ") + st.top();   // read, then remove
        st.pop();
    }
    std::cout << "stack pops:   " << line << "   (LIFO)\\n";

    line.clear();
    while (!q.empty()) {
        line += (line.empty() ? "" : " ") + q.front();
        q.pop();
    }
    std::cout << "queue pops:   " << line << "   (FIFO)\\n";
    std::cout << std::boolalpha << "both empty:   " << (st.empty() && q.empty()) << "\\n";
}`,
          },
          {
            label: "Undo with a stack, round-robin with a queue",
            code: `#include <algorithm>
#include <iostream>
#include <queue>
#include <stack>
#include <string>
#include <utility>

// One real job each: undo needs a stack, fair turn-taking needs a queue.

std::string text;
std::stack<std::string> history;

void typeText(const std::string& s) {
    history.push(text);                      // remember the state before this edit
    text += s;
    std::cout << "type \\"" << s << "\\" -> \\"" << text << "\\"\\n";
}

void undo() {
    if (!history.empty()) {                  // top() on an empty stack is undefined behaviour
        text = history.top();
        history.pop();
    }
    std::cout << "undo        -> \\"" << text << "\\"\\n";
}

int main() {
    // 1. Undo: every edit pushes the previous text; undo pops the most recent one.
    typeText("Hel");
    typeText("lo");
    typeText(" wrld");
    undo();                                  // removes the LAST edit, not the first
    typeText(" world");

    // 2. Round-robin scheduling: each task runs for at most 2 time units,
    //    then goes to the back of the line if it still has work left.
    std::queue<std::pair<std::string, int>> tasks;
    tasks.push({"A", 3});
    tasks.push({"B", 1});
    tasks.push({"C", 5});
    int clock = 0;
    const int quantum = 2;
    while (!tasks.empty()) {
        auto [name, left] = tasks.front();   // copy out before pop() destroys it
        tasks.pop();
        int run = std::min(quantum, left);
        clock += run;
        if (left - run > 0) {
            tasks.push({name, left - run});
            std::cout << "t=" << clock << ": " << name << " ran " << run << ", " << (left - run) << " left, back of the queue\\n";
        } else {
            std::cout << "t=" << clock << ": " << name << " ran " << run << ", finished\\n";
        }
    }
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does a hash table work?",
    difficulty: "medium",
    seoDescription: "How hash tables work: hash functions, buckets, collisions, load factor and resizing, built from scratch and compared with Python, JS, Java and C++ maps.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Explain how a hash table works under the hood: what happens when you insert a key, how collisions are handled, and why lookups are fast. Then tell me how Python's built-in hash map behaves, and sketch a simple one in Python if we have time."

**What a strong answer should cover:**
- Hash function → hash code → bucket index (modulo the bucket count), and the rule that equal keys must have equal hashes.
- Collision handling: separate chaining versus open addressing (probing), and tombstones on deletion.
- Load factor and resizing with rehashing, giving amortized O(1) inserts.
- Average O(1) versus worst-case O(n), what causes the worst case (bad hash, adversarial keys) and the defences.
- No ordering guarantees from hashing itself; a tree map when order or ranges matter.
- Python specifics: \`dict\` and \`set\` are hash tables (CPython uses open addressing), keys must be hashable (a \`list\` is not), \`dict\` keeps insertion order since Python 3.7, and \`str\` hashes are randomised per process.

**Code / implementation expected:** Optional — a small separate-chaining table with put, get, remove and resize in Python, or correct use of the built-in map.`,
        answer: `**Target Audience:** Developers who use maps every day and want to know what happens inside — beginners welcome.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`python3 main.py\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A theatre cloakroom has 100 hooks. When you hand in your coat, the attendant does not hang it on the first free hook and then search all 100 when you come back. Instead, they use a rule: take the last two digits of your ticket number, and that is your hook. Ticket 4,217 goes on hook 17. When you return, they compute 17 again and walk straight to it. The work is the same whether the cloakroom holds 3 coats or 90.

Sometimes two tickets end in the same digits, 4,217 and 8,317. The attendant then hangs both on hook 17 and checks the ticket numbers when someone comes back; with a good rule and enough hooks, a hook rarely holds more than one or two coats. When the cloakroom gets crowded, they move to a bigger room with more hooks and rehang everything using the new rule.

That is the entire idea of a hash table: a **rule that turns a key into a position**, a plan for **two keys that land on the same position**, and **growing** when it gets full. It is why looking something up in a Python \`dict\`, a JavaScript \`Map\`, a Java \`HashMap\` or a C++ \`unordered_map\` takes about the same time for ten items or ten million.

## 2. The Core Idea: Key → Hash → Bucket

A hash table stores **key-value pairs** in an array of slots called **buckets**. To find where a key belongs:

1. Run the key through a **hash function**, which turns it into an integer, the **hash code**.
2. Reduce the hash code to a bucket index, most simply with \`hash % number_of_buckets\`.
3. Store or look for the pair in that bucket.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 160" role="img" aria-label="A key goes through the hash function to a number, and the number modulo the bucket count picks the bucket">
  <defs>
    <marker id="b02q4-python-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="130" height="80" rx="10"/>
  <text class="d-text" x="85" y="72" text-anchor="middle">key</text>
  <text class="d-sub" x="85" y="98" text-anchor="middle">apple</text>
  <path class="d-edge" d="M 154 80 L 194 80" marker-end="url(#b02q4-python-arrow)"/>
  <rect class="d-box" x="200" y="40" width="150" height="80" rx="10"/>
  <text class="d-text" x="275" y="72" text-anchor="middle">hash function</text>
  <text class="d-sub" x="275" y="98" text-anchor="middle">h times 31 plus char</text>
  <path class="d-edge" d="M 354 80 L 394 80" marker-end="url(#b02q4-python-arrow)"/>
  <rect class="d-box" x="400" y="40" width="130" height="80" rx="10"/>
  <text class="d-text" x="465" y="72" text-anchor="middle">hash code</text>
  <text class="d-sub" x="465" y="98" text-anchor="middle">93029210</text>
  <path class="d-edge-accent" d="M 534 80 L 574 80" marker-end="url(#b02q4-python-arrow)"/>
  <rect class="d-box-accent" x="580" y="40" width="120" height="80" rx="10"/>
  <text class="d-text d-accent" x="640" y="72" text-anchor="middle">bucket 10</text>
  <text class="d-sub" x="640" y="98" text-anchor="middle">mod 16</text>
</svg>

The hash function used in this doc's examples treats a string as a number in base 31: start at 0, and for each character do \`h = (h × 31 + character code) mod 1,000,000,007\`. For \`"apple"\` that gives 93,029,210, and with 16 buckets, 93,029,210 mod 16 = 10. Computing a hash takes time proportional to the key length, not to the number of stored items, so lookups cost the same for any table size: **O(1) on average**.

📌 **Interview term: Hash function** — a function that maps a key to an integer. It must be **deterministic** (the same key always gives the same hash) and should spread different keys **uniformly** across the possible values.

📌 **Interview term: Bucket** — one slot of the table's underlying array; it holds the entries whose hash maps to that index.

📌 **Interview term: Equal keys, equal hashes** — the one rule every hash table depends on: if two keys are equal, their hashes must be equal. (The reverse does not hold: different keys may share a hash.)

## 3. Collisions: When Two Keys Want the Same Bucket

There are far more possible keys than buckets, so some different keys **must** land in the same bucket (the pigeonhole principle). That is a **collision**, and every hash table needs a strategy for it. There are two families.

### Separate chaining

Each bucket holds a small list (a chain) of all entries that hash there. A lookup goes to the bucket, then compares keys along the chain. This is what Example 1 implements. With 8 buckets, its keys landed like this:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="Separate chaining with 8 buckets: bucket 2 holds apple then elderberry, bucket 3 holds cherry then grape">
  <defs>
    <marker id="b02q4c-python-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="70" y="26" text-anchor="middle">buckets</text>
  <rect class="d-box-muted" x="40" y="40" width="60" height="30"/>
  <text class="d-sub" x="70" y="60" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="40" y="70" width="60" height="30"/>
  <text class="d-sub" x="70" y="90" text-anchor="middle">1</text>
  <rect class="d-box" x="40" y="100" width="60" height="30"/>
  <text class="d-text" x="70" y="120" text-anchor="middle">2</text>
  <rect class="d-box" x="40" y="130" width="60" height="30"/>
  <text class="d-text" x="70" y="150" text-anchor="middle">3</text>
  <rect class="d-box" x="40" y="160" width="60" height="30"/>
  <text class="d-text" x="70" y="180" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="40" y="190" width="60" height="30"/>
  <text class="d-sub" x="70" y="210" text-anchor="middle">5</text>
  <rect class="d-box" x="40" y="220" width="60" height="30"/>
  <text class="d-text" x="70" y="240" text-anchor="middle">6</text>
  <rect class="d-box" x="40" y="250" width="60" height="30"/>
  <text class="d-text" x="70" y="270" text-anchor="middle">7</text>
  <path class="d-edge" d="M 104 115 L 174 115" marker-end="url(#b02q4c-python-arrow)"/>
  <rect class="d-box" x="180" y="103" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="120" text-anchor="middle">apple = 1</text>
  <path class="d-edge-accent" d="M 334 115 L 404 115" marker-end="url(#b02q4c-python-arrow)"/>
  <rect class="d-box-accent" x="410" y="103" width="170" height="24" rx="6"/>
  <text class="d-sub" x="495" y="120" text-anchor="middle">elderberry = 5</text>
  <path class="d-edge" d="M 104 145 L 174 145" marker-end="url(#b02q4c-python-arrow)"/>
  <rect class="d-box" x="180" y="133" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="150" text-anchor="middle">cherry = 3</text>
  <path class="d-edge-accent" d="M 334 145 L 404 145" marker-end="url(#b02q4c-python-arrow)"/>
  <rect class="d-box-accent" x="410" y="133" width="170" height="24" rx="6"/>
  <text class="d-sub" x="495" y="150" text-anchor="middle">grape = 7</text>
  <path class="d-edge" d="M 104 175 L 174 175" marker-end="url(#b02q4c-python-arrow)"/>
  <rect class="d-box" x="180" y="163" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="180" text-anchor="middle">fig = 6</text>
  <path class="d-edge" d="M 104 235 L 174 235" marker-end="url(#b02q4c-python-arrow)"/>
  <rect class="d-box" x="180" y="223" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="240" text-anchor="middle">date = 4</text>
  <path class="d-edge" d="M 104 265 L 174 265" marker-end="url(#b02q4c-python-arrow)"/>
  <rect class="d-box" x="180" y="253" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="270" text-anchor="middle">banana = 2</text>
</svg>

\`apple\` and \`elderberry\` both hash to bucket 2, and \`cherry\` and \`grape\` both to bucket 3, so those buckets hold two entries each. Looking up \`grape\` costs one hash and two key comparisons.

### Open addressing

All entries live directly in the bucket array. If the home bucket is taken, the table **probes** other buckets in a fixed order until it finds a free one (or, for a lookup, the key or an empty slot). The simplest order is **linear probing**: try the next slot, then the next.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Linear probing: grape hashes to slot 3, which is taken, so it tries slot 4, also taken, and lands in slot 5">
  <defs>
    <marker id="b02q4p-python-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="24" text-anchor="middle">Open addressing: grape has home slot 3</text>
  <rect class="d-box-muted" x="40" y="80" width="80" height="50"/>
  <rect class="d-box-muted" x="120" y="80" width="80" height="50"/>
  <rect class="d-box" x="200" y="80" width="80" height="50"/>
  <text class="d-sub" x="240" y="110" text-anchor="middle">apple</text>
  <rect class="d-box" x="280" y="80" width="80" height="50"/>
  <text class="d-sub" x="320" y="110" text-anchor="middle">cherry</text>
  <rect class="d-box" x="360" y="80" width="80" height="50"/>
  <text class="d-sub" x="400" y="110" text-anchor="middle">fig</text>
  <rect class="d-box-accent" x="440" y="80" width="80" height="50"/>
  <text class="d-sub d-accent" x="480" y="110" text-anchor="middle">grape</text>
  <rect class="d-box-muted" x="520" y="80" width="80" height="50"/>
  <rect class="d-box-muted" x="600" y="80" width="80" height="50"/>
  <path class="d-edge-dashed" d="M 320 76 Q 360 44 396 72" marker-end="url(#b02q4p-python-arrow)"/>
  <path class="d-edge-accent" d="M 400 76 Q 440 44 476 72" marker-end="url(#b02q4p-python-arrow)"/>
  <text class="d-sub" x="80" y="156" text-anchor="middle">0</text>
  <text class="d-sub" x="160" y="156" text-anchor="middle">1</text>
  <text class="d-sub" x="240" y="156" text-anchor="middle">2</text>
  <text class="d-sub" x="320" y="156" text-anchor="middle">3 taken</text>
  <text class="d-sub" x="400" y="156" text-anchor="middle">4 taken</text>
  <text class="d-sub" x="480" y="156" text-anchor="middle">5 free</text>
  <text class="d-sub" x="560" y="156" text-anchor="middle">6</text>
  <text class="d-sub" x="640" y="156" text-anchor="middle">7</text>
</svg>

Open addressing keeps everything in one contiguous array (good cache behaviour) but needs care on deletion: simply emptying a slot would break the probe chain for keys placed after it, so implementations leave a **tombstone** marker instead.

📌 **Interview term: Collision** — two different keys mapping to the same bucket. It is unavoidable; a good table keeps it rare and cheap.

📌 **Interview term: Separate chaining** — resolving collisions by keeping a list of entries in each bucket.

📌 **Interview term: Open addressing (probing)** — resolving collisions by placing the entry in another slot of the same array, found by a probe sequence such as linear probing.

📌 **Interview term: Tombstone** — a "deleted" marker in an open-addressing table, so later lookups keep probing past it.

## 4. Load Factor and Resizing

The **load factor** is \`entries / buckets\`. As it rises, chains get longer (or probe sequences get longer), and lookups slow down. So a table sets a limit, and when an insert pushes it over, the table **resizes**: it allocates a bigger bucket array (usually double) and **rehashes** every entry, because \`hash % buckets\` changes when the bucket count changes.

Example 1 starts with 4 buckets and a limit of 0.75. The output shows the 4th insert pushing the load to 4/4 and triggering a resize to 8 buckets, and the 7th insert (7/8) triggering a resize to 16. After the resize, \`apple\` moved from bucket 2 to bucket 10: same hash, different modulus.

A single resize costs O(n), but because the size doubles each time, resizes are rare enough that inserts are still **amortized O(1)**, the same argument as for dynamic arrays (see [amortized analysis](/interview-question/what-is-amortized-analysis)).

📌 **Interview term: Load factor** — the number of entries divided by the number of buckets; the table resizes when it passes a threshold (0.75 in Java's \`HashMap\` and in Example 1).

📌 **Interview term: Rehashing** — recomputing every entry's bucket after the bucket array changes size.

## 5. What Makes a Hash Function Good

A good hash function is **deterministic**, **fast**, and **spreads keys evenly**. Example 3 shows what happens when the last property fails. It puts the same 1,000 keys (\`user0\` to \`user999\`) into 1,024 buckets twice, once with the base-31 hash and once with a "hash" that returns the key length:

- With the length hash, all keys of the same length collide: only 3 buckets were used, the longest chain had 900 entries, and an average lookup needed 409.60 comparisons. The table had become a slow linked list: **O(n)** per lookup.
- With the base-31 hash, the average lookup needed 2.35 comparisons.
- The same base-31 hash with 1,031 buckets (a prime) needed only 1.25. Keys like \`user0\` ... \`user999\` differ only in their last characters, and taking a hash modulo a power of two keeps only its lowest bits, so similar keys cluster. A prime modulus mixes in all the bits. Real libraries fix this in the hash itself instead; the language section shows how.

That worst case is also a security issue: if attackers can choose keys that collide, they can make a server's hash tables O(n) per operation (**hash flooding**). Defences include randomised hash seeds and switching long chains to balanced trees.

📌 **Interview term: Uniform distribution** — a hash function spreading keys evenly over all buckets, so every chain stays short.

📌 **Interview term: Hash flooding** — a denial-of-service attack that sends many keys with the same hash to force worst-case O(n) operations.

## 6. Average Case vs Worst Case

| Operation | Average | Worst case | Why |
| :--- | :--- | :--- | :--- |
| insert / put | O(1) amortized | O(n) | one hash plus a short chain; a resize or all keys colliding is O(n) |
| lookup / get | O(1) | O(n) | same; the worst case is one long chain |
| delete | O(1) | O(n) | find the entry, unlink it (or leave a tombstone) |
| iterate all entries | O(n + buckets) | O(n + buckets) | every bucket is visited, empty or not |
| space | O(n + buckets) | O(n + buckets) | entries plus the bucket array |

"Average" assumes a good hash function and a bounded load factor. A hash table also gives **no useful order**: the iteration order of a pure hash table depends on hash values, not on keys or insertion time. When you need sorted keys or range queries, use a balanced tree map (O(log n) per operation); see [operation complexities compared](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance).

Hash tables are the engine behind many interview patterns: [Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently), [group anagrams](/interview-question/how-do-you-group-anagrams-together), [longest consecutive sequence](/interview-question/longest-consecutive-sequence-in-o-n-with-hash-set-why-not-sort) and the [LRU cache](/interview-question/how-do-you-design-an-lru-cache).

## 7. In Python: dict and set

- **\`dict\` and \`set\` are hash tables.** CPython's dict uses open addressing: the probing scheme is described in the comments of \`Objects/dictobject.c\`, where each probe step mixes in more bits of the hash through a \`perturb\` value. You never see buckets, but the costs are the ones above: O(1) average for \`d[k]\`, \`k in d\`, \`d[k] = v\` and \`del d[k]\`.
- **Insertion order is guaranteed since Python 3.7.** Iterating a \`dict\` yields keys in the order they were first inserted (in 3.6 this was a CPython detail; [Python 3.7](https://docs.python.org/3/whatsnew/3.7.html) made it part of the language). That order comes from how CPython stores entries, not from hashing, and it is *not* sorted order: Example 2 still sorts explicitly.
- **Keys must be hashable.** Immutable built-ins (\`int\`, \`str\`, \`tuple\` of hashables, \`frozenset\`) are; \`{[1, 2]: "x"}\` raises \`TypeError: unhashable type: 'list'\`. Use a tuple as a composite key: \`d[(row, col)]\`.
- **String hashes are randomised per process.** Running \`python3 -c "print(hash('apple'))"\` twice printed -4794054594650059894 and then 7173994552354699047. This defends against hash flooding; set \`PYTHONHASHSEED\` only for reproducible experiments. It is also why Example 1 writes its own hash function: \`hash()\` would print different buckets on every run.
- **Custom classes:** define \`__eq__\` and \`__hash__\` together, from the same immutable fields. Defining only \`__eq__\` makes instances unhashable.
- **Counting tools:** \`dict.get(k, 0)\`, \`collections.defaultdict(int)\` and \`collections.Counter\` (with \`most_common\`).

## 8. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`python3 main.py\`; the blocks are the exact standard output.

**Example 1 — a separate-chaining table from scratch: collisions, two resizes, update, get and remove**

~~~text
put apple = 1 -> hash 93029210 % 4 = bucket 2
put banana = 2 -> hash 898612055 % 4 = bucket 3
put cherry = 3 -> hash 933454219 % 4 = bucket 3
put date = 4 -> hash 3076014 % 4 = bucket 2
  load 4/4 > 0.75: resize to 8 buckets and rehash every key
put elderberry = 5 -> hash 307547146 % 8 = bucket 2
put fig = 6 -> hash 101380 % 8 = bucket 4
put grape = 7 -> hash 98615627 % 8 = bucket 3
  load 7/8 > 0.75: resize to 16 buckets and rehash every key
put apple = 10 (updated)
get apple -> 10
get kiwi -> missing
remove cherry -> true
get cherry -> missing
size 6, 16 buckets:
  bucket 0: []
  bucket 1: []
  bucket 2: []
  bucket 3: []
  bucket 4: [fig=6]
  bucket 5: []
  bucket 6: []
  bucket 7: [banana=2]
  bucket 8: []
  bucket 9: []
  bucket 10: [apple=10, elderberry=5]
  bucket 11: [grape=7]
  bucket 12: []
  bucket 13: []
  bucket 14: [date=4]
  bucket 15: []
~~~

**Example 2 — the built-in hash map counting words**

~~~text
distinct words: 8
count of 'the': 4
is 'dog' a key? false
count of 'dog': 0 (size still 8)
by count, then word: the=4, and=2, bat=1, cat=1, hat=1, mat=1, on=1, sat=1
top word: the (4 times)
~~~

**Example 3 — a good hash, a bad hash, and a prime bucket count**

~~~text
good hash: buckets used 359/1024, longest chain 6, average comparisons per lookup 2.35
bad hash : buckets used 3/1024, longest chain 900, average comparisons per lookup 409.60
good hash: buckets used 773/1031, longest chain 3, average comparisons per lookup 1.25
~~~

**Reading Example 1:** at 4 buckets, \`banana\` and \`cherry\` collided in bucket 3; after the resizes the final table has 16 buckets, and \`apple\` and \`elderberry\` still share bucket 10. The update of \`apple\` did not change the size, and after removing \`cherry\` the size is 6.

## 9. Edge Cases to Mention

- **Missing key:** decide between returning a default, \`null\`/\`None\`, or raising. Example 1 returns \`missing\`, Example 2 uses the language's "get with a default".
- **Updating an existing key:** must overwrite in place without increasing the size (Example 1: \`put apple = 10 (updated)\`, size stays 6 after the removal).
- **Deleting a missing key:** returns false rather than failing.
- **All keys colliding:** correctness survives, speed does not (Example 3).
- **Mutable keys:** if a key changes after insertion, its hash changes and the entry can no longer be found.

## 10. Common Pitfalls

- **Expecting \`dict\` order to be sorted.** It is insertion order; sort with \`sorted(d.items(), key=...)\` when output order matters.
- **Using a list as a key.** It raises \`TypeError: unhashable type: 'list'\`; convert to a tuple.
- **Relying on \`hash()\` values across runs.** \`str\` hashes change on every start; never store them or use them for ordering.
- **Defining \`__eq__\` without \`__hash__\`.** Python sets \`__hash__\` to \`None\`, so instances can no longer be dict keys or set members.
- **\`d[k]\` for a key that may be missing.** It raises \`KeyError\`; use \`d.get(k, default)\` or \`defaultdict\`.
- **Changing a dict while iterating it.** Adding or deleting keys during \`for k in d\` raises \`RuntimeError: dictionary changed size during iteration\`; iterate over \`list(d)\` instead.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">A hash table maps a key through a hash function to a bucket index, so insert, lookup and delete are O(1) on average.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Collisions:</strong> <span style="color:#f0e2c8;">Different keys can share a bucket; separate chaining keeps a list per bucket, open addressing probes for another slot. CPython's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> uses open addressing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Load factor:</strong> <span style="color:#f0e2c8;">When entries per bucket pass a limit, the table doubles and rehashes everything: O(n) once, amortized O(1) per insert.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Worst case:</strong> <span style="color:#f0e2c8;">If many keys collide, operations degrade to O(n); that is why the hash must spread keys evenly, and why Python randomises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> hashes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In Python:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> are hash tables, keys must be hashable, and since 3.7 iteration follows insertion order, not sorted order.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is a lookup O(1) and not O(log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The hash computes the bucket directly, so the cost depends on the key length and the chain length, not on how many entries the table holds. A balanced tree compares its way down in O(log n) instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">list</code> not be a dict key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its contents can change, which would change its hash after insertion and lose the entry. Python refuses with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: unhashable type: 'list'</code>; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tuple</code> works.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when the dict grows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It allocates a larger table and reinserts every entry, because each bucket index depends on the table size. That is O(n), but rare enough to be amortized O(1) per insert.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">hash('apple')</code> change between runs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">String hashing is seeded randomly at start-up to defend against hash flooding. Integers are not randomised: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hash(1)</code> is 1.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use a dict?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you need keys in sorted order or range queries; Python has no built-in tree map, so you would sort, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect</code> on a sorted list, or a third-party sorted container.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Hash function** | Maps a key to an integer, deterministically and evenly |
| **Bucket** | One slot of the table array, holding the entries that map there |
| **Equal keys, equal hashes** | The rule every hash table relies on |
| **Collision** | Two different keys mapping to the same bucket |
| **Separate chaining** | Each bucket keeps a list of its entries |
| **Open addressing (probing)** | Colliding entries go to another slot of the same array |
| **Tombstone** | Deleted-slot marker in open addressing |
| **Load factor** | Entries divided by buckets; triggers resizing |
| **Rehashing** | Recomputing every bucket after the table resizes |
| **Uniform distribution** | Keys spread evenly across buckets |
| **Hash flooding** | Attack that forces collisions to make operations O(n) |
| **Hashable** | A Python object with a hash that never changes and an __eq__ to match |

---
**Conclusion:** A hash table turns a key into a bucket index with a hash function, resolves the unavoidable collisions by chaining or probing, and keeps lookups O(1) on average by resizing when the load factor gets too high. Example 1 built one from scratch and showed collisions, two resizes and rehashing; Example 3 showed that a bad hash turns it into an O(n) list. In Python you get all of this from \`dict\` and \`set\`: open addressing underneath, insertion-ordered iteration since 3.7, randomised string hashing for safety, and the rule that keys must be hashable.`,
        examples: [
          {
            label: "A hash table from scratch: chaining, load factor, resize",
            code: `# A hash table from scratch: separate chaining, a load-factor limit, and resizing.
# The hash is written out by hand so every language computes the same numbers.

def poly_hash(key):
    h = 0
    for ch in key:
        h = (h * 31 + ord(ch)) % 1000000007   # keeps h small and exact everywhere
    return h

class HashTable:
    def __init__(self, capacity=4):
        self.buckets = [[] for _ in range(capacity)]   # each bucket is a chain of [key, value]
        self.size = 0

    def _bucket(self, key):
        return self.buckets[poly_hash(key) % len(self.buckets)]

    def put(self, key, value):
        chain = self._bucket(key)
        for pair in chain:
            if pair[0] == key:               # key already present: overwrite, size unchanged
                pair[1] = value
                print("put " + key + " = " + str(value) + " (updated)")
                return
        chain.append([key, value])
        self.size += 1
        print("put " + key + " = " + str(value) + " -> hash " + str(poly_hash(key))
              + " % " + str(len(self.buckets)) + " = bucket " + str(poly_hash(key) % len(self.buckets)))
        if self.size * 4 > len(self.buckets) * 3:   # load factor above 0.75
            self._resize(len(self.buckets) * 2)

    def _resize(self, new_capacity):
        print("  load " + str(self.size) + "/" + str(len(self.buckets)) + " > 0.75: resize to "
              + str(new_capacity) + " buckets and rehash every key")
        old = self.buckets
        self.buckets = [[] for _ in range(new_capacity)]
        for chain in old:
            for key, value in chain:
                self._bucket(key).append([key, value])

    def get(self, key):
        for k, v in self._bucket(key):
            if k == key:
                return str(v)
        return "missing"

    def remove(self, key):
        chain = self._bucket(key)
        for i, pair in enumerate(chain):
            if pair[0] == key:
                chain.pop(i)
                self.size -= 1
                return True
        return False

    def dump(self):
        for i, chain in enumerate(self.buckets):
            print("  bucket " + str(i) + ": [" + ", ".join(k + "=" + str(v) for k, v in chain) + "]")

table = HashTable()
fruits = ["apple", "banana", "cherry", "date", "elderberry", "fig", "grape"]
for i, name in enumerate(fruits):
    table.put(name, i + 1)
table.put("apple", 10)
print("get apple -> " + table.get("apple"))
print("get kiwi -> " + table.get("kiwi"))
print("remove cherry -> " + str(table.remove("cherry")).lower())
print("get cherry -> " + table.get("cherry"))
print("size " + str(table.size) + ", " + str(len(table.buckets)) + " buckets:")
table.dump()`,
          },
          {
            label: "The built-in hash map: word counts",
            code: `# The built-in hash table at work: word counts, membership, and a sorted report.
from collections import Counter

text = "the cat and the hat and the bat sat on the mat"
words = text.split()

counts = {}
for w in words:
    counts[w] = counts.get(w, 0) + 1     # get() with a default: no KeyError for new words

print("distinct words: " + str(len(counts)))  # distinct words: 8
print("count of 'the': " + str(counts["the"]))  # count of 'the': 4
# "in" on a dict is an average O(1) membership test.
print("is 'dog' a key? " + str("dog" in counts).lower())  # is 'dog' a key? false
print("count of 'dog': " + str(counts.get("dog", 0)) + " (size still " + str(len(counts)) + ")")  # count of 'dog': 0 (size still 8)

# Do not rely on the table's internal order for output: sort explicitly.
report = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
print("by count, then word: " + ", ".join(w + "=" + str(c) for w, c in report))  # by count, then word: the=4, and=2, bat=1, cat=1, hat=1, mat=1, on=1, sat=1

# collections.Counter is the same idea, packaged: most_common() does the sort for you.
top_word, top_count = Counter(words).most_common(1)[0]
print("top word: " + top_word + " (" + str(top_count) + " times)")  # top word: the (4 times)`,
          },
          {
            label: "Good hash vs bad hash, counted",
            code: `# Why the hash function matters: the same 1000 keys in 1024 buckets,
# with a good hash and with a bad one, then in 1031 (a prime). We count key comparisons.

def good_hash(key):
    h = 0
    for ch in key:
        h = (h * 31 + ord(ch)) % 1000000007
    return h

def bad_hash(key):
    return len(key)          # every key of the same length collides

def measure(hash_fn, keys, capacity):
    buckets = [[] for _ in range(capacity)]
    for k in keys:
        buckets[hash_fn(k) % capacity].append(k)
    comparisons = 0
    for k in keys:                           # look every key up once
        for candidate in buckets[hash_fn(k) % capacity]:
            comparisons += 1
            if candidate == k:
                break
    longest = max(len(b) for b in buckets)
    used = sum(1 for b in buckets if b)
    return longest, used, comparisons / len(keys)

keys = ["user" + str(i) for i in range(1000)]
for name, fn, capacity in [("good hash", good_hash, 1024), ("bad hash ", bad_hash, 1024), ("good hash", good_hash, 1031)]:
    longest, used, avg = measure(fn, keys, capacity)
    print(name + ": buckets used " + str(used) + "/" + str(capacity) + ", longest chain " + str(longest)
          + ", average comparisons per lookup " + format(avg, ".2f"))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Explain how a hash table works under the hood: what happens when you insert a key, how collisions are handled, and why lookups are fast. Then tell me how JavaScript's built-in hash map behaves, and sketch a simple one in JavaScript if we have time."

**What a strong answer should cover:**
- Hash function → hash code → bucket index (modulo the bucket count), and the rule that equal keys must have equal hashes.
- Collision handling: separate chaining versus open addressing (probing), and tombstones on deletion.
- Load factor and resizing with rehashing, giving amortized O(1) inserts.
- Average O(1) versus worst-case O(n), what causes the worst case (bad hash, adversarial keys) and the defences.
- No ordering guarantees from hashing itself; a tree map when order or ranges matter.
- JavaScript specifics: \`Map\` and \`Set\` are the hash tables (the spec requires sublinear average access), plain objects convert keys to strings and inherit prototype keys, \`Map\` compares object keys by reference, and iteration follows insertion order.

**Code / implementation expected:** Optional — a small separate-chaining table with put, get, remove and resize in JavaScript, or correct use of the built-in map.`,
        answer: `**Target Audience:** Developers who use maps every day and want to know what happens inside — beginners welcome.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`node main.js\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A theatre cloakroom has 100 hooks. When you hand in your coat, the attendant does not hang it on the first free hook and then search all 100 when you come back. Instead, they use a rule: take the last two digits of your ticket number, and that is your hook. Ticket 4,217 goes on hook 17. When you return, they compute 17 again and walk straight to it. The work is the same whether the cloakroom holds 3 coats or 90.

Sometimes two tickets end in the same digits, 4,217 and 8,317. The attendant then hangs both on hook 17 and checks the ticket numbers when someone comes back; with a good rule and enough hooks, a hook rarely holds more than one or two coats. When the cloakroom gets crowded, they move to a bigger room with more hooks and rehang everything using the new rule.

That is the entire idea of a hash table: a **rule that turns a key into a position**, a plan for **two keys that land on the same position**, and **growing** when it gets full. It is why looking something up in a Python \`dict\`, a JavaScript \`Map\`, a Java \`HashMap\` or a C++ \`unordered_map\` takes about the same time for ten items or ten million.

## 2. The Core Idea: Key → Hash → Bucket

A hash table stores **key-value pairs** in an array of slots called **buckets**. To find where a key belongs:

1. Run the key through a **hash function**, which turns it into an integer, the **hash code**.
2. Reduce the hash code to a bucket index, most simply with \`hash % number_of_buckets\`.
3. Store or look for the pair in that bucket.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 160" role="img" aria-label="A key goes through the hash function to a number, and the number modulo the bucket count picks the bucket">
  <defs>
    <marker id="b02q4-javascript-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="130" height="80" rx="10"/>
  <text class="d-text" x="85" y="72" text-anchor="middle">key</text>
  <text class="d-sub" x="85" y="98" text-anchor="middle">apple</text>
  <path class="d-edge" d="M 154 80 L 194 80" marker-end="url(#b02q4-javascript-arrow)"/>
  <rect class="d-box" x="200" y="40" width="150" height="80" rx="10"/>
  <text class="d-text" x="275" y="72" text-anchor="middle">hash function</text>
  <text class="d-sub" x="275" y="98" text-anchor="middle">h times 31 plus char</text>
  <path class="d-edge" d="M 354 80 L 394 80" marker-end="url(#b02q4-javascript-arrow)"/>
  <rect class="d-box" x="400" y="40" width="130" height="80" rx="10"/>
  <text class="d-text" x="465" y="72" text-anchor="middle">hash code</text>
  <text class="d-sub" x="465" y="98" text-anchor="middle">93029210</text>
  <path class="d-edge-accent" d="M 534 80 L 574 80" marker-end="url(#b02q4-javascript-arrow)"/>
  <rect class="d-box-accent" x="580" y="40" width="120" height="80" rx="10"/>
  <text class="d-text d-accent" x="640" y="72" text-anchor="middle">bucket 10</text>
  <text class="d-sub" x="640" y="98" text-anchor="middle">mod 16</text>
</svg>

The hash function used in this doc's examples treats a string as a number in base 31: start at 0, and for each character do \`h = (h × 31 + character code) mod 1,000,000,007\`. For \`"apple"\` that gives 93,029,210, and with 16 buckets, 93,029,210 mod 16 = 10. Computing a hash takes time proportional to the key length, not to the number of stored items, so lookups cost the same for any table size: **O(1) on average**.

📌 **Interview term: Hash function** — a function that maps a key to an integer. It must be **deterministic** (the same key always gives the same hash) and should spread different keys **uniformly** across the possible values.

📌 **Interview term: Bucket** — one slot of the table's underlying array; it holds the entries whose hash maps to that index.

📌 **Interview term: Equal keys, equal hashes** — the one rule every hash table depends on: if two keys are equal, their hashes must be equal. (The reverse does not hold: different keys may share a hash.)

## 3. Collisions: When Two Keys Want the Same Bucket

There are far more possible keys than buckets, so some different keys **must** land in the same bucket (the pigeonhole principle). That is a **collision**, and every hash table needs a strategy for it. There are two families.

### Separate chaining

Each bucket holds a small list (a chain) of all entries that hash there. A lookup goes to the bucket, then compares keys along the chain. This is what Example 1 implements. With 8 buckets, its keys landed like this:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="Separate chaining with 8 buckets: bucket 2 holds apple then elderberry, bucket 3 holds cherry then grape">
  <defs>
    <marker id="b02q4c-javascript-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="70" y="26" text-anchor="middle">buckets</text>
  <rect class="d-box-muted" x="40" y="40" width="60" height="30"/>
  <text class="d-sub" x="70" y="60" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="40" y="70" width="60" height="30"/>
  <text class="d-sub" x="70" y="90" text-anchor="middle">1</text>
  <rect class="d-box" x="40" y="100" width="60" height="30"/>
  <text class="d-text" x="70" y="120" text-anchor="middle">2</text>
  <rect class="d-box" x="40" y="130" width="60" height="30"/>
  <text class="d-text" x="70" y="150" text-anchor="middle">3</text>
  <rect class="d-box" x="40" y="160" width="60" height="30"/>
  <text class="d-text" x="70" y="180" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="40" y="190" width="60" height="30"/>
  <text class="d-sub" x="70" y="210" text-anchor="middle">5</text>
  <rect class="d-box" x="40" y="220" width="60" height="30"/>
  <text class="d-text" x="70" y="240" text-anchor="middle">6</text>
  <rect class="d-box" x="40" y="250" width="60" height="30"/>
  <text class="d-text" x="70" y="270" text-anchor="middle">7</text>
  <path class="d-edge" d="M 104 115 L 174 115" marker-end="url(#b02q4c-javascript-arrow)"/>
  <rect class="d-box" x="180" y="103" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="120" text-anchor="middle">apple = 1</text>
  <path class="d-edge-accent" d="M 334 115 L 404 115" marker-end="url(#b02q4c-javascript-arrow)"/>
  <rect class="d-box-accent" x="410" y="103" width="170" height="24" rx="6"/>
  <text class="d-sub" x="495" y="120" text-anchor="middle">elderberry = 5</text>
  <path class="d-edge" d="M 104 145 L 174 145" marker-end="url(#b02q4c-javascript-arrow)"/>
  <rect class="d-box" x="180" y="133" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="150" text-anchor="middle">cherry = 3</text>
  <path class="d-edge-accent" d="M 334 145 L 404 145" marker-end="url(#b02q4c-javascript-arrow)"/>
  <rect class="d-box-accent" x="410" y="133" width="170" height="24" rx="6"/>
  <text class="d-sub" x="495" y="150" text-anchor="middle">grape = 7</text>
  <path class="d-edge" d="M 104 175 L 174 175" marker-end="url(#b02q4c-javascript-arrow)"/>
  <rect class="d-box" x="180" y="163" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="180" text-anchor="middle">fig = 6</text>
  <path class="d-edge" d="M 104 235 L 174 235" marker-end="url(#b02q4c-javascript-arrow)"/>
  <rect class="d-box" x="180" y="223" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="240" text-anchor="middle">date = 4</text>
  <path class="d-edge" d="M 104 265 L 174 265" marker-end="url(#b02q4c-javascript-arrow)"/>
  <rect class="d-box" x="180" y="253" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="270" text-anchor="middle">banana = 2</text>
</svg>

\`apple\` and \`elderberry\` both hash to bucket 2, and \`cherry\` and \`grape\` both to bucket 3, so those buckets hold two entries each. Looking up \`grape\` costs one hash and two key comparisons.

### Open addressing

All entries live directly in the bucket array. If the home bucket is taken, the table **probes** other buckets in a fixed order until it finds a free one (or, for a lookup, the key or an empty slot). The simplest order is **linear probing**: try the next slot, then the next.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Linear probing: grape hashes to slot 3, which is taken, so it tries slot 4, also taken, and lands in slot 5">
  <defs>
    <marker id="b02q4p-javascript-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="24" text-anchor="middle">Open addressing: grape has home slot 3</text>
  <rect class="d-box-muted" x="40" y="80" width="80" height="50"/>
  <rect class="d-box-muted" x="120" y="80" width="80" height="50"/>
  <rect class="d-box" x="200" y="80" width="80" height="50"/>
  <text class="d-sub" x="240" y="110" text-anchor="middle">apple</text>
  <rect class="d-box" x="280" y="80" width="80" height="50"/>
  <text class="d-sub" x="320" y="110" text-anchor="middle">cherry</text>
  <rect class="d-box" x="360" y="80" width="80" height="50"/>
  <text class="d-sub" x="400" y="110" text-anchor="middle">fig</text>
  <rect class="d-box-accent" x="440" y="80" width="80" height="50"/>
  <text class="d-sub d-accent" x="480" y="110" text-anchor="middle">grape</text>
  <rect class="d-box-muted" x="520" y="80" width="80" height="50"/>
  <rect class="d-box-muted" x="600" y="80" width="80" height="50"/>
  <path class="d-edge-dashed" d="M 320 76 Q 360 44 396 72" marker-end="url(#b02q4p-javascript-arrow)"/>
  <path class="d-edge-accent" d="M 400 76 Q 440 44 476 72" marker-end="url(#b02q4p-javascript-arrow)"/>
  <text class="d-sub" x="80" y="156" text-anchor="middle">0</text>
  <text class="d-sub" x="160" y="156" text-anchor="middle">1</text>
  <text class="d-sub" x="240" y="156" text-anchor="middle">2</text>
  <text class="d-sub" x="320" y="156" text-anchor="middle">3 taken</text>
  <text class="d-sub" x="400" y="156" text-anchor="middle">4 taken</text>
  <text class="d-sub" x="480" y="156" text-anchor="middle">5 free</text>
  <text class="d-sub" x="560" y="156" text-anchor="middle">6</text>
  <text class="d-sub" x="640" y="156" text-anchor="middle">7</text>
</svg>

Open addressing keeps everything in one contiguous array (good cache behaviour) but needs care on deletion: simply emptying a slot would break the probe chain for keys placed after it, so implementations leave a **tombstone** marker instead.

📌 **Interview term: Collision** — two different keys mapping to the same bucket. It is unavoidable; a good table keeps it rare and cheap.

📌 **Interview term: Separate chaining** — resolving collisions by keeping a list of entries in each bucket.

📌 **Interview term: Open addressing (probing)** — resolving collisions by placing the entry in another slot of the same array, found by a probe sequence such as linear probing.

📌 **Interview term: Tombstone** — a "deleted" marker in an open-addressing table, so later lookups keep probing past it.

## 4. Load Factor and Resizing

The **load factor** is \`entries / buckets\`. As it rises, chains get longer (or probe sequences get longer), and lookups slow down. So a table sets a limit, and when an insert pushes it over, the table **resizes**: it allocates a bigger bucket array (usually double) and **rehashes** every entry, because \`hash % buckets\` changes when the bucket count changes.

Example 1 starts with 4 buckets and a limit of 0.75. The output shows the 4th insert pushing the load to 4/4 and triggering a resize to 8 buckets, and the 7th insert (7/8) triggering a resize to 16. After the resize, \`apple\` moved from bucket 2 to bucket 10: same hash, different modulus.

A single resize costs O(n), but because the size doubles each time, resizes are rare enough that inserts are still **amortized O(1)**, the same argument as for dynamic arrays (see [amortized analysis](/interview-question/what-is-amortized-analysis)).

📌 **Interview term: Load factor** — the number of entries divided by the number of buckets; the table resizes when it passes a threshold (0.75 in Java's \`HashMap\` and in Example 1).

📌 **Interview term: Rehashing** — recomputing every entry's bucket after the bucket array changes size.

## 5. What Makes a Hash Function Good

A good hash function is **deterministic**, **fast**, and **spreads keys evenly**. Example 3 shows what happens when the last property fails. It puts the same 1,000 keys (\`user0\` to \`user999\`) into 1,024 buckets twice, once with the base-31 hash and once with a "hash" that returns the key length:

- With the length hash, all keys of the same length collide: only 3 buckets were used, the longest chain had 900 entries, and an average lookup needed 409.60 comparisons. The table had become a slow linked list: **O(n)** per lookup.
- With the base-31 hash, the average lookup needed 2.35 comparisons.
- The same base-31 hash with 1,031 buckets (a prime) needed only 1.25. Keys like \`user0\` ... \`user999\` differ only in their last characters, and taking a hash modulo a power of two keeps only its lowest bits, so similar keys cluster. A prime modulus mixes in all the bits. Real libraries fix this in the hash itself instead; the language section shows how.

That worst case is also a security issue: if attackers can choose keys that collide, they can make a server's hash tables O(n) per operation (**hash flooding**). Defences include randomised hash seeds and switching long chains to balanced trees.

📌 **Interview term: Uniform distribution** — a hash function spreading keys evenly over all buckets, so every chain stays short.

📌 **Interview term: Hash flooding** — a denial-of-service attack that sends many keys with the same hash to force worst-case O(n) operations.

## 6. Average Case vs Worst Case

| Operation | Average | Worst case | Why |
| :--- | :--- | :--- | :--- |
| insert / put | O(1) amortized | O(n) | one hash plus a short chain; a resize or all keys colliding is O(n) |
| lookup / get | O(1) | O(n) | same; the worst case is one long chain |
| delete | O(1) | O(n) | find the entry, unlink it (or leave a tombstone) |
| iterate all entries | O(n + buckets) | O(n + buckets) | every bucket is visited, empty or not |
| space | O(n + buckets) | O(n + buckets) | entries plus the bucket array |

"Average" assumes a good hash function and a bounded load factor. A hash table also gives **no useful order**: the iteration order of a pure hash table depends on hash values, not on keys or insertion time. When you need sorted keys or range queries, use a balanced tree map (O(log n) per operation); see [operation complexities compared](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance).

Hash tables are the engine behind many interview patterns: [Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently), [group anagrams](/interview-question/how-do-you-group-anagrams-together), [longest consecutive sequence](/interview-question/longest-consecutive-sequence-in-o-n-with-hash-set-why-not-sort) and the [LRU cache](/interview-question/how-do-you-design-an-lru-cache).

## 7. In JavaScript: Map, Set and Plain Objects

- **\`Map\` and \`Set\` are the hash tables.** The [ECMAScript specification](https://tc39.es/ecma262/multipage/keyed-collections.html) says Maps must be implemented "using either hash tables or other mechanisms that, on average, provide access times that are sublinear in the number of elements". So \`get\`, \`set\`, \`has\` and \`delete\` are fast on average, and the exact structure is up to the engine.
- **Insertion order.** Iterating a \`Map\` yields entries in insertion order. That order is part of the spec, but it is not sorted order; Example 2 sorts explicitly.
- **Key equality is by value for primitives and by reference for objects.** Checked in Node 22: \`new Map([[NaN, 1]]).get(NaN)\` returns \`1\` (NaN matches itself in a \`Map\`), but with \`const k = [1]\`, \`m.get(k)\` finds the entry while \`m.get([1])\` returns \`undefined\`, because \`[1]\` is a different array. For composite keys, build a string such as \`row + ',' + col\`.
- **Plain objects are not general hash maps.** Keys become strings (\`o[1]\` and \`o['1']\` are the same key: after setting both, \`Object.keys(o)\` was \`["1"]\`), and objects inherit keys like \`constructor\` from their prototype. Use \`Map\`, or \`Object.create(null)\` for a prototype-free object.
- **Number precision matters for hand-written hashes.** \`h * 31 + code\` grows past 2⁵³ after a few characters and silently loses precision; Example 1 reduces modulo 1,000,000,007 at each step so every value stays exact.

## 8. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`node main.js\`; the blocks are the exact standard output.

**Example 1 — a separate-chaining table from scratch: collisions, two resizes, update, get and remove**

~~~text
put apple = 1 -> hash 93029210 % 4 = bucket 2
put banana = 2 -> hash 898612055 % 4 = bucket 3
put cherry = 3 -> hash 933454219 % 4 = bucket 3
put date = 4 -> hash 3076014 % 4 = bucket 2
  load 4/4 > 0.75: resize to 8 buckets and rehash every key
put elderberry = 5 -> hash 307547146 % 8 = bucket 2
put fig = 6 -> hash 101380 % 8 = bucket 4
put grape = 7 -> hash 98615627 % 8 = bucket 3
  load 7/8 > 0.75: resize to 16 buckets and rehash every key
put apple = 10 (updated)
get apple -> 10
get kiwi -> missing
remove cherry -> true
get cherry -> missing
size 6, 16 buckets:
  bucket 0: []
  bucket 1: []
  bucket 2: []
  bucket 3: []
  bucket 4: [fig=6]
  bucket 5: []
  bucket 6: []
  bucket 7: [banana=2]
  bucket 8: []
  bucket 9: []
  bucket 10: [apple=10, elderberry=5]
  bucket 11: [grape=7]
  bucket 12: []
  bucket 13: []
  bucket 14: [date=4]
  bucket 15: []
~~~

**Example 2 — the built-in hash map counting words**

~~~text
distinct words: 8
count of 'the': 4
is 'dog' a key? false
count of 'dog': 0 (size still 8)
by count, then word: the=4, and=2, bat=1, cat=1, hat=1, mat=1, on=1, sat=1
top word: the (4 times)
~~~

**Example 3 — a good hash, a bad hash, and a prime bucket count**

~~~text
good hash: buckets used 359/1024, longest chain 6, average comparisons per lookup 2.35
bad hash : buckets used 3/1024, longest chain 900, average comparisons per lookup 409.60
good hash: buckets used 773/1031, longest chain 3, average comparisons per lookup 1.25
~~~

**Reading Example 1:** at 4 buckets, \`banana\` and \`cherry\` collided in bucket 3; after the resizes the final table has 16 buckets, and \`apple\` and \`elderberry\` still share bucket 10. The update of \`apple\` did not change the size, and after removing \`cherry\` the size is 6.

## 9. Edge Cases to Mention

- **Missing key:** decide between returning a default, \`null\`/\`None\`, or raising. Example 1 returns \`missing\`, Example 2 uses the language's "get with a default".
- **Updating an existing key:** must overwrite in place without increasing the size (Example 1: \`put apple = 10 (updated)\`, size stays 6 after the removal).
- **Deleting a missing key:** returns false rather than failing.
- **All keys colliding:** correctness survives, speed does not (Example 3).
- **Mutable keys:** if a key changes after insertion, its hash changes and the entry can no longer be found.

## 10. Common Pitfalls

- **Using an object as a dictionary.** Keys are converted to strings, and inherited names (\`constructor\`, \`toString\`) look present. Use \`Map\`.
- **Using arrays or objects as \`Map\` keys and expecting value equality.** \`m.get([1, 2])\` never finds an entry stored under a different \`[1, 2]\` array; encode the key as a string.
- **\`map[key] = value\` on a \`Map\`.** That sets a property on the Map object, not an entry; \`size\` stays 0. Use \`map.set(key, value)\`.
- **Counting with \`map.get(k) + 1\`.** For a new key it is \`undefined + 1\`, which is \`NaN\`; use \`(map.get(k) || 0) + 1\`.
- **Hand-written hashes that overflow 2⁵³.** Reduce with a modulus at every step, or use \`Math.imul\` and 32-bit arithmetic, or \`BigInt\`.
- **Assuming insertion order means sorted order.** Sort the entries when output order matters.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">A hash table maps a key through a hash function to a bucket index, so insert, lookup and delete are O(1) on average.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Collisions:</strong> <span style="color:#f0e2c8;">Different keys can share a bucket; separate chaining keeps a list per bucket, open addressing probes for another slot.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Load factor:</strong> <span style="color:#f0e2c8;">When entries per bucket pass a limit, the table doubles and rehashes everything: O(n) once, amortized O(1) per insert.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Worst case:</strong> <span style="color:#f0e2c8;">If many keys collide, operations degrade to O(n); the hash function must spread keys evenly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In JavaScript:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> are the hash tables: any key type, insertion-ordered iteration, object keys compared by reference. Plain objects stringify keys and inherit prototype keys.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> over an object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> accepts any key type without converting it to a string, has no inherited keys, has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.size</code>, and is designed for frequent additions and removals.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use an array as a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, but it is compared by reference: only the same array object finds the entry. For coordinates, use a string key such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r + ',' + c</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the spec say a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> is a hash table?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It says implementations must use hash tables or other mechanisms with sublinear average access time, so O(1) average is the practical expectation, not a strict guarantee.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the worst case and when does it happen?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n) per operation if many keys collide in one bucket, for example with a poor hash function or keys chosen by an attacker.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Set</code> relate to a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> is the same idea with keys only: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code> in O(1) average, used for membership tests and de-duplication.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Hash function** | Maps a key to an integer, deterministically and evenly |
| **Bucket** | One slot of the table array, holding the entries that map there |
| **Equal keys, equal hashes** | The rule every hash table relies on |
| **Collision** | Two different keys mapping to the same bucket |
| **Separate chaining** | Each bucket keeps a list of its entries |
| **Open addressing (probing)** | Colliding entries go to another slot of the same array |
| **Tombstone** | Deleted-slot marker in open addressing |
| **Load factor** | Entries divided by buckets; triggers resizing |
| **Rehashing** | Recomputing every bucket after the table resizes |
| **Uniform distribution** | Keys spread evenly across buckets |
| **Hash flooding** | Attack that forces collisions to make operations O(n) |
| **SameValueZero** | The key equality Map and Set use: like === except NaN equals NaN |

---
**Conclusion:** A hash table turns a key into a bucket index with a hash function, resolves the unavoidable collisions by chaining or probing, and keeps lookups O(1) on average by resizing when the load factor gets too high. Example 1 built one from scratch and showed collisions, two resizes and rehashing; Example 3 showed that a bad hash turns it into an O(n) list. In JavaScript you get this from \`Map\` and \`Set\`, which the spec requires to be sublinear on average and which iterate in insertion order; the traps are plain objects that stringify keys, and object keys that are compared by reference.`,
        examples: [
          {
            label: "A hash table from scratch: chaining, load factor, resize",
            code: `// A hash table from scratch: separate chaining, a load-factor limit, and resizing.
// The hash is written out by hand so every language computes the same numbers.

function polyHash(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) % 1000000007;   // stays far below 2^53: exact
  }
  return h;
}

class HashTable {
  constructor(capacity = 4) {
    this.buckets = Array.from({ length: capacity }, () => []);  // each bucket is a chain
    this.size = 0;
  }
  bucket(key) {
    return this.buckets[polyHash(key) % this.buckets.length];
  }
  put(key, value) {
    const chain = this.bucket(key);
    for (const pair of chain) {
      if (pair[0] === key) {                    // key already present: overwrite
        pair[1] = value;
        console.log('put ' + key + ' = ' + value + ' (updated)');
        return;
      }
    }
    chain.push([key, value]);
    this.size++;
    const h = polyHash(key);
    console.log('put ' + key + ' = ' + value + ' -> hash ' + h + ' % ' + this.buckets.length +
      ' = bucket ' + (h % this.buckets.length));
    if (this.size * 4 > this.buckets.length * 3) this.resize(this.buckets.length * 2);
  }
  resize(newCapacity) {
    console.log('  load ' + this.size + '/' + this.buckets.length + ' > 0.75: resize to ' +
      newCapacity + ' buckets and rehash every key');
    const old = this.buckets;
    this.buckets = Array.from({ length: newCapacity }, () => []);
    for (const chain of old) for (const [k, v] of chain) this.bucket(k).push([k, v]);
  }
  get(key) {
    for (const [k, v] of this.bucket(key)) if (k === key) return String(v);
    return 'missing';
  }
  remove(key) {
    const chain = this.bucket(key);
    const i = chain.findIndex((pair) => pair[0] === key);
    if (i === -1) return false;
    chain.splice(i, 1);
    this.size--;
    return true;
  }
  dump() {
    this.buckets.forEach((chain, i) => {
      console.log('  bucket ' + i + ': [' + chain.map(([k, v]) => k + '=' + v).join(', ') + ']');
    });
  }
}

const table = new HashTable();
['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape'].forEach((name, i) => table.put(name, i + 1));
table.put('apple', 10);
console.log('get apple -> ' + table.get('apple'));
console.log('get kiwi -> ' + table.get('kiwi'));
console.log('remove cherry -> ' + table.remove('cherry'));
console.log('get cherry -> ' + table.get('cherry'));
console.log('size ' + table.size + ', ' + table.buckets.length + ' buckets:');
table.dump();`,
          },
          {
            label: "The built-in hash map: word counts",
            code: `// The built-in hash table at work: word counts, membership, and a sorted report.
// Map, not a plain object: any key type, no inherited keys such as "constructor".

const text = 'the cat and the hat and the bat sat on the mat';
const words = text.split(' ');

const counts = new Map();
for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);

console.log('distinct words: ' + counts.size); // distinct words: 8
console.log("count of 'the': " + counts.get('the')); // count of 'the': 4
// Map.has is an average O(1) membership test.
console.log("is 'dog' a key? " + counts.has('dog')); // is 'dog' a key? false
console.log("count of 'dog': " + (counts.get('dog') || 0) + ' (size still ' + counts.size + ')'); // count of 'dog': 0 (size still 8)

// Do not rely on the table's order for output: sort explicitly.
const report = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
console.log('by count, then word: ' + report.map(([w, c]) => w + '=' + c).join(', ')); // by count, then word: the=4, and=2, bat=1, cat=1, hat=1, mat=1, on=1, sat=1

const [topWord, topCount] = report[0];
console.log('top word: ' + topWord + ' (' + topCount + ' times)'); // top word: the (4 times)`,
          },
          {
            label: "Good hash vs bad hash, counted",
            code: `// Why the hash function matters: the same 1000 keys in 1024 buckets,
// with a good hash and with a bad one, then in 1031 (a prime). We count key comparisons.

function goodHash(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 1000000007;
  return h;
}

function badHash(key) {
  return key.length;         // every key of the same length collides
}

function measure(hashFn, keys, capacity) {
  const buckets = Array.from({ length: capacity }, () => []);
  for (const k of keys) buckets[hashFn(k) % capacity].push(k);
  let comparisons = 0;
  for (const k of keys) {                    // look every key up once
    for (const candidate of buckets[hashFn(k) % capacity]) {
      comparisons++;
      if (candidate === k) break;
    }
  }
  const longest = Math.max(...buckets.map((b) => b.length));
  const used = buckets.filter((b) => b.length > 0).length;
  return [longest, used, comparisons / keys.length];
}

const keys = Array.from({ length: 1000 }, (_, i) => 'user' + i);
for (const [name, fn, capacity] of [['good hash', goodHash, 1024], ['bad hash ', badHash, 1024], ['good hash', goodHash, 1031]]) {
  const [longest, used, avg] = measure(fn, keys, capacity);
  console.log(name + ': buckets used ' + used + '/' + capacity + ', longest chain ' + longest +
    ', average comparisons per lookup ' + avg.toFixed(2));
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Explain how a hash table works under the hood: what happens when you insert a key, how collisions are handled, and why lookups are fast. Then tell me how Java's built-in hash map behaves, and sketch a simple one in Java if we have time."

**What a strong answer should cover:**
- Hash function → hash code → bucket index (modulo the bucket count), and the rule that equal keys must have equal hashes.
- Collision handling: separate chaining versus open addressing (probing), and tombstones on deletion.
- Load factor and resizing with rehashing, giving amortized O(1) inserts.
- Average O(1) versus worst-case O(n), what causes the worst case (bad hash, adversarial keys) and the defences.
- No ordering guarantees from hashing itself; a tree map when order or ranges matter.
- Java specifics: \`HashMap\` uses separate chaining (default capacity 16, load factor 0.75, long chains become trees), keys need consistent \`equals\` and \`hashCode\`, mutating a key after insertion loses the entry, and iteration order is unspecified.

**Code / implementation expected:** Optional — a small separate-chaining table with put, get, remove and resize in Java, or correct use of the built-in map.`,
        answer: `**Target Audience:** Developers who use maps every day and want to know what happens inside — beginners welcome.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`javac Main.java && java Main\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A theatre cloakroom has 100 hooks. When you hand in your coat, the attendant does not hang it on the first free hook and then search all 100 when you come back. Instead, they use a rule: take the last two digits of your ticket number, and that is your hook. Ticket 4,217 goes on hook 17. When you return, they compute 17 again and walk straight to it. The work is the same whether the cloakroom holds 3 coats or 90.

Sometimes two tickets end in the same digits, 4,217 and 8,317. The attendant then hangs both on hook 17 and checks the ticket numbers when someone comes back; with a good rule and enough hooks, a hook rarely holds more than one or two coats. When the cloakroom gets crowded, they move to a bigger room with more hooks and rehang everything using the new rule.

That is the entire idea of a hash table: a **rule that turns a key into a position**, a plan for **two keys that land on the same position**, and **growing** when it gets full. It is why looking something up in a Python \`dict\`, a JavaScript \`Map\`, a Java \`HashMap\` or a C++ \`unordered_map\` takes about the same time for ten items or ten million.

## 2. The Core Idea: Key → Hash → Bucket

A hash table stores **key-value pairs** in an array of slots called **buckets**. To find where a key belongs:

1. Run the key through a **hash function**, which turns it into an integer, the **hash code**.
2. Reduce the hash code to a bucket index, most simply with \`hash % number_of_buckets\`.
3. Store or look for the pair in that bucket.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 160" role="img" aria-label="A key goes through the hash function to a number, and the number modulo the bucket count picks the bucket">
  <defs>
    <marker id="b02q4-java-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="130" height="80" rx="10"/>
  <text class="d-text" x="85" y="72" text-anchor="middle">key</text>
  <text class="d-sub" x="85" y="98" text-anchor="middle">apple</text>
  <path class="d-edge" d="M 154 80 L 194 80" marker-end="url(#b02q4-java-arrow)"/>
  <rect class="d-box" x="200" y="40" width="150" height="80" rx="10"/>
  <text class="d-text" x="275" y="72" text-anchor="middle">hash function</text>
  <text class="d-sub" x="275" y="98" text-anchor="middle">h times 31 plus char</text>
  <path class="d-edge" d="M 354 80 L 394 80" marker-end="url(#b02q4-java-arrow)"/>
  <rect class="d-box" x="400" y="40" width="130" height="80" rx="10"/>
  <text class="d-text" x="465" y="72" text-anchor="middle">hash code</text>
  <text class="d-sub" x="465" y="98" text-anchor="middle">93029210</text>
  <path class="d-edge-accent" d="M 534 80 L 574 80" marker-end="url(#b02q4-java-arrow)"/>
  <rect class="d-box-accent" x="580" y="40" width="120" height="80" rx="10"/>
  <text class="d-text d-accent" x="640" y="72" text-anchor="middle">bucket 10</text>
  <text class="d-sub" x="640" y="98" text-anchor="middle">mod 16</text>
</svg>

The hash function used in this doc's examples treats a string as a number in base 31: start at 0, and for each character do \`h = (h × 31 + character code) mod 1,000,000,007\`. For \`"apple"\` that gives 93,029,210, and with 16 buckets, 93,029,210 mod 16 = 10. Computing a hash takes time proportional to the key length, not to the number of stored items, so lookups cost the same for any table size: **O(1) on average**.

📌 **Interview term: Hash function** — a function that maps a key to an integer. It must be **deterministic** (the same key always gives the same hash) and should spread different keys **uniformly** across the possible values.

📌 **Interview term: Bucket** — one slot of the table's underlying array; it holds the entries whose hash maps to that index.

📌 **Interview term: Equal keys, equal hashes** — the one rule every hash table depends on: if two keys are equal, their hashes must be equal. (The reverse does not hold: different keys may share a hash.)

## 3. Collisions: When Two Keys Want the Same Bucket

There are far more possible keys than buckets, so some different keys **must** land in the same bucket (the pigeonhole principle). That is a **collision**, and every hash table needs a strategy for it. There are two families.

### Separate chaining

Each bucket holds a small list (a chain) of all entries that hash there. A lookup goes to the bucket, then compares keys along the chain. This is what Example 1 implements. With 8 buckets, its keys landed like this:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="Separate chaining with 8 buckets: bucket 2 holds apple then elderberry, bucket 3 holds cherry then grape">
  <defs>
    <marker id="b02q4c-java-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="70" y="26" text-anchor="middle">buckets</text>
  <rect class="d-box-muted" x="40" y="40" width="60" height="30"/>
  <text class="d-sub" x="70" y="60" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="40" y="70" width="60" height="30"/>
  <text class="d-sub" x="70" y="90" text-anchor="middle">1</text>
  <rect class="d-box" x="40" y="100" width="60" height="30"/>
  <text class="d-text" x="70" y="120" text-anchor="middle">2</text>
  <rect class="d-box" x="40" y="130" width="60" height="30"/>
  <text class="d-text" x="70" y="150" text-anchor="middle">3</text>
  <rect class="d-box" x="40" y="160" width="60" height="30"/>
  <text class="d-text" x="70" y="180" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="40" y="190" width="60" height="30"/>
  <text class="d-sub" x="70" y="210" text-anchor="middle">5</text>
  <rect class="d-box" x="40" y="220" width="60" height="30"/>
  <text class="d-text" x="70" y="240" text-anchor="middle">6</text>
  <rect class="d-box" x="40" y="250" width="60" height="30"/>
  <text class="d-text" x="70" y="270" text-anchor="middle">7</text>
  <path class="d-edge" d="M 104 115 L 174 115" marker-end="url(#b02q4c-java-arrow)"/>
  <rect class="d-box" x="180" y="103" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="120" text-anchor="middle">apple = 1</text>
  <path class="d-edge-accent" d="M 334 115 L 404 115" marker-end="url(#b02q4c-java-arrow)"/>
  <rect class="d-box-accent" x="410" y="103" width="170" height="24" rx="6"/>
  <text class="d-sub" x="495" y="120" text-anchor="middle">elderberry = 5</text>
  <path class="d-edge" d="M 104 145 L 174 145" marker-end="url(#b02q4c-java-arrow)"/>
  <rect class="d-box" x="180" y="133" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="150" text-anchor="middle">cherry = 3</text>
  <path class="d-edge-accent" d="M 334 145 L 404 145" marker-end="url(#b02q4c-java-arrow)"/>
  <rect class="d-box-accent" x="410" y="133" width="170" height="24" rx="6"/>
  <text class="d-sub" x="495" y="150" text-anchor="middle">grape = 7</text>
  <path class="d-edge" d="M 104 175 L 174 175" marker-end="url(#b02q4c-java-arrow)"/>
  <rect class="d-box" x="180" y="163" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="180" text-anchor="middle">fig = 6</text>
  <path class="d-edge" d="M 104 235 L 174 235" marker-end="url(#b02q4c-java-arrow)"/>
  <rect class="d-box" x="180" y="223" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="240" text-anchor="middle">date = 4</text>
  <path class="d-edge" d="M 104 265 L 174 265" marker-end="url(#b02q4c-java-arrow)"/>
  <rect class="d-box" x="180" y="253" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="270" text-anchor="middle">banana = 2</text>
</svg>

\`apple\` and \`elderberry\` both hash to bucket 2, and \`cherry\` and \`grape\` both to bucket 3, so those buckets hold two entries each. Looking up \`grape\` costs one hash and two key comparisons.

### Open addressing

All entries live directly in the bucket array. If the home bucket is taken, the table **probes** other buckets in a fixed order until it finds a free one (or, for a lookup, the key or an empty slot). The simplest order is **linear probing**: try the next slot, then the next.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Linear probing: grape hashes to slot 3, which is taken, so it tries slot 4, also taken, and lands in slot 5">
  <defs>
    <marker id="b02q4p-java-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="24" text-anchor="middle">Open addressing: grape has home slot 3</text>
  <rect class="d-box-muted" x="40" y="80" width="80" height="50"/>
  <rect class="d-box-muted" x="120" y="80" width="80" height="50"/>
  <rect class="d-box" x="200" y="80" width="80" height="50"/>
  <text class="d-sub" x="240" y="110" text-anchor="middle">apple</text>
  <rect class="d-box" x="280" y="80" width="80" height="50"/>
  <text class="d-sub" x="320" y="110" text-anchor="middle">cherry</text>
  <rect class="d-box" x="360" y="80" width="80" height="50"/>
  <text class="d-sub" x="400" y="110" text-anchor="middle">fig</text>
  <rect class="d-box-accent" x="440" y="80" width="80" height="50"/>
  <text class="d-sub d-accent" x="480" y="110" text-anchor="middle">grape</text>
  <rect class="d-box-muted" x="520" y="80" width="80" height="50"/>
  <rect class="d-box-muted" x="600" y="80" width="80" height="50"/>
  <path class="d-edge-dashed" d="M 320 76 Q 360 44 396 72" marker-end="url(#b02q4p-java-arrow)"/>
  <path class="d-edge-accent" d="M 400 76 Q 440 44 476 72" marker-end="url(#b02q4p-java-arrow)"/>
  <text class="d-sub" x="80" y="156" text-anchor="middle">0</text>
  <text class="d-sub" x="160" y="156" text-anchor="middle">1</text>
  <text class="d-sub" x="240" y="156" text-anchor="middle">2</text>
  <text class="d-sub" x="320" y="156" text-anchor="middle">3 taken</text>
  <text class="d-sub" x="400" y="156" text-anchor="middle">4 taken</text>
  <text class="d-sub" x="480" y="156" text-anchor="middle">5 free</text>
  <text class="d-sub" x="560" y="156" text-anchor="middle">6</text>
  <text class="d-sub" x="640" y="156" text-anchor="middle">7</text>
</svg>

Open addressing keeps everything in one contiguous array (good cache behaviour) but needs care on deletion: simply emptying a slot would break the probe chain for keys placed after it, so implementations leave a **tombstone** marker instead.

📌 **Interview term: Collision** — two different keys mapping to the same bucket. It is unavoidable; a good table keeps it rare and cheap.

📌 **Interview term: Separate chaining** — resolving collisions by keeping a list of entries in each bucket.

📌 **Interview term: Open addressing (probing)** — resolving collisions by placing the entry in another slot of the same array, found by a probe sequence such as linear probing.

📌 **Interview term: Tombstone** — a "deleted" marker in an open-addressing table, so later lookups keep probing past it.

## 4. Load Factor and Resizing

The **load factor** is \`entries / buckets\`. As it rises, chains get longer (or probe sequences get longer), and lookups slow down. So a table sets a limit, and when an insert pushes it over, the table **resizes**: it allocates a bigger bucket array (usually double) and **rehashes** every entry, because \`hash % buckets\` changes when the bucket count changes.

Example 1 starts with 4 buckets and a limit of 0.75. The output shows the 4th insert pushing the load to 4/4 and triggering a resize to 8 buckets, and the 7th insert (7/8) triggering a resize to 16. After the resize, \`apple\` moved from bucket 2 to bucket 10: same hash, different modulus.

A single resize costs O(n), but because the size doubles each time, resizes are rare enough that inserts are still **amortized O(1)**, the same argument as for dynamic arrays (see [amortized analysis](/interview-question/what-is-amortized-analysis)).

📌 **Interview term: Load factor** — the number of entries divided by the number of buckets; the table resizes when it passes a threshold (0.75 in Java's \`HashMap\` and in Example 1).

📌 **Interview term: Rehashing** — recomputing every entry's bucket after the bucket array changes size.

## 5. What Makes a Hash Function Good

A good hash function is **deterministic**, **fast**, and **spreads keys evenly**. Example 3 shows what happens when the last property fails. It puts the same 1,000 keys (\`user0\` to \`user999\`) into 1,024 buckets twice, once with the base-31 hash and once with a "hash" that returns the key length:

- With the length hash, all keys of the same length collide: only 3 buckets were used, the longest chain had 900 entries, and an average lookup needed 409.60 comparisons. The table had become a slow linked list: **O(n)** per lookup.
- With the base-31 hash, the average lookup needed 2.35 comparisons.
- The same base-31 hash with 1,031 buckets (a prime) needed only 1.25. Keys like \`user0\` ... \`user999\` differ only in their last characters, and taking a hash modulo a power of two keeps only its lowest bits, so similar keys cluster. A prime modulus mixes in all the bits. Real libraries fix this in the hash itself instead; the language section shows how.

That worst case is also a security issue: if attackers can choose keys that collide, they can make a server's hash tables O(n) per operation (**hash flooding**). Defences include randomised hash seeds and switching long chains to balanced trees.

📌 **Interview term: Uniform distribution** — a hash function spreading keys evenly over all buckets, so every chain stays short.

📌 **Interview term: Hash flooding** — a denial-of-service attack that sends many keys with the same hash to force worst-case O(n) operations.

## 6. Average Case vs Worst Case

| Operation | Average | Worst case | Why |
| :--- | :--- | :--- | :--- |
| insert / put | O(1) amortized | O(n) | one hash plus a short chain; a resize or all keys colliding is O(n) |
| lookup / get | O(1) | O(n) | same; the worst case is one long chain |
| delete | O(1) | O(n) | find the entry, unlink it (or leave a tombstone) |
| iterate all entries | O(n + buckets) | O(n + buckets) | every bucket is visited, empty or not |
| space | O(n + buckets) | O(n + buckets) | entries plus the bucket array |

"Average" assumes a good hash function and a bounded load factor. A hash table also gives **no useful order**: the iteration order of a pure hash table depends on hash values, not on keys or insertion time. When you need sorted keys or range queries, use a balanced tree map (O(log n) per operation); see [operation complexities compared](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance).

Hash tables are the engine behind many interview patterns: [Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently), [group anagrams](/interview-question/how-do-you-group-anagrams-together), [longest consecutive sequence](/interview-question/longest-consecutive-sequence-in-o-n-with-hash-set-why-not-sort) and the [LRU cache](/interview-question/how-do-you-design-an-lru-cache).

## 7. In Java: HashMap Inside

\`HashMap\` is a separate-chaining table, and its tuning constants can be read by reflection. On OpenJDK 21:

~~~text
TREEIFY_THRESHOLD=8
UNTREEIFY_THRESHOLD=6
MIN_TREEIFY_CAPACITY=64
DEFAULT_INITIAL_CAPACITY=16
DEFAULT_LOAD_FACTOR=0.75
~~~

* **Resizing:** with 16 buckets and load factor 0.75 the threshold is 12, and reading the internal \`table\` field showed the capacity still 16 with 12 entries and 32 after the 13th. Capacities are always powers of two.
* **Hash spreading:** because a power-of-two table keeps only the low bits of the hash, \`HashMap\` first mixes the high bits in with \`h ^ (h >>> 16)\`. Calling the private \`hash\` method on the key \`65536\` returned \`65537\`, and the keys \`1 << 16\`, \`2 << 16\`, \`3 << 16\` and \`4 << 16\`, which have identical low bits, landed in buckets 1, 2, 3 and 4 instead of all in bucket 0. This is the fix for the clustering Example 3 shows.
* **Treeification:** when one bucket's chain reaches 8 entries (and the table has at least 64 buckets), it becomes a red-black tree, so even a flood of collisions costs O(log n) per lookup instead of O(n).
* **\`equals\` and \`hashCode\` must agree.** Equal objects must have equal hash codes, or \`HashMap\` looks in the wrong bucket. \`String.hashCode\` is the documented base-31 formula: \`"abc".hashCode()\` is 96354 = 97·31² + 98·31 + 99, the same idea as Example 1's hash, but in wrapping 32-bit \`int\` arithmetic.
* **Never mutate a key.** A \`List<Integer>\` key changed after \`put\` was lost: \`get\` returned \`null\`, \`containsKey\` returned \`false\`, yet \`size()\` was still 1.
* **Order:** \`HashMap\` iteration order is unspecified; use \`LinkedHashMap\` for insertion order and \`TreeMap\` for sorted keys (O(log n)).

## 8. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`javac Main.java && java Main\`; the blocks are the exact standard output.

**Example 1 — a separate-chaining table from scratch: collisions, two resizes, update, get and remove**

~~~text
put apple = 1 -> hash 93029210 % 4 = bucket 2
put banana = 2 -> hash 898612055 % 4 = bucket 3
put cherry = 3 -> hash 933454219 % 4 = bucket 3
put date = 4 -> hash 3076014 % 4 = bucket 2
  load 4/4 > 0.75: resize to 8 buckets and rehash every key
put elderberry = 5 -> hash 307547146 % 8 = bucket 2
put fig = 6 -> hash 101380 % 8 = bucket 4
put grape = 7 -> hash 98615627 % 8 = bucket 3
  load 7/8 > 0.75: resize to 16 buckets and rehash every key
put apple = 10 (updated)
get apple -> 10
get kiwi -> missing
remove cherry -> true
get cherry -> missing
size 6, 16 buckets:
  bucket 0: []
  bucket 1: []
  bucket 2: []
  bucket 3: []
  bucket 4: [fig=6]
  bucket 5: []
  bucket 6: []
  bucket 7: [banana=2]
  bucket 8: []
  bucket 9: []
  bucket 10: [apple=10, elderberry=5]
  bucket 11: [grape=7]
  bucket 12: []
  bucket 13: []
  bucket 14: [date=4]
  bucket 15: []
~~~

**Example 2 — the built-in hash map counting words**

~~~text
distinct words: 8
count of 'the': 4
is 'dog' a key? false
count of 'dog': 0 (size still 8)
by count, then word: the=4, and=2, bat=1, cat=1, hat=1, mat=1, on=1, sat=1
top word: the (4 times)
~~~

**Example 3 — a good hash, a bad hash, and a prime bucket count**

~~~text
good hash: buckets used 359/1024, longest chain 6, average comparisons per lookup 2.35
bad hash : buckets used 3/1024, longest chain 900, average comparisons per lookup 409.60
good hash: buckets used 773/1031, longest chain 3, average comparisons per lookup 1.25
~~~

**Reading Example 1:** at 4 buckets, \`banana\` and \`cherry\` collided in bucket 3; after the resizes the final table has 16 buckets, and \`apple\` and \`elderberry\` still share bucket 10. The update of \`apple\` did not change the size, and after removing \`cherry\` the size is 6.

## 9. Edge Cases to Mention

- **Missing key:** decide between returning a default, \`null\`/\`None\`, or raising. Example 1 returns \`missing\`, Example 2 uses the language's "get with a default".
- **Updating an existing key:** must overwrite in place without increasing the size (Example 1: \`put apple = 10 (updated)\`, size stays 6 after the removal).
- **Deleting a missing key:** returns false rather than failing.
- **All keys colliding:** correctness survives, speed does not (Example 3).
- **Mutable keys:** if a key changes after insertion, its hash changes and the entry can no longer be found.

## 10. Common Pitfalls

- **Overriding \`equals\` without \`hashCode\`.** Two equal objects then land in different buckets, so \`get\` misses and duplicates appear. Override both (records do it for you).
- **Mutating a key after \`put\`.** Its hash changes and the entry becomes unreachable but still counted in \`size()\`.
- **\`map.get(k) + 1\` for a new key.** \`get\` returns \`null\`, and unboxing throws \`NullPointerException\`; use \`merge(k, 1, Integer::sum)\` or \`getOrDefault\`.
- **Comparing \`Integer\` values from a map with \`==\`.** It compares references; it happens to work for cached values from -128 to 127 and fails above. Use \`equals\` or unbox.
- **Printing a \`HashMap\` and expecting sorted output.** Iteration order is unspecified and can change between versions; sort entries or use \`TreeMap\`.
- **Writing a hash with \`int\` arithmetic and taking \`% n\` of a negative result.** \`hashCode()\` can be negative, and \`%\` keeps the sign; use \`Math.floorMod\` (or a \`long\` with a modulus, as Example 1 does).

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">A hash table maps a key through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hashCode</code> to a bucket index, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove</code> are O(1) on average.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Collisions:</strong> <span style="color:#f0e2c8;">Different keys can share a bucket; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> chains them, and a chain of 8 or more (with 64 or more buckets) becomes a red-black tree.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Load factor:</strong> <span style="color:#f0e2c8;">Default capacity 16 and load factor 0.75: after 12 entries the table doubles to 32 and rehashes, which is amortized O(1) per put.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Worst case:</strong> <span style="color:#f0e2c8;">Bad hashes make chains long; treeification limits that to O(log n), and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h ^ (h &gt;&gt;&gt; 16)</code> spreads high bits into the low bits a power-of-two table uses.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The contract:</strong> <span style="color:#f0e2c8;">Equal keys must have equal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hashCode</code>; override <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hashCode</code> together, and never mutate a key while it is in the map.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if two keys have the same <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">hashCode</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They go into the same bucket and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> tells them apart with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>. It is still correct, only slower if it happens a lot.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the default load factor 0.75?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a trade-off between memory (fewer, fuller buckets) and speed (shorter chains). The constant on OpenJDK 21 is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DEFAULT_LOAD_FACTOR=0.75</code>, read by reflection.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is treeification?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When one bucket holds 8 entries and the table has at least 64 buckets, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> turns that bucket into a red-black tree, so lookups there become O(log n) instead of O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap</code> vs <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">TreeMap</code> vs <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LinkedHashMap</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code>: O(1) average, no order. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LinkedHashMap</code>: the same plus insertion (or access) order. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeMap</code>: O(log n), sorted keys and range queries.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap</code> thread-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ConcurrentHashMap</code> for concurrent access; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.synchronizedMap</code> works but locks the whole map.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Hash function** | Maps a key to an integer, deterministically and evenly |
| **Bucket** | One slot of the table array, holding the entries that map there |
| **Equal keys, equal hashes** | The rule every hash table relies on |
| **Collision** | Two different keys mapping to the same bucket |
| **Separate chaining** | Each bucket keeps a list of its entries |
| **Open addressing (probing)** | Colliding entries go to another slot of the same array |
| **Tombstone** | Deleted-slot marker in open addressing |
| **Load factor** | Entries divided by buckets; triggers resizing |
| **Rehashing** | Recomputing every bucket after the table resizes |
| **Uniform distribution** | Keys spread evenly across buckets |
| **Hash flooding** | Attack that forces collisions to make operations O(n) |
| **Treeification** | HashMap turning a long bucket chain into a red-black tree |

---
**Conclusion:** A hash table turns a key into a bucket index with a hash function, resolves the unavoidable collisions by chaining or probing, and keeps lookups O(1) on average by resizing when the load factor gets too high. Example 1 built one from scratch and showed collisions, two resizes and rehashing; Example 3 showed that a bad hash turns it into an O(n) list. Java's \`HashMap\` is the same design with production details read straight from OpenJDK 21: 16 buckets, load factor 0.75, bit spreading for power-of-two tables, and trees for long chains. Your side of the contract is consistent \`equals\` and \`hashCode\` and keys that never change.`,
        examples: [
          {
            label: "A hash table from scratch: chaining, load factor, resize",
            code: `import java.util.*;

public class Main {
    // A hash table from scratch: separate chaining, a load-factor limit, and resizing.
    // The hash is written out by hand so every language computes the same numbers.

    static long polyHash(String key) {
        long h = 0;
        for (int i = 0; i < key.length(); i++) {
            h = (h * 31 + key.charAt(i)) % 1000000007L;   // long: h * 31 can exceed int range
        }
        return h;
    }

    static final class Entry {
        final String key;
        int value;
        Entry(String key, int value) { this.key = key; this.value = value; }
    }

    static final class HashTable {
        List<List<Entry>> buckets = newBuckets(4);
        int size = 0;

        static List<List<Entry>> newBuckets(int n) {
            List<List<Entry>> b = new ArrayList<>();
            for (int i = 0; i < n; i++) b.add(new ArrayList<>());
            return b;
        }
        List<Entry> bucket(String key) {
            return buckets.get((int) (polyHash(key) % buckets.size()));
        }
        void put(String key, int value) {
            List<Entry> chain = bucket(key);
            for (Entry e : chain) {
                if (e.key.equals(key)) {             // equals, never == on Strings
                    e.value = value;
                    System.out.println("put " + key + " = " + value + " (updated)");
                    return;
                }
            }
            chain.add(new Entry(key, value));
            size++;
            long h = polyHash(key);
            System.out.println("put " + key + " = " + value + " -> hash " + h + " % " + buckets.size()
                    + " = bucket " + (h % buckets.size()));
            if (size * 4 > buckets.size() * 3) resize(buckets.size() * 2);
        }
        void resize(int newCapacity) {
            System.out.println("  load " + size + "/" + buckets.size() + " > 0.75: resize to "
                    + newCapacity + " buckets and rehash every key");
            List<List<Entry>> old = buckets;
            buckets = newBuckets(newCapacity);
            for (List<Entry> chain : old) for (Entry e : chain) bucket(e.key).add(e);
        }
        String get(String key) {
            for (Entry e : bucket(key)) if (e.key.equals(key)) return String.valueOf(e.value);
            return "missing";
        }
        boolean remove(String key) {
            boolean removed = bucket(key).removeIf(e -> e.key.equals(key));
            if (removed) size--;
            return removed;
        }
        void dump() {
            for (int i = 0; i < buckets.size(); i++) {
                StringJoiner sj = new StringJoiner(", ", "[", "]");
                for (Entry e : buckets.get(i)) sj.add(e.key + "=" + e.value);
                System.out.println("  bucket " + i + ": " + sj);
            }
        }
    }

    public static void main(String[] args) {
        HashTable table = new HashTable();
        String[] fruits = {"apple", "banana", "cherry", "date", "elderberry", "fig", "grape"};
        for (int i = 0; i < fruits.length; i++) table.put(fruits[i], i + 1);
        table.put("apple", 10);
        System.out.println("get apple -> " + table.get("apple"));
        System.out.println("get kiwi -> " + table.get("kiwi"));
        System.out.println("remove cherry -> " + table.remove("cherry"));
        System.out.println("get cherry -> " + table.get("cherry"));
        System.out.println("size " + table.size + ", " + table.buckets.size() + " buckets:");
        table.dump();
    }
}`,
          },
          {
            label: "The built-in hash map: word counts",
            code: `import java.util.*;

public class Main {
    // The built-in hash table at work: word counts, membership, and a sorted report.
    public static void main(String[] args) {
        String text = "the cat and the hat and the bat sat on the mat";
        String[] words = text.split(" ");

        Map<String, Integer> counts = new HashMap<>();
        for (String w : words) counts.merge(w, 1, Integer::sum);   // insert 1 or add 1

        System.out.println("distinct words: " + counts.size());
        System.out.println("count of 'the': " + counts.get("the"));
        System.out.println("is 'dog' a key? " + counts.containsKey("dog"));   // average O(1)
        System.out.println("count of 'dog': " + counts.getOrDefault("dog", 0) + " (size still " + counts.size() + ")");

        // HashMap iteration order is unspecified: sort explicitly for output.
        List<Map.Entry<String, Integer>> report = new ArrayList<>(counts.entrySet());
        report.sort(Map.Entry.<String, Integer>comparingByValue().reversed()
                .thenComparing(Map.Entry.comparingByKey()));
        StringJoiner sj = new StringJoiner(", ");
        for (Map.Entry<String, Integer> e : report) sj.add(e.getKey() + "=" + e.getValue());
        System.out.println("by count, then word: " + sj);

        Map.Entry<String, Integer> top = report.get(0);
        System.out.println("top word: " + top.getKey() + " (" + top.getValue() + " times)");
    }
}`,
          },
          {
            label: "Good hash vs bad hash, counted",
            code: `import java.util.*;
import java.util.function.ToLongFunction;

public class Main {
    // Why the hash function matters: the same 1000 keys in 1024 buckets,
    // with a good hash and with a bad one, then in 1031 (a prime). We count key comparisons.

    static long goodHash(String key) {
        long h = 0;
        for (int i = 0; i < key.length(); i++) h = (h * 31 + key.charAt(i)) % 1000000007L;
        return h;
    }

    static long badHash(String key) {
        return key.length();         // every key of the same length collides
    }

    static void measure(String name, ToLongFunction<String> hashFn, List<String> keys, int capacity) {
        List<List<String>> buckets = new ArrayList<>();
        for (int i = 0; i < capacity; i++) buckets.add(new ArrayList<>());
        for (String k : keys) buckets.get((int) (hashFn.applyAsLong(k) % capacity)).add(k);
        long comparisons = 0;
        for (String k : keys) {                          // look every key up once
            for (String candidate : buckets.get((int) (hashFn.applyAsLong(k) % capacity))) {
                comparisons++;
                if (candidate.equals(k)) break;
            }
        }
        int longest = 0, used = 0;
        for (List<String> b : buckets) {
            longest = Math.max(longest, b.size());
            if (!b.isEmpty()) used++;
        }
        double avg = (double) comparisons / keys.size();
        System.out.println(name + ": buckets used " + used + "/" + capacity + ", longest chain " + longest
                + ", average comparisons per lookup " + String.format(Locale.ROOT, "%.2f", avg));
    }

    public static void main(String[] args) {
        List<String> keys = new ArrayList<>();
        for (int i = 0; i < 1000; i++) keys.add("user" + i);
        measure("good hash", Main::goodHash, keys, 1024);
        measure("bad hash ", Main::badHash, keys, 1024);
        measure("good hash", Main::goodHash, keys, 1031);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Explain how a hash table works under the hood: what happens when you insert a key, how collisions are handled, and why lookups are fast. Then tell me how C++'s built-in hash map behaves, and sketch a simple one in C++ if we have time."

**What a strong answer should cover:**
- Hash function → hash code → bucket index (modulo the bucket count), and the rule that equal keys must have equal hashes.
- Collision handling: separate chaining versus open addressing (probing), and tombstones on deletion.
- Load factor and resizing with rehashing, giving amortized O(1) inserts.
- Average O(1) versus worst-case O(n), what causes the worst case (bad hash, adversarial keys) and the defences.
- No ordering guarantees from hashing itself; a tree map when order or ranges matter.
- C++ specifics: \`std::unordered_map\` uses buckets you can inspect (\`bucket_count\`, \`load_factor\`, \`max_load_factor\`), \`std::hash\` has no specialisation for \`std::pair\`, \`operator[]\` inserts missing keys, and a rehash invalidates iterators.

**Code / implementation expected:** Optional — a small separate-chaining table with put, get, remove and resize in C++, or correct use of the built-in map.`,
        answer: `**Target Audience:** Developers who use maps every day and want to know what happens inside — beginners welcome.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`g++ -std=c++17 main.cpp && ./a.out\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A theatre cloakroom has 100 hooks. When you hand in your coat, the attendant does not hang it on the first free hook and then search all 100 when you come back. Instead, they use a rule: take the last two digits of your ticket number, and that is your hook. Ticket 4,217 goes on hook 17. When you return, they compute 17 again and walk straight to it. The work is the same whether the cloakroom holds 3 coats or 90.

Sometimes two tickets end in the same digits, 4,217 and 8,317. The attendant then hangs both on hook 17 and checks the ticket numbers when someone comes back; with a good rule and enough hooks, a hook rarely holds more than one or two coats. When the cloakroom gets crowded, they move to a bigger room with more hooks and rehang everything using the new rule.

That is the entire idea of a hash table: a **rule that turns a key into a position**, a plan for **two keys that land on the same position**, and **growing** when it gets full. It is why looking something up in a Python \`dict\`, a JavaScript \`Map\`, a Java \`HashMap\` or a C++ \`unordered_map\` takes about the same time for ten items or ten million.

## 2. The Core Idea: Key → Hash → Bucket

A hash table stores **key-value pairs** in an array of slots called **buckets**. To find where a key belongs:

1. Run the key through a **hash function**, which turns it into an integer, the **hash code**.
2. Reduce the hash code to a bucket index, most simply with \`hash % number_of_buckets\`.
3. Store or look for the pair in that bucket.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 160" role="img" aria-label="A key goes through the hash function to a number, and the number modulo the bucket count picks the bucket">
  <defs>
    <marker id="b02q4-cpp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="130" height="80" rx="10"/>
  <text class="d-text" x="85" y="72" text-anchor="middle">key</text>
  <text class="d-sub" x="85" y="98" text-anchor="middle">apple</text>
  <path class="d-edge" d="M 154 80 L 194 80" marker-end="url(#b02q4-cpp-arrow)"/>
  <rect class="d-box" x="200" y="40" width="150" height="80" rx="10"/>
  <text class="d-text" x="275" y="72" text-anchor="middle">hash function</text>
  <text class="d-sub" x="275" y="98" text-anchor="middle">h times 31 plus char</text>
  <path class="d-edge" d="M 354 80 L 394 80" marker-end="url(#b02q4-cpp-arrow)"/>
  <rect class="d-box" x="400" y="40" width="130" height="80" rx="10"/>
  <text class="d-text" x="465" y="72" text-anchor="middle">hash code</text>
  <text class="d-sub" x="465" y="98" text-anchor="middle">93029210</text>
  <path class="d-edge-accent" d="M 534 80 L 574 80" marker-end="url(#b02q4-cpp-arrow)"/>
  <rect class="d-box-accent" x="580" y="40" width="120" height="80" rx="10"/>
  <text class="d-text d-accent" x="640" y="72" text-anchor="middle">bucket 10</text>
  <text class="d-sub" x="640" y="98" text-anchor="middle">mod 16</text>
</svg>

The hash function used in this doc's examples treats a string as a number in base 31: start at 0, and for each character do \`h = (h × 31 + character code) mod 1,000,000,007\`. For \`"apple"\` that gives 93,029,210, and with 16 buckets, 93,029,210 mod 16 = 10. Computing a hash takes time proportional to the key length, not to the number of stored items, so lookups cost the same for any table size: **O(1) on average**.

📌 **Interview term: Hash function** — a function that maps a key to an integer. It must be **deterministic** (the same key always gives the same hash) and should spread different keys **uniformly** across the possible values.

📌 **Interview term: Bucket** — one slot of the table's underlying array; it holds the entries whose hash maps to that index.

📌 **Interview term: Equal keys, equal hashes** — the one rule every hash table depends on: if two keys are equal, their hashes must be equal. (The reverse does not hold: different keys may share a hash.)

## 3. Collisions: When Two Keys Want the Same Bucket

There are far more possible keys than buckets, so some different keys **must** land in the same bucket (the pigeonhole principle). That is a **collision**, and every hash table needs a strategy for it. There are two families.

### Separate chaining

Each bucket holds a small list (a chain) of all entries that hash there. A lookup goes to the bucket, then compares keys along the chain. This is what Example 1 implements. With 8 buckets, its keys landed like this:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="Separate chaining with 8 buckets: bucket 2 holds apple then elderberry, bucket 3 holds cherry then grape">
  <defs>
    <marker id="b02q4c-cpp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="70" y="26" text-anchor="middle">buckets</text>
  <rect class="d-box-muted" x="40" y="40" width="60" height="30"/>
  <text class="d-sub" x="70" y="60" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="40" y="70" width="60" height="30"/>
  <text class="d-sub" x="70" y="90" text-anchor="middle">1</text>
  <rect class="d-box" x="40" y="100" width="60" height="30"/>
  <text class="d-text" x="70" y="120" text-anchor="middle">2</text>
  <rect class="d-box" x="40" y="130" width="60" height="30"/>
  <text class="d-text" x="70" y="150" text-anchor="middle">3</text>
  <rect class="d-box" x="40" y="160" width="60" height="30"/>
  <text class="d-text" x="70" y="180" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="40" y="190" width="60" height="30"/>
  <text class="d-sub" x="70" y="210" text-anchor="middle">5</text>
  <rect class="d-box" x="40" y="220" width="60" height="30"/>
  <text class="d-text" x="70" y="240" text-anchor="middle">6</text>
  <rect class="d-box" x="40" y="250" width="60" height="30"/>
  <text class="d-text" x="70" y="270" text-anchor="middle">7</text>
  <path class="d-edge" d="M 104 115 L 174 115" marker-end="url(#b02q4c-cpp-arrow)"/>
  <rect class="d-box" x="180" y="103" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="120" text-anchor="middle">apple = 1</text>
  <path class="d-edge-accent" d="M 334 115 L 404 115" marker-end="url(#b02q4c-cpp-arrow)"/>
  <rect class="d-box-accent" x="410" y="103" width="170" height="24" rx="6"/>
  <text class="d-sub" x="495" y="120" text-anchor="middle">elderberry = 5</text>
  <path class="d-edge" d="M 104 145 L 174 145" marker-end="url(#b02q4c-cpp-arrow)"/>
  <rect class="d-box" x="180" y="133" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="150" text-anchor="middle">cherry = 3</text>
  <path class="d-edge-accent" d="M 334 145 L 404 145" marker-end="url(#b02q4c-cpp-arrow)"/>
  <rect class="d-box-accent" x="410" y="133" width="170" height="24" rx="6"/>
  <text class="d-sub" x="495" y="150" text-anchor="middle">grape = 7</text>
  <path class="d-edge" d="M 104 175 L 174 175" marker-end="url(#b02q4c-cpp-arrow)"/>
  <rect class="d-box" x="180" y="163" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="180" text-anchor="middle">fig = 6</text>
  <path class="d-edge" d="M 104 235 L 174 235" marker-end="url(#b02q4c-cpp-arrow)"/>
  <rect class="d-box" x="180" y="223" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="240" text-anchor="middle">date = 4</text>
  <path class="d-edge" d="M 104 265 L 174 265" marker-end="url(#b02q4c-cpp-arrow)"/>
  <rect class="d-box" x="180" y="253" width="150" height="24" rx="6"/>
  <text class="d-sub" x="255" y="270" text-anchor="middle">banana = 2</text>
</svg>

\`apple\` and \`elderberry\` both hash to bucket 2, and \`cherry\` and \`grape\` both to bucket 3, so those buckets hold two entries each. Looking up \`grape\` costs one hash and two key comparisons.

### Open addressing

All entries live directly in the bucket array. If the home bucket is taken, the table **probes** other buckets in a fixed order until it finds a free one (or, for a lookup, the key or an empty slot). The simplest order is **linear probing**: try the next slot, then the next.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Linear probing: grape hashes to slot 3, which is taken, so it tries slot 4, also taken, and lands in slot 5">
  <defs>
    <marker id="b02q4p-cpp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="24" text-anchor="middle">Open addressing: grape has home slot 3</text>
  <rect class="d-box-muted" x="40" y="80" width="80" height="50"/>
  <rect class="d-box-muted" x="120" y="80" width="80" height="50"/>
  <rect class="d-box" x="200" y="80" width="80" height="50"/>
  <text class="d-sub" x="240" y="110" text-anchor="middle">apple</text>
  <rect class="d-box" x="280" y="80" width="80" height="50"/>
  <text class="d-sub" x="320" y="110" text-anchor="middle">cherry</text>
  <rect class="d-box" x="360" y="80" width="80" height="50"/>
  <text class="d-sub" x="400" y="110" text-anchor="middle">fig</text>
  <rect class="d-box-accent" x="440" y="80" width="80" height="50"/>
  <text class="d-sub d-accent" x="480" y="110" text-anchor="middle">grape</text>
  <rect class="d-box-muted" x="520" y="80" width="80" height="50"/>
  <rect class="d-box-muted" x="600" y="80" width="80" height="50"/>
  <path class="d-edge-dashed" d="M 320 76 Q 360 44 396 72" marker-end="url(#b02q4p-cpp-arrow)"/>
  <path class="d-edge-accent" d="M 400 76 Q 440 44 476 72" marker-end="url(#b02q4p-cpp-arrow)"/>
  <text class="d-sub" x="80" y="156" text-anchor="middle">0</text>
  <text class="d-sub" x="160" y="156" text-anchor="middle">1</text>
  <text class="d-sub" x="240" y="156" text-anchor="middle">2</text>
  <text class="d-sub" x="320" y="156" text-anchor="middle">3 taken</text>
  <text class="d-sub" x="400" y="156" text-anchor="middle">4 taken</text>
  <text class="d-sub" x="480" y="156" text-anchor="middle">5 free</text>
  <text class="d-sub" x="560" y="156" text-anchor="middle">6</text>
  <text class="d-sub" x="640" y="156" text-anchor="middle">7</text>
</svg>

Open addressing keeps everything in one contiguous array (good cache behaviour) but needs care on deletion: simply emptying a slot would break the probe chain for keys placed after it, so implementations leave a **tombstone** marker instead.

📌 **Interview term: Collision** — two different keys mapping to the same bucket. It is unavoidable; a good table keeps it rare and cheap.

📌 **Interview term: Separate chaining** — resolving collisions by keeping a list of entries in each bucket.

📌 **Interview term: Open addressing (probing)** — resolving collisions by placing the entry in another slot of the same array, found by a probe sequence such as linear probing.

📌 **Interview term: Tombstone** — a "deleted" marker in an open-addressing table, so later lookups keep probing past it.

## 4. Load Factor and Resizing

The **load factor** is \`entries / buckets\`. As it rises, chains get longer (or probe sequences get longer), and lookups slow down. So a table sets a limit, and when an insert pushes it over, the table **resizes**: it allocates a bigger bucket array (usually double) and **rehashes** every entry, because \`hash % buckets\` changes when the bucket count changes.

Example 1 starts with 4 buckets and a limit of 0.75. The output shows the 4th insert pushing the load to 4/4 and triggering a resize to 8 buckets, and the 7th insert (7/8) triggering a resize to 16. After the resize, \`apple\` moved from bucket 2 to bucket 10: same hash, different modulus.

A single resize costs O(n), but because the size doubles each time, resizes are rare enough that inserts are still **amortized O(1)**, the same argument as for dynamic arrays (see [amortized analysis](/interview-question/what-is-amortized-analysis)).

📌 **Interview term: Load factor** — the number of entries divided by the number of buckets; the table resizes when it passes a threshold (0.75 in Java's \`HashMap\` and in Example 1).

📌 **Interview term: Rehashing** — recomputing every entry's bucket after the bucket array changes size.

## 5. What Makes a Hash Function Good

A good hash function is **deterministic**, **fast**, and **spreads keys evenly**. Example 3 shows what happens when the last property fails. It puts the same 1,000 keys (\`user0\` to \`user999\`) into 1,024 buckets twice, once with the base-31 hash and once with a "hash" that returns the key length:

- With the length hash, all keys of the same length collide: only 3 buckets were used, the longest chain had 900 entries, and an average lookup needed 409.60 comparisons. The table had become a slow linked list: **O(n)** per lookup.
- With the base-31 hash, the average lookup needed 2.35 comparisons.
- The same base-31 hash with 1,031 buckets (a prime) needed only 1.25. Keys like \`user0\` ... \`user999\` differ only in their last characters, and taking a hash modulo a power of two keeps only its lowest bits, so similar keys cluster. A prime modulus mixes in all the bits. Real libraries fix this in the hash itself instead; the language section shows how.

That worst case is also a security issue: if attackers can choose keys that collide, they can make a server's hash tables O(n) per operation (**hash flooding**). Defences include randomised hash seeds and switching long chains to balanced trees.

📌 **Interview term: Uniform distribution** — a hash function spreading keys evenly over all buckets, so every chain stays short.

📌 **Interview term: Hash flooding** — a denial-of-service attack that sends many keys with the same hash to force worst-case O(n) operations.

## 6. Average Case vs Worst Case

| Operation | Average | Worst case | Why |
| :--- | :--- | :--- | :--- |
| insert / put | O(1) amortized | O(n) | one hash plus a short chain; a resize or all keys colliding is O(n) |
| lookup / get | O(1) | O(n) | same; the worst case is one long chain |
| delete | O(1) | O(n) | find the entry, unlink it (or leave a tombstone) |
| iterate all entries | O(n + buckets) | O(n + buckets) | every bucket is visited, empty or not |
| space | O(n + buckets) | O(n + buckets) | entries plus the bucket array |

"Average" assumes a good hash function and a bounded load factor. A hash table also gives **no useful order**: the iteration order of a pure hash table depends on hash values, not on keys or insertion time. When you need sorted keys or range queries, use a balanced tree map (O(log n) per operation); see [operation complexities compared](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance).

Hash tables are the engine behind many interview patterns: [Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently), [group anagrams](/interview-question/how-do-you-group-anagrams-together), [longest consecutive sequence](/interview-question/longest-consecutive-sequence-in-o-n-with-hash-set-why-not-sort) and the [LRU cache](/interview-question/how-do-you-design-an-lru-cache).

## 7. In C++: std::unordered_map

- **Buckets you can inspect.** \`std::unordered_map\` exposes its bucket interface: \`bucket_count()\`, \`bucket(key)\`, \`load_factor()\`, \`max_load_factor()\` and \`rehash(n)\`. With g++ 13 (libstdc++), an empty \`unordered_map<int, int>\` reported \`max_load_factor=1\` and 1 bucket; inserting 20 keys showed the bucket count jump to 13 at the first insert and to 29 at the 14th, so this implementation uses prime bucket counts and resizes when the load factor would pass 1.0:

~~~text
max_load_factor=1 buckets=1
1:13 2:13 3:13 4:13 5:13 6:13 7:13 8:13 9:13 10:13 11:13 12:13 13:13 14:29 15:29 16:29 17:29 18:29 19:29 20:29
~~~

* **\`std::hash<T>\`** exists for built-in types and \`std::string\`, but not for \`std::pair\` or \`std::tuple\`, so \`std::unordered_map<std::pair<int, int>, int>\` does not compile until you supply a hash functor. A common workaround for grid coordinates is a single 64-bit key: \`(long long)row << 32 | (unsigned)col\`.
* **\`operator[]\` inserts.** \`counts[w]++\` is the idiomatic counter because a missing key is inserted with value 0. For a read-only lookup use \`find\`, \`count\` or \`contains\` (C++20), or \`at\`, which throws \`std::out_of_range\` for a missing key.
* **Iterator invalidation.** A rehash (triggered by an insert or by \`reserve\`/\`rehash\`) invalidates all iterators, but pointers and references to the elements stay valid. Call \`reserve(n)\` up front to avoid repeated rehashing.
* **\`std::map\`** is a balanced tree: O(log n) and sorted keys. Choose it when you need ordered iteration or \`lower_bound\`.

## 8. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`g++ -std=c++17 main.cpp && ./a.out\`; the blocks are the exact standard output.

**Example 1 — a separate-chaining table from scratch: collisions, two resizes, update, get and remove**

~~~text
put apple = 1 -> hash 93029210 % 4 = bucket 2
put banana = 2 -> hash 898612055 % 4 = bucket 3
put cherry = 3 -> hash 933454219 % 4 = bucket 3
put date = 4 -> hash 3076014 % 4 = bucket 2
  load 4/4 > 0.75: resize to 8 buckets and rehash every key
put elderberry = 5 -> hash 307547146 % 8 = bucket 2
put fig = 6 -> hash 101380 % 8 = bucket 4
put grape = 7 -> hash 98615627 % 8 = bucket 3
  load 7/8 > 0.75: resize to 16 buckets and rehash every key
put apple = 10 (updated)
get apple -> 10
get kiwi -> missing
remove cherry -> true
get cherry -> missing
size 6, 16 buckets:
  bucket 0: []
  bucket 1: []
  bucket 2: []
  bucket 3: []
  bucket 4: [fig=6]
  bucket 5: []
  bucket 6: []
  bucket 7: [banana=2]
  bucket 8: []
  bucket 9: []
  bucket 10: [apple=10, elderberry=5]
  bucket 11: [grape=7]
  bucket 12: []
  bucket 13: []
  bucket 14: [date=4]
  bucket 15: []
~~~

**Example 2 — the built-in hash map counting words**

~~~text
distinct words: 8
count of 'the': 4
is 'dog' a key? false
count of 'dog': 0 (size still 8)
by count, then word: the=4, and=2, bat=1, cat=1, hat=1, mat=1, on=1, sat=1
top word: the (4 times)
~~~

**Example 3 — a good hash, a bad hash, and a prime bucket count**

~~~text
good hash: buckets used 359/1024, longest chain 6, average comparisons per lookup 2.35
bad hash : buckets used 3/1024, longest chain 900, average comparisons per lookup 409.60
good hash: buckets used 773/1031, longest chain 3, average comparisons per lookup 1.25
~~~

**Reading Example 1:** at 4 buckets, \`banana\` and \`cherry\` collided in bucket 3; after the resizes the final table has 16 buckets, and \`apple\` and \`elderberry\` still share bucket 10. The update of \`apple\` did not change the size, and after removing \`cherry\` the size is 6.

## 9. Edge Cases to Mention

- **Missing key:** decide between returning a default, \`null\`/\`None\`, or raising. Example 1 returns \`missing\`, Example 2 uses the language's "get with a default".
- **Updating an existing key:** must overwrite in place without increasing the size (Example 1: \`put apple = 10 (updated)\`, size stays 6 after the removal).
- **Deleting a missing key:** returns false rather than failing.
- **All keys colliding:** correctness survives, speed does not (Example 3).
- **Mutable keys:** if a key changes after insertion, its hash changes and the entry can no longer be found.

## 10. Common Pitfalls

- **Reading with \`operator[]\`.** It inserts a default value for a missing key, so \`size()\` grows and a \`const\` map cannot use it at all. Use \`find\` or \`at\`.
- **Keys without a hash.** \`std::pair\` and \`std::tuple\` keys need a custom hash functor (or encode them into one integer or string).
- **Keeping iterators across inserts.** An insert that triggers a rehash invalidates every iterator; references to elements survive.
- **Signed overflow in a hand-written hash.** \`h * 31 + c\` on \`int\` overflows quickly, and signed overflow is undefined behaviour; use \`unsigned\` or 64-bit arithmetic with a modulus, as Example 1 does.
- **Iterating an \`unordered_map\` and expecting a stable order.** The order depends on buckets and changes after a rehash; copy into a vector and sort, as Example 2 does.
- **Forgetting \`reserve\`.** Inserting a million keys without it rehashes many times; \`reserve(n)\` sizes the buckets once.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">A hash table maps a key through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::hash</code> to a bucket index, so insert, find and erase are O(1) on average.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Collisions:</strong> <span style="color:#f0e2c8;">Different keys can share a bucket; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::unordered_map</code> keeps each bucket as a chain, and its bucket interface lets you inspect them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Load factor:</strong> <span style="color:#f0e2c8;">When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">load_factor()</code> would pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_load_factor()</code> (1.0 by default) the table rehashes into more buckets: O(n) once, amortized O(1) per insert.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Worst case:</strong> <span style="color:#f0e2c8;">If many keys collide, operations degrade to O(n), so the hash must spread keys evenly; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reserve</code> avoids repeated rehashes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ traps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> inserts missing keys, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::pair</code> has no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::hash</code>, and a rehash invalidates iterators but not references.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::map</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::unordered_map</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> for O(1) average lookups when order does not matter; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map</code> (a balanced tree) for O(log n) operations with sorted iteration and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower_bound</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you use a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pair</code> as a key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write a hash functor, for example combining the two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::hash&lt;int&gt;</code> values, and pass it as the third template argument; or pack both ints into one 64-bit key.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">max_load_factor</code> control?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The maximum average entries per bucket before a rehash. g++ 13 reported 1.0 by default; lowering it trades memory for shorter chains.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which operations invalidate what?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A rehash invalidates all iterators. Erasing invalidates only iterators and references to the erased element. References and pointers to other elements stay valid.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the worst case and when does it happen?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n) per operation when keys pile into one bucket, for example with a poor custom hash or adversarial keys.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Hash function** | Maps a key to an integer, deterministically and evenly |
| **Bucket** | One slot of the table array, holding the entries that map there |
| **Equal keys, equal hashes** | The rule every hash table relies on |
| **Collision** | Two different keys mapping to the same bucket |
| **Separate chaining** | Each bucket keeps a list of its entries |
| **Open addressing (probing)** | Colliding entries go to another slot of the same array |
| **Tombstone** | Deleted-slot marker in open addressing |
| **Load factor** | Entries divided by buckets; triggers resizing |
| **Rehashing** | Recomputing every bucket after the table resizes |
| **Uniform distribution** | Keys spread evenly across buckets |
| **Hash flooding** | Attack that forces collisions to make operations O(n) |
| **std::hash** | The C++ standard hash functor; specialised for built-in types and std::string |

---
**Conclusion:** A hash table turns a key into a bucket index with a hash function, resolves the unavoidable collisions by chaining or probing, and keeps lookups O(1) on average by resizing when the load factor gets too high. Example 1 built one from scratch and showed collisions, two resizes and rehashing; Example 3 showed that a bad hash turns it into an O(n) list. \`std::unordered_map\` is the same design with its buckets exposed: with g++ 13 a maximum load factor of 1.0 and prime bucket counts. The C++-specific habits are reading with \`find\`, giving composite keys a hash, calling \`reserve\`, and knowing that a rehash invalidates iterators.`,
        examples: [
          {
            label: "A hash table from scratch: chaining, load factor, resize",
            code: `#include <iostream>
#include <list>
#include <string>
#include <utility>
#include <vector>

// A hash table from scratch: separate chaining, a load-factor limit, and resizing.
// The hash is written out by hand so every language computes the same numbers.

long long polyHash(const std::string& key) {
    long long h = 0;
    for (unsigned char ch : key) h = (h * 31 + ch) % 1000000007LL;   // 64-bit: no overflow
    return h;
}

class HashTable {
public:
    std::vector<std::list<std::pair<std::string, int>>> buckets = decltype(buckets)(4);
    int size = 0;

    std::list<std::pair<std::string, int>>& bucket(const std::string& key) {
        return buckets[polyHash(key) % buckets.size()];
    }
    void put(const std::string& key, int value) {
        auto& chain = bucket(key);
        for (auto& [k, v] : chain) {
            if (k == key) {                          // std::string == compares contents
                v = value;
                std::cout << "put " << key << " = " << value << " (updated)\\n";
                return;
            }
        }
        chain.emplace_back(key, value);
        size++;
        long long h = polyHash(key);
        std::cout << "put " << key << " = " << value << " -> hash " << h << " % " << buckets.size()
                  << " = bucket " << (h % static_cast<long long>(buckets.size())) << "\\n";
        if (size * 4 > static_cast<int>(buckets.size()) * 3) resize(buckets.size() * 2);
    }
    void resize(size_t newCapacity) {
        std::cout << "  load " << size << "/" << buckets.size() << " > 0.75: resize to "
                  << newCapacity << " buckets and rehash every key\\n";
        auto old = std::move(buckets);
        buckets.assign(newCapacity, {});
        for (auto& chain : old)
            for (auto& kv : chain) bucket(kv.first).push_back(std::move(kv));
    }
    std::string get(const std::string& key) {
        for (auto& [k, v] : bucket(key)) if (k == key) return std::to_string(v);
        return "missing";
    }
    bool remove(const std::string& key) {
        auto& chain = bucket(key);
        for (auto it = chain.begin(); it != chain.end(); ++it) {
            if (it->first == key) { chain.erase(it); size--; return true; }
        }
        return false;
    }
    void dump() {
        for (size_t i = 0; i < buckets.size(); i++) {
            std::string s;
            for (auto& [k, v] : buckets[i]) s += (s.empty() ? "" : ", ") + k + "=" + std::to_string(v);
            std::cout << "  bucket " << i << ": [" << s << "]\\n";
        }
    }
};

int main() {
    std::cout << std::boolalpha;
    HashTable table;
    std::vector<std::string> fruits = {"apple", "banana", "cherry", "date", "elderberry", "fig", "grape"};
    for (size_t i = 0; i < fruits.size(); i++) table.put(fruits[i], static_cast<int>(i) + 1);
    table.put("apple", 10);
    std::cout << "get apple -> " << table.get("apple") << "\\n";
    std::cout << "get kiwi -> " << table.get("kiwi") << "\\n";
    std::cout << "remove cherry -> " << table.remove("cherry") << "\\n";
    std::cout << "get cherry -> " << table.get("cherry") << "\\n";
    std::cout << "size " << table.size << ", " << table.buckets.size() << " buckets:\\n";
    table.dump();
}`,
          },
          {
            label: "The built-in hash map: word counts",
            code: `#include <algorithm>
#include <iostream>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>

// The built-in hash table at work: word counts, membership, and a sorted report.
int main() {
    std::string text = "the cat and the hat and the bat sat on the mat";
    std::istringstream in(text);
    std::unordered_map<std::string, int> counts;
    std::string w;
    while (in >> w) counts[w]++;          // operator[] inserts 0 for a new key, then ++

    std::cout << "distinct words: " << counts.size() << "\\n";
    std::cout << "count of 'the': " << counts.at("the") << "\\n";
    std::cout << std::boolalpha << "is 'dog' a key? " << (counts.count("dog") > 0) << "\\n";
    // find() looks without inserting; counts["dog"] here would ADD a "dog" entry.
    auto it = counts.find("dog");
    std::cout << "count of 'dog': " << (it == counts.end() ? 0 : it->second)
              << " (size still " << counts.size() << ")\\n";

    // unordered_map iteration order is unspecified: copy out and sort for output.
    std::vector<std::pair<std::string, int>> report(counts.begin(), counts.end());
    std::sort(report.begin(), report.end(), [](const auto& a, const auto& b) {
        return a.second != b.second ? a.second > b.second : a.first < b.first;
    });
    std::string line;
    for (const auto& [word, c] : report) line += (line.empty() ? "" : ", ") + word + "=" + std::to_string(c);
    std::cout << "by count, then word: " << line << "\\n";

    std::cout << "top word: " << report[0].first << " (" << report[0].second << " times)\\n";
}`,
          },
          {
            label: "Good hash vs bad hash, counted",
            code: `#include <algorithm>
#include <cstdio>
#include <iostream>
#include <string>
#include <vector>

// Why the hash function matters: the same 1000 keys in 1024 buckets,
// with a good hash and with a bad one, then in 1031 (a prime). We count key comparisons.

long long goodHash(const std::string& key) {
    long long h = 0;
    for (unsigned char ch : key) h = (h * 31 + ch) % 1000000007LL;
    return h;
}

long long badHash(const std::string& key) {
    return static_cast<long long>(key.size());   // every key of the same length collides
}

template <typename HashFn>
void measure(const std::string& name, HashFn hashFn, const std::vector<std::string>& keys, int capacity) {
    std::vector<std::vector<std::string>> buckets(capacity);
    for (const auto& k : keys) buckets[hashFn(k) % capacity].push_back(k);
    long long comparisons = 0;
    for (const auto& k : keys) {                 // look every key up once
        for (const auto& candidate : buckets[hashFn(k) % capacity]) {
            comparisons++;
            if (candidate == k) break;
        }
    }
    size_t longest = 0;
    int used = 0;
    for (const auto& b : buckets) {
        longest = std::max(longest, b.size());
        if (!b.empty()) used++;
    }
    char avg[32];
    std::snprintf(avg, sizeof avg, "%.2f", static_cast<double>(comparisons) / keys.size());
    std::cout << name << ": buckets used " << used << "/" << capacity << ", longest chain " << longest
              << ", average comparisons per lookup " << avg << "\\n";
}

int main() {
    std::vector<std::string> keys;
    for (int i = 0; i < 1000; i++) keys.push_back("user" + std::to_string(i));
    measure("good hash", goodHash, keys, 1024);
    measure("bad hash ", badHash, keys, 1024);
    measure("good hash", goodHash, keys, 1031);
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is a stable sorting algorithm?",
    difficulty: "easy",
    seoDescription: "Stable sorting keeps equal keys in input order. Which algorithms are stable, why multi-key sorts need it, and what Python, JS, Java and C++ guarantee.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"What does it mean for a sorting algorithm to be stable? Give an example where it matters, tell me which common algorithms are stable, and whether the built-in sort in Python is."

**What a strong answer should cover:**
- The definition: items with equal keys keep their input order; it only matters when items carry more than the key.
- Why it matters: multi-key sorting in passes (least important key first), tables with several sort columns, ties in rankings, radix sort.
- Stable algorithms (insertion, merge, counting, Timsort) versus usually unstable ones (selection, quicksort, heapsort).
- How to make any sort stable: the original index as a tie-breaker, or a full composite key.
- Python specifics: \`list.sort()\` and \`sorted()\` are guaranteed stable (Timsort), so multi-key sorts can be done in passes or with a tuple key, and \`reverse=True\` keeps equal items in their original order.

**Code / implementation expected:** Optional — a multi-key sort with the Python built-in, or a short demonstration of an unstable sort.`,
        answer: `**Target Audience:** Beginners who know what sorting is and want to understand the guarantees behind it.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`python3 main.py\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A teacher has the class list in alphabetical order. She wants the list grouped by grade, A first, but **still alphabetical inside each grade**, so she can find a name quickly. She clicks "sort by grade" in her spreadsheet. If the spreadsheet's sort is **stable**, she gets exactly what she wanted: within the A students, Ana is still before Bo, because that is the order they were in before. If the sort is **unstable**, the A students might come out as Bo, Ana, and the B students in some random-looking order, even though every grade group is correct.

Both results are "sorted by grade". Stability is the extra promise about what happens to the items the sort considers **equal**. It sounds like a detail until you build a multi-column table, a leaderboard with ties, or a sort that runs in several passes.

## 2. The Definition

A sorting algorithm is **stable** if, whenever two items have **equal keys**, they appear in the output in the **same relative order** as in the input. An unstable algorithm may reorder them.

📌 **Interview term: Stable sort** — a sort that keeps items with equal keys in their original relative order.

📌 **Interview term: Sort key** — the value the sort compares (here the card's rank or the student's grade). Items can be different but have equal keys.

📌 **Interview term: Ties** — items whose keys compare equal. Stability only says something about ties; it changes nothing when all keys are distinct.

Cards sorted by rank show the difference. \`5 hearts\` came before \`5 spades\` in the input:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 310" role="img" aria-label="Sorting cards by rank: the stable result keeps 5 hearts before 5 spades as in the input; the unstable result swaps them">
  <text class="d-text" x="70" y="64" text-anchor="middle">input</text>
  <rect class="d-box-accent" x="150" y="30" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="205" y="54" text-anchor="middle">5 hearts</text>
  <text class="d-sub" x="205" y="74" text-anchor="middle">input pos 0</text>
  <rect class="d-box" x="290" y="30" width="110" height="56" rx="8"/>
  <text class="d-text" x="345" y="54" text-anchor="middle">3 spades</text>
  <text class="d-sub" x="345" y="74" text-anchor="middle">input pos 1</text>
  <rect class="d-box-accent" x="430" y="30" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="485" y="54" text-anchor="middle">5 spades</text>
  <text class="d-sub" x="485" y="74" text-anchor="middle">input pos 2</text>
  <rect class="d-box" x="570" y="30" width="110" height="56" rx="8"/>
  <text class="d-text" x="625" y="54" text-anchor="middle">2 clubs</text>
  <text class="d-sub" x="625" y="74" text-anchor="middle">input pos 3</text>
  <text class="d-text" x="70" y="164" text-anchor="middle">stable</text>
  <rect class="d-box" x="150" y="130" width="110" height="56" rx="8"/>
  <text class="d-text" x="205" y="154" text-anchor="middle">2 clubs</text>
  <text class="d-sub" x="205" y="174" text-anchor="middle">pos 3</text>
  <rect class="d-box" x="290" y="130" width="110" height="56" rx="8"/>
  <text class="d-text" x="345" y="154" text-anchor="middle">3 spades</text>
  <text class="d-sub" x="345" y="174" text-anchor="middle">pos 1</text>
  <rect class="d-box-accent" x="430" y="130" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="485" y="154" text-anchor="middle">5 hearts</text>
  <text class="d-sub" x="485" y="174" text-anchor="middle">pos 0</text>
  <rect class="d-box-accent" x="570" y="130" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="625" y="154" text-anchor="middle">5 spades</text>
  <text class="d-sub" x="625" y="174" text-anchor="middle">pos 2</text>
  <text class="d-text" x="70" y="264" text-anchor="middle">unstable</text>
  <rect class="d-box" x="150" y="230" width="110" height="56" rx="8"/>
  <text class="d-text" x="205" y="254" text-anchor="middle">2 clubs</text>
  <text class="d-sub" x="205" y="274" text-anchor="middle">pos 3</text>
  <rect class="d-box" x="290" y="230" width="110" height="56" rx="8"/>
  <text class="d-text" x="345" y="254" text-anchor="middle">3 spades</text>
  <text class="d-sub" x="345" y="274" text-anchor="middle">pos 1</text>
  <rect class="d-box-accent" x="430" y="230" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="485" y="254" text-anchor="middle">5 spades</text>
  <text class="d-sub" x="485" y="274" text-anchor="middle">pos 2</text>
  <rect class="d-box-accent" x="570" y="230" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="625" y="254" text-anchor="middle">5 hearts</text>
  <text class="d-sub" x="625" y="274" text-anchor="middle">pos 0</text>
</svg>

Both outputs are correctly sorted by rank. Only the stable one keeps \`5 hearts\` (input position 0) before \`5 spades\` (input position 2). Example 2 produces exactly these two rows with a hand-written insertion sort (stable) and selection sort (unstable).

Stability only matters when items carry more than their key. Sorting plain integers, two equal 5s are indistinguishable, so stable and unstable give identical results.

## 3. Why It Matters: Sorting by Several Keys

The main practical use is **multi-key sorting in passes**. To sort by grade, and by name inside each grade, sort by the **least important key first** and then by the more important key with a stable sort. The second pass keeps the first pass's order inside each group:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Two-pass sort: sort by name first, then stably by grade; inside each grade the names stay alphabetical">
  <defs>
    <marker id="b02q5-python-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="190" height="120" rx="10"/>
  <text class="d-text" x="115" y="72" text-anchor="middle">input</text>
  <text class="d-sub" x="115" y="100" text-anchor="middle">Dev B, Ana A, Raj B</text>
  <text class="d-sub" x="115" y="126" text-anchor="middle">Lin C, Bo A, Kim B</text>
  <path class="d-edge" d="M 214 100 L 260 100" marker-end="url(#b02q5-python-arrow)"/>
  <rect class="d-box" x="266" y="40" width="190" height="120" rx="10"/>
  <text class="d-text" x="361" y="72" text-anchor="middle">pass 1: by name</text>
  <text class="d-sub" x="361" y="100" text-anchor="middle">Ana, Bo, Dev</text>
  <text class="d-sub" x="361" y="126" text-anchor="middle">Kim, Lin, Raj</text>
  <path class="d-edge-accent" d="M 460 100 L 506 100" marker-end="url(#b02q5-python-arrow)"/>
  <rect class="d-box-accent" x="512" y="40" width="190" height="120" rx="10"/>
  <text class="d-text d-accent" x="607" y="72" text-anchor="middle">pass 2: by grade</text>
  <text class="d-sub" x="607" y="100" text-anchor="middle">A: Ana, Bo</text>
  <text class="d-sub" x="607" y="126" text-anchor="middle">B: Dev, Kim, Raj</text>
</svg>

This is how clicking column headers in a table works: each click is one stable sort, and earlier clicks become tie-breakers. In code it is usually simpler to do one sort with a **composite key** (grade, then name), and Example 1 checks that both give the same result. Stability also matters for:

- **Leaderboards and search results with ties:** equal scores stay in a predictable order (for example, whoever scored first), so the page does not reshuffle on every refresh.
- **Radix sort:** least-significant-digit radix sort sorts by one digit at a time and is correct only because each per-digit pass (usually counting sort) is stable.

📌 **Interview term: Composite key** — sorting by a tuple of fields, comparing the second only when the first is equal; the one-pass alternative to stable multi-pass sorting.

## 4. Which Algorithms Are Stable

| Algorithm | Stable? | Time (worst) | Why |
| :--- | :--- | :--- | :--- |
| Insertion sort | Yes | O(n²) | an item only moves past strictly greater ones |
| Bubble sort | Yes | O(n²) | only swaps adjacent items that are out of order |
| Merge sort | Yes | O(n log n) | on ties the merge takes from the left half first |
| Counting sort | Yes, as usually written | O(n + k) | fills output positions from the end in input order |
| Timsort | Yes | O(n log n) | a merge sort that also uses insertion sort on short runs |
| Selection sort | No | O(n²) | the long-distance swap can jump an item over its equal |
| Quicksort | No (typical in-place versions) | O(n²) | partitioning swaps items across the array |
| Heapsort | No | O(n log n) | the heap reorders equal items |

The word to remember is **"usually"**: stability is a property of an implementation. Merge sort becomes unstable if the merge takes from the right on ties, and quicksort can be made stable with extra memory. For how the main algorithms work, see [merge sort and quicksort](/interview-question/how-do-merge-sort-and-quicksort-work) and [the comparison of common sorting algorithms](/interview-question/compare-common-sorting-algorithms).

## 5. Making Any Sort Stable

If you only have an unstable sort, make every key unique by adding the **original index** as a final tie-breaker: compare (key, index) instead of key. Equal keys are then ordered by index, which is exactly the input order. Example 2 does this to selection sort and gets the stable result. It costs O(n) extra memory for the indices.

📌 **Interview term: Index tie-breaker (decorate-sort-undecorate)** — attaching each item's original position to its key so an unstable sort produces the stable order.

## 6. In Python: Every Sort Is Stable

Python guarantees it. The \`list.sort\` docstring (Python 3.13) says the sort is "in-place (i.e. the list itself is modified) and stable (i.e. the order of two equal elements is maintained)", and the official [Sorting HOW TO](https://docs.python.org/3/howto/sorting.html) states "Sorts are guaranteed to be stable" and recommends multi-pass sorting for exactly that reason. \`sorted()\` uses the same algorithm, Timsort, which Tim Peters wrote for Python (Java later ported it, as the OpenJDK issue [JDK-6804124](https://bugs.openjdk.org/browse/JDK-6804124) describes).

~~~python
students = [("Dev", "B"), ("Ana", "A"), ("Raj", "B"), ("Lin", "C"), ("Bo", "A"), ("Kim", "B")]

by_grade = sorted(students, key=lambda s: s[1])          # ties stay in input order
two_pass = sorted(sorted(students, key=lambda s: s[0]),  # least important key first
                  key=lambda s: s[1])
one_pass = sorted(students, key=lambda s: (s[1], s[0]))  # tuple key: same result
~~~

* **\`key=\` is computed once per item** and is usually faster and clearer than a comparison function; \`functools.cmp_to_key\` exists for when you really need a comparator.
* **\`reverse=True\` keeps stability.** Example 1 sorts by grade descending and the B students stay Dev, Raj, Kim, their input order. Reversing an ascending result with \`[::-1]\` would reverse the ties too.
* **Mixed descending and ascending keys:** negate a numeric key (\`key=lambda s: (-s.score, s.name)\`) or do two stable passes with different \`reverse\` flags.
* **\`sorted()\` returns a new list; \`list.sort()\` sorts in place and returns \`None\`.**

## 7. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`python3 main.py\`; the blocks are the exact standard output.

**Example 1 — the built-in stable sort: one key, two passes, a composite key, and descending**

~~~text
input:            Dev:B Ana:A Raj:B Lin:C Bo:A Kim:B
by grade:         Ana:A Bo:A Dev:B Raj:B Kim:B Lin:C
by name:          Ana:A Bo:A Dev:B Kim:B Lin:C Raj:B
name, then grade: Ana:A Bo:A Dev:B Kim:B Raj:B Lin:C
tuple key gives the same order: true
grade descending: Lin:C Dev:B Raj:B Kim:B Ana:A Bo:A
~~~

**Example 2 — hand-written insertion sort (stable) vs selection sort (unstable), and the index fix**

~~~text
input:              5-hearts 3-spades 5-spades 2-clubs
insertion sort:     2-clubs 3-spades 5-hearts 5-spades
  stable? true
selection sort:     2-clubs 3-spades 5-spades 5-hearts
  stable? false
selection + index:  2-clubs 3-spades 5-hearts 5-spades
  stable? true
~~~

**Reading the output:** in Example 1 the B students come out Dev, Raj, Kim when sorted by grade alone (their input order) and Dev, Kim, Raj after the name pass, which is exactly the composite-key result. In Example 2 selection sort put \`5-spades\` before \`5-hearts\`, the reverse of the input, and adding the original index as a tie-breaker fixed it.

## 8. Complexity of the Example Sorts

| Sort in the examples | Time | Extra space | Stable? |
| :--- | :--- | :--- | :--- |
| Insertion sort (Example 2) | O(n²) worst, O(n) if nearly sorted | O(1) | yes |
| Selection sort (Example 2) | O(n²) always | O(1) | no |
| Selection sort + index tie-breaker | O(n²) | O(n) for the indices | yes |

## 9. Edge Cases to Mention

- **All keys distinct:** stability has no visible effect.
- **All keys equal:** a stable sort must return the input unchanged; an unstable one may permute it completely.
- **Descending order:** reversing the comparison keeps stability; reversing the *output* of an ascending stable sort does not (ties come out reversed).
- **Inconsistent comparators:** a comparator that is not a consistent ordering (for example one that returns a boolean, or uses \`<=\`) breaks sorting altogether, stable or not.

## 10. Common Pitfalls

- **Writing \`x = my_list.sort()\`.** \`sort()\` returns \`None\`; use \`sorted(my_list)\` for a new list.
- **Doing multi-pass sorts in the wrong order.** Sort by the least important key first; the last pass is the primary key.
- **Reversing the output instead of using \`reverse=True\`.** \`sorted(...)[::-1]\` also reverses the order of ties.
- **Assuming a hand-written sort is stable because Python's is.** A selection sort or a quicksort you write yourself is not, as Example 2 shows.
- **Sorting mixed types.** Python 3 refuses to compare unrelated types (\`sorted([1, "a"])\` raises \`TypeError\`); give a key that maps everything to comparable values.
- **Using \`cmp_to_key\` with a comparator that returns a bool.** It must return a negative, zero or positive number.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A sort is stable if items with equal keys keep their original relative order; it only matters when items carry more than the key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it matters:</strong> <span style="color:#f0e2c8;">It makes multi-key sorting in passes work: sort by the secondary key, then stably by the primary key, and ties keep the secondary order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Which are stable:</strong> <span style="color:#f0e2c8;">Insertion, bubble, merge, counting sort and Timsort are stable; selection, typical quicksort and heapsort are not.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. In Python:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.sort()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted()</code> are guaranteed stable (Timsort), so a tuple key or several passes both work, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reverse=True</code> keeps ties in input order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Making a sort stable:</strong> <span style="color:#f0e2c8;">Add the original index as a final tie-breaker, sorting on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(key, index)</code>; it costs O(n) extra space.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is selection sort unstable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It swaps the minimum into position i, and that long-distance swap can jump the item at i over an equal item. In Example 2, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">5 hearts</code> was swapped behind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">5 spades</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you sort by score descending, then name ascending?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One pass with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">key=lambda s: (-s.score, s.name)</code>, or two stable passes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort(key=name)</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort(key=score, reverse=True)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reverse=True</code> break stability?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It sorts as if each comparison were reversed, so equal items keep their input order; Example 1 shows the B students staying Dev, Raj, Kim.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is stability relevant for a list of ints?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Equal ints are indistinguishable, so any correct sort gives the same output. Stability matters for records sorted by one field.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What sorting algorithm does Python use?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Timsort, a stable merge sort that finds existing runs and uses insertion sort on short ones: O(n log n) worst case and O(n) on already sorted input.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Stable sort** | Keeps equal-key items in their original relative order |
| **Sort key** | The value the sort compares |
| **Ties** | Items whose keys compare equal |
| **Composite key** | Sorting by a tuple of fields, one pass instead of several |
| **Index tie-breaker** | Adding the original position to the key to force stability |
| **key function** | Python key= argument: computed once per item, the sort compares the results |

---
**Conclusion:** A stable sort keeps items with equal keys in the order they arrived; an unstable one may shuffle them, and both are "correctly sorted". The difference matters whenever items carry more than the key: multi-pass sorts, tables sorted by several columns, leaderboards with ties, and radix sort all rely on it. Insertion, merge, counting sort and Timsort are stable; selection, typical quicksort and heapsort are not, and any sort can be made stable with an index tie-breaker. In Python you rarely need the trick: \`sorted()\` and \`list.sort()\` are guaranteed stable, and Example 1 showed ties staying in input order even with \`reverse=True\`.`,
        examples: [
          {
            label: "The built-in stable sort with ties and multiple keys",
            code: `# Python's sort is stable: records with equal keys keep their input order.
# That lets you sort by several keys in passes: least important key first.

students = [("Dev", "B"), ("Ana", "A"), ("Raj", "B"), ("Lin", "C"), ("Bo", "A"), ("Kim", "B")]

def show(label, rows):
    print(label + " ".join(name + ":" + grade for name, grade in rows))

show("input:            ", students)

by_grade = sorted(students, key=lambda s: s[1])         # ties: Dev, Raj, Kim stay in input order
show("by grade:         ", by_grade)

by_name = sorted(students, key=lambda s: s[0])
show("by name:          ", by_name)

two_pass = sorted(by_name, key=lambda s: s[1])          # stable pass 2 keeps the name order inside each grade
show("name, then grade: ", two_pass)

one_pass = sorted(students, key=lambda s: (s[1], s[0])) # same result with a tuple key
print("tuple key gives the same order: " + str(one_pass == two_pass).lower())

# reverse=True still keeps equal records in their original order.
show("grade descending: ", sorted(students, key=lambda s: s[1], reverse=True))`,
          },
          {
            label: "Insertion sort vs selection sort: stable vs unstable",
            code: `# Stability is a property of the algorithm. Two hand-written sorts on the same cards:
# insertion sort (stable) and selection sort (unstable), plus the fix for an unstable one.

cards = [(5, "hearts"), (3, "spades"), (5, "spades"), (2, "clubs")]

def show(label, rows):
    print(label + " ".join(str(r) + "-" + s for r, s in rows))

def is_stable(original, result):
    # For equal ranks, the original positions must still be increasing.
    pos = {card: i for i, card in enumerate(original)}
    return all(not (a[0] == b[0] and pos[a] > pos[b]) for a, b in zip(result, result[1:]))

def insertion_sort(items, key):
    a = list(items)
    for i in range(1, len(a)):
        cur, j = a[i], i - 1
        while j >= 0 and key(a[j]) > key(cur):   # strict >: never jump over an equal key
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = cur
    return a

def selection_sort(items, key):
    a = list(items)
    for i in range(len(a)):
        m = i
        for j in range(i + 1, len(a)):
            if key(a[j]) < key(a[m]):
                m = j
        a[i], a[m] = a[m], a[i]                  # the long-distance swap breaks stability
    return a

show("input:              ", cards)
r = insertion_sort(cards, key=lambda c: c[0])
show("insertion sort:     ", r)
print("  stable? " + str(is_stable(cards, r)).lower())
r = selection_sort(cards, key=lambda c: c[0])
show("selection sort:     ", r)
print("  stable? " + str(is_stable(cards, r)).lower())

# Fix: make every key unique by adding the original index as a tie-breaker.
indexed = list(enumerate(cards))
r = [c for _, c in selection_sort(indexed, key=lambda ic: (ic[1][0], ic[0]))]
show("selection + index:  ", r)
print("  stable? " + str(is_stable(cards, r)).lower())`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"What does it mean for a sorting algorithm to be stable? Give an example where it matters, tell me which common algorithms are stable, and whether the built-in sort in JavaScript is."

**What a strong answer should cover:**
- The definition: items with equal keys keep their input order; it only matters when items carry more than the key.
- Why it matters: multi-key sorting in passes (least important key first), tables with several sort columns, ties in rankings, radix sort.
- Stable algorithms (insertion, merge, counting, Timsort) versus usually unstable ones (selection, quicksort, heapsort).
- How to make any sort stable: the original index as a tie-breaker, or a full composite key.
- JavaScript specifics: \`Array.prototype.sort\` must be stable since ES2019 (V8 since v7.0), it sorts in place and compares as strings by default, the comparator must return a number (not a boolean), and \`toSorted()\` returns a sorted copy.

**Code / implementation expected:** Optional — a multi-key sort with the JavaScript built-in, or a short demonstration of an unstable sort.`,
        answer: `**Target Audience:** Beginners who know what sorting is and want to understand the guarantees behind it.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`node main.js\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A teacher has the class list in alphabetical order. She wants the list grouped by grade, A first, but **still alphabetical inside each grade**, so she can find a name quickly. She clicks "sort by grade" in her spreadsheet. If the spreadsheet's sort is **stable**, she gets exactly what she wanted: within the A students, Ana is still before Bo, because that is the order they were in before. If the sort is **unstable**, the A students might come out as Bo, Ana, and the B students in some random-looking order, even though every grade group is correct.

Both results are "sorted by grade". Stability is the extra promise about what happens to the items the sort considers **equal**. It sounds like a detail until you build a multi-column table, a leaderboard with ties, or a sort that runs in several passes.

## 2. The Definition

A sorting algorithm is **stable** if, whenever two items have **equal keys**, they appear in the output in the **same relative order** as in the input. An unstable algorithm may reorder them.

📌 **Interview term: Stable sort** — a sort that keeps items with equal keys in their original relative order.

📌 **Interview term: Sort key** — the value the sort compares (here the card's rank or the student's grade). Items can be different but have equal keys.

📌 **Interview term: Ties** — items whose keys compare equal. Stability only says something about ties; it changes nothing when all keys are distinct.

Cards sorted by rank show the difference. \`5 hearts\` came before \`5 spades\` in the input:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 310" role="img" aria-label="Sorting cards by rank: the stable result keeps 5 hearts before 5 spades as in the input; the unstable result swaps them">
  <text class="d-text" x="70" y="64" text-anchor="middle">input</text>
  <rect class="d-box-accent" x="150" y="30" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="205" y="54" text-anchor="middle">5 hearts</text>
  <text class="d-sub" x="205" y="74" text-anchor="middle">input pos 0</text>
  <rect class="d-box" x="290" y="30" width="110" height="56" rx="8"/>
  <text class="d-text" x="345" y="54" text-anchor="middle">3 spades</text>
  <text class="d-sub" x="345" y="74" text-anchor="middle">input pos 1</text>
  <rect class="d-box-accent" x="430" y="30" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="485" y="54" text-anchor="middle">5 spades</text>
  <text class="d-sub" x="485" y="74" text-anchor="middle">input pos 2</text>
  <rect class="d-box" x="570" y="30" width="110" height="56" rx="8"/>
  <text class="d-text" x="625" y="54" text-anchor="middle">2 clubs</text>
  <text class="d-sub" x="625" y="74" text-anchor="middle">input pos 3</text>
  <text class="d-text" x="70" y="164" text-anchor="middle">stable</text>
  <rect class="d-box" x="150" y="130" width="110" height="56" rx="8"/>
  <text class="d-text" x="205" y="154" text-anchor="middle">2 clubs</text>
  <text class="d-sub" x="205" y="174" text-anchor="middle">pos 3</text>
  <rect class="d-box" x="290" y="130" width="110" height="56" rx="8"/>
  <text class="d-text" x="345" y="154" text-anchor="middle">3 spades</text>
  <text class="d-sub" x="345" y="174" text-anchor="middle">pos 1</text>
  <rect class="d-box-accent" x="430" y="130" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="485" y="154" text-anchor="middle">5 hearts</text>
  <text class="d-sub" x="485" y="174" text-anchor="middle">pos 0</text>
  <rect class="d-box-accent" x="570" y="130" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="625" y="154" text-anchor="middle">5 spades</text>
  <text class="d-sub" x="625" y="174" text-anchor="middle">pos 2</text>
  <text class="d-text" x="70" y="264" text-anchor="middle">unstable</text>
  <rect class="d-box" x="150" y="230" width="110" height="56" rx="8"/>
  <text class="d-text" x="205" y="254" text-anchor="middle">2 clubs</text>
  <text class="d-sub" x="205" y="274" text-anchor="middle">pos 3</text>
  <rect class="d-box" x="290" y="230" width="110" height="56" rx="8"/>
  <text class="d-text" x="345" y="254" text-anchor="middle">3 spades</text>
  <text class="d-sub" x="345" y="274" text-anchor="middle">pos 1</text>
  <rect class="d-box-accent" x="430" y="230" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="485" y="254" text-anchor="middle">5 spades</text>
  <text class="d-sub" x="485" y="274" text-anchor="middle">pos 2</text>
  <rect class="d-box-accent" x="570" y="230" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="625" y="254" text-anchor="middle">5 hearts</text>
  <text class="d-sub" x="625" y="274" text-anchor="middle">pos 0</text>
</svg>

Both outputs are correctly sorted by rank. Only the stable one keeps \`5 hearts\` (input position 0) before \`5 spades\` (input position 2). Example 2 produces exactly these two rows with a hand-written insertion sort (stable) and selection sort (unstable).

Stability only matters when items carry more than their key. Sorting plain integers, two equal 5s are indistinguishable, so stable and unstable give identical results.

## 3. Why It Matters: Sorting by Several Keys

The main practical use is **multi-key sorting in passes**. To sort by grade, and by name inside each grade, sort by the **least important key first** and then by the more important key with a stable sort. The second pass keeps the first pass's order inside each group:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Two-pass sort: sort by name first, then stably by grade; inside each grade the names stay alphabetical">
  <defs>
    <marker id="b02q5-javascript-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="190" height="120" rx="10"/>
  <text class="d-text" x="115" y="72" text-anchor="middle">input</text>
  <text class="d-sub" x="115" y="100" text-anchor="middle">Dev B, Ana A, Raj B</text>
  <text class="d-sub" x="115" y="126" text-anchor="middle">Lin C, Bo A, Kim B</text>
  <path class="d-edge" d="M 214 100 L 260 100" marker-end="url(#b02q5-javascript-arrow)"/>
  <rect class="d-box" x="266" y="40" width="190" height="120" rx="10"/>
  <text class="d-text" x="361" y="72" text-anchor="middle">pass 1: by name</text>
  <text class="d-sub" x="361" y="100" text-anchor="middle">Ana, Bo, Dev</text>
  <text class="d-sub" x="361" y="126" text-anchor="middle">Kim, Lin, Raj</text>
  <path class="d-edge-accent" d="M 460 100 L 506 100" marker-end="url(#b02q5-javascript-arrow)"/>
  <rect class="d-box-accent" x="512" y="40" width="190" height="120" rx="10"/>
  <text class="d-text d-accent" x="607" y="72" text-anchor="middle">pass 2: by grade</text>
  <text class="d-sub" x="607" y="100" text-anchor="middle">A: Ana, Bo</text>
  <text class="d-sub" x="607" y="126" text-anchor="middle">B: Dev, Kim, Raj</text>
</svg>

This is how clicking column headers in a table works: each click is one stable sort, and earlier clicks become tie-breakers. In code it is usually simpler to do one sort with a **composite key** (grade, then name), and Example 1 checks that both give the same result. Stability also matters for:

- **Leaderboards and search results with ties:** equal scores stay in a predictable order (for example, whoever scored first), so the page does not reshuffle on every refresh.
- **Radix sort:** least-significant-digit radix sort sorts by one digit at a time and is correct only because each per-digit pass (usually counting sort) is stable.

📌 **Interview term: Composite key** — sorting by a tuple of fields, comparing the second only when the first is equal; the one-pass alternative to stable multi-pass sorting.

## 4. Which Algorithms Are Stable

| Algorithm | Stable? | Time (worst) | Why |
| :--- | :--- | :--- | :--- |
| Insertion sort | Yes | O(n²) | an item only moves past strictly greater ones |
| Bubble sort | Yes | O(n²) | only swaps adjacent items that are out of order |
| Merge sort | Yes | O(n log n) | on ties the merge takes from the left half first |
| Counting sort | Yes, as usually written | O(n + k) | fills output positions from the end in input order |
| Timsort | Yes | O(n log n) | a merge sort that also uses insertion sort on short runs |
| Selection sort | No | O(n²) | the long-distance swap can jump an item over its equal |
| Quicksort | No (typical in-place versions) | O(n²) | partitioning swaps items across the array |
| Heapsort | No | O(n log n) | the heap reorders equal items |

The word to remember is **"usually"**: stability is a property of an implementation. Merge sort becomes unstable if the merge takes from the right on ties, and quicksort can be made stable with extra memory. For how the main algorithms work, see [merge sort and quicksort](/interview-question/how-do-merge-sort-and-quicksort-work) and [the comparison of common sorting algorithms](/interview-question/compare-common-sorting-algorithms).

## 5. Making Any Sort Stable

If you only have an unstable sort, make every key unique by adding the **original index** as a final tie-breaker: compare (key, index) instead of key. Equal keys are then ordered by index, which is exactly the input order. Example 2 does this to selection sort and gets the stable result. It costs O(n) extra memory for the indices.

📌 **Interview term: Index tie-breaker (decorate-sort-undecorate)** — attaching each item's original position to its key so an unstable sort produces the stable order.

## 6. In JavaScript: Stable Since ES2019

Older engines used unstable sorts for larger arrays. The V8 team's post [Getting things sorted in V8](https://v8.dev/blog/array-sort) describes how \`Array.prototype.sort\` became stable in V8 v7.0 / Chrome 70, and the ECMAScript 2019 edition made stability a requirement for every engine (see V8's [Stable Array.prototype.sort](https://v8.dev/features/stable-sort) and [InfoQ's ES2019 summary](https://www.infoq.com/news/2019/03/ES2019-feature-set-released)). Node 22, used for this doc, is far beyond both.

~~~javascript
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const byGrade = [...students].sort((a, b) => cmp(a[1], b[1]));               // ties keep input order
const twoPass = [...students].sort((a, b) => cmp(a[0], b[0]))
                             .sort((a, b) => cmp(a[1], b[1]));               // name first, then grade
const onePass = [...students].sort((a, b) => cmp(a[1], b[1]) || cmp(a[0], b[0]));
~~~

* **The comparator must return a number.** Negative means a goes first, positive means b goes first, zero means they are equal (and stability keeps their order). \`cmp(a, b) || cmp2(a, b)\` chains keys because 0 is falsy.
* **A boolean comparator is a real bug.** \`(a, b) => a > b\` returns \`true\`/\`false\`, which become 1 and 0, never negative. In Node 22, \`[5, 1, 4, 2, 3].sort((a, b) => a > b)\` returned \`[5, 1, 4, 2, 3]\`, unchanged.
* **The default sort compares strings.** \`[10, 9, 1, 100].sort()\` returned \`[1, 10, 100, 9]\`; use \`(a, b) => a - b\` for numbers.
* **\`sort()\` mutates the array** and returns the same array. Copy first (\`[...arr]\`), or use \`toSorted()\` (ES2023, available in Node 22), which returns a sorted copy and leaves the original alone.
* For locale-aware string order use \`a.localeCompare(b)\` or an \`Intl.Collator\`.

## 7. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`node main.js\`; the blocks are the exact standard output.

**Example 1 — the built-in stable sort: one key, two passes, a composite key, and descending**

~~~text
input:            Dev:B Ana:A Raj:B Lin:C Bo:A Kim:B
by grade:         Ana:A Bo:A Dev:B Raj:B Kim:B Lin:C
by name:          Ana:A Bo:A Dev:B Kim:B Lin:C Raj:B
name, then grade: Ana:A Bo:A Dev:B Kim:B Raj:B Lin:C
tuple key gives the same order: true
grade descending: Lin:C Dev:B Raj:B Kim:B Ana:A Bo:A
~~~

**Example 2 — hand-written insertion sort (stable) vs selection sort (unstable), and the index fix**

~~~text
input:              5-hearts 3-spades 5-spades 2-clubs
insertion sort:     2-clubs 3-spades 5-hearts 5-spades
  stable? true
selection sort:     2-clubs 3-spades 5-spades 5-hearts
  stable? false
selection + index:  2-clubs 3-spades 5-hearts 5-spades
  stable? true
~~~

**Reading the output:** in Example 1 the B students come out Dev, Raj, Kim when sorted by grade alone (their input order) and Dev, Kim, Raj after the name pass, which is exactly the composite-key result. In Example 2 selection sort put \`5-spades\` before \`5-hearts\`, the reverse of the input, and adding the original index as a tie-breaker fixed it.

## 8. Complexity of the Example Sorts

| Sort in the examples | Time | Extra space | Stable? |
| :--- | :--- | :--- | :--- |
| Insertion sort (Example 2) | O(n²) worst, O(n) if nearly sorted | O(1) | yes |
| Selection sort (Example 2) | O(n²) always | O(1) | no |
| Selection sort + index tie-breaker | O(n²) | O(n) for the indices | yes |

## 9. Edge Cases to Mention

- **All keys distinct:** stability has no visible effect.
- **All keys equal:** a stable sort must return the input unchanged; an unstable one may permute it completely.
- **Descending order:** reversing the comparison keeps stability; reversing the *output* of an ascending stable sort does not (ties come out reversed).
- **Inconsistent comparators:** a comparator that is not a consistent ordering (for example one that returns a boolean, or uses \`<=\`) breaks sorting altogether, stable or not.

## 10. Common Pitfalls

- **Returning a boolean from the comparator.** \`a > b\` never returns a negative number, so the sort silently fails; return \`a - b\` or -1/0/1.
- **Calling \`sort()\` on numbers without a comparator.** It sorts by string value: 100 before 9.
- **Forgetting that \`sort()\` mutates.** Sorting a shared array (props, state, a function argument) changes it for everyone; copy or use \`toSorted()\`.
- **Doing multi-pass sorts in the wrong order.** Sort by the least important key first; the last pass is the primary key.
- **Assuming a hand-written sort is stable because the built-in is.** Example 2's selection sort is not.
- **Relying on stability in very old engines.** Before ES2019 some engines were unstable for large arrays; if you must support them, add an index tie-breaker.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A sort is stable if items with equal keys keep their original relative order; it only matters when items carry more than the key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it matters:</strong> <span style="color:#f0e2c8;">It makes multi-key sorting in passes work: sort by the secondary key, then stably by the primary key, and ties keep the secondary order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Which are stable:</strong> <span style="color:#f0e2c8;">Insertion, bubble, merge, counting sort and Timsort are stable; selection, typical quicksort and heapsort are not.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. In JavaScript:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.prototype.sort</code> must be stable since ES2019 (V8 since v7.0); I pass a comparator that returns a number, and chain keys with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">||</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JS traps:</strong> <span style="color:#f0e2c8;">The default sort compares strings, a boolean comparator silently fails, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort()</code> mutates, so I copy first or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSorted()</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Was JavaScript sort always stable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. V8 used an unstable algorithm for larger arrays until v7.0 (Chrome 70), and ES2019 made stability a requirement for all engines.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a &gt; b</code> wrong?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A comparator must return a negative, zero or positive number. A boolean is 1 or 0, never negative; in Node 22 it left <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[5, 1, 4, 2, 3]</code> unsorted.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you sort by score descending, then name?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr.sort((a, b) =&gt; b.score - a.score || a.name.localeCompare(b.name))</code>: the name comparison only runs when the scores are equal.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is selection sort unstable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It swaps the minimum into position i, and that long-distance swap can jump an item over an equal one. In Example 2, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">5 hearts</code> ended up behind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">5 spades</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sort()</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">toSorted()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort()</code> sorts in place and returns the same array; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toSorted()</code> (ES2023) returns a new sorted array, which is safer for shared data such as React state.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Stable sort** | Keeps equal-key items in their original relative order |
| **Sort key** | The value the sort compares |
| **Ties** | Items whose keys compare equal |
| **Composite key** | Sorting by a tuple of fields, one pass instead of several |
| **Index tie-breaker** | Adding the original position to the key to force stability |
| **Comparator** | A function (a, b) returning negative, zero or positive to order two items |

---
**Conclusion:** A stable sort keeps items with equal keys in the order they arrived; an unstable one may shuffle them, and both are "correctly sorted". The difference matters whenever items carry more than the key: multi-pass sorts, tables sorted by several columns, leaderboards with ties, and radix sort all rely on it. Insertion, merge, counting sort and Timsort are stable; selection, typical quicksort and heapsort are not, and any sort can be made stable with an index tie-breaker. In JavaScript, \`Array.prototype.sort\` has been required to be stable since ES2019, so the real risks are elsewhere: a comparator that returns a boolean, the string-based default, and forgetting that \`sort()\` mutates.`,
        examples: [
          {
            label: "The built-in stable sort with ties and multiple keys",
            code: `// Array.prototype.sort is stable (required since ES2019): records with equal keys
// keep their input order. That lets you sort by several keys in passes.

const students = [['Dev', 'B'], ['Ana', 'A'], ['Raj', 'B'], ['Lin', 'C'], ['Bo', 'A'], ['Kim', 'B']];

function show(label, rows) {
  console.log(label + rows.map(([name, grade]) => name + ':' + grade).join(' '));
}
// A comparator must return a negative number, zero or a positive number.
// Returning a boolean (a < b) is a classic bug: false and true become 0 and 1, never negative.
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

show('input:            ', students);

const byGrade = [...students].sort((a, b) => cmp(a[1], b[1]));   // copy first: sort() mutates
show('by grade:         ', byGrade);

const byName = [...students].sort((a, b) => cmp(a[0], b[0]));
show('by name:          ', byName);

const twoPass = [...byName].sort((a, b) => cmp(a[1], b[1]));    // pass 2 keeps name order inside each grade
show('name, then grade: ', twoPass);

const onePass = [...students].sort((a, b) => cmp(a[1], b[1]) || cmp(a[0], b[0]));
console.log('tuple key gives the same order: ' + (onePass.join() === twoPass.join()));

// Descending by flipping the comparator: equal records still keep their original order.
show('grade descending: ', [...students].sort((a, b) => cmp(b[1], a[1])));`,
          },
          {
            label: "Insertion sort vs selection sort: stable vs unstable",
            code: `// Stability is a property of the algorithm. Two hand-written sorts on the same cards:
// insertion sort (stable) and selection sort (unstable), plus the fix for an unstable one.

const cards = [[5, 'hearts'], [3, 'spades'], [5, 'spades'], [2, 'clubs']];

function show(label, rows) {
  console.log(label + rows.map(([r, s]) => r + '-' + s).join(' '));
}

function isStable(original, result) {
  // For equal ranks, the original positions must still be increasing.
  for (let i = 0; i + 1 < result.length; i++) {
    if (result[i][0] === result[i + 1][0] && original.indexOf(result[i]) > original.indexOf(result[i + 1])) return false;
  }
  return true;
}

// cmp(a, b) < 0 means a goes first.
function insertionSort(items, cmp) {
  const a = [...items];
  for (let i = 1; i < a.length; i++) {
    const cur = a[i];
    let j = i - 1;
    while (j >= 0 && cmp(a[j], cur) > 0) {   // strict: never jump over an equal key
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = cur;
  }
  return a;
}

function selectionSort(items, cmp) {
  const a = [...items];
  for (let i = 0; i < a.length; i++) {
    let m = i;
    for (let j = i + 1; j < a.length; j++) if (cmp(a[j], a[m]) < 0) m = j;
    [a[i], a[m]] = [a[m], a[i]];               // the long-distance swap breaks stability
  }
  return a;
}

const byRank = (x, y) => x[0] - y[0];
show('input:              ', cards);
let r = insertionSort(cards, byRank);
show('insertion sort:     ', r);
console.log('  stable? ' + isStable(cards, r));
r = selectionSort(cards, byRank);
show('selection sort:     ', r);
console.log('  stable? ' + isStable(cards, r));

// Fix: make every key unique by adding the original index as a tie-breaker.
const indexed = cards.map((c, i) => [i, c]);
r = selectionSort(indexed, (x, y) => x[1][0] - y[1][0] || x[0] - y[0]).map(([, c]) => c);
show('selection + index:  ', r);
console.log('  stable? ' + isStable(cards, r));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"What does it mean for a sorting algorithm to be stable? Give an example where it matters, tell me which common algorithms are stable, and whether the built-in sort in Java is."

**What a strong answer should cover:**
- The definition: items with equal keys keep their input order; it only matters when items carry more than the key.
- Why it matters: multi-key sorting in passes (least important key first), tables with several sort columns, ties in rankings, radix sort.
- Stable algorithms (insertion, merge, counting, Timsort) versus usually unstable ones (selection, quicksort, heapsort).
- How to make any sort stable: the original index as a tie-breaker, or a full composite key.
- Java specifics: \`Collections.sort\`, \`List.sort\` and \`Arrays.sort(Object[])\` are stable (a TimSort port), \`Arrays.sort(int[])\` uses Dual-Pivot Quicksort where stability cannot be observed, and \`Comparator.comparing(...).thenComparing(...)\` builds composite keys.

**Code / implementation expected:** Optional — a multi-key sort with the Java built-in, or a short demonstration of an unstable sort.`,
        answer: `**Target Audience:** Beginners who know what sorting is and want to understand the guarantees behind it.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`javac Main.java && java Main\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A teacher has the class list in alphabetical order. She wants the list grouped by grade, A first, but **still alphabetical inside each grade**, so she can find a name quickly. She clicks "sort by grade" in her spreadsheet. If the spreadsheet's sort is **stable**, she gets exactly what she wanted: within the A students, Ana is still before Bo, because that is the order they were in before. If the sort is **unstable**, the A students might come out as Bo, Ana, and the B students in some random-looking order, even though every grade group is correct.

Both results are "sorted by grade". Stability is the extra promise about what happens to the items the sort considers **equal**. It sounds like a detail until you build a multi-column table, a leaderboard with ties, or a sort that runs in several passes.

## 2. The Definition

A sorting algorithm is **stable** if, whenever two items have **equal keys**, they appear in the output in the **same relative order** as in the input. An unstable algorithm may reorder them.

📌 **Interview term: Stable sort** — a sort that keeps items with equal keys in their original relative order.

📌 **Interview term: Sort key** — the value the sort compares (here the card's rank or the student's grade). Items can be different but have equal keys.

📌 **Interview term: Ties** — items whose keys compare equal. Stability only says something about ties; it changes nothing when all keys are distinct.

Cards sorted by rank show the difference. \`5 hearts\` came before \`5 spades\` in the input:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 310" role="img" aria-label="Sorting cards by rank: the stable result keeps 5 hearts before 5 spades as in the input; the unstable result swaps them">
  <text class="d-text" x="70" y="64" text-anchor="middle">input</text>
  <rect class="d-box-accent" x="150" y="30" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="205" y="54" text-anchor="middle">5 hearts</text>
  <text class="d-sub" x="205" y="74" text-anchor="middle">input pos 0</text>
  <rect class="d-box" x="290" y="30" width="110" height="56" rx="8"/>
  <text class="d-text" x="345" y="54" text-anchor="middle">3 spades</text>
  <text class="d-sub" x="345" y="74" text-anchor="middle">input pos 1</text>
  <rect class="d-box-accent" x="430" y="30" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="485" y="54" text-anchor="middle">5 spades</text>
  <text class="d-sub" x="485" y="74" text-anchor="middle">input pos 2</text>
  <rect class="d-box" x="570" y="30" width="110" height="56" rx="8"/>
  <text class="d-text" x="625" y="54" text-anchor="middle">2 clubs</text>
  <text class="d-sub" x="625" y="74" text-anchor="middle">input pos 3</text>
  <text class="d-text" x="70" y="164" text-anchor="middle">stable</text>
  <rect class="d-box" x="150" y="130" width="110" height="56" rx="8"/>
  <text class="d-text" x="205" y="154" text-anchor="middle">2 clubs</text>
  <text class="d-sub" x="205" y="174" text-anchor="middle">pos 3</text>
  <rect class="d-box" x="290" y="130" width="110" height="56" rx="8"/>
  <text class="d-text" x="345" y="154" text-anchor="middle">3 spades</text>
  <text class="d-sub" x="345" y="174" text-anchor="middle">pos 1</text>
  <rect class="d-box-accent" x="430" y="130" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="485" y="154" text-anchor="middle">5 hearts</text>
  <text class="d-sub" x="485" y="174" text-anchor="middle">pos 0</text>
  <rect class="d-box-accent" x="570" y="130" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="625" y="154" text-anchor="middle">5 spades</text>
  <text class="d-sub" x="625" y="174" text-anchor="middle">pos 2</text>
  <text class="d-text" x="70" y="264" text-anchor="middle">unstable</text>
  <rect class="d-box" x="150" y="230" width="110" height="56" rx="8"/>
  <text class="d-text" x="205" y="254" text-anchor="middle">2 clubs</text>
  <text class="d-sub" x="205" y="274" text-anchor="middle">pos 3</text>
  <rect class="d-box" x="290" y="230" width="110" height="56" rx="8"/>
  <text class="d-text" x="345" y="254" text-anchor="middle">3 spades</text>
  <text class="d-sub" x="345" y="274" text-anchor="middle">pos 1</text>
  <rect class="d-box-accent" x="430" y="230" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="485" y="254" text-anchor="middle">5 spades</text>
  <text class="d-sub" x="485" y="274" text-anchor="middle">pos 2</text>
  <rect class="d-box-accent" x="570" y="230" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="625" y="254" text-anchor="middle">5 hearts</text>
  <text class="d-sub" x="625" y="274" text-anchor="middle">pos 0</text>
</svg>

Both outputs are correctly sorted by rank. Only the stable one keeps \`5 hearts\` (input position 0) before \`5 spades\` (input position 2). Example 2 produces exactly these two rows with a hand-written insertion sort (stable) and selection sort (unstable).

Stability only matters when items carry more than their key. Sorting plain integers, two equal 5s are indistinguishable, so stable and unstable give identical results.

## 3. Why It Matters: Sorting by Several Keys

The main practical use is **multi-key sorting in passes**. To sort by grade, and by name inside each grade, sort by the **least important key first** and then by the more important key with a stable sort. The second pass keeps the first pass's order inside each group:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Two-pass sort: sort by name first, then stably by grade; inside each grade the names stay alphabetical">
  <defs>
    <marker id="b02q5-java-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="190" height="120" rx="10"/>
  <text class="d-text" x="115" y="72" text-anchor="middle">input</text>
  <text class="d-sub" x="115" y="100" text-anchor="middle">Dev B, Ana A, Raj B</text>
  <text class="d-sub" x="115" y="126" text-anchor="middle">Lin C, Bo A, Kim B</text>
  <path class="d-edge" d="M 214 100 L 260 100" marker-end="url(#b02q5-java-arrow)"/>
  <rect class="d-box" x="266" y="40" width="190" height="120" rx="10"/>
  <text class="d-text" x="361" y="72" text-anchor="middle">pass 1: by name</text>
  <text class="d-sub" x="361" y="100" text-anchor="middle">Ana, Bo, Dev</text>
  <text class="d-sub" x="361" y="126" text-anchor="middle">Kim, Lin, Raj</text>
  <path class="d-edge-accent" d="M 460 100 L 506 100" marker-end="url(#b02q5-java-arrow)"/>
  <rect class="d-box-accent" x="512" y="40" width="190" height="120" rx="10"/>
  <text class="d-text d-accent" x="607" y="72" text-anchor="middle">pass 2: by grade</text>
  <text class="d-sub" x="607" y="100" text-anchor="middle">A: Ana, Bo</text>
  <text class="d-sub" x="607" y="126" text-anchor="middle">B: Dev, Kim, Raj</text>
</svg>

This is how clicking column headers in a table works: each click is one stable sort, and earlier clicks become tie-breakers. In code it is usually simpler to do one sort with a **composite key** (grade, then name), and Example 1 checks that both give the same result. Stability also matters for:

- **Leaderboards and search results with ties:** equal scores stay in a predictable order (for example, whoever scored first), so the page does not reshuffle on every refresh.
- **Radix sort:** least-significant-digit radix sort sorts by one digit at a time and is correct only because each per-digit pass (usually counting sort) is stable.

📌 **Interview term: Composite key** — sorting by a tuple of fields, comparing the second only when the first is equal; the one-pass alternative to stable multi-pass sorting.

## 4. Which Algorithms Are Stable

| Algorithm | Stable? | Time (worst) | Why |
| :--- | :--- | :--- | :--- |
| Insertion sort | Yes | O(n²) | an item only moves past strictly greater ones |
| Bubble sort | Yes | O(n²) | only swaps adjacent items that are out of order |
| Merge sort | Yes | O(n log n) | on ties the merge takes from the left half first |
| Counting sort | Yes, as usually written | O(n + k) | fills output positions from the end in input order |
| Timsort | Yes | O(n log n) | a merge sort that also uses insertion sort on short runs |
| Selection sort | No | O(n²) | the long-distance swap can jump an item over its equal |
| Quicksort | No (typical in-place versions) | O(n²) | partitioning swaps items across the array |
| Heapsort | No | O(n log n) | the heap reorders equal items |

The word to remember is **"usually"**: stability is a property of an implementation. Merge sort becomes unstable if the merge takes from the right on ties, and quicksort can be made stable with extra memory. For how the main algorithms work, see [merge sort and quicksort](/interview-question/how-do-merge-sort-and-quicksort-work) and [the comparison of common sorting algorithms](/interview-question/compare-common-sorting-algorithms).

## 5. Making Any Sort Stable

If you only have an unstable sort, make every key unique by adding the **original index** as a final tie-breaker: compare (key, index) instead of key. Equal keys are then ordered by index, which is exactly the input order. Example 2 does this to selection sort and gets the stable result. It costs O(n) extra memory for the indices.

📌 **Interview term: Index tie-breaker (decorate-sort-undecorate)** — attaching each item's original position to its key so an unstable sort produces the stable order.

## 6. In Java: Object Sorts Are Stable

The JDK 21 Javadoc for \`Collections.sort\` says: "This sort is guaranteed to be stable: equal elements will not be reordered as a result of the sort." The object sorts (\`Collections.sort\`, \`List.sort\`, \`Arrays.sort(Object[])\`) use a TimSort port, adapted from Tim Peters's list sort for Python, as the OpenJDK issue [JDK-6804124](https://bugs.openjdk.org/browse/JDK-6804124) records. The primitive overloads such as \`Arrays.sort(int[])\` use Dual-Pivot Quicksort, which is not stable, but for primitives that cannot be observed: two equal \`int\`s are identical.

~~~java
record Student(String name, String grade) {}

List<Student> byGrade = new ArrayList<>(students);       // List.of(...) is immutable: copy first
Collections.sort(byGrade, Comparator.comparing(Student::grade));

List<Student> onePass = new ArrayList<>(students);
Collections.sort(onePass, Comparator.comparing(Student::grade).thenComparing(Student::name));
~~~

* **\`Comparator.comparing(...).thenComparing(...)\`** builds a composite key; \`.reversed()\` flips the whole comparator. Example 1 sorts by grade descending with \`reversed()\` and the B students stay Dev, Raj, Kim, their input order.
* **\`comparingInt\`** avoids boxing for \`int\` keys; never write a comparator as \`a.x - b.x\` for arbitrary ints, because the subtraction can overflow and flip the sign. Use \`Integer.compare(a.x, b.x)\`.
* **\`List.of(...)\` is immutable;** sorting it throws \`UnsupportedOperationException\`, so copy into an \`ArrayList\` first.
* **Records** give you \`equals\` for free, which is why \`onePass.equals(twoPass)\` in Example 1 compares contents.

## 7. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`javac Main.java && java Main\`; the blocks are the exact standard output.

**Example 1 — the built-in stable sort: one key, two passes, a composite key, and descending**

~~~text
input:            Dev:B Ana:A Raj:B Lin:C Bo:A Kim:B
by grade:         Ana:A Bo:A Dev:B Raj:B Kim:B Lin:C
by name:          Ana:A Bo:A Dev:B Kim:B Lin:C Raj:B
name, then grade: Ana:A Bo:A Dev:B Kim:B Raj:B Lin:C
tuple key gives the same order: true
grade descending: Lin:C Dev:B Raj:B Kim:B Ana:A Bo:A
~~~

**Example 2 — hand-written insertion sort (stable) vs selection sort (unstable), and the index fix**

~~~text
input:              5-hearts 3-spades 5-spades 2-clubs
insertion sort:     2-clubs 3-spades 5-hearts 5-spades
  stable? true
selection sort:     2-clubs 3-spades 5-spades 5-hearts
  stable? false
selection + index:  2-clubs 3-spades 5-hearts 5-spades
  stable? true
~~~

**Reading the output:** in Example 1 the B students come out Dev, Raj, Kim when sorted by grade alone (their input order) and Dev, Kim, Raj after the name pass, which is exactly the composite-key result. In Example 2 selection sort put \`5-spades\` before \`5-hearts\`, the reverse of the input, and adding the original index as a tie-breaker fixed it.

## 8. Complexity of the Example Sorts

| Sort in the examples | Time | Extra space | Stable? |
| :--- | :--- | :--- | :--- |
| Insertion sort (Example 2) | O(n²) worst, O(n) if nearly sorted | O(1) | yes |
| Selection sort (Example 2) | O(n²) always | O(1) | no |
| Selection sort + index tie-breaker | O(n²) | O(n) for the indices | yes |

## 9. Edge Cases to Mention

- **All keys distinct:** stability has no visible effect.
- **All keys equal:** a stable sort must return the input unchanged; an unstable one may permute it completely.
- **Descending order:** reversing the comparison keeps stability; reversing the *output* of an ascending stable sort does not (ties come out reversed).
- **Inconsistent comparators:** a comparator that is not a consistent ordering (for example one that returns a boolean, or uses \`<=\`) breaks sorting altogether, stable or not.

## 10. Common Pitfalls

- **\`(a, b) -> a.score - b.score\` as a comparator.** For large or negative values the subtraction overflows and orders items wrongly; use \`Integer.compare\` or \`Comparator.comparingInt\`.
- **Sorting an immutable list.** \`List.of(...).sort(...)\` throws \`UnsupportedOperationException\`.
- **Doing multi-pass sorts in the wrong order.** Sort by the least important key first; the last pass is the primary key.
- **Expecting stability from a hand-written sort.** Example 2's selection sort is not stable, whatever the JDK sorts guarantee.
- **A comparator inconsistent with itself.** TimSort can detect a comparator that breaks the ordering rules and throw \`IllegalArgumentException: Comparison method violates its general contract!\`.
- **Confusing \`reversed()\` on the comparator with \`Collections.reverse\` on the result.** The second also reverses the ties.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A sort is stable if items with equal keys keep their original relative order; it only matters when items carry more than the key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it matters:</strong> <span style="color:#f0e2c8;">It makes multi-key sorting in passes work: sort by the secondary key, then stably by the primary key, and ties keep the secondary order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Which are stable:</strong> <span style="color:#f0e2c8;">Insertion, bubble, merge, counting sort and Timsort are stable; selection, typical quicksort and heapsort are not.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. In Java:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.sort</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List.sort</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort(Object[])</code> are guaranteed stable (TimSort); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort(int[])</code> is Dual-Pivot Quicksort, where stability is invisible.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Composite keys:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Comparator.comparing(...).thenComparing(...)</code> does a multi-key sort in one pass, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reversed()</code> keeps ties in input order.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Arrays.sort(int[])</code> not need to be stable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two equal ints are indistinguishable, so no one can tell whether they swapped. Stability only matters for objects that carry more than the key.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is wrong with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(a, b) -&gt; a - b</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For values far apart, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MIN_VALUE</code> and 1, the subtraction overflows and the sign flips. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.compare(a, b)</code> is always correct.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you sort by score descending, then name?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Comparator.comparingInt(Player::score).reversed().thenComparing(Player::name)</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reversed()</code> applies to the score part only, because it is called before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">thenComparing</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is selection sort unstable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It swaps the minimum into position i, and that long-distance swap can jump an item over an equal one. In Example 2, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">5 hearts</code> ended up behind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">5 spades</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does Comparison method violates its general contract mean?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TimSort noticed your comparator is inconsistent, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">compare(a, b)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">compare(b, a)</code> both positive. Fix the comparator; do not catch the exception.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Stable sort** | Keeps equal-key items in their original relative order |
| **Sort key** | The value the sort compares |
| **Ties** | Items whose keys compare equal |
| **Composite key** | Sorting by a tuple of fields, one pass instead of several |
| **Index tie-breaker** | Adding the original position to the key to force stability |
| **TimSort** | Stable merge-based sort used for Java object sorts and for Python |

---
**Conclusion:** A stable sort keeps items with equal keys in the order they arrived; an unstable one may shuffle them, and both are "correctly sorted". The difference matters whenever items carry more than the key: multi-pass sorts, tables sorted by several columns, leaderboards with ties, and radix sort all rely on it. Insertion, merge, counting sort and Timsort are stable; selection, typical quicksort and heapsort are not, and any sort can be made stable with an index tie-breaker. In Java, every object sort is documented as stable and primitive sorts do not need to be, so the practical skills are building comparators with \`comparing\` and \`thenComparing\` and avoiding the overflowing \`a - b\`.`,
        examples: [
          {
            label: "The built-in stable sort with ties and multiple keys",
            code: `import java.util.*;
import java.util.stream.Collectors;

public class Main {
    // Collections.sort is documented as stable: records with equal keys keep their input
    // order. That lets you sort by several keys in passes: least important key first.

    record Student(String name, String grade) {
        @Override public String toString() { return name + ":" + grade; }
    }

    static void show(String label, List<Student> rows) {
        System.out.println(label + rows.stream().map(Student::toString).collect(Collectors.joining(" ")));
    }

    public static void main(String[] args) {
        List<Student> students = List.of(new Student("Dev", "B"), new Student("Ana", "A"), new Student("Raj", "B"),
                new Student("Lin", "C"), new Student("Bo", "A"), new Student("Kim", "B"));
        show("input:            ", students);

        List<Student> byGrade = new ArrayList<>(students);          // List.of is immutable: copy first
        Collections.sort(byGrade, Comparator.comparing(Student::grade));
        show("by grade:         ", byGrade);

        List<Student> byName = new ArrayList<>(students);
        Collections.sort(byName, Comparator.comparing(Student::name));
        show("by name:          ", byName);

        List<Student> twoPass = new ArrayList<>(byName);
        Collections.sort(twoPass, Comparator.comparing(Student::grade));   // keeps name order inside each grade
        show("name, then grade: ", twoPass);

        List<Student> onePass = new ArrayList<>(students);
        Collections.sort(onePass, Comparator.comparing(Student::grade).thenComparing(Student::name));
        System.out.println("tuple key gives the same order: " + onePass.equals(twoPass));

        // reversed() flips the comparison; equal records still keep their original order.
        List<Student> desc = new ArrayList<>(students);
        Collections.sort(desc, Comparator.comparing(Student::grade).reversed());
        show("grade descending: ", desc);
    }
}`,
          },
          {
            label: "Insertion sort vs selection sort: stable vs unstable",
            code: `import java.util.*;
import java.util.stream.Collectors;

public class Main {
    // Stability is a property of the algorithm. Two hand-written sorts on the same cards:
    // insertion sort (stable) and selection sort (unstable), plus the fix for an unstable one.

    record Card(int rank, String suit, int pos) {}       // pos = index in the input

    static void show(String label, List<Card> rows) {
        System.out.println(label + rows.stream().map(c -> c.rank() + "-" + c.suit()).collect(Collectors.joining(" ")));
    }

    static boolean isStable(List<Card> result) {
        // For equal ranks, the original positions must still be increasing.
        for (int i = 0; i + 1 < result.size(); i++) {
            Card a = result.get(i), b = result.get(i + 1);
            if (a.rank() == b.rank() && a.pos() > b.pos()) return false;
        }
        return true;
    }

    static List<Card> insertionSort(List<Card> items, Comparator<Card> cmp) {
        List<Card> a = new ArrayList<>(items);
        for (int i = 1; i < a.size(); i++) {
            Card cur = a.get(i);
            int j = i - 1;
            while (j >= 0 && cmp.compare(a.get(j), cur) > 0) {   // strict: never jump over an equal key
                a.set(j + 1, a.get(j));
                j--;
            }
            a.set(j + 1, cur);
        }
        return a;
    }

    static List<Card> selectionSort(List<Card> items, Comparator<Card> cmp) {
        List<Card> a = new ArrayList<>(items);
        for (int i = 0; i < a.size(); i++) {
            int m = i;
            for (int j = i + 1; j < a.size(); j++) if (cmp.compare(a.get(j), a.get(m)) < 0) m = j;
            Collections.swap(a, i, m);                         // the long-distance swap breaks stability
        }
        return a;
    }

    public static void main(String[] args) {
        List<Card> cards = List.of(new Card(5, "hearts", 0), new Card(3, "spades", 1),
                new Card(5, "spades", 2), new Card(2, "clubs", 3));
        Comparator<Card> byRank = Comparator.comparingInt(Card::rank);

        show("input:              ", cards);
        List<Card> r = insertionSort(cards, byRank);
        show("insertion sort:     ", r);
        System.out.println("  stable? " + isStable(r));
        r = selectionSort(cards, byRank);
        show("selection sort:     ", r);
        System.out.println("  stable? " + isStable(r));

        // Fix: make every key unique by adding the original index as a tie-breaker.
        r = selectionSort(cards, byRank.thenComparingInt(Card::pos));
        show("selection + index:  ", r);
        System.out.println("  stable? " + isStable(r));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"What does it mean for a sorting algorithm to be stable? Give an example where it matters, tell me which common algorithms are stable, and whether the built-in sort in C++ is."

**What a strong answer should cover:**
- The definition: items with equal keys keep their input order; it only matters when items carry more than the key.
- Why it matters: multi-key sorting in passes (least important key first), tables with several sort columns, ties in rankings, radix sort.
- Stable algorithms (insertion, merge, counting, Timsort) versus usually unstable ones (selection, quicksort, heapsort).
- How to make any sort stable: the original index as a tie-breaker, or a full composite key.
- C++ specifics: \`std::sort\` does not preserve the order of equal elements (libstdc++ uses introsort), \`std::stable_sort\` does, comparators must be a strict weak ordering (\`<\`, never \`<=\`), and a full composite key makes even \`std::sort\` deterministic.

**Code / implementation expected:** Optional — a multi-key sort with the C++ built-in, or a short demonstration of an unstable sort.`,
        answer: `**Target Audience:** Beginners who know what sorting is and want to understand the guarantees behind it.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every program in this doc was run with \`g++ -std=c++17 main.cpp && ./a.out\`, and the output quoted in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A teacher has the class list in alphabetical order. She wants the list grouped by grade, A first, but **still alphabetical inside each grade**, so she can find a name quickly. She clicks "sort by grade" in her spreadsheet. If the spreadsheet's sort is **stable**, she gets exactly what she wanted: within the A students, Ana is still before Bo, because that is the order they were in before. If the sort is **unstable**, the A students might come out as Bo, Ana, and the B students in some random-looking order, even though every grade group is correct.

Both results are "sorted by grade". Stability is the extra promise about what happens to the items the sort considers **equal**. It sounds like a detail until you build a multi-column table, a leaderboard with ties, or a sort that runs in several passes.

## 2. The Definition

A sorting algorithm is **stable** if, whenever two items have **equal keys**, they appear in the output in the **same relative order** as in the input. An unstable algorithm may reorder them.

📌 **Interview term: Stable sort** — a sort that keeps items with equal keys in their original relative order.

📌 **Interview term: Sort key** — the value the sort compares (here the card's rank or the student's grade). Items can be different but have equal keys.

📌 **Interview term: Ties** — items whose keys compare equal. Stability only says something about ties; it changes nothing when all keys are distinct.

Cards sorted by rank show the difference. \`5 hearts\` came before \`5 spades\` in the input:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 310" role="img" aria-label="Sorting cards by rank: the stable result keeps 5 hearts before 5 spades as in the input; the unstable result swaps them">
  <text class="d-text" x="70" y="64" text-anchor="middle">input</text>
  <rect class="d-box-accent" x="150" y="30" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="205" y="54" text-anchor="middle">5 hearts</text>
  <text class="d-sub" x="205" y="74" text-anchor="middle">input pos 0</text>
  <rect class="d-box" x="290" y="30" width="110" height="56" rx="8"/>
  <text class="d-text" x="345" y="54" text-anchor="middle">3 spades</text>
  <text class="d-sub" x="345" y="74" text-anchor="middle">input pos 1</text>
  <rect class="d-box-accent" x="430" y="30" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="485" y="54" text-anchor="middle">5 spades</text>
  <text class="d-sub" x="485" y="74" text-anchor="middle">input pos 2</text>
  <rect class="d-box" x="570" y="30" width="110" height="56" rx="8"/>
  <text class="d-text" x="625" y="54" text-anchor="middle">2 clubs</text>
  <text class="d-sub" x="625" y="74" text-anchor="middle">input pos 3</text>
  <text class="d-text" x="70" y="164" text-anchor="middle">stable</text>
  <rect class="d-box" x="150" y="130" width="110" height="56" rx="8"/>
  <text class="d-text" x="205" y="154" text-anchor="middle">2 clubs</text>
  <text class="d-sub" x="205" y="174" text-anchor="middle">pos 3</text>
  <rect class="d-box" x="290" y="130" width="110" height="56" rx="8"/>
  <text class="d-text" x="345" y="154" text-anchor="middle">3 spades</text>
  <text class="d-sub" x="345" y="174" text-anchor="middle">pos 1</text>
  <rect class="d-box-accent" x="430" y="130" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="485" y="154" text-anchor="middle">5 hearts</text>
  <text class="d-sub" x="485" y="174" text-anchor="middle">pos 0</text>
  <rect class="d-box-accent" x="570" y="130" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="625" y="154" text-anchor="middle">5 spades</text>
  <text class="d-sub" x="625" y="174" text-anchor="middle">pos 2</text>
  <text class="d-text" x="70" y="264" text-anchor="middle">unstable</text>
  <rect class="d-box" x="150" y="230" width="110" height="56" rx="8"/>
  <text class="d-text" x="205" y="254" text-anchor="middle">2 clubs</text>
  <text class="d-sub" x="205" y="274" text-anchor="middle">pos 3</text>
  <rect class="d-box" x="290" y="230" width="110" height="56" rx="8"/>
  <text class="d-text" x="345" y="254" text-anchor="middle">3 spades</text>
  <text class="d-sub" x="345" y="274" text-anchor="middle">pos 1</text>
  <rect class="d-box-accent" x="430" y="230" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="485" y="254" text-anchor="middle">5 spades</text>
  <text class="d-sub" x="485" y="274" text-anchor="middle">pos 2</text>
  <rect class="d-box-accent" x="570" y="230" width="110" height="56" rx="8"/>
  <text class="d-text d-accent" x="625" y="254" text-anchor="middle">5 hearts</text>
  <text class="d-sub" x="625" y="274" text-anchor="middle">pos 0</text>
</svg>

Both outputs are correctly sorted by rank. Only the stable one keeps \`5 hearts\` (input position 0) before \`5 spades\` (input position 2). Example 2 produces exactly these two rows with a hand-written insertion sort (stable) and selection sort (unstable).

Stability only matters when items carry more than their key. Sorting plain integers, two equal 5s are indistinguishable, so stable and unstable give identical results.

## 3. Why It Matters: Sorting by Several Keys

The main practical use is **multi-key sorting in passes**. To sort by grade, and by name inside each grade, sort by the **least important key first** and then by the more important key with a stable sort. The second pass keeps the first pass's order inside each group:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Two-pass sort: sort by name first, then stably by grade; inside each grade the names stay alphabetical">
  <defs>
    <marker id="b02q5-cpp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="190" height="120" rx="10"/>
  <text class="d-text" x="115" y="72" text-anchor="middle">input</text>
  <text class="d-sub" x="115" y="100" text-anchor="middle">Dev B, Ana A, Raj B</text>
  <text class="d-sub" x="115" y="126" text-anchor="middle">Lin C, Bo A, Kim B</text>
  <path class="d-edge" d="M 214 100 L 260 100" marker-end="url(#b02q5-cpp-arrow)"/>
  <rect class="d-box" x="266" y="40" width="190" height="120" rx="10"/>
  <text class="d-text" x="361" y="72" text-anchor="middle">pass 1: by name</text>
  <text class="d-sub" x="361" y="100" text-anchor="middle">Ana, Bo, Dev</text>
  <text class="d-sub" x="361" y="126" text-anchor="middle">Kim, Lin, Raj</text>
  <path class="d-edge-accent" d="M 460 100 L 506 100" marker-end="url(#b02q5-cpp-arrow)"/>
  <rect class="d-box-accent" x="512" y="40" width="190" height="120" rx="10"/>
  <text class="d-text d-accent" x="607" y="72" text-anchor="middle">pass 2: by grade</text>
  <text class="d-sub" x="607" y="100" text-anchor="middle">A: Ana, Bo</text>
  <text class="d-sub" x="607" y="126" text-anchor="middle">B: Dev, Kim, Raj</text>
</svg>

This is how clicking column headers in a table works: each click is one stable sort, and earlier clicks become tie-breakers. In code it is usually simpler to do one sort with a **composite key** (grade, then name), and Example 1 checks that both give the same result. Stability also matters for:

- **Leaderboards and search results with ties:** equal scores stay in a predictable order (for example, whoever scored first), so the page does not reshuffle on every refresh.
- **Radix sort:** least-significant-digit radix sort sorts by one digit at a time and is correct only because each per-digit pass (usually counting sort) is stable.

📌 **Interview term: Composite key** — sorting by a tuple of fields, comparing the second only when the first is equal; the one-pass alternative to stable multi-pass sorting.

## 4. Which Algorithms Are Stable

| Algorithm | Stable? | Time (worst) | Why |
| :--- | :--- | :--- | :--- |
| Insertion sort | Yes | O(n²) | an item only moves past strictly greater ones |
| Bubble sort | Yes | O(n²) | only swaps adjacent items that are out of order |
| Merge sort | Yes | O(n log n) | on ties the merge takes from the left half first |
| Counting sort | Yes, as usually written | O(n + k) | fills output positions from the end in input order |
| Timsort | Yes | O(n log n) | a merge sort that also uses insertion sort on short runs |
| Selection sort | No | O(n²) | the long-distance swap can jump an item over its equal |
| Quicksort | No (typical in-place versions) | O(n²) | partitioning swaps items across the array |
| Heapsort | No | O(n log n) | the heap reorders equal items |

The word to remember is **"usually"**: stability is a property of an implementation. Merge sort becomes unstable if the merge takes from the right on ties, and quicksort can be made stable with extra memory. For how the main algorithms work, see [merge sort and quicksort](/interview-question/how-do-merge-sort-and-quicksort-work) and [the comparison of common sorting algorithms](/interview-question/compare-common-sorting-algorithms).

## 5. Making Any Sort Stable

If you only have an unstable sort, make every key unique by adding the **original index** as a final tie-breaker: compare (key, index) instead of key. Equal keys are then ordered by index, which is exactly the input order. Example 2 does this to selection sort and gets the stable result. It costs O(n) extra memory for the indices.

📌 **Interview term: Index tie-breaker (decorate-sort-undecorate)** — attaching each item's original position to its key so an unstable sort produces the stable order.

## 6. In C++: std::sort vs std::stable_sort

The standard does not require \`std::sort\` to keep equal elements in order; [cppreference](https://en.cppreference.com/w/cpp/algorithm/sort) states that "the order of equal elements is not guaranteed to be preserved", while [\`std::stable_sort\`](https://en.cppreference.com/w/cpp/algorithm/stable_sort) guarantees it. In libstdc++ (g++ 13), \`std::sort\` is an introsort: the header \`bits/stl_algo.h\` implements it with \`__introsort_loop\` followed by \`__final_insertion_sort\`, with a threshold of 16 elements. A quick check sorted 40 records by a 0/1 key and printed the original indices of the key-0 records:

~~~text
std::sort        key 0 originals: 0 26 24 28 22 20 30 18 16 32 14 12 34 10 8 36 6 4 38 2
std::stable_sort key 0 originals: 0 2 4 6 8 10 12 14 16 18 20 22 24 26 28 30 32 34 36 38
~~~

\`std::sort\` scrambled the ties; \`std::stable_sort\` kept them in input order.

~~~cpp
std::stable_sort(v.begin(), v.end(),
                 [](const Student& a, const Student& b) { return a.grade < b.grade; });

std::sort(v.begin(), v.end(), [](const Student& a, const Student& b) {
    return a.grade != b.grade ? a.grade < b.grade : a.name < b.name;   // full key: no ties left
});
~~~

* **Strict weak ordering.** The comparator must behave like \`<\`: \`comp(a, a)\` is false. Writing \`<=\` breaks that rule and is undefined behaviour; with some inputs \`std::sort\` can even read past the end of the range.
* **\`std::stable_sort\` costs memory.** It typically allocates a temporary buffer; cppreference gives O(n log n) comparisons when enough extra memory is available and O(n log² n) otherwise.
* **A full composite key makes ties impossible,** so \`std::sort\` then gives one deterministic answer. Example 1 checks that this matches the two-pass stable result.
* **\`std::tie(a.grade, a.name) < std::tie(b.grade, b.name)\`** is a compact way to write composite comparisons.

## 7. Verified: Running the Code

Each example below is in the examples panel of this page. It was saved as a single file and run with \`g++ -std=c++17 main.cpp && ./a.out\`; the blocks are the exact standard output.

**Example 1 — the built-in stable sort: one key, two passes, a composite key, and descending**

~~~text
input:            Dev:B Ana:A Raj:B Lin:C Bo:A Kim:B
by grade:         Ana:A Bo:A Dev:B Raj:B Kim:B Lin:C
by name:          Ana:A Bo:A Dev:B Kim:B Lin:C Raj:B
name, then grade: Ana:A Bo:A Dev:B Kim:B Raj:B Lin:C
tuple key gives the same order: true
grade descending: Lin:C Dev:B Raj:B Kim:B Ana:A Bo:A
~~~

**Example 2 — hand-written insertion sort (stable) vs selection sort (unstable), and the index fix**

~~~text
input:              5-hearts 3-spades 5-spades 2-clubs
insertion sort:     2-clubs 3-spades 5-hearts 5-spades
  stable? true
selection sort:     2-clubs 3-spades 5-spades 5-hearts
  stable? false
selection + index:  2-clubs 3-spades 5-hearts 5-spades
  stable? true
~~~

**Reading the output:** in Example 1 the B students come out Dev, Raj, Kim when sorted by grade alone (their input order) and Dev, Kim, Raj after the name pass, which is exactly the composite-key result. In Example 2 selection sort put \`5-spades\` before \`5-hearts\`, the reverse of the input, and adding the original index as a tie-breaker fixed it.

## 8. Complexity of the Example Sorts

| Sort in the examples | Time | Extra space | Stable? |
| :--- | :--- | :--- | :--- |
| Insertion sort (Example 2) | O(n²) worst, O(n) if nearly sorted | O(1) | yes |
| Selection sort (Example 2) | O(n²) always | O(1) | no |
| Selection sort + index tie-breaker | O(n²) | O(n) for the indices | yes |

## 9. Edge Cases to Mention

- **All keys distinct:** stability has no visible effect.
- **All keys equal:** a stable sort must return the input unchanged; an unstable one may permute it completely.
- **Descending order:** reversing the comparison keeps stability; reversing the *output* of an ascending stable sort does not (ties come out reversed).
- **Inconsistent comparators:** a comparator that is not a consistent ordering (for example one that returns a boolean, or uses \`<=\`) breaks sorting altogether, stable or not.

## 10. Common Pitfalls

- **Using \`std::sort\` when ties must keep their order.** It makes no promise; the run above shows it reorders them. Use \`std::stable_sort\`.
- **Writing the comparator with \`<=\`.** It violates strict weak ordering, which is undefined behaviour and can crash \`std::sort\`.
- **Doing multi-pass sorts with \`std::sort\`.** The second pass may destroy the first pass's order; every pass after the first must be \`std::stable_sort\`.
- **Doing multi-pass sorts in the wrong order.** Sort by the least important key first; the last pass is the primary key.
- **Forgetting that \`std::stable_sort\` allocates.** In memory-constrained code it falls back to a slower O(n log² n) algorithm.
- **Assuming a hand-written sort is stable.** Example 2's selection sort is not; insertion sort is, as long as it moves only past strictly greater keys.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A sort is stable if items with equal keys keep their original relative order; it only matters when items carry more than the key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it matters:</strong> <span style="color:#f0e2c8;">It makes multi-key sorting in passes work: sort by the secondary key, then stably by the primary key, and ties keep the secondary order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Which are stable:</strong> <span style="color:#f0e2c8;">Insertion, bubble, merge and counting sort are stable; selection, typical quicksort and heapsort are not.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. In C++:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> does not preserve the order of ties (libstdc++ uses introsort); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stable_sort</code> guarantees it, at the cost of a temporary buffer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Comparators:</strong> <span style="color:#f0e2c8;">They must be a strict weak ordering, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> and never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>; a full composite key leaves no ties, so even <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> becomes deterministic.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What algorithm is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::sort</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The standard only requires O(n log n) comparisons. libstdc++ uses introsort: quicksort that switches to heapsort if recursion gets too deep, then a final insertion sort. Neither part is stable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::stable_sort</code> slower?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It needs a temporary buffer; without enough memory its complexity is O(n log² n) comparisons instead of O(n log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;=</code> in a comparator a bug?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It says an element is less than itself, which breaks strict weak ordering. That is undefined behaviour, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> may run past the end of the array.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is selection sort unstable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It swaps the minimum into position i, and that long-distance swap can jump an item over an equal one. In Example 2, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">5 hearts</code> ended up behind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">5 spades</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How else can you get a stable result from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::sort</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort pairs of (key, original index), or compare the index as the last tie-breaker; every key is then unique, so the order is fully determined.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Stable sort** | Keeps equal-key items in their original relative order |
| **Sort key** | The value the sort compares |
| **Ties** | Items whose keys compare equal |
| **Composite key** | Sorting by a tuple of fields, one pass instead of several |
| **Index tie-breaker** | Adding the original position to the key to force stability |
| **Strict weak ordering** | The rules a C++ comparator must obey, behaving like < |
| **Introsort** | Quicksort with a heapsort fallback; the algorithm behind libstdc++ std::sort |

---
**Conclusion:** A stable sort keeps items with equal keys in the order they arrived; an unstable one may shuffle them, and both are "correctly sorted". The difference matters whenever items carry more than the key: multi-pass sorts, tables sorted by several columns, leaderboards with ties, and radix sort all rely on it. Insertion, merge and counting sort are stable; selection, typical quicksort and heapsort are not, and any sort can be made stable with an index tie-breaker. In C++ the choice is explicit: \`std::sort\` makes no promise about ties (the libstdc++ introsort visibly scrambled them), \`std::stable_sort\` keeps them, and either one needs a strict \`<\` comparator.`,
        examples: [
          {
            label: "The built-in stable sort with ties and multiple keys",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

// std::stable_sort guarantees that records with equal keys keep their input order
// (std::sort does not). That lets you sort by several keys in passes.

struct Student {
    std::string name, grade;
    bool operator==(const Student& o) const { return name == o.name && grade == o.grade; }
};

void show(const std::string& label, const std::vector<Student>& rows) {
    std::string s;
    for (const auto& r : rows) s += (s.empty() ? "" : " ") + r.name + ":" + r.grade;
    std::cout << label << s << "\\n";
}

int main() {
    const std::vector<Student> students = {{"Dev", "B"}, {"Ana", "A"}, {"Raj", "B"},
                                           {"Lin", "C"}, {"Bo", "A"}, {"Kim", "B"}};
    show("input:            ", students);

    auto byGrade = students;   // copy, then sort the copy
    std::stable_sort(byGrade.begin(), byGrade.end(),
                     [](const Student& a, const Student& b) { return a.grade < b.grade; });   // strict "less than"
    show("by grade:         ", byGrade);

    auto byName = students;
    std::stable_sort(byName.begin(), byName.end(),
                     [](const Student& a, const Student& b) { return a.name < b.name; });
    show("by name:          ", byName);

    auto twoPass = byName;     // stable pass 2 keeps the name order inside each grade
    std::stable_sort(twoPass.begin(), twoPass.end(),
                     [](const Student& a, const Student& b) { return a.grade < b.grade; });
    show("name, then grade: ", twoPass);

    auto onePass = students;   // a full key makes even the unstable std::sort deterministic
    std::sort(onePass.begin(), onePass.end(), [](const Student& a, const Student& b) {
        return a.grade != b.grade ? a.grade < b.grade : a.name < b.name;
    });
    std::cout << std::boolalpha << "tuple key gives the same order: " << (onePass == twoPass) << "\\n";

    auto desc = students;      // descending: flip the comparison; ties still keep input order
    std::stable_sort(desc.begin(), desc.end(),
                     [](const Student& a, const Student& b) { return a.grade > b.grade; });
    show("grade descending: ", desc);
}`,
          },
          {
            label: "Insertion sort vs selection sort: stable vs unstable",
            code: `#include <functional>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

// Stability is a property of the algorithm. Two hand-written sorts on the same cards:
// insertion sort (stable) and selection sort (unstable), plus the fix for an unstable one.

struct Card {
    int rank;
    std::string suit;
    int pos;                                   // index in the input
};
using Less = std::function<bool(const Card&, const Card&)>;

void show(const std::string& label, const std::vector<Card>& rows) {
    std::string s;
    for (const auto& c : rows) s += (s.empty() ? "" : " ") + std::to_string(c.rank) + "-" + c.suit;
    std::cout << label << s << "\\n";
}

bool isStable(const std::vector<Card>& result) {
    // For equal ranks, the original positions must still be increasing.
    for (size_t i = 0; i + 1 < result.size(); i++)
        if (result[i].rank == result[i + 1].rank && result[i].pos > result[i + 1].pos) return false;
    return true;
}

std::vector<Card> insertionSort(std::vector<Card> a, const Less& less) {
    for (size_t i = 1; i < a.size(); i++) {
        Card cur = a[i];
        size_t j = i;
        while (j > 0 && less(cur, a[j - 1])) {   // move only past strictly greater keys
            a[j] = a[j - 1];
            j--;
        }
        a[j] = cur;
    }
    return a;
}

std::vector<Card> selectionSort(std::vector<Card> a, const Less& less) {
    for (size_t i = 0; i < a.size(); i++) {
        size_t m = i;
        for (size_t j = i + 1; j < a.size(); j++) if (less(a[j], a[m])) m = j;
        std::swap(a[i], a[m]);                   // the long-distance swap breaks stability
    }
    return a;
}

int main() {
    std::cout << std::boolalpha;
    const std::vector<Card> cards = {{5, "hearts", 0}, {3, "spades", 1}, {5, "spades", 2}, {2, "clubs", 3}};
    Less byRank = [](const Card& x, const Card& y) { return x.rank < y.rank; };

    show("input:              ", cards);
    auto r = insertionSort(cards, byRank);
    show("insertion sort:     ", r);
    std::cout << "  stable? " << isStable(r) << "\\n";
    r = selectionSort(cards, byRank);
    show("selection sort:     ", r);
    std::cout << "  stable? " << isStable(r) << "\\n";

    // Fix: make every key unique by adding the original index as a tie-breaker.
    Less byRankThenPos = [](const Card& x, const Card& y) {
        return x.rank != y.rank ? x.rank < y.rank : x.pos < y.pos;
    };
    r = selectionSort(cards, byRankThenPos);
    show("selection + index:  ", r);
    std::cout << "  stable? " << isStable(r) << "\\n";
}`,
          },
        ],
      },
    },
  },
];

export default augments;
