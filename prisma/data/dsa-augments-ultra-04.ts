/**
 * DSA ULTRA — batch 04: sorting, binary search and selection — peak element, searching a sorted 2D
 * matrix, median of two sorted arrays (partition trick), Quickselect and the kth largest element.
 * One complete answer per language (Python, JavaScript, Java, C++). Every example was run with python3 /
 * node / javac+java / g++ -std=c++17 by scripts/verify-dsa-examples.ts and the quoted output is that
 * run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you find a peak element in an array?",
    difficulty: "medium",
    seoDescription: "Find a peak element in O(log n) with binary search on the slope, explained with verified Python, JavaScript, Java and C++ code and traces.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given an integer array where no two neighbours are equal, return the index of any peak — an element bigger than both its neighbours, with the outside of the array counting as minus infinity. Please write it in Python and aim for better than linear time."

**What a strong answer should cover:**
- A peak always exists because out-of-range neighbours are minus infinity; any peak is accepted, not only the maximum.
- The O(n) scan first, then binary search on the slope: compare \`nums[mid]\` with \`nums[mid + 1]\` and keep the half that must contain a peak.
- The loop invariant that justifies it, and why the loop is \`while lo < hi\` with \`hi = mid\`.
- O(log n) time and O(1) extra space; why the global maximum cannot be found this fast.
- Python specifics: \`//\` for integer division (\`/\` returns a float that cannot index a list), no integer overflow in \`(lo + hi) // 2\`, and an explicit check for an empty list.

**Clarifying questions expected:**
- "Any peak or the highest one?"
- "Can neighbours be equal?"
- "What should an empty list return?"

**Code / implementation expected:** Yes — a short iterative \`find_peak(nums)\` function in Python.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array and a loop are; binary search is explained from scratch.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the Python programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

You are hiking in thick fog. You cannot see the mountain range, only the ground one step to your left and one step to your right. Your task is not to find the *highest* mountain — just to stand on *a* summit, any spot where both sides go down.

The slow plan is to walk the whole trail from one end and stop at the first spot where the ground drops. The clever plan: look at the ground just ahead. If it goes **up**, keep walking that way — a path that climbs must eventually either hit a summit or reach the end of the trail, and the end of the trail counts as a summit because past it there is a cliff. If it goes **down**, you are already on a downhill, so a summit is behind you (maybe right where you stand).

Better still, you do not have to walk at all: jump to the **middle** of the trail, check which way the ground slopes, and throw away the half that you know you do not need. Each jump halves the trail. A trail of a million steps is settled in 20 jumps. That jump-and-halve trick is binary search, applied to something that is **not sorted** — which is exactly why interviewers like this question.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| "Do you want **any** peak or the **highest** element?" | Any peak can be found in O(log n). The global maximum needs every element looked at — O(n), no shortcut. |
| "Can two neighbours be equal?" | The O(log n) proof needs \`nums[i] != nums[i+1]\`. With flat stretches the slope rule can stop on a non-peak (shown in the Pitfalls). |
| "Do positions outside the array count as minus infinity?" | That convention (LeetCode 162 uses it) means the first and last elements can be peaks and a peak always exists. |
| "Index or value?" | Usually the index. Returning the value loses where it was. |
| "Can the array be empty?" | With no elements there is no peak; decide whether to return -1 or throw. |

## 3. What Exactly Is a Peak?

A **peak** is an element strictly bigger than the element on its left and the element on its right. Positions outside the array are treated as minus infinity, so the first element only has to beat its right neighbour and the last element only has to beat its left neighbour.

📌 **Interview term: Peak element (local maximum)** — an index \`i\` where \`nums[i] > nums[i-1]\` and \`nums[i] > nums[i+1]\`, with out-of-range neighbours counted as minus infinity. A *local* maximum is only bigger than its neighbours; the *global* maximum is bigger than everything.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 252" role="img" aria-label="Bar chart of the array 1 2 1 3 5 6 4 with two peaks highlighted at index 1 and index 5">
  <defs>
    <marker id="b04q1-a-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="60" y="184" width="46" height="26" rx="4"/>
  <text class="d-text" x="83" y="174" text-anchor="middle">1</text>
  <text class="d-sub" x="83" y="236" text-anchor="middle">i=0</text>
  <rect class="d-box-accent" x="132" y="158" width="46" height="52" rx="4"/>
  <text class="d-text" x="155" y="148" text-anchor="middle">2</text>
  <text class="d-sub" x="155" y="236" text-anchor="middle">i=1</text>
  <text class="d-text d-accent" x="155" y="124" text-anchor="middle">peak</text>
  <rect class="d-box" x="204" y="184" width="46" height="26" rx="4"/>
  <text class="d-text" x="227" y="174" text-anchor="middle">1</text>
  <text class="d-sub" x="227" y="236" text-anchor="middle">i=2</text>
  <rect class="d-box" x="276" y="132" width="46" height="78" rx="4"/>
  <text class="d-text" x="299" y="122" text-anchor="middle">3</text>
  <text class="d-sub" x="299" y="236" text-anchor="middle">i=3</text>
  <rect class="d-box" x="348" y="80" width="46" height="130" rx="4"/>
  <text class="d-text" x="371" y="70" text-anchor="middle">5</text>
  <text class="d-sub" x="371" y="236" text-anchor="middle">i=4</text>
  <rect class="d-box-accent" x="420" y="54" width="46" height="156" rx="4"/>
  <text class="d-text" x="443" y="44" text-anchor="middle">6</text>
  <text class="d-sub" x="443" y="236" text-anchor="middle">i=5</text>
  <text class="d-text d-accent" x="443" y="20" text-anchor="middle">peak</text>
  <rect class="d-box" x="492" y="106" width="46" height="104" rx="4"/>
  <text class="d-text" x="515" y="96" text-anchor="middle">4</text>
  <text class="d-sub" x="515" y="236" text-anchor="middle">i=6</text>
</svg>

In \`[1, 2, 1, 3, 5, 6, 4]\` both index 1 (value 2) and index 5 (value 6) are peaks. The problem accepts either one — that freedom is what lets us skip most of the array.

Why a peak always exists: walk from the left. Either the values keep rising to the end (then the last element is a peak, because its right side is minus infinity), or at some point the next value is smaller, and the element just before that drop is a peak.

## 4. Brute Force: Scan Left to Right

Check each element against its right neighbour and return the first index \`i\` with \`nums[i] > nums[i+1]\`; if no such index exists, the last index is the peak. This is correct and needs no extra memory, but on a rising array it reads every element.

📌 **Interview term: Linear scan** — visiting the elements one by one from the start; O(n) time. It is the baseline you mention first, then improve.

The scan is O(n). The array is not sorted, so most people assume O(n) is the best possible. It is not, and saying *why* is the heart of the answer.

## 5. The Key Insight: Follow the Slope

Pick any index \`mid\` and compare it with the element to its right:

- If \`nums[mid] < nums[mid+1]\`, the ground rises to the right. Starting at \`mid+1\` and walking right, the values either keep rising to the end (the last element is a peak) or drop somewhere (the element before the drop is a peak). **A peak is guaranteed in \`mid+1 .. hi\`.**
- Otherwise \`nums[mid] > nums[mid+1]\` (equal neighbours are excluded by the problem), so the ground falls to the right. By the mirror argument walking left from \`mid\`, **a peak is guaranteed in \`lo .. mid\`** — and \`mid\` itself may be it, so we keep it.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 286" role="img" aria-label="The two cases of the slope rule. Rising at mid keeps the right half, falling keeps the left half including mid">
  <defs>
    <marker id="b04q1-c-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="300" height="120" rx="10"/>
  <text class="d-text" x="180" y="62" text-anchor="middle">nums[mid] &lt; nums[mid+1]</text>
  <text class="d-sub" x="180" y="92" text-anchor="middle">the right side climbs</text>
  <text class="d-sub" x="180" y="120" text-anchor="middle">a peak exists in mid+1 .. hi</text>
  <rect class="d-box-muted" x="390" y="30" width="300" height="120" rx="10"/>
  <text class="d-text" x="540" y="62" text-anchor="middle">nums[mid] &gt; nums[mid+1]</text>
  <text class="d-sub" x="540" y="92" text-anchor="middle">the left side climbs</text>
  <text class="d-sub" x="540" y="120" text-anchor="middle">a peak exists in lo .. mid</text>
  <path class="d-edge" d="M 180 154 L 180 204" marker-end="url(#b04q1-c-python)"/>
  <path class="d-edge" d="M 540 154 L 540 204" marker-end="url(#b04q1-c-python)"/>
  <rect class="d-box-accent" x="30" y="210" width="300" height="56" rx="10"/>
  <text class="d-text" x="180" y="244" text-anchor="middle">lo = mid + 1</text>
  <rect class="d-box-accent" x="390" y="210" width="300" height="56" rx="10"/>
  <text class="d-text" x="540" y="244" text-anchor="middle">hi = mid</text>
</svg>

Each comparison throws away about half of the range, and the kept half always still contains a peak. That is the whole algorithm.

📌 **Interview term: Binary search on the slope** — binary search that decides which half to keep by comparing \`nums[mid]\` with its neighbour instead of with a target value. It works on unsorted data because the rule "a climbing side always contains a peak" is enough. The general binary search conditions are covered in [How does binary search work and what are its requirements?](/interview-question/how-does-binary-search-work-and-what-are-its-requirements)

📌 **Interview term: Loop invariant** — a statement that is true before and after every loop iteration. Here: *the range \`lo..hi\` always contains at least one peak*. When the loop stops with \`lo == hi\`, that single index must be the peak.

### Why \`while lo < hi\` and \`hi = mid\`

- The loop stops when one candidate is left, so \`lo < hi\` (not \`<=\`).
- Because \`lo < hi\`, \`mid\` is always strictly less than \`hi\`, so \`mid + 1\` is always a valid index — no bounds check is needed.
- In the falling case \`mid\` itself may be the peak, so we write \`hi = mid\`, not \`hi = mid - 1\`. Writing \`mid - 1\` can throw the peak away.
- In the rising case \`mid\` is definitely not a peak (its right neighbour is bigger), so \`lo = mid + 1\` is safe. Every iteration shrinks the range, so the loop always ends.

Here is the search on our array, exactly as the Example 2 trace prints it:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 306" role="img" aria-label="Binary search trace on 1 2 1 3 5 6 4. The active range shrinks from 0 to 6, then 4 to 6, then 4 to 5, ending at index 5">
  <defs>
    <marker id="b04q1-b-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="176" y="22" text-anchor="middle">i=0</text>
  <text class="d-sub" x="238" y="22" text-anchor="middle">i=1</text>
  <text class="d-sub" x="300" y="22" text-anchor="middle">i=2</text>
  <text class="d-sub" x="362" y="22" text-anchor="middle">i=3</text>
  <text class="d-sub" x="424" y="22" text-anchor="middle">i=4</text>
  <text class="d-sub" x="486" y="22" text-anchor="middle">i=5</text>
  <text class="d-sub" x="548" y="22" text-anchor="middle">i=6</text>
  <text class="d-text" x="70" y="61" text-anchor="middle">step 1</text>
  <rect class="d-box" x="150" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="176.0" y="61.0" text-anchor="middle">1</text>
  <rect class="d-box" x="212" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="238.0" y="61.0" text-anchor="middle">2</text>
  <rect class="d-box" x="274" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="300.0" y="61.0" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="336" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="362.0" y="61.0" text-anchor="middle">3</text>
  <rect class="d-box" x="398" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="424.0" y="61.0" text-anchor="middle">5</text>
  <rect class="d-box" x="460" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="61.0" text-anchor="middle">6</text>
  <rect class="d-box" x="522" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="548.0" y="61.0" text-anchor="middle">4</text>
  <text class="d-sub" x="630" y="61">3 &lt; 5: go right</text>
  <text class="d-text" x="70" y="131" text-anchor="middle">step 2</text>
  <rect class="d-box-muted" x="150" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="176.0" y="131.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="212" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="238.0" y="131.0" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="274" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="300.0" y="131.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="336" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="362.0" y="131.0" text-anchor="middle">3</text>
  <rect class="d-box" x="398" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="424.0" y="131.0" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="460" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="131.0" text-anchor="middle">6</text>
  <rect class="d-box" x="522" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="548.0" y="131.0" text-anchor="middle">4</text>
  <text class="d-sub" x="630" y="131">6 &gt; 4: keep left</text>
  <text class="d-text" x="70" y="201" text-anchor="middle">step 3</text>
  <rect class="d-box-muted" x="150" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="176.0" y="201.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="212" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="238.0" y="201.0" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="274" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="300.0" y="201.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="336" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="362.0" y="201.0" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="398" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="424.0" y="201.0" text-anchor="middle">5</text>
  <rect class="d-box" x="460" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="201.0" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="522" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="548.0" y="201.0" text-anchor="middle">4</text>
  <text class="d-sub" x="630" y="201">5 &lt; 6: go right</text>
  <text class="d-text d-accent" x="70" y="271" text-anchor="middle">result</text>
  <rect class="d-box-muted" x="150" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="176.0" y="271.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="212" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="238.0" y="271.0" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="274" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="300.0" y="271.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="336" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="362.0" y="271.0" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="398" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="424.0" y="271.0" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="460" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="271.0" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="522" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="548.0" y="271.0" text-anchor="middle">4</text>
  <text class="d-sub" x="630" y="271">lo = hi = 5</text>
</svg>

Three comparisons instead of six, and the answer is index 5 (value 6). A different but equally correct algorithm might return index 1 — both are accepted.

## 6. The Python Solution, Line by Line

~~~python
def find_peak(nums):
    """Return the index of any element strictly greater than its neighbours.
    Out-of-range neighbours count as minus infinity."""
    lo, hi = 0, len(nums) - 1
    while lo < hi:                      # stop when one candidate is left
        mid = (lo + hi) // 2            # Python ints never overflow
        if nums[mid] < nums[mid + 1]:   # rising slope: a peak is to the right
            lo = mid + 1
        else:                           # falling slope: mid or a peak to its left
            hi = mid
    return lo
~~~

- \`lo, hi = 0, len(nums) - 1\` uses tuple assignment to set both bounds in one line.
- \`mid = (lo + hi) // 2\` — the \`//\` operator is **floor division** and returns an \`int\`. Plain \`/\` returns a \`float\` (\`7 / 2\` is \`3.5\`), and \`nums[3.5]\` raises \`TypeError: list indices must be integers or slices, not float\`.
- Python integers have arbitrary precision, so \`lo + hi\` can never overflow. The \`lo + (hi - lo) // 2\` form you see in Java and C++ is unnecessary here, but writing it does no harm and shows you know why it exists.
- \`nums[mid + 1]\` is always valid because \`mid < hi\` inside the loop.
- On an empty list, \`hi\` is \`-1\`, the loop does not run and the function returns \`0\` — an invalid index. Add \`if not nums: return -1\` (or raise \`ValueError\`) if empty input is possible.

📌 **Interview term: Floor division** — Python \`//\`: divide and round down to an integer. For non-negative numbers it is the same as dropping the fraction.

## 7. Python Details That Matter

- **Recursion vs loop.** A recursive version is elegant, but CPython has no tail-call optimisation and a default recursion limit (\`sys.getrecursionlimit()\` returns 1000 on a standard build). Binary search only recurses about log2(n) deep, so it would be fine, but the loop is simpler and is what interviewers expect.
- **\`max(range(len(nums)), key=nums.__getitem__)\`** gives the global maximum in one line. It is a valid peak too, but it is O(n). Mention it as the brute force, not as the answer.
- **Do not use \`bisect\`.** The \`bisect\` module searches for a value in a *sorted* list; this array is not sorted and we are not searching for a value. The slope rule has to be written by hand.
- **Checking answers.** Because several peaks may be valid, test with a helper like \`is_peak(nums, i)\` rather than \`assert find_peak(x) == 5\` — Example 2 does exactly that.

## 8. Verified: Running the Code

Every program below was saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13.16). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — Find a peak on six inputs, including edge cases**

~~~text
2
5
0
0
4
2
~~~

**Example 2 — Trace the search, brute-force check 1,456 arrays, and count the work**

~~~text
lo=0 hi=6 mid=3: 3 < 5 -> go right
lo=4 hi=6 mid=5: 6 > 4 -> keep left half
lo=4 hi=5 mid=4: 5 < 6 -> go right
peak index 5
arrays tested 1456 all valid true
n=1000 linear compares 999 binary steps 9 same index true
n=1000000 linear compares 999999 binary steps 19 same index true
~~~

The brute-force check tried every array of length 1 to 6 over the values 0 to 3 with no two equal neighbours (1,456 arrays) and confirmed the returned index is a real peak every time. On a strictly rising array of one million elements the scan made 999,999 comparisons; the binary search made 19.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Linear scan | O(n) | O(1) | May read every element (999,999 comparisons for n = 1,000,000 in Example 2) |
| Binary search on the slope | O(log n) | O(1) | Each step halves the range: 19 steps for n = 1,000,000 |
| \`max(...)\` for the global maximum | O(n) | O(1) | Must see every element; there is no faster way to the highest one |

The \`O(1)\` space holds for the loop. A recursive version would use O(log n) call-stack frames. For how these classes compare, see [What is Big-O notation?](/interview-question/what-is-big-o-notation)

## 10. Edge Cases

- **One element** — \`[7]\`: the loop never runs, index 0 is returned. Both neighbours are minus infinity, so it is a peak.
- **Strictly falling** — \`[5, 4, 3, 2, 1]\`: every step takes \`hi = mid\`, ending at index 0.
- **Strictly rising** — \`[1, 2, 3, 4, 5]\`: every step takes \`lo = mid + 1\`, ending at the last index. This is the worst case for the linear scan.
- **Two peaks** — \`[2, 1, 2]\`: our code returns index 2; index 0 is also correct. Tests must accept any valid peak, which is why Example 2 checks the answer with \`is_peak\` instead of comparing to one fixed index.
- **Equal neighbours** — outside the problem contract; see the pitfalls.
- **Empty array** — no peak exists; guard it explicitly.

## 11. Common Pitfalls

- **Using \`/\` instead of \`//\`.** \`(lo + hi) / 2\` is a float in Python 3 and indexing with it raises \`TypeError\`.
- **Writing \`hi = mid - 1\` in the falling case.** \`mid\` itself can be the peak; dropping it can leave a range with no peak and return a wrong index.
- **Using \`while lo <= hi\`.** With \`hi = mid\` the range stops shrinking when \`lo == hi\`, so the loop never ends.
- **Ignoring equal neighbours.** With duplicates the slope rule is not safe: running the same function on \`[1, 1, 1, 2]\` returns index 0, which is not a strict peak, while index 3 is. Ask whether neighbours can be equal.
- **Forgetting the empty list.** \`find_peak([])\` returns \`0\` because the loop never runs; add an explicit guard.
- **Asserting one specific index in tests.** \`[2, 1, 2]\` has two valid answers; check the peak property instead.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">A peak is bigger than both neighbours, and outside the list counts as minus infinity, so a peak always exists and <strong style="color:#ffca28;">any</strong> peak is accepted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The brute force:</strong> <span style="color:#f0e2c8;">Scan once and return the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i] &gt; nums[i + 1]</code>, else the last index — O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The insight:</strong> <span style="color:#f0e2c8;">Compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[mid]</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[mid + 1]</code>. If it rises, a peak must exist to the right; if it falls, a peak exists at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> or to its left.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The code:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while lo &lt; hi</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid = (lo + hi) // 2</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid + 1</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code>. When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo == hi</code> that index is a peak. O(log n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The traps:</strong> <span style="color:#f0e2c8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">//</code> not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/</code>, keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code>, and say the proof needs unequal neighbours — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 1, 1, 2]</code> breaks it.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can binary search work when the list is not sorted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Binary search only needs a rule that tells you which half still contains an answer. Here the rule is: a side that climbs must contain a peak. Sortedness is one such rule, not the only one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if I want the largest element, not any peak?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then you need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(nums)</code> — O(n). A local test at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> cannot tell you whether a higher value hides somewhere else.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes if neighbours can be equal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The guarantee breaks: on a flat stretch you cannot tell which side climbs. Our function returns 0 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 1, 1, 2]</code>, which is wrong. The safe answer is an O(n) scan.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find a peak in a 2D grid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Binary search on columns: take the middle column, find its maximum cell, compare with the left and right neighbours, and move toward the bigger one. That is O(m log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does Python not need the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lo + (hi - lo) // 2</code> trick?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Python <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> has arbitrary precision, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo + hi</code> cannot overflow. In Java or C++ a 32-bit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> can overflow, which is why that form exists there.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Peak element (local maximum)** | An element strictly bigger than both neighbours; out-of-range counts as minus infinity |
| **Linear scan** | Check elements one by one; O(n) |
| **Binary search on the slope** | Keep the half that the neighbour comparison says must contain a peak |
| **Loop invariant** | A fact true on every iteration: the range always holds a peak |
| **Floor division** | Python \`//\`: divide and round down to an int |

---
**Conclusion:** Finding a peak is the clearest example that binary search needs a *rule*, not a sorted array: compare \`nums[mid]\` with \`nums[mid + 1]\`, keep the half that climbs, and the invariant "the range always contains a peak" carries you to the answer in O(log n). In Python the code is eight lines; the things that separate a strong answer are using \`//\`, keeping \`mid\` with \`hi = mid\`, guarding the empty list, and stating clearly that the trick depends on neighbours never being equal — the run on \`[1, 1, 1, 2]\` shows what happens otherwise.
`,
        examples: [
          { label: "Find a peak on six inputs, including edge cases", code: `def find_peak(nums):
    """Return the index of any element strictly greater than its neighbours.
    Out-of-range neighbours count as minus infinity."""
    lo, hi = 0, len(nums) - 1
    while lo < hi:                      # stop when one candidate is left
        mid = (lo + hi) // 2            # Python ints never overflow
        if nums[mid] < nums[mid + 1]:   # rising slope: a peak is to the right
            lo = mid + 1
        else:                           # falling slope: mid or a peak to its left
            hi = mid
    return lo


print(find_peak([1, 2, 3, 1]))           # 2
print(find_peak([1, 2, 1, 3, 5, 6, 4]))  # 5
print(find_peak([7]))                    # 0
print(find_peak([5, 4, 3, 2, 1]))        # 0
print(find_peak([1, 2, 3, 4, 5]))        # 4
print(find_peak([2, 1, 2]))              # 2` },
          { label: "Trace the search, brute-force check 1,456 arrays, and count the work", code: `def find_peak_traced(nums, log):
    lo, hi = 0, len(nums) - 1
    steps = 0
    while lo < hi:
        mid = (lo + hi) // 2
        steps += 1
        if nums[mid] < nums[mid + 1]:
            log.append(f"lo={lo} hi={hi} mid={mid}: {nums[mid]} < {nums[mid + 1]} -> go right")
            lo = mid + 1
        else:
            log.append(f"lo={lo} hi={hi} mid={mid}: {nums[mid]} > {nums[mid + 1]} -> keep left half")
            hi = mid
    return lo, steps


def linear_peak(nums):
    comparisons = 0
    for i in range(len(nums) - 1):
        comparisons += 1
        if nums[i] > nums[i + 1]:
            return i, comparisons
    return len(nums) - 1, comparisons


def is_peak(nums, i):
    left_ok = i == 0 or nums[i] > nums[i - 1]
    right_ok = i == len(nums) - 1 or nums[i] > nums[i + 1]
    return left_ok and right_ok


# 1) Trace one search
log = []
idx, _ = find_peak_traced([1, 2, 1, 3, 5, 6, 4], log)
for line in log:
    print(line)
print("peak index", idx)

# 2) Brute-force check: every array of length 1..6 over values 0..3
#    with no two equal neighbours (the problem guarantees that)
def all_arrays(length):
    if length == 0:
        return [[]]
    out = []
    for prefix in all_arrays(length - 1):
        for v in range(4):
            if not prefix or prefix[-1] != v:
                out.append(prefix + [v])
    return out

tested = 0
ok = True
for n in range(1, 7):
    for arr in all_arrays(n):
        tested += 1
        i, _ = find_peak_traced(arr, [])
        ok = ok and is_peak(arr, i)
print("arrays tested", tested, "all valid", str(ok).lower())

# 3) Work done on a strictly increasing array (worst case for the scan)
for n in [1000, 1000000]:
    arr = list(range(n))
    li, lc = linear_peak(arr)
    bi, bc = find_peak_traced(arr, [])
    print("n=" + str(n), "linear compares", lc, "binary steps", bc, "same index", str(li == bi).lower())` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an array of numbers where no two neighbours are equal, return the index of any peak — an element bigger than both its neighbours, with the outside of the array counting as minus infinity. Please write it in JavaScript and do better than linear time."

**What a strong answer should cover:**
- A peak always exists because out-of-range neighbours are minus infinity; any peak is accepted.
- The O(n) scan first, then binary search on the slope: compare \`nums[mid]\` with \`nums[mid + 1]\` and keep the half that must contain a peak.
- The loop invariant, and why the loop is \`while (lo < hi)\` with \`hi = mid\`.
- O(log n) time, O(1) space; the global maximum still needs O(n).
- JavaScript specifics: \`/\` always produces a float, so use \`Math.floor\`; \`(lo + hi) >> 1\` silently breaks above 2^31; reading past the end gives \`undefined\`, and comparisons with \`undefined\` are always \`false\`.

**Clarifying questions expected:**
- "Any peak or the highest one?"
- "Can neighbours be equal?"
- "What should an empty array return?"

**Code / implementation expected:** Yes — an iterative \`findPeak(nums)\` function in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array and a loop are; binary search is explained from scratch.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the JavaScript programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

You are hiking in thick fog. You cannot see the mountain range, only the ground one step to your left and one step to your right. Your task is not to find the *highest* mountain — just to stand on *a* summit, any spot where both sides go down.

The slow plan is to walk the whole trail from one end and stop at the first spot where the ground drops. The clever plan: look at the ground just ahead. If it goes **up**, keep walking that way — a path that climbs must eventually either hit a summit or reach the end of the trail, and the end of the trail counts as a summit because past it there is a cliff. If it goes **down**, you are already on a downhill, so a summit is behind you (maybe right where you stand).

Better still, you do not have to walk at all: jump to the **middle** of the trail, check which way the ground slopes, and throw away the half that you know you do not need. Each jump halves the trail. A trail of a million steps is settled in 20 jumps. That jump-and-halve trick is binary search, applied to something that is **not sorted** — which is exactly why interviewers like this question.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| "Do you want **any** peak or the **highest** element?" | Any peak can be found in O(log n). The global maximum needs every element looked at — O(n), no shortcut. |
| "Can two neighbours be equal?" | The O(log n) proof needs \`nums[i] != nums[i+1]\`. With flat stretches the slope rule can stop on a non-peak (shown in the Pitfalls). |
| "Do positions outside the array count as minus infinity?" | That convention (LeetCode 162 uses it) means the first and last elements can be peaks and a peak always exists. |
| "Index or value?" | Usually the index. Returning the value loses where it was. |
| "Can the array be empty?" | With no elements there is no peak; decide whether to return -1 or throw. |

## 3. What Exactly Is a Peak?

A **peak** is an element strictly bigger than the element on its left and the element on its right. Positions outside the array are treated as minus infinity, so the first element only has to beat its right neighbour and the last element only has to beat its left neighbour.

📌 **Interview term: Peak element (local maximum)** — an index \`i\` where \`nums[i] > nums[i-1]\` and \`nums[i] > nums[i+1]\`, with out-of-range neighbours counted as minus infinity. A *local* maximum is only bigger than its neighbours; the *global* maximum is bigger than everything.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 252" role="img" aria-label="Bar chart of the array 1 2 1 3 5 6 4 with two peaks highlighted at index 1 and index 5">
  <defs>
    <marker id="b04q1-a-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="60" y="184" width="46" height="26" rx="4"/>
  <text class="d-text" x="83" y="174" text-anchor="middle">1</text>
  <text class="d-sub" x="83" y="236" text-anchor="middle">i=0</text>
  <rect class="d-box-accent" x="132" y="158" width="46" height="52" rx="4"/>
  <text class="d-text" x="155" y="148" text-anchor="middle">2</text>
  <text class="d-sub" x="155" y="236" text-anchor="middle">i=1</text>
  <text class="d-text d-accent" x="155" y="124" text-anchor="middle">peak</text>
  <rect class="d-box" x="204" y="184" width="46" height="26" rx="4"/>
  <text class="d-text" x="227" y="174" text-anchor="middle">1</text>
  <text class="d-sub" x="227" y="236" text-anchor="middle">i=2</text>
  <rect class="d-box" x="276" y="132" width="46" height="78" rx="4"/>
  <text class="d-text" x="299" y="122" text-anchor="middle">3</text>
  <text class="d-sub" x="299" y="236" text-anchor="middle">i=3</text>
  <rect class="d-box" x="348" y="80" width="46" height="130" rx="4"/>
  <text class="d-text" x="371" y="70" text-anchor="middle">5</text>
  <text class="d-sub" x="371" y="236" text-anchor="middle">i=4</text>
  <rect class="d-box-accent" x="420" y="54" width="46" height="156" rx="4"/>
  <text class="d-text" x="443" y="44" text-anchor="middle">6</text>
  <text class="d-sub" x="443" y="236" text-anchor="middle">i=5</text>
  <text class="d-text d-accent" x="443" y="20" text-anchor="middle">peak</text>
  <rect class="d-box" x="492" y="106" width="46" height="104" rx="4"/>
  <text class="d-text" x="515" y="96" text-anchor="middle">4</text>
  <text class="d-sub" x="515" y="236" text-anchor="middle">i=6</text>
</svg>

In \`[1, 2, 1, 3, 5, 6, 4]\` both index 1 (value 2) and index 5 (value 6) are peaks. The problem accepts either one — that freedom is what lets us skip most of the array.

Why a peak always exists: walk from the left. Either the values keep rising to the end (then the last element is a peak, because its right side is minus infinity), or at some point the next value is smaller, and the element just before that drop is a peak.

## 4. Brute Force: Scan Left to Right

Check each element against its right neighbour and return the first index \`i\` with \`nums[i] > nums[i+1]\`; if no such index exists, the last index is the peak. This is correct and needs no extra memory, but on a rising array it reads every element.

📌 **Interview term: Linear scan** — visiting the elements one by one from the start; O(n) time. It is the baseline you mention first, then improve.

The scan is O(n). The array is not sorted, so most people assume O(n) is the best possible. It is not, and saying *why* is the heart of the answer.

## 5. The Key Insight: Follow the Slope

Pick any index \`mid\` and compare it with the element to its right:

- If \`nums[mid] < nums[mid+1]\`, the ground rises to the right. Starting at \`mid+1\` and walking right, the values either keep rising to the end (the last element is a peak) or drop somewhere (the element before the drop is a peak). **A peak is guaranteed in \`mid+1 .. hi\`.**
- Otherwise \`nums[mid] > nums[mid+1]\` (equal neighbours are excluded by the problem), so the ground falls to the right. By the mirror argument walking left from \`mid\`, **a peak is guaranteed in \`lo .. mid\`** — and \`mid\` itself may be it, so we keep it.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 286" role="img" aria-label="The two cases of the slope rule. Rising at mid keeps the right half, falling keeps the left half including mid">
  <defs>
    <marker id="b04q1-c-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="300" height="120" rx="10"/>
  <text class="d-text" x="180" y="62" text-anchor="middle">nums[mid] &lt; nums[mid+1]</text>
  <text class="d-sub" x="180" y="92" text-anchor="middle">the right side climbs</text>
  <text class="d-sub" x="180" y="120" text-anchor="middle">a peak exists in mid+1 .. hi</text>
  <rect class="d-box-muted" x="390" y="30" width="300" height="120" rx="10"/>
  <text class="d-text" x="540" y="62" text-anchor="middle">nums[mid] &gt; nums[mid+1]</text>
  <text class="d-sub" x="540" y="92" text-anchor="middle">the left side climbs</text>
  <text class="d-sub" x="540" y="120" text-anchor="middle">a peak exists in lo .. mid</text>
  <path class="d-edge" d="M 180 154 L 180 204" marker-end="url(#b04q1-c-javascript)"/>
  <path class="d-edge" d="M 540 154 L 540 204" marker-end="url(#b04q1-c-javascript)"/>
  <rect class="d-box-accent" x="30" y="210" width="300" height="56" rx="10"/>
  <text class="d-text" x="180" y="244" text-anchor="middle">lo = mid + 1</text>
  <rect class="d-box-accent" x="390" y="210" width="300" height="56" rx="10"/>
  <text class="d-text" x="540" y="244" text-anchor="middle">hi = mid</text>
</svg>

Each comparison throws away about half of the range, and the kept half always still contains a peak. That is the whole algorithm.

📌 **Interview term: Binary search on the slope** — binary search that decides which half to keep by comparing \`nums[mid]\` with its neighbour instead of with a target value. It works on unsorted data because the rule "a climbing side always contains a peak" is enough. The general binary search conditions are covered in [How does binary search work and what are its requirements?](/interview-question/how-does-binary-search-work-and-what-are-its-requirements)

📌 **Interview term: Loop invariant** — a statement that is true before and after every loop iteration. Here: *the range \`lo..hi\` always contains at least one peak*. When the loop stops with \`lo == hi\`, that single index must be the peak.

### Why \`while lo < hi\` and \`hi = mid\`

- The loop stops when one candidate is left, so \`lo < hi\` (not \`<=\`).
- Because \`lo < hi\`, \`mid\` is always strictly less than \`hi\`, so \`mid + 1\` is always a valid index — no bounds check is needed.
- In the falling case \`mid\` itself may be the peak, so we write \`hi = mid\`, not \`hi = mid - 1\`. Writing \`mid - 1\` can throw the peak away.
- In the rising case \`mid\` is definitely not a peak (its right neighbour is bigger), so \`lo = mid + 1\` is safe. Every iteration shrinks the range, so the loop always ends.

Here is the search on our array, exactly as the Example 2 trace prints it:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 306" role="img" aria-label="Binary search trace on 1 2 1 3 5 6 4. The active range shrinks from 0 to 6, then 4 to 6, then 4 to 5, ending at index 5">
  <defs>
    <marker id="b04q1-b-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="176" y="22" text-anchor="middle">i=0</text>
  <text class="d-sub" x="238" y="22" text-anchor="middle">i=1</text>
  <text class="d-sub" x="300" y="22" text-anchor="middle">i=2</text>
  <text class="d-sub" x="362" y="22" text-anchor="middle">i=3</text>
  <text class="d-sub" x="424" y="22" text-anchor="middle">i=4</text>
  <text class="d-sub" x="486" y="22" text-anchor="middle">i=5</text>
  <text class="d-sub" x="548" y="22" text-anchor="middle">i=6</text>
  <text class="d-text" x="70" y="61" text-anchor="middle">step 1</text>
  <rect class="d-box" x="150" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="176.0" y="61.0" text-anchor="middle">1</text>
  <rect class="d-box" x="212" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="238.0" y="61.0" text-anchor="middle">2</text>
  <rect class="d-box" x="274" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="300.0" y="61.0" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="336" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="362.0" y="61.0" text-anchor="middle">3</text>
  <rect class="d-box" x="398" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="424.0" y="61.0" text-anchor="middle">5</text>
  <rect class="d-box" x="460" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="61.0" text-anchor="middle">6</text>
  <rect class="d-box" x="522" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="548.0" y="61.0" text-anchor="middle">4</text>
  <text class="d-sub" x="630" y="61">3 &lt; 5: go right</text>
  <text class="d-text" x="70" y="131" text-anchor="middle">step 2</text>
  <rect class="d-box-muted" x="150" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="176.0" y="131.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="212" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="238.0" y="131.0" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="274" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="300.0" y="131.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="336" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="362.0" y="131.0" text-anchor="middle">3</text>
  <rect class="d-box" x="398" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="424.0" y="131.0" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="460" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="131.0" text-anchor="middle">6</text>
  <rect class="d-box" x="522" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="548.0" y="131.0" text-anchor="middle">4</text>
  <text class="d-sub" x="630" y="131">6 &gt; 4: keep left</text>
  <text class="d-text" x="70" y="201" text-anchor="middle">step 3</text>
  <rect class="d-box-muted" x="150" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="176.0" y="201.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="212" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="238.0" y="201.0" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="274" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="300.0" y="201.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="336" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="362.0" y="201.0" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="398" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="424.0" y="201.0" text-anchor="middle">5</text>
  <rect class="d-box" x="460" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="201.0" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="522" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="548.0" y="201.0" text-anchor="middle">4</text>
  <text class="d-sub" x="630" y="201">5 &lt; 6: go right</text>
  <text class="d-text d-accent" x="70" y="271" text-anchor="middle">result</text>
  <rect class="d-box-muted" x="150" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="176.0" y="271.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="212" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="238.0" y="271.0" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="274" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="300.0" y="271.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="336" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="362.0" y="271.0" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="398" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="424.0" y="271.0" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="460" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="271.0" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="522" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="548.0" y="271.0" text-anchor="middle">4</text>
  <text class="d-sub" x="630" y="271">lo = hi = 5</text>
</svg>

Three comparisons instead of six, and the answer is index 5 (value 6). A different but equally correct algorithm might return index 1 — both are accepted.

## 6. The JavaScript Solution, Line by Line

~~~javascript
function findPeak(nums) {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo < hi) {                       // stop when one candidate is left
    const mid = Math.floor((lo + hi) / 2); // plain "/" would give 2.5
    if (nums[mid] < nums[mid + 1]) {      // rising slope: a peak is to the right
      lo = mid + 1;
    } else {                              // falling slope: mid or a peak to its left
      hi = mid;
    }
  }
  return lo;
}
~~~

- \`Math.floor((lo + hi) / 2)\` — JavaScript has one number type (a 64-bit float), so \`/\` never does integer division: \`7 / 2\` is \`3.5\`, and \`nums[3.5]\` is \`undefined\` (it looks up a property named \`"3.5"\`), which silently breaks the search instead of throwing.
- Many solutions write \`(lo + hi) >> 1\`. Bitwise operators convert their operands to 32-bit signed integers. We ran \`(2**31 + 2**31 + 2) >> 1\` and got \`1\`, while \`Math.floor(...)\` gave the correct \`2147483649\`. Arrays that large are rare, but \`Math.floor\` has no such limit.
- \`nums[mid + 1]\` is always in range because \`mid < hi\`. If you ever read past the end, you get \`undefined\`, and \`x < undefined\` is \`false\` for every \`x\` — the code keeps running with a wrong answer rather than crashing.
- On an empty array \`hi\` is \`-1\`, the loop does not run and \`0\` is returned. Guard with \`if (nums.length === 0) return -1;\`.

📌 **Interview term: Integer division** — division that drops the fraction. JavaScript has no integer division operator, so you combine \`/\` with \`Math.floor\` (or \`Math.trunc\`).

## 7. JavaScript Details That Matter

- **\`const\` vs \`let\`.** \`mid\` is recreated every iteration, so \`const\` is correct inside the loop; \`lo\` and \`hi\` change, so they need \`let\`.
- **Strict comparison.** Use \`<\` on numbers only. If the input could contain numeric strings, \`"10" < "9"\` is \`true\` (string comparison) — convert with \`Number\` first.
- **\`indexOf(Math.max(...nums))\`** finds the global maximum in one line, but it is O(n), and spreading a very large array into \`Math.max\` passes every element as an argument: in our Node 22 run, \`Math.max(...new Array(1e7).fill(1))\` threw \`RangeError: Maximum call stack size exceeded\`. Use a loop for the brute force.
- **Testing.** Several peaks may be valid, so check the result with an \`isPeak(nums, i)\` helper (Example 2) rather than comparing with one fixed index.

## 8. Verified: Running the Code

Every program below was saved as \`main.js\` and run with \`node main.js\` (Node.js v22.22.0). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — Find a peak on six inputs, including edge cases**

~~~text
2
5
0
0
4
2
~~~

**Example 2 — Trace the search, brute-force check 1,456 arrays, and count the work**

~~~text
lo=0 hi=6 mid=3: 3 < 5 -> go right
lo=4 hi=6 mid=5: 6 > 4 -> keep left half
lo=4 hi=5 mid=4: 5 < 6 -> go right
peak index 5
arrays tested 1456 all valid true
n=1000 linear compares 999 binary steps 9 same index true
n=1000000 linear compares 999999 binary steps 19 same index true
~~~

The brute-force check tried every array of length 1 to 6 over the values 0 to 3 with no two equal neighbours (1,456 arrays) and confirmed the returned index is a real peak every time. On a strictly rising array of one million elements the scan made 999,999 comparisons; the binary search made 19.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Linear scan | O(n) | O(1) | May read every element (999,999 comparisons for n = 1,000,000 in Example 2) |
| Binary search on the slope | O(log n) | O(1) | Each step halves the range: 19 steps for n = 1,000,000 |
| \`Math.max(...nums)\` for the global maximum | O(n) | O(n) for the spread arguments | Must see every element |

A recursive version would add O(log n) call-stack frames. For how these classes compare, see [What is Big-O notation?](/interview-question/what-is-big-o-notation)

## 10. Edge Cases

- **One element** — \`[7]\`: the loop never runs, index 0 is returned. Both neighbours are minus infinity, so it is a peak.
- **Strictly falling** — \`[5, 4, 3, 2, 1]\`: every step takes \`hi = mid\`, ending at index 0.
- **Strictly rising** — \`[1, 2, 3, 4, 5]\`: every step takes \`lo = mid + 1\`, ending at the last index. This is the worst case for the linear scan.
- **Two peaks** — \`[2, 1, 2]\`: our code returns index 2; index 0 is also correct. Tests must accept any valid peak, which is why Example 2 checks the answer with \`is_peak\` instead of comparing to one fixed index.
- **Equal neighbours** — outside the problem contract; see the pitfalls.
- **Empty array** — no peak exists; guard it explicitly.

## 11. Common Pitfalls

- **Indexing with a float.** \`nums[(lo + hi) / 2]\` is \`undefined\` for odd sums; JavaScript does not throw, it just compares with \`undefined\` and returns a wrong index.
- **Using \`>> 1\` on huge indices.** Bitwise operators work on 32-bit integers; above 2^31 the midpoint wraps (our run printed \`1\`).
- **Writing \`hi = mid - 1\` in the falling case.** \`mid\` may be the only peak in the range.
- **Using \`while (lo <= hi)\` with \`hi = mid\`.** The range stops shrinking at \`lo === hi\` and the loop never ends.
- **Ignoring equal neighbours.** The same function returns \`0\` for \`[1, 1, 1, 2]\`, which is not a peak. Ask about duplicates.
- **Forgetting the empty array.** \`findPeak([])\` returns \`0\`; guard it.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">A peak beats both neighbours, outside the array is minus infinity, so a peak always exists and <strong style="color:#ffca28;">any</strong> peak is accepted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The brute force:</strong> <span style="color:#f0e2c8;">Scan once and return the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i] &gt; nums[i + 1]</code>, else the last index — O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The insight:</strong> <span style="color:#f0e2c8;">Compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[mid]</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[mid + 1]</code>: rising means a peak exists to the right, falling means one exists at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> or to its left.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The code:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while (lo &lt; hi)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid = Math.floor((lo + hi) / 2)</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid + 1</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code>. O(log n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The traps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/</code> gives floats and out-of-range reads give <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> silently; keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code>; duplicates break the guarantee.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does binary search work on an unsorted array here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It only needs a rule that says which half still holds an answer. A climbing side always contains a peak, so we can discard the other half.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(lo + hi) &gt;&gt; 1</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bitwise operators convert to 32-bit signed integers. Above 2^31 the result wraps — our run of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(2<strong style="color:#ffca28;">31 + 2</strong>31 + 2) &gt;&gt; 1</code> printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.floor</code> works for any safe integer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if I need the largest element?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That needs a full pass — O(n). A local comparison at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> cannot rule out a bigger value elsewhere.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with equal neighbours?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The rule fails on flat stretches: our function returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 1, 1, 2]</code>. Fall back to an O(n) scan.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run it on many arrays and check the peak property with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isPeak</code> — Example 2 checks all 1,456 arrays of length 1 to 6 over values 0 to 3 with no equal neighbours.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Peak element (local maximum)** | An element strictly bigger than both neighbours; out-of-range counts as minus infinity |
| **Linear scan** | Check elements one by one; O(n) |
| **Binary search on the slope** | Keep the half that the neighbour comparison says must contain a peak |
| **Loop invariant** | A fact true on every iteration: the range always holds a peak |
| **Integer division** | Dividing and dropping the fraction; in JavaScript \`Math.floor(a / b)\` |

---
**Conclusion:** A peak can be found in O(log n) even though the array is not sorted, because comparing \`nums[mid]\` with \`nums[mid + 1]\` tells you which half must still contain a peak. In JavaScript the algorithm is short, and the details an interviewer listens for are the number-type ones: \`/\` never gives an integer, \`>> 1\` wraps above 2^31, and reading past the end returns \`undefined\` instead of throwing. Add the invariant, \`hi = mid\`, and the equal-neighbour caveat, and the answer is complete.
`,
        examples: [
          { label: "Find a peak on six inputs, including edge cases", code: `// Return the index of any element strictly greater than its neighbours.
// Out-of-range neighbours count as minus infinity.
function findPeak(nums) {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo < hi) {                       // stop when one candidate is left
    const mid = Math.floor((lo + hi) / 2); // plain "/" would give 2.5
    if (nums[mid] < nums[mid + 1]) {      // rising slope: a peak is to the right
      lo = mid + 1;
    } else {                              // falling slope: mid or a peak to its left
      hi = mid;
    }
  }
  return lo;
}

console.log(findPeak([1, 2, 3, 1]));           // 2
console.log(findPeak([1, 2, 1, 3, 5, 6, 4]));  // 5
console.log(findPeak([7]));                    // 0
console.log(findPeak([5, 4, 3, 2, 1]));        // 0
console.log(findPeak([1, 2, 3, 4, 5]));        // 4
console.log(findPeak([2, 1, 2]));              // 2` },
          { label: "Trace the search, brute-force check 1,456 arrays, and count the work", code: `function findPeakTraced(nums, log) {
  let lo = 0, hi = nums.length - 1, steps = 0;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    steps++;
    if (nums[mid] < nums[mid + 1]) {
      log.push('lo=' + lo + ' hi=' + hi + ' mid=' + mid + ': ' + nums[mid] + ' < ' + nums[mid + 1] + ' -> go right');
      lo = mid + 1;
    } else {
      log.push('lo=' + lo + ' hi=' + hi + ' mid=' + mid + ': ' + nums[mid] + ' > ' + nums[mid + 1] + ' -> keep left half');
      hi = mid;
    }
  }
  return [lo, steps];
}

function linearPeak(nums) {
  let comparisons = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    comparisons++;
    if (nums[i] > nums[i + 1]) return [i, comparisons];
  }
  return [nums.length - 1, comparisons];
}

function isPeak(nums, i) {
  const leftOk = i === 0 || nums[i] > nums[i - 1];
  const rightOk = i === nums.length - 1 || nums[i] > nums[i + 1];
  return leftOk && rightOk;
}

// 1) Trace one search
const log = [];
const idx = findPeakTraced([1, 2, 1, 3, 5, 6, 4], log)[0];
for (const line of log) console.log(line);
console.log('peak index ' + idx);

// 2) Brute-force check: every array of length 1..6 over values 0..3
//    with no two equal neighbours (the problem guarantees that)
function allArrays(length) {
  if (length === 0) return [[]];
  const out = [];
  for (const prefix of allArrays(length - 1)) {
    for (let v = 0; v < 4; v++) {
      if (prefix.length === 0 || prefix[prefix.length - 1] !== v) out.push(prefix.concat([v]));
    }
  }
  return out;
}

let tested = 0, ok = true;
for (let n = 1; n <= 6; n++) {
  for (const arr of allArrays(n)) {
    tested++;
    ok = ok && isPeak(arr, findPeakTraced(arr, [])[0]);
  }
}
console.log('arrays tested ' + tested + ' all valid ' + ok);

// 3) Work done on a strictly increasing array (worst case for the scan)
for (const n of [1000, 1000000]) {
  const arr = Array.from({ length: n }, (_, i) => i);
  const [li, lc] = linearPeak(arr);
  const [bi, bc] = findPeakTraced(arr, []);
  console.log('n=' + n + ' linear compares ' + lc + ' binary steps ' + bc + ' same index ' + (li === bi));
}` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an \`int\` array where no two neighbours are equal, return the index of any peak — an element bigger than both its neighbours, with the outside of the array counting as minus infinity. Please write it in Java in better than linear time."

**What a strong answer should cover:**
- A peak always exists because out-of-range neighbours are minus infinity; any peak is accepted.
- The O(n) scan first, then binary search on the slope: compare \`nums[mid]\` with \`nums[mid + 1]\` and keep the half that must contain a peak.
- The loop invariant and why the loop is \`while (lo < hi)\` with \`hi = mid\`.
- O(log n) time, O(1) space; the global maximum still needs O(n).
- Java specifics: \`(lo + hi) / 2\` can overflow \`int\`, so write \`lo + (hi - lo) / 2\` or \`(lo + hi) >>> 1\`; \`int\` division already truncates; out-of-range access throws \`ArrayIndexOutOfBoundsException\`.

**Clarifying questions expected:**
- "Any peak or the highest one?"
- "Can neighbours be equal?"
- "What should an empty array return?"

**Code / implementation expected:** Yes — a \`static int findPeak(int[] nums)\` method in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array and a loop are; binary search is explained from scratch.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the Java programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

You are hiking in thick fog. You cannot see the mountain range, only the ground one step to your left and one step to your right. Your task is not to find the *highest* mountain — just to stand on *a* summit, any spot where both sides go down.

The slow plan is to walk the whole trail from one end and stop at the first spot where the ground drops. The clever plan: look at the ground just ahead. If it goes **up**, keep walking that way — a path that climbs must eventually either hit a summit or reach the end of the trail, and the end of the trail counts as a summit because past it there is a cliff. If it goes **down**, you are already on a downhill, so a summit is behind you (maybe right where you stand).

Better still, you do not have to walk at all: jump to the **middle** of the trail, check which way the ground slopes, and throw away the half that you know you do not need. Each jump halves the trail. A trail of a million steps is settled in 20 jumps. That jump-and-halve trick is binary search, applied to something that is **not sorted** — which is exactly why interviewers like this question.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| "Do you want **any** peak or the **highest** element?" | Any peak can be found in O(log n). The global maximum needs every element looked at — O(n), no shortcut. |
| "Can two neighbours be equal?" | The O(log n) proof needs \`nums[i] != nums[i+1]\`. With flat stretches the slope rule can stop on a non-peak (shown in the Pitfalls). |
| "Do positions outside the array count as minus infinity?" | That convention (LeetCode 162 uses it) means the first and last elements can be peaks and a peak always exists. |
| "Index or value?" | Usually the index. Returning the value loses where it was. |
| "Can the array be empty?" | With no elements there is no peak; decide whether to return -1 or throw. |

## 3. What Exactly Is a Peak?

A **peak** is an element strictly bigger than the element on its left and the element on its right. Positions outside the array are treated as minus infinity, so the first element only has to beat its right neighbour and the last element only has to beat its left neighbour.

📌 **Interview term: Peak element (local maximum)** — an index \`i\` where \`nums[i] > nums[i-1]\` and \`nums[i] > nums[i+1]\`, with out-of-range neighbours counted as minus infinity. A *local* maximum is only bigger than its neighbours; the *global* maximum is bigger than everything.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 252" role="img" aria-label="Bar chart of the array 1 2 1 3 5 6 4 with two peaks highlighted at index 1 and index 5">
  <defs>
    <marker id="b04q1-a-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="60" y="184" width="46" height="26" rx="4"/>
  <text class="d-text" x="83" y="174" text-anchor="middle">1</text>
  <text class="d-sub" x="83" y="236" text-anchor="middle">i=0</text>
  <rect class="d-box-accent" x="132" y="158" width="46" height="52" rx="4"/>
  <text class="d-text" x="155" y="148" text-anchor="middle">2</text>
  <text class="d-sub" x="155" y="236" text-anchor="middle">i=1</text>
  <text class="d-text d-accent" x="155" y="124" text-anchor="middle">peak</text>
  <rect class="d-box" x="204" y="184" width="46" height="26" rx="4"/>
  <text class="d-text" x="227" y="174" text-anchor="middle">1</text>
  <text class="d-sub" x="227" y="236" text-anchor="middle">i=2</text>
  <rect class="d-box" x="276" y="132" width="46" height="78" rx="4"/>
  <text class="d-text" x="299" y="122" text-anchor="middle">3</text>
  <text class="d-sub" x="299" y="236" text-anchor="middle">i=3</text>
  <rect class="d-box" x="348" y="80" width="46" height="130" rx="4"/>
  <text class="d-text" x="371" y="70" text-anchor="middle">5</text>
  <text class="d-sub" x="371" y="236" text-anchor="middle">i=4</text>
  <rect class="d-box-accent" x="420" y="54" width="46" height="156" rx="4"/>
  <text class="d-text" x="443" y="44" text-anchor="middle">6</text>
  <text class="d-sub" x="443" y="236" text-anchor="middle">i=5</text>
  <text class="d-text d-accent" x="443" y="20" text-anchor="middle">peak</text>
  <rect class="d-box" x="492" y="106" width="46" height="104" rx="4"/>
  <text class="d-text" x="515" y="96" text-anchor="middle">4</text>
  <text class="d-sub" x="515" y="236" text-anchor="middle">i=6</text>
</svg>

In \`[1, 2, 1, 3, 5, 6, 4]\` both index 1 (value 2) and index 5 (value 6) are peaks. The problem accepts either one — that freedom is what lets us skip most of the array.

Why a peak always exists: walk from the left. Either the values keep rising to the end (then the last element is a peak, because its right side is minus infinity), or at some point the next value is smaller, and the element just before that drop is a peak.

## 4. Brute Force: Scan Left to Right

Check each element against its right neighbour and return the first index \`i\` with \`nums[i] > nums[i+1]\`; if no such index exists, the last index is the peak. This is correct and needs no extra memory, but on a rising array it reads every element.

📌 **Interview term: Linear scan** — visiting the elements one by one from the start; O(n) time. It is the baseline you mention first, then improve.

The scan is O(n). The array is not sorted, so most people assume O(n) is the best possible. It is not, and saying *why* is the heart of the answer.

## 5. The Key Insight: Follow the Slope

Pick any index \`mid\` and compare it with the element to its right:

- If \`nums[mid] < nums[mid+1]\`, the ground rises to the right. Starting at \`mid+1\` and walking right, the values either keep rising to the end (the last element is a peak) or drop somewhere (the element before the drop is a peak). **A peak is guaranteed in \`mid+1 .. hi\`.**
- Otherwise \`nums[mid] > nums[mid+1]\` (equal neighbours are excluded by the problem), so the ground falls to the right. By the mirror argument walking left from \`mid\`, **a peak is guaranteed in \`lo .. mid\`** — and \`mid\` itself may be it, so we keep it.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 286" role="img" aria-label="The two cases of the slope rule. Rising at mid keeps the right half, falling keeps the left half including mid">
  <defs>
    <marker id="b04q1-c-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="300" height="120" rx="10"/>
  <text class="d-text" x="180" y="62" text-anchor="middle">nums[mid] &lt; nums[mid+1]</text>
  <text class="d-sub" x="180" y="92" text-anchor="middle">the right side climbs</text>
  <text class="d-sub" x="180" y="120" text-anchor="middle">a peak exists in mid+1 .. hi</text>
  <rect class="d-box-muted" x="390" y="30" width="300" height="120" rx="10"/>
  <text class="d-text" x="540" y="62" text-anchor="middle">nums[mid] &gt; nums[mid+1]</text>
  <text class="d-sub" x="540" y="92" text-anchor="middle">the left side climbs</text>
  <text class="d-sub" x="540" y="120" text-anchor="middle">a peak exists in lo .. mid</text>
  <path class="d-edge" d="M 180 154 L 180 204" marker-end="url(#b04q1-c-java)"/>
  <path class="d-edge" d="M 540 154 L 540 204" marker-end="url(#b04q1-c-java)"/>
  <rect class="d-box-accent" x="30" y="210" width="300" height="56" rx="10"/>
  <text class="d-text" x="180" y="244" text-anchor="middle">lo = mid + 1</text>
  <rect class="d-box-accent" x="390" y="210" width="300" height="56" rx="10"/>
  <text class="d-text" x="540" y="244" text-anchor="middle">hi = mid</text>
</svg>

Each comparison throws away about half of the range, and the kept half always still contains a peak. That is the whole algorithm.

📌 **Interview term: Binary search on the slope** — binary search that decides which half to keep by comparing \`nums[mid]\` with its neighbour instead of with a target value. It works on unsorted data because the rule "a climbing side always contains a peak" is enough. The general binary search conditions are covered in [How does binary search work and what are its requirements?](/interview-question/how-does-binary-search-work-and-what-are-its-requirements)

📌 **Interview term: Loop invariant** — a statement that is true before and after every loop iteration. Here: *the range \`lo..hi\` always contains at least one peak*. When the loop stops with \`lo == hi\`, that single index must be the peak.

### Why \`while lo < hi\` and \`hi = mid\`

- The loop stops when one candidate is left, so \`lo < hi\` (not \`<=\`).
- Because \`lo < hi\`, \`mid\` is always strictly less than \`hi\`, so \`mid + 1\` is always a valid index — no bounds check is needed.
- In the falling case \`mid\` itself may be the peak, so we write \`hi = mid\`, not \`hi = mid - 1\`. Writing \`mid - 1\` can throw the peak away.
- In the rising case \`mid\` is definitely not a peak (its right neighbour is bigger), so \`lo = mid + 1\` is safe. Every iteration shrinks the range, so the loop always ends.

Here is the search on our array, exactly as the Example 2 trace prints it:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 306" role="img" aria-label="Binary search trace on 1 2 1 3 5 6 4. The active range shrinks from 0 to 6, then 4 to 6, then 4 to 5, ending at index 5">
  <defs>
    <marker id="b04q1-b-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="176" y="22" text-anchor="middle">i=0</text>
  <text class="d-sub" x="238" y="22" text-anchor="middle">i=1</text>
  <text class="d-sub" x="300" y="22" text-anchor="middle">i=2</text>
  <text class="d-sub" x="362" y="22" text-anchor="middle">i=3</text>
  <text class="d-sub" x="424" y="22" text-anchor="middle">i=4</text>
  <text class="d-sub" x="486" y="22" text-anchor="middle">i=5</text>
  <text class="d-sub" x="548" y="22" text-anchor="middle">i=6</text>
  <text class="d-text" x="70" y="61" text-anchor="middle">step 1</text>
  <rect class="d-box" x="150" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="176.0" y="61.0" text-anchor="middle">1</text>
  <rect class="d-box" x="212" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="238.0" y="61.0" text-anchor="middle">2</text>
  <rect class="d-box" x="274" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="300.0" y="61.0" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="336" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="362.0" y="61.0" text-anchor="middle">3</text>
  <rect class="d-box" x="398" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="424.0" y="61.0" text-anchor="middle">5</text>
  <rect class="d-box" x="460" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="61.0" text-anchor="middle">6</text>
  <rect class="d-box" x="522" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="548.0" y="61.0" text-anchor="middle">4</text>
  <text class="d-sub" x="630" y="61">3 &lt; 5: go right</text>
  <text class="d-text" x="70" y="131" text-anchor="middle">step 2</text>
  <rect class="d-box-muted" x="150" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="176.0" y="131.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="212" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="238.0" y="131.0" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="274" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="300.0" y="131.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="336" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="362.0" y="131.0" text-anchor="middle">3</text>
  <rect class="d-box" x="398" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="424.0" y="131.0" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="460" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="131.0" text-anchor="middle">6</text>
  <rect class="d-box" x="522" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="548.0" y="131.0" text-anchor="middle">4</text>
  <text class="d-sub" x="630" y="131">6 &gt; 4: keep left</text>
  <text class="d-text" x="70" y="201" text-anchor="middle">step 3</text>
  <rect class="d-box-muted" x="150" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="176.0" y="201.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="212" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="238.0" y="201.0" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="274" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="300.0" y="201.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="336" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="362.0" y="201.0" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="398" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="424.0" y="201.0" text-anchor="middle">5</text>
  <rect class="d-box" x="460" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="201.0" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="522" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="548.0" y="201.0" text-anchor="middle">4</text>
  <text class="d-sub" x="630" y="201">5 &lt; 6: go right</text>
  <text class="d-text d-accent" x="70" y="271" text-anchor="middle">result</text>
  <rect class="d-box-muted" x="150" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="176.0" y="271.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="212" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="238.0" y="271.0" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="274" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="300.0" y="271.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="336" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="362.0" y="271.0" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="398" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="424.0" y="271.0" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="460" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="271.0" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="522" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="548.0" y="271.0" text-anchor="middle">4</text>
  <text class="d-sub" x="630" y="271">lo = hi = 5</text>
</svg>

Three comparisons instead of six, and the answer is index 5 (value 6). A different but equally correct algorithm might return index 1 — both are accepted.

## 6. The Java Solution, Line by Line

~~~java
static int findPeak(int[] nums) {
    int lo = 0, hi = nums.length - 1;
    while (lo < hi) {                     // stop when one candidate is left
        int mid = lo + (hi - lo) / 2;     // (lo + hi) / 2 can overflow int
        if (nums[mid] < nums[mid + 1]) {  // rising slope: a peak is to the right
            lo = mid + 1;
        } else {                          // falling slope: mid or a peak to its left
            hi = mid;
        }
    }
    return lo;
}
~~~

- \`int mid = lo + (hi - lo) / 2;\` — \`int\` division in Java truncates toward zero, so no rounding call is needed. The \`lo + (hi - lo) / 2\` form avoids overflow: we ran \`lo = hi = 2_000_000_000\` and \`(lo + hi) / 2\` printed \`-147483648\`, while \`lo + (hi - lo) / 2\` and \`(lo + hi) >>> 1\` both printed \`2000000000\`.
- \`nums[mid + 1]\` is always valid because \`mid < hi\`. Java checks every array access; if you get the bounds wrong you get an \`ArrayIndexOutOfBoundsException\` — loud, which is better than a silent wrong answer.
- On an empty array \`hi\` is \`-1\`, the loop is skipped and \`0\` is returned — an index that does not exist. Throw \`IllegalArgumentException\` or return \`-1\` explicitly.

📌 **Interview term: Integer overflow** — when a result does not fit in the type (for \`int\`, beyond 2,147,483,647) and wraps around to a negative number. Java does not throw on \`int\` overflow; \`Math.addExact\` does if you want a check.

## 7. Java Details That Matter

- **\`>>>\` vs \`>>\`.** \`>>>\` is the unsigned right shift: it fills with zeros, so \`(lo + hi) >>> 1\` is correct even when \`lo + hi\` overflowed into the sign bit. \`>> 1\` keeps the sign and stays negative. Either form is fine in an interview if you can explain it.
- **\`int[]\` vs \`List<Integer>\`.** With \`List<Integer>\` you would call \`nums.get(mid)\` and compare two \`Integer\` objects with \`<\`, which auto-unboxes and is fine. Comparing them with \`==\` is not: \`Integer\` objects are only cached between -128 and 127, and our run printed \`false\` for \`Integer x = 1000, y = 1000; x == y\`. Stick with \`int[]\`.
- **Static method.** Put the logic in a \`static\` method so it can be called from \`main\` without creating an object; the interviewer cares about the algorithm, not class design.
- **Testing.** Several peaks may be valid, so assert the peak property with \`isPeak\` (Example 2) rather than a fixed index.

## 8. Verified: Running the Code

Every program below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21.0.12). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — Find a peak on six inputs, including edge cases**

~~~text
2
5
0
0
4
2
~~~

**Example 2 — Trace the search, brute-force check 1,456 arrays, and count the work**

~~~text
lo=0 hi=6 mid=3: 3 < 5 -> go right
lo=4 hi=6 mid=5: 6 > 4 -> keep left half
lo=4 hi=5 mid=4: 5 < 6 -> go right
peak index 5
arrays tested 1456 all valid true
n=1000 linear compares 999 binary steps 9 same index true
n=1000000 linear compares 999999 binary steps 19 same index true
~~~

The brute-force check tried every array of length 1 to 6 over the values 0 to 3 with no two equal neighbours (1,456 arrays) and confirmed the returned index is a real peak every time. On a strictly rising array of one million elements the scan made 999,999 comparisons; the binary search made 19.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Linear scan | O(n) | O(1) | May read every element (999,999 comparisons for n = 1,000,000 in Example 2) |
| Binary search on the slope | O(log n) | O(1) | Each step halves the range: 19 steps for n = 1,000,000 |
| Global maximum | O(n) | O(1) | Must see every element |

A recursive version uses O(log n) stack frames — tiny, but the loop avoids the question entirely. See [What is Big-O notation?](/interview-question/what-is-big-o-notation) for the classes.

## 10. Edge Cases

- **One element** — \`[7]\`: the loop never runs, index 0 is returned. Both neighbours are minus infinity, so it is a peak.
- **Strictly falling** — \`[5, 4, 3, 2, 1]\`: every step takes \`hi = mid\`, ending at index 0.
- **Strictly rising** — \`[1, 2, 3, 4, 5]\`: every step takes \`lo = mid + 1\`, ending at the last index. This is the worst case for the linear scan.
- **Two peaks** — \`[2, 1, 2]\`: our code returns index 2; index 0 is also correct. Tests must accept any valid peak, which is why Example 2 checks the answer with \`is_peak\` instead of comparing to one fixed index.
- **Equal neighbours** — outside the problem contract; see the pitfalls.
- **Empty array** — no peak exists; guard it explicitly.

## 11. Common Pitfalls

- **\`(lo + hi) / 2\` on large indices.** It overflows \`int\` and goes negative (our run printed \`-147483648\`); use \`lo + (hi - lo) / 2\` or \`>>> 1\`.
- **Writing \`hi = mid - 1\` in the falling case.** \`mid\` may be the only peak in the range.
- **Using \`while (lo <= hi)\` with \`hi = mid\`.** The range stops shrinking and the loop never ends.
- **Comparing \`Integer\` objects with \`==\`.** Works for -128..127 by caching, fails above; use \`int[]\` or \`.equals\`.
- **Ignoring equal neighbours.** The same method returns \`0\` for \`{1, 1, 1, 2}\`, which is not a peak.
- **Returning \`0\` for an empty array.** Guard it explicitly.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">A peak beats both neighbours, outside the array is minus infinity, so a peak always exists and <strong style="color:#ffca28;">any</strong> peak is accepted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The brute force:</strong> <span style="color:#f0e2c8;">Scan once and return the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i] &gt; nums[i + 1]</code>, else the last index — O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The insight:</strong> <span style="color:#f0e2c8;">Compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[mid]</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[mid + 1]</code>: rising means a peak exists to the right, falling means one exists at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> or to its left.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The code:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while (lo &lt; hi)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid = lo + (hi - lo) / 2</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid + 1</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code>. O(log n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The traps:</strong> <span style="color:#f0e2c8;">Overflow in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(lo + hi) / 2</code>, dropping <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid - 1</code>, and duplicates, which break the guarantee.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lo + (hi - lo) / 2</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo + hi</code> can exceed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code> and wrap negative. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi - lo</code> never overflows when both are valid indices, so the sum stays in range.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does binary search work on unsorted data here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It needs only a rule that says which half still holds an answer. A climbing side always contains a peak.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if I need the largest element?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A full pass — O(n). A local comparison cannot rule out a bigger value elsewhere.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with equal neighbours?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The rule fails on flat stretches; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1, 1, 1, 2}</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>. Use an O(n) scan.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find a peak in a 2D grid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Binary search on columns: take the middle column, find its maximum, compare with left and right neighbours, move toward the bigger one. O(m log n).</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Peak element (local maximum)** | An element strictly bigger than both neighbours; out-of-range counts as minus infinity |
| **Linear scan** | Check elements one by one; O(n) |
| **Binary search on the slope** | Keep the half that the neighbour comparison says must contain a peak |
| **Loop invariant** | A fact true on every iteration: the range always holds a peak |
| **Integer overflow** | A result too big for its type wraps around; Java \`int\` does not throw |

---
**Conclusion:** The peak problem shows that binary search needs a rule, not a sorted array: compare \`nums[mid]\` with \`nums[mid + 1]\`, keep the half that climbs, and the invariant "this range holds a peak" finishes the job in O(log n). In Java, the extra marks come from the overflow-safe midpoint (the run showed \`(lo + hi) / 2\` going negative), keeping \`mid\` with \`hi = mid\`, guarding the empty array, and naming the equal-neighbour case where the guarantee no longer holds.
`,
        examples: [
          { label: "Find a peak on six inputs, including edge cases", code: `public class Main {
    // Return the index of any element strictly greater than its neighbours.
    // Out-of-range neighbours count as minus infinity.
    static int findPeak(int[] nums) {
        int lo = 0, hi = nums.length - 1;
        while (lo < hi) {                     // stop when one candidate is left
            int mid = lo + (hi - lo) / 2;     // (lo + hi) / 2 can overflow int
            if (nums[mid] < nums[mid + 1]) {  // rising slope: a peak is to the right
                lo = mid + 1;
            } else {                          // falling slope: mid or a peak to its left
                hi = mid;
            }
        }
        return lo;
    }

    public static void main(String[] args) {
        System.out.println(findPeak(new int[]{1, 2, 3, 1}));           // 2
        System.out.println(findPeak(new int[]{1, 2, 1, 3, 5, 6, 4}));  // 5
        System.out.println(findPeak(new int[]{7}));                    // 0
        System.out.println(findPeak(new int[]{5, 4, 3, 2, 1}));        // 0
        System.out.println(findPeak(new int[]{1, 2, 3, 4, 5}));        // 4
        System.out.println(findPeak(new int[]{2, 1, 2}));              // 2
    }
}` },
          { label: "Trace the search, brute-force check 1,456 arrays, and count the work", code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    // returns {index, steps}
    static int[] findPeakTraced(int[] nums, List<String> log) {
        int lo = 0, hi = nums.length - 1, steps = 0;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            steps++;
            if (nums[mid] < nums[mid + 1]) {
                log.add("lo=" + lo + " hi=" + hi + " mid=" + mid + ": " + nums[mid] + " < " + nums[mid + 1] + " -> go right");
                lo = mid + 1;
            } else {
                log.add("lo=" + lo + " hi=" + hi + " mid=" + mid + ": " + nums[mid] + " > " + nums[mid + 1] + " -> keep left half");
                hi = mid;
            }
        }
        return new int[]{lo, steps};
    }

    static int[] linearPeak(int[] nums) {
        int comparisons = 0;
        for (int i = 0; i < nums.length - 1; i++) {
            comparisons++;
            if (nums[i] > nums[i + 1]) return new int[]{i, comparisons};
        }
        return new int[]{nums.length - 1, comparisons};
    }

    static boolean isPeak(int[] nums, int i) {
        boolean leftOk = i == 0 || nums[i] > nums[i - 1];
        boolean rightOk = i == nums.length - 1 || nums[i] > nums[i + 1];
        return leftOk && rightOk;
    }

    // every array of the given length over values 0..3 with no two equal neighbours
    static List<int[]> allArrays(int length) {
        List<int[]> out = new ArrayList<>();
        if (length == 0) { out.add(new int[0]); return out; }
        for (int[] prefix : allArrays(length - 1)) {
            for (int v = 0; v < 4; v++) {
                if (prefix.length == 0 || prefix[prefix.length - 1] != v) {
                    int[] next = java.util.Arrays.copyOf(prefix, prefix.length + 1);
                    next[prefix.length] = v;
                    out.add(next);
                }
            }
        }
        return out;
    }

    public static void main(String[] args) {
        // 1) Trace one search
        List<String> log = new ArrayList<>();
        int idx = findPeakTraced(new int[]{1, 2, 1, 3, 5, 6, 4}, log)[0];
        for (String line : log) System.out.println(line);
        System.out.println("peak index " + idx);

        // 2) Brute-force check
        int tested = 0;
        boolean ok = true;
        for (int n = 1; n <= 6; n++) {
            for (int[] arr : allArrays(n)) {
                tested++;
                ok = ok && isPeak(arr, findPeakTraced(arr, new ArrayList<>())[0]);
            }
        }
        System.out.println("arrays tested " + tested + " all valid " + ok);

        // 3) Work done on a strictly increasing array
        for (int n : new int[]{1000, 1000000}) {
            int[] arr = new int[n];
            for (int i = 0; i < n; i++) arr[i] = i;
            int[] lin = linearPeak(arr);
            int[] bin = findPeakTraced(arr, new ArrayList<>());
            System.out.println("n=" + n + " linear compares " + lin[1] + " binary steps " + bin[1] + " same index " + (lin[0] == bin[0]));
        }
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a \`std::vector<int>\` where no two neighbours are equal, return the index of any peak — an element bigger than both its neighbours, with the outside of the vector counting as minus infinity. Please write it in C++ in better than linear time."

**What a strong answer should cover:**
- A peak always exists because out-of-range neighbours are minus infinity; any peak is accepted.
- The O(n) scan first, then binary search on the slope: compare \`nums[mid]\` with \`nums[mid + 1]\` and keep the half that must contain a peak.
- The loop invariant and why the loop is \`while (lo < hi)\` with \`hi = mid\`.
- O(log n) time, O(1) space; the global maximum still needs O(n).
- C++ specifics: signed overflow in \`lo + hi\` is undefined behaviour, \`nums.size() - 1\` on an empty vector wraps to a huge unsigned number, \`operator[]\` does no bounds check, and pass the vector by \`const&\`.

**Clarifying questions expected:**
- "Any peak or the highest one?"
- "Can neighbours be equal?"
- "What should an empty vector return?"

**Code / implementation expected:** Yes — an \`int findPeak(const std::vector<int>& nums)\` function in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array and a loop are; binary search is explained from scratch.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the C++ programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

You are hiking in thick fog. You cannot see the mountain range, only the ground one step to your left and one step to your right. Your task is not to find the *highest* mountain — just to stand on *a* summit, any spot where both sides go down.

The slow plan is to walk the whole trail from one end and stop at the first spot where the ground drops. The clever plan: look at the ground just ahead. If it goes **up**, keep walking that way — a path that climbs must eventually either hit a summit or reach the end of the trail, and the end of the trail counts as a summit because past it there is a cliff. If it goes **down**, you are already on a downhill, so a summit is behind you (maybe right where you stand).

Better still, you do not have to walk at all: jump to the **middle** of the trail, check which way the ground slopes, and throw away the half that you know you do not need. Each jump halves the trail. A trail of a million steps is settled in 20 jumps. That jump-and-halve trick is binary search, applied to something that is **not sorted** — which is exactly why interviewers like this question.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| "Do you want **any** peak or the **highest** element?" | Any peak can be found in O(log n). The global maximum needs every element looked at — O(n), no shortcut. |
| "Can two neighbours be equal?" | The O(log n) proof needs \`nums[i] != nums[i+1]\`. With flat stretches the slope rule can stop on a non-peak (shown in the Pitfalls). |
| "Do positions outside the array count as minus infinity?" | That convention (LeetCode 162 uses it) means the first and last elements can be peaks and a peak always exists. |
| "Index or value?" | Usually the index. Returning the value loses where it was. |
| "Can the array be empty?" | With no elements there is no peak; decide whether to return -1 or throw. |

## 3. What Exactly Is a Peak?

A **peak** is an element strictly bigger than the element on its left and the element on its right. Positions outside the array are treated as minus infinity, so the first element only has to beat its right neighbour and the last element only has to beat its left neighbour.

📌 **Interview term: Peak element (local maximum)** — an index \`i\` where \`nums[i] > nums[i-1]\` and \`nums[i] > nums[i+1]\`, with out-of-range neighbours counted as minus infinity. A *local* maximum is only bigger than its neighbours; the *global* maximum is bigger than everything.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 252" role="img" aria-label="Bar chart of the array 1 2 1 3 5 6 4 with two peaks highlighted at index 1 and index 5">
  <defs>
    <marker id="b04q1-a-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="60" y="184" width="46" height="26" rx="4"/>
  <text class="d-text" x="83" y="174" text-anchor="middle">1</text>
  <text class="d-sub" x="83" y="236" text-anchor="middle">i=0</text>
  <rect class="d-box-accent" x="132" y="158" width="46" height="52" rx="4"/>
  <text class="d-text" x="155" y="148" text-anchor="middle">2</text>
  <text class="d-sub" x="155" y="236" text-anchor="middle">i=1</text>
  <text class="d-text d-accent" x="155" y="124" text-anchor="middle">peak</text>
  <rect class="d-box" x="204" y="184" width="46" height="26" rx="4"/>
  <text class="d-text" x="227" y="174" text-anchor="middle">1</text>
  <text class="d-sub" x="227" y="236" text-anchor="middle">i=2</text>
  <rect class="d-box" x="276" y="132" width="46" height="78" rx="4"/>
  <text class="d-text" x="299" y="122" text-anchor="middle">3</text>
  <text class="d-sub" x="299" y="236" text-anchor="middle">i=3</text>
  <rect class="d-box" x="348" y="80" width="46" height="130" rx="4"/>
  <text class="d-text" x="371" y="70" text-anchor="middle">5</text>
  <text class="d-sub" x="371" y="236" text-anchor="middle">i=4</text>
  <rect class="d-box-accent" x="420" y="54" width="46" height="156" rx="4"/>
  <text class="d-text" x="443" y="44" text-anchor="middle">6</text>
  <text class="d-sub" x="443" y="236" text-anchor="middle">i=5</text>
  <text class="d-text d-accent" x="443" y="20" text-anchor="middle">peak</text>
  <rect class="d-box" x="492" y="106" width="46" height="104" rx="4"/>
  <text class="d-text" x="515" y="96" text-anchor="middle">4</text>
  <text class="d-sub" x="515" y="236" text-anchor="middle">i=6</text>
</svg>

In \`[1, 2, 1, 3, 5, 6, 4]\` both index 1 (value 2) and index 5 (value 6) are peaks. The problem accepts either one — that freedom is what lets us skip most of the array.

Why a peak always exists: walk from the left. Either the values keep rising to the end (then the last element is a peak, because its right side is minus infinity), or at some point the next value is smaller, and the element just before that drop is a peak.

## 4. Brute Force: Scan Left to Right

Check each element against its right neighbour and return the first index \`i\` with \`nums[i] > nums[i+1]\`; if no such index exists, the last index is the peak. This is correct and needs no extra memory, but on a rising array it reads every element.

📌 **Interview term: Linear scan** — visiting the elements one by one from the start; O(n) time. It is the baseline you mention first, then improve.

The scan is O(n). The array is not sorted, so most people assume O(n) is the best possible. It is not, and saying *why* is the heart of the answer.

## 5. The Key Insight: Follow the Slope

Pick any index \`mid\` and compare it with the element to its right:

- If \`nums[mid] < nums[mid+1]\`, the ground rises to the right. Starting at \`mid+1\` and walking right, the values either keep rising to the end (the last element is a peak) or drop somewhere (the element before the drop is a peak). **A peak is guaranteed in \`mid+1 .. hi\`.**
- Otherwise \`nums[mid] > nums[mid+1]\` (equal neighbours are excluded by the problem), so the ground falls to the right. By the mirror argument walking left from \`mid\`, **a peak is guaranteed in \`lo .. mid\`** — and \`mid\` itself may be it, so we keep it.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 286" role="img" aria-label="The two cases of the slope rule. Rising at mid keeps the right half, falling keeps the left half including mid">
  <defs>
    <marker id="b04q1-c-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="300" height="120" rx="10"/>
  <text class="d-text" x="180" y="62" text-anchor="middle">nums[mid] &lt; nums[mid+1]</text>
  <text class="d-sub" x="180" y="92" text-anchor="middle">the right side climbs</text>
  <text class="d-sub" x="180" y="120" text-anchor="middle">a peak exists in mid+1 .. hi</text>
  <rect class="d-box-muted" x="390" y="30" width="300" height="120" rx="10"/>
  <text class="d-text" x="540" y="62" text-anchor="middle">nums[mid] &gt; nums[mid+1]</text>
  <text class="d-sub" x="540" y="92" text-anchor="middle">the left side climbs</text>
  <text class="d-sub" x="540" y="120" text-anchor="middle">a peak exists in lo .. mid</text>
  <path class="d-edge" d="M 180 154 L 180 204" marker-end="url(#b04q1-c-cpp)"/>
  <path class="d-edge" d="M 540 154 L 540 204" marker-end="url(#b04q1-c-cpp)"/>
  <rect class="d-box-accent" x="30" y="210" width="300" height="56" rx="10"/>
  <text class="d-text" x="180" y="244" text-anchor="middle">lo = mid + 1</text>
  <rect class="d-box-accent" x="390" y="210" width="300" height="56" rx="10"/>
  <text class="d-text" x="540" y="244" text-anchor="middle">hi = mid</text>
</svg>

Each comparison throws away about half of the range, and the kept half always still contains a peak. That is the whole algorithm.

📌 **Interview term: Binary search on the slope** — binary search that decides which half to keep by comparing \`nums[mid]\` with its neighbour instead of with a target value. It works on unsorted data because the rule "a climbing side always contains a peak" is enough. The general binary search conditions are covered in [How does binary search work and what are its requirements?](/interview-question/how-does-binary-search-work-and-what-are-its-requirements)

📌 **Interview term: Loop invariant** — a statement that is true before and after every loop iteration. Here: *the range \`lo..hi\` always contains at least one peak*. When the loop stops with \`lo == hi\`, that single index must be the peak.

### Why \`while lo < hi\` and \`hi = mid\`

- The loop stops when one candidate is left, so \`lo < hi\` (not \`<=\`).
- Because \`lo < hi\`, \`mid\` is always strictly less than \`hi\`, so \`mid + 1\` is always a valid index — no bounds check is needed.
- In the falling case \`mid\` itself may be the peak, so we write \`hi = mid\`, not \`hi = mid - 1\`. Writing \`mid - 1\` can throw the peak away.
- In the rising case \`mid\` is definitely not a peak (its right neighbour is bigger), so \`lo = mid + 1\` is safe. Every iteration shrinks the range, so the loop always ends.

Here is the search on our array, exactly as the Example 2 trace prints it:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 306" role="img" aria-label="Binary search trace on 1 2 1 3 5 6 4. The active range shrinks from 0 to 6, then 4 to 6, then 4 to 5, ending at index 5">
  <defs>
    <marker id="b04q1-b-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="176" y="22" text-anchor="middle">i=0</text>
  <text class="d-sub" x="238" y="22" text-anchor="middle">i=1</text>
  <text class="d-sub" x="300" y="22" text-anchor="middle">i=2</text>
  <text class="d-sub" x="362" y="22" text-anchor="middle">i=3</text>
  <text class="d-sub" x="424" y="22" text-anchor="middle">i=4</text>
  <text class="d-sub" x="486" y="22" text-anchor="middle">i=5</text>
  <text class="d-sub" x="548" y="22" text-anchor="middle">i=6</text>
  <text class="d-text" x="70" y="61" text-anchor="middle">step 1</text>
  <rect class="d-box" x="150" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="176.0" y="61.0" text-anchor="middle">1</text>
  <rect class="d-box" x="212" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="238.0" y="61.0" text-anchor="middle">2</text>
  <rect class="d-box" x="274" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="300.0" y="61.0" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="336" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="362.0" y="61.0" text-anchor="middle">3</text>
  <rect class="d-box" x="398" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="424.0" y="61.0" text-anchor="middle">5</text>
  <rect class="d-box" x="460" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="61.0" text-anchor="middle">6</text>
  <rect class="d-box" x="522" y="36" width="52" height="40" rx="6"/>
  <text class="d-text" x="548.0" y="61.0" text-anchor="middle">4</text>
  <text class="d-sub" x="630" y="61">3 &lt; 5: go right</text>
  <text class="d-text" x="70" y="131" text-anchor="middle">step 2</text>
  <rect class="d-box-muted" x="150" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="176.0" y="131.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="212" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="238.0" y="131.0" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="274" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="300.0" y="131.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="336" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="362.0" y="131.0" text-anchor="middle">3</text>
  <rect class="d-box" x="398" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="424.0" y="131.0" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="460" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="131.0" text-anchor="middle">6</text>
  <rect class="d-box" x="522" y="106" width="52" height="40" rx="6"/>
  <text class="d-text" x="548.0" y="131.0" text-anchor="middle">4</text>
  <text class="d-sub" x="630" y="131">6 &gt; 4: keep left</text>
  <text class="d-text" x="70" y="201" text-anchor="middle">step 3</text>
  <rect class="d-box-muted" x="150" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="176.0" y="201.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="212" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="238.0" y="201.0" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="274" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="300.0" y="201.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="336" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="362.0" y="201.0" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="398" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="424.0" y="201.0" text-anchor="middle">5</text>
  <rect class="d-box" x="460" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="201.0" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="522" y="176" width="52" height="40" rx="6"/>
  <text class="d-text" x="548.0" y="201.0" text-anchor="middle">4</text>
  <text class="d-sub" x="630" y="201">5 &lt; 6: go right</text>
  <text class="d-text d-accent" x="70" y="271" text-anchor="middle">result</text>
  <rect class="d-box-muted" x="150" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="176.0" y="271.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="212" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="238.0" y="271.0" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="274" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="300.0" y="271.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="336" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="362.0" y="271.0" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="398" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="424.0" y="271.0" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="460" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="271.0" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="522" y="246" width="52" height="40" rx="6"/>
  <text class="d-text" x="548.0" y="271.0" text-anchor="middle">4</text>
  <text class="d-sub" x="630" y="271">lo = hi = 5</text>
</svg>

Three comparisons instead of six, and the answer is index 5 (value 6). A different but equally correct algorithm might return index 1 — both are accepted.

## 6. The C++ Solution, Line by Line

~~~cpp
int findPeak(const std::vector<int>& nums) {
    int lo = 0, hi = static_cast<int>(nums.size()) - 1;
    while (lo < hi) {                      // stop when one candidate is left
        int mid = lo + (hi - lo) / 2;      // lo + hi could overflow (undefined behaviour)
        if (nums[mid] < nums[mid + 1]) {   // rising slope: a peak is to the right
            lo = mid + 1;
        } else {                           // falling slope: mid or a peak to its left
            hi = mid;
        }
    }
    return lo;
}
~~~

- \`const std::vector<int>&\` — pass by const reference so the vector is not copied; copying would cost O(n) and defeat the O(log n) goal.
- \`static_cast<int>(nums.size()) - 1\` — \`size()\` returns an unsigned \`size_t\`. On an empty vector, \`nums.size() - 1\` without the cast wraps around: our run printed \`18446744073709551615\`. Casting to \`int\` first gives \`-1\`, the loop is skipped, and the function returns \`0\` — still invalid, so guard empty input explicitly.
- \`lo + (hi - lo) / 2\` — in C++ signed integer overflow is **undefined behaviour**: the compiler may assume it never happens, so \`(lo + hi) / 2\` on huge indices is not just wrong, it is unpredictable.
- \`nums[mid + 1]\` is always valid because \`mid < hi\`. \`operator[]\` does no bounds checking; an off-by-one here reads garbage silently. Use \`.at()\` while debugging if you want an exception.

📌 **Interview term: Undefined behaviour** — code whose result the C++ standard does not define (signed overflow, out-of-range \`operator[]\`). It may appear to work, crash, or be optimised in surprising ways.

## 7. C++ Details That Matter

- **\`std::max_element\`** from \`<algorithm>\` returns an iterator to the global maximum; \`std::distance(nums.begin(), it)\` turns it into an index. It is a valid peak, but O(n) — the brute force, not the answer.
- **Do not reach for \`std::lower_bound\` / \`std::partition_point\`.** They need a range that is *partitioned* by a predicate. The predicate "\`nums[i] < nums[i+1]\`" is not monotonic over an arbitrary array (\`[1, 2, 1, 3]\` goes true, false, true), so these would give undefined results. Write the slope loop by hand.
- **\`int\` vs \`size_t\` for indices.** Mixing signed and unsigned in comparisons triggers \`-Wsign-compare\` warnings and real bugs. Pick \`int\` (and cast \`size()\` once) or use \`size_t\` throughout and never compute \`size() - 1\` on an empty vector.
- **Testing.** Several peaks may be valid, so assert the peak property with \`isPeak\` (Example 2).

## 8. Verified: Running the Code

Every program below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3.0 with -std=c++17). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — Find a peak on six inputs, including edge cases**

~~~text
2
5
0
0
4
2
~~~

**Example 2 — Trace the search, brute-force check 1,456 arrays, and count the work**

~~~text
lo=0 hi=6 mid=3: 3 < 5 -> go right
lo=4 hi=6 mid=5: 6 > 4 -> keep left half
lo=4 hi=5 mid=4: 5 < 6 -> go right
peak index 5
arrays tested 1456 all valid true
n=1000 linear compares 999 binary steps 9 same index true
n=1000000 linear compares 999999 binary steps 19 same index true
~~~

The brute-force check tried every array of length 1 to 6 over the values 0 to 3 with no two equal neighbours (1,456 arrays) and confirmed the returned index is a real peak every time. On a strictly rising array of one million elements the scan made 999,999 comparisons; the binary search made 19.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Linear scan / \`std::max_element\` | O(n) | O(1) | May read every element (999,999 comparisons for n = 1,000,000 in Example 2) |
| Binary search on the slope | O(log n) | O(1) | Each step halves the range: 19 steps for n = 1,000,000 |
| Passing the vector by value | adds O(n) | O(n) | The copy alone is linear; pass by \`const&\` |

See [What is Big-O notation?](/interview-question/what-is-big-o-notation) for the classes.

## 10. Edge Cases

- **One element** — \`[7]\`: the loop never runs, index 0 is returned. Both neighbours are minus infinity, so it is a peak.
- **Strictly falling** — \`[5, 4, 3, 2, 1]\`: every step takes \`hi = mid\`, ending at index 0.
- **Strictly rising** — \`[1, 2, 3, 4, 5]\`: every step takes \`lo = mid + 1\`, ending at the last index. This is the worst case for the linear scan.
- **Two peaks** — \`[2, 1, 2]\`: our code returns index 2; index 0 is also correct. Tests must accept any valid peak, which is why Example 2 checks the answer with \`is_peak\` instead of comparing to one fixed index.
- **Equal neighbours** — outside the problem contract; see the pitfalls.
- **Empty array** — no peak exists; guard it explicitly.

## 11. Common Pitfalls

- **\`nums.size() - 1\` on an empty vector.** Unsigned wrap-around gives \`18446744073709551615\`; cast to \`int\` first or check \`empty()\`.
- **\`(lo + hi) / 2\` with large indices.** Signed overflow is undefined behaviour; write \`lo + (hi - lo) / 2\`.
- **Passing \`std::vector<int>\` by value.** The copy is O(n) and hides inside an O(log n) function.
- **Writing \`hi = mid - 1\` in the falling case**, or \`while (lo <= hi)\` with \`hi = mid\` (infinite loop).
- **Using \`lower_bound\` / \`partition_point\`.** The slope predicate is not monotonic, so the preconditions do not hold.
- **Ignoring equal neighbours.** The same function returns \`0\` for \`{1, 1, 1, 2}\`, which is not a peak.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">A peak beats both neighbours, outside the vector is minus infinity, so a peak always exists and <strong style="color:#ffca28;">any</strong> peak is accepted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The brute force:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::max_element</code> or a scan — O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The insight:</strong> <span style="color:#f0e2c8;">Compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[mid]</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[mid + 1]</code>: rising means a peak exists to the right, falling means one exists at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> or to its left.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The code:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while (lo &lt; hi)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid = lo + (hi - lo) / 2</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = mid + 1</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = mid</code>. O(log n), O(1), vector by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The traps:</strong> <span style="color:#f0e2c8;">Unsigned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size() - 1</code>, signed overflow being undefined behaviour, unchecked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code>, and duplicates breaking the guarantee.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::partition_point</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It requires the range to be partitioned by the predicate — all trues then all falses. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i] &lt; nums[i+1]</code> can flip many times, so the precondition fails.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why cast <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">size()</code> to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size()</code> is unsigned; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size() - 1</code> on an empty vector wraps to a huge number (our run printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">18446744073709551615</code>). With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code> and the loop is skipped.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does binary search work on unsorted data here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It only needs a rule saying which half holds an answer; a climbing side always contains a peak.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with equal neighbours?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The rule fails on flat stretches; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1, 1, 1, 2}</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>. Fall back to an O(n) scan.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find a peak in a 2D grid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Binary search on columns: middle column maximum, compare left and right neighbours, move toward the bigger one. O(m log n).</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Peak element (local maximum)** | An element strictly bigger than both neighbours; out-of-range counts as minus infinity |
| **Linear scan** | Check elements one by one; O(n) |
| **Binary search on the slope** | Keep the half that the neighbour comparison says must contain a peak |
| **Loop invariant** | A fact true on every iteration: the range always holds a peak |
| **Undefined behaviour** | Code the C++ standard gives no meaning to, such as signed overflow |

---
**Conclusion:** A peak can be found in O(log n) because the comparison of \`nums[mid]\` with \`nums[mid + 1]\` tells you which half must still contain one; the invariant "the range holds a peak" makes the loop correct without any sorting. In C++ the algorithm is the easy part — the strong answer also passes the vector by \`const&\`, avoids \`size() - 1\` on an empty vector and signed overflow in the midpoint, explains why \`partition_point\` does not apply, and flags equal neighbours as outside the guarantee.
`,
        examples: [
          { label: "Find a peak on six inputs, including edge cases", code: `#include <iostream>
#include <vector>

// Return the index of any element strictly greater than its neighbours.
// Out-of-range neighbours count as minus infinity.
int findPeak(const std::vector<int>& nums) {
    int lo = 0, hi = static_cast<int>(nums.size()) - 1;
    while (lo < hi) {                      // stop when one candidate is left
        int mid = lo + (hi - lo) / 2;      // lo + hi could overflow (undefined behaviour)
        if (nums[mid] < nums[mid + 1]) {   // rising slope: a peak is to the right
            lo = mid + 1;
        } else {                           // falling slope: mid or a peak to its left
            hi = mid;
        }
    }
    return lo;
}

int main() {
    std::cout << findPeak({1, 2, 3, 1}) << "\\n";           // 2
    std::cout << findPeak({1, 2, 1, 3, 5, 6, 4}) << "\\n";  // 5
    std::cout << findPeak({7}) << "\\n";                    // 0
    std::cout << findPeak({5, 4, 3, 2, 1}) << "\\n";        // 0
    std::cout << findPeak({1, 2, 3, 4, 5}) << "\\n";        // 4
    std::cout << findPeak({2, 1, 2}) << "\\n";              // 2
    return 0;
}` },
          { label: "Trace the search, brute-force check 1,456 arrays, and count the work", code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

// returns {index, steps}
std::pair<int, int> findPeakTraced(const std::vector<int>& nums, std::vector<std::string>* log) {
    int lo = 0, hi = static_cast<int>(nums.size()) - 1, steps = 0;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        steps++;
        bool rising = nums[mid] < nums[mid + 1];
        if (log) {
            log->push_back("lo=" + std::to_string(lo) + " hi=" + std::to_string(hi) + " mid=" + std::to_string(mid) + ": " +
                           std::to_string(nums[mid]) + (rising ? " < " : " > ") + std::to_string(nums[mid + 1]) +
                           (rising ? " -> go right" : " -> keep left half"));
        }
        if (rising) lo = mid + 1;
        else hi = mid;
    }
    return {lo, steps};
}

std::pair<int, int> linearPeak(const std::vector<int>& nums) {
    int comparisons = 0;
    for (size_t i = 0; i + 1 < nums.size(); i++) {   // i + 1 < size avoids size() - 1 underflow
        comparisons++;
        if (nums[i] > nums[i + 1]) return {static_cast<int>(i), comparisons};
    }
    return {static_cast<int>(nums.size()) - 1, comparisons};
}

bool isPeak(const std::vector<int>& nums, int i) {
    int n = static_cast<int>(nums.size());
    bool leftOk = i == 0 || nums[i] > nums[i - 1];
    bool rightOk = i == n - 1 || nums[i] > nums[i + 1];
    return leftOk && rightOk;
}

std::vector<std::vector<int>> allArrays(int length) {
    if (length == 0) return {{}};
    std::vector<std::vector<int>> out;
    for (const auto& prefix : allArrays(length - 1)) {
        for (int v = 0; v < 4; v++) {
            if (prefix.empty() || prefix.back() != v) {
                auto next = prefix;
                next.push_back(v);
                out.push_back(next);
            }
        }
    }
    return out;
}

int main() {
    std::cout << std::boolalpha;
    // 1) Trace one search
    std::vector<std::string> log;
    int idx = findPeakTraced({1, 2, 1, 3, 5, 6, 4}, &log).first;
    for (const auto& line : log) std::cout << line << "\\n";
    std::cout << "peak index " << idx << "\\n";

    // 2) Brute-force check
    int tested = 0;
    bool ok = true;
    for (int n = 1; n <= 6; n++) {
        for (const auto& arr : allArrays(n)) {
            tested++;
            ok = ok && isPeak(arr, findPeakTraced(arr, nullptr).first);
        }
    }
    std::cout << "arrays tested " << tested << " all valid " << ok << "\\n";

    // 3) Work done on a strictly increasing array
    for (int n : {1000, 1000000}) {
        std::vector<int> arr(n);
        for (int i = 0; i < n; i++) arr[i] = i;
        auto lin = linearPeak(arr);
        auto bin = findPeakTraced(arr, nullptr);
        std::cout << "n=" << n << " linear compares " << lin.second << " binary steps " << bin.second
                  << " same index " << (lin.first == bin.first) << "\\n";
    }
    return 0;
}` },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you search a sorted 2D matrix?",
    difficulty: "medium",
    seoDescription: "Search a sorted 2D matrix: flattened binary search in O(log mn) or the staircase walk in O(m+n), with verified Python, JavaScript, Java and C++ code.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given a matrix of integers that is sorted, and a target. Return whether the target is in the matrix. Please write it in Python, and tell me how your approach depends on how exactly the matrix is sorted."

**What a strong answer should cover:**
- Asks which shape: rows chaining into one sorted sequence (LeetCode 74) or rows and columns sorted independently (LeetCode 240).
- Shape 1: binary search over \`0 .. m*n - 1\` with index mapping \`divmod(mid, cols)\`, O(log(m n)) time, O(1) space.
- Shape 2: staircase walk from the top-right corner, dropping a row or column per step, O(m + n), with the reason the top-left corner does not work.
- Brute force O(m n) and row-by-row \`bisect\` O(m log n) as baselines.
- Python specifics: \`divmod\`, guarding \`matrix[0]\` on an empty list (\`IndexError\`), \`//\` not \`/\`, and the \`[[0] * n] * m\` aliasing trap when building test matrices.

**Clarifying questions expected:**
- "Does each row start after the previous row ends, or are rows and columns sorted separately?"
- "Return a boolean or the position?"
- "Can the matrix or its rows be empty?"

**Code / implementation expected:** Yes — \`search_matrix(matrix, target)\` for Shape 1 and a staircase function for Shape 2, in Python.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays, nested lists and loops; binary search is linked and summarised.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the Python programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

Think of two kinds of tidy bookshelf.

**Shelf one** is a single long row of books in alphabetical order that the carpenter happened to cut into three planks. Plank two starts exactly where plank one ends. If you mentally glue the planks back together you have one sorted row, and you can find a book the classic way — open in the middle, go left or right, halve again.

**Shelf two** is a wall of cubbyholes in a stadium shop, where prices go **up** as you move right and also go **up** as you move down. The bottom-left cubby is not the "next" one after the top-right cubby; there is no single order. But stand at the **top-right** cubby: everything to its left is cheaper, everything below is pricier. Too expensive? Step left and forget that whole column. Too cheap? Step down and forget that whole row. Each look throws away a full row or column.

Interviewers say "sorted 2D matrix" for both shelves. The first thing a strong candidate does is ask *which one*, because the right algorithm — and the wrong one — depends on it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| "Is each row's first value bigger than the previous row's last value, or are rows and columns just sorted on their own?" | Shape 1 allows one binary search over \`m * n\` cells (O(log(m n))). Shape 2 needs the staircase walk (O(m + n)). Using the first on the second gives wrong answers. |
| "Do you want true/false or the position?" | Changes the return type; both algorithms can return \`(row, col)\`. |
| "Can the matrix or a row be empty?" | \`matrix[0]\` on an empty matrix fails; guard it. |
| "Are all rows the same length?" | Index mapping \`row = i / cols\` assumes a rectangle. |
| "How large can it be?" | \`m * n\` can exceed the 32-bit \`int\` range in Java and C++. |

## 3. Two Different Problems Behind One Title

<svg class="iq-diagram" width="100%" viewBox="0 0 750 272" role="img" aria-label="Two kinds of sorted matrix. Left, rows chain into one sorted list. Right, every row and every column is sorted on its own">
  <defs>
    <marker id="b04q2-a-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="170" y="24" text-anchor="middle">Shape 1: rows chain</text>
  <rect class="d-box" x="40" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="69.0" y="69.0" text-anchor="middle">1</text>
  <rect class="d-box" x="106" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="135.0" y="69.0" text-anchor="middle">3</text>
  <rect class="d-box" x="172" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="201.0" y="69.0" text-anchor="middle">5</text>
  <rect class="d-box" x="238" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="267.0" y="69.0" text-anchor="middle">7</text>
  <rect class="d-box" x="40" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="69.0" y="123.0" text-anchor="middle">10</text>
  <rect class="d-box" x="106" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="135.0" y="123.0" text-anchor="middle">11</text>
  <rect class="d-box" x="172" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="201.0" y="123.0" text-anchor="middle">16</text>
  <rect class="d-box" x="238" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="267.0" y="123.0" text-anchor="middle">20</text>
  <rect class="d-box" x="40" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="69.0" y="177.0" text-anchor="middle">23</text>
  <rect class="d-box" x="106" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="135.0" y="177.0" text-anchor="middle">30</text>
  <rect class="d-box" x="172" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="201.0" y="177.0" text-anchor="middle">34</text>
  <rect class="d-box" x="238" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="267.0" y="177.0" text-anchor="middle">60</text>
  <rect class="d-box-muted" x="40" y="214" width="256" height="38" rx="8"/>
  <text class="d-sub" x="168" y="238" text-anchor="middle">row 0 ends 7, row 1 starts 10</text>
  <text class="d-text d-accent" x="560" y="24" text-anchor="middle">Shape 2: rows and columns sorted</text>
  <rect class="d-box" x="400" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="429.0" y="69.0" text-anchor="middle">1</text>
  <rect class="d-box" x="466" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="495.0" y="69.0" text-anchor="middle">4</text>
  <rect class="d-box" x="532" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="561.0" y="69.0" text-anchor="middle">7</text>
  <rect class="d-box" x="598" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="627.0" y="69.0" text-anchor="middle">11</text>
  <rect class="d-box" x="664" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="693.0" y="69.0" text-anchor="middle">15</text>
  <rect class="d-box" x="400" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="429.0" y="123.0" text-anchor="middle">2</text>
  <rect class="d-box" x="466" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="495.0" y="123.0" text-anchor="middle">5</text>
  <rect class="d-box" x="532" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="561.0" y="123.0" text-anchor="middle">8</text>
  <rect class="d-box" x="598" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="627.0" y="123.0" text-anchor="middle">12</text>
  <rect class="d-box" x="664" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="693.0" y="123.0" text-anchor="middle">19</text>
  <rect class="d-box" x="400" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="429.0" y="177.0" text-anchor="middle">3</text>
  <rect class="d-box" x="466" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="495.0" y="177.0" text-anchor="middle">6</text>
  <rect class="d-box" x="532" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="561.0" y="177.0" text-anchor="middle">9</text>
  <rect class="d-box" x="598" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="627.0" y="177.0" text-anchor="middle">16</text>
  <rect class="d-box" x="664" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="693.0" y="177.0" text-anchor="middle">22</text>
  <rect class="d-box-muted" x="400" y="214" width="322" height="38" rx="8"/>
  <text class="d-sub" x="561" y="238" text-anchor="middle">row 0 ends 15, row 1 starts 2</text>
</svg>

**Shape 1 (LeetCode 74, "Search a 2D Matrix")**: each row is sorted, and each row starts with a value bigger than the last value of the row above. Reading the matrix row by row gives one sorted list.

**Shape 2 (LeetCode 240, "Search a 2D Matrix II")**: each row is sorted left to right and each column is sorted top to bottom, but a row does *not* have to start after the previous row ends — in the right-hand matrix, row 1 starts with 2, which is smaller than 15 at the end of row 0.

📌 **Interview term: Row-major order** — reading a matrix one row at a time, left to right, top to bottom. Cell \`(r, c)\` of a matrix with \`cols\` columns is position \`r * cols + c\` in that order.

📌 **Interview term: Sorted matrix (Young tableau)** — a matrix whose rows and columns are each sorted ascending (Shape 2). Every Shape 1 matrix is also a Shape 2 matrix, but not the other way round.

The brute force works on both: look at every cell, O(m n). A better general approach is a binary search in each row, O(m log n). Both are worth one sentence before you give the real answer.

## 4. Shape 1: Pretend It Is One Sorted Array

Because the rows chain, the matrix *is* a sorted array of length \`m * n\` that happens to be folded into rows. Run an ordinary [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) over indices \`0 .. m*n - 1\`, and translate each index back into a cell only when you need to read it.

📌 **Interview term: Index mapping** — converting a 1D position into 2D coordinates: \`row = index / cols\` (integer division) and \`col = index % cols\` (the remainder). No array is ever actually flattened, so no extra memory is used.

<svg class="iq-diagram" width="100%" viewBox="0 0 740 320" role="img" aria-label="A 3 by 4 matrix read in row-major order becomes one sorted list of 12 values. Index 5 maps to row 1, column 1, value 11">
  <defs>
    <marker id="b04q2-b-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="40" width="58" height="42" rx="6"/>
  <text class="d-text" x="69.0" y="66.0" text-anchor="middle">1</text>
  <rect class="d-box" x="106" y="40" width="58" height="42" rx="6"/>
  <text class="d-text" x="135.0" y="66.0" text-anchor="middle">3</text>
  <rect class="d-box" x="172" y="40" width="58" height="42" rx="6"/>
  <text class="d-text" x="201.0" y="66.0" text-anchor="middle">5</text>
  <rect class="d-box" x="238" y="40" width="58" height="42" rx="6"/>
  <text class="d-text" x="267.0" y="66.0" text-anchor="middle">7</text>
  <rect class="d-box" x="40" y="96" width="58" height="42" rx="6"/>
  <text class="d-text" x="69.0" y="122.0" text-anchor="middle">10</text>
  <rect class="d-box-accent" x="106" y="96" width="58" height="42" rx="6"/>
  <text class="d-text" x="135.0" y="122.0" text-anchor="middle">11</text>
  <rect class="d-box" x="172" y="96" width="58" height="42" rx="6"/>
  <text class="d-text" x="201.0" y="122.0" text-anchor="middle">16</text>
  <rect class="d-box" x="238" y="96" width="58" height="42" rx="6"/>
  <text class="d-text" x="267.0" y="122.0" text-anchor="middle">20</text>
  <rect class="d-box" x="40" y="152" width="58" height="42" rx="6"/>
  <text class="d-text" x="69.0" y="178.0" text-anchor="middle">23</text>
  <rect class="d-box" x="106" y="152" width="58" height="42" rx="6"/>
  <text class="d-text" x="135.0" y="178.0" text-anchor="middle">30</text>
  <rect class="d-box" x="172" y="152" width="58" height="42" rx="6"/>
  <text class="d-text" x="201.0" y="178.0" text-anchor="middle">34</text>
  <rect class="d-box" x="238" y="152" width="58" height="42" rx="6"/>
  <text class="d-text" x="267.0" y="178.0" text-anchor="middle">60</text>
  <text class="d-sub" x="22" y="66" text-anchor="middle">r0</text>
  <text class="d-sub" x="22" y="122" text-anchor="middle">r1</text>
  <text class="d-sub" x="22" y="178" text-anchor="middle">r2</text>
  <text class="d-sub" x="69" y="28" text-anchor="middle">c0</text>
  <text class="d-sub" x="135" y="28" text-anchor="middle">c1</text>
  <text class="d-sub" x="201" y="28" text-anchor="middle">c2</text>
  <text class="d-sub" x="267" y="28" text-anchor="middle">c3</text>
  <path class="d-edge" d="M 320 124 L 380 124" marker-end="url(#b04q2-b-python)"/>
  <rect class="d-box-muted" x="390" y="40" width="300" height="170" rx="10"/>
  <text class="d-text" x="540" y="74" text-anchor="middle">1D index mid = 5</text>
  <text class="d-sub" x="540" y="108" text-anchor="middle">row = 5 div 4 = 1</text>
  <text class="d-sub" x="540" y="138" text-anchor="middle">col = 5 mod 4 = 1</text>
  <text class="d-text d-accent" x="540" y="176" text-anchor="middle">matrix[1][1] = 11</text>
  <rect class="d-box-muted" x="40" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="63.0" y="273.0" text-anchor="middle">1</text>
  <text class="d-sub" x="63.0" y="304" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="94" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="117.0" y="273.0" text-anchor="middle">3</text>
  <text class="d-sub" x="117.0" y="304" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="148" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="171.0" y="273.0" text-anchor="middle">5</text>
  <text class="d-sub" x="171.0" y="304" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="202" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="225.0" y="273.0" text-anchor="middle">7</text>
  <text class="d-sub" x="225.0" y="304" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="256" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="279.0" y="273.0" text-anchor="middle">10</text>
  <text class="d-sub" x="279.0" y="304" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="310" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="333.0" y="273.0" text-anchor="middle">11</text>
  <text class="d-sub" x="333.0" y="304" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="364" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="387.0" y="273.0" text-anchor="middle">16</text>
  <text class="d-sub" x="387.0" y="304" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="418" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="441.0" y="273.0" text-anchor="middle">20</text>
  <text class="d-sub" x="441.0" y="304" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="472" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="495.0" y="273.0" text-anchor="middle">23</text>
  <text class="d-sub" x="495.0" y="304" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="526" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="549.0" y="273.0" text-anchor="middle">30</text>
  <text class="d-sub" x="549.0" y="304" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="580" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="603.0" y="273.0" text-anchor="middle">34</text>
  <text class="d-sub" x="603.0" y="304" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="634" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="657.0" y="273.0" text-anchor="middle">60</text>
  <text class="d-sub" x="657.0" y="304" text-anchor="middle">11</text>
</svg>

Searching for \`11\`: \`lo = 0\`, \`hi = 11\`, \`mid = 5\`, which maps to row 1, column 1 — the value 11, found on the first probe. Searching for \`13\` ends with \`lo > hi\` and returns false. Because every step halves the range, the cost is O(log(m n)), which equals O(log m + log n).

## 5. Shape 2: The Staircase Walk

Binary search over the folded array fails here because the folded array is not sorted (\`1, 4, 7, 11, 15, 2, 5, ...\`). Example 2 shows it misses 12 of the 25 values. We need a different elimination rule.

Start at the **top-right** cell. It is the biggest value in its row and the smallest value in its column. Compare it with the target:

- **Equal** — found.
- **Bigger than the target** — every cell below it in this column is even bigger, so the whole column is useless. Move **left**.
- **Smaller than the target** — every cell to its left in this row is even smaller, so the whole row is useless. Move **down**.

📌 **Interview term: Staircase search (saddleback search)** — the walk from a corner where one direction only increases and the other only decreases, removing one row or one column per comparison. It takes at most \`m + n - 1\` steps.

<svg class="iq-diagram" width="100%" viewBox="0 0 750 336" role="img" aria-label="Staircase search for 5 in a 5 by 5 matrix. Start at 15 in the top-right corner, move left past 11 and 7 to 4, then down to 5">
  <defs>
    <marker id="b04q2-c-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="60" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="76.0" text-anchor="middle">1</text>
  <rect class="d-box" x="130" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="76.0" text-anchor="middle">4</text>
  <rect class="d-box" x="200" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="76.0" text-anchor="middle">7</text>
  <rect class="d-box" x="270" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="76.0" text-anchor="middle">11</text>
  <rect class="d-box" x="340" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="76.0" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="60" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="132.0" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="130" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="132.0" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="200" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="132.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="270" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="132.0" text-anchor="middle">12</text>
  <rect class="d-box-muted" x="340" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="132.0" text-anchor="middle">19</text>
  <rect class="d-box-muted" x="60" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="188.0" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="130" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="188.0" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="200" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="188.0" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="270" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="188.0" text-anchor="middle">16</text>
  <rect class="d-box-muted" x="340" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="188.0" text-anchor="middle">22</text>
  <rect class="d-box-muted" x="60" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="244.0" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="130" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="244.0" text-anchor="middle">13</text>
  <rect class="d-box-muted" x="200" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="244.0" text-anchor="middle">14</text>
  <rect class="d-box-muted" x="270" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="244.0" text-anchor="middle">17</text>
  <rect class="d-box-muted" x="340" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="244.0" text-anchor="middle">24</text>
  <rect class="d-box-muted" x="60" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="300.0" text-anchor="middle">18</text>
  <rect class="d-box-muted" x="130" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="300.0" text-anchor="middle">21</text>
  <rect class="d-box-muted" x="200" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="300.0" text-anchor="middle">23</text>
  <rect class="d-box-muted" x="270" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="300.0" text-anchor="middle">26</text>
  <rect class="d-box-muted" x="340" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="300.0" text-anchor="middle">30</text>
  <text class="d-text d-accent" x="370" y="34" text-anchor="middle">start</text>
  <rect class="d-box-muted" x="440" y="50" width="280" height="46" rx="8"/>
  <text class="d-sub" x="580" y="78" text-anchor="middle">start at the top-right corner</text>
  <rect class="d-box-muted" x="440" y="112" width="280" height="46" rx="8"/>
  <text class="d-sub" x="580" y="140" text-anchor="middle">15, 11, 7: too big, move left</text>
  <rect class="d-box-muted" x="440" y="174" width="280" height="46" rx="8"/>
  <text class="d-sub" x="580" y="202" text-anchor="middle">4: too small, move down</text>
  <rect class="d-box-accent" x="440" y="236" width="280" height="46" rx="8"/>
  <text class="d-sub" x="580" y="264" text-anchor="middle">5: found at row 1, col 1</text>
</svg>

The search for 5 visits \`15, 11, 7, 4, 5\` — five cells out of 25, exactly the path Example 2 prints. The bottom-left corner works too (up when too big, right when too small). The top-left and bottom-right corners do **not** work: from top-left both directions increase, so a "too small" answer does not tell you which way to go.

## 6. Which One Should You Use?

| Method | Works on | Time | Probes on a 1000 x 1000 Shape 1 matrix (Example 3) |
| :--- | :--- | :--- | :--- |
| Scan every cell | Any matrix | O(m n) | up to 1,000,000 |
| Binary search each row | Sorted rows | O(m log n) | about 10 per row, up to 1,000 rows |
| Flattened binary search | Shape 1 only | O(log(m n)) | 19 or 20 |
| Staircase walk | Shape 1 and Shape 2 | O(m + n) | 1 to 1,999 |

On a Shape 1 matrix the flattened search wins clearly — 20 probes against 1,999 for the worst staircase case. On a Shape 2 matrix only the staircase (or the row-by-row search) is correct. If you are not told which shape you have, the staircase is the safe choice.

> **Key insight:** both algorithms are "elimination" searches. Binary search eliminates half of the remaining cells per probe; the staircase eliminates a whole row or column per probe. Pick the one whose elimination rule the data actually supports.

## 7. The Python Solution, Line by Line

**Shape 1 — flattened binary search:**

~~~python
def search_matrix(matrix, target):
    """Rows sorted left to right, and each row starts after the previous row ends.
    Treat the m x n grid as one sorted list of length m*n."""
    if not matrix or not matrix[0]:
        return False
    rows, cols = len(matrix), len(matrix[0])
    lo, hi = 0, rows * cols - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        r, c = divmod(mid, cols)          # 1D index -> (row, column)
        value = matrix[r][c]
        if value == target:
            return True
        if value < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False
~~~

- \`if not matrix or not matrix[0]\` — \`not []\` is \`True\`, so this covers both \`[]\` and \`[[]]\`. Without it, \`matrix[0]\` on an empty list raises \`IndexError: list index out of range\` (we ran it).
- \`r, c = divmod(mid, cols)\` — \`divmod\` returns the quotient and remainder together, exactly the index mapping: \`divmod(5, 4)\` is \`(1, 1)\`.
- \`lo <= hi\` with \`mid ± 1\` is the classic "search for an exact value" form; the loop ends when the range is empty.

**Shape 2 — staircase walk** (from Example 2):

~~~python
def staircase(matrix, target, path=None):
    """Rows AND columns sorted (rows need not chain). Start at the top-right corner:
    too big -> move left (drop the column), too small -> move down (drop the row)."""
    if not matrix or not matrix[0]:
        return None
    r, c = 0, len(matrix[0]) - 1
    while r < len(matrix) and c >= 0:
        value = matrix[r][c]
        if path is not None:
            path.append(f"({r},{c})={value}")
        if value == target:
            return (r, c)
        if value > target:
            c -= 1
        else:
            r += 1
    return None
~~~

- Returning \`None\` for "not found" and a tuple \`(r, c)\` for "found" is idiomatic Python; test it with \`is not None\`, because the position \`(0, 0)\` is a real answer.
- \`c\` can go to \`-1\`; the loop condition \`c >= 0\` stops it before \`matrix[r][-1]\` would silently read the *last* column — negative indices are legal in Python, so this bug would not crash.

## 8. Python Details That Matter

- **Row-by-row with \`bisect\`.** For "rows sorted, nothing else known", \`bisect.bisect_left(row, target)\` per row is O(m log n) and short: check \`i < len(row) and row[i] == target\`. \`bisect\` requires a sorted list, which each row is.
- **One-liners are O(m n).** \`any(target in row for row in matrix)\` reads like English but scans everything; mention it as the brute force.
- **Building test matrices.** \`[[0] * 3] * 2\` creates *two references to the same row*: after \`a[0][0] = 1\`, our run printed \`[[1, 0, 0], [1, 0, 0]]\`. Use \`[[0] * cols for _ in range(rows)]\`.
- **No overflow.** \`rows * cols\` is a Python \`int\` with unlimited size, so the 1D index never overflows (unlike Java and C++).

## 9. Verified: Running the Code

Every program below was saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13.16). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — Shape 1: flattened binary search on nine inputs**

~~~text
true
false
true
true
false
false
true
false
false
~~~

**Example 2 — Shape 2: staircase path, brute-force check, and why flattening fails**

~~~text
target 5 -> found at (1, 1)
  path: (0,4)=15 (0,3)=11 (0,2)=7 (0,1)=4 (1,1)=5
target 20 -> not found
  path: (0,4)=15 (1,4)=19 (2,4)=22 (2,3)=16 (3,3)=17 (4,3)=26 (4,2)=23 (4,1)=21 (4,0)=18
staircase agrees with brute force for 0..31: true
flattened search misses 12 of 25 values, e.g. [3, 4, 6, 7, 11]
~~~

The staircase answer matched a brute-force membership test for every target from 0 to 31. Running the Shape 1 binary search on the Shape 2 matrix missed 12 of the 25 values that are really there.

**Example 3 — Probe counts on a 1000 x 1000 matrix: flattened vs staircase**

~~~text
top-right corner: flattened 19 probes (true), staircase 1 probes (true)
centre cell: flattened 19 probes (true), staircase 1000 probes (true)
bottom-left corner: flattened 20 probes (true), staircase 1999 probes (true)
absent odd value: flattened 20 probes (false), staircase 1501 probes (false)
~~~

The matrix holds the even numbers \`0, 2, ..., 1999998\`, so it is both shapes at once. The flattened search never needed more than 20 probes; the staircase needed 1,999 for the bottom-left corner.

## 10. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`any(target in row ...)\` | O(m n) | O(1) | Reads every cell |
| \`bisect\` per row | O(m log n) | O(1) | One binary search per row |
| Flattened binary search (Shape 1) | O(log(m n)) | O(1) | Halves \`m * n\` candidates per probe: at most 20 for 1,000,000 cells |
| Staircase (Shape 1 or 2) | O(m + n) | O(1) | Drops a row or a column per probe: at most 1,999 for 1000 x 1000 |

## 11. Edge Cases

- **Empty matrix or empty first row** — \`[]\` and \`[[]]\` both return false before touching \`matrix[0][0]\`.
- **Single cell** — \`[[5]]\` searching for 5: \`lo = hi = 0\`, found.
- **Target below the minimum or above the maximum** — \`0\` and \`61\` in Example 1 end the search quickly with false.
- **Target at a corner** — top-right is the staircase best case (1 probe); bottom-left is its worst case (\`m + n - 1\` = 1,999 probes in Example 3).
- **Duplicates** — both methods still answer true/false correctly; if you need *every* position, you must keep searching after the first hit.
- **Very large matrices** — \`m * n\` may not fit in a 32-bit integer; see the language notes.

## 12. Common Pitfalls

- **Using the flattened search on a Shape 2 matrix.** It runs without error and silently misses values (12 of 25 in Example 2).
- **Starting the staircase at the top-left.** Both neighbours are bigger, so a too-small comparison gives no direction.
- **Letting \`c\` reach \`-1\` and indexing anyway.** Python reads \`row[-1]\`, the last column, instead of crashing — a silent wrong answer.
- **Using \`/\` for the row index.** \`5 / 4\` is \`1.25\`; use \`//\` or \`divmod\`.
- **Testing a position result with \`if result:\`.** Fine for tuples, but if you return a flat index, \`0\` is falsy; compare with \`None\`.
- **\`[[0] * n] * m\` in test setup.** Every row is the same list object.

## 13. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Ask first:</strong> <span style="color:#f0e2c8;">Do rows chain into one sorted sequence, or are rows and columns sorted separately? The algorithm depends on it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Shape 1:</strong> <span style="color:#f0e2c8;">Binary search over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 .. m*n - 1</code>, mapping with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r, c = divmod(mid, cols)</code>. O(log(m n)) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Shape 2:</strong> <span style="color:#f0e2c8;">Start top-right: too big, move left (drop the column); too small, move down (drop the row). O(m + n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Baselines:</strong> <span style="color:#f0e2c8;">Scan is O(m n), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect</code> per row is O(m log n). Flattening on Shape 2 is wrong — it missed 12 of 25 values in my test.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python notes:</strong> <span style="color:#f0e2c8;">Guard <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[]]</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[0]</code>, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">//</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">divmod</code>, and watch negative indices: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row[-1]</code> reads the last column instead of failing.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the top-right corner work but not the top-left?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Top-right is the largest in its row and the smallest in its column, so each comparison rules out a full row or column. From top-left both directions increase, so a small value gives no direction.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do better than O(m + n) on Shape 2?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in general: the anti-diagonal of an m x n Shape 2 matrix can hold unrelated values, and any algorithm must check them, so O(m + n) is optimal for square-ish matrices.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the count of values less than or equal to x?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the same staircase from bottom-left: when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[r][c] &lt;= x</code>, all <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r + 1</code> cells above are counted, move right; otherwise move up. O(m + n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the rows have different lengths?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The Shape 1 mapping <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">divmod(mid, cols)</code> assumes a rectangle; with jagged rows, use per-row <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect</code> instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">bisect</code> valid here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, on a single row, because each row is sorted. It is not valid on the flattened Shape 2 sequence, which is not sorted.</span>
</div>

</div>

## 14. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Row-major order** | Reading a matrix row by row; cell (r, c) is position r * cols + c |
| **Sorted matrix (Young tableau)** | Rows and columns each sorted ascending |
| **Index mapping** | row = index / cols, col = index % cols |
| **Staircase search (saddleback search)** | Walk from the top-right corner, dropping a row or a column per step |

---
**Conclusion:** "Search a sorted 2D matrix" is two problems: when rows chain, the matrix is a folded sorted array and one binary search with \`divmod(mid, cols)\` finds the target in O(log(m n)); when only rows and columns are sorted, the staircase walk from the top-right corner removes a row or a column per comparison in O(m + n). The runs showed the difference is real — 20 probes against up to 1,999 on Shape 1, and 12 missed values when the Shape 1 algorithm is used on Shape 2. In Python, guard empty input, use \`//\` or \`divmod\`, and remember that a negative index does not crash.
`,
        examples: [
          { label: "Shape 1: flattened binary search on nine inputs", code: `def search_matrix(matrix, target):
    """Rows sorted left to right, and each row starts after the previous row ends.
    Treat the m x n grid as one sorted list of length m*n."""
    if not matrix or not matrix[0]:
        return False
    rows, cols = len(matrix), len(matrix[0])
    lo, hi = 0, rows * cols - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        r, c = divmod(mid, cols)          # 1D index -> (row, column)
        value = matrix[r][c]
        if value == target:
            return True
        if value < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False


M = [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]]
print(str(search_matrix(M, 3)).lower())      # true
print(str(search_matrix(M, 13)).lower())     # false
print(str(search_matrix(M, 1)).lower())      # true
print(str(search_matrix(M, 60)).lower())     # true
print(str(search_matrix(M, 0)).lower())      # false
print(str(search_matrix(M, 61)).lower())     # false
print(str(search_matrix([[5]], 5)).lower())  # true
print(str(search_matrix([], 5)).lower())     # false
print(str(search_matrix([[]], 5)).lower())   # false` },
          { label: "Shape 2: staircase path, brute-force check, and why flattening fails", code: `def staircase(matrix, target, path=None):
    """Rows AND columns sorted (rows need not chain). Start at the top-right corner:
    too big -> move left (drop the column), too small -> move down (drop the row)."""
    if not matrix or not matrix[0]:
        return None
    r, c = 0, len(matrix[0]) - 1
    while r < len(matrix) and c >= 0:
        value = matrix[r][c]
        if path is not None:
            path.append(f"({r},{c})={value}")
        if value == target:
            return (r, c)
        if value > target:
            c -= 1
        else:
            r += 1
    return None


def flattened(matrix, target):
    """The 1D binary search from example 1: only valid when rows chain."""
    cols = len(matrix[0])
    lo, hi = 0, len(matrix) * cols - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        value = matrix[mid // cols][mid % cols]
        if value == target:
            return True
        if value < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False


def fmt(pos):
    return "not found" if pos is None else f"found at ({pos[0]}, {pos[1]})"


G = [[1, 4, 7, 11, 15],
     [2, 5, 8, 12, 19],
     [3, 6, 9, 16, 22],
     [10, 13, 14, 17, 24],
     [18, 21, 23, 26, 30]]

for target in [5, 20]:
    path = []
    result = staircase(G, target, path)
    print("target", target, "->", fmt(result))
    print("  path:", " ".join(path))

present = {v for row in G for v in row}
agree = all((staircase(G, t) is not None) == (t in present) for t in range(0, 32))
print("staircase agrees with brute force for 0..31:", str(agree).lower())

wrong = [t for t in sorted(present) if not flattened(G, t)]
print("flattened search misses", len(wrong), "of", len(present), "values, e.g.", wrong[:5])` },
          { label: "Probe counts on a 1000 x 1000 matrix: flattened vs staircase", code: `# Count how many cells each method reads on a big matrix that satisfies BOTH
# shapes (rows chain, so rows and columns are also sorted).
ROWS, COLS = 1000, 1000
grid = [[2 * (r * COLS + c) for c in range(COLS)] for r in range(ROWS)]  # even numbers 0..1999998


def flattened_probes(target):
    lo, hi, probes = 0, ROWS * COLS - 1, 0
    while lo <= hi:
        mid = (lo + hi) // 2
        probes += 1
        value = grid[mid // COLS][mid % COLS]
        if value == target:
            return True, probes
        if value < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False, probes


def staircase_probes(target):
    r, c, probes = 0, COLS - 1, 0
    while r < ROWS and c >= 0:
        probes += 1
        value = grid[r][c]
        if value == target:
            return True, probes
        if value > target:
            c -= 1
        else:
            r += 1
    return False, probes


cases = [("top-right corner", grid[0][COLS - 1]),
         ("centre cell", grid[500][500]),
         ("bottom-left corner", grid[ROWS - 1][0]),
         ("absent odd value", 1000001)]
for name, target in cases:
    f_found, f_probes = flattened_probes(target)
    s_found, s_probes = staircase_probes(target)
    print(f"{name}: flattened {f_probes} probes ({str(f_found).lower()}), "
          f"staircase {s_probes} probes ({str(s_found).lower()})")` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given a matrix of numbers that is sorted, and a target. Return whether the target is in the matrix. Please write it in JavaScript, and explain how your approach depends on how exactly the matrix is sorted."

**What a strong answer should cover:**
- Asks which shape: rows chaining into one sorted sequence (LeetCode 74) or rows and columns sorted independently (LeetCode 240).
- Shape 1: binary search over \`0 .. m*n - 1\` with \`Math.floor(mid / cols)\` and \`mid % cols\`, O(log(m n)).
- Shape 2: staircase walk from the top-right corner, O(m + n), and why the top-left corner fails.
- Brute force O(m n) (\`matrix.flat().includes(t)\`) and row-by-row binary search O(m log n) as baselines.
- JavaScript specifics: \`/\` returns a float, \`matrix[0].length\` on an empty matrix throws a \`TypeError\`, out-of-range reads return \`undefined\` silently, and \`Array(m).fill([])\` shares one row.

**Clarifying questions expected:**
- "Does each row start after the previous row ends, or are rows and columns sorted separately?"
- "Return a boolean or the position?"
- "Can the matrix or its rows be empty?"

**Code / implementation expected:** Yes — \`searchMatrix(matrix, target)\` for Shape 1 and a staircase function for Shape 2, in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays, nested lists and loops; binary search is linked and summarised.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the JavaScript programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

Think of two kinds of tidy bookshelf.

**Shelf one** is a single long row of books in alphabetical order that the carpenter happened to cut into three planks. Plank two starts exactly where plank one ends. If you mentally glue the planks back together you have one sorted row, and you can find a book the classic way — open in the middle, go left or right, halve again.

**Shelf two** is a wall of cubbyholes in a stadium shop, where prices go **up** as you move right and also go **up** as you move down. The bottom-left cubby is not the "next" one after the top-right cubby; there is no single order. But stand at the **top-right** cubby: everything to its left is cheaper, everything below is pricier. Too expensive? Step left and forget that whole column. Too cheap? Step down and forget that whole row. Each look throws away a full row or column.

Interviewers say "sorted 2D matrix" for both shelves. The first thing a strong candidate does is ask *which one*, because the right algorithm — and the wrong one — depends on it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| "Is each row's first value bigger than the previous row's last value, or are rows and columns just sorted on their own?" | Shape 1 allows one binary search over \`m * n\` cells (O(log(m n))). Shape 2 needs the staircase walk (O(m + n)). Using the first on the second gives wrong answers. |
| "Do you want true/false or the position?" | Changes the return type; both algorithms can return \`(row, col)\`. |
| "Can the matrix or a row be empty?" | \`matrix[0]\` on an empty matrix fails; guard it. |
| "Are all rows the same length?" | Index mapping \`row = i / cols\` assumes a rectangle. |
| "How large can it be?" | \`m * n\` can exceed the 32-bit \`int\` range in Java and C++. |

## 3. Two Different Problems Behind One Title

<svg class="iq-diagram" width="100%" viewBox="0 0 750 272" role="img" aria-label="Two kinds of sorted matrix. Left, rows chain into one sorted list. Right, every row and every column is sorted on its own">
  <defs>
    <marker id="b04q2-a-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="170" y="24" text-anchor="middle">Shape 1: rows chain</text>
  <rect class="d-box" x="40" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="69.0" y="69.0" text-anchor="middle">1</text>
  <rect class="d-box" x="106" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="135.0" y="69.0" text-anchor="middle">3</text>
  <rect class="d-box" x="172" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="201.0" y="69.0" text-anchor="middle">5</text>
  <rect class="d-box" x="238" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="267.0" y="69.0" text-anchor="middle">7</text>
  <rect class="d-box" x="40" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="69.0" y="123.0" text-anchor="middle">10</text>
  <rect class="d-box" x="106" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="135.0" y="123.0" text-anchor="middle">11</text>
  <rect class="d-box" x="172" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="201.0" y="123.0" text-anchor="middle">16</text>
  <rect class="d-box" x="238" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="267.0" y="123.0" text-anchor="middle">20</text>
  <rect class="d-box" x="40" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="69.0" y="177.0" text-anchor="middle">23</text>
  <rect class="d-box" x="106" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="135.0" y="177.0" text-anchor="middle">30</text>
  <rect class="d-box" x="172" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="201.0" y="177.0" text-anchor="middle">34</text>
  <rect class="d-box" x="238" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="267.0" y="177.0" text-anchor="middle">60</text>
  <rect class="d-box-muted" x="40" y="214" width="256" height="38" rx="8"/>
  <text class="d-sub" x="168" y="238" text-anchor="middle">row 0 ends 7, row 1 starts 10</text>
  <text class="d-text d-accent" x="560" y="24" text-anchor="middle">Shape 2: rows and columns sorted</text>
  <rect class="d-box" x="400" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="429.0" y="69.0" text-anchor="middle">1</text>
  <rect class="d-box" x="466" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="495.0" y="69.0" text-anchor="middle">4</text>
  <rect class="d-box" x="532" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="561.0" y="69.0" text-anchor="middle">7</text>
  <rect class="d-box" x="598" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="627.0" y="69.0" text-anchor="middle">11</text>
  <rect class="d-box" x="664" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="693.0" y="69.0" text-anchor="middle">15</text>
  <rect class="d-box" x="400" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="429.0" y="123.0" text-anchor="middle">2</text>
  <rect class="d-box" x="466" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="495.0" y="123.0" text-anchor="middle">5</text>
  <rect class="d-box" x="532" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="561.0" y="123.0" text-anchor="middle">8</text>
  <rect class="d-box" x="598" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="627.0" y="123.0" text-anchor="middle">12</text>
  <rect class="d-box" x="664" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="693.0" y="123.0" text-anchor="middle">19</text>
  <rect class="d-box" x="400" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="429.0" y="177.0" text-anchor="middle">3</text>
  <rect class="d-box" x="466" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="495.0" y="177.0" text-anchor="middle">6</text>
  <rect class="d-box" x="532" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="561.0" y="177.0" text-anchor="middle">9</text>
  <rect class="d-box" x="598" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="627.0" y="177.0" text-anchor="middle">16</text>
  <rect class="d-box" x="664" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="693.0" y="177.0" text-anchor="middle">22</text>
  <rect class="d-box-muted" x="400" y="214" width="322" height="38" rx="8"/>
  <text class="d-sub" x="561" y="238" text-anchor="middle">row 0 ends 15, row 1 starts 2</text>
</svg>

**Shape 1 (LeetCode 74, "Search a 2D Matrix")**: each row is sorted, and each row starts with a value bigger than the last value of the row above. Reading the matrix row by row gives one sorted list.

**Shape 2 (LeetCode 240, "Search a 2D Matrix II")**: each row is sorted left to right and each column is sorted top to bottom, but a row does *not* have to start after the previous row ends — in the right-hand matrix, row 1 starts with 2, which is smaller than 15 at the end of row 0.

📌 **Interview term: Row-major order** — reading a matrix one row at a time, left to right, top to bottom. Cell \`(r, c)\` of a matrix with \`cols\` columns is position \`r * cols + c\` in that order.

📌 **Interview term: Sorted matrix (Young tableau)** — a matrix whose rows and columns are each sorted ascending (Shape 2). Every Shape 1 matrix is also a Shape 2 matrix, but not the other way round.

The brute force works on both: look at every cell, O(m n). A better general approach is a binary search in each row, O(m log n). Both are worth one sentence before you give the real answer.

## 4. Shape 1: Pretend It Is One Sorted Array

Because the rows chain, the matrix *is* a sorted array of length \`m * n\` that happens to be folded into rows. Run an ordinary [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) over indices \`0 .. m*n - 1\`, and translate each index back into a cell only when you need to read it.

📌 **Interview term: Index mapping** — converting a 1D position into 2D coordinates: \`row = index / cols\` (integer division) and \`col = index % cols\` (the remainder). No array is ever actually flattened, so no extra memory is used.

<svg class="iq-diagram" width="100%" viewBox="0 0 740 320" role="img" aria-label="A 3 by 4 matrix read in row-major order becomes one sorted list of 12 values. Index 5 maps to row 1, column 1, value 11">
  <defs>
    <marker id="b04q2-b-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="40" width="58" height="42" rx="6"/>
  <text class="d-text" x="69.0" y="66.0" text-anchor="middle">1</text>
  <rect class="d-box" x="106" y="40" width="58" height="42" rx="6"/>
  <text class="d-text" x="135.0" y="66.0" text-anchor="middle">3</text>
  <rect class="d-box" x="172" y="40" width="58" height="42" rx="6"/>
  <text class="d-text" x="201.0" y="66.0" text-anchor="middle">5</text>
  <rect class="d-box" x="238" y="40" width="58" height="42" rx="6"/>
  <text class="d-text" x="267.0" y="66.0" text-anchor="middle">7</text>
  <rect class="d-box" x="40" y="96" width="58" height="42" rx="6"/>
  <text class="d-text" x="69.0" y="122.0" text-anchor="middle">10</text>
  <rect class="d-box-accent" x="106" y="96" width="58" height="42" rx="6"/>
  <text class="d-text" x="135.0" y="122.0" text-anchor="middle">11</text>
  <rect class="d-box" x="172" y="96" width="58" height="42" rx="6"/>
  <text class="d-text" x="201.0" y="122.0" text-anchor="middle">16</text>
  <rect class="d-box" x="238" y="96" width="58" height="42" rx="6"/>
  <text class="d-text" x="267.0" y="122.0" text-anchor="middle">20</text>
  <rect class="d-box" x="40" y="152" width="58" height="42" rx="6"/>
  <text class="d-text" x="69.0" y="178.0" text-anchor="middle">23</text>
  <rect class="d-box" x="106" y="152" width="58" height="42" rx="6"/>
  <text class="d-text" x="135.0" y="178.0" text-anchor="middle">30</text>
  <rect class="d-box" x="172" y="152" width="58" height="42" rx="6"/>
  <text class="d-text" x="201.0" y="178.0" text-anchor="middle">34</text>
  <rect class="d-box" x="238" y="152" width="58" height="42" rx="6"/>
  <text class="d-text" x="267.0" y="178.0" text-anchor="middle">60</text>
  <text class="d-sub" x="22" y="66" text-anchor="middle">r0</text>
  <text class="d-sub" x="22" y="122" text-anchor="middle">r1</text>
  <text class="d-sub" x="22" y="178" text-anchor="middle">r2</text>
  <text class="d-sub" x="69" y="28" text-anchor="middle">c0</text>
  <text class="d-sub" x="135" y="28" text-anchor="middle">c1</text>
  <text class="d-sub" x="201" y="28" text-anchor="middle">c2</text>
  <text class="d-sub" x="267" y="28" text-anchor="middle">c3</text>
  <path class="d-edge" d="M 320 124 L 380 124" marker-end="url(#b04q2-b-javascript)"/>
  <rect class="d-box-muted" x="390" y="40" width="300" height="170" rx="10"/>
  <text class="d-text" x="540" y="74" text-anchor="middle">1D index mid = 5</text>
  <text class="d-sub" x="540" y="108" text-anchor="middle">row = 5 div 4 = 1</text>
  <text class="d-sub" x="540" y="138" text-anchor="middle">col = 5 mod 4 = 1</text>
  <text class="d-text d-accent" x="540" y="176" text-anchor="middle">matrix[1][1] = 11</text>
  <rect class="d-box-muted" x="40" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="63.0" y="273.0" text-anchor="middle">1</text>
  <text class="d-sub" x="63.0" y="304" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="94" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="117.0" y="273.0" text-anchor="middle">3</text>
  <text class="d-sub" x="117.0" y="304" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="148" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="171.0" y="273.0" text-anchor="middle">5</text>
  <text class="d-sub" x="171.0" y="304" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="202" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="225.0" y="273.0" text-anchor="middle">7</text>
  <text class="d-sub" x="225.0" y="304" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="256" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="279.0" y="273.0" text-anchor="middle">10</text>
  <text class="d-sub" x="279.0" y="304" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="310" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="333.0" y="273.0" text-anchor="middle">11</text>
  <text class="d-sub" x="333.0" y="304" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="364" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="387.0" y="273.0" text-anchor="middle">16</text>
  <text class="d-sub" x="387.0" y="304" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="418" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="441.0" y="273.0" text-anchor="middle">20</text>
  <text class="d-sub" x="441.0" y="304" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="472" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="495.0" y="273.0" text-anchor="middle">23</text>
  <text class="d-sub" x="495.0" y="304" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="526" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="549.0" y="273.0" text-anchor="middle">30</text>
  <text class="d-sub" x="549.0" y="304" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="580" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="603.0" y="273.0" text-anchor="middle">34</text>
  <text class="d-sub" x="603.0" y="304" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="634" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="657.0" y="273.0" text-anchor="middle">60</text>
  <text class="d-sub" x="657.0" y="304" text-anchor="middle">11</text>
</svg>

Searching for \`11\`: \`lo = 0\`, \`hi = 11\`, \`mid = 5\`, which maps to row 1, column 1 — the value 11, found on the first probe. Searching for \`13\` ends with \`lo > hi\` and returns false. Because every step halves the range, the cost is O(log(m n)), which equals O(log m + log n).

## 5. Shape 2: The Staircase Walk

Binary search over the folded array fails here because the folded array is not sorted (\`1, 4, 7, 11, 15, 2, 5, ...\`). Example 2 shows it misses 12 of the 25 values. We need a different elimination rule.

Start at the **top-right** cell. It is the biggest value in its row and the smallest value in its column. Compare it with the target:

- **Equal** — found.
- **Bigger than the target** — every cell below it in this column is even bigger, so the whole column is useless. Move **left**.
- **Smaller than the target** — every cell to its left in this row is even smaller, so the whole row is useless. Move **down**.

📌 **Interview term: Staircase search (saddleback search)** — the walk from a corner where one direction only increases and the other only decreases, removing one row or one column per comparison. It takes at most \`m + n - 1\` steps.

<svg class="iq-diagram" width="100%" viewBox="0 0 750 336" role="img" aria-label="Staircase search for 5 in a 5 by 5 matrix. Start at 15 in the top-right corner, move left past 11 and 7 to 4, then down to 5">
  <defs>
    <marker id="b04q2-c-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="60" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="76.0" text-anchor="middle">1</text>
  <rect class="d-box" x="130" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="76.0" text-anchor="middle">4</text>
  <rect class="d-box" x="200" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="76.0" text-anchor="middle">7</text>
  <rect class="d-box" x="270" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="76.0" text-anchor="middle">11</text>
  <rect class="d-box" x="340" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="76.0" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="60" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="132.0" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="130" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="132.0" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="200" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="132.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="270" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="132.0" text-anchor="middle">12</text>
  <rect class="d-box-muted" x="340" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="132.0" text-anchor="middle">19</text>
  <rect class="d-box-muted" x="60" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="188.0" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="130" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="188.0" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="200" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="188.0" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="270" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="188.0" text-anchor="middle">16</text>
  <rect class="d-box-muted" x="340" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="188.0" text-anchor="middle">22</text>
  <rect class="d-box-muted" x="60" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="244.0" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="130" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="244.0" text-anchor="middle">13</text>
  <rect class="d-box-muted" x="200" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="244.0" text-anchor="middle">14</text>
  <rect class="d-box-muted" x="270" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="244.0" text-anchor="middle">17</text>
  <rect class="d-box-muted" x="340" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="244.0" text-anchor="middle">24</text>
  <rect class="d-box-muted" x="60" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="300.0" text-anchor="middle">18</text>
  <rect class="d-box-muted" x="130" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="300.0" text-anchor="middle">21</text>
  <rect class="d-box-muted" x="200" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="300.0" text-anchor="middle">23</text>
  <rect class="d-box-muted" x="270" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="300.0" text-anchor="middle">26</text>
  <rect class="d-box-muted" x="340" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="300.0" text-anchor="middle">30</text>
  <text class="d-text d-accent" x="370" y="34" text-anchor="middle">start</text>
  <rect class="d-box-muted" x="440" y="50" width="280" height="46" rx="8"/>
  <text class="d-sub" x="580" y="78" text-anchor="middle">start at the top-right corner</text>
  <rect class="d-box-muted" x="440" y="112" width="280" height="46" rx="8"/>
  <text class="d-sub" x="580" y="140" text-anchor="middle">15, 11, 7: too big, move left</text>
  <rect class="d-box-muted" x="440" y="174" width="280" height="46" rx="8"/>
  <text class="d-sub" x="580" y="202" text-anchor="middle">4: too small, move down</text>
  <rect class="d-box-accent" x="440" y="236" width="280" height="46" rx="8"/>
  <text class="d-sub" x="580" y="264" text-anchor="middle">5: found at row 1, col 1</text>
</svg>

The search for 5 visits \`15, 11, 7, 4, 5\` — five cells out of 25, exactly the path Example 2 prints. The bottom-left corner works too (up when too big, right when too small). The top-left and bottom-right corners do **not** work: from top-left both directions increase, so a "too small" answer does not tell you which way to go.

## 6. Which One Should You Use?

| Method | Works on | Time | Probes on a 1000 x 1000 Shape 1 matrix (Example 3) |
| :--- | :--- | :--- | :--- |
| Scan every cell | Any matrix | O(m n) | up to 1,000,000 |
| Binary search each row | Sorted rows | O(m log n) | about 10 per row, up to 1,000 rows |
| Flattened binary search | Shape 1 only | O(log(m n)) | 19 or 20 |
| Staircase walk | Shape 1 and Shape 2 | O(m + n) | 1 to 1,999 |

On a Shape 1 matrix the flattened search wins clearly — 20 probes against 1,999 for the worst staircase case. On a Shape 2 matrix only the staircase (or the row-by-row search) is correct. If you are not told which shape you have, the staircase is the safe choice.

> **Key insight:** both algorithms are "elimination" searches. Binary search eliminates half of the remaining cells per probe; the staircase eliminates a whole row or column per probe. Pick the one whose elimination rule the data actually supports.

## 7. The JavaScript Solution, Line by Line

**Shape 1 — flattened binary search:**

~~~javascript
function searchMatrix(matrix, target) {
  if (matrix.length === 0 || matrix[0].length === 0) return false;
  const rows = matrix.length, cols = matrix[0].length;
  let lo = 0, hi = rows * cols - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const r = Math.floor(mid / cols), c = mid % cols;   // 1D index -> (row, column)
    const value = matrix[r][c];
    if (value === target) return true;
    if (value < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}
~~~

- The guard comes first: \`[][0].length\` throws \`TypeError: Cannot read properties of undefined (reading 'length')\` (we ran it).
- \`Math.floor(mid / cols)\` — JavaScript \`/\` is floating-point division, so the floor is required; \`%\` gives the column.
- \`===\` compares numbers without type conversion. If the matrix came from JSON with numeric strings, convert first — \`"10" < "9"\` is \`true\`.

**Shape 2 — staircase walk** (from Example 2):

~~~javascript
function staircase(matrix, target, path) {
  if (matrix.length === 0 || matrix[0].length === 0) return null;
  let r = 0, c = matrix[0].length - 1;
  while (r < matrix.length && c >= 0) {
    const value = matrix[r][c];
    if (path) path.push('(' + r + ',' + c + ')=' + value);
    if (value === target) return [r, c];
    if (value > target) c--;
    else r++;
  }
  return null;
}
~~~

- Returning \`null\` for "not found" and \`[r, c]\` for "found" — check with \`!== null\`, since \`[0, 0]\` is a real answer.
- If \`c\` went to \`-1\` and you read \`matrix[r][-1]\`, JavaScript returns \`undefined\` (there is no negative indexing on \`[]\`, unlike \`.at(-1)\`), and \`undefined > target\` is \`false\` — the bug would be silent, so the \`c >= 0\` check matters.

## 8. JavaScript Details That Matter

- **\`matrix.flat().includes(target)\`** is a readable brute force but O(m n) time *and* O(m n) memory for the new array.
- **Per-row binary search.** JavaScript has no built-in binary search on arrays; write the loop once and call it per row for the O(m log n) baseline.
- **Building test matrices.** \`Array(2).fill([])\` puts the *same* array in every slot: after \`a[0].push(1)\` our run printed \`[[1],[1]]\`. Use \`Array.from({ length: m }, () => new Array(n).fill(0))\`.
- **Sorting numbers.** In Example 2 the values are collected from a \`Set\` and sorted with \`(a, b) => a - b\`; the default \`sort()\` compares as strings and puts \`10\` before \`2\`.
- **Size limits.** Indices are doubles, exact up to 2^53 - 1, so \`rows * cols\` is safe for any matrix that fits in memory — but do not use \`>> 1\` for the midpoint, which truncates to 32 bits.

## 9. Verified: Running the Code

Every program below was saved as \`main.js\` and run with \`node main.js\` (Node.js v22.22.0). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — Shape 1: flattened binary search on nine inputs**

~~~text
true
false
true
true
false
false
true
false
false
~~~

**Example 2 — Shape 2: staircase path, brute-force check, and why flattening fails**

~~~text
target 5 -> found at (1, 1)
  path: (0,4)=15 (0,3)=11 (0,2)=7 (0,1)=4 (1,1)=5
target 20 -> not found
  path: (0,4)=15 (1,4)=19 (2,4)=22 (2,3)=16 (3,3)=17 (4,3)=26 (4,2)=23 (4,1)=21 (4,0)=18
staircase agrees with brute force for 0..31: true
flattened search misses 12 of 25 values, e.g. [3, 4, 6, 7, 11]
~~~

The staircase answer matched a brute-force membership test for every target from 0 to 31. Running the Shape 1 binary search on the Shape 2 matrix missed 12 of the 25 values that are really there.

**Example 3 — Probe counts on a 1000 x 1000 matrix: flattened vs staircase**

~~~text
top-right corner: flattened 19 probes (true), staircase 1 probes (true)
centre cell: flattened 19 probes (true), staircase 1000 probes (true)
bottom-left corner: flattened 20 probes (true), staircase 1999 probes (true)
absent odd value: flattened 20 probes (false), staircase 1501 probes (false)
~~~

The matrix holds the even numbers \`0, 2, ..., 1999998\`, so it is both shapes at once. The flattened search never needed more than 20 probes; the staircase needed 1,999 for the bottom-left corner.

## 10. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`matrix.flat().includes(t)\` | O(m n) | O(m n) | Copies and scans every cell |
| Binary search per row | O(m log n) | O(1) | One search per row |
| Flattened binary search (Shape 1) | O(log(m n)) | O(1) | At most 20 probes for 1,000,000 cells |
| Staircase (Shape 1 or 2) | O(m + n) | O(1) | At most 1,999 probes for 1000 x 1000 |

## 11. Edge Cases

- **Empty matrix or empty first row** — \`[]\` and \`[[]]\` both return false before touching \`matrix[0][0]\`.
- **Single cell** — \`[[5]]\` searching for 5: \`lo = hi = 0\`, found.
- **Target below the minimum or above the maximum** — \`0\` and \`61\` in Example 1 end the search quickly with false.
- **Target at a corner** — top-right is the staircase best case (1 probe); bottom-left is its worst case (\`m + n - 1\` = 1,999 probes in Example 3).
- **Duplicates** — both methods still answer true/false correctly; if you need *every* position, you must keep searching after the first hit.
- **Very large matrices** — \`m * n\` may not fit in a 32-bit integer; see the language notes.

## 12. Common Pitfalls

- **Using the flattened search on a Shape 2 matrix.** No error, just missing values (12 of 25 in Example 2).
- **Starting the staircase at the top-left.** A too-small comparison gives no direction.
- **Forgetting \`Math.floor\`.** \`matrix[1.25]\` is \`undefined\`, and comparisons with \`undefined\` are always \`false\`.
- **Touching \`matrix[0].length\` before the empty check.** It throws a \`TypeError\` on \`[]\`.
- **Testing a position with a truthiness check on a flat index.** \`0\` is falsy; compare with \`null\`.
- **\`Array(m).fill([])\` for test data.** All rows are one shared array.

## 13. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Ask first:</strong> <span style="color:#f0e2c8;">Do rows chain into one sorted sequence, or are rows and columns sorted separately? The algorithm depends on it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Shape 1:</strong> <span style="color:#f0e2c8;">Binary search over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 .. m*n - 1</code>, reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[Math.floor(mid / cols)][mid % cols]</code>. O(log(m n)), O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Shape 2:</strong> <span style="color:#f0e2c8;">Start top-right: too big, move left; too small, move down. O(m + n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Baselines:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flat().includes</code> is O(m n); per-row binary search is O(m log n). Flattening Shape 2 is wrong — it missed 12 of 25 values in my test.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript notes:</strong> <span style="color:#f0e2c8;">Floor the division, guard <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[]</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[0].length</code>, and remember out-of-range reads return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> instead of throwing.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the top-right corner work but not the top-left?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Top-right is the largest in its row and smallest in its column, so each comparison rules out a whole row or column. From top-left both directions increase.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you beat O(m + n) on Shape 2?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in general: the anti-diagonal cells are independent of each other, and any correct algorithm has to look at them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you count values less than or equal to x?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Staircase from bottom-left: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[r][c] &lt;= x</code>, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r + 1</code> and move right; otherwise move up. O(m + n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">matrix.flat()</code> and then binary search?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On Shape 1 it works but costs O(m n) to build the array, wasting the O(log) search. On Shape 2 the flattened array is not sorted at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if rows have different lengths?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The index mapping assumes a rectangle; use a binary search per row instead.</span>
</div>

</div>

## 14. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Row-major order** | Reading a matrix row by row; cell (r, c) is position r * cols + c |
| **Sorted matrix (Young tableau)** | Rows and columns each sorted ascending |
| **Index mapping** | row = index / cols, col = index % cols |
| **Staircase search (saddleback search)** | Walk from the top-right corner, dropping a row or a column per step |

---
**Conclusion:** "Search a sorted 2D matrix" hides two problems: if rows chain, binary search the folded array with \`Math.floor(mid / cols)\` and \`mid % cols\` in O(log(m n)); if only rows and columns are sorted, walk the staircase from the top-right corner in O(m + n). The runs showed 20 probes versus up to 1,999 on Shape 1, and 12 missed values when the wrong algorithm meets Shape 2. In JavaScript, floor every division, guard empty input before reading \`matrix[0].length\`, and remember that a bad index gives \`undefined\`, not an error.
`,
        examples: [
          { label: "Shape 1: flattened binary search on nine inputs", code: `// Rows sorted left to right, and each row starts after the previous row ends.
// Treat the m x n grid as one sorted list of length m*n.
function searchMatrix(matrix, target) {
  if (matrix.length === 0 || matrix[0].length === 0) return false;
  const rows = matrix.length, cols = matrix[0].length;
  let lo = 0, hi = rows * cols - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const r = Math.floor(mid / cols), c = mid % cols;   // 1D index -> (row, column)
    const value = matrix[r][c];
    if (value === target) return true;
    if (value < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}

const M = [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]];
console.log(searchMatrix(M, 3));      // true
console.log(searchMatrix(M, 13));     // false
console.log(searchMatrix(M, 1));      // true
console.log(searchMatrix(M, 60));     // true
console.log(searchMatrix(M, 0));      // false
console.log(searchMatrix(M, 61));     // false
console.log(searchMatrix([[5]], 5));  // true
console.log(searchMatrix([], 5));     // false
console.log(searchMatrix([[]], 5));   // false` },
          { label: "Shape 2: staircase path, brute-force check, and why flattening fails", code: `// Rows AND columns sorted (rows need not chain). Start at the top-right corner:
// too big -> move left (drop the column), too small -> move down (drop the row).
function staircase(matrix, target, path) {
  if (matrix.length === 0 || matrix[0].length === 0) return null;
  let r = 0, c = matrix[0].length - 1;
  while (r < matrix.length && c >= 0) {
    const value = matrix[r][c];
    if (path) path.push('(' + r + ',' + c + ')=' + value);
    if (value === target) return [r, c];
    if (value > target) c--;
    else r++;
  }
  return null;
}

// The 1D binary search from example 1: only valid when rows chain.
function flattened(matrix, target) {
  const cols = matrix[0].length;
  let lo = 0, hi = matrix.length * cols - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const value = matrix[Math.floor(mid / cols)][mid % cols];
    if (value === target) return true;
    if (value < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}

function fmt(pos) {
  return pos === null ? 'not found' : 'found at (' + pos[0] + ', ' + pos[1] + ')';
}

const G = [[1, 4, 7, 11, 15],
           [2, 5, 8, 12, 19],
           [3, 6, 9, 16, 22],
           [10, 13, 14, 17, 24],
           [18, 21, 23, 26, 30]];

for (const target of [5, 20]) {
  const path = [];
  const result = staircase(G, target, path);
  console.log('target ' + target + ' -> ' + fmt(result));
  console.log('  path: ' + path.join(' '));
}

const present = new Set(G.flat());
let agree = true;
for (let t = 0; t <= 31; t++) {
  if ((staircase(G, t) !== null) !== present.has(t)) agree = false;
}
console.log('staircase agrees with brute force for 0..31: ' + agree);

// a Set iterates in insertion order, so sort numerically (the default sort compares strings)
const values = [...present].sort((a, b) => a - b);
const wrong = values.filter((t) => !flattened(G, t));
console.log('flattened search misses ' + wrong.length + ' of ' + values.length + ' values, e.g. [' + wrong.slice(0, 5).join(', ') + ']');` },
          { label: "Probe counts on a 1000 x 1000 matrix: flattened vs staircase", code: `// Count how many cells each method reads on a big matrix that satisfies BOTH
// shapes (rows chain, so rows and columns are also sorted).
const ROWS = 1000, COLS = 1000;
const grid = [];
for (let r = 0; r < ROWS; r++) {
  const row = new Array(COLS);
  for (let c = 0; c < COLS; c++) row[c] = 2 * (r * COLS + c);   // even numbers 0..1999998
  grid.push(row);
}

function flattenedProbes(target) {
  let lo = 0, hi = ROWS * COLS - 1, probes = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    probes++;
    const value = grid[Math.floor(mid / COLS)][mid % COLS];
    if (value === target) return [true, probes];
    if (value < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return [false, probes];
}

function staircaseProbes(target) {
  let r = 0, c = COLS - 1, probes = 0;
  while (r < ROWS && c >= 0) {
    probes++;
    const value = grid[r][c];
    if (value === target) return [true, probes];
    if (value > target) c--;
    else r++;
  }
  return [false, probes];
}

const cases = [['top-right corner', grid[0][COLS - 1]],
               ['centre cell', grid[500][500]],
               ['bottom-left corner', grid[ROWS - 1][0]],
               ['absent odd value', 1000001]];
for (const [name, target] of cases) {
  const [fFound, fProbes] = flattenedProbes(target);
  const [sFound, sProbes] = staircaseProbes(target);
  console.log(name + ': flattened ' + fProbes + ' probes (' + fFound + '), staircase ' + sProbes + ' probes (' + sFound + ')');
}` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given an \`int[][]\` matrix that is sorted, and a target. Return whether the target is in the matrix. Please write it in Java, and explain how your approach depends on how exactly the matrix is sorted."

**What a strong answer should cover:**
- Asks which shape: rows chaining into one sorted sequence (LeetCode 74) or rows and columns sorted independently (LeetCode 240).
- Shape 1: binary search over \`0 .. m*n - 1\` with \`mid / cols\` and \`mid % cols\`, O(log(m n)).
- Shape 2: staircase walk from the top-right corner, O(m + n), and why the top-left corner fails.
- Baselines: full scan O(m n), \`Arrays.binarySearch\` per row O(m log n).
- Java specifics: \`rows * cols\` can overflow \`int\` (use \`long\`), \`int[][]\` rows can be jagged, \`matrix[0]\` on an empty array throws, and \`Arrays.binarySearch\` returns a negative insertion point when the key is absent.

**Clarifying questions expected:**
- "Does each row start after the previous row ends, or are rows and columns sorted separately?"
- "Return a boolean or the position?"
- "Can the matrix or its rows be empty?"

**Code / implementation expected:** Yes — \`static boolean searchMatrix(int[][] matrix, int target)\` and a staircase method, in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays, nested lists and loops; binary search is linked and summarised.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the Java programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

Think of two kinds of tidy bookshelf.

**Shelf one** is a single long row of books in alphabetical order that the carpenter happened to cut into three planks. Plank two starts exactly where plank one ends. If you mentally glue the planks back together you have one sorted row, and you can find a book the classic way — open in the middle, go left or right, halve again.

**Shelf two** is a wall of cubbyholes in a stadium shop, where prices go **up** as you move right and also go **up** as you move down. The bottom-left cubby is not the "next" one after the top-right cubby; there is no single order. But stand at the **top-right** cubby: everything to its left is cheaper, everything below is pricier. Too expensive? Step left and forget that whole column. Too cheap? Step down and forget that whole row. Each look throws away a full row or column.

Interviewers say "sorted 2D matrix" for both shelves. The first thing a strong candidate does is ask *which one*, because the right algorithm — and the wrong one — depends on it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| "Is each row's first value bigger than the previous row's last value, or are rows and columns just sorted on their own?" | Shape 1 allows one binary search over \`m * n\` cells (O(log(m n))). Shape 2 needs the staircase walk (O(m + n)). Using the first on the second gives wrong answers. |
| "Do you want true/false or the position?" | Changes the return type; both algorithms can return \`(row, col)\`. |
| "Can the matrix or a row be empty?" | \`matrix[0]\` on an empty matrix fails; guard it. |
| "Are all rows the same length?" | Index mapping \`row = i / cols\` assumes a rectangle. |
| "How large can it be?" | \`m * n\` can exceed the 32-bit \`int\` range in Java and C++. |

## 3. Two Different Problems Behind One Title

<svg class="iq-diagram" width="100%" viewBox="0 0 750 272" role="img" aria-label="Two kinds of sorted matrix. Left, rows chain into one sorted list. Right, every row and every column is sorted on its own">
  <defs>
    <marker id="b04q2-a-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="170" y="24" text-anchor="middle">Shape 1: rows chain</text>
  <rect class="d-box" x="40" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="69.0" y="69.0" text-anchor="middle">1</text>
  <rect class="d-box" x="106" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="135.0" y="69.0" text-anchor="middle">3</text>
  <rect class="d-box" x="172" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="201.0" y="69.0" text-anchor="middle">5</text>
  <rect class="d-box" x="238" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="267.0" y="69.0" text-anchor="middle">7</text>
  <rect class="d-box" x="40" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="69.0" y="123.0" text-anchor="middle">10</text>
  <rect class="d-box" x="106" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="135.0" y="123.0" text-anchor="middle">11</text>
  <rect class="d-box" x="172" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="201.0" y="123.0" text-anchor="middle">16</text>
  <rect class="d-box" x="238" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="267.0" y="123.0" text-anchor="middle">20</text>
  <rect class="d-box" x="40" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="69.0" y="177.0" text-anchor="middle">23</text>
  <rect class="d-box" x="106" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="135.0" y="177.0" text-anchor="middle">30</text>
  <rect class="d-box" x="172" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="201.0" y="177.0" text-anchor="middle">34</text>
  <rect class="d-box" x="238" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="267.0" y="177.0" text-anchor="middle">60</text>
  <rect class="d-box-muted" x="40" y="214" width="256" height="38" rx="8"/>
  <text class="d-sub" x="168" y="238" text-anchor="middle">row 0 ends 7, row 1 starts 10</text>
  <text class="d-text d-accent" x="560" y="24" text-anchor="middle">Shape 2: rows and columns sorted</text>
  <rect class="d-box" x="400" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="429.0" y="69.0" text-anchor="middle">1</text>
  <rect class="d-box" x="466" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="495.0" y="69.0" text-anchor="middle">4</text>
  <rect class="d-box" x="532" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="561.0" y="69.0" text-anchor="middle">7</text>
  <rect class="d-box" x="598" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="627.0" y="69.0" text-anchor="middle">11</text>
  <rect class="d-box" x="664" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="693.0" y="69.0" text-anchor="middle">15</text>
  <rect class="d-box" x="400" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="429.0" y="123.0" text-anchor="middle">2</text>
  <rect class="d-box" x="466" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="495.0" y="123.0" text-anchor="middle">5</text>
  <rect class="d-box" x="532" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="561.0" y="123.0" text-anchor="middle">8</text>
  <rect class="d-box" x="598" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="627.0" y="123.0" text-anchor="middle">12</text>
  <rect class="d-box" x="664" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="693.0" y="123.0" text-anchor="middle">19</text>
  <rect class="d-box" x="400" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="429.0" y="177.0" text-anchor="middle">3</text>
  <rect class="d-box" x="466" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="495.0" y="177.0" text-anchor="middle">6</text>
  <rect class="d-box" x="532" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="561.0" y="177.0" text-anchor="middle">9</text>
  <rect class="d-box" x="598" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="627.0" y="177.0" text-anchor="middle">16</text>
  <rect class="d-box" x="664" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="693.0" y="177.0" text-anchor="middle">22</text>
  <rect class="d-box-muted" x="400" y="214" width="322" height="38" rx="8"/>
  <text class="d-sub" x="561" y="238" text-anchor="middle">row 0 ends 15, row 1 starts 2</text>
</svg>

**Shape 1 (LeetCode 74, "Search a 2D Matrix")**: each row is sorted, and each row starts with a value bigger than the last value of the row above. Reading the matrix row by row gives one sorted list.

**Shape 2 (LeetCode 240, "Search a 2D Matrix II")**: each row is sorted left to right and each column is sorted top to bottom, but a row does *not* have to start after the previous row ends — in the right-hand matrix, row 1 starts with 2, which is smaller than 15 at the end of row 0.

📌 **Interview term: Row-major order** — reading a matrix one row at a time, left to right, top to bottom. Cell \`(r, c)\` of a matrix with \`cols\` columns is position \`r * cols + c\` in that order.

📌 **Interview term: Sorted matrix (Young tableau)** — a matrix whose rows and columns are each sorted ascending (Shape 2). Every Shape 1 matrix is also a Shape 2 matrix, but not the other way round.

The brute force works on both: look at every cell, O(m n). A better general approach is a binary search in each row, O(m log n). Both are worth one sentence before you give the real answer.

## 4. Shape 1: Pretend It Is One Sorted Array

Because the rows chain, the matrix *is* a sorted array of length \`m * n\` that happens to be folded into rows. Run an ordinary [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) over indices \`0 .. m*n - 1\`, and translate each index back into a cell only when you need to read it.

📌 **Interview term: Index mapping** — converting a 1D position into 2D coordinates: \`row = index / cols\` (integer division) and \`col = index % cols\` (the remainder). No array is ever actually flattened, so no extra memory is used.

<svg class="iq-diagram" width="100%" viewBox="0 0 740 320" role="img" aria-label="A 3 by 4 matrix read in row-major order becomes one sorted list of 12 values. Index 5 maps to row 1, column 1, value 11">
  <defs>
    <marker id="b04q2-b-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="40" width="58" height="42" rx="6"/>
  <text class="d-text" x="69.0" y="66.0" text-anchor="middle">1</text>
  <rect class="d-box" x="106" y="40" width="58" height="42" rx="6"/>
  <text class="d-text" x="135.0" y="66.0" text-anchor="middle">3</text>
  <rect class="d-box" x="172" y="40" width="58" height="42" rx="6"/>
  <text class="d-text" x="201.0" y="66.0" text-anchor="middle">5</text>
  <rect class="d-box" x="238" y="40" width="58" height="42" rx="6"/>
  <text class="d-text" x="267.0" y="66.0" text-anchor="middle">7</text>
  <rect class="d-box" x="40" y="96" width="58" height="42" rx="6"/>
  <text class="d-text" x="69.0" y="122.0" text-anchor="middle">10</text>
  <rect class="d-box-accent" x="106" y="96" width="58" height="42" rx="6"/>
  <text class="d-text" x="135.0" y="122.0" text-anchor="middle">11</text>
  <rect class="d-box" x="172" y="96" width="58" height="42" rx="6"/>
  <text class="d-text" x="201.0" y="122.0" text-anchor="middle">16</text>
  <rect class="d-box" x="238" y="96" width="58" height="42" rx="6"/>
  <text class="d-text" x="267.0" y="122.0" text-anchor="middle">20</text>
  <rect class="d-box" x="40" y="152" width="58" height="42" rx="6"/>
  <text class="d-text" x="69.0" y="178.0" text-anchor="middle">23</text>
  <rect class="d-box" x="106" y="152" width="58" height="42" rx="6"/>
  <text class="d-text" x="135.0" y="178.0" text-anchor="middle">30</text>
  <rect class="d-box" x="172" y="152" width="58" height="42" rx="6"/>
  <text class="d-text" x="201.0" y="178.0" text-anchor="middle">34</text>
  <rect class="d-box" x="238" y="152" width="58" height="42" rx="6"/>
  <text class="d-text" x="267.0" y="178.0" text-anchor="middle">60</text>
  <text class="d-sub" x="22" y="66" text-anchor="middle">r0</text>
  <text class="d-sub" x="22" y="122" text-anchor="middle">r1</text>
  <text class="d-sub" x="22" y="178" text-anchor="middle">r2</text>
  <text class="d-sub" x="69" y="28" text-anchor="middle">c0</text>
  <text class="d-sub" x="135" y="28" text-anchor="middle">c1</text>
  <text class="d-sub" x="201" y="28" text-anchor="middle">c2</text>
  <text class="d-sub" x="267" y="28" text-anchor="middle">c3</text>
  <path class="d-edge" d="M 320 124 L 380 124" marker-end="url(#b04q2-b-java)"/>
  <rect class="d-box-muted" x="390" y="40" width="300" height="170" rx="10"/>
  <text class="d-text" x="540" y="74" text-anchor="middle">1D index mid = 5</text>
  <text class="d-sub" x="540" y="108" text-anchor="middle">row = 5 div 4 = 1</text>
  <text class="d-sub" x="540" y="138" text-anchor="middle">col = 5 mod 4 = 1</text>
  <text class="d-text d-accent" x="540" y="176" text-anchor="middle">matrix[1][1] = 11</text>
  <rect class="d-box-muted" x="40" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="63.0" y="273.0" text-anchor="middle">1</text>
  <text class="d-sub" x="63.0" y="304" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="94" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="117.0" y="273.0" text-anchor="middle">3</text>
  <text class="d-sub" x="117.0" y="304" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="148" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="171.0" y="273.0" text-anchor="middle">5</text>
  <text class="d-sub" x="171.0" y="304" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="202" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="225.0" y="273.0" text-anchor="middle">7</text>
  <text class="d-sub" x="225.0" y="304" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="256" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="279.0" y="273.0" text-anchor="middle">10</text>
  <text class="d-sub" x="279.0" y="304" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="310" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="333.0" y="273.0" text-anchor="middle">11</text>
  <text class="d-sub" x="333.0" y="304" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="364" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="387.0" y="273.0" text-anchor="middle">16</text>
  <text class="d-sub" x="387.0" y="304" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="418" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="441.0" y="273.0" text-anchor="middle">20</text>
  <text class="d-sub" x="441.0" y="304" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="472" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="495.0" y="273.0" text-anchor="middle">23</text>
  <text class="d-sub" x="495.0" y="304" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="526" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="549.0" y="273.0" text-anchor="middle">30</text>
  <text class="d-sub" x="549.0" y="304" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="580" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="603.0" y="273.0" text-anchor="middle">34</text>
  <text class="d-sub" x="603.0" y="304" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="634" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="657.0" y="273.0" text-anchor="middle">60</text>
  <text class="d-sub" x="657.0" y="304" text-anchor="middle">11</text>
</svg>

Searching for \`11\`: \`lo = 0\`, \`hi = 11\`, \`mid = 5\`, which maps to row 1, column 1 — the value 11, found on the first probe. Searching for \`13\` ends with \`lo > hi\` and returns false. Because every step halves the range, the cost is O(log(m n)), which equals O(log m + log n).

## 5. Shape 2: The Staircase Walk

Binary search over the folded array fails here because the folded array is not sorted (\`1, 4, 7, 11, 15, 2, 5, ...\`). Example 2 shows it misses 12 of the 25 values. We need a different elimination rule.

Start at the **top-right** cell. It is the biggest value in its row and the smallest value in its column. Compare it with the target:

- **Equal** — found.
- **Bigger than the target** — every cell below it in this column is even bigger, so the whole column is useless. Move **left**.
- **Smaller than the target** — every cell to its left in this row is even smaller, so the whole row is useless. Move **down**.

📌 **Interview term: Staircase search (saddleback search)** — the walk from a corner where one direction only increases and the other only decreases, removing one row or one column per comparison. It takes at most \`m + n - 1\` steps.

<svg class="iq-diagram" width="100%" viewBox="0 0 750 336" role="img" aria-label="Staircase search for 5 in a 5 by 5 matrix. Start at 15 in the top-right corner, move left past 11 and 7 to 4, then down to 5">
  <defs>
    <marker id="b04q2-c-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="60" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="76.0" text-anchor="middle">1</text>
  <rect class="d-box" x="130" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="76.0" text-anchor="middle">4</text>
  <rect class="d-box" x="200" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="76.0" text-anchor="middle">7</text>
  <rect class="d-box" x="270" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="76.0" text-anchor="middle">11</text>
  <rect class="d-box" x="340" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="76.0" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="60" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="132.0" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="130" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="132.0" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="200" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="132.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="270" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="132.0" text-anchor="middle">12</text>
  <rect class="d-box-muted" x="340" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="132.0" text-anchor="middle">19</text>
  <rect class="d-box-muted" x="60" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="188.0" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="130" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="188.0" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="200" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="188.0" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="270" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="188.0" text-anchor="middle">16</text>
  <rect class="d-box-muted" x="340" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="188.0" text-anchor="middle">22</text>
  <rect class="d-box-muted" x="60" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="244.0" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="130" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="244.0" text-anchor="middle">13</text>
  <rect class="d-box-muted" x="200" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="244.0" text-anchor="middle">14</text>
  <rect class="d-box-muted" x="270" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="244.0" text-anchor="middle">17</text>
  <rect class="d-box-muted" x="340" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="244.0" text-anchor="middle">24</text>
  <rect class="d-box-muted" x="60" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="300.0" text-anchor="middle">18</text>
  <rect class="d-box-muted" x="130" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="300.0" text-anchor="middle">21</text>
  <rect class="d-box-muted" x="200" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="300.0" text-anchor="middle">23</text>
  <rect class="d-box-muted" x="270" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="300.0" text-anchor="middle">26</text>
  <rect class="d-box-muted" x="340" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="300.0" text-anchor="middle">30</text>
  <text class="d-text d-accent" x="370" y="34" text-anchor="middle">start</text>
  <rect class="d-box-muted" x="440" y="50" width="280" height="46" rx="8"/>
  <text class="d-sub" x="580" y="78" text-anchor="middle">start at the top-right corner</text>
  <rect class="d-box-muted" x="440" y="112" width="280" height="46" rx="8"/>
  <text class="d-sub" x="580" y="140" text-anchor="middle">15, 11, 7: too big, move left</text>
  <rect class="d-box-muted" x="440" y="174" width="280" height="46" rx="8"/>
  <text class="d-sub" x="580" y="202" text-anchor="middle">4: too small, move down</text>
  <rect class="d-box-accent" x="440" y="236" width="280" height="46" rx="8"/>
  <text class="d-sub" x="580" y="264" text-anchor="middle">5: found at row 1, col 1</text>
</svg>

The search for 5 visits \`15, 11, 7, 4, 5\` — five cells out of 25, exactly the path Example 2 prints. The bottom-left corner works too (up when too big, right when too small). The top-left and bottom-right corners do **not** work: from top-left both directions increase, so a "too small" answer does not tell you which way to go.

## 6. Which One Should You Use?

| Method | Works on | Time | Probes on a 1000 x 1000 Shape 1 matrix (Example 3) |
| :--- | :--- | :--- | :--- |
| Scan every cell | Any matrix | O(m n) | up to 1,000,000 |
| Binary search each row | Sorted rows | O(m log n) | about 10 per row, up to 1,000 rows |
| Flattened binary search | Shape 1 only | O(log(m n)) | 19 or 20 |
| Staircase walk | Shape 1 and Shape 2 | O(m + n) | 1 to 1,999 |

On a Shape 1 matrix the flattened search wins clearly — 20 probes against 1,999 for the worst staircase case. On a Shape 2 matrix only the staircase (or the row-by-row search) is correct. If you are not told which shape you have, the staircase is the safe choice.

> **Key insight:** both algorithms are "elimination" searches. Binary search eliminates half of the remaining cells per probe; the staircase eliminates a whole row or column per probe. Pick the one whose elimination rule the data actually supports.

## 7. The Java Solution, Line by Line

**Shape 1 — flattened binary search:**

~~~java
static boolean searchMatrix(int[][] matrix, int target) {
    if (matrix.length == 0 || matrix[0].length == 0) return false;
    int rows = matrix.length, cols = matrix[0].length;
    long lo = 0, hi = (long) rows * cols - 1;      // rows * cols can exceed int range
    while (lo <= hi) {
        long mid = lo + (hi - lo) / 2;
        int r = (int) (mid / cols), c = (int) (mid % cols); // 1D index -> (row, column)
        int value = matrix[r][c];
        if (value == target) return true;
        if (value < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return false;
}
~~~

- \`long lo, hi\` — \`rows * cols\` is computed in \`int\` unless one side is \`long\`. We ran \`50000 * 50000\` and got \`-1794967296\`; \`(long) 50000 * 50000\` gave \`2500000000\`. Real interview matrices are smaller, but saying this shows you think about limits.
- \`(int) (mid / cols)\` and \`(int) (mid % cols)\` cast back once the numbers are small enough to be array indices.
- The guard \`matrix.length == 0 || matrix[0].length == 0\` must come first; \`matrix[0]\` on \`new int[0][0]\` throws \`ArrayIndexOutOfBoundsException\`.

**Shape 2 — staircase walk** (from Example 2):

~~~java
static int[] staircase(int[][] matrix, int target, List<String> path) {
    if (matrix.length == 0 || matrix[0].length == 0) return null;
    int r = 0, c = matrix[0].length - 1;
    while (r < matrix.length && c >= 0) {
        int value = matrix[r][c];
        if (path != null) path.add("(" + r + "," + c + ")=" + value);
        if (value == target) return new int[]{r, c};
        if (value > target) c--;
        else r++;
    }
    return null;
}
~~~

- Returning \`null\` for "not found" and \`new int[]{r, c}\` for found is compact; in production code an \`Optional\` or a small \`record Position(int row, int col)\` (Java 16+) is cleaner.

## 8. Java Details That Matter

- **\`Arrays.binarySearch(row, target)\`** gives the O(m log n) per-row baseline in one line. It returns the index when found and \`-(insertionPoint) - 1\` when not: our run printed \`2\` for 5 in \`{1, 3, 5, 7}\` and \`-3\` for 4. Test \`>= 0\`, not \`!= -1\`.
- **Jagged arrays.** \`int[][]\` is an array of arrays, so rows may have different lengths (\`{{1, 2, 3}, {4}}\` is legal). The Shape 1 mapping assumes every row has \`matrix[0].length\` columns — ask, or validate.
- **Memory layout.** Each row is its own object on the heap. The flattened search jumps between rows, which is fine for O(log) probes; the staircase moves mostly within one row or one column.
- **\`TreeSet\` in tests.** Example 2 collects the values in a \`TreeSet<Integer>\` so iteration is sorted and output is deterministic; a \`HashSet\` makes no ordering promise.

## 9. Verified: Running the Code

Every program below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21.0.12). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — Shape 1: flattened binary search on nine inputs**

~~~text
true
false
true
true
false
false
true
false
false
~~~

**Example 2 — Shape 2: staircase path, brute-force check, and why flattening fails**

~~~text
target 5 -> found at (1, 1)
  path: (0,4)=15 (0,3)=11 (0,2)=7 (0,1)=4 (1,1)=5
target 20 -> not found
  path: (0,4)=15 (1,4)=19 (2,4)=22 (2,3)=16 (3,3)=17 (4,3)=26 (4,2)=23 (4,1)=21 (4,0)=18
staircase agrees with brute force for 0..31: true
flattened search misses 12 of 25 values, e.g. [3, 4, 6, 7, 11]
~~~

The staircase answer matched a brute-force membership test for every target from 0 to 31. Running the Shape 1 binary search on the Shape 2 matrix missed 12 of the 25 values that are really there.

**Example 3 — Probe counts on a 1000 x 1000 matrix: flattened vs staircase**

~~~text
top-right corner: flattened 19 probes (true), staircase 1 probes (true)
centre cell: flattened 19 probes (true), staircase 1000 probes (true)
bottom-left corner: flattened 20 probes (true), staircase 1999 probes (true)
absent odd value: flattened 20 probes (false), staircase 1501 probes (false)
~~~

The matrix holds the even numbers \`0, 2, ..., 1999998\`, so it is both shapes at once. The flattened search never needed more than 20 probes; the staircase needed 1,999 for the bottom-left corner.

## 10. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Scan every cell | O(m n) | O(1) | Reads every cell |
| \`Arrays.binarySearch\` per row | O(m log n) | O(1) | One search per row |
| Flattened binary search (Shape 1) | O(log(m n)) | O(1) | At most 20 probes for 1,000,000 cells |
| Staircase (Shape 1 or 2) | O(m + n) | O(1) | At most 1,999 probes for 1000 x 1000 |

## 11. Edge Cases

- **Empty matrix or empty first row** — \`[]\` and \`[[]]\` both return false before touching \`matrix[0][0]\`.
- **Single cell** — \`[[5]]\` searching for 5: \`lo = hi = 0\`, found.
- **Target below the minimum or above the maximum** — \`0\` and \`61\` in Example 1 end the search quickly with false.
- **Target at a corner** — top-right is the staircase best case (1 probe); bottom-left is its worst case (\`m + n - 1\` = 1,999 probes in Example 3).
- **Duplicates** — both methods still answer true/false correctly; if you need *every* position, you must keep searching after the first hit.
- **Very large matrices** — \`m * n\` may not fit in a 32-bit integer; see the language notes.

## 12. Common Pitfalls

- **Using the flattened search on a Shape 2 matrix.** It compiles and runs, and misses values (12 of 25 in Example 2).
- **\`rows * cols\` in \`int\`.** Overflows for big matrices; use \`long\` for the 1D range.
- **Checking \`Arrays.binarySearch(...) != -1\`.** Absent keys return any negative number, such as \`-3\`.
- **Starting the staircase at the top-left.** A too-small comparison gives no direction.
- **Reading \`matrix[0]\` before the empty check.** Throws \`ArrayIndexOutOfBoundsException\`.
- **Assuming a rectangle.** \`int[][]\` can be jagged.

## 13. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Ask first:</strong> <span style="color:#f0e2c8;">Do rows chain into one sorted sequence, or are rows and columns sorted separately? The algorithm depends on it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Shape 1:</strong> <span style="color:#f0e2c8;">Binary search over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 .. m*n - 1</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[mid / cols][mid % cols]</code>, using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> for the range. O(log(m n)), O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Shape 2:</strong> <span style="color:#f0e2c8;">Start top-right: too big, move left; too small, move down. O(m + n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Baselines:</strong> <span style="color:#f0e2c8;">Scan is O(m n); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.binarySearch</code> per row is O(m log n). Flattening Shape 2 is wrong — it missed 12 of 25 values in my test.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java notes:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> overflow in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rows * cols</code>, negative return codes from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.binarySearch</code>, jagged rows, and the empty-array guard.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the top-right corner work but not the top-left?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Top-right is the largest in its row and smallest in its column, so each comparison rules out a whole row or column. From top-left both directions increase.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you beat O(m + n) on Shape 2?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in general: the anti-diagonal cells are independent, so a correct algorithm must look at them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Arrays.binarySearch</code> return when the key is missing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-(insertionPoint) - 1</code>, so always negative; for 4 in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1, 3, 5, 7}</code> it returned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-3</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you count values less than or equal to x?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Staircase from bottom-left: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[r][c] &lt;= x</code>, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r + 1</code> and move right; otherwise move up. O(m + n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long</code> for the 1D index?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">50000 * 50000</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> gave <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1794967296</code> in my run; in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2500000000</code>.</span>
</div>

</div>

## 14. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Row-major order** | Reading a matrix row by row; cell (r, c) is position r * cols + c |
| **Sorted matrix (Young tableau)** | Rows and columns each sorted ascending |
| **Index mapping** | row = index / cols, col = index % cols |
| **Staircase search (saddleback search)** | Walk from the top-right corner, dropping a row or a column per step |

---
**Conclusion:** "Search a sorted 2D matrix" is two problems: if rows chain, binary search the folded array with \`mid / cols\` and \`mid % cols\` in O(log(m n)); if only rows and columns are sorted, walk the staircase from the top-right in O(m + n). The runs showed 20 probes against up to 1,999 on Shape 1 and 12 missed values when the Shape 1 algorithm meets Shape 2. In Java, compute the 1D range in \`long\`, guard empty and jagged input, and read \`Arrays.binarySearch\` results with \`>= 0\`.
`,
        examples: [
          { label: "Shape 1: flattened binary search on nine inputs", code: `public class Main {
    // Rows sorted left to right, and each row starts after the previous row ends.
    // Treat the m x n grid as one sorted list of length m*n.
    static boolean searchMatrix(int[][] matrix, int target) {
        if (matrix.length == 0 || matrix[0].length == 0) return false;
        int rows = matrix.length, cols = matrix[0].length;
        long lo = 0, hi = (long) rows * cols - 1;      // rows * cols can exceed int range
        while (lo <= hi) {
            long mid = lo + (hi - lo) / 2;
            int r = (int) (mid / cols), c = (int) (mid % cols); // 1D index -> (row, column)
            int value = matrix[r][c];
            if (value == target) return true;
            if (value < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return false;
    }

    public static void main(String[] args) {
        int[][] m = {{1, 3, 5, 7}, {10, 11, 16, 20}, {23, 30, 34, 60}};
        System.out.println(searchMatrix(m, 3));                   // true
        System.out.println(searchMatrix(m, 13));                  // false
        System.out.println(searchMatrix(m, 1));                   // true
        System.out.println(searchMatrix(m, 60));                  // true
        System.out.println(searchMatrix(m, 0));                   // false
        System.out.println(searchMatrix(m, 61));                  // false
        System.out.println(searchMatrix(new int[][]{{5}}, 5));    // true
        System.out.println(searchMatrix(new int[0][0], 5));       // false
        System.out.println(searchMatrix(new int[][]{{}}, 5));     // false
    }
}` },
          { label: "Shape 2: staircase path, brute-force check, and why flattening fails", code: `import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;

public class Main {
    // Rows AND columns sorted (rows need not chain). Start at the top-right corner:
    // too big -> move left (drop the column), too small -> move down (drop the row).
    static int[] staircase(int[][] matrix, int target, List<String> path) {
        if (matrix.length == 0 || matrix[0].length == 0) return null;
        int r = 0, c = matrix[0].length - 1;
        while (r < matrix.length && c >= 0) {
            int value = matrix[r][c];
            if (path != null) path.add("(" + r + "," + c + ")=" + value);
            if (value == target) return new int[]{r, c};
            if (value > target) c--;
            else r++;
        }
        return null;
    }

    // The 1D binary search from example 1: only valid when rows chain.
    static boolean flattened(int[][] matrix, int target) {
        int cols = matrix[0].length;
        int lo = 0, hi = matrix.length * cols - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            int value = matrix[mid / cols][mid % cols];
            if (value == target) return true;
            if (value < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return false;
    }

    static String fmt(int[] pos) {
        return pos == null ? "not found" : "found at (" + pos[0] + ", " + pos[1] + ")";
    }

    public static void main(String[] args) {
        int[][] g = {{1, 4, 7, 11, 15},
                     {2, 5, 8, 12, 19},
                     {3, 6, 9, 16, 22},
                     {10, 13, 14, 17, 24},
                     {18, 21, 23, 26, 30}};

        for (int target : new int[]{5, 20}) {
            List<String> path = new ArrayList<>();
            int[] result = staircase(g, target, path);
            System.out.println("target " + target + " -> " + fmt(result));
            System.out.println("  path: " + String.join(" ", path));
        }

        TreeSet<Integer> present = new TreeSet<>();      // sorted, so no ordering surprises
        for (int[] row : g) for (int v : row) present.add(v);
        boolean agree = true;
        for (int t = 0; t <= 31; t++) {
            if ((staircase(g, t, null) != null) != present.contains(t)) agree = false;
        }
        System.out.println("staircase agrees with brute force for 0..31: " + agree);

        List<Integer> wrong = new ArrayList<>();
        for (int t : present) if (!flattened(g, t)) wrong.add(t);
        System.out.println("flattened search misses " + wrong.size() + " of " + present.size()
                + " values, e.g. " + wrong.subList(0, Math.min(5, wrong.size())));
    }
}` },
          { label: "Probe counts on a 1000 x 1000 matrix: flattened vs staircase", code: `public class Main {
    // Count how many cells each method reads on a big matrix that satisfies BOTH
    // shapes (rows chain, so rows and columns are also sorted).
    static final int ROWS = 1000, COLS = 1000;
    static final int[][] GRID = new int[ROWS][COLS];

    // returns {found ? 1 : 0, probes}
    static int[] flattenedProbes(int target) {
        int lo = 0, hi = ROWS * COLS - 1, probes = 0;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            probes++;
            int value = GRID[mid / COLS][mid % COLS];
            if (value == target) return new int[]{1, probes};
            if (value < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return new int[]{0, probes};
    }

    static int[] staircaseProbes(int target) {
        int r = 0, c = COLS - 1, probes = 0;
        while (r < ROWS && c >= 0) {
            probes++;
            int value = GRID[r][c];
            if (value == target) return new int[]{1, probes};
            if (value > target) c--;
            else r++;
        }
        return new int[]{0, probes};
    }

    public static void main(String[] args) {
        for (int r = 0; r < ROWS; r++)
            for (int c = 0; c < COLS; c++) GRID[r][c] = 2 * (r * COLS + c);  // even numbers 0..1999998

        String[] names = {"top-right corner", "centre cell", "bottom-left corner", "absent odd value"};
        int[] targets = {GRID[0][COLS - 1], GRID[500][500], GRID[ROWS - 1][0], 1000001};
        for (int i = 0; i < names.length; i++) {
            int[] f = flattenedProbes(targets[i]);
            int[] s = staircaseProbes(targets[i]);
            System.out.println(names[i] + ": flattened " + f[1] + " probes (" + (f[0] == 1) + "), staircase "
                    + s[1] + " probes (" + (s[0] == 1) + ")");
        }
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given a sorted matrix as a \`std::vector<std::vector<int>>\`, and a target. Return whether the target is in the matrix. Please write it in C++, and explain how your approach depends on how exactly the matrix is sorted."

**What a strong answer should cover:**
- Asks which shape: rows chaining into one sorted sequence (LeetCode 74) or rows and columns sorted independently (LeetCode 240).
- Shape 1: binary search over \`0 .. m*n - 1\` with \`mid / cols\` and \`mid % cols\`, O(log(m n)).
- Shape 2: staircase walk from the top-right corner, O(m + n), and why the top-left corner fails.
- Baselines: full scan O(m n), \`std::binary_search\` per row O(m log n).
- C++ specifics: \`matrix[0]\` on an empty vector is undefined behaviour, \`size()\` is unsigned (so \`cols - 1\` and \`c >= 0\` need signed types), \`long long\` for \`m * n\`, and pass the matrix by \`const&\`.

**Clarifying questions expected:**
- "Does each row start after the previous row ends, or are rows and columns sorted separately?"
- "Return a boolean or the position?"
- "Can the matrix or its rows be empty?"

**Code / implementation expected:** Yes — \`bool searchMatrix(const std::vector<std::vector<int>>&, int)\` and a staircase function, in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays, nested lists and loops; binary search is linked and summarised.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the C++ programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

Think of two kinds of tidy bookshelf.

**Shelf one** is a single long row of books in alphabetical order that the carpenter happened to cut into three planks. Plank two starts exactly where plank one ends. If you mentally glue the planks back together you have one sorted row, and you can find a book the classic way — open in the middle, go left or right, halve again.

**Shelf two** is a wall of cubbyholes in a stadium shop, where prices go **up** as you move right and also go **up** as you move down. The bottom-left cubby is not the "next" one after the top-right cubby; there is no single order. But stand at the **top-right** cubby: everything to its left is cheaper, everything below is pricier. Too expensive? Step left and forget that whole column. Too cheap? Step down and forget that whole row. Each look throws away a full row or column.

Interviewers say "sorted 2D matrix" for both shelves. The first thing a strong candidate does is ask *which one*, because the right algorithm — and the wrong one — depends on it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| "Is each row's first value bigger than the previous row's last value, or are rows and columns just sorted on their own?" | Shape 1 allows one binary search over \`m * n\` cells (O(log(m n))). Shape 2 needs the staircase walk (O(m + n)). Using the first on the second gives wrong answers. |
| "Do you want true/false or the position?" | Changes the return type; both algorithms can return \`(row, col)\`. |
| "Can the matrix or a row be empty?" | \`matrix[0]\` on an empty matrix fails; guard it. |
| "Are all rows the same length?" | Index mapping \`row = i / cols\` assumes a rectangle. |
| "How large can it be?" | \`m * n\` can exceed the 32-bit \`int\` range in Java and C++. |

## 3. Two Different Problems Behind One Title

<svg class="iq-diagram" width="100%" viewBox="0 0 750 272" role="img" aria-label="Two kinds of sorted matrix. Left, rows chain into one sorted list. Right, every row and every column is sorted on its own">
  <defs>
    <marker id="b04q2-a-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="170" y="24" text-anchor="middle">Shape 1: rows chain</text>
  <rect class="d-box" x="40" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="69.0" y="69.0" text-anchor="middle">1</text>
  <rect class="d-box" x="106" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="135.0" y="69.0" text-anchor="middle">3</text>
  <rect class="d-box" x="172" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="201.0" y="69.0" text-anchor="middle">5</text>
  <rect class="d-box" x="238" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="267.0" y="69.0" text-anchor="middle">7</text>
  <rect class="d-box" x="40" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="69.0" y="123.0" text-anchor="middle">10</text>
  <rect class="d-box" x="106" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="135.0" y="123.0" text-anchor="middle">11</text>
  <rect class="d-box" x="172" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="201.0" y="123.0" text-anchor="middle">16</text>
  <rect class="d-box" x="238" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="267.0" y="123.0" text-anchor="middle">20</text>
  <rect class="d-box" x="40" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="69.0" y="177.0" text-anchor="middle">23</text>
  <rect class="d-box" x="106" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="135.0" y="177.0" text-anchor="middle">30</text>
  <rect class="d-box" x="172" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="201.0" y="177.0" text-anchor="middle">34</text>
  <rect class="d-box" x="238" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="267.0" y="177.0" text-anchor="middle">60</text>
  <rect class="d-box-muted" x="40" y="214" width="256" height="38" rx="8"/>
  <text class="d-sub" x="168" y="238" text-anchor="middle">row 0 ends 7, row 1 starts 10</text>
  <text class="d-text d-accent" x="560" y="24" text-anchor="middle">Shape 2: rows and columns sorted</text>
  <rect class="d-box" x="400" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="429.0" y="69.0" text-anchor="middle">1</text>
  <rect class="d-box" x="466" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="495.0" y="69.0" text-anchor="middle">4</text>
  <rect class="d-box" x="532" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="561.0" y="69.0" text-anchor="middle">7</text>
  <rect class="d-box" x="598" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="627.0" y="69.0" text-anchor="middle">11</text>
  <rect class="d-box" x="664" y="44" width="58" height="40" rx="6"/>
  <text class="d-text" x="693.0" y="69.0" text-anchor="middle">15</text>
  <rect class="d-box" x="400" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="429.0" y="123.0" text-anchor="middle">2</text>
  <rect class="d-box" x="466" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="495.0" y="123.0" text-anchor="middle">5</text>
  <rect class="d-box" x="532" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="561.0" y="123.0" text-anchor="middle">8</text>
  <rect class="d-box" x="598" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="627.0" y="123.0" text-anchor="middle">12</text>
  <rect class="d-box" x="664" y="98" width="58" height="40" rx="6"/>
  <text class="d-text" x="693.0" y="123.0" text-anchor="middle">19</text>
  <rect class="d-box" x="400" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="429.0" y="177.0" text-anchor="middle">3</text>
  <rect class="d-box" x="466" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="495.0" y="177.0" text-anchor="middle">6</text>
  <rect class="d-box" x="532" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="561.0" y="177.0" text-anchor="middle">9</text>
  <rect class="d-box" x="598" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="627.0" y="177.0" text-anchor="middle">16</text>
  <rect class="d-box" x="664" y="152" width="58" height="40" rx="6"/>
  <text class="d-text" x="693.0" y="177.0" text-anchor="middle">22</text>
  <rect class="d-box-muted" x="400" y="214" width="322" height="38" rx="8"/>
  <text class="d-sub" x="561" y="238" text-anchor="middle">row 0 ends 15, row 1 starts 2</text>
</svg>

**Shape 1 (LeetCode 74, "Search a 2D Matrix")**: each row is sorted, and each row starts with a value bigger than the last value of the row above. Reading the matrix row by row gives one sorted list.

**Shape 2 (LeetCode 240, "Search a 2D Matrix II")**: each row is sorted left to right and each column is sorted top to bottom, but a row does *not* have to start after the previous row ends — in the right-hand matrix, row 1 starts with 2, which is smaller than 15 at the end of row 0.

📌 **Interview term: Row-major order** — reading a matrix one row at a time, left to right, top to bottom. Cell \`(r, c)\` of a matrix with \`cols\` columns is position \`r * cols + c\` in that order.

📌 **Interview term: Sorted matrix (Young tableau)** — a matrix whose rows and columns are each sorted ascending (Shape 2). Every Shape 1 matrix is also a Shape 2 matrix, but not the other way round.

The brute force works on both: look at every cell, O(m n). A better general approach is a binary search in each row, O(m log n). Both are worth one sentence before you give the real answer.

## 4. Shape 1: Pretend It Is One Sorted Array

Because the rows chain, the matrix *is* a sorted array of length \`m * n\` that happens to be folded into rows. Run an ordinary [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) over indices \`0 .. m*n - 1\`, and translate each index back into a cell only when you need to read it.

📌 **Interview term: Index mapping** — converting a 1D position into 2D coordinates: \`row = index / cols\` (integer division) and \`col = index % cols\` (the remainder). No array is ever actually flattened, so no extra memory is used.

<svg class="iq-diagram" width="100%" viewBox="0 0 740 320" role="img" aria-label="A 3 by 4 matrix read in row-major order becomes one sorted list of 12 values. Index 5 maps to row 1, column 1, value 11">
  <defs>
    <marker id="b04q2-b-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="40" width="58" height="42" rx="6"/>
  <text class="d-text" x="69.0" y="66.0" text-anchor="middle">1</text>
  <rect class="d-box" x="106" y="40" width="58" height="42" rx="6"/>
  <text class="d-text" x="135.0" y="66.0" text-anchor="middle">3</text>
  <rect class="d-box" x="172" y="40" width="58" height="42" rx="6"/>
  <text class="d-text" x="201.0" y="66.0" text-anchor="middle">5</text>
  <rect class="d-box" x="238" y="40" width="58" height="42" rx="6"/>
  <text class="d-text" x="267.0" y="66.0" text-anchor="middle">7</text>
  <rect class="d-box" x="40" y="96" width="58" height="42" rx="6"/>
  <text class="d-text" x="69.0" y="122.0" text-anchor="middle">10</text>
  <rect class="d-box-accent" x="106" y="96" width="58" height="42" rx="6"/>
  <text class="d-text" x="135.0" y="122.0" text-anchor="middle">11</text>
  <rect class="d-box" x="172" y="96" width="58" height="42" rx="6"/>
  <text class="d-text" x="201.0" y="122.0" text-anchor="middle">16</text>
  <rect class="d-box" x="238" y="96" width="58" height="42" rx="6"/>
  <text class="d-text" x="267.0" y="122.0" text-anchor="middle">20</text>
  <rect class="d-box" x="40" y="152" width="58" height="42" rx="6"/>
  <text class="d-text" x="69.0" y="178.0" text-anchor="middle">23</text>
  <rect class="d-box" x="106" y="152" width="58" height="42" rx="6"/>
  <text class="d-text" x="135.0" y="178.0" text-anchor="middle">30</text>
  <rect class="d-box" x="172" y="152" width="58" height="42" rx="6"/>
  <text class="d-text" x="201.0" y="178.0" text-anchor="middle">34</text>
  <rect class="d-box" x="238" y="152" width="58" height="42" rx="6"/>
  <text class="d-text" x="267.0" y="178.0" text-anchor="middle">60</text>
  <text class="d-sub" x="22" y="66" text-anchor="middle">r0</text>
  <text class="d-sub" x="22" y="122" text-anchor="middle">r1</text>
  <text class="d-sub" x="22" y="178" text-anchor="middle">r2</text>
  <text class="d-sub" x="69" y="28" text-anchor="middle">c0</text>
  <text class="d-sub" x="135" y="28" text-anchor="middle">c1</text>
  <text class="d-sub" x="201" y="28" text-anchor="middle">c2</text>
  <text class="d-sub" x="267" y="28" text-anchor="middle">c3</text>
  <path class="d-edge" d="M 320 124 L 380 124" marker-end="url(#b04q2-b-cpp)"/>
  <rect class="d-box-muted" x="390" y="40" width="300" height="170" rx="10"/>
  <text class="d-text" x="540" y="74" text-anchor="middle">1D index mid = 5</text>
  <text class="d-sub" x="540" y="108" text-anchor="middle">row = 5 div 4 = 1</text>
  <text class="d-sub" x="540" y="138" text-anchor="middle">col = 5 mod 4 = 1</text>
  <text class="d-text d-accent" x="540" y="176" text-anchor="middle">matrix[1][1] = 11</text>
  <rect class="d-box-muted" x="40" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="63.0" y="273.0" text-anchor="middle">1</text>
  <text class="d-sub" x="63.0" y="304" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="94" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="117.0" y="273.0" text-anchor="middle">3</text>
  <text class="d-sub" x="117.0" y="304" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="148" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="171.0" y="273.0" text-anchor="middle">5</text>
  <text class="d-sub" x="171.0" y="304" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="202" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="225.0" y="273.0" text-anchor="middle">7</text>
  <text class="d-sub" x="225.0" y="304" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="256" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="279.0" y="273.0" text-anchor="middle">10</text>
  <text class="d-sub" x="279.0" y="304" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="310" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="333.0" y="273.0" text-anchor="middle">11</text>
  <text class="d-sub" x="333.0" y="304" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="364" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="387.0" y="273.0" text-anchor="middle">16</text>
  <text class="d-sub" x="387.0" y="304" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="418" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="441.0" y="273.0" text-anchor="middle">20</text>
  <text class="d-sub" x="441.0" y="304" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="472" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="495.0" y="273.0" text-anchor="middle">23</text>
  <text class="d-sub" x="495.0" y="304" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="526" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="549.0" y="273.0" text-anchor="middle">30</text>
  <text class="d-sub" x="549.0" y="304" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="580" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="603.0" y="273.0" text-anchor="middle">34</text>
  <text class="d-sub" x="603.0" y="304" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="634" y="250" width="46" height="36" rx="6"/>
  <text class="d-text" x="657.0" y="273.0" text-anchor="middle">60</text>
  <text class="d-sub" x="657.0" y="304" text-anchor="middle">11</text>
</svg>

Searching for \`11\`: \`lo = 0\`, \`hi = 11\`, \`mid = 5\`, which maps to row 1, column 1 — the value 11, found on the first probe. Searching for \`13\` ends with \`lo > hi\` and returns false. Because every step halves the range, the cost is O(log(m n)), which equals O(log m + log n).

## 5. Shape 2: The Staircase Walk

Binary search over the folded array fails here because the folded array is not sorted (\`1, 4, 7, 11, 15, 2, 5, ...\`). Example 2 shows it misses 12 of the 25 values. We need a different elimination rule.

Start at the **top-right** cell. It is the biggest value in its row and the smallest value in its column. Compare it with the target:

- **Equal** — found.
- **Bigger than the target** — every cell below it in this column is even bigger, so the whole column is useless. Move **left**.
- **Smaller than the target** — every cell to its left in this row is even smaller, so the whole row is useless. Move **down**.

📌 **Interview term: Staircase search (saddleback search)** — the walk from a corner where one direction only increases and the other only decreases, removing one row or one column per comparison. It takes at most \`m + n - 1\` steps.

<svg class="iq-diagram" width="100%" viewBox="0 0 750 336" role="img" aria-label="Staircase search for 5 in a 5 by 5 matrix. Start at 15 in the top-right corner, move left past 11 and 7 to 4, then down to 5">
  <defs>
    <marker id="b04q2-c-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="60" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="76.0" text-anchor="middle">1</text>
  <rect class="d-box" x="130" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="76.0" text-anchor="middle">4</text>
  <rect class="d-box" x="200" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="76.0" text-anchor="middle">7</text>
  <rect class="d-box" x="270" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="76.0" text-anchor="middle">11</text>
  <rect class="d-box" x="340" y="50" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="76.0" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="60" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="132.0" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="130" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="132.0" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="200" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="132.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="270" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="132.0" text-anchor="middle">12</text>
  <rect class="d-box-muted" x="340" y="106" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="132.0" text-anchor="middle">19</text>
  <rect class="d-box-muted" x="60" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="188.0" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="130" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="188.0" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="200" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="188.0" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="270" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="188.0" text-anchor="middle">16</text>
  <rect class="d-box-muted" x="340" y="162" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="188.0" text-anchor="middle">22</text>
  <rect class="d-box-muted" x="60" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="244.0" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="130" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="244.0" text-anchor="middle">13</text>
  <rect class="d-box-muted" x="200" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="244.0" text-anchor="middle">14</text>
  <rect class="d-box-muted" x="270" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="244.0" text-anchor="middle">17</text>
  <rect class="d-box-muted" x="340" y="218" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="244.0" text-anchor="middle">24</text>
  <rect class="d-box-muted" x="60" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="90.0" y="300.0" text-anchor="middle">18</text>
  <rect class="d-box-muted" x="130" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="160.0" y="300.0" text-anchor="middle">21</text>
  <rect class="d-box-muted" x="200" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="230.0" y="300.0" text-anchor="middle">23</text>
  <rect class="d-box-muted" x="270" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="300.0" y="300.0" text-anchor="middle">26</text>
  <rect class="d-box-muted" x="340" y="274" width="60" height="42" rx="6"/>
  <text class="d-text" x="370.0" y="300.0" text-anchor="middle">30</text>
  <text class="d-text d-accent" x="370" y="34" text-anchor="middle">start</text>
  <rect class="d-box-muted" x="440" y="50" width="280" height="46" rx="8"/>
  <text class="d-sub" x="580" y="78" text-anchor="middle">start at the top-right corner</text>
  <rect class="d-box-muted" x="440" y="112" width="280" height="46" rx="8"/>
  <text class="d-sub" x="580" y="140" text-anchor="middle">15, 11, 7: too big, move left</text>
  <rect class="d-box-muted" x="440" y="174" width="280" height="46" rx="8"/>
  <text class="d-sub" x="580" y="202" text-anchor="middle">4: too small, move down</text>
  <rect class="d-box-accent" x="440" y="236" width="280" height="46" rx="8"/>
  <text class="d-sub" x="580" y="264" text-anchor="middle">5: found at row 1, col 1</text>
</svg>

The search for 5 visits \`15, 11, 7, 4, 5\` — five cells out of 25, exactly the path Example 2 prints. The bottom-left corner works too (up when too big, right when too small). The top-left and bottom-right corners do **not** work: from top-left both directions increase, so a "too small" answer does not tell you which way to go.

## 6. Which One Should You Use?

| Method | Works on | Time | Probes on a 1000 x 1000 Shape 1 matrix (Example 3) |
| :--- | :--- | :--- | :--- |
| Scan every cell | Any matrix | O(m n) | up to 1,000,000 |
| Binary search each row | Sorted rows | O(m log n) | about 10 per row, up to 1,000 rows |
| Flattened binary search | Shape 1 only | O(log(m n)) | 19 or 20 |
| Staircase walk | Shape 1 and Shape 2 | O(m + n) | 1 to 1,999 |

On a Shape 1 matrix the flattened search wins clearly — 20 probes against 1,999 for the worst staircase case. On a Shape 2 matrix only the staircase (or the row-by-row search) is correct. If you are not told which shape you have, the staircase is the safe choice.

> **Key insight:** both algorithms are "elimination" searches. Binary search eliminates half of the remaining cells per probe; the staircase eliminates a whole row or column per probe. Pick the one whose elimination rule the data actually supports.

## 7. The C++ Solution, Line by Line

**Shape 1 — flattened binary search:**

~~~cpp
bool searchMatrix(const std::vector<std::vector<int>>& matrix, int target) {
    if (matrix.empty() || matrix[0].empty()) return false;
    long long rows = matrix.size(), cols = matrix[0].size();
    long long lo = 0, hi = rows * cols - 1;          // signed, so hi = -1 is possible
    while (lo <= hi) {
        long long mid = lo + (hi - lo) / 2;
        int value = matrix[mid / cols][mid % cols]; // 1D index -> (row, column)
        if (value == target) return true;
        if (value < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return false;
}
~~~

- \`matrix.empty() || matrix[0].empty()\` must be checked first: \`operator[]\` on an empty vector is undefined behaviour, not an exception.
- \`long long rows = matrix.size()\` — the sizes are converted to a **signed** 64-bit type. Signed matters: with an unsigned type, \`hi = rows * cols - 1\` could never be negative and \`hi = mid - 1\` at \`mid = 0\` would wrap to a huge number instead of ending the loop.
- \`mid / cols\` and \`mid % cols\` are integer division and remainder because both operands are integers.

**Shape 2 — staircase walk** (from Example 2):

~~~cpp
std::optional<std::pair<int, int>> staircase(const Grid& matrix, int target, std::vector<std::string>* path) {
    if (matrix.empty() || matrix[0].empty()) return std::nullopt;
    int r = 0, c = static_cast<int>(matrix[0].size()) - 1;   // int, so c can reach -1
    while (r < static_cast<int>(matrix.size()) && c >= 0) {
        int value = matrix[r][c];
        if (path) path->push_back("(" + std::to_string(r) + "," + std::to_string(c) + ")=" + std::to_string(value));
        if (value == target) return std::make_pair(r, c);
        if (value > target) c--;
        else r++;
    }
    return std::nullopt;
}
~~~

- \`int c = static_cast<int>(matrix[0].size()) - 1\` — \`c\` must be signed so that \`c >= 0\` can become false. With \`size_t c\`, \`c >= 0\` is always true and \`c--\` from 0 wraps to 18446744073709551615.
- \`std::optional<std::pair<int, int>>\` (C++17) says "maybe a position" in the type itself; \`std::nullopt\` means not found.

## 8. C++ Details That Matter

- **\`std::binary_search(row.begin(), row.end(), target)\`** from \`<algorithm>\` gives the O(m log n) per-row baseline; it returns only \`bool\`. Use \`std::lower_bound\` when you need the position.
- **Pass by \`const&\`.** \`searchMatrix(std::vector<std::vector<int>> m, ...)\` would deep-copy every row — O(m n) before the search even starts.
- **Memory layout.** Each inner \`std::vector\` owns a separate heap buffer, so rows are contiguous but the matrix as a whole is not. A single \`std::vector<int>\` of size \`m * n\` with manual indexing is the cache-friendly alternative, and then Shape 1 is literally \`std::binary_search\` on it.
- **Ordered containers in tests.** Example 2 uses \`std::set<int>\`, which iterates in sorted order, so the printed list is deterministic; \`std::unordered_set\` would not be.

## 9. Verified: Running the Code

Every program below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3.0 with -std=c++17). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — Shape 1: flattened binary search on nine inputs**

~~~text
true
false
true
true
false
false
true
false
false
~~~

**Example 2 — Shape 2: staircase path, brute-force check, and why flattening fails**

~~~text
target 5 -> found at (1, 1)
  path: (0,4)=15 (0,3)=11 (0,2)=7 (0,1)=4 (1,1)=5
target 20 -> not found
  path: (0,4)=15 (1,4)=19 (2,4)=22 (2,3)=16 (3,3)=17 (4,3)=26 (4,2)=23 (4,1)=21 (4,0)=18
staircase agrees with brute force for 0..31: true
flattened search misses 12 of 25 values, e.g. [3, 4, 6, 7, 11]
~~~

The staircase answer matched a brute-force membership test for every target from 0 to 31. Running the Shape 1 binary search on the Shape 2 matrix missed 12 of the 25 values that are really there.

**Example 3 — Probe counts on a 1000 x 1000 matrix: flattened vs staircase**

~~~text
top-right corner: flattened 19 probes (true), staircase 1 probes (true)
centre cell: flattened 19 probes (true), staircase 1000 probes (true)
bottom-left corner: flattened 20 probes (true), staircase 1999 probes (true)
absent odd value: flattened 20 probes (false), staircase 1501 probes (false)
~~~

The matrix holds the even numbers \`0, 2, ..., 1999998\`, so it is both shapes at once. The flattened search never needed more than 20 probes; the staircase needed 1,999 for the bottom-left corner.

## 10. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Scan every cell | O(m n) | O(1) | Reads every cell |
| \`std::binary_search\` per row | O(m log n) | O(1) | One search per row |
| Flattened binary search (Shape 1) | O(log(m n)) | O(1) | At most 20 probes for 1,000,000 cells |
| Staircase (Shape 1 or 2) | O(m + n) | O(1) | At most 1,999 probes for 1000 x 1000 |

## 11. Edge Cases

- **Empty matrix or empty first row** — \`[]\` and \`[[]]\` both return false before touching \`matrix[0][0]\`.
- **Single cell** — \`[[5]]\` searching for 5: \`lo = hi = 0\`, found.
- **Target below the minimum or above the maximum** — \`0\` and \`61\` in Example 1 end the search quickly with false.
- **Target at a corner** — top-right is the staircase best case (1 probe); bottom-left is its worst case (\`m + n - 1\` = 1,999 probes in Example 3).
- **Duplicates** — both methods still answer true/false correctly; if you need *every* position, you must keep searching after the first hit.
- **Very large matrices** — \`m * n\` may not fit in a 32-bit integer; see the language notes.

## 12. Common Pitfalls

- **Using the flattened search on a Shape 2 matrix.** Compiles, runs, and misses values (12 of 25 in Example 2).
- **Unsigned column index in the staircase.** \`size_t c\` makes \`c >= 0\` always true and wraps at zero.
- **\`matrix[0]\` before checking \`empty()\`.** Undefined behaviour, not an exception.
- **\`int\` for \`m * n\` on huge inputs.** Signed overflow is undefined behaviour; use \`long long\`.
- **Passing the matrix by value.** A deep copy costs O(m n).
- **Starting the staircase at the top-left.** A too-small comparison gives no direction.

## 13. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Ask first:</strong> <span style="color:#f0e2c8;">Do rows chain into one sorted sequence, or are rows and columns sorted separately? The algorithm depends on it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Shape 1:</strong> <span style="color:#f0e2c8;">Binary search over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 .. m*n - 1</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>, reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[mid / cols][mid % cols]</code>. O(log(m n)), O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Shape 2:</strong> <span style="color:#f0e2c8;">Start top-right with a signed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> column: too big, move left; too small, move down. O(m + n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Baselines:</strong> <span style="color:#f0e2c8;">Scan is O(m n); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::binary_search</code> per row is O(m log n). Flattening Shape 2 is wrong — it missed 12 of 25 values in my test.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ notes:</strong> <span style="color:#f0e2c8;">Check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">empty()</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0]</code>, keep indices signed, pass by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code>, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m * n</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the top-right corner work but not the top-left?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Top-right is the largest in its row and smallest in its column, so each comparison rules out a whole row or column. From top-left both directions increase.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">c</code> be an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code>, not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">size_t</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The loop ends when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c</code> drops below zero. An unsigned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c</code> cannot be negative: decrementing 0 wraps to the maximum value, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c &gt;= 0</code> stays true.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you beat O(m + n) on Shape 2?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in general: the anti-diagonal cells are independent, so a correct algorithm must look at them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you store the matrix for speed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt;</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m <em style="color:#d8d8d8;"> n</code> values with index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r </em> cols + c</code>: one allocation, contiguous memory, and Shape 1 becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::binary_search</code> on it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you count values less than or equal to x?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Staircase from bottom-left: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[r][c] &lt;= x</code>, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r + 1</code> and move right; otherwise move up. O(m + n).</span>
</div>

</div>

## 14. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Row-major order** | Reading a matrix row by row; cell (r, c) is position r * cols + c |
| **Sorted matrix (Young tableau)** | Rows and columns each sorted ascending |
| **Index mapping** | row = index / cols, col = index % cols |
| **Staircase search (saddleback search)** | Walk from the top-right corner, dropping a row or a column per step |

---
**Conclusion:** "Search a sorted 2D matrix" is two problems: if rows chain, binary search the folded array with \`mid / cols\` and \`mid % cols\` in O(log(m n)); if only rows and columns are sorted, walk the staircase from the top-right in O(m + n). The runs showed 20 probes against up to 1,999 on Shape 1 and 12 missed values when the Shape 1 algorithm meets Shape 2. In C++, the extra marks come from the unsigned-index traps, checking \`empty()\` before \`[0]\`, \`long long\` for \`m * n\`, and passing by \`const&\`.
`,
        examples: [
          { label: "Shape 1: flattened binary search on nine inputs", code: `#include <iostream>
#include <vector>

// Rows sorted left to right, and each row starts after the previous row ends.
// Treat the m x n grid as one sorted list of length m*n.
bool searchMatrix(const std::vector<std::vector<int>>& matrix, int target) {
    if (matrix.empty() || matrix[0].empty()) return false;
    long long rows = matrix.size(), cols = matrix[0].size();
    long long lo = 0, hi = rows * cols - 1;          // signed, so hi = -1 is possible
    while (lo <= hi) {
        long long mid = lo + (hi - lo) / 2;
        int value = matrix[mid / cols][mid % cols]; // 1D index -> (row, column)
        if (value == target) return true;
        if (value < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return false;
}

int main() {
    std::cout << std::boolalpha;
    std::vector<std::vector<int>> m = {{1, 3, 5, 7}, {10, 11, 16, 20}, {23, 30, 34, 60}};
    std::cout << searchMatrix(m, 3) << "\\n";       // true
    std::cout << searchMatrix(m, 13) << "\\n";      // false
    std::cout << searchMatrix(m, 1) << "\\n";       // true
    std::cout << searchMatrix(m, 60) << "\\n";      // true
    std::cout << searchMatrix(m, 0) << "\\n";       // false
    std::cout << searchMatrix(m, 61) << "\\n";      // false
    std::cout << searchMatrix({{5}}, 5) << "\\n";   // true
    std::cout << searchMatrix({}, 5) << "\\n";      // false
    std::cout << searchMatrix({{}}, 5) << "\\n";    // false
    return 0;
}` },
          { label: "Shape 2: staircase path, brute-force check, and why flattening fails", code: `#include <iostream>
#include <optional>
#include <set>
#include <string>
#include <utility>
#include <vector>

using Grid = std::vector<std::vector<int>>;

// Rows AND columns sorted (rows need not chain). Start at the top-right corner:
// too big -> move left (drop the column), too small -> move down (drop the row).
std::optional<std::pair<int, int>> staircase(const Grid& matrix, int target, std::vector<std::string>* path) {
    if (matrix.empty() || matrix[0].empty()) return std::nullopt;
    int r = 0, c = static_cast<int>(matrix[0].size()) - 1;   // int, so c can reach -1
    while (r < static_cast<int>(matrix.size()) && c >= 0) {
        int value = matrix[r][c];
        if (path) path->push_back("(" + std::to_string(r) + "," + std::to_string(c) + ")=" + std::to_string(value));
        if (value == target) return std::make_pair(r, c);
        if (value > target) c--;
        else r++;
    }
    return std::nullopt;
}

// The 1D binary search from example 1: only valid when rows chain.
bool flattened(const Grid& matrix, int target) {
    int cols = static_cast<int>(matrix[0].size());
    int lo = 0, hi = static_cast<int>(matrix.size()) * cols - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        int value = matrix[mid / cols][mid % cols];
        if (value == target) return true;
        if (value < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return false;
}

std::string fmt(const std::optional<std::pair<int, int>>& pos) {
    if (!pos) return "not found";
    return "found at (" + std::to_string(pos->first) + ", " + std::to_string(pos->second) + ")";
}

int main() {
    std::cout << std::boolalpha;
    Grid g = {{1, 4, 7, 11, 15},
              {2, 5, 8, 12, 19},
              {3, 6, 9, 16, 22},
              {10, 13, 14, 17, 24},
              {18, 21, 23, 26, 30}};

    for (int target : {5, 20}) {
        std::vector<std::string> path;
        auto result = staircase(g, target, &path);
        std::cout << "target " << target << " -> " << fmt(result) << "\\n";
        std::cout << "  path:";
        for (const auto& p : path) std::cout << " " << p;
        std::cout << "\\n";
    }

    std::set<int> present;                     // std::set is ordered
    for (const auto& row : g) present.insert(row.begin(), row.end());
    bool agree = true;
    for (int t = 0; t <= 31; t++) {
        if (staircase(g, t, nullptr).has_value() != (present.count(t) > 0)) agree = false;
    }
    std::cout << "staircase agrees with brute force for 0..31: " << agree << "\\n";

    std::vector<int> wrong;
    for (int t : present) if (!flattened(g, t)) wrong.push_back(t);
    std::cout << "flattened search misses " << wrong.size() << " of " << present.size() << " values, e.g. [";
    for (size_t i = 0; i < wrong.size() && i < 5; i++) std::cout << (i ? ", " : "") << wrong[i];
    std::cout << "]\\n";
    return 0;
}` },
          { label: "Probe counts on a 1000 x 1000 matrix: flattened vs staircase", code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

// Count how many cells each method reads on a big matrix that satisfies BOTH
// shapes (rows chain, so rows and columns are also sorted).
const int ROWS = 1000, COLS = 1000;
std::vector<std::vector<int>> grid(ROWS, std::vector<int>(COLS));

std::pair<bool, int> flattenedProbes(int target) {
    int lo = 0, hi = ROWS * COLS - 1, probes = 0;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        probes++;
        int value = grid[mid / COLS][mid % COLS];
        if (value == target) return {true, probes};
        if (value < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return {false, probes};
}

std::pair<bool, int> staircaseProbes(int target) {
    int r = 0, c = COLS - 1, probes = 0;
    while (r < ROWS && c >= 0) {
        probes++;
        int value = grid[r][c];
        if (value == target) return {true, probes};
        if (value > target) c--;
        else r++;
    }
    return {false, probes};
}

int main() {
    std::cout << std::boolalpha;
    for (int r = 0; r < ROWS; r++)
        for (int c = 0; c < COLS; c++) grid[r][c] = 2 * (r * COLS + c);  // even numbers 0..1999998

    std::vector<std::pair<std::string, int>> cases = {{"top-right corner", grid[0][COLS - 1]},
                                                       {"centre cell", grid[500][500]},
                                                       {"bottom-left corner", grid[ROWS - 1][0]},
                                                       {"absent odd value", 1000001}};
    for (const auto& [name, target] : cases) {
        auto [fFound, fProbes] = flattenedProbes(target);
        auto [sFound, sProbes] = staircaseProbes(target);
        std::cout << name << ": flattened " << fProbes << " probes (" << fFound << "), staircase " << sProbes
                  << " probes (" << sFound << ")\\n";
    }
    return 0;
}` },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Median of two sorted arrays in O(log(min(m,n))) — how does the partition trick work?",
    difficulty: "hard",
    seoDescription: "Median of two sorted arrays in O(log(min(m,n))): the partition trick explained with traces and verified Python, JavaScript, Java and C++ code.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You have two sorted lists of integers, of lengths m and n. Return the median of all the numbers together. A merge is O(m + n); I would like O(log(min(m, n))). Please write it in Python and explain the partition idea."

**What a strong answer should cover:**
- The merge baseline in O(m + n), then the observation that choosing a cut \`i\` in one list forces \`j = half - i\` in the other.
- The validity test \`A[i-1] <= B[j]\` and \`B[j-1] <= A[i]\`, with infinities at the edges, and how each failure says which way to move.
- Binary search on \`i\` over the **shorter** list: O(log(min(m, n))) time, O(1) space, and why it keeps \`j\` in range.
- Reading the median from the cut for odd and even totals.
- Python specifics: \`float('inf')\` sentinels, \`//\` for \`half\`, \`/\` returning a float for the even case, unbounded \`int\`, and that \`statistics.median(a + b)\` is an O((m+n) log(m+n)) shortcut, not the answer.

**Clarifying questions expected:**
- "Can either list be empty?"
- "For an even total, do you want the average of the two middle values?"

**Code / implementation expected:** Yes — \`find_median_sorted_arrays(a, b)\` in Python using the partition binary search.`,
        answer: `**Target Audience:** Intermediate interview candidates — you should know binary search and what a sorted array is; every other idea is explained here.
**Difficulty:** Hard
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the Python programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

Two schools line up their students by height for a joint photo — each line is already sorted, shortest to tallest. The photographer wants the **middle** height of all the students together.

The obvious way: merge the two lines into one long sorted line and walk to the middle. That works, but if the lines are a million students long, you walk past half a million people.

The clever way: the photographer does not need the merged line, only a **dividing point**. Imagine drawing one chalk mark in each line so that, together, the students left of the two marks are exactly half of everyone, and every one of them is no taller than anyone right of the marks. Then the middle height is sitting right at the chalk marks — the tallest person on the left or (for an even count) the average of that and the shortest person on the right.

Here is the trick: once you choose where the mark goes in line A, the mark in line B is **forced** (the left side must hold exactly half of everyone). So you only need to *search for one mark* — and you can binary search it in the shorter line. That is how a problem that looks like it needs a merge is solved in O(log(min(m, n))).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| "Are both arrays sorted ascending?" | The partition rule depends on it; unsorted input needs sorting first. |
| "Can one array be empty? Both?" | One empty array is normal and must work; both empty has no median — decide whether to throw. |
| "For an even total, the average of the two middle values?" | That is the usual definition, and it means the answer may be a fraction like 2.5. |
| "What number type, and how large can values be?" | Adding the two middle values can overflow a 32-bit integer in Java and C++. |
| "Is O(m + n) acceptable, or do you need the logarithmic version?" | The merge is a valid first answer; the follow-up is almost always the partition trick. |

## 3. The Median, and the Brute Force

📌 **Interview term: Median** — the middle value of a sorted list. With an odd count it is the single middle element; with an even count it is the average of the two middle elements. \`[1, 2, 3]\` has median 2; \`[1, 2, 3, 4]\` has median 2.5.

The straightforward answer is to merge the two sorted arrays (the same step as in merge sort — see [How do you merge two sorted arrays?](/interview-question/how-do-you-merge-two-sorted-arrays)) and read the middle. Example 2 uses that merge as its reference answer.

📌 **Interview term: Merge step** — walking two sorted lists with one pointer each, always taking the smaller head, to produce one sorted list in O(m + n).

You can avoid building the merged array by stopping the two pointers at the middle, which saves memory but is still O(m + n) time. To get to O(log(min(m, n))), we have to stop thinking about *merging* and start thinking about *cutting*.

## 4. The Partition Idea

Let \`m = len(A)\`, \`n = len(B)\` and \`half = (m + n + 1) / 2\` (integer division; for an odd total the left side gets the extra element).

Cut A after its first \`i\` elements and B after its first \`j\` elements, with \`i + j = half\`. The left halves of both arrays together form the "left side"; everything else is the "right side".

📌 **Interview term: Partition (cut)** — a split of each array into a left part and a right part. Choosing \`i\` fixes \`j = half - i\`, so there is really only **one** number to choose.

The cut is correct exactly when every value on the left is less than or equal to every value on the right. Inside each array that is automatic (it is sorted), so only the two **cross** comparisons need checking:

- \`A[i-1] <= B[j]\` — the biggest of A on the left is not bigger than the smallest of B on the right.
- \`B[j-1] <= A[i]\` — the biggest of B on the left is not bigger than the smallest of A on the right.

When a cut has nothing on one side (\`i = 0\`, \`i = m\`, \`j = 0\` or \`j = n\`), the missing neighbour is replaced by minus or plus infinity so the comparison always passes.

📌 **Interview term: Sentinel** — a stand-in value (here minus or plus infinity) used at the edges so the same comparison code works without special cases.

Once the cut is valid, the answer is right at the cut:

- odd total: median = \`max(A[i-1], B[j-1])\`, the biggest value on the left;
- even total: median = \`(max(A[i-1], B[j-1]) + min(A[i], B[j])) / 2\`.

## 5. Why Binary Search Finds the Cut

If a cut fails, it tells you **which way to move**:

<svg class="iq-diagram" width="100%" viewBox="0 0 740 262" role="img" aria-label="Decision rule for one cut. If A left is bigger than B right, move i left. If B left is bigger than A right, move i right. Otherwise the cut is valid">
  <defs>
    <marker id="b04q3-r-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="180" y="20" width="380" height="60" rx="10"/>
  <text class="d-text" x="370" y="46" text-anchor="middle">pick i in the shorter array A</text>
  <text class="d-sub" x="370" y="68" text-anchor="middle">j = half - i</text>
  <path class="d-edge" d="M 260 84 L 130 140" marker-end="url(#b04q3-r-python)"/>
  <path class="d-edge" d="M 370 84 L 370 140" marker-end="url(#b04q3-r-python)"/>
  <path class="d-edge" d="M 480 84 L 610 140" marker-end="url(#b04q3-r-python)"/>
  <rect class="d-box" x="20" y="146" width="220" height="96" rx="10"/>
  <text class="d-text" x="130" y="176" text-anchor="middle">A left &gt; B right</text>
  <text class="d-sub" x="130" y="202" text-anchor="middle">too many from A</text>
  <text class="d-sub" x="130" y="226" text-anchor="middle">hi = i - 1</text>
  <rect class="d-box-accent" x="260" y="146" width="220" height="96" rx="10"/>
  <text class="d-text d-accent" x="370" y="176" text-anchor="middle">both checks pass</text>
  <text class="d-sub" x="370" y="202" text-anchor="middle">the cut is valid</text>
  <text class="d-sub" x="370" y="226" text-anchor="middle">read the median</text>
  <rect class="d-box" x="500" y="146" width="220" height="96" rx="10"/>
  <text class="d-text" x="610" y="176" text-anchor="middle">B left &gt; A right</text>
  <text class="d-sub" x="610" y="202" text-anchor="middle">too few from A</text>
  <text class="d-sub" x="610" y="226" text-anchor="middle">lo = i + 1</text>
</svg>

- \`A[i-1] > B[j]\` means A put a too-big value on the left: we took **too many** from A, so the right \`i\` is smaller.
- \`B[j-1] > A[i]\` means B put a too-big value on the left, so we took **too few** from A and the right \`i\` is larger.

That one-directional answer is exactly what binary search needs. Search \`i\` over \`0 .. m\`; each test halves the range.

📌 **Interview term: Binary search on the partition** — binary searching the cut position \`i\` (not a value) and using the two cross comparisons to decide the direction. The basics of binary search are in [How does binary search work and what are its requirements?](/interview-question/how-does-binary-search-work-and-what-are-its-requirements)

**Why search the shorter array?** Two reasons. First, cost: the range \`0 .. m\` has \`m + 1\` positions, so the search takes O(log(min(m, n))) steps if A is the shorter one. Second, safety: with \`m <= n\`, every \`i\` in \`0 .. m\` gives \`j = half - i\` between \`0\` and \`n\`, so \`j\` never goes out of bounds. Searching the longer array can produce a negative \`j\`.

### The trace on our example

\`A = [1, 3, 8, 9, 15]\` (m = 5), \`B = [7, 11, 18, 19, 21, 25]\` (n = 6), total 11, \`half = 6\`. The search starts with \`lo = 0\`, \`hi = 5\`.

**Step 1:** \`i = 2\`, so \`j = 4\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 306" role="img" aria-label="Cut of A at 2 and B at 4. Result: too few from A">
  <defs>
    <marker id="b04q3-s1-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="66" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="80" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="107.0" y="65.0" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="142" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="169.0" y="65.0" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="204" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="231.0" y="65.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="266" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="293.0" y="65.0" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="328" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="355.0" y="65.0" text-anchor="middle">15</text>
  <path class="d-edge-dashed" d="M 200.0 30 L 200.0 90"/>
  <text class="d-text" x="40" y="156" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="80" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="107.0" y="155.0" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="142" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="169.0" y="155.0" text-anchor="middle">11</text>
  <rect class="d-box-accent" x="204" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="231.0" y="155.0" text-anchor="middle">18</text>
  <rect class="d-box-accent" x="266" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="293.0" y="155.0" text-anchor="middle">19</text>
  <rect class="d-box-muted" x="328" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="355.0" y="155.0" text-anchor="middle">21</text>
  <rect class="d-box-muted" x="390" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="417.0" y="155.0" text-anchor="middle">25</text>
  <path class="d-edge-dashed" d="M 324.0 120 L 324.0 180"/>
  <text class="d-sub" x="600" y="66" text-anchor="middle">cut A at i = 2</text>
  <text class="d-sub" x="600" y="156" text-anchor="middle">cut B at j = 4</text>
  <rect class="d-box" x="80" y="210" width="290" height="76" rx="8"/>
  <text class="d-sub" x="225" y="240" text-anchor="middle">A left 3 vs B right 21</text>
  <text class="d-sub" x="225" y="268" text-anchor="middle">B left 19 vs A right 8</text>
  <rect class="d-box-muted" x="420" y="210" width="300" height="76" rx="8"/>
  <text class="d-text" x="570" y="240" text-anchor="middle">too few from A</text>
  <text class="d-sub" x="570" y="268" text-anchor="middle">B left 19 &gt; A right 8, so lo = 3</text>
</svg>

**Step 2:** \`lo = 3\`, \`hi = 5\`, so \`i = 4\` and \`j = 2\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 306" role="img" aria-label="Cut of A at 4 and B at 2. Result: valid cut">
  <defs>
    <marker id="b04q3-s2-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="66" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="80" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="107.0" y="65.0" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="142" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="169.0" y="65.0" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="204" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="231.0" y="65.0" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="266" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="293.0" y="65.0" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="328" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="355.0" y="65.0" text-anchor="middle">15</text>
  <path class="d-edge-dashed" d="M 324.0 30 L 324.0 90"/>
  <text class="d-text" x="40" y="156" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="80" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="107.0" y="155.0" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="142" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="169.0" y="155.0" text-anchor="middle">11</text>
  <rect class="d-box-muted" x="204" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="231.0" y="155.0" text-anchor="middle">18</text>
  <rect class="d-box-muted" x="266" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="293.0" y="155.0" text-anchor="middle">19</text>
  <rect class="d-box-muted" x="328" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="355.0" y="155.0" text-anchor="middle">21</text>
  <rect class="d-box-muted" x="390" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="417.0" y="155.0" text-anchor="middle">25</text>
  <path class="d-edge-dashed" d="M 200.0 120 L 200.0 180"/>
  <text class="d-sub" x="600" y="66" text-anchor="middle">cut A at i = 4</text>
  <text class="d-sub" x="600" y="156" text-anchor="middle">cut B at j = 2</text>
  <rect class="d-box" x="80" y="210" width="290" height="76" rx="8"/>
  <text class="d-sub" x="225" y="240" text-anchor="middle">A left 9 vs B right 18</text>
  <text class="d-sub" x="225" y="268" text-anchor="middle">B left 11 vs A right 15</text>
  <rect class="d-box-accent" x="420" y="210" width="300" height="76" rx="8"/>
  <text class="d-text" x="570" y="240" text-anchor="middle">valid cut</text>
  <text class="d-sub" x="570" y="268" text-anchor="middle">median = max(9, 11) = 11</text>
</svg>

The left side holds \`1, 3, 8, 9, 7, 11\` — six values, all no bigger than \`15, 18, 19, 21, 25\`. The total is odd, so the median is the biggest left value, 11. Two steps; the merge would have walked six elements to get there. Example 2 prints exactly this trace.

> **Key insight:** you are not looking for a *value*, you are looking for a *position*. The rule "too many from A / too few from A" is monotonic in \`i\`, and anything monotonic can be binary searched.

## 6. The Python Solution, Line by Line

~~~python
def find_median_sorted_arrays(a, b):
    if len(a) > len(b):
        a, b = b, a                       # binary search over the SHORTER array
    m, n = len(a), len(b)
    half = (m + n + 1) // 2               # size of the left half (gets the extra one if odd)
    lo, hi = 0, m                         # i = how many elements of a go left: 0..m
    while lo <= hi:
        i = (lo + hi) // 2
        j = half - i                      # the rest of the left half comes from b
        a_left = a[i - 1] if i > 0 else float("-inf")
        a_right = a[i] if i < m else float("inf")
        b_left = b[j - 1] if j > 0 else float("-inf")
        b_right = b[j] if j < n else float("inf")
        if a_left <= b_right and b_left <= a_right:     # every left <= every right
            if (m + n) % 2 == 1:
                return float(max(a_left, b_left))
            return (max(a_left, b_left) + min(a_right, b_right)) / 2
        if a_left > b_right:
            hi = i - 1                    # took too many from a
        else:
            lo = i + 1                    # took too few from a
    raise ValueError("inputs must be sorted")
~~~

- \`a, b = b, a\` swaps the two names in one line so \`a\` is always the shorter list.
- \`half = (m + n + 1) // 2\` — floor division; the \`+ 1\` gives the left side the extra element when the total is odd, so the odd-case median is simply the biggest left value.
- \`float("-inf")\` and \`float("inf")\` are real \`float\` values that compare correctly with any \`int\`, so the edge cases need no \`if\` chains.
- \`(max(...) + min(...)) / 2\` — in Python 3, \`/\` always returns a \`float\` (\`5 / 2\` is \`2.5\`). For the odd case we wrap the result in \`float(...)\` so the function always returns the same type.
- Python \`int\` is unbounded, so adding the two middle values can never overflow.
- The final \`raise\` only runs if the loop ends without a valid cut, which happens when an input is not sorted.

## 7. Python Details That Matter

- **\`statistics.median(a + b)\`** is a handy check but it concatenates and sorts: O((m + n) log(m + n)). It also returns an \`int\` for odd counts — \`statistics.median([1, 3] + [2])\` printed \`2\`, while the even case printed \`2.5\` — so the type changes with the input.
- **\`heapq.merge(a, b)\`** lazily merges two sorted iterables; \`list(heapq.merge([1, 3], [2]))\` printed \`[1, 2, 3]\`. It is a neat O(m + n) brute force.
- **Formatting.** \`f"{x:.1f}"\` prints one decimal, which is how the examples print \`2.0\` and \`2.5\` the same way in every language.
- **Recursion.** The alternative "kth smallest of two arrays" solution is often written recursively with slices like \`a[k//2:]\`; each slice copies, which quietly turns O(log) into O(m + n). Use indices instead.

## 8. Verified: Running the Code

Every program below was saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13.16). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — The partition search on eight inputs, including empty and negative arrays**

~~~text
2.0
2.5
1.0
2.0
0.0
11.0
-2.5
6.0
~~~

**Example 2 — Trace of the cuts, plus 500 random tests against the merge**

~~~text
step 1: i=2 j=4 | A left 3 right 8 | B left 19 right 21 -> too few from A
step 2: i=4 j=2 | A left 9 right 15 | B left 11 right 18 -> valid
median 11.0
500 random tests match the merge: true
most partition steps in one test: 4
~~~

The 500 random tests used array lengths 0 to 8 and values 0 to 20 from a small portable random generator, so every language tested exactly the same arrays. The partition search agreed with the merge on all of them and never needed more than 4 steps.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`statistics.median(a + b)\` | O((m+n) log(m+n)) | O(m + n) | Concatenates and sorts |
| Merge, then read the middle | O(m + n) | O(m + n) | Builds the merged list |
| Two pointers to the middle | O(m + n) | O(1) | Walks half of both lists |
| Partition binary search | O(log(min(m, n))) | O(1) | Halves the \`0 .. m\` range of the shorter list per step: at most 4 steps in the 500 random tests |

## 10. Edge Cases

- **One array empty** — \`[]\` and \`[1]\`: after the swap A is empty, \`lo = hi = 0\`, \`i = 0\`, \`j = 1\`, the sentinels make the cut valid, and the median is \`1.0\`.
- **All of A smaller than all of B** — \`[1..10]\` and \`[11]\`: A is the longer one, so the arrays are swapped and we binary search \`[11]\`. The median is \`6.0\`.
- **Duplicates** — \`[0, 0]\` and \`[0, 0]\`: the conditions use \`<=\`, so equal values on both sides of the cut are fine; median \`0.0\`.
- **Negative numbers** — \`[-5, -3, -1]\` and \`[-2]\`: nothing special; median \`-2.5\`.
- **Both empty** — no median; the code should throw or return a defined error value (ours throws only if inputs are not sorted, so guard this case explicitly if it can happen).
- **Unsorted input** — the search never finds a valid cut; our function raises an error at the end of the loop instead of returning nonsense.

## 11. Common Pitfalls

- **Binary searching the longer list.** \`j = half - i\` can go negative, and \`b[j - 1]\` with a negative index silently reads from the end of the list in Python.
- **Using \`/\` for \`half\` or \`i\`.** \`(lo + hi) / 2\` is a float and cannot index a list; use \`//\`.
- **Forgetting the sentinels.** Without \`float('-inf')\` / \`float('inf')\`, \`i = 0\` or \`i = m\` needs four extra \`if\` branches, and one is usually wrong.
- **Getting \`half\` wrong.** With \`(m + n) // 2\` instead of \`(m + n + 1) // 2\`, the odd-case median is on the right side, not the left.
- **Slicing in a recursive version.** \`a[i:]\` copies; the O(log) promise is lost.
- **Returning mixed types.** An \`int\` for odd totals and a \`float\` for even ones surprises callers; return \`float\` always.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;">Merging gives the median in O(m + n). To do better I stop merging and look for a <strong style="color:#ffca28;">cut</strong> instead.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The cut:</strong> <span style="color:#f0e2c8;">Cut A at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> and B at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j = half - i</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">half = (m + n + 1) // 2</code>. It is valid when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A[i-1] &lt;= B[j]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B[j-1] &lt;= A[i]</code>, with infinities at the edges.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Binary search:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A[i-1] &gt; B[j]</code> I took too many from A, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = i - 1</code>; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = i + 1</code>. Search the shorter list so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> stays in range: O(log(min(m, n))).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The answer:</strong> <span style="color:#f0e2c8;">Odd total: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(A[i-1], B[j-1])</code>. Even total: average that with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min(A[i], B[j])</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python notes:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float('inf')</code> sentinels, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">//</code> for indices, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/</code> gives a float for the average, no overflow; I checked it against a merge on 500 random cases.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must A be the shorter list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So that every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 .. m</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j = half - i</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 .. n</code>, and so the search costs O(log(min(m, n))). On the longer list <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> can go negative — and in Python a negative index does not crash, it reads from the end.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(m + n + 1) // 2</code> for the left half?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It puts the extra element on the left when the total is odd, so the odd median is just the largest left value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find the kth smallest of two sorted arrays?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same idea with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">half</code> replaced by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>, or the classic recursion that discards <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k // 2</code> elements from one array per step — O(log k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it work with duplicates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The checks use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>, so equal values on both sides of the cut are allowed; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 0]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 0]</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.0</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare with a merge-based median on many random sorted inputs, including empty lists — Example 2 runs 500 such cases.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Median** | Middle value of a sorted list; average of the two middle values for an even count |
| **Merge step** | Two pointers produce one sorted list from two in O(m + n) |
| **Partition (cut)** | Splitting each array at i and j with i + j = half |
| **Sentinel** | Minus or plus infinity at the edges so comparisons need no special cases |
| **Binary search on the partition** | Binary searching the cut position i using the cross comparisons |

---
**Conclusion:** The median of two sorted lists does not need a merge: choose how many elements of the shorter list go to the left half, let that force the cut in the other list, and binary search the choice using the two cross comparisons. With infinities at the edges the code has no special cases, and the median falls straight out of the four values around the cut. In Python, use \`//\` for indices, \`float('inf')\` for sentinels and a \`float\` return value; the 500-case random test against a merge is how you show the interviewer the trick really works.
`,
        examples: [
          { label: "The partition search on eight inputs, including empty and negative arrays", code: `def find_median_sorted_arrays(a, b):
    if len(a) > len(b):
        a, b = b, a                       # binary search over the SHORTER array
    m, n = len(a), len(b)
    half = (m + n + 1) // 2               # size of the left half (gets the extra one if odd)
    lo, hi = 0, m                         # i = how many elements of a go left: 0..m
    while lo <= hi:
        i = (lo + hi) // 2
        j = half - i                      # the rest of the left half comes from b
        a_left = a[i - 1] if i > 0 else float("-inf")
        a_right = a[i] if i < m else float("inf")
        b_left = b[j - 1] if j > 0 else float("-inf")
        b_right = b[j] if j < n else float("inf")
        if a_left <= b_right and b_left <= a_right:     # every left <= every right
            if (m + n) % 2 == 1:
                return float(max(a_left, b_left))
            return (max(a_left, b_left) + min(a_right, b_right)) / 2
        if a_left > b_right:
            hi = i - 1                    # took too many from a
        else:
            lo = i + 1                    # took too few from a
    raise ValueError("inputs must be sorted")


def fmt(x):
    return f"{x:.1f}"


print(fmt(find_median_sorted_arrays([1, 3], [2])))                            # 2.0
print(fmt(find_median_sorted_arrays([1, 2], [3, 4])))                         # 2.5
print(fmt(find_median_sorted_arrays([], [1])))                                # 1.0
print(fmt(find_median_sorted_arrays([2], [])))                                # 2.0
print(fmt(find_median_sorted_arrays([0, 0], [0, 0])))                         # 0.0
print(fmt(find_median_sorted_arrays([1, 3, 8, 9, 15], [7, 11, 18, 19, 21, 25])))  # 11.0
print(fmt(find_median_sorted_arrays([-5, -3, -1], [-2])))                     # -2.5
print(fmt(find_median_sorted_arrays([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [11])))  # 6.0` },
          { label: "Trace of the cuts, plus 500 random tests against the merge", code: `INF = float("inf")


def median_traced(a, b, log=None):
    """Same partition search as example 1, but returns (median, steps) and can log each cut."""
    if len(a) > len(b):
        a, b = b, a
    m, n = len(a), len(b)
    half = (m + n + 1) // 2
    lo, hi, steps = 0, m, 0
    while lo <= hi:
        i = (lo + hi) // 2
        j = half - i
        steps += 1
        a_left = a[i - 1] if i > 0 else -INF
        a_right = a[i] if i < m else INF
        b_left = b[j - 1] if j > 0 else -INF
        b_right = b[j] if j < n else INF
        ok = a_left <= b_right and b_left <= a_right
        if log is not None:
            verdict = "valid" if ok else ("too many from A" if a_left > b_right else "too few from A")
            log.append(f"step {steps}: i={i} j={j} | A left {a_left} right {a_right} | "
                       f"B left {b_left} right {b_right} -> {verdict}")
        if ok:
            if (m + n) % 2 == 1:
                return float(max(a_left, b_left)), steps
            return (max(a_left, b_left) + min(a_right, b_right)) / 2, steps
        if a_left > b_right:
            hi = i - 1
        else:
            lo = i + 1
    raise ValueError("inputs must be sorted")


def median_by_merge(a, b):
    """Brute force: merge the two lists (O(m+n)) and read the middle."""
    merged, i, j = [], 0, 0
    while i < len(a) or j < len(b):
        if j == len(b) or (i < len(a) and a[i] <= b[j]):
            merged.append(a[i]); i += 1
        else:
            merged.append(b[j]); j += 1
    k = len(merged)
    if k % 2 == 1:
        return float(merged[k // 2])
    return (merged[k // 2 - 1] + merged[k // 2]) / 2


# 1) Trace one search
log = []
med, _ = median_traced([1, 3, 8, 9, 15], [7, 11, 18, 19, 21, 25], log)
for line in log:
    print(line)
print(f"median {med:.1f}")

# 2) 500 random tests against the merge, with a tiny portable random generator
seed = 12345
def rand(k):
    global seed
    seed = seed * 48271 % 2147483647      # MINSTD: same numbers in every language
    return seed % k

all_match, max_steps = True, 0
for _ in range(500):
    m, n = rand(9), rand(9)
    if m + n == 0:
        n = 1
    a = sorted(rand(21) for _ in range(m))
    b = sorted(rand(21) for _ in range(n))
    got, steps = median_traced(a, b)
    all_match = all_match and got == median_by_merge(a, b)
    max_steps = max(max_steps, steps)
print("500 random tests match the merge:", str(all_match).lower())
print("most partition steps in one test:", max_steps)` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You have two sorted arrays of numbers, of lengths m and n. Return the median of all the numbers together. A merge is O(m + n); I would like O(log(min(m, n))). Please write it in JavaScript and explain the partition idea."

**What a strong answer should cover:**
- The merge baseline in O(m + n), then the observation that choosing a cut \`i\` in one array forces \`j = half - i\` in the other.
- The validity test \`A[i-1] <= B[j]\` and \`B[j-1] <= A[i]\`, with \`-Infinity\` / \`Infinity\` at the edges, and how each failure says which way to move.
- Binary search on \`i\` over the **shorter** array: O(log(min(m, n))) time, O(1) space, and why it keeps \`j\` in range.
- Reading the median for odd and even totals.
- JavaScript specifics: \`Infinity\` is a real number value, \`Math.floor\` for \`half\` and \`mid\`, out-of-range reads give \`undefined\` (which would break comparisons silently), and sorting test data needs a numeric comparator.

**Clarifying questions expected:**
- "Can either array be empty?"
- "For an even total, do you want the average of the two middle values?"

**Code / implementation expected:** Yes — \`findMedianSortedArrays(a, b)\` in JavaScript using the partition binary search.`,
        answer: `**Target Audience:** Intermediate interview candidates — you should know binary search and what a sorted array is; every other idea is explained here.
**Difficulty:** Hard
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the JavaScript programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

Two schools line up their students by height for a joint photo — each line is already sorted, shortest to tallest. The photographer wants the **middle** height of all the students together.

The obvious way: merge the two lines into one long sorted line and walk to the middle. That works, but if the lines are a million students long, you walk past half a million people.

The clever way: the photographer does not need the merged line, only a **dividing point**. Imagine drawing one chalk mark in each line so that, together, the students left of the two marks are exactly half of everyone, and every one of them is no taller than anyone right of the marks. Then the middle height is sitting right at the chalk marks — the tallest person on the left or (for an even count) the average of that and the shortest person on the right.

Here is the trick: once you choose where the mark goes in line A, the mark in line B is **forced** (the left side must hold exactly half of everyone). So you only need to *search for one mark* — and you can binary search it in the shorter line. That is how a problem that looks like it needs a merge is solved in O(log(min(m, n))).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| "Are both arrays sorted ascending?" | The partition rule depends on it; unsorted input needs sorting first. |
| "Can one array be empty? Both?" | One empty array is normal and must work; both empty has no median — decide whether to throw. |
| "For an even total, the average of the two middle values?" | That is the usual definition, and it means the answer may be a fraction like 2.5. |
| "What number type, and how large can values be?" | Adding the two middle values can overflow a 32-bit integer in Java and C++. |
| "Is O(m + n) acceptable, or do you need the logarithmic version?" | The merge is a valid first answer; the follow-up is almost always the partition trick. |

## 3. The Median, and the Brute Force

📌 **Interview term: Median** — the middle value of a sorted list. With an odd count it is the single middle element; with an even count it is the average of the two middle elements. \`[1, 2, 3]\` has median 2; \`[1, 2, 3, 4]\` has median 2.5.

The straightforward answer is to merge the two sorted arrays (the same step as in merge sort — see [How do you merge two sorted arrays?](/interview-question/how-do-you-merge-two-sorted-arrays)) and read the middle. Example 2 uses that merge as its reference answer.

📌 **Interview term: Merge step** — walking two sorted lists with one pointer each, always taking the smaller head, to produce one sorted list in O(m + n).

You can avoid building the merged array by stopping the two pointers at the middle, which saves memory but is still O(m + n) time. To get to O(log(min(m, n))), we have to stop thinking about *merging* and start thinking about *cutting*.

## 4. The Partition Idea

Let \`m = len(A)\`, \`n = len(B)\` and \`half = (m + n + 1) / 2\` (integer division; for an odd total the left side gets the extra element).

Cut A after its first \`i\` elements and B after its first \`j\` elements, with \`i + j = half\`. The left halves of both arrays together form the "left side"; everything else is the "right side".

📌 **Interview term: Partition (cut)** — a split of each array into a left part and a right part. Choosing \`i\` fixes \`j = half - i\`, so there is really only **one** number to choose.

The cut is correct exactly when every value on the left is less than or equal to every value on the right. Inside each array that is automatic (it is sorted), so only the two **cross** comparisons need checking:

- \`A[i-1] <= B[j]\` — the biggest of A on the left is not bigger than the smallest of B on the right.
- \`B[j-1] <= A[i]\` — the biggest of B on the left is not bigger than the smallest of A on the right.

When a cut has nothing on one side (\`i = 0\`, \`i = m\`, \`j = 0\` or \`j = n\`), the missing neighbour is replaced by minus or plus infinity so the comparison always passes.

📌 **Interview term: Sentinel** — a stand-in value (here minus or plus infinity) used at the edges so the same comparison code works without special cases.

Once the cut is valid, the answer is right at the cut:

- odd total: median = \`max(A[i-1], B[j-1])\`, the biggest value on the left;
- even total: median = \`(max(A[i-1], B[j-1]) + min(A[i], B[j])) / 2\`.

## 5. Why Binary Search Finds the Cut

If a cut fails, it tells you **which way to move**:

<svg class="iq-diagram" width="100%" viewBox="0 0 740 262" role="img" aria-label="Decision rule for one cut. If A left is bigger than B right, move i left. If B left is bigger than A right, move i right. Otherwise the cut is valid">
  <defs>
    <marker id="b04q3-r-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="180" y="20" width="380" height="60" rx="10"/>
  <text class="d-text" x="370" y="46" text-anchor="middle">pick i in the shorter array A</text>
  <text class="d-sub" x="370" y="68" text-anchor="middle">j = half - i</text>
  <path class="d-edge" d="M 260 84 L 130 140" marker-end="url(#b04q3-r-javascript)"/>
  <path class="d-edge" d="M 370 84 L 370 140" marker-end="url(#b04q3-r-javascript)"/>
  <path class="d-edge" d="M 480 84 L 610 140" marker-end="url(#b04q3-r-javascript)"/>
  <rect class="d-box" x="20" y="146" width="220" height="96" rx="10"/>
  <text class="d-text" x="130" y="176" text-anchor="middle">A left &gt; B right</text>
  <text class="d-sub" x="130" y="202" text-anchor="middle">too many from A</text>
  <text class="d-sub" x="130" y="226" text-anchor="middle">hi = i - 1</text>
  <rect class="d-box-accent" x="260" y="146" width="220" height="96" rx="10"/>
  <text class="d-text d-accent" x="370" y="176" text-anchor="middle">both checks pass</text>
  <text class="d-sub" x="370" y="202" text-anchor="middle">the cut is valid</text>
  <text class="d-sub" x="370" y="226" text-anchor="middle">read the median</text>
  <rect class="d-box" x="500" y="146" width="220" height="96" rx="10"/>
  <text class="d-text" x="610" y="176" text-anchor="middle">B left &gt; A right</text>
  <text class="d-sub" x="610" y="202" text-anchor="middle">too few from A</text>
  <text class="d-sub" x="610" y="226" text-anchor="middle">lo = i + 1</text>
</svg>

- \`A[i-1] > B[j]\` means A put a too-big value on the left: we took **too many** from A, so the right \`i\` is smaller.
- \`B[j-1] > A[i]\` means B put a too-big value on the left, so we took **too few** from A and the right \`i\` is larger.

That one-directional answer is exactly what binary search needs. Search \`i\` over \`0 .. m\`; each test halves the range.

📌 **Interview term: Binary search on the partition** — binary searching the cut position \`i\` (not a value) and using the two cross comparisons to decide the direction. The basics of binary search are in [How does binary search work and what are its requirements?](/interview-question/how-does-binary-search-work-and-what-are-its-requirements)

**Why search the shorter array?** Two reasons. First, cost: the range \`0 .. m\` has \`m + 1\` positions, so the search takes O(log(min(m, n))) steps if A is the shorter one. Second, safety: with \`m <= n\`, every \`i\` in \`0 .. m\` gives \`j = half - i\` between \`0\` and \`n\`, so \`j\` never goes out of bounds. Searching the longer array can produce a negative \`j\`.

### The trace on our example

\`A = [1, 3, 8, 9, 15]\` (m = 5), \`B = [7, 11, 18, 19, 21, 25]\` (n = 6), total 11, \`half = 6\`. The search starts with \`lo = 0\`, \`hi = 5\`.

**Step 1:** \`i = 2\`, so \`j = 4\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 306" role="img" aria-label="Cut of A at 2 and B at 4. Result: too few from A">
  <defs>
    <marker id="b04q3-s1-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="66" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="80" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="107.0" y="65.0" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="142" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="169.0" y="65.0" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="204" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="231.0" y="65.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="266" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="293.0" y="65.0" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="328" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="355.0" y="65.0" text-anchor="middle">15</text>
  <path class="d-edge-dashed" d="M 200.0 30 L 200.0 90"/>
  <text class="d-text" x="40" y="156" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="80" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="107.0" y="155.0" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="142" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="169.0" y="155.0" text-anchor="middle">11</text>
  <rect class="d-box-accent" x="204" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="231.0" y="155.0" text-anchor="middle">18</text>
  <rect class="d-box-accent" x="266" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="293.0" y="155.0" text-anchor="middle">19</text>
  <rect class="d-box-muted" x="328" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="355.0" y="155.0" text-anchor="middle">21</text>
  <rect class="d-box-muted" x="390" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="417.0" y="155.0" text-anchor="middle">25</text>
  <path class="d-edge-dashed" d="M 324.0 120 L 324.0 180"/>
  <text class="d-sub" x="600" y="66" text-anchor="middle">cut A at i = 2</text>
  <text class="d-sub" x="600" y="156" text-anchor="middle">cut B at j = 4</text>
  <rect class="d-box" x="80" y="210" width="290" height="76" rx="8"/>
  <text class="d-sub" x="225" y="240" text-anchor="middle">A left 3 vs B right 21</text>
  <text class="d-sub" x="225" y="268" text-anchor="middle">B left 19 vs A right 8</text>
  <rect class="d-box-muted" x="420" y="210" width="300" height="76" rx="8"/>
  <text class="d-text" x="570" y="240" text-anchor="middle">too few from A</text>
  <text class="d-sub" x="570" y="268" text-anchor="middle">B left 19 &gt; A right 8, so lo = 3</text>
</svg>

**Step 2:** \`lo = 3\`, \`hi = 5\`, so \`i = 4\` and \`j = 2\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 306" role="img" aria-label="Cut of A at 4 and B at 2. Result: valid cut">
  <defs>
    <marker id="b04q3-s2-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="66" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="80" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="107.0" y="65.0" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="142" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="169.0" y="65.0" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="204" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="231.0" y="65.0" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="266" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="293.0" y="65.0" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="328" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="355.0" y="65.0" text-anchor="middle">15</text>
  <path class="d-edge-dashed" d="M 324.0 30 L 324.0 90"/>
  <text class="d-text" x="40" y="156" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="80" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="107.0" y="155.0" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="142" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="169.0" y="155.0" text-anchor="middle">11</text>
  <rect class="d-box-muted" x="204" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="231.0" y="155.0" text-anchor="middle">18</text>
  <rect class="d-box-muted" x="266" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="293.0" y="155.0" text-anchor="middle">19</text>
  <rect class="d-box-muted" x="328" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="355.0" y="155.0" text-anchor="middle">21</text>
  <rect class="d-box-muted" x="390" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="417.0" y="155.0" text-anchor="middle">25</text>
  <path class="d-edge-dashed" d="M 200.0 120 L 200.0 180"/>
  <text class="d-sub" x="600" y="66" text-anchor="middle">cut A at i = 4</text>
  <text class="d-sub" x="600" y="156" text-anchor="middle">cut B at j = 2</text>
  <rect class="d-box" x="80" y="210" width="290" height="76" rx="8"/>
  <text class="d-sub" x="225" y="240" text-anchor="middle">A left 9 vs B right 18</text>
  <text class="d-sub" x="225" y="268" text-anchor="middle">B left 11 vs A right 15</text>
  <rect class="d-box-accent" x="420" y="210" width="300" height="76" rx="8"/>
  <text class="d-text" x="570" y="240" text-anchor="middle">valid cut</text>
  <text class="d-sub" x="570" y="268" text-anchor="middle">median = max(9, 11) = 11</text>
</svg>

The left side holds \`1, 3, 8, 9, 7, 11\` — six values, all no bigger than \`15, 18, 19, 21, 25\`. The total is odd, so the median is the biggest left value, 11. Two steps; the merge would have walked six elements to get there. Example 2 prints exactly this trace.

> **Key insight:** you are not looking for a *value*, you are looking for a *position*. The rule "too many from A / too few from A" is monotonic in \`i\`, and anything monotonic can be binary searched.

## 6. The JavaScript Solution, Line by Line

~~~javascript
function findMedianSortedArrays(a, b) {
  if (a.length > b.length) { const t = a; a = b; b = t; }  // binary search over the SHORTER array
  const m = a.length, n = b.length;
  const half = Math.floor((m + n + 1) / 2);  // size of the left half (gets the extra one if odd)
  let lo = 0, hi = m;                        // i = how many elements of a go left: 0..m
  while (lo <= hi) {
    const i = Math.floor((lo + hi) / 2);
    const j = half - i;                      // the rest of the left half comes from b
    const aLeft = i > 0 ? a[i - 1] : -Infinity;
    const aRight = i < m ? a[i] : Infinity;
    const bLeft = j > 0 ? b[j - 1] : -Infinity;
    const bRight = j < n ? b[j] : Infinity;
    if (aLeft <= bRight && bLeft <= aRight) {          // every left <= every right
      if ((m + n) % 2 === 1) return Math.max(aLeft, bLeft);
      return (Math.max(aLeft, bLeft) + Math.min(aRight, bRight)) / 2;
    }
    if (aLeft > bRight) hi = i - 1;          // took too many from a
    else lo = i + 1;                         // took too few from a
  }
  throw new Error('inputs must be sorted');
}
~~~

- The swap uses a temporary variable; \`[a, b] = [b, a]\` also works but allocates a small array.
- \`Math.floor((m + n + 1) / 2)\` — without \`Math.floor\`, \`half\` would be \`5.5\` for a total of 10 and every index after it would be fractional.
- \`-Infinity\` and \`Infinity\` are ordinary number values, so \`Math.max(-Infinity, 3)\` is \`3\` and the comparisons need no special cases.
- Reading \`a[i - 1]\` with \`i = 0\` would give \`undefined\`, and both \`undefined <= x\` and \`x <= undefined\` are \`false\` — that is why the ternaries choose the sentinel instead of reading out of range.
- The function returns a number such as \`2.5\`; \`x.toFixed(1)\` in the demo makes \`2\` print as \`2.0\`, matching the other languages.

## 7. JavaScript Details That Matter

- **Number precision.** Every number is a 64-bit float, exact for integers up to \`Number.MAX_SAFE_INTEGER\` (9007199254740991). Beyond that, \`2**53 + 1\` printed \`9007199254740992\` in our run — so for huge values the average can be off by one unit. Use \`BigInt\` (and do the averaging yourself) if inputs can be that large.
- **Sorting test data.** Example 2 sorts the random arrays with \`(p, q) => p - q\`. The default \`sort()\` converts to strings: \`[10, 9, 1, 100].sort()\` printed \`[1,10,100,9]\`.
- **A portable random generator.** \`Math.random()\` cannot be seeded, so the tests use MINSTD (\`seed * 48271 % 2147483647\`). The product stays below 2^53, so it is exact in a double and gives the same sequence as the Python, Java and C++ versions.
- **\`concat\` + \`sort\` brute force.** \`[...a, ...b].sort((x, y) => x - y)\` is O((m + n) log(m + n)) — fine as a check, not as the answer.

## 8. Verified: Running the Code

Every program below was saved as \`main.js\` and run with \`node main.js\` (Node.js v22.22.0). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — The partition search on eight inputs, including empty and negative arrays**

~~~text
2.0
2.5
1.0
2.0
0.0
11.0
-2.5
6.0
~~~

**Example 2 — Trace of the cuts, plus 500 random tests against the merge**

~~~text
step 1: i=2 j=4 | A left 3 right 8 | B left 19 right 21 -> too few from A
step 2: i=4 j=2 | A left 9 right 15 | B left 11 right 18 -> valid
median 11.0
500 random tests match the merge: true
most partition steps in one test: 4
~~~

The 500 random tests used array lengths 0 to 8 and values 0 to 20 from a small portable random generator, so every language tested exactly the same arrays. The partition search agreed with the merge on all of them and never needed more than 4 steps.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Concatenate and sort | O((m+n) log(m+n)) | O(m + n) | Sorts everything |
| Merge, then read the middle | O(m + n) | O(m + n) | Builds the merged array |
| Two pointers to the middle | O(m + n) | O(1) | Walks half of both arrays |
| Partition binary search | O(log(min(m, n))) | O(1) | Halves the \`0 .. m\` range per step: at most 4 steps in the 500 random tests |

## 10. Edge Cases

- **One array empty** — \`[]\` and \`[1]\`: after the swap A is empty, \`lo = hi = 0\`, \`i = 0\`, \`j = 1\`, the sentinels make the cut valid, and the median is \`1.0\`.
- **All of A smaller than all of B** — \`[1..10]\` and \`[11]\`: A is the longer one, so the arrays are swapped and we binary search \`[11]\`. The median is \`6.0\`.
- **Duplicates** — \`[0, 0]\` and \`[0, 0]\`: the conditions use \`<=\`, so equal values on both sides of the cut are fine; median \`0.0\`.
- **Negative numbers** — \`[-5, -3, -1]\` and \`[-2]\`: nothing special; median \`-2.5\`.
- **Both empty** — no median; the code should throw or return a defined error value (ours throws only if inputs are not sorted, so guard this case explicitly if it can happen).
- **Unsorted input** — the search never finds a valid cut; our function raises an error at the end of the loop instead of returning nonsense.

## 11. Common Pitfalls

- **Binary searching the longer array.** \`j\` can go negative; \`b[-1]\` is \`undefined\`, and comparisons with it are always \`false\`, so the loop may never find a valid cut.
- **Forgetting \`Math.floor\`.** Fractional indices read \`undefined\` instead of throwing.
- **Getting \`half\` wrong.** \`(m + n) / 2\` puts the odd-case median on the right side.
- **Sorting with the default comparator** when preparing inputs — \`[10, 9]\` sorts as \`[10, 9]\`.
- **Assuming exact integers above 2^53.** The average of two huge values can be rounded.
- **Using \`Math.random()\` in tests you want to reproduce.** It has no seed; write a tiny generator.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;">Merging gives the median in O(m + n). To do better I look for a <strong style="color:#ffca28;">cut</strong> instead of merging.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The cut:</strong> <span style="color:#f0e2c8;">Cut A at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> and B at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j = half - i</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">half = Math.floor((m + n + 1) / 2)</code>. Valid when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A[i-1] &lt;= B[j]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B[j-1] &lt;= A[i]</code>, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-Infinity</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Infinity</code> at the edges.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Binary search:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A[i-1] &gt; B[j]</code>, too many from A, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = i - 1</code>; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = i + 1</code>. Search the shorter array: O(log(min(m, n))).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The answer:</strong> <span style="color:#f0e2c8;">Odd total: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max(aLeft, bLeft)</code>. Even: average that with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min(aRight, bRight)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript notes:</strong> <span style="color:#f0e2c8;">Floor every division, never read out of range (it gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> silently), and sort test data numerically; I checked it against a merge on 500 random cases.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must A be the shorter array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 .. m</code> keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 .. n</code>, and the cost is O(log(min(m, n))). On the longer array <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> can go negative and reads become <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">-Infinity</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Infinity</code> safe here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They are real numbers in JavaScript: every finite value is between them, so the edge checks always pass and they are never used as the answer when a cut is valid.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find the kth smallest of two sorted arrays?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same partition with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">half</code> replaced by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>, or the recursion that discards <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.floor(k / 2)</code> elements per step — O(log k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about very large integers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Above 2^53 doubles lose precision (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2**53 + 1</code> printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">9007199254740992</code>); switch to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> and compute the average explicitly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare with a merge on many random sorted inputs, including empty arrays, using a seeded generator — Example 2 runs 500 cases.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Median** | Middle value of a sorted list; average of the two middle values for an even count |
| **Merge step** | Two pointers produce one sorted list from two in O(m + n) |
| **Partition (cut)** | Splitting each array at i and j with i + j = half |
| **Sentinel** | Minus or plus infinity at the edges so comparisons need no special cases |
| **Binary search on the partition** | Binary searching the cut position i using the cross comparisons |

---
**Conclusion:** The median of two sorted arrays does not need a merge: choose how many elements of the shorter array go left, let that force the cut in the other, and binary search the choice with the two cross comparisons. In JavaScript, \`-Infinity\` and \`Infinity\` make perfect sentinels, \`Math.floor\` keeps indices whole, and avoiding out-of-range reads matters because they return \`undefined\` instead of failing. The seeded 500-case test against a merge shows the method agrees every time and needs only a handful of steps.
`,
        examples: [
          { label: "The partition search on eight inputs, including empty and negative arrays", code: `function findMedianSortedArrays(a, b) {
  if (a.length > b.length) { const t = a; a = b; b = t; }  // binary search over the SHORTER array
  const m = a.length, n = b.length;
  const half = Math.floor((m + n + 1) / 2);  // size of the left half (gets the extra one if odd)
  let lo = 0, hi = m;                        // i = how many elements of a go left: 0..m
  while (lo <= hi) {
    const i = Math.floor((lo + hi) / 2);
    const j = half - i;                      // the rest of the left half comes from b
    const aLeft = i > 0 ? a[i - 1] : -Infinity;
    const aRight = i < m ? a[i] : Infinity;
    const bLeft = j > 0 ? b[j - 1] : -Infinity;
    const bRight = j < n ? b[j] : Infinity;
    if (aLeft <= bRight && bLeft <= aRight) {          // every left <= every right
      if ((m + n) % 2 === 1) return Math.max(aLeft, bLeft);
      return (Math.max(aLeft, bLeft) + Math.min(aRight, bRight)) / 2;
    }
    if (aLeft > bRight) hi = i - 1;          // took too many from a
    else lo = i + 1;                         // took too few from a
  }
  throw new Error('inputs must be sorted');
}

function fmt(x) {
  return x.toFixed(1);
}

console.log(fmt(findMedianSortedArrays([1, 3], [2])));                            // 2.0
console.log(fmt(findMedianSortedArrays([1, 2], [3, 4])));                         // 2.5
console.log(fmt(findMedianSortedArrays([], [1])));                                // 1.0
console.log(fmt(findMedianSortedArrays([2], [])));                                // 2.0
console.log(fmt(findMedianSortedArrays([0, 0], [0, 0])));                         // 0.0
console.log(fmt(findMedianSortedArrays([1, 3, 8, 9, 15], [7, 11, 18, 19, 21, 25]))); // 11.0
console.log(fmt(findMedianSortedArrays([-5, -3, -1], [-2])));                     // -2.5
console.log(fmt(findMedianSortedArrays([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [11])));  // 6.0` },
          { label: "Trace of the cuts, plus 500 random tests against the merge", code: `// Same partition search as example 1, but returns [median, steps] and can log each cut.
function medianTraced(a, b, log) {
  if (a.length > b.length) { const t = a; a = b; b = t; }
  const m = a.length, n = b.length;
  const half = Math.floor((m + n + 1) / 2);
  let lo = 0, hi = m, steps = 0;
  while (lo <= hi) {
    const i = Math.floor((lo + hi) / 2);
    const j = half - i;
    steps++;
    const aLeft = i > 0 ? a[i - 1] : -Infinity;
    const aRight = i < m ? a[i] : Infinity;
    const bLeft = j > 0 ? b[j - 1] : -Infinity;
    const bRight = j < n ? b[j] : Infinity;
    const ok = aLeft <= bRight && bLeft <= aRight;
    if (log) {
      const verdict = ok ? 'valid' : (aLeft > bRight ? 'too many from A' : 'too few from A');
      log.push('step ' + steps + ': i=' + i + ' j=' + j + ' | A left ' + aLeft + ' right ' + aRight +
               ' | B left ' + bLeft + ' right ' + bRight + ' -> ' + verdict);
    }
    if (ok) {
      if ((m + n) % 2 === 1) return [Math.max(aLeft, bLeft), steps];
      return [(Math.max(aLeft, bLeft) + Math.min(aRight, bRight)) / 2, steps];
    }
    if (aLeft > bRight) hi = i - 1;
    else lo = i + 1;
  }
  throw new Error('inputs must be sorted');
}

// Brute force: merge the two arrays (O(m+n)) and read the middle.
function medianByMerge(a, b) {
  const merged = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (j === b.length || (i < a.length && a[i] <= b[j])) merged.push(a[i++]);
    else merged.push(b[j++]);
  }
  const k = merged.length;
  if (k % 2 === 1) return merged[(k - 1) / 2];
  return (merged[k / 2 - 1] + merged[k / 2]) / 2;
}

// 1) Trace one search
const log = [];
const med = medianTraced([1, 3, 8, 9, 15], [7, 11, 18, 19, 21, 25], log)[0];
for (const line of log) console.log(line);
console.log('median ' + med.toFixed(1));

// 2) 500 random tests against the merge, with a tiny portable random generator
let seed = 12345;
function rand(k) {
  seed = (seed * 48271) % 2147483647;   // MINSTD: products stay below 2^53, so exact in a double
  return seed % k;
}

let allMatch = true, maxSteps = 0;
for (let t = 0; t < 500; t++) {
  const m = rand(9);
  let n = rand(9);
  if (m + n === 0) n = 1;
  const a = [], b = [];
  for (let x = 0; x < m; x++) a.push(rand(21));
  for (let x = 0; x < n; x++) b.push(rand(21));
  a.sort((p, q) => p - q);              // numeric sort: the default compares as strings
  b.sort((p, q) => p - q);
  const [got, steps] = medianTraced(a, b);
  allMatch = allMatch && got === medianByMerge(a, b);
  maxSteps = Math.max(maxSteps, steps);
}
console.log('500 random tests match the merge: ' + allMatch);
console.log('most partition steps in one test: ' + maxSteps);` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You have two sorted \`int\` arrays, of lengths m and n. Return the median of all the numbers together as a \`double\`. A merge is O(m + n); I would like O(log(min(m, n))). Please write it in Java and explain the partition idea."

**What a strong answer should cover:**
- The merge baseline in O(m + n), then the observation that choosing a cut \`i\` in one array forces \`j = half - i\` in the other.
- The validity test \`A[i-1] <= B[j]\` and \`B[j-1] <= A[i]\`, with sentinels at the edges, and how each failure says which way to move.
- Binary search on \`i\` over the **shorter** array: O(log(min(m, n))) time, O(1) space.
- Reading the median for odd and even totals.
- Java specifics: \`Integer.MIN_VALUE\` sentinels collide with real values (use \`long\`), \`a + b\` overflows \`int\` before \`/ 2.0\` converts it, \`(a + b) / 2\` is integer division, and \`String.format\` follows the default locale.

**Clarifying questions expected:**
- "Can either array be empty?"
- "For an even total, the average of the two middle values, as a \`double\`?"

**Code / implementation expected:** Yes — \`static double findMedianSortedArrays(int[] a, int[] b)\` in Java.`,
        answer: `**Target Audience:** Intermediate interview candidates — you should know binary search and what a sorted array is; every other idea is explained here.
**Difficulty:** Hard
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the Java programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

Two schools line up their students by height for a joint photo — each line is already sorted, shortest to tallest. The photographer wants the **middle** height of all the students together.

The obvious way: merge the two lines into one long sorted line and walk to the middle. That works, but if the lines are a million students long, you walk past half a million people.

The clever way: the photographer does not need the merged line, only a **dividing point**. Imagine drawing one chalk mark in each line so that, together, the students left of the two marks are exactly half of everyone, and every one of them is no taller than anyone right of the marks. Then the middle height is sitting right at the chalk marks — the tallest person on the left or (for an even count) the average of that and the shortest person on the right.

Here is the trick: once you choose where the mark goes in line A, the mark in line B is **forced** (the left side must hold exactly half of everyone). So you only need to *search for one mark* — and you can binary search it in the shorter line. That is how a problem that looks like it needs a merge is solved in O(log(min(m, n))).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| "Are both arrays sorted ascending?" | The partition rule depends on it; unsorted input needs sorting first. |
| "Can one array be empty? Both?" | One empty array is normal and must work; both empty has no median — decide whether to throw. |
| "For an even total, the average of the two middle values?" | That is the usual definition, and it means the answer may be a fraction like 2.5. |
| "What number type, and how large can values be?" | Adding the two middle values can overflow a 32-bit integer in Java and C++. |
| "Is O(m + n) acceptable, or do you need the logarithmic version?" | The merge is a valid first answer; the follow-up is almost always the partition trick. |

## 3. The Median, and the Brute Force

📌 **Interview term: Median** — the middle value of a sorted list. With an odd count it is the single middle element; with an even count it is the average of the two middle elements. \`[1, 2, 3]\` has median 2; \`[1, 2, 3, 4]\` has median 2.5.

The straightforward answer is to merge the two sorted arrays (the same step as in merge sort — see [How do you merge two sorted arrays?](/interview-question/how-do-you-merge-two-sorted-arrays)) and read the middle. Example 2 uses that merge as its reference answer.

📌 **Interview term: Merge step** — walking two sorted lists with one pointer each, always taking the smaller head, to produce one sorted list in O(m + n).

You can avoid building the merged array by stopping the two pointers at the middle, which saves memory but is still O(m + n) time. To get to O(log(min(m, n))), we have to stop thinking about *merging* and start thinking about *cutting*.

## 4. The Partition Idea

Let \`m = len(A)\`, \`n = len(B)\` and \`half = (m + n + 1) / 2\` (integer division; for an odd total the left side gets the extra element).

Cut A after its first \`i\` elements and B after its first \`j\` elements, with \`i + j = half\`. The left halves of both arrays together form the "left side"; everything else is the "right side".

📌 **Interview term: Partition (cut)** — a split of each array into a left part and a right part. Choosing \`i\` fixes \`j = half - i\`, so there is really only **one** number to choose.

The cut is correct exactly when every value on the left is less than or equal to every value on the right. Inside each array that is automatic (it is sorted), so only the two **cross** comparisons need checking:

- \`A[i-1] <= B[j]\` — the biggest of A on the left is not bigger than the smallest of B on the right.
- \`B[j-1] <= A[i]\` — the biggest of B on the left is not bigger than the smallest of A on the right.

When a cut has nothing on one side (\`i = 0\`, \`i = m\`, \`j = 0\` or \`j = n\`), the missing neighbour is replaced by minus or plus infinity so the comparison always passes.

📌 **Interview term: Sentinel** — a stand-in value (here minus or plus infinity) used at the edges so the same comparison code works without special cases.

Once the cut is valid, the answer is right at the cut:

- odd total: median = \`max(A[i-1], B[j-1])\`, the biggest value on the left;
- even total: median = \`(max(A[i-1], B[j-1]) + min(A[i], B[j])) / 2\`.

## 5. Why Binary Search Finds the Cut

If a cut fails, it tells you **which way to move**:

<svg class="iq-diagram" width="100%" viewBox="0 0 740 262" role="img" aria-label="Decision rule for one cut. If A left is bigger than B right, move i left. If B left is bigger than A right, move i right. Otherwise the cut is valid">
  <defs>
    <marker id="b04q3-r-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="180" y="20" width="380" height="60" rx="10"/>
  <text class="d-text" x="370" y="46" text-anchor="middle">pick i in the shorter array A</text>
  <text class="d-sub" x="370" y="68" text-anchor="middle">j = half - i</text>
  <path class="d-edge" d="M 260 84 L 130 140" marker-end="url(#b04q3-r-java)"/>
  <path class="d-edge" d="M 370 84 L 370 140" marker-end="url(#b04q3-r-java)"/>
  <path class="d-edge" d="M 480 84 L 610 140" marker-end="url(#b04q3-r-java)"/>
  <rect class="d-box" x="20" y="146" width="220" height="96" rx="10"/>
  <text class="d-text" x="130" y="176" text-anchor="middle">A left &gt; B right</text>
  <text class="d-sub" x="130" y="202" text-anchor="middle">too many from A</text>
  <text class="d-sub" x="130" y="226" text-anchor="middle">hi = i - 1</text>
  <rect class="d-box-accent" x="260" y="146" width="220" height="96" rx="10"/>
  <text class="d-text d-accent" x="370" y="176" text-anchor="middle">both checks pass</text>
  <text class="d-sub" x="370" y="202" text-anchor="middle">the cut is valid</text>
  <text class="d-sub" x="370" y="226" text-anchor="middle">read the median</text>
  <rect class="d-box" x="500" y="146" width="220" height="96" rx="10"/>
  <text class="d-text" x="610" y="176" text-anchor="middle">B left &gt; A right</text>
  <text class="d-sub" x="610" y="202" text-anchor="middle">too few from A</text>
  <text class="d-sub" x="610" y="226" text-anchor="middle">lo = i + 1</text>
</svg>

- \`A[i-1] > B[j]\` means A put a too-big value on the left: we took **too many** from A, so the right \`i\` is smaller.
- \`B[j-1] > A[i]\` means B put a too-big value on the left, so we took **too few** from A and the right \`i\` is larger.

That one-directional answer is exactly what binary search needs. Search \`i\` over \`0 .. m\`; each test halves the range.

📌 **Interview term: Binary search on the partition** — binary searching the cut position \`i\` (not a value) and using the two cross comparisons to decide the direction. The basics of binary search are in [How does binary search work and what are its requirements?](/interview-question/how-does-binary-search-work-and-what-are-its-requirements)

**Why search the shorter array?** Two reasons. First, cost: the range \`0 .. m\` has \`m + 1\` positions, so the search takes O(log(min(m, n))) steps if A is the shorter one. Second, safety: with \`m <= n\`, every \`i\` in \`0 .. m\` gives \`j = half - i\` between \`0\` and \`n\`, so \`j\` never goes out of bounds. Searching the longer array can produce a negative \`j\`.

### The trace on our example

\`A = [1, 3, 8, 9, 15]\` (m = 5), \`B = [7, 11, 18, 19, 21, 25]\` (n = 6), total 11, \`half = 6\`. The search starts with \`lo = 0\`, \`hi = 5\`.

**Step 1:** \`i = 2\`, so \`j = 4\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 306" role="img" aria-label="Cut of A at 2 and B at 4. Result: too few from A">
  <defs>
    <marker id="b04q3-s1-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="66" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="80" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="107.0" y="65.0" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="142" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="169.0" y="65.0" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="204" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="231.0" y="65.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="266" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="293.0" y="65.0" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="328" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="355.0" y="65.0" text-anchor="middle">15</text>
  <path class="d-edge-dashed" d="M 200.0 30 L 200.0 90"/>
  <text class="d-text" x="40" y="156" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="80" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="107.0" y="155.0" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="142" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="169.0" y="155.0" text-anchor="middle">11</text>
  <rect class="d-box-accent" x="204" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="231.0" y="155.0" text-anchor="middle">18</text>
  <rect class="d-box-accent" x="266" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="293.0" y="155.0" text-anchor="middle">19</text>
  <rect class="d-box-muted" x="328" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="355.0" y="155.0" text-anchor="middle">21</text>
  <rect class="d-box-muted" x="390" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="417.0" y="155.0" text-anchor="middle">25</text>
  <path class="d-edge-dashed" d="M 324.0 120 L 324.0 180"/>
  <text class="d-sub" x="600" y="66" text-anchor="middle">cut A at i = 2</text>
  <text class="d-sub" x="600" y="156" text-anchor="middle">cut B at j = 4</text>
  <rect class="d-box" x="80" y="210" width="290" height="76" rx="8"/>
  <text class="d-sub" x="225" y="240" text-anchor="middle">A left 3 vs B right 21</text>
  <text class="d-sub" x="225" y="268" text-anchor="middle">B left 19 vs A right 8</text>
  <rect class="d-box-muted" x="420" y="210" width="300" height="76" rx="8"/>
  <text class="d-text" x="570" y="240" text-anchor="middle">too few from A</text>
  <text class="d-sub" x="570" y="268" text-anchor="middle">B left 19 &gt; A right 8, so lo = 3</text>
</svg>

**Step 2:** \`lo = 3\`, \`hi = 5\`, so \`i = 4\` and \`j = 2\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 306" role="img" aria-label="Cut of A at 4 and B at 2. Result: valid cut">
  <defs>
    <marker id="b04q3-s2-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="66" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="80" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="107.0" y="65.0" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="142" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="169.0" y="65.0" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="204" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="231.0" y="65.0" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="266" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="293.0" y="65.0" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="328" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="355.0" y="65.0" text-anchor="middle">15</text>
  <path class="d-edge-dashed" d="M 324.0 30 L 324.0 90"/>
  <text class="d-text" x="40" y="156" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="80" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="107.0" y="155.0" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="142" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="169.0" y="155.0" text-anchor="middle">11</text>
  <rect class="d-box-muted" x="204" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="231.0" y="155.0" text-anchor="middle">18</text>
  <rect class="d-box-muted" x="266" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="293.0" y="155.0" text-anchor="middle">19</text>
  <rect class="d-box-muted" x="328" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="355.0" y="155.0" text-anchor="middle">21</text>
  <rect class="d-box-muted" x="390" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="417.0" y="155.0" text-anchor="middle">25</text>
  <path class="d-edge-dashed" d="M 200.0 120 L 200.0 180"/>
  <text class="d-sub" x="600" y="66" text-anchor="middle">cut A at i = 4</text>
  <text class="d-sub" x="600" y="156" text-anchor="middle">cut B at j = 2</text>
  <rect class="d-box" x="80" y="210" width="290" height="76" rx="8"/>
  <text class="d-sub" x="225" y="240" text-anchor="middle">A left 9 vs B right 18</text>
  <text class="d-sub" x="225" y="268" text-anchor="middle">B left 11 vs A right 15</text>
  <rect class="d-box-accent" x="420" y="210" width="300" height="76" rx="8"/>
  <text class="d-text" x="570" y="240" text-anchor="middle">valid cut</text>
  <text class="d-sub" x="570" y="268" text-anchor="middle">median = max(9, 11) = 11</text>
</svg>

The left side holds \`1, 3, 8, 9, 7, 11\` — six values, all no bigger than \`15, 18, 19, 21, 25\`. The total is odd, so the median is the biggest left value, 11. Two steps; the merge would have walked six elements to get there. Example 2 prints exactly this trace.

> **Key insight:** you are not looking for a *value*, you are looking for a *position*. The rule "too many from A / too few from A" is monotonic in \`i\`, and anything monotonic can be binary searched.

## 6. The Java Solution, Line by Line

~~~java
static double findMedianSortedArrays(int[] a, int[] b) {
    if (a.length > b.length) { int[] t = a; a = b; b = t; }  // binary search over the SHORTER array
    int m = a.length, n = b.length;
    int half = (m + n + 1) / 2;          // size of the left half (gets the extra one if odd)
    int lo = 0, hi = m;                  // i = how many elements of a go left: 0..m
    while (lo <= hi) {
        int i = (lo + hi) >>> 1;
        int j = half - i;                // the rest of the left half comes from b
        // long sentinels: an int array may legally contain Integer.MIN_VALUE / MAX_VALUE
        long aLeft = i > 0 ? a[i - 1] : Long.MIN_VALUE;
        long aRight = i < m ? a[i] : Long.MAX_VALUE;
        long bLeft = j > 0 ? b[j - 1] : Long.MIN_VALUE;
        long bRight = j < n ? b[j] : Long.MAX_VALUE;
        if (aLeft <= bRight && bLeft <= aRight) {       // every left <= every right
            if ((m + n) % 2 == 1) return Math.max(aLeft, bLeft);
            return (Math.max(aLeft, bLeft) + Math.min(aRight, bRight)) / 2.0;  // long sum: no int overflow
        }
        if (aLeft > bRight) hi = i - 1;  // took too many from a
        else lo = i + 1;                 // took too few from a
    }
    throw new IllegalArgumentException("inputs must be sorted");
}
~~~

- The swap of the two array references is cheap — only the references move, not the elements.
- \`int half = (m + n + 1) / 2;\` — \`int / int\` truncates, which is the floor here because both are non-negative.
- **\`long\` sentinels.** Many solutions use \`Integer.MIN_VALUE\` / \`Integer.MAX_VALUE\`. That fails if the array legitimately contains those values; widening to \`long\` and using \`Long.MIN_VALUE\` / \`Long.MAX_VALUE\` keeps the sentinels strictly outside every \`int\`.
- **Overflow in the average.** With two \`int\` values of 2,000,000,000, \`(a + b) / 2.0\` printed \`-1.47483648E8\` in our run, because \`a + b\` overflows *before* the division converts to \`double\`. Using \`long\` operands (or \`((long) a + b) / 2.0\`, which printed \`2.0E9\`) avoids it.
- **\`/ 2.0\`, not \`/ 2\`.** \`(2 + 3) / 2\` is \`2\` in Java; the \`.0\` forces floating-point division.

## 7. Java Details That Matter

- **\`String.format(Locale.ROOT, "%.1f", x)\`.** \`String.format\` uses the default locale; with \`Locale.GERMANY\` our run printed \`2,5\`. \`Locale.ROOT\` guarantees a dot, which keeps output identical to the other languages.
- **Returning \`double\`.** The median of integers can be \`x.5\`, so \`double\` is the natural type; it represents every \`long\` average of \`int\` values here exactly because the values are well below 2^53.
- **\`Arrays.sort(int[])\`** prepares the random test arrays in Example 2. For primitives it sorts in place and returns nothing.
- **A field for the step counter.** Java methods return one value; Example 2 stores the step count in a \`static\` field. A small \`record Result(double median, int steps)\` (Java 16+) is the cleaner option in real code.

## 8. Verified: Running the Code

Every program below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21.0.12). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — The partition search on eight inputs, including empty and negative arrays**

~~~text
2.0
2.5
1.0
2.0
0.0
11.0
-2.5
6.0
~~~

**Example 2 — Trace of the cuts, plus 500 random tests against the merge**

~~~text
step 1: i=2 j=4 | A left 3 right 8 | B left 19 right 21 -> too few from A
step 2: i=4 j=2 | A left 9 right 15 | B left 11 right 18 -> valid
median 11.0
500 random tests match the merge: true
most partition steps in one test: 4
~~~

The 500 random tests used array lengths 0 to 8 and values 0 to 20 from a small portable random generator, so every language tested exactly the same arrays. The partition search agreed with the merge on all of them and never needed more than 4 steps.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy both and \`Arrays.sort\` | O((m+n) log(m+n)) | O(m + n) | Sorts everything |
| Merge, then read the middle | O(m + n) | O(m + n) | Builds the merged array |
| Two pointers to the middle | O(m + n) | O(1) | Walks half of both arrays |
| Partition binary search | O(log(min(m, n))) | O(1) | Halves the \`0 .. m\` range per step: at most 4 steps in the 500 random tests |

## 10. Edge Cases

- **One array empty** — \`[]\` and \`[1]\`: after the swap A is empty, \`lo = hi = 0\`, \`i = 0\`, \`j = 1\`, the sentinels make the cut valid, and the median is \`1.0\`.
- **All of A smaller than all of B** — \`[1..10]\` and \`[11]\`: A is the longer one, so the arrays are swapped and we binary search \`[11]\`. The median is \`6.0\`.
- **Duplicates** — \`[0, 0]\` and \`[0, 0]\`: the conditions use \`<=\`, so equal values on both sides of the cut are fine; median \`0.0\`.
- **Negative numbers** — \`[-5, -3, -1]\` and \`[-2]\`: nothing special; median \`-2.5\`.
- **Both empty** — no median; the code should throw or return a defined error value (ours throws only if inputs are not sorted, so guard this case explicitly if it can happen).
- **Unsorted input** — the search never finds a valid cut; our function raises an error at the end of the loop instead of returning nonsense.

## 11. Common Pitfalls

- **\`int\` overflow in the average.** \`(a + b) / 2.0\` overflows before converting; widen to \`long\` first.
- **\`Integer.MIN_VALUE\` sentinels.** They collide with real values; use \`long\` sentinels.
- **\`/ 2\` instead of \`/ 2.0\`.** Integer division drops the \`.5\`.
- **Binary searching the longer array.** \`j\` can go negative and \`b[j - 1]\` throws \`ArrayIndexOutOfBoundsException\`.
- **Locale-dependent formatting.** \`String.format(Locale.GERMANY, "%.1f", 2.5)\` printed \`2,5\` in our run; the default locale can do the same.
- **Getting \`half\` wrong.** \`(m + n) / 2\` puts the odd-case median on the right side.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;">Merging gives the median in O(m + n). To do better I look for a <strong style="color:#ffca28;">cut</strong> instead.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The cut:</strong> <span style="color:#f0e2c8;">Cut A at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> and B at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j = half - i</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">half = (m + n + 1) / 2</code>. Valid when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A[i-1] &lt;= B[j]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B[j-1] &lt;= A[i]</code>, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> sentinels at the edges.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Binary search:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A[i-1] &gt; B[j]</code>, too many from A, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = i - 1</code>; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = i + 1</code>. Search the shorter array: O(log(min(m, n))).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The answer:</strong> <span style="color:#f0e2c8;">Odd total: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max(aLeft, bLeft)</code>. Even: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(maxLeft + minRight) / 2.0</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> so it cannot overflow.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java notes:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> sentinels and sums, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/ 2.0</code> not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/ 2</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Locale.ROOT</code> when printing; I checked it against a merge on 500 random cases.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Integer.MIN_VALUE</code> as the left sentinel?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it is a legal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>. If the array contains it, a sentinel and a real value compare equal and the edge logic can pick the wrong cut. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> sentinels sit outside every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where can overflow happen?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only in the average: two large <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> values summed in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> wrap negative (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1.47483648E8</code> in my run). Summing as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> fixes it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must A be the shorter array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 .. m</code> keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 .. n</code> — otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b[j - 1]</code> throws — and so the cost is O(log(min(m, n))).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find the kth smallest of two sorted arrays?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same partition with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">half</code> replaced by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>, or the recursion that discards <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k / 2</code> elements per step — O(log k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Against a merge-based median on many random sorted inputs, including empty arrays, with a seeded generator — Example 2 runs 500 cases.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Median** | Middle value of a sorted list; average of the two middle values for an even count |
| **Merge step** | Two pointers produce one sorted list from two in O(m + n) |
| **Partition (cut)** | Splitting each array at i and j with i + j = half |
| **Sentinel** | Minus or plus infinity at the edges so comparisons need no special cases |
| **Binary search on the partition** | Binary searching the cut position i using the cross comparisons |

---
**Conclusion:** The median of two sorted arrays needs no merge: choose how many elements of the shorter array go left, let that force the cut in the other, and binary search the choice with two cross comparisons. In Java the algorithm is the same as everywhere; the marks come from the numeric details — \`long\` sentinels instead of \`Integer.MIN_VALUE\`, a \`long\` sum before \`/ 2.0\` (the run showed the \`int\` version going negative), and \`Locale.ROOT\` when printing. The 500-case random test against a merge shows the method is right on every input.
`,
        examples: [
          { label: "The partition search on eight inputs, including empty and negative arrays", code: `import java.util.Locale;

public class Main {
    static double findMedianSortedArrays(int[] a, int[] b) {
        if (a.length > b.length) { int[] t = a; a = b; b = t; }  // binary search over the SHORTER array
        int m = a.length, n = b.length;
        int half = (m + n + 1) / 2;          // size of the left half (gets the extra one if odd)
        int lo = 0, hi = m;                  // i = how many elements of a go left: 0..m
        while (lo <= hi) {
            int i = (lo + hi) >>> 1;
            int j = half - i;                // the rest of the left half comes from b
            // long sentinels: an int array may legally contain Integer.MIN_VALUE / MAX_VALUE
            long aLeft = i > 0 ? a[i - 1] : Long.MIN_VALUE;
            long aRight = i < m ? a[i] : Long.MAX_VALUE;
            long bLeft = j > 0 ? b[j - 1] : Long.MIN_VALUE;
            long bRight = j < n ? b[j] : Long.MAX_VALUE;
            if (aLeft <= bRight && bLeft <= aRight) {       // every left <= every right
                if ((m + n) % 2 == 1) return Math.max(aLeft, bLeft);
                return (Math.max(aLeft, bLeft) + Math.min(aRight, bRight)) / 2.0;  // long sum: no int overflow
            }
            if (aLeft > bRight) hi = i - 1;  // took too many from a
            else lo = i + 1;                 // took too few from a
        }
        throw new IllegalArgumentException("inputs must be sorted");
    }

    static String fmt(double x) {
        return String.format(Locale.ROOT, "%.1f", x);   // ROOT: always a dot, never a comma
    }

    public static void main(String[] args) {
        System.out.println(fmt(findMedianSortedArrays(new int[]{1, 3}, new int[]{2})));                // 2.0
        System.out.println(fmt(findMedianSortedArrays(new int[]{1, 2}, new int[]{3, 4})));             // 2.5
        System.out.println(fmt(findMedianSortedArrays(new int[]{}, new int[]{1})));                    // 1.0
        System.out.println(fmt(findMedianSortedArrays(new int[]{2}, new int[]{})));                    // 2.0
        System.out.println(fmt(findMedianSortedArrays(new int[]{0, 0}, new int[]{0, 0})));             // 0.0
        System.out.println(fmt(findMedianSortedArrays(new int[]{1, 3, 8, 9, 15}, new int[]{7, 11, 18, 19, 21, 25}))); // 11.0
        System.out.println(fmt(findMedianSortedArrays(new int[]{-5, -3, -1}, new int[]{-2})));         // -2.5
        System.out.println(fmt(findMedianSortedArrays(new int[]{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, new int[]{11}))); // 6.0
    }
}` },
          { label: "Trace of the cuts, plus 500 random tests against the merge", code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

public class Main {
    static int steps;   // set by medianTraced

    // Same partition search as example 1, but counts steps and can log each cut.
    static double medianTraced(int[] a, int[] b, List<String> log) {
        if (a.length > b.length) { int[] t = a; a = b; b = t; }
        int m = a.length, n = b.length;
        int half = (m + n + 1) / 2;
        int lo = 0, hi = m;
        steps = 0;
        while (lo <= hi) {
            int i = (lo + hi) >>> 1;
            int j = half - i;
            steps++;
            long aLeft = i > 0 ? a[i - 1] : Long.MIN_VALUE;
            long aRight = i < m ? a[i] : Long.MAX_VALUE;
            long bLeft = j > 0 ? b[j - 1] : Long.MIN_VALUE;
            long bRight = j < n ? b[j] : Long.MAX_VALUE;
            boolean ok = aLeft <= bRight && bLeft <= aRight;
            if (log != null) {
                String verdict = ok ? "valid" : (aLeft > bRight ? "too many from A" : "too few from A");
                log.add("step " + steps + ": i=" + i + " j=" + j + " | A left " + aLeft + " right " + aRight
                        + " | B left " + bLeft + " right " + bRight + " -> " + verdict);
            }
            if (ok) {
                if ((m + n) % 2 == 1) return Math.max(aLeft, bLeft);
                return (Math.max(aLeft, bLeft) + Math.min(aRight, bRight)) / 2.0;
            }
            if (aLeft > bRight) hi = i - 1;
            else lo = i + 1;
        }
        throw new IllegalArgumentException("inputs must be sorted");
    }

    // Brute force: merge the two arrays (O(m+n)) and read the middle.
    static double medianByMerge(int[] a, int[] b) {
        int[] merged = new int[a.length + b.length];
        int i = 0, j = 0, k = 0;
        while (i < a.length || j < b.length) {
            if (j == b.length || (i < a.length && a[i] <= b[j])) merged[k++] = a[i++];
            else merged[k++] = b[j++];
        }
        int len = merged.length;
        if (len % 2 == 1) return merged[len / 2];
        return ((long) merged[len / 2 - 1] + merged[len / 2]) / 2.0;
    }

    static long seed = 12345;
    static int rand(int k) {
        seed = seed * 48271 % 2147483647L;   // MINSTD in long arithmetic: no overflow
        return (int) (seed % k);
    }

    public static void main(String[] args) {
        // 1) Trace one search
        List<String> log = new ArrayList<>();
        double med = medianTraced(new int[]{1, 3, 8, 9, 15}, new int[]{7, 11, 18, 19, 21, 25}, log);
        for (String line : log) System.out.println(line);
        System.out.println("median " + String.format(Locale.ROOT, "%.1f", med));

        // 2) 500 random tests against the merge
        boolean allMatch = true;
        int maxSteps = 0;
        for (int t = 0; t < 500; t++) {
            int m = rand(9), n = rand(9);
            if (m + n == 0) n = 1;
            int[] a = new int[m], b = new int[n];
            for (int x = 0; x < m; x++) a[x] = rand(21);
            for (int x = 0; x < n; x++) b[x] = rand(21);
            Arrays.sort(a);
            Arrays.sort(b);
            double got = medianTraced(a, b, null);
            allMatch = allMatch && got == medianByMerge(a, b);
            maxSteps = Math.max(maxSteps, steps);
        }
        System.out.println("500 random tests match the merge: " + allMatch);
        System.out.println("most partition steps in one test: " + maxSteps);
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You have two sorted \`std::vector<int>\`s of lengths m and n. Return the median of all the numbers together as a \`double\`. A merge is O(m + n); I would like O(log(min(m, n))). Please write it in C++ and explain the partition idea."

**What a strong answer should cover:**
- The merge baseline in O(m + n) (\`std::merge\`), then the observation that choosing a cut \`i\` in one array forces \`j = half - i\` in the other.
- The validity test \`A[i-1] <= B[j]\` and \`B[j-1] <= A[i]\`, with sentinels at the edges, and how each failure says which way to move.
- Binary search on \`i\` over the **shorter** array: O(log(min(m, n))) time, O(1) space.
- Reading the median for odd and even totals.
- C++ specifics: \`INT_MIN\` sentinels collide with real values (use \`long long\` with \`std::numeric_limits\`), signed overflow in the sum is undefined behaviour, \`(a + b) / 2\` is integer division, and binding the shorter vector with a \`const&\` avoids copies.

**Clarifying questions expected:**
- "Can either array be empty?"
- "For an even total, the average of the two middle values, as a \`double\`?"

**Code / implementation expected:** Yes — \`double findMedianSortedArrays(const std::vector<int>&, const std::vector<int>&)\` in C++17.`,
        answer: `**Target Audience:** Intermediate interview candidates — you should know binary search and what a sorted array is; every other idea is explained here.
**Difficulty:** Hard
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the C++ programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

Two schools line up their students by height for a joint photo — each line is already sorted, shortest to tallest. The photographer wants the **middle** height of all the students together.

The obvious way: merge the two lines into one long sorted line and walk to the middle. That works, but if the lines are a million students long, you walk past half a million people.

The clever way: the photographer does not need the merged line, only a **dividing point**. Imagine drawing one chalk mark in each line so that, together, the students left of the two marks are exactly half of everyone, and every one of them is no taller than anyone right of the marks. Then the middle height is sitting right at the chalk marks — the tallest person on the left or (for an even count) the average of that and the shortest person on the right.

Here is the trick: once you choose where the mark goes in line A, the mark in line B is **forced** (the left side must hold exactly half of everyone). So you only need to *search for one mark* — and you can binary search it in the shorter line. That is how a problem that looks like it needs a merge is solved in O(log(min(m, n))).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| "Are both arrays sorted ascending?" | The partition rule depends on it; unsorted input needs sorting first. |
| "Can one array be empty? Both?" | One empty array is normal and must work; both empty has no median — decide whether to throw. |
| "For an even total, the average of the two middle values?" | That is the usual definition, and it means the answer may be a fraction like 2.5. |
| "What number type, and how large can values be?" | Adding the two middle values can overflow a 32-bit integer in Java and C++. |
| "Is O(m + n) acceptable, or do you need the logarithmic version?" | The merge is a valid first answer; the follow-up is almost always the partition trick. |

## 3. The Median, and the Brute Force

📌 **Interview term: Median** — the middle value of a sorted list. With an odd count it is the single middle element; with an even count it is the average of the two middle elements. \`[1, 2, 3]\` has median 2; \`[1, 2, 3, 4]\` has median 2.5.

The straightforward answer is to merge the two sorted arrays (the same step as in merge sort — see [How do you merge two sorted arrays?](/interview-question/how-do-you-merge-two-sorted-arrays)) and read the middle. Example 2 uses that merge as its reference answer.

📌 **Interview term: Merge step** — walking two sorted lists with one pointer each, always taking the smaller head, to produce one sorted list in O(m + n).

You can avoid building the merged array by stopping the two pointers at the middle, which saves memory but is still O(m + n) time. To get to O(log(min(m, n))), we have to stop thinking about *merging* and start thinking about *cutting*.

## 4. The Partition Idea

Let \`m = len(A)\`, \`n = len(B)\` and \`half = (m + n + 1) / 2\` (integer division; for an odd total the left side gets the extra element).

Cut A after its first \`i\` elements and B after its first \`j\` elements, with \`i + j = half\`. The left halves of both arrays together form the "left side"; everything else is the "right side".

📌 **Interview term: Partition (cut)** — a split of each array into a left part and a right part. Choosing \`i\` fixes \`j = half - i\`, so there is really only **one** number to choose.

The cut is correct exactly when every value on the left is less than or equal to every value on the right. Inside each array that is automatic (it is sorted), so only the two **cross** comparisons need checking:

- \`A[i-1] <= B[j]\` — the biggest of A on the left is not bigger than the smallest of B on the right.
- \`B[j-1] <= A[i]\` — the biggest of B on the left is not bigger than the smallest of A on the right.

When a cut has nothing on one side (\`i = 0\`, \`i = m\`, \`j = 0\` or \`j = n\`), the missing neighbour is replaced by minus or plus infinity so the comparison always passes.

📌 **Interview term: Sentinel** — a stand-in value (here minus or plus infinity) used at the edges so the same comparison code works without special cases.

Once the cut is valid, the answer is right at the cut:

- odd total: median = \`max(A[i-1], B[j-1])\`, the biggest value on the left;
- even total: median = \`(max(A[i-1], B[j-1]) + min(A[i], B[j])) / 2\`.

## 5. Why Binary Search Finds the Cut

If a cut fails, it tells you **which way to move**:

<svg class="iq-diagram" width="100%" viewBox="0 0 740 262" role="img" aria-label="Decision rule for one cut. If A left is bigger than B right, move i left. If B left is bigger than A right, move i right. Otherwise the cut is valid">
  <defs>
    <marker id="b04q3-r-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="180" y="20" width="380" height="60" rx="10"/>
  <text class="d-text" x="370" y="46" text-anchor="middle">pick i in the shorter array A</text>
  <text class="d-sub" x="370" y="68" text-anchor="middle">j = half - i</text>
  <path class="d-edge" d="M 260 84 L 130 140" marker-end="url(#b04q3-r-cpp)"/>
  <path class="d-edge" d="M 370 84 L 370 140" marker-end="url(#b04q3-r-cpp)"/>
  <path class="d-edge" d="M 480 84 L 610 140" marker-end="url(#b04q3-r-cpp)"/>
  <rect class="d-box" x="20" y="146" width="220" height="96" rx="10"/>
  <text class="d-text" x="130" y="176" text-anchor="middle">A left &gt; B right</text>
  <text class="d-sub" x="130" y="202" text-anchor="middle">too many from A</text>
  <text class="d-sub" x="130" y="226" text-anchor="middle">hi = i - 1</text>
  <rect class="d-box-accent" x="260" y="146" width="220" height="96" rx="10"/>
  <text class="d-text d-accent" x="370" y="176" text-anchor="middle">both checks pass</text>
  <text class="d-sub" x="370" y="202" text-anchor="middle">the cut is valid</text>
  <text class="d-sub" x="370" y="226" text-anchor="middle">read the median</text>
  <rect class="d-box" x="500" y="146" width="220" height="96" rx="10"/>
  <text class="d-text" x="610" y="176" text-anchor="middle">B left &gt; A right</text>
  <text class="d-sub" x="610" y="202" text-anchor="middle">too few from A</text>
  <text class="d-sub" x="610" y="226" text-anchor="middle">lo = i + 1</text>
</svg>

- \`A[i-1] > B[j]\` means A put a too-big value on the left: we took **too many** from A, so the right \`i\` is smaller.
- \`B[j-1] > A[i]\` means B put a too-big value on the left, so we took **too few** from A and the right \`i\` is larger.

That one-directional answer is exactly what binary search needs. Search \`i\` over \`0 .. m\`; each test halves the range.

📌 **Interview term: Binary search on the partition** — binary searching the cut position \`i\` (not a value) and using the two cross comparisons to decide the direction. The basics of binary search are in [How does binary search work and what are its requirements?](/interview-question/how-does-binary-search-work-and-what-are-its-requirements)

**Why search the shorter array?** Two reasons. First, cost: the range \`0 .. m\` has \`m + 1\` positions, so the search takes O(log(min(m, n))) steps if A is the shorter one. Second, safety: with \`m <= n\`, every \`i\` in \`0 .. m\` gives \`j = half - i\` between \`0\` and \`n\`, so \`j\` never goes out of bounds. Searching the longer array can produce a negative \`j\`.

### The trace on our example

\`A = [1, 3, 8, 9, 15]\` (m = 5), \`B = [7, 11, 18, 19, 21, 25]\` (n = 6), total 11, \`half = 6\`. The search starts with \`lo = 0\`, \`hi = 5\`.

**Step 1:** \`i = 2\`, so \`j = 4\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 306" role="img" aria-label="Cut of A at 2 and B at 4. Result: too few from A">
  <defs>
    <marker id="b04q3-s1-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="66" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="80" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="107.0" y="65.0" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="142" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="169.0" y="65.0" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="204" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="231.0" y="65.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="266" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="293.0" y="65.0" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="328" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="355.0" y="65.0" text-anchor="middle">15</text>
  <path class="d-edge-dashed" d="M 200.0 30 L 200.0 90"/>
  <text class="d-text" x="40" y="156" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="80" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="107.0" y="155.0" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="142" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="169.0" y="155.0" text-anchor="middle">11</text>
  <rect class="d-box-accent" x="204" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="231.0" y="155.0" text-anchor="middle">18</text>
  <rect class="d-box-accent" x="266" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="293.0" y="155.0" text-anchor="middle">19</text>
  <rect class="d-box-muted" x="328" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="355.0" y="155.0" text-anchor="middle">21</text>
  <rect class="d-box-muted" x="390" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="417.0" y="155.0" text-anchor="middle">25</text>
  <path class="d-edge-dashed" d="M 324.0 120 L 324.0 180"/>
  <text class="d-sub" x="600" y="66" text-anchor="middle">cut A at i = 2</text>
  <text class="d-sub" x="600" y="156" text-anchor="middle">cut B at j = 4</text>
  <rect class="d-box" x="80" y="210" width="290" height="76" rx="8"/>
  <text class="d-sub" x="225" y="240" text-anchor="middle">A left 3 vs B right 21</text>
  <text class="d-sub" x="225" y="268" text-anchor="middle">B left 19 vs A right 8</text>
  <rect class="d-box-muted" x="420" y="210" width="300" height="76" rx="8"/>
  <text class="d-text" x="570" y="240" text-anchor="middle">too few from A</text>
  <text class="d-sub" x="570" y="268" text-anchor="middle">B left 19 &gt; A right 8, so lo = 3</text>
</svg>

**Step 2:** \`lo = 3\`, \`hi = 5\`, so \`i = 4\` and \`j = 2\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 306" role="img" aria-label="Cut of A at 4 and B at 2. Result: valid cut">
  <defs>
    <marker id="b04q3-s2-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="40" y="66" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="80" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="107.0" y="65.0" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="142" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="169.0" y="65.0" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="204" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="231.0" y="65.0" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="266" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="293.0" y="65.0" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="328" y="40" width="54" height="40" rx="6"/>
  <text class="d-text" x="355.0" y="65.0" text-anchor="middle">15</text>
  <path class="d-edge-dashed" d="M 324.0 30 L 324.0 90"/>
  <text class="d-text" x="40" y="156" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="80" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="107.0" y="155.0" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="142" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="169.0" y="155.0" text-anchor="middle">11</text>
  <rect class="d-box-muted" x="204" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="231.0" y="155.0" text-anchor="middle">18</text>
  <rect class="d-box-muted" x="266" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="293.0" y="155.0" text-anchor="middle">19</text>
  <rect class="d-box-muted" x="328" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="355.0" y="155.0" text-anchor="middle">21</text>
  <rect class="d-box-muted" x="390" y="130" width="54" height="40" rx="6"/>
  <text class="d-text" x="417.0" y="155.0" text-anchor="middle">25</text>
  <path class="d-edge-dashed" d="M 200.0 120 L 200.0 180"/>
  <text class="d-sub" x="600" y="66" text-anchor="middle">cut A at i = 4</text>
  <text class="d-sub" x="600" y="156" text-anchor="middle">cut B at j = 2</text>
  <rect class="d-box" x="80" y="210" width="290" height="76" rx="8"/>
  <text class="d-sub" x="225" y="240" text-anchor="middle">A left 9 vs B right 18</text>
  <text class="d-sub" x="225" y="268" text-anchor="middle">B left 11 vs A right 15</text>
  <rect class="d-box-accent" x="420" y="210" width="300" height="76" rx="8"/>
  <text class="d-text" x="570" y="240" text-anchor="middle">valid cut</text>
  <text class="d-sub" x="570" y="268" text-anchor="middle">median = max(9, 11) = 11</text>
</svg>

The left side holds \`1, 3, 8, 9, 7, 11\` — six values, all no bigger than \`15, 18, 19, 21, 25\`. The total is odd, so the median is the biggest left value, 11. Two steps; the merge would have walked six elements to get there. Example 2 prints exactly this trace.

> **Key insight:** you are not looking for a *value*, you are looking for a *position*. The rule "too many from A / too few from A" is monotonic in \`i\`, and anything monotonic can be binary searched.

## 6. The C++ Solution, Line by Line

~~~cpp
double findMedianSortedArrays(const std::vector<int>& x, const std::vector<int>& y) {
    const std::vector<int>& a = x.size() <= y.size() ? x : y;   // binary search over the SHORTER array
    const std::vector<int>& b = x.size() <= y.size() ? y : x;
    int m = static_cast<int>(a.size()), n = static_cast<int>(b.size());
    int half = (m + n + 1) / 2;          // size of the left half (gets the extra one if odd)
    int lo = 0, hi = m;                  // i = how many elements of a go left: 0..m
    const long long NEG = std::numeric_limits<long long>::min();
    const long long POS = std::numeric_limits<long long>::max();
    while (lo <= hi) {
        int i = lo + (hi - lo) / 2;
        int j = half - i;                // the rest of the left half comes from b
        long long aLeft = i > 0 ? a[i - 1] : NEG;
        long long aRight = i < m ? a[i] : POS;
        long long bLeft = j > 0 ? b[j - 1] : NEG;
        long long bRight = j < n ? b[j] : POS;
        if (aLeft <= bRight && bLeft <= aRight) {           // every left <= every right
            if ((m + n) % 2 == 1) return static_cast<double>(std::max(aLeft, bLeft));
            return (std::max(aLeft, bLeft) + std::min(aRight, bRight)) / 2.0;  // long long sum: no int overflow
        }
        if (aLeft > bRight) hi = i - 1;  // took too many from a
        else lo = i + 1;                 // took too few from a
    }
    throw std::invalid_argument("inputs must be sorted");
}
~~~

- \`const std::vector<int>& a = x.size() <= y.size() ? x : y;\` — two \`const\` references pick the shorter and longer arrays without copying anything. (A by-value parameter plus \`std::swap\` also works, but copies both vectors: O(m + n).)
- \`std::numeric_limits<long long>::min()\` / \`max()\` from \`<limits>\` are the sentinels. They are outside every \`int\`, so a real \`INT_MIN\` in the input cannot be confused with "nothing here".
- The average adds two \`long long\` values. Adding two large \`int\`s instead would be **signed overflow — undefined behaviour** in C++, not just a wrong number.
- \`/ 2.0\` forces floating-point division: \`(3 + 4) / 2\` printed \`3\`, \`(3 + 4) / 2.0\` printed \`3.5\`.
- \`std::printf("%.1f\\n", ...)\` prints one decimal; \`printf\` with \`%f\` is not affected by the C++ stream locale, which keeps output identical to the other languages.

## 7. C++ Details That Matter

- **\`std::merge\`** from \`<algorithm>\` is the one-line O(m + n) baseline; Example 2 uses it as the reference: \`std::merge(a.begin(), a.end(), b.begin(), b.end(), merged.begin())\`.
- **Unsigned sizes.** \`a.size()\` is \`size_t\`. The code converts to \`int\` once (\`m\`, \`n\`) so that \`hi = i - 1\` can become negative and end the loop.
- **Evaluation order.** In Example 2 the two random lengths are drawn in separate statements. In \`f(rnd(9), rnd(9))\` the order of the two calls is unspecified in C++, which would make the test data differ between compilers.
- **Exceptions.** \`std::invalid_argument\` from \`<stdexcept>\` reports unsorted input; returning \`NaN\` (\`std::nan("")\`) is the alternative if exceptions are disabled.

## 8. Verified: Running the Code

Every program below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3.0 with -std=c++17). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — The partition search on eight inputs, including empty and negative arrays**

~~~text
2.0
2.5
1.0
2.0
0.0
11.0
-2.5
6.0
~~~

**Example 2 — Trace of the cuts, plus 500 random tests against the merge**

~~~text
step 1: i=2 j=4 | A left 3 right 8 | B left 19 right 21 -> too few from A
step 2: i=4 j=2 | A left 9 right 15 | B left 11 right 18 -> valid
median 11.0
500 random tests match the merge: true
most partition steps in one test: 4
~~~

The 500 random tests used array lengths 0 to 8 and values 0 to 20 from a small portable random generator, so every language tested exactly the same arrays. The partition search agreed with the merge on all of them and never needed more than 4 steps.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy both and \`std::sort\` | O((m+n) log(m+n)) | O(m + n) | Sorts everything |
| \`std::merge\`, then read the middle | O(m + n) | O(m + n) | Builds the merged vector |
| Two pointers to the middle | O(m + n) | O(1) | Walks half of both arrays |
| Partition binary search | O(log(min(m, n))) | O(1) | Halves the \`0 .. m\` range per step: at most 4 steps in the 500 random tests |

## 10. Edge Cases

- **One array empty** — \`[]\` and \`[1]\`: after the swap A is empty, \`lo = hi = 0\`, \`i = 0\`, \`j = 1\`, the sentinels make the cut valid, and the median is \`1.0\`.
- **All of A smaller than all of B** — \`[1..10]\` and \`[11]\`: A is the longer one, so the arrays are swapped and we binary search \`[11]\`. The median is \`6.0\`.
- **Duplicates** — \`[0, 0]\` and \`[0, 0]\`: the conditions use \`<=\`, so equal values on both sides of the cut are fine; median \`0.0\`.
- **Negative numbers** — \`[-5, -3, -1]\` and \`[-2]\`: nothing special; median \`-2.5\`.
- **Both empty** — no median; the code should throw or return a defined error value (ours throws only if inputs are not sorted, so guard this case explicitly if it can happen).
- **Unsorted input** — the search never finds a valid cut; our function raises an error at the end of the loop instead of returning nonsense.

## 11. Common Pitfalls

- **Signed overflow in \`left + right\`.** Undefined behaviour for large \`int\`s; sum as \`long long\`.
- **\`INT_MIN\` / \`INT_MAX\` sentinels.** They collide with real values; use \`long long\` limits.
- **\`/ 2\` instead of \`/ 2.0\`.** Integer division drops the \`.5\`.
- **Binary searching the longer array.** \`j\` can go negative and \`b[j - 1]\` is undefined behaviour — no exception.
- **Passing vectors by value and swapping.** Two O(m + n) copies hide inside an O(log) function.
- **Getting \`half\` wrong.** \`(m + n) / 2\` puts the odd-case median on the right side.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::merge</code> gives the median in O(m + n). To do better I look for a <strong style="color:#ffca28;">cut</strong> instead.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The cut:</strong> <span style="color:#f0e2c8;">Cut A at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> and B at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j = half - i</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">half = (m + n + 1) / 2</code>. Valid when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A[i-1] &lt;= B[j]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B[j-1] &lt;= A[i]</code>, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> sentinels at the edges.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Binary search:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A[i-1] &gt; B[j]</code>, too many from A, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi = i - 1</code>; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo = i + 1</code>. Search the shorter array, bound by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code>: O(log(min(m, n))).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The answer:</strong> <span style="color:#f0e2c8;">Odd total: the larger left value. Even: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(maxLeft + minRight) / 2.0</code>, summed in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ notes:</strong> <span style="color:#f0e2c8;">No signed overflow, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INT_MIN</code> sentinels, no copies, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/ 2.0</code> not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/ 2</code>; I checked it against <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::merge</code> on 500 random cases.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">INT_MIN</code> as the left sentinel?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a legal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, so a real value and the sentinel can compare equal. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> limits sit outside every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where can overflow happen, and why does it matter more in C++?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only in the sum of the two middle values. In C++ signed overflow is undefined behaviour, so the compiler may assume it never happens; summing as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> avoids it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must A be the shorter array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 .. m</code> keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 .. n</code> — otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b[j - 1]</code> reads out of bounds silently — and so the cost is O(log(min(m, n))).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you pick the shorter array without copying?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bind two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const std::vector&lt;int&gt;&amp;</code> with a conditional: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const auto&amp; a = x.size() &lt;= y.size() ? x : y;</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find the kth smallest of two sorted arrays?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same partition with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">half</code> replaced by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>, or the recursion that discards <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k / 2</code> elements per step — O(log k).</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Median** | Middle value of a sorted list; average of the two middle values for an even count |
| **Merge step** | Two pointers produce one sorted list from two in O(m + n) |
| **Partition (cut)** | Splitting each array at i and j with i + j = half |
| **Sentinel** | Minus or plus infinity at the edges so comparisons need no special cases |
| **Binary search on the partition** | Binary searching the cut position i using the cross comparisons |

---
**Conclusion:** The median of two sorted arrays needs no merge: choose how many elements of the shorter array go left, let that force the cut in the other, and binary search the choice with two cross comparisons. In C++ the strong answer adds the low-level care — \`const&\` instead of copies, \`long long\` sentinels and sums so there is no undefined behaviour, \`/ 2.0\` for the average, and signed indices. The 500-case random test against \`std::merge\` shows the method agrees every time and needs at most four steps on those inputs.
`,
        examples: [
          { label: "The partition search on eight inputs, including empty and negative arrays", code: `#include <algorithm>
#include <cstdio>
#include <limits>
#include <stdexcept>
#include <vector>

double findMedianSortedArrays(const std::vector<int>& x, const std::vector<int>& y) {
    const std::vector<int>& a = x.size() <= y.size() ? x : y;   // binary search over the SHORTER array
    const std::vector<int>& b = x.size() <= y.size() ? y : x;
    int m = static_cast<int>(a.size()), n = static_cast<int>(b.size());
    int half = (m + n + 1) / 2;          // size of the left half (gets the extra one if odd)
    int lo = 0, hi = m;                  // i = how many elements of a go left: 0..m
    const long long NEG = std::numeric_limits<long long>::min();
    const long long POS = std::numeric_limits<long long>::max();
    while (lo <= hi) {
        int i = lo + (hi - lo) / 2;
        int j = half - i;                // the rest of the left half comes from b
        long long aLeft = i > 0 ? a[i - 1] : NEG;
        long long aRight = i < m ? a[i] : POS;
        long long bLeft = j > 0 ? b[j - 1] : NEG;
        long long bRight = j < n ? b[j] : POS;
        if (aLeft <= bRight && bLeft <= aRight) {           // every left <= every right
            if ((m + n) % 2 == 1) return static_cast<double>(std::max(aLeft, bLeft));
            return (std::max(aLeft, bLeft) + std::min(aRight, bRight)) / 2.0;  // long long sum: no int overflow
        }
        if (aLeft > bRight) hi = i - 1;  // took too many from a
        else lo = i + 1;                 // took too few from a
    }
    throw std::invalid_argument("inputs must be sorted");
}

void show(const std::vector<int>& a, const std::vector<int>& b) {
    std::printf("%.1f\\n", findMedianSortedArrays(a, b));
}

int main() {
    show({1, 3}, {2});                                // 2.0
    show({1, 2}, {3, 4});                             // 2.5
    show({}, {1});                                    // 1.0
    show({2}, {});                                    // 2.0
    show({0, 0}, {0, 0});                             // 0.0
    show({1, 3, 8, 9, 15}, {7, 11, 18, 19, 21, 25});  // 11.0
    show({-5, -3, -1}, {-2});                         // -2.5
    show({1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, {11});      // 6.0
    return 0;
}` },
          { label: "Trace of the cuts, plus 500 random tests against the merge", code: `#include <algorithm>
#include <cstdio>
#include <limits>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

using std::vector;

// Same partition search as example 1, but returns {median, steps} and can log each cut.
std::pair<double, int> medianTraced(vector<int> a, vector<int> b, vector<std::string>* log) {
    if (a.size() > b.size()) std::swap(a, b);
    int m = static_cast<int>(a.size()), n = static_cast<int>(b.size());
    int half = (m + n + 1) / 2;
    int lo = 0, hi = m, steps = 0;
    const long long NEG = std::numeric_limits<long long>::min();
    const long long POS = std::numeric_limits<long long>::max();
    while (lo <= hi) {
        int i = lo + (hi - lo) / 2;
        int j = half - i;
        steps++;
        long long aLeft = i > 0 ? a[i - 1] : NEG;
        long long aRight = i < m ? a[i] : POS;
        long long bLeft = j > 0 ? b[j - 1] : NEG;
        long long bRight = j < n ? b[j] : POS;
        bool ok = aLeft <= bRight && bLeft <= aRight;
        if (log) {
            std::string verdict = ok ? "valid" : (aLeft > bRight ? "too many from A" : "too few from A");
            log->push_back("step " + std::to_string(steps) + ": i=" + std::to_string(i) + " j=" + std::to_string(j) +
                           " | A left " + std::to_string(aLeft) + " right " + std::to_string(aRight) +
                           " | B left " + std::to_string(bLeft) + " right " + std::to_string(bRight) + " -> " + verdict);
        }
        if (ok) {
            if ((m + n) % 2 == 1) return {static_cast<double>(std::max(aLeft, bLeft)), steps};
            return {(std::max(aLeft, bLeft) + std::min(aRight, bRight)) / 2.0, steps};
        }
        if (aLeft > bRight) hi = i - 1;
        else lo = i + 1;
    }
    throw std::invalid_argument("inputs must be sorted");
}

// Brute force: merge the two arrays (O(m+n)) and read the middle.
double medianByMerge(const vector<int>& a, const vector<int>& b) {
    vector<int> merged(a.size() + b.size());
    std::merge(a.begin(), a.end(), b.begin(), b.end(), merged.begin());
    size_t k = merged.size();
    if (k % 2 == 1) return merged[k / 2];
    return (static_cast<long long>(merged[k / 2 - 1]) + merged[k / 2]) / 2.0;
}

long long seed = 12345;
int rnd(int k) {
    seed = seed * 48271 % 2147483647LL;   // MINSTD in 64-bit arithmetic: no overflow
    return static_cast<int>(seed % k);
}

int main() {
    // 1) Trace one search
    vector<std::string> log;
    double med = medianTraced({1, 3, 8, 9, 15}, {7, 11, 18, 19, 21, 25}, &log).first;
    for (const auto& line : log) std::printf("%s\\n", line.c_str());
    std::printf("median %.1f\\n", med);

    // 2) 500 random tests against the merge
    bool allMatch = true;
    int maxSteps = 0;
    for (int t = 0; t < 500; t++) {
        int m = rnd(9);
        int n = rnd(9);              // separate statements: argument evaluation order is unspecified
        if (m + n == 0) n = 1;
        vector<int> a(m), b(n);
        for (int& x : a) x = rnd(21);
        for (int& x : b) x = rnd(21);
        std::sort(a.begin(), a.end());
        std::sort(b.begin(), b.end());
        auto [got, steps] = medianTraced(a, b, nullptr);
        allMatch = allMatch && got == medianByMerge(a, b);
        maxSteps = std::max(maxSteps, steps);
    }
    std::printf("500 random tests match the merge: %s\\n", allMatch ? "true" : "false");
    std::printf("most partition steps in one test: %d\\n", maxSteps);
    return 0;
}` },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does Quickselect find the kth smallest/largest element?",
    difficulty: "medium",
    seoDescription: "How Quickselect finds the kth smallest or largest element in average O(n): partition, pivots, worst cases, with verified Python, JS, Java and C++ code.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Explain how Quickselect finds the kth smallest element of an unsorted list without sorting it, then implement it in Python. Also tell me how you would get the kth largest, and what its running time is."

**What a strong answer should cover:**
- The baselines: \`sorted(nums)[k - 1]\` in O(n log n) and a heap in O(n log k).
- Partition places the pivot at its final sorted index \`p\`; Quickselect keeps only the side that contains the target index. kth largest is index \`n - k\`.
- Average O(n) (the \`n + n/2 + n/4 + ...\` argument), worst case O(n²), O(1) extra space when done in place.
- Random pivots to avoid sorted-input worst cases, three-way partition for many duplicates, median of medians for a guaranteed O(n).
- Python specifics: tuple swaps, copying with \`list(nums)\` so the caller's list is not reordered, a loop instead of recursion (the default recursion limit is 1000), and \`heapq.nsmallest\` / \`sorted\` as practical alternatives.

**Code / implementation expected:** Yes — an iterative in-place \`quickselect(nums, k)\` with a Lomuto partition in Python.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and loops; partitioning and pivots are explained from scratch.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the Python programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

A teacher has 30 exam papers in a messy pile and wants the paper with the **10th lowest** score — not a fully sorted pile, just that one paper.

Sorting all 30 is wasteful. Instead she grabs a random paper — say it scored 62 — and makes two piles: papers below 62 on the left, papers 62 and above on the right. She counts the left pile: 14 papers. So the 10th lowest is somewhere in that left pile, and the right pile can go straight back in the drawer. She repeats with the left pile only: grab a paper, split, count, throw away the side that cannot contain it. Each round she handles fewer papers, and soon she is holding the one she wants.

That is Quickselect. It is quicksort's splitting step, but after each split it keeps **only one side**. Quicksort has to sort both sides; Quickselect throws one away. That single change takes the average cost from O(n log n) down to O(n).

## 2. What Are We Looking For?

📌 **Interview term: Order statistic** — the kth smallest value of a collection. The 1st order statistic is the minimum, the nth is the maximum, the middle one is the median.

Everything is easier with **0-based target indices**: the kth smallest is the value that would sit at index \`k - 1\` if the array were sorted, and the kth largest is the value at index \`n - k\`. For \`[3, 2, 1, 5, 6, 4]\` (n = 6) the 2nd largest is at sorted index 4, which holds 5.

Two simple answers exist before Quickselect:

- **Sort, then index** — O(n log n). Correct and short; usually the first thing to say.
- **A heap of size k** — O(n log k). Covered in [Find the kth largest element in an array](/interview-question/kth-largest-element); when to choose it over Quickselect is in [heap vs quickselect](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w).

Quickselect beats both on average: O(n).

## 3. The Building Block: Partition

📌 **Interview term: Pivot** — the element chosen to split the range. After partitioning, everything left of it is smaller and everything right of it is greater or equal.

📌 **Interview term: Partition (Lomuto scheme)** — move the pivot to the end, sweep \`j\` from \`lo\` to \`hi - 1\` keeping a \`store\` index, swap every element smaller than the pivot to \`store\`, and finally swap the pivot into \`store\`. One pass, O(length of the range), in place.

The magic fact: **after partitioning, the pivot is at its final sorted position \`p\`.** Every smaller element is to its left, so exactly \`p\` elements are smaller — that is the definition of sorted index \`p\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 670 284" role="img" aria-label="Partition around pivot 8. Four smaller values to the left, the pivot at index 4, three larger values to the right. Index 3 is in the left part">
  <defs>
    <marker id="b04q4-a-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="60" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="90.0" y="67.0" text-anchor="middle">7</text>
  <text class="d-sub" x="90.0" y="102" text-anchor="middle">i=0</text>
  <rect class="d-box" x="130" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="160.0" y="67.0" text-anchor="middle">4</text>
  <text class="d-sub" x="160.0" y="102" text-anchor="middle">i=1</text>
  <rect class="d-box" x="200" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="230.0" y="67.0" text-anchor="middle">3</text>
  <text class="d-sub" x="230.0" y="102" text-anchor="middle">i=2</text>
  <rect class="d-box" x="270" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="300.0" y="67.0" text-anchor="middle">1</text>
  <text class="d-sub" x="300.0" y="102" text-anchor="middle">i=3</text>
  <rect class="d-box-accent" x="340" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="370.0" y="67.0" text-anchor="middle">8</text>
  <text class="d-sub" x="370.0" y="102" text-anchor="middle">i=4</text>
  <rect class="d-box-muted" x="410" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="440.0" y="67.0" text-anchor="middle">15</text>
  <text class="d-sub" x="440.0" y="102" text-anchor="middle">i=5</text>
  <rect class="d-box-muted" x="480" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="510.0" y="67.0" text-anchor="middle">10</text>
  <text class="d-sub" x="510.0" y="102" text-anchor="middle">i=6</text>
  <rect class="d-box-muted" x="550" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="580.0" y="67.0" text-anchor="middle">20</text>
  <text class="d-sub" x="580.0" y="102" text-anchor="middle">i=7</text>
  <rect class="d-box" x="60" y="130" width="270" height="40" rx="8"/>
  <text class="d-sub" x="195" y="155" text-anchor="middle">less than 8 (indices 0 to 3)</text>
  <rect class="d-box-accent" x="340" y="130" width="60" height="40" rx="8"/>
  <text class="d-sub" x="370" y="155" text-anchor="middle">p = 4</text>
  <rect class="d-box-muted" x="410" y="130" width="200" height="40" rx="8"/>
  <text class="d-sub" x="510" y="155" text-anchor="middle">8 or more</text>
  <path class="d-edge-accent" d="M 195 174 L 195 214" marker-end="url(#b04q4-a-python)"/>
  <rect class="d-box-accent" x="60" y="220" width="270" height="44" rx="8"/>
  <text class="d-sub" x="195" y="247" text-anchor="middle">k = 3 is here: keep this part</text>
  <rect class="d-box-muted" x="410" y="220" width="200" height="44" rx="8"/>
  <text class="d-sub" x="510" y="247" text-anchor="middle">never looked at again</text>
</svg>

Round 1 of Example 2 picked pivot 8 and produced \`[7, 4, 3, 1, 8, 15, 10, 20]\`, so 8 is at \`p = 4\`. We want index \`k = 3\`, which is less than 4, so the answer is among the four elements on the left. The right side is never touched again. Partition is the same step quicksort uses — see [How do merge sort and quicksort work?](/interview-question/how-do-merge-sort-and-quicksort-work)

## 4. Quickselect: Keep Only One Side

📌 **Interview term: Quickselect** — repeat: partition the live range \`lo..hi\`, getting the pivot index \`p\`. If \`p == k\`, return it. If \`k < p\`, continue on \`lo..p-1\`. If \`k > p\`, continue on \`p+1..hi\`.

The full run of Example 2, finding index 3 (the 4th smallest) in \`[7, 10, 4, 3, 20, 15, 1, 8]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 292" role="img" aria-label="Three Quickselect rounds on 7 10 4 3 20 15 1 8 looking for index 3. The live range shrinks from 0 to 7, to 0 to 3, to 1 to 3, and ends at index 3 with value 7">
  <defs>
    <marker id="b04q4-b-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="66.0" y="55.0" text-anchor="middle">7</text>
  <rect class="d-box" x="100" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="126.0" y="55.0" text-anchor="middle">10</text>
  <rect class="d-box" x="160" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="186.0" y="55.0" text-anchor="middle">4</text>
  <rect class="d-box" x="220" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="246.0" y="55.0" text-anchor="middle">3</text>
  <rect class="d-box" x="280" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="306.0" y="55.0" text-anchor="middle">20</text>
  <rect class="d-box" x="340" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="366.0" y="55.0" text-anchor="middle">15</text>
  <rect class="d-box" x="400" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="426.0" y="55.0" text-anchor="middle">1</text>
  <rect class="d-box" x="460" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="55.0" text-anchor="middle">8</text>
  <text class="d-sub" x="540" y="55">before: pick pivot 8</text>
  <rect class="d-box" x="40" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="66.0" y="119.0" text-anchor="middle">7</text>
  <rect class="d-box" x="100" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="126.0" y="119.0" text-anchor="middle">4</text>
  <rect class="d-box" x="160" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="186.0" y="119.0" text-anchor="middle">3</text>
  <rect class="d-box" x="220" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="246.0" y="119.0" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="280" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="306.0" y="119.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="340" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="366.0" y="119.0" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="400" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="426.0" y="119.0" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="460" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="119.0" text-anchor="middle">20</text>
  <text class="d-sub" x="540" y="119">p = 4, k is left</text>
  <rect class="d-box-accent" x="40" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="66.0" y="183.0" text-anchor="middle">1</text>
  <rect class="d-box" x="100" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="126.0" y="183.0" text-anchor="middle">4</text>
  <rect class="d-box" x="160" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="186.0" y="183.0" text-anchor="middle">3</text>
  <rect class="d-box" x="220" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="246.0" y="183.0" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="280" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="306.0" y="183.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="340" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="366.0" y="183.0" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="400" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="426.0" y="183.0" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="460" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="183.0" text-anchor="middle">20</text>
  <text class="d-sub" x="540" y="183">pivot 1: p = 0, k is right</text>
  <rect class="d-box-muted" x="40" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="66.0" y="247.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="100" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="126.0" y="247.0" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="160" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="186.0" y="247.0" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="220" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="246.0" y="247.0" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="280" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="306.0" y="247.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="340" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="366.0" y="247.0" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="400" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="426.0" y="247.0" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="460" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="247.0" text-anchor="middle">20</text>
  <text class="d-sub" x="540" y="247">pivot 7: p = 3 = k, done</text>
</svg>

Three partitions, and the answer is 7. A sorted copy confirms \`sorted(nums)[3] == 7\`. Because each round only shrinks the range and never needs to come back, Quickselect is naturally a \`while\` loop — no recursion, no stack.

## 5. Why the Average Is O(n) and the Worst Case Is O(n²)

If the pivot lands roughly in the middle each time, the rounds cost about n, then n/2, then n/4, and so on:

<svg class="iq-diagram" width="100%" viewBox="0 0 790 270" role="img" aria-label="Work per round when each pivot splits the range roughly in half. n, then n over 2, n over 4 and so on, adding up to at most 2n">
  <defs>
    <marker id="b04q4-c-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="24" width="480" height="34" rx="6"/>
  <text class="d-sub" x="280.0" y="46" text-anchor="middle">n</text>
  <rect class="d-box" x="40" y="72" width="240" height="34" rx="6"/>
  <text class="d-sub" x="160.0" y="94" text-anchor="middle">n / 2</text>
  <rect class="d-box" x="40" y="120" width="120" height="34" rx="6"/>
  <text class="d-sub" x="100.0" y="142" text-anchor="middle">n / 4</text>
  <rect class="d-box-muted" x="40" y="168" width="60" height="34" rx="6"/>
  <text class="d-sub" x="120" y="190">n / 8</text>
  <rect class="d-box-muted" x="40" y="216" width="30" height="34" rx="6"/>
  <text class="d-sub" x="90" y="238">...</text>
  <rect class="d-box-accent" x="560" y="24" width="200" height="226" rx="10"/>
  <text class="d-text" x="660" y="120" text-anchor="middle">total</text>
  <text class="d-text d-accent" x="660" y="150" text-anchor="middle">at most 2n</text>
</svg>

The series \`n + n/2 + n/4 + ...\` never exceeds \`2n\`, so the expected cost is linear.

📌 **Interview term: Expected (average) time** — the running time averaged over the random pivot choices. With random pivots, Quickselect is O(n) expected for *every* input; no particular input is bad, only unlucky dice.

The worst case is a pivot that is the smallest or largest every time: each round removes only one element, giving \`n + (n-1) + (n-2) + ...\`, which is O(n²). Example 3 measures it on 2,000 elements, looking for the median:

| Input | Last element as pivot | Random pivot | Three-way partition, random pivot |
| :--- | :--- | :--- | :--- |
| ascending \`0..1999\` | 1,499,500 | 4,627 | 4,688 |
| shuffled | 7,865 | 7,260 | 5,780 |
| all equal | 1,500,499 | 1,500,499 | 2,000 |

(numbers are element-vs-pivot comparisons, copied from the Example 3 run)

📌 **Interview term: Randomized pivot** — choosing the pivot uniformly at random. It makes the sorted-input disaster (1,499,500 comparisons) disappear (4,627).

The last row is the surprise: with **all equal** values, even a random pivot is quadratic, because Lomuto puts every equal element on one side. The fix is a three-way partition.

📌 **Interview term: Three-way partition (Dutch national flag)** — split into \`< pivot\`, \`== pivot\`, \`> pivot\`. If \`k\` falls inside the equal block, you are done immediately — 2,000 comparisons on the all-equal input. It is the same idea as [sorting 0s, 1s and 2s](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s).

📌 **Interview term: Median of medians** — a deterministic pivot rule (groups of five, take the median of their medians) that guarantees O(n) even in the worst case. It is rarely coded in interviews because its constant factor is large; name it as the answer to "can you guarantee linear time?".

## 6. The Python Solution, Line by Line

~~~python
def partition(a, lo, hi, pivot_index):
    """Lomuto partition of a[lo..hi]. Returns the pivot final index p:
    everything left of p is < pivot, everything right of p is >= pivot."""
    a[pivot_index], a[hi] = a[hi], a[pivot_index]   # park the pivot at the end
    pivot = a[hi]
    store = lo
    for j in range(lo, hi):
        if a[j] < pivot:
            a[store], a[j] = a[j], a[store]
            store += 1
    a[store], a[hi] = a[hi], a[store]               # pivot lands in its sorted place
    return store
~~~

~~~python
def quickselect(nums, k):
    """Value that would sit at index k (0-based) if nums were sorted."""
    a = list(nums)                                  # work on a copy; caller keeps its order
    lo, hi = 0, len(a) - 1
    while True:                                     # a loop, not recursion: no stack growth
        if lo == hi:
            return a[lo]
        p = partition(a, lo, hi, lo + rand(hi - lo + 1))
        if p == k:
            return a[p]
        if k < p:
            hi = p - 1                              # answer is in the left part only
        else:
            lo = p + 1                              # answer is in the right part only
~~~

- \`a[i], a[j] = a[j], a[i]\` swaps without a temporary variable: the right side builds a tuple first, then unpacks it.
- \`a = list(nums)\` copies the input. Partition rearranges the list in place; without the copy, the caller's list would come back shuffled.
- \`lo + rand(hi - lo + 1)\` picks a pivot index in \`lo..hi\`. In production you would use \`random.randrange(lo, hi + 1)\`; the examples use a tiny seeded generator so the trace is the same in every language.
- \`while True\` with \`lo\`/\`hi\` updates replaces the textbook recursion. Each iteration only narrows the range, so nothing needs to be remembered.
- \`kth_largest\` is just \`quickselect(nums, len(nums) - k)\`: the kth largest is the element at sorted index \`n - k\`.

## 7. Python Details That Matter

- **Recursion depth.** A recursive Quickselect with a last-element pivot on \`list(range(2000))\` raised \`RecursionError: maximum recursion depth exceeded\` in our run, because the default limit is 1000 frames (\`sys.getrecursionlimit()\` printed \`1000\`). The loop version has no depth at all.
- **\`heapq.nsmallest(k, nums)[-1]\`** returns the kth smallest in O(n log k) with a short call; its docstring says it is equivalent to \`sorted(iterable, key=key)[:n]\`. Good to mention as the practical one-liner.
- **Speed in CPython.** \`sorted()\` runs in C, while a hand-written Quickselect runs Python bytecode for every comparison. In one run on our machine with 200,000 random floats, \`sorted(a)[1000]\` took 0.038 s and the pure-Python Quickselect 0.032 s — the O(n) algorithm only just won. Big-O describes growth, not constant factors; say this if the interviewer asks what you would ship.
- **Comparing mixed types.** Python 3 refuses to order \`int\` and \`str\` (\`TypeError\`), so a mixed list fails fast instead of giving nonsense.

## 8. Verified: Running the Code

Every program below was saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13.16). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — Quickselect for the kth smallest and kth largest on eight inputs**

~~~text
7
3
20
5
4
42
5
-1
~~~

**Example 2 — Trace every partition round and check against a sorted copy**

~~~text
find index 3 in [7, 10, 4, 3, 20, 15, 1, 8]
  round 1: range [0..7] pivot 8 -> [7, 4, 3, 1, 8, 15, 10, 20] p=4, k < p, keep the left part
  round 2: range [0..3] pivot 1 -> [1, 4, 3, 7, 8, 15, 10, 20] p=0, k > p, keep the right part
  round 3: range [1..3] pivot 7 -> [1, 4, 3, 7, 8, 15, 10, 20] p=3, p == k, done
4th smallest = 7 | sorted check: 7
input unchanged: [7, 10, 4, 3, 20, 15, 1, 8]
~~~

The pivots come from a tiny seeded generator (MINSTD), so all four languages pick the same pivots and print the same rounds. With a different seed the rounds change, but the answer never does.

**Example 3 — Count comparisons: last-element pivot vs random pivot vs three-way partition**

~~~text
n = 2000 k = 1000 (the median)
ascending: last-pivot 1499500, random-pivot 4627, three-way 4688 | answers 1000 1000 1000
shuffled: last-pivot 7865, random-pivot 7260, three-way 5780 | answers 1000 1000 1000
all equal: last-pivot 1500499, random-pivot 1500499, three-way 2000 | answers 7 7 7
~~~

Each strategy is run on the same three 2,000-element arrays, looking for index 1,000. The quadratic rows are about n squared over 2.67, matching the \`n + (n-1) + ...\` sum from index 1,999 down to 1,000.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`sorted(nums)[k - 1]\` | O(n log n) | O(n) | Sorts a full copy |
| \`heapq.nsmallest(k, nums)[-1]\` | O(n log k) | O(k) | Heap of size k |
| Quickselect, random pivot (average) | O(n) | O(n) for the copy, O(1) in place | \`n + n/2 + ...\` is at most \`2n\` |
| Quickselect, worst case | O(n²) | same | One element removed per round: 1,499,500 comparisons in Example 3 |
| Median of medians | O(n) worst case | O(1) to O(log n) | Guaranteed good pivot, big constant |

## 10. Edge Cases

- **k out of range** — \`k < 1\` or \`k > n\` has no answer; validate before the loop.
- **One element** — \`lo == hi\` immediately; return it (\`[42]\`, k = 1 gives 42).
- **Duplicates** — \`[5, 5, 5, 5]\`, k = 2 returns 5, and \`[3, 2, 3, 1, 2, 4, 5, 5, 6]\` with the 4th largest returns 4. Correct, but see the all-equal row above for speed.
- **Negative numbers** — no special handling: \`[-1, -3, -2]\`, largest is -1.
- **The caller still needs the original order** — partition rearranges the array; work on a copy (our code does) or document that the input is modified.
- **k smallest values, not just the kth** — after Quickselect returns, the first \`k\` positions of the working array hold the k smallest values (in no particular order). That is a free bonus.

## 11. Common Pitfalls

- **Mixing up k and the index.** The kth smallest is index \`k - 1\`; the kth largest is index \`n - k\`.
- **Recursing with a fixed pivot.** On sorted input the recursion is n deep and Python raises \`RecursionError\` at about 1000 frames.
- **Always picking the last element as pivot.** Sorted input becomes quadratic (1,499,500 comparisons vs 4,627 with a random pivot).
- **Ignoring duplicates.** All-equal input stays quadratic with Lomuto even with a random pivot; use a three-way partition.
- **Modifying the caller's list.** Partition is in place; copy first or say so.
- **Slicing sub-lists.** \`quickselect(a[:p], k)\` copies each round; work with \`lo\`/\`hi\` indices instead.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Partition around a pivot: the pivot ends at its sorted index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p</code>. If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p == k</code> I am done; otherwise I keep <strong style="color:#ffca28;">only</strong> the side that contains <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. kth largest:</strong> <span style="color:#f0e2c8;">Same function with target index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - k</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">Average O(n) because the work is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n + n/2 + n/4 + ...</code> at most <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2n</code>; worst case O(n²) with bad pivots; O(1) extra space in place.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Making it robust:</strong> <span style="color:#f0e2c8;">Random pivot, a three-way partition for duplicates (all-equal input dropped from 1,500,499 to 2,000 comparisons in my test), median of medians if O(n) must be guaranteed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python notes:</strong> <span style="color:#f0e2c8;">Write it as a loop — a recursive version hit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RecursionError</code> on 2,000 sorted items — copy the list first, and mention <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq.nsmallest</code> as the practical alternatives.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is Quickselect O(n) on average but quicksort is O(n log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Quicksort recurses into <strong style="color:#ffca28;">both</strong> sides, so every level of the recursion still touches all n elements. Quickselect drops one side, so each level costs about half of the previous one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the k smallest elements, not just the kth?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After Quickselect finishes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[:k]</code> holds the k smallest values, unordered. Sort just that slice if order matters: O(n + k log k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose a heap instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the data is a stream, does not fit in memory, or must not be reordered: a size-k heap needs only O(k) memory and one pass.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with many duplicates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Lomuto sends all equal values to one side, so all-equal input is quadratic even with random pivots. A three-way partition returns as soon as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> lands in the equal block.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">heapq.nsmallest</code> Quickselect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It uses a heap of size k, so it is O(n log k). It is often the right practical choice in Python because it runs in C.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Order statistic** | The kth smallest value; min, max and median are special cases |
| **Pivot** | The element a partition splits around |
| **Partition (Lomuto scheme)** | One pass that puts smaller elements left of the pivot and leaves the pivot at its sorted index |
| **Quickselect** | Partition, then continue only in the side that contains index k |
| **Expected (average) time** | Running time averaged over random pivot choices: O(n) here |
| **Randomized pivot** | Pick the pivot at random so no fixed input is a worst case |
| **Three-way partition (Dutch national flag)** | Split into less, equal and greater; fixes many duplicates |
| **Median of medians** | Pivot rule that guarantees O(n) worst case, with a large constant |

---
**Conclusion:** Quickselect is quicksort with one side thrown away: partition puts the pivot at its sorted index, and you continue only where the target index lives, so the average work is \`n + n/2 + ...\`, about 2n. The runs show both faces of it — 4,627 comparisons with a random pivot on sorted input, 1,499,500 with a fixed one, and 1,500,499 on all-equal input until a three-way partition brings it to 2,000. In Python, write it as a loop over \`lo\`/\`hi\`, copy the list first, and be ready to say that \`sorted\` or \`heapq.nsmallest\` may still win in practice because they run in C.
`,
        examples: [
          { label: "Quickselect for the kth smallest and kth largest on eight inputs", code: `seed = 12345


def rand(k):
    """MINSTD generator: the same pseudo-random pivots in every language."""
    global seed
    seed = seed * 48271 % 2147483647
    return seed % k


def partition(a, lo, hi, pivot_index):
    """Lomuto partition of a[lo..hi]. Returns the pivot final index p:
    everything left of p is < pivot, everything right of p is >= pivot."""
    a[pivot_index], a[hi] = a[hi], a[pivot_index]   # park the pivot at the end
    pivot = a[hi]
    store = lo
    for j in range(lo, hi):
        if a[j] < pivot:
            a[store], a[j] = a[j], a[store]
            store += 1
    a[store], a[hi] = a[hi], a[store]               # pivot lands in its sorted place
    return store


def quickselect(nums, k):
    """Value that would sit at index k (0-based) if nums were sorted."""
    a = list(nums)                                  # work on a copy; caller keeps its order
    lo, hi = 0, len(a) - 1
    while True:                                     # a loop, not recursion: no stack growth
        if lo == hi:
            return a[lo]
        p = partition(a, lo, hi, lo + rand(hi - lo + 1))
        if p == k:
            return a[p]
        if k < p:
            hi = p - 1                              # answer is in the left part only
        else:
            lo = p + 1                              # answer is in the right part only


def kth_smallest(nums, k):
    return quickselect(nums, k - 1)


def kth_largest(nums, k):
    return quickselect(nums, len(nums) - k)


print(kth_smallest([7, 10, 4, 3, 20, 15], 3))            # 7
print(kth_smallest([7, 10, 4, 3, 20, 15], 1))            # 3
print(kth_smallest([7, 10, 4, 3, 20, 15], 6))            # 20
print(kth_largest([3, 2, 1, 5, 6, 4], 2))                # 5
print(kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4))       # 4
print(kth_smallest([42], 1))                             # 42
print(kth_smallest([5, 5, 5, 5], 2))                     # 5
print(kth_largest([-1, -3, -2], 1))                      # -1` },
          { label: "Trace every partition round and check against a sorted copy", code: `seed = 12345


def rand(k):
    global seed
    seed = seed * 48271 % 2147483647
    return seed % k


def fmt(a):
    return "[" + ", ".join(str(x) for x in a) + "]"


def partition(a, lo, hi, pivot_index):
    a[pivot_index], a[hi] = a[hi], a[pivot_index]
    pivot = a[hi]
    store = lo
    for j in range(lo, hi):
        if a[j] < pivot:
            a[store], a[j] = a[j], a[store]
            store += 1
    a[store], a[hi] = a[hi], a[store]
    return store


def quickselect_traced(nums, k):
    a = list(nums)
    lo, hi, rounds = 0, len(a) - 1, 0
    print("find index", k, "in", fmt(a))
    while True:
        if lo == hi:
            print(f"  range [{lo}..{hi}] has one element -> answer {a[lo]}")
            return a[lo]
        rounds += 1
        pivot_index = lo + rand(hi - lo + 1)
        pivot = a[pivot_index]
        p = partition(a, lo, hi, pivot_index)
        if p == k:
            decision = "p == k, done"
        elif k < p:
            decision = "k < p, keep the left part"
        else:
            decision = "k > p, keep the right part"
        print(f"  round {rounds}: range [{lo}..{hi}] pivot {pivot} -> {fmt(a)} p={p}, {decision}")
        if p == k:
            return a[p]
        if k < p:
            hi = p - 1
        else:
            lo = p + 1


nums = [7, 10, 4, 3, 20, 15, 1, 8]
answer = quickselect_traced(nums, 3)       # the 4th smallest
print("4th smallest =", answer, "| sorted check:", sorted(nums)[3])
print("input unchanged:", fmt(nums))` },
          { label: "Count comparisons: last-element pivot vs random pivot vs three-way partition", code: `# How much work does Quickselect do? Count element-vs-pivot comparisons.
seed = 12345


def rand(k):
    global seed
    seed = seed * 48271 % 2147483647
    return seed % k


def lomuto_select(nums, k, random_pivot):
    """Two-way (Lomuto) partition; pivot is the last element or a random one."""
    a = list(nums)
    lo, hi, compares = 0, len(a) - 1, 0
    while lo < hi:
        pi = lo + rand(hi - lo + 1) if random_pivot else hi
        a[pi], a[hi] = a[hi], a[pi]
        pivot, store = a[hi], lo
        for j in range(lo, hi):
            compares += 1
            if a[j] < pivot:
                a[store], a[j] = a[j], a[store]
                store += 1
        a[store], a[hi] = a[hi], a[store]
        if store == k:
            break
        if k < store:
            hi = store - 1
        else:
            lo = store + 1
    return a[k], compares


def three_way_select(nums, k):
    """Three-way (Dutch national flag) partition: < pivot | == pivot | > pivot."""
    a = list(nums)
    lo, hi, compares = 0, len(a) - 1, 0
    while lo < hi:
        pivot = a[lo + rand(hi - lo + 1)]
        lt, i, gt = lo, lo, hi
        while i <= gt:
            compares += 1
            if a[i] < pivot:
                a[lt], a[i] = a[i], a[lt]
                lt += 1
                i += 1
            elif a[i] > pivot:
                a[i], a[gt] = a[gt], a[i]
                gt -= 1
            else:
                i += 1
        if k < lt:
            hi = lt - 1
        elif k > gt:
            lo = gt + 1
        else:
            return pivot, compares          # k falls inside the block of equals
    return a[k], compares


N = 2000
K = N // 2
ascending = list(range(N))
all_equal = [7] * N
shuffled = list(range(N))
seed = 999
for i in range(N - 1, 0, -1):               # Fisher-Yates with the portable generator
    j = rand(i + 1)
    shuffled[i], shuffled[j] = shuffled[j], shuffled[i]

print("n =", N, "k =", K, "(the median)")
for name, data in [("ascending", ascending), ("shuffled", shuffled), ("all equal", all_equal)]:
    seed = 12345
    v1, c1 = lomuto_select(data, K, False)
    seed = 12345
    v2, c2 = lomuto_select(data, K, True)
    seed = 12345
    v3, c3 = three_way_select(data, K)
    print(f"{name}: last-pivot {c1}, random-pivot {c2}, three-way {c3} | answers {v1} {v2} {v3}")` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Explain how Quickselect finds the kth smallest element of an unsorted array without sorting it, then implement it in JavaScript. Also tell me how you would get the kth largest, and what its running time is."

**What a strong answer should cover:**
- The baselines: sort then index in O(n log n) (with a numeric comparator) and a heap in O(n log k).
- Partition places the pivot at its final sorted index \`p\`; Quickselect keeps only the side that contains the target index. kth largest is index \`n - k\`.
- Average O(n), worst case O(n²), O(1) extra space in place.
- Random pivots, three-way partition for duplicates, median of medians for a guaranteed O(n).
- JavaScript specifics: \`sort()\` without a comparator sorts as strings, \`nums.slice()\` to avoid mutating the caller's array, a loop instead of recursion (deep recursion throws \`RangeError\`), and \`Math.random\` is not seedable for reproducible tests.

**Code / implementation expected:** Yes — an iterative in-place \`quickselect(nums, k)\` with a Lomuto partition in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and loops; partitioning and pivots are explained from scratch.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the JavaScript programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

A teacher has 30 exam papers in a messy pile and wants the paper with the **10th lowest** score — not a fully sorted pile, just that one paper.

Sorting all 30 is wasteful. Instead she grabs a random paper — say it scored 62 — and makes two piles: papers below 62 on the left, papers 62 and above on the right. She counts the left pile: 14 papers. So the 10th lowest is somewhere in that left pile, and the right pile can go straight back in the drawer. She repeats with the left pile only: grab a paper, split, count, throw away the side that cannot contain it. Each round she handles fewer papers, and soon she is holding the one she wants.

That is Quickselect. It is quicksort's splitting step, but after each split it keeps **only one side**. Quicksort has to sort both sides; Quickselect throws one away. That single change takes the average cost from O(n log n) down to O(n).

## 2. What Are We Looking For?

📌 **Interview term: Order statistic** — the kth smallest value of a collection. The 1st order statistic is the minimum, the nth is the maximum, the middle one is the median.

Everything is easier with **0-based target indices**: the kth smallest is the value that would sit at index \`k - 1\` if the array were sorted, and the kth largest is the value at index \`n - k\`. For \`[3, 2, 1, 5, 6, 4]\` (n = 6) the 2nd largest is at sorted index 4, which holds 5.

Two simple answers exist before Quickselect:

- **Sort, then index** — O(n log n). Correct and short; usually the first thing to say.
- **A heap of size k** — O(n log k). Covered in [Find the kth largest element in an array](/interview-question/kth-largest-element); when to choose it over Quickselect is in [heap vs quickselect](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w).

Quickselect beats both on average: O(n).

## 3. The Building Block: Partition

📌 **Interview term: Pivot** — the element chosen to split the range. After partitioning, everything left of it is smaller and everything right of it is greater or equal.

📌 **Interview term: Partition (Lomuto scheme)** — move the pivot to the end, sweep \`j\` from \`lo\` to \`hi - 1\` keeping a \`store\` index, swap every element smaller than the pivot to \`store\`, and finally swap the pivot into \`store\`. One pass, O(length of the range), in place.

The magic fact: **after partitioning, the pivot is at its final sorted position \`p\`.** Every smaller element is to its left, so exactly \`p\` elements are smaller — that is the definition of sorted index \`p\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 670 284" role="img" aria-label="Partition around pivot 8. Four smaller values to the left, the pivot at index 4, three larger values to the right. Index 3 is in the left part">
  <defs>
    <marker id="b04q4-a-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="60" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="90.0" y="67.0" text-anchor="middle">7</text>
  <text class="d-sub" x="90.0" y="102" text-anchor="middle">i=0</text>
  <rect class="d-box" x="130" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="160.0" y="67.0" text-anchor="middle">4</text>
  <text class="d-sub" x="160.0" y="102" text-anchor="middle">i=1</text>
  <rect class="d-box" x="200" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="230.0" y="67.0" text-anchor="middle">3</text>
  <text class="d-sub" x="230.0" y="102" text-anchor="middle">i=2</text>
  <rect class="d-box" x="270" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="300.0" y="67.0" text-anchor="middle">1</text>
  <text class="d-sub" x="300.0" y="102" text-anchor="middle">i=3</text>
  <rect class="d-box-accent" x="340" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="370.0" y="67.0" text-anchor="middle">8</text>
  <text class="d-sub" x="370.0" y="102" text-anchor="middle">i=4</text>
  <rect class="d-box-muted" x="410" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="440.0" y="67.0" text-anchor="middle">15</text>
  <text class="d-sub" x="440.0" y="102" text-anchor="middle">i=5</text>
  <rect class="d-box-muted" x="480" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="510.0" y="67.0" text-anchor="middle">10</text>
  <text class="d-sub" x="510.0" y="102" text-anchor="middle">i=6</text>
  <rect class="d-box-muted" x="550" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="580.0" y="67.0" text-anchor="middle">20</text>
  <text class="d-sub" x="580.0" y="102" text-anchor="middle">i=7</text>
  <rect class="d-box" x="60" y="130" width="270" height="40" rx="8"/>
  <text class="d-sub" x="195" y="155" text-anchor="middle">less than 8 (indices 0 to 3)</text>
  <rect class="d-box-accent" x="340" y="130" width="60" height="40" rx="8"/>
  <text class="d-sub" x="370" y="155" text-anchor="middle">p = 4</text>
  <rect class="d-box-muted" x="410" y="130" width="200" height="40" rx="8"/>
  <text class="d-sub" x="510" y="155" text-anchor="middle">8 or more</text>
  <path class="d-edge-accent" d="M 195 174 L 195 214" marker-end="url(#b04q4-a-javascript)"/>
  <rect class="d-box-accent" x="60" y="220" width="270" height="44" rx="8"/>
  <text class="d-sub" x="195" y="247" text-anchor="middle">k = 3 is here: keep this part</text>
  <rect class="d-box-muted" x="410" y="220" width="200" height="44" rx="8"/>
  <text class="d-sub" x="510" y="247" text-anchor="middle">never looked at again</text>
</svg>

Round 1 of Example 2 picked pivot 8 and produced \`[7, 4, 3, 1, 8, 15, 10, 20]\`, so 8 is at \`p = 4\`. We want index \`k = 3\`, which is less than 4, so the answer is among the four elements on the left. The right side is never touched again. Partition is the same step quicksort uses — see [How do merge sort and quicksort work?](/interview-question/how-do-merge-sort-and-quicksort-work)

## 4. Quickselect: Keep Only One Side

📌 **Interview term: Quickselect** — repeat: partition the live range \`lo..hi\`, getting the pivot index \`p\`. If \`p == k\`, return it. If \`k < p\`, continue on \`lo..p-1\`. If \`k > p\`, continue on \`p+1..hi\`.

The full run of Example 2, finding index 3 (the 4th smallest) in \`[7, 10, 4, 3, 20, 15, 1, 8]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 292" role="img" aria-label="Three Quickselect rounds on 7 10 4 3 20 15 1 8 looking for index 3. The live range shrinks from 0 to 7, to 0 to 3, to 1 to 3, and ends at index 3 with value 7">
  <defs>
    <marker id="b04q4-b-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="66.0" y="55.0" text-anchor="middle">7</text>
  <rect class="d-box" x="100" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="126.0" y="55.0" text-anchor="middle">10</text>
  <rect class="d-box" x="160" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="186.0" y="55.0" text-anchor="middle">4</text>
  <rect class="d-box" x="220" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="246.0" y="55.0" text-anchor="middle">3</text>
  <rect class="d-box" x="280" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="306.0" y="55.0" text-anchor="middle">20</text>
  <rect class="d-box" x="340" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="366.0" y="55.0" text-anchor="middle">15</text>
  <rect class="d-box" x="400" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="426.0" y="55.0" text-anchor="middle">1</text>
  <rect class="d-box" x="460" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="55.0" text-anchor="middle">8</text>
  <text class="d-sub" x="540" y="55">before: pick pivot 8</text>
  <rect class="d-box" x="40" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="66.0" y="119.0" text-anchor="middle">7</text>
  <rect class="d-box" x="100" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="126.0" y="119.0" text-anchor="middle">4</text>
  <rect class="d-box" x="160" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="186.0" y="119.0" text-anchor="middle">3</text>
  <rect class="d-box" x="220" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="246.0" y="119.0" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="280" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="306.0" y="119.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="340" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="366.0" y="119.0" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="400" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="426.0" y="119.0" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="460" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="119.0" text-anchor="middle">20</text>
  <text class="d-sub" x="540" y="119">p = 4, k is left</text>
  <rect class="d-box-accent" x="40" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="66.0" y="183.0" text-anchor="middle">1</text>
  <rect class="d-box" x="100" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="126.0" y="183.0" text-anchor="middle">4</text>
  <rect class="d-box" x="160" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="186.0" y="183.0" text-anchor="middle">3</text>
  <rect class="d-box" x="220" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="246.0" y="183.0" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="280" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="306.0" y="183.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="340" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="366.0" y="183.0" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="400" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="426.0" y="183.0" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="460" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="183.0" text-anchor="middle">20</text>
  <text class="d-sub" x="540" y="183">pivot 1: p = 0, k is right</text>
  <rect class="d-box-muted" x="40" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="66.0" y="247.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="100" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="126.0" y="247.0" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="160" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="186.0" y="247.0" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="220" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="246.0" y="247.0" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="280" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="306.0" y="247.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="340" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="366.0" y="247.0" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="400" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="426.0" y="247.0" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="460" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="247.0" text-anchor="middle">20</text>
  <text class="d-sub" x="540" y="247">pivot 7: p = 3 = k, done</text>
</svg>

Three partitions, and the answer is 7. A sorted copy confirms \`sorted(nums)[3] == 7\`. Because each round only shrinks the range and never needs to come back, Quickselect is naturally a \`while\` loop — no recursion, no stack.

## 5. Why the Average Is O(n) and the Worst Case Is O(n²)

If the pivot lands roughly in the middle each time, the rounds cost about n, then n/2, then n/4, and so on:

<svg class="iq-diagram" width="100%" viewBox="0 0 790 270" role="img" aria-label="Work per round when each pivot splits the range roughly in half. n, then n over 2, n over 4 and so on, adding up to at most 2n">
  <defs>
    <marker id="b04q4-c-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="24" width="480" height="34" rx="6"/>
  <text class="d-sub" x="280.0" y="46" text-anchor="middle">n</text>
  <rect class="d-box" x="40" y="72" width="240" height="34" rx="6"/>
  <text class="d-sub" x="160.0" y="94" text-anchor="middle">n / 2</text>
  <rect class="d-box" x="40" y="120" width="120" height="34" rx="6"/>
  <text class="d-sub" x="100.0" y="142" text-anchor="middle">n / 4</text>
  <rect class="d-box-muted" x="40" y="168" width="60" height="34" rx="6"/>
  <text class="d-sub" x="120" y="190">n / 8</text>
  <rect class="d-box-muted" x="40" y="216" width="30" height="34" rx="6"/>
  <text class="d-sub" x="90" y="238">...</text>
  <rect class="d-box-accent" x="560" y="24" width="200" height="226" rx="10"/>
  <text class="d-text" x="660" y="120" text-anchor="middle">total</text>
  <text class="d-text d-accent" x="660" y="150" text-anchor="middle">at most 2n</text>
</svg>

The series \`n + n/2 + n/4 + ...\` never exceeds \`2n\`, so the expected cost is linear.

📌 **Interview term: Expected (average) time** — the running time averaged over the random pivot choices. With random pivots, Quickselect is O(n) expected for *every* input; no particular input is bad, only unlucky dice.

The worst case is a pivot that is the smallest or largest every time: each round removes only one element, giving \`n + (n-1) + (n-2) + ...\`, which is O(n²). Example 3 measures it on 2,000 elements, looking for the median:

| Input | Last element as pivot | Random pivot | Three-way partition, random pivot |
| :--- | :--- | :--- | :--- |
| ascending \`0..1999\` | 1,499,500 | 4,627 | 4,688 |
| shuffled | 7,865 | 7,260 | 5,780 |
| all equal | 1,500,499 | 1,500,499 | 2,000 |

(numbers are element-vs-pivot comparisons, copied from the Example 3 run)

📌 **Interview term: Randomized pivot** — choosing the pivot uniformly at random. It makes the sorted-input disaster (1,499,500 comparisons) disappear (4,627).

The last row is the surprise: with **all equal** values, even a random pivot is quadratic, because Lomuto puts every equal element on one side. The fix is a three-way partition.

📌 **Interview term: Three-way partition (Dutch national flag)** — split into \`< pivot\`, \`== pivot\`, \`> pivot\`. If \`k\` falls inside the equal block, you are done immediately — 2,000 comparisons on the all-equal input. It is the same idea as [sorting 0s, 1s and 2s](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s).

📌 **Interview term: Median of medians** — a deterministic pivot rule (groups of five, take the median of their medians) that guarantees O(n) even in the worst case. It is rarely coded in interviews because its constant factor is large; name it as the answer to "can you guarantee linear time?".

## 6. The JavaScript Solution, Line by Line

~~~javascript
function partition(a, lo, hi, pivotIndex) {
  swap(a, pivotIndex, hi);                 // park the pivot at the end
  const pivot = a[hi];
  let store = lo;
  for (let j = lo; j < hi; j++) {
    if (a[j] < pivot) { swap(a, store, j); store++; }
  }
  swap(a, store, hi);                      // pivot lands in its sorted place
  return store;
}
~~~

~~~javascript
function quickselect(nums, k) {
  const a = nums.slice();                  // work on a copy; caller keeps its order
  let lo = 0, hi = a.length - 1;
  while (true) {                           // a loop, not recursion: no stack growth
    if (lo === hi) return a[lo];
    const p = partition(a, lo, hi, lo + rand(hi - lo + 1));
    if (p === k) return a[p];
    if (k < p) hi = p - 1;                 // answer is in the left part only
    else lo = p + 1;                       // answer is in the right part only
  }
}
~~~

- \`swap(a, i, j)\` uses a temporary variable. Destructuring (\`[a[i], a[j]] = [a[j], a[i]]\`) is shorter but creates a throwaway array on every swap, which matters in a hot loop.
- \`nums.slice()\` copies the array so the caller's order survives.
- \`lo + rand(hi - lo + 1)\` picks a pivot index in \`lo..hi\`. In production use \`lo + Math.floor(Math.random() * (hi - lo + 1))\`; the examples use a seeded generator so every language picks the same pivots.
- \`while (true)\` with \`lo\`/\`hi\` updates replaces recursion; every iteration narrows the range.
- \`kthLargest\` calls \`quickselect(nums, nums.length - k)\`.

## 7. JavaScript Details That Matter

- **The sort baseline needs a comparator.** \`nums.slice().sort((a, b) => a - b)[k - 1]\`. Without it, \`[10, 9, 1, 100].sort()\` printed \`[1,10,100,9]\` in our run, because the default sort compares string forms.
- **Recursion depth.** A recursive last-pivot Quickselect on a sorted array of 20,000 numbers threw \`RangeError: Maximum call stack size exceeded\` in Node 22 (2,000 was fine). The loop version has no depth.
- **No built-in selection or heap.** The standard library has \`sort\` but nothing like C++ \`nth_element\` or a priority queue; you write Quickselect (or a heap) yourself.
- **Reproducible tests.** \`Math.random()\` cannot be seeded; Example 3 uses MINSTD (\`seed * 48271 % 2147483647\`), whose products stay below 2^53 so the double arithmetic is exact.
- **Typed arrays.** For large numeric inputs, an \`Int32Array\` or \`Float64Array\` stores values compactly, and its own \`sort()\` compares numerically.

## 8. Verified: Running the Code

Every program below was saved as \`main.js\` and run with \`node main.js\` (Node.js v22.22.0). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — Quickselect for the kth smallest and kth largest on eight inputs**

~~~text
7
3
20
5
4
42
5
-1
~~~

**Example 2 — Trace every partition round and check against a sorted copy**

~~~text
find index 3 in [7, 10, 4, 3, 20, 15, 1, 8]
  round 1: range [0..7] pivot 8 -> [7, 4, 3, 1, 8, 15, 10, 20] p=4, k < p, keep the left part
  round 2: range [0..3] pivot 1 -> [1, 4, 3, 7, 8, 15, 10, 20] p=0, k > p, keep the right part
  round 3: range [1..3] pivot 7 -> [1, 4, 3, 7, 8, 15, 10, 20] p=3, p == k, done
4th smallest = 7 | sorted check: 7
input unchanged: [7, 10, 4, 3, 20, 15, 1, 8]
~~~

The pivots come from a tiny seeded generator (MINSTD), so all four languages pick the same pivots and print the same rounds. With a different seed the rounds change, but the answer never does.

**Example 3 — Count comparisons: last-element pivot vs random pivot vs three-way partition**

~~~text
n = 2000 k = 1000 (the median)
ascending: last-pivot 1499500, random-pivot 4627, three-way 4688 | answers 1000 1000 1000
shuffled: last-pivot 7865, random-pivot 7260, three-way 5780 | answers 1000 1000 1000
all equal: last-pivot 1500499, random-pivot 1500499, three-way 2000 | answers 7 7 7
~~~

Each strategy is run on the same three 2,000-element arrays, looking for index 1,000. The quadratic rows are about n squared over 2.67, matching the \`n + (n-1) + ...\` sum from index 1,999 down to 1,000.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`slice().sort((a, b) => a - b)[k - 1]\` | O(n log n) | O(n) | Sorts a full copy |
| Heap of size k (hand-written) | O(n log k) | O(k) | See the kth-largest question |
| Quickselect, random pivot (average) | O(n) | O(n) for the copy, O(1) in place | \`n + n/2 + ...\` is at most \`2n\` |
| Quickselect, worst case | O(n²) | same | One element removed per round: 1,499,500 comparisons in Example 3 |
| Median of medians | O(n) worst case | O(1) to O(log n) | Guaranteed good pivot, big constant |

## 10. Edge Cases

- **k out of range** — \`k < 1\` or \`k > n\` has no answer; validate before the loop.
- **One element** — \`lo == hi\` immediately; return it (\`[42]\`, k = 1 gives 42).
- **Duplicates** — \`[5, 5, 5, 5]\`, k = 2 returns 5, and \`[3, 2, 3, 1, 2, 4, 5, 5, 6]\` with the 4th largest returns 4. Correct, but see the all-equal row above for speed.
- **Negative numbers** — no special handling: \`[-1, -3, -2]\`, largest is -1.
- **The caller still needs the original order** — partition rearranges the array; work on a copy (our code does) or document that the input is modified.
- **k smallest values, not just the kth** — after Quickselect returns, the first \`k\` positions of the working array hold the k smallest values (in no particular order). That is a free bonus.

## 11. Common Pitfalls

- **Sorting without a comparator** for the baseline or the check — string order, wrong answer.
- **Mixing up k and the index.** kth smallest is index \`k - 1\`; kth largest is \`n - k\`.
- **Recursing with a fixed pivot.** Sorted input of 20,000 numbers overflowed the stack in our Node run.
- **Always using the last element as pivot.** 1,499,500 comparisons on sorted input vs 4,627 with a random pivot.
- **Ignoring duplicates.** All-equal input stays quadratic with Lomuto; use a three-way partition.
- **Mutating the input.** Partition is in place; \`slice()\` first or document it.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Partition around a pivot: it lands at its sorted index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p</code>. If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p === k</code> I am done; otherwise I keep <strong style="color:#ffca28;">only</strong> the side containing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. kth largest:</strong> <span style="color:#f0e2c8;">Same function with target index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums.length - k</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">Average O(n) because the work is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n + n/2 + ...</code> at most <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2n</code>; worst case O(n²); O(1) extra space in place.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Making it robust:</strong> <span style="color:#f0e2c8;">Random pivot, three-way partition for duplicates (all-equal input went from 1,500,499 to 2,000 comparisons in my test), median of medians for a guaranteed O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript notes:</strong> <span style="color:#f0e2c8;">A loop, not recursion (deep recursion throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice()</code> before partitioning, and a numeric comparator in any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort</code> baseline.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is Quickselect O(n) on average but quicksort is O(n log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Quicksort recurses into both sides, so each level touches all n elements. Quickselect keeps one side, so each level costs about half the previous one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nums.sort()[nums.length - k]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without a comparator it sorts as strings; with one it is correct but O(n log n) and it mutates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the k smallest elements?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After Quickselect, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.slice(0, k)</code> holds them, unordered; sort that slice if needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose a heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a stream, or when memory must stay O(k), or when the input must not be reordered.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with many duplicates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Lomuto puts all equal values on one side, so all-equal input is quadratic even with random pivots. A three-way partition returns as soon as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> lands in the equal block.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Order statistic** | The kth smallest value; min, max and median are special cases |
| **Pivot** | The element a partition splits around |
| **Partition (Lomuto scheme)** | One pass that puts smaller elements left of the pivot and leaves the pivot at its sorted index |
| **Quickselect** | Partition, then continue only in the side that contains index k |
| **Expected (average) time** | Running time averaged over random pivot choices: O(n) here |
| **Randomized pivot** | Pick the pivot at random so no fixed input is a worst case |
| **Three-way partition (Dutch national flag)** | Split into less, equal and greater; fixes many duplicates |
| **Median of medians** | Pivot rule that guarantees O(n) worst case, with a large constant |

---
**Conclusion:** Quickselect keeps quicksort's partition and drops one side: the pivot lands at its sorted index, and you continue only where the target index lives, for about 2n work on average. The runs show the danger zones — 1,499,500 comparisons with a fixed pivot on sorted input and 1,500,499 on all-equal input — and the fixes: random pivots and a three-way partition. In JavaScript, write it as a loop, copy with \`slice()\`, and never trust the default \`sort()\` for the baseline.
`,
        examples: [
          { label: "Quickselect for the kth smallest and kth largest on eight inputs", code: `let seed = 12345;

// MINSTD generator: the same pseudo-random pivots in every language.
function rand(k) {
  seed = (seed * 48271) % 2147483647;
  return seed % k;
}

function swap(a, i, j) {
  const t = a[i]; a[i] = a[j]; a[j] = t;
}

// Lomuto partition of a[lo..hi]. Returns the pivot final index p:
// everything left of p is < pivot, everything right of p is >= pivot.
function partition(a, lo, hi, pivotIndex) {
  swap(a, pivotIndex, hi);                 // park the pivot at the end
  const pivot = a[hi];
  let store = lo;
  for (let j = lo; j < hi; j++) {
    if (a[j] < pivot) { swap(a, store, j); store++; }
  }
  swap(a, store, hi);                      // pivot lands in its sorted place
  return store;
}

// Value that would sit at index k (0-based) if nums were sorted.
function quickselect(nums, k) {
  const a = nums.slice();                  // work on a copy; caller keeps its order
  let lo = 0, hi = a.length - 1;
  while (true) {                           // a loop, not recursion: no stack growth
    if (lo === hi) return a[lo];
    const p = partition(a, lo, hi, lo + rand(hi - lo + 1));
    if (p === k) return a[p];
    if (k < p) hi = p - 1;                 // answer is in the left part only
    else lo = p + 1;                       // answer is in the right part only
  }
}

function kthSmallest(nums, k) { return quickselect(nums, k - 1); }
function kthLargest(nums, k) { return quickselect(nums, nums.length - k); }

console.log(kthSmallest([7, 10, 4, 3, 20, 15], 3));            // 7
console.log(kthSmallest([7, 10, 4, 3, 20, 15], 1));            // 3
console.log(kthSmallest([7, 10, 4, 3, 20, 15], 6));            // 20
console.log(kthLargest([3, 2, 1, 5, 6, 4], 2));                // 5
console.log(kthLargest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4));       // 4
console.log(kthSmallest([42], 1));                             // 42
console.log(kthSmallest([5, 5, 5, 5], 2));                     // 5
console.log(kthLargest([-1, -3, -2], 1));                      // -1` },
          { label: "Trace every partition round and check against a sorted copy", code: `let seed = 12345;
function rand(k) {
  seed = (seed * 48271) % 2147483647;
  return seed % k;
}

function fmt(a) { return '[' + a.join(', ') + ']'; }

function swap(a, i, j) { const t = a[i]; a[i] = a[j]; a[j] = t; }

function partition(a, lo, hi, pivotIndex) {
  swap(a, pivotIndex, hi);
  const pivot = a[hi];
  let store = lo;
  for (let j = lo; j < hi; j++) {
    if (a[j] < pivot) { swap(a, store, j); store++; }
  }
  swap(a, store, hi);
  return store;
}

function quickselectTraced(nums, k) {
  const a = nums.slice();
  let lo = 0, hi = a.length - 1, rounds = 0;
  console.log('find index ' + k + ' in ' + fmt(a));
  while (true) {
    if (lo === hi) {
      console.log('  range [' + lo + '..' + hi + '] has one element -> answer ' + a[lo]);
      return a[lo];
    }
    rounds++;
    const pivotIndex = lo + rand(hi - lo + 1);
    const pivot = a[pivotIndex];
    const p = partition(a, lo, hi, pivotIndex);
    let decision;
    if (p === k) decision = 'p == k, done';
    else if (k < p) decision = 'k < p, keep the left part';
    else decision = 'k > p, keep the right part';
    console.log('  round ' + rounds + ': range [' + lo + '..' + hi + '] pivot ' + pivot + ' -> ' + fmt(a) + ' p=' + p + ', ' + decision);
    if (p === k) return a[p];
    if (k < p) hi = p - 1;
    else lo = p + 1;
  }
}

const nums = [7, 10, 4, 3, 20, 15, 1, 8];
const answer = quickselectTraced(nums, 3);   // the 4th smallest
const sorted = nums.slice().sort((x, y) => x - y);  // numeric comparator; the default sorts as strings
console.log('4th smallest = ' + answer + ' | sorted check: ' + sorted[3]);
console.log('input unchanged: ' + fmt(nums));` },
          { label: "Count comparisons: last-element pivot vs random pivot vs three-way partition", code: `// How much work does Quickselect do? Count element-vs-pivot comparisons.
let seed = 12345;
function rand(k) {
  seed = (seed * 48271) % 2147483647;
  return seed % k;
}
function swap(a, i, j) { const t = a[i]; a[i] = a[j]; a[j] = t; }

// Two-way (Lomuto) partition; pivot is the last element or a random one.
function lomutoSelect(nums, k, randomPivot) {
  const a = nums.slice();
  let lo = 0, hi = a.length - 1, compares = 0;
  while (lo < hi) {
    const pi = randomPivot ? lo + rand(hi - lo + 1) : hi;
    swap(a, pi, hi);
    const pivot = a[hi];
    let store = lo;
    for (let j = lo; j < hi; j++) {
      compares++;
      if (a[j] < pivot) { swap(a, store, j); store++; }
    }
    swap(a, store, hi);
    if (store === k) break;
    if (k < store) hi = store - 1;
    else lo = store + 1;
  }
  return [a[k], compares];
}

// Three-way (Dutch national flag) partition: < pivot | == pivot | > pivot.
function threeWaySelect(nums, k) {
  const a = nums.slice();
  let lo = 0, hi = a.length - 1, compares = 0;
  while (lo < hi) {
    const pivot = a[lo + rand(hi - lo + 1)];
    let lt = lo, i = lo, gt = hi;
    while (i <= gt) {
      compares++;
      if (a[i] < pivot) { swap(a, lt, i); lt++; i++; }
      else if (a[i] > pivot) { swap(a, i, gt); gt--; }
      else i++;
    }
    if (k < lt) hi = lt - 1;
    else if (k > gt) lo = gt + 1;
    else return [pivot, compares];        // k falls inside the block of equals
  }
  return [a[k], compares];
}

const N = 2000, K = N / 2;
const ascending = Array.from({ length: N }, (_, i) => i);
const allEqual = new Array(N).fill(7);
const shuffled = ascending.slice();
seed = 999;
for (let i = N - 1; i > 0; i--) {          // Fisher-Yates with the portable generator
  const j = rand(i + 1);
  swap(shuffled, i, j);
}

console.log('n = ' + N + ' k = ' + K + ' (the median)');
for (const [name, data] of [['ascending', ascending], ['shuffled', shuffled], ['all equal', allEqual]]) {
  seed = 12345;
  const [v1, c1] = lomutoSelect(data, K, false);
  seed = 12345;
  const [v2, c2] = lomutoSelect(data, K, true);
  seed = 12345;
  const [v3, c3] = threeWaySelect(data, K);
  console.log(name + ': last-pivot ' + c1 + ', random-pivot ' + c2 + ', three-way ' + c3 + ' | answers ' + v1 + ' ' + v2 + ' ' + v3);
}` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Explain how Quickselect finds the kth smallest element of an unsorted \`int\` array without sorting it, then implement it in Java. Also tell me how you would get the kth largest, and what its running time is."

**What a strong answer should cover:**
- The baselines: \`Arrays.sort\` then index in O(n log n) and a \`PriorityQueue\` in O(n log k).
- Partition places the pivot at its final sorted index \`p\`; Quickselect keeps only the side that contains the target index. kth largest is index \`n - k\`.
- Average O(n), worst case O(n²), O(1) extra space in place.
- Random pivots, three-way partition for duplicates, median of medians for a guaranteed O(n).
- Java specifics: \`nums.clone()\` so the caller's array is unchanged, a loop instead of recursion (\`StackOverflowError\`), \`ThreadLocalRandom\` for pivots, \`long\` counters, and working on \`int[]\` rather than \`List<Integer>\` to avoid boxing.

**Code / implementation expected:** Yes — an iterative in-place \`static int quickselect(int[] nums, int k)\` with a Lomuto partition in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and loops; partitioning and pivots are explained from scratch.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the Java programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

A teacher has 30 exam papers in a messy pile and wants the paper with the **10th lowest** score — not a fully sorted pile, just that one paper.

Sorting all 30 is wasteful. Instead she grabs a random paper — say it scored 62 — and makes two piles: papers below 62 on the left, papers 62 and above on the right. She counts the left pile: 14 papers. So the 10th lowest is somewhere in that left pile, and the right pile can go straight back in the drawer. She repeats with the left pile only: grab a paper, split, count, throw away the side that cannot contain it. Each round she handles fewer papers, and soon she is holding the one she wants.

That is Quickselect. It is quicksort's splitting step, but after each split it keeps **only one side**. Quicksort has to sort both sides; Quickselect throws one away. That single change takes the average cost from O(n log n) down to O(n).

## 2. What Are We Looking For?

📌 **Interview term: Order statistic** — the kth smallest value of a collection. The 1st order statistic is the minimum, the nth is the maximum, the middle one is the median.

Everything is easier with **0-based target indices**: the kth smallest is the value that would sit at index \`k - 1\` if the array were sorted, and the kth largest is the value at index \`n - k\`. For \`[3, 2, 1, 5, 6, 4]\` (n = 6) the 2nd largest is at sorted index 4, which holds 5.

Two simple answers exist before Quickselect:

- **Sort, then index** — O(n log n). Correct and short; usually the first thing to say.
- **A heap of size k** — O(n log k). Covered in [Find the kth largest element in an array](/interview-question/kth-largest-element); when to choose it over Quickselect is in [heap vs quickselect](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w).

Quickselect beats both on average: O(n).

## 3. The Building Block: Partition

📌 **Interview term: Pivot** — the element chosen to split the range. After partitioning, everything left of it is smaller and everything right of it is greater or equal.

📌 **Interview term: Partition (Lomuto scheme)** — move the pivot to the end, sweep \`j\` from \`lo\` to \`hi - 1\` keeping a \`store\` index, swap every element smaller than the pivot to \`store\`, and finally swap the pivot into \`store\`. One pass, O(length of the range), in place.

The magic fact: **after partitioning, the pivot is at its final sorted position \`p\`.** Every smaller element is to its left, so exactly \`p\` elements are smaller — that is the definition of sorted index \`p\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 670 284" role="img" aria-label="Partition around pivot 8. Four smaller values to the left, the pivot at index 4, three larger values to the right. Index 3 is in the left part">
  <defs>
    <marker id="b04q4-a-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="60" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="90.0" y="67.0" text-anchor="middle">7</text>
  <text class="d-sub" x="90.0" y="102" text-anchor="middle">i=0</text>
  <rect class="d-box" x="130" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="160.0" y="67.0" text-anchor="middle">4</text>
  <text class="d-sub" x="160.0" y="102" text-anchor="middle">i=1</text>
  <rect class="d-box" x="200" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="230.0" y="67.0" text-anchor="middle">3</text>
  <text class="d-sub" x="230.0" y="102" text-anchor="middle">i=2</text>
  <rect class="d-box" x="270" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="300.0" y="67.0" text-anchor="middle">1</text>
  <text class="d-sub" x="300.0" y="102" text-anchor="middle">i=3</text>
  <rect class="d-box-accent" x="340" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="370.0" y="67.0" text-anchor="middle">8</text>
  <text class="d-sub" x="370.0" y="102" text-anchor="middle">i=4</text>
  <rect class="d-box-muted" x="410" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="440.0" y="67.0" text-anchor="middle">15</text>
  <text class="d-sub" x="440.0" y="102" text-anchor="middle">i=5</text>
  <rect class="d-box-muted" x="480" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="510.0" y="67.0" text-anchor="middle">10</text>
  <text class="d-sub" x="510.0" y="102" text-anchor="middle">i=6</text>
  <rect class="d-box-muted" x="550" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="580.0" y="67.0" text-anchor="middle">20</text>
  <text class="d-sub" x="580.0" y="102" text-anchor="middle">i=7</text>
  <rect class="d-box" x="60" y="130" width="270" height="40" rx="8"/>
  <text class="d-sub" x="195" y="155" text-anchor="middle">less than 8 (indices 0 to 3)</text>
  <rect class="d-box-accent" x="340" y="130" width="60" height="40" rx="8"/>
  <text class="d-sub" x="370" y="155" text-anchor="middle">p = 4</text>
  <rect class="d-box-muted" x="410" y="130" width="200" height="40" rx="8"/>
  <text class="d-sub" x="510" y="155" text-anchor="middle">8 or more</text>
  <path class="d-edge-accent" d="M 195 174 L 195 214" marker-end="url(#b04q4-a-java)"/>
  <rect class="d-box-accent" x="60" y="220" width="270" height="44" rx="8"/>
  <text class="d-sub" x="195" y="247" text-anchor="middle">k = 3 is here: keep this part</text>
  <rect class="d-box-muted" x="410" y="220" width="200" height="44" rx="8"/>
  <text class="d-sub" x="510" y="247" text-anchor="middle">never looked at again</text>
</svg>

Round 1 of Example 2 picked pivot 8 and produced \`[7, 4, 3, 1, 8, 15, 10, 20]\`, so 8 is at \`p = 4\`. We want index \`k = 3\`, which is less than 4, so the answer is among the four elements on the left. The right side is never touched again. Partition is the same step quicksort uses — see [How do merge sort and quicksort work?](/interview-question/how-do-merge-sort-and-quicksort-work)

## 4. Quickselect: Keep Only One Side

📌 **Interview term: Quickselect** — repeat: partition the live range \`lo..hi\`, getting the pivot index \`p\`. If \`p == k\`, return it. If \`k < p\`, continue on \`lo..p-1\`. If \`k > p\`, continue on \`p+1..hi\`.

The full run of Example 2, finding index 3 (the 4th smallest) in \`[7, 10, 4, 3, 20, 15, 1, 8]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 292" role="img" aria-label="Three Quickselect rounds on 7 10 4 3 20 15 1 8 looking for index 3. The live range shrinks from 0 to 7, to 0 to 3, to 1 to 3, and ends at index 3 with value 7">
  <defs>
    <marker id="b04q4-b-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="66.0" y="55.0" text-anchor="middle">7</text>
  <rect class="d-box" x="100" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="126.0" y="55.0" text-anchor="middle">10</text>
  <rect class="d-box" x="160" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="186.0" y="55.0" text-anchor="middle">4</text>
  <rect class="d-box" x="220" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="246.0" y="55.0" text-anchor="middle">3</text>
  <rect class="d-box" x="280" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="306.0" y="55.0" text-anchor="middle">20</text>
  <rect class="d-box" x="340" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="366.0" y="55.0" text-anchor="middle">15</text>
  <rect class="d-box" x="400" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="426.0" y="55.0" text-anchor="middle">1</text>
  <rect class="d-box" x="460" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="55.0" text-anchor="middle">8</text>
  <text class="d-sub" x="540" y="55">before: pick pivot 8</text>
  <rect class="d-box" x="40" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="66.0" y="119.0" text-anchor="middle">7</text>
  <rect class="d-box" x="100" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="126.0" y="119.0" text-anchor="middle">4</text>
  <rect class="d-box" x="160" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="186.0" y="119.0" text-anchor="middle">3</text>
  <rect class="d-box" x="220" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="246.0" y="119.0" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="280" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="306.0" y="119.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="340" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="366.0" y="119.0" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="400" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="426.0" y="119.0" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="460" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="119.0" text-anchor="middle">20</text>
  <text class="d-sub" x="540" y="119">p = 4, k is left</text>
  <rect class="d-box-accent" x="40" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="66.0" y="183.0" text-anchor="middle">1</text>
  <rect class="d-box" x="100" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="126.0" y="183.0" text-anchor="middle">4</text>
  <rect class="d-box" x="160" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="186.0" y="183.0" text-anchor="middle">3</text>
  <rect class="d-box" x="220" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="246.0" y="183.0" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="280" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="306.0" y="183.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="340" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="366.0" y="183.0" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="400" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="426.0" y="183.0" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="460" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="183.0" text-anchor="middle">20</text>
  <text class="d-sub" x="540" y="183">pivot 1: p = 0, k is right</text>
  <rect class="d-box-muted" x="40" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="66.0" y="247.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="100" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="126.0" y="247.0" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="160" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="186.0" y="247.0" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="220" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="246.0" y="247.0" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="280" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="306.0" y="247.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="340" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="366.0" y="247.0" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="400" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="426.0" y="247.0" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="460" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="247.0" text-anchor="middle">20</text>
  <text class="d-sub" x="540" y="247">pivot 7: p = 3 = k, done</text>
</svg>

Three partitions, and the answer is 7. A sorted copy confirms \`sorted(nums)[3] == 7\`. Because each round only shrinks the range and never needs to come back, Quickselect is naturally a \`while\` loop — no recursion, no stack.

## 5. Why the Average Is O(n) and the Worst Case Is O(n²)

If the pivot lands roughly in the middle each time, the rounds cost about n, then n/2, then n/4, and so on:

<svg class="iq-diagram" width="100%" viewBox="0 0 790 270" role="img" aria-label="Work per round when each pivot splits the range roughly in half. n, then n over 2, n over 4 and so on, adding up to at most 2n">
  <defs>
    <marker id="b04q4-c-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="24" width="480" height="34" rx="6"/>
  <text class="d-sub" x="280.0" y="46" text-anchor="middle">n</text>
  <rect class="d-box" x="40" y="72" width="240" height="34" rx="6"/>
  <text class="d-sub" x="160.0" y="94" text-anchor="middle">n / 2</text>
  <rect class="d-box" x="40" y="120" width="120" height="34" rx="6"/>
  <text class="d-sub" x="100.0" y="142" text-anchor="middle">n / 4</text>
  <rect class="d-box-muted" x="40" y="168" width="60" height="34" rx="6"/>
  <text class="d-sub" x="120" y="190">n / 8</text>
  <rect class="d-box-muted" x="40" y="216" width="30" height="34" rx="6"/>
  <text class="d-sub" x="90" y="238">...</text>
  <rect class="d-box-accent" x="560" y="24" width="200" height="226" rx="10"/>
  <text class="d-text" x="660" y="120" text-anchor="middle">total</text>
  <text class="d-text d-accent" x="660" y="150" text-anchor="middle">at most 2n</text>
</svg>

The series \`n + n/2 + n/4 + ...\` never exceeds \`2n\`, so the expected cost is linear.

📌 **Interview term: Expected (average) time** — the running time averaged over the random pivot choices. With random pivots, Quickselect is O(n) expected for *every* input; no particular input is bad, only unlucky dice.

The worst case is a pivot that is the smallest or largest every time: each round removes only one element, giving \`n + (n-1) + (n-2) + ...\`, which is O(n²). Example 3 measures it on 2,000 elements, looking for the median:

| Input | Last element as pivot | Random pivot | Three-way partition, random pivot |
| :--- | :--- | :--- | :--- |
| ascending \`0..1999\` | 1,499,500 | 4,627 | 4,688 |
| shuffled | 7,865 | 7,260 | 5,780 |
| all equal | 1,500,499 | 1,500,499 | 2,000 |

(numbers are element-vs-pivot comparisons, copied from the Example 3 run)

📌 **Interview term: Randomized pivot** — choosing the pivot uniformly at random. It makes the sorted-input disaster (1,499,500 comparisons) disappear (4,627).

The last row is the surprise: with **all equal** values, even a random pivot is quadratic, because Lomuto puts every equal element on one side. The fix is a three-way partition.

📌 **Interview term: Three-way partition (Dutch national flag)** — split into \`< pivot\`, \`== pivot\`, \`> pivot\`. If \`k\` falls inside the equal block, you are done immediately — 2,000 comparisons on the all-equal input. It is the same idea as [sorting 0s, 1s and 2s](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s).

📌 **Interview term: Median of medians** — a deterministic pivot rule (groups of five, take the median of their medians) that guarantees O(n) even in the worst case. It is rarely coded in interviews because its constant factor is large; name it as the answer to "can you guarantee linear time?".

## 6. The Java Solution, Line by Line

~~~java
static int partition(int[] a, int lo, int hi, int pivotIndex) {
    swap(a, pivotIndex, hi);                 // park the pivot at the end
    int pivot = a[hi];
    int store = lo;
    for (int j = lo; j < hi; j++) {
        if (a[j] < pivot) { swap(a, store, j); store++; }
    }
    swap(a, store, hi);                      // pivot lands in its sorted place
    return store;
}
~~~

~~~java
static int quickselect(int[] nums, int k) {
    int[] a = nums.clone();                  // work on a copy; caller keeps its order
    int lo = 0, hi = a.length - 1;
    while (true) {                           // a loop, not recursion: no stack growth
        if (lo == hi) return a[lo];
        int p = partition(a, lo, hi, lo + rand(hi - lo + 1));
        if (p == k) return a[p];
        if (k < p) hi = p - 1;               // answer is in the left part only
        else lo = p + 1;                     // answer is in the right part only
    }
}
~~~

- \`nums.clone()\` makes a shallow copy of the \`int[]\`; for primitives that is a full independent copy, so the caller's order is safe.
- \`lo + rand(hi - lo + 1)\` picks a pivot index in \`lo..hi\`. In production use \`ThreadLocalRandom.current().nextInt(lo, hi + 1)\` (upper bound exclusive); the examples use a seeded MINSTD generator so every language picks the same pivots.
- \`while (true)\` with \`lo\`/\`hi\` updates replaces the recursion; the compiler accepts it without a final \`return\` because the loop can only exit through a \`return\`.
- \`kthLargest\` calls \`quickselect(nums, nums.length - k)\`.

## 7. Java Details That Matter

- **Recursion and the stack.** A recursive version with a fixed pivot recurses n deep on sorted input. In our run with the default thread stack it handled 2,000 sorted ints but threw \`StackOverflowError\` on 100,000 — the iterative loop avoids the question. (The verifier for this page runs Java with \`-Xss64m\`, which hides such problems; do not rely on that in an interview.)
- **\`int[]\`, not \`List<Integer>\`.** A \`List<Integer>\` stores boxed objects: every comparison unboxes, and \`==\` on two \`Integer\`s compares references (our run printed \`false\` for two \`Integer\`s holding 1000). Primitive arrays are faster and safer here.
- **\`long\` for counters.** Example 3 counts 1,500,499 comparisons — fine for \`int\`, but comparison counts grow as n squared, and at n = 100,000 the worst case would exceed \`Integer.MAX_VALUE\`.
- **The sort baseline.** \`int[] c = nums.clone(); Arrays.sort(c); return c[k - 1];\` — \`Arrays.sort\` on primitives sorts in place and returns \`void\`.

## 8. Verified: Running the Code

Every program below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21.0.12). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — Quickselect for the kth smallest and kth largest on eight inputs**

~~~text
7
3
20
5
4
42
5
-1
~~~

**Example 2 — Trace every partition round and check against a sorted copy**

~~~text
find index 3 in [7, 10, 4, 3, 20, 15, 1, 8]
  round 1: range [0..7] pivot 8 -> [7, 4, 3, 1, 8, 15, 10, 20] p=4, k < p, keep the left part
  round 2: range [0..3] pivot 1 -> [1, 4, 3, 7, 8, 15, 10, 20] p=0, k > p, keep the right part
  round 3: range [1..3] pivot 7 -> [1, 4, 3, 7, 8, 15, 10, 20] p=3, p == k, done
4th smallest = 7 | sorted check: 7
input unchanged: [7, 10, 4, 3, 20, 15, 1, 8]
~~~

The pivots come from a tiny seeded generator (MINSTD), so all four languages pick the same pivots and print the same rounds. With a different seed the rounds change, but the answer never does.

**Example 3 — Count comparisons: last-element pivot vs random pivot vs three-way partition**

~~~text
n = 2000 k = 1000 (the median)
ascending: last-pivot 1499500, random-pivot 4627, three-way 4688 | answers 1000 1000 1000
shuffled: last-pivot 7865, random-pivot 7260, three-way 5780 | answers 1000 1000 1000
all equal: last-pivot 1500499, random-pivot 1500499, three-way 2000 | answers 7 7 7
~~~

Each strategy is run on the same three 2,000-element arrays, looking for index 1,000. The quadratic rows are about n squared over 2.67, matching the \`n + (n-1) + ...\` sum from index 1,999 down to 1,000.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`Arrays.sort\` on a copy | O(n log n) | O(n) | Sorts everything |
| \`PriorityQueue\` of size k | O(n log k) | O(k) | See the kth-largest question |
| Quickselect, random pivot (average) | O(n) | O(n) for the clone, O(1) in place | \`n + n/2 + ...\` is at most \`2n\` |
| Quickselect, worst case | O(n²) | same | One element removed per round: 1,499,500 comparisons in Example 3 |
| Median of medians | O(n) worst case | O(1) to O(log n) | Guaranteed good pivot, big constant |

## 10. Edge Cases

- **k out of range** — \`k < 1\` or \`k > n\` has no answer; validate before the loop.
- **One element** — \`lo == hi\` immediately; return it (\`[42]\`, k = 1 gives 42).
- **Duplicates** — \`[5, 5, 5, 5]\`, k = 2 returns 5, and \`[3, 2, 3, 1, 2, 4, 5, 5, 6]\` with the 4th largest returns 4. Correct, but see the all-equal row above for speed.
- **Negative numbers** — no special handling: \`[-1, -3, -2]\`, largest is -1.
- **The caller still needs the original order** — partition rearranges the array; work on a copy (our code does) or document that the input is modified.
- **k smallest values, not just the kth** — after Quickselect returns, the first \`k\` positions of the working array hold the k smallest values (in no particular order). That is a free bonus.

## 11. Common Pitfalls

- **Mixing up k and the index.** kth smallest is index \`k - 1\`; kth largest is \`nums.length - k\`.
- **Recursing with a fixed pivot.** Sorted input recurses n deep and can throw \`StackOverflowError\`.
- **Always using the last element as pivot.** 1,499,500 comparisons on sorted input vs 4,627 with a random pivot.
- **Ignoring duplicates.** All-equal input stays quadratic with Lomuto; use a three-way partition.
- **\`ThreadLocalRandom.nextInt(lo, hi)\`.** The upper bound is exclusive; write \`hi + 1\` or the last element is never chosen.
- **Using \`List<Integer>\` and \`==\`.** Boxing costs time, and \`==\` compares references outside -128..127.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Partition around a pivot: it lands at its sorted index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p</code>. If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p == k</code> I am done; otherwise I keep <strong style="color:#ffca28;">only</strong> the side containing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. kth largest:</strong> <span style="color:#f0e2c8;">Same method with target index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums.length - k</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">Average O(n) because the work is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n + n/2 + ...</code> at most <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2n</code>; worst case O(n²); O(1) extra space in place.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Making it robust:</strong> <span style="color:#f0e2c8;">Random pivot via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ThreadLocalRandom</code>, three-way partition for duplicates (all-equal input went from 1,500,499 to 2,000 comparisons in my test), median of medians for a guaranteed O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java notes:</strong> <span style="color:#f0e2c8;">Iterative loop to avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clone()</code> the input, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List&lt;Integer&gt;</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> counters.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is Quickselect O(n) on average but quicksort is O(n log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Quicksort recurses into both sides, so each level touches all n elements. Quickselect keeps one side, so each level costs about half the previous one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the JDK have a built-in Quickselect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">java.util</code> — there is no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nth_element</code> equivalent. You either sort, use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code>, or write Quickselect.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the k smallest elements?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After Quickselect, indices <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0..k-1</code> of the working array hold them, unordered; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.copyOf(a, k)</code> extracts them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you choose a heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a stream, when memory must stay O(k), or when the input must not be reordered.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with many duplicates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Lomuto puts all equal values on one side, so all-equal input is quadratic even with random pivots. A three-way partition returns as soon as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> lands in the equal block.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Order statistic** | The kth smallest value; min, max and median are special cases |
| **Pivot** | The element a partition splits around |
| **Partition (Lomuto scheme)** | One pass that puts smaller elements left of the pivot and leaves the pivot at its sorted index |
| **Quickselect** | Partition, then continue only in the side that contains index k |
| **Expected (average) time** | Running time averaged over random pivot choices: O(n) here |
| **Randomized pivot** | Pick the pivot at random so no fixed input is a worst case |
| **Three-way partition (Dutch national flag)** | Split into less, equal and greater; fixes many duplicates |
| **Median of medians** | Pivot rule that guarantees O(n) worst case, with a large constant |

---
**Conclusion:** Quickselect keeps quicksort's partition and drops one side: the pivot lands at its sorted index, and you continue only where the target index lives, for about 2n work on average. The comparison counts from the run make the trade-offs concrete — a fixed pivot on sorted input costs 1,499,500 comparisons, a random one 4,627, and all-equal input needs a three-way partition. In Java, write it iteratively on a cloned \`int[]\`, choose pivots with \`ThreadLocalRandom\`, and keep counters in \`long\`.
`,
        examples: [
          { label: "Quickselect for the kth smallest and kth largest on eight inputs", code: `public class Main {
    static long seed = 12345;

    // MINSTD generator: the same pseudo-random pivots in every language.
    static int rand(int k) {
        seed = seed * 48271 % 2147483647L;
        return (int) (seed % k);
    }

    static void swap(int[] a, int i, int j) {
        int t = a[i]; a[i] = a[j]; a[j] = t;
    }

    // Lomuto partition of a[lo..hi]. Returns the pivot final index p:
    // everything left of p is < pivot, everything right of p is >= pivot.
    static int partition(int[] a, int lo, int hi, int pivotIndex) {
        swap(a, pivotIndex, hi);                 // park the pivot at the end
        int pivot = a[hi];
        int store = lo;
        for (int j = lo; j < hi; j++) {
            if (a[j] < pivot) { swap(a, store, j); store++; }
        }
        swap(a, store, hi);                      // pivot lands in its sorted place
        return store;
    }

    // Value that would sit at index k (0-based) if nums were sorted.
    static int quickselect(int[] nums, int k) {
        int[] a = nums.clone();                  // work on a copy; caller keeps its order
        int lo = 0, hi = a.length - 1;
        while (true) {                           // a loop, not recursion: no stack growth
            if (lo == hi) return a[lo];
            int p = partition(a, lo, hi, lo + rand(hi - lo + 1));
            if (p == k) return a[p];
            if (k < p) hi = p - 1;               // answer is in the left part only
            else lo = p + 1;                     // answer is in the right part only
        }
    }

    static int kthSmallest(int[] nums, int k) { return quickselect(nums, k - 1); }
    static int kthLargest(int[] nums, int k) { return quickselect(nums, nums.length - k); }

    public static void main(String[] args) {
        System.out.println(kthSmallest(new int[]{7, 10, 4, 3, 20, 15}, 3));          // 7
        System.out.println(kthSmallest(new int[]{7, 10, 4, 3, 20, 15}, 1));          // 3
        System.out.println(kthSmallest(new int[]{7, 10, 4, 3, 20, 15}, 6));          // 20
        System.out.println(kthLargest(new int[]{3, 2, 1, 5, 6, 4}, 2));              // 5
        System.out.println(kthLargest(new int[]{3, 2, 3, 1, 2, 4, 5, 5, 6}, 4));     // 4
        System.out.println(kthSmallest(new int[]{42}, 1));                           // 42
        System.out.println(kthSmallest(new int[]{5, 5, 5, 5}, 2));                   // 5
        System.out.println(kthLargest(new int[]{-1, -3, -2}, 1));                    // -1
    }
}` },
          { label: "Trace every partition round and check against a sorted copy", code: `import java.util.Arrays;

public class Main {
    static long seed = 12345;
    static int rand(int k) {
        seed = seed * 48271 % 2147483647L;
        return (int) (seed % k);
    }

    static String fmt(int[] a) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < a.length; i++) sb.append(i == 0 ? "" : ", ").append(a[i]);
        return sb.append("]").toString();
    }

    static void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }

    static int partition(int[] a, int lo, int hi, int pivotIndex) {
        swap(a, pivotIndex, hi);
        int pivot = a[hi];
        int store = lo;
        for (int j = lo; j < hi; j++) {
            if (a[j] < pivot) { swap(a, store, j); store++; }
        }
        swap(a, store, hi);
        return store;
    }

    static int quickselectTraced(int[] nums, int k) {
        int[] a = nums.clone();
        int lo = 0, hi = a.length - 1, rounds = 0;
        System.out.println("find index " + k + " in " + fmt(a));
        while (true) {
            if (lo == hi) {
                System.out.println("  range [" + lo + ".." + hi + "] has one element -> answer " + a[lo]);
                return a[lo];
            }
            rounds++;
            int pivotIndex = lo + rand(hi - lo + 1);
            int pivot = a[pivotIndex];
            int p = partition(a, lo, hi, pivotIndex);
            String decision = p == k ? "p == k, done" : (k < p ? "k < p, keep the left part" : "k > p, keep the right part");
            System.out.println("  round " + rounds + ": range [" + lo + ".." + hi + "] pivot " + pivot + " -> " + fmt(a) + " p=" + p + ", " + decision);
            if (p == k) return a[p];
            if (k < p) hi = p - 1;
            else lo = p + 1;
        }
    }

    public static void main(String[] args) {
        int[] nums = {7, 10, 4, 3, 20, 15, 1, 8};
        int answer = quickselectTraced(nums, 3);   // the 4th smallest
        int[] sorted = nums.clone();
        Arrays.sort(sorted);
        System.out.println("4th smallest = " + answer + " | sorted check: " + sorted[3]);
        System.out.println("input unchanged: " + fmt(nums));
    }
}` },
          { label: "Count comparisons: last-element pivot vs random pivot vs three-way partition", code: `public class Main {
    // How much work does Quickselect do? Count element-vs-pivot comparisons.
    static long seed = 12345;
    static int rand(int k) {
        seed = seed * 48271 % 2147483647L;
        return (int) (seed % k);
    }
    static void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }

    static long compares;   // comparison counter (long: the quadratic case is large)

    // Two-way (Lomuto) partition; pivot is the last element or a random one.
    static int lomutoSelect(int[] nums, int k, boolean randomPivot) {
        int[] a = nums.clone();
        int lo = 0, hi = a.length - 1;
        compares = 0;
        while (lo < hi) {
            int pi = randomPivot ? lo + rand(hi - lo + 1) : hi;
            swap(a, pi, hi);
            int pivot = a[hi], store = lo;
            for (int j = lo; j < hi; j++) {
                compares++;
                if (a[j] < pivot) { swap(a, store, j); store++; }
            }
            swap(a, store, hi);
            if (store == k) break;
            if (k < store) hi = store - 1;
            else lo = store + 1;
        }
        return a[k];
    }

    // Three-way (Dutch national flag) partition: < pivot | == pivot | > pivot.
    static int threeWaySelect(int[] nums, int k) {
        int[] a = nums.clone();
        int lo = 0, hi = a.length - 1;
        compares = 0;
        while (lo < hi) {
            int pivot = a[lo + rand(hi - lo + 1)];
            int lt = lo, i = lo, gt = hi;
            while (i <= gt) {
                compares++;
                if (a[i] < pivot) { swap(a, lt, i); lt++; i++; }
                else if (a[i] > pivot) { swap(a, i, gt); gt--; }
                else i++;
            }
            if (k < lt) hi = lt - 1;
            else if (k > gt) lo = gt + 1;
            else return pivot;                 // k falls inside the block of equals
        }
        return a[k];
    }

    public static void main(String[] args) {
        int n = 2000, k = n / 2;
        int[] ascending = new int[n], allEqual = new int[n], shuffled = new int[n];
        for (int i = 0; i < n; i++) { ascending[i] = i; allEqual[i] = 7; shuffled[i] = i; }
        seed = 999;
        for (int i = n - 1; i > 0; i--) swap(shuffled, i, rand(i + 1));   // Fisher-Yates

        System.out.println("n = " + n + " k = " + k + " (the median)");
        String[] names = {"ascending", "shuffled", "all equal"};
        int[][] inputs = {ascending, shuffled, allEqual};
        for (int t = 0; t < 3; t++) {
            seed = 12345;
            int v1 = lomutoSelect(inputs[t], k, false); long c1 = compares;
            seed = 12345;
            int v2 = lomutoSelect(inputs[t], k, true); long c2 = compares;
            seed = 12345;
            int v3 = threeWaySelect(inputs[t], k); long c3 = compares;
            System.out.println(names[t] + ": last-pivot " + c1 + ", random-pivot " + c2 + ", three-way " + c3
                    + " | answers " + v1 + " " + v2 + " " + v3);
        }
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Explain how Quickselect finds the kth smallest element of an unsorted \`std::vector<int>\` without sorting it, then implement it in C++. Also tell me how you would get the kth largest, what its running time is, and what the standard library offers."

**What a strong answer should cover:**
- The baselines: \`std::sort\` then index in O(n log n) and a \`std::priority_queue\` in O(n log k).
- Partition places the pivot at its final sorted index \`p\`; Quickselect keeps only the side that contains the target index. kth largest is index \`n - k\`.
- Average O(n), worst case O(n²), O(1) extra space in place.
- Random pivots, three-way partition for duplicates, median of medians for a guaranteed O(n).
- C++ specifics: \`std::nth_element\` is the library version (libstdc++ implements it as introselect), pass by value when you need a copy, \`<random>\` (\`std::mt19937\`) instead of \`rand()\`, and \`long long\` counters.

**Code / implementation expected:** Yes — an iterative in-place \`int quickselect(std::vector<int> a, int k)\` with a Lomuto partition, plus \`std::nth_element\` as the production answer.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and loops; partitioning and pivots are explained from scratch.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the C++ programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

A teacher has 30 exam papers in a messy pile and wants the paper with the **10th lowest** score — not a fully sorted pile, just that one paper.

Sorting all 30 is wasteful. Instead she grabs a random paper — say it scored 62 — and makes two piles: papers below 62 on the left, papers 62 and above on the right. She counts the left pile: 14 papers. So the 10th lowest is somewhere in that left pile, and the right pile can go straight back in the drawer. She repeats with the left pile only: grab a paper, split, count, throw away the side that cannot contain it. Each round she handles fewer papers, and soon she is holding the one she wants.

That is Quickselect. It is quicksort's splitting step, but after each split it keeps **only one side**. Quicksort has to sort both sides; Quickselect throws one away. That single change takes the average cost from O(n log n) down to O(n).

## 2. What Are We Looking For?

📌 **Interview term: Order statistic** — the kth smallest value of a collection. The 1st order statistic is the minimum, the nth is the maximum, the middle one is the median.

Everything is easier with **0-based target indices**: the kth smallest is the value that would sit at index \`k - 1\` if the array were sorted, and the kth largest is the value at index \`n - k\`. For \`[3, 2, 1, 5, 6, 4]\` (n = 6) the 2nd largest is at sorted index 4, which holds 5.

Two simple answers exist before Quickselect:

- **Sort, then index** — O(n log n). Correct and short; usually the first thing to say.
- **A heap of size k** — O(n log k). Covered in [Find the kth largest element in an array](/interview-question/kth-largest-element); when to choose it over Quickselect is in [heap vs quickselect](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w).

Quickselect beats both on average: O(n).

## 3. The Building Block: Partition

📌 **Interview term: Pivot** — the element chosen to split the range. After partitioning, everything left of it is smaller and everything right of it is greater or equal.

📌 **Interview term: Partition (Lomuto scheme)** — move the pivot to the end, sweep \`j\` from \`lo\` to \`hi - 1\` keeping a \`store\` index, swap every element smaller than the pivot to \`store\`, and finally swap the pivot into \`store\`. One pass, O(length of the range), in place.

The magic fact: **after partitioning, the pivot is at its final sorted position \`p\`.** Every smaller element is to its left, so exactly \`p\` elements are smaller — that is the definition of sorted index \`p\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 670 284" role="img" aria-label="Partition around pivot 8. Four smaller values to the left, the pivot at index 4, three larger values to the right. Index 3 is in the left part">
  <defs>
    <marker id="b04q4-a-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="60" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="90.0" y="67.0" text-anchor="middle">7</text>
  <text class="d-sub" x="90.0" y="102" text-anchor="middle">i=0</text>
  <rect class="d-box" x="130" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="160.0" y="67.0" text-anchor="middle">4</text>
  <text class="d-sub" x="160.0" y="102" text-anchor="middle">i=1</text>
  <rect class="d-box" x="200" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="230.0" y="67.0" text-anchor="middle">3</text>
  <text class="d-sub" x="230.0" y="102" text-anchor="middle">i=2</text>
  <rect class="d-box" x="270" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="300.0" y="67.0" text-anchor="middle">1</text>
  <text class="d-sub" x="300.0" y="102" text-anchor="middle">i=3</text>
  <rect class="d-box-accent" x="340" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="370.0" y="67.0" text-anchor="middle">8</text>
  <text class="d-sub" x="370.0" y="102" text-anchor="middle">i=4</text>
  <rect class="d-box-muted" x="410" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="440.0" y="67.0" text-anchor="middle">15</text>
  <text class="d-sub" x="440.0" y="102" text-anchor="middle">i=5</text>
  <rect class="d-box-muted" x="480" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="510.0" y="67.0" text-anchor="middle">10</text>
  <text class="d-sub" x="510.0" y="102" text-anchor="middle">i=6</text>
  <rect class="d-box-muted" x="550" y="40" width="60" height="44" rx="6"/>
  <text class="d-text" x="580.0" y="67.0" text-anchor="middle">20</text>
  <text class="d-sub" x="580.0" y="102" text-anchor="middle">i=7</text>
  <rect class="d-box" x="60" y="130" width="270" height="40" rx="8"/>
  <text class="d-sub" x="195" y="155" text-anchor="middle">less than 8 (indices 0 to 3)</text>
  <rect class="d-box-accent" x="340" y="130" width="60" height="40" rx="8"/>
  <text class="d-sub" x="370" y="155" text-anchor="middle">p = 4</text>
  <rect class="d-box-muted" x="410" y="130" width="200" height="40" rx="8"/>
  <text class="d-sub" x="510" y="155" text-anchor="middle">8 or more</text>
  <path class="d-edge-accent" d="M 195 174 L 195 214" marker-end="url(#b04q4-a-cpp)"/>
  <rect class="d-box-accent" x="60" y="220" width="270" height="44" rx="8"/>
  <text class="d-sub" x="195" y="247" text-anchor="middle">k = 3 is here: keep this part</text>
  <rect class="d-box-muted" x="410" y="220" width="200" height="44" rx="8"/>
  <text class="d-sub" x="510" y="247" text-anchor="middle">never looked at again</text>
</svg>

Round 1 of Example 2 picked pivot 8 and produced \`[7, 4, 3, 1, 8, 15, 10, 20]\`, so 8 is at \`p = 4\`. We want index \`k = 3\`, which is less than 4, so the answer is among the four elements on the left. The right side is never touched again. Partition is the same step quicksort uses — see [How do merge sort and quicksort work?](/interview-question/how-do-merge-sort-and-quicksort-work)

## 4. Quickselect: Keep Only One Side

📌 **Interview term: Quickselect** — repeat: partition the live range \`lo..hi\`, getting the pivot index \`p\`. If \`p == k\`, return it. If \`k < p\`, continue on \`lo..p-1\`. If \`k > p\`, continue on \`p+1..hi\`.

The full run of Example 2, finding index 3 (the 4th smallest) in \`[7, 10, 4, 3, 20, 15, 1, 8]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 292" role="img" aria-label="Three Quickselect rounds on 7 10 4 3 20 15 1 8 looking for index 3. The live range shrinks from 0 to 7, to 0 to 3, to 1 to 3, and ends at index 3 with value 7">
  <defs>
    <marker id="b04q4-b-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="66.0" y="55.0" text-anchor="middle">7</text>
  <rect class="d-box" x="100" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="126.0" y="55.0" text-anchor="middle">10</text>
  <rect class="d-box" x="160" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="186.0" y="55.0" text-anchor="middle">4</text>
  <rect class="d-box" x="220" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="246.0" y="55.0" text-anchor="middle">3</text>
  <rect class="d-box" x="280" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="306.0" y="55.0" text-anchor="middle">20</text>
  <rect class="d-box" x="340" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="366.0" y="55.0" text-anchor="middle">15</text>
  <rect class="d-box" x="400" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="426.0" y="55.0" text-anchor="middle">1</text>
  <rect class="d-box" x="460" y="30" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="55.0" text-anchor="middle">8</text>
  <text class="d-sub" x="540" y="55">before: pick pivot 8</text>
  <rect class="d-box" x="40" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="66.0" y="119.0" text-anchor="middle">7</text>
  <rect class="d-box" x="100" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="126.0" y="119.0" text-anchor="middle">4</text>
  <rect class="d-box" x="160" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="186.0" y="119.0" text-anchor="middle">3</text>
  <rect class="d-box" x="220" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="246.0" y="119.0" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="280" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="306.0" y="119.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="340" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="366.0" y="119.0" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="400" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="426.0" y="119.0" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="460" y="94" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="119.0" text-anchor="middle">20</text>
  <text class="d-sub" x="540" y="119">p = 4, k is left</text>
  <rect class="d-box-accent" x="40" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="66.0" y="183.0" text-anchor="middle">1</text>
  <rect class="d-box" x="100" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="126.0" y="183.0" text-anchor="middle">4</text>
  <rect class="d-box" x="160" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="186.0" y="183.0" text-anchor="middle">3</text>
  <rect class="d-box" x="220" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="246.0" y="183.0" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="280" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="306.0" y="183.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="340" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="366.0" y="183.0" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="400" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="426.0" y="183.0" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="460" y="158" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="183.0" text-anchor="middle">20</text>
  <text class="d-sub" x="540" y="183">pivot 1: p = 0, k is right</text>
  <rect class="d-box-muted" x="40" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="66.0" y="247.0" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="100" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="126.0" y="247.0" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="160" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="186.0" y="247.0" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="220" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="246.0" y="247.0" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="280" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="306.0" y="247.0" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="340" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="366.0" y="247.0" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="400" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="426.0" y="247.0" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="460" y="222" width="52" height="40" rx="6"/>
  <text class="d-text" x="486.0" y="247.0" text-anchor="middle">20</text>
  <text class="d-sub" x="540" y="247">pivot 7: p = 3 = k, done</text>
</svg>

Three partitions, and the answer is 7. A sorted copy confirms \`sorted(nums)[3] == 7\`. Because each round only shrinks the range and never needs to come back, Quickselect is naturally a \`while\` loop — no recursion, no stack.

## 5. Why the Average Is O(n) and the Worst Case Is O(n²)

If the pivot lands roughly in the middle each time, the rounds cost about n, then n/2, then n/4, and so on:

<svg class="iq-diagram" width="100%" viewBox="0 0 790 270" role="img" aria-label="Work per round when each pivot splits the range roughly in half. n, then n over 2, n over 4 and so on, adding up to at most 2n">
  <defs>
    <marker id="b04q4-c-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="24" width="480" height="34" rx="6"/>
  <text class="d-sub" x="280.0" y="46" text-anchor="middle">n</text>
  <rect class="d-box" x="40" y="72" width="240" height="34" rx="6"/>
  <text class="d-sub" x="160.0" y="94" text-anchor="middle">n / 2</text>
  <rect class="d-box" x="40" y="120" width="120" height="34" rx="6"/>
  <text class="d-sub" x="100.0" y="142" text-anchor="middle">n / 4</text>
  <rect class="d-box-muted" x="40" y="168" width="60" height="34" rx="6"/>
  <text class="d-sub" x="120" y="190">n / 8</text>
  <rect class="d-box-muted" x="40" y="216" width="30" height="34" rx="6"/>
  <text class="d-sub" x="90" y="238">...</text>
  <rect class="d-box-accent" x="560" y="24" width="200" height="226" rx="10"/>
  <text class="d-text" x="660" y="120" text-anchor="middle">total</text>
  <text class="d-text d-accent" x="660" y="150" text-anchor="middle">at most 2n</text>
</svg>

The series \`n + n/2 + n/4 + ...\` never exceeds \`2n\`, so the expected cost is linear.

📌 **Interview term: Expected (average) time** — the running time averaged over the random pivot choices. With random pivots, Quickselect is O(n) expected for *every* input; no particular input is bad, only unlucky dice.

The worst case is a pivot that is the smallest or largest every time: each round removes only one element, giving \`n + (n-1) + (n-2) + ...\`, which is O(n²). Example 3 measures it on 2,000 elements, looking for the median:

| Input | Last element as pivot | Random pivot | Three-way partition, random pivot |
| :--- | :--- | :--- | :--- |
| ascending \`0..1999\` | 1,499,500 | 4,627 | 4,688 |
| shuffled | 7,865 | 7,260 | 5,780 |
| all equal | 1,500,499 | 1,500,499 | 2,000 |

(numbers are element-vs-pivot comparisons, copied from the Example 3 run)

📌 **Interview term: Randomized pivot** — choosing the pivot uniformly at random. It makes the sorted-input disaster (1,499,500 comparisons) disappear (4,627).

The last row is the surprise: with **all equal** values, even a random pivot is quadratic, because Lomuto puts every equal element on one side. The fix is a three-way partition.

📌 **Interview term: Three-way partition (Dutch national flag)** — split into \`< pivot\`, \`== pivot\`, \`> pivot\`. If \`k\` falls inside the equal block, you are done immediately — 2,000 comparisons on the all-equal input. It is the same idea as [sorting 0s, 1s and 2s](/interview-question/how-do-you-sort-an-array-of-0s-1s-and-2s).

📌 **Interview term: Median of medians** — a deterministic pivot rule (groups of five, take the median of their medians) that guarantees O(n) even in the worst case. It is rarely coded in interviews because its constant factor is large; name it as the answer to "can you guarantee linear time?".

## 6. The C++ Solution, Line by Line

~~~cpp
int partition(std::vector<int>& a, int lo, int hi, int pivotIndex) {
    std::swap(a[pivotIndex], a[hi]);         // park the pivot at the end
    int pivot = a[hi];
    int store = lo;
    for (int j = lo; j < hi; j++) {
        if (a[j] < pivot) std::swap(a[store++], a[j]);
    }
    std::swap(a[store], a[hi]);              // pivot lands in its sorted place
    return store;
}
~~~

~~~cpp
int quickselect(std::vector<int> a, int k) { // by value: a copy, caller keeps its order
    int lo = 0, hi = static_cast<int>(a.size()) - 1;
    while (true) {                           // a loop, not recursion: no stack growth
        if (lo == hi) return a[lo];
        int p = partition(a, lo, hi, lo + rnd(hi - lo + 1));
        if (p == k) return a[p];
        if (k < p) hi = p - 1;               // answer is in the left part only
        else lo = p + 1;                     // answer is in the right part only
    }
}
~~~

- \`quickselect(std::vector<int> a, int k)\` takes the vector **by value** on purpose: the function needs a copy to rearrange, and taking it by value makes that copy explicit (and lets a caller \`std::move\` in a vector it no longer needs).
- \`std::swap(a[store++], a[j])\` — \`store++\` returns the old value, so this swaps into \`store\` and then advances it.
- \`lo + rnd(hi - lo + 1)\` picks a pivot index in \`lo..hi\`. In production use \`std::uniform_int_distribution<int>(lo, hi)(gen)\` with a \`std::mt19937 gen\`; the examples use a seeded MINSTD generator so every language picks the same pivots.
- \`while (true)\` replaces recursion; each iteration narrows \`lo..hi\`.

## 7. C++ Details That Matter

- **\`std::nth_element\`** in \`<algorithm>\` *is* the library Quickselect: \`std::nth_element(v.begin(), v.begin() + k, v.end())\` puts the element that belongs at sorted index \`k\` there, with nothing greater before it and nothing smaller after it. For the kth largest pass \`std::greater<int>()\` and index \`k - 1\`. In the libstdc++ shipped with GCC 13 (\`bits/stl_algo.h\`), it is implemented as **introselect**: quickselect-style partitioning that switches to a heap-based selection once the depth limit \`2 * log2(n)\` is reached, so a run of bad pivots cannot go quadratic. (We read that source. The standard only fixes the complexity — [cppreference](https://en.cppreference.com/w/cpp/algorithm/nth_element) gives it as O(N) comparisons on average — not the algorithm.)
- **Pivot quality in libstdc++.** The same source picks the pivot with a median-of-three (\`__unguarded_partition_pivot\`), not at random.
- **\`rand()\` is a poor choice** for pivots: its range and quality are implementation-defined. \`<random>\` gives a proper generator.
- **Counters in \`long long\`.** Example 3 counts up to 1,500,499 comparisons. A worst case of about n²/2 comparisons passes the 32-bit \`int\` limit (2,147,483,647) once n is around 65,000, and signed overflow is undefined behaviour.

## 8. Verified: Running the Code

Every program below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3.0 with -std=c++17). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — Quickselect for the kth smallest and kth largest on eight inputs**

~~~text
7
3
20
5
4
42
5
-1
~~~

**Example 2 — Trace every partition round and check against a sorted copy**

~~~text
find index 3 in [7, 10, 4, 3, 20, 15, 1, 8]
  round 1: range [0..7] pivot 8 -> [7, 4, 3, 1, 8, 15, 10, 20] p=4, k < p, keep the left part
  round 2: range [0..3] pivot 1 -> [1, 4, 3, 7, 8, 15, 10, 20] p=0, k > p, keep the right part
  round 3: range [1..3] pivot 7 -> [1, 4, 3, 7, 8, 15, 10, 20] p=3, p == k, done
4th smallest = 7 | sorted check: 7
input unchanged: [7, 10, 4, 3, 20, 15, 1, 8]
~~~

The pivots come from a tiny seeded generator (MINSTD), so all four languages pick the same pivots and print the same rounds. With a different seed the rounds change, but the answer never does.

**Example 3 — Count comparisons: last-element pivot vs random pivot vs three-way partition**

~~~text
n = 2000 k = 1000 (the median)
ascending: last-pivot 1499500, random-pivot 4627, three-way 4688 | answers 1000 1000 1000
shuffled: last-pivot 7865, random-pivot 7260, three-way 5780 | answers 1000 1000 1000
all equal: last-pivot 1500499, random-pivot 1500499, three-way 2000 | answers 7 7 7
~~~

Each strategy is run on the same three 2,000-element arrays, looking for index 1,000. The quadratic rows are about n squared over 2.67, matching the \`n + (n-1) + ...\` sum from index 1,999 down to 1,000.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`std::sort\` on a copy | O(n log n) | O(n) for the copy | Sorts everything |
| \`std::priority_queue\` of size k | O(n log k) | O(k) | See the kth-largest question |
| Quickselect, random pivot (average) | O(n) | O(n) for the copy, O(1) in place | \`n + n/2 + ...\` is at most \`2n\` |
| Quickselect, worst case | O(n²) | same | One element removed per round: 1,499,500 comparisons in Example 3 |
| \`std::nth_element\` (libstdc++) | linear on average, no quadratic blow-up | O(1) | Introselect falls back to heap selection |

## 10. Edge Cases

- **k out of range** — \`k < 1\` or \`k > n\` has no answer; validate before the loop.
- **One element** — \`lo == hi\` immediately; return it (\`[42]\`, k = 1 gives 42).
- **Duplicates** — \`[5, 5, 5, 5]\`, k = 2 returns 5, and \`[3, 2, 3, 1, 2, 4, 5, 5, 6]\` with the 4th largest returns 4. Correct, but see the all-equal row above for speed.
- **Negative numbers** — no special handling: \`[-1, -3, -2]\`, largest is -1.
- **The caller still needs the original order** — partition rearranges the array; work on a copy (our code does) or document that the input is modified.
- **k smallest values, not just the kth** — after Quickselect returns, the first \`k\` positions of the working array hold the k smallest values (in no particular order). That is a free bonus.

## 11. Common Pitfalls

- **Mixing up k and the index.** kth smallest is index \`k - 1\`; kth largest is \`n - k\` (or \`k - 1\` with \`std::greater\`).
- **Always using the last element as pivot.** 1,499,500 comparisons on sorted input vs 4,627 with a random pivot.
- **Ignoring duplicates.** All-equal input stays quadratic with Lomuto; use a three-way partition (our run: 1,500,499 vs 2,000).
- **\`int\` comparison counters.** Quadratic counts overflow; use \`long long\`.
- **Expecting \`nth_element\` to sort.** Only position \`k\` is guaranteed; the rest is merely partitioned around it.
- **Recursing deeply.** A fixed-pivot recursive version can overflow the call stack, which crashes the process with no exception to catch.

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Partition around a pivot: it lands at its sorted index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p</code>. If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p == k</code> I am done; otherwise I keep <strong style="color:#ffca28;">only</strong> the side containing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. kth largest:</strong> <span style="color:#f0e2c8;">Target index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - k</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::nth_element</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::greater&lt;int&gt;()</code> and index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k - 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Complexity:</strong> <span style="color:#f0e2c8;">Average O(n) because the work is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n + n/2 + ...</code> at most <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2n</code>; worst case O(n²); O(1) extra space in place.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Making it robust:</strong> <span style="color:#f0e2c8;">Random pivot from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;random&gt;</code>, three-way partition for duplicates (1,500,499 down to 2,000 comparisons in my test), median of medians for a guaranteed O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ notes:</strong> <span style="color:#f0e2c8;">In production I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::nth_element</code>; libstdc++ implements it as introselect, which falls back to heap selection so it cannot go quadratic.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::nth_element</code> guarantee after it returns?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The element at the nth position is the one that would be there if sorted; nothing before it is greater and nothing after it is smaller. Neither side is sorted.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is introselect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Quickselect with a recursion-depth limit; past the limit it switches to a different method (heap selection in libstdc++) so the worst case stays bounded. It is the selection cousin of introsort.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is Quickselect O(n) on average but quicksort is O(n log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Quicksort recurses into both sides, so each level touches all n elements. Quickselect keeps one side, so each level costs about half the previous one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the k smallest elements?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nth_element</code> at index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k - 1</code> (or Quickselect), the first k positions hold them, unordered. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::partial_sort</code> gives them sorted in O(n log k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with many duplicates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Lomuto puts all equal values on one side, so all-equal input is quadratic even with random pivots. A three-way partition returns as soon as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> lands in the equal block.</span>
</div>

</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Order statistic** | The kth smallest value; min, max and median are special cases |
| **Pivot** | The element a partition splits around |
| **Partition (Lomuto scheme)** | One pass that puts smaller elements left of the pivot and leaves the pivot at its sorted index |
| **Quickselect** | Partition, then continue only in the side that contains index k |
| **Expected (average) time** | Running time averaged over random pivot choices: O(n) here |
| **Randomized pivot** | Pick the pivot at random so no fixed input is a worst case |
| **Three-way partition (Dutch national flag)** | Split into less, equal and greater; fixes many duplicates |
| **Median of medians** | Pivot rule that guarantees O(n) worst case, with a large constant |
| **Introselect** | Quickselect with a depth limit and a fallback; how libstdc++ implements \`std::nth_element\` |

---
**Conclusion:** Quickselect keeps quicksort's partition and drops one side, so the average work is about 2n; the comparison counts from the run show why pivot choice matters (1,499,500 with a fixed pivot on sorted input, 4,627 with a random one) and why duplicates need a three-way partition. In C++ you should be able to write it by hand — by-value copy, \`std::swap\`, \`long long\` counters, a \`<random>\` pivot — and then say that in real code you would call \`std::nth_element\`, which libstdc++ implements as introselect so the worst case cannot blow up.
`,
        examples: [
          { label: "Quickselect for the kth smallest and kth largest on eight inputs", code: `#include <iostream>
#include <utility>
#include <vector>

long long seed = 12345;

// MINSTD generator: the same pseudo-random pivots in every language.
int rnd(int k) {
    seed = seed * 48271 % 2147483647LL;
    return static_cast<int>(seed % k);
}

// Lomuto partition of a[lo..hi]. Returns the pivot final index p:
// everything left of p is < pivot, everything right of p is >= pivot.
int partition(std::vector<int>& a, int lo, int hi, int pivotIndex) {
    std::swap(a[pivotIndex], a[hi]);         // park the pivot at the end
    int pivot = a[hi];
    int store = lo;
    for (int j = lo; j < hi; j++) {
        if (a[j] < pivot) std::swap(a[store++], a[j]);
    }
    std::swap(a[store], a[hi]);              // pivot lands in its sorted place
    return store;
}

// Value that would sit at index k (0-based) if nums were sorted.
int quickselect(std::vector<int> a, int k) { // by value: a copy, caller keeps its order
    int lo = 0, hi = static_cast<int>(a.size()) - 1;
    while (true) {                           // a loop, not recursion: no stack growth
        if (lo == hi) return a[lo];
        int p = partition(a, lo, hi, lo + rnd(hi - lo + 1));
        if (p == k) return a[p];
        if (k < p) hi = p - 1;               // answer is in the left part only
        else lo = p + 1;                     // answer is in the right part only
    }
}

int kthSmallest(const std::vector<int>& nums, int k) { return quickselect(nums, k - 1); }
int kthLargest(const std::vector<int>& nums, int k) { return quickselect(nums, static_cast<int>(nums.size()) - k); }

int main() {
    std::cout << kthSmallest({7, 10, 4, 3, 20, 15}, 3) << "\\n";          // 7
    std::cout << kthSmallest({7, 10, 4, 3, 20, 15}, 1) << "\\n";          // 3
    std::cout << kthSmallest({7, 10, 4, 3, 20, 15}, 6) << "\\n";          // 20
    std::cout << kthLargest({3, 2, 1, 5, 6, 4}, 2) << "\\n";              // 5
    std::cout << kthLargest({3, 2, 3, 1, 2, 4, 5, 5, 6}, 4) << "\\n";     // 4
    std::cout << kthSmallest({42}, 1) << "\\n";                           // 42
    std::cout << kthSmallest({5, 5, 5, 5}, 2) << "\\n";                   // 5
    std::cout << kthLargest({-1, -3, -2}, 1) << "\\n";                    // -1
    return 0;
}` },
          { label: "Trace every partition round and check against a sorted copy", code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

long long seed = 12345;
int rnd(int k) {
    seed = seed * 48271 % 2147483647LL;
    return static_cast<int>(seed % k);
}

std::string fmt(const std::vector<int>& a) {
    std::string s = "[";
    for (size_t i = 0; i < a.size(); i++) s += (i ? ", " : "") + std::to_string(a[i]);
    return s + "]";
}

int partition(std::vector<int>& a, int lo, int hi, int pivotIndex) {
    std::swap(a[pivotIndex], a[hi]);
    int pivot = a[hi];
    int store = lo;
    for (int j = lo; j < hi; j++) {
        if (a[j] < pivot) std::swap(a[store++], a[j]);
    }
    std::swap(a[store], a[hi]);
    return store;
}

int quickselectTraced(std::vector<int> a, int k) {
    int lo = 0, hi = static_cast<int>(a.size()) - 1, rounds = 0;
    std::cout << "find index " << k << " in " << fmt(a) << "\\n";
    while (true) {
        if (lo == hi) {
            std::cout << "  range [" << lo << ".." << hi << "] has one element -> answer " << a[lo] << "\\n";
            return a[lo];
        }
        rounds++;
        int pivotIndex = lo + rnd(hi - lo + 1);
        int pivot = a[pivotIndex];
        int p = partition(a, lo, hi, pivotIndex);
        std::string decision = p == k ? "p == k, done" : (k < p ? "k < p, keep the left part" : "k > p, keep the right part");
        std::cout << "  round " << rounds << ": range [" << lo << ".." << hi << "] pivot " << pivot << " -> " << fmt(a)
                  << " p=" << p << ", " << decision << "\\n";
        if (p == k) return a[p];
        if (k < p) hi = p - 1;
        else lo = p + 1;
    }
}

int main() {
    std::vector<int> nums = {7, 10, 4, 3, 20, 15, 1, 8};
    int answer = quickselectTraced(nums, 3);   // the 4th smallest
    std::vector<int> sorted = nums;
    std::sort(sorted.begin(), sorted.end());
    std::cout << "4th smallest = " << answer << " | sorted check: " << sorted[3] << "\\n";
    std::cout << "input unchanged: " << fmt(nums) << "\\n";
    return 0;
}` },
          { label: "Count comparisons: last-element pivot vs random pivot vs three-way partition", code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

// How much work does Quickselect do? Count element-vs-pivot comparisons.
long long seed = 12345;
int rnd(int k) {
    seed = seed * 48271 % 2147483647LL;
    return static_cast<int>(seed % k);
}

// Two-way (Lomuto) partition; pivot is the last element or a random one.
std::pair<int, long long> lomutoSelect(std::vector<int> a, int k, bool randomPivot) {
    int lo = 0, hi = static_cast<int>(a.size()) - 1;
    long long compares = 0;
    while (lo < hi) {
        int pi = randomPivot ? lo + rnd(hi - lo + 1) : hi;
        std::swap(a[pi], a[hi]);
        int pivot = a[hi], store = lo;
        for (int j = lo; j < hi; j++) {
            compares++;
            if (a[j] < pivot) std::swap(a[store++], a[j]);
        }
        std::swap(a[store], a[hi]);
        if (store == k) break;
        if (k < store) hi = store - 1;
        else lo = store + 1;
    }
    return {a[k], compares};
}

// Three-way (Dutch national flag) partition: < pivot | == pivot | > pivot.
std::pair<int, long long> threeWaySelect(std::vector<int> a, int k) {
    int lo = 0, hi = static_cast<int>(a.size()) - 1;
    long long compares = 0;
    while (lo < hi) {
        int pivot = a[lo + rnd(hi - lo + 1)];
        int lt = lo, i = lo, gt = hi;
        while (i <= gt) {
            compares++;
            if (a[i] < pivot) std::swap(a[lt++], a[i++]);
            else if (a[i] > pivot) std::swap(a[i], a[gt--]);
            else i++;
        }
        if (k < lt) hi = lt - 1;
        else if (k > gt) lo = gt + 1;
        else return {pivot, compares};        // k falls inside the block of equals
    }
    return {a[k], compares};
}

int main() {
    const int n = 2000, k = n / 2;
    std::vector<int> ascending(n), allEqual(n, 7);
    for (int i = 0; i < n; i++) ascending[i] = i;
    std::vector<int> shuffled = ascending;
    seed = 999;
    for (int i = n - 1; i > 0; i--) std::swap(shuffled[i], shuffled[rnd(i + 1)]);   // Fisher-Yates

    std::cout << "n = " << n << " k = " << k << " (the median)\\n";
    std::vector<std::pair<std::string, std::vector<int>>> inputs = {
        {"ascending", ascending}, {"shuffled", shuffled}, {"all equal", allEqual}};
    for (const auto& [name, data] : inputs) {
        seed = 12345;
        auto [v1, c1] = lomutoSelect(data, k, false);
        seed = 12345;
        auto [v2, c2] = lomutoSelect(data, k, true);
        seed = 12345;
        auto [v3, c3] = threeWaySelect(data, k);
        std::cout << name << ": last-pivot " << c1 << ", random-pivot " << c2 << ", three-way " << c3
                  << " | answers " << v1 << " " << v2 << " " << v3 << "\\n";
    }
    return 0;
}` },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Find the kth largest element in an array",
    difficulty: "medium",
    seoDescription: "Find the kth largest element: sorting, a size-k min-heap and Quickselect compared, with verified Python, JavaScript, Java and C++ code.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given an unsorted list of integers and an integer k, return the kth largest element — the kth in sorted descending order, not the kth distinct. Please solve it in Python, and tell me the trade-offs between the approaches you know."

**What a strong answer should cover:**
- Sorting first: \`sorted(nums, reverse=True)[k - 1]\`, O(n log n).
- A min-heap of size k with \`heapq\`: push, pop when the size exceeds k, answer is \`heap[0]\`; O(n log k) time, O(k) space; why a *min*-heap.
- Quickselect at index \`n - k\`: O(n) average, O(n²) worst case, in place on a copy.
- When to choose which: streams and small k favour the heap; one-off in-memory queries favour Quickselect.
- Python specifics: \`heapq\` is a min-heap only (negate values for a max-heap), \`heapq.heappushpop\`, \`heapq.nlargest(k, nums)[-1]\`, and that the heap list is not sorted.

**Clarifying questions expected:**
- "Do duplicates count separately?"
- "Is the data a stream or a list in memory?"

**Code / implementation expected:** Yes — at least the \`heapq\` solution in Python; ideally also Quickselect.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and sorting; heaps and Quickselect are summarised and linked.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the Python programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

A talent show has 500 contestants and only the **top 3** go to the final. The judge does not need a full ranking of all 500 — she only needs to know the score of the 3rd-best act, because that is the cut-off.

She could write all 500 scores down and sort them. Or she could do what a sensible judge does: keep a tiny "finalists" board with room for 3 names. Each time a new act finishes, compare it with the **weakest** finalist on the board. Worse than the weakest? Ignore it. Better? It replaces the weakest. At the end, the weakest name on the board *is* the 3rd-best act of the night.

The board is a **min-heap of size k**: it always knows its weakest member instantly. A third option is the teacher trick from [Quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element): split the scores around a random one and keep only the side that matters. Interviewers ask this question to see whether you know all three and can say when each is the right tool.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| "Do duplicates count separately?" | In \`[3, 2, 3, 1, 2, 4, 5, 5, 6]\` the 4th largest is 4 if duplicates count, 3 if you want the 4th *distinct* value (Example 2). |
| "Is k always between 1 and n?" | Otherwise there is no answer; validate first. |
| "Is the whole array in memory, or is it a stream?" | A stream rules out sorting and Quickselect; the size-k heap works with one pass. |
| "May I reorder the input?" | Quickselect and in-place sorting rearrange it; copy if not. |
| "How big are n and k?" | For k close to n, a heap of size \`n - k + 1\` (the smallest side) is cheaper; for tiny k the heap is nearly linear. |

## 3. What Does kth Largest Mean?

Sort the values in descending order and take position \`k\` (1-based). For \`[3, 2, 1, 5, 6, 4]\` that is \`6, 5, 4, ...\`, so the 2nd largest is 5. Equivalently it is the value at index \`n - k\` of the **ascending** order — the conversion every Quickselect solution uses.

📌 **Interview term: kth largest (with duplicates)** — the value at position k of the descending order, counting repeated values separately. The *kth distinct largest* removes duplicates first; Example 2 shows they differ (4 vs 3).

Approach 1, the baseline: **sort and index** — O(n log n) time. Correct, short, and the right thing to say first.

## 4. Approach 2: A Min-Heap of Size k

📌 **Interview term: Min-heap** — a tree-shaped structure (stored in an array) where every parent is less than or equal to its children, so the smallest element is always at the root. Push and pop cost O(log size); reading the root is O(1). The full explanation is in [What is a heap / priority queue?](/interview-question/what-is-a-heap-priority-queue)

Keep a min-heap of the **k largest values seen so far**. For each new value: push it; if the heap now has k + 1 elements, pop the root (the smallest). After all n values, the heap holds the k largest, and its root — the smallest of them — is exactly the kth largest.

📌 **Interview term: Size-k heap** — the invariant "the heap holds the k largest values seen so far". Every operation is O(log k), so the whole pass is O(n log k) time and O(k) extra memory.

<svg class="iq-diagram" width="100%" viewBox="0 0 740 244" role="img" aria-label="A min-heap of size 3 holding 7, 8 and 9 with 7 at the root. A new 6 is pushed and popped straight back. A new 10 pushes out 7 and the root becomes 8">
  <defs>
    <marker id="b04q5-a-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="150" y="24" text-anchor="middle">min-heap, k = 3</text>
  <path class="d-edge" d="M 150 84 L 90 140"/>
  <path class="d-edge" d="M 150 84 L 210 140"/>
  <rect class="d-box-accent" x="120" y="44" width="60" height="44" rx="22"/>
  <text class="d-text" x="150" y="72" text-anchor="middle">7</text>
  <rect class="d-box" x="60" y="140" width="60" height="44" rx="22"/>
  <text class="d-text" x="90" y="168" text-anchor="middle">8</text>
  <rect class="d-box" x="180" y="140" width="60" height="44" rx="22"/>
  <text class="d-text" x="210" y="168" text-anchor="middle">9</text>
  <text class="d-sub" x="150" y="224" text-anchor="middle">root = 3rd largest</text>
  <rect class="d-box-muted" x="330" y="40" width="380" height="76" rx="10"/>
  <text class="d-text" x="520" y="70" text-anchor="middle">next value 6</text>
  <text class="d-sub" x="520" y="98" text-anchor="middle">push 6, size 4: pop 6 again</text>
  <rect class="d-box" x="330" y="146" width="380" height="76" rx="10"/>
  <text class="d-text" x="520" y="176" text-anchor="middle">next value 10</text>
  <text class="d-sub" x="520" y="204" text-anchor="middle">push 10, size 4: pop 7, root 8</text>
  <path class="d-edge-dashed" d="M 240 66 L 322 78" marker-end="url(#b04q5-a-python)"/>
  <path class="d-edge-dashed" d="M 236 80 L 322 176" marker-end="url(#b04q5-a-python)"/>
</svg>

Why a **min**-heap for the **largest** values? Because the question at every step is "is this new value good enough to enter the top k?", and the only value it has to beat is the weakest member of the top k — the root of a min-heap. A max-heap would put the *best* value at the root, which is the wrong one to compare with.

Example 2 prints the heap after every value of the stream \`5, 1, 9, 3, 7, 8, 2, 6\` with k = 3. Once three values are in, the root is the current 3rd largest: 1, then 3, 5, 7, and it stays 7 because 2 and 6 are pushed and popped straight back out.

📌 **Interview term: Streaming (online) algorithm** — one that processes values one at a time and can answer at any moment without seeing the rest. The size-k heap is one; sorting and Quickselect are not.

📌 **Interview term: Heapify** — turning an unordered array into a heap in O(n). A different heap solution heapifies all n values as a max-heap and pops k times: O(n + k log n).

## 5. Approach 3: Quickselect

The kth largest is the value at ascending index \`n - k\`, and [Quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element) finds the value at any index in O(n) on average: partition around a pivot, which lands at its sorted position \`p\`, then continue only in the side that contains \`n - k\`. Worst case O(n²) with unlucky pivots; random pivots make that very unlikely. That page traces the rounds and measures the worst case; here it is the third column of Example 1.

## 6. Which One Should You Choose?

<svg class="iq-diagram" width="100%" viewBox="0 0 750 170" role="img" aria-label="Three ways to find the kth largest. Sort in n log n, a size k min-heap in n log k, Quickselect in linear time on average">
  <defs>
    <marker id="b04q5-b-python" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="210" height="120" rx="10"/>
  <text class="d-text" x="135" y="62" text-anchor="middle">Sort</text>
  <text class="d-text d-accent" x="135" y="94" text-anchor="middle">O(n log n)</text>
  <text class="d-sub" x="135" y="124" text-anchor="middle">simple, reorders a copy</text>
  <rect class="d-box" x="270" y="30" width="210" height="120" rx="10"/>
  <text class="d-text" x="375" y="62" text-anchor="middle">Min-heap of size k</text>
  <text class="d-text d-accent" x="375" y="94" text-anchor="middle">O(n log k)</text>
  <text class="d-sub" x="375" y="124" text-anchor="middle">streams, O(k) memory</text>
  <rect class="d-box-accent" x="510" y="30" width="210" height="120" rx="10"/>
  <text class="d-text" x="615" y="62" text-anchor="middle">Quickselect</text>
  <text class="d-text d-accent" x="615" y="94" text-anchor="middle">O(n) average</text>
  <text class="d-sub" x="615" y="124" text-anchor="middle">in place, worst case n squared</text>
</svg>

| Situation | Best choice | Why |
| :--- | :--- | :--- |
| Quick, correct answer; n is modest | Sort | Shortest code, O(n log n) |
| Data arrives as a stream, or memory must stay small | Size-k heap | One pass, O(k) memory |
| k is small compared with n | Size-k heap | O(n log k) is close to O(n) |
| One-off query on an in-memory array, speed matters | Quickselect | O(n) average, in place |
| Worst-case guarantee required | Heap, or sort | Quickselect can degrade to O(n²) |

The longer comparison, with benchmarks, is in [heap vs quickselect, and when to choose which](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w).

> **Key insight:** you never need the full order — only the boundary between "top k" and "the rest". The heap keeps that boundary as its root; Quickselect finds it with partitions.

## 7. The Python Solution, Line by Line

~~~python
def by_heap(nums, k):
    """O(n log k): keep the k largest seen so far in a MIN-heap; its root is the answer."""
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)          # drop the smallest of the k+1
    return heap[0]                       # heapq is a min-heap: heap[0] is the smallest
~~~

- \`heapq\` works on a plain \`list\`. Its module docstring says: "The interesting property of a heap is that a[0] is always its smallest element" — it is a **min-heap**, which is exactly what this solution needs.
- \`heapq.heappush\` / \`heapq.heappop\` are O(log k) because the heap never holds more than k + 1 items.
- A slightly faster form replaces the push-then-pop with \`heapq.heappushpop(heap, x)\` once the heap is full: it pushes and pops in one sift.
- For a **max**-heap, Python has no flag — the usual trick is to push \`-x\` and negate on the way out.

The other two columns of Example 1:

~~~python
def by_sorting(nums, k):
    """O(n log n): sort descending, read position k-1."""
    return sorted(nums, reverse=True)[k - 1]
~~~

~~~python
def by_select(nums, k):
    """Average O(n): Quickselect for index n-k of the ascending order."""
    a = list(nums)
    target = len(a) - k
    lo, hi = 0, len(a) - 1
    while lo < hi:
        pi = lo + rand(hi - lo + 1)
        a[pi], a[hi] = a[hi], a[pi]
        pivot, store = a[hi], lo
        for j in range(lo, hi):
            if a[j] < pivot:
                a[store], a[j] = a[j], a[store]
                store += 1
        a[store], a[hi] = a[hi], a[store]
        if store == target:
            break
        if target < store:
            hi = store - 1
        else:
            lo = store + 1
    return a[target]
~~~

## 8. Python Details That Matter

- **\`heapq.nlargest(k, nums)[-1]\`** is the one-line version. Its docstring says it is "Equivalent to: \`sorted(iterable, key=key, reverse=True)[:n]\`" — the result, not the method: it keeps a heap of size k internally.
- **\`heapq.heapify(nums)\`** builds a heap in place in O(n); combined with \`n - k\` pops it is the "heapify everything" alternative.
- **The heap list is not sorted.** After pushing \`5, 1, 9, 3, 7\` the list is \`[1, 3, 9, 5, 7]\` — only \`heap[0]\` is guaranteed. Example 2 sorts a copy for display.
- **\`sorted(set(nums), reverse=True)\`** gives distinct values for the "kth distinct largest" variant (Example 2 prints 3 instead of 4).
- **Validation.** \`heap[0]\` on an empty heap raises \`IndexError\`; check \`1 <= k <= len(nums)\` first.

## 9. Verified: Running the Code

Every program below was saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13.16). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — Sort vs size-k heap vs selection on six inputs**

~~~text
[3, 2, 1, 5, 6, 4] k=2: sort 5, heap 5, select 5
[3, 2, 3, 1, 2, 4, 5, 5, 6] k=4: sort 4, heap 4, select 4
[1] k=1: sort 1, heap 1, select 1
[7, 7, 7] k=2: sort 7, heap 7, select 7
[-1, -5, 3, 0] k=3: sort -1, heap -1, select -1
[2, 1] k=2: sort 1, heap 1, select 1
~~~

All three methods return the same value on every input. The Python, JavaScript and Java versions use the hand-written Quickselect from the Quickselect question for the select column; the C++ version uses \`std::nth_element\`.

**Example 2 — Watch the size-3 heap on a stream, and duplicates vs distinct values**

~~~text
add 5: heap [5] -> 3rd largest not ready
add 1: heap [1, 5] -> 3rd largest not ready
add 9: heap [1, 5, 9] -> 3rd largest 1
add 3: pop 1, heap [3, 5, 9] -> 3rd largest 3
add 7: pop 3, heap [5, 7, 9] -> 3rd largest 5
add 8: pop 5, heap [7, 8, 9] -> 3rd largest 7
add 2: pop 2, heap [7, 8, 9] -> 3rd largest 7
add 6: pop 6, heap [7, 8, 9] -> 3rd largest 7
descending [6, 5, 5, 4, 3, 3, 2, 2, 1]
4th largest 4 | 4th distinct largest 3
~~~

The heap contents are printed in sorted order for readability. The heap's own internal array is not sorted: in Python, \`heapq\` pushes of \`5, 1, 9, 3, 7\` leave the list as \`[1, 3, 9, 5, 7]\`, and Java \`PriorityQueue.toString()\` printed the same order.

## 10. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`sorted(nums, reverse=True)[k - 1]\` | O(n log n) | O(n) | Sorts a full copy |
| Size-k min-heap (\`heapq\`) | O(n log k) | O(k) | n pushes and pops on a heap of at most k + 1 items |
| \`heapify\` + pops | O(n + k log n) | O(n), or O(1) in place | Heapify is linear, each pop is O(log n) |
| Quickselect | O(n) average, O(n²) worst | O(n) for the copy | One side per round; see the Quickselect question |

## 11. Edge Cases

- **k = 1** — the maximum; a single pass is enough (\`max\`).
- **k = n** — the minimum; a heap of size n is wasteful, so use a size-1 heap on the other side, or just the minimum.
- **One element** — \`[1]\`, k = 1 gives 1 in all three methods.
- **All equal** — \`[7, 7, 7]\`, k = 2 gives 7.
- **Negative numbers** — \`[-1, -5, 3, 0]\`, k = 3 gives -1; nothing special.
- **Duplicates** — counted separately unless the interviewer says distinct (Example 2: 4 vs 3).
- **Invalid k** — \`k < 1\` or \`k > n\`: validate and raise an error instead of returning garbage.

## 12. Common Pitfalls

- **Using a max-heap of everything and popping k times without saying the cost.** It works, but it is O(n + k log n) time and O(n) memory, not O(n log k) and O(k).
- **Reading \`heap[-1]\` as the largest.** The heap list is not sorted; only \`heap[0]\` means anything.
- **Forgetting that \`heapq\` is min-only.** To get a max-heap, push negatives.
- **Using \`sorted(set(nums))\` when duplicates should count.** That answers the distinct variant (3 instead of 4 in Example 2).
- **Off-by-one in Quickselect.** The kth largest is ascending index \`len(nums) - k\`, not \`k\` or \`k - 1\`.
- **Not validating k.** \`heap[0]\` on an empty heap raises \`IndexError\`.

## 13. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(nums, reverse=True)[k - 1]</code> — O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap:</strong> <span style="color:#f0e2c8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> <strong style="color:#ffca28;">min</strong>-heap of the k largest so far: push each value, pop when it grows past k. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heap[0]</code> is the answer. O(n log k) time, O(k) space, works on a stream.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why min-heap:</strong> <span style="color:#f0e2c8;">A new value only has to beat the weakest of the current top k, and that is the root of a min-heap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Quickselect:</strong> <span style="color:#f0e2c8;">Target index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - k</code>, partition and keep one side: O(n) average, O(n²) worst, in place.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Choosing:</strong> <span style="color:#f0e2c8;">Stream or small k: heap. One-off on a list in memory: Quickselect. In Python, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq.nlargest(k, nums)[-1]</code> is the practical one-liner.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a max-heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A max-heap of all n values works but costs O(n) memory and O(n + k log n) time. A size-k min-heap uses O(k) memory and compares each new value with the only one that matters, the current kth largest.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you do it for a stream that never ends?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the size-k heap and answer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heap[0]</code> at any moment — that is LeetCode 703, Kth Largest Element in a Stream.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if k is close to n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Find the (n - k + 1)th smallest instead with a size <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - k + 1</code> max-heap (negated values in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code>), which is smaller.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">heapq.nlargest</code> just sorting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Its docstring says it is equivalent to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(...)[:n]</code> in <em style="color:#d8d8d8;">result</em>; it keeps a heap of size k.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you get the top k values, not only the kth?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The size-k heap already holds them; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(heap, reverse=True)</code> orders them in O(k log k).</span>
</div>

</div>

## 14. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **kth largest (with duplicates)** | Value at position k of the descending order, repeats counted |
| **Min-heap** | Parent no bigger than children; the smallest is at the root |
| **Size-k heap** | Min-heap holding the k largest values seen so far; its root is the answer |
| **Streaming (online) algorithm** | Processes values one by one and can answer at any time |
| **Heapify** | Build a heap from an array in O(n) |

---
**Conclusion:** The kth largest element only needs the boundary between the top k and the rest. Sorting finds it in O(n log n); a \`heapq\` min-heap of size k keeps the boundary at \`heap[0]\` in O(n log k) with O(k) memory and works on streams; Quickselect at index \`n - k\` finds it in O(n) on average. The runs show all three agree on every input, including duplicates and negatives, and the stream trace shows the heap root moving 1, 3, 5, 7 and then holding. In Python, remember \`heapq\` is a min-heap only, its list is not sorted, and \`heapq.nlargest(k, nums)[-1]\` is the practical answer.
`,
        examples: [
          { label: "Sort vs size-k heap vs selection on six inputs", code: `import heapq

seed = 12345


def rand(k):
    global seed
    seed = seed * 48271 % 2147483647
    return seed % k


def by_sorting(nums, k):
    """O(n log n): sort descending, read position k-1."""
    return sorted(nums, reverse=True)[k - 1]


def by_heap(nums, k):
    """O(n log k): keep the k largest seen so far in a MIN-heap; its root is the answer."""
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)          # drop the smallest of the k+1
    return heap[0]                       # heapq is a min-heap: heap[0] is the smallest


def by_select(nums, k):
    """Average O(n): Quickselect for index n-k of the ascending order."""
    a = list(nums)
    target = len(a) - k
    lo, hi = 0, len(a) - 1
    while lo < hi:
        pi = lo + rand(hi - lo + 1)
        a[pi], a[hi] = a[hi], a[pi]
        pivot, store = a[hi], lo
        for j in range(lo, hi):
            if a[j] < pivot:
                a[store], a[j] = a[j], a[store]
                store += 1
        a[store], a[hi] = a[hi], a[store]
        if store == target:
            break
        if target < store:
            hi = store - 1
        else:
            lo = store + 1
    return a[target]


def fmt(a):
    return "[" + ", ".join(str(x) for x in a) + "]"


cases = [([3, 2, 1, 5, 6, 4], 2),
         ([3, 2, 3, 1, 2, 4, 5, 5, 6], 4),
         ([1], 1),
         ([7, 7, 7], 2),
         ([-1, -5, 3, 0], 3),
         ([2, 1], 2)]
for nums, k in cases:
    s, h, q = by_sorting(nums, k), by_heap(nums, k), by_select(nums, k)
    print(f"{fmt(nums)} k={k}: sort {s}, heap {h}, select {q}")` },
          { label: "Watch the size-3 heap on a stream, and duplicates vs distinct values", code: `import heapq


def fmt(a):
    return "[" + ", ".join(str(x) for x in a) + "]"


# 1) Watch the size-k min-heap on a stream of numbers (k = 3)
k = 3
heap = []
for x in [5, 1, 9, 3, 7, 8, 2, 6]:
    heapq.heappush(heap, x)
    action = ""
    if len(heap) > k:
        action = f" pop {heapq.heappop(heap)},"
    # sorted() for display only: the heap list itself is not in sorted order
    state = fmt(sorted(heap))
    answer = str(heap[0]) if len(heap) == k else "not ready"
    print(f"add {x}:{action} heap {state} -> 3rd largest {answer}")

# 2) Duplicates: "kth largest" counts positions, "kth distinct largest" counts values
nums = [3, 2, 3, 1, 2, 4, 5, 5, 6]
by_position = sorted(nums, reverse=True)
by_value = sorted(set(nums), reverse=True)
print("descending", fmt(by_position))
print("4th largest", by_position[3], "| 4th distinct largest", by_value[3])` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an unsorted array of numbers and an integer k, return the kth largest element — the kth in sorted descending order, not the kth distinct. Please solve it in JavaScript, and tell me the trade-offs between the approaches you know."

**What a strong answer should cover:**
- Sorting first: \`nums.slice().sort((a, b) => b - a)[k - 1]\`, O(n log n) — with a comparator.
- A min-heap of size k: push, pop when the size exceeds k, answer is the root; O(n log k) time, O(k) space; why a *min*-heap.
- Quickselect at index \`n - k\`: O(n) average, O(n²) worst case.
- When to choose which: streams and small k favour the heap; one-off in-memory queries favour Quickselect.
- JavaScript specifics: there is **no built-in heap**, so you write one (or say you would use a library); the default \`sort()\` compares as strings; \`slice()\` avoids mutating the input.

**Clarifying questions expected:**
- "Do duplicates count separately?"
- "Is the data a stream or an array in memory?"

**Code / implementation expected:** Yes — a small \`MinHeap\` class and the size-k solution in JavaScript; ideally also Quickselect.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and sorting; heaps and Quickselect are summarised and linked.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the JavaScript programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

A talent show has 500 contestants and only the **top 3** go to the final. The judge does not need a full ranking of all 500 — she only needs to know the score of the 3rd-best act, because that is the cut-off.

She could write all 500 scores down and sort them. Or she could do what a sensible judge does: keep a tiny "finalists" board with room for 3 names. Each time a new act finishes, compare it with the **weakest** finalist on the board. Worse than the weakest? Ignore it. Better? It replaces the weakest. At the end, the weakest name on the board *is* the 3rd-best act of the night.

The board is a **min-heap of size k**: it always knows its weakest member instantly. A third option is the teacher trick from [Quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element): split the scores around a random one and keep only the side that matters. Interviewers ask this question to see whether you know all three and can say when each is the right tool.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| "Do duplicates count separately?" | In \`[3, 2, 3, 1, 2, 4, 5, 5, 6]\` the 4th largest is 4 if duplicates count, 3 if you want the 4th *distinct* value (Example 2). |
| "Is k always between 1 and n?" | Otherwise there is no answer; validate first. |
| "Is the whole array in memory, or is it a stream?" | A stream rules out sorting and Quickselect; the size-k heap works with one pass. |
| "May I reorder the input?" | Quickselect and in-place sorting rearrange it; copy if not. |
| "How big are n and k?" | For k close to n, a heap of size \`n - k + 1\` (the smallest side) is cheaper; for tiny k the heap is nearly linear. |

## 3. What Does kth Largest Mean?

Sort the values in descending order and take position \`k\` (1-based). For \`[3, 2, 1, 5, 6, 4]\` that is \`6, 5, 4, ...\`, so the 2nd largest is 5. Equivalently it is the value at index \`n - k\` of the **ascending** order — the conversion every Quickselect solution uses.

📌 **Interview term: kth largest (with duplicates)** — the value at position k of the descending order, counting repeated values separately. The *kth distinct largest* removes duplicates first; Example 2 shows they differ (4 vs 3).

Approach 1, the baseline: **sort and index** — O(n log n) time. Correct, short, and the right thing to say first.

## 4. Approach 2: A Min-Heap of Size k

📌 **Interview term: Min-heap** — a tree-shaped structure (stored in an array) where every parent is less than or equal to its children, so the smallest element is always at the root. Push and pop cost O(log size); reading the root is O(1). The full explanation is in [What is a heap / priority queue?](/interview-question/what-is-a-heap-priority-queue)

Keep a min-heap of the **k largest values seen so far**. For each new value: push it; if the heap now has k + 1 elements, pop the root (the smallest). After all n values, the heap holds the k largest, and its root — the smallest of them — is exactly the kth largest.

📌 **Interview term: Size-k heap** — the invariant "the heap holds the k largest values seen so far". Every operation is O(log k), so the whole pass is O(n log k) time and O(k) extra memory.

<svg class="iq-diagram" width="100%" viewBox="0 0 740 244" role="img" aria-label="A min-heap of size 3 holding 7, 8 and 9 with 7 at the root. A new 6 is pushed and popped straight back. A new 10 pushes out 7 and the root becomes 8">
  <defs>
    <marker id="b04q5-a-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="150" y="24" text-anchor="middle">min-heap, k = 3</text>
  <path class="d-edge" d="M 150 84 L 90 140"/>
  <path class="d-edge" d="M 150 84 L 210 140"/>
  <rect class="d-box-accent" x="120" y="44" width="60" height="44" rx="22"/>
  <text class="d-text" x="150" y="72" text-anchor="middle">7</text>
  <rect class="d-box" x="60" y="140" width="60" height="44" rx="22"/>
  <text class="d-text" x="90" y="168" text-anchor="middle">8</text>
  <rect class="d-box" x="180" y="140" width="60" height="44" rx="22"/>
  <text class="d-text" x="210" y="168" text-anchor="middle">9</text>
  <text class="d-sub" x="150" y="224" text-anchor="middle">root = 3rd largest</text>
  <rect class="d-box-muted" x="330" y="40" width="380" height="76" rx="10"/>
  <text class="d-text" x="520" y="70" text-anchor="middle">next value 6</text>
  <text class="d-sub" x="520" y="98" text-anchor="middle">push 6, size 4: pop 6 again</text>
  <rect class="d-box" x="330" y="146" width="380" height="76" rx="10"/>
  <text class="d-text" x="520" y="176" text-anchor="middle">next value 10</text>
  <text class="d-sub" x="520" y="204" text-anchor="middle">push 10, size 4: pop 7, root 8</text>
  <path class="d-edge-dashed" d="M 240 66 L 322 78" marker-end="url(#b04q5-a-javascript)"/>
  <path class="d-edge-dashed" d="M 236 80 L 322 176" marker-end="url(#b04q5-a-javascript)"/>
</svg>

Why a **min**-heap for the **largest** values? Because the question at every step is "is this new value good enough to enter the top k?", and the only value it has to beat is the weakest member of the top k — the root of a min-heap. A max-heap would put the *best* value at the root, which is the wrong one to compare with.

Example 2 prints the heap after every value of the stream \`5, 1, 9, 3, 7, 8, 2, 6\` with k = 3. Once three values are in, the root is the current 3rd largest: 1, then 3, 5, 7, and it stays 7 because 2 and 6 are pushed and popped straight back out.

📌 **Interview term: Streaming (online) algorithm** — one that processes values one at a time and can answer at any moment without seeing the rest. The size-k heap is one; sorting and Quickselect are not.

📌 **Interview term: Heapify** — turning an unordered array into a heap in O(n). A different heap solution heapifies all n values as a max-heap and pops k times: O(n + k log n).

## 5. Approach 3: Quickselect

The kth largest is the value at ascending index \`n - k\`, and [Quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element) finds the value at any index in O(n) on average: partition around a pivot, which lands at its sorted position \`p\`, then continue only in the side that contains \`n - k\`. Worst case O(n²) with unlucky pivots; random pivots make that very unlikely. That page traces the rounds and measures the worst case; here it is the third column of Example 1.

## 6. Which One Should You Choose?

<svg class="iq-diagram" width="100%" viewBox="0 0 750 170" role="img" aria-label="Three ways to find the kth largest. Sort in n log n, a size k min-heap in n log k, Quickselect in linear time on average">
  <defs>
    <marker id="b04q5-b-javascript" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="210" height="120" rx="10"/>
  <text class="d-text" x="135" y="62" text-anchor="middle">Sort</text>
  <text class="d-text d-accent" x="135" y="94" text-anchor="middle">O(n log n)</text>
  <text class="d-sub" x="135" y="124" text-anchor="middle">simple, reorders a copy</text>
  <rect class="d-box" x="270" y="30" width="210" height="120" rx="10"/>
  <text class="d-text" x="375" y="62" text-anchor="middle">Min-heap of size k</text>
  <text class="d-text d-accent" x="375" y="94" text-anchor="middle">O(n log k)</text>
  <text class="d-sub" x="375" y="124" text-anchor="middle">streams, O(k) memory</text>
  <rect class="d-box-accent" x="510" y="30" width="210" height="120" rx="10"/>
  <text class="d-text" x="615" y="62" text-anchor="middle">Quickselect</text>
  <text class="d-text d-accent" x="615" y="94" text-anchor="middle">O(n) average</text>
  <text class="d-sub" x="615" y="124" text-anchor="middle">in place, worst case n squared</text>
</svg>

| Situation | Best choice | Why |
| :--- | :--- | :--- |
| Quick, correct answer; n is modest | Sort | Shortest code, O(n log n) |
| Data arrives as a stream, or memory must stay small | Size-k heap | One pass, O(k) memory |
| k is small compared with n | Size-k heap | O(n log k) is close to O(n) |
| One-off query on an in-memory array, speed matters | Quickselect | O(n) average, in place |
| Worst-case guarantee required | Heap, or sort | Quickselect can degrade to O(n²) |

The longer comparison, with benchmarks, is in [heap vs quickselect, and when to choose which](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w).

> **Key insight:** you never need the full order — only the boundary between "top k" and "the rest". The heap keeps that boundary as its root; Quickselect finds it with partitions.

## 7. The JavaScript Solution, Line by Line

JavaScript's standard library has no priority queue, so the first step is a small binary min-heap stored in an array (parent of \`i\` is \`(i - 1) >> 1\`, children are \`2i + 1\` and \`2i + 2\`):

~~~javascript
class MinHeap {
  constructor() { this.items = []; }
  get size() { return this.items.length; }
  peek() { return this.items[0]; }
  push(x) {
    const a = this.items;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {                               // sift up
      const parent = (i - 1) >> 1;
      if (a[parent] <= a[i]) break;
      swap(a, parent, i);
      i = parent;
    }
  }
  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      while (true) {                              // sift down
        const l = 2 * i + 1, r = l + 1;
        let smallest = i;
        if (l < a.length && a[l] < a[smallest]) smallest = l;
        if (r < a.length && a[r] < a[smallest]) smallest = r;
        if (smallest === i) break;
        swap(a, i, smallest);
        i = smallest;
      }
    }
    return top;
  }
}
~~~

- \`push\` appends at the end and **sifts up** while the parent is bigger; \`pop\` moves the last element to the root and **sifts down** toward the smaller child. Both are O(log size).
- \`(i - 1) >> 1\` is safe here because heap indices are small; it is integer division by 2 for non-negative numbers.

The size-k solution on top of it:

~~~javascript
function byHeap(nums, k) {
  const heap = new MinHeap();
  for (const x of nums) {
    heap.push(x);
    if (heap.size > k) heap.pop();                // drop the smallest of the k+1
  }
  return heap.peek();
}
~~~

And the sort baseline, which needs a comparator:

~~~javascript
function bySorting(nums, k) {
  return nums.slice().sort((a, b) => b - a)[k - 1];
}
~~~

## 8. JavaScript Details That Matter

- **The default sort is a string sort.** \`[10, 9, 1, 100].sort()\` printed \`[1,10,100,9]\` in our run. Always pass \`(a, b) => b - a\` for descending numbers.
- **\`sort\` mutates.** \`nums.sort(...)\` reorders the caller's array; \`nums.slice().sort(...)\` sorts a copy (or \`toSorted\` in newer engines).
- **Interview etiquette for the heap.** Writing a 30-line heap takes time; it is reasonable to say "JavaScript has no built-in heap, so I will write a minimal one" and keep only \`push\`, \`pop\` and \`peek\`.
- **\`k = 1\`.** \`Math.max(...nums)\` works for small arrays, but spreading a very large array overflowed the stack in our Node run (\`RangeError: Maximum call stack size exceeded\` for 10 million elements); a loop is safer.
- **Distinct values.** \`[...new Set(nums)].sort((a, b) => b - a)\` answers the "kth distinct largest" variant (Example 2 prints 3 instead of 4).

## 9. Verified: Running the Code

Every program below was saved as \`main.js\` and run with \`node main.js\` (Node.js v22.22.0). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — Sort vs size-k heap vs selection on six inputs**

~~~text
[3, 2, 1, 5, 6, 4] k=2: sort 5, heap 5, select 5
[3, 2, 3, 1, 2, 4, 5, 5, 6] k=4: sort 4, heap 4, select 4
[1] k=1: sort 1, heap 1, select 1
[7, 7, 7] k=2: sort 7, heap 7, select 7
[-1, -5, 3, 0] k=3: sort -1, heap -1, select -1
[2, 1] k=2: sort 1, heap 1, select 1
~~~

All three methods return the same value on every input. The Python, JavaScript and Java versions use the hand-written Quickselect from the Quickselect question for the select column; the C++ version uses \`std::nth_element\`.

**Example 2 — Watch the size-3 heap on a stream, and duplicates vs distinct values**

~~~text
add 5: heap [5] -> 3rd largest not ready
add 1: heap [1, 5] -> 3rd largest not ready
add 9: heap [1, 5, 9] -> 3rd largest 1
add 3: pop 1, heap [3, 5, 9] -> 3rd largest 3
add 7: pop 3, heap [5, 7, 9] -> 3rd largest 5
add 8: pop 5, heap [7, 8, 9] -> 3rd largest 7
add 2: pop 2, heap [7, 8, 9] -> 3rd largest 7
add 6: pop 6, heap [7, 8, 9] -> 3rd largest 7
descending [6, 5, 5, 4, 3, 3, 2, 2, 1]
4th largest 4 | 4th distinct largest 3
~~~

The heap contents are printed in sorted order for readability. The heap's own internal array is not sorted: in Python, \`heapq\` pushes of \`5, 1, 9, 3, 7\` leave the list as \`[1, 3, 9, 5, 7]\`, and Java \`PriorityQueue.toString()\` printed the same order.

## 10. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`slice().sort((a, b) => b - a)[k - 1]\` | O(n log n) | O(n) | Sorts a full copy |
| Size-k min-heap (hand-written) | O(n log k) | O(k) | n pushes and pops on a heap of at most k + 1 items |
| Heapify all + pops | O(n + k log n) | O(n) | Linear build, each pop O(log n) |
| Quickselect | O(n) average, O(n²) worst | O(n) for the copy | One side per round; see the Quickselect question |

## 11. Edge Cases

- **k = 1** — the maximum; a single pass is enough (\`max\`).
- **k = n** — the minimum; a heap of size n is wasteful, so use a size-1 heap on the other side, or just the minimum.
- **One element** — \`[1]\`, k = 1 gives 1 in all three methods.
- **All equal** — \`[7, 7, 7]\`, k = 2 gives 7.
- **Negative numbers** — \`[-1, -5, 3, 0]\`, k = 3 gives -1; nothing special.
- **Duplicates** — counted separately unless the interviewer says distinct (Example 2: 4 vs 3).
- **Invalid k** — \`k < 1\` or \`k > n\`: validate and raise an error instead of returning garbage.

## 12. Common Pitfalls

- **\`nums.sort()\` with no comparator.** Strings, not numbers: 100 sorts before 9.
- **Sorting in place by accident.** \`sort\` mutates the caller's array; copy with \`slice()\`.
- **Using a max-heap of everything.** O(n) memory instead of O(k).
- **Getting sift-down wrong.** Compare with the *smaller* child, and stop when neither child is smaller.
- **Off-by-one in Quickselect.** The kth largest is ascending index \`nums.length - k\`.
- **Assuming a heap array is sorted.** Only \`items[0]\` is guaranteed; Example 2 sorts a copy for display.

## 13. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums.slice().sort((a, b) =&gt; b - a)[k - 1]</code> — O(n log n), and the comparator is required.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap:</strong> <span style="color:#f0e2c8;">Keep a min-heap of the k largest so far: push each value, pop when it grows past k; the root is the answer. O(n log k) time, O(k) space, works on a stream.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why min-heap:</strong> <span style="color:#f0e2c8;">A new value only has to beat the weakest of the current top k, which is the root of a min-heap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Quickselect:</strong> <span style="color:#f0e2c8;">Target index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - k</code>, partition and keep one side: O(n) average, O(n²) worst.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript notes:</strong> <span style="color:#f0e2c8;">No built-in heap, so I write a minimal one with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek</code>; I copy before sorting and never rely on the default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort()</code> for numbers.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a max-heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A max-heap of all n values costs O(n) memory and O(n + k log n) time. The size-k min-heap uses O(k) memory and compares each value with the current kth largest.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle an endless stream?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the size-k heap and read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek()</code> whenever asked — LeetCode 703.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[10, 9, 1, 100].sort()</code> give <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[1, 10, 100, 9]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without a comparator, elements are converted to strings and compared by UTF-16 code units, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'100' &lt; '9'</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if k is close to n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Find the (n - k + 1)th smallest with a size <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - k + 1</code> max-heap instead; it is smaller.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the top k values?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The heap already holds them; copy <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items</code> and sort descending: O(k log k).</span>
</div>

</div>

## 14. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **kth largest (with duplicates)** | Value at position k of the descending order, repeats counted |
| **Min-heap** | Parent no bigger than children; the smallest is at the root |
| **Size-k heap** | Min-heap holding the k largest values seen so far; its root is the answer |
| **Streaming (online) algorithm** | Processes values one by one and can answer at any time |
| **Heapify** | Build a heap from an array in O(n) |

---
**Conclusion:** The kth largest element only needs the boundary between the top k and the rest. Sorting finds it in O(n log n) — with a numeric comparator — while a size-k min-heap keeps the boundary at its root in O(n log k) with O(k) memory, and Quickselect at index \`n - k\` finds it in O(n) on average. In JavaScript the extra work is writing the heap yourself, since the language has none; the runs show the three methods agree on every input and how the heap root moves through a stream.
`,
        examples: [
          { label: "Sort vs size-k heap vs selection on six inputs", code: `let seed = 12345;
function rand(k) {
  seed = (seed * 48271) % 2147483647;
  return seed % k;
}
function swap(a, i, j) { const t = a[i]; a[i] = a[j]; a[j] = t; }

// JavaScript has no built-in heap, so here is a small binary min-heap.
class MinHeap {
  constructor() { this.items = []; }
  get size() { return this.items.length; }
  peek() { return this.items[0]; }
  push(x) {
    const a = this.items;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {                               // sift up
      const parent = (i - 1) >> 1;
      if (a[parent] <= a[i]) break;
      swap(a, parent, i);
      i = parent;
    }
  }
  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      while (true) {                              // sift down
        const l = 2 * i + 1, r = l + 1;
        let smallest = i;
        if (l < a.length && a[l] < a[smallest]) smallest = l;
        if (r < a.length && a[r] < a[smallest]) smallest = r;
        if (smallest === i) break;
        swap(a, i, smallest);
        i = smallest;
      }
    }
    return top;
  }
}

// O(n log n): sort descending, read position k-1. A comparator is required:
// without one, sort() compares the numbers as strings.
function bySorting(nums, k) {
  return nums.slice().sort((a, b) => b - a)[k - 1];
}

// O(n log k): keep the k largest seen so far in a MIN-heap; its root is the answer.
function byHeap(nums, k) {
  const heap = new MinHeap();
  for (const x of nums) {
    heap.push(x);
    if (heap.size > k) heap.pop();                // drop the smallest of the k+1
  }
  return heap.peek();
}

// Average O(n): Quickselect for index n-k of the ascending order.
function bySelect(nums, k) {
  const a = nums.slice();
  const target = a.length - k;
  let lo = 0, hi = a.length - 1;
  while (lo < hi) {
    swap(a, lo + rand(hi - lo + 1), hi);
    const pivot = a[hi];
    let store = lo;
    for (let j = lo; j < hi; j++) {
      if (a[j] < pivot) { swap(a, store, j); store++; }
    }
    swap(a, store, hi);
    if (store === target) break;
    if (target < store) hi = store - 1;
    else lo = store + 1;
  }
  return a[target];
}

function fmt(a) { return '[' + a.join(', ') + ']'; }

const cases = [[[3, 2, 1, 5, 6, 4], 2],
               [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4],
               [[1], 1],
               [[7, 7, 7], 2],
               [[-1, -5, 3, 0], 3],
               [[2, 1], 2]];
for (const [nums, k] of cases) {
  console.log(fmt(nums) + ' k=' + k + ': sort ' + bySorting(nums, k) + ', heap ' + byHeap(nums, k) + ', select ' + bySelect(nums, k));
}` },
          { label: "Watch the size-3 heap on a stream, and duplicates vs distinct values", code: `// The same small binary min-heap as example 1 (JavaScript has no built-in heap).
class MinHeap {
  constructor() { this.items = []; }
  get size() { return this.items.length; }
  peek() { return this.items[0]; }
  push(x) {
    const a = this.items;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p] <= a[i]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let s = i;
        if (l < a.length && a[l] < a[s]) s = l;
        if (r < a.length && a[r] < a[s]) s = r;
        if (s === i) break;
        [a[s], a[i]] = [a[i], a[s]];
        i = s;
      }
    }
    return top;
  }
}

function fmt(a) { return '[' + a.join(', ') + ']'; }

// 1) Watch the size-k min-heap on a stream of numbers (k = 3)
const k = 3;
const heap = new MinHeap();
for (const x of [5, 1, 9, 3, 7, 8, 2, 6]) {
  heap.push(x);
  let action = '';
  if (heap.size > k) action = ' pop ' + heap.pop() + ',';
  // copy and sort for display only: the heap array itself is not in sorted order
  const state = fmt(heap.items.slice().sort((a, b) => a - b));
  const answer = heap.size === k ? String(heap.peek()) : 'not ready';
  console.log('add ' + x + ':' + action + ' heap ' + state + ' -> 3rd largest ' + answer);
}

// 2) Duplicates: "kth largest" counts positions, "kth distinct largest" counts values
const nums = [3, 2, 3, 1, 2, 4, 5, 5, 6];
const byPosition = nums.slice().sort((a, b) => b - a);
const byValue = [...new Set(nums)].sort((a, b) => b - a);
console.log('descending ' + fmt(byPosition));
console.log('4th largest ' + byPosition[3] + ' | 4th distinct largest ' + byValue[3]);` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an unsorted \`int\` array and an integer k, return the kth largest element — the kth in sorted descending order, not the kth distinct. Please solve it in Java, and tell me the trade-offs between the approaches you know."

**What a strong answer should cover:**
- Sorting first: \`Arrays.sort\` on a copy, then index \`n - k\`; O(n log n).
- A \`PriorityQueue<Integer>\` of size k: \`offer\`, \`poll\` when the size exceeds k, answer is \`peek()\`; O(n log k) time, O(k) space; why a *min*-heap.
- Quickselect at index \`n - k\`: O(n) average, O(n²) worst case.
- When to choose which: streams and small k favour the heap; one-off in-memory queries favour Quickselect.
- Java specifics: \`PriorityQueue\` is a min-heap by natural order (\`Collections.reverseOrder()\` for max), its iterator is not sorted, boxing to \`Integer\`, and \`Arrays.sort(int[])\` has no descending option.

**Clarifying questions expected:**
- "Do duplicates count separately?"
- "Is the data a stream or an array in memory?"

**Code / implementation expected:** Yes — the \`PriorityQueue\` solution in Java; ideally also Quickselect.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and sorting; heaps and Quickselect are summarised and linked.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the Java programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

A talent show has 500 contestants and only the **top 3** go to the final. The judge does not need a full ranking of all 500 — she only needs to know the score of the 3rd-best act, because that is the cut-off.

She could write all 500 scores down and sort them. Or she could do what a sensible judge does: keep a tiny "finalists" board with room for 3 names. Each time a new act finishes, compare it with the **weakest** finalist on the board. Worse than the weakest? Ignore it. Better? It replaces the weakest. At the end, the weakest name on the board *is* the 3rd-best act of the night.

The board is a **min-heap of size k**: it always knows its weakest member instantly. A third option is the teacher trick from [Quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element): split the scores around a random one and keep only the side that matters. Interviewers ask this question to see whether you know all three and can say when each is the right tool.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| "Do duplicates count separately?" | In \`[3, 2, 3, 1, 2, 4, 5, 5, 6]\` the 4th largest is 4 if duplicates count, 3 if you want the 4th *distinct* value (Example 2). |
| "Is k always between 1 and n?" | Otherwise there is no answer; validate first. |
| "Is the whole array in memory, or is it a stream?" | A stream rules out sorting and Quickselect; the size-k heap works with one pass. |
| "May I reorder the input?" | Quickselect and in-place sorting rearrange it; copy if not. |
| "How big are n and k?" | For k close to n, a heap of size \`n - k + 1\` (the smallest side) is cheaper; for tiny k the heap is nearly linear. |

## 3. What Does kth Largest Mean?

Sort the values in descending order and take position \`k\` (1-based). For \`[3, 2, 1, 5, 6, 4]\` that is \`6, 5, 4, ...\`, so the 2nd largest is 5. Equivalently it is the value at index \`n - k\` of the **ascending** order — the conversion every Quickselect solution uses.

📌 **Interview term: kth largest (with duplicates)** — the value at position k of the descending order, counting repeated values separately. The *kth distinct largest* removes duplicates first; Example 2 shows they differ (4 vs 3).

Approach 1, the baseline: **sort and index** — O(n log n) time. Correct, short, and the right thing to say first.

## 4. Approach 2: A Min-Heap of Size k

📌 **Interview term: Min-heap** — a tree-shaped structure (stored in an array) where every parent is less than or equal to its children, so the smallest element is always at the root. Push and pop cost O(log size); reading the root is O(1). The full explanation is in [What is a heap / priority queue?](/interview-question/what-is-a-heap-priority-queue)

Keep a min-heap of the **k largest values seen so far**. For each new value: push it; if the heap now has k + 1 elements, pop the root (the smallest). After all n values, the heap holds the k largest, and its root — the smallest of them — is exactly the kth largest.

📌 **Interview term: Size-k heap** — the invariant "the heap holds the k largest values seen so far". Every operation is O(log k), so the whole pass is O(n log k) time and O(k) extra memory.

<svg class="iq-diagram" width="100%" viewBox="0 0 740 244" role="img" aria-label="A min-heap of size 3 holding 7, 8 and 9 with 7 at the root. A new 6 is pushed and popped straight back. A new 10 pushes out 7 and the root becomes 8">
  <defs>
    <marker id="b04q5-a-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="150" y="24" text-anchor="middle">min-heap, k = 3</text>
  <path class="d-edge" d="M 150 84 L 90 140"/>
  <path class="d-edge" d="M 150 84 L 210 140"/>
  <rect class="d-box-accent" x="120" y="44" width="60" height="44" rx="22"/>
  <text class="d-text" x="150" y="72" text-anchor="middle">7</text>
  <rect class="d-box" x="60" y="140" width="60" height="44" rx="22"/>
  <text class="d-text" x="90" y="168" text-anchor="middle">8</text>
  <rect class="d-box" x="180" y="140" width="60" height="44" rx="22"/>
  <text class="d-text" x="210" y="168" text-anchor="middle">9</text>
  <text class="d-sub" x="150" y="224" text-anchor="middle">root = 3rd largest</text>
  <rect class="d-box-muted" x="330" y="40" width="380" height="76" rx="10"/>
  <text class="d-text" x="520" y="70" text-anchor="middle">next value 6</text>
  <text class="d-sub" x="520" y="98" text-anchor="middle">push 6, size 4: pop 6 again</text>
  <rect class="d-box" x="330" y="146" width="380" height="76" rx="10"/>
  <text class="d-text" x="520" y="176" text-anchor="middle">next value 10</text>
  <text class="d-sub" x="520" y="204" text-anchor="middle">push 10, size 4: pop 7, root 8</text>
  <path class="d-edge-dashed" d="M 240 66 L 322 78" marker-end="url(#b04q5-a-java)"/>
  <path class="d-edge-dashed" d="M 236 80 L 322 176" marker-end="url(#b04q5-a-java)"/>
</svg>

Why a **min**-heap for the **largest** values? Because the question at every step is "is this new value good enough to enter the top k?", and the only value it has to beat is the weakest member of the top k — the root of a min-heap. A max-heap would put the *best* value at the root, which is the wrong one to compare with.

Example 2 prints the heap after every value of the stream \`5, 1, 9, 3, 7, 8, 2, 6\` with k = 3. Once three values are in, the root is the current 3rd largest: 1, then 3, 5, 7, and it stays 7 because 2 and 6 are pushed and popped straight back out.

📌 **Interview term: Streaming (online) algorithm** — one that processes values one at a time and can answer at any moment without seeing the rest. The size-k heap is one; sorting and Quickselect are not.

📌 **Interview term: Heapify** — turning an unordered array into a heap in O(n). A different heap solution heapifies all n values as a max-heap and pops k times: O(n + k log n).

## 5. Approach 3: Quickselect

The kth largest is the value at ascending index \`n - k\`, and [Quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element) finds the value at any index in O(n) on average: partition around a pivot, which lands at its sorted position \`p\`, then continue only in the side that contains \`n - k\`. Worst case O(n²) with unlucky pivots; random pivots make that very unlikely. That page traces the rounds and measures the worst case; here it is the third column of Example 1.

## 6. Which One Should You Choose?

<svg class="iq-diagram" width="100%" viewBox="0 0 750 170" role="img" aria-label="Three ways to find the kth largest. Sort in n log n, a size k min-heap in n log k, Quickselect in linear time on average">
  <defs>
    <marker id="b04q5-b-java" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="210" height="120" rx="10"/>
  <text class="d-text" x="135" y="62" text-anchor="middle">Sort</text>
  <text class="d-text d-accent" x="135" y="94" text-anchor="middle">O(n log n)</text>
  <text class="d-sub" x="135" y="124" text-anchor="middle">simple, reorders a copy</text>
  <rect class="d-box" x="270" y="30" width="210" height="120" rx="10"/>
  <text class="d-text" x="375" y="62" text-anchor="middle">Min-heap of size k</text>
  <text class="d-text d-accent" x="375" y="94" text-anchor="middle">O(n log k)</text>
  <text class="d-sub" x="375" y="124" text-anchor="middle">streams, O(k) memory</text>
  <rect class="d-box-accent" x="510" y="30" width="210" height="120" rx="10"/>
  <text class="d-text" x="615" y="62" text-anchor="middle">Quickselect</text>
  <text class="d-text d-accent" x="615" y="94" text-anchor="middle">O(n) average</text>
  <text class="d-sub" x="615" y="124" text-anchor="middle">in place, worst case n squared</text>
</svg>

| Situation | Best choice | Why |
| :--- | :--- | :--- |
| Quick, correct answer; n is modest | Sort | Shortest code, O(n log n) |
| Data arrives as a stream, or memory must stay small | Size-k heap | One pass, O(k) memory |
| k is small compared with n | Size-k heap | O(n log k) is close to O(n) |
| One-off query on an in-memory array, speed matters | Quickselect | O(n) average, in place |
| Worst-case guarantee required | Heap, or sort | Quickselect can degrade to O(n²) |

The longer comparison, with benchmarks, is in [heap vs quickselect, and when to choose which](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w).

> **Key insight:** you never need the full order — only the boundary between "top k" and "the rest". The heap keeps that boundary as its root; Quickselect finds it with partitions.

## 7. The Java Solution, Line by Line

~~~java
static int byHeap(int[] nums, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>();   // natural order = min-heap
    for (int x : nums) {
        heap.offer(x);
        if (heap.size() > k) heap.poll();                  // drop the smallest of the k+1
    }
    return heap.peek();                                    // unboxed on return
}
~~~

- \`new PriorityQueue<>()\` orders by natural ordering, and the head is the **least** element — a min-heap. We checked: a queue built from \`5, 1, 9, 3, 7\` had \`peek()\` equal to 1, while \`new PriorityQueue<>(Collections.reverseOrder())\` with \`5, 1, 9\` had \`peek()\` equal to 9.
- The JDK documentation's implementation note gives O(log n) time for \`offer\`, \`poll\`, \`remove()\` and \`add\`, linear time for \`remove(Object)\` and \`contains(Object)\`, and constant time for \`peek\`, \`element\` and \`size\` ([JDK 21 PriorityQueue docs](https://cs-214.epfl.ch/jdk-21.0.9-docs/api/java.base/java/util/PriorityQueue.html)). Here the queue never exceeds k + 1 elements, so each operation is O(log k).
- \`return heap.peek();\` auto-unboxes the \`Integer\` to \`int\`. On an empty queue \`peek()\` returns \`null\` and unboxing it throws \`NullPointerException\` — validate k first.

The sort baseline:

~~~java
static int bySorting(int[] nums, int k) {
    int[] a = nums.clone();
    Arrays.sort(a);
    return a[a.length - k];
}
~~~

- \`Arrays.sort(int[])\` sorts ascending only (there is no comparator overload for primitives), so read index \`n - k\` rather than sorting descending.

## 8. Java Details That Matter

- **Iteration order is not sorted.** \`PriorityQueue.toString()\` for \`5, 1, 9, 3, 7\` printed \`[1, 3, 9, 5, 7]\` — the internal array. Example 2 copies into an \`ArrayList\` and sorts it for display.
- **Boxing.** \`PriorityQueue<Integer>\` stores objects. That is fine for interview sizes; for millions of values a hand-written \`int[]\` heap or Quickselect avoids the allocation.
- **\`==\` on \`Integer\`.** Comparing two \`peek()\` results with \`==\` compares references and fails outside -128..127 (\`false\` for 1000 in our run); use \`.equals\` or unbox.
- **Max-heap.** \`new PriorityQueue<>(Collections.reverseOrder())\` or \`(a, b) -> Integer.compare(b, a)\`. Avoid \`(a, b) -> b - a\`: subtraction overflows for values far apart.
- **Distinct values.** A \`TreeSet<Integer>\` with \`descendingSet()\` gives the "kth distinct largest" (Example 2 prints 3 instead of 4).

## 9. Verified: Running the Code

Every program below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21.0.12). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — Sort vs size-k heap vs selection on six inputs**

~~~text
[3, 2, 1, 5, 6, 4] k=2: sort 5, heap 5, select 5
[3, 2, 3, 1, 2, 4, 5, 5, 6] k=4: sort 4, heap 4, select 4
[1] k=1: sort 1, heap 1, select 1
[7, 7, 7] k=2: sort 7, heap 7, select 7
[-1, -5, 3, 0] k=3: sort -1, heap -1, select -1
[2, 1] k=2: sort 1, heap 1, select 1
~~~

All three methods return the same value on every input. The Python, JavaScript and Java versions use the hand-written Quickselect from the Quickselect question for the select column; the C++ version uses \`std::nth_element\`.

**Example 2 — Watch the size-3 heap on a stream, and duplicates vs distinct values**

~~~text
add 5: heap [5] -> 3rd largest not ready
add 1: heap [1, 5] -> 3rd largest not ready
add 9: heap [1, 5, 9] -> 3rd largest 1
add 3: pop 1, heap [3, 5, 9] -> 3rd largest 3
add 7: pop 3, heap [5, 7, 9] -> 3rd largest 5
add 8: pop 5, heap [7, 8, 9] -> 3rd largest 7
add 2: pop 2, heap [7, 8, 9] -> 3rd largest 7
add 6: pop 6, heap [7, 8, 9] -> 3rd largest 7
descending [6, 5, 5, 4, 3, 3, 2, 2, 1]
4th largest 4 | 4th distinct largest 3
~~~

The heap contents are printed in sorted order for readability. The heap's own internal array is not sorted: in Python, \`heapq\` pushes of \`5, 1, 9, 3, 7\` leave the list as \`[1, 3, 9, 5, 7]\`, and Java \`PriorityQueue.toString()\` printed the same order.

## 10. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`Arrays.sort\` on a copy | O(n log n) | O(n) | Sorts everything |
| Size-k \`PriorityQueue\` | O(n log k) | O(k) | n offers and polls on at most k + 1 items |
| Max-heap of all n, poll k times | O(n log n + k log n) | O(n) | n offers to build, k polls |
| Quickselect | O(n) average, O(n²) worst | O(n) for the clone | One side per round; see the Quickselect question |

## 11. Edge Cases

- **k = 1** — the maximum; a single pass is enough (\`max\`).
- **k = n** — the minimum; a heap of size n is wasteful, so use a size-1 heap on the other side, or just the minimum.
- **One element** — \`[1]\`, k = 1 gives 1 in all three methods.
- **All equal** — \`[7, 7, 7]\`, k = 2 gives 7.
- **Negative numbers** — \`[-1, -5, 3, 0]\`, k = 3 gives -1; nothing special.
- **Duplicates** — counted separately unless the interviewer says distinct (Example 2: 4 vs 3).
- **Invalid k** — \`k < 1\` or \`k > n\`: validate and raise an error instead of returning garbage.

## 12. Common Pitfalls

- **Using \`(a, b) -> b - a\` as a comparator.** Subtraction can overflow \`int\`; use \`Integer.compare(b, a)\` or \`Collections.reverseOrder()\`.
- **Iterating the \`PriorityQueue\` and expecting sorted order.** Only \`peek()\`/\`poll()\` respect priority.
- **Comparing \`Integer\` results with \`==\`.** Reference comparison outside the -128..127 cache.
- **\`peek()\` on an empty queue then unboxing.** \`NullPointerException\`; validate k.
- **Using a max-heap of everything.** O(n) memory instead of O(k).
- **Off-by-one in Quickselect.** The kth largest is ascending index \`nums.length - k\`.

## 13. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;">Clone, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort</code>, return index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - k</code> — O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue&lt;Integer&gt;</code> is a min-heap: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">offer</code> each value, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">poll</code> when the size passes k; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek()</code> is the answer. O(n log k) time, O(k) space, works on a stream.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why min-heap:</strong> <span style="color:#f0e2c8;">A new value only has to beat the weakest of the current top k, which is the head of a min-heap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Quickselect:</strong> <span style="color:#f0e2c8;">Target index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - k</code>, partition and keep one side: O(n) average, O(n²) worst.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java notes:</strong> <span style="color:#f0e2c8;">Natural order is min-first, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.reverseOrder()</code> for max, iteration order is not sorted, and never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b - a</code> as a comparator.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a max-heap of everything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It costs O(n) memory and O(n log n) to build with offers. The size-k min-heap uses O(k) memory and compares each value with the current kth largest.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the cost of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">PriorityQueue.remove(Object)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Linear, per the JDK implementation note, because it must search the array first. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">poll()</code> is O(log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(a, b) -&gt; b - a</code> dangerous?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For values such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MIN_VALUE</code> and 1, the subtraction overflows and flips the sign, so the order is wrong. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.compare(b, a)</code> cannot overflow.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle an endless stream?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the size-k heap as a field and answer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek()</code> at any time — LeetCode 703.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if k is close to n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Find the (n - k + 1)th smallest with a size <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - k + 1</code> max-heap instead.</span>
</div>

</div>

## 14. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **kth largest (with duplicates)** | Value at position k of the descending order, repeats counted |
| **Min-heap** | Parent no bigger than children; the smallest is at the root |
| **Size-k heap** | Min-heap holding the k largest values seen so far; its root is the answer |
| **Streaming (online) algorithm** | Processes values one by one and can answer at any time |
| **Heapify** | Build a heap from an array in O(n) |

---
**Conclusion:** The kth largest element only needs the boundary between the top k and the rest. Sorting a clone finds it in O(n log n); a \`PriorityQueue<Integer>\` of size k — a min-heap by natural order — keeps the boundary at \`peek()\` in O(n log k) with O(k) memory; Quickselect at index \`n - k\` finds it in O(n) on average. In Java, be ready to say what the JDK documents (O(log n) \`offer\`/\`poll\`, linear \`remove(Object)\`), that iteration order is not sorted, and why \`Integer.compare\` beats \`b - a\` as a comparator.
`,
        examples: [
          { label: "Sort vs size-k heap vs selection on six inputs", code: `import java.util.Arrays;
import java.util.PriorityQueue;

public class Main {
    static long seed = 12345;
    static int rand(int k) {
        seed = seed * 48271 % 2147483647L;
        return (int) (seed % k);
    }
    static void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }

    // O(n log n): sort ascending (int[] has no reverse-order sort), read index n-k.
    static int bySorting(int[] nums, int k) {
        int[] a = nums.clone();
        Arrays.sort(a);
        return a[a.length - k];
    }

    // O(n log k): keep the k largest seen so far in a MIN-heap; its root is the answer.
    static int byHeap(int[] nums, int k) {
        PriorityQueue<Integer> heap = new PriorityQueue<>();   // natural order = min-heap
        for (int x : nums) {
            heap.offer(x);
            if (heap.size() > k) heap.poll();                  // drop the smallest of the k+1
        }
        return heap.peek();                                    // unboxed on return
    }

    // Average O(n): Quickselect for index n-k of the ascending order.
    static int bySelect(int[] nums, int k) {
        int[] a = nums.clone();
        int target = a.length - k;
        int lo = 0, hi = a.length - 1;
        while (lo < hi) {
            swap(a, lo + rand(hi - lo + 1), hi);
            int pivot = a[hi], store = lo;
            for (int j = lo; j < hi; j++) {
                if (a[j] < pivot) { swap(a, store, j); store++; }
            }
            swap(a, store, hi);
            if (store == target) break;
            if (target < store) hi = store - 1;
            else lo = store + 1;
        }
        return a[target];
    }

    static String fmt(int[] a) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < a.length; i++) sb.append(i == 0 ? "" : ", ").append(a[i]);
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        int[][] inputs = {{3, 2, 1, 5, 6, 4}, {3, 2, 3, 1, 2, 4, 5, 5, 6}, {1}, {7, 7, 7}, {-1, -5, 3, 0}, {2, 1}};
        int[] ks = {2, 4, 1, 2, 3, 2};
        for (int t = 0; t < inputs.length; t++) {
            int[] nums = inputs[t];
            int k = ks[t];
            System.out.println(fmt(nums) + " k=" + k + ": sort " + bySorting(nums, k) + ", heap " + byHeap(nums, k)
                    + ", select " + bySelect(nums, k));
        }
    }
}` },
          { label: "Watch the size-3 heap on a stream, and duplicates vs distinct values", code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.PriorityQueue;
import java.util.TreeSet;

public class Main {
    static String fmt(List<Integer> a) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < a.size(); i++) sb.append(i == 0 ? "" : ", ").append(a.get(i));
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        // 1) Watch the size-k min-heap on a stream of numbers (k = 3)
        int k = 3;
        PriorityQueue<Integer> heap = new PriorityQueue<>();
        for (int x : new int[]{5, 1, 9, 3, 7, 8, 2, 6}) {
            heap.offer(x);
            String action = "";
            if (heap.size() > k) action = " pop " + heap.poll() + ",";
            // PriorityQueue iteration order is NOT sorted, so copy and sort for display
            List<Integer> state = new ArrayList<>(heap);
            Collections.sort(state);
            String answer = heap.size() == k ? String.valueOf(heap.peek()) : "not ready";
            System.out.println("add " + x + ":" + action + " heap " + fmt(state) + " -> 3rd largest " + answer);
        }

        // 2) Duplicates: "kth largest" counts positions, "kth distinct largest" counts values
        int[] nums = {3, 2, 3, 1, 2, 4, 5, 5, 6};
        List<Integer> byPosition = new ArrayList<>();
        for (int v : nums) byPosition.add(v);
        byPosition.sort(Collections.reverseOrder());
        List<Integer> byValue = new ArrayList<>(new TreeSet<>(byPosition).descendingSet());
        System.out.println("descending " + fmt(byPosition));
        System.out.println("4th largest " + byPosition.get(3) + " | 4th distinct largest " + byValue.get(3));
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given an unsorted \`std::vector<int>\` and an integer k, return the kth largest element — the kth in sorted descending order, not the kth distinct. Please solve it in C++, and tell me the trade-offs between the approaches you know, including what the standard library gives you."

**What a strong answer should cover:**
- Sorting first: \`std::sort\` with \`std::greater<int>()\`, index \`k - 1\`; O(n log n).
- A min-heap of size k: \`std::priority_queue<int, std::vector<int>, std::greater<int>>\`; O(n log k) time, O(k) space; why a *min*-heap.
- Selection: \`std::nth_element\` (linear on average) or a hand-written Quickselect at index \`n - k\`.
- When to choose which: streams and small k favour the heap; one-off in-memory queries favour selection.
- C++ specifics: \`std::priority_queue\` is a **max**-heap by default, \`pop()\` returns \`void\`, the queue cannot be iterated, and \`nth_element\` only guarantees the nth position.

**Clarifying questions expected:**
- "Do duplicates count separately?"
- "Is the data a stream or a vector in memory?"

**Code / implementation expected:** Yes — the \`priority_queue\` solution and \`std::nth_element\` in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and sorting; heaps and Quickselect are summarised and linked.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output, step count and ordering claim below was produced by actually running the C++ programs in the **Verified** section.

## 1. Why This Even Matters — A Story First

A talent show has 500 contestants and only the **top 3** go to the final. The judge does not need a full ranking of all 500 — she only needs to know the score of the 3rd-best act, because that is the cut-off.

She could write all 500 scores down and sort them. Or she could do what a sensible judge does: keep a tiny "finalists" board with room for 3 names. Each time a new act finishes, compare it with the **weakest** finalist on the board. Worse than the weakest? Ignore it. Better? It replaces the weakest. At the end, the weakest name on the board *is* the 3rd-best act of the night.

The board is a **min-heap of size k**: it always knows its weakest member instantly. A third option is the teacher trick from [Quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element): split the scores around a random one and keep only the side that matters. Interviewers ask this question to see whether you know all three and can say when each is the right tool.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| "Do duplicates count separately?" | In \`[3, 2, 3, 1, 2, 4, 5, 5, 6]\` the 4th largest is 4 if duplicates count, 3 if you want the 4th *distinct* value (Example 2). |
| "Is k always between 1 and n?" | Otherwise there is no answer; validate first. |
| "Is the whole array in memory, or is it a stream?" | A stream rules out sorting and Quickselect; the size-k heap works with one pass. |
| "May I reorder the input?" | Quickselect and in-place sorting rearrange it; copy if not. |
| "How big are n and k?" | For k close to n, a heap of size \`n - k + 1\` (the smallest side) is cheaper; for tiny k the heap is nearly linear. |

## 3. What Does kth Largest Mean?

Sort the values in descending order and take position \`k\` (1-based). For \`[3, 2, 1, 5, 6, 4]\` that is \`6, 5, 4, ...\`, so the 2nd largest is 5. Equivalently it is the value at index \`n - k\` of the **ascending** order — the conversion every Quickselect solution uses.

📌 **Interview term: kth largest (with duplicates)** — the value at position k of the descending order, counting repeated values separately. The *kth distinct largest* removes duplicates first; Example 2 shows they differ (4 vs 3).

Approach 1, the baseline: **sort and index** — O(n log n) time. Correct, short, and the right thing to say first.

## 4. Approach 2: A Min-Heap of Size k

📌 **Interview term: Min-heap** — a tree-shaped structure (stored in an array) where every parent is less than or equal to its children, so the smallest element is always at the root. Push and pop cost O(log size); reading the root is O(1). The full explanation is in [What is a heap / priority queue?](/interview-question/what-is-a-heap-priority-queue)

Keep a min-heap of the **k largest values seen so far**. For each new value: push it; if the heap now has k + 1 elements, pop the root (the smallest). After all n values, the heap holds the k largest, and its root — the smallest of them — is exactly the kth largest.

📌 **Interview term: Size-k heap** — the invariant "the heap holds the k largest values seen so far". Every operation is O(log k), so the whole pass is O(n log k) time and O(k) extra memory.

<svg class="iq-diagram" width="100%" viewBox="0 0 740 244" role="img" aria-label="A min-heap of size 3 holding 7, 8 and 9 with 7 at the root. A new 6 is pushed and popped straight back. A new 10 pushes out 7 and the root becomes 8">
  <defs>
    <marker id="b04q5-a-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="150" y="24" text-anchor="middle">min-heap, k = 3</text>
  <path class="d-edge" d="M 150 84 L 90 140"/>
  <path class="d-edge" d="M 150 84 L 210 140"/>
  <rect class="d-box-accent" x="120" y="44" width="60" height="44" rx="22"/>
  <text class="d-text" x="150" y="72" text-anchor="middle">7</text>
  <rect class="d-box" x="60" y="140" width="60" height="44" rx="22"/>
  <text class="d-text" x="90" y="168" text-anchor="middle">8</text>
  <rect class="d-box" x="180" y="140" width="60" height="44" rx="22"/>
  <text class="d-text" x="210" y="168" text-anchor="middle">9</text>
  <text class="d-sub" x="150" y="224" text-anchor="middle">root = 3rd largest</text>
  <rect class="d-box-muted" x="330" y="40" width="380" height="76" rx="10"/>
  <text class="d-text" x="520" y="70" text-anchor="middle">next value 6</text>
  <text class="d-sub" x="520" y="98" text-anchor="middle">push 6, size 4: pop 6 again</text>
  <rect class="d-box" x="330" y="146" width="380" height="76" rx="10"/>
  <text class="d-text" x="520" y="176" text-anchor="middle">next value 10</text>
  <text class="d-sub" x="520" y="204" text-anchor="middle">push 10, size 4: pop 7, root 8</text>
  <path class="d-edge-dashed" d="M 240 66 L 322 78" marker-end="url(#b04q5-a-cpp)"/>
  <path class="d-edge-dashed" d="M 236 80 L 322 176" marker-end="url(#b04q5-a-cpp)"/>
</svg>

Why a **min**-heap for the **largest** values? Because the question at every step is "is this new value good enough to enter the top k?", and the only value it has to beat is the weakest member of the top k — the root of a min-heap. A max-heap would put the *best* value at the root, which is the wrong one to compare with.

Example 2 prints the heap after every value of the stream \`5, 1, 9, 3, 7, 8, 2, 6\` with k = 3. Once three values are in, the root is the current 3rd largest: 1, then 3, 5, 7, and it stays 7 because 2 and 6 are pushed and popped straight back out.

📌 **Interview term: Streaming (online) algorithm** — one that processes values one at a time and can answer at any moment without seeing the rest. The size-k heap is one; sorting and Quickselect are not.

📌 **Interview term: Heapify** — turning an unordered array into a heap in O(n). A different heap solution heapifies all n values as a max-heap and pops k times: O(n + k log n).

## 5. Approach 3: Quickselect

The kth largest is the value at ascending index \`n - k\`, and [Quickselect](/interview-question/how-does-quickselect-find-the-kth-smallest-largest-element) finds the value at any index in O(n) on average: partition around a pivot, which lands at its sorted position \`p\`, then continue only in the side that contains \`n - k\`. Worst case O(n²) with unlucky pivots; random pivots make that very unlikely. That page traces the rounds and measures the worst case; here it is the third column of Example 1.

## 6. Which One Should You Choose?

<svg class="iq-diagram" width="100%" viewBox="0 0 750 170" role="img" aria-label="Three ways to find the kth largest. Sort in n log n, a size k min-heap in n log k, Quickselect in linear time on average">
  <defs>
    <marker id="b04q5-b-cpp" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="210" height="120" rx="10"/>
  <text class="d-text" x="135" y="62" text-anchor="middle">Sort</text>
  <text class="d-text d-accent" x="135" y="94" text-anchor="middle">O(n log n)</text>
  <text class="d-sub" x="135" y="124" text-anchor="middle">simple, reorders a copy</text>
  <rect class="d-box" x="270" y="30" width="210" height="120" rx="10"/>
  <text class="d-text" x="375" y="62" text-anchor="middle">Min-heap of size k</text>
  <text class="d-text d-accent" x="375" y="94" text-anchor="middle">O(n log k)</text>
  <text class="d-sub" x="375" y="124" text-anchor="middle">streams, O(k) memory</text>
  <rect class="d-box-accent" x="510" y="30" width="210" height="120" rx="10"/>
  <text class="d-text" x="615" y="62" text-anchor="middle">Quickselect</text>
  <text class="d-text d-accent" x="615" y="94" text-anchor="middle">O(n) average</text>
  <text class="d-sub" x="615" y="124" text-anchor="middle">in place, worst case n squared</text>
</svg>

| Situation | Best choice | Why |
| :--- | :--- | :--- |
| Quick, correct answer; n is modest | Sort | Shortest code, O(n log n) |
| Data arrives as a stream, or memory must stay small | Size-k heap | One pass, O(k) memory |
| k is small compared with n | Size-k heap | O(n log k) is close to O(n) |
| One-off query on an in-memory array, speed matters | Quickselect | O(n) average, in place |
| Worst-case guarantee required | Heap, or sort | Quickselect can degrade to O(n²) |

The longer comparison, with benchmarks, is in [heap vs quickselect, and when to choose which](/interview-question/how-do-you-find-the-kth-largest-element-heap-vs-quickselect-and-when-to-choose-w).

> **Key insight:** you never need the full order — only the boundary between "top k" and "the rest". The heap keeps that boundary as its root; Quickselect finds it with partitions.

## 7. The C++ Solution, Line by Line

~~~cpp
int byHeap(const vector<int>& nums, int k) {
    std::priority_queue<int, vector<int>, std::greater<int>> heap;
    for (int x : nums) {
        heap.push(x);
        if (static_cast<int>(heap.size()) > k) heap.pop();  // drop the smallest of the k+1
    }
    return heap.top();
}
~~~

- \`std::priority_queue<int>\` on its own is a **max**-heap: pushing \`1, 5, 3\` gave \`top()\` equal to 5 in our run. The third template argument \`std::greater<int>\` flips it into the min-heap this solution needs (the second argument, the container, must be spelled out to reach the third).
- \`pop()\` returns \`void\`; read \`top()\` first if you need the value (Example 2 does).
- \`heap.size()\` is unsigned; the cast keeps the comparison with \`int k\` free of sign-compare warnings.

Selection with the standard library:

~~~cpp
int bySelect(vector<int> a, int k) {
    std::nth_element(a.begin(), a.begin() + (k - 1), a.end(), std::greater<int>());
    return a[k - 1];
}
~~~

- \`std::nth_element(first, nth, last, comp)\` rearranges so that \`*nth\` is the element that would be there if the range were sorted by \`comp\`; with \`std::greater<int>()\` that is descending order, so position \`k - 1\` holds the kth largest. [cppreference](https://en.cppreference.com/w/cpp/algorithm/nth_element) gives the complexity as O(N) comparisons on average. In GCC 13 libstdc++ it is introselect, which switches to heap selection after \`2 * log2(n)\` partition levels (we read \`bits/stl_algo.h\`).
- \`bySelect\` takes the vector **by value** because \`nth_element\` rearranges it.

## 8. C++ Details That Matter

- **\`std::priority_queue\` cannot be iterated.** To print its contents, Example 2 copies it and pops everything, which comes out in ascending order for a min-heap.
- **\`std::partial_sort(v.begin(), v.begin() + k, v.end(), std::greater<int>())\`** sorts just the top k into the front in O(n log k) — handy when the question becomes "return the top k in order".
- **\`std::make_heap\` / \`std::push_heap\` / \`std::pop_heap\`** work on a plain \`std::vector\`, if you need heap operations and iteration at the same time.
- **Distinct values.** \`std::set<int, std::greater<int>>\` gives the "kth distinct largest" (Example 2 prints 3 instead of 4).
- **Passing by value vs \`const&\`.** The heap version only reads the input, so it takes \`const std::vector<int>&\`; the sort and select versions need a copy they can rearrange.

## 9. Verified: Running the Code

Every program below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3.0 with -std=c++17). The output blocks are pasted from those runs, not typed by hand, and each program prints exactly the same lines in Python, JavaScript, Java and C++.

**Example 1 — Sort vs size-k heap vs selection on six inputs**

~~~text
[3, 2, 1, 5, 6, 4] k=2: sort 5, heap 5, select 5
[3, 2, 3, 1, 2, 4, 5, 5, 6] k=4: sort 4, heap 4, select 4
[1] k=1: sort 1, heap 1, select 1
[7, 7, 7] k=2: sort 7, heap 7, select 7
[-1, -5, 3, 0] k=3: sort -1, heap -1, select -1
[2, 1] k=2: sort 1, heap 1, select 1
~~~

All three methods return the same value on every input. The Python, JavaScript and Java versions use the hand-written Quickselect from the Quickselect question for the select column; the C++ version uses \`std::nth_element\`.

**Example 2 — Watch the size-3 heap on a stream, and duplicates vs distinct values**

~~~text
add 5: heap [5] -> 3rd largest not ready
add 1: heap [1, 5] -> 3rd largest not ready
add 9: heap [1, 5, 9] -> 3rd largest 1
add 3: pop 1, heap [3, 5, 9] -> 3rd largest 3
add 7: pop 3, heap [5, 7, 9] -> 3rd largest 5
add 8: pop 5, heap [7, 8, 9] -> 3rd largest 7
add 2: pop 2, heap [7, 8, 9] -> 3rd largest 7
add 6: pop 6, heap [7, 8, 9] -> 3rd largest 7
descending [6, 5, 5, 4, 3, 3, 2, 2, 1]
4th largest 4 | 4th distinct largest 3
~~~

The heap contents are printed in sorted order for readability. The heap's own internal array is not sorted: in Python, \`heapq\` pushes of \`5, 1, 9, 3, 7\` leave the list as \`[1, 3, 9, 5, 7]\`, and Java \`PriorityQueue.toString()\` printed the same order.

## 10. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`std::sort\` with \`std::greater\` | O(n log n) | O(n) for the copy | Sorts everything |
| Size-k min \`priority_queue\` | O(n log k) | O(k) | n pushes and pops on at most k + 1 items |
| \`std::partial_sort\` top k | O(n log k) | O(n) for the copy | Also returns the top k in order |
| \`std::nth_element\` | O(n) on average | O(n) for the copy | Introselect in libstdc++ |

## 11. Edge Cases

- **k = 1** — the maximum; a single pass is enough (\`max\`).
- **k = n** — the minimum; a heap of size n is wasteful, so use a size-1 heap on the other side, or just the minimum.
- **One element** — \`[1]\`, k = 1 gives 1 in all three methods.
- **All equal** — \`[7, 7, 7]\`, k = 2 gives 7.
- **Negative numbers** — \`[-1, -5, 3, 0]\`, k = 3 gives -1; nothing special.
- **Duplicates** — counted separately unless the interviewer says distinct (Example 2: 4 vs 3).
- **Invalid k** — \`k < 1\` or \`k > n\`: validate and raise an error instead of returning garbage.

## 12. Common Pitfalls

- **Forgetting that \`priority_queue\` is a max-heap.** Without \`std::greater<int>\` the size-k trick keeps the k *smallest* values.
- **Expecting \`pop()\` to return the value.** It returns \`void\`; call \`top()\` first.
- **Expecting \`nth_element\` to sort the rest.** Only position \`k - 1\` is guaranteed.
- **Calling \`top()\` on an empty queue.** Undefined behaviour, not an exception; validate k.
- **Off-by-one with comparators.** With \`std::greater\`, the kth largest is position \`k - 1\`; with the default order it is \`n - k\`.
- **Comparing \`heap.size()\` with a negative \`int\`.** Mixed signed/unsigned comparisons convert the \`int\` to a huge unsigned value.

## 13. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> a copy with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::greater&lt;int&gt;()</code>, return index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k - 1</code> — O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::priority_queue&lt;int, std::vector&lt;int&gt;, std::greater&lt;int&gt;&gt;</code> as a size-k min-heap: push, pop past k, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code> is the answer. O(n log k), O(k).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why min-heap:</strong> <span style="color:#f0e2c8;">A new value only has to beat the weakest of the current top k, which is the root of a min-heap — and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue</code> is a max-heap until you pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::greater</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Selection:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::nth_element</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::greater&lt;int&gt;()</code> at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k - 1</code>: linear on average, implemented as introselect in libstdc++.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Choosing:</strong> <span style="color:#f0e2c8;">Stream or small k: heap. One-off on a vector: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nth_element</code>. Top k in order: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">partial_sort</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">priority_queue</code> need three template arguments for a min-heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The comparator is the third parameter, so the container (second) must be written too: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::priority_queue&lt;int, std::vector&lt;int&gt;, std::greater&lt;int&gt;&gt;</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nth_element</code> leave in the rest of the vector?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Elements before the nth are not less than it (for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::greater</code>) and elements after are not greater; neither side is sorted.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the top k in order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::partial_sort</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::greater&lt;int&gt;()</code> on the first k positions: O(n log k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle an endless stream?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the size-k min <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue</code> and answer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code> at any time — LeetCode 703.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nth_element</code> go quadratic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The standard only promises linear on average. libstdc++ uses introselect, which falls back to heap selection after a depth limit, so a run of bad pivots cannot push it to n squared.</span>
</div>

</div>

## 14. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **kth largest (with duplicates)** | Value at position k of the descending order, repeats counted |
| **Min-heap** | Parent no bigger than children; the smallest is at the root |
| **Size-k heap** | Min-heap holding the k largest values seen so far; its root is the answer |
| **Streaming (online) algorithm** | Processes values one by one and can answer at any time |
| **Heapify** | Build a heap from an array in O(n) |

---
**Conclusion:** The kth largest element only needs the boundary between the top k and the rest. Sorting finds it in O(n log n); a size-k min-heap keeps the boundary at \`top()\` in O(n log k) with O(k) memory; selection finds it in O(n) on average. In C++ the strong answer knows the library: \`std::priority_queue\` is a max-heap until you pass \`std::greater<int>\`, \`pop()\` returns \`void\`, \`std::nth_element\` is the production one-liner (introselect in libstdc++), and \`std::partial_sort\` is there when the top k must come back in order.
`,
        examples: [
          { label: "Sort vs size-k heap vs selection on six inputs", code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <queue>
#include <string>
#include <utility>
#include <vector>

using std::vector;

// O(n log n): sort descending with std::greater, read position k-1.
int bySorting(vector<int> a, int k) {        // by value: sorting a copy
    std::sort(a.begin(), a.end(), std::greater<int>());
    return a[k - 1];
}

// O(n log k): keep the k largest seen so far in a MIN-heap; its root is the answer.
// std::priority_queue is a MAX-heap by default, so pass std::greater<int>.
int byHeap(const vector<int>& nums, int k) {
    std::priority_queue<int, vector<int>, std::greater<int>> heap;
    for (int x : nums) {
        heap.push(x);
        if (static_cast<int>(heap.size()) > k) heap.pop();  // drop the smallest of the k+1
    }
    return heap.top();
}

// Average linear: std::nth_element puts the element that belongs at position k-1
// (in descending order) there, with larger ones before it and smaller ones after.
int bySelect(vector<int> a, int k) {
    std::nth_element(a.begin(), a.begin() + (k - 1), a.end(), std::greater<int>());
    return a[k - 1];
}

std::string fmt(const vector<int>& a) {
    std::string s = "[";
    for (size_t i = 0; i < a.size(); i++) s += (i ? ", " : "") + std::to_string(a[i]);
    return s + "]";
}

int main() {
    vector<std::pair<vector<int>, int>> cases = {{{3, 2, 1, 5, 6, 4}, 2},
                                                 {{3, 2, 3, 1, 2, 4, 5, 5, 6}, 4},
                                                 {{1}, 1},
                                                 {{7, 7, 7}, 2},
                                                 {{-1, -5, 3, 0}, 3},
                                                 {{2, 1}, 2}};
    for (const auto& [nums, k] : cases) {
        std::cout << fmt(nums) << " k=" << k << ": sort " << bySorting(nums, k) << ", heap " << byHeap(nums, k)
                  << ", select " << bySelect(nums, k) << "\\n";
    }
    return 0;
}` },
          { label: "Watch the size-3 heap on a stream, and duplicates vs distinct values", code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <queue>
#include <set>
#include <string>
#include <vector>

using std::vector;

std::string fmt(const vector<int>& a) {
    std::string s = "[";
    for (size_t i = 0; i < a.size(); i++) s += (i ? ", " : "") + std::to_string(a[i]);
    return s + "]";
}

using MinHeap = std::priority_queue<int, vector<int>, std::greater<int>>;

// priority_queue cannot be iterated: copy it and pop everything (comes out ascending)
vector<int> contents(MinHeap h) {
    vector<int> out;
    while (!h.empty()) { out.push_back(h.top()); h.pop(); }
    return out;
}

int main() {
    // 1) Watch the size-k min-heap on a stream of numbers (k = 3)
    const size_t k = 3;
    MinHeap heap;
    for (int x : {5, 1, 9, 3, 7, 8, 2, 6}) {
        heap.push(x);
        std::string action;
        if (heap.size() > k) {
            action = " pop " + std::to_string(heap.top()) + ",";   // pop() returns void: read top() first
            heap.pop();
        }
        std::string answer = heap.size() == k ? std::to_string(heap.top()) : "not ready";
        std::cout << "add " << x << ":" << action << " heap " << fmt(contents(heap)) << " -> 3rd largest " << answer << "\\n";
    }

    // 2) Duplicates: "kth largest" counts positions, "kth distinct largest" counts values
    vector<int> nums = {3, 2, 3, 1, 2, 4, 5, 5, 6};
    vector<int> byPosition = nums;
    std::sort(byPosition.begin(), byPosition.end(), std::greater<int>());
    std::set<int, std::greater<int>> distinct(nums.begin(), nums.end());
    vector<int> byValue(distinct.begin(), distinct.end());
    std::cout << "descending " << fmt(byPosition) << "\\n";
    std::cout << "4th largest " << byPosition[3] << " | 4th distinct largest " << byValue[3] << "\\n";
    return 0;
}` },
        ],
      },
    },
  },
];

export default augments;
