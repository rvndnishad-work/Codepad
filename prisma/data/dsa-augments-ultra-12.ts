/**
 * DSA ULTRA — batch 12: stacks and strings. One complete answer per language
 * (Python, JavaScript, Java, C++). Every example was run with python3 / node /
 * javac+java / g++ -std=c++17 by scripts/verify-dsa-examples.ts and the quoted
 * output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  {
    title: `How do you find the largest rectangle in a histogram?`,
    difficulty: "hard",
    seoDescription: `Largest rectangle in a histogram in Python, JavaScript, Java and C++: the O(n) monotonic stack, why each pop is final, sentinels and 64-bit areas.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given a list of bar heights for a histogram where every bar is 1 unit wide. Find the area of the largest rectangle that fits inside the bars. Start with any working idea, then get it to linear time. Please write it in Python."

**What a strong answer should cover:**
- The rectangle's height is the shortest bar it covers, so each bar's best rectangle spans from its previous smaller bar to its next smaller bar.
- A monotonic stack of indices (heights increasing) finds both edges at the moment a bar is popped; width is \`i - stack[-1] - 1\` or \`i\` when the stack is empty.
- O(n) time because each index is pushed and popped once; O(n) extra space for the stack; the O(n^2) brute force as a warm-up.
- A sentinel height 0 at the end (or a final clean-up loop) so bars still on the stack are counted.
- Python specifics: a plain \`list\` is the stack (\`append\`/\`pop\`/\`[-1]\`), \`stack[-1]\` on an empty list raises \`IndexError\`, and Python ints never overflow.

**Clarifying questions expected:**
- "Can heights be 0, and can the list be empty?"
- "Do you want only the area, or the bounds of the rectangle too?"

**Code / implementation expected:** Yes — \`largest_rectangle(heights)\` in Python with a list used as a stack, ideally in one pass with a sentinel.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Hard
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A city has a row of buildings of different heights, all one block wide and standing shoulder to shoulder. A billboard company wants to paint the **biggest possible rectangular advert** across their faces. The advert must be a single rectangle, it must sit on the ground, and it cannot stick out above any building it covers. A tall tower on its own gives a tall, thin advert; a long run of medium buildings gives a short, wide one. Which is bigger?

You could try every pair of "first building" and "last building" and use the shortest building between them as the advert height. That works, but with 100,000 buildings it is about five billion pairs. The trick interviewers want is to look at the street **once**, left to right, while keeping a small pile of "buildings that are still waiting to find out how wide their advert can be". That pile is a **stack**, and it turns the problem from hours into milliseconds.

The buildings are the bars of a **histogram**: an array \`heights\` where each bar has width 1. The question asks for the area of the largest rectangle that fits entirely inside the bars.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is every bar exactly width 1? | The classic version says yes; variable widths change the width arithmetic. |
| Can heights be 0? Can the array be empty? | A 0 bar splits the histogram; an empty array should return 0. |
| How large can n and the heights be? | With n up to 10^5 and heights up to 10^4 the area still fits in 32 bits, but larger limits overflow. |
| Do you want only the area, or the rectangle itself? | Returning the left and right bar indices is a small extension of the same loop. |
| Is O(n^2) acceptable, or do you need O(n)? | Tells you whether the brute force is a warm-up or the answer. |

## 3. The Core Idea

📌 **Interview term: Histogram** — here, an array of non-negative bar heights where every bar is 1 unit wide and the bars touch.

📌 **Interview term: Largest rectangle in a histogram** — the maximum of \`height * width\` over every rectangle that sits on the baseline and stays inside the bars. Its height is always the height of **some bar** (the shortest bar it covers), and it is as wide as that bar can stretch left and right before hitting a shorter bar.

That second sentence is the whole problem. For each bar \`k\`, ask: "if \`k\` is the shortest bar in my rectangle, how far can I extend?" The answer is: left until the first bar shorter than \`heights[k]\`, right until the first bar shorter than \`heights[k]\`. Call those the **previous smaller** and **next smaller** bars. Then

\`area(k) = heights[k] * (nextSmaller - prevSmaller - 1)\`

and the answer is the largest \`area(k)\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 300" role="img" aria-label="Histogram with bars 2 1 5 6 2 3, the bars of height 5 and 6 are highlighted and the largest rectangle is height 5 across two bars, area 10">
  <rect class="d-box" x="60" y="190" width="60" height="60" rx="3"/>
  <text class="d-sub" x="90" y="180" text-anchor="middle">2</text>
  <rect class="d-box" x="140" y="220" width="60" height="30" rx="3"/>
  <text class="d-sub" x="170" y="210" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="220" y="100" width="60" height="150" rx="3"/>
  <text class="d-sub" x="250" y="90" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="300" y="70" width="60" height="180" rx="3"/>
  <text class="d-sub" x="330" y="60" text-anchor="middle">6</text>
  <rect class="d-box" x="380" y="190" width="60" height="60" rx="3"/>
  <text class="d-sub" x="410" y="180" text-anchor="middle">2</text>
  <rect class="d-box" x="460" y="160" width="60" height="90" rx="3"/>
  <text class="d-sub" x="490" y="150" text-anchor="middle">3</text>
  <path class="d-edge-dashed" d="M 220 100 L 360 100 L 360 250 L 220 250 Z" fill="none"/>
  <text class="d-text" x="290" y="185" text-anchor="middle">5 x 2 = 10</text>
  <text class="d-sub" x="90" y="276" text-anchor="middle">0</text>
  <text class="d-sub" x="170" y="276" text-anchor="middle">1</text>
  <text class="d-sub" x="250" y="276" text-anchor="middle">2</text>
  <text class="d-sub" x="330" y="276" text-anchor="middle">3</text>
  <text class="d-sub" x="410" y="276" text-anchor="middle">4</text>
  <text class="d-sub" x="490" y="276" text-anchor="middle">5</text>
</svg>

In \`[2, 1, 5, 6, 2, 3]\` the winner is the bar of height 5 at index 2: the bar on its left (height 1) is shorter, and the first shorter bar on its right is index 4 (height 2), so it stretches over indices 2 and 3, giving \`5 * 2 = 10\`. The tall bar of height 6 alone only gives 6.

### Brute force first

Fix a left bar \`i\`, walk \`j\` to the right, and keep the running minimum height. Each pair \`(i, j)\` gives one candidate \`min * (j - i + 1)\`. It is correct and easy to say out loud, but it is O(n^2): for 3,000 bars it does 4,501,500 steps (Example 2 counts them).

### The O(n) monotonic stack

📌 **Interview term: Monotonic stack** — a stack whose values are kept in sorted order from bottom to top by popping anything that would break the order before each push. The general pattern has its own page: [what is a monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it).

Walk the bars left to right and keep a stack of **indices** whose heights strictly increase from bottom to top. When the next bar \`i\` is **lower than or equal to** the bar on top of the stack, the top bar has just found its "next smaller" bar: it is \`i\`. And its "previous smaller" bar is the index right below it on the stack (everything between was popped earlier because it was taller). So at the moment of popping you know both edges, and you can compute that bar's best area immediately:

- \`top = pop()\`
- \`left = (new top) + 1\`, or \`0\` if the stack is now empty
- \`width = i - left\`, \`area = heights[top] * width\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 290" role="img" aria-label="Stack holds indices 1 2 3 with heights 1 5 6, the incoming bar at index 4 has height 2, so index 3 is popped with area 6 and then index 2 with area 10">
  <defs>
    <marker id="hist2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="95" y="26" text-anchor="middle">stack bottom</text>
  <text class="d-sub" x="355" y="26" text-anchor="middle">stack top</text>
  <rect class="d-box-muted" x="40" y="40" width="110" height="64" rx="8"/>
  <text class="d-text" x="95" y="68" text-anchor="middle">index 1</text>
  <text class="d-sub" x="95" y="90" text-anchor="middle">height 1</text>
  <rect class="d-box" x="170" y="40" width="110" height="64" rx="8"/>
  <text class="d-text" x="225" y="68" text-anchor="middle">index 2</text>
  <text class="d-sub" x="225" y="90" text-anchor="middle">height 5</text>
  <rect class="d-box-accent" x="300" y="40" width="110" height="64" rx="8"/>
  <text class="d-text" x="355" y="68" text-anchor="middle">index 3</text>
  <text class="d-sub" x="355" y="90" text-anchor="middle">height 6</text>
  <rect class="d-box-accent" x="480" y="40" width="130" height="64" rx="8"/>
  <text class="d-text" x="545" y="68" text-anchor="middle">i = 4</text>
  <text class="d-sub" x="545" y="90" text-anchor="middle">height 2</text>
  <path class="d-edge-accent" d="M 476 72 L 416 72" marker-end="url(#hist2-arrow)"/>
  <path class="d-edge" d="M 225 108 L 170 180" marker-end="url(#hist2-arrow)"/>
  <path class="d-edge" d="M 355 108 L 470 180" marker-end="url(#hist2-arrow)"/>
  <rect class="d-box" x="40" y="186" width="260" height="76" rx="10"/>
  <text class="d-text" x="170" y="216" text-anchor="middle">second pop: index 2</text>
  <text class="d-sub" x="170" y="240" text-anchor="middle">height 5, width 2, area 10</text>
  <rect class="d-box" x="340" y="186" width="260" height="76" rx="10"/>
  <text class="d-text" x="470" y="216" text-anchor="middle">first pop: index 3</text>
  <text class="d-sub" x="470" y="240" text-anchor="middle">height 6, width 1, area 6</text>
</svg>

When bar 4 (height 2) arrives, the stack holds indices 1, 2, 3 (heights 1, 5, 6). Height 6 is not lower than 2, so index 3 pops: it spans only itself, area 6. Then index 2 pops: its left edge is index 1 + 1 = 2 and its right edge is 3, area 10. Index 1 (height 1) stays, because 1 is lower than 2.

📌 **Interview term: Sentinel** — an extra fake element added at the end (or start) so that the main loop handles the leftovers without a separate clean-up loop. Here a height-0 bar after the last real bar forces every remaining index off the stack.

📌 **Interview term: Amortised O(n)** — the inner \`while\` can pop many items at once, but each index is pushed once and popped at most once over the whole run, so the total work is at most 2n stack operations. Example 2 prints exactly \`2n + 1\` (n pushes, n pops, plus the sentinel push).

**Why popping on equal heights is safe.** With \`>=\`, a run of equal bars pops the earlier ones with a width that is too short, but the **last** bar of the run is popped later with the full width, because its left edge is found through the stack below the whole run. In \`[3, 3, 3, 3]\` the program reports 12 (height 3, bars 0 to 3). Using \`>\` instead also works; just do not mix the two in your head while explaining.

This same "previous smaller / next smaller" idea solves [the next greater element](/interview-question/how-do-you-find-the-next-greater-element-for-every-item-daily-temperatures) and is the inner step of the "maximal rectangle of 1s in a binary matrix" problem: treat each row as the floor of a histogram and run this algorithm once per row.

## 4. The Stack Solution in Python

A Python \`list\` is the idiomatic stack: \`append\` pushes onto the end, \`pop()\` removes from the end, and \`stack[-1]\` peeks. All three are O(1) amortised on the end of a list.

~~~python
def largest_rectangle_area(heights):
    stack = []                      # indices; heights strictly increase bottom to top
    best = 0
    n = len(heights)
    for i in range(n + 1):
        h = heights[i] if i < n else 0         # sentinel: height 0 after the last bar
        while stack and heights[stack[-1]] >= h:
            top = stack.pop()                  # its next smaller bar is i
            left = stack[-1] + 1 if stack else 0   # its previous smaller bar is the new top
            best = max(best, heights[top] * (i - left))
        stack.append(i)
    return best
~~~

**Why each line is there:**

- \`range(n + 1)\` with \`h = 0\` at \`i == n\` is the sentinel; it avoids mutating the caller list with \`heights.append(0)\`, which is a common shortcut that silently changes the input.
- \`while stack and ...\` checks emptiness first, because \`stack[-1]\` on an empty list raises \`IndexError\`.
- \`left = stack[-1] + 1 if stack else 0\`: an empty stack means no shorter bar exists on the left, so the rectangle reaches index 0.
- The stack stores **indices**, not heights; the width needs positions, and the height is one lookup away.

Example 1 extends this to also return the winning rectangle as \`(area, height, left, right)\`, and Example 2 counts the steps of the brute force and of the stack.

**Integers.** Python ints are arbitrary precision, so \`50000 * 50000\` is simply 2500000000; there is nothing to widen. That is a real difference from Java and C++, where the same product overflows a 32-bit \`int\`.

## 5. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — the monotonic stack on tricky inputs, with the winning rectangle** prints:

~~~text
[2, 1, 5, 6, 2, 3] => 10 (height 5, bars 2 to 3)
[2, 4] => 4 (height 4, bars 1 to 1)
[6, 2, 5, 4, 5, 1, 6] => 12 (height 4, bars 2 to 4)
[1, 2, 3, 4, 5] => 9 (height 3, bars 2 to 4)
[5, 4, 3, 2, 1] => 9 (height 3, bars 0 to 2)
[3, 3, 3, 3] => 12 (height 3, bars 0 to 3)
[7] => 7 (height 7, bars 0 to 0)
[0, 0] => 0
[] => 0
~~~

**Example 2 — brute force versus stack, counting steps, plus a 64-bit area** prints:

~~~text
n=10 area=38808 same=true brute_steps=55 stack_steps=21
n=100 area=49875 same=true brute_steps=5050 stack_steps=201
n=1000 area=70488 same=true brute_steps=500500 stack_steps=2001
n=3000 area=84419 same=true brute_steps=4501500 stack_steps=6001
50000 bars of height 50000 => 2500000000 in 100001 steps
~~~

**Reading the output:** \`[2, 4]\` reports height 4 on bar 1, not height 2 across both bars: both have area 4, and the program keeps the first one it finds (strict \`>\`). \`[1, 2, 3, 4, 5]\` and \`[5, 4, 3, 2, 1]\` both give 9 (height 3 over three bars). \`[0, 0]\` and \`[]\` give 0. In Example 2, \`same=true\` on every line means the O(n^2) brute force and the stack agree; the brute force step count is exactly \`n(n+1)/2\` while the stack count is \`2n + 1\`. The last line is an area of 2,500,000,000, which does not fit in a signed 32-bit integer.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Every pair (i, j) with running minimum | O(n^2) | O(1) | n(n+1)/2 pairs, O(1) each |
| Divide and conquer on the minimum bar | O(n log n) average, O(n^2) worst | O(n) recursion | sorted input makes the split one-sided |
| Monotonic stack | O(n) | O(n) | every index is pushed once and popped once |

## 7. Edge Cases

- **Empty array:** return 0; the loop only processes the sentinel.
- **One bar:** its own height.
- **Zeros:** a 0 bar pops everything before it, so rectangles never cross it.
- **Strictly increasing** (\`[1, 2, 3, 4, 5]\`): nothing pops until the sentinel; the stack grows to n.
- **All equal** (\`[3, 3, 3, 3]\`): the last equal bar is popped with the full width.
- **Large values:** \`height * width\` can exceed 2^31 - 1 (see the 50,000 x 50,000 line).

## Common Pitfalls

- **Forgetting the leftovers.** Without the sentinel (or a clean-up loop), bars still on the stack at the end are never measured: \`[1, 2, 3, 4, 5]\` would return 0.
- **Width off by one.** The width is \`i - left\` where \`left = stack[-1] + 1\` after the pop, not \`i - top\`. Using the popped index forgets the taller bars that were popped earlier to its left.
- **Peeking an empty list.** \`heights[stack[-1]]\` with an empty \`stack\` raises \`IndexError\`; keep \`stack and\` first in the condition.
- **Mutating the input.** \`heights.append(0)\` as a sentinel changes the caller list; iterate to \`n\` instead, or copy first.
- **Storing heights instead of indices.** You lose the positions you need for the width.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key fact:</strong> <span style="color:#f0e2c8;">The best rectangle has the height of some bar <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> and spans from the previous smaller bar to the next smaller bar of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The stack:</strong> <span style="color:#f0e2c8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code> of indices with increasing heights; when bar <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> is not taller than the top, pop: its right edge is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, its left edge is the new top plus one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Area:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heights[top] * (i - left)</code>, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left = 0</code> if the stack is empty; track the maximum.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Sentinel:</strong> <span style="color:#f0e2c8;">Loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> up to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> and treat <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i == n</code> as height 0, so every bar is popped and measured.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time because each index is pushed and popped once, O(n) space; Python ints cannot overflow.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it O(n) when there is a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while</code> inside the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">for</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each index enters the stack once and leaves at most once, so all pops over the whole run total at most n. The verified run shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2n + 1</code> steps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the stack hold indices rather than heights?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The width is a difference of positions. With the index you can always get the height back as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heights[i]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes if I pop with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;=</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Equal bars stay on the stack and the last one is measured with the full width when a lower bar arrives. Both give the same maximum.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you solve maximal rectangle of 1s in a binary matrix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build a histogram per row: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[c] += 1</code> if the cell is 1, else reset to 0. Run this algorithm on every row. O(rows * cols).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it without a sentinel?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: after the loop, pop the rest with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i = n</code> as the right edge. The sentinel just merges that clean-up into the main loop.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Histogram** | bars of width 1 standing side by side |
| **Largest rectangle in a histogram** | max of height times width over rectangles inside the bars |
| **Monotonic stack** | a stack kept sorted by popping before every push |
| **Sentinel** | a fake extra element that flushes the loop at the end |
| **Amortised O(n)** | total work over the run is O(n) even if one step does more |

---
**Conclusion:** The largest rectangle in a histogram falls out of one observation: the rectangle is as tall as its shortest bar, and that bar stretches until a shorter bar on each side. A monotonic stack of indices hands you both edges at the moment a bar is popped, so a single left-to-right pass with a height-0 sentinel solves it in O(n) time and O(n) space. In Python, a plain list is the stack, the empty-list check must come before \`stack[-1]\`, and arbitrary-precision ints remove the overflow worry entirely.`,
        examples: [
          { label: `The monotonic stack on tricky inputs, with the winning rectangle`, code: `def largest_rectangle(heights):
    """Return (area, height, left, right) of the largest rectangle; left/right are bar indices."""
    stack = []                      # indices of bars, heights strictly increasing bottom to top
    best = (0, 0, -1, -1)
    n = len(heights)
    for i in range(n + 1):
        h = heights[i] if i < n else 0         # a height-0 sentinel flushes the stack at the end
        while stack and heights[stack[-1]] >= h:
            top = stack.pop()                  # bar top cannot extend past i - 1
            left = stack[-1] + 1 if stack else 0
            area = heights[top] * (i - left)   # width runs from left to i - 1
            if area > best[0]:
                best = (area, heights[top], left, i - 1)
        stack.append(i)
    return best


def show(heights):
    area, h, l, r = largest_rectangle(heights)
    bars = "[" + ", ".join(str(x) for x in heights) + "]"
    if area == 0:
        return bars + " => 0"
    return bars + " => " + str(area) + " (height " + str(h) + ", bars " + str(l) + " to " + str(r) + ")"


print(show([2, 1, 5, 6, 2, 3]))  # [2, 1, 5, 6, 2, 3] => 10 (height 5, bars 2 to 3)
print(show([2, 4]))  # [2, 4] => 4 (height 4, bars 1 to 1)
print(show([6, 2, 5, 4, 5, 1, 6]))  # [6, 2, 5, 4, 5, 1, 6] => 12 (height 4, bars 2 to 4)
print(show([1, 2, 3, 4, 5]))  # [1, 2, 3, 4, 5] => 9 (height 3, bars 2 to 4)
print(show([5, 4, 3, 2, 1]))  # [5, 4, 3, 2, 1] => 9 (height 3, bars 0 to 2)
print(show([3, 3, 3, 3]))  # [3, 3, 3, 3] => 12 (height 3, bars 0 to 3)
print(show([7]))  # [7] => 7 (height 7, bars 0 to 0)
print(show([0, 0]))  # [0, 0] => 0
print(show([]))  # [] => 0` },
          { label: `Brute force versus stack, counting steps, plus a 64-bit area`, code: `def brute_force(heights):
    """O(n^2): fix the left bar, extend right, keep the running minimum height."""
    best, steps = 0, 0
    for i in range(len(heights)):
        low = heights[i]
        for j in range(i, len(heights)):
            steps += 1
            low = min(low, heights[j])
            best = max(best, low * (j - i + 1))
    return best, steps


def with_stack(heights):
    """O(n): monotonic stack; steps counts pushes plus pops."""
    stack, best, steps = [], 0, 0
    n = len(heights)
    for i in range(n + 1):
        h = heights[i] if i < n else 0
        while stack and heights[stack[-1]] >= h:
            top = stack.pop()
            steps += 1
            left = stack[-1] + 1 if stack else 0
            best = max(best, heights[top] * (i - left))
        stack.append(i)
        steps += 1
    return best, steps


def make_bars(n, seed):
    """Deterministic pseudo-random heights 0..9999 (same generator in every language)."""
    out, x = [], seed
    for _ in range(n):
        x = (x * 48271) % 2147483647
        out.append(x % 10000)
    return out


for n in [10, 100, 1000, 3000]:
    bars = make_bars(n, n + 7)
    a, brute_steps = brute_force(bars)
    b, stack_steps = with_stack(bars)
    print("n=" + str(n) + " area=" + str(b) + " same=" + str(a == b).lower()
          + " brute_steps=" + str(brute_steps) + " stack_steps=" + str(stack_steps))

big = [50000] * 50000
area, steps = with_stack(big)
print("50000 bars of height 50000 => " + str(area) + " in " + str(steps) + " steps")` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given an array of bar heights for a histogram where every bar is 1 unit wide. Find the area of the largest rectangle that fits inside the bars. Start with any working idea, then get it to linear time. Please write it in JavaScript."

**What a strong answer should cover:**
- The rectangle's height is the shortest bar it covers, so each bar's best rectangle spans from its previous smaller bar to its next smaller bar.
- A monotonic stack of indices (heights increasing) finds both edges at the moment a bar is popped; width is \`i - stack[stack.length - 1] - 1\` or \`i\` when the stack is empty.
- O(n) time because each index is pushed and popped once; O(n) extra space; the O(n^2) brute force as a warm-up.
- A sentinel height 0 at the end so bars still on the stack are counted.
- JavaScript specifics: an array with \`push\`/\`pop\` is the stack; reading \`stack[stack.length - 1]\` on an empty array gives \`undefined\` (no error), so the emptiness check matters; areas are exact up to \`Number.MAX_SAFE_INTEGER\` (2^53 - 1).

**Clarifying questions expected:**
- "Can heights be 0, and can the array be empty?"
- "Do you want only the area, or the bounds of the rectangle too?"

**Code / implementation expected:** Yes — \`largestRectangleArea(heights)\` in JavaScript with an array used as a stack, one pass with a sentinel.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Hard
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A city has a row of buildings of different heights, all one block wide and standing shoulder to shoulder. A billboard company wants to paint the **biggest possible rectangular advert** across their faces. The advert must be a single rectangle, it must sit on the ground, and it cannot stick out above any building it covers. A tall tower on its own gives a tall, thin advert; a long run of medium buildings gives a short, wide one. Which is bigger?

You could try every pair of "first building" and "last building" and use the shortest building between them as the advert height. That works, but with 100,000 buildings it is about five billion pairs. The trick interviewers want is to look at the street **once**, left to right, while keeping a small pile of "buildings that are still waiting to find out how wide their advert can be". That pile is a **stack**, and it turns the problem from hours into milliseconds.

The buildings are the bars of a **histogram**: an array \`heights\` where each bar has width 1. The question asks for the area of the largest rectangle that fits entirely inside the bars.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is every bar exactly width 1? | The classic version says yes; variable widths change the width arithmetic. |
| Can heights be 0? Can the array be empty? | A 0 bar splits the histogram; an empty array should return 0. |
| How large can n and the heights be? | With n up to 10^5 and heights up to 10^4 the area still fits in 32 bits, but larger limits overflow. |
| Do you want only the area, or the rectangle itself? | Returning the left and right bar indices is a small extension of the same loop. |
| Is O(n^2) acceptable, or do you need O(n)? | Tells you whether the brute force is a warm-up or the answer. |

## 3. The Core Idea

📌 **Interview term: Histogram** — here, an array of non-negative bar heights where every bar is 1 unit wide and the bars touch.

📌 **Interview term: Largest rectangle in a histogram** — the maximum of \`height * width\` over every rectangle that sits on the baseline and stays inside the bars. Its height is always the height of **some bar** (the shortest bar it covers), and it is as wide as that bar can stretch left and right before hitting a shorter bar.

That second sentence is the whole problem. For each bar \`k\`, ask: "if \`k\` is the shortest bar in my rectangle, how far can I extend?" The answer is: left until the first bar shorter than \`heights[k]\`, right until the first bar shorter than \`heights[k]\`. Call those the **previous smaller** and **next smaller** bars. Then

\`area(k) = heights[k] * (nextSmaller - prevSmaller - 1)\`

and the answer is the largest \`area(k)\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 300" role="img" aria-label="Histogram with bars 2 1 5 6 2 3, the bars of height 5 and 6 are highlighted and the largest rectangle is height 5 across two bars, area 10">
  <rect class="d-box" x="60" y="190" width="60" height="60" rx="3"/>
  <text class="d-sub" x="90" y="180" text-anchor="middle">2</text>
  <rect class="d-box" x="140" y="220" width="60" height="30" rx="3"/>
  <text class="d-sub" x="170" y="210" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="220" y="100" width="60" height="150" rx="3"/>
  <text class="d-sub" x="250" y="90" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="300" y="70" width="60" height="180" rx="3"/>
  <text class="d-sub" x="330" y="60" text-anchor="middle">6</text>
  <rect class="d-box" x="380" y="190" width="60" height="60" rx="3"/>
  <text class="d-sub" x="410" y="180" text-anchor="middle">2</text>
  <rect class="d-box" x="460" y="160" width="60" height="90" rx="3"/>
  <text class="d-sub" x="490" y="150" text-anchor="middle">3</text>
  <path class="d-edge-dashed" d="M 220 100 L 360 100 L 360 250 L 220 250 Z" fill="none"/>
  <text class="d-text" x="290" y="185" text-anchor="middle">5 x 2 = 10</text>
  <text class="d-sub" x="90" y="276" text-anchor="middle">0</text>
  <text class="d-sub" x="170" y="276" text-anchor="middle">1</text>
  <text class="d-sub" x="250" y="276" text-anchor="middle">2</text>
  <text class="d-sub" x="330" y="276" text-anchor="middle">3</text>
  <text class="d-sub" x="410" y="276" text-anchor="middle">4</text>
  <text class="d-sub" x="490" y="276" text-anchor="middle">5</text>
</svg>

In \`[2, 1, 5, 6, 2, 3]\` the winner is the bar of height 5 at index 2: the bar on its left (height 1) is shorter, and the first shorter bar on its right is index 4 (height 2), so it stretches over indices 2 and 3, giving \`5 * 2 = 10\`. The tall bar of height 6 alone only gives 6.

### Brute force first

Fix a left bar \`i\`, walk \`j\` to the right, and keep the running minimum height. Each pair \`(i, j)\` gives one candidate \`min * (j - i + 1)\`. It is correct and easy to say out loud, but it is O(n^2): for 3,000 bars it does 4,501,500 steps (Example 2 counts them).

### The O(n) monotonic stack

📌 **Interview term: Monotonic stack** — a stack whose values are kept in sorted order from bottom to top by popping anything that would break the order before each push. The general pattern has its own page: [what is a monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it).

Walk the bars left to right and keep a stack of **indices** whose heights strictly increase from bottom to top. When the next bar \`i\` is **lower than or equal to** the bar on top of the stack, the top bar has just found its "next smaller" bar: it is \`i\`. And its "previous smaller" bar is the index right below it on the stack (everything between was popped earlier because it was taller). So at the moment of popping you know both edges, and you can compute that bar's best area immediately:

- \`top = pop()\`
- \`left = (new top) + 1\`, or \`0\` if the stack is now empty
- \`width = i - left\`, \`area = heights[top] * width\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 290" role="img" aria-label="Stack holds indices 1 2 3 with heights 1 5 6, the incoming bar at index 4 has height 2, so index 3 is popped with area 6 and then index 2 with area 10">
  <defs>
    <marker id="hist2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="95" y="26" text-anchor="middle">stack bottom</text>
  <text class="d-sub" x="355" y="26" text-anchor="middle">stack top</text>
  <rect class="d-box-muted" x="40" y="40" width="110" height="64" rx="8"/>
  <text class="d-text" x="95" y="68" text-anchor="middle">index 1</text>
  <text class="d-sub" x="95" y="90" text-anchor="middle">height 1</text>
  <rect class="d-box" x="170" y="40" width="110" height="64" rx="8"/>
  <text class="d-text" x="225" y="68" text-anchor="middle">index 2</text>
  <text class="d-sub" x="225" y="90" text-anchor="middle">height 5</text>
  <rect class="d-box-accent" x="300" y="40" width="110" height="64" rx="8"/>
  <text class="d-text" x="355" y="68" text-anchor="middle">index 3</text>
  <text class="d-sub" x="355" y="90" text-anchor="middle">height 6</text>
  <rect class="d-box-accent" x="480" y="40" width="130" height="64" rx="8"/>
  <text class="d-text" x="545" y="68" text-anchor="middle">i = 4</text>
  <text class="d-sub" x="545" y="90" text-anchor="middle">height 2</text>
  <path class="d-edge-accent" d="M 476 72 L 416 72" marker-end="url(#hist2-arrow)"/>
  <path class="d-edge" d="M 225 108 L 170 180" marker-end="url(#hist2-arrow)"/>
  <path class="d-edge" d="M 355 108 L 470 180" marker-end="url(#hist2-arrow)"/>
  <rect class="d-box" x="40" y="186" width="260" height="76" rx="10"/>
  <text class="d-text" x="170" y="216" text-anchor="middle">second pop: index 2</text>
  <text class="d-sub" x="170" y="240" text-anchor="middle">height 5, width 2, area 10</text>
  <rect class="d-box" x="340" y="186" width="260" height="76" rx="10"/>
  <text class="d-text" x="470" y="216" text-anchor="middle">first pop: index 3</text>
  <text class="d-sub" x="470" y="240" text-anchor="middle">height 6, width 1, area 6</text>
</svg>

When bar 4 (height 2) arrives, the stack holds indices 1, 2, 3 (heights 1, 5, 6). Height 6 is not lower than 2, so index 3 pops: it spans only itself, area 6. Then index 2 pops: its left edge is index 1 + 1 = 2 and its right edge is 3, area 10. Index 1 (height 1) stays, because 1 is lower than 2.

📌 **Interview term: Sentinel** — an extra fake element added at the end (or start) so that the main loop handles the leftovers without a separate clean-up loop. Here a height-0 bar after the last real bar forces every remaining index off the stack.

📌 **Interview term: Amortised O(n)** — the inner \`while\` can pop many items at once, but each index is pushed once and popped at most once over the whole run, so the total work is at most 2n stack operations. Example 2 prints exactly \`2n + 1\` (n pushes, n pops, plus the sentinel push).

**Why popping on equal heights is safe.** With \`>=\`, a run of equal bars pops the earlier ones with a width that is too short, but the **last** bar of the run is popped later with the full width, because its left edge is found through the stack below the whole run. In \`[3, 3, 3, 3]\` the program reports 12 (height 3, bars 0 to 3). Using \`>\` instead also works; just do not mix the two in your head while explaining.

This same "previous smaller / next smaller" idea solves [the next greater element](/interview-question/how-do-you-find-the-next-greater-element-for-every-item-daily-temperatures) and is the inner step of the "maximal rectangle of 1s in a binary matrix" problem: treat each row as the floor of a histogram and run this algorithm once per row.

## 4. The Stack Solution in JavaScript

A JavaScript array is the idiomatic stack: \`push\` adds to the end, \`pop()\` removes from the end, and \`stack[stack.length - 1]\` peeks (\`stack.at(-1)\` also works in ES2022).

~~~javascript
function largestRectangleArea(heights) {
  const stack = []; // indices; heights strictly increase bottom to top
  let best = 0;
  const n = heights.length;
  for (let i = 0; i <= n; i++) {
    const h = i < n ? heights[i] : 0; // sentinel: height 0 after the last bar
    while (stack.length > 0 && heights[stack[stack.length - 1]] >= h) {
      const top = stack.pop(); // its next smaller bar is i
      const left = stack.length > 0 ? stack[stack.length - 1] + 1 : 0; // previous smaller + 1
      best = Math.max(best, heights[top] * (i - left));
    }
    stack.push(i);
  }
  return best;
}
~~~

**Why each line is there:**

- \`i <= n\` with \`h = 0\` at \`i === n\` is the sentinel; it avoids \`heights.push(0)\`, which would mutate the caller array.
- \`stack.length > 0 &&\` must come first. Unlike Python, JavaScript does not throw on an empty peek: \`stack[-1]\` is \`undefined\`, \`heights[undefined]\` is \`undefined\`, and \`undefined >= 0\` is \`false\`, so a missing check fails silently instead of loudly.
- \`left\` is the new top plus one, or 0 when the stack is empty.
- The stack stores **indices**, because the width needs positions.

Example 1 extends this to return \`[area, height, left, right]\`; Example 2 counts the steps of the brute force and of the stack.

**Numbers.** Every JavaScript number is a 64-bit float, which represents integers exactly up to 2^53 - 1. The 2,500,000,000 area in Example 2 is far below that, so it prints exactly; you would only need \`BigInt\` for areas above about 9 * 10^15.

## 5. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — the monotonic stack on tricky inputs, with the winning rectangle** prints:

~~~text
[2, 1, 5, 6, 2, 3] => 10 (height 5, bars 2 to 3)
[2, 4] => 4 (height 4, bars 1 to 1)
[6, 2, 5, 4, 5, 1, 6] => 12 (height 4, bars 2 to 4)
[1, 2, 3, 4, 5] => 9 (height 3, bars 2 to 4)
[5, 4, 3, 2, 1] => 9 (height 3, bars 0 to 2)
[3, 3, 3, 3] => 12 (height 3, bars 0 to 3)
[7] => 7 (height 7, bars 0 to 0)
[0, 0] => 0
[] => 0
~~~

**Example 2 — brute force versus stack, counting steps, plus a 64-bit area** prints:

~~~text
n=10 area=38808 same=true brute_steps=55 stack_steps=21
n=100 area=49875 same=true brute_steps=5050 stack_steps=201
n=1000 area=70488 same=true brute_steps=500500 stack_steps=2001
n=3000 area=84419 same=true brute_steps=4501500 stack_steps=6001
50000 bars of height 50000 => 2500000000 in 100001 steps
~~~

**Reading the output:** \`[2, 4]\` reports height 4 on bar 1, not height 2 across both bars: both have area 4, and the program keeps the first one it finds (strict \`>\`). \`[1, 2, 3, 4, 5]\` and \`[5, 4, 3, 2, 1]\` both give 9 (height 3 over three bars). \`[0, 0]\` and \`[]\` give 0. In Example 2, \`same=true\` on every line means the O(n^2) brute force and the stack agree; the brute force step count is exactly \`n(n+1)/2\` while the stack count is \`2n + 1\`. The last line is an area of 2,500,000,000, which does not fit in a signed 32-bit integer.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Every pair (i, j) with running minimum | O(n^2) | O(1) | n(n+1)/2 pairs, O(1) each |
| Divide and conquer on the minimum bar | O(n log n) average, O(n^2) worst | O(n) recursion | sorted input makes the split one-sided |
| Monotonic stack | O(n) | O(n) | every index is pushed once and popped once |

## 7. Edge Cases

- **Empty array:** return 0; the loop only processes the sentinel.
- **One bar:** its own height.
- **Zeros:** a 0 bar pops everything before it, so rectangles never cross it.
- **Strictly increasing** (\`[1, 2, 3, 4, 5]\`): nothing pops until the sentinel; the stack grows to n.
- **All equal** (\`[3, 3, 3, 3]\`): the last equal bar is popped with the full width.
- **Large values:** \`height * width\` can exceed 2^31 - 1 (see the 50,000 x 50,000 line).

## Common Pitfalls

- **Forgetting the leftovers.** Without the sentinel, bars still on the stack are never measured: \`[1, 2, 3, 4, 5]\` would return 0.
- **Width off by one.** Use \`i - left\` with \`left\` = new top + 1, not \`i - top\`.
- **Silent empty peeks.** \`stack[stack.length - 1]\` on an empty array is \`undefined\`, comparisons with \`undefined\` are \`false\`, and the bug hides; check \`stack.length > 0\` first.
- **Mutating the input.** \`heights.push(0)\` changes the caller array; loop to \`n\` instead.
- **\`Math.max(...bigArray)\`.** Do not collect all areas and spread them into \`Math.max\`; in a test run on Node 22 a 1,000,000-element spread threw \`RangeError\`. Track the running maximum instead.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key fact:</strong> <span style="color:#f0e2c8;">The best rectangle has the height of some bar <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> and spans from the previous smaller bar to the next smaller bar of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The stack:</strong> <span style="color:#f0e2c8;">An array of indices with increasing heights; when bar <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> is not taller than the top, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>: right edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, left edge new top plus one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Area:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heights[top] * (i - left)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left = 0</code> if the stack is empty; keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Sentinel:</strong> <span style="color:#f0e2c8;">Loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &lt;= n</code> and use height 0 at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i === n</code> so every bar is measured.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time, O(n) space; numbers are exact up to 2^53 - 1, so areas do not overflow in practice.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it O(n) when there is a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while</code> inside the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">for</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each index is pushed once and popped at most once, so total pops are at most n. The verified run shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2n + 1</code> steps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you forget the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">stack.length &gt; 0</code> check?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No exception: the peek is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> and the comparison is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>, so the loop stops early and the result can be wrong without any error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">BigInt</code> ever be needed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">height * width</code> could exceed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number.MAX_SAFE_INTEGER</code>, about 9 * 10^15. Typical limits (10^5 bars, 10^4 height) are nowhere near.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you solve maximal rectangle of 1s in a binary matrix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build a histogram per row: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[c] += 1</code> if the cell is 1, else reset to 0. Run this algorithm on every row. O(rows * cols).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it without a sentinel?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: after the loop, pop the rest using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> as the right edge. The sentinel only merges that clean-up into the main loop.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Histogram** | bars of width 1 standing side by side |
| **Largest rectangle in a histogram** | max of height times width over rectangles inside the bars |
| **Monotonic stack** | a stack kept sorted by popping before every push |
| **Sentinel** | a fake extra element that flushes the loop at the end |
| **Amortised O(n)** | total work over the run is O(n) even if one step does more |

---
**Conclusion:** The largest rectangle in a histogram falls out of one observation: the rectangle is as tall as its shortest bar, and that bar stretches until a shorter bar on each side. A monotonic stack of indices hands you both edges when a bar is popped, so a single pass with a height-0 sentinel solves it in O(n) time and O(n) space. In JavaScript, an array is the stack, an empty peek fails silently rather than throwing, and numbers stay exact far beyond any realistic area.`,
        examples: [
          { label: `The monotonic stack on tricky inputs, with the winning rectangle`, code: `function largestRectangle(heights) {
  // Returns [area, height, left, right] of the largest rectangle; left/right are bar indices.
  const stack = []; // indices of bars, heights strictly increasing bottom to top
  let best = [0, 0, -1, -1];
  const n = heights.length;
  for (let i = 0; i <= n; i++) {
    const h = i < n ? heights[i] : 0; // a height-0 sentinel flushes the stack at the end
    while (stack.length > 0 && heights[stack[stack.length - 1]] >= h) {
      const top = stack.pop(); // bar top cannot extend past i - 1
      const left = stack.length > 0 ? stack[stack.length - 1] + 1 : 0;
      const area = heights[top] * (i - left); // width runs from left to i - 1
      if (area > best[0]) best = [area, heights[top], left, i - 1];
    }
    stack.push(i);
  }
  return best;
}

function show(heights) {
  const [area, h, l, r] = largestRectangle(heights);
  const bars = '[' + heights.join(', ') + ']';
  if (area === 0) return bars + ' => 0';
  return bars + ' => ' + area + ' (height ' + h + ', bars ' + l + ' to ' + r + ')';
}

console.log(show([2, 1, 5, 6, 2, 3])); // [2, 1, 5, 6, 2, 3] => 10 (height 5, bars 2 to 3)
console.log(show([2, 4])); // [2, 4] => 4 (height 4, bars 1 to 1)
console.log(show([6, 2, 5, 4, 5, 1, 6])); // [6, 2, 5, 4, 5, 1, 6] => 12 (height 4, bars 2 to 4)
console.log(show([1, 2, 3, 4, 5])); // [1, 2, 3, 4, 5] => 9 (height 3, bars 2 to 4)
console.log(show([5, 4, 3, 2, 1])); // [5, 4, 3, 2, 1] => 9 (height 3, bars 0 to 2)
console.log(show([3, 3, 3, 3])); // [3, 3, 3, 3] => 12 (height 3, bars 0 to 3)
console.log(show([7])); // [7] => 7 (height 7, bars 0 to 0)
console.log(show([0, 0])); // [0, 0] => 0
console.log(show([])); // [] => 0` },
          { label: `Brute force versus stack, counting steps, plus a 64-bit area`, code: `function bruteForce(heights) {
  // O(n^2): fix the left bar, extend right, keep the running minimum height.
  let best = 0, steps = 0;
  for (let i = 0; i < heights.length; i++) {
    let low = heights[i];
    for (let j = i; j < heights.length; j++) {
      steps++;
      low = Math.min(low, heights[j]);
      best = Math.max(best, low * (j - i + 1));
    }
  }
  return [best, steps];
}

function withStack(heights) {
  // O(n): monotonic stack; steps counts pushes plus pops.
  const stack = [];
  let best = 0, steps = 0;
  const n = heights.length;
  for (let i = 0; i <= n; i++) {
    const h = i < n ? heights[i] : 0;
    while (stack.length > 0 && heights[stack[stack.length - 1]] >= h) {
      const top = stack.pop();
      steps++;
      const left = stack.length > 0 ? stack[stack.length - 1] + 1 : 0;
      best = Math.max(best, heights[top] * (i - left));
    }
    stack.push(i);
    steps++;
  }
  return [best, steps];
}

function makeBars(n, seed) {
  // Deterministic pseudo-random heights 0..9999 (same generator in every language).
  const out = [];
  let x = seed;
  for (let k = 0; k < n; k++) {
    x = (x * 48271) % 2147483647; // stays below 2^53, so the Number math is exact
    out.push(x % 10000);
  }
  return out;
}

for (const n of [10, 100, 1000, 3000]) {
  const bars = makeBars(n, n + 7);
  const [a, bruteSteps] = bruteForce(bars);
  const [b, stackSteps] = withStack(bars);
  console.log('n=' + n + ' area=' + b + ' same=' + (a === b)
    + ' brute_steps=' + bruteSteps + ' stack_steps=' + stackSteps);
}

const big = new Array(50000).fill(50000);
const [area, steps] = withStack(big);
console.log('50000 bars of height 50000 => ' + area + ' in ' + steps + ' steps');` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given an int array of bar heights for a histogram where every bar is 1 unit wide. Find the area of the largest rectangle that fits inside the bars. Start with any working idea, then get it to linear time. Please write it in Java."

**What a strong answer should cover:**
- The rectangle's height is the shortest bar it covers, so each bar's best rectangle spans from its previous smaller bar to its next smaller bar.
- A monotonic stack of indices (heights increasing) gives both edges at the moment a bar is popped; width is \`i - stack.peek() - 1\` or \`i\` when empty.
- O(n) time because each index is pushed and popped once; O(n) extra space; the O(n^2) brute force as a warm-up.
- A sentinel height 0 at the end so bars still on the stack are counted.
- Java specifics: use \`ArrayDeque<Integer>\` (or a plain \`int[]\` stack), not the legacy \`Stack\`; \`peek()\` on an empty deque returns \`null\` and unboxing it throws; \`height * width\` in \`int\` can overflow, so widen to \`long\` before multiplying.

**Clarifying questions expected:**
- "Can heights be 0, and can the array be empty?"
- "How large can n and the heights be — does the area fit in an int?"

**Code / implementation expected:** Yes — \`largestRectangleArea(int[] heights)\` in Java with \`ArrayDeque<Integer>\` or an \`int[]\` stack, one pass with a sentinel.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Hard
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A city has a row of buildings of different heights, all one block wide and standing shoulder to shoulder. A billboard company wants to paint the **biggest possible rectangular advert** across their faces. The advert must be a single rectangle, it must sit on the ground, and it cannot stick out above any building it covers. A tall tower on its own gives a tall, thin advert; a long run of medium buildings gives a short, wide one. Which is bigger?

You could try every pair of "first building" and "last building" and use the shortest building between them as the advert height. That works, but with 100,000 buildings it is about five billion pairs. The trick interviewers want is to look at the street **once**, left to right, while keeping a small pile of "buildings that are still waiting to find out how wide their advert can be". That pile is a **stack**, and it turns the problem from hours into milliseconds.

The buildings are the bars of a **histogram**: an array \`heights\` where each bar has width 1. The question asks for the area of the largest rectangle that fits entirely inside the bars.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is every bar exactly width 1? | The classic version says yes; variable widths change the width arithmetic. |
| Can heights be 0? Can the array be empty? | A 0 bar splits the histogram; an empty array should return 0. |
| How large can n and the heights be? | With n up to 10^5 and heights up to 10^4 the area still fits in 32 bits, but larger limits overflow. |
| Do you want only the area, or the rectangle itself? | Returning the left and right bar indices is a small extension of the same loop. |
| Is O(n^2) acceptable, or do you need O(n)? | Tells you whether the brute force is a warm-up or the answer. |

## 3. The Core Idea

📌 **Interview term: Histogram** — here, an array of non-negative bar heights where every bar is 1 unit wide and the bars touch.

📌 **Interview term: Largest rectangle in a histogram** — the maximum of \`height * width\` over every rectangle that sits on the baseline and stays inside the bars. Its height is always the height of **some bar** (the shortest bar it covers), and it is as wide as that bar can stretch left and right before hitting a shorter bar.

That second sentence is the whole problem. For each bar \`k\`, ask: "if \`k\` is the shortest bar in my rectangle, how far can I extend?" The answer is: left until the first bar shorter than \`heights[k]\`, right until the first bar shorter than \`heights[k]\`. Call those the **previous smaller** and **next smaller** bars. Then

\`area(k) = heights[k] * (nextSmaller - prevSmaller - 1)\`

and the answer is the largest \`area(k)\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 300" role="img" aria-label="Histogram with bars 2 1 5 6 2 3, the bars of height 5 and 6 are highlighted and the largest rectangle is height 5 across two bars, area 10">
  <rect class="d-box" x="60" y="190" width="60" height="60" rx="3"/>
  <text class="d-sub" x="90" y="180" text-anchor="middle">2</text>
  <rect class="d-box" x="140" y="220" width="60" height="30" rx="3"/>
  <text class="d-sub" x="170" y="210" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="220" y="100" width="60" height="150" rx="3"/>
  <text class="d-sub" x="250" y="90" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="300" y="70" width="60" height="180" rx="3"/>
  <text class="d-sub" x="330" y="60" text-anchor="middle">6</text>
  <rect class="d-box" x="380" y="190" width="60" height="60" rx="3"/>
  <text class="d-sub" x="410" y="180" text-anchor="middle">2</text>
  <rect class="d-box" x="460" y="160" width="60" height="90" rx="3"/>
  <text class="d-sub" x="490" y="150" text-anchor="middle">3</text>
  <path class="d-edge-dashed" d="M 220 100 L 360 100 L 360 250 L 220 250 Z" fill="none"/>
  <text class="d-text" x="290" y="185" text-anchor="middle">5 x 2 = 10</text>
  <text class="d-sub" x="90" y="276" text-anchor="middle">0</text>
  <text class="d-sub" x="170" y="276" text-anchor="middle">1</text>
  <text class="d-sub" x="250" y="276" text-anchor="middle">2</text>
  <text class="d-sub" x="330" y="276" text-anchor="middle">3</text>
  <text class="d-sub" x="410" y="276" text-anchor="middle">4</text>
  <text class="d-sub" x="490" y="276" text-anchor="middle">5</text>
</svg>

In \`[2, 1, 5, 6, 2, 3]\` the winner is the bar of height 5 at index 2: the bar on its left (height 1) is shorter, and the first shorter bar on its right is index 4 (height 2), so it stretches over indices 2 and 3, giving \`5 * 2 = 10\`. The tall bar of height 6 alone only gives 6.

### Brute force first

Fix a left bar \`i\`, walk \`j\` to the right, and keep the running minimum height. Each pair \`(i, j)\` gives one candidate \`min * (j - i + 1)\`. It is correct and easy to say out loud, but it is O(n^2): for 3,000 bars it does 4,501,500 steps (Example 2 counts them).

### The O(n) monotonic stack

📌 **Interview term: Monotonic stack** — a stack whose values are kept in sorted order from bottom to top by popping anything that would break the order before each push. The general pattern has its own page: [what is a monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it).

Walk the bars left to right and keep a stack of **indices** whose heights strictly increase from bottom to top. When the next bar \`i\` is **lower than or equal to** the bar on top of the stack, the top bar has just found its "next smaller" bar: it is \`i\`. And its "previous smaller" bar is the index right below it on the stack (everything between was popped earlier because it was taller). So at the moment of popping you know both edges, and you can compute that bar's best area immediately:

- \`top = pop()\`
- \`left = (new top) + 1\`, or \`0\` if the stack is now empty
- \`width = i - left\`, \`area = heights[top] * width\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 290" role="img" aria-label="Stack holds indices 1 2 3 with heights 1 5 6, the incoming bar at index 4 has height 2, so index 3 is popped with area 6 and then index 2 with area 10">
  <defs>
    <marker id="hist2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="95" y="26" text-anchor="middle">stack bottom</text>
  <text class="d-sub" x="355" y="26" text-anchor="middle">stack top</text>
  <rect class="d-box-muted" x="40" y="40" width="110" height="64" rx="8"/>
  <text class="d-text" x="95" y="68" text-anchor="middle">index 1</text>
  <text class="d-sub" x="95" y="90" text-anchor="middle">height 1</text>
  <rect class="d-box" x="170" y="40" width="110" height="64" rx="8"/>
  <text class="d-text" x="225" y="68" text-anchor="middle">index 2</text>
  <text class="d-sub" x="225" y="90" text-anchor="middle">height 5</text>
  <rect class="d-box-accent" x="300" y="40" width="110" height="64" rx="8"/>
  <text class="d-text" x="355" y="68" text-anchor="middle">index 3</text>
  <text class="d-sub" x="355" y="90" text-anchor="middle">height 6</text>
  <rect class="d-box-accent" x="480" y="40" width="130" height="64" rx="8"/>
  <text class="d-text" x="545" y="68" text-anchor="middle">i = 4</text>
  <text class="d-sub" x="545" y="90" text-anchor="middle">height 2</text>
  <path class="d-edge-accent" d="M 476 72 L 416 72" marker-end="url(#hist2-arrow)"/>
  <path class="d-edge" d="M 225 108 L 170 180" marker-end="url(#hist2-arrow)"/>
  <path class="d-edge" d="M 355 108 L 470 180" marker-end="url(#hist2-arrow)"/>
  <rect class="d-box" x="40" y="186" width="260" height="76" rx="10"/>
  <text class="d-text" x="170" y="216" text-anchor="middle">second pop: index 2</text>
  <text class="d-sub" x="170" y="240" text-anchor="middle">height 5, width 2, area 10</text>
  <rect class="d-box" x="340" y="186" width="260" height="76" rx="10"/>
  <text class="d-text" x="470" y="216" text-anchor="middle">first pop: index 3</text>
  <text class="d-sub" x="470" y="240" text-anchor="middle">height 6, width 1, area 6</text>
</svg>

When bar 4 (height 2) arrives, the stack holds indices 1, 2, 3 (heights 1, 5, 6). Height 6 is not lower than 2, so index 3 pops: it spans only itself, area 6. Then index 2 pops: its left edge is index 1 + 1 = 2 and its right edge is 3, area 10. Index 1 (height 1) stays, because 1 is lower than 2.

📌 **Interview term: Sentinel** — an extra fake element added at the end (or start) so that the main loop handles the leftovers without a separate clean-up loop. Here a height-0 bar after the last real bar forces every remaining index off the stack.

📌 **Interview term: Amortised O(n)** — the inner \`while\` can pop many items at once, but each index is pushed once and popped at most once over the whole run, so the total work is at most 2n stack operations. Example 2 prints exactly \`2n + 1\` (n pushes, n pops, plus the sentinel push).

**Why popping on equal heights is safe.** With \`>=\`, a run of equal bars pops the earlier ones with a width that is too short, but the **last** bar of the run is popped later with the full width, because its left edge is found through the stack below the whole run. In \`[3, 3, 3, 3]\` the program reports 12 (height 3, bars 0 to 3). Using \`>\` instead also works; just do not mix the two in your head while explaining.

This same "previous smaller / next smaller" idea solves [the next greater element](/interview-question/how-do-you-find-the-next-greater-element-for-every-item-daily-temperatures) and is the inner step of the "maximal rectangle of 1s in a binary matrix" problem: treat each row as the floor of a histogram and run this algorithm once per row.

## 4. The Stack Solution in Java

The Java documentation for the legacy \`java.util.Stack\` class itself says that the \`Deque\` interface and its implementations "should be used in preference to this class" ([Stack, Java SE 17 API](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Stack.html)). So the idiomatic stack is \`ArrayDeque<Integer>\`: \`push\`, \`pop\` and \`peek\` all work on the head.

~~~java
static long largestRectangleArea(int[] heights) {
    Deque<Integer> stack = new ArrayDeque<>();   // indices; heights strictly increase
    long best = 0;
    int n = heights.length;
    for (int i = 0; i <= n; i++) {
        int h = i < n ? heights[i] : 0;          // sentinel: height 0 after the last bar
        while (!stack.isEmpty() && heights[stack.peek()] >= h) {
            int top = stack.pop();               // its next smaller bar is i
            int left = stack.isEmpty() ? 0 : stack.peek() + 1;
            best = Math.max(best, (long) heights[top] * (i - left));
        }
        stack.push(i);
    }
    return best;
}
~~~

**Why each line is there:**

- \`!stack.isEmpty()\` first: on an empty \`ArrayDeque\`, \`peek()\` returns \`null\`, and using that \`null\` as an array index unboxes it and throws \`NullPointerException\`; \`pop()\` on an empty deque throws \`NoSuchElementException\` (both seen in a test run).
- \`(long) heights[top] * (i - left)\`: the cast must apply **before** the multiplication. Example 2 needs this for its 2,500,000,000 area.
- \`int top = stack.pop();\` auto-unboxes the \`Integer\`. Boxing every index is fine for interviews; Example 2 shows the faster alternative, a plain \`int[] stack\` with a \`size\` counter, which avoids boxing entirely.

**The overflow, verified.** A separate three-line program printed:

~~~text
int multiply:  -1794967296
long multiply: 2500000000
~~~

The first line is \`long wrong = height * width;\` with two \`int\` operands: Java multiplies in \`int\`, wraps around, and only then widens the wrong value to \`long\`.

## 5. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — the monotonic stack on tricky inputs, with the winning rectangle** prints:

~~~text
[2, 1, 5, 6, 2, 3] => 10 (height 5, bars 2 to 3)
[2, 4] => 4 (height 4, bars 1 to 1)
[6, 2, 5, 4, 5, 1, 6] => 12 (height 4, bars 2 to 4)
[1, 2, 3, 4, 5] => 9 (height 3, bars 2 to 4)
[5, 4, 3, 2, 1] => 9 (height 3, bars 0 to 2)
[3, 3, 3, 3] => 12 (height 3, bars 0 to 3)
[7] => 7 (height 7, bars 0 to 0)
[0, 0] => 0
[] => 0
~~~

**Example 2 — brute force versus stack, counting steps, plus a 64-bit area** prints:

~~~text
n=10 area=38808 same=true brute_steps=55 stack_steps=21
n=100 area=49875 same=true brute_steps=5050 stack_steps=201
n=1000 area=70488 same=true brute_steps=500500 stack_steps=2001
n=3000 area=84419 same=true brute_steps=4501500 stack_steps=6001
50000 bars of height 50000 => 2500000000 in 100001 steps
~~~

**Reading the output:** \`[2, 4]\` reports height 4 on bar 1, not height 2 across both bars: both have area 4, and the program keeps the first one it finds (strict \`>\`). \`[1, 2, 3, 4, 5]\` and \`[5, 4, 3, 2, 1]\` both give 9 (height 3 over three bars). \`[0, 0]\` and \`[]\` give 0. In Example 2, \`same=true\` on every line means the O(n^2) brute force and the stack agree; the brute force step count is exactly \`n(n+1)/2\` while the stack count is \`2n + 1\`. The last line is an area of 2,500,000,000, which does not fit in a signed 32-bit integer.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Every pair (i, j) with running minimum | O(n^2) | O(1) | n(n+1)/2 pairs, O(1) each |
| Divide and conquer on the minimum bar | O(n log n) average, O(n^2) worst | O(n) recursion | sorted input makes the split one-sided |
| Monotonic stack | O(n) | O(n) | every index is pushed once and popped once |

## 7. Edge Cases

- **Empty array:** return 0; the loop only processes the sentinel.
- **One bar:** its own height.
- **Zeros:** a 0 bar pops everything before it, so rectangles never cross it.
- **Strictly increasing** (\`[1, 2, 3, 4, 5]\`): nothing pops until the sentinel; the stack grows to n.
- **All equal** (\`[3, 3, 3, 3]\`): the last equal bar is popped with the full width.
- **Large values:** \`height * width\` can exceed 2^31 - 1 (see the 50,000 x 50,000 line).

## Common Pitfalls

- **Forgetting the leftovers.** Without the sentinel, bars still on the stack are never measured: \`{1, 2, 3, 4, 5}\` would return 0.
- **Casting too late.** \`(long) (h * w)\` and \`long a = h * w\` both overflow first; write \`(long) h * w\`.
- **Using \`java.util.Stack\`.** It works, but it extends \`Vector\` (synchronised, index-accessible) and its own docs recommend \`Deque\`.
- **Comparing boxed values with \`==\`.** If you ever compare two \`Integer\`s from the stack, use \`.equals\` or unbox; \`==\` compares references and only happens to work for small cached values.
- **Width off by one.** Use \`i - left\` with \`left = stack.peek() + 1\` after the pop, not \`i - top\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key fact:</strong> <span style="color:#f0e2c8;">The best rectangle has the height of some bar <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> and spans from the previous smaller bar to the next smaller bar of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The stack:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque&lt;Integer&gt;</code> of indices with increasing heights; when bar <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> is not taller than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek()</code>, pop: right edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, left edge new top plus one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Area:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(long) heights[top] * (i - left)</code>, with the cast before the multiply so it cannot overflow.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Sentinel:</strong> <span style="color:#f0e2c8;">Loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &lt;= n</code> with height 0 at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i == n</code> so every bar is popped and measured.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time because each index is pushed and popped once, O(n) space; an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> stack avoids boxing.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ArrayDeque</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Stack</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Stack</code> extends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vector</code>, so every call is synchronised and it exposes index access; the JDK docs recommend <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deque</code> implementations instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does the area overflow an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">height * width</code> exceeds 2,147,483,647. 50,000 times 50,000 printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1794967296</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2500000000</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it O(n) with a nested <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each index is pushed once and popped at most once, so total pops are at most n; the verified count is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2n + 1</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you solve maximal rectangle of 1s in a binary matrix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build a histogram per row: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[c] += 1</code> if the cell is 1, else reset to 0. Run this algorithm on every row. O(rows * cols).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it faster in Java?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replace the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deque&lt;Integer&gt;</code> with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[] stack</code> and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code> index. Same algorithm, no boxing and no object allocation per push.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Histogram** | bars of width 1 standing side by side |
| **Largest rectangle in a histogram** | max of height times width over rectangles inside the bars |
| **Monotonic stack** | a stack kept sorted by popping before every push |
| **Sentinel** | a fake extra element that flushes the loop at the end |
| **Amortised O(n)** | total work over the run is O(n) even if one step does more |

---
**Conclusion:** The largest rectangle in a histogram falls out of one observation: the rectangle is as tall as its shortest bar, and that bar stretches until a shorter bar on each side. A monotonic stack of indices hands you both edges when a bar is popped, so one pass with a height-0 sentinel solves it in O(n) time and O(n) space. In Java, use \`ArrayDeque\` (or an \`int[]\`) rather than \`Stack\`, check \`isEmpty()\` before \`peek()\`, and cast to \`long\` before multiplying.`,
        examples: [
          { label: `The monotonic stack on tricky inputs, with the winning rectangle`, code: `import java.util.ArrayDeque;
import java.util.Deque;
import java.util.StringJoiner;

public class Main {
    /** Returns {area, height, left, right} of the largest rectangle; left/right are bar indices. */
    static long[] largestRectangle(int[] heights) {
        Deque<Integer> stack = new ArrayDeque<>(); // indices, heights strictly increasing bottom to top
        long[] best = {0, 0, -1, -1};
        int n = heights.length;
        for (int i = 0; i <= n; i++) {
            int h = i < n ? heights[i] : 0;        // a height-0 sentinel flushes the stack at the end
            while (!stack.isEmpty() && heights[stack.peek()] >= h) {
                int top = stack.pop();             // bar top cannot extend past i - 1
                int left = stack.isEmpty() ? 0 : stack.peek() + 1;
                long area = (long) heights[top] * (i - left); // widen to long BEFORE multiplying
                if (area > best[0]) best = new long[] {area, heights[top], left, i - 1};
            }
            stack.push(i);
        }
        return best;
    }

    static String show(int[] heights) {
        long[] r = largestRectangle(heights);
        StringJoiner sj = new StringJoiner(", ", "[", "]");
        for (int h : heights) sj.add(String.valueOf(h));
        if (r[0] == 0) return sj + " => 0";
        return sj + " => " + r[0] + " (height " + r[1] + ", bars " + r[2] + " to " + r[3] + ")";
    }

    public static void main(String[] args) {
        System.out.println(show(new int[] {2, 1, 5, 6, 2, 3}));    // ... => 10 (height 5, bars 2 to 3)
        System.out.println(show(new int[] {2, 4}));                // [2, 4] => 4 (height 4, bars 1 to 1)
        System.out.println(show(new int[] {6, 2, 5, 4, 5, 1, 6})); // ... => 12 (height 4, bars 2 to 4)
        System.out.println(show(new int[] {1, 2, 3, 4, 5}));       // ... => 9 (height 3, bars 2 to 4)
        System.out.println(show(new int[] {5, 4, 3, 2, 1}));       // ... => 9 (height 3, bars 0 to 2)
        System.out.println(show(new int[] {3, 3, 3, 3}));          // ... => 12 (height 3, bars 0 to 3)
        System.out.println(show(new int[] {7}));                   // [7] => 7 (height 7, bars 0 to 0)
        System.out.println(show(new int[] {0, 0}));                // [0, 0] => 0
        System.out.println(show(new int[] {}));                    // [] => 0
    }
}` },
          { label: `Brute force versus stack, counting steps, plus a 64-bit area`, code: `import java.util.Arrays;

public class Main {
    /** O(n^2): fix the left bar, extend right, keep the running minimum height. Returns {best, steps}. */
    static long[] bruteForce(int[] heights) {
        long best = 0, steps = 0;
        for (int i = 0; i < heights.length; i++) {
            int low = heights[i];
            for (int j = i; j < heights.length; j++) {
                steps++;
                low = Math.min(low, heights[j]);
                best = Math.max(best, (long) low * (j - i + 1));
            }
        }
        return new long[] {best, steps};
    }

    /** O(n): monotonic stack held in a plain int[]; steps counts pushes plus pops. */
    static long[] withStack(int[] heights) {
        int n = heights.length;
        int[] stack = new int[n + 1];
        int size = 0;
        long best = 0, steps = 0;
        for (int i = 0; i <= n; i++) {
            int h = i < n ? heights[i] : 0;
            while (size > 0 && heights[stack[size - 1]] >= h) {
                int top = stack[--size];
                steps++;
                int left = size > 0 ? stack[size - 1] + 1 : 0;
                best = Math.max(best, (long) heights[top] * (i - left));
            }
            stack[size++] = i;
            steps++;
        }
        return new long[] {best, steps};
    }

    /** Deterministic pseudo-random heights 0..9999 (same generator in every language). */
    static int[] makeBars(int n, long seed) {
        int[] out = new int[n];
        long x = seed;
        for (int k = 0; k < n; k++) {
            x = (x * 48271) % 2147483647L;
            out[k] = (int) (x % 10000);
        }
        return out;
    }

    public static void main(String[] args) {
        for (int n : new int[] {10, 100, 1000, 3000}) {
            int[] bars = makeBars(n, n + 7);
            long[] a = bruteForce(bars);
            long[] b = withStack(bars);
            System.out.println("n=" + n + " area=" + b[0] + " same=" + (a[0] == b[0])
                + " brute_steps=" + a[1] + " stack_steps=" + b[1]);
        }
        int[] big = new int[50000];
        Arrays.fill(big, 50000);
        long[] r = withStack(big);
        System.out.println("50000 bars of height 50000 => " + r[0] + " in " + r[1] + " steps");
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given a vector of bar heights for a histogram where every bar is 1 unit wide. Find the area of the largest rectangle that fits inside the bars. Start with any working idea, then get it to linear time. Please write it in C++."

**What a strong answer should cover:**
- The rectangle's height is the shortest bar it covers, so each bar's best rectangle spans from its previous smaller bar to its next smaller bar.
- A monotonic stack of indices (heights increasing) gives both edges at the moment a bar is popped; width is \`i - st.back() - 1\` or \`i\` when empty.
- O(n) time because each index is pushed and popped once; O(n) extra space; the O(n^2) brute force as a warm-up.
- A sentinel height 0 at the end so bars still on the stack are counted.
- C++ specifics: \`std::stack::pop()\` and \`vector::pop_back()\` return \`void\`, so read \`top()\`/\`back()\` first; calling them on an empty container is undefined behaviour; \`int * int\` overflow is undefined behaviour, so multiply in \`long long\`.

**Clarifying questions expected:**
- "Can heights be 0, and can the vector be empty?"
- "How large can n and the heights be — does the area fit in an int?"

**Code / implementation expected:** Yes — \`largestRectangleArea(const std::vector<int>&)\` in C++ with a \`std::vector<int>\` (or \`std::stack<int>\`) of indices, one pass with a sentinel.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Hard
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A city has a row of buildings of different heights, all one block wide and standing shoulder to shoulder. A billboard company wants to paint the **biggest possible rectangular advert** across their faces. The advert must be a single rectangle, it must sit on the ground, and it cannot stick out above any building it covers. A tall tower on its own gives a tall, thin advert; a long run of medium buildings gives a short, wide one. Which is bigger?

You could try every pair of "first building" and "last building" and use the shortest building between them as the advert height. That works, but with 100,000 buildings it is about five billion pairs. The trick interviewers want is to look at the street **once**, left to right, while keeping a small pile of "buildings that are still waiting to find out how wide their advert can be". That pile is a **stack**, and it turns the problem from hours into milliseconds.

The buildings are the bars of a **histogram**: an array \`heights\` where each bar has width 1. The question asks for the area of the largest rectangle that fits entirely inside the bars.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is every bar exactly width 1? | The classic version says yes; variable widths change the width arithmetic. |
| Can heights be 0? Can the array be empty? | A 0 bar splits the histogram; an empty array should return 0. |
| How large can n and the heights be? | With n up to 10^5 and heights up to 10^4 the area still fits in 32 bits, but larger limits overflow. |
| Do you want only the area, or the rectangle itself? | Returning the left and right bar indices is a small extension of the same loop. |
| Is O(n^2) acceptable, or do you need O(n)? | Tells you whether the brute force is a warm-up or the answer. |

## 3. The Core Idea

📌 **Interview term: Histogram** — here, an array of non-negative bar heights where every bar is 1 unit wide and the bars touch.

📌 **Interview term: Largest rectangle in a histogram** — the maximum of \`height * width\` over every rectangle that sits on the baseline and stays inside the bars. Its height is always the height of **some bar** (the shortest bar it covers), and it is as wide as that bar can stretch left and right before hitting a shorter bar.

That second sentence is the whole problem. For each bar \`k\`, ask: "if \`k\` is the shortest bar in my rectangle, how far can I extend?" The answer is: left until the first bar shorter than \`heights[k]\`, right until the first bar shorter than \`heights[k]\`. Call those the **previous smaller** and **next smaller** bars. Then

\`area(k) = heights[k] * (nextSmaller - prevSmaller - 1)\`

and the answer is the largest \`area(k)\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 300" role="img" aria-label="Histogram with bars 2 1 5 6 2 3, the bars of height 5 and 6 are highlighted and the largest rectangle is height 5 across two bars, area 10">
  <rect class="d-box" x="60" y="190" width="60" height="60" rx="3"/>
  <text class="d-sub" x="90" y="180" text-anchor="middle">2</text>
  <rect class="d-box" x="140" y="220" width="60" height="30" rx="3"/>
  <text class="d-sub" x="170" y="210" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="220" y="100" width="60" height="150" rx="3"/>
  <text class="d-sub" x="250" y="90" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="300" y="70" width="60" height="180" rx="3"/>
  <text class="d-sub" x="330" y="60" text-anchor="middle">6</text>
  <rect class="d-box" x="380" y="190" width="60" height="60" rx="3"/>
  <text class="d-sub" x="410" y="180" text-anchor="middle">2</text>
  <rect class="d-box" x="460" y="160" width="60" height="90" rx="3"/>
  <text class="d-sub" x="490" y="150" text-anchor="middle">3</text>
  <path class="d-edge-dashed" d="M 220 100 L 360 100 L 360 250 L 220 250 Z" fill="none"/>
  <text class="d-text" x="290" y="185" text-anchor="middle">5 x 2 = 10</text>
  <text class="d-sub" x="90" y="276" text-anchor="middle">0</text>
  <text class="d-sub" x="170" y="276" text-anchor="middle">1</text>
  <text class="d-sub" x="250" y="276" text-anchor="middle">2</text>
  <text class="d-sub" x="330" y="276" text-anchor="middle">3</text>
  <text class="d-sub" x="410" y="276" text-anchor="middle">4</text>
  <text class="d-sub" x="490" y="276" text-anchor="middle">5</text>
</svg>

In \`[2, 1, 5, 6, 2, 3]\` the winner is the bar of height 5 at index 2: the bar on its left (height 1) is shorter, and the first shorter bar on its right is index 4 (height 2), so it stretches over indices 2 and 3, giving \`5 * 2 = 10\`. The tall bar of height 6 alone only gives 6.

### Brute force first

Fix a left bar \`i\`, walk \`j\` to the right, and keep the running minimum height. Each pair \`(i, j)\` gives one candidate \`min * (j - i + 1)\`. It is correct and easy to say out loud, but it is O(n^2): for 3,000 bars it does 4,501,500 steps (Example 2 counts them).

### The O(n) monotonic stack

📌 **Interview term: Monotonic stack** — a stack whose values are kept in sorted order from bottom to top by popping anything that would break the order before each push. The general pattern has its own page: [what is a monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it).

Walk the bars left to right and keep a stack of **indices** whose heights strictly increase from bottom to top. When the next bar \`i\` is **lower than or equal to** the bar on top of the stack, the top bar has just found its "next smaller" bar: it is \`i\`. And its "previous smaller" bar is the index right below it on the stack (everything between was popped earlier because it was taller). So at the moment of popping you know both edges, and you can compute that bar's best area immediately:

- \`top = pop()\`
- \`left = (new top) + 1\`, or \`0\` if the stack is now empty
- \`width = i - left\`, \`area = heights[top] * width\`

<svg class="iq-diagram" width="100%" viewBox="0 0 640 290" role="img" aria-label="Stack holds indices 1 2 3 with heights 1 5 6, the incoming bar at index 4 has height 2, so index 3 is popped with area 6 and then index 2 with area 10">
  <defs>
    <marker id="hist2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="95" y="26" text-anchor="middle">stack bottom</text>
  <text class="d-sub" x="355" y="26" text-anchor="middle">stack top</text>
  <rect class="d-box-muted" x="40" y="40" width="110" height="64" rx="8"/>
  <text class="d-text" x="95" y="68" text-anchor="middle">index 1</text>
  <text class="d-sub" x="95" y="90" text-anchor="middle">height 1</text>
  <rect class="d-box" x="170" y="40" width="110" height="64" rx="8"/>
  <text class="d-text" x="225" y="68" text-anchor="middle">index 2</text>
  <text class="d-sub" x="225" y="90" text-anchor="middle">height 5</text>
  <rect class="d-box-accent" x="300" y="40" width="110" height="64" rx="8"/>
  <text class="d-text" x="355" y="68" text-anchor="middle">index 3</text>
  <text class="d-sub" x="355" y="90" text-anchor="middle">height 6</text>
  <rect class="d-box-accent" x="480" y="40" width="130" height="64" rx="8"/>
  <text class="d-text" x="545" y="68" text-anchor="middle">i = 4</text>
  <text class="d-sub" x="545" y="90" text-anchor="middle">height 2</text>
  <path class="d-edge-accent" d="M 476 72 L 416 72" marker-end="url(#hist2-arrow)"/>
  <path class="d-edge" d="M 225 108 L 170 180" marker-end="url(#hist2-arrow)"/>
  <path class="d-edge" d="M 355 108 L 470 180" marker-end="url(#hist2-arrow)"/>
  <rect class="d-box" x="40" y="186" width="260" height="76" rx="10"/>
  <text class="d-text" x="170" y="216" text-anchor="middle">second pop: index 2</text>
  <text class="d-sub" x="170" y="240" text-anchor="middle">height 5, width 2, area 10</text>
  <rect class="d-box" x="340" y="186" width="260" height="76" rx="10"/>
  <text class="d-text" x="470" y="216" text-anchor="middle">first pop: index 3</text>
  <text class="d-sub" x="470" y="240" text-anchor="middle">height 6, width 1, area 6</text>
</svg>

When bar 4 (height 2) arrives, the stack holds indices 1, 2, 3 (heights 1, 5, 6). Height 6 is not lower than 2, so index 3 pops: it spans only itself, area 6. Then index 2 pops: its left edge is index 1 + 1 = 2 and its right edge is 3, area 10. Index 1 (height 1) stays, because 1 is lower than 2.

📌 **Interview term: Sentinel** — an extra fake element added at the end (or start) so that the main loop handles the leftovers without a separate clean-up loop. Here a height-0 bar after the last real bar forces every remaining index off the stack.

📌 **Interview term: Amortised O(n)** — the inner \`while\` can pop many items at once, but each index is pushed once and popped at most once over the whole run, so the total work is at most 2n stack operations. Example 2 prints exactly \`2n + 1\` (n pushes, n pops, plus the sentinel push).

**Why popping on equal heights is safe.** With \`>=\`, a run of equal bars pops the earlier ones with a width that is too short, but the **last** bar of the run is popped later with the full width, because its left edge is found through the stack below the whole run. In \`[3, 3, 3, 3]\` the program reports 12 (height 3, bars 0 to 3). Using \`>\` instead also works; just do not mix the two in your head while explaining.

This same "previous smaller / next smaller" idea solves [the next greater element](/interview-question/how-do-you-find-the-next-greater-element-for-every-item-daily-temperatures) and is the inner step of the "maximal rectangle of 1s in a binary matrix" problem: treat each row as the floor of a histogram and run this algorithm once per row.

## 4. The Stack Solution in C++

\`std::stack<int>\` works, but a \`std::vector<int>\` used with \`push_back\`, \`back\` and \`pop_back\` is just as clear and lets you \`reserve\` memory up front. Either way, the pop functions return \`void\`: you must read the top **before** removing it.

~~~cpp
long long largestRectangleArea(const std::vector<int>& heights) {
    std::vector<int> st;                       // indices; heights strictly increase
    st.reserve(heights.size() + 1);
    long long best = 0;
    const int n = static_cast<int>(heights.size());
    for (int i = 0; i <= n; ++i) {
        int h = i < n ? heights[i] : 0;        // sentinel: height 0 after the last bar
        while (!st.empty() && heights[st.back()] >= h) {
            int top = st.back();               // read first: pop_back() returns void
            st.pop_back();
            int left = st.empty() ? 0 : st.back() + 1;
            best = std::max(best, 1LL * heights[top] * (i - left));
        }
        st.push_back(i);
    }
    return best;
}
~~~

**Why each line is there:**

- \`const std::vector<int>&\` avoids copying the input; the sentinel is handled by \`i <= n\` rather than by pushing a 0 into the caller vector.
- \`const int n = static_cast<int>(heights.size())\`: \`size()\` is an unsigned \`size_t\`. Keeping \`i\` and \`n\` as signed \`int\` avoids mixed signed/unsigned comparisons (and their warnings).
- \`!st.empty()\` first: \`back()\` on an empty vector is undefined behaviour, not an exception. It may appear to work and then corrupt a result.
- \`1LL * heights[top] * (i - left)\`: multiplying by \`1LL\` first makes the whole product \`long long\`. Signed \`int\` overflow is undefined behaviour in C++, so the compiler is allowed to assume it never happens; do the arithmetic in 64 bits.

A test program printed \`1LL * h * w: 2500000000\` for \`h = w = 50000\`, matching the last line of Example 2.

## 5. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — the monotonic stack on tricky inputs, with the winning rectangle** prints:

~~~text
[2, 1, 5, 6, 2, 3] => 10 (height 5, bars 2 to 3)
[2, 4] => 4 (height 4, bars 1 to 1)
[6, 2, 5, 4, 5, 1, 6] => 12 (height 4, bars 2 to 4)
[1, 2, 3, 4, 5] => 9 (height 3, bars 2 to 4)
[5, 4, 3, 2, 1] => 9 (height 3, bars 0 to 2)
[3, 3, 3, 3] => 12 (height 3, bars 0 to 3)
[7] => 7 (height 7, bars 0 to 0)
[0, 0] => 0
[] => 0
~~~

**Example 2 — brute force versus stack, counting steps, plus a 64-bit area** prints:

~~~text
n=10 area=38808 same=true brute_steps=55 stack_steps=21
n=100 area=49875 same=true brute_steps=5050 stack_steps=201
n=1000 area=70488 same=true brute_steps=500500 stack_steps=2001
n=3000 area=84419 same=true brute_steps=4501500 stack_steps=6001
50000 bars of height 50000 => 2500000000 in 100001 steps
~~~

**Reading the output:** \`[2, 4]\` reports height 4 on bar 1, not height 2 across both bars: both have area 4, and the program keeps the first one it finds (strict \`>\`). \`[1, 2, 3, 4, 5]\` and \`[5, 4, 3, 2, 1]\` both give 9 (height 3 over three bars). \`[0, 0]\` and \`[]\` give 0. In Example 2, \`same=true\` on every line means the O(n^2) brute force and the stack agree; the brute force step count is exactly \`n(n+1)/2\` while the stack count is \`2n + 1\`. The last line is an area of 2,500,000,000, which does not fit in a signed 32-bit integer.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Every pair (i, j) with running minimum | O(n^2) | O(1) | n(n+1)/2 pairs, O(1) each |
| Divide and conquer on the minimum bar | O(n log n) average, O(n^2) worst | O(n) recursion | sorted input makes the split one-sided |
| Monotonic stack | O(n) | O(n) | every index is pushed once and popped once |

## 7. Edge Cases

- **Empty array:** return 0; the loop only processes the sentinel.
- **One bar:** its own height.
- **Zeros:** a 0 bar pops everything before it, so rectangles never cross it.
- **Strictly increasing** (\`[1, 2, 3, 4, 5]\`): nothing pops until the sentinel; the stack grows to n.
- **All equal** (\`[3, 3, 3, 3]\`): the last equal bar is popped with the full width.
- **Large values:** \`height * width\` can exceed 2^31 - 1 (see the 50,000 x 50,000 line).

## Common Pitfalls

- **Expecting \`pop()\` to return the value.** \`std::stack::pop()\` and \`pop_back()\` return \`void\`; \`int top = st.pop();\` does not compile. Read \`top()\`/\`back()\` first.
- **Peeking an empty container.** \`st.back()\` or \`st.top()\` on an empty container is undefined behaviour, not an exception; always test \`empty()\` first.
- **\`int\` overflow.** \`heights[top] * width\` in \`int\` is undefined behaviour once it passes 2^31 - 1; use \`1LL *\` or \`long long\` operands.
- **Unsigned index arithmetic.** With \`size_t i\`, an expression like \`i - 1\` at \`i == 0\` wraps to 18446744073709551615 instead of -1 (seen in a test run of \`size_t(0) - 1\`); keep indices signed when you subtract.
- **Forgetting the leftovers.** Without the sentinel, \`{1, 2, 3, 4, 5}\` returns 0.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key fact:</strong> <span style="color:#f0e2c8;">The best rectangle has the height of some bar <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> and spans from the previous smaller bar to the next smaller bar of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The stack:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt;</code> of indices with increasing heights; when bar <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> is not taller than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">back()</code>, read it, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_back()</code>, and the left edge is the new <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">back()</code> plus one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Area:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1LL * heights[top] * (i - left)</code> so the multiply happens in 64 bits.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Sentinel:</strong> <span style="color:#f0e2c8;">Loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &lt;= n</code> with height 0 at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i == n</code> so every bar is measured.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time because each index is pushed and popped once, O(n) space; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reserve</code> avoids reallocations.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int top = st.pop();</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_back()</code> return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code> by design; read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">back()</code> first, then pop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens on <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code> overflow here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Signed overflow is undefined behaviour, so the result is not even guaranteed to wrap. Compute in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1LL * h * w</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::stack</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::vector</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both are fine. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack</code> is an adapter over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::deque</code> by default; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reserve</code> and lets you inspect the whole stack while debugging.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you solve maximal rectangle of 1s in a binary matrix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build a histogram per row: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[c] += 1</code> if the cell is 1, else reset to 0. Run this algorithm on every row. O(rows * cols).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it O(n) with a nested <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each index is pushed once and popped at most once, so the inner loop runs at most n times in total; the verified count is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2n + 1</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Histogram** | bars of width 1 standing side by side |
| **Largest rectangle in a histogram** | max of height times width over rectangles inside the bars |
| **Monotonic stack** | a stack kept sorted by popping before every push |
| **Sentinel** | a fake extra element that flushes the loop at the end |
| **Amortised O(n)** | total work over the run is O(n) even if one step does more |

---
**Conclusion:** The largest rectangle in a histogram falls out of one observation: the rectangle is as tall as its shortest bar, and that bar stretches until a shorter bar on each side. A monotonic stack of indices hands you both edges when a bar is popped, so one pass with a height-0 sentinel solves it in O(n) time and O(n) space. In C++, read \`back()\` before \`pop_back()\`, never peek an empty container, and multiply in \`long long\`, because signed overflow is undefined behaviour.`,
        examples: [
          { label: `The monotonic stack on tricky inputs, with the winning rectangle`, code: `#include <iostream>
#include <string>
#include <vector>

struct Best { long long area; int height, left, right; };

// Largest rectangle with a monotonic stack; left/right are bar indices.
Best largestRectangle(const std::vector<int>& heights) {
    std::vector<int> stack;                   // indices, heights strictly increasing bottom to top
    Best best{0, 0, -1, -1};
    const int n = static_cast<int>(heights.size());
    for (int i = 0; i <= n; ++i) {
        int h = i < n ? heights[i] : 0;       // a height-0 sentinel flushes the stack at the end
        while (!stack.empty() && heights[stack.back()] >= h) {
            int top = stack.back();           // read back() BEFORE pop_back()
            stack.pop_back();
            int left = stack.empty() ? 0 : stack.back() + 1;
            long long area = 1LL * heights[top] * (i - left); // 64-bit multiply
            if (area > best.area) best = {area, heights[top], left, i - 1};
        }
        stack.push_back(i);
    }
    return best;
}

std::string show(const std::vector<int>& heights) {
    Best b = largestRectangle(heights);
    std::string bars = "[";
    for (size_t k = 0; k < heights.size(); ++k) bars += (k ? ", " : "") + std::to_string(heights[k]);
    bars += "]";
    if (b.area == 0) return bars + " => 0";
    return bars + " => " + std::to_string(b.area) + " (height " + std::to_string(b.height) +
           ", bars " + std::to_string(b.left) + " to " + std::to_string(b.right) + ")";
}

int main() {
    std::cout << show({2, 1, 5, 6, 2, 3}) << "\\n";    // ... => 10 (height 5, bars 2 to 3)
    std::cout << show({2, 4}) << "\\n";                // [2, 4] => 4 (height 4, bars 1 to 1)
    std::cout << show({6, 2, 5, 4, 5, 1, 6}) << "\\n"; // ... => 12 (height 4, bars 2 to 4)
    std::cout << show({1, 2, 3, 4, 5}) << "\\n";       // ... => 9 (height 3, bars 2 to 4)
    std::cout << show({5, 4, 3, 2, 1}) << "\\n";       // ... => 9 (height 3, bars 0 to 2)
    std::cout << show({3, 3, 3, 3}) << "\\n";          // ... => 12 (height 3, bars 0 to 3)
    std::cout << show({7}) << "\\n";                   // [7] => 7 (height 7, bars 0 to 0)
    std::cout << show({0, 0}) << "\\n";                // [0, 0] => 0
    std::cout << show({}) << "\\n";                    // [] => 0
    return 0;
}` },
          { label: `Brute force versus stack, counting steps, plus a 64-bit area`, code: `#include <algorithm>
#include <iostream>
#include <utility>
#include <vector>

// O(n^2): fix the left bar, extend right, keep the running minimum height. Returns {best, steps}.
std::pair<long long, long long> bruteForce(const std::vector<int>& heights) {
    long long best = 0, steps = 0;
    for (size_t i = 0; i < heights.size(); ++i) {
        int low = heights[i];
        for (size_t j = i; j < heights.size(); ++j) {
            ++steps;
            low = std::min(low, heights[j]);
            best = std::max(best, 1LL * low * static_cast<long long>(j - i + 1));
        }
    }
    return {best, steps};
}

// O(n): monotonic stack; steps counts pushes plus pops.
std::pair<long long, long long> withStack(const std::vector<int>& heights) {
    std::vector<int> stack;
    stack.reserve(heights.size() + 1);
    long long best = 0, steps = 0;
    const int n = static_cast<int>(heights.size());
    for (int i = 0; i <= n; ++i) {
        int h = i < n ? heights[i] : 0;
        while (!stack.empty() && heights[stack.back()] >= h) {
            int top = stack.back();
            stack.pop_back();
            ++steps;
            int left = stack.empty() ? 0 : stack.back() + 1;
            best = std::max(best, 1LL * heights[top] * (i - left));
        }
        stack.push_back(i);
        ++steps;
    }
    return {best, steps};
}

// Deterministic pseudo-random heights 0..9999 (same generator in every language).
std::vector<int> makeBars(int n, long long seed) {
    std::vector<int> out;
    long long x = seed;
    for (int k = 0; k < n; ++k) {
        x = (x * 48271) % 2147483647LL;
        out.push_back(static_cast<int>(x % 10000));
    }
    return out;
}

int main() {
    for (int n : {10, 100, 1000, 3000}) {
        std::vector<int> bars = makeBars(n, n + 7);
        auto a = bruteForce(bars);
        auto b = withStack(bars);
        std::cout << std::boolalpha << "n=" << n << " area=" << b.first << " same=" << (a.first == b.first)
                  << " brute_steps=" << a.second << " stack_steps=" << b.second << "\\n";
    }
    std::vector<int> big(50000, 50000);
    auto r = withStack(big);
    std::cout << "50000 bars of height 50000 => " << r.first << " in " << r.second << " steps\\n";
    return 0;
}` },
        ],
      },
    },
  },
  {
    title: `How do you find the longest common prefix of an array of strings?`,
    difficulty: "easy",
    seoDescription: `Longest common prefix in Python, JavaScript, Java and C++: vertical scanning, the sort-and-compare-ends trick, a trie, and the edge cases.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Write a function that takes a list of strings and returns the longest prefix they all share, or an empty string if there is none. For example, flower, flow and flight give fl. Please write it in Python."

**What a strong answer should cover:**
- Vertical scanning: compare character \`i\` of every string, stop at the first mismatch or the first string that runs out; return \`strs[0][:i]\`.
- Edge cases handled up front: empty list, a single string, an empty string in the list.
- O(n * (L + 1)) time, bounded by the total characters S; O(1) extra space besides the result.
- Alternatives named with their cost: horizontal scanning, sorting and comparing the first and last strings, a trie for many queries.
- Python specifics: \`zip(*strs)\` stops at the shortest string, \`min(strs)\`/\`max(strs)\` give the lexicographic extremes without sorting, and \`os.path.commonprefix\` is character-based, not path-based.

**Clarifying questions expected:**
- "What should an empty list return?"
- "Is it case-sensitive?"

**Code / implementation expected:** Yes — \`longest_common_prefix(strs)\` in Python; a short loop, with the \`zip\` idiom as a nice variant.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A librarian is handed a stack of index cards: "interspecies", "interstellar", "interstate". She wants one label for the drawer they go in, and the label should be the longest beginning that **every** card shares. She lines the cards up one above the other, left-aligned, and reads down the first column: i, i, i. Same. Second column: n, n, n. She keeps going until a column disagrees (e, e, a at the seventh letter) or a card runs out of letters. Everything to the left of that column is the label: "inters".

That is the whole algorithm. The question is easy, which is exactly why interviewers use it: they are watching whether you handle the empty list, the empty string, the string that is shorter than the others, and whether you stop at the **first** column that fails.

📌 **Interview term: Prefix** — the first k characters of a string, for some k from 0 to its length. "" is a prefix of every string.

📌 **Interview term: Longest common prefix (LCP)** — the longest string that is a prefix of every string in the list. It is "" when the first characters already differ.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What should an empty list return? | Usually "". There is no "first string" to start from, so code it as a special case. |
| Is the comparison case-sensitive? | "Apple" and "apple" share no prefix unless you lowercase first. |
| Only ASCII letters, or any Unicode? | Decides whether indexing by position means "one character" in your language. |
| How many strings, and how long? | With many queries against the same list, a trie or a precomputed answer is worth it. |
| Must I avoid modifying the input? | The sorting trick sorts a copy; sorting in place changes the caller list. |

## 3. The Core Idea: Vertical Scanning

Take the first string as the reference. For column \`i = 0, 1, 2, ...\`, look at character \`i\` of **every** other string. The scan stops the moment either

1. some string has length \`i\` (it has run out), or
2. some string has a different character at \`i\`.

The answer is the first \`i\` characters of the reference. If no column ever fails, the reference itself is the answer.

📌 **Interview term: Vertical scanning** — comparing the strings column by column (character \`i\` of all strings, then \`i + 1\`), stopping at the first column that fails.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 320" role="img" aria-label="Vertical scanning on flower flow flight, columns 0 and 1 match with f and l, column 2 has o o i and stops the scan, so the prefix is fl">
  <text class="d-sub" x="165" y="28" text-anchor="middle">col 0</text>
  <text class="d-sub" x="225" y="28" text-anchor="middle">col 1</text>
  <text class="d-sub" x="285" y="28" text-anchor="middle">col 2</text>
  <text class="d-sub" x="345" y="28" text-anchor="middle">col 3</text>
  <text class="d-sub" x="405" y="28" text-anchor="middle">col 4</text>
  <text class="d-sub" x="465" y="28" text-anchor="middle">col 5</text>
  <text class="d-sub" x="80" y="72" text-anchor="middle">flower</text>
  <rect class="d-box-accent" x="140" y="44" width="50" height="44" rx="5"/><text class="d-text" x="165" y="72" text-anchor="middle">f</text>
  <rect class="d-box-accent" x="200" y="44" width="50" height="44" rx="5"/><text class="d-text" x="225" y="72" text-anchor="middle">l</text>
  <rect class="d-box-muted" x="260" y="44" width="50" height="44" rx="5"/><text class="d-text" x="285" y="72" text-anchor="middle">o</text>
  <rect class="d-box" x="320" y="44" width="50" height="44" rx="5"/><text class="d-text" x="345" y="72" text-anchor="middle">w</text>
  <rect class="d-box" x="380" y="44" width="50" height="44" rx="5"/><text class="d-text" x="405" y="72" text-anchor="middle">e</text>
  <rect class="d-box" x="440" y="44" width="50" height="44" rx="5"/><text class="d-text" x="465" y="72" text-anchor="middle">r</text>
  <text class="d-sub" x="80" y="132" text-anchor="middle">flow</text>
  <rect class="d-box-accent" x="140" y="104" width="50" height="44" rx="5"/><text class="d-text" x="165" y="132" text-anchor="middle">f</text>
  <rect class="d-box-accent" x="200" y="104" width="50" height="44" rx="5"/><text class="d-text" x="225" y="132" text-anchor="middle">l</text>
  <rect class="d-box-muted" x="260" y="104" width="50" height="44" rx="5"/><text class="d-text" x="285" y="132" text-anchor="middle">o</text>
  <rect class="d-box" x="320" y="104" width="50" height="44" rx="5"/><text class="d-text" x="345" y="132" text-anchor="middle">w</text>
  <text class="d-sub" x="80" y="192" text-anchor="middle">flight</text>
  <rect class="d-box-accent" x="140" y="164" width="50" height="44" rx="5"/><text class="d-text" x="165" y="192" text-anchor="middle">f</text>
  <rect class="d-box-accent" x="200" y="164" width="50" height="44" rx="5"/><text class="d-text" x="225" y="192" text-anchor="middle">l</text>
  <rect class="d-box-muted" x="260" y="164" width="50" height="44" rx="5"/><text class="d-text" x="285" y="192" text-anchor="middle">i</text>
  <rect class="d-box" x="320" y="164" width="50" height="44" rx="5"/><text class="d-text" x="345" y="192" text-anchor="middle">g</text>
  <rect class="d-box" x="380" y="164" width="50" height="44" rx="5"/><text class="d-text" x="405" y="192" text-anchor="middle">h</text>
  <rect class="d-box" x="440" y="164" width="50" height="44" rx="5"/><text class="d-text" x="465" y="192" text-anchor="middle">t</text>
  <rect class="d-box-accent" x="60" y="250" width="220" height="56" rx="10"/>
  <text class="d-text" x="170" y="284" text-anchor="middle">prefix = fl</text>
  <rect class="d-box-muted" x="320" y="250" width="240" height="56" rx="10"/>
  <text class="d-text" x="440" y="284" text-anchor="middle">col 2: i differs, stop</text>
</svg>

In the picture, columns 0 and 1 match in all three strings; column 2 holds o, o, i, so the scan stops and the prefix is "fl". Notice that columns 3 to 5 are never read: vertical scanning only ever does about \`n * (L + 1)\` comparisons, where \`L\` is the answer length, no matter how long the strings are.

### Horizontal scanning

📌 **Interview term: Horizontal scanning** — start with \`prefix = strs[0]\` and shrink it against each string in turn: \`LCP(LCP(LCP(s0, s1), s2), s3)...\`.

It gives the same answer, but it can do far more work when the short or different string is at the **end**: with four copies of the alphabet followed by "b", Example 2 counts 79 comparisons for horizontal scanning and 4 for vertical scanning.

### The sorting trick

📌 **Interview term: Lexicographic order** — dictionary order: compare character by character, and a string that is a prefix of another comes first.

After sorting, the first and last strings are the two that differ the most, and any prefix they share is shared by everything between them. So you only compare those two. The sort costs O(n log n) comparisons of strings, so it is not faster than vertical scanning; it is a neat observation to mention, and the same idea works without sorting by taking the minimum and maximum string in one pass.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="After sorting, flight flow flower, only the first string flight and the last string flower are compared, giving fl">
  <defs>
    <marker id="lcp2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="120" y="22" text-anchor="middle">sorted copy</text>
  <rect class="d-box-accent" x="40" y="34" width="160" height="50" rx="8"/>
  <text class="d-text" x="120" y="64" text-anchor="middle">flight</text>
  <rect class="d-box-muted" x="40" y="104" width="160" height="50" rx="8"/>
  <text class="d-text" x="120" y="134" text-anchor="middle">flow</text>
  <rect class="d-box-accent" x="40" y="174" width="160" height="50" rx="8"/>
  <text class="d-text" x="120" y="204" text-anchor="middle">flower</text>
  <path class="d-edge-accent" d="M 204 60 L 336 112" marker-end="url(#lcp2-arrow)"/>
  <path class="d-edge-accent" d="M 204 198 L 336 146" marker-end="url(#lcp2-arrow)"/>
  <rect class="d-box" x="340" y="88" width="260" height="84" rx="10"/>
  <text class="d-text" x="470" y="120" text-anchor="middle">compare first and last</text>
  <text class="d-sub" x="470" y="146" text-anchor="middle">f, l match; i versus o stops</text>
</svg>

Sorting gives flight, flow, flower. Comparing only "flight" and "flower" yields "fl", the same answer.

### Other approaches worth naming

- **Divide and conquer:** LCP of the left half, LCP of the right half, then the LCP of those two. Same total work, but it splits nicely across threads.
- **Binary search on the length:** test whether the first \`mid\` characters are a prefix of all strings; O(S log m) where S is the total length and m the shortest length.
- **A trie:** insert every string, then walk from the root while the node has exactly one child and is not the end of a word. It is O(S) to build, and it pays off when you must answer many "common prefix" queries or the list changes. See [what is a trie](/interview-question/what-is-a-trie-and-when-is-it-useful).

## 4. Vertical Scanning in Python

~~~python
def longest_common_prefix(strs):
    if not strs:
        return ""
    first = strs[0]
    for i in range(len(first)):
        ch = first[i]
        for s in strs[1:]:
            if i == len(s) or s[i] != ch:   # ran out, or a different character
                return first[:i]
    return first
~~~

**Why each line is there:**

- \`if not strs\` handles the empty list, which would otherwise raise \`IndexError\` on \`strs[0]\`.
- \`i == len(s)\` must be tested **before** \`s[i]\`; \`or\` short-circuits, so \`s[i]\` is never read out of range.
- \`first[:i]\` builds the result once. Building it character by character with \`+=\` in the loop works too, but it is more code for no benefit.
- \`strs[1:]\` makes a shallow copy of the list on every column; for a tight version, loop \`for k in range(1, len(strs))\` instead.

**The Pythonic variant with \`zip\`.** \`zip(*strs)\` yields tuples of column characters and stops at the shortest string (in a test run, \`list(zip('ab', 'abc'))\` printed \`[('a', 'a'), ('b', 'b')]\`), so the length check comes for free:

~~~python
def lcp_zip(strs):
    out = []
    for column in zip(*strs):
        if len(set(column)) != 1:
            break
        out.append(column[0])
    return "".join(out)
~~~

**The min and max trick.** Python compares strings lexicographically by code point, so \`min(strs)\` and \`max(strs)\` are the first and last strings of the sorted order. For flower, flow, flight a test run printed \`flight flower\`; comparing just those two gives the answer in O(S) without sorting.

**About \`os.path.commonprefix\`.** It exists and returns \`'fl'\` for flower, flow, flight, but it works character by character even on paths: a test run of \`os.path.commonprefix(['/usr/lib', '/usr/local'])\` printed \`/usr/l\`, which is not a real directory. Mention it, but write the loop in an interview.

## 5. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — vertical scanning on normal and edge-case inputs** prints:

~~~text
["flower", "flow", "flight"] => "fl" (2)
["dog", "racecar", "car"] => "" (0)
["interspecies", "interstellar", "interstate"] => "inters" (6)
["throne", "throne"] => "throne" (6)
["ab", "a"] => "a" (1)
["alone"] => "alone" (5)
["", "abc"] => "" (0)
["Apple", "apple"] => "" (0)
[] => "" (0)
~~~

**Example 2 — vertical vs horizontal vs sort-the-ends, counting character comparisons** prints:

~~~text
classic: "fl" agree=true vertical=6 horizontal=7 sorted_ends=3
short last: "" agree=true vertical=4 horizontal=79 sorted_ends=1
all equal: "prefix" agree=true vertical=24 horizontal=24 sorted_ends=6
long shared: "commonprefix" agree=true vertical=109 horizontal=109 sorted_ends=13
~~~

**Reading the output:** \`["ab", "a"]\` gives "a" because the second string runs out at column 1, which is the length check, not a character mismatch. \`["", "abc"]\` and \`[]\` both give "". \`["Apple", "apple"]\` gives "" because the comparison is case-sensitive. In Example 2, all three methods agree on every input (\`agree=true\`); vertical scanning never does more comparisons than horizontal scanning here, and the "short last" line shows the big gap (4 versus 79). The \`sorted_ends\` count excludes the cost of sorting itself.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Vertical scanning | O(n * (L + 1)), at most O(S) | O(1) besides the answer | reads only the columns up to the first failure |
| Horizontal scanning | O(S) | O(1) besides the answer | each string is compared against the running prefix |
| Sort, compare first and last | O(n log n) string comparisons + O(m) | O(n) for a sorted copy | the sort dominates |
| Min and max string, compare them | O(S) | O(1) | two linear passes plus one comparison |
| Trie | O(S) to build | O(S) | one node per character in the worst case |

Here n is the number of strings, S the total number of characters, m the shortest length and L the answer length. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read this table.

## 7. Edge Cases

- **Empty list:** return "" (there is no first string).
- **One string:** the answer is that string.
- **An empty string anywhere:** the answer is "".
- **A string that is a prefix of another** (\`["ab", "a"]\`): the length check ends the scan.
- **All strings equal:** the answer is the whole string; the loop ends because the reference runs out.
- **Case and Unicode:** "Apple" and "apple" share nothing unless you normalise case first.

## Common Pitfalls

- **Indexing before the length check.** \`s[i] != ch or i == len(s)\` raises \`IndexError\` on \`["ab", "a"]\`; put \`i == len(s)\` first.
- **Forgetting the empty list.** \`strs[0]\` on \`[]\` raises \`IndexError\`.
- **Using \`os.path.commonprefix\` for paths.** It returns \`/usr/l\` for \`/usr/lib\` and \`/usr/local\`; for real paths use \`os.path.commonpath\`.
- **Sorting the caller list.** \`strs.sort()\` mutates the input; \`sorted(strs)\` or \`min\`/\`max\` do not.
- **Case and Unicode surprises.** \`sorted\` orders by code point, so "Banana" sorts before "apple"; lowercase first if the question is case-insensitive.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Approach:</strong> <span style="color:#f0e2c8;">Vertical scanning: for each index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> of the first string, check that every other string has length greater than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> and the same character there.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Stop rule:</strong> <span style="color:#f0e2c8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first[:i]</code> at the first string that runs out or differs; if nothing fails, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Edge cases:</strong> <span style="color:#f0e2c8;">Empty list returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code>; an empty string anywhere makes the answer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n * (L + 1)) time, at most the total characters; O(1) extra space besides the result.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python idioms:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zip(*strs)</code> stops at the shortest string; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min(strs)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(strs)</code> are the only two strings you need to compare.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does comparing <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">min(strs)</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">max(strs)</code> work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In lexicographic order every string sits between the minimum and the maximum, so a prefix shared by those two is shared by all of them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is vertical better than horizontal scanning?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same worst case, but vertical stops at the first failing column. With a short odd string at the end, the verified run shows 4 versus 79 comparisons.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">os.path.commonprefix</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is character-based: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">['/usr/lib', '/usr/local']</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/usr/l</code>. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">os.path.commonpath</code> for directories.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use a trie instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When there are many prefix queries against the same set of words, or words are added over time. Build once in O(S), then each query walks from the root.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make it case-insensitive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">casefold()</code> versions of the characters (or of the strings), and decide whether to return the prefix from the original string.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix** | the first k characters of a string |
| **Longest common prefix (LCP)** | the longest prefix shared by every string in the list |
| **Vertical scanning** | compare column by column across all strings |
| **Horizontal scanning** | shrink a running prefix against one string at a time |
| **Lexicographic order** | dictionary order, character by character |

---
**Conclusion:** The longest common prefix is a column-by-column scan that stops at the first column where some string runs out or disagrees. Vertical scanning reads only as many columns as the answer needs, handles every edge case with two checks, and runs in O(n * (L + 1)) time with no extra memory. In Python, check the length before indexing, remember that \`zip(*strs)\` and \`min\`/\`max\` give elegant variants, and know that \`os.path.commonprefix\` is character-based.`,
        examples: [
          { label: `Vertical scanning on normal and edge-case inputs`, code: `def longest_common_prefix(strs):
    """Vertical scanning: compare column i of every string; stop at the first mismatch or short string."""
    if not strs:
        return ""
    first = strs[0]
    for i in range(len(first)):
        ch = first[i]
        for s in strs[1:]:
            if i == len(s) or s[i] != ch:
                return first[:i]          # one slice, made once, at the end
    return first                          # every character of strs[0] matched


def show(strs):
    p = longest_common_prefix(strs)
    items = "[" + ", ".join('"' + s + '"' for s in strs) + "]"
    return items + ' => "' + p + '" (' + str(len(p)) + ")"


print(show(["flower", "flow", "flight"]))  # ["flower", "flow", "flight"] => "fl" (2)
print(show(["dog", "racecar", "car"]))  # ["dog", "racecar", "car"] => "" (0)
print(show(["interspecies", "interstellar", "interstate"]))  # ["interspecies", "interstellar", "interstate"] => "inters" (6)
print(show(["throne", "throne"]))  # ["throne", "throne"] => "throne" (6)
print(show(["ab", "a"]))  # ["ab", "a"] => "a" (1)
print(show(["alone"]))  # ["alone"] => "alone" (5)
print(show(["", "abc"]))  # ["", "abc"] => "" (0)
print(show(["Apple", "apple"]))  # ["Apple", "apple"] => "" (0)
print(show([]))  # [] => "" (0)` },
          { label: `Vertical vs horizontal vs sort-the-ends, counting character comparisons`, code: `def vertical(strs):
    """Column by column; returns (prefix, character comparisons)."""
    if not strs:
        return "", 0
    first, comps = strs[0], 0
    for i in range(len(first)):
        for s in strs[1:]:
            if i == len(s):
                return first[:i], comps
            comps += 1
            if s[i] != first[i]:
                return first[:i], comps
    return first, comps


def horizontal(strs):
    """Shrink a running prefix against each string in turn."""
    if not strs:
        return "", 0
    prefix, comps = strs[0], 0
    for s in strs[1:]:
        j = 0
        while j < len(prefix) and j < len(s):
            comps += 1
            if prefix[j] != s[j]:
                break
            j += 1
        prefix = prefix[:j]
        if not prefix:
            break
    return prefix, comps


def sorted_ends(strs):
    """After sorting, only the first and last strings need comparing (sort cost not counted)."""
    if not strs:
        return "", 0
    ordered = sorted(strs)            # lexicographic by code point
    a, b = ordered[0], ordered[-1]
    j, comps = 0, 0
    while j < len(a) and j < len(b):
        comps += 1
        if a[j] != b[j]:
            break
        j += 1
    return a[:j], comps


alphabet = "abcdefghijklmnopqrstuvwxyz"
cases = [
    ("classic", ["flower", "flow", "flight"]),
    ("short last", [alphabet, alphabet, alphabet, alphabet, "b"]),
    ("all equal", ["prefix"] * 5),
    ("long shared", ["commonprefix" + str(k) for k in range(10)]),
]
for name, strs in cases:
    v, vc = vertical(strs)
    h, hc = horizontal(strs)
    s, sc = sorted_ends(strs)
    print(name + ': "' + v + '" agree=' + str(v == h == s).lower()
          + " vertical=" + str(vc) + " horizontal=" + str(hc) + " sorted_ends=" + str(sc))` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Write a function that takes an array of strings and returns the longest prefix they all share, or an empty string if there is none. For example, flower, flow and flight give fl. Please write it in JavaScript."

**What a strong answer should cover:**
- Vertical scanning: compare character \`i\` of every string, stop at the first mismatch or the first string that runs out; return \`strs[0].slice(0, i)\`.
- Edge cases handled up front: empty array, a single string, an empty string in the array.
- O(n * (L + 1)) time, bounded by the total characters S; O(1) extra space besides the result.
- Alternatives named with their cost: horizontal scanning (often written with \`startsWith\`), sorting and comparing first and last, a trie.
- JavaScript specifics: \`str[i]\` past the end is \`undefined\` (no error), default \`sort()\` compares UTF-16 code units so "Banana" comes before "apple", and \`sort()\` mutates the array.

**Clarifying questions expected:**
- "What should an empty array return?"
- "Is it case-sensitive, and can strings contain emoji or other non-BMP characters?"

**Code / implementation expected:** Yes — \`longestCommonPrefix(strs)\` in JavaScript with two loops; the \`startsWith\` version is a fine warm-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A librarian is handed a stack of index cards: "interspecies", "interstellar", "interstate". She wants one label for the drawer they go in, and the label should be the longest beginning that **every** card shares. She lines the cards up one above the other, left-aligned, and reads down the first column: i, i, i. Same. Second column: n, n, n. She keeps going until a column disagrees (e, e, a at the seventh letter) or a card runs out of letters. Everything to the left of that column is the label: "inters".

That is the whole algorithm. The question is easy, which is exactly why interviewers use it: they are watching whether you handle the empty list, the empty string, the string that is shorter than the others, and whether you stop at the **first** column that fails.

📌 **Interview term: Prefix** — the first k characters of a string, for some k from 0 to its length. "" is a prefix of every string.

📌 **Interview term: Longest common prefix (LCP)** — the longest string that is a prefix of every string in the list. It is "" when the first characters already differ.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What should an empty list return? | Usually "". There is no "first string" to start from, so code it as a special case. |
| Is the comparison case-sensitive? | "Apple" and "apple" share no prefix unless you lowercase first. |
| Only ASCII letters, or any Unicode? | Decides whether indexing by position means "one character" in your language. |
| How many strings, and how long? | With many queries against the same list, a trie or a precomputed answer is worth it. |
| Must I avoid modifying the input? | The sorting trick sorts a copy; sorting in place changes the caller list. |

## 3. The Core Idea: Vertical Scanning

Take the first string as the reference. For column \`i = 0, 1, 2, ...\`, look at character \`i\` of **every** other string. The scan stops the moment either

1. some string has length \`i\` (it has run out), or
2. some string has a different character at \`i\`.

The answer is the first \`i\` characters of the reference. If no column ever fails, the reference itself is the answer.

📌 **Interview term: Vertical scanning** — comparing the strings column by column (character \`i\` of all strings, then \`i + 1\`), stopping at the first column that fails.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 320" role="img" aria-label="Vertical scanning on flower flow flight, columns 0 and 1 match with f and l, column 2 has o o i and stops the scan, so the prefix is fl">
  <text class="d-sub" x="165" y="28" text-anchor="middle">col 0</text>
  <text class="d-sub" x="225" y="28" text-anchor="middle">col 1</text>
  <text class="d-sub" x="285" y="28" text-anchor="middle">col 2</text>
  <text class="d-sub" x="345" y="28" text-anchor="middle">col 3</text>
  <text class="d-sub" x="405" y="28" text-anchor="middle">col 4</text>
  <text class="d-sub" x="465" y="28" text-anchor="middle">col 5</text>
  <text class="d-sub" x="80" y="72" text-anchor="middle">flower</text>
  <rect class="d-box-accent" x="140" y="44" width="50" height="44" rx="5"/><text class="d-text" x="165" y="72" text-anchor="middle">f</text>
  <rect class="d-box-accent" x="200" y="44" width="50" height="44" rx="5"/><text class="d-text" x="225" y="72" text-anchor="middle">l</text>
  <rect class="d-box-muted" x="260" y="44" width="50" height="44" rx="5"/><text class="d-text" x="285" y="72" text-anchor="middle">o</text>
  <rect class="d-box" x="320" y="44" width="50" height="44" rx="5"/><text class="d-text" x="345" y="72" text-anchor="middle">w</text>
  <rect class="d-box" x="380" y="44" width="50" height="44" rx="5"/><text class="d-text" x="405" y="72" text-anchor="middle">e</text>
  <rect class="d-box" x="440" y="44" width="50" height="44" rx="5"/><text class="d-text" x="465" y="72" text-anchor="middle">r</text>
  <text class="d-sub" x="80" y="132" text-anchor="middle">flow</text>
  <rect class="d-box-accent" x="140" y="104" width="50" height="44" rx="5"/><text class="d-text" x="165" y="132" text-anchor="middle">f</text>
  <rect class="d-box-accent" x="200" y="104" width="50" height="44" rx="5"/><text class="d-text" x="225" y="132" text-anchor="middle">l</text>
  <rect class="d-box-muted" x="260" y="104" width="50" height="44" rx="5"/><text class="d-text" x="285" y="132" text-anchor="middle">o</text>
  <rect class="d-box" x="320" y="104" width="50" height="44" rx="5"/><text class="d-text" x="345" y="132" text-anchor="middle">w</text>
  <text class="d-sub" x="80" y="192" text-anchor="middle">flight</text>
  <rect class="d-box-accent" x="140" y="164" width="50" height="44" rx="5"/><text class="d-text" x="165" y="192" text-anchor="middle">f</text>
  <rect class="d-box-accent" x="200" y="164" width="50" height="44" rx="5"/><text class="d-text" x="225" y="192" text-anchor="middle">l</text>
  <rect class="d-box-muted" x="260" y="164" width="50" height="44" rx="5"/><text class="d-text" x="285" y="192" text-anchor="middle">i</text>
  <rect class="d-box" x="320" y="164" width="50" height="44" rx="5"/><text class="d-text" x="345" y="192" text-anchor="middle">g</text>
  <rect class="d-box" x="380" y="164" width="50" height="44" rx="5"/><text class="d-text" x="405" y="192" text-anchor="middle">h</text>
  <rect class="d-box" x="440" y="164" width="50" height="44" rx="5"/><text class="d-text" x="465" y="192" text-anchor="middle">t</text>
  <rect class="d-box-accent" x="60" y="250" width="220" height="56" rx="10"/>
  <text class="d-text" x="170" y="284" text-anchor="middle">prefix = fl</text>
  <rect class="d-box-muted" x="320" y="250" width="240" height="56" rx="10"/>
  <text class="d-text" x="440" y="284" text-anchor="middle">col 2: i differs, stop</text>
</svg>

In the picture, columns 0 and 1 match in all three strings; column 2 holds o, o, i, so the scan stops and the prefix is "fl". Notice that columns 3 to 5 are never read: vertical scanning only ever does about \`n * (L + 1)\` comparisons, where \`L\` is the answer length, no matter how long the strings are.

### Horizontal scanning

📌 **Interview term: Horizontal scanning** — start with \`prefix = strs[0]\` and shrink it against each string in turn: \`LCP(LCP(LCP(s0, s1), s2), s3)...\`.

It gives the same answer, but it can do far more work when the short or different string is at the **end**: with four copies of the alphabet followed by "b", Example 2 counts 79 comparisons for horizontal scanning and 4 for vertical scanning.

### The sorting trick

📌 **Interview term: Lexicographic order** — dictionary order: compare character by character, and a string that is a prefix of another comes first.

After sorting, the first and last strings are the two that differ the most, and any prefix they share is shared by everything between them. So you only compare those two. The sort costs O(n log n) comparisons of strings, so it is not faster than vertical scanning; it is a neat observation to mention, and the same idea works without sorting by taking the minimum and maximum string in one pass.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="After sorting, flight flow flower, only the first string flight and the last string flower are compared, giving fl">
  <defs>
    <marker id="lcp2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="120" y="22" text-anchor="middle">sorted copy</text>
  <rect class="d-box-accent" x="40" y="34" width="160" height="50" rx="8"/>
  <text class="d-text" x="120" y="64" text-anchor="middle">flight</text>
  <rect class="d-box-muted" x="40" y="104" width="160" height="50" rx="8"/>
  <text class="d-text" x="120" y="134" text-anchor="middle">flow</text>
  <rect class="d-box-accent" x="40" y="174" width="160" height="50" rx="8"/>
  <text class="d-text" x="120" y="204" text-anchor="middle">flower</text>
  <path class="d-edge-accent" d="M 204 60 L 336 112" marker-end="url(#lcp2-arrow)"/>
  <path class="d-edge-accent" d="M 204 198 L 336 146" marker-end="url(#lcp2-arrow)"/>
  <rect class="d-box" x="340" y="88" width="260" height="84" rx="10"/>
  <text class="d-text" x="470" y="120" text-anchor="middle">compare first and last</text>
  <text class="d-sub" x="470" y="146" text-anchor="middle">f, l match; i versus o stops</text>
</svg>

Sorting gives flight, flow, flower. Comparing only "flight" and "flower" yields "fl", the same answer.

### Other approaches worth naming

- **Divide and conquer:** LCP of the left half, LCP of the right half, then the LCP of those two. Same total work, but it splits nicely across threads.
- **Binary search on the length:** test whether the first \`mid\` characters are a prefix of all strings; O(S log m) where S is the total length and m the shortest length.
- **A trie:** insert every string, then walk from the root while the node has exactly one child and is not the end of a word. It is O(S) to build, and it pays off when you must answer many "common prefix" queries or the list changes. See [what is a trie](/interview-question/what-is-a-trie-and-when-is-it-useful).

## 4. Vertical Scanning in JavaScript

~~~javascript
function longestCommonPrefix(strs) {
  if (strs.length === 0) return '';
  const first = strs[0];
  for (let i = 0; i < first.length; i++) {
    for (let k = 1; k < strs.length; k++) {
      if (i === strs[k].length || strs[k][i] !== first[i]) {
        return first.slice(0, i); // ran out, or a different character
      }
    }
  }
  return first;
}
~~~

**Why each line is there:**

- \`strs.length === 0\` handles the empty array; \`strs[0]\` would be \`undefined\` and \`.length\` would then throw a \`TypeError\`.
- \`i === strs[k].length\` is the "ran out" test. In JavaScript, \`strs[k][i]\` past the end is simply \`undefined\`, and \`undefined !== 'x'\` is \`true\`, so the code would still stop. Keep the explicit length check anyway: it states the intent and works the same in every language.
- \`first.slice(0, i)\` returns a new string with the first \`i\` characters, created once.

**The \`startsWith\` version (horizontal scanning).** Very common in JavaScript answers:

~~~javascript
function lcpStartsWith(strs) {
  if (strs.length === 0) return '';
  let prefix = strs[0];
  for (const s of strs) {
    while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1); // drop the last character
  }
  return prefix;
}
~~~

It is short and correct (a test run returned "fl" for flower, flow, flight), and it terminates because \`''.startsWith\` is true for every string. But each \`startsWith\` call can rescan the whole prefix, so its worst case is O(S * m), worse than the vertical scan.

**Sorting in JavaScript.** \`Array.prototype.sort()\` with no comparator converts elements to strings and compares UTF-16 code units; uppercase letters come before lowercase ones. A test run sorted \`['apple', 'Banana', 'cherry']\` to \`Banana apple cherry\`, and with \`localeCompare\` to \`apple Banana cherry\`. For the sorting trick only the code-unit order matters, but sort a **copy** (\`[...strs].sort()\`), because \`sort()\` changes the original array.

## 5. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — vertical scanning on normal and edge-case inputs** prints:

~~~text
["flower", "flow", "flight"] => "fl" (2)
["dog", "racecar", "car"] => "" (0)
["interspecies", "interstellar", "interstate"] => "inters" (6)
["throne", "throne"] => "throne" (6)
["ab", "a"] => "a" (1)
["alone"] => "alone" (5)
["", "abc"] => "" (0)
["Apple", "apple"] => "" (0)
[] => "" (0)
~~~

**Example 2 — vertical vs horizontal vs sort-the-ends, counting character comparisons** prints:

~~~text
classic: "fl" agree=true vertical=6 horizontal=7 sorted_ends=3
short last: "" agree=true vertical=4 horizontal=79 sorted_ends=1
all equal: "prefix" agree=true vertical=24 horizontal=24 sorted_ends=6
long shared: "commonprefix" agree=true vertical=109 horizontal=109 sorted_ends=13
~~~

**Reading the output:** \`["ab", "a"]\` gives "a" because the second string runs out at column 1, which is the length check, not a character mismatch. \`["", "abc"]\` and \`[]\` both give "". \`["Apple", "apple"]\` gives "" because the comparison is case-sensitive. In Example 2, all three methods agree on every input (\`agree=true\`); vertical scanning never does more comparisons than horizontal scanning here, and the "short last" line shows the big gap (4 versus 79). The \`sorted_ends\` count excludes the cost of sorting itself.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Vertical scanning | O(n * (L + 1)), at most O(S) | O(1) besides the answer | reads only the columns up to the first failure |
| Horizontal scanning | O(S) | O(1) besides the answer | each string is compared against the running prefix |
| Sort, compare first and last | O(n log n) string comparisons + O(m) | O(n) for a sorted copy | the sort dominates |
| Min and max string, compare them | O(S) | O(1) | two linear passes plus one comparison |
| Trie | O(S) to build | O(S) | one node per character in the worst case |

Here n is the number of strings, S the total number of characters, m the shortest length and L the answer length. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read this table.

## 7. Edge Cases

- **Empty list:** return "" (there is no first string).
- **One string:** the answer is that string.
- **An empty string anywhere:** the answer is "".
- **A string that is a prefix of another** (\`["ab", "a"]\`): the length check ends the scan.
- **All strings equal:** the answer is the whole string; the loop ends because the reference runs out.
- **Case and Unicode:** "Apple" and "apple" share nothing unless you normalise case first.

## Common Pitfalls

- **Relying on \`undefined\` comparisons.** Reading past the end gives \`undefined\` instead of an error, which hides bugs in other loops; write the explicit length check.
- **Mutating with \`sort()\`.** \`strs.sort()\` reorders the caller array; use \`[...strs].sort()\`.
- **Sorting numbers or mixed values.** The default sort is by string, so \`[10, 9, 1].sort()\` gives \`1 10 9\` (seen in a test run); irrelevant here, but a classic trap in the same breath.
- **Emoji and other non-BMP characters.** \`'😀'.length\` is 2, so index-based scanning compares UTF-16 halves. It still finds a correct code-unit prefix, but the cut can split an emoji; use \`[...s]\` if the interviewer cares.
- **The \`startsWith\` loop on large inputs.** Neat, but O(S * m) worst case; say so if you write it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Approach:</strong> <span style="color:#f0e2c8;">Vertical scanning: for each index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strs[0]</code>, check every other string has length greater than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> and the same character at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Stop rule:</strong> <span style="color:#f0e2c8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first.slice(0, i)</code> at the first string that runs out or differs; otherwise return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Edge cases:</strong> <span style="color:#f0e2c8;">Empty array returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">''</code>; any empty string makes the answer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">''</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n * (L + 1)) time, at most the total characters; O(1) extra space besides the result.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript notes:</strong> <span style="color:#f0e2c8;">Out-of-range indexing gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, not an error; default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort()</code> is by UTF-16 code unit and mutates the array.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does sorting and comparing the first and last string work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In lexicographic order every string sits between the first and the last, so a prefix they share is shared by all. Sort a copy: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...strs].sort()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">startsWith</code> version O(S)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Each shrink step re-checks the prefix from the start, so the worst case is O(S * m). The vertical scan is O(S) at worst.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for case-insensitive matching?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toLowerCase()</code> characters, or normalise every string once first, then return the slice from the original first string.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use a trie instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When there are many prefix queries against the same set of words, or words are added over time. Build once in O(S), then each query walks from the root.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this handle emoji correctly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It compares UTF-16 code units, so the prefix may end in the middle of a surrogate pair. Scan <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from(s)</code> code points if that matters.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix** | the first k characters of a string |
| **Longest common prefix (LCP)** | the longest prefix shared by every string in the list |
| **Vertical scanning** | compare column by column across all strings |
| **Horizontal scanning** | shrink a running prefix against one string at a time |
| **Lexicographic order** | dictionary order, character by character |

---
**Conclusion:** The longest common prefix is a column-by-column scan that stops at the first column where some string runs out or disagrees. Vertical scanning reads only as many columns as the answer needs and runs in O(n * (L + 1)) time with no extra memory. In JavaScript, keep the explicit length check even though indexing past the end is silent, sort a copy if you use the sorting trick, and know that \`startsWith\` shrinking is shorter to write but slower in the worst case.`,
        examples: [
          { label: `Vertical scanning on normal and edge-case inputs`, code: `function longestCommonPrefix(strs) {
  // Vertical scanning: compare column i of every string; stop at the first mismatch or short string.
  if (strs.length === 0) return '';
  const first = strs[0];
  for (let i = 0; i < first.length; i++) {
    const ch = first[i];
    for (let k = 1; k < strs.length; k++) {
      if (i === strs[k].length || strs[k][i] !== ch) {
        return first.slice(0, i); // one slice, made once, at the end
      }
    }
  }
  return first; // every character of strs[0] matched
}

function show(strs) {
  const p = longestCommonPrefix(strs);
  const items = '[' + strs.map((s) => '"' + s + '"').join(', ') + ']';
  return items + ' => "' + p + '" (' + p.length + ')';
}

console.log(show(['flower', 'flow', 'flight'])); // ["flower", "flow", "flight"] => "fl" (2)
console.log(show(['dog', 'racecar', 'car'])); // ["dog", "racecar", "car"] => "" (0)
console.log(show(['interspecies', 'interstellar', 'interstate'])); // ["interspecies", "interstellar", "interstate"] => "inters" (6)
console.log(show(['throne', 'throne'])); // ["throne", "throne"] => "throne" (6)
console.log(show(['ab', 'a'])); // ["ab", "a"] => "a" (1)
console.log(show(['alone'])); // ["alone"] => "alone" (5)
console.log(show(['', 'abc'])); // ["", "abc"] => "" (0)
console.log(show(['Apple', 'apple'])); // ["Apple", "apple"] => "" (0)
console.log(show([])); // [] => "" (0)` },
          { label: `Vertical vs horizontal vs sort-the-ends, counting character comparisons`, code: `function vertical(strs) {
  // Column by column; returns [prefix, character comparisons].
  if (strs.length === 0) return ['', 0];
  const first = strs[0];
  let comps = 0;
  for (let i = 0; i < first.length; i++) {
    for (let k = 1; k < strs.length; k++) {
      if (i === strs[k].length) return [first.slice(0, i), comps];
      comps++;
      if (strs[k][i] !== first[i]) return [first.slice(0, i), comps];
    }
  }
  return [first, comps];
}

function horizontal(strs) {
  // Shrink a running prefix against each string in turn.
  if (strs.length === 0) return ['', 0];
  let prefix = strs[0], comps = 0;
  for (let k = 1; k < strs.length; k++) {
    const s = strs[k];
    let j = 0;
    while (j < prefix.length && j < s.length) {
      comps++;
      if (prefix[j] !== s[j]) break;
      j++;
    }
    prefix = prefix.slice(0, j);
    if (prefix === '') break;
  }
  return [prefix, comps];
}

function sortedEnds(strs) {
  // After sorting, only the first and last strings need comparing (sort cost not counted).
  if (strs.length === 0) return ['', 0];
  const ordered = [...strs].sort(); // default sort compares UTF-16 code units; copy so input is untouched
  const a = ordered[0], b = ordered[ordered.length - 1];
  let j = 0, comps = 0;
  while (j < a.length && j < b.length) {
    comps++;
    if (a[j] !== b[j]) break;
    j++;
  }
  return [a.slice(0, j), comps];
}

const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const cases = [
  ['classic', ['flower', 'flow', 'flight']],
  ['short last', [alphabet, alphabet, alphabet, alphabet, 'b']],
  ['all equal', new Array(5).fill('prefix')],
  ['long shared', Array.from({ length: 10 }, (_, k) => 'commonprefix' + k)],
];
for (const [name, strs] of cases) {
  const [v, vc] = vertical(strs);
  const [h, hc] = horizontal(strs);
  const [s, sc] = sortedEnds(strs);
  console.log(name + ': "' + v + '" agree=' + (v === h && h === s)
    + ' vertical=' + vc + ' horizontal=' + hc + ' sorted_ends=' + sc);
}` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Write a method that takes a String array and returns the longest prefix all the strings share, or an empty string if there is none. For example, flower, flow and flight give fl. Please write it in Java."

**What a strong answer should cover:**
- Vertical scanning: compare \`charAt(i)\` of every string, stop at the first mismatch or the first string that runs out; return \`strs[0].substring(0, i)\`.
- Edge cases handled up front: null or empty array, a single string, an empty string in the array.
- O(n * (L + 1)) time, bounded by the total characters S; O(1) extra space besides the result.
- Alternatives named with their cost: horizontal scanning, \`Arrays.sort\` on a copy then compare first and last, a trie.
- Java specifics: \`charAt\` past the end throws \`StringIndexOutOfBoundsException\`, compare string contents with \`equals\` (never \`==\`), \`Arrays.sort\` sorts in place, and \`indexOf(prefix) != 0\` scans the whole string where \`startsWith\` does not.

**Clarifying questions expected:**
- "What should an empty or null array return?"
- "Is it case-sensitive?"

**Code / implementation expected:** Yes — \`static String longestCommonPrefix(String[] strs)\` in Java with two loops and \`charAt\`.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A librarian is handed a stack of index cards: "interspecies", "interstellar", "interstate". She wants one label for the drawer they go in, and the label should be the longest beginning that **every** card shares. She lines the cards up one above the other, left-aligned, and reads down the first column: i, i, i. Same. Second column: n, n, n. She keeps going until a column disagrees (e, e, a at the seventh letter) or a card runs out of letters. Everything to the left of that column is the label: "inters".

That is the whole algorithm. The question is easy, which is exactly why interviewers use it: they are watching whether you handle the empty list, the empty string, the string that is shorter than the others, and whether you stop at the **first** column that fails.

📌 **Interview term: Prefix** — the first k characters of a string, for some k from 0 to its length. "" is a prefix of every string.

📌 **Interview term: Longest common prefix (LCP)** — the longest string that is a prefix of every string in the list. It is "" when the first characters already differ.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What should an empty list return? | Usually "". There is no "first string" to start from, so code it as a special case. |
| Is the comparison case-sensitive? | "Apple" and "apple" share no prefix unless you lowercase first. |
| Only ASCII letters, or any Unicode? | Decides whether indexing by position means "one character" in your language. |
| How many strings, and how long? | With many queries against the same list, a trie or a precomputed answer is worth it. |
| Must I avoid modifying the input? | The sorting trick sorts a copy; sorting in place changes the caller list. |

## 3. The Core Idea: Vertical Scanning

Take the first string as the reference. For column \`i = 0, 1, 2, ...\`, look at character \`i\` of **every** other string. The scan stops the moment either

1. some string has length \`i\` (it has run out), or
2. some string has a different character at \`i\`.

The answer is the first \`i\` characters of the reference. If no column ever fails, the reference itself is the answer.

📌 **Interview term: Vertical scanning** — comparing the strings column by column (character \`i\` of all strings, then \`i + 1\`), stopping at the first column that fails.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 320" role="img" aria-label="Vertical scanning on flower flow flight, columns 0 and 1 match with f and l, column 2 has o o i and stops the scan, so the prefix is fl">
  <text class="d-sub" x="165" y="28" text-anchor="middle">col 0</text>
  <text class="d-sub" x="225" y="28" text-anchor="middle">col 1</text>
  <text class="d-sub" x="285" y="28" text-anchor="middle">col 2</text>
  <text class="d-sub" x="345" y="28" text-anchor="middle">col 3</text>
  <text class="d-sub" x="405" y="28" text-anchor="middle">col 4</text>
  <text class="d-sub" x="465" y="28" text-anchor="middle">col 5</text>
  <text class="d-sub" x="80" y="72" text-anchor="middle">flower</text>
  <rect class="d-box-accent" x="140" y="44" width="50" height="44" rx="5"/><text class="d-text" x="165" y="72" text-anchor="middle">f</text>
  <rect class="d-box-accent" x="200" y="44" width="50" height="44" rx="5"/><text class="d-text" x="225" y="72" text-anchor="middle">l</text>
  <rect class="d-box-muted" x="260" y="44" width="50" height="44" rx="5"/><text class="d-text" x="285" y="72" text-anchor="middle">o</text>
  <rect class="d-box" x="320" y="44" width="50" height="44" rx="5"/><text class="d-text" x="345" y="72" text-anchor="middle">w</text>
  <rect class="d-box" x="380" y="44" width="50" height="44" rx="5"/><text class="d-text" x="405" y="72" text-anchor="middle">e</text>
  <rect class="d-box" x="440" y="44" width="50" height="44" rx="5"/><text class="d-text" x="465" y="72" text-anchor="middle">r</text>
  <text class="d-sub" x="80" y="132" text-anchor="middle">flow</text>
  <rect class="d-box-accent" x="140" y="104" width="50" height="44" rx="5"/><text class="d-text" x="165" y="132" text-anchor="middle">f</text>
  <rect class="d-box-accent" x="200" y="104" width="50" height="44" rx="5"/><text class="d-text" x="225" y="132" text-anchor="middle">l</text>
  <rect class="d-box-muted" x="260" y="104" width="50" height="44" rx="5"/><text class="d-text" x="285" y="132" text-anchor="middle">o</text>
  <rect class="d-box" x="320" y="104" width="50" height="44" rx="5"/><text class="d-text" x="345" y="132" text-anchor="middle">w</text>
  <text class="d-sub" x="80" y="192" text-anchor="middle">flight</text>
  <rect class="d-box-accent" x="140" y="164" width="50" height="44" rx="5"/><text class="d-text" x="165" y="192" text-anchor="middle">f</text>
  <rect class="d-box-accent" x="200" y="164" width="50" height="44" rx="5"/><text class="d-text" x="225" y="192" text-anchor="middle">l</text>
  <rect class="d-box-muted" x="260" y="164" width="50" height="44" rx="5"/><text class="d-text" x="285" y="192" text-anchor="middle">i</text>
  <rect class="d-box" x="320" y="164" width="50" height="44" rx="5"/><text class="d-text" x="345" y="192" text-anchor="middle">g</text>
  <rect class="d-box" x="380" y="164" width="50" height="44" rx="5"/><text class="d-text" x="405" y="192" text-anchor="middle">h</text>
  <rect class="d-box" x="440" y="164" width="50" height="44" rx="5"/><text class="d-text" x="465" y="192" text-anchor="middle">t</text>
  <rect class="d-box-accent" x="60" y="250" width="220" height="56" rx="10"/>
  <text class="d-text" x="170" y="284" text-anchor="middle">prefix = fl</text>
  <rect class="d-box-muted" x="320" y="250" width="240" height="56" rx="10"/>
  <text class="d-text" x="440" y="284" text-anchor="middle">col 2: i differs, stop</text>
</svg>

In the picture, columns 0 and 1 match in all three strings; column 2 holds o, o, i, so the scan stops and the prefix is "fl". Notice that columns 3 to 5 are never read: vertical scanning only ever does about \`n * (L + 1)\` comparisons, where \`L\` is the answer length, no matter how long the strings are.

### Horizontal scanning

📌 **Interview term: Horizontal scanning** — start with \`prefix = strs[0]\` and shrink it against each string in turn: \`LCP(LCP(LCP(s0, s1), s2), s3)...\`.

It gives the same answer, but it can do far more work when the short or different string is at the **end**: with four copies of the alphabet followed by "b", Example 2 counts 79 comparisons for horizontal scanning and 4 for vertical scanning.

### The sorting trick

📌 **Interview term: Lexicographic order** — dictionary order: compare character by character, and a string that is a prefix of another comes first.

After sorting, the first and last strings are the two that differ the most, and any prefix they share is shared by everything between them. So you only compare those two. The sort costs O(n log n) comparisons of strings, so it is not faster than vertical scanning; it is a neat observation to mention, and the same idea works without sorting by taking the minimum and maximum string in one pass.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="After sorting, flight flow flower, only the first string flight and the last string flower are compared, giving fl">
  <defs>
    <marker id="lcp2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="120" y="22" text-anchor="middle">sorted copy</text>
  <rect class="d-box-accent" x="40" y="34" width="160" height="50" rx="8"/>
  <text class="d-text" x="120" y="64" text-anchor="middle">flight</text>
  <rect class="d-box-muted" x="40" y="104" width="160" height="50" rx="8"/>
  <text class="d-text" x="120" y="134" text-anchor="middle">flow</text>
  <rect class="d-box-accent" x="40" y="174" width="160" height="50" rx="8"/>
  <text class="d-text" x="120" y="204" text-anchor="middle">flower</text>
  <path class="d-edge-accent" d="M 204 60 L 336 112" marker-end="url(#lcp2-arrow)"/>
  <path class="d-edge-accent" d="M 204 198 L 336 146" marker-end="url(#lcp2-arrow)"/>
  <rect class="d-box" x="340" y="88" width="260" height="84" rx="10"/>
  <text class="d-text" x="470" y="120" text-anchor="middle">compare first and last</text>
  <text class="d-sub" x="470" y="146" text-anchor="middle">f, l match; i versus o stops</text>
</svg>

Sorting gives flight, flow, flower. Comparing only "flight" and "flower" yields "fl", the same answer.

### Other approaches worth naming

- **Divide and conquer:** LCP of the left half, LCP of the right half, then the LCP of those two. Same total work, but it splits nicely across threads.
- **Binary search on the length:** test whether the first \`mid\` characters are a prefix of all strings; O(S log m) where S is the total length and m the shortest length.
- **A trie:** insert every string, then walk from the root while the node has exactly one child and is not the end of a word. It is O(S) to build, and it pays off when you must answer many "common prefix" queries or the list changes. See [what is a trie](/interview-question/what-is-a-trie-and-when-is-it-useful).

## 4. Vertical Scanning in Java

~~~java
static String longestCommonPrefix(String[] strs) {
    if (strs == null || strs.length == 0) return "";
    String first = strs[0];
    for (int i = 0; i < first.length(); i++) {
        char ch = first.charAt(i);
        for (int k = 1; k < strs.length; k++) {
            if (i == strs[k].length() || strs[k].charAt(i) != ch) {
                return first.substring(0, i);   // ran out, or a different character
            }
        }
    }
    return first;
}
~~~

**Why each line is there:**

- \`strs == null || strs.length == 0\`: Java will happily pass you \`null\`; \`strs[0]\` on an empty array throws \`ArrayIndexOutOfBoundsException\`.
- \`i == strs[k].length()\` comes **first**: \`||\` short-circuits, so \`charAt(i)\` is never called out of range, which would throw \`StringIndexOutOfBoundsException\`.
- \`char\` comparison with \`!=\` is a value comparison and is correct. Comparing whole \`String\`s with \`==\` is not: in a test run, \`"fl" == new String("fl")\` printed \`false\` while \`.equals\` printed \`true\`. Example 2 uses \`equals\` to check that the three methods agree.
- \`substring(0, i)\` takes a begin index and an **exclusive** end index, and is called once.

**The common LeetCode-style shortcut.** Many Java answers write horizontal scanning as \`while (s.indexOf(prefix) != 0) prefix = prefix.substring(0, prefix.length() - 1);\`. It works, but \`indexOf\` searches the **whole** string for a match anywhere (in a test run \`"xflower".indexOf("fl")\` returned 1, not -1), so a miss at position 0 still scans to the end. \`s.startsWith(prefix)\` only checks the start and is the right tool.

**Sorting in Java.** \`Arrays.sort(String[])\` uses \`String.compareTo\`, which compares \`char\` values, so uppercase sorts first: a test run sorted apple, Banana, cherry into \`Banana apple cherry\`. It sorts **in place**, so Example 2 sorts \`strs.clone()\`.

## 5. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — vertical scanning on normal and edge-case inputs** prints:

~~~text
["flower", "flow", "flight"] => "fl" (2)
["dog", "racecar", "car"] => "" (0)
["interspecies", "interstellar", "interstate"] => "inters" (6)
["throne", "throne"] => "throne" (6)
["ab", "a"] => "a" (1)
["alone"] => "alone" (5)
["", "abc"] => "" (0)
["Apple", "apple"] => "" (0)
[] => "" (0)
~~~

**Example 2 — vertical vs horizontal vs sort-the-ends, counting character comparisons** prints:

~~~text
classic: "fl" agree=true vertical=6 horizontal=7 sorted_ends=3
short last: "" agree=true vertical=4 horizontal=79 sorted_ends=1
all equal: "prefix" agree=true vertical=24 horizontal=24 sorted_ends=6
long shared: "commonprefix" agree=true vertical=109 horizontal=109 sorted_ends=13
~~~

**Reading the output:** \`["ab", "a"]\` gives "a" because the second string runs out at column 1, which is the length check, not a character mismatch. \`["", "abc"]\` and \`[]\` both give "". \`["Apple", "apple"]\` gives "" because the comparison is case-sensitive. In Example 2, all three methods agree on every input (\`agree=true\`); vertical scanning never does more comparisons than horizontal scanning here, and the "short last" line shows the big gap (4 versus 79). The \`sorted_ends\` count excludes the cost of sorting itself.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Vertical scanning | O(n * (L + 1)), at most O(S) | O(1) besides the answer | reads only the columns up to the first failure |
| Horizontal scanning | O(S) | O(1) besides the answer | each string is compared against the running prefix |
| Sort, compare first and last | O(n log n) string comparisons + O(m) | O(n) for a sorted copy | the sort dominates |
| Min and max string, compare them | O(S) | O(1) | two linear passes plus one comparison |
| Trie | O(S) to build | O(S) | one node per character in the worst case |

Here n is the number of strings, S the total number of characters, m the shortest length and L the answer length. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read this table.

## 7. Edge Cases

- **Empty list:** return "" (there is no first string).
- **One string:** the answer is that string.
- **An empty string anywhere:** the answer is "".
- **A string that is a prefix of another** (\`["ab", "a"]\`): the length check ends the scan.
- **All strings equal:** the answer is the whole string; the loop ends because the reference runs out.
- **Case and Unicode:** "Apple" and "apple" share nothing unless you normalise case first.

## Common Pitfalls

- **\`charAt\` before the length check.** \`strs[k].charAt(i) != ch || i == strs[k].length()\` throws \`StringIndexOutOfBoundsException\` on \`{"ab", "a"}\`.
- **\`==\` on strings.** It compares references; use \`equals\` for content (and \`char\` values with \`==\` are fine).
- **\`indexOf(prefix) != 0\` as a prefix test.** It searches the whole string; \`startsWith\` is the precise and cheaper check.
- **Sorting the caller array.** \`Arrays.sort(strs)\` reorders the input; sort \`strs.clone()\`.
- **Building the answer with \`+=\` in a loop.** Each \`+=\` creates a new \`String\`; use \`substring\` once at the end, or a \`StringBuilder\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Approach:</strong> <span style="color:#f0e2c8;">Vertical scanning: for each index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strs[0]</code>, check every other string has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length() &gt; i</code> and the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">charAt(i)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Stop rule:</strong> <span style="color:#f0e2c8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first.substring(0, i)</code> at the first failure; if nothing fails, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Edge cases:</strong> <span style="color:#f0e2c8;">Null or empty array returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code>; an empty string in the array makes the answer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n * (L + 1)) time, at most the total characters; O(1) extra space besides the result.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java notes:</strong> <span style="color:#f0e2c8;">Length check before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">charAt</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code> not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> for strings, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startsWith</code> rather than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">indexOf(prefix) == 0</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">s.indexOf(prefix) == 0</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">indexOf</code> keeps searching the whole string for a later match, so a failing check costs O(len(s) * len(prefix)) in the worst case. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startsWith</code> only looks at the beginning.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does sorting and comparing first and last work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In lexicographic order every string lies between the first and last, so their shared prefix is shared by all. Sort a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clone()</code> so the input is untouched.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">substring</code> copy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a proper sub-range it returns a new <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">String</code> object holding those characters; that is why the answer calls it once, after the loop, rather than shrinking a prefix string again and again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use a trie instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When there are many prefix queries against the same set of words, or words are added over time. Build once in O(S), then each query walks from the root.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle case-insensitivity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Character.toLowerCase(a) == Character.toLowerCase(b)</code> per character, or lowercase every string once with an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Locale.ROOT</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix** | the first k characters of a string |
| **Longest common prefix (LCP)** | the longest prefix shared by every string in the list |
| **Vertical scanning** | compare column by column across all strings |
| **Horizontal scanning** | shrink a running prefix against one string at a time |
| **Lexicographic order** | dictionary order, character by character |

---
**Conclusion:** The longest common prefix is a column-by-column scan that stops at the first column where some string runs out or disagrees. Vertical scanning reads only as many columns as the answer needs and runs in O(n * (L + 1)) time with no extra memory. In Java, check \`length()\` before \`charAt\`, compare strings with \`equals\`, prefer \`startsWith\` to \`indexOf\`, and sort a clone if you use the sorting trick.`,
        examples: [
          { label: `Vertical scanning on normal and edge-case inputs`, code: `import java.util.StringJoiner;

public class Main {
    /** Vertical scanning: compare column i of every string; stop at the first mismatch or short string. */
    static String longestCommonPrefix(String[] strs) {
        if (strs == null || strs.length == 0) return "";
        String first = strs[0];
        for (int i = 0; i < first.length(); i++) {
            char ch = first.charAt(i);
            for (int k = 1; k < strs.length; k++) {
                if (i == strs[k].length() || strs[k].charAt(i) != ch) {
                    return first.substring(0, i);   // one substring, made once, at the end
                }
            }
        }
        return first;                               // every character of strs[0] matched
    }

    static String show(String... strs) {
        String p = longestCommonPrefix(strs);
        StringJoiner items = new StringJoiner(", ", "[", "]");
        for (String s : strs) items.add("\\"" + s + "\\"");
        return items + " => \\"" + p + "\\" (" + p.length() + ")";
    }

    public static void main(String[] args) {
        System.out.println(show("flower", "flow", "flight"));                    // => "fl" (2)
        System.out.println(show("dog", "racecar", "car"));                       // => "" (0)
        System.out.println(show("interspecies", "interstellar", "interstate"));  // => "inters" (6)
        System.out.println(show("throne", "throne"));                            // => "throne" (6)
        System.out.println(show("ab", "a"));                                     // => "a" (1)
        System.out.println(show("alone"));                                       // => "alone" (5)
        System.out.println(show("", "abc"));                                     // => "" (0)
        System.out.println(show("Apple", "apple"));                              // => "" (0)
        System.out.println(show());                                              // [] => "" (0)
    }
}` },
          { label: `Vertical vs horizontal vs sort-the-ends, counting character comparisons`, code: `import java.util.Arrays;

public class Main {
    static int comps;   // character comparisons made by the last call

    /** Column by column. */
    static String vertical(String[] strs) {
        comps = 0;
        if (strs.length == 0) return "";
        String first = strs[0];
        for (int i = 0; i < first.length(); i++) {
            for (int k = 1; k < strs.length; k++) {
                if (i == strs[k].length()) return first.substring(0, i);
                comps++;
                if (strs[k].charAt(i) != first.charAt(i)) return first.substring(0, i);
            }
        }
        return first;
    }

    /** Shrink a running prefix against each string in turn. */
    static String horizontal(String[] strs) {
        comps = 0;
        if (strs.length == 0) return "";
        String prefix = strs[0];
        for (int k = 1; k < strs.length; k++) {
            String s = strs[k];
            int j = 0;
            while (j < prefix.length() && j < s.length()) {
                comps++;
                if (prefix.charAt(j) != s.charAt(j)) break;
                j++;
            }
            prefix = prefix.substring(0, j);
            if (prefix.isEmpty()) break;
        }
        return prefix;
    }

    /** After sorting, only the first and last strings need comparing (sort cost not counted). */
    static String sortedEnds(String[] strs) {
        comps = 0;
        if (strs.length == 0) return "";
        String[] ordered = strs.clone();      // Arrays.sort sorts in place; keep the input untouched
        Arrays.sort(ordered);                 // String.compareTo: lexicographic by char value
        String a = ordered[0], b = ordered[ordered.length - 1];
        int j = 0;
        while (j < a.length() && j < b.length()) {
            comps++;
            if (a.charAt(j) != b.charAt(j)) break;
            j++;
        }
        return a.substring(0, j);
    }

    public static void main(String[] args) {
        String alphabet = "abcdefghijklmnopqrstuvwxyz";
        String[] allEqual = new String[5];
        Arrays.fill(allEqual, "prefix");
        String[] longShared = new String[10];
        for (int k = 0; k < 10; k++) longShared[k] = "commonprefix" + k;
        String[] names = {"classic", "short last", "all equal", "long shared"};
        String[][] cases = {
            {"flower", "flow", "flight"},
            {alphabet, alphabet, alphabet, alphabet, "b"},
            allEqual,
            longShared,
        };
        for (int c = 0; c < cases.length; c++) {
            String v = vertical(cases[c]);     int vc = comps;
            String h = horizontal(cases[c]);   int hc = comps;
            String s = sortedEnds(cases[c]);   int sc = comps;
            boolean agree = v.equals(h) && h.equals(s);   // equals, never == , for String content
            System.out.println(names[c] + ": \\"" + v + "\\" agree=" + agree
                + " vertical=" + vc + " horizontal=" + hc + " sorted_ends=" + sc);
        }
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Write a function that takes a vector of strings and returns the longest prefix they all share, or an empty string if there is none. For example, flower, flow and flight give fl. Please write it in C++."

**What a strong answer should cover:**
- Vertical scanning: compare character \`i\` of every string, stop at the first mismatch or the first string that runs out; return \`strs[0].substr(0, i)\`.
- Edge cases handled up front: empty vector, a single string, an empty string in the vector.
- O(n * (L + 1)) time, bounded by the total characters S; O(1) extra space besides the result.
- Alternatives named with their cost: horizontal scanning, sort and compare the ends (or \`std::minmax_element\`), a trie.
- C++ specifics: pass \`const std::vector<std::string>&\` to avoid copies, \`s[i]\` past the end is undefined behaviour (only \`at()\` checks), \`size()\` is unsigned, and \`std::mismatch\` finds the first differing position of two ranges.

**Clarifying questions expected:**
- "What should an empty vector return?"
- "Is it case-sensitive, and is the text ASCII or UTF-8?"

**Code / implementation expected:** Yes — \`std::string longestCommonPrefix(const std::vector<std::string>&)\` in C++ with two loops.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A librarian is handed a stack of index cards: "interspecies", "interstellar", "interstate". She wants one label for the drawer they go in, and the label should be the longest beginning that **every** card shares. She lines the cards up one above the other, left-aligned, and reads down the first column: i, i, i. Same. Second column: n, n, n. She keeps going until a column disagrees (e, e, a at the seventh letter) or a card runs out of letters. Everything to the left of that column is the label: "inters".

That is the whole algorithm. The question is easy, which is exactly why interviewers use it: they are watching whether you handle the empty list, the empty string, the string that is shorter than the others, and whether you stop at the **first** column that fails.

📌 **Interview term: Prefix** — the first k characters of a string, for some k from 0 to its length. "" is a prefix of every string.

📌 **Interview term: Longest common prefix (LCP)** — the longest string that is a prefix of every string in the list. It is "" when the first characters already differ.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What should an empty list return? | Usually "". There is no "first string" to start from, so code it as a special case. |
| Is the comparison case-sensitive? | "Apple" and "apple" share no prefix unless you lowercase first. |
| Only ASCII letters, or any Unicode? | Decides whether indexing by position means "one character" in your language. |
| How many strings, and how long? | With many queries against the same list, a trie or a precomputed answer is worth it. |
| Must I avoid modifying the input? | The sorting trick sorts a copy; sorting in place changes the caller list. |

## 3. The Core Idea: Vertical Scanning

Take the first string as the reference. For column \`i = 0, 1, 2, ...\`, look at character \`i\` of **every** other string. The scan stops the moment either

1. some string has length \`i\` (it has run out), or
2. some string has a different character at \`i\`.

The answer is the first \`i\` characters of the reference. If no column ever fails, the reference itself is the answer.

📌 **Interview term: Vertical scanning** — comparing the strings column by column (character \`i\` of all strings, then \`i + 1\`), stopping at the first column that fails.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 320" role="img" aria-label="Vertical scanning on flower flow flight, columns 0 and 1 match with f and l, column 2 has o o i and stops the scan, so the prefix is fl">
  <text class="d-sub" x="165" y="28" text-anchor="middle">col 0</text>
  <text class="d-sub" x="225" y="28" text-anchor="middle">col 1</text>
  <text class="d-sub" x="285" y="28" text-anchor="middle">col 2</text>
  <text class="d-sub" x="345" y="28" text-anchor="middle">col 3</text>
  <text class="d-sub" x="405" y="28" text-anchor="middle">col 4</text>
  <text class="d-sub" x="465" y="28" text-anchor="middle">col 5</text>
  <text class="d-sub" x="80" y="72" text-anchor="middle">flower</text>
  <rect class="d-box-accent" x="140" y="44" width="50" height="44" rx="5"/><text class="d-text" x="165" y="72" text-anchor="middle">f</text>
  <rect class="d-box-accent" x="200" y="44" width="50" height="44" rx="5"/><text class="d-text" x="225" y="72" text-anchor="middle">l</text>
  <rect class="d-box-muted" x="260" y="44" width="50" height="44" rx="5"/><text class="d-text" x="285" y="72" text-anchor="middle">o</text>
  <rect class="d-box" x="320" y="44" width="50" height="44" rx="5"/><text class="d-text" x="345" y="72" text-anchor="middle">w</text>
  <rect class="d-box" x="380" y="44" width="50" height="44" rx="5"/><text class="d-text" x="405" y="72" text-anchor="middle">e</text>
  <rect class="d-box" x="440" y="44" width="50" height="44" rx="5"/><text class="d-text" x="465" y="72" text-anchor="middle">r</text>
  <text class="d-sub" x="80" y="132" text-anchor="middle">flow</text>
  <rect class="d-box-accent" x="140" y="104" width="50" height="44" rx="5"/><text class="d-text" x="165" y="132" text-anchor="middle">f</text>
  <rect class="d-box-accent" x="200" y="104" width="50" height="44" rx="5"/><text class="d-text" x="225" y="132" text-anchor="middle">l</text>
  <rect class="d-box-muted" x="260" y="104" width="50" height="44" rx="5"/><text class="d-text" x="285" y="132" text-anchor="middle">o</text>
  <rect class="d-box" x="320" y="104" width="50" height="44" rx="5"/><text class="d-text" x="345" y="132" text-anchor="middle">w</text>
  <text class="d-sub" x="80" y="192" text-anchor="middle">flight</text>
  <rect class="d-box-accent" x="140" y="164" width="50" height="44" rx="5"/><text class="d-text" x="165" y="192" text-anchor="middle">f</text>
  <rect class="d-box-accent" x="200" y="164" width="50" height="44" rx="5"/><text class="d-text" x="225" y="192" text-anchor="middle">l</text>
  <rect class="d-box-muted" x="260" y="164" width="50" height="44" rx="5"/><text class="d-text" x="285" y="192" text-anchor="middle">i</text>
  <rect class="d-box" x="320" y="164" width="50" height="44" rx="5"/><text class="d-text" x="345" y="192" text-anchor="middle">g</text>
  <rect class="d-box" x="380" y="164" width="50" height="44" rx="5"/><text class="d-text" x="405" y="192" text-anchor="middle">h</text>
  <rect class="d-box" x="440" y="164" width="50" height="44" rx="5"/><text class="d-text" x="465" y="192" text-anchor="middle">t</text>
  <rect class="d-box-accent" x="60" y="250" width="220" height="56" rx="10"/>
  <text class="d-text" x="170" y="284" text-anchor="middle">prefix = fl</text>
  <rect class="d-box-muted" x="320" y="250" width="240" height="56" rx="10"/>
  <text class="d-text" x="440" y="284" text-anchor="middle">col 2: i differs, stop</text>
</svg>

In the picture, columns 0 and 1 match in all three strings; column 2 holds o, o, i, so the scan stops and the prefix is "fl". Notice that columns 3 to 5 are never read: vertical scanning only ever does about \`n * (L + 1)\` comparisons, where \`L\` is the answer length, no matter how long the strings are.

### Horizontal scanning

📌 **Interview term: Horizontal scanning** — start with \`prefix = strs[0]\` and shrink it against each string in turn: \`LCP(LCP(LCP(s0, s1), s2), s3)...\`.

It gives the same answer, but it can do far more work when the short or different string is at the **end**: with four copies of the alphabet followed by "b", Example 2 counts 79 comparisons for horizontal scanning and 4 for vertical scanning.

### The sorting trick

📌 **Interview term: Lexicographic order** — dictionary order: compare character by character, and a string that is a prefix of another comes first.

After sorting, the first and last strings are the two that differ the most, and any prefix they share is shared by everything between them. So you only compare those two. The sort costs O(n log n) comparisons of strings, so it is not faster than vertical scanning; it is a neat observation to mention, and the same idea works without sorting by taking the minimum and maximum string in one pass.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="After sorting, flight flow flower, only the first string flight and the last string flower are compared, giving fl">
  <defs>
    <marker id="lcp2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="120" y="22" text-anchor="middle">sorted copy</text>
  <rect class="d-box-accent" x="40" y="34" width="160" height="50" rx="8"/>
  <text class="d-text" x="120" y="64" text-anchor="middle">flight</text>
  <rect class="d-box-muted" x="40" y="104" width="160" height="50" rx="8"/>
  <text class="d-text" x="120" y="134" text-anchor="middle">flow</text>
  <rect class="d-box-accent" x="40" y="174" width="160" height="50" rx="8"/>
  <text class="d-text" x="120" y="204" text-anchor="middle">flower</text>
  <path class="d-edge-accent" d="M 204 60 L 336 112" marker-end="url(#lcp2-arrow)"/>
  <path class="d-edge-accent" d="M 204 198 L 336 146" marker-end="url(#lcp2-arrow)"/>
  <rect class="d-box" x="340" y="88" width="260" height="84" rx="10"/>
  <text class="d-text" x="470" y="120" text-anchor="middle">compare first and last</text>
  <text class="d-sub" x="470" y="146" text-anchor="middle">f, l match; i versus o stops</text>
</svg>

Sorting gives flight, flow, flower. Comparing only "flight" and "flower" yields "fl", the same answer.

### Other approaches worth naming

- **Divide and conquer:** LCP of the left half, LCP of the right half, then the LCP of those two. Same total work, but it splits nicely across threads.
- **Binary search on the length:** test whether the first \`mid\` characters are a prefix of all strings; O(S log m) where S is the total length and m the shortest length.
- **A trie:** insert every string, then walk from the root while the node has exactly one child and is not the end of a word. It is O(S) to build, and it pays off when you must answer many "common prefix" queries or the list changes. See [what is a trie](/interview-question/what-is-a-trie-and-when-is-it-useful).

## 4. Vertical Scanning in C++

~~~cpp
std::string longestCommonPrefix(const std::vector<std::string>& strs) {
    if (strs.empty()) return "";
    const std::string& first = strs[0];          // reference: no copy
    for (size_t i = 0; i < first.size(); ++i) {
        for (size_t k = 1; k < strs.size(); ++k) {
            if (i == strs[k].size() || strs[k][i] != first[i]) {
                return first.substr(0, i);       // ran out, or a different character
            }
        }
    }
    return first;
}
~~~

**Why each line is there:**

- \`const std::vector<std::string>&\` and \`const std::string& first\` avoid copying any string; only the result is built.
- \`strs.empty()\` first: \`strs[0]\` on an empty vector is undefined behaviour.
- \`i == strs[k].size()\` before \`strs[k][i]\`: \`operator[]\` does not check bounds, so reading past the end is undefined behaviour rather than an exception. (For \`std::string\`, index \`size()\` itself is defined and returns \`'\\0'\`, but anything past it is not; do not rely on either.)
- \`substr(pos, count)\` takes a **length** as its second argument, not an end index; here they are the same because \`pos\` is 0.
- Indices are \`size_t\` to match \`size()\`, and the code never subtracts from them, so the unsigned type cannot wrap.

**Two-string building block with \`std::mismatch\`.** For two strings, \`std::mismatch(a.begin(), a.end(), b.begin(), b.end())\` returns the first pair of positions that differ; the prefix is \`std::string(a.begin(), it)\`. A test run on flower and flight printed \`fl\`. Combined with \`std::minmax_element\` (which printed \`flight flower\` for the three-word example), that gives an O(S) answer in a few lines:

~~~cpp
auto [lo, hi] = std::minmax_element(strs.begin(), strs.end());
auto [itLo, itHi] = std::mismatch(lo->begin(), lo->end(), hi->begin(), hi->end());
std::string prefix(lo->begin(), itLo);           // requires a non-empty strs
~~~

**Sorting in C++.** \`std::sort\` on \`std::string\` uses \`operator<\`, which compares characters with \`char_traits<char>::lt\`; for ASCII that is the usual uppercase-before-lowercase order. Example 2 takes the vector **by value** in \`sortedEnds\`, so it sorts its own copy and the caller vector is unchanged.

## 5. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — vertical scanning on normal and edge-case inputs** prints:

~~~text
["flower", "flow", "flight"] => "fl" (2)
["dog", "racecar", "car"] => "" (0)
["interspecies", "interstellar", "interstate"] => "inters" (6)
["throne", "throne"] => "throne" (6)
["ab", "a"] => "a" (1)
["alone"] => "alone" (5)
["", "abc"] => "" (0)
["Apple", "apple"] => "" (0)
[] => "" (0)
~~~

**Example 2 — vertical vs horizontal vs sort-the-ends, counting character comparisons** prints:

~~~text
classic: "fl" agree=true vertical=6 horizontal=7 sorted_ends=3
short last: "" agree=true vertical=4 horizontal=79 sorted_ends=1
all equal: "prefix" agree=true vertical=24 horizontal=24 sorted_ends=6
long shared: "commonprefix" agree=true vertical=109 horizontal=109 sorted_ends=13
~~~

**Reading the output:** \`["ab", "a"]\` gives "a" because the second string runs out at column 1, which is the length check, not a character mismatch. \`["", "abc"]\` and \`[]\` both give "". \`["Apple", "apple"]\` gives "" because the comparison is case-sensitive. In Example 2, all three methods agree on every input (\`agree=true\`); vertical scanning never does more comparisons than horizontal scanning here, and the "short last" line shows the big gap (4 versus 79). The \`sorted_ends\` count excludes the cost of sorting itself.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Vertical scanning | O(n * (L + 1)), at most O(S) | O(1) besides the answer | reads only the columns up to the first failure |
| Horizontal scanning | O(S) | O(1) besides the answer | each string is compared against the running prefix |
| Sort, compare first and last | O(n log n) string comparisons + O(m) | O(n) for a sorted copy | the sort dominates |
| Min and max string, compare them | O(S) | O(1) | two linear passes plus one comparison |
| Trie | O(S) to build | O(S) | one node per character in the worst case |

Here n is the number of strings, S the total number of characters, m the shortest length and L the answer length. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read this table.

## 7. Edge Cases

- **Empty list:** return "" (there is no first string).
- **One string:** the answer is that string.
- **An empty string anywhere:** the answer is "".
- **A string that is a prefix of another** (\`["ab", "a"]\`): the length check ends the scan.
- **All strings equal:** the answer is the whole string; the loop ends because the reference runs out.
- **Case and Unicode:** "Apple" and "apple" share nothing unless you normalise case first.

## Common Pitfalls

- **\`operator[]\` past the end.** No exception, just undefined behaviour; test \`i == s.size()\` first, or use \`at()\` while debugging.
- **Copying the input.** \`std::vector<std::string> strs\` (by value) copies every string; pass by \`const&\` unless you need a copy to sort.
- **\`substr(i, j)\` read as "from i to j".** The second argument is a count; \`substr(2, 3)\` is three characters starting at 2.
- **Unsigned wrap-around.** \`first.size() - 1\` on an empty string is 18446744073709551615 (seen in a test run); avoid subtracting from \`size()\` in loop bounds.
- **UTF-8 text.** \`std::string\` is bytes; a byte-wise prefix can end in the middle of a multi-byte character.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Approach:</strong> <span style="color:#f0e2c8;">Vertical scanning: for each index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strs[0]</code>, check every other string has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size() &gt; i</code> and the same character at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Stop rule:</strong> <span style="color:#f0e2c8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first.substr(0, i)</code> at the first failure; if nothing fails, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Edge cases:</strong> <span style="color:#f0e2c8;">Empty vector returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code>; an empty string anywhere makes the answer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">""</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n * (L + 1)) time, at most the total characters; O(1) extra space besides the result, thanks to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ notes:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> is unchecked, so test the size first; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::mismatch</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::minmax_element</code> is a neat library version.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does comparing only the min and max string work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In lexicographic order every string lies between them, so their common prefix is common to all. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::minmax_element</code> finds both in one pass.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::mismatch</code> return?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A pair of iterators to the first positions where the two ranges differ (or the end of the shorter one, with the four-iterator overload).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the strings are UTF-8?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The byte prefix may stop inside a multi-byte character. Trim back to a character boundary, or decode to code points first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use a trie instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When there are many prefix queries against the same set of words, or words are added over time. Build once in O(S), then each query walks from the root.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::string_view</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;std::string_view&gt;</code> or return a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string_view</code> of the first string to avoid allocating, as long as the strings outlive the view.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix** | the first k characters of a string |
| **Longest common prefix (LCP)** | the longest prefix shared by every string in the list |
| **Vertical scanning** | compare column by column across all strings |
| **Horizontal scanning** | shrink a running prefix against one string at a time |
| **Lexicographic order** | dictionary order, character by character |

---
**Conclusion:** The longest common prefix is a column-by-column scan that stops at the first column where some string runs out or disagrees. Vertical scanning reads only as many columns as the answer needs and runs in O(n * (L + 1)) time with no extra memory. In C++, pass by \`const&\`, test the size before \`operator[]\` because nothing checks it for you, read \`substr\` as (position, length), and reach for \`std::mismatch\` when you want the library to do the two-string comparison.`,
        examples: [
          { label: `Vertical scanning on normal and edge-case inputs`, code: `#include <iostream>
#include <string>
#include <vector>

// Vertical scanning: compare column i of every string; stop at the first mismatch or short string.
std::string longestCommonPrefix(const std::vector<std::string>& strs) {
    if (strs.empty()) return "";
    const std::string& first = strs[0];       // a reference: no copy of the first string
    for (size_t i = 0; i < first.size(); ++i) {
        char ch = first[i];
        for (size_t k = 1; k < strs.size(); ++k) {
            if (i == strs[k].size() || strs[k][i] != ch) {
                return first.substr(0, i);    // one copy, made once, at the end
            }
        }
    }
    return first;                             // every character of strs[0] matched
}

std::string show(const std::vector<std::string>& strs) {
    std::string p = longestCommonPrefix(strs);
    std::string items = "[";
    for (size_t k = 0; k < strs.size(); ++k) items += (k ? ", \\"" : "\\"") + strs[k] + "\\"";
    items += "]";
    return items + " => \\"" + p + "\\" (" + std::to_string(p.size()) + ")";
}

int main() {
    std::cout << show({"flower", "flow", "flight"}) << "\\n";                   // => "fl" (2)
    std::cout << show({"dog", "racecar", "car"}) << "\\n";                      // => "" (0)
    std::cout << show({"interspecies", "interstellar", "interstate"}) << "\\n"; // => "inters" (6)
    std::cout << show({"throne", "throne"}) << "\\n";                           // => "throne" (6)
    std::cout << show({"ab", "a"}) << "\\n";                                    // => "a" (1)
    std::cout << show({"alone"}) << "\\n";                                      // => "alone" (5)
    std::cout << show({"", "abc"}) << "\\n";                                    // => "" (0)
    std::cout << show({"Apple", "apple"}) << "\\n";                             // => "" (0)
    std::cout << show({}) << "\\n";                                             // [] => "" (0)
    return 0;
}` },
          { label: `Vertical vs horizontal vs sort-the-ends, counting character comparisons`, code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

using Result = std::pair<std::string, int>;   // {prefix, character comparisons}

// Column by column.
Result vertical(const std::vector<std::string>& strs) {
    if (strs.empty()) return {"", 0};
    const std::string& first = strs[0];
    int comps = 0;
    for (size_t i = 0; i < first.size(); ++i) {
        for (size_t k = 1; k < strs.size(); ++k) {
            if (i == strs[k].size()) return {first.substr(0, i), comps};
            ++comps;
            if (strs[k][i] != first[i]) return {first.substr(0, i), comps};
        }
    }
    return {first, comps};
}

// Shrink a running prefix against each string in turn.
Result horizontal(const std::vector<std::string>& strs) {
    if (strs.empty()) return {"", 0};
    std::string prefix = strs[0];
    int comps = 0;
    for (size_t k = 1; k < strs.size(); ++k) {
        const std::string& s = strs[k];
        size_t j = 0;
        while (j < prefix.size() && j < s.size()) {
            ++comps;
            if (prefix[j] != s[j]) break;
            ++j;
        }
        prefix.resize(j);                      // shrink in place, no new string
        if (prefix.empty()) break;
    }
    return {prefix, comps};
}

// After sorting, only the first and last strings need comparing (sort cost not counted).
Result sortedEnds(std::vector<std::string> strs) {   // by value: we sort our own copy
    if (strs.empty()) return {"", 0};
    std::sort(strs.begin(), strs.end());
    const std::string& a = strs.front();
    const std::string& b = strs.back();
    size_t j = 0;
    int comps = 0;
    while (j < a.size() && j < b.size()) {
        ++comps;
        if (a[j] != b[j]) break;
        ++j;
    }
    return {a.substr(0, j), comps};
}

int main() {
    std::string alphabet = "abcdefghijklmnopqrstuvwxyz";
    std::vector<std::string> longShared;
    for (int k = 0; k < 10; ++k) longShared.push_back("commonprefix" + std::to_string(k));
    std::vector<std::pair<std::string, std::vector<std::string>>> cases = {
        {"classic", {"flower", "flow", "flight"}},
        {"short last", {alphabet, alphabet, alphabet, alphabet, "b"}},
        {"all equal", std::vector<std::string>(5, "prefix")},
        {"long shared", longShared},
    };
    for (const auto& [name, strs] : cases) {
        auto [v, vc] = vertical(strs);
        auto [h, hc] = horizontal(strs);
        auto [s, sc] = sortedEnds(strs);
        std::cout << std::boolalpha << name << ": \\"" << v << "\\" agree=" << (v == h && h == s)
                  << " vertical=" << vc << " horizontal=" << hc << " sorted_ends=" << sc << "\\n";
    }
    return 0;
}` },
        ],
      },
    },
  },
  {
    title: `How do you find the longest palindromic substring?`,
    difficulty: "medium",
    seoDescription: `Longest palindromic substring in Python, JavaScript, Java and C++: expand around 2n-1 centres in O(n^2) time and O(1) space, the DP table, and Manacher.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a string, return the longest substring that is a palindrome. For example, babad gives bab or aba, and cbbd gives bb. Please write it in Python, and tell me the time and space cost."

**What a strong answer should cover:**
- Every palindrome has a centre: n character centres and n - 1 gap centres; expand two pointers outward from each while the characters match.
- Track the best (start, length) and slice once at the end; O(n^2) time, O(1) extra space.
- The O(n^3) brute force and the O(n^2)-space DP as alternatives; Manacher as the O(n) follow-up.
- Edge cases: empty string, single character, even-length palindromes, ties.
- Python specifics: slicing (\`s[a:b]\`) copies, so do not slice inside the loop; \`[[False] * n] * n\` aliases one row n times; Python loops are slow enough that the O(n^3) brute force is unusable beyond a few hundred characters.

**Clarifying questions expected:**
- "Substring or subsequence?"
- "If there is a tie, which palindrome should I return?"

**Code / implementation expected:** Yes — \`longest_palindrome(s)\` in Python using expand-around-centre with index pointers.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a long strip of paper with letters printed on it, and a small mirror you can stand upright on the strip. Wherever you put the mirror, you can check how far the letters on the left match their reflection on the right: "b a | a b" matches two letters on each side, "r a c e | c a r" fails at once. Every palindrome hidden in the strip has a **middle** where the mirror would stand, either **on** a letter ("ra**c**ecar") or **between** two letters ("ab|ba").

So instead of checking every one of the roughly n^2/2 substrings separately, you can walk the mirror along the strip, and at each spot let the reflection grow outward as long as the letters keep matching. The longest reflection you ever see is the answer.

📌 **Interview term: Palindrome** — a string that reads the same forwards and backwards, such as "level" or "abba". A single character is a palindrome; so, by convention, is the empty string.

📌 **Interview term: Substring** — a **contiguous** run of characters inside a string. "bab" is a substring of "babad"; "bbd" is not (that would be a subsequence).

The question: given a string \`s\`, return its longest substring that is a palindrome. If several have the same maximum length, any one is usually accepted (ask).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Substring (contiguous) or subsequence? | A subsequence version is a different DP problem ("longest palindromic subsequence"). |
| If there is a tie, which one do you want? | "babad" has both "bab" and "aba"; most graders accept either. |
| How long can the string be? | Up to about 1,000 characters, O(n^2) is fine; for 10^5 or more you want Manacher. |
| Case-sensitive, and only letters? | "Aba" is not a palindrome unless you normalise case. |
| Return the string or its position? | Returning (start, length) avoids building strings until the end. |

## 3. The Core Idea: Expand Around Every Centre

📌 **Interview term: Centre** — the middle of a palindrome. Odd-length palindromes have a character as their centre; even-length palindromes have the **gap** between two characters as their centre. A string of length n has n character centres and n - 1 gap centres: **2n - 1** centres in total.

📌 **Interview term: Expand around centre** — start two pointers at a centre (\`lo = hi = i\` for odd, \`lo = i, hi = i + 1\` for even) and move them outward while \`s[lo] == s[hi]\` and both are in range. When they stop, the palindrome is \`s[lo + 1 .. hi - 1]\`, of length \`hi - lo - 1\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Odd centre at index 1 of babad grows to bab, even centre between indices 1 and 2 of cbbd grows to bb">
  <rect class="d-box" x="40" y="40" width="54" height="50" rx="6"/><text class="d-text" x="67" y="70" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="110" y="40" width="54" height="50" rx="6"/><text class="d-text" x="137" y="70" text-anchor="middle">a</text>
  <rect class="d-box" x="180" y="40" width="54" height="50" rx="6"/><text class="d-text" x="207" y="70" text-anchor="middle">b</text>
  <rect class="d-box-muted" x="250" y="40" width="54" height="50" rx="6"/><text class="d-text" x="277" y="70" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="320" y="40" width="54" height="50" rx="6"/><text class="d-text" x="347" y="70" text-anchor="middle">d</text>
  <path class="d-edge-accent" d="M 40 100 L 40 112 L 234 112 L 234 100" fill="none"/>
  <text class="d-sub" x="137" y="134" text-anchor="middle">bab, length 3</text>
  <rect class="d-box-accent" x="430" y="40" width="180" height="64" rx="10"/>
  <text class="d-text" x="520" y="68" text-anchor="middle">odd centre</text>
  <text class="d-sub" x="520" y="90" text-anchor="middle">on index 1</text>
  <rect class="d-box-muted" x="40" y="180" width="54" height="50" rx="6"/><text class="d-text" x="67" y="210" text-anchor="middle">c</text>
  <rect class="d-box-accent" x="110" y="180" width="54" height="50" rx="6"/><text class="d-text" x="137" y="210" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="180" y="180" width="54" height="50" rx="6"/><text class="d-text" x="207" y="210" text-anchor="middle">b</text>
  <rect class="d-box-muted" x="250" y="180" width="54" height="50" rx="6"/><text class="d-text" x="277" y="210" text-anchor="middle">d</text>
  <path class="d-edge-accent" d="M 110 240 L 110 252 L 234 252 L 234 240" fill="none"/>
  <text class="d-sub" x="172" y="274" text-anchor="middle">bb, length 2</text>
  <rect class="d-box-accent" x="430" y="180" width="180" height="64" rx="10"/>
  <text class="d-text" x="520" y="208" text-anchor="middle">even centre</text>
  <text class="d-sub" x="520" y="230" text-anchor="middle">between 1 and 2</text>
</svg>

In "babad", the centre on index 1 grows one step (b = b) to "bab" and then stops at the left edge. In "cbbd", the gap centre between indices 1 and 2 starts with b = b, grows to "bb", and stops because c differs from d. Forgetting the gap centres is the most common bug: "cbbd" would then return "c" instead of "bb".

### Why it is correct

Every palindrome has exactly one centre, and expanding from that centre finds the **longest** palindrome around it (if a bigger palindrome shares the centre, every smaller one inside it matches too). Trying all 2n - 1 centres therefore sees the longest palindrome of the whole string.

### Brute force and DP, for comparison

- **Brute force:** check every substring with two pointers: O(n^2) substrings times O(n) per check = O(n^3).
- **Dynamic programming:** \`dp[i][j]\` says whether \`s[i..j]\` is a palindrome. It is O(n^2) time **and** O(n^2) memory, and it is the version to know if the interviewer is testing [dynamic programming](/interview-question/what-is-dynamic-programming).

📌 **Interview term: DP table** — a 2-D array that stores the answer to each subproblem so it is computed once; here, one boolean per (i, j) pair.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="DP recurrence, dp of i and j is true when the end characters match and the inner range i plus 1 to j minus 1 is a palindrome">
  <defs>
    <marker id="lps2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="220" height="64" rx="10"/>
  <text class="d-text" x="140" y="58" text-anchor="middle">ends match</text>
  <text class="d-sub" x="140" y="80" text-anchor="middle">s[i] equals s[j]</text>
  <rect class="d-box" x="30" y="126" width="220" height="64" rx="10"/>
  <text class="d-text" x="140" y="154" text-anchor="middle">inside is a palindrome</text>
  <text class="d-sub" x="140" y="176" text-anchor="middle">dp[i+1][j-1], or j - i below 2</text>
  <path class="d-edge" d="M 254 62 L 386 100" marker-end="url(#lps2-arrow)"/>
  <path class="d-edge" d="M 254 158 L 386 120" marker-end="url(#lps2-arrow)"/>
  <rect class="d-box-accent" x="390" y="76" width="220" height="68" rx="10"/>
  <text class="d-text" x="500" y="104" text-anchor="middle">dp[i][j] is true</text>
  <text class="d-sub" x="500" y="126" text-anchor="middle">both conditions hold</text>
</svg>

The table must be filled so that \`dp[i + 1][j - 1]\` is ready before \`dp[i][j]\`: loop \`i\` from n - 1 down to 0 and \`j\` from i up to n - 1. Ranges of length 1 or 2 (\`j - i < 2\`) only need the end characters to match.

### Manacher, the O(n) follow-up

📌 **Interview term: Manacher's algorithm** — an O(n) method that inserts a separator between characters (so every palindrome becomes odd-length) and reuses the radius of the mirror position inside the rightmost palindrome found so far, so each character is expanded past only a constant number of times overall.

You rarely have to code it in an interview, but you should name it and explain the mirror idea. Example 2 includes it and shows the difference: on 200 copies of "a", expanding around centres does 20,100 comparisons, while Manacher does 399.

The two-pointer check itself is the same as in [the valid palindrome question](/interview-question/how-do-you-check-if-a-string-is-a-valid-palindrome); here the pointers move **outward** from the middle instead of inward from the ends.

## 4. Expand Around Centre in Python

~~~python
def expand(s, left, right):
    while left >= 0 and right < len(s) and s[left] == s[right]:
        left -= 1
        right += 1
    return left + 1, right - 1          # bounds of the last pair that matched


def longest_palindrome(s):
    best_start, best_len = 0, 0
    for i in range(len(s)):
        for lo, hi in (expand(s, i, i), expand(s, i, i + 1)):   # odd centre, even centre
            if hi - lo + 1 > best_len:
                best_start, best_len = lo, hi - lo + 1
    return s[best_start:best_start + best_len]
~~~

**Why each line is there:**

- \`left >= 0 and right < len(s)\` comes before \`s[left] == s[right]\`. Watch the left bound especially: in Python \`s[-1]\` does **not** raise, it silently reads the **last** character, so a missing \`left >= 0\` check gives wrong answers instead of an error.
- \`expand(s, i, i + 1)\` at the last index starts with \`right == len(s)\`, fails the bound immediately, and returns a length of 0. No special case needed.
- The function keeps **indices** and slices once at the end. Slicing \`s[lo:hi + 1]\` inside the loop would copy a string for every centre.

**The DP version in Python.** Build the table with a comprehension: \`[[False] * n for _ in range(n)]\`. The shortcut \`[[False] * n] * n\` puts the **same** row object in every slot; in a test run, setting \`grid[0][0] = True\` on a 3 x 3 grid built that way printed \`[[True, False, False], [True, False, False], [True, False, False]]\`.

**Performance note.** Pure-Python loops are much slower than the same loops in Java or C++. The expand version handles strings of a few thousand characters comfortably; the O(n^3) brute force does 671,650 comparisons on just 200 characters (Example 2), so treat it as a warm-up only.

## 5. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — expand around centre on normal and edge-case strings** prints:

~~~text
[babad] => [bab] start=0 len=3
[cbbd] => [bb] start=1 len=2
[forgeeksskeegfor] => [geeksskeeg] start=3 len=10
[abacdfgdcaba] => [aba] start=0 len=3
[aaaa] => [aaaa] start=0 len=4
[ac] => [a] start=0 len=1
[a] => [a] start=0 len=1
[] => [] start=0 len=0
~~~

**Example 2 — brute force, DP, expand and Manacher agree, with work counters** prints:

~~~text
babad: len=3 agree=true brute=10 dp_cells=15 expand=13 manacher=13
forgeeksskeegfor: len=10 agree=true brute=135 dp_cells=136 expand=52 manacher=51
random ab x200: len=15 agree=true brute=39271 dp_cells=20100 expand=978 manacher=790
a x200: len=200 agree=true brute=671650 dp_cells=20100 expand=20100 manacher=399
~~~

**Reading the output:** "babad" returns "bab" (start 0) rather than "aba": both have length 3 and the code keeps the first one found, because it only replaces the best on a strictly longer palindrome. "cbbd" returns the even palindrome "bb". "ac" returns "a", and the empty string returns an empty result with length 0. In Example 2, \`agree=true\` on every line: all four methods find the same length. The counters show the growth: brute force does 671,650 comparisons on 200 copies of "a", the DP fills exactly n(n+1)/2 = 20,100 cells, expanding does 20,100 comparisons on that worst case but only 978 on random text, and Manacher stays near 2n.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n^3) | O(1) | n(n+1)/2 substrings, O(n) check each |
| DP table | O(n^2) | O(n^2) | one cell per (i, j) pair, O(1) each |
| Expand around centre | O(n^2) worst, often much less | O(1) | 2n - 1 centres, each expansion at most O(n) |
| Manacher | O(n) | O(n) | the radius array; total expansion is linear |

The worst case for expanding is a string of one repeated letter, where every centre grows to the edge. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Empty string:** return "" (length 0).
- **One character:** the character itself.
- **No repeated neighbours** ("ac", "abcd"): the answer is a single character, the first one with strict \`>\`.
- **Even palindromes** ("cbbd", "abba"): only the gap centres find them.
- **The whole string is a palindrome** ("aaaa"): return it all.
- **Ties** ("babad"): either "bab" or "aba"; state which one your code returns.

## Common Pitfalls

- **Only odd centres.** Without \`expand(s, i, i + 1)\`, "cbbd" returns "c" instead of "bb".
- **Negative indices.** \`s[-1]\` reads the last character instead of failing; always check \`left >= 0\` before indexing.
- **Slicing in the loop.** \`best = s[lo:hi + 1]\` for every candidate copies strings; keep \`(start, length)\` and slice once.
- **Aliased DP rows.** \`[[False] * n] * n\` shares one row; use a comprehension.
- **Returning the length instead of the string.** Read the question: most versions want the substring.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key idea:</strong> <span style="color:#f0e2c8;">Every palindrome has a centre, either a character or a gap, so there are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2n - 1</code> centres to try.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Expand:</strong> <span style="color:#f0e2c8;">From each centre move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> outward while in range and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[left] == s[right]</code>; the palindrome is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[left+1:right]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Bookkeeping:</strong> <span style="color:#f0e2c8;">Keep the best start and length, replace only on a strictly longer one, slice once at the end.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n^2) time worst case, O(1) extra space; DP is O(n^2) space, Manacher is O(n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left &gt;= 0</code> explicitly because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[-1]</code> wraps around instead of raising.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are there <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">2n - 1</code> centres?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Odd palindromes centre on one of the n characters; even ones centre on one of the n - 1 gaps between neighbours.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is expanding slow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On one repeated letter: every centre grows to the edge, about n^2/2 comparisons. The verified count for 200 copies of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> is 20,100.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you explain Manacher in one minute?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Insert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> between characters so all palindromes are odd. Keep the rightmost palindrome seen; a position inside it starts from its mirror radius, so total expansion is O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if they ask for the longest palindromic subsequence instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is a different DP: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j] = dp[i+1][j-1] + 2</code> if the ends match, else the max of dropping either end. O(n^2) time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not the DP table?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is correct and good for explaining DP, but it needs n^2 booleans (a million for n = 1000) where expanding needs O(1) extra memory.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Palindrome** | reads the same forwards and backwards |
| **Substring** | a contiguous run of characters |
| **Centre** | the middle character or gap of a palindrome; there are 2n - 1 |
| **Expand around centre** | grow two pointers outward while the characters match |
| **DP table** | a 2-D array of subproblem answers, here dp[i][j] |
| **Manacher's algorithm** | O(n) method that reuses mirrored radii |

---
**Conclusion:** The longest palindromic substring is found by trying every centre, all n characters and all n - 1 gaps, and expanding two pointers outward while the characters match. That is O(n^2) time and O(1) extra space, simpler than the O(n^2)-space DP table, and Manacher brings it to O(n) when asked. In Python, check the left bound explicitly because negative indices wrap, keep indices instead of slicing inside the loop, and build DP rows with a comprehension.`,
        examples: [
          { label: `Expand around centre on normal and edge-case strings`, code: `def expand(s, left, right):
    """Grow outward while both ends match; return the bounds of the palindrome found."""
    while left >= 0 and right < len(s) and s[left] == s[right]:
        left -= 1
        right += 1
    return left + 1, right - 1          # the last pair that matched


def longest_palindrome(s):
    """Expand around all 2n - 1 centres; return (start, length)."""
    best_start, best_len = 0, 0
    for i in range(len(s)):
        for lo, hi in (expand(s, i, i), expand(s, i, i + 1)):   # odd centre, even centre
            if hi - lo + 1 > best_len:
                best_start, best_len = lo, hi - lo + 1
    return best_start, best_len


def show(s):
    start, length = longest_palindrome(s)
    return "[" + s + "] => [" + s[start:start + length] + "] start=" + str(start) + " len=" + str(length)


print(show("babad"))  # [babad] => [bab] start=0 len=3
print(show("cbbd"))  # [cbbd] => [bb] start=1 len=2
print(show("forgeeksskeegfor"))  # [forgeeksskeegfor] => [geeksskeeg] start=3 len=10
print(show("abacdfgdcaba"))  # [abacdfgdcaba] => [aba] start=0 len=3
print(show("aaaa"))  # [aaaa] => [aaaa] start=0 len=4
print(show("ac"))  # [ac] => [a] start=0 len=1
print(show("a"))  # [a] => [a] start=0 len=1
print(show(""))  # [] => [] start=0 len=0` },
          { label: `Brute force, DP, expand and Manacher agree, with work counters`, code: `def brute_force(s):
    """O(n^3): test every substring; returns (best length, character comparisons)."""
    best, comps = 0, 0
    for i in range(len(s)):
        for j in range(i, len(s)):
            lo, hi, ok = i, j, True
            while lo < hi:
                comps += 1
                if s[lo] != s[hi]:
                    ok = False
                    break
                lo += 1
                hi -= 1
            if ok and j - i + 1 > best:
                best = j - i + 1
    return best, comps


def dp_table(s):
    """O(n^2) time and space: dp[i][j] is True when s[i..j] is a palindrome."""
    n = len(s)
    dp = [[False] * n for _ in range(n)]   # n separate rows, not [[False] * n] * n
    best, cells = 0, 0
    for i in range(n - 1, -1, -1):
        for j in range(i, n):
            cells += 1
            dp[i][j] = s[i] == s[j] and (j - i < 2 or dp[i + 1][j - 1])
            if dp[i][j] and j - i + 1 > best:
                best = j - i + 1
    return best, cells


def expand_centres(s):
    """O(n^2) time, O(1) space."""
    best, comps = 0, 0
    for c in range(2 * len(s) - 1):        # centre c covers index c // 2 (odd) or a gap (even)
        lo, hi = c // 2, c // 2 + c % 2
        while lo >= 0 and hi < len(s):
            comps += 1
            if s[lo] != s[hi]:
                break
            lo -= 1
            hi += 1
        best = max(best, hi - lo - 1)
    return best, comps


def manacher(s):
    """O(n): reuse the mirror radius inside the rightmost palindrome seen so far."""
    t = "#"
    for ch in s:
        t += ch + "#"                      # 'aba' -> '#a#b#a#', so every palindrome is odd
    m = len(t)
    radius = [0] * m
    centre = right = 0
    comps = 0
    for i in range(m):
        if i < right:
            radius[i] = min(right - i, radius[2 * centre - i])
        while i - radius[i] - 1 >= 0 and i + radius[i] + 1 < m:
            comps += 1
            if t[i - radius[i] - 1] != t[i + radius[i] + 1]:
                break
            radius[i] += 1
        if i + radius[i] > right:
            centre, right = i, i + radius[i]
    return max(radius), comps


def make_text(n, seed):
    """Deterministic pseudo-random string over 'ab' (same generator in every language)."""
    out, x = "", seed
    for _ in range(n):
        x = (x * 48271) % 2147483647
        out += "ab"[x % 2]
    return out


cases = [("babad", "babad"), ("forgeeksskeegfor", "forgeeksskeegfor"),
         ("random ab x200", make_text(200, 12345)), ("a x200", "a" * 200)]
for name, s in cases:
    b, bc = brute_force(s)
    d, dc = dp_table(s)
    e, ec = expand_centres(s)
    m, mc = manacher(s)
    print(name + ": len=" + str(e) + " agree=" + str(b == d == e == m).lower()
          + " brute=" + str(bc) + " dp_cells=" + str(dc) + " expand=" + str(ec) + " manacher=" + str(mc))` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given a string, return the longest substring that is a palindrome. For example, babad gives bab or aba, and cbbd gives bb. Please write it in JavaScript, and tell me the time and space cost."

**What a strong answer should cover:**
- Every palindrome has a centre: n character centres and n - 1 gap centres; expand two pointers outward from each while the characters match.
- Track the best (start, length) and slice once at the end; O(n^2) time, O(1) extra space.
- The O(n^3) brute force and the O(n^2)-space DP as alternatives; Manacher as the O(n) follow-up.
- Edge cases: empty string, single character, even-length palindromes, ties.
- JavaScript specifics: \`/\` is float division, so use \`Math.floor\` for centre indices; \`s[-1]\` is \`undefined\`; \`new Array(n).fill(new Array(n))\` shares one row; strings are UTF-16, so emoji are two code units.

**Clarifying questions expected:**
- "Substring or subsequence?"
- "If there is a tie, which palindrome should I return?"

**Code / implementation expected:** Yes — \`longestPalindrome(s)\` in JavaScript using expand-around-centre with index pointers.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a long strip of paper with letters printed on it, and a small mirror you can stand upright on the strip. Wherever you put the mirror, you can check how far the letters on the left match their reflection on the right: "b a | a b" matches two letters on each side, "r a c e | c a r" fails at once. Every palindrome hidden in the strip has a **middle** where the mirror would stand, either **on** a letter ("ra**c**ecar") or **between** two letters ("ab|ba").

So instead of checking every one of the roughly n^2/2 substrings separately, you can walk the mirror along the strip, and at each spot let the reflection grow outward as long as the letters keep matching. The longest reflection you ever see is the answer.

📌 **Interview term: Palindrome** — a string that reads the same forwards and backwards, such as "level" or "abba". A single character is a palindrome; so, by convention, is the empty string.

📌 **Interview term: Substring** — a **contiguous** run of characters inside a string. "bab" is a substring of "babad"; "bbd" is not (that would be a subsequence).

The question: given a string \`s\`, return its longest substring that is a palindrome. If several have the same maximum length, any one is usually accepted (ask).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Substring (contiguous) or subsequence? | A subsequence version is a different DP problem ("longest palindromic subsequence"). |
| If there is a tie, which one do you want? | "babad" has both "bab" and "aba"; most graders accept either. |
| How long can the string be? | Up to about 1,000 characters, O(n^2) is fine; for 10^5 or more you want Manacher. |
| Case-sensitive, and only letters? | "Aba" is not a palindrome unless you normalise case. |
| Return the string or its position? | Returning (start, length) avoids building strings until the end. |

## 3. The Core Idea: Expand Around Every Centre

📌 **Interview term: Centre** — the middle of a palindrome. Odd-length palindromes have a character as their centre; even-length palindromes have the **gap** between two characters as their centre. A string of length n has n character centres and n - 1 gap centres: **2n - 1** centres in total.

📌 **Interview term: Expand around centre** — start two pointers at a centre (\`lo = hi = i\` for odd, \`lo = i, hi = i + 1\` for even) and move them outward while \`s[lo] == s[hi]\` and both are in range. When they stop, the palindrome is \`s[lo + 1 .. hi - 1]\`, of length \`hi - lo - 1\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Odd centre at index 1 of babad grows to bab, even centre between indices 1 and 2 of cbbd grows to bb">
  <rect class="d-box" x="40" y="40" width="54" height="50" rx="6"/><text class="d-text" x="67" y="70" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="110" y="40" width="54" height="50" rx="6"/><text class="d-text" x="137" y="70" text-anchor="middle">a</text>
  <rect class="d-box" x="180" y="40" width="54" height="50" rx="6"/><text class="d-text" x="207" y="70" text-anchor="middle">b</text>
  <rect class="d-box-muted" x="250" y="40" width="54" height="50" rx="6"/><text class="d-text" x="277" y="70" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="320" y="40" width="54" height="50" rx="6"/><text class="d-text" x="347" y="70" text-anchor="middle">d</text>
  <path class="d-edge-accent" d="M 40 100 L 40 112 L 234 112 L 234 100" fill="none"/>
  <text class="d-sub" x="137" y="134" text-anchor="middle">bab, length 3</text>
  <rect class="d-box-accent" x="430" y="40" width="180" height="64" rx="10"/>
  <text class="d-text" x="520" y="68" text-anchor="middle">odd centre</text>
  <text class="d-sub" x="520" y="90" text-anchor="middle">on index 1</text>
  <rect class="d-box-muted" x="40" y="180" width="54" height="50" rx="6"/><text class="d-text" x="67" y="210" text-anchor="middle">c</text>
  <rect class="d-box-accent" x="110" y="180" width="54" height="50" rx="6"/><text class="d-text" x="137" y="210" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="180" y="180" width="54" height="50" rx="6"/><text class="d-text" x="207" y="210" text-anchor="middle">b</text>
  <rect class="d-box-muted" x="250" y="180" width="54" height="50" rx="6"/><text class="d-text" x="277" y="210" text-anchor="middle">d</text>
  <path class="d-edge-accent" d="M 110 240 L 110 252 L 234 252 L 234 240" fill="none"/>
  <text class="d-sub" x="172" y="274" text-anchor="middle">bb, length 2</text>
  <rect class="d-box-accent" x="430" y="180" width="180" height="64" rx="10"/>
  <text class="d-text" x="520" y="208" text-anchor="middle">even centre</text>
  <text class="d-sub" x="520" y="230" text-anchor="middle">between 1 and 2</text>
</svg>

In "babad", the centre on index 1 grows one step (b = b) to "bab" and then stops at the left edge. In "cbbd", the gap centre between indices 1 and 2 starts with b = b, grows to "bb", and stops because c differs from d. Forgetting the gap centres is the most common bug: "cbbd" would then return "c" instead of "bb".

### Why it is correct

Every palindrome has exactly one centre, and expanding from that centre finds the **longest** palindrome around it (if a bigger palindrome shares the centre, every smaller one inside it matches too). Trying all 2n - 1 centres therefore sees the longest palindrome of the whole string.

### Brute force and DP, for comparison

- **Brute force:** check every substring with two pointers: O(n^2) substrings times O(n) per check = O(n^3).
- **Dynamic programming:** \`dp[i][j]\` says whether \`s[i..j]\` is a palindrome. It is O(n^2) time **and** O(n^2) memory, and it is the version to know if the interviewer is testing [dynamic programming](/interview-question/what-is-dynamic-programming).

📌 **Interview term: DP table** — a 2-D array that stores the answer to each subproblem so it is computed once; here, one boolean per (i, j) pair.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="DP recurrence, dp of i and j is true when the end characters match and the inner range i plus 1 to j minus 1 is a palindrome">
  <defs>
    <marker id="lps2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="220" height="64" rx="10"/>
  <text class="d-text" x="140" y="58" text-anchor="middle">ends match</text>
  <text class="d-sub" x="140" y="80" text-anchor="middle">s[i] equals s[j]</text>
  <rect class="d-box" x="30" y="126" width="220" height="64" rx="10"/>
  <text class="d-text" x="140" y="154" text-anchor="middle">inside is a palindrome</text>
  <text class="d-sub" x="140" y="176" text-anchor="middle">dp[i+1][j-1], or j - i below 2</text>
  <path class="d-edge" d="M 254 62 L 386 100" marker-end="url(#lps2-arrow)"/>
  <path class="d-edge" d="M 254 158 L 386 120" marker-end="url(#lps2-arrow)"/>
  <rect class="d-box-accent" x="390" y="76" width="220" height="68" rx="10"/>
  <text class="d-text" x="500" y="104" text-anchor="middle">dp[i][j] is true</text>
  <text class="d-sub" x="500" y="126" text-anchor="middle">both conditions hold</text>
</svg>

The table must be filled so that \`dp[i + 1][j - 1]\` is ready before \`dp[i][j]\`: loop \`i\` from n - 1 down to 0 and \`j\` from i up to n - 1. Ranges of length 1 or 2 (\`j - i < 2\`) only need the end characters to match.

### Manacher, the O(n) follow-up

📌 **Interview term: Manacher's algorithm** — an O(n) method that inserts a separator between characters (so every palindrome becomes odd-length) and reuses the radius of the mirror position inside the rightmost palindrome found so far, so each character is expanded past only a constant number of times overall.

You rarely have to code it in an interview, but you should name it and explain the mirror idea. Example 2 includes it and shows the difference: on 200 copies of "a", expanding around centres does 20,100 comparisons, while Manacher does 399.

The two-pointer check itself is the same as in [the valid palindrome question](/interview-question/how-do-you-check-if-a-string-is-a-valid-palindrome); here the pointers move **outward** from the middle instead of inward from the ends.

## 4. Expand Around Centre in JavaScript

~~~javascript
function expand(s, left, right) {
  while (left >= 0 && right < s.length && s[left] === s[right]) {
    left--;
    right++;
  }
  return [left + 1, right - 1]; // bounds of the last pair that matched
}

function longestPalindrome(s) {
  let bestStart = 0, bestLen = 0;
  for (let i = 0; i < s.length; i++) {
    for (const [lo, hi] of [expand(s, i, i), expand(s, i, i + 1)]) { // odd, even
      if (hi - lo + 1 > bestLen) {
        bestStart = lo;
        bestLen = hi - lo + 1;
      }
    }
  }
  return s.slice(bestStart, bestStart + bestLen);
}
~~~

**Why each line is there:**

- The bounds checks come first. \`s[-1]\` in JavaScript is \`undefined\`, and \`undefined === undefined\` is \`true\`, so a version without bounds checks treats two out-of-range reads as "equal": in a test run, expanding from the middle of "aba" with no bounds check was still going after 1,000,000 steps when the test stopped it.
- \`s.slice(start, end)\` takes an exclusive end; \`slice\` and \`substring\` agree for normal arguments (both gave \`bc\` for \`'abcde'\` in a test run), but \`substring\` swaps reversed arguments while \`slice\` does not, so pick one and use it consistently.
- Returning arrays \`[lo, hi]\` from \`expand\` allocates a tiny array per call; that is fine for an interview, and you can return a length instead if you want zero allocations.

**Integer division.** The single-loop version over centres \`c = 0 .. 2n - 2\` (used in Example 2) needs \`Math.floor(c / 2)\`: in JavaScript \`7 / 2\` is \`3.5\`, and \`s[3.5]\` is \`undefined\`.

**The DP version in JavaScript.** Build rows with \`Array.from({ length: n }, () => new Array(n).fill(false))\`. The shortcut \`new Array(n).fill(new Array(n).fill(false))\` fills every slot with the **same** row; a test run set \`g[0][0] = true\` and printed \`[[true,false,false],[true,false,false],[true,false,false]]\`.

**Manacher in JavaScript.** Example 2 tracks the best radius inside the loop instead of \`Math.max(...radius)\`: spreading a large array into a function call can throw, and in a test run on Node 22 a 1,000,000-element spread threw \`RangeError\`.

## 5. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — expand around centre on normal and edge-case strings** prints:

~~~text
[babad] => [bab] start=0 len=3
[cbbd] => [bb] start=1 len=2
[forgeeksskeegfor] => [geeksskeeg] start=3 len=10
[abacdfgdcaba] => [aba] start=0 len=3
[aaaa] => [aaaa] start=0 len=4
[ac] => [a] start=0 len=1
[a] => [a] start=0 len=1
[] => [] start=0 len=0
~~~

**Example 2 — brute force, DP, expand and Manacher agree, with work counters** prints:

~~~text
babad: len=3 agree=true brute=10 dp_cells=15 expand=13 manacher=13
forgeeksskeegfor: len=10 agree=true brute=135 dp_cells=136 expand=52 manacher=51
random ab x200: len=15 agree=true brute=39271 dp_cells=20100 expand=978 manacher=790
a x200: len=200 agree=true brute=671650 dp_cells=20100 expand=20100 manacher=399
~~~

**Reading the output:** "babad" returns "bab" (start 0) rather than "aba": both have length 3 and the code keeps the first one found, because it only replaces the best on a strictly longer palindrome. "cbbd" returns the even palindrome "bb". "ac" returns "a", and the empty string returns an empty result with length 0. In Example 2, \`agree=true\` on every line: all four methods find the same length. The counters show the growth: brute force does 671,650 comparisons on 200 copies of "a", the DP fills exactly n(n+1)/2 = 20,100 cells, expanding does 20,100 comparisons on that worst case but only 978 on random text, and Manacher stays near 2n.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n^3) | O(1) | n(n+1)/2 substrings, O(n) check each |
| DP table | O(n^2) | O(n^2) | one cell per (i, j) pair, O(1) each |
| Expand around centre | O(n^2) worst, often much less | O(1) | 2n - 1 centres, each expansion at most O(n) |
| Manacher | O(n) | O(n) | the radius array; total expansion is linear |

The worst case for expanding is a string of one repeated letter, where every centre grows to the edge. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Empty string:** return "" (length 0).
- **One character:** the character itself.
- **No repeated neighbours** ("ac", "abcd"): the answer is a single character, the first one with strict \`>\`.
- **Even palindromes** ("cbbd", "abba"): only the gap centres find them.
- **The whole string is a palindrome** ("aaaa"): return it all.
- **Ties** ("babad"): either "bab" or "aba"; state which one your code returns.

## Common Pitfalls

- **Only odd centres.** Without \`expand(s, i, i + 1)\`, "cbbd" returns "c" instead of "bb".
- **Float division.** \`c / 2\` is not an integer index; use \`Math.floor(c / 2)\` or \`c >> 1\`.
- **Shared DP rows.** \`new Array(n).fill(row)\` reuses one array; use \`Array.from\` with a factory.
- **\`Math.max(...bigArray)\`.** It can throw \`RangeError\` for large arrays; keep a running maximum.
- **Emoji and astral characters.** Indexing works on UTF-16 code units, so a "palindrome" may be one half of a surrogate pair; convert with \`Array.from(s)\` if real characters matter.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key idea:</strong> <span style="color:#f0e2c8;">Every palindrome has a centre, either a character or a gap, so there are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2n - 1</code> centres to try.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Expand:</strong> <span style="color:#f0e2c8;">From each centre move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> outward while in range and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[left] === s[right]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Bookkeeping:</strong> <span style="color:#f0e2c8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bestStart</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bestLen</code>, replace only on a strictly longer palindrome, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice</code> once at the end.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n^2) time worst case, O(1) extra space; DP is O(n^2) space, Manacher is O(n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Bounds first, because out-of-range reads are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.floor</code> for any halved index.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are there <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">2n - 1</code> centres?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Odd palindromes centre on one of the n characters; even ones centre on one of the n - 1 gaps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is expanding slow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On one repeated letter: every centre grows to the edge. The verified count for 200 copies of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> is 20,100 comparisons.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you explain Manacher briefly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Insert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> between characters so all palindromes are odd, keep the rightmost palindrome seen, and start each position from its mirror radius. Total work O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if they ask for the longest palindromic subsequence instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is a different DP: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j] = dp[i+1][j-1] + 2</code> if the ends match, else the max of dropping either end. O(n^2) time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this work with emoji?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It compares UTF-16 code units. For real characters, run it on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from(s)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">join</code> the slice at the end.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Palindrome** | reads the same forwards and backwards |
| **Substring** | a contiguous run of characters |
| **Centre** | the middle character or gap of a palindrome; there are 2n - 1 |
| **Expand around centre** | grow two pointers outward while the characters match |
| **DP table** | a 2-D array of subproblem answers, here dp[i][j] |
| **Manacher's algorithm** | O(n) method that reuses mirrored radii |

---
**Conclusion:** The longest palindromic substring is found by trying every centre, all n characters and all n - 1 gaps, and expanding two pointers outward while the characters match. That is O(n^2) time and O(1) extra space, simpler than the O(n^2)-space DP table, and Manacher brings it to O(n) when asked. In JavaScript, put the bounds checks first because out-of-range reads are silently \`undefined\`, floor any halved index, and build DP rows with \`Array.from\` so they are not shared.`,
        examples: [
          { label: `Expand around centre on normal and edge-case strings`, code: `function expand(s, left, right) {
  // Grow outward while both ends match; return the bounds of the palindrome found.
  while (left >= 0 && right < s.length && s[left] === s[right]) {
    left--;
    right++;
  }
  return [left + 1, right - 1]; // the last pair that matched
}

function longestPalindrome(s) {
  // Expand around all 2n - 1 centres; return [start, length].
  let bestStart = 0, bestLen = 0;
  for (let i = 0; i < s.length; i++) {
    for (const [lo, hi] of [expand(s, i, i), expand(s, i, i + 1)]) { // odd centre, even centre
      if (hi - lo + 1 > bestLen) {
        bestStart = lo;
        bestLen = hi - lo + 1;
      }
    }
  }
  return [bestStart, bestLen];
}

function show(s) {
  const [start, length] = longestPalindrome(s);
  return '[' + s + '] => [' + s.slice(start, start + length) + '] start=' + start + ' len=' + length;
}

console.log(show('babad')); // [babad] => [bab] start=0 len=3
console.log(show('cbbd')); // [cbbd] => [bb] start=1 len=2
console.log(show('forgeeksskeegfor')); // [forgeeksskeegfor] => [geeksskeeg] start=3 len=10
console.log(show('abacdfgdcaba')); // [abacdfgdcaba] => [aba] start=0 len=3
console.log(show('aaaa')); // [aaaa] => [aaaa] start=0 len=4
console.log(show('ac')); // [ac] => [a] start=0 len=1
console.log(show('a')); // [a] => [a] start=0 len=1
console.log(show('')); // [] => [] start=0 len=0` },
          { label: `Brute force, DP, expand and Manacher agree, with work counters`, code: `function bruteForce(s) {
  // O(n^3): test every substring; returns [best length, character comparisons].
  let best = 0, comps = 0;
  for (let i = 0; i < s.length; i++) {
    for (let j = i; j < s.length; j++) {
      let lo = i, hi = j, ok = true;
      while (lo < hi) {
        comps++;
        if (s[lo] !== s[hi]) { ok = false; break; }
        lo++;
        hi--;
      }
      if (ok && j - i + 1 > best) best = j - i + 1;
    }
  }
  return [best, comps];
}

function dpTable(s) {
  // O(n^2) time and space: dp[i][j] is true when s[i..j] is a palindrome.
  const n = s.length;
  const dp = Array.from({ length: n }, () => new Array(n).fill(false)); // n separate rows
  let best = 0, cells = 0;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = i; j < n; j++) {
      cells++;
      dp[i][j] = s[i] === s[j] && (j - i < 2 || dp[i + 1][j - 1]);
      if (dp[i][j] && j - i + 1 > best) best = j - i + 1;
    }
  }
  return [best, cells];
}

function expandCentres(s) {
  // O(n^2) time, O(1) space.
  let best = 0, comps = 0;
  for (let c = 0; c < 2 * s.length - 1; c++) {
    let lo = Math.floor(c / 2), hi = Math.floor(c / 2) + (c % 2); // integer division needs Math.floor
    while (lo >= 0 && hi < s.length) {
      comps++;
      if (s[lo] !== s[hi]) break;
      lo--;
      hi++;
    }
    best = Math.max(best, hi - lo - 1);
  }
  return [best, comps];
}

function manacher(s) {
  // O(n): reuse the mirror radius inside the rightmost palindrome seen so far.
  let t = '#';
  for (const ch of s) t += ch + '#'; // 'aba' -> '#a#b#a#', so every palindrome is odd
  const m = t.length;
  const radius = new Array(m).fill(0);
  let centre = 0, right = 0, comps = 0, best = 0;
  for (let i = 0; i < m; i++) {
    if (i < right) radius[i] = Math.min(right - i, radius[2 * centre - i]);
    while (i - radius[i] - 1 >= 0 && i + radius[i] + 1 < m) {
      comps++;
      if (t[i - radius[i] - 1] !== t[i + radius[i] + 1]) break;
      radius[i]++;
    }
    if (i + radius[i] > right) { centre = i; right = i + radius[i]; }
    best = Math.max(best, radius[i]); // no Math.max(...radius): a huge spread can throw
  }
  return [best, comps];
}

function makeText(n, seed) {
  // Deterministic pseudo-random string over 'ab' (same generator in every language).
  let out = '', x = seed;
  for (let k = 0; k < n; k++) {
    x = (x * 48271) % 2147483647;
    out += 'ab'[x % 2];
  }
  return out;
}

const cases = [['babad', 'babad'], ['forgeeksskeegfor', 'forgeeksskeegfor'],
  ['random ab x200', makeText(200, 12345)], ['a x200', 'a'.repeat(200)]];
for (const [name, s] of cases) {
  const [b, bc] = bruteForce(s);
  const [d, dc] = dpTable(s);
  const [e, ec] = expandCentres(s);
  const [m, mc] = manacher(s);
  console.log(name + ': len=' + e + ' agree=' + (b === d && d === e && e === m)
    + ' brute=' + bc + ' dp_cells=' + dc + ' expand=' + ec + ' manacher=' + mc);
}` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given a String, return the longest substring that is a palindrome. For example, babad gives bab or aba, and cbbd gives bb. Please write it in Java, and tell me the time and space cost."

**What a strong answer should cover:**
- Every palindrome has a centre: n character centres and n - 1 gap centres; expand two pointers outward from each while the characters match.
- Track the best start and length and call \`substring\` once at the end; O(n^2) time, O(1) extra space.
- The O(n^3) brute force and the O(n^2)-space DP as alternatives; Manacher as the O(n) follow-up.
- Edge cases: empty string, single character, even-length palindromes, ties.
- Java specifics: \`charAt\` out of range throws \`StringIndexOutOfBoundsException\`, \`substring(begin, end)\` has an exclusive end, \`new boolean[n][n]\` starts all false, and \`StringBuilder\` builds the Manacher string without repeated copies.

**Clarifying questions expected:**
- "Substring or subsequence?"
- "If there is a tie, which palindrome should I return?"

**Code / implementation expected:** Yes — \`static String longestPalindrome(String s)\` in Java using expand-around-centre.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a long strip of paper with letters printed on it, and a small mirror you can stand upright on the strip. Wherever you put the mirror, you can check how far the letters on the left match their reflection on the right: "b a | a b" matches two letters on each side, "r a c e | c a r" fails at once. Every palindrome hidden in the strip has a **middle** where the mirror would stand, either **on** a letter ("ra**c**ecar") or **between** two letters ("ab|ba").

So instead of checking every one of the roughly n^2/2 substrings separately, you can walk the mirror along the strip, and at each spot let the reflection grow outward as long as the letters keep matching. The longest reflection you ever see is the answer.

📌 **Interview term: Palindrome** — a string that reads the same forwards and backwards, such as "level" or "abba". A single character is a palindrome; so, by convention, is the empty string.

📌 **Interview term: Substring** — a **contiguous** run of characters inside a string. "bab" is a substring of "babad"; "bbd" is not (that would be a subsequence).

The question: given a string \`s\`, return its longest substring that is a palindrome. If several have the same maximum length, any one is usually accepted (ask).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Substring (contiguous) or subsequence? | A subsequence version is a different DP problem ("longest palindromic subsequence"). |
| If there is a tie, which one do you want? | "babad" has both "bab" and "aba"; most graders accept either. |
| How long can the string be? | Up to about 1,000 characters, O(n^2) is fine; for 10^5 or more you want Manacher. |
| Case-sensitive, and only letters? | "Aba" is not a palindrome unless you normalise case. |
| Return the string or its position? | Returning (start, length) avoids building strings until the end. |

## 3. The Core Idea: Expand Around Every Centre

📌 **Interview term: Centre** — the middle of a palindrome. Odd-length palindromes have a character as their centre; even-length palindromes have the **gap** between two characters as their centre. A string of length n has n character centres and n - 1 gap centres: **2n - 1** centres in total.

📌 **Interview term: Expand around centre** — start two pointers at a centre (\`lo = hi = i\` for odd, \`lo = i, hi = i + 1\` for even) and move them outward while \`s[lo] == s[hi]\` and both are in range. When they stop, the palindrome is \`s[lo + 1 .. hi - 1]\`, of length \`hi - lo - 1\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Odd centre at index 1 of babad grows to bab, even centre between indices 1 and 2 of cbbd grows to bb">
  <rect class="d-box" x="40" y="40" width="54" height="50" rx="6"/><text class="d-text" x="67" y="70" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="110" y="40" width="54" height="50" rx="6"/><text class="d-text" x="137" y="70" text-anchor="middle">a</text>
  <rect class="d-box" x="180" y="40" width="54" height="50" rx="6"/><text class="d-text" x="207" y="70" text-anchor="middle">b</text>
  <rect class="d-box-muted" x="250" y="40" width="54" height="50" rx="6"/><text class="d-text" x="277" y="70" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="320" y="40" width="54" height="50" rx="6"/><text class="d-text" x="347" y="70" text-anchor="middle">d</text>
  <path class="d-edge-accent" d="M 40 100 L 40 112 L 234 112 L 234 100" fill="none"/>
  <text class="d-sub" x="137" y="134" text-anchor="middle">bab, length 3</text>
  <rect class="d-box-accent" x="430" y="40" width="180" height="64" rx="10"/>
  <text class="d-text" x="520" y="68" text-anchor="middle">odd centre</text>
  <text class="d-sub" x="520" y="90" text-anchor="middle">on index 1</text>
  <rect class="d-box-muted" x="40" y="180" width="54" height="50" rx="6"/><text class="d-text" x="67" y="210" text-anchor="middle">c</text>
  <rect class="d-box-accent" x="110" y="180" width="54" height="50" rx="6"/><text class="d-text" x="137" y="210" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="180" y="180" width="54" height="50" rx="6"/><text class="d-text" x="207" y="210" text-anchor="middle">b</text>
  <rect class="d-box-muted" x="250" y="180" width="54" height="50" rx="6"/><text class="d-text" x="277" y="210" text-anchor="middle">d</text>
  <path class="d-edge-accent" d="M 110 240 L 110 252 L 234 252 L 234 240" fill="none"/>
  <text class="d-sub" x="172" y="274" text-anchor="middle">bb, length 2</text>
  <rect class="d-box-accent" x="430" y="180" width="180" height="64" rx="10"/>
  <text class="d-text" x="520" y="208" text-anchor="middle">even centre</text>
  <text class="d-sub" x="520" y="230" text-anchor="middle">between 1 and 2</text>
</svg>

In "babad", the centre on index 1 grows one step (b = b) to "bab" and then stops at the left edge. In "cbbd", the gap centre between indices 1 and 2 starts with b = b, grows to "bb", and stops because c differs from d. Forgetting the gap centres is the most common bug: "cbbd" would then return "c" instead of "bb".

### Why it is correct

Every palindrome has exactly one centre, and expanding from that centre finds the **longest** palindrome around it (if a bigger palindrome shares the centre, every smaller one inside it matches too). Trying all 2n - 1 centres therefore sees the longest palindrome of the whole string.

### Brute force and DP, for comparison

- **Brute force:** check every substring with two pointers: O(n^2) substrings times O(n) per check = O(n^3).
- **Dynamic programming:** \`dp[i][j]\` says whether \`s[i..j]\` is a palindrome. It is O(n^2) time **and** O(n^2) memory, and it is the version to know if the interviewer is testing [dynamic programming](/interview-question/what-is-dynamic-programming).

📌 **Interview term: DP table** — a 2-D array that stores the answer to each subproblem so it is computed once; here, one boolean per (i, j) pair.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="DP recurrence, dp of i and j is true when the end characters match and the inner range i plus 1 to j minus 1 is a palindrome">
  <defs>
    <marker id="lps2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="220" height="64" rx="10"/>
  <text class="d-text" x="140" y="58" text-anchor="middle">ends match</text>
  <text class="d-sub" x="140" y="80" text-anchor="middle">s[i] equals s[j]</text>
  <rect class="d-box" x="30" y="126" width="220" height="64" rx="10"/>
  <text class="d-text" x="140" y="154" text-anchor="middle">inside is a palindrome</text>
  <text class="d-sub" x="140" y="176" text-anchor="middle">dp[i+1][j-1], or j - i below 2</text>
  <path class="d-edge" d="M 254 62 L 386 100" marker-end="url(#lps2-arrow)"/>
  <path class="d-edge" d="M 254 158 L 386 120" marker-end="url(#lps2-arrow)"/>
  <rect class="d-box-accent" x="390" y="76" width="220" height="68" rx="10"/>
  <text class="d-text" x="500" y="104" text-anchor="middle">dp[i][j] is true</text>
  <text class="d-sub" x="500" y="126" text-anchor="middle">both conditions hold</text>
</svg>

The table must be filled so that \`dp[i + 1][j - 1]\` is ready before \`dp[i][j]\`: loop \`i\` from n - 1 down to 0 and \`j\` from i up to n - 1. Ranges of length 1 or 2 (\`j - i < 2\`) only need the end characters to match.

### Manacher, the O(n) follow-up

📌 **Interview term: Manacher's algorithm** — an O(n) method that inserts a separator between characters (so every palindrome becomes odd-length) and reuses the radius of the mirror position inside the rightmost palindrome found so far, so each character is expanded past only a constant number of times overall.

You rarely have to code it in an interview, but you should name it and explain the mirror idea. Example 2 includes it and shows the difference: on 200 copies of "a", expanding around centres does 20,100 comparisons, while Manacher does 399.

The two-pointer check itself is the same as in [the valid palindrome question](/interview-question/how-do-you-check-if-a-string-is-a-valid-palindrome); here the pointers move **outward** from the middle instead of inward from the ends.

## 4. Expand Around Centre in Java

~~~java
static int expand(String s, int left, int right) {
    while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) {
        left--;
        right++;
    }
    return right - left - 1;                 // length of the palindrome found
}

static String longestPalindrome(String s) {
    int bestStart = 0, bestLen = 0;
    for (int i = 0; i < s.length(); i++) {
        int odd = expand(s, i, i);           // centre on character i
        int even = expand(s, i, i + 1);      // centre on the gap after i
        if (odd > bestLen) { bestLen = odd; bestStart = i - (odd - 1) / 2; }
        if (even > bestLen) { bestLen = even; bestStart = i - (even - 1) / 2; }
    }
    return s.substring(bestStart, bestStart + bestLen);
}
~~~

**Why each line is there:**

- \`expand\` returns a **length**, so no array or object is allocated per call. The start is recovered with \`i - (len - 1) / 2\`, which works for both odd and even lengths because Java \`int\` division truncates (for even \`len\`, \`(len - 1) / 2\` equals \`len / 2 - 1\`).
- The bounds tests come before \`charAt\`, which would otherwise throw \`StringIndexOutOfBoundsException\` at \`-1\`.
- \`substring(begin, end)\` has an **exclusive** end, so the end is \`bestStart + bestLen\`; it is called once, after the loop.

**The DP version in Java.** \`boolean[][] dp = new boolean[n][n];\` allocates n separate rows, all \`false\` by default; no aliasing trap like the one in Python or JavaScript. It is still n^2 booleans: 1,000,000 for n = 1000.

**Building the Manacher string.** Example 2 uses a \`StringBuilder\` to make \`#a#b#a#\`; concatenating with \`+=\` in a loop would create a new \`String\` on every step.

## 5. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — expand around centre on normal and edge-case strings** prints:

~~~text
[babad] => [bab] start=0 len=3
[cbbd] => [bb] start=1 len=2
[forgeeksskeegfor] => [geeksskeeg] start=3 len=10
[abacdfgdcaba] => [aba] start=0 len=3
[aaaa] => [aaaa] start=0 len=4
[ac] => [a] start=0 len=1
[a] => [a] start=0 len=1
[] => [] start=0 len=0
~~~

**Example 2 — brute force, DP, expand and Manacher agree, with work counters** prints:

~~~text
babad: len=3 agree=true brute=10 dp_cells=15 expand=13 manacher=13
forgeeksskeegfor: len=10 agree=true brute=135 dp_cells=136 expand=52 manacher=51
random ab x200: len=15 agree=true brute=39271 dp_cells=20100 expand=978 manacher=790
a x200: len=200 agree=true brute=671650 dp_cells=20100 expand=20100 manacher=399
~~~

**Reading the output:** "babad" returns "bab" (start 0) rather than "aba": both have length 3 and the code keeps the first one found, because it only replaces the best on a strictly longer palindrome. "cbbd" returns the even palindrome "bb". "ac" returns "a", and the empty string returns an empty result with length 0. In Example 2, \`agree=true\` on every line: all four methods find the same length. The counters show the growth: brute force does 671,650 comparisons on 200 copies of "a", the DP fills exactly n(n+1)/2 = 20,100 cells, expanding does 20,100 comparisons on that worst case but only 978 on random text, and Manacher stays near 2n.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n^3) | O(1) | n(n+1)/2 substrings, O(n) check each |
| DP table | O(n^2) | O(n^2) | one cell per (i, j) pair, O(1) each |
| Expand around centre | O(n^2) worst, often much less | O(1) | 2n - 1 centres, each expansion at most O(n) |
| Manacher | O(n) | O(n) | the radius array; total expansion is linear |

The worst case for expanding is a string of one repeated letter, where every centre grows to the edge. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Empty string:** return "" (length 0).
- **One character:** the character itself.
- **No repeated neighbours** ("ac", "abcd"): the answer is a single character, the first one with strict \`>\`.
- **Even palindromes** ("cbbd", "abba"): only the gap centres find them.
- **The whole string is a palindrome** ("aaaa"): return it all.
- **Ties** ("babad"): either "bab" or "aba"; state which one your code returns.

## Common Pitfalls

- **Only odd centres.** Without the even expansion, "cbbd" returns "c" instead of "bb".
- **Wrong start formula.** Recovering the start from a length is easy to get off by one; test it on both "babad" (odd) and "cbbd" (even), as Example 1 does.
- **\`substring\` end index.** It is exclusive: \`substring(start, start + len)\`, not \`start + len - 1\`.
- **Calling \`substring\` in the loop.** Each call creates a new \`String\`; track indices and call it once.
- **String concatenation in a loop.** For the Manacher transform or any builder, use \`StringBuilder\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key idea:</strong> <span style="color:#f0e2c8;">Every palindrome has a centre, either a character or a gap, so there are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2n - 1</code> centres to try.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Expand:</strong> <span style="color:#f0e2c8;">From each centre move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> outward while in range and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">charAt(left) == charAt(right)</code>; return the length <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right - left - 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Bookkeeping:</strong> <span style="color:#f0e2c8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bestStart</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bestLen</code>, replace only on a strictly longer palindrome, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">substring</code> once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n^2) time worst case, O(1) extra space; DP needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[n][n]</code>; Manacher is O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Bounds before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">charAt</code>, exclusive end in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">substring</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StringBuilder</code> for any string you build in a loop.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are there <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">2n - 1</code> centres?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Odd palindromes centre on one of the n characters; even ones centre on one of the n - 1 gaps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the start index back from the length?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start = i - (len - 1) / 2</code> with integer division; it works for both the odd and the even expansion from index i.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you explain Manacher briefly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Insert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> between characters so all palindromes are odd, keep the rightmost palindrome seen, start each position from its mirror radius. O(n) total.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if they ask for the longest palindromic subsequence instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is a different DP: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j] = dp[i+1][j-1] + 2</code> if the ends match, else the max of dropping either end. O(n^2) time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">charAt</code> in a loop slow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it is an O(1) array read. Converting with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toCharArray()</code> first costs an O(n) copy and only helps marginally.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Palindrome** | reads the same forwards and backwards |
| **Substring** | a contiguous run of characters |
| **Centre** | the middle character or gap of a palindrome; there are 2n - 1 |
| **Expand around centre** | grow two pointers outward while the characters match |
| **DP table** | a 2-D array of subproblem answers, here dp[i][j] |
| **Manacher's algorithm** | O(n) method that reuses mirrored radii |

---
**Conclusion:** The longest palindromic substring is found by trying every centre, all n characters and all n - 1 gaps, and expanding two pointers outward while the characters match. That is O(n^2) time and O(1) extra space, simpler than the O(n^2)-space DP table, and Manacher brings it to O(n) when asked. In Java, return a length from \`expand\` to avoid allocations, mind the exclusive end of \`substring\`, and use \`StringBuilder\` for anything you build character by character.`,
        examples: [
          { label: `Expand around centre on normal and edge-case strings`, code: `public class Main {
    /** Grow outward while both ends match; return the length of the palindrome found. */
    static int expand(String s, int left, int right) {
        while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) {
            left--;
            right++;
        }
        return right - left - 1;            // (right - 1) - (left + 1) + 1
    }

    /** Expand around all 2n - 1 centres; return {start, length}. */
    static int[] longestPalindrome(String s) {
        int bestStart = 0, bestLen = 0;
        for (int i = 0; i < s.length(); i++) {
            int odd = expand(s, i, i);       // odd centre: one character
            int even = expand(s, i, i + 1);  // even centre: the gap after i
            if (odd > bestLen) { bestLen = odd; bestStart = i - (odd - 1) / 2; }
            if (even > bestLen) { bestLen = even; bestStart = i - (even - 1) / 2; }
        }
        return new int[] {bestStart, bestLen};
    }

    static String show(String s) {
        int[] r = longestPalindrome(s);
        // substring(begin, end): end is exclusive, and it is called once, at the end
        return "[" + s + "] => [" + s.substring(r[0], r[0] + r[1]) + "] start=" + r[0] + " len=" + r[1];
    }

    public static void main(String[] args) {
        System.out.println(show("babad"));            // [babad] => [bab] start=0 len=3
        System.out.println(show("cbbd"));             // [cbbd] => [bb] start=1 len=2
        System.out.println(show("forgeeksskeegfor")); // ... => [geeksskeeg] start=3 len=10
        System.out.println(show("abacdfgdcaba"));     // ... => [aba] start=0 len=3
        System.out.println(show("aaaa"));             // [aaaa] => [aaaa] start=0 len=4
        System.out.println(show("ac"));               // [ac] => [a] start=0 len=1
        System.out.println(show("a"));                // [a] => [a] start=0 len=1
        System.out.println(show(""));                 // [] => [] start=0 len=0
    }
}` },
          { label: `Brute force, DP, expand and Manacher agree, with work counters`, code: `public class Main {
    static long comps;   // comparisons (or DP cells) made by the last call

    /** O(n^3): test every substring. */
    static int bruteForce(String s) {
        comps = 0;
        int best = 0;
        for (int i = 0; i < s.length(); i++) {
            for (int j = i; j < s.length(); j++) {
                int lo = i, hi = j;
                boolean ok = true;
                while (lo < hi) {
                    comps++;
                    if (s.charAt(lo) != s.charAt(hi)) { ok = false; break; }
                    lo++;
                    hi--;
                }
                if (ok && j - i + 1 > best) best = j - i + 1;
            }
        }
        return best;
    }

    /** O(n^2) time and space: dp[i][j] is true when s[i..j] is a palindrome. */
    static int dpTable(String s) {
        comps = 0;
        int n = s.length(), best = 0;
        boolean[][] dp = new boolean[n][n];   // primitive booleans, all false by default
        for (int i = n - 1; i >= 0; i--) {
            for (int j = i; j < n; j++) {
                comps++;
                dp[i][j] = s.charAt(i) == s.charAt(j) && (j - i < 2 || dp[i + 1][j - 1]);
                if (dp[i][j] && j - i + 1 > best) best = j - i + 1;
            }
        }
        return best;
    }

    /** O(n^2) time, O(1) space. */
    static int expandCentres(String s) {
        comps = 0;
        int best = 0;
        for (int c = 0; c < 2 * s.length() - 1; c++) {
            int lo = c / 2, hi = c / 2 + c % 2;   // int division truncates, which is what we want
            while (lo >= 0 && hi < s.length()) {
                comps++;
                if (s.charAt(lo) != s.charAt(hi)) break;
                lo--;
                hi++;
            }
            best = Math.max(best, hi - lo - 1);
        }
        return best;
    }

    /** O(n): reuse the mirror radius inside the rightmost palindrome seen so far. */
    static int manacher(String s) {
        comps = 0;
        StringBuilder sb = new StringBuilder("#");
        for (char ch : s.toCharArray()) sb.append(ch).append('#');   // 'aba' -> '#a#b#a#'
        String t = sb.toString();
        int m = t.length(), centre = 0, right = 0, best = 0;
        int[] radius = new int[m];
        for (int i = 0; i < m; i++) {
            if (i < right) radius[i] = Math.min(right - i, radius[2 * centre - i]);
            while (i - radius[i] - 1 >= 0 && i + radius[i] + 1 < m) {
                comps++;
                if (t.charAt(i - radius[i] - 1) != t.charAt(i + radius[i] + 1)) break;
                radius[i]++;
            }
            if (i + radius[i] > right) { centre = i; right = i + radius[i]; }
            best = Math.max(best, radius[i]);
        }
        return best;
    }

    /** Deterministic pseudo-random string over 'ab' (same generator in every language). */
    static String makeText(int n, long seed) {
        StringBuilder sb = new StringBuilder();
        long x = seed;
        for (int k = 0; k < n; k++) {
            x = (x * 48271) % 2147483647L;
            sb.append("ab".charAt((int) (x % 2)));
        }
        return sb.toString();
    }

    public static void main(String[] args) {
        String[] names = {"babad", "forgeeksskeegfor", "random ab x200", "a x200"};
        String[] inputs = {"babad", "forgeeksskeegfor", makeText(200, 12345), "a".repeat(200)};
        for (int c = 0; c < inputs.length; c++) {
            String s = inputs[c];
            int b = bruteForce(s);    long bc = comps;
            int d = dpTable(s);       long dc = comps;
            int e = expandCentres(s); long ec = comps;
            int m = manacher(s);      long mc = comps;
            System.out.println(names[c] + ": len=" + e + " agree=" + (b == d && d == e && e == m)
                + " brute=" + bc + " dp_cells=" + dc + " expand=" + ec + " manacher=" + mc);
        }
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a std::string, return the longest substring that is a palindrome. For example, babad gives bab or aba, and cbbd gives bb. Please write it in C++, and tell me the time and space cost."

**What a strong answer should cover:**
- Every palindrome has a centre: n character centres and n - 1 gap centres; expand two pointers outward from each while the characters match.
- Track the best start and length and call \`substr\` once at the end; O(n^2) time, O(1) extra space.
- The O(n^3) brute force and the O(n^2)-space DP as alternatives; Manacher as the O(n) follow-up.
- Edge cases: empty string, single character, even-length palindromes, ties.
- C++ specifics: use **signed** indices because \`left\` goes to -1 (a \`size_t\` would wrap), \`substr(pos, count)\` takes a length, \`operator[]\` is unchecked, and \`std::vector<bool>\` is a bit-packed specialisation.

**Clarifying questions expected:**
- "Substring or subsequence?"
- "If there is a tie, which palindrome should I return?"

**Code / implementation expected:** Yes — \`std::string longestPalindrome(const std::string& s)\` in C++ using expand-around-centre with \`int\` indices.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a long strip of paper with letters printed on it, and a small mirror you can stand upright on the strip. Wherever you put the mirror, you can check how far the letters on the left match their reflection on the right: "b a | a b" matches two letters on each side, "r a c e | c a r" fails at once. Every palindrome hidden in the strip has a **middle** where the mirror would stand, either **on** a letter ("ra**c**ecar") or **between** two letters ("ab|ba").

So instead of checking every one of the roughly n^2/2 substrings separately, you can walk the mirror along the strip, and at each spot let the reflection grow outward as long as the letters keep matching. The longest reflection you ever see is the answer.

📌 **Interview term: Palindrome** — a string that reads the same forwards and backwards, such as "level" or "abba". A single character is a palindrome; so, by convention, is the empty string.

📌 **Interview term: Substring** — a **contiguous** run of characters inside a string. "bab" is a substring of "babad"; "bbd" is not (that would be a subsequence).

The question: given a string \`s\`, return its longest substring that is a palindrome. If several have the same maximum length, any one is usually accepted (ask).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Substring (contiguous) or subsequence? | A subsequence version is a different DP problem ("longest palindromic subsequence"). |
| If there is a tie, which one do you want? | "babad" has both "bab" and "aba"; most graders accept either. |
| How long can the string be? | Up to about 1,000 characters, O(n^2) is fine; for 10^5 or more you want Manacher. |
| Case-sensitive, and only letters? | "Aba" is not a palindrome unless you normalise case. |
| Return the string or its position? | Returning (start, length) avoids building strings until the end. |

## 3. The Core Idea: Expand Around Every Centre

📌 **Interview term: Centre** — the middle of a palindrome. Odd-length palindromes have a character as their centre; even-length palindromes have the **gap** between two characters as their centre. A string of length n has n character centres and n - 1 gap centres: **2n - 1** centres in total.

📌 **Interview term: Expand around centre** — start two pointers at a centre (\`lo = hi = i\` for odd, \`lo = i, hi = i + 1\` for even) and move them outward while \`s[lo] == s[hi]\` and both are in range. When they stop, the palindrome is \`s[lo + 1 .. hi - 1]\`, of length \`hi - lo - 1\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Odd centre at index 1 of babad grows to bab, even centre between indices 1 and 2 of cbbd grows to bb">
  <rect class="d-box" x="40" y="40" width="54" height="50" rx="6"/><text class="d-text" x="67" y="70" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="110" y="40" width="54" height="50" rx="6"/><text class="d-text" x="137" y="70" text-anchor="middle">a</text>
  <rect class="d-box" x="180" y="40" width="54" height="50" rx="6"/><text class="d-text" x="207" y="70" text-anchor="middle">b</text>
  <rect class="d-box-muted" x="250" y="40" width="54" height="50" rx="6"/><text class="d-text" x="277" y="70" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="320" y="40" width="54" height="50" rx="6"/><text class="d-text" x="347" y="70" text-anchor="middle">d</text>
  <path class="d-edge-accent" d="M 40 100 L 40 112 L 234 112 L 234 100" fill="none"/>
  <text class="d-sub" x="137" y="134" text-anchor="middle">bab, length 3</text>
  <rect class="d-box-accent" x="430" y="40" width="180" height="64" rx="10"/>
  <text class="d-text" x="520" y="68" text-anchor="middle">odd centre</text>
  <text class="d-sub" x="520" y="90" text-anchor="middle">on index 1</text>
  <rect class="d-box-muted" x="40" y="180" width="54" height="50" rx="6"/><text class="d-text" x="67" y="210" text-anchor="middle">c</text>
  <rect class="d-box-accent" x="110" y="180" width="54" height="50" rx="6"/><text class="d-text" x="137" y="210" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="180" y="180" width="54" height="50" rx="6"/><text class="d-text" x="207" y="210" text-anchor="middle">b</text>
  <rect class="d-box-muted" x="250" y="180" width="54" height="50" rx="6"/><text class="d-text" x="277" y="210" text-anchor="middle">d</text>
  <path class="d-edge-accent" d="M 110 240 L 110 252 L 234 252 L 234 240" fill="none"/>
  <text class="d-sub" x="172" y="274" text-anchor="middle">bb, length 2</text>
  <rect class="d-box-accent" x="430" y="180" width="180" height="64" rx="10"/>
  <text class="d-text" x="520" y="208" text-anchor="middle">even centre</text>
  <text class="d-sub" x="520" y="230" text-anchor="middle">between 1 and 2</text>
</svg>

In "babad", the centre on index 1 grows one step (b = b) to "bab" and then stops at the left edge. In "cbbd", the gap centre between indices 1 and 2 starts with b = b, grows to "bb", and stops because c differs from d. Forgetting the gap centres is the most common bug: "cbbd" would then return "c" instead of "bb".

### Why it is correct

Every palindrome has exactly one centre, and expanding from that centre finds the **longest** palindrome around it (if a bigger palindrome shares the centre, every smaller one inside it matches too). Trying all 2n - 1 centres therefore sees the longest palindrome of the whole string.

### Brute force and DP, for comparison

- **Brute force:** check every substring with two pointers: O(n^2) substrings times O(n) per check = O(n^3).
- **Dynamic programming:** \`dp[i][j]\` says whether \`s[i..j]\` is a palindrome. It is O(n^2) time **and** O(n^2) memory, and it is the version to know if the interviewer is testing [dynamic programming](/interview-question/what-is-dynamic-programming).

📌 **Interview term: DP table** — a 2-D array that stores the answer to each subproblem so it is computed once; here, one boolean per (i, j) pair.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="DP recurrence, dp of i and j is true when the end characters match and the inner range i plus 1 to j minus 1 is a palindrome">
  <defs>
    <marker id="lps2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="220" height="64" rx="10"/>
  <text class="d-text" x="140" y="58" text-anchor="middle">ends match</text>
  <text class="d-sub" x="140" y="80" text-anchor="middle">s[i] equals s[j]</text>
  <rect class="d-box" x="30" y="126" width="220" height="64" rx="10"/>
  <text class="d-text" x="140" y="154" text-anchor="middle">inside is a palindrome</text>
  <text class="d-sub" x="140" y="176" text-anchor="middle">dp[i+1][j-1], or j - i below 2</text>
  <path class="d-edge" d="M 254 62 L 386 100" marker-end="url(#lps2-arrow)"/>
  <path class="d-edge" d="M 254 158 L 386 120" marker-end="url(#lps2-arrow)"/>
  <rect class="d-box-accent" x="390" y="76" width="220" height="68" rx="10"/>
  <text class="d-text" x="500" y="104" text-anchor="middle">dp[i][j] is true</text>
  <text class="d-sub" x="500" y="126" text-anchor="middle">both conditions hold</text>
</svg>

The table must be filled so that \`dp[i + 1][j - 1]\` is ready before \`dp[i][j]\`: loop \`i\` from n - 1 down to 0 and \`j\` from i up to n - 1. Ranges of length 1 or 2 (\`j - i < 2\`) only need the end characters to match.

### Manacher, the O(n) follow-up

📌 **Interview term: Manacher's algorithm** — an O(n) method that inserts a separator between characters (so every palindrome becomes odd-length) and reuses the radius of the mirror position inside the rightmost palindrome found so far, so each character is expanded past only a constant number of times overall.

You rarely have to code it in an interview, but you should name it and explain the mirror idea. Example 2 includes it and shows the difference: on 200 copies of "a", expanding around centres does 20,100 comparisons, while Manacher does 399.

The two-pointer check itself is the same as in [the valid palindrome question](/interview-question/how-do-you-check-if-a-string-is-a-valid-palindrome); here the pointers move **outward** from the middle instead of inward from the ends.

## 4. Expand Around Centre in C++

~~~cpp
// Returns {first index, length} of the longest palindrome around this centre.
std::pair<int, int> expand(const std::string& s, int left, int right) {
    const int n = static_cast<int>(s.size());    // signed, because left reaches -1
    while (left >= 0 && right < n && s[left] == s[right]) {
        --left;
        ++right;
    }
    return {left + 1, right - left - 1};
}

std::string longestPalindrome(const std::string& s) {
    int bestStart = 0, bestLen = 0;
    for (int i = 0; i < static_cast<int>(s.size()); ++i) {
        for (auto [lo, len] : {expand(s, i, i), expand(s, i, i + 1)}) {   // odd, even
            if (len > bestLen) { bestStart = lo; bestLen = len; }
        }
    }
    return s.substr(bestStart, bestLen);          // (position, LENGTH)
}
~~~

**Why each line is there:**

- \`int\` indices on purpose. If \`left\` were \`size_t\`, \`--left\` at 0 would wrap to 18446744073709551615, \`left >= 0\` would always be true, and \`s[left]\` would read far outside the string: undefined behaviour, not an exception.
- \`const int n = static_cast<int>(s.size())\` converts once, so the comparisons are all signed.
- \`for (auto [lo, len] : {a, b})\` iterates over an \`std::initializer_list\` of two pairs with C++17 structured bindings; it reads like the Python version.
- \`s.substr(bestStart, bestLen)\`: the second argument is a **count**, which is exactly the length we tracked.
- Pass and read by \`const std::string&\`, so the input is never copied.

**The DP version in C++.** Example 2 uses \`std::vector<std::vector<char>>\` rather than \`std::vector<bool>\`. \`std::vector<bool>\` is a special space-optimised version that packs bits and returns proxy objects instead of real \`bool&\` references, which is slower to access and surprises generic code; \`char\` cells are simple bytes.

## 5. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — expand around centre on normal and edge-case strings** prints:

~~~text
[babad] => [bab] start=0 len=3
[cbbd] => [bb] start=1 len=2
[forgeeksskeegfor] => [geeksskeeg] start=3 len=10
[abacdfgdcaba] => [aba] start=0 len=3
[aaaa] => [aaaa] start=0 len=4
[ac] => [a] start=0 len=1
[a] => [a] start=0 len=1
[] => [] start=0 len=0
~~~

**Example 2 — brute force, DP, expand and Manacher agree, with work counters** prints:

~~~text
babad: len=3 agree=true brute=10 dp_cells=15 expand=13 manacher=13
forgeeksskeegfor: len=10 agree=true brute=135 dp_cells=136 expand=52 manacher=51
random ab x200: len=15 agree=true brute=39271 dp_cells=20100 expand=978 manacher=790
a x200: len=200 agree=true brute=671650 dp_cells=20100 expand=20100 manacher=399
~~~

**Reading the output:** "babad" returns "bab" (start 0) rather than "aba": both have length 3 and the code keeps the first one found, because it only replaces the best on a strictly longer palindrome. "cbbd" returns the even palindrome "bb". "ac" returns "a", and the empty string returns an empty result with length 0. In Example 2, \`agree=true\` on every line: all four methods find the same length. The counters show the growth: brute force does 671,650 comparisons on 200 copies of "a", the DP fills exactly n(n+1)/2 = 20,100 cells, expanding does 20,100 comparisons on that worst case but only 978 on random text, and Manacher stays near 2n.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n^3) | O(1) | n(n+1)/2 substrings, O(n) check each |
| DP table | O(n^2) | O(n^2) | one cell per (i, j) pair, O(1) each |
| Expand around centre | O(n^2) worst, often much less | O(1) | 2n - 1 centres, each expansion at most O(n) |
| Manacher | O(n) | O(n) | the radius array; total expansion is linear |

The worst case for expanding is a string of one repeated letter, where every centre grows to the edge. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Empty string:** return "" (length 0).
- **One character:** the character itself.
- **No repeated neighbours** ("ac", "abcd"): the answer is a single character, the first one with strict \`>\`.
- **Even palindromes** ("cbbd", "abba"): only the gap centres find them.
- **The whole string is a palindrome** ("aaaa"): return it all.
- **Ties** ("babad"): either "bab" or "aba"; state which one your code returns.

## Common Pitfalls

- **Unsigned indices.** \`size_t left = i; --left;\` wraps at 0 and the loop reads out of bounds; use \`int\`.
- **\`substr(start, end)\`.** The second argument is a length; \`substr(lo, hi)\` returns the wrong slice whenever \`lo > 0\`.
- **Only odd centres.** Without the even expansion, "cbbd" returns "c" instead of "bb".
- **\`std::vector<bool>\` for the DP.** It works, but it is bit-packed with proxy references; \`vector<char>\` or a flat \`vector<unsigned char>\` is the usual choice.
- **Copying in the loop.** Calling \`s.substr\` for every candidate allocates; keep \`(start, length)\` and build the result once.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key idea:</strong> <span style="color:#f0e2c8;">Every palindrome has a centre, either a character or a gap, so there are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2n - 1</code> centres to try.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Expand:</strong> <span style="color:#f0e2c8;">From each centre move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code> outward while in range and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s[left] == s[right]</code>, using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> indices because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left</code> reaches -1.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Bookkeeping:</strong> <span style="color:#f0e2c8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bestStart</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bestLen</code>, replace only on a strictly longer palindrome, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.substr(bestStart, bestLen)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n^2) time worst case, O(1) extra space; DP is O(n^2) space, Manacher is O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">substr</code> takes (position, count), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> is unchecked, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;bool&gt;</code> is bit-packed, so prefer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;char&gt;</code> for the table.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are there <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">2n - 1</code> centres?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Odd palindromes centre on one of the n characters; even ones centre on one of the n - 1 gaps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">size_t</code> for the pointers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The left pointer must be able to reach -1 to stop the loop. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t</code> wraps to a huge value instead, which turns into an out-of-bounds read.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you explain Manacher briefly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Insert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> between characters so all palindromes are odd, keep the rightmost palindrome seen, start each position from its mirror radius. O(n) total.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if they ask for the longest palindromic subsequence instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is a different DP: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j] = dp[i+1][j-1] + 2</code> if the ends match, else the max of dropping either end. O(n^2) time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you return a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::string_view</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::string_view(s).substr(start, len)</code> avoids the allocation, as long as the caller keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code> alive while using the view.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Palindrome** | reads the same forwards and backwards |
| **Substring** | a contiguous run of characters |
| **Centre** | the middle character or gap of a palindrome; there are 2n - 1 |
| **Expand around centre** | grow two pointers outward while the characters match |
| **DP table** | a 2-D array of subproblem answers, here dp[i][j] |
| **Manacher's algorithm** | O(n) method that reuses mirrored radii |

---
**Conclusion:** The longest palindromic substring is found by trying every centre, all n characters and all n - 1 gaps, and expanding two pointers outward while the characters match. That is O(n^2) time and O(1) extra space, simpler than the O(n^2)-space DP table, and Manacher brings it to O(n) when asked. In C++, keep the pointers signed so the left one can reach -1, read \`substr\` as (position, length), and use \`vector<char>\` rather than \`vector<bool>\` if you build the DP table.`,
        examples: [
          { label: `Expand around centre on normal and edge-case strings`, code: `#include <iostream>
#include <string>
#include <utility>

// Grow outward while both ends match; return {first index, length} of the palindrome found.
std::pair<int, int> expand(const std::string& s, int left, int right) {
    const int n = static_cast<int>(s.size());   // signed: left can go to -1 safely
    while (left >= 0 && right < n && s[left] == s[right]) {
        --left;
        ++right;
    }
    return {left + 1, right - left - 1};
}

// Expand around all 2n - 1 centres; return {start, length}.
std::pair<int, int> longestPalindrome(const std::string& s) {
    int bestStart = 0, bestLen = 0;
    for (int i = 0; i < static_cast<int>(s.size()); ++i) {
        for (auto [lo, len] : {expand(s, i, i), expand(s, i, i + 1)}) {   // odd centre, even centre
            if (len > bestLen) { bestStart = lo; bestLen = len; }
        }
    }
    return {bestStart, bestLen};
}

std::string show(const std::string& s) {
    auto [start, length] = longestPalindrome(s);
    // substr(pos, count): the second argument is a LENGTH, not an end index
    return "[" + s + "] => [" + s.substr(start, length) + "] start=" + std::to_string(start) +
           " len=" + std::to_string(length);
}

int main() {
    std::cout << show("babad") << "\\n";            // [babad] => [bab] start=0 len=3
    std::cout << show("cbbd") << "\\n";             // [cbbd] => [bb] start=1 len=2
    std::cout << show("forgeeksskeegfor") << "\\n"; // ... => [geeksskeeg] start=3 len=10
    std::cout << show("abacdfgdcaba") << "\\n";     // ... => [aba] start=0 len=3
    std::cout << show("aaaa") << "\\n";             // [aaaa] => [aaaa] start=0 len=4
    std::cout << show("ac") << "\\n";               // [ac] => [a] start=0 len=1
    std::cout << show("a") << "\\n";                // [a] => [a] start=0 len=1
    std::cout << show("") << "\\n";                 // [] => [] start=0 len=0
    return 0;
}` },
          { label: `Brute force, DP, expand and Manacher agree, with work counters`, code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

using Result = std::pair<int, long long>;   // {best length, comparisons or DP cells}

// O(n^3): test every substring.
Result bruteForce(const std::string& s) {
    const int n = static_cast<int>(s.size());
    int best = 0;
    long long comps = 0;
    for (int i = 0; i < n; ++i) {
        for (int j = i; j < n; ++j) {
            int lo = i, hi = j;
            bool ok = true;
            while (lo < hi) {
                ++comps;
                if (s[lo] != s[hi]) { ok = false; break; }
                ++lo;
                --hi;
            }
            if (ok && j - i + 1 > best) best = j - i + 1;
        }
    }
    return {best, comps};
}

// O(n^2) time and space: dp[i][j] is true when s[i..j] is a palindrome.
Result dpTable(const std::string& s) {
    const int n = static_cast<int>(s.size());
    std::vector<std::vector<char>> dp(n, std::vector<char>(n, 0));   // char, not vector<bool>
    int best = 0;
    long long cells = 0;
    for (int i = n - 1; i >= 0; --i) {
        for (int j = i; j < n; ++j) {
            ++cells;
            dp[i][j] = s[i] == s[j] && (j - i < 2 || dp[i + 1][j - 1]);
            if (dp[i][j] && j - i + 1 > best) best = j - i + 1;
        }
    }
    return {best, cells};
}

// O(n^2) time, O(1) space.
Result expandCentres(const std::string& s) {
    const int n = static_cast<int>(s.size());
    int best = 0;
    long long comps = 0;
    for (int c = 0; c < 2 * n - 1; ++c) {
        int lo = c / 2, hi = c / 2 + c % 2;
        while (lo >= 0 && hi < n) {
            ++comps;
            if (s[lo] != s[hi]) break;
            --lo;
            ++hi;
        }
        best = std::max(best, hi - lo - 1);
    }
    return {best, comps};
}

// O(n): reuse the mirror radius inside the rightmost palindrome seen so far.
Result manacher(const std::string& s) {
    std::string t = "#";
    for (char ch : s) { t += ch; t += '#'; }   // "aba" -> "#a#b#a#"
    const int m = static_cast<int>(t.size());
    std::vector<int> radius(m, 0);
    int centre = 0, right = 0, best = 0;
    long long comps = 0;
    for (int i = 0; i < m; ++i) {
        if (i < right) radius[i] = std::min(right - i, radius[2 * centre - i]);
        while (i - radius[i] - 1 >= 0 && i + radius[i] + 1 < m) {
            ++comps;
            if (t[i - radius[i] - 1] != t[i + radius[i] + 1]) break;
            ++radius[i];
        }
        if (i + radius[i] > right) { centre = i; right = i + radius[i]; }
        best = std::max(best, radius[i]);
    }
    return {best, comps};
}

// Deterministic pseudo-random string over "ab" (same generator in every language).
std::string makeText(int n, long long seed) {
    std::string out;
    long long x = seed;
    for (int k = 0; k < n; ++k) {
        x = (x * 48271) % 2147483647LL;
        out += "ab"[x % 2];
    }
    return out;
}

int main() {
    std::vector<std::pair<std::string, std::string>> cases = {
        {"babad", "babad"}, {"forgeeksskeegfor", "forgeeksskeegfor"},
        {"random ab x200", makeText(200, 12345)}, {"a x200", std::string(200, 'a')}};
    for (const auto& [name, s] : cases) {
        auto [b, bc] = bruteForce(s);
        auto [d, dc] = dpTable(s);
        auto [e, ec] = expandCentres(s);
        auto [m, mc] = manacher(s);
        std::cout << std::boolalpha << name << ": len=" << e << " agree=" << (b == d && d == e && e == m)
                  << " brute=" << bc << " dp_cells=" << dc << " expand=" << ec << " manacher=" << mc << "\\n";
    }
    return 0;
}` },
        ],
      },
    },
  },
  {
    title: `How does the KMP string-matching algorithm work?`,
    difficulty: "hard",
    seoDescription: `KMP string matching in Python, JavaScript, Java and C++: the LPS (failure) table, why the text pointer never moves back, O(n + m) time, verified counts.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Explain how the Knuth-Morris-Pratt algorithm finds a pattern in a text, then implement it in Python: build the failure table and return every index where the pattern starts. Why is it linear?"

**What a strong answer should cover:**
- The naive search restarts the pattern after a mismatch and is O(n * m) on repetitive input.
- The LPS (failure) array: \`lps[i]\` is the longest proper prefix of \`p[0..i]\` that is also a suffix; built in O(m) with the \`k = lps[k - 1]\` fallback.
- The search keeps the text index moving forward only; on a mismatch \`j = lps[j - 1]\`; after a full match \`j = lps[m - 1]\` to catch overlaps.
- O(n + m) time by amortised analysis (j rises at most n times, so it falls at most n times); O(m) space.
- Python specifics: in production use \`str.find\` / \`in\` (much faster than a pure-Python loop); \`find\` returns -1 while \`index\` raises \`ValueError\`; strings are immutable sequences of code points, so \`t[i]\` is one character.

**Code / implementation expected:** Yes — \`build_lps(p)\` and \`kmp_search(t, p)\` in Python, returning all match positions.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Hard
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are reading a long necklace of beads, looking for the colour pattern red-blue-red-blue-green. You have matched red, blue, red, blue... and the next bead is red, not green. The naive reaction is to slide your finger back to the second bead you looked at and start all over again. But wait: the last two beads you just matched were red, blue, which is exactly how the pattern **starts**. You do not need to look at them again. You can keep your finger where it is and pretend you have already matched "red, blue" of a new attempt.

That "I already know how much of a new attempt is matched" trick is the **Knuth-Morris-Pratt (KMP)** algorithm. It precomputes, for the pattern alone, how much of the pattern can be reused after a mismatch, and then scans the text **once, never moving backwards**.

📌 **Interview term: String matching** — finding where a pattern string \`p\` (length m) occurs inside a text \`t\` (length n).

📌 **Interview term: KMP (Knuth-Morris-Pratt)** — a string-matching algorithm that runs in O(n + m) time by precomputing a failure table for the pattern so the text index never goes backwards.

## 2. The Problem With the Naive Search

The naive search tries every start position \`i\` in the text and compares the pattern character by character. On a mismatch it moves to \`i + 1\` and starts comparing from the **first** pattern character again, throwing away everything it just learned. On normal English text that is fast, because mismatches happen almost immediately. On repetitive text it is O(n * m): searching for "aaaaaaaaab" in a thousand a's followed by a b re-reads the same a's over and over. Example 2 counts 990,200 comparisons for a 10,001-character text and a 100-character pattern of that shape.

## 3. The Failure Table (LPS)

📌 **Interview term: Proper prefix / proper suffix** — a prefix or suffix that is shorter than the whole string. For "abab", the proper prefixes are "", "a", "ab", "aba" and the proper suffixes are "", "b", "ab", "bab".

📌 **Interview term: Border** — a string that is both a proper prefix and a proper suffix. "ab" is a border of "abab".

📌 **Interview term: LPS array (failure function, prefix function)** — \`lps[i]\` is the length of the longest border of \`p[0..i]\`. Different books call it the failure function or the prefix function; it is the same array.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="LPS table for the pattern ababc, values 0 0 1 2 0, at index 3 the prefix ab equals the suffix ab so the value is 2">
  <text class="d-sub" x="160" y="28" text-anchor="middle">0</text>
  <text class="d-sub" x="240" y="28" text-anchor="middle">1</text>
  <text class="d-sub" x="320" y="28" text-anchor="middle">2</text>
  <text class="d-sub" x="400" y="28" text-anchor="middle">3</text>
  <text class="d-sub" x="480" y="28" text-anchor="middle">4</text>
  <text class="d-sub" x="70" y="72" text-anchor="middle">pattern</text>
  <rect class="d-box" x="130" y="44" width="60" height="44" rx="5"/><text class="d-text" x="160" y="72" text-anchor="middle">a</text>
  <rect class="d-box" x="210" y="44" width="60" height="44" rx="5"/><text class="d-text" x="240" y="72" text-anchor="middle">b</text>
  <rect class="d-box" x="290" y="44" width="60" height="44" rx="5"/><text class="d-text" x="320" y="72" text-anchor="middle">a</text>
  <rect class="d-box-accent" x="370" y="44" width="60" height="44" rx="5"/><text class="d-text" x="400" y="72" text-anchor="middle">b</text>
  <rect class="d-box" x="450" y="44" width="60" height="44" rx="5"/><text class="d-text" x="480" y="72" text-anchor="middle">c</text>
  <text class="d-sub" x="70" y="142" text-anchor="middle">lps</text>
  <rect class="d-box-muted" x="130" y="114" width="60" height="44" rx="5"/><text class="d-text" x="160" y="142" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="210" y="114" width="60" height="44" rx="5"/><text class="d-text" x="240" y="142" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="290" y="114" width="60" height="44" rx="5"/><text class="d-text" x="320" y="142" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="370" y="114" width="60" height="44" rx="5"/><text class="d-text" x="400" y="142" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="450" y="114" width="60" height="44" rx="5"/><text class="d-text" x="480" y="142" text-anchor="middle">0</text>
  <rect class="d-box" x="130" y="196" width="380" height="60" rx="10"/>
  <text class="d-text" x="320" y="222" text-anchor="middle">abab: prefix ab equals suffix ab</text>
  <text class="d-sub" x="320" y="244" text-anchor="middle">so lps[3] = 2</text>
</svg>

For "ababc": "a" has no border (0), "ab" has none (0), "aba" has "a" (1), "abab" has "ab" (2), and "ababc" has none (0). The highlighted cell is the one that matters in the next diagram.

**Building it in O(m).** Keep \`k\`, the length of the border of the previous prefix. For each new character \`p[i]\`:

1. If \`p[i] == p[k]\`, the border grows by one: \`k += 1\`.
2. Otherwise fall back to the next shorter border, \`k = lps[k - 1]\`, and try again, until a match or \`k == 0\`.
3. Store \`lps[i] = k\`.

The fallback step is the clever part: the next shorter border of a border is itself in the table, so you never recompute anything. \`k\` goes up by at most 1 per character and every fallback lowers it, so the total work is O(m).

## 4. The Search: The Text Pointer Never Moves Back

Scan the text with \`i\` and keep \`j\`, the number of pattern characters currently matched.

- If \`t[i] == p[j]\`, advance both (\`j += 1\`).
- On a mismatch with \`j > 0\`, do **not** move \`i\`. Set \`j = lps[j - 1]\`: the longest border of what you had matched is already matched again, so the pattern slides forward by \`j - lps[j - 1]\` positions in one step.
- On a mismatch with \`j == 0\`, just move on to the next \`i\`.
- When \`j == m\`, a match ends at \`i\`: it starts at \`i - m + 1\`. Set \`j = lps[m - 1]\` to keep looking for overlapping matches.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Text abababcab, the first try at 0 matches abab then fails on c versus a at index 4, KMP keeps the text index at 4 and continues with the pattern shifted to start at 2, ab already matched">
  <text class="d-sub" x="154" y="38" text-anchor="middle">0</text>
  <text class="d-sub" x="212" y="38" text-anchor="middle">1</text>
  <text class="d-sub" x="270" y="38" text-anchor="middle">2</text>
  <text class="d-sub" x="328" y="38" text-anchor="middle">3</text>
  <text class="d-sub" x="386" y="38" text-anchor="middle">4</text>
  <text class="d-sub" x="444" y="38" text-anchor="middle">5</text>
  <text class="d-sub" x="502" y="38" text-anchor="middle">6</text>
  <text class="d-sub" x="560" y="38" text-anchor="middle">7</text>
  <text class="d-sub" x="618" y="38" text-anchor="middle">8</text>
  <text class="d-sub" x="60" y="80" text-anchor="middle">text</text>
  <rect class="d-box" x="130" y="50" width="48" height="48" rx="5"/><text class="d-text" x="154" y="80" text-anchor="middle">a</text>
  <rect class="d-box" x="188" y="50" width="48" height="48" rx="5"/><text class="d-text" x="212" y="80" text-anchor="middle">b</text>
  <rect class="d-box" x="246" y="50" width="48" height="48" rx="5"/><text class="d-text" x="270" y="80" text-anchor="middle">a</text>
  <rect class="d-box" x="304" y="50" width="48" height="48" rx="5"/><text class="d-text" x="328" y="80" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="362" y="50" width="48" height="48" rx="5"/><text class="d-text" x="386" y="80" text-anchor="middle">a</text>
  <rect class="d-box" x="420" y="50" width="48" height="48" rx="5"/><text class="d-text" x="444" y="80" text-anchor="middle">b</text>
  <rect class="d-box" x="478" y="50" width="48" height="48" rx="5"/><text class="d-text" x="502" y="80" text-anchor="middle">c</text>
  <rect class="d-box" x="536" y="50" width="48" height="48" rx="5"/><text class="d-text" x="560" y="80" text-anchor="middle">a</text>
  <rect class="d-box" x="594" y="50" width="48" height="48" rx="5"/><text class="d-text" x="618" y="80" text-anchor="middle">b</text>
  <text class="d-sub" x="60" y="170" text-anchor="middle">try at 0</text>
  <rect class="d-box" x="130" y="140" width="48" height="48" rx="5"/><text class="d-text" x="154" y="170" text-anchor="middle">a</text>
  <rect class="d-box" x="188" y="140" width="48" height="48" rx="5"/><text class="d-text" x="212" y="170" text-anchor="middle">b</text>
  <rect class="d-box" x="246" y="140" width="48" height="48" rx="5"/><text class="d-text" x="270" y="170" text-anchor="middle">a</text>
  <rect class="d-box" x="304" y="140" width="48" height="48" rx="5"/><text class="d-text" x="328" y="170" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="362" y="140" width="48" height="48" rx="5"/><text class="d-text" x="386" y="170" text-anchor="middle">c</text>
  <text class="d-sub" x="60" y="260" text-anchor="middle">try at 2</text>
  <rect class="d-box-muted" x="246" y="230" width="48" height="48" rx="5"/><text class="d-text" x="270" y="260" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="304" y="230" width="48" height="48" rx="5"/><text class="d-text" x="328" y="260" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="362" y="230" width="48" height="48" rx="5"/><text class="d-text" x="386" y="260" text-anchor="middle">a</text>
  <rect class="d-box" x="420" y="230" width="48" height="48" rx="5"/><text class="d-text" x="444" y="260" text-anchor="middle">b</text>
  <rect class="d-box" x="478" y="230" width="48" height="48" rx="5"/><text class="d-text" x="502" y="260" text-anchor="middle">c</text>
</svg>

In the text "abababcab", the first attempt matches "abab" and then sees "a" at index 4 where the pattern wants "c". \`lps[3] = 2\`, so KMP keeps \`i = 4\` and continues as if "ab" (text indices 2 and 3, grey) is already matched by a new attempt starting at index 2. That attempt then matches "abc" and finds the pattern at index 2, without re-reading a single text character.

📌 **Interview term: Amortised analysis** — counting total work over the whole run rather than per step. In the search, \`j\` rises by at most 1 per text character and every fallback lowers it, so fallbacks total at most n: at most about 2n comparisons. Example 2 shows KMP staying under its \`kmp_limit_2n\` on every input.

**Total cost:** O(m) to build the table plus O(n) to scan: **O(n + m)** time and O(m) extra space.

### Related algorithms worth naming

- **Z-algorithm:** computes, for every position, the length of the longest substring starting there that matches a prefix; run on \`p + "$" + t\` it also matches in O(n + m).
- **Rabin-Karp:** compares rolling hashes of windows; O(n + m) expected, good for many patterns at once, but needs a check on hash collisions.
- **Boyer-Moore:** compares from the right end of the pattern and can skip many characters at a time; often fastest on natural text.

The LPS idea also solves interview problems that are not "search": the shortest string to add to make a palindrome, the smallest repeating unit of a string (\`m - lps[m - 1]\`), and counting overlapping occurrences.

## 5. KMP in Python

~~~python
def build_lps(p):
    lps = [0] * len(p)
    k = 0                                   # length of the current border
    for i in range(1, len(p)):
        while k > 0 and p[i] != p[k]:
            k = lps[k - 1]                  # fall back to the next shorter border
        if p[i] == p[k]:
            k += 1
        lps[i] = k
    return lps


def kmp_search(text, p):
    if p == "":
        return [0]                          # same convention as "abc".find("") == 0
    lps, matches, j = build_lps(p), [], 0
    for i, ch in enumerate(text):
        while j > 0 and ch != p[j]:
            j = lps[j - 1]                  # slide the pattern; i stays where it is
        if ch == p[j]:
            j += 1
        if j == len(p):
            matches.append(i - len(p) + 1)
            j = lps[j - 1]                  # allow overlapping matches
    return matches
~~~

**Why each line is there:**

- The table loop starts at \`i = 1\`, because \`lps[0]\` is always 0 (a single character has no proper border).
- \`while\`, not \`if\`, for the fallback: one mismatch may need several fallbacks (for example from border 5 to 2 to 0).
- \`for i, ch in enumerate(text)\` makes it obvious that the text index only moves forward.
- \`j = lps[j - 1]\` after a match, rather than \`j = 0\`, is what finds the overlapping matches in "aaaaa".

**Use the built-in in real code.** Python already has substring search: \`p in text\`, \`text.find(p)\` (returns -1 when absent) and \`text.index(p)\` (raises \`ValueError\`). A test run with Python 3.13 searched a 1,000,001-character text for a 100-character worst-case pattern: the pure-Python KMP above took about 0.13 s, while \`text.find\` took about 0.004 s and returned the same index. The interpreter loop is the bottleneck, not the algorithm. Write KMP when the interviewer asks for it, or when you need the LPS table itself (repetition, borders, streaming input).

## 6. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — build the LPS table and find every match, overlaps included** prints:

~~~text
lps(ababc) = [0, 0, 1, 2, 0]
lps(aabaaab) = [0, 1, 0, 1, 2, 2, 3]
lps(abcabcabd) = [0, 0, 0, 1, 2, 3, 4, 5, 0]
search(abababcab, ababc) = [2]
search(aaaaa, aa) = [0, 1, 2, 3]
search(abcabcabc, abcabc) = [0, 3]
search(hello, ll) = [2]
search(abc, d) = []
search(ab, abc) = []
search(abc, empty) = [0]
~~~

**Example 2 — naive search vs KMP, counting character comparisons** prints:

~~~text
english: n=35 m=3 matches=3 agree=true naive=44 kmp=39 kmp_limit_2n=70
a^1000 b, a^9 b: n=1001 m=10 matches=1 agree=true naive=9920 kmp=1992 kmp_limit_2n=2002
a^10000 b, a^99 b: n=10001 m=100 matches=1 agree=true naive=990200 kmp=19902 kmp_limit_2n=20002
ab^2000, abab: n=4000 m=4 matches=1999 agree=true naive=9994 kmp=4000 kmp_limit_2n=8000
~~~

**Reading the output:** \`lps(abcabcabd)\` climbs to 5 because "abcab" is both a prefix and a suffix of "abcabcab", then drops to 0 at "d". \`search(aaaaa, aa)\` reports the overlapping matches 0, 1, 2 and 3, which works because the search resets \`j = lps[m - 1]\` after a match instead of 0. A pattern longer than the text finds nothing, and the empty pattern returns \`[0]\` by the same convention the built-in search functions use. In Example 2, both methods agree on the number of matches; the naive search does 990,200 comparisons on the 10,001-character repetitive text while KMP does 19,902, below its limit of 2n = 20,002. On ordinary English text the two are close (44 versus 39).

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Naive search | O(n * m) worst, close to O(n) on typical text | O(1) | restarts the pattern after every mismatch |
| Build LPS | O(m) | O(m) | \`k\` rises at most m times, so fallbacks are at most m |
| KMP search | O(n) | O(1) besides the table | \`i\` only moves forward; fallbacks are paid for by earlier advances |
| KMP total | O(n + m) | O(m) | table plus scan |

## 8. Edge Cases

- **Empty pattern:** decide a convention; the built-in searches return 0, and the examples return \`[0]\`.
- **Pattern longer than the text:** no matches; the loop simply never reaches \`j == m\`.
- **Overlapping matches** ("aa" in "aaaaa"): after a match set \`j = lps[m - 1]\`, not 0, or you miss them.
- **Pattern of one repeated character:** the LPS is 0, 1, 2, ..., m - 1, and every match overlaps the previous one.
- **Empty text:** no matches (unless the pattern is also empty).

## Common Pitfalls

- **Starting the table loop at 0.** \`lps[0]\` must be 0; starting at \`i = 0\` compares \`p[0]\` with itself and sets \`lps[0] = 1\`, which breaks every fallback.
- **\`if\` instead of \`while\` for the fallback.** A single fallback is not always enough; the table and the search both need the loop.
- **Resetting \`j = 0\` after a match.** You miss overlapping matches: "aa" in "aaaaa" would give \`[0, 2]\` instead of \`[0, 1, 2, 3]\`.
- **Off-by-one on the start index.** A match that ends at \`i\` starts at \`i - m + 1\`.
- **Shipping pure-Python KMP for speed.** \`str.find\` is far faster in CPython; KMP is about the guarantee and the table, not raw speed in Python.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">The naive search restarts the pattern after each mismatch, O(n * m) on input like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aaaa...ab</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The table:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lps[i]</code> is the longest proper prefix of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p[:i+1]</code> that is also a suffix; built in O(m) with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k = lps[k - 1]</code> fallbacks.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The search:</strong> <span style="color:#f0e2c8;">Never move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> back; on a mismatch set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j = lps[j - 1]</code>; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j == m</code>, record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - m + 1</code> and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j = lps[m - 1]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n + m) time because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> can only fall as often as it rose; O(m) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python note:</strong> <span style="color:#f0e2c8;">In production <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text.find(p)</code> is much faster than a pure-Python loop; KMP matters for the guarantee and the table.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the search O(n) if there is a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while</code> inside the loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> increases by at most 1 per text character and each fallback decreases it, so all fallbacks together are at most n. The verified count stays under 2n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What exactly does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lps[j - 1]</code> mean when you fall back?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You had matched <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p[:j]</code>. Its longest border is already lined up with the text, so you continue as if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lps[j - 1]</code> characters are matched.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find overlapping matches?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After a full match set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j = lps[m - 1]</code> instead of 0. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aa</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aaaaa</code> that gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 1, 2, 3]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the smallest repeating unit of a string with the LPS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Let <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">L = m - lps[m - 1]</code>. If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m % L == 0</code>, the string is the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">L</code> characters repeated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m / L</code> times; otherwise it has no repeating unit shorter than itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you pick Rabin-Karp instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you search for many patterns of the same length at once, or need a rolling hash anyway. It is O(n + m) expected but must handle collisions.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **String matching** | finding where a pattern occurs in a text |
| **KMP (Knuth-Morris-Pratt)** | O(n + m) matching with a precomputed failure table |
| **Proper prefix / proper suffix** | a prefix or suffix shorter than the whole string |
| **Border** | a string that is both a proper prefix and a proper suffix |
| **LPS array (failure function, prefix function)** | lps[i] = length of the longest border of p[0..i] |
| **Amortised analysis** | bounding the total work over the run rather than per step |

---
**Conclusion:** KMP turns string matching into a single forward scan of the text by precomputing, for every prefix of the pattern, its longest border. On a mismatch it falls back to that border instead of restarting, so the text pointer never moves back and the total work is O(n + m), which the verified counts confirm on inputs where the naive search does about n * m comparisons. In Python, start the table loop at 1, use \`while\` for fallbacks, reset to \`lps[m - 1]\` after a match, and remember that the built-in \`find\` is the practical choice when you only need a position.`,
        examples: [
          { label: `Build the LPS table and find every match, overlaps included`, code: `def build_lps(p):
    """lps[i] = length of the longest proper prefix of p[0..i] that is also a suffix of it."""
    lps = [0] * len(p)
    k = 0                                   # length of the current matched prefix
    for i in range(1, len(p)):
        while k > 0 and p[i] != p[k]:
            k = lps[k - 1]                  # fall back to the next shorter border
        if p[i] == p[k]:
            k += 1
        lps[i] = k
    return lps


def kmp_search(text, p):
    """All start indices of p in text, overlaps included. The text index never moves back."""
    if p == "":
        return [0]                          # same convention as str.find("") == 0
    lps, matches, j = build_lps(p), [], 0   # j = characters of p matched so far
    for i, ch in enumerate(text):
        while j > 0 and ch != p[j]:
            j = lps[j - 1]                  # slide the pattern, keep i where it is
        if ch == p[j]:
            j += 1
        if j == len(p):
            matches.append(i - len(p) + 1)
            j = lps[j - 1]                  # keep going to find overlapping matches
    return matches


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


print("lps(ababc) = " + fmt(build_lps("ababc")))  # lps(ababc) = [0, 0, 1, 2, 0]
print("lps(aabaaab) = " + fmt(build_lps("aabaaab")))  # lps(aabaaab) = [0, 1, 0, 1, 2, 2, 3]
print("lps(abcabcabd) = " + fmt(build_lps("abcabcabd")))  # lps(abcabcabd) = [0, 0, 0, 1, 2, 3, 4, 5, 0]
print("search(abababcab, ababc) = " + fmt(kmp_search("abababcab", "ababc")))  # search(abababcab, ababc) = [2]
print("search(aaaaa, aa) = " + fmt(kmp_search("aaaaa", "aa")))  # search(aaaaa, aa) = [0, 1, 2, 3]
print("search(abcabcabc, abcabc) = " + fmt(kmp_search("abcabcabc", "abcabc")))  # search(abcabcabc, abcabc) = [0, 3]
print("search(hello, ll) = " + fmt(kmp_search("hello", "ll")))  # search(hello, ll) = [2]
print("search(abc, d) = " + fmt(kmp_search("abc", "d")))  # search(abc, d) = []
print("search(ab, abc) = " + fmt(kmp_search("ab", "abc")))  # search(ab, abc) = []
print("search(abc, empty) = " + fmt(kmp_search("abc", "")))  # search(abc, empty) = [0]` },
          { label: `Naive search vs KMP, counting character comparisons`, code: `def build_lps(p):
    lps, k = [0] * len(p), 0
    for i in range(1, len(p)):
        while k > 0 and p[i] != p[k]:
            k = lps[k - 1]
        if p[i] == p[k]:
            k += 1
        lps[i] = k
    return lps


def naive_search(text, p):
    """Try every start; on a mismatch, restart one position later. Returns (matches, comparisons)."""
    count, comps = 0, 0
    for i in range(len(text) - len(p) + 1):
        j = 0
        while j < len(p):
            comps += 1
            if text[i + j] != p[j]:
                break
            j += 1
        if j == len(p):
            count += 1
    return count, comps


def kmp_search(text, p):
    """Same answer, but the text index only moves forward. Returns (matches, comparisons)."""
    lps, count, comps, j = build_lps(p), 0, 0, 0
    for ch in text:
        while True:
            comps += 1
            if ch == p[j]:
                j += 1
                break
            if j == 0:
                break
            j = lps[j - 1]
        if j == len(p):
            count += 1
            j = lps[j - 1]
    return count, comps


cases = [
    ("english", "the cat sat on the mat with the hat", "the"),
    ("a^1000 b, a^9 b", "a" * 1000 + "b", "a" * 9 + "b"),
    ("a^10000 b, a^99 b", "a" * 10000 + "b", "a" * 99 + "b"),
    ("ab^2000, abab", "ab" * 2000, "abab"),
]
for name, text, p in cases:
    nm, nc = naive_search(text, p)
    km, kc = kmp_search(text, p)
    print(name + ": n=" + str(len(text)) + " m=" + str(len(p)) + " matches=" + str(km)
          + " agree=" + str(nm == km).lower() + " naive=" + str(nc) + " kmp=" + str(kc)
          + " kmp_limit_2n=" + str(2 * len(text)))` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Explain how the Knuth-Morris-Pratt algorithm finds a pattern in a text, then implement it in JavaScript: build the failure table and return every index where the pattern starts. Why is it linear?"

**What a strong answer should cover:**
- The naive search restarts the pattern after a mismatch and is O(n * m) on repetitive input.
- The LPS (failure) array: \`lps[i]\` is the longest proper prefix of \`p[0..i]\` that is also a suffix; built in O(m) with the \`k = lps[k - 1]\` fallback.
- The search keeps the text index moving forward only; on a mismatch \`j = lps[j - 1]\`; after a full match \`j = lps[m - 1]\` to catch overlaps.
- O(n + m) time by amortised analysis; O(m) space.
- JavaScript specifics: production code uses \`indexOf\` / \`includes\`; finding all overlapping matches with \`indexOf\` means restarting at \`pos + 1\`, not \`pos + m\`; strings are UTF-16 code units, so \`t[i]\` may be half of an emoji.

**Code / implementation expected:** Yes — \`buildLps(p)\` and \`kmpSearch(t, p)\` in JavaScript, returning all match positions.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Hard
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are reading a long necklace of beads, looking for the colour pattern red-blue-red-blue-green. You have matched red, blue, red, blue... and the next bead is red, not green. The naive reaction is to slide your finger back to the second bead you looked at and start all over again. But wait: the last two beads you just matched were red, blue, which is exactly how the pattern **starts**. You do not need to look at them again. You can keep your finger where it is and pretend you have already matched "red, blue" of a new attempt.

That "I already know how much of a new attempt is matched" trick is the **Knuth-Morris-Pratt (KMP)** algorithm. It precomputes, for the pattern alone, how much of the pattern can be reused after a mismatch, and then scans the text **once, never moving backwards**.

📌 **Interview term: String matching** — finding where a pattern string \`p\` (length m) occurs inside a text \`t\` (length n).

📌 **Interview term: KMP (Knuth-Morris-Pratt)** — a string-matching algorithm that runs in O(n + m) time by precomputing a failure table for the pattern so the text index never goes backwards.

## 2. The Problem With the Naive Search

The naive search tries every start position \`i\` in the text and compares the pattern character by character. On a mismatch it moves to \`i + 1\` and starts comparing from the **first** pattern character again, throwing away everything it just learned. On normal English text that is fast, because mismatches happen almost immediately. On repetitive text it is O(n * m): searching for "aaaaaaaaab" in a thousand a's followed by a b re-reads the same a's over and over. Example 2 counts 990,200 comparisons for a 10,001-character text and a 100-character pattern of that shape.

## 3. The Failure Table (LPS)

📌 **Interview term: Proper prefix / proper suffix** — a prefix or suffix that is shorter than the whole string. For "abab", the proper prefixes are "", "a", "ab", "aba" and the proper suffixes are "", "b", "ab", "bab".

📌 **Interview term: Border** — a string that is both a proper prefix and a proper suffix. "ab" is a border of "abab".

📌 **Interview term: LPS array (failure function, prefix function)** — \`lps[i]\` is the length of the longest border of \`p[0..i]\`. Different books call it the failure function or the prefix function; it is the same array.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="LPS table for the pattern ababc, values 0 0 1 2 0, at index 3 the prefix ab equals the suffix ab so the value is 2">
  <text class="d-sub" x="160" y="28" text-anchor="middle">0</text>
  <text class="d-sub" x="240" y="28" text-anchor="middle">1</text>
  <text class="d-sub" x="320" y="28" text-anchor="middle">2</text>
  <text class="d-sub" x="400" y="28" text-anchor="middle">3</text>
  <text class="d-sub" x="480" y="28" text-anchor="middle">4</text>
  <text class="d-sub" x="70" y="72" text-anchor="middle">pattern</text>
  <rect class="d-box" x="130" y="44" width="60" height="44" rx="5"/><text class="d-text" x="160" y="72" text-anchor="middle">a</text>
  <rect class="d-box" x="210" y="44" width="60" height="44" rx="5"/><text class="d-text" x="240" y="72" text-anchor="middle">b</text>
  <rect class="d-box" x="290" y="44" width="60" height="44" rx="5"/><text class="d-text" x="320" y="72" text-anchor="middle">a</text>
  <rect class="d-box-accent" x="370" y="44" width="60" height="44" rx="5"/><text class="d-text" x="400" y="72" text-anchor="middle">b</text>
  <rect class="d-box" x="450" y="44" width="60" height="44" rx="5"/><text class="d-text" x="480" y="72" text-anchor="middle">c</text>
  <text class="d-sub" x="70" y="142" text-anchor="middle">lps</text>
  <rect class="d-box-muted" x="130" y="114" width="60" height="44" rx="5"/><text class="d-text" x="160" y="142" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="210" y="114" width="60" height="44" rx="5"/><text class="d-text" x="240" y="142" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="290" y="114" width="60" height="44" rx="5"/><text class="d-text" x="320" y="142" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="370" y="114" width="60" height="44" rx="5"/><text class="d-text" x="400" y="142" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="450" y="114" width="60" height="44" rx="5"/><text class="d-text" x="480" y="142" text-anchor="middle">0</text>
  <rect class="d-box" x="130" y="196" width="380" height="60" rx="10"/>
  <text class="d-text" x="320" y="222" text-anchor="middle">abab: prefix ab equals suffix ab</text>
  <text class="d-sub" x="320" y="244" text-anchor="middle">so lps[3] = 2</text>
</svg>

For "ababc": "a" has no border (0), "ab" has none (0), "aba" has "a" (1), "abab" has "ab" (2), and "ababc" has none (0). The highlighted cell is the one that matters in the next diagram.

**Building it in O(m).** Keep \`k\`, the length of the border of the previous prefix. For each new character \`p[i]\`:

1. If \`p[i] == p[k]\`, the border grows by one: \`k += 1\`.
2. Otherwise fall back to the next shorter border, \`k = lps[k - 1]\`, and try again, until a match or \`k == 0\`.
3. Store \`lps[i] = k\`.

The fallback step is the clever part: the next shorter border of a border is itself in the table, so you never recompute anything. \`k\` goes up by at most 1 per character and every fallback lowers it, so the total work is O(m).

## 4. The Search: The Text Pointer Never Moves Back

Scan the text with \`i\` and keep \`j\`, the number of pattern characters currently matched.

- If \`t[i] == p[j]\`, advance both (\`j += 1\`).
- On a mismatch with \`j > 0\`, do **not** move \`i\`. Set \`j = lps[j - 1]\`: the longest border of what you had matched is already matched again, so the pattern slides forward by \`j - lps[j - 1]\` positions in one step.
- On a mismatch with \`j == 0\`, just move on to the next \`i\`.
- When \`j == m\`, a match ends at \`i\`: it starts at \`i - m + 1\`. Set \`j = lps[m - 1]\` to keep looking for overlapping matches.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Text abababcab, the first try at 0 matches abab then fails on c versus a at index 4, KMP keeps the text index at 4 and continues with the pattern shifted to start at 2, ab already matched">
  <text class="d-sub" x="154" y="38" text-anchor="middle">0</text>
  <text class="d-sub" x="212" y="38" text-anchor="middle">1</text>
  <text class="d-sub" x="270" y="38" text-anchor="middle">2</text>
  <text class="d-sub" x="328" y="38" text-anchor="middle">3</text>
  <text class="d-sub" x="386" y="38" text-anchor="middle">4</text>
  <text class="d-sub" x="444" y="38" text-anchor="middle">5</text>
  <text class="d-sub" x="502" y="38" text-anchor="middle">6</text>
  <text class="d-sub" x="560" y="38" text-anchor="middle">7</text>
  <text class="d-sub" x="618" y="38" text-anchor="middle">8</text>
  <text class="d-sub" x="60" y="80" text-anchor="middle">text</text>
  <rect class="d-box" x="130" y="50" width="48" height="48" rx="5"/><text class="d-text" x="154" y="80" text-anchor="middle">a</text>
  <rect class="d-box" x="188" y="50" width="48" height="48" rx="5"/><text class="d-text" x="212" y="80" text-anchor="middle">b</text>
  <rect class="d-box" x="246" y="50" width="48" height="48" rx="5"/><text class="d-text" x="270" y="80" text-anchor="middle">a</text>
  <rect class="d-box" x="304" y="50" width="48" height="48" rx="5"/><text class="d-text" x="328" y="80" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="362" y="50" width="48" height="48" rx="5"/><text class="d-text" x="386" y="80" text-anchor="middle">a</text>
  <rect class="d-box" x="420" y="50" width="48" height="48" rx="5"/><text class="d-text" x="444" y="80" text-anchor="middle">b</text>
  <rect class="d-box" x="478" y="50" width="48" height="48" rx="5"/><text class="d-text" x="502" y="80" text-anchor="middle">c</text>
  <rect class="d-box" x="536" y="50" width="48" height="48" rx="5"/><text class="d-text" x="560" y="80" text-anchor="middle">a</text>
  <rect class="d-box" x="594" y="50" width="48" height="48" rx="5"/><text class="d-text" x="618" y="80" text-anchor="middle">b</text>
  <text class="d-sub" x="60" y="170" text-anchor="middle">try at 0</text>
  <rect class="d-box" x="130" y="140" width="48" height="48" rx="5"/><text class="d-text" x="154" y="170" text-anchor="middle">a</text>
  <rect class="d-box" x="188" y="140" width="48" height="48" rx="5"/><text class="d-text" x="212" y="170" text-anchor="middle">b</text>
  <rect class="d-box" x="246" y="140" width="48" height="48" rx="5"/><text class="d-text" x="270" y="170" text-anchor="middle">a</text>
  <rect class="d-box" x="304" y="140" width="48" height="48" rx="5"/><text class="d-text" x="328" y="170" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="362" y="140" width="48" height="48" rx="5"/><text class="d-text" x="386" y="170" text-anchor="middle">c</text>
  <text class="d-sub" x="60" y="260" text-anchor="middle">try at 2</text>
  <rect class="d-box-muted" x="246" y="230" width="48" height="48" rx="5"/><text class="d-text" x="270" y="260" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="304" y="230" width="48" height="48" rx="5"/><text class="d-text" x="328" y="260" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="362" y="230" width="48" height="48" rx="5"/><text class="d-text" x="386" y="260" text-anchor="middle">a</text>
  <rect class="d-box" x="420" y="230" width="48" height="48" rx="5"/><text class="d-text" x="444" y="260" text-anchor="middle">b</text>
  <rect class="d-box" x="478" y="230" width="48" height="48" rx="5"/><text class="d-text" x="502" y="260" text-anchor="middle">c</text>
</svg>

In the text "abababcab", the first attempt matches "abab" and then sees "a" at index 4 where the pattern wants "c". \`lps[3] = 2\`, so KMP keeps \`i = 4\` and continues as if "ab" (text indices 2 and 3, grey) is already matched by a new attempt starting at index 2. That attempt then matches "abc" and finds the pattern at index 2, without re-reading a single text character.

📌 **Interview term: Amortised analysis** — counting total work over the whole run rather than per step. In the search, \`j\` rises by at most 1 per text character and every fallback lowers it, so fallbacks total at most n: at most about 2n comparisons. Example 2 shows KMP staying under its \`kmp_limit_2n\` on every input.

**Total cost:** O(m) to build the table plus O(n) to scan: **O(n + m)** time and O(m) extra space.

### Related algorithms worth naming

- **Z-algorithm:** computes, for every position, the length of the longest substring starting there that matches a prefix; run on \`p + "$" + t\` it also matches in O(n + m).
- **Rabin-Karp:** compares rolling hashes of windows; O(n + m) expected, good for many patterns at once, but needs a check on hash collisions.
- **Boyer-Moore:** compares from the right end of the pattern and can skip many characters at a time; often fastest on natural text.

The LPS idea also solves interview problems that are not "search": the shortest string to add to make a palindrome, the smallest repeating unit of a string (\`m - lps[m - 1]\`), and counting overlapping occurrences.

## 5. KMP in JavaScript

~~~javascript
function buildLps(p) {
  const lps = new Array(p.length).fill(0);
  let k = 0; // length of the current border
  for (let i = 1; i < p.length; i++) {
    while (k > 0 && p[i] !== p[k]) k = lps[k - 1]; // fall back to the next shorter border
    if (p[i] === p[k]) k++;
    lps[i] = k;
  }
  return lps;
}

function kmpSearch(text, p) {
  if (p === '') return [0]; // same convention as 'abc'.indexOf('') === 0
  const lps = buildLps(p);
  const matches = [];
  let j = 0;
  for (let i = 0; i < text.length; i++) {
    while (j > 0 && text[i] !== p[j]) j = lps[j - 1]; // slide the pattern; i stays
    if (text[i] === p[j]) j++;
    if (j === p.length) {
      matches.push(i - p.length + 1);
      j = lps[j - 1]; // allow overlapping matches
    }
  }
  return matches;
}
~~~

**Why each line is there:**

- \`new Array(p.length).fill(0)\` gives a dense array of zeros; \`lps[0]\` stays 0 because the loop starts at 1.
- \`while\`, not \`if\`, for the fallback: one mismatch may need several fallbacks.
- \`===\` compares single-character strings by value; there is no separate \`char\` type in JavaScript, \`text[i]\` is a one-code-unit string.
- \`j = lps[j - 1]\` after a match keeps the overlapping matches.

**Use the built-in in real code.** \`text.indexOf(p)\` returns the first index or -1, \`text.includes(p)\` returns a boolean, and \`text.indexOf(p, from)\` searches from a position. For **all** matches with overlaps, loop \`pos = text.indexOf(p, pos + 1)\`; stepping by \`pos + p.length\` would skip overlaps. Write KMP when it is asked for, or when you need the LPS table itself.

**Unicode.** JavaScript strings are sequences of UTF-16 code units, so an emoji is two "characters" to this code. KMP still finds correct code-unit matches; if you want positions counted in real characters, run it on \`Array.from(text)\` and \`Array.from(p)\`, since the algorithm only needs indexing and equality.

## 6. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — build the LPS table and find every match, overlaps included** prints:

~~~text
lps(ababc) = [0, 0, 1, 2, 0]
lps(aabaaab) = [0, 1, 0, 1, 2, 2, 3]
lps(abcabcabd) = [0, 0, 0, 1, 2, 3, 4, 5, 0]
search(abababcab, ababc) = [2]
search(aaaaa, aa) = [0, 1, 2, 3]
search(abcabcabc, abcabc) = [0, 3]
search(hello, ll) = [2]
search(abc, d) = []
search(ab, abc) = []
search(abc, empty) = [0]
~~~

**Example 2 — naive search vs KMP, counting character comparisons** prints:

~~~text
english: n=35 m=3 matches=3 agree=true naive=44 kmp=39 kmp_limit_2n=70
a^1000 b, a^9 b: n=1001 m=10 matches=1 agree=true naive=9920 kmp=1992 kmp_limit_2n=2002
a^10000 b, a^99 b: n=10001 m=100 matches=1 agree=true naive=990200 kmp=19902 kmp_limit_2n=20002
ab^2000, abab: n=4000 m=4 matches=1999 agree=true naive=9994 kmp=4000 kmp_limit_2n=8000
~~~

**Reading the output:** \`lps(abcabcabd)\` climbs to 5 because "abcab" is both a prefix and a suffix of "abcabcab", then drops to 0 at "d". \`search(aaaaa, aa)\` reports the overlapping matches 0, 1, 2 and 3, which works because the search resets \`j = lps[m - 1]\` after a match instead of 0. A pattern longer than the text finds nothing, and the empty pattern returns \`[0]\` by the same convention the built-in search functions use. In Example 2, both methods agree on the number of matches; the naive search does 990,200 comparisons on the 10,001-character repetitive text while KMP does 19,902, below its limit of 2n = 20,002. On ordinary English text the two are close (44 versus 39).

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Naive search | O(n * m) worst, close to O(n) on typical text | O(1) | restarts the pattern after every mismatch |
| Build LPS | O(m) | O(m) | \`k\` rises at most m times, so fallbacks are at most m |
| KMP search | O(n) | O(1) besides the table | \`i\` only moves forward; fallbacks are paid for by earlier advances |
| KMP total | O(n + m) | O(m) | table plus scan |

## 8. Edge Cases

- **Empty pattern:** decide a convention; the built-in searches return 0, and the examples return \`[0]\`.
- **Pattern longer than the text:** no matches; the loop simply never reaches \`j == m\`.
- **Overlapping matches** ("aa" in "aaaaa"): after a match set \`j = lps[m - 1]\`, not 0, or you miss them.
- **Pattern of one repeated character:** the LPS is 0, 1, 2, ..., m - 1, and every match overlaps the previous one.
- **Empty text:** no matches (unless the pattern is also empty).

## Common Pitfalls

- **Starting the table loop at 0.** \`lps[0]\` must stay 0; comparing \`p[0]\` with itself breaks the table.
- **\`if\` instead of \`while\` for the fallback.** One fallback is not always enough.
- **Resetting \`j = 0\` after a match.** You lose overlapping matches: "aa" in "aaaaa" would give \`[0, 2]\`.
- **Out-of-range reads are silent.** \`p[p.length]\` is \`undefined\`, never an error, so a missing \`j === p.length\` check makes the loop compare against \`undefined\` instead of crashing; test the overlap and edge cases.
- **Stepping \`indexOf\` by the pattern length.** For all occurrences with overlaps, restart at \`pos + 1\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">The naive search restarts the pattern after each mismatch, O(n * m) on input like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aaaa...ab</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The table:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lps[i]</code> is the longest proper prefix of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p.slice(0, i + 1)</code> that is also a suffix; O(m) with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k = lps[k - 1]</code> fallbacks.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The search:</strong> <span style="color:#f0e2c8;">Never move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> back; on a mismatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j = lps[j - 1]</code>; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j === m</code>, record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - m + 1</code> and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j = lps[m - 1]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n + m) time because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> can only fall as often as it rose; O(m) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript note:</strong> <span style="color:#f0e2c8;">In production use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">indexOf</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">includes</code>; KMP is for the linear guarantee and for the LPS table.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the search O(n) with a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while</code> inside the loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> rises by at most 1 per character and every fallback lowers it, so all fallbacks total at most n. The verified counts stay under 2n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lps[j - 1]</code> mean on a mismatch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You had matched the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> pattern characters; their longest border is already aligned with the text, so continue with that many matched.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get all matches with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">indexOf</code> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pos = text.indexOf(p, pos + 1)</code> until it returns -1. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pos + 1</code> so overlapping matches are kept.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the smallest repeating unit of a string with the LPS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Let <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">L = m - lps[m - 1]</code>. If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m % L == 0</code>, the string is the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">L</code> characters repeated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m / L</code> times; otherwise it has no repeating unit shorter than itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle emoji?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run the same code on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from(text)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from(p)</code>; positions are then in code points instead of UTF-16 units.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **String matching** | finding where a pattern occurs in a text |
| **KMP (Knuth-Morris-Pratt)** | O(n + m) matching with a precomputed failure table |
| **Proper prefix / proper suffix** | a prefix or suffix shorter than the whole string |
| **Border** | a string that is both a proper prefix and a proper suffix |
| **LPS array (failure function, prefix function)** | lps[i] = length of the longest border of p[0..i] |
| **Amortised analysis** | bounding the total work over the run rather than per step |

---
**Conclusion:** KMP turns string matching into a single forward scan of the text by precomputing, for every prefix of the pattern, its longest border. On a mismatch it falls back to that border instead of restarting, so the text pointer never moves back and the total work is O(n + m), which the verified counts confirm. In JavaScript, start the table at index 1, use \`while\` for fallbacks, reset to \`lps[m - 1]\` after a match, and reach for \`indexOf\` in production code when you only need positions.`,
        examples: [
          { label: `Build the LPS table and find every match, overlaps included`, code: `function buildLps(p) {
  // lps[i] = length of the longest proper prefix of p[0..i] that is also a suffix of it.
  const lps = new Array(p.length).fill(0);
  let k = 0; // length of the current matched prefix
  for (let i = 1; i < p.length; i++) {
    while (k > 0 && p[i] !== p[k]) k = lps[k - 1]; // fall back to the next shorter border
    if (p[i] === p[k]) k++;
    lps[i] = k;
  }
  return lps;
}

function kmpSearch(text, p) {
  // All start indices of p in text, overlaps included. The text index never moves back.
  if (p === '') return [0]; // same convention as 'abc'.indexOf('') === 0
  const lps = buildLps(p);
  const matches = [];
  let j = 0; // characters of p matched so far
  for (let i = 0; i < text.length; i++) {
    while (j > 0 && text[i] !== p[j]) j = lps[j - 1]; // slide the pattern, keep i where it is
    if (text[i] === p[j]) j++;
    if (j === p.length) {
      matches.push(i - p.length + 1);
      j = lps[j - 1]; // keep going to find overlapping matches
    }
  }
  return matches;
}

const fmt = (xs) => '[' + xs.join(', ') + ']';

console.log('lps(ababc) = ' + fmt(buildLps('ababc'))); // lps(ababc) = [0, 0, 1, 2, 0]
console.log('lps(aabaaab) = ' + fmt(buildLps('aabaaab'))); // lps(aabaaab) = [0, 1, 0, 1, 2, 2, 3]
console.log('lps(abcabcabd) = ' + fmt(buildLps('abcabcabd'))); // lps(abcabcabd) = [0, 0, 0, 1, 2, 3, 4, 5, 0]
console.log('search(abababcab, ababc) = ' + fmt(kmpSearch('abababcab', 'ababc'))); // search(abababcab, ababc) = [2]
console.log('search(aaaaa, aa) = ' + fmt(kmpSearch('aaaaa', 'aa'))); // search(aaaaa, aa) = [0, 1, 2, 3]
console.log('search(abcabcabc, abcabc) = ' + fmt(kmpSearch('abcabcabc', 'abcabc'))); // search(abcabcabc, abcabc) = [0, 3]
console.log('search(hello, ll) = ' + fmt(kmpSearch('hello', 'll'))); // search(hello, ll) = [2]
console.log('search(abc, d) = ' + fmt(kmpSearch('abc', 'd'))); // search(abc, d) = []
console.log('search(ab, abc) = ' + fmt(kmpSearch('ab', 'abc'))); // search(ab, abc) = []
console.log('search(abc, empty) = ' + fmt(kmpSearch('abc', ''))); // search(abc, empty) = [0]` },
          { label: `Naive search vs KMP, counting character comparisons`, code: `function buildLps(p) {
  const lps = new Array(p.length).fill(0);
  let k = 0;
  for (let i = 1; i < p.length; i++) {
    while (k > 0 && p[i] !== p[k]) k = lps[k - 1];
    if (p[i] === p[k]) k++;
    lps[i] = k;
  }
  return lps;
}

function naiveSearch(text, p) {
  // Try every start; on a mismatch, restart one position later. Returns [matches, comparisons].
  let count = 0, comps = 0;
  for (let i = 0; i + p.length <= text.length; i++) {
    let j = 0;
    while (j < p.length) {
      comps++;
      if (text[i + j] !== p[j]) break;
      j++;
    }
    if (j === p.length) count++;
  }
  return [count, comps];
}

function kmpSearch(text, p) {
  // Same answer, but the text index only moves forward. Returns [matches, comparisons].
  const lps = buildLps(p);
  let count = 0, comps = 0, j = 0;
  for (let i = 0; i < text.length; i++) {
    while (true) {
      comps++;
      if (text[i] === p[j]) { j++; break; }
      if (j === 0) break;
      j = lps[j - 1];
    }
    if (j === p.length) {
      count++;
      j = lps[j - 1];
    }
  }
  return [count, comps];
}

const cases = [
  ['english', 'the cat sat on the mat with the hat', 'the'],
  ['a^1000 b, a^9 b', 'a'.repeat(1000) + 'b', 'a'.repeat(9) + 'b'],
  ['a^10000 b, a^99 b', 'a'.repeat(10000) + 'b', 'a'.repeat(99) + 'b'],
  ['ab^2000, abab', 'ab'.repeat(2000), 'abab'],
];
for (const [name, text, p] of cases) {
  const [nm, nc] = naiveSearch(text, p);
  const [km, kc] = kmpSearch(text, p);
  console.log(name + ': n=' + text.length + ' m=' + p.length + ' matches=' + km
    + ' agree=' + (nm === km) + ' naive=' + nc + ' kmp=' + kc + ' kmp_limit_2n=' + 2 * text.length);
}` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Explain how the Knuth-Morris-Pratt algorithm finds a pattern in a text, then implement it in Java: build the failure table and return every index where the pattern starts. Why is it linear?"

**What a strong answer should cover:**
- The naive search restarts the pattern after a mismatch and is O(n * m) on repetitive input.
- The LPS (failure) array: \`lps[i]\` is the longest proper prefix of \`p[0..i]\` that is also a suffix; built in O(m) with the \`k = lps[k - 1]\` fallback.
- The search keeps the text index moving forward only; on a mismatch \`j = lps[j - 1]\`; after a full match \`j = lps[m - 1]\` to catch overlaps.
- O(n + m) time by amortised analysis; O(m) space.
- Java specifics: \`int[]\` for the table (no boxing), \`charAt\` comparisons with \`==\` are value comparisons, \`List<Integer>\` for results, and \`String.indexOf(str, from)\` for production searches.

**Code / implementation expected:** Yes — \`static int[] buildLps(String p)\` and \`static List<Integer> kmpSearch(String text, String p)\` in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Hard
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are reading a long necklace of beads, looking for the colour pattern red-blue-red-blue-green. You have matched red, blue, red, blue... and the next bead is red, not green. The naive reaction is to slide your finger back to the second bead you looked at and start all over again. But wait: the last two beads you just matched were red, blue, which is exactly how the pattern **starts**. You do not need to look at them again. You can keep your finger where it is and pretend you have already matched "red, blue" of a new attempt.

That "I already know how much of a new attempt is matched" trick is the **Knuth-Morris-Pratt (KMP)** algorithm. It precomputes, for the pattern alone, how much of the pattern can be reused after a mismatch, and then scans the text **once, never moving backwards**.

📌 **Interview term: String matching** — finding where a pattern string \`p\` (length m) occurs inside a text \`t\` (length n).

📌 **Interview term: KMP (Knuth-Morris-Pratt)** — a string-matching algorithm that runs in O(n + m) time by precomputing a failure table for the pattern so the text index never goes backwards.

## 2. The Problem With the Naive Search

The naive search tries every start position \`i\` in the text and compares the pattern character by character. On a mismatch it moves to \`i + 1\` and starts comparing from the **first** pattern character again, throwing away everything it just learned. On normal English text that is fast, because mismatches happen almost immediately. On repetitive text it is O(n * m): searching for "aaaaaaaaab" in a thousand a's followed by a b re-reads the same a's over and over. Example 2 counts 990,200 comparisons for a 10,001-character text and a 100-character pattern of that shape.

## 3. The Failure Table (LPS)

📌 **Interview term: Proper prefix / proper suffix** — a prefix or suffix that is shorter than the whole string. For "abab", the proper prefixes are "", "a", "ab", "aba" and the proper suffixes are "", "b", "ab", "bab".

📌 **Interview term: Border** — a string that is both a proper prefix and a proper suffix. "ab" is a border of "abab".

📌 **Interview term: LPS array (failure function, prefix function)** — \`lps[i]\` is the length of the longest border of \`p[0..i]\`. Different books call it the failure function or the prefix function; it is the same array.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="LPS table for the pattern ababc, values 0 0 1 2 0, at index 3 the prefix ab equals the suffix ab so the value is 2">
  <text class="d-sub" x="160" y="28" text-anchor="middle">0</text>
  <text class="d-sub" x="240" y="28" text-anchor="middle">1</text>
  <text class="d-sub" x="320" y="28" text-anchor="middle">2</text>
  <text class="d-sub" x="400" y="28" text-anchor="middle">3</text>
  <text class="d-sub" x="480" y="28" text-anchor="middle">4</text>
  <text class="d-sub" x="70" y="72" text-anchor="middle">pattern</text>
  <rect class="d-box" x="130" y="44" width="60" height="44" rx="5"/><text class="d-text" x="160" y="72" text-anchor="middle">a</text>
  <rect class="d-box" x="210" y="44" width="60" height="44" rx="5"/><text class="d-text" x="240" y="72" text-anchor="middle">b</text>
  <rect class="d-box" x="290" y="44" width="60" height="44" rx="5"/><text class="d-text" x="320" y="72" text-anchor="middle">a</text>
  <rect class="d-box-accent" x="370" y="44" width="60" height="44" rx="5"/><text class="d-text" x="400" y="72" text-anchor="middle">b</text>
  <rect class="d-box" x="450" y="44" width="60" height="44" rx="5"/><text class="d-text" x="480" y="72" text-anchor="middle">c</text>
  <text class="d-sub" x="70" y="142" text-anchor="middle">lps</text>
  <rect class="d-box-muted" x="130" y="114" width="60" height="44" rx="5"/><text class="d-text" x="160" y="142" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="210" y="114" width="60" height="44" rx="5"/><text class="d-text" x="240" y="142" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="290" y="114" width="60" height="44" rx="5"/><text class="d-text" x="320" y="142" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="370" y="114" width="60" height="44" rx="5"/><text class="d-text" x="400" y="142" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="450" y="114" width="60" height="44" rx="5"/><text class="d-text" x="480" y="142" text-anchor="middle">0</text>
  <rect class="d-box" x="130" y="196" width="380" height="60" rx="10"/>
  <text class="d-text" x="320" y="222" text-anchor="middle">abab: prefix ab equals suffix ab</text>
  <text class="d-sub" x="320" y="244" text-anchor="middle">so lps[3] = 2</text>
</svg>

For "ababc": "a" has no border (0), "ab" has none (0), "aba" has "a" (1), "abab" has "ab" (2), and "ababc" has none (0). The highlighted cell is the one that matters in the next diagram.

**Building it in O(m).** Keep \`k\`, the length of the border of the previous prefix. For each new character \`p[i]\`:

1. If \`p[i] == p[k]\`, the border grows by one: \`k += 1\`.
2. Otherwise fall back to the next shorter border, \`k = lps[k - 1]\`, and try again, until a match or \`k == 0\`.
3. Store \`lps[i] = k\`.

The fallback step is the clever part: the next shorter border of a border is itself in the table, so you never recompute anything. \`k\` goes up by at most 1 per character and every fallback lowers it, so the total work is O(m).

## 4. The Search: The Text Pointer Never Moves Back

Scan the text with \`i\` and keep \`j\`, the number of pattern characters currently matched.

- If \`t[i] == p[j]\`, advance both (\`j += 1\`).
- On a mismatch with \`j > 0\`, do **not** move \`i\`. Set \`j = lps[j - 1]\`: the longest border of what you had matched is already matched again, so the pattern slides forward by \`j - lps[j - 1]\` positions in one step.
- On a mismatch with \`j == 0\`, just move on to the next \`i\`.
- When \`j == m\`, a match ends at \`i\`: it starts at \`i - m + 1\`. Set \`j = lps[m - 1]\` to keep looking for overlapping matches.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Text abababcab, the first try at 0 matches abab then fails on c versus a at index 4, KMP keeps the text index at 4 and continues with the pattern shifted to start at 2, ab already matched">
  <text class="d-sub" x="154" y="38" text-anchor="middle">0</text>
  <text class="d-sub" x="212" y="38" text-anchor="middle">1</text>
  <text class="d-sub" x="270" y="38" text-anchor="middle">2</text>
  <text class="d-sub" x="328" y="38" text-anchor="middle">3</text>
  <text class="d-sub" x="386" y="38" text-anchor="middle">4</text>
  <text class="d-sub" x="444" y="38" text-anchor="middle">5</text>
  <text class="d-sub" x="502" y="38" text-anchor="middle">6</text>
  <text class="d-sub" x="560" y="38" text-anchor="middle">7</text>
  <text class="d-sub" x="618" y="38" text-anchor="middle">8</text>
  <text class="d-sub" x="60" y="80" text-anchor="middle">text</text>
  <rect class="d-box" x="130" y="50" width="48" height="48" rx="5"/><text class="d-text" x="154" y="80" text-anchor="middle">a</text>
  <rect class="d-box" x="188" y="50" width="48" height="48" rx="5"/><text class="d-text" x="212" y="80" text-anchor="middle">b</text>
  <rect class="d-box" x="246" y="50" width="48" height="48" rx="5"/><text class="d-text" x="270" y="80" text-anchor="middle">a</text>
  <rect class="d-box" x="304" y="50" width="48" height="48" rx="5"/><text class="d-text" x="328" y="80" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="362" y="50" width="48" height="48" rx="5"/><text class="d-text" x="386" y="80" text-anchor="middle">a</text>
  <rect class="d-box" x="420" y="50" width="48" height="48" rx="5"/><text class="d-text" x="444" y="80" text-anchor="middle">b</text>
  <rect class="d-box" x="478" y="50" width="48" height="48" rx="5"/><text class="d-text" x="502" y="80" text-anchor="middle">c</text>
  <rect class="d-box" x="536" y="50" width="48" height="48" rx="5"/><text class="d-text" x="560" y="80" text-anchor="middle">a</text>
  <rect class="d-box" x="594" y="50" width="48" height="48" rx="5"/><text class="d-text" x="618" y="80" text-anchor="middle">b</text>
  <text class="d-sub" x="60" y="170" text-anchor="middle">try at 0</text>
  <rect class="d-box" x="130" y="140" width="48" height="48" rx="5"/><text class="d-text" x="154" y="170" text-anchor="middle">a</text>
  <rect class="d-box" x="188" y="140" width="48" height="48" rx="5"/><text class="d-text" x="212" y="170" text-anchor="middle">b</text>
  <rect class="d-box" x="246" y="140" width="48" height="48" rx="5"/><text class="d-text" x="270" y="170" text-anchor="middle">a</text>
  <rect class="d-box" x="304" y="140" width="48" height="48" rx="5"/><text class="d-text" x="328" y="170" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="362" y="140" width="48" height="48" rx="5"/><text class="d-text" x="386" y="170" text-anchor="middle">c</text>
  <text class="d-sub" x="60" y="260" text-anchor="middle">try at 2</text>
  <rect class="d-box-muted" x="246" y="230" width="48" height="48" rx="5"/><text class="d-text" x="270" y="260" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="304" y="230" width="48" height="48" rx="5"/><text class="d-text" x="328" y="260" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="362" y="230" width="48" height="48" rx="5"/><text class="d-text" x="386" y="260" text-anchor="middle">a</text>
  <rect class="d-box" x="420" y="230" width="48" height="48" rx="5"/><text class="d-text" x="444" y="260" text-anchor="middle">b</text>
  <rect class="d-box" x="478" y="230" width="48" height="48" rx="5"/><text class="d-text" x="502" y="260" text-anchor="middle">c</text>
</svg>

In the text "abababcab", the first attempt matches "abab" and then sees "a" at index 4 where the pattern wants "c". \`lps[3] = 2\`, so KMP keeps \`i = 4\` and continues as if "ab" (text indices 2 and 3, grey) is already matched by a new attempt starting at index 2. That attempt then matches "abc" and finds the pattern at index 2, without re-reading a single text character.

📌 **Interview term: Amortised analysis** — counting total work over the whole run rather than per step. In the search, \`j\` rises by at most 1 per text character and every fallback lowers it, so fallbacks total at most n: at most about 2n comparisons. Example 2 shows KMP staying under its \`kmp_limit_2n\` on every input.

**Total cost:** O(m) to build the table plus O(n) to scan: **O(n + m)** time and O(m) extra space.

### Related algorithms worth naming

- **Z-algorithm:** computes, for every position, the length of the longest substring starting there that matches a prefix; run on \`p + "$" + t\` it also matches in O(n + m).
- **Rabin-Karp:** compares rolling hashes of windows; O(n + m) expected, good for many patterns at once, but needs a check on hash collisions.
- **Boyer-Moore:** compares from the right end of the pattern and can skip many characters at a time; often fastest on natural text.

The LPS idea also solves interview problems that are not "search": the shortest string to add to make a palindrome, the smallest repeating unit of a string (\`m - lps[m - 1]\`), and counting overlapping occurrences.

## 5. KMP in Java

~~~java
static int[] buildLps(String p) {
    int[] lps = new int[p.length()];             // all zeros
    int k = 0;                                   // length of the current border
    for (int i = 1; i < p.length(); i++) {
        while (k > 0 && p.charAt(i) != p.charAt(k)) k = lps[k - 1];
        if (p.charAt(i) == p.charAt(k)) k++;
        lps[i] = k;
    }
    return lps;
}

static List<Integer> kmpSearch(String text, String p) {
    List<Integer> matches = new ArrayList<>();
    if (p.isEmpty()) { matches.add(0); return matches; }   // like "abc".indexOf("") == 0
    int[] lps = buildLps(p);
    int j = 0;
    for (int i = 0; i < text.length(); i++) {
        while (j > 0 && text.charAt(i) != p.charAt(j)) j = lps[j - 1];  // i stays
        if (text.charAt(i) == p.charAt(j)) j++;
        if (j == p.length()) {
            matches.add(i - p.length() + 1);
            j = lps[j - 1];                      // allow overlapping matches
        }
    }
    return matches;
}
~~~

**Why each line is there:**

- \`new int[m]\` is zero-filled by the language, so \`lps[0] = 0\` needs no code. A primitive array avoids boxing every entry.
- \`charAt(i) != charAt(k)\` compares two \`char\` values; \`==\` and \`!=\` are correct here (unlike for \`String\` objects).
- \`while\`, not \`if\`, for the fallback.
- \`List<Integer>\` boxes each match index; that is fine for results. \`Arrays.toString(int[])\` and \`List.toString()\` both print \`[a, b, c]\`, which is how Example 1 formats its output.

**Use the built-in in real code.** \`text.indexOf(p)\` returns the first index or -1, and \`text.indexOf(p, from)\` continues from a position; loop with \`from = pos + 1\` to collect overlapping matches. The JDK documentation specifies what \`indexOf\` returns, not which algorithm it uses, so do not claim it is KMP. Write KMP when asked, or when you need the LPS table (borders, repetition, streaming input).

## 6. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — build the LPS table and find every match, overlaps included** prints:

~~~text
lps(ababc) = [0, 0, 1, 2, 0]
lps(aabaaab) = [0, 1, 0, 1, 2, 2, 3]
lps(abcabcabd) = [0, 0, 0, 1, 2, 3, 4, 5, 0]
search(abababcab, ababc) = [2]
search(aaaaa, aa) = [0, 1, 2, 3]
search(abcabcabc, abcabc) = [0, 3]
search(hello, ll) = [2]
search(abc, d) = []
search(ab, abc) = []
search(abc, empty) = [0]
~~~

**Example 2 — naive search vs KMP, counting character comparisons** prints:

~~~text
english: n=35 m=3 matches=3 agree=true naive=44 kmp=39 kmp_limit_2n=70
a^1000 b, a^9 b: n=1001 m=10 matches=1 agree=true naive=9920 kmp=1992 kmp_limit_2n=2002
a^10000 b, a^99 b: n=10001 m=100 matches=1 agree=true naive=990200 kmp=19902 kmp_limit_2n=20002
ab^2000, abab: n=4000 m=4 matches=1999 agree=true naive=9994 kmp=4000 kmp_limit_2n=8000
~~~

**Reading the output:** \`lps(abcabcabd)\` climbs to 5 because "abcab" is both a prefix and a suffix of "abcabcab", then drops to 0 at "d". \`search(aaaaa, aa)\` reports the overlapping matches 0, 1, 2 and 3, which works because the search resets \`j = lps[m - 1]\` after a match instead of 0. A pattern longer than the text finds nothing, and the empty pattern returns \`[0]\` by the same convention the built-in search functions use. In Example 2, both methods agree on the number of matches; the naive search does 990,200 comparisons on the 10,001-character repetitive text while KMP does 19,902, below its limit of 2n = 20,002. On ordinary English text the two are close (44 versus 39).

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Naive search | O(n * m) worst, close to O(n) on typical text | O(1) | restarts the pattern after every mismatch |
| Build LPS | O(m) | O(m) | \`k\` rises at most m times, so fallbacks are at most m |
| KMP search | O(n) | O(1) besides the table | \`i\` only moves forward; fallbacks are paid for by earlier advances |
| KMP total | O(n + m) | O(m) | table plus scan |

## 8. Edge Cases

- **Empty pattern:** decide a convention; the built-in searches return 0, and the examples return \`[0]\`.
- **Pattern longer than the text:** no matches; the loop simply never reaches \`j == m\`.
- **Overlapping matches** ("aa" in "aaaaa"): after a match set \`j = lps[m - 1]\`, not 0, or you miss them.
- **Pattern of one repeated character:** the LPS is 0, 1, 2, ..., m - 1, and every match overlaps the previous one.
- **Empty text:** no matches (unless the pattern is also empty).

## Common Pitfalls

- **Starting the table loop at 0.** \`lps[0]\` must stay 0; starting at \`i = 0\` compares \`p.charAt(0)\` with itself and corrupts the table.
- **\`if\` instead of \`while\` for the fallback.** One fallback is not always enough.
- **Resetting \`j = 0\` after a match.** Overlapping matches are lost.
- **\`Integer[]\` or \`List<Integer>\` for the table.** It works but boxes every value; use \`int[]\`.
- **Assuming \`String.indexOf\` is KMP.** Its algorithm is not part of the specification; answer the complexity question for your own code.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">The naive search restarts the pattern after each mismatch, O(n * m) on input like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aaaa...ab</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The table:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[] lps</code> where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lps[i]</code> is the longest proper prefix of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p.substring(0, i + 1)</code> that is also a suffix; O(m).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The search:</strong> <span style="color:#f0e2c8;">Never move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> back; on a mismatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j = lps[j - 1]</code>; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j == m</code>, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - m + 1</code> and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j = lps[m - 1]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n + m) time because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> can only fall as often as it rose; O(m) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java note:</strong> <span style="color:#f0e2c8;">Primitive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> for the table, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char</code> comparisons with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">indexOf(p, from)</code> for production searches.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the search O(n) with a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while</code> inside the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">for</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> rises by at most 1 per character and each fallback lowers it, so all fallbacks total at most n. The verified counts stay under 2n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lps[j - 1]</code> mean on a mismatch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You had matched <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p.substring(0, j)</code>; its longest border is already aligned with the text, so you continue with that many characters matched.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">String.indexOf</code> implemented with KMP?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The Javadoc does not say which algorithm it uses, only what it returns. Treat it as a fast library call and analyse your own code separately.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the smallest repeating unit of a string with the LPS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Let <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">L = m - lps[m - 1]</code>. If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m % L == 0</code>, the string is the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">L</code> characters repeated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m / L</code> times; otherwise it has no repeating unit shorter than itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you search a stream that does not fit in memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">KMP only needs the current <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> and the table, so read the stream character by character and feed it to the same loop; the text never needs to be stored.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **String matching** | finding where a pattern occurs in a text |
| **KMP (Knuth-Morris-Pratt)** | O(n + m) matching with a precomputed failure table |
| **Proper prefix / proper suffix** | a prefix or suffix shorter than the whole string |
| **Border** | a string that is both a proper prefix and a proper suffix |
| **LPS array (failure function, prefix function)** | lps[i] = length of the longest border of p[0..i] |
| **Amortised analysis** | bounding the total work over the run rather than per step |

---
**Conclusion:** KMP turns string matching into a single forward scan of the text by precomputing, for every prefix of the pattern, its longest border. On a mismatch it falls back to that border instead of restarting, so the text pointer never moves back and the total work is O(n + m), which the verified counts confirm. In Java, keep the table in a primitive \`int[]\`, compare \`char\`s with \`==\`, reset to \`lps[m - 1]\` after a match, and use \`indexOf\` in production without assuming which algorithm sits behind it.`,
        examples: [
          { label: `Build the LPS table and find every match, overlaps included`, code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Main {
    /** lps[i] = length of the longest proper prefix of p[0..i] that is also a suffix of it. */
    static int[] buildLps(String p) {
        int[] lps = new int[p.length()];
        int k = 0;                                  // length of the current matched prefix
        for (int i = 1; i < p.length(); i++) {
            while (k > 0 && p.charAt(i) != p.charAt(k)) k = lps[k - 1];   // next shorter border
            if (p.charAt(i) == p.charAt(k)) k++;
            lps[i] = k;
        }
        return lps;
    }

    /** All start indices of p in text, overlaps included. The text index never moves back. */
    static List<Integer> kmpSearch(String text, String p) {
        List<Integer> matches = new ArrayList<>();
        if (p.isEmpty()) { matches.add(0); return matches; }   // same as "abc".indexOf("") == 0
        int[] lps = buildLps(p);
        int j = 0;                                  // characters of p matched so far
        for (int i = 0; i < text.length(); i++) {
            while (j > 0 && text.charAt(i) != p.charAt(j)) j = lps[j - 1];  // slide, keep i
            if (text.charAt(i) == p.charAt(j)) j++;
            if (j == p.length()) {
                matches.add(i - p.length() + 1);
                j = lps[j - 1];                     // keep going to find overlapping matches
            }
        }
        return matches;
    }

    public static void main(String[] args) {
        // Arrays.toString and List.toString both print [a, b, c]
        System.out.println("lps(ababc) = " + Arrays.toString(buildLps("ababc")));         // [0, 0, 1, 2, 0]
        System.out.println("lps(aabaaab) = " + Arrays.toString(buildLps("aabaaab")));     // [0, 1, 0, 1, 2, 2, 3]
        System.out.println("lps(abcabcabd) = " + Arrays.toString(buildLps("abcabcabd"))); // [0, 0, 0, 1, 2, 3, 4, 5, 0]
        System.out.println("search(abababcab, ababc) = " + kmpSearch("abababcab", "ababc")); // [2]
        System.out.println("search(aaaaa, aa) = " + kmpSearch("aaaaa", "aa"));              // [0, 1, 2, 3]
        System.out.println("search(abcabcabc, abcabc) = " + kmpSearch("abcabcabc", "abcabc")); // [0, 3]
        System.out.println("search(hello, ll) = " + kmpSearch("hello", "ll"));              // [2]
        System.out.println("search(abc, d) = " + kmpSearch("abc", "d"));                    // []
        System.out.println("search(ab, abc) = " + kmpSearch("ab", "abc"));                  // []
        System.out.println("search(abc, empty) = " + kmpSearch("abc", ""));                 // [0]
    }
}` },
          { label: `Naive search vs KMP, counting character comparisons`, code: `public class Main {
    static long comps;   // character comparisons made by the last search

    static int[] buildLps(String p) {
        int[] lps = new int[p.length()];
        int k = 0;
        for (int i = 1; i < p.length(); i++) {
            while (k > 0 && p.charAt(i) != p.charAt(k)) k = lps[k - 1];
            if (p.charAt(i) == p.charAt(k)) k++;
            lps[i] = k;
        }
        return lps;
    }

    /** Try every start; on a mismatch, restart one position later. */
    static int naiveSearch(String text, String p) {
        comps = 0;
        int count = 0;
        for (int i = 0; i + p.length() <= text.length(); i++) {
            int j = 0;
            while (j < p.length()) {
                comps++;
                if (text.charAt(i + j) != p.charAt(j)) break;
                j++;
            }
            if (j == p.length()) count++;
        }
        return count;
    }

    /** Same answer, but the text index only moves forward. */
    static int kmpSearch(String text, String p) {
        comps = 0;
        int[] lps = buildLps(p);
        int count = 0, j = 0;
        for (int i = 0; i < text.length(); i++) {
            while (true) {
                comps++;
                if (text.charAt(i) == p.charAt(j)) { j++; break; }
                if (j == 0) break;
                j = lps[j - 1];
            }
            if (j == p.length()) {
                count++;
                j = lps[j - 1];
            }
        }
        return count;
    }

    public static void main(String[] args) {
        String[][] cases = {
            {"english", "the cat sat on the mat with the hat", "the"},
            {"a^1000 b, a^9 b", "a".repeat(1000) + "b", "a".repeat(9) + "b"},
            {"a^10000 b, a^99 b", "a".repeat(10000) + "b", "a".repeat(99) + "b"},
            {"ab^2000, abab", "ab".repeat(2000), "abab"},
        };
        for (String[] c : cases) {
            String text = c[1], p = c[2];
            int nm = naiveSearch(text, p); long nc = comps;
            int km = kmpSearch(text, p);   long kc = comps;
            System.out.println(c[0] + ": n=" + text.length() + " m=" + p.length() + " matches=" + km
                + " agree=" + (nm == km) + " naive=" + nc + " kmp=" + kc + " kmp_limit_2n=" + 2 * text.length());
        }
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Explain how the Knuth-Morris-Pratt algorithm finds a pattern in a text, then implement it in C++: build the failure table and return every index where the pattern starts. Why is it linear?"

**What a strong answer should cover:**
- The naive search restarts the pattern after a mismatch and is O(n * m) on repetitive input.
- The LPS (failure) array: \`lps[i]\` is the longest proper prefix of \`p[0..i]\` that is also a suffix; built in O(m) with the \`k = lps[k - 1]\` fallback.
- The search keeps the text index moving forward only; on a mismatch \`j = lps[j - 1]\`; after a full match \`j = lps[m - 1]\` to catch overlaps.
- O(n + m) time by amortised analysis; O(m) space.
- C++ specifics: \`std::string::find\` returns \`std::string::npos\` when absent, C++17 adds searcher objects such as \`std::boyer_moore_searcher\` for \`std::search\`, and the naive loop bound must be \`i + m <= n\`, not \`i <= n - m\`, because \`size()\` is unsigned.

**Code / implementation expected:** Yes — \`std::vector<int> buildLps(const std::string&)\` and \`kmpSearch(text, p)\` in C++.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Hard
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are reading a long necklace of beads, looking for the colour pattern red-blue-red-blue-green. You have matched red, blue, red, blue... and the next bead is red, not green. The naive reaction is to slide your finger back to the second bead you looked at and start all over again. But wait: the last two beads you just matched were red, blue, which is exactly how the pattern **starts**. You do not need to look at them again. You can keep your finger where it is and pretend you have already matched "red, blue" of a new attempt.

That "I already know how much of a new attempt is matched" trick is the **Knuth-Morris-Pratt (KMP)** algorithm. It precomputes, for the pattern alone, how much of the pattern can be reused after a mismatch, and then scans the text **once, never moving backwards**.

📌 **Interview term: String matching** — finding where a pattern string \`p\` (length m) occurs inside a text \`t\` (length n).

📌 **Interview term: KMP (Knuth-Morris-Pratt)** — a string-matching algorithm that runs in O(n + m) time by precomputing a failure table for the pattern so the text index never goes backwards.

## 2. The Problem With the Naive Search

The naive search tries every start position \`i\` in the text and compares the pattern character by character. On a mismatch it moves to \`i + 1\` and starts comparing from the **first** pattern character again, throwing away everything it just learned. On normal English text that is fast, because mismatches happen almost immediately. On repetitive text it is O(n * m): searching for "aaaaaaaaab" in a thousand a's followed by a b re-reads the same a's over and over. Example 2 counts 990,200 comparisons for a 10,001-character text and a 100-character pattern of that shape.

## 3. The Failure Table (LPS)

📌 **Interview term: Proper prefix / proper suffix** — a prefix or suffix that is shorter than the whole string. For "abab", the proper prefixes are "", "a", "ab", "aba" and the proper suffixes are "", "b", "ab", "bab".

📌 **Interview term: Border** — a string that is both a proper prefix and a proper suffix. "ab" is a border of "abab".

📌 **Interview term: LPS array (failure function, prefix function)** — \`lps[i]\` is the length of the longest border of \`p[0..i]\`. Different books call it the failure function or the prefix function; it is the same array.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="LPS table for the pattern ababc, values 0 0 1 2 0, at index 3 the prefix ab equals the suffix ab so the value is 2">
  <text class="d-sub" x="160" y="28" text-anchor="middle">0</text>
  <text class="d-sub" x="240" y="28" text-anchor="middle">1</text>
  <text class="d-sub" x="320" y="28" text-anchor="middle">2</text>
  <text class="d-sub" x="400" y="28" text-anchor="middle">3</text>
  <text class="d-sub" x="480" y="28" text-anchor="middle">4</text>
  <text class="d-sub" x="70" y="72" text-anchor="middle">pattern</text>
  <rect class="d-box" x="130" y="44" width="60" height="44" rx="5"/><text class="d-text" x="160" y="72" text-anchor="middle">a</text>
  <rect class="d-box" x="210" y="44" width="60" height="44" rx="5"/><text class="d-text" x="240" y="72" text-anchor="middle">b</text>
  <rect class="d-box" x="290" y="44" width="60" height="44" rx="5"/><text class="d-text" x="320" y="72" text-anchor="middle">a</text>
  <rect class="d-box-accent" x="370" y="44" width="60" height="44" rx="5"/><text class="d-text" x="400" y="72" text-anchor="middle">b</text>
  <rect class="d-box" x="450" y="44" width="60" height="44" rx="5"/><text class="d-text" x="480" y="72" text-anchor="middle">c</text>
  <text class="d-sub" x="70" y="142" text-anchor="middle">lps</text>
  <rect class="d-box-muted" x="130" y="114" width="60" height="44" rx="5"/><text class="d-text" x="160" y="142" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="210" y="114" width="60" height="44" rx="5"/><text class="d-text" x="240" y="142" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="290" y="114" width="60" height="44" rx="5"/><text class="d-text" x="320" y="142" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="370" y="114" width="60" height="44" rx="5"/><text class="d-text" x="400" y="142" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="450" y="114" width="60" height="44" rx="5"/><text class="d-text" x="480" y="142" text-anchor="middle">0</text>
  <rect class="d-box" x="130" y="196" width="380" height="60" rx="10"/>
  <text class="d-text" x="320" y="222" text-anchor="middle">abab: prefix ab equals suffix ab</text>
  <text class="d-sub" x="320" y="244" text-anchor="middle">so lps[3] = 2</text>
</svg>

For "ababc": "a" has no border (0), "ab" has none (0), "aba" has "a" (1), "abab" has "ab" (2), and "ababc" has none (0). The highlighted cell is the one that matters in the next diagram.

**Building it in O(m).** Keep \`k\`, the length of the border of the previous prefix. For each new character \`p[i]\`:

1. If \`p[i] == p[k]\`, the border grows by one: \`k += 1\`.
2. Otherwise fall back to the next shorter border, \`k = lps[k - 1]\`, and try again, until a match or \`k == 0\`.
3. Store \`lps[i] = k\`.

The fallback step is the clever part: the next shorter border of a border is itself in the table, so you never recompute anything. \`k\` goes up by at most 1 per character and every fallback lowers it, so the total work is O(m).

## 4. The Search: The Text Pointer Never Moves Back

Scan the text with \`i\` and keep \`j\`, the number of pattern characters currently matched.

- If \`t[i] == p[j]\`, advance both (\`j += 1\`).
- On a mismatch with \`j > 0\`, do **not** move \`i\`. Set \`j = lps[j - 1]\`: the longest border of what you had matched is already matched again, so the pattern slides forward by \`j - lps[j - 1]\` positions in one step.
- On a mismatch with \`j == 0\`, just move on to the next \`i\`.
- When \`j == m\`, a match ends at \`i\`: it starts at \`i - m + 1\`. Set \`j = lps[m - 1]\` to keep looking for overlapping matches.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Text abababcab, the first try at 0 matches abab then fails on c versus a at index 4, KMP keeps the text index at 4 and continues with the pattern shifted to start at 2, ab already matched">
  <text class="d-sub" x="154" y="38" text-anchor="middle">0</text>
  <text class="d-sub" x="212" y="38" text-anchor="middle">1</text>
  <text class="d-sub" x="270" y="38" text-anchor="middle">2</text>
  <text class="d-sub" x="328" y="38" text-anchor="middle">3</text>
  <text class="d-sub" x="386" y="38" text-anchor="middle">4</text>
  <text class="d-sub" x="444" y="38" text-anchor="middle">5</text>
  <text class="d-sub" x="502" y="38" text-anchor="middle">6</text>
  <text class="d-sub" x="560" y="38" text-anchor="middle">7</text>
  <text class="d-sub" x="618" y="38" text-anchor="middle">8</text>
  <text class="d-sub" x="60" y="80" text-anchor="middle">text</text>
  <rect class="d-box" x="130" y="50" width="48" height="48" rx="5"/><text class="d-text" x="154" y="80" text-anchor="middle">a</text>
  <rect class="d-box" x="188" y="50" width="48" height="48" rx="5"/><text class="d-text" x="212" y="80" text-anchor="middle">b</text>
  <rect class="d-box" x="246" y="50" width="48" height="48" rx="5"/><text class="d-text" x="270" y="80" text-anchor="middle">a</text>
  <rect class="d-box" x="304" y="50" width="48" height="48" rx="5"/><text class="d-text" x="328" y="80" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="362" y="50" width="48" height="48" rx="5"/><text class="d-text" x="386" y="80" text-anchor="middle">a</text>
  <rect class="d-box" x="420" y="50" width="48" height="48" rx="5"/><text class="d-text" x="444" y="80" text-anchor="middle">b</text>
  <rect class="d-box" x="478" y="50" width="48" height="48" rx="5"/><text class="d-text" x="502" y="80" text-anchor="middle">c</text>
  <rect class="d-box" x="536" y="50" width="48" height="48" rx="5"/><text class="d-text" x="560" y="80" text-anchor="middle">a</text>
  <rect class="d-box" x="594" y="50" width="48" height="48" rx="5"/><text class="d-text" x="618" y="80" text-anchor="middle">b</text>
  <text class="d-sub" x="60" y="170" text-anchor="middle">try at 0</text>
  <rect class="d-box" x="130" y="140" width="48" height="48" rx="5"/><text class="d-text" x="154" y="170" text-anchor="middle">a</text>
  <rect class="d-box" x="188" y="140" width="48" height="48" rx="5"/><text class="d-text" x="212" y="170" text-anchor="middle">b</text>
  <rect class="d-box" x="246" y="140" width="48" height="48" rx="5"/><text class="d-text" x="270" y="170" text-anchor="middle">a</text>
  <rect class="d-box" x="304" y="140" width="48" height="48" rx="5"/><text class="d-text" x="328" y="170" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="362" y="140" width="48" height="48" rx="5"/><text class="d-text" x="386" y="170" text-anchor="middle">c</text>
  <text class="d-sub" x="60" y="260" text-anchor="middle">try at 2</text>
  <rect class="d-box-muted" x="246" y="230" width="48" height="48" rx="5"/><text class="d-text" x="270" y="260" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="304" y="230" width="48" height="48" rx="5"/><text class="d-text" x="328" y="260" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="362" y="230" width="48" height="48" rx="5"/><text class="d-text" x="386" y="260" text-anchor="middle">a</text>
  <rect class="d-box" x="420" y="230" width="48" height="48" rx="5"/><text class="d-text" x="444" y="260" text-anchor="middle">b</text>
  <rect class="d-box" x="478" y="230" width="48" height="48" rx="5"/><text class="d-text" x="502" y="260" text-anchor="middle">c</text>
</svg>

In the text "abababcab", the first attempt matches "abab" and then sees "a" at index 4 where the pattern wants "c". \`lps[3] = 2\`, so KMP keeps \`i = 4\` and continues as if "ab" (text indices 2 and 3, grey) is already matched by a new attempt starting at index 2. That attempt then matches "abc" and finds the pattern at index 2, without re-reading a single text character.

📌 **Interview term: Amortised analysis** — counting total work over the whole run rather than per step. In the search, \`j\` rises by at most 1 per text character and every fallback lowers it, so fallbacks total at most n: at most about 2n comparisons. Example 2 shows KMP staying under its \`kmp_limit_2n\` on every input.

**Total cost:** O(m) to build the table plus O(n) to scan: **O(n + m)** time and O(m) extra space.

### Related algorithms worth naming

- **Z-algorithm:** computes, for every position, the length of the longest substring starting there that matches a prefix; run on \`p + "$" + t\` it also matches in O(n + m).
- **Rabin-Karp:** compares rolling hashes of windows; O(n + m) expected, good for many patterns at once, but needs a check on hash collisions.
- **Boyer-Moore:** compares from the right end of the pattern and can skip many characters at a time; often fastest on natural text.

The LPS idea also solves interview problems that are not "search": the shortest string to add to make a palindrome, the smallest repeating unit of a string (\`m - lps[m - 1]\`), and counting overlapping occurrences.

## 5. KMP in C++

~~~cpp
std::vector<int> buildLps(const std::string& p) {
    std::vector<int> lps(p.size(), 0);
    int k = 0;                                   // length of the current border
    for (size_t i = 1; i < p.size(); ++i) {
        while (k > 0 && p[i] != p[k]) k = lps[k - 1];
        if (p[i] == p[k]) ++k;
        lps[i] = k;
    }
    return lps;
}

std::vector<int> kmpSearch(const std::string& text, const std::string& p) {
    if (p.empty()) return {0};                   // like text.find("") == 0
    std::vector<int> lps = buildLps(p), matches;
    int j = 0;
    const int m = static_cast<int>(p.size());
    for (int i = 0; i < static_cast<int>(text.size()); ++i) {
        while (j > 0 && text[i] != p[j]) j = lps[j - 1];   // i stays where it is
        if (text[i] == p[j]) ++j;
        if (j == m) {
            matches.push_back(i - m + 1);
            j = lps[j - 1];                      // allow overlapping matches
        }
    }
    return matches;
}
~~~

**Why each line is there:**

- \`std::vector<int> lps(p.size(), 0)\` value-initialises every entry; \`lps[0]\` stays 0.
- \`k\` and \`j\` are \`int\`: they are compared with 0 and used in \`k - 1\`, so signed types are the safe choice.
- \`const std::string&\` parameters: the text can be huge, and passing by value would copy it.
- \`j = lps[j - 1]\` after a match keeps overlapping matches.

**The unsigned trap in the naive search.** Example 2 writes the naive loop as \`for (size_t i = 0; i + p.size() <= text.size(); ++i)\`. The tempting \`i <= text.size() - p.size()\` wraps around when the pattern is longer than the text (\`size_t(0) - 1\` printed 18446744073709551615 in a test run), and the loop then reads far past the end.

**Use the library in real code.** \`text.find(p)\` returns the first index or \`std::string::npos\`, and \`text.find(p, pos + 1)\` continues for overlapping matches. C++17 also added searcher objects for \`std::search\`; a test program with \`std::search(text.begin(), text.end(), std::boyer_moore_searcher(p.begin(), p.end()))\` compiled with \`-std=c++17\` and found "ababc" at index 2 in "abababcab", the same answer as KMP.

## 6. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — build the LPS table and find every match, overlaps included** prints:

~~~text
lps(ababc) = [0, 0, 1, 2, 0]
lps(aabaaab) = [0, 1, 0, 1, 2, 2, 3]
lps(abcabcabd) = [0, 0, 0, 1, 2, 3, 4, 5, 0]
search(abababcab, ababc) = [2]
search(aaaaa, aa) = [0, 1, 2, 3]
search(abcabcabc, abcabc) = [0, 3]
search(hello, ll) = [2]
search(abc, d) = []
search(ab, abc) = []
search(abc, empty) = [0]
~~~

**Example 2 — naive search vs KMP, counting character comparisons** prints:

~~~text
english: n=35 m=3 matches=3 agree=true naive=44 kmp=39 kmp_limit_2n=70
a^1000 b, a^9 b: n=1001 m=10 matches=1 agree=true naive=9920 kmp=1992 kmp_limit_2n=2002
a^10000 b, a^99 b: n=10001 m=100 matches=1 agree=true naive=990200 kmp=19902 kmp_limit_2n=20002
ab^2000, abab: n=4000 m=4 matches=1999 agree=true naive=9994 kmp=4000 kmp_limit_2n=8000
~~~

**Reading the output:** \`lps(abcabcabd)\` climbs to 5 because "abcab" is both a prefix and a suffix of "abcabcab", then drops to 0 at "d". \`search(aaaaa, aa)\` reports the overlapping matches 0, 1, 2 and 3, which works because the search resets \`j = lps[m - 1]\` after a match instead of 0. A pattern longer than the text finds nothing, and the empty pattern returns \`[0]\` by the same convention the built-in search functions use. In Example 2, both methods agree on the number of matches; the naive search does 990,200 comparisons on the 10,001-character repetitive text while KMP does 19,902, below its limit of 2n = 20,002. On ordinary English text the two are close (44 versus 39).

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Naive search | O(n * m) worst, close to O(n) on typical text | O(1) | restarts the pattern after every mismatch |
| Build LPS | O(m) | O(m) | \`k\` rises at most m times, so fallbacks are at most m |
| KMP search | O(n) | O(1) besides the table | \`i\` only moves forward; fallbacks are paid for by earlier advances |
| KMP total | O(n + m) | O(m) | table plus scan |

## 8. Edge Cases

- **Empty pattern:** decide a convention; the built-in searches return 0, and the examples return \`[0]\`.
- **Pattern longer than the text:** no matches; the loop simply never reaches \`j == m\`.
- **Overlapping matches** ("aa" in "aaaaa"): after a match set \`j = lps[m - 1]\`, not 0, or you miss them.
- **Pattern of one repeated character:** the LPS is 0, 1, 2, ..., m - 1, and every match overlaps the previous one.
- **Empty text:** no matches (unless the pattern is also empty).

## Common Pitfalls

- **\`i <= n - m\` with \`size_t\`.** If \`m > n\` it wraps to a huge number; write \`i + m <= n\`.
- **Starting the table loop at 0.** \`lps[0]\` must stay 0.
- **\`if\` instead of \`while\` for the fallback.** One fallback is not always enough.
- **Comparing \`find\` against -1.** It returns \`std::string::npos\` (the maximum \`size_t\`); compare with \`npos\`, not with -1 stored in an \`int\`.
- **Resetting \`j = 0\` after a match.** Overlapping matches are lost.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">The naive search restarts the pattern after each mismatch, O(n * m) on input like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aaaa...ab</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The table:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt; lps</code> where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lps[i]</code> is the longest proper prefix of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p[0..i]</code> that is also a suffix; O(m).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The search:</strong> <span style="color:#f0e2c8;">Never move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> back; on a mismatch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j = lps[j - 1]</code>; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j == m</code>, record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - m + 1</code> and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j = lps[m - 1]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n + m) time because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> can only fall as often as it rose; O(m) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ note:</strong> <span style="color:#f0e2c8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">npos</code> in production, or C++17 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::boyer_moore_searcher</code>; keep loop bounds safe from unsigned wrap-around.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the search O(n) with a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while</code> inside the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">for</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> rises by at most 1 per character and each fallback lowers it, so all fallbacks total at most n. The verified counts stay under 2n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lps[j - 1]</code> mean on a mismatch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You had matched the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> pattern characters; their longest border is already aligned with the text, so you continue with that many matched.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the standard library offer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::string::find</code> for one position, and since C++17 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::search</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::default_searcher</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::boyer_moore_searcher</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::boyer_moore_horspool_searcher</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the smallest repeating unit of a string with the LPS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Let <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">L = m - lps[m - 1]</code>. If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m % L == 0</code>, the string is the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">L</code> characters repeated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m / L</code> times; otherwise it has no repeating unit shorter than itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you search a stream that does not fit in memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">KMP only needs the current <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> and the table, so read characters one at a time from the stream and run the same loop body on each.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **String matching** | finding where a pattern occurs in a text |
| **KMP (Knuth-Morris-Pratt)** | O(n + m) matching with a precomputed failure table |
| **Proper prefix / proper suffix** | a prefix or suffix shorter than the whole string |
| **Border** | a string that is both a proper prefix and a proper suffix |
| **LPS array (failure function, prefix function)** | lps[i] = length of the longest border of p[0..i] |
| **Amortised analysis** | bounding the total work over the run rather than per step |

---
**Conclusion:** KMP turns string matching into a single forward scan of the text by precomputing, for every prefix of the pattern, its longest border. On a mismatch it falls back to that border instead of restarting, so the text pointer never moves back and the total work is O(n + m), which the verified counts confirm. In C++, keep \`j\` and \`k\` signed, write loop bounds that cannot wrap around, compare \`find\` results with \`npos\`, and know that C++17 searchers exist when you need a library answer.`,
        examples: [
          { label: `Build the LPS table and find every match, overlaps included`, code: `#include <iostream>
#include <string>
#include <vector>

// lps[i] = length of the longest proper prefix of p[0..i] that is also a suffix of it.
std::vector<int> buildLps(const std::string& p) {
    std::vector<int> lps(p.size(), 0);
    int k = 0;                                   // length of the current matched prefix
    for (size_t i = 1; i < p.size(); ++i) {
        while (k > 0 && p[i] != p[k]) k = lps[k - 1];   // fall back to the next shorter border
        if (p[i] == p[k]) ++k;
        lps[i] = k;
    }
    return lps;
}

// All start indices of p in text, overlaps included. The text index never moves back.
std::vector<int> kmpSearch(const std::string& text, const std::string& p) {
    if (p.empty()) return {0};                   // same convention as text.find("") == 0
    std::vector<int> lps = buildLps(p), matches;
    int j = 0;                                   // characters of p matched so far
    const int m = static_cast<int>(p.size());
    for (int i = 0; i < static_cast<int>(text.size()); ++i) {
        while (j > 0 && text[i] != p[j]) j = lps[j - 1];  // slide the pattern, keep i
        if (text[i] == p[j]) ++j;
        if (j == m) {
            matches.push_back(i - m + 1);
            j = lps[j - 1];                      // keep going to find overlapping matches
        }
    }
    return matches;
}

std::string fmt(const std::vector<int>& xs) {
    std::string out = "[";
    for (size_t k = 0; k < xs.size(); ++k) out += (k ? ", " : "") + std::to_string(xs[k]);
    return out + "]";
}

int main() {
    std::cout << "lps(ababc) = " << fmt(buildLps("ababc")) << "\\n";         // [0, 0, 1, 2, 0]
    std::cout << "lps(aabaaab) = " << fmt(buildLps("aabaaab")) << "\\n";     // [0, 1, 0, 1, 2, 2, 3]
    std::cout << "lps(abcabcabd) = " << fmt(buildLps("abcabcabd")) << "\\n"; // [0, 0, 0, 1, 2, 3, 4, 5, 0]
    std::cout << "search(abababcab, ababc) = " << fmt(kmpSearch("abababcab", "ababc")) << "\\n";   // [2]
    std::cout << "search(aaaaa, aa) = " << fmt(kmpSearch("aaaaa", "aa")) << "\\n";                // [0, 1, 2, 3]
    std::cout << "search(abcabcabc, abcabc) = " << fmt(kmpSearch("abcabcabc", "abcabc")) << "\\n"; // [0, 3]
    std::cout << "search(hello, ll) = " << fmt(kmpSearch("hello", "ll")) << "\\n";                // [2]
    std::cout << "search(abc, d) = " << fmt(kmpSearch("abc", "d")) << "\\n";                      // []
    std::cout << "search(ab, abc) = " << fmt(kmpSearch("ab", "abc")) << "\\n";                    // []
    std::cout << "search(abc, empty) = " << fmt(kmpSearch("abc", "")) << "\\n";                   // [0]
    return 0;
}` },
          { label: `Naive search vs KMP, counting character comparisons`, code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

using Result = std::pair<int, long long>;   // {matches, character comparisons}

std::vector<int> buildLps(const std::string& p) {
    std::vector<int> lps(p.size(), 0);
    int k = 0;
    for (size_t i = 1; i < p.size(); ++i) {
        while (k > 0 && p[i] != p[k]) k = lps[k - 1];
        if (p[i] == p[k]) ++k;
        lps[i] = k;
    }
    return lps;
}

// Try every start; on a mismatch, restart one position later.
Result naiveSearch(const std::string& text, const std::string& p) {
    int count = 0;
    long long comps = 0;
    for (size_t i = 0; i + p.size() <= text.size(); ++i) {   // i + m <= n: no unsigned underflow
        size_t j = 0;
        while (j < p.size()) {
            ++comps;
            if (text[i + j] != p[j]) break;
            ++j;
        }
        if (j == p.size()) ++count;
    }
    return {count, comps};
}

// Same answer, but the text index only moves forward.
Result kmpSearch(const std::string& text, const std::string& p) {
    std::vector<int> lps = buildLps(p);
    int count = 0, j = 0;
    long long comps = 0;
    const int m = static_cast<int>(p.size());
    for (char ch : text) {
        while (true) {
            ++comps;
            if (ch == p[j]) { ++j; break; }
            if (j == 0) break;
            j = lps[j - 1];
        }
        if (j == m) {
            ++count;
            j = lps[j - 1];
        }
    }
    return {count, comps};
}

int main() {
    std::string ab;
    for (int k = 0; k < 2000; ++k) ab += "ab";
    std::vector<std::vector<std::string>> cases = {
        {"english", "the cat sat on the mat with the hat", "the"},
        {"a^1000 b, a^9 b", std::string(1000, 'a') + "b", std::string(9, 'a') + "b"},
        {"a^10000 b, a^99 b", std::string(10000, 'a') + "b", std::string(99, 'a') + "b"},
        {"ab^2000, abab", ab, "abab"},
    };
    for (const auto& c : cases) {
        const std::string& text = c[1];
        const std::string& p = c[2];
        auto [nm, nc] = naiveSearch(text, p);
        auto [km, kc] = kmpSearch(text, p);
        std::cout << std::boolalpha << c[0] << ": n=" << text.size() << " m=" << p.size() << " matches=" << km
                  << " agree=" << (nm == km) << " naive=" << nc << " kmp=" << kc
                  << " kmp_limit_2n=" << 2 * text.size() << "\\n";
    }
    return 0;
}` },
        ],
      },
    },
  },
];

export default augments;
