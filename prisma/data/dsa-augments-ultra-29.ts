/**
 * DSA ULTRA — batch 29: dynamic programming II — sequences and knapsack:
 * longest common subsequence, longest increasing subsequence (O(n^2) and
 * patience-sorting O(n log n)), edit distance (Levenshtein) and 0/1 knapsack.
 * One complete answer per language (Python, JavaScript, Java, C++). Every
 * example was run with python3 / node / javac+java / g++ -std=c++17 by
 * scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  {
    title: "How do you find the longest common subsequence?",
    difficulty: "medium",
    seoDescription: `Longest common subsequence with a 2D DP table: the recurrence, rebuilding the string, two-row memory, verified in Python, JS, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given two strings, return the length of their longest common subsequence — characters in the same order, but not necessarily next to each other. Then show me how you would get the subsequence itself. Please code it in Python."

**What a strong answer should cover:**
- The state \`dp[i][j]\` = LCS length of the first i characters of one string and the first j of the other, with row 0 and column 0 meaning the empty prefix.
- The recurrence: equal last characters → \`dp[i-1][j-1] + 1\`; different → \`max(dp[i-1][j], dp[i][j-1])\`; and why the order of filling makes every input ready.
- O(m·n) time and space, and the two-row version in O(min(m, n)) space when only the length is needed.
- Rebuilding the string by walking back from \`dp[m][n]\`, and noting that ties mean the LCS is not unique.
- Python details: building rows with a list comprehension (not \`[[0] * n] * m\`, which aliases one row), and that a memoized recursive version hits the default recursion limit of 1000 on long strings.

**Clarifying questions expected:**
- Do you need the length only, or the subsequence string as well?
- Subsequence (gaps allowed) or substring (contiguous)?
- How long can the strings get?

**Code / implementation expected:** Yes — a bottom-up table in Python returning the length, plus a walk back that returns one LCS string.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, lists and 2D lists.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two friends each wrote down the films they watched this year, in the order they watched them. Maya's list is *Alien, Barbie, Cars, Dune, Elf*; Raj's list is *Alien, Cars, Elf*. They want to know: **what is the longest run of films they both watched in the same order?** Not necessarily back to back — Maya watched Barbie in between — but in the same order. The answer is *Alien, Cars, Elf*, three films.

That question — "what is the longest thing two sequences share, in order, with gaps allowed?" — is the **longest common subsequence**. It sounds like a toy, but it is the engine behind real tools: \`diff\` and Git show the lines two versions of a file have in common and mark the rest as added or removed; biologists line up DNA strands the same way; plagiarism checkers and spell checkers use cousins of it.

It is also the classic "two-string" dynamic programming problem. Once you can fill an LCS table, [edit distance](/interview-question/how-do-you-compute-the-edit-distance-between-two-strings) and most other two-sequence questions are the same table with a different rule in each cell.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want only the length, or the subsequence itself? | The length needs only two rows of memory; rebuilding the string needs the full table (or a cleverer algorithm). |
| Subsequence or substring — may there be gaps? | "Longest common **substring**" (no gaps) is a different recurrence: a mismatch resets the cell to 0. |
| How long can the strings be? | m · n cells: 1,000 × 1,000 is a million cells and fine; 100,000 × 100,000 is not. |
| If several LCS strings tie, is any one acceptable? | "ABCBDAB" and "BDCABA" have several LCS of length 4; returning all of them can be exponential. |
| Case-sensitive? Characters or whole tokens (lines, words)? | The algorithm is the same; only the equality test changes. diff compares whole lines. |

## 3. The Core Idea in Plain Words

A **subsequence** is what you get by crossing out some characters of a string and keeping the rest in order. "ace" is a subsequence of "abcde" (cross out b and d). "aec" is not — the order changed. A **substring** is stricter: the kept characters must be next to each other.

📌 **Interview term: Subsequence** — the characters left after deleting zero or more characters, in their original order; gaps are allowed. Contrast with a substring, which is a contiguous block.

📌 **Interview term: Longest common subsequence (LCS)** — the longest string that is a subsequence of both inputs. For "abcde" and "ace" it is "ace", length 3.

Trying every subsequence is hopeless: a string of length m has 2^m of them. The trick is to stop thinking about whole strings and ask a smaller question about **prefixes**:

> What is the LCS of the first i characters of text1 and the first j characters of text2?

Call that number \`dp[i][j]\`. Now look at the **last** character of each prefix, \`text1[i-1]\` and \`text2[j-1]\`:

- **They are equal.** Then that character can end the common subsequence. Use it, and solve the rest: \`dp[i][j] = dp[i-1][j-1] + 1\`.
- **They differ.** At least one of them is not in the answer. Either drop the last character of text1 or drop the last character of text2, and keep whichever is better: \`dp[i][j] = max(dp[i-1][j], dp[i][j-1])\`.
- **Base case.** If either prefix is empty, the LCS is empty: \`dp[0][j] = dp[i][0] = 0\`.

📌 **Interview term: State** — the small set of numbers that describes one subproblem. Here the state is (i, j): "how much of each string have I used?"

📌 **Interview term: Recurrence (transition)** — the rule that computes a state from smaller states. Here: match means diagonal + 1, mismatch means the max of up and left.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="How one LCS cell is computed. A match takes the diagonal cell plus one. A mismatch takes the larger of the cell above and the cell to the left">
  <defs>
    <marker id="b29q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="30" width="220" height="70" rx="10"/>
  <text class="d-text" x="150" y="60" text-anchor="middle">diagonal</text>
  <text class="d-sub" x="150" y="84" text-anchor="middle">dp[i-1][j-1]</text>
  <rect class="d-box-muted" x="380" y="30" width="220" height="70" rx="10"/>
  <text class="d-text" x="490" y="60" text-anchor="middle">up</text>
  <text class="d-sub" x="490" y="84" text-anchor="middle">dp[i-1][j]</text>
  <rect class="d-box-muted" x="40" y="200" width="220" height="70" rx="10"/>
  <text class="d-text" x="150" y="230" text-anchor="middle">left</text>
  <text class="d-sub" x="150" y="254" text-anchor="middle">dp[i][j-1]</text>
  <rect class="d-box-accent" x="380" y="200" width="220" height="70" rx="10"/>
  <text class="d-text" x="490" y="230" text-anchor="middle">this cell</text>
  <text class="d-sub" x="490" y="254" text-anchor="middle">dp[i][j]</text>
  <path class="d-edge-accent" d="M 262 100 L 376 198" marker-end="url(#b29q1-arrow)"/>
  <text class="d-sub" x="230" y="160" text-anchor="middle">match: plus 1</text>
  <path class="d-edge" d="M 490 102 L 490 196" marker-end="url(#b29q1-arrow)"/>
  <text class="d-sub" x="560" y="155" text-anchor="middle">mismatch</text>
  <path class="d-edge" d="M 262 235 L 376 235" marker-end="url(#b29q1-arrow)"/>
  <text class="d-sub" x="320" y="218" text-anchor="middle">mismatch</text>
</svg>

Every cell needs only its three neighbours above and to the left, so if you fill the table row by row, left to right, those neighbours are always ready. Here is the whole table for "abcde" and "ace" (it is the exact table example 1 prints):

<svg class="iq-diagram" width="100%" viewBox="0 0 560 388" role="img" aria-label="The LCS table for abcde and ace. The three matching cells a, c and e step the value from 1 to 2 to 3">
  <text class="d-sub" x="280" y="24" text-anchor="middle">rows: prefixes of abcde, columns: prefixes of ace</text>
  <text class="d-text" x="199" y="56" text-anchor="middle">-</text>
  <text class="d-text" x="263" y="56" text-anchor="middle">a</text>
  <text class="d-text" x="327" y="56" text-anchor="middle">c</text>
  <text class="d-text" x="391" y="56" text-anchor="middle">e</text>
  <text class="d-text" x="137" y="100" text-anchor="middle">-</text>
  <rect class="d-box-muted" x="170" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="234" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="298" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="362" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="100" text-anchor="middle">0</text>
  <text class="d-text" x="137" y="148" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="170" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="148" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="234" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="362" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="148" text-anchor="middle">1</text>
  <text class="d-text" x="137" y="196" text-anchor="middle">b</text>
  <rect class="d-box-muted" x="170" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="196" text-anchor="middle">0</text>
  <rect class="d-box" x="234" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="196" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="196" text-anchor="middle">1</text>
  <rect class="d-box" x="362" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="196" text-anchor="middle">1</text>
  <text class="d-text" x="137" y="244" text-anchor="middle">c</text>
  <rect class="d-box-muted" x="170" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="244" text-anchor="middle">0</text>
  <rect class="d-box" x="234" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="244" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="298" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="244" text-anchor="middle">2</text>
  <rect class="d-box" x="362" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="244" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="292" text-anchor="middle">d</text>
  <rect class="d-box-muted" x="170" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="292" text-anchor="middle">0</text>
  <rect class="d-box" x="234" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="292" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="292" text-anchor="middle">2</text>
  <rect class="d-box" x="362" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="292" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="340" text-anchor="middle">e</text>
  <rect class="d-box-muted" x="170" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="340" text-anchor="middle">0</text>
  <rect class="d-box" x="234" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="340" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="340" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="362" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="340" text-anchor="middle">3</text>
</svg>

The value grows only on the three highlighted cells, where a row letter equals a column letter (a = a, c = c, e = e), and the answer is the bottom-right cell, 3. Walking back from that cell — diagonal on a match, otherwise towards the larger neighbour — spells the LCS backwards: e, c, a.

📌 **Interview term: Tabulation (bottom-up DP)** — filling a table of subproblem answers in an order where every cell's inputs are already computed, instead of recursing.

📌 **Interview term: Backtracking the table (reconstruction)** — walking from the final cell back to the start, repeating the choice each cell made, to recover the actual answer (here the LCS string) and not just its length.

## 4. From Brute Force to the Table

There are four versions of this solution, and an interviewer likes to hear you move through them:

1. **Plain recursion.** \`lcs(i, j)\` calls itself on (i+1, j+1) for a match, or on both (i+1, j) and (i, j+1) for a mismatch. Correct, but the same (i, j) pair is solved again and again. With no matching letters at all, two strings of length 10 already need **369,511** calls (example 2).
2. **Memoization (top-down).** Same recursion, but store each (i, j) answer the first time and reuse it. There are only (m+1)·(n+1) pairs, so the same two strings need just **100** computed states. The idea is the one on [What is memoization?](/interview-question/what-is-memoization).
3. **Tabulation (bottom-up).** Fill \`dp\` row by row as in the diagram. No recursion, so no stack-depth limit, and the loop is easy to reason about.
4. **Two rows.** Row i only reads row i-1 and itself, so keep just two rows: O(min(m, n)) memory. The price is that you can no longer walk back to rebuild the string.

📌 **Interview term: Memoization** — caching the result of a function call by its arguments so each distinct subproblem is solved once.

📌 **Interview term: Overlapping subproblems** — the same smaller question is reached by many different paths, which is exactly what makes caching pay off. It is one of the two signs that a problem fits [dynamic programming](/interview-question/what-is-dynamic-programming); the other is optimal substructure (the best answer is built from best answers to smaller pieces).

## 5. The Code in Python

The table is a list of lists. Build it with a **list comprehension** so that every row is its own list:

~~~python
def lcs_table(a, b):
    m, n = len(a), len(b)
    # dp[i][j] = LCS length of a[:i] and b[:j]; row 0 and column 0 are the empty prefix
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp


def lcs_string(a, b, dp):
    i, j, out = len(a), len(b), []
    while i > 0 and j > 0:
        if a[i - 1] == b[j - 1]:
            out.append(a[i - 1])
            i -= 1
            j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return "".join(reversed(out))
~~~

**What to point out in this code:**

- \`dp\` has \`m + 1\` rows and \`n + 1\` columns. The extra row and column are the empty prefixes, so \`dp[i - 1][j - 1]\` never goes out of range and no special case is needed for i = 0 or j = 0.
- \`[[0] * (n + 1) for _ in range(m + 1)]\` creates m + 1 separate lists. The shortcut \`[[0] * (n + 1)] * (m + 1)\` creates m + 1 references to **one** list, so writing one cell writes the whole column — running \`grid = [[0] * 3] * 2; grid[0][0] = 9\` prints \`[[9, 0, 0], [9, 0, 0]]\`.
- \`lcs_string\` walks back from the bottom-right corner. On a match it takes the character and moves diagonally; otherwise it moves towards the neighbour that holds the larger value (up on a tie). It collects characters backwards, so it reverses at the end with \`"".join(reversed(out))\` — joining once is O(length), while \`s = ch + s\` in a loop copies the string every time.
- Strings are indexed directly (\`a[i - 1]\`); a Python \`str\` index is O(1).

**When you only need the length**, keep two rows. Swap the strings so that the rows are as short as possible:

~~~python
def two_rows_lcs(a, b):
    if len(b) > len(a):
        a, b = b, a                 # keep the rows as short as possible
    prev = [0] * (len(b) + 1)
    for i in range(1, len(a) + 1):
        cur = [0] * (len(b) + 1)
        for j in range(1, len(b) + 1):
            cur[j] = prev[j-1] + 1 if a[i-1] == b[j-1] else max(prev[j], cur[j-1])
        prev = cur
    return prev[len(b)]

~~~

📌 **Interview term: Rolling array (two rows)** — keeping only the previous and current rows of a DP table, because no cell reads anything older. Memory drops from O(m·n) to O(min(m, n)).

**The top-down version.** Example 2 also contains a memoized recursion with a \`dict\` keyed by \`(i, j)\`. In Python you would usually write it with \`@functools.lru_cache(maxsize=None)\` instead (\`functools.cache\` is the same thing, [per the docs](https://docs.python.org/3/library/functools.html#functools.cache)). Either way the recursion goes about m + n calls deep, and Python's default recursion limit is 1000 (\`sys.getrecursionlimit()\` printed \`1000\` here). We ran the \`lru_cache\` version on two strings of 1,500 characters and it raised \`RecursionError: maximum recursion depth exceeded\`. The bottom-up table has no such limit, which is the main reason to prefer it in Python.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the table for "abcde" / "ace", then the length and one LCS for six pairs** prints:

~~~text
table rows (text1 = abcde, text2 = ace):
- [0, 0, 0, 0]
a [0, 1, 1, 1]
b [0, 1, 1, 1]
c [0, 1, 2, 2]
d [0, 1, 2, 2]
e [0, 1, 2, 3]
lcs("abcde", "ace") = 3, one LCS: "ace"
lcs("abc", "abc") = 3, one LCS: "abc"
lcs("abc", "def") = 0, one LCS: ""
lcs("", "abc") = 0, one LCS: ""
lcs("ABCBDAB", "BDCABA") = 4, one LCS: "BCBA"
lcs("AGGTAB", "GXTXAYB") = 4, one LCS: "GTAB"
~~~

The six table rows are the diagram in section 3. "ABCBDAB" / "BDCABA" prints "BCBA", but "BDAB" is another LCS of length 4 — the walk-back tie-break (go up when up ≥ left) picks one.

**Example 2 — the same problem four ways** prints:

~~~text
abcdefgh vs ijklmnop: naive 0 in 25739 calls, memo 0 in 64 states
abcdefghij vs klmnopqrst: naive 0 in 369511 calls, memo 0 in 100 states
AGGTABQXYZ vs GXTXAYBQZY: naive 6 in 35723 calls, memo 6 in 84 states
random 800 x 600 over 4 letters: table 444, two rows 444, cells 480000
~~~

What the numbers show:

- With no letters in common, the plain recursion makes **25,739** calls for two strings of 8 and **369,511** for two strings of 10 — it grows exponentially. The memo version computes **64** and **100** states: one per (i, j) pair.
- Even when the strings share letters ("AGGTABQXYZ" / "GXTXAYBQZY", LCS 6), recursion makes 35,723 calls against 84 memoized states.
- On two random strings of 800 and 600 letters (480,000 cells), the full table and the two-row version agree: 444.

## 7. Complexity

m and n are the two string lengths.

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential, up to O(2^(m+n)) | O(m + n) stack | a mismatch branches twice and subproblems repeat |
| Memoized recursion | O(m·n) | O(m·n) cache + O(m + n) stack | each (i, j) is computed once |
| Full table | O(m·n) | O(m·n) | one O(1) step per cell |
| Two rows | O(m·n) | O(min(m, n)) | only the previous row is ever read |
| Rebuild the string | O(m + n) extra | needs the full table | each step decreases i or j |

In Python each table cell is a reference to an \`int\` object inside a list, so a 5,000 × 5,000 table is 25 million list slots — 200 MB for the 8-byte slots alone on a 64-bit build, before counting the \`int\` objects. For long inputs, use the two-row version, or a cleverer algorithm such as Hirschberg's, which rebuilds the string in linear space with a divide-and-conquer trick (named here only; not shown).

## 8. Edge Cases

- **An empty string.** Every cell in row 0 or column 0 is 0, so the answer is 0 and the LCS is "" (example 1: \`lcs("", "abc") = 0\`).
- **No common character.** Every cell stays 0 ("abc" vs "def").
- **Identical strings.** The answer is the full length and the walk back takes the diagonal every time ("abc" vs "abc" gives 3).
- **Several LCS of the same length.** "ABCBDAB" and "BDCABA" have more than one LCS of length 4; the tie-break in the walk back (go up when up ≥ left) decides which one you print — here "BCBA". Say so instead of claiming it is *the* LCS.
- **Repeated letters.** No special handling: the recurrence never uses a character twice because i and j only move forward.
- **Very different lengths.** Put the shorter string on the columns so the two-row version uses less memory.

## Common Pitfalls

- **\`[[0] * (n + 1)] * (m + 1)\`** — every row is the same list object, so the table silently corrupts. Use a list comprehension.
- **Off-by-one between \`dp\` and the strings.** \`dp[i][j]\` is about \`a[:i]\` and \`b[:j]\`, so the characters to compare are \`a[i - 1]\` and \`b[j - 1]\`, not \`a[i]\` and \`b[j]\`.
- **Confusing subsequence with substring.** For the longest common substring, a mismatch sets the cell to 0 and the answer is the largest cell anywhere, not the bottom-right one.
- **Using \`lru_cache\` recursion on long strings.** It hits \`RecursionError\` once the depth passes 1000; raising \`sys.setrecursionlimit\` too far can crash the interpreter instead ([the docs warn about this](https://docs.python.org/3/library/sys.html#sys.setrecursionlimit)). Prefer the table.
- **Rebuilding from the two-row version.** Once old rows are thrown away you cannot walk back; keep the full table if you need the string.
- **Building the answer with \`s = ch + s\`** in the walk back — quadratic copying. Append to a list and \`"".join(reversed(...))\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j]</code> is the LCS length of the first i characters of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text1</code> and the first j of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text2</code>; row 0 and column 0 are the empty prefix, so they are 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The recurrence:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text1[i-1] == text2[j-1]</code> take the diagonal plus one; otherwise take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(up, left)</code>. The answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[m][n]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">m·n cells, O(1) each: O(m·n) time and space. For the length only, two rows give O(min(m, n)) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The string:</strong> <span style="color:#f0e2c8;">Walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[m][n]</code>: diagonal on a match, else towards the larger neighbour; reverse at the end. Ties mean the LCS is not unique.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Build rows with a list comprehension, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[0]<em style="color:#ffca28;">n]</em>m</code>, and prefer the bottom-up table because a memoized recursion hits the 1000-frame recursion limit.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is plain recursion so slow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A mismatch branches into two calls and the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(i, j)</code> is reached by many paths. In our run two 10-letter strings with nothing in common needed 369,511 calls, while memoization needed 100 states.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the longest common <strong style="color:#ffe0b2;">substring</strong> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Change the mismatch rule to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j] = 0</code> and track the largest cell seen anywhere; the substring ends at that cell. Gaps are no longer allowed, so the max over up and left is gone.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you rebuild the LCS string with only two rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by walking back — the old rows are gone. Keep the full table, or use Hirschberg's divide-and-conquer algorithm, which finds the middle of the path with two-row passes and recurses, for O(min(m, n)) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to edit distance and diff?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same table, different cell rule. With only insertions and deletions allowed, edit distance is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m + n - 2 * LCS</code>; tools like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">diff</code> find a longest common subsequence of lines and report the rest as added or removed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the strings are huge, say 100,000 characters each?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">10^10 cells is too much time for any language, and far too much memory in Python. Ask whether the alphabet is small or the strings are similar; specialised algorithms exploit that, but the plain DP stays O(m·n).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subsequence** | Characters kept in order after deleting some; gaps allowed |
| **Longest common subsequence (LCS)** | The longest string that is a subsequence of both inputs |
| **State** | The numbers that name one subproblem — here (i, j), the prefix lengths |
| **Recurrence (transition)** | The rule for one cell: match → diagonal + 1, mismatch → max(up, left) |
| **Tabulation (bottom-up DP)** | Filling the table in an order where every input cell is already known |
| **Backtracking the table** | Walking back from the last cell to rebuild the actual subsequence |
| **Memoization** | Caching each subproblem answer by its arguments so it is computed once |
| **Overlapping subproblems** | The same subproblem is reached by many paths, so caching pays off |
| **Rolling array (two rows)** | Keeping only the previous and current row because nothing older is read |

---
**Conclusion:** The longest common subsequence is a two-dimensional DP over prefixes: \`dp[i][j]\` is the answer for \`a[:i]\` and \`b[:j]\`, a match takes the diagonal plus one, and a mismatch takes the larger of up and left. In Python, build the table with a list comprehension, fill it row by row, and read the answer from the bottom-right corner; walk back from there to recover one LCS, or keep only two rows when the length is enough. Our runs showed why the table matters: 369,511 recursive calls collapse to 100 states, and the bottom-up loop avoids Python's 1000-frame recursion limit entirely.`,
        examples: [
          {
            label: `LCS table, length and one LCS string on six pairs`,
            code: `def lcs_table(a, b):
    m, n = len(a), len(b)
    # dp[i][j] = LCS length of a[:i] and b[:j]; row 0 and column 0 are the empty prefix
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp


def lcs_string(a, b, dp):
    i, j, out = len(a), len(b), []
    while i > 0 and j > 0:
        if a[i - 1] == b[j - 1]:
            out.append(a[i - 1])
            i -= 1
            j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return "".join(reversed(out))


def fmt(row):
    return "[" + ", ".join(str(x) for x in row) + "]"


a, b = "abcde", "ace"
dp = lcs_table(a, b)
print("table rows (text1 = abcde, text2 = ace):")
print("- " + fmt(dp[0]))
for i in range(1, len(a) + 1):
    print(a[i - 1] + " " + fmt(dp[i]))

for a, b in [("abcde", "ace"), ("abc", "abc"), ("abc", "def"), ("", "abc"),
             ("ABCBDAB", "BDCABA"), ("AGGTAB", "GXTXAYB")]:
    dp = lcs_table(a, b)
    print('lcs("' + a + '", "' + b + '") = ' + str(dp[len(a)][len(b)]) +
          ', one LCS: "' + lcs_string(a, b, dp) + '"')`,
          },
          {
            label: `Naive recursion vs memo vs table vs two rows`,
            code: `import sys
sys.setrecursionlimit(10000)

calls = 0
def naive(a, b, i, j):
    global calls
    calls += 1
    if i == len(a) or j == len(b):
        return 0
    if a[i] == b[j]:
        return 1 + naive(a, b, i + 1, j + 1)
    return max(naive(a, b, i + 1, j), naive(a, b, i, j + 1))

states = 0
def memo_lcs(a, b):
    global states
    memo = {}
    def go(i, j):
        global states
        if i == len(a) or j == len(b):
            return 0
        if (i, j) in memo:
            return memo[(i, j)]
        states += 1
        if a[i] == b[j]:
            r = 1 + go(i + 1, j + 1)
        else:
            r = max(go(i + 1, j), go(i, j + 1))
        memo[(i, j)] = r
        return r
    return go(0, 0)

def table_lcs(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            dp[i][j] = dp[i-1][j-1] + 1 if a[i-1] == b[j-1] else max(dp[i-1][j], dp[i][j-1])
    return dp[m][n]

def two_rows_lcs(a, b):
    if len(b) > len(a):
        a, b = b, a                 # keep the rows as short as possible
    prev = [0] * (len(b) + 1)
    for i in range(1, len(a) + 1):
        cur = [0] * (len(b) + 1)
        for j in range(1, len(b) + 1):
            cur[j] = prev[j-1] + 1 if a[i-1] == b[j-1] else max(prev[j], cur[j-1])
        prev = cur
    return prev[len(b)]

for a, b in [("abcdefgh", "ijklmnop"), ("abcdefghij", "klmnopqrst"), ("AGGTABQXYZ", "GXTXAYBQZY")]:
    calls = 0
    r1 = naive(a, b, 0, 0)
    states = 0
    r2 = memo_lcs(a, b)
    print(a + " vs " + b + ": naive " + str(r1) + " in " + str(calls) + " calls, memo " +
          str(r2) + " in " + str(states) + " states")

seed = 12345
def nxt():
    global seed
    seed = seed * 48271 % 2147483647
    return seed

x = "".join(chr(97 + nxt() % 4) for _ in range(800))
y = "".join(chr(97 + nxt() % 4) for _ in range(600))
print("random 800 x 600 over 4 letters: table " + str(table_lcs(x, y)) +
      ", two rows " + str(two_rows_lcs(x, y)) + ", cells " + str(800 * 600))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given two strings, return the length of their longest common subsequence — characters in the same order, but not necessarily next to each other. Then show me how you would get the subsequence itself. Please code it in JavaScript."

**What a strong answer should cover:**
- The state \`dp[i][j]\` = LCS length of the first i characters of one string and the first j of the other, with row 0 and column 0 meaning the empty prefix.
- The recurrence: equal last characters → \`dp[i-1][j-1] + 1\`; different → \`Math.max(dp[i-1][j], dp[i][j-1])\`; and why the fill order makes every input ready.
- O(m·n) time and space, and the two-row version in O(min(m, n)) space when only the length is needed.
- Rebuilding the string by walking back from \`dp[m][n]\`, and noting that ties mean the LCS is not unique.
- JavaScript details: \`Array.from({ length }, () => ...)\` for independent rows (not \`new Array(m).fill(new Array(n))\`, which shares one row), \`Int32Array\` rows for large tables, numeric \`Map\` keys for memoization, and \`str[i]\` being a UTF-16 code unit.

**Clarifying questions expected:**
- Do you need the length only, or the subsequence string as well?
- Subsequence (gaps allowed) or substring (contiguous)?
- How long can the strings get, and can they contain emoji or other non-BMP characters?

**Code / implementation expected:** Yes — a bottom-up table in JavaScript returning the length, plus a walk back that returns one LCS string.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, arrays and arrays of arrays.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two friends each wrote down the films they watched this year, in the order they watched them. Maya's list is *Alien, Barbie, Cars, Dune, Elf*; Raj's list is *Alien, Cars, Elf*. They want to know: **what is the longest run of films they both watched in the same order?** Not necessarily back to back — Maya watched Barbie in between — but in the same order. The answer is *Alien, Cars, Elf*, three films.

That question — "what is the longest thing two sequences share, in order, with gaps allowed?" — is the **longest common subsequence**. It sounds like a toy, but it is the engine behind real tools: \`diff\` and Git show the lines two versions of a file have in common and mark the rest as added or removed; biologists line up DNA strands the same way; plagiarism checkers and spell checkers use cousins of it.

It is also the classic "two-string" dynamic programming problem. Once you can fill an LCS table, [edit distance](/interview-question/how-do-you-compute-the-edit-distance-between-two-strings) and most other two-sequence questions are the same table with a different rule in each cell.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want only the length, or the subsequence itself? | The length needs only two rows of memory; rebuilding the string needs the full table (or a cleverer algorithm). |
| Subsequence or substring — may there be gaps? | "Longest common **substring**" (no gaps) is a different recurrence: a mismatch resets the cell to 0. |
| How long can the strings be? | m · n cells: 1,000 × 1,000 is a million cells and fine; 100,000 × 100,000 is not. |
| If several LCS strings tie, is any one acceptable? | "ABCBDAB" and "BDCABA" have several LCS of length 4; returning all of them can be exponential. |
| Case-sensitive? Characters or whole tokens (lines, words)? | The algorithm is the same; only the equality test changes. diff compares whole lines. |

## 3. The Core Idea in Plain Words

A **subsequence** is what you get by crossing out some characters of a string and keeping the rest in order. "ace" is a subsequence of "abcde" (cross out b and d). "aec" is not — the order changed. A **substring** is stricter: the kept characters must be next to each other.

📌 **Interview term: Subsequence** — the characters left after deleting zero or more characters, in their original order; gaps are allowed. Contrast with a substring, which is a contiguous block.

📌 **Interview term: Longest common subsequence (LCS)** — the longest string that is a subsequence of both inputs. For "abcde" and "ace" it is "ace", length 3.

Trying every subsequence is hopeless: a string of length m has 2^m of them. The trick is to stop thinking about whole strings and ask a smaller question about **prefixes**:

> What is the LCS of the first i characters of text1 and the first j characters of text2?

Call that number \`dp[i][j]\`. Now look at the **last** character of each prefix, \`text1[i-1]\` and \`text2[j-1]\`:

- **They are equal.** Then that character can end the common subsequence. Use it, and solve the rest: \`dp[i][j] = dp[i-1][j-1] + 1\`.
- **They differ.** At least one of them is not in the answer. Either drop the last character of text1 or drop the last character of text2, and keep whichever is better: \`dp[i][j] = max(dp[i-1][j], dp[i][j-1])\`.
- **Base case.** If either prefix is empty, the LCS is empty: \`dp[0][j] = dp[i][0] = 0\`.

📌 **Interview term: State** — the small set of numbers that describes one subproblem. Here the state is (i, j): "how much of each string have I used?"

📌 **Interview term: Recurrence (transition)** — the rule that computes a state from smaller states. Here: match means diagonal + 1, mismatch means the max of up and left.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="How one LCS cell is computed. A match takes the diagonal cell plus one. A mismatch takes the larger of the cell above and the cell to the left">
  <defs>
    <marker id="b29q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="30" width="220" height="70" rx="10"/>
  <text class="d-text" x="150" y="60" text-anchor="middle">diagonal</text>
  <text class="d-sub" x="150" y="84" text-anchor="middle">dp[i-1][j-1]</text>
  <rect class="d-box-muted" x="380" y="30" width="220" height="70" rx="10"/>
  <text class="d-text" x="490" y="60" text-anchor="middle">up</text>
  <text class="d-sub" x="490" y="84" text-anchor="middle">dp[i-1][j]</text>
  <rect class="d-box-muted" x="40" y="200" width="220" height="70" rx="10"/>
  <text class="d-text" x="150" y="230" text-anchor="middle">left</text>
  <text class="d-sub" x="150" y="254" text-anchor="middle">dp[i][j-1]</text>
  <rect class="d-box-accent" x="380" y="200" width="220" height="70" rx="10"/>
  <text class="d-text" x="490" y="230" text-anchor="middle">this cell</text>
  <text class="d-sub" x="490" y="254" text-anchor="middle">dp[i][j]</text>
  <path class="d-edge-accent" d="M 262 100 L 376 198" marker-end="url(#b29q1-arrow)"/>
  <text class="d-sub" x="230" y="160" text-anchor="middle">match: plus 1</text>
  <path class="d-edge" d="M 490 102 L 490 196" marker-end="url(#b29q1-arrow)"/>
  <text class="d-sub" x="560" y="155" text-anchor="middle">mismatch</text>
  <path class="d-edge" d="M 262 235 L 376 235" marker-end="url(#b29q1-arrow)"/>
  <text class="d-sub" x="320" y="218" text-anchor="middle">mismatch</text>
</svg>

Every cell needs only its three neighbours above and to the left, so if you fill the table row by row, left to right, those neighbours are always ready. Here is the whole table for "abcde" and "ace" (it is the exact table example 1 prints):

<svg class="iq-diagram" width="100%" viewBox="0 0 560 388" role="img" aria-label="The LCS table for abcde and ace. The three matching cells a, c and e step the value from 1 to 2 to 3">
  <text class="d-sub" x="280" y="24" text-anchor="middle">rows: prefixes of abcde, columns: prefixes of ace</text>
  <text class="d-text" x="199" y="56" text-anchor="middle">-</text>
  <text class="d-text" x="263" y="56" text-anchor="middle">a</text>
  <text class="d-text" x="327" y="56" text-anchor="middle">c</text>
  <text class="d-text" x="391" y="56" text-anchor="middle">e</text>
  <text class="d-text" x="137" y="100" text-anchor="middle">-</text>
  <rect class="d-box-muted" x="170" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="234" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="298" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="362" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="100" text-anchor="middle">0</text>
  <text class="d-text" x="137" y="148" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="170" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="148" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="234" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="362" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="148" text-anchor="middle">1</text>
  <text class="d-text" x="137" y="196" text-anchor="middle">b</text>
  <rect class="d-box-muted" x="170" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="196" text-anchor="middle">0</text>
  <rect class="d-box" x="234" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="196" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="196" text-anchor="middle">1</text>
  <rect class="d-box" x="362" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="196" text-anchor="middle">1</text>
  <text class="d-text" x="137" y="244" text-anchor="middle">c</text>
  <rect class="d-box-muted" x="170" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="244" text-anchor="middle">0</text>
  <rect class="d-box" x="234" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="244" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="298" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="244" text-anchor="middle">2</text>
  <rect class="d-box" x="362" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="244" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="292" text-anchor="middle">d</text>
  <rect class="d-box-muted" x="170" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="292" text-anchor="middle">0</text>
  <rect class="d-box" x="234" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="292" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="292" text-anchor="middle">2</text>
  <rect class="d-box" x="362" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="292" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="340" text-anchor="middle">e</text>
  <rect class="d-box-muted" x="170" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="340" text-anchor="middle">0</text>
  <rect class="d-box" x="234" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="340" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="340" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="362" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="340" text-anchor="middle">3</text>
</svg>

The value grows only on the three highlighted cells, where a row letter equals a column letter (a = a, c = c, e = e), and the answer is the bottom-right cell, 3. Walking back from that cell — diagonal on a match, otherwise towards the larger neighbour — spells the LCS backwards: e, c, a.

📌 **Interview term: Tabulation (bottom-up DP)** — filling a table of subproblem answers in an order where every cell's inputs are already computed, instead of recursing.

📌 **Interview term: Backtracking the table (reconstruction)** — walking from the final cell back to the start, repeating the choice each cell made, to recover the actual answer (here the LCS string) and not just its length.

## 4. From Brute Force to the Table

There are four versions of this solution, and an interviewer likes to hear you move through them:

1. **Plain recursion.** \`lcs(i, j)\` calls itself on (i+1, j+1) for a match, or on both (i+1, j) and (i, j+1) for a mismatch. Correct, but the same (i, j) pair is solved again and again. With no matching letters at all, two strings of length 10 already need **369,511** calls (example 2).
2. **Memoization (top-down).** Same recursion, but store each (i, j) answer the first time and reuse it. There are only (m+1)·(n+1) pairs, so the same two strings need just **100** computed states. The idea is the one on [What is memoization?](/interview-question/what-is-memoization).
3. **Tabulation (bottom-up).** Fill \`dp\` row by row as in the diagram. No recursion, so no stack-depth limit, and the loop is easy to reason about.
4. **Two rows.** Row i only reads row i-1 and itself, so keep just two rows: O(min(m, n)) memory. The price is that you can no longer walk back to rebuild the string.

📌 **Interview term: Memoization** — caching the result of a function call by its arguments so each distinct subproblem is solved once.

📌 **Interview term: Overlapping subproblems** — the same smaller question is reached by many different paths, which is exactly what makes caching pay off. It is one of the two signs that a problem fits [dynamic programming](/interview-question/what-is-dynamic-programming); the other is optimal substructure (the best answer is built from best answers to smaller pieces).

## 5. The Code in JavaScript

The table is an array of arrays. Create it with \`Array.from\`, whose second argument runs once per row and so gives every row its own array:

~~~javascript
function lcsTable(a, b) {
  const m = a.length, n = b.length;
  // dp[i][j] = LCS length of a.slice(0, i) and b.slice(0, j); Array.from gives each row its own array
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function lcsString(a, b, dp) {
  let i = a.length, j = b.length;
  const out = [];
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { out.push(a[i - 1]); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return out.reverse().join("");
}
~~~

**What to point out in this code:**

- \`dp\` has \`m + 1\` rows and \`n + 1\` columns. The extra row and column are the empty prefixes, so \`dp[i - 1][j - 1]\` never reads \`undefined\` and no special case is needed for i = 0 or j = 0.
- \`new Array(m + 1).fill(new Array(n + 1).fill(0))\` looks equivalent but is not: \`fill\` puts the **same** inner array in every slot. We ran it: after \`g[0][0] = 9\`, \`JSON.stringify(g)\` printed \`[[9,0,0],[9,0,0]]\`.
- \`a[i - 1] === b[j - 1]\` compares one-character strings. Note that \`str[i]\` is one **UTF-16 code unit**: \`"😀".length\` is 2, so an emoji counts as two "characters". If that matters, compare \`[...str]\` arrays (code points) instead.
- \`lcsString\` walks back from the bottom-right corner — diagonal on a match, otherwise towards the larger neighbour (up on a tie) — pushing characters into an array and reversing once at the end. \`out.reverse().join("")\` is O(length); building with \`s = ch + s\` copies repeatedly.

**When you only need the length**, keep two rows. \`Int32Array\` rows are zero-filled, compact and fast for big tables:

~~~javascript
function twoRowsLcs(a, b) {
  if (b.length > a.length) [a, b] = [b, a];   // keep the rows as short as possible
  let prev = new Int32Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Int32Array(b.length + 1);
    for (let j = 1; j <= b.length; j++)
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    prev = cur;
  }
  return prev[b.length];
}

~~~

📌 **Interview term: Rolling array (two rows)** — keeping only the previous and current rows of a DP table, because no cell reads anything older. Memory drops from O(m·n) to O(min(m, n)).

**The top-down version.** Example 2 also contains a memoized recursion. It keys a \`Map\` by the number \`i * (n + 1) + j\`; a string key such as \`i + "," + j\` also works but builds a new string on every lookup. The recursion goes about m + n calls deep, and JavaScript does not specify a stack size: in Node 22 on our machine a trivial one-argument recursion threw \`RangeError\` somewhere between 8,000 and 16,000 frames deep, and browsers differ. The bottom-up table has no such limit.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node 22). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the table for "abcde" / "ace", then the length and one LCS for six pairs** prints:

~~~text
table rows (text1 = abcde, text2 = ace):
- [0, 0, 0, 0]
a [0, 1, 1, 1]
b [0, 1, 1, 1]
c [0, 1, 2, 2]
d [0, 1, 2, 2]
e [0, 1, 2, 3]
lcs("abcde", "ace") = 3, one LCS: "ace"
lcs("abc", "abc") = 3, one LCS: "abc"
lcs("abc", "def") = 0, one LCS: ""
lcs("", "abc") = 0, one LCS: ""
lcs("ABCBDAB", "BDCABA") = 4, one LCS: "BCBA"
lcs("AGGTAB", "GXTXAYB") = 4, one LCS: "GTAB"
~~~

The six table rows are the diagram in section 3. "ABCBDAB" / "BDCABA" prints "BCBA", but "BDAB" is another LCS of length 4 — the walk-back tie-break (go up when up ≥ left) picks one.

**Example 2 — the same problem four ways** prints:

~~~text
abcdefgh vs ijklmnop: naive 0 in 25739 calls, memo 0 in 64 states
abcdefghij vs klmnopqrst: naive 0 in 369511 calls, memo 0 in 100 states
AGGTABQXYZ vs GXTXAYBQZY: naive 6 in 35723 calls, memo 6 in 84 states
random 800 x 600 over 4 letters: table 444, two rows 444, cells 480000
~~~

What the numbers show:

- With no letters in common, the plain recursion makes **25,739** calls for two strings of 8 and **369,511** for two strings of 10 — it grows exponentially. The memo version computes **64** and **100** states: one per (i, j) pair.
- Even when the strings share letters ("AGGTABQXYZ" / "GXTXAYBQZY", LCS 6), recursion makes 35,723 calls against 84 memoized states.
- On two random strings of 800 and 600 letters (480,000 cells), the full table and the two-row version agree: 444. The random letters come from a small MINSTD generator; \`seed * 48271\` stays below 2^53, so plain JavaScript numbers compute it exactly.

## 7. Complexity

m and n are the two string lengths.

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential, up to O(2^(m+n)) | O(m + n) stack | a mismatch branches twice and subproblems repeat |
| Memoized recursion | O(m·n) | O(m·n) \`Map\` + O(m + n) stack | each (i, j) is computed once |
| Full table | O(m·n) | O(m·n) | one O(1) step per cell |
| Two rows | O(m·n) | O(min(m, n)) | only the previous row is ever read |
| Rebuild the string | O(m + n) extra | needs the full table | each step decreases i or j |

An \`Int32Array\` stores each cell in exactly 4 bytes, so a 5,000 × 5,000 table of them is 100 MB. For long inputs use the two-row version, or Hirschberg's divide-and-conquer algorithm, which rebuilds the string in linear space (named here only; not shown).

## 8. Edge Cases

- **An empty string.** Every cell in row 0 or column 0 is 0, so the answer is 0 and the LCS is "" (example 1: \`lcs("", "abc") = 0\`).
- **No common character.** Every cell stays 0 ("abc" vs "def").
- **Identical strings.** The answer is the full length and the walk back takes the diagonal every time ("abc" vs "abc" gives 3).
- **Several LCS of the same length.** "ABCBDAB" and "BDCABA" have more than one LCS of length 4; the tie-break in the walk back (go up when up ≥ left) decides which one you print — here "BCBA". Say so instead of claiming it is *the* LCS.
- **Repeated letters.** No special handling: the recurrence never uses a character twice because i and j only move forward.
- **Very different lengths.** Put the shorter string on the columns so the two-row version uses less memory.

## Common Pitfalls

- **\`new Array(m).fill(new Array(n).fill(0))\`** — every row is the same array, so the table silently corrupts. Use \`Array.from({ length: m }, () => new Array(n).fill(0))\`.
- **Off-by-one between \`dp\` and the strings.** \`dp[i][j]\` is about \`a.slice(0, i)\` and \`b.slice(0, j)\`, so compare \`a[i - 1]\` and \`b[j - 1]\`. Reading past the table gives \`undefined\`, and \`Math.max(undefined, 0)\` is \`NaN\` (we checked) — no error, just a wrong table.
- **Confusing subsequence with substring.** For the longest common substring, a mismatch sets the cell to 0 and the answer is the largest cell anywhere.
- **Deep recursion.** A memoized recursion on long strings can throw \`RangeError: Maximum call stack size exceeded\`; the stack size is not part of the language and differs between engines. Prefer the table.
- **String memo keys.** \`memo[i + "," + j]\` on a plain object works but is slower and allocates; use a \`Map\` with a numeric key, or a 2D array filled with -1.
- **Emoji and accents.** \`str[i]\` and \`.length\` count UTF-16 code units. Spread into arrays (\`[...str]\`) if characters outside the Basic Multilingual Plane can appear.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j]</code> is the LCS length of the first i characters of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text1</code> and the first j of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text2</code>; row 0 and column 0 are the empty prefix, so they are 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The recurrence:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text1[i-1] === text2[j-1]</code> take the diagonal plus one; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max(up, left)</code>. The answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[m][n]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">m·n cells, O(1) each: O(m·n) time and space. For the length only, two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Int32Array</code> rows give O(min(m, n)) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The string:</strong> <span style="color:#f0e2c8;">Walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[m][n]</code>: diagonal on a match, else towards the larger neighbour; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reverse().join("")</code> at the end. Ties mean the LCS is not unique.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Build rows with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from</code>, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fill</code> with one shared array, and prefer the bottom-up loop because deep recursion throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is plain recursion so slow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A mismatch branches into two calls and the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(i, j)</code> is reached by many paths. In our run two 10-letter strings with nothing in common needed 369,511 calls, while memoization needed 100 states.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the longest common <strong style="color:#ffe0b2;">substring</strong> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Change the mismatch rule to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j] = 0</code> and track the largest cell seen anywhere; the substring ends at that cell. Gaps are no longer allowed, so the max over up and left is gone.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you rebuild the LCS string with only two rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by walking back — the old rows are gone. Keep the full table, or use Hirschberg's divide-and-conquer algorithm for O(min(m, n)) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to edit distance and diff?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same table, different cell rule. With only insertions and deletions allowed, edit distance is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m + n - 2 * LCS</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">diff</code> tools find a longest common subsequence of lines and report the rest as added or removed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you memoize it in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A closure with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> keyed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i * (n + 1) + j</code>, or a 2D array filled with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code>. Avoid string keys in a hot loop, and remember the recursion depth is about m + n.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subsequence** | Characters kept in order after deleting some; gaps allowed |
| **Longest common subsequence (LCS)** | The longest string that is a subsequence of both inputs |
| **State** | The numbers that name one subproblem — here (i, j), the prefix lengths |
| **Recurrence (transition)** | The rule for one cell: match → diagonal + 1, mismatch → max(up, left) |
| **Tabulation (bottom-up DP)** | Filling the table in an order where every input cell is already known |
| **Backtracking the table** | Walking back from the last cell to rebuild the actual subsequence |
| **Memoization** | Caching each subproblem answer by its arguments so it is computed once |
| **Overlapping subproblems** | The same subproblem is reached by many paths, so caching pays off |
| **Rolling array (two rows)** | Keeping only the previous and current row because nothing older is read |

---
**Conclusion:** The longest common subsequence is a two-dimensional DP over prefixes: \`dp[i][j]\` is the answer for the first i and j characters, a match takes the diagonal plus one, and a mismatch takes the larger of up and left. In JavaScript, build the table with \`Array.from\` so the rows are independent, fill it row by row, and read the answer from the bottom-right corner; walk back from there for one LCS, or keep two \`Int32Array\` rows when the length is enough. Our runs showed why the table matters: 369,511 recursive calls collapse to 100 states, and the loop never risks a \`RangeError\` from a deep call stack.`,
        examples: [
          {
            label: `LCS table, length and one LCS string on six pairs`,
            code: `function lcsTable(a, b) {
  const m = a.length, n = b.length;
  // dp[i][j] = LCS length of a.slice(0, i) and b.slice(0, j); Array.from gives each row its own array
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function lcsString(a, b, dp) {
  let i = a.length, j = b.length;
  const out = [];
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { out.push(a[i - 1]); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return out.reverse().join("");
}

function fmt(row) { return "[" + row.join(", ") + "]"; }

let a = "abcde", b = "ace";
let dp = lcsTable(a, b);
console.log("table rows (text1 = abcde, text2 = ace):");
console.log("- " + fmt(dp[0]));
for (let i = 1; i <= a.length; i++) console.log(a[i - 1] + " " + fmt(dp[i]));

const pairs = [["abcde", "ace"], ["abc", "abc"], ["abc", "def"], ["", "abc"],
               ["ABCBDAB", "BDCABA"], ["AGGTAB", "GXTXAYB"]];
for (const [x, y] of pairs) {
  const t = lcsTable(x, y);
  console.log('lcs("' + x + '", "' + y + '") = ' + t[x.length][y.length] +
              ', one LCS: "' + lcsString(x, y, t) + '"');
}`,
          },
          {
            label: `Naive recursion vs memo vs table vs two rows`,
            code: `let calls = 0;
function naive(a, b, i, j) {
  calls++;
  if (i === a.length || j === b.length) return 0;
  if (a[i] === b[j]) return 1 + naive(a, b, i + 1, j + 1);
  return Math.max(naive(a, b, i + 1, j), naive(a, b, i, j + 1));
}

let states = 0;
function memoLcs(a, b) {
  const memo = new Map();             // key i * (n + 1) + j: a number, not a string
  const n = b.length;
  function go(i, j) {
    if (i === a.length || j === n) return 0;
    const key = i * (n + 1) + j;
    if (memo.has(key)) return memo.get(key);
    states++;
    const r = a[i] === b[j] ? 1 + go(i + 1, j + 1) : Math.max(go(i + 1, j), go(i, j + 1));
    memo.set(key, r);
    return r;
  }
  return go(0, 0);
}

function tableLcs(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}

function twoRowsLcs(a, b) {
  if (b.length > a.length) [a, b] = [b, a];   // keep the rows as short as possible
  let prev = new Int32Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Int32Array(b.length + 1);
    for (let j = 1; j <= b.length; j++)
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    prev = cur;
  }
  return prev[b.length];
}

for (const [a, b] of [["abcdefgh", "ijklmnop"], ["abcdefghij", "klmnopqrst"], ["AGGTABQXYZ", "GXTXAYBQZY"]]) {
  calls = 0;
  const r1 = naive(a, b, 0, 0);
  states = 0;
  const r2 = memoLcs(a, b);
  console.log(a + " vs " + b + ": naive " + r1 + " in " + calls + " calls, memo " +
              r2 + " in " + states + " states");
}

let seed = 12345;
function nxt() { seed = (seed * 48271) % 2147483647; return seed; }   // stays below 2^53, exact
let x = "", y = "";
for (let k = 0; k < 800; k++) x += String.fromCharCode(97 + nxt() % 4);
for (let k = 0; k < 600; k++) y += String.fromCharCode(97 + nxt() % 4);
console.log("random 800 x 600 over 4 letters: table " + tableLcs(x, y) +
            ", two rows " + twoRowsLcs(x, y) + ", cells " + 800 * 600);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given two strings, return the length of their longest common subsequence — characters in the same order, but not necessarily next to each other. Then show me how you would get the subsequence itself. Please code it in Java."

**What a strong answer should cover:**
- The state \`dp[i][j]\` = LCS length of the first i characters of one string and the first j of the other, with row 0 and column 0 meaning the empty prefix.
- The recurrence: equal last characters → \`dp[i-1][j-1] + 1\`; different → \`Math.max(dp[i-1][j], dp[i][j-1])\`; and why the fill order makes every input ready.
- O(m·n) time and space, and the two-row version in O(min(m, n)) space when only the length is needed.
- Rebuilding the string by walking back from \`dp[m][n]\` with a \`StringBuilder\`, and noting that ties mean the LCS is not unique.
- Java details: \`new int[m + 1][n + 1]\` is zero-filled, \`charAt\` comparisons with \`==\` are fine for \`char\` (not for \`String\`), swapping row references instead of allocating, and \`StackOverflowError\` for a deep memoized recursion.

**Clarifying questions expected:**
- Do you need the length only, or the subsequence string as well?
- Subsequence (gaps allowed) or substring (contiguous)?
- How long can the strings get?

**Code / implementation expected:** Yes — a bottom-up \`int[][]\` table in Java returning the length, plus a walk back that returns one LCS string.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, arrays and 2D arrays.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two friends each wrote down the films they watched this year, in the order they watched them. Maya's list is *Alien, Barbie, Cars, Dune, Elf*; Raj's list is *Alien, Cars, Elf*. They want to know: **what is the longest run of films they both watched in the same order?** Not necessarily back to back — Maya watched Barbie in between — but in the same order. The answer is *Alien, Cars, Elf*, three films.

That question — "what is the longest thing two sequences share, in order, with gaps allowed?" — is the **longest common subsequence**. It sounds like a toy, but it is the engine behind real tools: \`diff\` and Git show the lines two versions of a file have in common and mark the rest as added or removed; biologists line up DNA strands the same way; plagiarism checkers and spell checkers use cousins of it.

It is also the classic "two-string" dynamic programming problem. Once you can fill an LCS table, [edit distance](/interview-question/how-do-you-compute-the-edit-distance-between-two-strings) and most other two-sequence questions are the same table with a different rule in each cell.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want only the length, or the subsequence itself? | The length needs only two rows of memory; rebuilding the string needs the full table (or a cleverer algorithm). |
| Subsequence or substring — may there be gaps? | "Longest common **substring**" (no gaps) is a different recurrence: a mismatch resets the cell to 0. |
| How long can the strings be? | m · n cells: 1,000 × 1,000 is a million cells and fine; 100,000 × 100,000 is not. |
| If several LCS strings tie, is any one acceptable? | "ABCBDAB" and "BDCABA" have several LCS of length 4; returning all of them can be exponential. |
| Case-sensitive? Characters or whole tokens (lines, words)? | The algorithm is the same; only the equality test changes. diff compares whole lines. |

## 3. The Core Idea in Plain Words

A **subsequence** is what you get by crossing out some characters of a string and keeping the rest in order. "ace" is a subsequence of "abcde" (cross out b and d). "aec" is not — the order changed. A **substring** is stricter: the kept characters must be next to each other.

📌 **Interview term: Subsequence** — the characters left after deleting zero or more characters, in their original order; gaps are allowed. Contrast with a substring, which is a contiguous block.

📌 **Interview term: Longest common subsequence (LCS)** — the longest string that is a subsequence of both inputs. For "abcde" and "ace" it is "ace", length 3.

Trying every subsequence is hopeless: a string of length m has 2^m of them. The trick is to stop thinking about whole strings and ask a smaller question about **prefixes**:

> What is the LCS of the first i characters of text1 and the first j characters of text2?

Call that number \`dp[i][j]\`. Now look at the **last** character of each prefix, \`text1[i-1]\` and \`text2[j-1]\`:

- **They are equal.** Then that character can end the common subsequence. Use it, and solve the rest: \`dp[i][j] = dp[i-1][j-1] + 1\`.
- **They differ.** At least one of them is not in the answer. Either drop the last character of text1 or drop the last character of text2, and keep whichever is better: \`dp[i][j] = max(dp[i-1][j], dp[i][j-1])\`.
- **Base case.** If either prefix is empty, the LCS is empty: \`dp[0][j] = dp[i][0] = 0\`.

📌 **Interview term: State** — the small set of numbers that describes one subproblem. Here the state is (i, j): "how much of each string have I used?"

📌 **Interview term: Recurrence (transition)** — the rule that computes a state from smaller states. Here: match means diagonal + 1, mismatch means the max of up and left.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="How one LCS cell is computed. A match takes the diagonal cell plus one. A mismatch takes the larger of the cell above and the cell to the left">
  <defs>
    <marker id="b29q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="30" width="220" height="70" rx="10"/>
  <text class="d-text" x="150" y="60" text-anchor="middle">diagonal</text>
  <text class="d-sub" x="150" y="84" text-anchor="middle">dp[i-1][j-1]</text>
  <rect class="d-box-muted" x="380" y="30" width="220" height="70" rx="10"/>
  <text class="d-text" x="490" y="60" text-anchor="middle">up</text>
  <text class="d-sub" x="490" y="84" text-anchor="middle">dp[i-1][j]</text>
  <rect class="d-box-muted" x="40" y="200" width="220" height="70" rx="10"/>
  <text class="d-text" x="150" y="230" text-anchor="middle">left</text>
  <text class="d-sub" x="150" y="254" text-anchor="middle">dp[i][j-1]</text>
  <rect class="d-box-accent" x="380" y="200" width="220" height="70" rx="10"/>
  <text class="d-text" x="490" y="230" text-anchor="middle">this cell</text>
  <text class="d-sub" x="490" y="254" text-anchor="middle">dp[i][j]</text>
  <path class="d-edge-accent" d="M 262 100 L 376 198" marker-end="url(#b29q1-arrow)"/>
  <text class="d-sub" x="230" y="160" text-anchor="middle">match: plus 1</text>
  <path class="d-edge" d="M 490 102 L 490 196" marker-end="url(#b29q1-arrow)"/>
  <text class="d-sub" x="560" y="155" text-anchor="middle">mismatch</text>
  <path class="d-edge" d="M 262 235 L 376 235" marker-end="url(#b29q1-arrow)"/>
  <text class="d-sub" x="320" y="218" text-anchor="middle">mismatch</text>
</svg>

Every cell needs only its three neighbours above and to the left, so if you fill the table row by row, left to right, those neighbours are always ready. Here is the whole table for "abcde" and "ace" (it is the exact table example 1 prints):

<svg class="iq-diagram" width="100%" viewBox="0 0 560 388" role="img" aria-label="The LCS table for abcde and ace. The three matching cells a, c and e step the value from 1 to 2 to 3">
  <text class="d-sub" x="280" y="24" text-anchor="middle">rows: prefixes of abcde, columns: prefixes of ace</text>
  <text class="d-text" x="199" y="56" text-anchor="middle">-</text>
  <text class="d-text" x="263" y="56" text-anchor="middle">a</text>
  <text class="d-text" x="327" y="56" text-anchor="middle">c</text>
  <text class="d-text" x="391" y="56" text-anchor="middle">e</text>
  <text class="d-text" x="137" y="100" text-anchor="middle">-</text>
  <rect class="d-box-muted" x="170" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="234" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="298" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="362" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="100" text-anchor="middle">0</text>
  <text class="d-text" x="137" y="148" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="170" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="148" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="234" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="362" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="148" text-anchor="middle">1</text>
  <text class="d-text" x="137" y="196" text-anchor="middle">b</text>
  <rect class="d-box-muted" x="170" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="196" text-anchor="middle">0</text>
  <rect class="d-box" x="234" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="196" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="196" text-anchor="middle">1</text>
  <rect class="d-box" x="362" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="196" text-anchor="middle">1</text>
  <text class="d-text" x="137" y="244" text-anchor="middle">c</text>
  <rect class="d-box-muted" x="170" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="244" text-anchor="middle">0</text>
  <rect class="d-box" x="234" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="244" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="298" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="244" text-anchor="middle">2</text>
  <rect class="d-box" x="362" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="244" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="292" text-anchor="middle">d</text>
  <rect class="d-box-muted" x="170" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="292" text-anchor="middle">0</text>
  <rect class="d-box" x="234" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="292" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="292" text-anchor="middle">2</text>
  <rect class="d-box" x="362" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="292" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="340" text-anchor="middle">e</text>
  <rect class="d-box-muted" x="170" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="340" text-anchor="middle">0</text>
  <rect class="d-box" x="234" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="340" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="340" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="362" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="340" text-anchor="middle">3</text>
</svg>

The value grows only on the three highlighted cells, where a row letter equals a column letter (a = a, c = c, e = e), and the answer is the bottom-right cell, 3. Walking back from that cell — diagonal on a match, otherwise towards the larger neighbour — spells the LCS backwards: e, c, a.

📌 **Interview term: Tabulation (bottom-up DP)** — filling a table of subproblem answers in an order where every cell's inputs are already computed, instead of recursing.

📌 **Interview term: Backtracking the table (reconstruction)** — walking from the final cell back to the start, repeating the choice each cell made, to recover the actual answer (here the LCS string) and not just its length.

## 4. From Brute Force to the Table

There are four versions of this solution, and an interviewer likes to hear you move through them:

1. **Plain recursion.** \`lcs(i, j)\` calls itself on (i+1, j+1) for a match, or on both (i+1, j) and (i, j+1) for a mismatch. Correct, but the same (i, j) pair is solved again and again. With no matching letters at all, two strings of length 10 already need **369,511** calls (example 2).
2. **Memoization (top-down).** Same recursion, but store each (i, j) answer the first time and reuse it. There are only (m+1)·(n+1) pairs, so the same two strings need just **100** computed states. The idea is the one on [What is memoization?](/interview-question/what-is-memoization).
3. **Tabulation (bottom-up).** Fill \`dp\` row by row as in the diagram. No recursion, so no stack-depth limit, and the loop is easy to reason about.
4. **Two rows.** Row i only reads row i-1 and itself, so keep just two rows: O(min(m, n)) memory. The price is that you can no longer walk back to rebuild the string.

📌 **Interview term: Memoization** — caching the result of a function call by its arguments so each distinct subproblem is solved once.

📌 **Interview term: Overlapping subproblems** — the same smaller question is reached by many different paths, which is exactly what makes caching pay off. It is one of the two signs that a problem fits [dynamic programming](/interview-question/what-is-dynamic-programming); the other is optimal substructure (the best answer is built from best answers to smaller pieces).

## 5. The Code in Java

The table is an \`int[][]\`. Java fills new \`int\` arrays with zeros, so row 0 and column 0 — the empty prefixes — are already correct:

~~~java
    // dp[i][j] = LCS length of a[0..i) and b[0..j); Java zero-fills int arrays
    static int[][] lcsTable(String a, String b) {
        int m = a.length(), n = b.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1] + 1;
                else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
        return dp;
    }

    static String lcsString(String a, String b, int[][] dp) {
        int i = a.length(), j = b.length();
        StringBuilder sb = new StringBuilder();
        while (i > 0 && j > 0) {
            if (a.charAt(i - 1) == b.charAt(j - 1)) { sb.append(a.charAt(i - 1)); i--; j--; }
            else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
            else j--;
        }
        return sb.reverse().toString();
    }
~~~

**What to point out in this code:**

- \`new int[m + 1][n + 1]\` gives m + 1 independent rows of n + 1 zeros. The extra row and column mean \`dp[i - 1][j - 1]\` is always in range — without them you would need special cases or get \`ArrayIndexOutOfBoundsException\`.
- \`a.charAt(i - 1) == b.charAt(j - 1)\` compares two \`char\` primitives, so \`==\` is correct here. If you compared one-character \`String\`s (\`a.substring(i - 1, i)\`), \`==\` would compare references and you would need \`.equals\`.
- \`lcsString\` walks back from the bottom-right corner — diagonal on a match, otherwise towards the larger neighbour (up on a tie) — appending to a \`StringBuilder\` and calling \`reverse()\` once. Building with \`s = ch + s\` creates a new \`String\` every step.
- The values never exceed min(m, n), so \`int\` cannot overflow here.

**When you only need the length**, keep two rows and **swap the references** after each row instead of allocating a new array:

~~~java
    static int twoRowsLcs(String a, String b) {
        if (b.length() > a.length()) { String t = a; a = b; b = t; }   // keep the rows short
        int[] prev = new int[b.length() + 1], cur = new int[b.length() + 1];
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++)
                cur[j] = a.charAt(i - 1) == b.charAt(j - 1) ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
            int[] t = prev; prev = cur; cur = t;                         // swap, no new allocation
        }
        return prev[b.length()];
    }
~~~

📌 **Interview term: Rolling array (two rows)** — keeping only the previous and current rows of a DP table, because no cell reads anything older. Memory drops from O(m·n) to O(min(m, n)).

The swap is safe because every \`cur[j]\` for j ≥ 1 is overwritten before it is read, and \`cur[0]\` stays 0.

**The top-down version.** Example 2 also contains a memoized recursion with an \`int[][] memo\` filled with -1 by \`Arrays.fill\`. A primitive array beats a \`HashMap<String, Integer>\` here: no string keys, no boxing. The recursion goes about m + n calls deep, and the default thread stack is limited: on our JVM (OpenJDK 21) a trivial one-argument recursion threw \`StackOverflowError\` between 16,000 and 32,000 frames deep. The stack can be raised with \`-Xss\`, but the bottom-up loop needs no stack at all.

## 6. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the table for "abcde" / "ace", then the length and one LCS for six pairs** prints:

~~~text
table rows (text1 = abcde, text2 = ace):
- [0, 0, 0, 0]
a [0, 1, 1, 1]
b [0, 1, 1, 1]
c [0, 1, 2, 2]
d [0, 1, 2, 2]
e [0, 1, 2, 3]
lcs("abcde", "ace") = 3, one LCS: "ace"
lcs("abc", "abc") = 3, one LCS: "abc"
lcs("abc", "def") = 0, one LCS: ""
lcs("", "abc") = 0, one LCS: ""
lcs("ABCBDAB", "BDCABA") = 4, one LCS: "BCBA"
lcs("AGGTAB", "GXTXAYB") = 4, one LCS: "GTAB"
~~~

The six table rows are the diagram in section 3. "ABCBDAB" / "BDCABA" prints "BCBA", but "BDAB" is another LCS of length 4 — the walk-back tie-break (go up when up ≥ left) picks one.

**Example 2 — the same problem four ways** prints:

~~~text
abcdefgh vs ijklmnop: naive 0 in 25739 calls, memo 0 in 64 states
abcdefghij vs klmnopqrst: naive 0 in 369511 calls, memo 0 in 100 states
AGGTABQXYZ vs GXTXAYBQZY: naive 6 in 35723 calls, memo 6 in 84 states
random 800 x 600 over 4 letters: table 444, two rows 444, cells 480000
~~~

What the numbers show:

- With no letters in common, the plain recursion makes **25,739** calls for two strings of 8 and **369,511** for two strings of 10 — it grows exponentially. The memo version computes **64** and **100** states: one per (i, j) pair. The counters are \`long\`, because call counts of an exponential algorithm overflow \`int\` quickly.
- Even when the strings share letters ("AGGTABQXYZ" / "GXTXAYBQZY", LCS 6), recursion makes 35,723 calls against 84 memoized states.
- On two random strings of 800 and 600 letters (480,000 cells), the full table and the two-row version agree: 444.

## 7. Complexity

m and n are the two string lengths.

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential, up to O(2^(m+n)) | O(m + n) stack | a mismatch branches twice and subproblems repeat |
| Memoized recursion | O(m·n) | O(m·n) memo + O(m + n) stack | each (i, j) is computed once |
| Full table | O(m·n) | O(m·n) | one O(1) step per cell |
| Two rows | O(m·n) | O(min(m, n)) | only the previous row is ever read |
| Rebuild the string | O(m + n) extra | needs the full table | each step decreases i or j |

An \`int\` cell is 4 bytes, so a 5,000 × 5,000 table is 100 MB of data — more than some default heap sizes allow, which shows up as \`OutOfMemoryError\`. For long inputs use the two rows, or Hirschberg's divide-and-conquer algorithm, which rebuilds the string in linear space (named here only; not shown).

## 8. Edge Cases

- **An empty string.** Every cell in row 0 or column 0 is 0, so the answer is 0 and the LCS is "" (example 1: \`lcs("", "abc") = 0\`).
- **No common character.** Every cell stays 0 ("abc" vs "def").
- **Identical strings.** The answer is the full length and the walk back takes the diagonal every time ("abc" vs "abc" gives 3).
- **Several LCS of the same length.** "ABCBDAB" and "BDCABA" have more than one LCS of length 4; the tie-break in the walk back (go up when up ≥ left) decides which one you print — here "BCBA". Say so instead of claiming it is *the* LCS.
- **Repeated letters.** No special handling: the recurrence never uses a character twice because i and j only move forward.
- **Very different lengths.** Put the shorter string on the columns so the two-row version uses less memory.

## Common Pitfalls

- **Off-by-one between \`dp\` and the strings.** \`dp[i][j]\` is about \`a.substring(0, i)\` and \`b.substring(0, j)\`, so compare \`charAt(i - 1)\` and \`charAt(j - 1)\`.
- **Comparing \`String\`s with \`==\`.** Fine for \`char\` values from \`charAt\`; wrong for one-letter \`String\`s, which need \`.equals\`.
- **\`HashMap<String, Integer>\` as the memo.** Building \`i + "," + j\` keys and boxing every value is slow; an \`int[][]\` filled with -1 is simpler and faster.
- **Deep recursion.** A memoized recursion on long strings throws \`StackOverflowError\`; prefer the table rather than relying on \`-Xss\`.
- **Rebuilding from the two-row version.** Once old rows are gone you cannot walk back; keep the full table if you need the string.
- **Confusing subsequence with substring.** For the longest common substring, a mismatch sets the cell to 0 and the answer is the largest cell anywhere.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j]</code> is the LCS length of the first i characters of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text1</code> and the first j of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text2</code>; Java zero-fills <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new int[m + 1][n + 1]</code>, so the empty-prefix row and column are already 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The recurrence:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text1.charAt(i-1) == text2.charAt(j-1)</code> take the diagonal plus one; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max(up, left)</code>. The answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[m][n]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">m·n cells, O(1) each: O(m·n) time and space. For the length only, two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> rows swapped by reference give O(min(m, n)) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The string:</strong> <span style="color:#f0e2c8;">Walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[m][n]</code> into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StringBuilder</code>: diagonal on a match, else towards the larger neighbour; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reverse()</code> at the end. Ties mean the LCS is not unique.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Prefer the bottom-up loop: a memoized recursion is m + n frames deep and throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code> on long strings.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is plain recursion so slow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A mismatch branches into two calls and the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(i, j)</code> is reached by many paths. In our run two 10-letter strings with nothing in common needed 369,511 calls, while memoization needed 100 states.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the longest common <strong style="color:#ffe0b2;">substring</strong> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Change the mismatch rule to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j] = 0</code> and track the largest cell seen anywhere; the substring ends at that cell.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you rebuild the LCS string with only two rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by walking back — the old rows are gone. Keep the full table, or use Hirschberg's divide-and-conquer algorithm for O(min(m, n)) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to edit distance and diff?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same table, different cell rule. With only insertions and deletions, edit distance is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m + n - 2 * LCS</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">diff</code> tools find a longest common subsequence of lines and report the rest as added or removed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int[][]</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Integer[][]</code> or a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap</code> for the memo?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[][]</code> stores primitives in contiguous rows; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> adds an object per cell and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> checks, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> adds hashing and key objects. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code> as the "not computed" marker because a real LCS length is never negative.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subsequence** | Characters kept in order after deleting some; gaps allowed |
| **Longest common subsequence (LCS)** | The longest string that is a subsequence of both inputs |
| **State** | The numbers that name one subproblem — here (i, j), the prefix lengths |
| **Recurrence (transition)** | The rule for one cell: match → diagonal + 1, mismatch → max(up, left) |
| **Tabulation (bottom-up DP)** | Filling the table in an order where every input cell is already known |
| **Backtracking the table** | Walking back from the last cell to rebuild the actual subsequence |
| **Memoization** | Caching each subproblem answer by its arguments so it is computed once |
| **Overlapping subproblems** | The same subproblem is reached by many paths, so caching pays off |
| **Rolling array (two rows)** | Keeping only the previous and current row because nothing older is read |

---
**Conclusion:** The longest common subsequence is a two-dimensional DP over prefixes: \`dp[i][j]\` is the answer for the first i and j characters, a match takes the diagonal plus one, and a mismatch takes the larger of up and left. In Java the zero-filled \`int[m + 1][n + 1]\` gives you the base cases for free; fill it row by row, read \`dp[m][n]\`, and walk back with a \`StringBuilder\` for one LCS — or keep two swapped rows when the length is enough. Our runs showed why the table matters: 369,511 recursive calls collapse to 100 states, and the loop never risks a \`StackOverflowError\`.`,
        examples: [
          {
            label: `LCS table, length and one LCS string on six pairs`,
            code: `import java.util.*;

public class Main {
    // dp[i][j] = LCS length of a[0..i) and b[0..j); Java zero-fills int arrays
    static int[][] lcsTable(String a, String b) {
        int m = a.length(), n = b.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1] + 1;
                else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
        return dp;
    }

    static String lcsString(String a, String b, int[][] dp) {
        int i = a.length(), j = b.length();
        StringBuilder sb = new StringBuilder();
        while (i > 0 && j > 0) {
            if (a.charAt(i - 1) == b.charAt(j - 1)) { sb.append(a.charAt(i - 1)); i--; j--; }
            else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
            else j--;
        }
        return sb.reverse().toString();
    }

    static String fmt(int[] row) {
        StringBuilder sb = new StringBuilder("[");
        for (int k = 0; k < row.length; k++) { if (k > 0) sb.append(", "); sb.append(row[k]); }
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        String a = "abcde", b = "ace";
        int[][] dp = lcsTable(a, b);
        System.out.println("table rows (text1 = abcde, text2 = ace):");
        System.out.println("- " + fmt(dp[0]));
        for (int i = 1; i <= a.length(); i++) System.out.println(a.charAt(i - 1) + " " + fmt(dp[i]));

        String[][] pairs = {{"abcde", "ace"}, {"abc", "abc"}, {"abc", "def"}, {"", "abc"},
                            {"ABCBDAB", "BDCABA"}, {"AGGTAB", "GXTXAYB"}};
        for (String[] p : pairs) {
            int[][] t = lcsTable(p[0], p[1]);
            System.out.println("lcs(\\"" + p[0] + "\\", \\"" + p[1] + "\\") = " + t[p[0].length()][p[1].length()]
                    + ", one LCS: \\"" + lcsString(p[0], p[1], t) + "\\"");
        }
    }
}`,
          },
          {
            label: `Naive recursion vs memo vs table vs two rows`,
            code: `import java.util.*;

public class Main {
    static long calls = 0;
    static int naive(String a, String b, int i, int j) {
        calls++;
        if (i == a.length() || j == b.length()) return 0;
        if (a.charAt(i) == b.charAt(j)) return 1 + naive(a, b, i + 1, j + 1);
        return Math.max(naive(a, b, i + 1, j), naive(a, b, i, j + 1));
    }

    static long states = 0;
    static int[][] memo;                 // -1 = not computed yet
    static int go(String a, String b, int i, int j) {
        if (i == a.length() || j == b.length()) return 0;
        if (memo[i][j] != -1) return memo[i][j];
        states++;
        int r = a.charAt(i) == b.charAt(j) ? 1 + go(a, b, i + 1, j + 1)
                                           : Math.max(go(a, b, i + 1, j), go(a, b, i, j + 1));
        return memo[i][j] = r;
    }
    static int memoLcs(String a, String b) {
        memo = new int[a.length()][b.length()];
        for (int[] row : memo) Arrays.fill(row, -1);
        return go(a, b, 0, 0);
    }

    static int tableLcs(String a, String b) {
        int m = a.length(), n = b.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++)
            for (int j = 1; j <= n; j++)
                dp[i][j] = a.charAt(i - 1) == b.charAt(j - 1) ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        return dp[m][n];
    }

    static int twoRowsLcs(String a, String b) {
        if (b.length() > a.length()) { String t = a; a = b; b = t; }   // keep the rows short
        int[] prev = new int[b.length() + 1], cur = new int[b.length() + 1];
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++)
                cur[j] = a.charAt(i - 1) == b.charAt(j - 1) ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
            int[] t = prev; prev = cur; cur = t;                         // swap, no new allocation
        }
        return prev[b.length()];
    }

    static long seed = 12345;
    static long nxt() { seed = seed * 48271 % 2147483647L; return seed; }

    public static void main(String[] args) {
        String[][] pairs = {{"abcdefgh", "ijklmnop"}, {"abcdefghij", "klmnopqrst"}, {"AGGTABQXYZ", "GXTXAYBQZY"}};
        for (String[] p : pairs) {
            calls = 0;
            int r1 = naive(p[0], p[1], 0, 0);
            states = 0;
            int r2 = memoLcs(p[0], p[1]);
            System.out.println(p[0] + " vs " + p[1] + ": naive " + r1 + " in " + calls + " calls, memo "
                    + r2 + " in " + states + " states");
        }
        StringBuilder x = new StringBuilder(), y = new StringBuilder();
        for (int k = 0; k < 800; k++) x.append((char) (97 + nxt() % 4));
        for (int k = 0; k < 600; k++) y.append((char) (97 + nxt() % 4));
        System.out.println("random 800 x 600 over 4 letters: table " + tableLcs(x.toString(), y.toString())
                + ", two rows " + twoRowsLcs(x.toString(), y.toString()) + ", cells " + 800 * 600);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given two strings, return the length of their longest common subsequence — characters in the same order, but not necessarily next to each other. Then show me how you would get the subsequence itself. Please code it in C++."

**What a strong answer should cover:**
- The state \`dp[i][j]\` = LCS length of the first i characters of one string and the first j of the other, with row 0 and column 0 meaning the empty prefix.
- The recurrence: equal last characters → \`dp[i-1][j-1] + 1\`; different → \`std::max(dp[i-1][j], dp[i][j-1])\`; and why the fill order makes every input ready.
- O(m·n) time and space, and the two-row version in O(min(m, n)) space when only the length is needed.
- Rebuilding the string by walking back from \`dp[m][n]\`, and noting that ties mean the LCS is not unique.
- C++ details: \`vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0))\`, unsigned \`size_t\` loops that must never count below zero, passing strings by \`const&\`, \`swap\` of two vectors being O(1), and deep recursion crashing the process.

**Clarifying questions expected:**
- Do you need the length only, or the subsequence string as well?
- Subsequence (gaps allowed) or substring (contiguous)?
- How long can the strings get?

**Code / implementation expected:** Yes — a bottom-up \`vector<vector<int>>\` table in C++ returning the length, plus a walk back that returns one LCS string.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, \`std::vector\` and \`std::string\`.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two friends each wrote down the films they watched this year, in the order they watched them. Maya's list is *Alien, Barbie, Cars, Dune, Elf*; Raj's list is *Alien, Cars, Elf*. They want to know: **what is the longest run of films they both watched in the same order?** Not necessarily back to back — Maya watched Barbie in between — but in the same order. The answer is *Alien, Cars, Elf*, three films.

That question — "what is the longest thing two sequences share, in order, with gaps allowed?" — is the **longest common subsequence**. It sounds like a toy, but it is the engine behind real tools: \`diff\` and Git show the lines two versions of a file have in common and mark the rest as added or removed; biologists line up DNA strands the same way; plagiarism checkers and spell checkers use cousins of it.

It is also the classic "two-string" dynamic programming problem. Once you can fill an LCS table, [edit distance](/interview-question/how-do-you-compute-the-edit-distance-between-two-strings) and most other two-sequence questions are the same table with a different rule in each cell.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want only the length, or the subsequence itself? | The length needs only two rows of memory; rebuilding the string needs the full table (or a cleverer algorithm). |
| Subsequence or substring — may there be gaps? | "Longest common **substring**" (no gaps) is a different recurrence: a mismatch resets the cell to 0. |
| How long can the strings be? | m · n cells: 1,000 × 1,000 is a million cells and fine; 100,000 × 100,000 is not. |
| If several LCS strings tie, is any one acceptable? | "ABCBDAB" and "BDCABA" have several LCS of length 4; returning all of them can be exponential. |
| Case-sensitive? Characters or whole tokens (lines, words)? | The algorithm is the same; only the equality test changes. diff compares whole lines. |

## 3. The Core Idea in Plain Words

A **subsequence** is what you get by crossing out some characters of a string and keeping the rest in order. "ace" is a subsequence of "abcde" (cross out b and d). "aec" is not — the order changed. A **substring** is stricter: the kept characters must be next to each other.

📌 **Interview term: Subsequence** — the characters left after deleting zero or more characters, in their original order; gaps are allowed. Contrast with a substring, which is a contiguous block.

📌 **Interview term: Longest common subsequence (LCS)** — the longest string that is a subsequence of both inputs. For "abcde" and "ace" it is "ace", length 3.

Trying every subsequence is hopeless: a string of length m has 2^m of them. The trick is to stop thinking about whole strings and ask a smaller question about **prefixes**:

> What is the LCS of the first i characters of text1 and the first j characters of text2?

Call that number \`dp[i][j]\`. Now look at the **last** character of each prefix, \`text1[i-1]\` and \`text2[j-1]\`:

- **They are equal.** Then that character can end the common subsequence. Use it, and solve the rest: \`dp[i][j] = dp[i-1][j-1] + 1\`.
- **They differ.** At least one of them is not in the answer. Either drop the last character of text1 or drop the last character of text2, and keep whichever is better: \`dp[i][j] = max(dp[i-1][j], dp[i][j-1])\`.
- **Base case.** If either prefix is empty, the LCS is empty: \`dp[0][j] = dp[i][0] = 0\`.

📌 **Interview term: State** — the small set of numbers that describes one subproblem. Here the state is (i, j): "how much of each string have I used?"

📌 **Interview term: Recurrence (transition)** — the rule that computes a state from smaller states. Here: match means diagonal + 1, mismatch means the max of up and left.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="How one LCS cell is computed. A match takes the diagonal cell plus one. A mismatch takes the larger of the cell above and the cell to the left">
  <defs>
    <marker id="b29q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="30" width="220" height="70" rx="10"/>
  <text class="d-text" x="150" y="60" text-anchor="middle">diagonal</text>
  <text class="d-sub" x="150" y="84" text-anchor="middle">dp[i-1][j-1]</text>
  <rect class="d-box-muted" x="380" y="30" width="220" height="70" rx="10"/>
  <text class="d-text" x="490" y="60" text-anchor="middle">up</text>
  <text class="d-sub" x="490" y="84" text-anchor="middle">dp[i-1][j]</text>
  <rect class="d-box-muted" x="40" y="200" width="220" height="70" rx="10"/>
  <text class="d-text" x="150" y="230" text-anchor="middle">left</text>
  <text class="d-sub" x="150" y="254" text-anchor="middle">dp[i][j-1]</text>
  <rect class="d-box-accent" x="380" y="200" width="220" height="70" rx="10"/>
  <text class="d-text" x="490" y="230" text-anchor="middle">this cell</text>
  <text class="d-sub" x="490" y="254" text-anchor="middle">dp[i][j]</text>
  <path class="d-edge-accent" d="M 262 100 L 376 198" marker-end="url(#b29q1-arrow)"/>
  <text class="d-sub" x="230" y="160" text-anchor="middle">match: plus 1</text>
  <path class="d-edge" d="M 490 102 L 490 196" marker-end="url(#b29q1-arrow)"/>
  <text class="d-sub" x="560" y="155" text-anchor="middle">mismatch</text>
  <path class="d-edge" d="M 262 235 L 376 235" marker-end="url(#b29q1-arrow)"/>
  <text class="d-sub" x="320" y="218" text-anchor="middle">mismatch</text>
</svg>

Every cell needs only its three neighbours above and to the left, so if you fill the table row by row, left to right, those neighbours are always ready. Here is the whole table for "abcde" and "ace" (it is the exact table example 1 prints):

<svg class="iq-diagram" width="100%" viewBox="0 0 560 388" role="img" aria-label="The LCS table for abcde and ace. The three matching cells a, c and e step the value from 1 to 2 to 3">
  <text class="d-sub" x="280" y="24" text-anchor="middle">rows: prefixes of abcde, columns: prefixes of ace</text>
  <text class="d-text" x="199" y="56" text-anchor="middle">-</text>
  <text class="d-text" x="263" y="56" text-anchor="middle">a</text>
  <text class="d-text" x="327" y="56" text-anchor="middle">c</text>
  <text class="d-text" x="391" y="56" text-anchor="middle">e</text>
  <text class="d-text" x="137" y="100" text-anchor="middle">-</text>
  <rect class="d-box-muted" x="170" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="234" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="298" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="362" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="100" text-anchor="middle">0</text>
  <text class="d-text" x="137" y="148" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="170" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="148" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="234" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="362" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="148" text-anchor="middle">1</text>
  <text class="d-text" x="137" y="196" text-anchor="middle">b</text>
  <rect class="d-box-muted" x="170" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="196" text-anchor="middle">0</text>
  <rect class="d-box" x="234" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="196" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="196" text-anchor="middle">1</text>
  <rect class="d-box" x="362" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="196" text-anchor="middle">1</text>
  <text class="d-text" x="137" y="244" text-anchor="middle">c</text>
  <rect class="d-box-muted" x="170" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="244" text-anchor="middle">0</text>
  <rect class="d-box" x="234" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="244" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="298" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="244" text-anchor="middle">2</text>
  <rect class="d-box" x="362" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="244" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="292" text-anchor="middle">d</text>
  <rect class="d-box-muted" x="170" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="292" text-anchor="middle">0</text>
  <rect class="d-box" x="234" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="292" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="292" text-anchor="middle">2</text>
  <rect class="d-box" x="362" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="292" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="340" text-anchor="middle">e</text>
  <rect class="d-box-muted" x="170" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="340" text-anchor="middle">0</text>
  <rect class="d-box" x="234" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="340" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="340" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="362" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="340" text-anchor="middle">3</text>
</svg>

The value grows only on the three highlighted cells, where a row letter equals a column letter (a = a, c = c, e = e), and the answer is the bottom-right cell, 3. Walking back from that cell — diagonal on a match, otherwise towards the larger neighbour — spells the LCS backwards: e, c, a.

📌 **Interview term: Tabulation (bottom-up DP)** — filling a table of subproblem answers in an order where every cell's inputs are already computed, instead of recursing.

📌 **Interview term: Backtracking the table (reconstruction)** — walking from the final cell back to the start, repeating the choice each cell made, to recover the actual answer (here the LCS string) and not just its length.

## 4. From Brute Force to the Table

There are four versions of this solution, and an interviewer likes to hear you move through them:

1. **Plain recursion.** \`lcs(i, j)\` calls itself on (i+1, j+1) for a match, or on both (i+1, j) and (i, j+1) for a mismatch. Correct, but the same (i, j) pair is solved again and again. With no matching letters at all, two strings of length 10 already need **369,511** calls (example 2).
2. **Memoization (top-down).** Same recursion, but store each (i, j) answer the first time and reuse it. There are only (m+1)·(n+1) pairs, so the same two strings need just **100** computed states. The idea is the one on [What is memoization?](/interview-question/what-is-memoization).
3. **Tabulation (bottom-up).** Fill \`dp\` row by row as in the diagram. No recursion, so no stack-depth limit, and the loop is easy to reason about.
4. **Two rows.** Row i only reads row i-1 and itself, so keep just two rows: O(min(m, n)) memory. The price is that you can no longer walk back to rebuild the string.

📌 **Interview term: Memoization** — caching the result of a function call by its arguments so each distinct subproblem is solved once.

📌 **Interview term: Overlapping subproblems** — the same smaller question is reached by many different paths, which is exactly what makes caching pay off. It is one of the two signs that a problem fits [dynamic programming](/interview-question/what-is-dynamic-programming); the other is optimal substructure (the best answer is built from best answers to smaller pieces).

## 5. The Code in C++

The table is a \`vector<vector<int>>\`. The constructor \`dp(m + 1, vector<int>(n + 1, 0))\` makes m + 1 independent copies of a zero row, so the empty-prefix row and column are already correct:

~~~cpp
// dp[i][j] = LCS length of a[0..i) and b[0..j); vector value-initialises to 0
vector<vector<int>> lcsTable(const string& a, const string& b) {
    size_t m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (size_t i = 1; i <= m; i++)
        for (size_t j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1] + 1 : max(dp[i - 1][j], dp[i][j - 1]);
    return dp;
}

string lcsString(const string& a, const string& b, const vector<vector<int>>& dp) {
    size_t i = a.size(), j = b.size();
    string out;
    while (i > 0 && j > 0) {
        if (a[i - 1] == b[j - 1]) { out.push_back(a[i - 1]); i--; j--; }
        else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
        else j--;
    }
    reverse(out.begin(), out.end());
    return out;
}
~~~

**What to point out in this code:**

- Strings are passed as \`const string&\`: no copy, and the function promises not to change them.
- The loops use \`size_t\` (unsigned) and only count **up**, and the walk back tests \`i > 0\` before decrementing. With unsigned indices, \`i >= 0\` is always true and \`a.size() - 1\` on an empty string wraps around to a huge number — two classic C++ bugs.
- \`dp[i - 1][j - 1]\` is safe because of the extra row and column. \`operator[]\` does no bounds checking; an off-by-one is undefined behaviour, not an exception. Use \`.at()\` while debugging if you want a thrown \`std::out_of_range\`.
- \`lcsString\` walks back from the bottom-right corner — diagonal on a match, otherwise towards the larger neighbour (up on a tie) — with \`push_back\` and one \`std::reverse\` at the end.

**When you only need the length**, keep two rows and \`swap\` them. Swapping two \`std::vector\`s exchanges their internal buffers in constant time; nothing is copied:

~~~cpp
int twoRowsLcs(string a, string b) {
    if (b.size() > a.size()) swap(a, b);  // keep the rows short
    vector<int> prev(b.size() + 1, 0), cur(b.size() + 1, 0);
    for (size_t i = 1; i <= a.size(); i++) {
        for (size_t j = 1; j <= b.size(); j++)
            cur[j] = a[i - 1] == b[j - 1] ? prev[j - 1] + 1 : max(prev[j], cur[j - 1]);
        swap(prev, cur);                  // O(1): swaps the buffers, copies nothing
    }
    return prev[b.size()];
}
~~~

📌 **Interview term: Rolling array (two rows)** — keeping only the previous and current rows of a DP table, because no cell reads anything older. Memory drops from O(m·n) to O(min(m, n)).

The swap is safe because every \`cur[j]\` for j ≥ 1 is overwritten before it is read, and \`cur[0]\` stays 0. Note that this function takes its strings **by value**, so that it may \`swap(a, b)\` to put the shorter one on the columns.

**The top-down version.** Example 2 also contains a memoized recursion over a \`vector<vector<int>>\` filled with -1:

~~~cpp
long long states = 0;
vector<vector<int>> memo;                 // -1 = not computed yet
int go(const string& a, const string& b, size_t i, size_t j) {
    if (i == a.size() || j == b.size()) return 0;
    int& slot = memo[i][j];               // a reference: safe, memo is never resized during the recursion
    if (slot != -1) return slot;
    states++;
    slot = a[i] == b[j] ? 1 + go(a, b, i + 1, j + 1) : max(go(a, b, i + 1, j), go(a, b, i, j + 1));
    return slot;
}
int memoLcs(const string& a, const string& b) {
    memo.assign(a.size(), vector<int>(b.size(), -1));
    return go(a, b, 0, 0);
}
~~~

\`int& slot = memo[i][j]\` is a reference into the memo; that is safe only because the vectors are never resized while the recursion runs (resizing could move the buffer and leave the reference dangling). The recursion is about m + n frames deep, and running out of stack in C++ is not an exception you can catch: a test program that recursed 50 million levels deep died with \`Segmentation fault\` (exit code 139) on our machine. The bottom-up loop has no such risk.

## 6. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the table for "abcde" / "ace", then the length and one LCS for six pairs** prints:

~~~text
table rows (text1 = abcde, text2 = ace):
- [0, 0, 0, 0]
a [0, 1, 1, 1]
b [0, 1, 1, 1]
c [0, 1, 2, 2]
d [0, 1, 2, 2]
e [0, 1, 2, 3]
lcs("abcde", "ace") = 3, one LCS: "ace"
lcs("abc", "abc") = 3, one LCS: "abc"
lcs("abc", "def") = 0, one LCS: ""
lcs("", "abc") = 0, one LCS: ""
lcs("ABCBDAB", "BDCABA") = 4, one LCS: "BCBA"
lcs("AGGTAB", "GXTXAYB") = 4, one LCS: "GTAB"
~~~

The six table rows are the diagram in section 3. "ABCBDAB" / "BDCABA" prints "BCBA", but "BDAB" is another LCS of length 4 — the walk-back tie-break (go up when up ≥ left) picks one.

**Example 2 — the same problem four ways** prints:

~~~text
abcdefgh vs ijklmnop: naive 0 in 25739 calls, memo 0 in 64 states
abcdefghij vs klmnopqrst: naive 0 in 369511 calls, memo 0 in 100 states
AGGTABQXYZ vs GXTXAYBQZY: naive 6 in 35723 calls, memo 6 in 84 states
random 800 x 600 over 4 letters: table 444, two rows 444, cells 480000
~~~

What the numbers show:

- With no letters in common, the plain recursion makes **25,739** calls for two strings of 8 and **369,511** for two strings of 10 — it grows exponentially. The memo version computes **64** and **100** states: one per (i, j) pair. The counters are \`long long\`, because exponential call counts outgrow 32 bits quickly.
- Even when the strings share letters ("AGGTABQXYZ" / "GXTXAYBQZY", LCS 6), recursion makes 35,723 calls against 84 memoized states.
- On two random strings of 800 and 600 letters (480,000 cells), the full table and the two-row version agree: 444.

## 7. Complexity

m and n are the two string lengths.

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential, up to O(2^(m+n)) | O(m + n) stack | a mismatch branches twice and subproblems repeat |
| Memoized recursion | O(m·n) | O(m·n) memo + O(m + n) stack | each (i, j) is computed once |
| Full table | O(m·n) | O(m·n) | one O(1) step per cell |
| Two rows | O(m·n) | O(min(m, n)) | only the previous row is ever read |
| Rebuild the string | O(m + n) extra | needs the full table | each step decreases i or j |

An \`int\` cell is 4 bytes on mainstream platforms, so a 5,000 × 5,000 table is 100 MB. A \`vector<vector<int>>\` also makes one heap allocation per row; a single flat \`vector<int>(rows * cols)\` indexed as \`i * cols + j\` avoids that and is friendlier to the cache. For long inputs use two rows, or Hirschberg's divide-and-conquer algorithm, which rebuilds the string in linear space (named here only; not shown).

## 8. Edge Cases

- **An empty string.** Every cell in row 0 or column 0 is 0, so the answer is 0 and the LCS is "" (example 1: \`lcs("", "abc") = 0\`).
- **No common character.** Every cell stays 0 ("abc" vs "def").
- **Identical strings.** The answer is the full length and the walk back takes the diagonal every time ("abc" vs "abc" gives 3).
- **Several LCS of the same length.** "ABCBDAB" and "BDCABA" have more than one LCS of length 4; the tie-break in the walk back (go up when up ≥ left) decides which one you print — here "BCBA". Say so instead of claiming it is *the* LCS.
- **Repeated letters.** No special handling: the recurrence never uses a character twice because i and j only move forward.
- **Very different lengths.** Put the shorter string on the columns so the two-row version uses less memory.

## Common Pitfalls

- **Unsigned loop underflow.** \`for (size_t i = n - 1; i >= 0; i--)\` never ends, and \`s.size() - 1\` on an empty string is a huge number. Count up, or test \`i > 0\` before \`i--\`.
- **Off-by-one between \`dp\` and the strings.** \`dp[i][j]\` is about \`a.substr(0, i)\` and \`b.substr(0, j)\`, so compare \`a[i - 1]\` and \`b[j - 1]\`; \`operator[]\` will not catch a mistake.
- **Passing strings by value in the recursion.** \`int go(string a, string b, ...)\` copies both strings on every call; take \`const string&\`.
- **Keeping a reference into a vector that may grow.** \`int& slot = memo[i][j]\` is only safe because the memo is never resized.
- **Deep recursion.** A memoized recursion on long strings overflows the stack and crashes with no exception; prefer the table.
- **Confusing subsequence with substring.** For the longest common substring, a mismatch sets the cell to 0 and the answer is the largest cell anywhere.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j]</code> is the LCS length of the first i characters of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text1</code> and the first j of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text2</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;vector&lt;int&gt;&gt; dp(m + 1, vector&lt;int&gt;(n + 1, 0))</code> makes the empty-prefix row and column 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The recurrence:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text1[i-1] == text2[j-1]</code> take the diagonal plus one; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(up, left)</code>. The answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[m][n]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">m·n cells, O(1) each: O(m·n) time and space. For the length only, two rows and an O(1) <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">swap</code> give O(min(m, n)) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The string:</strong> <span style="color:#f0e2c8;">Walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[m][n]</code>: diagonal on a match, else towards the larger neighbour; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::reverse</code> at the end. Ties mean the LCS is not unique.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Pass strings by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code>, never let a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t</code> count below zero, and prefer the loop: stack overflow in C++ is a crash, not an exception.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is plain recursion so slow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A mismatch branches into two calls and the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(i, j)</code> is reached by many paths. In our run two 10-letter strings with nothing in common needed 369,511 calls, while memoization needed 100 states.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the longest common <strong style="color:#ffe0b2;">substring</strong> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Change the mismatch rule to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j] = 0</code> and track the largest cell seen anywhere; the substring ends at that cell.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you rebuild the LCS string with only two rows?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by walking back — the old rows are gone. Keep the full table, or use Hirschberg's divide-and-conquer algorithm for O(min(m, n)) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to edit distance and diff?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same table, different cell rule. With only insertions and deletions, edit distance is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m + n - 2 * LCS</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">diff</code> tools find a longest common subsequence of lines and report the rest as added or removed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make the table faster in C++?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One flat <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;</code> indexed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i * (n + 1) + j</code> instead of a vector of vectors: one allocation and contiguous memory. With only two rows the whole working set is two small arrays, which fits in cache.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subsequence** | Characters kept in order after deleting some; gaps allowed |
| **Longest common subsequence (LCS)** | The longest string that is a subsequence of both inputs |
| **State** | The numbers that name one subproblem — here (i, j), the prefix lengths |
| **Recurrence (transition)** | The rule for one cell: match → diagonal + 1, mismatch → max(up, left) |
| **Tabulation (bottom-up DP)** | Filling the table in an order where every input cell is already known |
| **Backtracking the table** | Walking back from the last cell to rebuild the actual subsequence |
| **Memoization** | Caching each subproblem answer by its arguments so it is computed once |
| **Overlapping subproblems** | The same subproblem is reached by many paths, so caching pays off |
| **Rolling array (two rows)** | Keeping only the previous and current row because nothing older is read |

---
**Conclusion:** The longest common subsequence is a two-dimensional DP over prefixes: \`dp[i][j]\` is the answer for the first i and j characters, a match takes the diagonal plus one, and a mismatch takes the larger of up and left. In C++ a \`vector<vector<int>>\` of size (m + 1) × (n + 1) gives the base cases for free; fill it row by row with upward-counting \`size_t\` loops, read \`dp[m][n]\`, and walk back for one LCS — or keep two rows and \`swap\` them when the length is enough. Our runs showed why the table matters: 369,511 recursive calls collapse to 100 states, and the loop never risks a stack-overflow crash.`,
        examples: [
          {
            label: `LCS table, length and one LCS string on six pairs`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

// dp[i][j] = LCS length of a[0..i) and b[0..j); vector value-initialises to 0
vector<vector<int>> lcsTable(const string& a, const string& b) {
    size_t m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (size_t i = 1; i <= m; i++)
        for (size_t j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1] + 1 : max(dp[i - 1][j], dp[i][j - 1]);
    return dp;
}

string lcsString(const string& a, const string& b, const vector<vector<int>>& dp) {
    size_t i = a.size(), j = b.size();
    string out;
    while (i > 0 && j > 0) {
        if (a[i - 1] == b[j - 1]) { out.push_back(a[i - 1]); i--; j--; }
        else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
        else j--;
    }
    reverse(out.begin(), out.end());
    return out;
}

string fmt(const vector<int>& row) {
    string s = "[";
    for (size_t k = 0; k < row.size(); k++) { if (k) s += ", "; s += to_string(row[k]); }
    return s + "]";
}

int main() {
    string a = "abcde", b = "ace";
    auto dp = lcsTable(a, b);
    cout << "table rows (text1 = abcde, text2 = ace):\\n";
    cout << "- " << fmt(dp[0]) << "\\n";
    for (size_t i = 1; i <= a.size(); i++) cout << a[i - 1] << " " << fmt(dp[i]) << "\\n";

    vector<pair<string, string>> pairs = {{"abcde", "ace"}, {"abc", "abc"}, {"abc", "def"}, {"", "abc"},
                                          {"ABCBDAB", "BDCABA"}, {"AGGTAB", "GXTXAYB"}};
    for (auto& [x, y] : pairs) {
        auto t = lcsTable(x, y);
        cout << "lcs(\\"" << x << "\\", \\"" << y << "\\") = " << t[x.size()][y.size()]
             << ", one LCS: \\"" << lcsString(x, y, t) << "\\"\\n";
    }
}`,
          },
          {
            label: `Naive recursion vs memo vs table vs two rows`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

long long calls = 0;
int naive(const string& a, const string& b, size_t i, size_t j) {
    calls++;
    if (i == a.size() || j == b.size()) return 0;
    if (a[i] == b[j]) return 1 + naive(a, b, i + 1, j + 1);
    return max(naive(a, b, i + 1, j), naive(a, b, i, j + 1));
}

long long states = 0;
vector<vector<int>> memo;                 // -1 = not computed yet
int go(const string& a, const string& b, size_t i, size_t j) {
    if (i == a.size() || j == b.size()) return 0;
    int& slot = memo[i][j];               // a reference: safe, memo is never resized during the recursion
    if (slot != -1) return slot;
    states++;
    slot = a[i] == b[j] ? 1 + go(a, b, i + 1, j + 1) : max(go(a, b, i + 1, j), go(a, b, i, j + 1));
    return slot;
}
int memoLcs(const string& a, const string& b) {
    memo.assign(a.size(), vector<int>(b.size(), -1));
    return go(a, b, 0, 0);
}

int tableLcs(const string& a, const string& b) {
    size_t m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (size_t i = 1; i <= m; i++)
        for (size_t j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1] + 1 : max(dp[i - 1][j], dp[i][j - 1]);
    return dp[m][n];
}

int twoRowsLcs(string a, string b) {
    if (b.size() > a.size()) swap(a, b);  // keep the rows short
    vector<int> prev(b.size() + 1, 0), cur(b.size() + 1, 0);
    for (size_t i = 1; i <= a.size(); i++) {
        for (size_t j = 1; j <= b.size(); j++)
            cur[j] = a[i - 1] == b[j - 1] ? prev[j - 1] + 1 : max(prev[j], cur[j - 1]);
        swap(prev, cur);                  // O(1): swaps the buffers, copies nothing
    }
    return prev[b.size()];
}

long long seed = 12345;
long long nxt() { seed = seed * 48271 % 2147483647LL; return seed; }

int main() {
    vector<pair<string, string>> pairs = {{"abcdefgh", "ijklmnop"}, {"abcdefghij", "klmnopqrst"}, {"AGGTABQXYZ", "GXTXAYBQZY"}};
    for (auto& [a, b] : pairs) {
        calls = 0;
        int r1 = naive(a, b, 0, 0);
        states = 0;
        int r2 = memoLcs(a, b);
        cout << a << " vs " << b << ": naive " << r1 << " in " << calls << " calls, memo "
             << r2 << " in " << states << " states\\n";
    }
    string x, y;
    for (int k = 0; k < 800; k++) x += char(97 + nxt() % 4);
    for (int k = 0; k < 600; k++) y += char(97 + nxt() % 4);
    cout << "random 800 x 600 over 4 letters: table " << tableLcs(x, y)
         << ", two rows " << twoRowsLcs(x, y) << ", cells " << 800 * 600 << "\\n";
}`,
          },
        ],
      },
    },
  },
  {
    title: "How do you find the longest increasing subsequence?",
    difficulty: "medium",
    seoDescription: `Longest increasing subsequence two ways: the O(n^2) DP and the O(n log n) tails array with binary search, rebuilt and verified in four languages.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given an array of integers, return the length of its longest strictly increasing subsequence. Start with whatever works, then make it faster, and tell me how you would return the subsequence itself. Please code it in Python."

**What a strong answer should cover:**
- The O(n²) DP: \`dp[i]\` = LIS length ending at i, \`dp[i] = 1 + max(dp[j])\` over earlier smaller \`nums[j]\`, answer = \`max(dp)\` (not \`dp[-1]\`).
- The O(n log n) idea: \`tails[k]\` = smallest possible tail of an increasing subsequence of length k + 1; \`tails\` stays sorted, so each number is placed with one binary search.
- That \`tails\` is not itself an LIS, and how parent pointers rebuild a real one.
- Strict vs non-decreasing: \`bisect_left\` vs \`bisect_right\`.
- Python details: the \`bisect\` module, \`max(dp)\` raising \`ValueError\` on an empty list, and why the O(n²) double loop is slow in pure Python for n in the tens of thousands.

**Clarifying questions expected:**
- Strictly increasing or non-decreasing?
- Length only, or the subsequence too?
- How large can n be?

**Code / implementation expected:** Yes — the O(n log n) tails solution with \`bisect_left\` in Python; the O(n²) DP is a good first step to mention or write.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, lists and the idea of binary search.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are hiking and you write down the altitude every hour: 10, 9, 2, 5, 3, 7, 101, 18. Later a friend asks: "What is the longest climb you could describe by picking readings in order, each one higher than the last?" You may skip readings, but you may not reorder them. 2 → 5 → 7 → 101 works, and so does 2 → 3 → 7 → 18. Both have four readings, and no five-reading climb exists.

That is the **longest increasing subsequence** (LIS). It turns up whenever you want the longest "consistently improving" thread inside noisy data: stacking boxes or envelopes that must each fit inside the next, scheduling tasks that must keep an order, or measuring how "nearly sorted" a list is — n minus the LIS length is the fewest elements you must remove to leave the list sorted.

It is also the interview question where the first DP you find (O(n²)) is not the one the interviewer wants to finish with. The O(n log n) version is a beautiful trick, and explaining *why* it works is what separates a memorised answer from an understood one.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Strictly increasing, or non-decreasing (equal values allowed)? | It changes one comparison: \`<\` vs \`<=\` in the O(n²) DP, lower bound vs upper bound in the O(n log n) one. [7, 7, 7, 7] gives 1 or 4. |
| Do you need the length or the subsequence itself? | The length needs only the tails array; the subsequence needs parent pointers as well. |
| How large is n? | n = 2,000 is about 2 million comparisons for O(n²) — fine. n = 100,000 means 5 billion — use O(n log n). |
| If several LIS tie, is any one acceptable? | There are usually many; asking for "all of them" or "the lexicographically smallest" changes the problem. |
| Can the array be empty? Can values be negative or huge? | Empty gives 0. The algorithms only compare values, so their size does not matter. |

## 3. The Core Idea in Plain Words

A **subsequence** keeps some elements in their original order and may skip others. An **increasing** subsequence is one where every element is larger than the one before. We want the longest one.

📌 **Interview term: Subsequence** — the elements left after deleting zero or more elements, in their original order; gaps are allowed. A contiguous block would be a subarray.

📌 **Interview term: Longest increasing subsequence (LIS)** — the longest subsequence whose elements strictly increase. For [10, 9, 2, 5, 3, 7, 101, 18] its length is 4.

<svg class="iq-diagram" width="100%" viewBox="0 0 770 190" role="img" aria-label="The array 10 9 2 5 3 7 101 18 with one longest increasing subsequence highlighted: 2 5 7 101">
  <rect class="d-box" x="20" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="55" y="104" text-anchor="middle">10</text>
  <text class="d-sub" x="55" y="160" text-anchor="middle">i = 0</text>
  <rect class="d-box" x="112" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="147" y="104" text-anchor="middle">9</text>
  <text class="d-sub" x="147" y="160" text-anchor="middle">i = 1</text>
  <rect class="d-box-accent" x="204" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="239" y="104" text-anchor="middle">2</text>
  <text class="d-sub" x="239" y="160" text-anchor="middle">i = 2</text>
  <rect class="d-box-accent" x="296" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="331" y="104" text-anchor="middle">5</text>
  <text class="d-sub" x="331" y="160" text-anchor="middle">i = 3</text>
  <rect class="d-box" x="388" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="423" y="104" text-anchor="middle">3</text>
  <text class="d-sub" x="423" y="160" text-anchor="middle">i = 4</text>
  <rect class="d-box-accent" x="480" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="515" y="104" text-anchor="middle">7</text>
  <text class="d-sub" x="515" y="160" text-anchor="middle">i = 5</text>
  <rect class="d-box-accent" x="572" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="607" y="104" text-anchor="middle">101</text>
  <text class="d-sub" x="607" y="160" text-anchor="middle">i = 6</text>
  <rect class="d-box" x="664" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="699" y="104" text-anchor="middle">18</text>
  <text class="d-sub" x="699" y="160" text-anchor="middle">i = 7</text>
  <path class="d-edge-accent" d="M 239 66 Q 285 32 331 66" fill="none"/>
  <path class="d-edge-accent" d="M 331 66 Q 423 26 515 66" fill="none"/>
  <path class="d-edge-accent" d="M 515 66 Q 561 32 607 66" fill="none"/>
</svg>

The highlighted boxes are one LIS, 2 → 5 → 7 → 101. Notice how the arcs jump over 3 and over 18: skipping is allowed.

### Idea A — the O(n²) DP: "the best run that ends here"

Ask a small question about every position i: **what is the longest increasing subsequence that ends exactly at \`nums[i]\`?** Call it \`dp[i]\`.

- Any such subsequence is either \`nums[i]\` alone (length 1), or some shorter increasing subsequence ending at an earlier \`nums[j] < nums[i]\`, with \`nums[i]\` appended.
- So \`dp[i] = 1 + max(dp[j] for j < i with nums[j] < nums[i])\`, or 1 if there is no such j.
- The answer is the **largest** \`dp[i]\` anywhere — not \`dp[n-1]\`, because the LIS need not end at the last element.

Remember which j gave the best value (\`prev[i] = j\`) and you can follow those pointers back from the best end to rebuild the subsequence. For each i we look at every earlier j, so this costs about n²/2 comparisons.

📌 **Interview term: State "ending at i"** — a DP state that fixes where the subsequence ends. It makes the transition easy (only look left), at the cost of taking the maximum over all states at the end.

### Idea B — the O(n log n) tails array: "keep every ending as small as possible"

Now a different, cleverer question: **for each length k, what is the smallest number that can end an increasing subsequence of length k?** Keep those numbers in an array \`tails\`, where \`tails[k]\` is the smallest tail of any increasing subsequence of length k + 1 seen so far.

Why the smallest? Because a smaller ending is never worse: anything that could extend a subsequence ending in 5 can also extend one ending in 3.

Two facts make this fast:

1. **\`tails\` is always sorted (strictly increasing).** A length-(k+1) run contains a length-k run ending in a smaller number, so the best length-k tail is smaller than the best length-(k+1) tail.
2. **Each new number x changes exactly one slot.** Find the first tail that is **≥ x**. If there is none, x extends the longest run: append it. Otherwise x is a smaller ending for that length: overwrite that slot.

Because \`tails\` is sorted, "find the first tail ≥ x" is a [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) — O(log n). n numbers, O(log n) each: O(n log n). The LIS length is simply \`len(tails)\` at the end.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 210" role="img" aria-label="Tails holds 2 and 5. The next number 3 goes to slot 1, the first tail that is not smaller, so tails becomes 2 and 3">
  <defs>
    <marker id="b29q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="104" y="40" text-anchor="middle">tails before</text>
  <rect class="d-box" x="30" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="62" y="104" text-anchor="middle">2</text>
  <rect class="d-box" x="114" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="146" y="104" text-anchor="middle">5</text>
  <path class="d-edge" d="M 186 98 L 282 98" marker-end="url(#b29q2-arrow)"/>
  <text class="d-sub" x="328" y="40" text-anchor="middle">next number</text>
  <rect class="d-box-accent" x="296" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="328" y="104" text-anchor="middle">3</text>
  <path class="d-edge" d="M 368 98 L 464 98" marker-end="url(#b29q2-arrow)"/>
  <text class="d-sub" x="560" y="40" text-anchor="middle">tails after</text>
  <rect class="d-box" x="478" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="510" y="104" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="562" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="594" y="104" text-anchor="middle">3</text>
  <text class="d-sub" x="328" y="170" text-anchor="middle">first tail not smaller: slot 1</text>
  <text class="d-sub" x="560" y="170" text-anchor="middle">5 replaced by 3</text>
</svg>

When 3 arrives, tails is [2, 5]. The first tail not smaller than 3 is 5, in slot 1, so 3 replaces it: we now know a length-2 run can end as low as 3 (namely 2, 3). Later, 7 extends it to [2, 3, 7], then 101 to [2, 3, 7, 101], and 18 replaces 101.

📌 **Interview term: Patience sorting** — the card-game picture behind Idea B: deal cards onto piles, always on the leftmost pile whose top card is not smaller, else start a new pile. The number of piles equals the LIS length, and the pile tops are the \`tails\` array.

📌 **Interview term: Lower bound** — the first position in a sorted array whose value is ≥ x (the insertion point that keeps the array sorted, to the left of equal values). Upper bound is the first position whose value is > x.

**A trap: \`tails\` is not the LIS.** For [3, 4, 1], tails ends as [1, 4] — but 1 comes *after* 4 in the input, so [1, 4] is not a subsequence at all. Only its **length** is meaningful. To rebuild a real LIS, store for each element the index of the element that sat in the slot to its left when it was placed (a parent pointer), and walk back from the last slot. Example 1 does exactly that and prints [3, 4].

## 4. Brute Force → DP → Binary Search

- **Brute force:** try all 2^n subsequences and keep the longest increasing one. n = 30 is already a billion subsets.
- **O(n²) DP (Idea A):** each element looks back at every earlier element once. Simple, and it is a fine first answer to say out loud. This is classic [dynamic programming](/interview-question/what-is-dynamic-programming): the answer for i is built from answers for smaller indices.
- **O(n log n) tails (Idea B):** each element does one binary search in a sorted array. On 2,000 random numbers, example 2 counts **1,999,000** comparisons for the DP and **11,353** binary-search steps for tails.

## 5. The Code in Python

Both versions, each returning one actual LIS (not just its length):

~~~python
from bisect import bisect_left


def lis_quadratic(nums):
    """O(n^2): dp[i] = length of the longest increasing subsequence ending at i."""
    n = len(nums)
    if n == 0:
        return []
    dp, prev = [1] * n, [-1] * n
    for i in range(n):
        for j in range(i):
            if nums[j] < nums[i] and dp[j] + 1 > dp[i]:
                dp[i], prev[i] = dp[j] + 1, j
    end = max(range(n), key=lambda k: dp[k])   # first index with the largest dp
    out = []
    while end != -1:
        out.append(nums[end])
        end = prev[end]
    return out[::-1]


def lis_patience(nums, trace=False):
    """O(n log n): tails[k] = smallest tail of an increasing subsequence of length k + 1."""
    tails, tail_idx, parent = [], [], [-1] * len(nums)
    for i, x in enumerate(nums):
        k = bisect_left(tails, x)       # first tail >= x (strictly increasing LIS)
        if k == len(tails):
            tails.append(x)
            tail_idx.append(i)
        else:
            tails[k] = x
            tail_idx[k] = i
        parent[i] = tail_idx[k - 1] if k > 0 else -1
        if trace:
            print(str(x) + " -> " + fmt(tails))
    out, i = [], tail_idx[-1] if tail_idx else -1
    while i != -1:
        out.append(nums[i])
        i = parent[i]
    return out[::-1], tails
~~~

**What to point out in this code:**

- \`bisect_left(tails, x)\` returns the leftmost position where x could be inserted and keep \`tails\` sorted — the **lower bound**, the first tail ≥ x ([Python docs: bisect](https://docs.python.org/3/library/bisect.html)). That is exactly the slot to overwrite for a *strictly* increasing LIS. For non-decreasing, use \`bisect_right\` (first tail > x). On \`[2, 3, 3, 7]\`, \`bisect_left(t, 3)\` is 1 and \`bisect_right(t, 3)\` is 3.
- If \`k == len(tails)\`, x is larger than every tail and extends the longest run, so we append. Otherwise we overwrite \`tails[k]\`.
- \`tail_idx[k]\` remembers **which index** currently ends the best run of length k + 1, and \`parent[i] = tail_idx[k - 1]\` links x to the run it extended. Walking \`parent\` from \`tail_idx[-1]\` and reversing gives a real LIS.
- \`max(range(n), key=lambda k: dp[k])\` returns the *first* index with the largest \`dp\` value. Guard the empty case first: \`max([])\` raises \`ValueError: max() iterable argument is empty\`.
- \`out[::-1]\` reverses a list with a slice; both rebuild loops collect the subsequence from the end.

📌 **Interview term: Parent pointer** — for each element, the index of the element just before it in the best run that ends there. Following parents from the best end, then reversing, rebuilds the subsequence.

**Just the length**, which is what most interviewers ask for first, is four lines:

~~~python
from bisect import bisect_left

def length_of_lis(nums):
    tails = []
    for x in nums:
        k = bisect_left(tails, x)
        if k == len(tails):
            tails.append(x)
        else:
            tails[k] = x
    return len(tails)
~~~

We ran this function on its own too: it returns 4 for [10, 9, 2, 5, 3, 7, 101, 18], 0 for [] and 2 for [1, 2, 0]. It is \`lis_patience\` with the index bookkeeping removed; example 2 runs the same loop with a hand-written binary search so that it can count the steps.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the tails array step by step, then both algorithms on seven inputs** prints:

~~~text
tails after each number of [10, 9, 2, 5, 3, 7, 101, 18]:
10 -> [10]
9 -> [9]
2 -> [2]
5 -> [2, 5]
3 -> [2, 3]
7 -> [2, 3, 7]
101 -> [2, 3, 7, 101]
18 -> [2, 3, 7, 18]
[10, 9, 2, 5, 3, 7, 101, 18]: n^2 length 4 -> [2, 5, 7, 101]; n log n length 4 -> [2, 3, 7, 18]
[0, 1, 0, 3, 2, 3]: n^2 length 4 -> [0, 1, 2, 3]; n log n length 4 -> [0, 1, 2, 3]
[7, 7, 7, 7]: n^2 length 1 -> [7]; n log n length 1 -> [7]
[]: n^2 length 0 -> []; n log n length 0 -> []
[5]: n^2 length 1 -> [5]; n log n length 1 -> [5]
[1, 2, 3, 4, 5]: n^2 length 5 -> [1, 2, 3, 4, 5]; n log n length 5 -> [1, 2, 3, 4, 5]
[5, 4, 3, 2, 1]: n^2 length 1 -> [5]; n log n length 1 -> [1]
tails for [3, 4, 1] = [1, 4], but the rebuilt LIS is [3, 4]
~~~

Read it against section 3: 3 replaces 5, 18 replaces 101, and the final \`tails\` [2, 3, 7, 18] happens to be an LIS here. The last line shows it is not one in general: for [3, 4, 1] tails is [1, 4], while the parent pointers rebuild the real LIS [3, 4]. On [5, 4, 3, 2, 1] the two versions return different single elements; both are valid.

**Example 2 — counting the work, and strict vs non-decreasing** prints:

~~~text
n=500: n^2 length 41 with 124750 comparisons; tails length 41 with 2299 search steps
n=2000: n^2 length 84 with 1999000 comparisons; tails length 84 with 11353 search steps
n=8000: n^2 not run (would need 31996000 comparisons); tails length 165 with 53546 search steps
[7, 7, 7, 7]: strictly increasing 1, non-decreasing 4
[1, 3, 3, 2, 2, 4]: strictly increasing 3, non-decreasing 4
[3, 1, 2, 2, 2, 5, 4]: strictly increasing 3, non-decreasing 5
~~~

- The O(n²) DP makes exactly n(n−1)/2 comparisons: 124,750 for n = 500 and 1,999,000 for n = 2,000. The tails method needs 2,299 and 11,353 binary-search steps and agrees on the length (41 and 84).
- For n = 8,000 the DP would need almost 32 million comparisons, so the program does not run it; tails needs 53,546 steps.
- Switching the search from "first tail ≥ x" to "first tail > x" turns the strict LIS into the non-decreasing one: [7, 7, 7, 7] goes from 1 to 4.

## 7. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(2^n · n) | O(n) | every subset, each checked in O(n) |
| \`dp[i]\` ending at i | O(n²) | O(n) | each i scans all j < i |
| \`tails\` + \`bisect_left\` | O(n log n) | O(n) | one binary search per element; \`tails\` never exceeds n |
| Rebuild with parents | O(n) extra | O(n) | one parent per element, one walk back |

In Python the O(n²) double loop runs as interpreted bytecode, so for n in the tens of thousands it means hundreds of millions of slow steps; CPython's \`bisect.bisect_left\` is the C function from the \`_bisect\` accelerator module (\`bisect.bisect_left is _bisect.bisect_left\` printed \`True\` here), which makes the tails version both asymptotically and practically faster.

## 8. Edge Cases

- **Empty array.** The LIS length is 0 and the subsequence is [] (both versions guard for it).
- **One element.** Length 1.
- **Already sorted.** The LIS is the whole array; in the tails version every number is appended ([1, 2, 3, 4, 5] gives 5).
- **Strictly decreasing.** Length 1. The two versions can return *different* one-element answers — the O(n²) DP keeps the first maximum ([5]) while the tails version keeps the last placed number ([1]); both are correct.
- **All equal.** [7, 7, 7, 7] has a strictly increasing LIS of 1 but a non-decreasing one of 4 — ask which one is wanted.
- **Ties between different LIS.** [10, 9, 2, 5, 3, 7, 101, 18] has several of length 4; the two versions print [2, 5, 7, 101] and [2, 3, 7, 18]. Say "one LIS", not "the LIS".

## Common Pitfalls

- **Returning \`dp[-1]\` instead of \`max(dp)\`.** The LIS need not end at the last element: for [1, 2, 0] the last \`dp\` is 1, the answer is 2.
- **\`bisect_right\` when the question says strictly increasing** (or \`bisect_left\` when it says non-decreasing). One wrong letter changes [7, 7, 7, 7] from 1 to 4.
- **Returning \`tails\` as the subsequence.** It is only a list of smallest endings; for [3, 4, 1] it is [1, 4], which is not a subsequence.
- **\`max(dp)\` on an empty input** raises \`ValueError\`; check \`if not nums\` first.
- **Confusing subsequence with subarray.** A contiguous "longest increasing run" is a simple O(n) scan, not this problem.
- **Using the O(n²) version for large n in Python.** At n = 100,000 it is 5 billion comparisons; the tails loop is 100,000 calls to \`bisect_left\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. First version:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i]</code> is the LIS length ending at i: 1 plus the best <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[j]</code> with j before i and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[j] &lt; nums[i]</code>. Answer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(dp)</code>. O(n²).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The better idea:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails[k]</code> is the smallest tail of any increasing run of length k + 1. Smaller tails are never worse, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails</code> stays sorted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The update:</strong> <span style="color:#f0e2c8;">For each x, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k = bisect_left(tails, x)</code>; append if k is the end, else overwrite <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails[k]</code>. The answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len(tails)</code>. O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The trap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails</code> is not an LIS. Store a parent index per element and walk back to rebuild a real one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect_left</code> for strictly increasing, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect_right</code> for non-decreasing; guard empty input before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(dp)</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does replacing a tail never lose the answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The length of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails</code> only grows, so the best length found is kept. Replacing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails[k]</code> by a smaller x only lowers the bar for future numbers; any number that could extend the old tail can also extend x.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the actual subsequence in O(n log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail_idx[k]</code>, the index ending the best run of length k + 1, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[i] = tail_idx[k - 1]</code> when placing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code>. Walk parents from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail_idx[-1]</code> and reverse.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for non-decreasing sequences?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect_right</code> so equal values extend rather than replace. In our run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[7, 7, 7, 7]</code> went from 1 to 4 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[3, 1, 2, 2, 2, 5, 4]</code> from 3 to 5.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you solve Russian-doll envelopes (fit <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(w, h)</code> pairs inside each other)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort by width ascending and, for equal widths, height <strong style="color:#ffca28;">descending</strong>, then run LIS on the heights. The descending tie-break stops two envelopes of the same width from both being counted.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you count how many LIS exist?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Back to O(n²): keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length[i]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count[i]</code>; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[j] + 1</code> beats <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length[i]</code>, copy <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count[j]</code>, when it ties, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count[j]</code>. The answer sums <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count[i]</code> over all i with the maximum length.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subsequence** | Elements kept in order after deleting some; gaps allowed |
| **Longest increasing subsequence (LIS)** | The longest subsequence whose elements strictly increase |
| **State "ending at i"** | \`dp[i]\` = best answer for subsequences that end exactly at index i |
| **Patience sorting** | Dealing numbers onto piles; the pile count is the LIS length and the pile tops are \`tails\` |
| **Lower bound** | First position in a sorted array with value ≥ x (upper bound: > x) |
| **Parent pointer** | For each element, the index of the element before it in its best run; used to rebuild the LIS |

---
**Conclusion:** The longest increasing subsequence has two standard answers. The O(n²) DP asks for the best run ending at each index and takes the maximum; the O(n log n) method keeps \`tails\`, the smallest possible ending for every length, which stays sorted, so each new number is placed with one \`bisect_left\`. In Python the second version is a few lines; add parent pointers when the subsequence itself is needed, because \`tails\` is only good for the length. Our runs measured the difference: 1,999,000 comparisons against 11,353 binary-search steps for 2,000 numbers, with the same answer.`,
        examples: [
          {
            label: `LIS by O(n^2) DP and by the O(n log n) tails array, with the subsequence rebuilt`,
            code: `from bisect import bisect_left


def lis_quadratic(nums):
    """O(n^2): dp[i] = length of the longest increasing subsequence ending at i."""
    n = len(nums)
    if n == 0:
        return []
    dp, prev = [1] * n, [-1] * n
    for i in range(n):
        for j in range(i):
            if nums[j] < nums[i] and dp[j] + 1 > dp[i]:
                dp[i], prev[i] = dp[j] + 1, j
    end = max(range(n), key=lambda k: dp[k])   # first index with the largest dp
    out = []
    while end != -1:
        out.append(nums[end])
        end = prev[end]
    return out[::-1]


def lis_patience(nums, trace=False):
    """O(n log n): tails[k] = smallest tail of an increasing subsequence of length k + 1."""
    tails, tail_idx, parent = [], [], [-1] * len(nums)
    for i, x in enumerate(nums):
        k = bisect_left(tails, x)       # first tail >= x (strictly increasing LIS)
        if k == len(tails):
            tails.append(x)
            tail_idx.append(i)
        else:
            tails[k] = x
            tail_idx[k] = i
        parent[i] = tail_idx[k - 1] if k > 0 else -1
        if trace:
            print(str(x) + " -> " + fmt(tails))
    out, i = [], tail_idx[-1] if tail_idx else -1
    while i != -1:
        out.append(nums[i])
        i = parent[i]
    return out[::-1], tails


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


demo = [10, 9, 2, 5, 3, 7, 101, 18]
print("tails after each number of " + fmt(demo) + ":")
lis_patience(demo, trace=True)

for nums in [demo, [0, 1, 0, 3, 2, 3], [7, 7, 7, 7], [], [5], [1, 2, 3, 4, 5], [5, 4, 3, 2, 1]]:
    a = lis_quadratic(nums)
    b, _ = lis_patience(nums)
    print(fmt(nums) + ": n^2 length " + str(len(a)) + " -> " + fmt(a) +
          "; n log n length " + str(len(b)) + " -> " + fmt(b))

seq, tails = lis_patience([3, 4, 1])
print("tails for [3, 4, 1] = " + fmt(tails) + ", but the rebuilt LIS is " + fmt(seq))`,
          },
          {
            label: `Comparisons vs binary-search steps, strict vs non-decreasing`,
            code: `def lis_quadratic_count(nums):
    dp, comps = [1] * len(nums), 0
    for i in range(len(nums)):
        for j in range(i):
            comps += 1
            if nums[j] < nums[i] and dp[j] + 1 > dp[i]:
                dp[i] = dp[j] + 1
    return (max(dp) if dp else 0), comps


def lis_tails_count(nums, strict=True):
    """Hand-written binary search so every language counts the same steps."""
    tails, steps = [], 0
    for x in nums:
        lo, hi = 0, len(tails)
        while lo < hi:                  # strict: first tail >= x; non-strict: first tail > x
            steps += 1
            mid = (lo + hi) // 2
            if tails[mid] < x or (not strict and tails[mid] == x):
                lo = mid + 1
            else:
                hi = mid
        if lo == len(tails):
            tails.append(x)
        else:
            tails[lo] = x
    return len(tails), steps


seed = 2024
def nxt():
    global seed
    seed = seed * 48271 % 2147483647
    return seed

for n in [500, 2000, 8000]:
    nums = [nxt() % 10000 for _ in range(n)]
    l2, c2 = lis_tails_count(nums)
    if n <= 2000:
        l1, c1 = lis_quadratic_count(nums)
        left = "n^2 length " + str(l1) + " with " + str(c1) + " comparisons"
    else:
        left = "n^2 not run (would need " + str(n * (n - 1) // 2) + " comparisons)"
    print("n=" + str(n) + ": " + left + "; tails length " + str(l2) + " with " + str(c2) + " search steps")

for nums in [[7, 7, 7, 7], [1, 3, 3, 2, 2, 4], [3, 1, 2, 2, 2, 5, 4]]:
    s, _ = lis_tails_count(nums, True)
    ns, _ = lis_tails_count(nums, False)
    print("[" + ", ".join(map(str, nums)) + "]: strictly increasing " + str(s) +
          ", non-decreasing " + str(ns))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an array of integers, return the length of its longest strictly increasing subsequence. Start with whatever works, then make it faster, and tell me how you would return the subsequence itself. Please code it in JavaScript."

**What a strong answer should cover:**
- The O(n²) DP: \`dp[i]\` = LIS length ending at i, \`dp[i] = 1 + max(dp[j])\` over earlier smaller \`nums[j]\`, answer = \`max(dp)\` (not \`dp[-1]\`).
- The O(n log n) idea: \`tails[k]\` = smallest possible tail of an increasing subsequence of length k + 1; \`tails\` stays sorted, so each number is placed with one binary search.
- That \`tails\` is not itself an LIS, and how parent pointers rebuild a real one.
- Strict vs non-decreasing: first tail ≥ x vs first tail > x (a \`<\` vs \`<=\` in the search).
- JavaScript details: no built-in binary search, so a hand-written \`lowerBound\`; assigning at \`tails.length\` appends; \`Math.max(...dp)\` returns \`-Infinity\` on empty input and can throw on very large arrays.

**Clarifying questions expected:**
- Strictly increasing or non-decreasing?
- Length only, or the subsequence too?
- How large can n be?

**Code / implementation expected:** Yes — the O(n log n) tails solution with a hand-written lower-bound search in JavaScript; the O(n²) DP is a good first step to mention or write.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, arrays and the idea of binary search.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are hiking and you write down the altitude every hour: 10, 9, 2, 5, 3, 7, 101, 18. Later a friend asks: "What is the longest climb you could describe by picking readings in order, each one higher than the last?" You may skip readings, but you may not reorder them. 2 → 5 → 7 → 101 works, and so does 2 → 3 → 7 → 18. Both have four readings, and no five-reading climb exists.

That is the **longest increasing subsequence** (LIS). It turns up whenever you want the longest "consistently improving" thread inside noisy data: stacking boxes or envelopes that must each fit inside the next, scheduling tasks that must keep an order, or measuring how "nearly sorted" a list is — n minus the LIS length is the fewest elements you must remove to leave the list sorted.

It is also the interview question where the first DP you find (O(n²)) is not the one the interviewer wants to finish with. The O(n log n) version is a beautiful trick, and explaining *why* it works is what separates a memorised answer from an understood one.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Strictly increasing, or non-decreasing (equal values allowed)? | It changes one comparison: \`<\` vs \`<=\` in the O(n²) DP, lower bound vs upper bound in the O(n log n) one. [7, 7, 7, 7] gives 1 or 4. |
| Do you need the length or the subsequence itself? | The length needs only the tails array; the subsequence needs parent pointers as well. |
| How large is n? | n = 2,000 is about 2 million comparisons for O(n²) — fine. n = 100,000 means 5 billion — use O(n log n). |
| If several LIS tie, is any one acceptable? | There are usually many; asking for "all of them" or "the lexicographically smallest" changes the problem. |
| Can the array be empty? Can values be negative or huge? | Empty gives 0. The algorithms only compare values, so their size does not matter. |

## 3. The Core Idea in Plain Words

A **subsequence** keeps some elements in their original order and may skip others. An **increasing** subsequence is one where every element is larger than the one before. We want the longest one.

📌 **Interview term: Subsequence** — the elements left after deleting zero or more elements, in their original order; gaps are allowed. A contiguous block would be a subarray.

📌 **Interview term: Longest increasing subsequence (LIS)** — the longest subsequence whose elements strictly increase. For [10, 9, 2, 5, 3, 7, 101, 18] its length is 4.

<svg class="iq-diagram" width="100%" viewBox="0 0 770 190" role="img" aria-label="The array 10 9 2 5 3 7 101 18 with one longest increasing subsequence highlighted: 2 5 7 101">
  <rect class="d-box" x="20" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="55" y="104" text-anchor="middle">10</text>
  <text class="d-sub" x="55" y="160" text-anchor="middle">i = 0</text>
  <rect class="d-box" x="112" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="147" y="104" text-anchor="middle">9</text>
  <text class="d-sub" x="147" y="160" text-anchor="middle">i = 1</text>
  <rect class="d-box-accent" x="204" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="239" y="104" text-anchor="middle">2</text>
  <text class="d-sub" x="239" y="160" text-anchor="middle">i = 2</text>
  <rect class="d-box-accent" x="296" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="331" y="104" text-anchor="middle">5</text>
  <text class="d-sub" x="331" y="160" text-anchor="middle">i = 3</text>
  <rect class="d-box" x="388" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="423" y="104" text-anchor="middle">3</text>
  <text class="d-sub" x="423" y="160" text-anchor="middle">i = 4</text>
  <rect class="d-box-accent" x="480" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="515" y="104" text-anchor="middle">7</text>
  <text class="d-sub" x="515" y="160" text-anchor="middle">i = 5</text>
  <rect class="d-box-accent" x="572" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="607" y="104" text-anchor="middle">101</text>
  <text class="d-sub" x="607" y="160" text-anchor="middle">i = 6</text>
  <rect class="d-box" x="664" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="699" y="104" text-anchor="middle">18</text>
  <text class="d-sub" x="699" y="160" text-anchor="middle">i = 7</text>
  <path class="d-edge-accent" d="M 239 66 Q 285 32 331 66" fill="none"/>
  <path class="d-edge-accent" d="M 331 66 Q 423 26 515 66" fill="none"/>
  <path class="d-edge-accent" d="M 515 66 Q 561 32 607 66" fill="none"/>
</svg>

The highlighted boxes are one LIS, 2 → 5 → 7 → 101. Notice how the arcs jump over 3 and over 18: skipping is allowed.

### Idea A — the O(n²) DP: "the best run that ends here"

Ask a small question about every position i: **what is the longest increasing subsequence that ends exactly at \`nums[i]\`?** Call it \`dp[i]\`.

- Any such subsequence is either \`nums[i]\` alone (length 1), or some shorter increasing subsequence ending at an earlier \`nums[j] < nums[i]\`, with \`nums[i]\` appended.
- So \`dp[i] = 1 + max(dp[j] for j < i with nums[j] < nums[i])\`, or 1 if there is no such j.
- The answer is the **largest** \`dp[i]\` anywhere — not \`dp[n-1]\`, because the LIS need not end at the last element.

Remember which j gave the best value (\`prev[i] = j\`) and you can follow those pointers back from the best end to rebuild the subsequence. For each i we look at every earlier j, so this costs about n²/2 comparisons.

📌 **Interview term: State "ending at i"** — a DP state that fixes where the subsequence ends. It makes the transition easy (only look left), at the cost of taking the maximum over all states at the end.

### Idea B — the O(n log n) tails array: "keep every ending as small as possible"

Now a different, cleverer question: **for each length k, what is the smallest number that can end an increasing subsequence of length k?** Keep those numbers in an array \`tails\`, where \`tails[k]\` is the smallest tail of any increasing subsequence of length k + 1 seen so far.

Why the smallest? Because a smaller ending is never worse: anything that could extend a subsequence ending in 5 can also extend one ending in 3.

Two facts make this fast:

1. **\`tails\` is always sorted (strictly increasing).** A length-(k+1) run contains a length-k run ending in a smaller number, so the best length-k tail is smaller than the best length-(k+1) tail.
2. **Each new number x changes exactly one slot.** Find the first tail that is **≥ x**. If there is none, x extends the longest run: append it. Otherwise x is a smaller ending for that length: overwrite that slot.

Because \`tails\` is sorted, "find the first tail ≥ x" is a [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) — O(log n). n numbers, O(log n) each: O(n log n). The LIS length is simply \`len(tails)\` at the end.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 210" role="img" aria-label="Tails holds 2 and 5. The next number 3 goes to slot 1, the first tail that is not smaller, so tails becomes 2 and 3">
  <defs>
    <marker id="b29q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="104" y="40" text-anchor="middle">tails before</text>
  <rect class="d-box" x="30" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="62" y="104" text-anchor="middle">2</text>
  <rect class="d-box" x="114" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="146" y="104" text-anchor="middle">5</text>
  <path class="d-edge" d="M 186 98 L 282 98" marker-end="url(#b29q2-arrow)"/>
  <text class="d-sub" x="328" y="40" text-anchor="middle">next number</text>
  <rect class="d-box-accent" x="296" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="328" y="104" text-anchor="middle">3</text>
  <path class="d-edge" d="M 368 98 L 464 98" marker-end="url(#b29q2-arrow)"/>
  <text class="d-sub" x="560" y="40" text-anchor="middle">tails after</text>
  <rect class="d-box" x="478" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="510" y="104" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="562" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="594" y="104" text-anchor="middle">3</text>
  <text class="d-sub" x="328" y="170" text-anchor="middle">first tail not smaller: slot 1</text>
  <text class="d-sub" x="560" y="170" text-anchor="middle">5 replaced by 3</text>
</svg>

When 3 arrives, tails is [2, 5]. The first tail not smaller than 3 is 5, in slot 1, so 3 replaces it: we now know a length-2 run can end as low as 3 (namely 2, 3). Later, 7 extends it to [2, 3, 7], then 101 to [2, 3, 7, 101], and 18 replaces 101.

📌 **Interview term: Patience sorting** — the card-game picture behind Idea B: deal cards onto piles, always on the leftmost pile whose top card is not smaller, else start a new pile. The number of piles equals the LIS length, and the pile tops are the \`tails\` array.

📌 **Interview term: Lower bound** — the first position in a sorted array whose value is ≥ x (the insertion point that keeps the array sorted, to the left of equal values). Upper bound is the first position whose value is > x.

**A trap: \`tails\` is not the LIS.** For [3, 4, 1], tails ends as [1, 4] — but 1 comes *after* 4 in the input, so [1, 4] is not a subsequence at all. Only its **length** is meaningful. To rebuild a real LIS, store for each element the index of the element that sat in the slot to its left when it was placed (a parent pointer), and walk back from the last slot. Example 1 does exactly that and prints [3, 4].

## 4. Brute Force → DP → Binary Search

- **Brute force:** try all 2^n subsequences and keep the longest increasing one. n = 30 is already a billion subsets.
- **O(n²) DP (Idea A):** each element looks back at every earlier element once. Simple, and it is a fine first answer to say out loud. This is classic [dynamic programming](/interview-question/what-is-dynamic-programming): the answer for i is built from answers for smaller indices.
- **O(n log n) tails (Idea B):** each element does one binary search in a sorted array. On 2,000 random numbers, example 2 counts **1,999,000** comparisons for the DP and **11,353** binary-search steps for tails.

## 5. The Code in JavaScript

Both versions, each returning one actual LIS (not just its length). JavaScript has no built-in binary search, so \`lowerBound\` is written by hand:

~~~javascript
// O(n^2): dp[i] = length of the longest increasing subsequence ending at i
function lisQuadratic(nums) {
  const n = nums.length;
  if (n === 0) return [];
  const dp = new Array(n).fill(1), prev = new Array(n).fill(-1);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < i; j++)
      if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; prev[i] = j; }
  let end = 0;
  for (let k = 1; k < n; k++) if (dp[k] > dp[end]) end = k;   // first index with the largest dp
  const out = [];
  for (let i = end; i !== -1; i = prev[i]) out.push(nums[i]);
  return out.reverse();
}

// first index in tails[0..len) whose value is >= x (JS has no built-in bisect)
function lowerBound(tails, x) {
  let lo = 0, hi = tails.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (tails[mid] < x) lo = mid + 1; else hi = mid;
  }
  return lo;
}

// O(n log n): tails[k] = smallest tail of an increasing subsequence of length k + 1
function lisPatience(nums, trace) {
  const tails = [], tailIdx = [], parent = new Array(nums.length).fill(-1);
  nums.forEach((x, i) => {
    const k = lowerBound(tails, x);
    tails[k] = x;              // k === tails.length appends
    tailIdx[k] = i;
    parent[i] = k > 0 ? tailIdx[k - 1] : -1;
    if (trace) console.log(x + " -> " + fmt(tails));
  });
  const out = [];
  for (let i = tailIdx.length ? tailIdx[tailIdx.length - 1] : -1; i !== -1; i = parent[i]) out.push(nums[i]);
  return [out.reverse(), tails];
}
~~~

**What to point out in this code:**

- \`lowerBound\` returns the first index whose tail is **≥ x** (the lower bound). That is the slot to overwrite for a *strictly* increasing LIS. For non-decreasing, change \`tails[mid] < x\` to \`tails[mid] <= x\` so that it finds the first tail **> x** (the upper bound).
- \`(lo + hi) >>> 1\` halves with an unsigned shift. For array indices \`Math.floor((lo + hi) / 2)\` is equally correct — JavaScript numbers do not overflow at 2^31 the way Java \`int\`s do.
- \`tails[k] = x\` with \`k === tails.length\` **appends**: assigning one past the end grows a JavaScript array. Assigning further past the end would leave holes, which never happens here because \`k\` is at most \`tails.length\`.
- \`tailIdx[k]\` remembers which index currently ends the best run of length k + 1, and \`parent[i] = tailIdx[k - 1]\` links x to the run it extended. Walking \`parent\` from the last slot and reversing gives a real LIS.
- In \`lisQuadratic\` the strict \`dp[k] > dp[end]\` keeps the *first* index with the largest value, the same choice the other three languages make.

📌 **Interview term: Parent pointer** — for each element, the index of the element just before it in the best run that ends there. Following parents from the best end, then reversing, rebuilds the subsequence.

**Just the length**, which is what most interviewers ask for first:

~~~javascript
function lengthOfLIS(nums) {
  const tails = [];
  for (const x of nums) tails[lowerBound(tails, x)] = x;   // index === length appends
  return tails.length;
}
~~~

We ran this with the \`lowerBound\` above: it returns 4 for [10, 9, 2, 5, 3, 7, 101, 18], 0 for [] and 2 for [1, 2, 0]. Example 2 runs the same loop with a step counter inside the binary search.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node 22). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the tails array step by step, then both algorithms on seven inputs** prints:

~~~text
tails after each number of [10, 9, 2, 5, 3, 7, 101, 18]:
10 -> [10]
9 -> [9]
2 -> [2]
5 -> [2, 5]
3 -> [2, 3]
7 -> [2, 3, 7]
101 -> [2, 3, 7, 101]
18 -> [2, 3, 7, 18]
[10, 9, 2, 5, 3, 7, 101, 18]: n^2 length 4 -> [2, 5, 7, 101]; n log n length 4 -> [2, 3, 7, 18]
[0, 1, 0, 3, 2, 3]: n^2 length 4 -> [0, 1, 2, 3]; n log n length 4 -> [0, 1, 2, 3]
[7, 7, 7, 7]: n^2 length 1 -> [7]; n log n length 1 -> [7]
[]: n^2 length 0 -> []; n log n length 0 -> []
[5]: n^2 length 1 -> [5]; n log n length 1 -> [5]
[1, 2, 3, 4, 5]: n^2 length 5 -> [1, 2, 3, 4, 5]; n log n length 5 -> [1, 2, 3, 4, 5]
[5, 4, 3, 2, 1]: n^2 length 1 -> [5]; n log n length 1 -> [1]
tails for [3, 4, 1] = [1, 4], but the rebuilt LIS is [3, 4]
~~~

Read it against section 3: 3 replaces 5, 18 replaces 101, and the final \`tails\` [2, 3, 7, 18] happens to be an LIS here. The last line shows it is not one in general: for [3, 4, 1] tails is [1, 4], while the parent pointers rebuild the real LIS [3, 4]. On [5, 4, 3, 2, 1] the two versions return different single elements; both are valid.

**Example 2 — counting the work, and strict vs non-decreasing** prints:

~~~text
n=500: n^2 length 41 with 124750 comparisons; tails length 41 with 2299 search steps
n=2000: n^2 length 84 with 1999000 comparisons; tails length 84 with 11353 search steps
n=8000: n^2 not run (would need 31996000 comparisons); tails length 165 with 53546 search steps
[7, 7, 7, 7]: strictly increasing 1, non-decreasing 4
[1, 3, 3, 2, 2, 4]: strictly increasing 3, non-decreasing 4
[3, 1, 2, 2, 2, 5, 4]: strictly increasing 3, non-decreasing 5
~~~

- The O(n²) DP makes exactly n(n−1)/2 comparisons: 124,750 for n = 500 and 1,999,000 for n = 2,000. The tails method needs 2,299 and 11,353 binary-search steps and agrees on the length (41 and 84).
- For n = 8,000 the DP would need almost 32 million comparisons, so the program does not run it; tails needs 53,546 steps.
- Switching the search from "first tail ≥ x" to "first tail > x" turns the strict LIS into the non-decreasing one: [7, 7, 7, 7] goes from 1 to 4.

## 7. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(2^n · n) | O(n) | every subset, each checked in O(n) |
| \`dp[i]\` ending at i | O(n²) | O(n) | each i scans all j < i |
| \`tails\` + \`lowerBound\` | O(n log n) | O(n) | one binary search per element; \`tails\` never exceeds n |
| Rebuild with parents | O(n) extra | O(n) | one parent per element, one walk back |

The JIT makes the O(n²) loop fast per step, but the count of steps is what grows: 5 billion comparisons at n = 100,000 is too slow in any language.

## 8. Edge Cases

- **Empty array.** The LIS length is 0 and the subsequence is [] (both versions guard for it).
- **One element.** Length 1.
- **Already sorted.** The LIS is the whole array; in the tails version every number is appended ([1, 2, 3, 4, 5] gives 5).
- **Strictly decreasing.** Length 1. The two versions can return *different* one-element answers — the O(n²) DP keeps the first maximum ([5]) while the tails version keeps the last placed number ([1]); both are correct.
- **All equal.** [7, 7, 7, 7] has a strictly increasing LIS of 1 but a non-decreasing one of 4 — ask which one is wanted.
- **Ties between different LIS.** [10, 9, 2, 5, 3, 7, 101, 18] has several of length 4; the two versions print [2, 5, 7, 101] and [2, 3, 7, 18]. Say "one LIS", not "the LIS".

## Common Pitfalls

- **Returning \`dp[dp.length - 1]\` instead of the maximum.** The LIS need not end at the last element: for [1, 2, 0] the last \`dp\` is 1, the answer is 2.
- **\`Math.max(...dp)\` on big or empty arrays.** On an empty array it returns \`-Infinity\`, and spreading a million elements threw \`RangeError: Maximum call stack size exceeded\` in our Node run. Track the maximum in the loop instead.
- **\`<\` vs \`<=\` in the binary search.** One character switches between strict and non-decreasing: [7, 7, 7, 7] gives 1 or 4.
- **Returning \`tails\` as the subsequence.** It is only a list of smallest endings; for [3, 4, 1] it is [1, 4], which is not a subsequence.
- **Sorting numbers with plain \`.sort()\`** in variants such as Russian-doll envelopes. Without a comparator it sorts as strings: \`[10, 9, 2, 101, 18].sort()\` gives 10, 101, 18, 2, 9. Pass \`(a, b) => a - b\`.
- **Confusing subsequence with subarray.** A contiguous "longest increasing run" is a simple O(n) scan, not this problem.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. First version:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i]</code> is the LIS length ending at i: 1 plus the best <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[j]</code> with j before i and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[j] &lt; nums[i]</code>. Answer: the maximum of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp</code>. O(n²).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The better idea:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails[k]</code> is the smallest tail of any increasing run of length k + 1. Smaller tails are never worse, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails</code> stays sorted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The update:</strong> <span style="color:#f0e2c8;">For each x, binary-search the first tail ≥ x; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails[k] = x</code> (appends when k is the length). The answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails.length</code>. O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The trap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails</code> is not an LIS. Store a parent index per element and walk back to rebuild a real one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lowerBound</code> yourself (no built-in bisect), switch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> for non-decreasing, and avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max(...arr)</code> on large arrays.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does replacing a tail never lose the answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The length of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails</code> only grows, so the best length found is kept. Replacing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails[k]</code> by a smaller x only lowers the bar for future numbers; any number that could extend the old tail can also extend x.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the actual subsequence in O(n log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tailIdx[k]</code>, the index ending the best run of length k + 1, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[i] = tailIdx[k - 1]</code> when placing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code>. Walk parents from the last slot and reverse.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for non-decreasing sequences?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Search for the first tail <strong style="color:#ffca28;">greater</strong> than x, so equal values extend rather than replace. In our run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[7, 7, 7, 7]</code> went from 1 to 4 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[3, 1, 2, 2, 2, 5, 4]</code> from 3 to 5.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you solve Russian-doll envelopes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort by width ascending and, for equal widths, height <strong style="color:#ffca28;">descending</strong> — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a[0] - b[0] || b[1] - a[1]</code> — then run LIS on the heights. The descending tie-break stops two envelopes of the same width from both being counted.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you count how many LIS exist?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Back to O(n²): keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length[i]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count[i]</code>; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[j] + 1</code> beats <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length[i]</code>, copy <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count[j]</code>, when it ties, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count[j]</code>. Sum <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count[i]</code> over all i with the maximum length.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subsequence** | Elements kept in order after deleting some; gaps allowed |
| **Longest increasing subsequence (LIS)** | The longest subsequence whose elements strictly increase |
| **State "ending at i"** | \`dp[i]\` = best answer for subsequences that end exactly at index i |
| **Patience sorting** | Dealing numbers onto piles; the pile count is the LIS length and the pile tops are \`tails\` |
| **Lower bound** | First position in a sorted array with value ≥ x (upper bound: > x) |
| **Parent pointer** | For each element, the index of the element before it in its best run; used to rebuild the LIS |

---
**Conclusion:** The longest increasing subsequence has two standard answers. The O(n²) DP asks for the best run ending at each index and takes the maximum; the O(n log n) method keeps \`tails\`, the smallest possible ending for every length, which stays sorted, so each new number is placed with one binary search. In JavaScript you write that \`lowerBound\` yourself — a dozen lines — and assigning at \`tails.length\` appends for free; add parent pointers when the subsequence itself is needed, because \`tails\` is only good for the length. Our runs measured the difference: 1,999,000 comparisons against 11,353 binary-search steps for 2,000 numbers, with the same answer.`,
        examples: [
          {
            label: `LIS by O(n^2) DP and by the O(n log n) tails array, with the subsequence rebuilt`,
            code: `// O(n^2): dp[i] = length of the longest increasing subsequence ending at i
function lisQuadratic(nums) {
  const n = nums.length;
  if (n === 0) return [];
  const dp = new Array(n).fill(1), prev = new Array(n).fill(-1);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < i; j++)
      if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; prev[i] = j; }
  let end = 0;
  for (let k = 1; k < n; k++) if (dp[k] > dp[end]) end = k;   // first index with the largest dp
  const out = [];
  for (let i = end; i !== -1; i = prev[i]) out.push(nums[i]);
  return out.reverse();
}

// first index in tails[0..len) whose value is >= x (JS has no built-in bisect)
function lowerBound(tails, x) {
  let lo = 0, hi = tails.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (tails[mid] < x) lo = mid + 1; else hi = mid;
  }
  return lo;
}

// O(n log n): tails[k] = smallest tail of an increasing subsequence of length k + 1
function lisPatience(nums, trace) {
  const tails = [], tailIdx = [], parent = new Array(nums.length).fill(-1);
  nums.forEach((x, i) => {
    const k = lowerBound(tails, x);
    tails[k] = x;              // k === tails.length appends
    tailIdx[k] = i;
    parent[i] = k > 0 ? tailIdx[k - 1] : -1;
    if (trace) console.log(x + " -> " + fmt(tails));
  });
  const out = [];
  for (let i = tailIdx.length ? tailIdx[tailIdx.length - 1] : -1; i !== -1; i = parent[i]) out.push(nums[i]);
  return [out.reverse(), tails];
}

function fmt(xs) { return "[" + xs.join(", ") + "]"; }

const demo = [10, 9, 2, 5, 3, 7, 101, 18];
console.log("tails after each number of " + fmt(demo) + ":");
lisPatience(demo, true);

for (const nums of [demo, [0, 1, 0, 3, 2, 3], [7, 7, 7, 7], [], [5], [1, 2, 3, 4, 5], [5, 4, 3, 2, 1]]) {
  const a = lisQuadratic(nums);
  const [b] = lisPatience(nums, false);
  console.log(fmt(nums) + ": n^2 length " + a.length + " -> " + fmt(a) +
              "; n log n length " + b.length + " -> " + fmt(b));
}

const [seq, tails] = lisPatience([3, 4, 1], false);
console.log("tails for [3, 4, 1] = " + fmt(tails) + ", but the rebuilt LIS is " + fmt(seq));`,
          },
          {
            label: `Comparisons vs binary-search steps, strict vs non-decreasing`,
            code: `function lisQuadraticCount(nums) {
  const dp = new Array(nums.length).fill(1);
  let comps = 0;
  for (let i = 0; i < nums.length; i++)
    for (let j = 0; j < i; j++) {
      comps++;
      if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) dp[i] = dp[j] + 1;
    }
  return [dp.length ? Math.max(...dp) : 0, comps];
}

// Hand-written binary search so every language counts the same steps.
function lisTailsCount(nums, strict) {
  const tails = [];
  let steps = 0;
  for (const x of nums) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {               // strict: first tail >= x; non-strict: first tail > x
      steps++;
      const mid = (lo + hi) >>> 1;
      if (tails[mid] < x || (!strict && tails[mid] === x)) lo = mid + 1; else hi = mid;
    }
    tails[lo] = x;
  }
  return [tails.length, steps];
}

let seed = 2024;
function nxt() { seed = (seed * 48271) % 2147483647; return seed; }

for (const n of [500, 2000, 8000]) {
  const nums = [];
  for (let k = 0; k < n; k++) nums.push(nxt() % 10000);
  const [l2, c2] = lisTailsCount(nums, true);
  let left;
  if (n <= 2000) {
    const [l1, c1] = lisQuadraticCount(nums);
    left = "n^2 length " + l1 + " with " + c1 + " comparisons";
  } else {
    left = "n^2 not run (would need " + (n * (n - 1)) / 2 + " comparisons)";
  }
  console.log("n=" + n + ": " + left + "; tails length " + l2 + " with " + c2 + " search steps");
}

for (const nums of [[7, 7, 7, 7], [1, 3, 3, 2, 2, 4], [3, 1, 2, 2, 2, 5, 4]]) {
  const [s] = lisTailsCount(nums, true);
  const [ns] = lisTailsCount(nums, false);
  console.log("[" + nums.join(", ") + "]: strictly increasing " + s + ", non-decreasing " + ns);
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an array of integers, return the length of its longest strictly increasing subsequence. Start with whatever works, then make it faster, and tell me how you would return the subsequence itself. Please code it in Java."

**What a strong answer should cover:**
- The O(n²) DP: \`dp[i]\` = LIS length ending at i, \`dp[i] = 1 + max(dp[j])\` over earlier smaller \`nums[j]\`, answer = \`max(dp)\` (not \`dp[-1]\`).
- The O(n log n) idea: \`tails[k]\` = smallest possible tail of an increasing subsequence of length k + 1; \`tails\` stays sorted, so each number is placed with one binary search.
- That \`tails\` is not itself an LIS, and how parent pointers rebuild a real one.
- Strict vs non-decreasing: first tail ≥ x vs first tail > x.
- Java details: \`Arrays.binarySearch\` returning \`-(insertion point) - 1\` and giving no guarantee among duplicates, \`(lo + hi) >>> 1\` against \`int\` overflow, and \`int[]\` plus a length instead of \`ArrayList<Integer>\`.

**Clarifying questions expected:**
- Strictly increasing or non-decreasing?
- Length only, or the subsequence too?
- How large can n be?

**Code / implementation expected:** Yes — the O(n log n) tails solution with \`Arrays.binarySearch\` or a hand-written lower bound in Java; the O(n²) DP is a good first step to mention or write.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, arrays and the idea of binary search.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are hiking and you write down the altitude every hour: 10, 9, 2, 5, 3, 7, 101, 18. Later a friend asks: "What is the longest climb you could describe by picking readings in order, each one higher than the last?" You may skip readings, but you may not reorder them. 2 → 5 → 7 → 101 works, and so does 2 → 3 → 7 → 18. Both have four readings, and no five-reading climb exists.

That is the **longest increasing subsequence** (LIS). It turns up whenever you want the longest "consistently improving" thread inside noisy data: stacking boxes or envelopes that must each fit inside the next, scheduling tasks that must keep an order, or measuring how "nearly sorted" a list is — n minus the LIS length is the fewest elements you must remove to leave the list sorted.

It is also the interview question where the first DP you find (O(n²)) is not the one the interviewer wants to finish with. The O(n log n) version is a beautiful trick, and explaining *why* it works is what separates a memorised answer from an understood one.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Strictly increasing, or non-decreasing (equal values allowed)? | It changes one comparison: \`<\` vs \`<=\` in the O(n²) DP, lower bound vs upper bound in the O(n log n) one. [7, 7, 7, 7] gives 1 or 4. |
| Do you need the length or the subsequence itself? | The length needs only the tails array; the subsequence needs parent pointers as well. |
| How large is n? | n = 2,000 is about 2 million comparisons for O(n²) — fine. n = 100,000 means 5 billion — use O(n log n). |
| If several LIS tie, is any one acceptable? | There are usually many; asking for "all of them" or "the lexicographically smallest" changes the problem. |
| Can the array be empty? Can values be negative or huge? | Empty gives 0. The algorithms only compare values, so their size does not matter. |

## 3. The Core Idea in Plain Words

A **subsequence** keeps some elements in their original order and may skip others. An **increasing** subsequence is one where every element is larger than the one before. We want the longest one.

📌 **Interview term: Subsequence** — the elements left after deleting zero or more elements, in their original order; gaps are allowed. A contiguous block would be a subarray.

📌 **Interview term: Longest increasing subsequence (LIS)** — the longest subsequence whose elements strictly increase. For [10, 9, 2, 5, 3, 7, 101, 18] its length is 4.

<svg class="iq-diagram" width="100%" viewBox="0 0 770 190" role="img" aria-label="The array 10 9 2 5 3 7 101 18 with one longest increasing subsequence highlighted: 2 5 7 101">
  <rect class="d-box" x="20" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="55" y="104" text-anchor="middle">10</text>
  <text class="d-sub" x="55" y="160" text-anchor="middle">i = 0</text>
  <rect class="d-box" x="112" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="147" y="104" text-anchor="middle">9</text>
  <text class="d-sub" x="147" y="160" text-anchor="middle">i = 1</text>
  <rect class="d-box-accent" x="204" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="239" y="104" text-anchor="middle">2</text>
  <text class="d-sub" x="239" y="160" text-anchor="middle">i = 2</text>
  <rect class="d-box-accent" x="296" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="331" y="104" text-anchor="middle">5</text>
  <text class="d-sub" x="331" y="160" text-anchor="middle">i = 3</text>
  <rect class="d-box" x="388" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="423" y="104" text-anchor="middle">3</text>
  <text class="d-sub" x="423" y="160" text-anchor="middle">i = 4</text>
  <rect class="d-box-accent" x="480" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="515" y="104" text-anchor="middle">7</text>
  <text class="d-sub" x="515" y="160" text-anchor="middle">i = 5</text>
  <rect class="d-box-accent" x="572" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="607" y="104" text-anchor="middle">101</text>
  <text class="d-sub" x="607" y="160" text-anchor="middle">i = 6</text>
  <rect class="d-box" x="664" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="699" y="104" text-anchor="middle">18</text>
  <text class="d-sub" x="699" y="160" text-anchor="middle">i = 7</text>
  <path class="d-edge-accent" d="M 239 66 Q 285 32 331 66" fill="none"/>
  <path class="d-edge-accent" d="M 331 66 Q 423 26 515 66" fill="none"/>
  <path class="d-edge-accent" d="M 515 66 Q 561 32 607 66" fill="none"/>
</svg>

The highlighted boxes are one LIS, 2 → 5 → 7 → 101. Notice how the arcs jump over 3 and over 18: skipping is allowed.

### Idea A — the O(n²) DP: "the best run that ends here"

Ask a small question about every position i: **what is the longest increasing subsequence that ends exactly at \`nums[i]\`?** Call it \`dp[i]\`.

- Any such subsequence is either \`nums[i]\` alone (length 1), or some shorter increasing subsequence ending at an earlier \`nums[j] < nums[i]\`, with \`nums[i]\` appended.
- So \`dp[i] = 1 + max(dp[j] for j < i with nums[j] < nums[i])\`, or 1 if there is no such j.
- The answer is the **largest** \`dp[i]\` anywhere — not \`dp[n-1]\`, because the LIS need not end at the last element.

Remember which j gave the best value (\`prev[i] = j\`) and you can follow those pointers back from the best end to rebuild the subsequence. For each i we look at every earlier j, so this costs about n²/2 comparisons.

📌 **Interview term: State "ending at i"** — a DP state that fixes where the subsequence ends. It makes the transition easy (only look left), at the cost of taking the maximum over all states at the end.

### Idea B — the O(n log n) tails array: "keep every ending as small as possible"

Now a different, cleverer question: **for each length k, what is the smallest number that can end an increasing subsequence of length k?** Keep those numbers in an array \`tails\`, where \`tails[k]\` is the smallest tail of any increasing subsequence of length k + 1 seen so far.

Why the smallest? Because a smaller ending is never worse: anything that could extend a subsequence ending in 5 can also extend one ending in 3.

Two facts make this fast:

1. **\`tails\` is always sorted (strictly increasing).** A length-(k+1) run contains a length-k run ending in a smaller number, so the best length-k tail is smaller than the best length-(k+1) tail.
2. **Each new number x changes exactly one slot.** Find the first tail that is **≥ x**. If there is none, x extends the longest run: append it. Otherwise x is a smaller ending for that length: overwrite that slot.

Because \`tails\` is sorted, "find the first tail ≥ x" is a [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) — O(log n). n numbers, O(log n) each: O(n log n). The LIS length is simply \`len(tails)\` at the end.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 210" role="img" aria-label="Tails holds 2 and 5. The next number 3 goes to slot 1, the first tail that is not smaller, so tails becomes 2 and 3">
  <defs>
    <marker id="b29q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="104" y="40" text-anchor="middle">tails before</text>
  <rect class="d-box" x="30" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="62" y="104" text-anchor="middle">2</text>
  <rect class="d-box" x="114" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="146" y="104" text-anchor="middle">5</text>
  <path class="d-edge" d="M 186 98 L 282 98" marker-end="url(#b29q2-arrow)"/>
  <text class="d-sub" x="328" y="40" text-anchor="middle">next number</text>
  <rect class="d-box-accent" x="296" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="328" y="104" text-anchor="middle">3</text>
  <path class="d-edge" d="M 368 98 L 464 98" marker-end="url(#b29q2-arrow)"/>
  <text class="d-sub" x="560" y="40" text-anchor="middle">tails after</text>
  <rect class="d-box" x="478" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="510" y="104" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="562" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="594" y="104" text-anchor="middle">3</text>
  <text class="d-sub" x="328" y="170" text-anchor="middle">first tail not smaller: slot 1</text>
  <text class="d-sub" x="560" y="170" text-anchor="middle">5 replaced by 3</text>
</svg>

When 3 arrives, tails is [2, 5]. The first tail not smaller than 3 is 5, in slot 1, so 3 replaces it: we now know a length-2 run can end as low as 3 (namely 2, 3). Later, 7 extends it to [2, 3, 7], then 101 to [2, 3, 7, 101], and 18 replaces 101.

📌 **Interview term: Patience sorting** — the card-game picture behind Idea B: deal cards onto piles, always on the leftmost pile whose top card is not smaller, else start a new pile. The number of piles equals the LIS length, and the pile tops are the \`tails\` array.

📌 **Interview term: Lower bound** — the first position in a sorted array whose value is ≥ x (the insertion point that keeps the array sorted, to the left of equal values). Upper bound is the first position whose value is > x.

**A trap: \`tails\` is not the LIS.** For [3, 4, 1], tails ends as [1, 4] — but 1 comes *after* 4 in the input, so [1, 4] is not a subsequence at all. Only its **length** is meaningful. To rebuild a real LIS, store for each element the index of the element that sat in the slot to its left when it was placed (a parent pointer), and walk back from the last slot. Example 1 does exactly that and prints [3, 4].

## 4. Brute Force → DP → Binary Search

- **Brute force:** try all 2^n subsequences and keep the longest increasing one. n = 30 is already a billion subsets.
- **O(n²) DP (Idea A):** each element looks back at every earlier element once. Simple, and it is a fine first answer to say out loud. This is classic [dynamic programming](/interview-question/what-is-dynamic-programming): the answer for i is built from answers for smaller indices.
- **O(n log n) tails (Idea B):** each element does one binary search in a sorted array. On 2,000 random numbers, example 2 counts **1,999,000** comparisons for the DP and **11,353** binary-search steps for tails.

## 5. The Code in Java

Both versions, each returning one actual LIS (not just its length). The tails version uses \`Arrays.binarySearch\` on the filled prefix of an \`int[]\`:

~~~java
    // O(n^2): dp[i] = length of the longest increasing subsequence ending at i
    static List<Integer> lisQuadratic(int[] nums) {
        int n = nums.length;
        List<Integer> out = new ArrayList<>();
        if (n == 0) return out;
        int[] dp = new int[n], prev = new int[n];
        Arrays.fill(dp, 1);
        Arrays.fill(prev, -1);
        for (int i = 0; i < n; i++)
            for (int j = 0; j < i; j++)
                if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; prev[i] = j; }
        int end = 0;
        for (int k = 1; k < n; k++) if (dp[k] > dp[end]) end = k;   // first index with the largest dp
        for (int i = end; i != -1; i = prev[i]) out.add(nums[i]);
        Collections.reverse(out);
        return out;
    }

    // O(n log n): tails[k] = smallest tail of an increasing subsequence of length k + 1
    static int[] lastTails;
    static List<Integer> lisPatience(int[] nums, boolean trace) {
        int[] tails = new int[nums.length], tailIdx = new int[nums.length], parent = new int[nums.length];
        int len = 0;
        for (int i = 0; i < nums.length; i++) {
            int x = nums[i];
            // binarySearch on tails[0..len): found -> index, missing -> -(insertion point) - 1
            int k = Arrays.binarySearch(tails, 0, len, x);
            if (k < 0) k = -k - 1;      // tails is strictly increasing, so a hit is unique
            tails[k] = x;
            tailIdx[k] = i;
            parent[i] = k > 0 ? tailIdx[k - 1] : -1;
            if (k == len) len++;
            if (trace) System.out.println(x + " -> " + fmt(Arrays.copyOf(tails, len)));
        }
        lastTails = Arrays.copyOf(tails, len);
        List<Integer> out = new ArrayList<>();
        for (int i = len > 0 ? tailIdx[len - 1] : -1; i != -1; i = parent[i]) out.add(nums[i]);
        Collections.reverse(out);
        return out;
    }
~~~

**What to point out in this code:**

- \`Arrays.binarySearch(tails, 0, len, x)\` searches only \`tails[0..len)\`. If x is found it returns its index; if not, it returns **\`-(insertion point) - 1\`**, where the insertion point is the first element greater than x ([Javadoc: Arrays.binarySearch](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Arrays.html#binarySearch(int%5B%5D,int,int,int))). So \`k < 0 ? -k - 1 : k\` is the lower bound. We checked on \`{2, 3, 7}\`: searching 5 returned -3 (insertion point 2), searching 3 returned 1.
- That shortcut is safe **only because \`tails\` is strictly increasing**. The Javadoc says that with duplicate values there is no guarantee which equal element is found, so it cannot serve as a lower or upper bound for the non-decreasing variant — write your own search there (example 2 does).
- \`tails\` is a fixed \`int[nums.length]\` plus a length counter \`len\`, which avoids the boxing of an \`ArrayList<Integer>\`.
- \`tailIdx[k]\` remembers which index currently ends the best run of length k + 1, and \`parent[i] = tailIdx[k - 1]\` links x to the run it extended. Walking \`parent\` from \`tailIdx[len - 1]\` and calling \`Collections.reverse\` gives a real LIS.
- In \`lisQuadratic\`, the strict \`dp[k] > dp[end]\` keeps the *first* index with the largest value, the same choice the other three languages make.

📌 **Interview term: Parent pointer** — for each element, the index of the element just before it in the best run that ends there. Following parents from the best end, then reversing, rebuilds the subsequence.

**Just the length**, which is what most interviewers ask for first:

~~~java
static int lengthOfLIS(int[] nums) {
    int[] tails = new int[nums.length];
    int len = 0;
    for (int x : nums) {
        int k = Arrays.binarySearch(tails, 0, len, x);
        if (k < 0) k = -k - 1;          // insertion point
        tails[k] = x;
        if (k == len) len++;
    }
    return len;
}
~~~

We ran this method on its own: it returns 4 for {10, 9, 2, 5, 3, 7, 101, 18}, 0 for {} and 2 for {1, 2, 0}.

**A note on the midpoint.** Example 2 writes its own binary search with \`(lo + hi) >>> 1\`. With plain \`(lo + hi) / 2\`, two large \`int\`s overflow: \`(2_000_000_000 + 2_100_000_000) / 2\` printed \`-97483648\` in our run, while \`>>> 1\` printed \`2050000000\`. Array indices rarely get that large, but it is the classic Java binary-search bug.

## 6. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the tails array step by step, then both algorithms on seven inputs** prints:

~~~text
tails after each number of [10, 9, 2, 5, 3, 7, 101, 18]:
10 -> [10]
9 -> [9]
2 -> [2]
5 -> [2, 5]
3 -> [2, 3]
7 -> [2, 3, 7]
101 -> [2, 3, 7, 101]
18 -> [2, 3, 7, 18]
[10, 9, 2, 5, 3, 7, 101, 18]: n^2 length 4 -> [2, 5, 7, 101]; n log n length 4 -> [2, 3, 7, 18]
[0, 1, 0, 3, 2, 3]: n^2 length 4 -> [0, 1, 2, 3]; n log n length 4 -> [0, 1, 2, 3]
[7, 7, 7, 7]: n^2 length 1 -> [7]; n log n length 1 -> [7]
[]: n^2 length 0 -> []; n log n length 0 -> []
[5]: n^2 length 1 -> [5]; n log n length 1 -> [5]
[1, 2, 3, 4, 5]: n^2 length 5 -> [1, 2, 3, 4, 5]; n log n length 5 -> [1, 2, 3, 4, 5]
[5, 4, 3, 2, 1]: n^2 length 1 -> [5]; n log n length 1 -> [1]
tails for [3, 4, 1] = [1, 4], but the rebuilt LIS is [3, 4]
~~~

Read it against section 3: 3 replaces 5, 18 replaces 101, and the final \`tails\` [2, 3, 7, 18] happens to be an LIS here. The last line shows it is not one in general: for [3, 4, 1] tails is [1, 4], while the parent pointers rebuild the real LIS [3, 4]. On [5, 4, 3, 2, 1] the two versions return different single elements; both are valid.

**Example 2 — counting the work, and strict vs non-decreasing** prints:

~~~text
n=500: n^2 length 41 with 124750 comparisons; tails length 41 with 2299 search steps
n=2000: n^2 length 84 with 1999000 comparisons; tails length 84 with 11353 search steps
n=8000: n^2 not run (would need 31996000 comparisons); tails length 165 with 53546 search steps
[7, 7, 7, 7]: strictly increasing 1, non-decreasing 4
[1, 3, 3, 2, 2, 4]: strictly increasing 3, non-decreasing 4
[3, 1, 2, 2, 2, 5, 4]: strictly increasing 3, non-decreasing 5
~~~

- The O(n²) DP makes exactly n(n−1)/2 comparisons: 124,750 for n = 500 and 1,999,000 for n = 2,000. The tails method needs 2,299 and 11,353 binary-search steps and agrees on the length (41 and 84).
- For n = 8,000 the DP would need almost 32 million comparisons, so the program does not run it; tails needs 53,546 steps.
- Switching the search from "first tail ≥ x" to "first tail > x" turns the strict LIS into the non-decreasing one: [7, 7, 7, 7] goes from 1 to 4.

## 7. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(2^n · n) | O(n) | every subset, each checked in O(n) |
| \`dp[i]\` ending at i | O(n²) | O(n) | each i scans all j < i |
| \`tails\` + \`Arrays.binarySearch\` | O(n log n) | O(n) | one binary search per element; \`tails\` never exceeds n |
| Rebuild with parents | O(n) extra | O(n) | one parent per element, one walk back |

The JIT makes each O(n²) step cheap, but the number of steps is what grows: 5 billion comparisons at n = 100,000 is too slow in any language. The comparison counter in example 2 is a \`long\` because n(n−1)/2 passes \`Integer.MAX_VALUE\` once n is about 65,500.

## 8. Edge Cases

- **Empty array.** The LIS length is 0 and the subsequence is [] (both versions guard for it).
- **One element.** Length 1.
- **Already sorted.** The LIS is the whole array; in the tails version every number is appended ([1, 2, 3, 4, 5] gives 5).
- **Strictly decreasing.** Length 1. The two versions can return *different* one-element answers — the O(n²) DP keeps the first maximum ([5]) while the tails version keeps the last placed number ([1]); both are correct.
- **All equal.** [7, 7, 7, 7] has a strictly increasing LIS of 1 but a non-decreasing one of 4 — ask which one is wanted.
- **Ties between different LIS.** [10, 9, 2, 5, 3, 7, 101, 18] has several of length 4; the two versions print [2, 5, 7, 101] and [2, 3, 7, 18]. Say "one LIS", not "the LIS".

## Common Pitfalls

- **Returning \`dp[n - 1]\` instead of the maximum.** The LIS need not end at the last element: for {1, 2, 0} the last \`dp\` is 1, the answer is 2.
- **Using \`Arrays.binarySearch\` with duplicates.** Fine for the strictly increasing \`tails\`; for the non-decreasing variant the returned index among equal values is unspecified, so write your own upper bound.
- **Forgetting to decode the negative result.** \`binarySearch\` returns \`-(insertion point) - 1\` when x is absent; using it as an index throws \`ArrayIndexOutOfBoundsException\`.
- **\`(lo + hi) / 2\` overflow** in a hand-written search; use \`(lo + hi) >>> 1\` or \`lo + (hi - lo) / 2\`.
- **Returning \`tails\` as the subsequence.** It is only a list of smallest endings; for {3, 4, 1} it is [1, 4], which is not a subsequence.
- **\`int\` counters for quadratic work.** n(n−1)/2 overflows \`int\` around n = 65,500; count in \`long\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. First version:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i]</code> is the LIS length ending at i: 1 plus the best <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[j]</code> with j before i and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[j] &lt; nums[i]</code>. Answer: the maximum of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp</code>. O(n²).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The better idea:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails[k]</code> is the smallest tail of any increasing run of length k + 1. Smaller tails are never worse, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails</code> stays sorted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The update:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k = Arrays.binarySearch(tails, 0, len, x)</code>, decode <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-k - 1</code> if negative, write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails[k] = x</code>, and grow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len</code> when k equals it. The answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len</code>. O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The trap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails</code> is not an LIS. Store a parent index per element and walk back to rebuild a real one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">binarySearch</code> is a valid lower bound only because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails</code> has no duplicates; for non-decreasing, write your own search with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(lo + hi) &gt;&gt;&gt; 1</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does replacing a tail never lose the answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The length of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails</code> only grows, so the best length found is kept. Replacing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails[k]</code> by a smaller x only lowers the bar for future numbers; any number that could extend the old tail can also extend x.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the actual subsequence in O(n log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tailIdx[k]</code>, the index ending the best run of length k + 1, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[i] = tailIdx[k - 1]</code> when placing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code>. Walk parents from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tailIdx[len - 1]</code> and reverse.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for non-decreasing sequences?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Search for the first tail <strong style="color:#ffca28;">greater</strong> than x, so equal values extend rather than replace. In our run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{7, 7, 7, 7}</code> went from 1 to 4 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{3, 1, 2, 2, 2, 5, 4}</code> from 3 to 5.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you solve Russian-doll envelopes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort by width ascending and, for equal widths, height <strong style="color:#ffca28;">descending</strong> — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort(env, (a, b) -&gt; a[0] != b[0] ? Integer.compare(a[0], b[0]) : Integer.compare(b[1], a[1]))</code> — then run LIS on the heights.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you count how many LIS exist?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Back to O(n²): keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length[i]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count[i]</code>; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[j] + 1</code> beats <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length[i]</code>, copy <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count[j]</code>, when it ties, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count[j]</code>. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> counts, since they can grow exponentially.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subsequence** | Elements kept in order after deleting some; gaps allowed |
| **Longest increasing subsequence (LIS)** | The longest subsequence whose elements strictly increase |
| **State "ending at i"** | \`dp[i]\` = best answer for subsequences that end exactly at index i |
| **Patience sorting** | Dealing numbers onto piles; the pile count is the LIS length and the pile tops are \`tails\` |
| **Lower bound** | First position in a sorted array with value ≥ x (upper bound: > x) |
| **Parent pointer** | For each element, the index of the element before it in its best run; used to rebuild the LIS |

---
**Conclusion:** The longest increasing subsequence has two standard answers. The O(n²) DP asks for the best run ending at each index and takes the maximum; the O(n log n) method keeps \`tails\`, the smallest possible ending for every length, which stays sorted, so each new number is placed with one binary search. In Java that search can be \`Arrays.binarySearch\` on the filled prefix, decoding its negative insertion point — safe because \`tails\` never holds duplicates. Add parent pointers when the subsequence itself is needed. Our runs measured the difference: 1,999,000 comparisons against 11,353 binary-search steps for 2,000 numbers, with the same answer.`,
        examples: [
          {
            label: `LIS by O(n^2) DP and by the O(n log n) tails array, with the subsequence rebuilt`,
            code: `import java.util.*;

public class Main {
    // O(n^2): dp[i] = length of the longest increasing subsequence ending at i
    static List<Integer> lisQuadratic(int[] nums) {
        int n = nums.length;
        List<Integer> out = new ArrayList<>();
        if (n == 0) return out;
        int[] dp = new int[n], prev = new int[n];
        Arrays.fill(dp, 1);
        Arrays.fill(prev, -1);
        for (int i = 0; i < n; i++)
            for (int j = 0; j < i; j++)
                if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; prev[i] = j; }
        int end = 0;
        for (int k = 1; k < n; k++) if (dp[k] > dp[end]) end = k;   // first index with the largest dp
        for (int i = end; i != -1; i = prev[i]) out.add(nums[i]);
        Collections.reverse(out);
        return out;
    }

    // O(n log n): tails[k] = smallest tail of an increasing subsequence of length k + 1
    static int[] lastTails;
    static List<Integer> lisPatience(int[] nums, boolean trace) {
        int[] tails = new int[nums.length], tailIdx = new int[nums.length], parent = new int[nums.length];
        int len = 0;
        for (int i = 0; i < nums.length; i++) {
            int x = nums[i];
            // binarySearch on tails[0..len): found -> index, missing -> -(insertion point) - 1
            int k = Arrays.binarySearch(tails, 0, len, x);
            if (k < 0) k = -k - 1;      // tails is strictly increasing, so a hit is unique
            tails[k] = x;
            tailIdx[k] = i;
            parent[i] = k > 0 ? tailIdx[k - 1] : -1;
            if (k == len) len++;
            if (trace) System.out.println(x + " -> " + fmt(Arrays.copyOf(tails, len)));
        }
        lastTails = Arrays.copyOf(tails, len);
        List<Integer> out = new ArrayList<>();
        for (int i = len > 0 ? tailIdx[len - 1] : -1; i != -1; i = parent[i]) out.add(nums[i]);
        Collections.reverse(out);
        return out;
    }

    static String fmt(int[] xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int k = 0; k < xs.length; k++) { if (k > 0) sb.append(", "); sb.append(xs[k]); }
        return sb.append("]").toString();
    }
    static String fmt(List<Integer> xs) {   // List.toString would also print [a, b], but stay explicit
        return fmt(xs.stream().mapToInt(Integer::intValue).toArray());
    }

    public static void main(String[] args) {
        int[] demo = {10, 9, 2, 5, 3, 7, 101, 18};
        System.out.println("tails after each number of " + fmt(demo) + ":");
        lisPatience(demo, true);

        int[][] cases = {demo, {0, 1, 0, 3, 2, 3}, {7, 7, 7, 7}, {}, {5}, {1, 2, 3, 4, 5}, {5, 4, 3, 2, 1}};
        for (int[] nums : cases) {
            List<Integer> a = lisQuadratic(nums), b = lisPatience(nums, false);
            System.out.println(fmt(nums) + ": n^2 length " + a.size() + " -> " + fmt(a)
                    + "; n log n length " + b.size() + " -> " + fmt(b));
        }
        List<Integer> seq = lisPatience(new int[]{3, 4, 1}, false);
        System.out.println("tails for [3, 4, 1] = " + fmt(lastTails) + ", but the rebuilt LIS is " + fmt(seq));
    }
}`,
          },
          {
            label: `Comparisons vs binary-search steps, strict vs non-decreasing`,
            code: `public class Main {
    static long comps;
    static int lisQuadraticCount(int[] nums) {
        int[] dp = new int[nums.length];
        int best = 0;
        comps = 0;
        for (int i = 0; i < nums.length; i++) {
            dp[i] = 1;
            for (int j = 0; j < i; j++) {
                comps++;
                if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) dp[i] = dp[j] + 1;
            }
            best = Math.max(best, dp[i]);
        }
        return best;
    }

    // Hand-written binary search so every language counts the same steps.
    static long steps;
    static int lisTailsCount(int[] nums, boolean strict) {
        int[] tails = new int[nums.length];
        int len = 0;
        steps = 0;
        for (int x : nums) {
            int lo = 0, hi = len;
            while (lo < hi) {           // strict: first tail >= x; non-strict: first tail > x
                steps++;
                int mid = (lo + hi) >>> 1;
                if (tails[mid] < x || (!strict && tails[mid] == x)) lo = mid + 1; else hi = mid;
            }
            tails[lo] = x;
            if (lo == len) len++;
        }
        return len;
    }

    static long seed = 2024;
    static long nxt() { seed = seed * 48271 % 2147483647L; return seed; }

    public static void main(String[] args) {
        for (int n : new int[]{500, 2000, 8000}) {
            int[] nums = new int[n];
            for (int k = 0; k < n; k++) nums[k] = (int) (nxt() % 10000);
            int l2 = lisTailsCount(nums, true);
            String left;
            if (n <= 2000) {
                int l1 = lisQuadraticCount(nums);
                left = "n^2 length " + l1 + " with " + comps + " comparisons";
            } else {
                left = "n^2 not run (would need " + (long) n * (n - 1) / 2 + " comparisons)";
            }
            System.out.println("n=" + n + ": " + left + "; tails length " + l2 + " with " + steps + " search steps");
        }
        int[][] cases = {{7, 7, 7, 7}, {1, 3, 3, 2, 2, 4}, {3, 1, 2, 2, 2, 5, 4}};
        for (int[] nums : cases) {
            StringBuilder sb = new StringBuilder("[");
            for (int k = 0; k < nums.length; k++) { if (k > 0) sb.append(", "); sb.append(nums[k]); }
            System.out.println(sb + "]: strictly increasing " + lisTailsCount(nums, true)
                    + ", non-decreasing " + lisTailsCount(nums, false));
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given an array of integers, return the length of its longest strictly increasing subsequence. Start with whatever works, then make it faster, and tell me how you would return the subsequence itself. Please code it in C++."

**What a strong answer should cover:**
- The O(n²) DP: \`dp[i]\` = LIS length ending at i, \`dp[i] = 1 + max(dp[j])\` over earlier smaller \`nums[j]\`, answer = \`max(dp)\` (not \`dp[-1]\`).
- The O(n log n) idea: \`tails[k]\` = smallest possible tail of an increasing subsequence of length k + 1; \`tails\` stays sorted, so each number is placed with one binary search.
- That \`tails\` is not itself an LIS, and how parent pointers rebuild a real one.
- Strict vs non-decreasing: \`std::lower_bound\` vs \`std::upper_bound\`.
- C++ details: iterator-to-index conversion, iterator invalidation after \`push_back\`, \`max_element\` on an empty vector, and \`long long\` for quadratic counters.

**Clarifying questions expected:**
- Strictly increasing or non-decreasing?
- Length only, or the subsequence too?
- How large can n be?

**Code / implementation expected:** Yes — the O(n log n) tails solution with \`std::lower_bound\` in C++; the O(n²) DP is a good first step to mention or write.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, \`std::vector\` and the idea of binary search.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are hiking and you write down the altitude every hour: 10, 9, 2, 5, 3, 7, 101, 18. Later a friend asks: "What is the longest climb you could describe by picking readings in order, each one higher than the last?" You may skip readings, but you may not reorder them. 2 → 5 → 7 → 101 works, and so does 2 → 3 → 7 → 18. Both have four readings, and no five-reading climb exists.

That is the **longest increasing subsequence** (LIS). It turns up whenever you want the longest "consistently improving" thread inside noisy data: stacking boxes or envelopes that must each fit inside the next, scheduling tasks that must keep an order, or measuring how "nearly sorted" a list is — n minus the LIS length is the fewest elements you must remove to leave the list sorted.

It is also the interview question where the first DP you find (O(n²)) is not the one the interviewer wants to finish with. The O(n log n) version is a beautiful trick, and explaining *why* it works is what separates a memorised answer from an understood one.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Strictly increasing, or non-decreasing (equal values allowed)? | It changes one comparison: \`<\` vs \`<=\` in the O(n²) DP, lower bound vs upper bound in the O(n log n) one. [7, 7, 7, 7] gives 1 or 4. |
| Do you need the length or the subsequence itself? | The length needs only the tails array; the subsequence needs parent pointers as well. |
| How large is n? | n = 2,000 is about 2 million comparisons for O(n²) — fine. n = 100,000 means 5 billion — use O(n log n). |
| If several LIS tie, is any one acceptable? | There are usually many; asking for "all of them" or "the lexicographically smallest" changes the problem. |
| Can the array be empty? Can values be negative or huge? | Empty gives 0. The algorithms only compare values, so their size does not matter. |

## 3. The Core Idea in Plain Words

A **subsequence** keeps some elements in their original order and may skip others. An **increasing** subsequence is one where every element is larger than the one before. We want the longest one.

📌 **Interview term: Subsequence** — the elements left after deleting zero or more elements, in their original order; gaps are allowed. A contiguous block would be a subarray.

📌 **Interview term: Longest increasing subsequence (LIS)** — the longest subsequence whose elements strictly increase. For [10, 9, 2, 5, 3, 7, 101, 18] its length is 4.

<svg class="iq-diagram" width="100%" viewBox="0 0 770 190" role="img" aria-label="The array 10 9 2 5 3 7 101 18 with one longest increasing subsequence highlighted: 2 5 7 101">
  <rect class="d-box" x="20" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="55" y="104" text-anchor="middle">10</text>
  <text class="d-sub" x="55" y="160" text-anchor="middle">i = 0</text>
  <rect class="d-box" x="112" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="147" y="104" text-anchor="middle">9</text>
  <text class="d-sub" x="147" y="160" text-anchor="middle">i = 1</text>
  <rect class="d-box-accent" x="204" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="239" y="104" text-anchor="middle">2</text>
  <text class="d-sub" x="239" y="160" text-anchor="middle">i = 2</text>
  <rect class="d-box-accent" x="296" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="331" y="104" text-anchor="middle">5</text>
  <text class="d-sub" x="331" y="160" text-anchor="middle">i = 3</text>
  <rect class="d-box" x="388" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="423" y="104" text-anchor="middle">3</text>
  <text class="d-sub" x="423" y="160" text-anchor="middle">i = 4</text>
  <rect class="d-box-accent" x="480" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="515" y="104" text-anchor="middle">7</text>
  <text class="d-sub" x="515" y="160" text-anchor="middle">i = 5</text>
  <rect class="d-box-accent" x="572" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="607" y="104" text-anchor="middle">101</text>
  <text class="d-sub" x="607" y="160" text-anchor="middle">i = 6</text>
  <rect class="d-box" x="664" y="70" width="70" height="56" rx="8"/>
  <text class="d-text" x="699" y="104" text-anchor="middle">18</text>
  <text class="d-sub" x="699" y="160" text-anchor="middle">i = 7</text>
  <path class="d-edge-accent" d="M 239 66 Q 285 32 331 66" fill="none"/>
  <path class="d-edge-accent" d="M 331 66 Q 423 26 515 66" fill="none"/>
  <path class="d-edge-accent" d="M 515 66 Q 561 32 607 66" fill="none"/>
</svg>

The highlighted boxes are one LIS, 2 → 5 → 7 → 101. Notice how the arcs jump over 3 and over 18: skipping is allowed.

### Idea A — the O(n²) DP: "the best run that ends here"

Ask a small question about every position i: **what is the longest increasing subsequence that ends exactly at \`nums[i]\`?** Call it \`dp[i]\`.

- Any such subsequence is either \`nums[i]\` alone (length 1), or some shorter increasing subsequence ending at an earlier \`nums[j] < nums[i]\`, with \`nums[i]\` appended.
- So \`dp[i] = 1 + max(dp[j] for j < i with nums[j] < nums[i])\`, or 1 if there is no such j.
- The answer is the **largest** \`dp[i]\` anywhere — not \`dp[n-1]\`, because the LIS need not end at the last element.

Remember which j gave the best value (\`prev[i] = j\`) and you can follow those pointers back from the best end to rebuild the subsequence. For each i we look at every earlier j, so this costs about n²/2 comparisons.

📌 **Interview term: State "ending at i"** — a DP state that fixes where the subsequence ends. It makes the transition easy (only look left), at the cost of taking the maximum over all states at the end.

### Idea B — the O(n log n) tails array: "keep every ending as small as possible"

Now a different, cleverer question: **for each length k, what is the smallest number that can end an increasing subsequence of length k?** Keep those numbers in an array \`tails\`, where \`tails[k]\` is the smallest tail of any increasing subsequence of length k + 1 seen so far.

Why the smallest? Because a smaller ending is never worse: anything that could extend a subsequence ending in 5 can also extend one ending in 3.

Two facts make this fast:

1. **\`tails\` is always sorted (strictly increasing).** A length-(k+1) run contains a length-k run ending in a smaller number, so the best length-k tail is smaller than the best length-(k+1) tail.
2. **Each new number x changes exactly one slot.** Find the first tail that is **≥ x**. If there is none, x extends the longest run: append it. Otherwise x is a smaller ending for that length: overwrite that slot.

Because \`tails\` is sorted, "find the first tail ≥ x" is a [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) — O(log n). n numbers, O(log n) each: O(n log n). The LIS length is simply \`len(tails)\` at the end.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 210" role="img" aria-label="Tails holds 2 and 5. The next number 3 goes to slot 1, the first tail that is not smaller, so tails becomes 2 and 3">
  <defs>
    <marker id="b29q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="104" y="40" text-anchor="middle">tails before</text>
  <rect class="d-box" x="30" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="62" y="104" text-anchor="middle">2</text>
  <rect class="d-box" x="114" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="146" y="104" text-anchor="middle">5</text>
  <path class="d-edge" d="M 186 98 L 282 98" marker-end="url(#b29q2-arrow)"/>
  <text class="d-sub" x="328" y="40" text-anchor="middle">next number</text>
  <rect class="d-box-accent" x="296" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="328" y="104" text-anchor="middle">3</text>
  <path class="d-edge" d="M 368 98 L 464 98" marker-end="url(#b29q2-arrow)"/>
  <text class="d-sub" x="560" y="40" text-anchor="middle">tails after</text>
  <rect class="d-box" x="478" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="510" y="104" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="562" y="70" width="64" height="56" rx="8"/>
  <text class="d-text" x="594" y="104" text-anchor="middle">3</text>
  <text class="d-sub" x="328" y="170" text-anchor="middle">first tail not smaller: slot 1</text>
  <text class="d-sub" x="560" y="170" text-anchor="middle">5 replaced by 3</text>
</svg>

When 3 arrives, tails is [2, 5]. The first tail not smaller than 3 is 5, in slot 1, so 3 replaces it: we now know a length-2 run can end as low as 3 (namely 2, 3). Later, 7 extends it to [2, 3, 7], then 101 to [2, 3, 7, 101], and 18 replaces 101.

📌 **Interview term: Patience sorting** — the card-game picture behind Idea B: deal cards onto piles, always on the leftmost pile whose top card is not smaller, else start a new pile. The number of piles equals the LIS length, and the pile tops are the \`tails\` array.

📌 **Interview term: Lower bound** — the first position in a sorted array whose value is ≥ x (the insertion point that keeps the array sorted, to the left of equal values). Upper bound is the first position whose value is > x.

**A trap: \`tails\` is not the LIS.** For [3, 4, 1], tails ends as [1, 4] — but 1 comes *after* 4 in the input, so [1, 4] is not a subsequence at all. Only its **length** is meaningful. To rebuild a real LIS, store for each element the index of the element that sat in the slot to its left when it was placed (a parent pointer), and walk back from the last slot. Example 1 does exactly that and prints [3, 4].

## 4. Brute Force → DP → Binary Search

- **Brute force:** try all 2^n subsequences and keep the longest increasing one. n = 30 is already a billion subsets.
- **O(n²) DP (Idea A):** each element looks back at every earlier element once. Simple, and it is a fine first answer to say out loud. This is classic [dynamic programming](/interview-question/what-is-dynamic-programming): the answer for i is built from answers for smaller indices.
- **O(n log n) tails (Idea B):** each element does one binary search in a sorted array. On 2,000 random numbers, example 2 counts **1,999,000** comparisons for the DP and **11,353** binary-search steps for tails.

## 5. The Code in C++

Both versions, each returning one actual LIS (not just its length). The tails version uses \`std::lower_bound\`:

~~~cpp
// O(n^2): dp[i] = length of the longest increasing subsequence ending at i
vector<int> lisQuadratic(const vector<int>& nums) {
    int n = (int)nums.size();
    if (n == 0) return {};
    vector<int> dp(n, 1), prev(n, -1);
    for (int i = 0; i < n; i++)
        for (int j = 0; j < i; j++)
            if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; prev[i] = j; }
    int end = int(max_element(dp.begin(), dp.end()) - dp.begin());   // first largest element
    vector<int> out;
    for (int i = end; i != -1; i = prev[i]) out.push_back(nums[i]);
    reverse(out.begin(), out.end());
    return out;
}

// O(n log n): tails[k] = smallest tail of an increasing subsequence of length k + 1
vector<int> lastTails;
vector<int> lisPatience(const vector<int>& nums, bool trace) {
    vector<int> tails, tailIdx, parent(nums.size(), -1);
    for (int i = 0; i < (int)nums.size(); i++) {
        int x = nums[i];
        // lower_bound: first tail >= x (use upper_bound for non-decreasing)
        int k = int(lower_bound(tails.begin(), tails.end(), x) - tails.begin());
        if (k == (int)tails.size()) { tails.push_back(x); tailIdx.push_back(i); }
        else { tails[k] = x; tailIdx[k] = i; }
        parent[i] = k > 0 ? tailIdx[k - 1] : -1;
        if (trace) cout << x << " -> " << fmt(tails) << "\\n";
    }
    lastTails = tails;
    vector<int> out;
    for (int i = tailIdx.empty() ? -1 : tailIdx.back(); i != -1; i = parent[i]) out.push_back(nums[i]);
    reverse(out.begin(), out.end());
    return out;
}
~~~

**What to point out in this code:**

- \`lower_bound(first, last, x)\` returns an iterator to the first element **not less than** x (≥ x); \`upper_bound\` returns the first element **greater than** x ([cppreference: lower_bound](https://en.cppreference.com/w/cpp/algorithm/lower_bound)). Use \`lower_bound\` for a strictly increasing LIS and \`upper_bound\` for non-decreasing. On \`{2, 3, 3, 7}\`, searching 3 gave index 1 with \`lower_bound\` and 3 with \`upper_bound\`.
- Subtracting \`tails.begin()\` turns the iterator into an index. If it equals \`tails.size()\`, x extends the longest run and we \`push_back\`; otherwise we overwrite that slot.
- \`push_back\` may reallocate and **invalidate iterators** into \`tails\`. The code converts to an index before modifying, so nothing dangles.
- \`tailIdx[k]\` remembers which index currently ends the best run of length k + 1, and \`parent[i] = tailIdx[k - 1]\` links x to the run it extended. Walking \`parent\` from \`tailIdx.back()\` and reversing gives a real LIS.
- \`max_element\` returns the *first* largest element, so \`lisQuadratic\` picks the same end as the other three languages.

📌 **Interview term: Parent pointer** — for each element, the index of the element just before it in the best run that ends there. Following parents from the best end, then reversing, rebuilds the subsequence.

**Just the length**, which is what most interviewers ask for first:

~~~cpp
int lengthOfLIS(const vector<int>& nums) {
    vector<int> tails;
    for (int x : nums) {
        auto it = lower_bound(tails.begin(), tails.end(), x);   // first tail >= x
        if (it == tails.end()) tails.push_back(x); else *it = x;
    }
    return (int)tails.size();
}
~~~

We ran this function on its own: it returns 4 for {10, 9, 2, 5, 3, 7, 101, 18}, 0 for {} and 2 for {1, 2, 0}. Here \`it\` is used before \`push_back\`, never after, so the possible reallocation is harmless.

## 6. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the tails array step by step, then both algorithms on seven inputs** prints:

~~~text
tails after each number of [10, 9, 2, 5, 3, 7, 101, 18]:
10 -> [10]
9 -> [9]
2 -> [2]
5 -> [2, 5]
3 -> [2, 3]
7 -> [2, 3, 7]
101 -> [2, 3, 7, 101]
18 -> [2, 3, 7, 18]
[10, 9, 2, 5, 3, 7, 101, 18]: n^2 length 4 -> [2, 5, 7, 101]; n log n length 4 -> [2, 3, 7, 18]
[0, 1, 0, 3, 2, 3]: n^2 length 4 -> [0, 1, 2, 3]; n log n length 4 -> [0, 1, 2, 3]
[7, 7, 7, 7]: n^2 length 1 -> [7]; n log n length 1 -> [7]
[]: n^2 length 0 -> []; n log n length 0 -> []
[5]: n^2 length 1 -> [5]; n log n length 1 -> [5]
[1, 2, 3, 4, 5]: n^2 length 5 -> [1, 2, 3, 4, 5]; n log n length 5 -> [1, 2, 3, 4, 5]
[5, 4, 3, 2, 1]: n^2 length 1 -> [5]; n log n length 1 -> [1]
tails for [3, 4, 1] = [1, 4], but the rebuilt LIS is [3, 4]
~~~

Read it against section 3: 3 replaces 5, 18 replaces 101, and the final \`tails\` [2, 3, 7, 18] happens to be an LIS here. The last line shows it is not one in general: for [3, 4, 1] tails is [1, 4], while the parent pointers rebuild the real LIS [3, 4]. On [5, 4, 3, 2, 1] the two versions return different single elements; both are valid.

**Example 2 — counting the work, and strict vs non-decreasing** prints:

~~~text
n=500: n^2 length 41 with 124750 comparisons; tails length 41 with 2299 search steps
n=2000: n^2 length 84 with 1999000 comparisons; tails length 84 with 11353 search steps
n=8000: n^2 not run (would need 31996000 comparisons); tails length 165 with 53546 search steps
[7, 7, 7, 7]: strictly increasing 1, non-decreasing 4
[1, 3, 3, 2, 2, 4]: strictly increasing 3, non-decreasing 4
[3, 1, 2, 2, 2, 5, 4]: strictly increasing 3, non-decreasing 5
~~~

- The O(n²) DP makes exactly n(n−1)/2 comparisons: 124,750 for n = 500 and 1,999,000 for n = 2,000. The tails method needs 2,299 and 11,353 binary-search steps and agrees on the length (41 and 84).
- For n = 8,000 the DP would need almost 32 million comparisons, so the program does not run it; tails needs 53,546 steps.
- Switching the search from "first tail ≥ x" to "first tail > x" turns the strict LIS into the non-decreasing one: [7, 7, 7, 7] goes from 1 to 4.

## 7. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(2^n · n) | O(n) | every subset, each checked in O(n) |
| \`dp[i]\` ending at i | O(n²) | O(n) | each i scans all j < i |
| \`tails\` + \`lower_bound\` | O(n log n) | O(n) | one binary search per element; \`tails\` never exceeds n |
| Rebuild with parents | O(n) extra | O(n) | one parent per element, one walk back |

Compiled C++ makes each O(n²) step cheap, but the number of steps is what grows: 5 billion comparisons at n = 100,000 is too slow in any language. The comparison counter in example 2 is a \`long long\`, because n(n−1)/2 passes the 32-bit \`int\` range once n is about 65,500.

## 8. Edge Cases

- **Empty array.** The LIS length is 0 and the subsequence is [] (both versions guard for it).
- **One element.** Length 1.
- **Already sorted.** The LIS is the whole array; in the tails version every number is appended ([1, 2, 3, 4, 5] gives 5).
- **Strictly decreasing.** Length 1. The two versions can return *different* one-element answers — the O(n²) DP keeps the first maximum ([5]) while the tails version keeps the last placed number ([1]); both are correct.
- **All equal.** [7, 7, 7, 7] has a strictly increasing LIS of 1 but a non-decreasing one of 4 — ask which one is wanted.
- **Ties between different LIS.** [10, 9, 2, 5, 3, 7, 101, 18] has several of length 4; the two versions print [2, 5, 7, 101] and [2, 3, 7, 18]. Say "one LIS", not "the LIS".

## Common Pitfalls

- **Returning \`dp[n - 1]\` instead of \`*max_element(dp.begin(), dp.end())\`.** The LIS need not end at the last element: for {1, 2, 0} the last \`dp\` is 1, the answer is 2.
- **\`lower_bound\` vs \`upper_bound\`.** One wrong call switches between strict and non-decreasing: {7, 7, 7, 7} gives 1 or 4.
- **\`max_element\` on an empty vector** returns \`end()\`, and dereferencing it is undefined behaviour; check \`nums.empty()\` first.
- **Using an iterator after \`push_back\`.** A reallocation invalidates it; convert to an index first, as example 1 does.
- **Returning \`tails\` as the subsequence.** It is only a list of smallest endings; for {3, 4, 1} it is [1, 4], which is not a subsequence.
- **\`int\` counters for quadratic work.** n(n−1)/2 overflows a 32-bit \`int\` around n = 65,500, and signed overflow is undefined behaviour; count in \`long long\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. First version:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i]</code> is the LIS length ending at i: 1 plus the best <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[j]</code> with j before i and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[j] &lt; nums[i]</code>. Answer: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*max_element(dp)</code>. O(n²).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The better idea:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails[k]</code> is the smallest tail of any increasing run of length k + 1. Smaller tails are never worse, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails</code> stays sorted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The update:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">auto it = lower_bound(tails.begin(), tails.end(), x)</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code> if it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">end()</code>, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*it = x</code>. The answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails.size()</code>. O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The trap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails</code> is not an LIS. Store a parent index per element and walk back to rebuild a real one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower_bound</code> for strictly increasing, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">upper_bound</code> for non-decreasing; never use an iterator into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails</code> after a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does replacing a tail never lose the answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The length of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails</code> only grows, so the best length found is kept. Replacing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tails[k]</code> by a smaller x only lowers the bar for future numbers; any number that could extend the old tail can also extend x.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the actual subsequence in O(n log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tailIdx[k]</code>, the index ending the best run of length k + 1, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[i] = tailIdx[k - 1]</code> when placing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code>. Walk parents from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tailIdx.back()</code> and reverse.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for non-decreasing sequences?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">upper_bound</code>, so equal values extend rather than replace. In our run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{7, 7, 7, 7}</code> went from 1 to 4 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{3, 1, 2, 2, 2, 5, 4}</code> from 3 to 5.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you solve Russian-doll envelopes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort by width ascending and, for equal widths, height <strong style="color:#ffca28;">descending</strong> with a comparator that is a strict "less than" (never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>), then run LIS on the heights with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower_bound</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you count how many LIS exist?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Back to O(n²): keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length[i]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count[i]</code>; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[j] + 1</code> beats <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length[i]</code>, copy <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count[j]</code>, when it ties, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count[j]</code>. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> counts, since they can grow exponentially.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subsequence** | Elements kept in order after deleting some; gaps allowed |
| **Longest increasing subsequence (LIS)** | The longest subsequence whose elements strictly increase |
| **State "ending at i"** | \`dp[i]\` = best answer for subsequences that end exactly at index i |
| **Patience sorting** | Dealing numbers onto piles; the pile count is the LIS length and the pile tops are \`tails\` |
| **Lower bound** | First position in a sorted array with value ≥ x (upper bound: > x) |
| **Parent pointer** | For each element, the index of the element before it in its best run; used to rebuild the LIS |

---
**Conclusion:** The longest increasing subsequence has two standard answers. The O(n²) DP asks for the best run ending at each index and takes the maximum; the O(n log n) method keeps \`tails\`, the smallest possible ending for every length, which stays sorted, so each new number is placed with one \`std::lower_bound\`. In C++ that is a five-line loop; switch to \`upper_bound\` for non-decreasing, and add parent pointers when the subsequence itself is needed, because \`tails\` is only good for the length. Our runs measured the difference: 1,999,000 comparisons against 11,353 binary-search steps for 2,000 numbers, with the same answer.`,
        examples: [
          {
            label: `LIS by O(n^2) DP and by the O(n log n) tails array, with the subsequence rebuilt`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

string fmt(const vector<int>& xs) {
    string s = "[";
    for (size_t k = 0; k < xs.size(); k++) { if (k) s += ", "; s += to_string(xs[k]); }
    return s + "]";
}

// O(n^2): dp[i] = length of the longest increasing subsequence ending at i
vector<int> lisQuadratic(const vector<int>& nums) {
    int n = (int)nums.size();
    if (n == 0) return {};
    vector<int> dp(n, 1), prev(n, -1);
    for (int i = 0; i < n; i++)
        for (int j = 0; j < i; j++)
            if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; prev[i] = j; }
    int end = int(max_element(dp.begin(), dp.end()) - dp.begin());   // first largest element
    vector<int> out;
    for (int i = end; i != -1; i = prev[i]) out.push_back(nums[i]);
    reverse(out.begin(), out.end());
    return out;
}

// O(n log n): tails[k] = smallest tail of an increasing subsequence of length k + 1
vector<int> lastTails;
vector<int> lisPatience(const vector<int>& nums, bool trace) {
    vector<int> tails, tailIdx, parent(nums.size(), -1);
    for (int i = 0; i < (int)nums.size(); i++) {
        int x = nums[i];
        // lower_bound: first tail >= x (use upper_bound for non-decreasing)
        int k = int(lower_bound(tails.begin(), tails.end(), x) - tails.begin());
        if (k == (int)tails.size()) { tails.push_back(x); tailIdx.push_back(i); }
        else { tails[k] = x; tailIdx[k] = i; }
        parent[i] = k > 0 ? tailIdx[k - 1] : -1;
        if (trace) cout << x << " -> " << fmt(tails) << "\\n";
    }
    lastTails = tails;
    vector<int> out;
    for (int i = tailIdx.empty() ? -1 : tailIdx.back(); i != -1; i = parent[i]) out.push_back(nums[i]);
    reverse(out.begin(), out.end());
    return out;
}

int main() {
    vector<int> demo = {10, 9, 2, 5, 3, 7, 101, 18};
    cout << "tails after each number of " << fmt(demo) << ":\\n";
    lisPatience(demo, true);

    vector<vector<int>> cases = {demo, {0, 1, 0, 3, 2, 3}, {7, 7, 7, 7}, {}, {5}, {1, 2, 3, 4, 5}, {5, 4, 3, 2, 1}};
    for (auto& nums : cases) {
        auto a = lisQuadratic(nums);
        auto b = lisPatience(nums, false);
        cout << fmt(nums) << ": n^2 length " << a.size() << " -> " << fmt(a)
             << "; n log n length " << b.size() << " -> " << fmt(b) << "\\n";
    }
    auto seq = lisPatience({3, 4, 1}, false);
    cout << "tails for [3, 4, 1] = " << fmt(lastTails) << ", but the rebuilt LIS is " << fmt(seq) << "\\n";
}`,
          },
          {
            label: `Comparisons vs binary-search steps, strict vs non-decreasing`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

long long comps = 0;
int lisQuadraticCount(const vector<int>& nums) {
    vector<int> dp(nums.size(), 1);
    int best = 0;
    comps = 0;
    for (size_t i = 0; i < nums.size(); i++) {
        for (size_t j = 0; j < i; j++) {
            comps++;
            if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) dp[i] = dp[j] + 1;
        }
        best = max(best, dp[i]);
    }
    return best;
}

// Hand-written binary search so every language counts the same steps.
long long steps = 0;
int lisTailsCount(const vector<int>& nums, bool strict) {
    vector<int> tails;
    steps = 0;
    for (int x : nums) {
        size_t lo = 0, hi = tails.size();
        while (lo < hi) {               // strict: first tail >= x; non-strict: first tail > x
            steps++;
            size_t mid = lo + (hi - lo) / 2;
            if (tails[mid] < x || (!strict && tails[mid] == x)) lo = mid + 1; else hi = mid;
        }
        if (lo == tails.size()) tails.push_back(x); else tails[lo] = x;
    }
    return (int)tails.size();
}

long long seed = 2024;
long long nxt() { seed = seed * 48271 % 2147483647LL; return seed; }

int main() {
    for (int n : {500, 2000, 8000}) {
        vector<int> nums(n);
        for (int k = 0; k < n; k++) nums[k] = int(nxt() % 10000);
        int l2 = lisTailsCount(nums, true);
        string left;
        if (n <= 2000) {
            int l1 = lisQuadraticCount(nums);
            left = "n^2 length " + to_string(l1) + " with " + to_string(comps) + " comparisons";
        } else {
            left = "n^2 not run (would need " + to_string((long long)n * (n - 1) / 2) + " comparisons)";
        }
        cout << "n=" << n << ": " << left << "; tails length " << l2 << " with " << steps << " search steps\\n";
    }
    vector<vector<int>> cases = {{7, 7, 7, 7}, {1, 3, 3, 2, 2, 4}, {3, 1, 2, 2, 2, 5, 4}};
    for (auto& nums : cases) {
        string s = "[";
        for (size_t k = 0; k < nums.size(); k++) { if (k) s += ", "; s += to_string(nums[k]); }
        int strictLen = lisTailsCount(nums, true);
        int looseLen = lisTailsCount(nums, false);
        cout << s << "]: strictly increasing " << strictLen << ", non-decreasing " << looseLen << "\\n";
    }
}`,
          },
        ],
      },
    },
  },
  {
    title: "How do you compute the edit distance between two strings?",
    difficulty: "hard",
    seoDescription: `Levenshtein edit distance with a 2D DP table: base cases, insert/delete/replace transitions, the edit script and two-row memory, verified in 4 languages.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given two words, return the minimum number of operations to turn the first into the second, where an operation inserts, deletes or replaces one character. Explain your table, then code it in Python."

**What a strong answer should cover:**
- The state \`dp[i][j]\` = fewest edits turning the first i characters of \`word1\` into the first j of \`word2\`.
- The base cases \`dp[i][0] = i\` and \`dp[0][j] = j\` (not zeros), and why.
- The transition: equal characters copy the diagonal; otherwise 1 + min(diagonal = replace, up = delete, left = insert).
- O(m·n) time and space; O(min(m, n)) space with two rows when only the number is needed; walking back for the edit script.
- Python details: building the table with a list comprehension, \`min()\` over three values, and that \`difflib.SequenceMatcher\` is not a Levenshtein distance.

**Clarifying questions expected:**
- Are all three operations allowed, and do they all cost 1?
- Does swapping two adjacent characters count as one edit?
- Do you need the edit operations or just the count?

**Code / implementation expected:** Yes — a bottom-up table in Python; mention the two-row optimisation and how to recover the operations.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, lists and 2D lists.  
**Difficulty:** Hard  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You type **"horse"** but meant **"ros"** (it happens). Your phone's keyboard has to decide how "far apart" those two words are, so it can suggest the closest real word. The natural measure is: **how many single-letter fixes does it take?** A fix is one of three things — **insert** a letter, **delete** a letter, or **replace** one letter with another. "horse" becomes "ros" in three fixes: replace h with r (rorse), delete r (rose), delete e (ros). No two-fix route exists.

That minimum number of fixes is the **edit distance**. Spell checkers rank suggestions by it, search engines use it for "did you mean…?", bioinformatics uses weighted versions to compare DNA, and fuzzy matching in databases is built on it.

It is a "hard" interview question not because the code is long — it is about fifteen lines — but because you must get three things exactly right: what a cell means, what the first row and column hold, and which neighbour stands for which operation. Get those right and it is the same table you would fill for the [longest common subsequence](/interview-question/how-do-you-find-the-longest-common-subsequence), with a different rule in each cell.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which operations are allowed: insert, delete **and** replace? | With only insert and delete, the answer is m + n − 2·LCS; with replace it is Levenshtein distance. |
| Does every operation cost 1? | Different costs (say replace = 2) change only the "+1"s in the recurrence. |
| Does swapping two adjacent letters count as one edit? | That is Damerau–Levenshtein distance; it needs an extra transition looking two cells back. |
| Do you need just the number, or the list of edits? | The number needs two rows; the edit script needs the full table to walk back through. |
| How long are the strings? | m · n cells: two 1,000-character strings are a million cells and fine; two 100,000-character strings are not. |
| Is there a threshold ("is the distance at most k?") | Then only a diagonal band of width 2k + 1 matters, which is far faster. |

## 3. The Core Idea in Plain Words

📌 **Interview term: Edit distance (Levenshtein distance)** — the smallest number of single-character insertions, deletions and replacements that turn one string into the other. dist("horse", "ros") = 3.

As with LCS, think about **prefixes**. Let \`dp[i][j]\` be the fewest edits that turn the first i characters of \`word1\` into the first j characters of \`word2\`.

**Base cases (the first row and column).** Turning i characters into the empty string takes i deletions, so \`dp[i][0] = i\`. Turning the empty string into j characters takes j insertions, so \`dp[0][j] = j\`. Unlike LCS, these are *not* zeros — this is the most common bug.

**The recurrence.** Look at the last characters \`word1[i-1]\` and \`word2[j-1]\`:

- **They are equal.** Keep it for free: \`dp[i][j] = dp[i-1][j-1]\`.
- **They differ.** The cheapest of three moves, each costing 1:
  - **replace** \`word1[i-1]\` with \`word2[j-1]\`, then fix the rest: \`dp[i-1][j-1] + 1\` (diagonal)
  - **delete** \`word1[i-1]\`: \`dp[i-1][j] + 1\` (the cell above)
  - **insert** \`word2[j-1]\` at the end: \`dp[i][j-1] + 1\` (the cell to the left)

📌 **Interview term: Base case** — the answers for the smallest subproblems, written down directly rather than computed. Here the empty-prefix row and column: \`dp[i][0] = i\`, \`dp[0][j] = j\`.

📌 **Interview term: Transition** — the rule that computes one cell from smaller ones. Here: equal characters copy the diagonal; different characters take 1 + the minimum of diagonal, up and left.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 320" role="img" aria-label="Each neighbour of an edit distance cell is one operation. The diagonal is keep or replace, the cell above is delete, the cell to the left is insert">
  <defs>
    <marker id="b29q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="30" width="230" height="74" rx="10"/>
  <text class="d-text" x="155" y="62" text-anchor="middle">dp[i-1][j-1]</text>
  <text class="d-sub" x="155" y="86" text-anchor="middle">diagonal</text>
  <rect class="d-box-muted" x="390" y="30" width="230" height="74" rx="10"/>
  <text class="d-text" x="505" y="62" text-anchor="middle">dp[i-1][j]</text>
  <text class="d-sub" x="505" y="86" text-anchor="middle">up</text>
  <rect class="d-box-muted" x="40" y="216" width="230" height="74" rx="10"/>
  <text class="d-text" x="155" y="248" text-anchor="middle">dp[i][j-1]</text>
  <text class="d-sub" x="155" y="272" text-anchor="middle">left</text>
  <rect class="d-box-accent" x="390" y="216" width="230" height="74" rx="10"/>
  <text class="d-text" x="505" y="248" text-anchor="middle">dp[i][j]</text>
  <text class="d-sub" x="505" y="272" text-anchor="middle">this cell</text>
  <path class="d-edge-accent" d="M 272 104 L 386 212" marker-end="url(#b29q3-arrow)"/>
  <text class="d-sub" x="196" y="152" text-anchor="middle">equal: keep, cost 0</text>
  <text class="d-sub" x="196" y="174" text-anchor="middle">else replace, cost 1</text>
  <path class="d-edge" d="M 505 106 L 505 212" marker-end="url(#b29q3-arrow)"/>
  <text class="d-sub" x="580" y="165" text-anchor="middle">delete, 1</text>
  <path class="d-edge" d="M 272 253 L 386 253" marker-end="url(#b29q3-arrow)"/>
  <text class="d-sub" x="329" y="236" text-anchor="middle">insert, 1</text>
</svg>

A way to remember the directions: moving **down** a row uses up one more character of \`word1\` without producing anything of \`word2\` — that is a deletion. Moving **right** produces one more character of \`word2\` without using \`word1\` — an insertion. Moving **diagonally** uses one of each — a keep or a replace.

Here is the full table for "horse" → "ros", exactly as example 1 prints it. The highlighted cells are the path the walk back takes:

<svg class="iq-diagram" width="100%" viewBox="0 0 560 388" role="img" aria-label="The edit distance table for horse and ros. The highlighted path ends in the bottom right cell with value 3">
  <text class="d-sub" x="280" y="24" text-anchor="middle">rows: prefixes of horse, columns: prefixes of ros</text>
  <text class="d-text" x="199" y="56" text-anchor="middle">-</text>
  <text class="d-text" x="263" y="56" text-anchor="middle">r</text>
  <text class="d-text" x="327" y="56" text-anchor="middle">o</text>
  <text class="d-text" x="391" y="56" text-anchor="middle">s</text>
  <text class="d-text" x="137" y="100" text-anchor="middle">-</text>
  <rect class="d-box-accent" x="170" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="234" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="100" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="298" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="100" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="362" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="100" text-anchor="middle">3</text>
  <text class="d-text" x="137" y="148" text-anchor="middle">h</text>
  <rect class="d-box-muted" x="170" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="148" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="234" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="148" text-anchor="middle">2</text>
  <rect class="d-box" x="362" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="148" text-anchor="middle">3</text>
  <text class="d-text" x="137" y="196" text-anchor="middle">o</text>
  <rect class="d-box-muted" x="170" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="196" text-anchor="middle">2</text>
  <rect class="d-box" x="234" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="196" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="298" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="196" text-anchor="middle">1</text>
  <rect class="d-box" x="362" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="196" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="244" text-anchor="middle">r</text>
  <rect class="d-box-muted" x="170" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="244" text-anchor="middle">3</text>
  <rect class="d-box" x="234" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="244" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="298" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="244" text-anchor="middle">2</text>
  <rect class="d-box" x="362" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="244" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="292" text-anchor="middle">s</text>
  <rect class="d-box-muted" x="170" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="292" text-anchor="middle">4</text>
  <rect class="d-box" x="234" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="292" text-anchor="middle">3</text>
  <rect class="d-box" x="298" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="292" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="362" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="292" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="340" text-anchor="middle">e</text>
  <rect class="d-box-muted" x="170" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="340" text-anchor="middle">5</text>
  <rect class="d-box" x="234" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="340" text-anchor="middle">4</text>
  <rect class="d-box" x="298" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="340" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="362" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="340" text-anchor="middle">3</text>
</svg>

The answer is the bottom-right cell, 3. Following the highlighted path from the top-left: replace h → r (diagonal, 0 → 1), keep o (diagonal, stays 1), delete r (down, 1 → 2), keep s (diagonal, stays 2), delete e (down, 2 → 3).

📌 **Interview term: Edit script (alignment)** — the actual list of keep / replace / insert / delete steps, recovered by walking back from \`dp[m][n]\` and asking at each cell which neighbour produced its value.

## 4. From Brute Force to the Table

1. **Plain recursion.** Compare \`word1[i]\` and \`word2[j]\` from the front; on a mismatch try all three operations and take the cheapest. It branches three ways, and the same (i, j) is reached again and again: "intention" → "execution" (9 letters each) takes **367,039** calls in example 2.
2. **Memoization.** Cache each (i, j). There are only (m + 1)·(n + 1) pairs, so the work becomes O(m·n) — the general idea is on [What is memoization?](/interview-question/what-is-memoization).
3. **Tabulation.** Fill \`dp\` row by row; every cell's three inputs are above or to the left, so they are always ready. The same pair is **81** cells.
4. **Two rows.** Row i reads only row i − 1 and itself, so keep two rows for O(n) memory — but then you cannot walk back for the edit script.

📌 **Interview term: Optimal substructure** — the best answer for the whole problem is built from best answers to smaller pieces. The cheapest edit of the full prefixes ends with one operation applied to a cheapest edit of shorter prefixes. Together with overlapping subproblems, that is what makes this [dynamic programming](/interview-question/what-is-dynamic-programming).

**The link to LCS.** If replace is *not* allowed, a replace costs a delete plus an insert, and the distance becomes \`m + n − 2·LCS(word1, word2)\`: every character outside a longest common subsequence is deleted from one side or inserted on the other. Example 2 checks this on three pairs.

## 5. The Code in Python

The table and the walk back that recovers the edit script:

~~~python
def edit_table(a, b):
    m, n = len(a), len(b)
    # dp[i][j] = fewest edits turning a[:i] into b[:j]
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i                    # delete all i characters
    for j in range(n + 1):
        dp[0][j] = j                    # insert all j characters
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]          # free: characters already match
            else:
                dp[i][j] = 1 + min(dp[i - 1][j - 1],  # replace a[i-1] with b[j-1]
                                   dp[i - 1][j],      # delete a[i-1]
                                   dp[i][j - 1])      # insert b[j-1]
    return dp


def edit_script(a, b, dp):
    i, j, ops = len(a), len(b), []
    while i > 0 or j > 0:
        if i > 0 and j > 0 and a[i - 1] == b[j - 1] and dp[i][j] == dp[i - 1][j - 1]:
            ops.append("keep " + a[i - 1])
            i, j = i - 1, j - 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + 1:
            ops.append("replace " + a[i - 1] + "->" + b[j - 1])
            i, j = i - 1, j - 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            ops.append("delete " + a[i - 1])
            i -= 1
        else:
            ops.append("insert " + b[j - 1])
            j -= 1
    return ops[::-1]
~~~

**What to point out in this code:**

- The two small loops before the main loop **are** the base cases. Forgetting them (leaving zeros) is the classic bug: dist("abc", "") would come out 0.
- \`min(a, b, c)\` takes any number of arguments, so the three operations read almost like the recurrence. The comments name which neighbour is which operation — say this out loud in the interview.
- \`[[0] * (n + 1) for _ in range(m + 1)]\` builds independent rows; \`[[0] * (n + 1)] * (m + 1)\` would make every row the same list.
- \`edit_script\` asks, at each cell, "which neighbour could have produced this value?" in a fixed order — keep, replace, delete, insert — and moves there. The \`i > 0\` / \`j > 0\` guards handle the edges of the table, where only one move is possible. The steps come out backwards, so it returns \`ops[::-1]\`.

**When you only need the number**, keep two rows. The new row starts with \`i\`, its base-case value:

~~~python
def two_rows(a, b):
    prev = list(range(len(b) + 1))      # row i = 0
    for i in range(1, len(a) + 1):
        cur = [i] + [0] * len(b)        # column 0 of row i is i
        for j in range(1, len(b) + 1):
            cur[j] = prev[j-1] if a[i-1] == b[j-1] else 1 + min(prev[j-1], prev[j], cur[j-1])
        prev = cur
    return prev[len(b)]
~~~

📌 **Interview term: Rolling array (two rows)** — keeping only the previous and current rows because no cell reads anything older. Space drops from O(m·n) to O(n); swap the arguments if you want O(min(m, n)).

**Do not reach for \`difflib\`.** Python's \`difflib.SequenceMatcher\` compares sequences with a different algorithm (Ratcliff/Obershelp-style matching of the longest contiguous blocks), and its documentation says it does not yield minimal edit sequences ([Python docs: difflib](https://docs.python.org/3/library/difflib.html)). Its \`ratio()\` is a similarity score, not a Levenshtein distance. The standard library has no edit-distance function; write the table.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the table for "horse" → "ros", seven distances, and two edit scripts** prints:

~~~text
table rows (word1 = horse, word2 = ros):
- [0, 1, 2, 3]
h [1, 1, 2, 3]
o [2, 2, 1, 2]
r [3, 2, 2, 2]
s [4, 3, 3, 2]
e [5, 4, 4, 3]
dist("horse", "ros") = 3
dist("intention", "execution") = 5
dist("kitten", "sitting") = 3
dist("", "abc") = 3
dist("abc", "") = 3
dist("abc", "abc") = 0
dist("ab", "ba") = 2
horse -> ros: replace h->r, keep o, delete r, keep s, delete e (3 paid)
intention -> execution: replace i->e, replace n->x, replace t->e, replace e->c, replace n->u, keep t, keep i, keep o, keep n (5 paid)
~~~

- The table rows match the diagram: the first row is 0, 1, 2, 3 and the first column is 0 to 5 — the base cases.
- "kitten" → "sitting" is 3 (replace k, replace e, insert g), and "ab" → "ba" is 2: plain Levenshtein has no swap move.
- Each script lists the free keeps too, and counts only the paid steps: 3 for horse → ros, 5 for intention → execution.

**Example 2 — recursion vs table, the LCS link, and two rows** prints:

~~~text
kitten -> sitting: naive 3 in 2763 calls; table 3 in 42 cells
sunday -> saturday: naive 3 in 3692 calls; table 3 in 48 cells
intention -> execution: naive 5 in 367039 calls; table 5 in 81 cells
horse -> ros: indel-only 4, m + n - 2 * LCS = 4
kitten -> sitting: indel-only 5, m + n - 2 * LCS = 5
abc -> abc: indel-only 0, m + n - 2 * LCS = 0
random 700 x 500: full table 317, two rows 317
~~~

- The plain recursion needs **2,763** calls for kitten → sitting and **367,039** for intention → execution; the table fills 42 and 81 cells for the same answers.
- With only insert and delete allowed, the distance equals \`m + n − 2·LCS\` on all three pairs (4 for horse → ros, where Levenshtein gives 3 because one replace saves a delete + insert).
- On two random 700- and 500-character strings the full table and the two-row version agree: 317.

## 7. Complexity

m and n are the lengths of \`word1\` and \`word2\`.

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential, up to O(3^(m+n)) | O(m + n) stack | a mismatch branches three ways and subproblems repeat |
| Memoized recursion | O(m·n) | O(m·n) + O(m + n) stack | each (i, j) solved once |
| Full table | O(m·n) | O(m·n) | one O(1) step per cell |
| Two rows | O(m·n) | O(n), or O(min(m, n)) after a swap | only the previous row is read |
| Edit script | O(m + n) extra | needs the full table | every step decreases i, j or both |

For pure-Python loops, m·n is the number to watch: two 5,000-character strings are 25 million cells of interpreted bytecode. If you only need to know whether the distance is at most k, fill only the band of cells with |i − j| ≤ k — O(k·min(m, n)) work.

## 8. Edge Cases

- **An empty string.** dist("", "abc") = 3 (three inserts) and dist("abc", "") = 3 (three deletes) — the base row and column, nothing else.
- **Equal strings.** 0: every step is a free diagonal keep.
- **Swapped neighbours.** dist("ab", "ba") = 2 in Levenshtein distance (two replaces). If the interviewer expects 1, they mean Damerau–Levenshtein with a transposition move.
- **Different lengths.** The distance is at least |m − n| (that many inserts or deletes are unavoidable) and at most max(m, n).
- **Several optimal edit scripts.** "intention" → "execution" has more than one script of 5 edits; the walk back's preference order (keep, replace, delete, insert) decides which one you print — ours is five replaces.
- **Case and Unicode.** "A" and "a" differ unless you normalise first; decide what a "character" is before comparing.

## Common Pitfalls

- **Zero base cases.** \`dp[i][0]\` must be i and \`dp[0][j]\` must be j; with zeros, "abc" → "" comes out 0.
- **Mixing up the directions.** Up (\`dp[i-1][j]\`) is delete from \`word1\`, left (\`dp[i][j-1]\`) is insert into \`word1\`. The number is the same either way, but the edit script comes out wrong.
- **Adding 1 on a match.** Equal characters copy the diagonal with no +1; adding 1 counts a "keep" as an edit.
- **\`[[0] * (n + 1)] * (m + 1)\`** — shared rows. Use a list comprehension.
- **Using \`difflib.SequenceMatcher\`** as an edit distance: it is a similarity heuristic, not minimal.
- **Recursion with \`lru_cache\` on long strings.** The depth is about m + n, and Python's default recursion limit is 1000; the table has no such limit.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j]</code> is the fewest edits turning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1[:i]</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word2[:j]</code>. The answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[m][n]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Base cases:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][0] = i</code> (delete everything) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0][j] = j</code> (insert everything) — not zeros.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The transition:</strong> <span style="color:#f0e2c8;">Equal last characters copy the diagonal. Otherwise 1 + <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min(diagonal, up, left)</code>: replace, delete, insert.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost and memory:</strong> <span style="color:#f0e2c8;">O(m·n) time and space; two rows give O(min(m, n)) space when only the number is needed. Walk back through the full table for the edit script.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Build rows with a list comprehension, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min()</code> over three values, and do not confuse this with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">difflib</code>, which is not minimal.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the cell above a deletion?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Going from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i-1][j]</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j]</code> uses one more character of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1</code> but produces nothing more of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word2</code>, so that character was deleted. Moving left to right produces a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word2</code> character without using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1</code>: an insertion.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the actual operations?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the full table and walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[m][n]</code>: if the characters match and the diagonal is equal, keep; else whichever neighbour plus 1 equals the cell tells you replace, delete or insert. Reverse the list at the end.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if replace costs 2 and insert/delete cost 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Change the constants: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i-1][j-1] + 2</code> for replace. With replace at 2 it is never better than delete plus insert, and the answer becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m + n - 2 * LCS</code> — in our run 4 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">horse</code> → <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ros</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you allow swapping two adjacent letters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is Damerau–Levenshtein (optimal string alignment): add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i-2][j-2] + 1</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1[i-1] == word2[j-2]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1[i-2] == word2[j-1]</code>. Then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ab</code> → <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ba</code> costs 1 instead of 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The strings are long but you only care if the distance is at most 2. Faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fill only the diagonal band where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abs(i - j) &lt;= 2</code>; any cell outside it is already more than 2. That is O(k·n) instead of O(m·n), and you can stop early once a whole row exceeds k.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Edit distance (Levenshtein distance)** | Fewest single-character inserts, deletes and replaces turning one string into another |
| **Base case** | Answers written down directly: \`dp[i][0] = i\`, \`dp[0][j] = j\` |
| **Transition** | Equal characters copy the diagonal; otherwise 1 + min(diagonal, up, left) |
| **Edit script (alignment)** | The list of keep / replace / insert / delete steps, found by walking back |
| **Optimal substructure** | The best whole answer is built from best answers to smaller prefixes |
| **Rolling array (two rows)** | Keeping only the previous and current rows because nothing older is read |

---
**Conclusion:** Edit distance is a two-dimensional DP over prefixes: \`dp[i][j]\` is the cheapest way to turn \`word1[:i]\` into \`word2[:j]\`, the first row and column are i and j, equal characters copy the diagonal, and different characters take one plus the minimum of replace (diagonal), delete (up) and insert (left). In Python that is a list-comprehension table and one \`min()\` per cell; keep two rows when only the number matters, or walk back through the full table to list the edits. Our runs showed the payoff: 367,039 recursive calls become 81 table cells, with the same answer of 5.`,
        examples: [
          {
            label: `Edit distance table, distances and the edit script`,
            code: `def edit_table(a, b):
    m, n = len(a), len(b)
    # dp[i][j] = fewest edits turning a[:i] into b[:j]
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i                    # delete all i characters
    for j in range(n + 1):
        dp[0][j] = j                    # insert all j characters
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]          # free: characters already match
            else:
                dp[i][j] = 1 + min(dp[i - 1][j - 1],  # replace a[i-1] with b[j-1]
                                   dp[i - 1][j],      # delete a[i-1]
                                   dp[i][j - 1])      # insert b[j-1]
    return dp


def edit_script(a, b, dp):
    i, j, ops = len(a), len(b), []
    while i > 0 or j > 0:
        if i > 0 and j > 0 and a[i - 1] == b[j - 1] and dp[i][j] == dp[i - 1][j - 1]:
            ops.append("keep " + a[i - 1])
            i, j = i - 1, j - 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + 1:
            ops.append("replace " + a[i - 1] + "->" + b[j - 1])
            i, j = i - 1, j - 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            ops.append("delete " + a[i - 1])
            i -= 1
        else:
            ops.append("insert " + b[j - 1])
            j -= 1
    return ops[::-1]


def fmt(row):
    return "[" + ", ".join(str(x) for x in row) + "]"


a, b = "horse", "ros"
dp = edit_table(a, b)
print("table rows (word1 = horse, word2 = ros):")
print("- " + fmt(dp[0]))
for i in range(1, len(a) + 1):
    print(a[i - 1] + " " + fmt(dp[i]))

for a, b in [("horse", "ros"), ("intention", "execution"), ("kitten", "sitting"),
             ("", "abc"), ("abc", ""), ("abc", "abc"), ("ab", "ba")]:
    dp = edit_table(a, b)
    print('dist("' + a + '", "' + b + '") = ' + str(dp[len(a)][len(b)]))

for a, b in [("horse", "ros"), ("intention", "execution")]:
    dp = edit_table(a, b)
    ops = edit_script(a, b, dp)
    paid = [op for op in ops if not op.startswith("keep")]
    print(a + " -> " + b + ": " + ", ".join(ops) + " (" + str(len(paid)) + " paid)")`,
          },
          {
            label: `Naive recursion vs table, the LCS link, and two rows`,
            code: `calls = 0
def naive(a, b, i, j):
    global calls
    calls += 1
    if i == len(a):
        return len(b) - j               # insert the rest of b
    if j == len(b):
        return len(a) - i               # delete the rest of a
    if a[i] == b[j]:
        return naive(a, b, i + 1, j + 1)
    return 1 + min(naive(a, b, i + 1, j + 1), naive(a, b, i + 1, j), naive(a, b, i, j + 1))


def full_table(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            dp[i][j] = dp[i-1][j-1] if a[i-1] == b[j-1] else 1 + min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1])
    return dp[m][n]


def two_rows(a, b):
    prev = list(range(len(b) + 1))      # row i = 0
    for i in range(1, len(a) + 1):
        cur = [i] + [0] * len(b)        # column 0 of row i is i
        for j in range(1, len(b) + 1):
            cur[j] = prev[j-1] if a[i-1] == b[j-1] else 1 + min(prev[j-1], prev[j], cur[j-1])
        prev = cur
    return prev[len(b)]


def indel_only(a, b):
    """Insert and delete only, no replace: a replace now costs a delete plus an insert."""
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        for j in range(n + 1):
            if i == 0 or j == 0:
                dp[i][j] = i + j
            elif a[i-1] == b[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1])
    return dp[m][n]


def lcs(a, b):
    prev = [0] * (len(b) + 1)
    for i in range(1, len(a) + 1):
        cur = [0] * (len(b) + 1)
        for j in range(1, len(b) + 1):
            cur[j] = prev[j-1] + 1 if a[i-1] == b[j-1] else max(prev[j], cur[j-1])
        prev = cur
    return prev[len(b)]


for a, b in [("kitten", "sitting"), ("sunday", "saturday"), ("intention", "execution")]:
    calls = 0
    r = naive(a, b, 0, 0)
    print(a + " -> " + b + ": naive " + str(r) + " in " + str(calls) + " calls; table " +
          str(full_table(a, b)) + " in " + str(len(a) * len(b)) + " cells")

for a, b in [("horse", "ros"), ("kitten", "sitting"), ("abc", "abc")]:
    print(a + " -> " + b + ": indel-only " + str(indel_only(a, b)) + ", m + n - 2 * LCS = " +
          str(len(a) + len(b) - 2 * lcs(a, b)))

seed = 99
def nxt():
    global seed
    seed = seed * 48271 % 2147483647
    return seed

x = "".join(chr(97 + nxt() % 3) for _ in range(700))
y = "".join(chr(97 + nxt() % 3) for _ in range(500))
print("random 700 x 500: full table " + str(full_table(x, y)) + ", two rows " + str(two_rows(x, y)))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given two words, return the minimum number of operations to turn the first into the second, where an operation inserts, deletes or replaces one character. Explain your table, then code it in JavaScript."

**What a strong answer should cover:**
- The state \`dp[i][j]\` = fewest edits turning the first i characters of \`word1\` into the first j of \`word2\`.
- The base cases \`dp[i][0] = i\` and \`dp[0][j] = j\` (not zeros), and why.
- The transition: equal characters copy the diagonal; otherwise 1 + min(diagonal = replace, up = delete, left = insert).
- O(m·n) time and space; O(min(m, n)) space with two rows when only the number is needed; walking back for the edit script.
- JavaScript details: independent rows with \`Array.from\`, \`Int32Array\` rows for memory, \`Math.min\` over three values, and \`str[i]\` being a UTF-16 code unit.

**Clarifying questions expected:**
- Are all three operations allowed, and do they all cost 1?
- Does swapping two adjacent characters count as one edit?
- Do you need the edit operations or just the count?

**Code / implementation expected:** Yes — a bottom-up table in JavaScript; mention the two-row optimisation and how to recover the operations.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, arrays and arrays of arrays.  
**Difficulty:** Hard  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You type **"horse"** but meant **"ros"** (it happens). Your phone's keyboard has to decide how "far apart" those two words are, so it can suggest the closest real word. The natural measure is: **how many single-letter fixes does it take?** A fix is one of three things — **insert** a letter, **delete** a letter, or **replace** one letter with another. "horse" becomes "ros" in three fixes: replace h with r (rorse), delete r (rose), delete e (ros). No two-fix route exists.

That minimum number of fixes is the **edit distance**. Spell checkers rank suggestions by it, search engines use it for "did you mean…?", bioinformatics uses weighted versions to compare DNA, and fuzzy matching in databases is built on it.

It is a "hard" interview question not because the code is long — it is about fifteen lines — but because you must get three things exactly right: what a cell means, what the first row and column hold, and which neighbour stands for which operation. Get those right and it is the same table you would fill for the [longest common subsequence](/interview-question/how-do-you-find-the-longest-common-subsequence), with a different rule in each cell.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which operations are allowed: insert, delete **and** replace? | With only insert and delete, the answer is m + n − 2·LCS; with replace it is Levenshtein distance. |
| Does every operation cost 1? | Different costs (say replace = 2) change only the "+1"s in the recurrence. |
| Does swapping two adjacent letters count as one edit? | That is Damerau–Levenshtein distance; it needs an extra transition looking two cells back. |
| Do you need just the number, or the list of edits? | The number needs two rows; the edit script needs the full table to walk back through. |
| How long are the strings? | m · n cells: two 1,000-character strings are a million cells and fine; two 100,000-character strings are not. |
| Is there a threshold ("is the distance at most k?") | Then only a diagonal band of width 2k + 1 matters, which is far faster. |

## 3. The Core Idea in Plain Words

📌 **Interview term: Edit distance (Levenshtein distance)** — the smallest number of single-character insertions, deletions and replacements that turn one string into the other. dist("horse", "ros") = 3.

As with LCS, think about **prefixes**. Let \`dp[i][j]\` be the fewest edits that turn the first i characters of \`word1\` into the first j characters of \`word2\`.

**Base cases (the first row and column).** Turning i characters into the empty string takes i deletions, so \`dp[i][0] = i\`. Turning the empty string into j characters takes j insertions, so \`dp[0][j] = j\`. Unlike LCS, these are *not* zeros — this is the most common bug.

**The recurrence.** Look at the last characters \`word1[i-1]\` and \`word2[j-1]\`:

- **They are equal.** Keep it for free: \`dp[i][j] = dp[i-1][j-1]\`.
- **They differ.** The cheapest of three moves, each costing 1:
  - **replace** \`word1[i-1]\` with \`word2[j-1]\`, then fix the rest: \`dp[i-1][j-1] + 1\` (diagonal)
  - **delete** \`word1[i-1]\`: \`dp[i-1][j] + 1\` (the cell above)
  - **insert** \`word2[j-1]\` at the end: \`dp[i][j-1] + 1\` (the cell to the left)

📌 **Interview term: Base case** — the answers for the smallest subproblems, written down directly rather than computed. Here the empty-prefix row and column: \`dp[i][0] = i\`, \`dp[0][j] = j\`.

📌 **Interview term: Transition** — the rule that computes one cell from smaller ones. Here: equal characters copy the diagonal; different characters take 1 + the minimum of diagonal, up and left.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 320" role="img" aria-label="Each neighbour of an edit distance cell is one operation. The diagonal is keep or replace, the cell above is delete, the cell to the left is insert">
  <defs>
    <marker id="b29q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="30" width="230" height="74" rx="10"/>
  <text class="d-text" x="155" y="62" text-anchor="middle">dp[i-1][j-1]</text>
  <text class="d-sub" x="155" y="86" text-anchor="middle">diagonal</text>
  <rect class="d-box-muted" x="390" y="30" width="230" height="74" rx="10"/>
  <text class="d-text" x="505" y="62" text-anchor="middle">dp[i-1][j]</text>
  <text class="d-sub" x="505" y="86" text-anchor="middle">up</text>
  <rect class="d-box-muted" x="40" y="216" width="230" height="74" rx="10"/>
  <text class="d-text" x="155" y="248" text-anchor="middle">dp[i][j-1]</text>
  <text class="d-sub" x="155" y="272" text-anchor="middle">left</text>
  <rect class="d-box-accent" x="390" y="216" width="230" height="74" rx="10"/>
  <text class="d-text" x="505" y="248" text-anchor="middle">dp[i][j]</text>
  <text class="d-sub" x="505" y="272" text-anchor="middle">this cell</text>
  <path class="d-edge-accent" d="M 272 104 L 386 212" marker-end="url(#b29q3-arrow)"/>
  <text class="d-sub" x="196" y="152" text-anchor="middle">equal: keep, cost 0</text>
  <text class="d-sub" x="196" y="174" text-anchor="middle">else replace, cost 1</text>
  <path class="d-edge" d="M 505 106 L 505 212" marker-end="url(#b29q3-arrow)"/>
  <text class="d-sub" x="580" y="165" text-anchor="middle">delete, 1</text>
  <path class="d-edge" d="M 272 253 L 386 253" marker-end="url(#b29q3-arrow)"/>
  <text class="d-sub" x="329" y="236" text-anchor="middle">insert, 1</text>
</svg>

A way to remember the directions: moving **down** a row uses up one more character of \`word1\` without producing anything of \`word2\` — that is a deletion. Moving **right** produces one more character of \`word2\` without using \`word1\` — an insertion. Moving **diagonally** uses one of each — a keep or a replace.

Here is the full table for "horse" → "ros", exactly as example 1 prints it. The highlighted cells are the path the walk back takes:

<svg class="iq-diagram" width="100%" viewBox="0 0 560 388" role="img" aria-label="The edit distance table for horse and ros. The highlighted path ends in the bottom right cell with value 3">
  <text class="d-sub" x="280" y="24" text-anchor="middle">rows: prefixes of horse, columns: prefixes of ros</text>
  <text class="d-text" x="199" y="56" text-anchor="middle">-</text>
  <text class="d-text" x="263" y="56" text-anchor="middle">r</text>
  <text class="d-text" x="327" y="56" text-anchor="middle">o</text>
  <text class="d-text" x="391" y="56" text-anchor="middle">s</text>
  <text class="d-text" x="137" y="100" text-anchor="middle">-</text>
  <rect class="d-box-accent" x="170" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="234" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="100" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="298" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="100" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="362" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="100" text-anchor="middle">3</text>
  <text class="d-text" x="137" y="148" text-anchor="middle">h</text>
  <rect class="d-box-muted" x="170" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="148" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="234" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="148" text-anchor="middle">2</text>
  <rect class="d-box" x="362" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="148" text-anchor="middle">3</text>
  <text class="d-text" x="137" y="196" text-anchor="middle">o</text>
  <rect class="d-box-muted" x="170" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="196" text-anchor="middle">2</text>
  <rect class="d-box" x="234" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="196" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="298" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="196" text-anchor="middle">1</text>
  <rect class="d-box" x="362" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="196" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="244" text-anchor="middle">r</text>
  <rect class="d-box-muted" x="170" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="244" text-anchor="middle">3</text>
  <rect class="d-box" x="234" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="244" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="298" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="244" text-anchor="middle">2</text>
  <rect class="d-box" x="362" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="244" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="292" text-anchor="middle">s</text>
  <rect class="d-box-muted" x="170" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="292" text-anchor="middle">4</text>
  <rect class="d-box" x="234" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="292" text-anchor="middle">3</text>
  <rect class="d-box" x="298" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="292" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="362" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="292" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="340" text-anchor="middle">e</text>
  <rect class="d-box-muted" x="170" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="340" text-anchor="middle">5</text>
  <rect class="d-box" x="234" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="340" text-anchor="middle">4</text>
  <rect class="d-box" x="298" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="340" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="362" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="340" text-anchor="middle">3</text>
</svg>

The answer is the bottom-right cell, 3. Following the highlighted path from the top-left: replace h → r (diagonal, 0 → 1), keep o (diagonal, stays 1), delete r (down, 1 → 2), keep s (diagonal, stays 2), delete e (down, 2 → 3).

📌 **Interview term: Edit script (alignment)** — the actual list of keep / replace / insert / delete steps, recovered by walking back from \`dp[m][n]\` and asking at each cell which neighbour produced its value.

## 4. From Brute Force to the Table

1. **Plain recursion.** Compare \`word1[i]\` and \`word2[j]\` from the front; on a mismatch try all three operations and take the cheapest. It branches three ways, and the same (i, j) is reached again and again: "intention" → "execution" (9 letters each) takes **367,039** calls in example 2.
2. **Memoization.** Cache each (i, j). There are only (m + 1)·(n + 1) pairs, so the work becomes O(m·n) — the general idea is on [What is memoization?](/interview-question/what-is-memoization).
3. **Tabulation.** Fill \`dp\` row by row; every cell's three inputs are above or to the left, so they are always ready. The same pair is **81** cells.
4. **Two rows.** Row i reads only row i − 1 and itself, so keep two rows for O(n) memory — but then you cannot walk back for the edit script.

📌 **Interview term: Optimal substructure** — the best answer for the whole problem is built from best answers to smaller pieces. The cheapest edit of the full prefixes ends with one operation applied to a cheapest edit of shorter prefixes. Together with overlapping subproblems, that is what makes this [dynamic programming](/interview-question/what-is-dynamic-programming).

**The link to LCS.** If replace is *not* allowed, a replace costs a delete plus an insert, and the distance becomes \`m + n − 2·LCS(word1, word2)\`: every character outside a longest common subsequence is deleted from one side or inserted on the other. Example 2 checks this on three pairs.

## 5. The Code in JavaScript

The table and the walk back that recovers the edit script:

~~~javascript
// dp[i][j] = fewest edits turning a.slice(0, i) into b.slice(0, j)
function editTable(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;      // delete all i characters
  for (let j = 0; j <= n; j++) dp[0][j] = j;      // insert all j characters
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];   // free: characters already match
      else dp[i][j] = 1 + Math.min(dp[i - 1][j - 1],             // replace a[i-1] with b[j-1]
                                   dp[i - 1][j],                 // delete a[i-1]
                                   dp[i][j - 1]);                // insert b[j-1]
    }
  }
  return dp;
}

function editScript(a, b, dp) {
  let i = a.length, j = b.length;
  const ops = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
      ops.push("keep " + a[i - 1]); i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.push("replace " + a[i - 1] + "->" + b[j - 1]); i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push("delete " + a[i - 1]); i--;
    } else {
      ops.push("insert " + b[j - 1]); j--;
    }
  }
  return ops.reverse();
}
~~~

**What to point out in this code:**

- The two small loops before the main loop **are** the base cases. Forgetting them (leaving zeros) is the classic bug: dist("abc", "") would come out 0.
- \`Math.min\` takes any number of arguments, so the three operations read like the recurrence. The comments name which neighbour is which operation — say this out loud in the interview.
- \`Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))\` builds independent rows; \`new Array(m + 1).fill(new Array(n + 1).fill(0))\` would put the same row in every slot.
- \`a[i - 1] === b[j - 1]\` compares UTF-16 code units. An emoji is two units (\`"😀".length\` is 2), so replacing one emoji with another would count as 2 edits. Spread the strings into arrays (\`[...word]\`) first if that matters.
- \`editScript\` asks, at each cell, "which neighbour could have produced this value?" in a fixed order — keep, replace, delete, insert — and moves there. The \`i > 0\` / \`j > 0\` guards handle the table edges; reading \`dp[-1]\` would give \`undefined\` and silently make every comparison false.

**When you only need the number**, keep two rows. \`Int32Array.from({ length }, (_, j) => j)\` builds the base row 0, 1, 2, …:

~~~javascript
function twoRows(a, b) {
  let prev = Int32Array.from({ length: b.length + 1 }, (_, j) => j);   // row i = 0
  for (let i = 1; i <= a.length; i++) {
    const cur = new Int32Array(b.length + 1);
    cur[0] = i;                                   // column 0 of row i is i
    for (let j = 1; j <= b.length; j++)
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
    prev = cur;
  }
  return prev[b.length];
}
~~~

📌 **Interview term: Rolling array (two rows)** — keeping only the previous and current rows because no cell reads anything older. Space drops from O(m·n) to O(n); swap the arguments if you want O(min(m, n)).

JavaScript has no built-in edit-distance function; libraries exist, but in an interview you write the table.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node 22). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the table for "horse" → "ros", seven distances, and two edit scripts** prints:

~~~text
table rows (word1 = horse, word2 = ros):
- [0, 1, 2, 3]
h [1, 1, 2, 3]
o [2, 2, 1, 2]
r [3, 2, 2, 2]
s [4, 3, 3, 2]
e [5, 4, 4, 3]
dist("horse", "ros") = 3
dist("intention", "execution") = 5
dist("kitten", "sitting") = 3
dist("", "abc") = 3
dist("abc", "") = 3
dist("abc", "abc") = 0
dist("ab", "ba") = 2
horse -> ros: replace h->r, keep o, delete r, keep s, delete e (3 paid)
intention -> execution: replace i->e, replace n->x, replace t->e, replace e->c, replace n->u, keep t, keep i, keep o, keep n (5 paid)
~~~

- The table rows match the diagram: the first row is 0, 1, 2, 3 and the first column is 0 to 5 — the base cases.
- "kitten" → "sitting" is 3 (replace k, replace e, insert g), and "ab" → "ba" is 2: plain Levenshtein has no swap move.
- Each script lists the free keeps too, and counts only the paid steps: 3 for horse → ros, 5 for intention → execution.

**Example 2 — recursion vs table, the LCS link, and two rows** prints:

~~~text
kitten -> sitting: naive 3 in 2763 calls; table 3 in 42 cells
sunday -> saturday: naive 3 in 3692 calls; table 3 in 48 cells
intention -> execution: naive 5 in 367039 calls; table 5 in 81 cells
horse -> ros: indel-only 4, m + n - 2 * LCS = 4
kitten -> sitting: indel-only 5, m + n - 2 * LCS = 5
abc -> abc: indel-only 0, m + n - 2 * LCS = 0
random 700 x 500: full table 317, two rows 317
~~~

- The plain recursion needs **2,763** calls for kitten → sitting and **367,039** for intention → execution; the table fills 42 and 81 cells for the same answers.
- With only insert and delete allowed, the distance equals \`m + n − 2·LCS\` on all three pairs (4 for horse → ros, where Levenshtein gives 3 because one replace saves a delete + insert).
- On two random 700- and 500-character strings the full table and the two-row version agree: 317.

## 7. Complexity

m and n are the lengths of \`word1\` and \`word2\`.

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential, up to O(3^(m+n)) | O(m + n) stack | a mismatch branches three ways and subproblems repeat |
| Memoized recursion | O(m·n) | O(m·n) + O(m + n) stack | each (i, j) solved once |
| Full table | O(m·n) | O(m·n) | one O(1) step per cell |
| Two rows | O(m·n) | O(n), or O(min(m, n)) after a swap | only the previous row is read |
| Edit script | O(m + n) extra | needs the full table | every step decreases i, j or both |

An \`Int32Array\` row costs exactly 4 bytes per cell, so the two-row version of two 100,000-character strings needs under a megabyte, while the full table would need 40 GB. If you only need to know whether the distance is at most k, fill only the band of cells with |i − j| ≤ k — O(k·min(m, n)) work.

## 8. Edge Cases

- **An empty string.** dist("", "abc") = 3 (three inserts) and dist("abc", "") = 3 (three deletes) — the base row and column, nothing else.
- **Equal strings.** 0: every step is a free diagonal keep.
- **Swapped neighbours.** dist("ab", "ba") = 2 in Levenshtein distance (two replaces). If the interviewer expects 1, they mean Damerau–Levenshtein with a transposition move.
- **Different lengths.** The distance is at least |m − n| (that many inserts or deletes are unavoidable) and at most max(m, n).
- **Several optimal edit scripts.** "intention" → "execution" has more than one script of 5 edits; the walk back's preference order (keep, replace, delete, insert) decides which one you print — ours is five replaces.
- **Case and Unicode.** "A" and "a" differ unless you normalise first; decide what a "character" is before comparing.

## Common Pitfalls

- **Zero base cases.** \`dp[i][0]\` must be i and \`dp[0][j]\` must be j; with zeros, "abc" → "" comes out 0.
- **Mixing up the directions.** Up (\`dp[i-1][j]\`) is delete from \`word1\`, left (\`dp[i][j-1]\`) is insert into \`word1\`. The number is the same either way, but the edit script comes out wrong.
- **Adding 1 on a match.** Equal characters copy the diagonal with no +1.
- **Shared rows from \`fill\`.** \`new Array(m).fill(new Array(n))\` is one row repeated; use \`Array.from\`.
- **Out-of-range reads.** \`dp[i - 1]\` at i = 0 is \`undefined\`, and \`undefined[j]\` throws a \`TypeError\`; \`Math.min\` with an \`undefined\` argument gives \`NaN\`. Keep the guards.
- **UTF-16 surprises.** \`str.length\` and \`str[i]\` count code units; emoji and some accented characters are two.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j]</code> is the fewest edits turning the first i characters of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1</code> into the first j of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word2</code>. The answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[m][n]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Base cases:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][0] = i</code> (delete everything) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0][j] = j</code> (insert everything) — not zeros.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The transition:</strong> <span style="color:#f0e2c8;">Equal last characters copy the diagonal. Otherwise 1 + <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min(diagonal, up, left)</code>: replace, delete, insert.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost and memory:</strong> <span style="color:#f0e2c8;">O(m·n) time and space; two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Int32Array</code> rows give O(min(m, n)) space when only the number is needed. Walk back through the full table for the edit script.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Build rows with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from</code>, not a shared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fill</code>, and remember <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str[i]</code> is a UTF-16 code unit.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the cell above a deletion?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Going from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i-1][j]</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j]</code> uses one more character of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1</code> but produces nothing more of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word2</code>, so that character was deleted. Moving left to right produces a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word2</code> character without using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1</code>: an insertion.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the actual operations?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the full table and walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[m][n]</code>: if the characters match and the diagonal is equal, keep; else whichever neighbour plus 1 equals the cell tells you replace, delete or insert. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reverse()</code> the list at the end.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if replace costs 2 and insert/delete cost 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Change the constant for the diagonal to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+ 2</code>. Replace is then never better than delete plus insert, and the answer becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m + n - 2 * LCS</code> — in our run 4 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">horse</code> → <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ros</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you allow swapping two adjacent letters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is Damerau–Levenshtein (optimal string alignment): add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i-2][j-2] + 1</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1[i-1] === word2[j-2]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1[i-2] === word2[j-1]</code>. Then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ab</code> → <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ba</code> costs 1 instead of 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The strings are long but you only care if the distance is at most 2. Faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fill only the diagonal band where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.abs(i - j) &lt;= 2</code>; any cell outside it is already more than 2. That is O(k·n) instead of O(m·n), and you can stop early once a whole row exceeds k.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Edit distance (Levenshtein distance)** | Fewest single-character inserts, deletes and replaces turning one string into another |
| **Base case** | Answers written down directly: \`dp[i][0] = i\`, \`dp[0][j] = j\` |
| **Transition** | Equal characters copy the diagonal; otherwise 1 + min(diagonal, up, left) |
| **Edit script (alignment)** | The list of keep / replace / insert / delete steps, found by walking back |
| **Optimal substructure** | The best whole answer is built from best answers to smaller prefixes |
| **Rolling array (two rows)** | Keeping only the previous and current rows because nothing older is read |

---
**Conclusion:** Edit distance is a two-dimensional DP over prefixes: \`dp[i][j]\` is the cheapest way to turn the first i characters of \`word1\` into the first j of \`word2\`, the first row and column are i and j, equal characters copy the diagonal, and different characters take one plus the minimum of replace (diagonal), delete (up) and insert (left). In JavaScript that is an \`Array.from\` table and one \`Math.min\` per cell; keep two \`Int32Array\` rows when only the number matters, or walk back through the full table to list the edits. Our runs showed the payoff: 367,039 recursive calls become 81 table cells, with the same answer of 5.`,
        examples: [
          {
            label: `Edit distance table, distances and the edit script`,
            code: `// dp[i][j] = fewest edits turning a.slice(0, i) into b.slice(0, j)
function editTable(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;      // delete all i characters
  for (let j = 0; j <= n; j++) dp[0][j] = j;      // insert all j characters
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];   // free: characters already match
      else dp[i][j] = 1 + Math.min(dp[i - 1][j - 1],             // replace a[i-1] with b[j-1]
                                   dp[i - 1][j],                 // delete a[i-1]
                                   dp[i][j - 1]);                // insert b[j-1]
    }
  }
  return dp;
}

function editScript(a, b, dp) {
  let i = a.length, j = b.length;
  const ops = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
      ops.push("keep " + a[i - 1]); i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.push("replace " + a[i - 1] + "->" + b[j - 1]); i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push("delete " + a[i - 1]); i--;
    } else {
      ops.push("insert " + b[j - 1]); j--;
    }
  }
  return ops.reverse();
}

function fmt(row) { return "[" + row.join(", ") + "]"; }

let a = "horse", b = "ros";
let dp = editTable(a, b);
console.log("table rows (word1 = horse, word2 = ros):");
console.log("- " + fmt(dp[0]));
for (let i = 1; i <= a.length; i++) console.log(a[i - 1] + " " + fmt(dp[i]));

for (const [x, y] of [["horse", "ros"], ["intention", "execution"], ["kitten", "sitting"],
                      ["", "abc"], ["abc", ""], ["abc", "abc"], ["ab", "ba"]]) {
  console.log('dist("' + x + '", "' + y + '") = ' + editTable(x, y)[x.length][y.length]);
}

for (const [x, y] of [["horse", "ros"], ["intention", "execution"]]) {
  const ops = editScript(x, y, editTable(x, y));
  const paid = ops.filter((op) => !op.startsWith("keep"));
  console.log(x + " -> " + y + ": " + ops.join(", ") + " (" + paid.length + " paid)");
}`,
          },
          {
            label: `Naive recursion vs table, the LCS link, and two rows`,
            code: `let calls = 0;
function naive(a, b, i, j) {
  calls++;
  if (i === a.length) return b.length - j;        // insert the rest of b
  if (j === b.length) return a.length - i;        // delete the rest of a
  if (a[i] === b[j]) return naive(a, b, i + 1, j + 1);
  return 1 + Math.min(naive(a, b, i + 1, j + 1), naive(a, b, i + 1, j), naive(a, b, i, j + 1));
}

function fullTable(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}

function twoRows(a, b) {
  let prev = Int32Array.from({ length: b.length + 1 }, (_, j) => j);   // row i = 0
  for (let i = 1; i <= a.length; i++) {
    const cur = new Int32Array(b.length + 1);
    cur[0] = i;                                   // column 0 of row i is i
    for (let j = 1; j <= b.length; j++)
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
    prev = cur;
  }
  return prev[b.length];
}

// Insert and delete only, no replace: a replace now costs a delete plus an insert.
function indelOnly(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
  for (let i = 0; i <= m; i++)
    for (let j = 0; j <= n; j++) {
      if (i === 0 || j === 0) dp[i][j] = i + j;
      else if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1]);
    }
  return dp[m][n];
}

function lcs(a, b) {
  let prev = new Int32Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Int32Array(b.length + 1);
    for (let j = 1; j <= b.length; j++)
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    prev = cur;
  }
  return prev[b.length];
}

for (const [a, b] of [["kitten", "sitting"], ["sunday", "saturday"], ["intention", "execution"]]) {
  calls = 0;
  const r = naive(a, b, 0, 0);
  console.log(a + " -> " + b + ": naive " + r + " in " + calls + " calls; table " +
              fullTable(a, b) + " in " + a.length * b.length + " cells");
}

for (const [a, b] of [["horse", "ros"], ["kitten", "sitting"], ["abc", "abc"]]) {
  console.log(a + " -> " + b + ": indel-only " + indelOnly(a, b) + ", m + n - 2 * LCS = " +
              (a.length + b.length - 2 * lcs(a, b)));
}

let seed = 99;
function nxt() { seed = (seed * 48271) % 2147483647; return seed; }
let x = "", y = "";
for (let k = 0; k < 700; k++) x += String.fromCharCode(97 + nxt() % 3);
for (let k = 0; k < 500; k++) y += String.fromCharCode(97 + nxt() % 3);
console.log("random 700 x 500: full table " + fullTable(x, y) + ", two rows " + twoRows(x, y));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given two words, return the minimum number of operations to turn the first into the second, where an operation inserts, deletes or replaces one character. Explain your table, then code it in Java."

**What a strong answer should cover:**
- The state \`dp[i][j]\` = fewest edits turning the first i characters of \`word1\` into the first j of \`word2\`.
- The base cases \`dp[i][0] = i\` and \`dp[0][j] = j\` (not zeros), and why.
- The transition: equal characters copy the diagonal; otherwise 1 + min(diagonal = replace, up = delete, left = insert).
- O(m·n) time and space; O(min(m, n)) space with two rows when only the number is needed; walking back for the edit script.
- Java details: zero-filled \`int[][]\` does not give these base cases for free, \`Math.min\` takes only two arguments, \`charAt\` comparisons, and swapping two \`int[]\` rows.

**Clarifying questions expected:**
- Are all three operations allowed, and do they all cost 1?
- Does swapping two adjacent characters count as one edit?
- Do you need the edit operations or just the count?

**Code / implementation expected:** Yes — a bottom-up \`int[][]\` table in Java; mention the two-row optimisation and how to recover the operations.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, arrays and 2D arrays.  
**Difficulty:** Hard  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You type **"horse"** but meant **"ros"** (it happens). Your phone's keyboard has to decide how "far apart" those two words are, so it can suggest the closest real word. The natural measure is: **how many single-letter fixes does it take?** A fix is one of three things — **insert** a letter, **delete** a letter, or **replace** one letter with another. "horse" becomes "ros" in three fixes: replace h with r (rorse), delete r (rose), delete e (ros). No two-fix route exists.

That minimum number of fixes is the **edit distance**. Spell checkers rank suggestions by it, search engines use it for "did you mean…?", bioinformatics uses weighted versions to compare DNA, and fuzzy matching in databases is built on it.

It is a "hard" interview question not because the code is long — it is about fifteen lines — but because you must get three things exactly right: what a cell means, what the first row and column hold, and which neighbour stands for which operation. Get those right and it is the same table you would fill for the [longest common subsequence](/interview-question/how-do-you-find-the-longest-common-subsequence), with a different rule in each cell.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which operations are allowed: insert, delete **and** replace? | With only insert and delete, the answer is m + n − 2·LCS; with replace it is Levenshtein distance. |
| Does every operation cost 1? | Different costs (say replace = 2) change only the "+1"s in the recurrence. |
| Does swapping two adjacent letters count as one edit? | That is Damerau–Levenshtein distance; it needs an extra transition looking two cells back. |
| Do you need just the number, or the list of edits? | The number needs two rows; the edit script needs the full table to walk back through. |
| How long are the strings? | m · n cells: two 1,000-character strings are a million cells and fine; two 100,000-character strings are not. |
| Is there a threshold ("is the distance at most k?") | Then only a diagonal band of width 2k + 1 matters, which is far faster. |

## 3. The Core Idea in Plain Words

📌 **Interview term: Edit distance (Levenshtein distance)** — the smallest number of single-character insertions, deletions and replacements that turn one string into the other. dist("horse", "ros") = 3.

As with LCS, think about **prefixes**. Let \`dp[i][j]\` be the fewest edits that turn the first i characters of \`word1\` into the first j characters of \`word2\`.

**Base cases (the first row and column).** Turning i characters into the empty string takes i deletions, so \`dp[i][0] = i\`. Turning the empty string into j characters takes j insertions, so \`dp[0][j] = j\`. Unlike LCS, these are *not* zeros — this is the most common bug.

**The recurrence.** Look at the last characters \`word1[i-1]\` and \`word2[j-1]\`:

- **They are equal.** Keep it for free: \`dp[i][j] = dp[i-1][j-1]\`.
- **They differ.** The cheapest of three moves, each costing 1:
  - **replace** \`word1[i-1]\` with \`word2[j-1]\`, then fix the rest: \`dp[i-1][j-1] + 1\` (diagonal)
  - **delete** \`word1[i-1]\`: \`dp[i-1][j] + 1\` (the cell above)
  - **insert** \`word2[j-1]\` at the end: \`dp[i][j-1] + 1\` (the cell to the left)

📌 **Interview term: Base case** — the answers for the smallest subproblems, written down directly rather than computed. Here the empty-prefix row and column: \`dp[i][0] = i\`, \`dp[0][j] = j\`.

📌 **Interview term: Transition** — the rule that computes one cell from smaller ones. Here: equal characters copy the diagonal; different characters take 1 + the minimum of diagonal, up and left.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 320" role="img" aria-label="Each neighbour of an edit distance cell is one operation. The diagonal is keep or replace, the cell above is delete, the cell to the left is insert">
  <defs>
    <marker id="b29q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="30" width="230" height="74" rx="10"/>
  <text class="d-text" x="155" y="62" text-anchor="middle">dp[i-1][j-1]</text>
  <text class="d-sub" x="155" y="86" text-anchor="middle">diagonal</text>
  <rect class="d-box-muted" x="390" y="30" width="230" height="74" rx="10"/>
  <text class="d-text" x="505" y="62" text-anchor="middle">dp[i-1][j]</text>
  <text class="d-sub" x="505" y="86" text-anchor="middle">up</text>
  <rect class="d-box-muted" x="40" y="216" width="230" height="74" rx="10"/>
  <text class="d-text" x="155" y="248" text-anchor="middle">dp[i][j-1]</text>
  <text class="d-sub" x="155" y="272" text-anchor="middle">left</text>
  <rect class="d-box-accent" x="390" y="216" width="230" height="74" rx="10"/>
  <text class="d-text" x="505" y="248" text-anchor="middle">dp[i][j]</text>
  <text class="d-sub" x="505" y="272" text-anchor="middle">this cell</text>
  <path class="d-edge-accent" d="M 272 104 L 386 212" marker-end="url(#b29q3-arrow)"/>
  <text class="d-sub" x="196" y="152" text-anchor="middle">equal: keep, cost 0</text>
  <text class="d-sub" x="196" y="174" text-anchor="middle">else replace, cost 1</text>
  <path class="d-edge" d="M 505 106 L 505 212" marker-end="url(#b29q3-arrow)"/>
  <text class="d-sub" x="580" y="165" text-anchor="middle">delete, 1</text>
  <path class="d-edge" d="M 272 253 L 386 253" marker-end="url(#b29q3-arrow)"/>
  <text class="d-sub" x="329" y="236" text-anchor="middle">insert, 1</text>
</svg>

A way to remember the directions: moving **down** a row uses up one more character of \`word1\` without producing anything of \`word2\` — that is a deletion. Moving **right** produces one more character of \`word2\` without using \`word1\` — an insertion. Moving **diagonally** uses one of each — a keep or a replace.

Here is the full table for "horse" → "ros", exactly as example 1 prints it. The highlighted cells are the path the walk back takes:

<svg class="iq-diagram" width="100%" viewBox="0 0 560 388" role="img" aria-label="The edit distance table for horse and ros. The highlighted path ends in the bottom right cell with value 3">
  <text class="d-sub" x="280" y="24" text-anchor="middle">rows: prefixes of horse, columns: prefixes of ros</text>
  <text class="d-text" x="199" y="56" text-anchor="middle">-</text>
  <text class="d-text" x="263" y="56" text-anchor="middle">r</text>
  <text class="d-text" x="327" y="56" text-anchor="middle">o</text>
  <text class="d-text" x="391" y="56" text-anchor="middle">s</text>
  <text class="d-text" x="137" y="100" text-anchor="middle">-</text>
  <rect class="d-box-accent" x="170" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="234" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="100" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="298" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="100" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="362" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="100" text-anchor="middle">3</text>
  <text class="d-text" x="137" y="148" text-anchor="middle">h</text>
  <rect class="d-box-muted" x="170" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="148" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="234" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="148" text-anchor="middle">2</text>
  <rect class="d-box" x="362" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="148" text-anchor="middle">3</text>
  <text class="d-text" x="137" y="196" text-anchor="middle">o</text>
  <rect class="d-box-muted" x="170" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="196" text-anchor="middle">2</text>
  <rect class="d-box" x="234" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="196" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="298" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="196" text-anchor="middle">1</text>
  <rect class="d-box" x="362" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="196" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="244" text-anchor="middle">r</text>
  <rect class="d-box-muted" x="170" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="244" text-anchor="middle">3</text>
  <rect class="d-box" x="234" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="244" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="298" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="244" text-anchor="middle">2</text>
  <rect class="d-box" x="362" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="244" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="292" text-anchor="middle">s</text>
  <rect class="d-box-muted" x="170" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="292" text-anchor="middle">4</text>
  <rect class="d-box" x="234" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="292" text-anchor="middle">3</text>
  <rect class="d-box" x="298" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="292" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="362" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="292" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="340" text-anchor="middle">e</text>
  <rect class="d-box-muted" x="170" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="340" text-anchor="middle">5</text>
  <rect class="d-box" x="234" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="340" text-anchor="middle">4</text>
  <rect class="d-box" x="298" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="340" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="362" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="340" text-anchor="middle">3</text>
</svg>

The answer is the bottom-right cell, 3. Following the highlighted path from the top-left: replace h → r (diagonal, 0 → 1), keep o (diagonal, stays 1), delete r (down, 1 → 2), keep s (diagonal, stays 2), delete e (down, 2 → 3).

📌 **Interview term: Edit script (alignment)** — the actual list of keep / replace / insert / delete steps, recovered by walking back from \`dp[m][n]\` and asking at each cell which neighbour produced its value.

## 4. From Brute Force to the Table

1. **Plain recursion.** Compare \`word1[i]\` and \`word2[j]\` from the front; on a mismatch try all three operations and take the cheapest. It branches three ways, and the same (i, j) is reached again and again: "intention" → "execution" (9 letters each) takes **367,039** calls in example 2.
2. **Memoization.** Cache each (i, j). There are only (m + 1)·(n + 1) pairs, so the work becomes O(m·n) — the general idea is on [What is memoization?](/interview-question/what-is-memoization).
3. **Tabulation.** Fill \`dp\` row by row; every cell's three inputs are above or to the left, so they are always ready. The same pair is **81** cells.
4. **Two rows.** Row i reads only row i − 1 and itself, so keep two rows for O(n) memory — but then you cannot walk back for the edit script.

📌 **Interview term: Optimal substructure** — the best answer for the whole problem is built from best answers to smaller pieces. The cheapest edit of the full prefixes ends with one operation applied to a cheapest edit of shorter prefixes. Together with overlapping subproblems, that is what makes this [dynamic programming](/interview-question/what-is-dynamic-programming).

**The link to LCS.** If replace is *not* allowed, a replace costs a delete plus an insert, and the distance becomes \`m + n − 2·LCS(word1, word2)\`: every character outside a longest common subsequence is deleted from one side or inserted on the other. Example 2 checks this on three pairs.

## 5. The Code in Java

The table and the walk back that recovers the edit script:

~~~java
    // dp[i][j] = fewest edits turning a[0..i) into b[0..j)
    static int[][] editTable(String a, String b) {
        int m = a.length(), n = b.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 0; i <= m; i++) dp[i][0] = i;      // delete all i characters
        for (int j = 0; j <= n; j++) dp[0][j] = j;      // insert all j characters
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1];   // free
                else dp[i][j] = 1 + Math.min(dp[i - 1][j - 1],                         // replace
                                    Math.min(dp[i - 1][j],                             // delete
                                             dp[i][j - 1]));                           // insert
            }
        }
        return dp;
    }

    static List<String> editScript(String a, String b, int[][] dp) {
        int i = a.length(), j = b.length();
        List<String> ops = new ArrayList<>();
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && a.charAt(i - 1) == b.charAt(j - 1) && dp[i][j] == dp[i - 1][j - 1]) {
                ops.add("keep " + a.charAt(i - 1)); i--; j--;
            } else if (i > 0 && j > 0 && dp[i][j] == dp[i - 1][j - 1] + 1) {
                ops.add("replace " + a.charAt(i - 1) + "->" + b.charAt(j - 1)); i--; j--;
            } else if (i > 0 && dp[i][j] == dp[i - 1][j] + 1) {
                ops.add("delete " + a.charAt(i - 1)); i--;
            } else {
                ops.add("insert " + b.charAt(j - 1)); j--;
            }
        }
        Collections.reverse(ops);
        return ops;
    }
~~~

**What to point out in this code:**

- The two small loops before the main loop **are** the base cases. Java zero-fills \`new int[m + 1][n + 1]\`, which is right for LCS but **wrong** here: without those loops, dist("abc", "") would come out 0.
- \`Math.min\` takes exactly two arguments, so three options need \`Math.min(x, Math.min(y, z))\`. The comments name which neighbour is which operation — say this out loud in the interview.
- \`a.charAt(i - 1) == b.charAt(j - 1)\` compares \`char\` primitives, so \`==\` is correct. A \`char\` is a UTF-16 code unit; characters outside the Basic Multilingual Plane (most emoji) take two.
- \`editScript\` asks, at each cell, "which neighbour could have produced this value?" in a fixed order — keep, replace, delete, insert — and moves there, collecting into an \`ArrayList\` and calling \`Collections.reverse\` at the end. The \`i > 0\` / \`j > 0\` guards prevent an \`ArrayIndexOutOfBoundsException\` on the table edges.

**When you only need the number**, keep two \`int[]\` rows and swap the references; \`cur[0] = i\` re-applies the base case on each new row:

~~~java
    static int twoRows(String a, String b) {
        int n = b.length();
        int[] prev = new int[n + 1], cur = new int[n + 1];
        for (int j = 0; j <= n; j++) prev[j] = j;       // row i = 0
        for (int i = 1; i <= a.length(); i++) {
            cur[0] = i;                                 // column 0 of row i is i
            for (int j = 1; j <= n; j++)
                cur[j] = a.charAt(i - 1) == b.charAt(j - 1) ? prev[j - 1]
                       : 1 + Math.min(prev[j - 1], Math.min(prev[j], cur[j - 1]));
            int[] t = prev; prev = cur; cur = t;
        }
        return prev[n];
    }

~~~

📌 **Interview term: Rolling array (two rows)** — keeping only the previous and current rows because no cell reads anything older. Space drops from O(m·n) to O(n); swap the arguments if you want O(min(m, n)).

Reusing the old array is safe because every \`cur[j]\` is written (index 0 first) before it is read in that row. The JDK has no edit-distance method; in an interview you write the table.

## 6. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the table for "horse" → "ros", seven distances, and two edit scripts** prints:

~~~text
table rows (word1 = horse, word2 = ros):
- [0, 1, 2, 3]
h [1, 1, 2, 3]
o [2, 2, 1, 2]
r [3, 2, 2, 2]
s [4, 3, 3, 2]
e [5, 4, 4, 3]
dist("horse", "ros") = 3
dist("intention", "execution") = 5
dist("kitten", "sitting") = 3
dist("", "abc") = 3
dist("abc", "") = 3
dist("abc", "abc") = 0
dist("ab", "ba") = 2
horse -> ros: replace h->r, keep o, delete r, keep s, delete e (3 paid)
intention -> execution: replace i->e, replace n->x, replace t->e, replace e->c, replace n->u, keep t, keep i, keep o, keep n (5 paid)
~~~

- The table rows match the diagram: the first row is 0, 1, 2, 3 and the first column is 0 to 5 — the base cases.
- "kitten" → "sitting" is 3 (replace k, replace e, insert g), and "ab" → "ba" is 2: plain Levenshtein has no swap move.
- Each script lists the free keeps too, and counts only the paid steps: 3 for horse → ros, 5 for intention → execution.

**Example 2 — recursion vs table, the LCS link, and two rows** prints:

~~~text
kitten -> sitting: naive 3 in 2763 calls; table 3 in 42 cells
sunday -> saturday: naive 3 in 3692 calls; table 3 in 48 cells
intention -> execution: naive 5 in 367039 calls; table 5 in 81 cells
horse -> ros: indel-only 4, m + n - 2 * LCS = 4
kitten -> sitting: indel-only 5, m + n - 2 * LCS = 5
abc -> abc: indel-only 0, m + n - 2 * LCS = 0
random 700 x 500: full table 317, two rows 317
~~~

- The plain recursion needs **2,763** calls for kitten → sitting and **367,039** for intention → execution; the table fills 42 and 81 cells for the same answers.
- With only insert and delete allowed, the distance equals \`m + n − 2·LCS\` on all three pairs (4 for horse → ros, where Levenshtein gives 3 because one replace saves a delete + insert).
- On two random 700- and 500-character strings the full table and the two-row version agree: 317.

## 7. Complexity

m and n are the lengths of \`word1\` and \`word2\`.

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential, up to O(3^(m+n)) | O(m + n) stack | a mismatch branches three ways and subproblems repeat |
| Memoized recursion | O(m·n) | O(m·n) + O(m + n) stack | each (i, j) solved once |
| Full table | O(m·n) | O(m·n) | one O(1) step per cell |
| Two rows | O(m·n) | O(n), or O(min(m, n)) after a swap | only the previous row is read |
| Edit script | O(m + n) extra | needs the full table | every step decreases i, j or both |

An \`int\` cell is 4 bytes, so the two-row version of two 100,000-character strings needs under a megabyte, while the full table would need 40 GB and fail with \`OutOfMemoryError\`. The naive call counter in example 2 is a \`long\`, because exponential counts outgrow \`int\` fast. If you only need to know whether the distance is at most k, fill only the band of cells with |i − j| ≤ k — O(k·min(m, n)) work.

## 8. Edge Cases

- **An empty string.** dist("", "abc") = 3 (three inserts) and dist("abc", "") = 3 (three deletes) — the base row and column, nothing else.
- **Equal strings.** 0: every step is a free diagonal keep.
- **Swapped neighbours.** dist("ab", "ba") = 2 in Levenshtein distance (two replaces). If the interviewer expects 1, they mean Damerau–Levenshtein with a transposition move.
- **Different lengths.** The distance is at least |m − n| (that many inserts or deletes are unavoidable) and at most max(m, n).
- **Several optimal edit scripts.** "intention" → "execution" has more than one script of 5 edits; the walk back's preference order (keep, replace, delete, insert) decides which one you print — ours is five replaces.
- **Case and Unicode.** "A" and "a" differ unless you normalise first; decide what a "character" is before comparing.

## Common Pitfalls

- **Trusting Java zero-fill for the base cases.** \`dp[i][0]\` must be i and \`dp[0][j]\` must be j; the default zeros make "abc" → "" come out 0.
- **Mixing up the directions.** Up (\`dp[i-1][j]\`) is delete from \`word1\`, left (\`dp[i][j-1]\`) is insert into \`word1\`. The number is the same either way, but the edit script comes out wrong.
- **Adding 1 on a match.** Equal characters copy the diagonal with no +1.
- **Three-way \`Math.min\`.** \`Math.min(a, b, c)\` does not compile; nest the calls.
- **Comparing \`String\`s with \`==\`.** Fine for \`charAt\` values, wrong for \`substring\` results.
- **Allocating a new row per iteration in a hot loop.** It works, but swapping two arrays avoids m allocations.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j]</code> is the fewest edits turning the first i characters of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1</code> into the first j of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word2</code>. The answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[m][n]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Base cases:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][0] = i</code> (delete everything) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0][j] = j</code> (insert everything). Java zero-fills arrays, so write these loops explicitly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The transition:</strong> <span style="color:#f0e2c8;">Equal last characters copy the diagonal. Otherwise 1 + <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min(diagonal, Math.min(up, left))</code>: replace, delete, insert.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost and memory:</strong> <span style="color:#f0e2c8;">O(m·n) time and space; two swapped <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> rows give O(min(m, n)) space when only the number is needed. Walk back through the full table for the edit script.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">charAt</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> for characters, nested <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> for any counter of exponential work.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the cell above a deletion?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Going from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i-1][j]</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j]</code> uses one more character of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1</code> but produces nothing more of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word2</code>, so that character was deleted. Moving left to right produces a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word2</code> character without using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1</code>: an insertion.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the actual operations?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the full table and walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[m][n]</code>: if the characters match and the diagonal is equal, keep; else whichever neighbour plus 1 equals the cell tells you replace, delete or insert. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.reverse</code> at the end.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if replace costs 2 and insert/delete cost 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Change the diagonal constant to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+ 2</code>. Replace is then never better than delete plus insert, and the answer becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m + n - 2 * LCS</code> — in our run 4 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">horse</code> → <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ros</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you allow swapping two adjacent letters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is Damerau–Levenshtein (optimal string alignment): add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i-2][j-2] + 1</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1.charAt(i-1) == word2.charAt(j-2)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1.charAt(i-2) == word2.charAt(j-1)</code>. Then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ab</code> → <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ba</code> costs 1 instead of 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The strings are long but you only care if the distance is at most 2. Faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fill only the diagonal band where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.abs(i - j) &lt;= 2</code>; any cell outside it is already more than 2. That is O(k·n) instead of O(m·n), and you can stop early once a whole row exceeds k.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Edit distance (Levenshtein distance)** | Fewest single-character inserts, deletes and replaces turning one string into another |
| **Base case** | Answers written down directly: \`dp[i][0] = i\`, \`dp[0][j] = j\` |
| **Transition** | Equal characters copy the diagonal; otherwise 1 + min(diagonal, up, left) |
| **Edit script (alignment)** | The list of keep / replace / insert / delete steps, found by walking back |
| **Optimal substructure** | The best whole answer is built from best answers to smaller prefixes |
| **Rolling array (two rows)** | Keeping only the previous and current rows because nothing older is read |

---
**Conclusion:** Edit distance is a two-dimensional DP over prefixes: \`dp[i][j]\` is the cheapest way to turn the first i characters of \`word1\` into the first j of \`word2\`, the first row and column are i and j, equal characters copy the diagonal, and different characters take one plus the minimum of replace (diagonal), delete (up) and insert (left). In Java, write the base-case loops explicitly — zero-fill is not enough here — nest \`Math.min\`, and swap two \`int[]\` rows when only the number matters, or walk back through the full table to list the edits. Our runs showed the payoff: 367,039 recursive calls become 81 table cells, with the same answer of 5.`,
        examples: [
          {
            label: `Edit distance table, distances and the edit script`,
            code: `import java.util.*;

public class Main {
    // dp[i][j] = fewest edits turning a[0..i) into b[0..j)
    static int[][] editTable(String a, String b) {
        int m = a.length(), n = b.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 0; i <= m; i++) dp[i][0] = i;      // delete all i characters
        for (int j = 0; j <= n; j++) dp[0][j] = j;      // insert all j characters
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1];   // free
                else dp[i][j] = 1 + Math.min(dp[i - 1][j - 1],                         // replace
                                    Math.min(dp[i - 1][j],                             // delete
                                             dp[i][j - 1]));                           // insert
            }
        }
        return dp;
    }

    static List<String> editScript(String a, String b, int[][] dp) {
        int i = a.length(), j = b.length();
        List<String> ops = new ArrayList<>();
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && a.charAt(i - 1) == b.charAt(j - 1) && dp[i][j] == dp[i - 1][j - 1]) {
                ops.add("keep " + a.charAt(i - 1)); i--; j--;
            } else if (i > 0 && j > 0 && dp[i][j] == dp[i - 1][j - 1] + 1) {
                ops.add("replace " + a.charAt(i - 1) + "->" + b.charAt(j - 1)); i--; j--;
            } else if (i > 0 && dp[i][j] == dp[i - 1][j] + 1) {
                ops.add("delete " + a.charAt(i - 1)); i--;
            } else {
                ops.add("insert " + b.charAt(j - 1)); j--;
            }
        }
        Collections.reverse(ops);
        return ops;
    }

    static String fmt(int[] row) {
        StringBuilder sb = new StringBuilder("[");
        for (int k = 0; k < row.length; k++) { if (k > 0) sb.append(", "); sb.append(row[k]); }
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        String a = "horse", b = "ros";
        int[][] dp = editTable(a, b);
        System.out.println("table rows (word1 = horse, word2 = ros):");
        System.out.println("- " + fmt(dp[0]));
        for (int i = 1; i <= a.length(); i++) System.out.println(a.charAt(i - 1) + " " + fmt(dp[i]));

        String[][] pairs = {{"horse", "ros"}, {"intention", "execution"}, {"kitten", "sitting"},
                            {"", "abc"}, {"abc", ""}, {"abc", "abc"}, {"ab", "ba"}};
        for (String[] p : pairs)
            System.out.println("dist(\\"" + p[0] + "\\", \\"" + p[1] + "\\") = " + editTable(p[0], p[1])[p[0].length()][p[1].length()]);

        for (String[] p : new String[][]{{"horse", "ros"}, {"intention", "execution"}}) {
            List<String> ops = editScript(p[0], p[1], editTable(p[0], p[1]));
            long paid = ops.stream().filter(op -> !op.startsWith("keep")).count();
            System.out.println(p[0] + " -> " + p[1] + ": " + String.join(", ", ops) + " (" + paid + " paid)");
        }
    }
}`,
          },
          {
            label: `Naive recursion vs table, the LCS link, and two rows`,
            code: `public class Main {
    static long calls = 0;
    static int naive(String a, String b, int i, int j) {
        calls++;
        if (i == a.length()) return b.length() - j;     // insert the rest of b
        if (j == b.length()) return a.length() - i;     // delete the rest of a
        if (a.charAt(i) == b.charAt(j)) return naive(a, b, i + 1, j + 1);
        return 1 + Math.min(naive(a, b, i + 1, j + 1), Math.min(naive(a, b, i + 1, j), naive(a, b, i, j + 1)));
    }

    static int fullTable(String a, String b) {
        int m = a.length(), n = b.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 0; i <= m; i++) dp[i][0] = i;
        for (int j = 0; j <= n; j++) dp[0][j] = j;
        for (int i = 1; i <= m; i++)
            for (int j = 1; j <= n; j++)
                dp[i][j] = a.charAt(i - 1) == b.charAt(j - 1) ? dp[i - 1][j - 1]
                         : 1 + Math.min(dp[i - 1][j - 1], Math.min(dp[i - 1][j], dp[i][j - 1]));
        return dp[m][n];
    }

    static int twoRows(String a, String b) {
        int n = b.length();
        int[] prev = new int[n + 1], cur = new int[n + 1];
        for (int j = 0; j <= n; j++) prev[j] = j;       // row i = 0
        for (int i = 1; i <= a.length(); i++) {
            cur[0] = i;                                 // column 0 of row i is i
            for (int j = 1; j <= n; j++)
                cur[j] = a.charAt(i - 1) == b.charAt(j - 1) ? prev[j - 1]
                       : 1 + Math.min(prev[j - 1], Math.min(prev[j], cur[j - 1]));
            int[] t = prev; prev = cur; cur = t;
        }
        return prev[n];
    }

    // Insert and delete only, no replace: a replace now costs a delete plus an insert.
    static int indelOnly(String a, String b) {
        int m = a.length(), n = b.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 0; i <= m; i++)
            for (int j = 0; j <= n; j++) {
                if (i == 0 || j == 0) dp[i][j] = i + j;
                else if (a.charAt(i - 1) == b.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1];
                else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1]);
            }
        return dp[m][n];
    }

    static int lcs(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 1; i <= a.length(); i++)
            for (int j = 1; j <= b.length(); j++)
                dp[i][j] = a.charAt(i - 1) == b.charAt(j - 1) ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        return dp[a.length()][b.length()];
    }

    static long seed = 99;
    static long nxt() { seed = seed * 48271 % 2147483647L; return seed; }

    public static void main(String[] args) {
        for (String[] p : new String[][]{{"kitten", "sitting"}, {"sunday", "saturday"}, {"intention", "execution"}}) {
            calls = 0;
            int r = naive(p[0], p[1], 0, 0);
            System.out.println(p[0] + " -> " + p[1] + ": naive " + r + " in " + calls + " calls; table "
                    + fullTable(p[0], p[1]) + " in " + p[0].length() * p[1].length() + " cells");
        }
        for (String[] p : new String[][]{{"horse", "ros"}, {"kitten", "sitting"}, {"abc", "abc"}})
            System.out.println(p[0] + " -> " + p[1] + ": indel-only " + indelOnly(p[0], p[1]) + ", m + n - 2 * LCS = "
                    + (p[0].length() + p[1].length() - 2 * lcs(p[0], p[1])));

        StringBuilder x = new StringBuilder(), y = new StringBuilder();
        for (int k = 0; k < 700; k++) x.append((char) (97 + nxt() % 3));
        for (int k = 0; k < 500; k++) y.append((char) (97 + nxt() % 3));
        System.out.println("random 700 x 500: full table " + fullTable(x.toString(), y.toString())
                + ", two rows " + twoRows(x.toString(), y.toString()));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given two words, return the minimum number of operations to turn the first into the second, where an operation inserts, deletes or replaces one character. Explain your table, then code it in C++."

**What a strong answer should cover:**
- The state \`dp[i][j]\` = fewest edits turning the first i characters of \`word1\` into the first j of \`word2\`.
- The base cases \`dp[i][0] = i\` and \`dp[0][j] = j\` (not zeros), and why.
- The transition: equal characters copy the diagonal; otherwise 1 + min(diagonal = replace, up = delete, left = insert).
- O(m·n) time and space; O(min(m, n)) space with two rows when only the number is needed; walking back for the edit script.
- C++ details: explicit base-case loops on a zero-initialised \`vector\`, \`std::min({a, b, c})\`, unsigned \`size_t\` underflow when walking back, and an O(1) \`swap\` of two rows.

**Clarifying questions expected:**
- Are all three operations allowed, and do they all cost 1?
- Does swapping two adjacent characters count as one edit?
- Do you need the edit operations or just the count?

**Code / implementation expected:** Yes — a bottom-up \`vector<vector<int>>\` table in C++; mention the two-row optimisation and how to recover the operations.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, \`std::vector\` and \`std::string\`.  
**Difficulty:** Hard  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You type **"horse"** but meant **"ros"** (it happens). Your phone's keyboard has to decide how "far apart" those two words are, so it can suggest the closest real word. The natural measure is: **how many single-letter fixes does it take?** A fix is one of three things — **insert** a letter, **delete** a letter, or **replace** one letter with another. "horse" becomes "ros" in three fixes: replace h with r (rorse), delete r (rose), delete e (ros). No two-fix route exists.

That minimum number of fixes is the **edit distance**. Spell checkers rank suggestions by it, search engines use it for "did you mean…?", bioinformatics uses weighted versions to compare DNA, and fuzzy matching in databases is built on it.

It is a "hard" interview question not because the code is long — it is about fifteen lines — but because you must get three things exactly right: what a cell means, what the first row and column hold, and which neighbour stands for which operation. Get those right and it is the same table you would fill for the [longest common subsequence](/interview-question/how-do-you-find-the-longest-common-subsequence), with a different rule in each cell.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which operations are allowed: insert, delete **and** replace? | With only insert and delete, the answer is m + n − 2·LCS; with replace it is Levenshtein distance. |
| Does every operation cost 1? | Different costs (say replace = 2) change only the "+1"s in the recurrence. |
| Does swapping two adjacent letters count as one edit? | That is Damerau–Levenshtein distance; it needs an extra transition looking two cells back. |
| Do you need just the number, or the list of edits? | The number needs two rows; the edit script needs the full table to walk back through. |
| How long are the strings? | m · n cells: two 1,000-character strings are a million cells and fine; two 100,000-character strings are not. |
| Is there a threshold ("is the distance at most k?") | Then only a diagonal band of width 2k + 1 matters, which is far faster. |

## 3. The Core Idea in Plain Words

📌 **Interview term: Edit distance (Levenshtein distance)** — the smallest number of single-character insertions, deletions and replacements that turn one string into the other. dist("horse", "ros") = 3.

As with LCS, think about **prefixes**. Let \`dp[i][j]\` be the fewest edits that turn the first i characters of \`word1\` into the first j characters of \`word2\`.

**Base cases (the first row and column).** Turning i characters into the empty string takes i deletions, so \`dp[i][0] = i\`. Turning the empty string into j characters takes j insertions, so \`dp[0][j] = j\`. Unlike LCS, these are *not* zeros — this is the most common bug.

**The recurrence.** Look at the last characters \`word1[i-1]\` and \`word2[j-1]\`:

- **They are equal.** Keep it for free: \`dp[i][j] = dp[i-1][j-1]\`.
- **They differ.** The cheapest of three moves, each costing 1:
  - **replace** \`word1[i-1]\` with \`word2[j-1]\`, then fix the rest: \`dp[i-1][j-1] + 1\` (diagonal)
  - **delete** \`word1[i-1]\`: \`dp[i-1][j] + 1\` (the cell above)
  - **insert** \`word2[j-1]\` at the end: \`dp[i][j-1] + 1\` (the cell to the left)

📌 **Interview term: Base case** — the answers for the smallest subproblems, written down directly rather than computed. Here the empty-prefix row and column: \`dp[i][0] = i\`, \`dp[0][j] = j\`.

📌 **Interview term: Transition** — the rule that computes one cell from smaller ones. Here: equal characters copy the diagonal; different characters take 1 + the minimum of diagonal, up and left.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 320" role="img" aria-label="Each neighbour of an edit distance cell is one operation. The diagonal is keep or replace, the cell above is delete, the cell to the left is insert">
  <defs>
    <marker id="b29q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="30" width="230" height="74" rx="10"/>
  <text class="d-text" x="155" y="62" text-anchor="middle">dp[i-1][j-1]</text>
  <text class="d-sub" x="155" y="86" text-anchor="middle">diagonal</text>
  <rect class="d-box-muted" x="390" y="30" width="230" height="74" rx="10"/>
  <text class="d-text" x="505" y="62" text-anchor="middle">dp[i-1][j]</text>
  <text class="d-sub" x="505" y="86" text-anchor="middle">up</text>
  <rect class="d-box-muted" x="40" y="216" width="230" height="74" rx="10"/>
  <text class="d-text" x="155" y="248" text-anchor="middle">dp[i][j-1]</text>
  <text class="d-sub" x="155" y="272" text-anchor="middle">left</text>
  <rect class="d-box-accent" x="390" y="216" width="230" height="74" rx="10"/>
  <text class="d-text" x="505" y="248" text-anchor="middle">dp[i][j]</text>
  <text class="d-sub" x="505" y="272" text-anchor="middle">this cell</text>
  <path class="d-edge-accent" d="M 272 104 L 386 212" marker-end="url(#b29q3-arrow)"/>
  <text class="d-sub" x="196" y="152" text-anchor="middle">equal: keep, cost 0</text>
  <text class="d-sub" x="196" y="174" text-anchor="middle">else replace, cost 1</text>
  <path class="d-edge" d="M 505 106 L 505 212" marker-end="url(#b29q3-arrow)"/>
  <text class="d-sub" x="580" y="165" text-anchor="middle">delete, 1</text>
  <path class="d-edge" d="M 272 253 L 386 253" marker-end="url(#b29q3-arrow)"/>
  <text class="d-sub" x="329" y="236" text-anchor="middle">insert, 1</text>
</svg>

A way to remember the directions: moving **down** a row uses up one more character of \`word1\` without producing anything of \`word2\` — that is a deletion. Moving **right** produces one more character of \`word2\` without using \`word1\` — an insertion. Moving **diagonally** uses one of each — a keep or a replace.

Here is the full table for "horse" → "ros", exactly as example 1 prints it. The highlighted cells are the path the walk back takes:

<svg class="iq-diagram" width="100%" viewBox="0 0 560 388" role="img" aria-label="The edit distance table for horse and ros. The highlighted path ends in the bottom right cell with value 3">
  <text class="d-sub" x="280" y="24" text-anchor="middle">rows: prefixes of horse, columns: prefixes of ros</text>
  <text class="d-text" x="199" y="56" text-anchor="middle">-</text>
  <text class="d-text" x="263" y="56" text-anchor="middle">r</text>
  <text class="d-text" x="327" y="56" text-anchor="middle">o</text>
  <text class="d-text" x="391" y="56" text-anchor="middle">s</text>
  <text class="d-text" x="137" y="100" text-anchor="middle">-</text>
  <rect class="d-box-accent" x="170" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="234" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="100" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="298" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="100" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="362" y="73" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="100" text-anchor="middle">3</text>
  <text class="d-text" x="137" y="148" text-anchor="middle">h</text>
  <rect class="d-box-muted" x="170" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="148" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="234" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="298" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="148" text-anchor="middle">2</text>
  <rect class="d-box" x="362" y="121" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="148" text-anchor="middle">3</text>
  <text class="d-text" x="137" y="196" text-anchor="middle">o</text>
  <rect class="d-box-muted" x="170" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="196" text-anchor="middle">2</text>
  <rect class="d-box" x="234" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="196" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="298" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="196" text-anchor="middle">1</text>
  <rect class="d-box" x="362" y="169" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="196" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="244" text-anchor="middle">r</text>
  <rect class="d-box-muted" x="170" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="244" text-anchor="middle">3</text>
  <rect class="d-box" x="234" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="244" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="298" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="244" text-anchor="middle">2</text>
  <rect class="d-box" x="362" y="217" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="244" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="292" text-anchor="middle">s</text>
  <rect class="d-box-muted" x="170" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="292" text-anchor="middle">4</text>
  <rect class="d-box" x="234" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="292" text-anchor="middle">3</text>
  <rect class="d-box" x="298" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="292" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="362" y="265" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="292" text-anchor="middle">2</text>
  <text class="d-text" x="137" y="340" text-anchor="middle">e</text>
  <rect class="d-box-muted" x="170" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="199" y="340" text-anchor="middle">5</text>
  <rect class="d-box" x="234" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="263" y="340" text-anchor="middle">4</text>
  <rect class="d-box" x="298" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="327" y="340" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="362" y="313" width="58" height="42" rx="6"/>
  <text class="d-text" x="391" y="340" text-anchor="middle">3</text>
</svg>

The answer is the bottom-right cell, 3. Following the highlighted path from the top-left: replace h → r (diagonal, 0 → 1), keep o (diagonal, stays 1), delete r (down, 1 → 2), keep s (diagonal, stays 2), delete e (down, 2 → 3).

📌 **Interview term: Edit script (alignment)** — the actual list of keep / replace / insert / delete steps, recovered by walking back from \`dp[m][n]\` and asking at each cell which neighbour produced its value.

## 4. From Brute Force to the Table

1. **Plain recursion.** Compare \`word1[i]\` and \`word2[j]\` from the front; on a mismatch try all three operations and take the cheapest. It branches three ways, and the same (i, j) is reached again and again: "intention" → "execution" (9 letters each) takes **367,039** calls in example 2.
2. **Memoization.** Cache each (i, j). There are only (m + 1)·(n + 1) pairs, so the work becomes O(m·n) — the general idea is on [What is memoization?](/interview-question/what-is-memoization).
3. **Tabulation.** Fill \`dp\` row by row; every cell's three inputs are above or to the left, so they are always ready. The same pair is **81** cells.
4. **Two rows.** Row i reads only row i − 1 and itself, so keep two rows for O(n) memory — but then you cannot walk back for the edit script.

📌 **Interview term: Optimal substructure** — the best answer for the whole problem is built from best answers to smaller pieces. The cheapest edit of the full prefixes ends with one operation applied to a cheapest edit of shorter prefixes. Together with overlapping subproblems, that is what makes this [dynamic programming](/interview-question/what-is-dynamic-programming).

**The link to LCS.** If replace is *not* allowed, a replace costs a delete plus an insert, and the distance becomes \`m + n − 2·LCS(word1, word2)\`: every character outside a longest common subsequence is deleted from one side or inserted on the other. Example 2 checks this on three pairs.

## 5. The Code in C++

The table and the walk back that recovers the edit script:

~~~cpp
// dp[i][j] = fewest edits turning a[0..i) into b[0..j)
vector<vector<int>> editTable(const string& a, const string& b) {
    size_t m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (size_t i = 0; i <= m; i++) dp[i][0] = int(i);   // delete all i characters
    for (size_t j = 0; j <= n; j++) dp[0][j] = int(j);   // insert all j characters
    for (size_t i = 1; i <= m; i++)
        for (size_t j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1]                 // free
                     : 1 + min({dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]}); // replace, delete, insert
    return dp;
}

vector<string> editScript(const string& a, const string& b, const vector<vector<int>>& dp) {
    size_t i = a.size(), j = b.size();
    vector<string> ops;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] == b[j - 1] && dp[i][j] == dp[i - 1][j - 1]) {
            ops.push_back(string("keep ") + a[i - 1]); i--; j--;
        } else if (i > 0 && j > 0 && dp[i][j] == dp[i - 1][j - 1] + 1) {
            ops.push_back(string("replace ") + a[i - 1] + "->" + b[j - 1]); i--; j--;
        } else if (i > 0 && dp[i][j] == dp[i - 1][j] + 1) {
            ops.push_back(string("delete ") + a[i - 1]); i--;
        } else {
            ops.push_back(string("insert ") + b[j - 1]); j--;
        }
    }
    reverse(ops.begin(), ops.end());
    return ops;
}
~~~

**What to point out in this code:**

- The two small loops before the main loop **are** the base cases. The vector is created full of zeros, which is right for LCS but **wrong** here: without those loops, dist("abc", "") would come out 0.
- \`std::min({x, y, z})\` takes an initializer list, so three options fit in one call (C++11 and later, from \`<algorithm>\`). The comments name which neighbour is which operation.
- The loop indices are \`size_t\`, so the base cases store \`int(i)\`; mixing signed and unsigned in arithmetic is where C++ off-by-one bugs hide.
- \`editScript\` asks, at each cell, "which neighbour could have produced this value?" in a fixed order — keep, replace, delete, insert — and moves there. The \`i > 0\` / \`j > 0\` guards matter doubly in C++: \`i - 1\` on an unsigned zero wraps to a huge number, and \`operator[]\` does not check bounds.
- \`string("keep ") + a[i - 1]\` builds a \`std::string\` first; \`"keep " + a[i - 1]\` would add a \`char\` to a \`const char*\` — pointer arithmetic, not concatenation.

**When you only need the number**, keep two rows and \`swap\` them — an O(1) exchange of buffers. \`cur[0] = i\` re-applies the base case on each new row:

~~~cpp
int twoRows(const string& a, const string& b) {
    size_t n = b.size();
    vector<int> prev(n + 1), cur(n + 1);
    for (size_t j = 0; j <= n; j++) prev[j] = int(j);   // row i = 0
    for (size_t i = 1; i <= a.size(); i++) {
        cur[0] = int(i);                                // column 0 of row i is i
        for (size_t j = 1; j <= n; j++)
            cur[j] = a[i - 1] == b[j - 1] ? prev[j - 1] : 1 + min({prev[j - 1], prev[j], cur[j - 1]});
        swap(prev, cur);
    }
    return prev[n];
}
~~~

📌 **Interview term: Rolling array (two rows)** — keeping only the previous and current rows because no cell reads anything older. Space drops from O(m·n) to O(n); swap the arguments if you want O(min(m, n)).

Reusing the old buffer is safe because every \`cur[j]\` is written (index 0 first) before it is read in that row. The standard library has no edit-distance function; in an interview you write the table.

## 6. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the table for "horse" → "ros", seven distances, and two edit scripts** prints:

~~~text
table rows (word1 = horse, word2 = ros):
- [0, 1, 2, 3]
h [1, 1, 2, 3]
o [2, 2, 1, 2]
r [3, 2, 2, 2]
s [4, 3, 3, 2]
e [5, 4, 4, 3]
dist("horse", "ros") = 3
dist("intention", "execution") = 5
dist("kitten", "sitting") = 3
dist("", "abc") = 3
dist("abc", "") = 3
dist("abc", "abc") = 0
dist("ab", "ba") = 2
horse -> ros: replace h->r, keep o, delete r, keep s, delete e (3 paid)
intention -> execution: replace i->e, replace n->x, replace t->e, replace e->c, replace n->u, keep t, keep i, keep o, keep n (5 paid)
~~~

- The table rows match the diagram: the first row is 0, 1, 2, 3 and the first column is 0 to 5 — the base cases.
- "kitten" → "sitting" is 3 (replace k, replace e, insert g), and "ab" → "ba" is 2: plain Levenshtein has no swap move.
- Each script lists the free keeps too, and counts only the paid steps: 3 for horse → ros, 5 for intention → execution.

**Example 2 — recursion vs table, the LCS link, and two rows** prints:

~~~text
kitten -> sitting: naive 3 in 2763 calls; table 3 in 42 cells
sunday -> saturday: naive 3 in 3692 calls; table 3 in 48 cells
intention -> execution: naive 5 in 367039 calls; table 5 in 81 cells
horse -> ros: indel-only 4, m + n - 2 * LCS = 4
kitten -> sitting: indel-only 5, m + n - 2 * LCS = 5
abc -> abc: indel-only 0, m + n - 2 * LCS = 0
random 700 x 500: full table 317, two rows 317
~~~

- The plain recursion needs **2,763** calls for kitten → sitting and **367,039** for intention → execution; the table fills 42 and 81 cells for the same answers.
- With only insert and delete allowed, the distance equals \`m + n − 2·LCS\` on all three pairs (4 for horse → ros, where Levenshtein gives 3 because one replace saves a delete + insert).
- On two random 700- and 500-character strings the full table and the two-row version agree: 317.

## 7. Complexity

m and n are the lengths of \`word1\` and \`word2\`.

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Plain recursion | exponential, up to O(3^(m+n)) | O(m + n) stack | a mismatch branches three ways and subproblems repeat |
| Memoized recursion | O(m·n) | O(m·n) + O(m + n) stack | each (i, j) solved once |
| Full table | O(m·n) | O(m·n) | one O(1) step per cell |
| Two rows | O(m·n) | O(n), or O(min(m, n)) after a swap | only the previous row is read |
| Edit script | O(m + n) extra | needs the full table | every step decreases i, j or both |

With 4-byte \`int\`s, the two-row version of two 100,000-character strings needs under a megabyte, while the full table would need 40 GB and throw \`std::bad_alloc\` (or be killed by the OS). The naive call counter in example 2 is a \`long long\`, because exponential counts outgrow 32 bits fast. If you only need to know whether the distance is at most k, fill only the band of cells with |i − j| ≤ k — O(k·min(m, n)) work.

## 8. Edge Cases

- **An empty string.** dist("", "abc") = 3 (three inserts) and dist("abc", "") = 3 (three deletes) — the base row and column, nothing else.
- **Equal strings.** 0: every step is a free diagonal keep.
- **Swapped neighbours.** dist("ab", "ba") = 2 in Levenshtein distance (two replaces). If the interviewer expects 1, they mean Damerau–Levenshtein with a transposition move.
- **Different lengths.** The distance is at least |m − n| (that many inserts or deletes are unavoidable) and at most max(m, n).
- **Several optimal edit scripts.** "intention" → "execution" has more than one script of 5 edits; the walk back's preference order (keep, replace, delete, insert) decides which one you print — ours is five replaces.
- **Case and Unicode.** "A" and "a" differ unless you normalise first; decide what a "character" is before comparing.

## Common Pitfalls

- **Trusting zero-initialisation for the base cases.** \`dp[i][0]\` must be i and \`dp[0][j]\` must be j; zeros make "abc" → "" come out 0.
- **Mixing up the directions.** Up (\`dp[i-1][j]\`) is delete from \`word1\`, left (\`dp[i][j-1]\`) is insert into \`word1\`. The number is the same either way, but the edit script comes out wrong.
- **Adding 1 on a match.** Equal characters copy the diagonal with no +1.
- **Unsigned underflow.** \`size_t i = 0; i - 1\` is not -1; guard with \`i > 0\` before every \`i - 1\`.
- **\`"text" + ch\`** — pointer arithmetic on a string literal. Start from \`std::string("text")\`.
- **Bytes, not characters.** \`std::string\` indexes bytes; a UTF-8 "é" is two bytes, so comparing byte by byte counts it as two characters.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j]</code> is the fewest edits turning the first i characters of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1</code> into the first j of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word2</code>. The answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[m][n]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Base cases:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][0] = i</code> (delete everything) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0][j] = j</code> (insert everything). The vector starts at zero, so write these loops explicitly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The transition:</strong> <span style="color:#f0e2c8;">Equal last characters copy the diagonal. Otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + min({diagonal, up, left})</code>: replace, delete, insert.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost and memory:</strong> <span style="color:#f0e2c8;">O(m·n) time and space; two rows and an O(1) <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">swap</code> give O(min(m, n)) space when only the number is needed. Walk back through the full table for the edit script.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Guard every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - 1</code> on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t</code>, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::min</code> with an initializer list, and remember <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::string</code> indexes bytes.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the cell above a deletion?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Going from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i-1][j]</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][j]</code> uses one more character of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1</code> but produces nothing more of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word2</code>, so that character was deleted. Moving left to right produces a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word2</code> character without using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1</code>: an insertion.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the actual operations?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the full table and walk back from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[m][n]</code>: if the characters match and the diagonal is equal, keep; else whichever neighbour plus 1 equals the cell tells you replace, delete or insert. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::reverse</code> at the end.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if replace costs 2 and insert/delete cost 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Change the diagonal constant to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+ 2</code>. Replace is then never better than delete plus insert, and the answer becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m + n - 2 * LCS</code> — in our run 4 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">horse</code> → <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ros</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you allow swapping two adjacent letters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is Damerau–Levenshtein (optimal string alignment): add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i-2][j-2] + 1</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1[i-1] == word2[j-2]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">word1[i-2] == word2[j-1]</code> (with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt;= 2</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j &gt;= 2</code>). Then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ab</code> → <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ba</code> costs 1 instead of 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The strings are long but you only care if the distance is at most 2. Faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fill only the diagonal band where the difference between i and j is at most 2; any cell outside it is already more than 2. That is O(k·n) instead of O(m·n), and you can stop early once a whole row exceeds k.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Edit distance (Levenshtein distance)** | Fewest single-character inserts, deletes and replaces turning one string into another |
| **Base case** | Answers written down directly: \`dp[i][0] = i\`, \`dp[0][j] = j\` |
| **Transition** | Equal characters copy the diagonal; otherwise 1 + min(diagonal, up, left) |
| **Edit script (alignment)** | The list of keep / replace / insert / delete steps, found by walking back |
| **Optimal substructure** | The best whole answer is built from best answers to smaller prefixes |
| **Rolling array (two rows)** | Keeping only the previous and current rows because nothing older is read |

---
**Conclusion:** Edit distance is a two-dimensional DP over prefixes: \`dp[i][j]\` is the cheapest way to turn the first i characters of \`word1\` into the first j of \`word2\`, the first row and column are i and j, equal characters copy the diagonal, and different characters take one plus the minimum of replace (diagonal), delete (up) and insert (left). In C++ write the base-case loops explicitly, use \`min({...})\` for the three options, guard every unsigned \`i - 1\`, and \`swap\` two rows when only the number matters — or walk back through the full table to list the edits. Our runs showed the payoff: 367,039 recursive calls become 81 table cells, with the same answer of 5.`,
        examples: [
          {
            label: `Edit distance table, distances and the edit script`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

// dp[i][j] = fewest edits turning a[0..i) into b[0..j)
vector<vector<int>> editTable(const string& a, const string& b) {
    size_t m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (size_t i = 0; i <= m; i++) dp[i][0] = int(i);   // delete all i characters
    for (size_t j = 0; j <= n; j++) dp[0][j] = int(j);   // insert all j characters
    for (size_t i = 1; i <= m; i++)
        for (size_t j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1]                 // free
                     : 1 + min({dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]}); // replace, delete, insert
    return dp;
}

vector<string> editScript(const string& a, const string& b, const vector<vector<int>>& dp) {
    size_t i = a.size(), j = b.size();
    vector<string> ops;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] == b[j - 1] && dp[i][j] == dp[i - 1][j - 1]) {
            ops.push_back(string("keep ") + a[i - 1]); i--; j--;
        } else if (i > 0 && j > 0 && dp[i][j] == dp[i - 1][j - 1] + 1) {
            ops.push_back(string("replace ") + a[i - 1] + "->" + b[j - 1]); i--; j--;
        } else if (i > 0 && dp[i][j] == dp[i - 1][j] + 1) {
            ops.push_back(string("delete ") + a[i - 1]); i--;
        } else {
            ops.push_back(string("insert ") + b[j - 1]); j--;
        }
    }
    reverse(ops.begin(), ops.end());
    return ops;
}

string fmt(const vector<int>& row) {
    string s = "[";
    for (size_t k = 0; k < row.size(); k++) { if (k) s += ", "; s += to_string(row[k]); }
    return s + "]";
}

int main() {
    string a = "horse", b = "ros";
    auto dp = editTable(a, b);
    cout << "table rows (word1 = horse, word2 = ros):\\n";
    cout << "- " << fmt(dp[0]) << "\\n";
    for (size_t i = 1; i <= a.size(); i++) cout << a[i - 1] << " " << fmt(dp[i]) << "\\n";

    vector<pair<string, string>> pairs = {{"horse", "ros"}, {"intention", "execution"}, {"kitten", "sitting"},
                                          {"", "abc"}, {"abc", ""}, {"abc", "abc"}, {"ab", "ba"}};
    for (auto& [x, y] : pairs)
        cout << "dist(\\"" << x << "\\", \\"" << y << "\\") = " << editTable(x, y)[x.size()][y.size()] << "\\n";

    for (auto& [x, y] : vector<pair<string, string>>{{"horse", "ros"}, {"intention", "execution"}}) {
        auto ops = editScript(x, y, editTable(x, y));
        int paid = 0;
        string line;
        for (size_t k = 0; k < ops.size(); k++) {
            if (k) line += ", ";
            line += ops[k];
            if (ops[k].rfind("keep", 0) != 0) paid++;   // rfind(..., 0) == 0 means "starts with"
        }
        cout << x << " -> " << y << ": " << line << " (" << paid << " paid)\\n";
    }
}`,
          },
          {
            label: `Naive recursion vs table, the LCS link, and two rows`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

long long calls = 0;
int naive(const string& a, const string& b, size_t i, size_t j) {
    calls++;
    if (i == a.size()) return int(b.size() - j);   // insert the rest of b
    if (j == b.size()) return int(a.size() - i);   // delete the rest of a
    if (a[i] == b[j]) return naive(a, b, i + 1, j + 1);
    return 1 + min({naive(a, b, i + 1, j + 1), naive(a, b, i + 1, j), naive(a, b, i, j + 1)});
}

int fullTable(const string& a, const string& b) {
    size_t m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (size_t i = 0; i <= m; i++) dp[i][0] = int(i);
    for (size_t j = 0; j <= n; j++) dp[0][j] = int(j);
    for (size_t i = 1; i <= m; i++)
        for (size_t j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1] : 1 + min({dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]});
    return dp[m][n];
}

int twoRows(const string& a, const string& b) {
    size_t n = b.size();
    vector<int> prev(n + 1), cur(n + 1);
    for (size_t j = 0; j <= n; j++) prev[j] = int(j);   // row i = 0
    for (size_t i = 1; i <= a.size(); i++) {
        cur[0] = int(i);                                // column 0 of row i is i
        for (size_t j = 1; j <= n; j++)
            cur[j] = a[i - 1] == b[j - 1] ? prev[j - 1] : 1 + min({prev[j - 1], prev[j], cur[j - 1]});
        swap(prev, cur);
    }
    return prev[n];
}

// Insert and delete only, no replace: a replace now costs a delete plus an insert.
int indelOnly(const string& a, const string& b) {
    size_t m = a.size(), n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (size_t i = 0; i <= m; i++)
        for (size_t j = 0; j <= n; j++) {
            if (i == 0 || j == 0) dp[i][j] = int(i + j);
            else if (a[i - 1] == b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
            else dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1]);
        }
    return dp[m][n];
}

int lcs(const string& a, const string& b) {
    vector<vector<int>> dp(a.size() + 1, vector<int>(b.size() + 1, 0));
    for (size_t i = 1; i <= a.size(); i++)
        for (size_t j = 1; j <= b.size(); j++)
            dp[i][j] = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1] + 1 : max(dp[i - 1][j], dp[i][j - 1]);
    return dp[a.size()][b.size()];
}

long long seed = 99;
long long nxt() { seed = seed * 48271 % 2147483647LL; return seed; }

int main() {
    for (auto& [a, b] : vector<pair<string, string>>{{"kitten", "sitting"}, {"sunday", "saturday"}, {"intention", "execution"}}) {
        calls = 0;
        int r = naive(a, b, 0, 0);
        cout << a << " -> " << b << ": naive " << r << " in " << calls << " calls; table "
             << fullTable(a, b) << " in " << a.size() * b.size() << " cells\\n";
    }
    for (auto& [a, b] : vector<pair<string, string>>{{"horse", "ros"}, {"kitten", "sitting"}, {"abc", "abc"}})
        cout << a << " -> " << b << ": indel-only " << indelOnly(a, b) << ", m + n - 2 * LCS = "
             << int(a.size() + b.size()) - 2 * lcs(a, b) << "\\n";

    string x, y;
    for (int k = 0; k < 700; k++) x += char(97 + nxt() % 3);
    for (int k = 0; k < 500; k++) y += char(97 + nxt() % 3);
    cout << "random 700 x 500: full table " << fullTable(x, y) << ", two rows " << twoRows(x, y) << "\\n";
}`,
          },
        ],
      },
    },
  },
  {
    title: "How do you solve the 0/1 knapsack problem?",
    difficulty: "medium",
    seoDescription: `The 0/1 knapsack problem with DP: the take-or-skip table, rebuilding the chosen items, and the backwards 1D loop, verified in Python, JS, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You have n items, each with a weight and a value, and a bag that holds at most W. Each item can be taken at most once. What is the largest total value you can carry? Walk me through your approach and code it in Python."

**What a strong answer should cover:**
- Why greedy (best value per weight first) fails for 0/1 items, with a counter-example.
- The state \`dp[i][c]\` = best value from the first i items with capacity c, and the take-or-skip transition \`max(dp[i-1][c], dp[i-1][c-w] + v)\`.
- O(n·W) time, pseudo-polynomial, and O(W) space with one row looped **backwards** — and why forwards would reuse items (unbounded knapsack).
- Rebuilding the chosen items by walking back through the full table.
- Python details: \`dp[c - w]\` with \`c < w\` silently reads from the end of the list (negative indexing), so the loop bounds must stop at w; and a list comprehension for the 2D table.

**Clarifying questions expected:**
- Can an item be used more than once, or split?
- How large are W and n?
- Do you need the chosen items or only the best value?

**Code / implementation expected:** Yes — the one-row DP with a backwards capacity loop in Python; the 2D table if the items must be listed.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, lists and 2D lists.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are packing for a weekend hike. Your backpack can carry 7 kg. On the table are a water filter (1 kg, usefulness 1), a stove (3 kg, usefulness 4), a tent (4 kg, usefulness 5) and a camera (5 kg, usefulness 7). You cannot take half a tent. Which items should go in to make the trip as good as possible?

The camera is the "best" single item, so you might grab it first — then only 2 kg is left and you can add just the filter: usefulness 8. But stove + tent weighs exactly 7 kg and is worth 9. Grabbing the best-looking item first was wrong.

That is the **0/1 knapsack problem**: each item is either taken whole (1) or left behind (0), and you want the most value without passing the weight limit. It models budgets (projects with costs and payoffs), cargo loading, picking ads for a time slot, and it is the parent of a family of interview problems — [partition into two equal-sum subsets](/interview-question/how-do-you-check-if-an-array-can-be-partitioned-into-two-equal-sum-subsets) is knapsack with value = weight, and [coin change](/interview-question/how-do-you-solve-the-coin-change-problem) is its "unlimited copies" cousin.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can each item be taken at most once, or unlimited times? | Once = 0/1 knapsack (capacity loop goes **backwards** in 1D). Unlimited = unbounded knapsack (loop goes forwards). |
| Can items be split? | If fractions are allowed (fractional knapsack), greedy by value/weight is optimal and no DP is needed. |
| How large is the capacity W? | The DP costs O(n·W). W = 10,000 is fine; W = 10^9 is not, and you need another approach (e.g. DP over value, or meet in the middle for small n). |
| Are weights and values integers? Can they be zero or negative? | The table is indexed by integer capacity; zero-weight items need care; negative values are simply never taken. |
| Do you need the best value only, or which items? | The value needs one row; the item list needs the full table to walk back through. |
| Must the bag be filled exactly? | "Exactly W" changes the start values: unreachable capacities begin at −∞ instead of 0. |

## 3. The Core Idea in Plain Words

📌 **Interview term: 0/1 knapsack** — given n items with weights and values and a capacity W, choose a subset with total weight ≤ W and the largest total value; each item is taken whole or not at all.

Trying every subset works but there are 2^n of them. Instead, decide **one item at a time** and ask a smaller question:

> What is the best value using only the first i items, with a bag of capacity c?

Call it \`dp[i][c]\`. For item i (weight w, value v) there are only two choices:

- **Skip it.** The best is whatever the first i − 1 items could do with the same capacity: \`dp[i-1][c]\`.
- **Take it** (only if w ≤ c). It uses w of the capacity and adds v: \`dp[i-1][c-w] + v\`. Note the **i − 1**: after taking item i, the remaining capacity may only use the *earlier* items, so item i cannot be taken twice.

\`dp[i][c]\` is the larger of the two. The base case is \`dp[0][c] = 0\` — no items, no value.

📌 **Interview term: Take-or-skip decision** — the two-way choice per item that defines 0/1 knapsack (and [house robber](/interview-question/how-do-you-solve-the-house-robber-problem), subset sum and many others): the answer is the better of "include it" and "exclude it".

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Each knapsack cell is the larger of two choices: skip the item and keep dp of i minus 1 at c, or take it and add its value to dp of i minus 1 at c minus w">
  <defs>
    <marker id="b29q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="260" height="80" rx="10"/>
  <text class="d-text" x="160" y="64" text-anchor="middle">skip item i</text>
  <text class="d-sub" x="160" y="90" text-anchor="middle">dp[i-1][c]</text>
  <rect class="d-box-muted" x="390" y="30" width="260" height="80" rx="10"/>
  <text class="d-text" x="520" y="64" text-anchor="middle">take item i (if w fits)</text>
  <text class="d-sub" x="520" y="90" text-anchor="middle">dp[i-1][c-w] + v</text>
  <rect class="d-box-accent" x="210" y="200" width="260" height="80" rx="10"/>
  <text class="d-text" x="340" y="234" text-anchor="middle">dp[i][c]</text>
  <text class="d-sub" x="340" y="260" text-anchor="middle">the larger of the two</text>
  <path class="d-edge" d="M 160 112 L 280 196" marker-end="url(#b29q4-arrow)"/>
  <path class="d-edge-accent" d="M 520 112 L 400 196" marker-end="url(#b29q4-arrow)"/>
</svg>

Fill the table one row per item, capacity 0 to W. Here is the table for the hiking example (weights 1, 3, 4, 5; values 1, 4, 5, 7; capacity 7), exactly as example 1 prints it:

<svg class="iq-diagram" width="100%" viewBox="0 0 604 340" role="img" aria-label="The knapsack table for four items and capacity 7. The answer 9 sits in the bottom right cell">
  <text class="d-sub" x="302" y="24" text-anchor="middle">rows: items allowed so far, columns: capacity 0 to 7</text>
  <text class="d-text" x="114" y="56" text-anchor="middle">0</text>
  <text class="d-text" x="172" y="56" text-anchor="middle">1</text>
  <text class="d-text" x="230" y="56" text-anchor="middle">2</text>
  <text class="d-text" x="288" y="56" text-anchor="middle">3</text>
  <text class="d-text" x="346" y="56" text-anchor="middle">4</text>
  <text class="d-text" x="404" y="56" text-anchor="middle">5</text>
  <text class="d-text" x="462" y="56" text-anchor="middle">6</text>
  <text class="d-text" x="520" y="56" text-anchor="middle">7</text>
  <text class="d-text" x="55" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="88" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="146" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="204" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="262" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="320" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="378" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="436" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="494" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="100" text-anchor="middle">0</text>
  <text class="d-text" x="55" y="148" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="88" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="148" text-anchor="middle">0</text>
  <rect class="d-box" x="146" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="204" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="262" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="320" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="378" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="436" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="494" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="148" text-anchor="middle">1</text>
  <text class="d-text" x="55" y="196" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="88" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="196" text-anchor="middle">0</text>
  <rect class="d-box" x="146" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="196" text-anchor="middle">1</text>
  <rect class="d-box" x="204" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="196" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="262" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="196" text-anchor="middle">4</text>
  <rect class="d-box" x="320" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="196" text-anchor="middle">5</text>
  <rect class="d-box" x="378" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="196" text-anchor="middle">5</text>
  <rect class="d-box" x="436" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="196" text-anchor="middle">5</text>
  <rect class="d-box" x="494" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="196" text-anchor="middle">5</text>
  <text class="d-text" x="55" y="244" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="88" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="244" text-anchor="middle">0</text>
  <rect class="d-box" x="146" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="244" text-anchor="middle">1</text>
  <rect class="d-box" x="204" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="244" text-anchor="middle">1</text>
  <rect class="d-box" x="262" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="244" text-anchor="middle">4</text>
  <rect class="d-box" x="320" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="244" text-anchor="middle">5</text>
  <rect class="d-box" x="378" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="244" text-anchor="middle">6</text>
  <rect class="d-box" x="436" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="244" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="494" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="244" text-anchor="middle">9</text>
  <text class="d-text" x="55" y="292" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="88" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="292" text-anchor="middle">0</text>
  <rect class="d-box" x="146" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="292" text-anchor="middle">1</text>
  <rect class="d-box" x="204" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="292" text-anchor="middle">1</text>
  <rect class="d-box" x="262" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="292" text-anchor="middle">4</text>
  <rect class="d-box" x="320" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="292" text-anchor="middle">5</text>
  <rect class="d-box" x="378" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="292" text-anchor="middle">7</text>
  <rect class="d-box" x="436" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="292" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="494" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="292" text-anchor="middle">9</text>
</svg>

The answer is the bottom-right cell, 9. To find **which** items give it, walk back up from that cell: if \`dp[i][c]\` equals \`dp[i-1][c]\`, item i was skipped; otherwise it was taken, so subtract its weight from c. The highlighted cells trace that walk: the camera is skipped (row 4 and row 3 both hold 9 at capacity 7), the tent is taken (c drops from 7 to 3), the stove is taken (c drops to 0).

📌 **Interview term: Pseudo-polynomial time** — O(n·W) looks polynomial, but W is a *number* in the input, not a count of items. Doubling the number of digits of W squares its size, so the DP is only fast when W itself is small. (The general 0/1 knapsack decision problem is NP-complete; the DP does not contradict that.)

## 4. Brute Force, Greedy, and the DP

- **Brute force.** Try all 2^n subsets. For 16 items that is 65,536 subsets (example 2); for 40 items it is about a trillion.
- **Greedy by value per kilogram.** Fast, but wrong for 0/1. With weights 10, 20, 30, values 60, 100, 120 and capacity 50, greedy takes the two "best ratio" items for 160 and has no room for the third; the right answer, 220, skips the best-ratio item (example 2 prints both). Greedy is only correct when items can be split.
- **The 2D table.** O(n·W) time and space, and it can rebuild the item list.
- **One row, capacity backwards.** Row i only reads row i − 1, so a single array works — **if** capacity is looped from W down to w. Going downwards means \`dp[c - w]\` still holds the *previous* row's value when it is read, so every item is used at most once.

📌 **Interview term: Space-optimised (1D) DP** — collapsing the table to one array that is overwritten in place, in an order chosen so that every read still sees the value the 2D table would have had.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 330" role="img" aria-label="One item of weight 2 and value 3, capacity 0 to 6. Looping capacity forwards reaches 9 by reusing the item, looping backwards correctly stops at 3">
  <defs>
    <marker id="b29q4-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="65" y="30" text-anchor="middle">c = 0</text>
  <text class="d-sub" x="155" y="30" text-anchor="middle">c = 1</text>
  <text class="d-sub" x="245" y="30" text-anchor="middle">c = 2</text>
  <text class="d-sub" x="335" y="30" text-anchor="middle">c = 3</text>
  <text class="d-sub" x="425" y="30" text-anchor="middle">c = 4</text>
  <text class="d-sub" x="515" y="30" text-anchor="middle">c = 5</text>
  <text class="d-sub" x="605" y="30" text-anchor="middle">c = 6</text>
  <text class="d-sub" x="20" y="66">forwards: reuses the item</text>
  <rect class="d-box" x="30" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="65" y="111" text-anchor="middle">0</text>
  <rect class="d-box" x="120" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="155" y="111" text-anchor="middle">0</text>
  <rect class="d-box" x="210" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="245" y="111" text-anchor="middle">3</text>
  <rect class="d-box" x="300" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="335" y="111" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="390" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="425" y="111" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="480" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="515" y="111" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="570" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="605" y="111" text-anchor="middle">9</text>
  <path class="d-edge-accent" d="M 245 134 Q 335 172 425 134" fill="none" marker-end="url(#b29q4-arrow2)"/>
  <path class="d-edge-accent" d="M 425 134 Q 515 172 605 134" fill="none" marker-end="url(#b29q4-arrow2)"/>
  <text class="d-sub" x="20" y="226">backwards: each item used once</text>
  <rect class="d-box" x="30" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="65" y="271" text-anchor="middle">0</text>
  <rect class="d-box" x="120" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="155" y="271" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="210" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="245" y="271" text-anchor="middle">3</text>
  <rect class="d-box" x="300" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="335" y="271" text-anchor="middle">3</text>
  <rect class="d-box" x="390" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="425" y="271" text-anchor="middle">3</text>
  <rect class="d-box" x="480" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="515" y="271" text-anchor="middle">3</text>
  <rect class="d-box" x="570" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="605" y="271" text-anchor="middle">3</text>
</svg>

With one item (weight 2, value 3) and capacity 6, the forward loop computes \`dp[2] = 3\`, then reads that *new* value for \`dp[4] = 6\` and again for \`dp[6] = 9\` — it packed the same item three times. The backward loop fills \`dp[6]\` first from the old \`dp[4] = 0\`, so the answer stays 3. The forward loop is exactly right for the **unbounded** knapsack, which is why coin change uses it.

📌 **Interview term: Unbounded knapsack** — the variant where each item may be taken any number of times; the 1D capacity loop runs forwards so an item can build on itself.

## 5. The Code in Python

The full table, and the walk back that lists the chosen items (0-based indices):

~~~python
def knapsack_table(weights, values, cap):
    n = len(weights)
    # dp[i][c] = best value using only the first i items with capacity c
    dp = [[0] * (cap + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        w, v = weights[i - 1], values[i - 1]
        for c in range(cap + 1):
            dp[i][c] = dp[i - 1][c]                      # skip item i-1
            if w <= c and dp[i - 1][c - w] + v > dp[i][c]:
                dp[i][c] = dp[i - 1][c - w] + v          # take item i-1 (once)
    return dp


def chosen_items(weights, dp, cap):
    items, c = [], cap
    for i in range(len(weights), 0, -1):
        if dp[i][c] != dp[i - 1][c]:                     # the value changed, so item i-1 was taken
            items.append(i - 1)
            c -= weights[i - 1]
    return items[::-1]
~~~

**What to point out in this code:**

- Row 0 is all zeros (no items), and every row starts as a copy of the row above (skip), then improves where taking the item is better. The guard \`w <= c\` comes **first** in the \`and\`, so \`dp[i - 1][c - w]\` is never evaluated with a negative index.
- That guard matters more in Python than elsewhere: \`dp[i - 1][-2]\` does not raise an error, it quietly reads the second-to-last cell. Without the guard you get a wrong answer, not a crash.
- \`chosen_items\` walks from the last item up: if the value in row i differs from row i − 1 at the current capacity, item i − 1 was taken and its weight comes off c. It collects backwards and returns \`items[::-1]\`.

**The usual interview answer**, one row with the capacity looped **backwards**:

~~~python
def one_row(weights, values, cap, backwards=True):
    dp = [0] * (cap + 1)                 # dp[c] = best value with capacity c so far
    for w, v in zip(weights, values):
        order = range(cap, w - 1, -1) if backwards else range(w, cap + 1)
        for c in order:
            dp[c] = max(dp[c], dp[c - w] + v)
    return dp[cap]
~~~

\`range(cap, w - 1, -1)\` counts down from \`cap\` to \`w\` inclusive (the stop value is excluded, hence \`w - 1\`). Stopping at w means \`dp[c - w]\` is never negative — the same guard as above, built into the loop bounds. With \`backwards=False\` the same function becomes the unbounded knapsack; example 2 runs both.

**Top-down alternative.** \`@functools.lru_cache(maxsize=None)\` on a function \`best(i, c)\` gives the same answer and only visits reachable states, but it recurses n levels deep (fine for n in the hundreds, a \`RecursionError\` past Python's default limit of 1000) and every cached entry is a tuple key in a dict — much heavier than one list.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the table for the hiking example, then six cases with the chosen items** prints:

~~~text
table rows (capacity 0..7), items (w, v) = (1, 1) (3, 4) (4, 5) (5, 7):
first 0 items [0, 0, 0, 0, 0, 0, 0, 0]
first 1 items [0, 1, 1, 1, 1, 1, 1, 1]
first 2 items [0, 1, 1, 4, 5, 5, 5, 5]
first 3 items [0, 1, 1, 4, 5, 6, 6, 9]
first 4 items [0, 1, 1, 4, 5, 7, 8, 9]
w=[1, 3, 4, 5] v=[1, 4, 5, 7] cap=7: best 9, items [1, 2], weight used 7
w=[10, 20, 30] v=[60, 100, 120] cap=50: best 220, items [1, 2], weight used 50
w=[1, 2, 3] v=[6, 10, 12] cap=5: best 22, items [1, 2], weight used 5
w=[5] v=[10] cap=4: best 0, items [], weight used 0
w=[1, 2] v=[3, 4] cap=0: best 0, items [], weight used 0
w=[] v=[] cap=10: best 0, items [], weight used 0
~~~

- The five table rows are the diagram in section 3; the answer 9 uses items 1 and 2 (the stove and the tent), weight exactly 7.
- Weights 10, 20, 30 with values 60, 100, 120 and capacity 50 give 220 from items 1 and 2 — the classic case where the best-ratio item (index 0) is *not* in the answer.
- An item heavier than the bag, a zero capacity and an empty item list all give 0 with no items.

**Example 2 — loop direction, greedy, and brute force** prints:

~~~text
cap 50: backwards (0/1) 220, forwards (reuses items) 300, greedy by value/weight 160
cap 6: backwards (0/1) 3, forwards (reuses items) 9, greedy by value/weight 3
cap 7: backwards (0/1) 9, forwards (reuses items) 9, greedy by value/weight 8
16 random items, cap 100: brute force 481 after 65536 subsets; dp 481 after 1616 cells
~~~

- **Direction:** for capacity 50 the forward loop reports 300 (item 0 packed five times) and for one item of weight 2 it reports 9 (packed three times). Only the backward loop is 0/1. For the hiking case both happen to give 9 — a test that passes by luck.
- **Greedy** by value per weight gives 160 instead of 220, and 8 instead of 9. It is not a correct algorithm for 0/1 items.
- **Brute force** over all 65,536 subsets of 16 random items agrees with the DP (481), which fills only 16 × 101 = 1,616 cells.

## 7. Complexity

n items, capacity W.

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(2^n · n) | O(n) | every subset, each summed in O(n) |
| Greedy by ratio | O(n log n) | O(n) | one sort — but not correct for 0/1 |
| 2D table | O(n·W) | O(n·W) | one O(1) cell per (item, capacity) |
| 1D, backwards | O(n·W) | O(W) | each row overwrites the previous in place |
| Rebuild items | O(n) extra | needs the 2D table | one step per item |

For pure Python, n·W is the number to watch: 1,000 items and W = 100,000 is 100 million interpreted steps. If W is huge but values are small, swap the roles — \`dp[value]\` = smallest weight achieving that value — and the cost becomes O(n · total value).

## 8. Edge Cases

- **Capacity 0.** Nothing fits; the answer is 0 and the item list is empty.
- **No items.** The answer is 0.
- **An item heavier than the bag.** It is always skipped (\`w > c\` for every c); weights [5] with capacity 4 gives 0.
- **Several optimal subsets.** The walk back reports one of them; with ties, which one depends on the comparison (\`>\` vs \`>=\`) you use while filling.
- **Zero-weight items.** In the backward 1D loop with w = 0, \`dp[c - w]\` is \`dp[c]\` itself, still holding the old value when it is read — fine for 0/1. Make sure the loop still visits c = 0.
- **Large values.** The answer is a sum of values; check whether it can exceed your integer type.

## Common Pitfalls

- **Forward capacity loop in the 1D version.** It silently solves the unbounded knapsack: 300 instead of 220 in our run.
- **Negative indices.** \`dp[c - w]\` with \`c < w\` reads from the end of the list instead of failing. Loop down to \`w\`, or test \`w <= c\` first.
- **Greedy by value/weight.** Only correct for the fractional knapsack; our run shows 160 vs 220.
- **\`[[0] * (W + 1)] * (n + 1)\`** — every row is the same list, so "the row above" is the row you are writing. Use a list comprehension.
- **Trying to list the items from the 1D array.** The previous rows are gone; keep the 2D table (or store a take/skip bit per (i, c)) when the items are needed.
- **Starting from 0 when the bag must be filled exactly.** For "exactly W", unreachable capacities must start at \`float("-inf")\`, with only \`dp[0] = 0\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Why not greedy:</strong> <span style="color:#f0e2c8;">Best value-per-weight first fails for whole items: weights 10/20/30, values 60/100/120, capacity 50 gives 160 greedily but 220 optimally.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][c]</code> is the best value from the first i items with capacity c; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0][c] = 0</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The transition:</strong> <span style="color:#f0e2c8;">Skip or take: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(dp[i-1][c], dp[i-1][c-w] + v)</code>, taking only when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w &lt;= c</code>. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i-1</code> in the take branch is what makes each item usable once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. One row:</strong> <span style="color:#f0e2c8;">Loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for c in range(W, w - 1, -1)</code> and do <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[c] = max(dp[c], dp[c - w] + v)</code>. Backwards keeps the previous row in the cells still to be read. O(n·W) time, O(W) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Negative indices do not fail in Python, so the loop must stop at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w</code>; and build a 2D table with a list comprehension.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the 1D loop have to go backwards?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Going down, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[c - w]</code> has not been updated for this item yet, so it is still the previous row. Going up, it may already include this item, which lets the item be taken again — the unbounded knapsack. In our run: 300 instead of 220.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is O(n·W) polynomial?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pseudo-polynomial: it is polynomial in the value of W, not in the number of bits needed to write W. The decision version of 0/1 knapsack is NP-complete, so no known algorithm is polynomial in the input size.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you list the chosen items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the 2D table and walk from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[n][W]</code> up: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][c] != dp[i-1][c]</code>, item i−1 was taken, so record it and do <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c -= w</code>. In our run that gives items 1 and 2 for both classic examples.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if W is 10^9 but values are small?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Swap roles: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[v]</code> = smallest weight that achieves value v, over v up to the sum of values; the answer is the largest v with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[v] &lt;= W</code>. Time O(n · sum of values).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this connect to partition equal subset sum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Set every value equal to its weight and W to half the total; the subset sum reaches exactly W/2 or it does not. It is the same backwards loop with booleans instead of values.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **0/1 knapsack** | Pick whole items, each at most once, to maximise value within a weight limit |
| **Take-or-skip decision** | Per item: the better of including it and excluding it |
| **Pseudo-polynomial time** | Polynomial in the *number* W, not in its size in digits — fast only when W is small |
| **Space-optimised (1D) DP** | One array overwritten in an order that keeps every read correct |
| **Unbounded knapsack** | Each item may be used any number of times; the 1D loop runs forwards |
| **Fractional knapsack** | Items may be split; greedy by value per weight is optimal |

---
**Conclusion:** The 0/1 knapsack is a take-or-skip DP: \`dp[i][c]\` is the best value from the first i items within capacity c, and each cell is the larger of skipping the item and taking it on top of \`dp[i-1][c-w]\`. In Python the interview version is one list and a loop \`for c in range(W, w - 1, -1)\` — backwards so each item is used once, and stopping at \`w\` so a negative index never reads the wrong end of the list. Keep the 2D table when the items must be listed. Our runs showed why the details matter: greedy gave 160 instead of 220, the forward loop gave 300, and the DP matched a 65,536-subset brute force with only 1,616 cells.`,
        examples: [
          {
            label: `2D knapsack table, best value and the chosen items`,
            code: `def knapsack_table(weights, values, cap):
    n = len(weights)
    # dp[i][c] = best value using only the first i items with capacity c
    dp = [[0] * (cap + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        w, v = weights[i - 1], values[i - 1]
        for c in range(cap + 1):
            dp[i][c] = dp[i - 1][c]                      # skip item i-1
            if w <= c and dp[i - 1][c - w] + v > dp[i][c]:
                dp[i][c] = dp[i - 1][c - w] + v          # take item i-1 (once)
    return dp


def chosen_items(weights, dp, cap):
    items, c = [], cap
    for i in range(len(weights), 0, -1):
        if dp[i][c] != dp[i - 1][c]:                     # the value changed, so item i-1 was taken
            items.append(i - 1)
            c -= weights[i - 1]
    return items[::-1]


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


weights, values, cap = [1, 3, 4, 5], [1, 4, 5, 7], 7
dp = knapsack_table(weights, values, cap)
print("table rows (capacity 0..7), items (w, v) = (1, 1) (3, 4) (4, 5) (5, 7):")
for i in range(len(weights) + 1):
    print("first " + str(i) + " items " + fmt(dp[i]))

cases = [([1, 3, 4, 5], [1, 4, 5, 7], 7), ([10, 20, 30], [60, 100, 120], 50),
         ([1, 2, 3], [6, 10, 12], 5), ([5], [10], 4), ([1, 2], [3, 4], 0), ([], [], 10)]
for weights, values, cap in cases:
    dp = knapsack_table(weights, values, cap)
    items = chosen_items(weights, dp, cap)
    used = sum(weights[k] for k in items)
    print("w=" + fmt(weights) + " v=" + fmt(values) + " cap=" + str(cap) + ": best " +
          str(dp[len(weights)][cap]) + ", items " + fmt(items) + ", weight used " + str(used))`,
          },
          {
            label: `1D backwards vs forwards, greedy, and brute force`,
            code: `from functools import cmp_to_key


def one_row(weights, values, cap, backwards=True):
    dp = [0] * (cap + 1)                 # dp[c] = best value with capacity c so far
    for w, v in zip(weights, values):
        order = range(cap, w - 1, -1) if backwards else range(w, cap + 1)
        for c in order:
            dp[c] = max(dp[c], dp[c - w] + v)
    return dp[cap]


def brute_force(weights, values, cap):
    n, best, checked = len(weights), 0, 0
    for mask in range(1 << n):           # every subset of the n items
        checked += 1
        w = v = 0
        for k in range(n):
            if mask >> k & 1:
                w += weights[k]
                v += values[k]
        if w <= cap and v > best:
            best = v
    return best, checked


def greedy_by_ratio(weights, values, cap):
    # compare v[a]/w[a] with v[b]/w[b] by cross-multiplying: exact, no floats
    def better(a, b):
        return values[b] * weights[a] - values[a] * weights[b] or a - b
    order = sorted(range(len(weights)), key=cmp_to_key(better))
    total = 0
    for k in order:
        if weights[k] <= cap:
            cap -= weights[k]
            total += values[k]
    return total


for weights, values, cap in [([10, 20, 30], [60, 100, 120], 50), ([2], [3], 6), ([1, 3, 4, 5], [1, 4, 5, 7], 7)]:
    print("cap " + str(cap) + ": backwards (0/1) " + str(one_row(weights, values, cap, True)) +
          ", forwards (reuses items) " + str(one_row(weights, values, cap, False)) +
          ", greedy by value/weight " + str(greedy_by_ratio(weights, values, cap)))

seed = 777
def nxt():
    global seed
    seed = seed * 48271 % 2147483647
    return seed

n = 16
weights = [1 + nxt() % 30 for _ in range(n)]
values = [1 + nxt() % 100 for _ in range(n)]
cap = 100
best, checked = brute_force(weights, values, cap)
print("16 random items, cap 100: brute force " + str(best) + " after " + str(checked) +
      " subsets; dp " + str(one_row(weights, values, cap)) + " after " + str(n * (cap + 1)) + " cells")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You have n items, each with a weight and a value, and a bag that holds at most W. Each item can be taken at most once. What is the largest total value you can carry? Walk me through your approach and code it in JavaScript."

**What a strong answer should cover:**
- Why greedy (best value per weight first) fails for 0/1 items, with a counter-example.
- The state \`dp[i][c]\` = best value from the first i items with capacity c, and the take-or-skip transition \`max(dp[i-1][c], dp[i-1][c-w] + v)\`.
- O(n·W) time, pseudo-polynomial, and O(W) space with one row looped **backwards** — and why forwards would reuse items (unbounded knapsack).
- Rebuilding the chosen items by walking back through the full table.
- JavaScript details: an out-of-range \`dp[c - w]\` is \`undefined\` and turns sums into \`NaN\` instead of failing, \`Array.from\` for the 2D table, and numbers being exact up to 2^53.

**Clarifying questions expected:**
- Can an item be used more than once, or split?
- How large are W and n?
- Do you need the chosen items or only the best value?

**Code / implementation expected:** Yes — the one-row DP with a backwards capacity loop in JavaScript; the 2D table if the items must be listed.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, arrays and arrays of arrays.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are packing for a weekend hike. Your backpack can carry 7 kg. On the table are a water filter (1 kg, usefulness 1), a stove (3 kg, usefulness 4), a tent (4 kg, usefulness 5) and a camera (5 kg, usefulness 7). You cannot take half a tent. Which items should go in to make the trip as good as possible?

The camera is the "best" single item, so you might grab it first — then only 2 kg is left and you can add just the filter: usefulness 8. But stove + tent weighs exactly 7 kg and is worth 9. Grabbing the best-looking item first was wrong.

That is the **0/1 knapsack problem**: each item is either taken whole (1) or left behind (0), and you want the most value without passing the weight limit. It models budgets (projects with costs and payoffs), cargo loading, picking ads for a time slot, and it is the parent of a family of interview problems — [partition into two equal-sum subsets](/interview-question/how-do-you-check-if-an-array-can-be-partitioned-into-two-equal-sum-subsets) is knapsack with value = weight, and [coin change](/interview-question/how-do-you-solve-the-coin-change-problem) is its "unlimited copies" cousin.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can each item be taken at most once, or unlimited times? | Once = 0/1 knapsack (capacity loop goes **backwards** in 1D). Unlimited = unbounded knapsack (loop goes forwards). |
| Can items be split? | If fractions are allowed (fractional knapsack), greedy by value/weight is optimal and no DP is needed. |
| How large is the capacity W? | The DP costs O(n·W). W = 10,000 is fine; W = 10^9 is not, and you need another approach (e.g. DP over value, or meet in the middle for small n). |
| Are weights and values integers? Can they be zero or negative? | The table is indexed by integer capacity; zero-weight items need care; negative values are simply never taken. |
| Do you need the best value only, or which items? | The value needs one row; the item list needs the full table to walk back through. |
| Must the bag be filled exactly? | "Exactly W" changes the start values: unreachable capacities begin at −∞ instead of 0. |

## 3. The Core Idea in Plain Words

📌 **Interview term: 0/1 knapsack** — given n items with weights and values and a capacity W, choose a subset with total weight ≤ W and the largest total value; each item is taken whole or not at all.

Trying every subset works but there are 2^n of them. Instead, decide **one item at a time** and ask a smaller question:

> What is the best value using only the first i items, with a bag of capacity c?

Call it \`dp[i][c]\`. For item i (weight w, value v) there are only two choices:

- **Skip it.** The best is whatever the first i − 1 items could do with the same capacity: \`dp[i-1][c]\`.
- **Take it** (only if w ≤ c). It uses w of the capacity and adds v: \`dp[i-1][c-w] + v\`. Note the **i − 1**: after taking item i, the remaining capacity may only use the *earlier* items, so item i cannot be taken twice.

\`dp[i][c]\` is the larger of the two. The base case is \`dp[0][c] = 0\` — no items, no value.

📌 **Interview term: Take-or-skip decision** — the two-way choice per item that defines 0/1 knapsack (and [house robber](/interview-question/how-do-you-solve-the-house-robber-problem), subset sum and many others): the answer is the better of "include it" and "exclude it".

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Each knapsack cell is the larger of two choices: skip the item and keep dp of i minus 1 at c, or take it and add its value to dp of i minus 1 at c minus w">
  <defs>
    <marker id="b29q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="260" height="80" rx="10"/>
  <text class="d-text" x="160" y="64" text-anchor="middle">skip item i</text>
  <text class="d-sub" x="160" y="90" text-anchor="middle">dp[i-1][c]</text>
  <rect class="d-box-muted" x="390" y="30" width="260" height="80" rx="10"/>
  <text class="d-text" x="520" y="64" text-anchor="middle">take item i (if w fits)</text>
  <text class="d-sub" x="520" y="90" text-anchor="middle">dp[i-1][c-w] + v</text>
  <rect class="d-box-accent" x="210" y="200" width="260" height="80" rx="10"/>
  <text class="d-text" x="340" y="234" text-anchor="middle">dp[i][c]</text>
  <text class="d-sub" x="340" y="260" text-anchor="middle">the larger of the two</text>
  <path class="d-edge" d="M 160 112 L 280 196" marker-end="url(#b29q4-arrow)"/>
  <path class="d-edge-accent" d="M 520 112 L 400 196" marker-end="url(#b29q4-arrow)"/>
</svg>

Fill the table one row per item, capacity 0 to W. Here is the table for the hiking example (weights 1, 3, 4, 5; values 1, 4, 5, 7; capacity 7), exactly as example 1 prints it:

<svg class="iq-diagram" width="100%" viewBox="0 0 604 340" role="img" aria-label="The knapsack table for four items and capacity 7. The answer 9 sits in the bottom right cell">
  <text class="d-sub" x="302" y="24" text-anchor="middle">rows: items allowed so far, columns: capacity 0 to 7</text>
  <text class="d-text" x="114" y="56" text-anchor="middle">0</text>
  <text class="d-text" x="172" y="56" text-anchor="middle">1</text>
  <text class="d-text" x="230" y="56" text-anchor="middle">2</text>
  <text class="d-text" x="288" y="56" text-anchor="middle">3</text>
  <text class="d-text" x="346" y="56" text-anchor="middle">4</text>
  <text class="d-text" x="404" y="56" text-anchor="middle">5</text>
  <text class="d-text" x="462" y="56" text-anchor="middle">6</text>
  <text class="d-text" x="520" y="56" text-anchor="middle">7</text>
  <text class="d-text" x="55" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="88" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="146" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="204" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="262" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="320" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="378" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="436" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="494" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="100" text-anchor="middle">0</text>
  <text class="d-text" x="55" y="148" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="88" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="148" text-anchor="middle">0</text>
  <rect class="d-box" x="146" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="204" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="262" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="320" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="378" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="436" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="494" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="148" text-anchor="middle">1</text>
  <text class="d-text" x="55" y="196" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="88" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="196" text-anchor="middle">0</text>
  <rect class="d-box" x="146" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="196" text-anchor="middle">1</text>
  <rect class="d-box" x="204" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="196" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="262" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="196" text-anchor="middle">4</text>
  <rect class="d-box" x="320" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="196" text-anchor="middle">5</text>
  <rect class="d-box" x="378" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="196" text-anchor="middle">5</text>
  <rect class="d-box" x="436" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="196" text-anchor="middle">5</text>
  <rect class="d-box" x="494" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="196" text-anchor="middle">5</text>
  <text class="d-text" x="55" y="244" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="88" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="244" text-anchor="middle">0</text>
  <rect class="d-box" x="146" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="244" text-anchor="middle">1</text>
  <rect class="d-box" x="204" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="244" text-anchor="middle">1</text>
  <rect class="d-box" x="262" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="244" text-anchor="middle">4</text>
  <rect class="d-box" x="320" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="244" text-anchor="middle">5</text>
  <rect class="d-box" x="378" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="244" text-anchor="middle">6</text>
  <rect class="d-box" x="436" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="244" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="494" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="244" text-anchor="middle">9</text>
  <text class="d-text" x="55" y="292" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="88" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="292" text-anchor="middle">0</text>
  <rect class="d-box" x="146" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="292" text-anchor="middle">1</text>
  <rect class="d-box" x="204" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="292" text-anchor="middle">1</text>
  <rect class="d-box" x="262" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="292" text-anchor="middle">4</text>
  <rect class="d-box" x="320" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="292" text-anchor="middle">5</text>
  <rect class="d-box" x="378" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="292" text-anchor="middle">7</text>
  <rect class="d-box" x="436" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="292" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="494" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="292" text-anchor="middle">9</text>
</svg>

The answer is the bottom-right cell, 9. To find **which** items give it, walk back up from that cell: if \`dp[i][c]\` equals \`dp[i-1][c]\`, item i was skipped; otherwise it was taken, so subtract its weight from c. The highlighted cells trace that walk: the camera is skipped (row 4 and row 3 both hold 9 at capacity 7), the tent is taken (c drops from 7 to 3), the stove is taken (c drops to 0).

📌 **Interview term: Pseudo-polynomial time** — O(n·W) looks polynomial, but W is a *number* in the input, not a count of items. Doubling the number of digits of W squares its size, so the DP is only fast when W itself is small. (The general 0/1 knapsack decision problem is NP-complete; the DP does not contradict that.)

## 4. Brute Force, Greedy, and the DP

- **Brute force.** Try all 2^n subsets. For 16 items that is 65,536 subsets (example 2); for 40 items it is about a trillion.
- **Greedy by value per kilogram.** Fast, but wrong for 0/1. With weights 10, 20, 30, values 60, 100, 120 and capacity 50, greedy takes the two "best ratio" items for 160 and has no room for the third; the right answer, 220, skips the best-ratio item (example 2 prints both). Greedy is only correct when items can be split.
- **The 2D table.** O(n·W) time and space, and it can rebuild the item list.
- **One row, capacity backwards.** Row i only reads row i − 1, so a single array works — **if** capacity is looped from W down to w. Going downwards means \`dp[c - w]\` still holds the *previous* row's value when it is read, so every item is used at most once.

📌 **Interview term: Space-optimised (1D) DP** — collapsing the table to one array that is overwritten in place, in an order chosen so that every read still sees the value the 2D table would have had.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 330" role="img" aria-label="One item of weight 2 and value 3, capacity 0 to 6. Looping capacity forwards reaches 9 by reusing the item, looping backwards correctly stops at 3">
  <defs>
    <marker id="b29q4-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="65" y="30" text-anchor="middle">c = 0</text>
  <text class="d-sub" x="155" y="30" text-anchor="middle">c = 1</text>
  <text class="d-sub" x="245" y="30" text-anchor="middle">c = 2</text>
  <text class="d-sub" x="335" y="30" text-anchor="middle">c = 3</text>
  <text class="d-sub" x="425" y="30" text-anchor="middle">c = 4</text>
  <text class="d-sub" x="515" y="30" text-anchor="middle">c = 5</text>
  <text class="d-sub" x="605" y="30" text-anchor="middle">c = 6</text>
  <text class="d-sub" x="20" y="66">forwards: reuses the item</text>
  <rect class="d-box" x="30" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="65" y="111" text-anchor="middle">0</text>
  <rect class="d-box" x="120" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="155" y="111" text-anchor="middle">0</text>
  <rect class="d-box" x="210" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="245" y="111" text-anchor="middle">3</text>
  <rect class="d-box" x="300" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="335" y="111" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="390" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="425" y="111" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="480" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="515" y="111" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="570" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="605" y="111" text-anchor="middle">9</text>
  <path class="d-edge-accent" d="M 245 134 Q 335 172 425 134" fill="none" marker-end="url(#b29q4-arrow2)"/>
  <path class="d-edge-accent" d="M 425 134 Q 515 172 605 134" fill="none" marker-end="url(#b29q4-arrow2)"/>
  <text class="d-sub" x="20" y="226">backwards: each item used once</text>
  <rect class="d-box" x="30" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="65" y="271" text-anchor="middle">0</text>
  <rect class="d-box" x="120" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="155" y="271" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="210" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="245" y="271" text-anchor="middle">3</text>
  <rect class="d-box" x="300" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="335" y="271" text-anchor="middle">3</text>
  <rect class="d-box" x="390" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="425" y="271" text-anchor="middle">3</text>
  <rect class="d-box" x="480" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="515" y="271" text-anchor="middle">3</text>
  <rect class="d-box" x="570" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="605" y="271" text-anchor="middle">3</text>
</svg>

With one item (weight 2, value 3) and capacity 6, the forward loop computes \`dp[2] = 3\`, then reads that *new* value for \`dp[4] = 6\` and again for \`dp[6] = 9\` — it packed the same item three times. The backward loop fills \`dp[6]\` first from the old \`dp[4] = 0\`, so the answer stays 3. The forward loop is exactly right for the **unbounded** knapsack, which is why coin change uses it.

📌 **Interview term: Unbounded knapsack** — the variant where each item may be taken any number of times; the 1D capacity loop runs forwards so an item can build on itself.

## 5. The Code in JavaScript

The full table, and the walk back that lists the chosen items (0-based indices):

~~~javascript
// dp[i][c] = best value using only the first i items with capacity c
function knapsackTable(weights, values, cap) {
  const n = weights.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(cap + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    const w = weights[i - 1], v = values[i - 1];
    for (let c = 0; c <= cap; c++) {
      dp[i][c] = dp[i - 1][c];                                   // skip item i-1
      if (w <= c && dp[i - 1][c - w] + v > dp[i][c]) dp[i][c] = dp[i - 1][c - w] + v;   // take it once
    }
  }
  return dp;
}

function chosenItems(weights, dp, cap) {
  const items = [];
  let c = cap;
  for (let i = weights.length; i > 0; i--) {
    if (dp[i][c] !== dp[i - 1][c]) { items.push(i - 1); c -= weights[i - 1]; }   // value changed: taken
  }
  return items.reverse();
}
~~~

**What to point out in this code:**

- Row 0 is all zeros (no items), and every row starts as a copy of the row above (skip), then improves where taking the item is better. \`Array.from\` gives each row its own array.
- The guard \`w <= c\` comes first in the \`&&\`. Without it, \`dp[i - 1][c - w]\` reads index -1 or lower, which is just \`undefined\` on a JavaScript array; \`undefined + v\` is \`NaN\`, and \`NaN > x\` is \`false\` — so the bug can hide instead of crashing.
- \`chosenItems\` walks from the last item up: if the value in row i differs from row i − 1 at the current capacity, item i − 1 was taken and its weight comes off c. It pushes backwards and returns \`items.reverse()\`.

**The usual interview answer**, one row with the capacity looped **backwards**:

~~~javascript
function oneRow(weights, values, cap, backwards) {
  const dp = new Array(cap + 1).fill(0);           // dp[c] = best value with capacity c so far
  for (let k = 0; k < weights.length; k++) {
    const w = weights[k], v = values[k];
    if (backwards) for (let c = cap; c >= w; c--) dp[c] = Math.max(dp[c], dp[c - w] + v);
    else for (let c = w; c <= cap; c++) dp[c] = Math.max(dp[c], dp[c - w] + v);
  }
  return dp[cap];
}
~~~

\`for (let c = cap; c >= w; c--)\` stops at w, so \`dp[c - w]\` is never negative. With \`backwards\` false the same function is the unbounded knapsack; example 2 runs both. \`new Array(cap + 1).fill(0)\` is fine here because it is filled with a number, not with an array — the shared-row trap only applies to objects.

**Number range.** Values are added as JavaScript numbers, which are exact integers up to \`Number.MAX_SAFE_INTEGER\` (2^53 − 1), so sums of values do not overflow the way 32-bit integers do. If you store the row in an \`Int32Array\` for speed, sums above 2,147,483,647 wrap around.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node 22). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the table for the hiking example, then six cases with the chosen items** prints:

~~~text
table rows (capacity 0..7), items (w, v) = (1, 1) (3, 4) (4, 5) (5, 7):
first 0 items [0, 0, 0, 0, 0, 0, 0, 0]
first 1 items [0, 1, 1, 1, 1, 1, 1, 1]
first 2 items [0, 1, 1, 4, 5, 5, 5, 5]
first 3 items [0, 1, 1, 4, 5, 6, 6, 9]
first 4 items [0, 1, 1, 4, 5, 7, 8, 9]
w=[1, 3, 4, 5] v=[1, 4, 5, 7] cap=7: best 9, items [1, 2], weight used 7
w=[10, 20, 30] v=[60, 100, 120] cap=50: best 220, items [1, 2], weight used 50
w=[1, 2, 3] v=[6, 10, 12] cap=5: best 22, items [1, 2], weight used 5
w=[5] v=[10] cap=4: best 0, items [], weight used 0
w=[1, 2] v=[3, 4] cap=0: best 0, items [], weight used 0
w=[] v=[] cap=10: best 0, items [], weight used 0
~~~

- The five table rows are the diagram in section 3; the answer 9 uses items 1 and 2 (the stove and the tent), weight exactly 7.
- Weights 10, 20, 30 with values 60, 100, 120 and capacity 50 give 220 from items 1 and 2 — the classic case where the best-ratio item (index 0) is *not* in the answer.
- An item heavier than the bag, a zero capacity and an empty item list all give 0 with no items.

**Example 2 — loop direction, greedy, and brute force** prints:

~~~text
cap 50: backwards (0/1) 220, forwards (reuses items) 300, greedy by value/weight 160
cap 6: backwards (0/1) 3, forwards (reuses items) 9, greedy by value/weight 3
cap 7: backwards (0/1) 9, forwards (reuses items) 9, greedy by value/weight 8
16 random items, cap 100: brute force 481 after 65536 subsets; dp 481 after 1616 cells
~~~

- **Direction:** for capacity 50 the forward loop reports 300 (item 0 packed five times) and for one item of weight 2 it reports 9 (packed three times). Only the backward loop is 0/1. For the hiking case both happen to give 9 — a test that passes by luck.
- **Greedy** by value per weight gives 160 instead of 220, and 8 instead of 9. It is not a correct algorithm for 0/1 items.
- **Brute force** over all 65,536 subsets of 16 random items agrees with the DP (481), which fills only 16 × 101 = 1,616 cells.

## 7. Complexity

n items, capacity W.

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(2^n · n) | O(n) | every subset, each summed in O(n) |
| Greedy by ratio | O(n log n) | O(n) | one sort — but not correct for 0/1 |
| 2D table | O(n·W) | O(n·W) | one O(1) cell per (item, capacity) |
| 1D, backwards | O(n·W) | O(W) | each row overwrites the previous in place |
| Rebuild items | O(n) extra | needs the 2D table | one step per item |

In JavaScript a 2D table of n·W numbers is the memory to watch: 1,000 items and W = 100,000 is 100 million cells. If W is huge but values are small, swap the roles — \`dp[value]\` = smallest weight achieving that value — and the cost becomes O(n · total value).

## 8. Edge Cases

- **Capacity 0.** Nothing fits; the answer is 0 and the item list is empty.
- **No items.** The answer is 0.
- **An item heavier than the bag.** It is always skipped (\`w > c\` for every c); weights [5] with capacity 4 gives 0.
- **Several optimal subsets.** The walk back reports one of them; with ties, which one depends on the comparison (\`>\` vs \`>=\`) you use while filling.
- **Zero-weight items.** In the backward 1D loop with w = 0, \`dp[c - w]\` is \`dp[c]\` itself, still holding the old value when it is read — fine for 0/1. Make sure the loop still visits c = 0.
- **Large values.** The answer is a sum of values; check whether it can exceed your integer type.

## Common Pitfalls

- **Forward capacity loop in the 1D version.** It silently solves the unbounded knapsack: 300 instead of 220 in our run.
- **Out-of-range reads become \`NaN\`, not errors.** \`dp[-1]\` is \`undefined\`; keep \`w <= c\` (or the loop bound) so the read is always valid.
- **Greedy by value/weight.** Only correct for the fractional knapsack; our run shows 160 vs 220. If you do sort by ratio, cross-multiply instead of dividing to keep it exact, as example 2 does.
- **\`new Array(n + 1).fill(new Array(W + 1).fill(0))\`** — one shared row. Use \`Array.from\`.
- **Trying to list the items from the 1D array.** The previous rows are gone; keep the 2D table when the items are needed.
- **\`Int32Array\` overflow.** Typed-array values wrap at 32 bits; use a plain array or \`Float64Array\` if value sums can be large.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Why not greedy:</strong> <span style="color:#f0e2c8;">Best value-per-weight first fails for whole items: weights 10/20/30, values 60/100/120, capacity 50 gives 160 greedily but 220 optimally.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][c]</code> is the best value from the first i items with capacity c; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0][c] = 0</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The transition:</strong> <span style="color:#f0e2c8;">Skip or take: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max(dp[i-1][c], dp[i-1][c-w] + v)</code>, taking only when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w &lt;= c</code>. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i-1</code> in the take branch is what makes each item usable once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. One row:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (let c = W; c &gt;= w; c--) dp[c] = Math.max(dp[c], dp[c - w] + v)</code>. Backwards keeps the previous row in the cells still to be read. O(n·W) time, O(W) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Out-of-range reads give <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code> silently, so the loop must stop at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w</code>; build 2D tables with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the 1D loop have to go backwards?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Going down, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[c - w]</code> has not been updated for this item yet, so it is still the previous row. Going up, it may already include this item, which lets the item be taken again — the unbounded knapsack. In our run: 300 instead of 220.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is O(n·W) polynomial?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pseudo-polynomial: it is polynomial in the value of W, not in the number of bits needed to write W. The decision version of 0/1 knapsack is NP-complete, so no known algorithm is polynomial in the input size.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you list the chosen items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the 2D table and walk from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[n][W]</code> up: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][c] !== dp[i-1][c]</code>, item i−1 was taken, so record it and do <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c -= w</code>. In our run that gives items 1 and 2 for both classic examples.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if W is 10^9 but values are small?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Swap roles: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[v]</code> = smallest weight that achieves value v, over v up to the sum of values; the answer is the largest v with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[v] &lt;= W</code>. Time O(n · sum of values).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this connect to partition equal subset sum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Set every value equal to its weight and W to half the total; the subset sum reaches exactly W/2 or it does not. It is the same backwards loop with booleans instead of values.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **0/1 knapsack** | Pick whole items, each at most once, to maximise value within a weight limit |
| **Take-or-skip decision** | Per item: the better of including it and excluding it |
| **Pseudo-polynomial time** | Polynomial in the *number* W, not in its size in digits — fast only when W is small |
| **Space-optimised (1D) DP** | One array overwritten in an order that keeps every read correct |
| **Unbounded knapsack** | Each item may be used any number of times; the 1D loop runs forwards |
| **Fractional knapsack** | Items may be split; greedy by value per weight is optimal |

---
**Conclusion:** The 0/1 knapsack is a take-or-skip DP: \`dp[i][c]\` is the best value from the first i items within capacity c, and each cell is the larger of skipping the item and taking it on top of \`dp[i-1][c-w]\`. In JavaScript the interview version is one array and \`for (let c = W; c >= w; c--)\` — backwards so each item is used once, and stopping at \`w\` so no read falls off the array into \`undefined\`. Keep the 2D table when the items must be listed. Our runs showed why the details matter: greedy gave 160 instead of 220, the forward loop gave 300, and the DP matched a 65,536-subset brute force with only 1,616 cells.`,
        examples: [
          {
            label: `2D knapsack table, best value and the chosen items`,
            code: `// dp[i][c] = best value using only the first i items with capacity c
function knapsackTable(weights, values, cap) {
  const n = weights.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(cap + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    const w = weights[i - 1], v = values[i - 1];
    for (let c = 0; c <= cap; c++) {
      dp[i][c] = dp[i - 1][c];                                   // skip item i-1
      if (w <= c && dp[i - 1][c - w] + v > dp[i][c]) dp[i][c] = dp[i - 1][c - w] + v;   // take it once
    }
  }
  return dp;
}

function chosenItems(weights, dp, cap) {
  const items = [];
  let c = cap;
  for (let i = weights.length; i > 0; i--) {
    if (dp[i][c] !== dp[i - 1][c]) { items.push(i - 1); c -= weights[i - 1]; }   // value changed: taken
  }
  return items.reverse();
}

function fmt(xs) { return "[" + xs.join(", ") + "]"; }

let dp = knapsackTable([1, 3, 4, 5], [1, 4, 5, 7], 7);
console.log("table rows (capacity 0..7), items (w, v) = (1, 1) (3, 4) (4, 5) (5, 7):");
dp.forEach((row, i) => console.log("first " + i + " items " + fmt(row)));

const cases = [[[1, 3, 4, 5], [1, 4, 5, 7], 7], [[10, 20, 30], [60, 100, 120], 50],
               [[1, 2, 3], [6, 10, 12], 5], [[5], [10], 4], [[1, 2], [3, 4], 0], [[], [], 10]];
for (const [weights, values, cap] of cases) {
  const t = knapsackTable(weights, values, cap);
  const items = chosenItems(weights, t, cap);
  const used = items.reduce((s, k) => s + weights[k], 0);
  console.log("w=" + fmt(weights) + " v=" + fmt(values) + " cap=" + cap + ": best " +
              t[weights.length][cap] + ", items " + fmt(items) + ", weight used " + used);
}`,
          },
          {
            label: `1D backwards vs forwards, greedy, and brute force`,
            code: `function oneRow(weights, values, cap, backwards) {
  const dp = new Array(cap + 1).fill(0);           // dp[c] = best value with capacity c so far
  for (let k = 0; k < weights.length; k++) {
    const w = weights[k], v = values[k];
    if (backwards) for (let c = cap; c >= w; c--) dp[c] = Math.max(dp[c], dp[c - w] + v);
    else for (let c = w; c <= cap; c++) dp[c] = Math.max(dp[c], dp[c - w] + v);
  }
  return dp[cap];
}

function bruteForce(weights, values, cap) {
  const n = weights.length;
  let best = 0, checked = 0;
  for (let mask = 0; mask < (1 << n); mask++) {   // every subset of the n items
    checked++;
    let w = 0, v = 0;
    for (let k = 0; k < n; k++) if ((mask >> k) & 1) { w += weights[k]; v += values[k]; }
    if (w <= cap && v > best) best = v;
  }
  return [best, checked];
}

function greedyByRatio(weights, values, cap) {
  const order = weights.map((_, k) => k);
  // compare v[a]/w[a] with v[b]/w[b] by cross-multiplying: exact, no floats
  order.sort((a, b) => (values[b] * weights[a] - values[a] * weights[b]) || a - b);
  let total = 0;
  for (const k of order) if (weights[k] <= cap) { cap -= weights[k]; total += values[k]; }
  return total;
}

for (const [weights, values, cap] of [[[10, 20, 30], [60, 100, 120], 50], [[2], [3], 6], [[1, 3, 4, 5], [1, 4, 5, 7], 7]]) {
  console.log("cap " + cap + ": backwards (0/1) " + oneRow(weights, values, cap, true) +
              ", forwards (reuses items) " + oneRow(weights, values, cap, false) +
              ", greedy by value/weight " + greedyByRatio(weights, values, cap));
}

let seed = 777;
function nxt() { seed = (seed * 48271) % 2147483647; return seed; }
const n = 16, weights = [], values = [];
for (let k = 0; k < n; k++) weights.push(1 + nxt() % 30);
for (let k = 0; k < n; k++) values.push(1 + nxt() % 100);
const cap = 100;
const [best, checked] = bruteForce(weights, values, cap);
console.log("16 random items, cap 100: brute force " + best + " after " + checked +
            " subsets; dp " + oneRow(weights, values, cap, true) + " after " + n * (cap + 1) + " cells");`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You have n items, each with a weight and a value, and a bag that holds at most W. Each item can be taken at most once. What is the largest total value you can carry? Walk me through your approach and code it in Java."

**What a strong answer should cover:**
- Why greedy (best value per weight first) fails for 0/1 items, with a counter-example.
- The state \`dp[i][c]\` = best value from the first i items with capacity c, and the take-or-skip transition \`max(dp[i-1][c], dp[i-1][c-w] + v)\`.
- O(n·W) time, pseudo-polynomial, and O(W) space with one row looped **backwards** — and why forwards would reuse items (unbounded knapsack).
- Rebuilding the chosen items by walking back through the full table.
- Java details: the zero-filled \`int[]\` as the base case, the guard before the array read (or \`ArrayIndexOutOfBoundsException\`), and \`long\` when total value can pass \`Integer.MAX_VALUE\`.

**Clarifying questions expected:**
- Can an item be used more than once, or split?
- How large are W and n?
- Do you need the chosen items or only the best value?

**Code / implementation expected:** Yes — the one-row DP with a backwards capacity loop in Java; the 2D table if the items must be listed.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, arrays and 2D arrays.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are packing for a weekend hike. Your backpack can carry 7 kg. On the table are a water filter (1 kg, usefulness 1), a stove (3 kg, usefulness 4), a tent (4 kg, usefulness 5) and a camera (5 kg, usefulness 7). You cannot take half a tent. Which items should go in to make the trip as good as possible?

The camera is the "best" single item, so you might grab it first — then only 2 kg is left and you can add just the filter: usefulness 8. But stove + tent weighs exactly 7 kg and is worth 9. Grabbing the best-looking item first was wrong.

That is the **0/1 knapsack problem**: each item is either taken whole (1) or left behind (0), and you want the most value without passing the weight limit. It models budgets (projects with costs and payoffs), cargo loading, picking ads for a time slot, and it is the parent of a family of interview problems — [partition into two equal-sum subsets](/interview-question/how-do-you-check-if-an-array-can-be-partitioned-into-two-equal-sum-subsets) is knapsack with value = weight, and [coin change](/interview-question/how-do-you-solve-the-coin-change-problem) is its "unlimited copies" cousin.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can each item be taken at most once, or unlimited times? | Once = 0/1 knapsack (capacity loop goes **backwards** in 1D). Unlimited = unbounded knapsack (loop goes forwards). |
| Can items be split? | If fractions are allowed (fractional knapsack), greedy by value/weight is optimal and no DP is needed. |
| How large is the capacity W? | The DP costs O(n·W). W = 10,000 is fine; W = 10^9 is not, and you need another approach (e.g. DP over value, or meet in the middle for small n). |
| Are weights and values integers? Can they be zero or negative? | The table is indexed by integer capacity; zero-weight items need care; negative values are simply never taken. |
| Do you need the best value only, or which items? | The value needs one row; the item list needs the full table to walk back through. |
| Must the bag be filled exactly? | "Exactly W" changes the start values: unreachable capacities begin at −∞ instead of 0. |

## 3. The Core Idea in Plain Words

📌 **Interview term: 0/1 knapsack** — given n items with weights and values and a capacity W, choose a subset with total weight ≤ W and the largest total value; each item is taken whole or not at all.

Trying every subset works but there are 2^n of them. Instead, decide **one item at a time** and ask a smaller question:

> What is the best value using only the first i items, with a bag of capacity c?

Call it \`dp[i][c]\`. For item i (weight w, value v) there are only two choices:

- **Skip it.** The best is whatever the first i − 1 items could do with the same capacity: \`dp[i-1][c]\`.
- **Take it** (only if w ≤ c). It uses w of the capacity and adds v: \`dp[i-1][c-w] + v\`. Note the **i − 1**: after taking item i, the remaining capacity may only use the *earlier* items, so item i cannot be taken twice.

\`dp[i][c]\` is the larger of the two. The base case is \`dp[0][c] = 0\` — no items, no value.

📌 **Interview term: Take-or-skip decision** — the two-way choice per item that defines 0/1 knapsack (and [house robber](/interview-question/how-do-you-solve-the-house-robber-problem), subset sum and many others): the answer is the better of "include it" and "exclude it".

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Each knapsack cell is the larger of two choices: skip the item and keep dp of i minus 1 at c, or take it and add its value to dp of i minus 1 at c minus w">
  <defs>
    <marker id="b29q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="260" height="80" rx="10"/>
  <text class="d-text" x="160" y="64" text-anchor="middle">skip item i</text>
  <text class="d-sub" x="160" y="90" text-anchor="middle">dp[i-1][c]</text>
  <rect class="d-box-muted" x="390" y="30" width="260" height="80" rx="10"/>
  <text class="d-text" x="520" y="64" text-anchor="middle">take item i (if w fits)</text>
  <text class="d-sub" x="520" y="90" text-anchor="middle">dp[i-1][c-w] + v</text>
  <rect class="d-box-accent" x="210" y="200" width="260" height="80" rx="10"/>
  <text class="d-text" x="340" y="234" text-anchor="middle">dp[i][c]</text>
  <text class="d-sub" x="340" y="260" text-anchor="middle">the larger of the two</text>
  <path class="d-edge" d="M 160 112 L 280 196" marker-end="url(#b29q4-arrow)"/>
  <path class="d-edge-accent" d="M 520 112 L 400 196" marker-end="url(#b29q4-arrow)"/>
</svg>

Fill the table one row per item, capacity 0 to W. Here is the table for the hiking example (weights 1, 3, 4, 5; values 1, 4, 5, 7; capacity 7), exactly as example 1 prints it:

<svg class="iq-diagram" width="100%" viewBox="0 0 604 340" role="img" aria-label="The knapsack table for four items and capacity 7. The answer 9 sits in the bottom right cell">
  <text class="d-sub" x="302" y="24" text-anchor="middle">rows: items allowed so far, columns: capacity 0 to 7</text>
  <text class="d-text" x="114" y="56" text-anchor="middle">0</text>
  <text class="d-text" x="172" y="56" text-anchor="middle">1</text>
  <text class="d-text" x="230" y="56" text-anchor="middle">2</text>
  <text class="d-text" x="288" y="56" text-anchor="middle">3</text>
  <text class="d-text" x="346" y="56" text-anchor="middle">4</text>
  <text class="d-text" x="404" y="56" text-anchor="middle">5</text>
  <text class="d-text" x="462" y="56" text-anchor="middle">6</text>
  <text class="d-text" x="520" y="56" text-anchor="middle">7</text>
  <text class="d-text" x="55" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="88" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="146" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="204" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="262" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="320" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="378" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="436" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="494" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="100" text-anchor="middle">0</text>
  <text class="d-text" x="55" y="148" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="88" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="148" text-anchor="middle">0</text>
  <rect class="d-box" x="146" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="204" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="262" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="320" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="378" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="436" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="494" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="148" text-anchor="middle">1</text>
  <text class="d-text" x="55" y="196" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="88" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="196" text-anchor="middle">0</text>
  <rect class="d-box" x="146" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="196" text-anchor="middle">1</text>
  <rect class="d-box" x="204" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="196" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="262" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="196" text-anchor="middle">4</text>
  <rect class="d-box" x="320" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="196" text-anchor="middle">5</text>
  <rect class="d-box" x="378" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="196" text-anchor="middle">5</text>
  <rect class="d-box" x="436" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="196" text-anchor="middle">5</text>
  <rect class="d-box" x="494" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="196" text-anchor="middle">5</text>
  <text class="d-text" x="55" y="244" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="88" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="244" text-anchor="middle">0</text>
  <rect class="d-box" x="146" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="244" text-anchor="middle">1</text>
  <rect class="d-box" x="204" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="244" text-anchor="middle">1</text>
  <rect class="d-box" x="262" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="244" text-anchor="middle">4</text>
  <rect class="d-box" x="320" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="244" text-anchor="middle">5</text>
  <rect class="d-box" x="378" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="244" text-anchor="middle">6</text>
  <rect class="d-box" x="436" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="244" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="494" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="244" text-anchor="middle">9</text>
  <text class="d-text" x="55" y="292" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="88" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="292" text-anchor="middle">0</text>
  <rect class="d-box" x="146" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="292" text-anchor="middle">1</text>
  <rect class="d-box" x="204" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="292" text-anchor="middle">1</text>
  <rect class="d-box" x="262" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="292" text-anchor="middle">4</text>
  <rect class="d-box" x="320" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="292" text-anchor="middle">5</text>
  <rect class="d-box" x="378" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="292" text-anchor="middle">7</text>
  <rect class="d-box" x="436" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="292" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="494" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="292" text-anchor="middle">9</text>
</svg>

The answer is the bottom-right cell, 9. To find **which** items give it, walk back up from that cell: if \`dp[i][c]\` equals \`dp[i-1][c]\`, item i was skipped; otherwise it was taken, so subtract its weight from c. The highlighted cells trace that walk: the camera is skipped (row 4 and row 3 both hold 9 at capacity 7), the tent is taken (c drops from 7 to 3), the stove is taken (c drops to 0).

📌 **Interview term: Pseudo-polynomial time** — O(n·W) looks polynomial, but W is a *number* in the input, not a count of items. Doubling the number of digits of W squares its size, so the DP is only fast when W itself is small. (The general 0/1 knapsack decision problem is NP-complete; the DP does not contradict that.)

## 4. Brute Force, Greedy, and the DP

- **Brute force.** Try all 2^n subsets. For 16 items that is 65,536 subsets (example 2); for 40 items it is about a trillion.
- **Greedy by value per kilogram.** Fast, but wrong for 0/1. With weights 10, 20, 30, values 60, 100, 120 and capacity 50, greedy takes the two "best ratio" items for 160 and has no room for the third; the right answer, 220, skips the best-ratio item (example 2 prints both). Greedy is only correct when items can be split.
- **The 2D table.** O(n·W) time and space, and it can rebuild the item list.
- **One row, capacity backwards.** Row i only reads row i − 1, so a single array works — **if** capacity is looped from W down to w. Going downwards means \`dp[c - w]\` still holds the *previous* row's value when it is read, so every item is used at most once.

📌 **Interview term: Space-optimised (1D) DP** — collapsing the table to one array that is overwritten in place, in an order chosen so that every read still sees the value the 2D table would have had.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 330" role="img" aria-label="One item of weight 2 and value 3, capacity 0 to 6. Looping capacity forwards reaches 9 by reusing the item, looping backwards correctly stops at 3">
  <defs>
    <marker id="b29q4-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="65" y="30" text-anchor="middle">c = 0</text>
  <text class="d-sub" x="155" y="30" text-anchor="middle">c = 1</text>
  <text class="d-sub" x="245" y="30" text-anchor="middle">c = 2</text>
  <text class="d-sub" x="335" y="30" text-anchor="middle">c = 3</text>
  <text class="d-sub" x="425" y="30" text-anchor="middle">c = 4</text>
  <text class="d-sub" x="515" y="30" text-anchor="middle">c = 5</text>
  <text class="d-sub" x="605" y="30" text-anchor="middle">c = 6</text>
  <text class="d-sub" x="20" y="66">forwards: reuses the item</text>
  <rect class="d-box" x="30" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="65" y="111" text-anchor="middle">0</text>
  <rect class="d-box" x="120" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="155" y="111" text-anchor="middle">0</text>
  <rect class="d-box" x="210" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="245" y="111" text-anchor="middle">3</text>
  <rect class="d-box" x="300" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="335" y="111" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="390" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="425" y="111" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="480" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="515" y="111" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="570" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="605" y="111" text-anchor="middle">9</text>
  <path class="d-edge-accent" d="M 245 134 Q 335 172 425 134" fill="none" marker-end="url(#b29q4-arrow2)"/>
  <path class="d-edge-accent" d="M 425 134 Q 515 172 605 134" fill="none" marker-end="url(#b29q4-arrow2)"/>
  <text class="d-sub" x="20" y="226">backwards: each item used once</text>
  <rect class="d-box" x="30" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="65" y="271" text-anchor="middle">0</text>
  <rect class="d-box" x="120" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="155" y="271" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="210" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="245" y="271" text-anchor="middle">3</text>
  <rect class="d-box" x="300" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="335" y="271" text-anchor="middle">3</text>
  <rect class="d-box" x="390" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="425" y="271" text-anchor="middle">3</text>
  <rect class="d-box" x="480" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="515" y="271" text-anchor="middle">3</text>
  <rect class="d-box" x="570" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="605" y="271" text-anchor="middle">3</text>
</svg>

With one item (weight 2, value 3) and capacity 6, the forward loop computes \`dp[2] = 3\`, then reads that *new* value for \`dp[4] = 6\` and again for \`dp[6] = 9\` — it packed the same item three times. The backward loop fills \`dp[6]\` first from the old \`dp[4] = 0\`, so the answer stays 3. The forward loop is exactly right for the **unbounded** knapsack, which is why coin change uses it.

📌 **Interview term: Unbounded knapsack** — the variant where each item may be taken any number of times; the 1D capacity loop runs forwards so an item can build on itself.

## 5. The Code in Java

The full table, and the walk back that lists the chosen items (0-based indices):

~~~java
    // dp[i][c] = best value using only the first i items with capacity c
    static int[][] knapsackTable(int[] weights, int[] values, int cap) {
        int n = weights.length;
        int[][] dp = new int[n + 1][cap + 1];
        for (int i = 1; i <= n; i++) {
            int w = weights[i - 1], v = values[i - 1];
            for (int c = 0; c <= cap; c++) {
                dp[i][c] = dp[i - 1][c];                                    // skip item i-1
                if (w <= c && dp[i - 1][c - w] + v > dp[i][c]) dp[i][c] = dp[i - 1][c - w] + v;   // take it once
            }
        }
        return dp;
    }

    static List<Integer> chosenItems(int[] weights, int[][] dp, int cap) {
        List<Integer> items = new ArrayList<>();
        int c = cap;
        for (int i = weights.length; i > 0; i--)
            if (dp[i][c] != dp[i - 1][c]) { items.add(i - 1); c -= weights[i - 1]; }   // value changed: taken
        Collections.reverse(items);
        return items;
    }

~~~

**What to point out in this code:**

- \`new int[n + 1][cap + 1]\` is zero-filled, which is exactly the base case: row 0 (no items) is all zeros. Every row starts as a copy of the row above (skip), then improves where taking the item is better.
- The guard \`w <= c\` comes first in the \`&&\`, which short-circuits, so \`dp[i - 1][c - w]\` is never evaluated with a negative index — that would throw \`ArrayIndexOutOfBoundsException\`.
- \`chosenItems\` walks from the last item up: if the value in row i differs from row i − 1 at the current capacity, item i − 1 was taken and its weight comes off c. It collects into an \`ArrayList<Integer>\` and calls \`Collections.reverse\`; printing a \`List\` uses its \`toString\`, which gives the same \`[1, 2]\` format as the helper.

**The usual interview answer**, one row with the capacity looped **backwards**:

~~~java
    static int oneRow(int[] weights, int[] values, int cap, boolean backwards) {
        int[] dp = new int[cap + 1];                 // dp[c] = best value with capacity c so far
        for (int k = 0; k < weights.length; k++) {
            int w = weights[k], v = values[k];
            if (backwards) for (int c = cap; c >= w; c--) dp[c] = Math.max(dp[c], dp[c - w] + v);
            else for (int c = w; c <= cap; c++) dp[c] = Math.max(dp[c], dp[c - w] + v);
        }
        return dp[cap];
    }
~~~

\`for (int c = cap; c >= w; c--)\` stops at w, so \`dp[c - w]\` is never negative. With \`backwards\` false the same method is the unbounded knapsack; example 2 runs both.

**Overflow.** The answer is a sum of values. With \`int\` that is safe up to 2,147,483,647; if n·max(value) can pass that, make the row \`long[]\`. The greedy comparator in example 2 cross-multiplies in \`long\` (\`(long) values[b] * weights[a]\`) for the same reason, and sorts an \`Integer[]\` because \`Arrays.sort\` with a comparator needs objects, not \`int\`s.

## 6. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the table for the hiking example, then six cases with the chosen items** prints:

~~~text
table rows (capacity 0..7), items (w, v) = (1, 1) (3, 4) (4, 5) (5, 7):
first 0 items [0, 0, 0, 0, 0, 0, 0, 0]
first 1 items [0, 1, 1, 1, 1, 1, 1, 1]
first 2 items [0, 1, 1, 4, 5, 5, 5, 5]
first 3 items [0, 1, 1, 4, 5, 6, 6, 9]
first 4 items [0, 1, 1, 4, 5, 7, 8, 9]
w=[1, 3, 4, 5] v=[1, 4, 5, 7] cap=7: best 9, items [1, 2], weight used 7
w=[10, 20, 30] v=[60, 100, 120] cap=50: best 220, items [1, 2], weight used 50
w=[1, 2, 3] v=[6, 10, 12] cap=5: best 22, items [1, 2], weight used 5
w=[5] v=[10] cap=4: best 0, items [], weight used 0
w=[1, 2] v=[3, 4] cap=0: best 0, items [], weight used 0
w=[] v=[] cap=10: best 0, items [], weight used 0
~~~

- The five table rows are the diagram in section 3; the answer 9 uses items 1 and 2 (the stove and the tent), weight exactly 7.
- Weights 10, 20, 30 with values 60, 100, 120 and capacity 50 give 220 from items 1 and 2 — the classic case where the best-ratio item (index 0) is *not* in the answer.
- An item heavier than the bag, a zero capacity and an empty item list all give 0 with no items.

**Example 2 — loop direction, greedy, and brute force** prints:

~~~text
cap 50: backwards (0/1) 220, forwards (reuses items) 300, greedy by value/weight 160
cap 6: backwards (0/1) 3, forwards (reuses items) 9, greedy by value/weight 3
cap 7: backwards (0/1) 9, forwards (reuses items) 9, greedy by value/weight 8
16 random items, cap 100: brute force 481 after 65536 subsets; dp 481 after 1616 cells
~~~

- **Direction:** for capacity 50 the forward loop reports 300 (item 0 packed five times) and for one item of weight 2 it reports 9 (packed three times). Only the backward loop is 0/1. For the hiking case both happen to give 9 — a test that passes by luck.
- **Greedy** by value per weight gives 160 instead of 220, and 8 instead of 9. It is not a correct algorithm for 0/1 items.
- **Brute force** over all 65,536 subsets of 16 random items agrees with the DP (481), which fills only 16 × 101 = 1,616 cells.

## 7. Complexity

n items, capacity W.

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(2^n · n) | O(n) | every subset, each summed in O(n) |
| Greedy by ratio | O(n log n) | O(n) | one sort — but not correct for 0/1 |
| 2D table | O(n·W) | O(n·W) | one O(1) cell per (item, capacity) |
| 1D, backwards | O(n·W) | O(W) | each row overwrites the previous in place |
| Rebuild items | O(n) extra | needs the 2D table | one step per item |

A \`new int[n + 1][W + 1]\` table is 4 bytes per cell plus a header per row: 1,000 items and W = 100,000 is 400 MB and likely an \`OutOfMemoryError\` on a default heap, while the one-row version is 400 KB. If W is huge but values are small, swap the roles — \`dp[value]\` = smallest weight achieving that value — and the cost becomes O(n · total value).

## 8. Edge Cases

- **Capacity 0.** Nothing fits; the answer is 0 and the item list is empty.
- **No items.** The answer is 0.
- **An item heavier than the bag.** It is always skipped (\`w > c\` for every c); weights [5] with capacity 4 gives 0.
- **Several optimal subsets.** The walk back reports one of them; with ties, which one depends on the comparison (\`>\` vs \`>=\`) you use while filling.
- **Zero-weight items.** In the backward 1D loop with w = 0, \`dp[c - w]\` is \`dp[c]\` itself, still holding the old value when it is read — fine for 0/1. Make sure the loop still visits c = 0.
- **Large values.** The answer is a sum of values; check whether it can exceed your integer type.

## Common Pitfalls

- **Forward capacity loop in the 1D version.** It silently solves the unbounded knapsack: 300 instead of 220 in our run.
- **Checking \`w <= c\` after the read.** \`dp[i-1][c-w] + v > dp[i][c] && w <= c\` evaluates the array access first and throws; put the guard first, or start the loop at \`w\`.
- **\`int\` overflow of the total value.** Use \`long[]\` when values are large; Java wraps silently on overflow.
- **Greedy by value/weight.** Only correct for the fractional knapsack; our run shows 160 vs 220.
- **Trying to list the items from the 1D array.** The previous rows are gone; keep the 2D table when the items are needed.
- **Sorting \`int[]\` with a comparator.** \`Arrays.sort(int[], Comparator)\` does not exist; sort an \`Integer[]\` of indices, as the greedy code does.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Why not greedy:</strong> <span style="color:#f0e2c8;">Best value-per-weight first fails for whole items: weights 10/20/30, values 60/100/120, capacity 50 gives 160 greedily but 220 optimally.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][c]</code> is the best value from the first i items with capacity c; Java zero-fills <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new int[n + 1][W + 1]</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0][c] = 0</code> for free.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The transition:</strong> <span style="color:#f0e2c8;">Skip or take: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.max(dp[i-1][c], dp[i-1][c-w] + v)</code>, taking only when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w &lt;= c</code>. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i-1</code> in the take branch is what makes each item usable once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. One row:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (int c = W; c &gt;= w; c--) dp[c] = Math.max(dp[c], dp[c - w] + v);</code> Backwards keeps the previous row in the cells still to be read. O(n·W) time, O(W) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Guard before the array read (or start the loop at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w</code>), and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long[]</code> if the total value can pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the 1D loop have to go backwards?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Going down, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[c - w]</code> has not been updated for this item yet, so it is still the previous row. Going up, it may already include this item, which lets the item be taken again — the unbounded knapsack. In our run: 300 instead of 220.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is O(n·W) polynomial?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pseudo-polynomial: it is polynomial in the value of W, not in the number of bits needed to write W. The decision version of 0/1 knapsack is NP-complete, so no known algorithm is polynomial in the input size.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you list the chosen items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the 2D table and walk from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[n][W]</code> up: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][c] != dp[i-1][c]</code>, item i−1 was taken, so record it and do <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c -= w</code>. In our run that gives items 1 and 2 for both classic examples.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if W is 10^9 but values are small?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Swap roles: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[v]</code> = smallest weight that achieves value v, over v up to the sum of values; the answer is the largest v with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[v] &lt;= W</code>. Time O(n · sum of values).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this connect to partition equal subset sum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Set every value equal to its weight and W to half the total; the subset sum reaches exactly W/2 or it does not. It is the same backwards loop with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[]</code> instead of values.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **0/1 knapsack** | Pick whole items, each at most once, to maximise value within a weight limit |
| **Take-or-skip decision** | Per item: the better of including it and excluding it |
| **Pseudo-polynomial time** | Polynomial in the *number* W, not in its size in digits — fast only when W is small |
| **Space-optimised (1D) DP** | One array overwritten in an order that keeps every read correct |
| **Unbounded knapsack** | Each item may be used any number of times; the 1D loop runs forwards |
| **Fractional knapsack** | Items may be split; greedy by value per weight is optimal |

---
**Conclusion:** The 0/1 knapsack is a take-or-skip DP: \`dp[i][c]\` is the best value from the first i items within capacity c, and each cell is the larger of skipping the item and taking it on top of \`dp[i-1][c-w]\`. In Java the zero-filled \`int[]\` gives the base case for free, and the interview version is one array with \`for (int c = W; c >= w; c--)\` — backwards so each item is used once, and stopping at \`w\` so no index goes negative. Keep the 2D table when the items must be listed, and switch to \`long\` if values are large. Our runs showed why the details matter: greedy gave 160 instead of 220, the forward loop gave 300, and the DP matched a 65,536-subset brute force with only 1,616 cells.`,
        examples: [
          {
            label: `2D knapsack table, best value and the chosen items`,
            code: `import java.util.*;

public class Main {
    // dp[i][c] = best value using only the first i items with capacity c
    static int[][] knapsackTable(int[] weights, int[] values, int cap) {
        int n = weights.length;
        int[][] dp = new int[n + 1][cap + 1];
        for (int i = 1; i <= n; i++) {
            int w = weights[i - 1], v = values[i - 1];
            for (int c = 0; c <= cap; c++) {
                dp[i][c] = dp[i - 1][c];                                    // skip item i-1
                if (w <= c && dp[i - 1][c - w] + v > dp[i][c]) dp[i][c] = dp[i - 1][c - w] + v;   // take it once
            }
        }
        return dp;
    }

    static List<Integer> chosenItems(int[] weights, int[][] dp, int cap) {
        List<Integer> items = new ArrayList<>();
        int c = cap;
        for (int i = weights.length; i > 0; i--)
            if (dp[i][c] != dp[i - 1][c]) { items.add(i - 1); c -= weights[i - 1]; }   // value changed: taken
        Collections.reverse(items);
        return items;
    }

    static String fmt(int[] xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int k = 0; k < xs.length; k++) { if (k > 0) sb.append(", "); sb.append(xs[k]); }
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        int[][] dp = knapsackTable(new int[]{1, 3, 4, 5}, new int[]{1, 4, 5, 7}, 7);
        System.out.println("table rows (capacity 0..7), items (w, v) = (1, 1) (3, 4) (4, 5) (5, 7):");
        for (int i = 0; i < dp.length; i++) System.out.println("first " + i + " items " + fmt(dp[i]));

        int[][][] cases = {
            {{1, 3, 4, 5}, {1, 4, 5, 7}, {7}}, {{10, 20, 30}, {60, 100, 120}, {50}},
            {{1, 2, 3}, {6, 10, 12}, {5}}, {{5}, {10}, {4}}, {{1, 2}, {3, 4}, {0}}, {{}, {}, {10}}};
        for (int[][] cs : cases) {
            int[] weights = cs[0], values = cs[1];
            int cap = cs[2][0];
            int[][] t = knapsackTable(weights, values, cap);
            List<Integer> items = chosenItems(weights, t, cap);
            int used = 0;
            for (int k : items) used += weights[k];
            // List.toString prints [1, 2] - the same format as fmt
            System.out.println("w=" + fmt(weights) + " v=" + fmt(values) + " cap=" + cap + ": best "
                    + t[weights.length][cap] + ", items " + items + ", weight used " + used);
        }
    }
}`,
          },
          {
            label: `1D backwards vs forwards, greedy, and brute force`,
            code: `import java.util.*;

public class Main {
    static int oneRow(int[] weights, int[] values, int cap, boolean backwards) {
        int[] dp = new int[cap + 1];                 // dp[c] = best value with capacity c so far
        for (int k = 0; k < weights.length; k++) {
            int w = weights[k], v = values[k];
            if (backwards) for (int c = cap; c >= w; c--) dp[c] = Math.max(dp[c], dp[c - w] + v);
            else for (int c = w; c <= cap; c++) dp[c] = Math.max(dp[c], dp[c - w] + v);
        }
        return dp[cap];
    }

    static long checked;
    static int bruteForce(int[] weights, int[] values, int cap) {
        int n = weights.length, best = 0;
        checked = 0;
        for (int mask = 0; mask < (1 << n); mask++) {   // every subset of the n items
            checked++;
            int w = 0, v = 0;
            for (int k = 0; k < n; k++) if ((mask >> k & 1) == 1) { w += weights[k]; v += values[k]; }
            if (w <= cap && v > best) best = v;
        }
        return best;
    }

    static int greedyByRatio(int[] weights, int[] values, int cap) {
        Integer[] order = new Integer[weights.length];   // boxed: Arrays.sort with a comparator needs objects
        for (int k = 0; k < order.length; k++) order[k] = k;
        // compare v[a]/w[a] with v[b]/w[b] by cross-multiplying: exact, no floats
        Arrays.sort(order, (a, b) -> {
            long d = (long) values[b] * weights[a] - (long) values[a] * weights[b];
            return d != 0 ? Long.signum(d) : Integer.compare(a, b);
        });
        int total = 0;
        for (int k : order) if (weights[k] <= cap) { cap -= weights[k]; total += values[k]; }
        return total;
    }

    static long seed = 777;
    static long nxt() { seed = seed * 48271 % 2147483647L; return seed; }

    public static void main(String[] args) {
        int[][][] cases = {{{10, 20, 30}, {60, 100, 120}, {50}}, {{2}, {3}, {6}}, {{1, 3, 4, 5}, {1, 4, 5, 7}, {7}}};
        for (int[][] cs : cases) {
            int cap = cs[2][0];
            System.out.println("cap " + cap + ": backwards (0/1) " + oneRow(cs[0], cs[1], cap, true)
                    + ", forwards (reuses items) " + oneRow(cs[0], cs[1], cap, false)
                    + ", greedy by value/weight " + greedyByRatio(cs[0], cs[1], cap));
        }
        int n = 16, cap = 100;
        int[] weights = new int[n], values = new int[n];
        for (int k = 0; k < n; k++) weights[k] = (int) (1 + nxt() % 30);
        for (int k = 0; k < n; k++) values[k] = (int) (1 + nxt() % 100);
        int best = bruteForce(weights, values, cap);
        System.out.println("16 random items, cap 100: brute force " + best + " after " + checked
                + " subsets; dp " + oneRow(weights, values, cap, true) + " after " + n * (cap + 1) + " cells");
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You have n items, each with a weight and a value, and a bag that holds at most W. Each item can be taken at most once. What is the largest total value you can carry? Walk me through your approach and code it in C++."

**What a strong answer should cover:**
- Why greedy (best value per weight first) fails for 0/1 items, with a counter-example.
- The state \`dp[i][c]\` = best value from the first i items with capacity c, and the take-or-skip transition \`max(dp[i-1][c], dp[i-1][c-w] + v)\`.
- O(n·W) time, pseudo-polynomial, and O(W) space with one row looped **backwards** — and why forwards would reuse items (unbounded knapsack).
- Rebuilding the chosen items by walking back through the full table.
- C++ details: a signed \`int\` capacity loop (an unsigned one never stops at 0), no unchecked negative index with \`operator[]\`, and \`long long\` to avoid signed overflow.

**Clarifying questions expected:**
- Can an item be used more than once, or split?
- How large are W and n?
- Do you need the chosen items or only the best value?

**Code / implementation expected:** Yes — the one-row DP with a backwards capacity loop in C++; the 2D table if the items must be listed.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops and \`std::vector\`.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are packing for a weekend hike. Your backpack can carry 7 kg. On the table are a water filter (1 kg, usefulness 1), a stove (3 kg, usefulness 4), a tent (4 kg, usefulness 5) and a camera (5 kg, usefulness 7). You cannot take half a tent. Which items should go in to make the trip as good as possible?

The camera is the "best" single item, so you might grab it first — then only 2 kg is left and you can add just the filter: usefulness 8. But stove + tent weighs exactly 7 kg and is worth 9. Grabbing the best-looking item first was wrong.

That is the **0/1 knapsack problem**: each item is either taken whole (1) or left behind (0), and you want the most value without passing the weight limit. It models budgets (projects with costs and payoffs), cargo loading, picking ads for a time slot, and it is the parent of a family of interview problems — [partition into two equal-sum subsets](/interview-question/how-do-you-check-if-an-array-can-be-partitioned-into-two-equal-sum-subsets) is knapsack with value = weight, and [coin change](/interview-question/how-do-you-solve-the-coin-change-problem) is its "unlimited copies" cousin.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can each item be taken at most once, or unlimited times? | Once = 0/1 knapsack (capacity loop goes **backwards** in 1D). Unlimited = unbounded knapsack (loop goes forwards). |
| Can items be split? | If fractions are allowed (fractional knapsack), greedy by value/weight is optimal and no DP is needed. |
| How large is the capacity W? | The DP costs O(n·W). W = 10,000 is fine; W = 10^9 is not, and you need another approach (e.g. DP over value, or meet in the middle for small n). |
| Are weights and values integers? Can they be zero or negative? | The table is indexed by integer capacity; zero-weight items need care; negative values are simply never taken. |
| Do you need the best value only, or which items? | The value needs one row; the item list needs the full table to walk back through. |
| Must the bag be filled exactly? | "Exactly W" changes the start values: unreachable capacities begin at −∞ instead of 0. |

## 3. The Core Idea in Plain Words

📌 **Interview term: 0/1 knapsack** — given n items with weights and values and a capacity W, choose a subset with total weight ≤ W and the largest total value; each item is taken whole or not at all.

Trying every subset works but there are 2^n of them. Instead, decide **one item at a time** and ask a smaller question:

> What is the best value using only the first i items, with a bag of capacity c?

Call it \`dp[i][c]\`. For item i (weight w, value v) there are only two choices:

- **Skip it.** The best is whatever the first i − 1 items could do with the same capacity: \`dp[i-1][c]\`.
- **Take it** (only if w ≤ c). It uses w of the capacity and adds v: \`dp[i-1][c-w] + v\`. Note the **i − 1**: after taking item i, the remaining capacity may only use the *earlier* items, so item i cannot be taken twice.

\`dp[i][c]\` is the larger of the two. The base case is \`dp[0][c] = 0\` — no items, no value.

📌 **Interview term: Take-or-skip decision** — the two-way choice per item that defines 0/1 knapsack (and [house robber](/interview-question/how-do-you-solve-the-house-robber-problem), subset sum and many others): the answer is the better of "include it" and "exclude it".

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Each knapsack cell is the larger of two choices: skip the item and keep dp of i minus 1 at c, or take it and add its value to dp of i minus 1 at c minus w">
  <defs>
    <marker id="b29q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="260" height="80" rx="10"/>
  <text class="d-text" x="160" y="64" text-anchor="middle">skip item i</text>
  <text class="d-sub" x="160" y="90" text-anchor="middle">dp[i-1][c]</text>
  <rect class="d-box-muted" x="390" y="30" width="260" height="80" rx="10"/>
  <text class="d-text" x="520" y="64" text-anchor="middle">take item i (if w fits)</text>
  <text class="d-sub" x="520" y="90" text-anchor="middle">dp[i-1][c-w] + v</text>
  <rect class="d-box-accent" x="210" y="200" width="260" height="80" rx="10"/>
  <text class="d-text" x="340" y="234" text-anchor="middle">dp[i][c]</text>
  <text class="d-sub" x="340" y="260" text-anchor="middle">the larger of the two</text>
  <path class="d-edge" d="M 160 112 L 280 196" marker-end="url(#b29q4-arrow)"/>
  <path class="d-edge-accent" d="M 520 112 L 400 196" marker-end="url(#b29q4-arrow)"/>
</svg>

Fill the table one row per item, capacity 0 to W. Here is the table for the hiking example (weights 1, 3, 4, 5; values 1, 4, 5, 7; capacity 7), exactly as example 1 prints it:

<svg class="iq-diagram" width="100%" viewBox="0 0 604 340" role="img" aria-label="The knapsack table for four items and capacity 7. The answer 9 sits in the bottom right cell">
  <text class="d-sub" x="302" y="24" text-anchor="middle">rows: items allowed so far, columns: capacity 0 to 7</text>
  <text class="d-text" x="114" y="56" text-anchor="middle">0</text>
  <text class="d-text" x="172" y="56" text-anchor="middle">1</text>
  <text class="d-text" x="230" y="56" text-anchor="middle">2</text>
  <text class="d-text" x="288" y="56" text-anchor="middle">3</text>
  <text class="d-text" x="346" y="56" text-anchor="middle">4</text>
  <text class="d-text" x="404" y="56" text-anchor="middle">5</text>
  <text class="d-text" x="462" y="56" text-anchor="middle">6</text>
  <text class="d-text" x="520" y="56" text-anchor="middle">7</text>
  <text class="d-text" x="55" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="88" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="146" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="204" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="262" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="320" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="378" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="436" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="100" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="494" y="73" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="100" text-anchor="middle">0</text>
  <text class="d-text" x="55" y="148" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="88" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="148" text-anchor="middle">0</text>
  <rect class="d-box" x="146" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="204" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="262" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="320" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="378" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="436" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="494" y="121" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="148" text-anchor="middle">1</text>
  <text class="d-text" x="55" y="196" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="88" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="196" text-anchor="middle">0</text>
  <rect class="d-box" x="146" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="196" text-anchor="middle">1</text>
  <rect class="d-box" x="204" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="196" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="262" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="196" text-anchor="middle">4</text>
  <rect class="d-box" x="320" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="196" text-anchor="middle">5</text>
  <rect class="d-box" x="378" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="196" text-anchor="middle">5</text>
  <rect class="d-box" x="436" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="196" text-anchor="middle">5</text>
  <rect class="d-box" x="494" y="169" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="196" text-anchor="middle">5</text>
  <text class="d-text" x="55" y="244" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="88" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="244" text-anchor="middle">0</text>
  <rect class="d-box" x="146" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="244" text-anchor="middle">1</text>
  <rect class="d-box" x="204" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="244" text-anchor="middle">1</text>
  <rect class="d-box" x="262" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="244" text-anchor="middle">4</text>
  <rect class="d-box" x="320" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="244" text-anchor="middle">5</text>
  <rect class="d-box" x="378" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="244" text-anchor="middle">6</text>
  <rect class="d-box" x="436" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="244" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="494" y="217" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="244" text-anchor="middle">9</text>
  <text class="d-text" x="55" y="292" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="88" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="114" y="292" text-anchor="middle">0</text>
  <rect class="d-box" x="146" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="172" y="292" text-anchor="middle">1</text>
  <rect class="d-box" x="204" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="230" y="292" text-anchor="middle">1</text>
  <rect class="d-box" x="262" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="288" y="292" text-anchor="middle">4</text>
  <rect class="d-box" x="320" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="346" y="292" text-anchor="middle">5</text>
  <rect class="d-box" x="378" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="404" y="292" text-anchor="middle">7</text>
  <rect class="d-box" x="436" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="462" y="292" text-anchor="middle">8</text>
  <rect class="d-box-accent" x="494" y="265" width="52" height="42" rx="6"/>
  <text class="d-text" x="520" y="292" text-anchor="middle">9</text>
</svg>

The answer is the bottom-right cell, 9. To find **which** items give it, walk back up from that cell: if \`dp[i][c]\` equals \`dp[i-1][c]\`, item i was skipped; otherwise it was taken, so subtract its weight from c. The highlighted cells trace that walk: the camera is skipped (row 4 and row 3 both hold 9 at capacity 7), the tent is taken (c drops from 7 to 3), the stove is taken (c drops to 0).

📌 **Interview term: Pseudo-polynomial time** — O(n·W) looks polynomial, but W is a *number* in the input, not a count of items. Doubling the number of digits of W squares its size, so the DP is only fast when W itself is small. (The general 0/1 knapsack decision problem is NP-complete; the DP does not contradict that.)

## 4. Brute Force, Greedy, and the DP

- **Brute force.** Try all 2^n subsets. For 16 items that is 65,536 subsets (example 2); for 40 items it is about a trillion.
- **Greedy by value per kilogram.** Fast, but wrong for 0/1. With weights 10, 20, 30, values 60, 100, 120 and capacity 50, greedy takes the two "best ratio" items for 160 and has no room for the third; the right answer, 220, skips the best-ratio item (example 2 prints both). Greedy is only correct when items can be split.
- **The 2D table.** O(n·W) time and space, and it can rebuild the item list.
- **One row, capacity backwards.** Row i only reads row i − 1, so a single array works — **if** capacity is looped from W down to w. Going downwards means \`dp[c - w]\` still holds the *previous* row's value when it is read, so every item is used at most once.

📌 **Interview term: Space-optimised (1D) DP** — collapsing the table to one array that is overwritten in place, in an order chosen so that every read still sees the value the 2D table would have had.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 330" role="img" aria-label="One item of weight 2 and value 3, capacity 0 to 6. Looping capacity forwards reaches 9 by reusing the item, looping backwards correctly stops at 3">
  <defs>
    <marker id="b29q4-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="65" y="30" text-anchor="middle">c = 0</text>
  <text class="d-sub" x="155" y="30" text-anchor="middle">c = 1</text>
  <text class="d-sub" x="245" y="30" text-anchor="middle">c = 2</text>
  <text class="d-sub" x="335" y="30" text-anchor="middle">c = 3</text>
  <text class="d-sub" x="425" y="30" text-anchor="middle">c = 4</text>
  <text class="d-sub" x="515" y="30" text-anchor="middle">c = 5</text>
  <text class="d-sub" x="605" y="30" text-anchor="middle">c = 6</text>
  <text class="d-sub" x="20" y="66">forwards: reuses the item</text>
  <rect class="d-box" x="30" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="65" y="111" text-anchor="middle">0</text>
  <rect class="d-box" x="120" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="155" y="111" text-anchor="middle">0</text>
  <rect class="d-box" x="210" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="245" y="111" text-anchor="middle">3</text>
  <rect class="d-box" x="300" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="335" y="111" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="390" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="425" y="111" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="480" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="515" y="111" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="570" y="80" width="70" height="50" rx="8"/>
  <text class="d-text" x="605" y="111" text-anchor="middle">9</text>
  <path class="d-edge-accent" d="M 245 134 Q 335 172 425 134" fill="none" marker-end="url(#b29q4-arrow2)"/>
  <path class="d-edge-accent" d="M 425 134 Q 515 172 605 134" fill="none" marker-end="url(#b29q4-arrow2)"/>
  <text class="d-sub" x="20" y="226">backwards: each item used once</text>
  <rect class="d-box" x="30" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="65" y="271" text-anchor="middle">0</text>
  <rect class="d-box" x="120" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="155" y="271" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="210" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="245" y="271" text-anchor="middle">3</text>
  <rect class="d-box" x="300" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="335" y="271" text-anchor="middle">3</text>
  <rect class="d-box" x="390" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="425" y="271" text-anchor="middle">3</text>
  <rect class="d-box" x="480" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="515" y="271" text-anchor="middle">3</text>
  <rect class="d-box" x="570" y="240" width="70" height="50" rx="8"/>
  <text class="d-text" x="605" y="271" text-anchor="middle">3</text>
</svg>

With one item (weight 2, value 3) and capacity 6, the forward loop computes \`dp[2] = 3\`, then reads that *new* value for \`dp[4] = 6\` and again for \`dp[6] = 9\` — it packed the same item three times. The backward loop fills \`dp[6]\` first from the old \`dp[4] = 0\`, so the answer stays 3. The forward loop is exactly right for the **unbounded** knapsack, which is why coin change uses it.

📌 **Interview term: Unbounded knapsack** — the variant where each item may be taken any number of times; the 1D capacity loop runs forwards so an item can build on itself.

## 5. The Code in C++

The full table, and the walk back that lists the chosen items (0-based indices):

~~~cpp
// dp[i][c] = best value using only the first i items with capacity c
vector<vector<int>> knapsackTable(const vector<int>& weights, const vector<int>& values, int cap) {
    size_t n = weights.size();
    vector<vector<int>> dp(n + 1, vector<int>(cap + 1, 0));
    for (size_t i = 1; i <= n; i++) {
        int w = weights[i - 1], v = values[i - 1];
        for (int c = 0; c <= cap; c++) {
            dp[i][c] = dp[i - 1][c];                                     // skip item i-1
            if (w <= c && dp[i - 1][c - w] + v > dp[i][c]) dp[i][c] = dp[i - 1][c - w] + v;   // take it once
        }
    }
    return dp;
}

vector<int> chosenItems(const vector<int>& weights, const vector<vector<int>>& dp, int cap) {
    vector<int> items;
    int c = cap;
    for (size_t i = weights.size(); i > 0; i--)
        if (dp[i][c] != dp[i - 1][c]) { items.push_back(int(i - 1)); c -= weights[i - 1]; }   // value changed: taken
    reverse(items.begin(), items.end());
    return items;
}
~~~

**What to point out in this code:**

- \`vector<vector<int>> dp(n + 1, vector<int>(cap + 1, 0))\` gives the base case: row 0 (no items) is all zeros. Every row starts as a copy of the row above (skip), then improves where taking the item is better.
- The guard \`w <= c\` comes first in the \`&&\`, which short-circuits, so \`dp[i - 1][c - w]\` is never evaluated with a negative index. \`operator[]\` does no bounds checking: a negative index is undefined behaviour, not an exception.
- The weights and the capacity are **\`int\`**, not \`size_t\`. In the backwards loop \`for (int c = cap; c >= w; c--)\`, an unsigned \`c\` with \`w = 0\` would make \`c >= 0\` always true and wrap around below zero.
- \`chosenItems\` walks from the last item up: if the value in row i differs from row i − 1 at the current capacity, item i − 1 was taken and its weight comes off c. It uses \`size_t i\` with the test \`i > 0\`, so it never decrements past zero.

**The usual interview answer**, one row with the capacity looped **backwards**:

~~~cpp
int oneRow(const vector<int>& weights, const vector<int>& values, int cap, bool backwards) {
    vector<int> dp(cap + 1, 0);                    // dp[c] = best value with capacity c so far
    for (size_t k = 0; k < weights.size(); k++) {
        int w = weights[k], v = values[k];
        if (backwards) for (int c = cap; c >= w; c--) dp[c] = max(dp[c], dp[c - w] + v);
        else for (int c = w; c <= cap; c++) dp[c] = max(dp[c], dp[c - w] + v);
    }
    return dp[cap];
}
~~~

The loop stops at w, so \`dp[c - w]\` is never negative. With \`backwards\` false the same function is the unbounded knapsack; example 2 runs both.

**Overflow.** The answer is a sum of values; with 32-bit \`int\`, signed overflow is undefined behaviour, not a wrap. Use \`long long\` for the row if n·max(value) can pass 2,147,483,647. The greedy comparator in example 2 multiplies in \`long long\` (\`1LL * values[a] * weights[b]\`) for the same reason, and it is a strict "less than": \`std::sort\` requires a strict weak ordering, and a comparator that returns true for equal elements is undefined behaviour.

## 6. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the table for the hiking example, then six cases with the chosen items** prints:

~~~text
table rows (capacity 0..7), items (w, v) = (1, 1) (3, 4) (4, 5) (5, 7):
first 0 items [0, 0, 0, 0, 0, 0, 0, 0]
first 1 items [0, 1, 1, 1, 1, 1, 1, 1]
first 2 items [0, 1, 1, 4, 5, 5, 5, 5]
first 3 items [0, 1, 1, 4, 5, 6, 6, 9]
first 4 items [0, 1, 1, 4, 5, 7, 8, 9]
w=[1, 3, 4, 5] v=[1, 4, 5, 7] cap=7: best 9, items [1, 2], weight used 7
w=[10, 20, 30] v=[60, 100, 120] cap=50: best 220, items [1, 2], weight used 50
w=[1, 2, 3] v=[6, 10, 12] cap=5: best 22, items [1, 2], weight used 5
w=[5] v=[10] cap=4: best 0, items [], weight used 0
w=[1, 2] v=[3, 4] cap=0: best 0, items [], weight used 0
w=[] v=[] cap=10: best 0, items [], weight used 0
~~~

- The five table rows are the diagram in section 3; the answer 9 uses items 1 and 2 (the stove and the tent), weight exactly 7.
- Weights 10, 20, 30 with values 60, 100, 120 and capacity 50 give 220 from items 1 and 2 — the classic case where the best-ratio item (index 0) is *not* in the answer.
- An item heavier than the bag, a zero capacity and an empty item list all give 0 with no items.

**Example 2 — loop direction, greedy, and brute force** prints:

~~~text
cap 50: backwards (0/1) 220, forwards (reuses items) 300, greedy by value/weight 160
cap 6: backwards (0/1) 3, forwards (reuses items) 9, greedy by value/weight 3
cap 7: backwards (0/1) 9, forwards (reuses items) 9, greedy by value/weight 8
16 random items, cap 100: brute force 481 after 65536 subsets; dp 481 after 1616 cells
~~~

- **Direction:** for capacity 50 the forward loop reports 300 (item 0 packed five times) and for one item of weight 2 it reports 9 (packed three times). Only the backward loop is 0/1. For the hiking case both happen to give 9 — a test that passes by luck.
- **Greedy** by value per weight gives 160 instead of 220, and 8 instead of 9. It is not a correct algorithm for 0/1 items.
- **Brute force** over all 65,536 subsets of 16 random items agrees with the DP (481), which fills only 16 × 101 = 1,616 cells.

## 7. Complexity

n items, capacity W.

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(2^n · n) | O(n) | every subset, each summed in O(n) |
| Greedy by ratio | O(n log n) | O(n) | one sort — but not correct for 0/1 |
| 2D table | O(n·W) | O(n·W) | one O(1) cell per (item, capacity) |
| 1D, backwards | O(n·W) | O(W) | each row overwrites the previous in place |
| Rebuild items | O(n) extra | needs the 2D table | one step per item |

A \`vector<vector<int>>\` of (n + 1)·(W + 1) cells is 4 bytes per cell plus one allocation per row: 1,000 items and W = 100,000 is 400 MB, while the one-row version is 400 KB. If W is huge but values are small, swap the roles — \`dp[value]\` = smallest weight achieving that value — and the cost becomes O(n · total value).

## 8. Edge Cases

- **Capacity 0.** Nothing fits; the answer is 0 and the item list is empty.
- **No items.** The answer is 0.
- **An item heavier than the bag.** It is always skipped (\`w > c\` for every c); weights [5] with capacity 4 gives 0.
- **Several optimal subsets.** The walk back reports one of them; with ties, which one depends on the comparison (\`>\` vs \`>=\`) you use while filling.
- **Zero-weight items.** In the backward 1D loop with w = 0, \`dp[c - w]\` is \`dp[c]\` itself, still holding the old value when it is read — fine for 0/1. Make sure the loop still visits c = 0.
- **Large values.** The answer is a sum of values; check whether it can exceed your integer type.

## Common Pitfalls

- **Forward capacity loop in the 1D version.** It silently solves the unbounded knapsack: 300 instead of 220 in our run.
- **Unsigned capacity loops.** \`for (size_t c = W; c >= w; c--)\` never ends when w is 0; use a signed \`int\` for capacities.
- **Reading \`dp[c - w]\` with c < w.** Undefined behaviour with \`operator[]\`; start the loop at \`w\` or check first.
- **Signed overflow of the total value.** Undefined behaviour in C++; use \`long long\` when values are large.
- **A non-strict comparator** (\`<=\`) in \`std::sort\` when sorting items by ratio — undefined behaviour, and a real source of crashes.
- **Trying to list the items from the 1D array.** The previous rows are gone; keep the 2D table when the items are needed.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Why not greedy:</strong> <span style="color:#f0e2c8;">Best value-per-weight first fails for whole items: weights 10/20/30, values 60/100/120, capacity 50 gives 160 greedily but 220 optimally.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The state:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][c]</code> is the best value from the first i items with capacity c; the zero-initialised vector gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[0][c] = 0</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The transition:</strong> <span style="color:#f0e2c8;">Skip or take: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max(dp[i-1][c], dp[i-1][c-w] + v)</code>, taking only when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w &lt;= c</code>. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i-1</code> in the take branch is what makes each item usable once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. One row:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (int c = W; c &gt;= w; c--) dp[c] = max(dp[c], dp[c - w] + v);</code> Backwards keeps the previous row in the cells still to be read. O(n·W) time, O(W) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Signed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> for capacities so the backwards loop can stop, no unchecked negative index, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> if the total value can overflow.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the 1D loop have to go backwards?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Going down, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[c - w]</code> has not been updated for this item yet, so it is still the previous row. Going up, it may already include this item, which lets the item be taken again — the unbounded knapsack. In our run: 300 instead of 220.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is O(n·W) polynomial?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pseudo-polynomial: it is polynomial in the value of W, not in the number of bits needed to write W. The decision version of 0/1 knapsack is NP-complete, so no known algorithm is polynomial in the input size.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you list the chosen items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the 2D table and walk from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[n][W]</code> up: if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[i][c] != dp[i-1][c]</code>, item i−1 was taken, so record it and do <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">c -= w</code>. In our run that gives items 1 and 2 for both classic examples.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if W is 10^9 but values are small?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Swap roles: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[v]</code> = smallest weight that achieves value v, over v up to the sum of values; the answer is the largest v with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dp[v] &lt;= W</code>. Time O(n · sum of values).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this connect to partition equal subset sum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Set every value equal to its weight and W to half the total; the subset sum reaches exactly W/2 or it does not. It is the same backwards loop with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;char&gt;</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::bitset</code> of reachable sums.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **0/1 knapsack** | Pick whole items, each at most once, to maximise value within a weight limit |
| **Take-or-skip decision** | Per item: the better of including it and excluding it |
| **Pseudo-polynomial time** | Polynomial in the *number* W, not in its size in digits — fast only when W is small |
| **Space-optimised (1D) DP** | One array overwritten in an order that keeps every read correct |
| **Unbounded knapsack** | Each item may be used any number of times; the 1D loop runs forwards |
| **Fractional knapsack** | Items may be split; greedy by value per weight is optimal |

---
**Conclusion:** The 0/1 knapsack is a take-or-skip DP: \`dp[i][c]\` is the best value from the first i items within capacity c, and each cell is the larger of skipping the item and taking it on top of \`dp[i-1][c-w]\`. In C++ the interview version is one \`vector<int>\` and \`for (int c = W; c >= w; c--)\` — backwards so each item is used once, with a signed loop variable so it can actually stop, and never an unchecked negative index. Keep the 2D table when the items must be listed, and use \`long long\` if values are large. Our runs showed why the details matter: greedy gave 160 instead of 220, the forward loop gave 300, and the DP matched a 65,536-subset brute force with only 1,616 cells.`,
        examples: [
          {
            label: `2D knapsack table, best value and the chosen items`,
            code: `#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
using namespace std;

// dp[i][c] = best value using only the first i items with capacity c
vector<vector<int>> knapsackTable(const vector<int>& weights, const vector<int>& values, int cap) {
    size_t n = weights.size();
    vector<vector<int>> dp(n + 1, vector<int>(cap + 1, 0));
    for (size_t i = 1; i <= n; i++) {
        int w = weights[i - 1], v = values[i - 1];
        for (int c = 0; c <= cap; c++) {
            dp[i][c] = dp[i - 1][c];                                     // skip item i-1
            if (w <= c && dp[i - 1][c - w] + v > dp[i][c]) dp[i][c] = dp[i - 1][c - w] + v;   // take it once
        }
    }
    return dp;
}

vector<int> chosenItems(const vector<int>& weights, const vector<vector<int>>& dp, int cap) {
    vector<int> items;
    int c = cap;
    for (size_t i = weights.size(); i > 0; i--)
        if (dp[i][c] != dp[i - 1][c]) { items.push_back(int(i - 1)); c -= weights[i - 1]; }   // value changed: taken
    reverse(items.begin(), items.end());
    return items;
}

string fmt(const vector<int>& xs) {
    string s = "[";
    for (size_t k = 0; k < xs.size(); k++) { if (k) s += ", "; s += to_string(xs[k]); }
    return s + "]";
}

struct Case { vector<int> weights, values; int cap; };

int main() {
    auto dp = knapsackTable({1, 3, 4, 5}, {1, 4, 5, 7}, 7);
    cout << "table rows (capacity 0..7), items (w, v) = (1, 1) (3, 4) (4, 5) (5, 7):\\n";
    for (size_t i = 0; i < dp.size(); i++) cout << "first " << i << " items " << fmt(dp[i]) << "\\n";

    vector<Case> cases = {{{1, 3, 4, 5}, {1, 4, 5, 7}, 7}, {{10, 20, 30}, {60, 100, 120}, 50},
                          {{1, 2, 3}, {6, 10, 12}, 5}, {{5}, {10}, 4}, {{1, 2}, {3, 4}, 0}, {{}, {}, 10}};
    for (auto& cs : cases) {
        auto t = knapsackTable(cs.weights, cs.values, cs.cap);
        auto items = chosenItems(cs.weights, t, cs.cap);
        int used = 0;
        for (int k : items) used += cs.weights[k];
        cout << "w=" << fmt(cs.weights) << " v=" << fmt(cs.values) << " cap=" << cs.cap << ": best "
             << t[cs.weights.size()][cs.cap] << ", items " << fmt(items) << ", weight used " << used << "\\n";
    }
}`,
          },
          {
            label: `1D backwards vs forwards, greedy, and brute force`,
            code: `#include <algorithm>
#include <iostream>
#include <numeric>
#include <vector>
using namespace std;

int oneRow(const vector<int>& weights, const vector<int>& values, int cap, bool backwards) {
    vector<int> dp(cap + 1, 0);                    // dp[c] = best value with capacity c so far
    for (size_t k = 0; k < weights.size(); k++) {
        int w = weights[k], v = values[k];
        if (backwards) for (int c = cap; c >= w; c--) dp[c] = max(dp[c], dp[c - w] + v);
        else for (int c = w; c <= cap; c++) dp[c] = max(dp[c], dp[c - w] + v);
    }
    return dp[cap];
}

long long checked = 0;
int bruteForce(const vector<int>& weights, const vector<int>& values, int cap) {
    int n = int(weights.size()), best = 0;
    checked = 0;
    for (int mask = 0; mask < (1 << n); mask++) {  // every subset of the n items
        checked++;
        int w = 0, v = 0;
        for (int k = 0; k < n; k++) if (mask >> k & 1) { w += weights[k]; v += values[k]; }
        if (w <= cap && v > best) best = v;
    }
    return best;
}

int greedyByRatio(const vector<int>& weights, const vector<int>& values, int cap) {
    vector<int> order(weights.size());
    iota(order.begin(), order.end(), 0);
    // compare v[a]/w[a] with v[b]/w[b] by cross-multiplying: exact, no floats.
    // The comparator must be a strict weak ordering ("less than"), never "<=".
    sort(order.begin(), order.end(), [&](int a, int b) {
        long long lhs = 1LL * values[a] * weights[b], rhs = 1LL * values[b] * weights[a];
        return lhs != rhs ? lhs > rhs : a < b;
    });
    int total = 0;
    for (int k : order) if (weights[k] <= cap) { cap -= weights[k]; total += values[k]; }
    return total;
}

long long seed = 777;
long long nxt() { seed = seed * 48271 % 2147483647LL; return seed; }

int main() {
    struct Case { vector<int> w, v; int cap; };
    vector<Case> cases = {{{10, 20, 30}, {60, 100, 120}, 50}, {{2}, {3}, 6}, {{1, 3, 4, 5}, {1, 4, 5, 7}, 7}};
    for (auto& cs : cases)
        cout << "cap " << cs.cap << ": backwards (0/1) " << oneRow(cs.w, cs.v, cs.cap, true)
             << ", forwards (reuses items) " << oneRow(cs.w, cs.v, cs.cap, false)
             << ", greedy by value/weight " << greedyByRatio(cs.w, cs.v, cs.cap) << "\\n";

    int n = 16, cap = 100;
    vector<int> weights(n), values(n);
    for (int k = 0; k < n; k++) weights[k] = int(1 + nxt() % 30);
    for (int k = 0; k < n; k++) values[k] = int(1 + nxt() % 100);
    int best = bruteForce(weights, values, cap);
    cout << "16 random items, cap 100: brute force " << best << " after " << checked
         << " subsets; dp " << oneRow(weights, values, cap, true) << " after " << n * (cap + 1) << " cells\\n";
}`,
          },
        ],
      },
    },
  },
];

export default augments;
