/**
 * DSA ULTRA — batch 10: array manipulation, matrices and intervals — best time to buy and sell a
 * stock, merge overlapping intervals, minimum meeting rooms, trapping rain water, and why the
 * two-pointer leftMax/rightMax trick works in O(1) space. One complete answer per language (Python,
 * JavaScript, Java, C++). Every example was run with python3 / node / javac+java / g++ -std=c++17
 * by scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you find the best time to buy and sell a stock?",
    difficulty: "easy",
    seoDescription: "Max profit from one stock trade in one pass: track the cheapest price so far. Python, JavaScript, Java and C++ code, all run and verified.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given a list of daily stock prices. You may buy one share on one day and sell it on a later day. Write a Python function that returns the maximum profit you can make, or 0 if no trade makes money."

**What a strong answer should cover:**
- The order constraint: the buy day must come before the sell day, so max(prices) - min(prices) is wrong.
- The one-pass idea: keep the cheapest price seen so far and the best profit so far; O(n) time, O(1) space.
- Why it is correct: for each sell day the best buy is the minimum of the earlier prices.
- Edge cases: empty list, one price, falling prices (answer 0).
- Python details: \`float('inf')\` as the starting minimum, and why \`min(prices[:i])\` inside the loop silently makes it O(n²) (slicing copies).
- The unlimited-trades follow-up: sum of all positive day-to-day differences.

**Clarifying questions expected:**
- Exactly one transaction, or many?
- Should a falling market return 0 or the smallest loss?

**Code / implementation expected:** Yes — a single \`for\` loop over the list with two variables, in Python 3.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need to know loops and variables in Python.  
**Difficulty:** Easy  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine you collect football stickers and you know, from a friend with a time machine, what one rare sticker will cost at the shop on each of the next six days: 7, 1, 5, 3, 6, 4 coins. You are allowed to buy it once and sell it back once, and you must buy before you sell (no time travel for you). On which day do you buy, and on which day do you sell?

Your eye goes straight to the cheapest day (1 coin, day 1) and the most expensive later day (6 coins, day 4): profit 5. But notice the trap: the most expensive day overall is day 0 (7 coins), and you cannot sell on day 0 because you have not bought anything yet. **The order of the days matters.** That one rule — buy strictly before you sell — is the whole problem, and it is why "maximum minus minimum" is the wrong answer.

This question is popular because it is small enough to finish in ten minutes, yet it checks whether you can turn an obvious O(n²) "try every pair" idea into a single pass by asking: *what do I need to remember about the past?*

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Exactly one buy and one sell, or as many trades as I like? | One trade is this problem; unlimited trades is a different (also greedy) answer — see section 9. |
| If prices only fall, do I return 0 or the least-bad loss? | The classic version returns 0 ("do not trade"). Returning a negative number changes the initial value of \`best\`. |
| Can I buy and sell on the same day? | Same day gives profit 0, so it never beats 0 — but it tells you the answer is never negative. |
| How many days, and how big can prices get? | Up to 10^5 days rules out O(n²). Large prices matter for overflow in fixed-size integers. |
| Do you want the profit only, or also the two days? | Returning the days means tracking the index of the minimum, not just its value. |

## 3. The Core Idea

Walk through the days from left to right. On each day, ask one question: **"If I sold today, what is the best I could have done?"** The answer is *today's price minus the cheapest price I have seen so far*. So you only need to remember two numbers while you walk:

- \`minPrice\` — the cheapest price on any earlier day (the best possible buy so far)
- \`best\` — the best profit found so far

📌 **Interview term: Running minimum** — the smallest value seen so far while scanning left to right; here it is the best day to have bought, for any sell day you have reached.

📌 **Interview term: Single pass (one-pass) algorithm** — an algorithm that reads the input once, from start to end, keeping only a few variables of state. It is O(n) time and O(1) extra space.

📌 **Interview term: Greedy choice** — a decision that is locally best and never needs to be undone. Keeping the cheapest buy so far is greedy: a cheaper earlier buy can only ever help a later sale. See [what is a greedy algorithm](/interview-question/what-is-a-greedy-algorithm).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Price bars for six days. Buy on day 1 at price 1 and sell on day 4 at price 6 for a profit of 5">
  <defs>
    <marker id="b10q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="18" text-anchor="middle">Prices [7, 1, 5, 3, 6, 4]</text>
  <rect class="d-box-muted" x="70" y="46" width="70" height="154" rx="4"/>
  <text class="d-text" x="105" y="36" text-anchor="middle">7</text>
  <text class="d-sub" x="105" y="224" text-anchor="middle">day 0</text>
  <rect class="d-box-accent" x="155" y="178" width="70" height="22" rx="4"/>
  <text class="d-text" x="190" y="168" text-anchor="middle">1</text>
  <text class="d-sub" x="190" y="224" text-anchor="middle">day 1</text>
  <rect class="d-box-muted" x="240" y="90" width="70" height="110" rx="4"/>
  <text class="d-text" x="275" y="80" text-anchor="middle">5</text>
  <text class="d-sub" x="275" y="224" text-anchor="middle">day 2</text>
  <rect class="d-box-muted" x="325" y="134" width="70" height="66" rx="4"/>
  <text class="d-text" x="360" y="124" text-anchor="middle">3</text>
  <text class="d-sub" x="360" y="224" text-anchor="middle">day 3</text>
  <rect class="d-box-accent" x="410" y="68" width="70" height="132" rx="4"/>
  <text class="d-text" x="445" y="58" text-anchor="middle">6</text>
  <text class="d-sub" x="445" y="224" text-anchor="middle">day 4</text>
  <rect class="d-box-muted" x="495" y="112" width="70" height="88" rx="4"/>
  <text class="d-text" x="530" y="102" text-anchor="middle">4</text>
  <text class="d-sub" x="530" y="224" text-anchor="middle">day 5</text>
  <path class="d-edge" d="M 55 200 L 595 200"/>
  <text class="d-text d-accent" x="190" y="248" text-anchor="middle">buy</text>
  <text class="d-text d-accent" x="445" y="248" text-anchor="middle">sell</text>
  <path class="d-edge-accent" d="M 214 244 L 415 244" marker-end="url(#b10q1-arrow)"/>
  <text class="d-sub" x="317" y="276" text-anchor="middle">profit 6 - 1 = 5</text>
</svg>

Day 1 is the cheapest day that comes before the most expensive later day, so the answer is 6 − 1 = 5. Day 0 has the highest price of all, but nothing was bought before it.

Each day does exactly one of two things:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="For each price, either record a new cheapest buy price or try selling today against the cheapest earlier price">
  <defs>
    <marker id="b10q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="90" text-anchor="middle">Next price p</text>
  <text class="d-sub" x="95" y="112" text-anchor="middle">one per day, in order</text>
  <path class="d-edge" d="M 172 95 L 238 95" marker-end="url(#b10q1-arrow2)"/>
  <rect class="d-box-muted" x="242" y="60" width="160" height="70" rx="10"/>
  <text class="d-text" x="322" y="90" text-anchor="middle">p below minPrice?</text>
  <text class="d-sub" x="322" y="112" text-anchor="middle">compare with the best buy</text>
  <path class="d-edge" d="M 404 80 L 470 40" marker-end="url(#b10q1-arrow2)"/>
  <path class="d-edge" d="M 404 110 L 470 150" marker-end="url(#b10q1-arrow2)"/>
  <text class="d-sub" x="430" y="48" text-anchor="middle">yes</text>
  <text class="d-sub" x="430" y="150" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="474" y="14" width="200" height="56" rx="10"/>
  <text class="d-text" x="574" y="38" text-anchor="middle">minPrice = p</text>
  <text class="d-sub" x="574" y="58" text-anchor="middle">a cheaper day to buy</text>
  <rect class="d-box-accent" x="474" y="122" width="200" height="56" rx="10"/>
  <text class="d-text" x="574" y="146" text-anchor="middle">best = max(best, p - min)</text>
  <text class="d-sub" x="574" y="166" text-anchor="middle">try selling today</text>
</svg>

If today is a new cheapest day, selling today would make a loss, so we just remember it as the new best buy. Otherwise we check whether selling today beats the best profit so far.

## 4. From Brute Force to One Pass

**Brute force.** Try every pair of days \`(i, j)\` with \`i < j\`, compute \`prices[j] - prices[i]\`, keep the largest. That is n(n−1)/2 pairs: about 5 × 10^9 for 100,000 days. Far too slow — example 2 counts the pairs for 2,000 days and gets 1,999,000.

**The key observation.** Fix a sell day \`j\`. Among all buy days before \`j\`, the best one is simply the cheapest. So instead of looking back over every earlier day, carry the cheapest earlier price forward as you go. Each day then costs O(1) work.

📌 **Interview term: Brute force** — the most direct solution that tries every possibility. It is always worth stating first, both as a correctness reference and to show where the wasted work is.

Here is the walk on \`[7, 1, 5, 3, 6, 4]\`, one row per day:

| Day | Price | minPrice before today | Sell today would give | best after today |
| :--- | :--- | :--- | :--- | :--- |
| 0 | 7 | none (∞) | — (new minimum) | 0 |
| 1 | 1 | 7 | — (new minimum 1) | 0 |
| 2 | 5 | 1 | 4 | 4 |
| 3 | 3 | 1 | 2 | 4 |
| 4 | 6 | 1 | 5 | **5** |
| 5 | 4 | 1 | 3 | 5 |

This is the same "carry the best thing so far" pattern as Kadane's algorithm for the [maximum subarray sum](/interview-question/how-do-you-find-the-maximum-subarray-sum): the daily price changes are \`[-6, 4, -2, 3, -2]\`, and the best trade is the best-sum run of consecutive changes (4 − 2 + 3 = 5).

## 5. The Code in Python

The Python version reads almost like the English description. \`float("inf")\` is positive infinity: any real price is smaller, so the first day always becomes the minimum and we do not need a special case for an empty list. Python integers never overflow, so \`p - min_price\` is always exact.

📌 **Interview term: Sentinel value** — a made-up starting value, such as infinity or the largest possible int, chosen so that the first real input always replaces it. It removes the special case for the first element.

~~~python
def max_profit(prices):
    """One pass: remember the cheapest price so far, try selling today."""
    min_price = float("inf")  # cheapest buy seen so far
    best = 0                  # best profit seen so far (0 = do not trade)
    for p in prices:
        if p < min_price:
            min_price = p             # a new cheapest day to buy
        elif p - min_price > best:
            best = p - min_price      # selling today beats the old best
    return best
~~~

**What to point out in this code:**

- \`for p in prices\` iterates values directly; you only need \`enumerate(prices)\` when you also want the day number (example 2 uses indexes to report the days).
- The \`elif\` matters: a day that sets a new minimum can never be the sell day of a profitable trade, so we skip the profit check for it.
- A tempting shortcut is to call \`min(prices[:i])\` on every day \`i\`. It gives the right answer but is **O(n²)**: each \`prices[:i]\` builds a new list and \`min\` scans it. On a 20,000-day falling list in our sandbox it took about 1.9 seconds, while the loop above took under a millisecond.
- To report days as well as profit, keep the *index* of the minimum (\`min_day\`) instead of its value — example 2 does exactly this and returns a tuple \`(profit, buy_day, sell_day)\`.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. In example 2 the 2,000 prices come from a small deterministic random generator (MINSTD), so every language sees the same list, and brute force and the one pass agree on the profit (493) while doing very different amounts of work.

**Example 1 — the one-pass solution on seven inputs** prints:

~~~text
5
0
2
0
2
0
0
~~~

**Example 2 — buy and sell days, brute force vs one pass, and the unlimited-trades follow-up** prints:

~~~text
best trade in [7, 1, 5, 3, 6, 4]: buy day 1, sell day 4, profit 5
best trade in [7, 6, 4, 3, 1]: buy day -1, sell day -1, profit 0
n = 2000 random prices
brute force: profit 493, pairs checked 1999000
one pass:    profit 493, prices visited 2000
unlimited trades on [7, 1, 5, 3, 6, 4]: profit 7
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (all pairs) | O(n²) | O(1) | n(n−1)/2 pairs: 1,999,000 for n = 2,000 (example 2) |
| One pass | O(n) | O(1) | each price is looked at once; two variables of state |
| \`min(prices[:i])\` in a loop | O(n²) | O(n) | the slice copies i items every iteration |

## 8. Edge Cases

- **Empty list or a single day** — no pair of days exists, so the answer is 0. All four versions return 0 for \`[]\` and \`[5]\` (example 1).
- **Prices only fall** (\`[7, 6, 4, 3, 1]\`) — every possible trade loses money; the answer is 0 and the days are reported as -1 (example 2).
- **All prices equal** (\`[3, 3, 3]\`) — profit 0; the code must not treat "equal" as a new minimum *and* a sale at once (the \`else\` handles it).
- **The minimum comes after the maximum** (\`[2, 4, 1]\`) — the answer is 2 (buy 2, sell 4), not 4 − 1 = 3 and not 0. This is the case that kills "max minus min".
- **A later, lower minimum** (\`[2, 1, 2, 1, 0, 1, 2]\`) — the minimum keeps moving (2 → 1 → 0); the best trade is buy 0, sell 2, profit 2.

## 9. The Follow-Up: As Many Trades as You Like

If you may buy and sell any number of times (one share at a time), the answer is the **sum of every rising step**: whenever tomorrow is higher than today, take that gain. For \`[7, 1, 5, 3, 6, 4]\` that is (5 − 1) + (6 − 3) = 7, which example 2 prints. Any longer rising run, say 1 → 3 → 6, earns the same as its steps added up (2 + 3 = 5), so cutting it into one-day trades loses nothing.

Harder variants (at most two trades, at most k trades, a cooldown day, a fee per trade) need a small [dynamic programming](/interview-question/what-is-dynamic-programming) state machine ("holding a share" vs "not holding"), which is beyond this page.

## Common Pitfalls

- **Returning \`max(prices) - min(prices)\`.** It ignores the order of days; on \`[2, 4, 1]\` it gives 3 instead of 2.
- **Starting \`min_price\` at \`prices[0]\` without a guard.** \`prices[0]\` raises \`IndexError\` on an empty list; \`float("inf")\` avoids the special case.
- **Hidden O(n²) through slicing.** \`min(prices[:i])\` or \`prices.index(min(prices))\` inside a loop copies or scans the list each time.
- **Mixing up value and index.** If you need the days, track \`min_day\` (an index); tracking only \`min_price\` loses which day it was.
- **Forgetting the answer can be 0.** Initialise \`best = 0\`, not \`best = prices[1] - prices[0]\`, unless the interviewer asked for the least-bad loss.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Scan once; keep the cheapest price so far and the best profit so far.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The update:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p &lt; min_price</code> it becomes the new buy; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best = max(best, p - min_price)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it works:</strong> <span style="color:#f0e2c8;">For any sell day, the best buy is the minimum of the earlier days, and that is exactly what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min_price</code> holds.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) space; brute force over all pairs is O(n²).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Start with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float('inf')</code> so an empty list returns 0, and never call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min(prices[:i])</code> inside the loop.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">max(prices) - min(prices)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The maximum may come before the minimum. In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 4, 1]</code> that gives 3, but you cannot sell at 4 after buying at 1; the right answer is 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the buy and sell days?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min_day</code> (the index of the cheapest price) and record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">buy, sell = min_day, day</code> whenever the profit improves. Return a tuple.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you may trade as many times as you like?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add up every positive difference <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prices[i] - prices[i - 1]</code>; for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[7, 1, 5, 3, 6, 4]</code> that is 7.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this related to Kadane?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The best trade is the maximum-sum run of daily differences, which is Kadane on the difference array.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if prices arrive as a stream?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same loop works unchanged: it only ever needs the current price, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min_price</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Running minimum** | Smallest value seen so far in a left-to-right scan |
| **Single pass (one-pass) algorithm** | Reads the input once with O(1) state |
| **Greedy choice** | A locally best decision that never has to be undone |
| **Brute force** | Try every possibility; the reference you improve on |
| **Sentinel value** | A stand-in starting value (like infinity) that any real input replaces |

---
**Conclusion:** In Python the whole solution is a five-line loop: remember the cheapest price so far, and on every other day try selling against it. It is O(n) time and O(1) space, it handles empty lists through the \`float("inf")\` sentinel, and it avoids the two classic traps — "max minus min" ignores the order of days, and \`min(prices[:i])\` inside a loop quietly turns the solution back into O(n²).`,
        examples: [
          {
            label: "One pass: cheapest price so far + best profit (7 inputs)",
            code: `def max_profit(prices):
    """One pass: remember the cheapest price so far, try selling today."""
    min_price = float("inf")  # cheapest buy seen so far
    best = 0                  # best profit seen so far (0 = do not trade)
    for p in prices:
        if p < min_price:
            min_price = p             # a new cheapest day to buy
        elif p - min_price > best:
            best = p - min_price      # selling today beats the old best
    return best


print(max_profit([7, 1, 5, 3, 6, 4]))  # 5
print(max_profit([7, 6, 4, 3, 1]))  # 0
print(max_profit([2, 4, 1]))  # 2
print(max_profit([3, 3, 3]))  # 0
print(max_profit([2, 1, 2, 1, 0, 1, 2]))  # 2
print(max_profit([5]))  # 0
print(max_profit([]))  # 0`,
          },
          {
            label: "Buy/sell days, brute force vs one pass, unlimited trades",
            code: `def best_trade(prices):
    """Return (profit, buy_day, sell_day); days are -1 when no trade helps."""
    best, buy, sell = 0, -1, -1
    min_day = 0
    for day in range(1, len(prices)):
        if prices[day] < prices[min_day]:
            min_day = day
        elif prices[day] - prices[min_day] > best:
            best, buy, sell = prices[day] - prices[min_day], min_day, day
    return best, buy, sell


def brute_force(prices):
    """Try every (buy, sell) pair; count how many pairs we look at."""
    best, pairs = 0, 0
    for i in range(len(prices)):
        for j in range(i + 1, len(prices)):
            pairs += 1
            best = max(best, prices[j] - prices[i])
    return best, pairs


def unlimited_trades(prices):
    """Follow-up: any number of trades = sum of every rising step."""
    return sum(max(0, prices[i] - prices[i - 1]) for i in range(1, len(prices)))


def random_prices(n, seed):
    """A falling market with noise, so the best trade is not obvious."""
    out = []
    for i in range(n):
        seed = seed * 48271 % 2147483647  # MINSTD generator, same in every language
        out.append(seed % 500 + (n - i) // 4 + 1)
    return out


p, b, s = best_trade([7, 1, 5, 3, 6, 4])
print("best trade in [7, 1, 5, 3, 6, 4]: buy day " + str(b) + ", sell day " + str(s) + ", profit " + str(p))
p, b, s = best_trade([7, 6, 4, 3, 1])
print("best trade in [7, 6, 4, 3, 1]: buy day " + str(b) + ", sell day " + str(s) + ", profit " + str(p))

prices = random_prices(2000, 42)
bf, pairs = brute_force(prices)
op = best_trade(prices)[0]
print("n = 2000 random prices")
print("brute force: profit " + str(bf) + ", pairs checked " + str(pairs))
print("one pass:    profit " + str(op) + ", prices visited " + str(len(prices)))
print("unlimited trades on [7, 1, 5, 3, 6, 4]: profit " + str(unlimited_trades([7, 1, 5, 3, 6, 4])))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given an array of daily stock prices. You may buy one share on one day and sell it on a later day. Write a JavaScript function that returns the maximum profit, or 0 if no trade makes money."

**What a strong answer should cover:**
- The order constraint: the buy day must come before the sell day, so max minus min is wrong.
- The one-pass idea: track the cheapest price so far and the best profit so far; O(n) time, O(1) space.
- Why it is correct: for each sell day the best buy is the minimum of the earlier prices.
- Edge cases: empty array, one price, falling prices (answer 0).
- JavaScript details: \`Infinity\` as the starting minimum, \`Math.min(...prices)\` throwing \`RangeError\` on very large arrays, and floating-point prices like 0.3 - 0.1.
- The unlimited-trades follow-up: sum of all positive day-to-day differences.

**Clarifying questions expected:**
- Exactly one transaction, or many?
- Are prices whole numbers (cents) or decimals?

**Code / implementation expected:** Yes — a single \`for...of\` loop with two variables, in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need to know loops and variables in JavaScript.  
**Difficulty:** Easy  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine you collect football stickers and you know, from a friend with a time machine, what one rare sticker will cost at the shop on each of the next six days: 7, 1, 5, 3, 6, 4 coins. You are allowed to buy it once and sell it back once, and you must buy before you sell (no time travel for you). On which day do you buy, and on which day do you sell?

Your eye goes straight to the cheapest day (1 coin, day 1) and the most expensive later day (6 coins, day 4): profit 5. But notice the trap: the most expensive day overall is day 0 (7 coins), and you cannot sell on day 0 because you have not bought anything yet. **The order of the days matters.** That one rule — buy strictly before you sell — is the whole problem, and it is why "maximum minus minimum" is the wrong answer.

This question is popular because it is small enough to finish in ten minutes, yet it checks whether you can turn an obvious O(n²) "try every pair" idea into a single pass by asking: *what do I need to remember about the past?*

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Exactly one buy and one sell, or as many trades as I like? | One trade is this problem; unlimited trades is a different (also greedy) answer — see section 9. |
| If prices only fall, do I return 0 or the least-bad loss? | The classic version returns 0 ("do not trade"). Returning a negative number changes the initial value of \`best\`. |
| Can I buy and sell on the same day? | Same day gives profit 0, so it never beats 0 — but it tells you the answer is never negative. |
| How many days, and how big can prices get? | Up to 10^5 days rules out O(n²). Large prices matter for overflow in fixed-size integers. |
| Do you want the profit only, or also the two days? | Returning the days means tracking the index of the minimum, not just its value. |

## 3. The Core Idea

Walk through the days from left to right. On each day, ask one question: **"If I sold today, what is the best I could have done?"** The answer is *today's price minus the cheapest price I have seen so far*. So you only need to remember two numbers while you walk:

- \`minPrice\` — the cheapest price on any earlier day (the best possible buy so far)
- \`best\` — the best profit found so far

📌 **Interview term: Running minimum** — the smallest value seen so far while scanning left to right; here it is the best day to have bought, for any sell day you have reached.

📌 **Interview term: Single pass (one-pass) algorithm** — an algorithm that reads the input once, from start to end, keeping only a few variables of state. It is O(n) time and O(1) extra space.

📌 **Interview term: Greedy choice** — a decision that is locally best and never needs to be undone. Keeping the cheapest buy so far is greedy: a cheaper earlier buy can only ever help a later sale. See [what is a greedy algorithm](/interview-question/what-is-a-greedy-algorithm).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Price bars for six days. Buy on day 1 at price 1 and sell on day 4 at price 6 for a profit of 5">
  <defs>
    <marker id="b10q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="18" text-anchor="middle">Prices [7, 1, 5, 3, 6, 4]</text>
  <rect class="d-box-muted" x="70" y="46" width="70" height="154" rx="4"/>
  <text class="d-text" x="105" y="36" text-anchor="middle">7</text>
  <text class="d-sub" x="105" y="224" text-anchor="middle">day 0</text>
  <rect class="d-box-accent" x="155" y="178" width="70" height="22" rx="4"/>
  <text class="d-text" x="190" y="168" text-anchor="middle">1</text>
  <text class="d-sub" x="190" y="224" text-anchor="middle">day 1</text>
  <rect class="d-box-muted" x="240" y="90" width="70" height="110" rx="4"/>
  <text class="d-text" x="275" y="80" text-anchor="middle">5</text>
  <text class="d-sub" x="275" y="224" text-anchor="middle">day 2</text>
  <rect class="d-box-muted" x="325" y="134" width="70" height="66" rx="4"/>
  <text class="d-text" x="360" y="124" text-anchor="middle">3</text>
  <text class="d-sub" x="360" y="224" text-anchor="middle">day 3</text>
  <rect class="d-box-accent" x="410" y="68" width="70" height="132" rx="4"/>
  <text class="d-text" x="445" y="58" text-anchor="middle">6</text>
  <text class="d-sub" x="445" y="224" text-anchor="middle">day 4</text>
  <rect class="d-box-muted" x="495" y="112" width="70" height="88" rx="4"/>
  <text class="d-text" x="530" y="102" text-anchor="middle">4</text>
  <text class="d-sub" x="530" y="224" text-anchor="middle">day 5</text>
  <path class="d-edge" d="M 55 200 L 595 200"/>
  <text class="d-text d-accent" x="190" y="248" text-anchor="middle">buy</text>
  <text class="d-text d-accent" x="445" y="248" text-anchor="middle">sell</text>
  <path class="d-edge-accent" d="M 214 244 L 415 244" marker-end="url(#b10q1-arrow)"/>
  <text class="d-sub" x="317" y="276" text-anchor="middle">profit 6 - 1 = 5</text>
</svg>

Day 1 is the cheapest day that comes before the most expensive later day, so the answer is 6 − 1 = 5. Day 0 has the highest price of all, but nothing was bought before it.

Each day does exactly one of two things:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="For each price, either record a new cheapest buy price or try selling today against the cheapest earlier price">
  <defs>
    <marker id="b10q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="90" text-anchor="middle">Next price p</text>
  <text class="d-sub" x="95" y="112" text-anchor="middle">one per day, in order</text>
  <path class="d-edge" d="M 172 95 L 238 95" marker-end="url(#b10q1-arrow2)"/>
  <rect class="d-box-muted" x="242" y="60" width="160" height="70" rx="10"/>
  <text class="d-text" x="322" y="90" text-anchor="middle">p below minPrice?</text>
  <text class="d-sub" x="322" y="112" text-anchor="middle">compare with the best buy</text>
  <path class="d-edge" d="M 404 80 L 470 40" marker-end="url(#b10q1-arrow2)"/>
  <path class="d-edge" d="M 404 110 L 470 150" marker-end="url(#b10q1-arrow2)"/>
  <text class="d-sub" x="430" y="48" text-anchor="middle">yes</text>
  <text class="d-sub" x="430" y="150" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="474" y="14" width="200" height="56" rx="10"/>
  <text class="d-text" x="574" y="38" text-anchor="middle">minPrice = p</text>
  <text class="d-sub" x="574" y="58" text-anchor="middle">a cheaper day to buy</text>
  <rect class="d-box-accent" x="474" y="122" width="200" height="56" rx="10"/>
  <text class="d-text" x="574" y="146" text-anchor="middle">best = max(best, p - min)</text>
  <text class="d-sub" x="574" y="166" text-anchor="middle">try selling today</text>
</svg>

If today is a new cheapest day, selling today would make a loss, so we just remember it as the new best buy. Otherwise we check whether selling today beats the best profit so far.

## 4. From Brute Force to One Pass

**Brute force.** Try every pair of days \`(i, j)\` with \`i < j\`, compute \`prices[j] - prices[i]\`, keep the largest. That is n(n−1)/2 pairs: about 5 × 10^9 for 100,000 days. Far too slow — example 2 counts the pairs for 2,000 days and gets 1,999,000.

**The key observation.** Fix a sell day \`j\`. Among all buy days before \`j\`, the best one is simply the cheapest. So instead of looking back over every earlier day, carry the cheapest earlier price forward as you go. Each day then costs O(1) work.

📌 **Interview term: Brute force** — the most direct solution that tries every possibility. It is always worth stating first, both as a correctness reference and to show where the wasted work is.

Here is the walk on \`[7, 1, 5, 3, 6, 4]\`, one row per day:

| Day | Price | minPrice before today | Sell today would give | best after today |
| :--- | :--- | :--- | :--- | :--- |
| 0 | 7 | none (∞) | — (new minimum) | 0 |
| 1 | 1 | 7 | — (new minimum 1) | 0 |
| 2 | 5 | 1 | 4 | 4 |
| 3 | 3 | 1 | 2 | 4 |
| 4 | 6 | 1 | 5 | **5** |
| 5 | 4 | 1 | 3 | 5 |

This is the same "carry the best thing so far" pattern as Kadane's algorithm for the [maximum subarray sum](/interview-question/how-do-you-find-the-maximum-subarray-sum): the daily price changes are \`[-6, 4, -2, 3, -2]\`, and the best trade is the best-sum run of consecutive changes (4 − 2 + 3 = 5).

## 5. The Code in JavaScript

In JavaScript, \`Infinity\` is a real number value that is larger than every other number, so it is a natural starting point for \`minPrice\`: the first price always replaces it, and an empty array simply returns 0.

📌 **Interview term: Sentinel value** — a made-up starting value, such as infinity or the largest possible int, chosen so that the first real input always replaces it. It removes the special case for the first element.

~~~javascript
function maxProfit(prices) {
  // One pass: remember the cheapest price so far, try selling today.
  let minPrice = Infinity; // cheapest buy seen so far
  let best = 0;            // best profit seen so far (0 = do not trade)
  for (const p of prices) {
    if (p < minPrice) {
      minPrice = p;              // a new cheapest day to buy
    } else if (p - minPrice > best) {
      best = p - minPrice;       // selling today beats the old best
    }
  }
  return best;
}
~~~

**What to point out in this code:**

- \`for (const p of prices)\` iterates values. Use a classic \`for (let day = 0; ...)\` loop when you need the day number, as example 2 does.
- \`else if\` matters: a new minimum day can never be the sell day of a profitable trade.
- **Do not reach for \`Math.min(...prices)\`.** Spreading an array passes every element as a separate function argument. In Node.js 22 in our sandbox, \`Math.min(...new Array(1e6).fill(1))\` threw \`RangeError: Maximum call stack size exceeded\`. It is also the wrong answer here, because the minimum must come before the sell day.
- **Prices with decimals.** JavaScript numbers are binary floating point: \`0.3 - 0.1\` printed \`0.19999999999999998\` in our run. If prices are money, work in integer cents, or round the final answer for display (\`Math.round(x * 100) / 100\` printed \`0.2\`).

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. In example 2 the 2,000 prices come from a small deterministic random generator (MINSTD), so every language sees the same list, and brute force and the one pass agree on the profit (493) while doing very different amounts of work.

**Example 1 — the one-pass solution on seven inputs** prints:

~~~text
5
0
2
0
2
0
0
~~~

**Example 2 — buy and sell days, brute force vs one pass, and the unlimited-trades follow-up** prints:

~~~text
best trade in [7, 1, 5, 3, 6, 4]: buy day 1, sell day 4, profit 5
best trade in [7, 6, 4, 3, 1]: buy day -1, sell day -1, profit 0
n = 2000 random prices
brute force: profit 493, pairs checked 1999000
one pass:    profit 493, prices visited 2000
unlimited trades on [7, 1, 5, 3, 6, 4]: profit 7
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (all pairs) | O(n²) | O(1) | n(n−1)/2 pairs: 1,999,000 for n = 2,000 (example 2) |
| One pass | O(n) | O(1) | each price is looked at once; two variables of state |
| \`Math.min(...prices.slice(0, i))\` in a loop | O(n²) | O(n) | copies and scans the prefix every day, and can throw on big arrays |

## 8. Edge Cases

- **Empty list or a single day** — no pair of days exists, so the answer is 0. All four versions return 0 for \`[]\` and \`[5]\` (example 1).
- **Prices only fall** (\`[7, 6, 4, 3, 1]\`) — every possible trade loses money; the answer is 0 and the days are reported as -1 (example 2).
- **All prices equal** (\`[3, 3, 3]\`) — profit 0; the code must not treat "equal" as a new minimum *and* a sale at once (the \`else\` handles it).
- **The minimum comes after the maximum** (\`[2, 4, 1]\`) — the answer is 2 (buy 2, sell 4), not 4 − 1 = 3 and not 0. This is the case that kills "max minus min".
- **A later, lower minimum** (\`[2, 1, 2, 1, 0, 1, 2]\`) — the minimum keeps moving (2 → 1 → 0); the best trade is buy 0, sell 2, profit 2.

## 9. The Follow-Up: As Many Trades as You Like

If you may buy and sell any number of times (one share at a time), the answer is the **sum of every rising step**: whenever tomorrow is higher than today, take that gain. For \`[7, 1, 5, 3, 6, 4]\` that is (5 − 1) + (6 − 3) = 7, which example 2 prints. Any longer rising run, say 1 → 3 → 6, earns the same as its steps added up (2 + 3 = 5), so cutting it into one-day trades loses nothing.

Harder variants (at most two trades, at most k trades, a cooldown day, a fee per trade) need a small [dynamic programming](/interview-question/what-is-dynamic-programming) state machine ("holding a share" vs "not holding"), which is beyond this page.

## Common Pitfalls

- **Returning \`Math.max(...prices) - Math.min(...prices)\`.** It ignores the order of days ( \`[2, 4, 1]\` gives 3, the answer is 2) and spreading a huge array throws \`RangeError\`.
- **Starting \`minPrice\` at \`prices[0]\`.** On an empty array that is \`undefined\`, and \`p - undefined\` is \`NaN\`, which then poisons every comparison silently. \`Infinity\` avoids it.
- **Floating-point money.** \`0.3 - 0.1\` is \`0.19999999999999998\`; store cents as integers or round at the end.
- **Mixing up value and index.** To report the days, track \`minDay\` (an index) rather than only \`minPrice\`.
- **Forgetting the answer can be 0.** Initialise \`best = 0\` so a falling market returns 0, not a negative number.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Scan once; keep the cheapest price so far and the best profit so far.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The update:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p &lt; minPrice</code> it becomes the new buy; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best = Math.max(best, p - minPrice)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it works:</strong> <span style="color:#f0e2c8;">For any sell day the best buy is the minimum of the earlier days, which is exactly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">minPrice</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) space; trying every pair is O(n²).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Start from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Infinity</code>, never spread a big array into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min</code>, and keep money in integer cents.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not max minus min?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The maximum may come before the minimum. In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 4, 1]</code> that gives 3, but the real best trade is buy 2, sell 4, profit 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the days?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">minDay</code> and, whenever the profit improves, record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[best, minDay, day]</code>; return that array or an object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if trades are unlimited?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sum every positive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prices[i] - prices[i - 1]</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[7, 1, 5, 3, 6, 4]</code> gives 7.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with an empty array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The loop does not run and the function returns 0. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">minPrice = prices[0]</code> you would compare against <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> and could get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Prices are decimals like 10.15 — any concern?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, binary floating point. Convert to integer cents first (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.round(p * 100)</code>), compute, then divide by 100 for display.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Running minimum** | Smallest value seen so far in a left-to-right scan |
| **Single pass (one-pass) algorithm** | Reads the input once with O(1) state |
| **Greedy choice** | A locally best decision that never has to be undone |
| **Brute force** | Try every possibility; the reference you improve on |
| **Sentinel value** | A stand-in starting value (like infinity) that any real input replaces |

---
**Conclusion:** In JavaScript the solution is one \`for...of\` loop: keep the cheapest price so far (starting at \`Infinity\`) and the best profit so far. It runs in O(n) time and O(1) space and returns 0 for empty or falling arrays. The JavaScript-specific traps are spreading a large array into \`Math.min\` (which threw \`RangeError\` at a million elements in Node 22), comparing against \`undefined\` when the array is empty, and floating-point money.`,
        examples: [
          {
            label: "One pass: cheapest price so far + best profit (7 inputs)",
            code: `function maxProfit(prices) {
  // One pass: remember the cheapest price so far, try selling today.
  let minPrice = Infinity; // cheapest buy seen so far
  let best = 0;            // best profit seen so far (0 = do not trade)
  for (const p of prices) {
    if (p < minPrice) {
      minPrice = p;              // a new cheapest day to buy
    } else if (p - minPrice > best) {
      best = p - minPrice;       // selling today beats the old best
    }
  }
  return best;
}

console.log(maxProfit([7, 1, 5, 3, 6, 4])); // 5
console.log(maxProfit([7, 6, 4, 3, 1])); // 0
console.log(maxProfit([2, 4, 1])); // 2
console.log(maxProfit([3, 3, 3])); // 0
console.log(maxProfit([2, 1, 2, 1, 0, 1, 2])); // 2
console.log(maxProfit([5])); // 0
console.log(maxProfit([])); // 0`,
          },
          {
            label: "Buy/sell days, brute force vs one pass, unlimited trades",
            code: `// Returns [profit, buyDay, sellDay]; days are -1 when no trade helps.
function bestTrade(prices) {
  let best = 0, buy = -1, sell = -1, minDay = 0;
  for (let day = 1; day < prices.length; day++) {
    if (prices[day] < prices[minDay]) {
      minDay = day;
    } else if (prices[day] - prices[minDay] > best) {
      best = prices[day] - prices[minDay];
      buy = minDay;
      sell = day;
    }
  }
  return [best, buy, sell];
}

// Try every (buy, sell) pair; count how many pairs we look at.
function bruteForce(prices) {
  let best = 0, pairs = 0;
  for (let i = 0; i < prices.length; i++) {
    for (let j = i + 1; j < prices.length; j++) {
      pairs++;
      best = Math.max(best, prices[j] - prices[i]);
    }
  }
  return [best, pairs];
}

// Follow-up: any number of trades = sum of every rising step.
function unlimitedTrades(prices) {
  let total = 0;
  for (let i = 1; i < prices.length; i++) total += Math.max(0, prices[i] - prices[i - 1]);
  return total;
}

// A falling market with noise, so the best trade is not obvious.
function randomPrices(n, seed) {
  const out = [];
  for (let i = 0; i < n; i++) {
    seed = (seed * 48271) % 2147483647; // MINSTD; the product stays below 2^53, so it is exact
    out.push((seed % 500) + Math.floor((n - i) / 4) + 1);
  }
  return out;
}

let r = bestTrade([7, 1, 5, 3, 6, 4]);
console.log("best trade in [7, 1, 5, 3, 6, 4]: buy day " + r[1] + ", sell day " + r[2] + ", profit " + r[0]);
r = bestTrade([7, 6, 4, 3, 1]);
console.log("best trade in [7, 6, 4, 3, 1]: buy day " + r[1] + ", sell day " + r[2] + ", profit " + r[0]);

const prices = randomPrices(2000, 42);
const bf = bruteForce(prices);
const op = bestTrade(prices)[0];
console.log("n = 2000 random prices");
console.log("brute force: profit " + bf[0] + ", pairs checked " + bf[1]);
console.log("one pass:    profit " + op + ", prices visited " + prices.length);
console.log("unlimited trades on [7, 1, 5, 3, 6, 4]: profit " + unlimitedTrades([7, 1, 5, 3, 6, 4]));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given an int array of daily stock prices. You may buy one share on one day and sell it on a later day. Write a Java method that returns the maximum profit, or 0 if no trade makes money."

**What a strong answer should cover:**
- The order constraint: the buy day must come before the sell day, so max minus min is wrong.
- The one-pass idea: track the cheapest price so far and the best profit so far; O(n) time, O(1) space.
- Why it is correct: for each sell day the best buy is the minimum of the earlier prices.
- Edge cases: empty array, one price, falling prices (answer 0).
- Java details: \`Integer.MAX_VALUE\` as the starting minimum, working on \`int[]\` rather than \`List<Integer>\` (no boxing), and using \`long\` for counts or sums that can pass about 2.1 billion.
- The unlimited-trades follow-up: sum of all positive day-to-day differences.

**Clarifying questions expected:**
- Exactly one transaction, or many?
- What are the limits on n and on prices (does the answer fit in an int)?

**Code / implementation expected:** Yes — a static method \`int maxProfit(int[] prices)\` with one enhanced for loop, in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need to know loops and variables in Java.  
**Difficulty:** Easy  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine you collect football stickers and you know, from a friend with a time machine, what one rare sticker will cost at the shop on each of the next six days: 7, 1, 5, 3, 6, 4 coins. You are allowed to buy it once and sell it back once, and you must buy before you sell (no time travel for you). On which day do you buy, and on which day do you sell?

Your eye goes straight to the cheapest day (1 coin, day 1) and the most expensive later day (6 coins, day 4): profit 5. But notice the trap: the most expensive day overall is day 0 (7 coins), and you cannot sell on day 0 because you have not bought anything yet. **The order of the days matters.** That one rule — buy strictly before you sell — is the whole problem, and it is why "maximum minus minimum" is the wrong answer.

This question is popular because it is small enough to finish in ten minutes, yet it checks whether you can turn an obvious O(n²) "try every pair" idea into a single pass by asking: *what do I need to remember about the past?*

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Exactly one buy and one sell, or as many trades as I like? | One trade is this problem; unlimited trades is a different (also greedy) answer — see section 9. |
| If prices only fall, do I return 0 or the least-bad loss? | The classic version returns 0 ("do not trade"). Returning a negative number changes the initial value of \`best\`. |
| Can I buy and sell on the same day? | Same day gives profit 0, so it never beats 0 — but it tells you the answer is never negative. |
| How many days, and how big can prices get? | Up to 10^5 days rules out O(n²). Large prices matter for overflow in fixed-size integers. |
| Do you want the profit only, or also the two days? | Returning the days means tracking the index of the minimum, not just its value. |

## 3. The Core Idea

Walk through the days from left to right. On each day, ask one question: **"If I sold today, what is the best I could have done?"** The answer is *today's price minus the cheapest price I have seen so far*. So you only need to remember two numbers while you walk:

- \`minPrice\` — the cheapest price on any earlier day (the best possible buy so far)
- \`best\` — the best profit found so far

📌 **Interview term: Running minimum** — the smallest value seen so far while scanning left to right; here it is the best day to have bought, for any sell day you have reached.

📌 **Interview term: Single pass (one-pass) algorithm** — an algorithm that reads the input once, from start to end, keeping only a few variables of state. It is O(n) time and O(1) extra space.

📌 **Interview term: Greedy choice** — a decision that is locally best and never needs to be undone. Keeping the cheapest buy so far is greedy: a cheaper earlier buy can only ever help a later sale. See [what is a greedy algorithm](/interview-question/what-is-a-greedy-algorithm).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Price bars for six days. Buy on day 1 at price 1 and sell on day 4 at price 6 for a profit of 5">
  <defs>
    <marker id="b10q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="18" text-anchor="middle">Prices [7, 1, 5, 3, 6, 4]</text>
  <rect class="d-box-muted" x="70" y="46" width="70" height="154" rx="4"/>
  <text class="d-text" x="105" y="36" text-anchor="middle">7</text>
  <text class="d-sub" x="105" y="224" text-anchor="middle">day 0</text>
  <rect class="d-box-accent" x="155" y="178" width="70" height="22" rx="4"/>
  <text class="d-text" x="190" y="168" text-anchor="middle">1</text>
  <text class="d-sub" x="190" y="224" text-anchor="middle">day 1</text>
  <rect class="d-box-muted" x="240" y="90" width="70" height="110" rx="4"/>
  <text class="d-text" x="275" y="80" text-anchor="middle">5</text>
  <text class="d-sub" x="275" y="224" text-anchor="middle">day 2</text>
  <rect class="d-box-muted" x="325" y="134" width="70" height="66" rx="4"/>
  <text class="d-text" x="360" y="124" text-anchor="middle">3</text>
  <text class="d-sub" x="360" y="224" text-anchor="middle">day 3</text>
  <rect class="d-box-accent" x="410" y="68" width="70" height="132" rx="4"/>
  <text class="d-text" x="445" y="58" text-anchor="middle">6</text>
  <text class="d-sub" x="445" y="224" text-anchor="middle">day 4</text>
  <rect class="d-box-muted" x="495" y="112" width="70" height="88" rx="4"/>
  <text class="d-text" x="530" y="102" text-anchor="middle">4</text>
  <text class="d-sub" x="530" y="224" text-anchor="middle">day 5</text>
  <path class="d-edge" d="M 55 200 L 595 200"/>
  <text class="d-text d-accent" x="190" y="248" text-anchor="middle">buy</text>
  <text class="d-text d-accent" x="445" y="248" text-anchor="middle">sell</text>
  <path class="d-edge-accent" d="M 214 244 L 415 244" marker-end="url(#b10q1-arrow)"/>
  <text class="d-sub" x="317" y="276" text-anchor="middle">profit 6 - 1 = 5</text>
</svg>

Day 1 is the cheapest day that comes before the most expensive later day, so the answer is 6 − 1 = 5. Day 0 has the highest price of all, but nothing was bought before it.

Each day does exactly one of two things:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="For each price, either record a new cheapest buy price or try selling today against the cheapest earlier price">
  <defs>
    <marker id="b10q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="90" text-anchor="middle">Next price p</text>
  <text class="d-sub" x="95" y="112" text-anchor="middle">one per day, in order</text>
  <path class="d-edge" d="M 172 95 L 238 95" marker-end="url(#b10q1-arrow2)"/>
  <rect class="d-box-muted" x="242" y="60" width="160" height="70" rx="10"/>
  <text class="d-text" x="322" y="90" text-anchor="middle">p below minPrice?</text>
  <text class="d-sub" x="322" y="112" text-anchor="middle">compare with the best buy</text>
  <path class="d-edge" d="M 404 80 L 470 40" marker-end="url(#b10q1-arrow2)"/>
  <path class="d-edge" d="M 404 110 L 470 150" marker-end="url(#b10q1-arrow2)"/>
  <text class="d-sub" x="430" y="48" text-anchor="middle">yes</text>
  <text class="d-sub" x="430" y="150" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="474" y="14" width="200" height="56" rx="10"/>
  <text class="d-text" x="574" y="38" text-anchor="middle">minPrice = p</text>
  <text class="d-sub" x="574" y="58" text-anchor="middle">a cheaper day to buy</text>
  <rect class="d-box-accent" x="474" y="122" width="200" height="56" rx="10"/>
  <text class="d-text" x="574" y="146" text-anchor="middle">best = max(best, p - min)</text>
  <text class="d-sub" x="574" y="166" text-anchor="middle">try selling today</text>
</svg>

If today is a new cheapest day, selling today would make a loss, so we just remember it as the new best buy. Otherwise we check whether selling today beats the best profit so far.

## 4. From Brute Force to One Pass

**Brute force.** Try every pair of days \`(i, j)\` with \`i < j\`, compute \`prices[j] - prices[i]\`, keep the largest. That is n(n−1)/2 pairs: about 5 × 10^9 for 100,000 days. Far too slow — example 2 counts the pairs for 2,000 days and gets 1,999,000.

**The key observation.** Fix a sell day \`j\`. Among all buy days before \`j\`, the best one is simply the cheapest. So instead of looking back over every earlier day, carry the cheapest earlier price forward as you go. Each day then costs O(1) work.

📌 **Interview term: Brute force** — the most direct solution that tries every possibility. It is always worth stating first, both as a correctness reference and to show where the wasted work is.

Here is the walk on \`[7, 1, 5, 3, 6, 4]\`, one row per day:

| Day | Price | minPrice before today | Sell today would give | best after today |
| :--- | :--- | :--- | :--- | :--- |
| 0 | 7 | none (∞) | — (new minimum) | 0 |
| 1 | 1 | 7 | — (new minimum 1) | 0 |
| 2 | 5 | 1 | 4 | 4 |
| 3 | 3 | 1 | 2 | 4 |
| 4 | 6 | 1 | 5 | **5** |
| 5 | 4 | 1 | 3 | 5 |

This is the same "carry the best thing so far" pattern as Kadane's algorithm for the [maximum subarray sum](/interview-question/how-do-you-find-the-maximum-subarray-sum): the daily price changes are \`[-6, 4, -2, 3, -2]\`, and the best trade is the best-sum run of consecutive changes (4 − 2 + 3 = 5).

## 5. The Code in Java

Java has no infinity for \`int\`, so we start \`minPrice\` at \`Integer.MAX_VALUE\` (2,147,483,647). Any real price is smaller or equal, so the first day becomes the minimum, and an empty array returns 0 without a special case.

📌 **Interview term: Sentinel value** — a made-up starting value, such as infinity or the largest possible int, chosen so that the first real input always replaces it. It removes the special case for the first element.

~~~java
static int maxProfit(int[] prices) {
    int minPrice = Integer.MAX_VALUE; // cheapest buy seen so far
    int best = 0;                     // best profit seen so far (0 = do not trade)
    for (int p : prices) {
        if (p < minPrice) {
            minPrice = p;             // a new cheapest day to buy
        } else if (p - minPrice > best) {
            best = p - minPrice;      // selling today beats the old best
        }
    }
    return best;
}
~~~

**What to point out in this code:**

- The enhanced \`for (int p : prices)\` loop reads primitive \`int\`s directly. If the input were a \`List<Integer>\`, each element would be a boxed \`Integer\` object that gets unboxed on every comparison — it still works, but \`int[]\` is the natural choice for numeric work.
- The \`else if\` matters: a new minimum day can never be the sell day of a profitable trade.
- With prices up to 10^4 the profit fits easily in \`int\`. Counts can not always: example 2 counts brute-force pairs in a \`long\`, because n(n−1)/2 for n = 100,000 is about 5 × 10^9, more than \`Integer.MAX_VALUE\`. Java \`int\` arithmetic wraps around silently on overflow instead of throwing.
- To return the profit and both days, example 2 returns an \`int[]{best, buy, sell}\`. In Java 17 a \`record Trade(int profit, int buy, int sell)\` is a cleaner option in production code.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21; the code only uses Java 17 features). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. In example 2 the 2,000 prices come from a small deterministic random generator (MINSTD), so every language sees the same list, and brute force and the one pass agree on the profit (493) while doing very different amounts of work.

**Example 1 — the one-pass solution on seven inputs** prints:

~~~text
5
0
2
0
2
0
0
~~~

**Example 2 — buy and sell days, brute force vs one pass, and the unlimited-trades follow-up** prints:

~~~text
best trade in [7, 1, 5, 3, 6, 4]: buy day 1, sell day 4, profit 5
best trade in [7, 6, 4, 3, 1]: buy day -1, sell day -1, profit 0
n = 2000 random prices
brute force: profit 493, pairs checked 1999000
one pass:    profit 493, prices visited 2000
unlimited trades on [7, 1, 5, 3, 6, 4]: profit 7
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (all pairs) | O(n²) | O(1) | n(n−1)/2 pairs: 1,999,000 for n = 2,000 (example 2) |
| One pass | O(n) | O(1) | each price is read once; two \`int\` variables of state |
| Same loop over \`List<Integer>\` | O(n) | O(1) extra | same complexity, but every element is a boxed object |

## 8. Edge Cases

- **Empty list or a single day** — no pair of days exists, so the answer is 0. All four versions return 0 for \`[]\` and \`[5]\` (example 1).
- **Prices only fall** (\`[7, 6, 4, 3, 1]\`) — every possible trade loses money; the answer is 0 and the days are reported as -1 (example 2).
- **All prices equal** (\`[3, 3, 3]\`) — profit 0; the code must not treat "equal" as a new minimum *and* a sale at once (the \`else\` handles it).
- **The minimum comes after the maximum** (\`[2, 4, 1]\`) — the answer is 2 (buy 2, sell 4), not 4 − 1 = 3 and not 0. This is the case that kills "max minus min".
- **A later, lower minimum** (\`[2, 1, 2, 1, 0, 1, 2]\`) — the minimum keeps moving (2 → 1 → 0); the best trade is buy 0, sell 2, profit 2.

## 9. The Follow-Up: As Many Trades as You Like

If you may buy and sell any number of times (one share at a time), the answer is the **sum of every rising step**: whenever tomorrow is higher than today, take that gain. For \`[7, 1, 5, 3, 6, 4]\` that is (5 − 1) + (6 − 3) = 7, which example 2 prints. Any longer rising run, say 1 → 3 → 6, earns the same as its steps added up (2 + 3 = 5), so cutting it into one-day trades loses nothing.

Harder variants (at most two trades, at most k trades, a cooldown day, a fee per trade) need a small [dynamic programming](/interview-question/what-is-dynamic-programming) state machine ("holding a share" vs "not holding"), which is beyond this page.

## Common Pitfalls

- **Returning max minus min.** It ignores the order of days; \`{2, 4, 1}\` gives 3 instead of 2.
- **Starting at \`prices[0]\` without a guard.** On an empty array that throws \`ArrayIndexOutOfBoundsException\`; \`Integer.MAX_VALUE\` avoids the special case.
- **Computing \`p - minPrice\` before the minimum is set, with negative prices.** \`p - Integer.MAX_VALUE\` can overflow if \`p\` is negative; the \`if / else if\` order avoids ever doing that subtraction against the sentinel.
- **\`int\` overflow in counters and sums.** Pair counts and summed profits over large inputs belong in \`long\`; Java wraps around silently instead of failing.
- **Mixing up value and index.** To report the days, track \`minDay\`, not only \`minPrice\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Scan once; keep the cheapest price so far and the best profit so far.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The update:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p &lt; minPrice</code> it becomes the new buy; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best = Math.max(best, p - minPrice)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it works:</strong> <span style="color:#f0e2c8;">For any sell day the best buy is the minimum of the earlier days, which is exactly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">minPrice</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) space; all pairs is O(n²).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Start from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code>, work on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> for anything that might pass two billion.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not max minus min?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The maximum can come before the minimum. In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{2, 4, 1}</code> that gives 3, but the best real trade is buy 2, sell 4, profit 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the days too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">minDay</code> and return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new int[]{best, buy, sell}</code>, or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">record Trade(int profit, int buy, int sell)</code> in Java 17.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if trades are unlimited?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sum every positive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prices[i] - prices[i - 1]</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{7, 1, 5, 3, 6, 4}</code> gives 7.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could the answer overflow an int?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if prices can be near <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code>; the single-trade profit is at most max price. For the unlimited version, sum into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the input is a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">List&lt;Integer&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same loop works with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (int p : list)</code> thanks to unboxing; it is just slower. Avoid comparing two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> objects with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Running minimum** | Smallest value seen so far in a left-to-right scan |
| **Single pass (one-pass) algorithm** | Reads the input once with O(1) state |
| **Greedy choice** | A locally best decision that never has to be undone |
| **Brute force** | Try every possibility; the reference you improve on |
| **Sentinel value** | A stand-in starting value (like infinity) that any real input replaces |

---
**Conclusion:** In Java the solution is one enhanced for loop over an \`int[]\`: keep the cheapest price so far, starting at \`Integer.MAX_VALUE\`, and try selling against it on every other day. It is O(n) time and O(1) space and returns 0 for empty or falling arrays. Mention the Java specifics — primitives instead of boxed \`Integer\`s, and \`long\` for counters that may pass two billion — and you have covered what an interviewer can push on.`,
        examples: [
          {
            label: "One pass: cheapest price so far + best profit (7 inputs)",
            code: `public class Main {
    // One pass: remember the cheapest price so far, try selling today.
    static int maxProfit(int[] prices) {
        int minPrice = Integer.MAX_VALUE; // cheapest buy seen so far
        int best = 0;                     // best profit seen so far (0 = do not trade)
        for (int p : prices) {
            if (p < minPrice) {
                minPrice = p;             // a new cheapest day to buy
            } else if (p - minPrice > best) {
                best = p - minPrice;      // selling today beats the old best
            }
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(maxProfit(new int[]{7, 1, 5, 3, 6, 4}));    // 5
        System.out.println(maxProfit(new int[]{7, 6, 4, 3, 1}));       // 0
        System.out.println(maxProfit(new int[]{2, 4, 1}));             // 2
        System.out.println(maxProfit(new int[]{3, 3, 3}));             // 0
        System.out.println(maxProfit(new int[]{2, 1, 2, 1, 0, 1, 2})); // 2
        System.out.println(maxProfit(new int[]{5}));                   // 0
        System.out.println(maxProfit(new int[]{}));                    // 0
    }
}`,
          },
          {
            label: "Buy/sell days, brute force vs one pass, unlimited trades",
            code: `public class Main {
    // Returns {profit, buyDay, sellDay}; days are -1 when no trade helps.
    static int[] bestTrade(int[] prices) {
        int best = 0, buy = -1, sell = -1, minDay = 0;
        for (int day = 1; day < prices.length; day++) {
            if (prices[day] < prices[minDay]) {
                minDay = day;
            } else if (prices[day] - prices[minDay] > best) {
                best = prices[day] - prices[minDay];
                buy = minDay;
                sell = day;
            }
        }
        return new int[]{best, buy, sell};
    }

    // Try every (buy, sell) pair; count how many pairs we look at.
    static long[] bruteForce(int[] prices) {
        int best = 0;
        long pairs = 0;
        for (int i = 0; i < prices.length; i++) {
            for (int j = i + 1; j < prices.length; j++) {
                pairs++;
                best = Math.max(best, prices[j] - prices[i]);
            }
        }
        return new long[]{best, pairs};
    }

    // Follow-up: any number of trades = sum of every rising step.
    static int unlimitedTrades(int[] prices) {
        int total = 0;
        for (int i = 1; i < prices.length; i++) total += Math.max(0, prices[i] - prices[i - 1]);
        return total;
    }

    // A falling market with noise, so the best trade is not obvious.
    static int[] randomPrices(int n, long seed) {
        int[] out = new int[n];
        for (int i = 0; i < n; i++) {
            seed = seed * 48271 % 2147483647L; // MINSTD; long, because the product overflows int
            out[i] = (int) (seed % 500) + (n - i) / 4 + 1;
        }
        return out;
    }

    public static void main(String[] args) {
        int[] r = bestTrade(new int[]{7, 1, 5, 3, 6, 4});
        System.out.println("best trade in [7, 1, 5, 3, 6, 4]: buy day " + r[1] + ", sell day " + r[2] + ", profit " + r[0]);
        r = bestTrade(new int[]{7, 6, 4, 3, 1});
        System.out.println("best trade in [7, 6, 4, 3, 1]: buy day " + r[1] + ", sell day " + r[2] + ", profit " + r[0]);

        int[] prices = randomPrices(2000, 42);
        long[] bf = bruteForce(prices);
        int op = bestTrade(prices)[0];
        System.out.println("n = 2000 random prices");
        System.out.println("brute force: profit " + bf[0] + ", pairs checked " + bf[1]);
        System.out.println("one pass:    profit " + op + ", prices visited " + prices.length);
        System.out.println("unlimited trades on [7, 1, 5, 3, 6, 4]: profit " + unlimitedTrades(new int[]{7, 1, 5, 3, 6, 4}));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given a vector of daily stock prices. You may buy one share on one day and sell it on a later day. Write a C++ function that returns the maximum profit, or 0 if no trade makes money."

**What a strong answer should cover:**
- The order constraint: the buy day must come before the sell day, so max minus min is wrong.
- The one-pass idea: track the cheapest price so far and the best profit so far; O(n) time, O(1) space.
- Why it is correct: for each sell day the best buy is the minimum of the earlier prices.
- Edge cases: empty vector, one price, falling prices (answer 0).
- C++ details: \`INT_MAX\` from \`<climits>\` as the starting minimum, passing \`const std::vector<int>&\` to avoid a copy, and \`long long\` for counts because signed overflow is undefined behaviour.
- The unlimited-trades follow-up: sum of all positive day-to-day differences.

**Clarifying questions expected:**
- Exactly one transaction, or many?
- What are the limits on n and on prices?

**Code / implementation expected:** Yes — \`int maxProfit(const std::vector<int>& prices)\` with one range-for loop, in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need to know loops and variables in C++.  
**Difficulty:** Easy  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine you collect football stickers and you know, from a friend with a time machine, what one rare sticker will cost at the shop on each of the next six days: 7, 1, 5, 3, 6, 4 coins. You are allowed to buy it once and sell it back once, and you must buy before you sell (no time travel for you). On which day do you buy, and on which day do you sell?

Your eye goes straight to the cheapest day (1 coin, day 1) and the most expensive later day (6 coins, day 4): profit 5. But notice the trap: the most expensive day overall is day 0 (7 coins), and you cannot sell on day 0 because you have not bought anything yet. **The order of the days matters.** That one rule — buy strictly before you sell — is the whole problem, and it is why "maximum minus minimum" is the wrong answer.

This question is popular because it is small enough to finish in ten minutes, yet it checks whether you can turn an obvious O(n²) "try every pair" idea into a single pass by asking: *what do I need to remember about the past?*

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Exactly one buy and one sell, or as many trades as I like? | One trade is this problem; unlimited trades is a different (also greedy) answer — see section 9. |
| If prices only fall, do I return 0 or the least-bad loss? | The classic version returns 0 ("do not trade"). Returning a negative number changes the initial value of \`best\`. |
| Can I buy and sell on the same day? | Same day gives profit 0, so it never beats 0 — but it tells you the answer is never negative. |
| How many days, and how big can prices get? | Up to 10^5 days rules out O(n²). Large prices matter for overflow in fixed-size integers. |
| Do you want the profit only, or also the two days? | Returning the days means tracking the index of the minimum, not just its value. |

## 3. The Core Idea

Walk through the days from left to right. On each day, ask one question: **"If I sold today, what is the best I could have done?"** The answer is *today's price minus the cheapest price I have seen so far*. So you only need to remember two numbers while you walk:

- \`minPrice\` — the cheapest price on any earlier day (the best possible buy so far)
- \`best\` — the best profit found so far

📌 **Interview term: Running minimum** — the smallest value seen so far while scanning left to right; here it is the best day to have bought, for any sell day you have reached.

📌 **Interview term: Single pass (one-pass) algorithm** — an algorithm that reads the input once, from start to end, keeping only a few variables of state. It is O(n) time and O(1) extra space.

📌 **Interview term: Greedy choice** — a decision that is locally best and never needs to be undone. Keeping the cheapest buy so far is greedy: a cheaper earlier buy can only ever help a later sale. See [what is a greedy algorithm](/interview-question/what-is-a-greedy-algorithm).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Price bars for six days. Buy on day 1 at price 1 and sell on day 4 at price 6 for a profit of 5">
  <defs>
    <marker id="b10q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="18" text-anchor="middle">Prices [7, 1, 5, 3, 6, 4]</text>
  <rect class="d-box-muted" x="70" y="46" width="70" height="154" rx="4"/>
  <text class="d-text" x="105" y="36" text-anchor="middle">7</text>
  <text class="d-sub" x="105" y="224" text-anchor="middle">day 0</text>
  <rect class="d-box-accent" x="155" y="178" width="70" height="22" rx="4"/>
  <text class="d-text" x="190" y="168" text-anchor="middle">1</text>
  <text class="d-sub" x="190" y="224" text-anchor="middle">day 1</text>
  <rect class="d-box-muted" x="240" y="90" width="70" height="110" rx="4"/>
  <text class="d-text" x="275" y="80" text-anchor="middle">5</text>
  <text class="d-sub" x="275" y="224" text-anchor="middle">day 2</text>
  <rect class="d-box-muted" x="325" y="134" width="70" height="66" rx="4"/>
  <text class="d-text" x="360" y="124" text-anchor="middle">3</text>
  <text class="d-sub" x="360" y="224" text-anchor="middle">day 3</text>
  <rect class="d-box-accent" x="410" y="68" width="70" height="132" rx="4"/>
  <text class="d-text" x="445" y="58" text-anchor="middle">6</text>
  <text class="d-sub" x="445" y="224" text-anchor="middle">day 4</text>
  <rect class="d-box-muted" x="495" y="112" width="70" height="88" rx="4"/>
  <text class="d-text" x="530" y="102" text-anchor="middle">4</text>
  <text class="d-sub" x="530" y="224" text-anchor="middle">day 5</text>
  <path class="d-edge" d="M 55 200 L 595 200"/>
  <text class="d-text d-accent" x="190" y="248" text-anchor="middle">buy</text>
  <text class="d-text d-accent" x="445" y="248" text-anchor="middle">sell</text>
  <path class="d-edge-accent" d="M 214 244 L 415 244" marker-end="url(#b10q1-arrow)"/>
  <text class="d-sub" x="317" y="276" text-anchor="middle">profit 6 - 1 = 5</text>
</svg>

Day 1 is the cheapest day that comes before the most expensive later day, so the answer is 6 − 1 = 5. Day 0 has the highest price of all, but nothing was bought before it.

Each day does exactly one of two things:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="For each price, either record a new cheapest buy price or try selling today against the cheapest earlier price">
  <defs>
    <marker id="b10q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="90" text-anchor="middle">Next price p</text>
  <text class="d-sub" x="95" y="112" text-anchor="middle">one per day, in order</text>
  <path class="d-edge" d="M 172 95 L 238 95" marker-end="url(#b10q1-arrow2)"/>
  <rect class="d-box-muted" x="242" y="60" width="160" height="70" rx="10"/>
  <text class="d-text" x="322" y="90" text-anchor="middle">p below minPrice?</text>
  <text class="d-sub" x="322" y="112" text-anchor="middle">compare with the best buy</text>
  <path class="d-edge" d="M 404 80 L 470 40" marker-end="url(#b10q1-arrow2)"/>
  <path class="d-edge" d="M 404 110 L 470 150" marker-end="url(#b10q1-arrow2)"/>
  <text class="d-sub" x="430" y="48" text-anchor="middle">yes</text>
  <text class="d-sub" x="430" y="150" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="474" y="14" width="200" height="56" rx="10"/>
  <text class="d-text" x="574" y="38" text-anchor="middle">minPrice = p</text>
  <text class="d-sub" x="574" y="58" text-anchor="middle">a cheaper day to buy</text>
  <rect class="d-box-accent" x="474" y="122" width="200" height="56" rx="10"/>
  <text class="d-text" x="574" y="146" text-anchor="middle">best = max(best, p - min)</text>
  <text class="d-sub" x="574" y="166" text-anchor="middle">try selling today</text>
</svg>

If today is a new cheapest day, selling today would make a loss, so we just remember it as the new best buy. Otherwise we check whether selling today beats the best profit so far.

## 4. From Brute Force to One Pass

**Brute force.** Try every pair of days \`(i, j)\` with \`i < j\`, compute \`prices[j] - prices[i]\`, keep the largest. That is n(n−1)/2 pairs: about 5 × 10^9 for 100,000 days. Far too slow — example 2 counts the pairs for 2,000 days and gets 1,999,000.

**The key observation.** Fix a sell day \`j\`. Among all buy days before \`j\`, the best one is simply the cheapest. So instead of looking back over every earlier day, carry the cheapest earlier price forward as you go. Each day then costs O(1) work.

📌 **Interview term: Brute force** — the most direct solution that tries every possibility. It is always worth stating first, both as a correctness reference and to show where the wasted work is.

Here is the walk on \`[7, 1, 5, 3, 6, 4]\`, one row per day:

| Day | Price | minPrice before today | Sell today would give | best after today |
| :--- | :--- | :--- | :--- | :--- |
| 0 | 7 | none (∞) | — (new minimum) | 0 |
| 1 | 1 | 7 | — (new minimum 1) | 0 |
| 2 | 5 | 1 | 4 | 4 |
| 3 | 3 | 1 | 2 | 4 |
| 4 | 6 | 1 | 5 | **5** |
| 5 | 4 | 1 | 3 | 5 |

This is the same "carry the best thing so far" pattern as Kadane's algorithm for the [maximum subarray sum](/interview-question/how-do-you-find-the-maximum-subarray-sum): the daily price changes are \`[-6, 4, -2, 3, -2]\`, and the best trade is the best-sum run of consecutive changes (4 − 2 + 3 = 5).

## 5. The Code in C++

C++ \`int\` has no infinity, so \`minPrice\` starts at \`INT_MAX\` from \`<climits>\`. Any real price is smaller or equal, so the first day becomes the minimum and an empty vector returns 0 without a special case. The vector is passed by \`const&\` so the function reads the caller's data without copying it.

📌 **Interview term: Sentinel value** — a made-up starting value, such as infinity or the largest possible int, chosen so that the first real input always replaces it. It removes the special case for the first element.

~~~cpp
int maxProfit(const std::vector<int>& prices) {
    int minPrice = INT_MAX; // cheapest buy seen so far
    int best = 0;           // best profit seen so far (0 = do not trade)
    for (int p : prices) {
        if (p < minPrice) {
            minPrice = p;            // a new cheapest day to buy
        } else if (p - minPrice > best) {
            best = p - minPrice;     // selling today beats the old best
        }
    }
    return best;
}
~~~

**What to point out in this code:**

- The range-for \`for (int p : prices)\` copies each \`int\`, which is as cheap as it gets; for bigger element types you would write \`const auto&\`.
- The \`else if\` matters: a new minimum day can never be the sell day of a profitable trade.
- **Signed overflow is undefined behaviour in C++.** The profit fits in \`int\` for normal limits, but counters may not: example 2 counts brute-force pairs in a \`long long\`, because n(n−1)/2 for n = 100,000 is about 5 × 10^9.
- Example 2 returns three values as a \`std::tuple<int, int, int>\` and unpacks it with a C++17 structured binding: \`auto [p1, b1, s1] = bestTrade(...)\`.
- \`std::min_element\` and \`std::max_element\` (from \`<algorithm>\`) return iterators to the extremes, but using them gives "max minus min", which ignores the order of days.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13 with \`-std=c++17\`). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. In example 2 the 2,000 prices come from a small deterministic random generator (MINSTD), so every language sees the same list, and brute force and the one pass agree on the profit (493) while doing very different amounts of work.

**Example 1 — the one-pass solution on seven inputs** prints:

~~~text
5
0
2
0
2
0
0
~~~

**Example 2 — buy and sell days, brute force vs one pass, and the unlimited-trades follow-up** prints:

~~~text
best trade in [7, 1, 5, 3, 6, 4]: buy day 1, sell day 4, profit 5
best trade in [7, 6, 4, 3, 1]: buy day -1, sell day -1, profit 0
n = 2000 random prices
brute force: profit 493, pairs checked 1999000
one pass:    profit 493, prices visited 2000
unlimited trades on [7, 1, 5, 3, 6, 4]: profit 7
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (all pairs) | O(n²) | O(1) | n(n−1)/2 pairs: 1,999,000 for n = 2,000 (example 2) |
| One pass | O(n) | O(1) | each price is read once; two \`int\` variables |
| Passing \`std::vector<int>\` by value | O(n) extra | O(n) | a full copy of the input before the loop even starts |

## 8. Edge Cases

- **Empty list or a single day** — no pair of days exists, so the answer is 0. All four versions return 0 for \`[]\` and \`[5]\` (example 1).
- **Prices only fall** (\`[7, 6, 4, 3, 1]\`) — every possible trade loses money; the answer is 0 and the days are reported as -1 (example 2).
- **All prices equal** (\`[3, 3, 3]\`) — profit 0; the code must not treat "equal" as a new minimum *and* a sale at once (the \`else\` handles it).
- **The minimum comes after the maximum** (\`[2, 4, 1]\`) — the answer is 2 (buy 2, sell 4), not 4 − 1 = 3 and not 0. This is the case that kills "max minus min".
- **A later, lower minimum** (\`[2, 1, 2, 1, 0, 1, 2]\`) — the minimum keeps moving (2 → 1 → 0); the best trade is buy 0, sell 2, profit 2.

## 9. The Follow-Up: As Many Trades as You Like

If you may buy and sell any number of times (one share at a time), the answer is the **sum of every rising step**: whenever tomorrow is higher than today, take that gain. For \`[7, 1, 5, 3, 6, 4]\` that is (5 − 1) + (6 − 3) = 7, which example 2 prints. Any longer rising run, say 1 → 3 → 6, earns the same as its steps added up (2 + 3 = 5), so cutting it into one-day trades loses nothing.

Harder variants (at most two trades, at most k trades, a cooldown day, a fee per trade) need a small [dynamic programming](/interview-question/what-is-dynamic-programming) state machine ("holding a share" vs "not holding"), which is beyond this page.

## Common Pitfalls

- **\`*max_element - *min_element\`.** It ignores the order of days; \`{2, 4, 1}\` gives 3 instead of 2.
- **Reading \`prices[0]\` on an empty vector.** \`operator[]\` does no bounds check, so that is undefined behaviour, not an exception. The \`INT_MAX\` sentinel avoids touching index 0.
- **Signed overflow.** \`p - minPrice\` with a negative \`p\` against \`INT_MAX\`, or summing large profits in \`int\`, is undefined behaviour; the \`if / else if\` order and \`long long\` sums avoid it.
- **Copying the input.** Taking \`std::vector<int>\` by value copies every element; use \`const std::vector<int>&\`.
- **Mixing up value and index.** To report the days, track \`minDay\` rather than only \`minPrice\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Scan once; keep the cheapest price so far and the best profit so far.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The update:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p &lt; minPrice</code> it becomes the new buy; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best = std::max(best, p - minPrice)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it works:</strong> <span style="color:#f0e2c8;">For any sell day the best buy is the minimum of the earlier days, which is exactly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">minPrice</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) space; all pairs is O(n²).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Start from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INT_MAX</code>, take the vector by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code>, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> where values can pass two billion — signed overflow is undefined behaviour.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not max minus min?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The maximum can come before the minimum. In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{2, 4, 1}</code> that gives 3, but the best real trade is buy 2, sell 4, profit 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the days too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">minDay</code>, return a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::tuple&lt;int, int, int&gt;</code> or a small struct, and unpack it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">auto [profit, buy, sell] = ...</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if trades are unlimited?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sum every positive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prices[i] - prices[i - 1]</code> into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{7, 1, 5, 3, 6, 4}</code> gives 7.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens on an empty vector?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The loop body never runs and the function returns 0. Code that reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prices[0]</code> first would be undefined behaviour.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">const std::vector&lt;int&gt;&amp;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It avoids copying the whole input and promises the function will not modify it.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Running minimum** | Smallest value seen so far in a left-to-right scan |
| **Single pass (one-pass) algorithm** | Reads the input once with O(1) state |
| **Greedy choice** | A locally best decision that never has to be undone |
| **Brute force** | Try every possibility; the reference you improve on |
| **Sentinel value** | A stand-in starting value (like infinity) that any real input replaces |

---
**Conclusion:** In C++ the solution is one range-for loop over a \`const std::vector<int>&\`: keep the cheapest price so far, starting at \`INT_MAX\`, and try selling against it on every other day. It is O(n) time and O(1) space and returns 0 for empty or falling input. The C++ specifics an interviewer may probe are no bounds checks on \`operator[]\`, undefined behaviour on signed overflow (use \`long long\` for counts and sums), and passing the vector by reference.`,
        examples: [
          {
            label: "One pass: cheapest price so far + best profit (7 inputs)",
            code: `#include <climits>
#include <iostream>
#include <vector>

// One pass: remember the cheapest price so far, try selling today.
int maxProfit(const std::vector<int>& prices) {
    int minPrice = INT_MAX; // cheapest buy seen so far
    int best = 0;           // best profit seen so far (0 = do not trade)
    for (int p : prices) {
        if (p < minPrice) {
            minPrice = p;            // a new cheapest day to buy
        } else if (p - minPrice > best) {
            best = p - minPrice;     // selling today beats the old best
        }
    }
    return best;
}

int main() {
    std::cout << maxProfit({7, 1, 5, 3, 6, 4}) << "\\n";    // 5
    std::cout << maxProfit({7, 6, 4, 3, 1}) << "\\n";       // 0
    std::cout << maxProfit({2, 4, 1}) << "\\n";             // 2
    std::cout << maxProfit({3, 3, 3}) << "\\n";             // 0
    std::cout << maxProfit({2, 1, 2, 1, 0, 1, 2}) << "\\n"; // 2
    std::cout << maxProfit({5}) << "\\n";                   // 0
    std::cout << maxProfit({}) << "\\n";                    // 0
    return 0;
}`,
          },
          {
            label: "Buy/sell days, brute force vs one pass, unlimited trades",
            code: `#include <algorithm>
#include <iostream>
#include <tuple>
#include <vector>

// Returns {profit, buyDay, sellDay}; days are -1 when no trade helps.
std::tuple<int, int, int> bestTrade(const std::vector<int>& prices) {
    int best = 0, buy = -1, sell = -1, minDay = 0;
    for (int day = 1; day < (int)prices.size(); day++) {
        if (prices[day] < prices[minDay]) {
            minDay = day;
        } else if (prices[day] - prices[minDay] > best) {
            best = prices[day] - prices[minDay];
            buy = minDay;
            sell = day;
        }
    }
    return {best, buy, sell};
}

// Try every (buy, sell) pair; count how many pairs we look at.
std::pair<int, long long> bruteForce(const std::vector<int>& prices) {
    int best = 0;
    long long pairs = 0;
    for (size_t i = 0; i < prices.size(); i++) {
        for (size_t j = i + 1; j < prices.size(); j++) {
            pairs++;
            best = std::max(best, prices[j] - prices[i]);
        }
    }
    return {best, pairs};
}

// Follow-up: any number of trades = sum of every rising step.
int unlimitedTrades(const std::vector<int>& prices) {
    int total = 0;
    for (size_t i = 1; i < prices.size(); i++) total += std::max(0, prices[i] - prices[i - 1]);
    return total;
}

// A falling market with noise, so the best trade is not obvious.
std::vector<int> randomPrices(int n, long long seed) {
    std::vector<int> out;
    for (int i = 0; i < n; i++) {
        seed = seed * 48271 % 2147483647LL; // MINSTD; long long, because the product overflows int
        out.push_back((int)(seed % 500) + (n - i) / 4 + 1);
    }
    return out;
}

int main() {
    auto [p1, b1, s1] = bestTrade({7, 1, 5, 3, 6, 4});
    std::cout << "best trade in [7, 1, 5, 3, 6, 4]: buy day " << b1 << ", sell day " << s1 << ", profit " << p1 << "\\n";
    auto [p2, b2, s2] = bestTrade({7, 6, 4, 3, 1});
    std::cout << "best trade in [7, 6, 4, 3, 1]: buy day " << b2 << ", sell day " << s2 << ", profit " << p2 << "\\n";

    std::vector<int> prices = randomPrices(2000, 42);
    auto [bf, pairs] = bruteForce(prices);
    int op = std::get<0>(bestTrade(prices));
    std::cout << "n = 2000 random prices\\n";
    std::cout << "brute force: profit " << bf << ", pairs checked " << pairs << "\\n";
    std::cout << "one pass:    profit " << op << ", prices visited " << prices.size() << "\\n";
    std::cout << "unlimited trades on [7, 1, 5, 3, 6, 4]: profit " << unlimitedTrades({7, 1, 5, 3, 6, 4}) << "\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you merge overlapping intervals?",
    difficulty: "medium",
    seoDescription: "Merge overlapping intervals by sorting on start and sweeping once, O(n log n). Verified Python, JavaScript, Java and C++ code with the classic bugs.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given a list of intervals, each a list [start, end], in no particular order. Write a Python function that merges all overlapping intervals and returns the merged list sorted by start."

**What a strong answer should cover:**
- Sort by start, then one pass that either extends the last merged interval or starts a new one.
- Use \`max(last_end, end)\` when extending, because an interval can be nested inside the previous one.
- Complexity: O(n log n) for the sort plus O(n) for the pass; O(n) for the output.
- Touching intervals ([1, 4] and [4, 5]): \`<=\` merges them; confirm the expected behaviour.
- Python details: \`sorted(..., key=lambda iv: iv[0])\` returns a new list while \`list.sort()\` mutates the caller's list; append a new \`[start, end]\` so mutating \`merged[-1]\` never changes the input.

**Clarifying questions expected:**
- Do touching intervals count as overlapping?
- May I modify the input list?

**Code / implementation expected:** Yes — a function \`merge(intervals) -> list[list[int]]\` in Python 3.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, lists/arrays and sorting in Python.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Your calendar app shows that you are busy 9–11, 10–12, and 14–15, and your manager asks a simple question: "When are you actually busy?" You would not answer with three blocks — you would say "9 to 12, and 2 to 3 in the afternoon". You merged the first two because they overlap.

That is the whole problem: given a pile of \`[start, end]\` ranges in any order, squash every group of overlapping ranges into one range. It shows up everywhere — calendar free/busy views, merging IP address ranges in a firewall, combining highlighted text ranges in an editor, or compacting time windows in a log system.

It is a favourite interview question because it has one big idea (**sort first**) and two or three small details that are easy to get wrong (nested intervals, touching intervals, and changing the caller's data).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do touching intervals like \`[1, 4]\` and \`[4, 5]\` count as overlapping? | It decides \`<=\` versus \`<\` in the overlap test. The common version merges them into \`[1, 5]\`. |
| Is the input already sorted by start? | If yes, you can skip the O(n log n) sort and merge in O(n). |
| Can I modify the input, or must I return a new list? | Sorting in place changes the caller's data; copying costs O(n) memory. |
| Are the intervals closed \`[start, end]\` with \`start <= end\`? | An interval with start > end is invalid input and should be rejected or swapped. |
| How many intervals, and how big are the numbers? | Large n rules out comparing every pair (O(n²)); large values matter for comparator overflow in some languages. |

## 3. The Core Idea

If the intervals are sorted by their start, any interval can only overlap with the **block you are currently building** — never with an older block, because everything older ended before the current block started. So after sorting, one left-to-right pass is enough:

1. Sort the intervals by start.
2. Start the result with the first interval.
3. For each next interval: if its start is \`<=\` the end of the last block, it overlaps — **extend** the last block's end to \`max(lastEnd, nextEnd)\`. Otherwise there is a gap — **start a new block**.

📌 **Interview term: Interval** — a pair \`[start, end]\` describing a continuous range, such as a meeting from 9 to 11. Here both ends are included (a closed interval).

📌 **Interview term: Overlap** — two sorted intervals overlap when the second one starts no later than the first one ends: \`next.start <= last.end\`.

📌 **Interview term: Sort-then-sweep** — a pattern for interval problems: sort by start time, then walk once from left to right keeping only the current block. The sort costs O(n log n) and the sweep O(n).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 340" role="img" aria-label="Intervals 1 to 3 and 2 to 6 overlap and merge into 1 to 6, while 8 to 10 and 15 to 18 stay separate">
  <text class="d-text" x="340" y="22" text-anchor="middle">Sorted input on top, merged result below</text>
  <text class="d-sub" x="20" y="72">input</text>
  <text class="d-sub" x="20" y="262">merged</text>
  <rect class="d-box-muted" x="158" y="50" width="56" height="28" rx="6"/>
  <text class="d-sub" x="186" y="68" text-anchor="middle">[1, 3]</text>
  <rect class="d-box-muted" x="186" y="92" width="112" height="28" rx="6"/>
  <text class="d-sub" x="242" y="110" text-anchor="middle">[2, 6]</text>
  <rect class="d-box-muted" x="354" y="134" width="56" height="28" rx="6"/>
  <text class="d-sub" x="382" y="152" text-anchor="middle">[8, 10]</text>
  <rect class="d-box-muted" x="550" y="176" width="84" height="28" rx="6"/>
  <text class="d-sub" x="592" y="194" text-anchor="middle">[15, 18]</text>
  <rect class="d-box-accent" x="158" y="244" width="140" height="28" rx="6"/>
  <text class="d-text" x="228" y="263" text-anchor="middle">[1, 6]</text>
  <rect class="d-box-accent" x="354" y="244" width="56" height="28" rx="6"/>
  <text class="d-text" x="382" y="263" text-anchor="middle">[8, 10]</text>
  <rect class="d-box-accent" x="550" y="244" width="84" height="28" rx="6"/>
  <text class="d-text" x="592" y="263" text-anchor="middle">[15, 18]</text>
  <path class="d-edge" d="M 130 300 L 634 300"/>
  <path class="d-edge" d="M 130 296 L 130 304"/>
  <text class="d-sub" x="130" y="322" text-anchor="middle">0</text>
  <path class="d-edge" d="M 186 296 L 186 304"/>
  <text class="d-sub" x="186" y="322" text-anchor="middle">2</text>
  <path class="d-edge" d="M 242 296 L 242 304"/>
  <text class="d-sub" x="242" y="322" text-anchor="middle">4</text>
  <path class="d-edge" d="M 298 296 L 298 304"/>
  <text class="d-sub" x="298" y="322" text-anchor="middle">6</text>
  <path class="d-edge" d="M 354 296 L 354 304"/>
  <text class="d-sub" x="354" y="322" text-anchor="middle">8</text>
  <path class="d-edge" d="M 410 296 L 410 304"/>
  <text class="d-sub" x="410" y="322" text-anchor="middle">10</text>
  <path class="d-edge" d="M 466 296 L 466 304"/>
  <text class="d-sub" x="466" y="322" text-anchor="middle">12</text>
  <path class="d-edge" d="M 522 296 L 522 304"/>
  <text class="d-sub" x="522" y="322" text-anchor="middle">14</text>
  <path class="d-edge" d="M 578 296 L 578 304"/>
  <text class="d-sub" x="578" y="322" text-anchor="middle">16</text>
  <path class="d-edge" d="M 634 296 L 634 304"/>
  <text class="d-sub" x="634" y="322" text-anchor="middle">18</text>
  <path class="d-edge-dashed" d="M 298 46 L 298 236"/>
  <path class="d-edge-dashed" d="M 410 46 L 410 236"/>
</svg>

The dashed lines mark the end of each merged block. \`[1, 3]\` and \`[2, 6]\` overlap, so they become \`[1, 6]\`; \`[8, 10]\` starts after 6, so it opens a new block, and so does \`[15, 18]\`.

Every step of the sweep is one of four situations:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="Four cases. Overlap extends the end, a nested interval keeps the old end, touching intervals extend, and a gap starts a new block">
  <defs>
    <marker id="b10q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="350" y="22" text-anchor="middle">Compare next.start with last.end</text>
  <text class="d-text" x="20" y="80">overlap</text>
  <rect class="d-box-muted" x="132" y="50" width="66" height="22" rx="5"/>
  <text class="d-sub" x="350" y="65">last [1, 4]</text>
  <rect class="d-box-accent" x="176" y="80" width="88" height="22" rx="5"/>
  <text class="d-sub" x="350" y="95">next [3, 7]</text>
  <path class="d-edge" d="M 440 76 L 500 76" marker-end="url(#b10q2-arrow)"/>
  <text class="d-text d-accent" x="512" y="81">extend: [1, 7]</text>
  <text class="d-text" x="20" y="150">nested</text>
  <rect class="d-box-muted" x="132" y="120" width="198" height="22" rx="5"/>
  <text class="d-sub" x="350" y="135">last [1, 10]</text>
  <rect class="d-box-accent" x="154" y="150" width="22" height="22" rx="5"/>
  <text class="d-sub" x="350" y="165">next [2, 3]</text>
  <path class="d-edge" d="M 440 146 L 500 146" marker-end="url(#b10q2-arrow)"/>
  <text class="d-text d-accent" x="512" y="151">keep: [1, 10]</text>
  <text class="d-text" x="20" y="220">touching</text>
  <rect class="d-box-muted" x="132" y="190" width="66" height="22" rx="5"/>
  <text class="d-sub" x="350" y="205">last [1, 4]</text>
  <rect class="d-box-accent" x="198" y="220" width="22" height="22" rx="5"/>
  <text class="d-sub" x="350" y="235">next [4, 5]</text>
  <path class="d-edge" d="M 440 216 L 500 216" marker-end="url(#b10q2-arrow)"/>
  <text class="d-text d-accent" x="512" y="221">extend: [1, 5]</text>
  <text class="d-text" x="20" y="290">gap</text>
  <rect class="d-box-muted" x="132" y="260" width="44" height="22" rx="5"/>
  <text class="d-sub" x="350" y="275">last [1, 3]</text>
  <rect class="d-box-accent" x="220" y="290" width="66" height="22" rx="5"/>
  <text class="d-sub" x="350" y="305">next [5, 8]</text>
  <path class="d-edge" d="M 440 286 L 500 286" marker-end="url(#b10q2-arrow)"/>
  <text class="d-text d-accent" x="512" y="291">new block</text>
</svg>

The **nested** row is the reason for \`max\`: \`[2, 3]\` lies completely inside \`[1, 10]\`, so the block must keep its end of 10. Writing \`last.end = next.end\` instead would shrink it to \`[1, 3]\` — example 2 shows exactly that bug.

## 4. Why Sorting Is the Key Step

**Brute force.** Without sorting you could repeatedly look for any two intervals that overlap, merge them, and start again until nothing changes. Each round compares all pairs (O(n²)), and you may need up to n rounds, so it can reach O(n³). It is also easy to get wrong.

**Sorting fixes the order of events.** Once intervals are sorted by start, the starts only go up. If the next interval does not overlap the current block, then no later interval can overlap any *earlier* block either (they all start even later), so earlier blocks are final the moment we leave them. That is why a single pass is correct.

📌 **Interview term: Invariant** — a statement that stays true at every step of a loop. Here: every block in the result except the last one is final and does not overlap anything that comes later.

Sorting is the expensive part, O(n log n); the sweep itself is O(n). For a refresher on how the standard sorts work, see [compare common sorting algorithms](/interview-question/compare-common-sorting-algorithms). The same sort-then-sweep pattern solves [the minimum number of meeting rooms](/interview-question/how-do-you-find-the-minimum-number-of-meeting-rooms-required), and it is a classic example of a [greedy algorithm](/interview-question/what-is-a-greedy-algorithm).

### Dry run on \`[[8, 10], [1, 3], [2, 6]]\`

| Step | Interval | Last block | Test | Result so far |
| :--- | :--- | :--- | :--- | :--- |
| sort | — | — | — | \`[1, 3], [2, 6], [8, 10]\` |
| 1 | \`[1, 3]\` | none | first interval | \`[[1, 3]]\` |
| 2 | \`[2, 6]\` | \`[1, 3]\` | 2 <= 3, overlap | \`[[1, 6]]\` (end = max(3, 6)) |
| 3 | \`[8, 10]\` | \`[1, 6]\` | 8 > 6, gap | \`[[1, 6], [8, 10]]\` |

## 5. The Code in Python

\`sorted()\` returns a **new** list and leaves the caller's list alone, while \`intervals.sort()\` would reorder it in place. The \`key=lambda iv: iv[0]\` tells Python to compare intervals by their start only. Tuple unpacking (\`for start, end in ...\`) gives readable names to the two numbers, and \`merged[-1]\` is the last element of a list.

~~~python
def merge(intervals):
    """Sort by start, then glue each interval onto the last merged one if they overlap."""
    merged = []
    for start, end in sorted(intervals, key=lambda iv: iv[0]):  # sorted() copies; the input is untouched
        if merged and start <= merged[-1][1]:       # overlaps (or touches) the last block
            merged[-1][1] = max(merged[-1][1], end)  # max: the new one may be nested inside
        else:
            merged.append([start, end])              # a gap: start a new block
    return merged
~~~

**What to point out in this code:**

- Without a \`key\`, \`sorted(intervals)\` compares lists element by element (start first, then end), which also works here; the \`key\` just makes the intent explicit.
- Python's sort is stable ([Sorting HOW TO, "Sort Stability and Complex Sorts"](https://docs.python.org/3/howto/sorting.html)), but stability does not matter for this problem: intervals with equal starts always overlap and merge.
- \`merged[-1][1] = max(...)\` changes the last block **in place**. That is safe only because we appended a fresh list \`[start, end]\`. If you append the caller's own inner list instead, you change their data. In our run, merging \`[[1, 3], [2, 6]]\` that way returned \`[[1, 6]]\` but left the caller's list as \`[[1, 6], [2, 6]]\`:

~~~python
for iv in sorted(intervals):
    ...
    merged.append(iv)          # appends the caller's own list object
~~~

~~~text
[[1, 6]]
[[1, 6], [2, 6]]
~~~

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 runs the same merge loop with each classic mistake switched on, so you can see the wrong output each bug produces.

**Example 1 — merge on seven inputs, including touching, nested and unsorted intervals** prints:

~~~text
[[1, 6], [8, 10], [15, 18]]
[[1, 5]]
[[1, 10]]
[[1, 6], [8, 10]]
[[1, 2], [3, 4], [5, 6]]
[[5, 7]]
[]
~~~

**Example 2 — the three classic bugs, each shown next to the correct result** prints:

~~~text
bug 1, end = new end instead of max: [[1, 10], [2, 3]]
  correct: [[1, 10]]
  buggy:   [[1, 3]]
bug 2, forgot to sort: [[8, 10], [1, 3], [2, 6]]
  correct: [[1, 6], [8, 10]]
  buggy:   [[8, 10]]
bug 3, < instead of <= (touching): [[1, 4], [4, 5]]
  correct: [[1, 5]]
  buggy:   [[1, 4], [4, 5]]
merged once:  [[1, 3], [5, 9], [11, 12]]
merged twice: [[1, 3], [5, 9], [11, 12]]
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Repeated pairwise merging | up to O(n³) | O(n) | rounds of all-pairs checks until nothing changes |
| Sort + one pass | O(n log n) | O(n) | the sort dominates; the pass is O(n); the output can hold n intervals |
| Input already sorted | O(n) | O(n) | skip the sort; only the pass remains |

## 8. Edge Cases

- **Empty input** — return an empty list; the loop never runs (\`[]\` in example 1).
- **One interval** — returned unchanged (\`[[5, 7]]\`).
- **Touching intervals** — \`[[1, 4], [4, 5]]\` becomes \`[[1, 5]]\` with \`<=\`; with \`<\` they stay apart (bug 3 in example 2). Ask which one the interviewer wants.
- **Nested intervals** — \`[[1, 10], [2, 3], [4, 5]]\` becomes \`[[1, 10]]\`; this is the case that needs \`max\`.
- **Unsorted input** — \`[[8, 10], [1, 3], [2, 6]]\` becomes \`[[1, 6], [8, 10]]\` only because we sort first (bug 2 shows what happens without the sort).
- **No overlaps at all** — \`[[1, 2], [3, 4], [5, 6]]\` comes back unchanged.
- **Already merged output** — merging the result again changes nothing (example 2 checks this).

📌 **Interview term: Idempotent** — an operation that gives the same result whether you apply it once or many times. Merging an already merged list returns it unchanged.

## Common Pitfalls

- **Forgetting to sort.** Without it, \`[[8, 10], [1, 3], [2, 6]]\` collapses to \`[[8, 10]]\` and loses \`[1, 6]\` (example 2, bug 2).
- **\`merged[-1][1] = end\` instead of \`max(...)\`.** A nested interval shrinks the block: \`[[1, 10], [2, 3]]\` becomes \`[[1, 3]]\` (bug 1).
- **Using \`<\` when touching intervals should merge.** \`[[1, 4], [4, 5]]\` stays as two blocks (bug 3).
- **Mutating the caller's data.** \`intervals.sort()\` reorders their list, and appending their inner lists then editing \`merged[-1]\` changes their intervals.
- **Indexing \`intervals[0]\` before checking for an empty list.** That raises \`IndexError\`; the loop-based version needs no special case.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Sort by start, then sweep once: extend the last block or start a new one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The overlap test:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start &lt;= merged[-1][1]</code> means overlap (touching counts); then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">merged[-1][1] = max(merged[-1][1], end)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why max:</strong> <span style="color:#f0e2c8;">A nested interval like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 3]</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 10]</code> must not shrink the block.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n log n) time for the sort, O(n) for the sweep and the output.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(..., key=lambda iv: iv[0])</code> leaves the input alone; append a new <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[start, end]</code> so editing the result never edits the input.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is one pass enough after sorting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Starts only increase, so once an interval starts after the current block ends, no later interval can reach back into an earlier block.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the input is already sorted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Skip the sort and the whole thing is O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you insert one new interval into an already merged list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Walk the list: copy blocks that end before it, merge every block that overlaps it into one, then copy the rest. O(n), no sort needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes if touching intervals should stay separate?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start &lt; merged[-1][1]</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sorted</code> change my list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it returns a new list. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.sort()</code> sorts in place and returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Interval** | A \`[start, end]\` range; closed means both ends are included |
| **Overlap** | Sorted intervals overlap when \`next.start <= last.end\` |
| **Sort-then-sweep** | Sort by start, then one left-to-right pass |
| **Invariant** | A fact that stays true at every loop step |
| **Idempotent** | Doing it twice gives the same result as doing it once |

---
**Conclusion:** In Python, merging intervals is \`sorted\` plus one loop: compare each start with the end of the last merged block, and either extend that end with \`max\` or append a new block. The sort makes it O(n log n); the loop is O(n). The Python-specific care points are choosing \`sorted()\` over \`.sort()\` when the caller's list must not change, and appending fresh \`[start, end]\` lists so that editing \`merged[-1]\` never edits the input.`,
        examples: [
          {
            label: "Sort + one pass on seven inputs (touching, nested, unsorted, empty)",
            code: `def merge(intervals):
    """Sort by start, then glue each interval onto the last merged one if they overlap."""
    merged = []
    for start, end in sorted(intervals, key=lambda iv: iv[0]):  # sorted() copies; the input is untouched
        if merged and start <= merged[-1][1]:       # overlaps (or touches) the last block
            merged[-1][1] = max(merged[-1][1], end)  # max: the new one may be nested inside
        else:
            merged.append([start, end])              # a gap: start a new block
    return merged


def fmt(intervals):
    return "[" + ", ".join("[" + str(s) + ", " + str(e) + "]" for s, e in intervals) + "]"


print(fmt(merge([[1, 3], [2, 6], [8, 10], [15, 18]])))  # [[1, 6], [8, 10], [15, 18]]
print(fmt(merge([[1, 4], [4, 5]])))  # [[1, 5]]
print(fmt(merge([[1, 10], [2, 3], [4, 5]])))  # [[1, 10]]
print(fmt(merge([[8, 10], [1, 3], [2, 6]])))  # [[1, 6], [8, 10]]
print(fmt(merge([[1, 2], [3, 4], [5, 6]])))  # [[1, 2], [3, 4], [5, 6]]
print(fmt(merge([[5, 7]])))  # [[5, 7]]
print(fmt(merge([])))  # []`,
          },
          {
            label: "The three classic bugs next to the correct merge",
            code: `def merge_with(intervals, do_sort=True, use_max=True, touching_merges=True):
    """The merge loop with three switches, so we can watch each classic bug happen."""
    items = sorted(intervals, key=lambda iv: iv[0]) if do_sort else list(intervals)
    merged = []
    for start, end in items:
        overlaps = merged and (start <= merged[-1][1] if touching_merges else start < merged[-1][1])
        if overlaps:
            merged[-1][1] = max(merged[-1][1], end) if use_max else end
        else:
            merged.append([start, end])
    return merged


def fmt(intervals):
    return "[" + ", ".join("[" + str(s) + ", " + str(e) + "]" for s, e in intervals) + "]"


def show(name, intervals, **bug):
    good = fmt(merge_with(intervals))
    bad = fmt(merge_with(intervals, **bug))
    print(name + " " + fmt(intervals))
    print("  correct: " + good)
    print("  buggy:   " + bad)


show("bug 1, end = new end instead of max:", [[1, 10], [2, 3]], use_max=False)
show("bug 2, forgot to sort:", [[8, 10], [1, 3], [2, 6]], do_sort=False)
show("bug 3, < instead of <= (touching):", [[1, 4], [4, 5]], touching_merges=False)

# Merging is idempotent: merging the output again changes nothing.
once = merge_with([[2, 3], [1, 2], [6, 9], [5, 6], [11, 12]])
print("merged once:  " + fmt(once))
print("merged twice: " + fmt(merge_with(once)))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given an array of intervals, each a two-element array [start, end], in no particular order. Write a JavaScript function that merges all overlapping intervals and returns the merged array sorted by start."

**What a strong answer should cover:**
- Sort by start, then one pass that either extends the last merged interval or starts a new one.
- Use \`Math.max(last[1], end)\` when extending, because an interval can be nested inside the previous one.
- Complexity: O(n log n) for the sort plus O(n) for the pass; O(n) output.
- Touching intervals ([1, 4] and [4, 5]): \`<=\` merges them; confirm the expected behaviour.
- JavaScript details: \`Array.prototype.sort\` sorts in place and, without a comparator, compares elements as strings — \`[10, 12]\` sorts before \`[9, 11]\`; always pass \`(a, b) => a[0] - b[0]\` and copy the input first.

**Clarifying questions expected:**
- Do touching intervals count as overlapping?
- May I modify the input array?

**Code / implementation expected:** Yes — a function \`merge(intervals)\` returning a new array, in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, lists/arrays and sorting in JavaScript.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Your calendar app shows that you are busy 9–11, 10–12, and 14–15, and your manager asks a simple question: "When are you actually busy?" You would not answer with three blocks — you would say "9 to 12, and 2 to 3 in the afternoon". You merged the first two because they overlap.

That is the whole problem: given a pile of \`[start, end]\` ranges in any order, squash every group of overlapping ranges into one range. It shows up everywhere — calendar free/busy views, merging IP address ranges in a firewall, combining highlighted text ranges in an editor, or compacting time windows in a log system.

It is a favourite interview question because it has one big idea (**sort first**) and two or three small details that are easy to get wrong (nested intervals, touching intervals, and changing the caller's data).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do touching intervals like \`[1, 4]\` and \`[4, 5]\` count as overlapping? | It decides \`<=\` versus \`<\` in the overlap test. The common version merges them into \`[1, 5]\`. |
| Is the input already sorted by start? | If yes, you can skip the O(n log n) sort and merge in O(n). |
| Can I modify the input, or must I return a new list? | Sorting in place changes the caller's data; copying costs O(n) memory. |
| Are the intervals closed \`[start, end]\` with \`start <= end\`? | An interval with start > end is invalid input and should be rejected or swapped. |
| How many intervals, and how big are the numbers? | Large n rules out comparing every pair (O(n²)); large values matter for comparator overflow in some languages. |

## 3. The Core Idea

If the intervals are sorted by their start, any interval can only overlap with the **block you are currently building** — never with an older block, because everything older ended before the current block started. So after sorting, one left-to-right pass is enough:

1. Sort the intervals by start.
2. Start the result with the first interval.
3. For each next interval: if its start is \`<=\` the end of the last block, it overlaps — **extend** the last block's end to \`max(lastEnd, nextEnd)\`. Otherwise there is a gap — **start a new block**.

📌 **Interview term: Interval** — a pair \`[start, end]\` describing a continuous range, such as a meeting from 9 to 11. Here both ends are included (a closed interval).

📌 **Interview term: Overlap** — two sorted intervals overlap when the second one starts no later than the first one ends: \`next.start <= last.end\`.

📌 **Interview term: Sort-then-sweep** — a pattern for interval problems: sort by start time, then walk once from left to right keeping only the current block. The sort costs O(n log n) and the sweep O(n).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 340" role="img" aria-label="Intervals 1 to 3 and 2 to 6 overlap and merge into 1 to 6, while 8 to 10 and 15 to 18 stay separate">
  <text class="d-text" x="340" y="22" text-anchor="middle">Sorted input on top, merged result below</text>
  <text class="d-sub" x="20" y="72">input</text>
  <text class="d-sub" x="20" y="262">merged</text>
  <rect class="d-box-muted" x="158" y="50" width="56" height="28" rx="6"/>
  <text class="d-sub" x="186" y="68" text-anchor="middle">[1, 3]</text>
  <rect class="d-box-muted" x="186" y="92" width="112" height="28" rx="6"/>
  <text class="d-sub" x="242" y="110" text-anchor="middle">[2, 6]</text>
  <rect class="d-box-muted" x="354" y="134" width="56" height="28" rx="6"/>
  <text class="d-sub" x="382" y="152" text-anchor="middle">[8, 10]</text>
  <rect class="d-box-muted" x="550" y="176" width="84" height="28" rx="6"/>
  <text class="d-sub" x="592" y="194" text-anchor="middle">[15, 18]</text>
  <rect class="d-box-accent" x="158" y="244" width="140" height="28" rx="6"/>
  <text class="d-text" x="228" y="263" text-anchor="middle">[1, 6]</text>
  <rect class="d-box-accent" x="354" y="244" width="56" height="28" rx="6"/>
  <text class="d-text" x="382" y="263" text-anchor="middle">[8, 10]</text>
  <rect class="d-box-accent" x="550" y="244" width="84" height="28" rx="6"/>
  <text class="d-text" x="592" y="263" text-anchor="middle">[15, 18]</text>
  <path class="d-edge" d="M 130 300 L 634 300"/>
  <path class="d-edge" d="M 130 296 L 130 304"/>
  <text class="d-sub" x="130" y="322" text-anchor="middle">0</text>
  <path class="d-edge" d="M 186 296 L 186 304"/>
  <text class="d-sub" x="186" y="322" text-anchor="middle">2</text>
  <path class="d-edge" d="M 242 296 L 242 304"/>
  <text class="d-sub" x="242" y="322" text-anchor="middle">4</text>
  <path class="d-edge" d="M 298 296 L 298 304"/>
  <text class="d-sub" x="298" y="322" text-anchor="middle">6</text>
  <path class="d-edge" d="M 354 296 L 354 304"/>
  <text class="d-sub" x="354" y="322" text-anchor="middle">8</text>
  <path class="d-edge" d="M 410 296 L 410 304"/>
  <text class="d-sub" x="410" y="322" text-anchor="middle">10</text>
  <path class="d-edge" d="M 466 296 L 466 304"/>
  <text class="d-sub" x="466" y="322" text-anchor="middle">12</text>
  <path class="d-edge" d="M 522 296 L 522 304"/>
  <text class="d-sub" x="522" y="322" text-anchor="middle">14</text>
  <path class="d-edge" d="M 578 296 L 578 304"/>
  <text class="d-sub" x="578" y="322" text-anchor="middle">16</text>
  <path class="d-edge" d="M 634 296 L 634 304"/>
  <text class="d-sub" x="634" y="322" text-anchor="middle">18</text>
  <path class="d-edge-dashed" d="M 298 46 L 298 236"/>
  <path class="d-edge-dashed" d="M 410 46 L 410 236"/>
</svg>

The dashed lines mark the end of each merged block. \`[1, 3]\` and \`[2, 6]\` overlap, so they become \`[1, 6]\`; \`[8, 10]\` starts after 6, so it opens a new block, and so does \`[15, 18]\`.

Every step of the sweep is one of four situations:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="Four cases. Overlap extends the end, a nested interval keeps the old end, touching intervals extend, and a gap starts a new block">
  <defs>
    <marker id="b10q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="350" y="22" text-anchor="middle">Compare next.start with last.end</text>
  <text class="d-text" x="20" y="80">overlap</text>
  <rect class="d-box-muted" x="132" y="50" width="66" height="22" rx="5"/>
  <text class="d-sub" x="350" y="65">last [1, 4]</text>
  <rect class="d-box-accent" x="176" y="80" width="88" height="22" rx="5"/>
  <text class="d-sub" x="350" y="95">next [3, 7]</text>
  <path class="d-edge" d="M 440 76 L 500 76" marker-end="url(#b10q2-arrow)"/>
  <text class="d-text d-accent" x="512" y="81">extend: [1, 7]</text>
  <text class="d-text" x="20" y="150">nested</text>
  <rect class="d-box-muted" x="132" y="120" width="198" height="22" rx="5"/>
  <text class="d-sub" x="350" y="135">last [1, 10]</text>
  <rect class="d-box-accent" x="154" y="150" width="22" height="22" rx="5"/>
  <text class="d-sub" x="350" y="165">next [2, 3]</text>
  <path class="d-edge" d="M 440 146 L 500 146" marker-end="url(#b10q2-arrow)"/>
  <text class="d-text d-accent" x="512" y="151">keep: [1, 10]</text>
  <text class="d-text" x="20" y="220">touching</text>
  <rect class="d-box-muted" x="132" y="190" width="66" height="22" rx="5"/>
  <text class="d-sub" x="350" y="205">last [1, 4]</text>
  <rect class="d-box-accent" x="198" y="220" width="22" height="22" rx="5"/>
  <text class="d-sub" x="350" y="235">next [4, 5]</text>
  <path class="d-edge" d="M 440 216 L 500 216" marker-end="url(#b10q2-arrow)"/>
  <text class="d-text d-accent" x="512" y="221">extend: [1, 5]</text>
  <text class="d-text" x="20" y="290">gap</text>
  <rect class="d-box-muted" x="132" y="260" width="44" height="22" rx="5"/>
  <text class="d-sub" x="350" y="275">last [1, 3]</text>
  <rect class="d-box-accent" x="220" y="290" width="66" height="22" rx="5"/>
  <text class="d-sub" x="350" y="305">next [5, 8]</text>
  <path class="d-edge" d="M 440 286 L 500 286" marker-end="url(#b10q2-arrow)"/>
  <text class="d-text d-accent" x="512" y="291">new block</text>
</svg>

The **nested** row is the reason for \`max\`: \`[2, 3]\` lies completely inside \`[1, 10]\`, so the block must keep its end of 10. Writing \`last.end = next.end\` instead would shrink it to \`[1, 3]\` — example 2 shows exactly that bug.

## 4. Why Sorting Is the Key Step

**Brute force.** Without sorting you could repeatedly look for any two intervals that overlap, merge them, and start again until nothing changes. Each round compares all pairs (O(n²)), and you may need up to n rounds, so it can reach O(n³). It is also easy to get wrong.

**Sorting fixes the order of events.** Once intervals are sorted by start, the starts only go up. If the next interval does not overlap the current block, then no later interval can overlap any *earlier* block either (they all start even later), so earlier blocks are final the moment we leave them. That is why a single pass is correct.

📌 **Interview term: Invariant** — a statement that stays true at every step of a loop. Here: every block in the result except the last one is final and does not overlap anything that comes later.

Sorting is the expensive part, O(n log n); the sweep itself is O(n). For a refresher on how the standard sorts work, see [compare common sorting algorithms](/interview-question/compare-common-sorting-algorithms). The same sort-then-sweep pattern solves [the minimum number of meeting rooms](/interview-question/how-do-you-find-the-minimum-number-of-meeting-rooms-required), and it is a classic example of a [greedy algorithm](/interview-question/what-is-a-greedy-algorithm).

### Dry run on \`[[8, 10], [1, 3], [2, 6]]\`

| Step | Interval | Last block | Test | Result so far |
| :--- | :--- | :--- | :--- | :--- |
| sort | — | — | — | \`[1, 3], [2, 6], [8, 10]\` |
| 1 | \`[1, 3]\` | none | first interval | \`[[1, 3]]\` |
| 2 | \`[2, 6]\` | \`[1, 3]\` | 2 <= 3, overlap | \`[[1, 6]]\` (end = max(3, 6)) |
| 3 | \`[8, 10]\` | \`[1, 6]\` | 8 > 6, gap | \`[[1, 6], [8, 10]]\` |

## 5. The Code in JavaScript

\`intervals.map(iv => [iv[0], iv[1]])\` makes a copy of every interval, so sorting and editing never touch the caller's arrays. The comparator \`(a, b) => a[0] - b[0]\` returns a negative number when \`a\` should come first, which is how \`sort\` expects to be told the order.

~~~javascript
function merge(intervals) {
  // Copy before sorting: Array.prototype.sort sorts in place. The comparator is required,
  // because without one sort() compares the arrays as strings ("10,12" comes before "9,11").
  const sorted = intervals.map((iv) => [iv[0], iv[1]]).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {      // overlaps (or touches) the last block
      last[1] = Math.max(last[1], end);  // max: the new one may be nested inside
    } else {
      merged.push([start, end]);         // a gap: start a new block
    }
  }
  return merged;
}
~~~

**What to point out in this code:**

- \`a[0] - b[0]\` is safe in JavaScript for any realistic coordinates: numbers are doubles, so there is no 32-bit overflow as there is in Java. It does produce \`NaN\` if a start is \`undefined\`, which makes the order unpredictable — validate the input.
- \`const last = merged[merged.length - 1]\` is \`undefined\` for an empty array, which the \`last &&\` check handles. Because \`last\` is a reference to the array inside \`merged\`, \`last[1] = ...\` updates the result directly.
- Destructuring \`for (const [start, end] of sorted)\` names the two numbers without index noise.
- **Never call \`sort()\` without a comparator on arrays of numbers.** The default converts elements to strings and compares them as text, so \`"10,12"\` comes before \`"9,11"\` because the character \`1\` comes before \`9\`. In our run:

~~~javascript
const a = [[10, 12], [9, 11], [1, 3]];
console.log(JSON.stringify(a.slice().sort()));
console.log(JSON.stringify(a.slice().sort((x, y) => x[0] - y[0])));
~~~

~~~text
[[1,3],[10,12],[9,11]]
[[1,3],[9,11],[10,12]]
~~~

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 runs the same merge loop with each classic mistake switched on, so you can see the wrong output each bug produces.

**Example 1 — merge on seven inputs, including touching, nested and unsorted intervals** prints:

~~~text
[[1, 6], [8, 10], [15, 18]]
[[1, 5]]
[[1, 10]]
[[1, 6], [8, 10]]
[[1, 2], [3, 4], [5, 6]]
[[5, 7]]
[]
~~~

**Example 2 — the three classic bugs, each shown next to the correct result** prints:

~~~text
bug 1, end = new end instead of max: [[1, 10], [2, 3]]
  correct: [[1, 10]]
  buggy:   [[1, 3]]
bug 2, forgot to sort: [[8, 10], [1, 3], [2, 6]]
  correct: [[1, 6], [8, 10]]
  buggy:   [[8, 10]]
bug 3, < instead of <= (touching): [[1, 4], [4, 5]]
  correct: [[1, 5]]
  buggy:   [[1, 4], [4, 5]]
merged once:  [[1, 3], [5, 9], [11, 12]]
merged twice: [[1, 3], [5, 9], [11, 12]]
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Repeated pairwise merging | up to O(n³) | O(n) | rounds of all-pairs checks until nothing changes |
| Sort + one pass | O(n log n) | O(n) | the sort dominates; the copy and the output are O(n) |
| Input already sorted | O(n) | O(n) | skip the sort; only the pass remains |

## 8. Edge Cases

- **Empty input** — return an empty list; the loop never runs (\`[]\` in example 1).
- **One interval** — returned unchanged (\`[[5, 7]]\`).
- **Touching intervals** — \`[[1, 4], [4, 5]]\` becomes \`[[1, 5]]\` with \`<=\`; with \`<\` they stay apart (bug 3 in example 2). Ask which one the interviewer wants.
- **Nested intervals** — \`[[1, 10], [2, 3], [4, 5]]\` becomes \`[[1, 10]]\`; this is the case that needs \`max\`.
- **Unsorted input** — \`[[8, 10], [1, 3], [2, 6]]\` becomes \`[[1, 6], [8, 10]]\` only because we sort first (bug 2 shows what happens without the sort).
- **No overlaps at all** — \`[[1, 2], [3, 4], [5, 6]]\` comes back unchanged.
- **Already merged output** — merging the result again changes nothing (example 2 checks this).

📌 **Interview term: Idempotent** — an operation that gives the same result whether you apply it once or many times. Merging an already merged list returns it unchanged.

## Common Pitfalls

- **Calling \`sort()\` with no comparator.** It sorts as strings, so \`[10, 12]\` lands before \`[9, 11]\` and the sweep merges the wrong neighbours.
- **Forgetting to sort at all.** \`[[8, 10], [1, 3], [2, 6]]\` collapses to \`[[8, 10]]\` (example 2, bug 2).
- **\`last[1] = end\` instead of \`Math.max(last[1], end)\`.** A nested interval shrinks the block: \`[[1, 10], [2, 3]]\` becomes \`[[1, 3]]\` (bug 1).
- **Sorting the caller's array in place.** \`sort\` mutates; copy first if the caller still needs the original order.
- **Using \`<\` when touching intervals should merge.** \`[[1, 4], [4, 5]]\` stays as two blocks (bug 3).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Sort by start, then sweep once: extend the last block or start a new one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The overlap test:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start &lt;= last[1]</code> means overlap (touching counts); then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">last[1] = Math.max(last[1], end)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why max:</strong> <span style="color:#f0e2c8;">A nested interval like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 3]</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 10]</code> must not shrink the block.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n log n) for the sort, O(n) for the sweep and the output.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Always pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a[0] - b[0]</code>: the default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort()</code> compares strings. Copy the input first because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort</code> works in place.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is one pass enough after sorting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Starts only increase, so once an interval starts after the current block ends, no later interval can reach back into an earlier block.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[[10, 12], [9, 11]].sort()</code> give?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[10, 12], [9, 11]]</code> stays in that order, because the elements are compared as the strings <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"10,12"</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"9,11"</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you insert one new interval into an already merged list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push blocks that end before it, merge every overlapping block into it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max</code>, then push the rest. O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if touching intervals should stay separate?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Change the test to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">start &lt; last[1]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a[0] - b[0]</code> safe from overflow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes in JavaScript, numbers are doubles. In Java the same expression can overflow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Interval** | A \`[start, end]\` range; closed means both ends are included |
| **Overlap** | Sorted intervals overlap when \`next.start <= last.end\` |
| **Sort-then-sweep** | Sort by start, then one left-to-right pass |
| **Invariant** | A fact that stays true at every loop step |
| **Idempotent** | Doing it twice gives the same result as doing it once |

---
**Conclusion:** In JavaScript, merging intervals is a copy, a numeric sort, and one loop that either extends \`last[1]\` with \`Math.max\` or pushes a new block. It is O(n log n) because of the sort. The JavaScript-specific trap is \`sort()\` itself: it works in place and, without a comparator, compares arrays as strings — always pass \`(a, b) => a[0] - b[0]\`.`,
        examples: [
          {
            label: "Sort + one pass on seven inputs (touching, nested, unsorted, empty)",
            code: `// Sort by start, then glue each interval onto the last merged one if they overlap.
function merge(intervals) {
  // Copy before sorting: Array.prototype.sort sorts in place. The comparator is required,
  // because without one sort() compares the arrays as strings ("10,12" comes before "9,11").
  const sorted = intervals.map((iv) => [iv[0], iv[1]]).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {      // overlaps (or touches) the last block
      last[1] = Math.max(last[1], end);  // max: the new one may be nested inside
    } else {
      merged.push([start, end]);         // a gap: start a new block
    }
  }
  return merged;
}

function fmt(intervals) {
  return "[" + intervals.map((iv) => "[" + iv[0] + ", " + iv[1] + "]").join(", ") + "]";
}

console.log(fmt(merge([[1, 3], [2, 6], [8, 10], [15, 18]]))); // [[1, 6], [8, 10], [15, 18]]
console.log(fmt(merge([[1, 4], [4, 5]]))); // [[1, 5]]
console.log(fmt(merge([[1, 10], [2, 3], [4, 5]]))); // [[1, 10]]
console.log(fmt(merge([[8, 10], [1, 3], [2, 6]]))); // [[1, 6], [8, 10]]
console.log(fmt(merge([[1, 2], [3, 4], [5, 6]]))); // [[1, 2], [3, 4], [5, 6]]
console.log(fmt(merge([[5, 7]]))); // [[5, 7]]
console.log(fmt(merge([]))); // []`,
          },
          {
            label: "The three classic bugs next to the correct merge",
            code: `// The merge loop with three switches, so we can watch each classic bug happen.
function mergeWith(intervals, doSort, useMax, touchingMerges) {
  let items = intervals.map((iv) => [iv[0], iv[1]]);
  if (doSort) items.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of items) {
    const last = merged[merged.length - 1];
    const overlaps = last !== undefined && (touchingMerges ? start <= last[1] : start < last[1]);
    if (overlaps) {
      last[1] = useMax ? Math.max(last[1], end) : end;
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

function fmt(intervals) {
  return "[" + intervals.map((iv) => "[" + iv[0] + ", " + iv[1] + "]").join(", ") + "]";
}

function show(name, intervals, doSort, useMax, touchingMerges) {
  console.log(name + " " + fmt(intervals));
  console.log("  correct: " + fmt(mergeWith(intervals, true, true, true)));
  console.log("  buggy:   " + fmt(mergeWith(intervals, doSort, useMax, touchingMerges)));
}

show("bug 1, end = new end instead of max:", [[1, 10], [2, 3]], true, false, true);
show("bug 2, forgot to sort:", [[8, 10], [1, 3], [2, 6]], false, true, true);
show("bug 3, < instead of <= (touching):", [[1, 4], [4, 5]], true, true, false);

// Merging is idempotent: merging the output again changes nothing.
const once = mergeWith([[2, 3], [1, 2], [6, 9], [5, 6], [11, 12]], true, true, true);
console.log("merged once:  " + fmt(once));
console.log("merged twice: " + fmt(mergeWith(once, true, true, true)));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given an int[][] of intervals, each {start, end}, in no particular order. Write a Java method that merges all overlapping intervals and returns them as an int[][] sorted by start."

**What a strong answer should cover:**
- Sort by start, then one pass that either extends the last merged interval or starts a new one.
- Use \`Math.max(last[1], iv[1])\` when extending, because an interval can be nested inside the previous one.
- Complexity: O(n log n) for the sort plus O(n) for the pass; O(n) output.
- Touching intervals: \`<=\` merges them; confirm the expected behaviour.
- Java details: sort with \`Arrays.sort(arr, (a, b) -> Integer.compare(a[0], b[0]))\` — the popular \`a[0] - b[0]\` can overflow \`int\` and mis-order large values; collect into a \`List<int[]>\` and convert with \`toArray(new int[0][])\`.

**Clarifying questions expected:**
- Do touching intervals count as overlapping?
- May I modify the input array?

**Code / implementation expected:** Yes — \`static int[][] merge(int[][] intervals)\` in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, lists/arrays and sorting in Java.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Your calendar app shows that you are busy 9–11, 10–12, and 14–15, and your manager asks a simple question: "When are you actually busy?" You would not answer with three blocks — you would say "9 to 12, and 2 to 3 in the afternoon". You merged the first two because they overlap.

That is the whole problem: given a pile of \`[start, end]\` ranges in any order, squash every group of overlapping ranges into one range. It shows up everywhere — calendar free/busy views, merging IP address ranges in a firewall, combining highlighted text ranges in an editor, or compacting time windows in a log system.

It is a favourite interview question because it has one big idea (**sort first**) and two or three small details that are easy to get wrong (nested intervals, touching intervals, and changing the caller's data).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do touching intervals like \`[1, 4]\` and \`[4, 5]\` count as overlapping? | It decides \`<=\` versus \`<\` in the overlap test. The common version merges them into \`[1, 5]\`. |
| Is the input already sorted by start? | If yes, you can skip the O(n log n) sort and merge in O(n). |
| Can I modify the input, or must I return a new list? | Sorting in place changes the caller's data; copying costs O(n) memory. |
| Are the intervals closed \`[start, end]\` with \`start <= end\`? | An interval with start > end is invalid input and should be rejected or swapped. |
| How many intervals, and how big are the numbers? | Large n rules out comparing every pair (O(n²)); large values matter for comparator overflow in some languages. |

## 3. The Core Idea

If the intervals are sorted by their start, any interval can only overlap with the **block you are currently building** — never with an older block, because everything older ended before the current block started. So after sorting, one left-to-right pass is enough:

1. Sort the intervals by start.
2. Start the result with the first interval.
3. For each next interval: if its start is \`<=\` the end of the last block, it overlaps — **extend** the last block's end to \`max(lastEnd, nextEnd)\`. Otherwise there is a gap — **start a new block**.

📌 **Interview term: Interval** — a pair \`[start, end]\` describing a continuous range, such as a meeting from 9 to 11. Here both ends are included (a closed interval).

📌 **Interview term: Overlap** — two sorted intervals overlap when the second one starts no later than the first one ends: \`next.start <= last.end\`.

📌 **Interview term: Sort-then-sweep** — a pattern for interval problems: sort by start time, then walk once from left to right keeping only the current block. The sort costs O(n log n) and the sweep O(n).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 340" role="img" aria-label="Intervals 1 to 3 and 2 to 6 overlap and merge into 1 to 6, while 8 to 10 and 15 to 18 stay separate">
  <text class="d-text" x="340" y="22" text-anchor="middle">Sorted input on top, merged result below</text>
  <text class="d-sub" x="20" y="72">input</text>
  <text class="d-sub" x="20" y="262">merged</text>
  <rect class="d-box-muted" x="158" y="50" width="56" height="28" rx="6"/>
  <text class="d-sub" x="186" y="68" text-anchor="middle">[1, 3]</text>
  <rect class="d-box-muted" x="186" y="92" width="112" height="28" rx="6"/>
  <text class="d-sub" x="242" y="110" text-anchor="middle">[2, 6]</text>
  <rect class="d-box-muted" x="354" y="134" width="56" height="28" rx="6"/>
  <text class="d-sub" x="382" y="152" text-anchor="middle">[8, 10]</text>
  <rect class="d-box-muted" x="550" y="176" width="84" height="28" rx="6"/>
  <text class="d-sub" x="592" y="194" text-anchor="middle">[15, 18]</text>
  <rect class="d-box-accent" x="158" y="244" width="140" height="28" rx="6"/>
  <text class="d-text" x="228" y="263" text-anchor="middle">[1, 6]</text>
  <rect class="d-box-accent" x="354" y="244" width="56" height="28" rx="6"/>
  <text class="d-text" x="382" y="263" text-anchor="middle">[8, 10]</text>
  <rect class="d-box-accent" x="550" y="244" width="84" height="28" rx="6"/>
  <text class="d-text" x="592" y="263" text-anchor="middle">[15, 18]</text>
  <path class="d-edge" d="M 130 300 L 634 300"/>
  <path class="d-edge" d="M 130 296 L 130 304"/>
  <text class="d-sub" x="130" y="322" text-anchor="middle">0</text>
  <path class="d-edge" d="M 186 296 L 186 304"/>
  <text class="d-sub" x="186" y="322" text-anchor="middle">2</text>
  <path class="d-edge" d="M 242 296 L 242 304"/>
  <text class="d-sub" x="242" y="322" text-anchor="middle">4</text>
  <path class="d-edge" d="M 298 296 L 298 304"/>
  <text class="d-sub" x="298" y="322" text-anchor="middle">6</text>
  <path class="d-edge" d="M 354 296 L 354 304"/>
  <text class="d-sub" x="354" y="322" text-anchor="middle">8</text>
  <path class="d-edge" d="M 410 296 L 410 304"/>
  <text class="d-sub" x="410" y="322" text-anchor="middle">10</text>
  <path class="d-edge" d="M 466 296 L 466 304"/>
  <text class="d-sub" x="466" y="322" text-anchor="middle">12</text>
  <path class="d-edge" d="M 522 296 L 522 304"/>
  <text class="d-sub" x="522" y="322" text-anchor="middle">14</text>
  <path class="d-edge" d="M 578 296 L 578 304"/>
  <text class="d-sub" x="578" y="322" text-anchor="middle">16</text>
  <path class="d-edge" d="M 634 296 L 634 304"/>
  <text class="d-sub" x="634" y="322" text-anchor="middle">18</text>
  <path class="d-edge-dashed" d="M 298 46 L 298 236"/>
  <path class="d-edge-dashed" d="M 410 46 L 410 236"/>
</svg>

The dashed lines mark the end of each merged block. \`[1, 3]\` and \`[2, 6]\` overlap, so they become \`[1, 6]\`; \`[8, 10]\` starts after 6, so it opens a new block, and so does \`[15, 18]\`.

Every step of the sweep is one of four situations:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="Four cases. Overlap extends the end, a nested interval keeps the old end, touching intervals extend, and a gap starts a new block">
  <defs>
    <marker id="b10q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="350" y="22" text-anchor="middle">Compare next.start with last.end</text>
  <text class="d-text" x="20" y="80">overlap</text>
  <rect class="d-box-muted" x="132" y="50" width="66" height="22" rx="5"/>
  <text class="d-sub" x="350" y="65">last [1, 4]</text>
  <rect class="d-box-accent" x="176" y="80" width="88" height="22" rx="5"/>
  <text class="d-sub" x="350" y="95">next [3, 7]</text>
  <path class="d-edge" d="M 440 76 L 500 76" marker-end="url(#b10q2-arrow)"/>
  <text class="d-text d-accent" x="512" y="81">extend: [1, 7]</text>
  <text class="d-text" x="20" y="150">nested</text>
  <rect class="d-box-muted" x="132" y="120" width="198" height="22" rx="5"/>
  <text class="d-sub" x="350" y="135">last [1, 10]</text>
  <rect class="d-box-accent" x="154" y="150" width="22" height="22" rx="5"/>
  <text class="d-sub" x="350" y="165">next [2, 3]</text>
  <path class="d-edge" d="M 440 146 L 500 146" marker-end="url(#b10q2-arrow)"/>
  <text class="d-text d-accent" x="512" y="151">keep: [1, 10]</text>
  <text class="d-text" x="20" y="220">touching</text>
  <rect class="d-box-muted" x="132" y="190" width="66" height="22" rx="5"/>
  <text class="d-sub" x="350" y="205">last [1, 4]</text>
  <rect class="d-box-accent" x="198" y="220" width="22" height="22" rx="5"/>
  <text class="d-sub" x="350" y="235">next [4, 5]</text>
  <path class="d-edge" d="M 440 216 L 500 216" marker-end="url(#b10q2-arrow)"/>
  <text class="d-text d-accent" x="512" y="221">extend: [1, 5]</text>
  <text class="d-text" x="20" y="290">gap</text>
  <rect class="d-box-muted" x="132" y="260" width="44" height="22" rx="5"/>
  <text class="d-sub" x="350" y="275">last [1, 3]</text>
  <rect class="d-box-accent" x="220" y="290" width="66" height="22" rx="5"/>
  <text class="d-sub" x="350" y="305">next [5, 8]</text>
  <path class="d-edge" d="M 440 286 L 500 286" marker-end="url(#b10q2-arrow)"/>
  <text class="d-text d-accent" x="512" y="291">new block</text>
</svg>

The **nested** row is the reason for \`max\`: \`[2, 3]\` lies completely inside \`[1, 10]\`, so the block must keep its end of 10. Writing \`last.end = next.end\` instead would shrink it to \`[1, 3]\` — example 2 shows exactly that bug.

## 4. Why Sorting Is the Key Step

**Brute force.** Without sorting you could repeatedly look for any two intervals that overlap, merge them, and start again until nothing changes. Each round compares all pairs (O(n²)), and you may need up to n rounds, so it can reach O(n³). It is also easy to get wrong.

**Sorting fixes the order of events.** Once intervals are sorted by start, the starts only go up. If the next interval does not overlap the current block, then no later interval can overlap any *earlier* block either (they all start even later), so earlier blocks are final the moment we leave them. That is why a single pass is correct.

📌 **Interview term: Invariant** — a statement that stays true at every step of a loop. Here: every block in the result except the last one is final and does not overlap anything that comes later.

Sorting is the expensive part, O(n log n); the sweep itself is O(n). For a refresher on how the standard sorts work, see [compare common sorting algorithms](/interview-question/compare-common-sorting-algorithms). The same sort-then-sweep pattern solves [the minimum number of meeting rooms](/interview-question/how-do-you-find-the-minimum-number-of-meeting-rooms-required), and it is a classic example of a [greedy algorithm](/interview-question/what-is-a-greedy-algorithm).

### Dry run on \`[[8, 10], [1, 3], [2, 6]]\`

| Step | Interval | Last block | Test | Result so far |
| :--- | :--- | :--- | :--- | :--- |
| sort | — | — | — | \`[1, 3], [2, 6], [8, 10]\` |
| 1 | \`[1, 3]\` | none | first interval | \`[[1, 3]]\` |
| 2 | \`[2, 6]\` | \`[1, 3]\` | 2 <= 3, overlap | \`[[1, 6]]\` (end = max(3, 6)) |
| 3 | \`[8, 10]\` | \`[1, 6]\` | 8 > 6, gap | \`[[1, 6], [8, 10]]\` |

## 5. The Code in Java

Java arrays have a fixed size, so the method collects blocks in an \`ArrayList<int[]>\` and converts at the end with \`merged.toArray(new int[0][])\`. \`intervals.clone()\` copies the **outer** array only (the inner \`int[]\`s are shared), which is enough to sort without reordering the caller's array; we never edit an inner array of the input, because every block we add is a fresh \`new int[]{...}\`.

~~~java
static int[][] merge(int[][] intervals) {
    int[][] sorted = intervals.clone();                         // shallow copy: do not reorder the caller array
    Arrays.sort(sorted, (a, b) -> Integer.compare(a[0], b[0])); // compare, not a[0] - b[0]: no overflow
    List<int[]> merged = new ArrayList<>();
    for (int[] iv : sorted) {
        int[] last = merged.isEmpty() ? null : merged.get(merged.size() - 1);
        if (last != null && iv[0] <= last[1]) {   // overlaps (or touches) the last block
            last[1] = Math.max(last[1], iv[1]);   // max: the new one may be nested inside
        } else {
            merged.add(new int[]{iv[0], iv[1]});  // a gap: start a new block (a fresh array)
        }
    }
    return merged.toArray(new int[0][]);
}
~~~

**What to point out in this code:**

- \`last\` is a reference to the \`int[]\` stored in the list, so \`last[1] = ...\` updates the result directly.
- \`toArray(new int[0][])\` gives a correctly typed \`int[][]\`; plain \`toArray()\` would return \`Object[]\`.
- **Use \`Integer.compare\`, not subtraction, in the comparator.** \`a[0] - b[0]\` overflows when the values are far apart, and the sign flips (\`Comparator.comparingInt(a -> a[0])\` is another overflow-safe way to write it). In our run with starts \`Integer.MIN_VALUE\`, \`5\` and \`Integer.MAX_VALUE - 1\`:

~~~java
Arrays.sort(bad, (x, y) -> x[0] - y[0]);
Arrays.sort(good, (x, y) -> Integer.compare(x[0], y[0]));
~~~

~~~text
a[0] - b[0]:     [[5, 6], [2147483646, 2147483647], [-2147483648, 0]]
Integer.compare: [[-2147483648, 0], [5, 6], [2147483646, 2147483647]]
~~~

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21; the code only uses Java 17 features). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 runs the same merge loop with each classic mistake switched on, so you can see the wrong output each bug produces.

**Example 1 — merge on seven inputs, including touching, nested and unsorted intervals** prints:

~~~text
[[1, 6], [8, 10], [15, 18]]
[[1, 5]]
[[1, 10]]
[[1, 6], [8, 10]]
[[1, 2], [3, 4], [5, 6]]
[[5, 7]]
[]
~~~

**Example 2 — the three classic bugs, each shown next to the correct result** prints:

~~~text
bug 1, end = new end instead of max: [[1, 10], [2, 3]]
  correct: [[1, 10]]
  buggy:   [[1, 3]]
bug 2, forgot to sort: [[8, 10], [1, 3], [2, 6]]
  correct: [[1, 6], [8, 10]]
  buggy:   [[8, 10]]
bug 3, < instead of <= (touching): [[1, 4], [4, 5]]
  correct: [[1, 5]]
  buggy:   [[1, 4], [4, 5]]
merged once:  [[1, 3], [5, 9], [11, 12]]
merged twice: [[1, 3], [5, 9], [11, 12]]
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Repeated pairwise merging | up to O(n³) | O(n) | rounds of all-pairs checks until nothing changes |
| Sort + one pass | O(n log n) | O(n) | the sort dominates; the list and the output are O(n) |
| Input already sorted | O(n) | O(n) | skip the sort; only the pass remains |

## 8. Edge Cases

- **Empty input** — return an empty list; the loop never runs (\`[]\` in example 1).
- **One interval** — returned unchanged (\`[[5, 7]]\`).
- **Touching intervals** — \`[[1, 4], [4, 5]]\` becomes \`[[1, 5]]\` with \`<=\`; with \`<\` they stay apart (bug 3 in example 2). Ask which one the interviewer wants.
- **Nested intervals** — \`[[1, 10], [2, 3], [4, 5]]\` becomes \`[[1, 10]]\`; this is the case that needs \`max\`.
- **Unsorted input** — \`[[8, 10], [1, 3], [2, 6]]\` becomes \`[[1, 6], [8, 10]]\` only because we sort first (bug 2 shows what happens without the sort).
- **No overlaps at all** — \`[[1, 2], [3, 4], [5, 6]]\` comes back unchanged.
- **Already merged output** — merging the result again changes nothing (example 2 checks this).

📌 **Interview term: Idempotent** — an operation that gives the same result whether you apply it once or many times. Merging an already merged list returns it unchanged.

## Common Pitfalls

- **Comparator \`(a, b) -> a[0] - b[0]\`.** It overflows for values far apart and silently sorts wrong; use \`Integer.compare\` or \`Comparator.comparingInt\`.
- **Forgetting to sort.** \`{{8, 10}, {1, 3}, {2, 6}}\` collapses to \`[[8, 10]]\` (example 2, bug 2).
- **\`last[1] = iv[1]\` instead of \`Math.max\`.** A nested interval shrinks the block: \`{{1, 10}, {2, 3}}\` becomes \`[[1, 3]]\` (bug 1).
- **Adding the caller's inner array to the result and then editing it.** \`merged.add(iv)\` followed by \`last[1] = ...\` changes the input; add \`new int[]{iv[0], iv[1]}\`.
- **Printing an \`int[][]\` with \`toString()\`.** It prints a type and hash code; use \`Arrays.deepToString\` or a small formatter.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Sort by start, then sweep once: extend the last block or start a new one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The overlap test:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iv[0] &lt;= last[1]</code> means overlap (touching counts); then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">last[1] = Math.max(last[1], iv[1])</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why max:</strong> <span style="color:#f0e2c8;">A nested interval like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{2, 3}</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1, 10}</code> must not shrink the block.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n log n) for the sort, O(n) for the sweep and the output.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Sort with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.compare(a[0], b[0])</code>, collect into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List&lt;int[]&gt;</code>, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toArray(new int[0][])</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a[0] - b[0]</code> in the comparator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It can overflow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MIN_VALUE</code> and a positive start the difference wraps around and the order comes out wrong.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is one pass enough after sorting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Starts only increase, so once an interval starts after the current block ends, no later interval can reach back into an earlier block.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you insert one new interval into a merged list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add blocks that end before it, merge every overlapping block into it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max</code>, then add the rest. O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">clone()</code> deep-copy an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int[][]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it copies the outer array only; the inner <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>s are shared. That is fine here because we never modify them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if touching intervals should stay separate?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Change the test to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iv[0] &lt; last[1]</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Interval** | A \`[start, end]\` range; closed means both ends are included |
| **Overlap** | Sorted intervals overlap when \`next.start <= last.end\` |
| **Sort-then-sweep** | Sort by start, then one left-to-right pass |
| **Invariant** | A fact that stays true at every loop step |
| **Idempotent** | Doing it twice gives the same result as doing it once |

---
**Conclusion:** In Java, merging intervals is \`Arrays.sort\` with a comparator, one loop over the sorted \`int[][]\`, and an \`ArrayList<int[]>\` that is turned back into \`int[][]\` at the end. It is O(n log n) because of the sort. The Java-specific traps are the overflow-prone \`a[0] - b[0]\` comparator (use \`Integer.compare\`) and accidentally editing the caller's inner arrays.`,
        examples: [
          {
            label: "Sort + one pass on seven inputs (touching, nested, unsorted, empty)",
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Main {
    // Sort by start, then glue each interval onto the last merged one if they overlap.
    static int[][] merge(int[][] intervals) {
        int[][] sorted = intervals.clone();                         // shallow copy: do not reorder the caller array
        Arrays.sort(sorted, (a, b) -> Integer.compare(a[0], b[0])); // compare, not a[0] - b[0]: no overflow
        List<int[]> merged = new ArrayList<>();
        for (int[] iv : sorted) {
            int[] last = merged.isEmpty() ? null : merged.get(merged.size() - 1);
            if (last != null && iv[0] <= last[1]) {   // overlaps (or touches) the last block
                last[1] = Math.max(last[1], iv[1]);   // max: the new one may be nested inside
            } else {
                merged.add(new int[]{iv[0], iv[1]});  // a gap: start a new block (a fresh array)
            }
        }
        return merged.toArray(new int[0][]);
    }

    static String fmt(int[][] intervals) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < intervals.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append("[").append(intervals[i][0]).append(", ").append(intervals[i][1]).append("]");
        }
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        System.out.println(fmt(merge(new int[][]{{1, 3}, {2, 6}, {8, 10}, {15, 18}}))); // [[1, 6], [8, 10], [15, 18]]
        System.out.println(fmt(merge(new int[][]{{1, 4}, {4, 5}})));                  // [[1, 5]]
        System.out.println(fmt(merge(new int[][]{{1, 10}, {2, 3}, {4, 5}})));         // [[1, 10]]
        System.out.println(fmt(merge(new int[][]{{8, 10}, {1, 3}, {2, 6}})));         // [[1, 6], [8, 10]]
        System.out.println(fmt(merge(new int[][]{{1, 2}, {3, 4}, {5, 6}})));          // [[1, 2], [3, 4], [5, 6]]
        System.out.println(fmt(merge(new int[][]{{5, 7}})));                          // [[5, 7]]
        System.out.println(fmt(merge(new int[][]{})));                                // []
    }
}`,
          },
          {
            label: "The three classic bugs next to the correct merge",
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Main {
    // The merge loop with three switches, so we can watch each classic bug happen.
    static int[][] mergeWith(int[][] intervals, boolean doSort, boolean useMax, boolean touchingMerges) {
        int[][] items = intervals.clone();
        if (doSort) Arrays.sort(items, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> merged = new ArrayList<>();
        for (int[] iv : items) {
            int[] last = merged.isEmpty() ? null : merged.get(merged.size() - 1);
            boolean overlaps = last != null && (touchingMerges ? iv[0] <= last[1] : iv[0] < last[1]);
            if (overlaps) {
                last[1] = useMax ? Math.max(last[1], iv[1]) : iv[1];
            } else {
                merged.add(new int[]{iv[0], iv[1]});
            }
        }
        return merged.toArray(new int[0][]);
    }

    static String fmt(int[][] intervals) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < intervals.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append("[").append(intervals[i][0]).append(", ").append(intervals[i][1]).append("]");
        }
        return sb.append("]").toString();
    }

    static void show(String name, int[][] intervals, boolean doSort, boolean useMax, boolean touchingMerges) {
        System.out.println(name + " " + fmt(intervals));
        System.out.println("  correct: " + fmt(mergeWith(intervals, true, true, true)));
        System.out.println("  buggy:   " + fmt(mergeWith(intervals, doSort, useMax, touchingMerges)));
    }

    public static void main(String[] args) {
        show("bug 1, end = new end instead of max:", new int[][]{{1, 10}, {2, 3}}, true, false, true);
        show("bug 2, forgot to sort:", new int[][]{{8, 10}, {1, 3}, {2, 6}}, false, true, true);
        show("bug 3, < instead of <= (touching):", new int[][]{{1, 4}, {4, 5}}, true, true, false);

        // Merging is idempotent: merging the output again changes nothing.
        int[][] once = mergeWith(new int[][]{{2, 3}, {1, 2}, {6, 9}, {5, 6}, {11, 12}}, true, true, true);
        System.out.println("merged once:  " + fmt(once));
        System.out.println("merged twice: " + fmt(mergeWith(once, true, true, true)));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given a vector of intervals, each a pair {start, end}, in no particular order. Write a C++ function that merges all overlapping intervals and returns them sorted by start."

**What a strong answer should cover:**
- Sort by start, then one pass that either extends the last merged interval or starts a new one.
- Use \`std::max(merged.back()[1], iv[1])\` when extending, because an interval can be nested inside the previous one.
- Complexity: O(n log n) for the sort plus O(n) for the pass; O(n) output.
- Touching intervals: \`<=\` merges them; confirm the expected behaviour.
- C++ details: \`std::sort\` with a lambda that is a strict weak ordering (\`<\`, never \`<=\`), passing by value vs by \`const&\`, and not keeping a reference to \`merged.back()\` across a \`push_back\` (reallocation invalidates it).

**Clarifying questions expected:**
- Do touching intervals count as overlapping?
- May I modify the input vector?

**Code / implementation expected:** Yes — \`std::vector<std::vector<int>> merge(std::vector<std::vector<int>> intervals)\` in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, lists/arrays and sorting in C++.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Your calendar app shows that you are busy 9–11, 10–12, and 14–15, and your manager asks a simple question: "When are you actually busy?" You would not answer with three blocks — you would say "9 to 12, and 2 to 3 in the afternoon". You merged the first two because they overlap.

That is the whole problem: given a pile of \`[start, end]\` ranges in any order, squash every group of overlapping ranges into one range. It shows up everywhere — calendar free/busy views, merging IP address ranges in a firewall, combining highlighted text ranges in an editor, or compacting time windows in a log system.

It is a favourite interview question because it has one big idea (**sort first**) and two or three small details that are easy to get wrong (nested intervals, touching intervals, and changing the caller's data).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do touching intervals like \`[1, 4]\` and \`[4, 5]\` count as overlapping? | It decides \`<=\` versus \`<\` in the overlap test. The common version merges them into \`[1, 5]\`. |
| Is the input already sorted by start? | If yes, you can skip the O(n log n) sort and merge in O(n). |
| Can I modify the input, or must I return a new list? | Sorting in place changes the caller's data; copying costs O(n) memory. |
| Are the intervals closed \`[start, end]\` with \`start <= end\`? | An interval with start > end is invalid input and should be rejected or swapped. |
| How many intervals, and how big are the numbers? | Large n rules out comparing every pair (O(n²)); large values matter for comparator overflow in some languages. |

## 3. The Core Idea

If the intervals are sorted by their start, any interval can only overlap with the **block you are currently building** — never with an older block, because everything older ended before the current block started. So after sorting, one left-to-right pass is enough:

1. Sort the intervals by start.
2. Start the result with the first interval.
3. For each next interval: if its start is \`<=\` the end of the last block, it overlaps — **extend** the last block's end to \`max(lastEnd, nextEnd)\`. Otherwise there is a gap — **start a new block**.

📌 **Interview term: Interval** — a pair \`[start, end]\` describing a continuous range, such as a meeting from 9 to 11. Here both ends are included (a closed interval).

📌 **Interview term: Overlap** — two sorted intervals overlap when the second one starts no later than the first one ends: \`next.start <= last.end\`.

📌 **Interview term: Sort-then-sweep** — a pattern for interval problems: sort by start time, then walk once from left to right keeping only the current block. The sort costs O(n log n) and the sweep O(n).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 340" role="img" aria-label="Intervals 1 to 3 and 2 to 6 overlap and merge into 1 to 6, while 8 to 10 and 15 to 18 stay separate">
  <text class="d-text" x="340" y="22" text-anchor="middle">Sorted input on top, merged result below</text>
  <text class="d-sub" x="20" y="72">input</text>
  <text class="d-sub" x="20" y="262">merged</text>
  <rect class="d-box-muted" x="158" y="50" width="56" height="28" rx="6"/>
  <text class="d-sub" x="186" y="68" text-anchor="middle">[1, 3]</text>
  <rect class="d-box-muted" x="186" y="92" width="112" height="28" rx="6"/>
  <text class="d-sub" x="242" y="110" text-anchor="middle">[2, 6]</text>
  <rect class="d-box-muted" x="354" y="134" width="56" height="28" rx="6"/>
  <text class="d-sub" x="382" y="152" text-anchor="middle">[8, 10]</text>
  <rect class="d-box-muted" x="550" y="176" width="84" height="28" rx="6"/>
  <text class="d-sub" x="592" y="194" text-anchor="middle">[15, 18]</text>
  <rect class="d-box-accent" x="158" y="244" width="140" height="28" rx="6"/>
  <text class="d-text" x="228" y="263" text-anchor="middle">[1, 6]</text>
  <rect class="d-box-accent" x="354" y="244" width="56" height="28" rx="6"/>
  <text class="d-text" x="382" y="263" text-anchor="middle">[8, 10]</text>
  <rect class="d-box-accent" x="550" y="244" width="84" height="28" rx="6"/>
  <text class="d-text" x="592" y="263" text-anchor="middle">[15, 18]</text>
  <path class="d-edge" d="M 130 300 L 634 300"/>
  <path class="d-edge" d="M 130 296 L 130 304"/>
  <text class="d-sub" x="130" y="322" text-anchor="middle">0</text>
  <path class="d-edge" d="M 186 296 L 186 304"/>
  <text class="d-sub" x="186" y="322" text-anchor="middle">2</text>
  <path class="d-edge" d="M 242 296 L 242 304"/>
  <text class="d-sub" x="242" y="322" text-anchor="middle">4</text>
  <path class="d-edge" d="M 298 296 L 298 304"/>
  <text class="d-sub" x="298" y="322" text-anchor="middle">6</text>
  <path class="d-edge" d="M 354 296 L 354 304"/>
  <text class="d-sub" x="354" y="322" text-anchor="middle">8</text>
  <path class="d-edge" d="M 410 296 L 410 304"/>
  <text class="d-sub" x="410" y="322" text-anchor="middle">10</text>
  <path class="d-edge" d="M 466 296 L 466 304"/>
  <text class="d-sub" x="466" y="322" text-anchor="middle">12</text>
  <path class="d-edge" d="M 522 296 L 522 304"/>
  <text class="d-sub" x="522" y="322" text-anchor="middle">14</text>
  <path class="d-edge" d="M 578 296 L 578 304"/>
  <text class="d-sub" x="578" y="322" text-anchor="middle">16</text>
  <path class="d-edge" d="M 634 296 L 634 304"/>
  <text class="d-sub" x="634" y="322" text-anchor="middle">18</text>
  <path class="d-edge-dashed" d="M 298 46 L 298 236"/>
  <path class="d-edge-dashed" d="M 410 46 L 410 236"/>
</svg>

The dashed lines mark the end of each merged block. \`[1, 3]\` and \`[2, 6]\` overlap, so they become \`[1, 6]\`; \`[8, 10]\` starts after 6, so it opens a new block, and so does \`[15, 18]\`.

Every step of the sweep is one of four situations:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="Four cases. Overlap extends the end, a nested interval keeps the old end, touching intervals extend, and a gap starts a new block">
  <defs>
    <marker id="b10q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="350" y="22" text-anchor="middle">Compare next.start with last.end</text>
  <text class="d-text" x="20" y="80">overlap</text>
  <rect class="d-box-muted" x="132" y="50" width="66" height="22" rx="5"/>
  <text class="d-sub" x="350" y="65">last [1, 4]</text>
  <rect class="d-box-accent" x="176" y="80" width="88" height="22" rx="5"/>
  <text class="d-sub" x="350" y="95">next [3, 7]</text>
  <path class="d-edge" d="M 440 76 L 500 76" marker-end="url(#b10q2-arrow)"/>
  <text class="d-text d-accent" x="512" y="81">extend: [1, 7]</text>
  <text class="d-text" x="20" y="150">nested</text>
  <rect class="d-box-muted" x="132" y="120" width="198" height="22" rx="5"/>
  <text class="d-sub" x="350" y="135">last [1, 10]</text>
  <rect class="d-box-accent" x="154" y="150" width="22" height="22" rx="5"/>
  <text class="d-sub" x="350" y="165">next [2, 3]</text>
  <path class="d-edge" d="M 440 146 L 500 146" marker-end="url(#b10q2-arrow)"/>
  <text class="d-text d-accent" x="512" y="151">keep: [1, 10]</text>
  <text class="d-text" x="20" y="220">touching</text>
  <rect class="d-box-muted" x="132" y="190" width="66" height="22" rx="5"/>
  <text class="d-sub" x="350" y="205">last [1, 4]</text>
  <rect class="d-box-accent" x="198" y="220" width="22" height="22" rx="5"/>
  <text class="d-sub" x="350" y="235">next [4, 5]</text>
  <path class="d-edge" d="M 440 216 L 500 216" marker-end="url(#b10q2-arrow)"/>
  <text class="d-text d-accent" x="512" y="221">extend: [1, 5]</text>
  <text class="d-text" x="20" y="290">gap</text>
  <rect class="d-box-muted" x="132" y="260" width="44" height="22" rx="5"/>
  <text class="d-sub" x="350" y="275">last [1, 3]</text>
  <rect class="d-box-accent" x="220" y="290" width="66" height="22" rx="5"/>
  <text class="d-sub" x="350" y="305">next [5, 8]</text>
  <path class="d-edge" d="M 440 286 L 500 286" marker-end="url(#b10q2-arrow)"/>
  <text class="d-text d-accent" x="512" y="291">new block</text>
</svg>

The **nested** row is the reason for \`max\`: \`[2, 3]\` lies completely inside \`[1, 10]\`, so the block must keep its end of 10. Writing \`last.end = next.end\` instead would shrink it to \`[1, 3]\` — example 2 shows exactly that bug.

## 4. Why Sorting Is the Key Step

**Brute force.** Without sorting you could repeatedly look for any two intervals that overlap, merge them, and start again until nothing changes. Each round compares all pairs (O(n²)), and you may need up to n rounds, so it can reach O(n³). It is also easy to get wrong.

**Sorting fixes the order of events.** Once intervals are sorted by start, the starts only go up. If the next interval does not overlap the current block, then no later interval can overlap any *earlier* block either (they all start even later), so earlier blocks are final the moment we leave them. That is why a single pass is correct.

📌 **Interview term: Invariant** — a statement that stays true at every step of a loop. Here: every block in the result except the last one is final and does not overlap anything that comes later.

Sorting is the expensive part, O(n log n); the sweep itself is O(n). For a refresher on how the standard sorts work, see [compare common sorting algorithms](/interview-question/compare-common-sorting-algorithms). The same sort-then-sweep pattern solves [the minimum number of meeting rooms](/interview-question/how-do-you-find-the-minimum-number-of-meeting-rooms-required), and it is a classic example of a [greedy algorithm](/interview-question/what-is-a-greedy-algorithm).

### Dry run on \`[[8, 10], [1, 3], [2, 6]]\`

| Step | Interval | Last block | Test | Result so far |
| :--- | :--- | :--- | :--- | :--- |
| sort | — | — | — | \`[1, 3], [2, 6], [8, 10]\` |
| 1 | \`[1, 3]\` | none | first interval | \`[[1, 3]]\` |
| 2 | \`[2, 6]\` | \`[1, 3]\` | 2 <= 3, overlap | \`[[1, 6]]\` (end = max(3, 6)) |
| 3 | \`[8, 10]\` | \`[1, 6]\` | 8 > 6, gap | \`[[1, 6], [8, 10]]\` |

## 5. The Code in C++

The function takes the vector **by value**, so it gets its own copy to sort and the caller's vector is untouched. If the caller does not need its input afterwards, it can pass it with \`std::move\` and the copy disappears. \`merged.back()\` is a reference to the last element, so \`merged.back()[1] = ...\` edits the result directly.

~~~cpp
Intervals merge(Intervals intervals) {
    std::sort(intervals.begin(), intervals.end(),
              [](const std::vector<int>& a, const std::vector<int>& b) { return a[0] < b[0]; });
    Intervals merged;
    for (const auto& iv : intervals) {
        if (!merged.empty() && iv[0] <= merged.back()[1]) {    // overlaps (or touches) the last block
            merged.back()[1] = std::max(merged.back()[1], iv[1]); // max: the new one may be nested inside
        } else {
            merged.push_back(iv);                               // a gap: start a new block
        }
    }
    return merged;
}
~~~

**What to point out in this code:**

- **The comparator must be a strict weak ordering.** Use \`a[0] < b[0]\`. Writing \`a[0] <= b[0]\` breaks the rules \`std::sort\` relies on, and with equal keys that is undefined behaviour (crashes or out-of-range reads are possible), not just a different order — the LLVM libc++ maintainers state this requirement directly in [review D38830](https://reviews.llvm.org/D38830).
- **Do not hold \`auto& last = merged.back()\` across a \`push_back\`.** When a vector grows past its capacity it moves its elements to new memory, and every old reference and iterator into it becomes invalid ([cppreference: \`std::vector::push_back\`](https://en.cppreference.com/w/cpp/container/vector/push_back)). The code above calls \`merged.back()\` fresh each time, which is always safe.
- \`std::vector<int>\` for a pair of numbers is convenient but each interval is its own heap allocation; in production code \`std::pair<int, int>\` or a small \`struct\` is lighter, and \`std::sort\` on pairs compares \`first\` then \`second\` with no lambda needed.
- \`std::sort\` is not stable, but stability does not matter here: intervals with equal starts always overlap and merge.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13 with \`-std=c++17\`). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 runs the same merge loop with each classic mistake switched on, so you can see the wrong output each bug produces.

**Example 1 — merge on seven inputs, including touching, nested and unsorted intervals** prints:

~~~text
[[1, 6], [8, 10], [15, 18]]
[[1, 5]]
[[1, 10]]
[[1, 6], [8, 10]]
[[1, 2], [3, 4], [5, 6]]
[[5, 7]]
[]
~~~

**Example 2 — the three classic bugs, each shown next to the correct result** prints:

~~~text
bug 1, end = new end instead of max: [[1, 10], [2, 3]]
  correct: [[1, 10]]
  buggy:   [[1, 3]]
bug 2, forgot to sort: [[8, 10], [1, 3], [2, 6]]
  correct: [[1, 6], [8, 10]]
  buggy:   [[8, 10]]
bug 3, < instead of <= (touching): [[1, 4], [4, 5]]
  correct: [[1, 5]]
  buggy:   [[1, 4], [4, 5]]
merged once:  [[1, 3], [5, 9], [11, 12]]
merged twice: [[1, 3], [5, 9], [11, 12]]
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Repeated pairwise merging | up to O(n³) | O(n) | rounds of all-pairs checks until nothing changes |
| Sort + one pass | O(n log n) | O(n) | the sort dominates; the by-value copy and the output are O(n) |
| Input already sorted | O(n) | O(n) | skip the sort; only the pass remains |

## 8. Edge Cases

- **Empty input** — return an empty list; the loop never runs (\`[]\` in example 1).
- **One interval** — returned unchanged (\`[[5, 7]]\`).
- **Touching intervals** — \`[[1, 4], [4, 5]]\` becomes \`[[1, 5]]\` with \`<=\`; with \`<\` they stay apart (bug 3 in example 2). Ask which one the interviewer wants.
- **Nested intervals** — \`[[1, 10], [2, 3], [4, 5]]\` becomes \`[[1, 10]]\`; this is the case that needs \`max\`.
- **Unsorted input** — \`[[8, 10], [1, 3], [2, 6]]\` becomes \`[[1, 6], [8, 10]]\` only because we sort first (bug 2 shows what happens without the sort).
- **No overlaps at all** — \`[[1, 2], [3, 4], [5, 6]]\` comes back unchanged.
- **Already merged output** — merging the result again changes nothing (example 2 checks this).

📌 **Interview term: Idempotent** — an operation that gives the same result whether you apply it once or many times. Merging an already merged list returns it unchanged.

## Common Pitfalls

- **A \`<=\` comparator.** \`std::sort\` needs a strict weak ordering; \`<=\` is undefined behaviour when keys are equal.
- **Forgetting to sort.** \`{{8, 10}, {1, 3}, {2, 6}}\` collapses to \`[[8, 10]]\` (example 2, bug 2).
- **\`merged.back()[1] = iv[1]\` instead of \`std::max\`.** A nested interval shrinks the block: \`{{1, 10}, {2, 3}}\` becomes \`[[1, 3]]\` (bug 1).
- **Keeping a reference to \`merged.back()\` and then calling \`push_back\`.** Reallocation invalidates the reference.
- **Reading \`intervals[0]\` without checking \`empty()\`.** \`operator[]\` has no bounds check, so that is undefined behaviour on an empty vector.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Sort by start, then sweep once: extend the last block or start a new one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The overlap test:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iv[0] &lt;= merged.back()[1]</code> means overlap; then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">merged.back()[1] = std::max(merged.back()[1], iv[1])</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why max:</strong> <span style="color:#f0e2c8;">A nested interval like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{2, 3}</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1, 10}</code> must not shrink the block.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n log n) for the sort, O(n) for the sweep and the output.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Comparator <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[0] &lt; b[0]</code> (strict, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>), take the input by value or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::move</code> it in, and do not keep references into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">merged</code> across <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is one pass enough after sorting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Starts only increase, so once an interval starts after the current block ends, no later interval can reach back into an earlier block.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;=</code> in the sort comparator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> requires a strict weak ordering. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> says an element is less than itself, which is undefined behaviour.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you insert one new interval into a merged list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Copy blocks that end before it, merge every overlapping block into it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::min</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::max</code>, then copy the rest. O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::pair&lt;int, int&gt;</code> be better than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes for performance: no heap allocation per interval, and pairs already compare by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">second</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if touching intervals should stay separate?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Change the test to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iv[0] &lt; merged.back()[1]</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Interval** | A \`[start, end]\` range; closed means both ends are included |
| **Overlap** | Sorted intervals overlap when \`next.start <= last.end\` |
| **Sort-then-sweep** | Sort by start, then one left-to-right pass |
| **Invariant** | A fact that stays true at every loop step |
| **Idempotent** | Doing it twice gives the same result as doing it once |

---
**Conclusion:** In C++, merging intervals is \`std::sort\` with a strict \`<\` comparator followed by one loop that extends \`merged.back()\` with \`std::max\` or pushes a new block. It is O(n log n) because of the sort. The C++-specific care points are the strict-weak-ordering rule for comparators, not holding references into a vector that may reallocate, and choosing by-value or \`const&\` parameters on purpose.`,
        examples: [
          {
            label: "Sort + one pass on seven inputs (touching, nested, unsorted, empty)",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

using Intervals = std::vector<std::vector<int>>;

// Sort by start, then glue each interval onto the last merged one if they overlap.
// Taking the vector by value gives us our own copy to sort.
Intervals merge(Intervals intervals) {
    std::sort(intervals.begin(), intervals.end(),
              [](const std::vector<int>& a, const std::vector<int>& b) { return a[0] < b[0]; });
    Intervals merged;
    for (const auto& iv : intervals) {
        if (!merged.empty() && iv[0] <= merged.back()[1]) {    // overlaps (or touches) the last block
            merged.back()[1] = std::max(merged.back()[1], iv[1]); // max: the new one may be nested inside
        } else {
            merged.push_back(iv);                               // a gap: start a new block
        }
    }
    return merged;
}

std::string fmt(const Intervals& intervals) {
    std::string s = "[";
    for (size_t i = 0; i < intervals.size(); i++) {
        if (i > 0) s += ", ";
        s += "[" + std::to_string(intervals[i][0]) + ", " + std::to_string(intervals[i][1]) + "]";
    }
    return s + "]";
}

int main() {
    std::cout << fmt(merge({{1, 3}, {2, 6}, {8, 10}, {15, 18}})) << "\\n"; // [[1, 6], [8, 10], [15, 18]]
    std::cout << fmt(merge({{1, 4}, {4, 5}})) << "\\n";                  // [[1, 5]]
    std::cout << fmt(merge({{1, 10}, {2, 3}, {4, 5}})) << "\\n";         // [[1, 10]]
    std::cout << fmt(merge({{8, 10}, {1, 3}, {2, 6}})) << "\\n";         // [[1, 6], [8, 10]]
    std::cout << fmt(merge({{1, 2}, {3, 4}, {5, 6}})) << "\\n";          // [[1, 2], [3, 4], [5, 6]]
    std::cout << fmt(merge({{5, 7}})) << "\\n";                          // [[5, 7]]
    std::cout << fmt(merge({})) << "\\n";                                // []
    return 0;
}`,
          },
          {
            label: "The three classic bugs next to the correct merge",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

using Intervals = std::vector<std::vector<int>>;

// The merge loop with three switches, so we can watch each classic bug happen.
Intervals mergeWith(Intervals items, bool doSort, bool useMax, bool touchingMerges) {
    if (doSort)
        std::sort(items.begin(), items.end(),
                  [](const std::vector<int>& a, const std::vector<int>& b) { return a[0] < b[0]; });
    Intervals merged;
    for (const auto& iv : items) {
        bool overlaps = !merged.empty() &&
                        (touchingMerges ? iv[0] <= merged.back()[1] : iv[0] < merged.back()[1]);
        if (overlaps) {
            merged.back()[1] = useMax ? std::max(merged.back()[1], iv[1]) : iv[1];
        } else {
            merged.push_back(iv);
        }
    }
    return merged;
}

std::string fmt(const Intervals& intervals) {
    std::string s = "[";
    for (size_t i = 0; i < intervals.size(); i++) {
        if (i > 0) s += ", ";
        s += "[" + std::to_string(intervals[i][0]) + ", " + std::to_string(intervals[i][1]) + "]";
    }
    return s + "]";
}

void show(const std::string& name, const Intervals& intervals, bool doSort, bool useMax, bool touchingMerges) {
    std::cout << name << " " << fmt(intervals) << "\\n";
    std::cout << "  correct: " << fmt(mergeWith(intervals, true, true, true)) << "\\n";
    std::cout << "  buggy:   " << fmt(mergeWith(intervals, doSort, useMax, touchingMerges)) << "\\n";
}

int main() {
    show("bug 1, end = new end instead of max:", {{1, 10}, {2, 3}}, true, false, true);
    show("bug 2, forgot to sort:", {{8, 10}, {1, 3}, {2, 6}}, false, true, true);
    show("bug 3, < instead of <= (touching):", {{1, 4}, {4, 5}}, true, true, false);

    // Merging is idempotent: merging the output again changes nothing.
    Intervals once = mergeWith({{2, 3}, {1, 2}, {6, 9}, {5, 6}, {11, 12}}, true, true, true);
    std::cout << "merged once:  " << fmt(once) << "\\n";
    std::cout << "merged twice: " << fmt(mergeWith(once, true, true, true)) << "\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you find the minimum number of meeting rooms required?",
    difficulty: "medium",
    seoDescription: "Minimum meeting rooms = peak overlap: sort by start with a min-heap of end times, or sweep events. Verified Python, JavaScript, Java, C++ code.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a list of meetings as [start, end] pairs, write a Python function that returns the minimum number of conference rooms needed so that no two overlapping meetings share a room."

**What a strong answer should cover:**
- The answer is the maximum number of meetings running at the same time.
- Sort by start, keep a min-heap of end times; reuse the room on top when its end is <= the new start, otherwise open a room. O(n log n) time, O(n) space.
- The sweep-line alternative: +1/−1 events sorted by time, ends before starts on ties.
- Edge cases: back-to-back meetings share a room, identical meetings need separate rooms, empty input is 0.
- Python details: \`heapq\` is a min-heap on a plain list (\`ends[0]\` is the smallest), \`heapq.heapreplace\` pops and pushes in one call, and \`sorted()\` on tuples orders ends before starts when you encode them as (time, -1) and (time, +1).

**Clarifying questions expected:**
- Can a meeting ending at 10 share a room with one starting at 10?
- Is the input already sorted?

**Code / implementation expected:** Yes — a function \`min_meeting_rooms(meetings) -> int\` using \`heapq\`, in Python 3.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need sorting and arrays in Python; heaps are explained here.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You run a small office with a list of today's meetings: one from 0:00 to 0:30, one from 0:05 to 0:10, one from 0:15 to 0:20 (minutes after nine, say). How many meeting rooms do you need so that nobody is left standing in the corridor?

You could give every meeting its own room — three rooms — but that is wasteful: the 0:05 meeting is over by 0:10, so its room is free again for the 0:15 meeting. The real question is: **at the busiest moment of the day, how many meetings are happening at the same time?** Here that is two (at 0:05 and again at 0:15), so two rooms are enough.

The same question appears as "how many servers do I need for these jobs", "how many gates for these flights" or "how many threads for these tasks". Interviewers like it because there are two clean solutions — a min-heap and a sweep — and each tests a different tool.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| If one meeting ends at 10 and another starts at 10, can they share a room? | Usually yes (half-open intervals \`[start, end)\`). It decides \`<=\` versus \`<\` in the reuse test and the order of events at equal times. |
| Is the input sorted by start time? | If yes, the first sort can be skipped (the heap is still needed). |
| Do you need just the number, or also which room each meeting gets? | The heap version can be extended to hand out room ids. |
| How many meetings, and how large are the times? | n up to 10^4 or 10^5 rules out checking every time unit; large times rule out a counting array indexed by time. |
| Can a meeting have zero length (start equals end)? | It needs no room at all if ends are processed before starts; worth agreeing on. |

## 3. The Core Idea

The number of rooms you need is the **maximum number of meetings that overlap at any single moment**. Two ways to compute it:

**A. Sort by start and keep a min-heap of end times.** Go through the meetings in order of start time. Keep the end time of every room that is in use in a min-heap, so the room that frees up *first* is always on top. For each new meeting: if the earliest end time is \`<=\` the new start, that room is free — reuse it (remove that end time, add the new one). Otherwise every room is still busy — open a new room (add the new end time). The heap's size at the end is the number of rooms.

**B. Sweep through time.** Turn every meeting into two events: "+1 at its start" and "−1 at its end". Sort all events by time and walk through them, keeping a running count of rooms in use. The largest count you ever see is the answer.

📌 **Interview term: Min-heap (priority queue)** — a structure that always gives you its smallest element in O(1) and lets you add or remove elements in O(log n). See [what is a heap / priority queue](/interview-question/what-is-a-heap-priority-queue).

📌 **Interview term: Sweep line** — a technique that turns intervals into start and end events, sorts them by time, and processes them in order while keeping a running count — like moving a vertical line across a timeline.

📌 **Interview term: Maximum overlap (peak concurrency)** — the largest number of intervals that contain the same point in time. For meeting rooms it equals the minimum number of rooms.

<svg class="iq-diagram" width="100%" viewBox="0 0 740 290" role="img" aria-label="Room 1 holds the meeting from 0 to 30. Room 2 holds 5 to 10 and is then reused for 15 to 20. At most two rooms are in use at once">
  <text class="d-text" x="370" y="22" text-anchor="middle">Meetings [0, 30], [5, 10], [15, 20]</text>
  <text class="d-text" x="20" y="72">room 1</text>
  <text class="d-text" x="20" y="132">room 2</text>
  <text class="d-sub" x="20" y="202">in use</text>
  <rect class="d-box-muted" x="130" y="52" width="480" height="30" rx="6"/>
  <text class="d-sub" x="370" y="72" text-anchor="middle">[0, 30]</text>
  <rect class="d-box-accent" x="210" y="112" width="80" height="30" rx="6"/>
  <text class="d-sub" x="250" y="132" text-anchor="middle">[5, 10]</text>
  <rect class="d-box-accent" x="370" y="112" width="80" height="30" rx="6"/>
  <text class="d-sub" x="410" y="132" text-anchor="middle">[15, 20]</text>
  <rect class="d-box" x="132" y="182" width="76" height="30" rx="4"/>
  <text class="d-text" x="170" y="202" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="212" y="182" width="76" height="30" rx="4"/>
  <text class="d-text" x="250" y="202" text-anchor="middle">2</text>
  <rect class="d-box" x="292" y="182" width="76" height="30" rx="4"/>
  <text class="d-text" x="330" y="202" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="372" y="182" width="76" height="30" rx="4"/>
  <text class="d-text" x="410" y="202" text-anchor="middle">2</text>
  <rect class="d-box" x="452" y="182" width="156" height="30" rx="4"/>
  <text class="d-text" x="530" y="202" text-anchor="middle">1</text>
  <path class="d-edge" d="M 130 250 L 610 250"/>
  <path class="d-edge" d="M 130 246 L 130 254"/>
  <text class="d-sub" x="130" y="272" text-anchor="middle">0</text>
  <path class="d-edge" d="M 210 246 L 210 254"/>
  <text class="d-sub" x="210" y="272" text-anchor="middle">5</text>
  <path class="d-edge" d="M 290 246 L 290 254"/>
  <text class="d-sub" x="290" y="272" text-anchor="middle">10</text>
  <path class="d-edge" d="M 370 246 L 370 254"/>
  <text class="d-sub" x="370" y="272" text-anchor="middle">15</text>
  <path class="d-edge" d="M 450 246 L 450 254"/>
  <text class="d-sub" x="450" y="272" text-anchor="middle">20</text>
  <path class="d-edge" d="M 530 246 L 530 254"/>
  <text class="d-sub" x="530" y="272" text-anchor="middle">25</text>
  <path class="d-edge" d="M 610 246 L 610 254"/>
  <text class="d-sub" x="610" y="272" text-anchor="middle">30</text>
</svg>

The bottom strip counts meetings in progress in each time slice. It never goes above 2, and room 2 is reused once the 5–10 meeting is over.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 170" role="img" aria-label="The min heap of end times after each meeting. It holds 30, then 10 and 30, then 20 and 30. Its final size, 2, is the answer">
  <defs>
    <marker id="b10q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="190" height="130" rx="10"/>
  <text class="d-text" x="115" y="48" text-anchor="middle">meeting [0, 30]</text>
  <text class="d-sub" x="115" y="76" text-anchor="middle">heap empty</text>
  <text class="d-sub" x="115" y="100" text-anchor="middle">push 30</text>
  <text class="d-text" x="115" y="132" text-anchor="middle">heap {30}</text>
  <path class="d-edge" d="M 214 85 L 254 85" marker-end="url(#b10q3-arrow)"/>
  <rect class="d-box" x="260" y="20" width="190" height="130" rx="10"/>
  <text class="d-text" x="355" y="48" text-anchor="middle">meeting [5, 10]</text>
  <text class="d-sub" x="355" y="76" text-anchor="middle">min end 30 > 5</text>
  <text class="d-sub" x="355" y="100" text-anchor="middle">push 10</text>
  <text class="d-text" x="355" y="132" text-anchor="middle">heap {10, 30}</text>
  <path class="d-edge" d="M 454 85 L 494 85" marker-end="url(#b10q3-arrow)"/>
  <rect class="d-box-accent" x="500" y="20" width="190" height="130" rx="10"/>
  <text class="d-text" x="595" y="48" text-anchor="middle">meeting [15, 20]</text>
  <text class="d-sub" x="595" y="76" text-anchor="middle">min end 10 &lt;= 15</text>
  <text class="d-sub" x="595" y="100" text-anchor="middle">replace 10 by 20</text>
  <text class="d-text" x="595" y="132" text-anchor="middle">heap {20, 30}</text>
</svg>

When \`[15, 20]\` arrives, the earliest end in the heap is 10, which is not after 15, so that room is free: its 10 is replaced by 20. The heap never needed a third entry, so the answer is 2.

## 4. From Brute Force to O(n log n)

**Brute force.** The busiest moment always happens at some meeting's start time (the count only goes up at starts). So for every meeting's start time, count how many meetings are running at that moment (\`start <= t < end\`) and keep the maximum. That is O(n²) — example 2 uses it as a reference to check the fast versions.

**Why the heap is right.** When a meeting starts, the only room that matters is the one that becomes free earliest: if even that one is still busy, all of them are, so a new room is required. If it is free, reusing it is never worse than opening a new room. The heap gives us "earliest end" in O(1) and updates in O(log n). Because we either replace the top or add one end, the heap size only grows when a new room is truly needed, so its final size is the peak.

**Why the sweep is right.** Rooms in use change only at starts (+1) and ends (−1). Processing events in time order and remembering the highest running count is exactly "maximum overlap". The one subtle point is **ties**: when one meeting ends at 10 and another starts at 10, the end must be processed first, otherwise the count briefly shows one room too many.

📌 **Interview term: Half-open interval** — an interval \`[start, end)\` that includes its start but not its end. A meeting \`[5, 10)\` and a meeting \`[10, 15)\` do not overlap, so they can share a room.

A two-pointer version of the sweep sorts the start times and the end times as two separate arrays and walks them together: for each start, if the earliest unused end is \`<=\` it, a room was freed (advance the end pointer); otherwise open a room. It needs no heap, only two sorts — handy in languages without a built-in heap. The first steps of this problem (sort by start, compare with an end) are shared with [merging overlapping intervals](/interview-question/how-do-you-merge-overlapping-intervals).

## 5. The Code in Python

Python's \`heapq\` module turns an ordinary list into a binary min-heap. Its own documentation (the module docstring) states that "a[0] is always its smallest element", and it describes \`heapreplace\` as: "Pop and return the current smallest value, and add the new item." That is exactly the "reuse the room that frees up first" step, done in one O(log n) call instead of a \`heappop\` plus a \`heappush\`.

~~~python
def min_meeting_rooms(meetings):
    """Sort by start; a min-heap holds the end time of every room in use."""
    ends = []  # heapq keeps the smallest end time at ends[0]
    for start, end in sorted(meetings):
        if ends and ends[0] <= start:  # the room that frees up first is free by now
            heapq.heapreplace(ends, end)  # reuse it: pop that end, push ours, in one step
        else:
            heapq.heappush(ends, end)     # every room is busy: open a new one
    return len(ends)  # the heap never shrinks, so its size is the peak
~~~

**What to point out in this code:**

- \`sorted(meetings)\` sorts the \`[start, end]\` lists by start, then by end; that is enough (ties on start can be in any order for this algorithm).
- \`ends and ends[0] <= start\` — the \`ends and\` part guards the first meeting, where \`ends[0]\` would raise \`IndexError\` on an empty list.
- \`heapq\` only offers a **min**-heap. That is exactly what we need here. If you ever need a max-heap, the usual trick is to push negated values.
- The sweep version in example 2 encodes events as tuples \`(time, +1)\` and \`(time, -1)\`. Python compares tuples element by element, so at equal times \`-1\` (an end) sorts before \`+1\` (a start) — the tie rule comes for free.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. In example 2 the 500 schedules come from a small deterministic random generator (MINSTD), so every language sees the same meetings; the sweep, the two-pointer walk and the O(n²) brute force never disagreed.

**Example 1 — the min-heap solution on seven schedules** prints:

~~~text
2
1
1
4
3
1
0
~~~

**Example 2 — the chronological sweep with a trace, cross-checked against two other methods on 500 random schedules** prints:

~~~text
sweep over [[0, 30], [5, 10], [15, 20]]
  t=0 start -> rooms in use 1
  t=5 start -> rooms in use 2
  t=10 end   -> rooms in use 1
  t=15 start -> rooms in use 2
  t=20 end   -> rooms in use 1
  t=30 end   -> rooms in use 0
  peak = 2
sweep over [[1, 5], [5, 10]] (end at 5 is processed before start at 5)
  t=1 start -> rooms in use 1
  t=5 end   -> rooms in use 0
  t=5 start -> rooms in use 1
  t=10 end   -> rooms in use 0
  peak = 1
500 random schedules: mismatches 0, sum of answers 1233
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (count at every start) | O(n²) | O(1) | n start times, n meetings checked for each |
| Sort + min-heap | O(n log n) | O(n) | the sort, then one heap operation of O(log n) per meeting; the heap can hold n end times |
| Sweep over 2n events | O(n log n) | O(n) | sorting 2n events dominates; one pass to count |
| Two sorted arrays | O(n log n) | O(n) | two sorts plus one linear walk |

## 8. Edge Cases

- **No meetings** — 0 rooms (\`[]\` in example 1).
- **One meeting** — 1 room.
- **Back-to-back meetings** — \`[[1, 5], [5, 10]]\` needs 1 room when ends free the room at the same instant; the trace in example 2 shows the end at 5 processed before the start at 5.
- **Identical meetings** — \`[[1, 2], [1, 2], [1, 2]]\` needs 3 rooms.
- **Unsorted input** — \`[[7, 10], [2, 4]]\` must be sorted by start first; the answer is 1.
- **Busy middle** — \`[[1, 10], [2, 7], [3, 19], [8, 12], [10, 20], [11, 30]]\` needs 4 rooms: at time 11 the meetings \`[3, 19]\`, \`[8, 12]\`, \`[10, 20]\` and \`[11, 30]\` are all running.

## Common Pitfalls

- **Sorting by end time instead of start time.** The heap argument needs meetings in start order.
- **\`<\` instead of \`<=\` in the reuse test.** Back-to-back meetings \`[1, 5]\`, \`[5, 10]\` would need 2 rooms instead of 1.
- **Reading \`ends[0]\` on an empty heap.** It raises \`IndexError\`; check \`ends\` first.
- **Using \`heappop\` and forgetting to push the new end.** Every meeting must leave its end time in the heap, whether it reused a room or opened one.
- **Sweep with the wrong tie order.** Encoding a start as \`(t, 0)\` and an end as \`(t, 1)\` processes starts first and over-counts back-to-back meetings.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The answer:</strong> <span style="color:#f0e2c8;">The number of rooms is the maximum number of meetings running at the same moment.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap method:</strong> <span style="color:#f0e2c8;">Sort by start; keep end times in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> min-heap; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ends[0] &lt;= start</code> reuse it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapreplace</code>, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heappush</code> a new room.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it works:</strong> <span style="color:#f0e2c8;">The room that frees up earliest is the only one worth checking; if it is busy, all rooms are busy.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n log n) time for the sort and heap operations, O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Alternative:</strong> <span style="color:#f0e2c8;">Sweep: events <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(start, +1)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(end, -1)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted()</code> puts ends first on ties, track the peak running count.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;=</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Meetings are half-open: one ending at 5 frees the room for one starting at 5. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> you would count <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 5]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[5, 10]</code> as needing two rooms.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you also return which room each meeting gets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(end, room_id)</code> tuples in the heap; on reuse take the room id from the popped tuple, otherwise create a new id.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the meetings arrive one by one, not all at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If they arrive in start order, the heap version works online. If not, you need an ordered structure keyed by time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a version without a heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: sort starts and ends separately and walk both lists; a room frees up whenever the next end is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> the next start.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get a max-heap in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push negated values into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> and negate again when you read them.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Min-heap (priority queue)** | Smallest element on top; push/pop in O(log n) |
| **Sweep line** | Process sorted start/end events with a running count |
| **Maximum overlap (peak concurrency)** | Most intervals that contain one point in time |
| **Half-open interval** | \`[start, end)\`: includes start, excludes end |

---
**Conclusion:** In Python, the minimum number of meeting rooms is the peak number of overlapping meetings, and \`heapq\` makes the classic solution short: sort by start, keep the end times in a min-heap, and use \`heapreplace\` whenever the earliest-ending room is free. It runs in O(n log n) time and O(n) space. The sweep-line version gets its tie rule for free from Python's tuple ordering, and the 500 random schedules in example 2 confirm that the sweep, the two-pointer walk and the brute force agree.`,
        examples: [
          {
            label: "Sort by start + min-heap of end times (7 schedules)",
            code: `import heapq


def min_meeting_rooms(meetings):
    """Sort by start; a min-heap holds the end time of every room in use."""
    ends = []  # heapq keeps the smallest end time at ends[0]
    for start, end in sorted(meetings):
        if ends and ends[0] <= start:  # the room that frees up first is free by now
            heapq.heapreplace(ends, end)  # reuse it: pop that end, push ours, in one step
        else:
            heapq.heappush(ends, end)     # every room is busy: open a new one
    return len(ends)  # the heap never shrinks, so its size is the peak


print(min_meeting_rooms([[0, 30], [5, 10], [15, 20]]))  # 2
print(min_meeting_rooms([[7, 10], [2, 4]]))  # 1
print(min_meeting_rooms([[1, 5], [5, 10]]))  # 1
print(min_meeting_rooms([[1, 10], [2, 7], [3, 19], [8, 12], [10, 20], [11, 30]]))  # 4
print(min_meeting_rooms([[1, 2], [1, 2], [1, 2]]))  # 3
print(min_meeting_rooms([[9, 12]]))  # 1
print(min_meeting_rooms([]))  # 0`,
          },
          {
            label: "Sweep line trace + random cross-check of three methods",
            code: `def sweep(meetings, trace=False):
    """Chronological sweep: +1 at every start, -1 at every end; ends sort first on ties."""
    events = []
    for start, end in meetings:
        events.append((start, 1))
        events.append((end, -1))
    events.sort()  # tuples compare by time, then delta: -1 (end) before +1 (start)
    in_use = peak = 0
    for t, delta in events:
        in_use += delta
        peak = max(peak, in_use)
        if trace:
            print("  t=" + str(t) + " " + ("start" if delta == 1 else "end  ") + " -> rooms in use " + str(in_use))
    return peak


def two_pointers(meetings):
    """Sorted starts and sorted ends; a room frees up whenever the next end <= the next start."""
    starts = sorted(s for s, _ in meetings)
    ends = sorted(e for _, e in meetings)
    rooms = j = 0
    for s in starts:
        if ends[j] <= s:
            j += 1        # someone left before we arrived: take their room
        else:
            rooms += 1    # nobody left yet: a new room
    return rooms


def brute_force(meetings):
    """Peak overlap happens at some start time: count meetings live at each start."""
    return max((sum(1 for s, e in meetings if s <= t < e) for t, _ in meetings), default=0)


print("sweep over [[0, 30], [5, 10], [15, 20]]")
print("  peak = " + str(sweep([[0, 30], [5, 10], [15, 20]], True)))
print("sweep over [[1, 5], [5, 10]] (end at 5 is processed before start at 5)")
print("  peak = " + str(sweep([[1, 5], [5, 10]], True)))

seed, mismatches, total = 7, 0, 0
for _ in range(500):
    meetings = []
    seed = seed * 48271 % 2147483647
    for _ in range(seed % 12):
        seed = seed * 48271 % 2147483647
        start = seed % 50
        seed = seed * 48271 % 2147483647
        meetings.append([start, start + 1 + seed % 15])
    a, b, c = sweep(meetings), two_pointers(meetings), brute_force(meetings)
    total += a
    if a != b or b != c:
        mismatches += 1
print("500 random schedules: mismatches " + str(mismatches) + ", sum of answers " + str(total))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an array of meetings as [start, end] pairs, write a JavaScript function that returns the minimum number of conference rooms needed so that no two overlapping meetings share a room."

**What a strong answer should cover:**
- The answer is the maximum number of meetings running at the same time.
- Sort by start, keep a min-heap of end times; reuse the top room when its end is <= the new start. O(n log n) time, O(n) space.
- The heap-free alternatives: a +1/−1 event sweep, or two sorted arrays of starts and ends with two pointers.
- Edge cases: back-to-back meetings share a room, identical meetings need separate rooms, empty input is 0.
- JavaScript details: there is no built-in heap, so either write a small binary heap or use the two-sorted-arrays version; and always sort numbers with a comparator, since \`[30, 5, 100, 20].sort()\` sorts them as strings.

**Clarifying questions expected:**
- Can a meeting ending at 10 share a room with one starting at 10?
- Is the input already sorted?

**Code / implementation expected:** Yes — a function \`minMeetingRooms(meetings)\` in JavaScript; a small heap class or the two-pointer sweep.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need sorting and arrays in JavaScript; heaps are explained here.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You run a small office with a list of today's meetings: one from 0:00 to 0:30, one from 0:05 to 0:10, one from 0:15 to 0:20 (minutes after nine, say). How many meeting rooms do you need so that nobody is left standing in the corridor?

You could give every meeting its own room — three rooms — but that is wasteful: the 0:05 meeting is over by 0:10, so its room is free again for the 0:15 meeting. The real question is: **at the busiest moment of the day, how many meetings are happening at the same time?** Here that is two (at 0:05 and again at 0:15), so two rooms are enough.

The same question appears as "how many servers do I need for these jobs", "how many gates for these flights" or "how many threads for these tasks". Interviewers like it because there are two clean solutions — a min-heap and a sweep — and each tests a different tool.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| If one meeting ends at 10 and another starts at 10, can they share a room? | Usually yes (half-open intervals \`[start, end)\`). It decides \`<=\` versus \`<\` in the reuse test and the order of events at equal times. |
| Is the input sorted by start time? | If yes, the first sort can be skipped (the heap is still needed). |
| Do you need just the number, or also which room each meeting gets? | The heap version can be extended to hand out room ids. |
| How many meetings, and how large are the times? | n up to 10^4 or 10^5 rules out checking every time unit; large times rule out a counting array indexed by time. |
| Can a meeting have zero length (start equals end)? | It needs no room at all if ends are processed before starts; worth agreeing on. |

## 3. The Core Idea

The number of rooms you need is the **maximum number of meetings that overlap at any single moment**. Two ways to compute it:

**A. Sort by start and keep a min-heap of end times.** Go through the meetings in order of start time. Keep the end time of every room that is in use in a min-heap, so the room that frees up *first* is always on top. For each new meeting: if the earliest end time is \`<=\` the new start, that room is free — reuse it (remove that end time, add the new one). Otherwise every room is still busy — open a new room (add the new end time). The heap's size at the end is the number of rooms.

**B. Sweep through time.** Turn every meeting into two events: "+1 at its start" and "−1 at its end". Sort all events by time and walk through them, keeping a running count of rooms in use. The largest count you ever see is the answer.

📌 **Interview term: Min-heap (priority queue)** — a structure that always gives you its smallest element in O(1) and lets you add or remove elements in O(log n). See [what is a heap / priority queue](/interview-question/what-is-a-heap-priority-queue).

📌 **Interview term: Sweep line** — a technique that turns intervals into start and end events, sorts them by time, and processes them in order while keeping a running count — like moving a vertical line across a timeline.

📌 **Interview term: Maximum overlap (peak concurrency)** — the largest number of intervals that contain the same point in time. For meeting rooms it equals the minimum number of rooms.

<svg class="iq-diagram" width="100%" viewBox="0 0 740 290" role="img" aria-label="Room 1 holds the meeting from 0 to 30. Room 2 holds 5 to 10 and is then reused for 15 to 20. At most two rooms are in use at once">
  <text class="d-text" x="370" y="22" text-anchor="middle">Meetings [0, 30], [5, 10], [15, 20]</text>
  <text class="d-text" x="20" y="72">room 1</text>
  <text class="d-text" x="20" y="132">room 2</text>
  <text class="d-sub" x="20" y="202">in use</text>
  <rect class="d-box-muted" x="130" y="52" width="480" height="30" rx="6"/>
  <text class="d-sub" x="370" y="72" text-anchor="middle">[0, 30]</text>
  <rect class="d-box-accent" x="210" y="112" width="80" height="30" rx="6"/>
  <text class="d-sub" x="250" y="132" text-anchor="middle">[5, 10]</text>
  <rect class="d-box-accent" x="370" y="112" width="80" height="30" rx="6"/>
  <text class="d-sub" x="410" y="132" text-anchor="middle">[15, 20]</text>
  <rect class="d-box" x="132" y="182" width="76" height="30" rx="4"/>
  <text class="d-text" x="170" y="202" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="212" y="182" width="76" height="30" rx="4"/>
  <text class="d-text" x="250" y="202" text-anchor="middle">2</text>
  <rect class="d-box" x="292" y="182" width="76" height="30" rx="4"/>
  <text class="d-text" x="330" y="202" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="372" y="182" width="76" height="30" rx="4"/>
  <text class="d-text" x="410" y="202" text-anchor="middle">2</text>
  <rect class="d-box" x="452" y="182" width="156" height="30" rx="4"/>
  <text class="d-text" x="530" y="202" text-anchor="middle">1</text>
  <path class="d-edge" d="M 130 250 L 610 250"/>
  <path class="d-edge" d="M 130 246 L 130 254"/>
  <text class="d-sub" x="130" y="272" text-anchor="middle">0</text>
  <path class="d-edge" d="M 210 246 L 210 254"/>
  <text class="d-sub" x="210" y="272" text-anchor="middle">5</text>
  <path class="d-edge" d="M 290 246 L 290 254"/>
  <text class="d-sub" x="290" y="272" text-anchor="middle">10</text>
  <path class="d-edge" d="M 370 246 L 370 254"/>
  <text class="d-sub" x="370" y="272" text-anchor="middle">15</text>
  <path class="d-edge" d="M 450 246 L 450 254"/>
  <text class="d-sub" x="450" y="272" text-anchor="middle">20</text>
  <path class="d-edge" d="M 530 246 L 530 254"/>
  <text class="d-sub" x="530" y="272" text-anchor="middle">25</text>
  <path class="d-edge" d="M 610 246 L 610 254"/>
  <text class="d-sub" x="610" y="272" text-anchor="middle">30</text>
</svg>

The bottom strip counts meetings in progress in each time slice. It never goes above 2, and room 2 is reused once the 5–10 meeting is over.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 170" role="img" aria-label="The min heap of end times after each meeting. It holds 30, then 10 and 30, then 20 and 30. Its final size, 2, is the answer">
  <defs>
    <marker id="b10q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="190" height="130" rx="10"/>
  <text class="d-text" x="115" y="48" text-anchor="middle">meeting [0, 30]</text>
  <text class="d-sub" x="115" y="76" text-anchor="middle">heap empty</text>
  <text class="d-sub" x="115" y="100" text-anchor="middle">push 30</text>
  <text class="d-text" x="115" y="132" text-anchor="middle">heap {30}</text>
  <path class="d-edge" d="M 214 85 L 254 85" marker-end="url(#b10q3-arrow)"/>
  <rect class="d-box" x="260" y="20" width="190" height="130" rx="10"/>
  <text class="d-text" x="355" y="48" text-anchor="middle">meeting [5, 10]</text>
  <text class="d-sub" x="355" y="76" text-anchor="middle">min end 30 > 5</text>
  <text class="d-sub" x="355" y="100" text-anchor="middle">push 10</text>
  <text class="d-text" x="355" y="132" text-anchor="middle">heap {10, 30}</text>
  <path class="d-edge" d="M 454 85 L 494 85" marker-end="url(#b10q3-arrow)"/>
  <rect class="d-box-accent" x="500" y="20" width="190" height="130" rx="10"/>
  <text class="d-text" x="595" y="48" text-anchor="middle">meeting [15, 20]</text>
  <text class="d-sub" x="595" y="76" text-anchor="middle">min end 10 &lt;= 15</text>
  <text class="d-sub" x="595" y="100" text-anchor="middle">replace 10 by 20</text>
  <text class="d-text" x="595" y="132" text-anchor="middle">heap {20, 30}</text>
</svg>

When \`[15, 20]\` arrives, the earliest end in the heap is 10, which is not after 15, so that room is free: its 10 is replaced by 20. The heap never needed a third entry, so the answer is 2.

## 4. From Brute Force to O(n log n)

**Brute force.** The busiest moment always happens at some meeting's start time (the count only goes up at starts). So for every meeting's start time, count how many meetings are running at that moment (\`start <= t < end\`) and keep the maximum. That is O(n²) — example 2 uses it as a reference to check the fast versions.

**Why the heap is right.** When a meeting starts, the only room that matters is the one that becomes free earliest: if even that one is still busy, all of them are, so a new room is required. If it is free, reusing it is never worse than opening a new room. The heap gives us "earliest end" in O(1) and updates in O(log n). Because we either replace the top or add one end, the heap size only grows when a new room is truly needed, so its final size is the peak.

**Why the sweep is right.** Rooms in use change only at starts (+1) and ends (−1). Processing events in time order and remembering the highest running count is exactly "maximum overlap". The one subtle point is **ties**: when one meeting ends at 10 and another starts at 10, the end must be processed first, otherwise the count briefly shows one room too many.

📌 **Interview term: Half-open interval** — an interval \`[start, end)\` that includes its start but not its end. A meeting \`[5, 10)\` and a meeting \`[10, 15)\` do not overlap, so they can share a room.

A two-pointer version of the sweep sorts the start times and the end times as two separate arrays and walks them together: for each start, if the earliest unused end is \`<=\` it, a room was freed (advance the end pointer); otherwise open a room. It needs no heap, only two sorts — handy in languages without a built-in heap. The first steps of this problem (sort by start, compare with an end) are shared with [merging overlapping intervals](/interview-question/how-do-you-merge-overlapping-intervals).

## 5. The Code in JavaScript

JavaScript's standard library has no heap or priority queue, so example 1 includes a 30-line binary min-heap. In an interview, say this out loud and offer the choice: write the heap (it shows you know how one works), or use the two-sorted-arrays sweep from example 2, which needs nothing but \`sort\`.

~~~javascript
function minMeetingRooms(meetings) {
  const sorted = meetings.slice().sort((x, y) => x[0] - y[0]); // numeric comparator, on a copy
  const ends = new MinHeap();
  for (const [start, end] of sorted) {
    if (ends.size > 0 && ends.peek() <= start) {
      ends.replaceTop(end);   // the room that frees up first is free by now: reuse it
    } else {
      ends.push(end);         // every room is busy: open a new one
    }
  }
  return ends.size;           // the heap never shrinks, so its size is the peak
}
~~~

**What to point out in this code:**

- \`meetings.slice()\` copies the array before sorting, because \`Array.prototype.sort\` sorts in place.
- The comparator is required. Without one, numbers are compared as strings; in our run \`[30, 5, 100, 20].sort()\` returned \`[100,20,30,5]\`, while \`.sort((a, b) => a - b)\` returned \`[5,20,30,100]\`.
- The heap's \`replaceTop(x)\` overwrites the minimum and sifts it down — the same idea as Python's \`heapreplace\`, one O(log n) step instead of a pop and a push.
- In the event sweep (example 2) the comparator \`(a, b) => a[0] - b[0] || a[1] - b[1]\` sorts by time and, on equal times, puts \`-1\` (an end) before \`+1\` (a start). \`||\` falls through to the second comparison only when the first difference is 0.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. In example 2 the 500 schedules come from a small deterministic random generator (MINSTD), so every language sees the same meetings; the sweep, the two-pointer walk and the O(n²) brute force never disagreed.

**Example 1 — the min-heap solution on seven schedules** prints:

~~~text
2
1
1
4
3
1
0
~~~

**Example 2 — the chronological sweep with a trace, cross-checked against two other methods on 500 random schedules** prints:

~~~text
sweep over [[0, 30], [5, 10], [15, 20]]
  t=0 start -> rooms in use 1
  t=5 start -> rooms in use 2
  t=10 end   -> rooms in use 1
  t=15 start -> rooms in use 2
  t=20 end   -> rooms in use 1
  t=30 end   -> rooms in use 0
  peak = 2
sweep over [[1, 5], [5, 10]] (end at 5 is processed before start at 5)
  t=1 start -> rooms in use 1
  t=5 end   -> rooms in use 0
  t=5 start -> rooms in use 1
  t=10 end   -> rooms in use 0
  peak = 1
500 random schedules: mismatches 0, sum of answers 1233
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (count at every start) | O(n²) | O(1) | n start times, n meetings checked for each |
| Sort + hand-written min-heap | O(n log n) | O(n) | the sort, then O(log n) sift-up or sift-down per meeting |
| Sweep over 2n events | O(n log n) | O(n) | sorting 2n events dominates |
| Two sorted arrays | O(n log n) | O(n) | two numeric sorts plus one linear walk; no heap needed |

## 8. Edge Cases

- **No meetings** — 0 rooms (\`[]\` in example 1).
- **One meeting** — 1 room.
- **Back-to-back meetings** — \`[[1, 5], [5, 10]]\` needs 1 room when ends free the room at the same instant; the trace in example 2 shows the end at 5 processed before the start at 5.
- **Identical meetings** — \`[[1, 2], [1, 2], [1, 2]]\` needs 3 rooms.
- **Unsorted input** — \`[[7, 10], [2, 4]]\` must be sorted by start first; the answer is 1.
- **Busy middle** — \`[[1, 10], [2, 7], [3, 19], [8, 12], [10, 20], [11, 30]]\` needs 4 rooms: at time 11 the meetings \`[3, 19]\`, \`[8, 12]\`, \`[10, 20]\` and \`[11, 30]\` are all running.

## Common Pitfalls

- **Sorting numbers without a comparator.** \`sort()\` compares strings, so \`100\` lands before \`20\` and the sweep gives wrong answers.
- **\`<\` instead of \`<=\` in the reuse test.** Back-to-back meetings would need 2 rooms instead of 1.
- **Using a sorted array as a "heap" and calling \`sort\` after every insert.** That is O(n log n) per meeting and O(n² log n) overall.
- **Sweep with starts before ends on ties.** The comparator must put \`-1\` before \`+1\` at the same time.
- **Sorting the caller's array in place.** Copy with \`slice()\` first if the caller still needs it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The answer:</strong> <span style="color:#f0e2c8;">The number of rooms is the maximum number of meetings running at the same moment.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap method:</strong> <span style="color:#f0e2c8;">Sort by start; keep end times in a min-heap; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek() &lt;= start</code> replace the top, else push a new end.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it works:</strong> <span style="color:#f0e2c8;">The room that frees up earliest is the only one worth checking; if it is busy, all rooms are busy.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n log n) time, O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">There is no built-in heap: write a small one, or sort starts and ends into two arrays with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code> and walk them with two pointers.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">JavaScript has no priority queue — what do you do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either a 30-line binary heap (array, sift up, sift down) or the two-sorted-arrays version, which gives the same answer with only two sorts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[30, 5, 100, 20].sort()</code> go wrong?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without a comparator, elements are converted to strings, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"100"</code> sorts before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"20"</code>. Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;=</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Half-open meetings: one ending at 5 frees the room for one starting at 5.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return which room each meeting gets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[end, roomId]</code> pairs in the heap ordered by end; on reuse take the popped room id, otherwise create a new one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you break ties in the event sweep?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a[0] - b[0] || a[1] - b[1]</code> with ends encoded as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code> and starts as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+1</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Min-heap (priority queue)** | Smallest element on top; push/pop in O(log n) |
| **Sweep line** | Process sorted start/end events with a running count |
| **Maximum overlap (peak concurrency)** | Most intervals that contain one point in time |
| **Half-open interval** | \`[start, end)\`: includes start, excludes end |

---
**Conclusion:** In JavaScript, the minimum number of meeting rooms is the peak number of overlapping meetings. The heap solution needs a hand-written binary heap because the language has none built in; the two-sorted-arrays sweep gives the same O(n log n) answer with only \`sort\`. Either way, always sort numbers with a comparator — the default \`sort()\` compares strings — and process ends before starts at equal times.`,
        examples: [
          {
            label: "Sort by start + min-heap of end times (7 schedules)",
            code: `// JavaScript has no built-in heap, so here is a small binary min-heap of numbers.
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {                       // sift up while smaller than the parent
      const p = (i - 1) >> 1;
      if (a[p] <= a[i]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  replaceTop(x) {                         // pop the minimum and push x in one step
    const a = this.a;
    a[0] = x;
    let i = 0;
    for (;;) {                            // sift down towards the smaller child
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < a.length && a[l] < a[m]) m = l;
      if (r < a.length && a[r] < a[m]) m = r;
      if (m === i) break;
      [a[m], a[i]] = [a[i], a[m]];
      i = m;
    }
  }
}

// Sort by start; a min-heap holds the end time of every room in use.
function minMeetingRooms(meetings) {
  const sorted = meetings.slice().sort((x, y) => x[0] - y[0]); // numeric comparator, on a copy
  const ends = new MinHeap();
  for (const [start, end] of sorted) {
    if (ends.size > 0 && ends.peek() <= start) {
      ends.replaceTop(end);   // the room that frees up first is free by now: reuse it
    } else {
      ends.push(end);         // every room is busy: open a new one
    }
  }
  return ends.size;           // the heap never shrinks, so its size is the peak
}

console.log(minMeetingRooms([[0, 30], [5, 10], [15, 20]])); // 2
console.log(minMeetingRooms([[7, 10], [2, 4]])); // 1
console.log(minMeetingRooms([[1, 5], [5, 10]])); // 1
console.log(minMeetingRooms([[1, 10], [2, 7], [3, 19], [8, 12], [10, 20], [11, 30]])); // 4
console.log(minMeetingRooms([[1, 2], [1, 2], [1, 2]])); // 3
console.log(minMeetingRooms([[9, 12]])); // 1
console.log(minMeetingRooms([])); // 0`,
          },
          {
            label: "Sweep line trace + random cross-check of three methods",
            code: `// Chronological sweep: +1 at every start, -1 at every end; ends sort first on ties.
function sweep(meetings, trace) {
  const events = [];
  for (const [start, end] of meetings) {
    events.push([start, 1]);
    events.push([end, -1]);
  }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]); // by time, then -1 (end) before +1 (start)
  let inUse = 0, peak = 0;
  for (const [t, delta] of events) {
    inUse += delta;
    peak = Math.max(peak, inUse);
    if (trace) console.log("  t=" + t + " " + (delta === 1 ? "start" : "end  ") + " -> rooms in use " + inUse);
  }
  return peak;
}

// Sorted starts and sorted ends; a room frees up whenever the next end <= the next start.
function twoPointers(meetings) {
  const starts = meetings.map((m) => m[0]).sort((a, b) => a - b);
  const ends = meetings.map((m) => m[1]).sort((a, b) => a - b);
  let rooms = 0, j = 0;
  for (const s of starts) {
    if (ends[j] <= s) j++;   // someone left before we arrived: take their room
    else rooms++;            // nobody left yet: a new room
  }
  return rooms;
}

// Peak overlap happens at some start time: count meetings live at each start.
function bruteForce(meetings) {
  let best = 0;
  for (const [t] of meetings) {
    let live = 0;
    for (const [s, e] of meetings) if (s <= t && t < e) live++;
    best = Math.max(best, live);
  }
  return best;
}

console.log("sweep over [[0, 30], [5, 10], [15, 20]]");
console.log("  peak = " + sweep([[0, 30], [5, 10], [15, 20]], true));
console.log("sweep over [[1, 5], [5, 10]] (end at 5 is processed before start at 5)");
console.log("  peak = " + sweep([[1, 5], [5, 10]], true));

let seed = 7, mismatches = 0, total = 0;
for (let k = 0; k < 500; k++) {
  const meetings = [];
  seed = (seed * 48271) % 2147483647;
  const n = seed % 12;
  for (let i = 0; i < n; i++) {
    seed = (seed * 48271) % 2147483647;
    const start = seed % 50;
    seed = (seed * 48271) % 2147483647;
    meetings.push([start, start + 1 + (seed % 15)]);
  }
  const a = sweep(meetings, false), b = twoPointers(meetings), c = bruteForce(meetings);
  total += a;
  if (a !== b || b !== c) mismatches++;
}
console.log("500 random schedules: mismatches " + mismatches + ", sum of answers " + total);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an int[][] of meetings as {start, end} pairs, write a Java method that returns the minimum number of conference rooms needed so that no two overlapping meetings share a room."

**What a strong answer should cover:**
- The answer is the maximum number of meetings running at the same time.
- Sort by start, keep a min-heap of end times; reuse the top room when its end is <= the new start. O(n log n) time, O(n) space.
- The sweep-line alternative with ends before starts on ties, or two sorted \`int[]\` arrays.
- Edge cases: back-to-back meetings share a room, identical meetings need separate rooms, empty input is 0.
- Java details: \`PriorityQueue<Integer>\` with natural ordering is a min-heap, \`Collections.reverseOrder()\` makes a max-heap, values are boxed \`Integer\`s (never compare two of them with \`==\`), and \`Arrays.sort(int[])\` needs no comparator.

**Clarifying questions expected:**
- Can a meeting ending at 10 share a room with one starting at 10?
- Is the input already sorted?

**Code / implementation expected:** Yes — \`static int minMeetingRooms(int[][] meetings)\` with a \`PriorityQueue<Integer>\`, in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need sorting and arrays in Java; heaps are explained here.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You run a small office with a list of today's meetings: one from 0:00 to 0:30, one from 0:05 to 0:10, one from 0:15 to 0:20 (minutes after nine, say). How many meeting rooms do you need so that nobody is left standing in the corridor?

You could give every meeting its own room — three rooms — but that is wasteful: the 0:05 meeting is over by 0:10, so its room is free again for the 0:15 meeting. The real question is: **at the busiest moment of the day, how many meetings are happening at the same time?** Here that is two (at 0:05 and again at 0:15), so two rooms are enough.

The same question appears as "how many servers do I need for these jobs", "how many gates for these flights" or "how many threads for these tasks". Interviewers like it because there are two clean solutions — a min-heap and a sweep — and each tests a different tool.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| If one meeting ends at 10 and another starts at 10, can they share a room? | Usually yes (half-open intervals \`[start, end)\`). It decides \`<=\` versus \`<\` in the reuse test and the order of events at equal times. |
| Is the input sorted by start time? | If yes, the first sort can be skipped (the heap is still needed). |
| Do you need just the number, or also which room each meeting gets? | The heap version can be extended to hand out room ids. |
| How many meetings, and how large are the times? | n up to 10^4 or 10^5 rules out checking every time unit; large times rule out a counting array indexed by time. |
| Can a meeting have zero length (start equals end)? | It needs no room at all if ends are processed before starts; worth agreeing on. |

## 3. The Core Idea

The number of rooms you need is the **maximum number of meetings that overlap at any single moment**. Two ways to compute it:

**A. Sort by start and keep a min-heap of end times.** Go through the meetings in order of start time. Keep the end time of every room that is in use in a min-heap, so the room that frees up *first* is always on top. For each new meeting: if the earliest end time is \`<=\` the new start, that room is free — reuse it (remove that end time, add the new one). Otherwise every room is still busy — open a new room (add the new end time). The heap's size at the end is the number of rooms.

**B. Sweep through time.** Turn every meeting into two events: "+1 at its start" and "−1 at its end". Sort all events by time and walk through them, keeping a running count of rooms in use. The largest count you ever see is the answer.

📌 **Interview term: Min-heap (priority queue)** — a structure that always gives you its smallest element in O(1) and lets you add or remove elements in O(log n). See [what is a heap / priority queue](/interview-question/what-is-a-heap-priority-queue).

📌 **Interview term: Sweep line** — a technique that turns intervals into start and end events, sorts them by time, and processes them in order while keeping a running count — like moving a vertical line across a timeline.

📌 **Interview term: Maximum overlap (peak concurrency)** — the largest number of intervals that contain the same point in time. For meeting rooms it equals the minimum number of rooms.

<svg class="iq-diagram" width="100%" viewBox="0 0 740 290" role="img" aria-label="Room 1 holds the meeting from 0 to 30. Room 2 holds 5 to 10 and is then reused for 15 to 20. At most two rooms are in use at once">
  <text class="d-text" x="370" y="22" text-anchor="middle">Meetings [0, 30], [5, 10], [15, 20]</text>
  <text class="d-text" x="20" y="72">room 1</text>
  <text class="d-text" x="20" y="132">room 2</text>
  <text class="d-sub" x="20" y="202">in use</text>
  <rect class="d-box-muted" x="130" y="52" width="480" height="30" rx="6"/>
  <text class="d-sub" x="370" y="72" text-anchor="middle">[0, 30]</text>
  <rect class="d-box-accent" x="210" y="112" width="80" height="30" rx="6"/>
  <text class="d-sub" x="250" y="132" text-anchor="middle">[5, 10]</text>
  <rect class="d-box-accent" x="370" y="112" width="80" height="30" rx="6"/>
  <text class="d-sub" x="410" y="132" text-anchor="middle">[15, 20]</text>
  <rect class="d-box" x="132" y="182" width="76" height="30" rx="4"/>
  <text class="d-text" x="170" y="202" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="212" y="182" width="76" height="30" rx="4"/>
  <text class="d-text" x="250" y="202" text-anchor="middle">2</text>
  <rect class="d-box" x="292" y="182" width="76" height="30" rx="4"/>
  <text class="d-text" x="330" y="202" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="372" y="182" width="76" height="30" rx="4"/>
  <text class="d-text" x="410" y="202" text-anchor="middle">2</text>
  <rect class="d-box" x="452" y="182" width="156" height="30" rx="4"/>
  <text class="d-text" x="530" y="202" text-anchor="middle">1</text>
  <path class="d-edge" d="M 130 250 L 610 250"/>
  <path class="d-edge" d="M 130 246 L 130 254"/>
  <text class="d-sub" x="130" y="272" text-anchor="middle">0</text>
  <path class="d-edge" d="M 210 246 L 210 254"/>
  <text class="d-sub" x="210" y="272" text-anchor="middle">5</text>
  <path class="d-edge" d="M 290 246 L 290 254"/>
  <text class="d-sub" x="290" y="272" text-anchor="middle">10</text>
  <path class="d-edge" d="M 370 246 L 370 254"/>
  <text class="d-sub" x="370" y="272" text-anchor="middle">15</text>
  <path class="d-edge" d="M 450 246 L 450 254"/>
  <text class="d-sub" x="450" y="272" text-anchor="middle">20</text>
  <path class="d-edge" d="M 530 246 L 530 254"/>
  <text class="d-sub" x="530" y="272" text-anchor="middle">25</text>
  <path class="d-edge" d="M 610 246 L 610 254"/>
  <text class="d-sub" x="610" y="272" text-anchor="middle">30</text>
</svg>

The bottom strip counts meetings in progress in each time slice. It never goes above 2, and room 2 is reused once the 5–10 meeting is over.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 170" role="img" aria-label="The min heap of end times after each meeting. It holds 30, then 10 and 30, then 20 and 30. Its final size, 2, is the answer">
  <defs>
    <marker id="b10q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="190" height="130" rx="10"/>
  <text class="d-text" x="115" y="48" text-anchor="middle">meeting [0, 30]</text>
  <text class="d-sub" x="115" y="76" text-anchor="middle">heap empty</text>
  <text class="d-sub" x="115" y="100" text-anchor="middle">push 30</text>
  <text class="d-text" x="115" y="132" text-anchor="middle">heap {30}</text>
  <path class="d-edge" d="M 214 85 L 254 85" marker-end="url(#b10q3-arrow)"/>
  <rect class="d-box" x="260" y="20" width="190" height="130" rx="10"/>
  <text class="d-text" x="355" y="48" text-anchor="middle">meeting [5, 10]</text>
  <text class="d-sub" x="355" y="76" text-anchor="middle">min end 30 > 5</text>
  <text class="d-sub" x="355" y="100" text-anchor="middle">push 10</text>
  <text class="d-text" x="355" y="132" text-anchor="middle">heap {10, 30}</text>
  <path class="d-edge" d="M 454 85 L 494 85" marker-end="url(#b10q3-arrow)"/>
  <rect class="d-box-accent" x="500" y="20" width="190" height="130" rx="10"/>
  <text class="d-text" x="595" y="48" text-anchor="middle">meeting [15, 20]</text>
  <text class="d-sub" x="595" y="76" text-anchor="middle">min end 10 &lt;= 15</text>
  <text class="d-sub" x="595" y="100" text-anchor="middle">replace 10 by 20</text>
  <text class="d-text" x="595" y="132" text-anchor="middle">heap {20, 30}</text>
</svg>

When \`[15, 20]\` arrives, the earliest end in the heap is 10, which is not after 15, so that room is free: its 10 is replaced by 20. The heap never needed a third entry, so the answer is 2.

## 4. From Brute Force to O(n log n)

**Brute force.** The busiest moment always happens at some meeting's start time (the count only goes up at starts). So for every meeting's start time, count how many meetings are running at that moment (\`start <= t < end\`) and keep the maximum. That is O(n²) — example 2 uses it as a reference to check the fast versions.

**Why the heap is right.** When a meeting starts, the only room that matters is the one that becomes free earliest: if even that one is still busy, all of them are, so a new room is required. If it is free, reusing it is never worse than opening a new room. The heap gives us "earliest end" in O(1) and updates in O(log n). Because we either replace the top or add one end, the heap size only grows when a new room is truly needed, so its final size is the peak.

**Why the sweep is right.** Rooms in use change only at starts (+1) and ends (−1). Processing events in time order and remembering the highest running count is exactly "maximum overlap". The one subtle point is **ties**: when one meeting ends at 10 and another starts at 10, the end must be processed first, otherwise the count briefly shows one room too many.

📌 **Interview term: Half-open interval** — an interval \`[start, end)\` that includes its start but not its end. A meeting \`[5, 10)\` and a meeting \`[10, 15)\` do not overlap, so they can share a room.

A two-pointer version of the sweep sorts the start times and the end times as two separate arrays and walks them together: for each start, if the earliest unused end is \`<=\` it, a room was freed (advance the end pointer); otherwise open a room. It needs no heap, only two sorts — handy in languages without a built-in heap. The first steps of this problem (sort by start, compare with an end) are shared with [merging overlapping intervals](/interview-question/how-do-you-merge-overlapping-intervals).

## 5. The Code in Java

\`java.util.PriorityQueue\` with no comparator orders elements by their natural order, so \`peek()\` returns the **smallest** end time — a min-heap. It stores objects, so each \`int\` end time is boxed into an \`Integer\` when it goes in and unboxed when we compare it with \`<=\`.

~~~java
static int minMeetingRooms(int[][] meetings) {
    int[][] sorted = meetings.clone();
    Arrays.sort(sorted, (a, b) -> Integer.compare(a[0], b[0]));
    PriorityQueue<Integer> ends = new PriorityQueue<>(); // natural order = min-heap
    for (int[] m : sorted) {
        if (!ends.isEmpty() && ends.peek() <= m[0]) {     // peek() unboxes before <=
            ends.poll();                                  // the earliest-free room is free: reuse it
        }
        ends.offer(m[1]);                                 // the room now runs until our end
    }
    return ends.size();
}
~~~

**What to point out in this code:**

- \`poll()\` then \`offer()\` is the Java version of "replace the top": two O(log n) operations. The heap size only grows when no room is free.
- For a max-heap you would write \`new PriorityQueue<>(Collections.reverseOrder())\`.
- The two-pointer sweep in example 2 copies starts and ends into \`int[]\` arrays and calls \`Arrays.sort\` on primitives — no comparator, no boxing.
- \`ends.peek() <= m[0]\` is safe because \`<=\` unboxes the \`Integer\` to an \`int\`. **\`==\` between two \`Integer\`s is not safe**: it compares object identity. In our run, comparing two boxed \`100\`s with \`==\` printed \`true\`, but two boxed \`1000\`s printed \`false\`, because small values come from a shared cache and larger ones are separate objects:

~~~text
100 == 100 (boxed): true
1000 == 1000 (boxed): false
~~~

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21; the code only uses Java 17 features). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. In example 2 the 500 schedules come from a small deterministic random generator (MINSTD), so every language sees the same meetings; the sweep, the two-pointer walk and the O(n²) brute force never disagreed.

**Example 1 — the min-heap solution on seven schedules** prints:

~~~text
2
1
1
4
3
1
0
~~~

**Example 2 — the chronological sweep with a trace, cross-checked against two other methods on 500 random schedules** prints:

~~~text
sweep over [[0, 30], [5, 10], [15, 20]]
  t=0 start -> rooms in use 1
  t=5 start -> rooms in use 2
  t=10 end   -> rooms in use 1
  t=15 start -> rooms in use 2
  t=20 end   -> rooms in use 1
  t=30 end   -> rooms in use 0
  peak = 2
sweep over [[1, 5], [5, 10]] (end at 5 is processed before start at 5)
  t=1 start -> rooms in use 1
  t=5 end   -> rooms in use 0
  t=5 start -> rooms in use 1
  t=10 end   -> rooms in use 0
  peak = 1
500 random schedules: mismatches 0, sum of answers 1233
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (count at every start) | O(n²) | O(1) | n start times, n meetings checked for each |
| Sort + \`PriorityQueue<Integer>\` | O(n log n) | O(n) | the sort, then O(log n) \`poll\`/\`offer\` per meeting; up to n boxed end times |
| Sweep over 2n events | O(n log n) | O(n) | sorting 2n \`int[]\` events dominates |
| Two sorted \`int[]\` arrays | O(n log n) | O(n) | two primitive sorts plus one linear walk |

## 8. Edge Cases

- **No meetings** — 0 rooms (\`[]\` in example 1).
- **One meeting** — 1 room.
- **Back-to-back meetings** — \`[[1, 5], [5, 10]]\` needs 1 room when ends free the room at the same instant; the trace in example 2 shows the end at 5 processed before the start at 5.
- **Identical meetings** — \`[[1, 2], [1, 2], [1, 2]]\` needs 3 rooms.
- **Unsorted input** — \`[[7, 10], [2, 4]]\` must be sorted by start first; the answer is 1.
- **Busy middle** — \`[[1, 10], [2, 7], [3, 19], [8, 12], [10, 20], [11, 30]]\` needs 4 rooms: at time 11 the meetings \`[3, 19]\`, \`[8, 12]\`, \`[10, 20]\` and \`[11, 30]\` are all running.

## Common Pitfalls

- **Comparing boxed values with \`==\`.** \`ends.peek() == x\` with two \`Integer\`s compares references and fails for values outside the small cache (our run: \`1000 == 1000\` was \`false\`).
- **\`<\` instead of \`<=\` in the reuse test.** Back-to-back meetings would need 2 rooms instead of 1.
- **Comparator by subtraction.** \`(a, b) -> a[0] - b[0]\` can overflow for extreme times; use \`Integer.compare\`.
- **Calling \`peek()\` on an empty queue and unboxing.** \`peek()\` returns \`null\`, and unboxing \`null\` throws \`NullPointerException\`; check \`isEmpty()\` first.
- **Sweep with starts before ends on ties.** The event comparator must put \`-1\` before \`+1\` at equal times.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The answer:</strong> <span style="color:#f0e2c8;">The number of rooms is the maximum number of meetings running at the same moment.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap method:</strong> <span style="color:#f0e2c8;">Sort by start; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue&lt;Integer&gt;</code> of end times; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek() &lt;= start</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">poll()</code>; always <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">offer(end)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it works:</strong> <span style="color:#f0e2c8;">The room that frees up earliest is the only one worth checking; if it is busy, all rooms are busy.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n log n) time, O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Natural-order <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code> is a min-heap; never compare two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code>s with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>; for the heap-free version sort two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> arrays.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Java PriorityQueue a min-heap or a max-heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With natural ordering, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek()</code> returns the smallest element, so it is a min-heap. Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.reverseOrder()</code> for a max-heap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes wrong with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ends.peek() == start</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If both sides are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> objects it compares identity, which is false for equal values outside the cache. Compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;=</code> (which unbox) or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.equals</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;=</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Half-open meetings: one ending at 5 frees the room for one starting at 5.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return which room each meeting gets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue&lt;int[]&gt;</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{end, roomId}</code> ordered by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.compare(a[0], b[0])</code>; on reuse take the polled room id.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you avoid boxing entirely?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: sort starts and ends into two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> arrays and walk them with two pointers; same O(n log n), no objects.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Min-heap (priority queue)** | Smallest element on top; push/pop in O(log n) |
| **Sweep line** | Process sorted start/end events with a running count |
| **Maximum overlap (peak concurrency)** | Most intervals that contain one point in time |
| **Half-open interval** | \`[start, end)\`: includes start, excludes end |

---
**Conclusion:** In Java, the minimum number of meeting rooms is the peak number of overlapping meetings. Sort by start, keep end times in a natural-order \`PriorityQueue<Integer>\` (a min-heap), reuse the top room when \`peek() <= start\`, and the queue's final size is the answer — O(n log n) time, O(n) space. The Java-specific care points are boxing (never \`==\` on two \`Integer\`s, never unbox a \`null\` from an empty queue) and overflow-safe comparators.`,
        examples: [
          {
            label: "Sort by start + min-heap of end times (7 schedules)",
            code: `import java.util.Arrays;
import java.util.PriorityQueue;

public class Main {
    // Sort by start; a min-heap holds the end time of every room in use.
    static int minMeetingRooms(int[][] meetings) {
        int[][] sorted = meetings.clone();
        Arrays.sort(sorted, (a, b) -> Integer.compare(a[0], b[0]));
        PriorityQueue<Integer> ends = new PriorityQueue<>(); // natural order = min-heap
        for (int[] m : sorted) {
            if (!ends.isEmpty() && ends.peek() <= m[0]) {     // peek() unboxes before <=
                ends.poll();                                  // the earliest-free room is free: reuse it
            }
            ends.offer(m[1]);                                 // the room now runs until our end
        }
        return ends.size();
    }

    public static void main(String[] args) {
        System.out.println(minMeetingRooms(new int[][]{{0, 30}, {5, 10}, {15, 20}}));                          // 2
        System.out.println(minMeetingRooms(new int[][]{{7, 10}, {2, 4}}));                                     // 1
        System.out.println(minMeetingRooms(new int[][]{{1, 5}, {5, 10}}));                                     // 1
        System.out.println(minMeetingRooms(new int[][]{{1, 10}, {2, 7}, {3, 19}, {8, 12}, {10, 20}, {11, 30}})); // 4
        System.out.println(minMeetingRooms(new int[][]{{1, 2}, {1, 2}, {1, 2}}));                              // 3
        System.out.println(minMeetingRooms(new int[][]{{9, 12}}));                                             // 1
        System.out.println(minMeetingRooms(new int[][]{}));                                                    // 0
    }
}`,
          },
          {
            label: "Sweep line trace + random cross-check of three methods",
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Main {
    // Chronological sweep: +1 at every start, -1 at every end; ends sort first on ties.
    static int sweep(int[][] meetings, boolean trace) {
        List<int[]> events = new ArrayList<>();
        for (int[] m : meetings) {
            events.add(new int[]{m[0], 1});
            events.add(new int[]{m[1], -1});
        }
        // by time, then -1 (end) before +1 (start)
        events.sort((a, b) -> a[0] != b[0] ? Integer.compare(a[0], b[0]) : Integer.compare(a[1], b[1]));
        int inUse = 0, peak = 0;
        for (int[] ev : events) {
            inUse += ev[1];
            peak = Math.max(peak, inUse);
            if (trace) System.out.println("  t=" + ev[0] + " " + (ev[1] == 1 ? "start" : "end  ") + " -> rooms in use " + inUse);
        }
        return peak;
    }

    // Sorted starts and sorted ends; a room frees up whenever the next end <= the next start.
    static int twoPointers(int[][] meetings) {
        int n = meetings.length;
        int[] starts = new int[n], ends = new int[n];
        for (int i = 0; i < n; i++) { starts[i] = meetings[i][0]; ends[i] = meetings[i][1]; }
        Arrays.sort(starts);   // primitive int[]: no boxing, no comparator needed
        Arrays.sort(ends);
        int rooms = 0, j = 0;
        for (int s : starts) {
            if (ends[j] <= s) j++;   // someone left before we arrived: take their room
            else rooms++;            // nobody left yet: a new room
        }
        return rooms;
    }

    // Peak overlap happens at some start time: count meetings live at each start.
    static int bruteForce(int[][] meetings) {
        int best = 0;
        for (int[] m : meetings) {
            int live = 0;
            for (int[] o : meetings) if (o[0] <= m[0] && m[0] < o[1]) live++;
            best = Math.max(best, live);
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println("sweep over [[0, 30], [5, 10], [15, 20]]");
        System.out.println("  peak = " + sweep(new int[][]{{0, 30}, {5, 10}, {15, 20}}, true));
        System.out.println("sweep over [[1, 5], [5, 10]] (end at 5 is processed before start at 5)");
        System.out.println("  peak = " + sweep(new int[][]{{1, 5}, {5, 10}}, true));

        long seed = 7;
        int mismatches = 0, total = 0;
        for (int k = 0; k < 500; k++) {
            seed = seed * 48271 % 2147483647L;
            int n = (int) (seed % 12);
            int[][] meetings = new int[n][];
            for (int i = 0; i < n; i++) {
                seed = seed * 48271 % 2147483647L;
                int start = (int) (seed % 50);
                seed = seed * 48271 % 2147483647L;
                meetings[i] = new int[]{start, start + 1 + (int) (seed % 15)};
            }
            int a = sweep(meetings, false), b = twoPointers(meetings), c = bruteForce(meetings);
            total += a;
            if (a != b || b != c) mismatches++;
        }
        System.out.println("500 random schedules: mismatches " + mismatches + ", sum of answers " + total);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a vector of meetings as {start, end} pairs, write a C++ function that returns the minimum number of conference rooms needed so that no two overlapping meetings share a room."

**What a strong answer should cover:**
- The answer is the maximum number of meetings running at the same time.
- Sort by start, keep a min-heap of end times; reuse the top room when its end is <= the new start. O(n log n) time, O(n) space.
- The sweep-line alternative with ends before starts on ties, or two sorted vectors with two pointers.
- Edge cases: back-to-back meetings share a room, identical meetings need separate rooms, empty input is 0.
- C++ details: \`std::priority_queue\` is a max-heap by default, so a min-heap needs \`std::greater<int>\`; \`std::pair\` already sorts by first then second, which gives the tie rule for events.

**Clarifying questions expected:**
- Can a meeting ending at 10 share a room with one starting at 10?
- Is the input already sorted?

**Code / implementation expected:** Yes — \`int minMeetingRooms(std::vector<std::vector<int>> meetings)\` with a \`std::priority_queue\`, in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need sorting and arrays in C++; heaps are explained here.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You run a small office with a list of today's meetings: one from 0:00 to 0:30, one from 0:05 to 0:10, one from 0:15 to 0:20 (minutes after nine, say). How many meeting rooms do you need so that nobody is left standing in the corridor?

You could give every meeting its own room — three rooms — but that is wasteful: the 0:05 meeting is over by 0:10, so its room is free again for the 0:15 meeting. The real question is: **at the busiest moment of the day, how many meetings are happening at the same time?** Here that is two (at 0:05 and again at 0:15), so two rooms are enough.

The same question appears as "how many servers do I need for these jobs", "how many gates for these flights" or "how many threads for these tasks". Interviewers like it because there are two clean solutions — a min-heap and a sweep — and each tests a different tool.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| If one meeting ends at 10 and another starts at 10, can they share a room? | Usually yes (half-open intervals \`[start, end)\`). It decides \`<=\` versus \`<\` in the reuse test and the order of events at equal times. |
| Is the input sorted by start time? | If yes, the first sort can be skipped (the heap is still needed). |
| Do you need just the number, or also which room each meeting gets? | The heap version can be extended to hand out room ids. |
| How many meetings, and how large are the times? | n up to 10^4 or 10^5 rules out checking every time unit; large times rule out a counting array indexed by time. |
| Can a meeting have zero length (start equals end)? | It needs no room at all if ends are processed before starts; worth agreeing on. |

## 3. The Core Idea

The number of rooms you need is the **maximum number of meetings that overlap at any single moment**. Two ways to compute it:

**A. Sort by start and keep a min-heap of end times.** Go through the meetings in order of start time. Keep the end time of every room that is in use in a min-heap, so the room that frees up *first* is always on top. For each new meeting: if the earliest end time is \`<=\` the new start, that room is free — reuse it (remove that end time, add the new one). Otherwise every room is still busy — open a new room (add the new end time). The heap's size at the end is the number of rooms.

**B. Sweep through time.** Turn every meeting into two events: "+1 at its start" and "−1 at its end". Sort all events by time and walk through them, keeping a running count of rooms in use. The largest count you ever see is the answer.

📌 **Interview term: Min-heap (priority queue)** — a structure that always gives you its smallest element in O(1) and lets you add or remove elements in O(log n). See [what is a heap / priority queue](/interview-question/what-is-a-heap-priority-queue).

📌 **Interview term: Sweep line** — a technique that turns intervals into start and end events, sorts them by time, and processes them in order while keeping a running count — like moving a vertical line across a timeline.

📌 **Interview term: Maximum overlap (peak concurrency)** — the largest number of intervals that contain the same point in time. For meeting rooms it equals the minimum number of rooms.

<svg class="iq-diagram" width="100%" viewBox="0 0 740 290" role="img" aria-label="Room 1 holds the meeting from 0 to 30. Room 2 holds 5 to 10 and is then reused for 15 to 20. At most two rooms are in use at once">
  <text class="d-text" x="370" y="22" text-anchor="middle">Meetings [0, 30], [5, 10], [15, 20]</text>
  <text class="d-text" x="20" y="72">room 1</text>
  <text class="d-text" x="20" y="132">room 2</text>
  <text class="d-sub" x="20" y="202">in use</text>
  <rect class="d-box-muted" x="130" y="52" width="480" height="30" rx="6"/>
  <text class="d-sub" x="370" y="72" text-anchor="middle">[0, 30]</text>
  <rect class="d-box-accent" x="210" y="112" width="80" height="30" rx="6"/>
  <text class="d-sub" x="250" y="132" text-anchor="middle">[5, 10]</text>
  <rect class="d-box-accent" x="370" y="112" width="80" height="30" rx="6"/>
  <text class="d-sub" x="410" y="132" text-anchor="middle">[15, 20]</text>
  <rect class="d-box" x="132" y="182" width="76" height="30" rx="4"/>
  <text class="d-text" x="170" y="202" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="212" y="182" width="76" height="30" rx="4"/>
  <text class="d-text" x="250" y="202" text-anchor="middle">2</text>
  <rect class="d-box" x="292" y="182" width="76" height="30" rx="4"/>
  <text class="d-text" x="330" y="202" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="372" y="182" width="76" height="30" rx="4"/>
  <text class="d-text" x="410" y="202" text-anchor="middle">2</text>
  <rect class="d-box" x="452" y="182" width="156" height="30" rx="4"/>
  <text class="d-text" x="530" y="202" text-anchor="middle">1</text>
  <path class="d-edge" d="M 130 250 L 610 250"/>
  <path class="d-edge" d="M 130 246 L 130 254"/>
  <text class="d-sub" x="130" y="272" text-anchor="middle">0</text>
  <path class="d-edge" d="M 210 246 L 210 254"/>
  <text class="d-sub" x="210" y="272" text-anchor="middle">5</text>
  <path class="d-edge" d="M 290 246 L 290 254"/>
  <text class="d-sub" x="290" y="272" text-anchor="middle">10</text>
  <path class="d-edge" d="M 370 246 L 370 254"/>
  <text class="d-sub" x="370" y="272" text-anchor="middle">15</text>
  <path class="d-edge" d="M 450 246 L 450 254"/>
  <text class="d-sub" x="450" y="272" text-anchor="middle">20</text>
  <path class="d-edge" d="M 530 246 L 530 254"/>
  <text class="d-sub" x="530" y="272" text-anchor="middle">25</text>
  <path class="d-edge" d="M 610 246 L 610 254"/>
  <text class="d-sub" x="610" y="272" text-anchor="middle">30</text>
</svg>

The bottom strip counts meetings in progress in each time slice. It never goes above 2, and room 2 is reused once the 5–10 meeting is over.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 170" role="img" aria-label="The min heap of end times after each meeting. It holds 30, then 10 and 30, then 20 and 30. Its final size, 2, is the answer">
  <defs>
    <marker id="b10q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="190" height="130" rx="10"/>
  <text class="d-text" x="115" y="48" text-anchor="middle">meeting [0, 30]</text>
  <text class="d-sub" x="115" y="76" text-anchor="middle">heap empty</text>
  <text class="d-sub" x="115" y="100" text-anchor="middle">push 30</text>
  <text class="d-text" x="115" y="132" text-anchor="middle">heap {30}</text>
  <path class="d-edge" d="M 214 85 L 254 85" marker-end="url(#b10q3-arrow)"/>
  <rect class="d-box" x="260" y="20" width="190" height="130" rx="10"/>
  <text class="d-text" x="355" y="48" text-anchor="middle">meeting [5, 10]</text>
  <text class="d-sub" x="355" y="76" text-anchor="middle">min end 30 > 5</text>
  <text class="d-sub" x="355" y="100" text-anchor="middle">push 10</text>
  <text class="d-text" x="355" y="132" text-anchor="middle">heap {10, 30}</text>
  <path class="d-edge" d="M 454 85 L 494 85" marker-end="url(#b10q3-arrow)"/>
  <rect class="d-box-accent" x="500" y="20" width="190" height="130" rx="10"/>
  <text class="d-text" x="595" y="48" text-anchor="middle">meeting [15, 20]</text>
  <text class="d-sub" x="595" y="76" text-anchor="middle">min end 10 &lt;= 15</text>
  <text class="d-sub" x="595" y="100" text-anchor="middle">replace 10 by 20</text>
  <text class="d-text" x="595" y="132" text-anchor="middle">heap {20, 30}</text>
</svg>

When \`[15, 20]\` arrives, the earliest end in the heap is 10, which is not after 15, so that room is free: its 10 is replaced by 20. The heap never needed a third entry, so the answer is 2.

## 4. From Brute Force to O(n log n)

**Brute force.** The busiest moment always happens at some meeting's start time (the count only goes up at starts). So for every meeting's start time, count how many meetings are running at that moment (\`start <= t < end\`) and keep the maximum. That is O(n²) — example 2 uses it as a reference to check the fast versions.

**Why the heap is right.** When a meeting starts, the only room that matters is the one that becomes free earliest: if even that one is still busy, all of them are, so a new room is required. If it is free, reusing it is never worse than opening a new room. The heap gives us "earliest end" in O(1) and updates in O(log n). Because we either replace the top or add one end, the heap size only grows when a new room is truly needed, so its final size is the peak.

**Why the sweep is right.** Rooms in use change only at starts (+1) and ends (−1). Processing events in time order and remembering the highest running count is exactly "maximum overlap". The one subtle point is **ties**: when one meeting ends at 10 and another starts at 10, the end must be processed first, otherwise the count briefly shows one room too many.

📌 **Interview term: Half-open interval** — an interval \`[start, end)\` that includes its start but not its end. A meeting \`[5, 10)\` and a meeting \`[10, 15)\` do not overlap, so they can share a room.

A two-pointer version of the sweep sorts the start times and the end times as two separate arrays and walks them together: for each start, if the earliest unused end is \`<=\` it, a room was freed (advance the end pointer); otherwise open a room. It needs no heap, only two sorts — handy in languages without a built-in heap. The first steps of this problem (sort by start, compare with an end) are shared with [merging overlapping intervals](/interview-question/how-do-you-merge-overlapping-intervals).

## 5. The Code in C++

\`std::priority_queue<int>\` keeps the **largest** element on top by default — in our run, pushing 10, 30 and 20 gave \`top() == 30\`. For "the room that frees up first" we need the smallest end time, so the third template argument switches the comparison: \`std::priority_queue<int, std::vector<int>, std::greater<int>>\`.

~~~cpp
int minMeetingRooms(std::vector<std::vector<int>> meetings) {
    std::sort(meetings.begin(), meetings.end(),
              [](const std::vector<int>& a, const std::vector<int>& b) { return a[0] < b[0]; });
    // std::priority_queue is a max-heap by default; std::greater turns it into a min-heap.
    std::priority_queue<int, std::vector<int>, std::greater<int>> ends;
    for (const auto& m : meetings) {
        if (!ends.empty() && ends.top() <= m[0]) {
            ends.pop();              // the earliest-free room is free: reuse it
        }
        ends.push(m[1]);             // the room now runs until our end
    }
    return (int)ends.size();
}
~~~

**What to point out in this code:**

- \`top()\` on an empty \`priority_queue\` is undefined behaviour, so the \`!ends.empty()\` check must come first; \`&&\` short-circuits.
- The parameter is taken by value, so sorting it does not change the caller's vector.
- In the event sweep (example 2) events are \`std::pair<int, int>{time, delta}\`. Pairs compare by \`first\`, then \`second\`, so \`std::sort\` puts \`{5, -1}\` (an end) before \`{5, 1}\` (a start) with no custom comparator.
- **C++17 evaluation order.** In a first draft of example 2, \`std::cout << "  peak = " << sweep(..., true)\` printed "  peak = " *before* the trace lines that \`sweep\` prints, because since C++17 the left operand of \`<<\` is sequenced before the right one ([cppreference: order of evaluation](https://en.cppreference.com/w/cpp/language/eval_order)). The final code calls \`sweep\` first and stores the result in a variable.
- **The default really is a max-heap.** A three-line test program:

~~~cpp
std::priority_queue<int> q;
for (int x : {10, 30, 20}) q.push(x);
std::cout << "default priority_queue top: " << q.top() << "\\n";
~~~

~~~text
default priority_queue top: 30
~~~

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13 with \`-std=c++17\`). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. In example 2 the 500 schedules come from a small deterministic random generator (MINSTD), so every language sees the same meetings; the sweep, the two-pointer walk and the O(n²) brute force never disagreed.

**Example 1 — the min-heap solution on seven schedules** prints:

~~~text
2
1
1
4
3
1
0
~~~

**Example 2 — the chronological sweep with a trace, cross-checked against two other methods on 500 random schedules** prints:

~~~text
sweep over [[0, 30], [5, 10], [15, 20]]
  t=0 start -> rooms in use 1
  t=5 start -> rooms in use 2
  t=10 end   -> rooms in use 1
  t=15 start -> rooms in use 2
  t=20 end   -> rooms in use 1
  t=30 end   -> rooms in use 0
  peak = 2
sweep over [[1, 5], [5, 10]] (end at 5 is processed before start at 5)
  t=1 start -> rooms in use 1
  t=5 end   -> rooms in use 0
  t=5 start -> rooms in use 1
  t=10 end   -> rooms in use 0
  peak = 1
500 random schedules: mismatches 0, sum of answers 1233
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (count at every start) | O(n²) | O(1) | n start times, n meetings checked for each |
| Sort + \`priority_queue\` with \`std::greater\` | O(n log n) | O(n) | the sort, then O(log n) \`pop\`/\`push\` per meeting |
| Sweep over 2n \`std::pair\` events | O(n log n) | O(n) | sorting 2n events dominates |
| Two sorted vectors | O(n log n) | O(n) | two sorts plus one linear walk |

## 8. Edge Cases

- **No meetings** — 0 rooms (\`[]\` in example 1).
- **One meeting** — 1 room.
- **Back-to-back meetings** — \`[[1, 5], [5, 10]]\` needs 1 room when ends free the room at the same instant; the trace in example 2 shows the end at 5 processed before the start at 5.
- **Identical meetings** — \`[[1, 2], [1, 2], [1, 2]]\` needs 3 rooms.
- **Unsorted input** — \`[[7, 10], [2, 4]]\` must be sorted by start first; the answer is 1.
- **Busy middle** — \`[[1, 10], [2, 7], [3, 19], [8, 12], [10, 20], [11, 30]]\` needs 4 rooms: at time 11 the meetings \`[3, 19]\`, \`[8, 12]\`, \`[10, 20]\` and \`[11, 30]\` are all running.

## Common Pitfalls

- **Using the default \`std::priority_queue<int>\`.** It is a max-heap; \`top()\` gives the latest end time and the reuse test becomes wrong.
- **\`top()\` on an empty queue.** Undefined behaviour; check \`empty()\` first.
- **\`<\` instead of \`<=\` in the reuse test.** Back-to-back meetings would need 2 rooms instead of 1.
- **Sweep with starts before ends on ties.** With \`std::pair{time, delta}\`, encode ends as \`-1\` and starts as \`+1\` so the default ordering is right.
- **Printing a value and a side effect in one \`<<\` chain.** C++17 evaluates \`<<\` operands left to right, so text before a function call that prints is output first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The answer:</strong> <span style="color:#f0e2c8;">The number of rooms is the maximum number of meetings running at the same moment.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Heap method:</strong> <span style="color:#f0e2c8;">Sort by start; min-heap of end times; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ends.top() &lt;= start</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>; always <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push(end)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it works:</strong> <span style="color:#f0e2c8;">The room that frees up earliest is the only one worth checking; if it is busy, all rooms are busy.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n log n) time, O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::priority_queue</code> is a max-heap by default — use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::priority_queue&lt;int, std::vector&lt;int&gt;, std::greater&lt;int&gt;&gt;</code>. Events as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::pair{time, delta}</code> sort ends first for free.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::priority_queue</code> a min-heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, by default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code> is the largest element. Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::greater&lt;int&gt;</code> as the comparator for a min-heap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;=</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Half-open meetings: one ending at 5 frees the room for one starting at 5.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you break ties in the event sweep?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{time, -1}</code> for ends and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{time, +1}</code> for starts; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::pair</code> compares <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">second</code>, so ends sort first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return which room each meeting gets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a min-heap of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::pair&lt;int, int&gt;{end, roomId}</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::greater&lt;&gt;</code>; on reuse take the popped room id.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it without a heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: sort starts and ends into two vectors and walk them with two pointers; same O(n log n).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Min-heap (priority queue)** | Smallest element on top; push/pop in O(log n) |
| **Sweep line** | Process sorted start/end events with a running count |
| **Maximum overlap (peak concurrency)** | Most intervals that contain one point in time |
| **Half-open interval** | \`[start, end)\`: includes start, excludes end |

---
**Conclusion:** In C++, the minimum number of meeting rooms is the peak number of overlapping meetings. Sort by start, keep end times in a \`std::priority_queue\` turned into a min-heap with \`std::greater<int>\`, reuse the top room when its end is \`<=\` the new start, and the queue's size is the answer — O(n log n) time, O(n) space. The C++-specific traps are the max-heap default, \`top()\` on an empty queue, and (in tracing code) C++17's left-to-right evaluation of \`<<\` chains.`,
        examples: [
          {
            label: "Sort by start + min-heap of end times (7 schedules)",
            code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <queue>
#include <vector>

// Sort by start; a min-heap holds the end time of every room in use.
int minMeetingRooms(std::vector<std::vector<int>> meetings) {
    std::sort(meetings.begin(), meetings.end(),
              [](const std::vector<int>& a, const std::vector<int>& b) { return a[0] < b[0]; });
    // std::priority_queue is a max-heap by default; std::greater turns it into a min-heap.
    std::priority_queue<int, std::vector<int>, std::greater<int>> ends;
    for (const auto& m : meetings) {
        if (!ends.empty() && ends.top() <= m[0]) {
            ends.pop();              // the earliest-free room is free: reuse it
        }
        ends.push(m[1]);             // the room now runs until our end
    }
    return (int)ends.size();
}

int main() {
    std::cout << minMeetingRooms({{0, 30}, {5, 10}, {15, 20}}) << "\\n";                           // 2
    std::cout << minMeetingRooms({{7, 10}, {2, 4}}) << "\\n";                                      // 1
    std::cout << minMeetingRooms({{1, 5}, {5, 10}}) << "\\n";                                      // 1
    std::cout << minMeetingRooms({{1, 10}, {2, 7}, {3, 19}, {8, 12}, {10, 20}, {11, 30}}) << "\\n"; // 4
    std::cout << minMeetingRooms({{1, 2}, {1, 2}, {1, 2}}) << "\\n";                               // 3
    std::cout << minMeetingRooms({{9, 12}}) << "\\n";                                              // 1
    std::cout << minMeetingRooms({}) << "\\n";                                                     // 0
    return 0;
}`,
          },
          {
            label: "Sweep line trace + random cross-check of three methods",
            code: `#include <algorithm>
#include <iostream>
#include <utility>
#include <vector>

using Meetings = std::vector<std::vector<int>>;

// Chronological sweep: +1 at every start, -1 at every end; ends sort first on ties.
int sweep(const Meetings& meetings, bool trace) {
    std::vector<std::pair<int, int>> events;
    for (const auto& m : meetings) {
        events.push_back({m[0], 1});
        events.push_back({m[1], -1});
    }
    std::sort(events.begin(), events.end()); // pairs compare by time, then -1 (end) before +1 (start)
    int inUse = 0, peak = 0;
    for (const auto& [t, delta] : events) {
        inUse += delta;
        peak = std::max(peak, inUse);
        if (trace) std::cout << "  t=" << t << " " << (delta == 1 ? "start" : "end  ") << " -> rooms in use " << inUse << "\\n";
    }
    return peak;
}

// Sorted starts and sorted ends; a room frees up whenever the next end <= the next start.
int twoPointers(const Meetings& meetings) {
    std::vector<int> starts, ends;
    for (const auto& m : meetings) { starts.push_back(m[0]); ends.push_back(m[1]); }
    std::sort(starts.begin(), starts.end());
    std::sort(ends.begin(), ends.end());
    int rooms = 0;
    size_t j = 0;
    for (int s : starts) {
        if (ends[j] <= s) j++;   // someone left before we arrived: take their room
        else rooms++;            // nobody left yet: a new room
    }
    return rooms;
}

// Peak overlap happens at some start time: count meetings live at each start.
int bruteForce(const Meetings& meetings) {
    int best = 0;
    for (const auto& m : meetings) {
        int live = 0;
        for (const auto& o : meetings) if (o[0] <= m[0] && m[0] < o[1]) live++;
        best = std::max(best, live);
    }
    return best;
}

int main() {
    std::cout << "sweep over [[0, 30], [5, 10], [15, 20]]\\n";
    int p1 = sweep({{0, 30}, {5, 10}, {15, 20}}, true); // call first: the trace prints inside
    std::cout << "  peak = " << p1 << "\\n";
    std::cout << "sweep over [[1, 5], [5, 10]] (end at 5 is processed before start at 5)\\n";
    int p2 = sweep({{1, 5}, {5, 10}}, true);
    std::cout << "  peak = " << p2 << "\\n";

    long long seed = 7;
    int mismatches = 0, total = 0;
    for (int k = 0; k < 500; k++) {
        seed = seed * 48271 % 2147483647LL;
        int n = (int)(seed % 12);
        Meetings meetings;
        for (int i = 0; i < n; i++) {
            seed = seed * 48271 % 2147483647LL;
            int start = (int)(seed % 50);
            seed = seed * 48271 % 2147483647LL;
            meetings.push_back({start, start + 1 + (int)(seed % 15)});
        }
        int a = sweep(meetings, false), b = twoPointers(meetings), c = bruteForce(meetings);
        total += a;
        if (a != b || b != c) mismatches++;
    }
    std::cout << "500 random schedules: mismatches " << mismatches << ", sum of answers " << total << "\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you solve the trapping rain water problem?",
    difficulty: "hard",
    seoDescription: "Trapping rain water: water over a bar is min(left max, right max) minus its height. Four methods to O(1)-space two pointers, verified in four languages.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given a list of non-negative integers where each number is the height of a bar of width 1. Write a Python function that computes how many units of rain water are trapped between the bars."

**What a strong answer should cover:**
- The per-bar formula: water[i] = min(max height to the left, max height to the right) - h[i], with both maxima including i.
- A progression of solutions: brute force O(n²); prefix/suffix max arrays O(n) time and O(n) space; monotonic stack; two pointers O(n) time and O(1) space.
- Why two pointers is correct: settle the lower side, because the other side already has a wall at least that tall.
- Edge cases: fewer than 3 bars, monotonic arrays, flat arrays.
- Python details: \`itertools.accumulate(h, max)\` builds the prefix-max array in one line, slicing like \`max(h[:i + 1])\` hides an O(n) copy, and a negative index such as \`h[-1]\` silently reads the last bar instead of failing.

**Clarifying questions expected:**
- Can heights be negative, and are bars all width 1?
- Is O(n) extra space acceptable?

**Code / implementation expected:** Yes — \`trap(height: list[int]) -> int\` with two pointers, in Python 3.`,
        answer: `**Target Audience:** Intermediate — you should be comfortable with arrays and loops in Python; every technique used is explained here.  
**Difficulty:** Hard  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Build a little wall out of LEGO columns of different heights, all in one row, and pour water over it. Some water runs off the ends, but some gets stuck in the dips between taller columns. How many square units of water stay trapped?

Look at one single column and forget the rest for a moment. Water above it can only rise as high as the **shorter** of the two "walls" that hold it in: the tallest column somewhere to its left and the tallest column somewhere to its right. If the left wall is 2 high and the right wall is 3 high, water over this column rises to 2 — any higher and it spills over the left. Subtract the column's own height and you have the water above it.

That one sentence is the whole problem. The interview is about computing "tallest to my left" and "tallest to my right" for every column without rescanning the array each time — and, for the best answer, without even storing them. It is a classic because it has four correct solutions with different trade-offs, and a strong candidate can explain all of them.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all heights non-negative integers? | Negative heights would break the "water fills up to a wall" picture; integers mean the answer is an exact count. |
| Is every bar width 1? | Then the water above a bar is just a height difference; otherwise multiply by width. |
| How long can the array be, and how tall the bars? | Up to 10^5 bars rules out O(n²); n × maxHeight decides whether the total fits in a 32-bit int. |
| Do you want O(1) extra space, or is O(n) fine? | O(n) allows the simple prefix-array solution; O(1) needs the two-pointer trick. |
| Is this the 1-D version, or a 2-D height grid? | The 2-D version ("Trapping Rain Water II") needs a priority queue and is a different problem. |

## 3. The Core Idea

For every bar \`i\`:

\`water[i] = min(tallest bar in h[0..i], tallest bar in h[i..n-1]) - h[i]\`

The two maxima include bar \`i\` itself, so the result is never negative: if bar \`i\` is the tallest so far, the minimum is at least \`h[i]\` and the water is 0. The total is the sum over all bars.

📌 **Interview term: Elevation map** — the input array: \`h[i]\` is the height of the bar at position \`i\`, every bar 1 unit wide.

📌 **Interview term: Prefix maximum (running max)** — \`leftMax[i]\` = the largest value in \`h[0..i]\`. It is built in one left-to-right pass with \`leftMax[i] = max(leftMax[i-1], h[i])\`; the suffix maximum \`rightMax[i]\` is the same thing from the right.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 232" role="img" aria-label="Elevation map 0 1 0 2 1 0 1 3 2 1 2 1 with 6 units of water trapped between the bars">
  <text class="d-text" x="300" y="30" text-anchor="middle">Height map with trapped water (total 6)</text>
  <text class="d-sub" x="80" y="184" text-anchor="middle">0</text>
  <text class="d-sub" x="80" y="208" text-anchor="middle">i0</text>
  <rect class="d-box-muted" x="102" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="120" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="120" y="208" text-anchor="middle">i1</text>
  <rect class="d-box-accent" x="142" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="160" y="184" text-anchor="middle">0</text>
  <text class="d-sub" x="160" y="208" text-anchor="middle">i2</text>
  <rect class="d-box-muted" x="182" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="200" y="184" text-anchor="middle">2</text>
  <text class="d-sub" x="200" y="208" text-anchor="middle">i3</text>
  <rect class="d-box-muted" x="222" y="128" width="36" height="34" rx="2"/>
  <rect class="d-box-accent" x="222" y="94" width="36" height="34" rx="2"/>
  <text class="d-sub" x="240" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="240" y="208" text-anchor="middle">i4</text>
  <rect class="d-box-accent" x="262" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="280" y="184" text-anchor="middle">0</text>
  <text class="d-sub" x="280" y="208" text-anchor="middle">i5</text>
  <rect class="d-box-muted" x="302" y="128" width="36" height="34" rx="2"/>
  <rect class="d-box-accent" x="302" y="94" width="36" height="34" rx="2"/>
  <text class="d-sub" x="320" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="320" y="208" text-anchor="middle">i6</text>
  <rect class="d-box-muted" x="342" y="60" width="36" height="102" rx="2"/>
  <text class="d-sub" x="360" y="184" text-anchor="middle">3</text>
  <text class="d-sub" x="360" y="208" text-anchor="middle">i7</text>
  <rect class="d-box-muted" x="382" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="400" y="184" text-anchor="middle">2</text>
  <text class="d-sub" x="400" y="208" text-anchor="middle">i8</text>
  <rect class="d-box-muted" x="422" y="128" width="36" height="34" rx="2"/>
  <rect class="d-box-accent" x="422" y="94" width="36" height="34" rx="2"/>
  <text class="d-sub" x="440" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="440" y="208" text-anchor="middle">i9</text>
  <rect class="d-box-muted" x="462" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="480" y="184" text-anchor="middle">2</text>
  <text class="d-sub" x="480" y="208" text-anchor="middle">i10</text>
  <rect class="d-box-muted" x="502" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="520" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="520" y="208" text-anchor="middle">i11</text>
  <path class="d-edge" d="M 50 162 L 550 162"/>
</svg>

The accent blocks are the trapped water: 1 + 1 + 2 + 1 + 1 = 6 units. The bars at both ends and every bar that is the tallest on one side hold nothing.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 240" role="img" aria-label="Bar 5 has height 0. The tallest bar on its left is 2 and on its right is 3, so water rises to 2 and holds 2 units">
  <text class="d-text" x="300" y="24" text-anchor="middle">Bar i5: level = min(2, 3) = 2, water = 2 - 0 = 2</text>
  <text class="d-sub" x="80" y="184" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="102" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="120" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="160" y="184" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="182" y="94" width="36" height="68" rx="2"/>
  <text class="d-text" x="200" y="184" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="222" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="240" y="184" text-anchor="middle">1</text>
  <text class="d-text" x="280" y="184" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="302" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="320" y="184" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="342" y="60" width="36" height="102" rx="2"/>
  <text class="d-text" x="360" y="184" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="382" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="400" y="184" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="422" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="440" y="184" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="462" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="480" y="184" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="502" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="520" y="184" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="262" y="94" width="36" height="68" rx="2"/>
  <path class="d-edge-dashed" d="M 200 94 L 300 94"/>
  <path class="d-edge-dashed" d="M 260 60 L 360 60"/>
  <text class="d-sub" x="200" y="212" text-anchor="middle">tallest left = 2</text>
  <text class="d-sub" x="360" y="212" text-anchor="middle">tallest right = 3</text>
  <text class="d-text d-accent" x="280" y="212" text-anchor="middle">i5</text>
  <path class="d-edge" d="M 50 162 L 550 162"/>
</svg>

Bar 5 has height 0. The tallest bar to its left is 2 (at i3) and to its right is 3 (at i7). Water can only rise to the lower wall, 2, so bar 5 holds 2 − 0 = 2 units.

## 4. Four Solutions, From Slowest to Leanest

**1. Brute force — O(n²) time, O(1) space.** For every bar, scan left for the tallest bar and scan right for the tallest bar, then apply the formula. Correct, simple, and far too slow for 10^5 bars: example 2 counts 9,003,000 inner steps for 3,000 bars.

**2. Prefix and suffix arrays — O(n) time, O(n) space.** Build \`leftMax\` in one pass from the left and \`rightMax\` in one pass from the right, then one more pass applies the formula. Three linear passes instead of n scans. This is the version to write first if the interviewer does not ask for O(1) space; it is the same idea as [the prefix sum technique](/interview-question/what-is-the-prefix-sum-technique), with \`max\` instead of \`+\`.

**3. Monotonic stack — O(n) time, O(n) space.** Keep a stack of indices whose heights are decreasing. When a taller bar arrives, it closes a "pool": pop the bottom, and the water above it is a horizontal layer of width \`i - left - 1\` and height \`min(h[left], h[i]) - h[bottom]\`. This fills water **layer by layer horizontally** instead of column by column. See [what is a monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it); the same stack drives [the largest rectangle in a histogram](/interview-question/how-do-you-find-the-largest-rectangle-in-a-histogram).

**4. Two pointers — O(n) time, O(1) space.** Put one pointer at each end and keep \`leftMax\` and \`rightMax\` as running values. Each step, settle the side whose bar is lower: if \`h[left] < h[right]\`, then somewhere on the right there is a wall at least as tall as \`h[right]\`, which is taller than the left side, so the water at \`left\` is decided by \`leftMax\` alone. Add \`leftMax - h[left]\` and move \`left\` inward. Otherwise do the mirror image on the right.

📌 **Interview term: Two pointers** — two indexes that move towards each other (or in the same direction) through an array, each step discarding one position for good. See [the two-pointer technique](/interview-question/what-is-the-two-pointer-technique).

📌 **Interview term: Monotonic stack** — a stack whose values are kept in increasing or decreasing order; each element is pushed and popped at most once, so a full pass is O(n).

Why is it safe to settle the left bar using only \`leftMax\`, when we have not looked at most of the right side? Because we only do it when the right side is already known to have a wall that is at least as tall — the unknown middle can only make the right wall taller, never shorter. The full argument, with a step-by-step trace and a randomised check against brute force, is in [Trapping Rain Water with two pointers — why does leftMax/rightMax work in O(1) space?](/interview-question/trapping-rain-water-with-two-pointers-why-does-leftmax-rightmax-work-in-o-1-spac). The idea is a close relative of [container with most water](/interview-question/how-do-you-solve-the-container-with-most-water-problem), which also moves the shorter side inward.

## 5. The Code in Python (Two Pointers)

The Python version is a direct translation of the two-pointer idea. Python integers never overflow, so even huge totals are exact, and an empty list needs no special case because \`right\` starts at -1 and the loop condition \`left < right\` is false immediately.

~~~python
def trap(height):
    """Two pointers: always settle the side whose wall is lower."""
    left, right = 0, len(height) - 1
    left_max = right_max = 0
    water = 0
    while left < right:
        if height[left] < height[right]:
            left_max = max(left_max, height[left])
            water += left_max - height[left]    # the right side is known to be taller
            left += 1
        else:
            right_max = max(right_max, height[right])
            water += right_max - height[right]  # the left side is known to be at least as tall
            right -= 1
    return water
~~~

**What to point out in this code:**

- \`left_max = right_max = 0\` chains two assignments to the same immutable int; that is safe for numbers (it would be a trap for lists).
- Updating \`left_max\` **before** subtracting means the result is never negative: if \`height[left]\` is a new maximum, the water is \`0\`.
- **Negative indexes do not fail in Python.** \`h[-1]\` is the last element (in our run, \`[3, 1, 2][-1]\` printed \`2\`). An off-by-one that makes \`right\` reach -1 would silently read the wrong bar instead of raising an error, so be careful with loop bounds.
- Writing \`max(h[:i + 1])\` inside a loop for the O(n)-space version would be O(n²), because every slice copies. The idiomatic way is one \`itertools.accumulate\` call per direction. In our run on the classic map:

~~~python
from itertools import accumulate
left = list(accumulate(h, max))
right = list(accumulate(reversed(h), max))[::-1]
print(left)
print(right)
print(sum(min(l, r) - x for l, r, x in zip(left, right, h)))
~~~

~~~text
[0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3]
[3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 1]
6
~~~

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 computes the classic map with the prefix arrays (so you can see \`leftMax\`, \`rightMax\` and the water per bar), checks that all four methods agree on four more maps, and counts the work on 3,000 bars made by a small deterministic random generator (MINSTD).

**Example 1 — the two-pointer solution on nine inputs** prints:

~~~text
6
9
3
1
0
0
0
0
0
~~~

**Example 2 — per-bar water, four methods that agree, and the work done by brute force vs two pointers** prints:

~~~text
height:    [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]
left max:  [0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3]
right max: [3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 1]
water:     [0, 0, 1, 0, 1, 2, 1, 0, 0, 1, 0, 0] total 6
[4, 2, 0, 3, 2, 5]: brute 9, prefix 9, stack 9, two pointers 9
[5, 4, 1, 2]: brute 1, prefix 1, stack 1, two pointers 1
[3, 0, 0, 2, 0, 4]: brute 10, prefix 10, stack 10, two pointers 10
[0, 7, 1, 4, 6]: brute 7, prefix 7, stack 7, two pointers 7
n = 3000: brute force water 146980 in 9003000 steps; two pointers water 146980 in 2999 steps
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | two scans per bar: 9,003,000 steps for n = 3,000 (example 2) |
| Prefix/suffix max arrays | O(n) | O(n) | three linear passes; two extra lists of n ints |
| Monotonic stack | O(n) | O(n) | each index is pushed once and popped at most once |
| Two pointers | O(n) | O(1) | n − 1 steps (2,999 for n = 3,000), four variables |

## 8. Edge Cases

- **Fewer than 3 bars** (\`[]\`, \`[5]\`) — nothing can be trapped; the loop \`left < right\` never runs. Example 1 returns 0 for both.
- **Strictly rising or falling** (\`[1, 2, 3, 4]\`, \`[4, 3, 2, 1]\`) — there is never a wall on both sides; 0.
- **Flat** (\`[2, 2, 2]\`) — 0; equal heights trap nothing.
- **A single deep valley** (\`[3, 0, 3]\`) — 3 units.
- **Uneven walls** (\`[5, 4, 1, 2]\`) — the level over the 1 is limited by the right wall 2, not by the left 5: 1 unit.
- **Plateaus and several pools** (\`[3, 0, 0, 2, 0, 4]\`) — 10 units; all four methods in example 2 agree.
- **Huge totals** — 30,000 empty bars between two walls of height 100,000 hold 3 × 10^9 units, which does not fit in a 32-bit signed integer.

## Common Pitfalls

- **Forgetting that the maxima include the bar itself.** Using a strict "max to the left of i" without \`h[i]\` can give negative water.
- **Slicing inside the loop.** \`max(h[:i + 1])\` and \`max(h[i:])\` make the "simple" version O(n²) and allocate a new list every time.
- **Moving the wrong pointer.** The side with the *lower* bar is the one that is safe to settle; moving the taller side gives wrong answers (see the proof page).
- **Off-by-one with negative indexes.** \`h[-1]\` silently reads the last bar; a pointer that drifts to -1 produces a wrong answer, not an exception.
- **Writing the water into the input list.** Some solutions reuse \`height\` to store levels; the caller then gets their list back modified. Keep the totals in local variables.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The formula:</strong> <span style="color:#f0e2c8;">Water over bar i is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min(max left, max right) - h[i]</code>, where both maxima include bar i.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. O(n) with arrays:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left = list(accumulate(h, max))</code>, the same from the right, then sum the formula: O(n) time and space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. O(1) space:</strong> <span style="color:#f0e2c8;">Two pointers: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[left] &lt; h[right]</code> settle the left with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left_max</code>, else settle the right with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right_max</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it works:</strong> <span style="color:#f0e2c8;">The lower side is bounded by its own max, because the other side already has a wall at least as tall.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Ints never overflow, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">accumulate(h, max)</code> is the idiomatic prefix max, and avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(h[:i+1])</code> in a loop — it is O(n²).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just compute the water from the global maximum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The level over a bar depends on the tallest wall on each side separately; the global maximum is only one of the two walls.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why move the pointer on the lower side?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its water is limited by its own side, because the other side already has a taller wall. The higher side still depends on bars we have not seen.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you explain the monotonic stack version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep indices of decreasing heights; a taller bar pops the bottom of a pool and adds a horizontal layer of width <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - left - 1</code> and height <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min(h[left], h[i]) - h[bottom]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the 2-D version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A grid of heights: start from all border cells in a min-heap and flood inward from the lowest wall (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code>), O(mn log(mn)).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which solution would you write first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The prefix-max arrays: easy to prove and O(n). Then improve to two pointers if O(1) space is required.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Elevation map** | Array of bar heights, each bar 1 unit wide |
| **Prefix maximum (running max)** | Largest value seen so far from one end |
| **Two pointers** | Two indexes moving inward, each step settling one position |
| **Monotonic stack** | Stack kept in sorted order; each item pushed and popped once |

---
**Conclusion:** In Python, trapping rain water comes down to one formula — water over a bar is the lower of the tallest walls on each side, minus the bar — and four ways to compute those walls. The prefix-max version is two \`accumulate\` calls; the two-pointer version keeps the walls as running values and settles whichever side is lower, for O(n) time and O(1) space. Python's unbounded ints remove overflow worries; slicing inside loops and negative indexes are the language-specific traps.`,
        examples: [
          {
            label: "Two pointers on nine height maps",
            code: `def trap(height):
    """Two pointers: always settle the side whose wall is lower."""
    left, right = 0, len(height) - 1
    left_max = right_max = 0
    water = 0
    while left < right:
        if height[left] < height[right]:
            left_max = max(left_max, height[left])
            water += left_max - height[left]    # the right side is known to be taller
            left += 1
        else:
            right_max = max(right_max, height[right])
            water += right_max - height[right]  # the left side is known to be at least as tall
            right -= 1
    return water


print(trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]))  # 6
print(trap([4, 2, 0, 3, 2, 5]))  # 9
print(trap([3, 0, 3]))  # 3
print(trap([5, 4, 1, 2]))  # 1
print(trap([1, 2, 3, 4]))  # 0
print(trap([4, 3, 2, 1]))  # 0
print(trap([2, 2, 2]))  # 0
print(trap([5]))  # 0
print(trap([]))  # 0`,
          },
          {
            label: "Per-bar water, four methods compared, brute force vs two pointers work",
            code: `def fmt(a):
    return "[" + ", ".join(str(x) for x in a) + "]"


def brute_force(h):
    """For every bar, scan left and right for the tallest walls: O(n^2)."""
    water, steps = 0, 0
    for i in range(len(h)):
        lm = rm = 0
        for j in range(i + 1):
            lm = max(lm, h[j])
            steps += 1
        for j in range(i, len(h)):
            rm = max(rm, h[j])
            steps += 1
        water += min(lm, rm) - h[i]
    return water, steps


def prefix_arrays(h):
    """Precompute left_max[i] and right_max[i]: O(n) time, O(n) extra space."""
    n = len(h)
    left_max, right_max = [0] * n, [0] * n
    for i in range(n):
        left_max[i] = max(h[i], left_max[i - 1] if i > 0 else 0)
    for i in range(n - 1, -1, -1):
        right_max[i] = max(h[i], right_max[i + 1] if i < n - 1 else 0)
    per_bar = [min(left_max[i], right_max[i]) - h[i] for i in range(n)]
    return sum(per_bar), left_max, right_max, per_bar


def monotonic_stack(h):
    """Keep indices of falling bars; a taller bar closes a pool layer by layer."""
    stack, water = [], 0
    for i, x in enumerate(h):
        while stack and h[stack[-1]] < x:
            bottom = stack.pop()
            if not stack:
                break                       # no left wall: water would spill out
            left = stack[-1]
            width = i - left - 1
            water += (min(h[left], x) - h[bottom]) * width
        stack.append(i)
    return water


def two_pointers(h):
    left, right, lm, rm, water, steps = 0, len(h) - 1, 0, 0, 0, 0
    while left < right:
        steps += 1
        if h[left] < h[right]:
            lm = max(lm, h[left])
            water += lm - h[left]
            left += 1
        else:
            rm = max(rm, h[right])
            water += rm - h[right]
            right -= 1
    return water, steps


h = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]
total, lmax, rmax, per_bar = prefix_arrays(h)
print("height:    " + fmt(h))
print("left max:  " + fmt(lmax))
print("right max: " + fmt(rmax))
print("water:     " + fmt(per_bar) + " total " + str(total))

for case in [[4, 2, 0, 3, 2, 5], [5, 4, 1, 2], [3, 0, 0, 2, 0, 4], [0, 7, 1, 4, 6]]:
    print(fmt(case) + ": brute " + str(brute_force(case)[0]) + ", prefix " + str(prefix_arrays(case)[0])
          + ", stack " + str(monotonic_stack(case)) + ", two pointers " + str(two_pointers(case)[0]))

seed, big = 2024, []
for _ in range(3000):
    seed = seed * 48271 % 2147483647
    big.append(seed % 100)
bw, bs = brute_force(big)
tw, ts = two_pointers(big)
print("n = 3000: brute force water " + str(bw) + " in " + str(bs) + " steps; two pointers water " + str(tw) + " in " + str(ts) + " steps")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given an array of non-negative integers where each number is the height of a bar of width 1. Write a JavaScript function that computes how many units of rain water are trapped between the bars."

**What a strong answer should cover:**
- The per-bar formula: water[i] = min(max height to the left, max height to the right) - h[i], with both maxima including i.
- A progression of solutions: brute force O(n²); prefix/suffix max arrays O(n)/O(n); monotonic stack; two pointers O(n) time and O(1) space.
- Why two pointers is correct: settle the lower side, because the other side already has a wall at least that tall.
- Edge cases: fewer than 3 bars, monotonic arrays, flat arrays.
- JavaScript details: reading \`h[-1]\` or past the end returns \`undefined\` instead of throwing, \`Math.max(...h)\` can throw \`RangeError\` on very large arrays, and totals are exact only up to \`Number.MAX_SAFE_INTEGER\`.

**Clarifying questions expected:**
- Can heights be negative, and are bars all width 1?
- Is O(n) extra space acceptable?

**Code / implementation expected:** Yes — \`trap(height)\` with two pointers, in JavaScript.`,
        answer: `**Target Audience:** Intermediate — you should be comfortable with arrays and loops in JavaScript; every technique used is explained here.  
**Difficulty:** Hard  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Build a little wall out of LEGO columns of different heights, all in one row, and pour water over it. Some water runs off the ends, but some gets stuck in the dips between taller columns. How many square units of water stay trapped?

Look at one single column and forget the rest for a moment. Water above it can only rise as high as the **shorter** of the two "walls" that hold it in: the tallest column somewhere to its left and the tallest column somewhere to its right. If the left wall is 2 high and the right wall is 3 high, water over this column rises to 2 — any higher and it spills over the left. Subtract the column's own height and you have the water above it.

That one sentence is the whole problem. The interview is about computing "tallest to my left" and "tallest to my right" for every column without rescanning the array each time — and, for the best answer, without even storing them. It is a classic because it has four correct solutions with different trade-offs, and a strong candidate can explain all of them.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all heights non-negative integers? | Negative heights would break the "water fills up to a wall" picture; integers mean the answer is an exact count. |
| Is every bar width 1? | Then the water above a bar is just a height difference; otherwise multiply by width. |
| How long can the array be, and how tall the bars? | Up to 10^5 bars rules out O(n²); n × maxHeight decides whether the total fits in a 32-bit int. |
| Do you want O(1) extra space, or is O(n) fine? | O(n) allows the simple prefix-array solution; O(1) needs the two-pointer trick. |
| Is this the 1-D version, or a 2-D height grid? | The 2-D version ("Trapping Rain Water II") needs a priority queue and is a different problem. |

## 3. The Core Idea

For every bar \`i\`:

\`water[i] = min(tallest bar in h[0..i], tallest bar in h[i..n-1]) - h[i]\`

The two maxima include bar \`i\` itself, so the result is never negative: if bar \`i\` is the tallest so far, the minimum is at least \`h[i]\` and the water is 0. The total is the sum over all bars.

📌 **Interview term: Elevation map** — the input array: \`h[i]\` is the height of the bar at position \`i\`, every bar 1 unit wide.

📌 **Interview term: Prefix maximum (running max)** — \`leftMax[i]\` = the largest value in \`h[0..i]\`. It is built in one left-to-right pass with \`leftMax[i] = max(leftMax[i-1], h[i])\`; the suffix maximum \`rightMax[i]\` is the same thing from the right.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 232" role="img" aria-label="Elevation map 0 1 0 2 1 0 1 3 2 1 2 1 with 6 units of water trapped between the bars">
  <text class="d-text" x="300" y="30" text-anchor="middle">Height map with trapped water (total 6)</text>
  <text class="d-sub" x="80" y="184" text-anchor="middle">0</text>
  <text class="d-sub" x="80" y="208" text-anchor="middle">i0</text>
  <rect class="d-box-muted" x="102" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="120" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="120" y="208" text-anchor="middle">i1</text>
  <rect class="d-box-accent" x="142" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="160" y="184" text-anchor="middle">0</text>
  <text class="d-sub" x="160" y="208" text-anchor="middle">i2</text>
  <rect class="d-box-muted" x="182" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="200" y="184" text-anchor="middle">2</text>
  <text class="d-sub" x="200" y="208" text-anchor="middle">i3</text>
  <rect class="d-box-muted" x="222" y="128" width="36" height="34" rx="2"/>
  <rect class="d-box-accent" x="222" y="94" width="36" height="34" rx="2"/>
  <text class="d-sub" x="240" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="240" y="208" text-anchor="middle">i4</text>
  <rect class="d-box-accent" x="262" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="280" y="184" text-anchor="middle">0</text>
  <text class="d-sub" x="280" y="208" text-anchor="middle">i5</text>
  <rect class="d-box-muted" x="302" y="128" width="36" height="34" rx="2"/>
  <rect class="d-box-accent" x="302" y="94" width="36" height="34" rx="2"/>
  <text class="d-sub" x="320" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="320" y="208" text-anchor="middle">i6</text>
  <rect class="d-box-muted" x="342" y="60" width="36" height="102" rx="2"/>
  <text class="d-sub" x="360" y="184" text-anchor="middle">3</text>
  <text class="d-sub" x="360" y="208" text-anchor="middle">i7</text>
  <rect class="d-box-muted" x="382" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="400" y="184" text-anchor="middle">2</text>
  <text class="d-sub" x="400" y="208" text-anchor="middle">i8</text>
  <rect class="d-box-muted" x="422" y="128" width="36" height="34" rx="2"/>
  <rect class="d-box-accent" x="422" y="94" width="36" height="34" rx="2"/>
  <text class="d-sub" x="440" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="440" y="208" text-anchor="middle">i9</text>
  <rect class="d-box-muted" x="462" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="480" y="184" text-anchor="middle">2</text>
  <text class="d-sub" x="480" y="208" text-anchor="middle">i10</text>
  <rect class="d-box-muted" x="502" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="520" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="520" y="208" text-anchor="middle">i11</text>
  <path class="d-edge" d="M 50 162 L 550 162"/>
</svg>

The accent blocks are the trapped water: 1 + 1 + 2 + 1 + 1 = 6 units. The bars at both ends and every bar that is the tallest on one side hold nothing.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 240" role="img" aria-label="Bar 5 has height 0. The tallest bar on its left is 2 and on its right is 3, so water rises to 2 and holds 2 units">
  <text class="d-text" x="300" y="24" text-anchor="middle">Bar i5: level = min(2, 3) = 2, water = 2 - 0 = 2</text>
  <text class="d-sub" x="80" y="184" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="102" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="120" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="160" y="184" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="182" y="94" width="36" height="68" rx="2"/>
  <text class="d-text" x="200" y="184" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="222" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="240" y="184" text-anchor="middle">1</text>
  <text class="d-text" x="280" y="184" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="302" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="320" y="184" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="342" y="60" width="36" height="102" rx="2"/>
  <text class="d-text" x="360" y="184" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="382" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="400" y="184" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="422" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="440" y="184" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="462" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="480" y="184" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="502" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="520" y="184" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="262" y="94" width="36" height="68" rx="2"/>
  <path class="d-edge-dashed" d="M 200 94 L 300 94"/>
  <path class="d-edge-dashed" d="M 260 60 L 360 60"/>
  <text class="d-sub" x="200" y="212" text-anchor="middle">tallest left = 2</text>
  <text class="d-sub" x="360" y="212" text-anchor="middle">tallest right = 3</text>
  <text class="d-text d-accent" x="280" y="212" text-anchor="middle">i5</text>
  <path class="d-edge" d="M 50 162 L 550 162"/>
</svg>

Bar 5 has height 0. The tallest bar to its left is 2 (at i3) and to its right is 3 (at i7). Water can only rise to the lower wall, 2, so bar 5 holds 2 − 0 = 2 units.

## 4. Four Solutions, From Slowest to Leanest

**1. Brute force — O(n²) time, O(1) space.** For every bar, scan left for the tallest bar and scan right for the tallest bar, then apply the formula. Correct, simple, and far too slow for 10^5 bars: example 2 counts 9,003,000 inner steps for 3,000 bars.

**2. Prefix and suffix arrays — O(n) time, O(n) space.** Build \`leftMax\` in one pass from the left and \`rightMax\` in one pass from the right, then one more pass applies the formula. Three linear passes instead of n scans. This is the version to write first if the interviewer does not ask for O(1) space; it is the same idea as [the prefix sum technique](/interview-question/what-is-the-prefix-sum-technique), with \`max\` instead of \`+\`.

**3. Monotonic stack — O(n) time, O(n) space.** Keep a stack of indices whose heights are decreasing. When a taller bar arrives, it closes a "pool": pop the bottom, and the water above it is a horizontal layer of width \`i - left - 1\` and height \`min(h[left], h[i]) - h[bottom]\`. This fills water **layer by layer horizontally** instead of column by column. See [what is a monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it); the same stack drives [the largest rectangle in a histogram](/interview-question/how-do-you-find-the-largest-rectangle-in-a-histogram).

**4. Two pointers — O(n) time, O(1) space.** Put one pointer at each end and keep \`leftMax\` and \`rightMax\` as running values. Each step, settle the side whose bar is lower: if \`h[left] < h[right]\`, then somewhere on the right there is a wall at least as tall as \`h[right]\`, which is taller than the left side, so the water at \`left\` is decided by \`leftMax\` alone. Add \`leftMax - h[left]\` and move \`left\` inward. Otherwise do the mirror image on the right.

📌 **Interview term: Two pointers** — two indexes that move towards each other (or in the same direction) through an array, each step discarding one position for good. See [the two-pointer technique](/interview-question/what-is-the-two-pointer-technique).

📌 **Interview term: Monotonic stack** — a stack whose values are kept in increasing or decreasing order; each element is pushed and popped at most once, so a full pass is O(n).

Why is it safe to settle the left bar using only \`leftMax\`, when we have not looked at most of the right side? Because we only do it when the right side is already known to have a wall that is at least as tall — the unknown middle can only make the right wall taller, never shorter. The full argument, with a step-by-step trace and a randomised check against brute force, is in [Trapping Rain Water with two pointers — why does leftMax/rightMax work in O(1) space?](/interview-question/trapping-rain-water-with-two-pointers-why-does-leftmax-rightmax-work-in-o-1-spac). The idea is a close relative of [container with most water](/interview-question/how-do-you-solve-the-container-with-most-water-problem), which also moves the shorter side inward.

## 5. The Code in JavaScript (Two Pointers)

The JavaScript version is a direct translation of the two-pointer idea. For an empty array \`right\` starts at -1, so the \`while (left < right)\` loop never runs and the function returns 0.

~~~javascript
function trap(height) {
  let left = 0, right = height.length - 1;
  let leftMax = 0, rightMax = 0;
  let water = 0;
  while (left < right) {
    if (height[left] < height[right]) {
      leftMax = Math.max(leftMax, height[left]);
      water += leftMax - height[left];     // the right side is known to be taller
      left++;
    } else {
      rightMax = Math.max(rightMax, height[right]);
      water += rightMax - height[right];   // the left side is known to be at least as tall
      right--;
    }
  }
  return water;
}
~~~

**What to point out in this code:**

- \`Math.max(leftMax, height[left])\` takes two numbers. Do **not** compute a whole-array maximum with \`Math.max(...height)\`: spreading a large array passes every element as an argument, and in Node.js 22 in our sandbox a million-element spread threw \`RangeError: Maximum call stack size exceeded\`.
- **Out-of-range reads do not fail.** In our run, \`[][-1]\` was \`undefined\`. Any comparison with \`undefined\` is \`false\` and arithmetic gives \`NaN\`, so an off-by-one pointer produces a silently wrong or \`NaN\` answer, not an exception.
- JavaScript numbers are doubles: integer totals are exact up to \`Number.MAX_SAFE_INTEGER\` (2^53 − 1), far beyond any realistic input, so there is no 32-bit overflow as in Java or C++.
- For the O(n)-space version, \`new Array(n).fill(0)\` creates the \`leftMax\`/\`rightMax\` arrays (example 2); an array from \`new Array(n)\` without \`fill\` has empty slots that \`map\` skips.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 computes the classic map with the prefix arrays (so you can see \`leftMax\`, \`rightMax\` and the water per bar), checks that all four methods agree on four more maps, and counts the work on 3,000 bars made by a small deterministic random generator (MINSTD).

**Example 1 — the two-pointer solution on nine inputs** prints:

~~~text
6
9
3
1
0
0
0
0
0
~~~

**Example 2 — per-bar water, four methods that agree, and the work done by brute force vs two pointers** prints:

~~~text
height:    [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]
left max:  [0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3]
right max: [3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 1]
water:     [0, 0, 1, 0, 1, 2, 1, 0, 0, 1, 0, 0] total 6
[4, 2, 0, 3, 2, 5]: brute 9, prefix 9, stack 9, two pointers 9
[5, 4, 1, 2]: brute 1, prefix 1, stack 1, two pointers 1
[3, 0, 0, 2, 0, 4]: brute 10, prefix 10, stack 10, two pointers 10
[0, 7, 1, 4, 6]: brute 7, prefix 7, stack 7, two pointers 7
n = 3000: brute force water 146980 in 9003000 steps; two pointers water 146980 in 2999 steps
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | two scans per bar: 9,003,000 steps for n = 3,000 (example 2) |
| Prefix/suffix max arrays | O(n) | O(n) | three linear passes; two extra arrays |
| Monotonic stack | O(n) | O(n) | each index is pushed once and popped at most once (an array used with \`push\`/\`pop\`) |
| Two pointers | O(n) | O(1) | n − 1 steps (2,999 for n = 3,000), four variables |

## 8. Edge Cases

- **Fewer than 3 bars** (\`[]\`, \`[5]\`) — nothing can be trapped; the loop \`left < right\` never runs. Example 1 returns 0 for both.
- **Strictly rising or falling** (\`[1, 2, 3, 4]\`, \`[4, 3, 2, 1]\`) — there is never a wall on both sides; 0.
- **Flat** (\`[2, 2, 2]\`) — 0; equal heights trap nothing.
- **A single deep valley** (\`[3, 0, 3]\`) — 3 units.
- **Uneven walls** (\`[5, 4, 1, 2]\`) — the level over the 1 is limited by the right wall 2, not by the left 5: 1 unit.
- **Plateaus and several pools** (\`[3, 0, 0, 2, 0, 4]\`) — 10 units; all four methods in example 2 agree.
- **Huge totals** — 30,000 empty bars between two walls of height 100,000 hold 3 × 10^9 units, which does not fit in a 32-bit signed integer.

## Common Pitfalls

- **Forgetting that the maxima include the bar itself.** Without \`h[i]\` in the max, water can come out negative.
- **\`Math.max(...h.slice(0, i + 1))\` inside a loop.** It is O(n²), allocates a new array every time, and can throw \`RangeError\` for big inputs.
- **Moving the wrong pointer.** Settle the side with the *lower* bar; moving the taller side gives wrong answers (see the proof page).
- **Silent out-of-range reads.** \`h[-1]\` and \`h[h.length]\` are \`undefined\`, so bugs show up as \`NaN\` or wrong numbers rather than errors.
- **\`new Array(n)\` without \`fill\`.** The slots are empty, \`map\`/\`forEach\` skip them, and the arrays stay unset.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The formula:</strong> <span style="color:#f0e2c8;">Water over bar i is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min(max left, max right) - h[i]</code>, where both maxima include bar i.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. O(n) with arrays:</strong> <span style="color:#f0e2c8;">Fill <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax</code> from the left and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rightMax</code> from the right with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max</code>, then sum the formula.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. O(1) space:</strong> <span style="color:#f0e2c8;">Two pointers: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[left] &lt; h[right]</code> settle the left with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax</code>, else settle the right with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rightMax</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it works:</strong> <span style="color:#f0e2c8;">The lower side is bounded by its own max, because the other side already has a wall at least as tall.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">No overflow below 2^53, but out-of-range reads give <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> silently, and never spread a huge array into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why move the pointer on the lower side?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its water is limited by its own side, because the other side already has a taller wall. The higher side still depends on bars we have not seen.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reduce</code> for the prefix max?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, but a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code> loop that writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax[i] = Math.max(leftMax[i - 1], h[i])</code> is clearer and avoids creating intermediate arrays.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you explain the monotonic stack version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep indices of decreasing heights in an array used as a stack; a taller bar pops the bottom of a pool and adds a layer of width <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - left - 1</code> and height <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min(h[left], h[i]) - h[bottom]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the heights are decimals?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The formula still works, but sums of doubles can pick up rounding error; round the final total or work in integer units.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which solution would you write first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The prefix-max arrays: easy to prove and O(n). Then improve to two pointers if O(1) space is required.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Elevation map** | Array of bar heights, each bar 1 unit wide |
| **Prefix maximum (running max)** | Largest value seen so far from one end |
| **Two pointers** | Two indexes moving inward, each step settling one position |
| **Monotonic stack** | Stack kept in sorted order; each item pushed and popped once |

---
**Conclusion:** In JavaScript, trapping rain water comes down to one formula — water over a bar is the lower of the tallest walls on each side, minus the bar — and four ways to compute those walls. The two-pointer version keeps the walls as running values and settles whichever side is lower, for O(n) time and O(1) space. The JavaScript-specific traps are silent \`undefined\` reads when an index is off by one and spreading big arrays into \`Math.max\`; overflow is not a concern below 2^53.`,
        examples: [
          {
            label: "Two pointers on nine height maps",
            code: `// Two pointers: always settle the side whose wall is lower.
function trap(height) {
  let left = 0, right = height.length - 1;
  let leftMax = 0, rightMax = 0;
  let water = 0;
  while (left < right) {
    if (height[left] < height[right]) {
      leftMax = Math.max(leftMax, height[left]);
      water += leftMax - height[left];     // the right side is known to be taller
      left++;
    } else {
      rightMax = Math.max(rightMax, height[right]);
      water += rightMax - height[right];   // the left side is known to be at least as tall
      right--;
    }
  }
  return water;
}

console.log(trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1])); // 6
console.log(trap([4, 2, 0, 3, 2, 5])); // 9
console.log(trap([3, 0, 3])); // 3
console.log(trap([5, 4, 1, 2])); // 1
console.log(trap([1, 2, 3, 4])); // 0
console.log(trap([4, 3, 2, 1])); // 0
console.log(trap([2, 2, 2])); // 0
console.log(trap([5])); // 0
console.log(trap([])); // 0`,
          },
          {
            label: "Per-bar water, four methods compared, brute force vs two pointers work",
            code: `function fmt(a) {
  return "[" + a.join(", ") + "]";
}

// For every bar, scan left and right for the tallest walls: O(n^2).
function bruteForce(h) {
  let water = 0, steps = 0;
  for (let i = 0; i < h.length; i++) {
    let lm = 0, rm = 0;
    for (let j = 0; j <= i; j++) { lm = Math.max(lm, h[j]); steps++; }
    for (let j = i; j < h.length; j++) { rm = Math.max(rm, h[j]); steps++; }
    water += Math.min(lm, rm) - h[i];
  }
  return [water, steps];
}

// Precompute leftMax[i] and rightMax[i]: O(n) time, O(n) extra space.
function prefixArrays(h) {
  const n = h.length;
  const leftMax = new Array(n).fill(0), rightMax = new Array(n).fill(0);
  for (let i = 0; i < n; i++) leftMax[i] = Math.max(h[i], i > 0 ? leftMax[i - 1] : 0);
  for (let i = n - 1; i >= 0; i--) rightMax[i] = Math.max(h[i], i < n - 1 ? rightMax[i + 1] : 0);
  const perBar = h.map((x, i) => Math.min(leftMax[i], rightMax[i]) - x);
  return [perBar.reduce((a, b) => a + b, 0), leftMax, rightMax, perBar];
}

// Keep indices of falling bars; a taller bar closes a pool layer by layer.
function monotonicStack(h) {
  const stack = [];
  let water = 0;
  for (let i = 0; i < h.length; i++) {
    while (stack.length > 0 && h[stack[stack.length - 1]] < h[i]) {
      const bottom = stack.pop();
      if (stack.length === 0) break;     // no left wall: water would spill out
      const left = stack[stack.length - 1];
      const width = i - left - 1;
      water += (Math.min(h[left], h[i]) - h[bottom]) * width;
    }
    stack.push(i);
  }
  return water;
}

function twoPointers(h) {
  let left = 0, right = h.length - 1, lm = 0, rm = 0, water = 0, steps = 0;
  while (left < right) {
    steps++;
    if (h[left] < h[right]) {
      lm = Math.max(lm, h[left]);
      water += lm - h[left];
      left++;
    } else {
      rm = Math.max(rm, h[right]);
      water += rm - h[right];
      right--;
    }
  }
  return [water, steps];
}

const h = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1];
const [total, lmax, rmax, perBar] = prefixArrays(h);
console.log("height:    " + fmt(h));
console.log("left max:  " + fmt(lmax));
console.log("right max: " + fmt(rmax));
console.log("water:     " + fmt(perBar) + " total " + total);

for (const c of [[4, 2, 0, 3, 2, 5], [5, 4, 1, 2], [3, 0, 0, 2, 0, 4], [0, 7, 1, 4, 6]]) {
  console.log(fmt(c) + ": brute " + bruteForce(c)[0] + ", prefix " + prefixArrays(c)[0] +
    ", stack " + monotonicStack(c) + ", two pointers " + twoPointers(c)[0]);
}

let seed = 2024;
const big = [];
for (let i = 0; i < 3000; i++) {
  seed = (seed * 48271) % 2147483647;
  big.push(seed % 100);
}
const [bw, bs] = bruteForce(big);
const [tw, ts] = twoPointers(big);
console.log("n = 3000: brute force water " + bw + " in " + bs + " steps; two pointers water " + tw + " in " + ts + " steps");`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given an int array where each number is the height of a bar of width 1. Write a Java method that computes how many units of rain water are trapped between the bars."

**What a strong answer should cover:**
- The per-bar formula: water[i] = min(max height to the left, max height to the right) - h[i], with both maxima including i.
- A progression of solutions: brute force O(n²); prefix/suffix max arrays O(n)/O(n); monotonic stack; two pointers O(n) time and O(1) space.
- Why two pointers is correct: settle the lower side, because the other side already has a wall at least that tall.
- Edge cases: fewer than 3 bars, monotonic arrays, flat arrays.
- Java details: accumulate the total in a \`long\` (n × maxHeight can pass \`Integer.MAX_VALUE\`, and \`int\` wraps silently), use \`ArrayDeque<Integer>\` rather than the legacy \`Stack\` for the stack version, and remember new \`int[]\` arrays start filled with zeros.

**Clarifying questions expected:**
- Can heights be negative, and are bars all width 1?
- Is O(n) extra space acceptable, and how large can the total be?

**Code / implementation expected:** Yes — \`static long trap(int[] height)\` with two pointers, in Java.`,
        answer: `**Target Audience:** Intermediate — you should be comfortable with arrays and loops in Java; every technique used is explained here.  
**Difficulty:** Hard  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Build a little wall out of LEGO columns of different heights, all in one row, and pour water over it. Some water runs off the ends, but some gets stuck in the dips between taller columns. How many square units of water stay trapped?

Look at one single column and forget the rest for a moment. Water above it can only rise as high as the **shorter** of the two "walls" that hold it in: the tallest column somewhere to its left and the tallest column somewhere to its right. If the left wall is 2 high and the right wall is 3 high, water over this column rises to 2 — any higher and it spills over the left. Subtract the column's own height and you have the water above it.

That one sentence is the whole problem. The interview is about computing "tallest to my left" and "tallest to my right" for every column without rescanning the array each time — and, for the best answer, without even storing them. It is a classic because it has four correct solutions with different trade-offs, and a strong candidate can explain all of them.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all heights non-negative integers? | Negative heights would break the "water fills up to a wall" picture; integers mean the answer is an exact count. |
| Is every bar width 1? | Then the water above a bar is just a height difference; otherwise multiply by width. |
| How long can the array be, and how tall the bars? | Up to 10^5 bars rules out O(n²); n × maxHeight decides whether the total fits in a 32-bit int. |
| Do you want O(1) extra space, or is O(n) fine? | O(n) allows the simple prefix-array solution; O(1) needs the two-pointer trick. |
| Is this the 1-D version, or a 2-D height grid? | The 2-D version ("Trapping Rain Water II") needs a priority queue and is a different problem. |

## 3. The Core Idea

For every bar \`i\`:

\`water[i] = min(tallest bar in h[0..i], tallest bar in h[i..n-1]) - h[i]\`

The two maxima include bar \`i\` itself, so the result is never negative: if bar \`i\` is the tallest so far, the minimum is at least \`h[i]\` and the water is 0. The total is the sum over all bars.

📌 **Interview term: Elevation map** — the input array: \`h[i]\` is the height of the bar at position \`i\`, every bar 1 unit wide.

📌 **Interview term: Prefix maximum (running max)** — \`leftMax[i]\` = the largest value in \`h[0..i]\`. It is built in one left-to-right pass with \`leftMax[i] = max(leftMax[i-1], h[i])\`; the suffix maximum \`rightMax[i]\` is the same thing from the right.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 232" role="img" aria-label="Elevation map 0 1 0 2 1 0 1 3 2 1 2 1 with 6 units of water trapped between the bars">
  <text class="d-text" x="300" y="30" text-anchor="middle">Height map with trapped water (total 6)</text>
  <text class="d-sub" x="80" y="184" text-anchor="middle">0</text>
  <text class="d-sub" x="80" y="208" text-anchor="middle">i0</text>
  <rect class="d-box-muted" x="102" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="120" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="120" y="208" text-anchor="middle">i1</text>
  <rect class="d-box-accent" x="142" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="160" y="184" text-anchor="middle">0</text>
  <text class="d-sub" x="160" y="208" text-anchor="middle">i2</text>
  <rect class="d-box-muted" x="182" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="200" y="184" text-anchor="middle">2</text>
  <text class="d-sub" x="200" y="208" text-anchor="middle">i3</text>
  <rect class="d-box-muted" x="222" y="128" width="36" height="34" rx="2"/>
  <rect class="d-box-accent" x="222" y="94" width="36" height="34" rx="2"/>
  <text class="d-sub" x="240" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="240" y="208" text-anchor="middle">i4</text>
  <rect class="d-box-accent" x="262" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="280" y="184" text-anchor="middle">0</text>
  <text class="d-sub" x="280" y="208" text-anchor="middle">i5</text>
  <rect class="d-box-muted" x="302" y="128" width="36" height="34" rx="2"/>
  <rect class="d-box-accent" x="302" y="94" width="36" height="34" rx="2"/>
  <text class="d-sub" x="320" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="320" y="208" text-anchor="middle">i6</text>
  <rect class="d-box-muted" x="342" y="60" width="36" height="102" rx="2"/>
  <text class="d-sub" x="360" y="184" text-anchor="middle">3</text>
  <text class="d-sub" x="360" y="208" text-anchor="middle">i7</text>
  <rect class="d-box-muted" x="382" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="400" y="184" text-anchor="middle">2</text>
  <text class="d-sub" x="400" y="208" text-anchor="middle">i8</text>
  <rect class="d-box-muted" x="422" y="128" width="36" height="34" rx="2"/>
  <rect class="d-box-accent" x="422" y="94" width="36" height="34" rx="2"/>
  <text class="d-sub" x="440" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="440" y="208" text-anchor="middle">i9</text>
  <rect class="d-box-muted" x="462" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="480" y="184" text-anchor="middle">2</text>
  <text class="d-sub" x="480" y="208" text-anchor="middle">i10</text>
  <rect class="d-box-muted" x="502" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="520" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="520" y="208" text-anchor="middle">i11</text>
  <path class="d-edge" d="M 50 162 L 550 162"/>
</svg>

The accent blocks are the trapped water: 1 + 1 + 2 + 1 + 1 = 6 units. The bars at both ends and every bar that is the tallest on one side hold nothing.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 240" role="img" aria-label="Bar 5 has height 0. The tallest bar on its left is 2 and on its right is 3, so water rises to 2 and holds 2 units">
  <text class="d-text" x="300" y="24" text-anchor="middle">Bar i5: level = min(2, 3) = 2, water = 2 - 0 = 2</text>
  <text class="d-sub" x="80" y="184" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="102" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="120" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="160" y="184" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="182" y="94" width="36" height="68" rx="2"/>
  <text class="d-text" x="200" y="184" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="222" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="240" y="184" text-anchor="middle">1</text>
  <text class="d-text" x="280" y="184" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="302" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="320" y="184" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="342" y="60" width="36" height="102" rx="2"/>
  <text class="d-text" x="360" y="184" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="382" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="400" y="184" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="422" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="440" y="184" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="462" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="480" y="184" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="502" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="520" y="184" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="262" y="94" width="36" height="68" rx="2"/>
  <path class="d-edge-dashed" d="M 200 94 L 300 94"/>
  <path class="d-edge-dashed" d="M 260 60 L 360 60"/>
  <text class="d-sub" x="200" y="212" text-anchor="middle">tallest left = 2</text>
  <text class="d-sub" x="360" y="212" text-anchor="middle">tallest right = 3</text>
  <text class="d-text d-accent" x="280" y="212" text-anchor="middle">i5</text>
  <path class="d-edge" d="M 50 162 L 550 162"/>
</svg>

Bar 5 has height 0. The tallest bar to its left is 2 (at i3) and to its right is 3 (at i7). Water can only rise to the lower wall, 2, so bar 5 holds 2 − 0 = 2 units.

## 4. Four Solutions, From Slowest to Leanest

**1. Brute force — O(n²) time, O(1) space.** For every bar, scan left for the tallest bar and scan right for the tallest bar, then apply the formula. Correct, simple, and far too slow for 10^5 bars: example 2 counts 9,003,000 inner steps for 3,000 bars.

**2. Prefix and suffix arrays — O(n) time, O(n) space.** Build \`leftMax\` in one pass from the left and \`rightMax\` in one pass from the right, then one more pass applies the formula. Three linear passes instead of n scans. This is the version to write first if the interviewer does not ask for O(1) space; it is the same idea as [the prefix sum technique](/interview-question/what-is-the-prefix-sum-technique), with \`max\` instead of \`+\`.

**3. Monotonic stack — O(n) time, O(n) space.** Keep a stack of indices whose heights are decreasing. When a taller bar arrives, it closes a "pool": pop the bottom, and the water above it is a horizontal layer of width \`i - left - 1\` and height \`min(h[left], h[i]) - h[bottom]\`. This fills water **layer by layer horizontally** instead of column by column. See [what is a monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it); the same stack drives [the largest rectangle in a histogram](/interview-question/how-do-you-find-the-largest-rectangle-in-a-histogram).

**4. Two pointers — O(n) time, O(1) space.** Put one pointer at each end and keep \`leftMax\` and \`rightMax\` as running values. Each step, settle the side whose bar is lower: if \`h[left] < h[right]\`, then somewhere on the right there is a wall at least as tall as \`h[right]\`, which is taller than the left side, so the water at \`left\` is decided by \`leftMax\` alone. Add \`leftMax - h[left]\` and move \`left\` inward. Otherwise do the mirror image on the right.

📌 **Interview term: Two pointers** — two indexes that move towards each other (or in the same direction) through an array, each step discarding one position for good. See [the two-pointer technique](/interview-question/what-is-the-two-pointer-technique).

📌 **Interview term: Monotonic stack** — a stack whose values are kept in increasing or decreasing order; each element is pushed and popped at most once, so a full pass is O(n).

Why is it safe to settle the left bar using only \`leftMax\`, when we have not looked at most of the right side? Because we only do it when the right side is already known to have a wall that is at least as tall — the unknown middle can only make the right wall taller, never shorter. The full argument, with a step-by-step trace and a randomised check against brute force, is in [Trapping Rain Water with two pointers — why does leftMax/rightMax work in O(1) space?](/interview-question/trapping-rain-water-with-two-pointers-why-does-leftmax-rightmax-work-in-o-1-spac). The idea is a close relative of [container with most water](/interview-question/how-do-you-solve-the-container-with-most-water-problem), which also moves the shorter side inward.

## 5. The Code in Java (Two Pointers)

The Java version is a direct translation of the two-pointer idea, with one deliberate choice: the total is a \`long\`. Heights and maxima fit in \`int\`, but the sum of many columns may not. For an empty array \`right\` starts at -1, so the loop never runs and the method returns 0.

~~~java
static long trap(int[] height) {
    int left = 0, right = height.length - 1;
    int leftMax = 0, rightMax = 0;
    long water = 0;   // long: n * maxHeight can pass Integer.MAX_VALUE on big inputs
    while (left < right) {
        if (height[left] < height[right]) {
            leftMax = Math.max(leftMax, height[left]);
            water += leftMax - height[left];    // the right side is known to be taller
            left++;
        } else {
            rightMax = Math.max(rightMax, height[right]);
            water += rightMax - height[right];  // the left side is known to be at least as tall
            right--;
        }
    }
    return water;
}
~~~

**What to point out in this code:**

- \`water += leftMax - height[left]\` adds an \`int\` to a \`long\`; Java widens the \`int\` automatically, so there is no cast needed.
- New \`int[]\` arrays (used in example 2 for \`leftMax\`, \`rightMax\`) are filled with \`0\` by the language, so no explicit initialisation is required.
- For the monotonic stack (example 2) use \`ArrayDeque<Integer>\` with \`push\`/\`pop\`/\`peek\`. The old \`java.util.Stack\` extends \`Vector\` and its \`pop\` and \`peek\` are \`synchronized\` (as \`javap java.util.Stack\` shows on JDK 21) — locking you do not need.
- **Why \`long\`?** 30,000 empty bars between two walls of height 100,000 hold 3,000,000,000 units. Java does not throw on integer overflow: in our run, adding the same values into an \`int\` and a \`long\`, the \`int\` silently wrapped around to a negative number:

~~~text
int total:  -1294967296
long total: 3000000000
~~~

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21; the code only uses Java 17 features). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 computes the classic map with the prefix arrays (so you can see \`leftMax\`, \`rightMax\` and the water per bar), checks that all four methods agree on four more maps, and counts the work on 3,000 bars made by a small deterministic random generator (MINSTD).

**Example 1 — the two-pointer solution on nine inputs** prints:

~~~text
6
9
3
1
0
0
0
0
0
~~~

**Example 2 — per-bar water, four methods that agree, and the work done by brute force vs two pointers** prints:

~~~text
height:    [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]
left max:  [0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3]
right max: [3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 1]
water:     [0, 0, 1, 0, 1, 2, 1, 0, 0, 1, 0, 0] total 6
[4, 2, 0, 3, 2, 5]: brute 9, prefix 9, stack 9, two pointers 9
[5, 4, 1, 2]: brute 1, prefix 1, stack 1, two pointers 1
[3, 0, 0, 2, 0, 4]: brute 10, prefix 10, stack 10, two pointers 10
[0, 7, 1, 4, 6]: brute 7, prefix 7, stack 7, two pointers 7
n = 3000: brute force water 146980 in 9003000 steps; two pointers water 146980 in 2999 steps
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | two scans per bar: 9,003,000 steps for n = 3,000 (example 2) |
| Prefix/suffix max arrays | O(n) | O(n) | three linear passes; two extra \`int[]\` arrays |
| Monotonic stack | O(n) | O(n) | each index is pushed once and popped at most once (boxed \`Integer\`s in an \`ArrayDeque\`) |
| Two pointers | O(n) | O(1) | n − 1 steps (2,999 for n = 3,000), a few \`int\`s and one \`long\` |

## 8. Edge Cases

- **Fewer than 3 bars** (\`[]\`, \`[5]\`) — nothing can be trapped; the loop \`left < right\` never runs. Example 1 returns 0 for both.
- **Strictly rising or falling** (\`[1, 2, 3, 4]\`, \`[4, 3, 2, 1]\`) — there is never a wall on both sides; 0.
- **Flat** (\`[2, 2, 2]\`) — 0; equal heights trap nothing.
- **A single deep valley** (\`[3, 0, 3]\`) — 3 units.
- **Uneven walls** (\`[5, 4, 1, 2]\`) — the level over the 1 is limited by the right wall 2, not by the left 5: 1 unit.
- **Plateaus and several pools** (\`[3, 0, 0, 2, 0, 4]\`) — 10 units; all four methods in example 2 agree.
- **Huge totals** — 30,000 empty bars between two walls of height 100,000 hold 3 × 10^9 units, which does not fit in a 32-bit signed integer.

## Common Pitfalls

- **Summing into an \`int\`.** Large inputs overflow silently (our run printed \`-1294967296\` for a true total of 3,000,000,000); use \`long\`.
- **Forgetting that the maxima include the bar itself.** Without \`h[i]\` in the max, water can come out negative.
- **Moving the wrong pointer.** Settle the side with the *lower* bar; moving the taller side gives wrong answers (see the proof page).
- **Using \`java.util.Stack\` for the stack version.** It works but is a synchronised legacy class; \`ArrayDeque\` is the standard choice.
- **Width times height in \`int\` in the stack version.** \`(min - h[bottom]) * width\` can overflow; cast one side to \`long\` first, as example 2 does.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The formula:</strong> <span style="color:#f0e2c8;">Water over bar i is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min(max left, max right) - h[i]</code>, where both maxima include bar i.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. O(n) with arrays:</strong> <span style="color:#f0e2c8;">Fill <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[] leftMax</code> from the left and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rightMax</code> from the right with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max</code>, then sum the formula.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. O(1) space:</strong> <span style="color:#f0e2c8;">Two pointers: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[left] &lt; h[right]</code> settle the left with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax</code>, else settle the right with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rightMax</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it works:</strong> <span style="color:#f0e2c8;">The lower side is bounded by its own max, because the other side already has a wall at least as tall.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Return a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>: n × maxHeight can pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> wraps silently. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> for the stack version.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code> for the total?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With n = 10^5 and heights up to 10^5 the total can reach about 10^10. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> tops out at 2,147,483,647 and wraps to negative numbers without an exception.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why move the pointer on the lower side?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its water is limited by its own side, because the other side already has a taller wall. The higher side still depends on bars we have not seen.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you explain the monotonic stack version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep indices of decreasing heights in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque&lt;Integer&gt;</code>; a taller bar pops the bottom of a pool and adds a layer of width <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - left - 1</code> and height <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min(h[left], h[i]) - h[bottom]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Math.addExact</code> help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArithmeticException</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> overflow, which turns a silent wrong answer into a visible error — useful in tests, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> is the real fix.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which solution would you write first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The prefix-max arrays: easy to prove and O(n). Then improve to two pointers if O(1) space is required.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Elevation map** | Array of bar heights, each bar 1 unit wide |
| **Prefix maximum (running max)** | Largest value seen so far from one end |
| **Two pointers** | Two indexes moving inward, each step settling one position |
| **Monotonic stack** | Stack kept in sorted order; each item pushed and popped once |

---
**Conclusion:** In Java, trapping rain water comes down to one formula — water over a bar is the lower of the tallest walls on each side, minus the bar — and four ways to compute those walls. The two-pointer version keeps the walls as running values and settles whichever side is lower, for O(n) time and O(1) space. The Java-specific point that interviewers like to probe is the return type: sum into a \`long\`, because \`int\` overflow wraps around silently.`,
        examples: [
          {
            label: "Two pointers on nine height maps",
            code: `public class Main {
    // Two pointers: always settle the side whose wall is lower.
    static long trap(int[] height) {
        int left = 0, right = height.length - 1;
        int leftMax = 0, rightMax = 0;
        long water = 0;   // long: n * maxHeight can pass Integer.MAX_VALUE on big inputs
        while (left < right) {
            if (height[left] < height[right]) {
                leftMax = Math.max(leftMax, height[left]);
                water += leftMax - height[left];    // the right side is known to be taller
                left++;
            } else {
                rightMax = Math.max(rightMax, height[right]);
                water += rightMax - height[right];  // the left side is known to be at least as tall
                right--;
            }
        }
        return water;
    }

    public static void main(String[] args) {
        System.out.println(trap(new int[]{0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1})); // 6
        System.out.println(trap(new int[]{4, 2, 0, 3, 2, 5}));                   // 9
        System.out.println(trap(new int[]{3, 0, 3}));                            // 3
        System.out.println(trap(new int[]{5, 4, 1, 2}));                         // 1
        System.out.println(trap(new int[]{1, 2, 3, 4}));                         // 0
        System.out.println(trap(new int[]{4, 3, 2, 1}));                         // 0
        System.out.println(trap(new int[]{2, 2, 2}));                            // 0
        System.out.println(trap(new int[]{5}));                                  // 0
        System.out.println(trap(new int[]{}));                                   // 0
    }
}`,
          },
          {
            label: "Per-bar water, four methods compared, brute force vs two pointers work",
            code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    static String fmt(int[] a) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < a.length; i++) sb.append(i > 0 ? ", " : "").append(a[i]);
        return sb.append("]").toString();
    }

    // For every bar, scan left and right for the tallest walls: O(n^2). Returns {water, steps}.
    static long[] bruteForce(int[] h) {
        long water = 0, steps = 0;
        for (int i = 0; i < h.length; i++) {
            int lm = 0, rm = 0;
            for (int j = 0; j <= i; j++) { lm = Math.max(lm, h[j]); steps++; }
            for (int j = i; j < h.length; j++) { rm = Math.max(rm, h[j]); steps++; }
            water += Math.min(lm, rm) - h[i];
        }
        return new long[]{water, steps};
    }

    // Precompute leftMax[i] and rightMax[i]: O(n) time, O(n) extra space.
    static int[][] prefixArrays(int[] h) {
        int n = h.length;
        int[] leftMax = new int[n], rightMax = new int[n], perBar = new int[n];
        for (int i = 0; i < n; i++) leftMax[i] = Math.max(h[i], i > 0 ? leftMax[i - 1] : 0);
        for (int i = n - 1; i >= 0; i--) rightMax[i] = Math.max(h[i], i < n - 1 ? rightMax[i + 1] : 0);
        int total = 0;
        for (int i = 0; i < n; i++) { perBar[i] = Math.min(leftMax[i], rightMax[i]) - h[i]; total += perBar[i]; }
        return new int[][]{{total}, leftMax, rightMax, perBar};
    }

    // Keep indices of falling bars; a taller bar closes a pool layer by layer.
    static long monotonicStack(int[] h) {
        Deque<Integer> stack = new ArrayDeque<>();   // ArrayDeque, not the legacy Stack class
        long water = 0;
        for (int i = 0; i < h.length; i++) {
            while (!stack.isEmpty() && h[stack.peek()] < h[i]) {
                int bottom = stack.pop();
                if (stack.isEmpty()) break;           // no left wall: water would spill out
                int left = stack.peek();
                int width = i - left - 1;
                water += (long) (Math.min(h[left], h[i]) - h[bottom]) * width;
            }
            stack.push(i);
        }
        return water;
    }

    static long[] twoPointers(int[] h) {
        int left = 0, right = h.length - 1, lm = 0, rm = 0;
        long water = 0, steps = 0;
        while (left < right) {
            steps++;
            if (h[left] < h[right]) {
                lm = Math.max(lm, h[left]);
                water += lm - h[left];
                left++;
            } else {
                rm = Math.max(rm, h[right]);
                water += rm - h[right];
                right--;
            }
        }
        return new long[]{water, steps};
    }

    public static void main(String[] args) {
        int[] h = {0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1};
        int[][] p = prefixArrays(h);
        System.out.println("height:    " + fmt(h));
        System.out.println("left max:  " + fmt(p[1]));
        System.out.println("right max: " + fmt(p[2]));
        System.out.println("water:     " + fmt(p[3]) + " total " + p[0][0]);

        int[][] cases = {{4, 2, 0, 3, 2, 5}, {5, 4, 1, 2}, {3, 0, 0, 2, 0, 4}, {0, 7, 1, 4, 6}};
        for (int[] c : cases) {
            System.out.println(fmt(c) + ": brute " + bruteForce(c)[0] + ", prefix " + prefixArrays(c)[0][0]
                    + ", stack " + monotonicStack(c) + ", two pointers " + twoPointers(c)[0]);
        }

        long seed = 2024;
        int[] big = new int[3000];
        for (int i = 0; i < big.length; i++) {
            seed = seed * 48271 % 2147483647L;
            big[i] = (int) (seed % 100);
        }
        long[] b = bruteForce(big), t = twoPointers(big);
        System.out.println("n = 3000: brute force water " + b[0] + " in " + b[1] + " steps; two pointers water " + t[0] + " in " + t[1] + " steps");
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given a vector of non-negative ints where each number is the height of a bar of width 1. Write a C++ function that computes how many units of rain water are trapped between the bars."

**What a strong answer should cover:**
- The per-bar formula: water[i] = min(max height to the left, max height to the right) - h[i], with both maxima including i.
- A progression of solutions: brute force O(n²); prefix/suffix max arrays O(n)/O(n); monotonic stack; two pointers O(n) time and O(1) space.
- Why two pointers is correct: settle the lower side, because the other side already has a wall at least that tall.
- Edge cases: fewer than 3 bars, monotonic arrays, flat arrays.
- C++ details: \`height.size() - 1\` on an empty vector wraps around to a huge \`size_t\`, so guard or use \`int\` indexes; accumulate in \`long long\` because signed overflow is undefined behaviour; \`operator[]\` does no bounds checking.

**Clarifying questions expected:**
- Can heights be negative, and are bars all width 1?
- Is O(n) extra space acceptable, and how large can the total be?

**Code / implementation expected:** Yes — \`long long trap(const std::vector<int>& height)\` with two pointers, in C++17.`,
        answer: `**Target Audience:** Intermediate — you should be comfortable with arrays and loops in C++; every technique used is explained here.  
**Difficulty:** Hard  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Build a little wall out of LEGO columns of different heights, all in one row, and pour water over it. Some water runs off the ends, but some gets stuck in the dips between taller columns. How many square units of water stay trapped?

Look at one single column and forget the rest for a moment. Water above it can only rise as high as the **shorter** of the two "walls" that hold it in: the tallest column somewhere to its left and the tallest column somewhere to its right. If the left wall is 2 high and the right wall is 3 high, water over this column rises to 2 — any higher and it spills over the left. Subtract the column's own height and you have the water above it.

That one sentence is the whole problem. The interview is about computing "tallest to my left" and "tallest to my right" for every column without rescanning the array each time — and, for the best answer, without even storing them. It is a classic because it has four correct solutions with different trade-offs, and a strong candidate can explain all of them.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all heights non-negative integers? | Negative heights would break the "water fills up to a wall" picture; integers mean the answer is an exact count. |
| Is every bar width 1? | Then the water above a bar is just a height difference; otherwise multiply by width. |
| How long can the array be, and how tall the bars? | Up to 10^5 bars rules out O(n²); n × maxHeight decides whether the total fits in a 32-bit int. |
| Do you want O(1) extra space, or is O(n) fine? | O(n) allows the simple prefix-array solution; O(1) needs the two-pointer trick. |
| Is this the 1-D version, or a 2-D height grid? | The 2-D version ("Trapping Rain Water II") needs a priority queue and is a different problem. |

## 3. The Core Idea

For every bar \`i\`:

\`water[i] = min(tallest bar in h[0..i], tallest bar in h[i..n-1]) - h[i]\`

The two maxima include bar \`i\` itself, so the result is never negative: if bar \`i\` is the tallest so far, the minimum is at least \`h[i]\` and the water is 0. The total is the sum over all bars.

📌 **Interview term: Elevation map** — the input array: \`h[i]\` is the height of the bar at position \`i\`, every bar 1 unit wide.

📌 **Interview term: Prefix maximum (running max)** — \`leftMax[i]\` = the largest value in \`h[0..i]\`. It is built in one left-to-right pass with \`leftMax[i] = max(leftMax[i-1], h[i])\`; the suffix maximum \`rightMax[i]\` is the same thing from the right.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 232" role="img" aria-label="Elevation map 0 1 0 2 1 0 1 3 2 1 2 1 with 6 units of water trapped between the bars">
  <text class="d-text" x="300" y="30" text-anchor="middle">Height map with trapped water (total 6)</text>
  <text class="d-sub" x="80" y="184" text-anchor="middle">0</text>
  <text class="d-sub" x="80" y="208" text-anchor="middle">i0</text>
  <rect class="d-box-muted" x="102" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="120" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="120" y="208" text-anchor="middle">i1</text>
  <rect class="d-box-accent" x="142" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="160" y="184" text-anchor="middle">0</text>
  <text class="d-sub" x="160" y="208" text-anchor="middle">i2</text>
  <rect class="d-box-muted" x="182" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="200" y="184" text-anchor="middle">2</text>
  <text class="d-sub" x="200" y="208" text-anchor="middle">i3</text>
  <rect class="d-box-muted" x="222" y="128" width="36" height="34" rx="2"/>
  <rect class="d-box-accent" x="222" y="94" width="36" height="34" rx="2"/>
  <text class="d-sub" x="240" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="240" y="208" text-anchor="middle">i4</text>
  <rect class="d-box-accent" x="262" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="280" y="184" text-anchor="middle">0</text>
  <text class="d-sub" x="280" y="208" text-anchor="middle">i5</text>
  <rect class="d-box-muted" x="302" y="128" width="36" height="34" rx="2"/>
  <rect class="d-box-accent" x="302" y="94" width="36" height="34" rx="2"/>
  <text class="d-sub" x="320" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="320" y="208" text-anchor="middle">i6</text>
  <rect class="d-box-muted" x="342" y="60" width="36" height="102" rx="2"/>
  <text class="d-sub" x="360" y="184" text-anchor="middle">3</text>
  <text class="d-sub" x="360" y="208" text-anchor="middle">i7</text>
  <rect class="d-box-muted" x="382" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="400" y="184" text-anchor="middle">2</text>
  <text class="d-sub" x="400" y="208" text-anchor="middle">i8</text>
  <rect class="d-box-muted" x="422" y="128" width="36" height="34" rx="2"/>
  <rect class="d-box-accent" x="422" y="94" width="36" height="34" rx="2"/>
  <text class="d-sub" x="440" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="440" y="208" text-anchor="middle">i9</text>
  <rect class="d-box-muted" x="462" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="480" y="184" text-anchor="middle">2</text>
  <text class="d-sub" x="480" y="208" text-anchor="middle">i10</text>
  <rect class="d-box-muted" x="502" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="520" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="520" y="208" text-anchor="middle">i11</text>
  <path class="d-edge" d="M 50 162 L 550 162"/>
</svg>

The accent blocks are the trapped water: 1 + 1 + 2 + 1 + 1 = 6 units. The bars at both ends and every bar that is the tallest on one side hold nothing.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 240" role="img" aria-label="Bar 5 has height 0. The tallest bar on its left is 2 and on its right is 3, so water rises to 2 and holds 2 units">
  <text class="d-text" x="300" y="24" text-anchor="middle">Bar i5: level = min(2, 3) = 2, water = 2 - 0 = 2</text>
  <text class="d-sub" x="80" y="184" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="102" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="120" y="184" text-anchor="middle">1</text>
  <text class="d-sub" x="160" y="184" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="182" y="94" width="36" height="68" rx="2"/>
  <text class="d-text" x="200" y="184" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="222" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="240" y="184" text-anchor="middle">1</text>
  <text class="d-text" x="280" y="184" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="302" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="320" y="184" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="342" y="60" width="36" height="102" rx="2"/>
  <text class="d-text" x="360" y="184" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="382" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="400" y="184" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="422" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="440" y="184" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="462" y="94" width="36" height="68" rx="2"/>
  <text class="d-sub" x="480" y="184" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="502" y="128" width="36" height="34" rx="2"/>
  <text class="d-sub" x="520" y="184" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="262" y="94" width="36" height="68" rx="2"/>
  <path class="d-edge-dashed" d="M 200 94 L 300 94"/>
  <path class="d-edge-dashed" d="M 260 60 L 360 60"/>
  <text class="d-sub" x="200" y="212" text-anchor="middle">tallest left = 2</text>
  <text class="d-sub" x="360" y="212" text-anchor="middle">tallest right = 3</text>
  <text class="d-text d-accent" x="280" y="212" text-anchor="middle">i5</text>
  <path class="d-edge" d="M 50 162 L 550 162"/>
</svg>

Bar 5 has height 0. The tallest bar to its left is 2 (at i3) and to its right is 3 (at i7). Water can only rise to the lower wall, 2, so bar 5 holds 2 − 0 = 2 units.

## 4. Four Solutions, From Slowest to Leanest

**1. Brute force — O(n²) time, O(1) space.** For every bar, scan left for the tallest bar and scan right for the tallest bar, then apply the formula. Correct, simple, and far too slow for 10^5 bars: example 2 counts 9,003,000 inner steps for 3,000 bars.

**2. Prefix and suffix arrays — O(n) time, O(n) space.** Build \`leftMax\` in one pass from the left and \`rightMax\` in one pass from the right, then one more pass applies the formula. Three linear passes instead of n scans. This is the version to write first if the interviewer does not ask for O(1) space; it is the same idea as [the prefix sum technique](/interview-question/what-is-the-prefix-sum-technique), with \`max\` instead of \`+\`.

**3. Monotonic stack — O(n) time, O(n) space.** Keep a stack of indices whose heights are decreasing. When a taller bar arrives, it closes a "pool": pop the bottom, and the water above it is a horizontal layer of width \`i - left - 1\` and height \`min(h[left], h[i]) - h[bottom]\`. This fills water **layer by layer horizontally** instead of column by column. See [what is a monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it); the same stack drives [the largest rectangle in a histogram](/interview-question/how-do-you-find-the-largest-rectangle-in-a-histogram).

**4. Two pointers — O(n) time, O(1) space.** Put one pointer at each end and keep \`leftMax\` and \`rightMax\` as running values. Each step, settle the side whose bar is lower: if \`h[left] < h[right]\`, then somewhere on the right there is a wall at least as tall as \`h[right]\`, which is taller than the left side, so the water at \`left\` is decided by \`leftMax\` alone. Add \`leftMax - h[left]\` and move \`left\` inward. Otherwise do the mirror image on the right.

📌 **Interview term: Two pointers** — two indexes that move towards each other (or in the same direction) through an array, each step discarding one position for good. See [the two-pointer technique](/interview-question/what-is-the-two-pointer-technique).

📌 **Interview term: Monotonic stack** — a stack whose values are kept in increasing or decreasing order; each element is pushed and popped at most once, so a full pass is O(n).

Why is it safe to settle the left bar using only \`leftMax\`, when we have not looked at most of the right side? Because we only do it when the right side is already known to have a wall that is at least as tall — the unknown middle can only make the right wall taller, never shorter. The full argument, with a step-by-step trace and a randomised check against brute force, is in [Trapping Rain Water with two pointers — why does leftMax/rightMax work in O(1) space?](/interview-question/trapping-rain-water-with-two-pointers-why-does-leftmax-rightmax-work-in-o-1-spac). The idea is a close relative of [container with most water](/interview-question/how-do-you-solve-the-container-with-most-water-problem), which also moves the shorter side inward.

## 5. The Code in C++ (Two Pointers)

The C++ version is a direct translation of the two-pointer idea with two deliberate choices: the pointers are \`int\`, not \`size_t\`, and the total is a \`long long\`. The early \`return 0\` for an empty vector is there because of how unsigned arithmetic works, explained below.

~~~cpp
long long trap(const std::vector<int>& height) {
    if (height.empty()) return 0;   // size() - 1 on an empty vector would wrap around (size_t)
    int left = 0, right = (int)height.size() - 1;
    int leftMax = 0, rightMax = 0;
    long long water = 0;            // n * maxHeight can pass INT_MAX on big inputs
    while (left < right) {
        if (height[left] < height[right]) {
            leftMax = std::max(leftMax, height[left]);
            water += leftMax - height[left];     // the right side is known to be taller
            left++;
        } else {
            rightMax = std::max(rightMax, height[right]);
            water += rightMax - height[right];   // the left side is known to be at least as tall
            right--;
        }
    }
    return water;
}
~~~

**What to point out in this code:**

- \`water += leftMax - height[left]\` computes an \`int\` difference and adds it to a \`long long\`; the difference itself is small, so it cannot overflow.
- Signed integer overflow is undefined behaviour in C++, so a total that might pass \`INT_MAX\` must be summed in \`long long\` from the start — not converted afterwards.
- \`operator[]\` performs no bounds check; \`height.at(i)\` throws \`std::out_of_range\` (we checked: \`v.at(5)\` on a two-element vector threw it) and is handy while debugging.
- For the monotonic stack (example 2), a \`std::vector<int>\` with \`push_back\`/\`back\`/\`pop_back\` is the usual stack; \`std::stack<int>\` is an adapter over the same idea.
- **Why the empty check?** \`size()\` returns an unsigned \`size_t\`, so \`size() - 1\` on an empty vector does not give -1. Casting to \`int\` first, \`(int)height.size() - 1\`, gives -1 as intended; the explicit \`if (height.empty()) return 0;\` makes the intent obvious. In our run:

~~~text
v.size() - 1 = 18446744073709551615
~~~

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13 with \`-std=c++17\`). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 computes the classic map with the prefix arrays (so you can see \`leftMax\`, \`rightMax\` and the water per bar), checks that all four methods agree on four more maps, and counts the work on 3,000 bars made by a small deterministic random generator (MINSTD).

**Example 1 — the two-pointer solution on nine inputs** prints:

~~~text
6
9
3
1
0
0
0
0
0
~~~

**Example 2 — per-bar water, four methods that agree, and the work done by brute force vs two pointers** prints:

~~~text
height:    [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]
left max:  [0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3]
right max: [3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 1]
water:     [0, 0, 1, 0, 1, 2, 1, 0, 0, 1, 0, 0] total 6
[4, 2, 0, 3, 2, 5]: brute 9, prefix 9, stack 9, two pointers 9
[5, 4, 1, 2]: brute 1, prefix 1, stack 1, two pointers 1
[3, 0, 0, 2, 0, 4]: brute 10, prefix 10, stack 10, two pointers 10
[0, 7, 1, 4, 6]: brute 7, prefix 7, stack 7, two pointers 7
n = 3000: brute force water 146980 in 9003000 steps; two pointers water 146980 in 2999 steps
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | two scans per bar: 9,003,000 steps for n = 3,000 (example 2) |
| Prefix/suffix max arrays | O(n) | O(n) | three linear passes; two extra vectors |
| Monotonic stack | O(n) | O(n) | each index is pushed once and popped at most once |
| Two pointers | O(n) | O(1) | n − 1 steps (2,999 for n = 3,000), a few \`int\`s and one \`long long\` |

## 8. Edge Cases

- **Fewer than 3 bars** (\`[]\`, \`[5]\`) — nothing can be trapped; the loop \`left < right\` never runs. Example 1 returns 0 for both.
- **Strictly rising or falling** (\`[1, 2, 3, 4]\`, \`[4, 3, 2, 1]\`) — there is never a wall on both sides; 0.
- **Flat** (\`[2, 2, 2]\`) — 0; equal heights trap nothing.
- **A single deep valley** (\`[3, 0, 3]\`) — 3 units.
- **Uneven walls** (\`[5, 4, 1, 2]\`) — the level over the 1 is limited by the right wall 2, not by the left 5: 1 unit.
- **Plateaus and several pools** (\`[3, 0, 0, 2, 0, 4]\`) — 10 units; all four methods in example 2 agree.
- **Huge totals** — 30,000 empty bars between two walls of height 100,000 hold 3 × 10^9 units, which does not fit in a 32-bit signed integer.

## Common Pitfalls

- **\`size_t\` underflow.** \`height.size() - 1\` on an empty vector is 18446744073709551615, not -1; use \`int\` indexes or check \`empty()\` first.
- **Summing into \`int\`.** Signed overflow is undefined behaviour, not a wrap-around you can detect later; use \`long long\`.
- **Forgetting that the maxima include the bar itself.** Without \`h[i]\` in the max, water can come out negative.
- **Moving the wrong pointer.** Settle the side with the *lower* bar; moving the taller side gives wrong answers (see the proof page).
- **Width times height in \`int\` in the stack version.** Cast to \`long long\` before multiplying, as example 2 does.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The formula:</strong> <span style="color:#f0e2c8;">Water over bar i is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min(max left, max right) - h[i]</code>, where both maxima include bar i.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. O(n) with arrays:</strong> <span style="color:#f0e2c8;">Fill <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax</code> from the left and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rightMax</code> from the right with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::max</code>, then sum the formula.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. O(1) space:</strong> <span style="color:#f0e2c8;">Two pointers: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[left] &lt; h[right]</code> settle the left with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax</code>, else settle the right with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rightMax</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it works:</strong> <span style="color:#f0e2c8;">The lower side is bounded by its own max, because the other side already has a wall at least as tall.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> indexes (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size() - 1</code> on an empty vector wraps to a huge number), and sum into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> — signed overflow is undefined behaviour.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">v.size() - 1</code> give for an empty vector?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t</code> is unsigned, so it wraps to the largest value (18446744073709551615 on our 64-bit run). Guard with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">empty()</code> or cast to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why move the pointer on the lower side?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its water is limited by its own side, because the other side already has a taller wall. The higher side still depends on bars we have not seen.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you explain the monotonic stack version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep indices of decreasing heights in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt;</code>; a taller bar pops the bottom of a pool and adds a layer of width <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - left - 1</code> and height <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min(h[left], h[i]) - h[bottom]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long long</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">n × maxHeight can exceed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INT_MAX</code>, and signed overflow is undefined behaviour — the compiler may assume it never happens.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which solution would you write first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The prefix-max arrays: easy to prove and O(n). Then improve to two pointers if O(1) space is required.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Elevation map** | Array of bar heights, each bar 1 unit wide |
| **Prefix maximum (running max)** | Largest value seen so far from one end |
| **Two pointers** | Two indexes moving inward, each step settling one position |
| **Monotonic stack** | Stack kept in sorted order; each item pushed and popped once |

---
**Conclusion:** In C++, trapping rain water comes down to one formula — water over a bar is the lower of the tallest walls on each side, minus the bar — and four ways to compute those walls. The two-pointer version keeps the walls as running values and settles whichever side is lower, for O(n) time and O(1) space. The C++-specific traps are unsigned \`size()\` arithmetic on an empty vector and signed overflow in the total, which is why the function uses \`int\` indexes and returns \`long long\`.`,
        examples: [
          {
            label: "Two pointers on nine height maps",
            code: `#include <algorithm>
#include <iostream>
#include <vector>

// Two pointers: always settle the side whose wall is lower.
long long trap(const std::vector<int>& height) {
    if (height.empty()) return 0;   // size() - 1 on an empty vector would wrap around (size_t)
    int left = 0, right = (int)height.size() - 1;
    int leftMax = 0, rightMax = 0;
    long long water = 0;            // n * maxHeight can pass INT_MAX on big inputs
    while (left < right) {
        if (height[left] < height[right]) {
            leftMax = std::max(leftMax, height[left]);
            water += leftMax - height[left];     // the right side is known to be taller
            left++;
        } else {
            rightMax = std::max(rightMax, height[right]);
            water += rightMax - height[right];   // the left side is known to be at least as tall
            right--;
        }
    }
    return water;
}

int main() {
    std::cout << trap({0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1}) << "\\n"; // 6
    std::cout << trap({4, 2, 0, 3, 2, 5}) << "\\n";                   // 9
    std::cout << trap({3, 0, 3}) << "\\n";                            // 3
    std::cout << trap({5, 4, 1, 2}) << "\\n";                         // 1
    std::cout << trap({1, 2, 3, 4}) << "\\n";                         // 0
    std::cout << trap({4, 3, 2, 1}) << "\\n";                         // 0
    std::cout << trap({2, 2, 2}) << "\\n";                            // 0
    std::cout << trap({5}) << "\\n";                                  // 0
    std::cout << trap({}) << "\\n";                                   // 0
    return 0;
}`,
          },
          {
            label: "Per-bar water, four methods compared, brute force vs two pointers work",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

std::string fmt(const std::vector<int>& a) {
    std::string s = "[";
    for (size_t i = 0; i < a.size(); i++) s += (i > 0 ? ", " : "") + std::to_string(a[i]);
    return s + "]";
}

// For every bar, scan left and right for the tallest walls: O(n^2). Returns {water, steps}.
std::pair<long long, long long> bruteForce(const std::vector<int>& h) {
    long long water = 0, steps = 0;
    int n = (int)h.size();
    for (int i = 0; i < n; i++) {
        int lm = 0, rm = 0;
        for (int j = 0; j <= i; j++) { lm = std::max(lm, h[j]); steps++; }
        for (int j = i; j < n; j++) { rm = std::max(rm, h[j]); steps++; }
        water += std::min(lm, rm) - h[i];
    }
    return {water, steps};
}

struct Prefix { long long total; std::vector<int> leftMax, rightMax, perBar; };

// Precompute leftMax[i] and rightMax[i]: O(n) time, O(n) extra space.
Prefix prefixArrays(const std::vector<int>& h) {
    int n = (int)h.size();
    Prefix p{0, std::vector<int>(n), std::vector<int>(n), std::vector<int>(n)};
    for (int i = 0; i < n; i++) p.leftMax[i] = std::max(h[i], i > 0 ? p.leftMax[i - 1] : 0);
    for (int i = n - 1; i >= 0; i--) p.rightMax[i] = std::max(h[i], i < n - 1 ? p.rightMax[i + 1] : 0);
    for (int i = 0; i < n; i++) { p.perBar[i] = std::min(p.leftMax[i], p.rightMax[i]) - h[i]; p.total += p.perBar[i]; }
    return p;
}

// Keep indices of falling bars; a taller bar closes a pool layer by layer.
long long monotonicStack(const std::vector<int>& h) {
    std::vector<int> stack;
    long long water = 0;
    for (int i = 0; i < (int)h.size(); i++) {
        while (!stack.empty() && h[stack.back()] < h[i]) {
            int bottom = stack.back();
            stack.pop_back();
            if (stack.empty()) break;          // no left wall: water would spill out
            int left = stack.back();
            int width = i - left - 1;
            water += (long long)(std::min(h[left], h[i]) - h[bottom]) * width;
        }
        stack.push_back(i);
    }
    return water;
}

std::pair<long long, long long> twoPointers(const std::vector<int>& h) {
    int left = 0, right = (int)h.size() - 1, lm = 0, rm = 0;
    long long water = 0, steps = 0;
    while (left < right) {
        steps++;
        if (h[left] < h[right]) {
            lm = std::max(lm, h[left]);
            water += lm - h[left];
            left++;
        } else {
            rm = std::max(rm, h[right]);
            water += rm - h[right];
            right--;
        }
    }
    return {water, steps};
}

int main() {
    std::vector<int> h = {0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1};
    Prefix p = prefixArrays(h);
    std::cout << "height:    " << fmt(h) << "\\n";
    std::cout << "left max:  " << fmt(p.leftMax) << "\\n";
    std::cout << "right max: " << fmt(p.rightMax) << "\\n";
    std::cout << "water:     " << fmt(p.perBar) << " total " << p.total << "\\n";

    std::vector<std::vector<int>> cases = {{4, 2, 0, 3, 2, 5}, {5, 4, 1, 2}, {3, 0, 0, 2, 0, 4}, {0, 7, 1, 4, 6}};
    for (const auto& c : cases) {
        std::cout << fmt(c) << ": brute " << bruteForce(c).first << ", prefix " << prefixArrays(c).total
                  << ", stack " << monotonicStack(c) << ", two pointers " << twoPointers(c).first << "\\n";
    }

    long long seed = 2024;
    std::vector<int> big;
    for (int i = 0; i < 3000; i++) {
        seed = seed * 48271 % 2147483647LL;
        big.push_back((int)(seed % 100));
    }
    auto [bw, bs] = bruteForce(big);
    auto [tw, ts] = twoPointers(big);
    std::cout << "n = 3000: brute force water " << bw << " in " << bs << " steps; two pointers water " << tw << " in " << ts << " steps\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "Trapping Rain Water with two pointers — why does leftMax/rightMax work in O(1) space?",
    difficulty: "medium",
    seoDescription: "Why two-pointer Trapping Rain Water is correct: leftMax <= rightMax bounds the right wall, so each bar settles in O(1) space. Proof plus tests.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You wrote the two-pointer solution to Trapping Rain Water. Convince me it is correct: the left pointer has not seen most of the right side, so why is leftMax enough to decide the water there? Walk me through it with Python code."

**What a strong answer should cover:**
- The per-bar formula: water = min(max to the left, max to the right) - h[i], and that the left pointer knows its left max exactly.
- The key bound: the right max seen so far is a lower bound on the true right wall of L, because unseen bars can only make it taller.
- The invariant: if leftMax <= rightMax, then level(L) = leftMax exactly, so L can be settled; otherwise settle R symmetrically.
- Why comparing heights (h[L] < h[R]) is also correct, and what goes wrong if you move the taller side.
- Complexity: each step settles one bar, so O(n) time; four variables, so O(1) extra space.
- Python details: Python ints cannot overflow, so the proof is the only thing to get right; tuple assignment like \`side, i, used = "L", lo, left_max\` keeps the branch short, and a randomised test against a brute force is a few lines with plain lists.

**Code / implementation expected:** Optional — the two-pointer loop in Python 3 plus a short argument; a brute-force cross-check is a strong bonus.`,
        answer: `**Target Audience:** Intermediate — you have seen the trapping rain water problem and can read Python; the proof is explained from scratch.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two friends walk towards each other along a row of walls of different heights, one from each end, to measure how much rain the dips between the walls will hold. Each friend remembers only one number: the tallest wall they have passed so far. They never look ahead, never write anything down, and never go back.

At first this sounds impossible. The water above a spot depends on the tallest wall to its left **and** the tallest wall to its right — and the left friend has not seen anything on the right yet. Yet the two-pointer solution does exactly this and gets the right answer, using four variables in total.

The trick is a promise. The friend who is currently looking at the lower side can say: "My partner has already passed a wall at least as tall as my best one. So whatever is still unseen in the middle, the right side of my spot is high enough, and the water here is limited only by *my* tallest wall." Interviewers ask this follow-up because many candidates memorise the code for [trapping rain water](/interview-question/how-do-you-solve-the-trapping-rain-water-problem) but cannot explain why it is correct. Being able to state the invariant is what separates "I remembered it" from "I understand it".

## 2. The Problem in One Paragraph

Each array value \`h[i]\` is the height of a bar of width 1. The water above bar \`i\` is

\`level(i) - h[i]\`, where \`level(i) = min(trueLeft(i), trueRight(i))\`,

\`trueLeft(i)\` is the maximum of \`h[0..i]\` and \`trueRight(i)\` is the maximum of \`h[i..n-1]\` (both include bar \`i\`). The simple O(n)-space solution precomputes both arrays; the full problem and all four solutions are in [How do you solve the trapping rain water problem?](/interview-question/how-do-you-solve-the-trapping-rain-water-problem). This page answers one question: **how can we get \`level(i)\` without storing either array?**

## 3. The Invariant That Makes It Work

The algorithm keeps two pointers, \`L\` moving right and \`R\` moving left, and two running maxima:

- \`leftMax\` = the maximum of \`h[0..L]\` — this is **exactly** \`trueLeft(L)\`, because every bar from 0 to \`L\` has been seen.
- \`rightMax\` = the maximum of \`h[R..n-1]\` — this is exactly \`trueRight(R)\`.

What we do **not** know is \`trueRight(L)\`: it is the maximum of \`h[L..n-1]\`, and the middle part \`h[L+1..R-1]\` has not been read yet. But we do know a lower bound for it: \`h[L..n-1]\` contains \`h[R..n-1]\`, so

\`trueRight(L) >= rightMax\`.

📌 **Interview term: Loop invariant** — a statement that is true before and after every iteration of a loop. Here: \`leftMax\` is the exact left wall of \`L\`, \`rightMax\` is the exact right wall of \`R\`, and every bar outside \`[L, R]\` already has its correct water added.

📌 **Interview term: Lower bound** — a value that something is known to be at least. \`rightMax\` is a lower bound for the true right wall of \`L\`: unseen bars can only make that wall taller.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="Bars left of L are settled with running max leftMax, bars right of R are settled with running max rightMax, and the middle is unknown">
  <defs>
    <marker id="b10q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="24" text-anchor="middle">What the algorithm knows at one moment</text>
  <rect class="d-box-muted" x="20" y="50" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="80" text-anchor="middle">settled left</text>
  <text class="d-sub" x="105" y="102" text-anchor="middle">max so far: leftMax</text>
  <rect class="d-box-accent" x="210" y="50" width="70" height="70" rx="10"/>
  <text class="d-text" x="245" y="90" text-anchor="middle">L</text>
  <rect class="d-box" x="300" y="50" width="120" height="70" rx="10"/>
  <text class="d-text" x="360" y="80" text-anchor="middle">not seen yet</text>
  <text class="d-sub" x="360" y="102" text-anchor="middle">any heights</text>
  <rect class="d-box-accent" x="440" y="50" width="70" height="70" rx="10"/>
  <text class="d-text" x="475" y="90" text-anchor="middle">R</text>
  <rect class="d-box-muted" x="530" y="50" width="170" height="70" rx="10"/>
  <text class="d-text" x="615" y="80" text-anchor="middle">settled right</text>
  <text class="d-sub" x="615" y="102" text-anchor="middle">max so far: rightMax</text>
  <path class="d-edge" d="M 245 124 L 245 156" marker-end="url(#b10q5-arrow)"/>
  <path class="d-edge" d="M 475 124 L 475 156" marker-end="url(#b10q5-arrow)"/>
  <rect class="d-box-accent" x="140" y="160" width="440" height="66" rx="10"/>
  <text class="d-text" x="360" y="186" text-anchor="middle">true right wall of L = max of h from L to the end</text>
  <text class="d-sub" x="360" y="210" text-anchor="middle">that range contains R and everything after it, so it is at least rightMax</text>
</svg>

Now the decision rule. **If \`leftMax <= rightMax\`:**

\`leftMax <= rightMax <= trueRight(L)\`, so \`level(L) = min(leftMax, trueRight(L)) = leftMax\`.

The water at \`L\` is exactly \`leftMax - h[L]\`, no matter what the unseen middle contains. We add it and move \`L\` one step right. **Otherwise** (\`rightMax < leftMax\`), the mirror argument settles \`R\` with \`rightMax - h[R]\` and moves \`R\` left.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="leftMax is at most rightMax, which is at most the true right wall, so the water level at L is exactly leftMax">
  <defs>
    <marker id="b10q5-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="60" text-anchor="middle">leftMax</text>
  <text class="d-sub" x="95" y="82" text-anchor="middle">exact left wall of L</text>
  <text class="d-text" x="200" y="70" text-anchor="middle">&lt;=</text>
  <rect class="d-box" x="230" y="30" width="150" height="70" rx="10"/>
  <text class="d-text" x="305" y="60" text-anchor="middle">rightMax</text>
  <text class="d-sub" x="305" y="82" text-anchor="middle">the branch condition</text>
  <text class="d-text" x="410" y="70" text-anchor="middle">&lt;=</text>
  <rect class="d-box" x="440" y="30" width="170" height="70" rx="10"/>
  <text class="d-text" x="525" y="60" text-anchor="middle">true right wall</text>
  <text class="d-sub" x="525" y="82" text-anchor="middle">unknown, but at least this</text>
  <path class="d-edge" d="M 525 104 L 525 140 L 380 140" marker-end="url(#b10q5-arrow2)"/>
  <rect class="d-box-accent" x="150" y="120" width="226" height="56" rx="10"/>
  <text class="d-text" x="263" y="146" text-anchor="middle">level at L = leftMax</text>
  <text class="d-sub" x="263" y="166" text-anchor="middle">min of the two walls</text>
</svg>

The unseen middle can only *raise* the true right wall, and raising the higher of two walls never changes a minimum that is already decided by the lower one. That is the whole proof.

📌 **Interview term: Settling a bar** — adding a bar's final water to the total and never looking at it again. Each loop step settles exactly one bar, so the loop runs n times.

**Why only O(1) space.** We never need the full \`leftMax\`/\`rightMax\` arrays, because each bar is settled at the moment its own side's running maximum is the deciding wall. Four integers (\`L\`, \`R\`, \`leftMax\`, \`rightMax\`) plus the total are all the state there is.

## 4. Two Correct Ways to Write the Branch

Most published code compares **heights**, not maxima:

- *Rule "maxes"* (the proof above): update both maxima, then settle the side with the smaller running max.
- *Rule "heights"* (the common code): if \`h[L] < h[R]\`, settle \`L\` with \`leftMax\`, else settle \`R\` with \`rightMax\`.

Why is the heights rule also safe? When we settle \`L\` under it, \`h[L] < h[R]\`, so the current bar on the right is already taller than the current left bar. And every earlier left bar was settled for the same reason — at that time it was smaller than some right bar at a position \`>= R\`, which is still to the right of \`L\`. So everything that built \`leftMax\` is smaller than some bar in \`h[R..n-1]\`, which gives \`leftMax <= trueRight(L)\` again. Example 2 confirms both rules give the right answer on 3,000 random arrays and that the invariant \`leftMax <= trueRight(L)\` (and its mirror) never fails.

**What breaks it.** Flip the rule — settle the side with the *larger* running max — and the bound no longer holds: the level we use can be higher than the true wall on the other side. Example 2 runs that wrong rule too: 2,543 of the 3,000 arrays get a wrong total.

📌 **Interview term: Proof by invariant** — showing an algorithm is correct by stating a property, proving the first step makes it true, and proving each step keeps it true. When the loop ends, the property gives the answer.

This is the same shape of argument as in [container with most water](/interview-question/how-do-you-solve-the-container-with-most-water-problem): move the side that is limiting, because the other side cannot make things worse for it. See also [the two-pointer technique](/interview-question/what-is-the-two-pointer-technique).

## 5. A Trace You Can Check by Hand

Example 1 runs the "maxes" rule on \`[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]\` with a \`while L <= R\` loop, so all 12 bars are settled (including the final one where the pointers meet). For each step it prints which side was settled, both running maxima, the level used, and — only for checking — the true level \`min(trueLeft(i), trueRight(i))\` computed separately with prefix arrays. In every line, the level used equals the true level, even though the algorithm itself never looks at the middle. The full output is in the Verified section.

## 6. The Code in Python

Here is the "maxes" version of the loop with the trace printing (example 1). The \`true_levels\` list is only used to print a check column; the algorithm itself uses four variables.

~~~python
def trap_traced(h):
    level = true_levels(h)  # only used to check each step, not by the algorithm
    lo, hi = 0, len(h) - 1
    left_max = right_max = water = 0
    while lo <= hi:
        left_max = max(left_max, h[lo])
        right_max = max(right_max, h[hi])
        if left_max <= right_max:
            # left_max is the smaller wall, and the real right wall of lo is >= right_max
            side, i, used = "L", lo, left_max
            lo += 1
        else:
            side, i, used = "R", hi, right_max
            hi -= 1
        water += used - h[i]
        print("settle " + side + " bar " + str(i) + ": leftMax=" + str(left_max) + " rightMax=" + str(right_max)
              + " level " + str(used) + " (true " + str(level[i]) + ") water +" + str(used - h[i]) + " = " + str(water))
    return water
~~~

**What to point out in this code:**

- Both maxima are updated **before** the decision, so \`left_max\` already includes \`h[lo]\`. That is why \`used - h[i]\` is never negative.
- \`while lo <= hi\` settles every bar, including the one where the pointers meet; the common \`while lo < hi\` form skips that last bar, which is fine because it is a tallest bar and holds no water.
- Tuple assignment \`side, i, used = "L", lo, left_max\` records which bar was settled in one line, so the shared code after the \`if\` handles both sides.
- Python integers are arbitrary precision, so there is no overflow to reason about — the invariant is the only correctness argument needed.
- Example 2 is the empirical half of the proof: a brute force using slices (\`max(h[: i + 1])\`, \`max(h[i:])\`) is O(n²) but obviously correct, and it is compared with the two-pointer result on 3,000 random arrays.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 builds 3,000 arrays (length 0–15, heights 0–9) with a small deterministic generator (MINSTD), so every language tests the same inputs. For each settled bar it also checks the invariant: the level used must not exceed the true wall on the other side.

**Example 1 — a step-by-step trace that compares each settled level with the true level** prints:

~~~text
settle L bar 0: leftMax=0 rightMax=1 level 0 (true 0) water +0 = 0
settle L bar 1: leftMax=1 rightMax=1 level 1 (true 1) water +0 = 0
settle L bar 2: leftMax=1 rightMax=1 level 1 (true 1) water +1 = 1
settle R bar 11: leftMax=2 rightMax=1 level 1 (true 1) water +0 = 1
settle L bar 3: leftMax=2 rightMax=2 level 2 (true 2) water +0 = 1
settle L bar 4: leftMax=2 rightMax=2 level 2 (true 2) water +1 = 2
settle L bar 5: leftMax=2 rightMax=2 level 2 (true 2) water +2 = 4
settle L bar 6: leftMax=2 rightMax=2 level 2 (true 2) water +1 = 5
settle R bar 10: leftMax=3 rightMax=2 level 2 (true 2) water +0 = 5
settle R bar 9: leftMax=3 rightMax=2 level 2 (true 2) water +1 = 6
settle R bar 8: leftMax=3 rightMax=2 level 2 (true 2) water +0 = 6
settle L bar 7: leftMax=3 rightMax=3 level 3 (true 3) water +0 = 6
total = 6
~~~

**Example 2 — 3,000 random arrays checked against brute force, for two correct rules and one wrong rule** prints:

~~~text
3000 random arrays (length 0-15, heights 0-9) checked against brute force
  rule heights: wrong answers 0, invariant violations 0
  rule maxes: wrong answers 0, invariant violations 0
  rule wrong: wrong answers 2543, invariant violations 9791
~~~

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Two pointers (any correct rule) | O(n) | O(1) | each iteration settles one bar; state is L, R, leftMax, rightMax, total |
| Prefix/suffix arrays | O(n) | O(n) | stores trueLeft and trueRight for every bar |
| Brute force used as the test oracle | O(n²) | O(n) per slice | two slices and two \`max\` scans per bar |

## Common Pitfalls

- **Settling the side with the larger max.** It breaks the bound; example 2 shows 2,543 wrong answers out of 3,000.
- **Using \`min(left_max, right_max)\` as the level for both sides.** When you settle L the level is \`left_max\`, not the minimum of two values one of which may not bound L.
- **Updating the max after subtracting.** Then \`left_max - h[lo]\` can be negative when \`h[lo]\` is a new maximum.
- **Claiming correctness from one example.** A trace convinces you; a randomised check against brute force (example 2) is what catches a wrong rule.
- **Mixing the two loop forms.** \`while lo <= hi\` with the heights rule must still settle the meeting bar from one side only; settling it twice double-counts.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What each pointer knows:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax</code> is exactly the tallest bar in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[0..L]</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rightMax</code> is exactly the tallest in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[R..n-1]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The bound:</strong> <span style="color:#f0e2c8;">The true right wall of L is the max of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[L..n-1]</code>, which contains <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[R..n-1]</code>, so it is at least <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rightMax</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The step:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax &lt;= rightMax</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax &lt;= trueRight(L)</code>, so the level at L is exactly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax</code>: add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax - h[L]</code>, move L.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Space:</strong> <span style="color:#f0e2c8;">Each bar is settled the moment its own side decides it, so no arrays are needed: O(1) space, O(n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Evidence:</strong> <span style="color:#f0e2c8;">In Python I would back this with a 10-line random test against the O(n²) brute force — both correct rules give 0 mismatches.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you ignore the unseen middle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unseen bars can only make the right wall taller. The level is a minimum, and the minimum is already the left wall, so a taller right wall changes nothing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The usual code compares <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">h[L] &lt; h[R]</code>, not the maxima. Is that the same?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a different rule that is also correct: every bar that formed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax</code> was smaller than some bar at or right of R, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax &lt;= trueRight(L)</code> still holds.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you move the taller side instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then the level you use can exceed the true wall on the other side. In our random test that rule was wrong on 2,543 of 3,000 arrays.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every iteration settles one bar and moves one pointer inward, so the loop runs at most n times.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it in an interview?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write the obvious brute force with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(h[:i+1])</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(h[i:])</code>, run both on random lists, and compare totals.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Loop invariant** | A statement true before and after every loop iteration |
| **Lower bound** | A value something is known to be at least |
| **Settling a bar** | Adding its final water and never revisiting it |
| **Proof by invariant** | Prove a property starts true and every step keeps it true |

---
**Conclusion:** The two-pointer solution works because of one inequality chain: \`leftMax <= rightMax <= trueRight(L)\`. \`leftMax\` is the exact left wall of \`L\`, \`rightMax\` is a lower bound on its right wall, so when the left max is the smaller one it *is* the water level, whatever the unseen middle holds. Each step settles one bar from the side whose wall decides it, so the algorithm needs O(n) time and only four variables. In Python, the trace and the 3,000-array random test make the argument concrete: both correct rules match brute force every time, and the flipped rule fails on most inputs.`,
        examples: [
          {
            label: "Traced two-pointer run: level used vs true level for every bar",
            code: `def true_levels(h):
    """Water level over each bar = min(tallest bar to its left, tallest to its right)."""
    n = len(h)
    left, right = [0] * n, [0] * n
    for i in range(n):
        left[i] = max(h[i], left[i - 1] if i > 0 else 0)
    for i in range(n - 1, -1, -1):
        right[i] = max(h[i], right[i + 1] if i < n - 1 else 0)
    return [min(left[i], right[i]) for i in range(n)]


def trap_traced(h):
    level = true_levels(h)  # only used to check each step, not by the algorithm
    lo, hi = 0, len(h) - 1
    left_max = right_max = water = 0
    while lo <= hi:
        left_max = max(left_max, h[lo])
        right_max = max(right_max, h[hi])
        if left_max <= right_max:
            # left_max is the smaller wall, and the real right wall of lo is >= right_max
            side, i, used = "L", lo, left_max
            lo += 1
        else:
            side, i, used = "R", hi, right_max
            hi -= 1
        water += used - h[i]
        print("settle " + side + " bar " + str(i) + ": leftMax=" + str(left_max) + " rightMax=" + str(right_max)
              + " level " + str(used) + " (true " + str(level[i]) + ") water +" + str(used - h[i]) + " = " + str(water))
    return water


print("total = " + str(trap_traced([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1])))`,
          },
          {
            label: "3,000 random arrays: two correct rules and one wrong rule vs brute force",
            code: `def brute(h):
    """Reference answer: level over bar i = min(max of h[0..i], max of h[i..n-1])."""
    return sum(min(max(h[: i + 1]), max(h[i:])) - h[i] for i in range(len(h)))


def two_pointers(h, rule):
    """rule 'heights': settle the side with the lower bar (the usual code).
    rule 'maxes':   settle the side with the lower running max (the proof version).
    rule 'wrong':   settle the side with the HIGHER running max (breaks the proof)."""
    lo, hi = 0, len(h) - 1
    lm = rm = water = violations = 0
    while lo <= hi:
        lm, rm = max(lm, h[lo]), max(rm, h[hi])
        if rule == "heights":
            go_left = h[lo] < h[hi]
        elif rule == "maxes":
            go_left = lm <= rm
        else:
            go_left = lm > rm
        if go_left:
            # the invariant: the wall we use must be <= the true right wall of lo
            if lm > max(h[lo:]):
                violations += 1
            water += lm - h[lo]
            lo += 1
        else:
            if rm > max(h[: hi + 1]):
                violations += 1
            water += rm - h[hi]
            hi -= 1
    return water, violations


seed = 99
stats = {"heights": [0, 0], "maxes": [0, 0], "wrong": [0, 0]}
tests = 3000
for _ in range(tests):
    seed = seed * 48271 % 2147483647
    n = seed % 16
    h = []
    for _ in range(n):
        seed = seed * 48271 % 2147483647
        h.append(seed % 10)
    want = brute(h)
    for rule in ["heights", "maxes", "wrong"]:
        got, bad = two_pointers(h, rule)
        stats[rule][0] += got != want
        stats[rule][1] += bad
print(str(tests) + " random arrays (length 0-15, heights 0-9) checked against brute force")
for rule in ["heights", "maxes", "wrong"]:
    print("  rule " + rule + ": wrong answers " + str(stats[rule][0]) + ", invariant violations " + str(stats[rule][1]))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You wrote the two-pointer solution to Trapping Rain Water. Convince me it is correct: the left pointer has not seen most of the right side, so why is leftMax enough to decide the water there? Walk me through it with JavaScript code."

**What a strong answer should cover:**
- The per-bar formula: water = min(max to the left, max to the right) - h[i], and that the left pointer knows its left max exactly.
- The key bound: the right max seen so far is a lower bound on the true right wall of L, because unseen bars can only make it taller.
- The invariant: if leftMax <= rightMax, then level(L) = leftMax exactly, so L can be settled; otherwise settle R symmetrically.
- Why comparing heights (h[L] < h[R]) is also correct, and what goes wrong if you move the taller side.
- Complexity: each step settles one bar, so O(n) time; four variables, so O(1) extra space.
- JavaScript details: there is no integer overflow below 2^53, so the invariant is the whole argument; a deterministic random generator (not \`Math.random\`) makes a cross-check reproducible.

**Code / implementation expected:** Optional — the two-pointer loop in JavaScript plus a short argument; a brute-force cross-check is a strong bonus.`,
        answer: `**Target Audience:** Intermediate — you have seen the trapping rain water problem and can read JavaScript; the proof is explained from scratch.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two friends walk towards each other along a row of walls of different heights, one from each end, to measure how much rain the dips between the walls will hold. Each friend remembers only one number: the tallest wall they have passed so far. They never look ahead, never write anything down, and never go back.

At first this sounds impossible. The water above a spot depends on the tallest wall to its left **and** the tallest wall to its right — and the left friend has not seen anything on the right yet. Yet the two-pointer solution does exactly this and gets the right answer, using four variables in total.

The trick is a promise. The friend who is currently looking at the lower side can say: "My partner has already passed a wall at least as tall as my best one. So whatever is still unseen in the middle, the right side of my spot is high enough, and the water here is limited only by *my* tallest wall." Interviewers ask this follow-up because many candidates memorise the code for [trapping rain water](/interview-question/how-do-you-solve-the-trapping-rain-water-problem) but cannot explain why it is correct. Being able to state the invariant is what separates "I remembered it" from "I understand it".

## 2. The Problem in One Paragraph

Each array value \`h[i]\` is the height of a bar of width 1. The water above bar \`i\` is

\`level(i) - h[i]\`, where \`level(i) = min(trueLeft(i), trueRight(i))\`,

\`trueLeft(i)\` is the maximum of \`h[0..i]\` and \`trueRight(i)\` is the maximum of \`h[i..n-1]\` (both include bar \`i\`). The simple O(n)-space solution precomputes both arrays; the full problem and all four solutions are in [How do you solve the trapping rain water problem?](/interview-question/how-do-you-solve-the-trapping-rain-water-problem). This page answers one question: **how can we get \`level(i)\` without storing either array?**

## 3. The Invariant That Makes It Work

The algorithm keeps two pointers, \`L\` moving right and \`R\` moving left, and two running maxima:

- \`leftMax\` = the maximum of \`h[0..L]\` — this is **exactly** \`trueLeft(L)\`, because every bar from 0 to \`L\` has been seen.
- \`rightMax\` = the maximum of \`h[R..n-1]\` — this is exactly \`trueRight(R)\`.

What we do **not** know is \`trueRight(L)\`: it is the maximum of \`h[L..n-1]\`, and the middle part \`h[L+1..R-1]\` has not been read yet. But we do know a lower bound for it: \`h[L..n-1]\` contains \`h[R..n-1]\`, so

\`trueRight(L) >= rightMax\`.

📌 **Interview term: Loop invariant** — a statement that is true before and after every iteration of a loop. Here: \`leftMax\` is the exact left wall of \`L\`, \`rightMax\` is the exact right wall of \`R\`, and every bar outside \`[L, R]\` already has its correct water added.

📌 **Interview term: Lower bound** — a value that something is known to be at least. \`rightMax\` is a lower bound for the true right wall of \`L\`: unseen bars can only make that wall taller.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="Bars left of L are settled with running max leftMax, bars right of R are settled with running max rightMax, and the middle is unknown">
  <defs>
    <marker id="b10q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="24" text-anchor="middle">What the algorithm knows at one moment</text>
  <rect class="d-box-muted" x="20" y="50" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="80" text-anchor="middle">settled left</text>
  <text class="d-sub" x="105" y="102" text-anchor="middle">max so far: leftMax</text>
  <rect class="d-box-accent" x="210" y="50" width="70" height="70" rx="10"/>
  <text class="d-text" x="245" y="90" text-anchor="middle">L</text>
  <rect class="d-box" x="300" y="50" width="120" height="70" rx="10"/>
  <text class="d-text" x="360" y="80" text-anchor="middle">not seen yet</text>
  <text class="d-sub" x="360" y="102" text-anchor="middle">any heights</text>
  <rect class="d-box-accent" x="440" y="50" width="70" height="70" rx="10"/>
  <text class="d-text" x="475" y="90" text-anchor="middle">R</text>
  <rect class="d-box-muted" x="530" y="50" width="170" height="70" rx="10"/>
  <text class="d-text" x="615" y="80" text-anchor="middle">settled right</text>
  <text class="d-sub" x="615" y="102" text-anchor="middle">max so far: rightMax</text>
  <path class="d-edge" d="M 245 124 L 245 156" marker-end="url(#b10q5-arrow)"/>
  <path class="d-edge" d="M 475 124 L 475 156" marker-end="url(#b10q5-arrow)"/>
  <rect class="d-box-accent" x="140" y="160" width="440" height="66" rx="10"/>
  <text class="d-text" x="360" y="186" text-anchor="middle">true right wall of L = max of h from L to the end</text>
  <text class="d-sub" x="360" y="210" text-anchor="middle">that range contains R and everything after it, so it is at least rightMax</text>
</svg>

Now the decision rule. **If \`leftMax <= rightMax\`:**

\`leftMax <= rightMax <= trueRight(L)\`, so \`level(L) = min(leftMax, trueRight(L)) = leftMax\`.

The water at \`L\` is exactly \`leftMax - h[L]\`, no matter what the unseen middle contains. We add it and move \`L\` one step right. **Otherwise** (\`rightMax < leftMax\`), the mirror argument settles \`R\` with \`rightMax - h[R]\` and moves \`R\` left.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="leftMax is at most rightMax, which is at most the true right wall, so the water level at L is exactly leftMax">
  <defs>
    <marker id="b10q5-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="60" text-anchor="middle">leftMax</text>
  <text class="d-sub" x="95" y="82" text-anchor="middle">exact left wall of L</text>
  <text class="d-text" x="200" y="70" text-anchor="middle">&lt;=</text>
  <rect class="d-box" x="230" y="30" width="150" height="70" rx="10"/>
  <text class="d-text" x="305" y="60" text-anchor="middle">rightMax</text>
  <text class="d-sub" x="305" y="82" text-anchor="middle">the branch condition</text>
  <text class="d-text" x="410" y="70" text-anchor="middle">&lt;=</text>
  <rect class="d-box" x="440" y="30" width="170" height="70" rx="10"/>
  <text class="d-text" x="525" y="60" text-anchor="middle">true right wall</text>
  <text class="d-sub" x="525" y="82" text-anchor="middle">unknown, but at least this</text>
  <path class="d-edge" d="M 525 104 L 525 140 L 380 140" marker-end="url(#b10q5-arrow2)"/>
  <rect class="d-box-accent" x="150" y="120" width="226" height="56" rx="10"/>
  <text class="d-text" x="263" y="146" text-anchor="middle">level at L = leftMax</text>
  <text class="d-sub" x="263" y="166" text-anchor="middle">min of the two walls</text>
</svg>

The unseen middle can only *raise* the true right wall, and raising the higher of two walls never changes a minimum that is already decided by the lower one. That is the whole proof.

📌 **Interview term: Settling a bar** — adding a bar's final water to the total and never looking at it again. Each loop step settles exactly one bar, so the loop runs n times.

**Why only O(1) space.** We never need the full \`leftMax\`/\`rightMax\` arrays, because each bar is settled at the moment its own side's running maximum is the deciding wall. Four integers (\`L\`, \`R\`, \`leftMax\`, \`rightMax\`) plus the total are all the state there is.

## 4. Two Correct Ways to Write the Branch

Most published code compares **heights**, not maxima:

- *Rule "maxes"* (the proof above): update both maxima, then settle the side with the smaller running max.
- *Rule "heights"* (the common code): if \`h[L] < h[R]\`, settle \`L\` with \`leftMax\`, else settle \`R\` with \`rightMax\`.

Why is the heights rule also safe? When we settle \`L\` under it, \`h[L] < h[R]\`, so the current bar on the right is already taller than the current left bar. And every earlier left bar was settled for the same reason — at that time it was smaller than some right bar at a position \`>= R\`, which is still to the right of \`L\`. So everything that built \`leftMax\` is smaller than some bar in \`h[R..n-1]\`, which gives \`leftMax <= trueRight(L)\` again. Example 2 confirms both rules give the right answer on 3,000 random arrays and that the invariant \`leftMax <= trueRight(L)\` (and its mirror) never fails.

**What breaks it.** Flip the rule — settle the side with the *larger* running max — and the bound no longer holds: the level we use can be higher than the true wall on the other side. Example 2 runs that wrong rule too: 2,543 of the 3,000 arrays get a wrong total.

📌 **Interview term: Proof by invariant** — showing an algorithm is correct by stating a property, proving the first step makes it true, and proving each step keeps it true. When the loop ends, the property gives the answer.

This is the same shape of argument as in [container with most water](/interview-question/how-do-you-solve-the-container-with-most-water-problem): move the side that is limiting, because the other side cannot make things worse for it. See also [the two-pointer technique](/interview-question/what-is-the-two-pointer-technique).

## 5. A Trace You Can Check by Hand

Example 1 runs the "maxes" rule on \`[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]\` with a \`while L <= R\` loop, so all 12 bars are settled (including the final one where the pointers meet). For each step it prints which side was settled, both running maxima, the level used, and — only for checking — the true level \`min(trueLeft(i), trueRight(i))\` computed separately with prefix arrays. In every line, the level used equals the true level, even though the algorithm itself never looks at the middle. The full output is in the Verified section.

## 6. The Code in JavaScript

Here is the "maxes" version of the loop with the trace printing (example 1). The \`level\` array is only used to print a check column; the algorithm itself uses four variables.

~~~javascript
function trapTraced(h) {
  const level = trueLevels(h); // only used to check each step, not by the algorithm
  let lo = 0, hi = h.length - 1;
  let leftMax = 0, rightMax = 0, water = 0;
  while (lo <= hi) {
    leftMax = Math.max(leftMax, h[lo]);
    rightMax = Math.max(rightMax, h[hi]);
    let side, i, used;
    if (leftMax <= rightMax) {
      // leftMax is the smaller wall, and the real right wall of lo is >= rightMax
      side = "L"; i = lo; used = leftMax; lo++;
    } else {
      side = "R"; i = hi; used = rightMax; hi--;
    }
    water += used - h[i];
    console.log("settle " + side + " bar " + i + ": leftMax=" + leftMax + " rightMax=" + rightMax +
      " level " + used + " (true " + level[i] + ") water +" + (used - h[i]) + " = " + water);
  }
  return water;
}
~~~

**What to point out in this code:**

- Both maxima are updated **before** the decision, so \`leftMax\` already includes \`h[lo]\` and \`used - h[i]\` is never negative.
- \`while (lo <= hi)\` settles every bar, including the meeting point; the common \`while (left < right)\` form skips that last bar, which is a tallest bar and holds no water.
- \`let side, i, used;\` declared once, then assigned in each branch, keeps the shared update after the \`if\` in one place.
- Numbers are doubles, exact for integers up to \`Number.MAX_SAFE_INTEGER\`, so overflow is not part of the argument.
- Example 2 uses a tiny deterministic generator (\`seed = (seed * 48271) % 2147483647\`) instead of \`Math.random()\`, so the 3,000 test arrays — and the printed counts — are identical on every run and in every language. The product stays below 2^53, so the arithmetic is exact.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 builds 3,000 arrays (length 0–15, heights 0–9) with a small deterministic generator (MINSTD), so every language tests the same inputs. For each settled bar it also checks the invariant: the level used must not exceed the true wall on the other side.

**Example 1 — a step-by-step trace that compares each settled level with the true level** prints:

~~~text
settle L bar 0: leftMax=0 rightMax=1 level 0 (true 0) water +0 = 0
settle L bar 1: leftMax=1 rightMax=1 level 1 (true 1) water +0 = 0
settle L bar 2: leftMax=1 rightMax=1 level 1 (true 1) water +1 = 1
settle R bar 11: leftMax=2 rightMax=1 level 1 (true 1) water +0 = 1
settle L bar 3: leftMax=2 rightMax=2 level 2 (true 2) water +0 = 1
settle L bar 4: leftMax=2 rightMax=2 level 2 (true 2) water +1 = 2
settle L bar 5: leftMax=2 rightMax=2 level 2 (true 2) water +2 = 4
settle L bar 6: leftMax=2 rightMax=2 level 2 (true 2) water +1 = 5
settle R bar 10: leftMax=3 rightMax=2 level 2 (true 2) water +0 = 5
settle R bar 9: leftMax=3 rightMax=2 level 2 (true 2) water +1 = 6
settle R bar 8: leftMax=3 rightMax=2 level 2 (true 2) water +0 = 6
settle L bar 7: leftMax=3 rightMax=3 level 3 (true 3) water +0 = 6
total = 6
~~~

**Example 2 — 3,000 random arrays checked against brute force, for two correct rules and one wrong rule** prints:

~~~text
3000 random arrays (length 0-15, heights 0-9) checked against brute force
  rule heights: wrong answers 0, invariant violations 0
  rule maxes: wrong answers 0, invariant violations 0
  rule wrong: wrong answers 2543, invariant violations 9791
~~~

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Two pointers (any correct rule) | O(n) | O(1) | each iteration settles one bar; state is L, R, leftMax, rightMax, total |
| Prefix/suffix arrays | O(n) | O(n) | stores trueLeft and trueRight for every bar |
| Brute force used as the test oracle | O(n²) | O(1) | two scans per bar with a \`maxOf\` helper |

## Common Pitfalls

- **Settling the side with the larger max.** It breaks the bound; example 2 shows 2,543 wrong answers out of 3,000.
- **Using \`Math.min(leftMax, rightMax)\` as the level for both sides.** When you settle L the level is \`leftMax\`.
- **Updating the max after subtracting.** Then \`leftMax - h[lo]\` can be negative when \`h[lo]\` is a new maximum.
- **Testing with \`Math.random()\` only.** A failure you cannot reproduce is hard to debug; use a seeded generator for test inputs.
- **Settling the meeting bar twice.** With \`lo <= hi\` each iteration must move exactly one pointer.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What each pointer knows:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax</code> is exactly the tallest bar in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[0..L]</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rightMax</code> is exactly the tallest in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[R..n-1]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The bound:</strong> <span style="color:#f0e2c8;">The true right wall of L is the max of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[L..n-1]</code>, which contains <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[R..n-1]</code>, so it is at least <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rightMax</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The step:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax &lt;= rightMax</code>, the level at L is exactly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax</code>: add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax - h[L]</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">L++</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Space:</strong> <span style="color:#f0e2c8;">Each bar is settled the moment its own side decides it, so no arrays are needed: O(1) space, O(n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Evidence:</strong> <span style="color:#f0e2c8;">A seeded random test against the O(n²) brute force: both correct rules give 0 mismatches over 3,000 arrays, the flipped rule fails 2,543.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you ignore the unseen middle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unseen bars can only make the right wall taller. The level is a minimum, already decided by the left wall, so a taller right wall changes nothing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The usual code compares <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">h[left] &lt; h[right]</code>. Is that the same?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a different rule that is also correct: every bar that formed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax</code> was smaller than some bar at or right of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code>, so the bound still holds.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you move the taller side instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The level can exceed the true wall on the other side; our random test found wrong totals on 2,543 of 3,000 arrays.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every iteration settles one bar and moves one pointer inward, so the loop runs at most n times.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a seeded generator instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Math.random()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So any failing input can be reproduced exactly, and so the same test can run in other languages.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Loop invariant** | A statement true before and after every loop iteration |
| **Lower bound** | A value something is known to be at least |
| **Settling a bar** | Adding its final water and never revisiting it |
| **Proof by invariant** | Prove a property starts true and every step keeps it true |

---
**Conclusion:** The two-pointer solution works because of one inequality chain: \`leftMax <= rightMax <= trueRight(L)\`. \`leftMax\` is the exact left wall of \`L\` and \`rightMax\` is a lower bound on its right wall, so when the left max is smaller it is the water level, whatever the unseen middle holds. Each step settles one bar, giving O(n) time with four variables. In JavaScript, the trace and a seeded 3,000-array test make the argument concrete: both correct rules match brute force every time, and the flipped rule fails on most inputs.`,
        examples: [
          {
            label: "Traced two-pointer run: level used vs true level for every bar",
            code: `// Water level over each bar = min(tallest bar to its left, tallest to its right).
function trueLevels(h) {
  const n = h.length, left = new Array(n), right = new Array(n);
  for (let i = 0; i < n; i++) left[i] = Math.max(h[i], i > 0 ? left[i - 1] : 0);
  for (let i = n - 1; i >= 0; i--) right[i] = Math.max(h[i], i < n - 1 ? right[i + 1] : 0);
  return h.map((_, i) => Math.min(left[i], right[i]));
}

function trapTraced(h) {
  const level = trueLevels(h); // only used to check each step, not by the algorithm
  let lo = 0, hi = h.length - 1;
  let leftMax = 0, rightMax = 0, water = 0;
  while (lo <= hi) {
    leftMax = Math.max(leftMax, h[lo]);
    rightMax = Math.max(rightMax, h[hi]);
    let side, i, used;
    if (leftMax <= rightMax) {
      // leftMax is the smaller wall, and the real right wall of lo is >= rightMax
      side = "L"; i = lo; used = leftMax; lo++;
    } else {
      side = "R"; i = hi; used = rightMax; hi--;
    }
    water += used - h[i];
    console.log("settle " + side + " bar " + i + ": leftMax=" + leftMax + " rightMax=" + rightMax +
      " level " + used + " (true " + level[i] + ") water +" + (used - h[i]) + " = " + water);
  }
  return water;
}

console.log("total = " + trapTraced([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]));`,
          },
          {
            label: "3,000 random arrays: two correct rules and one wrong rule vs brute force",
            code: `function maxOf(h, from, to) { // max of h[from..to-1], 0 when empty
  let m = 0;
  for (let i = from; i < to; i++) m = Math.max(m, h[i]);
  return m;
}

// Reference answer: level over bar i = min(max of h[0..i], max of h[i..n-1]).
function brute(h) {
  let water = 0;
  for (let i = 0; i < h.length; i++) water += Math.min(maxOf(h, 0, i + 1), maxOf(h, i, h.length)) - h[i];
  return water;
}

// rule "heights": settle the side with the lower bar (the usual code).
// rule "maxes":   settle the side with the lower running max (the proof version).
// rule "wrong":   settle the side with the HIGHER running max (breaks the proof).
function twoPointers(h, rule) {
  let lo = 0, hi = h.length - 1, lm = 0, rm = 0, water = 0, violations = 0;
  while (lo <= hi) {
    lm = Math.max(lm, h[lo]);
    rm = Math.max(rm, h[hi]);
    let goLeft;
    if (rule === "heights") goLeft = h[lo] < h[hi];
    else if (rule === "maxes") goLeft = lm <= rm;
    else goLeft = lm > rm;
    if (goLeft) {
      // the invariant: the wall we use must be <= the true right wall of lo
      if (lm > maxOf(h, lo, h.length)) violations++;
      water += lm - h[lo];
      lo++;
    } else {
      if (rm > maxOf(h, 0, hi + 1)) violations++;
      water += rm - h[hi];
      hi--;
    }
  }
  return [water, violations];
}

const rules = ["heights", "maxes", "wrong"];
const wrongAnswers = { heights: 0, maxes: 0, wrong: 0 };
const violations = { heights: 0, maxes: 0, wrong: 0 };
const tests = 3000;
let seed = 99;
for (let t = 0; t < tests; t++) {
  seed = (seed * 48271) % 2147483647;
  const n = seed % 16;
  const h = [];
  for (let i = 0; i < n; i++) {
    seed = (seed * 48271) % 2147483647;
    h.push(seed % 10);
  }
  const want = brute(h);
  for (const rule of rules) {
    const [got, bad] = twoPointers(h, rule);
    if (got !== want) wrongAnswers[rule]++;
    violations[rule] += bad;
  }
}
console.log(tests + " random arrays (length 0-15, heights 0-9) checked against brute force");
for (const rule of rules) {
  console.log("  rule " + rule + ": wrong answers " + wrongAnswers[rule] + ", invariant violations " + violations[rule]);
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You wrote the two-pointer solution to Trapping Rain Water. Convince me it is correct: the left pointer has not seen most of the right side, so why is leftMax enough to decide the water there? Walk me through it with Java code."

**What a strong answer should cover:**
- The per-bar formula: water = min(max to the left, max to the right) - h[i], and that the left pointer knows its left max exactly.
- The key bound: the right max seen so far is a lower bound on the true right wall of L, because unseen bars can only make it taller.
- The invariant: if leftMax <= rightMax, then level(L) = leftMax exactly, so L can be settled; otherwise settle R symmetrically.
- Why comparing heights (h[L] < h[R]) is also correct, and what goes wrong if you move the taller side.
- Complexity: each step settles one bar, so O(n) time; four variables, so O(1) extra space.
- Java details: the invariant is about heights, but the total is a sum — on large inputs it belongs in a \`long\` because \`int\` wraps silently; a seeded generator with \`long\` arithmetic makes a cross-check reproducible.

**Code / implementation expected:** Optional — the two-pointer loop in Java plus a short argument; a brute-force cross-check is a strong bonus.`,
        answer: `**Target Audience:** Intermediate — you have seen the trapping rain water problem and can read Java; the proof is explained from scratch.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two friends walk towards each other along a row of walls of different heights, one from each end, to measure how much rain the dips between the walls will hold. Each friend remembers only one number: the tallest wall they have passed so far. They never look ahead, never write anything down, and never go back.

At first this sounds impossible. The water above a spot depends on the tallest wall to its left **and** the tallest wall to its right — and the left friend has not seen anything on the right yet. Yet the two-pointer solution does exactly this and gets the right answer, using four variables in total.

The trick is a promise. The friend who is currently looking at the lower side can say: "My partner has already passed a wall at least as tall as my best one. So whatever is still unseen in the middle, the right side of my spot is high enough, and the water here is limited only by *my* tallest wall." Interviewers ask this follow-up because many candidates memorise the code for [trapping rain water](/interview-question/how-do-you-solve-the-trapping-rain-water-problem) but cannot explain why it is correct. Being able to state the invariant is what separates "I remembered it" from "I understand it".

## 2. The Problem in One Paragraph

Each array value \`h[i]\` is the height of a bar of width 1. The water above bar \`i\` is

\`level(i) - h[i]\`, where \`level(i) = min(trueLeft(i), trueRight(i))\`,

\`trueLeft(i)\` is the maximum of \`h[0..i]\` and \`trueRight(i)\` is the maximum of \`h[i..n-1]\` (both include bar \`i\`). The simple O(n)-space solution precomputes both arrays; the full problem and all four solutions are in [How do you solve the trapping rain water problem?](/interview-question/how-do-you-solve-the-trapping-rain-water-problem). This page answers one question: **how can we get \`level(i)\` without storing either array?**

## 3. The Invariant That Makes It Work

The algorithm keeps two pointers, \`L\` moving right and \`R\` moving left, and two running maxima:

- \`leftMax\` = the maximum of \`h[0..L]\` — this is **exactly** \`trueLeft(L)\`, because every bar from 0 to \`L\` has been seen.
- \`rightMax\` = the maximum of \`h[R..n-1]\` — this is exactly \`trueRight(R)\`.

What we do **not** know is \`trueRight(L)\`: it is the maximum of \`h[L..n-1]\`, and the middle part \`h[L+1..R-1]\` has not been read yet. But we do know a lower bound for it: \`h[L..n-1]\` contains \`h[R..n-1]\`, so

\`trueRight(L) >= rightMax\`.

📌 **Interview term: Loop invariant** — a statement that is true before and after every iteration of a loop. Here: \`leftMax\` is the exact left wall of \`L\`, \`rightMax\` is the exact right wall of \`R\`, and every bar outside \`[L, R]\` already has its correct water added.

📌 **Interview term: Lower bound** — a value that something is known to be at least. \`rightMax\` is a lower bound for the true right wall of \`L\`: unseen bars can only make that wall taller.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="Bars left of L are settled with running max leftMax, bars right of R are settled with running max rightMax, and the middle is unknown">
  <defs>
    <marker id="b10q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="24" text-anchor="middle">What the algorithm knows at one moment</text>
  <rect class="d-box-muted" x="20" y="50" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="80" text-anchor="middle">settled left</text>
  <text class="d-sub" x="105" y="102" text-anchor="middle">max so far: leftMax</text>
  <rect class="d-box-accent" x="210" y="50" width="70" height="70" rx="10"/>
  <text class="d-text" x="245" y="90" text-anchor="middle">L</text>
  <rect class="d-box" x="300" y="50" width="120" height="70" rx="10"/>
  <text class="d-text" x="360" y="80" text-anchor="middle">not seen yet</text>
  <text class="d-sub" x="360" y="102" text-anchor="middle">any heights</text>
  <rect class="d-box-accent" x="440" y="50" width="70" height="70" rx="10"/>
  <text class="d-text" x="475" y="90" text-anchor="middle">R</text>
  <rect class="d-box-muted" x="530" y="50" width="170" height="70" rx="10"/>
  <text class="d-text" x="615" y="80" text-anchor="middle">settled right</text>
  <text class="d-sub" x="615" y="102" text-anchor="middle">max so far: rightMax</text>
  <path class="d-edge" d="M 245 124 L 245 156" marker-end="url(#b10q5-arrow)"/>
  <path class="d-edge" d="M 475 124 L 475 156" marker-end="url(#b10q5-arrow)"/>
  <rect class="d-box-accent" x="140" y="160" width="440" height="66" rx="10"/>
  <text class="d-text" x="360" y="186" text-anchor="middle">true right wall of L = max of h from L to the end</text>
  <text class="d-sub" x="360" y="210" text-anchor="middle">that range contains R and everything after it, so it is at least rightMax</text>
</svg>

Now the decision rule. **If \`leftMax <= rightMax\`:**

\`leftMax <= rightMax <= trueRight(L)\`, so \`level(L) = min(leftMax, trueRight(L)) = leftMax\`.

The water at \`L\` is exactly \`leftMax - h[L]\`, no matter what the unseen middle contains. We add it and move \`L\` one step right. **Otherwise** (\`rightMax < leftMax\`), the mirror argument settles \`R\` with \`rightMax - h[R]\` and moves \`R\` left.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="leftMax is at most rightMax, which is at most the true right wall, so the water level at L is exactly leftMax">
  <defs>
    <marker id="b10q5-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="60" text-anchor="middle">leftMax</text>
  <text class="d-sub" x="95" y="82" text-anchor="middle">exact left wall of L</text>
  <text class="d-text" x="200" y="70" text-anchor="middle">&lt;=</text>
  <rect class="d-box" x="230" y="30" width="150" height="70" rx="10"/>
  <text class="d-text" x="305" y="60" text-anchor="middle">rightMax</text>
  <text class="d-sub" x="305" y="82" text-anchor="middle">the branch condition</text>
  <text class="d-text" x="410" y="70" text-anchor="middle">&lt;=</text>
  <rect class="d-box" x="440" y="30" width="170" height="70" rx="10"/>
  <text class="d-text" x="525" y="60" text-anchor="middle">true right wall</text>
  <text class="d-sub" x="525" y="82" text-anchor="middle">unknown, but at least this</text>
  <path class="d-edge" d="M 525 104 L 525 140 L 380 140" marker-end="url(#b10q5-arrow2)"/>
  <rect class="d-box-accent" x="150" y="120" width="226" height="56" rx="10"/>
  <text class="d-text" x="263" y="146" text-anchor="middle">level at L = leftMax</text>
  <text class="d-sub" x="263" y="166" text-anchor="middle">min of the two walls</text>
</svg>

The unseen middle can only *raise* the true right wall, and raising the higher of two walls never changes a minimum that is already decided by the lower one. That is the whole proof.

📌 **Interview term: Settling a bar** — adding a bar's final water to the total and never looking at it again. Each loop step settles exactly one bar, so the loop runs n times.

**Why only O(1) space.** We never need the full \`leftMax\`/\`rightMax\` arrays, because each bar is settled at the moment its own side's running maximum is the deciding wall. Four integers (\`L\`, \`R\`, \`leftMax\`, \`rightMax\`) plus the total are all the state there is.

## 4. Two Correct Ways to Write the Branch

Most published code compares **heights**, not maxima:

- *Rule "maxes"* (the proof above): update both maxima, then settle the side with the smaller running max.
- *Rule "heights"* (the common code): if \`h[L] < h[R]\`, settle \`L\` with \`leftMax\`, else settle \`R\` with \`rightMax\`.

Why is the heights rule also safe? When we settle \`L\` under it, \`h[L] < h[R]\`, so the current bar on the right is already taller than the current left bar. And every earlier left bar was settled for the same reason — at that time it was smaller than some right bar at a position \`>= R\`, which is still to the right of \`L\`. So everything that built \`leftMax\` is smaller than some bar in \`h[R..n-1]\`, which gives \`leftMax <= trueRight(L)\` again. Example 2 confirms both rules give the right answer on 3,000 random arrays and that the invariant \`leftMax <= trueRight(L)\` (and its mirror) never fails.

**What breaks it.** Flip the rule — settle the side with the *larger* running max — and the bound no longer holds: the level we use can be higher than the true wall on the other side. Example 2 runs that wrong rule too: 2,543 of the 3,000 arrays get a wrong total.

📌 **Interview term: Proof by invariant** — showing an algorithm is correct by stating a property, proving the first step makes it true, and proving each step keeps it true. When the loop ends, the property gives the answer.

This is the same shape of argument as in [container with most water](/interview-question/how-do-you-solve-the-container-with-most-water-problem): move the side that is limiting, because the other side cannot make things worse for it. See also [the two-pointer technique](/interview-question/what-is-the-two-pointer-technique).

## 5. A Trace You Can Check by Hand

Example 1 runs the "maxes" rule on \`[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]\` with a \`while L <= R\` loop, so all 12 bars are settled (including the final one where the pointers meet). For each step it prints which side was settled, both running maxima, the level used, and — only for checking — the true level \`min(trueLeft(i), trueRight(i))\` computed separately with prefix arrays. In every line, the level used equals the true level, even though the algorithm itself never looks at the middle. The full output is in the Verified section.

## 6. The Code in Java

Here is the "maxes" version of the loop with the trace printing (example 1). The \`level\` array is only used to print a check column; the algorithm itself uses four variables. The small test inputs keep the total well inside \`int\`; production code should return \`long\` (see the [main trapping rain water page](/interview-question/how-do-you-solve-the-trapping-rain-water-problem)).

~~~java
static int trapTraced(int[] h) {
    int[] level = trueLevels(h); // only used to check each step, not by the algorithm
    int lo = 0, hi = h.length - 1;
    int leftMax = 0, rightMax = 0, water = 0;
    while (lo <= hi) {
        leftMax = Math.max(leftMax, h[lo]);
        rightMax = Math.max(rightMax, h[hi]);
        String side;
        int i, used;
        if (leftMax <= rightMax) {
            // leftMax is the smaller wall, and the real right wall of lo is >= rightMax
            side = "L"; i = lo; used = leftMax; lo++;
        } else {
            side = "R"; i = hi; used = rightMax; hi--;
        }
        water += used - h[i];
        System.out.println("settle " + side + " bar " + i + ": leftMax=" + leftMax + " rightMax=" + rightMax
                + " level " + used + " (true " + level[i] + ") water +" + (used - h[i]) + " = " + water);
    }
    return water;
}
~~~

**What to point out in this code:**

- Both maxima are updated **before** the decision, so \`leftMax\` already includes \`h[lo]\` and \`used - h[i]\` is never negative.
- \`while (lo <= hi)\` settles every bar, including the meeting point; the common \`while (left < right)\` form skips that last bar, which is a tallest bar and holds no water.
- \`String side; int i, used;\` are declared without values and assigned in both branches; Java's definite-assignment check would refuse to compile if a branch forgot one.
- Example 2's generator \`seed = seed * 48271 % 2147483647L\` uses a \`long\`: the product of a 31-bit seed and 48271 does not fit in \`int\`.
- Example 2 encodes the three rules as \`0\`, \`1\`, \`2\` and picks one with a nested ternary — enough for a test harness; an \`enum\` would be cleaner in production code.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21; the code only uses Java 17 features). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 builds 3,000 arrays (length 0–15, heights 0–9) with a small deterministic generator (MINSTD), so every language tests the same inputs. For each settled bar it also checks the invariant: the level used must not exceed the true wall on the other side.

**Example 1 — a step-by-step trace that compares each settled level with the true level** prints:

~~~text
settle L bar 0: leftMax=0 rightMax=1 level 0 (true 0) water +0 = 0
settle L bar 1: leftMax=1 rightMax=1 level 1 (true 1) water +0 = 0
settle L bar 2: leftMax=1 rightMax=1 level 1 (true 1) water +1 = 1
settle R bar 11: leftMax=2 rightMax=1 level 1 (true 1) water +0 = 1
settle L bar 3: leftMax=2 rightMax=2 level 2 (true 2) water +0 = 1
settle L bar 4: leftMax=2 rightMax=2 level 2 (true 2) water +1 = 2
settle L bar 5: leftMax=2 rightMax=2 level 2 (true 2) water +2 = 4
settle L bar 6: leftMax=2 rightMax=2 level 2 (true 2) water +1 = 5
settle R bar 10: leftMax=3 rightMax=2 level 2 (true 2) water +0 = 5
settle R bar 9: leftMax=3 rightMax=2 level 2 (true 2) water +1 = 6
settle R bar 8: leftMax=3 rightMax=2 level 2 (true 2) water +0 = 6
settle L bar 7: leftMax=3 rightMax=3 level 3 (true 3) water +0 = 6
total = 6
~~~

**Example 2 — 3,000 random arrays checked against brute force, for two correct rules and one wrong rule** prints:

~~~text
3000 random arrays (length 0-15, heights 0-9) checked against brute force
  rule heights: wrong answers 0, invariant violations 0
  rule maxes: wrong answers 0, invariant violations 0
  rule wrong: wrong answers 2543, invariant violations 9791
~~~

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Two pointers (any correct rule) | O(n) | O(1) | each iteration settles one bar; state is L, R, leftMax, rightMax, total |
| Prefix/suffix arrays | O(n) | O(n) | two extra \`int[]\` of size n |
| Brute force used as the test oracle | O(n²) | O(1) | two scans per bar with a \`maxOf\` helper |

## Common Pitfalls

- **Settling the side with the larger max.** It breaks the bound; example 2 shows 2,543 wrong answers out of 3,000.
- **Using \`Math.min(leftMax, rightMax)\` as the level for both sides.** When you settle L the level is \`leftMax\`.
- **Updating the max after subtracting.** Then \`leftMax - h[lo]\` can be negative when \`h[lo]\` is a new maximum.
- **Summing into \`int\` on large inputs.** The proof is about levels, but the total can exceed \`Integer.MAX_VALUE\` and wrap silently; return \`long\`.
- **MINSTD in \`int\`.** \`seed * 48271\` overflows \`int\`; the generator needs \`long\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What each pointer knows:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax</code> is exactly the tallest bar in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[0..L]</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rightMax</code> is exactly the tallest in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[R..n-1]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The bound:</strong> <span style="color:#f0e2c8;">The true right wall of L is the max of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[L..n-1]</code>, which contains <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[R..n-1]</code>, so it is at least <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rightMax</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The step:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax &lt;= rightMax</code>, the level at L is exactly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax</code>: add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax - h[L]</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">L++</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Space:</strong> <span style="color:#f0e2c8;">Each bar is settled the moment its own side decides it: O(1) space, O(n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Evidence:</strong> <span style="color:#f0e2c8;">A seeded random test against brute force: both correct rules 0 mismatches over 3,000 arrays, the flipped rule 2,543 — and keep the total in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> for big inputs.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you ignore the unseen middle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unseen bars can only make the right wall taller. The level is a minimum, already decided by the left wall, so a taller right wall changes nothing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The usual code compares <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">height[left] &lt; height[right]</code>. Is that the same?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a different rule that is also correct: every bar that formed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax</code> was smaller than some bar at or right of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code>, so the bound still holds.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you move the taller side instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The level can exceed the true wall on the other side; our random test found wrong totals on 2,543 of 3,000 arrays.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the proof say anything about overflow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It guarantees each bar gets the right level; the sum of n levels can still exceed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, so the total should be a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every iteration settles one bar and moves one pointer inward, so the loop runs at most n times.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Loop invariant** | A statement true before and after every loop iteration |
| **Lower bound** | A value something is known to be at least |
| **Settling a bar** | Adding its final water and never revisiting it |
| **Proof by invariant** | Prove a property starts true and every step keeps it true |

---
**Conclusion:** The two-pointer solution works because of one inequality chain: \`leftMax <= rightMax <= trueRight(L)\`. \`leftMax\` is the exact left wall of \`L\` and \`rightMax\` is a lower bound on its right wall, so when the left max is smaller it is the water level, whatever the unseen middle holds. Each step settles one bar, giving O(n) time with four variables. In Java, the trace and a seeded 3,000-array test make the argument concrete; just remember the proof covers the levels, not the arithmetic — the total still belongs in a \`long\`.`,
        examples: [
          {
            label: "Traced two-pointer run: level used vs true level for every bar",
            code: `public class Main {
    // Water level over each bar = min(tallest bar to its left, tallest to its right).
    static int[] trueLevels(int[] h) {
        int n = h.length;
        int[] left = new int[n], right = new int[n], level = new int[n];
        for (int i = 0; i < n; i++) left[i] = Math.max(h[i], i > 0 ? left[i - 1] : 0);
        for (int i = n - 1; i >= 0; i--) right[i] = Math.max(h[i], i < n - 1 ? right[i + 1] : 0);
        for (int i = 0; i < n; i++) level[i] = Math.min(left[i], right[i]);
        return level;
    }

    static int trapTraced(int[] h) {
        int[] level = trueLevels(h); // only used to check each step, not by the algorithm
        int lo = 0, hi = h.length - 1;
        int leftMax = 0, rightMax = 0, water = 0;
        while (lo <= hi) {
            leftMax = Math.max(leftMax, h[lo]);
            rightMax = Math.max(rightMax, h[hi]);
            String side;
            int i, used;
            if (leftMax <= rightMax) {
                // leftMax is the smaller wall, and the real right wall of lo is >= rightMax
                side = "L"; i = lo; used = leftMax; lo++;
            } else {
                side = "R"; i = hi; used = rightMax; hi--;
            }
            water += used - h[i];
            System.out.println("settle " + side + " bar " + i + ": leftMax=" + leftMax + " rightMax=" + rightMax
                    + " level " + used + " (true " + level[i] + ") water +" + (used - h[i]) + " = " + water);
        }
        return water;
    }

    public static void main(String[] args) {
        int total = trapTraced(new int[]{0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1});
        System.out.println("total = " + total);
    }
}`,
          },
          {
            label: "3,000 random arrays: two correct rules and one wrong rule vs brute force",
            code: `public class Main {
    static int maxOf(int[] h, int from, int to) { // max of h[from..to-1], 0 when empty
        int m = 0;
        for (int i = from; i < to; i++) m = Math.max(m, h[i]);
        return m;
    }

    // Reference answer: level over bar i = min(max of h[0..i], max of h[i..n-1]).
    static int brute(int[] h) {
        int water = 0;
        for (int i = 0; i < h.length; i++) water += Math.min(maxOf(h, 0, i + 1), maxOf(h, i, h.length)) - h[i];
        return water;
    }

    // rule 0 "heights": settle the side with the lower bar (the usual code).
    // rule 1 "maxes":   settle the side with the lower running max (the proof version).
    // rule 2 "wrong":   settle the side with the HIGHER running max (breaks the proof).
    static int[] twoPointers(int[] h, int rule) {
        int lo = 0, hi = h.length - 1, lm = 0, rm = 0, water = 0, violations = 0;
        while (lo <= hi) {
            lm = Math.max(lm, h[lo]);
            rm = Math.max(rm, h[hi]);
            boolean goLeft = rule == 0 ? h[lo] < h[hi] : rule == 1 ? lm <= rm : lm > rm;
            if (goLeft) {
                // the invariant: the wall we use must be <= the true right wall of lo
                if (lm > maxOf(h, lo, h.length)) violations++;
                water += lm - h[lo];
                lo++;
            } else {
                if (rm > maxOf(h, 0, hi + 1)) violations++;
                water += rm - h[hi];
                hi--;
            }
        }
        return new int[]{water, violations};
    }

    public static void main(String[] args) {
        String[] names = {"heights", "maxes", "wrong"};
        int[] wrongAnswers = new int[3], violations = new int[3];
        int tests = 3000;
        long seed = 99;
        for (int t = 0; t < tests; t++) {
            seed = seed * 48271 % 2147483647L;
            int n = (int) (seed % 16);
            int[] h = new int[n];
            for (int i = 0; i < n; i++) {
                seed = seed * 48271 % 2147483647L;
                h[i] = (int) (seed % 10);
            }
            int want = brute(h);
            for (int r = 0; r < 3; r++) {
                int[] res = twoPointers(h, r);
                if (res[0] != want) wrongAnswers[r]++;
                violations[r] += res[1];
            }
        }
        System.out.println(tests + " random arrays (length 0-15, heights 0-9) checked against brute force");
        for (int r = 0; r < 3; r++) {
            System.out.println("  rule " + names[r] + ": wrong answers " + wrongAnswers[r] + ", invariant violations " + violations[r]);
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You wrote the two-pointer solution to Trapping Rain Water. Convince me it is correct: the left pointer has not seen most of the right side, so why is leftMax enough to decide the water there? Walk me through it with C++ code."

**What a strong answer should cover:**
- The per-bar formula: water = min(max to the left, max to the right) - h[i], and that the left pointer knows its left max exactly.
- The key bound: the right max seen so far is a lower bound on the true right wall of L, because unseen bars can only make it taller.
- The invariant: if leftMax <= rightMax, then level(L) = leftMax exactly, so L can be settled; otherwise settle R symmetrically.
- Why comparing heights (h[L] < h[R]) is also correct, and what goes wrong if you move the taller side.
- Complexity: each step settles one bar, so O(n) time; four variables, so O(1) extra space.
- C++ details: keep the pointers as \`int\` (the right pointer can reach -1, which a \`size_t\` cannot hold), and the proof covers the levels but not the sum — accumulate in \`long long\` because signed overflow is undefined behaviour.

**Code / implementation expected:** Optional — the two-pointer loop in C++17 plus a short argument; a brute-force cross-check is a strong bonus.`,
        answer: `**Target Audience:** Intermediate — you have seen the trapping rain water problem and can read C++; the proof is explained from scratch.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two friends walk towards each other along a row of walls of different heights, one from each end, to measure how much rain the dips between the walls will hold. Each friend remembers only one number: the tallest wall they have passed so far. They never look ahead, never write anything down, and never go back.

At first this sounds impossible. The water above a spot depends on the tallest wall to its left **and** the tallest wall to its right — and the left friend has not seen anything on the right yet. Yet the two-pointer solution does exactly this and gets the right answer, using four variables in total.

The trick is a promise. The friend who is currently looking at the lower side can say: "My partner has already passed a wall at least as tall as my best one. So whatever is still unseen in the middle, the right side of my spot is high enough, and the water here is limited only by *my* tallest wall." Interviewers ask this follow-up because many candidates memorise the code for [trapping rain water](/interview-question/how-do-you-solve-the-trapping-rain-water-problem) but cannot explain why it is correct. Being able to state the invariant is what separates "I remembered it" from "I understand it".

## 2. The Problem in One Paragraph

Each array value \`h[i]\` is the height of a bar of width 1. The water above bar \`i\` is

\`level(i) - h[i]\`, where \`level(i) = min(trueLeft(i), trueRight(i))\`,

\`trueLeft(i)\` is the maximum of \`h[0..i]\` and \`trueRight(i)\` is the maximum of \`h[i..n-1]\` (both include bar \`i\`). The simple O(n)-space solution precomputes both arrays; the full problem and all four solutions are in [How do you solve the trapping rain water problem?](/interview-question/how-do-you-solve-the-trapping-rain-water-problem). This page answers one question: **how can we get \`level(i)\` without storing either array?**

## 3. The Invariant That Makes It Work

The algorithm keeps two pointers, \`L\` moving right and \`R\` moving left, and two running maxima:

- \`leftMax\` = the maximum of \`h[0..L]\` — this is **exactly** \`trueLeft(L)\`, because every bar from 0 to \`L\` has been seen.
- \`rightMax\` = the maximum of \`h[R..n-1]\` — this is exactly \`trueRight(R)\`.

What we do **not** know is \`trueRight(L)\`: it is the maximum of \`h[L..n-1]\`, and the middle part \`h[L+1..R-1]\` has not been read yet. But we do know a lower bound for it: \`h[L..n-1]\` contains \`h[R..n-1]\`, so

\`trueRight(L) >= rightMax\`.

📌 **Interview term: Loop invariant** — a statement that is true before and after every iteration of a loop. Here: \`leftMax\` is the exact left wall of \`L\`, \`rightMax\` is the exact right wall of \`R\`, and every bar outside \`[L, R]\` already has its correct water added.

📌 **Interview term: Lower bound** — a value that something is known to be at least. \`rightMax\` is a lower bound for the true right wall of \`L\`: unseen bars can only make that wall taller.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="Bars left of L are settled with running max leftMax, bars right of R are settled with running max rightMax, and the middle is unknown">
  <defs>
    <marker id="b10q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="360" y="24" text-anchor="middle">What the algorithm knows at one moment</text>
  <rect class="d-box-muted" x="20" y="50" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="80" text-anchor="middle">settled left</text>
  <text class="d-sub" x="105" y="102" text-anchor="middle">max so far: leftMax</text>
  <rect class="d-box-accent" x="210" y="50" width="70" height="70" rx="10"/>
  <text class="d-text" x="245" y="90" text-anchor="middle">L</text>
  <rect class="d-box" x="300" y="50" width="120" height="70" rx="10"/>
  <text class="d-text" x="360" y="80" text-anchor="middle">not seen yet</text>
  <text class="d-sub" x="360" y="102" text-anchor="middle">any heights</text>
  <rect class="d-box-accent" x="440" y="50" width="70" height="70" rx="10"/>
  <text class="d-text" x="475" y="90" text-anchor="middle">R</text>
  <rect class="d-box-muted" x="530" y="50" width="170" height="70" rx="10"/>
  <text class="d-text" x="615" y="80" text-anchor="middle">settled right</text>
  <text class="d-sub" x="615" y="102" text-anchor="middle">max so far: rightMax</text>
  <path class="d-edge" d="M 245 124 L 245 156" marker-end="url(#b10q5-arrow)"/>
  <path class="d-edge" d="M 475 124 L 475 156" marker-end="url(#b10q5-arrow)"/>
  <rect class="d-box-accent" x="140" y="160" width="440" height="66" rx="10"/>
  <text class="d-text" x="360" y="186" text-anchor="middle">true right wall of L = max of h from L to the end</text>
  <text class="d-sub" x="360" y="210" text-anchor="middle">that range contains R and everything after it, so it is at least rightMax</text>
</svg>

Now the decision rule. **If \`leftMax <= rightMax\`:**

\`leftMax <= rightMax <= trueRight(L)\`, so \`level(L) = min(leftMax, trueRight(L)) = leftMax\`.

The water at \`L\` is exactly \`leftMax - h[L]\`, no matter what the unseen middle contains. We add it and move \`L\` one step right. **Otherwise** (\`rightMax < leftMax\`), the mirror argument settles \`R\` with \`rightMax - h[R]\` and moves \`R\` left.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="leftMax is at most rightMax, which is at most the true right wall, so the water level at L is exactly leftMax">
  <defs>
    <marker id="b10q5-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="60" text-anchor="middle">leftMax</text>
  <text class="d-sub" x="95" y="82" text-anchor="middle">exact left wall of L</text>
  <text class="d-text" x="200" y="70" text-anchor="middle">&lt;=</text>
  <rect class="d-box" x="230" y="30" width="150" height="70" rx="10"/>
  <text class="d-text" x="305" y="60" text-anchor="middle">rightMax</text>
  <text class="d-sub" x="305" y="82" text-anchor="middle">the branch condition</text>
  <text class="d-text" x="410" y="70" text-anchor="middle">&lt;=</text>
  <rect class="d-box" x="440" y="30" width="170" height="70" rx="10"/>
  <text class="d-text" x="525" y="60" text-anchor="middle">true right wall</text>
  <text class="d-sub" x="525" y="82" text-anchor="middle">unknown, but at least this</text>
  <path class="d-edge" d="M 525 104 L 525 140 L 380 140" marker-end="url(#b10q5-arrow2)"/>
  <rect class="d-box-accent" x="150" y="120" width="226" height="56" rx="10"/>
  <text class="d-text" x="263" y="146" text-anchor="middle">level at L = leftMax</text>
  <text class="d-sub" x="263" y="166" text-anchor="middle">min of the two walls</text>
</svg>

The unseen middle can only *raise* the true right wall, and raising the higher of two walls never changes a minimum that is already decided by the lower one. That is the whole proof.

📌 **Interview term: Settling a bar** — adding a bar's final water to the total and never looking at it again. Each loop step settles exactly one bar, so the loop runs n times.

**Why only O(1) space.** We never need the full \`leftMax\`/\`rightMax\` arrays, because each bar is settled at the moment its own side's running maximum is the deciding wall. Four integers (\`L\`, \`R\`, \`leftMax\`, \`rightMax\`) plus the total are all the state there is.

## 4. Two Correct Ways to Write the Branch

Most published code compares **heights**, not maxima:

- *Rule "maxes"* (the proof above): update both maxima, then settle the side with the smaller running max.
- *Rule "heights"* (the common code): if \`h[L] < h[R]\`, settle \`L\` with \`leftMax\`, else settle \`R\` with \`rightMax\`.

Why is the heights rule also safe? When we settle \`L\` under it, \`h[L] < h[R]\`, so the current bar on the right is already taller than the current left bar. And every earlier left bar was settled for the same reason — at that time it was smaller than some right bar at a position \`>= R\`, which is still to the right of \`L\`. So everything that built \`leftMax\` is smaller than some bar in \`h[R..n-1]\`, which gives \`leftMax <= trueRight(L)\` again. Example 2 confirms both rules give the right answer on 3,000 random arrays and that the invariant \`leftMax <= trueRight(L)\` (and its mirror) never fails.

**What breaks it.** Flip the rule — settle the side with the *larger* running max — and the bound no longer holds: the level we use can be higher than the true wall on the other side. Example 2 runs that wrong rule too: 2,543 of the 3,000 arrays get a wrong total.

📌 **Interview term: Proof by invariant** — showing an algorithm is correct by stating a property, proving the first step makes it true, and proving each step keeps it true. When the loop ends, the property gives the answer.

This is the same shape of argument as in [container with most water](/interview-question/how-do-you-solve-the-container-with-most-water-problem): move the side that is limiting, because the other side cannot make things worse for it. See also [the two-pointer technique](/interview-question/what-is-the-two-pointer-technique).

## 5. A Trace You Can Check by Hand

Example 1 runs the "maxes" rule on \`[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]\` with a \`while L <= R\` loop, so all 12 bars are settled (including the final one where the pointers meet). For each step it prints which side was settled, both running maxima, the level used, and — only for checking — the true level \`min(trueLeft(i), trueRight(i))\` computed separately with prefix arrays. In every line, the level used equals the true level, even though the algorithm itself never looks at the middle. The full output is in the Verified section.

## 6. The Code in C++

Here is the "maxes" version of the loop with the trace printing (example 1). The \`level\` vector is only used to print a check column; the algorithm itself uses four variables. The small test inputs keep the total inside \`int\`; production code should return \`long long\` (see the [main trapping rain water page](/interview-question/how-do-you-solve-the-trapping-rain-water-problem)).

~~~cpp
int trapTraced(const std::vector<int>& h) {
    std::vector<int> level = trueLevels(h); // only used to check each step, not by the algorithm
    int lo = 0, hi = (int)h.size() - 1;     // int, not size_t: hi may become -1
    int leftMax = 0, rightMax = 0, water = 0;
    while (lo <= hi) {
        leftMax = std::max(leftMax, h[lo]);
        rightMax = std::max(rightMax, h[hi]);
        char side;
        int i, used;
        if (leftMax <= rightMax) {
            // leftMax is the smaller wall, and the real right wall of lo is >= rightMax
            side = 'L'; i = lo; used = leftMax; lo++;
        } else {
            side = 'R'; i = hi; used = rightMax; hi--;
        }
        water += used - h[i];
        std::cout << "settle " << side << " bar " << i << ": leftMax=" << leftMax << " rightMax=" << rightMax
                  << " level " << used << " (true " << level[i] << ") water +" << (used - h[i]) << " = " << water << "\\n";
    }
    return water;
}
~~~

**What to point out in this code:**

- Both maxima are updated **before** the decision, so \`leftMax\` already includes \`h[lo]\` and \`used - h[i]\` is never negative.
- \`int lo = 0, hi = (int)h.size() - 1;\` — the cast matters. With \`while (lo <= hi)\` the right pointer can step to -1 (for example on an empty vector), and a \`size_t\` would wrap around to a huge value instead.
- \`while (lo <= hi)\` settles every bar, including the meeting point; the common \`while (left < right)\` form skips that last bar, which is a tallest bar and holds no water.
- \`main\` calls \`trapTraced\` first and prints the total afterwards, because the function prints its trace; putting the call inside the same \`std::cout << ... << trapTraced(...)\` chain would print the text before the call runs (since C++17 the left operand of \`<<\` is evaluated first).
- Example 2 returns \`{water, violations}\` as a \`std::pair\` and unpacks it with a structured binding, \`auto [got, bad] = twoPointers(h, r);\`.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13 with \`-std=c++17\`). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 builds 3,000 arrays (length 0–15, heights 0–9) with a small deterministic generator (MINSTD), so every language tests the same inputs. For each settled bar it also checks the invariant: the level used must not exceed the true wall on the other side.

**Example 1 — a step-by-step trace that compares each settled level with the true level** prints:

~~~text
settle L bar 0: leftMax=0 rightMax=1 level 0 (true 0) water +0 = 0
settle L bar 1: leftMax=1 rightMax=1 level 1 (true 1) water +0 = 0
settle L bar 2: leftMax=1 rightMax=1 level 1 (true 1) water +1 = 1
settle R bar 11: leftMax=2 rightMax=1 level 1 (true 1) water +0 = 1
settle L bar 3: leftMax=2 rightMax=2 level 2 (true 2) water +0 = 1
settle L bar 4: leftMax=2 rightMax=2 level 2 (true 2) water +1 = 2
settle L bar 5: leftMax=2 rightMax=2 level 2 (true 2) water +2 = 4
settle L bar 6: leftMax=2 rightMax=2 level 2 (true 2) water +1 = 5
settle R bar 10: leftMax=3 rightMax=2 level 2 (true 2) water +0 = 5
settle R bar 9: leftMax=3 rightMax=2 level 2 (true 2) water +1 = 6
settle R bar 8: leftMax=3 rightMax=2 level 2 (true 2) water +0 = 6
settle L bar 7: leftMax=3 rightMax=3 level 3 (true 3) water +0 = 6
total = 6
~~~

**Example 2 — 3,000 random arrays checked against brute force, for two correct rules and one wrong rule** prints:

~~~text
3000 random arrays (length 0-15, heights 0-9) checked against brute force
  rule heights: wrong answers 0, invariant violations 0
  rule maxes: wrong answers 0, invariant violations 0
  rule wrong: wrong answers 2543, invariant violations 9791
~~~

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Two pointers (any correct rule) | O(n) | O(1) | each iteration settles one bar; state is L, R, leftMax, rightMax, total |
| Prefix/suffix arrays | O(n) | O(n) | two extra vectors of size n |
| Brute force used as the test oracle | O(n²) | O(1) | two scans per bar with a \`maxOf\` helper |

## Common Pitfalls

- **Settling the side with the larger max.** It breaks the bound; example 2 shows 2,543 wrong answers out of 3,000.
- **\`size_t\` pointers.** \`hi\` must be able to become -1; with \`size_t\` it wraps to 18446744073709551615 and the loop reads out of bounds.
- **Updating the max after subtracting.** Then \`leftMax - h[lo]\` can be negative when \`h[lo]\` is a new maximum.
- **Summing into \`int\` on large inputs.** Signed overflow is undefined behaviour; return \`long long\`.
- **Using \`std::min(leftMax, rightMax)\` as the level for both sides.** When you settle L the level is \`leftMax\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What each pointer knows:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax</code> is exactly the tallest bar in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[0..L]</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rightMax</code> is exactly the tallest in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[R..n-1]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The bound:</strong> <span style="color:#f0e2c8;">The true right wall of L is the max of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[L..n-1]</code>, which contains <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[R..n-1]</code>, so it is at least <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rightMax</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The step:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax &lt;= rightMax</code>, the level at L is exactly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax</code>: add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax - h[L]</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">++L</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Space:</strong> <span style="color:#f0e2c8;">Each bar is settled the moment its own side decides it: O(1) space, O(n) time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> pointers (R can reach -1) and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> total — the proof covers the levels, not overflow.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you ignore the unseen middle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unseen bars can only make the right wall taller. The level is a minimum, already decided by the left wall, so a taller right wall changes nothing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The usual code compares <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">h[left] &lt; h[right]</code>. Is that the same?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a different rule that is also correct: every bar that formed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">leftMax</code> was smaller than some bar at or right of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right</code>, so the bound still holds.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you move the taller side instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The level can exceed the true wall on the other side; our random test found wrong totals on 2,543 of 3,000 arrays.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">size_t</code> for the pointers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The right pointer can step past the left one to -1; an unsigned type wraps to a huge number and the next <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">h[hi]</code> is out of bounds.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every iteration settles one bar and moves one pointer inward, so the loop runs at most n times.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Loop invariant** | A statement true before and after every loop iteration |
| **Lower bound** | A value something is known to be at least |
| **Settling a bar** | Adding its final water and never revisiting it |
| **Proof by invariant** | Prove a property starts true and every step keeps it true |

---
**Conclusion:** The two-pointer solution works because of one inequality chain: \`leftMax <= rightMax <= trueRight(L)\`. \`leftMax\` is the exact left wall of \`L\` and \`rightMax\` is a lower bound on its right wall, so when the left max is smaller it is the water level, whatever the unseen middle holds. Each step settles one bar, giving O(n) time with four variables. In C++, the trace and a seeded 3,000-array test make the argument concrete; the language-specific care is in the types — \`int\` pointers that may reach -1 and a \`long long\` total.`,
        examples: [
          {
            label: "Traced two-pointer run: level used vs true level for every bar",
            code: `#include <algorithm>
#include <iostream>
#include <vector>

// Water level over each bar = min(tallest bar to its left, tallest to its right).
std::vector<int> trueLevels(const std::vector<int>& h) {
    int n = (int)h.size();
    std::vector<int> left(n), right(n), level(n);
    for (int i = 0; i < n; i++) left[i] = std::max(h[i], i > 0 ? left[i - 1] : 0);
    for (int i = n - 1; i >= 0; i--) right[i] = std::max(h[i], i < n - 1 ? right[i + 1] : 0);
    for (int i = 0; i < n; i++) level[i] = std::min(left[i], right[i]);
    return level;
}

int trapTraced(const std::vector<int>& h) {
    std::vector<int> level = trueLevels(h); // only used to check each step, not by the algorithm
    int lo = 0, hi = (int)h.size() - 1;     // int, not size_t: hi may become -1
    int leftMax = 0, rightMax = 0, water = 0;
    while (lo <= hi) {
        leftMax = std::max(leftMax, h[lo]);
        rightMax = std::max(rightMax, h[hi]);
        char side;
        int i, used;
        if (leftMax <= rightMax) {
            // leftMax is the smaller wall, and the real right wall of lo is >= rightMax
            side = 'L'; i = lo; used = leftMax; lo++;
        } else {
            side = 'R'; i = hi; used = rightMax; hi--;
        }
        water += used - h[i];
        std::cout << "settle " << side << " bar " << i << ": leftMax=" << leftMax << " rightMax=" << rightMax
                  << " level " << used << " (true " << level[i] << ") water +" << (used - h[i]) << " = " << water << "\\n";
    }
    return water;
}

int main() {
    int total = trapTraced({0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1}); // call first: the trace prints inside
    std::cout << "total = " << total << "\\n";
    return 0;
}`,
          },
          {
            label: "3,000 random arrays: two correct rules and one wrong rule vs brute force",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

int maxOf(const std::vector<int>& h, int from, int to) { // max of h[from..to-1], 0 when empty
    int m = 0;
    for (int i = from; i < to; i++) m = std::max(m, h[i]);
    return m;
}

// Reference answer: level over bar i = min(max of h[0..i], max of h[i..n-1]).
int brute(const std::vector<int>& h) {
    int n = (int)h.size(), water = 0;
    for (int i = 0; i < n; i++) water += std::min(maxOf(h, 0, i + 1), maxOf(h, i, n)) - h[i];
    return water;
}

// rule 0 "heights": settle the side with the lower bar (the usual code).
// rule 1 "maxes":   settle the side with the lower running max (the proof version).
// rule 2 "wrong":   settle the side with the HIGHER running max (breaks the proof).
std::pair<int, int> twoPointers(const std::vector<int>& h, int rule) {
    int n = (int)h.size(), lo = 0, hi = n - 1, lm = 0, rm = 0, water = 0, violations = 0;
    while (lo <= hi) {
        lm = std::max(lm, h[lo]);
        rm = std::max(rm, h[hi]);
        bool goLeft = rule == 0 ? h[lo] < h[hi] : rule == 1 ? lm <= rm : lm > rm;
        if (goLeft) {
            // the invariant: the wall we use must be <= the true right wall of lo
            if (lm > maxOf(h, lo, n)) violations++;
            water += lm - h[lo];
            lo++;
        } else {
            if (rm > maxOf(h, 0, hi + 1)) violations++;
            water += rm - h[hi];
            hi--;
        }
    }
    return {water, violations};
}

int main() {
    const std::string names[] = {"heights", "maxes", "wrong"};
    int wrongAnswers[3] = {0, 0, 0}, violations[3] = {0, 0, 0};
    int tests = 3000;
    long long seed = 99;
    for (int t = 0; t < tests; t++) {
        seed = seed * 48271 % 2147483647LL;
        int n = (int)(seed % 16);
        std::vector<int> h;
        for (int i = 0; i < n; i++) {
            seed = seed * 48271 % 2147483647LL;
            h.push_back((int)(seed % 10));
        }
        int want = brute(h);
        for (int r = 0; r < 3; r++) {
            auto [got, bad] = twoPointers(h, r);
            if (got != want) wrongAnswers[r]++;
            violations[r] += bad;
        }
    }
    std::cout << tests << " random arrays (length 0-15, heights 0-9) checked against brute force\\n";
    for (int r = 0; r < 3; r++) {
        std::cout << "  rule " << names[r] << ": wrong answers " << wrongAnswers[r] << ", invariant violations " << violations[r] << "\\n";
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
