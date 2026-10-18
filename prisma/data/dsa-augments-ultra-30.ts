/**
 * DSA ULTRA — batch 30: dynamic programming II — equal-sum partition (subset sum with a 1-D
 * table), Burst Balloons (interval DP over the last balloon burst) and bitmask dynamic
 * programming (assignment, Held-Karp TSP, submask enumeration). One complete answer per language
 * (Python, JavaScript, Java, C++). Every example was run with python3 / node / javac+java /
 * g++ -std=c++17 by scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you check if an array can be partitioned into two equal-sum subsets?",
    difficulty: "medium",
    seoDescription: "Check if an array splits into two equal-sum subsets: reduce to subset sum, 1-D DP with a downward loop, and a bitset trick in 4 languages.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given an array of positive integers, can you split it into two groups whose sums are equal? Every number must go into one of the two groups. Please code it in Python and tell me the time and space cost."

**What a strong answer should cover:**
- The reframing: equal halves exist exactly when the total is even and some subset sums to total / 2.
- The 1-D subset-sum table \`dp[s]\` with base case \`dp[0] = true\` and transition \`dp[s] = dp[s] OR dp[s - x]\`.
- Why the inner loop runs from \`target\` down to \`x\` (each item used once — 0/1, not unbounded).
- Complexity O(n × S / 2) time and O(S / 2) space, and why that is pseudo-polynomial; brute force is O(2ⁿ).
- Python details: \`[False] * (target + 1)\` is safe for a flat row (booleans are immutable), \`range(target, x - 1, -1)\` for the downward loop, and the arbitrary-precision \`int\` as a bitset (\`bits |= bits << x\`).

**Clarifying questions expected:**
- Are all numbers positive integers, and how large can n and the values be?
- Do you need the actual two subsets, or only true / false?

**Code / implementation expected:** Yes — a short \`can_partition(nums)\` in Python with a 1-D boolean list, plus the odd-sum check.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need loops and arrays; dynamic programming is explained from scratch  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two friends come back from a trip with a bag of souvenirs, each with a price tag: 1, 5, 11 and 5 dollars. They want to split the bag so that each person carries exactly the same total value — no cutting souvenirs in half, every souvenir goes to someone.

You could try every way of dealing out the souvenirs. With 4 items that is 2⁴ = 16 ways, easy. With 40 items it is about a trillion ways, which no computer will finish during your interview.

The trick that makes this problem easy is a change of question. The bag is worth 22, so each friend must get exactly 11. If you can find **one** pile of souvenirs worth exactly 11, the rest of the bag is automatically worth 22 − 11 = 11 too. So the real question is: *"Can I pick some of these numbers so they add up to exactly half the total?"* That smaller question has a famous, fast answer, and it is a cousin of the [0/1 knapsack problem](/interview-question/how-do-you-solve-the-0-1-knapsack-problem).

This problem shows up in interviews because it tests three things at once: spotting the reframing, building a small [dynamic programming](/interview-question/what-is-dynamic-programming) table, and getting one subtle loop direction right.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all numbers positive integers? | The table is indexed by sums. Negative numbers or fractions break the indexing (you would need an offset or a hash set of sums). |
| How large are n and the values? | The DP costs about n × (total / 2) steps. With n ≤ 200 and values ≤ 100, half the total is at most 10,000 — tiny. With values up to 10⁹, this method is useless. |
| Must every element be used? | Yes in the standard version — that is what makes "one half sums to total / 2" equivalent to a full split. |
| Do you need the two subsets, or just yes / no? | Yes / no needs one boolean row. Returning the subsets needs one extra array to remember how each sum was first reached. |
| Can a subset be empty? | Matters only for the empty array or a total of 0. Most versions say the empty array can be split (two empty halves). |

## 3. The Reframing: Half the Total

Write S for the sum of all numbers. If the array splits into two groups with equal sums, each group sums to S / 2. Two facts fall out immediately:

1. **If S is odd, the answer is false.** Two equal integers always add up to an even number.
2. **If S is even, the answer is true exactly when some subset sums to S / 2.** Whatever is left over sums to S − S / 2 = S / 2.

📌 **Interview term: Subset sum problem** — "given numbers and a target, can some subset of the numbers add up to exactly the target?" Equal partition is subset sum with target S / 2.

📌 **Interview term: Partition problem** — the formal name for "can this multiset be split into two parts with equal sums?". It is NP-complete in general, which is why the fast method below depends on the *size of the numbers*, not just how many there are.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="The array 1, 5, 11, 5 has total 22. One half holds 11, the other half holds 1, 5 and 5. Both halves sum to 11">
  <defs>
    <marker id="b30q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="300" y="24" text-anchor="middle">total 22, so each half needs 11</text>
  <rect class="d-box" x="120" y="44" width="60" height="40" rx="6"/>
  <text class="d-text" x="150" y="69" text-anchor="middle">1</text>
  <rect class="d-box" x="220" y="44" width="60" height="40" rx="6"/>
  <text class="d-text" x="250" y="69" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="320" y="44" width="60" height="40" rx="6"/>
  <text class="d-text" x="350" y="69" text-anchor="middle">11</text>
  <rect class="d-box" x="420" y="44" width="60" height="40" rx="6"/>
  <text class="d-text" x="450" y="69" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 350 86 L 190 186" marker-end="url(#b30q1-arrow)"/>
  <path class="d-edge" d="M 150 86 L 410 186" marker-end="url(#b30q1-arrow)"/>
  <path class="d-edge" d="M 250 86 L 425 186" marker-end="url(#b30q1-arrow)"/>
  <path class="d-edge" d="M 450 86 L 445 186" marker-end="url(#b30q1-arrow)"/>
  <rect class="d-box-accent" x="80" y="190" width="200" height="56" rx="10"/>
  <text class="d-text" x="180" y="214" text-anchor="middle">half A: 11</text>
  <text class="d-sub" x="180" y="235" text-anchor="middle">sum 11</text>
  <rect class="d-box" x="340" y="190" width="200" height="56" rx="10"/>
  <text class="d-text" x="440" y="214" text-anchor="middle">half B: 1, 5, 5</text>
  <text class="d-sub" x="440" y="235" text-anchor="middle">sum 11</text>
</svg>

The arrows show the split the code finds for \`[1, 5, 11, 5]\`: the item 11 alone is one half, and 1, 5 and 5 make the other half.

## 4. Building the Table of Reachable Sums

Think of a row of light bulbs numbered 0 to S / 2. Bulb s is on when "some of the items I have looked at so far can add up to exactly s". At the start only bulb 0 is on — picking nothing gives a sum of 0.

Now take the items one at a time. For an item worth x, every bulb s that was already on lets you switch on bulb s + x (take the old pile and add this item). After all items, look at bulb S / 2.

📌 **Interview term: DP state** — the exact question one table cell answers. Here \`dp[s]\` = "can a subset of the items processed so far sum to s?".

📌 **Interview term: Transition (recurrence)** — how a cell is computed from earlier cells: \`dp[s] = dp[s] OR dp[s − x]\` — either s was already reachable without this item, or it is reachable by adding this item to a pile worth s − x.

📌 **Interview term: Base case** — \`dp[0] = true\`: the empty subset sums to 0. Every other cell starts false.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 310" role="img" aria-label="The dp row of reachable sums 0 to 11 after each item of 1, 5, 11, 5. Cell 11 becomes true after the item 11">
  <text class="d-sub" x="148" y="30" text-anchor="middle">0</text>
  <text class="d-sub" x="190" y="30" text-anchor="middle">1</text>
  <text class="d-sub" x="232" y="30" text-anchor="middle">2</text>
  <text class="d-sub" x="274" y="30" text-anchor="middle">3</text>
  <text class="d-sub" x="316" y="30" text-anchor="middle">4</text>
  <text class="d-sub" x="358" y="30" text-anchor="middle">5</text>
  <text class="d-sub" x="400" y="30" text-anchor="middle">6</text>
  <text class="d-sub" x="442" y="30" text-anchor="middle">7</text>
  <text class="d-sub" x="484" y="30" text-anchor="middle">8</text>
  <text class="d-sub" x="526" y="30" text-anchor="middle">9</text>
  <text class="d-sub" x="568" y="30" text-anchor="middle">10</text>
  <text class="d-sub" x="610" y="30" text-anchor="middle">11</text>
  <text class="d-text" x="20" y="71">start</text>
  <rect class="d-box-accent" x="130" y="50" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="71" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="172" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="214" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="340" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="382" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="424" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="550" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="592" y="50" width="36" height="32" rx="4"/>
  <text class="d-text" x="20" y="121">after 1</text>
  <rect class="d-box-accent" x="130" y="100" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="121" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="172" y="100" width="36" height="32" rx="4"/>
  <text class="d-text" x="190" y="121" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="214" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="340" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="382" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="424" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="550" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="592" y="100" width="36" height="32" rx="4"/>
  <text class="d-text" x="20" y="171">after 5</text>
  <rect class="d-box-accent" x="130" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="171" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="172" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="190" y="171" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="214" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="340" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="358" y="171" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="382" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="400" y="171" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="424" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="550" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="592" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="20" y="221">after 11</text>
  <rect class="d-box-accent" x="130" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="221" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="172" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="190" y="221" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="214" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="340" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="358" y="221" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="382" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="400" y="221" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="424" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="550" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="592" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="610" y="221" text-anchor="middle">T</text>
  <text class="d-text" x="20" y="271">after 5</text>
  <rect class="d-box-accent" x="130" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="271" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="172" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="190" y="271" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="214" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="340" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="358" y="271" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="382" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="400" y="271" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="424" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="550" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="568" y="271" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="592" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="610" y="271" text-anchor="middle">T</text>
</svg>

Each row is the table after one more item. Bulb 11 switches on when the item 11 is processed (reading bulb 0), and stays on. The final row also shows 10 (5 + 5) and 6 (1 + 5) — every sum up to 11 that some subset can make.

## 5. The One Detail Everybody Gets Wrong: Loop Direction

The full table would be 2-D: one row per item. We only keep **one** row and overwrite it in place, because each new row only reads the row above it. That saves memory, but it creates a trap.

When processing item x, the update for s reads cell s − x, which is *to the left*. If the loop walks **upward** (s = x, x + 1, …), the cell s − x may already have been updated in this same round — meaning it already counts item x. Reading it then uses item x a second time.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Processing item 2 with target 4. Walking upward reads cell 2 after it was already set this round and wrongly marks 4. Walking downward reads the old value of cell 2 and leaves 4 false">
  <defs>
    <marker id="b30q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="335" y="24" text-anchor="middle">item x = 2, target 4</text>
  <text class="d-text" x="20" y="111">upward</text>
  <path class="d-edge-accent" d="M 185 88 Q 255 40 325 88" marker-end="url(#b30q1-arrow2)"/>
  <path class="d-edge-accent" d="M 325 88 Q 395 40 465 88" marker-end="url(#b30q1-arrow2)"/>
  <rect class="d-box-accent" x="160" y="90" width="50" height="34" rx="4"/>
  <text class="d-text" x="185" y="112" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="230" y="90" width="50" height="34" rx="4"/>
  <text class="d-sub" x="255" y="112" text-anchor="middle">F</text>
  <rect class="d-box-accent" x="300" y="90" width="50" height="34" rx="4"/>
  <text class="d-text" x="325" y="112" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="370" y="90" width="50" height="34" rx="4"/>
  <text class="d-sub" x="395" y="112" text-anchor="middle">F</text>
  <rect class="d-box-accent" x="440" y="90" width="50" height="34" rx="4"/>
  <text class="d-text" x="465" y="112" text-anchor="middle">T</text>
  <rect class="d-box" x="520" y="88" width="104" height="38" rx="6"/>
  <text class="d-text" x="572" y="112" text-anchor="middle">wrong</text>
  <text class="d-text" x="20" y="241">downward</text>
  <path class="d-edge-accent" d="M 185 218 Q 255 170 325 218" marker-end="url(#b30q1-arrow2)"/>
  <path class="d-edge-dashed" d="M 325 218 Q 395 170 465 218" marker-end="url(#b30q1-arrow2)"/>
  <rect class="d-box-accent" x="160" y="220" width="50" height="34" rx="4"/>
  <text class="d-text" x="185" y="242" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="230" y="220" width="50" height="34" rx="4"/>
  <text class="d-sub" x="255" y="242" text-anchor="middle">F</text>
  <rect class="d-box-accent" x="300" y="220" width="50" height="34" rx="4"/>
  <text class="d-text" x="325" y="242" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="370" y="220" width="50" height="34" rx="4"/>
  <text class="d-sub" x="395" y="242" text-anchor="middle">F</text>
  <rect class="d-box-muted" x="440" y="220" width="50" height="34" rx="4"/>
  <text class="d-sub" x="465" y="242" text-anchor="middle">F</text>
  <rect class="d-box" x="520" y="218" width="104" height="38" rx="6"/>
  <text class="d-text" x="572" y="242" text-anchor="middle">correct</text>
  <text class="d-sub" x="185" y="282" text-anchor="middle">s = 0</text>
  <text class="d-sub" x="325" y="282" text-anchor="middle">s = 2</text>
  <text class="d-sub" x="465" y="282" text-anchor="middle">s = 4</text>
</svg>

With the item 2 and target 4, the upward walk sets cell 2 from cell 0, then sets cell 4 from the cell 2 it just changed — that is 2 + 2, the same item twice. The downward walk reaches cell 4 first, while cell 2 still holds its old value, so the item is used at most once.

📌 **Interview term: 0/1 vs unbounded** — in a 0/1 problem each item can be used at most once (walk the sums downward); in an unbounded problem items may repeat, like coins in [coin change](/interview-question/how-do-you-solve-the-coin-change-problem) (walk upward on purpose).

📌 **Interview term: Space optimization (rolling array)** — keeping only one row of a 2-D DP table because each row depends only on the previous one. It turns O(n × target) memory into O(target).

## 6. From Brute Force to the Optimal Approach

**Brute force.** For each number, either put it in the first half or not — that is the include/exclude recursion from [generating all subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array). It explores up to 2ⁿ subsets: O(2ⁿ) time. Example 2 counts the calls on 18 numbers.

**Memoized recursion.** The answer to "can items i..n−1 make the sum r?" depends only on (i, r), so caching it gives O(n × target) states. That is correct, but it uses a 2-D cache and a deep [recursion](/interview-question/what-is-recursion-and-what-is-a-base-case) stack.

**Bottom-up 1-D table (the answer to give).** The bulb row above: O(n × target) time, O(target) memory, no recursion. Add the odd-sum early exit, and stop early if \`dp[target]\` turns on.

**Bitset trick (a strong follow-up).** Store the whole row as the bits of one big integer. "Every reachable s also gives s + x" is a single shift-and-OR: \`bits |= bits << x\`. Same O(n × target) bit operations, but done one machine word (64 bits) at a time, so roughly 64 times fewer steps. Example 3 shows it.

📌 **Interview term: Pseudo-polynomial time** — running time that is polynomial in the *numeric value* of the input (here the target), not in its length. O(n × S) is fast when S is small, and exponential in the number of digits of S.

## 7. The Code in Python

The whole solution is one function:

~~~python
def can_partition(nums):
    total = sum(nums)
    if total % 2 == 1:              # odd total: two equal halves are impossible
        return False
    target = total // 2
    dp = [False] * (target + 1)     # dp[s]: can some subset of the items seen so far sum to s?
    dp[0] = True                    # the empty subset sums to 0
    for x in nums:
        for s in range(target, x - 1, -1):   # walk DOWN so x is used at most once
            if dp[s - x]:
                dp[s] = True
    return dp[target]
~~~

**What to point out in this code:**

- \`sum(nums) % 2 == 1\` is the early exit. \`total // 2\` uses floor division so \`target\` is an \`int\`; \`total / 2\` would give a \`float\`, and \`[False] * 5.0\` raises a \`TypeError\`.
- \`[False] * (target + 1)\` is fine for a flat list: the elements are immutable booleans, so sharing is harmless. (It is \`[[False] * m] * n\` for 2-D tables that silently shares rows.)
- \`range(target, x - 1, -1)\` walks from \`target\` down to \`x\` inclusive — the stop value is exclusive, so it must be \`x - 1\`. Writing \`range(x, target + 1)\` is the upward bug from section 5.
- To get the two halves (example 1), keep a \`parent\` list: the index of the item that first switched each sum on. Because the loop runs downward, the chain \`target → target − nums[i] → …\` always uses strictly earlier items, so no item is reused.
- **Bitset version (example 3):** a Python \`int\` has no fixed width — the [official docs](https://docs.python.org/3/library/stdtypes.html#numeric-types-int-float-complex) say integers have unlimited precision — so \`bits |= bits << x\` works for any total, and \`(bits >> target) & 1\` reads one bit. The shift and OR run in C over the integer's internal digits, many bits per step, which is why this is usually much faster than the explicit double loop in Python.
- Python loops are slow: n = 200 and target = 10,000 is 2 million inner steps — fine, but the bitset form is the one to mention if the interviewer asks for speed.

## 8. Dry Run on [1, 5, 11, 5]

Total 22, so target = 11. The row has cells 0..11; \`T\` marks a reachable sum.

| Item | Cells switched on this round (downward) | Reachable sums afterwards |
| :--- | :--- | :--- |
| start | — | 0 |
| 1 | 1 (from 0) | 0, 1 |
| 5 | 6 (from 1), 5 (from 0) | 0, 1, 5, 6 |
| 11 | 11 (from 0) | 0, 1, 5, 6, 11 |
| 5 | 11 already on; 10 (from 5) | 0, 1, 5, 6, 10, 11 |

Cell 11 is on, so the answer is true. The \`parent\` array remembers that 11 was first reached by the item 11 (from 0), so one half is \`[11]\` and the other is \`[1, 5, 5]\` — exactly the first line of example 1.

## 9. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — can_partition with one valid split** prints:

~~~text
[1, 5, 11, 5] sum=22 -> true  [11] | [1, 5, 5]
[1, 2, 3, 5] sum=11 -> false  (odd total)
[1, 2, 5] sum=8 -> false  (no subset reaches 4)
[3, 3, 3, 4, 5] sum=18 -> true  [3, 3, 3] | [4, 5]
[2, 2] sum=4 -> true  [2] | [2]
[100] sum=100 -> false  (no subset reaches 50)
[] sum=0 -> true  [] | []
true
false
~~~

**Example 2 — downward vs upward loop, and brute force vs DP work** prints:

~~~text
input -> target | downward | upward (bug) | brute force
[1, 2, 5] -> 4 | false | true | false
[2, 6] -> 4 | false | true | false
[1, 5, 11, 5] -> 11 | true | true | true
[3, 3, 3, 4, 5] -> 9 | true | true | true
n = 18, total = 342, target = 171
brute force: false after 405293 calls
dp:          false after 2754 cell updates
~~~

The upward loop says \`true\` for \`[1, 2, 5]\` and \`[2, 6]\` with target 4 — both wrong, because it used the item 2 (or 1) twice. On 18 even numbers whose half-total 171 is odd (so no subset can reach it), the brute force needs 405,293 calls to say no; the table needs 2,754 cell updates.

**Example 3 — the bitset version** prints:

~~~text
reachable sums of [1, 5, 11, 5]: [0, 1, 5, 6, 10, 11, 12, 16, 17, 21, 22]
set bits: 11, highest sum: 22
[1, 5, 11, 5] -> true
[1, 2, 3, 5] -> false
[1, 2, 5] -> false
[3, 3, 3, 4, 5] -> true
[100, 100, 100, 100, 99, 101] -> true
200 items, total 10100 -> true
~~~

## 10. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force include / exclude | O(2ⁿ) | O(n) | every subset may be tried; recursion depth n |
| Memoized recursion on (i, r) | O(n × S / 2) | O(n × S / 2) | one cache entry per (item, remaining sum) state |
| Bottom-up 1-D table | O(n × S / 2) | O(S / 2) | n passes over a row of S / 2 + 1 cells |
| Bitset shift-and-OR | O(n × S / 64) | O(S / 64) words | each pass shifts S bits, 64 per machine word |

Here n is the number of items and S their total. In example 2 the table did **2,754** cell updates where the brute force made **405,293** calls — and that gap doubles with every extra item.

## 11. Edge Cases

- **Odd total.** Return false before allocating anything (\`[1, 2, 3, 5]\` has total 11).
- **Even total but no subset reaches half.** \`[1, 2, 5]\` totals 8, but no subset makes 4 — the table, not the parity check, says false.
- **A single element.** \`[100]\` can never be split: the target 50 is unreachable.
- **An item bigger than half.** It can never be in the half that sums to S / 2; the inner loop simply does not run for it (s starts at target and must be ≥ x). If any item exceeds S / 2 the answer is false.
- **Empty array.** Total 0, target 0, \`dp[0]\` is true — two empty halves. Confirm with the interviewer if this matters.
- **Duplicates.** \`[2, 2]\` and \`[3, 3, 3, 4, 5]\` work naturally; each copy is a separate item.

## Common Pitfalls

- **Upward \`range\`.** \`for s in range(x, target + 1)\` lets an item be used twice; \`[2, 6]\` then "splits" because 2 + 2 = 4.
- **\`total / 2\` instead of \`total // 2\`.** The \`float\` target breaks \`[False] * (target + 1)\` and \`range\`.
- **Off-by-one in \`range\`.** \`range(target, x, -1)\` skips \`s == x\`, so an item can never form a sum on its own; the stop must be \`x - 1\`.
- **Forgetting the odd check.** With an odd total, \`total // 2\` rounds down and the table may find a subset for the wrong target.
- **Memoizing with \`@lru_cache\` on a deep recursion.** n = 200 items is fine, but the default recursion limit is 1,000 (\`sys.getrecursionlimit()\`), and a long list can hit it — the bottom-up loop has no recursion at all.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reframe:</strong> <span style="color:#f0e2c8;">Two equal halves means one subset sums to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total // 2</code>; the rest is the other half. Odd total → <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code> immediately.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s]</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> if some subset of the items seen so far sums to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0] = True</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Transition:</strong> <span style="color:#f0e2c8;">For each item <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>, for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code> down to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s] = dp[s] or dp[s - x]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why downward:</strong> <span style="color:#f0e2c8;">So <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s - x]</code> still describes the previous items — each item is used at most once (0/1, not unbounded).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(n × target) time, O(target) space; with Python ints, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bits |= bits &lt;&lt; x</code> does it as one big-integer bitset.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the inner loop go downward?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Going up, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s - x]</code> may already include <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> from this round, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> gets used twice. On <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 6]</code> the upward loop wrongly reports a split because 2 + 2 = 4.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the two subsets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[s]</code> = index of the item that first set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s]</code>. Walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code>, subtracting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[parent[s]]</code>, collecting indexes; everything else is the other half.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you make it faster in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> as a bitset: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bits = 1</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bits |= bits &lt;&lt; x</code> per item, and test <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(bits &gt;&gt; target) &amp; 1</code>. Same complexity, but the work is done in C on whole machine words.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if numbers can be negative?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The index trick breaks. Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> of reachable sums (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sums |= {s + x for s in sums}</code>) or shift every index by the most negative possible sum.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this polynomial time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is pseudo-polynomial: O(n × S) depends on the value S. The general partition problem is NP-complete; the DP is fast only because S is small.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subset sum problem** | Can some subset of the numbers add up to exactly a target? |
| **Partition problem** | Can the numbers be split into two groups with equal sums? NP-complete in general |
| **DP state** | The exact question one table cell answers: here, is sum s reachable? |
| **Transition (recurrence)** | How a cell is computed from earlier cells: dp[s] = dp[s] OR dp[s − x] |
| **Base case** | dp[0] = true: the empty subset sums to 0 |
| **0/1 vs unbounded** | Each item at most once (loop sums downward) vs items may repeat (loop upward) |
| **Space optimization (rolling array)** | Keep one row of a 2-D table because each row only reads the previous one |
| **Pseudo-polynomial time** | Polynomial in the numeric value of the input (the target), not in its length |
| **Arbitrary-precision int** | A Python int grows as needed, so it can hold a bitset of any length |

---
**Conclusion:** Equal partition is subset sum in disguise: if the total is odd, answer \`False\`; otherwise ask whether some subset reaches \`total // 2\`. In Python that is a list of \`target + 1\` booleans, filled item by item with \`range(target, x - 1, -1)\` so each item counts once — O(n × target) time and O(target) memory — and the big-integer bitset \`bits |= bits << x\` is the elegant speed-up. The same table, with values and a max instead of an OR, is the [0/1 knapsack problem](/interview-question/how-do-you-solve-the-0-1-knapsack-problem); for a subset problem that is solved over *sets* of items instead of sums, see [bitmask dynamic programming](/interview-question/what-is-bitmask-dynamic-programming).`,
        examples: [
          {
            label: "can_partition with one valid split",
            code: `def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


def can_partition(nums):
    total = sum(nums)
    if total % 2 == 1:              # odd total: two equal halves are impossible
        return False
    target = total // 2
    dp = [False] * (target + 1)     # dp[s]: can some subset of the items seen so far sum to s?
    dp[0] = True                    # the empty subset sums to 0
    for x in nums:
        for s in range(target, x - 1, -1):   # walk DOWN so x is used at most once
            if dp[s - x]:
                dp[s] = True
    return dp[target]


def find_half(nums):
    """Return the indexes of one subset summing to total/2, or None."""
    total = sum(nums)
    if total % 2 == 1:
        return None
    target = total // 2
    parent = [-1] * (target + 1)    # parent[s]: index of the item that first reached s
    reach = [False] * (target + 1)
    reach[0] = True
    for i, x in enumerate(nums):
        for s in range(target, x - 1, -1):
            if reach[s - x] and not reach[s]:
                reach[s] = True
                parent[s] = i
    if not reach[target]:
        return None
    picked, s = [], target
    while s > 0:                    # walk back: each step removes one item
        i = parent[s]
        picked.append(i)
        s -= nums[i]
    return sorted(picked)


for nums in ([1, 5, 11, 5], [1, 2, 3, 5], [1, 2, 5], [3, 3, 3, 4, 5], [2, 2], [100], []):
    total = sum(nums)
    half = find_half(nums)
    line = fmt(nums) + " sum=" + str(total) + " -> " + str(can_partition(nums)).lower()
    if half is not None:
        a = [nums[i] for i in half]
        b = [nums[i] for i in range(len(nums)) if i not in half]
        line += "  " + fmt(a) + " | " + fmt(b)
    elif total % 2 == 1:
        line += "  (odd total)"
    else:
        line += "  (no subset reaches " + str(total // 2) + ")"
    print(line)

print(str(can_partition([1, 5, 11, 5])).lower())  # true
print(str(can_partition([1, 2, 5])).lower())  # false`,
          },
          {
            label: "Downward vs upward loop, and brute force vs DP work",
            code: `def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


def subset_sum_down(nums, target):
    dp = [False] * (target + 1)
    dp[0] = True
    for x in nums:
        for s in range(target, x - 1, -1):    # correct: high to low
            dp[s] = dp[s] or dp[s - x]
    return dp[target]


def subset_sum_up(nums, target):
    dp = [False] * (target + 1)
    dp[0] = True
    for x in nums:
        for s in range(x, target + 1):        # BUG: low to high reuses x
            dp[s] = dp[s] or dp[s - x]
    return dp[target]


calls = 0


def brute(nums, i, remaining):
    global calls
    calls += 1
    if remaining == 0:
        return True
    if i == len(nums) or remaining < 0:
        return False
    # take nums[i], or skip it
    return brute(nums, i + 1, remaining - nums[i]) or brute(nums, i + 1, remaining)


print("input -> target | downward | upward (bug) | brute force")
for nums, target in (([1, 2, 5], 4), ([2, 6], 4), ([1, 5, 11, 5], 11), ([3, 3, 3, 4, 5], 9)):
    calls = 0
    b = brute(nums, 0, target)
    print(fmt(nums) + " -> " + str(target) + " | "
          + str(subset_sum_down(nums, target)).lower() + " | "
          + str(subset_sum_up(nums, target)).lower() + " | " + str(b).lower())

# Work done on a no-answer input: 18 even numbers, half of the total is odd
nums = [2 * (i + 1) for i in range(18)]
total = sum(nums)
target = total // 2
calls = 0
found = brute(nums, 0, target)
cells = 0
for x in nums:
    if x <= target:
        cells += target - x + 1
print("n = " + str(len(nums)) + ", total = " + str(total) + ", target = " + str(target))
print("brute force: " + str(found).lower() + " after " + str(calls) + " calls")
print("dp:          " + str(subset_sum_down(nums, target)).lower() + " after " + str(cells) + " cell updates")`,
          },
          {
            label: "Bitset version: one shift-and-OR per item",
            code: `def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


def reachable_bits(nums):
    bits = 1                    # bit s is 1 when sum s is reachable; only sum 0 at first
    for x in nums:
        bits |= bits << x       # every old sum s also gives s + x
    return bits


def can_partition_bits(nums):
    total = sum(nums)
    if total % 2 == 1:
        return False
    return (reachable_bits(nums) >> (total // 2)) & 1 == 1


nums = [1, 5, 11, 5]
bits = reachable_bits(nums)
sums = [s for s in range(sum(nums) + 1) if (bits >> s) & 1]
print("reachable sums of " + fmt(nums) + ": " + fmt(sums))
print("set bits: " + str(len(sums)) + ", highest sum: " + str(sums[-1]))
for case in ([1, 5, 11, 5], [1, 2, 3, 5], [1, 2, 5], [3, 3, 3, 4, 5], [100, 100, 100, 100, 99, 101]):
    print(fmt(case) + " -> " + str(can_partition_bits(case)).lower())

# 200 values up to 100: the shape of the usual constraints
big = [(i * 37) % 100 + 1 for i in range(200)]
print("200 items, total " + str(sum(big)) + " -> " + str(can_partition_bits(big)).lower())`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an array of positive integers, can you split it into two groups whose sums are equal? Every number must go into one of the two groups. Please code it in JavaScript and tell me the time and space cost."

**What a strong answer should cover:**
- The reframing: equal halves exist exactly when the total is even and some subset sums to total / 2.
- The 1-D subset-sum table \`dp[s]\` with base case \`dp[0] = true\` and transition \`dp[s] = dp[s] OR dp[s - x]\`.
- Why the inner loop runs from \`target\` down to \`x\` (each item used once — 0/1, not unbounded).
- Complexity O(n × S / 2) time and O(S / 2) space, and why that is pseudo-polynomial; brute force is O(2ⁿ).
- JavaScript details: \`new Array(target + 1).fill(false)\` (or a \`Uint8Array\`), an integer target via \`total / 2\` only after the odd check, numeric sort comparators, and \`BigInt\` as a bitset because \`<<\` on numbers is 32-bit.

**Clarifying questions expected:**
- Are all numbers positive integers, and how large can n and the values be?
- Do you need the actual two subsets, or only true / false?

**Code / implementation expected:** Yes — a short \`canPartition(nums)\` in JavaScript with a 1-D boolean array, plus the odd-sum check.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need loops and arrays; dynamic programming is explained from scratch  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two friends come back from a trip with a bag of souvenirs, each with a price tag: 1, 5, 11 and 5 dollars. They want to split the bag so that each person carries exactly the same total value — no cutting souvenirs in half, every souvenir goes to someone.

You could try every way of dealing out the souvenirs. With 4 items that is 2⁴ = 16 ways, easy. With 40 items it is about a trillion ways, which no computer will finish during your interview.

The trick that makes this problem easy is a change of question. The bag is worth 22, so each friend must get exactly 11. If you can find **one** pile of souvenirs worth exactly 11, the rest of the bag is automatically worth 22 − 11 = 11 too. So the real question is: *"Can I pick some of these numbers so they add up to exactly half the total?"* That smaller question has a famous, fast answer, and it is a cousin of the [0/1 knapsack problem](/interview-question/how-do-you-solve-the-0-1-knapsack-problem).

This problem shows up in interviews because it tests three things at once: spotting the reframing, building a small [dynamic programming](/interview-question/what-is-dynamic-programming) table, and getting one subtle loop direction right.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all numbers positive integers? | The table is indexed by sums. Negative numbers or fractions break the indexing (you would need an offset or a hash set of sums). |
| How large are n and the values? | The DP costs about n × (total / 2) steps. With n ≤ 200 and values ≤ 100, half the total is at most 10,000 — tiny. With values up to 10⁹, this method is useless. |
| Must every element be used? | Yes in the standard version — that is what makes "one half sums to total / 2" equivalent to a full split. |
| Do you need the two subsets, or just yes / no? | Yes / no needs one boolean row. Returning the subsets needs one extra array to remember how each sum was first reached. |
| Can a subset be empty? | Matters only for the empty array or a total of 0. Most versions say the empty array can be split (two empty halves). |

## 3. The Reframing: Half the Total

Write S for the sum of all numbers. If the array splits into two groups with equal sums, each group sums to S / 2. Two facts fall out immediately:

1. **If S is odd, the answer is false.** Two equal integers always add up to an even number.
2. **If S is even, the answer is true exactly when some subset sums to S / 2.** Whatever is left over sums to S − S / 2 = S / 2.

📌 **Interview term: Subset sum problem** — "given numbers and a target, can some subset of the numbers add up to exactly the target?" Equal partition is subset sum with target S / 2.

📌 **Interview term: Partition problem** — the formal name for "can this multiset be split into two parts with equal sums?". It is NP-complete in general, which is why the fast method below depends on the *size of the numbers*, not just how many there are.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="The array 1, 5, 11, 5 has total 22. One half holds 11, the other half holds 1, 5 and 5. Both halves sum to 11">
  <defs>
    <marker id="b30q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="300" y="24" text-anchor="middle">total 22, so each half needs 11</text>
  <rect class="d-box" x="120" y="44" width="60" height="40" rx="6"/>
  <text class="d-text" x="150" y="69" text-anchor="middle">1</text>
  <rect class="d-box" x="220" y="44" width="60" height="40" rx="6"/>
  <text class="d-text" x="250" y="69" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="320" y="44" width="60" height="40" rx="6"/>
  <text class="d-text" x="350" y="69" text-anchor="middle">11</text>
  <rect class="d-box" x="420" y="44" width="60" height="40" rx="6"/>
  <text class="d-text" x="450" y="69" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 350 86 L 190 186" marker-end="url(#b30q1-arrow)"/>
  <path class="d-edge" d="M 150 86 L 410 186" marker-end="url(#b30q1-arrow)"/>
  <path class="d-edge" d="M 250 86 L 425 186" marker-end="url(#b30q1-arrow)"/>
  <path class="d-edge" d="M 450 86 L 445 186" marker-end="url(#b30q1-arrow)"/>
  <rect class="d-box-accent" x="80" y="190" width="200" height="56" rx="10"/>
  <text class="d-text" x="180" y="214" text-anchor="middle">half A: 11</text>
  <text class="d-sub" x="180" y="235" text-anchor="middle">sum 11</text>
  <rect class="d-box" x="340" y="190" width="200" height="56" rx="10"/>
  <text class="d-text" x="440" y="214" text-anchor="middle">half B: 1, 5, 5</text>
  <text class="d-sub" x="440" y="235" text-anchor="middle">sum 11</text>
</svg>

The arrows show the split the code finds for \`[1, 5, 11, 5]\`: the item 11 alone is one half, and 1, 5 and 5 make the other half.

## 4. Building the Table of Reachable Sums

Think of a row of light bulbs numbered 0 to S / 2. Bulb s is on when "some of the items I have looked at so far can add up to exactly s". At the start only bulb 0 is on — picking nothing gives a sum of 0.

Now take the items one at a time. For an item worth x, every bulb s that was already on lets you switch on bulb s + x (take the old pile and add this item). After all items, look at bulb S / 2.

📌 **Interview term: DP state** — the exact question one table cell answers. Here \`dp[s]\` = "can a subset of the items processed so far sum to s?".

📌 **Interview term: Transition (recurrence)** — how a cell is computed from earlier cells: \`dp[s] = dp[s] OR dp[s − x]\` — either s was already reachable without this item, or it is reachable by adding this item to a pile worth s − x.

📌 **Interview term: Base case** — \`dp[0] = true\`: the empty subset sums to 0. Every other cell starts false.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 310" role="img" aria-label="The dp row of reachable sums 0 to 11 after each item of 1, 5, 11, 5. Cell 11 becomes true after the item 11">
  <text class="d-sub" x="148" y="30" text-anchor="middle">0</text>
  <text class="d-sub" x="190" y="30" text-anchor="middle">1</text>
  <text class="d-sub" x="232" y="30" text-anchor="middle">2</text>
  <text class="d-sub" x="274" y="30" text-anchor="middle">3</text>
  <text class="d-sub" x="316" y="30" text-anchor="middle">4</text>
  <text class="d-sub" x="358" y="30" text-anchor="middle">5</text>
  <text class="d-sub" x="400" y="30" text-anchor="middle">6</text>
  <text class="d-sub" x="442" y="30" text-anchor="middle">7</text>
  <text class="d-sub" x="484" y="30" text-anchor="middle">8</text>
  <text class="d-sub" x="526" y="30" text-anchor="middle">9</text>
  <text class="d-sub" x="568" y="30" text-anchor="middle">10</text>
  <text class="d-sub" x="610" y="30" text-anchor="middle">11</text>
  <text class="d-text" x="20" y="71">start</text>
  <rect class="d-box-accent" x="130" y="50" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="71" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="172" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="214" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="340" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="382" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="424" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="550" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="592" y="50" width="36" height="32" rx="4"/>
  <text class="d-text" x="20" y="121">after 1</text>
  <rect class="d-box-accent" x="130" y="100" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="121" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="172" y="100" width="36" height="32" rx="4"/>
  <text class="d-text" x="190" y="121" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="214" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="340" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="382" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="424" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="550" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="592" y="100" width="36" height="32" rx="4"/>
  <text class="d-text" x="20" y="171">after 5</text>
  <rect class="d-box-accent" x="130" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="171" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="172" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="190" y="171" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="214" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="340" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="358" y="171" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="382" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="400" y="171" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="424" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="550" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="592" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="20" y="221">after 11</text>
  <rect class="d-box-accent" x="130" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="221" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="172" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="190" y="221" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="214" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="340" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="358" y="221" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="382" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="400" y="221" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="424" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="550" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="592" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="610" y="221" text-anchor="middle">T</text>
  <text class="d-text" x="20" y="271">after 5</text>
  <rect class="d-box-accent" x="130" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="271" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="172" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="190" y="271" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="214" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="340" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="358" y="271" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="382" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="400" y="271" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="424" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="550" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="568" y="271" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="592" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="610" y="271" text-anchor="middle">T</text>
</svg>

Each row is the table after one more item. Bulb 11 switches on when the item 11 is processed (reading bulb 0), and stays on. The final row also shows 10 (5 + 5) and 6 (1 + 5) — every sum up to 11 that some subset can make.

## 5. The One Detail Everybody Gets Wrong: Loop Direction

The full table would be 2-D: one row per item. We only keep **one** row and overwrite it in place, because each new row only reads the row above it. That saves memory, but it creates a trap.

When processing item x, the update for s reads cell s − x, which is *to the left*. If the loop walks **upward** (s = x, x + 1, …), the cell s − x may already have been updated in this same round — meaning it already counts item x. Reading it then uses item x a second time.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Processing item 2 with target 4. Walking upward reads cell 2 after it was already set this round and wrongly marks 4. Walking downward reads the old value of cell 2 and leaves 4 false">
  <defs>
    <marker id="b30q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="335" y="24" text-anchor="middle">item x = 2, target 4</text>
  <text class="d-text" x="20" y="111">upward</text>
  <path class="d-edge-accent" d="M 185 88 Q 255 40 325 88" marker-end="url(#b30q1-arrow2)"/>
  <path class="d-edge-accent" d="M 325 88 Q 395 40 465 88" marker-end="url(#b30q1-arrow2)"/>
  <rect class="d-box-accent" x="160" y="90" width="50" height="34" rx="4"/>
  <text class="d-text" x="185" y="112" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="230" y="90" width="50" height="34" rx="4"/>
  <text class="d-sub" x="255" y="112" text-anchor="middle">F</text>
  <rect class="d-box-accent" x="300" y="90" width="50" height="34" rx="4"/>
  <text class="d-text" x="325" y="112" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="370" y="90" width="50" height="34" rx="4"/>
  <text class="d-sub" x="395" y="112" text-anchor="middle">F</text>
  <rect class="d-box-accent" x="440" y="90" width="50" height="34" rx="4"/>
  <text class="d-text" x="465" y="112" text-anchor="middle">T</text>
  <rect class="d-box" x="520" y="88" width="104" height="38" rx="6"/>
  <text class="d-text" x="572" y="112" text-anchor="middle">wrong</text>
  <text class="d-text" x="20" y="241">downward</text>
  <path class="d-edge-accent" d="M 185 218 Q 255 170 325 218" marker-end="url(#b30q1-arrow2)"/>
  <path class="d-edge-dashed" d="M 325 218 Q 395 170 465 218" marker-end="url(#b30q1-arrow2)"/>
  <rect class="d-box-accent" x="160" y="220" width="50" height="34" rx="4"/>
  <text class="d-text" x="185" y="242" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="230" y="220" width="50" height="34" rx="4"/>
  <text class="d-sub" x="255" y="242" text-anchor="middle">F</text>
  <rect class="d-box-accent" x="300" y="220" width="50" height="34" rx="4"/>
  <text class="d-text" x="325" y="242" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="370" y="220" width="50" height="34" rx="4"/>
  <text class="d-sub" x="395" y="242" text-anchor="middle">F</text>
  <rect class="d-box-muted" x="440" y="220" width="50" height="34" rx="4"/>
  <text class="d-sub" x="465" y="242" text-anchor="middle">F</text>
  <rect class="d-box" x="520" y="218" width="104" height="38" rx="6"/>
  <text class="d-text" x="572" y="242" text-anchor="middle">correct</text>
  <text class="d-sub" x="185" y="282" text-anchor="middle">s = 0</text>
  <text class="d-sub" x="325" y="282" text-anchor="middle">s = 2</text>
  <text class="d-sub" x="465" y="282" text-anchor="middle">s = 4</text>
</svg>

With the item 2 and target 4, the upward walk sets cell 2 from cell 0, then sets cell 4 from the cell 2 it just changed — that is 2 + 2, the same item twice. The downward walk reaches cell 4 first, while cell 2 still holds its old value, so the item is used at most once.

📌 **Interview term: 0/1 vs unbounded** — in a 0/1 problem each item can be used at most once (walk the sums downward); in an unbounded problem items may repeat, like coins in [coin change](/interview-question/how-do-you-solve-the-coin-change-problem) (walk upward on purpose).

📌 **Interview term: Space optimization (rolling array)** — keeping only one row of a 2-D DP table because each row depends only on the previous one. It turns O(n × target) memory into O(target).

## 6. From Brute Force to the Optimal Approach

**Brute force.** For each number, either put it in the first half or not — that is the include/exclude recursion from [generating all subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array). It explores up to 2ⁿ subsets: O(2ⁿ) time. Example 2 counts the calls on 18 numbers.

**Memoized recursion.** The answer to "can items i..n−1 make the sum r?" depends only on (i, r), so caching it gives O(n × target) states. That is correct, but it uses a 2-D cache and a deep [recursion](/interview-question/what-is-recursion-and-what-is-a-base-case) stack.

**Bottom-up 1-D table (the answer to give).** The bulb row above: O(n × target) time, O(target) memory, no recursion. Add the odd-sum early exit, and stop early if \`dp[target]\` turns on.

**Bitset trick (a strong follow-up).** Store the whole row as the bits of one big integer. "Every reachable s also gives s + x" is a single shift-and-OR: \`bits |= bits << x\`. Same O(n × target) bit operations, but done one machine word (64 bits) at a time, so roughly 64 times fewer steps. Example 3 shows it.

📌 **Interview term: Pseudo-polynomial time** — running time that is polynomial in the *numeric value* of the input (here the target), not in its length. O(n × S) is fast when S is small, and exponential in the number of digits of S.

## 7. The Code in JavaScript

The whole solution is one function:

~~~javascript
function canPartition(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2 === 1) return false;          // odd total: two equal halves are impossible
  const target = total / 2;
  const dp = new Array(target + 1).fill(false); // dp[s]: can some subset seen so far sum to s?
  dp[0] = true;                               // the empty subset sums to 0
  for (const x of nums) {
    for (let s = target; s >= x; s--) {       // walk DOWN so x is used at most once
      if (dp[s - x]) dp[s] = true;
    }
  }
  return dp[target];
}
~~~

**What to point out in this code:**

- \`nums.reduce((a, b) => a + b, 0)\` — always pass the initial \`0\`; without it, \`[].reduce(...)\` throws a \`TypeError\` on the empty array.
- \`total / 2\` is an exact integer here only because the odd check ran first. If you skip that check, \`target\` becomes \`5.5\` and \`new Array(6.5)\` throws a \`RangeError\`.
- \`new Array(target + 1).fill(false)\` is safe because \`false\` is a primitive. The trap is \`new Array(n).fill([])\` for 2-D tables — every row is the same array object. A \`Uint8Array(target + 1)\` is a compact alternative that starts zeroed.
- The loop \`for (let s = target; s >= x; s--)\` walks downward so each item is used at most once.
- When sorting the picked indexes, \`picked.sort((a, b) => a - b)\` — the default \`sort()\` compares as strings, so \`[10, 9, 1].sort()\` gives \`[1, 10, 9]\`.
- **Bitset version (example 3):** JavaScript bitwise operators on numbers convert their operands to 32-bit integers (per [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_OR)), so \`1 << 40\` cannot work. A \`BigInt\` is not truncated: \`bits |= bits << BigInt(x)\` with \`1n\` as the start. You cannot mix the two types — \`bits << x\` with a number \`x\` throws a \`TypeError\`, hence \`BigInt(x)\`.

## 8. Dry Run on [1, 5, 11, 5]

Total 22, so target = 11. The row has cells 0..11; \`T\` marks a reachable sum.

| Item | Cells switched on this round (downward) | Reachable sums afterwards |
| :--- | :--- | :--- |
| start | — | 0 |
| 1 | 1 (from 0) | 0, 1 |
| 5 | 6 (from 1), 5 (from 0) | 0, 1, 5, 6 |
| 11 | 11 (from 0) | 0, 1, 5, 6, 11 |
| 5 | 11 already on; 10 (from 5) | 0, 1, 5, 6, 10, 11 |

Cell 11 is on, so the answer is true. The \`parent\` array remembers that 11 was first reached by the item 11 (from 0), so one half is \`[11]\` and the other is \`[1, 5, 5]\` — exactly the first line of example 1.

## 9. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\` (Node.js 22; the code is plain browser-safe JavaScript, so it also runs in the page). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — can_partition with one valid split** prints:

~~~text
[1, 5, 11, 5] sum=22 -> true  [11] | [1, 5, 5]
[1, 2, 3, 5] sum=11 -> false  (odd total)
[1, 2, 5] sum=8 -> false  (no subset reaches 4)
[3, 3, 3, 4, 5] sum=18 -> true  [3, 3, 3] | [4, 5]
[2, 2] sum=4 -> true  [2] | [2]
[100] sum=100 -> false  (no subset reaches 50)
[] sum=0 -> true  [] | []
true
false
~~~

**Example 2 — downward vs upward loop, and brute force vs DP work** prints:

~~~text
input -> target | downward | upward (bug) | brute force
[1, 2, 5] -> 4 | false | true | false
[2, 6] -> 4 | false | true | false
[1, 5, 11, 5] -> 11 | true | true | true
[3, 3, 3, 4, 5] -> 9 | true | true | true
n = 18, total = 342, target = 171
brute force: false after 405293 calls
dp:          false after 2754 cell updates
~~~

The upward loop says \`true\` for \`[1, 2, 5]\` and \`[2, 6]\` with target 4 — both wrong, because it used the item 2 (or 1) twice. On 18 even numbers whose half-total 171 is odd (so no subset can reach it), the brute force needs 405,293 calls to say no; the table needs 2,754 cell updates.

**Example 3 — the bitset version** prints:

~~~text
reachable sums of [1, 5, 11, 5]: [0, 1, 5, 6, 10, 11, 12, 16, 17, 21, 22]
set bits: 11, highest sum: 22
[1, 5, 11, 5] -> true
[1, 2, 3, 5] -> false
[1, 2, 5] -> false
[3, 3, 3, 4, 5] -> true
[100, 100, 100, 100, 99, 101] -> true
200 items, total 10100 -> true
~~~

## 10. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force include / exclude | O(2ⁿ) | O(n) | every subset may be tried; recursion depth n |
| Memoized recursion on (i, r) | O(n × S / 2) | O(n × S / 2) | one cache entry per (item, remaining sum) state |
| Bottom-up 1-D table | O(n × S / 2) | O(S / 2) | n passes over a row of S / 2 + 1 cells |
| Bitset shift-and-OR | O(n × S / 64) | O(S / 64) words | each pass shifts S bits, 64 per machine word |

Here n is the number of items and S their total. In example 2 the table did **2,754** cell updates where the brute force made **405,293** calls — and that gap doubles with every extra item.

## 11. Edge Cases

- **Odd total.** Return false before allocating anything (\`[1, 2, 3, 5]\` has total 11).
- **Even total but no subset reaches half.** \`[1, 2, 5]\` totals 8, but no subset makes 4 — the table, not the parity check, says false.
- **A single element.** \`[100]\` can never be split: the target 50 is unreachable.
- **An item bigger than half.** It can never be in the half that sums to S / 2; the inner loop simply does not run for it (s starts at target and must be ≥ x). If any item exceeds S / 2 the answer is false.
- **Empty array.** Total 0, target 0, \`dp[0]\` is true — two empty halves. Confirm with the interviewer if this matters.
- **Duplicates.** \`[2, 2]\` and \`[3, 3, 3, 4, 5]\` work naturally; each copy is a separate item.

## Common Pitfalls

- **Upward loop.** \`for (let s = x; s <= target; s++)\` reuses the item; \`[2, 6]\` then "splits".
- **Skipping the odd check.** \`target\` becomes fractional and array creation throws, or a wrong target is tested.
- **\`reduce\` without an initial value.** Crashes on \`[]\`.
- **Number bit tricks for the bitset.** \`bits << x\` on a \`Number\` is 32-bit, so sums above 31 vanish. Use \`BigInt\` (\`1n\`, \`BigInt(x)\`), and do not mix \`BigInt\` and \`Number\` in one expression.
- **Default \`sort()\` on numbers.** It sorts as strings; pass \`(a, b) => a - b\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reframe:</strong> <span style="color:#f0e2c8;">Two equal halves means one subset sums to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total / 2</code>; the rest is the other half. Odd total → <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> immediately.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s]</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code> if some subset of the items seen so far sums to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0] = true</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Transition:</strong> <span style="color:#f0e2c8;">For each item <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>, for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code> down to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s] = dp[s] || dp[s - x]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why downward:</strong> <span style="color:#f0e2c8;">So <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s - x]</code> still describes the previous items — each item is used at most once (0/1, not unbounded).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(n × target) time, O(target) space; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> bitset (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bits |= bits &lt;&lt; BigInt(x)</code>) does it with one shift per item.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the inner loop go downward?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Going up, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s - x]</code> may already include <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> from this round, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> gets used twice. On <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 6]</code> the upward loop wrongly reports a split because 2 + 2 = 4.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the two subsets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[s]</code> = index of the item that first set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s]</code>. Walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code>, subtracting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[parent[s]]</code>; put those indexes in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> and the rest is the other half.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">1 &lt;&lt; s</code> with normal numbers for the bitset?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bitwise operators on numbers work on 32-bit integers, so any sum past 31 is lost. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> has no width limit, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1n &lt;&lt; 10000n</code> is fine.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if numbers can be negative?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Indexes break. Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of reachable sums and add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s + x</code> for every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code> (iterate over a copy), or offset every index by the most negative sum.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this polynomial time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is pseudo-polynomial: O(n × S) depends on the value S. The general partition problem is NP-complete; the DP is fast only because S is small.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subset sum problem** | Can some subset of the numbers add up to exactly a target? |
| **Partition problem** | Can the numbers be split into two groups with equal sums? NP-complete in general |
| **DP state** | The exact question one table cell answers: here, is sum s reachable? |
| **Transition (recurrence)** | How a cell is computed from earlier cells: dp[s] = dp[s] OR dp[s − x] |
| **Base case** | dp[0] = true: the empty subset sums to 0 |
| **0/1 vs unbounded** | Each item at most once (loop sums downward) vs items may repeat (loop upward) |
| **Space optimization (rolling array)** | Keep one row of a 2-D table because each row only reads the previous one |
| **Pseudo-polynomial time** | Polynomial in the numeric value of the input (the target), not in its length |
| **BigInt** | JavaScript integer type with no width limit; its bitwise operators are not truncated to 32 bits |

---
**Conclusion:** Equal partition is subset sum in disguise: if the total is odd, answer \`false\`; otherwise ask whether some subset reaches \`total / 2\`. In JavaScript that is a boolean array of \`target + 1\` cells filled item by item with a downward loop so each item counts once — O(n × target) time and O(target) memory — and a \`BigInt\` bitset is the neat speed-up once you remember that number bit operations are 32-bit. The same table, with values and a max instead of an OR, is the [0/1 knapsack problem](/interview-question/how-do-you-solve-the-0-1-knapsack-problem); for a problem solved over *sets* of items instead of sums, see [bitmask dynamic programming](/interview-question/what-is-bitmask-dynamic-programming).`,
        examples: [
          {
            label: "can_partition with one valid split",
            code: `function fmt(xs) {
  return "[" + xs.join(", ") + "]";
}

function canPartition(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2 === 1) return false;          // odd total: two equal halves are impossible
  const target = total / 2;
  const dp = new Array(target + 1).fill(false); // dp[s]: can some subset seen so far sum to s?
  dp[0] = true;                               // the empty subset sums to 0
  for (const x of nums) {
    for (let s = target; s >= x; s--) {       // walk DOWN so x is used at most once
      if (dp[s - x]) dp[s] = true;
    }
  }
  return dp[target];
}

// Return the indexes of one subset summing to total/2, or null.
function findHalf(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2 === 1) return null;
  const target = total / 2;
  const parent = new Array(target + 1).fill(-1); // index of the item that first reached s
  const reach = new Array(target + 1).fill(false);
  reach[0] = true;
  nums.forEach((x, i) => {
    for (let s = target; s >= x; s--) {
      if (reach[s - x] && !reach[s]) {
        reach[s] = true;
        parent[s] = i;
      }
    }
  });
  if (!reach[target]) return null;
  const picked = [];
  let s = target;
  while (s > 0) {                             // walk back: each step removes one item
    const i = parent[s];
    picked.push(i);
    s -= nums[i];
  }
  return picked.sort((a, b) => a - b);        // numeric compare, not the default string sort
}

for (const nums of [[1, 5, 11, 5], [1, 2, 3, 5], [1, 2, 5], [3, 3, 3, 4, 5], [2, 2], [100], []]) {
  const total = nums.reduce((a, b) => a + b, 0);
  const half = findHalf(nums);
  let line = fmt(nums) + " sum=" + total + " -> " + canPartition(nums);
  if (half !== null) {
    const inHalf = new Set(half);
    const a = half.map((i) => nums[i]);
    const b = nums.filter((_, i) => !inHalf.has(i));
    line += "  " + fmt(a) + " | " + fmt(b);
  } else if (total % 2 === 1) {
    line += "  (odd total)";
  } else {
    line += "  (no subset reaches " + total / 2 + ")";
  }
  console.log(line);
}

console.log(String(canPartition([1, 5, 11, 5]))); // true
console.log(String(canPartition([1, 2, 5]))); // false`,
          },
          {
            label: "Downward vs upward loop, and brute force vs DP work",
            code: `function fmt(xs) {
  return "[" + xs.join(", ") + "]";
}

function subsetSumDown(nums, target) {
  const dp = new Array(target + 1).fill(false);
  dp[0] = true;
  for (const x of nums) {
    for (let s = target; s >= x; s--) dp[s] = dp[s] || dp[s - x];   // correct: high to low
  }
  return dp[target];
}

function subsetSumUp(nums, target) {
  const dp = new Array(target + 1).fill(false);
  dp[0] = true;
  for (const x of nums) {
    for (let s = x; s <= target; s++) dp[s] = dp[s] || dp[s - x];   // BUG: low to high reuses x
  }
  return dp[target];
}

let calls = 0;

function brute(nums, i, remaining) {
  calls++;
  if (remaining === 0) return true;
  if (i === nums.length || remaining < 0) return false;
  // take nums[i], or skip it
  return brute(nums, i + 1, remaining - nums[i]) || brute(nums, i + 1, remaining);
}

console.log("input -> target | downward | upward (bug) | brute force");
for (const [nums, target] of [[[1, 2, 5], 4], [[2, 6], 4], [[1, 5, 11, 5], 11], [[3, 3, 3, 4, 5], 9]]) {
  calls = 0;
  const b = brute(nums, 0, target);
  console.log(fmt(nums) + " -> " + target + " | " + subsetSumDown(nums, target) + " | " +
    subsetSumUp(nums, target) + " | " + b);
}

// Work done on a no-answer input: 18 even numbers, half of the total is odd
const nums = Array.from({ length: 18 }, (_, i) => 2 * (i + 1));
const total = nums.reduce((a, b) => a + b, 0);
const target = Math.floor(total / 2);
calls = 0;
const found = brute(nums, 0, target);
let cells = 0;
for (const x of nums) if (x <= target) cells += target - x + 1;
console.log("n = " + nums.length + ", total = " + total + ", target = " + target);
console.log("brute force: " + found + " after " + calls + " calls");
console.log("dp:          " + subsetSumDown(nums, target) + " after " + cells + " cell updates");`,
          },
          {
            label: "Bitset version: one shift-and-OR per item",
            code: `function fmt(xs) {
  return "[" + xs.join(", ") + "]";
}

function reachableBits(nums) {
  let bits = 1n;                       // BigInt: bit s is 1 when sum s is reachable
  for (const x of nums) {
    bits |= bits << BigInt(x);         // every old sum s also gives s + x
  }
  return bits;
}

function canPartitionBits(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2 === 1) return false;
  return ((reachableBits(nums) >> BigInt(total / 2)) & 1n) === 1n;
}

const nums = [1, 5, 11, 5];
const bits = reachableBits(nums);
const sums = [];
for (let s = 0; s <= 22; s++) if (((bits >> BigInt(s)) & 1n) === 1n) sums.push(s);
console.log("reachable sums of " + fmt(nums) + ": " + fmt(sums));
console.log("set bits: " + sums.length + ", highest sum: " + sums[sums.length - 1]);
for (const c of [[1, 5, 11, 5], [1, 2, 3, 5], [1, 2, 5], [3, 3, 3, 4, 5], [100, 100, 100, 100, 99, 101]]) {
  console.log(fmt(c) + " -> " + canPartitionBits(c));
}

// 200 values up to 100: the shape of the usual constraints
const big = Array.from({ length: 200 }, (_, i) => (i * 37) % 100 + 1);
const bigTotal = big.reduce((a, b) => a + b, 0);
console.log("200 items, total " + bigTotal + " -> " + canPartitionBits(big));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an array of positive integers, can you split it into two groups whose sums are equal? Every number must go into one of the two groups. Please code it in Java and tell me the time and space cost."

**What a strong answer should cover:**
- The reframing: equal halves exist exactly when the total is even and some subset sums to total / 2.
- The 1-D subset-sum table \`dp[s]\` with base case \`dp[0] = true\` and transition \`dp[s] = dp[s] OR dp[s - x]\`.
- Why the inner loop runs from \`target\` down to \`x\` (each item used once — 0/1, not unbounded).
- Complexity O(n × S / 2) time and O(S / 2) space, and why that is pseudo-polynomial; brute force is O(2ⁿ).
- Java details: \`boolean[]\` starts all \`false\`, \`int\` is plenty for the sum under the usual limits (say why), the downward \`for\` loop, and \`BigInteger.shiftLeft\` / \`or\` / \`testBit\` (or \`long[]\` words) for a bitset.

**Clarifying questions expected:**
- Are all numbers positive integers, and how large can n and the values be?
- Do you need the actual two subsets, or only true / false?

**Code / implementation expected:** Yes — a short \`canPartition(int[] nums)\` in Java with a \`boolean[]\` row, plus the odd-sum check.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need loops and arrays; dynamic programming is explained from scratch  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two friends come back from a trip with a bag of souvenirs, each with a price tag: 1, 5, 11 and 5 dollars. They want to split the bag so that each person carries exactly the same total value — no cutting souvenirs in half, every souvenir goes to someone.

You could try every way of dealing out the souvenirs. With 4 items that is 2⁴ = 16 ways, easy. With 40 items it is about a trillion ways, which no computer will finish during your interview.

The trick that makes this problem easy is a change of question. The bag is worth 22, so each friend must get exactly 11. If you can find **one** pile of souvenirs worth exactly 11, the rest of the bag is automatically worth 22 − 11 = 11 too. So the real question is: *"Can I pick some of these numbers so they add up to exactly half the total?"* That smaller question has a famous, fast answer, and it is a cousin of the [0/1 knapsack problem](/interview-question/how-do-you-solve-the-0-1-knapsack-problem).

This problem shows up in interviews because it tests three things at once: spotting the reframing, building a small [dynamic programming](/interview-question/what-is-dynamic-programming) table, and getting one subtle loop direction right.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all numbers positive integers? | The table is indexed by sums. Negative numbers or fractions break the indexing (you would need an offset or a hash set of sums). |
| How large are n and the values? | The DP costs about n × (total / 2) steps. With n ≤ 200 and values ≤ 100, half the total is at most 10,000 — tiny. With values up to 10⁹, this method is useless. |
| Must every element be used? | Yes in the standard version — that is what makes "one half sums to total / 2" equivalent to a full split. |
| Do you need the two subsets, or just yes / no? | Yes / no needs one boolean row. Returning the subsets needs one extra array to remember how each sum was first reached. |
| Can a subset be empty? | Matters only for the empty array or a total of 0. Most versions say the empty array can be split (two empty halves). |

## 3. The Reframing: Half the Total

Write S for the sum of all numbers. If the array splits into two groups with equal sums, each group sums to S / 2. Two facts fall out immediately:

1. **If S is odd, the answer is false.** Two equal integers always add up to an even number.
2. **If S is even, the answer is true exactly when some subset sums to S / 2.** Whatever is left over sums to S − S / 2 = S / 2.

📌 **Interview term: Subset sum problem** — "given numbers and a target, can some subset of the numbers add up to exactly the target?" Equal partition is subset sum with target S / 2.

📌 **Interview term: Partition problem** — the formal name for "can this multiset be split into two parts with equal sums?". It is NP-complete in general, which is why the fast method below depends on the *size of the numbers*, not just how many there are.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="The array 1, 5, 11, 5 has total 22. One half holds 11, the other half holds 1, 5 and 5. Both halves sum to 11">
  <defs>
    <marker id="b30q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="300" y="24" text-anchor="middle">total 22, so each half needs 11</text>
  <rect class="d-box" x="120" y="44" width="60" height="40" rx="6"/>
  <text class="d-text" x="150" y="69" text-anchor="middle">1</text>
  <rect class="d-box" x="220" y="44" width="60" height="40" rx="6"/>
  <text class="d-text" x="250" y="69" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="320" y="44" width="60" height="40" rx="6"/>
  <text class="d-text" x="350" y="69" text-anchor="middle">11</text>
  <rect class="d-box" x="420" y="44" width="60" height="40" rx="6"/>
  <text class="d-text" x="450" y="69" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 350 86 L 190 186" marker-end="url(#b30q1-arrow)"/>
  <path class="d-edge" d="M 150 86 L 410 186" marker-end="url(#b30q1-arrow)"/>
  <path class="d-edge" d="M 250 86 L 425 186" marker-end="url(#b30q1-arrow)"/>
  <path class="d-edge" d="M 450 86 L 445 186" marker-end="url(#b30q1-arrow)"/>
  <rect class="d-box-accent" x="80" y="190" width="200" height="56" rx="10"/>
  <text class="d-text" x="180" y="214" text-anchor="middle">half A: 11</text>
  <text class="d-sub" x="180" y="235" text-anchor="middle">sum 11</text>
  <rect class="d-box" x="340" y="190" width="200" height="56" rx="10"/>
  <text class="d-text" x="440" y="214" text-anchor="middle">half B: 1, 5, 5</text>
  <text class="d-sub" x="440" y="235" text-anchor="middle">sum 11</text>
</svg>

The arrows show the split the code finds for \`[1, 5, 11, 5]\`: the item 11 alone is one half, and 1, 5 and 5 make the other half.

## 4. Building the Table of Reachable Sums

Think of a row of light bulbs numbered 0 to S / 2. Bulb s is on when "some of the items I have looked at so far can add up to exactly s". At the start only bulb 0 is on — picking nothing gives a sum of 0.

Now take the items one at a time. For an item worth x, every bulb s that was already on lets you switch on bulb s + x (take the old pile and add this item). After all items, look at bulb S / 2.

📌 **Interview term: DP state** — the exact question one table cell answers. Here \`dp[s]\` = "can a subset of the items processed so far sum to s?".

📌 **Interview term: Transition (recurrence)** — how a cell is computed from earlier cells: \`dp[s] = dp[s] OR dp[s − x]\` — either s was already reachable without this item, or it is reachable by adding this item to a pile worth s − x.

📌 **Interview term: Base case** — \`dp[0] = true\`: the empty subset sums to 0. Every other cell starts false.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 310" role="img" aria-label="The dp row of reachable sums 0 to 11 after each item of 1, 5, 11, 5. Cell 11 becomes true after the item 11">
  <text class="d-sub" x="148" y="30" text-anchor="middle">0</text>
  <text class="d-sub" x="190" y="30" text-anchor="middle">1</text>
  <text class="d-sub" x="232" y="30" text-anchor="middle">2</text>
  <text class="d-sub" x="274" y="30" text-anchor="middle">3</text>
  <text class="d-sub" x="316" y="30" text-anchor="middle">4</text>
  <text class="d-sub" x="358" y="30" text-anchor="middle">5</text>
  <text class="d-sub" x="400" y="30" text-anchor="middle">6</text>
  <text class="d-sub" x="442" y="30" text-anchor="middle">7</text>
  <text class="d-sub" x="484" y="30" text-anchor="middle">8</text>
  <text class="d-sub" x="526" y="30" text-anchor="middle">9</text>
  <text class="d-sub" x="568" y="30" text-anchor="middle">10</text>
  <text class="d-sub" x="610" y="30" text-anchor="middle">11</text>
  <text class="d-text" x="20" y="71">start</text>
  <rect class="d-box-accent" x="130" y="50" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="71" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="172" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="214" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="340" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="382" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="424" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="550" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="592" y="50" width="36" height="32" rx="4"/>
  <text class="d-text" x="20" y="121">after 1</text>
  <rect class="d-box-accent" x="130" y="100" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="121" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="172" y="100" width="36" height="32" rx="4"/>
  <text class="d-text" x="190" y="121" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="214" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="340" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="382" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="424" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="550" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="592" y="100" width="36" height="32" rx="4"/>
  <text class="d-text" x="20" y="171">after 5</text>
  <rect class="d-box-accent" x="130" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="171" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="172" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="190" y="171" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="214" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="340" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="358" y="171" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="382" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="400" y="171" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="424" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="550" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="592" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="20" y="221">after 11</text>
  <rect class="d-box-accent" x="130" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="221" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="172" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="190" y="221" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="214" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="340" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="358" y="221" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="382" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="400" y="221" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="424" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="550" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="592" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="610" y="221" text-anchor="middle">T</text>
  <text class="d-text" x="20" y="271">after 5</text>
  <rect class="d-box-accent" x="130" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="271" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="172" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="190" y="271" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="214" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="340" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="358" y="271" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="382" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="400" y="271" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="424" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="550" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="568" y="271" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="592" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="610" y="271" text-anchor="middle">T</text>
</svg>

Each row is the table after one more item. Bulb 11 switches on when the item 11 is processed (reading bulb 0), and stays on. The final row also shows 10 (5 + 5) and 6 (1 + 5) — every sum up to 11 that some subset can make.

## 5. The One Detail Everybody Gets Wrong: Loop Direction

The full table would be 2-D: one row per item. We only keep **one** row and overwrite it in place, because each new row only reads the row above it. That saves memory, but it creates a trap.

When processing item x, the update for s reads cell s − x, which is *to the left*. If the loop walks **upward** (s = x, x + 1, …), the cell s − x may already have been updated in this same round — meaning it already counts item x. Reading it then uses item x a second time.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Processing item 2 with target 4. Walking upward reads cell 2 after it was already set this round and wrongly marks 4. Walking downward reads the old value of cell 2 and leaves 4 false">
  <defs>
    <marker id="b30q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="335" y="24" text-anchor="middle">item x = 2, target 4</text>
  <text class="d-text" x="20" y="111">upward</text>
  <path class="d-edge-accent" d="M 185 88 Q 255 40 325 88" marker-end="url(#b30q1-arrow2)"/>
  <path class="d-edge-accent" d="M 325 88 Q 395 40 465 88" marker-end="url(#b30q1-arrow2)"/>
  <rect class="d-box-accent" x="160" y="90" width="50" height="34" rx="4"/>
  <text class="d-text" x="185" y="112" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="230" y="90" width="50" height="34" rx="4"/>
  <text class="d-sub" x="255" y="112" text-anchor="middle">F</text>
  <rect class="d-box-accent" x="300" y="90" width="50" height="34" rx="4"/>
  <text class="d-text" x="325" y="112" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="370" y="90" width="50" height="34" rx="4"/>
  <text class="d-sub" x="395" y="112" text-anchor="middle">F</text>
  <rect class="d-box-accent" x="440" y="90" width="50" height="34" rx="4"/>
  <text class="d-text" x="465" y="112" text-anchor="middle">T</text>
  <rect class="d-box" x="520" y="88" width="104" height="38" rx="6"/>
  <text class="d-text" x="572" y="112" text-anchor="middle">wrong</text>
  <text class="d-text" x="20" y="241">downward</text>
  <path class="d-edge-accent" d="M 185 218 Q 255 170 325 218" marker-end="url(#b30q1-arrow2)"/>
  <path class="d-edge-dashed" d="M 325 218 Q 395 170 465 218" marker-end="url(#b30q1-arrow2)"/>
  <rect class="d-box-accent" x="160" y="220" width="50" height="34" rx="4"/>
  <text class="d-text" x="185" y="242" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="230" y="220" width="50" height="34" rx="4"/>
  <text class="d-sub" x="255" y="242" text-anchor="middle">F</text>
  <rect class="d-box-accent" x="300" y="220" width="50" height="34" rx="4"/>
  <text class="d-text" x="325" y="242" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="370" y="220" width="50" height="34" rx="4"/>
  <text class="d-sub" x="395" y="242" text-anchor="middle">F</text>
  <rect class="d-box-muted" x="440" y="220" width="50" height="34" rx="4"/>
  <text class="d-sub" x="465" y="242" text-anchor="middle">F</text>
  <rect class="d-box" x="520" y="218" width="104" height="38" rx="6"/>
  <text class="d-text" x="572" y="242" text-anchor="middle">correct</text>
  <text class="d-sub" x="185" y="282" text-anchor="middle">s = 0</text>
  <text class="d-sub" x="325" y="282" text-anchor="middle">s = 2</text>
  <text class="d-sub" x="465" y="282" text-anchor="middle">s = 4</text>
</svg>

With the item 2 and target 4, the upward walk sets cell 2 from cell 0, then sets cell 4 from the cell 2 it just changed — that is 2 + 2, the same item twice. The downward walk reaches cell 4 first, while cell 2 still holds its old value, so the item is used at most once.

📌 **Interview term: 0/1 vs unbounded** — in a 0/1 problem each item can be used at most once (walk the sums downward); in an unbounded problem items may repeat, like coins in [coin change](/interview-question/how-do-you-solve-the-coin-change-problem) (walk upward on purpose).

📌 **Interview term: Space optimization (rolling array)** — keeping only one row of a 2-D DP table because each row depends only on the previous one. It turns O(n × target) memory into O(target).

## 6. From Brute Force to the Optimal Approach

**Brute force.** For each number, either put it in the first half or not — that is the include/exclude recursion from [generating all subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array). It explores up to 2ⁿ subsets: O(2ⁿ) time. Example 2 counts the calls on 18 numbers.

**Memoized recursion.** The answer to "can items i..n−1 make the sum r?" depends only on (i, r), so caching it gives O(n × target) states. That is correct, but it uses a 2-D cache and a deep [recursion](/interview-question/what-is-recursion-and-what-is-a-base-case) stack.

**Bottom-up 1-D table (the answer to give).** The bulb row above: O(n × target) time, O(target) memory, no recursion. Add the odd-sum early exit, and stop early if \`dp[target]\` turns on.

**Bitset trick (a strong follow-up).** Store the whole row as the bits of one big integer. "Every reachable s also gives s + x" is a single shift-and-OR: \`bits |= bits << x\`. Same O(n × target) bit operations, but done one machine word (64 bits) at a time, so roughly 64 times fewer steps. Example 3 shows it.

📌 **Interview term: Pseudo-polynomial time** — running time that is polynomial in the *numeric value* of the input (here the target), not in its length. O(n × S) is fast when S is small, and exponential in the number of digits of S.

## 7. The Code in Java

The whole solution is one static method:

~~~java
static boolean canPartition(int[] nums) {
    int total = 0;
    for (int x : nums) total += x;
    if (total % 2 == 1) return false;          // odd total: two equal halves are impossible
    int target = total / 2;
    boolean[] dp = new boolean[target + 1];    // all false by default
    dp[0] = true;                              // the empty subset sums to 0
    for (int x : nums) {
        for (int s = target; s >= x; s--) {    // walk DOWN so x is used at most once
            if (dp[s - x]) dp[s] = true;
        }
    }
    return dp[target];
}
~~~

**What to point out in this code:**

- \`new boolean[target + 1]\` is zero-initialised: every element starts \`false\`, so only \`dp[0] = true\` is needed.
- \`int total\` is safe when n ≤ 200 and values ≤ 100 (at most 20,000). If the values could be up to 10⁹, the sum of a few of them overflows \`int\` silently — use \`long\` for the total, and the DP itself is hopeless at that size anyway.
- The loop \`for (int s = target; s >= x; s--)\` walks downward so each item is used at most once.
- In \`findHalf\`, \`Arrays.stream(nums).sum()\` returns an \`int\` (an \`IntStream\` sum), and the picked indexes live in a \`List<Integer>\` — boxed, but tiny. \`half.contains(i)\` is O(size) per call; fine for a demo, use a \`boolean[]\` for big inputs.
- **Bitset version (example 3):** \`java.util.BitSet\` has no shift method, so the example uses \`BigInteger\`, which is immutable — \`bits.or(bits.shiftLeft(x))\` returns a new value that must be assigned back. \`testBit(target)\` reads one bit, and \`bitCount()\` counts the reachable sums. For speed you would hand-roll a \`long[]\` and shift word by word.

## 8. Dry Run on [1, 5, 11, 5]

Total 22, so target = 11. The row has cells 0..11; \`T\` marks a reachable sum.

| Item | Cells switched on this round (downward) | Reachable sums afterwards |
| :--- | :--- | :--- |
| start | — | 0 |
| 1 | 1 (from 0) | 0, 1 |
| 5 | 6 (from 1), 5 (from 0) | 0, 1, 5, 6 |
| 11 | 11 (from 0) | 0, 1, 5, 6, 11 |
| 5 | 11 already on; 10 (from 5) | 0, 1, 5, 6, 10, 11 |

Cell 11 is on, so the answer is true. The \`parent\` array remembers that 11 was first reached by the item 11 (from 0), so one half is \`[11]\` and the other is \`[1, 5, 5]\` — exactly the first line of example 1.

## 9. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21; the code only uses Java 17 features). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — can_partition with one valid split** prints:

~~~text
[1, 5, 11, 5] sum=22 -> true  [11] | [1, 5, 5]
[1, 2, 3, 5] sum=11 -> false  (odd total)
[1, 2, 5] sum=8 -> false  (no subset reaches 4)
[3, 3, 3, 4, 5] sum=18 -> true  [3, 3, 3] | [4, 5]
[2, 2] sum=4 -> true  [2] | [2]
[100] sum=100 -> false  (no subset reaches 50)
[] sum=0 -> true  [] | []
true
false
~~~

**Example 2 — downward vs upward loop, and brute force vs DP work** prints:

~~~text
input -> target | downward | upward (bug) | brute force
[1, 2, 5] -> 4 | false | true | false
[2, 6] -> 4 | false | true | false
[1, 5, 11, 5] -> 11 | true | true | true
[3, 3, 3, 4, 5] -> 9 | true | true | true
n = 18, total = 342, target = 171
brute force: false after 405293 calls
dp:          false after 2754 cell updates
~~~

The upward loop says \`true\` for \`[1, 2, 5]\` and \`[2, 6]\` with target 4 — both wrong, because it used the item 2 (or 1) twice. On 18 even numbers whose half-total 171 is odd (so no subset can reach it), the brute force needs 405,293 calls to say no; the table needs 2,754 cell updates.

**Example 3 — the bitset version** prints:

~~~text
reachable sums of [1, 5, 11, 5]: [0, 1, 5, 6, 10, 11, 12, 16, 17, 21, 22]
set bits: 11, highest sum: 22
[1, 5, 11, 5] -> true
[1, 2, 3, 5] -> false
[1, 2, 5] -> false
[3, 3, 3, 4, 5] -> true
[100, 100, 100, 100, 99, 101] -> true
200 items, total 10100 -> true
~~~

## 10. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force include / exclude | O(2ⁿ) | O(n) | every subset may be tried; recursion depth n |
| Memoized recursion on (i, r) | O(n × S / 2) | O(n × S / 2) | one cache entry per (item, remaining sum) state |
| Bottom-up 1-D table | O(n × S / 2) | O(S / 2) | n passes over a row of S / 2 + 1 cells |
| Bitset shift-and-OR | O(n × S / 64) | O(S / 64) words | each pass shifts S bits, 64 per machine word |

Here n is the number of items and S their total. In example 2 the table did **2,754** cell updates where the brute force made **405,293** calls — and that gap doubles with every extra item.

## 11. Edge Cases

- **Odd total.** Return false before allocating anything (\`[1, 2, 3, 5]\` has total 11).
- **Even total but no subset reaches half.** \`[1, 2, 5]\` totals 8, but no subset makes 4 — the table, not the parity check, says false.
- **A single element.** \`[100]\` can never be split: the target 50 is unreachable.
- **An item bigger than half.** It can never be in the half that sums to S / 2; the inner loop simply does not run for it (s starts at target and must be ≥ x). If any item exceeds S / 2 the answer is false.
- **Empty array.** Total 0, target 0, \`dp[0]\` is true — two empty halves. Confirm with the interviewer if this matters.
- **Duplicates.** \`[2, 2]\` and \`[3, 3, 3, 4, 5]\` work naturally; each copy is a separate item.

## Common Pitfalls

- **Upward loop.** \`for (int s = x; s <= target; s++)\` reuses the item; \`{2, 6}\` then "splits".
- **Discarding a \`BigInteger\` result.** \`bits.or(bits.shiftLeft(x));\` on its own does nothing — \`BigInteger\` is immutable; write \`bits = bits.or(...)\`.
- **Overflowing \`int\` for the total.** Large values need \`long total\`; the DP size check (\`target\` must fit an array) comes right after.
- **Using \`Boolean[]\` instead of \`boolean[]\`.** The boxed array starts full of \`null\`, and \`if (dp[s - x])\` throws a \`NullPointerException\`.
- **Forgetting the odd check.** \`total / 2\` rounds down for odd totals, and the table answers the wrong question.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reframe:</strong> <span style="color:#f0e2c8;">Two equal halves means one subset sums to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total / 2</code>; the rest is the other half. Odd total → <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> immediately.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[] dp</code>, where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s]</code> is true if some subset of the items seen so far sums to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0] = true</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Transition:</strong> <span style="color:#f0e2c8;">For each item <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>, for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code> down to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s] |= dp[s - x]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why downward:</strong> <span style="color:#f0e2c8;">So <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s - x]</code> still describes the previous items — each item is used at most once (0/1, not unbounded).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(n × target) time, O(target) space; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInteger</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long[]</code> bitset does 64 sums per machine word.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the inner loop go downward?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Going up, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s - x]</code> may already include <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> from this round, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> gets used twice. On <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{2, 6}</code> the upward loop wrongly reports a split because 2 + 2 = 4.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the two subsets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[] parent</code> = index of the item that first set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s]</code>. Walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code>, subtracting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[parent[s]]</code>, collecting indexes; everything else is the other half.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">java.util.BitSet</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">or</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> but no shift, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bits |= bits &lt;&lt; x</code> needs a manual word loop. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInteger.shiftLeft</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">or</code> does it in two calls, at the cost of allocating a new object per item.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could the sum overflow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With values ≤ 100 and n ≤ 200 the total is at most 20,000, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> is fine. For big values use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>, but then the table of size total / 2 is too large and you need a different method.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this polynomial time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is pseudo-polynomial: O(n × S) depends on the value S. The general partition problem is NP-complete; the DP is fast only because S is small.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subset sum problem** | Can some subset of the numbers add up to exactly a target? |
| **Partition problem** | Can the numbers be split into two groups with equal sums? NP-complete in general |
| **DP state** | The exact question one table cell answers: here, is sum s reachable? |
| **Transition (recurrence)** | How a cell is computed from earlier cells: dp[s] = dp[s] OR dp[s − x] |
| **Base case** | dp[0] = true: the empty subset sums to 0 |
| **0/1 vs unbounded** | Each item at most once (loop sums downward) vs items may repeat (loop upward) |
| **Space optimization (rolling array)** | Keep one row of a 2-D table because each row only reads the previous one |
| **Pseudo-polynomial time** | Polynomial in the numeric value of the input (the target), not in its length |
| **BigInteger** | Immutable arbitrary-precision integer in java.math; shiftLeft, or and testBit make it a bitset |

---
**Conclusion:** Equal partition is subset sum in disguise: if the total is odd, answer \`false\`; otherwise ask whether some subset reaches \`total / 2\`. In Java that is a \`boolean[target + 1]\`, filled item by item with a downward loop so each item counts once — O(n × target) time and O(target) memory — with \`BigInteger\` (or a hand-rolled \`long[]\`) as the bitset speed-up. The same table, with values and a max instead of an OR, is the [0/1 knapsack problem](/interview-question/how-do-you-solve-the-0-1-knapsack-problem); for a problem solved over *sets* of items instead of sums, see [bitmask dynamic programming](/interview-question/what-is-bitmask-dynamic-programming).`,
        examples: [
          {
            label: "can_partition with one valid split",
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class Main {
    static String fmt(List<Integer> xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < xs.size(); i++) {
            if (i > 0) sb.append(", ");
            sb.append(xs.get(i));
        }
        return sb.append("]").toString();
    }

    static boolean canPartition(int[] nums) {
        int total = 0;
        for (int x : nums) total += x;
        if (total % 2 == 1) return false;          // odd total: two equal halves are impossible
        int target = total / 2;
        boolean[] dp = new boolean[target + 1];    // all false by default
        dp[0] = true;                              // the empty subset sums to 0
        for (int x : nums) {
            for (int s = target; s >= x; s--) {    // walk DOWN so x is used at most once
                if (dp[s - x]) dp[s] = true;
            }
        }
        return dp[target];
    }

    // Return the indexes of one subset summing to total/2, or null.
    static List<Integer> findHalf(int[] nums) {
        int total = Arrays.stream(nums).sum();
        if (total % 2 == 1) return null;
        int target = total / 2;
        int[] parent = new int[target + 1];        // index of the item that first reached s
        Arrays.fill(parent, -1);
        boolean[] reach = new boolean[target + 1];
        reach[0] = true;
        for (int i = 0; i < nums.length; i++) {
            for (int s = target; s >= nums[i]; s--) {
                if (reach[s - nums[i]] && !reach[s]) {
                    reach[s] = true;
                    parent[s] = i;
                }
            }
        }
        if (!reach[target]) return null;
        List<Integer> picked = new ArrayList<>();
        int s = target;
        while (s > 0) {                            // walk back: each step removes one item
            int i = parent[s];
            picked.add(i);
            s -= nums[i];
        }
        Collections.sort(picked);
        return picked;
    }

    public static void main(String[] args) {
        int[][] cases = {{1, 5, 11, 5}, {1, 2, 3, 5}, {1, 2, 5}, {3, 3, 3, 4, 5}, {2, 2}, {100}, {}};
        for (int[] nums : cases) {
            int total = Arrays.stream(nums).sum();
            List<Integer> half = findHalf(nums);
            List<Integer> all = new ArrayList<>();
            for (int x : nums) all.add(x);
            String line = fmt(all) + " sum=" + total + " -> " + canPartition(nums);
            if (half != null) {
                List<Integer> a = new ArrayList<>(), b = new ArrayList<>();
                for (int i = 0; i < nums.length; i++) {
                    if (half.contains(i)) a.add(nums[i]); else b.add(nums[i]);
                }
                line += "  " + fmt(a) + " | " + fmt(b);
            } else if (total % 2 == 1) {
                line += "  (odd total)";
            } else {
                line += "  (no subset reaches " + total / 2 + ")";
            }
            System.out.println(line);
        }
        System.out.println(canPartition(new int[]{1, 5, 11, 5})); // true
        System.out.println(canPartition(new int[]{1, 2, 5}));     // false
    }
}`,
          },
          {
            label: "Downward vs upward loop, and brute force vs DP work",
            code: `public class Main {
    static String fmt(int[] xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < xs.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append(xs[i]);
        }
        return sb.append("]").toString();
    }

    static boolean subsetSumDown(int[] nums, int target) {
        boolean[] dp = new boolean[target + 1];
        dp[0] = true;
        for (int x : nums)
            for (int s = target; s >= x; s--) dp[s] = dp[s] || dp[s - x];   // correct: high to low
        return dp[target];
    }

    static boolean subsetSumUp(int[] nums, int target) {
        boolean[] dp = new boolean[target + 1];
        dp[0] = true;
        for (int x : nums)
            for (int s = x; s <= target; s++) dp[s] = dp[s] || dp[s - x];   // BUG: low to high reuses x
        return dp[target];
    }

    static long calls = 0;

    static boolean brute(int[] nums, int i, int remaining) {
        calls++;
        if (remaining == 0) return true;
        if (i == nums.length || remaining < 0) return false;
        // take nums[i], or skip it
        return brute(nums, i + 1, remaining - nums[i]) || brute(nums, i + 1, remaining);
    }

    public static void main(String[] args) {
        System.out.println("input -> target | downward | upward (bug) | brute force");
        int[][] inputs = {{1, 2, 5}, {2, 6}, {1, 5, 11, 5}, {3, 3, 3, 4, 5}};
        int[] targets = {4, 4, 11, 9};
        for (int k = 0; k < inputs.length; k++) {
            calls = 0;
            boolean b = brute(inputs[k], 0, targets[k]);
            System.out.println(fmt(inputs[k]) + " -> " + targets[k] + " | " + subsetSumDown(inputs[k], targets[k])
                + " | " + subsetSumUp(inputs[k], targets[k]) + " | " + b);
        }

        // Work done on a no-answer input: 18 even numbers, half of the total is odd
        int[] nums = new int[18];
        int total = 0;
        for (int i = 0; i < 18; i++) { nums[i] = 2 * (i + 1); total += nums[i]; }
        int target = total / 2;
        calls = 0;
        boolean found = brute(nums, 0, target);
        long cells = 0;
        for (int x : nums) if (x <= target) cells += target - x + 1;
        System.out.println("n = " + nums.length + ", total = " + total + ", target = " + target);
        System.out.println("brute force: " + found + " after " + calls + " calls");
        System.out.println("dp:          " + subsetSumDown(nums, target) + " after " + cells + " cell updates");
    }
}`,
          },
          {
            label: "Bitset version: one shift-and-OR per item",
            code: `import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;

public class Main {
    static String fmt(List<Integer> xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < xs.size(); i++) {
            if (i > 0) sb.append(", ");
            sb.append(xs.get(i));
        }
        return sb.append("]").toString();
    }

    static String fmt(int[] xs) {
        List<Integer> l = new ArrayList<>();
        for (int x : xs) l.add(x);
        return fmt(l);
    }

    static BigInteger reachableBits(int[] nums) {
        BigInteger bits = BigInteger.ONE;            // bit s is 1 when sum s is reachable
        for (int x : nums) {
            bits = bits.or(bits.shiftLeft(x));       // immutable: every op returns a new value
        }
        return bits;
    }

    static boolean canPartitionBits(int[] nums) {
        int total = 0;
        for (int x : nums) total += x;
        if (total % 2 == 1) return false;
        return reachableBits(nums).testBit(total / 2);
    }

    public static void main(String[] args) {
        int[] nums = {1, 5, 11, 5};
        BigInteger bits = reachableBits(nums);
        List<Integer> sums = new ArrayList<>();
        for (int s = 0; s <= 22; s++) if (bits.testBit(s)) sums.add(s);
        System.out.println("reachable sums of " + fmt(nums) + ": " + fmt(sums));
        System.out.println("set bits: " + bits.bitCount() + ", highest sum: " + (bits.bitLength() - 1));
        int[][] cases = {{1, 5, 11, 5}, {1, 2, 3, 5}, {1, 2, 5}, {3, 3, 3, 4, 5}, {100, 100, 100, 100, 99, 101}};
        for (int[] c : cases) System.out.println(fmt(c) + " -> " + canPartitionBits(c));

        // 200 values up to 100: the shape of the usual constraints
        int[] big = new int[200];
        int bigTotal = 0;
        for (int i = 0; i < 200; i++) { big[i] = (i * 37) % 100 + 1; bigTotal += big[i]; }
        System.out.println("200 items, total " + bigTotal + " -> " + canPartitionBits(big));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given an array of positive integers, can you split it into two groups whose sums are equal? Every number must go into one of the two groups. Please code it in C++ and tell me the time and space cost."

**What a strong answer should cover:**
- The reframing: equal halves exist exactly when the total is even and some subset sums to total / 2.
- The 1-D subset-sum table \`dp[s]\` with base case \`dp[0] = true\` and transition \`dp[s] = dp[s] OR dp[s - x]\`.
- Why the inner loop runs from \`target\` down to \`x\` (each item used once — 0/1, not unbounded).
- Complexity O(n × S / 2) time and O(S / 2) space, and why that is pseudo-polynomial; brute force is O(2ⁿ).
- C++ details: \`std::accumulate\` with \`0LL\` (the init value fixes the result type), \`std::vector<char>\` vs the bit-packed \`std::vector<bool>\`, and \`std::bitset<N>\` with \`bits |= bits << x\` (N must be a compile-time constant).

**Clarifying questions expected:**
- Are all numbers positive integers, and how large can n and the values be?
- Do you need the actual two subsets, or only true / false?

**Code / implementation expected:** Yes — a short \`canPartition(const std::vector<int>&)\` in C++17 with a 1-D table, plus the odd-sum check.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need loops and arrays; dynamic programming is explained from scratch  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two friends come back from a trip with a bag of souvenirs, each with a price tag: 1, 5, 11 and 5 dollars. They want to split the bag so that each person carries exactly the same total value — no cutting souvenirs in half, every souvenir goes to someone.

You could try every way of dealing out the souvenirs. With 4 items that is 2⁴ = 16 ways, easy. With 40 items it is about a trillion ways, which no computer will finish during your interview.

The trick that makes this problem easy is a change of question. The bag is worth 22, so each friend must get exactly 11. If you can find **one** pile of souvenirs worth exactly 11, the rest of the bag is automatically worth 22 − 11 = 11 too. So the real question is: *"Can I pick some of these numbers so they add up to exactly half the total?"* That smaller question has a famous, fast answer, and it is a cousin of the [0/1 knapsack problem](/interview-question/how-do-you-solve-the-0-1-knapsack-problem).

This problem shows up in interviews because it tests three things at once: spotting the reframing, building a small [dynamic programming](/interview-question/what-is-dynamic-programming) table, and getting one subtle loop direction right.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all numbers positive integers? | The table is indexed by sums. Negative numbers or fractions break the indexing (you would need an offset or a hash set of sums). |
| How large are n and the values? | The DP costs about n × (total / 2) steps. With n ≤ 200 and values ≤ 100, half the total is at most 10,000 — tiny. With values up to 10⁹, this method is useless. |
| Must every element be used? | Yes in the standard version — that is what makes "one half sums to total / 2" equivalent to a full split. |
| Do you need the two subsets, or just yes / no? | Yes / no needs one boolean row. Returning the subsets needs one extra array to remember how each sum was first reached. |
| Can a subset be empty? | Matters only for the empty array or a total of 0. Most versions say the empty array can be split (two empty halves). |

## 3. The Reframing: Half the Total

Write S for the sum of all numbers. If the array splits into two groups with equal sums, each group sums to S / 2. Two facts fall out immediately:

1. **If S is odd, the answer is false.** Two equal integers always add up to an even number.
2. **If S is even, the answer is true exactly when some subset sums to S / 2.** Whatever is left over sums to S − S / 2 = S / 2.

📌 **Interview term: Subset sum problem** — "given numbers and a target, can some subset of the numbers add up to exactly the target?" Equal partition is subset sum with target S / 2.

📌 **Interview term: Partition problem** — the formal name for "can this multiset be split into two parts with equal sums?". It is NP-complete in general, which is why the fast method below depends on the *size of the numbers*, not just how many there are.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="The array 1, 5, 11, 5 has total 22. One half holds 11, the other half holds 1, 5 and 5. Both halves sum to 11">
  <defs>
    <marker id="b30q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="300" y="24" text-anchor="middle">total 22, so each half needs 11</text>
  <rect class="d-box" x="120" y="44" width="60" height="40" rx="6"/>
  <text class="d-text" x="150" y="69" text-anchor="middle">1</text>
  <rect class="d-box" x="220" y="44" width="60" height="40" rx="6"/>
  <text class="d-text" x="250" y="69" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="320" y="44" width="60" height="40" rx="6"/>
  <text class="d-text" x="350" y="69" text-anchor="middle">11</text>
  <rect class="d-box" x="420" y="44" width="60" height="40" rx="6"/>
  <text class="d-text" x="450" y="69" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 350 86 L 190 186" marker-end="url(#b30q1-arrow)"/>
  <path class="d-edge" d="M 150 86 L 410 186" marker-end="url(#b30q1-arrow)"/>
  <path class="d-edge" d="M 250 86 L 425 186" marker-end="url(#b30q1-arrow)"/>
  <path class="d-edge" d="M 450 86 L 445 186" marker-end="url(#b30q1-arrow)"/>
  <rect class="d-box-accent" x="80" y="190" width="200" height="56" rx="10"/>
  <text class="d-text" x="180" y="214" text-anchor="middle">half A: 11</text>
  <text class="d-sub" x="180" y="235" text-anchor="middle">sum 11</text>
  <rect class="d-box" x="340" y="190" width="200" height="56" rx="10"/>
  <text class="d-text" x="440" y="214" text-anchor="middle">half B: 1, 5, 5</text>
  <text class="d-sub" x="440" y="235" text-anchor="middle">sum 11</text>
</svg>

The arrows show the split the code finds for \`[1, 5, 11, 5]\`: the item 11 alone is one half, and 1, 5 and 5 make the other half.

## 4. Building the Table of Reachable Sums

Think of a row of light bulbs numbered 0 to S / 2. Bulb s is on when "some of the items I have looked at so far can add up to exactly s". At the start only bulb 0 is on — picking nothing gives a sum of 0.

Now take the items one at a time. For an item worth x, every bulb s that was already on lets you switch on bulb s + x (take the old pile and add this item). After all items, look at bulb S / 2.

📌 **Interview term: DP state** — the exact question one table cell answers. Here \`dp[s]\` = "can a subset of the items processed so far sum to s?".

📌 **Interview term: Transition (recurrence)** — how a cell is computed from earlier cells: \`dp[s] = dp[s] OR dp[s − x]\` — either s was already reachable without this item, or it is reachable by adding this item to a pile worth s − x.

📌 **Interview term: Base case** — \`dp[0] = true\`: the empty subset sums to 0. Every other cell starts false.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 310" role="img" aria-label="The dp row of reachable sums 0 to 11 after each item of 1, 5, 11, 5. Cell 11 becomes true after the item 11">
  <text class="d-sub" x="148" y="30" text-anchor="middle">0</text>
  <text class="d-sub" x="190" y="30" text-anchor="middle">1</text>
  <text class="d-sub" x="232" y="30" text-anchor="middle">2</text>
  <text class="d-sub" x="274" y="30" text-anchor="middle">3</text>
  <text class="d-sub" x="316" y="30" text-anchor="middle">4</text>
  <text class="d-sub" x="358" y="30" text-anchor="middle">5</text>
  <text class="d-sub" x="400" y="30" text-anchor="middle">6</text>
  <text class="d-sub" x="442" y="30" text-anchor="middle">7</text>
  <text class="d-sub" x="484" y="30" text-anchor="middle">8</text>
  <text class="d-sub" x="526" y="30" text-anchor="middle">9</text>
  <text class="d-sub" x="568" y="30" text-anchor="middle">10</text>
  <text class="d-sub" x="610" y="30" text-anchor="middle">11</text>
  <text class="d-text" x="20" y="71">start</text>
  <rect class="d-box-accent" x="130" y="50" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="71" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="172" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="214" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="340" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="382" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="424" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="550" y="50" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="592" y="50" width="36" height="32" rx="4"/>
  <text class="d-text" x="20" y="121">after 1</text>
  <rect class="d-box-accent" x="130" y="100" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="121" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="172" y="100" width="36" height="32" rx="4"/>
  <text class="d-text" x="190" y="121" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="214" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="340" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="382" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="424" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="550" y="100" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="592" y="100" width="36" height="32" rx="4"/>
  <text class="d-text" x="20" y="171">after 5</text>
  <rect class="d-box-accent" x="130" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="171" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="172" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="190" y="171" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="214" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="340" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="358" y="171" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="382" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="400" y="171" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="424" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="550" y="150" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="592" y="150" width="36" height="32" rx="4"/>
  <text class="d-text" x="20" y="221">after 11</text>
  <rect class="d-box-accent" x="130" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="221" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="172" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="190" y="221" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="214" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="340" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="358" y="221" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="382" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="400" y="221" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="424" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="550" y="200" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="592" y="200" width="36" height="32" rx="4"/>
  <text class="d-text" x="610" y="221" text-anchor="middle">T</text>
  <text class="d-text" x="20" y="271">after 5</text>
  <rect class="d-box-accent" x="130" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="148" y="271" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="172" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="190" y="271" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="214" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="256" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="298" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="340" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="358" y="271" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="382" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="400" y="271" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="424" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="466" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-muted" x="508" y="250" width="36" height="32" rx="4"/>
  <rect class="d-box-accent" x="550" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="568" y="271" text-anchor="middle">T</text>
  <rect class="d-box-accent" x="592" y="250" width="36" height="32" rx="4"/>
  <text class="d-text" x="610" y="271" text-anchor="middle">T</text>
</svg>

Each row is the table after one more item. Bulb 11 switches on when the item 11 is processed (reading bulb 0), and stays on. The final row also shows 10 (5 + 5) and 6 (1 + 5) — every sum up to 11 that some subset can make.

## 5. The One Detail Everybody Gets Wrong: Loop Direction

The full table would be 2-D: one row per item. We only keep **one** row and overwrite it in place, because each new row only reads the row above it. That saves memory, but it creates a trap.

When processing item x, the update for s reads cell s − x, which is *to the left*. If the loop walks **upward** (s = x, x + 1, …), the cell s − x may already have been updated in this same round — meaning it already counts item x. Reading it then uses item x a second time.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Processing item 2 with target 4. Walking upward reads cell 2 after it was already set this round and wrongly marks 4. Walking downward reads the old value of cell 2 and leaves 4 false">
  <defs>
    <marker id="b30q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="335" y="24" text-anchor="middle">item x = 2, target 4</text>
  <text class="d-text" x="20" y="111">upward</text>
  <path class="d-edge-accent" d="M 185 88 Q 255 40 325 88" marker-end="url(#b30q1-arrow2)"/>
  <path class="d-edge-accent" d="M 325 88 Q 395 40 465 88" marker-end="url(#b30q1-arrow2)"/>
  <rect class="d-box-accent" x="160" y="90" width="50" height="34" rx="4"/>
  <text class="d-text" x="185" y="112" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="230" y="90" width="50" height="34" rx="4"/>
  <text class="d-sub" x="255" y="112" text-anchor="middle">F</text>
  <rect class="d-box-accent" x="300" y="90" width="50" height="34" rx="4"/>
  <text class="d-text" x="325" y="112" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="370" y="90" width="50" height="34" rx="4"/>
  <text class="d-sub" x="395" y="112" text-anchor="middle">F</text>
  <rect class="d-box-accent" x="440" y="90" width="50" height="34" rx="4"/>
  <text class="d-text" x="465" y="112" text-anchor="middle">T</text>
  <rect class="d-box" x="520" y="88" width="104" height="38" rx="6"/>
  <text class="d-text" x="572" y="112" text-anchor="middle">wrong</text>
  <text class="d-text" x="20" y="241">downward</text>
  <path class="d-edge-accent" d="M 185 218 Q 255 170 325 218" marker-end="url(#b30q1-arrow2)"/>
  <path class="d-edge-dashed" d="M 325 218 Q 395 170 465 218" marker-end="url(#b30q1-arrow2)"/>
  <rect class="d-box-accent" x="160" y="220" width="50" height="34" rx="4"/>
  <text class="d-text" x="185" y="242" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="230" y="220" width="50" height="34" rx="4"/>
  <text class="d-sub" x="255" y="242" text-anchor="middle">F</text>
  <rect class="d-box-accent" x="300" y="220" width="50" height="34" rx="4"/>
  <text class="d-text" x="325" y="242" text-anchor="middle">T</text>
  <rect class="d-box-muted" x="370" y="220" width="50" height="34" rx="4"/>
  <text class="d-sub" x="395" y="242" text-anchor="middle">F</text>
  <rect class="d-box-muted" x="440" y="220" width="50" height="34" rx="4"/>
  <text class="d-sub" x="465" y="242" text-anchor="middle">F</text>
  <rect class="d-box" x="520" y="218" width="104" height="38" rx="6"/>
  <text class="d-text" x="572" y="242" text-anchor="middle">correct</text>
  <text class="d-sub" x="185" y="282" text-anchor="middle">s = 0</text>
  <text class="d-sub" x="325" y="282" text-anchor="middle">s = 2</text>
  <text class="d-sub" x="465" y="282" text-anchor="middle">s = 4</text>
</svg>

With the item 2 and target 4, the upward walk sets cell 2 from cell 0, then sets cell 4 from the cell 2 it just changed — that is 2 + 2, the same item twice. The downward walk reaches cell 4 first, while cell 2 still holds its old value, so the item is used at most once.

📌 **Interview term: 0/1 vs unbounded** — in a 0/1 problem each item can be used at most once (walk the sums downward); in an unbounded problem items may repeat, like coins in [coin change](/interview-question/how-do-you-solve-the-coin-change-problem) (walk upward on purpose).

📌 **Interview term: Space optimization (rolling array)** — keeping only one row of a 2-D DP table because each row depends only on the previous one. It turns O(n × target) memory into O(target).

## 6. From Brute Force to the Optimal Approach

**Brute force.** For each number, either put it in the first half or not — that is the include/exclude recursion from [generating all subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array). It explores up to 2ⁿ subsets: O(2ⁿ) time. Example 2 counts the calls on 18 numbers.

**Memoized recursion.** The answer to "can items i..n−1 make the sum r?" depends only on (i, r), so caching it gives O(n × target) states. That is correct, but it uses a 2-D cache and a deep [recursion](/interview-question/what-is-recursion-and-what-is-a-base-case) stack.

**Bottom-up 1-D table (the answer to give).** The bulb row above: O(n × target) time, O(target) memory, no recursion. Add the odd-sum early exit, and stop early if \`dp[target]\` turns on.

**Bitset trick (a strong follow-up).** Store the whole row as the bits of one big integer. "Every reachable s also gives s + x" is a single shift-and-OR: \`bits |= bits << x\`. Same O(n × target) bit operations, but done one machine word (64 bits) at a time, so roughly 64 times fewer steps. Example 3 shows it.

📌 **Interview term: Pseudo-polynomial time** — running time that is polynomial in the *numeric value* of the input (here the target), not in its length. O(n × S) is fast when S is small, and exponential in the number of digits of S.

## 7. The Code in C++

The whole solution is one function:

~~~cpp
bool canPartition(const vector<int>& nums) {
    long long total = accumulate(nums.begin(), nums.end(), 0LL);   // 0LL: sum in long long
    if (total % 2 == 1) return false;           // odd total: two equal halves are impossible
    int target = static_cast<int>(total / 2);
    vector<char> dp(target + 1, 0);             // char, not vector<bool> (bit-packed proxy)
    dp[0] = 1;                                  // the empty subset sums to 0
    for (int x : nums) {
        for (int s = target; s >= x; s--) {     // walk DOWN so x is used at most once
            if (dp[s - x]) dp[s] = 1;
        }
    }
    return dp[target];
}
~~~

**What to point out in this code:**

- \`std::accumulate(nums.begin(), nums.end(), 0LL)\` — the type of the initial value is the type of the result. With a plain \`0\` the sum is computed in \`int\`, and with large values signed overflow is undefined behaviour, not just a wrong number.
- \`std::vector<char> dp(target + 1, 0)\` instead of \`std::vector<bool>\`: the standard lets \`vector<bool>\` pack bits and hand out proxy objects instead of real \`bool&\` references ([cppreference](https://en.cppreference.com/w/cpp/container/vector_bool)). It works here, but \`char\` is simpler and usually faster for a table you write to constantly.
- \`for (int s = target; s >= x; s--)\` walks downward so each item is used at most once. Keep \`s\` signed: with \`size_t s\`, the condition \`s >= 0\` is always true and the loop never ends.
- \`findHalf\` returns the indexes and reports success through \`bool& ok\`; \`std::optional<std::vector<int>>\` is the C++17 way to say "maybe a result" if you prefer.
- **Bitset version (example 3):** \`std::bitset<MAX_SUM + 1>\` stores the row as bits, and \`bits |= bits << x\` updates all sums at once, one machine word at a time. The size must be a compile-time constant, so it is sized for the worst case (20,000 here); \`bits.count()\` counts the reachable sums. This is the classic competitive-programming speed-up.

## 8. Dry Run on [1, 5, 11, 5]

Total 22, so target = 11. The row has cells 0..11; \`T\` marks a reachable sum.

| Item | Cells switched on this round (downward) | Reachable sums afterwards |
| :--- | :--- | :--- |
| start | — | 0 |
| 1 | 1 (from 0) | 0, 1 |
| 5 | 6 (from 1), 5 (from 0) | 0, 1, 5, 6 |
| 11 | 11 (from 0) | 0, 1, 5, 6, 11 |
| 5 | 11 already on; 10 (from 5) | 0, 1, 5, 6, 10, 11 |

Cell 11 is on, so the answer is true. The \`parent\` array remembers that 11 was first reached by the item 11 (from 0), so one half is \`[11]\` and the other is \`[1, 5, 5]\` — exactly the first line of example 1.

## 9. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — can_partition with one valid split** prints:

~~~text
[1, 5, 11, 5] sum=22 -> true  [11] | [1, 5, 5]
[1, 2, 3, 5] sum=11 -> false  (odd total)
[1, 2, 5] sum=8 -> false  (no subset reaches 4)
[3, 3, 3, 4, 5] sum=18 -> true  [3, 3, 3] | [4, 5]
[2, 2] sum=4 -> true  [2] | [2]
[100] sum=100 -> false  (no subset reaches 50)
[] sum=0 -> true  [] | []
true
false
~~~

**Example 2 — downward vs upward loop, and brute force vs DP work** prints:

~~~text
input -> target | downward | upward (bug) | brute force
[1, 2, 5] -> 4 | false | true | false
[2, 6] -> 4 | false | true | false
[1, 5, 11, 5] -> 11 | true | true | true
[3, 3, 3, 4, 5] -> 9 | true | true | true
n = 18, total = 342, target = 171
brute force: false after 405293 calls
dp:          false after 2754 cell updates
~~~

The upward loop says \`true\` for \`[1, 2, 5]\` and \`[2, 6]\` with target 4 — both wrong, because it used the item 2 (or 1) twice. On 18 even numbers whose half-total 171 is odd (so no subset can reach it), the brute force needs 405,293 calls to say no; the table needs 2,754 cell updates.

**Example 3 — the bitset version** prints:

~~~text
reachable sums of [1, 5, 11, 5]: [0, 1, 5, 6, 10, 11, 12, 16, 17, 21, 22]
set bits: 11, highest sum: 22
[1, 5, 11, 5] -> true
[1, 2, 3, 5] -> false
[1, 2, 5] -> false
[3, 3, 3, 4, 5] -> true
[100, 100, 100, 100, 99, 101] -> true
200 items, total 10100 -> true
~~~

## 10. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force include / exclude | O(2ⁿ) | O(n) | every subset may be tried; recursion depth n |
| Memoized recursion on (i, r) | O(n × S / 2) | O(n × S / 2) | one cache entry per (item, remaining sum) state |
| Bottom-up 1-D table | O(n × S / 2) | O(S / 2) | n passes over a row of S / 2 + 1 cells |
| Bitset shift-and-OR | O(n × S / 64) | O(S / 64) words | each pass shifts S bits, 64 per machine word |

Here n is the number of items and S their total. In example 2 the table did **2,754** cell updates where the brute force made **405,293** calls — and that gap doubles with every extra item.

## 11. Edge Cases

- **Odd total.** Return false before allocating anything (\`[1, 2, 3, 5]\` has total 11).
- **Even total but no subset reaches half.** \`[1, 2, 5]\` totals 8, but no subset makes 4 — the table, not the parity check, says false.
- **A single element.** \`[100]\` can never be split: the target 50 is unreachable.
- **An item bigger than half.** It can never be in the half that sums to S / 2; the inner loop simply does not run for it (s starts at target and must be ≥ x). If any item exceeds S / 2 the answer is false.
- **Empty array.** Total 0, target 0, \`dp[0]\` is true — two empty halves. Confirm with the interviewer if this matters.
- **Duplicates.** \`[2, 2]\` and \`[3, 3, 3, 4, 5]\` work naturally; each copy is a separate item.

## Common Pitfalls

- **Upward loop.** \`for (int s = x; s <= target; s++)\` reuses the item; \`{2, 6}\` then "splits".
- **\`std::accumulate(..., 0)\` with big values.** The sum is done in \`int\`; signed overflow is undefined behaviour. Use \`0LL\`.
- **Unsigned loop counter going down.** \`for (size_t s = target; s >= x; s--)\` with \`x == 0\` never ends, because an unsigned value is always ≥ 0.
- **Sizing \`std::bitset\` at run time.** \`std::bitset<target>\` does not compile — the size is a template argument; pick the maximum possible sum.
- **Forgetting the odd check.** \`total / 2\` truncates for odd totals and the table answers the wrong question.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reframe:</strong> <span style="color:#f0e2c8;">Two equal halves means one subset sums to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total / 2</code>; the rest is the other half. Odd total → <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> immediately.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;char&gt; dp</code>, where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s]</code> is 1 if some subset of the items seen so far sums to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0] = 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Transition:</strong> <span style="color:#f0e2c8;">For each item <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>, for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code> down to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s] |= dp[s - x]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why downward:</strong> <span style="color:#f0e2c8;">So <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s - x]</code> still describes the previous items — each item is used at most once (0/1, not unbounded).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(n × target) time, O(target) space; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::bitset</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bits |= bits &lt;&lt; x</code> does 64 sums per machine word.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must the inner loop go downward?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Going up, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s - x]</code> may already include <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> from this round, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> gets used twice. On <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{2, 6}</code> the upward loop wrongly reports a split because 2 + 2 = 4.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the two subsets?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt; parent</code> = index of the item that first set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[s]</code>. Walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code>, subtracting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[parent[s]]</code>, collecting indexes; everything else is the other half.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::vector&lt;bool&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a bit-packed specialisation whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> returns a proxy, not a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool&amp;</code>. It works for this loop, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;char&gt;</code> is a plain array and avoids surprises with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">auto&amp;</code> and references.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::bitset</code> version work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bit s means sum s is reachable. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bits &lt;&lt; x</code> moves every reachable sum up by x, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">|=</code> merges it with the old sums — one pass of word operations per item.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this polynomial time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is pseudo-polynomial: O(n × S) depends on the value S. The general partition problem is NP-complete; the DP is fast only because S is small.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subset sum problem** | Can some subset of the numbers add up to exactly a target? |
| **Partition problem** | Can the numbers be split into two groups with equal sums? NP-complete in general |
| **DP state** | The exact question one table cell answers: here, is sum s reachable? |
| **Transition (recurrence)** | How a cell is computed from earlier cells: dp[s] = dp[s] OR dp[s − x] |
| **Base case** | dp[0] = true: the empty subset sums to 0 |
| **0/1 vs unbounded** | Each item at most once (loop sums downward) vs items may repeat (loop upward) |
| **Space optimization (rolling array)** | Keep one row of a 2-D table because each row only reads the previous one |
| **Pseudo-polynomial time** | Polynomial in the numeric value of the input (the target), not in its length |
| **std::bitset** | Fixed-size bit array whose size is a compile-time constant; supports shifts and OR on the whole set |

---
**Conclusion:** Equal partition is subset sum in disguise: if the total is odd, answer \`false\`; otherwise ask whether some subset reaches \`total / 2\`. In C++ that is a \`std::vector<char>\` of \`target + 1\` cells filled item by item with a signed, downward loop so each item counts once — O(n × target) time and O(target) memory — and \`std::bitset\` with \`bits |= bits << x\` is the classic speed-up. Sum with \`0LL\`, size the bitset at compile time, and watch unsigned counters. The same table, with values and a max instead of an OR, is the [0/1 knapsack problem](/interview-question/how-do-you-solve-the-0-1-knapsack-problem); for a problem solved over *sets* of items instead of sums, see [bitmask dynamic programming](/interview-question/what-is-bitmask-dynamic-programming).`,
        examples: [
          {
            label: "can_partition with one valid split",
            code: `#include <algorithm>
#include <iostream>
#include <numeric>
#include <string>
#include <vector>
using namespace std;

string fmt(const vector<int>& xs) {
    string out = "[";
    for (size_t i = 0; i < xs.size(); i++) {
        if (i > 0) out += ", ";
        out += to_string(xs[i]);
    }
    return out + "]";
}

bool canPartition(const vector<int>& nums) {
    long long total = accumulate(nums.begin(), nums.end(), 0LL);   // 0LL: sum in long long
    if (total % 2 == 1) return false;           // odd total: two equal halves are impossible
    int target = static_cast<int>(total / 2);
    vector<char> dp(target + 1, 0);             // char, not vector<bool> (bit-packed proxy)
    dp[0] = 1;                                  // the empty subset sums to 0
    for (int x : nums) {
        for (int s = target; s >= x; s--) {     // walk DOWN so x is used at most once
            if (dp[s - x]) dp[s] = 1;
        }
    }
    return dp[target];
}

// Return the indexes of one subset summing to total/2; ok says whether one exists.
vector<int> findHalf(const vector<int>& nums, bool& ok) {
    long long total = accumulate(nums.begin(), nums.end(), 0LL);
    ok = false;
    if (total % 2 == 1) return {};
    int target = static_cast<int>(total / 2);
    vector<int> parent(target + 1, -1);         // index of the item that first reached s
    vector<char> reach(target + 1, 0);
    reach[0] = 1;
    for (int i = 0; i < (int)nums.size(); i++) {
        for (int s = target; s >= nums[i]; s--) {
            if (reach[s - nums[i]] && !reach[s]) {
                reach[s] = 1;
                parent[s] = i;
            }
        }
    }
    if (!reach[target]) return {};
    ok = true;
    vector<int> picked;
    int s = target;
    while (s > 0) {                             // walk back: each step removes one item
        int i = parent[s];
        picked.push_back(i);
        s -= nums[i];
    }
    sort(picked.begin(), picked.end());
    return picked;
}

int main() {
    cout << boolalpha;
    vector<vector<int>> cases = {{1, 5, 11, 5}, {1, 2, 3, 5}, {1, 2, 5}, {3, 3, 3, 4, 5}, {2, 2}, {100}, {}};
    for (const auto& nums : cases) {
        long long total = accumulate(nums.begin(), nums.end(), 0LL);
        bool ok;
        vector<int> half = findHalf(nums, ok);
        string line = fmt(nums) + " sum=" + to_string(total) + " -> " + (canPartition(nums) ? "true" : "false");
        if (ok) {
            vector<int> a, b;
            for (int i = 0; i < (int)nums.size(); i++) {
                if (binary_search(half.begin(), half.end(), i)) a.push_back(nums[i]);
                else b.push_back(nums[i]);
            }
            line += "  " + fmt(a) + " | " + fmt(b);
        } else if (total % 2 == 1) {
            line += "  (odd total)";
        } else {
            line += "  (no subset reaches " + to_string(total / 2) + ")";
        }
        cout << line << "\\n";
    }
    cout << canPartition({1, 5, 11, 5}) << "\\n"; // true
    cout << canPartition({1, 2, 5}) << "\\n";     // false
}`,
          },
          {
            label: "Downward vs upward loop, and brute force vs DP work",
            code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

string fmt(const vector<int>& xs) {
    string out = "[";
    for (size_t i = 0; i < xs.size(); i++) {
        if (i > 0) out += ", ";
        out += to_string(xs[i]);
    }
    return out + "]";
}

bool subsetSumDown(const vector<int>& nums, int target) {
    vector<char> dp(target + 1, 0);
    dp[0] = 1;
    for (int x : nums)
        for (int s = target; s >= x; s--) dp[s] = dp[s] || dp[s - x];   // correct: high to low
    return dp[target];
}

bool subsetSumUp(const vector<int>& nums, int target) {
    vector<char> dp(target + 1, 0);
    dp[0] = 1;
    for (int x : nums)
        for (int s = x; s <= target; s++) dp[s] = dp[s] || dp[s - x];   // BUG: low to high reuses x
    return dp[target];
}

long long calls = 0;

bool brute(const vector<int>& nums, size_t i, int remaining) {
    calls++;
    if (remaining == 0) return true;
    if (i == nums.size() || remaining < 0) return false;
    // take nums[i], or skip it
    return brute(nums, i + 1, remaining - nums[i]) || brute(nums, i + 1, remaining);
}

int main() {
    cout << boolalpha;
    cout << "input -> target | downward | upward (bug) | brute force\\n";
    vector<pair<vector<int>, int>> cases = {{{1, 2, 5}, 4}, {{2, 6}, 4}, {{1, 5, 11, 5}, 11}, {{3, 3, 3, 4, 5}, 9}};
    for (const auto& [nums, target] : cases) {
        calls = 0;
        bool b = brute(nums, 0, target);
        cout << fmt(nums) << " -> " << target << " | " << subsetSumDown(nums, target) << " | "
             << subsetSumUp(nums, target) << " | " << b << "\\n";
    }

    // Work done on a no-answer input: 18 even numbers, half of the total is odd
    vector<int> nums;
    int total = 0;
    for (int i = 0; i < 18; i++) { nums.push_back(2 * (i + 1)); total += nums.back(); }
    int target = total / 2;
    calls = 0;
    bool found = brute(nums, 0, target);
    long long cells = 0;
    for (int x : nums) if (x <= target) cells += target - x + 1;
    cout << "n = " << nums.size() << ", total = " << total << ", target = " << target << "\\n";
    cout << "brute force: " << found << " after " << calls << " calls\\n";
    cout << "dp:          " << subsetSumDown(nums, target) << " after " << cells << " cell updates\\n";
}`,
          },
          {
            label: "Bitset version: one shift-and-OR per item",
            code: `#include <bitset>
#include <iostream>
#include <numeric>
#include <string>
#include <vector>
using namespace std;

const int MAX_SUM = 20000;           // 200 items x value 100: size fixed at compile time

string fmt(const vector<int>& xs) {
    string out = "[";
    for (size_t i = 0; i < xs.size(); i++) {
        if (i > 0) out += ", ";
        out += to_string(xs[i]);
    }
    return out + "]";
}

bitset<MAX_SUM + 1> reachableBits(const vector<int>& nums) {
    bitset<MAX_SUM + 1> bits;
    bits[0] = 1;                      // bit s is 1 when sum s is reachable
    for (int x : nums) bits |= bits << x;   // every old sum s also gives s + x
    return bits;
}

bool canPartitionBits(const vector<int>& nums) {
    int total = accumulate(nums.begin(), nums.end(), 0);
    if (total % 2 == 1) return false;
    return reachableBits(nums)[total / 2];
}

int main() {
    cout << boolalpha;
    vector<int> nums = {1, 5, 11, 5};
    auto bits = reachableBits(nums);
    vector<int> sums;
    for (int s = 0; s <= 22; s++) if (bits[s]) sums.push_back(s);
    cout << "reachable sums of " << fmt(nums) << ": " << fmt(sums) << "\\n";
    cout << "set bits: " << bits.count() << ", highest sum: " << sums.back() << "\\n";
    vector<vector<int>> cases = {{1, 5, 11, 5}, {1, 2, 3, 5}, {1, 2, 5}, {3, 3, 3, 4, 5}, {100, 100, 100, 100, 99, 101}};
    for (const auto& c : cases) cout << fmt(c) << " -> " << canPartitionBits(c) << "\\n";

    // 200 values up to 100: the shape of the usual constraints
    vector<int> big;
    for (int i = 0; i < 200; i++) big.push_back((i * 37) % 100 + 1);
    cout << "200 items, total " << accumulate(big.begin(), big.end(), 0) << " -> " << canPartitionBits(big) << "\\n";
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "Burst Balloons: why does DP over intervals (not balloons) work?",
    difficulty: "hard",
    seoDescription: "Burst Balloons explained: why choosing the last balloon in an interval makes the DP work, with O(n^3) code in Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You have n balloons in a row, each with a number. Bursting balloon i earns left × nums[i] × right, where left and right are its current neighbours (a missing neighbour counts as 1). Find the maximum coins. Code it in Python, and explain why the DP is over intervals and why you choose the balloon burst last rather than first."

**What a strong answer should cover:**
- Why "choose the first balloon" fails: its neighbours become adjacent, so the two sides are not independent sub-problems.
- The insight: choose the balloon k burst **last** in the open interval (i, j); it separates the two sides, and its neighbours are fixed as a[i] and a[j].
- Padding with 1s, the state \`dp[i][j]\`, the recurrence \`max(dp[i][k] + a[i]·a[k]·a[j] + dp[k][j])\`, and filling by interval length.
- O(n³) time and O(n²) space versus O(n · n!) for trying every order.
- Python details: build the 2-D table with a comprehension (never \`[[0] * n] * n\`), pad with \`[1] + nums + [1]\`, and know that a top-down \`@lru_cache\` version is short but pays recursion and call overhead; ints never overflow.

**Clarifying questions expected:**
- What does a missing neighbour count as, and how large are n and the values?
- Do you need the burst order, or only the maximum?

**Code / implementation expected:** Yes — \`max_coins(nums)\` in Python with a padded list and an O(n³) interval table.`,
        answer: `**Target Audience:** Interview candidates who have seen basic dynamic programming (a 1-D table) and want to learn interval DP — every new idea is explained  
**Difficulty:** Hard  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a row of balloons at a fair: 3, 1, 5, 8. Pop one and you win prize points equal to *its number times the numbers of the two balloons right next to it at that moment*. If a side has no balloon, that side counts as 1. Pop all of them; what order wins the most points?

The catch is the words "at that moment". Every pop changes who is next to whom. Pop the 1 first and the 3 and 5 suddenly become neighbours. Pop the 5 first instead and the 1 and 8 become neighbours. The value of every later pop depends on everything you did before it.

Trying every order is hopeless: 4 balloons have 4! = 24 orders, but 12 balloons already have 479,001,600. And the obvious dynamic programming idea — "pick the balloon to pop **first**, then solve the two sides" — gives wrong answers, because the two sides do not stay separate.

The fix is one of the most elegant ideas in interview DP: pick the balloon to pop **last**. This page shows why that single change makes the two sides truly independent, which is the property every [dynamic programming](/interview-question/what-is-dynamic-programming) solution needs.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What does a missing neighbour count as? | The standard version says 1. That is why we pad the array with a 1 on each end, which removes every boundary \`if\`. |
| How many balloons, and how big are the numbers? | The DP is O(n³). With n around 300–500 that is tens of millions of simple steps — fine. With n = 10⁵ it is not. |
| Can a balloon be 0? | Zeros are allowed and need no special case; they just earn 0 for anyone next to them. |
| Do you want the order of pops, or only the maximum? | The maximum needs the table. The order needs one extra table remembering which balloon was last in each interval (example 1 prints it). |
| Can the total overflow? | Each pop is a product of three numbers. With values ≤ 100 one pop is at most 10⁶, so even 500 pops fit easily in a 32-bit int; with larger values you need 64-bit. |

## 3. The Setup: Pad the Ends With 1

First, a small trick that makes everything cleaner. Add an imaginary balloon worth 1 at each end. These two are never popped; they are walls. Now "a missing neighbour counts as 1" is automatic, and the real balloons sit at indexes 1 to n.

📌 **Interview term: Sentinel (padding)** — an extra value placed at the ends of an array so that boundary cases behave like normal cases. Here the two 1s remove every "is there a left neighbour?" check.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 180" role="img" aria-label="Balloons 3, 1, 5, 8 with an imaginary balloon worth 1 added at each end as a wall. Indexes 0 to 5">
  <text class="d-sub" x="60" y="30" text-anchor="middle">wall</text>
  <text class="d-sub" x="540" y="30" text-anchor="middle">wall</text>
  <rect class="d-box-muted" x="30" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="60" y="86" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="156" cy="80" r="30"/>
  <text class="d-text" x="156" y="86" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="252" cy="80" r="30"/>
  <text class="d-text" x="252" y="86" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="348" cy="80" r="30"/>
  <text class="d-text" x="348" y="86" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="444" cy="80" r="30"/>
  <text class="d-text" x="444" y="86" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="510" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="540" y="86" text-anchor="middle">1</text>
  <text class="d-sub" x="60" y="150" text-anchor="middle">index 0</text>
  <text class="d-sub" x="156" y="150" text-anchor="middle">1</text>
  <text class="d-sub" x="252" y="150" text-anchor="middle">2</text>
  <text class="d-sub" x="348" y="150" text-anchor="middle">3</text>
  <text class="d-sub" x="444" y="150" text-anchor="middle">4</text>
  <text class="d-sub" x="540" y="150" text-anchor="middle">5</text>
</svg>

## 4. Why "Which Balloon First?" Fails

A good DP splits a problem into smaller problems that **do not affect each other**. Suppose we pop balloon 1 (the one worth 1) first and then try to solve "the balloons to its left" and "the balloons to its right" separately.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 290" role="img" aria-label="Bursting the balloon 1 first makes balloons 3 and 5 neighbours, so the left side and the right side are no longer separate problems">
  <defs>
    <marker id="b30q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="30">before</text>
  <circle class="d-box" cx="156" cy="70" r="28"/>
  <text class="d-text" x="156" y="76" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="252" cy="70" r="28"/>
  <text class="d-text" x="252" y="76" text-anchor="middle">1</text>
  <circle class="d-box" cx="348" cy="70" r="28"/>
  <text class="d-text" x="348" y="76" text-anchor="middle">5</text>
  <circle class="d-box" cx="444" cy="70" r="28"/>
  <text class="d-text" x="444" y="76" text-anchor="middle">8</text>
  <text class="d-sub" x="252" y="124" text-anchor="middle">popped first: 3x1x5 = 15</text>
  <path class="d-edge" d="M 300 136 L 300 170" marker-end="url(#b30q2-arrow)"/>
  <text class="d-sub" x="20" y="196">after</text>
  <circle class="d-box-accent" cx="204" cy="220" r="28"/>
  <text class="d-text" x="204" y="226" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="300" cy="220" r="28"/>
  <text class="d-text" x="300" y="226" text-anchor="middle">5</text>
  <circle class="d-box" cx="396" cy="220" r="28"/>
  <text class="d-text" x="396" y="226" text-anchor="middle">8</text>
  <path class="d-edge-accent" d="M 232 220 L 272 220"/>
  <text class="d-sub" x="252" y="274" text-anchor="middle">3 and 5 now touch</text>
</svg>

After the pop, 3 and 5 are next to each other. When we later pop 3, its prize depends on 5 — a balloon from the *other* side. The left side and the right side are tangled together, so "best answer for the left" plus "best answer for the right" is not the best answer overall. Example 2 runs exactly this broken recurrence: on \`[3, 1, 5, 8]\` it reports **98** instead of **167**, and on \`[2, 4, 3]\` it even reports **44**, more than the true best of **33** — it counts pops that cannot happen.

📌 **Interview term: Independent subproblems** — two sub-problems are independent when solving one cannot change the answer of the other. DP only works when the split produces independent pieces.

📌 **Interview term: Optimal substructure** — the best answer to the whole problem is built from the best answers to its sub-problems. "Pop first" breaks it; "pop last" restores it.

## 5. The Key Insight: Choose the Balloon Popped Last

Look at a stretch of balloons between two walls i and j (the walls are not popped in this stretch). Ask: **which balloon k is popped last in this stretch?**

- While the other balloons are being popped, k is still standing. So k acts as a wall between the left part (i, k) and the right part (k, j). Nothing on the left ever sees anything on the right — the two parts are **independent**.
- When k is finally popped, every other balloon between i and j is gone, so its neighbours are exactly the walls i and j. Its prize is fixed: \`a[i] × a[k] × a[j]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Interval from wall i to wall j. Balloon k is burst last. The left part between i and k and the right part between k and j are solved separately, then k pays a i times a k times a j">
  <defs>
    <marker id="b30q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="50" width="70" height="56" rx="8"/>
  <text class="d-text" x="65" y="83" text-anchor="middle">wall i</text>
  <rect class="d-box-muted" x="130" y="50" width="140" height="56" rx="8"/>
  <text class="d-text" x="200" y="75" text-anchor="middle">left part</text>
  <text class="d-sub" x="200" y="95" text-anchor="middle">dp[i][k]</text>
  <rect class="d-box-accent" x="300" y="50" width="70" height="56" rx="8"/>
  <text class="d-text" x="335" y="83" text-anchor="middle">k</text>
  <rect class="d-box-muted" x="400" y="50" width="140" height="56" rx="8"/>
  <text class="d-text" x="470" y="75" text-anchor="middle">right part</text>
  <text class="d-sub" x="470" y="95" text-anchor="middle">dp[k][j]</text>
  <rect class="d-box" x="570" y="50" width="60" height="56" rx="8"/>
  <text class="d-text" x="600" y="83" text-anchor="middle">wall j</text>
  <text class="d-sub" x="335" y="30" text-anchor="middle">burst last</text>
  <path class="d-edge" d="M 335 110 L 335 166" marker-end="url(#b30q2-arrow2)"/>
  <rect class="d-box-accent" x="170" y="172" width="330" height="56" rx="10"/>
  <text class="d-text" x="335" y="197" text-anchor="middle">k pays a[i] x a[k] x a[j]</text>
  <text class="d-sub" x="335" y="217" text-anchor="middle">neighbours are the walls</text>
</svg>

So the best total for the stretch is the best over every choice of k of: best for the left part + best for the right part + \`a[i] × a[k] × a[j]\`.

📌 **Interview term: Interval DP** — dynamic programming whose state is a range (i, j) of the input, and whose transition tries every split point k inside the range. Matrix-chain multiplication and [longest palindromic substring](/interview-question/how-do-you-find-the-longest-palindromic-substring) are other members of the family.

📌 **Interview term: Open interval (i, j)** — the balloons strictly between i and j, not including i and j themselves. Using open intervals means the walls are always known, and an interval with j − i < 2 is empty and worth 0.

So the answer to the title question: the DP is over **intervals** because an interval with fixed walls is a self-contained problem, and it picks the **last** balloon because that is the only choice that keeps the walls fixed and the two halves apart. A DP over "which balloons are left" would need a state per subset — 2ⁿ states, which is [bitmask DP](/interview-question/what-is-bitmask-dynamic-programming) territory and far too many here.

## 6. The Recurrence and the Fill Order

📌 **Interview term: DP state** — \`dp[i][j]\` = the most coins you can collect by popping every balloon strictly between i and j, with i and j still standing.

📌 **Interview term: Transition (recurrence)** — \`dp[i][j] = max over i < k < j of dp[i][k] + a[i] × a[k] × a[j] + dp[k][j]\`, with \`dp[i][j] = 0\` when j − i < 2. The answer is \`dp[0][n + 1]\`.

Every interval reads only **shorter** intervals, so fill the table by gap = j − i, from 2 up to n + 1. (Filling row by row from the top would read cells that are not computed yet.)

📌 **Interview term: Fill order** — the order in which a bottom-up DP computes its cells so every cell it reads is already final. For interval DP it is "by interval length, shortest first".

Here is how the best plan for \`[3, 1, 5, 8]\` decomposes. Each box is one interval and the balloon it pops last:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 400" role="img" aria-label="The best plan for 3, 1, 5, 8. Interval 0 to 5 bursts 8 last. Inside it, interval 0 to 4 bursts 3 last, interval 1 to 4 bursts 5 last, interval 1 to 3 bursts 1 last">
  <defs>
    <marker id="b30q2-arrow3" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="170" y="20" width="260" height="56" rx="8"/>
  <text class="d-text" x="300" y="44" text-anchor="middle">(0, 5): last is 8</text>
  <text class="d-sub" x="300" y="65" text-anchor="middle">1 x 8 x 1 = 8</text>
  <path class="d-edge" d="M 300 78 L 300 112" marker-end="url(#b30q2-arrow3)"/>
  <rect class="d-box-accent" x="170" y="116" width="260" height="56" rx="8"/>
  <text class="d-text" x="300" y="140" text-anchor="middle">(0, 4): last is 3</text>
  <text class="d-sub" x="300" y="161" text-anchor="middle">1 x 3 x 8 = 24</text>
  <path class="d-edge" d="M 300 174 L 300 208" marker-end="url(#b30q2-arrow3)"/>
  <rect class="d-box-accent" x="170" y="212" width="260" height="56" rx="8"/>
  <text class="d-text" x="300" y="236" text-anchor="middle">(1, 4): last is 5</text>
  <text class="d-sub" x="300" y="257" text-anchor="middle">3 x 5 x 8 = 120</text>
  <path class="d-edge" d="M 300 270 L 300 304" marker-end="url(#b30q2-arrow3)"/>
  <rect class="d-box-accent" x="170" y="308" width="260" height="56" rx="8"/>
  <text class="d-text" x="300" y="332" text-anchor="middle">(1, 3): last is 1</text>
  <text class="d-sub" x="300" y="353" text-anchor="middle">3 x 1 x 5 = 15</text>
  <text class="d-sub" x="500" y="48" text-anchor="middle">total 167</text>
</svg>

Read from the bottom up: pop 1 first (between 3 and 5: 15), then 5 (between 3 and 8: 120), then 3 (between the wall and 8: 24), then 8 (between the two walls: 8). That is 15 + 120 + 24 + 8 = 167, the line \`coins per burst: 15 + 120 + 24 + 8 = 167\` in example 1.

## 7. From Brute Force to the Optimal Approach

**Brute force.** Try every order of pops: n! orders, O(n · n!) time. Example 2 counts 109,601 recursive calls for just 8 balloons.

**Pop-first DP.** Fast, but wrong — the two sides interact (section 4).

**Memoized "pop-last" recursion (top-down).** \`best(i, j)\` tries every k and caches the result: O(n²) states × O(n) choices = O(n³). Easy to write in an interview, and correct.

**Bottom-up "pop-last" table (the answer to give).** The same recurrence filled by interval length. O(n³) time, O(n²) memory, no recursion. For 8 balloons example 2 shows **120** inner steps against 109,601 brute-force calls.

📌 **Interview term: Memoization (top-down)** — a recursive solution that stores each sub-answer the first time it is computed and reuses it. Same complexity as the bottom-up table; the order of work is decided by the recursion instead of loops.

## 8. The Code in Python

The full solution, including the table of choices used to rebuild the order:

~~~python
def max_coins(nums):
    a = [1] + nums + [1]                 # padding: the walls count as balloons worth 1
    n = len(a)
    dp = [[0] * n for _ in range(n)]     # dp[i][j]: best coins from bursting everything strictly between i and j
    last = [[-1] * n for _ in range(n)]  # last[i][j]: the balloon burst LAST inside (i, j)
    for gap in range(2, n):              # shorter intervals first
        for i in range(0, n - gap):
            j = i + gap
            for k in range(i + 1, j):    # k is the last balloon left between i and j
                coins = dp[i][k] + a[i] * a[k] * a[j] + dp[k][j]
                if coins > dp[i][j]:
                    dp[i][j] = coins
                    last[i][j] = k
    return dp[0][n - 1], a, last, dp
~~~

**What to point out in this code:**

- \`a = [1] + nums + [1]\` builds a new padded list; the input is not modified.
- \`[[0] * n for _ in range(n)]\` creates n separate rows. \`[[0] * n] * n\` would create one row referenced n times, so writing \`dp[0][3]\` would also change \`dp[1][3]\`, \`dp[2][3]\`… — a silent, classic bug.
- The loops run \`gap\` from 2 to n − 1, then \`i\`, then \`k\`: every \`dp[i][k]\` and \`dp[k][j]\` read has a smaller gap, so it is already final.
- \`last[i][j]\` remembers the best k. \`burst_order\` rebuilds the pops recursively: left part, right part, then k — because k is popped last.
- The update uses a strict \`>\`, so among equal totals the smallest k wins. That is why all four languages print the same order for \`[2, 2, 2]\`.
- Python \`int\` never overflows, so large values are safe. A top-down version is three lines with \`functools.lru_cache(maxsize=None)\`; its recursion depth is only about n, but each state is a Python function call, which is slower than the plain loops.
- For n = 300 the inner loop runs C(302, 3) = 4,545,100 times. That works, but it is the kind of input where pure Python is noticeably slower than Java or C++, so keep the inner loop body minimal (local variables, no function calls).

## 9. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — the pop-last DP with the order of pops** prints:

~~~text
[3, 1, 5, 8] -> 167
  burst values in order: [1, 5, 3, 8]
  coins per burst: 15 + 120 + 24 + 8 = 167
[1, 5] -> 10
  burst values in order: [1, 5]
  coins per burst: 5 + 5 = 10
[7] -> 7
  burst values in order: [7]
  coins per burst: 7 = 7
[] -> 0
[2, 2, 2] -> 14
  burst values in order: [2, 2, 2]
  coins per burst: 8 + 4 + 2 = 14
[9, 76, 64, 21] -> 116718
  burst values in order: [64, 76, 9, 21]
  coins per burst: 102144 + 14364 + 189 + 21 = 116718
dp table for padded [1, 3, 1, 5, 8, 1] (row i, column j):
     0    0    3   30  159  167
     0    0    0   15  135  159
     0    0    0    0   40   48
     0    0    0    0    0   40
     0    0    0    0    0    0
     0    0    0    0    0    0
167
~~~

The replay at the end of each block pops the balloons in the printed order on a fresh row and adds up the real prizes; it matches the DP value every time, so the order is genuinely achievable. In the table, row i and column j hold \`dp[i][j]\`; the top-right cell \`dp[0][5] = 167\` is the answer, and every cell with j − i < 2 is 0.

**Example 2 — brute force vs the broken pop-first split vs the pop-last DP** prints:

~~~text
input | brute force | first-burst split (wrong) | last-burst dp
[3, 1, 5, 8] | 167 | 98 | 167
[1, 5] | 10 | 10 | 10
[2, 4, 3] | 33 | 44 | 33
[5, 1, 1, 5] | 60 | 20 | 60
[8, 2, 6, 3, 9] | 771 | 337 | 771
n = 4 [1, 6, 4, 2]: brute 72 in 65 calls, dp 72 in 20 steps
n = 6 [1, 6, 4, 2, 7, 5]: brute 476 in 1957 calls, dp 476 in 56 steps
n = 8 [1, 6, 4, 2, 7, 5, 3, 1]: brute 560 in 109601 calls, dp 560 in 120 steps
~~~

The pop-first split is wrong in both directions (98 instead of 167, but 44 instead of 33), while the pop-last DP matches the brute force on every input. The work column shows n! growth for the brute force against C(n + 2, 3) for the DP.

## 10. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Try every order | O(n · n!) | O(n²) | n! orders, each costing O(n) list work |
| Pop-first DP | O(n³) | O(n²) | fast, but gives wrong answers |
| Pop-last DP (memo or table) | O(n³) | O(n²) | about n² / 2 intervals, each trying up to n split points |

The exact number of inner steps is the number of triples i < k < j among the n + 2 padded positions: C(n + 2, 3). For n = 4, 6 and 8 that is 20, 56 and 120 — the numbers example 2 printed.

## 11. Edge Cases

- **No balloons.** The padded array is \`[1, 1]\`, there is no k with 0 < k < 1, and the answer is 0.
- **One balloon.** Its neighbours are both walls: \`[7]\` gives 1 × 7 × 1 = 7.
- **Two balloons.** \`[1, 5]\` gives 10: pop the 1 first (1 × 1 × 5 = 5) then the 5 (1 × 5 × 1 = 5). Popping 5 first would give only 5 + 1 = 6.
- **Zeros.** A 0 balloon earns 0 and makes its neighbours earn 0 while it stands; the recurrence handles it without any special case.
- **Equal values.** \`[2, 2, 2]\` has many orders with the same total (14); the code keeps the first k that reaches the maximum, so the printed order is one of several optimal ones.
- **Large values.** The table holds sums of products; size the integer type for the worst case (see the language notes).

## Common Pitfalls

- **Picking the balloon popped first.** The sides interact; the answer is wrong (example 2: 98 instead of 167).
- **\`[[0] * n] * n\`.** All rows are the same list; the table corrupts itself.
- **Wrong fill order.** Looping \`i\` from 0 upward and \`j\` from \`i + 2\` upward reads \`dp[k][j]\` for k > i before it is computed. Loop by gap, or loop \`i\` downward.
- **Forgetting the padding.** Without the two 1s every access to \`a[i]\` or \`a[j]\` at the ends needs bounds checks, and off-by-one errors creep in.
- **Using closed intervals by accident.** If \`dp[i][j]\` includes i and j themselves, the walls are no longer fixed and the "neighbours are i and j" argument breaks.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The trap:</strong> <span style="color:#f0e2c8;">Choosing the balloon popped first makes its two neighbours touch, so the left and right sides stop being independent — that DP is wrong.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The insight:</strong> <span style="color:#f0e2c8;">Choose the balloon <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> popped <strong style="color:#ffca28;">last</strong> in the open interval (i, j). Until then it walls off the two sides; when it pops, its neighbours are exactly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[j]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Recurrence:</strong> <span style="color:#f0e2c8;">Pad with 1s. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j] = max(dp[i][k] + a[i] * a[k] * a[j] + dp[k][j])</code> over i &lt; k &lt; j; empty intervals are 0; answer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0][n + 1]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Order and cost:</strong> <span style="color:#f0e2c8;">Fill by interval length, shortest first. O(n³) time, O(n²) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Build rows with a comprehension, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[0] * n] * n</code>; Python ints cannot overflow; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lru_cache</code> gives a short top-down version.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why exactly does choosing the last balloon work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">While the other balloons pop, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> is still there, so nothing on its left ever neighbours anything on its right. When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> finally pops, everything between i and j is gone, so its prize is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i] * a[k] * a[j]</code> — fixed and known.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you pad the array with 1s?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A missing neighbour counts as 1, so two permanent 1-valued walls make the boundary case identical to the normal case and remove every bounds check.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you recover the order of pops?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">last[i][j] = k</code> for the best k. The order is: order of (i, k), then order of (k, j), then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>. Replaying it on the real row gives the same total (example 1 checks this).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you write it top-down?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best(i, j)</code> returns 0 if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j - i &lt; 2</code>, else the max over k, decorated with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@lru_cache(maxsize=None)</code>. Same O(n³), recursion depth about n, but more call overhead in Python.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which other problems use this pattern?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Any problem where a choice inside a range splits it into two independent ranges: matrix-chain multiplication, minimum cost to cut a stick, optimal binary search trees, and palindrome-partition problems.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Sentinel (padding)** | Extra values at the ends of an array so boundary cases behave like normal ones |
| **Independent subproblems** | Sub-problems whose answers cannot affect each other; required for a DP split |
| **Optimal substructure** | The best overall answer is built from the best answers to sub-problems |
| **Interval DP** | DP whose state is a range (i, j) and whose transition tries every split point k inside it |
| **Open interval (i, j)** | The positions strictly between i and j; i and j act as fixed walls |
| **DP state** | dp[i][j] = most coins from popping everything strictly between i and j |
| **Transition (recurrence)** | dp[i][j] = max over k of dp[i][k] + a[i]·a[k]·a[j] + dp[k][j] |
| **Fill order** | The order cells are computed so every cell read is already final: shortest intervals first |
| **Memoization (top-down)** | Recursion that caches each sub-answer the first time it is computed |
| **List comprehension table** | [[0] * n for _ in range(n)] — n separate rows, unlike [[0] * n] * n |

---
**Conclusion:** Burst Balloons looks like an ordering problem, but the winning question is not "what do I pop first?" — it is "what do I pop **last** between these two walls?". The last balloon keeps the two sides apart and has fixed neighbours, which turns the problem into a clean interval DP: \`dp[i][j] = max(dp[i][k] + a[i] * a[k] * a[j] + dp[k][j])\`, filled shortest interval first, O(n³) time and O(n²) memory. In Python, build the table with a comprehension and the padding with \`[1] + nums + [1]\`. The same split-at-k thinking powers [longest palindromic substring](/interview-question/how-do-you-find-the-longest-palindromic-substring), and the contrast with a subset-based state is explained in [bitmask dynamic programming](/interview-question/what-is-bitmask-dynamic-programming).`,
        examples: [
          {
            label: "Pop-last interval DP with the order of pops and the dp table",
            code: `def max_coins(nums):
    a = [1] + nums + [1]                 # padding: the walls count as balloons worth 1
    n = len(a)
    dp = [[0] * n for _ in range(n)]     # dp[i][j]: best coins from bursting everything strictly between i and j
    last = [[-1] * n for _ in range(n)]  # last[i][j]: the balloon burst LAST inside (i, j)
    for gap in range(2, n):              # shorter intervals first
        for i in range(0, n - gap):
            j = i + gap
            for k in range(i + 1, j):    # k is the last balloon left between i and j
                coins = dp[i][k] + a[i] * a[k] * a[j] + dp[k][j]
                if coins > dp[i][j]:
                    dp[i][j] = coins
                    last[i][j] = k
    return dp[0][n - 1], a, last, dp


def burst_order(last, i, j, out):
    if j - i < 2:
        return
    k = last[i][j]
    burst_order(last, i, k, out)         # empty the left side first
    burst_order(last, k, j, out)         # then the right side
    out.append(k)                        # k goes last, between the walls i and j


def replay(a, order):
    alive = list(range(len(a)))          # indexes still on the table (walls included)
    gains = []
    for k in order:
        p = alive.index(k)
        gains.append(a[alive[p - 1]] * a[k] * a[alive[p + 1]])
        alive.pop(p)
    return gains


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


for nums in ([3, 1, 5, 8], [1, 5], [7], [], [2, 2, 2], [9, 76, 64, 21]):
    best, a, last, dp = max_coins(nums)
    order = []
    burst_order(last, 0, len(a) - 1, order)
    gains = replay(a, order)
    print(fmt(nums) + " -> " + str(best))
    if order:
        print("  burst values in order: " + fmt([a[k] for k in order]))
        print("  coins per burst: " + " + ".join(str(g) for g in gains) + " = " + str(sum(gains)))

best, a, last, dp = max_coins([3, 1, 5, 8])
print("dp table for padded [1, 3, 1, 5, 8, 1] (row i, column j):")
for i in range(len(a)):
    print("  " + " ".join(str(dp[i][j]).rjust(4) for j in range(len(a))))

print(max_coins([3, 1, 5, 8])[0])  # 167`,
          },
          {
            label: "Brute force vs broken pop-first split vs pop-last DP",
            code: `def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


brute_calls = 0


def brute(row):
    """Try every order: burst each balloon still on the row first, recurse on the rest."""
    global brute_calls
    brute_calls += 1
    best = 0
    for p in range(len(row)):
        left = row[p - 1] if p > 0 else 1
        right = row[p + 1] if p + 1 < len(row) else 1
        best = max(best, left * row[p] * right + brute(row[:p] + row[p + 1:]))
    return best


def first_burst_split(nums):
    """WRONG: choose the balloon burst FIRST and treat the two sides as independent."""
    a = [1] + nums + [1]
    n = len(a)
    dp = [[0] * n for _ in range(n)]
    for gap in range(2, n):
        for i in range(0, n - gap):
            j = i + gap
            for k in range(i + 1, j):
                # neighbours of k at the moment it bursts first are k-1 and k+1, but the
                # two halves then still lean on k as a wall, and k is already gone
                coins = dp[i][k] + a[k - 1] * a[k] * a[k + 1] + dp[k][j]
                dp[i][j] = max(dp[i][j], coins)
    return dp[0][n - 1]


dp_steps = 0


def last_burst_dp(nums):
    """RIGHT: choose the balloon burst LAST; its neighbours are then the fixed walls i and j."""
    global dp_steps
    a = [1] + nums + [1]
    n = len(a)
    dp = [[0] * n for _ in range(n)]
    for gap in range(2, n):
        for i in range(0, n - gap):
            j = i + gap
            for k in range(i + 1, j):
                dp_steps += 1
                dp[i][j] = max(dp[i][j], dp[i][k] + a[i] * a[k] * a[j] + dp[k][j])
    return dp[0][n - 1]


print("input | brute force | first-burst split (wrong) | last-burst dp")
for nums in ([3, 1, 5, 8], [1, 5], [2, 4, 3], [5, 1, 1, 5], [8, 2, 6, 3, 9]):
    print(fmt(nums) + " | " + str(brute(nums)) + " | " + str(first_burst_split(nums)) + " | " + str(last_burst_dp(nums)))

for n in (4, 6, 8):
    nums = [(i * 5) % 7 + 1 for i in range(n)]
    brute_calls = 0
    dp_steps = 0
    b = brute(nums)
    d = last_burst_dp(nums)
    print("n = " + str(n) + " " + fmt(nums) + ": brute " + str(b) + " in " + str(brute_calls)
          + " calls, dp " + str(d) + " in " + str(dp_steps) + " steps")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You have n balloons in a row, each with a number. Bursting balloon i earns left × nums[i] × right, where left and right are its current neighbours (a missing neighbour counts as 1). Find the maximum coins. Code it in JavaScript, and explain why the DP is over intervals and why you choose the balloon burst last rather than first."

**What a strong answer should cover:**
- Why "choose the first balloon" fails: its neighbours become adjacent, so the two sides are not independent sub-problems.
- The insight: choose the balloon k burst **last** in the open interval (i, j); it separates the two sides, and its neighbours are fixed as a[i] and a[j].
- Padding with 1s, the state \`dp[i][j]\`, the recurrence \`max(dp[i][k] + a[i]·a[k]·a[j] + dp[k][j])\`, and filling by interval length.
- O(n³) time and O(n²) space versus O(n · n!) for trying every order.
- JavaScript details: build the 2-D table with \`Array.from({ length: n }, () => new Array(n).fill(0))\` (never \`new Array(n).fill([])\`), pad with \`[1, ...nums, 1]\`, and note that numbers are doubles, exact up to 2⁵³ − 1.

**Clarifying questions expected:**
- What does a missing neighbour count as, and how large are n and the values?
- Do you need the burst order, or only the maximum?

**Code / implementation expected:** Yes — \`maxCoins(nums)\` in JavaScript with a padded array and an O(n³) interval table.`,
        answer: `**Target Audience:** Interview candidates who have seen basic dynamic programming (a 1-D table) and want to learn interval DP — every new idea is explained  
**Difficulty:** Hard  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a row of balloons at a fair: 3, 1, 5, 8. Pop one and you win prize points equal to *its number times the numbers of the two balloons right next to it at that moment*. If a side has no balloon, that side counts as 1. Pop all of them; what order wins the most points?

The catch is the words "at that moment". Every pop changes who is next to whom. Pop the 1 first and the 3 and 5 suddenly become neighbours. Pop the 5 first instead and the 1 and 8 become neighbours. The value of every later pop depends on everything you did before it.

Trying every order is hopeless: 4 balloons have 4! = 24 orders, but 12 balloons already have 479,001,600. And the obvious dynamic programming idea — "pick the balloon to pop **first**, then solve the two sides" — gives wrong answers, because the two sides do not stay separate.

The fix is one of the most elegant ideas in interview DP: pick the balloon to pop **last**. This page shows why that single change makes the two sides truly independent, which is the property every [dynamic programming](/interview-question/what-is-dynamic-programming) solution needs.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What does a missing neighbour count as? | The standard version says 1. That is why we pad the array with a 1 on each end, which removes every boundary \`if\`. |
| How many balloons, and how big are the numbers? | The DP is O(n³). With n around 300–500 that is tens of millions of simple steps — fine. With n = 10⁵ it is not. |
| Can a balloon be 0? | Zeros are allowed and need no special case; they just earn 0 for anyone next to them. |
| Do you want the order of pops, or only the maximum? | The maximum needs the table. The order needs one extra table remembering which balloon was last in each interval (example 1 prints it). |
| Can the total overflow? | Each pop is a product of three numbers. With values ≤ 100 one pop is at most 10⁶, so even 500 pops fit easily in a 32-bit int; with larger values you need 64-bit. |

## 3. The Setup: Pad the Ends With 1

First, a small trick that makes everything cleaner. Add an imaginary balloon worth 1 at each end. These two are never popped; they are walls. Now "a missing neighbour counts as 1" is automatic, and the real balloons sit at indexes 1 to n.

📌 **Interview term: Sentinel (padding)** — an extra value placed at the ends of an array so that boundary cases behave like normal cases. Here the two 1s remove every "is there a left neighbour?" check.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 180" role="img" aria-label="Balloons 3, 1, 5, 8 with an imaginary balloon worth 1 added at each end as a wall. Indexes 0 to 5">
  <text class="d-sub" x="60" y="30" text-anchor="middle">wall</text>
  <text class="d-sub" x="540" y="30" text-anchor="middle">wall</text>
  <rect class="d-box-muted" x="30" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="60" y="86" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="156" cy="80" r="30"/>
  <text class="d-text" x="156" y="86" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="252" cy="80" r="30"/>
  <text class="d-text" x="252" y="86" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="348" cy="80" r="30"/>
  <text class="d-text" x="348" y="86" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="444" cy="80" r="30"/>
  <text class="d-text" x="444" y="86" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="510" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="540" y="86" text-anchor="middle">1</text>
  <text class="d-sub" x="60" y="150" text-anchor="middle">index 0</text>
  <text class="d-sub" x="156" y="150" text-anchor="middle">1</text>
  <text class="d-sub" x="252" y="150" text-anchor="middle">2</text>
  <text class="d-sub" x="348" y="150" text-anchor="middle">3</text>
  <text class="d-sub" x="444" y="150" text-anchor="middle">4</text>
  <text class="d-sub" x="540" y="150" text-anchor="middle">5</text>
</svg>

## 4. Why "Which Balloon First?" Fails

A good DP splits a problem into smaller problems that **do not affect each other**. Suppose we pop balloon 1 (the one worth 1) first and then try to solve "the balloons to its left" and "the balloons to its right" separately.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 290" role="img" aria-label="Bursting the balloon 1 first makes balloons 3 and 5 neighbours, so the left side and the right side are no longer separate problems">
  <defs>
    <marker id="b30q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="30">before</text>
  <circle class="d-box" cx="156" cy="70" r="28"/>
  <text class="d-text" x="156" y="76" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="252" cy="70" r="28"/>
  <text class="d-text" x="252" y="76" text-anchor="middle">1</text>
  <circle class="d-box" cx="348" cy="70" r="28"/>
  <text class="d-text" x="348" y="76" text-anchor="middle">5</text>
  <circle class="d-box" cx="444" cy="70" r="28"/>
  <text class="d-text" x="444" y="76" text-anchor="middle">8</text>
  <text class="d-sub" x="252" y="124" text-anchor="middle">popped first: 3x1x5 = 15</text>
  <path class="d-edge" d="M 300 136 L 300 170" marker-end="url(#b30q2-arrow)"/>
  <text class="d-sub" x="20" y="196">after</text>
  <circle class="d-box-accent" cx="204" cy="220" r="28"/>
  <text class="d-text" x="204" y="226" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="300" cy="220" r="28"/>
  <text class="d-text" x="300" y="226" text-anchor="middle">5</text>
  <circle class="d-box" cx="396" cy="220" r="28"/>
  <text class="d-text" x="396" y="226" text-anchor="middle">8</text>
  <path class="d-edge-accent" d="M 232 220 L 272 220"/>
  <text class="d-sub" x="252" y="274" text-anchor="middle">3 and 5 now touch</text>
</svg>

After the pop, 3 and 5 are next to each other. When we later pop 3, its prize depends on 5 — a balloon from the *other* side. The left side and the right side are tangled together, so "best answer for the left" plus "best answer for the right" is not the best answer overall. Example 2 runs exactly this broken recurrence: on \`[3, 1, 5, 8]\` it reports **98** instead of **167**, and on \`[2, 4, 3]\` it even reports **44**, more than the true best of **33** — it counts pops that cannot happen.

📌 **Interview term: Independent subproblems** — two sub-problems are independent when solving one cannot change the answer of the other. DP only works when the split produces independent pieces.

📌 **Interview term: Optimal substructure** — the best answer to the whole problem is built from the best answers to its sub-problems. "Pop first" breaks it; "pop last" restores it.

## 5. The Key Insight: Choose the Balloon Popped Last

Look at a stretch of balloons between two walls i and j (the walls are not popped in this stretch). Ask: **which balloon k is popped last in this stretch?**

- While the other balloons are being popped, k is still standing. So k acts as a wall between the left part (i, k) and the right part (k, j). Nothing on the left ever sees anything on the right — the two parts are **independent**.
- When k is finally popped, every other balloon between i and j is gone, so its neighbours are exactly the walls i and j. Its prize is fixed: \`a[i] × a[k] × a[j]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Interval from wall i to wall j. Balloon k is burst last. The left part between i and k and the right part between k and j are solved separately, then k pays a i times a k times a j">
  <defs>
    <marker id="b30q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="50" width="70" height="56" rx="8"/>
  <text class="d-text" x="65" y="83" text-anchor="middle">wall i</text>
  <rect class="d-box-muted" x="130" y="50" width="140" height="56" rx="8"/>
  <text class="d-text" x="200" y="75" text-anchor="middle">left part</text>
  <text class="d-sub" x="200" y="95" text-anchor="middle">dp[i][k]</text>
  <rect class="d-box-accent" x="300" y="50" width="70" height="56" rx="8"/>
  <text class="d-text" x="335" y="83" text-anchor="middle">k</text>
  <rect class="d-box-muted" x="400" y="50" width="140" height="56" rx="8"/>
  <text class="d-text" x="470" y="75" text-anchor="middle">right part</text>
  <text class="d-sub" x="470" y="95" text-anchor="middle">dp[k][j]</text>
  <rect class="d-box" x="570" y="50" width="60" height="56" rx="8"/>
  <text class="d-text" x="600" y="83" text-anchor="middle">wall j</text>
  <text class="d-sub" x="335" y="30" text-anchor="middle">burst last</text>
  <path class="d-edge" d="M 335 110 L 335 166" marker-end="url(#b30q2-arrow2)"/>
  <rect class="d-box-accent" x="170" y="172" width="330" height="56" rx="10"/>
  <text class="d-text" x="335" y="197" text-anchor="middle">k pays a[i] x a[k] x a[j]</text>
  <text class="d-sub" x="335" y="217" text-anchor="middle">neighbours are the walls</text>
</svg>

So the best total for the stretch is the best over every choice of k of: best for the left part + best for the right part + \`a[i] × a[k] × a[j]\`.

📌 **Interview term: Interval DP** — dynamic programming whose state is a range (i, j) of the input, and whose transition tries every split point k inside the range. Matrix-chain multiplication and [longest palindromic substring](/interview-question/how-do-you-find-the-longest-palindromic-substring) are other members of the family.

📌 **Interview term: Open interval (i, j)** — the balloons strictly between i and j, not including i and j themselves. Using open intervals means the walls are always known, and an interval with j − i < 2 is empty and worth 0.

So the answer to the title question: the DP is over **intervals** because an interval with fixed walls is a self-contained problem, and it picks the **last** balloon because that is the only choice that keeps the walls fixed and the two halves apart. A DP over "which balloons are left" would need a state per subset — 2ⁿ states, which is [bitmask DP](/interview-question/what-is-bitmask-dynamic-programming) territory and far too many here.

## 6. The Recurrence and the Fill Order

📌 **Interview term: DP state** — \`dp[i][j]\` = the most coins you can collect by popping every balloon strictly between i and j, with i and j still standing.

📌 **Interview term: Transition (recurrence)** — \`dp[i][j] = max over i < k < j of dp[i][k] + a[i] × a[k] × a[j] + dp[k][j]\`, with \`dp[i][j] = 0\` when j − i < 2. The answer is \`dp[0][n + 1]\`.

Every interval reads only **shorter** intervals, so fill the table by gap = j − i, from 2 up to n + 1. (Filling row by row from the top would read cells that are not computed yet.)

📌 **Interview term: Fill order** — the order in which a bottom-up DP computes its cells so every cell it reads is already final. For interval DP it is "by interval length, shortest first".

Here is how the best plan for \`[3, 1, 5, 8]\` decomposes. Each box is one interval and the balloon it pops last:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 400" role="img" aria-label="The best plan for 3, 1, 5, 8. Interval 0 to 5 bursts 8 last. Inside it, interval 0 to 4 bursts 3 last, interval 1 to 4 bursts 5 last, interval 1 to 3 bursts 1 last">
  <defs>
    <marker id="b30q2-arrow3" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="170" y="20" width="260" height="56" rx="8"/>
  <text class="d-text" x="300" y="44" text-anchor="middle">(0, 5): last is 8</text>
  <text class="d-sub" x="300" y="65" text-anchor="middle">1 x 8 x 1 = 8</text>
  <path class="d-edge" d="M 300 78 L 300 112" marker-end="url(#b30q2-arrow3)"/>
  <rect class="d-box-accent" x="170" y="116" width="260" height="56" rx="8"/>
  <text class="d-text" x="300" y="140" text-anchor="middle">(0, 4): last is 3</text>
  <text class="d-sub" x="300" y="161" text-anchor="middle">1 x 3 x 8 = 24</text>
  <path class="d-edge" d="M 300 174 L 300 208" marker-end="url(#b30q2-arrow3)"/>
  <rect class="d-box-accent" x="170" y="212" width="260" height="56" rx="8"/>
  <text class="d-text" x="300" y="236" text-anchor="middle">(1, 4): last is 5</text>
  <text class="d-sub" x="300" y="257" text-anchor="middle">3 x 5 x 8 = 120</text>
  <path class="d-edge" d="M 300 270 L 300 304" marker-end="url(#b30q2-arrow3)"/>
  <rect class="d-box-accent" x="170" y="308" width="260" height="56" rx="8"/>
  <text class="d-text" x="300" y="332" text-anchor="middle">(1, 3): last is 1</text>
  <text class="d-sub" x="300" y="353" text-anchor="middle">3 x 1 x 5 = 15</text>
  <text class="d-sub" x="500" y="48" text-anchor="middle">total 167</text>
</svg>

Read from the bottom up: pop 1 first (between 3 and 5: 15), then 5 (between 3 and 8: 120), then 3 (between the wall and 8: 24), then 8 (between the two walls: 8). That is 15 + 120 + 24 + 8 = 167, the line \`coins per burst: 15 + 120 + 24 + 8 = 167\` in example 1.

## 7. From Brute Force to the Optimal Approach

**Brute force.** Try every order of pops: n! orders, O(n · n!) time. Example 2 counts 109,601 recursive calls for just 8 balloons.

**Pop-first DP.** Fast, but wrong — the two sides interact (section 4).

**Memoized "pop-last" recursion (top-down).** \`best(i, j)\` tries every k and caches the result: O(n²) states × O(n) choices = O(n³). Easy to write in an interview, and correct.

**Bottom-up "pop-last" table (the answer to give).** The same recurrence filled by interval length. O(n³) time, O(n²) memory, no recursion. For 8 balloons example 2 shows **120** inner steps against 109,601 brute-force calls.

📌 **Interview term: Memoization (top-down)** — a recursive solution that stores each sub-answer the first time it is computed and reuses it. Same complexity as the bottom-up table; the order of work is decided by the recursion instead of loops.

## 8. The Code in JavaScript

The full solution, including the table of choices used to rebuild the order:

~~~javascript
function maxCoins(nums) {
  const a = [1, ...nums, 1];                 // padding: the walls count as balloons worth 1
  const n = a.length;
  // Array.from builds a NEW row each time; Array(n).fill([]) would share one row
  const dp = Array.from({ length: n }, () => new Array(n).fill(0));
  const last = Array.from({ length: n }, () => new Array(n).fill(-1));
  for (let gap = 2; gap < n; gap++) {        // shorter intervals first
    for (let i = 0; i + gap < n; i++) {
      const j = i + gap;
      for (let k = i + 1; k < j; k++) {      // k is the last balloon left between i and j
        const coins = dp[i][k] + a[i] * a[k] * a[j] + dp[k][j];
        if (coins > dp[i][j]) {
          dp[i][j] = coins;
          last[i][j] = k;
        }
      }
    }
  }
  return { best: dp[0][n - 1], a, last, dp };
}
~~~

**What to point out in this code:**

- \`[1, ...nums, 1]\` builds a new padded array with spread syntax; the input is not modified.
- \`Array.from({ length: n }, () => new Array(n).fill(0))\` calls the arrow function once per row, so each row is a new array. \`new Array(n).fill(new Array(n).fill(0))\` (or \`.fill([])\`) puts the **same** row object in every slot — in a quick test, pushing into one row of \`Array(3).fill([])\` made all three rows grow.
- The loops run \`gap\` from 2 up, then \`i\`, then \`k\`; every cell read has a smaller gap, so it is final.
- \`last[i][j]\` remembers the best k, and \`burstOrder\` rebuilds the pops: left part, right part, then k.
- JavaScript numbers are IEEE doubles, exact for integers up to \`Number.MAX_SAFE_INTEGER\` (2⁵³ − 1). Coin totals here are far below that, so plain numbers are fine; use \`BigInt\` only if values could be huge.
- The update uses a strict \`>\`, so among equal totals the smallest k wins, which keeps the printed order identical across languages.
- \`alive.splice(p, 1)\` in \`replay\` removes one element in place; \`indexOf\` finds the balloon's current position.

## 9. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\` (Node.js 22; the code is plain browser-safe JavaScript, so it also runs in the page). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — the pop-last DP with the order of pops** prints:

~~~text
[3, 1, 5, 8] -> 167
  burst values in order: [1, 5, 3, 8]
  coins per burst: 15 + 120 + 24 + 8 = 167
[1, 5] -> 10
  burst values in order: [1, 5]
  coins per burst: 5 + 5 = 10
[7] -> 7
  burst values in order: [7]
  coins per burst: 7 = 7
[] -> 0
[2, 2, 2] -> 14
  burst values in order: [2, 2, 2]
  coins per burst: 8 + 4 + 2 = 14
[9, 76, 64, 21] -> 116718
  burst values in order: [64, 76, 9, 21]
  coins per burst: 102144 + 14364 + 189 + 21 = 116718
dp table for padded [1, 3, 1, 5, 8, 1] (row i, column j):
     0    0    3   30  159  167
     0    0    0   15  135  159
     0    0    0    0   40   48
     0    0    0    0    0   40
     0    0    0    0    0    0
     0    0    0    0    0    0
167
~~~

The replay at the end of each block pops the balloons in the printed order on a fresh row and adds up the real prizes; it matches the DP value every time, so the order is genuinely achievable. In the table, row i and column j hold \`dp[i][j]\`; the top-right cell \`dp[0][5] = 167\` is the answer, and every cell with j − i < 2 is 0.

**Example 2 — brute force vs the broken pop-first split vs the pop-last DP** prints:

~~~text
input | brute force | first-burst split (wrong) | last-burst dp
[3, 1, 5, 8] | 167 | 98 | 167
[1, 5] | 10 | 10 | 10
[2, 4, 3] | 33 | 44 | 33
[5, 1, 1, 5] | 60 | 20 | 60
[8, 2, 6, 3, 9] | 771 | 337 | 771
n = 4 [1, 6, 4, 2]: brute 72 in 65 calls, dp 72 in 20 steps
n = 6 [1, 6, 4, 2, 7, 5]: brute 476 in 1957 calls, dp 476 in 56 steps
n = 8 [1, 6, 4, 2, 7, 5, 3, 1]: brute 560 in 109601 calls, dp 560 in 120 steps
~~~

The pop-first split is wrong in both directions (98 instead of 167, but 44 instead of 33), while the pop-last DP matches the brute force on every input. The work column shows n! growth for the brute force against C(n + 2, 3) for the DP.

## 10. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Try every order | O(n · n!) | O(n²) | n! orders, each costing O(n) list work |
| Pop-first DP | O(n³) | O(n²) | fast, but gives wrong answers |
| Pop-last DP (memo or table) | O(n³) | O(n²) | about n² / 2 intervals, each trying up to n split points |

The exact number of inner steps is the number of triples i < k < j among the n + 2 padded positions: C(n + 2, 3). For n = 4, 6 and 8 that is 20, 56 and 120 — the numbers example 2 printed.

## 11. Edge Cases

- **No balloons.** The padded array is \`[1, 1]\`, there is no k with 0 < k < 1, and the answer is 0.
- **One balloon.** Its neighbours are both walls: \`[7]\` gives 1 × 7 × 1 = 7.
- **Two balloons.** \`[1, 5]\` gives 10: pop the 1 first (1 × 1 × 5 = 5) then the 5 (1 × 5 × 1 = 5). Popping 5 first would give only 5 + 1 = 6.
- **Zeros.** A 0 balloon earns 0 and makes its neighbours earn 0 while it stands; the recurrence handles it without any special case.
- **Equal values.** \`[2, 2, 2]\` has many orders with the same total (14); the code keeps the first k that reaches the maximum, so the printed order is one of several optimal ones.
- **Large values.** The table holds sums of products; size the integer type for the worst case (see the language notes).

## Common Pitfalls

- **Picking the balloon popped first.** The sides interact; the answer is wrong (example 2: 98 instead of 167).
- **\`new Array(n).fill([])\`.** Every row is the same array; the table corrupts itself.
- **Wrong fill order.** Looping \`i\` upward and \`j\` upward reads \`dp[k][j]\` for k > i before it is computed. Loop by gap, or loop \`i\` downward.
- **Forgetting the padding.** Without the two 1s, \`a[-1]\` is \`undefined\` and \`undefined * 3\` is \`NaN\`, which then silently poisons every \`Math.max\`.
- **Using closed intervals by accident.** If \`dp[i][j]\` includes i and j, the walls are not fixed and the argument breaks.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The trap:</strong> <span style="color:#f0e2c8;">Choosing the balloon popped first makes its two neighbours touch, so the left and right sides stop being independent — that DP is wrong.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The insight:</strong> <span style="color:#f0e2c8;">Choose the balloon <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> popped <strong style="color:#ffca28;">last</strong> in the open interval (i, j). Until then it walls off the two sides; when it pops, its neighbours are exactly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[j]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Recurrence:</strong> <span style="color:#f0e2c8;">Pad with 1s. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j] = Math.max(dp[i][j], dp[i][k] + a[i] * a[k] * a[j] + dp[k][j])</code> over i &lt; k &lt; j; answer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0][n + 1]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Order and cost:</strong> <span style="color:#f0e2c8;">Fill by interval length, shortest first. O(n³) time, O(n²) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Rows via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from({ length: n }, () =&gt; new Array(n).fill(0))</code>, padding via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, ...nums, 1]</code>; numbers are exact up to 2⁵³ − 1.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why exactly does choosing the last balloon work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">While the other balloons pop, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> is still there, so nothing on its left ever neighbours anything on its right. When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> finally pops, everything between i and j is gone, so its prize is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i] * a[k] * a[j]</code> — fixed and known.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you pad the array with 1s?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A missing neighbour counts as 1, so two permanent walls make the boundary case identical to the normal one. Without them, reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[-1]</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> and the arithmetic becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you recover the order of pops?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">last[i][j] = k</code> for the best k. The order is: order of (i, k), then order of (k, j), then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>. Replaying it on the real row gives the same total (example 1 checks this).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you write it top-down?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: a recursive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best(i, j)</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> or 2-D array cache keyed by i and j. Same O(n³); the recursion depth is only about n, so the call stack is not a problem.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which other problems use this pattern?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Any problem where a choice inside a range splits it into two independent ranges: matrix-chain multiplication, minimum cost to cut a stick, optimal binary search trees, and palindrome-partition problems.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Sentinel (padding)** | Extra values at the ends of an array so boundary cases behave like normal ones |
| **Independent subproblems** | Sub-problems whose answers cannot affect each other; required for a DP split |
| **Optimal substructure** | The best overall answer is built from the best answers to sub-problems |
| **Interval DP** | DP whose state is a range (i, j) and whose transition tries every split point k inside it |
| **Open interval (i, j)** | The positions strictly between i and j; i and j act as fixed walls |
| **DP state** | dp[i][j] = most coins from popping everything strictly between i and j |
| **Transition (recurrence)** | dp[i][j] = max over k of dp[i][k] + a[i]·a[k]·a[j] + dp[k][j] |
| **Fill order** | The order cells are computed so every cell read is already final: shortest intervals first |
| **Memoization (top-down)** | Recursion that caches each sub-answer the first time it is computed |
| **Array.from table** | Array.from({ length: n }, () => new Array(n).fill(0)) — a new row per index |

---
**Conclusion:** Burst Balloons looks like an ordering problem, but the winning question is not "what do I pop first?" — it is "what do I pop **last** between these two walls?". The last balloon keeps the two sides apart and has fixed neighbours, which turns the problem into a clean interval DP: \`dp[i][j] = max(dp[i][k] + a[i] * a[k] * a[j] + dp[k][j])\`, filled shortest interval first, O(n³) time and O(n²) memory. In JavaScript, build rows with \`Array.from\` and pad with spread. The same split-at-k thinking powers [longest palindromic substring](/interview-question/how-do-you-find-the-longest-palindromic-substring), and the contrast with a subset-based state is explained in [bitmask dynamic programming](/interview-question/what-is-bitmask-dynamic-programming).`,
        examples: [
          {
            label: "Pop-last interval DP with the order of pops and the dp table",
            code: `function fmt(xs) {
  return "[" + xs.join(", ") + "]";
}

function maxCoins(nums) {
  const a = [1, ...nums, 1];                 // padding: the walls count as balloons worth 1
  const n = a.length;
  // Array.from builds a NEW row each time; Array(n).fill([]) would share one row
  const dp = Array.from({ length: n }, () => new Array(n).fill(0));
  const last = Array.from({ length: n }, () => new Array(n).fill(-1));
  for (let gap = 2; gap < n; gap++) {        // shorter intervals first
    for (let i = 0; i + gap < n; i++) {
      const j = i + gap;
      for (let k = i + 1; k < j; k++) {      // k is the last balloon left between i and j
        const coins = dp[i][k] + a[i] * a[k] * a[j] + dp[k][j];
        if (coins > dp[i][j]) {
          dp[i][j] = coins;
          last[i][j] = k;
        }
      }
    }
  }
  return { best: dp[0][n - 1], a, last, dp };
}

function burstOrder(last, i, j, out) {
  if (j - i < 2) return;
  const k = last[i][j];
  burstOrder(last, i, k, out);               // empty the left side first
  burstOrder(last, k, j, out);               // then the right side
  out.push(k);                               // k goes last, between the walls i and j
}

function replay(a, order) {
  const alive = a.map((_, i) => i);          // indexes still on the table (walls included)
  const gains = [];
  for (const k of order) {
    const p = alive.indexOf(k);
    gains.push(a[alive[p - 1]] * a[k] * a[alive[p + 1]]);
    alive.splice(p, 1);
  }
  return gains;
}

for (const nums of [[3, 1, 5, 8], [1, 5], [7], [], [2, 2, 2], [9, 76, 64, 21]]) {
  const { best, a, last } = maxCoins(nums);
  const order = [];
  burstOrder(last, 0, a.length - 1, order);
  const gains = replay(a, order);
  console.log(fmt(nums) + " -> " + best);
  if (order.length > 0) {
    console.log("  burst values in order: " + fmt(order.map((k) => a[k])));
    console.log("  coins per burst: " + gains.join(" + ") + " = " + gains.reduce((x, y) => x + y, 0));
  }
}

const r = maxCoins([3, 1, 5, 8]);
console.log("dp table for padded [1, 3, 1, 5, 8, 1] (row i, column j):");
for (const row of r.dp) {
  console.log("  " + row.map((v) => String(v).padStart(4)).join(" "));
}

console.log(maxCoins([3, 1, 5, 8]).best); // 167`,
          },
          {
            label: "Brute force vs broken pop-first split vs pop-last DP",
            code: `function fmt(xs) {
  return "[" + xs.join(", ") + "]";
}

let bruteCalls = 0;

// Try every order: burst each balloon still on the row first, recurse on the rest.
function brute(row) {
  bruteCalls++;
  let best = 0;
  for (let p = 0; p < row.length; p++) {
    const left = p > 0 ? row[p - 1] : 1;
    const right = p + 1 < row.length ? row[p + 1] : 1;
    const rest = row.slice(0, p).concat(row.slice(p + 1));
    best = Math.max(best, left * row[p] * right + brute(rest));
  }
  return best;
}

function table(n) {
  return Array.from({ length: n }, () => new Array(n).fill(0));
}

// WRONG: choose the balloon burst FIRST and treat the two sides as independent.
function firstBurstSplit(nums) {
  const a = [1, ...nums, 1];
  const n = a.length;
  const dp = table(n);
  for (let gap = 2; gap < n; gap++) {
    for (let i = 0; i + gap < n; i++) {
      const j = i + gap;
      for (let k = i + 1; k < j; k++) {
        // neighbours of k when it bursts first are k-1 and k+1, but the two halves
        // then still lean on k as a wall, and k is already gone
        dp[i][j] = Math.max(dp[i][j], dp[i][k] + a[k - 1] * a[k] * a[k + 1] + dp[k][j]);
      }
    }
  }
  return dp[0][n - 1];
}

let dpSteps = 0;

// RIGHT: choose the balloon burst LAST; its neighbours are then the fixed walls i and j.
function lastBurstDp(nums) {
  const a = [1, ...nums, 1];
  const n = a.length;
  const dp = table(n);
  for (let gap = 2; gap < n; gap++) {
    for (let i = 0; i + gap < n; i++) {
      const j = i + gap;
      for (let k = i + 1; k < j; k++) {
        dpSteps++;
        dp[i][j] = Math.max(dp[i][j], dp[i][k] + a[i] * a[k] * a[j] + dp[k][j]);
      }
    }
  }
  return dp[0][n - 1];
}

console.log("input | brute force | first-burst split (wrong) | last-burst dp");
for (const nums of [[3, 1, 5, 8], [1, 5], [2, 4, 3], [5, 1, 1, 5], [8, 2, 6, 3, 9]]) {
  console.log(fmt(nums) + " | " + brute(nums) + " | " + firstBurstSplit(nums) + " | " + lastBurstDp(nums));
}

for (const n of [4, 6, 8]) {
  const nums = Array.from({ length: n }, (_, i) => (i * 5) % 7 + 1);
  bruteCalls = 0;
  dpSteps = 0;
  const b = brute(nums);
  const d = lastBurstDp(nums);
  console.log("n = " + n + " " + fmt(nums) + ": brute " + b + " in " + bruteCalls +
    " calls, dp " + d + " in " + dpSteps + " steps");
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You have n balloons in a row, each with a number. Bursting balloon i earns left × nums[i] × right, where left and right are its current neighbours (a missing neighbour counts as 1). Find the maximum coins. Code it in Java, and explain why the DP is over intervals and why you choose the balloon burst last rather than first."

**What a strong answer should cover:**
- Why "choose the first balloon" fails: its neighbours become adjacent, so the two sides are not independent sub-problems.
- The insight: choose the balloon k burst **last** in the open interval (i, j); it separates the two sides, and its neighbours are fixed as a[i] and a[j].
- Padding with 1s, the state \`dp[i][j]\`, the recurrence \`max(dp[i][k] + a[i]·a[k]·a[j] + dp[k][j])\`, and filling by interval length.
- O(n³) time and O(n²) space versus O(n · n!) for trying every order.
- Java details: \`int[][]\` is zero-initialised, \`System.arraycopy\` for the padding, why \`int\` cannot overflow under values ≤ 100 (one pop ≤ 10⁶) and when to switch to \`long\`, and \`List.remove(int)\` vs \`remove(Object)\` when replaying the order.

**Clarifying questions expected:**
- What does a missing neighbour count as, and how large are n and the values?
- Do you need the burst order, or only the maximum?

**Code / implementation expected:** Yes — \`maxCoins(int[] nums)\` in Java with a padded array and an O(n³) interval table.`,
        answer: `**Target Audience:** Interview candidates who have seen basic dynamic programming (a 1-D table) and want to learn interval DP — every new idea is explained  
**Difficulty:** Hard  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a row of balloons at a fair: 3, 1, 5, 8. Pop one and you win prize points equal to *its number times the numbers of the two balloons right next to it at that moment*. If a side has no balloon, that side counts as 1. Pop all of them; what order wins the most points?

The catch is the words "at that moment". Every pop changes who is next to whom. Pop the 1 first and the 3 and 5 suddenly become neighbours. Pop the 5 first instead and the 1 and 8 become neighbours. The value of every later pop depends on everything you did before it.

Trying every order is hopeless: 4 balloons have 4! = 24 orders, but 12 balloons already have 479,001,600. And the obvious dynamic programming idea — "pick the balloon to pop **first**, then solve the two sides" — gives wrong answers, because the two sides do not stay separate.

The fix is one of the most elegant ideas in interview DP: pick the balloon to pop **last**. This page shows why that single change makes the two sides truly independent, which is the property every [dynamic programming](/interview-question/what-is-dynamic-programming) solution needs.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What does a missing neighbour count as? | The standard version says 1. That is why we pad the array with a 1 on each end, which removes every boundary \`if\`. |
| How many balloons, and how big are the numbers? | The DP is O(n³). With n around 300–500 that is tens of millions of simple steps — fine. With n = 10⁵ it is not. |
| Can a balloon be 0? | Zeros are allowed and need no special case; they just earn 0 for anyone next to them. |
| Do you want the order of pops, or only the maximum? | The maximum needs the table. The order needs one extra table remembering which balloon was last in each interval (example 1 prints it). |
| Can the total overflow? | Each pop is a product of three numbers. With values ≤ 100 one pop is at most 10⁶, so even 500 pops fit easily in a 32-bit int; with larger values you need 64-bit. |

## 3. The Setup: Pad the Ends With 1

First, a small trick that makes everything cleaner. Add an imaginary balloon worth 1 at each end. These two are never popped; they are walls. Now "a missing neighbour counts as 1" is automatic, and the real balloons sit at indexes 1 to n.

📌 **Interview term: Sentinel (padding)** — an extra value placed at the ends of an array so that boundary cases behave like normal cases. Here the two 1s remove every "is there a left neighbour?" check.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 180" role="img" aria-label="Balloons 3, 1, 5, 8 with an imaginary balloon worth 1 added at each end as a wall. Indexes 0 to 5">
  <text class="d-sub" x="60" y="30" text-anchor="middle">wall</text>
  <text class="d-sub" x="540" y="30" text-anchor="middle">wall</text>
  <rect class="d-box-muted" x="30" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="60" y="86" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="156" cy="80" r="30"/>
  <text class="d-text" x="156" y="86" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="252" cy="80" r="30"/>
  <text class="d-text" x="252" y="86" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="348" cy="80" r="30"/>
  <text class="d-text" x="348" y="86" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="444" cy="80" r="30"/>
  <text class="d-text" x="444" y="86" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="510" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="540" y="86" text-anchor="middle">1</text>
  <text class="d-sub" x="60" y="150" text-anchor="middle">index 0</text>
  <text class="d-sub" x="156" y="150" text-anchor="middle">1</text>
  <text class="d-sub" x="252" y="150" text-anchor="middle">2</text>
  <text class="d-sub" x="348" y="150" text-anchor="middle">3</text>
  <text class="d-sub" x="444" y="150" text-anchor="middle">4</text>
  <text class="d-sub" x="540" y="150" text-anchor="middle">5</text>
</svg>

## 4. Why "Which Balloon First?" Fails

A good DP splits a problem into smaller problems that **do not affect each other**. Suppose we pop balloon 1 (the one worth 1) first and then try to solve "the balloons to its left" and "the balloons to its right" separately.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 290" role="img" aria-label="Bursting the balloon 1 first makes balloons 3 and 5 neighbours, so the left side and the right side are no longer separate problems">
  <defs>
    <marker id="b30q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="30">before</text>
  <circle class="d-box" cx="156" cy="70" r="28"/>
  <text class="d-text" x="156" y="76" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="252" cy="70" r="28"/>
  <text class="d-text" x="252" y="76" text-anchor="middle">1</text>
  <circle class="d-box" cx="348" cy="70" r="28"/>
  <text class="d-text" x="348" y="76" text-anchor="middle">5</text>
  <circle class="d-box" cx="444" cy="70" r="28"/>
  <text class="d-text" x="444" y="76" text-anchor="middle">8</text>
  <text class="d-sub" x="252" y="124" text-anchor="middle">popped first: 3x1x5 = 15</text>
  <path class="d-edge" d="M 300 136 L 300 170" marker-end="url(#b30q2-arrow)"/>
  <text class="d-sub" x="20" y="196">after</text>
  <circle class="d-box-accent" cx="204" cy="220" r="28"/>
  <text class="d-text" x="204" y="226" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="300" cy="220" r="28"/>
  <text class="d-text" x="300" y="226" text-anchor="middle">5</text>
  <circle class="d-box" cx="396" cy="220" r="28"/>
  <text class="d-text" x="396" y="226" text-anchor="middle">8</text>
  <path class="d-edge-accent" d="M 232 220 L 272 220"/>
  <text class="d-sub" x="252" y="274" text-anchor="middle">3 and 5 now touch</text>
</svg>

After the pop, 3 and 5 are next to each other. When we later pop 3, its prize depends on 5 — a balloon from the *other* side. The left side and the right side are tangled together, so "best answer for the left" plus "best answer for the right" is not the best answer overall. Example 2 runs exactly this broken recurrence: on \`[3, 1, 5, 8]\` it reports **98** instead of **167**, and on \`[2, 4, 3]\` it even reports **44**, more than the true best of **33** — it counts pops that cannot happen.

📌 **Interview term: Independent subproblems** — two sub-problems are independent when solving one cannot change the answer of the other. DP only works when the split produces independent pieces.

📌 **Interview term: Optimal substructure** — the best answer to the whole problem is built from the best answers to its sub-problems. "Pop first" breaks it; "pop last" restores it.

## 5. The Key Insight: Choose the Balloon Popped Last

Look at a stretch of balloons between two walls i and j (the walls are not popped in this stretch). Ask: **which balloon k is popped last in this stretch?**

- While the other balloons are being popped, k is still standing. So k acts as a wall between the left part (i, k) and the right part (k, j). Nothing on the left ever sees anything on the right — the two parts are **independent**.
- When k is finally popped, every other balloon between i and j is gone, so its neighbours are exactly the walls i and j. Its prize is fixed: \`a[i] × a[k] × a[j]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Interval from wall i to wall j. Balloon k is burst last. The left part between i and k and the right part between k and j are solved separately, then k pays a i times a k times a j">
  <defs>
    <marker id="b30q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="50" width="70" height="56" rx="8"/>
  <text class="d-text" x="65" y="83" text-anchor="middle">wall i</text>
  <rect class="d-box-muted" x="130" y="50" width="140" height="56" rx="8"/>
  <text class="d-text" x="200" y="75" text-anchor="middle">left part</text>
  <text class="d-sub" x="200" y="95" text-anchor="middle">dp[i][k]</text>
  <rect class="d-box-accent" x="300" y="50" width="70" height="56" rx="8"/>
  <text class="d-text" x="335" y="83" text-anchor="middle">k</text>
  <rect class="d-box-muted" x="400" y="50" width="140" height="56" rx="8"/>
  <text class="d-text" x="470" y="75" text-anchor="middle">right part</text>
  <text class="d-sub" x="470" y="95" text-anchor="middle">dp[k][j]</text>
  <rect class="d-box" x="570" y="50" width="60" height="56" rx="8"/>
  <text class="d-text" x="600" y="83" text-anchor="middle">wall j</text>
  <text class="d-sub" x="335" y="30" text-anchor="middle">burst last</text>
  <path class="d-edge" d="M 335 110 L 335 166" marker-end="url(#b30q2-arrow2)"/>
  <rect class="d-box-accent" x="170" y="172" width="330" height="56" rx="10"/>
  <text class="d-text" x="335" y="197" text-anchor="middle">k pays a[i] x a[k] x a[j]</text>
  <text class="d-sub" x="335" y="217" text-anchor="middle">neighbours are the walls</text>
</svg>

So the best total for the stretch is the best over every choice of k of: best for the left part + best for the right part + \`a[i] × a[k] × a[j]\`.

📌 **Interview term: Interval DP** — dynamic programming whose state is a range (i, j) of the input, and whose transition tries every split point k inside the range. Matrix-chain multiplication and [longest palindromic substring](/interview-question/how-do-you-find-the-longest-palindromic-substring) are other members of the family.

📌 **Interview term: Open interval (i, j)** — the balloons strictly between i and j, not including i and j themselves. Using open intervals means the walls are always known, and an interval with j − i < 2 is empty and worth 0.

So the answer to the title question: the DP is over **intervals** because an interval with fixed walls is a self-contained problem, and it picks the **last** balloon because that is the only choice that keeps the walls fixed and the two halves apart. A DP over "which balloons are left" would need a state per subset — 2ⁿ states, which is [bitmask DP](/interview-question/what-is-bitmask-dynamic-programming) territory and far too many here.

## 6. The Recurrence and the Fill Order

📌 **Interview term: DP state** — \`dp[i][j]\` = the most coins you can collect by popping every balloon strictly between i and j, with i and j still standing.

📌 **Interview term: Transition (recurrence)** — \`dp[i][j] = max over i < k < j of dp[i][k] + a[i] × a[k] × a[j] + dp[k][j]\`, with \`dp[i][j] = 0\` when j − i < 2. The answer is \`dp[0][n + 1]\`.

Every interval reads only **shorter** intervals, so fill the table by gap = j − i, from 2 up to n + 1. (Filling row by row from the top would read cells that are not computed yet.)

📌 **Interview term: Fill order** — the order in which a bottom-up DP computes its cells so every cell it reads is already final. For interval DP it is "by interval length, shortest first".

Here is how the best plan for \`[3, 1, 5, 8]\` decomposes. Each box is one interval and the balloon it pops last:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 400" role="img" aria-label="The best plan for 3, 1, 5, 8. Interval 0 to 5 bursts 8 last. Inside it, interval 0 to 4 bursts 3 last, interval 1 to 4 bursts 5 last, interval 1 to 3 bursts 1 last">
  <defs>
    <marker id="b30q2-arrow3" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="170" y="20" width="260" height="56" rx="8"/>
  <text class="d-text" x="300" y="44" text-anchor="middle">(0, 5): last is 8</text>
  <text class="d-sub" x="300" y="65" text-anchor="middle">1 x 8 x 1 = 8</text>
  <path class="d-edge" d="M 300 78 L 300 112" marker-end="url(#b30q2-arrow3)"/>
  <rect class="d-box-accent" x="170" y="116" width="260" height="56" rx="8"/>
  <text class="d-text" x="300" y="140" text-anchor="middle">(0, 4): last is 3</text>
  <text class="d-sub" x="300" y="161" text-anchor="middle">1 x 3 x 8 = 24</text>
  <path class="d-edge" d="M 300 174 L 300 208" marker-end="url(#b30q2-arrow3)"/>
  <rect class="d-box-accent" x="170" y="212" width="260" height="56" rx="8"/>
  <text class="d-text" x="300" y="236" text-anchor="middle">(1, 4): last is 5</text>
  <text class="d-sub" x="300" y="257" text-anchor="middle">3 x 5 x 8 = 120</text>
  <path class="d-edge" d="M 300 270 L 300 304" marker-end="url(#b30q2-arrow3)"/>
  <rect class="d-box-accent" x="170" y="308" width="260" height="56" rx="8"/>
  <text class="d-text" x="300" y="332" text-anchor="middle">(1, 3): last is 1</text>
  <text class="d-sub" x="300" y="353" text-anchor="middle">3 x 1 x 5 = 15</text>
  <text class="d-sub" x="500" y="48" text-anchor="middle">total 167</text>
</svg>

Read from the bottom up: pop 1 first (between 3 and 5: 15), then 5 (between 3 and 8: 120), then 3 (between the wall and 8: 24), then 8 (between the two walls: 8). That is 15 + 120 + 24 + 8 = 167, the line \`coins per burst: 15 + 120 + 24 + 8 = 167\` in example 1.

## 7. From Brute Force to the Optimal Approach

**Brute force.** Try every order of pops: n! orders, O(n · n!) time. Example 2 counts 109,601 recursive calls for just 8 balloons.

**Pop-first DP.** Fast, but wrong — the two sides interact (section 4).

**Memoized "pop-last" recursion (top-down).** \`best(i, j)\` tries every k and caches the result: O(n²) states × O(n) choices = O(n³). Easy to write in an interview, and correct.

**Bottom-up "pop-last" table (the answer to give).** The same recurrence filled by interval length. O(n³) time, O(n²) memory, no recursion. For 8 balloons example 2 shows **120** inner steps against 109,601 brute-force calls.

📌 **Interview term: Memoization (top-down)** — a recursive solution that stores each sub-answer the first time it is computed and reuses it. Same complexity as the bottom-up table; the order of work is decided by the recursion instead of loops.

## 8. The Code in Java

The full solution, including the table of choices used to rebuild the order:

~~~java
static int maxCoins(int[] nums) {
    int n = nums.length + 2;
    int[] a = new int[n];
    a[0] = 1;                                     // padding: the walls count as balloons worth 1
    a[n - 1] = 1;
    System.arraycopy(nums, 0, a, 1, nums.length);
    dp = new int[n][n];                           // dp[i][j]: best coins strictly between i and j
    last = new int[n][n];                         // last[i][j]: the balloon burst LAST inside (i, j)
    for (int gap = 2; gap < n; gap++) {           // shorter intervals first
        for (int i = 0; i + gap < n; i++) {
            int j = i + gap;
            for (int k = i + 1; k < j; k++) {     // k is the last balloon left between i and j
                int coins = dp[i][k] + a[i] * a[k] * a[j] + dp[k][j];
                if (coins > dp[i][j]) {
                    dp[i][j] = coins;
                    last[i][j] = k;
                }
            }
        }
    }
    padded = a;
    return dp[0][n - 1];
}
~~~

**What to point out in this code:**

- \`new int[n][n]\` gives a fully zero-filled 2-D array, so empty intervals are already 0. \`System.arraycopy(nums, 0, a, 1, nums.length)\` copies the real balloons into positions 1..n of the padded array.
- The loops run \`gap\` from 2 up, then \`i\`, then \`k\`; every cell read has a smaller gap, so it is final.
- \`last[i][j]\` remembers the best k, and \`burstOrder\` rebuilds the pops: left part, right part, then k.
- **Overflow check:** with values ≤ 100, one pop is at most 100³ = 10⁶, and n ≤ 500 pops total at most 5 × 10⁸ — below \`Integer.MAX_VALUE\` (2,147,483,647). Java \`int\` overflow wraps silently, so if the values can be larger, make \`dp\` a \`long[][]\`.
- In \`replay\`, \`alive\` is a \`List<Integer>\`: \`alive.remove(p)\` with an \`int\` argument removes the element **at index** p, while \`alive.remove(Integer.valueOf(k))\` would remove the element **equal to** k. Mixing these up is a classic Java bug.
- The example keeps \`padded\`, \`dp\` and \`last\` in static fields to keep the demo short; in production code return a small result object instead.

## 9. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21; the code only uses Java 17 features). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — the pop-last DP with the order of pops** prints:

~~~text
[3, 1, 5, 8] -> 167
  burst values in order: [1, 5, 3, 8]
  coins per burst: 15 + 120 + 24 + 8 = 167
[1, 5] -> 10
  burst values in order: [1, 5]
  coins per burst: 5 + 5 = 10
[7] -> 7
  burst values in order: [7]
  coins per burst: 7 = 7
[] -> 0
[2, 2, 2] -> 14
  burst values in order: [2, 2, 2]
  coins per burst: 8 + 4 + 2 = 14
[9, 76, 64, 21] -> 116718
  burst values in order: [64, 76, 9, 21]
  coins per burst: 102144 + 14364 + 189 + 21 = 116718
dp table for padded [1, 3, 1, 5, 8, 1] (row i, column j):
     0    0    3   30  159  167
     0    0    0   15  135  159
     0    0    0    0   40   48
     0    0    0    0    0   40
     0    0    0    0    0    0
     0    0    0    0    0    0
167
~~~

The replay at the end of each block pops the balloons in the printed order on a fresh row and adds up the real prizes; it matches the DP value every time, so the order is genuinely achievable. In the table, row i and column j hold \`dp[i][j]\`; the top-right cell \`dp[0][5] = 167\` is the answer, and every cell with j − i < 2 is 0.

**Example 2 — brute force vs the broken pop-first split vs the pop-last DP** prints:

~~~text
input | brute force | first-burst split (wrong) | last-burst dp
[3, 1, 5, 8] | 167 | 98 | 167
[1, 5] | 10 | 10 | 10
[2, 4, 3] | 33 | 44 | 33
[5, 1, 1, 5] | 60 | 20 | 60
[8, 2, 6, 3, 9] | 771 | 337 | 771
n = 4 [1, 6, 4, 2]: brute 72 in 65 calls, dp 72 in 20 steps
n = 6 [1, 6, 4, 2, 7, 5]: brute 476 in 1957 calls, dp 476 in 56 steps
n = 8 [1, 6, 4, 2, 7, 5, 3, 1]: brute 560 in 109601 calls, dp 560 in 120 steps
~~~

The pop-first split is wrong in both directions (98 instead of 167, but 44 instead of 33), while the pop-last DP matches the brute force on every input. The work column shows n! growth for the brute force against C(n + 2, 3) for the DP.

## 10. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Try every order | O(n · n!) | O(n²) | n! orders, each costing O(n) list work |
| Pop-first DP | O(n³) | O(n²) | fast, but gives wrong answers |
| Pop-last DP (memo or table) | O(n³) | O(n²) | about n² / 2 intervals, each trying up to n split points |

The exact number of inner steps is the number of triples i < k < j among the n + 2 padded positions: C(n + 2, 3). For n = 4, 6 and 8 that is 20, 56 and 120 — the numbers example 2 printed.

## 11. Edge Cases

- **No balloons.** The padded array is \`[1, 1]\`, there is no k with 0 < k < 1, and the answer is 0.
- **One balloon.** Its neighbours are both walls: \`[7]\` gives 1 × 7 × 1 = 7.
- **Two balloons.** \`[1, 5]\` gives 10: pop the 1 first (1 × 1 × 5 = 5) then the 5 (1 × 5 × 1 = 5). Popping 5 first would give only 5 + 1 = 6.
- **Zeros.** A 0 balloon earns 0 and makes its neighbours earn 0 while it stands; the recurrence handles it without any special case.
- **Equal values.** \`[2, 2, 2]\` has many orders with the same total (14); the code keeps the first k that reaches the maximum, so the printed order is one of several optimal ones.
- **Large values.** The table holds sums of products; size the integer type for the worst case (see the language notes).

## Common Pitfalls

- **Picking the balloon popped first.** The sides interact; the answer is wrong (example 2: 98 instead of 167).
- **Silent \`int\` overflow.** With large balloon values the products wrap around to negative numbers without any error; use \`long\` when values can exceed about 100–1000.
- **\`List.remove(int)\` vs \`List.remove(Object)\`.** \`list.remove(k)\` with an \`int\` removes by index, not by value.
- **Wrong fill order.** Looping \`i\` upward and \`j\` upward reads \`dp[k][j]\` for k > i before it is computed. Loop by gap, or loop \`i\` downward.
- **Forgetting the padding.** Without the two 1s, \`a[i - 1]\` at the edge throws \`ArrayIndexOutOfBoundsException\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The trap:</strong> <span style="color:#f0e2c8;">Choosing the balloon popped first makes its two neighbours touch, so the left and right sides stop being independent — that DP is wrong.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The insight:</strong> <span style="color:#f0e2c8;">Choose the balloon <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> popped <strong style="color:#ffca28;">last</strong> in the open interval (i, j). Until then it walls off the two sides; when it pops, its neighbours are exactly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[j]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Recurrence:</strong> <span style="color:#f0e2c8;">Pad with 1s. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j] = Math.max(dp[i][j], dp[i][k] + a[i] * a[k] * a[j] + dp[k][j])</code> over i &lt; k &lt; j; answer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0][n + 1]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Order and cost:</strong> <span style="color:#f0e2c8;">Fill by interval length, shortest first. O(n³) time, O(n²) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[][]</code> starts at 0; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> is safe for values ≤ 100 (one pop ≤ 10⁶), otherwise use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long[][]</code> because overflow wraps silently.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why exactly does choosing the last balloon work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">While the other balloons pop, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> is still there, so nothing on its left ever neighbours anything on its right. When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> finally pops, everything between i and j is gone, so its prize is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i] * a[k] * a[j]</code> — fixed and known.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you pad the array with 1s?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A missing neighbour counts as 1, so two permanent walls make the boundary case identical to the normal one and remove every bounds check (and every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayIndexOutOfBoundsException</code>).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you recover the order of pops?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">last[i][j] = k</code> for the best k. The order is: order of (i, k), then order of (k, j), then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>. Replaying it on the real row gives the same total (example 1 checks this).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the answer overflow an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with values ≤ 100: one pop is at most 10⁶ and 500 pops at most 5 × 10⁸. With values up to 10⁴ one pop is 10¹², so switch the table to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which other problems use this pattern?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Any problem where a choice inside a range splits it into two independent ranges: matrix-chain multiplication, minimum cost to cut a stick, optimal binary search trees, and palindrome-partition problems.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Sentinel (padding)** | Extra values at the ends of an array so boundary cases behave like normal ones |
| **Independent subproblems** | Sub-problems whose answers cannot affect each other; required for a DP split |
| **Optimal substructure** | The best overall answer is built from the best answers to sub-problems |
| **Interval DP** | DP whose state is a range (i, j) and whose transition tries every split point k inside it |
| **Open interval (i, j)** | The positions strictly between i and j; i and j act as fixed walls |
| **DP state** | dp[i][j] = most coins from popping everything strictly between i and j |
| **Transition (recurrence)** | dp[i][j] = max over k of dp[i][k] + a[i]·a[k]·a[j] + dp[k][j] |
| **Fill order** | The order cells are computed so every cell read is already final: shortest intervals first |
| **Memoization (top-down)** | Recursion that caches each sub-answer the first time it is computed |
| **Integer overflow (Java)** | int arithmetic wraps around silently past 2,147,483,647; use long for bigger totals |

---
**Conclusion:** Burst Balloons looks like an ordering problem, but the winning question is not "what do I pop first?" — it is "what do I pop **last** between these two walls?". The last balloon keeps the two sides apart and has fixed neighbours, which turns the problem into a clean interval DP: \`dp[i][j] = max(dp[i][k] + a[i] * a[k] * a[j] + dp[k][j])\`, filled shortest interval first, O(n³) time and O(n²) memory. In Java, \`int[][]\` is ready-zeroed; check the overflow bound before you trust \`int\`. The same split-at-k thinking powers [longest palindromic substring](/interview-question/how-do-you-find-the-longest-palindromic-substring), and the contrast with a subset-based state is explained in [bitmask dynamic programming](/interview-question/what-is-bitmask-dynamic-programming).`,
        examples: [
          {
            label: "Pop-last interval DP with the order of pops and the dp table",
            code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    static int[] padded;
    static int[][] dp, last;

    static String fmt(List<Integer> xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < xs.size(); i++) {
            if (i > 0) sb.append(", ");
            sb.append(xs.get(i));
        }
        return sb.append("]").toString();
    }

    static int maxCoins(int[] nums) {
        int n = nums.length + 2;
        int[] a = new int[n];
        a[0] = 1;                                     // padding: the walls count as balloons worth 1
        a[n - 1] = 1;
        System.arraycopy(nums, 0, a, 1, nums.length);
        dp = new int[n][n];                           // dp[i][j]: best coins strictly between i and j
        last = new int[n][n];                         // last[i][j]: the balloon burst LAST inside (i, j)
        for (int gap = 2; gap < n; gap++) {           // shorter intervals first
            for (int i = 0; i + gap < n; i++) {
                int j = i + gap;
                for (int k = i + 1; k < j; k++) {     // k is the last balloon left between i and j
                    int coins = dp[i][k] + a[i] * a[k] * a[j] + dp[k][j];
                    if (coins > dp[i][j]) {
                        dp[i][j] = coins;
                        last[i][j] = k;
                    }
                }
            }
        }
        padded = a;
        return dp[0][n - 1];
    }

    static void burstOrder(int i, int j, List<Integer> out) {
        if (j - i < 2) return;
        int k = last[i][j];
        burstOrder(i, k, out);                        // empty the left side first
        burstOrder(k, j, out);                        // then the right side
        out.add(k);                                   // k goes last, between the walls i and j
    }

    static List<Integer> replay(int[] a, List<Integer> order) {
        List<Integer> alive = new ArrayList<>();      // indexes still on the table (walls included)
        for (int i = 0; i < a.length; i++) alive.add(i);
        List<Integer> gains = new ArrayList<>();
        for (int k : order) {
            int p = alive.indexOf(k);
            gains.add(a[alive.get(p - 1)] * a[k] * a[alive.get(p + 1)]);
            alive.remove(p);                          // remove(int index), not remove(Object)
        }
        return gains;
    }

    public static void main(String[] args) {
        int[][] cases = {{3, 1, 5, 8}, {1, 5}, {7}, {}, {2, 2, 2}, {9, 76, 64, 21}};
        for (int[] nums : cases) {
            int best = maxCoins(nums);
            List<Integer> order = new ArrayList<>();
            burstOrder(0, padded.length - 1, order);
            List<Integer> gains = replay(padded, order);
            List<Integer> shown = new ArrayList<>();
            for (int x : nums) shown.add(x);
            System.out.println(fmt(shown) + " -> " + best);
            if (!order.isEmpty()) {
                List<Integer> values = new ArrayList<>();
                for (int k : order) values.add(padded[k]);
                StringBuilder sb = new StringBuilder();
                int sum = 0;
                for (int g = 0; g < gains.size(); g++) {
                    if (g > 0) sb.append(" + ");
                    sb.append(gains.get(g));
                    sum += gains.get(g);
                }
                System.out.println("  burst values in order: " + fmt(values));
                System.out.println("  coins per burst: " + sb + " = " + sum);
            }
        }

        maxCoins(new int[]{3, 1, 5, 8});
        System.out.println("dp table for padded [1, 3, 1, 5, 8, 1] (row i, column j):");
        for (int[] row : dp) {
            StringBuilder sb = new StringBuilder("  ");
            for (int j = 0; j < row.length; j++) {
                if (j > 0) sb.append(" ");
                sb.append(String.format("%4d", row[j]));
            }
            System.out.println(sb);
        }

        System.out.println(maxCoins(new int[]{3, 1, 5, 8})); // 167
    }
}`,
          },
          {
            label: "Brute force vs broken pop-first split vs pop-last DP",
            code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    static String fmt(int[] xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < xs.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append(xs[i]);
        }
        return sb.append("]").toString();
    }

    static long bruteCalls = 0;

    // Try every order: burst each balloon still on the row first, recurse on the rest.
    static int brute(List<Integer> row) {
        bruteCalls++;
        int best = 0;
        for (int p = 0; p < row.size(); p++) {
            int left = p > 0 ? row.get(p - 1) : 1;
            int right = p + 1 < row.size() ? row.get(p + 1) : 1;
            List<Integer> rest = new ArrayList<>(row);
            rest.remove(p);                               // index overload: removes position p
            best = Math.max(best, left * row.get(p) * right + brute(rest));
        }
        return best;
    }

    static int[] pad(int[] nums) {
        int[] a = new int[nums.length + 2];
        a[0] = 1;
        a[a.length - 1] = 1;
        System.arraycopy(nums, 0, a, 1, nums.length);
        return a;
    }

    // WRONG: choose the balloon burst FIRST and treat the two sides as independent.
    static int firstBurstSplit(int[] nums) {
        int[] a = pad(nums);
        int n = a.length;
        int[][] dp = new int[n][n];
        for (int gap = 2; gap < n; gap++)
            for (int i = 0; i + gap < n; i++) {
                int j = i + gap;
                for (int k = i + 1; k < j; k++)
                    // neighbours of k when it bursts first are k-1 and k+1, but the two halves
                    // then still lean on k as a wall, and k is already gone
                    dp[i][j] = Math.max(dp[i][j], dp[i][k] + a[k - 1] * a[k] * a[k + 1] + dp[k][j]);
            }
        return dp[0][n - 1];
    }

    static long dpSteps = 0;

    // RIGHT: choose the balloon burst LAST; its neighbours are then the fixed walls i and j.
    static int lastBurstDp(int[] nums) {
        int[] a = pad(nums);
        int n = a.length;
        int[][] dp = new int[n][n];
        for (int gap = 2; gap < n; gap++)
            for (int i = 0; i + gap < n; i++) {
                int j = i + gap;
                for (int k = i + 1; k < j; k++) {
                    dpSteps++;
                    dp[i][j] = Math.max(dp[i][j], dp[i][k] + a[i] * a[k] * a[j] + dp[k][j]);
                }
            }
        return dp[0][n - 1];
    }

    static List<Integer> boxed(int[] nums) {
        List<Integer> l = new ArrayList<>();
        for (int x : nums) l.add(x);
        return l;
    }

    public static void main(String[] args) {
        System.out.println("input | brute force | first-burst split (wrong) | last-burst dp");
        int[][] cases = {{3, 1, 5, 8}, {1, 5}, {2, 4, 3}, {5, 1, 1, 5}, {8, 2, 6, 3, 9}};
        for (int[] nums : cases)
            System.out.println(fmt(nums) + " | " + brute(boxed(nums)) + " | " + firstBurstSplit(nums) + " | " + lastBurstDp(nums));

        for (int n : new int[]{4, 6, 8}) {
            int[] nums = new int[n];
            for (int i = 0; i < n; i++) nums[i] = (i * 5) % 7 + 1;
            bruteCalls = 0;
            dpSteps = 0;
            int b = brute(boxed(nums));
            int d = lastBurstDp(nums);
            System.out.println("n = " + n + " " + fmt(nums) + ": brute " + b + " in " + bruteCalls
                + " calls, dp " + d + " in " + dpSteps + " steps");
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You have n balloons in a row, each with a number. Bursting balloon i earns left × nums[i] × right, where left and right are its current neighbours (a missing neighbour counts as 1). Find the maximum coins. Code it in C++, and explain why the DP is over intervals and why you choose the balloon burst last rather than first."

**What a strong answer should cover:**
- Why "choose the first balloon" fails: its neighbours become adjacent, so the two sides are not independent sub-problems.
- The insight: choose the balloon k burst **last** in the open interval (i, j); it separates the two sides, and its neighbours are fixed as a[i] and a[j].
- Padding with 1s, the state \`dp[i][j]\`, the recurrence \`max(dp[i][k] + a[i]·a[k]·a[j] + dp[k][j])\`, and filling by interval length.
- O(n³) time and O(n²) space versus O(n · n!) for trying every order.
- C++ details: \`std::vector<std::vector<int>> dp(n, std::vector<int>(n, 0))\`, padding with \`insert\`, signed overflow being undefined behaviour (so pick \`long long\` when values are large), and iterator invalidation after \`erase\` when replaying the order.

**Clarifying questions expected:**
- What does a missing neighbour count as, and how large are n and the values?
- Do you need the burst order, or only the maximum?

**Code / implementation expected:** Yes — \`maxCoins(const std::vector<int>&)\` in C++17 with a padded vector and an O(n³) interval table.`,
        answer: `**Target Audience:** Interview candidates who have seen basic dynamic programming (a 1-D table) and want to learn interval DP — every new idea is explained  
**Difficulty:** Hard  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a row of balloons at a fair: 3, 1, 5, 8. Pop one and you win prize points equal to *its number times the numbers of the two balloons right next to it at that moment*. If a side has no balloon, that side counts as 1. Pop all of them; what order wins the most points?

The catch is the words "at that moment". Every pop changes who is next to whom. Pop the 1 first and the 3 and 5 suddenly become neighbours. Pop the 5 first instead and the 1 and 8 become neighbours. The value of every later pop depends on everything you did before it.

Trying every order is hopeless: 4 balloons have 4! = 24 orders, but 12 balloons already have 479,001,600. And the obvious dynamic programming idea — "pick the balloon to pop **first**, then solve the two sides" — gives wrong answers, because the two sides do not stay separate.

The fix is one of the most elegant ideas in interview DP: pick the balloon to pop **last**. This page shows why that single change makes the two sides truly independent, which is the property every [dynamic programming](/interview-question/what-is-dynamic-programming) solution needs.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What does a missing neighbour count as? | The standard version says 1. That is why we pad the array with a 1 on each end, which removes every boundary \`if\`. |
| How many balloons, and how big are the numbers? | The DP is O(n³). With n around 300–500 that is tens of millions of simple steps — fine. With n = 10⁵ it is not. |
| Can a balloon be 0? | Zeros are allowed and need no special case; they just earn 0 for anyone next to them. |
| Do you want the order of pops, or only the maximum? | The maximum needs the table. The order needs one extra table remembering which balloon was last in each interval (example 1 prints it). |
| Can the total overflow? | Each pop is a product of three numbers. With values ≤ 100 one pop is at most 10⁶, so even 500 pops fit easily in a 32-bit int; with larger values you need 64-bit. |

## 3. The Setup: Pad the Ends With 1

First, a small trick that makes everything cleaner. Add an imaginary balloon worth 1 at each end. These two are never popped; they are walls. Now "a missing neighbour counts as 1" is automatic, and the real balloons sit at indexes 1 to n.

📌 **Interview term: Sentinel (padding)** — an extra value placed at the ends of an array so that boundary cases behave like normal cases. Here the two 1s remove every "is there a left neighbour?" check.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 180" role="img" aria-label="Balloons 3, 1, 5, 8 with an imaginary balloon worth 1 added at each end as a wall. Indexes 0 to 5">
  <text class="d-sub" x="60" y="30" text-anchor="middle">wall</text>
  <text class="d-sub" x="540" y="30" text-anchor="middle">wall</text>
  <rect class="d-box-muted" x="30" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="60" y="86" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="156" cy="80" r="30"/>
  <text class="d-text" x="156" y="86" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="252" cy="80" r="30"/>
  <text class="d-text" x="252" y="86" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="348" cy="80" r="30"/>
  <text class="d-text" x="348" y="86" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="444" cy="80" r="30"/>
  <text class="d-text" x="444" y="86" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="510" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="540" y="86" text-anchor="middle">1</text>
  <text class="d-sub" x="60" y="150" text-anchor="middle">index 0</text>
  <text class="d-sub" x="156" y="150" text-anchor="middle">1</text>
  <text class="d-sub" x="252" y="150" text-anchor="middle">2</text>
  <text class="d-sub" x="348" y="150" text-anchor="middle">3</text>
  <text class="d-sub" x="444" y="150" text-anchor="middle">4</text>
  <text class="d-sub" x="540" y="150" text-anchor="middle">5</text>
</svg>

## 4. Why "Which Balloon First?" Fails

A good DP splits a problem into smaller problems that **do not affect each other**. Suppose we pop balloon 1 (the one worth 1) first and then try to solve "the balloons to its left" and "the balloons to its right" separately.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 290" role="img" aria-label="Bursting the balloon 1 first makes balloons 3 and 5 neighbours, so the left side and the right side are no longer separate problems">
  <defs>
    <marker id="b30q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="30">before</text>
  <circle class="d-box" cx="156" cy="70" r="28"/>
  <text class="d-text" x="156" y="76" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="252" cy="70" r="28"/>
  <text class="d-text" x="252" y="76" text-anchor="middle">1</text>
  <circle class="d-box" cx="348" cy="70" r="28"/>
  <text class="d-text" x="348" y="76" text-anchor="middle">5</text>
  <circle class="d-box" cx="444" cy="70" r="28"/>
  <text class="d-text" x="444" y="76" text-anchor="middle">8</text>
  <text class="d-sub" x="252" y="124" text-anchor="middle">popped first: 3x1x5 = 15</text>
  <path class="d-edge" d="M 300 136 L 300 170" marker-end="url(#b30q2-arrow)"/>
  <text class="d-sub" x="20" y="196">after</text>
  <circle class="d-box-accent" cx="204" cy="220" r="28"/>
  <text class="d-text" x="204" y="226" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="300" cy="220" r="28"/>
  <text class="d-text" x="300" y="226" text-anchor="middle">5</text>
  <circle class="d-box" cx="396" cy="220" r="28"/>
  <text class="d-text" x="396" y="226" text-anchor="middle">8</text>
  <path class="d-edge-accent" d="M 232 220 L 272 220"/>
  <text class="d-sub" x="252" y="274" text-anchor="middle">3 and 5 now touch</text>
</svg>

After the pop, 3 and 5 are next to each other. When we later pop 3, its prize depends on 5 — a balloon from the *other* side. The left side and the right side are tangled together, so "best answer for the left" plus "best answer for the right" is not the best answer overall. Example 2 runs exactly this broken recurrence: on \`[3, 1, 5, 8]\` it reports **98** instead of **167**, and on \`[2, 4, 3]\` it even reports **44**, more than the true best of **33** — it counts pops that cannot happen.

📌 **Interview term: Independent subproblems** — two sub-problems are independent when solving one cannot change the answer of the other. DP only works when the split produces independent pieces.

📌 **Interview term: Optimal substructure** — the best answer to the whole problem is built from the best answers to its sub-problems. "Pop first" breaks it; "pop last" restores it.

## 5. The Key Insight: Choose the Balloon Popped Last

Look at a stretch of balloons between two walls i and j (the walls are not popped in this stretch). Ask: **which balloon k is popped last in this stretch?**

- While the other balloons are being popped, k is still standing. So k acts as a wall between the left part (i, k) and the right part (k, j). Nothing on the left ever sees anything on the right — the two parts are **independent**.
- When k is finally popped, every other balloon between i and j is gone, so its neighbours are exactly the walls i and j. Its prize is fixed: \`a[i] × a[k] × a[j]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Interval from wall i to wall j. Balloon k is burst last. The left part between i and k and the right part between k and j are solved separately, then k pays a i times a k times a j">
  <defs>
    <marker id="b30q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="50" width="70" height="56" rx="8"/>
  <text class="d-text" x="65" y="83" text-anchor="middle">wall i</text>
  <rect class="d-box-muted" x="130" y="50" width="140" height="56" rx="8"/>
  <text class="d-text" x="200" y="75" text-anchor="middle">left part</text>
  <text class="d-sub" x="200" y="95" text-anchor="middle">dp[i][k]</text>
  <rect class="d-box-accent" x="300" y="50" width="70" height="56" rx="8"/>
  <text class="d-text" x="335" y="83" text-anchor="middle">k</text>
  <rect class="d-box-muted" x="400" y="50" width="140" height="56" rx="8"/>
  <text class="d-text" x="470" y="75" text-anchor="middle">right part</text>
  <text class="d-sub" x="470" y="95" text-anchor="middle">dp[k][j]</text>
  <rect class="d-box" x="570" y="50" width="60" height="56" rx="8"/>
  <text class="d-text" x="600" y="83" text-anchor="middle">wall j</text>
  <text class="d-sub" x="335" y="30" text-anchor="middle">burst last</text>
  <path class="d-edge" d="M 335 110 L 335 166" marker-end="url(#b30q2-arrow2)"/>
  <rect class="d-box-accent" x="170" y="172" width="330" height="56" rx="10"/>
  <text class="d-text" x="335" y="197" text-anchor="middle">k pays a[i] x a[k] x a[j]</text>
  <text class="d-sub" x="335" y="217" text-anchor="middle">neighbours are the walls</text>
</svg>

So the best total for the stretch is the best over every choice of k of: best for the left part + best for the right part + \`a[i] × a[k] × a[j]\`.

📌 **Interview term: Interval DP** — dynamic programming whose state is a range (i, j) of the input, and whose transition tries every split point k inside the range. Matrix-chain multiplication and [longest palindromic substring](/interview-question/how-do-you-find-the-longest-palindromic-substring) are other members of the family.

📌 **Interview term: Open interval (i, j)** — the balloons strictly between i and j, not including i and j themselves. Using open intervals means the walls are always known, and an interval with j − i < 2 is empty and worth 0.

So the answer to the title question: the DP is over **intervals** because an interval with fixed walls is a self-contained problem, and it picks the **last** balloon because that is the only choice that keeps the walls fixed and the two halves apart. A DP over "which balloons are left" would need a state per subset — 2ⁿ states, which is [bitmask DP](/interview-question/what-is-bitmask-dynamic-programming) territory and far too many here.

## 6. The Recurrence and the Fill Order

📌 **Interview term: DP state** — \`dp[i][j]\` = the most coins you can collect by popping every balloon strictly between i and j, with i and j still standing.

📌 **Interview term: Transition (recurrence)** — \`dp[i][j] = max over i < k < j of dp[i][k] + a[i] × a[k] × a[j] + dp[k][j]\`, with \`dp[i][j] = 0\` when j − i < 2. The answer is \`dp[0][n + 1]\`.

Every interval reads only **shorter** intervals, so fill the table by gap = j − i, from 2 up to n + 1. (Filling row by row from the top would read cells that are not computed yet.)

📌 **Interview term: Fill order** — the order in which a bottom-up DP computes its cells so every cell it reads is already final. For interval DP it is "by interval length, shortest first".

Here is how the best plan for \`[3, 1, 5, 8]\` decomposes. Each box is one interval and the balloon it pops last:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 400" role="img" aria-label="The best plan for 3, 1, 5, 8. Interval 0 to 5 bursts 8 last. Inside it, interval 0 to 4 bursts 3 last, interval 1 to 4 bursts 5 last, interval 1 to 3 bursts 1 last">
  <defs>
    <marker id="b30q2-arrow3" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="170" y="20" width="260" height="56" rx="8"/>
  <text class="d-text" x="300" y="44" text-anchor="middle">(0, 5): last is 8</text>
  <text class="d-sub" x="300" y="65" text-anchor="middle">1 x 8 x 1 = 8</text>
  <path class="d-edge" d="M 300 78 L 300 112" marker-end="url(#b30q2-arrow3)"/>
  <rect class="d-box-accent" x="170" y="116" width="260" height="56" rx="8"/>
  <text class="d-text" x="300" y="140" text-anchor="middle">(0, 4): last is 3</text>
  <text class="d-sub" x="300" y="161" text-anchor="middle">1 x 3 x 8 = 24</text>
  <path class="d-edge" d="M 300 174 L 300 208" marker-end="url(#b30q2-arrow3)"/>
  <rect class="d-box-accent" x="170" y="212" width="260" height="56" rx="8"/>
  <text class="d-text" x="300" y="236" text-anchor="middle">(1, 4): last is 5</text>
  <text class="d-sub" x="300" y="257" text-anchor="middle">3 x 5 x 8 = 120</text>
  <path class="d-edge" d="M 300 270 L 300 304" marker-end="url(#b30q2-arrow3)"/>
  <rect class="d-box-accent" x="170" y="308" width="260" height="56" rx="8"/>
  <text class="d-text" x="300" y="332" text-anchor="middle">(1, 3): last is 1</text>
  <text class="d-sub" x="300" y="353" text-anchor="middle">3 x 1 x 5 = 15</text>
  <text class="d-sub" x="500" y="48" text-anchor="middle">total 167</text>
</svg>

Read from the bottom up: pop 1 first (between 3 and 5: 15), then 5 (between 3 and 8: 120), then 3 (between the wall and 8: 24), then 8 (between the two walls: 8). That is 15 + 120 + 24 + 8 = 167, the line \`coins per burst: 15 + 120 + 24 + 8 = 167\` in example 1.

## 7. From Brute Force to the Optimal Approach

**Brute force.** Try every order of pops: n! orders, O(n · n!) time. Example 2 counts 109,601 recursive calls for just 8 balloons.

**Pop-first DP.** Fast, but wrong — the two sides interact (section 4).

**Memoized "pop-last" recursion (top-down).** \`best(i, j)\` tries every k and caches the result: O(n²) states × O(n) choices = O(n³). Easy to write in an interview, and correct.

**Bottom-up "pop-last" table (the answer to give).** The same recurrence filled by interval length. O(n³) time, O(n²) memory, no recursion. For 8 balloons example 2 shows **120** inner steps against 109,601 brute-force calls.

📌 **Interview term: Memoization (top-down)** — a recursive solution that stores each sub-answer the first time it is computed and reuses it. Same complexity as the bottom-up table; the order of work is decided by the recursion instead of loops.

## 8. The Code in C++

The full solution, including the table of choices used to rebuild the order:

~~~cpp
Result maxCoins(const vector<int>& nums) {
    vector<int> a = {1};                              // padding: the walls count as balloons worth 1
    a.insert(a.end(), nums.begin(), nums.end());
    a.push_back(1);
    int n = a.size();
    vector<vector<int>> dp(n, vector<int>(n, 0));     // dp[i][j]: best coins strictly between i and j
    vector<vector<int>> last(n, vector<int>(n, -1));  // last[i][j]: the balloon burst LAST inside (i, j)
    for (int gap = 2; gap < n; gap++) {               // shorter intervals first
        for (int i = 0; i + gap < n; i++) {
            int j = i + gap;
            for (int k = i + 1; k < j; k++) {         // k is the last balloon left between i and j
                int coins = dp[i][k] + a[i] * a[k] * a[j] + dp[k][j];
                if (coins > dp[i][j]) {
                    dp[i][j] = coins;
                    last[i][j] = k;
                }
            }
        }
    }
    return {dp[0][n - 1], a, dp, last};
}
~~~

**What to point out in this code:**

- \`vector<int> a = {1}; a.insert(a.end(), nums.begin(), nums.end()); a.push_back(1);\` builds the padded copy; the input is taken by \`const&\` and never modified.
- \`vector<vector<int>> dp(n, vector<int>(n, 0))\` allocates n separate rows, all zero. Prefer it to a raw \`int dp[500][500]\` on the stack, which can overflow the stack for big n.
- The loops run \`gap\` from 2 up, then \`i\`, then \`k\`; every cell read has a smaller gap, so it is final.
- \`last[i][j]\` remembers the best k, and \`burstOrder\` rebuilds the pops: left part, right part, then k.
- **Overflow:** signed overflow in C++ is undefined behaviour, not a wrap-around you can detect afterwards. With values ≤ 100 one pop is at most 10⁶ and the total stays far below \`INT_MAX\`; with bigger values use \`long long\` for \`dp\`.
- In \`replay\`, \`alive.erase(it)\` invalidates \`it\` (and every iterator after it), so the code computes \`prev(it)\` and \`next(it)\` **before** erasing and never touches \`it\` again.
- \`return {dp[0][n - 1], a, dp, last};\` builds the \`Result\` struct directly as the return value, but it still *copies* the local tables into it (they are named variables). Wrap them in \`std::move\` if that copy ever matters.

## 9. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — the pop-last DP with the order of pops** prints:

~~~text
[3, 1, 5, 8] -> 167
  burst values in order: [1, 5, 3, 8]
  coins per burst: 15 + 120 + 24 + 8 = 167
[1, 5] -> 10
  burst values in order: [1, 5]
  coins per burst: 5 + 5 = 10
[7] -> 7
  burst values in order: [7]
  coins per burst: 7 = 7
[] -> 0
[2, 2, 2] -> 14
  burst values in order: [2, 2, 2]
  coins per burst: 8 + 4 + 2 = 14
[9, 76, 64, 21] -> 116718
  burst values in order: [64, 76, 9, 21]
  coins per burst: 102144 + 14364 + 189 + 21 = 116718
dp table for padded [1, 3, 1, 5, 8, 1] (row i, column j):
     0    0    3   30  159  167
     0    0    0   15  135  159
     0    0    0    0   40   48
     0    0    0    0    0   40
     0    0    0    0    0    0
     0    0    0    0    0    0
167
~~~

The replay at the end of each block pops the balloons in the printed order on a fresh row and adds up the real prizes; it matches the DP value every time, so the order is genuinely achievable. In the table, row i and column j hold \`dp[i][j]\`; the top-right cell \`dp[0][5] = 167\` is the answer, and every cell with j − i < 2 is 0.

**Example 2 — brute force vs the broken pop-first split vs the pop-last DP** prints:

~~~text
input | brute force | first-burst split (wrong) | last-burst dp
[3, 1, 5, 8] | 167 | 98 | 167
[1, 5] | 10 | 10 | 10
[2, 4, 3] | 33 | 44 | 33
[5, 1, 1, 5] | 60 | 20 | 60
[8, 2, 6, 3, 9] | 771 | 337 | 771
n = 4 [1, 6, 4, 2]: brute 72 in 65 calls, dp 72 in 20 steps
n = 6 [1, 6, 4, 2, 7, 5]: brute 476 in 1957 calls, dp 476 in 56 steps
n = 8 [1, 6, 4, 2, 7, 5, 3, 1]: brute 560 in 109601 calls, dp 560 in 120 steps
~~~

The pop-first split is wrong in both directions (98 instead of 167, but 44 instead of 33), while the pop-last DP matches the brute force on every input. The work column shows n! growth for the brute force against C(n + 2, 3) for the DP.

## 10. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Try every order | O(n · n!) | O(n²) | n! orders, each costing O(n) list work |
| Pop-first DP | O(n³) | O(n²) | fast, but gives wrong answers |
| Pop-last DP (memo or table) | O(n³) | O(n²) | about n² / 2 intervals, each trying up to n split points |

The exact number of inner steps is the number of triples i < k < j among the n + 2 padded positions: C(n + 2, 3). For n = 4, 6 and 8 that is 20, 56 and 120 — the numbers example 2 printed.

## 11. Edge Cases

- **No balloons.** The padded array is \`[1, 1]\`, there is no k with 0 < k < 1, and the answer is 0.
- **One balloon.** Its neighbours are both walls: \`[7]\` gives 1 × 7 × 1 = 7.
- **Two balloons.** \`[1, 5]\` gives 10: pop the 1 first (1 × 1 × 5 = 5) then the 5 (1 × 5 × 1 = 5). Popping 5 first would give only 5 + 1 = 6.
- **Zeros.** A 0 balloon earns 0 and makes its neighbours earn 0 while it stands; the recurrence handles it without any special case.
- **Equal values.** \`[2, 2, 2]\` has many orders with the same total (14); the code keeps the first k that reaches the maximum, so the printed order is one of several optimal ones.
- **Large values.** The table holds sums of products; size the integer type for the worst case (see the language notes).

## Common Pitfalls

- **Picking the balloon popped first.** The sides interact; the answer is wrong (example 2: 98 instead of 167).
- **Signed overflow.** With large balloon values \`a[i] * a[k] * a[j]\` can exceed \`int\`; that is undefined behaviour — use \`long long\`.
- **Using an iterator after \`erase\`.** \`vector::erase\` invalidates it; read the neighbours first.
- **Wrong fill order.** Looping \`i\` upward and \`j\` upward reads \`dp[k][j]\` for k > i before it is computed. Loop by gap, or loop \`i\` downward.
- **Big local arrays.** \`int dp[505][505]\` inside a function lives on the stack; a \`vector\` (heap) is safer.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The trap:</strong> <span style="color:#f0e2c8;">Choosing the balloon popped first makes its two neighbours touch, so the left and right sides stop being independent — that DP is wrong.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The insight:</strong> <span style="color:#f0e2c8;">Choose the balloon <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> popped <strong style="color:#ffca28;">last</strong> in the open interval (i, j). Until then it walls off the two sides; when it pops, its neighbours are exactly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[j]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Recurrence:</strong> <span style="color:#f0e2c8;">Pad with 1s. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j] = max(dp[i][j], dp[i][k] + a[i] * a[k] * a[j] + dp[k][j])</code> over i &lt; k &lt; j; answer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0][n + 1]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Order and cost:</strong> <span style="color:#f0e2c8;">Fill by interval length, shortest first. O(n³) time, O(n²) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;vector&lt;int&gt;&gt; dp(n, vector&lt;int&gt;(n))</code>; signed overflow is undefined behaviour, so use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> when values are large.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why exactly does choosing the last balloon work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">While the other balloons pop, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> is still there, so nothing on its left ever neighbours anything on its right. When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> finally pops, everything between i and j is gone, so its prize is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i] * a[k] * a[j]</code> — fixed and known.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you pad the array with 1s?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A missing neighbour counts as 1, so two permanent walls make the boundary case identical to the normal one and remove every bounds check — no out-of-range reads.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you recover the order of pops?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">last[i][j] = k</code> for the best k. The order is: order of (i, k), then order of (k, j), then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>. Replaying it on the real row gives the same total (example 1 checks this).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the answer overflow an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with values ≤ 100: one pop is at most 10⁶ and 500 pops at most 5 × 10⁸. Larger values need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>, because signed overflow is undefined behaviour.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which other problems use this pattern?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Any problem where a choice inside a range splits it into two independent ranges: matrix-chain multiplication, minimum cost to cut a stick, optimal binary search trees, and palindrome-partition problems.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Sentinel (padding)** | Extra values at the ends of an array so boundary cases behave like normal ones |
| **Independent subproblems** | Sub-problems whose answers cannot affect each other; required for a DP split |
| **Optimal substructure** | The best overall answer is built from the best answers to sub-problems |
| **Interval DP** | DP whose state is a range (i, j) and whose transition tries every split point k inside it |
| **Open interval (i, j)** | The positions strictly between i and j; i and j act as fixed walls |
| **DP state** | dp[i][j] = most coins from popping everything strictly between i and j |
| **Transition (recurrence)** | dp[i][j] = max over k of dp[i][k] + a[i]·a[k]·a[j] + dp[k][j] |
| **Fill order** | The order cells are computed so every cell read is already final: shortest intervals first |
| **Memoization (top-down)** | Recursion that caches each sub-answer the first time it is computed |
| **Undefined behaviour (signed overflow)** | In C++ a signed int that overflows makes the whole program meaningless, not just wrong |

---
**Conclusion:** Burst Balloons looks like an ordering problem, but the winning question is not "what do I pop first?" — it is "what do I pop **last** between these two walls?". The last balloon keeps the two sides apart and has fixed neighbours, which turns the problem into a clean interval DP: \`dp[i][j] = max(dp[i][k] + a[i] * a[k] * a[j] + dp[k][j])\`, filled shortest interval first, O(n³) time and O(n²) memory. In C++, use a \`vector\` of \`vector\`s, mind signed overflow, and never reuse an erased iterator. The same split-at-k thinking powers [longest palindromic substring](/interview-question/how-do-you-find-the-longest-palindromic-substring), and the contrast with a subset-based state is explained in [bitmask dynamic programming](/interview-question/what-is-bitmask-dynamic-programming).`,
        examples: [
          {
            label: "Pop-last interval DP with the order of pops and the dp table",
            code: `#include <algorithm>
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

struct Result {
    int best;
    vector<int> a;
    vector<vector<int>> dp, last;
};

string fmt(const vector<int>& xs) {
    string out = "[";
    for (size_t i = 0; i < xs.size(); i++) {
        if (i > 0) out += ", ";
        out += to_string(xs[i]);
    }
    return out + "]";
}

Result maxCoins(const vector<int>& nums) {
    vector<int> a = {1};                              // padding: the walls count as balloons worth 1
    a.insert(a.end(), nums.begin(), nums.end());
    a.push_back(1);
    int n = a.size();
    vector<vector<int>> dp(n, vector<int>(n, 0));     // dp[i][j]: best coins strictly between i and j
    vector<vector<int>> last(n, vector<int>(n, -1));  // last[i][j]: the balloon burst LAST inside (i, j)
    for (int gap = 2; gap < n; gap++) {               // shorter intervals first
        for (int i = 0; i + gap < n; i++) {
            int j = i + gap;
            for (int k = i + 1; k < j; k++) {         // k is the last balloon left between i and j
                int coins = dp[i][k] + a[i] * a[k] * a[j] + dp[k][j];
                if (coins > dp[i][j]) {
                    dp[i][j] = coins;
                    last[i][j] = k;
                }
            }
        }
    }
    return {dp[0][n - 1], a, dp, last};
}

void burstOrder(const vector<vector<int>>& last, int i, int j, vector<int>& out) {
    if (j - i < 2) return;
    int k = last[i][j];
    burstOrder(last, i, k, out);                      // empty the left side first
    burstOrder(last, k, j, out);                      // then the right side
    out.push_back(k);                                 // k goes last, between the walls i and j
}

vector<int> replay(const vector<int>& a, const vector<int>& order) {
    vector<int> alive;                                // indexes still on the table (walls included)
    for (int i = 0; i < (int)a.size(); i++) alive.push_back(i);
    vector<int> gains;
    for (int k : order) {
        auto it = find(alive.begin(), alive.end(), k);
        gains.push_back(a[*prev(it)] * a[k] * a[*next(it)]);
        alive.erase(it);                              // it is invalid after this line
    }
    return gains;
}

int main() {
    vector<vector<int>> cases = {{3, 1, 5, 8}, {1, 5}, {7}, {}, {2, 2, 2}, {9, 76, 64, 21}};
    for (const auto& nums : cases) {
        Result r = maxCoins(nums);
        vector<int> order;
        burstOrder(r.last, 0, (int)r.a.size() - 1, order);
        vector<int> gains = replay(r.a, order);
        cout << fmt(nums) << " -> " << r.best << "\\n";
        if (!order.empty()) {
            vector<int> values;
            for (int k : order) values.push_back(r.a[k]);
            string sum;
            int total = 0;
            for (size_t g = 0; g < gains.size(); g++) {
                if (g > 0) sum += " + ";
                sum += to_string(gains[g]);
                total += gains[g];
            }
            cout << "  burst values in order: " << fmt(values) << "\\n";
            cout << "  coins per burst: " << sum << " = " << total << "\\n";
        }
    }

    Result r = maxCoins({3, 1, 5, 8});
    cout << "dp table for padded [1, 3, 1, 5, 8, 1] (row i, column j):\\n";
    for (const auto& row : r.dp) {
        cout << " ";
        for (int v : row) cout << " " << setw(4) << v;
        cout << "\\n";
    }

    cout << maxCoins({3, 1, 5, 8}).best << "\\n"; // 167
}`,
          },
          {
            label: "Brute force vs broken pop-first split vs pop-last DP",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

string fmt(const vector<int>& xs) {
    string out = "[";
    for (size_t i = 0; i < xs.size(); i++) {
        if (i > 0) out += ", ";
        out += to_string(xs[i]);
    }
    return out + "]";
}

long long bruteCalls = 0;

// Try every order: burst each balloon still on the row first, recurse on the rest.
int brute(const vector<int>& row) {
    bruteCalls++;
    int best = 0;
    for (size_t p = 0; p < row.size(); p++) {
        int left = p > 0 ? row[p - 1] : 1;
        int right = p + 1 < row.size() ? row[p + 1] : 1;
        vector<int> rest(row);
        rest.erase(rest.begin() + p);
        best = max(best, left * row[p] * right + brute(rest));
    }
    return best;
}

vector<int> pad(const vector<int>& nums) {
    vector<int> a = {1};
    a.insert(a.end(), nums.begin(), nums.end());
    a.push_back(1);
    return a;
}

// WRONG: choose the balloon burst FIRST and treat the two sides as independent.
int firstBurstSplit(const vector<int>& nums) {
    vector<int> a = pad(nums);
    int n = a.size();
    vector<vector<int>> dp(n, vector<int>(n, 0));
    for (int gap = 2; gap < n; gap++)
        for (int i = 0; i + gap < n; i++) {
            int j = i + gap;
            for (int k = i + 1; k < j; k++)
                // neighbours of k when it bursts first are k-1 and k+1, but the two halves
                // then still lean on k as a wall, and k is already gone
                dp[i][j] = max(dp[i][j], dp[i][k] + a[k - 1] * a[k] * a[k + 1] + dp[k][j]);
        }
    return dp[0][n - 1];
}

long long dpSteps = 0;

// RIGHT: choose the balloon burst LAST; its neighbours are then the fixed walls i and j.
int lastBurstDp(const vector<int>& nums) {
    vector<int> a = pad(nums);
    int n = a.size();
    vector<vector<int>> dp(n, vector<int>(n, 0));
    for (int gap = 2; gap < n; gap++)
        for (int i = 0; i + gap < n; i++) {
            int j = i + gap;
            for (int k = i + 1; k < j; k++) {
                dpSteps++;
                dp[i][j] = max(dp[i][j], dp[i][k] + a[i] * a[k] * a[j] + dp[k][j]);
            }
        }
    return dp[0][n - 1];
}

int main() {
    cout << "input | brute force | first-burst split (wrong) | last-burst dp\\n";
    vector<vector<int>> cases = {{3, 1, 5, 8}, {1, 5}, {2, 4, 3}, {5, 1, 1, 5}, {8, 2, 6, 3, 9}};
    for (const auto& nums : cases)
        cout << fmt(nums) << " | " << brute(nums) << " | " << firstBurstSplit(nums) << " | " << lastBurstDp(nums) << "\\n";

    for (int n : {4, 6, 8}) {
        vector<int> nums;
        for (int i = 0; i < n; i++) nums.push_back((i * 5) % 7 + 1);
        bruteCalls = 0;
        dpSteps = 0;
        int b = brute(nums);
        int d = lastBurstDp(nums);
        cout << "n = " << n << " " << fmt(nums) << ": brute " << b << " in " << bruteCalls
             << " calls, dp " << d << " in " << dpSteps << " steps\\n";
    }
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "What is bitmask dynamic programming?",
    difficulty: "hard",
    seoDescription: "Bitmask DP explained: sets stored as integers, dp[mask] assignment, Held-Karp TSP and submask loops, with code in Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"What is bitmask dynamic programming? Explain when you would reach for it, describe the state for a classic problem such as assigning n workers to n jobs or the travelling salesman problem, and show me what it looks like in Python."

**What a strong answer should cover:**
- A bitmask is an integer used as a set (bit i = element i); with n elements there are 2ⁿ masks, so it fits when n is small (about 20 or less).
- The condition that makes it valid: the future depends only on *which* elements are used, not the order — replacing n! orders with 2ⁿ subsets.
- Concrete states: \`dp[mask]\` for assignment (next worker = popcount), \`dp[mask][last]\` for TSP (Held–Karp, O(n² · 2ⁿ) time, O(n · 2ⁿ) space).
- Fill order by increasing mask, the core bit operations, and submask enumeration with its 3ⁿ total cost.
- Python details: unbounded \`int\` masks (no overflow), operator precedence (\`mask >> i & 1\` is fine), \`int.bit_count()\` (3.10+) or \`bin(m).count('1')\`, and that Python loops over 2ⁿ · n states are slow, so keep n ≤ about 16–18.

**Code / implementation expected:** Optional — a short \`dp[mask]\` assignment or \`dp[mask][last]\` TSP in Python is a strong way to show you mean it.`,
        answer: `**Target Audience:** Interview candidates who know basic dynamic programming and want the subset-as-integer technique — bits are explained from scratch  
**Difficulty:** Hard  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A delivery driver has five stops today. Halfway through the route she glances at a sticky note on the dashboard with five tick boxes, one per stop: ✓ ✓ ✗ ✓ ✗. That note — *which stops are done* — plus *where she is standing right now* is everything she needs to plan the rest of the day. It does not matter in which order the ticked stops were visited; only *which* ones and where she ended up.

Now imagine writing that sticky note as a number. Each tick box is a 0 or a 1, so five tick boxes are just a five-digit binary number. \`01011\` means stops 0, 1 and 3 are done. A computer can store that in one integer, look it up in an array instantly, and add a tick with a single operation.

That is the whole idea of **bitmask dynamic programming**: when a problem's state is "which items out of a small set have been used", store that set as the bits of an integer and use the integer as a table index. It turns problems whose brute force is n! (every order) into roughly 2ⁿ × n — the difference between "never finishes" and "a fraction of a second" for 15 or 20 items.

## 2. A Set Stored in One Integer

Number the items 0 to n − 1. A subset of them is written as an integer whose bit i is 1 when item i is in the subset.

📌 **Interview term: Bitmask** — an integer used as a set: bit i is 1 when element i is a member. With n elements there are exactly 2ⁿ masks, the integers 0 to 2ⁿ − 1.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 180" role="img" aria-label="The mask 1011 in binary. Bit 3 is 1, bit 2 is 0, bit 1 is 1, bit 0 is 1, so items 0, 1 and 3 are in the set and the integer value is 11">
  <text class="d-sub" x="135" y="44" text-anchor="middle">bit 3</text>
  <text class="d-sub" x="235" y="44" text-anchor="middle">bit 2</text>
  <text class="d-sub" x="335" y="44" text-anchor="middle">bit 1</text>
  <text class="d-sub" x="435" y="44" text-anchor="middle">bit 0</text>
  <rect class="d-box-accent" x="100" y="60" width="70" height="56" rx="8"/>
  <text class="d-text" x="135" y="94" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="200" y="60" width="70" height="56" rx="8"/>
  <text class="d-text" x="235" y="94" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="300" y="60" width="70" height="56" rx="8"/>
  <text class="d-text" x="335" y="94" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="400" y="60" width="70" height="56" rx="8"/>
  <text class="d-text" x="435" y="94" text-anchor="middle">1</text>
  <rect class="d-box" x="510" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="555" y="94" text-anchor="middle">= 11</text>
  <text class="d-sub" x="135" y="150" text-anchor="middle">item 3 in</text>
  <text class="d-sub" x="235" y="150" text-anchor="middle">item 2 out</text>
  <text class="d-sub" x="335" y="150" text-anchor="middle">item 1 in</text>
  <text class="d-sub" x="435" y="150" text-anchor="middle">item 0 in</text>
</svg>

Bit 0 is the rightmost digit. The value is 8 + 2 + 1 = 11, which is why example 1 prints \`mask 1011 = 11, members [0, 1, 3]\`.

The operations you need are all one-liners (the exact syntax for this language is in the table in section 7):

- **Is item i in the set?** shift right by i and look at the last bit.
- **Add item i:** OR with \`1 << i\`. **Remove item i:** AND with the complement of \`1 << i\`. **Toggle:** XOR with \`1 << i\`.
- **Size of the set:** count the 1 bits. 📌 **Interview term: Popcount** — the number of 1 bits in an integer ("population count").
- **Lowest member:** \`mask & -mask\` keeps only the lowest 1 bit (two's complement trick). See the [bit-manipulation tricks page](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews) and [counting set bits](/interview-question/how-do-you-count-the-number-of-set-bits-in-an-integer) for why these work.
- **Full set:** \`(1 << n) - 1\`, all n bits on.

## 3. What Bitmask DP Is

📌 **Interview term: Bitmask DP** — dynamic programming whose state includes a bitmask describing which elements have been used, visited or assigned. A cell like \`dp[mask]\` or \`dp[mask][i]\` stores the best answer for that subset.

It applies when two things are true:

1. **The future only depends on *which* items are used, not on the order they were used in.** The driver does not care whether she did stop 1 before stop 3 — only that both are done. That is the [optimal substructure](/interview-question/what-is-dynamic-programming) DP needs.
2. **n is small**, usually n ≤ 20. 2²⁰ is 1,048,576 masks — fine. 2⁴⁰ is about 10¹² — impossible. If a problem says "n ≤ 15" or "n ≤ 20" and asks about orders, assignments or groupings, bitmask DP should be your first thought.

📌 **Interview term: State compression** — encoding a whole collection of yes/no facts (a subset) as one integer so it can be a single table index. Bitmask DP is the most common kind.

📌 **Interview term: Exponential vs factorial** — 2ⁿ grows fast, but n! grows much faster: for n = 10, 2¹⁰ = 1,024 while 10! = 3,628,800. Bitmask DP wins by forgetting the *order* inside each subset.

## 4. Pattern 1 — Assignment: dp[mask]

**Problem.** n workers, n jobs, \`cost[w][j]\` to give job j to worker w. Each worker gets exactly one job. Minimise the total cost.

**Brute force.** Try every permutation: n! assignments.

**Bitmask DP.** Hand out jobs to workers in order 0, 1, 2, … Let \`dp[mask]\` = cheapest way to give the jobs in \`mask\` to the first \`popcount(mask)\` workers. The next worker to place is \`w = popcount(mask)\`, so the mask alone tells us who is next — no second dimension needed.

- Base case: \`dp[0] = 0\` (no jobs given, nobody placed).
- Transition: for each job j not in mask, \`dp[mask | 1 << j] = min(…, dp[mask] + cost[w][j])\`.
- Answer: \`dp[(1 << n) - 1]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 370" role="img" aria-label="All eight masks of three jobs arranged by how many jobs are taken. Each arrow adds one job, so every mask is reached from smaller masks">
  <path class="d-edge" d="M 300 80 L 140 130"/>
  <path class="d-edge" d="M 300 80 L 300 130"/>
  <path class="d-edge" d="M 300 80 L 460 130"/>
  <path class="d-edge" d="M 140 170 L 140 220"/>
  <path class="d-edge" d="M 140 170 L 300 220"/>
  <path class="d-edge" d="M 300 170 L 140 220"/>
  <path class="d-edge" d="M 300 170 L 460 220"/>
  <path class="d-edge" d="M 460 170 L 300 220"/>
  <path class="d-edge" d="M 460 170 L 460 220"/>
  <path class="d-edge" d="M 140 260 L 300 310"/>
  <path class="d-edge" d="M 300 260 L 300 310"/>
  <path class="d-edge" d="M 460 260 L 300 310"/>
  <rect class="d-box-accent" x="260" y="40" width="80" height="40" rx="6"/>
  <text class="d-text" x="300" y="66" text-anchor="middle">000</text>
  <rect class="d-box" x="100" y="130" width="80" height="40" rx="6"/>
  <text class="d-text" x="140" y="156" text-anchor="middle">001</text>
  <rect class="d-box" x="260" y="130" width="80" height="40" rx="6"/>
  <text class="d-text" x="300" y="156" text-anchor="middle">010</text>
  <rect class="d-box" x="420" y="130" width="80" height="40" rx="6"/>
  <text class="d-text" x="460" y="156" text-anchor="middle">100</text>
  <rect class="d-box" x="100" y="220" width="80" height="40" rx="6"/>
  <text class="d-text" x="140" y="246" text-anchor="middle">011</text>
  <rect class="d-box" x="260" y="220" width="80" height="40" rx="6"/>
  <text class="d-text" x="300" y="246" text-anchor="middle">101</text>
  <rect class="d-box" x="420" y="220" width="80" height="40" rx="6"/>
  <text class="d-text" x="460" y="246" text-anchor="middle">110</text>
  <rect class="d-box-accent" x="260" y="310" width="80" height="40" rx="6"/>
  <text class="d-text" x="300" y="336" text-anchor="middle">111</text>
  <text class="d-sub" x="530" y="66">0 taken</text>
  <text class="d-sub" x="530" y="156">1 taken</text>
  <text class="d-sub" x="530" y="246">2 taken</text>
  <text class="d-sub" x="530" y="336">3 taken</text>
</svg>

Every arrow adds exactly one bit, and adding a bit always makes the integer bigger. So simply looping \`mask\` from 0 to 2ⁿ − 1 in increasing order is a valid fill order — every mask is final before anything reads it.

📌 **Interview term: Fill order (increasing masks)** — because a superset mask is always a larger integer than any of its subsets, a plain \`for mask in 0 .. 2ⁿ − 1\` loop processes every subset before its supersets.

Example 1 solves a 4 × 4 instance: cost 13, matching the 24-permutation brute force, with 16 states and 32 transitions. At n = 10 it uses 1,024 states and 5,120 transitions instead of 10! = 3,628,800 orders.

## 5. Pattern 2 — Travelling Salesman: dp[mask][last]

**Problem.** Visit every city exactly once starting and ending at city 0, with the shortest total distance.

Here the mask is not enough: two paths that visited the same cities but stopped in different places have different futures. So the state adds the current city.

- State: \`dp[mask][last]\` = shortest path that starts at city 0, visits exactly the cities in \`mask\`, and ends at \`last\`.
- Base case: \`dp[1][0] = 0\` (mask \`…0001\`: only city 0, standing at city 0).
- Transition: from \`(mask, last)\` go to any unvisited \`next\`: \`dp[mask | 1 << next][next] = min(…, dp[mask][last] + d[last][next])\`.
- Answer: \`min over last of dp[full][last] + d[last][0]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Held Karp transition. The state mask 1011 standing at city 3 moves to city 2, giving the state mask 1111 standing at city 2, at extra cost d of 3 to 2">
  <defs>
    <marker id="b30q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="60" width="220" height="80" rx="10"/>
  <text class="d-text" x="140" y="92" text-anchor="middle">mask 1011, at 3</text>
  <text class="d-sub" x="140" y="118" text-anchor="middle">visited 0, 1, 3</text>
  <path class="d-edge-accent" d="M 254 100 L 384 100" marker-end="url(#b30q3-arrow)"/>
  <text class="d-sub" x="320" y="80" text-anchor="middle">+ d[3][2]</text>
  <rect class="d-box-accent" x="390" y="60" width="220" height="80" rx="10"/>
  <text class="d-text" x="500" y="92" text-anchor="middle">mask 1111, at 2</text>
  <text class="d-sub" x="500" y="118" text-anchor="middle">visited 0, 1, 2, 3</text>
</svg>

This is the Held–Karp algorithm (M. Held and R. M. Karp, *A dynamic programming approach to sequencing problems*, J. SIAM 1962, as cited in the [Google OR-Tools documentation](https://developers.google.com/optimization/reference/graph/hamiltonian_path)). It runs in O(n² · 2ⁿ) time instead of O(n!) — example 2 finds the best 12-city tour with 56,331 transitions, where trying every order would mean 39,916,800 tours.

📌 **Interview term: Held–Karp** — the bitmask DP for the travelling salesman problem, \`dp[mask][last]\`, O(n² · 2ⁿ) time and O(n · 2ⁿ) memory.

## 6. Pattern 3 — Splitting a Set: Iterating Over Submasks

Some problems split the items into groups: "fewest elevator trips", "fewest teams", "cheapest way to cover everyone". Then \`dp[mask]\` tries every possible *group* \`sub\` inside \`mask\` as the last group: \`dp[mask] = min(dp[mask ^ sub] + 1)\` over valid \`sub\`.

The standard trick visits every submask of \`mask\` without testing all 2ⁿ integers:

~~~text
sub = mask
while sub > 0:
    use sub
    sub = (sub - 1) & mask
~~~

Subtracting 1 turns off the lowest 1 bit and turns on every bit below it; AND-ing with \`mask\` throws away the bits that are not in \`mask\`. The result is the next smaller submask. Example 3 lists \`1011, 1010, 1001, 1000, 0011, 0010, 0001, 0000\` for \`mask = 1011\`.

📌 **Interview term: Submask enumeration** — the \`(sub - 1) & mask\` loop that visits all 2^popcount(mask) subsets of \`mask\` in decreasing order.

📌 **Interview term: The 3ⁿ bound** — summed over all masks, the submask loop runs 3ⁿ times, not 4ⁿ: each item is either outside the mask, in the mask but not the submask, or in both — three choices per item. Example 3 measures 81, 6,561 and 59,049 pairs for n = 4, 8 and 10 — exactly 3ⁿ.

## 7. Recognising a Bitmask DP Problem

| Signal in the problem | Likely state |
| :--- | :--- |
| n ≤ 20 and "visit every …", "shortest route through all …" | \`dp[mask][last]\` (Held–Karp) |
| "assign each worker one task", "match every …" | \`dp[mask]\`, next person = popcount |
| "split everyone into groups / trips / teams" | \`dp[mask]\` over submasks, O(3ⁿ) |
| "can these pieces form …" (matchsticks into a square, k equal subsets) | \`dp[mask]\` = partial progress |
| n up to 10⁵ | **not** bitmask DP — the state space would be astronomical |

Contrast with the neighbouring DP pages: [equal-sum partition](/interview-question/how-do-you-check-if-an-array-can-be-partitioned-into-two-equal-sum-subsets) indexes the table by a *sum* (small values, many items), [Burst Balloons](/interview-question/burst-balloons-why-does-dp-over-intervals-not-balloons-work) by an *interval* (order along a line matters), and bitmask DP by a *subset* (few items, arbitrary relationships). Plain [backtracking](/interview-question/what-is-backtracking) over all [permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array) is the brute force that bitmask DP replaces.

## 8. The Code in Python

The bit operations in Python:

| Operation | Python | Note |
| :--- | :--- | :--- |
| item i in mask? | \`mask >> i & 1\` | shifts bind tighter than \`&\`, and \`&\` tighter than \`==\` |
| add / remove / toggle i | \`mask \\| 1 << i\`, \`mask & ~(1 << i)\`, \`mask ^ 1 << i\` | \`~x\` is \`-x - 1\` on unbounded ints, which still works as a mask |
| popcount | \`mask.bit_count()\` | added in Python 3.10 ([docs](https://docs.python.org/3/library/stdtypes.html#int.bit_count)); \`bin(mask).count("1")\` before that |
| lowest set bit | \`mask & -mask\` | index: \`(mask & -mask).bit_length() - 1\` |
| full set | \`(1 << n) - 1\` | |

The assignment DP from section 4:

~~~python
def assign(cost):
    n = len(cost)
    INF = float("inf")
    dp = [INF] * (1 << n)          # dp[mask]: cheapest way to give the jobs in mask to workers 0..popcount-1
    choice = [-1] * (1 << n)
    dp[0] = 0
    transitions = 0
    for mask in range(1 << n):     # every mask is reached only from smaller masks
        if dp[mask] == INF:
            continue
        worker = mask.bit_count()  # the next worker to place
        if worker == n:
            continue
        for job in range(n):
            if not mask >> job & 1:
                transitions += 1
                nxt = mask | 1 << job
                if dp[mask] + cost[worker][job] < dp[nxt]:
                    dp[nxt] = dp[mask] + cost[worker][job]
                    choice[nxt] = job
    full = (1 << n) - 1
    jobs, m = [0] * n, full
    for worker in range(n - 1, -1, -1):        # walk back from the full set
        jobs[worker] = choice[m]
        m ^= 1 << choice[m]
    return dp[full], jobs, transitions
~~~

**What to point out in this code:**

- Python integers have no fixed width, so \`1 << n\` never overflows and masks work for any n — the limit is purely the 2ⁿ table size.
- Precedence works in your favour in Python: \`<<\` and \`>>\` bind tighter than \`&\`, which binds tighter than \`==\`, so \`mask >> job & 1\` and \`mask & 1 << 2 == 0\` both mean what they look like. (In C, C++, Java and JavaScript the second one does **not** — see Common Pitfalls of those pages.)
- \`mask.bit_count()\` is the popcount (Python 3.10+). Example 3 also shows the portable \`m &= m - 1\` loop, and \`(m & -m).bit_length() - 1\` for the index of the lowest set bit.
- \`float("inf")\` is a safe sentinel in Python: \`inf + 5\` is still \`inf\` and compares correctly, so there is no overflow trap — but the example still skips unreachable masks, which is faster.
- \`dp = [INF] * (1 << n)\` is a flat list (fine). For Held–Karp use \`[[INF] * n for _ in range(1 << n)]\`, **not** \`[[INF] * n] * (1 << n)\`, which would share one row.
- Speed: for n = 20, Held–Karp is around 2²⁰ × 20 × 20 ≈ 4 × 10⁸ basic steps — out of reach for pure Python loops. In Python, bitmask DP is comfortable up to roughly n = 15–16; say so if the interviewer asks about limits.

## 9. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — mask operations and the assignment problem** prints:

~~~text
mask 1011 = 11, members [0, 1, 3]
has item 2? false
add 2:    1111
remove 0: 1010
toggle 3: 0011
size (popcount): 3
lowest set bit: 0001
full set: 1111
min cost 13 (brute force over 24 orders: 13)
worker -> job: 0->1, 1->0, 2->2, 3->3
states: 16, transitions: 32
n = 10: min cost 42, states 1024, transitions 5120, orders 10! = 3628800
~~~

**Example 2 — Held–Karp travelling salesman with tour reconstruction** prints:

~~~text
shortest tour: 0 -> 4 -> 2 -> 3 -> 1 -> 0, length 26
brute force: 26 after 24 orders
held-karp: 32 masks x 5 cities, 52 transitions
n = 12: length 146, tour 0 -> 10 -> 6 -> 1 -> 8 -> 9 -> 5 -> 11 -> 2 -> 7 -> 4 -> 3 -> 0
n = 12: 56331 transitions vs 39916800 brute-force orders
~~~

The 5-city tour 0 → 4 → 2 → 3 → 1 → 0 costs 7 + 5 + 8 + 4 + 2 = 26, which the 24-order brute force confirms.

**Example 3 — submask enumeration, the 3ⁿ count, and fewest elevator trips** prints:

~~~text
submasks of 1011: 1011, 1010, 1001, 1000, 0011, 0010, 0001, 0000
count: 8 = 2^3
n = 4: 81 (mask, submask) pairs, 3^n = 81, 4^n = 256
n = 8: 6561 (mask, submask) pairs, 3^n = 6561, 4^n = 65536
n = 10: 59049 (mask, submask) pairs, 3^n = 59049, 4^n = 1048576
total weight 420, limit 150 per trip
fewest trips: 3
  trip: 30, 90 (load 120)
  trip: 50, 40, 60 (load 150)
  trip: 70, 80 (load 150)
~~~

Seven people weighing 420 in total cannot ride in two trips of 150, and the DP finds a 3-trip split; the order the trips print in is the order the reconstruction peels them off.

## 10. Complexity

| Pattern | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force over all orders | O(n · n!) | O(n) | n! permutations, O(n) to score each |
| Assignment \`dp[mask]\` | O(n · 2ⁿ) | O(2ⁿ) | 2ⁿ masks, up to n jobs to try from each |
| Held–Karp \`dp[mask][last]\` | O(n² · 2ⁿ) | O(n · 2ⁿ) | 2ⁿ · n states, n next cities from each |
| Groups via submasks | O(3ⁿ) | O(2ⁿ) | every (mask, submask) pair once |

For a feel of the limits: at n = 20, \`dp[mask][last]\` has 2²⁰ × 20 = 20,971,520 cells — about 84 MB if each is a 4-byte integer — and the transitions number in the hundreds of millions. That is why problems with bitmask DP usually say n ≤ 16 to 20.

## 11. Edge Cases

- **n = 0 or n = 1.** One mask (0) or two masks; make sure the full-set index \`(1 << n) - 1\` and the base case still make sense (for TSP with one city the tour length is 0).
- **Unreachable states.** Many \`(mask, last)\` pairs are impossible (for example a mask without city 0). Initialise them to a large sentinel and **skip** them; never add a distance to the sentinel itself.
- **The sentinel overflowing.** In fixed-width integer languages, \`INT_MAX + d\` overflows. Either skip INF states (as the examples do) or pick a sentinel like 10⁹ that leaves headroom.
- **Masks that do not fit the integer type.** 32-bit integers hold masks for n ≤ 31 at most (and fewer with signed types); 64-bit for n ≤ 63 — far beyond what a DP table could store anyway.
- **Ties.** Several tours or assignments can share the minimum. With a strict \`<\` the first one found wins, which keeps the reconstructed answer deterministic.

## Common Pitfalls

- **\`[[INF] * n] * (1 << n)\`.** Every row is the same list; one update changes all masks.
- **Forgetting \`bit_count\` needs 3.10.** On older interpreters use \`bin(mask).count("1")\`.
- **Iterating masks in the wrong order.** Pull-style updates must read only smaller masks; the plain increasing loop guarantees this, a custom order may not.
- **Assuming Python can do n = 20.** The algorithm is right but hundreds of millions of interpreted steps are too slow; mention a compiled language or pruning.
- **Using a mask where order matters.** If two orders of the same set have different futures (and you cannot add a "last" dimension), bitmask DP is the wrong tool.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Bitmask DP is DP whose state includes an integer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mask</code> whose bit i says whether item i is used, visited or assigned.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When:</strong> <span style="color:#f0e2c8;">When the future depends only on *which* items are used (not their order) and n is small, about n ≤ 20 — it replaces n! orders with 2ⁿ subsets.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Patterns:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[mask]</code> for assignment (next worker = <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mask.bit_count()</code>), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[mask][last]</code> for TSP (Held–Karp, O(n²·2ⁿ)), submask loops <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sub = (sub - 1) &amp; mask</code> for grouping, O(3ⁿ).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Order:</strong> <span style="color:#f0e2c8;">A superset is a bigger integer, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for mask in range(1 &lt;&lt; n)</code> is a valid fill order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Ints are unbounded so masks never overflow, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bit_count()</code> needs 3.10+, and pure Python handles only about n ≤ 16 comfortably.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the assignment state just <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dp[mask]</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dp[i][mask]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Workers are placed in a fixed order, so the number of jobs taken — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mask.bit_count()</code> — already tells you which worker is next. The extra index would be redundant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does TSP need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dp[mask][last]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two partial routes with the same visited set but different end cities have different costs to continue. The end city is part of what the future depends on, so it must be in the state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the submask loop 3ⁿ in total?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For each item there are three cases: not in the mask, in the mask but not the submask, in both. Multiplying gives 3ⁿ pairs; example 3 counts 59,049 for n = 10.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How large can n be?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Memory is 2ⁿ (or n·2ⁿ) cells and time a factor n or n² more. n ≤ 20 is the usual limit in compiled languages; in pure Python closer to 15–16.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you print the actual tour or assignment?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store the choice made for each state (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[mask][city]</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">choice[mask]</code>) and walk back from the full mask, removing one bit at a time.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bitmask** | An integer used as a set: bit i is 1 when element i is a member |
| **Popcount** | The number of 1 bits in an integer — the size of the set |
| **Bitmask DP** | DP whose state includes a bitmask of which elements are used, visited or assigned |
| **State compression** | Encoding a collection of yes/no facts as one integer so it can index a table |
| **Exponential vs factorial** | 2ⁿ (bitmask DP) grows far more slowly than n! (all orders) |
| **Fill order (increasing masks)** | Supersets are larger integers, so looping masks upward is a valid DP order |
| **Held–Karp** | TSP bitmask DP dp[mask][last]: O(n² · 2ⁿ) time, O(n · 2ⁿ) memory |
| **Submask enumeration** | The sub = (sub − 1) & mask loop that visits every subset of mask |
| **The 3ⁿ bound** | Total (mask, submask) pairs over all masks: three choices per element |
| **int.bit_count()** | Python 3.10+ method returning the popcount of an int |

---
**Conclusion:** Bitmask DP stores *which* items are used as the bits of one integer and makes that integer a table index, so problems that brute force over n! orders shrink to about 2ⁿ × n states. Recognise it by a small n and a question about visiting, assigning or grouping everything; then pick the state — \`dp[mask]\`, \`dp[mask][last]\`, or \`dp[mask]\` over submasks — and loop masks upward. In Python the masks can never overflow and \`bit_count()\` gives the popcount, but keep n around 16 or below for speed. For the bit tricks themselves see [bit-manipulation tricks](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews), and for the other big DP state shapes compare [equal-sum partition](/interview-question/how-do-you-check-if-an-array-can-be-partitioned-into-two-equal-sum-subsets) and [Burst Balloons](/interview-question/burst-balloons-why-does-dp-over-intervals-not-balloons-work).`,
        examples: [
          {
            label: "Mask operations and the assignment problem with dp[mask]",
            code: `from itertools import permutations


def bits(mask, n):
    return format(mask, "0" + str(n) + "b")   # e.g. 11 -> "1011"


def members(mask, n):
    return [i for i in range(n) if mask >> i & 1]


# Part 1: a set of items 0..3 stored in one integer
n = 4
mask = 0b1011                                  # items 0, 1 and 3 are in the set
print("mask " + bits(mask, n) + " = " + str(mask) + ", members " + str(members(mask, n)))
print("has item 2? " + str(mask >> 2 & 1 == 1).lower())
print("add 2:    " + bits(mask | 1 << 2, n))
print("remove 0: " + bits(mask & ~(1 << 0), n))
print("toggle 3: " + bits(mask ^ 1 << 3, n))
# int.bit_count needs Python 3.10+
print("size (popcount): " + str(mask.bit_count()))
print("lowest set bit: " + bits(mask & -mask, n))
print("full set: " + bits((1 << n) - 1, n))

# Part 2: assign 4 workers to 4 jobs, one job each, at minimum total cost
cost = [[9, 2, 7, 8],
        [6, 4, 3, 7],
        [5, 8, 1, 8],
        [7, 6, 9, 4]]


def assign(cost):
    n = len(cost)
    INF = float("inf")
    dp = [INF] * (1 << n)          # dp[mask]: cheapest way to give the jobs in mask to workers 0..popcount-1
    choice = [-1] * (1 << n)
    dp[0] = 0
    transitions = 0
    for mask in range(1 << n):     # every mask is reached only from smaller masks
        if dp[mask] == INF:
            continue
        worker = mask.bit_count()  # the next worker to place
        if worker == n:
            continue
        for job in range(n):
            if not mask >> job & 1:
                transitions += 1
                nxt = mask | 1 << job
                if dp[mask] + cost[worker][job] < dp[nxt]:
                    dp[nxt] = dp[mask] + cost[worker][job]
                    choice[nxt] = job
    full = (1 << n) - 1
    jobs, m = [0] * n, full
    for worker in range(n - 1, -1, -1):        # walk back from the full set
        jobs[worker] = choice[m]
        m ^= 1 << choice[m]
    return dp[full], jobs, transitions


best, jobs, transitions = assign(cost)
brute = min(sum(cost[w][p[w]] for w in range(4)) for p in permutations(range(4)))
print("min cost " + str(best) + " (brute force over 24 orders: " + str(brute) + ")")
print("worker -> job: " + ", ".join(str(w) + "->" + str(j) for w, j in enumerate(jobs)))
print("states: " + str(1 << 4) + ", transitions: " + str(transitions))

big = [[(w * w * 7 + j * 13 + w * j) % 23 + 1 for j in range(10)] for w in range(10)]
best10, _, t10 = assign(big)
orders = 1
for k in range(2, 11):
    orders *= k
print("n = 10: min cost " + str(best10) + ", states " + str(1 << 10) + ", transitions " + str(t10) + ", orders 10! = " + str(orders))`,
          },
          {
            label: "Held-Karp travelling salesman with dp[mask][last]",
            code: `from itertools import permutations

INF = 10 ** 9            # a big sentinel; skip it instead of adding to it


def held_karp(d):
    n = len(d)
    full = (1 << n) - 1
    # dp[mask][last]: shortest path that starts at city 0, visits exactly the cities in mask, ends at last
    dp = [[INF] * n for _ in range(1 << n)]
    parent = [[-1] * n for _ in range(1 << n)]
    dp[1][0] = 0          # mask 00001: only city 0 visited, standing at city 0, length 0
    transitions = 0
    for mask in range(1 << n):
        if not mask & 1:
            continue      # every path starts at city 0
        for last in range(n):
            if dp[mask][last] == INF:
                continue
            for nxt in range(n):
                if mask >> nxt & 1:
                    continue
                transitions += 1
                cand = dp[mask][last] + d[last][nxt]
                m2 = mask | 1 << nxt
                if cand < dp[m2][nxt]:
                    dp[m2][nxt] = cand
                    parent[m2][nxt] = last
    best, end = INF, -1
    for last in range(1, n):                     # close the loop back to city 0
        if dp[full][last] + d[last][0] < best:
            best, end = dp[full][last] + d[last][0], last
    tour, mask, cur = [], full, end
    while cur != -1:                             # walk the parents back to city 0
        tour.append(cur)
        prev = parent[mask][cur]
        mask ^= 1 << cur
        cur = prev
    tour.reverse()
    return best, tour + [0], transitions


d = [[0, 2, 9, 10, 7],
     [2, 0, 6, 4, 3],
     [9, 6, 0, 8, 5],
     [10, 4, 8, 0, 6],
     [7, 3, 5, 6, 0]]

best, tour, transitions = held_karp(d)
print("shortest tour: " + " -> ".join(str(c) for c in tour) + ", length " + str(best))

brute, tried = INF, 0
for order in permutations(range(1, 5)):          # (n-1)! orders with city 0 fixed first
    tried += 1
    path = [0] + list(order) + [0]
    brute = min(brute, sum(d[path[i]][path[i + 1]] for i in range(len(path) - 1)))
print("brute force: " + str(brute) + " after " + str(tried) + " orders")
print("held-karp: " + str(1 << 5) + " masks x 5 cities, " + str(transitions) + " transitions")

n = 12
far = [[0 if i == j else (i * 17 + j * 17 + i * j) % 40 + 5 for j in range(n)] for i in range(n)]
best12, tour12, t12 = held_karp(far)
orders = 1
for k in range(2, n):
    orders *= k
print("n = 12: length " + str(best12) + ", tour " + " -> ".join(str(c) for c in tour12))
print("n = 12: " + str(t12) + " transitions vs " + str(orders) + " brute-force orders")`,
          },
          {
            label: "Submask enumeration, the 3^n count, and fewest elevator trips",
            code: `def bits(mask, n):
    return format(mask, "0" + str(n) + "b")


def popcount(m):
    count = 0
    while m:
        m &= m - 1        # clears the lowest set bit
        count += 1
    return count


# Part 1: every submask of 1011, largest first, with the (sub - 1) & mask trick
mask = 0b1011
subs = []
sub = mask
while True:
    subs.append(bits(sub, 4))
    if sub == 0:
        break
    sub = (sub - 1) & mask
print("submasks of 1011: " + ", ".join(subs))
print("count: " + str(len(subs)) + " = 2^" + str(popcount(mask)))

# Part 2: looping over every submask of every mask costs 3^n, not 4^n
for n in (4, 8, 10):
    pairs = 0
    for m in range(1 << n):
        s = m
        while True:
            pairs += 1
            if s == 0:
                break
            s = (s - 1) & m
    print("n = " + str(n) + ": " + str(pairs) + " (mask, submask) pairs, 3^n = " + str(3 ** n) + ", 4^n = " + str(4 ** n))

# Part 3: use it - fewest elevator trips, weight limit 150, for 7 people
weights = [70, 50, 80, 40, 60, 30, 90]
LIMIT = 150
n = len(weights)
full = (1 << n) - 1
load = [0] * (1 << n)                     # load[mask]: total weight of the people in mask
for m in range(1, 1 << n):
    low = (m & -m).bit_length() - 1       # index of the lowest set bit
    load[m] = load[m & (m - 1)] + weights[low]
dp = [n + 1] * (1 << n)                   # dp[mask]: fewest trips that carry exactly mask
group = [0] * (1 << n)                # group[mask]: the last trip used for mask
dp[0] = 0
for m in range(1, 1 << n):
    s = m
    while s:                              # try every group s that could ride together
        if load[s] <= LIMIT and dp[m ^ s] + 1 < dp[m]:
            dp[m] = dp[m ^ s] + 1
            group[m] = s
        s = (s - 1) & m
print("total weight " + str(load[full]) + ", limit " + str(LIMIT) + " per trip")
print("fewest trips: " + str(dp[full]))
m = full
while m:
    g = group[m]
    print("  trip: " + ", ".join(str(weights[i]) for i in range(n) if g >> i & 1) + " (load " + str(load[g]) + ")")
    m ^= g`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"What is bitmask dynamic programming? Explain when you would reach for it, describe the state for a classic problem such as assigning n workers to n jobs or the travelling salesman problem, and show me what it looks like in JavaScript."

**What a strong answer should cover:**
- A bitmask is an integer used as a set (bit i = element i); with n elements there are 2ⁿ masks, so it fits when n is small (about 20 or less).
- The condition that makes it valid: the future depends only on *which* elements are used, not the order — replacing n! orders with 2ⁿ subsets.
- Concrete states: \`dp[mask]\` for assignment (next worker = popcount), \`dp[mask][last]\` for TSP (Held–Karp, O(n² · 2ⁿ) time, O(n · 2ⁿ) space).
- Fill order by increasing mask, the core bit operations, and submask enumeration with its 3ⁿ total cost.
- JavaScript details: bitwise operators work on 32-bit signed integers (\`1 << 31\` is negative, \`1 << 32\` is 1), there is no built-in popcount, \`Math.clz32\` finds bit positions, and \`Infinity\` is a safe sentinel.

**Code / implementation expected:** Optional — a short \`dp[mask]\` assignment or \`dp[mask][last]\` TSP in JavaScript is a strong way to show you mean it.`,
        answer: `**Target Audience:** Interview candidates who know basic dynamic programming and want the subset-as-integer technique — bits are explained from scratch  
**Difficulty:** Hard  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A delivery driver has five stops today. Halfway through the route she glances at a sticky note on the dashboard with five tick boxes, one per stop: ✓ ✓ ✗ ✓ ✗. That note — *which stops are done* — plus *where she is standing right now* is everything she needs to plan the rest of the day. It does not matter in which order the ticked stops were visited; only *which* ones and where she ended up.

Now imagine writing that sticky note as a number. Each tick box is a 0 or a 1, so five tick boxes are just a five-digit binary number. \`01011\` means stops 0, 1 and 3 are done. A computer can store that in one integer, look it up in an array instantly, and add a tick with a single operation.

That is the whole idea of **bitmask dynamic programming**: when a problem's state is "which items out of a small set have been used", store that set as the bits of an integer and use the integer as a table index. It turns problems whose brute force is n! (every order) into roughly 2ⁿ × n — the difference between "never finishes" and "a fraction of a second" for 15 or 20 items.

## 2. A Set Stored in One Integer

Number the items 0 to n − 1. A subset of them is written as an integer whose bit i is 1 when item i is in the subset.

📌 **Interview term: Bitmask** — an integer used as a set: bit i is 1 when element i is a member. With n elements there are exactly 2ⁿ masks, the integers 0 to 2ⁿ − 1.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 180" role="img" aria-label="The mask 1011 in binary. Bit 3 is 1, bit 2 is 0, bit 1 is 1, bit 0 is 1, so items 0, 1 and 3 are in the set and the integer value is 11">
  <text class="d-sub" x="135" y="44" text-anchor="middle">bit 3</text>
  <text class="d-sub" x="235" y="44" text-anchor="middle">bit 2</text>
  <text class="d-sub" x="335" y="44" text-anchor="middle">bit 1</text>
  <text class="d-sub" x="435" y="44" text-anchor="middle">bit 0</text>
  <rect class="d-box-accent" x="100" y="60" width="70" height="56" rx="8"/>
  <text class="d-text" x="135" y="94" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="200" y="60" width="70" height="56" rx="8"/>
  <text class="d-text" x="235" y="94" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="300" y="60" width="70" height="56" rx="8"/>
  <text class="d-text" x="335" y="94" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="400" y="60" width="70" height="56" rx="8"/>
  <text class="d-text" x="435" y="94" text-anchor="middle">1</text>
  <rect class="d-box" x="510" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="555" y="94" text-anchor="middle">= 11</text>
  <text class="d-sub" x="135" y="150" text-anchor="middle">item 3 in</text>
  <text class="d-sub" x="235" y="150" text-anchor="middle">item 2 out</text>
  <text class="d-sub" x="335" y="150" text-anchor="middle">item 1 in</text>
  <text class="d-sub" x="435" y="150" text-anchor="middle">item 0 in</text>
</svg>

Bit 0 is the rightmost digit. The value is 8 + 2 + 1 = 11, which is why example 1 prints \`mask 1011 = 11, members [0, 1, 3]\`.

The operations you need are all one-liners (the exact syntax for this language is in the table in section 7):

- **Is item i in the set?** shift right by i and look at the last bit.
- **Add item i:** OR with \`1 << i\`. **Remove item i:** AND with the complement of \`1 << i\`. **Toggle:** XOR with \`1 << i\`.
- **Size of the set:** count the 1 bits. 📌 **Interview term: Popcount** — the number of 1 bits in an integer ("population count").
- **Lowest member:** \`mask & -mask\` keeps only the lowest 1 bit (two's complement trick). See the [bit-manipulation tricks page](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews) and [counting set bits](/interview-question/how-do-you-count-the-number-of-set-bits-in-an-integer) for why these work.
- **Full set:** \`(1 << n) - 1\`, all n bits on.

## 3. What Bitmask DP Is

📌 **Interview term: Bitmask DP** — dynamic programming whose state includes a bitmask describing which elements have been used, visited or assigned. A cell like \`dp[mask]\` or \`dp[mask][i]\` stores the best answer for that subset.

It applies when two things are true:

1. **The future only depends on *which* items are used, not on the order they were used in.** The driver does not care whether she did stop 1 before stop 3 — only that both are done. That is the [optimal substructure](/interview-question/what-is-dynamic-programming) DP needs.
2. **n is small**, usually n ≤ 20. 2²⁰ is 1,048,576 masks — fine. 2⁴⁰ is about 10¹² — impossible. If a problem says "n ≤ 15" or "n ≤ 20" and asks about orders, assignments or groupings, bitmask DP should be your first thought.

📌 **Interview term: State compression** — encoding a whole collection of yes/no facts (a subset) as one integer so it can be a single table index. Bitmask DP is the most common kind.

📌 **Interview term: Exponential vs factorial** — 2ⁿ grows fast, but n! grows much faster: for n = 10, 2¹⁰ = 1,024 while 10! = 3,628,800. Bitmask DP wins by forgetting the *order* inside each subset.

## 4. Pattern 1 — Assignment: dp[mask]

**Problem.** n workers, n jobs, \`cost[w][j]\` to give job j to worker w. Each worker gets exactly one job. Minimise the total cost.

**Brute force.** Try every permutation: n! assignments.

**Bitmask DP.** Hand out jobs to workers in order 0, 1, 2, … Let \`dp[mask]\` = cheapest way to give the jobs in \`mask\` to the first \`popcount(mask)\` workers. The next worker to place is \`w = popcount(mask)\`, so the mask alone tells us who is next — no second dimension needed.

- Base case: \`dp[0] = 0\` (no jobs given, nobody placed).
- Transition: for each job j not in mask, \`dp[mask | 1 << j] = min(…, dp[mask] + cost[w][j])\`.
- Answer: \`dp[(1 << n) - 1]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 370" role="img" aria-label="All eight masks of three jobs arranged by how many jobs are taken. Each arrow adds one job, so every mask is reached from smaller masks">
  <path class="d-edge" d="M 300 80 L 140 130"/>
  <path class="d-edge" d="M 300 80 L 300 130"/>
  <path class="d-edge" d="M 300 80 L 460 130"/>
  <path class="d-edge" d="M 140 170 L 140 220"/>
  <path class="d-edge" d="M 140 170 L 300 220"/>
  <path class="d-edge" d="M 300 170 L 140 220"/>
  <path class="d-edge" d="M 300 170 L 460 220"/>
  <path class="d-edge" d="M 460 170 L 300 220"/>
  <path class="d-edge" d="M 460 170 L 460 220"/>
  <path class="d-edge" d="M 140 260 L 300 310"/>
  <path class="d-edge" d="M 300 260 L 300 310"/>
  <path class="d-edge" d="M 460 260 L 300 310"/>
  <rect class="d-box-accent" x="260" y="40" width="80" height="40" rx="6"/>
  <text class="d-text" x="300" y="66" text-anchor="middle">000</text>
  <rect class="d-box" x="100" y="130" width="80" height="40" rx="6"/>
  <text class="d-text" x="140" y="156" text-anchor="middle">001</text>
  <rect class="d-box" x="260" y="130" width="80" height="40" rx="6"/>
  <text class="d-text" x="300" y="156" text-anchor="middle">010</text>
  <rect class="d-box" x="420" y="130" width="80" height="40" rx="6"/>
  <text class="d-text" x="460" y="156" text-anchor="middle">100</text>
  <rect class="d-box" x="100" y="220" width="80" height="40" rx="6"/>
  <text class="d-text" x="140" y="246" text-anchor="middle">011</text>
  <rect class="d-box" x="260" y="220" width="80" height="40" rx="6"/>
  <text class="d-text" x="300" y="246" text-anchor="middle">101</text>
  <rect class="d-box" x="420" y="220" width="80" height="40" rx="6"/>
  <text class="d-text" x="460" y="246" text-anchor="middle">110</text>
  <rect class="d-box-accent" x="260" y="310" width="80" height="40" rx="6"/>
  <text class="d-text" x="300" y="336" text-anchor="middle">111</text>
  <text class="d-sub" x="530" y="66">0 taken</text>
  <text class="d-sub" x="530" y="156">1 taken</text>
  <text class="d-sub" x="530" y="246">2 taken</text>
  <text class="d-sub" x="530" y="336">3 taken</text>
</svg>

Every arrow adds exactly one bit, and adding a bit always makes the integer bigger. So simply looping \`mask\` from 0 to 2ⁿ − 1 in increasing order is a valid fill order — every mask is final before anything reads it.

📌 **Interview term: Fill order (increasing masks)** — because a superset mask is always a larger integer than any of its subsets, a plain \`for mask in 0 .. 2ⁿ − 1\` loop processes every subset before its supersets.

Example 1 solves a 4 × 4 instance: cost 13, matching the 24-permutation brute force, with 16 states and 32 transitions. At n = 10 it uses 1,024 states and 5,120 transitions instead of 10! = 3,628,800 orders.

## 5. Pattern 2 — Travelling Salesman: dp[mask][last]

**Problem.** Visit every city exactly once starting and ending at city 0, with the shortest total distance.

Here the mask is not enough: two paths that visited the same cities but stopped in different places have different futures. So the state adds the current city.

- State: \`dp[mask][last]\` = shortest path that starts at city 0, visits exactly the cities in \`mask\`, and ends at \`last\`.
- Base case: \`dp[1][0] = 0\` (mask \`…0001\`: only city 0, standing at city 0).
- Transition: from \`(mask, last)\` go to any unvisited \`next\`: \`dp[mask | 1 << next][next] = min(…, dp[mask][last] + d[last][next])\`.
- Answer: \`min over last of dp[full][last] + d[last][0]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Held Karp transition. The state mask 1011 standing at city 3 moves to city 2, giving the state mask 1111 standing at city 2, at extra cost d of 3 to 2">
  <defs>
    <marker id="b30q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="60" width="220" height="80" rx="10"/>
  <text class="d-text" x="140" y="92" text-anchor="middle">mask 1011, at 3</text>
  <text class="d-sub" x="140" y="118" text-anchor="middle">visited 0, 1, 3</text>
  <path class="d-edge-accent" d="M 254 100 L 384 100" marker-end="url(#b30q3-arrow)"/>
  <text class="d-sub" x="320" y="80" text-anchor="middle">+ d[3][2]</text>
  <rect class="d-box-accent" x="390" y="60" width="220" height="80" rx="10"/>
  <text class="d-text" x="500" y="92" text-anchor="middle">mask 1111, at 2</text>
  <text class="d-sub" x="500" y="118" text-anchor="middle">visited 0, 1, 2, 3</text>
</svg>

This is the Held–Karp algorithm (M. Held and R. M. Karp, *A dynamic programming approach to sequencing problems*, J. SIAM 1962, as cited in the [Google OR-Tools documentation](https://developers.google.com/optimization/reference/graph/hamiltonian_path)). It runs in O(n² · 2ⁿ) time instead of O(n!) — example 2 finds the best 12-city tour with 56,331 transitions, where trying every order would mean 39,916,800 tours.

📌 **Interview term: Held–Karp** — the bitmask DP for the travelling salesman problem, \`dp[mask][last]\`, O(n² · 2ⁿ) time and O(n · 2ⁿ) memory.

## 6. Pattern 3 — Splitting a Set: Iterating Over Submasks

Some problems split the items into groups: "fewest elevator trips", "fewest teams", "cheapest way to cover everyone". Then \`dp[mask]\` tries every possible *group* \`sub\` inside \`mask\` as the last group: \`dp[mask] = min(dp[mask ^ sub] + 1)\` over valid \`sub\`.

The standard trick visits every submask of \`mask\` without testing all 2ⁿ integers:

~~~text
sub = mask
while sub > 0:
    use sub
    sub = (sub - 1) & mask
~~~

Subtracting 1 turns off the lowest 1 bit and turns on every bit below it; AND-ing with \`mask\` throws away the bits that are not in \`mask\`. The result is the next smaller submask. Example 3 lists \`1011, 1010, 1001, 1000, 0011, 0010, 0001, 0000\` for \`mask = 1011\`.

📌 **Interview term: Submask enumeration** — the \`(sub - 1) & mask\` loop that visits all 2^popcount(mask) subsets of \`mask\` in decreasing order.

📌 **Interview term: The 3ⁿ bound** — summed over all masks, the submask loop runs 3ⁿ times, not 4ⁿ: each item is either outside the mask, in the mask but not the submask, or in both — three choices per item. Example 3 measures 81, 6,561 and 59,049 pairs for n = 4, 8 and 10 — exactly 3ⁿ.

## 7. Recognising a Bitmask DP Problem

| Signal in the problem | Likely state |
| :--- | :--- |
| n ≤ 20 and "visit every …", "shortest route through all …" | \`dp[mask][last]\` (Held–Karp) |
| "assign each worker one task", "match every …" | \`dp[mask]\`, next person = popcount |
| "split everyone into groups / trips / teams" | \`dp[mask]\` over submasks, O(3ⁿ) |
| "can these pieces form …" (matchsticks into a square, k equal subsets) | \`dp[mask]\` = partial progress |
| n up to 10⁵ | **not** bitmask DP — the state space would be astronomical |

Contrast with the neighbouring DP pages: [equal-sum partition](/interview-question/how-do-you-check-if-an-array-can-be-partitioned-into-two-equal-sum-subsets) indexes the table by a *sum* (small values, many items), [Burst Balloons](/interview-question/burst-balloons-why-does-dp-over-intervals-not-balloons-work) by an *interval* (order along a line matters), and bitmask DP by a *subset* (few items, arbitrary relationships). Plain [backtracking](/interview-question/what-is-backtracking) over all [permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array) is the brute force that bitmask DP replaces.

## 8. The Code in JavaScript

The bit operations in JavaScript:

| Operation | JavaScript | Note |
| :--- | :--- | :--- |
| item i in mask? | \`(mask >> i) & 1\` | write the parentheses; \`===\` binds tighter than \`&\` |
| add / remove / toggle i | \`mask \\| (1 << i)\`, \`mask & ~(1 << i)\`, \`mask ^ (1 << i)\` | operands become 32-bit integers |
| popcount | write it: \`while (m) { m &= m - 1; c++; }\` | there is no built-in popcount for numbers |
| lowest set bit | \`mask & -mask\` | index: \`31 - Math.clz32(mask & -mask)\` |
| full set | \`(1 << n) - 1\` | only valid for n ≤ 30 (see below) |

The assignment DP from section 4:

~~~javascript
function assign(cost) {
  const n = cost.length;
  const dp = new Array(1 << n).fill(Infinity); // dp[mask]: cheapest way to give the jobs in mask to workers 0..popcount-1
  const choice = new Array(1 << n).fill(-1);
  dp[0] = 0;
  let transitions = 0;
  for (let mask = 0; mask < (1 << n); mask++) { // every mask is reached only from smaller masks
    if (dp[mask] === Infinity) continue;
    const worker = popcount(mask);              // the next worker to place
    if (worker === n) continue;
    for (let job = 0; job < n; job++) {
      if ((mask >> job) & 1) continue;
      transitions++;
      const nxt = mask | (1 << job);
      if (dp[mask] + cost[worker][job] < dp[nxt]) {
        dp[nxt] = dp[mask] + cost[worker][job];
        choice[nxt] = job;
      }
    }
  }
  const full = (1 << n) - 1;
  const jobs = new Array(n).fill(0);
  let m = full;
  for (let worker = n - 1; worker >= 0; worker--) { // walk back from the full set
    jobs[worker] = choice[m];
    m ^= 1 << choice[m];
  }
  return { best: dp[full], jobs, transitions };
}
~~~

**What to point out in this code:**

- JavaScript bitwise operators convert their operands to 32-bit signed integers ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Left_shift)). In a quick check, \`1 << 31\` gave \`-2147483648\` and \`1 << 32\` gave \`1\`. Masks are therefore safe for n ≤ 30, which is far beyond any feasible DP table anyway.
- There is no popcount for numbers, so the example writes the classic loop \`m &= m - 1\` (each step clears the lowest 1 bit). \`31 - Math.clz32(m & -m)\` gives the index of the lowest set bit (example 3).
- **Precedence:** \`===\` and \`==\` bind tighter than \`&\`. \`mask & 1 << 2 == 0\` is parsed as \`mask & ((1 << 2) == 0)\`, which is \`mask & false\`, which is \`0\` — a check that is always falsy. Always parenthesise: \`(mask & (1 << j)) === 0\`.
- \`Infinity\` is a safe sentinel: \`Infinity + 5\` is \`Infinity\` and compares correctly. The example still skips unreachable masks.
- \`new Array(1 << n).fill(Infinity)\` is fine for a flat table; for Held–Karp use \`Array.from({ length: 1 << n }, () => new Array(n).fill(INF))\`, never \`.fill(new Array(n))\`, which shares one row.
- For large n a typed array (\`new Int32Array(1 << n)\`) uses far less memory than an array of numbers and starts zeroed.

## 9. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\` (Node.js 22; the code is plain browser-safe JavaScript, so it also runs in the page). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — mask operations and the assignment problem** prints:

~~~text
mask 1011 = 11, members [0, 1, 3]
has item 2? false
add 2:    1111
remove 0: 1010
toggle 3: 0011
size (popcount): 3
lowest set bit: 0001
full set: 1111
min cost 13 (brute force over 24 orders: 13)
worker -> job: 0->1, 1->0, 2->2, 3->3
states: 16, transitions: 32
n = 10: min cost 42, states 1024, transitions 5120, orders 10! = 3628800
~~~

**Example 2 — Held–Karp travelling salesman with tour reconstruction** prints:

~~~text
shortest tour: 0 -> 4 -> 2 -> 3 -> 1 -> 0, length 26
brute force: 26 after 24 orders
held-karp: 32 masks x 5 cities, 52 transitions
n = 12: length 146, tour 0 -> 10 -> 6 -> 1 -> 8 -> 9 -> 5 -> 11 -> 2 -> 7 -> 4 -> 3 -> 0
n = 12: 56331 transitions vs 39916800 brute-force orders
~~~

The 5-city tour 0 → 4 → 2 → 3 → 1 → 0 costs 7 + 5 + 8 + 4 + 2 = 26, which the 24-order brute force confirms.

**Example 3 — submask enumeration, the 3ⁿ count, and fewest elevator trips** prints:

~~~text
submasks of 1011: 1011, 1010, 1001, 1000, 0011, 0010, 0001, 0000
count: 8 = 2^3
n = 4: 81 (mask, submask) pairs, 3^n = 81, 4^n = 256
n = 8: 6561 (mask, submask) pairs, 3^n = 6561, 4^n = 65536
n = 10: 59049 (mask, submask) pairs, 3^n = 59049, 4^n = 1048576
total weight 420, limit 150 per trip
fewest trips: 3
  trip: 30, 90 (load 120)
  trip: 50, 40, 60 (load 150)
  trip: 70, 80 (load 150)
~~~

Seven people weighing 420 in total cannot ride in two trips of 150, and the DP finds a 3-trip split; the order the trips print in is the order the reconstruction peels them off.

## 10. Complexity

| Pattern | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force over all orders | O(n · n!) | O(n) | n! permutations, O(n) to score each |
| Assignment \`dp[mask]\` | O(n · 2ⁿ) | O(2ⁿ) | 2ⁿ masks, up to n jobs to try from each |
| Held–Karp \`dp[mask][last]\` | O(n² · 2ⁿ) | O(n · 2ⁿ) | 2ⁿ · n states, n next cities from each |
| Groups via submasks | O(3ⁿ) | O(2ⁿ) | every (mask, submask) pair once |

For a feel of the limits: at n = 20, \`dp[mask][last]\` has 2²⁰ × 20 = 20,971,520 cells — about 84 MB if each is a 4-byte integer — and the transitions number in the hundreds of millions. That is why problems with bitmask DP usually say n ≤ 16 to 20.

## 11. Edge Cases

- **n = 0 or n = 1.** One mask (0) or two masks; make sure the full-set index \`(1 << n) - 1\` and the base case still make sense (for TSP with one city the tour length is 0).
- **Unreachable states.** Many \`(mask, last)\` pairs are impossible (for example a mask without city 0). Initialise them to a large sentinel and **skip** them; never add a distance to the sentinel itself.
- **The sentinel overflowing.** In fixed-width integer languages, \`INT_MAX + d\` overflows. Either skip INF states (as the examples do) or pick a sentinel like 10⁹ that leaves headroom.
- **Masks that do not fit the integer type.** 32-bit integers hold masks for n ≤ 31 at most (and fewer with signed types); 64-bit for n ≤ 63 — far beyond what a DP table could store anyway.
- **Ties.** Several tours or assignments can share the minimum. With a strict \`<\` the first one found wins, which keeps the reconstructed answer deterministic.

## Common Pitfalls

- **Missing parentheses around \`&\`.** \`mask & 1 << j == 0\` is always \`0\`; write \`(mask & (1 << j)) === 0\`.
- **Masks wider than 30 bits.** \`1 << 31\` is negative and \`1 << 32\` is \`1\`; use \`BigInt\` or rethink the state (n that large is not bitmask-DP-sized anyway).
- **Shared rows** from \`new Array(k).fill([])\` or \`.fill(new Array(n))\` in a 2-D table.
- **Expecting a built-in popcount.** There is none for numbers; write the \`m &= m - 1\` loop or keep a precomputed table.
- **Using a mask where order matters.** If two orders of the same set have different futures (and you cannot add a "last" dimension), bitmask DP is the wrong tool.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Bitmask DP is DP whose state includes an integer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mask</code> whose bit i says whether item i is used, visited or assigned.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When:</strong> <span style="color:#f0e2c8;">When the future depends only on *which* items are used (not their order) and n is small, about n ≤ 20 — it replaces n! orders with 2ⁿ subsets.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Patterns:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[mask]</code> for assignment (next worker = popcount), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[mask][last]</code> for TSP (Held–Karp, O(n²·2ⁿ)), submask loops <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sub = (sub - 1) &amp; mask</code> for grouping, O(3ⁿ).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Order:</strong> <span style="color:#f0e2c8;">A superset is a bigger integer, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (let mask = 0; mask &lt; (1 &lt;&lt; n); mask++)</code> is a valid fill order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Bitwise ops are 32-bit signed, so masks are safe for n ≤ 30; no built-in popcount; parenthesise every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the assignment state just <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dp[mask]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Workers are placed in a fixed order, so the number of jobs taken (the popcount of the mask) already tells you which worker is next. An extra index would be redundant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does TSP need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dp[mask][last]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two partial routes with the same visited set but different end cities have different costs to continue, so the end city must be part of the state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the submask loop 3ⁿ in total?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For each item there are three cases: not in the mask, in the mask but not the submask, in both. That gives 3ⁿ pairs; example 3 counts 59,049 for n = 10.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">1 &lt;&lt; 32</code> in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The shift count is taken modulo 32 and the operands are 32-bit, so it gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1</code>, not 4294967296. Masks must stay within 30 bits (or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code>).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you print the actual tour or assignment?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store the choice for each state (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[mask][city]</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">choice[mask]</code>) and walk back from the full mask, removing one bit at a time.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bitmask** | An integer used as a set: bit i is 1 when element i is a member |
| **Popcount** | The number of 1 bits in an integer — the size of the set |
| **Bitmask DP** | DP whose state includes a bitmask of which elements are used, visited or assigned |
| **State compression** | Encoding a collection of yes/no facts as one integer so it can index a table |
| **Exponential vs factorial** | 2ⁿ (bitmask DP) grows far more slowly than n! (all orders) |
| **Fill order (increasing masks)** | Supersets are larger integers, so looping masks upward is a valid DP order |
| **Held–Karp** | TSP bitmask DP dp[mask][last]: O(n² · 2ⁿ) time, O(n · 2ⁿ) memory |
| **Submask enumeration** | The sub = (sub − 1) & mask loop that visits every subset of mask |
| **The 3ⁿ bound** | Total (mask, submask) pairs over all masks: three choices per element |
| **32-bit bitwise conversion** | JavaScript converts number operands of bitwise operators to 32-bit signed integers |

---
**Conclusion:** Bitmask DP stores *which* items are used as the bits of one integer and makes that integer a table index, so problems that brute force over n! orders shrink to about 2ⁿ × n states. Recognise it by a small n and a question about visiting, assigning or grouping everything; then pick the state — \`dp[mask]\`, \`dp[mask][last]\`, or \`dp[mask]\` over submasks — and loop masks upward. In JavaScript remember that bitwise operators are 32-bit, that there is no built-in popcount, and that \`&\` needs parentheses next to \`===\`. For the bit tricks themselves see [bit-manipulation tricks](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews), and for the other big DP state shapes compare [equal-sum partition](/interview-question/how-do-you-check-if-an-array-can-be-partitioned-into-two-equal-sum-subsets) and [Burst Balloons](/interview-question/burst-balloons-why-does-dp-over-intervals-not-balloons-work).`,
        examples: [
          {
            label: "Mask operations and the assignment problem with dp[mask]",
            code: `function bits(mask, n) {
  return mask.toString(2).padStart(n, "0");    // e.g. 11 -> "1011"
}

function members(mask, n) {
  const out = [];
  for (let i = 0; i < n; i++) if ((mask >> i) & 1) out.push(i);
  return "[" + out.join(", ") + "]";
}

function popcount(m) {                          // JavaScript has no built-in popcount
  let count = 0;
  while (m !== 0) {
    m &= m - 1;                                 // clears the lowest set bit
    count++;
  }
  return count;
}

// Part 1: a set of items 0..3 stored in one integer
const n = 4;
const mask = 0b1011;                            // items 0, 1 and 3 are in the set
console.log("mask " + bits(mask, n) + " = " + mask + ", members " + members(mask, n));
console.log("has item 2? " + (((mask >> 2) & 1) === 1));
console.log("add 2:    " + bits(mask | (1 << 2), n));
console.log("remove 0: " + bits(mask & ~(1 << 0), n));
console.log("toggle 3: " + bits(mask ^ (1 << 3), n));
console.log("size (popcount): " + popcount(mask));
console.log("lowest set bit: " + bits(mask & -mask, n));
console.log("full set: " + bits((1 << n) - 1, n));

// Part 2: assign 4 workers to 4 jobs, one job each, at minimum total cost
const cost = [[9, 2, 7, 8],
              [6, 4, 3, 7],
              [5, 8, 1, 8],
              [7, 6, 9, 4]];

function assign(cost) {
  const n = cost.length;
  const dp = new Array(1 << n).fill(Infinity); // dp[mask]: cheapest way to give the jobs in mask to workers 0..popcount-1
  const choice = new Array(1 << n).fill(-1);
  dp[0] = 0;
  let transitions = 0;
  for (let mask = 0; mask < (1 << n); mask++) { // every mask is reached only from smaller masks
    if (dp[mask] === Infinity) continue;
    const worker = popcount(mask);              // the next worker to place
    if (worker === n) continue;
    for (let job = 0; job < n; job++) {
      if ((mask >> job) & 1) continue;
      transitions++;
      const nxt = mask | (1 << job);
      if (dp[mask] + cost[worker][job] < dp[nxt]) {
        dp[nxt] = dp[mask] + cost[worker][job];
        choice[nxt] = job;
      }
    }
  }
  const full = (1 << n) - 1;
  const jobs = new Array(n).fill(0);
  let m = full;
  for (let worker = n - 1; worker >= 0; worker--) { // walk back from the full set
    jobs[worker] = choice[m];
    m ^= 1 << choice[m];
  }
  return { best: dp[full], jobs, transitions };
}

function bruteMin(cost, worker, used) {
  if (worker === cost.length) return 0;
  let best = Infinity;
  for (let job = 0; job < cost.length; job++) {
    if (used[job]) continue;
    used[job] = true;
    best = Math.min(best, cost[worker][job] + bruteMin(cost, worker + 1, used));
    used[job] = false;
  }
  return best;
}

const r = assign(cost);
const brute = bruteMin(cost, 0, new Array(4).fill(false));
console.log("min cost " + r.best + " (brute force over 24 orders: " + brute + ")");
console.log("worker -> job: " + r.jobs.map((j, w) => w + "->" + j).join(", "));
console.log("states: " + (1 << 4) + ", transitions: " + r.transitions);

const big = Array.from({ length: 10 }, (_, w) =>
  Array.from({ length: 10 }, (_, j) => (w * w * 7 + j * 13 + w * j) % 23 + 1));
const r10 = assign(big);
let orders = 1;
for (let k = 2; k <= 10; k++) orders *= k;
console.log("n = 10: min cost " + r10.best + ", states " + (1 << 10) + ", transitions " + r10.transitions + ", orders 10! = " + orders);`,
          },
          {
            label: "Held-Karp travelling salesman with dp[mask][last]",
            code: `const INF = 1e9;              // a big sentinel; skip it instead of adding to it

function heldKarp(d) {
  const n = d.length;
  const full = (1 << n) - 1;
  // dp[mask][last]: shortest path that starts at city 0, visits exactly the cities in mask, ends at last
  const dp = Array.from({ length: 1 << n }, () => new Array(n).fill(INF));
  const parent = Array.from({ length: 1 << n }, () => new Array(n).fill(-1));
  dp[1][0] = 0;               // mask 00001: only city 0 visited, standing at city 0, length 0
  let transitions = 0;
  for (let mask = 0; mask < (1 << n); mask++) {
    if (!(mask & 1)) continue;                 // every path starts at city 0
    for (let last = 0; last < n; last++) {
      if (dp[mask][last] === INF) continue;
      for (let nxt = 0; nxt < n; nxt++) {
        if ((mask >> nxt) & 1) continue;
        transitions++;
        const cand = dp[mask][last] + d[last][nxt];
        const m2 = mask | (1 << nxt);
        if (cand < dp[m2][nxt]) {
          dp[m2][nxt] = cand;
          parent[m2][nxt] = last;
        }
      }
    }
  }
  let best = INF, end = -1;
  for (let last = 1; last < n; last++) {       // close the loop back to city 0
    if (dp[full][last] + d[last][0] < best) {
      best = dp[full][last] + d[last][0];
      end = last;
    }
  }
  const tour = [];
  let mask = full, cur = end;
  while (cur !== -1) {                         // walk the parents back to city 0
    tour.push(cur);
    const prev = parent[mask][cur];
    mask ^= 1 << cur;
    cur = prev;
  }
  tour.reverse();
  tour.push(0);
  return { best, tour, transitions };
}

const d = [[0, 2, 9, 10, 7],
           [2, 0, 6, 4, 3],
           [9, 6, 0, 8, 5],
           [10, 4, 8, 0, 6],
           [7, 3, 5, 6, 0]];

const r = heldKarp(d);
console.log("shortest tour: " + r.tour.join(" -> ") + ", length " + r.best);

let brute = INF, tried = 0;
function permute(path, used) {                 // (n-1)! orders with city 0 fixed first
  if (path.length === 5) {
    tried++;
    let len = 0;
    const full = path.concat([0]);
    for (let i = 0; i + 1 < full.length; i++) len += d[full[i]][full[i + 1]];
    brute = Math.min(brute, len);
    return;
  }
  for (let c = 1; c < 5; c++) {
    if (used[c]) continue;
    used[c] = true;
    path.push(c);
    permute(path, used);
    path.pop();
    used[c] = false;
  }
}
permute([0], new Array(5).fill(false));
console.log("brute force: " + brute + " after " + tried + " orders");
console.log("held-karp: " + (1 << 5) + " masks x 5 cities, " + r.transitions + " transitions");

const n = 12;
const far = Array.from({ length: n }, (_, i) =>
  Array.from({ length: n }, (_, j) => (i === j ? 0 : (i * 17 + j * 17 + i * j) % 40 + 5)));
const r12 = heldKarp(far);
let orders = 1;
for (let k = 2; k < n; k++) orders *= k;
console.log("n = 12: length " + r12.best + ", tour " + r12.tour.join(" -> "));
console.log("n = 12: " + r12.transitions + " transitions vs " + orders + " brute-force orders");`,
          },
          {
            label: "Submask enumeration, the 3^n count, and fewest elevator trips",
            code: `function bits(mask, n) {
  return mask.toString(2).padStart(n, "0");
}

function popcount(m) {
  let count = 0;
  while (m !== 0) {
    m &= m - 1;           // clears the lowest set bit
    count++;
  }
  return count;
}

// Part 1: every submask of 1011, largest first, with the (sub - 1) & mask trick
const mask = 0b1011;
const subs = [];
let sub = mask;
while (true) {
  subs.push(bits(sub, 4));
  if (sub === 0) break;
  sub = (sub - 1) & mask;
}
console.log("submasks of 1011: " + subs.join(", "));
console.log("count: " + subs.length + " = 2^" + popcount(mask));

// Part 2: looping over every submask of every mask costs 3^n, not 4^n
for (const n of [4, 8, 10]) {
  let pairs = 0;
  for (let m = 0; m < (1 << n); m++) {
    let s = m;
    while (true) {
      pairs++;
      if (s === 0) break;
      s = (s - 1) & m;
    }
  }
  console.log("n = " + n + ": " + pairs + " (mask, submask) pairs, 3^n = " + 3 ** n + ", 4^n = " + 4 ** n);
}

// Part 3: use it - fewest elevator trips, weight limit 150, for 7 people
const weights = [70, 50, 80, 40, 60, 30, 90];
const LIMIT = 150;
const n = weights.length;
const full = (1 << n) - 1;
const load = new Array(1 << n).fill(0);     // load[mask]: total weight of the people in mask
for (let m = 1; m < (1 << n); m++) {
  const low = 31 - Math.clz32(m & -m);      // index of the lowest set bit
  load[m] = load[m & (m - 1)] + weights[low];
}
const dp = new Array(1 << n).fill(n + 1);   // dp[mask]: fewest trips that carry exactly mask
const group = new Array(1 << n).fill(0);    // group[mask]: the last trip used for mask
dp[0] = 0;
for (let m = 1; m < (1 << n); m++) {
  for (let s = m; s !== 0; s = (s - 1) & m) {  // try every group s that could ride together
    if (load[s] <= LIMIT && dp[m ^ s] + 1 < dp[m]) {
      dp[m] = dp[m ^ s] + 1;
      group[m] = s;
    }
  }
}
console.log("total weight " + load[full] + ", limit " + LIMIT + " per trip");
console.log("fewest trips: " + dp[full]); // 3
for (let m = full; m !== 0; m ^= group[m]) {
  const g = group[m];
  const riders = weights.filter((_, i) => (g >> i) & 1);
  console.log("  trip: " + riders.join(", ") + " (load " + load[g] + ")");
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"What is bitmask dynamic programming? Explain when you would reach for it, describe the state for a classic problem such as assigning n workers to n jobs or the travelling salesman problem, and show me what it looks like in Java."

**What a strong answer should cover:**
- A bitmask is an integer used as a set (bit i = element i); with n elements there are 2ⁿ masks, so it fits when n is small (about 20 or less).
- The condition that makes it valid: the future depends only on *which* elements are used, not the order — replacing n! orders with 2ⁿ subsets.
- Concrete states: \`dp[mask]\` for assignment (next worker = popcount), \`dp[mask][last]\` for TSP (Held–Karp, O(n² · 2ⁿ) time, O(n · 2ⁿ) space).
- Fill order by increasing mask, the core bit operations, and submask enumeration with its 3ⁿ total cost.
- Java details: \`int\` masks up to n ≤ 30 and \`1L << n\` beyond, shift distances taken modulo 32 (\`1 << 32 == 1\`), \`Integer.bitCount\` / \`numberOfTrailingZeros\`, the \`Integer.MAX_VALUE + x\` overflow trap, and \`new int[n][1 << n]\` vs \`new int[1 << n][n]\` memory.

**Code / implementation expected:** Optional — a short \`dp[mask]\` assignment or \`dp[mask][last]\` TSP in Java is a strong way to show you mean it.`,
        answer: `**Target Audience:** Interview candidates who know basic dynamic programming and want the subset-as-integer technique — bits are explained from scratch  
**Difficulty:** Hard  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A delivery driver has five stops today. Halfway through the route she glances at a sticky note on the dashboard with five tick boxes, one per stop: ✓ ✓ ✗ ✓ ✗. That note — *which stops are done* — plus *where she is standing right now* is everything she needs to plan the rest of the day. It does not matter in which order the ticked stops were visited; only *which* ones and where she ended up.

Now imagine writing that sticky note as a number. Each tick box is a 0 or a 1, so five tick boxes are just a five-digit binary number. \`01011\` means stops 0, 1 and 3 are done. A computer can store that in one integer, look it up in an array instantly, and add a tick with a single operation.

That is the whole idea of **bitmask dynamic programming**: when a problem's state is "which items out of a small set have been used", store that set as the bits of an integer and use the integer as a table index. It turns problems whose brute force is n! (every order) into roughly 2ⁿ × n — the difference between "never finishes" and "a fraction of a second" for 15 or 20 items.

## 2. A Set Stored in One Integer

Number the items 0 to n − 1. A subset of them is written as an integer whose bit i is 1 when item i is in the subset.

📌 **Interview term: Bitmask** — an integer used as a set: bit i is 1 when element i is a member. With n elements there are exactly 2ⁿ masks, the integers 0 to 2ⁿ − 1.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 180" role="img" aria-label="The mask 1011 in binary. Bit 3 is 1, bit 2 is 0, bit 1 is 1, bit 0 is 1, so items 0, 1 and 3 are in the set and the integer value is 11">
  <text class="d-sub" x="135" y="44" text-anchor="middle">bit 3</text>
  <text class="d-sub" x="235" y="44" text-anchor="middle">bit 2</text>
  <text class="d-sub" x="335" y="44" text-anchor="middle">bit 1</text>
  <text class="d-sub" x="435" y="44" text-anchor="middle">bit 0</text>
  <rect class="d-box-accent" x="100" y="60" width="70" height="56" rx="8"/>
  <text class="d-text" x="135" y="94" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="200" y="60" width="70" height="56" rx="8"/>
  <text class="d-text" x="235" y="94" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="300" y="60" width="70" height="56" rx="8"/>
  <text class="d-text" x="335" y="94" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="400" y="60" width="70" height="56" rx="8"/>
  <text class="d-text" x="435" y="94" text-anchor="middle">1</text>
  <rect class="d-box" x="510" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="555" y="94" text-anchor="middle">= 11</text>
  <text class="d-sub" x="135" y="150" text-anchor="middle">item 3 in</text>
  <text class="d-sub" x="235" y="150" text-anchor="middle">item 2 out</text>
  <text class="d-sub" x="335" y="150" text-anchor="middle">item 1 in</text>
  <text class="d-sub" x="435" y="150" text-anchor="middle">item 0 in</text>
</svg>

Bit 0 is the rightmost digit. The value is 8 + 2 + 1 = 11, which is why example 1 prints \`mask 1011 = 11, members [0, 1, 3]\`.

The operations you need are all one-liners (the exact syntax for this language is in the table in section 7):

- **Is item i in the set?** shift right by i and look at the last bit.
- **Add item i:** OR with \`1 << i\`. **Remove item i:** AND with the complement of \`1 << i\`. **Toggle:** XOR with \`1 << i\`.
- **Size of the set:** count the 1 bits. 📌 **Interview term: Popcount** — the number of 1 bits in an integer ("population count").
- **Lowest member:** \`mask & -mask\` keeps only the lowest 1 bit (two's complement trick). See the [bit-manipulation tricks page](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews) and [counting set bits](/interview-question/how-do-you-count-the-number-of-set-bits-in-an-integer) for why these work.
- **Full set:** \`(1 << n) - 1\`, all n bits on.

## 3. What Bitmask DP Is

📌 **Interview term: Bitmask DP** — dynamic programming whose state includes a bitmask describing which elements have been used, visited or assigned. A cell like \`dp[mask]\` or \`dp[mask][i]\` stores the best answer for that subset.

It applies when two things are true:

1. **The future only depends on *which* items are used, not on the order they were used in.** The driver does not care whether she did stop 1 before stop 3 — only that both are done. That is the [optimal substructure](/interview-question/what-is-dynamic-programming) DP needs.
2. **n is small**, usually n ≤ 20. 2²⁰ is 1,048,576 masks — fine. 2⁴⁰ is about 10¹² — impossible. If a problem says "n ≤ 15" or "n ≤ 20" and asks about orders, assignments or groupings, bitmask DP should be your first thought.

📌 **Interview term: State compression** — encoding a whole collection of yes/no facts (a subset) as one integer so it can be a single table index. Bitmask DP is the most common kind.

📌 **Interview term: Exponential vs factorial** — 2ⁿ grows fast, but n! grows much faster: for n = 10, 2¹⁰ = 1,024 while 10! = 3,628,800. Bitmask DP wins by forgetting the *order* inside each subset.

## 4. Pattern 1 — Assignment: dp[mask]

**Problem.** n workers, n jobs, \`cost[w][j]\` to give job j to worker w. Each worker gets exactly one job. Minimise the total cost.

**Brute force.** Try every permutation: n! assignments.

**Bitmask DP.** Hand out jobs to workers in order 0, 1, 2, … Let \`dp[mask]\` = cheapest way to give the jobs in \`mask\` to the first \`popcount(mask)\` workers. The next worker to place is \`w = popcount(mask)\`, so the mask alone tells us who is next — no second dimension needed.

- Base case: \`dp[0] = 0\` (no jobs given, nobody placed).
- Transition: for each job j not in mask, \`dp[mask | 1 << j] = min(…, dp[mask] + cost[w][j])\`.
- Answer: \`dp[(1 << n) - 1]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 370" role="img" aria-label="All eight masks of three jobs arranged by how many jobs are taken. Each arrow adds one job, so every mask is reached from smaller masks">
  <path class="d-edge" d="M 300 80 L 140 130"/>
  <path class="d-edge" d="M 300 80 L 300 130"/>
  <path class="d-edge" d="M 300 80 L 460 130"/>
  <path class="d-edge" d="M 140 170 L 140 220"/>
  <path class="d-edge" d="M 140 170 L 300 220"/>
  <path class="d-edge" d="M 300 170 L 140 220"/>
  <path class="d-edge" d="M 300 170 L 460 220"/>
  <path class="d-edge" d="M 460 170 L 300 220"/>
  <path class="d-edge" d="M 460 170 L 460 220"/>
  <path class="d-edge" d="M 140 260 L 300 310"/>
  <path class="d-edge" d="M 300 260 L 300 310"/>
  <path class="d-edge" d="M 460 260 L 300 310"/>
  <rect class="d-box-accent" x="260" y="40" width="80" height="40" rx="6"/>
  <text class="d-text" x="300" y="66" text-anchor="middle">000</text>
  <rect class="d-box" x="100" y="130" width="80" height="40" rx="6"/>
  <text class="d-text" x="140" y="156" text-anchor="middle">001</text>
  <rect class="d-box" x="260" y="130" width="80" height="40" rx="6"/>
  <text class="d-text" x="300" y="156" text-anchor="middle">010</text>
  <rect class="d-box" x="420" y="130" width="80" height="40" rx="6"/>
  <text class="d-text" x="460" y="156" text-anchor="middle">100</text>
  <rect class="d-box" x="100" y="220" width="80" height="40" rx="6"/>
  <text class="d-text" x="140" y="246" text-anchor="middle">011</text>
  <rect class="d-box" x="260" y="220" width="80" height="40" rx="6"/>
  <text class="d-text" x="300" y="246" text-anchor="middle">101</text>
  <rect class="d-box" x="420" y="220" width="80" height="40" rx="6"/>
  <text class="d-text" x="460" y="246" text-anchor="middle">110</text>
  <rect class="d-box-accent" x="260" y="310" width="80" height="40" rx="6"/>
  <text class="d-text" x="300" y="336" text-anchor="middle">111</text>
  <text class="d-sub" x="530" y="66">0 taken</text>
  <text class="d-sub" x="530" y="156">1 taken</text>
  <text class="d-sub" x="530" y="246">2 taken</text>
  <text class="d-sub" x="530" y="336">3 taken</text>
</svg>

Every arrow adds exactly one bit, and adding a bit always makes the integer bigger. So simply looping \`mask\` from 0 to 2ⁿ − 1 in increasing order is a valid fill order — every mask is final before anything reads it.

📌 **Interview term: Fill order (increasing masks)** — because a superset mask is always a larger integer than any of its subsets, a plain \`for mask in 0 .. 2ⁿ − 1\` loop processes every subset before its supersets.

Example 1 solves a 4 × 4 instance: cost 13, matching the 24-permutation brute force, with 16 states and 32 transitions. At n = 10 it uses 1,024 states and 5,120 transitions instead of 10! = 3,628,800 orders.

## 5. Pattern 2 — Travelling Salesman: dp[mask][last]

**Problem.** Visit every city exactly once starting and ending at city 0, with the shortest total distance.

Here the mask is not enough: two paths that visited the same cities but stopped in different places have different futures. So the state adds the current city.

- State: \`dp[mask][last]\` = shortest path that starts at city 0, visits exactly the cities in \`mask\`, and ends at \`last\`.
- Base case: \`dp[1][0] = 0\` (mask \`…0001\`: only city 0, standing at city 0).
- Transition: from \`(mask, last)\` go to any unvisited \`next\`: \`dp[mask | 1 << next][next] = min(…, dp[mask][last] + d[last][next])\`.
- Answer: \`min over last of dp[full][last] + d[last][0]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Held Karp transition. The state mask 1011 standing at city 3 moves to city 2, giving the state mask 1111 standing at city 2, at extra cost d of 3 to 2">
  <defs>
    <marker id="b30q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="60" width="220" height="80" rx="10"/>
  <text class="d-text" x="140" y="92" text-anchor="middle">mask 1011, at 3</text>
  <text class="d-sub" x="140" y="118" text-anchor="middle">visited 0, 1, 3</text>
  <path class="d-edge-accent" d="M 254 100 L 384 100" marker-end="url(#b30q3-arrow)"/>
  <text class="d-sub" x="320" y="80" text-anchor="middle">+ d[3][2]</text>
  <rect class="d-box-accent" x="390" y="60" width="220" height="80" rx="10"/>
  <text class="d-text" x="500" y="92" text-anchor="middle">mask 1111, at 2</text>
  <text class="d-sub" x="500" y="118" text-anchor="middle">visited 0, 1, 2, 3</text>
</svg>

This is the Held–Karp algorithm (M. Held and R. M. Karp, *A dynamic programming approach to sequencing problems*, J. SIAM 1962, as cited in the [Google OR-Tools documentation](https://developers.google.com/optimization/reference/graph/hamiltonian_path)). It runs in O(n² · 2ⁿ) time instead of O(n!) — example 2 finds the best 12-city tour with 56,331 transitions, where trying every order would mean 39,916,800 tours.

📌 **Interview term: Held–Karp** — the bitmask DP for the travelling salesman problem, \`dp[mask][last]\`, O(n² · 2ⁿ) time and O(n · 2ⁿ) memory.

## 6. Pattern 3 — Splitting a Set: Iterating Over Submasks

Some problems split the items into groups: "fewest elevator trips", "fewest teams", "cheapest way to cover everyone". Then \`dp[mask]\` tries every possible *group* \`sub\` inside \`mask\` as the last group: \`dp[mask] = min(dp[mask ^ sub] + 1)\` over valid \`sub\`.

The standard trick visits every submask of \`mask\` without testing all 2ⁿ integers:

~~~text
sub = mask
while sub > 0:
    use sub
    sub = (sub - 1) & mask
~~~

Subtracting 1 turns off the lowest 1 bit and turns on every bit below it; AND-ing with \`mask\` throws away the bits that are not in \`mask\`. The result is the next smaller submask. Example 3 lists \`1011, 1010, 1001, 1000, 0011, 0010, 0001, 0000\` for \`mask = 1011\`.

📌 **Interview term: Submask enumeration** — the \`(sub - 1) & mask\` loop that visits all 2^popcount(mask) subsets of \`mask\` in decreasing order.

📌 **Interview term: The 3ⁿ bound** — summed over all masks, the submask loop runs 3ⁿ times, not 4ⁿ: each item is either outside the mask, in the mask but not the submask, or in both — three choices per item. Example 3 measures 81, 6,561 and 59,049 pairs for n = 4, 8 and 10 — exactly 3ⁿ.

## 7. Recognising a Bitmask DP Problem

| Signal in the problem | Likely state |
| :--- | :--- |
| n ≤ 20 and "visit every …", "shortest route through all …" | \`dp[mask][last]\` (Held–Karp) |
| "assign each worker one task", "match every …" | \`dp[mask]\`, next person = popcount |
| "split everyone into groups / trips / teams" | \`dp[mask]\` over submasks, O(3ⁿ) |
| "can these pieces form …" (matchsticks into a square, k equal subsets) | \`dp[mask]\` = partial progress |
| n up to 10⁵ | **not** bitmask DP — the state space would be astronomical |

Contrast with the neighbouring DP pages: [equal-sum partition](/interview-question/how-do-you-check-if-an-array-can-be-partitioned-into-two-equal-sum-subsets) indexes the table by a *sum* (small values, many items), [Burst Balloons](/interview-question/burst-balloons-why-does-dp-over-intervals-not-balloons-work) by an *interval* (order along a line matters), and bitmask DP by a *subset* (few items, arbitrary relationships). Plain [backtracking](/interview-question/what-is-backtracking) over all [permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array) is the brute force that bitmask DP replaces.

## 8. The Code in Java

The bit operations in Java:

| Operation | Java | Note |
| :--- | :--- | :--- |
| item i in mask? | \`(mask >> i & 1) == 1\` | parentheses needed: \`==\` binds tighter than \`&\`, and \`int & boolean\` does not compile |
| add / remove / toggle i | \`mask \\| 1 << i\`, \`mask & ~(1 << i)\`, \`mask ^ 1 << i\` | |
| popcount | \`Integer.bitCount(mask)\` | \`Long.bitCount\` for \`long\` masks |
| lowest set bit | \`mask & -mask\` or \`Integer.lowestOneBit(mask)\` | index: \`Integer.numberOfTrailingZeros(mask)\` |
| full set | \`(1 << n) - 1\` | use \`1L << n\` once n reaches 31 |

The assignment DP from section 4:

~~~java
static int assign(int[][] cost) {
    int n = cost.length;
    int[] dp = new int[1 << n];        // dp[mask]: cheapest way to give the jobs in mask to workers 0..popcount-1
    int[] choice = new int[1 << n];
    java.util.Arrays.fill(dp, INF);
    dp[0] = 0;
    int transitions = 0;
    for (int mask = 0; mask < (1 << n); mask++) {        // every mask is reached only from smaller masks
        if (dp[mask] == INF) continue;
        int worker = Integer.bitCount(mask);             // the next worker to place
        if (worker == n) continue;
        for (int job = 0; job < n; job++) {
            if ((mask >> job & 1) == 1) continue;
            transitions++;
            int nxt = mask | 1 << job;
            if (dp[mask] + cost[worker][job] < dp[nxt]) {
                dp[nxt] = dp[mask] + cost[worker][job];
                choice[nxt] = job;
            }
        }
    }
    int full = (1 << n) - 1;
    lastJobs = new int[n];
    int m = full;
    for (int worker = n - 1; worker >= 0; worker--) {    // walk back from the full set
        lastJobs[worker] = choice[m];
        m ^= 1 << choice[m];
    }
    lastTransitions = transitions;
    return dp[full];
}
~~~

**What to point out in this code:**

- \`Integer.bitCount(mask)\` is the popcount and \`Integer.numberOfTrailingZeros(m)\` the index of the lowest set bit (example 3); both have \`Long\` versions for \`long\` masks.
- **Shift distance:** for \`int\`, Java uses only the low 5 bits of the shift count ([JLS §15.19](https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.19)). A quick check printed \`1 << 32\` as \`1\` and \`1L << 32\` as \`4294967296\`. Use \`1L\` once n can reach 31.
- **Precedence:** \`==\` binds tighter than \`&\`, so \`if (mask >> 2 & 1 == 1)\` does not even compile ("bad operand types for binary operator '&'"). Write \`(mask >> 2 & 1) == 1\`.
- **Sentinel:** the example uses \`Integer.MAX_VALUE\` but never adds to it — unreachable masks are skipped with \`if (dp[mask] == INF) continue;\`. \`Integer.MAX_VALUE + 1\` wraps to a large negative number and would silently become the "minimum". The TSP example uses \`1_000_000_000\`, which leaves room for one more distance.
- **Memory shape:** \`new int[1 << n][n]\` creates 2ⁿ small arrays, each with its own object header; \`new int[n][1 << n]\` stores the same numbers in only n arrays. For n near 20 the second shape (or one flat \`int[n << n]\`) is noticeably leaner.
- \`"0".repeat(k)\` (Java 11+) pads the binary string; \`Integer.toBinaryString\` has no leading zeros.

## 9. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21; the code only uses Java 17 features). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — mask operations and the assignment problem** prints:

~~~text
mask 1011 = 11, members [0, 1, 3]
has item 2? false
add 2:    1111
remove 0: 1010
toggle 3: 0011
size (popcount): 3
lowest set bit: 0001
full set: 1111
min cost 13 (brute force over 24 orders: 13)
worker -> job: 0->1, 1->0, 2->2, 3->3
states: 16, transitions: 32
n = 10: min cost 42, states 1024, transitions 5120, orders 10! = 3628800
~~~

**Example 2 — Held–Karp travelling salesman with tour reconstruction** prints:

~~~text
shortest tour: 0 -> 4 -> 2 -> 3 -> 1 -> 0, length 26
brute force: 26 after 24 orders
held-karp: 32 masks x 5 cities, 52 transitions
n = 12: length 146, tour 0 -> 10 -> 6 -> 1 -> 8 -> 9 -> 5 -> 11 -> 2 -> 7 -> 4 -> 3 -> 0
n = 12: 56331 transitions vs 39916800 brute-force orders
~~~

The 5-city tour 0 → 4 → 2 → 3 → 1 → 0 costs 7 + 5 + 8 + 4 + 2 = 26, which the 24-order brute force confirms.

**Example 3 — submask enumeration, the 3ⁿ count, and fewest elevator trips** prints:

~~~text
submasks of 1011: 1011, 1010, 1001, 1000, 0011, 0010, 0001, 0000
count: 8 = 2^3
n = 4: 81 (mask, submask) pairs, 3^n = 81, 4^n = 256
n = 8: 6561 (mask, submask) pairs, 3^n = 6561, 4^n = 65536
n = 10: 59049 (mask, submask) pairs, 3^n = 59049, 4^n = 1048576
total weight 420, limit 150 per trip
fewest trips: 3
  trip: 30, 90 (load 120)
  trip: 50, 40, 60 (load 150)
  trip: 70, 80 (load 150)
~~~

Seven people weighing 420 in total cannot ride in two trips of 150, and the DP finds a 3-trip split; the order the trips print in is the order the reconstruction peels them off.

## 10. Complexity

| Pattern | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force over all orders | O(n · n!) | O(n) | n! permutations, O(n) to score each |
| Assignment \`dp[mask]\` | O(n · 2ⁿ) | O(2ⁿ) | 2ⁿ masks, up to n jobs to try from each |
| Held–Karp \`dp[mask][last]\` | O(n² · 2ⁿ) | O(n · 2ⁿ) | 2ⁿ · n states, n next cities from each |
| Groups via submasks | O(3ⁿ) | O(2ⁿ) | every (mask, submask) pair once |

For a feel of the limits: at n = 20, \`dp[mask][last]\` has 2²⁰ × 20 = 20,971,520 cells — about 84 MB if each is a 4-byte integer — and the transitions number in the hundreds of millions. That is why problems with bitmask DP usually say n ≤ 16 to 20.

## 11. Edge Cases

- **n = 0 or n = 1.** One mask (0) or two masks; make sure the full-set index \`(1 << n) - 1\` and the base case still make sense (for TSP with one city the tour length is 0).
- **Unreachable states.** Many \`(mask, last)\` pairs are impossible (for example a mask without city 0). Initialise them to a large sentinel and **skip** them; never add a distance to the sentinel itself.
- **The sentinel overflowing.** In fixed-width integer languages, \`INT_MAX + d\` overflows. Either skip INF states (as the examples do) or pick a sentinel like 10⁹ that leaves headroom.
- **Masks that do not fit the integer type.** 32-bit integers hold masks for n ≤ 31 at most (and fewer with signed types); 64-bit for n ≤ 63 — far beyond what a DP table could store anyway.
- **Ties.** Several tours or assignments can share the minimum. With a strict \`<\` the first one found wins, which keeps the reconstructed answer deterministic.

## Common Pitfalls

- **\`Integer.MAX_VALUE\` plus anything.** It overflows to a negative number and becomes the "best" answer; skip INF states or use a smaller sentinel.
- **\`1 << n\` for n ≥ 31.** The shift wraps (\`1 << 32 == 1\`); use \`1L << n\` and \`long\` masks.
- **Precedence of \`&\` vs \`==\`.** Parenthesise the bit test; Java refuses to compile the unparenthesised form, which is at least loud.
- **2ⁿ tiny arrays.** \`new int[1 << 20][20]\` allocates a million array objects; flip the dimensions or flatten.
- **Using a mask where order matters.** If two orders of the same set have different futures (and you cannot add a "last" dimension), bitmask DP is the wrong tool.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Bitmask DP is DP whose state includes an integer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mask</code> whose bit i says whether item i is used, visited or assigned.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When:</strong> <span style="color:#f0e2c8;">When the future depends only on *which* items are used (not their order) and n is small, about n ≤ 20 — it replaces n! orders with 2ⁿ subsets.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Patterns:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[mask]</code> for assignment (next worker = <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.bitCount(mask)</code>), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[mask][last]</code> for TSP (Held–Karp, O(n²·2ⁿ)), submask loops <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sub = (sub - 1) &amp; mask</code> for grouping, O(3ⁿ).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Order:</strong> <span style="color:#f0e2c8;">A superset is a bigger integer, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (int mask = 0; mask &lt; (1 &lt;&lt; n); mask++)</code> is a valid fill order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Skip INF states instead of adding to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code>, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1L &lt;&lt; n</code> past 30 bits, and parenthesise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(mask &gt;&gt; i &amp; 1) == 1</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the assignment state just <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dp[mask]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Workers are placed in a fixed order, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.bitCount(mask)</code> already tells you which worker is next. An extra index would be redundant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does TSP need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dp[mask][last]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two partial routes with the same visited set but different end cities have different costs to continue, so the end city must be part of the state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the submask loop 3ⁿ in total?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For each item there are three cases: not in the mask, in the mask but not the submask, in both. That gives 3ⁿ pairs; example 3 counts 59,049 for n = 10.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes wrong with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code> as infinity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE + cost</code> overflows to a negative number, which then wins every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min</code>. Skip unreachable states, or use a sentinel like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1_000_000_000</code> with headroom.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you print the actual tour or assignment?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store the choice for each state (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[mask][city]</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">choice[mask]</code>) and walk back from the full mask, removing one bit at a time.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bitmask** | An integer used as a set: bit i is 1 when element i is a member |
| **Popcount** | The number of 1 bits in an integer — the size of the set |
| **Bitmask DP** | DP whose state includes a bitmask of which elements are used, visited or assigned |
| **State compression** | Encoding a collection of yes/no facts as one integer so it can index a table |
| **Exponential vs factorial** | 2ⁿ (bitmask DP) grows far more slowly than n! (all orders) |
| **Fill order (increasing masks)** | Supersets are larger integers, so looping masks upward is a valid DP order |
| **Held–Karp** | TSP bitmask DP dp[mask][last]: O(n² · 2ⁿ) time, O(n · 2ⁿ) memory |
| **Submask enumeration** | The sub = (sub − 1) & mask loop that visits every subset of mask |
| **The 3ⁿ bound** | Total (mask, submask) pairs over all masks: three choices per element |
| **Shift distance masking (Java)** | For int shifts Java uses only the low 5 bits of the count, so 1 << 32 == 1 |

---
**Conclusion:** Bitmask DP stores *which* items are used as the bits of one integer and makes that integer a table index, so problems that brute force over n! orders shrink to about 2ⁿ × n states. Recognise it by a small n and a question about visiting, assigning or grouping everything; then pick the state — \`dp[mask]\`, \`dp[mask][last]\`, or \`dp[mask]\` over submasks — and loop masks upward. In Java lean on \`Integer.bitCount\`, keep sentinels away from overflow, switch to \`1L\` past 30 bits and shape big tables as \`[n][1 << n]\`. For the bit tricks themselves see [bit-manipulation tricks](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews), and for the other big DP state shapes compare [equal-sum partition](/interview-question/how-do-you-check-if-an-array-can-be-partitioned-into-two-equal-sum-subsets) and [Burst Balloons](/interview-question/burst-balloons-why-does-dp-over-intervals-not-balloons-work).`,
        examples: [
          {
            label: "Mask operations and the assignment problem with dp[mask]",
            code: `public class Main {
    static String bits(int mask, int n) {
        String s = Integer.toBinaryString(mask);           // no leading zeros, so pad
        return "0".repeat(Math.max(0, n - s.length())) + s;
    }

    static String members(int mask, int n) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < n; i++) {
            if ((mask >> i & 1) == 1) {
                if (sb.length() > 1) sb.append(", ");
                sb.append(i);
            }
        }
        return sb.append("]").toString();
    }

    static final int INF = Integer.MAX_VALUE;               // never add to it: skip INF states
    static int[] lastJobs;
    static int lastTransitions;

    static int assign(int[][] cost) {
        int n = cost.length;
        int[] dp = new int[1 << n];        // dp[mask]: cheapest way to give the jobs in mask to workers 0..popcount-1
        int[] choice = new int[1 << n];
        java.util.Arrays.fill(dp, INF);
        dp[0] = 0;
        int transitions = 0;
        for (int mask = 0; mask < (1 << n); mask++) {        // every mask is reached only from smaller masks
            if (dp[mask] == INF) continue;
            int worker = Integer.bitCount(mask);             // the next worker to place
            if (worker == n) continue;
            for (int job = 0; job < n; job++) {
                if ((mask >> job & 1) == 1) continue;
                transitions++;
                int nxt = mask | 1 << job;
                if (dp[mask] + cost[worker][job] < dp[nxt]) {
                    dp[nxt] = dp[mask] + cost[worker][job];
                    choice[nxt] = job;
                }
            }
        }
        int full = (1 << n) - 1;
        lastJobs = new int[n];
        int m = full;
        for (int worker = n - 1; worker >= 0; worker--) {    // walk back from the full set
            lastJobs[worker] = choice[m];
            m ^= 1 << choice[m];
        }
        lastTransitions = transitions;
        return dp[full];
    }

    static int bruteMin(int[][] cost, int worker, boolean[] used) {
        if (worker == cost.length) return 0;
        int best = INF;
        for (int job = 0; job < cost.length; job++) {
            if (used[job]) continue;
            used[job] = true;
            best = Math.min(best, cost[worker][job] + bruteMin(cost, worker + 1, used));
            used[job] = false;
        }
        return best;
    }

    public static void main(String[] args) {
        // Part 1: a set of items 0..3 stored in one integer
        int n = 4;
        int mask = 0b1011;                                   // items 0, 1 and 3 are in the set
        System.out.println("mask " + bits(mask, n) + " = " + mask + ", members " + members(mask, n));
        System.out.println("has item 2? " + ((mask >> 2 & 1) == 1));
        System.out.println("add 2:    " + bits(mask | 1 << 2, n));
        System.out.println("remove 0: " + bits(mask & ~(1 << 0), n));
        System.out.println("toggle 3: " + bits(mask ^ 1 << 3, n));
        System.out.println("size (popcount): " + Integer.bitCount(mask));
        System.out.println("lowest set bit: " + bits(mask & -mask, n));   // same as Integer.lowestOneBit
        System.out.println("full set: " + bits((1 << n) - 1, n));

        // Part 2: assign 4 workers to 4 jobs, one job each, at minimum total cost
        int[][] cost = {{9, 2, 7, 8},
                        {6, 4, 3, 7},
                        {5, 8, 1, 8},
                        {7, 6, 9, 4}};
        int best = assign(cost);
        int brute = bruteMin(cost, 0, new boolean[4]);
        System.out.println("min cost " + best + " (brute force over 24 orders: " + brute + ")");
        StringBuilder sb = new StringBuilder();
        for (int w = 0; w < 4; w++) {
            if (w > 0) sb.append(", ");
            sb.append(w).append("->").append(lastJobs[w]);
        }
        System.out.println("worker -> job: " + sb);
        System.out.println("states: " + (1 << 4) + ", transitions: " + lastTransitions);

        int[][] big = new int[10][10];
        for (int w = 0; w < 10; w++)
            for (int j = 0; j < 10; j++) big[w][j] = (w * w * 7 + j * 13 + w * j) % 23 + 1;
        int best10 = assign(big);
        long orders = 1;
        for (int k = 2; k <= 10; k++) orders *= k;
        System.out.println("n = 10: min cost " + best10 + ", states " + (1 << 10) + ", transitions " + lastTransitions + ", orders 10! = " + orders);
    }
}`,
          },
          {
            label: "Held-Karp travelling salesman with dp[mask][last]",
            code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class Main {
    static final int INF = 1_000_000_000;      // big but safe: INF + a distance still fits in int
    static List<Integer> tour;
    static int transitions;

    static int heldKarp(int[][] d) {
        int n = d.length;
        int full = (1 << n) - 1;
        // dp[mask][last]: shortest path that starts at city 0, visits exactly the cities in mask, ends at last
        int[][] dp = new int[1 << n][n];
        int[][] parent = new int[1 << n][n];
        for (int[] row : dp) java.util.Arrays.fill(row, INF);
        for (int[] row : parent) java.util.Arrays.fill(row, -1);
        dp[1][0] = 0;                          // mask 00001: only city 0 visited, standing at city 0, length 0
        transitions = 0;
        for (int mask = 0; mask < (1 << n); mask++) {
            if ((mask & 1) == 0) continue;     // every path starts at city 0
            for (int last = 0; last < n; last++) {
                if (dp[mask][last] == INF) continue;
                for (int nxt = 0; nxt < n; nxt++) {
                    if ((mask >> nxt & 1) == 1) continue;
                    transitions++;
                    int cand = dp[mask][last] + d[last][nxt];
                    int m2 = mask | 1 << nxt;
                    if (cand < dp[m2][nxt]) {
                        dp[m2][nxt] = cand;
                        parent[m2][nxt] = last;
                    }
                }
            }
        }
        int best = INF, end = -1;
        for (int last = 1; last < n; last++) {  // close the loop back to city 0
            if (dp[full][last] + d[last][0] < best) {
                best = dp[full][last] + d[last][0];
                end = last;
            }
        }
        tour = new ArrayList<>();
        int mask = full, cur = end;
        while (cur != -1) {                    // walk the parents back to city 0
            tour.add(cur);
            int prev = parent[mask][cur];
            mask ^= 1 << cur;
            cur = prev;
        }
        Collections.reverse(tour);
        tour.add(0);
        return best;
    }

    static String join(List<Integer> xs) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < xs.size(); i++) {
            if (i > 0) sb.append(" -> ");
            sb.append(xs.get(i));
        }
        return sb.toString();
    }

    static int brute = INF, tried = 0;

    static void permute(int[][] d, List<Integer> path, boolean[] used) {   // (n-1)! orders, city 0 first
        if (path.size() == d.length) {
            tried++;
            int len = 0;
            for (int i = 0; i + 1 < path.size(); i++) len += d[path.get(i)][path.get(i + 1)];
            len += d[path.get(path.size() - 1)][0];
            brute = Math.min(brute, len);
            return;
        }
        for (int c = 1; c < d.length; c++) {
            if (used[c]) continue;
            used[c] = true;
            path.add(c);
            permute(d, path, used);
            path.remove(path.size() - 1);
            used[c] = false;
        }
    }

    public static void main(String[] args) {
        int[][] d = {{0, 2, 9, 10, 7},
                     {2, 0, 6, 4, 3},
                     {9, 6, 0, 8, 5},
                     {10, 4, 8, 0, 6},
                     {7, 3, 5, 6, 0}};
        int best = heldKarp(d);
        System.out.println("shortest tour: " + join(tour) + ", length " + best);
        List<Integer> start = new ArrayList<>();
        start.add(0);
        permute(d, start, new boolean[5]);
        System.out.println("brute force: " + brute + " after " + tried + " orders");
        System.out.println("held-karp: " + (1 << 5) + " masks x 5 cities, " + transitions + " transitions");

        int n = 12;
        int[][] far = new int[n][n];
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++) far[i][j] = i == j ? 0 : (i * 17 + j * 17 + i * j) % 40 + 5;
        int best12 = heldKarp(far);
        long orders = 1;
        for (int k = 2; k < n; k++) orders *= k;
        System.out.println("n = 12: length " + best12 + ", tour " + join(tour));
        System.out.println("n = 12: " + transitions + " transitions vs " + orders + " brute-force orders");
    }
}`,
          },
          {
            label: "Submask enumeration, the 3^n count, and fewest elevator trips",
            code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    static String bits(int mask, int n) {
        String s = Integer.toBinaryString(mask);
        return "0".repeat(Math.max(0, n - s.length())) + s;
    }

    public static void main(String[] args) {
        // Part 1: every submask of 1011, largest first, with the (sub - 1) & mask trick
        int mask = 0b1011;
        List<String> subs = new ArrayList<>();
        int sub = mask;
        while (true) {
            subs.add(bits(sub, 4));
            if (sub == 0) break;
            sub = (sub - 1) & mask;
        }
        System.out.println("submasks of 1011: " + String.join(", ", subs));
        System.out.println("count: " + subs.size() + " = 2^" + Integer.bitCount(mask));

        // Part 2: looping over every submask of every mask costs 3^n, not 4^n
        for (int n : new int[]{4, 8, 10}) {
            long pairs = 0;
            for (int m = 0; m < (1 << n); m++) {
                int s = m;
                while (true) {
                    pairs++;
                    if (s == 0) break;
                    s = (s - 1) & m;
                }
            }
            long p3 = 1, p4 = 1;
            for (int k = 0; k < n; k++) { p3 *= 3; p4 *= 4; }   // Math.pow returns a double
            System.out.println("n = " + n + ": " + pairs + " (mask, submask) pairs, 3^n = " + p3 + ", 4^n = " + p4);
        }

        // Part 3: use it - fewest elevator trips, weight limit 150, for 7 people
        int[] weights = {70, 50, 80, 40, 60, 30, 90};
        final int LIMIT = 150;
        int n = weights.length;
        int full = (1 << n) - 1;
        int[] load = new int[1 << n];                 // load[mask]: total weight of the people in mask
        for (int m = 1; m < (1 << n); m++) {
            int low = Integer.numberOfTrailingZeros(m);   // index of the lowest set bit
            load[m] = load[m & (m - 1)] + weights[low];
        }
        int[] dp = new int[1 << n];                   // dp[mask]: fewest trips that carry exactly mask
        int[] group = new int[1 << n];                // group[mask]: the last trip used for mask
        java.util.Arrays.fill(dp, n + 1);
        dp[0] = 0;
        for (int m = 1; m < (1 << n); m++) {
            for (int s = m; s != 0; s = (s - 1) & m) {    // try every group s that could ride together
                if (load[s] <= LIMIT && dp[m ^ s] + 1 < dp[m]) {
                    dp[m] = dp[m ^ s] + 1;
                    group[m] = s;
                }
            }
        }
        System.out.println("total weight " + load[full] + ", limit " + LIMIT + " per trip");
        System.out.println("fewest trips: " + dp[full]); // 3
        for (int m = full; m != 0; m ^= group[m]) {
            int g = group[m];
            List<String> riders = new ArrayList<>();
            for (int i = 0; i < n; i++) if ((g >> i & 1) == 1) riders.add(String.valueOf(weights[i]));
            System.out.println("  trip: " + String.join(", ", riders) + " (load " + load[g] + ")");
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"What is bitmask dynamic programming? Explain when you would reach for it, describe the state for a classic problem such as assigning n workers to n jobs or the travelling salesman problem, and show me what it looks like in C++."

**What a strong answer should cover:**
- A bitmask is an integer used as a set (bit i = element i); with n elements there are 2ⁿ masks, so it fits when n is small (about 20 or less).
- The condition that makes it valid: the future depends only on *which* elements are used, not the order — replacing n! orders with 2ⁿ subsets.
- Concrete states: \`dp[mask]\` for assignment (next worker = popcount), \`dp[mask][last]\` for TSP (Held–Karp, O(n² · 2ⁿ) time, O(n · 2ⁿ) space).
- Fill order by increasing mask, the core bit operations, and submask enumeration with its 3ⁿ total cost.
- C++ details: \`__builtin_popcount\` (a GCC/Clang builtin) vs portable \`std::bitset<32>(m).count()\` vs C++20 \`std::popcount\`, \`1 << n\` being undefined for n ≥ 32 (use \`1LL\`), \`__builtin_ctz(0)\` being undefined, and \`INT_MAX + x\` signed overflow.

**Code / implementation expected:** Optional — a short \`dp[mask]\` assignment or \`dp[mask][last]\` TSP in C++17 is a strong way to show you mean it.`,
        answer: `**Target Audience:** Interview candidates who know basic dynamic programming and want the subset-as-integer technique — bits are explained from scratch  
**Difficulty:** Hard  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A delivery driver has five stops today. Halfway through the route she glances at a sticky note on the dashboard with five tick boxes, one per stop: ✓ ✓ ✗ ✓ ✗. That note — *which stops are done* — plus *where she is standing right now* is everything she needs to plan the rest of the day. It does not matter in which order the ticked stops were visited; only *which* ones and where she ended up.

Now imagine writing that sticky note as a number. Each tick box is a 0 or a 1, so five tick boxes are just a five-digit binary number. \`01011\` means stops 0, 1 and 3 are done. A computer can store that in one integer, look it up in an array instantly, and add a tick with a single operation.

That is the whole idea of **bitmask dynamic programming**: when a problem's state is "which items out of a small set have been used", store that set as the bits of an integer and use the integer as a table index. It turns problems whose brute force is n! (every order) into roughly 2ⁿ × n — the difference between "never finishes" and "a fraction of a second" for 15 or 20 items.

## 2. A Set Stored in One Integer

Number the items 0 to n − 1. A subset of them is written as an integer whose bit i is 1 when item i is in the subset.

📌 **Interview term: Bitmask** — an integer used as a set: bit i is 1 when element i is a member. With n elements there are exactly 2ⁿ masks, the integers 0 to 2ⁿ − 1.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 180" role="img" aria-label="The mask 1011 in binary. Bit 3 is 1, bit 2 is 0, bit 1 is 1, bit 0 is 1, so items 0, 1 and 3 are in the set and the integer value is 11">
  <text class="d-sub" x="135" y="44" text-anchor="middle">bit 3</text>
  <text class="d-sub" x="235" y="44" text-anchor="middle">bit 2</text>
  <text class="d-sub" x="335" y="44" text-anchor="middle">bit 1</text>
  <text class="d-sub" x="435" y="44" text-anchor="middle">bit 0</text>
  <rect class="d-box-accent" x="100" y="60" width="70" height="56" rx="8"/>
  <text class="d-text" x="135" y="94" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="200" y="60" width="70" height="56" rx="8"/>
  <text class="d-text" x="235" y="94" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="300" y="60" width="70" height="56" rx="8"/>
  <text class="d-text" x="335" y="94" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="400" y="60" width="70" height="56" rx="8"/>
  <text class="d-text" x="435" y="94" text-anchor="middle">1</text>
  <rect class="d-box" x="510" y="60" width="90" height="56" rx="8"/>
  <text class="d-text" x="555" y="94" text-anchor="middle">= 11</text>
  <text class="d-sub" x="135" y="150" text-anchor="middle">item 3 in</text>
  <text class="d-sub" x="235" y="150" text-anchor="middle">item 2 out</text>
  <text class="d-sub" x="335" y="150" text-anchor="middle">item 1 in</text>
  <text class="d-sub" x="435" y="150" text-anchor="middle">item 0 in</text>
</svg>

Bit 0 is the rightmost digit. The value is 8 + 2 + 1 = 11, which is why example 1 prints \`mask 1011 = 11, members [0, 1, 3]\`.

The operations you need are all one-liners (the exact syntax for this language is in the table in section 7):

- **Is item i in the set?** shift right by i and look at the last bit.
- **Add item i:** OR with \`1 << i\`. **Remove item i:** AND with the complement of \`1 << i\`. **Toggle:** XOR with \`1 << i\`.
- **Size of the set:** count the 1 bits. 📌 **Interview term: Popcount** — the number of 1 bits in an integer ("population count").
- **Lowest member:** \`mask & -mask\` keeps only the lowest 1 bit (two's complement trick). See the [bit-manipulation tricks page](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews) and [counting set bits](/interview-question/how-do-you-count-the-number-of-set-bits-in-an-integer) for why these work.
- **Full set:** \`(1 << n) - 1\`, all n bits on.

## 3. What Bitmask DP Is

📌 **Interview term: Bitmask DP** — dynamic programming whose state includes a bitmask describing which elements have been used, visited or assigned. A cell like \`dp[mask]\` or \`dp[mask][i]\` stores the best answer for that subset.

It applies when two things are true:

1. **The future only depends on *which* items are used, not on the order they were used in.** The driver does not care whether she did stop 1 before stop 3 — only that both are done. That is the [optimal substructure](/interview-question/what-is-dynamic-programming) DP needs.
2. **n is small**, usually n ≤ 20. 2²⁰ is 1,048,576 masks — fine. 2⁴⁰ is about 10¹² — impossible. If a problem says "n ≤ 15" or "n ≤ 20" and asks about orders, assignments or groupings, bitmask DP should be your first thought.

📌 **Interview term: State compression** — encoding a whole collection of yes/no facts (a subset) as one integer so it can be a single table index. Bitmask DP is the most common kind.

📌 **Interview term: Exponential vs factorial** — 2ⁿ grows fast, but n! grows much faster: for n = 10, 2¹⁰ = 1,024 while 10! = 3,628,800. Bitmask DP wins by forgetting the *order* inside each subset.

## 4. Pattern 1 — Assignment: dp[mask]

**Problem.** n workers, n jobs, \`cost[w][j]\` to give job j to worker w. Each worker gets exactly one job. Minimise the total cost.

**Brute force.** Try every permutation: n! assignments.

**Bitmask DP.** Hand out jobs to workers in order 0, 1, 2, … Let \`dp[mask]\` = cheapest way to give the jobs in \`mask\` to the first \`popcount(mask)\` workers. The next worker to place is \`w = popcount(mask)\`, so the mask alone tells us who is next — no second dimension needed.

- Base case: \`dp[0] = 0\` (no jobs given, nobody placed).
- Transition: for each job j not in mask, \`dp[mask | 1 << j] = min(…, dp[mask] + cost[w][j])\`.
- Answer: \`dp[(1 << n) - 1]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 370" role="img" aria-label="All eight masks of three jobs arranged by how many jobs are taken. Each arrow adds one job, so every mask is reached from smaller masks">
  <path class="d-edge" d="M 300 80 L 140 130"/>
  <path class="d-edge" d="M 300 80 L 300 130"/>
  <path class="d-edge" d="M 300 80 L 460 130"/>
  <path class="d-edge" d="M 140 170 L 140 220"/>
  <path class="d-edge" d="M 140 170 L 300 220"/>
  <path class="d-edge" d="M 300 170 L 140 220"/>
  <path class="d-edge" d="M 300 170 L 460 220"/>
  <path class="d-edge" d="M 460 170 L 300 220"/>
  <path class="d-edge" d="M 460 170 L 460 220"/>
  <path class="d-edge" d="M 140 260 L 300 310"/>
  <path class="d-edge" d="M 300 260 L 300 310"/>
  <path class="d-edge" d="M 460 260 L 300 310"/>
  <rect class="d-box-accent" x="260" y="40" width="80" height="40" rx="6"/>
  <text class="d-text" x="300" y="66" text-anchor="middle">000</text>
  <rect class="d-box" x="100" y="130" width="80" height="40" rx="6"/>
  <text class="d-text" x="140" y="156" text-anchor="middle">001</text>
  <rect class="d-box" x="260" y="130" width="80" height="40" rx="6"/>
  <text class="d-text" x="300" y="156" text-anchor="middle">010</text>
  <rect class="d-box" x="420" y="130" width="80" height="40" rx="6"/>
  <text class="d-text" x="460" y="156" text-anchor="middle">100</text>
  <rect class="d-box" x="100" y="220" width="80" height="40" rx="6"/>
  <text class="d-text" x="140" y="246" text-anchor="middle">011</text>
  <rect class="d-box" x="260" y="220" width="80" height="40" rx="6"/>
  <text class="d-text" x="300" y="246" text-anchor="middle">101</text>
  <rect class="d-box" x="420" y="220" width="80" height="40" rx="6"/>
  <text class="d-text" x="460" y="246" text-anchor="middle">110</text>
  <rect class="d-box-accent" x="260" y="310" width="80" height="40" rx="6"/>
  <text class="d-text" x="300" y="336" text-anchor="middle">111</text>
  <text class="d-sub" x="530" y="66">0 taken</text>
  <text class="d-sub" x="530" y="156">1 taken</text>
  <text class="d-sub" x="530" y="246">2 taken</text>
  <text class="d-sub" x="530" y="336">3 taken</text>
</svg>

Every arrow adds exactly one bit, and adding a bit always makes the integer bigger. So simply looping \`mask\` from 0 to 2ⁿ − 1 in increasing order is a valid fill order — every mask is final before anything reads it.

📌 **Interview term: Fill order (increasing masks)** — because a superset mask is always a larger integer than any of its subsets, a plain \`for mask in 0 .. 2ⁿ − 1\` loop processes every subset before its supersets.

Example 1 solves a 4 × 4 instance: cost 13, matching the 24-permutation brute force, with 16 states and 32 transitions. At n = 10 it uses 1,024 states and 5,120 transitions instead of 10! = 3,628,800 orders.

## 5. Pattern 2 — Travelling Salesman: dp[mask][last]

**Problem.** Visit every city exactly once starting and ending at city 0, with the shortest total distance.

Here the mask is not enough: two paths that visited the same cities but stopped in different places have different futures. So the state adds the current city.

- State: \`dp[mask][last]\` = shortest path that starts at city 0, visits exactly the cities in \`mask\`, and ends at \`last\`.
- Base case: \`dp[1][0] = 0\` (mask \`…0001\`: only city 0, standing at city 0).
- Transition: from \`(mask, last)\` go to any unvisited \`next\`: \`dp[mask | 1 << next][next] = min(…, dp[mask][last] + d[last][next])\`.
- Answer: \`min over last of dp[full][last] + d[last][0]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Held Karp transition. The state mask 1011 standing at city 3 moves to city 2, giving the state mask 1111 standing at city 2, at extra cost d of 3 to 2">
  <defs>
    <marker id="b30q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="60" width="220" height="80" rx="10"/>
  <text class="d-text" x="140" y="92" text-anchor="middle">mask 1011, at 3</text>
  <text class="d-sub" x="140" y="118" text-anchor="middle">visited 0, 1, 3</text>
  <path class="d-edge-accent" d="M 254 100 L 384 100" marker-end="url(#b30q3-arrow)"/>
  <text class="d-sub" x="320" y="80" text-anchor="middle">+ d[3][2]</text>
  <rect class="d-box-accent" x="390" y="60" width="220" height="80" rx="10"/>
  <text class="d-text" x="500" y="92" text-anchor="middle">mask 1111, at 2</text>
  <text class="d-sub" x="500" y="118" text-anchor="middle">visited 0, 1, 2, 3</text>
</svg>

This is the Held–Karp algorithm (M. Held and R. M. Karp, *A dynamic programming approach to sequencing problems*, J. SIAM 1962, as cited in the [Google OR-Tools documentation](https://developers.google.com/optimization/reference/graph/hamiltonian_path)). It runs in O(n² · 2ⁿ) time instead of O(n!) — example 2 finds the best 12-city tour with 56,331 transitions, where trying every order would mean 39,916,800 tours.

📌 **Interview term: Held–Karp** — the bitmask DP for the travelling salesman problem, \`dp[mask][last]\`, O(n² · 2ⁿ) time and O(n · 2ⁿ) memory.

## 6. Pattern 3 — Splitting a Set: Iterating Over Submasks

Some problems split the items into groups: "fewest elevator trips", "fewest teams", "cheapest way to cover everyone". Then \`dp[mask]\` tries every possible *group* \`sub\` inside \`mask\` as the last group: \`dp[mask] = min(dp[mask ^ sub] + 1)\` over valid \`sub\`.

The standard trick visits every submask of \`mask\` without testing all 2ⁿ integers:

~~~text
sub = mask
while sub > 0:
    use sub
    sub = (sub - 1) & mask
~~~

Subtracting 1 turns off the lowest 1 bit and turns on every bit below it; AND-ing with \`mask\` throws away the bits that are not in \`mask\`. The result is the next smaller submask. Example 3 lists \`1011, 1010, 1001, 1000, 0011, 0010, 0001, 0000\` for \`mask = 1011\`.

📌 **Interview term: Submask enumeration** — the \`(sub - 1) & mask\` loop that visits all 2^popcount(mask) subsets of \`mask\` in decreasing order.

📌 **Interview term: The 3ⁿ bound** — summed over all masks, the submask loop runs 3ⁿ times, not 4ⁿ: each item is either outside the mask, in the mask but not the submask, or in both — three choices per item. Example 3 measures 81, 6,561 and 59,049 pairs for n = 4, 8 and 10 — exactly 3ⁿ.

## 7. Recognising a Bitmask DP Problem

| Signal in the problem | Likely state |
| :--- | :--- |
| n ≤ 20 and "visit every …", "shortest route through all …" | \`dp[mask][last]\` (Held–Karp) |
| "assign each worker one task", "match every …" | \`dp[mask]\`, next person = popcount |
| "split everyone into groups / trips / teams" | \`dp[mask]\` over submasks, O(3ⁿ) |
| "can these pieces form …" (matchsticks into a square, k equal subsets) | \`dp[mask]\` = partial progress |
| n up to 10⁵ | **not** bitmask DP — the state space would be astronomical |

Contrast with the neighbouring DP pages: [equal-sum partition](/interview-question/how-do-you-check-if-an-array-can-be-partitioned-into-two-equal-sum-subsets) indexes the table by a *sum* (small values, many items), [Burst Balloons](/interview-question/burst-balloons-why-does-dp-over-intervals-not-balloons-work) by an *interval* (order along a line matters), and bitmask DP by a *subset* (few items, arbitrary relationships). Plain [backtracking](/interview-question/what-is-backtracking) over all [permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array) is the brute force that bitmask DP replaces.

## 8. The Code in C++

The bit operations in C++:

| Operation | C++17 | Note |
| :--- | :--- | :--- |
| item i in mask? | \`(mask >> i) & 1\` | parenthesise any comparison: \`==\` binds tighter than \`&\` |
| add / remove / toggle i | \`mask \\| 1 << i\`, \`mask & ~(1 << i)\`, \`mask ^ 1 << i\` | |
| popcount | \`__builtin_popcount(mask)\` | a GCC/Clang builtin, not standard C++17; \`std::bitset<32>(mask).count()\` is portable; \`std::popcount\` arrived in C++20 ([cppreference](https://en.cppreference.com/w/cpp/numeric/popcount)) |
| lowest set bit | \`mask & -mask\` | index: \`__builtin_ctz(mask)\` — undefined for 0 |
| full set | \`(1 << n) - 1\` | use \`1LL << n\` for n ≥ 31 |

The assignment DP from section 4:

~~~cpp
Assignment assign(const vector<vector<int>>& cost) {
    int n = cost.size();
    vector<int> dp(1 << n, INF);               // dp[mask]: cheapest way to give the jobs in mask to workers 0..popcount-1
    vector<int> choice(1 << n, -1);
    dp[0] = 0;
    int transitions = 0;
    for (int mask = 0; mask < (1 << n); mask++) {   // every mask is reached only from smaller masks
        if (dp[mask] == INF) continue;
        int worker = __builtin_popcount(mask);      // GCC/Clang builtin; std::popcount is C++20
        if (worker == n) continue;
        for (int job = 0; job < n; job++) {
            if (mask >> job & 1) continue;
            transitions++;
            int nxt = mask | 1 << job;
            if (dp[mask] + cost[worker][job] < dp[nxt]) {
                dp[nxt] = dp[mask] + cost[worker][job];
                choice[nxt] = job;
            }
        }
    }
    int full = (1 << n) - 1;
    vector<int> jobs(n);
    int m = full;
    for (int worker = n - 1; worker >= 0; worker--) {   // walk back from the full set
        jobs[worker] = choice[m];
        m ^= 1 << choice[m];
    }
    return {dp[full], jobs, transitions};
}
~~~

**What to point out in this code:**

- \`__builtin_popcount(mask)\` is a GCC/Clang builtin, not part of standard C++17. It compiled and ran here with GCC 13. The portable C++17 form is \`std::bitset<32>(mask).count()\`; C++20 adds \`std::popcount\` in \`<bit>\`, which only accepts unsigned types ([cppreference](https://en.cppreference.com/w/cpp/numeric/popcount)).
- \`__builtin_ctz(m)\` gives the index of the lowest set bit; its result is undefined for \`m == 0\`, which is why example 3 starts the loop at \`m = 1\`.
- **Shifts:** shifting an \`int\` by 32 or more (or by a negative amount) is undefined behaviour ([cppreference, arithmetic operators](https://en.cppreference.com/w/cpp/language/operator_arithmetic)). Use \`1LL << n\` or \`1ULL << n\` when n can reach 31.
- **Precedence:** \`==\` binds tighter than \`&\`. \`mask & 1 << 2 == 0\` compiles and means \`mask & ((1 << 2) == 0)\`, which is always 0 — a quick test printed \`0\` where the parenthesised \`(mask & 1 << 2) == 0\` printed \`1\`. GCC warns about this with \`-Wall\` (\`-Wparentheses\`); always parenthesise.
- **Sentinel:** the example uses \`INT_MAX\` but never adds to it — unreachable states are skipped. \`INT_MAX + cost\` is signed overflow, which is undefined behaviour. The TSP example uses \`1000000000\` so one more distance still fits.
- \`vector<int> dp(1 << n, INF)\` is one contiguous block; \`vector<vector<int>>(1 << n, vector<int>(n))\` is 2ⁿ separate heap blocks — for n near 20, a flat \`vector<int>((1 << n) * n)\` indexed \`mask * n + last\` is leaner and faster.

## 9. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — mask operations and the assignment problem** prints:

~~~text
mask 1011 = 11, members [0, 1, 3]
has item 2? false
add 2:    1111
remove 0: 1010
toggle 3: 0011
size (popcount): 3
lowest set bit: 0001
full set: 1111
min cost 13 (brute force over 24 orders: 13)
worker -> job: 0->1, 1->0, 2->2, 3->3
states: 16, transitions: 32
n = 10: min cost 42, states 1024, transitions 5120, orders 10! = 3628800
~~~

**Example 2 — Held–Karp travelling salesman with tour reconstruction** prints:

~~~text
shortest tour: 0 -> 4 -> 2 -> 3 -> 1 -> 0, length 26
brute force: 26 after 24 orders
held-karp: 32 masks x 5 cities, 52 transitions
n = 12: length 146, tour 0 -> 10 -> 6 -> 1 -> 8 -> 9 -> 5 -> 11 -> 2 -> 7 -> 4 -> 3 -> 0
n = 12: 56331 transitions vs 39916800 brute-force orders
~~~

The 5-city tour 0 → 4 → 2 → 3 → 1 → 0 costs 7 + 5 + 8 + 4 + 2 = 26, which the 24-order brute force confirms.

**Example 3 — submask enumeration, the 3ⁿ count, and fewest elevator trips** prints:

~~~text
submasks of 1011: 1011, 1010, 1001, 1000, 0011, 0010, 0001, 0000
count: 8 = 2^3
n = 4: 81 (mask, submask) pairs, 3^n = 81, 4^n = 256
n = 8: 6561 (mask, submask) pairs, 3^n = 6561, 4^n = 65536
n = 10: 59049 (mask, submask) pairs, 3^n = 59049, 4^n = 1048576
total weight 420, limit 150 per trip
fewest trips: 3
  trip: 30, 90 (load 120)
  trip: 50, 40, 60 (load 150)
  trip: 70, 80 (load 150)
~~~

Seven people weighing 420 in total cannot ride in two trips of 150, and the DP finds a 3-trip split; the order the trips print in is the order the reconstruction peels them off.

## 10. Complexity

| Pattern | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force over all orders | O(n · n!) | O(n) | n! permutations, O(n) to score each |
| Assignment \`dp[mask]\` | O(n · 2ⁿ) | O(2ⁿ) | 2ⁿ masks, up to n jobs to try from each |
| Held–Karp \`dp[mask][last]\` | O(n² · 2ⁿ) | O(n · 2ⁿ) | 2ⁿ · n states, n next cities from each |
| Groups via submasks | O(3ⁿ) | O(2ⁿ) | every (mask, submask) pair once |

For a feel of the limits: at n = 20, \`dp[mask][last]\` has 2²⁰ × 20 = 20,971,520 cells — about 84 MB if each is a 4-byte integer — and the transitions number in the hundreds of millions. That is why problems with bitmask DP usually say n ≤ 16 to 20.

## 11. Edge Cases

- **n = 0 or n = 1.** One mask (0) or two masks; make sure the full-set index \`(1 << n) - 1\` and the base case still make sense (for TSP with one city the tour length is 0).
- **Unreachable states.** Many \`(mask, last)\` pairs are impossible (for example a mask without city 0). Initialise them to a large sentinel and **skip** them; never add a distance to the sentinel itself.
- **The sentinel overflowing.** In fixed-width integer languages, \`INT_MAX + d\` overflows. Either skip INF states (as the examples do) or pick a sentinel like 10⁹ that leaves headroom.
- **Masks that do not fit the integer type.** 32-bit integers hold masks for n ≤ 31 at most (and fewer with signed types); 64-bit for n ≤ 63 — far beyond what a DP table could store anyway.
- **Ties.** Several tours or assignments can share the minimum. With a strict \`<\` the first one found wins, which keeps the reconstructed answer deterministic.

## Common Pitfalls

- **Missing parentheses around \`&\`.** \`mask & 1 << j == 0\` compiles and is always 0; write \`(mask & (1 << j)) == 0\`.
- **\`1 << n\` with n ≥ 32.** Undefined behaviour, not just a wrong value; use \`1LL << n\`.
- **\`INT_MAX + x\`.** Signed overflow is undefined behaviour; skip INF states or use a sentinel with headroom.
- **\`__builtin_ctz(0)\` / \`__builtin_clz(0)\`.** Undefined results; guard the zero case.
- **Relying on \`__builtin_popcount\` for portability.** It is a compiler extension that other compilers may not provide — use \`std::bitset\` (C++17) or \`std::popcount\` (C++20).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Bitmask DP is DP whose state includes an integer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mask</code> whose bit i says whether item i is used, visited or assigned.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When:</strong> <span style="color:#f0e2c8;">When the future depends only on *which* items are used (not their order) and n is small, about n ≤ 20 — it replaces n! orders with 2ⁿ subsets.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Patterns:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[mask]</code> for assignment (next worker = popcount), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[mask][last]</code> for TSP (Held–Karp, O(n²·2ⁿ)), submask loops <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sub = (sub - 1) &amp; mask</code> for grouping, O(3ⁿ).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Order:</strong> <span style="color:#f0e2c8;">A superset is a bigger integer, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (int mask = 0; mask &lt; (1 &lt;&lt; n); mask++)</code> is a valid fill order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__builtin_popcount</code> is a GCC/Clang extension (portable: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::bitset</code>, C++20: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::popcount</code>); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 &lt;&lt; 32</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INT_MAX + x</code> are undefined behaviour.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the assignment state just <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dp[mask]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Workers are placed in a fixed order, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__builtin_popcount(mask)</code> already tells you which worker is next. An extra index would be redundant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does TSP need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dp[mask][last]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two partial routes with the same visited set but different end cities have different costs to continue, so the end city must be part of the state.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the submask loop 3ⁿ in total?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For each item there are three cases: not in the mask, in the mask but not the submask, in both. That gives 3ⁿ pairs; example 3 counts 59,049 for n = 10.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__builtin_popcount</code> standard C++?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — it is a GCC/Clang builtin. In portable C++17 use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::bitset&lt;32&gt;(mask).count()</code>; in C++20 use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::popcount</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;bit&gt;</code> on an unsigned value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you print the actual tour or assignment?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store the choice for each state (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[mask][city]</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">choice[mask]</code>) and walk back from the full mask, removing one bit at a time.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bitmask** | An integer used as a set: bit i is 1 when element i is a member |
| **Popcount** | The number of 1 bits in an integer — the size of the set |
| **Bitmask DP** | DP whose state includes a bitmask of which elements are used, visited or assigned |
| **State compression** | Encoding a collection of yes/no facts as one integer so it can index a table |
| **Exponential vs factorial** | 2ⁿ (bitmask DP) grows far more slowly than n! (all orders) |
| **Fill order (increasing masks)** | Supersets are larger integers, so looping masks upward is a valid DP order |
| **Held–Karp** | TSP bitmask DP dp[mask][last]: O(n² · 2ⁿ) time, O(n · 2ⁿ) memory |
| **Submask enumeration** | The sub = (sub − 1) & mask loop that visits every subset of mask |
| **The 3ⁿ bound** | Total (mask, submask) pairs over all masks: three choices per element |
| **__builtin_popcount** | GCC/Clang compiler builtin counting 1 bits; not standard C++ (std::popcount is C++20) |

---
**Conclusion:** Bitmask DP stores *which* items are used as the bits of one integer and makes that integer a table index, so problems that brute force over n! orders shrink to about 2ⁿ × n states. Recognise it by a small n and a question about visiting, assigning or grouping everything; then pick the state — \`dp[mask]\`, \`dp[mask][last]\`, or \`dp[mask]\` over submasks — and loop masks upward. In C++ it is the fastest of the four languages for this, but be explicit: parenthesise every \`&\`, use \`1LL\` for wide shifts, never add to \`INT_MAX\`, and know that \`__builtin_popcount\` is an extension. For the bit tricks themselves see [bit-manipulation tricks](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews), and for the other big DP state shapes compare [equal-sum partition](/interview-question/how-do-you-check-if-an-array-can-be-partitioned-into-two-equal-sum-subsets) and [Burst Balloons](/interview-question/burst-balloons-why-does-dp-over-intervals-not-balloons-work).`,
        examples: [
          {
            label: "Mask operations and the assignment problem with dp[mask]",
            code: `#include <climits>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

string bits(int mask, int n) {
    string s;
    for (int i = n - 1; i >= 0; i--) s += (mask >> i & 1) ? '1' : '0';
    return s;
}

string members(int mask, int n) {
    string out = "[";
    for (int i = 0; i < n; i++) {
        if (mask >> i & 1) {
            if (out.size() > 1) out += ", ";
            out += to_string(i);
        }
    }
    return out + "]";
}

const int INF = INT_MAX;                       // never add to it: skip INF states

struct Assignment {
    int best;
    vector<int> jobs;
    int transitions;
};

Assignment assign(const vector<vector<int>>& cost) {
    int n = cost.size();
    vector<int> dp(1 << n, INF);               // dp[mask]: cheapest way to give the jobs in mask to workers 0..popcount-1
    vector<int> choice(1 << n, -1);
    dp[0] = 0;
    int transitions = 0;
    for (int mask = 0; mask < (1 << n); mask++) {   // every mask is reached only from smaller masks
        if (dp[mask] == INF) continue;
        int worker = __builtin_popcount(mask);      // GCC/Clang builtin; std::popcount is C++20
        if (worker == n) continue;
        for (int job = 0; job < n; job++) {
            if (mask >> job & 1) continue;
            transitions++;
            int nxt = mask | 1 << job;
            if (dp[mask] + cost[worker][job] < dp[nxt]) {
                dp[nxt] = dp[mask] + cost[worker][job];
                choice[nxt] = job;
            }
        }
    }
    int full = (1 << n) - 1;
    vector<int> jobs(n);
    int m = full;
    for (int worker = n - 1; worker >= 0; worker--) {   // walk back from the full set
        jobs[worker] = choice[m];
        m ^= 1 << choice[m];
    }
    return {dp[full], jobs, transitions};
}

int bruteMin(const vector<vector<int>>& cost, int worker, vector<bool>& used) {
    if (worker == (int)cost.size()) return 0;
    int best = INF;
    for (int job = 0; job < (int)cost.size(); job++) {
        if (used[job]) continue;
        used[job] = true;
        best = min(best, cost[worker][job] + bruteMin(cost, worker + 1, used));
        used[job] = false;
    }
    return best;
}

int main() {
    cout << boolalpha;
    // Part 1: a set of items 0..3 stored in one integer
    int n = 4;
    int mask = 0b1011;                         // a binary literal: items 0, 1 and 3
    cout << "mask " << bits(mask, n) << " = " << mask << ", members " << members(mask, n) << "\\n";
    cout << "has item 2? " << ((mask >> 2 & 1) == 1) << "\\n";
    cout << "add 2:    " << bits(mask | 1 << 2, n) << "\\n";
    cout << "remove 0: " << bits(mask & ~(1 << 0), n) << "\\n";
    cout << "toggle 3: " << bits(mask ^ 1 << 3, n) << "\\n";
    cout << "size (popcount): " << __builtin_popcount(mask) << "\\n";
    cout << "lowest set bit: " << bits(mask & -mask, n) << "\\n";
    cout << "full set: " << bits((1 << n) - 1, n) << "\\n";

    // Part 2: assign 4 workers to 4 jobs, one job each, at minimum total cost
    vector<vector<int>> cost = {{9, 2, 7, 8},
                                {6, 4, 3, 7},
                                {5, 8, 1, 8},
                                {7, 6, 9, 4}};
    Assignment r = assign(cost);
    vector<bool> used(4, false);
    int brute = bruteMin(cost, 0, used);
    cout << "min cost " << r.best << " (brute force over 24 orders: " << brute << ")\\n";
    cout << "worker -> job: ";
    for (int w = 0; w < 4; w++) cout << (w ? ", " : "") << w << "->" << r.jobs[w];
    cout << "\\n";
    cout << "states: " << (1 << 4) << ", transitions: " << r.transitions << "\\n";

    vector<vector<int>> big(10, vector<int>(10));
    for (int w = 0; w < 10; w++)
        for (int j = 0; j < 10; j++) big[w][j] = (w * w * 7 + j * 13 + w * j) % 23 + 1;
    Assignment r10 = assign(big);
    long long orders = 1;
    for (int k = 2; k <= 10; k++) orders *= k;
    cout << "n = 10: min cost " << r10.best << ", states " << (1 << 10) << ", transitions " << r10.transitions << ", orders 10! = " << orders << "\\n";
}`,
          },
          {
            label: "Held-Karp travelling salesman with dp[mask][last]",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

const int INF = 1000000000;            // big but safe: INF + a distance still fits in int

struct Tour {
    int best;
    vector<int> cities;
    int transitions;
};

Tour heldKarp(const vector<vector<int>>& d) {
    int n = d.size();
    int full = (1 << n) - 1;
    // dp[mask][last]: shortest path that starts at city 0, visits exactly the cities in mask, ends at last
    vector<vector<int>> dp(1 << n, vector<int>(n, INF));
    vector<vector<int>> parent(1 << n, vector<int>(n, -1));
    dp[1][0] = 0;                      // mask 00001: only city 0 visited, standing at city 0, length 0
    int transitions = 0;
    for (int mask = 0; mask < (1 << n); mask++) {
        if (!(mask & 1)) continue;     // every path starts at city 0
        for (int last = 0; last < n; last++) {
            if (dp[mask][last] == INF) continue;
            for (int nxt = 0; nxt < n; nxt++) {
                if (mask >> nxt & 1) continue;
                transitions++;
                int cand = dp[mask][last] + d[last][nxt];
                int m2 = mask | 1 << nxt;
                if (cand < dp[m2][nxt]) {
                    dp[m2][nxt] = cand;
                    parent[m2][nxt] = last;
                }
            }
        }
    }
    int best = INF, end = -1;
    for (int last = 1; last < n; last++) {   // close the loop back to city 0
        if (dp[full][last] + d[last][0] < best) {
            best = dp[full][last] + d[last][0];
            end = last;
        }
    }
    vector<int> tour;
    int mask = full, cur = end;
    while (cur != -1) {                // walk the parents back to city 0
        tour.push_back(cur);
        int prev = parent[mask][cur];
        mask ^= 1 << cur;
        cur = prev;
    }
    reverse(tour.begin(), tour.end());
    tour.push_back(0);
    return {best, tour, transitions};
}

string join(const vector<int>& xs) {
    string out;
    for (size_t i = 0; i < xs.size(); i++) {
        if (i > 0) out += " -> ";
        out += to_string(xs[i]);
    }
    return out;
}

int main() {
    vector<vector<int>> d = {{0, 2, 9, 10, 7},
                             {2, 0, 6, 4, 3},
                             {9, 6, 0, 8, 5},
                             {10, 4, 8, 0, 6},
                             {7, 3, 5, 6, 0}};
    Tour t = heldKarp(d);
    cout << "shortest tour: " << join(t.cities) << ", length " << t.best << "\\n";

    vector<int> order = {1, 2, 3, 4};  // sorted, so next_permutation visits all (n-1)! orders
    int brute = INF, tried = 0;
    do {
        tried++;
        int len = d[0][order[0]] + d[order.back()][0];
        for (size_t i = 0; i + 1 < order.size(); i++) len += d[order[i]][order[i + 1]];
        brute = min(brute, len);
    } while (next_permutation(order.begin(), order.end()));
    cout << "brute force: " << brute << " after " << tried << " orders\\n";
    cout << "held-karp: " << (1 << 5) << " masks x 5 cities, " << t.transitions << " transitions\\n";

    int n = 12;
    vector<vector<int>> far(n, vector<int>(n));
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) far[i][j] = i == j ? 0 : (i * 17 + j * 17 + i * j) % 40 + 5;
    Tour t12 = heldKarp(far);
    long long orders = 1;
    for (int k = 2; k < n; k++) orders *= k;
    cout << "n = 12: length " << t12.best << ", tour " << join(t12.cities) << "\\n";
    cout << "n = 12: " << t12.transitions << " transitions vs " << orders << " brute-force orders\\n";
}`,
          },
          {
            label: "Submask enumeration, the 3^n count, and fewest elevator trips",
            code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

string bits(int mask, int n) {
    string s;
    for (int i = n - 1; i >= 0; i--) s += (mask >> i & 1) ? '1' : '0';
    return s;
}

int main() {
    // Part 1: every submask of 1011, largest first, with the (sub - 1) & mask trick
    int mask = 0b1011;
    vector<string> subs;
    int sub = mask;
    while (true) {
        subs.push_back(bits(sub, 4));
        if (sub == 0) break;
        sub = (sub - 1) & mask;
    }
    cout << "submasks of 1011: ";
    for (size_t i = 0; i < subs.size(); i++) cout << (i ? ", " : "") << subs[i];
    cout << "\\n";
    cout << "count: " << subs.size() << " = 2^" << __builtin_popcount(mask) << "\\n";

    // Part 2: looping over every submask of every mask costs 3^n, not 4^n
    for (int n : {4, 8, 10}) {
        long long pairs = 0;
        for (int m = 0; m < (1 << n); m++) {
            int s = m;
            while (true) {
                pairs++;
                if (s == 0) break;
                s = (s - 1) & m;
            }
        }
        long long p3 = 1, p4 = 1;
        for (int k = 0; k < n; k++) { p3 *= 3; p4 *= 4; }   // std::pow returns a double
        cout << "n = " << n << ": " << pairs << " (mask, submask) pairs, 3^n = " << p3 << ", 4^n = " << p4 << "\\n";
    }

    // Part 3: use it - fewest elevator trips, weight limit 150, for 7 people
    vector<int> weights = {70, 50, 80, 40, 60, 30, 90};
    const int LIMIT = 150;
    int n = weights.size();
    int full = (1 << n) - 1;
    vector<int> load(1 << n, 0);                   // load[mask]: total weight of the people in mask
    for (int m = 1; m < (1 << n); m++) {
        int low = __builtin_ctz(m);                // index of the lowest set bit (m must not be 0)
        load[m] = load[m & (m - 1)] + weights[low];
    }
    vector<int> dp(1 << n, n + 1);                 // dp[mask]: fewest trips that carry exactly mask
    vector<int> group(1 << n, 0);                  // group[mask]: the last trip used for mask
    dp[0] = 0;
    for (int m = 1; m < (1 << n); m++) {
        for (int s = m; s != 0; s = (s - 1) & m) {     // try every group s that could ride together
            if (load[s] <= LIMIT && dp[m ^ s] + 1 < dp[m]) {
                dp[m] = dp[m ^ s] + 1;
                group[m] = s;
            }
        }
    }
    cout << "total weight " << load[full] << ", limit " << LIMIT << " per trip\\n";
    cout << "fewest trips: " << dp[full] << "\\n"; // 3
    for (int m = full; m != 0; m ^= group[m]) {
        int g = group[m];
        cout << "  trip: ";
        bool first = true;
        for (int i = 0; i < n; i++) {
            if (g >> i & 1) {
                cout << (first ? "" : ", ") << weights[i];
                first = false;
            }
        }
        cout << " (load " << load[g] << ")\\n";
    }
}`,
          },
        ],
      },
    },
  },
];

export default augments;
