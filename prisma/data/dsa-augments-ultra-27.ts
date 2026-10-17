/**
 * DSA ULTRA — batch 27: Dynamic programming I (1D): what DP is, climbing
 * stairs, house robber, maximum subarray (Kadane) and its divide-and-conquer
 * proof. One complete answer per language (Python, JavaScript, Java, C++).
 * Every example was run with python3 / node / javac+java / g++ -std=c++17 by
 * scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is dynamic programming?",
    difficulty: "medium",
    seoDescription: "Dynamic programming explained in Python, JavaScript, Java and C++: overlapping subproblems, memoization vs tabulation, a recipe and verified runs.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"What is dynamic programming? Explain it in your own words, then show me in Python how you would turn a slow recursive Fibonacci into a dynamic-programming solution, and tell me when you would reach for DP at all."

**What a strong answer should cover:**
- DP = solve each overlapping subproblem once and reuse the stored answer; it needs overlapping subproblems and optimal substructure.
- The two styles: memoization (top-down: recursion + cache) and tabulation (bottom-up: fill a table in dependency order), plus the rolling-variable space optimisation.
- The five-step recipe: state, recurrence, base cases, order, answer — and the running-time formula states × work per state.
- Why plain recursion is exponential (about 2.7 million calls for fib(30)) and DP is O(n).
- Python specifics: a \`dict\` or \`functools.cache\` as the memo, the 1000-frame default recursion limit that breaks deep memoized recursion, arbitrary-precision \`int\`, and the mutable-default-argument trap (\`memo={}\`).

**Code / implementation expected:** Optional — a short Python function (memoized or tabulated Fibonacci) is the usual illustration; the explanation matters more than the code.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should be comfortable with functions, loops and recursion.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A teacher writes \`1 + 1 + 1 + 1 + 1 + 1 + 1 + 1\` on the board and asks the class for the total. Everyone counts and says "eight". Then she adds one more \`+ 1\` at the end and asks again. Nobody counts again from the beginning: everyone says "nine" straight away, because they **remembered** the eight and only did one more addition.

That reflex — *do not redo work you have already done; write the answer down and reuse it* — is the whole of dynamic programming. A computer does not have the reflex. A plain recursive program will happily recount all eight ones every time it needs them, and on bigger problems that turns a job of a few hundred steps into millions or billions. Dynamic programming is the discipline of noticing that the same small question keeps being asked, answering it once, and storing the answer.

It matters in interviews because a large family of questions — [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem), [house robber](/interview-question/how-do-you-solve-the-house-robber-problem), [coin change](/interview-question/how-do-you-solve-the-coin-change-problem), [word break](/interview-question/how-do-you-solve-the-word-break-problem), [longest increasing subsequence](/interview-question/how-do-you-find-the-longest-increasing-subsequence), [0/1 knapsack](/interview-question/how-do-you-solve-the-0-1-knapsack-problem) — are all solved with the same five-step recipe. Learn the recipe once and those questions stop being puzzles and become fill-in-the-blanks.

## 2. The Core Idea in Plain Words

Take the Fibonacci numbers: 0, 1, 1, 2, 3, 5, 8, 13, … Each number is the sum of the two before it. Written as a rule:

- \`fib(0) = 0\`, \`fib(1) = 1\`
- \`fib(n) = fib(n - 1) + fib(n - 2)\` for \`n >= 2\`

The obvious program copies that rule into a recursive function. It is correct, but look at what it does for \`fib(5)\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 350" role="img" aria-label="Recursion tree of fib 5. fib 3 is computed twice and fib 2 three times, shown highlighted">
  <line class="d-edge" x1="448" y1="54" x2="274" y2="94"/>
  <line class="d-edge" x1="448" y1="54" x2="622" y2="94"/>
  <line class="d-edge" x1="274" y1="124" x2="172" y2="164"/>
  <line class="d-edge" x1="274" y1="124" x2="375" y2="164"/>
  <line class="d-edge" x1="622" y1="124" x2="555" y2="164"/>
  <line class="d-edge" x1="622" y1="124" x2="690" y2="164"/>
  <line class="d-edge" x1="172" y1="194" x2="105" y2="234"/>
  <line class="d-edge" x1="172" y1="194" x2="240" y2="234"/>
  <line class="d-edge" x1="375" y1="194" x2="330" y2="234"/>
  <line class="d-edge" x1="375" y1="194" x2="420" y2="234"/>
  <line class="d-edge" x1="555" y1="194" x2="510" y2="234"/>
  <line class="d-edge" x1="555" y1="194" x2="600" y2="234"/>
  <line class="d-edge" x1="105" y1="264" x2="60" y2="304"/>
  <line class="d-edge" x1="105" y1="264" x2="150" y2="304"/>
  <rect class="d-box" x="418" y="24" width="60" height="30" rx="6"/>
  <text class="d-text" x="448" y="44" text-anchor="middle">fib(5)</text>
  <rect class="d-box" x="244" y="94" width="60" height="30" rx="6"/>
  <text class="d-text" x="274" y="114" text-anchor="middle">fib(4)</text>
  <rect class="d-box-accent" x="592" y="94" width="60" height="30" rx="6"/>
  <text class="d-text" x="622" y="114" text-anchor="middle">fib(3)</text>
  <rect class="d-box-accent" x="142" y="164" width="60" height="30" rx="6"/>
  <text class="d-text" x="172" y="184" text-anchor="middle">fib(3)</text>
  <rect class="d-box-accent" x="345" y="164" width="60" height="30" rx="6"/>
  <text class="d-text" x="375" y="184" text-anchor="middle">fib(2)</text>
  <rect class="d-box-accent" x="525" y="164" width="60" height="30" rx="6"/>
  <text class="d-text" x="555" y="184" text-anchor="middle">fib(2)</text>
  <rect class="d-box-muted" x="660" y="164" width="60" height="30" rx="6"/>
  <text class="d-text" x="690" y="184" text-anchor="middle">fib(1)</text>
  <rect class="d-box-accent" x="75" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="105" y="254" text-anchor="middle">fib(2)</text>
  <rect class="d-box-muted" x="210" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="240" y="254" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="300" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="330" y="254" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="390" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="420" y="254" text-anchor="middle">fib(0)</text>
  <rect class="d-box-muted" x="480" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="510" y="254" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="570" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="600" y="254" text-anchor="middle">fib(0)</text>
  <rect class="d-box-muted" x="30" y="304" width="60" height="30" rx="6"/>
  <text class="d-text" x="60" y="324" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="120" y="304" width="60" height="30" rx="6"/>
  <text class="d-text" x="150" y="324" text-anchor="middle">fib(0)</text>
</svg>

The highlighted boxes are repeats: \`fib(3)\` is worked out twice and \`fib(2)\` three times, from scratch each time. The tree roughly doubles in size each time \`n\` grows by one or two, so the work explodes. Example 1 below counts the calls: **2,692,537 calls** for \`fib(30)\`.

📌 **Interview term: Subproblem** — a smaller instance of the same question whose answer helps answer the big one. Here \`fib(3)\` is a subproblem of \`fib(5)\`.

📌 **Interview term: Overlapping subproblems** — the same subproblem is needed many times by different branches of the computation. This is the first sign that DP will help. (Contrast with [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work), whose halves never overlap: there is nothing to reuse, so it is plain divide and conquer, not DP.)

📌 **Interview term: Optimal substructure** — the best answer to the big problem can be built from best answers to its subproblems. For counting problems like Fibonacci it simply means "the answer is a combination of sub-answers"; for optimisation problems (shortest, cheapest, largest) it means an optimal solution contains optimal solutions to its pieces.

📌 **Interview term: Dynamic programming (DP)** — solving a problem that has overlapping subproblems and optimal substructure by solving **each distinct subproblem once**, storing its answer, and looking it up whenever it is needed again.

The name is famously unhelpful. Richard Bellman chose it at the RAND Corporation in the early 1950s. In his autobiography he explains that "programming" meant planning and decision-making (as in a schedule), and that he wanted a name that would not upset a Secretary of Defense who disliked the word "research" — "dynamic", he wrote, is impossible to use in a pejorative sense. Stuart Dreyfus retells the story, quoting Bellman, in [Richard Bellman on the Birth of Dynamic Programming](https://web.cs.miami.edu/home/odelia/teaching/csc317_fall19/syllabus/dy_birth.pdf). It has nothing to do with "dynamic" memory or "programming" a computer.

## 3. Two Ways to Store the Answers

There are two standard ways to "solve each subproblem once". Both give the same answers and the same big-O time; they differ in the direction of the work.

📌 **Interview term: Memoization (top-down DP)** — keep the natural recursive function, but before computing \`f(k)\` check a cache; after computing it, store it. The recursion still starts at the big problem and works downward, but every subproblem is computed only the first time it is asked for. (The general technique, outside algorithms, is covered on the [memoization](/interview-question/what-is-memoization) page.)

📌 **Interview term: Tabulation (bottom-up DP)** — no recursion at all. Make a table (usually an array) \`dp\`, fill in the base cases, then fill the entries in an order where everything an entry depends on is already filled. The answer is read from the table at the end.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 170" role="img" aria-label="A dp table for Fibonacci with indexes 0 to 7 holding 0 1 1 2 3 5 8 13. dp 6 is filled from dp 5 and dp 4">
  <defs>
    <marker id="b27q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge-accent" d="M 390 72 Q 470 18 546 70" marker-end="url(#b27q1-arrow)"/>
  <path class="d-edge-accent" d="M 470 72 Q 510 46 546 70" marker-end="url(#b27q1-arrow)"/>
  <rect class="d-box-muted" x="40" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="70" y="103" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="120" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="150" y="103" text-anchor="middle">1</text>
  <rect class="d-box" x="200" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="230" y="103" text-anchor="middle">1</text>
  <rect class="d-box" x="280" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="310" y="103" text-anchor="middle">2</text>
  <rect class="d-box" x="360" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="390" y="103" text-anchor="middle">3</text>
  <rect class="d-box" x="440" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="470" y="103" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="520" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="550" y="103" text-anchor="middle">8</text>
  <rect class="d-box" x="600" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="630" y="103" text-anchor="middle">13</text>
  <text class="d-sub" x="70" y="146" text-anchor="middle">dp[0]</text>
  <text class="d-sub" x="150" y="146" text-anchor="middle">dp[1]</text>
  <text class="d-sub" x="230" y="146" text-anchor="middle">dp[2]</text>
  <text class="d-sub" x="310" y="146" text-anchor="middle">dp[3]</text>
  <text class="d-sub" x="390" y="146" text-anchor="middle">dp[4]</text>
  <text class="d-sub" x="470" y="146" text-anchor="middle">dp[5]</text>
  <text class="d-sub" x="550" y="146" text-anchor="middle">dp[6]</text>
  <text class="d-sub" x="630" y="146" text-anchor="middle">dp[7]</text>
</svg>

The grey cells are the base cases. Filling from left to right guarantees that when we reach \`dp[6]\`, both \`dp[5]\` and \`dp[4]\` already hold their final values, so \`dp[6] = 5 + 3 = 8\` is one addition.

| | Memoization (top-down) | Tabulation (bottom-up) |
| :--- | :--- | :--- |
| Shape of the code | Recursive function plus a cache | Loop over a table |
| Which subproblems get solved | Only the ones actually reached from the top | All of them, in a fixed order |
| Stack depth | Up to the depth of the recursion (n for Fibonacci) | None beyond the loop |
| Easiest when | The recurrence is obvious but the fill order is not | The order is simple (left to right, row by row) |
| Space saving trick | Hard | Often easy: keep only the last few entries |

📌 **Interview term: Space optimisation (rolling variables)** — when \`dp[i]\` depends only on a fixed number of earlier entries, keep just those entries in variables instead of the whole table. Fibonacci needs only the last two values, so O(n) memory becomes O(1).

## 4. The Five-Step DP Recipe

Every 1D DP question in this batch is solved by writing down these five things, in this order, **before** writing code:

<svg class="iq-diagram" width="100%" viewBox="0 0 900 150" role="img" aria-label="Five boxes in a row: state, recurrence, base cases, order, answer">
  <defs>
    <marker id="b27q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="12" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="82" y="70" text-anchor="middle">1. State</text>
  <text class="d-sub" x="82" y="92" text-anchor="middle">what dp[i] means</text>
  <path class="d-edge" d="M 154 75 L 192 75" marker-end="url(#b27q1-arrow2)"/>
  <rect class="d-box" x="196" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="266" y="70" text-anchor="middle">2. Recurrence</text>
  <text class="d-sub" x="266" y="92" text-anchor="middle">dp[i] from smaller i</text>
  <path class="d-edge" d="M 338 75 L 376 75" marker-end="url(#b27q1-arrow2)"/>
  <rect class="d-box" x="380" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="450" y="70" text-anchor="middle">3. Base cases</text>
  <text class="d-sub" x="450" y="92" text-anchor="middle">the smallest i</text>
  <path class="d-edge" d="M 522 75 L 560 75" marker-end="url(#b27q1-arrow2)"/>
  <rect class="d-box" x="564" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="634" y="70" text-anchor="middle">4. Order</text>
  <text class="d-sub" x="634" y="92" text-anchor="middle">fill so inputs exist</text>
  <path class="d-edge" d="M 706 75 L 744 75" marker-end="url(#b27q1-arrow2)"/>
  <rect class="d-box-muted" x="748" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="818" y="70" text-anchor="middle">5. Answer</text>
  <text class="d-sub" x="818" y="92" text-anchor="middle">which cell to return</text>
</svg>

📌 **Interview term: State** — the precise meaning of one table entry, in words. "\`dp[i]\` = the fewest perfect squares that add up to \`i\`." If you cannot say the state in one sentence, the rest will not work.

📌 **Interview term: Recurrence (transition)** — the formula that computes a state from smaller states. It usually comes from asking "what was the **last** choice?" — the last step taken, the last coin used, whether the last house was robbed.

📌 **Interview term: Base case** — the states small enough to answer directly, with no recurrence: \`fib(0) = 0\`, "zero needs zero squares". The [recursion and base case](/interview-question/what-is-recursion-and-what-is-a-base-case) page covers the idea in general.

Let us run the recipe on a problem that is *not* Fibonacci, to see it is a method and not a trick. **Fewest perfect squares:** what is the smallest number of perfect squares (1, 4, 9, 16, …) that add up to \`n\`?

1. **State:** \`dp[i]\` = the fewest squares that sum to \`i\`.
2. **Recurrence:** the last square used was some \`j*j <= i\`, and the rest must sum to \`i - j*j\` as cheaply as possible: \`dp[i] = 1 + min(dp[i - j*j])\` over every \`j\` with \`j*j <= i\`.
3. **Base case:** \`dp[0] = 0\`.
4. **Order:** \`i\` from 1 up to \`n\`; every \`i - j*j\` is smaller than \`i\`, so it is already filled.
5. **Answer:** \`dp[n]\`.

That is O(n · √n) time and O(n) space. Example 3 runs it and compares it with the greedy idea "always take the biggest square that fits". Greedy turns 12 into \`9 + 1 + 1 + 1\` (4 squares) while DP finds \`4 + 4 + 4\` (3 squares), and for 43 greedy needs 5 squares where DP needs 3.

📌 **Interview term: Greedy algorithm** — make the locally best choice at every step and never reconsider. It is faster when it works, but it can be wrong when an early "best" choice blocks a better overall answer; DP considers every last choice instead. See [what is a greedy algorithm](/interview-question/what-is-a-greedy-algorithm), and the coin-change version of the same trap on [coin change](/interview-question/how-do-you-solve-the-coin-change-problem).

| Technique | Subproblems overlap? | Tries every choice? | Typical cost |
| :--- | :--- | :--- | :--- |
| Plain recursion / brute force | Yes, but recomputed | Yes | Often exponential |
| Divide and conquer | No (halves are disjoint) | Not needed | e.g. O(n log n) |
| Greedy | — | No, one choice per step | Fast, but needs a proof |
| Dynamic programming | Yes, each solved once | Yes, via the recurrence | (number of states) × (work per state) |

📌 **Interview term: DP time formula** — the running time of a DP is **number of states × work per state**. Fibonacci: n states × O(1) = O(n). Perfect squares: n states × O(√n) choices = O(n√n). Saying this formula out loud is the fastest way to give a correct [Big-O](/interview-question/what-is-big-o-notation) for any DP.

## 5. The Python Code, Line by Line

**Memoization with a dict.** The memo is passed in explicitly so each top-level call starts clean:

~~~python
def fib_memo(n, memo):
    if n < 2:
        return n
    if n in memo:                         # solved before: reuse the stored answer
        return memo[n]
    memo[n] = fib_memo(n - 1, memo) + fib_memo(n - 2, memo)
    return memo[n]
~~~

**Tabulation with a list:**

~~~python
def fib_table(n):
    if n < 2:
        return n
    dp = [0] * (n + 1)                    # dp[i] will hold fib(i)
    dp[1] = 1
    for i in range(2, n + 1):             # smaller subproblems first
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]
~~~

**Rolling variables** — tuple assignment updates both at once, using the old values on the right-hand side:

~~~python
def fib_two_vars(n):
    prev, cur = 0, 1                      # fib(i - 1), fib(i)
    for _ in range(n):
        prev, cur = cur, prev + cur
    return prev
~~~

What each Python piece is doing:

- **\`n in memo\`** is an average O(1) hash lookup ([how a hash table works](/interview-question/how-does-a-hash-table-work)). Because Fibonacci keys are exactly \`0..n\`, a list \`memo = [None] * (n + 1)\` works too and avoids hashing.
- **\`[0] * (n + 1)\`** builds a list of \`n + 1\` zeros. That is safe for numbers; for a 2D table write \`[[0] * cols for _ in range(rows)]\`, because \`[[0] * cols] * rows\` repeats one inner list.
- **\`prev, cur = cur, prev + cur\`** evaluates the whole right side first, so no temporary variable is needed.
- **Python \`int\` never overflows.** \`fib(90)\` below is exact; in Java or C++ the same loop needs a 64-bit type, and past \`fib(92)\` even that is not enough.

📌 **Interview term: \`functools.cache\`** — a decorator that memoizes a function automatically. The [functools documentation](https://docs.python.org/3/library/functools.html#functools.cache) says it was added in Python 3.9 and is the same as \`lru_cache(maxsize=None)\`: a dictionary lookup with no eviction. Running it:

~~~python
import sys
from functools import cache


@cache
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)


print("fib(90) =", fib(90))
print("cache info:", fib.cache_info())
print("recursion limit:", sys.getrecursionlimit())
fib.cache_clear()
try:
    fib(5000)
except RecursionError as e:
    print("fib(5000) on a cold cache: RecursionError:", e)
~~~

printed:

~~~text
fib(90) = 2880067194370816120
cache info: CacheInfo(hits=88, misses=91, maxsize=None, currsize=91)
recursion limit: 1000
fib(5000) on a cold cache: RecursionError: maximum recursion depth exceeded
~~~

The 91 misses are the 91 distinct subproblems \`fib(0)..fib(90)\`, each solved once. The last line is the catch: memoization removes the repeated **work**, not the recursion **depth**. A cold call to \`fib(5000)\` still nests about 5000 calls deep, past Python's default limit of 1000. That is the practical reason Python solutions to DP problems are usually written bottom-up.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`python3 main.py\` (Python 3.13). The same programs in the other three languages print exactly the same lines.

**Example 1 — Fibonacci four ways: naive recursion, memoization, a table and two variables, with call counts** printed:

~~~text
fib(1): naive 1 in 1 calls | memo 1 in 1 calls | table 1 | two variables 1
fib(10): naive 55 in 177 calls | memo 55 in 19 calls | table 55 | two variables 55
fib(20): naive 6765 in 21891 calls | memo 6765 in 39 calls | table 6765 | two variables 6765
fib(30): naive 832040 in 2692537 calls | memo 832040 in 59 calls | table 832040 | two variables 832040
~~~

**Example 2 — Overlapping subproblems: how often naive recursion re-solves each fib(k), and the finished table** printed:

~~~text
naive fib(6) solves each subproblem this many times:
  fib(6): 1
  fib(5): 1
  fib(4): 2
  fib(3): 3
  fib(2): 5
  fib(1): 8
  fib(0): 5
  total calls: 25
memoized fib(6) solves each subproblem: [1, 1, 1, 1, 1, 1, 1]
bottom-up table for fib(10): [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]
~~~

**Example 3 — The DP recipe on a new problem: fewest perfect squares, where greedy fails** printed:

~~~text
n=1: dp 1 [1] | greedy 1 [1]
n=12: dp 3 [4, 4, 4] | greedy 4 [9, 1, 1, 1]
n=13: dp 2 [4, 9] | greedy 2 [9, 4]
n=18: dp 2 [9, 9] | greedy 3 [16, 1, 1]
n=43: dp 3 [9, 9, 25] | greedy 5 [36, 4, 1, 1, 1]
~~~

Example 1 shows the gap: for \`fib(30)\` the naive recursion made 2,692,537 calls while the memoized version made 59 (that is \`2n - 1\`: one call for each subproblem plus one repeat lookup per level). Example 2 shows why: naive \`fib(6)\` solved \`fib(1)\` eight times and \`fib(2)\` five times, while the memoized version solved each subproblem exactly once. Example 3 shows that DP is not only Fibonacci: the same recipe finds 3 squares for 12 and 43 where the greedy rule needs 4 and 5.

## Complexity

| Version | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Naive recursion | O(φⁿ), about O(1.618ⁿ) | O(n) stack | The call tree grows like Fibonacci itself: 2,692,537 calls for n = 30 in Example 1 |
| Memoization | O(n) | O(n) cache + O(n) stack | Each of the n + 1 subproblems is solved once; Example 1 shows 2n - 1 calls (59 for n = 30) |
| Tabulation | O(n) | O(n) table | One loop step per entry |
| Two rolling variables | O(n) | O(1) | Only the last two entries are ever read |
| Perfect squares DP | O(n√n) | O(n) | n states, up to √n choices each |

The call count of the naive version is exactly \`2·fib(n+1) - 1\`: 177 for n = 10, 21891 for n = 20 — the counts in Example 1 match that formula. For the stack cost of recursion see [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## How to Recognise a DP Problem

- The question asks for a **count** ("how many ways"), a **best value** ("minimum cost", "maximum profit", "longest"), or a **yes/no feasibility** ("can it be split", "can you reach").
- The input is a sequence, a string, a grid, or an amount, and a choice is made at each position (take it or skip it, step 1 or 2, which coin).
- A brute-force recursion is easy to write but tries the same smaller inputs again and again.
- The problem says "you cannot pick two adjacent…" or "each item at most once" — a constraint that links one choice to the next, which greedy usually gets wrong.

In this batch the 1D questions build on each other: [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem) is Fibonacci in disguise, [house robber](/interview-question/how-do-you-solve-the-house-robber-problem) adds a take-or-skip choice, and [maximum subarray](/interview-question/how-do-you-find-the-maximum-subarray-sum) (Kadane) is a DP whose table you never store. The companion batch continues with [maximum product subarray](/interview-question/how-do-you-find-the-maximum-product-subarray), [coin change](/interview-question/how-do-you-solve-the-coin-change-problem), [unique paths](/interview-question/how-do-you-count-unique-paths-in-a-grid), [decode ways](/interview-question/decode-ways-dp-how-do-you-handle-0-and-06-edge-cases) and [word break](/interview-question/how-do-you-solve-the-word-break-problem).

## Edge Cases

- **The smallest inputs** — \`fib(0)\` and \`fib(1)\` are base cases; a table of size \`n + 1\` must still exist for \`n = 0\` (the code returns early instead).
- **Large n** — the answer outgrows fixed-size integers (see each language note above) and recursive memoization outgrows the stack. Bottom-up plus a big-enough number type, or a modulo, fixes both.
- **"Unknown" versus a real zero** — if 0 can be a valid answer, mark unsolved cache entries with something else (\`None\`, \`-1\`, a missing key).
- **Greedy-looking problems** — perfect squares and coin change look greedy; always test one small counterexample (12 = 4 + 4 + 4) before trusting greedy.

## Common Pitfalls

- **Calling it DP without overlapping subproblems.** Caching merge sort halves saves nothing; say why the subproblems repeat.
- **\`def fib(n, memo={})\`.** The default dict is created once and shared by every call; after one \`fib(30)\` call it still held 29 entries when this was run. Pass the memo explicitly or use \`functools.cache\`.
- **Deep top-down recursion.** Memoized recursion is still O(n) deep; at the default limit of 1000 it raises \`RecursionError\` (shown above). Write the loop version for large inputs.
- **Building 2D tables with \`[[0] * m] * n\`.** All rows are the same list; use a comprehension.
- **Forgetting \`cache_clear()\` between unrelated inputs.** A module-level \`@cache\` function keeps its results across test cases; that is fine for a pure function, wrong if the function reads outside data that changes.
- **Not stating the state in words.** Interviewers often stop a candidate who writes \`dp\` code before saying what \`dp[i]\` means.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Dynamic programming solves a problem by breaking it into subproblems, solving each distinct subproblem once, storing the answer, and reusing it. It applies when subproblems overlap and the answer is built from sub-answers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it helps:</strong> <span style="color:#f0e2c8;">Naive recursive Fibonacci made 2,692,537 calls for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(30)</code>; with a memo it made 59, because each of the 31 subproblems is solved once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Two styles:</strong> <span style="color:#f0e2c8;">Top-down memoization keeps the recursion and adds a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools.cache</code>; bottom-up tabulation fills a list from the base cases. Bottom-up avoids Python's 1000-frame recursion limit.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The recipe:</strong> <span style="color:#f0e2c8;">I state what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i]</code> means, write the recurrence from the last choice, set the base cases, pick a fill order, and say which cell is the answer. Time is states times work per state.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Space:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i]</code> only reads the last few entries I keep just those in variables, so Fibonacci becomes O(1) space with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev, cur = cur, prev + cur</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is DP different from divide and conquer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both split into subproblems, but divide and conquer (merge sort) has disjoint halves that are never reused. DP is for subproblems that repeat, so storing them pays off.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you prefer memoization over tabulation in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When only a small part of the state space is reachable, or the fill order is awkward. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@functools.cache</code> makes it one line. I switch to a loop when the depth could pass about 1000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is DP different from greedy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Greedy commits to the locally best choice; DP tries every last choice through the recurrence. For fewest squares, greedy turns 12 into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">9 + 1 + 1 + 1</code> while DP finds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">4 + 4 + 4</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the actual solution, not just the number?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store which choice won for each state (a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pick</code> list), then walk back from the answer cell to the base case, as Example 3 does to print the squares.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the running time of a DP in general?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Number of distinct states times the work to compute one state, plus any reconstruction. For fewest squares that is n states times up to √n choices, O(n√n).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Dynamic programming (DP)** | Solve each distinct subproblem once, store the answer, reuse it |
| **Subproblem** | A smaller instance of the same question |
| **Overlapping subproblems** | The same subproblem is needed many times; the reason DP saves work |
| **Optimal substructure** | The best overall answer is built from best answers to subproblems |
| **Memoization (top-down DP)** | Recursive function plus a cache checked before computing |
| **Tabulation (bottom-up DP)** | Fill a table from the base cases upward with a loop |
| **Space optimisation (rolling variables)** | Keep only the few earlier entries the recurrence reads |
| **State** | The meaning of one table entry, such as dp[i] = fewest squares summing to i |
| **Recurrence (transition)** | Formula for a state in terms of smaller states, usually from the last choice |
| **Base case** | A state answered directly, without the recurrence |
| **Greedy algorithm** | Take the locally best choice each step and never reconsider |
| **DP time formula** | Running time = number of states × work per state |
| **functools.cache** | Python 3.9+ decorator that memoizes a function with an unbounded dictionary |

---
**Conclusion:** Dynamic programming is the habit of solving each repeated subproblem once and storing the result. In Python that means a \`dict\`, a list, or \`functools.cache\` for top-down memoization, or a list filled in a loop for bottom-up tabulation — and bottom-up is usually the safer final answer because memoized recursion still hits the 1000-frame recursion limit. Learn the five-step recipe (state, recurrence, base cases, order, answer) and the cost formula (states × work per state), and every 1D DP question in this section becomes the same exercise.`,
        examples: [
          {
            label: "Fibonacci four ways: naive recursion, memoization, a table and two variables, with call counts",
            code: `calls = 0


def fib_naive(n):
    global calls
    calls += 1
    if n < 2:                             # base cases: fib(0) = 0, fib(1) = 1
        return n
    return fib_naive(n - 1) + fib_naive(n - 2)


def fib_memo(n, memo):
    global calls
    calls += 1
    if n < 2:
        return n
    if n in memo:                         # solved before: reuse the stored answer
        return memo[n]
    memo[n] = fib_memo(n - 1, memo) + fib_memo(n - 2, memo)
    return memo[n]


def fib_table(n):
    if n < 2:
        return n
    dp = [0] * (n + 1)                    # dp[i] will hold fib(i)
    dp[1] = 1
    for i in range(2, n + 1):             # smaller subproblems first
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]


def fib_two_vars(n):
    prev, cur = 0, 1                      # fib(i - 1), fib(i)
    for _ in range(n):
        prev, cur = cur, prev + cur
    return prev


def report(n):
    global calls
    calls = 0
    a = fib_naive(n)
    naive_calls = calls
    calls = 0
    b = fib_memo(n, {})
    memo_calls = calls
    return ("fib(" + str(n) + "): naive " + str(a) + " in " + str(naive_calls) + " calls | memo "
            + str(b) + " in " + str(memo_calls) + " calls | table " + str(fib_table(n))
            + " | two variables " + str(fib_two_vars(n)))


print(report(1))  # fib(1): naive 1 in 1 calls | memo 1 in 1 calls | table 1 | two variables 1
print(report(10))  # fib(10): naive 55 in 177 calls | memo 55 in 19 calls | table 55 | two variables 55
print(report(20))  # fib(20): naive 6765 in 21891 calls | memo 6765 in 39 calls | table 6765 | two variables 6765
print(report(30))  # fib(30): naive 832040 in 2692537 calls | memo 832040 in 59 calls | table 832040 | two variables 832040
`,
          },
          {
            label: "Overlapping subproblems: how often naive recursion re-solves each fib(k), and the finished table",
            code: `times = [0] * 7                           # times[k] = how often fib(k) was entered


def fib_naive(n):
    times[n] += 1
    if n < 2:
        return n
    return fib_naive(n - 1) + fib_naive(n - 2)


def fib_memo(n, memo, work):
    if n in memo:
        return memo[n]                    # a lookup, not a recomputation
    work[n] += 1                          # really solving fib(n) now
    memo[n] = n if n < 2 else fib_memo(n - 1, memo, work) + fib_memo(n - 2, memo, work)
    return memo[n]


fib_naive(6)
print("naive fib(6) solves each subproblem this many times:")
for k in range(6, -1, -1):
    print("  fib(" + str(k) + "): " + str(times[k]))
print("  total calls: " + str(sum(times)))

work = [0] * 7
fib_memo(6, {}, work)
print("memoized fib(6) solves each subproblem: " + str(work))

dp = [0] * 11
dp[1] = 1
for i in range(2, 11):
    dp[i] = dp[i - 1] + dp[i - 2]
print("bottom-up table for fib(10): " + str(dp))
`,
          },
          {
            label: "The DP recipe on a new problem: fewest perfect squares, where greedy fails",
            code: `def min_squares(n):
    """dp[i] = fewest perfect squares that add up to i."""
    INF = float("inf")
    dp = [0] + [INF] * n                  # base case: 0 needs no squares
    pick = [0] * (n + 1)                  # pick[i] = the square used last for i
    for i in range(1, n + 1):
        j = 1
        while j * j <= i:                 # try every square that fits
            if dp[i - j * j] + 1 < dp[i]:
                dp[i] = dp[i - j * j] + 1
                pick[i] = j * j
            j += 1
    parts, i = [], n
    while i > 0:                          # walk the choices back to 0
        parts.append(pick[i])
        i -= pick[i]
    return parts


def greedy_squares(n):
    parts = []
    while n > 0:
        j = 1
        while (j + 1) * (j + 1) <= n:     # largest square that still fits
            j += 1
        parts.append(j * j)
        n -= j * j
    return parts


def fmt(parts):
    return str(len(parts)) + " " + str(parts)


for n in [1, 12, 13, 18, 43]:
    print("n=" + str(n) + ": dp " + fmt(min_squares(n)) + " | greedy " + fmt(greedy_squares(n)))
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"What is dynamic programming? Explain the idea, then show me in JavaScript how you would make a slow recursive Fibonacci fast, and tell me how you decide that a problem needs DP."

**What a strong answer should cover:**
- DP = solve each overlapping subproblem once and reuse the stored answer; it needs overlapping subproblems and optimal substructure.
- Memoization (recursion + cache) versus tabulation (loop over a table), and dropping the table when only the last few entries are read.
- The recipe — state, recurrence, base cases, order, answer — and time = states × work per state.
- Why the naive recursion is exponential and the DP versions are O(n).
- JavaScript specifics: a \`Map\` (not a plain object, whose keys become strings) as the memo, \`Number\` losing integer precision above 2^53 - 1 (use \`BigInt\` for big counts), and the engine call-stack limit (\`RangeError\`) on deep recursion.

**Code / implementation expected:** Optional — a short JavaScript function (memoized or tabulated Fibonacci); the explanation matters more than the code.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should be comfortable with functions, loops and recursion.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A teacher writes \`1 + 1 + 1 + 1 + 1 + 1 + 1 + 1\` on the board and asks the class for the total. Everyone counts and says "eight". Then she adds one more \`+ 1\` at the end and asks again. Nobody counts again from the beginning: everyone says "nine" straight away, because they **remembered** the eight and only did one more addition.

That reflex — *do not redo work you have already done; write the answer down and reuse it* — is the whole of dynamic programming. A computer does not have the reflex. A plain recursive program will happily recount all eight ones every time it needs them, and on bigger problems that turns a job of a few hundred steps into millions or billions. Dynamic programming is the discipline of noticing that the same small question keeps being asked, answering it once, and storing the answer.

It matters in interviews because a large family of questions — [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem), [house robber](/interview-question/how-do-you-solve-the-house-robber-problem), [coin change](/interview-question/how-do-you-solve-the-coin-change-problem), [word break](/interview-question/how-do-you-solve-the-word-break-problem), [longest increasing subsequence](/interview-question/how-do-you-find-the-longest-increasing-subsequence), [0/1 knapsack](/interview-question/how-do-you-solve-the-0-1-knapsack-problem) — are all solved with the same five-step recipe. Learn the recipe once and those questions stop being puzzles and become fill-in-the-blanks.

## 2. The Core Idea in Plain Words

Take the Fibonacci numbers: 0, 1, 1, 2, 3, 5, 8, 13, … Each number is the sum of the two before it. Written as a rule:

- \`fib(0) = 0\`, \`fib(1) = 1\`
- \`fib(n) = fib(n - 1) + fib(n - 2)\` for \`n >= 2\`

The obvious program copies that rule into a recursive function. It is correct, but look at what it does for \`fib(5)\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 350" role="img" aria-label="Recursion tree of fib 5. fib 3 is computed twice and fib 2 three times, shown highlighted">
  <line class="d-edge" x1="448" y1="54" x2="274" y2="94"/>
  <line class="d-edge" x1="448" y1="54" x2="622" y2="94"/>
  <line class="d-edge" x1="274" y1="124" x2="172" y2="164"/>
  <line class="d-edge" x1="274" y1="124" x2="375" y2="164"/>
  <line class="d-edge" x1="622" y1="124" x2="555" y2="164"/>
  <line class="d-edge" x1="622" y1="124" x2="690" y2="164"/>
  <line class="d-edge" x1="172" y1="194" x2="105" y2="234"/>
  <line class="d-edge" x1="172" y1="194" x2="240" y2="234"/>
  <line class="d-edge" x1="375" y1="194" x2="330" y2="234"/>
  <line class="d-edge" x1="375" y1="194" x2="420" y2="234"/>
  <line class="d-edge" x1="555" y1="194" x2="510" y2="234"/>
  <line class="d-edge" x1="555" y1="194" x2="600" y2="234"/>
  <line class="d-edge" x1="105" y1="264" x2="60" y2="304"/>
  <line class="d-edge" x1="105" y1="264" x2="150" y2="304"/>
  <rect class="d-box" x="418" y="24" width="60" height="30" rx="6"/>
  <text class="d-text" x="448" y="44" text-anchor="middle">fib(5)</text>
  <rect class="d-box" x="244" y="94" width="60" height="30" rx="6"/>
  <text class="d-text" x="274" y="114" text-anchor="middle">fib(4)</text>
  <rect class="d-box-accent" x="592" y="94" width="60" height="30" rx="6"/>
  <text class="d-text" x="622" y="114" text-anchor="middle">fib(3)</text>
  <rect class="d-box-accent" x="142" y="164" width="60" height="30" rx="6"/>
  <text class="d-text" x="172" y="184" text-anchor="middle">fib(3)</text>
  <rect class="d-box-accent" x="345" y="164" width="60" height="30" rx="6"/>
  <text class="d-text" x="375" y="184" text-anchor="middle">fib(2)</text>
  <rect class="d-box-accent" x="525" y="164" width="60" height="30" rx="6"/>
  <text class="d-text" x="555" y="184" text-anchor="middle">fib(2)</text>
  <rect class="d-box-muted" x="660" y="164" width="60" height="30" rx="6"/>
  <text class="d-text" x="690" y="184" text-anchor="middle">fib(1)</text>
  <rect class="d-box-accent" x="75" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="105" y="254" text-anchor="middle">fib(2)</text>
  <rect class="d-box-muted" x="210" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="240" y="254" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="300" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="330" y="254" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="390" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="420" y="254" text-anchor="middle">fib(0)</text>
  <rect class="d-box-muted" x="480" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="510" y="254" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="570" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="600" y="254" text-anchor="middle">fib(0)</text>
  <rect class="d-box-muted" x="30" y="304" width="60" height="30" rx="6"/>
  <text class="d-text" x="60" y="324" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="120" y="304" width="60" height="30" rx="6"/>
  <text class="d-text" x="150" y="324" text-anchor="middle">fib(0)</text>
</svg>

The highlighted boxes are repeats: \`fib(3)\` is worked out twice and \`fib(2)\` three times, from scratch each time. The tree roughly doubles in size each time \`n\` grows by one or two, so the work explodes. Example 1 below counts the calls: **2,692,537 calls** for \`fib(30)\`.

📌 **Interview term: Subproblem** — a smaller instance of the same question whose answer helps answer the big one. Here \`fib(3)\` is a subproblem of \`fib(5)\`.

📌 **Interview term: Overlapping subproblems** — the same subproblem is needed many times by different branches of the computation. This is the first sign that DP will help. (Contrast with [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work), whose halves never overlap: there is nothing to reuse, so it is plain divide and conquer, not DP.)

📌 **Interview term: Optimal substructure** — the best answer to the big problem can be built from best answers to its subproblems. For counting problems like Fibonacci it simply means "the answer is a combination of sub-answers"; for optimisation problems (shortest, cheapest, largest) it means an optimal solution contains optimal solutions to its pieces.

📌 **Interview term: Dynamic programming (DP)** — solving a problem that has overlapping subproblems and optimal substructure by solving **each distinct subproblem once**, storing its answer, and looking it up whenever it is needed again.

The name is famously unhelpful. Richard Bellman chose it at the RAND Corporation in the early 1950s. In his autobiography he explains that "programming" meant planning and decision-making (as in a schedule), and that he wanted a name that would not upset a Secretary of Defense who disliked the word "research" — "dynamic", he wrote, is impossible to use in a pejorative sense. Stuart Dreyfus retells the story, quoting Bellman, in [Richard Bellman on the Birth of Dynamic Programming](https://web.cs.miami.edu/home/odelia/teaching/csc317_fall19/syllabus/dy_birth.pdf). It has nothing to do with "dynamic" memory or "programming" a computer.

## 3. Two Ways to Store the Answers

There are two standard ways to "solve each subproblem once". Both give the same answers and the same big-O time; they differ in the direction of the work.

📌 **Interview term: Memoization (top-down DP)** — keep the natural recursive function, but before computing \`f(k)\` check a cache; after computing it, store it. The recursion still starts at the big problem and works downward, but every subproblem is computed only the first time it is asked for. (The general technique, outside algorithms, is covered on the [memoization](/interview-question/what-is-memoization) page.)

📌 **Interview term: Tabulation (bottom-up DP)** — no recursion at all. Make a table (usually an array) \`dp\`, fill in the base cases, then fill the entries in an order where everything an entry depends on is already filled. The answer is read from the table at the end.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 170" role="img" aria-label="A dp table for Fibonacci with indexes 0 to 7 holding 0 1 1 2 3 5 8 13. dp 6 is filled from dp 5 and dp 4">
  <defs>
    <marker id="b27q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge-accent" d="M 390 72 Q 470 18 546 70" marker-end="url(#b27q1-arrow)"/>
  <path class="d-edge-accent" d="M 470 72 Q 510 46 546 70" marker-end="url(#b27q1-arrow)"/>
  <rect class="d-box-muted" x="40" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="70" y="103" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="120" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="150" y="103" text-anchor="middle">1</text>
  <rect class="d-box" x="200" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="230" y="103" text-anchor="middle">1</text>
  <rect class="d-box" x="280" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="310" y="103" text-anchor="middle">2</text>
  <rect class="d-box" x="360" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="390" y="103" text-anchor="middle">3</text>
  <rect class="d-box" x="440" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="470" y="103" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="520" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="550" y="103" text-anchor="middle">8</text>
  <rect class="d-box" x="600" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="630" y="103" text-anchor="middle">13</text>
  <text class="d-sub" x="70" y="146" text-anchor="middle">dp[0]</text>
  <text class="d-sub" x="150" y="146" text-anchor="middle">dp[1]</text>
  <text class="d-sub" x="230" y="146" text-anchor="middle">dp[2]</text>
  <text class="d-sub" x="310" y="146" text-anchor="middle">dp[3]</text>
  <text class="d-sub" x="390" y="146" text-anchor="middle">dp[4]</text>
  <text class="d-sub" x="470" y="146" text-anchor="middle">dp[5]</text>
  <text class="d-sub" x="550" y="146" text-anchor="middle">dp[6]</text>
  <text class="d-sub" x="630" y="146" text-anchor="middle">dp[7]</text>
</svg>

The grey cells are the base cases. Filling from left to right guarantees that when we reach \`dp[6]\`, both \`dp[5]\` and \`dp[4]\` already hold their final values, so \`dp[6] = 5 + 3 = 8\` is one addition.

| | Memoization (top-down) | Tabulation (bottom-up) |
| :--- | :--- | :--- |
| Shape of the code | Recursive function plus a cache | Loop over a table |
| Which subproblems get solved | Only the ones actually reached from the top | All of them, in a fixed order |
| Stack depth | Up to the depth of the recursion (n for Fibonacci) | None beyond the loop |
| Easiest when | The recurrence is obvious but the fill order is not | The order is simple (left to right, row by row) |
| Space saving trick | Hard | Often easy: keep only the last few entries |

📌 **Interview term: Space optimisation (rolling variables)** — when \`dp[i]\` depends only on a fixed number of earlier entries, keep just those entries in variables instead of the whole table. Fibonacci needs only the last two values, so O(n) memory becomes O(1).

## 4. The Five-Step DP Recipe

Every 1D DP question in this batch is solved by writing down these five things, in this order, **before** writing code:

<svg class="iq-diagram" width="100%" viewBox="0 0 900 150" role="img" aria-label="Five boxes in a row: state, recurrence, base cases, order, answer">
  <defs>
    <marker id="b27q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="12" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="82" y="70" text-anchor="middle">1. State</text>
  <text class="d-sub" x="82" y="92" text-anchor="middle">what dp[i] means</text>
  <path class="d-edge" d="M 154 75 L 192 75" marker-end="url(#b27q1-arrow2)"/>
  <rect class="d-box" x="196" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="266" y="70" text-anchor="middle">2. Recurrence</text>
  <text class="d-sub" x="266" y="92" text-anchor="middle">dp[i] from smaller i</text>
  <path class="d-edge" d="M 338 75 L 376 75" marker-end="url(#b27q1-arrow2)"/>
  <rect class="d-box" x="380" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="450" y="70" text-anchor="middle">3. Base cases</text>
  <text class="d-sub" x="450" y="92" text-anchor="middle">the smallest i</text>
  <path class="d-edge" d="M 522 75 L 560 75" marker-end="url(#b27q1-arrow2)"/>
  <rect class="d-box" x="564" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="634" y="70" text-anchor="middle">4. Order</text>
  <text class="d-sub" x="634" y="92" text-anchor="middle">fill so inputs exist</text>
  <path class="d-edge" d="M 706 75 L 744 75" marker-end="url(#b27q1-arrow2)"/>
  <rect class="d-box-muted" x="748" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="818" y="70" text-anchor="middle">5. Answer</text>
  <text class="d-sub" x="818" y="92" text-anchor="middle">which cell to return</text>
</svg>

📌 **Interview term: State** — the precise meaning of one table entry, in words. "\`dp[i]\` = the fewest perfect squares that add up to \`i\`." If you cannot say the state in one sentence, the rest will not work.

📌 **Interview term: Recurrence (transition)** — the formula that computes a state from smaller states. It usually comes from asking "what was the **last** choice?" — the last step taken, the last coin used, whether the last house was robbed.

📌 **Interview term: Base case** — the states small enough to answer directly, with no recurrence: \`fib(0) = 0\`, "zero needs zero squares". The [recursion and base case](/interview-question/what-is-recursion-and-what-is-a-base-case) page covers the idea in general.

Let us run the recipe on a problem that is *not* Fibonacci, to see it is a method and not a trick. **Fewest perfect squares:** what is the smallest number of perfect squares (1, 4, 9, 16, …) that add up to \`n\`?

1. **State:** \`dp[i]\` = the fewest squares that sum to \`i\`.
2. **Recurrence:** the last square used was some \`j*j <= i\`, and the rest must sum to \`i - j*j\` as cheaply as possible: \`dp[i] = 1 + min(dp[i - j*j])\` over every \`j\` with \`j*j <= i\`.
3. **Base case:** \`dp[0] = 0\`.
4. **Order:** \`i\` from 1 up to \`n\`; every \`i - j*j\` is smaller than \`i\`, so it is already filled.
5. **Answer:** \`dp[n]\`.

That is O(n · √n) time and O(n) space. Example 3 runs it and compares it with the greedy idea "always take the biggest square that fits". Greedy turns 12 into \`9 + 1 + 1 + 1\` (4 squares) while DP finds \`4 + 4 + 4\` (3 squares), and for 43 greedy needs 5 squares where DP needs 3.

📌 **Interview term: Greedy algorithm** — make the locally best choice at every step and never reconsider. It is faster when it works, but it can be wrong when an early "best" choice blocks a better overall answer; DP considers every last choice instead. See [what is a greedy algorithm](/interview-question/what-is-a-greedy-algorithm), and the coin-change version of the same trap on [coin change](/interview-question/how-do-you-solve-the-coin-change-problem).

| Technique | Subproblems overlap? | Tries every choice? | Typical cost |
| :--- | :--- | :--- | :--- |
| Plain recursion / brute force | Yes, but recomputed | Yes | Often exponential |
| Divide and conquer | No (halves are disjoint) | Not needed | e.g. O(n log n) |
| Greedy | — | No, one choice per step | Fast, but needs a proof |
| Dynamic programming | Yes, each solved once | Yes, via the recurrence | (number of states) × (work per state) |

📌 **Interview term: DP time formula** — the running time of a DP is **number of states × work per state**. Fibonacci: n states × O(1) = O(n). Perfect squares: n states × O(√n) choices = O(n√n). Saying this formula out loud is the fastest way to give a correct [Big-O](/interview-question/what-is-big-o-notation) for any DP.

## 5. The JavaScript Code, Line by Line

**Memoization with a \`Map\`:**

~~~javascript
function fibMemo(n, memo) {
  calls++;
  if (n < 2) return n;
  if (memo.has(n)) return memo.get(n);   // solved before: reuse the stored answer
  const value = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, value);
  return value;
}
~~~

**Tabulation with an array:**

~~~javascript
function fibTable(n) {
  if (n < 2) return n;
  const dp = new Array(n + 1).fill(0);   // dp[i] will hold fib(i)
  dp[1] = 1;
  for (let i = 2; i <= n; i++) {         // smaller subproblems first
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}
~~~

**Rolling variables** with destructuring assignment:

~~~javascript
function fibTwoVars(n) {
  let prev = 0, cur = 1;                 // fib(i - 1), fib(i)
  for (let i = 0; i < n; i++) {
    [prev, cur] = [cur, prev + cur];
  }
  return prev;
}
~~~

What each JavaScript piece is doing:

- **\`Map\` instead of \`{}\`.** A \`Map\` keeps keys as the numbers you gave it and has \`has\`/\`get\`/\`set\`. A plain object converts every key to a string (\`Object.keys\` of \`{1: "a"}\` gives the string \`"1"\`), which is harmless for integer keys but surprising for composite keys and slower to reason about. For keys \`0..n\` a plain array \`new Array(n + 1)\` is the fastest memo of all.
- **\`new Array(n + 1).fill(0)\`** creates a real, dense array of zeros. Do not use \`.fill([])\` or \`.fill(new Array(m).fill(0))\` for 2D tables — every row is then the **same** array. When this was run, writing \`grid[0][0] = 7\` printed \`[[7,0,0],[7,0,0],[7,0,0]]\`; \`Array.from({ length: 3 }, () => new Array(3).fill(0))\` gave the correct \`[[7,0,0],[0,0,0],[0,0,0]]\`.
- **\`[prev, cur] = [cur, prev + cur]\`** builds a temporary array each step; it reads well, but in a hot loop a temporary variable (\`const next = prev + cur\`) avoids the allocation.

📌 **Interview term: \`Number.MAX_SAFE_INTEGER\`** — JavaScript numbers are 64-bit floating point, so integers are exact only up to 2^53 - 1 = 9007199254740991. DP counts grow fast. Running a memoized \`fib\` with plain numbers and a deep call printed:

~~~text
RangeError: Maximum call stack size exceeded
fib(90) as Number = 2880067194370816000 (exact: 2880067194370816120)
~~~

Two separate lessons: \`fib(100000)\` recursed too deep for the engine stack, even though memoization made the **work** linear — memoization removes repeated work, not depth. And \`fib(90)\` came out wrong in the last digits because it is above 2^53. For exact big counts use \`BigInt\` (\`1n\`, \`2n\`, …), as the [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem) page shows; for problems that say "return the answer modulo 1e9+7", keep every intermediate below 2^53 by taking the modulo after each addition.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`node main.js\` (Node.js 22; the programs are plain browser-safe scripts, so the page runner prints the same). The same programs in the other three languages print exactly the same lines.

**Example 1 — Fibonacci four ways: naive recursion, memoization, a table and two variables, with call counts** printed:

~~~text
fib(1): naive 1 in 1 calls | memo 1 in 1 calls | table 1 | two variables 1
fib(10): naive 55 in 177 calls | memo 55 in 19 calls | table 55 | two variables 55
fib(20): naive 6765 in 21891 calls | memo 6765 in 39 calls | table 6765 | two variables 6765
fib(30): naive 832040 in 2692537 calls | memo 832040 in 59 calls | table 832040 | two variables 832040
~~~

**Example 2 — Overlapping subproblems: how often naive recursion re-solves each fib(k), and the finished table** printed:

~~~text
naive fib(6) solves each subproblem this many times:
  fib(6): 1
  fib(5): 1
  fib(4): 2
  fib(3): 3
  fib(2): 5
  fib(1): 8
  fib(0): 5
  total calls: 25
memoized fib(6) solves each subproblem: [1, 1, 1, 1, 1, 1, 1]
bottom-up table for fib(10): [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]
~~~

**Example 3 — The DP recipe on a new problem: fewest perfect squares, where greedy fails** printed:

~~~text
n=1: dp 1 [1] | greedy 1 [1]
n=12: dp 3 [4, 4, 4] | greedy 4 [9, 1, 1, 1]
n=13: dp 2 [4, 9] | greedy 2 [9, 4]
n=18: dp 2 [9, 9] | greedy 3 [16, 1, 1]
n=43: dp 3 [9, 9, 25] | greedy 5 [36, 4, 1, 1, 1]
~~~

Example 1 shows the gap: for \`fib(30)\` the naive recursion made 2,692,537 calls while the memoized version made 59 (that is \`2n - 1\`: one call for each subproblem plus one repeat lookup per level). Example 2 shows why: naive \`fib(6)\` solved \`fib(1)\` eight times and \`fib(2)\` five times, while the memoized version solved each subproblem exactly once. Example 3 shows that DP is not only Fibonacci: the same recipe finds 3 squares for 12 and 43 where the greedy rule needs 4 and 5.

## Complexity

| Version | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Naive recursion | O(φⁿ), about O(1.618ⁿ) | O(n) stack | The call tree grows like Fibonacci itself: 2,692,537 calls for n = 30 in Example 1 |
| Memoization | O(n) | O(n) cache + O(n) stack | Each of the n + 1 subproblems is solved once; Example 1 shows 2n - 1 calls (59 for n = 30) |
| Tabulation | O(n) | O(n) table | One loop step per entry |
| Two rolling variables | O(n) | O(1) | Only the last two entries are ever read |
| Perfect squares DP | O(n√n) | O(n) | n states, up to √n choices each |

The call count of the naive version is exactly \`2·fib(n+1) - 1\`: 177 for n = 10, 21891 for n = 20 — the counts in Example 1 match that formula. For the stack cost of recursion see [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## How to Recognise a DP Problem

- The question asks for a **count** ("how many ways"), a **best value** ("minimum cost", "maximum profit", "longest"), or a **yes/no feasibility** ("can it be split", "can you reach").
- The input is a sequence, a string, a grid, or an amount, and a choice is made at each position (take it or skip it, step 1 or 2, which coin).
- A brute-force recursion is easy to write but tries the same smaller inputs again and again.
- The problem says "you cannot pick two adjacent…" or "each item at most once" — a constraint that links one choice to the next, which greedy usually gets wrong.

In this batch the 1D questions build on each other: [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem) is Fibonacci in disguise, [house robber](/interview-question/how-do-you-solve-the-house-robber-problem) adds a take-or-skip choice, and [maximum subarray](/interview-question/how-do-you-find-the-maximum-subarray-sum) (Kadane) is a DP whose table you never store. The companion batch continues with [maximum product subarray](/interview-question/how-do-you-find-the-maximum-product-subarray), [coin change](/interview-question/how-do-you-solve-the-coin-change-problem), [unique paths](/interview-question/how-do-you-count-unique-paths-in-a-grid), [decode ways](/interview-question/decode-ways-dp-how-do-you-handle-0-and-06-edge-cases) and [word break](/interview-question/how-do-you-solve-the-word-break-problem).

## Edge Cases

- **The smallest inputs** — \`fib(0)\` and \`fib(1)\` are base cases; a table of size \`n + 1\` must still exist for \`n = 0\` (the code returns early instead).
- **Large n** — the answer outgrows fixed-size integers (see each language note above) and recursive memoization outgrows the stack. Bottom-up plus a big-enough number type, or a modulo, fixes both.
- **"Unknown" versus a real zero** — if 0 can be a valid answer, mark unsolved cache entries with something else (\`None\`, \`-1\`, a missing key).
- **Greedy-looking problems** — perfect squares and coin change look greedy; always test one small counterexample (12 = 4 + 4 + 4) before trusting greedy.

## Common Pitfalls

- **Calling it DP without overlapping subproblems.** Caching merge sort halves saves nothing; say why the subproblems repeat.
- **Plain numbers for big counts.** Above 2^53 - 1 results silently lose precision (\`fib(90)\` above). Use \`BigInt\` or the modulo the problem asks for.
- **\`new Array(n).fill([])\` for 2D tables.** Every row is the same array; use \`Array.from({ length: n }, () => ...)\`.
- **A module-level memo reused across inputs.** Fine for a pure function like \`fib\`, wrong as soon as the memo depends on an input array — create it inside the outer function.
- **Deep top-down recursion.** Memoized recursion still nests O(n) calls and hit \`RangeError: Maximum call stack size exceeded\` for \`fib(100000)\`. Prefer the loop.
- **Not stating the state in words** before writing \`dp\` code.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Dynamic programming solves each distinct subproblem once, stores the answer, and reuses it. It applies when subproblems overlap and the answer is built from sub-answers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it helps:</strong> <span style="color:#f0e2c8;">Naive recursive Fibonacci made 2,692,537 calls for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(30)</code>; memoized with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> it made 59, because each subproblem is solved once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Two styles:</strong> <span style="color:#f0e2c8;">Top-down memoization keeps the recursion plus a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> cache; bottom-up tabulation fills an array with a loop. Bottom-up avoids the engine stack limit, which a memoized <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(100000)</code> hit with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The recipe:</strong> <span style="color:#f0e2c8;">I state what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i]</code> means, write the recurrence from the last choice, set base cases, choose the fill order, and name the answer cell. Time is states times work per state.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Numbers:</strong> <span style="color:#f0e2c8;">Counts grow fast and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number</code> is exact only to 2^53 - 1, so for big exact results I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code>, or apply the modulo the problem asks for at every step.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> rather than an object for the memo?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Object keys become strings and inherit prototype keys; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> keeps real keys and has clear <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>. For integer keys <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0..n</code> a plain array is fastest.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is DP different from divide and conquer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Divide and conquer has disjoint subproblems (merge sort halves) that are never reused; DP is for subproblems that repeat.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is DP different from greedy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Greedy takes the locally best choice and never reconsiders; DP tries every last choice. For fewest squares, greedy gives 4 squares for 12 and DP gives 3.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you reconstruct the chosen items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pick</code> array recording which choice won at each state, then walk back from the answer, as Example 3 prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[4, 4, 4]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a memoize helper the same as DP?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A generic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memoize(fn)</code> wrapper is the caching half of top-down DP. DP is the whole method: defining states and a recurrence so that caching makes the work polynomial.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Dynamic programming (DP)** | Solve each distinct subproblem once, store the answer, reuse it |
| **Subproblem** | A smaller instance of the same question |
| **Overlapping subproblems** | The same subproblem is needed many times; the reason DP saves work |
| **Optimal substructure** | The best overall answer is built from best answers to subproblems |
| **Memoization (top-down DP)** | Recursive function plus a cache checked before computing |
| **Tabulation (bottom-up DP)** | Fill a table from the base cases upward with a loop |
| **Space optimisation (rolling variables)** | Keep only the few earlier entries the recurrence reads |
| **State** | The meaning of one table entry, such as dp[i] = fewest squares summing to i |
| **Recurrence (transition)** | Formula for a state in terms of smaller states, usually from the last choice |
| **Base case** | A state answered directly, without the recurrence |
| **Greedy algorithm** | Take the locally best choice each step and never reconsider |
| **DP time formula** | Running time = number of states × work per state |
| **Number.MAX_SAFE_INTEGER** | 2^53 - 1, the largest integer a JavaScript number holds exactly |

---
**Conclusion:** Dynamic programming is the habit of solving each repeated subproblem once and storing the result. In JavaScript that means a \`Map\` or array memo for top-down, or an array filled in a loop for bottom-up — and bottom-up is usually the safer final answer because memoized recursion still overflows the call stack on large inputs. Keep \`Number\` precision in mind (exact only to 2^53 - 1; use \`BigInt\` or a modulo), learn the five-step recipe and the states × work-per-state formula, and every 1D DP question in this section follows the same pattern.`,
        examples: [
          {
            label: "Fibonacci four ways: naive recursion, memoization, a table and two variables, with call counts",
            code: `let calls = 0;

function fibNaive(n) {
  calls++;
  if (n < 2) return n;                   // base cases: fib(0) = 0, fib(1) = 1
  return fibNaive(n - 1) + fibNaive(n - 2);
}

function fibMemo(n, memo) {
  calls++;
  if (n < 2) return n;
  if (memo.has(n)) return memo.get(n);   // solved before: reuse the stored answer
  const value = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, value);
  return value;
}

function fibTable(n) {
  if (n < 2) return n;
  const dp = new Array(n + 1).fill(0);   // dp[i] will hold fib(i)
  dp[1] = 1;
  for (let i = 2; i <= n; i++) {         // smaller subproblems first
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}

function fibTwoVars(n) {
  let prev = 0, cur = 1;                 // fib(i - 1), fib(i)
  for (let i = 0; i < n; i++) {
    [prev, cur] = [cur, prev + cur];
  }
  return prev;
}

function report(n) {
  calls = 0;
  const a = fibNaive(n);
  const naiveCalls = calls;
  calls = 0;
  const b = fibMemo(n, new Map());
  const memoCalls = calls;
  return "fib(" + n + "): naive " + a + " in " + naiveCalls + " calls | memo " +
    b + " in " + memoCalls + " calls | table " + fibTable(n) +
    " | two variables " + fibTwoVars(n);
}

console.log(report(1)); // fib(1): naive 1 in 1 calls | memo 1 in 1 calls | table 1 | two variables 1
console.log(report(10)); // fib(10): naive 55 in 177 calls | memo 55 in 19 calls | table 55 | two variables 55
console.log(report(20)); // fib(20): naive 6765 in 21891 calls | memo 6765 in 39 calls | table 6765 | two variables 6765
console.log(report(30)); // fib(30): naive 832040 in 2692537 calls | memo 832040 in 59 calls | table 832040 | two variables 832040
`,
          },
          {
            label: "Overlapping subproblems: how often naive recursion re-solves each fib(k), and the finished table",
            code: `const times = new Array(7).fill(0);      // times[k] = how often fib(k) was entered

function fibNaive(n) {
  times[n]++;
  if (n < 2) return n;
  return fibNaive(n - 1) + fibNaive(n - 2);
}

function fibMemo(n, memo, work) {
  if (memo.has(n)) return memo.get(n);   // a lookup, not a recomputation
  work[n]++;                             // really solving fib(n) now
  const value = n < 2 ? n : fibMemo(n - 1, memo, work) + fibMemo(n - 2, memo, work);
  memo.set(n, value);
  return value;
}

function fmt(arr) {
  return "[" + arr.join(", ") + "]";
}

fibNaive(6);
console.log("naive fib(6) solves each subproblem this many times:");
for (let k = 6; k >= 0; k--) {
  console.log("  fib(" + k + "): " + times[k]);
}
console.log("  total calls: " + times.reduce((a, b) => a + b, 0));

const work = new Array(7).fill(0);
fibMemo(6, new Map(), work);
console.log("memoized fib(6) solves each subproblem: " + fmt(work));

const dp = new Array(11).fill(0);
dp[1] = 1;
for (let i = 2; i <= 10; i++) {
  dp[i] = dp[i - 1] + dp[i - 2];
}
console.log("bottom-up table for fib(10): " + fmt(dp));
`,
          },
          {
            label: "The DP recipe on a new problem: fewest perfect squares, where greedy fails",
            code: `function minSquares(n) {
  // dp[i] = fewest perfect squares that add up to i
  const dp = new Array(n + 1).fill(Infinity);
  dp[0] = 0;                               // base case: 0 needs no squares
  const pick = new Array(n + 1).fill(0);   // pick[i] = the square used last for i
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j * j <= i; j++) {     // try every square that fits
      if (dp[i - j * j] + 1 < dp[i]) {
        dp[i] = dp[i - j * j] + 1;
        pick[i] = j * j;
      }
    }
  }
  const parts = [];
  for (let i = n; i > 0; i -= pick[i]) {   // walk the choices back to 0
    parts.push(pick[i]);
  }
  return parts;
}

function greedySquares(n) {
  const parts = [];
  while (n > 0) {
    let j = 1;
    while ((j + 1) * (j + 1) <= n) j++;    // largest square that still fits
    parts.push(j * j);
    n -= j * j;
  }
  return parts;
}

function fmt(parts) {
  return parts.length + " [" + parts.join(", ") + "]";
}

for (const n of [1, 12, 13, 18, 43]) {
  console.log("n=" + n + ": dp " + fmt(minSquares(n)) + " | greedy " + fmt(greedySquares(n)));
}
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"What is dynamic programming? Explain the idea, then show me in Java how you would turn a slow recursive Fibonacci into a DP solution, and tell me when DP is the right tool."

**What a strong answer should cover:**
- DP = solve each overlapping subproblem once and reuse the stored answer; it needs overlapping subproblems and optimal substructure.
- Memoization (recursion + \`HashMap\` or array cache) versus tabulation (loop filling an \`int[]\`/\`long[]\`), and the O(1)-space rolling version.
- The recipe — state, recurrence, base cases, order, answer — and time = states × work per state.
- Why naive recursion is exponential and DP is O(n).
- Java specifics: arrays are zero-filled by default, \`int\` overflows silently (fib(47) wraps negative; use \`long\` or \`Math.addExact\`), \`HashMap<Integer, Integer>\` boxes every key and value (compare with \`equals\`, not \`==\`), and deep memoized recursion can throw \`StackOverflowError\`.

**Code / implementation expected:** Optional — a short Java method (memoized or tabulated Fibonacci); the explanation matters more than the code.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should be comfortable with functions, loops and recursion.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A teacher writes \`1 + 1 + 1 + 1 + 1 + 1 + 1 + 1\` on the board and asks the class for the total. Everyone counts and says "eight". Then she adds one more \`+ 1\` at the end and asks again. Nobody counts again from the beginning: everyone says "nine" straight away, because they **remembered** the eight and only did one more addition.

That reflex — *do not redo work you have already done; write the answer down and reuse it* — is the whole of dynamic programming. A computer does not have the reflex. A plain recursive program will happily recount all eight ones every time it needs them, and on bigger problems that turns a job of a few hundred steps into millions or billions. Dynamic programming is the discipline of noticing that the same small question keeps being asked, answering it once, and storing the answer.

It matters in interviews because a large family of questions — [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem), [house robber](/interview-question/how-do-you-solve-the-house-robber-problem), [coin change](/interview-question/how-do-you-solve-the-coin-change-problem), [word break](/interview-question/how-do-you-solve-the-word-break-problem), [longest increasing subsequence](/interview-question/how-do-you-find-the-longest-increasing-subsequence), [0/1 knapsack](/interview-question/how-do-you-solve-the-0-1-knapsack-problem) — are all solved with the same five-step recipe. Learn the recipe once and those questions stop being puzzles and become fill-in-the-blanks.

## 2. The Core Idea in Plain Words

Take the Fibonacci numbers: 0, 1, 1, 2, 3, 5, 8, 13, … Each number is the sum of the two before it. Written as a rule:

- \`fib(0) = 0\`, \`fib(1) = 1\`
- \`fib(n) = fib(n - 1) + fib(n - 2)\` for \`n >= 2\`

The obvious program copies that rule into a recursive function. It is correct, but look at what it does for \`fib(5)\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 350" role="img" aria-label="Recursion tree of fib 5. fib 3 is computed twice and fib 2 three times, shown highlighted">
  <line class="d-edge" x1="448" y1="54" x2="274" y2="94"/>
  <line class="d-edge" x1="448" y1="54" x2="622" y2="94"/>
  <line class="d-edge" x1="274" y1="124" x2="172" y2="164"/>
  <line class="d-edge" x1="274" y1="124" x2="375" y2="164"/>
  <line class="d-edge" x1="622" y1="124" x2="555" y2="164"/>
  <line class="d-edge" x1="622" y1="124" x2="690" y2="164"/>
  <line class="d-edge" x1="172" y1="194" x2="105" y2="234"/>
  <line class="d-edge" x1="172" y1="194" x2="240" y2="234"/>
  <line class="d-edge" x1="375" y1="194" x2="330" y2="234"/>
  <line class="d-edge" x1="375" y1="194" x2="420" y2="234"/>
  <line class="d-edge" x1="555" y1="194" x2="510" y2="234"/>
  <line class="d-edge" x1="555" y1="194" x2="600" y2="234"/>
  <line class="d-edge" x1="105" y1="264" x2="60" y2="304"/>
  <line class="d-edge" x1="105" y1="264" x2="150" y2="304"/>
  <rect class="d-box" x="418" y="24" width="60" height="30" rx="6"/>
  <text class="d-text" x="448" y="44" text-anchor="middle">fib(5)</text>
  <rect class="d-box" x="244" y="94" width="60" height="30" rx="6"/>
  <text class="d-text" x="274" y="114" text-anchor="middle">fib(4)</text>
  <rect class="d-box-accent" x="592" y="94" width="60" height="30" rx="6"/>
  <text class="d-text" x="622" y="114" text-anchor="middle">fib(3)</text>
  <rect class="d-box-accent" x="142" y="164" width="60" height="30" rx="6"/>
  <text class="d-text" x="172" y="184" text-anchor="middle">fib(3)</text>
  <rect class="d-box-accent" x="345" y="164" width="60" height="30" rx="6"/>
  <text class="d-text" x="375" y="184" text-anchor="middle">fib(2)</text>
  <rect class="d-box-accent" x="525" y="164" width="60" height="30" rx="6"/>
  <text class="d-text" x="555" y="184" text-anchor="middle">fib(2)</text>
  <rect class="d-box-muted" x="660" y="164" width="60" height="30" rx="6"/>
  <text class="d-text" x="690" y="184" text-anchor="middle">fib(1)</text>
  <rect class="d-box-accent" x="75" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="105" y="254" text-anchor="middle">fib(2)</text>
  <rect class="d-box-muted" x="210" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="240" y="254" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="300" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="330" y="254" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="390" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="420" y="254" text-anchor="middle">fib(0)</text>
  <rect class="d-box-muted" x="480" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="510" y="254" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="570" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="600" y="254" text-anchor="middle">fib(0)</text>
  <rect class="d-box-muted" x="30" y="304" width="60" height="30" rx="6"/>
  <text class="d-text" x="60" y="324" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="120" y="304" width="60" height="30" rx="6"/>
  <text class="d-text" x="150" y="324" text-anchor="middle">fib(0)</text>
</svg>

The highlighted boxes are repeats: \`fib(3)\` is worked out twice and \`fib(2)\` three times, from scratch each time. The tree roughly doubles in size each time \`n\` grows by one or two, so the work explodes. Example 1 below counts the calls: **2,692,537 calls** for \`fib(30)\`.

📌 **Interview term: Subproblem** — a smaller instance of the same question whose answer helps answer the big one. Here \`fib(3)\` is a subproblem of \`fib(5)\`.

📌 **Interview term: Overlapping subproblems** — the same subproblem is needed many times by different branches of the computation. This is the first sign that DP will help. (Contrast with [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work), whose halves never overlap: there is nothing to reuse, so it is plain divide and conquer, not DP.)

📌 **Interview term: Optimal substructure** — the best answer to the big problem can be built from best answers to its subproblems. For counting problems like Fibonacci it simply means "the answer is a combination of sub-answers"; for optimisation problems (shortest, cheapest, largest) it means an optimal solution contains optimal solutions to its pieces.

📌 **Interview term: Dynamic programming (DP)** — solving a problem that has overlapping subproblems and optimal substructure by solving **each distinct subproblem once**, storing its answer, and looking it up whenever it is needed again.

The name is famously unhelpful. Richard Bellman chose it at the RAND Corporation in the early 1950s. In his autobiography he explains that "programming" meant planning and decision-making (as in a schedule), and that he wanted a name that would not upset a Secretary of Defense who disliked the word "research" — "dynamic", he wrote, is impossible to use in a pejorative sense. Stuart Dreyfus retells the story, quoting Bellman, in [Richard Bellman on the Birth of Dynamic Programming](https://web.cs.miami.edu/home/odelia/teaching/csc317_fall19/syllabus/dy_birth.pdf). It has nothing to do with "dynamic" memory or "programming" a computer.

## 3. Two Ways to Store the Answers

There are two standard ways to "solve each subproblem once". Both give the same answers and the same big-O time; they differ in the direction of the work.

📌 **Interview term: Memoization (top-down DP)** — keep the natural recursive function, but before computing \`f(k)\` check a cache; after computing it, store it. The recursion still starts at the big problem and works downward, but every subproblem is computed only the first time it is asked for. (The general technique, outside algorithms, is covered on the [memoization](/interview-question/what-is-memoization) page.)

📌 **Interview term: Tabulation (bottom-up DP)** — no recursion at all. Make a table (usually an array) \`dp\`, fill in the base cases, then fill the entries in an order where everything an entry depends on is already filled. The answer is read from the table at the end.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 170" role="img" aria-label="A dp table for Fibonacci with indexes 0 to 7 holding 0 1 1 2 3 5 8 13. dp 6 is filled from dp 5 and dp 4">
  <defs>
    <marker id="b27q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge-accent" d="M 390 72 Q 470 18 546 70" marker-end="url(#b27q1-arrow)"/>
  <path class="d-edge-accent" d="M 470 72 Q 510 46 546 70" marker-end="url(#b27q1-arrow)"/>
  <rect class="d-box-muted" x="40" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="70" y="103" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="120" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="150" y="103" text-anchor="middle">1</text>
  <rect class="d-box" x="200" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="230" y="103" text-anchor="middle">1</text>
  <rect class="d-box" x="280" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="310" y="103" text-anchor="middle">2</text>
  <rect class="d-box" x="360" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="390" y="103" text-anchor="middle">3</text>
  <rect class="d-box" x="440" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="470" y="103" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="520" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="550" y="103" text-anchor="middle">8</text>
  <rect class="d-box" x="600" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="630" y="103" text-anchor="middle">13</text>
  <text class="d-sub" x="70" y="146" text-anchor="middle">dp[0]</text>
  <text class="d-sub" x="150" y="146" text-anchor="middle">dp[1]</text>
  <text class="d-sub" x="230" y="146" text-anchor="middle">dp[2]</text>
  <text class="d-sub" x="310" y="146" text-anchor="middle">dp[3]</text>
  <text class="d-sub" x="390" y="146" text-anchor="middle">dp[4]</text>
  <text class="d-sub" x="470" y="146" text-anchor="middle">dp[5]</text>
  <text class="d-sub" x="550" y="146" text-anchor="middle">dp[6]</text>
  <text class="d-sub" x="630" y="146" text-anchor="middle">dp[7]</text>
</svg>

The grey cells are the base cases. Filling from left to right guarantees that when we reach \`dp[6]\`, both \`dp[5]\` and \`dp[4]\` already hold their final values, so \`dp[6] = 5 + 3 = 8\` is one addition.

| | Memoization (top-down) | Tabulation (bottom-up) |
| :--- | :--- | :--- |
| Shape of the code | Recursive function plus a cache | Loop over a table |
| Which subproblems get solved | Only the ones actually reached from the top | All of them, in a fixed order |
| Stack depth | Up to the depth of the recursion (n for Fibonacci) | None beyond the loop |
| Easiest when | The recurrence is obvious but the fill order is not | The order is simple (left to right, row by row) |
| Space saving trick | Hard | Often easy: keep only the last few entries |

📌 **Interview term: Space optimisation (rolling variables)** — when \`dp[i]\` depends only on a fixed number of earlier entries, keep just those entries in variables instead of the whole table. Fibonacci needs only the last two values, so O(n) memory becomes O(1).

## 4. The Five-Step DP Recipe

Every 1D DP question in this batch is solved by writing down these five things, in this order, **before** writing code:

<svg class="iq-diagram" width="100%" viewBox="0 0 900 150" role="img" aria-label="Five boxes in a row: state, recurrence, base cases, order, answer">
  <defs>
    <marker id="b27q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="12" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="82" y="70" text-anchor="middle">1. State</text>
  <text class="d-sub" x="82" y="92" text-anchor="middle">what dp[i] means</text>
  <path class="d-edge" d="M 154 75 L 192 75" marker-end="url(#b27q1-arrow2)"/>
  <rect class="d-box" x="196" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="266" y="70" text-anchor="middle">2. Recurrence</text>
  <text class="d-sub" x="266" y="92" text-anchor="middle">dp[i] from smaller i</text>
  <path class="d-edge" d="M 338 75 L 376 75" marker-end="url(#b27q1-arrow2)"/>
  <rect class="d-box" x="380" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="450" y="70" text-anchor="middle">3. Base cases</text>
  <text class="d-sub" x="450" y="92" text-anchor="middle">the smallest i</text>
  <path class="d-edge" d="M 522 75 L 560 75" marker-end="url(#b27q1-arrow2)"/>
  <rect class="d-box" x="564" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="634" y="70" text-anchor="middle">4. Order</text>
  <text class="d-sub" x="634" y="92" text-anchor="middle">fill so inputs exist</text>
  <path class="d-edge" d="M 706 75 L 744 75" marker-end="url(#b27q1-arrow2)"/>
  <rect class="d-box-muted" x="748" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="818" y="70" text-anchor="middle">5. Answer</text>
  <text class="d-sub" x="818" y="92" text-anchor="middle">which cell to return</text>
</svg>

📌 **Interview term: State** — the precise meaning of one table entry, in words. "\`dp[i]\` = the fewest perfect squares that add up to \`i\`." If you cannot say the state in one sentence, the rest will not work.

📌 **Interview term: Recurrence (transition)** — the formula that computes a state from smaller states. It usually comes from asking "what was the **last** choice?" — the last step taken, the last coin used, whether the last house was robbed.

📌 **Interview term: Base case** — the states small enough to answer directly, with no recurrence: \`fib(0) = 0\`, "zero needs zero squares". The [recursion and base case](/interview-question/what-is-recursion-and-what-is-a-base-case) page covers the idea in general.

Let us run the recipe on a problem that is *not* Fibonacci, to see it is a method and not a trick. **Fewest perfect squares:** what is the smallest number of perfect squares (1, 4, 9, 16, …) that add up to \`n\`?

1. **State:** \`dp[i]\` = the fewest squares that sum to \`i\`.
2. **Recurrence:** the last square used was some \`j*j <= i\`, and the rest must sum to \`i - j*j\` as cheaply as possible: \`dp[i] = 1 + min(dp[i - j*j])\` over every \`j\` with \`j*j <= i\`.
3. **Base case:** \`dp[0] = 0\`.
4. **Order:** \`i\` from 1 up to \`n\`; every \`i - j*j\` is smaller than \`i\`, so it is already filled.
5. **Answer:** \`dp[n]\`.

That is O(n · √n) time and O(n) space. Example 3 runs it and compares it with the greedy idea "always take the biggest square that fits". Greedy turns 12 into \`9 + 1 + 1 + 1\` (4 squares) while DP finds \`4 + 4 + 4\` (3 squares), and for 43 greedy needs 5 squares where DP needs 3.

📌 **Interview term: Greedy algorithm** — make the locally best choice at every step and never reconsider. It is faster when it works, but it can be wrong when an early "best" choice blocks a better overall answer; DP considers every last choice instead. See [what is a greedy algorithm](/interview-question/what-is-a-greedy-algorithm), and the coin-change version of the same trap on [coin change](/interview-question/how-do-you-solve-the-coin-change-problem).

| Technique | Subproblems overlap? | Tries every choice? | Typical cost |
| :--- | :--- | :--- | :--- |
| Plain recursion / brute force | Yes, but recomputed | Yes | Often exponential |
| Divide and conquer | No (halves are disjoint) | Not needed | e.g. O(n log n) |
| Greedy | — | No, one choice per step | Fast, but needs a proof |
| Dynamic programming | Yes, each solved once | Yes, via the recurrence | (number of states) × (work per state) |

📌 **Interview term: DP time formula** — the running time of a DP is **number of states × work per state**. Fibonacci: n states × O(1) = O(n). Perfect squares: n states × O(√n) choices = O(n√n). Saying this formula out loud is the fastest way to give a correct [Big-O](/interview-question/what-is-big-o-notation) for any DP.

## 5. The Java Code, Line by Line

**Memoization with a \`HashMap\`:**

~~~java
static int fibMemo(int n, Map<Integer, Integer> memo) {
    calls++;
    if (n < 2) return n;
    Integer known = memo.get(n);               // null means "not solved yet"
    if (known != null) return known;
    int value = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
    memo.put(n, value);
    return value;
}
~~~

**Tabulation with an array:**

~~~java
static int fibTable(int n) {
    if (n < 2) return n;
    int[] dp = new int[n + 1];                 // dp[i] will hold fib(i); Java zero-fills
    dp[1] = 1;
    for (int i = 2; i <= n; i++) {             // smaller subproblems first
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    return dp[n];
}
~~~

**Rolling variables:**

~~~java
static int fibTwoVars(int n) {
    int prev = 0, cur = 1;                     // fib(i - 1), fib(i)
    for (int i = 0; i < n; i++) {
        int next = prev + cur;
        prev = cur;
        cur = next;
    }
    return prev;
}
~~~

What each Java piece is doing:

- **\`memo.get(n)\` returns \`null\`** for a missing key, so one lookup both tests and fetches. Storing it in an \`Integer\` (not \`int\`) matters: unboxing a \`null\` into an \`int\` throws \`NullPointerException\`.
- **Boxing.** \`HashMap<Integer, Integer>\` stores objects, so every \`put\` may allocate. When keys are \`0..n\`, an \`int[]\` or \`long[]\` memo (with \`-1\` as "unknown") is smaller and faster. Boxing also breaks \`==\`: comparing two \`Integer\` values 1000 from a map with \`==\` printed \`false\` when this was run (127 printed \`true\`, because small values are cached); use \`.equals\` or unbox first.
- **\`new int[n + 1]\`** is filled with zeros by the language, so only the non-zero base case needs setting. \`Arrays.fill(dp, -1)\` marks "unknown" when 0 is a valid answer.
- **\`int\` overflow is silent.** \`fib(46) = 1836311903\` is the last Fibonacci number that fits in an \`int\`; the same loop for \`fib(47)\` printed \`-1323752223\`. Use \`long\` (good up to \`fib(92)\`), \`Math.addExact\` (which threw \`ArithmeticException: integer overflow\` when tried), or \`BigInteger\`.

📌 **Interview term: \`StackOverflowError\`** — the JVM error thrown when recursion is deeper than the thread stack allows. A memoized \`fib(100000)\` with default JVM settings threw it when this was run. Memoization removes repeated **work**, not recursion **depth**; the bottom-up versions have no such limit, which is why Java DP solutions are usually loops.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs in the other three languages print exactly the same lines.

**Example 1 — Fibonacci four ways: naive recursion, memoization, a table and two variables, with call counts** printed:

~~~text
fib(1): naive 1 in 1 calls | memo 1 in 1 calls | table 1 | two variables 1
fib(10): naive 55 in 177 calls | memo 55 in 19 calls | table 55 | two variables 55
fib(20): naive 6765 in 21891 calls | memo 6765 in 39 calls | table 6765 | two variables 6765
fib(30): naive 832040 in 2692537 calls | memo 832040 in 59 calls | table 832040 | two variables 832040
~~~

**Example 2 — Overlapping subproblems: how often naive recursion re-solves each fib(k), and the finished table** printed:

~~~text
naive fib(6) solves each subproblem this many times:
  fib(6): 1
  fib(5): 1
  fib(4): 2
  fib(3): 3
  fib(2): 5
  fib(1): 8
  fib(0): 5
  total calls: 25
memoized fib(6) solves each subproblem: [1, 1, 1, 1, 1, 1, 1]
bottom-up table for fib(10): [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]
~~~

**Example 3 — The DP recipe on a new problem: fewest perfect squares, where greedy fails** printed:

~~~text
n=1: dp 1 [1] | greedy 1 [1]
n=12: dp 3 [4, 4, 4] | greedy 4 [9, 1, 1, 1]
n=13: dp 2 [4, 9] | greedy 2 [9, 4]
n=18: dp 2 [9, 9] | greedy 3 [16, 1, 1]
n=43: dp 3 [9, 9, 25] | greedy 5 [36, 4, 1, 1, 1]
~~~

Example 1 shows the gap: for \`fib(30)\` the naive recursion made 2,692,537 calls while the memoized version made 59 (that is \`2n - 1\`: one call for each subproblem plus one repeat lookup per level). Example 2 shows why: naive \`fib(6)\` solved \`fib(1)\` eight times and \`fib(2)\` five times, while the memoized version solved each subproblem exactly once. Example 3 shows that DP is not only Fibonacci: the same recipe finds 3 squares for 12 and 43 where the greedy rule needs 4 and 5.

## Complexity

| Version | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Naive recursion | O(φⁿ), about O(1.618ⁿ) | O(n) stack | The call tree grows like Fibonacci itself: 2,692,537 calls for n = 30 in Example 1 |
| Memoization | O(n) | O(n) cache + O(n) stack | Each of the n + 1 subproblems is solved once; Example 1 shows 2n - 1 calls (59 for n = 30) |
| Tabulation | O(n) | O(n) table | One loop step per entry |
| Two rolling variables | O(n) | O(1) | Only the last two entries are ever read |
| Perfect squares DP | O(n√n) | O(n) | n states, up to √n choices each |

The call count of the naive version is exactly \`2·fib(n+1) - 1\`: 177 for n = 10, 21891 for n = 20 — the counts in Example 1 match that formula. For the stack cost of recursion see [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## How to Recognise a DP Problem

- The question asks for a **count** ("how many ways"), a **best value** ("minimum cost", "maximum profit", "longest"), or a **yes/no feasibility** ("can it be split", "can you reach").
- The input is a sequence, a string, a grid, or an amount, and a choice is made at each position (take it or skip it, step 1 or 2, which coin).
- A brute-force recursion is easy to write but tries the same smaller inputs again and again.
- The problem says "you cannot pick two adjacent…" or "each item at most once" — a constraint that links one choice to the next, which greedy usually gets wrong.

In this batch the 1D questions build on each other: [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem) is Fibonacci in disguise, [house robber](/interview-question/how-do-you-solve-the-house-robber-problem) adds a take-or-skip choice, and [maximum subarray](/interview-question/how-do-you-find-the-maximum-subarray-sum) (Kadane) is a DP whose table you never store. The companion batch continues with [maximum product subarray](/interview-question/how-do-you-find-the-maximum-product-subarray), [coin change](/interview-question/how-do-you-solve-the-coin-change-problem), [unique paths](/interview-question/how-do-you-count-unique-paths-in-a-grid), [decode ways](/interview-question/decode-ways-dp-how-do-you-handle-0-and-06-edge-cases) and [word break](/interview-question/how-do-you-solve-the-word-break-problem).

## Edge Cases

- **The smallest inputs** — \`fib(0)\` and \`fib(1)\` are base cases; a table of size \`n + 1\` must still exist for \`n = 0\` (the code returns early instead).
- **Large n** — the answer outgrows fixed-size integers (see each language note above) and recursive memoization outgrows the stack. Bottom-up plus a big-enough number type, or a modulo, fixes both.
- **"Unknown" versus a real zero** — if 0 can be a valid answer, mark unsolved cache entries with something else (\`None\`, \`-1\`, a missing key).
- **Greedy-looking problems** — perfect squares and coin change look greedy; always test one small counterexample (12 = 4 + 4 + 4) before trusting greedy.

## Common Pitfalls

- **Calling it DP without overlapping subproblems.** Caching merge sort halves saves nothing; say why the subproblems repeat.
- **\`int\` overflow.** Counts overflow silently (\`fib(47)\` printed \`-1323752223\`). Use \`long\`, \`Math.addExact\`, \`BigInteger\`, or the requested modulo.
- **Comparing boxed values with \`==\`.** Two \`Integer\` 1000s from a \`HashMap\` compared \`false\`; use \`.equals\` or unbox.
- **Using 0 as "not computed" when 0 is a real answer.** Fill the array with \`-1\` via \`Arrays.fill\` or use a \`boolean[] known\`.
- **A \`static\` memo shared across test cases.** Online judges create one object and call the method many times; a static cache built for one input is wrong for the next unless the subproblems are input-independent.
- **Deep top-down recursion** throwing \`StackOverflowError\` — write the loop.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Dynamic programming solves each distinct subproblem once, stores the answer, and reuses it. It applies when subproblems overlap and the answer is built from sub-answers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it helps:</strong> <span style="color:#f0e2c8;">Naive recursive Fibonacci made 2,692,537 calls for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(30)</code>; memoized it made 59, because each subproblem is solved once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Two styles:</strong> <span style="color:#f0e2c8;">Top-down keeps the recursion plus a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long[]</code> cache; bottom-up fills an array in a loop. Bottom-up cannot throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>, which a memoized <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(100000)</code> did.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The recipe:</strong> <span style="color:#f0e2c8;">I state what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i]</code> means, write the recurrence from the last choice, set base cases, choose the fill order, and name the answer cell. Time is states times work per state.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java details:</strong> <span style="color:#f0e2c8;">Arrays start at zero, so I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code> for unknown when 0 is a real answer; and since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> overflows at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(47)</code>, I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> or the problem modulo for big counts.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap</code> or array for the memo?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If the states are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0..n</code>, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long[]</code> is faster and avoids boxing. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> is for sparse or composite states, keyed by an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> or a packed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is DP different from divide and conquer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Divide and conquer has disjoint subproblems that are never reused (merge sort); DP is for subproblems that repeat.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is DP different from greedy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Greedy commits to the local best; DP tries every last choice. For fewest squares, greedy gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">9 + 1 + 1 + 1</code> for 12 and DP gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">4 + 4 + 4</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the chosen items back?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Record the winning choice per state in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pick</code> array and walk back from the answer cell, as Example 3 does.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">==</code> dangerous on memo values?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> objects. Values from -128 to 127 are cached so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> happens to work; 1000 compared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> in the test. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.equals</code> or unbox to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Dynamic programming (DP)** | Solve each distinct subproblem once, store the answer, reuse it |
| **Subproblem** | A smaller instance of the same question |
| **Overlapping subproblems** | The same subproblem is needed many times; the reason DP saves work |
| **Optimal substructure** | The best overall answer is built from best answers to subproblems |
| **Memoization (top-down DP)** | Recursive function plus a cache checked before computing |
| **Tabulation (bottom-up DP)** | Fill a table from the base cases upward with a loop |
| **Space optimisation (rolling variables)** | Keep only the few earlier entries the recurrence reads |
| **State** | The meaning of one table entry, such as dp[i] = fewest squares summing to i |
| **Recurrence (transition)** | Formula for a state in terms of smaller states, usually from the last choice |
| **Base case** | A state answered directly, without the recurrence |
| **Greedy algorithm** | Take the locally best choice each step and never reconsider |
| **DP time formula** | Running time = number of states × work per state |
| **StackOverflowError** | JVM error when recursion is deeper than the thread stack allows |

---
**Conclusion:** Dynamic programming is the habit of solving each repeated subproblem once and storing the result. In Java that is a \`HashMap\` or array memo for top-down, or an array filled in a loop for bottom-up — and bottom-up is usually the final answer because it cannot throw \`StackOverflowError\`. Watch \`int\` overflow and boxed \`Integer\` comparisons, learn the five-step recipe and the states × work-per-state formula, and every 1D DP question in this section follows the same pattern.`,
        examples: [
          {
            label: "Fibonacci four ways: naive recursion, memoization, a table and two variables, with call counts",
            code: `import java.util.HashMap;
import java.util.Map;

public class Main {
    static long calls = 0;

    static int fibNaive(int n) {
        calls++;
        if (n < 2) return n;                       // base cases: fib(0) = 0, fib(1) = 1
        return fibNaive(n - 1) + fibNaive(n - 2);
    }

    static int fibMemo(int n, Map<Integer, Integer> memo) {
        calls++;
        if (n < 2) return n;
        Integer known = memo.get(n);               // null means "not solved yet"
        if (known != null) return known;
        int value = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
        memo.put(n, value);
        return value;
    }

    static int fibTable(int n) {
        if (n < 2) return n;
        int[] dp = new int[n + 1];                 // dp[i] will hold fib(i); Java zero-fills
        dp[1] = 1;
        for (int i = 2; i <= n; i++) {             // smaller subproblems first
            dp[i] = dp[i - 1] + dp[i - 2];
        }
        return dp[n];
    }

    static int fibTwoVars(int n) {
        int prev = 0, cur = 1;                     // fib(i - 1), fib(i)
        for (int i = 0; i < n; i++) {
            int next = prev + cur;
            prev = cur;
            cur = next;
        }
        return prev;
    }

    static String report(int n) {
        calls = 0;
        int a = fibNaive(n);
        long naiveCalls = calls;
        calls = 0;
        int b = fibMemo(n, new HashMap<>());
        long memoCalls = calls;
        return "fib(" + n + "): naive " + a + " in " + naiveCalls + " calls | memo "
            + b + " in " + memoCalls + " calls | table " + fibTable(n)
            + " | two variables " + fibTwoVars(n);
    }

    public static void main(String[] args) {
        System.out.println(report(1));
        System.out.println(report(10));
        System.out.println(report(20));
        System.out.println(report(30));
    }
}
`,
          },
          {
            label: "Overlapping subproblems: how often naive recursion re-solves each fib(k), and the finished table",
            code: `import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class Main {
    static int[] times = new int[7];               // times[k] = how often fib(k) was entered

    static int fibNaive(int n) {
        times[n]++;
        if (n < 2) return n;
        return fibNaive(n - 1) + fibNaive(n - 2);
    }

    static int fibMemo(int n, Map<Integer, Integer> memo, int[] work) {
        if (memo.containsKey(n)) return memo.get(n); // a lookup, not a recomputation
        work[n]++;                                 // really solving fib(n) now
        int value = n < 2 ? n : fibMemo(n - 1, memo, work) + fibMemo(n - 2, memo, work);
        memo.put(n, value);
        return value;
    }

    public static void main(String[] args) {
        fibNaive(6);
        System.out.println("naive fib(6) solves each subproblem this many times:");
        int total = 0;
        for (int k = 6; k >= 0; k--) {
            System.out.println("  fib(" + k + "): " + times[k]);
            total += times[k];
        }
        System.out.println("  total calls: " + total);

        int[] work = new int[7];
        fibMemo(6, new HashMap<>(), work);
        System.out.println("memoized fib(6) solves each subproblem: " + Arrays.toString(work));

        int[] dp = new int[11];
        dp[1] = 1;
        for (int i = 2; i <= 10; i++) {
            dp[i] = dp[i - 1] + dp[i - 2];
        }
        System.out.println("bottom-up table for fib(10): " + Arrays.toString(dp));
    }
}
`,
          },
          {
            label: "The DP recipe on a new problem: fewest perfect squares, where greedy fails",
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Main {
    static List<Integer> minSquares(int n) {
        // dp[i] = fewest perfect squares that add up to i
        int[] dp = new int[n + 1];
        Arrays.fill(dp, Integer.MAX_VALUE);
        dp[0] = 0;                                  // base case: 0 needs no squares
        int[] pick = new int[n + 1];                // pick[i] = the square used last for i
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j * j <= i; j++) {      // try every square that fits
                // dp[i - j*j] is never MAX_VALUE here (1 always fits), so + 1 cannot overflow
                if (dp[i - j * j] + 1 < dp[i]) {
                    dp[i] = dp[i - j * j] + 1;
                    pick[i] = j * j;
                }
            }
        }
        List<Integer> parts = new ArrayList<>();
        for (int i = n; i > 0; i -= pick[i]) {      // walk the choices back to 0
            parts.add(pick[i]);
        }
        return parts;
    }

    static List<Integer> greedySquares(int n) {
        List<Integer> parts = new ArrayList<>();
        while (n > 0) {
            int j = 1;
            while ((j + 1) * (j + 1) <= n) j++;     // largest square that still fits
            parts.add(j * j);
            n -= j * j;
        }
        return parts;
    }

    static String fmt(List<Integer> parts) {
        return parts.size() + " " + parts;          // List.toString prints [a, b, c]
    }

    public static void main(String[] args) {
        for (int n : new int[] {1, 12, 13, 18, 43}) {
            System.out.println("n=" + n + ": dp " + fmt(minSquares(n)) + " | greedy " + fmt(greedySquares(n)));
        }
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"What is dynamic programming? Explain the idea, then show me in C++ how you would make a slow recursive Fibonacci fast, and tell me how you recognise a DP problem."

**What a strong answer should cover:**
- DP = solve each overlapping subproblem once and reuse the stored answer; it needs overlapping subproblems and optimal substructure.
- Memoization (recursion + \`std::unordered_map\` or \`std::vector\` cache) versus tabulation (loop filling a \`std::vector\`), and the O(1)-space rolling version.
- The recipe — state, recurrence, base cases, order, answer — and time = states × work per state.
- Why naive recursion is exponential and DP is O(n).
- C++ specifics: \`memo[n]\` with \`operator[]\` inserts a default 0 (use \`find\` or \`count\`), signed overflow is undefined behaviour (use \`long long\` or \`unsigned\` arithmetic for big counts), \`std::vector<int> dp(n + 1)\` value-initialises to zero, and deep recursion can overflow the native stack with no exception.

**Code / implementation expected:** Optional — a short C++ function (memoized or tabulated Fibonacci); the explanation matters more than the code.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should be comfortable with functions, loops and recursion.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A teacher writes \`1 + 1 + 1 + 1 + 1 + 1 + 1 + 1\` on the board and asks the class for the total. Everyone counts and says "eight". Then she adds one more \`+ 1\` at the end and asks again. Nobody counts again from the beginning: everyone says "nine" straight away, because they **remembered** the eight and only did one more addition.

That reflex — *do not redo work you have already done; write the answer down and reuse it* — is the whole of dynamic programming. A computer does not have the reflex. A plain recursive program will happily recount all eight ones every time it needs them, and on bigger problems that turns a job of a few hundred steps into millions or billions. Dynamic programming is the discipline of noticing that the same small question keeps being asked, answering it once, and storing the answer.

It matters in interviews because a large family of questions — [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem), [house robber](/interview-question/how-do-you-solve-the-house-robber-problem), [coin change](/interview-question/how-do-you-solve-the-coin-change-problem), [word break](/interview-question/how-do-you-solve-the-word-break-problem), [longest increasing subsequence](/interview-question/how-do-you-find-the-longest-increasing-subsequence), [0/1 knapsack](/interview-question/how-do-you-solve-the-0-1-knapsack-problem) — are all solved with the same five-step recipe. Learn the recipe once and those questions stop being puzzles and become fill-in-the-blanks.

## 2. The Core Idea in Plain Words

Take the Fibonacci numbers: 0, 1, 1, 2, 3, 5, 8, 13, … Each number is the sum of the two before it. Written as a rule:

- \`fib(0) = 0\`, \`fib(1) = 1\`
- \`fib(n) = fib(n - 1) + fib(n - 2)\` for \`n >= 2\`

The obvious program copies that rule into a recursive function. It is correct, but look at what it does for \`fib(5)\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 350" role="img" aria-label="Recursion tree of fib 5. fib 3 is computed twice and fib 2 three times, shown highlighted">
  <line class="d-edge" x1="448" y1="54" x2="274" y2="94"/>
  <line class="d-edge" x1="448" y1="54" x2="622" y2="94"/>
  <line class="d-edge" x1="274" y1="124" x2="172" y2="164"/>
  <line class="d-edge" x1="274" y1="124" x2="375" y2="164"/>
  <line class="d-edge" x1="622" y1="124" x2="555" y2="164"/>
  <line class="d-edge" x1="622" y1="124" x2="690" y2="164"/>
  <line class="d-edge" x1="172" y1="194" x2="105" y2="234"/>
  <line class="d-edge" x1="172" y1="194" x2="240" y2="234"/>
  <line class="d-edge" x1="375" y1="194" x2="330" y2="234"/>
  <line class="d-edge" x1="375" y1="194" x2="420" y2="234"/>
  <line class="d-edge" x1="555" y1="194" x2="510" y2="234"/>
  <line class="d-edge" x1="555" y1="194" x2="600" y2="234"/>
  <line class="d-edge" x1="105" y1="264" x2="60" y2="304"/>
  <line class="d-edge" x1="105" y1="264" x2="150" y2="304"/>
  <rect class="d-box" x="418" y="24" width="60" height="30" rx="6"/>
  <text class="d-text" x="448" y="44" text-anchor="middle">fib(5)</text>
  <rect class="d-box" x="244" y="94" width="60" height="30" rx="6"/>
  <text class="d-text" x="274" y="114" text-anchor="middle">fib(4)</text>
  <rect class="d-box-accent" x="592" y="94" width="60" height="30" rx="6"/>
  <text class="d-text" x="622" y="114" text-anchor="middle">fib(3)</text>
  <rect class="d-box-accent" x="142" y="164" width="60" height="30" rx="6"/>
  <text class="d-text" x="172" y="184" text-anchor="middle">fib(3)</text>
  <rect class="d-box-accent" x="345" y="164" width="60" height="30" rx="6"/>
  <text class="d-text" x="375" y="184" text-anchor="middle">fib(2)</text>
  <rect class="d-box-accent" x="525" y="164" width="60" height="30" rx="6"/>
  <text class="d-text" x="555" y="184" text-anchor="middle">fib(2)</text>
  <rect class="d-box-muted" x="660" y="164" width="60" height="30" rx="6"/>
  <text class="d-text" x="690" y="184" text-anchor="middle">fib(1)</text>
  <rect class="d-box-accent" x="75" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="105" y="254" text-anchor="middle">fib(2)</text>
  <rect class="d-box-muted" x="210" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="240" y="254" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="300" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="330" y="254" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="390" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="420" y="254" text-anchor="middle">fib(0)</text>
  <rect class="d-box-muted" x="480" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="510" y="254" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="570" y="234" width="60" height="30" rx="6"/>
  <text class="d-text" x="600" y="254" text-anchor="middle">fib(0)</text>
  <rect class="d-box-muted" x="30" y="304" width="60" height="30" rx="6"/>
  <text class="d-text" x="60" y="324" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="120" y="304" width="60" height="30" rx="6"/>
  <text class="d-text" x="150" y="324" text-anchor="middle">fib(0)</text>
</svg>

The highlighted boxes are repeats: \`fib(3)\` is worked out twice and \`fib(2)\` three times, from scratch each time. The tree roughly doubles in size each time \`n\` grows by one or two, so the work explodes. Example 1 below counts the calls: **2,692,537 calls** for \`fib(30)\`.

📌 **Interview term: Subproblem** — a smaller instance of the same question whose answer helps answer the big one. Here \`fib(3)\` is a subproblem of \`fib(5)\`.

📌 **Interview term: Overlapping subproblems** — the same subproblem is needed many times by different branches of the computation. This is the first sign that DP will help. (Contrast with [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work), whose halves never overlap: there is nothing to reuse, so it is plain divide and conquer, not DP.)

📌 **Interview term: Optimal substructure** — the best answer to the big problem can be built from best answers to its subproblems. For counting problems like Fibonacci it simply means "the answer is a combination of sub-answers"; for optimisation problems (shortest, cheapest, largest) it means an optimal solution contains optimal solutions to its pieces.

📌 **Interview term: Dynamic programming (DP)** — solving a problem that has overlapping subproblems and optimal substructure by solving **each distinct subproblem once**, storing its answer, and looking it up whenever it is needed again.

The name is famously unhelpful. Richard Bellman chose it at the RAND Corporation in the early 1950s. In his autobiography he explains that "programming" meant planning and decision-making (as in a schedule), and that he wanted a name that would not upset a Secretary of Defense who disliked the word "research" — "dynamic", he wrote, is impossible to use in a pejorative sense. Stuart Dreyfus retells the story, quoting Bellman, in [Richard Bellman on the Birth of Dynamic Programming](https://web.cs.miami.edu/home/odelia/teaching/csc317_fall19/syllabus/dy_birth.pdf). It has nothing to do with "dynamic" memory or "programming" a computer.

## 3. Two Ways to Store the Answers

There are two standard ways to "solve each subproblem once". Both give the same answers and the same big-O time; they differ in the direction of the work.

📌 **Interview term: Memoization (top-down DP)** — keep the natural recursive function, but before computing \`f(k)\` check a cache; after computing it, store it. The recursion still starts at the big problem and works downward, but every subproblem is computed only the first time it is asked for. (The general technique, outside algorithms, is covered on the [memoization](/interview-question/what-is-memoization) page.)

📌 **Interview term: Tabulation (bottom-up DP)** — no recursion at all. Make a table (usually an array) \`dp\`, fill in the base cases, then fill the entries in an order where everything an entry depends on is already filled. The answer is read from the table at the end.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 170" role="img" aria-label="A dp table for Fibonacci with indexes 0 to 7 holding 0 1 1 2 3 5 8 13. dp 6 is filled from dp 5 and dp 4">
  <defs>
    <marker id="b27q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge-accent" d="M 390 72 Q 470 18 546 70" marker-end="url(#b27q1-arrow)"/>
  <path class="d-edge-accent" d="M 470 72 Q 510 46 546 70" marker-end="url(#b27q1-arrow)"/>
  <rect class="d-box-muted" x="40" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="70" y="103" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="120" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="150" y="103" text-anchor="middle">1</text>
  <rect class="d-box" x="200" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="230" y="103" text-anchor="middle">1</text>
  <rect class="d-box" x="280" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="310" y="103" text-anchor="middle">2</text>
  <rect class="d-box" x="360" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="390" y="103" text-anchor="middle">3</text>
  <rect class="d-box" x="440" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="470" y="103" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="520" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="550" y="103" text-anchor="middle">8</text>
  <rect class="d-box" x="600" y="76" width="60" height="44" rx="6"/>
  <text class="d-text" x="630" y="103" text-anchor="middle">13</text>
  <text class="d-sub" x="70" y="146" text-anchor="middle">dp[0]</text>
  <text class="d-sub" x="150" y="146" text-anchor="middle">dp[1]</text>
  <text class="d-sub" x="230" y="146" text-anchor="middle">dp[2]</text>
  <text class="d-sub" x="310" y="146" text-anchor="middle">dp[3]</text>
  <text class="d-sub" x="390" y="146" text-anchor="middle">dp[4]</text>
  <text class="d-sub" x="470" y="146" text-anchor="middle">dp[5]</text>
  <text class="d-sub" x="550" y="146" text-anchor="middle">dp[6]</text>
  <text class="d-sub" x="630" y="146" text-anchor="middle">dp[7]</text>
</svg>

The grey cells are the base cases. Filling from left to right guarantees that when we reach \`dp[6]\`, both \`dp[5]\` and \`dp[4]\` already hold their final values, so \`dp[6] = 5 + 3 = 8\` is one addition.

| | Memoization (top-down) | Tabulation (bottom-up) |
| :--- | :--- | :--- |
| Shape of the code | Recursive function plus a cache | Loop over a table |
| Which subproblems get solved | Only the ones actually reached from the top | All of them, in a fixed order |
| Stack depth | Up to the depth of the recursion (n for Fibonacci) | None beyond the loop |
| Easiest when | The recurrence is obvious but the fill order is not | The order is simple (left to right, row by row) |
| Space saving trick | Hard | Often easy: keep only the last few entries |

📌 **Interview term: Space optimisation (rolling variables)** — when \`dp[i]\` depends only on a fixed number of earlier entries, keep just those entries in variables instead of the whole table. Fibonacci needs only the last two values, so O(n) memory becomes O(1).

## 4. The Five-Step DP Recipe

Every 1D DP question in this batch is solved by writing down these five things, in this order, **before** writing code:

<svg class="iq-diagram" width="100%" viewBox="0 0 900 150" role="img" aria-label="Five boxes in a row: state, recurrence, base cases, order, answer">
  <defs>
    <marker id="b27q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="12" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="82" y="70" text-anchor="middle">1. State</text>
  <text class="d-sub" x="82" y="92" text-anchor="middle">what dp[i] means</text>
  <path class="d-edge" d="M 154 75 L 192 75" marker-end="url(#b27q1-arrow2)"/>
  <rect class="d-box" x="196" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="266" y="70" text-anchor="middle">2. Recurrence</text>
  <text class="d-sub" x="266" y="92" text-anchor="middle">dp[i] from smaller i</text>
  <path class="d-edge" d="M 338 75 L 376 75" marker-end="url(#b27q1-arrow2)"/>
  <rect class="d-box" x="380" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="450" y="70" text-anchor="middle">3. Base cases</text>
  <text class="d-sub" x="450" y="92" text-anchor="middle">the smallest i</text>
  <path class="d-edge" d="M 522 75 L 560 75" marker-end="url(#b27q1-arrow2)"/>
  <rect class="d-box" x="564" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="634" y="70" text-anchor="middle">4. Order</text>
  <text class="d-sub" x="634" y="92" text-anchor="middle">fill so inputs exist</text>
  <path class="d-edge" d="M 706 75 L 744 75" marker-end="url(#b27q1-arrow2)"/>
  <rect class="d-box-muted" x="748" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="818" y="70" text-anchor="middle">5. Answer</text>
  <text class="d-sub" x="818" y="92" text-anchor="middle">which cell to return</text>
</svg>

📌 **Interview term: State** — the precise meaning of one table entry, in words. "\`dp[i]\` = the fewest perfect squares that add up to \`i\`." If you cannot say the state in one sentence, the rest will not work.

📌 **Interview term: Recurrence (transition)** — the formula that computes a state from smaller states. It usually comes from asking "what was the **last** choice?" — the last step taken, the last coin used, whether the last house was robbed.

📌 **Interview term: Base case** — the states small enough to answer directly, with no recurrence: \`fib(0) = 0\`, "zero needs zero squares". The [recursion and base case](/interview-question/what-is-recursion-and-what-is-a-base-case) page covers the idea in general.

Let us run the recipe on a problem that is *not* Fibonacci, to see it is a method and not a trick. **Fewest perfect squares:** what is the smallest number of perfect squares (1, 4, 9, 16, …) that add up to \`n\`?

1. **State:** \`dp[i]\` = the fewest squares that sum to \`i\`.
2. **Recurrence:** the last square used was some \`j*j <= i\`, and the rest must sum to \`i - j*j\` as cheaply as possible: \`dp[i] = 1 + min(dp[i - j*j])\` over every \`j\` with \`j*j <= i\`.
3. **Base case:** \`dp[0] = 0\`.
4. **Order:** \`i\` from 1 up to \`n\`; every \`i - j*j\` is smaller than \`i\`, so it is already filled.
5. **Answer:** \`dp[n]\`.

That is O(n · √n) time and O(n) space. Example 3 runs it and compares it with the greedy idea "always take the biggest square that fits". Greedy turns 12 into \`9 + 1 + 1 + 1\` (4 squares) while DP finds \`4 + 4 + 4\` (3 squares), and for 43 greedy needs 5 squares where DP needs 3.

📌 **Interview term: Greedy algorithm** — make the locally best choice at every step and never reconsider. It is faster when it works, but it can be wrong when an early "best" choice blocks a better overall answer; DP considers every last choice instead. See [what is a greedy algorithm](/interview-question/what-is-a-greedy-algorithm), and the coin-change version of the same trap on [coin change](/interview-question/how-do-you-solve-the-coin-change-problem).

| Technique | Subproblems overlap? | Tries every choice? | Typical cost |
| :--- | :--- | :--- | :--- |
| Plain recursion / brute force | Yes, but recomputed | Yes | Often exponential |
| Divide and conquer | No (halves are disjoint) | Not needed | e.g. O(n log n) |
| Greedy | — | No, one choice per step | Fast, but needs a proof |
| Dynamic programming | Yes, each solved once | Yes, via the recurrence | (number of states) × (work per state) |

📌 **Interview term: DP time formula** — the running time of a DP is **number of states × work per state**. Fibonacci: n states × O(1) = O(n). Perfect squares: n states × O(√n) choices = O(n√n). Saying this formula out loud is the fastest way to give a correct [Big-O](/interview-question/what-is-big-o-notation) for any DP.

## 5. The C++ Code, Line by Line

**Memoization with \`std::unordered_map\`:**

~~~cpp
int fibMemo(int n, std::unordered_map<int, int>& memo) {
    calls++;
    if (n < 2) return n;
    auto it = memo.find(n);                       // find, not memo[n]: [] would insert a 0
    if (it != memo.end()) return it->second;
    int value = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
    memo[n] = value;
    return value;
}
~~~

**Tabulation with \`std::vector\`:**

~~~cpp
int fibTable(int n) {
    if (n < 2) return n;
    std::vector<int> dp(n + 1, 0);                // dp[i] will hold fib(i)
    dp[1] = 1;
    for (int i = 2; i <= n; i++) {                // smaller subproblems first
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    return dp[n];
}
~~~

**Rolling variables:**

~~~cpp
int fibTwoVars(int n) {
    int prev = 0, cur = 1;                        // fib(i - 1), fib(i)
    for (int i = 0; i < n; i++) {
        int next = prev + cur;
        prev = cur;
        cur = next;
    }
    return prev;
}
~~~

What each C++ piece is doing:

- **\`memo.find(n)\` instead of \`memo[n]\`.** \`operator[]\` inserts a default-constructed value when the key is missing. A test run printed \`size before: 0\`, then after evaluating \`memo[42] == 0\` it printed \`size after memo[42]: 1\` — the lookup itself created an entry holding 0, which a memo would then mistake for "fib(42) = 0". \`find\` (or \`count\`) only looks.
- **Pass the memo by reference** (\`std::unordered_map<int, int>&\`). Passing by value copies the whole map into every call, and the stored results are thrown away.
- **\`std::vector<int> dp(n + 1, 0)\`** allocates and zero-fills. For keys \`0..n\`, a \`std::vector<long long> memo(n + 1, -1)\` is faster than a hash map: no hashing, contiguous memory.
- **Overflow.** \`int\` holds \`fib(46)\` at most. Signed overflow is undefined behaviour in C++ — the compiler may assume it never happens — so it is not just a wrong number but an incorrect program. Use \`long long\` (up to \`fib(92)\`), or \`unsigned\` types when you want defined wrap-around, or take the result modulo a prime as most DP problems ask.

📌 **Interview term: Recursion depth limit** — every call uses part of a fixed-size native stack. C++ has no portable way to catch running out: the program usually just crashes. Memoization removes repeated **work**, not recursion **depth**, so for large \`n\` the bottom-up loop is the safe choice. (The exact depth at which a crash happens depends on the platform and stack size; it was not measured here.)

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (g++ 13). The same programs in the other three languages print exactly the same lines.

**Example 1 — Fibonacci four ways: naive recursion, memoization, a table and two variables, with call counts** printed:

~~~text
fib(1): naive 1 in 1 calls | memo 1 in 1 calls | table 1 | two variables 1
fib(10): naive 55 in 177 calls | memo 55 in 19 calls | table 55 | two variables 55
fib(20): naive 6765 in 21891 calls | memo 6765 in 39 calls | table 6765 | two variables 6765
fib(30): naive 832040 in 2692537 calls | memo 832040 in 59 calls | table 832040 | two variables 832040
~~~

**Example 2 — Overlapping subproblems: how often naive recursion re-solves each fib(k), and the finished table** printed:

~~~text
naive fib(6) solves each subproblem this many times:
  fib(6): 1
  fib(5): 1
  fib(4): 2
  fib(3): 3
  fib(2): 5
  fib(1): 8
  fib(0): 5
  total calls: 25
memoized fib(6) solves each subproblem: [1, 1, 1, 1, 1, 1, 1]
bottom-up table for fib(10): [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]
~~~

**Example 3 — The DP recipe on a new problem: fewest perfect squares, where greedy fails** printed:

~~~text
n=1: dp 1 [1] | greedy 1 [1]
n=12: dp 3 [4, 4, 4] | greedy 4 [9, 1, 1, 1]
n=13: dp 2 [4, 9] | greedy 2 [9, 4]
n=18: dp 2 [9, 9] | greedy 3 [16, 1, 1]
n=43: dp 3 [9, 9, 25] | greedy 5 [36, 4, 1, 1, 1]
~~~

Example 1 shows the gap: for \`fib(30)\` the naive recursion made 2,692,537 calls while the memoized version made 59 (that is \`2n - 1\`: one call for each subproblem plus one repeat lookup per level). Example 2 shows why: naive \`fib(6)\` solved \`fib(1)\` eight times and \`fib(2)\` five times, while the memoized version solved each subproblem exactly once. Example 3 shows that DP is not only Fibonacci: the same recipe finds 3 squares for 12 and 43 where the greedy rule needs 4 and 5.

## Complexity

| Version | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Naive recursion | O(φⁿ), about O(1.618ⁿ) | O(n) stack | The call tree grows like Fibonacci itself: 2,692,537 calls for n = 30 in Example 1 |
| Memoization | O(n) | O(n) cache + O(n) stack | Each of the n + 1 subproblems is solved once; Example 1 shows 2n - 1 calls (59 for n = 30) |
| Tabulation | O(n) | O(n) table | One loop step per entry |
| Two rolling variables | O(n) | O(1) | Only the last two entries are ever read |
| Perfect squares DP | O(n√n) | O(n) | n states, up to √n choices each |

The call count of the naive version is exactly \`2·fib(n+1) - 1\`: 177 for n = 10, 21891 for n = 20 — the counts in Example 1 match that formula. For the stack cost of recursion see [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## How to Recognise a DP Problem

- The question asks for a **count** ("how many ways"), a **best value** ("minimum cost", "maximum profit", "longest"), or a **yes/no feasibility** ("can it be split", "can you reach").
- The input is a sequence, a string, a grid, or an amount, and a choice is made at each position (take it or skip it, step 1 or 2, which coin).
- A brute-force recursion is easy to write but tries the same smaller inputs again and again.
- The problem says "you cannot pick two adjacent…" or "each item at most once" — a constraint that links one choice to the next, which greedy usually gets wrong.

In this batch the 1D questions build on each other: [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem) is Fibonacci in disguise, [house robber](/interview-question/how-do-you-solve-the-house-robber-problem) adds a take-or-skip choice, and [maximum subarray](/interview-question/how-do-you-find-the-maximum-subarray-sum) (Kadane) is a DP whose table you never store. The companion batch continues with [maximum product subarray](/interview-question/how-do-you-find-the-maximum-product-subarray), [coin change](/interview-question/how-do-you-solve-the-coin-change-problem), [unique paths](/interview-question/how-do-you-count-unique-paths-in-a-grid), [decode ways](/interview-question/decode-ways-dp-how-do-you-handle-0-and-06-edge-cases) and [word break](/interview-question/how-do-you-solve-the-word-break-problem).

## Edge Cases

- **The smallest inputs** — \`fib(0)\` and \`fib(1)\` are base cases; a table of size \`n + 1\` must still exist for \`n = 0\` (the code returns early instead).
- **Large n** — the answer outgrows fixed-size integers (see each language note above) and recursive memoization outgrows the stack. Bottom-up plus a big-enough number type, or a modulo, fixes both.
- **"Unknown" versus a real zero** — if 0 can be a valid answer, mark unsolved cache entries with something else (\`None\`, \`-1\`, a missing key).
- **Greedy-looking problems** — perfect squares and coin change look greedy; always test one small counterexample (12 = 4 + 4 + 4) before trusting greedy.

## Common Pitfalls

- **Calling it DP without overlapping subproblems.** Caching merge sort halves saves nothing; say why the subproblems repeat.
- **\`memo[n]\` to test membership.** \`operator[]\` inserts a zero; use \`find\` or \`count\`.
- **Signed overflow.** It is undefined behaviour, not just a wrong value; use \`long long\`, unsigned arithmetic, or the modulo the problem asks for.
- **Passing the memo or the table by value.** Every recursive call copies it and the stored answers are lost; pass by reference.
- **A \`static\` or global memo across test cases.** Clear it (or make it local) when the subproblems depend on the input.
- **Deep top-down recursion.** It can crash the process without any exception; prefer the bottom-up loop for large \`n\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Dynamic programming solves each distinct subproblem once, stores the answer, and reuses it. It applies when subproblems overlap and the answer is built from sub-answers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it helps:</strong> <span style="color:#f0e2c8;">Naive recursive Fibonacci made 2,692,537 calls for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(30)</code>; memoized it made 59, because each subproblem is solved once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Two styles:</strong> <span style="color:#f0e2c8;">Top-down keeps the recursion plus an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector</code> cache; bottom-up fills a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> in a loop. Bottom-up has no recursion depth, which matters because a native stack overflow just crashes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The recipe:</strong> <span style="color:#f0e2c8;">I state what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i]</code> means, write the recurrence from the last choice, set base cases, choose the fill order, and name the answer cell. Time is states times work per state.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ details:</strong> <span style="color:#f0e2c8;">I look up the memo with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code>, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code>, which inserts a zero; I pass tables by reference; and I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> or a modulo because signed overflow is undefined behaviour.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_map</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">vector</code> for the memo?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If the states are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0..n</code>, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;long long&gt;</code> filled with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code> is faster: no hashing and contiguous memory. A hash map is for sparse or composite keys.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is DP different from divide and conquer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Divide and conquer has disjoint subproblems that are never reused (merge sort); DP is for subproblems that repeat.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is DP different from greedy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Greedy commits to the local best; DP tries every last choice. For fewest squares, greedy gives 4 squares for 12 and DP gives 3.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you reconstruct the chosen items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pick</code> vector of the winning choice per state and walk back from the answer, as Example 3 prints the squares.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes wrong with a global memo across test cases?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Results computed for one input are reused for the next. Make the memo local to the solving function, or clear it, unless the subproblems do not depend on the input.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Dynamic programming (DP)** | Solve each distinct subproblem once, store the answer, reuse it |
| **Subproblem** | A smaller instance of the same question |
| **Overlapping subproblems** | The same subproblem is needed many times; the reason DP saves work |
| **Optimal substructure** | The best overall answer is built from best answers to subproblems |
| **Memoization (top-down DP)** | Recursive function plus a cache checked before computing |
| **Tabulation (bottom-up DP)** | Fill a table from the base cases upward with a loop |
| **Space optimisation (rolling variables)** | Keep only the few earlier entries the recurrence reads |
| **State** | The meaning of one table entry, such as dp[i] = fewest squares summing to i |
| **Recurrence (transition)** | Formula for a state in terms of smaller states, usually from the last choice |
| **Base case** | A state answered directly, without the recurrence |
| **Greedy algorithm** | Take the locally best choice each step and never reconsider |
| **DP time formula** | Running time = number of states × work per state |
| **Recursion depth limit** | The native stack size; exceeding it usually crashes a C++ program |

---
**Conclusion:** Dynamic programming is the habit of solving each repeated subproblem once and storing the result. In C++ that is an \`unordered_map\` (looked up with \`find\`) or \`vector\` memo for top-down, or a \`vector\` filled in a loop for bottom-up — and bottom-up is usually the final answer because a native stack overflow simply crashes. Avoid signed overflow with \`long long\` or a modulo, learn the five-step recipe and the states × work-per-state formula, and every 1D DP question in this section follows the same pattern.`,
        examples: [
          {
            label: "Fibonacci four ways: naive recursion, memoization, a table and two variables, with call counts",
            code: `#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

long long calls = 0;

int fibNaive(int n) {
    calls++;
    if (n < 2) return n;                          // base cases: fib(0) = 0, fib(1) = 1
    return fibNaive(n - 1) + fibNaive(n - 2);
}

int fibMemo(int n, std::unordered_map<int, int>& memo) {
    calls++;
    if (n < 2) return n;
    auto it = memo.find(n);                       // find, not memo[n]: [] would insert a 0
    if (it != memo.end()) return it->second;
    int value = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
    memo[n] = value;
    return value;
}

int fibTable(int n) {
    if (n < 2) return n;
    std::vector<int> dp(n + 1, 0);                // dp[i] will hold fib(i)
    dp[1] = 1;
    for (int i = 2; i <= n; i++) {                // smaller subproblems first
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    return dp[n];
}

int fibTwoVars(int n) {
    int prev = 0, cur = 1;                        // fib(i - 1), fib(i)
    for (int i = 0; i < n; i++) {
        int next = prev + cur;
        prev = cur;
        cur = next;
    }
    return prev;
}

std::string report(int n) {
    calls = 0;
    int a = fibNaive(n);
    long long naiveCalls = calls;
    calls = 0;
    std::unordered_map<int, int> memo;
    int b = fibMemo(n, memo);
    long long memoCalls = calls;
    return "fib(" + std::to_string(n) + "): naive " + std::to_string(a) + " in " + std::to_string(naiveCalls)
        + " calls | memo " + std::to_string(b) + " in " + std::to_string(memoCalls)
        + " calls | table " + std::to_string(fibTable(n)) + " | two variables " + std::to_string(fibTwoVars(n));
}

int main() {
    std::cout << report(1) << "\\n";
    std::cout << report(10) << "\\n";
    std::cout << report(20) << "\\n";
    std::cout << report(30) << "\\n";
    return 0;
}
`,
          },
          {
            label: "Overlapping subproblems: how often naive recursion re-solves each fib(k), and the finished table",
            code: `#include <iostream>
#include <numeric>
#include <string>
#include <unordered_map>
#include <vector>

std::vector<int> times(7, 0);                     // times[k] = how often fib(k) was entered

int fibNaive(int n) {
    times[n]++;
    if (n < 2) return n;
    return fibNaive(n - 1) + fibNaive(n - 2);
}

int fibMemo(int n, std::unordered_map<int, int>& memo, std::vector<int>& work) {
    auto it = memo.find(n);
    if (it != memo.end()) return it->second;      // a lookup, not a recomputation
    work[n]++;                                    // really solving fib(n) now
    int value = n < 2 ? n : fibMemo(n - 1, memo, work) + fibMemo(n - 2, memo, work);
    memo[n] = value;
    return value;
}

std::string fmt(const std::vector<int>& v) {
    std::string s = "[";
    for (size_t i = 0; i < v.size(); i++) s += (i ? ", " : "") + std::to_string(v[i]);
    return s + "]";
}

int main() {
    fibNaive(6);
    std::cout << "naive fib(6) solves each subproblem this many times:\\n";
    for (int k = 6; k >= 0; k--) {
        std::cout << "  fib(" << k << "): " << times[k] << "\\n";
    }
    std::cout << "  total calls: " << std::accumulate(times.begin(), times.end(), 0) << "\\n";

    std::vector<int> work(7, 0);
    std::unordered_map<int, int> memo;
    fibMemo(6, memo, work);
    std::cout << "memoized fib(6) solves each subproblem: " << fmt(work) << "\\n";

    std::vector<int> dp(11, 0);
    dp[1] = 1;
    for (int i = 2; i <= 10; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    std::cout << "bottom-up table for fib(10): " << fmt(dp) << "\\n";
    return 0;
}
`,
          },
          {
            label: "The DP recipe on a new problem: fewest perfect squares, where greedy fails",
            code: `#include <climits>
#include <iostream>
#include <string>
#include <vector>

std::vector<int> minSquares(int n) {
    // dp[i] = fewest perfect squares that add up to i
    std::vector<int> dp(n + 1, INT_MAX);
    dp[0] = 0;                                    // base case: 0 needs no squares
    std::vector<int> pick(n + 1, 0);              // pick[i] = the square used last for i
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j * j <= i; j++) {        // try every square that fits
            // dp[i - j*j] is never INT_MAX here (1 always fits), so + 1 cannot overflow
            if (dp[i - j * j] + 1 < dp[i]) {
                dp[i] = dp[i - j * j] + 1;
                pick[i] = j * j;
            }
        }
    }
    std::vector<int> parts;
    for (int i = n; i > 0; i -= pick[i]) {        // walk the choices back to 0
        parts.push_back(pick[i]);
    }
    return parts;
}

std::vector<int> greedySquares(int n) {
    std::vector<int> parts;
    while (n > 0) {
        int j = 1;
        while ((j + 1) * (j + 1) <= n) j++;       // largest square that still fits
        parts.push_back(j * j);
        n -= j * j;
    }
    return parts;
}

std::string fmt(const std::vector<int>& parts) {
    std::string s = std::to_string(parts.size()) + " [";
    for (size_t i = 0; i < parts.size(); i++) s += (i ? ", " : "") + std::to_string(parts[i]);
    return s + "]";
}

int main() {
    for (int n : {1, 12, 13, 18, 43}) {
        std::cout << "n=" << n << ": dp " << fmt(minSquares(n)) << " | greedy " << fmt(greedySquares(n)) << "\\n";
    }
    return 0;
}
`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you solve the climbing stairs problem?",
    difficulty: "easy",
    seoDescription: "Climbing stairs in Python, JavaScript, Java and C++: the Fibonacci recurrence, memo vs table vs two variables, step-set variants and overflow.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are climbing a staircase with n steps. Each move you climb either 1 or 2 steps. In how many distinct ways can you reach the top? Please write it in Python, start with whatever is simplest, then make it efficient."

**What a strong answer should cover:**
- The recurrence from the last move, \`ways(n) = ways(n - 1) + ways(n - 2)\`, and why the two cases do not overlap.
- Correct base cases (\`ways(0) = ways(1) = 1\`) and the link to Fibonacci.
- Why plain recursion is exponential, and the progression memo → table → two variables (O(n) time, O(1) space).
- Generalising to any set of step sizes, or to min cost climbing stairs.
- Python specifics: tuple assignment for the two-variable shift, \`int\` never overflowing (exact \`climb(92)\`), and the 1000-frame recursion limit that makes the memo version fail for large n.

**Clarifying questions expected:**
- "Are the moves exactly 1 or 2 steps, and does order matter?"
- "How large can n be — do I need 64-bit numbers or a modulo?"

**Code / implementation expected:** Yes — a short Python function, ideally the O(1)-space loop.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; this is usually the first dynamic programming problem people meet.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A child runs up the stairs to bed. Sometimes she takes one step, sometimes she jumps two. Her older brother, bored, asks: "There are 5 stairs. How many different ways can you go up?" She starts listing — 1-1-1-1-1, 2-1-1-1, 1-2-1-1, … — loses track, and gives up.

Here is the trick that makes it easy. Stand on the top stair and look back. **How did you get here?** Your last move was either one step (so you came from stair 4) or two steps (so you came from stair 3). Every way to reach stair 5 is "a way to reach stair 4, then one step" or "a way to reach stair 3, then two steps", and those two groups never overlap. So:

ways(5) = ways(4) + ways(3)

That single sentence is the solution. Climbing stairs is the "hello world" of [dynamic programming](/interview-question/what-is-dynamic-programming): interviewers use it to see whether you can find a recurrence by thinking about the **last choice**, set the base cases correctly, and then make the solution fast and small.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the allowed moves exactly 1 or 2 steps? | Other step sets (say 1, 2, 3) change the recurrence to a sum over the allowed steps; Example 2 handles any set. |
| Does order matter — is 1-2 different from 2-1? | In the standard problem yes (we count sequences of moves). If order did not matter it would be a coin-change *combinations* count, a different loop order — see [coin change](/interview-question/how-do-you-solve-the-coin-change-problem). |
| How large can n be? | The answer grows like Fibonacci. The LeetCode 70 statement, as mirrored on sites such as [labuladong](https://labuladong.online/en/problem/leetcode/climbing-stairs/description/), caps n at 45 — exactly the largest n whose answer fits a 32-bit signed int (Example 3). Bigger n needs 64-bit, big integers, or a modulo. |
| What should n = 0 return? | Usually 1 (the empty climb) or "n is at least 1". Decide before writing base cases. |
| Is there a cost per stair? | Then it becomes the *min cost climbing stairs* variant: minimise a sum instead of counting (Example 2). |

## 3. The Core Idea: Look at the Last Move

📌 **Interview term: State** — what one number in our table means. Here: \`ways[i]\` = the number of different move sequences that end exactly on stair \`i\`.

📌 **Interview term: Recurrence** — the rule for a state in terms of smaller states. The last move into stair \`i\` was 1 step (from \`i - 1\`) or 2 steps (from \`i - 2\`), so

\`ways[i] = ways[i - 1] + ways[i - 2]\`

📌 **Interview term: Base case** — states answered directly. \`ways[0] = 1\` (standing at the bottom, there is exactly one way: do nothing) and \`ways[1] = 1\` (one single step). With those two, the recurrence gives \`ways[2] = 2\`, \`ways[3] = 3\`, \`ways[4] = 5\`, \`ways[5] = 8\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="A staircase of stairs 0 to 5 labelled with the number of ways to reach each: 1, 1, 2, 3, 5, 8">
  <rect class="d-box-muted" x="20" y="230" width="100" height="40" rx="4"/>
  <text class="d-text" x="70" y="255" text-anchor="middle">stair 0: 1</text>
  <rect class="d-box-muted" x="130" y="190" width="100" height="40" rx="4"/>
  <text class="d-text" x="180" y="215" text-anchor="middle">stair 1: 1</text>
  <rect class="d-box" x="240" y="150" width="100" height="40" rx="4"/>
  <text class="d-text" x="290" y="175" text-anchor="middle">stair 2: 2</text>
  <rect class="d-box" x="350" y="110" width="100" height="40" rx="4"/>
  <text class="d-text" x="400" y="135" text-anchor="middle">stair 3: 3</text>
  <rect class="d-box" x="460" y="70" width="100" height="40" rx="4"/>
  <text class="d-text" x="510" y="95" text-anchor="middle">stair 4: 5</text>
  <rect class="d-box-accent" x="570" y="30" width="110" height="40" rx="4"/>
  <text class="d-text" x="625" y="55" text-anchor="middle">stair 5: 8</text>
</svg>

Each stair is labelled with its number of ways. Every value is the sum of the two stairs just below it: 8 = 5 + 3.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 180" role="img" aria-label="ways of i is built from ways of i minus 1 by a one step move and from ways of i minus 2 by a two step move">
  <defs>
    <marker id="b27q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="100" width="150" height="50" rx="8"/>
  <text class="d-text" x="95" y="130" text-anchor="middle">ways[i - 2]</text>
  <rect class="d-box" x="245" y="100" width="150" height="50" rx="8"/>
  <text class="d-text" x="320" y="130" text-anchor="middle">ways[i - 1]</text>
  <rect class="d-box-accent" x="470" y="100" width="150" height="50" rx="8"/>
  <text class="d-text" x="545" y="130" text-anchor="middle">ways[i]</text>
  <path class="d-edge-accent" d="M 95 98 Q 320 10 540 96" marker-end="url(#b27q2-arrow)"/>
  <path class="d-edge" d="M 397 125 L 466 125" marker-end="url(#b27q2-arrow)"/>
  <text class="d-sub" x="320" y="44" text-anchor="middle">last move: 2 steps</text>
  <text class="d-sub" x="432" y="165" text-anchor="middle">last move: 1 step</text>
</svg>

Because the two groups (last move 1, last move 2) never share a sequence, adding them counts every sequence exactly once.

📌 **Interview term: Fibonacci relation** — the sequence 1, 1, 2, 3, 5, 8, … is the Fibonacci sequence shifted by one: \`ways(n) = fib(n + 1)\`. Saying this shows you recognise the pattern, but still derive the recurrence from the last move — that reasoning is what generalises to other step sets.

## 4. From Brute Force to O(1) Space

**Brute force — plain recursion.** \`climb(n) = climb(n - 1) + climb(n - 2)\` written directly is correct but recomputes the same stairs again and again. Example 1 counts the calls: 177 for n = 10 and **242,785 for n = 25**. The count grows by about 1.6× per extra stair, so n = 45 would need billions of calls.

**Memoization (top-down).** Same recursion, but store each \`climb(k)\` the first time it is computed. Every stair is solved once: O(n) time, O(n) memory and O(n) recursion depth.

**Tabulation (bottom-up).** Fill \`dp[0..n]\` from left to right. O(n) time, O(n) memory, no recursion.

**Two variables.** \`dp[i]\` only ever reads \`dp[i - 1]\` and \`dp[i - 2]\`, so keep those two numbers and slide them forward.

📌 **Interview term: Rolling variables (space optimisation)** — replacing a DP table with the handful of previous entries the recurrence actually reads, cutting space from O(n) to O(1).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="Two variables slide along the row: twoBack and oneBack become oneBack and their sum">
  <defs>
    <marker id="b27q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="70" y="67" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="130" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="170" y="67" text-anchor="middle">1</text>
  <rect class="d-box" x="230" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="270" y="67" text-anchor="middle">2</text>
  <rect class="d-box" x="330" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="370" y="67" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="430" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="470" y="67" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="530" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="570" y="67" text-anchor="middle">8</text>
  <text class="d-sub" x="470" y="112" text-anchor="middle">twoBack</text>
  <text class="d-sub" x="570" y="112" text-anchor="middle">oneBack</text>
  <path class="d-edge-dashed" d="M 470 124 L 470 150 L 650 150"/>
  <path class="d-edge-dashed" d="M 570 124 L 570 150"/>
  <text class="d-sub" x="560" y="180" text-anchor="middle">next: 5 + 8 = 13</text>
</svg>

Only the two highlighted values are kept in memory. One loop step computes their sum, then shifts: the old \`oneBack\` becomes \`twoBack\`, and the sum becomes \`oneBack\`.

| Approach | Time | Extra space | Comment |
| :--- | :--- | :--- | :--- |
| Plain recursion | O(φⁿ) ≈ O(1.618ⁿ) | O(n) stack | 242,785 calls for n = 25 |
| Memoization | O(n) | O(n) memo + O(n) stack | Each stair solved once |
| Table | O(n) | O(n) | No recursion |
| Two variables | O(n) | O(1) | The answer interviewers want last |

## 5. The Python Code, Line by Line

The final answer — two variables:

~~~python
def climb(n):
    one_back, two_back = 1, 1             # ways(i - 1), ways(i - 2)
    for _ in range(2, n + 1):
        one_back, two_back = one_back + two_back, one_back
    return one_back
~~~

The table version it came from:

~~~python
def climb_table(n):
    dp = [1] * (n + 1)                    # dp[0] = dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]     # last move was 1 step or 2 steps
    return dp[n]
~~~

And the memoized recursion, which is the natural first step from the recurrence:

~~~python
def climb_memo(n, memo):
    if n <= 1:
        return 1
    if n not in memo:
        memo[n] = climb_memo(n - 1, memo) + climb_memo(n - 2, memo)
    return memo[n]
~~~

What each Python piece is doing:

- **\`one_back, two_back = one_back + two_back, one_back\`** — tuple assignment evaluates the whole right-hand side with the **old** values first, then assigns. Writing it as two separate lines (\`one_back = one_back + two_back; two_back = one_back\`) would be a bug: the second line would read the new value.
- **\`range(2, n + 1)\`** runs \`n - 1\` times and not at all for \`n = 0\` or \`n = 1\`, so those cases fall through to \`return one_back\`, which is 1. No special-case \`if\` needed.
- **\`[1] * (n + 1)\`** sets both base cases at once; the loop overwrites everything from index 2.
- **\`if n not in memo\`** — a \`dict\` lookup; \`@functools.cache\` would do the same in one decorator line (Python 3.9+, per the [functools docs](https://docs.python.org/3/library/functools.html#functools.cache)). Either way the recursion is n deep, and Python stops at a recursion depth of 1000 by default, so the memo version raises \`RecursionError\` for n in the low thousands. The loop has no such limit.
- **Integers never overflow in Python.** Example 3 prints the exact \`climb(92) = 12200160415121876738\`; the same loop in Java or C++ needs care past n = 45 (32-bit) and n = 91 (64-bit).

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`python3 main.py\` (Python 3.13). The same programs in the other three languages print exactly the same lines.

**Example 1 — Four solutions that agree: naive recursion (with call counts), memo, table and two variables** printed:

~~~text
climb(1) = 1 | memo 1 | table 1 | naive 1 in 1 calls
climb(2) = 2 | memo 2 | table 2 | naive 2 in 3 calls
climb(3) = 3 | memo 3 | table 3 | naive 3 in 5 calls
climb(5) = 8 | memo 8 | table 8 | naive 8 in 15 calls
climb(10) = 89 | memo 89 | table 89 | naive 89 in 177 calls
climb(25) = 121393 | memo 121393 | table 121393 | naive 121393 in 242785 calls
climb(45) = 1836311903 (two variables, 44 loop steps)
~~~

**Example 2 — Variants with the same recipe: any set of step sizes, and min cost climbing stairs** printed:

~~~text
ways(4, [1, 2]) = 5
ways(4, [1, 2, 3]) = 7
ways(10, [1, 2, 3]) = 274
ways(7, [2, 5]) = 2
ways(3, [2]) = 0
cheapest climb over [10, 15, 20] = 15
cheapest climb over [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] = 6
~~~

**Example 3 — How big the answer gets: exact values, 32-bit wrap-around and the 2^53 limit** printed:

~~~text
climb(44) = 1134903170 | fits int32: true | as int32: 1134903170 | above 2^53 - 1: false
climb(45) = 1836311903 | fits int32: true | as int32: 1836311903 | above 2^53 - 1: false
climb(46) = 2971215073 | fits int32: false | as int32: -1323752223 | above 2^53 - 1: false
climb(50) = 20365011074 | fits int32: false | as int32: -1109825406 | above 2^53 - 1: false
climb(77) = 8944394323791464 | fits int32: false | as int32: 375819880 | above 2^53 - 1: false
climb(78) = 14472334024676221 | fits int32: false | as int32: -660827267 | above 2^53 - 1: true
climb(91) = 7540113804746346429 | fits int32: false | as int32: 1642909629 | above 2^53 - 1: true
climb(92) = 12200160415121876738 | fits int64: false | as int64: -6246583658587674878
~~~

All four methods in Example 1 agree on every n, and the naive call count is \`2·climb(n) - 1\` each time (15 for n = 5, 177 for n = 10). Example 2 shows the recurrence is a template: change the step set or swap \`+\` for \`min\` and the same loop solves the variant. In Example 3, n = 45 is the last value that fits a 32-bit int, n = 78 is the first above 2^53 - 1, and n = 92 no longer fits a signed 64-bit integer. Python does not need any of this — the exact column is just \`int\` — but Example 3 prints what Java's \`int\` or C++'s \`int32_t\` would hold, and when a JavaScript \`Number\` would stop being exact, so you can talk about it if the interviewer asks.

## 7. Variants Interviewers Ask Next

**Any set of step sizes.** If you may take 1, 2 or 3 steps, the last move could have been any of them: \`ways[i] = ways[i - 1] + ways[i - 2] + ways[i - 3]\`. In general, \`ways[i] = sum of ways[i - s]\` for every allowed step \`s <= i\`, with \`ways[0] = 1\`. That is O(n · k) for k step sizes. Example 2 gives 7 ways for 4 stairs with steps {1, 2, 3}, 274 for 10 stairs, and **0** for 3 stairs with only 2-steps — an odd number cannot be made from 2s, and the table handles that with no special case.

**Min cost climbing stairs.** Each stair \`i\` has a cost \`cost[i]\` paid when you step off it; you may start on stair 0 or 1 and want to reach just past the last stair. Now we minimise instead of count:

\`best[i] = min(best[i - 1] + cost[i - 1], best[i - 2] + cost[i - 2])\`, with \`best[0] = best[1] = 0\`.

Same shape, \`min\` instead of \`+\`. Example 2 prints 15 for \`[10, 15, 20]\` (start on stair 1, pay 15, jump two) and 6 for the longer list.

**Order does not matter.** If 1-2 and 2-1 count as the same climb, you are counting *combinations* of step sizes, which is the coin-change counting problem; the loops swap (step sizes outer, stairs inner). See [coin change](/interview-question/how-do-you-solve-the-coin-change-problem).

**Very large n with a modulo.** Add \`% MOD\` after each addition. For astronomically large n (say 10^18) the recurrence can be raised as a 2×2 matrix power in O(log n) — mention it as a follow-up; nobody expects you to code it for this question.

## 8. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | O(φⁿ) | O(n) | The call tree has \`2·ways(n) - 1\` nodes: 242,785 for n = 25 |
| Memoization | O(n) | O(n) | n states, O(1) each; memo plus recursion stack |
| Table | O(n) | O(n) | One loop step per stair |
| Two variables | O(n) | O(1) | Only the last two values are read |
| k step sizes | O(n · k) | O(n), or O(max step) with a ring buffer | k terms per state |

(The arithmetic is O(1) per step only while the numbers fit a machine word; with big integers each addition costs O(number of digits).)

## 9. Edge Cases

- **n = 1** — one way. **n = 0** — 1 (the empty climb) if allowed; the loop versions return 1 automatically.
- **Step set that cannot reach n** — \`ways(3, [2]) = 0\`; the table returns 0 with no special case.
- **Large n** — 32-bit overflow at n = 46, \`Number\` precision at n = 78, 64-bit signed overflow at n = 92 (all in Example 3).
- **Unsorted or duplicate step sizes** — duplicates would double-count; deduplicate the step list first.

## Common Pitfalls

- **Wrong base case.** Setting \`ways[0] = 0\` makes every answer wrong; the empty climb counts as one way.
- **Splitting the tuple update into two lines.** \`one_back = one_back + two_back\` then \`two_back = one_back\` copies the *new* value; use one tuple assignment.
- **Recursing for large n.** Even memoized, the recursion is n deep and hits the default 1000-frame limit; use the loop.
- **Calling the naive version "fine because n is small".** 242,785 calls for n = 25 grows to billions for n = 45; say the complexity out loud.
- **Mutable default memo** (\`def climb(n, memo={})\`) — shared between calls; pass the memo or use \`functools.cache\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Recurrence:</strong> <span style="color:#f0e2c8;">The last move into stair <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> was one step or two, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[i] = ways[i - 1] + ways[i - 2]</code>; the two groups never overlap, so adding counts each climb once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Base cases:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[0] = 1</code> for the empty climb and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[1] = 1</code>; that gives 1, 1, 2, 3, 5, 8 — Fibonacci shifted by one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why not plain recursion:</strong> <span style="color:#f0e2c8;">It recomputes the same stairs: 242,785 calls for n = 25, exponential in n. Each stair only needs solving once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Final code:</strong> <span style="color:#f0e2c8;">Two variables and a tuple assignment, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">one_back, two_back = one_back + two_back, one_back</code>, for O(n) time and O(1) space, with no recursion limit to worry about.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python notes:</strong> <span style="color:#f0e2c8;">Python <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> never overflows, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">climb(92)</code> prints exactly; in Java or C++ I would say the answer needs 64-bit from n = 46.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you can take 1, 2 or 3 steps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sum over the allowed steps: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[i] = sum(ways[i - s] for s in steps if s &lt;= i)</code>. O(n·k); 274 ways for n = 10 with {1, 2, 3}.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if each stair has a cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Min cost climbing stairs: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best[i] = min(best[i - 1] + cost[i - 1], best[i - 2] + cost[i - 2])</code>, base cases 0. 15 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[10, 15, 20]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do better than O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the recurrence is a 2×2 matrix power, so fast exponentiation gives O(log n) multiplications. With exact big integers each multiplication gets slower as the numbers grow.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ways[0]</code> equal 1, not 0?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is exactly one way to be at the bottom: make no moves. With 0, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[2]</code> would be 1 and the whole sequence shifts wrong.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if order does not matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then 1-2 and 2-1 are the same, which is the coin-change combinations count: loop over step sizes outside and stairs inside.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State** | What one table entry means: ways[i] = number of move sequences ending on stair i |
| **Recurrence** | Rule for a state from smaller states: ways[i] = ways[i - 1] + ways[i - 2] |
| **Base case** | States answered directly: ways[0] = ways[1] = 1 |
| **Fibonacci relation** | The answers 1, 1, 2, 3, 5, 8 are Fibonacci shifted by one: ways(n) = fib(n + 1) |
| **Rolling variables (space optimisation)** | Keep only the entries the recurrence reads, O(n) memory becomes O(1) |

---
**Conclusion:** Climbing stairs is solved by looking at the last move: \`ways(n) = ways(n - 1) + ways(n - 2)\` with \`ways(0) = ways(1) = 1\`. Plain recursion is exponential (242,785 calls for n = 25); the table and then two variables with a tuple assignment give O(n) time and O(1) space in Python, with no recursion limit and no overflow to worry about. The same "last choice" reasoning extends to any set of step sizes and to min cost climbing stairs, and it is the recipe you will reuse for house robber and the rest of 1D DP.`,
        examples: [
          {
            label: "Four solutions that agree: naive recursion (with call counts), memo, table and two variables",
            code: `calls = 0


def climb_naive(n):
    global calls
    calls += 1
    if n <= 1:                            # 0 or 1 steps left: exactly one way
        return 1
    return climb_naive(n - 1) + climb_naive(n - 2)


def climb_memo(n, memo):
    if n <= 1:
        return 1
    if n not in memo:
        memo[n] = climb_memo(n - 1, memo) + climb_memo(n - 2, memo)
    return memo[n]


def climb_table(n):
    dp = [1] * (n + 1)                    # dp[0] = dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]     # last move was 1 step or 2 steps
    return dp[n]


def climb(n):
    one_back, two_back = 1, 1             # ways(i - 1), ways(i - 2)
    for _ in range(2, n + 1):
        one_back, two_back = one_back + two_back, one_back
    return one_back


for n in [1, 2, 3, 5, 10, 25]:
    calls = 0
    slow = climb_naive(n)
    print("climb(" + str(n) + ") = " + str(climb(n)) + " | memo " + str(climb_memo(n, {}))
          + " | table " + str(climb_table(n)) + " | naive " + str(slow) + " in " + str(calls) + " calls")
print("climb(45) = " + str(climb(45)) + " (two variables, 44 loop steps)")
`,
          },
          {
            label: "Variants with the same recipe: any set of step sizes, and min cost climbing stairs",
            code: `def ways(n, steps):
    """Number of ordered ways to climb n stairs using any step size in steps."""
    dp = [0] * (n + 1)
    dp[0] = 1                             # one way to stand at the bottom: do nothing
    for i in range(1, n + 1):
        for s in steps:
            if s <= i:
                dp[i] += dp[i - s]        # last move had size s
    return dp[n]


def min_cost(cost):
    """Pay cost[i] to step off stair i; start on stair 0 or 1; reach the top."""
    one_back, two_back = 0, 0             # cheapest way to stand on i - 1, i - 2
    for i in range(2, len(cost) + 1):
        one_back, two_back = min(one_back + cost[i - 1], two_back + cost[i - 2]), one_back
    return one_back


print("ways(4, [1, 2]) = " + str(ways(4, [1, 2])))  # ways(4, [1, 2]) = 5
print("ways(4, [1, 2, 3]) = " + str(ways(4, [1, 2, 3])))  # ways(4, [1, 2, 3]) = 7
print("ways(10, [1, 2, 3]) = " + str(ways(10, [1, 2, 3])))  # ways(10, [1, 2, 3]) = 274
print("ways(7, [2, 5]) = " + str(ways(7, [2, 5])))  # ways(7, [2, 5]) = 2
print("ways(3, [2]) = " + str(ways(3, [2])))  # ways(3, [2]) = 0
print("cheapest climb over [10, 15, 20] = " + str(min_cost([10, 15, 20])))  # cheapest climb over [10, 15, 20] = 15
print("cheapest climb over [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] = " + str(min_cost([1, 100, 1, 1, 1, 100, 1, 1, 100, 1])))  # cheapest climb over [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] = 6
`,
          },
          {
            label: "How big the answer gets: exact values, 32-bit wrap-around and the 2^53 limit",
            code: `def climb(n):
    one_back, two_back = 1, 1             # Python ints never overflow
    for _ in range(2, n + 1):
        one_back, two_back = one_back + two_back, one_back
    return one_back


def wrap(x, bits):
    """What a signed int of this many bits (Java int/long, C++ int32_t/int64_t) would hold."""
    return (x + 2**(bits - 1)) % 2**bits - 2**(bits - 1)


INT32_MAX = 2**31 - 1
INT64_MAX = 2**63 - 1
SAFE = 2**53 - 1                          # JavaScript Number.MAX_SAFE_INTEGER

for n in [44, 45, 46, 50, 77, 78, 91]:
    exact = climb(n)
    print("climb(" + str(n) + ") = " + str(exact) + " | fits int32: " + str(exact <= INT32_MAX).lower()
          + " | as int32: " + str(wrap(exact, 32)) + " | above 2^53 - 1: " + str(exact > SAFE).lower())

exact = climb(92)
print("climb(92) = " + str(exact) + " | fits int64: " + str(exact <= INT64_MAX).lower()
      + " | as int64: " + str(wrap(exact, 64)))
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are climbing a staircase with n steps. Each move you climb either 1 or 2 steps. In how many distinct ways can you reach the top? Please write it in JavaScript, start with whatever is simplest, then make it efficient."

**What a strong answer should cover:**
- The recurrence from the last move, \`ways(n) = ways(n - 1) + ways(n - 2)\`, and why the two cases do not overlap.
- Correct base cases (\`ways(0) = ways(1) = 1\`) and the link to Fibonacci.
- Why plain recursion is exponential, and the progression memo → table → two variables (O(n) time, O(1) space).
- Generalising to any set of step sizes, or to min cost climbing stairs.
- JavaScript specifics: a temporary variable (or destructuring) for the shift, \`Number\` being exact only to 2^53 - 1 (wrong from n = 78), and \`BigInt\` for exact large answers.

**Clarifying questions expected:**
- "Are the moves exactly 1 or 2 steps, and does order matter?"
- "How large can n be — do I need 64-bit numbers or a modulo?"

**Code / implementation expected:** Yes — a short JavaScript function, ideally the O(1)-space loop.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; this is usually the first dynamic programming problem people meet.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A child runs up the stairs to bed. Sometimes she takes one step, sometimes she jumps two. Her older brother, bored, asks: "There are 5 stairs. How many different ways can you go up?" She starts listing — 1-1-1-1-1, 2-1-1-1, 1-2-1-1, … — loses track, and gives up.

Here is the trick that makes it easy. Stand on the top stair and look back. **How did you get here?** Your last move was either one step (so you came from stair 4) or two steps (so you came from stair 3). Every way to reach stair 5 is "a way to reach stair 4, then one step" or "a way to reach stair 3, then two steps", and those two groups never overlap. So:

ways(5) = ways(4) + ways(3)

That single sentence is the solution. Climbing stairs is the "hello world" of [dynamic programming](/interview-question/what-is-dynamic-programming): interviewers use it to see whether you can find a recurrence by thinking about the **last choice**, set the base cases correctly, and then make the solution fast and small.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the allowed moves exactly 1 or 2 steps? | Other step sets (say 1, 2, 3) change the recurrence to a sum over the allowed steps; Example 2 handles any set. |
| Does order matter — is 1-2 different from 2-1? | In the standard problem yes (we count sequences of moves). If order did not matter it would be a coin-change *combinations* count, a different loop order — see [coin change](/interview-question/how-do-you-solve-the-coin-change-problem). |
| How large can n be? | The answer grows like Fibonacci. The LeetCode 70 statement, as mirrored on sites such as [labuladong](https://labuladong.online/en/problem/leetcode/climbing-stairs/description/), caps n at 45 — exactly the largest n whose answer fits a 32-bit signed int (Example 3). Bigger n needs 64-bit, big integers, or a modulo. |
| What should n = 0 return? | Usually 1 (the empty climb) or "n is at least 1". Decide before writing base cases. |
| Is there a cost per stair? | Then it becomes the *min cost climbing stairs* variant: minimise a sum instead of counting (Example 2). |

## 3. The Core Idea: Look at the Last Move

📌 **Interview term: State** — what one number in our table means. Here: \`ways[i]\` = the number of different move sequences that end exactly on stair \`i\`.

📌 **Interview term: Recurrence** — the rule for a state in terms of smaller states. The last move into stair \`i\` was 1 step (from \`i - 1\`) or 2 steps (from \`i - 2\`), so

\`ways[i] = ways[i - 1] + ways[i - 2]\`

📌 **Interview term: Base case** — states answered directly. \`ways[0] = 1\` (standing at the bottom, there is exactly one way: do nothing) and \`ways[1] = 1\` (one single step). With those two, the recurrence gives \`ways[2] = 2\`, \`ways[3] = 3\`, \`ways[4] = 5\`, \`ways[5] = 8\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="A staircase of stairs 0 to 5 labelled with the number of ways to reach each: 1, 1, 2, 3, 5, 8">
  <rect class="d-box-muted" x="20" y="230" width="100" height="40" rx="4"/>
  <text class="d-text" x="70" y="255" text-anchor="middle">stair 0: 1</text>
  <rect class="d-box-muted" x="130" y="190" width="100" height="40" rx="4"/>
  <text class="d-text" x="180" y="215" text-anchor="middle">stair 1: 1</text>
  <rect class="d-box" x="240" y="150" width="100" height="40" rx="4"/>
  <text class="d-text" x="290" y="175" text-anchor="middle">stair 2: 2</text>
  <rect class="d-box" x="350" y="110" width="100" height="40" rx="4"/>
  <text class="d-text" x="400" y="135" text-anchor="middle">stair 3: 3</text>
  <rect class="d-box" x="460" y="70" width="100" height="40" rx="4"/>
  <text class="d-text" x="510" y="95" text-anchor="middle">stair 4: 5</text>
  <rect class="d-box-accent" x="570" y="30" width="110" height="40" rx="4"/>
  <text class="d-text" x="625" y="55" text-anchor="middle">stair 5: 8</text>
</svg>

Each stair is labelled with its number of ways. Every value is the sum of the two stairs just below it: 8 = 5 + 3.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 180" role="img" aria-label="ways of i is built from ways of i minus 1 by a one step move and from ways of i minus 2 by a two step move">
  <defs>
    <marker id="b27q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="100" width="150" height="50" rx="8"/>
  <text class="d-text" x="95" y="130" text-anchor="middle">ways[i - 2]</text>
  <rect class="d-box" x="245" y="100" width="150" height="50" rx="8"/>
  <text class="d-text" x="320" y="130" text-anchor="middle">ways[i - 1]</text>
  <rect class="d-box-accent" x="470" y="100" width="150" height="50" rx="8"/>
  <text class="d-text" x="545" y="130" text-anchor="middle">ways[i]</text>
  <path class="d-edge-accent" d="M 95 98 Q 320 10 540 96" marker-end="url(#b27q2-arrow)"/>
  <path class="d-edge" d="M 397 125 L 466 125" marker-end="url(#b27q2-arrow)"/>
  <text class="d-sub" x="320" y="44" text-anchor="middle">last move: 2 steps</text>
  <text class="d-sub" x="432" y="165" text-anchor="middle">last move: 1 step</text>
</svg>

Because the two groups (last move 1, last move 2) never share a sequence, adding them counts every sequence exactly once.

📌 **Interview term: Fibonacci relation** — the sequence 1, 1, 2, 3, 5, 8, … is the Fibonacci sequence shifted by one: \`ways(n) = fib(n + 1)\`. Saying this shows you recognise the pattern, but still derive the recurrence from the last move — that reasoning is what generalises to other step sets.

## 4. From Brute Force to O(1) Space

**Brute force — plain recursion.** \`climb(n) = climb(n - 1) + climb(n - 2)\` written directly is correct but recomputes the same stairs again and again. Example 1 counts the calls: 177 for n = 10 and **242,785 for n = 25**. The count grows by about 1.6× per extra stair, so n = 45 would need billions of calls.

**Memoization (top-down).** Same recursion, but store each \`climb(k)\` the first time it is computed. Every stair is solved once: O(n) time, O(n) memory and O(n) recursion depth.

**Tabulation (bottom-up).** Fill \`dp[0..n]\` from left to right. O(n) time, O(n) memory, no recursion.

**Two variables.** \`dp[i]\` only ever reads \`dp[i - 1]\` and \`dp[i - 2]\`, so keep those two numbers and slide them forward.

📌 **Interview term: Rolling variables (space optimisation)** — replacing a DP table with the handful of previous entries the recurrence actually reads, cutting space from O(n) to O(1).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="Two variables slide along the row: twoBack and oneBack become oneBack and their sum">
  <defs>
    <marker id="b27q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="70" y="67" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="130" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="170" y="67" text-anchor="middle">1</text>
  <rect class="d-box" x="230" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="270" y="67" text-anchor="middle">2</text>
  <rect class="d-box" x="330" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="370" y="67" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="430" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="470" y="67" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="530" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="570" y="67" text-anchor="middle">8</text>
  <text class="d-sub" x="470" y="112" text-anchor="middle">twoBack</text>
  <text class="d-sub" x="570" y="112" text-anchor="middle">oneBack</text>
  <path class="d-edge-dashed" d="M 470 124 L 470 150 L 650 150"/>
  <path class="d-edge-dashed" d="M 570 124 L 570 150"/>
  <text class="d-sub" x="560" y="180" text-anchor="middle">next: 5 + 8 = 13</text>
</svg>

Only the two highlighted values are kept in memory. One loop step computes their sum, then shifts: the old \`oneBack\` becomes \`twoBack\`, and the sum becomes \`oneBack\`.

| Approach | Time | Extra space | Comment |
| :--- | :--- | :--- | :--- |
| Plain recursion | O(φⁿ) ≈ O(1.618ⁿ) | O(n) stack | 242,785 calls for n = 25 |
| Memoization | O(n) | O(n) memo + O(n) stack | Each stair solved once |
| Table | O(n) | O(n) | No recursion |
| Two variables | O(n) | O(1) | The answer interviewers want last |

## 5. The JavaScript Code, Line by Line

The final answer — two variables:

~~~javascript
function climb(n) {
  let oneBack = 1, twoBack = 1;          // ways(i - 1), ways(i - 2)
  for (let i = 2; i <= n; i++) {
    const cur = oneBack + twoBack;
    twoBack = oneBack;
    oneBack = cur;
  }
  return oneBack;
}
~~~

The table version:

~~~javascript
function climbTable(n) {
  const dp = new Array(n + 1).fill(1);   // dp[0] = dp[1] = 1
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];       // last move was 1 step or 2 steps
  }
  return dp[n];
}
~~~

And the memoized recursion with a \`Map\`:

~~~javascript
function climbMemo(n, memo) {
  if (n <= 1) return 1;
  if (!memo.has(n)) memo.set(n, climbMemo(n - 1, memo) + climbMemo(n - 2, memo));
  return memo.get(n);
}
~~~

What each JavaScript piece is doing:

- **The temporary \`cur\`** holds the new value so that \`twoBack = oneBack\` still reads the old \`oneBack\`. Destructuring (\`[oneBack, twoBack] = [oneBack + twoBack, oneBack]\`) also works but allocates an array every step.
- **\`for (let i = 2; i <= n; i++)\`** does not run at all for n = 0 or 1, so the function returns 1 without a special case.
- **\`new Array(n + 1).fill(1)\`** gives a dense array with both base cases set.
- **\`Map\` for the memo** keeps numeric keys as numbers and has clear \`has\`/\`get\`/\`set\`; for keys \`0..n\` a plain array would be even simpler.
- **\`Number\` precision.** JavaScript numbers are 64-bit floats, exact for integers only up to \`Number.MAX_SAFE_INTEGER\` = 9007199254740991. Running \`climb\` with plain numbers printed:

~~~text
Number:  climb(77) = 8944394323791464
Number:  climb(78) = 14472334024676220
Number:  climb(91) = 7540113804746346000
MAX_SAFE_INTEGER = 9007199254740991
~~~

\`climb(77)\` is still exact, but the true \`climb(78)\` is 14472334024676221 and the true \`climb(91)\` is 7540113804746346429 (Example 3, which uses \`BigInt\`). There is no error and no warning — the low digits are just wrong. For n ≤ 76 numbers are fine; beyond that use \`BigInt\` (\`1n\`, \`oneBack + twoBack\` on BigInts) or the modulo the problem asks for.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`node main.js\` (Node.js 22; the programs are plain browser-safe scripts, so the page runner prints the same). The same programs in the other three languages print exactly the same lines.

**Example 1 — Four solutions that agree: naive recursion (with call counts), memo, table and two variables** printed:

~~~text
climb(1) = 1 | memo 1 | table 1 | naive 1 in 1 calls
climb(2) = 2 | memo 2 | table 2 | naive 2 in 3 calls
climb(3) = 3 | memo 3 | table 3 | naive 3 in 5 calls
climb(5) = 8 | memo 8 | table 8 | naive 8 in 15 calls
climb(10) = 89 | memo 89 | table 89 | naive 89 in 177 calls
climb(25) = 121393 | memo 121393 | table 121393 | naive 121393 in 242785 calls
climb(45) = 1836311903 (two variables, 44 loop steps)
~~~

**Example 2 — Variants with the same recipe: any set of step sizes, and min cost climbing stairs** printed:

~~~text
ways(4, [1, 2]) = 5
ways(4, [1, 2, 3]) = 7
ways(10, [1, 2, 3]) = 274
ways(7, [2, 5]) = 2
ways(3, [2]) = 0
cheapest climb over [10, 15, 20] = 15
cheapest climb over [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] = 6
~~~

**Example 3 — How big the answer gets: exact values, 32-bit wrap-around and the 2^53 limit** printed:

~~~text
climb(44) = 1134903170 | fits int32: true | as int32: 1134903170 | above 2^53 - 1: false
climb(45) = 1836311903 | fits int32: true | as int32: 1836311903 | above 2^53 - 1: false
climb(46) = 2971215073 | fits int32: false | as int32: -1323752223 | above 2^53 - 1: false
climb(50) = 20365011074 | fits int32: false | as int32: -1109825406 | above 2^53 - 1: false
climb(77) = 8944394323791464 | fits int32: false | as int32: 375819880 | above 2^53 - 1: false
climb(78) = 14472334024676221 | fits int32: false | as int32: -660827267 | above 2^53 - 1: true
climb(91) = 7540113804746346429 | fits int32: false | as int32: 1642909629 | above 2^53 - 1: true
climb(92) = 12200160415121876738 | fits int64: false | as int64: -6246583658587674878
~~~

All four methods in Example 1 agree on every n, and the naive call count is \`2·climb(n) - 1\` each time (15 for n = 5, 177 for n = 10). Example 2 shows the recurrence is a template: change the step set or swap \`+\` for \`min\` and the same loop solves the variant. In Example 3, n = 45 is the last value that fits a 32-bit int, n = 78 is the first above 2^53 - 1, and n = 92 no longer fits a signed 64-bit integer. In JavaScript the exact column comes from \`BigInt\`, and \`BigInt.asIntN(32, x)\` shows what a 32-bit language would hold. The "above 2^53 - 1" column is the one that matters for plain \`Number\`: from n = 78 the plain-number answer is no longer exact.

## 7. Variants Interviewers Ask Next

**Any set of step sizes.** If you may take 1, 2 or 3 steps, the last move could have been any of them: \`ways[i] = ways[i - 1] + ways[i - 2] + ways[i - 3]\`. In general, \`ways[i] = sum of ways[i - s]\` for every allowed step \`s <= i\`, with \`ways[0] = 1\`. That is O(n · k) for k step sizes. Example 2 gives 7 ways for 4 stairs with steps {1, 2, 3}, 274 for 10 stairs, and **0** for 3 stairs with only 2-steps — an odd number cannot be made from 2s, and the table handles that with no special case.

**Min cost climbing stairs.** Each stair \`i\` has a cost \`cost[i]\` paid when you step off it; you may start on stair 0 or 1 and want to reach just past the last stair. Now we minimise instead of count:

\`best[i] = min(best[i - 1] + cost[i - 1], best[i - 2] + cost[i - 2])\`, with \`best[0] = best[1] = 0\`.

Same shape, \`min\` instead of \`+\`. Example 2 prints 15 for \`[10, 15, 20]\` (start on stair 1, pay 15, jump two) and 6 for the longer list.

**Order does not matter.** If 1-2 and 2-1 count as the same climb, you are counting *combinations* of step sizes, which is the coin-change counting problem; the loops swap (step sizes outer, stairs inner). See [coin change](/interview-question/how-do-you-solve-the-coin-change-problem).

**Very large n with a modulo.** Add \`% MOD\` after each addition. For astronomically large n (say 10^18) the recurrence can be raised as a 2×2 matrix power in O(log n) — mention it as a follow-up; nobody expects you to code it for this question.

## 8. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | O(φⁿ) | O(n) | The call tree has \`2·ways(n) - 1\` nodes: 242,785 for n = 25 |
| Memoization | O(n) | O(n) | n states, O(1) each; memo plus recursion stack |
| Table | O(n) | O(n) | One loop step per stair |
| Two variables | O(n) | O(1) | Only the last two values are read |
| k step sizes | O(n · k) | O(n), or O(max step) with a ring buffer | k terms per state |

(The arithmetic is O(1) per step only while the numbers fit a machine word; with big integers each addition costs O(number of digits).)

## 9. Edge Cases

- **n = 1** — one way. **n = 0** — 1 (the empty climb) if allowed; the loop versions return 1 automatically.
- **Step set that cannot reach n** — \`ways(3, [2]) = 0\`; the table returns 0 with no special case.
- **Large n** — 32-bit overflow at n = 46, \`Number\` precision at n = 78, 64-bit signed overflow at n = 92 (all in Example 3).
- **Unsorted or duplicate step sizes** — duplicates would double-count; deduplicate the step list first.

## Common Pitfalls

- **Wrong base case.** \`ways[0] = 0\` breaks every answer; the empty climb counts as one way.
- **Losing precision silently.** Plain numbers are wrong from n = 78 with no error; use \`BigInt\` or a modulo.
- **Shifting without a temporary.** \`oneBack = oneBack + twoBack; twoBack = oneBack;\` copies the new value.
- **Mixing \`BigInt\` and \`Number\`.** \`1n + 1\` throws a \`TypeError\`; start both variables as BigInts (\`1n\`).
- **Recursing for large n.** Memoized recursion is still n deep and can throw \`RangeError: Maximum call stack size exceeded\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Recurrence:</strong> <span style="color:#f0e2c8;">The last move into stair <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> was one step or two, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[i] = ways[i - 1] + ways[i - 2]</code>; the two groups never overlap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Base cases:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[0] = 1</code> for the empty climb and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[1] = 1</code>, giving 1, 1, 2, 3, 5, 8 — Fibonacci shifted by one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why not plain recursion:</strong> <span style="color:#f0e2c8;">It recomputes the same stairs: 242,785 calls for n = 25, exponential in n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Final code:</strong> <span style="color:#f0e2c8;">Two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let</code> variables and a temporary <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur</code>, O(n) time and O(1) space, and no recursion so no stack limit.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Number precision:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number</code> is exact only to 2^53 - 1; the plain-number answer is wrong from n = 78, so for big n I switch to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> or apply the problem modulo.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you can take 1, 2 or 3 steps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sum over the allowed steps: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i] += dp[i - s]</code> for each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s &lt;= i</code>. O(n·k); 274 ways for n = 10.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if each stair has a cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Min cost climbing stairs: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min(oneBack + cost[i - 1], twoBack + cost[i - 2])</code>, base cases 0. 15 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[10, 15, 20]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">BigInt</code> answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Start with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let oneBack = 1n, twoBack = 1n</code> and keep the same loop; every value stays a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code>. Mixing in a plain number throws a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do better than O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The recurrence is a 2×2 matrix power, so fast exponentiation gives O(log n) multiplications; worth mentioning, rarely asked to code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ways[0]</code> equal 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is one way to be at the bottom: no moves. With 0 every later value shifts wrong.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State** | What one table entry means: ways[i] = number of move sequences ending on stair i |
| **Recurrence** | Rule for a state from smaller states: ways[i] = ways[i - 1] + ways[i - 2] |
| **Base case** | States answered directly: ways[0] = ways[1] = 1 |
| **Fibonacci relation** | The answers 1, 1, 2, 3, 5, 8 are Fibonacci shifted by one: ways(n) = fib(n + 1) |
| **Rolling variables (space optimisation)** | Keep only the entries the recurrence reads, O(n) memory becomes O(1) |

---
**Conclusion:** Climbing stairs is solved by looking at the last move: \`ways(n) = ways(n - 1) + ways(n - 2)\` with \`ways(0) = ways(1) = 1\`. Plain recursion is exponential (242,785 calls for n = 25); a loop with two variables gives O(n) time and O(1) space in JavaScript. Remember that \`Number\` stops being exact at 2^53 - 1 — from n = 78 here — so use \`BigInt\` or a modulo for big n. The same "last choice" reasoning extends to any step set, to min cost climbing stairs, and to house robber.`,
        examples: [
          {
            label: "Four solutions that agree: naive recursion (with call counts), memo, table and two variables",
            code: `let calls = 0;

function climbNaive(n) {
  calls++;
  if (n <= 1) return 1;                  // 0 or 1 steps left: exactly one way
  return climbNaive(n - 1) + climbNaive(n - 2);
}

function climbMemo(n, memo) {
  if (n <= 1) return 1;
  if (!memo.has(n)) memo.set(n, climbMemo(n - 1, memo) + climbMemo(n - 2, memo));
  return memo.get(n);
}

function climbTable(n) {
  const dp = new Array(n + 1).fill(1);   // dp[0] = dp[1] = 1
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];       // last move was 1 step or 2 steps
  }
  return dp[n];
}

function climb(n) {
  let oneBack = 1, twoBack = 1;          // ways(i - 1), ways(i - 2)
  for (let i = 2; i <= n; i++) {
    const cur = oneBack + twoBack;
    twoBack = oneBack;
    oneBack = cur;
  }
  return oneBack;
}

for (const n of [1, 2, 3, 5, 10, 25]) {
  calls = 0;
  const slow = climbNaive(n);
  console.log("climb(" + n + ") = " + climb(n) + " | memo " + climbMemo(n, new Map()) +
    " | table " + climbTable(n) + " | naive " + slow + " in " + calls + " calls");
}
console.log("climb(45) = " + climb(45) + " (two variables, 44 loop steps)");
`,
          },
          {
            label: "Variants with the same recipe: any set of step sizes, and min cost climbing stairs",
            code: `function ways(n, steps) {
  // number of ordered ways to climb n stairs using any step size in steps
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1;                             // one way to stand at the bottom: do nothing
  for (let i = 1; i <= n; i++) {
    for (const s of steps) {
      if (s <= i) dp[i] += dp[i - s];    // last move had size s
    }
  }
  return dp[n];
}

function minCost(cost) {
  // pay cost[i] to step off stair i; start on stair 0 or 1; reach the top
  let oneBack = 0, twoBack = 0;          // cheapest way to stand on i - 1, i - 2
  for (let i = 2; i <= cost.length; i++) {
    const cur = Math.min(oneBack + cost[i - 1], twoBack + cost[i - 2]);
    twoBack = oneBack;
    oneBack = cur;
  }
  return oneBack;
}

console.log("ways(4, [1, 2]) = " + ways(4, [1, 2])); // ways(4, [1, 2]) = 5
console.log("ways(4, [1, 2, 3]) = " + ways(4, [1, 2, 3])); // ways(4, [1, 2, 3]) = 7
console.log("ways(10, [1, 2, 3]) = " + ways(10, [1, 2, 3])); // ways(10, [1, 2, 3]) = 274
console.log("ways(7, [2, 5]) = " + ways(7, [2, 5])); // ways(7, [2, 5]) = 2
console.log("ways(3, [2]) = " + ways(3, [2])); // ways(3, [2]) = 0
console.log("cheapest climb over [10, 15, 20] = " + minCost([10, 15, 20])); // cheapest climb over [10, 15, 20] = 15
console.log("cheapest climb over [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] = " + minCost([1, 100, 1, 1, 1, 100, 1, 1, 100, 1])); // cheapest climb over [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] = 6
`,
          },
          {
            label: "How big the answer gets: exact values, 32-bit wrap-around and the 2^53 limit",
            code: `function climb(n) {
  let oneBack = 1n, twoBack = 1n;        // BigInt: exact at any size
  for (let i = 2; i <= n; i++) {
    const cur = oneBack + twoBack;
    twoBack = oneBack;
    oneBack = cur;
  }
  return oneBack;
}

const INT32_MAX = 2n ** 31n - 1n;
const INT64_MAX = 2n ** 63n - 1n;
const SAFE = BigInt(Number.MAX_SAFE_INTEGER);   // 2^53 - 1

for (const n of [44, 45, 46, 50, 77, 78, 91]) {
  const exact = climb(n);
  console.log("climb(" + n + ") = " + exact + " | fits int32: " + (exact <= INT32_MAX) +
    " | as int32: " + BigInt.asIntN(32, exact) + " | above 2^53 - 1: " + (exact > SAFE));
}

const big = climb(92);
console.log("climb(92) = " + big + " | fits int64: " + (big <= INT64_MAX) + " | as int64: " + BigInt.asIntN(64, big));
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are climbing a staircase with n steps. Each move you climb either 1 or 2 steps. In how many distinct ways can you reach the top? Please write it in Java, start with whatever is simplest, then make it efficient."

**What a strong answer should cover:**
- The recurrence from the last move, \`ways(n) = ways(n - 1) + ways(n - 2)\`, and why the two cases do not overlap.
- Correct base cases (\`ways(0) = ways(1) = 1\`) and the link to Fibonacci.
- Why plain recursion is exponential, and the progression memo → table → two variables (O(n) time, O(1) space).
- Generalising to any set of step sizes, or to min cost climbing stairs.
- Java specifics: \`int\` overflows silently from n = 46 (use \`long\` or \`Math.addExact\`), arrays are zero-filled, and a recursive memo can hit \`StackOverflowError\`.

**Clarifying questions expected:**
- "Are the moves exactly 1 or 2 steps, and does order matter?"
- "How large can n be — do I need 64-bit numbers or a modulo?"

**Code / implementation expected:** Yes — a short Java function, ideally the O(1)-space loop.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; this is usually the first dynamic programming problem people meet.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A child runs up the stairs to bed. Sometimes she takes one step, sometimes she jumps two. Her older brother, bored, asks: "There are 5 stairs. How many different ways can you go up?" She starts listing — 1-1-1-1-1, 2-1-1-1, 1-2-1-1, … — loses track, and gives up.

Here is the trick that makes it easy. Stand on the top stair and look back. **How did you get here?** Your last move was either one step (so you came from stair 4) or two steps (so you came from stair 3). Every way to reach stair 5 is "a way to reach stair 4, then one step" or "a way to reach stair 3, then two steps", and those two groups never overlap. So:

ways(5) = ways(4) + ways(3)

That single sentence is the solution. Climbing stairs is the "hello world" of [dynamic programming](/interview-question/what-is-dynamic-programming): interviewers use it to see whether you can find a recurrence by thinking about the **last choice**, set the base cases correctly, and then make the solution fast and small.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the allowed moves exactly 1 or 2 steps? | Other step sets (say 1, 2, 3) change the recurrence to a sum over the allowed steps; Example 2 handles any set. |
| Does order matter — is 1-2 different from 2-1? | In the standard problem yes (we count sequences of moves). If order did not matter it would be a coin-change *combinations* count, a different loop order — see [coin change](/interview-question/how-do-you-solve-the-coin-change-problem). |
| How large can n be? | The answer grows like Fibonacci. The LeetCode 70 statement, as mirrored on sites such as [labuladong](https://labuladong.online/en/problem/leetcode/climbing-stairs/description/), caps n at 45 — exactly the largest n whose answer fits a 32-bit signed int (Example 3). Bigger n needs 64-bit, big integers, or a modulo. |
| What should n = 0 return? | Usually 1 (the empty climb) or "n is at least 1". Decide before writing base cases. |
| Is there a cost per stair? | Then it becomes the *min cost climbing stairs* variant: minimise a sum instead of counting (Example 2). |

## 3. The Core Idea: Look at the Last Move

📌 **Interview term: State** — what one number in our table means. Here: \`ways[i]\` = the number of different move sequences that end exactly on stair \`i\`.

📌 **Interview term: Recurrence** — the rule for a state in terms of smaller states. The last move into stair \`i\` was 1 step (from \`i - 1\`) or 2 steps (from \`i - 2\`), so

\`ways[i] = ways[i - 1] + ways[i - 2]\`

📌 **Interview term: Base case** — states answered directly. \`ways[0] = 1\` (standing at the bottom, there is exactly one way: do nothing) and \`ways[1] = 1\` (one single step). With those two, the recurrence gives \`ways[2] = 2\`, \`ways[3] = 3\`, \`ways[4] = 5\`, \`ways[5] = 8\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="A staircase of stairs 0 to 5 labelled with the number of ways to reach each: 1, 1, 2, 3, 5, 8">
  <rect class="d-box-muted" x="20" y="230" width="100" height="40" rx="4"/>
  <text class="d-text" x="70" y="255" text-anchor="middle">stair 0: 1</text>
  <rect class="d-box-muted" x="130" y="190" width="100" height="40" rx="4"/>
  <text class="d-text" x="180" y="215" text-anchor="middle">stair 1: 1</text>
  <rect class="d-box" x="240" y="150" width="100" height="40" rx="4"/>
  <text class="d-text" x="290" y="175" text-anchor="middle">stair 2: 2</text>
  <rect class="d-box" x="350" y="110" width="100" height="40" rx="4"/>
  <text class="d-text" x="400" y="135" text-anchor="middle">stair 3: 3</text>
  <rect class="d-box" x="460" y="70" width="100" height="40" rx="4"/>
  <text class="d-text" x="510" y="95" text-anchor="middle">stair 4: 5</text>
  <rect class="d-box-accent" x="570" y="30" width="110" height="40" rx="4"/>
  <text class="d-text" x="625" y="55" text-anchor="middle">stair 5: 8</text>
</svg>

Each stair is labelled with its number of ways. Every value is the sum of the two stairs just below it: 8 = 5 + 3.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 180" role="img" aria-label="ways of i is built from ways of i minus 1 by a one step move and from ways of i minus 2 by a two step move">
  <defs>
    <marker id="b27q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="100" width="150" height="50" rx="8"/>
  <text class="d-text" x="95" y="130" text-anchor="middle">ways[i - 2]</text>
  <rect class="d-box" x="245" y="100" width="150" height="50" rx="8"/>
  <text class="d-text" x="320" y="130" text-anchor="middle">ways[i - 1]</text>
  <rect class="d-box-accent" x="470" y="100" width="150" height="50" rx="8"/>
  <text class="d-text" x="545" y="130" text-anchor="middle">ways[i]</text>
  <path class="d-edge-accent" d="M 95 98 Q 320 10 540 96" marker-end="url(#b27q2-arrow)"/>
  <path class="d-edge" d="M 397 125 L 466 125" marker-end="url(#b27q2-arrow)"/>
  <text class="d-sub" x="320" y="44" text-anchor="middle">last move: 2 steps</text>
  <text class="d-sub" x="432" y="165" text-anchor="middle">last move: 1 step</text>
</svg>

Because the two groups (last move 1, last move 2) never share a sequence, adding them counts every sequence exactly once.

📌 **Interview term: Fibonacci relation** — the sequence 1, 1, 2, 3, 5, 8, … is the Fibonacci sequence shifted by one: \`ways(n) = fib(n + 1)\`. Saying this shows you recognise the pattern, but still derive the recurrence from the last move — that reasoning is what generalises to other step sets.

## 4. From Brute Force to O(1) Space

**Brute force — plain recursion.** \`climb(n) = climb(n - 1) + climb(n - 2)\` written directly is correct but recomputes the same stairs again and again. Example 1 counts the calls: 177 for n = 10 and **242,785 for n = 25**. The count grows by about 1.6× per extra stair, so n = 45 would need billions of calls.

**Memoization (top-down).** Same recursion, but store each \`climb(k)\` the first time it is computed. Every stair is solved once: O(n) time, O(n) memory and O(n) recursion depth.

**Tabulation (bottom-up).** Fill \`dp[0..n]\` from left to right. O(n) time, O(n) memory, no recursion.

**Two variables.** \`dp[i]\` only ever reads \`dp[i - 1]\` and \`dp[i - 2]\`, so keep those two numbers and slide them forward.

📌 **Interview term: Rolling variables (space optimisation)** — replacing a DP table with the handful of previous entries the recurrence actually reads, cutting space from O(n) to O(1).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="Two variables slide along the row: twoBack and oneBack become oneBack and their sum">
  <defs>
    <marker id="b27q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="70" y="67" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="130" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="170" y="67" text-anchor="middle">1</text>
  <rect class="d-box" x="230" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="270" y="67" text-anchor="middle">2</text>
  <rect class="d-box" x="330" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="370" y="67" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="430" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="470" y="67" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="530" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="570" y="67" text-anchor="middle">8</text>
  <text class="d-sub" x="470" y="112" text-anchor="middle">twoBack</text>
  <text class="d-sub" x="570" y="112" text-anchor="middle">oneBack</text>
  <path class="d-edge-dashed" d="M 470 124 L 470 150 L 650 150"/>
  <path class="d-edge-dashed" d="M 570 124 L 570 150"/>
  <text class="d-sub" x="560" y="180" text-anchor="middle">next: 5 + 8 = 13</text>
</svg>

Only the two highlighted values are kept in memory. One loop step computes their sum, then shifts: the old \`oneBack\` becomes \`twoBack\`, and the sum becomes \`oneBack\`.

| Approach | Time | Extra space | Comment |
| :--- | :--- | :--- | :--- |
| Plain recursion | O(φⁿ) ≈ O(1.618ⁿ) | O(n) stack | 242,785 calls for n = 25 |
| Memoization | O(n) | O(n) memo + O(n) stack | Each stair solved once |
| Table | O(n) | O(n) | No recursion |
| Two variables | O(n) | O(1) | The answer interviewers want last |

## 5. The Java Code, Line by Line

The final answer — two variables:

~~~java
static int climb(int n) {
    int oneBack = 1, twoBack = 1;              // ways(i - 1), ways(i - 2)
    for (int i = 2; i <= n; i++) {
        int cur = oneBack + twoBack;
        twoBack = oneBack;
        oneBack = cur;
    }
    return oneBack;
}
~~~

The table version:

~~~java
static int climbTable(int n) {
    int[] dp = new int[n + 1];
    dp[0] = 1;
    dp[1] = 1;
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];         // last move was 1 step or 2 steps
    }
    return dp[n];
}
~~~

What each Java piece is doing:

- **The temporary \`cur\`** keeps the old \`oneBack\` available for \`twoBack = oneBack\`.
- **The loop does not run for n = 0 or 1**, so \`climb\` returns 1 there without a special case. \`climbTable\` as written needs \`n >= 1\`, because \`dp[1] = 1\` on an array of length 1 would throw \`ArrayIndexOutOfBoundsException\`; the two-variable version has no such edge.
- **\`int\` is enough for n ≤ 45, and not one stair more.** \`climb(45) = 1836311903\` and \`Integer.MAX_VALUE\` is 2147483647; \`climb(46) = 2971215073\` does not fit. Java does not throw on overflow — Example 3 shows the wrapped \`int\` value is \`-1323752223\`. For larger n change the type to \`long\` (exact through n = 91), use \`Math.addExact\` to fail loudly (it throws \`ArithmeticException: integer overflow\`, which was checked), or \`BigInteger\`.
- **Memo choice.** A \`HashMap<Integer, Integer>\` memo works (Example 1) but boxes every key and value. Since the states are exactly \`0..n\`, an \`int[] memo\` with 0 meaning "unknown" (every real answer is at least 1) is smaller and faster.
- **Recursion depth.** The memo version is n calls deep; for very large n it can throw \`StackOverflowError\`. The loop cannot.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs in the other three languages print exactly the same lines.

**Example 1 — Four solutions that agree: naive recursion (with call counts), memo, table and two variables** printed:

~~~text
climb(1) = 1 | memo 1 | table 1 | naive 1 in 1 calls
climb(2) = 2 | memo 2 | table 2 | naive 2 in 3 calls
climb(3) = 3 | memo 3 | table 3 | naive 3 in 5 calls
climb(5) = 8 | memo 8 | table 8 | naive 8 in 15 calls
climb(10) = 89 | memo 89 | table 89 | naive 89 in 177 calls
climb(25) = 121393 | memo 121393 | table 121393 | naive 121393 in 242785 calls
climb(45) = 1836311903 (two variables, 44 loop steps)
~~~

**Example 2 — Variants with the same recipe: any set of step sizes, and min cost climbing stairs** printed:

~~~text
ways(4, [1, 2]) = 5
ways(4, [1, 2, 3]) = 7
ways(10, [1, 2, 3]) = 274
ways(7, [2, 5]) = 2
ways(3, [2]) = 0
cheapest climb over [10, 15, 20] = 15
cheapest climb over [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] = 6
~~~

**Example 3 — How big the answer gets: exact values, 32-bit wrap-around and the 2^53 limit** printed:

~~~text
climb(44) = 1134903170 | fits int32: true | as int32: 1134903170 | above 2^53 - 1: false
climb(45) = 1836311903 | fits int32: true | as int32: 1836311903 | above 2^53 - 1: false
climb(46) = 2971215073 | fits int32: false | as int32: -1323752223 | above 2^53 - 1: false
climb(50) = 20365011074 | fits int32: false | as int32: -1109825406 | above 2^53 - 1: false
climb(77) = 8944394323791464 | fits int32: false | as int32: 375819880 | above 2^53 - 1: false
climb(78) = 14472334024676221 | fits int32: false | as int32: -660827267 | above 2^53 - 1: true
climb(91) = 7540113804746346429 | fits int32: false | as int32: 1642909629 | above 2^53 - 1: true
climb(92) = 12200160415121876738 | fits int64: false | as int64: -6246583658587674878
~~~

All four methods in Example 1 agree on every n, and the naive call count is \`2·climb(n) - 1\` each time (15 for n = 5, 177 for n = 10). Example 2 shows the recurrence is a template: change the step set or swap \`+\` for \`min\` and the same loop solves the variant. In Example 3, n = 45 is the last value that fits a 32-bit int, n = 78 is the first above 2^53 - 1, and n = 92 no longer fits a signed 64-bit integer. In Java the exact column is a \`long\`, \`(int) exact\` shows what an \`int\` would hold, and \`Long.toUnsignedString\` prints the true 64-bit unsigned value of \`climb(92)\` because the signed \`long\` has already wrapped to a negative number.

## 7. Variants Interviewers Ask Next

**Any set of step sizes.** If you may take 1, 2 or 3 steps, the last move could have been any of them: \`ways[i] = ways[i - 1] + ways[i - 2] + ways[i - 3]\`. In general, \`ways[i] = sum of ways[i - s]\` for every allowed step \`s <= i\`, with \`ways[0] = 1\`. That is O(n · k) for k step sizes. Example 2 gives 7 ways for 4 stairs with steps {1, 2, 3}, 274 for 10 stairs, and **0** for 3 stairs with only 2-steps — an odd number cannot be made from 2s, and the table handles that with no special case.

**Min cost climbing stairs.** Each stair \`i\` has a cost \`cost[i]\` paid when you step off it; you may start on stair 0 or 1 and want to reach just past the last stair. Now we minimise instead of count:

\`best[i] = min(best[i - 1] + cost[i - 1], best[i - 2] + cost[i - 2])\`, with \`best[0] = best[1] = 0\`.

Same shape, \`min\` instead of \`+\`. Example 2 prints 15 for \`[10, 15, 20]\` (start on stair 1, pay 15, jump two) and 6 for the longer list.

**Order does not matter.** If 1-2 and 2-1 count as the same climb, you are counting *combinations* of step sizes, which is the coin-change counting problem; the loops swap (step sizes outer, stairs inner). See [coin change](/interview-question/how-do-you-solve-the-coin-change-problem).

**Very large n with a modulo.** Add \`% MOD\` after each addition. For astronomically large n (say 10^18) the recurrence can be raised as a 2×2 matrix power in O(log n) — mention it as a follow-up; nobody expects you to code it for this question.

## 8. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | O(φⁿ) | O(n) | The call tree has \`2·ways(n) - 1\` nodes: 242,785 for n = 25 |
| Memoization | O(n) | O(n) | n states, O(1) each; memo plus recursion stack |
| Table | O(n) | O(n) | One loop step per stair |
| Two variables | O(n) | O(1) | Only the last two values are read |
| k step sizes | O(n · k) | O(n), or O(max step) with a ring buffer | k terms per state |

(The arithmetic is O(1) per step only while the numbers fit a machine word; with big integers each addition costs O(number of digits).)

## 9. Edge Cases

- **n = 1** — one way. **n = 0** — 1 (the empty climb) if allowed; the loop versions return 1 automatically.
- **Step set that cannot reach n** — \`ways(3, [2]) = 0\`; the table returns 0 with no special case.
- **Large n** — 32-bit overflow at n = 46, \`Number\` precision at n = 78, 64-bit signed overflow at n = 92 (all in Example 3).
- **Unsorted or duplicate step sizes** — duplicates would double-count; deduplicate the step list first.

## Common Pitfalls

- **Wrong base case.** \`dp[0] = 0\` breaks every answer; the empty climb counts as one way.
- **\`int\` overflow past n = 45.** No exception, just a negative or wrong number; use \`long\`, \`Math.addExact\` or \`BigInteger\`.
- **\`dp[1] = 1\` on an array of length 1** throws for n = 0; guard it or use the two-variable form.
- **Shifting without a temporary** copies the new value into \`twoBack\`.
- **Boxed \`HashMap\` memo** for dense keys \`0..n\` — slower and lets you write \`==\` on \`Integer\`s by mistake; an \`int[]\` is simpler.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Recurrence:</strong> <span style="color:#f0e2c8;">The last move into stair <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> was one step or two, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[i] = ways[i - 1] + ways[i - 2]</code>; the groups never overlap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Base cases:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[0] = 1</code> for the empty climb and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[1] = 1</code>, giving 1, 1, 2, 3, 5, 8 — Fibonacci shifted by one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why not plain recursion:</strong> <span style="color:#f0e2c8;">It recomputes the same stairs: 242,785 calls for n = 25, exponential in n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Final code:</strong> <span style="color:#f0e2c8;">Two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> variables and a temporary, O(n) time and O(1) space, no recursion so no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Overflow:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> holds the answer only up to n = 45; for larger n I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>, which is exact up to n = 91, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.addExact</code> to fail loudly.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you can take 1, 2 or 3 steps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sum over the allowed steps: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i] += dp[i - s]</code> for each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s &lt;= i</code>, using a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long[]</code>. 274 ways for n = 10.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if each stair has a cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Min cost climbing stairs: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min(oneBack + cost[i - 1], twoBack + cost[i - 2])</code>, base cases 0. 15 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[10, 15, 20]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens at n = 46 with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It silently wraps to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1323752223</code>. Java integer arithmetic never throws unless you use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.addExact</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do better than O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The recurrence is a 2×2 matrix power, so fast exponentiation gives O(log n) multiplications.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ways[0]</code> equal 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is one way to be at the bottom: no moves. With 0 every later value shifts wrong.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State** | What one table entry means: ways[i] = number of move sequences ending on stair i |
| **Recurrence** | Rule for a state from smaller states: ways[i] = ways[i - 1] + ways[i - 2] |
| **Base case** | States answered directly: ways[0] = ways[1] = 1 |
| **Fibonacci relation** | The answers 1, 1, 2, 3, 5, 8 are Fibonacci shifted by one: ways(n) = fib(n + 1) |
| **Rolling variables (space optimisation)** | Keep only the entries the recurrence reads, O(n) memory becomes O(1) |

---
**Conclusion:** Climbing stairs is solved by looking at the last move: \`ways(n) = ways(n - 1) + ways(n - 2)\` with \`ways(0) = ways(1) = 1\`. Plain recursion is exponential (242,785 calls for n = 25); a loop with two variables gives O(n) time and O(1) space in Java. \`int\` is exact only up to n = 45, so say so and switch to \`long\` (or \`Math.addExact\`, or a modulo) for larger inputs. The same "last choice" reasoning extends to any step set, to min cost climbing stairs, and to house robber.`,
        examples: [
          {
            label: "Four solutions that agree: naive recursion (with call counts), memo, table and two variables",
            code: `import java.util.HashMap;
import java.util.Map;

public class Main {
    static long calls = 0;

    static int climbNaive(int n) {
        calls++;
        if (n <= 1) return 1;                      // 0 or 1 steps left: exactly one way
        return climbNaive(n - 1) + climbNaive(n - 2);
    }

    static int climbMemo(int n, Map<Integer, Integer> memo) {
        if (n <= 1) return 1;
        Integer known = memo.get(n);
        if (known != null) return known;
        int value = climbMemo(n - 1, memo) + climbMemo(n - 2, memo);
        memo.put(n, value);
        return value;
    }

    static int climbTable(int n) {
        int[] dp = new int[n + 1];
        dp[0] = 1;
        dp[1] = 1;
        for (int i = 2; i <= n; i++) {
            dp[i] = dp[i - 1] + dp[i - 2];         // last move was 1 step or 2 steps
        }
        return dp[n];
    }

    static int climb(int n) {
        int oneBack = 1, twoBack = 1;              // ways(i - 1), ways(i - 2)
        for (int i = 2; i <= n; i++) {
            int cur = oneBack + twoBack;
            twoBack = oneBack;
            oneBack = cur;
        }
        return oneBack;
    }

    public static void main(String[] args) {
        for (int n : new int[] {1, 2, 3, 5, 10, 25}) {
            calls = 0;
            int slow = climbNaive(n);
            System.out.println("climb(" + n + ") = " + climb(n) + " | memo " + climbMemo(n, new HashMap<>())
                + " | table " + climbTable(n) + " | naive " + slow + " in " + calls + " calls");
        }
        System.out.println("climb(45) = " + climb(45) + " (two variables, 44 loop steps)");
    }
}
`,
          },
          {
            label: "Variants with the same recipe: any set of step sizes, and min cost climbing stairs",
            code: `public class Main {
    static long ways(int n, int[] steps) {
        // number of ordered ways to climb n stairs using any step size in steps
        long[] dp = new long[n + 1];
        dp[0] = 1;                                 // one way to stand at the bottom: do nothing
        for (int i = 1; i <= n; i++) {
            for (int s : steps) {
                if (s <= i) dp[i] += dp[i - s];    // last move had size s
            }
        }
        return dp[n];
    }

    static int minCost(int[] cost) {
        // pay cost[i] to step off stair i; start on stair 0 or 1; reach the top
        int oneBack = 0, twoBack = 0;              // cheapest way to stand on i - 1, i - 2
        for (int i = 2; i <= cost.length; i++) {
            int cur = Math.min(oneBack + cost[i - 1], twoBack + cost[i - 2]);
            twoBack = oneBack;
            oneBack = cur;
        }
        return oneBack;
    }

    public static void main(String[] args) {
        System.out.println("ways(4, [1, 2]) = " + ways(4, new int[] {1, 2}));
        System.out.println("ways(4, [1, 2, 3]) = " + ways(4, new int[] {1, 2, 3}));
        System.out.println("ways(10, [1, 2, 3]) = " + ways(10, new int[] {1, 2, 3}));
        System.out.println("ways(7, [2, 5]) = " + ways(7, new int[] {2, 5}));
        System.out.println("ways(3, [2]) = " + ways(3, new int[] {2}));
        System.out.println("cheapest climb over [10, 15, 20] = " + minCost(new int[] {10, 15, 20}));
        System.out.println("cheapest climb over [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] = "
            + minCost(new int[] {1, 100, 1, 1, 1, 100, 1, 1, 100, 1}));
    }
}
`,
          },
          {
            label: "How big the answer gets: exact values, 32-bit wrap-around and the 2^53 limit",
            code: `public class Main {
    static long climb(int n) {
        long oneBack = 1, twoBack = 1;             // long: exact up to 2^63 - 1
        for (int i = 2; i <= n; i++) {
            long cur = oneBack + twoBack;          // wraps silently past Long.MAX_VALUE
            twoBack = oneBack;
            oneBack = cur;
        }
        return oneBack;
    }

    public static void main(String[] args) {
        long safe = (1L << 53) - 1;                // JavaScript Number.MAX_SAFE_INTEGER
        for (int n : new int[] {44, 45, 46, 50, 77, 78, 91}) {
            long exact = climb(n);
            System.out.println("climb(" + n + ") = " + exact + " | fits int32: " + (exact <= Integer.MAX_VALUE)
                + " | as int32: " + (int) exact + " | above 2^53 - 1: " + (exact > safe));
        }
        long wrapped = climb(92);                  // the true value needs 64 unsigned bits
        // a negative long here means the sum wrapped past Long.MAX_VALUE
        System.out.println("climb(92) = " + Long.toUnsignedString(wrapped) + " | fits int64: " + (wrapped >= 0)
            + " | as int64: " + wrapped);
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are climbing a staircase with n steps. Each move you climb either 1 or 2 steps. In how many distinct ways can you reach the top? Please write it in C++, start with whatever is simplest, then make it efficient."

**What a strong answer should cover:**
- The recurrence from the last move, \`ways(n) = ways(n - 1) + ways(n - 2)\`, and why the two cases do not overlap.
- Correct base cases (\`ways(0) = ways(1) = 1\`) and the link to Fibonacci.
- Why plain recursion is exponential, and the progression memo → table → two variables (O(n) time, O(1) space).
- Generalising to any set of step sizes, or to min cost climbing stairs.
- C++ specifics: signed overflow from n = 46 is undefined behaviour (use \`long long\` or unsigned arithmetic), and \`memo[n]\` inserts zeros (use \`find\` or a \`vector\`).

**Clarifying questions expected:**
- "Are the moves exactly 1 or 2 steps, and does order matter?"
- "How large can n be — do I need 64-bit numbers or a modulo?"

**Code / implementation expected:** Yes — a short C++ function, ideally the O(1)-space loop.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; this is usually the first dynamic programming problem people meet.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A child runs up the stairs to bed. Sometimes she takes one step, sometimes she jumps two. Her older brother, bored, asks: "There are 5 stairs. How many different ways can you go up?" She starts listing — 1-1-1-1-1, 2-1-1-1, 1-2-1-1, … — loses track, and gives up.

Here is the trick that makes it easy. Stand on the top stair and look back. **How did you get here?** Your last move was either one step (so you came from stair 4) or two steps (so you came from stair 3). Every way to reach stair 5 is "a way to reach stair 4, then one step" or "a way to reach stair 3, then two steps", and those two groups never overlap. So:

ways(5) = ways(4) + ways(3)

That single sentence is the solution. Climbing stairs is the "hello world" of [dynamic programming](/interview-question/what-is-dynamic-programming): interviewers use it to see whether you can find a recurrence by thinking about the **last choice**, set the base cases correctly, and then make the solution fast and small.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the allowed moves exactly 1 or 2 steps? | Other step sets (say 1, 2, 3) change the recurrence to a sum over the allowed steps; Example 2 handles any set. |
| Does order matter — is 1-2 different from 2-1? | In the standard problem yes (we count sequences of moves). If order did not matter it would be a coin-change *combinations* count, a different loop order — see [coin change](/interview-question/how-do-you-solve-the-coin-change-problem). |
| How large can n be? | The answer grows like Fibonacci. The LeetCode 70 statement, as mirrored on sites such as [labuladong](https://labuladong.online/en/problem/leetcode/climbing-stairs/description/), caps n at 45 — exactly the largest n whose answer fits a 32-bit signed int (Example 3). Bigger n needs 64-bit, big integers, or a modulo. |
| What should n = 0 return? | Usually 1 (the empty climb) or "n is at least 1". Decide before writing base cases. |
| Is there a cost per stair? | Then it becomes the *min cost climbing stairs* variant: minimise a sum instead of counting (Example 2). |

## 3. The Core Idea: Look at the Last Move

📌 **Interview term: State** — what one number in our table means. Here: \`ways[i]\` = the number of different move sequences that end exactly on stair \`i\`.

📌 **Interview term: Recurrence** — the rule for a state in terms of smaller states. The last move into stair \`i\` was 1 step (from \`i - 1\`) or 2 steps (from \`i - 2\`), so

\`ways[i] = ways[i - 1] + ways[i - 2]\`

📌 **Interview term: Base case** — states answered directly. \`ways[0] = 1\` (standing at the bottom, there is exactly one way: do nothing) and \`ways[1] = 1\` (one single step). With those two, the recurrence gives \`ways[2] = 2\`, \`ways[3] = 3\`, \`ways[4] = 5\`, \`ways[5] = 8\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="A staircase of stairs 0 to 5 labelled with the number of ways to reach each: 1, 1, 2, 3, 5, 8">
  <rect class="d-box-muted" x="20" y="230" width="100" height="40" rx="4"/>
  <text class="d-text" x="70" y="255" text-anchor="middle">stair 0: 1</text>
  <rect class="d-box-muted" x="130" y="190" width="100" height="40" rx="4"/>
  <text class="d-text" x="180" y="215" text-anchor="middle">stair 1: 1</text>
  <rect class="d-box" x="240" y="150" width="100" height="40" rx="4"/>
  <text class="d-text" x="290" y="175" text-anchor="middle">stair 2: 2</text>
  <rect class="d-box" x="350" y="110" width="100" height="40" rx="4"/>
  <text class="d-text" x="400" y="135" text-anchor="middle">stair 3: 3</text>
  <rect class="d-box" x="460" y="70" width="100" height="40" rx="4"/>
  <text class="d-text" x="510" y="95" text-anchor="middle">stair 4: 5</text>
  <rect class="d-box-accent" x="570" y="30" width="110" height="40" rx="4"/>
  <text class="d-text" x="625" y="55" text-anchor="middle">stair 5: 8</text>
</svg>

Each stair is labelled with its number of ways. Every value is the sum of the two stairs just below it: 8 = 5 + 3.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 180" role="img" aria-label="ways of i is built from ways of i minus 1 by a one step move and from ways of i minus 2 by a two step move">
  <defs>
    <marker id="b27q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="100" width="150" height="50" rx="8"/>
  <text class="d-text" x="95" y="130" text-anchor="middle">ways[i - 2]</text>
  <rect class="d-box" x="245" y="100" width="150" height="50" rx="8"/>
  <text class="d-text" x="320" y="130" text-anchor="middle">ways[i - 1]</text>
  <rect class="d-box-accent" x="470" y="100" width="150" height="50" rx="8"/>
  <text class="d-text" x="545" y="130" text-anchor="middle">ways[i]</text>
  <path class="d-edge-accent" d="M 95 98 Q 320 10 540 96" marker-end="url(#b27q2-arrow)"/>
  <path class="d-edge" d="M 397 125 L 466 125" marker-end="url(#b27q2-arrow)"/>
  <text class="d-sub" x="320" y="44" text-anchor="middle">last move: 2 steps</text>
  <text class="d-sub" x="432" y="165" text-anchor="middle">last move: 1 step</text>
</svg>

Because the two groups (last move 1, last move 2) never share a sequence, adding them counts every sequence exactly once.

📌 **Interview term: Fibonacci relation** — the sequence 1, 1, 2, 3, 5, 8, … is the Fibonacci sequence shifted by one: \`ways(n) = fib(n + 1)\`. Saying this shows you recognise the pattern, but still derive the recurrence from the last move — that reasoning is what generalises to other step sets.

## 4. From Brute Force to O(1) Space

**Brute force — plain recursion.** \`climb(n) = climb(n - 1) + climb(n - 2)\` written directly is correct but recomputes the same stairs again and again. Example 1 counts the calls: 177 for n = 10 and **242,785 for n = 25**. The count grows by about 1.6× per extra stair, so n = 45 would need billions of calls.

**Memoization (top-down).** Same recursion, but store each \`climb(k)\` the first time it is computed. Every stair is solved once: O(n) time, O(n) memory and O(n) recursion depth.

**Tabulation (bottom-up).** Fill \`dp[0..n]\` from left to right. O(n) time, O(n) memory, no recursion.

**Two variables.** \`dp[i]\` only ever reads \`dp[i - 1]\` and \`dp[i - 2]\`, so keep those two numbers and slide them forward.

📌 **Interview term: Rolling variables (space optimisation)** — replacing a DP table with the handful of previous entries the recurrence actually reads, cutting space from O(n) to O(1).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="Two variables slide along the row: twoBack and oneBack become oneBack and their sum">
  <defs>
    <marker id="b27q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="70" y="67" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="130" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="170" y="67" text-anchor="middle">1</text>
  <rect class="d-box" x="230" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="270" y="67" text-anchor="middle">2</text>
  <rect class="d-box" x="330" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="370" y="67" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="430" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="470" y="67" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="530" y="40" width="80" height="44" rx="6"/>
  <text class="d-text" x="570" y="67" text-anchor="middle">8</text>
  <text class="d-sub" x="470" y="112" text-anchor="middle">twoBack</text>
  <text class="d-sub" x="570" y="112" text-anchor="middle">oneBack</text>
  <path class="d-edge-dashed" d="M 470 124 L 470 150 L 650 150"/>
  <path class="d-edge-dashed" d="M 570 124 L 570 150"/>
  <text class="d-sub" x="560" y="180" text-anchor="middle">next: 5 + 8 = 13</text>
</svg>

Only the two highlighted values are kept in memory. One loop step computes their sum, then shifts: the old \`oneBack\` becomes \`twoBack\`, and the sum becomes \`oneBack\`.

| Approach | Time | Extra space | Comment |
| :--- | :--- | :--- | :--- |
| Plain recursion | O(φⁿ) ≈ O(1.618ⁿ) | O(n) stack | 242,785 calls for n = 25 |
| Memoization | O(n) | O(n) memo + O(n) stack | Each stair solved once |
| Table | O(n) | O(n) | No recursion |
| Two variables | O(n) | O(1) | The answer interviewers want last |

## 5. The C++ Code, Line by Line

The final answer — two variables:

~~~cpp
int climb(int n) {
    int oneBack = 1, twoBack = 1;                 // ways(i - 1), ways(i - 2)
    for (int i = 2; i <= n; i++) {
        int cur = oneBack + twoBack;
        twoBack = oneBack;
        oneBack = cur;
    }
    return oneBack;
}
~~~

The table version:

~~~cpp
int climbTable(int n) {
    std::vector<int> dp(n + 1, 1);                // dp[0] = dp[1] = 1
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];            // last move was 1 step or 2 steps
    }
    return dp[n];
}
~~~

What each C++ piece is doing:

- **The temporary \`cur\`** keeps the old \`oneBack\` for the shift. (\`std::exchange\` can do the shift in one line, but the three-line form is clearer in an interview.)
- **The loop does not run for n = 0 or 1**, so both functions return 1 with no special case; \`std::vector<int> dp(n + 1, 1)\` also sets both base cases.
- **\`int\` holds the answer only through n = 45.** \`climb(46) = 2971215073\` is larger than \`INT_MAX\` (2147483647). In C++ signed overflow is undefined behaviour — not merely a wrong number — so the program is incorrect, and the optimiser is allowed to assume it never happens. Example 3 avoids that: it adds \`std::uint64_t\` values (unsigned arithmetic wraps by definition) and then casts to show what a 32-bit \`int\` would hold. With g++ 13 the cast printed \`-1323752223\` for n = 46; how other compilers define that narrowing cast under C++17 was not checked here. The practical rule: use \`long long\` (exact through n = 91), or \`unsigned long long\` (through n = 92), or a modulo.
- **Memo choice.** \`std::unordered_map<int, int>\` works (Example 1), but look it up with \`find\`, never \`memo[n]\`, which inserts a zero. For states \`0..n\`, \`std::vector<int> memo(n + 1, 0)\` is simpler and faster (0 can mean "unknown" because every real answer is at least 1).

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (g++ 13). The same programs in the other three languages print exactly the same lines.

**Example 1 — Four solutions that agree: naive recursion (with call counts), memo, table and two variables** printed:

~~~text
climb(1) = 1 | memo 1 | table 1 | naive 1 in 1 calls
climb(2) = 2 | memo 2 | table 2 | naive 2 in 3 calls
climb(3) = 3 | memo 3 | table 3 | naive 3 in 5 calls
climb(5) = 8 | memo 8 | table 8 | naive 8 in 15 calls
climb(10) = 89 | memo 89 | table 89 | naive 89 in 177 calls
climb(25) = 121393 | memo 121393 | table 121393 | naive 121393 in 242785 calls
climb(45) = 1836311903 (two variables, 44 loop steps)
~~~

**Example 2 — Variants with the same recipe: any set of step sizes, and min cost climbing stairs** printed:

~~~text
ways(4, [1, 2]) = 5
ways(4, [1, 2, 3]) = 7
ways(10, [1, 2, 3]) = 274
ways(7, [2, 5]) = 2
ways(3, [2]) = 0
cheapest climb over [10, 15, 20] = 15
cheapest climb over [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] = 6
~~~

**Example 3 — How big the answer gets: exact values, 32-bit wrap-around and the 2^53 limit** printed:

~~~text
climb(44) = 1134903170 | fits int32: true | as int32: 1134903170 | above 2^53 - 1: false
climb(45) = 1836311903 | fits int32: true | as int32: 1836311903 | above 2^53 - 1: false
climb(46) = 2971215073 | fits int32: false | as int32: -1323752223 | above 2^53 - 1: false
climb(50) = 20365011074 | fits int32: false | as int32: -1109825406 | above 2^53 - 1: false
climb(77) = 8944394323791464 | fits int32: false | as int32: 375819880 | above 2^53 - 1: false
climb(78) = 14472334024676221 | fits int32: false | as int32: -660827267 | above 2^53 - 1: true
climb(91) = 7540113804746346429 | fits int32: false | as int32: 1642909629 | above 2^53 - 1: true
climb(92) = 12200160415121876738 | fits int64: false | as int64: -6246583658587674878
~~~

All four methods in Example 1 agree on every n, and the naive call count is \`2·climb(n) - 1\` each time (15 for n = 5, 177 for n = 10). Example 2 shows the recurrence is a template: change the step set or swap \`+\` for \`min\` and the same loop solves the variant. In Example 3, n = 45 is the last value that fits a 32-bit int, n = 78 is the first above 2^53 - 1, and n = 92 no longer fits a signed 64-bit integer. In C++ the exact column is \`std::uint64_t\`, and \`static_cast<std::int32_t>\` / \`static_cast<std::int64_t>\` show what the signed types would hold — computed without ever overflowing a signed type, so there is no undefined behaviour in the program.

## 7. Variants Interviewers Ask Next

**Any set of step sizes.** If you may take 1, 2 or 3 steps, the last move could have been any of them: \`ways[i] = ways[i - 1] + ways[i - 2] + ways[i - 3]\`. In general, \`ways[i] = sum of ways[i - s]\` for every allowed step \`s <= i\`, with \`ways[0] = 1\`. That is O(n · k) for k step sizes. Example 2 gives 7 ways for 4 stairs with steps {1, 2, 3}, 274 for 10 stairs, and **0** for 3 stairs with only 2-steps — an odd number cannot be made from 2s, and the table handles that with no special case.

**Min cost climbing stairs.** Each stair \`i\` has a cost \`cost[i]\` paid when you step off it; you may start on stair 0 or 1 and want to reach just past the last stair. Now we minimise instead of count:

\`best[i] = min(best[i - 1] + cost[i - 1], best[i - 2] + cost[i - 2])\`, with \`best[0] = best[1] = 0\`.

Same shape, \`min\` instead of \`+\`. Example 2 prints 15 for \`[10, 15, 20]\` (start on stair 1, pay 15, jump two) and 6 for the longer list.

**Order does not matter.** If 1-2 and 2-1 count as the same climb, you are counting *combinations* of step sizes, which is the coin-change counting problem; the loops swap (step sizes outer, stairs inner). See [coin change](/interview-question/how-do-you-solve-the-coin-change-problem).

**Very large n with a modulo.** Add \`% MOD\` after each addition. For astronomically large n (say 10^18) the recurrence can be raised as a 2×2 matrix power in O(log n) — mention it as a follow-up; nobody expects you to code it for this question.

## 8. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | O(φⁿ) | O(n) | The call tree has \`2·ways(n) - 1\` nodes: 242,785 for n = 25 |
| Memoization | O(n) | O(n) | n states, O(1) each; memo plus recursion stack |
| Table | O(n) | O(n) | One loop step per stair |
| Two variables | O(n) | O(1) | Only the last two values are read |
| k step sizes | O(n · k) | O(n), or O(max step) with a ring buffer | k terms per state |

(The arithmetic is O(1) per step only while the numbers fit a machine word; with big integers each addition costs O(number of digits).)

## 9. Edge Cases

- **n = 1** — one way. **n = 0** — 1 (the empty climb) if allowed; the loop versions return 1 automatically.
- **Step set that cannot reach n** — \`ways(3, [2]) = 0\`; the table returns 0 with no special case.
- **Large n** — 32-bit overflow at n = 46, \`Number\` precision at n = 78, 64-bit signed overflow at n = 92 (all in Example 3).
- **Unsorted or duplicate step sizes** — duplicates would double-count; deduplicate the step list first.

## Common Pitfalls

- **Wrong base case.** \`dp[0] = 0\` breaks every answer; the empty climb counts as one way.
- **Signed overflow past n = 45.** Undefined behaviour, not just a wrong value; use \`long long\` or a modulo.
- **\`memo[n]\` to test a memo** inserts zeros; use \`find\`, or a \`vector\` with a sentinel.
- **Shifting without a temporary** copies the new value into \`twoBack\`.
- **Printing a \`long long\` through \`printf("%d")\`** — mismatched format specifiers are undefined; use \`std::cout\` or \`%lld\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Recurrence:</strong> <span style="color:#f0e2c8;">The last move into stair <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> was one step or two, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[i] = ways[i - 1] + ways[i - 2]</code>; the groups never overlap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Base cases:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[0] = 1</code> for the empty climb and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[1] = 1</code>, giving 1, 1, 2, 3, 5, 8 — Fibonacci shifted by one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why not plain recursion:</strong> <span style="color:#f0e2c8;">It recomputes the same stairs: 242,785 calls for n = 25, exponential in n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Final code:</strong> <span style="color:#f0e2c8;">Two variables and a temporary, O(n) time and O(1) space, and no recursion so no stack risk.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Overflow:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> holds the answer only up to n = 45, and signed overflow is undefined behaviour, so for larger n I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> (exact to n = 91) or the problem modulo.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you can take 1, 2 or 3 steps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sum over the allowed steps: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i] += dp[i - s]</code> for each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s &lt;= i</code>, in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;long long&gt;</code>. 274 ways for n = 10.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if each stair has a cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Min cost climbing stairs: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::min(oneBack + cost[i - 1], twoBack + cost[i - 2])</code>, base cases 0. 15 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[10, 15, 20]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not let <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code> wrap around?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Signed overflow is undefined behaviour; the compiler may assume it never happens. Unsigned types wrap by definition, which is why Example 3 does its arithmetic in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::uint64_t</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do better than O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The recurrence is a 2×2 matrix power, so fast exponentiation gives O(log n) multiplications.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ways[0]</code> equal 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is one way to be at the bottom: no moves. With 0 every later value shifts wrong.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State** | What one table entry means: ways[i] = number of move sequences ending on stair i |
| **Recurrence** | Rule for a state from smaller states: ways[i] = ways[i - 1] + ways[i - 2] |
| **Base case** | States answered directly: ways[0] = ways[1] = 1 |
| **Fibonacci relation** | The answers 1, 1, 2, 3, 5, 8 are Fibonacci shifted by one: ways(n) = fib(n + 1) |
| **Rolling variables (space optimisation)** | Keep only the entries the recurrence reads, O(n) memory becomes O(1) |

---
**Conclusion:** Climbing stairs is solved by looking at the last move: \`ways(n) = ways(n - 1) + ways(n - 2)\` with \`ways(0) = ways(1) = 1\`. Plain recursion is exponential (242,785 calls for n = 25); a loop with two variables gives O(n) time and O(1) space in C++. \`int\` holds the answer only up to n = 45 and signed overflow is undefined behaviour, so use \`long long\` or a modulo for larger n. The same "last choice" reasoning extends to any step set, to min cost climbing stairs, and to house robber.`,
        examples: [
          {
            label: "Four solutions that agree: naive recursion (with call counts), memo, table and two variables",
            code: `#include <iostream>
#include <unordered_map>
#include <vector>

long long calls = 0;

int climbNaive(int n) {
    calls++;
    if (n <= 1) return 1;                         // 0 or 1 steps left: exactly one way
    return climbNaive(n - 1) + climbNaive(n - 2);
}

int climbMemo(int n, std::unordered_map<int, int>& memo) {
    if (n <= 1) return 1;
    auto it = memo.find(n);
    if (it != memo.end()) return it->second;
    int value = climbMemo(n - 1, memo) + climbMemo(n - 2, memo);
    memo[n] = value;
    return value;
}

int climbTable(int n) {
    std::vector<int> dp(n + 1, 1);                // dp[0] = dp[1] = 1
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];            // last move was 1 step or 2 steps
    }
    return dp[n];
}

int climb(int n) {
    int oneBack = 1, twoBack = 1;                 // ways(i - 1), ways(i - 2)
    for (int i = 2; i <= n; i++) {
        int cur = oneBack + twoBack;
        twoBack = oneBack;
        oneBack = cur;
    }
    return oneBack;
}

int main() {
    for (int n : {1, 2, 3, 5, 10, 25}) {
        calls = 0;
        int slow = climbNaive(n);
        std::unordered_map<int, int> memo;
        std::cout << "climb(" << n << ") = " << climb(n) << " | memo " << climbMemo(n, memo)
                  << " | table " << climbTable(n) << " | naive " << slow << " in " << calls << " calls\\n";
    }
    std::cout << "climb(45) = " << climb(45) << " (two variables, 44 loop steps)\\n";
    return 0;
}
`,
          },
          {
            label: "Variants with the same recipe: any set of step sizes, and min cost climbing stairs",
            code: `#include <algorithm>
#include <iostream>
#include <vector>

long long ways(int n, const std::vector<int>& steps) {
    // number of ordered ways to climb n stairs using any step size in steps
    std::vector<long long> dp(n + 1, 0);
    dp[0] = 1;                                    // one way to stand at the bottom: do nothing
    for (int i = 1; i <= n; i++) {
        for (int s : steps) {
            if (s <= i) dp[i] += dp[i - s];       // last move had size s
        }
    }
    return dp[n];
}

int minCost(const std::vector<int>& cost) {
    // pay cost[i] to step off stair i; start on stair 0 or 1; reach the top
    int oneBack = 0, twoBack = 0;                 // cheapest way to stand on i - 1, i - 2
    for (size_t i = 2; i <= cost.size(); i++) {
        int cur = std::min(oneBack + cost[i - 1], twoBack + cost[i - 2]);
        twoBack = oneBack;
        oneBack = cur;
    }
    return oneBack;
}

int main() {
    std::cout << "ways(4, [1, 2]) = " << ways(4, {1, 2}) << "\\n";
    std::cout << "ways(4, [1, 2, 3]) = " << ways(4, {1, 2, 3}) << "\\n";
    std::cout << "ways(10, [1, 2, 3]) = " << ways(10, {1, 2, 3}) << "\\n";
    std::cout << "ways(7, [2, 5]) = " << ways(7, {2, 5}) << "\\n";
    std::cout << "ways(3, [2]) = " << ways(3, {2}) << "\\n";
    std::cout << "cheapest climb over [10, 15, 20] = " << minCost({10, 15, 20}) << "\\n";
    std::cout << "cheapest climb over [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] = "
              << minCost({1, 100, 1, 1, 1, 100, 1, 1, 100, 1}) << "\\n";
    return 0;
}
`,
          },
          {
            label: "How big the answer gets: exact values, 32-bit wrap-around and the 2^53 limit",
            code: `#include <cstdint>
#include <iostream>

std::uint64_t climb(int n) {
    std::uint64_t oneBack = 1, twoBack = 1;       // unsigned: wraps by definition, never UB
    for (int i = 2; i <= n; i++) {
        std::uint64_t cur = oneBack + twoBack;
        twoBack = oneBack;
        oneBack = cur;
    }
    return oneBack;
}

int main() {
    std::cout << std::boolalpha;
    const std::uint64_t int32Max = INT32_MAX, int64Max = INT64_MAX;
    const std::uint64_t safe = (std::uint64_t{1} << 53) - 1;   // JavaScript Number.MAX_SAFE_INTEGER
    for (int n : {44, 45, 46, 50, 77, 78, 91}) {
        std::uint64_t exact = climb(n);
        std::cout << "climb(" << n << ") = " << exact << " | fits int32: " << (exact <= int32Max)
                  << " | as int32: " << static_cast<std::int32_t>(exact)
                  << " | above 2^53 - 1: " << (exact > safe) << "\\n";
    }
    std::uint64_t big = climb(92);
    std::cout << "climb(92) = " << big << " | fits int64: " << (big <= int64Max)
              << " | as int64: " << static_cast<std::int64_t>(big) << "\\n";
    return 0;
}
`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you solve the house robber problem?",
    difficulty: "medium",
    seoDescription: "House robber in Python, JavaScript, Java and C++: the take-or-skip recurrence, O(1) space, recovering the houses, the circular variant, verified.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are a robber on a street of houses, each with some amount of money. Robbing two adjacent houses triggers the alarm. Given the amounts, return the most money you can rob tonight. Please write it in Python. If you finish early: what if the street is a circle?"

**What a strong answer should cover:**
- The take-or-skip recurrence \`best[i] = max(best[i - 1], best[i - 2] + nums[i])\`, with base cases for zero and one house.
- Why "every other house" and other greedy rules fail (\`[2, 1, 1, 2]\` → 4, not 3).
- O(n) time with O(1) space via two rolling variables; the full table only when the chosen houses must be returned.
- The circular variant: max of two line problems, excluding the first or the last house.
- Python specifics: the one-line tuple shift \`prev, cur = cur, max(cur, prev + x)\`, and that \`dp[-1]\` silently reads the last element instead of failing.

**Clarifying questions expected:**
- "Is the street a line or a circle?"
- "Do you want the maximum amount only, or also which houses?"
- "Can amounts be zero or negative, and how large can the total get?"

**Code / implementation expected:** Yes — an O(n), O(1)-space Python function; reconstruction or the circular version as follow-ups.`,
        answer: `**Target Audience:** Beginners who have seen climbing stairs and want the next dynamic programming step.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A cat burglar in a cartoon walks down a street of houses at night. Each house has some cash inside. There is one rule: the houses on this street have connected alarms, so if she breaks into **two houses next to each other**, the alarm goes off. She wants the most money possible.

Her first idea is "rob every other house": houses 1, 3, 5, … or houses 2, 4, 6, …, whichever totals more. On the street \`[2, 1, 1, 2]\` that gives 3. But robbing the first and the last house gives **4** — they are not neighbours. Sometimes the best plan skips **two** houses in a row.

Her second idea is "always grab the richest house left". On \`[2, 7, 9, 3, 1]\` she grabs 9, which rules out 7 and 3, then grabs 2 and 1: total 12, which happens to be right here — but greedy choices like that fail on other streets, and she cannot know in advance which.

What she really needs is to make the decision **at each house, knowing the best she could have done so far**. That is [dynamic programming](/interview-question/what-is-dynamic-programming), and house robber is the classic example of a **take-or-skip** decision — the step up from [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem), where we only counted.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the amounts be negative or zero? | The standard problem uses non-negative amounts. With negatives you could simply skip those houses, and the recurrence still works because \`max\` never forces you to take one. |
| Is the street a line or a circle? | In a circle the first and last houses are neighbours (House Robber II); the fix is to solve two line problems (Example 2). |
| Do you need the total only, or which houses to rob? | Recovering the houses needs the full table (or a parent array), not just two variables. |
| How long can the street be, and how large are the amounts? | Decides between 32-bit and 64-bit totals, and rules out any brute force over 2ⁿ subsets. |
| What about an empty street? | Return 0; make sure the code does not index \`nums[0]\` when there is no house. |

## 3. The Core Idea: Take It or Skip It

Walk the houses from left to right. At house \`i\` there are exactly two choices:

- **Skip it.** Then the best total is whatever was best for the houses before it: \`best[i - 1]\`.
- **Rob it.** Then house \`i - 1\` must be left alone, so the best total is the best for houses up to \`i - 2\`, plus the cash here: \`best[i - 2] + nums[i]\`.

📌 **Interview term: State** — \`best[i]\` = the largest amount you can steal from the first \`i\` houses (houses \`0 .. i - 1\`) without robbing two neighbours.

📌 **Interview term: Recurrence (take-or-skip)** — \`best[i] = max(best[i - 1], best[i - 2] + nums[i - 1])\`. The \`max\` picks whichever of the two choices is better; because both choices are considered, you never need to guess.

📌 **Interview term: Base case** — \`best[0] = 0\` (no houses, no money). Treat \`best[-1]\` as 0 too, so the first house gives \`best[1] = max(0, 0 + nums[0]) = nums[0]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Houses 2, 7, 9, 3, 1 with the best total after each house: 2, 7, 11, 11, 12. Houses 0, 2 and 4 are robbed">
  <rect class="d-box-accent" x="30" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="80" y="68" text-anchor="middle">house 0</text>
  <text class="d-sub" x="80" y="88" text-anchor="middle">cash 2</text>
  <rect class="d-box" x="160" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="210" y="68" text-anchor="middle">house 1</text>
  <text class="d-sub" x="210" y="88" text-anchor="middle">cash 7</text>
  <rect class="d-box-accent" x="290" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="340" y="68" text-anchor="middle">house 2</text>
  <text class="d-sub" x="340" y="88" text-anchor="middle">cash 9</text>
  <rect class="d-box" x="420" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="470" y="68" text-anchor="middle">house 3</text>
  <text class="d-sub" x="470" y="88" text-anchor="middle">cash 3</text>
  <rect class="d-box-accent" x="550" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="600" y="68" text-anchor="middle">house 4</text>
  <text class="d-sub" x="600" y="88" text-anchor="middle">cash 1</text>
  <rect class="d-box-muted" x="30" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="80" y="190" text-anchor="middle">best 2</text>
  <rect class="d-box-muted" x="160" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="210" y="190" text-anchor="middle">best 7</text>
  <rect class="d-box-muted" x="290" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="340" y="190" text-anchor="middle">best 11</text>
  <rect class="d-box-muted" x="420" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="470" y="190" text-anchor="middle">best 11</text>
  <rect class="d-box-muted" x="550" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="600" y="190" text-anchor="middle">best 12</text>
  <line class="d-edge" x1="80" y1="102" x2="80" y2="158"/>
  <line class="d-edge" x1="210" y1="102" x2="210" y2="158"/>
  <line class="d-edge" x1="340" y1="102" x2="340" y2="158"/>
  <line class="d-edge" x1="470" y1="102" x2="470" y2="158"/>
  <line class="d-edge" x1="600" y1="102" x2="600" y2="158"/>
</svg>

The bottom row is the best total after each house for \`[2, 7, 9, 3, 1]\`. At house 2: skip gives 7, rob gives 2 + 9 = 11, so 11. At house 3: skip gives 11, rob gives 7 + 3 = 10, so 11 (skip). At house 4: skip gives 11, rob gives 11 + 1 = 12. The highlighted houses 0, 2 and 4 are the plan behind the 12.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 200" role="img" aria-label="The choice at house i: skip it and keep best of i minus 1, or rob it and add its cash to best of i minus 2">
  <defs>
    <marker id="b27q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="120" width="160" height="50" rx="8"/>
  <text class="d-text" x="100" y="150" text-anchor="middle">best[i - 2]</text>
  <rect class="d-box" x="250" y="120" width="160" height="50" rx="8"/>
  <text class="d-text" x="330" y="150" text-anchor="middle">best[i - 1]</text>
  <rect class="d-box-accent" x="490" y="120" width="170" height="50" rx="8"/>
  <text class="d-text" x="575" y="150" text-anchor="middle">best[i]</text>
  <path class="d-edge-accent" d="M 100 118 Q 330 20 570 116" marker-end="url(#b27q3-arrow)"/>
  <path class="d-edge" d="M 412 145 L 486 145" marker-end="url(#b27q3-arrow)"/>
  <text class="d-sub" x="330" y="52" text-anchor="middle">rob house i: add nums[i]</text>
  <text class="d-sub" x="450" y="190" text-anchor="middle">skip house i</text>
</svg>

\`best[i]\` is the larger of the two arrows. Compare with climbing stairs, where the same two arrows were **added**; here we take the **max** and one arrow carries the house value.

📌 **Interview term: Optimal substructure** — if the best plan for the first \`i\` houses robs house \`i - 1\`, then what it does with the first \`i - 2\` houses must itself be the best plan for those houses (otherwise swap in a better one and the total grows). That is why \`best[i - 2]\` is the right thing to add to.

## 4. From Brute Force to O(1) Space

**Brute force — try every subset.** Each house is in or out, so there are 2ⁿ subsets; throw away those with neighbours and keep the best total. Correct but exponential: Example 2 uses it only as a checker on streets of up to 12 houses, and that alone checks 349,564 subsets.

**Recursion with memo.** \`rob(i) = max(rob(i - 1), rob(i - 2) + nums[i])\` recursively, caching each \`rob(i)\`. O(n) time, O(n) space, O(n) stack depth.

**Table.** Fill \`best[0..n]\` left to right: O(n) time and space. Keep it when you need to recover **which** houses were robbed.

**Two variables.** \`best[i]\` only reads \`best[i - 1]\` and \`best[i - 2]\`, so keep two numbers: \`prev\` (best up to \`i - 2\`) and \`cur\` (best up to \`i - 1\`).

📌 **Interview term: Rolling variables** — keeping only the previous entries the recurrence reads, here two, for O(1) extra space.

**Why "every other house" is wrong.** It only considers two of the many legal plans. On \`[2, 1, 1, 2]\` it gives 3; on \`[10, 1, 1, 10]\` it gives 11; the real answers are 4 and 20, both by robbing the first and last houses and skipping two in the middle (Example 1).

### Recovering which houses were robbed

📌 **Interview term: Reconstruction (backtracking through the table)** — walking back from the final DP cell, at each step asking which choice produced this value, to rebuild the actual solution and not just its value.

Start at \`i = n\`. If \`best[i] == best[i - 1]\`, house \`i - 1\` was not needed — move to \`i - 1\`. Otherwise house \`i - 1\` was robbed — record it and jump to \`i - 2\` (its neighbour cannot be robbed). This needs the full table, so it costs O(n) space. Example 1 prints the houses this way: \`[0, 2, 4]\` for \`[2, 7, 9, 3, 1]\`.

### The circular street (House Robber II)

If the houses stand in a circle, house 0 and house n - 1 are neighbours. Any valid plan leaves out at least one of them, so the best plan is the better of:

- the line problem on houses \`0 .. n - 2\` (house n - 1 excluded), and
- the line problem on houses \`1 .. n - 1\` (house 0 excluded).

One house alone is a special case (\`n == 1\` returns \`nums[0]\`, because both ranges would be empty).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Circular street 2, 3, 2 split into two lines: houses 0 to n minus 2, and houses 1 to n minus 1">
  <rect class="d-box-accent" x="20" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="60" y="57" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="120" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="160" y="57" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="260" y="57" text-anchor="middle">2</text>
  <text class="d-sub" x="160" y="104" text-anchor="middle">line 1: drop the last house</text>
  <text class="d-sub" x="160" y="124" text-anchor="middle">best 3</text>
  <rect class="d-box-muted" x="400" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="440" y="57" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="500" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="540" y="57" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="600" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="640" y="57" text-anchor="middle">2</text>
  <text class="d-sub" x="540" y="104" text-anchor="middle">line 2: drop the first house</text>
  <text class="d-sub" x="540" y="124" text-anchor="middle">best 3</text>
  <rect class="d-box" x="250" y="160" width="200" height="44" rx="8"/>
  <text class="d-text" x="350" y="187" text-anchor="middle">circle answer: max = 3</text>
</svg>

On the line \`[2, 3, 2]\` the answer is 4 (both 2s), but on the circle those two 2s are neighbours, so the answer drops to 3. Example 2 prints this, plus \`[200, 3, 140, 20, 10]\`: 350 on a line (200 + 140 + 10) but 340 on a circle, where 200 and 10 become neighbours.

## 5. The Python Code, Line by Line

The answer to give — two variables:

~~~python
def rob(nums):
    prev, cur = 0, 0                      # best up to house i - 2, best up to house i - 1
    for x in nums:
        prev, cur = cur, max(cur, prev + x)   # skip house i, or rob it
    return cur
~~~

The table version, when the interviewer asks which houses:

~~~python
def rob_with_houses(nums):
    n = len(nums)
    dp = [0] * (n + 1)                    # dp[i] = best using the first i houses
    for i in range(1, n + 1):
        dp[i] = max(dp[i - 1], (dp[i - 2] if i >= 2 else 0) + nums[i - 1])
    houses, i = [], n
    while i >= 1:
        if dp[i] == dp[i - 1]:            # house i - 1 was not needed
            i -= 1
        else:                             # house i - 1 was robbed: jump over its neighbour
            houses.append(i - 1)
            i -= 2
    houses.reverse()
    return dp[n], houses
~~~

What each Python piece is doing:

- **\`prev, cur = cur, max(cur, prev + x)\`** — the right side is evaluated with the old \`prev\` and \`cur\` before either is reassigned, so the shift and the update happen in one line.
- **\`for x in nums\`** iterates values directly; an empty list never enters the loop and returns 0, so there is no \`nums[0]\` index to crash on.
- **\`dp = [0] * (n + 1)\`** — one extra slot so \`dp[0]\` means "no houses". The shift by one avoids special-casing house 0.
- **\`(dp[i - 2] if i >= 2 else 0)\`** — a conditional expression. Without the guard, \`dp[-1]\` would silently read the **last** element of the list (Python negative indexing), a bug that does not crash.
- **\`houses.reverse()\`** — the walk collects houses from right to left; \`reverse()\` flips the list in place.
- **The circular version** slices nothing: Example 2 passes \`lo\`/\`hi\` bounds to one helper instead of calling \`rob(nums[:-1])\` and \`rob(nums[1:])\`. Slicing would also work but copies O(n) elements twice.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`python3 main.py\` (Python 3.13). The same programs in the other three languages print exactly the same lines.

**Example 1 — House robber with the robbed houses recovered, against the every-other-house guess** printed:

~~~text
rob([1, 2, 3, 1]) = 4, houses [0, 2] (sum 4) | every-other-house guess 4
rob([2, 7, 9, 3, 1]) = 12, houses [0, 2, 4] (sum 12) | every-other-house guess 12
rob([2, 1, 1, 2]) = 4, houses [0, 3] (sum 4) | every-other-house guess 3
rob([10, 1, 1, 10]) = 20, houses [0, 3] (sum 20) | every-other-house guess 11
rob([5]) = 5, houses [0] (sum 5) | every-other-house guess 5
rob([]) = 0, houses [] (sum 0) | every-other-house guess 0
~~~

**Example 2 — The circular street (House Robber II) and a brute-force check on 300 random streets** printed:

~~~text
circle [2, 3, 2]: 3 (line answer 4)
circle [1, 2, 3, 1]: 4 (line answer 4)
circle [1, 2, 3]: 3 (line answer 4)
circle [200, 3, 140, 20, 10]: 340 (line answer 350)
circle [7]: 7 (line answer 7)
dp matches brute force on 300 of 300 random streets (349564 subsets checked)
~~~

In Example 1 the every-other-house guess is right on the first two streets and wrong on \`[2, 1, 1, 2]\` (3 vs 4) and \`[10, 1, 1, 10]\` (11 vs 20). In Example 2 the circle answer is lower than the line answer exactly when the line plan robs both ends, and the DP matches a brute force over every subset on all 300 random streets. The random streets come from a small Park–Miller generator written into each program, so all four languages test identical inputs.

## 7. Complexity

| Version | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute force over subsets | O(2ⁿ · n) | O(1) | Every subset, n work to check and sum it |
| Memoized recursion | O(n) | O(n) | n states, O(1) each, plus the recursion stack |
| Table | O(n) | O(n) | One pass; needed to recover the houses |
| Two variables | O(n) | O(1) | Only \`best[i - 1]\` and \`best[i - 2]\` are read |
| Circular street | O(n) | O(1) | Two line passes of n - 1 houses each |

## 8. Edge Cases

- **Empty street** — 0. The loop versions return 0 with no special case; code that starts with \`nums[0]\` must check first.
- **One house** — rob it. For the circle this must be special-cased: both sub-ranges are empty.
- **Two houses** — the larger one.
- **Zeros and ties** — houses worth 0, or two plans with equal totals: the best value is unique but the chosen houses may not be; the reconstruction above prefers skipping when both choices tie.
- **Skipping two in a row** — \`[2, 1, 1, 2]\` and \`[10, 1, 1, 10]\` need it; the recurrence allows it automatically.
- **Circle with n = 2 or 3** — at most one house can be robbed, and the two-range split gives that.

## Common Pitfalls

- **"Rob every other house."** Wrong on \`[2, 1, 1, 2]\` (3 instead of 4); the optimal plan may skip two houses.
- **\`dp[i - 2]\` at \`i = 1\`.** In Python \`dp[-1]\` silently reads the last element; guard it or use the shifted table.
- **Two-line shift.** \`prev = cur\` then \`cur = max(cur, prev + x)\` uses the new \`prev\`; use one tuple assignment.
- **Circle with one house.** \`max(rob(nums[:-1]), rob(nums[1:]))\` returns 0 for \`[7]\`; special-case \`n == 1\`.
- **Reconstructing from the two-variable version.** It forgot the history; keep the table if you need the houses.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Recurrence:</strong> <span style="color:#f0e2c8;">At each house I either skip it and keep the best so far, or rob it and add its cash to the best from two houses back: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best[i] = max(best[i - 1], best[i - 2] + nums[i - 1])</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Every valid plan either uses house i or not; both cases are considered, and each uses the optimal answer for the smaller street.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Code:</strong> <span style="color:#f0e2c8;">Two variables, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev, cur = cur, max(cur, prev + x)</code>, O(n) time and O(1) space; an empty list returns 0 naturally.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Greedy fails:</strong> <span style="color:#f0e2c8;">Every other house gives 3 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 1, 1, 2]</code>; the answer is 4, robbing the ends and skipping two in the middle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Variants:</strong> <span style="color:#f0e2c8;">To list the houses I keep the table and walk back; for a circle I take the max of the line answers on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[0..n-2]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[1..n-1]</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return which houses were robbed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp</code>, then from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i = n</code>: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i] == dp[i - 1]</code> skip, else record house <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - 1</code> and jump to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - 2</code>. That printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 2, 4]</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 7, 9, 3, 1]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The houses are in a circle. What changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">First and last are neighbours, so solve the line twice, once without the last and once without the first house, and take the max; special-case one house.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if amounts can be negative?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The recurrence still works: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code> will just never choose to rob a negative house, so negatives behave like zeros.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you prove your answer, not just test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By the take-or-skip argument above; in practice I also compared it with a brute force over all subsets, and it matched on 300 random streets.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about houses on a tree (House Robber III)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same idea per node: return two values, best if this node is robbed and best if it is not, computed from the children in a post-order walk.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State** | best[i] = most money from the first i houses with no two neighbours robbed |
| **Recurrence (take-or-skip)** | best[i] = max(best[i - 1], best[i - 2] + nums[i - 1]) |
| **Base case** | best[0] = 0, and best[-1] treated as 0 |
| **Optimal substructure** | The best plan for i houses contains the best plan for the smaller street it builds on |
| **Rolling variables** | Keep only the two previous best values, O(1) space |
| **Reconstruction (backtracking through the table)** | Walk back from the last cell to recover which houses were robbed |

---
**Conclusion:** House robber is a take-or-skip DP: at each house, the best total is the larger of skipping it (\`best[i - 1]\`) and robbing it (\`best[i - 2] + nums[i]\`). In Python the whole solution is a loop with \`prev, cur = cur, max(cur, prev + x)\` — O(n) time, O(1) space — and greedy shortcuts like every other house fail on inputs as small as \`[2, 1, 1, 2]\`. Keep the table when you need the houses, and handle a circular street as two line problems.`,
        examples: [
          {
            label: "House robber with the robbed houses recovered, against the every-other-house guess",
            code: `def rob(nums):
    """Best total with no two adjacent houses, in O(1) extra space."""
    prev, cur = 0, 0                      # best up to house i - 2, best up to house i - 1
    for x in nums:
        prev, cur = cur, max(cur, prev + x)   # skip house i, or rob it
    return cur


def rob_with_houses(nums):
    """Full table, then walk it backwards to recover which houses were robbed."""
    n = len(nums)
    dp = [0] * (n + 1)                    # dp[i] = best using the first i houses
    for i in range(1, n + 1):
        dp[i] = max(dp[i - 1], (dp[i - 2] if i >= 2 else 0) + nums[i - 1])
    houses, i = [], n
    while i >= 1:
        if dp[i] == dp[i - 1]:            # house i - 1 was not needed
            i -= 1
        else:                             # house i - 1 was robbed: jump over its neighbour
            houses.append(i - 1)
            i -= 2
    houses.reverse()
    return dp[n], houses


def alternating_guess(nums):
    """The tempting wrong idea: rob every other house, pick the better half."""
    return max(sum(nums[0::2]), sum(nums[1::2]))


for nums in [[1, 2, 3, 1], [2, 7, 9, 3, 1], [2, 1, 1, 2], [10, 1, 1, 10], [5], []]:
    best, houses = rob_with_houses(nums)
    print("rob(" + str(nums) + ") = " + str(rob(nums)) + ", houses " + str(houses)
          + " (sum " + str(best) + ") | every-other-house guess " + str(alternating_guess(nums)))
`,
          },
          {
            label: "The circular street (House Robber II) and a brute-force check on 300 random streets",
            code: `def rob_line(nums, lo, hi):
    """House robber on nums[lo..hi] (inclusive), O(1) space."""
    prev, cur = 0, 0
    for i in range(lo, hi + 1):
        prev, cur = cur, max(cur, prev + nums[i])
    return cur


def rob_circle(nums):
    """First and last house are neighbours: they cannot both be robbed."""
    n = len(nums)
    if n == 1:
        return nums[0]
    return max(rob_line(nums, 0, n - 2), rob_line(nums, 1, n - 1))


def brute_force(nums, circle):
    """Try every subset of houses (2^n of them) and keep the legal ones."""
    n, best = len(nums), 0
    for mask in range(1 << n):
        if mask & (mask >> 1):            # two adjacent houses in the subset
            continue
        if circle and n > 1 and (mask & 1) and (mask >> (n - 1)) & 1:
            continue                      # first and last both chosen
        total = sum(nums[i] for i in range(n) if (mask >> i) & 1)
        best = max(best, total)
    return best


seed = 2026


def next_rand(limit):
    """Park-Miller generator, so all four languages see the same streets."""
    global seed
    seed = seed * 48271 % 2147483647
    return seed % limit


for nums in [[2, 3, 2], [1, 2, 3, 1], [1, 2, 3], [200, 3, 140, 20, 10], [7]]:
    print("circle " + str(nums) + ": " + str(rob_circle(nums)) + " (line answer " + str(rob_line(nums, 0, len(nums) - 1)) + ")")

agree, subsets = 0, 0
for t in range(300):
    n = 1 + next_rand(12)
    nums = [next_rand(21) for _ in range(n)]
    subsets += 2 * (1 << n)
    if rob_line(nums, 0, n - 1) == brute_force(nums, False) and rob_circle(nums) == brute_force(nums, True):
        agree += 1
print("dp matches brute force on " + str(agree) + " of 300 random streets (" + str(subsets) + " subsets checked)")
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are a robber on a street of houses, each with some amount of money. Robbing two adjacent houses triggers the alarm. Given the amounts, return the most money you can rob tonight. Please write it in JavaScript. If you finish early: what if the street is a circle?"

**What a strong answer should cover:**
- The take-or-skip recurrence \`best[i] = max(best[i - 1], best[i - 2] + nums[i])\`, with base cases for zero and one house.
- Why "every other house" and other greedy rules fail (\`[2, 1, 1, 2]\` → 4, not 3).
- O(n) time with O(1) space via two rolling variables; the full table only when the chosen houses must be returned.
- The circular variant: max of two line problems, excluding the first or the last house.
- JavaScript specifics: a temporary for the shift, and that reading \`dp[-1]\` gives \`undefined\`, turning sums into \`NaN\` without an error.

**Clarifying questions expected:**
- "Is the street a line or a circle?"
- "Do you want the maximum amount only, or also which houses?"
- "Can amounts be zero or negative, and how large can the total get?"

**Code / implementation expected:** Yes — an O(n), O(1)-space JavaScript function; reconstruction or the circular version as follow-ups.`,
        answer: `**Target Audience:** Beginners who have seen climbing stairs and want the next dynamic programming step.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A cat burglar in a cartoon walks down a street of houses at night. Each house has some cash inside. There is one rule: the houses on this street have connected alarms, so if she breaks into **two houses next to each other**, the alarm goes off. She wants the most money possible.

Her first idea is "rob every other house": houses 1, 3, 5, … or houses 2, 4, 6, …, whichever totals more. On the street \`[2, 1, 1, 2]\` that gives 3. But robbing the first and the last house gives **4** — they are not neighbours. Sometimes the best plan skips **two** houses in a row.

Her second idea is "always grab the richest house left". On \`[2, 7, 9, 3, 1]\` she grabs 9, which rules out 7 and 3, then grabs 2 and 1: total 12, which happens to be right here — but greedy choices like that fail on other streets, and she cannot know in advance which.

What she really needs is to make the decision **at each house, knowing the best she could have done so far**. That is [dynamic programming](/interview-question/what-is-dynamic-programming), and house robber is the classic example of a **take-or-skip** decision — the step up from [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem), where we only counted.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the amounts be negative or zero? | The standard problem uses non-negative amounts. With negatives you could simply skip those houses, and the recurrence still works because \`max\` never forces you to take one. |
| Is the street a line or a circle? | In a circle the first and last houses are neighbours (House Robber II); the fix is to solve two line problems (Example 2). |
| Do you need the total only, or which houses to rob? | Recovering the houses needs the full table (or a parent array), not just two variables. |
| How long can the street be, and how large are the amounts? | Decides between 32-bit and 64-bit totals, and rules out any brute force over 2ⁿ subsets. |
| What about an empty street? | Return 0; make sure the code does not index \`nums[0]\` when there is no house. |

## 3. The Core Idea: Take It or Skip It

Walk the houses from left to right. At house \`i\` there are exactly two choices:

- **Skip it.** Then the best total is whatever was best for the houses before it: \`best[i - 1]\`.
- **Rob it.** Then house \`i - 1\` must be left alone, so the best total is the best for houses up to \`i - 2\`, plus the cash here: \`best[i - 2] + nums[i]\`.

📌 **Interview term: State** — \`best[i]\` = the largest amount you can steal from the first \`i\` houses (houses \`0 .. i - 1\`) without robbing two neighbours.

📌 **Interview term: Recurrence (take-or-skip)** — \`best[i] = max(best[i - 1], best[i - 2] + nums[i - 1])\`. The \`max\` picks whichever of the two choices is better; because both choices are considered, you never need to guess.

📌 **Interview term: Base case** — \`best[0] = 0\` (no houses, no money). Treat \`best[-1]\` as 0 too, so the first house gives \`best[1] = max(0, 0 + nums[0]) = nums[0]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Houses 2, 7, 9, 3, 1 with the best total after each house: 2, 7, 11, 11, 12. Houses 0, 2 and 4 are robbed">
  <rect class="d-box-accent" x="30" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="80" y="68" text-anchor="middle">house 0</text>
  <text class="d-sub" x="80" y="88" text-anchor="middle">cash 2</text>
  <rect class="d-box" x="160" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="210" y="68" text-anchor="middle">house 1</text>
  <text class="d-sub" x="210" y="88" text-anchor="middle">cash 7</text>
  <rect class="d-box-accent" x="290" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="340" y="68" text-anchor="middle">house 2</text>
  <text class="d-sub" x="340" y="88" text-anchor="middle">cash 9</text>
  <rect class="d-box" x="420" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="470" y="68" text-anchor="middle">house 3</text>
  <text class="d-sub" x="470" y="88" text-anchor="middle">cash 3</text>
  <rect class="d-box-accent" x="550" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="600" y="68" text-anchor="middle">house 4</text>
  <text class="d-sub" x="600" y="88" text-anchor="middle">cash 1</text>
  <rect class="d-box-muted" x="30" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="80" y="190" text-anchor="middle">best 2</text>
  <rect class="d-box-muted" x="160" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="210" y="190" text-anchor="middle">best 7</text>
  <rect class="d-box-muted" x="290" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="340" y="190" text-anchor="middle">best 11</text>
  <rect class="d-box-muted" x="420" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="470" y="190" text-anchor="middle">best 11</text>
  <rect class="d-box-muted" x="550" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="600" y="190" text-anchor="middle">best 12</text>
  <line class="d-edge" x1="80" y1="102" x2="80" y2="158"/>
  <line class="d-edge" x1="210" y1="102" x2="210" y2="158"/>
  <line class="d-edge" x1="340" y1="102" x2="340" y2="158"/>
  <line class="d-edge" x1="470" y1="102" x2="470" y2="158"/>
  <line class="d-edge" x1="600" y1="102" x2="600" y2="158"/>
</svg>

The bottom row is the best total after each house for \`[2, 7, 9, 3, 1]\`. At house 2: skip gives 7, rob gives 2 + 9 = 11, so 11. At house 3: skip gives 11, rob gives 7 + 3 = 10, so 11 (skip). At house 4: skip gives 11, rob gives 11 + 1 = 12. The highlighted houses 0, 2 and 4 are the plan behind the 12.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 200" role="img" aria-label="The choice at house i: skip it and keep best of i minus 1, or rob it and add its cash to best of i minus 2">
  <defs>
    <marker id="b27q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="120" width="160" height="50" rx="8"/>
  <text class="d-text" x="100" y="150" text-anchor="middle">best[i - 2]</text>
  <rect class="d-box" x="250" y="120" width="160" height="50" rx="8"/>
  <text class="d-text" x="330" y="150" text-anchor="middle">best[i - 1]</text>
  <rect class="d-box-accent" x="490" y="120" width="170" height="50" rx="8"/>
  <text class="d-text" x="575" y="150" text-anchor="middle">best[i]</text>
  <path class="d-edge-accent" d="M 100 118 Q 330 20 570 116" marker-end="url(#b27q3-arrow)"/>
  <path class="d-edge" d="M 412 145 L 486 145" marker-end="url(#b27q3-arrow)"/>
  <text class="d-sub" x="330" y="52" text-anchor="middle">rob house i: add nums[i]</text>
  <text class="d-sub" x="450" y="190" text-anchor="middle">skip house i</text>
</svg>

\`best[i]\` is the larger of the two arrows. Compare with climbing stairs, where the same two arrows were **added**; here we take the **max** and one arrow carries the house value.

📌 **Interview term: Optimal substructure** — if the best plan for the first \`i\` houses robs house \`i - 1\`, then what it does with the first \`i - 2\` houses must itself be the best plan for those houses (otherwise swap in a better one and the total grows). That is why \`best[i - 2]\` is the right thing to add to.

## 4. From Brute Force to O(1) Space

**Brute force — try every subset.** Each house is in or out, so there are 2ⁿ subsets; throw away those with neighbours and keep the best total. Correct but exponential: Example 2 uses it only as a checker on streets of up to 12 houses, and that alone checks 349,564 subsets.

**Recursion with memo.** \`rob(i) = max(rob(i - 1), rob(i - 2) + nums[i])\` recursively, caching each \`rob(i)\`. O(n) time, O(n) space, O(n) stack depth.

**Table.** Fill \`best[0..n]\` left to right: O(n) time and space. Keep it when you need to recover **which** houses were robbed.

**Two variables.** \`best[i]\` only reads \`best[i - 1]\` and \`best[i - 2]\`, so keep two numbers: \`prev\` (best up to \`i - 2\`) and \`cur\` (best up to \`i - 1\`).

📌 **Interview term: Rolling variables** — keeping only the previous entries the recurrence reads, here two, for O(1) extra space.

**Why "every other house" is wrong.** It only considers two of the many legal plans. On \`[2, 1, 1, 2]\` it gives 3; on \`[10, 1, 1, 10]\` it gives 11; the real answers are 4 and 20, both by robbing the first and last houses and skipping two in the middle (Example 1).

### Recovering which houses were robbed

📌 **Interview term: Reconstruction (backtracking through the table)** — walking back from the final DP cell, at each step asking which choice produced this value, to rebuild the actual solution and not just its value.

Start at \`i = n\`. If \`best[i] == best[i - 1]\`, house \`i - 1\` was not needed — move to \`i - 1\`. Otherwise house \`i - 1\` was robbed — record it and jump to \`i - 2\` (its neighbour cannot be robbed). This needs the full table, so it costs O(n) space. Example 1 prints the houses this way: \`[0, 2, 4]\` for \`[2, 7, 9, 3, 1]\`.

### The circular street (House Robber II)

If the houses stand in a circle, house 0 and house n - 1 are neighbours. Any valid plan leaves out at least one of them, so the best plan is the better of:

- the line problem on houses \`0 .. n - 2\` (house n - 1 excluded), and
- the line problem on houses \`1 .. n - 1\` (house 0 excluded).

One house alone is a special case (\`n == 1\` returns \`nums[0]\`, because both ranges would be empty).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Circular street 2, 3, 2 split into two lines: houses 0 to n minus 2, and houses 1 to n minus 1">
  <rect class="d-box-accent" x="20" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="60" y="57" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="120" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="160" y="57" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="260" y="57" text-anchor="middle">2</text>
  <text class="d-sub" x="160" y="104" text-anchor="middle">line 1: drop the last house</text>
  <text class="d-sub" x="160" y="124" text-anchor="middle">best 3</text>
  <rect class="d-box-muted" x="400" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="440" y="57" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="500" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="540" y="57" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="600" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="640" y="57" text-anchor="middle">2</text>
  <text class="d-sub" x="540" y="104" text-anchor="middle">line 2: drop the first house</text>
  <text class="d-sub" x="540" y="124" text-anchor="middle">best 3</text>
  <rect class="d-box" x="250" y="160" width="200" height="44" rx="8"/>
  <text class="d-text" x="350" y="187" text-anchor="middle">circle answer: max = 3</text>
</svg>

On the line \`[2, 3, 2]\` the answer is 4 (both 2s), but on the circle those two 2s are neighbours, so the answer drops to 3. Example 2 prints this, plus \`[200, 3, 140, 20, 10]\`: 350 on a line (200 + 140 + 10) but 340 on a circle, where 200 and 10 become neighbours.

## 5. The JavaScript Code, Line by Line

The answer to give — two variables:

~~~javascript
function rob(nums) {
  let prev = 0, cur = 0;                 // best up to house i - 2, best up to house i - 1
  for (const x of nums) {
    const next = Math.max(cur, prev + x);  // skip house i, or rob it
    prev = cur;
    cur = next;
  }
  return cur;
}
~~~

The table version, when the interviewer asks which houses:

~~~javascript
function robWithHouses(nums) {
  const n = nums.length;
  const dp = new Array(n + 1).fill(0);   // dp[i] = best using the first i houses
  for (let i = 1; i <= n; i++) {
    dp[i] = Math.max(dp[i - 1], (i >= 2 ? dp[i - 2] : 0) + nums[i - 1]);
  }
  const houses = [];
  let i = n;
  while (i >= 1) {
    if (dp[i] === dp[i - 1]) {
      i -= 1;                            // house i - 1 was not needed
    } else {
      houses.push(i - 1);                // house i - 1 was robbed: jump over its neighbour
      i -= 2;
    }
  }
  houses.reverse();
  return [dp[n], houses];
}
~~~

What each JavaScript piece is doing:

- **\`const next\`** holds the new best so that \`prev = cur\` still copies the old \`cur\`.
- **\`for (const x of nums)\`** iterates values; an empty array returns 0 with no special case.
- **\`(i >= 2 ? dp[i - 2] : 0)\`** — without the guard, \`dp[-1]\` is \`undefined\`, and \`undefined + 5\` is \`NaN\`. \`Math.max(3, NaN)\` is \`NaN\`, so one missing guard turns every later answer into \`NaN\` instead of crashing.
- **\`[dp[n], houses]\`** returns two values as an array; the caller destructures with \`const [best, houses] = robWithHouses(nums)\`.
- **Totals stay exact** while they are below 2^53 - 1 (about 9 × 10^15), which is far beyond any realistic street; no \`BigInt\` needed.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`node main.js\` (Node.js 22; the programs are plain browser-safe scripts, so the page runner prints the same). The same programs in the other three languages print exactly the same lines.

**Example 1 — House robber with the robbed houses recovered, against the every-other-house guess** printed:

~~~text
rob([1, 2, 3, 1]) = 4, houses [0, 2] (sum 4) | every-other-house guess 4
rob([2, 7, 9, 3, 1]) = 12, houses [0, 2, 4] (sum 12) | every-other-house guess 12
rob([2, 1, 1, 2]) = 4, houses [0, 3] (sum 4) | every-other-house guess 3
rob([10, 1, 1, 10]) = 20, houses [0, 3] (sum 20) | every-other-house guess 11
rob([5]) = 5, houses [0] (sum 5) | every-other-house guess 5
rob([]) = 0, houses [] (sum 0) | every-other-house guess 0
~~~

**Example 2 — The circular street (House Robber II) and a brute-force check on 300 random streets** printed:

~~~text
circle [2, 3, 2]: 3 (line answer 4)
circle [1, 2, 3, 1]: 4 (line answer 4)
circle [1, 2, 3]: 3 (line answer 4)
circle [200, 3, 140, 20, 10]: 340 (line answer 350)
circle [7]: 7 (line answer 7)
dp matches brute force on 300 of 300 random streets (349564 subsets checked)
~~~

In Example 1 the every-other-house guess is right on the first two streets and wrong on \`[2, 1, 1, 2]\` (3 vs 4) and \`[10, 1, 1, 10]\` (11 vs 20). In Example 2 the circle answer is lower than the line answer exactly when the line plan robs both ends, and the DP matches a brute force over every subset on all 300 random streets. The random streets come from a small Park–Miller generator written into each program, so all four languages test identical inputs.

## 7. Complexity

| Version | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute force over subsets | O(2ⁿ · n) | O(1) | Every subset, n work to check and sum it |
| Memoized recursion | O(n) | O(n) | n states, O(1) each, plus the recursion stack |
| Table | O(n) | O(n) | One pass; needed to recover the houses |
| Two variables | O(n) | O(1) | Only \`best[i - 1]\` and \`best[i - 2]\` are read |
| Circular street | O(n) | O(1) | Two line passes of n - 1 houses each |

## 8. Edge Cases

- **Empty street** — 0. The loop versions return 0 with no special case; code that starts with \`nums[0]\` must check first.
- **One house** — rob it. For the circle this must be special-cased: both sub-ranges are empty.
- **Two houses** — the larger one.
- **Zeros and ties** — houses worth 0, or two plans with equal totals: the best value is unique but the chosen houses may not be; the reconstruction above prefers skipping when both choices tie.
- **Skipping two in a row** — \`[2, 1, 1, 2]\` and \`[10, 1, 1, 10]\` need it; the recurrence allows it automatically.
- **Circle with n = 2 or 3** — at most one house can be robbed, and the two-range split gives that.

## Common Pitfalls

- **"Rob every other house."** Wrong on \`[2, 1, 1, 2]\` (3 instead of 4).
- **Reading \`dp[-1]\`.** It is \`undefined\`, the sum becomes \`NaN\`, and \`Math.max\` spreads the \`NaN\` to every later cell.
- **Shifting without a temporary.** \`prev = cur; cur = Math.max(cur, prev + x)\` uses the new \`prev\`.
- **Circle with one house.** Both ranges are empty and the answer comes out 0; special-case \`n === 1\`.
- **\`Math.max(...nums)\` shortcuts.** They have nothing to do with the adjacency rule, and spreading a very large array into arguments can throw a \`RangeError\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Recurrence:</strong> <span style="color:#f0e2c8;">At each house I either skip it and keep the best so far, or rob it and add its cash to the best from two houses back: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best[i] = max(best[i - 1], best[i - 2] + nums[i - 1])</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Every valid plan either uses house i or not; both cases are considered, and each uses the optimal answer for the smaller street.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Code:</strong> <span style="color:#f0e2c8;">Two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let</code> variables and a temporary <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>, O(n) time and O(1) space; an empty array returns 0 naturally.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Greedy fails:</strong> <span style="color:#f0e2c8;">Every other house gives 3 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 1, 1, 2]</code>; the answer is 4, robbing the ends and skipping two in the middle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Variants:</strong> <span style="color:#f0e2c8;">To list the houses I keep the table and walk back; for a circle I take the max of the line answers without the last and without the first house.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return which houses were robbed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp</code>, walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i = n</code>: equal to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i - 1]</code> means skip, otherwise record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - 1</code> and jump two. That printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 2, 4]</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 7, 9, 3, 1]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The houses are in a circle. What changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Solve the line on indices <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0..n-2</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1..n-1</code> (pass bounds, do not slice twice) and take the max; special-case one house.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes wrong if you forget the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">i &gt;= 2</code> guard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[-1]</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, the sum is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code> from then on, so the result is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code> with no error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did you check it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Against a brute force that tries every subset with a bitmask; it matched on 300 random streets.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about houses on a tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return a pair <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[robThis, skipThis]</code> from each node in a post-order walk and combine the children.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State** | best[i] = most money from the first i houses with no two neighbours robbed |
| **Recurrence (take-or-skip)** | best[i] = max(best[i - 1], best[i - 2] + nums[i - 1]) |
| **Base case** | best[0] = 0, and best[-1] treated as 0 |
| **Optimal substructure** | The best plan for i houses contains the best plan for the smaller street it builds on |
| **Rolling variables** | Keep only the two previous best values, O(1) space |
| **Reconstruction (backtracking through the table)** | Walk back from the last cell to recover which houses were robbed |

---
**Conclusion:** House robber is a take-or-skip DP: at each house, the best total is the larger of skipping it (\`best[i - 1]\`) and robbing it (\`best[i - 2] + nums[i]\`). In JavaScript it is a loop with two variables and a temporary — O(n) time, O(1) space — and greedy shortcuts fail on \`[2, 1, 1, 2]\`. Guard against \`dp[-1]\` turning into \`NaN\`, keep the table when you need the houses, and handle a circular street as two line problems.`,
        examples: [
          {
            label: "House robber with the robbed houses recovered, against the every-other-house guess",
            code: `function rob(nums) {
  // best total with no two adjacent houses, in O(1) extra space
  let prev = 0, cur = 0;                 // best up to house i - 2, best up to house i - 1
  for (const x of nums) {
    const next = Math.max(cur, prev + x);  // skip house i, or rob it
    prev = cur;
    cur = next;
  }
  return cur;
}

function robWithHouses(nums) {
  // full table, then walk it backwards to recover which houses were robbed
  const n = nums.length;
  const dp = new Array(n + 1).fill(0);   // dp[i] = best using the first i houses
  for (let i = 1; i <= n; i++) {
    dp[i] = Math.max(dp[i - 1], (i >= 2 ? dp[i - 2] : 0) + nums[i - 1]);
  }
  const houses = [];
  let i = n;
  while (i >= 1) {
    if (dp[i] === dp[i - 1]) {
      i -= 1;                            // house i - 1 was not needed
    } else {
      houses.push(i - 1);                // house i - 1 was robbed: jump over its neighbour
      i -= 2;
    }
  }
  houses.reverse();
  return [dp[n], houses];
}

function alternatingGuess(nums) {
  // the tempting wrong idea: rob every other house, pick the better half
  let even = 0, odd = 0;
  nums.forEach((x, i) => { if (i % 2 === 0) even += x; else odd += x; });
  return Math.max(even, odd);
}

const fmt = (arr) => "[" + arr.join(", ") + "]";

for (const nums of [[1, 2, 3, 1], [2, 7, 9, 3, 1], [2, 1, 1, 2], [10, 1, 1, 10], [5], []]) {
  const [best, houses] = robWithHouses(nums);
  console.log("rob(" + fmt(nums) + ") = " + rob(nums) + ", houses " + fmt(houses) +
    " (sum " + best + ") | every-other-house guess " + alternatingGuess(nums));
}
`,
          },
          {
            label: "The circular street (House Robber II) and a brute-force check on 300 random streets",
            code: `function robLine(nums, lo, hi) {
  // house robber on nums[lo..hi] (inclusive), O(1) space
  let prev = 0, cur = 0;
  for (let i = lo; i <= hi; i++) {
    const next = Math.max(cur, prev + nums[i]);
    prev = cur;
    cur = next;
  }
  return cur;
}

function robCircle(nums) {
  // first and last house are neighbours: they cannot both be robbed
  const n = nums.length;
  if (n === 1) return nums[0];
  return Math.max(robLine(nums, 0, n - 2), robLine(nums, 1, n - 1));
}

function bruteForce(nums, circle) {
  // try every subset of houses (2^n of them) and keep the legal ones
  const n = nums.length;
  let best = 0;
  for (let mask = 0; mask < (1 << n); mask++) {
    if (mask & (mask >> 1)) continue;    // two adjacent houses in the subset
    if (circle && n > 1 && (mask & 1) && ((mask >> (n - 1)) & 1)) continue;  // first and last both chosen
    let total = 0;
    for (let i = 0; i < n; i++) if ((mask >> i) & 1) total += nums[i];
    best = Math.max(best, total);
  }
  return best;
}

let seed = 2026;
function nextRand(limit) {
  // Park-Miller generator, so all four languages see the same streets
  seed = (seed * 48271) % 2147483647;    // product stays below 2^53, so Number is exact
  return seed % limit;
}

const fmt = (arr) => "[" + arr.join(", ") + "]";

for (const nums of [[2, 3, 2], [1, 2, 3, 1], [1, 2, 3], [200, 3, 140, 20, 10], [7]]) {
  console.log("circle " + fmt(nums) + ": " + robCircle(nums) + " (line answer " + robLine(nums, 0, nums.length - 1) + ")");
}

let agree = 0, subsets = 0;
for (let t = 0; t < 300; t++) {
  const n = 1 + nextRand(12);
  const nums = [];
  for (let k = 0; k < n; k++) nums.push(nextRand(21));
  subsets += 2 * (1 << n);
  if (robLine(nums, 0, n - 1) === bruteForce(nums, false) && robCircle(nums) === bruteForce(nums, true)) agree++;
}
console.log("dp matches brute force on " + agree + " of 300 random streets (" + subsets + " subsets checked)");
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are a robber on a street of houses, each with some amount of money. Robbing two adjacent houses triggers the alarm. Given the amounts, return the most money you can rob tonight. Please write it in Java. If you finish early: what if the street is a circle?"

**What a strong answer should cover:**
- The take-or-skip recurrence \`best[i] = max(best[i - 1], best[i - 2] + nums[i])\`, with base cases for zero and one house.
- Why "every other house" and other greedy rules fail (\`[2, 1, 1, 2]\` → 4, not 3).
- O(n) time with O(1) space via two rolling variables; the full table only when the chosen houses must be returned.
- The circular variant: max of two line problems, excluding the first or the last house.
- Java specifics: zero-filled \`int[]\` as the base case, \`ArrayIndexOutOfBoundsException\` on \`dp[-1]\`, \`long\` if totals can overflow, and \`==\` only on primitives.

**Clarifying questions expected:**
- "Is the street a line or a circle?"
- "Do you want the maximum amount only, or also which houses?"
- "Can amounts be zero or negative, and how large can the total get?"

**Code / implementation expected:** Yes — an O(n), O(1)-space Java function; reconstruction or the circular version as follow-ups.`,
        answer: `**Target Audience:** Beginners who have seen climbing stairs and want the next dynamic programming step.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A cat burglar in a cartoon walks down a street of houses at night. Each house has some cash inside. There is one rule: the houses on this street have connected alarms, so if she breaks into **two houses next to each other**, the alarm goes off. She wants the most money possible.

Her first idea is "rob every other house": houses 1, 3, 5, … or houses 2, 4, 6, …, whichever totals more. On the street \`[2, 1, 1, 2]\` that gives 3. But robbing the first and the last house gives **4** — they are not neighbours. Sometimes the best plan skips **two** houses in a row.

Her second idea is "always grab the richest house left". On \`[2, 7, 9, 3, 1]\` she grabs 9, which rules out 7 and 3, then grabs 2 and 1: total 12, which happens to be right here — but greedy choices like that fail on other streets, and she cannot know in advance which.

What she really needs is to make the decision **at each house, knowing the best she could have done so far**. That is [dynamic programming](/interview-question/what-is-dynamic-programming), and house robber is the classic example of a **take-or-skip** decision — the step up from [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem), where we only counted.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the amounts be negative or zero? | The standard problem uses non-negative amounts. With negatives you could simply skip those houses, and the recurrence still works because \`max\` never forces you to take one. |
| Is the street a line or a circle? | In a circle the first and last houses are neighbours (House Robber II); the fix is to solve two line problems (Example 2). |
| Do you need the total only, or which houses to rob? | Recovering the houses needs the full table (or a parent array), not just two variables. |
| How long can the street be, and how large are the amounts? | Decides between 32-bit and 64-bit totals, and rules out any brute force over 2ⁿ subsets. |
| What about an empty street? | Return 0; make sure the code does not index \`nums[0]\` when there is no house. |

## 3. The Core Idea: Take It or Skip It

Walk the houses from left to right. At house \`i\` there are exactly two choices:

- **Skip it.** Then the best total is whatever was best for the houses before it: \`best[i - 1]\`.
- **Rob it.** Then house \`i - 1\` must be left alone, so the best total is the best for houses up to \`i - 2\`, plus the cash here: \`best[i - 2] + nums[i]\`.

📌 **Interview term: State** — \`best[i]\` = the largest amount you can steal from the first \`i\` houses (houses \`0 .. i - 1\`) without robbing two neighbours.

📌 **Interview term: Recurrence (take-or-skip)** — \`best[i] = max(best[i - 1], best[i - 2] + nums[i - 1])\`. The \`max\` picks whichever of the two choices is better; because both choices are considered, you never need to guess.

📌 **Interview term: Base case** — \`best[0] = 0\` (no houses, no money). Treat \`best[-1]\` as 0 too, so the first house gives \`best[1] = max(0, 0 + nums[0]) = nums[0]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Houses 2, 7, 9, 3, 1 with the best total after each house: 2, 7, 11, 11, 12. Houses 0, 2 and 4 are robbed">
  <rect class="d-box-accent" x="30" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="80" y="68" text-anchor="middle">house 0</text>
  <text class="d-sub" x="80" y="88" text-anchor="middle">cash 2</text>
  <rect class="d-box" x="160" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="210" y="68" text-anchor="middle">house 1</text>
  <text class="d-sub" x="210" y="88" text-anchor="middle">cash 7</text>
  <rect class="d-box-accent" x="290" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="340" y="68" text-anchor="middle">house 2</text>
  <text class="d-sub" x="340" y="88" text-anchor="middle">cash 9</text>
  <rect class="d-box" x="420" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="470" y="68" text-anchor="middle">house 3</text>
  <text class="d-sub" x="470" y="88" text-anchor="middle">cash 3</text>
  <rect class="d-box-accent" x="550" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="600" y="68" text-anchor="middle">house 4</text>
  <text class="d-sub" x="600" y="88" text-anchor="middle">cash 1</text>
  <rect class="d-box-muted" x="30" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="80" y="190" text-anchor="middle">best 2</text>
  <rect class="d-box-muted" x="160" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="210" y="190" text-anchor="middle">best 7</text>
  <rect class="d-box-muted" x="290" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="340" y="190" text-anchor="middle">best 11</text>
  <rect class="d-box-muted" x="420" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="470" y="190" text-anchor="middle">best 11</text>
  <rect class="d-box-muted" x="550" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="600" y="190" text-anchor="middle">best 12</text>
  <line class="d-edge" x1="80" y1="102" x2="80" y2="158"/>
  <line class="d-edge" x1="210" y1="102" x2="210" y2="158"/>
  <line class="d-edge" x1="340" y1="102" x2="340" y2="158"/>
  <line class="d-edge" x1="470" y1="102" x2="470" y2="158"/>
  <line class="d-edge" x1="600" y1="102" x2="600" y2="158"/>
</svg>

The bottom row is the best total after each house for \`[2, 7, 9, 3, 1]\`. At house 2: skip gives 7, rob gives 2 + 9 = 11, so 11. At house 3: skip gives 11, rob gives 7 + 3 = 10, so 11 (skip). At house 4: skip gives 11, rob gives 11 + 1 = 12. The highlighted houses 0, 2 and 4 are the plan behind the 12.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 200" role="img" aria-label="The choice at house i: skip it and keep best of i minus 1, or rob it and add its cash to best of i minus 2">
  <defs>
    <marker id="b27q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="120" width="160" height="50" rx="8"/>
  <text class="d-text" x="100" y="150" text-anchor="middle">best[i - 2]</text>
  <rect class="d-box" x="250" y="120" width="160" height="50" rx="8"/>
  <text class="d-text" x="330" y="150" text-anchor="middle">best[i - 1]</text>
  <rect class="d-box-accent" x="490" y="120" width="170" height="50" rx="8"/>
  <text class="d-text" x="575" y="150" text-anchor="middle">best[i]</text>
  <path class="d-edge-accent" d="M 100 118 Q 330 20 570 116" marker-end="url(#b27q3-arrow)"/>
  <path class="d-edge" d="M 412 145 L 486 145" marker-end="url(#b27q3-arrow)"/>
  <text class="d-sub" x="330" y="52" text-anchor="middle">rob house i: add nums[i]</text>
  <text class="d-sub" x="450" y="190" text-anchor="middle">skip house i</text>
</svg>

\`best[i]\` is the larger of the two arrows. Compare with climbing stairs, where the same two arrows were **added**; here we take the **max** and one arrow carries the house value.

📌 **Interview term: Optimal substructure** — if the best plan for the first \`i\` houses robs house \`i - 1\`, then what it does with the first \`i - 2\` houses must itself be the best plan for those houses (otherwise swap in a better one and the total grows). That is why \`best[i - 2]\` is the right thing to add to.

## 4. From Brute Force to O(1) Space

**Brute force — try every subset.** Each house is in or out, so there are 2ⁿ subsets; throw away those with neighbours and keep the best total. Correct but exponential: Example 2 uses it only as a checker on streets of up to 12 houses, and that alone checks 349,564 subsets.

**Recursion with memo.** \`rob(i) = max(rob(i - 1), rob(i - 2) + nums[i])\` recursively, caching each \`rob(i)\`. O(n) time, O(n) space, O(n) stack depth.

**Table.** Fill \`best[0..n]\` left to right: O(n) time and space. Keep it when you need to recover **which** houses were robbed.

**Two variables.** \`best[i]\` only reads \`best[i - 1]\` and \`best[i - 2]\`, so keep two numbers: \`prev\` (best up to \`i - 2\`) and \`cur\` (best up to \`i - 1\`).

📌 **Interview term: Rolling variables** — keeping only the previous entries the recurrence reads, here two, for O(1) extra space.

**Why "every other house" is wrong.** It only considers two of the many legal plans. On \`[2, 1, 1, 2]\` it gives 3; on \`[10, 1, 1, 10]\` it gives 11; the real answers are 4 and 20, both by robbing the first and last houses and skipping two in the middle (Example 1).

### Recovering which houses were robbed

📌 **Interview term: Reconstruction (backtracking through the table)** — walking back from the final DP cell, at each step asking which choice produced this value, to rebuild the actual solution and not just its value.

Start at \`i = n\`. If \`best[i] == best[i - 1]\`, house \`i - 1\` was not needed — move to \`i - 1\`. Otherwise house \`i - 1\` was robbed — record it and jump to \`i - 2\` (its neighbour cannot be robbed). This needs the full table, so it costs O(n) space. Example 1 prints the houses this way: \`[0, 2, 4]\` for \`[2, 7, 9, 3, 1]\`.

### The circular street (House Robber II)

If the houses stand in a circle, house 0 and house n - 1 are neighbours. Any valid plan leaves out at least one of them, so the best plan is the better of:

- the line problem on houses \`0 .. n - 2\` (house n - 1 excluded), and
- the line problem on houses \`1 .. n - 1\` (house 0 excluded).

One house alone is a special case (\`n == 1\` returns \`nums[0]\`, because both ranges would be empty).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Circular street 2, 3, 2 split into two lines: houses 0 to n minus 2, and houses 1 to n minus 1">
  <rect class="d-box-accent" x="20" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="60" y="57" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="120" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="160" y="57" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="260" y="57" text-anchor="middle">2</text>
  <text class="d-sub" x="160" y="104" text-anchor="middle">line 1: drop the last house</text>
  <text class="d-sub" x="160" y="124" text-anchor="middle">best 3</text>
  <rect class="d-box-muted" x="400" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="440" y="57" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="500" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="540" y="57" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="600" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="640" y="57" text-anchor="middle">2</text>
  <text class="d-sub" x="540" y="104" text-anchor="middle">line 2: drop the first house</text>
  <text class="d-sub" x="540" y="124" text-anchor="middle">best 3</text>
  <rect class="d-box" x="250" y="160" width="200" height="44" rx="8"/>
  <text class="d-text" x="350" y="187" text-anchor="middle">circle answer: max = 3</text>
</svg>

On the line \`[2, 3, 2]\` the answer is 4 (both 2s), but on the circle those two 2s are neighbours, so the answer drops to 3. Example 2 prints this, plus \`[200, 3, 140, 20, 10]\`: 350 on a line (200 + 140 + 10) but 340 on a circle, where 200 and 10 become neighbours.

## 5. The Java Code, Line by Line

The answer to give — two variables:

~~~java
static int rob(int[] nums) {
    int prev = 0, cur = 0;                     // best up to house i - 2, best up to house i - 1
    for (int x : nums) {
        int next = Math.max(cur, prev + x);    // skip house i, or rob it
        prev = cur;
        cur = next;
    }
    return cur;
}
~~~

The table version, when the interviewer asks which houses (the total comes back through a one-element array, a common Java idiom for a second return value):

~~~java
static List<Integer> robbedHouses(int[] nums, int[] bestOut) {
    int n = nums.length;
    int[] dp = new int[n + 1];                 // dp[i] = best using the first i houses
    for (int i = 1; i <= n; i++) {
        dp[i] = Math.max(dp[i - 1], (i >= 2 ? dp[i - 2] : 0) + nums[i - 1]);
    }
    List<Integer> houses = new ArrayList<>();
    int i = n;
    while (i >= 1) {
        if (dp[i] == dp[i - 1]) {
            i -= 1;                            // house i - 1 was not needed
        } else {
            houses.add(i - 1);                 // house i - 1 was robbed: jump over its neighbour
            i -= 2;
        }
    }
    Collections.reverse(houses);
    bestOut[0] = dp[n];
    return houses;
}
~~~

What each Java piece is doing:

- **\`int next\`** keeps the old \`cur\` available for \`prev = cur\`.
- **The enhanced \`for (int x : nums)\`** handles an empty array by never running; \`rob(new int[0])\` returns 0.
- **\`new int[n + 1]\`** is zero-filled, which is exactly the base case \`dp[0] = 0\`.
- **\`dp[i] == dp[i - 1]\`** compares primitive \`int\`s, so \`==\` is correct here. If the table were a \`List<Integer>\`, the same \`==\` would compare object references and could fail for values above 127.
- **\`Collections.reverse\`** flips the \`ArrayList\` in place; \`List.toString()\` prints \`[0, 2, 4]\`, which is why Example 1 can print the list directly.
- **Overflow.** For small amounts \`int\` is plenty. If the total could pass \`Integer.MAX_VALUE\` (2,147,483,647), use \`long\` — \`prev + x\` would wrap silently.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs in the other three languages print exactly the same lines.

**Example 1 — House robber with the robbed houses recovered, against the every-other-house guess** printed:

~~~text
rob([1, 2, 3, 1]) = 4, houses [0, 2] (sum 4) | every-other-house guess 4
rob([2, 7, 9, 3, 1]) = 12, houses [0, 2, 4] (sum 12) | every-other-house guess 12
rob([2, 1, 1, 2]) = 4, houses [0, 3] (sum 4) | every-other-house guess 3
rob([10, 1, 1, 10]) = 20, houses [0, 3] (sum 20) | every-other-house guess 11
rob([5]) = 5, houses [0] (sum 5) | every-other-house guess 5
rob([]) = 0, houses [] (sum 0) | every-other-house guess 0
~~~

**Example 2 — The circular street (House Robber II) and a brute-force check on 300 random streets** printed:

~~~text
circle [2, 3, 2]: 3 (line answer 4)
circle [1, 2, 3, 1]: 4 (line answer 4)
circle [1, 2, 3]: 3 (line answer 4)
circle [200, 3, 140, 20, 10]: 340 (line answer 350)
circle [7]: 7 (line answer 7)
dp matches brute force on 300 of 300 random streets (349564 subsets checked)
~~~

In Example 1 the every-other-house guess is right on the first two streets and wrong on \`[2, 1, 1, 2]\` (3 vs 4) and \`[10, 1, 1, 10]\` (11 vs 20). In Example 2 the circle answer is lower than the line answer exactly when the line plan robs both ends, and the DP matches a brute force over every subset on all 300 random streets. The random streets come from a small Park–Miller generator written into each program, so all four languages test identical inputs.

## 7. Complexity

| Version | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute force over subsets | O(2ⁿ · n) | O(1) | Every subset, n work to check and sum it |
| Memoized recursion | O(n) | O(n) | n states, O(1) each, plus the recursion stack |
| Table | O(n) | O(n) | One pass; needed to recover the houses |
| Two variables | O(n) | O(1) | Only \`best[i - 1]\` and \`best[i - 2]\` are read |
| Circular street | O(n) | O(1) | Two line passes of n - 1 houses each |

## 8. Edge Cases

- **Empty street** — 0. The loop versions return 0 with no special case; code that starts with \`nums[0]\` must check first.
- **One house** — rob it. For the circle this must be special-cased: both sub-ranges are empty.
- **Two houses** — the larger one.
- **Zeros and ties** — houses worth 0, or two plans with equal totals: the best value is unique but the chosen houses may not be; the reconstruction above prefers skipping when both choices tie.
- **Skipping two in a row** — \`[2, 1, 1, 2]\` and \`[10, 1, 1, 10]\` need it; the recurrence allows it automatically.
- **Circle with n = 2 or 3** — at most one house can be robbed, and the two-range split gives that.

## Common Pitfalls

- **"Rob every other house."** Wrong on \`[2, 1, 1, 2]\` (3 instead of 4).
- **\`dp[i - 2]\` at \`i = 1\`.** \`dp[-1]\` throws \`ArrayIndexOutOfBoundsException\`; guard it or use the shifted table.
- **Shifting without a temporary** reads the new \`prev\`.
- **Circle with one house.** Both ranges are empty and the answer is 0; special-case \`n == 1\`.
- **Boxed comparisons.** If the table is a \`List<Integer>\`, compare with \`.equals\`, not \`==\`.
- **\`int\` overflow** for large amounts; use \`long\` when the total can exceed 2,147,483,647.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Recurrence:</strong> <span style="color:#f0e2c8;">At each house I either skip it and keep the best so far, or rob it and add its cash to the best from two houses back: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best[i] = max(best[i - 1], best[i - 2] + nums[i - 1])</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Every valid plan either uses house i or not; both cases are considered, and each uses the optimal answer for the smaller street.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Code:</strong> <span style="color:#f0e2c8;">Two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> variables and a temporary, O(n) time and O(1) space; an empty array returns 0 naturally.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Greedy fails:</strong> <span style="color:#f0e2c8;">Every other house gives 3 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 1, 1, 2]</code>; the answer is 4, robbing the ends and skipping two in the middle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Variants:</strong> <span style="color:#f0e2c8;">To list the houses I keep an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> table and walk back; for a circle I take the max of two line passes, special-casing one house.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return which houses were robbed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp</code>, walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i = n</code>: equal to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i - 1]</code> means skip, otherwise add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - 1</code> to a list and jump two, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.reverse</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The houses are in a circle. What changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run the line helper on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0..n-2</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1..n-1</code> with index bounds, no array copies, and take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max</code>; return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[0]</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n == 1</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could the total overflow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With large amounts or many houses, yes, silently. I would switch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did you check it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Against a bitmask brute force over all subsets; it matched on 300 random streets.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about houses on a tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return two values per node, robbed and not robbed, from a post-order walk; in Java an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[2]</code> or a small record.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State** | best[i] = most money from the first i houses with no two neighbours robbed |
| **Recurrence (take-or-skip)** | best[i] = max(best[i - 1], best[i - 2] + nums[i - 1]) |
| **Base case** | best[0] = 0, and best[-1] treated as 0 |
| **Optimal substructure** | The best plan for i houses contains the best plan for the smaller street it builds on |
| **Rolling variables** | Keep only the two previous best values, O(1) space |
| **Reconstruction (backtracking through the table)** | Walk back from the last cell to recover which houses were robbed |

---
**Conclusion:** House robber is a take-or-skip DP: at each house, the best total is the larger of skipping it (\`best[i - 1]\`) and robbing it (\`best[i - 2] + nums[i]\`). In Java it is a loop over an \`int[]\` with two variables — O(n) time, O(1) space — and greedy shortcuts fail on \`[2, 1, 1, 2]\`. Use \`long\` if totals can overflow, keep the table when you need the houses, and handle a circular street as two line problems.`,
        examples: [
          {
            label: "House robber with the robbed houses recovered, against the every-other-house guess",
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class Main {
    static int rob(int[] nums) {
        // best total with no two adjacent houses, in O(1) extra space
        int prev = 0, cur = 0;                     // best up to house i - 2, best up to house i - 1
        for (int x : nums) {
            int next = Math.max(cur, prev + x);    // skip house i, or rob it
            prev = cur;
            cur = next;
        }
        return cur;
    }

    static List<Integer> robbedHouses(int[] nums, int[] bestOut) {
        // full table, then walk it backwards to recover which houses were robbed
        int n = nums.length;
        int[] dp = new int[n + 1];                 // dp[i] = best using the first i houses
        for (int i = 1; i <= n; i++) {
            dp[i] = Math.max(dp[i - 1], (i >= 2 ? dp[i - 2] : 0) + nums[i - 1]);
        }
        List<Integer> houses = new ArrayList<>();
        int i = n;
        while (i >= 1) {
            if (dp[i] == dp[i - 1]) {
                i -= 1;                            // house i - 1 was not needed
            } else {
                houses.add(i - 1);                 // house i - 1 was robbed: jump over its neighbour
                i -= 2;
            }
        }
        Collections.reverse(houses);
        bestOut[0] = dp[n];
        return houses;
    }

    static int alternatingGuess(int[] nums) {
        // the tempting wrong idea: rob every other house, pick the better half
        int even = 0, odd = 0;
        for (int i = 0; i < nums.length; i++) {
            if (i % 2 == 0) even += nums[i]; else odd += nums[i];
        }
        return Math.max(even, odd);
    }

    public static void main(String[] args) {
        int[][] streets = {{1, 2, 3, 1}, {2, 7, 9, 3, 1}, {2, 1, 1, 2}, {10, 1, 1, 10}, {5}, {}};
        for (int[] nums : streets) {
            int[] best = new int[1];
            List<Integer> houses = robbedHouses(nums, best);
            System.out.println("rob(" + Arrays.toString(nums) + ") = " + rob(nums) + ", houses " + houses
                + " (sum " + best[0] + ") | every-other-house guess " + alternatingGuess(nums));
        }
    }
}
`,
          },
          {
            label: "The circular street (House Robber II) and a brute-force check on 300 random streets",
            code: `import java.util.Arrays;

public class Main {
    static int robLine(int[] nums, int lo, int hi) {
        // house robber on nums[lo..hi] (inclusive), O(1) space
        int prev = 0, cur = 0;
        for (int i = lo; i <= hi; i++) {
            int next = Math.max(cur, prev + nums[i]);
            prev = cur;
            cur = next;
        }
        return cur;
    }

    static int robCircle(int[] nums) {
        // first and last house are neighbours: they cannot both be robbed
        int n = nums.length;
        if (n == 1) return nums[0];
        return Math.max(robLine(nums, 0, n - 2), robLine(nums, 1, n - 1));
    }

    static int bruteForce(int[] nums, boolean circle) {
        // try every subset of houses (2^n of them) and keep the legal ones
        int n = nums.length, best = 0;
        for (int mask = 0; mask < (1 << n); mask++) {
            if ((mask & (mask >> 1)) != 0) continue;   // two adjacent houses in the subset
            if (circle && n > 1 && (mask & 1) != 0 && ((mask >> (n - 1)) & 1) != 0) continue;  // first and last both chosen
            int total = 0;
            for (int i = 0; i < n; i++) if (((mask >> i) & 1) != 0) total += nums[i];
            best = Math.max(best, total);
        }
        return best;
    }

    static long seed = 2026;

    static int nextRand(int limit) {
        // Park-Miller generator, so all four languages see the same streets
        seed = seed * 48271 % 2147483647;          // long: the product does not fit in an int
        return (int) (seed % limit);
    }

    public static void main(String[] args) {
        int[][] samples = {{2, 3, 2}, {1, 2, 3, 1}, {1, 2, 3}, {200, 3, 140, 20, 10}, {7}};
        for (int[] nums : samples) {
            System.out.println("circle " + Arrays.toString(nums) + ": " + robCircle(nums)
                + " (line answer " + robLine(nums, 0, nums.length - 1) + ")");
        }
        int agree = 0;
        long subsets = 0;
        for (int t = 0; t < 300; t++) {
            int n = 1 + nextRand(12);
            int[] nums = new int[n];
            for (int k = 0; k < n; k++) nums[k] = nextRand(21);
            subsets += 2L * (1 << n);
            if (robLine(nums, 0, n - 1) == bruteForce(nums, false) && robCircle(nums) == bruteForce(nums, true)) agree++;
        }
        System.out.println("dp matches brute force on " + agree + " of 300 random streets (" + subsets + " subsets checked)");
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are a robber on a street of houses, each with some amount of money. Robbing two adjacent houses triggers the alarm. Given the amounts, return the most money you can rob tonight. Please write it in C++. If you finish early: what if the street is a circle?"

**What a strong answer should cover:**
- The take-or-skip recurrence \`best[i] = max(best[i - 1], best[i - 2] + nums[i])\`, with base cases for zero and one house.
- Why "every other house" and other greedy rules fail (\`[2, 1, 1, 2]\` → 4, not 3).
- O(n) time with O(1) space via two rolling variables; the full table only when the chosen houses must be returned.
- The circular variant: max of two line problems, excluding the first or the last house.
- C++ specifics: passing \`const std::vector<int>&\`, unsigned \`size()\` arithmetic, out-of-bounds \`dp[-1]\` being undefined behaviour, and \`long long\` for large totals.

**Clarifying questions expected:**
- "Is the street a line or a circle?"
- "Do you want the maximum amount only, or also which houses?"
- "Can amounts be zero or negative, and how large can the total get?"

**Code / implementation expected:** Yes — an O(n), O(1)-space C++ function; reconstruction or the circular version as follow-ups.`,
        answer: `**Target Audience:** Beginners who have seen climbing stairs and want the next dynamic programming step.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A cat burglar in a cartoon walks down a street of houses at night. Each house has some cash inside. There is one rule: the houses on this street have connected alarms, so if she breaks into **two houses next to each other**, the alarm goes off. She wants the most money possible.

Her first idea is "rob every other house": houses 1, 3, 5, … or houses 2, 4, 6, …, whichever totals more. On the street \`[2, 1, 1, 2]\` that gives 3. But robbing the first and the last house gives **4** — they are not neighbours. Sometimes the best plan skips **two** houses in a row.

Her second idea is "always grab the richest house left". On \`[2, 7, 9, 3, 1]\` she grabs 9, which rules out 7 and 3, then grabs 2 and 1: total 12, which happens to be right here — but greedy choices like that fail on other streets, and she cannot know in advance which.

What she really needs is to make the decision **at each house, knowing the best she could have done so far**. That is [dynamic programming](/interview-question/what-is-dynamic-programming), and house robber is the classic example of a **take-or-skip** decision — the step up from [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem), where we only counted.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the amounts be negative or zero? | The standard problem uses non-negative amounts. With negatives you could simply skip those houses, and the recurrence still works because \`max\` never forces you to take one. |
| Is the street a line or a circle? | In a circle the first and last houses are neighbours (House Robber II); the fix is to solve two line problems (Example 2). |
| Do you need the total only, or which houses to rob? | Recovering the houses needs the full table (or a parent array), not just two variables. |
| How long can the street be, and how large are the amounts? | Decides between 32-bit and 64-bit totals, and rules out any brute force over 2ⁿ subsets. |
| What about an empty street? | Return 0; make sure the code does not index \`nums[0]\` when there is no house. |

## 3. The Core Idea: Take It or Skip It

Walk the houses from left to right. At house \`i\` there are exactly two choices:

- **Skip it.** Then the best total is whatever was best for the houses before it: \`best[i - 1]\`.
- **Rob it.** Then house \`i - 1\` must be left alone, so the best total is the best for houses up to \`i - 2\`, plus the cash here: \`best[i - 2] + nums[i]\`.

📌 **Interview term: State** — \`best[i]\` = the largest amount you can steal from the first \`i\` houses (houses \`0 .. i - 1\`) without robbing two neighbours.

📌 **Interview term: Recurrence (take-or-skip)** — \`best[i] = max(best[i - 1], best[i - 2] + nums[i - 1])\`. The \`max\` picks whichever of the two choices is better; because both choices are considered, you never need to guess.

📌 **Interview term: Base case** — \`best[0] = 0\` (no houses, no money). Treat \`best[-1]\` as 0 too, so the first house gives \`best[1] = max(0, 0 + nums[0]) = nums[0]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 250" role="img" aria-label="Houses 2, 7, 9, 3, 1 with the best total after each house: 2, 7, 11, 11, 12. Houses 0, 2 and 4 are robbed">
  <rect class="d-box-accent" x="30" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="80" y="68" text-anchor="middle">house 0</text>
  <text class="d-sub" x="80" y="88" text-anchor="middle">cash 2</text>
  <rect class="d-box" x="160" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="210" y="68" text-anchor="middle">house 1</text>
  <text class="d-sub" x="210" y="88" text-anchor="middle">cash 7</text>
  <rect class="d-box-accent" x="290" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="340" y="68" text-anchor="middle">house 2</text>
  <text class="d-sub" x="340" y="88" text-anchor="middle">cash 9</text>
  <rect class="d-box" x="420" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="470" y="68" text-anchor="middle">house 3</text>
  <text class="d-sub" x="470" y="88" text-anchor="middle">cash 3</text>
  <rect class="d-box-accent" x="550" y="40" width="100" height="60" rx="8"/>
  <text class="d-text" x="600" y="68" text-anchor="middle">house 4</text>
  <text class="d-sub" x="600" y="88" text-anchor="middle">cash 1</text>
  <rect class="d-box-muted" x="30" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="80" y="190" text-anchor="middle">best 2</text>
  <rect class="d-box-muted" x="160" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="210" y="190" text-anchor="middle">best 7</text>
  <rect class="d-box-muted" x="290" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="340" y="190" text-anchor="middle">best 11</text>
  <rect class="d-box-muted" x="420" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="470" y="190" text-anchor="middle">best 11</text>
  <rect class="d-box-muted" x="550" y="160" width="100" height="50" rx="8"/>
  <text class="d-text" x="600" y="190" text-anchor="middle">best 12</text>
  <line class="d-edge" x1="80" y1="102" x2="80" y2="158"/>
  <line class="d-edge" x1="210" y1="102" x2="210" y2="158"/>
  <line class="d-edge" x1="340" y1="102" x2="340" y2="158"/>
  <line class="d-edge" x1="470" y1="102" x2="470" y2="158"/>
  <line class="d-edge" x1="600" y1="102" x2="600" y2="158"/>
</svg>

The bottom row is the best total after each house for \`[2, 7, 9, 3, 1]\`. At house 2: skip gives 7, rob gives 2 + 9 = 11, so 11. At house 3: skip gives 11, rob gives 7 + 3 = 10, so 11 (skip). At house 4: skip gives 11, rob gives 11 + 1 = 12. The highlighted houses 0, 2 and 4 are the plan behind the 12.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 200" role="img" aria-label="The choice at house i: skip it and keep best of i minus 1, or rob it and add its cash to best of i minus 2">
  <defs>
    <marker id="b27q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="120" width="160" height="50" rx="8"/>
  <text class="d-text" x="100" y="150" text-anchor="middle">best[i - 2]</text>
  <rect class="d-box" x="250" y="120" width="160" height="50" rx="8"/>
  <text class="d-text" x="330" y="150" text-anchor="middle">best[i - 1]</text>
  <rect class="d-box-accent" x="490" y="120" width="170" height="50" rx="8"/>
  <text class="d-text" x="575" y="150" text-anchor="middle">best[i]</text>
  <path class="d-edge-accent" d="M 100 118 Q 330 20 570 116" marker-end="url(#b27q3-arrow)"/>
  <path class="d-edge" d="M 412 145 L 486 145" marker-end="url(#b27q3-arrow)"/>
  <text class="d-sub" x="330" y="52" text-anchor="middle">rob house i: add nums[i]</text>
  <text class="d-sub" x="450" y="190" text-anchor="middle">skip house i</text>
</svg>

\`best[i]\` is the larger of the two arrows. Compare with climbing stairs, where the same two arrows were **added**; here we take the **max** and one arrow carries the house value.

📌 **Interview term: Optimal substructure** — if the best plan for the first \`i\` houses robs house \`i - 1\`, then what it does with the first \`i - 2\` houses must itself be the best plan for those houses (otherwise swap in a better one and the total grows). That is why \`best[i - 2]\` is the right thing to add to.

## 4. From Brute Force to O(1) Space

**Brute force — try every subset.** Each house is in or out, so there are 2ⁿ subsets; throw away those with neighbours and keep the best total. Correct but exponential: Example 2 uses it only as a checker on streets of up to 12 houses, and that alone checks 349,564 subsets.

**Recursion with memo.** \`rob(i) = max(rob(i - 1), rob(i - 2) + nums[i])\` recursively, caching each \`rob(i)\`. O(n) time, O(n) space, O(n) stack depth.

**Table.** Fill \`best[0..n]\` left to right: O(n) time and space. Keep it when you need to recover **which** houses were robbed.

**Two variables.** \`best[i]\` only reads \`best[i - 1]\` and \`best[i - 2]\`, so keep two numbers: \`prev\` (best up to \`i - 2\`) and \`cur\` (best up to \`i - 1\`).

📌 **Interview term: Rolling variables** — keeping only the previous entries the recurrence reads, here two, for O(1) extra space.

**Why "every other house" is wrong.** It only considers two of the many legal plans. On \`[2, 1, 1, 2]\` it gives 3; on \`[10, 1, 1, 10]\` it gives 11; the real answers are 4 and 20, both by robbing the first and last houses and skipping two in the middle (Example 1).

### Recovering which houses were robbed

📌 **Interview term: Reconstruction (backtracking through the table)** — walking back from the final DP cell, at each step asking which choice produced this value, to rebuild the actual solution and not just its value.

Start at \`i = n\`. If \`best[i] == best[i - 1]\`, house \`i - 1\` was not needed — move to \`i - 1\`. Otherwise house \`i - 1\` was robbed — record it and jump to \`i - 2\` (its neighbour cannot be robbed). This needs the full table, so it costs O(n) space. Example 1 prints the houses this way: \`[0, 2, 4]\` for \`[2, 7, 9, 3, 1]\`.

### The circular street (House Robber II)

If the houses stand in a circle, house 0 and house n - 1 are neighbours. Any valid plan leaves out at least one of them, so the best plan is the better of:

- the line problem on houses \`0 .. n - 2\` (house n - 1 excluded), and
- the line problem on houses \`1 .. n - 1\` (house 0 excluded).

One house alone is a special case (\`n == 1\` returns \`nums[0]\`, because both ranges would be empty).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Circular street 2, 3, 2 split into two lines: houses 0 to n minus 2, and houses 1 to n minus 1">
  <rect class="d-box-accent" x="20" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="60" y="57" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="120" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="160" y="57" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="260" y="57" text-anchor="middle">2</text>
  <text class="d-sub" x="160" y="104" text-anchor="middle">line 1: drop the last house</text>
  <text class="d-sub" x="160" y="124" text-anchor="middle">best 3</text>
  <rect class="d-box-muted" x="400" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="440" y="57" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="500" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="540" y="57" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="600" y="30" width="80" height="44" rx="6"/>
  <text class="d-text" x="640" y="57" text-anchor="middle">2</text>
  <text class="d-sub" x="540" y="104" text-anchor="middle">line 2: drop the first house</text>
  <text class="d-sub" x="540" y="124" text-anchor="middle">best 3</text>
  <rect class="d-box" x="250" y="160" width="200" height="44" rx="8"/>
  <text class="d-text" x="350" y="187" text-anchor="middle">circle answer: max = 3</text>
</svg>

On the line \`[2, 3, 2]\` the answer is 4 (both 2s), but on the circle those two 2s are neighbours, so the answer drops to 3. Example 2 prints this, plus \`[200, 3, 140, 20, 10]\`: 350 on a line (200 + 140 + 10) but 340 on a circle, where 200 and 10 become neighbours.

## 5. The C++ Code, Line by Line

The answer to give — two variables:

~~~cpp
int rob(const std::vector<int>& nums) {
    int prev = 0, cur = 0;                        // best up to house i - 2, best up to house i - 1
    for (int x : nums) {
        int next = std::max(cur, prev + x);       // skip house i, or rob it
        prev = cur;
        cur = next;
    }
    return cur;
}
~~~

The table version, returning the total and the houses together:

~~~cpp
std::pair<int, std::vector<int>> robWithHouses(const std::vector<int>& nums) {
    int n = static_cast<int>(nums.size());
    std::vector<int> dp(n + 1, 0);                // dp[i] = best using the first i houses
    for (int i = 1; i <= n; i++) {
        dp[i] = std::max(dp[i - 1], (i >= 2 ? dp[i - 2] : 0) + nums[i - 1]);
    }
    std::vector<int> houses;
    int i = n;
    while (i >= 1) {
        if (dp[i] == dp[i - 1]) {
            i -= 1;                               // house i - 1 was not needed
        } else {
            houses.push_back(i - 1);              // house i - 1 was robbed: jump over its neighbour
            i -= 2;
        }
    }
    std::reverse(houses.begin(), houses.end());
    return {dp[n], houses};
}
~~~

What each C++ piece is doing:

- **\`const std::vector<int>&\`** — pass by const reference, so the street is not copied on every call.
- **\`static_cast<int>(nums.size())\`** — \`size()\` is unsigned (\`size_t\`). Writing \`nums.size() - 2\` on a vector with fewer than 2 elements wraps to a huge number instead of going negative, a classic C++ bug; converting to \`int\` once avoids it.
- **\`(i >= 2 ? dp[i - 2] : 0)\`** — \`dp[-1]\` would be out-of-bounds access, which is undefined behaviour (no exception, possibly a garbage value).
- **\`auto [best, houses] = robWithHouses(nums);\`** — C++17 structured bindings unpack the \`std::pair\` at the call site (Example 1).
- **\`std::max(cur, prev + x)\`** — both arguments must have the same type; \`std::max(cur, 5L)\` would not compile with an \`int\` and a \`long\`.
- **Overflow.** Use \`long long\` totals if amounts can be large; signed \`int\` overflow is undefined behaviour.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (g++ 13). The same programs in the other three languages print exactly the same lines.

**Example 1 — House robber with the robbed houses recovered, against the every-other-house guess** printed:

~~~text
rob([1, 2, 3, 1]) = 4, houses [0, 2] (sum 4) | every-other-house guess 4
rob([2, 7, 9, 3, 1]) = 12, houses [0, 2, 4] (sum 12) | every-other-house guess 12
rob([2, 1, 1, 2]) = 4, houses [0, 3] (sum 4) | every-other-house guess 3
rob([10, 1, 1, 10]) = 20, houses [0, 3] (sum 20) | every-other-house guess 11
rob([5]) = 5, houses [0] (sum 5) | every-other-house guess 5
rob([]) = 0, houses [] (sum 0) | every-other-house guess 0
~~~

**Example 2 — The circular street (House Robber II) and a brute-force check on 300 random streets** printed:

~~~text
circle [2, 3, 2]: 3 (line answer 4)
circle [1, 2, 3, 1]: 4 (line answer 4)
circle [1, 2, 3]: 3 (line answer 4)
circle [200, 3, 140, 20, 10]: 340 (line answer 350)
circle [7]: 7 (line answer 7)
dp matches brute force on 300 of 300 random streets (349564 subsets checked)
~~~

In Example 1 the every-other-house guess is right on the first two streets and wrong on \`[2, 1, 1, 2]\` (3 vs 4) and \`[10, 1, 1, 10]\` (11 vs 20). In Example 2 the circle answer is lower than the line answer exactly when the line plan robs both ends, and the DP matches a brute force over every subset on all 300 random streets. The random streets come from a small Park–Miller generator written into each program, so all four languages test identical inputs.

## 7. Complexity

| Version | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute force over subsets | O(2ⁿ · n) | O(1) | Every subset, n work to check and sum it |
| Memoized recursion | O(n) | O(n) | n states, O(1) each, plus the recursion stack |
| Table | O(n) | O(n) | One pass; needed to recover the houses |
| Two variables | O(n) | O(1) | Only \`best[i - 1]\` and \`best[i - 2]\` are read |
| Circular street | O(n) | O(1) | Two line passes of n - 1 houses each |

## 8. Edge Cases

- **Empty street** — 0. The loop versions return 0 with no special case; code that starts with \`nums[0]\` must check first.
- **One house** — rob it. For the circle this must be special-cased: both sub-ranges are empty.
- **Two houses** — the larger one.
- **Zeros and ties** — houses worth 0, or two plans with equal totals: the best value is unique but the chosen houses may not be; the reconstruction above prefers skipping when both choices tie.
- **Skipping two in a row** — \`[2, 1, 1, 2]\` and \`[10, 1, 1, 10]\` need it; the recurrence allows it automatically.
- **Circle with n = 2 or 3** — at most one house can be robbed, and the two-range split gives that.

## Common Pitfalls

- **"Rob every other house."** Wrong on \`[2, 1, 1, 2]\` (3 instead of 4).
- **\`dp[i - 2]\` at \`i = 1\`.** \`dp[-1]\` is undefined behaviour — no exception, maybe garbage; guard it.
- **Unsigned \`size()\` arithmetic.** \`nums.size() - 2\` on a one-element vector wraps to a huge number; convert to \`int\` first.
- **Circle with one house.** Both ranges are empty and the answer is 0; special-case \`n == 1\`.
- **Shifting without a temporary** reads the new \`prev\`.
- **Signed overflow** for large amounts is undefined behaviour; use \`long long\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Recurrence:</strong> <span style="color:#f0e2c8;">At each house I either skip it and keep the best so far, or rob it and add its cash to the best from two houses back: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best[i] = max(best[i - 1], best[i - 2] + nums[i - 1])</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Every valid plan either uses house i or not; both cases are considered, and each uses the optimal answer for the smaller street.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Code:</strong> <span style="color:#f0e2c8;">Two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> variables and a temporary with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::max</code>, O(n) time and O(1) space; an empty vector returns 0 naturally.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Greedy fails:</strong> <span style="color:#f0e2c8;">Every other house gives 3 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 1, 1, 2]</code>; the answer is 4, robbing the ends and skipping two in the middle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Variants:</strong> <span style="color:#f0e2c8;">To list the houses I keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt;</code> table and walk back; for a circle I take the max of two line passes, special-casing one house.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return which houses were robbed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp</code>, walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i = n</code>, push robbed indices, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::reverse</code>. I return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::pair&lt;int, std::vector&lt;int&gt;&gt;</code> and unpack with a structured binding.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The houses are in a circle. What changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run the line helper on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0..n-2</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1..n-1</code> with index bounds and take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::max</code>; return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[0]</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n == 1</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why cast <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">size()</code> to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is unsigned, so expressions like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums.size() - 2</code> wrap to a huge value on short vectors instead of going negative.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did you check it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Against a bitmask brute force over all subsets; it matched on 300 random streets.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about houses on a tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return a pair of values per node, robbed and not robbed, from a post-order walk.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State** | best[i] = most money from the first i houses with no two neighbours robbed |
| **Recurrence (take-or-skip)** | best[i] = max(best[i - 1], best[i - 2] + nums[i - 1]) |
| **Base case** | best[0] = 0, and best[-1] treated as 0 |
| **Optimal substructure** | The best plan for i houses contains the best plan for the smaller street it builds on |
| **Rolling variables** | Keep only the two previous best values, O(1) space |
| **Reconstruction (backtracking through the table)** | Walk back from the last cell to recover which houses were robbed |

---
**Conclusion:** House robber is a take-or-skip DP: at each house, the best total is the larger of skipping it (\`best[i - 1]\`) and robbing it (\`best[i - 2] + nums[i]\`). In C++ it is a loop over a \`const std::vector<int>&\` with two variables — O(n) time, O(1) space — and greedy shortcuts fail on \`[2, 1, 1, 2]\`. Watch unsigned \`size()\` arithmetic and signed overflow, keep the table when you need the houses, and handle a circular street as two line problems.`,
        examples: [
          {
            label: "House robber with the robbed houses recovered, against the every-other-house guess",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

int rob(const std::vector<int>& nums) {
    // best total with no two adjacent houses, in O(1) extra space
    int prev = 0, cur = 0;                        // best up to house i - 2, best up to house i - 1
    for (int x : nums) {
        int next = std::max(cur, prev + x);       // skip house i, or rob it
        prev = cur;
        cur = next;
    }
    return cur;
}

std::pair<int, std::vector<int>> robWithHouses(const std::vector<int>& nums) {
    // full table, then walk it backwards to recover which houses were robbed
    int n = static_cast<int>(nums.size());
    std::vector<int> dp(n + 1, 0);                // dp[i] = best using the first i houses
    for (int i = 1; i <= n; i++) {
        dp[i] = std::max(dp[i - 1], (i >= 2 ? dp[i - 2] : 0) + nums[i - 1]);
    }
    std::vector<int> houses;
    int i = n;
    while (i >= 1) {
        if (dp[i] == dp[i - 1]) {
            i -= 1;                               // house i - 1 was not needed
        } else {
            houses.push_back(i - 1);              // house i - 1 was robbed: jump over its neighbour
            i -= 2;
        }
    }
    std::reverse(houses.begin(), houses.end());
    return {dp[n], houses};
}

int alternatingGuess(const std::vector<int>& nums) {
    // the tempting wrong idea: rob every other house, pick the better half
    int even = 0, odd = 0;
    for (size_t i = 0; i < nums.size(); i++) {
        if (i % 2 == 0) even += nums[i]; else odd += nums[i];
    }
    return std::max(even, odd);
}

std::string fmt(const std::vector<int>& v) {
    std::string s = "[";
    for (size_t i = 0; i < v.size(); i++) s += (i ? ", " : "") + std::to_string(v[i]);
    return s + "]";
}

int main() {
    std::vector<std::vector<int>> streets = {{1, 2, 3, 1}, {2, 7, 9, 3, 1}, {2, 1, 1, 2}, {10, 1, 1, 10}, {5}, {}};
    for (const auto& nums : streets) {
        auto [best, houses] = robWithHouses(nums);  // C++17 structured binding
        std::cout << "rob(" << fmt(nums) << ") = " << rob(nums) << ", houses " << fmt(houses)
                  << " (sum " << best << ") | every-other-house guess " << alternatingGuess(nums) << "\\n";
    }
    return 0;
}
`,
          },
          {
            label: "The circular street (House Robber II) and a brute-force check on 300 random streets",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

int robLine(const std::vector<int>& nums, int lo, int hi) {
    // house robber on nums[lo..hi] (inclusive), O(1) space
    int prev = 0, cur = 0;
    for (int i = lo; i <= hi; i++) {
        int next = std::max(cur, prev + nums[i]);
        prev = cur;
        cur = next;
    }
    return cur;
}

int robCircle(const std::vector<int>& nums) {
    // first and last house are neighbours: they cannot both be robbed
    int n = static_cast<int>(nums.size());
    if (n == 1) return nums[0];
    return std::max(robLine(nums, 0, n - 2), robLine(nums, 1, n - 1));
}

int bruteForce(const std::vector<int>& nums, bool circle) {
    // try every subset of houses (2^n of them) and keep the legal ones
    int n = static_cast<int>(nums.size()), best = 0;
    for (int mask = 0; mask < (1 << n); mask++) {
        if (mask & (mask >> 1)) continue;         // two adjacent houses in the subset
        if (circle && n > 1 && (mask & 1) && ((mask >> (n - 1)) & 1)) continue;  // first and last both chosen
        int total = 0;
        for (int i = 0; i < n; i++) if ((mask >> i) & 1) total += nums[i];
        best = std::max(best, total);
    }
    return best;
}

long long seed = 2026;

int nextRand(int limit) {
    // Park-Miller generator, so all four languages see the same streets
    seed = seed * 48271 % 2147483647;             // long long: the product does not fit in an int
    return static_cast<int>(seed % limit);
}

std::string fmt(const std::vector<int>& v) {
    std::string s = "[";
    for (size_t i = 0; i < v.size(); i++) s += (i ? ", " : "") + std::to_string(v[i]);
    return s + "]";
}

int main() {
    std::vector<std::vector<int>> samples = {{2, 3, 2}, {1, 2, 3, 1}, {1, 2, 3}, {200, 3, 140, 20, 10}, {7}};
    for (const auto& nums : samples) {
        std::cout << "circle " << fmt(nums) << ": " << robCircle(nums)
                  << " (line answer " << robLine(nums, 0, static_cast<int>(nums.size()) - 1) << ")\\n";
    }
    int agree = 0;
    long long subsets = 0;
    for (int t = 0; t < 300; t++) {
        int n = 1 + nextRand(12);
        std::vector<int> nums(n);
        for (int k = 0; k < n; k++) nums[k] = nextRand(21);   // in order: k = 0, 1, 2, ...
        subsets += 2LL * (1 << n);
        if (robLine(nums, 0, n - 1) == bruteForce(nums, false) && robCircle(nums) == bruteForce(nums, true)) agree++;
    }
    std::cout << "dp matches brute force on " << agree << " of 300 random streets (" << subsets << " subsets checked)\\n";
    return 0;
}
`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you find the maximum subarray sum?",
    difficulty: "medium",
    seoDescription: "Maximum subarray sum with Kadane's algorithm in Python, JavaScript, Java and C++: O(n) time, indices, the all-negative trap and verified runs.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given an integer array, find the contiguous subarray with the largest sum and return that sum. Code it in Python. What if every number is negative? Can you also return where the subarray starts and ends?"

**What a strong answer should cover:**
- The state "best sum of a subarray ending here" and the update \`cur = max(x, cur + x)\`, \`best = max(best, cur)\` — Kadane, O(n) time, O(1) space.
- Why a negative running sum should be dropped, and that the two forms (restart if \`cur < 0\` / \`max(x, cur + x)\`) are the same rule.
- Initialising from the first element so all-negative arrays return their largest element, not 0.
- The brute-force baselines (O(n³), O(n²)) and the prefix-sum view; tracking start and end indices.
- Python specifics: starting from \`nums[0]\` rather than 0 or \`float("-inf")\`, \`IndexError\` on an empty list, slicing being end-exclusive for returning the subarray, and \`int\` never overflowing.

**Clarifying questions expected:**
- "Must the subarray be non-empty, and what should an empty input return?"
- "Do you want the sum only, or the indices too?"

**Code / implementation expected:** Yes — a one-pass Python function, with indices as a follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know arrays and loops.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A lemonade stand keeps a notebook of each day's profit or loss: \`-2, 1, -3, 4, -1, 2, 1, -5, 4\`. At the end of the summer the owner asks: "Which run of **consecutive** days made the most money?" She cannot pick and choose single good days — she wants a stretch, from some start day to some end day, because she is deciding when to open next year.

Checking every possible stretch works, but a summer has 90 days and there are thousands of stretches. There is a much smarter way, and it is something she can do in her head while reading the notebook once from top to bottom: keep a running total of "the current stretch"; whenever that running total drops below zero, **throw it away and start fresh tomorrow**, because a stretch that starts in debt can only make any future stretch worse. Keep a note of the best total seen so far.

That one-pass trick is **Kadane's algorithm**. It is one of the most-asked array questions because it rewards exactly the insight interviewers look for: replacing "try every start and end" with "what is the best answer that ends **here**?" — the same idea as [house robber](/interview-question/how-do-you-solve-the-house-robber-problem), dressed differently.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must the subarray be non-empty? | Usually yes. Then an all-negative array returns its largest element (\`[-3, -1, -2]\` → -1). If an empty subarray is allowed, the answer is never below 0. This decides how \`best\` is initialised. |
| Do you want just the sum, or the start and end indices? | Indices need two extra variables; Example 1 tracks them. |
| Can the array be empty? | Then "non-empty subarray" has no answer: return a sentinel, raise, or ask. |
| How large are the values and the length? | The sum of up to n values can overflow 32-bit integers (see the language notes). |
| Is the array circular (can a subarray wrap around the end)? | A different, well-known variant; covered under Variants. |

## 3. The Core Idea: the Best Subarray Ending Here

📌 **Interview term: Subarray** — a contiguous, non-empty slice \`nums[i..j]\`. (A *subsequence* may skip elements; a subarray may not.)

Every subarray ends somewhere. So instead of asking "what is the best subarray?", ask, for each index \`j\`, "what is the best subarray that **ends exactly at \`j\`**?" — and take the largest of those n answers.

📌 **Interview term: State — best sum ending here** — \`cur[j]\` = the largest sum of a subarray that ends at index \`j\`.

How does \`cur[j]\` relate to \`cur[j - 1]\`? A subarray ending at \`j\` is either just \`[nums[j]]\`, or it is a subarray ending at \`j - 1\` extended by \`nums[j]\` — and if we extend, we should extend the **best** one. So:

\`cur[j] = max(nums[j], cur[j - 1] + nums[j])\`

That \`max\` has a plain-language reading: **if the running sum so far is negative, drop it and start fresh at \`nums[j]\`; otherwise keep extending.** The answer is \`best = max(cur[0], cur[1], …, cur[n - 1])\`, kept as we go.

📌 **Interview term: Kadane's algorithm** — the one-pass O(n) time, O(1) space method above: keep \`cur\` (best sum ending here) and \`best\` (best seen anywhere). It is a dynamic program whose table has only one live entry. Jon Bentley's 1984 *Programming Pearls* column in Communications of the ACM presented four algorithms for this problem — O(n³), O(n²), O(n log n) and O(n) — and credits the linear one to Jay Kadane ([history and sources](https://scm.iis.sinica.edu.tw/home/2010/maximum-segment-sum-origin-and-derivation/)). The proof that it is correct, and the O(n log n) divide-and-conquer method, are on [Kadane vs divide-and-conquer — proof of correctness](/interview-question/maximum-subarray-kadane-vs-divide-and-conquer-proof-of-correctness).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Array -2 1 -3 4 -1 2 1 -5 4 with cur values -2 1 -2 4 3 5 6 1 5 and best values -2 1 1 4 4 5 6 6 6. The subarray 4 -1 2 1 is highlighted">
  <text class="d-sub" x="40" y="62" text-anchor="middle">nums</text>
  <text class="d-sub" x="40" y="132" text-anchor="middle">cur</text>
  <text class="d-sub" x="40" y="202" text-anchor="middle">best</text>
  <rect class="d-box" x="80" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="112" y="63" text-anchor="middle">-2</text>
  <rect class="d-box" x="154" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="186" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="228" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="260" y="63" text-anchor="middle">-3</text>
  <rect class="d-box-accent" x="302" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="334" y="63" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="376" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="408" y="63" text-anchor="middle">-1</text>
  <rect class="d-box-accent" x="450" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="482" y="63" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="524" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="556" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="598" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="630" y="63" text-anchor="middle">-5</text>
  <rect class="d-box" x="672" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="704" y="63" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="80" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="112" y="133" text-anchor="middle">-2</text>
  <rect class="d-box-muted" x="154" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="186" y="133" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="228" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="260" y="133" text-anchor="middle">-2</text>
  <rect class="d-box-muted" x="302" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="334" y="133" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="376" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="408" y="133" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="450" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="482" y="133" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="524" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="556" y="133" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="598" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="630" y="133" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="672" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="704" y="133" text-anchor="middle">5</text>
  <rect class="d-box" x="80" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="112" y="203" text-anchor="middle">-2</text>
  <rect class="d-box" x="154" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="186" y="203" text-anchor="middle">1</text>
  <rect class="d-box" x="228" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="260" y="203" text-anchor="middle">1</text>
  <rect class="d-box" x="302" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="334" y="203" text-anchor="middle">4</text>
  <rect class="d-box" x="376" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="408" y="203" text-anchor="middle">4</text>
  <rect class="d-box" x="450" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="482" y="203" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="524" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="556" y="203" text-anchor="middle">6</text>
  <rect class="d-box" x="598" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="630" y="203" text-anchor="middle">6</text>
  <rect class="d-box" x="672" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="704" y="203" text-anchor="middle">6</text>
</svg>

Read the middle row: at index 1, \`cur\` was -2 (negative), so it restarts at 1. At index 2 it extends to -2. At index 3 it is negative again, so it restarts at 4 — that restart is the start of the winning subarray \`[4, -1, 2, 1]\` (highlighted), whose sum 6 appears in the bottom row at index 6 and is never beaten.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="Decision at each element: if cur is negative restart at x, otherwise extend cur by x; then best becomes the max of best and cur">
  <defs>
    <marker id="b27q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="250" y="20" width="180" height="46" rx="10"/>
  <text class="d-text" x="340" y="48" text-anchor="middle">is cur below 0?</text>
  <path class="d-edge" d="M 290 68 L 160 116" marker-end="url(#b27q4-arrow)"/>
  <path class="d-edge" d="M 390 68 L 520 116" marker-end="url(#b27q4-arrow)"/>
  <text class="d-sub" x="196" y="86" text-anchor="middle">yes</text>
  <text class="d-sub" x="486" y="86" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="40" y="120" width="220" height="46" rx="10"/>
  <text class="d-text" x="150" y="148" text-anchor="middle">restart: cur = x</text>
  <rect class="d-box" x="420" y="120" width="220" height="46" rx="10"/>
  <text class="d-text" x="530" y="148" text-anchor="middle">extend: cur = cur + x</text>
  <text class="d-sub" x="340" y="196" text-anchor="middle">then best = max(best, cur)</text>
</svg>

\`max(x, cur + x)\` and "restart if \`cur < 0\`" are the same rule: \`cur + x < x\` exactly when \`cur < 0\`.

📌 **Interview term: Prefix sum view** — let \`P[k]\` be the sum of the first \`k\` elements. Then \`sum(nums[i..j]) = P[j + 1] - P[i]\`, so the best subarray ending at \`j\` subtracts the **smallest** earlier prefix. Keeping a running minimum prefix gives another O(n) algorithm; Example 2 runs it alongside Kadane and they always agree. See the [prefix sum technique](/interview-question/what-is-the-prefix-sum-technique).

## 4. From Brute Force to O(n)

| Approach | Idea | Time | Space |
| :--- | :--- | :--- | :--- |
| Cubic brute force | For every \`(i, j)\`, add \`nums[i..j]\` from scratch | O(n³) | O(1) |
| Quadratic | Fix \`i\`, extend \`j\` while keeping a running sum | O(n²) | O(1) |
| Divide and conquer | Best of left half, right half, or crossing the middle | O(n log n) | O(log n) stack |
| Prefix sums + running min | \`P[j + 1] - min(P[0..j])\` | O(n) | O(1) |
| **Kadane** | Best sum ending here, best anywhere | **O(n)** | **O(1)** |

Example 2 counts additions on the same random arrays: at n = 300 the cubic method does 4,545,100, the quadratic one 45,150, and both linear methods 300 — and all four return the same answer. Every element must be read at least once (any one of them could change the answer), so O(n) is optimal. The divide-and-conquer method is explained, with its proof, on the [Kadane vs divide-and-conquer](/interview-question/maximum-subarray-kadane-vs-divide-and-conquer-proof-of-correctness) page.

### Tracking where the best subarray is

To return indices, remember where the current run started (\`start\`), and when \`cur\` beats \`best\`, copy that start and the current index into \`best_start\` / \`best_end\`. Restarting sets \`start = j\`. Example 1 prints \`[4, -1, 2, 1] at [3..6]\` for the classic input.

### The all-negative trap

A common "simplified" Kadane starts with \`cur = best = 0\` and clamps with \`cur = max(0, cur + x)\`. That computes the best sum when an **empty** subarray is allowed. For \`[-3, -1, -2]\` it returns 0 — but no non-empty subarray sums to 0; the right answer is -1. Example 1 prints both: the buggy version agrees on mixed inputs and is wrong on every all-negative one. Initialise from the first element instead.

## 5. The Python Code, Line by Line

~~~python
def max_subarray(nums):
    best = cur = nums[0]                  # start from the first element, NOT from 0
    start = best_start = best_end = 0
    for i in range(1, len(nums)):
        if cur < 0:                       # a negative running sum only hurts: restart here
            cur, start = nums[i], i
        else:                             # otherwise extend the current run
            cur += nums[i]
        if cur > best:
            best, best_start, best_end = cur, start, i
    return best, best_start, best_end
~~~

If only the sum is needed, the core is three lines:

~~~python
best = cur = nums[0]
for x in nums[1:]:
    cur = max(x, cur + x)
    best = max(best, cur)
~~~

What each Python piece is doing:

- **\`best = cur = nums[0]\`** — chained assignment binds both names to the first element. Starting from \`nums[0]\` (not 0 and not \`float("-inf")\`) handles all-negative input and keeps everything an \`int\`.
- **\`for i in range(1, len(nums))\`** — index-based because we need \`start\` and \`i\` for the indices. \`nums[1:]\` in the short version creates a copy of the list (O(n) extra memory); \`for x in itertools.islice(nums, 1, None)\` avoids the copy if that matters.
- **\`if cur > best\`** — strict \`>\` keeps the **earliest** best subarray on ties; \`>=\` would keep the latest.
- **\`nums[s:e + 1]\`** — slicing is end-exclusive, so \`+ 1\` includes the last element when printing the subarray.
- **Empty input.** \`nums[0]\` raises \`IndexError\` on \`[]\`. Decide with the interviewer: raise a \`ValueError\`, or return \`None\`. (Python's own \`max([])\` raises \`ValueError: max() iterable argument is empty\`, and \`max([], default=0)\` returns 0 — useful only when the empty subarray is allowed.)
- **No overflow.** Python \`int\` is arbitrary precision, so sums of huge values are exact.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`python3 main.py\` (Python 3.13). The same programs in the other three languages print exactly the same lines.

**Example 1 — Kadane with the winning subarray and its indices, against the start-at-zero bug** printed:

~~~text
[-2, 1, -3, 4, -1, 2, 1, -5, 4] -> 6, subarray [4, -1, 2, 1] at [3..6] | start-at-0 version says 6
[1] -> 1, subarray [1] at [0..0] | start-at-0 version says 1
[5, 4, -1, 7, 8] -> 23, subarray [5, 4, -1, 7, 8] at [0..4] | start-at-0 version says 23
[-3, -1, -2] -> -1, subarray [-1] at [1..1] | start-at-0 version says 0
[-2, -1] -> -1, subarray [-1] at [1..1] | start-at-0 version says 0
[0, -3, 0] -> 0, subarray [0] at [0..0] | start-at-0 version says 0
~~~

**Example 2 — Four methods side by side: O(n^3), O(n^2), prefix sums and Kadane, with addition counts** printed:

~~~text
n=10: cubic 220 additions | quadratic 55 | prefix sums 10 | kadane 10 | best 65, all agree: true
n=100: cubic 171700 additions | quadratic 5050 | prefix sums 100 | kadane 100 | best 213, all agree: true
n=300: cubic 4545100 additions | quadratic 45150 | prefix sums 300 | kadane 300 | best 642, all agree: true
all four methods agree on 500 of 500 random arrays
~~~

Example 1 shows the start-at-zero version agreeing on mixed arrays and returning 0 on every all-negative one (\`[-3, -1, -2]\`, \`[-2, -1]\`), where the correct answer is -1. Example 2 runs the four methods on the same arrays (from a Park–Miller generator built into each program, so every language sees identical inputs): the addition counts match the formulas n(n + 1)(n + 2)/6, n(n + 1)/2 and n, and the answers agree on all 500 random arrays.

## 7. Variants Interviewers Ask Next

- **Return the subarray** — track \`start\`, \`best_start\`, \`best_end\` (Example 1).
- **Empty subarray allowed** — then the answer is \`max(0, kadane)\`, which is exactly what the start-at-0 version computes.
- **Circular array** — a subarray may wrap from the end to the start. The best wrapping subarray is "everything except a minimum subarray in the middle", so the answer is \`max(kadane_max, total - kadane_min)\`; if every element is negative, \`total - kadane_min\` would describe the empty subarray, so return \`kadane_max\` in that case.
- **Maximum product subarray** — products flip sign with negatives, so you track both the largest and the smallest product ending here. That is its own question: [maximum product subarray](/interview-question/how-do-you-find-the-maximum-product-subarray).
- **Count or find subarrays with a given sum** — a different tool (prefix sums plus a hash map): [subarrays that sum to k](/interview-question/how-do-you-count-subarrays-that-sum-to-k).
- **2D maximum-sum rectangle** — fix a pair of rows, collapse the columns between them into a 1D array of sums, and run Kadane on it: O(rows² × cols).

## 8. Complexity

| Method | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Cubic | O(n³) | O(1) | n(n + 1)(n + 2)/6 additions: 4,545,100 for n = 300 |
| Quadratic | O(n²) | O(1) | n(n + 1)/2 additions: 45,150 for n = 300 |
| Prefix sums + running min | O(n) | O(1) | One pass, one running minimum |
| Kadane | O(n) | O(1) | One pass, two variables (four with indices) |

## 9. Edge Cases

- **Single element** — that element, even if negative (\`[1]\` → 1).
- **All negative** — the largest element (\`[-3, -1, -2]\` → -1, \`[-2, -1]\` → -1), never 0.
- **All positive** — the whole array (\`[5, 4, -1, 7, 8]\` → 23 includes the -1, because 9 + 7 + 8 beats any piece).
- **Zeros** — \`[0, -3, 0]\` → 0; with strict \`>\` the first 0 is reported.
- **Empty array** — undefined for the non-empty version; agree on behaviour first.
- **Large values** — overflow in fixed-width languages; see the language notes above.

## Common Pitfalls

- **Starting \`best\` at 0.** Returns 0 for all-negative input (Example 1); start from \`nums[0]\`.
- **Using \`float("-inf")\` and then returning it** for an empty list — and turning an \`int\` answer into a float in some code paths.
- **Confusing subarray and subsequence.** The best subsequence is just the sum of the positive numbers — a different, easier problem.
- **Resetting \`cur\` to 0 instead of to \`nums[i]\`.** With non-empty subarrays the restart value is the current element.
- **Updating \`best\` before \`cur\`.** Then \`best\` lags one element behind and misses a best subarray that ends at the last index.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key idea:</strong> <span style="color:#f0e2c8;">Every subarray ends somewhere, so I track the best sum ending at each index: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur = max(x, cur + x)</code>. A negative running sum can only hurt, so I restart.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> is the max of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur</code> over all positions; one pass, O(n) time, O(1) space. That is Kadane's algorithm.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Initialisation:</strong> <span style="color:#f0e2c8;">I start <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best = cur = nums[0]</code>, not 0, so an all-negative list returns its largest element: -1 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-3, -1, -2]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Brute force for contrast:</strong> <span style="color:#f0e2c8;">Trying every start and end is O(n²) with a running sum, O(n³) without; at n = 300 that is 45,150 or 4,545,100 additions against 300.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Extras:</strong> <span style="color:#f0e2c8;">I can track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best_start</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best_end</code> to return the subarray, and Python ints never overflow, so large sums are safe.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The best subarray ending at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> is either <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[x]</code> or the best ending at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j - 1</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur</code> is always exactly that optimum; the overall answer ends somewhere, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> saw it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if an empty subarray is allowed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then the answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(0, kadane)</code>, which is what the start-at-0 version computes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a circular array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(max_sub, total - min_sub)</code>, where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min_sub</code> is Kadane with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min</code>; if all values are negative return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_sub</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it with prefix sums?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sum(i..j) = P[j + 1] - P[i]</code>, so keep the minimum prefix seen so far and maximise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">P - min_prefix</code>; also O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the divide-and-conquer version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Best of left half, right half, or crossing the middle, O(n log n). It matters because its four-value form extends to segment trees for range queries.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subarray** | A contiguous, non-empty slice nums[i..j]; unlike a subsequence it cannot skip elements |
| **State — best sum ending here** | cur[j] = largest sum of a subarray that ends exactly at index j |
| **Kadane's algorithm** | One pass keeping cur = max(x, cur + x) and best = max(best, cur); O(n) time, O(1) space |
| **Prefix sum view** | sum(i..j) = P[j + 1] - P[i]; maximise by subtracting the smallest earlier prefix |

---
**Conclusion:** The maximum subarray sum is found in one pass by keeping the best sum that ends at the current index (\`cur = max(x, cur + x)\`) and the best seen anywhere (\`best\`). Start both from \`nums[0]\` so all-negative lists are handled, track a start index if the subarray itself is needed, and remember that Python ints cannot overflow. Kadane is O(n) time and O(1) space, against O(n²) and O(n³) for the brute forces; its correctness proof and the divide-and-conquer alternative are on the companion page.`,
        examples: [
          {
            label: "Kadane with the winning subarray and its indices, against the start-at-zero bug",
            code: `def max_subarray(nums):
    """Kadane: returns (best sum, start, end) for a non-empty list."""
    best = cur = nums[0]                  # start from the first element, NOT from 0
    start = best_start = best_end = 0
    for i in range(1, len(nums)):
        if cur < 0:                       # a negative running sum only hurts: restart here
            cur, start = nums[i], i
        else:                             # otherwise extend the current run
            cur += nums[i]
        if cur > best:
            best, best_start, best_end = cur, start, i
    return best, best_start, best_end


def buggy_max_subarray(nums):
    """The classic bug: best and cur start at 0, so an all-negative list returns 0."""
    best = cur = 0
    for x in nums:
        cur = max(0, cur + x)
        best = max(best, cur)
    return best


for nums in [[-2, 1, -3, 4, -1, 2, 1, -5, 4], [1], [5, 4, -1, 7, 8], [-3, -1, -2], [-2, -1], [0, -3, 0]]:
    best, s, e = max_subarray(nums)
    print(str(nums) + " -> " + str(best) + ", subarray " + str(nums[s:e + 1]) + " at [" + str(s) + ".." + str(e)
          + "] | start-at-0 version says " + str(buggy_max_subarray(nums)))
`,
          },
          {
            label: "Four methods side by side: O(n^3), O(n^2), prefix sums and Kadane, with addition counts",
            code: `def cubic(nums):
    """Try every (i, j) and add nums[i..j] from scratch: O(n^3)."""
    best, ops = nums[0], 0
    for i in range(len(nums)):
        for j in range(i, len(nums)):
            s = 0
            for k in range(i, j + 1):
                s += nums[k]
                ops += 1
            best = max(best, s)
    return best, ops


def quadratic(nums):
    """Fix the start i, extend j and keep a running sum: O(n^2)."""
    best, ops = nums[0], 0
    for i in range(len(nums)):
        s = 0
        for j in range(i, len(nums)):
            s += nums[j]
            ops += 1
            best = max(best, s)
    return best, ops


def prefix_min(nums):
    """sum(i..j) = prefix[j + 1] - prefix[i]; subtract the smallest earlier prefix: O(n)."""
    best, prefix, smallest, ops = nums[0], 0, 0, 0
    for x in nums:
        prefix += x
        ops += 1
        best = max(best, prefix - smallest)
        smallest = min(smallest, prefix)
    return best, ops


def kadane(nums):
    best = cur = nums[0]
    ops = 1
    for x in nums[1:]:
        cur = max(x, cur + x)             # extend the run or start fresh at x
        best = max(best, cur)
        ops += 1
    return best, ops


seed = 7


def next_rand(limit):
    """Park-Miller generator, so all four languages see the same arrays."""
    global seed
    seed = seed * 48271 % 2147483647
    return seed % limit


def random_array(n):
    return [next_rand(101) - 50 for _ in range(n)]   # values in -50..50


for n in [10, 100, 300]:
    nums = random_array(n)
    results = [cubic(nums), quadratic(nums), prefix_min(nums), kadane(nums)]
    same = len(set(r[0] for r in results)) == 1
    print("n=" + str(n) + ": cubic " + str(results[0][1]) + " additions | quadratic " + str(results[1][1])
          + " | prefix sums " + str(results[2][1]) + " | kadane " + str(results[3][1])
          + " | best " + str(results[3][0]) + ", all agree: " + str(same).lower())

agree = 0
for t in range(500):
    nums = random_array(1 + next_rand(30))
    answers = {cubic(nums)[0], quadratic(nums)[0], prefix_min(nums)[0], kadane(nums)[0]}
    if len(answers) == 1:
        agree += 1
print("all four methods agree on " + str(agree) + " of 500 random arrays")
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an integer array, find the contiguous subarray with the largest sum and return that sum. Code it in JavaScript. What if every number is negative? Can you also return where the subarray starts and ends?"

**What a strong answer should cover:**
- The state "best sum of a subarray ending here" and the update \`cur = max(x, cur + x)\`, \`best = max(best, cur)\` — Kadane, O(n) time, O(1) space.
- Why a negative running sum should be dropped, and that the two forms (restart if \`cur < 0\` / \`max(x, cur + x)\`) are the same rule.
- Initialising from the first element so all-negative arrays return their largest element, not 0.
- The brute-force baselines (O(n³), O(n²)) and the prefix-sum view; tracking start and end indices.
- JavaScript specifics: an empty array silently returning \`undefined\`, avoiding \`Math.max(...bigArray)\`, and \`Number\` precision for very large or fractional sums.

**Clarifying questions expected:**
- "Must the subarray be non-empty, and what should an empty input return?"
- "Do you want the sum only, or the indices too?"

**Code / implementation expected:** Yes — a one-pass JavaScript function, with indices as a follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know arrays and loops.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A lemonade stand keeps a notebook of each day's profit or loss: \`-2, 1, -3, 4, -1, 2, 1, -5, 4\`. At the end of the summer the owner asks: "Which run of **consecutive** days made the most money?" She cannot pick and choose single good days — she wants a stretch, from some start day to some end day, because she is deciding when to open next year.

Checking every possible stretch works, but a summer has 90 days and there are thousands of stretches. There is a much smarter way, and it is something she can do in her head while reading the notebook once from top to bottom: keep a running total of "the current stretch"; whenever that running total drops below zero, **throw it away and start fresh tomorrow**, because a stretch that starts in debt can only make any future stretch worse. Keep a note of the best total seen so far.

That one-pass trick is **Kadane's algorithm**. It is one of the most-asked array questions because it rewards exactly the insight interviewers look for: replacing "try every start and end" with "what is the best answer that ends **here**?" — the same idea as [house robber](/interview-question/how-do-you-solve-the-house-robber-problem), dressed differently.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must the subarray be non-empty? | Usually yes. Then an all-negative array returns its largest element (\`[-3, -1, -2]\` → -1). If an empty subarray is allowed, the answer is never below 0. This decides how \`best\` is initialised. |
| Do you want just the sum, or the start and end indices? | Indices need two extra variables; Example 1 tracks them. |
| Can the array be empty? | Then "non-empty subarray" has no answer: return a sentinel, raise, or ask. |
| How large are the values and the length? | The sum of up to n values can overflow 32-bit integers (see the language notes). |
| Is the array circular (can a subarray wrap around the end)? | A different, well-known variant; covered under Variants. |

## 3. The Core Idea: the Best Subarray Ending Here

📌 **Interview term: Subarray** — a contiguous, non-empty slice \`nums[i..j]\`. (A *subsequence* may skip elements; a subarray may not.)

Every subarray ends somewhere. So instead of asking "what is the best subarray?", ask, for each index \`j\`, "what is the best subarray that **ends exactly at \`j\`**?" — and take the largest of those n answers.

📌 **Interview term: State — best sum ending here** — \`cur[j]\` = the largest sum of a subarray that ends at index \`j\`.

How does \`cur[j]\` relate to \`cur[j - 1]\`? A subarray ending at \`j\` is either just \`[nums[j]]\`, or it is a subarray ending at \`j - 1\` extended by \`nums[j]\` — and if we extend, we should extend the **best** one. So:

\`cur[j] = max(nums[j], cur[j - 1] + nums[j])\`

That \`max\` has a plain-language reading: **if the running sum so far is negative, drop it and start fresh at \`nums[j]\`; otherwise keep extending.** The answer is \`best = max(cur[0], cur[1], …, cur[n - 1])\`, kept as we go.

📌 **Interview term: Kadane's algorithm** — the one-pass O(n) time, O(1) space method above: keep \`cur\` (best sum ending here) and \`best\` (best seen anywhere). It is a dynamic program whose table has only one live entry. Jon Bentley's 1984 *Programming Pearls* column in Communications of the ACM presented four algorithms for this problem — O(n³), O(n²), O(n log n) and O(n) — and credits the linear one to Jay Kadane ([history and sources](https://scm.iis.sinica.edu.tw/home/2010/maximum-segment-sum-origin-and-derivation/)). The proof that it is correct, and the O(n log n) divide-and-conquer method, are on [Kadane vs divide-and-conquer — proof of correctness](/interview-question/maximum-subarray-kadane-vs-divide-and-conquer-proof-of-correctness).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Array -2 1 -3 4 -1 2 1 -5 4 with cur values -2 1 -2 4 3 5 6 1 5 and best values -2 1 1 4 4 5 6 6 6. The subarray 4 -1 2 1 is highlighted">
  <text class="d-sub" x="40" y="62" text-anchor="middle">nums</text>
  <text class="d-sub" x="40" y="132" text-anchor="middle">cur</text>
  <text class="d-sub" x="40" y="202" text-anchor="middle">best</text>
  <rect class="d-box" x="80" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="112" y="63" text-anchor="middle">-2</text>
  <rect class="d-box" x="154" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="186" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="228" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="260" y="63" text-anchor="middle">-3</text>
  <rect class="d-box-accent" x="302" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="334" y="63" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="376" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="408" y="63" text-anchor="middle">-1</text>
  <rect class="d-box-accent" x="450" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="482" y="63" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="524" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="556" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="598" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="630" y="63" text-anchor="middle">-5</text>
  <rect class="d-box" x="672" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="704" y="63" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="80" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="112" y="133" text-anchor="middle">-2</text>
  <rect class="d-box-muted" x="154" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="186" y="133" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="228" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="260" y="133" text-anchor="middle">-2</text>
  <rect class="d-box-muted" x="302" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="334" y="133" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="376" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="408" y="133" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="450" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="482" y="133" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="524" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="556" y="133" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="598" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="630" y="133" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="672" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="704" y="133" text-anchor="middle">5</text>
  <rect class="d-box" x="80" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="112" y="203" text-anchor="middle">-2</text>
  <rect class="d-box" x="154" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="186" y="203" text-anchor="middle">1</text>
  <rect class="d-box" x="228" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="260" y="203" text-anchor="middle">1</text>
  <rect class="d-box" x="302" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="334" y="203" text-anchor="middle">4</text>
  <rect class="d-box" x="376" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="408" y="203" text-anchor="middle">4</text>
  <rect class="d-box" x="450" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="482" y="203" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="524" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="556" y="203" text-anchor="middle">6</text>
  <rect class="d-box" x="598" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="630" y="203" text-anchor="middle">6</text>
  <rect class="d-box" x="672" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="704" y="203" text-anchor="middle">6</text>
</svg>

Read the middle row: at index 1, \`cur\` was -2 (negative), so it restarts at 1. At index 2 it extends to -2. At index 3 it is negative again, so it restarts at 4 — that restart is the start of the winning subarray \`[4, -1, 2, 1]\` (highlighted), whose sum 6 appears in the bottom row at index 6 and is never beaten.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="Decision at each element: if cur is negative restart at x, otherwise extend cur by x; then best becomes the max of best and cur">
  <defs>
    <marker id="b27q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="250" y="20" width="180" height="46" rx="10"/>
  <text class="d-text" x="340" y="48" text-anchor="middle">is cur below 0?</text>
  <path class="d-edge" d="M 290 68 L 160 116" marker-end="url(#b27q4-arrow)"/>
  <path class="d-edge" d="M 390 68 L 520 116" marker-end="url(#b27q4-arrow)"/>
  <text class="d-sub" x="196" y="86" text-anchor="middle">yes</text>
  <text class="d-sub" x="486" y="86" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="40" y="120" width="220" height="46" rx="10"/>
  <text class="d-text" x="150" y="148" text-anchor="middle">restart: cur = x</text>
  <rect class="d-box" x="420" y="120" width="220" height="46" rx="10"/>
  <text class="d-text" x="530" y="148" text-anchor="middle">extend: cur = cur + x</text>
  <text class="d-sub" x="340" y="196" text-anchor="middle">then best = max(best, cur)</text>
</svg>

\`max(x, cur + x)\` and "restart if \`cur < 0\`" are the same rule: \`cur + x < x\` exactly when \`cur < 0\`.

📌 **Interview term: Prefix sum view** — let \`P[k]\` be the sum of the first \`k\` elements. Then \`sum(nums[i..j]) = P[j + 1] - P[i]\`, so the best subarray ending at \`j\` subtracts the **smallest** earlier prefix. Keeping a running minimum prefix gives another O(n) algorithm; Example 2 runs it alongside Kadane and they always agree. See the [prefix sum technique](/interview-question/what-is-the-prefix-sum-technique).

## 4. From Brute Force to O(n)

| Approach | Idea | Time | Space |
| :--- | :--- | :--- | :--- |
| Cubic brute force | For every \`(i, j)\`, add \`nums[i..j]\` from scratch | O(n³) | O(1) |
| Quadratic | Fix \`i\`, extend \`j\` while keeping a running sum | O(n²) | O(1) |
| Divide and conquer | Best of left half, right half, or crossing the middle | O(n log n) | O(log n) stack |
| Prefix sums + running min | \`P[j + 1] - min(P[0..j])\` | O(n) | O(1) |
| **Kadane** | Best sum ending here, best anywhere | **O(n)** | **O(1)** |

Example 2 counts additions on the same random arrays: at n = 300 the cubic method does 4,545,100, the quadratic one 45,150, and both linear methods 300 — and all four return the same answer. Every element must be read at least once (any one of them could change the answer), so O(n) is optimal. The divide-and-conquer method is explained, with its proof, on the [Kadane vs divide-and-conquer](/interview-question/maximum-subarray-kadane-vs-divide-and-conquer-proof-of-correctness) page.

### Tracking where the best subarray is

To return indices, remember where the current run started (\`start\`), and when \`cur\` beats \`best\`, copy that start and the current index into \`best_start\` / \`best_end\`. Restarting sets \`start = j\`. Example 1 prints \`[4, -1, 2, 1] at [3..6]\` for the classic input.

### The all-negative trap

A common "simplified" Kadane starts with \`cur = best = 0\` and clamps with \`cur = max(0, cur + x)\`. That computes the best sum when an **empty** subarray is allowed. For \`[-3, -1, -2]\` it returns 0 — but no non-empty subarray sums to 0; the right answer is -1. Example 1 prints both: the buggy version agrees on mixed inputs and is wrong on every all-negative one. Initialise from the first element instead.

## 5. The JavaScript Code, Line by Line

~~~javascript
function maxSubarray(nums) {
  let best = nums[0], cur = nums[0];     // start from the first element, NOT from 0
  let start = 0, bestStart = 0, bestEnd = 0;
  for (let i = 1; i < nums.length; i++) {
    if (cur < 0) {                       // a negative running sum only hurts: restart here
      cur = nums[i];
      start = i;
    } else {                             // otherwise extend the current run
      cur += nums[i];
    }
    if (cur > best) {
      best = cur;
      bestStart = start;
      bestEnd = i;
    }
  }
  return [best, bestStart, bestEnd];
}
~~~

If only the sum is needed:

~~~javascript
let best = nums[0], cur = nums[0];
for (let i = 1; i < nums.length; i++) {
  cur = Math.max(nums[i], cur + nums[i]);
  best = Math.max(best, cur);
}
~~~

What each JavaScript piece is doing:

- **Initialise from \`nums[0]\`.** On an empty array \`nums[0]\` is \`undefined\`, and every comparison with \`undefined\` is \`false\`, so the function would return \`undefined\` without an error. Check \`nums.length === 0\` first and decide what to return.
- **\`-Infinity\` as a start** also works (\`Math.max(...[])\` is \`-Infinity\` too), but returns \`-Infinity\` for an empty array, which then leaks into later arithmetic. Starting from \`nums[0]\` is clearer.
- **\`Math.max(a, b)\`** with two arguments is cheap. Avoid \`Math.max(...bigArray)\`: spreading a million-element array into arguments threw \`RangeError: Maximum call stack size exceeded\` when this was tried.
- **\`nums.slice(s, e + 1)\`** — end-exclusive, like Python slicing.
- **Numbers.** Sums are exact while they stay below 2^53 - 1 in magnitude; \`[2000000000, 2000000000]\` gives the correct 4000000000 (it was run), because JavaScript has no 32-bit overflow here. Floating-point inputs are another matter: \`0.1 + 0.2\` prints \`0.30000000000000004\`, so compare float sums with a tolerance.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`node main.js\` (Node.js 22; the programs are plain browser-safe scripts, so the page runner prints the same). The same programs in the other three languages print exactly the same lines.

**Example 1 — Kadane with the winning subarray and its indices, against the start-at-zero bug** printed:

~~~text
[-2, 1, -3, 4, -1, 2, 1, -5, 4] -> 6, subarray [4, -1, 2, 1] at [3..6] | start-at-0 version says 6
[1] -> 1, subarray [1] at [0..0] | start-at-0 version says 1
[5, 4, -1, 7, 8] -> 23, subarray [5, 4, -1, 7, 8] at [0..4] | start-at-0 version says 23
[-3, -1, -2] -> -1, subarray [-1] at [1..1] | start-at-0 version says 0
[-2, -1] -> -1, subarray [-1] at [1..1] | start-at-0 version says 0
[0, -3, 0] -> 0, subarray [0] at [0..0] | start-at-0 version says 0
~~~

**Example 2 — Four methods side by side: O(n^3), O(n^2), prefix sums and Kadane, with addition counts** printed:

~~~text
n=10: cubic 220 additions | quadratic 55 | prefix sums 10 | kadane 10 | best 65, all agree: true
n=100: cubic 171700 additions | quadratic 5050 | prefix sums 100 | kadane 100 | best 213, all agree: true
n=300: cubic 4545100 additions | quadratic 45150 | prefix sums 300 | kadane 300 | best 642, all agree: true
all four methods agree on 500 of 500 random arrays
~~~

Example 1 shows the start-at-zero version agreeing on mixed arrays and returning 0 on every all-negative one (\`[-3, -1, -2]\`, \`[-2, -1]\`), where the correct answer is -1. Example 2 runs the four methods on the same arrays (from a Park–Miller generator built into each program, so every language sees identical inputs): the addition counts match the formulas n(n + 1)(n + 2)/6, n(n + 1)/2 and n, and the answers agree on all 500 random arrays.

## 7. Variants Interviewers Ask Next

- **Return the subarray** — track \`start\`, \`best_start\`, \`best_end\` (Example 1).
- **Empty subarray allowed** — then the answer is \`max(0, kadane)\`, which is exactly what the start-at-0 version computes.
- **Circular array** — a subarray may wrap from the end to the start. The best wrapping subarray is "everything except a minimum subarray in the middle", so the answer is \`max(kadane_max, total - kadane_min)\`; if every element is negative, \`total - kadane_min\` would describe the empty subarray, so return \`kadane_max\` in that case.
- **Maximum product subarray** — products flip sign with negatives, so you track both the largest and the smallest product ending here. That is its own question: [maximum product subarray](/interview-question/how-do-you-find-the-maximum-product-subarray).
- **Count or find subarrays with a given sum** — a different tool (prefix sums plus a hash map): [subarrays that sum to k](/interview-question/how-do-you-count-subarrays-that-sum-to-k).
- **2D maximum-sum rectangle** — fix a pair of rows, collapse the columns between them into a 1D array of sums, and run Kadane on it: O(rows² × cols).

## 8. Complexity

| Method | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Cubic | O(n³) | O(1) | n(n + 1)(n + 2)/6 additions: 4,545,100 for n = 300 |
| Quadratic | O(n²) | O(1) | n(n + 1)/2 additions: 45,150 for n = 300 |
| Prefix sums + running min | O(n) | O(1) | One pass, one running minimum |
| Kadane | O(n) | O(1) | One pass, two variables (four with indices) |

## 9. Edge Cases

- **Single element** — that element, even if negative (\`[1]\` → 1).
- **All negative** — the largest element (\`[-3, -1, -2]\` → -1, \`[-2, -1]\` → -1), never 0.
- **All positive** — the whole array (\`[5, 4, -1, 7, 8]\` → 23 includes the -1, because 9 + 7 + 8 beats any piece).
- **Zeros** — \`[0, -3, 0]\` → 0; with strict \`>\` the first 0 is reported.
- **Empty array** — undefined for the non-empty version; agree on behaviour first.
- **Large values** — overflow in fixed-width languages; see the language notes above.

## Common Pitfalls

- **Starting \`best\` at 0.** Returns 0 for all-negative input (Example 1); start from \`nums[0]\`.
- **Empty array returning \`undefined\`** silently; check the length first.
- **\`Math.max(...nums)\`-style one-liners** on huge arrays throw \`RangeError\`.
- **Resetting \`cur\` to 0 instead of \`nums[i]\`.**
- **Updating \`best\` before \`cur\`**, which misses a best subarray ending at the last index.
- **Float inputs compared with \`===\`.** Use a tolerance; \`0.1 + 0.2\` is not \`0.3\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key idea:</strong> <span style="color:#f0e2c8;">Every subarray ends somewhere, so I track the best sum ending at each index: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur = Math.max(x, cur + x)</code>. A negative running sum can only hurt, so I restart.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> is the max of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur</code> over all positions; one pass, O(n) time, O(1) space. That is Kadane's algorithm.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Initialisation:</strong> <span style="color:#f0e2c8;">I start both at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[0]</code>, not 0, so an all-negative array returns its largest element; and I check for an empty array, which would otherwise return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Brute force for contrast:</strong> <span style="color:#f0e2c8;">Every start and end is O(n²) with a running sum, O(n³) without; at n = 300 that is 45,150 or 4,545,100 additions against 300.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Extras:</strong> <span style="color:#f0e2c8;">I can track the start and end indices to return the subarray; integer sums stay exact below 2^53 - 1.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The best subarray ending at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> is either <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[x]</code> or the best ending at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j - 1</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur</code> is always that optimum, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> sees every position.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if an empty subarray is allowed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then the answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max(0, kadane)</code>, which the start-at-0 version computes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a circular array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max(maxSub, total - minSub)</code>, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">minSub</code> from Kadane using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min</code>; if every value is negative return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxSub</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it with prefix sums?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: keep the minimum prefix so far and maximise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix - minPrefix</code>; also O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Math.max(...sums)</code> at the end?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It needs an O(n) array of sums and can throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code> on large inputs; a running <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> is O(1) space.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subarray** | A contiguous, non-empty slice nums[i..j]; unlike a subsequence it cannot skip elements |
| **State — best sum ending here** | cur[j] = largest sum of a subarray that ends exactly at index j |
| **Kadane's algorithm** | One pass keeping cur = max(x, cur + x) and best = max(best, cur); O(n) time, O(1) space |
| **Prefix sum view** | sum(i..j) = P[j + 1] - P[i]; maximise by subtracting the smallest earlier prefix |

---
**Conclusion:** The maximum subarray sum is found in one pass by keeping the best sum that ends at the current index (\`cur = Math.max(x, cur + x)\`) and the best seen anywhere. Start both from \`nums[0]\` (after checking the array is not empty), track a start index if the subarray itself is needed, and keep integer sums below 2^53 - 1. Kadane is O(n) time and O(1) space, against O(n²) and O(n³) for the brute forces; its proof and the divide-and-conquer alternative are on the companion page.`,
        examples: [
          {
            label: "Kadane with the winning subarray and its indices, against the start-at-zero bug",
            code: `function maxSubarray(nums) {
  // Kadane: returns [best sum, start, end] for a non-empty array
  let best = nums[0], cur = nums[0];     // start from the first element, NOT from 0
  let start = 0, bestStart = 0, bestEnd = 0;
  for (let i = 1; i < nums.length; i++) {
    if (cur < 0) {                       // a negative running sum only hurts: restart here
      cur = nums[i];
      start = i;
    } else {                             // otherwise extend the current run
      cur += nums[i];
    }
    if (cur > best) {
      best = cur;
      bestStart = start;
      bestEnd = i;
    }
  }
  return [best, bestStart, bestEnd];
}

function buggyMaxSubarray(nums) {
  // the classic bug: best and cur start at 0, so an all-negative array returns 0
  let best = 0, cur = 0;
  for (const x of nums) {
    cur = Math.max(0, cur + x);
    best = Math.max(best, cur);
  }
  return best;
}

const fmt = (arr) => "[" + arr.join(", ") + "]";

for (const nums of [[-2, 1, -3, 4, -1, 2, 1, -5, 4], [1], [5, 4, -1, 7, 8], [-3, -1, -2], [-2, -1], [0, -3, 0]]) {
  const [best, s, e] = maxSubarray(nums);
  console.log(fmt(nums) + " -> " + best + ", subarray " + fmt(nums.slice(s, e + 1)) + " at [" + s + ".." + e +
    "] | start-at-0 version says " + buggyMaxSubarray(nums));
}
`,
          },
          {
            label: "Four methods side by side: O(n^3), O(n^2), prefix sums and Kadane, with addition counts",
            code: `function cubic(nums) {
  // try every (i, j) and add nums[i..j] from scratch: O(n^3)
  let best = nums[0], ops = 0;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i; j < nums.length; j++) {
      let s = 0;
      for (let k = i; k <= j; k++) {
        s += nums[k];
        ops++;
      }
      best = Math.max(best, s);
    }
  }
  return [best, ops];
}

function quadratic(nums) {
  // fix the start i, extend j and keep a running sum: O(n^2)
  let best = nums[0], ops = 0;
  for (let i = 0; i < nums.length; i++) {
    let s = 0;
    for (let j = i; j < nums.length; j++) {
      s += nums[j];
      ops++;
      best = Math.max(best, s);
    }
  }
  return [best, ops];
}

function prefixMin(nums) {
  // sum(i..j) = prefix[j + 1] - prefix[i]; subtract the smallest earlier prefix: O(n)
  let best = nums[0], prefix = 0, smallest = 0, ops = 0;
  for (const x of nums) {
    prefix += x;
    ops++;
    best = Math.max(best, prefix - smallest);
    smallest = Math.min(smallest, prefix);
  }
  return [best, ops];
}

function kadane(nums) {
  let best = nums[0], cur = nums[0], ops = 1;
  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);  // extend the run or start fresh at nums[i]
    best = Math.max(best, cur);
    ops++;
  }
  return [best, ops];
}

let seed = 7;
function nextRand(limit) {
  // Park-Miller generator, so all four languages see the same arrays
  seed = (seed * 48271) % 2147483647;
  return seed % limit;
}

function randomArray(n) {
  const a = [];
  for (let i = 0; i < n; i++) a.push(nextRand(101) - 50);   // values in -50..50
  return a;
}

for (const n of [10, 100, 300]) {
  const nums = randomArray(n);
  const results = [cubic(nums), quadratic(nums), prefixMin(nums), kadane(nums)];
  const same = new Set(results.map((r) => r[0])).size === 1;
  console.log("n=" + n + ": cubic " + results[0][1] + " additions | quadratic " + results[1][1] +
    " | prefix sums " + results[2][1] + " | kadane " + results[3][1] +
    " | best " + results[3][0] + ", all agree: " + same);
}

let agree = 0;
for (let t = 0; t < 500; t++) {
  const nums = randomArray(1 + nextRand(30));
  const answers = new Set([cubic(nums)[0], quadratic(nums)[0], prefixMin(nums)[0], kadane(nums)[0]]);
  if (answers.size === 1) agree++;
}
console.log("all four methods agree on " + agree + " of 500 random arrays");
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an integer array, find the contiguous subarray with the largest sum and return that sum. Code it in Java. What if every number is negative? Can you also return where the subarray starts and ends?"

**What a strong answer should cover:**
- The state "best sum of a subarray ending here" and the update \`cur = max(x, cur + x)\`, \`best = max(best, cur)\` — Kadane, O(n) time, O(1) space.
- Why a negative running sum should be dropped, and that the two forms (restart if \`cur < 0\` / \`max(x, cur + x)\`) are the same rule.
- Initialising from the first element so all-negative arrays return their largest element, not 0.
- The brute-force baselines (O(n³), O(n²)) and the prefix-sum view; tracking start and end indices.
- Java specifics: \`int\` overflow producing a silently wrong (not even negative) answer, so \`long\` sums; never start from \`Integer.MIN_VALUE\`; returning indices via an array or record.

**Clarifying questions expected:**
- "Must the subarray be non-empty, and what should an empty input return?"
- "Do you want the sum only, or the indices too?"

**Code / implementation expected:** Yes — a one-pass Java function, with indices as a follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know arrays and loops.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A lemonade stand keeps a notebook of each day's profit or loss: \`-2, 1, -3, 4, -1, 2, 1, -5, 4\`. At the end of the summer the owner asks: "Which run of **consecutive** days made the most money?" She cannot pick and choose single good days — she wants a stretch, from some start day to some end day, because she is deciding when to open next year.

Checking every possible stretch works, but a summer has 90 days and there are thousands of stretches. There is a much smarter way, and it is something she can do in her head while reading the notebook once from top to bottom: keep a running total of "the current stretch"; whenever that running total drops below zero, **throw it away and start fresh tomorrow**, because a stretch that starts in debt can only make any future stretch worse. Keep a note of the best total seen so far.

That one-pass trick is **Kadane's algorithm**. It is one of the most-asked array questions because it rewards exactly the insight interviewers look for: replacing "try every start and end" with "what is the best answer that ends **here**?" — the same idea as [house robber](/interview-question/how-do-you-solve-the-house-robber-problem), dressed differently.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must the subarray be non-empty? | Usually yes. Then an all-negative array returns its largest element (\`[-3, -1, -2]\` → -1). If an empty subarray is allowed, the answer is never below 0. This decides how \`best\` is initialised. |
| Do you want just the sum, or the start and end indices? | Indices need two extra variables; Example 1 tracks them. |
| Can the array be empty? | Then "non-empty subarray" has no answer: return a sentinel, raise, or ask. |
| How large are the values and the length? | The sum of up to n values can overflow 32-bit integers (see the language notes). |
| Is the array circular (can a subarray wrap around the end)? | A different, well-known variant; covered under Variants. |

## 3. The Core Idea: the Best Subarray Ending Here

📌 **Interview term: Subarray** — a contiguous, non-empty slice \`nums[i..j]\`. (A *subsequence* may skip elements; a subarray may not.)

Every subarray ends somewhere. So instead of asking "what is the best subarray?", ask, for each index \`j\`, "what is the best subarray that **ends exactly at \`j\`**?" — and take the largest of those n answers.

📌 **Interview term: State — best sum ending here** — \`cur[j]\` = the largest sum of a subarray that ends at index \`j\`.

How does \`cur[j]\` relate to \`cur[j - 1]\`? A subarray ending at \`j\` is either just \`[nums[j]]\`, or it is a subarray ending at \`j - 1\` extended by \`nums[j]\` — and if we extend, we should extend the **best** one. So:

\`cur[j] = max(nums[j], cur[j - 1] + nums[j])\`

That \`max\` has a plain-language reading: **if the running sum so far is negative, drop it and start fresh at \`nums[j]\`; otherwise keep extending.** The answer is \`best = max(cur[0], cur[1], …, cur[n - 1])\`, kept as we go.

📌 **Interview term: Kadane's algorithm** — the one-pass O(n) time, O(1) space method above: keep \`cur\` (best sum ending here) and \`best\` (best seen anywhere). It is a dynamic program whose table has only one live entry. Jon Bentley's 1984 *Programming Pearls* column in Communications of the ACM presented four algorithms for this problem — O(n³), O(n²), O(n log n) and O(n) — and credits the linear one to Jay Kadane ([history and sources](https://scm.iis.sinica.edu.tw/home/2010/maximum-segment-sum-origin-and-derivation/)). The proof that it is correct, and the O(n log n) divide-and-conquer method, are on [Kadane vs divide-and-conquer — proof of correctness](/interview-question/maximum-subarray-kadane-vs-divide-and-conquer-proof-of-correctness).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Array -2 1 -3 4 -1 2 1 -5 4 with cur values -2 1 -2 4 3 5 6 1 5 and best values -2 1 1 4 4 5 6 6 6. The subarray 4 -1 2 1 is highlighted">
  <text class="d-sub" x="40" y="62" text-anchor="middle">nums</text>
  <text class="d-sub" x="40" y="132" text-anchor="middle">cur</text>
  <text class="d-sub" x="40" y="202" text-anchor="middle">best</text>
  <rect class="d-box" x="80" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="112" y="63" text-anchor="middle">-2</text>
  <rect class="d-box" x="154" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="186" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="228" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="260" y="63" text-anchor="middle">-3</text>
  <rect class="d-box-accent" x="302" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="334" y="63" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="376" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="408" y="63" text-anchor="middle">-1</text>
  <rect class="d-box-accent" x="450" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="482" y="63" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="524" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="556" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="598" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="630" y="63" text-anchor="middle">-5</text>
  <rect class="d-box" x="672" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="704" y="63" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="80" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="112" y="133" text-anchor="middle">-2</text>
  <rect class="d-box-muted" x="154" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="186" y="133" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="228" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="260" y="133" text-anchor="middle">-2</text>
  <rect class="d-box-muted" x="302" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="334" y="133" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="376" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="408" y="133" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="450" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="482" y="133" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="524" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="556" y="133" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="598" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="630" y="133" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="672" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="704" y="133" text-anchor="middle">5</text>
  <rect class="d-box" x="80" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="112" y="203" text-anchor="middle">-2</text>
  <rect class="d-box" x="154" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="186" y="203" text-anchor="middle">1</text>
  <rect class="d-box" x="228" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="260" y="203" text-anchor="middle">1</text>
  <rect class="d-box" x="302" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="334" y="203" text-anchor="middle">4</text>
  <rect class="d-box" x="376" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="408" y="203" text-anchor="middle">4</text>
  <rect class="d-box" x="450" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="482" y="203" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="524" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="556" y="203" text-anchor="middle">6</text>
  <rect class="d-box" x="598" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="630" y="203" text-anchor="middle">6</text>
  <rect class="d-box" x="672" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="704" y="203" text-anchor="middle">6</text>
</svg>

Read the middle row: at index 1, \`cur\` was -2 (negative), so it restarts at 1. At index 2 it extends to -2. At index 3 it is negative again, so it restarts at 4 — that restart is the start of the winning subarray \`[4, -1, 2, 1]\` (highlighted), whose sum 6 appears in the bottom row at index 6 and is never beaten.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="Decision at each element: if cur is negative restart at x, otherwise extend cur by x; then best becomes the max of best and cur">
  <defs>
    <marker id="b27q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="250" y="20" width="180" height="46" rx="10"/>
  <text class="d-text" x="340" y="48" text-anchor="middle">is cur below 0?</text>
  <path class="d-edge" d="M 290 68 L 160 116" marker-end="url(#b27q4-arrow)"/>
  <path class="d-edge" d="M 390 68 L 520 116" marker-end="url(#b27q4-arrow)"/>
  <text class="d-sub" x="196" y="86" text-anchor="middle">yes</text>
  <text class="d-sub" x="486" y="86" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="40" y="120" width="220" height="46" rx="10"/>
  <text class="d-text" x="150" y="148" text-anchor="middle">restart: cur = x</text>
  <rect class="d-box" x="420" y="120" width="220" height="46" rx="10"/>
  <text class="d-text" x="530" y="148" text-anchor="middle">extend: cur = cur + x</text>
  <text class="d-sub" x="340" y="196" text-anchor="middle">then best = max(best, cur)</text>
</svg>

\`max(x, cur + x)\` and "restart if \`cur < 0\`" are the same rule: \`cur + x < x\` exactly when \`cur < 0\`.

📌 **Interview term: Prefix sum view** — let \`P[k]\` be the sum of the first \`k\` elements. Then \`sum(nums[i..j]) = P[j + 1] - P[i]\`, so the best subarray ending at \`j\` subtracts the **smallest** earlier prefix. Keeping a running minimum prefix gives another O(n) algorithm; Example 2 runs it alongside Kadane and they always agree. See the [prefix sum technique](/interview-question/what-is-the-prefix-sum-technique).

## 4. From Brute Force to O(n)

| Approach | Idea | Time | Space |
| :--- | :--- | :--- | :--- |
| Cubic brute force | For every \`(i, j)\`, add \`nums[i..j]\` from scratch | O(n³) | O(1) |
| Quadratic | Fix \`i\`, extend \`j\` while keeping a running sum | O(n²) | O(1) |
| Divide and conquer | Best of left half, right half, or crossing the middle | O(n log n) | O(log n) stack |
| Prefix sums + running min | \`P[j + 1] - min(P[0..j])\` | O(n) | O(1) |
| **Kadane** | Best sum ending here, best anywhere | **O(n)** | **O(1)** |

Example 2 counts additions on the same random arrays: at n = 300 the cubic method does 4,545,100, the quadratic one 45,150, and both linear methods 300 — and all four return the same answer. Every element must be read at least once (any one of them could change the answer), so O(n) is optimal. The divide-and-conquer method is explained, with its proof, on the [Kadane vs divide-and-conquer](/interview-question/maximum-subarray-kadane-vs-divide-and-conquer-proof-of-correctness) page.

### Tracking where the best subarray is

To return indices, remember where the current run started (\`start\`), and when \`cur\` beats \`best\`, copy that start and the current index into \`best_start\` / \`best_end\`. Restarting sets \`start = j\`. Example 1 prints \`[4, -1, 2, 1] at [3..6]\` for the classic input.

### The all-negative trap

A common "simplified" Kadane starts with \`cur = best = 0\` and clamps with \`cur = max(0, cur + x)\`. That computes the best sum when an **empty** subarray is allowed. For \`[-3, -1, -2]\` it returns 0 — but no non-empty subarray sums to 0; the right answer is -1. Example 1 prints both: the buggy version agrees on mixed inputs and is wrong on every all-negative one. Initialise from the first element instead.

## 5. The Java Code, Line by Line

~~~java
static int[] maxSubarray(int[] nums) {
    int best = nums[0], cur = nums[0];         // start from the first element, NOT from 0
    int start = 0, bestStart = 0, bestEnd = 0;
    for (int i = 1; i < nums.length; i++) {
        if (cur < 0) {                         // a negative running sum only hurts: restart here
            cur = nums[i];
            start = i;
        } else {                               // otherwise extend the current run
            cur += nums[i];
        }
        if (cur > best) {
            best = cur;
            bestStart = start;
            bestEnd = i;
        }
    }
    return new int[] {best, bestStart, bestEnd};
}
~~~

What each Java piece is doing:

- **Returning \`int[] {best, start, end}\`** is the quick interview way to return three values; a \`record Result(int sum, int start, int end)\` (Java 16+) is cleaner in real code.
- **Initialise from \`nums[0]\`, not \`Integer.MIN_VALUE\`.** Starting \`cur\` at \`Integer.MIN_VALUE\` and then computing \`cur + nums[i]\` overflows to a large positive number for negative \`nums[i]\` — a silent wrong answer.
- **\`Arrays.copyOfRange(nums, s, e + 1)\`** — end-exclusive copy, used in Example 1 to print the subarray; \`Arrays.toString\` formats it as \`[4, -1, 2, 1]\`.
- **Empty input.** \`nums[0]\` throws \`ArrayIndexOutOfBoundsException\`; check \`nums.length == 0\` and throw \`IllegalArgumentException\` or return a sentinel, as agreed.
- **Overflow gives a wrong answer silently.** The sum of many \`int\`s can exceed 2,147,483,647. A test run of the \`int\` version on \`[2000000000, 2000000000]\` printed \`2000000000\` — not a negative number, a plausible-looking wrong one: \`cur + x\` wrapped negative, so \`Math.max(x, cur + x)\` quietly chose to restart. The same code with \`long cur, best\` printed the correct \`4000000000\`.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs in the other three languages print exactly the same lines.

**Example 1 — Kadane with the winning subarray and its indices, against the start-at-zero bug** printed:

~~~text
[-2, 1, -3, 4, -1, 2, 1, -5, 4] -> 6, subarray [4, -1, 2, 1] at [3..6] | start-at-0 version says 6
[1] -> 1, subarray [1] at [0..0] | start-at-0 version says 1
[5, 4, -1, 7, 8] -> 23, subarray [5, 4, -1, 7, 8] at [0..4] | start-at-0 version says 23
[-3, -1, -2] -> -1, subarray [-1] at [1..1] | start-at-0 version says 0
[-2, -1] -> -1, subarray [-1] at [1..1] | start-at-0 version says 0
[0, -3, 0] -> 0, subarray [0] at [0..0] | start-at-0 version says 0
~~~

**Example 2 — Four methods side by side: O(n^3), O(n^2), prefix sums and Kadane, with addition counts** printed:

~~~text
n=10: cubic 220 additions | quadratic 55 | prefix sums 10 | kadane 10 | best 65, all agree: true
n=100: cubic 171700 additions | quadratic 5050 | prefix sums 100 | kadane 100 | best 213, all agree: true
n=300: cubic 4545100 additions | quadratic 45150 | prefix sums 300 | kadane 300 | best 642, all agree: true
all four methods agree on 500 of 500 random arrays
~~~

Example 1 shows the start-at-zero version agreeing on mixed arrays and returning 0 on every all-negative one (\`[-3, -1, -2]\`, \`[-2, -1]\`), where the correct answer is -1. Example 2 runs the four methods on the same arrays (from a Park–Miller generator built into each program, so every language sees identical inputs): the addition counts match the formulas n(n + 1)(n + 2)/6, n(n + 1)/2 and n, and the answers agree on all 500 random arrays.

## 7. Variants Interviewers Ask Next

- **Return the subarray** — track \`start\`, \`best_start\`, \`best_end\` (Example 1).
- **Empty subarray allowed** — then the answer is \`max(0, kadane)\`, which is exactly what the start-at-0 version computes.
- **Circular array** — a subarray may wrap from the end to the start. The best wrapping subarray is "everything except a minimum subarray in the middle", so the answer is \`max(kadane_max, total - kadane_min)\`; if every element is negative, \`total - kadane_min\` would describe the empty subarray, so return \`kadane_max\` in that case.
- **Maximum product subarray** — products flip sign with negatives, so you track both the largest and the smallest product ending here. That is its own question: [maximum product subarray](/interview-question/how-do-you-find-the-maximum-product-subarray).
- **Count or find subarrays with a given sum** — a different tool (prefix sums plus a hash map): [subarrays that sum to k](/interview-question/how-do-you-count-subarrays-that-sum-to-k).
- **2D maximum-sum rectangle** — fix a pair of rows, collapse the columns between them into a 1D array of sums, and run Kadane on it: O(rows² × cols).

## 8. Complexity

| Method | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Cubic | O(n³) | O(1) | n(n + 1)(n + 2)/6 additions: 4,545,100 for n = 300 |
| Quadratic | O(n²) | O(1) | n(n + 1)/2 additions: 45,150 for n = 300 |
| Prefix sums + running min | O(n) | O(1) | One pass, one running minimum |
| Kadane | O(n) | O(1) | One pass, two variables (four with indices) |

## 9. Edge Cases

- **Single element** — that element, even if negative (\`[1]\` → 1).
- **All negative** — the largest element (\`[-3, -1, -2]\` → -1, \`[-2, -1]\` → -1), never 0.
- **All positive** — the whole array (\`[5, 4, -1, 7, 8]\` → 23 includes the -1, because 9 + 7 + 8 beats any piece).
- **Zeros** — \`[0, -3, 0]\` → 0; with strict \`>\` the first 0 is reported.
- **Empty array** — undefined for the non-empty version; agree on behaviour first.
- **Large values** — overflow in fixed-width languages; see the language notes above.

## Common Pitfalls

- **Starting \`best\` at 0.** Returns 0 for all-negative input (Example 1); start from \`nums[0]\`.
- **\`int\` overflow giving a plausible wrong answer** (\`2000000000\` instead of \`4000000000\`); use \`long\` sums.
- **Starting from \`Integer.MIN_VALUE\`** and adding a negative number — overflow.
- **Resetting \`cur\` to 0 instead of \`nums[i]\`.**
- **Updating \`best\` before \`cur\`**, which misses a best subarray ending at the last index.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key idea:</strong> <span style="color:#f0e2c8;">Every subarray ends somewhere, so I track the best sum ending at each index: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur = Math.max(x, cur + x)</code>. A negative running sum can only hurt, so I restart.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> is the max of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur</code> over all positions; one pass, O(n) time, O(1) space. That is Kadane's algorithm.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Initialisation:</strong> <span style="color:#f0e2c8;">I start both at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[0]</code>, not 0 and not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MIN_VALUE</code>, so all-negative input works and nothing overflows on the first addition.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Brute force for contrast:</strong> <span style="color:#f0e2c8;">Every start and end is O(n²) with a running sum, O(n³) without; at n = 300 that is 45,150 or 4,545,100 additions against 300.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Overflow:</strong> <span style="color:#f0e2c8;">If the values can be large I make <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> the answer can be silently wrong, not even negative.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The best subarray ending at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> is either <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[x]</code> or the best ending at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j - 1</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur</code> is always that optimum, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> sees every position.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the indices?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start</code> on each restart, and copy it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bestStart</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bestEnd</code> whenever <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur &gt; best</code>; return an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> or a record.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a circular array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max(maxSub, total - minSub)</code>, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">minSub</code> from Kadane using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min</code>; if every value is negative return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxSub</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it with prefix sums?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: keep the minimum prefix so far and maximise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix - minPrefix</code>, in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>; also O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the divide-and-conquer version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Best of left, right, or crossing the middle, O(n log n); its four-value form is what a segment tree stores for range maximum-subarray queries.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subarray** | A contiguous, non-empty slice nums[i..j]; unlike a subsequence it cannot skip elements |
| **State — best sum ending here** | cur[j] = largest sum of a subarray that ends exactly at index j |
| **Kadane's algorithm** | One pass keeping cur = max(x, cur + x) and best = max(best, cur); O(n) time, O(1) space |
| **Prefix sum view** | sum(i..j) = P[j + 1] - P[i]; maximise by subtracting the smallest earlier prefix |

---
**Conclusion:** The maximum subarray sum is found in one pass by keeping the best sum that ends at the current index (\`cur = Math.max(x, cur + x)\`) and the best seen anywhere. Start both from \`nums[0]\`, use \`long\` when sums can pass 2^31 - 1 (the \`int\` version returned a silently wrong answer in the test), and track a start index to return the subarray. Kadane is O(n) time and O(1) space, against O(n²) and O(n³) for the brute forces; its proof and the divide-and-conquer alternative are on the companion page.`,
        examples: [
          {
            label: "Kadane with the winning subarray and its indices, against the start-at-zero bug",
            code: `import java.util.Arrays;

public class Main {
    // Kadane: returns {best sum, start, end} for a non-empty array
    static int[] maxSubarray(int[] nums) {
        int best = nums[0], cur = nums[0];         // start from the first element, NOT from 0
        int start = 0, bestStart = 0, bestEnd = 0;
        for (int i = 1; i < nums.length; i++) {
            if (cur < 0) {                         // a negative running sum only hurts: restart here
                cur = nums[i];
                start = i;
            } else {                               // otherwise extend the current run
                cur += nums[i];
            }
            if (cur > best) {
                best = cur;
                bestStart = start;
                bestEnd = i;
            }
        }
        return new int[] {best, bestStart, bestEnd};
    }

    // the classic bug: best and cur start at 0, so an all-negative array returns 0
    static int buggyMaxSubarray(int[] nums) {
        int best = 0, cur = 0;
        for (int x : nums) {
            cur = Math.max(0, cur + x);
            best = Math.max(best, cur);
        }
        return best;
    }

    public static void main(String[] args) {
        int[][] tests = {{-2, 1, -3, 4, -1, 2, 1, -5, 4}, {1}, {5, 4, -1, 7, 8}, {-3, -1, -2}, {-2, -1}, {0, -3, 0}};
        for (int[] nums : tests) {
            int[] r = maxSubarray(nums);
            System.out.println(Arrays.toString(nums) + " -> " + r[0] + ", subarray "
                + Arrays.toString(Arrays.copyOfRange(nums, r[1], r[2] + 1)) + " at [" + r[1] + ".." + r[2]
                + "] | start-at-0 version says " + buggyMaxSubarray(nums));
        }
    }
}
`,
          },
          {
            label: "Four methods side by side: O(n^3), O(n^2), prefix sums and Kadane, with addition counts",
            code: `public class Main {
    static long ops;                               // additions performed by the last call

    static int cubic(int[] nums) {
        // try every (i, j) and add nums[i..j] from scratch: O(n^3)
        int best = nums[0];
        for (int i = 0; i < nums.length; i++) {
            for (int j = i; j < nums.length; j++) {
                int s = 0;
                for (int k = i; k <= j; k++) {
                    s += nums[k];
                    ops++;
                }
                best = Math.max(best, s);
            }
        }
        return best;
    }

    static int quadratic(int[] nums) {
        // fix the start i, extend j and keep a running sum: O(n^2)
        int best = nums[0];
        for (int i = 0; i < nums.length; i++) {
            int s = 0;
            for (int j = i; j < nums.length; j++) {
                s += nums[j];
                ops++;
                best = Math.max(best, s);
            }
        }
        return best;
    }

    static int prefixMin(int[] nums) {
        // sum(i..j) = prefix[j + 1] - prefix[i]; subtract the smallest earlier prefix: O(n)
        int best = nums[0], prefix = 0, smallest = 0;
        for (int x : nums) {
            prefix += x;
            ops++;
            best = Math.max(best, prefix - smallest);
            smallest = Math.min(smallest, prefix);
        }
        return best;
    }

    static int kadane(int[] nums) {
        int best = nums[0], cur = nums[0];
        ops++;
        for (int i = 1; i < nums.length; i++) {
            cur = Math.max(nums[i], cur + nums[i]); // extend the run or start fresh at nums[i]
            best = Math.max(best, cur);
            ops++;
        }
        return best;
    }

    static long seed = 7;

    static int nextRand(int limit) {
        // Park-Miller generator, so all four languages see the same arrays
        seed = seed * 48271 % 2147483647;
        return (int) (seed % limit);
    }

    static int[] randomArray(int n) {
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = nextRand(101) - 50;   // values in -50..50
        return a;
    }

    public static void main(String[] args) {
        for (int n : new int[] {10, 100, 300}) {
            int[] nums = randomArray(n);
            ops = 0; int a = cubic(nums); long opsA = ops;
            ops = 0; int b = quadratic(nums); long opsB = ops;
            ops = 0; int c = prefixMin(nums); long opsC = ops;
            ops = 0; int d = kadane(nums); long opsD = ops;
            boolean same = a == b && b == c && c == d;
            System.out.println("n=" + n + ": cubic " + opsA + " additions | quadratic " + opsB
                + " | prefix sums " + opsC + " | kadane " + opsD + " | best " + d + ", all agree: " + same);
        }
        int agree = 0;
        for (int t = 0; t < 500; t++) {
            int[] nums = randomArray(1 + nextRand(30));
            int a = cubic(nums), b = quadratic(nums), c = prefixMin(nums), d = kadane(nums);
            if (a == b && b == c && c == d) agree++;
        }
        System.out.println("all four methods agree on " + agree + " of 500 random arrays");
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given an integer array, find the contiguous subarray with the largest sum and return that sum. Code it in C++. What if every number is negative? Can you also return where the subarray starts and ends?"

**What a strong answer should cover:**
- The state "best sum of a subarray ending here" and the update \`cur = max(x, cur + x)\`, \`best = max(best, cur)\` — Kadane, O(n) time, O(1) space.
- Why a negative running sum should be dropped, and that the two forms (restart if \`cur < 0\` / \`max(x, cur + x)\`) are the same rule.
- Initialising from the first element so all-negative arrays return their largest element, not 0.
- The brute-force baselines (O(n³), O(n²)) and the prefix-sum view; tracking start and end indices.
- C++ specifics: signed overflow is undefined behaviour (use \`long long\` and \`std::max<long long>\`), \`nums[0]\` on an empty vector, and returning indices with \`std::tuple\` + structured bindings.

**Clarifying questions expected:**
- "Must the subarray be non-empty, and what should an empty input return?"
- "Do you want the sum only, or the indices too?"

**Code / implementation expected:** Yes — a one-pass C++ function, with indices as a follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know arrays and loops.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A lemonade stand keeps a notebook of each day's profit or loss: \`-2, 1, -3, 4, -1, 2, 1, -5, 4\`. At the end of the summer the owner asks: "Which run of **consecutive** days made the most money?" She cannot pick and choose single good days — she wants a stretch, from some start day to some end day, because she is deciding when to open next year.

Checking every possible stretch works, but a summer has 90 days and there are thousands of stretches. There is a much smarter way, and it is something she can do in her head while reading the notebook once from top to bottom: keep a running total of "the current stretch"; whenever that running total drops below zero, **throw it away and start fresh tomorrow**, because a stretch that starts in debt can only make any future stretch worse. Keep a note of the best total seen so far.

That one-pass trick is **Kadane's algorithm**. It is one of the most-asked array questions because it rewards exactly the insight interviewers look for: replacing "try every start and end" with "what is the best answer that ends **here**?" — the same idea as [house robber](/interview-question/how-do-you-solve-the-house-robber-problem), dressed differently.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must the subarray be non-empty? | Usually yes. Then an all-negative array returns its largest element (\`[-3, -1, -2]\` → -1). If an empty subarray is allowed, the answer is never below 0. This decides how \`best\` is initialised. |
| Do you want just the sum, or the start and end indices? | Indices need two extra variables; Example 1 tracks them. |
| Can the array be empty? | Then "non-empty subarray" has no answer: return a sentinel, raise, or ask. |
| How large are the values and the length? | The sum of up to n values can overflow 32-bit integers (see the language notes). |
| Is the array circular (can a subarray wrap around the end)? | A different, well-known variant; covered under Variants. |

## 3. The Core Idea: the Best Subarray Ending Here

📌 **Interview term: Subarray** — a contiguous, non-empty slice \`nums[i..j]\`. (A *subsequence* may skip elements; a subarray may not.)

Every subarray ends somewhere. So instead of asking "what is the best subarray?", ask, for each index \`j\`, "what is the best subarray that **ends exactly at \`j\`**?" — and take the largest of those n answers.

📌 **Interview term: State — best sum ending here** — \`cur[j]\` = the largest sum of a subarray that ends at index \`j\`.

How does \`cur[j]\` relate to \`cur[j - 1]\`? A subarray ending at \`j\` is either just \`[nums[j]]\`, or it is a subarray ending at \`j - 1\` extended by \`nums[j]\` — and if we extend, we should extend the **best** one. So:

\`cur[j] = max(nums[j], cur[j - 1] + nums[j])\`

That \`max\` has a plain-language reading: **if the running sum so far is negative, drop it and start fresh at \`nums[j]\`; otherwise keep extending.** The answer is \`best = max(cur[0], cur[1], …, cur[n - 1])\`, kept as we go.

📌 **Interview term: Kadane's algorithm** — the one-pass O(n) time, O(1) space method above: keep \`cur\` (best sum ending here) and \`best\` (best seen anywhere). It is a dynamic program whose table has only one live entry. Jon Bentley's 1984 *Programming Pearls* column in Communications of the ACM presented four algorithms for this problem — O(n³), O(n²), O(n log n) and O(n) — and credits the linear one to Jay Kadane ([history and sources](https://scm.iis.sinica.edu.tw/home/2010/maximum-segment-sum-origin-and-derivation/)). The proof that it is correct, and the O(n log n) divide-and-conquer method, are on [Kadane vs divide-and-conquer — proof of correctness](/interview-question/maximum-subarray-kadane-vs-divide-and-conquer-proof-of-correctness).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Array -2 1 -3 4 -1 2 1 -5 4 with cur values -2 1 -2 4 3 5 6 1 5 and best values -2 1 1 4 4 5 6 6 6. The subarray 4 -1 2 1 is highlighted">
  <text class="d-sub" x="40" y="62" text-anchor="middle">nums</text>
  <text class="d-sub" x="40" y="132" text-anchor="middle">cur</text>
  <text class="d-sub" x="40" y="202" text-anchor="middle">best</text>
  <rect class="d-box" x="80" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="112" y="63" text-anchor="middle">-2</text>
  <rect class="d-box" x="154" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="186" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="228" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="260" y="63" text-anchor="middle">-3</text>
  <rect class="d-box-accent" x="302" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="334" y="63" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="376" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="408" y="63" text-anchor="middle">-1</text>
  <rect class="d-box-accent" x="450" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="482" y="63" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="524" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="556" y="63" text-anchor="middle">1</text>
  <rect class="d-box" x="598" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="630" y="63" text-anchor="middle">-5</text>
  <rect class="d-box" x="672" y="40" width="64" height="36" rx="6"/>
  <text class="d-text" x="704" y="63" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="80" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="112" y="133" text-anchor="middle">-2</text>
  <rect class="d-box-muted" x="154" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="186" y="133" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="228" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="260" y="133" text-anchor="middle">-2</text>
  <rect class="d-box-muted" x="302" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="334" y="133" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="376" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="408" y="133" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="450" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="482" y="133" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="524" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="556" y="133" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="598" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="630" y="133" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="672" y="110" width="64" height="36" rx="6"/>
  <text class="d-text" x="704" y="133" text-anchor="middle">5</text>
  <rect class="d-box" x="80" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="112" y="203" text-anchor="middle">-2</text>
  <rect class="d-box" x="154" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="186" y="203" text-anchor="middle">1</text>
  <rect class="d-box" x="228" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="260" y="203" text-anchor="middle">1</text>
  <rect class="d-box" x="302" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="334" y="203" text-anchor="middle">4</text>
  <rect class="d-box" x="376" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="408" y="203" text-anchor="middle">4</text>
  <rect class="d-box" x="450" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="482" y="203" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="524" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="556" y="203" text-anchor="middle">6</text>
  <rect class="d-box" x="598" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="630" y="203" text-anchor="middle">6</text>
  <rect class="d-box" x="672" y="180" width="64" height="36" rx="6"/>
  <text class="d-text" x="704" y="203" text-anchor="middle">6</text>
</svg>

Read the middle row: at index 1, \`cur\` was -2 (negative), so it restarts at 1. At index 2 it extends to -2. At index 3 it is negative again, so it restarts at 4 — that restart is the start of the winning subarray \`[4, -1, 2, 1]\` (highlighted), whose sum 6 appears in the bottom row at index 6 and is never beaten.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="Decision at each element: if cur is negative restart at x, otherwise extend cur by x; then best becomes the max of best and cur">
  <defs>
    <marker id="b27q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="250" y="20" width="180" height="46" rx="10"/>
  <text class="d-text" x="340" y="48" text-anchor="middle">is cur below 0?</text>
  <path class="d-edge" d="M 290 68 L 160 116" marker-end="url(#b27q4-arrow)"/>
  <path class="d-edge" d="M 390 68 L 520 116" marker-end="url(#b27q4-arrow)"/>
  <text class="d-sub" x="196" y="86" text-anchor="middle">yes</text>
  <text class="d-sub" x="486" y="86" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="40" y="120" width="220" height="46" rx="10"/>
  <text class="d-text" x="150" y="148" text-anchor="middle">restart: cur = x</text>
  <rect class="d-box" x="420" y="120" width="220" height="46" rx="10"/>
  <text class="d-text" x="530" y="148" text-anchor="middle">extend: cur = cur + x</text>
  <text class="d-sub" x="340" y="196" text-anchor="middle">then best = max(best, cur)</text>
</svg>

\`max(x, cur + x)\` and "restart if \`cur < 0\`" are the same rule: \`cur + x < x\` exactly when \`cur < 0\`.

📌 **Interview term: Prefix sum view** — let \`P[k]\` be the sum of the first \`k\` elements. Then \`sum(nums[i..j]) = P[j + 1] - P[i]\`, so the best subarray ending at \`j\` subtracts the **smallest** earlier prefix. Keeping a running minimum prefix gives another O(n) algorithm; Example 2 runs it alongside Kadane and they always agree. See the [prefix sum technique](/interview-question/what-is-the-prefix-sum-technique).

## 4. From Brute Force to O(n)

| Approach | Idea | Time | Space |
| :--- | :--- | :--- | :--- |
| Cubic brute force | For every \`(i, j)\`, add \`nums[i..j]\` from scratch | O(n³) | O(1) |
| Quadratic | Fix \`i\`, extend \`j\` while keeping a running sum | O(n²) | O(1) |
| Divide and conquer | Best of left half, right half, or crossing the middle | O(n log n) | O(log n) stack |
| Prefix sums + running min | \`P[j + 1] - min(P[0..j])\` | O(n) | O(1) |
| **Kadane** | Best sum ending here, best anywhere | **O(n)** | **O(1)** |

Example 2 counts additions on the same random arrays: at n = 300 the cubic method does 4,545,100, the quadratic one 45,150, and both linear methods 300 — and all four return the same answer. Every element must be read at least once (any one of them could change the answer), so O(n) is optimal. The divide-and-conquer method is explained, with its proof, on the [Kadane vs divide-and-conquer](/interview-question/maximum-subarray-kadane-vs-divide-and-conquer-proof-of-correctness) page.

### Tracking where the best subarray is

To return indices, remember where the current run started (\`start\`), and when \`cur\` beats \`best\`, copy that start and the current index into \`best_start\` / \`best_end\`. Restarting sets \`start = j\`. Example 1 prints \`[4, -1, 2, 1] at [3..6]\` for the classic input.

### The all-negative trap

A common "simplified" Kadane starts with \`cur = best = 0\` and clamps with \`cur = max(0, cur + x)\`. That computes the best sum when an **empty** subarray is allowed. For \`[-3, -1, -2]\` it returns 0 — but no non-empty subarray sums to 0; the right answer is -1. Example 1 prints both: the buggy version agrees on mixed inputs and is wrong on every all-negative one. Initialise from the first element instead.

## 5. The C++ Code, Line by Line

~~~cpp
std::tuple<int, int, int> maxSubarray(const std::vector<int>& nums) {
    int best = nums[0], cur = nums[0];            // start from the first element, NOT from 0
    int start = 0, bestStart = 0, bestEnd = 0;
    for (int i = 1; i < static_cast<int>(nums.size()); i++) {
        if (cur < 0) {                            // a negative running sum only hurts: restart here
            cur = nums[i];
            start = i;
        } else {                                  // otherwise extend the current run
            cur += nums[i];
        }
        if (cur > best) {
            best = cur;
            bestStart = start;
            bestEnd = i;
        }
    }
    return {best, bestStart, bestEnd};
}
~~~

What each C++ piece is doing:

- **\`std::tuple<int, int, int>\`** returns three values; the caller unpacks them with a C++17 structured binding, \`auto [best, s, e] = maxSubarray(nums);\`.
- **\`static_cast<int>(nums.size())\`** — compares \`int i\` with a signed bound; mixing \`int\` and \`size_t\` triggers sign-compare warnings and, with subtraction, wrap-around bugs.
- **Initialise from \`nums[0]\`, not \`INT_MIN\`.** \`INT_MIN + (negative)\` is signed overflow: undefined behaviour.
- **Empty input.** \`nums[0]\` on an empty vector is undefined behaviour (no exception); \`nums.at(0)\` would throw \`std::out_of_range\`. Check \`nums.empty()\` first.
- **Use \`long long\` for big sums.** Adding many \`int\`s can overflow, and in C++ that is undefined behaviour, not a predictable wrap. Declaring \`long long best = nums[0], cur = nums[0];\` and writing \`cur = std::max<long long>(nums[i], cur + nums[i]);\` was run on \`[2000000000, 2000000000]\` and printed \`4000000000\`. (\`std::max<long long>\` names the type, because \`std::max\` refuses arguments of two different types.)

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (g++ 13). The same programs in the other three languages print exactly the same lines.

**Example 1 — Kadane with the winning subarray and its indices, against the start-at-zero bug** printed:

~~~text
[-2, 1, -3, 4, -1, 2, 1, -5, 4] -> 6, subarray [4, -1, 2, 1] at [3..6] | start-at-0 version says 6
[1] -> 1, subarray [1] at [0..0] | start-at-0 version says 1
[5, 4, -1, 7, 8] -> 23, subarray [5, 4, -1, 7, 8] at [0..4] | start-at-0 version says 23
[-3, -1, -2] -> -1, subarray [-1] at [1..1] | start-at-0 version says 0
[-2, -1] -> -1, subarray [-1] at [1..1] | start-at-0 version says 0
[0, -3, 0] -> 0, subarray [0] at [0..0] | start-at-0 version says 0
~~~

**Example 2 — Four methods side by side: O(n^3), O(n^2), prefix sums and Kadane, with addition counts** printed:

~~~text
n=10: cubic 220 additions | quadratic 55 | prefix sums 10 | kadane 10 | best 65, all agree: true
n=100: cubic 171700 additions | quadratic 5050 | prefix sums 100 | kadane 100 | best 213, all agree: true
n=300: cubic 4545100 additions | quadratic 45150 | prefix sums 300 | kadane 300 | best 642, all agree: true
all four methods agree on 500 of 500 random arrays
~~~

Example 1 shows the start-at-zero version agreeing on mixed arrays and returning 0 on every all-negative one (\`[-3, -1, -2]\`, \`[-2, -1]\`), where the correct answer is -1. Example 2 runs the four methods on the same arrays (from a Park–Miller generator built into each program, so every language sees identical inputs): the addition counts match the formulas n(n + 1)(n + 2)/6, n(n + 1)/2 and n, and the answers agree on all 500 random arrays.

## 7. Variants Interviewers Ask Next

- **Return the subarray** — track \`start\`, \`best_start\`, \`best_end\` (Example 1).
- **Empty subarray allowed** — then the answer is \`max(0, kadane)\`, which is exactly what the start-at-0 version computes.
- **Circular array** — a subarray may wrap from the end to the start. The best wrapping subarray is "everything except a minimum subarray in the middle", so the answer is \`max(kadane_max, total - kadane_min)\`; if every element is negative, \`total - kadane_min\` would describe the empty subarray, so return \`kadane_max\` in that case.
- **Maximum product subarray** — products flip sign with negatives, so you track both the largest and the smallest product ending here. That is its own question: [maximum product subarray](/interview-question/how-do-you-find-the-maximum-product-subarray).
- **Count or find subarrays with a given sum** — a different tool (prefix sums plus a hash map): [subarrays that sum to k](/interview-question/how-do-you-count-subarrays-that-sum-to-k).
- **2D maximum-sum rectangle** — fix a pair of rows, collapse the columns between them into a 1D array of sums, and run Kadane on it: O(rows² × cols).

## 8. Complexity

| Method | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Cubic | O(n³) | O(1) | n(n + 1)(n + 2)/6 additions: 4,545,100 for n = 300 |
| Quadratic | O(n²) | O(1) | n(n + 1)/2 additions: 45,150 for n = 300 |
| Prefix sums + running min | O(n) | O(1) | One pass, one running minimum |
| Kadane | O(n) | O(1) | One pass, two variables (four with indices) |

## 9. Edge Cases

- **Single element** — that element, even if negative (\`[1]\` → 1).
- **All negative** — the largest element (\`[-3, -1, -2]\` → -1, \`[-2, -1]\` → -1), never 0.
- **All positive** — the whole array (\`[5, 4, -1, 7, 8]\` → 23 includes the -1, because 9 + 7 + 8 beats any piece).
- **Zeros** — \`[0, -3, 0]\` → 0; with strict \`>\` the first 0 is reported.
- **Empty array** — undefined for the non-empty version; agree on behaviour first.
- **Large values** — overflow in fixed-width languages; see the language notes above.

## Common Pitfalls

- **Starting \`best\` at 0.** Returns 0 for all-negative input (Example 1); start from \`nums[0]\`.
- **Signed overflow** on large sums — undefined behaviour; use \`long long\`.
- **Starting from \`INT_MIN\`** and adding a negative number — also overflow.
- **\`nums[0]\` on an empty vector** — undefined behaviour; check \`empty()\`.
- **\`std::max(intValue, longLongValue)\`** does not compile; use \`std::max<long long>(...)\` or make both the same type.
- **Updating \`best\` before \`cur\`**, which misses a best subarray ending at the last index.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key idea:</strong> <span style="color:#f0e2c8;">Every subarray ends somewhere, so I track the best sum ending at each index: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur = std::max(x, cur + x)</code>. A negative running sum can only hurt, so I restart.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Answer:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> is the max of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur</code> over all positions; one pass, O(n) time, O(1) space. That is Kadane's algorithm.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Initialisation:</strong> <span style="color:#f0e2c8;">I start both at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[0]</code>, not 0 and not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INT_MIN</code>, so all-negative input works and the first addition cannot overflow; and I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">empty()</code> first.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Brute force for contrast:</strong> <span style="color:#f0e2c8;">Every start and end is O(n²) with a running sum, O(n³) without; at n = 300 that is 45,150 or 4,545,100 additions against 300.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Overflow:</strong> <span style="color:#f0e2c8;">Signed overflow is undefined behaviour, so for large values I keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::max&lt;long long&gt;</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The best subarray ending at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> is either <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[x]</code> or the best ending at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j - 1</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur</code> is always that optimum, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> sees every position.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the indices?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start</code> on each restart and copy it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur &gt; best</code>; return a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::tuple</code> and unpack with a structured binding.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a circular array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::max(maxSub, total - minSub)</code>, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">minSub</code> from Kadane using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::min</code>; if every value is negative return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxSub</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it with prefix sums?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: keep the minimum prefix so far and maximise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix - minPrefix</code>, in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>; also O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a standard algorithm for this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;algorithm&gt;</code> call does it; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::partial_sum</code> gives prefix sums, but the running max and min still need a loop.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subarray** | A contiguous, non-empty slice nums[i..j]; unlike a subsequence it cannot skip elements |
| **State — best sum ending here** | cur[j] = largest sum of a subarray that ends exactly at index j |
| **Kadane's algorithm** | One pass keeping cur = max(x, cur + x) and best = max(best, cur); O(n) time, O(1) space |
| **Prefix sum view** | sum(i..j) = P[j + 1] - P[i]; maximise by subtracting the smallest earlier prefix |

---
**Conclusion:** The maximum subarray sum is found in one pass by keeping the best sum that ends at the current index (\`cur = std::max(x, cur + x)\`) and the best seen anywhere. Start both from \`nums[0]\` after checking \`empty()\`, use \`long long\` because signed overflow is undefined behaviour, and track a start index to return the subarray. Kadane is O(n) time and O(1) space, against O(n²) and O(n³) for the brute forces; its proof and the divide-and-conquer alternative are on the companion page.`,
        examples: [
          {
            label: "Kadane with the winning subarray and its indices, against the start-at-zero bug",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <tuple>
#include <vector>

// Kadane: returns {best sum, start, end} for a non-empty vector
std::tuple<int, int, int> maxSubarray(const std::vector<int>& nums) {
    int best = nums[0], cur = nums[0];            // start from the first element, NOT from 0
    int start = 0, bestStart = 0, bestEnd = 0;
    for (int i = 1; i < static_cast<int>(nums.size()); i++) {
        if (cur < 0) {                            // a negative running sum only hurts: restart here
            cur = nums[i];
            start = i;
        } else {                                  // otherwise extend the current run
            cur += nums[i];
        }
        if (cur > best) {
            best = cur;
            bestStart = start;
            bestEnd = i;
        }
    }
    return {best, bestStart, bestEnd};
}

// the classic bug: best and cur start at 0, so an all-negative vector returns 0
int buggyMaxSubarray(const std::vector<int>& nums) {
    int best = 0, cur = 0;
    for (int x : nums) {
        cur = std::max(0, cur + x);
        best = std::max(best, cur);
    }
    return best;
}

std::string fmt(std::vector<int>::const_iterator first, std::vector<int>::const_iterator last) {
    std::string s = "[";
    for (auto it = first; it != last; ++it) s += (it == first ? "" : ", ") + std::to_string(*it);
    return s + "]";
}

int main() {
    std::vector<std::vector<int>> tests = {{-2, 1, -3, 4, -1, 2, 1, -5, 4}, {1}, {5, 4, -1, 7, 8}, {-3, -1, -2}, {-2, -1}, {0, -3, 0}};
    for (const auto& nums : tests) {
        auto [best, s, e] = maxSubarray(nums);
        std::cout << fmt(nums.begin(), nums.end()) << " -> " << best << ", subarray "
                  << fmt(nums.begin() + s, nums.begin() + e + 1) << " at [" << s << ".." << e
                  << "] | start-at-0 version says " << buggyMaxSubarray(nums) << "\\n";
    }
    return 0;
}
`,
          },
          {
            label: "Four methods side by side: O(n^3), O(n^2), prefix sums and Kadane, with addition counts",
            code: `#include <algorithm>
#include <iostream>
#include <vector>

long long ops;                                    // additions performed by the last call

int cubic(const std::vector<int>& nums) {
    // try every (i, j) and add nums[i..j] from scratch: O(n^3)
    int n = static_cast<int>(nums.size()), best = nums[0];
    for (int i = 0; i < n; i++) {
        for (int j = i; j < n; j++) {
            int s = 0;
            for (int k = i; k <= j; k++) {
                s += nums[k];
                ops++;
            }
            best = std::max(best, s);
        }
    }
    return best;
}

int quadratic(const std::vector<int>& nums) {
    // fix the start i, extend j and keep a running sum: O(n^2)
    int n = static_cast<int>(nums.size()), best = nums[0];
    for (int i = 0; i < n; i++) {
        int s = 0;
        for (int j = i; j < n; j++) {
            s += nums[j];
            ops++;
            best = std::max(best, s);
        }
    }
    return best;
}

int prefixMin(const std::vector<int>& nums) {
    // sum(i..j) = prefix[j + 1] - prefix[i]; subtract the smallest earlier prefix: O(n)
    int best = nums[0], prefix = 0, smallest = 0;
    for (int x : nums) {
        prefix += x;
        ops++;
        best = std::max(best, prefix - smallest);
        smallest = std::min(smallest, prefix);
    }
    return best;
}

int kadane(const std::vector<int>& nums) {
    int best = nums[0], cur = nums[0];
    ops++;
    for (size_t i = 1; i < nums.size(); i++) {
        cur = std::max(nums[i], cur + nums[i]);   // extend the run or start fresh at nums[i]
        best = std::max(best, cur);
        ops++;
    }
    return best;
}

long long seed = 7;

int nextRand(int limit) {
    // Park-Miller generator, so all four languages see the same arrays
    seed = seed * 48271 % 2147483647;
    return static_cast<int>(seed % limit);
}

std::vector<int> randomArray(int n) {
    std::vector<int> a(n);
    for (int i = 0; i < n; i++) a[i] = nextRand(101) - 50;   // values in -50..50
    return a;
}

int main() {
    std::cout << std::boolalpha;
    for (int n : {10, 100, 300}) {
        std::vector<int> nums = randomArray(n);
        ops = 0; int a = cubic(nums); long long opsA = ops;
        ops = 0; int b = quadratic(nums); long long opsB = ops;
        ops = 0; int c = prefixMin(nums); long long opsC = ops;
        ops = 0; int d = kadane(nums); long long opsD = ops;
        bool same = a == b && b == c && c == d;
        std::cout << "n=" << n << ": cubic " << opsA << " additions | quadratic " << opsB
                  << " | prefix sums " << opsC << " | kadane " << opsD << " | best " << d << ", all agree: " << same << "\\n";
    }
    int agree = 0;
    for (int t = 0; t < 500; t++) {
        std::vector<int> nums = randomArray(1 + nextRand(30));
        int a = cubic(nums), b = quadratic(nums), c = prefixMin(nums), d = kadane(nums);
        if (a == b && b == c && c == d) agree++;
    }
    std::cout << "all four methods agree on " << agree << " of 500 random arrays\\n";
    return 0;
}
`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Maximum subarray (Kadane) vs divide-and-conquer — proof of correctness?",
    difficulty: "medium",
    seoDescription: "Kadane vs divide and conquer for maximum subarray in Python, JavaScript, Java and C++: both correctness proofs, O(n) vs O(n log n), verified.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You know Kadane's algorithm for the maximum subarray sum. Can you prove it is correct? Then describe a divide-and-conquer algorithm for the same problem, prove that one too, and compare them. Sketch both in Python."

**What a strong answer should cover:**
- Kadane's loop invariants (best sum ending at i, best so far) with initialisation, maintenance and termination, and the lemma \`E(i) = max(a[i], E(i-1) + a[i])\` proved by an exchange argument.
- Divide and conquer: the left / right / crossing case split, why the crossing sum is best suffix + best prefix, and the strong-induction proof.
- Costs: T(n) = 2T(n/2) + O(n) = O(n log n) for the crossing version versus O(n) and O(1) space for Kadane.
- The four-value (total, prefix, suffix, best) combine that makes divide and conquer O(n) and becomes a segment tree for range queries.
- Python specifics: \`(lo + hi) // 2\` is safe because ints do not overflow, recursion depth is only about log₂ n, and passing bounds instead of slicing avoids copies.

**Code / implementation expected:** Optional — the proofs matter most; a Python sketch of the crossing-sum recursion and Kadane's loop is a strong finish.`,
        answer: `**Target Audience:** Candidates who already know Kadane's algorithm and want to explain why it works and how it compares.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two friends want to find the most profitable run of consecutive days in a year of shop takings.

The first friend tears the ledger in half and hands one half to each of two helpers: "Find the best run in your half." Each helper tears their half again, and so on, until everyone holds a single day. Then the answers come back up. At each join, the best run is either entirely in the left piece, entirely in the right piece, or it **crosses the tear** — and the crossing one is easy to find by walking outwards from the tear. That is **divide and conquer**.

The second friend reads the ledger once, top to bottom, keeping two numbers on a sticky note: "best run that ends today" and "best run so far". That is **Kadane's algorithm** — the one-pass method from [how do you find the maximum subarray sum](/interview-question/how-do-you-find-the-maximum-subarray-sum).

Both get the right answer. The interview question is: **why** are they right, what does each cost, and when would you choose the slower-looking one? Being able to *prove* an algorithm correct — not just test it — is what separates a senior answer here.

## 2. Divide and Conquer: the Three Places the Answer Can Be

📌 **Interview term: Divide and conquer** — split the input into independent parts, solve each part recursively, then combine the part answers. [Merge sort](/interview-question/how-do-merge-sort-and-quicksort-work) is the textbook example.

Split \`a[lo..hi]\` at \`mid\`. Any subarray of \`a[lo..hi]\` is in exactly one of three places:

1. entirely in the **left** half \`a[lo..mid]\`,
2. entirely in the **right** half \`a[mid+1..hi]\`, or
3. it **crosses** the middle: it contains both \`a[mid]\` and \`a[mid+1]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Array split at mid into a left half and a right half. A crossing subarray is a best suffix of the left half ending at mid joined to a best prefix of the right half starting at mid plus 1">
  <rect class="d-box" x="40" y="40" width="320" height="50" rx="8"/>
  <text class="d-text" x="200" y="70" text-anchor="middle">left half a[lo..mid]</text>
  <rect class="d-box" x="400" y="40" width="320" height="50" rx="8"/>
  <text class="d-text" x="560" y="70" text-anchor="middle">right half a[mid+1..hi]</text>
  <line class="d-edge-dashed" x1="380" y1="20" x2="380" y2="200"/>
  <rect class="d-box-accent" x="200" y="130" width="160" height="44" rx="8"/>
  <text class="d-text" x="280" y="157" text-anchor="middle">best suffix</text>
  <rect class="d-box-accent" x="400" y="130" width="200" height="44" rx="8"/>
  <text class="d-text" x="500" y="157" text-anchor="middle">best prefix</text>
  <text class="d-sub" x="280" y="196" text-anchor="middle">ends exactly at mid</text>
  <text class="d-sub" x="500" y="196" text-anchor="middle">starts exactly at mid + 1</text>
</svg>

Cases 1 and 2 are the same problem on half the input — recurse. Case 3 is special: a crossing subarray is \`a[i..mid] + a[mid+1..j]\`, and the two pieces can be chosen **independently**, so the best crossing sum is (the best suffix of the left half that ends at \`mid\`) + (the best prefix of the right half that starts at \`mid + 1\`). Each is found by one walk outward from the middle.

📌 **Interview term: Crossing subarray** — a subarray that contains both \`a[mid]\` and \`a[mid + 1]\`; its best sum is best-suffix-ending-at-mid plus best-prefix-starting-at-mid+1.

📌 **Interview term: Recurrence relation (running time)** — an equation for the cost on size n in terms of smaller sizes. Here T(n) = 2T(n/2) + O(n): two half-size calls plus a linear walk for the crossing sum. That solves to **O(n log n)** — there are about log₂ n levels of halving and each level walks n elements in total. Example 1 measures it: for n = 1024 the crossing walks touched 10,240 elements (1024 × 10), and for n = 65536 they touched 1,048,576 (65536 × 16).

📌 **Interview term: Master theorem** — the standard rule for recurrences of the form T(n) = a·T(n/b) + f(n). With a = 2, b = 2 and f(n) = Θ(n) it gives Θ(n log n), the same as merge sort.

### Why divide and conquer is correct (proof by strong induction)

📌 **Interview term: Strong induction** — prove a statement for size n assuming it holds for **every** smaller size.

- **Base case.** One element: the only non-empty subarray is that element, which is what the code returns.
- **Inductive step.** Assume the algorithm is correct on every array shorter than n (n ≥ 2), and let S be a best subarray of \`a[lo..hi]\`. S lies in exactly one of the three places.
  - If S is in the left half, the recursive call on the left half is correct (shorter array) and returns sum(S), since no subarray of the left half beats S. Same for the right half.
  - If S crosses, write S = L + R with L ending at \`mid\` and R starting at \`mid + 1\`. If some suffix L′ ending at \`mid\` had a larger sum than L, then L′ + R would be a crossing subarray beating S — impossible. So sum(L) is the best suffix sum, and likewise sum(R) is the best prefix sum, and the crossing computation returns exactly sum(S).
  - The code returns the max of the three candidates. Each candidate is the sum of a real subarray (so it is ≤ sum(S)), and the candidate for S's case equals sum(S). So the max is sum(S).

The argument "if a piece were not optimal, swap in a better piece and the whole gets better" has a name:

📌 **Interview term: Cut-and-paste (exchange) argument** — to show an optimal solution contains optimal sub-solutions, assume a piece is not optimal, replace it by a better one, and derive a contradiction. It is the standard proof of optimal substructure.

## 3. The O(n) Divide and Conquer: Return Four Numbers

The crossing walk is what makes divide and conquer O(n log n). It can be removed: let each recursive call return four numbers about its segment instead of one.

📌 **Interview term: Segment summary (four values)** — for a segment, \`total\` (sum of all), \`prefix\` (best sum starting at its left end), \`suffix\` (best sum ending at its right end) and \`best\` (best subarray anywhere inside).

Two neighbouring segments L and R combine in O(1):

- \`total = L.total + R.total\`
- \`prefix = max(L.prefix, L.total + R.prefix)\` — either stays inside L, or takes all of L and continues into R
- \`suffix = max(R.suffix, R.total + L.suffix)\`
- \`best = max(L.best, R.best, L.suffix + R.prefix)\` — the last term is the crossing case, now free

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Two segment summaries L and R, each with total, prefix, suffix and best, combine into a parent summary">
  <defs>
    <marker id="b27q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="250" height="80" rx="10"/>
  <text class="d-text" x="165" y="62" text-anchor="middle">L segment</text>
  <text class="d-sub" x="165" y="86" text-anchor="middle">total, prefix, suffix, best</text>
  <rect class="d-box" x="470" y="30" width="250" height="80" rx="10"/>
  <text class="d-text" x="595" y="62" text-anchor="middle">R segment</text>
  <text class="d-sub" x="595" y="86" text-anchor="middle">total, prefix, suffix, best</text>
  <path class="d-edge" d="M 165 112 L 300 158" marker-end="url(#b27q5-arrow)"/>
  <path class="d-edge" d="M 595 112 L 460 158" marker-end="url(#b27q5-arrow)"/>
  <rect class="d-box-accent" x="200" y="162" width="360" height="70" rx="10"/>
  <text class="d-text" x="380" y="190" text-anchor="middle">parent segment</text>
  <text class="d-sub" x="380" y="214" text-anchor="middle">best = max(L.best, R.best, L.suffix + R.prefix)</text>
</svg>

Now T(n) = 2T(n/2) + O(1) = **O(n)**: one call per node of a binary tree with n leaves, 2n - 1 calls in all. Example 1 counts 2,047 calls for n = 1024 and 131,071 for n = 65536.

The correctness proof is the same induction, applied to all four values (each formula is a case split on "does the best prefix / suffix / subarray stay on one side or cross?").

📌 **Interview term: Segment tree** — a binary tree over an array where each node stores a summary of its segment. Storing these four values per node answers "maximum subarray sum inside \`a[l..r]\`" in O(log n) per query, with O(log n) updates — something a single Kadane pass cannot do. This is the real reason to learn the divide-and-conquer form.

## 4. Why Kadane Is Correct: a Loop Invariant

Kadane keeps two numbers while scanning left to right:

~~~text
cur  = a[0], best = a[0]
for i = 1 .. n-1:
    cur  = max(a[i], cur + a[i])
    best = max(best, cur)
~~~

📌 **Interview term: Loop invariant** — a statement that is true before the loop starts and after every iteration. If it is true at the end, and it implies the answer, the loop is correct. A proof has three parts: initialisation, maintenance, termination.

**The invariants.** After processing index \`i\`:

- (I1) \`cur\` = E(i), the largest sum of a subarray that **ends exactly at \`i\`**.
- (I2) \`best\` = the largest sum of any subarray inside \`a[0..i]\`.

**The key lemma.** E(i) = max(a[i], E(i - 1) + a[i]).

*Proof.* A subarray ending at \`i\` is either just \`[a[i]]\`, or \`a[k..i]\` with k < i, which is \`a[k..i-1]\` (a subarray ending at \`i - 1\`) plus \`a[i]\`. In the second case the sum is at most E(i - 1) + a[i], and that value is achieved by extending the best subarray ending at \`i - 1\`. So the best of all subarrays ending at \`i\` is the larger of the two options. (This is the cut-and-paste argument again: an optimal subarray ending at \`i\` that is longer than one element must start with an optimal subarray ending at \`i - 1\`.)

- **Initialisation (i = 0).** The only subarray ending at 0 is \`[a[0]]\`, and the only subarray inside \`a[0..0]\` is the same one, so \`cur = best = a[0]\` makes both invariants true.
- **Maintenance.** Assume both hold after \`i - 1\`. The update \`cur = max(a[i], cur + a[i])\` is exactly the lemma, so (I1) holds for \`i\`. Every subarray inside \`a[0..i]\` either lies inside \`a[0..i-1]\` (its sum is at most the old \`best\`) or ends at \`i\` (its sum is at most the new \`cur\`), and both values are achieved, so \`best = max(best, cur)\` makes (I2) hold for \`i\`.
- **Termination.** After \`i = n - 1\`, (I2) says \`best\` is the largest sum of any subarray of the whole array. ∎

Example 2 checks both invariants against brute force at every position: on the classic array and on 200 random arrays, they held at all 2,776 positions.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="The best subarray ending at i is either the single element a i, or the best subarray ending at i minus 1 extended by a i">
  <rect class="d-box-muted" x="40" y="40" width="340" height="46" rx="8"/>
  <text class="d-text" x="210" y="68" text-anchor="middle">best subarray ending at i - 1</text>
  <rect class="d-box-accent" x="400" y="40" width="90" height="46" rx="8"/>
  <text class="d-text" x="445" y="68" text-anchor="middle">a[i]</text>
  <rect class="d-box-accent" x="560" y="40" width="90" height="46" rx="8"/>
  <text class="d-text" x="605" y="68" text-anchor="middle">a[i]</text>
  <text class="d-sub" x="265" y="120" text-anchor="middle">option 1: extend, sum E(i - 1) + a[i]</text>
  <text class="d-sub" x="605" y="120" text-anchor="middle">option 2: start fresh</text>
  <rect class="d-box" x="200" y="146" width="360" height="40" rx="8"/>
  <text class="d-text" x="380" y="171" text-anchor="middle">E(i) = max of the two options</text>
</svg>

Option 2 wins exactly when E(i - 1) is negative — the "drop a negative running sum" rule.

📌 **Interview term: Kadane as dynamic programming** — E(i) is a DP state, the lemma is its recurrence, and E(0) = a[0] its base case. Because each state reads only the previous one, the table shrinks to one variable. See [what is dynamic programming](/interview-question/what-is-dynamic-programming).

## 5. Kadane vs Divide and Conquer

| | Kadane | Divide and conquer (crossing sum) | Divide and conquer (four values) |
| :--- | :--- | :--- | :--- |
| Time | O(n) | O(n log n) | O(n) |
| Extra space | O(1) | O(log n) recursion stack | O(log n) stack |
| Work in Example 1, n = 65536 | 65,536 steps | 1,048,576 elements walked | 131,071 calls |
| Proof technique | Loop invariant | Strong induction + exchange argument | Strong induction on four values |
| Streaming (one pass, data arrives once) | Yes | No | No |
| Range queries with updates | No (rescan O(n) per query) | — | Yes, as a segment tree: O(log n) |
| Parallel | Hard (sequential dependency) | Halves run independently | Halves run independently |
| What to write in an interview | This | Explain on request | Mention for follow-ups |

**History, briefly.** Jon Bentley's *Programming Pearls* column in Communications of the ACM 27(9), 1984, presented this problem with four algorithms of cost O(n³), O(n²), O(n log n) and O(n). Secondary accounts of that column ([Shin-Cheng Mu's summary](https://scm.iis.sinica.edu.tw/home/2010/maximum-segment-sum-origin-and-derivation/), [the WCIPEG wiki](https://wcipeg.com/wiki/Max_subvector_sum)) say the problem came from Ulf Grenander's pattern-recognition work, the divide-and-conquer method from Michael Shamos, and the linear method from Jay Kadane. The original column was not consulted directly for this page.

## 6. The Python Code

The crossing-sum divide and conquer (counter lines removed):

~~~python
def crossing_dc(a, lo, hi):
    if lo == hi:
        return a[lo]
    mid = (lo + hi) // 2
    left_best = crossing_dc(a, lo, mid)
    right_best = crossing_dc(a, mid + 1, hi)
    s, best_suffix = 0, a[mid]
    for i in range(mid, lo - 1, -1):      # best sum ending exactly at mid
        s += a[i]
        best_suffix = max(best_suffix, s)
    s, best_prefix = 0, a[mid + 1]
    for j in range(mid + 1, hi + 1):      # best sum starting exactly at mid + 1
        s += a[j]
        best_prefix = max(best_prefix, s)
    return max(left_best, right_best, best_suffix + best_prefix)
~~~

The four-value version returns a tuple and unpacks it:

~~~python
def four_value_dc(a, lo, hi):
    if lo == hi:
        return a[lo], a[lo], a[lo], a[lo]
    mid = (lo + hi) // 2
    lt, lp, ls, lb = four_value_dc(a, lo, mid)
    rt, rp, rs, rb = four_value_dc(a, mid + 1, hi)
    return (lt + rt, max(lp, lt + rp), max(rs, rt + ls), max(lb, rb, ls + rp))
~~~

Python notes:

- **\`(lo + hi) // 2\`** — floor division; Python integers cannot overflow, so the \`lo + (hi - lo) // 2\` trick needed in Java and C++ is unnecessary here.
- **\`best_suffix = a[mid]\`, not 0** — the crossing subarray must contain \`a[mid]\` and \`a[mid + 1]\`. Starting at 0 would allow an *empty* side, and on an all-negative array the "crossing" sum would become 0, a sum no non-empty subarray has.
- **\`range(mid, lo - 1, -1)\`** walks leftwards and includes \`lo\`; the stop value is exclusive.
- **\`max(lb, rb, ls + rp)\`** — the built-in takes any number of arguments.
- **Recursion depth is only about log₂ n** (17 levels for 65,536 elements), far below Python's default limit of 1000, so recursion is safe here — unlike the O(n)-deep recursions on other DP pages.
- **Tuples are cheap to build and unpack**, but each call still allocates one, and every call is a Python function call; the four-value version is O(n) like Kadane, but with a larger constant factor (its speed was not benchmarked here).

## 7. Verified: Running the Code

Each example below was saved to a file and run with \`python3 main.py\` (Python 3.13). The same programs in the other three languages print exactly the same lines.

**Example 1 — Crossing-sum divide and conquer, four-value divide and conquer and Kadane: answers and work counted** printed:

~~~text
classic array: brute 6 | crossing d&c 6 | four-value d&c 6 | kadane 6
n=1024: crossing d&c scanned 10240 elements | four-value d&c made 2047 calls | kadane 1024 steps | answers 2286 2286 2286
n=65536: crossing d&c scanned 1048576 elements | four-value d&c made 131071 calls | kadane 65536 steps | answers 8092 8092 8092
brute force, both d&c versions and kadane agree on 500 of 500 random arrays
~~~

**Example 2 — Kadane loop invariants checked against brute force at every step** printed:

~~~text
i=0 x=-2 | cur=-2 best=-2 | brute: ending here -2, anywhere so far -2 | ok
i=1 x=1 | cur=1 best=1 | brute: ending here 1, anywhere so far 1 | ok
i=2 x=-3 | cur=-2 best=1 | brute: ending here -2, anywhere so far 1 | ok
i=3 x=4 | cur=4 best=4 | brute: ending here 4, anywhere so far 4 | ok
i=4 x=-1 | cur=3 best=4 | brute: ending here 3, anywhere so far 4 | ok
i=5 x=2 | cur=5 best=5 | brute: ending here 5, anywhere so far 5 | ok
i=6 x=1 | cur=6 best=6 | brute: ending here 6, anywhere so far 6 | ok
i=7 x=-5 | cur=1 best=6 | brute: ending here 1, anywhere so far 6 | ok
i=8 x=4 | cur=5 best=6 | brute: ending here 5, anywhere so far 6 | ok
both invariants held at 2776 of 2776 positions in 200 random arrays
~~~

Example 1: the crossing-sum recursion walked exactly n·log₂ n elements (10,240 for n = 1024, 1,048,576 for n = 65536), the four-value recursion made 2n - 1 calls, and all methods — including an O(n²) brute force — agreed on the classic array and on 500 random arrays. Example 2: every row of the trace has \`cur\` equal to the brute-force best sum ending at i and \`best\` equal to the brute-force best so far, which is the loop invariant made visible; on 200 random arrays it held at all 2,776 positions. The random arrays come from a Park–Miller generator built into each program, so all four languages test identical inputs.

## 8. Complexity

| Method | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | Every start, running sum over every end |
| Crossing-sum divide and conquer | O(n log n) | O(log n) | log₂ n levels, n elements walked per level |
| Four-value divide and conquer | O(n) | O(log n) | 2n - 1 calls, O(1) combine each |
| Kadane | O(n) | O(1) | One pass, two variables |
| Segment tree query (four values) | O(log n) per query | O(n) tree | Combine O(log n) stored summaries |

## 9. Edge Cases

- **One element** — the base case of both proofs; all methods return it.
- **All negative** — the answer is the largest element; the crossing sums must start from \`a[mid]\` / \`a[mid + 1]\`, and Kadane from \`a[0]\`.
- **Odd lengths** — \`mid\` rounds down, so the left half gets the extra element; the proof does not care where the split is, only that both halves are non-empty.
- **Ties** — several subarrays may share the best sum; the proofs are about the value, and which one is reported depends on \`>\` versus \`>=\`.
- **Huge n** — both recursions are only about log₂ n deep, so stack depth is not a concern; sum overflow is (see the language notes).

## Common Pitfalls

- **Initialising the crossing sums with 0.** That allows an empty side, and an all-negative array reports 0. Start from \`a[mid]\` and \`a[mid + 1]\`.
- **Off-by-one in the walks.** The left walk must include \`lo\` (\`range(mid, lo - 1, -1)\`), the right walk must include \`hi\`.
- **Slicing instead of passing bounds.** \`crossing_dc(a[:mid])\` copies the list at every level: O(n log n) extra copying and memory.
- **Calling the invariant proof "obvious".** State the lemma E(i) = max(a[i], E(i-1) + a[i]) and prove it with the exchange argument.
- **Claiming D&C is "faster because it is recursive".** The crossing version is O(n log n), slower than Kadane; its value is the four-value form for segment trees and parallel work.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Divide and conquer:</strong> <span style="color:#f0e2c8;">Split at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code>; the best subarray is in the left half, the right half, or crosses the middle. The crossing one is best suffix ending at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> plus best prefix starting at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid + 1</code>, found by walking outwards.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Its cost and proof:</strong> <span style="color:#f0e2c8;">T(n) = 2T(n/2) + O(n) = O(n log n). Correct by strong induction: the optimal subarray is in one of the three cases, and in the crossing case each half-piece must itself be optimal or we could swap in a better one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Kadane proof:</strong> <span style="color:#f0e2c8;">Loop invariant: after index i, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur</code> is the best sum ending at i and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> the best inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[0..i]</code>. The lemma <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">E(i) = max(a[i], E(i-1) + a[i])</code> gives maintenance; at the end <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> is the answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Comparison:</strong> <span style="color:#f0e2c8;">Kadane is O(n) time, O(1) space and streaming, so it is what I would code. The crossing D&C is O(n log n) but parallelises.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why D&C still matters:</strong> <span style="color:#f0e2c8;">Returning four values per segment — total, prefix, suffix, best — makes D&C O(n) and is exactly the segment tree node for O(log n) range maximum-subarray queries.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the crossing sums start from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a[mid]</code> and not 0?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A crossing subarray contains both middle elements. Starting at 0 allows an empty side, and on all-negative input the code would return 0, which no non-empty subarray sums to.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Prove that <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">E(i) = max(a[i], E(i-1) + a[i])</code>.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A subarray ending at i is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[a[i]]</code> or a subarray ending at i - 1 plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i]</code>; the best of the latter extends the best ending at i - 1, by the exchange argument.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Kadane greedy or DP?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a DP with state E(i) and a one-entry table; the restart rule looks greedy, but it is justified by the recurrence, not by a local-choice argument.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did you test the proofs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Example 2 checks both invariants against brute force at every step; they held at all 2,776 positions. Example 1 compares all methods on 500 random arrays.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you answer range queries with updates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A segment tree storing (total, prefix, suffix, best) per node; combine with the four formulas, O(log n) per query and update.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Divide and conquer** | Split into independent parts, solve recursively, combine |
| **Crossing subarray** | Contains a[mid] and a[mid + 1]; best = best suffix ending at mid + best prefix from mid + 1 |
| **Recurrence relation (running time)** | Cost equation such as T(n) = 2T(n/2) + O(n) |
| **Master theorem** | Rule solving T(n) = aT(n/b) + f(n); here gives Θ(n log n) |
| **Strong induction** | Prove for size n assuming the claim for every smaller size |
| **Cut-and-paste (exchange) argument** | Replace a non-optimal piece with a better one to reach a contradiction |
| **Segment summary (four values)** | total, best prefix, best suffix, best inside — combinable in O(1) |
| **Segment tree** | Binary tree of segment summaries answering range queries in O(log n) |
| **Loop invariant** | A statement true before the loop and after every iteration; proved by initialisation, maintenance, termination |
| **Kadane as dynamic programming** | State E(i) = best sum ending at i, recurrence E(i) = max(a[i], E(i - 1) + a[i]) |

---
**Conclusion:** Kadane's algorithm is correct because of one lemma — the best subarray ending at i is either \`[a[i]]\` or the best ending at i - 1 extended by \`a[i]\` — wrapped in a loop invariant; divide and conquer is correct by strong induction on the left / right / crossing case split. Kadane is O(n) time and O(1) space and is what you code; the crossing-sum recursion is O(n log n), and its four-value form is O(n) and powers segment-tree range queries. In Python both recursions are shallow (about log₂ n deep), and the verified runs show every method agreeing and both invariants holding at every step.`,
        examples: [
          {
            label: "Crossing-sum divide and conquer, four-value divide and conquer and Kadane: answers and work counted",
            code: `touched = 0                               # elements scanned while computing crossing sums
calls = 0                                 # calls made by the four-value version


def crossing_dc(a, lo, hi):
    """Classic divide and conquer, O(n log n): best = left, right, or crossing the middle."""
    global touched
    if lo == hi:
        return a[lo]
    mid = (lo + hi) // 2
    left_best = crossing_dc(a, lo, mid)
    right_best = crossing_dc(a, mid + 1, hi)
    s, best_suffix = 0, a[mid]
    for i in range(mid, lo - 1, -1):      # best sum ending exactly at mid
        s += a[i]
        best_suffix = max(best_suffix, s)
    s, best_prefix = 0, a[mid + 1]
    for j in range(mid + 1, hi + 1):      # best sum starting exactly at mid + 1
        s += a[j]
        best_prefix = max(best_prefix, s)
    touched += hi - lo + 1
    return max(left_best, right_best, best_suffix + best_prefix)


def four_value_dc(a, lo, hi):
    """Returns (total, best prefix, best suffix, best) for a[lo..hi], O(n) overall."""
    global calls
    calls += 1
    if lo == hi:
        return a[lo], a[lo], a[lo], a[lo]
    mid = (lo + hi) // 2
    lt, lp, ls, lb = four_value_dc(a, lo, mid)
    rt, rp, rs, rb = four_value_dc(a, mid + 1, hi)
    return (lt + rt, max(lp, lt + rp), max(rs, rt + ls), max(lb, rb, ls + rp))


def kadane(a):
    best = cur = a[0]
    for x in a[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    return best


def brute(a):
    best = a[0]
    for i in range(len(a)):
        s = 0
        for j in range(i, len(a)):
            s += a[j]
            best = max(best, s)
    return best


seed = 99


def next_rand(limit):
    """Park-Miller generator, so all four languages see the same arrays."""
    global seed
    seed = seed * 48271 % 2147483647
    return seed % limit


def random_array(n):
    return [next_rand(201) - 100 for _ in range(n)]  # values in -100..100


a = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
print("classic array: brute " + str(brute(a)) + " | crossing d&c " + str(crossing_dc(a, 0, len(a) - 1))
      + " | four-value d&c " + str(four_value_dc(a, 0, len(a) - 1)[3]) + " | kadane " + str(kadane(a)))

for n in [1024, 65536]:
    a = random_array(n)
    touched, calls = 0, 0
    x = crossing_dc(a, 0, n - 1)
    y = four_value_dc(a, 0, n - 1)[3]
    print("n=" + str(n) + ": crossing d&c scanned " + str(touched) + " elements | four-value d&c made "
          + str(calls) + " calls | kadane " + str(n) + " steps | answers " + str(x) + " " + str(y) + " " + str(kadane(a)))

agree = 0
for t in range(500):
    a = random_array(1 + next_rand(40))
    r = {brute(a), crossing_dc(a, 0, len(a) - 1), four_value_dc(a, 0, len(a) - 1)[3], kadane(a)}
    if len(r) == 1:
        agree += 1
print("brute force, both d&c versions and kadane agree on " + str(agree) + " of 500 random arrays")
`,
          },
          {
            label: "Kadane loop invariants checked against brute force at every step",
            code: `def best_ending_at(a, i):
    """Brute force: the largest sum of a[k..i] over every k <= i."""
    s, best = 0, a[i]
    for k in range(i, -1, -1):
        s += a[k]
        best = max(best, s)
    return best


def best_within(a, i):
    """Brute force: the largest sum of any subarray inside a[0..i]."""
    return max(best_ending_at(a, j) for j in range(i + 1))


def kadane_checked(a, trace):
    """Kadane, checking both loop invariants after every step."""
    cur = best = a[0]
    held = 0
    for i in range(len(a)):
        if i > 0:
            cur = max(a[i], cur + a[i])
            best = max(best, cur)
        ok = cur == best_ending_at(a, i) and best == best_within(a, i)
        held += ok
        if trace:
            print("i=" + str(i) + " x=" + str(a[i]) + " | cur=" + str(cur) + " best=" + str(best)
                  + " | brute: ending here " + str(best_ending_at(a, i)) + ", anywhere so far "
                  + str(best_within(a, i)) + " | " + ("ok" if ok else "BROKEN"))
    return held


a = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
kadane_checked(a, True)

seed = 123


def next_rand(limit):
    """Park-Miller generator, so all four languages see the same arrays."""
    global seed
    seed = seed * 48271 % 2147483647
    return seed % limit


held = positions = 0
for t in range(200):
    n = 1 + next_rand(25)
    arr = [next_rand(41) - 20 for _ in range(n)]
    held += kadane_checked(arr, False)
    positions += n
print("both invariants held at " + str(held) + " of " + str(positions) + " positions in 200 random arrays")
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You know Kadane's algorithm for the maximum subarray sum. Can you prove it is correct? Then describe a divide-and-conquer algorithm for the same problem, prove that one too, and compare them. Sketch both in JavaScript."

**What a strong answer should cover:**
- Kadane's loop invariants (best sum ending at i, best so far) with initialisation, maintenance and termination, and the lemma \`E(i) = max(a[i], E(i-1) + a[i])\` proved by an exchange argument.
- Divide and conquer: the left / right / crossing case split, why the crossing sum is best suffix + best prefix, and the strong-induction proof.
- Costs: T(n) = 2T(n/2) + O(n) = O(n log n) for the crossing version versus O(n) and O(1) space for Kadane.
- The four-value (total, prefix, suffix, best) combine that makes divide and conquer O(n) and becomes a segment tree for range queries.
- JavaScript specifics: \`Math.floor\` for the midpoint (plain \`/\` gives a fractional index and \`NaN\` sums), and objects or arrays to return the four values.

**Code / implementation expected:** Optional — the proofs matter most; a JavaScript sketch of the crossing-sum recursion and Kadane's loop is a strong finish.`,
        answer: `**Target Audience:** Candidates who already know Kadane's algorithm and want to explain why it works and how it compares.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two friends want to find the most profitable run of consecutive days in a year of shop takings.

The first friend tears the ledger in half and hands one half to each of two helpers: "Find the best run in your half." Each helper tears their half again, and so on, until everyone holds a single day. Then the answers come back up. At each join, the best run is either entirely in the left piece, entirely in the right piece, or it **crosses the tear** — and the crossing one is easy to find by walking outwards from the tear. That is **divide and conquer**.

The second friend reads the ledger once, top to bottom, keeping two numbers on a sticky note: "best run that ends today" and "best run so far". That is **Kadane's algorithm** — the one-pass method from [how do you find the maximum subarray sum](/interview-question/how-do-you-find-the-maximum-subarray-sum).

Both get the right answer. The interview question is: **why** are they right, what does each cost, and when would you choose the slower-looking one? Being able to *prove* an algorithm correct — not just test it — is what separates a senior answer here.

## 2. Divide and Conquer: the Three Places the Answer Can Be

📌 **Interview term: Divide and conquer** — split the input into independent parts, solve each part recursively, then combine the part answers. [Merge sort](/interview-question/how-do-merge-sort-and-quicksort-work) is the textbook example.

Split \`a[lo..hi]\` at \`mid\`. Any subarray of \`a[lo..hi]\` is in exactly one of three places:

1. entirely in the **left** half \`a[lo..mid]\`,
2. entirely in the **right** half \`a[mid+1..hi]\`, or
3. it **crosses** the middle: it contains both \`a[mid]\` and \`a[mid+1]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Array split at mid into a left half and a right half. A crossing subarray is a best suffix of the left half ending at mid joined to a best prefix of the right half starting at mid plus 1">
  <rect class="d-box" x="40" y="40" width="320" height="50" rx="8"/>
  <text class="d-text" x="200" y="70" text-anchor="middle">left half a[lo..mid]</text>
  <rect class="d-box" x="400" y="40" width="320" height="50" rx="8"/>
  <text class="d-text" x="560" y="70" text-anchor="middle">right half a[mid+1..hi]</text>
  <line class="d-edge-dashed" x1="380" y1="20" x2="380" y2="200"/>
  <rect class="d-box-accent" x="200" y="130" width="160" height="44" rx="8"/>
  <text class="d-text" x="280" y="157" text-anchor="middle">best suffix</text>
  <rect class="d-box-accent" x="400" y="130" width="200" height="44" rx="8"/>
  <text class="d-text" x="500" y="157" text-anchor="middle">best prefix</text>
  <text class="d-sub" x="280" y="196" text-anchor="middle">ends exactly at mid</text>
  <text class="d-sub" x="500" y="196" text-anchor="middle">starts exactly at mid + 1</text>
</svg>

Cases 1 and 2 are the same problem on half the input — recurse. Case 3 is special: a crossing subarray is \`a[i..mid] + a[mid+1..j]\`, and the two pieces can be chosen **independently**, so the best crossing sum is (the best suffix of the left half that ends at \`mid\`) + (the best prefix of the right half that starts at \`mid + 1\`). Each is found by one walk outward from the middle.

📌 **Interview term: Crossing subarray** — a subarray that contains both \`a[mid]\` and \`a[mid + 1]\`; its best sum is best-suffix-ending-at-mid plus best-prefix-starting-at-mid+1.

📌 **Interview term: Recurrence relation (running time)** — an equation for the cost on size n in terms of smaller sizes. Here T(n) = 2T(n/2) + O(n): two half-size calls plus a linear walk for the crossing sum. That solves to **O(n log n)** — there are about log₂ n levels of halving and each level walks n elements in total. Example 1 measures it: for n = 1024 the crossing walks touched 10,240 elements (1024 × 10), and for n = 65536 they touched 1,048,576 (65536 × 16).

📌 **Interview term: Master theorem** — the standard rule for recurrences of the form T(n) = a·T(n/b) + f(n). With a = 2, b = 2 and f(n) = Θ(n) it gives Θ(n log n), the same as merge sort.

### Why divide and conquer is correct (proof by strong induction)

📌 **Interview term: Strong induction** — prove a statement for size n assuming it holds for **every** smaller size.

- **Base case.** One element: the only non-empty subarray is that element, which is what the code returns.
- **Inductive step.** Assume the algorithm is correct on every array shorter than n (n ≥ 2), and let S be a best subarray of \`a[lo..hi]\`. S lies in exactly one of the three places.
  - If S is in the left half, the recursive call on the left half is correct (shorter array) and returns sum(S), since no subarray of the left half beats S. Same for the right half.
  - If S crosses, write S = L + R with L ending at \`mid\` and R starting at \`mid + 1\`. If some suffix L′ ending at \`mid\` had a larger sum than L, then L′ + R would be a crossing subarray beating S — impossible. So sum(L) is the best suffix sum, and likewise sum(R) is the best prefix sum, and the crossing computation returns exactly sum(S).
  - The code returns the max of the three candidates. Each candidate is the sum of a real subarray (so it is ≤ sum(S)), and the candidate for S's case equals sum(S). So the max is sum(S).

The argument "if a piece were not optimal, swap in a better piece and the whole gets better" has a name:

📌 **Interview term: Cut-and-paste (exchange) argument** — to show an optimal solution contains optimal sub-solutions, assume a piece is not optimal, replace it by a better one, and derive a contradiction. It is the standard proof of optimal substructure.

## 3. The O(n) Divide and Conquer: Return Four Numbers

The crossing walk is what makes divide and conquer O(n log n). It can be removed: let each recursive call return four numbers about its segment instead of one.

📌 **Interview term: Segment summary (four values)** — for a segment, \`total\` (sum of all), \`prefix\` (best sum starting at its left end), \`suffix\` (best sum ending at its right end) and \`best\` (best subarray anywhere inside).

Two neighbouring segments L and R combine in O(1):

- \`total = L.total + R.total\`
- \`prefix = max(L.prefix, L.total + R.prefix)\` — either stays inside L, or takes all of L and continues into R
- \`suffix = max(R.suffix, R.total + L.suffix)\`
- \`best = max(L.best, R.best, L.suffix + R.prefix)\` — the last term is the crossing case, now free

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Two segment summaries L and R, each with total, prefix, suffix and best, combine into a parent summary">
  <defs>
    <marker id="b27q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="250" height="80" rx="10"/>
  <text class="d-text" x="165" y="62" text-anchor="middle">L segment</text>
  <text class="d-sub" x="165" y="86" text-anchor="middle">total, prefix, suffix, best</text>
  <rect class="d-box" x="470" y="30" width="250" height="80" rx="10"/>
  <text class="d-text" x="595" y="62" text-anchor="middle">R segment</text>
  <text class="d-sub" x="595" y="86" text-anchor="middle">total, prefix, suffix, best</text>
  <path class="d-edge" d="M 165 112 L 300 158" marker-end="url(#b27q5-arrow)"/>
  <path class="d-edge" d="M 595 112 L 460 158" marker-end="url(#b27q5-arrow)"/>
  <rect class="d-box-accent" x="200" y="162" width="360" height="70" rx="10"/>
  <text class="d-text" x="380" y="190" text-anchor="middle">parent segment</text>
  <text class="d-sub" x="380" y="214" text-anchor="middle">best = max(L.best, R.best, L.suffix + R.prefix)</text>
</svg>

Now T(n) = 2T(n/2) + O(1) = **O(n)**: one call per node of a binary tree with n leaves, 2n - 1 calls in all. Example 1 counts 2,047 calls for n = 1024 and 131,071 for n = 65536.

The correctness proof is the same induction, applied to all four values (each formula is a case split on "does the best prefix / suffix / subarray stay on one side or cross?").

📌 **Interview term: Segment tree** — a binary tree over an array where each node stores a summary of its segment. Storing these four values per node answers "maximum subarray sum inside \`a[l..r]\`" in O(log n) per query, with O(log n) updates — something a single Kadane pass cannot do. This is the real reason to learn the divide-and-conquer form.

## 4. Why Kadane Is Correct: a Loop Invariant

Kadane keeps two numbers while scanning left to right:

~~~text
cur  = a[0], best = a[0]
for i = 1 .. n-1:
    cur  = max(a[i], cur + a[i])
    best = max(best, cur)
~~~

📌 **Interview term: Loop invariant** — a statement that is true before the loop starts and after every iteration. If it is true at the end, and it implies the answer, the loop is correct. A proof has three parts: initialisation, maintenance, termination.

**The invariants.** After processing index \`i\`:

- (I1) \`cur\` = E(i), the largest sum of a subarray that **ends exactly at \`i\`**.
- (I2) \`best\` = the largest sum of any subarray inside \`a[0..i]\`.

**The key lemma.** E(i) = max(a[i], E(i - 1) + a[i]).

*Proof.* A subarray ending at \`i\` is either just \`[a[i]]\`, or \`a[k..i]\` with k < i, which is \`a[k..i-1]\` (a subarray ending at \`i - 1\`) plus \`a[i]\`. In the second case the sum is at most E(i - 1) + a[i], and that value is achieved by extending the best subarray ending at \`i - 1\`. So the best of all subarrays ending at \`i\` is the larger of the two options. (This is the cut-and-paste argument again: an optimal subarray ending at \`i\` that is longer than one element must start with an optimal subarray ending at \`i - 1\`.)

- **Initialisation (i = 0).** The only subarray ending at 0 is \`[a[0]]\`, and the only subarray inside \`a[0..0]\` is the same one, so \`cur = best = a[0]\` makes both invariants true.
- **Maintenance.** Assume both hold after \`i - 1\`. The update \`cur = max(a[i], cur + a[i])\` is exactly the lemma, so (I1) holds for \`i\`. Every subarray inside \`a[0..i]\` either lies inside \`a[0..i-1]\` (its sum is at most the old \`best\`) or ends at \`i\` (its sum is at most the new \`cur\`), and both values are achieved, so \`best = max(best, cur)\` makes (I2) hold for \`i\`.
- **Termination.** After \`i = n - 1\`, (I2) says \`best\` is the largest sum of any subarray of the whole array. ∎

Example 2 checks both invariants against brute force at every position: on the classic array and on 200 random arrays, they held at all 2,776 positions.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="The best subarray ending at i is either the single element a i, or the best subarray ending at i minus 1 extended by a i">
  <rect class="d-box-muted" x="40" y="40" width="340" height="46" rx="8"/>
  <text class="d-text" x="210" y="68" text-anchor="middle">best subarray ending at i - 1</text>
  <rect class="d-box-accent" x="400" y="40" width="90" height="46" rx="8"/>
  <text class="d-text" x="445" y="68" text-anchor="middle">a[i]</text>
  <rect class="d-box-accent" x="560" y="40" width="90" height="46" rx="8"/>
  <text class="d-text" x="605" y="68" text-anchor="middle">a[i]</text>
  <text class="d-sub" x="265" y="120" text-anchor="middle">option 1: extend, sum E(i - 1) + a[i]</text>
  <text class="d-sub" x="605" y="120" text-anchor="middle">option 2: start fresh</text>
  <rect class="d-box" x="200" y="146" width="360" height="40" rx="8"/>
  <text class="d-text" x="380" y="171" text-anchor="middle">E(i) = max of the two options</text>
</svg>

Option 2 wins exactly when E(i - 1) is negative — the "drop a negative running sum" rule.

📌 **Interview term: Kadane as dynamic programming** — E(i) is a DP state, the lemma is its recurrence, and E(0) = a[0] its base case. Because each state reads only the previous one, the table shrinks to one variable. See [what is dynamic programming](/interview-question/what-is-dynamic-programming).

## 5. Kadane vs Divide and Conquer

| | Kadane | Divide and conquer (crossing sum) | Divide and conquer (four values) |
| :--- | :--- | :--- | :--- |
| Time | O(n) | O(n log n) | O(n) |
| Extra space | O(1) | O(log n) recursion stack | O(log n) stack |
| Work in Example 1, n = 65536 | 65,536 steps | 1,048,576 elements walked | 131,071 calls |
| Proof technique | Loop invariant | Strong induction + exchange argument | Strong induction on four values |
| Streaming (one pass, data arrives once) | Yes | No | No |
| Range queries with updates | No (rescan O(n) per query) | — | Yes, as a segment tree: O(log n) |
| Parallel | Hard (sequential dependency) | Halves run independently | Halves run independently |
| What to write in an interview | This | Explain on request | Mention for follow-ups |

**History, briefly.** Jon Bentley's *Programming Pearls* column in Communications of the ACM 27(9), 1984, presented this problem with four algorithms of cost O(n³), O(n²), O(n log n) and O(n). Secondary accounts of that column ([Shin-Cheng Mu's summary](https://scm.iis.sinica.edu.tw/home/2010/maximum-segment-sum-origin-and-derivation/), [the WCIPEG wiki](https://wcipeg.com/wiki/Max_subvector_sum)) say the problem came from Ulf Grenander's pattern-recognition work, the divide-and-conquer method from Michael Shamos, and the linear method from Jay Kadane. The original column was not consulted directly for this page.

## 6. The JavaScript Code

The crossing-sum divide and conquer (counter lines removed):

~~~javascript
function crossingDC(a, lo, hi) {
  if (lo === hi) return a[lo];
  const mid = Math.floor((lo + hi) / 2);
  const leftBest = crossingDC(a, lo, mid);
  const rightBest = crossingDC(a, mid + 1, hi);
  let s = 0, bestSuffix = a[mid];
  for (let i = mid; i >= lo; i--) {      // best sum ending exactly at mid
    s += a[i];
    bestSuffix = Math.max(bestSuffix, s);
  }
  s = 0;
  let bestPrefix = a[mid + 1];
  for (let j = mid + 1; j <= hi; j++) {  // best sum starting exactly at mid + 1
    s += a[j];
    bestPrefix = Math.max(bestPrefix, s);
  }
  return Math.max(leftBest, rightBest, bestSuffix + bestPrefix);
}
~~~

The four-value version returns an object:

~~~javascript
function fourValueDC(a, lo, hi) {
  if (lo === hi) return { total: a[lo], prefix: a[lo], suffix: a[lo], best: a[lo] };
  const mid = Math.floor((lo + hi) / 2);
  const L = fourValueDC(a, lo, mid);
  const R = fourValueDC(a, mid + 1, hi);
  return {
    total: L.total + R.total,
    prefix: Math.max(L.prefix, L.total + R.prefix),
    suffix: Math.max(R.suffix, R.total + L.suffix),
    best: Math.max(L.best, R.best, L.suffix + R.prefix),
  };
}
~~~

JavaScript notes:

- **\`Math.floor((lo + hi) / 2)\`** — \`/\` is floating-point division, so without \`Math.floor\` the index would be \`4.5\` and \`a[4.5]\` is \`undefined\`. \`(lo + hi) >> 1\` also works but only while \`lo + hi\` fits in 32 bits.
- **\`bestSuffix = a[mid]\`, not 0** — the crossing subarray must be non-empty on both sides; starting at 0 would report 0 on an all-negative array.
- **\`Math.max\` takes any number of arguments**, so the three-way max is one call.
- **Objects with named fields** make the combine formulas readable; returning arrays (\`[total, prefix, suffix, best]\`) is a little faster but easy to mix up.
- **Recursion depth is about log₂ n**, so even huge arrays stay far from the engine stack limit.

## 7. Verified: Running the Code

Each example below was saved to a file and run with \`node main.js\` (Node.js 22; the programs are plain browser-safe scripts, so the page runner prints the same). The same programs in the other three languages print exactly the same lines.

**Example 1 — Crossing-sum divide and conquer, four-value divide and conquer and Kadane: answers and work counted** printed:

~~~text
classic array: brute 6 | crossing d&c 6 | four-value d&c 6 | kadane 6
n=1024: crossing d&c scanned 10240 elements | four-value d&c made 2047 calls | kadane 1024 steps | answers 2286 2286 2286
n=65536: crossing d&c scanned 1048576 elements | four-value d&c made 131071 calls | kadane 65536 steps | answers 8092 8092 8092
brute force, both d&c versions and kadane agree on 500 of 500 random arrays
~~~

**Example 2 — Kadane loop invariants checked against brute force at every step** printed:

~~~text
i=0 x=-2 | cur=-2 best=-2 | brute: ending here -2, anywhere so far -2 | ok
i=1 x=1 | cur=1 best=1 | brute: ending here 1, anywhere so far 1 | ok
i=2 x=-3 | cur=-2 best=1 | brute: ending here -2, anywhere so far 1 | ok
i=3 x=4 | cur=4 best=4 | brute: ending here 4, anywhere so far 4 | ok
i=4 x=-1 | cur=3 best=4 | brute: ending here 3, anywhere so far 4 | ok
i=5 x=2 | cur=5 best=5 | brute: ending here 5, anywhere so far 5 | ok
i=6 x=1 | cur=6 best=6 | brute: ending here 6, anywhere so far 6 | ok
i=7 x=-5 | cur=1 best=6 | brute: ending here 1, anywhere so far 6 | ok
i=8 x=4 | cur=5 best=6 | brute: ending here 5, anywhere so far 6 | ok
both invariants held at 2776 of 2776 positions in 200 random arrays
~~~

Example 1: the crossing-sum recursion walked exactly n·log₂ n elements (10,240 for n = 1024, 1,048,576 for n = 65536), the four-value recursion made 2n - 1 calls, and all methods — including an O(n²) brute force — agreed on the classic array and on 500 random arrays. Example 2: every row of the trace has \`cur\` equal to the brute-force best sum ending at i and \`best\` equal to the brute-force best so far, which is the loop invariant made visible; on 200 random arrays it held at all 2,776 positions. The random arrays come from a Park–Miller generator built into each program, so all four languages test identical inputs.

## 8. Complexity

| Method | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | Every start, running sum over every end |
| Crossing-sum divide and conquer | O(n log n) | O(log n) | log₂ n levels, n elements walked per level |
| Four-value divide and conquer | O(n) | O(log n) | 2n - 1 calls, O(1) combine each |
| Kadane | O(n) | O(1) | One pass, two variables |
| Segment tree query (four values) | O(log n) per query | O(n) tree | Combine O(log n) stored summaries |

## 9. Edge Cases

- **One element** — the base case of both proofs; all methods return it.
- **All negative** — the answer is the largest element; the crossing sums must start from \`a[mid]\` / \`a[mid + 1]\`, and Kadane from \`a[0]\`.
- **Odd lengths** — \`mid\` rounds down, so the left half gets the extra element; the proof does not care where the split is, only that both halves are non-empty.
- **Ties** — several subarrays may share the best sum; the proofs are about the value, and which one is reported depends on \`>\` versus \`>=\`.
- **Huge n** — both recursions are only about log₂ n deep, so stack depth is not a concern; sum overflow is (see the language notes).

## Common Pitfalls

- **Initialising the crossing sums with 0.** That allows an empty side, and an all-negative array reports 0.
- **Forgetting \`Math.floor\` on \`mid\`.** \`(lo + hi) / 2\` is a float; \`a[4.5]\` is \`undefined\` and the sums become \`NaN\`.
- **Off-by-one in the walks.** Include \`lo\` on the left and \`hi\` on the right.
- **\`slice\` per call.** \`a.slice(0, mid)\` copies at every level; pass indices.
- **Calling the invariant proof "obvious".** State the lemma and prove it with the exchange argument.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Divide and conquer:</strong> <span style="color:#f0e2c8;">Split at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code>; the best subarray is in the left half, the right half, or crosses the middle. The crossing one is best suffix ending at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid</code> plus best prefix starting at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid + 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Its cost and proof:</strong> <span style="color:#f0e2c8;">T(n) = 2T(n/2) + O(n) = O(n log n). Correct by strong induction on length plus an exchange argument for the crossing case.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Kadane proof:</strong> <span style="color:#f0e2c8;">Loop invariant: after index i, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur</code> is the best sum ending at i and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> the best inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[0..i]</code>. The lemma <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">E(i) = max(a[i], E(i-1) + a[i])</code> keeps it true.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Comparison:</strong> <span style="color:#f0e2c8;">Kadane is O(n) time, O(1) space and works on a stream, so it is what I would code; crossing D&C is O(n log n) but its halves are independent.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why D&C still matters:</strong> <span style="color:#f0e2c8;">Returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ total, prefix, suffix, best }</code> per segment makes D&C O(n) and is the node of a segment tree for range queries.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the crossing sums start from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a[mid]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The crossing subarray contains both middle elements; starting at 0 lets a side be empty and all-negative input would return 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Prove the Kadane recurrence.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A subarray ending at i is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[a[i]]</code> or a subarray ending at i - 1 plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i]</code>; the best of the latter extends the best ending at i - 1, by the exchange argument.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Math.floor</code> for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">mid</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/</code> is floating-point in JavaScript; an index like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">4.5</code> reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> and the sums turn into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did you test the proofs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Example 2 checks both invariants against brute force at every step (2,776 positions); Example 1 compares all methods on 500 random arrays.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you answer range queries with updates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A segment tree of four-value summaries, O(log n) per query and update.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Divide and conquer** | Split into independent parts, solve recursively, combine |
| **Crossing subarray** | Contains a[mid] and a[mid + 1]; best = best suffix ending at mid + best prefix from mid + 1 |
| **Recurrence relation (running time)** | Cost equation such as T(n) = 2T(n/2) + O(n) |
| **Master theorem** | Rule solving T(n) = aT(n/b) + f(n); here gives Θ(n log n) |
| **Strong induction** | Prove for size n assuming the claim for every smaller size |
| **Cut-and-paste (exchange) argument** | Replace a non-optimal piece with a better one to reach a contradiction |
| **Segment summary (four values)** | total, best prefix, best suffix, best inside — combinable in O(1) |
| **Segment tree** | Binary tree of segment summaries answering range queries in O(log n) |
| **Loop invariant** | A statement true before the loop and after every iteration; proved by initialisation, maintenance, termination |
| **Kadane as dynamic programming** | State E(i) = best sum ending at i, recurrence E(i) = max(a[i], E(i - 1) + a[i]) |

---
**Conclusion:** Kadane's algorithm is correct because of one lemma — the best subarray ending at i is either \`[a[i]]\` or the best ending at i - 1 extended by \`a[i]\` — wrapped in a loop invariant; divide and conquer is correct by strong induction on the left / right / crossing case split. Kadane is O(n) time and O(1) space and is what you code; the crossing-sum recursion is O(n log n), and its four-value form is O(n) and powers segment-tree range queries. In JavaScript remember \`Math.floor\` for the midpoint; the verified runs show every method agreeing and both invariants holding at every step.`,
        examples: [
          {
            label: "Crossing-sum divide and conquer, four-value divide and conquer and Kadane: answers and work counted",
            code: `let touched = 0;                         // elements scanned while computing crossing sums
let calls = 0;                           // calls made by the four-value version

function crossingDC(a, lo, hi) {
  // classic divide and conquer, O(n log n): best = left, right, or crossing the middle
  if (lo === hi) return a[lo];
  const mid = Math.floor((lo + hi) / 2);
  const leftBest = crossingDC(a, lo, mid);
  const rightBest = crossingDC(a, mid + 1, hi);
  let s = 0, bestSuffix = a[mid];
  for (let i = mid; i >= lo; i--) {      // best sum ending exactly at mid
    s += a[i];
    bestSuffix = Math.max(bestSuffix, s);
  }
  s = 0;
  let bestPrefix = a[mid + 1];
  for (let j = mid + 1; j <= hi; j++) {  // best sum starting exactly at mid + 1
    s += a[j];
    bestPrefix = Math.max(bestPrefix, s);
  }
  touched += hi - lo + 1;
  return Math.max(leftBest, rightBest, bestSuffix + bestPrefix);
}

function fourValueDC(a, lo, hi) {
  // returns {total, prefix, suffix, best} for a[lo..hi], O(n) overall
  calls++;
  if (lo === hi) return { total: a[lo], prefix: a[lo], suffix: a[lo], best: a[lo] };
  const mid = Math.floor((lo + hi) / 2);
  const L = fourValueDC(a, lo, mid);
  const R = fourValueDC(a, mid + 1, hi);
  return {
    total: L.total + R.total,
    prefix: Math.max(L.prefix, L.total + R.prefix),
    suffix: Math.max(R.suffix, R.total + L.suffix),
    best: Math.max(L.best, R.best, L.suffix + R.prefix),
  };
}

function kadane(a) {
  let best = a[0], cur = a[0];
  for (let i = 1; i < a.length; i++) {
    cur = Math.max(a[i], cur + a[i]);
    best = Math.max(best, cur);
  }
  return best;
}

function brute(a) {
  let best = a[0];
  for (let i = 0; i < a.length; i++) {
    let s = 0;
    for (let j = i; j < a.length; j++) {
      s += a[j];
      best = Math.max(best, s);
    }
  }
  return best;
}

let seed = 99;
function nextRand(limit) {
  // Park-Miller generator, so all four languages see the same arrays
  seed = (seed * 48271) % 2147483647;
  return seed % limit;
}

function randomArray(n) {
  const a = [];
  for (let i = 0; i < n; i++) a.push(nextRand(201) - 100);   // values in -100..100
  return a;
}

let a = [-2, 1, -3, 4, -1, 2, 1, -5, 4];
console.log("classic array: brute " + brute(a) + " | crossing d&c " + crossingDC(a, 0, a.length - 1) +
  " | four-value d&c " + fourValueDC(a, 0, a.length - 1).best + " | kadane " + kadane(a));

for (const n of [1024, 65536]) {
  a = randomArray(n);
  touched = 0;
  calls = 0;
  const x = crossingDC(a, 0, n - 1);
  const y = fourValueDC(a, 0, n - 1).best;
  console.log("n=" + n + ": crossing d&c scanned " + touched + " elements | four-value d&c made " +
    calls + " calls | kadane " + n + " steps | answers " + x + " " + y + " " + kadane(a));
}

let agree = 0;
for (let t = 0; t < 500; t++) {
  a = randomArray(1 + nextRand(40));
  const r = new Set([brute(a), crossingDC(a, 0, a.length - 1), fourValueDC(a, 0, a.length - 1).best, kadane(a)]);
  if (r.size === 1) agree++;
}
console.log("brute force, both d&c versions and kadane agree on " + agree + " of 500 random arrays");
`,
          },
          {
            label: "Kadane loop invariants checked against brute force at every step",
            code: `function bestEndingAt(a, i) {
  // brute force: the largest sum of a[k..i] over every k <= i
  let s = 0, best = a[i];
  for (let k = i; k >= 0; k--) {
    s += a[k];
    best = Math.max(best, s);
  }
  return best;
}

function bestWithin(a, i) {
  // brute force: the largest sum of any subarray inside a[0..i]
  let best = bestEndingAt(a, 0);
  for (let j = 1; j <= i; j++) best = Math.max(best, bestEndingAt(a, j));
  return best;
}

function kadaneChecked(a, trace) {
  // Kadane, checking both loop invariants after every step
  let cur = a[0], best = a[0], held = 0;
  for (let i = 0; i < a.length; i++) {
    if (i > 0) {
      cur = Math.max(a[i], cur + a[i]);
      best = Math.max(best, cur);
    }
    const ok = cur === bestEndingAt(a, i) && best === bestWithin(a, i);
    if (ok) held++;
    if (trace) {
      console.log("i=" + i + " x=" + a[i] + " | cur=" + cur + " best=" + best +
        " | brute: ending here " + bestEndingAt(a, i) + ", anywhere so far " +
        bestWithin(a, i) + " | " + (ok ? "ok" : "BROKEN"));
    }
  }
  return held;
}

kadaneChecked([-2, 1, -3, 4, -1, 2, 1, -5, 4], true);

let seed = 123;
function nextRand(limit) {
  // Park-Miller generator, so all four languages see the same arrays
  seed = (seed * 48271) % 2147483647;
  return seed % limit;
}

let held = 0, positions = 0;
for (let t = 0; t < 200; t++) {
  const n = 1 + nextRand(25);
  const arr = [];
  for (let k = 0; k < n; k++) arr.push(nextRand(41) - 20);
  held += kadaneChecked(arr, false);
  positions += n;
}
console.log("both invariants held at " + held + " of " + positions + " positions in 200 random arrays");
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You know Kadane's algorithm for the maximum subarray sum. Can you prove it is correct? Then describe a divide-and-conquer algorithm for the same problem, prove that one too, and compare them. Sketch both in Java."

**What a strong answer should cover:**
- Kadane's loop invariants (best sum ending at i, best so far) with initialisation, maintenance and termination, and the lemma \`E(i) = max(a[i], E(i-1) + a[i])\` proved by an exchange argument.
- Divide and conquer: the left / right / crossing case split, why the crossing sum is best suffix + best prefix, and the strong-induction proof.
- Costs: T(n) = 2T(n/2) + O(n) = O(n log n) for the crossing version versus O(n) and O(1) space for Kadane.
- The four-value (total, prefix, suffix, best) combine that makes divide and conquer O(n) and becomes a segment tree for range queries.
- Java specifics: \`lo + (hi - lo) / 2\` to avoid \`int\` overflow, nested two-argument \`Math.max\`, and a \`record\` for the four-value summary.

**Code / implementation expected:** Optional — the proofs matter most; a Java sketch of the crossing-sum recursion and Kadane's loop is a strong finish.`,
        answer: `**Target Audience:** Candidates who already know Kadane's algorithm and want to explain why it works and how it compares.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two friends want to find the most profitable run of consecutive days in a year of shop takings.

The first friend tears the ledger in half and hands one half to each of two helpers: "Find the best run in your half." Each helper tears their half again, and so on, until everyone holds a single day. Then the answers come back up. At each join, the best run is either entirely in the left piece, entirely in the right piece, or it **crosses the tear** — and the crossing one is easy to find by walking outwards from the tear. That is **divide and conquer**.

The second friend reads the ledger once, top to bottom, keeping two numbers on a sticky note: "best run that ends today" and "best run so far". That is **Kadane's algorithm** — the one-pass method from [how do you find the maximum subarray sum](/interview-question/how-do-you-find-the-maximum-subarray-sum).

Both get the right answer. The interview question is: **why** are they right, what does each cost, and when would you choose the slower-looking one? Being able to *prove* an algorithm correct — not just test it — is what separates a senior answer here.

## 2. Divide and Conquer: the Three Places the Answer Can Be

📌 **Interview term: Divide and conquer** — split the input into independent parts, solve each part recursively, then combine the part answers. [Merge sort](/interview-question/how-do-merge-sort-and-quicksort-work) is the textbook example.

Split \`a[lo..hi]\` at \`mid\`. Any subarray of \`a[lo..hi]\` is in exactly one of three places:

1. entirely in the **left** half \`a[lo..mid]\`,
2. entirely in the **right** half \`a[mid+1..hi]\`, or
3. it **crosses** the middle: it contains both \`a[mid]\` and \`a[mid+1]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Array split at mid into a left half and a right half. A crossing subarray is a best suffix of the left half ending at mid joined to a best prefix of the right half starting at mid plus 1">
  <rect class="d-box" x="40" y="40" width="320" height="50" rx="8"/>
  <text class="d-text" x="200" y="70" text-anchor="middle">left half a[lo..mid]</text>
  <rect class="d-box" x="400" y="40" width="320" height="50" rx="8"/>
  <text class="d-text" x="560" y="70" text-anchor="middle">right half a[mid+1..hi]</text>
  <line class="d-edge-dashed" x1="380" y1="20" x2="380" y2="200"/>
  <rect class="d-box-accent" x="200" y="130" width="160" height="44" rx="8"/>
  <text class="d-text" x="280" y="157" text-anchor="middle">best suffix</text>
  <rect class="d-box-accent" x="400" y="130" width="200" height="44" rx="8"/>
  <text class="d-text" x="500" y="157" text-anchor="middle">best prefix</text>
  <text class="d-sub" x="280" y="196" text-anchor="middle">ends exactly at mid</text>
  <text class="d-sub" x="500" y="196" text-anchor="middle">starts exactly at mid + 1</text>
</svg>

Cases 1 and 2 are the same problem on half the input — recurse. Case 3 is special: a crossing subarray is \`a[i..mid] + a[mid+1..j]\`, and the two pieces can be chosen **independently**, so the best crossing sum is (the best suffix of the left half that ends at \`mid\`) + (the best prefix of the right half that starts at \`mid + 1\`). Each is found by one walk outward from the middle.

📌 **Interview term: Crossing subarray** — a subarray that contains both \`a[mid]\` and \`a[mid + 1]\`; its best sum is best-suffix-ending-at-mid plus best-prefix-starting-at-mid+1.

📌 **Interview term: Recurrence relation (running time)** — an equation for the cost on size n in terms of smaller sizes. Here T(n) = 2T(n/2) + O(n): two half-size calls plus a linear walk for the crossing sum. That solves to **O(n log n)** — there are about log₂ n levels of halving and each level walks n elements in total. Example 1 measures it: for n = 1024 the crossing walks touched 10,240 elements (1024 × 10), and for n = 65536 they touched 1,048,576 (65536 × 16).

📌 **Interview term: Master theorem** — the standard rule for recurrences of the form T(n) = a·T(n/b) + f(n). With a = 2, b = 2 and f(n) = Θ(n) it gives Θ(n log n), the same as merge sort.

### Why divide and conquer is correct (proof by strong induction)

📌 **Interview term: Strong induction** — prove a statement for size n assuming it holds for **every** smaller size.

- **Base case.** One element: the only non-empty subarray is that element, which is what the code returns.
- **Inductive step.** Assume the algorithm is correct on every array shorter than n (n ≥ 2), and let S be a best subarray of \`a[lo..hi]\`. S lies in exactly one of the three places.
  - If S is in the left half, the recursive call on the left half is correct (shorter array) and returns sum(S), since no subarray of the left half beats S. Same for the right half.
  - If S crosses, write S = L + R with L ending at \`mid\` and R starting at \`mid + 1\`. If some suffix L′ ending at \`mid\` had a larger sum than L, then L′ + R would be a crossing subarray beating S — impossible. So sum(L) is the best suffix sum, and likewise sum(R) is the best prefix sum, and the crossing computation returns exactly sum(S).
  - The code returns the max of the three candidates. Each candidate is the sum of a real subarray (so it is ≤ sum(S)), and the candidate for S's case equals sum(S). So the max is sum(S).

The argument "if a piece were not optimal, swap in a better piece and the whole gets better" has a name:

📌 **Interview term: Cut-and-paste (exchange) argument** — to show an optimal solution contains optimal sub-solutions, assume a piece is not optimal, replace it by a better one, and derive a contradiction. It is the standard proof of optimal substructure.

## 3. The O(n) Divide and Conquer: Return Four Numbers

The crossing walk is what makes divide and conquer O(n log n). It can be removed: let each recursive call return four numbers about its segment instead of one.

📌 **Interview term: Segment summary (four values)** — for a segment, \`total\` (sum of all), \`prefix\` (best sum starting at its left end), \`suffix\` (best sum ending at its right end) and \`best\` (best subarray anywhere inside).

Two neighbouring segments L and R combine in O(1):

- \`total = L.total + R.total\`
- \`prefix = max(L.prefix, L.total + R.prefix)\` — either stays inside L, or takes all of L and continues into R
- \`suffix = max(R.suffix, R.total + L.suffix)\`
- \`best = max(L.best, R.best, L.suffix + R.prefix)\` — the last term is the crossing case, now free

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Two segment summaries L and R, each with total, prefix, suffix and best, combine into a parent summary">
  <defs>
    <marker id="b27q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="250" height="80" rx="10"/>
  <text class="d-text" x="165" y="62" text-anchor="middle">L segment</text>
  <text class="d-sub" x="165" y="86" text-anchor="middle">total, prefix, suffix, best</text>
  <rect class="d-box" x="470" y="30" width="250" height="80" rx="10"/>
  <text class="d-text" x="595" y="62" text-anchor="middle">R segment</text>
  <text class="d-sub" x="595" y="86" text-anchor="middle">total, prefix, suffix, best</text>
  <path class="d-edge" d="M 165 112 L 300 158" marker-end="url(#b27q5-arrow)"/>
  <path class="d-edge" d="M 595 112 L 460 158" marker-end="url(#b27q5-arrow)"/>
  <rect class="d-box-accent" x="200" y="162" width="360" height="70" rx="10"/>
  <text class="d-text" x="380" y="190" text-anchor="middle">parent segment</text>
  <text class="d-sub" x="380" y="214" text-anchor="middle">best = max(L.best, R.best, L.suffix + R.prefix)</text>
</svg>

Now T(n) = 2T(n/2) + O(1) = **O(n)**: one call per node of a binary tree with n leaves, 2n - 1 calls in all. Example 1 counts 2,047 calls for n = 1024 and 131,071 for n = 65536.

The correctness proof is the same induction, applied to all four values (each formula is a case split on "does the best prefix / suffix / subarray stay on one side or cross?").

📌 **Interview term: Segment tree** — a binary tree over an array where each node stores a summary of its segment. Storing these four values per node answers "maximum subarray sum inside \`a[l..r]\`" in O(log n) per query, with O(log n) updates — something a single Kadane pass cannot do. This is the real reason to learn the divide-and-conquer form.

## 4. Why Kadane Is Correct: a Loop Invariant

Kadane keeps two numbers while scanning left to right:

~~~text
cur  = a[0], best = a[0]
for i = 1 .. n-1:
    cur  = max(a[i], cur + a[i])
    best = max(best, cur)
~~~

📌 **Interview term: Loop invariant** — a statement that is true before the loop starts and after every iteration. If it is true at the end, and it implies the answer, the loop is correct. A proof has three parts: initialisation, maintenance, termination.

**The invariants.** After processing index \`i\`:

- (I1) \`cur\` = E(i), the largest sum of a subarray that **ends exactly at \`i\`**.
- (I2) \`best\` = the largest sum of any subarray inside \`a[0..i]\`.

**The key lemma.** E(i) = max(a[i], E(i - 1) + a[i]).

*Proof.* A subarray ending at \`i\` is either just \`[a[i]]\`, or \`a[k..i]\` with k < i, which is \`a[k..i-1]\` (a subarray ending at \`i - 1\`) plus \`a[i]\`. In the second case the sum is at most E(i - 1) + a[i], and that value is achieved by extending the best subarray ending at \`i - 1\`. So the best of all subarrays ending at \`i\` is the larger of the two options. (This is the cut-and-paste argument again: an optimal subarray ending at \`i\` that is longer than one element must start with an optimal subarray ending at \`i - 1\`.)

- **Initialisation (i = 0).** The only subarray ending at 0 is \`[a[0]]\`, and the only subarray inside \`a[0..0]\` is the same one, so \`cur = best = a[0]\` makes both invariants true.
- **Maintenance.** Assume both hold after \`i - 1\`. The update \`cur = max(a[i], cur + a[i])\` is exactly the lemma, so (I1) holds for \`i\`. Every subarray inside \`a[0..i]\` either lies inside \`a[0..i-1]\` (its sum is at most the old \`best\`) or ends at \`i\` (its sum is at most the new \`cur\`), and both values are achieved, so \`best = max(best, cur)\` makes (I2) hold for \`i\`.
- **Termination.** After \`i = n - 1\`, (I2) says \`best\` is the largest sum of any subarray of the whole array. ∎

Example 2 checks both invariants against brute force at every position: on the classic array and on 200 random arrays, they held at all 2,776 positions.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="The best subarray ending at i is either the single element a i, or the best subarray ending at i minus 1 extended by a i">
  <rect class="d-box-muted" x="40" y="40" width="340" height="46" rx="8"/>
  <text class="d-text" x="210" y="68" text-anchor="middle">best subarray ending at i - 1</text>
  <rect class="d-box-accent" x="400" y="40" width="90" height="46" rx="8"/>
  <text class="d-text" x="445" y="68" text-anchor="middle">a[i]</text>
  <rect class="d-box-accent" x="560" y="40" width="90" height="46" rx="8"/>
  <text class="d-text" x="605" y="68" text-anchor="middle">a[i]</text>
  <text class="d-sub" x="265" y="120" text-anchor="middle">option 1: extend, sum E(i - 1) + a[i]</text>
  <text class="d-sub" x="605" y="120" text-anchor="middle">option 2: start fresh</text>
  <rect class="d-box" x="200" y="146" width="360" height="40" rx="8"/>
  <text class="d-text" x="380" y="171" text-anchor="middle">E(i) = max of the two options</text>
</svg>

Option 2 wins exactly when E(i - 1) is negative — the "drop a negative running sum" rule.

📌 **Interview term: Kadane as dynamic programming** — E(i) is a DP state, the lemma is its recurrence, and E(0) = a[0] its base case. Because each state reads only the previous one, the table shrinks to one variable. See [what is dynamic programming](/interview-question/what-is-dynamic-programming).

## 5. Kadane vs Divide and Conquer

| | Kadane | Divide and conquer (crossing sum) | Divide and conquer (four values) |
| :--- | :--- | :--- | :--- |
| Time | O(n) | O(n log n) | O(n) |
| Extra space | O(1) | O(log n) recursion stack | O(log n) stack |
| Work in Example 1, n = 65536 | 65,536 steps | 1,048,576 elements walked | 131,071 calls |
| Proof technique | Loop invariant | Strong induction + exchange argument | Strong induction on four values |
| Streaming (one pass, data arrives once) | Yes | No | No |
| Range queries with updates | No (rescan O(n) per query) | — | Yes, as a segment tree: O(log n) |
| Parallel | Hard (sequential dependency) | Halves run independently | Halves run independently |
| What to write in an interview | This | Explain on request | Mention for follow-ups |

**History, briefly.** Jon Bentley's *Programming Pearls* column in Communications of the ACM 27(9), 1984, presented this problem with four algorithms of cost O(n³), O(n²), O(n log n) and O(n). Secondary accounts of that column ([Shin-Cheng Mu's summary](https://scm.iis.sinica.edu.tw/home/2010/maximum-segment-sum-origin-and-derivation/), [the WCIPEG wiki](https://wcipeg.com/wiki/Max_subvector_sum)) say the problem came from Ulf Grenander's pattern-recognition work, the divide-and-conquer method from Michael Shamos, and the linear method from Jay Kadane. The original column was not consulted directly for this page.

## 6. The Java Code

The crossing-sum divide and conquer (counter lines removed):

~~~java
static int crossingDC(int[] a, int lo, int hi) {
    if (lo == hi) return a[lo];
    int mid = lo + (hi - lo) / 2;              // avoids int overflow of lo + hi on huge arrays
    int leftBest = crossingDC(a, lo, mid);
    int rightBest = crossingDC(a, mid + 1, hi);
    int s = 0, bestSuffix = a[mid];
    for (int i = mid; i >= lo; i--) {          // best sum ending exactly at mid
        s += a[i];
        bestSuffix = Math.max(bestSuffix, s);
    }
    s = 0;
    int bestPrefix = a[mid + 1];
    for (int j = mid + 1; j <= hi; j++) {      // best sum starting exactly at mid + 1
        s += a[j];
        bestPrefix = Math.max(bestPrefix, s);
    }
    return Math.max(Math.max(leftBest, rightBest), bestSuffix + bestPrefix);
}
~~~

The four-value version with a \`record\`:

~~~java
record Seg(int total, int prefix, int suffix, int best) {}

static Seg fourValueDC(int[] a, int lo, int hi) {
    if (lo == hi) return new Seg(a[lo], a[lo], a[lo], a[lo]);
    int mid = lo + (hi - lo) / 2;
    Seg L = fourValueDC(a, lo, mid);
    Seg R = fourValueDC(a, mid + 1, hi);
    return new Seg(L.total() + R.total(),
        Math.max(L.prefix(), L.total() + R.prefix()),
        Math.max(R.suffix(), R.total() + L.suffix()),
        Math.max(Math.max(L.best(), R.best()), L.suffix() + R.prefix()));
}
~~~

Java notes:

- **\`lo + (hi - lo) / 2\`** — \`(lo + hi) / 2\` overflows when \`lo + hi\` exceeds \`Integer.MAX_VALUE\`, which is possible with indices above about a billion. The rewritten form never exceeds \`hi\`.
- **\`Math.max\` takes exactly two arguments**, so a three-way max is nested: \`Math.max(Math.max(a, b), c)\`.
- **\`record Seg(...)\`** (Java 16+) gives an immutable class with accessors \`total()\`, \`prefix()\` and so on in one line; it is a nested record here, which is implicitly static.
- **\`bestSuffix = a[mid]\`, not 0** — the crossing subarray must contain both middle elements; starting at 0 reports 0 on an all-negative array.
- **Recursion depth is about log₂ n**, so \`StackOverflowError\` is not a concern even for millions of elements.
- **Overflow.** Sums use \`int\` because the test values are at most 100 in magnitude; with large values every sum field should be \`long\`.

## 7. Verified: Running the Code

Each example below was saved to a file and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs in the other three languages print exactly the same lines.

**Example 1 — Crossing-sum divide and conquer, four-value divide and conquer and Kadane: answers and work counted** printed:

~~~text
classic array: brute 6 | crossing d&c 6 | four-value d&c 6 | kadane 6
n=1024: crossing d&c scanned 10240 elements | four-value d&c made 2047 calls | kadane 1024 steps | answers 2286 2286 2286
n=65536: crossing d&c scanned 1048576 elements | four-value d&c made 131071 calls | kadane 65536 steps | answers 8092 8092 8092
brute force, both d&c versions and kadane agree on 500 of 500 random arrays
~~~

**Example 2 — Kadane loop invariants checked against brute force at every step** printed:

~~~text
i=0 x=-2 | cur=-2 best=-2 | brute: ending here -2, anywhere so far -2 | ok
i=1 x=1 | cur=1 best=1 | brute: ending here 1, anywhere so far 1 | ok
i=2 x=-3 | cur=-2 best=1 | brute: ending here -2, anywhere so far 1 | ok
i=3 x=4 | cur=4 best=4 | brute: ending here 4, anywhere so far 4 | ok
i=4 x=-1 | cur=3 best=4 | brute: ending here 3, anywhere so far 4 | ok
i=5 x=2 | cur=5 best=5 | brute: ending here 5, anywhere so far 5 | ok
i=6 x=1 | cur=6 best=6 | brute: ending here 6, anywhere so far 6 | ok
i=7 x=-5 | cur=1 best=6 | brute: ending here 1, anywhere so far 6 | ok
i=8 x=4 | cur=5 best=6 | brute: ending here 5, anywhere so far 6 | ok
both invariants held at 2776 of 2776 positions in 200 random arrays
~~~

Example 1: the crossing-sum recursion walked exactly n·log₂ n elements (10,240 for n = 1024, 1,048,576 for n = 65536), the four-value recursion made 2n - 1 calls, and all methods — including an O(n²) brute force — agreed on the classic array and on 500 random arrays. Example 2: every row of the trace has \`cur\` equal to the brute-force best sum ending at i and \`best\` equal to the brute-force best so far, which is the loop invariant made visible; on 200 random arrays it held at all 2,776 positions. The random arrays come from a Park–Miller generator built into each program, so all four languages test identical inputs.

## 8. Complexity

| Method | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | Every start, running sum over every end |
| Crossing-sum divide and conquer | O(n log n) | O(log n) | log₂ n levels, n elements walked per level |
| Four-value divide and conquer | O(n) | O(log n) | 2n - 1 calls, O(1) combine each |
| Kadane | O(n) | O(1) | One pass, two variables |
| Segment tree query (four values) | O(log n) per query | O(n) tree | Combine O(log n) stored summaries |

## 9. Edge Cases

- **One element** — the base case of both proofs; all methods return it.
- **All negative** — the answer is the largest element; the crossing sums must start from \`a[mid]\` / \`a[mid + 1]\`, and Kadane from \`a[0]\`.
- **Odd lengths** — \`mid\` rounds down, so the left half gets the extra element; the proof does not care where the split is, only that both halves are non-empty.
- **Ties** — several subarrays may share the best sum; the proofs are about the value, and which one is reported depends on \`>\` versus \`>=\`.
- **Huge n** — both recursions are only about log₂ n deep, so stack depth is not a concern; sum overflow is (see the language notes).

## Common Pitfalls

- **Initialising the crossing sums with 0.** That allows an empty side, and an all-negative array reports 0.
- **\`(lo + hi) / 2\` overflow** for very large index values; write \`lo + (hi - lo) / 2\`.
- **Off-by-one in the walks.** Include \`lo\` on the left and \`hi\` on the right.
- **\`Arrays.copyOfRange\` per call.** Copying halves at every level costs O(n log n) memory traffic; pass indices.
- **\`int\` sum overflow** with large values; the record fields should be \`long\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Divide and conquer:</strong> <span style="color:#f0e2c8;">Split at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid = lo + (hi - lo) / 2</code>; the best subarray is in the left half, the right half, or crosses the middle, and the crossing one is best suffix plus best prefix.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Its cost and proof:</strong> <span style="color:#f0e2c8;">T(n) = 2T(n/2) + O(n) = O(n log n). Correct by strong induction on length plus an exchange argument for the crossing case.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Kadane proof:</strong> <span style="color:#f0e2c8;">Loop invariant: after index i, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur</code> is the best sum ending at i and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> the best inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[0..i]</code>; the lemma <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">E(i) = max(a[i], E(i-1) + a[i])</code> keeps it true.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Comparison:</strong> <span style="color:#f0e2c8;">Kadane is O(n) time, O(1) space and streaming, so it is what I would code; crossing D&C is O(n log n) but parallelises, for example with a fork-join pool.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why D&C still matters:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">record Seg(total, prefix, suffix, best)</code> per segment makes D&C O(n) and is exactly the segment tree node for range queries.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the crossing sums start from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a[mid]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The crossing subarray contains both middle elements; starting at 0 lets a side be empty and all-negative input would return 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Prove the Kadane recurrence.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A subarray ending at i is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[a[i]]</code> or a subarray ending at i - 1 plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i]</code>; the best of the latter extends the best ending at i - 1, by the exchange argument.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lo + (hi - lo) / 2</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo + hi</code> can exceed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code> and wrap negative; the rewritten form stays within <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[lo, hi]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did you test the proofs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Example 2 checks both invariants against brute force at every step (2,776 positions); Example 1 compares all methods on 500 random arrays.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you answer range queries with updates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A segment tree of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Seg</code> records, O(log n) per query and update.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Divide and conquer** | Split into independent parts, solve recursively, combine |
| **Crossing subarray** | Contains a[mid] and a[mid + 1]; best = best suffix ending at mid + best prefix from mid + 1 |
| **Recurrence relation (running time)** | Cost equation such as T(n) = 2T(n/2) + O(n) |
| **Master theorem** | Rule solving T(n) = aT(n/b) + f(n); here gives Θ(n log n) |
| **Strong induction** | Prove for size n assuming the claim for every smaller size |
| **Cut-and-paste (exchange) argument** | Replace a non-optimal piece with a better one to reach a contradiction |
| **Segment summary (four values)** | total, best prefix, best suffix, best inside — combinable in O(1) |
| **Segment tree** | Binary tree of segment summaries answering range queries in O(log n) |
| **Loop invariant** | A statement true before the loop and after every iteration; proved by initialisation, maintenance, termination |
| **Kadane as dynamic programming** | State E(i) = best sum ending at i, recurrence E(i) = max(a[i], E(i - 1) + a[i]) |

---
**Conclusion:** Kadane's algorithm is correct because of one lemma — the best subarray ending at i is either \`[a[i]]\` or the best ending at i - 1 extended by \`a[i]\` — wrapped in a loop invariant; divide and conquer is correct by strong induction on the left / right / crossing case split. Kadane is O(n) time and O(1) space and is what you code; the crossing-sum recursion is O(n log n), and its four-value form (a \`record\` per segment) is O(n) and powers segment-tree range queries. Write the midpoint as \`lo + (hi - lo) / 2\`; the verified runs show every method agreeing and both invariants holding at every step.`,
        examples: [
          {
            label: "Crossing-sum divide and conquer, four-value divide and conquer and Kadane: answers and work counted",
            code: `public class Main {
    static long touched = 0;                       // elements scanned while computing crossing sums
    static long calls = 0;                         // calls made by the four-value version

    // classic divide and conquer, O(n log n): best = left, right, or crossing the middle
    static int crossingDC(int[] a, int lo, int hi) {
        if (lo == hi) return a[lo];
        int mid = lo + (hi - lo) / 2;              // avoids int overflow of lo + hi on huge arrays
        int leftBest = crossingDC(a, lo, mid);
        int rightBest = crossingDC(a, mid + 1, hi);
        int s = 0, bestSuffix = a[mid];
        for (int i = mid; i >= lo; i--) {          // best sum ending exactly at mid
            s += a[i];
            bestSuffix = Math.max(bestSuffix, s);
        }
        s = 0;
        int bestPrefix = a[mid + 1];
        for (int j = mid + 1; j <= hi; j++) {      // best sum starting exactly at mid + 1
            s += a[j];
            bestPrefix = Math.max(bestPrefix, s);
        }
        touched += hi - lo + 1;
        return Math.max(Math.max(leftBest, rightBest), bestSuffix + bestPrefix);
    }

    // the four numbers that describe a segment
    record Seg(int total, int prefix, int suffix, int best) {}

    static Seg fourValueDC(int[] a, int lo, int hi) {
        calls++;
        if (lo == hi) return new Seg(a[lo], a[lo], a[lo], a[lo]);
        int mid = lo + (hi - lo) / 2;
        Seg L = fourValueDC(a, lo, mid);
        Seg R = fourValueDC(a, mid + 1, hi);
        return new Seg(L.total() + R.total(),
            Math.max(L.prefix(), L.total() + R.prefix()),
            Math.max(R.suffix(), R.total() + L.suffix()),
            Math.max(Math.max(L.best(), R.best()), L.suffix() + R.prefix()));
    }

    static int kadane(int[] a) {
        int best = a[0], cur = a[0];
        for (int i = 1; i < a.length; i++) {
            cur = Math.max(a[i], cur + a[i]);
            best = Math.max(best, cur);
        }
        return best;
    }

    static int brute(int[] a) {
        int best = a[0];
        for (int i = 0; i < a.length; i++) {
            int s = 0;
            for (int j = i; j < a.length; j++) {
                s += a[j];
                best = Math.max(best, s);
            }
        }
        return best;
    }

    static long seed = 99;

    static int nextRand(int limit) {
        // Park-Miller generator, so all four languages see the same arrays
        seed = seed * 48271 % 2147483647;
        return (int) (seed % limit);
    }

    static int[] randomArray(int n) {
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = nextRand(201) - 100;   // values in -100..100
        return a;
    }

    public static void main(String[] args) {
        int[] a = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
        System.out.println("classic array: brute " + brute(a) + " | crossing d&c " + crossingDC(a, 0, a.length - 1)
            + " | four-value d&c " + fourValueDC(a, 0, a.length - 1).best() + " | kadane " + kadane(a));

        for (int n : new int[] {1024, 65536}) {
            a = randomArray(n);
            touched = 0;
            calls = 0;
            int x = crossingDC(a, 0, n - 1);
            int y = fourValueDC(a, 0, n - 1).best();
            System.out.println("n=" + n + ": crossing d&c scanned " + touched + " elements | four-value d&c made "
                + calls + " calls | kadane " + n + " steps | answers " + x + " " + y + " " + kadane(a));
        }

        int agree = 0;
        for (int t = 0; t < 500; t++) {
            a = randomArray(1 + nextRand(40));
            int p = brute(a), q = crossingDC(a, 0, a.length - 1), r = fourValueDC(a, 0, a.length - 1).best(), s = kadane(a);
            if (p == q && q == r && r == s) agree++;
        }
        System.out.println("brute force, both d&c versions and kadane agree on " + agree + " of 500 random arrays");
    }
}
`,
          },
          {
            label: "Kadane loop invariants checked against brute force at every step",
            code: `public class Main {
    // brute force: the largest sum of a[k..i] over every k <= i
    static int bestEndingAt(int[] a, int i) {
        int s = 0, best = a[i];
        for (int k = i; k >= 0; k--) {
            s += a[k];
            best = Math.max(best, s);
        }
        return best;
    }

    // brute force: the largest sum of any subarray inside a[0..i]
    static int bestWithin(int[] a, int i) {
        int best = bestEndingAt(a, 0);
        for (int j = 1; j <= i; j++) best = Math.max(best, bestEndingAt(a, j));
        return best;
    }

    // Kadane, checking both loop invariants after every step
    static int kadaneChecked(int[] a, boolean trace) {
        int cur = a[0], best = a[0], held = 0;
        for (int i = 0; i < a.length; i++) {
            if (i > 0) {
                cur = Math.max(a[i], cur + a[i]);
                best = Math.max(best, cur);
            }
            boolean ok = cur == bestEndingAt(a, i) && best == bestWithin(a, i);
            if (ok) held++;
            if (trace) {
                System.out.println("i=" + i + " x=" + a[i] + " | cur=" + cur + " best=" + best
                    + " | brute: ending here " + bestEndingAt(a, i) + ", anywhere so far "
                    + bestWithin(a, i) + " | " + (ok ? "ok" : "BROKEN"));
            }
        }
        return held;
    }

    static long seed = 123;

    static int nextRand(int limit) {
        // Park-Miller generator, so all four languages see the same arrays
        seed = seed * 48271 % 2147483647;
        return (int) (seed % limit);
    }

    public static void main(String[] args) {
        kadaneChecked(new int[] {-2, 1, -3, 4, -1, 2, 1, -5, 4}, true);
        int held = 0, positions = 0;
        for (int t = 0; t < 200; t++) {
            int n = 1 + nextRand(25);
            int[] arr = new int[n];
            for (int k = 0; k < n; k++) arr[k] = nextRand(41) - 20;
            held += kadaneChecked(arr, false);
            positions += n;
        }
        System.out.println("both invariants held at " + held + " of " + positions + " positions in 200 random arrays");
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You know Kadane's algorithm for the maximum subarray sum. Can you prove it is correct? Then describe a divide-and-conquer algorithm for the same problem, prove that one too, and compare them. Sketch both in C++."

**What a strong answer should cover:**
- Kadane's loop invariants (best sum ending at i, best so far) with initialisation, maintenance and termination, and the lemma \`E(i) = max(a[i], E(i-1) + a[i])\` proved by an exchange argument.
- Divide and conquer: the left / right / crossing case split, why the crossing sum is best suffix + best prefix, and the strong-induction proof.
- Costs: T(n) = 2T(n/2) + O(n) = O(n log n) for the crossing version versus O(n) and O(1) space for Kadane.
- The four-value (total, prefix, suffix, best) combine that makes divide and conquer O(n) and becomes a segment tree for range queries.
- C++ specifics: \`std::max({a, b, c})\` for a three-way max, passing \`const std::vector<int>&\` into the recursion, and \`lo + (hi - lo) / 2\` because signed overflow is undefined behaviour.

**Code / implementation expected:** Optional — the proofs matter most; a C++ sketch of the crossing-sum recursion and Kadane's loop is a strong finish.`,
        answer: `**Target Audience:** Candidates who already know Kadane's algorithm and want to explain why it works and how it compares.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two friends want to find the most profitable run of consecutive days in a year of shop takings.

The first friend tears the ledger in half and hands one half to each of two helpers: "Find the best run in your half." Each helper tears their half again, and so on, until everyone holds a single day. Then the answers come back up. At each join, the best run is either entirely in the left piece, entirely in the right piece, or it **crosses the tear** — and the crossing one is easy to find by walking outwards from the tear. That is **divide and conquer**.

The second friend reads the ledger once, top to bottom, keeping two numbers on a sticky note: "best run that ends today" and "best run so far". That is **Kadane's algorithm** — the one-pass method from [how do you find the maximum subarray sum](/interview-question/how-do-you-find-the-maximum-subarray-sum).

Both get the right answer. The interview question is: **why** are they right, what does each cost, and when would you choose the slower-looking one? Being able to *prove* an algorithm correct — not just test it — is what separates a senior answer here.

## 2. Divide and Conquer: the Three Places the Answer Can Be

📌 **Interview term: Divide and conquer** — split the input into independent parts, solve each part recursively, then combine the part answers. [Merge sort](/interview-question/how-do-merge-sort-and-quicksort-work) is the textbook example.

Split \`a[lo..hi]\` at \`mid\`. Any subarray of \`a[lo..hi]\` is in exactly one of three places:

1. entirely in the **left** half \`a[lo..mid]\`,
2. entirely in the **right** half \`a[mid+1..hi]\`, or
3. it **crosses** the middle: it contains both \`a[mid]\` and \`a[mid+1]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Array split at mid into a left half and a right half. A crossing subarray is a best suffix of the left half ending at mid joined to a best prefix of the right half starting at mid plus 1">
  <rect class="d-box" x="40" y="40" width="320" height="50" rx="8"/>
  <text class="d-text" x="200" y="70" text-anchor="middle">left half a[lo..mid]</text>
  <rect class="d-box" x="400" y="40" width="320" height="50" rx="8"/>
  <text class="d-text" x="560" y="70" text-anchor="middle">right half a[mid+1..hi]</text>
  <line class="d-edge-dashed" x1="380" y1="20" x2="380" y2="200"/>
  <rect class="d-box-accent" x="200" y="130" width="160" height="44" rx="8"/>
  <text class="d-text" x="280" y="157" text-anchor="middle">best suffix</text>
  <rect class="d-box-accent" x="400" y="130" width="200" height="44" rx="8"/>
  <text class="d-text" x="500" y="157" text-anchor="middle">best prefix</text>
  <text class="d-sub" x="280" y="196" text-anchor="middle">ends exactly at mid</text>
  <text class="d-sub" x="500" y="196" text-anchor="middle">starts exactly at mid + 1</text>
</svg>

Cases 1 and 2 are the same problem on half the input — recurse. Case 3 is special: a crossing subarray is \`a[i..mid] + a[mid+1..j]\`, and the two pieces can be chosen **independently**, so the best crossing sum is (the best suffix of the left half that ends at \`mid\`) + (the best prefix of the right half that starts at \`mid + 1\`). Each is found by one walk outward from the middle.

📌 **Interview term: Crossing subarray** — a subarray that contains both \`a[mid]\` and \`a[mid + 1]\`; its best sum is best-suffix-ending-at-mid plus best-prefix-starting-at-mid+1.

📌 **Interview term: Recurrence relation (running time)** — an equation for the cost on size n in terms of smaller sizes. Here T(n) = 2T(n/2) + O(n): two half-size calls plus a linear walk for the crossing sum. That solves to **O(n log n)** — there are about log₂ n levels of halving and each level walks n elements in total. Example 1 measures it: for n = 1024 the crossing walks touched 10,240 elements (1024 × 10), and for n = 65536 they touched 1,048,576 (65536 × 16).

📌 **Interview term: Master theorem** — the standard rule for recurrences of the form T(n) = a·T(n/b) + f(n). With a = 2, b = 2 and f(n) = Θ(n) it gives Θ(n log n), the same as merge sort.

### Why divide and conquer is correct (proof by strong induction)

📌 **Interview term: Strong induction** — prove a statement for size n assuming it holds for **every** smaller size.

- **Base case.** One element: the only non-empty subarray is that element, which is what the code returns.
- **Inductive step.** Assume the algorithm is correct on every array shorter than n (n ≥ 2), and let S be a best subarray of \`a[lo..hi]\`. S lies in exactly one of the three places.
  - If S is in the left half, the recursive call on the left half is correct (shorter array) and returns sum(S), since no subarray of the left half beats S. Same for the right half.
  - If S crosses, write S = L + R with L ending at \`mid\` and R starting at \`mid + 1\`. If some suffix L′ ending at \`mid\` had a larger sum than L, then L′ + R would be a crossing subarray beating S — impossible. So sum(L) is the best suffix sum, and likewise sum(R) is the best prefix sum, and the crossing computation returns exactly sum(S).
  - The code returns the max of the three candidates. Each candidate is the sum of a real subarray (so it is ≤ sum(S)), and the candidate for S's case equals sum(S). So the max is sum(S).

The argument "if a piece were not optimal, swap in a better piece and the whole gets better" has a name:

📌 **Interview term: Cut-and-paste (exchange) argument** — to show an optimal solution contains optimal sub-solutions, assume a piece is not optimal, replace it by a better one, and derive a contradiction. It is the standard proof of optimal substructure.

## 3. The O(n) Divide and Conquer: Return Four Numbers

The crossing walk is what makes divide and conquer O(n log n). It can be removed: let each recursive call return four numbers about its segment instead of one.

📌 **Interview term: Segment summary (four values)** — for a segment, \`total\` (sum of all), \`prefix\` (best sum starting at its left end), \`suffix\` (best sum ending at its right end) and \`best\` (best subarray anywhere inside).

Two neighbouring segments L and R combine in O(1):

- \`total = L.total + R.total\`
- \`prefix = max(L.prefix, L.total + R.prefix)\` — either stays inside L, or takes all of L and continues into R
- \`suffix = max(R.suffix, R.total + L.suffix)\`
- \`best = max(L.best, R.best, L.suffix + R.prefix)\` — the last term is the crossing case, now free

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Two segment summaries L and R, each with total, prefix, suffix and best, combine into a parent summary">
  <defs>
    <marker id="b27q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="250" height="80" rx="10"/>
  <text class="d-text" x="165" y="62" text-anchor="middle">L segment</text>
  <text class="d-sub" x="165" y="86" text-anchor="middle">total, prefix, suffix, best</text>
  <rect class="d-box" x="470" y="30" width="250" height="80" rx="10"/>
  <text class="d-text" x="595" y="62" text-anchor="middle">R segment</text>
  <text class="d-sub" x="595" y="86" text-anchor="middle">total, prefix, suffix, best</text>
  <path class="d-edge" d="M 165 112 L 300 158" marker-end="url(#b27q5-arrow)"/>
  <path class="d-edge" d="M 595 112 L 460 158" marker-end="url(#b27q5-arrow)"/>
  <rect class="d-box-accent" x="200" y="162" width="360" height="70" rx="10"/>
  <text class="d-text" x="380" y="190" text-anchor="middle">parent segment</text>
  <text class="d-sub" x="380" y="214" text-anchor="middle">best = max(L.best, R.best, L.suffix + R.prefix)</text>
</svg>

Now T(n) = 2T(n/2) + O(1) = **O(n)**: one call per node of a binary tree with n leaves, 2n - 1 calls in all. Example 1 counts 2,047 calls for n = 1024 and 131,071 for n = 65536.

The correctness proof is the same induction, applied to all four values (each formula is a case split on "does the best prefix / suffix / subarray stay on one side or cross?").

📌 **Interview term: Segment tree** — a binary tree over an array where each node stores a summary of its segment. Storing these four values per node answers "maximum subarray sum inside \`a[l..r]\`" in O(log n) per query, with O(log n) updates — something a single Kadane pass cannot do. This is the real reason to learn the divide-and-conquer form.

## 4. Why Kadane Is Correct: a Loop Invariant

Kadane keeps two numbers while scanning left to right:

~~~text
cur  = a[0], best = a[0]
for i = 1 .. n-1:
    cur  = max(a[i], cur + a[i])
    best = max(best, cur)
~~~

📌 **Interview term: Loop invariant** — a statement that is true before the loop starts and after every iteration. If it is true at the end, and it implies the answer, the loop is correct. A proof has three parts: initialisation, maintenance, termination.

**The invariants.** After processing index \`i\`:

- (I1) \`cur\` = E(i), the largest sum of a subarray that **ends exactly at \`i\`**.
- (I2) \`best\` = the largest sum of any subarray inside \`a[0..i]\`.

**The key lemma.** E(i) = max(a[i], E(i - 1) + a[i]).

*Proof.* A subarray ending at \`i\` is either just \`[a[i]]\`, or \`a[k..i]\` with k < i, which is \`a[k..i-1]\` (a subarray ending at \`i - 1\`) plus \`a[i]\`. In the second case the sum is at most E(i - 1) + a[i], and that value is achieved by extending the best subarray ending at \`i - 1\`. So the best of all subarrays ending at \`i\` is the larger of the two options. (This is the cut-and-paste argument again: an optimal subarray ending at \`i\` that is longer than one element must start with an optimal subarray ending at \`i - 1\`.)

- **Initialisation (i = 0).** The only subarray ending at 0 is \`[a[0]]\`, and the only subarray inside \`a[0..0]\` is the same one, so \`cur = best = a[0]\` makes both invariants true.
- **Maintenance.** Assume both hold after \`i - 1\`. The update \`cur = max(a[i], cur + a[i])\` is exactly the lemma, so (I1) holds for \`i\`. Every subarray inside \`a[0..i]\` either lies inside \`a[0..i-1]\` (its sum is at most the old \`best\`) or ends at \`i\` (its sum is at most the new \`cur\`), and both values are achieved, so \`best = max(best, cur)\` makes (I2) hold for \`i\`.
- **Termination.** After \`i = n - 1\`, (I2) says \`best\` is the largest sum of any subarray of the whole array. ∎

Example 2 checks both invariants against brute force at every position: on the classic array and on 200 random arrays, they held at all 2,776 positions.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="The best subarray ending at i is either the single element a i, or the best subarray ending at i minus 1 extended by a i">
  <rect class="d-box-muted" x="40" y="40" width="340" height="46" rx="8"/>
  <text class="d-text" x="210" y="68" text-anchor="middle">best subarray ending at i - 1</text>
  <rect class="d-box-accent" x="400" y="40" width="90" height="46" rx="8"/>
  <text class="d-text" x="445" y="68" text-anchor="middle">a[i]</text>
  <rect class="d-box-accent" x="560" y="40" width="90" height="46" rx="8"/>
  <text class="d-text" x="605" y="68" text-anchor="middle">a[i]</text>
  <text class="d-sub" x="265" y="120" text-anchor="middle">option 1: extend, sum E(i - 1) + a[i]</text>
  <text class="d-sub" x="605" y="120" text-anchor="middle">option 2: start fresh</text>
  <rect class="d-box" x="200" y="146" width="360" height="40" rx="8"/>
  <text class="d-text" x="380" y="171" text-anchor="middle">E(i) = max of the two options</text>
</svg>

Option 2 wins exactly when E(i - 1) is negative — the "drop a negative running sum" rule.

📌 **Interview term: Kadane as dynamic programming** — E(i) is a DP state, the lemma is its recurrence, and E(0) = a[0] its base case. Because each state reads only the previous one, the table shrinks to one variable. See [what is dynamic programming](/interview-question/what-is-dynamic-programming).

## 5. Kadane vs Divide and Conquer

| | Kadane | Divide and conquer (crossing sum) | Divide and conquer (four values) |
| :--- | :--- | :--- | :--- |
| Time | O(n) | O(n log n) | O(n) |
| Extra space | O(1) | O(log n) recursion stack | O(log n) stack |
| Work in Example 1, n = 65536 | 65,536 steps | 1,048,576 elements walked | 131,071 calls |
| Proof technique | Loop invariant | Strong induction + exchange argument | Strong induction on four values |
| Streaming (one pass, data arrives once) | Yes | No | No |
| Range queries with updates | No (rescan O(n) per query) | — | Yes, as a segment tree: O(log n) |
| Parallel | Hard (sequential dependency) | Halves run independently | Halves run independently |
| What to write in an interview | This | Explain on request | Mention for follow-ups |

**History, briefly.** Jon Bentley's *Programming Pearls* column in Communications of the ACM 27(9), 1984, presented this problem with four algorithms of cost O(n³), O(n²), O(n log n) and O(n). Secondary accounts of that column ([Shin-Cheng Mu's summary](https://scm.iis.sinica.edu.tw/home/2010/maximum-segment-sum-origin-and-derivation/), [the WCIPEG wiki](https://wcipeg.com/wiki/Max_subvector_sum)) say the problem came from Ulf Grenander's pattern-recognition work, the divide-and-conquer method from Michael Shamos, and the linear method from Jay Kadane. The original column was not consulted directly for this page.

## 6. The C++ Code

The crossing-sum divide and conquer (counter lines removed):

~~~cpp
int crossingDC(const std::vector<int>& a, int lo, int hi) {
    if (lo == hi) return a[lo];
    int mid = lo + (hi - lo) / 2;
    int leftBest = crossingDC(a, lo, mid);
    int rightBest = crossingDC(a, mid + 1, hi);
    int s = 0, bestSuffix = a[mid];
    for (int i = mid; i >= lo; i--) {             // best sum ending exactly at mid
        s += a[i];
        bestSuffix = std::max(bestSuffix, s);
    }
    s = 0;
    int bestPrefix = a[mid + 1];
    for (int j = mid + 1; j <= hi; j++) {         // best sum starting exactly at mid + 1
        s += a[j];
        bestPrefix = std::max(bestPrefix, s);
    }
    return std::max({leftBest, rightBest, bestSuffix + bestPrefix});   // initializer-list max
}
~~~

The four-value version with a small \`struct\`:

~~~cpp
struct Seg { int total, prefix, suffix, best; };  // the four numbers that describe a segment

Seg fourValueDC(const std::vector<int>& a, int lo, int hi) {
    if (lo == hi) return {a[lo], a[lo], a[lo], a[lo]};
    int mid = lo + (hi - lo) / 2;
    Seg L = fourValueDC(a, lo, mid);
    Seg R = fourValueDC(a, mid + 1, hi);
    return {L.total + R.total,
            std::max(L.prefix, L.total + R.prefix),
            std::max(R.suffix, R.total + L.suffix),
            std::max({L.best, R.best, L.suffix + R.prefix})};
}
~~~

C++ notes:

- **\`std::max({a, b, c})\`** — the \`std::initializer_list\` overload (in \`<algorithm>\`) takes the max of any number of values of one type.
- **Aggregate initialisation** \`return {a, b, c, d};\` builds the \`Seg\` without a constructor.
- **\`lo + (hi - lo) / 2\`** avoids signed overflow of \`lo + hi\`, which in C++ would be undefined behaviour, not just a wrong index.
- **\`const std::vector<int>&\`** — the array is passed by reference into every recursive call; passing by value would copy it at every level and add O(n) copying to each of the 2n - 1 calls, O(n²) in total.
- **\`bestSuffix = a[mid]\`, not 0** — the crossing subarray must contain both middle elements.
- **Recursion depth is about log₂ n**, so the native stack is not at risk. Use \`long long\` sums if the values can be large.

## 7. Verified: Running the Code

Each example below was saved to a file and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (g++ 13). The same programs in the other three languages print exactly the same lines.

**Example 1 — Crossing-sum divide and conquer, four-value divide and conquer and Kadane: answers and work counted** printed:

~~~text
classic array: brute 6 | crossing d&c 6 | four-value d&c 6 | kadane 6
n=1024: crossing d&c scanned 10240 elements | four-value d&c made 2047 calls | kadane 1024 steps | answers 2286 2286 2286
n=65536: crossing d&c scanned 1048576 elements | four-value d&c made 131071 calls | kadane 65536 steps | answers 8092 8092 8092
brute force, both d&c versions and kadane agree on 500 of 500 random arrays
~~~

**Example 2 — Kadane loop invariants checked against brute force at every step** printed:

~~~text
i=0 x=-2 | cur=-2 best=-2 | brute: ending here -2, anywhere so far -2 | ok
i=1 x=1 | cur=1 best=1 | brute: ending here 1, anywhere so far 1 | ok
i=2 x=-3 | cur=-2 best=1 | brute: ending here -2, anywhere so far 1 | ok
i=3 x=4 | cur=4 best=4 | brute: ending here 4, anywhere so far 4 | ok
i=4 x=-1 | cur=3 best=4 | brute: ending here 3, anywhere so far 4 | ok
i=5 x=2 | cur=5 best=5 | brute: ending here 5, anywhere so far 5 | ok
i=6 x=1 | cur=6 best=6 | brute: ending here 6, anywhere so far 6 | ok
i=7 x=-5 | cur=1 best=6 | brute: ending here 1, anywhere so far 6 | ok
i=8 x=4 | cur=5 best=6 | brute: ending here 5, anywhere so far 6 | ok
both invariants held at 2776 of 2776 positions in 200 random arrays
~~~

Example 1: the crossing-sum recursion walked exactly n·log₂ n elements (10,240 for n = 1024, 1,048,576 for n = 65536), the four-value recursion made 2n - 1 calls, and all methods — including an O(n²) brute force — agreed on the classic array and on 500 random arrays. Example 2: every row of the trace has \`cur\` equal to the brute-force best sum ending at i and \`best\` equal to the brute-force best so far, which is the loop invariant made visible; on 200 random arrays it held at all 2,776 positions. The random arrays come from a Park–Miller generator built into each program, so all four languages test identical inputs.

## 8. Complexity

| Method | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | Every start, running sum over every end |
| Crossing-sum divide and conquer | O(n log n) | O(log n) | log₂ n levels, n elements walked per level |
| Four-value divide and conquer | O(n) | O(log n) | 2n - 1 calls, O(1) combine each |
| Kadane | O(n) | O(1) | One pass, two variables |
| Segment tree query (four values) | O(log n) per query | O(n) tree | Combine O(log n) stored summaries |

## 9. Edge Cases

- **One element** — the base case of both proofs; all methods return it.
- **All negative** — the answer is the largest element; the crossing sums must start from \`a[mid]\` / \`a[mid + 1]\`, and Kadane from \`a[0]\`.
- **Odd lengths** — \`mid\` rounds down, so the left half gets the extra element; the proof does not care where the split is, only that both halves are non-empty.
- **Ties** — several subarrays may share the best sum; the proofs are about the value, and which one is reported depends on \`>\` versus \`>=\`.
- **Huge n** — both recursions are only about log₂ n deep, so stack depth is not a concern; sum overflow is (see the language notes).

## Common Pitfalls

- **Initialising the crossing sums with 0.** That allows an empty side, and an all-negative array reports 0.
- **Passing the vector by value** into the recursion — a full copy at every call.
- **\`(lo + hi) / 2\` overflow** — undefined behaviour for huge indices; write \`lo + (hi - lo) / 2\`.
- **\`std::max(a, b, c)\`** with three plain arguments does not do what it looks like (the third parameter is a comparator); use \`std::max({a, b, c})\`.
- **Signed overflow** in sums with large values; use \`long long\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Divide and conquer:</strong> <span style="color:#f0e2c8;">Split at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mid = lo + (hi - lo) / 2</code>; the best subarray is in the left half, the right half, or crosses the middle, and the crossing one is best suffix plus best prefix.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Its cost and proof:</strong> <span style="color:#f0e2c8;">T(n) = 2T(n/2) + O(n) = O(n log n). Correct by strong induction on length plus an exchange argument for the crossing case.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Kadane proof:</strong> <span style="color:#f0e2c8;">Loop invariant: after index i, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cur</code> is the best sum ending at i and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> the best inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[0..i]</code>; the lemma <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">E(i) = max(a[i], E(i-1) + a[i])</code> keeps it true.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Comparison:</strong> <span style="color:#f0e2c8;">Kadane is O(n) time, O(1) space and streaming, so it is what I would code; crossing D&C is O(n log n) but its halves are independent and parallelise.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why D&C still matters:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">struct Seg { total, prefix, suffix, best }</code> per segment makes D&C O(n) and is exactly the segment tree node for range queries.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the crossing sums start from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a[mid]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The crossing subarray contains both middle elements; starting at 0 lets a side be empty and all-negative input would return 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Prove the Kadane recurrence.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A subarray ending at i is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[a[i]]</code> or a subarray ending at i - 1 plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i]</code>; the best of the latter extends the best ending at i - 1, by the exchange argument.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::max({a, b, c})</code> with braces?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The braces pick the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">initializer_list</code> overload. Without them, a third argument is taken as a comparator, which does not compile with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How did you test the proofs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Example 2 checks both invariants against brute force at every step (2,776 positions); Example 1 compares all methods on 500 random arrays.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you answer range queries with updates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A segment tree of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Seg</code> structs, O(log n) per query and update.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Divide and conquer** | Split into independent parts, solve recursively, combine |
| **Crossing subarray** | Contains a[mid] and a[mid + 1]; best = best suffix ending at mid + best prefix from mid + 1 |
| **Recurrence relation (running time)** | Cost equation such as T(n) = 2T(n/2) + O(n) |
| **Master theorem** | Rule solving T(n) = aT(n/b) + f(n); here gives Θ(n log n) |
| **Strong induction** | Prove for size n assuming the claim for every smaller size |
| **Cut-and-paste (exchange) argument** | Replace a non-optimal piece with a better one to reach a contradiction |
| **Segment summary (four values)** | total, best prefix, best suffix, best inside — combinable in O(1) |
| **Segment tree** | Binary tree of segment summaries answering range queries in O(log n) |
| **Loop invariant** | A statement true before the loop and after every iteration; proved by initialisation, maintenance, termination |
| **Kadane as dynamic programming** | State E(i) = best sum ending at i, recurrence E(i) = max(a[i], E(i - 1) + a[i]) |

---
**Conclusion:** Kadane's algorithm is correct because of one lemma — the best subarray ending at i is either \`[a[i]]\` or the best ending at i - 1 extended by \`a[i]\` — wrapped in a loop invariant; divide and conquer is correct by strong induction on the left / right / crossing case split. Kadane is O(n) time and O(1) space and is what you code; the crossing-sum recursion is O(n log n), and its four-value form (a \`struct\` per segment) is O(n) and powers segment-tree range queries. Pass the vector by const reference and use \`std::max({...})\`; the verified runs show every method agreeing and both invariants holding at every step.`,
        examples: [
          {
            label: "Crossing-sum divide and conquer, four-value divide and conquer and Kadane: answers and work counted",
            code: `#include <algorithm>
#include <iostream>
#include <vector>

long long touched = 0;                            // elements scanned while computing crossing sums
long long calls = 0;                              // calls made by the four-value version

// classic divide and conquer, O(n log n): best = left, right, or crossing the middle
int crossingDC(const std::vector<int>& a, int lo, int hi) {
    if (lo == hi) return a[lo];
    int mid = lo + (hi - lo) / 2;
    int leftBest = crossingDC(a, lo, mid);
    int rightBest = crossingDC(a, mid + 1, hi);
    int s = 0, bestSuffix = a[mid];
    for (int i = mid; i >= lo; i--) {             // best sum ending exactly at mid
        s += a[i];
        bestSuffix = std::max(bestSuffix, s);
    }
    s = 0;
    int bestPrefix = a[mid + 1];
    for (int j = mid + 1; j <= hi; j++) {         // best sum starting exactly at mid + 1
        s += a[j];
        bestPrefix = std::max(bestPrefix, s);
    }
    touched += hi - lo + 1;
    return std::max({leftBest, rightBest, bestSuffix + bestPrefix});   // initializer-list max
}

struct Seg { int total, prefix, suffix, best; };  // the four numbers that describe a segment

Seg fourValueDC(const std::vector<int>& a, int lo, int hi) {
    calls++;
    if (lo == hi) return {a[lo], a[lo], a[lo], a[lo]};
    int mid = lo + (hi - lo) / 2;
    Seg L = fourValueDC(a, lo, mid);
    Seg R = fourValueDC(a, mid + 1, hi);
    return {L.total + R.total,
            std::max(L.prefix, L.total + R.prefix),
            std::max(R.suffix, R.total + L.suffix),
            std::max({L.best, R.best, L.suffix + R.prefix})};
}

int kadane(const std::vector<int>& a) {
    int best = a[0], cur = a[0];
    for (size_t i = 1; i < a.size(); i++) {
        cur = std::max(a[i], cur + a[i]);
        best = std::max(best, cur);
    }
    return best;
}

int brute(const std::vector<int>& a) {
    int best = a[0];
    for (size_t i = 0; i < a.size(); i++) {
        int s = 0;
        for (size_t j = i; j < a.size(); j++) {
            s += a[j];
            best = std::max(best, s);
        }
    }
    return best;
}

long long seed = 99;

int nextRand(int limit) {
    // Park-Miller generator, so all four languages see the same arrays
    seed = seed * 48271 % 2147483647;
    return static_cast<int>(seed % limit);
}

std::vector<int> randomArray(int n) {
    std::vector<int> a(n);
    for (int i = 0; i < n; i++) a[i] = nextRand(201) - 100;   // values in -100..100
    return a;
}

int main() {
    std::vector<int> a = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
    int last = static_cast<int>(a.size()) - 1;
    std::cout << "classic array: brute " << brute(a) << " | crossing d&c " << crossingDC(a, 0, last)
              << " | four-value d&c " << fourValueDC(a, 0, last).best << " | kadane " << kadane(a) << "\\n";

    for (int n : {1024, 65536}) {
        a = randomArray(n);
        touched = 0;
        calls = 0;
        int x = crossingDC(a, 0, n - 1);
        int y = fourValueDC(a, 0, n - 1).best;
        std::cout << "n=" << n << ": crossing d&c scanned " << touched << " elements | four-value d&c made "
                  << calls << " calls | kadane " << n << " steps | answers " << x << " " << y << " " << kadane(a) << "\\n";
    }

    int agree = 0;
    for (int t = 0; t < 500; t++) {
        a = randomArray(1 + nextRand(40));
        int hi = static_cast<int>(a.size()) - 1;
        int p = brute(a), q = crossingDC(a, 0, hi), r = fourValueDC(a, 0, hi).best, s = kadane(a);
        if (p == q && q == r && r == s) agree++;
    }
    std::cout << "brute force, both d&c versions and kadane agree on " << agree << " of 500 random arrays\\n";
    return 0;
}
`,
          },
          {
            label: "Kadane loop invariants checked against brute force at every step",
            code: `#include <algorithm>
#include <iostream>
#include <vector>

// brute force: the largest sum of a[k..i] over every k <= i
int bestEndingAt(const std::vector<int>& a, int i) {
    int s = 0, best = a[i];
    for (int k = i; k >= 0; k--) {
        s += a[k];
        best = std::max(best, s);
    }
    return best;
}

// brute force: the largest sum of any subarray inside a[0..i]
int bestWithin(const std::vector<int>& a, int i) {
    int best = bestEndingAt(a, 0);
    for (int j = 1; j <= i; j++) best = std::max(best, bestEndingAt(a, j));
    return best;
}

// Kadane, checking both loop invariants after every step
int kadaneChecked(const std::vector<int>& a, bool trace) {
    int cur = a[0], best = a[0], held = 0;
    for (int i = 0; i < static_cast<int>(a.size()); i++) {
        if (i > 0) {
            cur = std::max(a[i], cur + a[i]);
            best = std::max(best, cur);
        }
        bool ok = cur == bestEndingAt(a, i) && best == bestWithin(a, i);
        if (ok) held++;
        if (trace) {
            std::cout << "i=" << i << " x=" << a[i] << " | cur=" << cur << " best=" << best
                      << " | brute: ending here " << bestEndingAt(a, i) << ", anywhere so far "
                      << bestWithin(a, i) << " | " << (ok ? "ok" : "BROKEN") << "\\n";
        }
    }
    return held;
}

long long seed = 123;

int nextRand(int limit) {
    // Park-Miller generator, so all four languages see the same arrays
    seed = seed * 48271 % 2147483647;
    return static_cast<int>(seed % limit);
}

int main() {
    kadaneChecked({-2, 1, -3, 4, -1, 2, 1, -5, 4}, true);
    int held = 0, positions = 0;
    for (int t = 0; t < 200; t++) {
        int n = 1 + nextRand(25);
        std::vector<int> arr(n);
        for (int k = 0; k < n; k++) arr[k] = nextRand(41) - 20;
        held += kadaneChecked(arr, false);
        positions += n;
    }
    std::cout << "both invariants held at " << held << " of " << positions << " positions in 200 random arrays\\n";
    return 0;
}
`,
          },
        ],
      },
    },
  },
];

export default augments;
