/**
 * DSA ULTRA — batch 32: Backtracking and design (N-Queens, LRU cache). One
 * complete answer per language (Python, JavaScript, Java, C++). Every example
 * was run with python3 / node / javac+java / g++ -std=c++17 by
 * scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  {
    title: `How do you solve the N-Queens problem?`,
    difficulty: "hard",
    seoDescription: `N-Queens by backtracking: one queen per row, O(1) column and diagonal checks with r-c and r+c, pruning, and a bitmask counter, in Python, JS, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Place n queens on an n by n chessboard so that no two attack each other. Write a Python function that returns every solution, and then tell me how you would only count them for n up to 12."

**What a strong answer should cover:**
- Place one queen per row, so a solution is a list \`queens[row] = col\`; this turns n² cells into n decisions.
- Backtracking with choose / explore / un-choose, pruning a column as soon as it is attacked.
- O(1) safety checks using three sets: columns, \`r - c\` and \`r + c\`.
- Complexity: O(n!) upper bound on the search, O(n) extra space plus the output; 92 solutions for n = 8.
- Python details: append \`queens[:]\` (a copy), use \`set\` or \`list[bool]\` for the taken markers, recursion depth is only n so the default limit of 1000 is not a problem, and the bitmask version needs \`& full\` because Python ints never overflow.

**Clarifying questions expected:**
- Do you want every board (as strings) or only the number of solutions?
- What range of n should I expect? (It decides whether a bitmask counter is worth it.)

**Code / implementation expected:** Yes — a recursive \`solve_n_queens(n)\` with three sets in Python 3, and optionally a bitmask counter.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know recursion in Python and want to master backtracking.  
**Difficulty:** Hard  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine seating eight very touchy guests at a square banquet table laid out like a chessboard. Each guest refuses to sit in the same row as another guest, in the same column, or anywhere along the same diagonal line. You want to find every seating plan that keeps everyone calm.

You could write down every possible way to put 8 guests on 64 seats and check each one. There are more than four billion of them. Or you could do what a sensible host does: seat the first guest, then seat the second somewhere safe, then the third, and the moment you discover there is **no** safe seat for the next guest, you stand the previous guest back up and try their next option. You never finish a plan that is already ruined.

That sensible host is doing **backtracking**, and the N-Queens puzzle (place n chess queens on an n × n board so no two attack each other) is the classic interview problem for it. It tests three things at once: can you shape a search so most bad options are never generated, can you check "is this square attacked?" in O(1), and can you undo your changes cleanly when you step back.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Return every board, or just the number of solutions? | Boards need copying and string building (LeetCode 51); a count allows the faster bitmask version (LeetCode 52). |
| What output format for a board? | Usually a list of strings such as \`".Q.."\`; agree on it before writing the printing code. |
| How large can n be? | Up to about 12 any backtracking is fine; much larger and you need bitmasks, symmetry, or a different goal (find one solution, not all). |
| Any order required for the solutions? | Trying columns left to right in row order already gives a fixed, sorted-by-row order. |
| What about n = 2 or 3, where no solution exists? | The answer is an empty list or 0, not an error. |

## 3. The Rules and the First Big Simplification

A queen attacks along its row, its column and both diagonals, any distance. So a valid answer has:

- exactly one queen in every **row** (n queens, n rows, at most one per row),
- exactly one queen in every **column** (same argument),
- at most one queen on every diagonal in both directions.

The first insight removes most of the search before we start: **because each row holds exactly one queen, decide row by row.** A solution is then just a list \`queens\` where \`queens[r]\` is the column of the queen in row r. The board below is the solution \`[1, 3, 0, 2]\` for n = 4.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A four by four board with one queen in each row: row 0 column 1, row 1 column 3, row 2 column 0, row 3 column 2. No two queens share a column or a diagonal.">
  <text class="d-sub" x="278" y="38" text-anchor="middle">col 0</text>
  <text class="d-sub" x="334" y="38" text-anchor="middle">col 1</text>
  <text class="d-sub" x="390" y="38" text-anchor="middle">col 2</text>
  <text class="d-sub" x="446" y="38" text-anchor="middle">col 3</text>
  <text class="d-sub" x="204" y="83" text-anchor="middle">row 0</text>
  <rect class="d-box" x="250" y="50" width="56" height="56"/>
  <rect class="d-box-accent" x="306" y="50" width="56" height="56"/>
  <text class="d-text" x="334" y="84" text-anchor="middle">Q</text>
  <rect class="d-box" x="362" y="50" width="56" height="56"/>
  <rect class="d-box-muted" x="418" y="50" width="56" height="56"/>
  <text class="d-sub" x="204" y="139" text-anchor="middle">row 1</text>
  <rect class="d-box-muted" x="250" y="106" width="56" height="56"/>
  <rect class="d-box" x="306" y="106" width="56" height="56"/>
  <rect class="d-box-muted" x="362" y="106" width="56" height="56"/>
  <rect class="d-box-accent" x="418" y="106" width="56" height="56"/>
  <text class="d-text" x="446" y="140" text-anchor="middle">Q</text>
  <text class="d-sub" x="204" y="195" text-anchor="middle">row 2</text>
  <rect class="d-box-accent" x="250" y="162" width="56" height="56"/>
  <text class="d-text" x="278" y="196" text-anchor="middle">Q</text>
  <rect class="d-box-muted" x="306" y="162" width="56" height="56"/>
  <rect class="d-box" x="362" y="162" width="56" height="56"/>
  <rect class="d-box-muted" x="418" y="162" width="56" height="56"/>
  <text class="d-sub" x="204" y="251" text-anchor="middle">row 3</text>
  <rect class="d-box-muted" x="250" y="218" width="56" height="56"/>
  <rect class="d-box" x="306" y="218" width="56" height="56"/>
  <rect class="d-box-accent" x="362" y="218" width="56" height="56"/>
  <text class="d-text" x="390" y="252" text-anchor="middle">Q</text>
  <rect class="d-box" x="418" y="218" width="56" height="56"/>
  <rect class="d-box" x="540" y="110" width="160" height="104" rx="10"/>
  <text class="d-text" x="620" y="142" text-anchor="middle">queens array</text>
  <text class="d-sub" x="620" y="170" text-anchor="middle">[1, 3, 0, 2]</text>
  <text class="d-sub" x="620" y="194" text-anchor="middle">index = row</text>
</svg>

The array index is the row and the value is the column, so "one queen per row" is guaranteed by the shape of the data itself.

📌 **Interview term: State-space search** — exploring a tree whose nodes are partial answers (here: queens placed in the first r rows) and whose children add one more decision.

The output format varies by interviewer. LeetCode's "N-Queens" (problem 51) wants every board as a list of strings like \`".Q.."\`; "N-Queens II" (problem 52) wants only the number of solutions. Both use exactly the same search.

## 4. O(1) Attack Checks with r - c and r + c

When we try column c in row r, we must know whether any earlier queen attacks that square. Scanning all earlier queens costs O(r). The standard trick makes it O(1):

- Every square on the same **main diagonal** (running top-left to bottom-right) has the same value of **r - c**.
- Every square on the same **anti-diagonal** (running top-right to bottom-left) has the same value of **r + c**.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="Two four by four grids. In the left grid each cell shows r minus c and the main diagonal, where r minus c is 0, is highlighted. In the right grid each cell shows r plus c and the anti diagonal where r plus c is 3 is highlighted.">
  <text class="d-text" x="166" y="30" text-anchor="middle">value r - c</text>
  <rect class="d-box-accent" x="70" y="56" width="48" height="48"/>
  <text class="d-sub" x="94" y="86" text-anchor="middle">0</text>
  <rect class="d-box" x="118" y="56" width="48" height="48"/>
  <text class="d-sub" x="142" y="86" text-anchor="middle">-1</text>
  <rect class="d-box" x="166" y="56" width="48" height="48"/>
  <text class="d-sub" x="190" y="86" text-anchor="middle">-2</text>
  <rect class="d-box" x="214" y="56" width="48" height="48"/>
  <text class="d-sub" x="238" y="86" text-anchor="middle">-3</text>
  <rect class="d-box" x="70" y="104" width="48" height="48"/>
  <text class="d-sub" x="94" y="134" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="118" y="104" width="48" height="48"/>
  <text class="d-sub" x="142" y="134" text-anchor="middle">0</text>
  <rect class="d-box" x="166" y="104" width="48" height="48"/>
  <text class="d-sub" x="190" y="134" text-anchor="middle">-1</text>
  <rect class="d-box" x="214" y="104" width="48" height="48"/>
  <text class="d-sub" x="238" y="134" text-anchor="middle">-2</text>
  <rect class="d-box" x="70" y="152" width="48" height="48"/>
  <text class="d-sub" x="94" y="182" text-anchor="middle">2</text>
  <rect class="d-box" x="118" y="152" width="48" height="48"/>
  <text class="d-sub" x="142" y="182" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="166" y="152" width="48" height="48"/>
  <text class="d-sub" x="190" y="182" text-anchor="middle">0</text>
  <rect class="d-box" x="214" y="152" width="48" height="48"/>
  <text class="d-sub" x="238" y="182" text-anchor="middle">-1</text>
  <rect class="d-box" x="70" y="200" width="48" height="48"/>
  <text class="d-sub" x="94" y="230" text-anchor="middle">3</text>
  <rect class="d-box" x="118" y="200" width="48" height="48"/>
  <text class="d-sub" x="142" y="230" text-anchor="middle">2</text>
  <rect class="d-box" x="166" y="200" width="48" height="48"/>
  <text class="d-sub" x="190" y="230" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="214" y="200" width="48" height="48"/>
  <text class="d-sub" x="238" y="230" text-anchor="middle">0</text>
  <text class="d-text" x="526" y="30" text-anchor="middle">value r + c</text>
  <rect class="d-box" x="430" y="56" width="48" height="48"/>
  <text class="d-sub" x="454" y="86" text-anchor="middle">0</text>
  <rect class="d-box" x="478" y="56" width="48" height="48"/>
  <text class="d-sub" x="502" y="86" text-anchor="middle">1</text>
  <rect class="d-box" x="526" y="56" width="48" height="48"/>
  <text class="d-sub" x="550" y="86" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="574" y="56" width="48" height="48"/>
  <text class="d-sub" x="598" y="86" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="104" width="48" height="48"/>
  <text class="d-sub" x="454" y="134" text-anchor="middle">1</text>
  <rect class="d-box" x="478" y="104" width="48" height="48"/>
  <text class="d-sub" x="502" y="134" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="526" y="104" width="48" height="48"/>
  <text class="d-sub" x="550" y="134" text-anchor="middle">3</text>
  <rect class="d-box" x="574" y="104" width="48" height="48"/>
  <text class="d-sub" x="598" y="134" text-anchor="middle">4</text>
  <rect class="d-box" x="430" y="152" width="48" height="48"/>
  <text class="d-sub" x="454" y="182" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="478" y="152" width="48" height="48"/>
  <text class="d-sub" x="502" y="182" text-anchor="middle">3</text>
  <rect class="d-box" x="526" y="152" width="48" height="48"/>
  <text class="d-sub" x="550" y="182" text-anchor="middle">4</text>
  <rect class="d-box" x="574" y="152" width="48" height="48"/>
  <text class="d-sub" x="598" y="182" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="430" y="200" width="48" height="48"/>
  <text class="d-sub" x="454" y="230" text-anchor="middle">3</text>
  <rect class="d-box" x="478" y="200" width="48" height="48"/>
  <text class="d-sub" x="502" y="230" text-anchor="middle">4</text>
  <rect class="d-box" x="526" y="200" width="48" height="48"/>
  <text class="d-sub" x="550" y="230" text-anchor="middle">5</text>
  <rect class="d-box" x="574" y="200" width="48" height="48"/>
  <text class="d-sub" x="598" y="230" text-anchor="middle">6</text>
</svg>

On the left, the highlighted squares all have r - c = 0; on the right, the highlighted squares all have r + c = 3. So we keep three "taken" collections: the set of used columns, the set of used r - c values and the set of used r + c values. A square is safe when its column, its r - c and its r + c are all unused.

📌 **Interview term: Diagonal invariant** — r - c is constant along a main diagonal and r + c is constant along an anti-diagonal, so one number identifies each diagonal. There are 2n - 1 of each.

📌 **Interview term: Constraint propagation (lightweight)** — recording each decision in lookup structures so later checks are O(1) instead of re-scanning the whole board.

## 5. The Backtracking Search

This is a direct use of the [backtracking](/interview-question/what-is-backtracking) template: choose, explore, un-choose.

1. \`place(row)\`: if \`row == n\`, every row has a queen, so record a copy of \`queens\` as a solution.
2. Otherwise, for each column c in this row: if c, r - c or r + c is taken, **skip** it (this is the pruning).
3. Otherwise **choose**: mark the column and both diagonals as taken and put the queen.
4. **Explore**: call \`place(row + 1)\`.
5. **Un-choose**: unmark the three entries and remove the queen, then try the next column.

The tree for n = 4 shows the effect. Every box is a queen that passed the attack check; branches that cannot continue stop immediately.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 450" role="img" aria-label="Search tree for four queens. Starting from an empty board, placing the first queen in column 0 leads to two dead ends. Placing it in column 1 leads straight to the solution 1, 3, 0, 2. Columns 2 and 3 are mirror images of the first two branches.">
  <defs>
    <marker id="b32q1py-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 380 72 L 160 104" marker-end="url(#b32q1py-a)"/>
  <path class="d-edge-accent" d="M 380 72 L 450 104" marker-end="url(#b32q1py-a)"/>
  <path class="d-edge" d="M 380 72 L 660 104" marker-end="url(#b32q1py-a)"/>
  <path class="d-edge" d="M 160 162 L 75 194" marker-end="url(#b32q1py-a)"/>
  <path class="d-edge" d="M 160 162 L 245 194" marker-end="url(#b32q1py-a)"/>
  <path class="d-edge-accent" d="M 450 162 L 450 194" marker-end="url(#b32q1py-a)"/>
  <path class="d-edge" d="M 75 252 L 75 284" marker-end="url(#b32q1py-a)"/>
  <path class="d-edge" d="M 245 252 L 245 284" marker-end="url(#b32q1py-a)"/>
  <path class="d-edge-accent" d="M 450 252 L 450 284" marker-end="url(#b32q1py-a)"/>
  <path class="d-edge" d="M 245 342 L 245 374" marker-end="url(#b32q1py-a)"/>
  <path class="d-edge-accent" d="M 450 342 L 450 374" marker-end="url(#b32q1py-a)"/>
  <rect class="d-box" x="305" y="20" width="150" height="50" rx="8"/>
  <text class="d-text" x="380" y="42" text-anchor="middle">start</text>
  <text class="d-sub" x="380" y="61" text-anchor="middle">empty board</text>
  <rect class="d-box" x="85" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="160" y="141" text-anchor="middle">row 0: col 0</text>
  <rect class="d-box" x="375" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="450" y="141" text-anchor="middle">row 0: col 1</text>
  <rect class="d-box-muted" x="585" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="660" y="132" text-anchor="middle">cols 2 and 3</text>
  <text class="d-sub" x="660" y="151" text-anchor="middle">mirror images</text>
  <rect class="d-box" x="0" y="200" width="150" height="50" rx="8"/>
  <text class="d-text" x="75" y="231" text-anchor="middle">row 1: col 2</text>
  <rect class="d-box" x="170" y="200" width="150" height="50" rx="8"/>
  <text class="d-text" x="245" y="231" text-anchor="middle">row 1: col 3</text>
  <rect class="d-box" x="375" y="200" width="150" height="50" rx="8"/>
  <text class="d-text" x="450" y="231" text-anchor="middle">row 1: col 3</text>
  <rect class="d-box-muted" x="0" y="290" width="150" height="50" rx="8"/>
  <text class="d-text" x="75" y="312" text-anchor="middle">dead end</text>
  <text class="d-sub" x="75" y="331" text-anchor="middle">row 2 all attacked</text>
  <rect class="d-box" x="170" y="290" width="150" height="50" rx="8"/>
  <text class="d-text" x="245" y="321" text-anchor="middle">row 2: col 1</text>
  <rect class="d-box" x="375" y="290" width="150" height="50" rx="8"/>
  <text class="d-text" x="450" y="321" text-anchor="middle">row 2: col 0</text>
  <rect class="d-box-muted" x="170" y="380" width="150" height="50" rx="8"/>
  <text class="d-text" x="245" y="402" text-anchor="middle">dead end</text>
  <text class="d-sub" x="245" y="421" text-anchor="middle">row 3 all attacked</text>
  <rect class="d-box-accent" x="375" y="380" width="150" height="50" rx="8"/>
  <text class="d-text" x="450" y="402" text-anchor="middle">row 3: col 2</text>
  <text class="d-sub" x="450" y="421" text-anchor="middle">solution 1, 3, 0, 2</text>
</svg>

The first queen in column 0 leads to two dead ends after only four placements. Column 1 leads straight to a solution. Columns 2 and 3 are the mirror images of columns 1 and 0, and give the second solution \`[2, 0, 3, 1]\`. The whole search for n = 4 places only 16 queens (example 2 counts them).

📌 **Interview term: Pruning** — abandoning a branch as soon as it violates a constraint, so none of the boards below that branch are ever built.

📌 **Interview term: Choose / explore / un-choose** — the three steps of every backtracking function; the un-choose step restores the shared state exactly, so the next sibling starts from a clean slate.

Compare this with the permutation view. One queen per row and one per column means every valid board is a **permutation** of the columns 0..n-1, so a brute force could generate all n! of them (see [generating all permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array)) and check the diagonals at the end. Backtracking does the diagonal check while building, so it never completes a permutation that is already broken.

## 6. The Code in Python

Here is the core of example 1. The three sets are closed over by the nested \`place\` function, so it does not need any parameters except the row.

~~~python
def solve_n_queens(n):
    """Return every solution as a list: queens[r] = column of the queen in row r."""
    cols, diag, anti = set(), set(), set()   # occupied columns, r - c, r + c
    queens, solutions = [], []

    def place(row):
        if row == n:                          # every row has a queen
            solutions.append(queens[:])       # copy: queens keeps changing
            return
        for c in range(n):
            if c in cols or (row - c) in diag or (row + c) in anti:
                continue                      # attacked: prune this branch
            cols.add(c); diag.add(row - c); anti.add(row + c); queens.append(c)
            place(row + 1)
            cols.remove(c); diag.remove(row - c); anti.remove(row + c); queens.pop()

    place(0)
    return solutions
~~~

**What to point out in this code:**

- \`queens[:]\` makes a shallow copy. Appending \`queens\` itself would store the **same list object** every time, and after the search finishes all "solutions" would be empty lists, because every \`append\` is undone by a \`pop\`.
- The three sets hold plain integers. \`row - c\` can be negative, which is fine for a set; an array would need an offset of n (the Java and C++ versions use \`row - c + n\`).
- \`set.remove\` raises \`KeyError\` if the element is missing. Here it is always present because we added it just before the recursive call, so a \`KeyError\` would reveal an undo bug immediately.
- \`place\` mutates the outer sets but never rebinds them, so it needs no \`nonlocal\`. You would need \`nonlocal count\` if you kept an integer counter in the enclosing function.
- The recursion depth is n (at most 12 or so in practice), far below Python's default recursion limit of 1000 (\`sys.getrecursionlimit()\` printed 1000 on our machine).

To turn a solution into LeetCode's string format, build each row with a join:

~~~python
def board(queens):
    n = len(queens)
    return [" ".join("Q" if c == q else "." for c in range(n)) for q in queens]
~~~

(LeetCode wants \`".Q.."\` with no spaces, which is \`"".join(...)\`; the spaces here just make the printed boards easier to read.)

## 7. Counting Faster with Bitmasks

When only the **number** of solutions is needed, the three sets can become three integers. Bit c of \`cols\` is 1 when column c is taken. The two diagonal masks store which squares of the **current row** are attacked diagonally; moving down one row shifts one mask left and the other right by one bit.

~~~python
def total_n_queens(n):
    full = (1 << n) - 1                      # n ones: every column of a row

    def go(cols, d1, d2):
        if cols == full:                     # n queens placed
            return 1
        count = 0
        free = full & ~(cols | d1 | d2)      # squares in this row nobody attacks
        while free:
            bit = free & -free               # lowest free square
            free -= bit
            count += go(cols | bit, ((d1 | bit) << 1) & full, (d2 | bit) >> 1)
        return count

    return go(0, 0, 0)
~~~

- \`full & ~(cols | d1 | d2)\` gives every safe square in the row in one operation.
- \`free & -free\` isolates the lowest set bit. Python integers behave as if they had infinitely many two's-complement bits, so this works without any fixed width (\`bin(0b10110 & -0b10110)\` printed \`0b10\`).
- Python integers **never overflow**, which is exactly why \`((d1 | bit) << 1) & full\` needs the \`& full\`: without it, \`d1\` would keep growing bits past column n - 1 forever.

📌 **Interview term: Bitmask** — an integer used as a set of small numbers, one bit per element; union is \`|\`, intersection is \`&\`, and the lowest element is \`x & -x\`.

## 8. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same three programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — every solution for n = 4 drawn as a board, then the number of solutions for n = 0 to 8** prints:

~~~text
n=4: 2 solutions
columns [1, 3, 0, 2]
. Q . .
. . . Q
Q . . .
. . Q .
columns [2, 0, 3, 1]
. . Q .
Q . . .
. . . Q
. Q . .
n=0: 1
n=1: 1
n=2: 0
n=3: 0
n=4: 2
n=5: 10
n=6: 4
n=7: 40
n=8: 92
first solution for n=8: [0, 4, 7, 5, 2, 6, 1, 3]
~~~

The two boards for n = 4 are mirror images of each other. The counts 1, 0, 0, 2, 10, 4, 40, 92 show the two board sizes with no solution at all (n = 2 and 3), and that the count does not grow smoothly (n = 6 has fewer solutions than n = 5).

**Example 2 — brute force (generate every permutation, check diagonals at the end) against backtracking (check each queen as it is placed)** prints:

~~~text
n=4: brute force checks 24 full boards, backtracking places 16 queens, solutions 2 and 2
n=5: brute force checks 120 full boards, backtracking places 53 queens, solutions 10 and 10
n=6: brute force checks 720 full boards, backtracking places 152 queens, solutions 4 and 4
n=7: brute force checks 5040 full boards, backtracking places 551 queens, solutions 40 and 40
n=8: brute force checks 40320 full boards, backtracking places 2056 queens, solutions 92 and 92
n=8 boards with one queen per row and no rule at all: 16777216
~~~

Both methods find the same solutions, but backtracking places only 2,056 queens for n = 8 while brute force builds and checks 40,320 complete boards, each check costing up to 28 diagonal comparisons. The last line is the number of boards a search that ignored even the column rule would face: 16,777,216 for n = 8.

**Example 3 — counting solutions for n = 1 to 12 with the bitmask version** prints:

~~~text
n=1: 1
n=2: 0
n=3: 0
n=4: 2
n=5: 10
n=6: 4
n=7: 40
n=8: 92
n=9: 352
n=10: 724
n=11: 2680
n=12: 14200
0b10
~~~

The counts match example 1 where they overlap, which is a good way to test an optimised version against a simple one. The last line shows the lowest-set-bit trick on its own.

## 9. Complexity

| Measure | Cost | Why |
| :--- | :--- | :--- |
| Time (search) | O(n!) upper bound | row r has at most n - r free columns, so at most n · (n - 1) · ... · 1 leaves; pruning makes the real count far smaller (2,056 placements for n = 8, against 40,320 permutations) |
| Attack check | O(1) | three lookups: column, r - c, r + c |
| Copying a solution | O(n) each | the \`queens\` array is copied when a solution is found; building string boards costs O(n²) each |
| Extra space | O(n) | three collections of at most n, 2n - 1 and 2n - 1 entries, plus recursion depth n |
| Output space | O(S · n²) for S solution boards | only if every board is returned as strings |

No exact formula is known for the number of solutions, and there is no known polynomial way to count them, which is why interviewers accept the O(n!) bound. See [Big-O notation](/interview-question/what-is-big-o-notation) for how such bounds are read, and [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for the O(n) recursion depth.

## 10. Edge Cases

- **n = 1:** one solution, a single queen.
- **n = 2 and n = 3:** **zero** solutions. The code must return an empty list (or 0), not crash; example 1 prints \`n=2: 0\` and \`n=3: 0\`.
- **n = 0:** the loop records the empty board once, so the code returns 1 solution. LeetCode only asks for 1 ≤ n ≤ 9, so mention this convention rather than rely on it.
- **Recording a solution:** you must store a **copy** of \`queens\`; the array keeps changing as the search backtracks.
- **Symmetry:** every solution reflected left-to-right is another solution. For n = 8 there are 92 solutions but only 12 that are different under rotations and reflections (we checked by brute force). Trying only the left half of the first row and doubling the count is a classic follow-up optimisation; an odd n needs the middle column handled separately.

## 11. Where This Pattern Shows Up Again

N-Queens is the "constraint" member of the backtracking family. Generating [all subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array) and [generating all permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array) enumerate everything with no rule to break; [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem) prunes on a running sum; Sudoku solvers use exactly the N-Queens idea of marker sets for rows, columns and boxes. The base case and the depth of the recursion are covered in [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).

## Common Pitfalls

- **Appending \`queens\` instead of \`queens[:]\`.** Every stored solution is the same list object, and it is empty when the search ends.
- **Forgetting the un-choose step for one of the three sets.** A diagonal that stays marked after backtracking silently hides valid solutions; the counts 2, 10, 4, 40, 92 for n = 4..8 are a quick self-test.
- **Checking only columns.** That generates every permutation, not every valid board (24 boards for n = 4 instead of 2).
- **Using \`[["."] * n] * n\` to build a board.** The outer \`*\` repeats the same inner list, so placing one queen puts a Q in every row. Use a list comprehension.
- **Shifting a bitmask without \`& full\`.** Python ints grow without limit, so stray high bits accumulate and \`cols == full\` comparisons can break.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">One queen per row, so the answer is a list <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queens[row] = col</code>; I decide one row at a time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Search:</strong> <span style="color:#f0e2c8;">Backtracking: for each column, skip it if attacked, otherwise choose, recurse on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row + 1</code>, and un-choose.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. O(1) check:</strong> <span style="color:#f0e2c8;">Three sets: used columns, used <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r - c</code>, used <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r + c</code>; each diagonal has one constant value.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n!) upper bound but heavy pruning: 2,056 placements for n = 8 versus 40,320 permutations; O(n) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python care:</strong> <span style="color:#f0e2c8;">Record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queens[:]</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queens</code>; for counting only, switch to integer bitmasks with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">free &amp; -free</code> and mask shifts with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp; full</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">r - c</code> the same along a diagonal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Moving one step down-right adds 1 to both r and c, so the difference does not change. Moving down-left adds 1 to r and subtracts 1 from c, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r + c</code> stays the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you make it faster for counting only?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: replace the sets with three ints and pick safe squares with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">free &amp; -free</code>. It does the same search with cheaper operations, and it counted 14,200 solutions for n = 12 in well under a second here.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the time complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is no tight closed form. O(n!) is a safe upper bound because row r has at most n - r free columns; the pruned tree is much smaller in practice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you use symmetry?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mirror images of solutions are solutions, so try only columns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 .. n // 2 - 1</code> in row 0, double the count, and for odd n add the solutions with the first queen in the middle column.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use a 2D board and scan for attacks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works, but each check costs O(n) instead of O(1), and you still need the same backtracking. The sets are both simpler and faster.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State-space search** | Exploring a tree of partial answers, one decision per level |
| **Diagonal invariant** | r - c is constant on a main diagonal, r + c on an anti-diagonal |
| **Constraint propagation (lightweight)** | Recording each decision so later checks are O(1) |
| **Pruning** | Abandoning a branch as soon as it breaks a rule |
| **Choose / explore / un-choose** | The three steps of a backtracking function; the last one restores shared state |
| **Bitmask** | An integer used as a set, one bit per element |

---
**Conclusion:** N-Queens is solved by deciding one row at a time, so a solution is just the column of the queen in each row. Backtracking tries each column, skips it in O(1) when its column, its r - c diagonal or its r + c anti-diagonal is already taken, recurses to the next row, and undoes the marks on the way back. Pruning keeps the search tiny compared with the n! permutations (2,056 placements for n = 8 instead of 40,320 complete boards). In Python that is a nested function over three sets, with \`queens[:]\` recorded at the leaves, and integer bitmasks when you only need the count.`,
        examples: [
          {
            label: `All solutions as boards for n = 4, solution counts for n = 0..8`,
            code: `def solve_n_queens(n):
    """Return every solution as a list: queens[r] = column of the queen in row r."""
    cols, diag, anti = set(), set(), set()   # occupied columns, r - c, r + c
    queens, solutions = [], []

    def place(row):
        if row == n:                          # every row has a queen
            solutions.append(queens[:])       # copy: queens keeps changing
            return
        for c in range(n):
            if c in cols or (row - c) in diag or (row + c) in anti:
                continue                      # attacked: prune this branch
            cols.add(c); diag.add(row - c); anti.add(row + c); queens.append(c)
            place(row + 1)
            cols.remove(c); diag.remove(row - c); anti.remove(row + c); queens.pop()

    place(0)
    return solutions


def board(queens):
    n = len(queens)
    return [" ".join("Q" if c == q else "." for c in range(n)) for q in queens]


sols = solve_n_queens(4)
print("n=4: " + str(len(sols)) + " solutions")
for s in sols:
    print("columns " + str(s))
    for line in board(s):
        print(line)
for n in range(0, 9):
    print("n=" + str(n) + ": " + str(len(solve_n_queens(n))))
print("first solution for n=8: " + str(solve_n_queens(8)[0]))`,
          },
          {
            label: `Brute force over permutations vs backtracking: work counted for n = 4..8`,
            code: `# Brute force: try every permutation (one queen per row, all columns different),
# then check the diagonals. Backtracking: check each queen as it is placed.

def brute_force(n):
    perm, used = [], [False] * n
    stats = {"checked": 0, "found": 0}

    def safe(p):
        for i in range(n):
            for j in range(i + 1, n):
                if abs(p[i] - p[j]) == j - i:     # same diagonal
                    return False
        return True

    def gen():
        if len(perm) == n:
            stats["checked"] += 1
            if safe(perm):
                stats["found"] += 1
            return
        for c in range(n):
            if not used[c]:
                used[c] = True; perm.append(c)
                gen()
                used[c] = False; perm.pop()

    gen()
    return stats["checked"], stats["found"]


def backtracking(n):
    cols, diag, anti = [False] * n, [False] * (2 * n), [False] * (2 * n)
    stats = {"placed": 0, "found": 0}

    def place(row):
        if row == n:
            stats["found"] += 1
            return
        for c in range(n):
            if cols[c] or diag[row - c + n] or anti[row + c]:
                continue
            stats["placed"] += 1                  # one node of the search tree
            cols[c] = diag[row - c + n] = anti[row + c] = True
            place(row + 1)
            cols[c] = diag[row - c + n] = anti[row + c] = False

    place(0)
    return stats["placed"], stats["found"]


for n in range(4, 9):
    checked, a = brute_force(n)
    placed, b = backtracking(n)
    print("n=" + str(n) + ": brute force checks " + str(checked) + " full boards, backtracking places "
          + str(placed) + " queens, solutions " + str(a) + " and " + str(b))
print("n=8 boards with one queen per row and no rule at all: " + str(8 ** 8))`,
          },
          {
            label: `N-Queens II: counting solutions for n = 1..12 with bitmasks`,
            code: `# N-Queens II: count solutions with three bitmasks instead of three sets.
# Bit c of "cols" is 1 when column c is taken. "d1" and "d2" hold the squares
# attacked diagonally in the CURRENT row; they shift by one each row.

def total_n_queens(n):
    full = (1 << n) - 1                      # n ones: every column of a row

    def go(cols, d1, d2):
        if cols == full:                     # n queens placed
            return 1
        count = 0
        free = full & ~(cols | d1 | d2)      # squares in this row nobody attacks
        while free:
            bit = free & -free               # lowest free square
            free -= bit
            count += go(cols | bit, ((d1 | bit) << 1) & full, (d2 | bit) >> 1)
        return count

    return go(0, 0, 0)


for n in range(1, 13):
    print("n=" + str(n) + ": " + str(total_n_queens(n)))
print(bin(0b10110 & -0b10110))  # 0b10`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Place n queens on an n by n chessboard so that no two attack each other. Write a JavaScript function that returns every solution, and then tell me how you would only count them for n up to 12."

**What a strong answer should cover:**
- Place one queen per row, so a solution is an array \`queens[row] = col\`; this turns n² cells into n decisions.
- Backtracking with choose / explore / un-choose, pruning a column as soon as it is attacked.
- O(1) safety checks using three \`Set\`s (or boolean arrays): columns, \`r - c\` and \`r + c\`.
- Complexity: O(n!) upper bound on the search, O(n) extra space plus the output; 92 solutions for n = 8.
- JavaScript details: push \`queens.slice()\` (a copy); \`new Array(n).fill([])\` shares one inner array; bitwise operators work on 32-bit signed integers, which is fine for n ≤ 30 but means \`1 << 31\` is negative.

**Clarifying questions expected:**
- Do you want every board (as strings) or only the number of solutions?
- What range of n should I expect? (It decides whether a bitmask counter is worth it.)

**Code / implementation expected:** Yes — a recursive \`solveNQueens(n)\` with three \`Set\`s in JavaScript, and optionally a bitmask counter.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know recursion in JavaScript and want to master backtracking.  
**Difficulty:** Hard  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine seating eight very touchy guests at a square banquet table laid out like a chessboard. Each guest refuses to sit in the same row as another guest, in the same column, or anywhere along the same diagonal line. You want to find every seating plan that keeps everyone calm.

You could write down every possible way to put 8 guests on 64 seats and check each one. There are more than four billion of them. Or you could do what a sensible host does: seat the first guest, then seat the second somewhere safe, then the third, and the moment you discover there is **no** safe seat for the next guest, you stand the previous guest back up and try their next option. You never finish a plan that is already ruined.

That sensible host is doing **backtracking**, and the N-Queens puzzle (place n chess queens on an n × n board so no two attack each other) is the classic interview problem for it. It tests three things at once: can you shape a search so most bad options are never generated, can you check "is this square attacked?" in O(1), and can you undo your changes cleanly when you step back.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Return every board, or just the number of solutions? | Boards need copying and string building (LeetCode 51); a count allows the faster bitmask version (LeetCode 52). |
| What output format for a board? | Usually a list of strings such as \`".Q.."\`; agree on it before writing the printing code. |
| How large can n be? | Up to about 12 any backtracking is fine; much larger and you need bitmasks, symmetry, or a different goal (find one solution, not all). |
| Any order required for the solutions? | Trying columns left to right in row order already gives a fixed, sorted-by-row order. |
| What about n = 2 or 3, where no solution exists? | The answer is an empty list or 0, not an error. |

## 3. The Rules and the First Big Simplification

A queen attacks along its row, its column and both diagonals, any distance. So a valid answer has:

- exactly one queen in every **row** (n queens, n rows, at most one per row),
- exactly one queen in every **column** (same argument),
- at most one queen on every diagonal in both directions.

The first insight removes most of the search before we start: **because each row holds exactly one queen, decide row by row.** A solution is then just a list \`queens\` where \`queens[r]\` is the column of the queen in row r. The board below is the solution \`[1, 3, 0, 2]\` for n = 4.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A four by four board with one queen in each row: row 0 column 1, row 1 column 3, row 2 column 0, row 3 column 2. No two queens share a column or a diagonal.">
  <text class="d-sub" x="278" y="38" text-anchor="middle">col 0</text>
  <text class="d-sub" x="334" y="38" text-anchor="middle">col 1</text>
  <text class="d-sub" x="390" y="38" text-anchor="middle">col 2</text>
  <text class="d-sub" x="446" y="38" text-anchor="middle">col 3</text>
  <text class="d-sub" x="204" y="83" text-anchor="middle">row 0</text>
  <rect class="d-box" x="250" y="50" width="56" height="56"/>
  <rect class="d-box-accent" x="306" y="50" width="56" height="56"/>
  <text class="d-text" x="334" y="84" text-anchor="middle">Q</text>
  <rect class="d-box" x="362" y="50" width="56" height="56"/>
  <rect class="d-box-muted" x="418" y="50" width="56" height="56"/>
  <text class="d-sub" x="204" y="139" text-anchor="middle">row 1</text>
  <rect class="d-box-muted" x="250" y="106" width="56" height="56"/>
  <rect class="d-box" x="306" y="106" width="56" height="56"/>
  <rect class="d-box-muted" x="362" y="106" width="56" height="56"/>
  <rect class="d-box-accent" x="418" y="106" width="56" height="56"/>
  <text class="d-text" x="446" y="140" text-anchor="middle">Q</text>
  <text class="d-sub" x="204" y="195" text-anchor="middle">row 2</text>
  <rect class="d-box-accent" x="250" y="162" width="56" height="56"/>
  <text class="d-text" x="278" y="196" text-anchor="middle">Q</text>
  <rect class="d-box-muted" x="306" y="162" width="56" height="56"/>
  <rect class="d-box" x="362" y="162" width="56" height="56"/>
  <rect class="d-box-muted" x="418" y="162" width="56" height="56"/>
  <text class="d-sub" x="204" y="251" text-anchor="middle">row 3</text>
  <rect class="d-box-muted" x="250" y="218" width="56" height="56"/>
  <rect class="d-box" x="306" y="218" width="56" height="56"/>
  <rect class="d-box-accent" x="362" y="218" width="56" height="56"/>
  <text class="d-text" x="390" y="252" text-anchor="middle">Q</text>
  <rect class="d-box" x="418" y="218" width="56" height="56"/>
  <rect class="d-box" x="540" y="110" width="160" height="104" rx="10"/>
  <text class="d-text" x="620" y="142" text-anchor="middle">queens array</text>
  <text class="d-sub" x="620" y="170" text-anchor="middle">[1, 3, 0, 2]</text>
  <text class="d-sub" x="620" y="194" text-anchor="middle">index = row</text>
</svg>

The array index is the row and the value is the column, so "one queen per row" is guaranteed by the shape of the data itself.

📌 **Interview term: State-space search** — exploring a tree whose nodes are partial answers (here: queens placed in the first r rows) and whose children add one more decision.

The output format varies by interviewer. LeetCode's "N-Queens" (problem 51) wants every board as a list of strings like \`".Q.."\`; "N-Queens II" (problem 52) wants only the number of solutions. Both use exactly the same search.

## 4. O(1) Attack Checks with r - c and r + c

When we try column c in row r, we must know whether any earlier queen attacks that square. Scanning all earlier queens costs O(r). The standard trick makes it O(1):

- Every square on the same **main diagonal** (running top-left to bottom-right) has the same value of **r - c**.
- Every square on the same **anti-diagonal** (running top-right to bottom-left) has the same value of **r + c**.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="Two four by four grids. In the left grid each cell shows r minus c and the main diagonal, where r minus c is 0, is highlighted. In the right grid each cell shows r plus c and the anti diagonal where r plus c is 3 is highlighted.">
  <text class="d-text" x="166" y="30" text-anchor="middle">value r - c</text>
  <rect class="d-box-accent" x="70" y="56" width="48" height="48"/>
  <text class="d-sub" x="94" y="86" text-anchor="middle">0</text>
  <rect class="d-box" x="118" y="56" width="48" height="48"/>
  <text class="d-sub" x="142" y="86" text-anchor="middle">-1</text>
  <rect class="d-box" x="166" y="56" width="48" height="48"/>
  <text class="d-sub" x="190" y="86" text-anchor="middle">-2</text>
  <rect class="d-box" x="214" y="56" width="48" height="48"/>
  <text class="d-sub" x="238" y="86" text-anchor="middle">-3</text>
  <rect class="d-box" x="70" y="104" width="48" height="48"/>
  <text class="d-sub" x="94" y="134" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="118" y="104" width="48" height="48"/>
  <text class="d-sub" x="142" y="134" text-anchor="middle">0</text>
  <rect class="d-box" x="166" y="104" width="48" height="48"/>
  <text class="d-sub" x="190" y="134" text-anchor="middle">-1</text>
  <rect class="d-box" x="214" y="104" width="48" height="48"/>
  <text class="d-sub" x="238" y="134" text-anchor="middle">-2</text>
  <rect class="d-box" x="70" y="152" width="48" height="48"/>
  <text class="d-sub" x="94" y="182" text-anchor="middle">2</text>
  <rect class="d-box" x="118" y="152" width="48" height="48"/>
  <text class="d-sub" x="142" y="182" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="166" y="152" width="48" height="48"/>
  <text class="d-sub" x="190" y="182" text-anchor="middle">0</text>
  <rect class="d-box" x="214" y="152" width="48" height="48"/>
  <text class="d-sub" x="238" y="182" text-anchor="middle">-1</text>
  <rect class="d-box" x="70" y="200" width="48" height="48"/>
  <text class="d-sub" x="94" y="230" text-anchor="middle">3</text>
  <rect class="d-box" x="118" y="200" width="48" height="48"/>
  <text class="d-sub" x="142" y="230" text-anchor="middle">2</text>
  <rect class="d-box" x="166" y="200" width="48" height="48"/>
  <text class="d-sub" x="190" y="230" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="214" y="200" width="48" height="48"/>
  <text class="d-sub" x="238" y="230" text-anchor="middle">0</text>
  <text class="d-text" x="526" y="30" text-anchor="middle">value r + c</text>
  <rect class="d-box" x="430" y="56" width="48" height="48"/>
  <text class="d-sub" x="454" y="86" text-anchor="middle">0</text>
  <rect class="d-box" x="478" y="56" width="48" height="48"/>
  <text class="d-sub" x="502" y="86" text-anchor="middle">1</text>
  <rect class="d-box" x="526" y="56" width="48" height="48"/>
  <text class="d-sub" x="550" y="86" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="574" y="56" width="48" height="48"/>
  <text class="d-sub" x="598" y="86" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="104" width="48" height="48"/>
  <text class="d-sub" x="454" y="134" text-anchor="middle">1</text>
  <rect class="d-box" x="478" y="104" width="48" height="48"/>
  <text class="d-sub" x="502" y="134" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="526" y="104" width="48" height="48"/>
  <text class="d-sub" x="550" y="134" text-anchor="middle">3</text>
  <rect class="d-box" x="574" y="104" width="48" height="48"/>
  <text class="d-sub" x="598" y="134" text-anchor="middle">4</text>
  <rect class="d-box" x="430" y="152" width="48" height="48"/>
  <text class="d-sub" x="454" y="182" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="478" y="152" width="48" height="48"/>
  <text class="d-sub" x="502" y="182" text-anchor="middle">3</text>
  <rect class="d-box" x="526" y="152" width="48" height="48"/>
  <text class="d-sub" x="550" y="182" text-anchor="middle">4</text>
  <rect class="d-box" x="574" y="152" width="48" height="48"/>
  <text class="d-sub" x="598" y="182" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="430" y="200" width="48" height="48"/>
  <text class="d-sub" x="454" y="230" text-anchor="middle">3</text>
  <rect class="d-box" x="478" y="200" width="48" height="48"/>
  <text class="d-sub" x="502" y="230" text-anchor="middle">4</text>
  <rect class="d-box" x="526" y="200" width="48" height="48"/>
  <text class="d-sub" x="550" y="230" text-anchor="middle">5</text>
  <rect class="d-box" x="574" y="200" width="48" height="48"/>
  <text class="d-sub" x="598" y="230" text-anchor="middle">6</text>
</svg>

On the left, the highlighted squares all have r - c = 0; on the right, the highlighted squares all have r + c = 3. So we keep three "taken" collections: the set of used columns, the set of used r - c values and the set of used r + c values. A square is safe when its column, its r - c and its r + c are all unused.

📌 **Interview term: Diagonal invariant** — r - c is constant along a main diagonal and r + c is constant along an anti-diagonal, so one number identifies each diagonal. There are 2n - 1 of each.

📌 **Interview term: Constraint propagation (lightweight)** — recording each decision in lookup structures so later checks are O(1) instead of re-scanning the whole board.

## 5. The Backtracking Search

This is a direct use of the [backtracking](/interview-question/what-is-backtracking) template: choose, explore, un-choose.

1. \`place(row)\`: if \`row == n\`, every row has a queen, so record a copy of \`queens\` as a solution.
2. Otherwise, for each column c in this row: if c, r - c or r + c is taken, **skip** it (this is the pruning).
3. Otherwise **choose**: mark the column and both diagonals as taken and put the queen.
4. **Explore**: call \`place(row + 1)\`.
5. **Un-choose**: unmark the three entries and remove the queen, then try the next column.

The tree for n = 4 shows the effect. Every box is a queen that passed the attack check; branches that cannot continue stop immediately.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 450" role="img" aria-label="Search tree for four queens. Starting from an empty board, placing the first queen in column 0 leads to two dead ends. Placing it in column 1 leads straight to the solution 1, 3, 0, 2. Columns 2 and 3 are mirror images of the first two branches.">
  <defs>
    <marker id="b32q1ja-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 380 72 L 160 104" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge-accent" d="M 380 72 L 450 104" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge" d="M 380 72 L 660 104" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge" d="M 160 162 L 75 194" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge" d="M 160 162 L 245 194" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge-accent" d="M 450 162 L 450 194" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge" d="M 75 252 L 75 284" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge" d="M 245 252 L 245 284" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge-accent" d="M 450 252 L 450 284" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge" d="M 245 342 L 245 374" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge-accent" d="M 450 342 L 450 374" marker-end="url(#b32q1ja-a)"/>
  <rect class="d-box" x="305" y="20" width="150" height="50" rx="8"/>
  <text class="d-text" x="380" y="42" text-anchor="middle">start</text>
  <text class="d-sub" x="380" y="61" text-anchor="middle">empty board</text>
  <rect class="d-box" x="85" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="160" y="141" text-anchor="middle">row 0: col 0</text>
  <rect class="d-box" x="375" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="450" y="141" text-anchor="middle">row 0: col 1</text>
  <rect class="d-box-muted" x="585" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="660" y="132" text-anchor="middle">cols 2 and 3</text>
  <text class="d-sub" x="660" y="151" text-anchor="middle">mirror images</text>
  <rect class="d-box" x="0" y="200" width="150" height="50" rx="8"/>
  <text class="d-text" x="75" y="231" text-anchor="middle">row 1: col 2</text>
  <rect class="d-box" x="170" y="200" width="150" height="50" rx="8"/>
  <text class="d-text" x="245" y="231" text-anchor="middle">row 1: col 3</text>
  <rect class="d-box" x="375" y="200" width="150" height="50" rx="8"/>
  <text class="d-text" x="450" y="231" text-anchor="middle">row 1: col 3</text>
  <rect class="d-box-muted" x="0" y="290" width="150" height="50" rx="8"/>
  <text class="d-text" x="75" y="312" text-anchor="middle">dead end</text>
  <text class="d-sub" x="75" y="331" text-anchor="middle">row 2 all attacked</text>
  <rect class="d-box" x="170" y="290" width="150" height="50" rx="8"/>
  <text class="d-text" x="245" y="321" text-anchor="middle">row 2: col 1</text>
  <rect class="d-box" x="375" y="290" width="150" height="50" rx="8"/>
  <text class="d-text" x="450" y="321" text-anchor="middle">row 2: col 0</text>
  <rect class="d-box-muted" x="170" y="380" width="150" height="50" rx="8"/>
  <text class="d-text" x="245" y="402" text-anchor="middle">dead end</text>
  <text class="d-sub" x="245" y="421" text-anchor="middle">row 3 all attacked</text>
  <rect class="d-box-accent" x="375" y="380" width="150" height="50" rx="8"/>
  <text class="d-text" x="450" y="402" text-anchor="middle">row 3: col 2</text>
  <text class="d-sub" x="450" y="421" text-anchor="middle">solution 1, 3, 0, 2</text>
</svg>

The first queen in column 0 leads to two dead ends after only four placements. Column 1 leads straight to a solution. Columns 2 and 3 are the mirror images of columns 1 and 0, and give the second solution \`[2, 0, 3, 1]\`. The whole search for n = 4 places only 16 queens (example 2 counts them).

📌 **Interview term: Pruning** — abandoning a branch as soon as it violates a constraint, so none of the boards below that branch are ever built.

📌 **Interview term: Choose / explore / un-choose** — the three steps of every backtracking function; the un-choose step restores the shared state exactly, so the next sibling starts from a clean slate.

Compare this with the permutation view. One queen per row and one per column means every valid board is a **permutation** of the columns 0..n-1, so a brute force could generate all n! of them (see [generating all permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array)) and check the diagonals at the end. Backtracking does the diagonal check while building, so it never completes a permutation that is already broken.

## 6. The Code in JavaScript

Here is the core of example 1. The three sets are captured by the inner \`place\` function (a closure), so it needs only the row as a parameter.

~~~javascript
function solveNQueens(n) {
  // queens[r] = column of the queen in row r
  const cols = new Set(), diag = new Set(), anti = new Set(); // c, r - c, r + c
  const queens = [], solutions = [];

  function place(row) {
    if (row === n) {                       // every row has a queen
      solutions.push(queens.slice());      // copy: queens keeps changing
      return;
    }
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || diag.has(row - c) || anti.has(row + c)) continue; // prune
      cols.add(c); diag.add(row - c); anti.add(row + c); queens.push(c);
      place(row + 1);
      cols.delete(c); diag.delete(row - c); anti.delete(row + c); queens.pop();
    }
  }

  place(0);
  return solutions;
}
~~~

**What to point out in this code:**

- \`queens.slice()\` makes a shallow copy. Pushing \`queens\` itself would store the **same array** every time, and at the end every "solution" would be empty, because each \`push\` is undone by a \`pop\`.
- \`Set\` with numbers compares by value (SameValueZero), so \`diag.has(row - c)\` works for negative keys too. A plain object would also work but turns every key into a string.
- \`Set.prototype.delete\` returns \`false\` when the element is missing instead of throwing, so an undo bug will not crash; it will just give wrong counts. The known counts are your test.
- The recursion depth is n, so call-stack limits are irrelevant here.
- Printing an array with \`console.log(arr)\` shows \`[ 1, 3, 0, 2 ]\` in Node; the examples format arrays with \`'[' + arr.join(', ') + ']'\` so the output matches the other languages exactly.

To turn a solution into LeetCode's string format:

~~~javascript
function board(queens) {
  const n = queens.length;
  return queens.map(q => {
    const cells = [];
    for (let c = 0; c < n; c++) cells.push(c === q ? 'Q' : '.');
    return cells.join(' ');
  });
}
~~~

(LeetCode wants \`".Q.."\` with no spaces, which is \`cells.join('')\`; the spaces just make the printed boards easier to read.)

## 7. Counting Faster with Bitmasks

When only the **number** of solutions is needed, the three sets can become three integers. Bit c of \`cols\` is 1 when column c is taken. The two diagonal masks store which squares of the **current row** are attacked diagonally; moving down one row shifts one mask left and the other right by one bit.

~~~javascript
function totalNQueens(n) {
  const full = (1 << n) - 1;                 // n ones (JS bit operators work on 32-bit ints)

  function go(cols, d1, d2) {
    if (cols === full) return 1;             // n queens placed
    let count = 0;
    let free = full & ~(cols | d1 | d2);     // squares in this row nobody attacks
    while (free !== 0) {
      const bit = free & -free;              // lowest free square
      free -= bit;
      count += go(cols | bit, ((d1 | bit) << 1) & full, (d2 | bit) >> 1);
    }
    return count;
  }

  return go(0, 0, 0);
}
~~~

- \`full & ~(cols | d1 | d2)\` gives every safe square in the row in one operation.
- \`free & -free\` isolates the lowest set bit (\`0b10110 & -0b10110\` is \`0b10\`).
- JavaScript bitwise operators convert their operands to **32-bit signed integers**. That is fine here (n ≤ 30), but \`1 << 31\` is \`-2147483648\` and \`1 << 32\` is \`1\` (we printed both), so this trick has a hard size limit. Beyond 31 bits you would need \`BigInt\`.
- \`& full\` after the left shift drops bits that moved past the last column.

📌 **Interview term: Bitmask** — an integer used as a set of small numbers, one bit per element; union is \`|\`, intersection is \`&\`, and the lowest element is \`x & -x\`.

## 8. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22; the same scripts also run in the page, since they use only \`console.log\`). The same three programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — every solution for n = 4 drawn as a board, then the number of solutions for n = 0 to 8** prints:

~~~text
n=4: 2 solutions
columns [1, 3, 0, 2]
. Q . .
. . . Q
Q . . .
. . Q .
columns [2, 0, 3, 1]
. . Q .
Q . . .
. . . Q
. Q . .
n=0: 1
n=1: 1
n=2: 0
n=3: 0
n=4: 2
n=5: 10
n=6: 4
n=7: 40
n=8: 92
first solution for n=8: [0, 4, 7, 5, 2, 6, 1, 3]
~~~

The two boards for n = 4 are mirror images of each other. The counts 1, 0, 0, 2, 10, 4, 40, 92 show the two board sizes with no solution at all (n = 2 and 3), and that the count does not grow smoothly (n = 6 has fewer solutions than n = 5).

**Example 2 — brute force (generate every permutation, check diagonals at the end) against backtracking (check each queen as it is placed)** prints:

~~~text
n=4: brute force checks 24 full boards, backtracking places 16 queens, solutions 2 and 2
n=5: brute force checks 120 full boards, backtracking places 53 queens, solutions 10 and 10
n=6: brute force checks 720 full boards, backtracking places 152 queens, solutions 4 and 4
n=7: brute force checks 5040 full boards, backtracking places 551 queens, solutions 40 and 40
n=8: brute force checks 40320 full boards, backtracking places 2056 queens, solutions 92 and 92
n=8 boards with one queen per row and no rule at all: 16777216
~~~

Both methods find the same solutions, but backtracking places only 2,056 queens for n = 8 while brute force builds and checks 40,320 complete boards, each check costing up to 28 diagonal comparisons. The last line is the number of boards a search that ignored even the column rule would face: 16,777,216 for n = 8.

**Example 3 — counting solutions for n = 1 to 12 with the bitmask version** prints:

~~~text
n=1: 1
n=2: 0
n=3: 0
n=4: 2
n=5: 10
n=6: 4
n=7: 40
n=8: 92
n=9: 352
n=10: 724
n=11: 2680
n=12: 14200
0b10
~~~

The counts match example 1 where they overlap, which is a good way to test an optimised version against a simple one. The last line shows the lowest-set-bit trick on its own.

## 9. Complexity

| Measure | Cost | Why |
| :--- | :--- | :--- |
| Time (search) | O(n!) upper bound | row r has at most n - r free columns, so at most n · (n - 1) · ... · 1 leaves; pruning makes the real count far smaller (2,056 placements for n = 8, against 40,320 permutations) |
| Attack check | O(1) | three lookups: column, r - c, r + c |
| Copying a solution | O(n) each | the \`queens\` array is copied when a solution is found; building string boards costs O(n²) each |
| Extra space | O(n) | three collections of at most n, 2n - 1 and 2n - 1 entries, plus recursion depth n |
| Output space | O(S · n²) for S solution boards | only if every board is returned as strings |

No exact formula is known for the number of solutions, and there is no known polynomial way to count them, which is why interviewers accept the O(n!) bound. See [Big-O notation](/interview-question/what-is-big-o-notation) for how such bounds are read, and [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for the O(n) recursion depth.

## 10. Edge Cases

- **n = 1:** one solution, a single queen.
- **n = 2 and n = 3:** **zero** solutions. The code must return an empty list (or 0), not crash; example 1 prints \`n=2: 0\` and \`n=3: 0\`.
- **n = 0:** the loop records the empty board once, so the code returns 1 solution. LeetCode only asks for 1 ≤ n ≤ 9, so mention this convention rather than rely on it.
- **Recording a solution:** you must store a **copy** of \`queens\`; the array keeps changing as the search backtracks.
- **Symmetry:** every solution reflected left-to-right is another solution. For n = 8 there are 92 solutions but only 12 that are different under rotations and reflections (we checked by brute force). Trying only the left half of the first row and doubling the count is a classic follow-up optimisation; an odd n needs the middle column handled separately.

## 11. Where This Pattern Shows Up Again

N-Queens is the "constraint" member of the backtracking family. Generating [all subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array) and [generating all permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array) enumerate everything with no rule to break; [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem) prunes on a running sum; Sudoku solvers use exactly the N-Queens idea of marker sets for rows, columns and boxes. The base case and the depth of the recursion are covered in [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).

## Common Pitfalls

- **Pushing \`queens\` instead of \`queens.slice()\`.** Every stored solution is the same array, and it is empty when the search ends.
- **Forgetting the un-choose step for one of the three sets.** A diagonal that stays marked hides valid solutions; check against the known counts 2, 10, 4, 40, 92 for n = 4..8.
- **\`new Array(n).fill(new Array(n).fill('.'))\` for a board.** \`fill\` puts the same inner array in every row, so one queen appears in every row. Build each row separately.
- **Bit tricks past 31 columns.** \`1 << n\` wraps around at 32 bits, so the bitmask counter silently breaks for n ≥ 31.
- **Dumping arrays with \`console.log\`.** Node prints \`[ 1, 3, 0, 2 ]\` with inner spaces; join the array yourself when output must match exactly.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">One queen per row, so the answer is an array <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queens[row] = col</code>; I decide one row at a time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Search:</strong> <span style="color:#f0e2c8;">Backtracking: for each column, skip it if attacked, otherwise choose, recurse on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row + 1</code>, and un-choose.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. O(1) check:</strong> <span style="color:#f0e2c8;">Three <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>s: used columns, used <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r - c</code>, used <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r + c</code>; each diagonal has one constant value.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n!) upper bound but heavy pruning: 2,056 placements for n = 8 versus 40,320 permutations; O(n) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JS care:</strong> <span style="color:#f0e2c8;">Record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queens.slice()</code>; for counting only, use 32-bit bitmasks with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">free &amp; -free</code>, valid up to about 30 columns.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">r - c</code> the same along a diagonal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Moving one step down-right adds 1 to both r and c, so the difference does not change. Moving down-left adds 1 to r and subtracts 1 from c, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r + c</code> stays the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you make it faster for counting only?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: replace the sets with three numbers used as bitmasks and pick safe squares with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">free &amp; -free</code>. It counted 14,200 solutions for n = 12 in well under a second here.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Set or boolean array for the markers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both are O(1). Arrays of size n, 2n and 2n with an offset of n for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r - c</code> avoid hashing and are usually faster; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> reads more naturally. Example 2 uses arrays.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the time complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No tight closed form is known. O(n!) is a safe upper bound because row r has at most n - r free columns; pruning makes the real tree much smaller.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you use symmetry?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mirror images of solutions are solutions, so try only the left half of row 0, double the count, and for odd n add the solutions whose first queen is in the middle column.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State-space search** | Exploring a tree of partial answers, one decision per level |
| **Diagonal invariant** | r - c is constant on a main diagonal, r + c on an anti-diagonal |
| **Constraint propagation (lightweight)** | Recording each decision so later checks are O(1) |
| **Pruning** | Abandoning a branch as soon as it breaks a rule |
| **Choose / explore / un-choose** | The three steps of a backtracking function; the last one restores shared state |
| **Bitmask** | An integer used as a set, one bit per element |

---
**Conclusion:** N-Queens is solved by deciding one row at a time, so a solution is just the column of the queen in each row. Backtracking tries each column, skips it in O(1) when its column, its r - c diagonal or its r + c anti-diagonal is already taken, recurses to the next row, and undoes the marks on the way back. Pruning keeps the search tiny compared with the n! permutations (2,056 placements for n = 8 instead of 40,320 complete boards). In JavaScript that is a closure over three \`Set\`s, with \`queens.slice()\` recorded at the leaves, and 32-bit bitmasks when you only need the count.`,
        examples: [
          {
            label: `All solutions as boards for n = 4, solution counts for n = 0..8`,
            code: `function solveNQueens(n) {
  // queens[r] = column of the queen in row r
  const cols = new Set(), diag = new Set(), anti = new Set(); // c, r - c, r + c
  const queens = [], solutions = [];

  function place(row) {
    if (row === n) {                       // every row has a queen
      solutions.push(queens.slice());      // copy: queens keeps changing
      return;
    }
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || diag.has(row - c) || anti.has(row + c)) continue; // prune
      cols.add(c); diag.add(row - c); anti.add(row + c); queens.push(c);
      place(row + 1);
      cols.delete(c); diag.delete(row - c); anti.delete(row + c); queens.pop();
    }
  }

  place(0);
  return solutions;
}

function fmt(arr) { return '[' + arr.join(', ') + ']'; }

function board(queens) {
  const n = queens.length;
  return queens.map(q => {
    const cells = [];
    for (let c = 0; c < n; c++) cells.push(c === q ? 'Q' : '.');
    return cells.join(' ');
  });
}

const sols = solveNQueens(4);
console.log('n=4: ' + sols.length + ' solutions');
for (const s of sols) {
  console.log('columns ' + fmt(s));
  for (const line of board(s)) console.log(line);
}
for (let n = 0; n <= 8; n++) console.log('n=' + n + ': ' + solveNQueens(n).length);
console.log('first solution for n=8: ' + fmt(solveNQueens(8)[0]));`,
          },
          {
            label: `Brute force over permutations vs backtracking: work counted for n = 4..8`,
            code: `// Brute force: try every permutation (one queen per row, all columns different),
// then check the diagonals. Backtracking: check each queen as it is placed.

function bruteForce(n) {
  const perm = [], used = new Array(n).fill(false);
  let checked = 0, found = 0;

  function safe(p) {
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (Math.abs(p[i] - p[j]) === j - i) return false;   // same diagonal
    return true;
  }

  function gen() {
    if (perm.length === n) {
      checked++;
      if (safe(perm)) found++;
      return;
    }
    for (let c = 0; c < n; c++) {
      if (used[c]) continue;
      used[c] = true; perm.push(c);
      gen();
      used[c] = false; perm.pop();
    }
  }

  gen();
  return [checked, found];
}

function backtracking(n) {
  const cols = new Array(n).fill(false);
  const diag = new Array(2 * n).fill(false), anti = new Array(2 * n).fill(false);
  let placed = 0, found = 0;

  function place(row) {
    if (row === n) { found++; return; }
    for (let c = 0; c < n; c++) {
      if (cols[c] || diag[row - c + n] || anti[row + c]) continue;
      placed++;                                  // one node of the search tree
      cols[c] = diag[row - c + n] = anti[row + c] = true;
      place(row + 1);
      cols[c] = diag[row - c + n] = anti[row + c] = false;
    }
  }

  place(0);
  return [placed, found];
}

for (let n = 4; n <= 8; n++) {
  const [checked, a] = bruteForce(n);
  const [placed, b] = backtracking(n);
  console.log('n=' + n + ': brute force checks ' + checked + ' full boards, backtracking places ' +
    placed + ' queens, solutions ' + a + ' and ' + b);
}
console.log('n=8 boards with one queen per row and no rule at all: ' + 8 ** 8);`,
          },
          {
            label: `N-Queens II: counting solutions for n = 1..12 with bitmasks`,
            code: `// N-Queens II: count solutions with three bitmasks instead of three sets.
// Bit c of "cols" is 1 when column c is taken. "d1" and "d2" hold the squares
// attacked diagonally in the CURRENT row; they shift by one each row.

function totalNQueens(n) {
  const full = (1 << n) - 1;                 // n ones (JS bit operators work on 32-bit ints)

  function go(cols, d1, d2) {
    if (cols === full) return 1;             // n queens placed
    let count = 0;
    let free = full & ~(cols | d1 | d2);     // squares in this row nobody attacks
    while (free !== 0) {
      const bit = free & -free;              // lowest free square
      free -= bit;
      count += go(cols | bit, ((d1 | bit) << 1) & full, (d2 | bit) >> 1);
    }
    return count;
  }

  return go(0, 0, 0);
}

for (let n = 1; n <= 12; n++) console.log('n=' + n + ': ' + totalNQueens(n));
console.log('0b' + (0b10110 & -0b10110).toString(2)); // 0b10`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Place n queens on an n by n chessboard so that no two attack each other. Write it in Java: return every solution, and then tell me how you would only count them for n up to 12."

**What a strong answer should cover:**
- Place one queen per row, so a solution is an \`int[] queens\` with \`queens[row] = col\`; this turns n² cells into n decisions.
- Backtracking with choose / explore / un-choose, pruning a column as soon as it is attacked.
- O(1) safety checks using three \`boolean[]\` arrays: columns, \`r - c + n\` (offset so the index is never negative) and \`r + c\`.
- Complexity: O(n!) upper bound on the search, O(n) extra space plus the output; 92 solutions for n = 8.
- Java details: store \`queens.clone()\`, \`boolean[]\` starts all \`false\`, LeetCode returns \`List<List<String>>\` built with \`char[]\` and \`new String(row)\`, and in the bitmask version \`int\` is 32 bits.

**Clarifying questions expected:**
- Do you want every board as a \`List<List<String>>\` or only the number of solutions?
- What range of n should I expect? (It decides whether a bitmask counter is worth it.)

**Code / implementation expected:** Yes — a recursive \`solveNQueens(int n)\` with three \`boolean[]\` arrays in Java, and optionally a bitmask counter.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know recursion in Java and want to master backtracking.  
**Difficulty:** Hard  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine seating eight very touchy guests at a square banquet table laid out like a chessboard. Each guest refuses to sit in the same row as another guest, in the same column, or anywhere along the same diagonal line. You want to find every seating plan that keeps everyone calm.

You could write down every possible way to put 8 guests on 64 seats and check each one. There are more than four billion of them. Or you could do what a sensible host does: seat the first guest, then seat the second somewhere safe, then the third, and the moment you discover there is **no** safe seat for the next guest, you stand the previous guest back up and try their next option. You never finish a plan that is already ruined.

That sensible host is doing **backtracking**, and the N-Queens puzzle (place n chess queens on an n × n board so no two attack each other) is the classic interview problem for it. It tests three things at once: can you shape a search so most bad options are never generated, can you check "is this square attacked?" in O(1), and can you undo your changes cleanly when you step back.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Return every board, or just the number of solutions? | Boards need copying and string building (LeetCode 51); a count allows the faster bitmask version (LeetCode 52). |
| What output format for a board? | Usually a list of strings such as \`".Q.."\`; agree on it before writing the printing code. |
| How large can n be? | Up to about 12 any backtracking is fine; much larger and you need bitmasks, symmetry, or a different goal (find one solution, not all). |
| Any order required for the solutions? | Trying columns left to right in row order already gives a fixed, sorted-by-row order. |
| What about n = 2 or 3, where no solution exists? | The answer is an empty list or 0, not an error. |

## 3. The Rules and the First Big Simplification

A queen attacks along its row, its column and both diagonals, any distance. So a valid answer has:

- exactly one queen in every **row** (n queens, n rows, at most one per row),
- exactly one queen in every **column** (same argument),
- at most one queen on every diagonal in both directions.

The first insight removes most of the search before we start: **because each row holds exactly one queen, decide row by row.** A solution is then just a list \`queens\` where \`queens[r]\` is the column of the queen in row r. The board below is the solution \`[1, 3, 0, 2]\` for n = 4.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A four by four board with one queen in each row: row 0 column 1, row 1 column 3, row 2 column 0, row 3 column 2. No two queens share a column or a diagonal.">
  <text class="d-sub" x="278" y="38" text-anchor="middle">col 0</text>
  <text class="d-sub" x="334" y="38" text-anchor="middle">col 1</text>
  <text class="d-sub" x="390" y="38" text-anchor="middle">col 2</text>
  <text class="d-sub" x="446" y="38" text-anchor="middle">col 3</text>
  <text class="d-sub" x="204" y="83" text-anchor="middle">row 0</text>
  <rect class="d-box" x="250" y="50" width="56" height="56"/>
  <rect class="d-box-accent" x="306" y="50" width="56" height="56"/>
  <text class="d-text" x="334" y="84" text-anchor="middle">Q</text>
  <rect class="d-box" x="362" y="50" width="56" height="56"/>
  <rect class="d-box-muted" x="418" y="50" width="56" height="56"/>
  <text class="d-sub" x="204" y="139" text-anchor="middle">row 1</text>
  <rect class="d-box-muted" x="250" y="106" width="56" height="56"/>
  <rect class="d-box" x="306" y="106" width="56" height="56"/>
  <rect class="d-box-muted" x="362" y="106" width="56" height="56"/>
  <rect class="d-box-accent" x="418" y="106" width="56" height="56"/>
  <text class="d-text" x="446" y="140" text-anchor="middle">Q</text>
  <text class="d-sub" x="204" y="195" text-anchor="middle">row 2</text>
  <rect class="d-box-accent" x="250" y="162" width="56" height="56"/>
  <text class="d-text" x="278" y="196" text-anchor="middle">Q</text>
  <rect class="d-box-muted" x="306" y="162" width="56" height="56"/>
  <rect class="d-box" x="362" y="162" width="56" height="56"/>
  <rect class="d-box-muted" x="418" y="162" width="56" height="56"/>
  <text class="d-sub" x="204" y="251" text-anchor="middle">row 3</text>
  <rect class="d-box-muted" x="250" y="218" width="56" height="56"/>
  <rect class="d-box" x="306" y="218" width="56" height="56"/>
  <rect class="d-box-accent" x="362" y="218" width="56" height="56"/>
  <text class="d-text" x="390" y="252" text-anchor="middle">Q</text>
  <rect class="d-box" x="418" y="218" width="56" height="56"/>
  <rect class="d-box" x="540" y="110" width="160" height="104" rx="10"/>
  <text class="d-text" x="620" y="142" text-anchor="middle">queens array</text>
  <text class="d-sub" x="620" y="170" text-anchor="middle">[1, 3, 0, 2]</text>
  <text class="d-sub" x="620" y="194" text-anchor="middle">index = row</text>
</svg>

The array index is the row and the value is the column, so "one queen per row" is guaranteed by the shape of the data itself.

📌 **Interview term: State-space search** — exploring a tree whose nodes are partial answers (here: queens placed in the first r rows) and whose children add one more decision.

The output format varies by interviewer. LeetCode's "N-Queens" (problem 51) wants every board as a list of strings like \`".Q.."\`; "N-Queens II" (problem 52) wants only the number of solutions. Both use exactly the same search.

## 4. O(1) Attack Checks with r - c and r + c

When we try column c in row r, we must know whether any earlier queen attacks that square. Scanning all earlier queens costs O(r). The standard trick makes it O(1):

- Every square on the same **main diagonal** (running top-left to bottom-right) has the same value of **r - c**.
- Every square on the same **anti-diagonal** (running top-right to bottom-left) has the same value of **r + c**.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="Two four by four grids. In the left grid each cell shows r minus c and the main diagonal, where r minus c is 0, is highlighted. In the right grid each cell shows r plus c and the anti diagonal where r plus c is 3 is highlighted.">
  <text class="d-text" x="166" y="30" text-anchor="middle">value r - c</text>
  <rect class="d-box-accent" x="70" y="56" width="48" height="48"/>
  <text class="d-sub" x="94" y="86" text-anchor="middle">0</text>
  <rect class="d-box" x="118" y="56" width="48" height="48"/>
  <text class="d-sub" x="142" y="86" text-anchor="middle">-1</text>
  <rect class="d-box" x="166" y="56" width="48" height="48"/>
  <text class="d-sub" x="190" y="86" text-anchor="middle">-2</text>
  <rect class="d-box" x="214" y="56" width="48" height="48"/>
  <text class="d-sub" x="238" y="86" text-anchor="middle">-3</text>
  <rect class="d-box" x="70" y="104" width="48" height="48"/>
  <text class="d-sub" x="94" y="134" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="118" y="104" width="48" height="48"/>
  <text class="d-sub" x="142" y="134" text-anchor="middle">0</text>
  <rect class="d-box" x="166" y="104" width="48" height="48"/>
  <text class="d-sub" x="190" y="134" text-anchor="middle">-1</text>
  <rect class="d-box" x="214" y="104" width="48" height="48"/>
  <text class="d-sub" x="238" y="134" text-anchor="middle">-2</text>
  <rect class="d-box" x="70" y="152" width="48" height="48"/>
  <text class="d-sub" x="94" y="182" text-anchor="middle">2</text>
  <rect class="d-box" x="118" y="152" width="48" height="48"/>
  <text class="d-sub" x="142" y="182" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="166" y="152" width="48" height="48"/>
  <text class="d-sub" x="190" y="182" text-anchor="middle">0</text>
  <rect class="d-box" x="214" y="152" width="48" height="48"/>
  <text class="d-sub" x="238" y="182" text-anchor="middle">-1</text>
  <rect class="d-box" x="70" y="200" width="48" height="48"/>
  <text class="d-sub" x="94" y="230" text-anchor="middle">3</text>
  <rect class="d-box" x="118" y="200" width="48" height="48"/>
  <text class="d-sub" x="142" y="230" text-anchor="middle">2</text>
  <rect class="d-box" x="166" y="200" width="48" height="48"/>
  <text class="d-sub" x="190" y="230" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="214" y="200" width="48" height="48"/>
  <text class="d-sub" x="238" y="230" text-anchor="middle">0</text>
  <text class="d-text" x="526" y="30" text-anchor="middle">value r + c</text>
  <rect class="d-box" x="430" y="56" width="48" height="48"/>
  <text class="d-sub" x="454" y="86" text-anchor="middle">0</text>
  <rect class="d-box" x="478" y="56" width="48" height="48"/>
  <text class="d-sub" x="502" y="86" text-anchor="middle">1</text>
  <rect class="d-box" x="526" y="56" width="48" height="48"/>
  <text class="d-sub" x="550" y="86" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="574" y="56" width="48" height="48"/>
  <text class="d-sub" x="598" y="86" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="104" width="48" height="48"/>
  <text class="d-sub" x="454" y="134" text-anchor="middle">1</text>
  <rect class="d-box" x="478" y="104" width="48" height="48"/>
  <text class="d-sub" x="502" y="134" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="526" y="104" width="48" height="48"/>
  <text class="d-sub" x="550" y="134" text-anchor="middle">3</text>
  <rect class="d-box" x="574" y="104" width="48" height="48"/>
  <text class="d-sub" x="598" y="134" text-anchor="middle">4</text>
  <rect class="d-box" x="430" y="152" width="48" height="48"/>
  <text class="d-sub" x="454" y="182" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="478" y="152" width="48" height="48"/>
  <text class="d-sub" x="502" y="182" text-anchor="middle">3</text>
  <rect class="d-box" x="526" y="152" width="48" height="48"/>
  <text class="d-sub" x="550" y="182" text-anchor="middle">4</text>
  <rect class="d-box" x="574" y="152" width="48" height="48"/>
  <text class="d-sub" x="598" y="182" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="430" y="200" width="48" height="48"/>
  <text class="d-sub" x="454" y="230" text-anchor="middle">3</text>
  <rect class="d-box" x="478" y="200" width="48" height="48"/>
  <text class="d-sub" x="502" y="230" text-anchor="middle">4</text>
  <rect class="d-box" x="526" y="200" width="48" height="48"/>
  <text class="d-sub" x="550" y="230" text-anchor="middle">5</text>
  <rect class="d-box" x="574" y="200" width="48" height="48"/>
  <text class="d-sub" x="598" y="230" text-anchor="middle">6</text>
</svg>

On the left, the highlighted squares all have r - c = 0; on the right, the highlighted squares all have r + c = 3. So we keep three "taken" collections: the set of used columns, the set of used r - c values and the set of used r + c values. A square is safe when its column, its r - c and its r + c are all unused.

📌 **Interview term: Diagonal invariant** — r - c is constant along a main diagonal and r + c is constant along an anti-diagonal, so one number identifies each diagonal. There are 2n - 1 of each.

📌 **Interview term: Constraint propagation (lightweight)** — recording each decision in lookup structures so later checks are O(1) instead of re-scanning the whole board.

## 5. The Backtracking Search

This is a direct use of the [backtracking](/interview-question/what-is-backtracking) template: choose, explore, un-choose.

1. \`place(row)\`: if \`row == n\`, every row has a queen, so record a copy of \`queens\` as a solution.
2. Otherwise, for each column c in this row: if c, r - c or r + c is taken, **skip** it (this is the pruning).
3. Otherwise **choose**: mark the column and both diagonals as taken and put the queen.
4. **Explore**: call \`place(row + 1)\`.
5. **Un-choose**: unmark the three entries and remove the queen, then try the next column.

The tree for n = 4 shows the effect. Every box is a queen that passed the attack check; branches that cannot continue stop immediately.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 450" role="img" aria-label="Search tree for four queens. Starting from an empty board, placing the first queen in column 0 leads to two dead ends. Placing it in column 1 leads straight to the solution 1, 3, 0, 2. Columns 2 and 3 are mirror images of the first two branches.">
  <defs>
    <marker id="b32q1ja-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 380 72 L 160 104" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge-accent" d="M 380 72 L 450 104" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge" d="M 380 72 L 660 104" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge" d="M 160 162 L 75 194" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge" d="M 160 162 L 245 194" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge-accent" d="M 450 162 L 450 194" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge" d="M 75 252 L 75 284" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge" d="M 245 252 L 245 284" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge-accent" d="M 450 252 L 450 284" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge" d="M 245 342 L 245 374" marker-end="url(#b32q1ja-a)"/>
  <path class="d-edge-accent" d="M 450 342 L 450 374" marker-end="url(#b32q1ja-a)"/>
  <rect class="d-box" x="305" y="20" width="150" height="50" rx="8"/>
  <text class="d-text" x="380" y="42" text-anchor="middle">start</text>
  <text class="d-sub" x="380" y="61" text-anchor="middle">empty board</text>
  <rect class="d-box" x="85" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="160" y="141" text-anchor="middle">row 0: col 0</text>
  <rect class="d-box" x="375" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="450" y="141" text-anchor="middle">row 0: col 1</text>
  <rect class="d-box-muted" x="585" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="660" y="132" text-anchor="middle">cols 2 and 3</text>
  <text class="d-sub" x="660" y="151" text-anchor="middle">mirror images</text>
  <rect class="d-box" x="0" y="200" width="150" height="50" rx="8"/>
  <text class="d-text" x="75" y="231" text-anchor="middle">row 1: col 2</text>
  <rect class="d-box" x="170" y="200" width="150" height="50" rx="8"/>
  <text class="d-text" x="245" y="231" text-anchor="middle">row 1: col 3</text>
  <rect class="d-box" x="375" y="200" width="150" height="50" rx="8"/>
  <text class="d-text" x="450" y="231" text-anchor="middle">row 1: col 3</text>
  <rect class="d-box-muted" x="0" y="290" width="150" height="50" rx="8"/>
  <text class="d-text" x="75" y="312" text-anchor="middle">dead end</text>
  <text class="d-sub" x="75" y="331" text-anchor="middle">row 2 all attacked</text>
  <rect class="d-box" x="170" y="290" width="150" height="50" rx="8"/>
  <text class="d-text" x="245" y="321" text-anchor="middle">row 2: col 1</text>
  <rect class="d-box" x="375" y="290" width="150" height="50" rx="8"/>
  <text class="d-text" x="450" y="321" text-anchor="middle">row 2: col 0</text>
  <rect class="d-box-muted" x="170" y="380" width="150" height="50" rx="8"/>
  <text class="d-text" x="245" y="402" text-anchor="middle">dead end</text>
  <text class="d-sub" x="245" y="421" text-anchor="middle">row 3 all attacked</text>
  <rect class="d-box-accent" x="375" y="380" width="150" height="50" rx="8"/>
  <text class="d-text" x="450" y="402" text-anchor="middle">row 3: col 2</text>
  <text class="d-sub" x="450" y="421" text-anchor="middle">solution 1, 3, 0, 2</text>
</svg>

The first queen in column 0 leads to two dead ends after only four placements. Column 1 leads straight to a solution. Columns 2 and 3 are the mirror images of columns 1 and 0, and give the second solution \`[2, 0, 3, 1]\`. The whole search for n = 4 places only 16 queens (example 2 counts them).

📌 **Interview term: Pruning** — abandoning a branch as soon as it violates a constraint, so none of the boards below that branch are ever built.

📌 **Interview term: Choose / explore / un-choose** — the three steps of every backtracking function; the un-choose step restores the shared state exactly, so the next sibling starts from a clean slate.

Compare this with the permutation view. One queen per row and one per column means every valid board is a **permutation** of the columns 0..n-1, so a brute force could generate all n! of them (see [generating all permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array)) and check the diagonals at the end. Backtracking does the diagonal check while building, so it never completes a permutation that is already broken.

## 6. The Code in Java

Here is the core of example 1. The marker arrays are passed down as parameters; they could equally be fields of a solver object.

~~~java
static List<int[]> solveNQueens(int n) {
    List<int[]> solutions = new ArrayList<>();
    boolean[] cols = new boolean[n];
    boolean[] diag = new boolean[2 * n];   // index r - c + n (never negative)
    boolean[] anti = new boolean[2 * n];   // index r + c
    place(0, n, new int[n], cols, diag, anti, solutions);
    return solutions;
}

static void place(int row, int n, int[] queens, boolean[] cols, boolean[] diag,
                  boolean[] anti, List<int[]> solutions) {
    if (row == n) {                          // every row has a queen
        solutions.add(queens.clone());       // copy: queens keeps changing
        return;
    }
    for (int c = 0; c < n; c++) {
        if (cols[c] || diag[row - c + n] || anti[row + c]) continue; // prune
        cols[c] = diag[row - c + n] = anti[row + c] = true;
        queens[row] = c;
        place(row + 1, n, queens, cols, diag, anti, solutions);
        cols[c] = diag[row - c + n] = anti[row + c] = false;      // undo
    }
}
~~~

**What to point out in this code:**

- \`diag\` is indexed by \`row - c + n\`. The raw value \`row - c\` ranges from -(n - 1) to n - 1, and a negative index throws \`ArrayIndexOutOfBoundsException\`. The offset maps it to 1 .. 2n - 1.
- \`new boolean[k]\` is filled with \`false\` by the language, so there is no initialisation loop.
- \`queens.clone()\` copies the array. Adding \`queens\` itself would store one shared array that keeps changing; every "solution" would end up as the last state of the search.
- Because \`queens[row] = c\` simply overwrites the slot for this row, the queens array needs no explicit undo; the three markers do.
- \`cols[c] = diag[row - c + n] = anti[row + c] = true;\` is a chained assignment: it evaluates right to left and sets all three.

To return LeetCode's \`List<List<String>>\`, build each row in a \`char[]\`:

~~~java
static List<String> board(int[] queens) {
    int n = queens.length;
    List<String> rows = new ArrayList<>();
    for (int q : queens) {
        char[] row = new char[n];
        Arrays.fill(row, '.');
        row[q] = 'Q';
        rows.add(new String(row));
    }
    return rows;
}
~~~

## 7. Counting Faster with Bitmasks

When only the **number** of solutions is needed, the three arrays can become three \`int\`s. Bit c of \`cols\` is 1 when column c is taken. The two diagonal masks store which squares of the **current row** are attacked diagonally; moving down one row shifts one mask left and the other right by one bit.

~~~java
static int full;

static int go(int cols, int d1, int d2) {
    if (cols == full) return 1;                  // n queens placed
    int count = 0;
    int free = full & ~(cols | d1 | d2);         // squares in this row nobody attacks
    while (free != 0) {
        int bit = free & -free;                  // lowest free square (Integer.lowestOneBit)
        free -= bit;
        count += go(cols | bit, ((d1 | bit) << 1) & full, (d2 | bit) >>> 1);
    }
    return count;
}

static int totalNQueens(int n) {
    full = (1 << n) - 1;                         // n ones: every column of a row
    return go(0, 0, 0);
}
~~~

- \`full & ~(cols | d1 | d2)\` gives every safe square in the row in one operation.
- \`free & -free\` isolates the lowest set bit; it is what \`Integer.lowestOneBit(free)\` returns. (\`Integer.toBinaryString(0b10110 & -0b10110)\` printed \`10\`.)
- \`>>>\` is the unsigned right shift. With masked, non-negative values \`>>\` would give the same result, but \`>>>\` never drags a sign bit in, so it is the safe habit for bit sets.
- An \`int\` has 32 bits, so this version is good up to n = 31 at most (use \`long\` for more, although counting is far too slow at that size anyway).

📌 **Interview term: Bitmask** — an integer used as a set of small numbers, one bit per element; union is \`|\`, intersection is \`&\`, and the lowest element is \`x & -x\`.

## 8. Verified: Running the Code

Each example was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21, using nothing newer than Java 17). The same three programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — every solution for n = 4 drawn as a board, then the number of solutions for n = 0 to 8** prints:

~~~text
n=4: 2 solutions
columns [1, 3, 0, 2]
. Q . .
. . . Q
Q . . .
. . Q .
columns [2, 0, 3, 1]
. . Q .
Q . . .
. . . Q
. Q . .
n=0: 1
n=1: 1
n=2: 0
n=3: 0
n=4: 2
n=5: 10
n=6: 4
n=7: 40
n=8: 92
first solution for n=8: [0, 4, 7, 5, 2, 6, 1, 3]
~~~

The two boards for n = 4 are mirror images of each other. The counts 1, 0, 0, 2, 10, 4, 40, 92 show the two board sizes with no solution at all (n = 2 and 3), and that the count does not grow smoothly (n = 6 has fewer solutions than n = 5).

**Example 2 — brute force (generate every permutation, check diagonals at the end) against backtracking (check each queen as it is placed)** prints:

~~~text
n=4: brute force checks 24 full boards, backtracking places 16 queens, solutions 2 and 2
n=5: brute force checks 120 full boards, backtracking places 53 queens, solutions 10 and 10
n=6: brute force checks 720 full boards, backtracking places 152 queens, solutions 4 and 4
n=7: brute force checks 5040 full boards, backtracking places 551 queens, solutions 40 and 40
n=8: brute force checks 40320 full boards, backtracking places 2056 queens, solutions 92 and 92
n=8 boards with one queen per row and no rule at all: 16777216
~~~

Both methods find the same solutions, but backtracking places only 2,056 queens for n = 8 while brute force builds and checks 40,320 complete boards, each check costing up to 28 diagonal comparisons. The last line is the number of boards a search that ignored even the column rule would face: 16,777,216 for n = 8.

**Example 3 — counting solutions for n = 1 to 12 with the bitmask version** prints:

~~~text
n=1: 1
n=2: 0
n=3: 0
n=4: 2
n=5: 10
n=6: 4
n=7: 40
n=8: 92
n=9: 352
n=10: 724
n=11: 2680
n=12: 14200
0b10
~~~

The counts match example 1 where they overlap, which is a good way to test an optimised version against a simple one. The last line shows the lowest-set-bit trick on its own.

## 9. Complexity

| Measure | Cost | Why |
| :--- | :--- | :--- |
| Time (search) | O(n!) upper bound | row r has at most n - r free columns, so at most n · (n - 1) · ... · 1 leaves; pruning makes the real count far smaller (2,056 placements for n = 8, against 40,320 permutations) |
| Attack check | O(1) | three lookups: column, r - c, r + c |
| Copying a solution | O(n) each | the \`queens\` array is copied when a solution is found; building string boards costs O(n²) each |
| Extra space | O(n) | three collections of at most n, 2n - 1 and 2n - 1 entries, plus recursion depth n |
| Output space | O(S · n²) for S solution boards | only if every board is returned as strings |

No exact formula is known for the number of solutions, and there is no known polynomial way to count them, which is why interviewers accept the O(n!) bound. See [Big-O notation](/interview-question/what-is-big-o-notation) for how such bounds are read, and [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for the O(n) recursion depth.

## 10. Edge Cases

- **n = 1:** one solution, a single queen.
- **n = 2 and n = 3:** **zero** solutions. The code must return an empty list (or 0), not crash; example 1 prints \`n=2: 0\` and \`n=3: 0\`.
- **n = 0:** the loop records the empty board once, so the code returns 1 solution. LeetCode only asks for 1 ≤ n ≤ 9, so mention this convention rather than rely on it.
- **Recording a solution:** you must store a **copy** of \`queens\`; the array keeps changing as the search backtracks.
- **Symmetry:** every solution reflected left-to-right is another solution. For n = 8 there are 92 solutions but only 12 that are different under rotations and reflections (we checked by brute force). Trying only the left half of the first row and doubling the count is a classic follow-up optimisation; an odd n needs the middle column handled separately.

## 11. Where This Pattern Shows Up Again

N-Queens is the "constraint" member of the backtracking family. Generating [all subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array) and [generating all permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array) enumerate everything with no rule to break; [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem) prunes on a running sum; Sudoku solvers use exactly the N-Queens idea of marker sets for rows, columns and boxes. The base case and the depth of the recursion are covered in [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).

## Common Pitfalls

- **Indexing \`diag[row - c]\` without the \`+ n\` offset.** It throws \`ArrayIndexOutOfBoundsException\` as soon as c > row.
- **Adding \`queens\` instead of \`queens.clone()\`.** All stored solutions share one array that the search keeps overwriting.
- **Forgetting to reset one marker on the way back.** The search then hides valid boards; compare against the counts 2, 10, 4, 40, 92 for n = 4..8.
- **Building row strings with \`+=\` in a loop.** It works but creates many temporary \`String\`s; \`char[]\` plus \`new String(row)\` or a \`StringBuilder\` is the idiomatic way.
- **Static counters that are not reset.** Example 2 uses static fields for the counts and resets them before each n; forgetting that accumulates totals across runs.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">One queen per row, so the answer is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[] queens</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queens[row] = col</code>; I decide one row at a time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Search:</strong> <span style="color:#f0e2c8;">Backtracking: for each column, skip it if attacked, otherwise mark, recurse on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row + 1</code>, and unmark.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. O(1) check:</strong> <span style="color:#f0e2c8;">Three <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[]</code>: columns, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r - c + n</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r + c</code>; the offset keeps the diagonal index non-negative.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n!) upper bound but heavy pruning: 2,056 placements for n = 8 versus 40,320 permutations; O(n) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java care:</strong> <span style="color:#f0e2c8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queens.clone()</code>; for counting only, three <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> bitmasks with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">free &amp; -free</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;&gt;&gt;</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">r - c</code> the same along a diagonal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Moving one step down-right adds 1 to both r and c, so the difference does not change. Moving down-left adds 1 to r and subtracts 1 from c, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r + c</code> stays the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">boolean[]</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashSet&lt;Integer&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both give O(1) checks, but the array avoids boxing every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> and avoids hashing. The index range is small and known (0 .. 2n - 1), which is exactly when an array beats a set.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you make it faster for counting only?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: three <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> bitmasks and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">free &amp; -free</code> (the same as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.lowestOneBit</code>). It counted 14,200 solutions for n = 12 here.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the time complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No tight closed form is known. O(n!) is a safe upper bound because row r has at most n - r free columns; pruning makes the real tree much smaller.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you use symmetry?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mirror images of solutions are solutions, so try only the left half of row 0, double the count, and for odd n add the solutions whose first queen is in the middle column.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State-space search** | Exploring a tree of partial answers, one decision per level |
| **Diagonal invariant** | r - c is constant on a main diagonal, r + c on an anti-diagonal |
| **Constraint propagation (lightweight)** | Recording each decision so later checks are O(1) |
| **Pruning** | Abandoning a branch as soon as it breaks a rule |
| **Choose / explore / un-choose** | The three steps of a backtracking function; the last one restores shared state |
| **Bitmask** | An integer used as a set, one bit per element |

---
**Conclusion:** N-Queens is solved by deciding one row at a time, so a solution is just the column of the queen in each row. Backtracking tries each column, skips it in O(1) when its column, its r - c diagonal or its r + c anti-diagonal is already taken, recurses to the next row, and undoes the marks on the way back. Pruning keeps the search tiny compared with the n! permutations (2,056 placements for n = 8 instead of 40,320 complete boards). In Java that is three \`boolean[]\` arrays with an offset for \`r - c\`, \`queens.clone()\` at the leaves, and \`int\` bitmasks when you only need the count.`,
        examples: [
          {
            label: `All solutions as boards for n = 4, solution counts for n = 0..8`,
            code: `import java.util.*;

public class Main {
    // queens[r] = column of the queen in row r
    static List<int[]> solveNQueens(int n) {
        List<int[]> solutions = new ArrayList<>();
        boolean[] cols = new boolean[n];
        boolean[] diag = new boolean[2 * n];   // index r - c + n (never negative)
        boolean[] anti = new boolean[2 * n];   // index r + c
        place(0, n, new int[n], cols, diag, anti, solutions);
        return solutions;
    }

    static void place(int row, int n, int[] queens, boolean[] cols, boolean[] diag,
                      boolean[] anti, List<int[]> solutions) {
        if (row == n) {                          // every row has a queen
            solutions.add(queens.clone());       // copy: queens keeps changing
            return;
        }
        for (int c = 0; c < n; c++) {
            if (cols[c] || diag[row - c + n] || anti[row + c]) continue; // prune
            cols[c] = diag[row - c + n] = anti[row + c] = true;
            queens[row] = c;
            place(row + 1, n, queens, cols, diag, anti, solutions);
            cols[c] = diag[row - c + n] = anti[row + c] = false;      // undo
        }
    }

    static String board(int[] queens, int r) {
        StringBuilder sb = new StringBuilder();
        for (int c = 0; c < queens.length; c++) {
            if (c > 0) sb.append(' ');
            sb.append(c == queens[r] ? 'Q' : '.');
        }
        return sb.toString();
    }

    public static void main(String[] args) {
        List<int[]> sols = solveNQueens(4);
        System.out.println("n=4: " + sols.size() + " solutions");
        for (int[] s : sols) {
            System.out.println("columns " + Arrays.toString(s));
            for (int r = 0; r < s.length; r++) System.out.println(board(s, r));
        }
        for (int n = 0; n <= 8; n++) System.out.println("n=" + n + ": " + solveNQueens(n).size());
        System.out.println("first solution for n=8: " + Arrays.toString(solveNQueens(8).get(0)));
    }
}`,
          },
          {
            label: `Brute force over permutations vs backtracking: work counted for n = 4..8`,
            code: `import java.util.*;

public class Main {
    // Brute force: try every permutation (one queen per row, all columns different),
    // then check the diagonals. Backtracking: check each queen as it is placed.
    static long checked, bruteFound, placed, btFound;

    static boolean safe(int[] p, int n) {
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                if (Math.abs(p[i] - p[j]) == j - i) return false;   // same diagonal
        return true;
    }

    static void gen(int k, int n, int[] perm, boolean[] used) {
        if (k == n) {
            checked++;
            if (safe(perm, n)) bruteFound++;
            return;
        }
        for (int c = 0; c < n; c++) {
            if (used[c]) continue;
            used[c] = true; perm[k] = c;
            gen(k + 1, n, perm, used);
            used[c] = false;
        }
    }

    static void place(int row, int n, boolean[] cols, boolean[] diag, boolean[] anti) {
        if (row == n) { btFound++; return; }
        for (int c = 0; c < n; c++) {
            if (cols[c] || diag[row - c + n] || anti[row + c]) continue;
            placed++;                                  // one node of the search tree
            cols[c] = diag[row - c + n] = anti[row + c] = true;
            place(row + 1, n, cols, diag, anti);
            cols[c] = diag[row - c + n] = anti[row + c] = false;
        }
    }

    public static void main(String[] args) {
        for (int n = 4; n <= 8; n++) {
            checked = bruteFound = placed = btFound = 0;
            gen(0, n, new int[n], new boolean[n]);
            place(0, n, new boolean[n], new boolean[2 * n], new boolean[2 * n]);
            System.out.println("n=" + n + ": brute force checks " + checked + " full boards, backtracking places "
                + placed + " queens, solutions " + bruteFound + " and " + btFound);
        }
        long all = 1;
        for (int i = 0; i < 8; i++) all *= 8;
        System.out.println("n=8 boards with one queen per row and no rule at all: " + all);
    }
}`,
          },
          {
            label: `N-Queens II: counting solutions for n = 1..12 with bitmasks`,
            code: `public class Main {
    // N-Queens II: count solutions with three bitmasks instead of three sets.
    // Bit c of "cols" is 1 when column c is taken. "d1" and "d2" hold the squares
    // attacked diagonally in the CURRENT row; they shift by one each row.
    static int full;

    static int go(int cols, int d1, int d2) {
        if (cols == full) return 1;                  // n queens placed
        int count = 0;
        int free = full & ~(cols | d1 | d2);         // squares in this row nobody attacks
        while (free != 0) {
            int bit = free & -free;                  // lowest free square (Integer.lowestOneBit)
            free -= bit;
            count += go(cols | bit, ((d1 | bit) << 1) & full, (d2 | bit) >>> 1);
        }
        return count;
    }

    static int totalNQueens(int n) {
        full = (1 << n) - 1;                         // n ones: every column of a row
        return go(0, 0, 0);
    }

    public static void main(String[] args) {
        for (int n = 1; n <= 12; n++) System.out.println("n=" + n + ": " + totalNQueens(n));
        System.out.println("0b" + Integer.toBinaryString(0b10110 & -0b10110));  // 0b10
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Place n queens on an n by n chessboard so that no two attack each other. Write it in C++: return every solution, and then tell me how you would only count them for n up to 12."

**What a strong answer should cover:**
- Place one queen per row, so a solution is a \`vector<int>\` with \`queens[row] = col\`; this turns n² cells into n decisions.
- Backtracking with choose / explore / un-choose, pruning a column as soon as it is attacked.
- O(1) safety checks using three marker arrays: columns, \`r - c + n\` (offset so the index is never negative) and \`r + c\`.
- Complexity: O(n!) upper bound on the search, O(n) extra space plus the output; 92 solutions for n = 8.
- C++ details: pass the markers by reference (passing by value copies them on every call), \`push_back(queens)\` copies, \`vector<bool>\` is a packed special case, and bit tricks belong on \`unsigned\` because \`1 << 31\` on a 32-bit \`int\` overflows.

**Clarifying questions expected:**
- Do you want every board as \`vector<vector<string>>\` or only the number of solutions?
- What range of n should I expect? (It decides whether a bitmask counter is worth it.)

**Code / implementation expected:** Yes — a recursive \`solveNQueens(int n)\` with three marker vectors in C++17, and optionally a bitmask counter.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know recursion in C++ and want to master backtracking.  
**Difficulty:** Hard  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine seating eight very touchy guests at a square banquet table laid out like a chessboard. Each guest refuses to sit in the same row as another guest, in the same column, or anywhere along the same diagonal line. You want to find every seating plan that keeps everyone calm.

You could write down every possible way to put 8 guests on 64 seats and check each one. There are more than four billion of them. Or you could do what a sensible host does: seat the first guest, then seat the second somewhere safe, then the third, and the moment you discover there is **no** safe seat for the next guest, you stand the previous guest back up and try their next option. You never finish a plan that is already ruined.

That sensible host is doing **backtracking**, and the N-Queens puzzle (place n chess queens on an n × n board so no two attack each other) is the classic interview problem for it. It tests three things at once: can you shape a search so most bad options are never generated, can you check "is this square attacked?" in O(1), and can you undo your changes cleanly when you step back.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Return every board, or just the number of solutions? | Boards need copying and string building (LeetCode 51); a count allows the faster bitmask version (LeetCode 52). |
| What output format for a board? | Usually a list of strings such as \`".Q.."\`; agree on it before writing the printing code. |
| How large can n be? | Up to about 12 any backtracking is fine; much larger and you need bitmasks, symmetry, or a different goal (find one solution, not all). |
| Any order required for the solutions? | Trying columns left to right in row order already gives a fixed, sorted-by-row order. |
| What about n = 2 or 3, where no solution exists? | The answer is an empty list or 0, not an error. |

## 3. The Rules and the First Big Simplification

A queen attacks along its row, its column and both diagonals, any distance. So a valid answer has:

- exactly one queen in every **row** (n queens, n rows, at most one per row),
- exactly one queen in every **column** (same argument),
- at most one queen on every diagonal in both directions.

The first insight removes most of the search before we start: **because each row holds exactly one queen, decide row by row.** A solution is then just a list \`queens\` where \`queens[r]\` is the column of the queen in row r. The board below is the solution \`[1, 3, 0, 2]\` for n = 4.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A four by four board with one queen in each row: row 0 column 1, row 1 column 3, row 2 column 0, row 3 column 2. No two queens share a column or a diagonal.">
  <text class="d-sub" x="278" y="38" text-anchor="middle">col 0</text>
  <text class="d-sub" x="334" y="38" text-anchor="middle">col 1</text>
  <text class="d-sub" x="390" y="38" text-anchor="middle">col 2</text>
  <text class="d-sub" x="446" y="38" text-anchor="middle">col 3</text>
  <text class="d-sub" x="204" y="83" text-anchor="middle">row 0</text>
  <rect class="d-box" x="250" y="50" width="56" height="56"/>
  <rect class="d-box-accent" x="306" y="50" width="56" height="56"/>
  <text class="d-text" x="334" y="84" text-anchor="middle">Q</text>
  <rect class="d-box" x="362" y="50" width="56" height="56"/>
  <rect class="d-box-muted" x="418" y="50" width="56" height="56"/>
  <text class="d-sub" x="204" y="139" text-anchor="middle">row 1</text>
  <rect class="d-box-muted" x="250" y="106" width="56" height="56"/>
  <rect class="d-box" x="306" y="106" width="56" height="56"/>
  <rect class="d-box-muted" x="362" y="106" width="56" height="56"/>
  <rect class="d-box-accent" x="418" y="106" width="56" height="56"/>
  <text class="d-text" x="446" y="140" text-anchor="middle">Q</text>
  <text class="d-sub" x="204" y="195" text-anchor="middle">row 2</text>
  <rect class="d-box-accent" x="250" y="162" width="56" height="56"/>
  <text class="d-text" x="278" y="196" text-anchor="middle">Q</text>
  <rect class="d-box-muted" x="306" y="162" width="56" height="56"/>
  <rect class="d-box" x="362" y="162" width="56" height="56"/>
  <rect class="d-box-muted" x="418" y="162" width="56" height="56"/>
  <text class="d-sub" x="204" y="251" text-anchor="middle">row 3</text>
  <rect class="d-box-muted" x="250" y="218" width="56" height="56"/>
  <rect class="d-box" x="306" y="218" width="56" height="56"/>
  <rect class="d-box-accent" x="362" y="218" width="56" height="56"/>
  <text class="d-text" x="390" y="252" text-anchor="middle">Q</text>
  <rect class="d-box" x="418" y="218" width="56" height="56"/>
  <rect class="d-box" x="540" y="110" width="160" height="104" rx="10"/>
  <text class="d-text" x="620" y="142" text-anchor="middle">queens array</text>
  <text class="d-sub" x="620" y="170" text-anchor="middle">[1, 3, 0, 2]</text>
  <text class="d-sub" x="620" y="194" text-anchor="middle">index = row</text>
</svg>

The array index is the row and the value is the column, so "one queen per row" is guaranteed by the shape of the data itself.

📌 **Interview term: State-space search** — exploring a tree whose nodes are partial answers (here: queens placed in the first r rows) and whose children add one more decision.

The output format varies by interviewer. LeetCode's "N-Queens" (problem 51) wants every board as a list of strings like \`".Q.."\`; "N-Queens II" (problem 52) wants only the number of solutions. Both use exactly the same search.

## 4. O(1) Attack Checks with r - c and r + c

When we try column c in row r, we must know whether any earlier queen attacks that square. Scanning all earlier queens costs O(r). The standard trick makes it O(1):

- Every square on the same **main diagonal** (running top-left to bottom-right) has the same value of **r - c**.
- Every square on the same **anti-diagonal** (running top-right to bottom-left) has the same value of **r + c**.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="Two four by four grids. In the left grid each cell shows r minus c and the main diagonal, where r minus c is 0, is highlighted. In the right grid each cell shows r plus c and the anti diagonal where r plus c is 3 is highlighted.">
  <text class="d-text" x="166" y="30" text-anchor="middle">value r - c</text>
  <rect class="d-box-accent" x="70" y="56" width="48" height="48"/>
  <text class="d-sub" x="94" y="86" text-anchor="middle">0</text>
  <rect class="d-box" x="118" y="56" width="48" height="48"/>
  <text class="d-sub" x="142" y="86" text-anchor="middle">-1</text>
  <rect class="d-box" x="166" y="56" width="48" height="48"/>
  <text class="d-sub" x="190" y="86" text-anchor="middle">-2</text>
  <rect class="d-box" x="214" y="56" width="48" height="48"/>
  <text class="d-sub" x="238" y="86" text-anchor="middle">-3</text>
  <rect class="d-box" x="70" y="104" width="48" height="48"/>
  <text class="d-sub" x="94" y="134" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="118" y="104" width="48" height="48"/>
  <text class="d-sub" x="142" y="134" text-anchor="middle">0</text>
  <rect class="d-box" x="166" y="104" width="48" height="48"/>
  <text class="d-sub" x="190" y="134" text-anchor="middle">-1</text>
  <rect class="d-box" x="214" y="104" width="48" height="48"/>
  <text class="d-sub" x="238" y="134" text-anchor="middle">-2</text>
  <rect class="d-box" x="70" y="152" width="48" height="48"/>
  <text class="d-sub" x="94" y="182" text-anchor="middle">2</text>
  <rect class="d-box" x="118" y="152" width="48" height="48"/>
  <text class="d-sub" x="142" y="182" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="166" y="152" width="48" height="48"/>
  <text class="d-sub" x="190" y="182" text-anchor="middle">0</text>
  <rect class="d-box" x="214" y="152" width="48" height="48"/>
  <text class="d-sub" x="238" y="182" text-anchor="middle">-1</text>
  <rect class="d-box" x="70" y="200" width="48" height="48"/>
  <text class="d-sub" x="94" y="230" text-anchor="middle">3</text>
  <rect class="d-box" x="118" y="200" width="48" height="48"/>
  <text class="d-sub" x="142" y="230" text-anchor="middle">2</text>
  <rect class="d-box" x="166" y="200" width="48" height="48"/>
  <text class="d-sub" x="190" y="230" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="214" y="200" width="48" height="48"/>
  <text class="d-sub" x="238" y="230" text-anchor="middle">0</text>
  <text class="d-text" x="526" y="30" text-anchor="middle">value r + c</text>
  <rect class="d-box" x="430" y="56" width="48" height="48"/>
  <text class="d-sub" x="454" y="86" text-anchor="middle">0</text>
  <rect class="d-box" x="478" y="56" width="48" height="48"/>
  <text class="d-sub" x="502" y="86" text-anchor="middle">1</text>
  <rect class="d-box" x="526" y="56" width="48" height="48"/>
  <text class="d-sub" x="550" y="86" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="574" y="56" width="48" height="48"/>
  <text class="d-sub" x="598" y="86" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="104" width="48" height="48"/>
  <text class="d-sub" x="454" y="134" text-anchor="middle">1</text>
  <rect class="d-box" x="478" y="104" width="48" height="48"/>
  <text class="d-sub" x="502" y="134" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="526" y="104" width="48" height="48"/>
  <text class="d-sub" x="550" y="134" text-anchor="middle">3</text>
  <rect class="d-box" x="574" y="104" width="48" height="48"/>
  <text class="d-sub" x="598" y="134" text-anchor="middle">4</text>
  <rect class="d-box" x="430" y="152" width="48" height="48"/>
  <text class="d-sub" x="454" y="182" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="478" y="152" width="48" height="48"/>
  <text class="d-sub" x="502" y="182" text-anchor="middle">3</text>
  <rect class="d-box" x="526" y="152" width="48" height="48"/>
  <text class="d-sub" x="550" y="182" text-anchor="middle">4</text>
  <rect class="d-box" x="574" y="152" width="48" height="48"/>
  <text class="d-sub" x="598" y="182" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="430" y="200" width="48" height="48"/>
  <text class="d-sub" x="454" y="230" text-anchor="middle">3</text>
  <rect class="d-box" x="478" y="200" width="48" height="48"/>
  <text class="d-sub" x="502" y="230" text-anchor="middle">4</text>
  <rect class="d-box" x="526" y="200" width="48" height="48"/>
  <text class="d-sub" x="550" y="230" text-anchor="middle">5</text>
  <rect class="d-box" x="574" y="200" width="48" height="48"/>
  <text class="d-sub" x="598" y="230" text-anchor="middle">6</text>
</svg>

On the left, the highlighted squares all have r - c = 0; on the right, the highlighted squares all have r + c = 3. So we keep three "taken" collections: the set of used columns, the set of used r - c values and the set of used r + c values. A square is safe when its column, its r - c and its r + c are all unused.

📌 **Interview term: Diagonal invariant** — r - c is constant along a main diagonal and r + c is constant along an anti-diagonal, so one number identifies each diagonal. There are 2n - 1 of each.

📌 **Interview term: Constraint propagation (lightweight)** — recording each decision in lookup structures so later checks are O(1) instead of re-scanning the whole board.

## 5. The Backtracking Search

This is a direct use of the [backtracking](/interview-question/what-is-backtracking) template: choose, explore, un-choose.

1. \`place(row)\`: if \`row == n\`, every row has a queen, so record a copy of \`queens\` as a solution.
2. Otherwise, for each column c in this row: if c, r - c or r + c is taken, **skip** it (this is the pruning).
3. Otherwise **choose**: mark the column and both diagonals as taken and put the queen.
4. **Explore**: call \`place(row + 1)\`.
5. **Un-choose**: unmark the three entries and remove the queen, then try the next column.

The tree for n = 4 shows the effect. Every box is a queen that passed the attack check; branches that cannot continue stop immediately.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 450" role="img" aria-label="Search tree for four queens. Starting from an empty board, placing the first queen in column 0 leads to two dead ends. Placing it in column 1 leads straight to the solution 1, 3, 0, 2. Columns 2 and 3 are mirror images of the first two branches.">
  <defs>
    <marker id="b32q1cp-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 380 72 L 160 104" marker-end="url(#b32q1cp-a)"/>
  <path class="d-edge-accent" d="M 380 72 L 450 104" marker-end="url(#b32q1cp-a)"/>
  <path class="d-edge" d="M 380 72 L 660 104" marker-end="url(#b32q1cp-a)"/>
  <path class="d-edge" d="M 160 162 L 75 194" marker-end="url(#b32q1cp-a)"/>
  <path class="d-edge" d="M 160 162 L 245 194" marker-end="url(#b32q1cp-a)"/>
  <path class="d-edge-accent" d="M 450 162 L 450 194" marker-end="url(#b32q1cp-a)"/>
  <path class="d-edge" d="M 75 252 L 75 284" marker-end="url(#b32q1cp-a)"/>
  <path class="d-edge" d="M 245 252 L 245 284" marker-end="url(#b32q1cp-a)"/>
  <path class="d-edge-accent" d="M 450 252 L 450 284" marker-end="url(#b32q1cp-a)"/>
  <path class="d-edge" d="M 245 342 L 245 374" marker-end="url(#b32q1cp-a)"/>
  <path class="d-edge-accent" d="M 450 342 L 450 374" marker-end="url(#b32q1cp-a)"/>
  <rect class="d-box" x="305" y="20" width="150" height="50" rx="8"/>
  <text class="d-text" x="380" y="42" text-anchor="middle">start</text>
  <text class="d-sub" x="380" y="61" text-anchor="middle">empty board</text>
  <rect class="d-box" x="85" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="160" y="141" text-anchor="middle">row 0: col 0</text>
  <rect class="d-box" x="375" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="450" y="141" text-anchor="middle">row 0: col 1</text>
  <rect class="d-box-muted" x="585" y="110" width="150" height="50" rx="8"/>
  <text class="d-text" x="660" y="132" text-anchor="middle">cols 2 and 3</text>
  <text class="d-sub" x="660" y="151" text-anchor="middle">mirror images</text>
  <rect class="d-box" x="0" y="200" width="150" height="50" rx="8"/>
  <text class="d-text" x="75" y="231" text-anchor="middle">row 1: col 2</text>
  <rect class="d-box" x="170" y="200" width="150" height="50" rx="8"/>
  <text class="d-text" x="245" y="231" text-anchor="middle">row 1: col 3</text>
  <rect class="d-box" x="375" y="200" width="150" height="50" rx="8"/>
  <text class="d-text" x="450" y="231" text-anchor="middle">row 1: col 3</text>
  <rect class="d-box-muted" x="0" y="290" width="150" height="50" rx="8"/>
  <text class="d-text" x="75" y="312" text-anchor="middle">dead end</text>
  <text class="d-sub" x="75" y="331" text-anchor="middle">row 2 all attacked</text>
  <rect class="d-box" x="170" y="290" width="150" height="50" rx="8"/>
  <text class="d-text" x="245" y="321" text-anchor="middle">row 2: col 1</text>
  <rect class="d-box" x="375" y="290" width="150" height="50" rx="8"/>
  <text class="d-text" x="450" y="321" text-anchor="middle">row 2: col 0</text>
  <rect class="d-box-muted" x="170" y="380" width="150" height="50" rx="8"/>
  <text class="d-text" x="245" y="402" text-anchor="middle">dead end</text>
  <text class="d-sub" x="245" y="421" text-anchor="middle">row 3 all attacked</text>
  <rect class="d-box-accent" x="375" y="380" width="150" height="50" rx="8"/>
  <text class="d-text" x="450" y="402" text-anchor="middle">row 3: col 2</text>
  <text class="d-sub" x="450" y="421" text-anchor="middle">solution 1, 3, 0, 2</text>
</svg>

The first queen in column 0 leads to two dead ends after only four placements. Column 1 leads straight to a solution. Columns 2 and 3 are the mirror images of columns 1 and 0, and give the second solution \`[2, 0, 3, 1]\`. The whole search for n = 4 places only 16 queens (example 2 counts them).

📌 **Interview term: Pruning** — abandoning a branch as soon as it violates a constraint, so none of the boards below that branch are ever built.

📌 **Interview term: Choose / explore / un-choose** — the three steps of every backtracking function; the un-choose step restores the shared state exactly, so the next sibling starts from a clean slate.

Compare this with the permutation view. One queen per row and one per column means every valid board is a **permutation** of the columns 0..n-1, so a brute force could generate all n! of them (see [generating all permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array)) and check the diagonals at the end. Backtracking does the diagonal check while building, so it never completes a permutation that is already broken.

## 6. The Code in C++

Here is the core of example 1.

~~~cpp
void place(int row, int n, vector<int>& queens, vector<bool>& cols, vector<bool>& diag,
           vector<bool>& anti, vector<vector<int>>& solutions) {
    if (row == n) {                       // every row has a queen
        solutions.push_back(queens);      // push_back copies the vector
        return;
    }
    for (int c = 0; c < n; c++) {
        if (cols[c] || diag[row - c + n] || anti[row + c]) continue;  // prune
        cols[c] = diag[row - c + n] = anti[row + c] = true;
        queens.push_back(c);
        place(row + 1, n, queens, cols, diag, anti, solutions);
        queens.pop_back();
        cols[c] = diag[row - c + n] = anti[row + c] = false;          // undo
    }
}

vector<vector<int>> solveNQueens(int n) {
    vector<vector<int>> solutions;
    vector<int> queens;
    vector<bool> cols(n), diag(2 * n + 1), anti(2 * n + 1);  // r - c + n is never negative
    place(0, n, queens, cols, diag, anti, solutions);
    return solutions;
}
~~~

**What to point out in this code:**

- Every container is passed **by reference** (\`vector<bool>& cols\`). Passing by value would copy all four vectors on every recursive call, adding O(n) work per node and breaking the shared choose/un-choose state.
- \`solutions.push_back(queens)\` copies the vector, which is exactly what we want: \`queens\` keeps changing after this line.
- \`diag\` is indexed by \`row - c + n\`. The raw value \`row - c\` can be negative, and indexing a vector with a negative value is undefined behaviour (there is no bounds check with \`operator[]\`).
- \`vector<bool>\` is a special case in the standard library: it packs bits and returns proxy objects instead of real \`bool&\` references ([cppreference: std::vector&lt;bool&gt;](https://en.cppreference.com/w/cpp/container/vector_bool)). It is fine for simple flags like these; use \`vector<char>\` or \`std::bitset\` if you need real references or speed.
- \`cols[c] = diag[row - c + n] = anti[row + c] = true;\` is a chained assignment; it sets all three.

To return LeetCode's \`vector<vector<string>>\`, start each row as a string of dots:

~~~cpp
vector<string> board(const vector<int>& queens) {
    int n = queens.size();
    vector<string> rows(n, string(n, '.'));
    for (int r = 0; r < n; r++) rows[r][queens[r]] = 'Q';
    return rows;
}
~~~

## 7. Counting Faster with Bitmasks

When only the **number** of solutions is needed, the three arrays can become three \`unsigned\` integers. Bit c of \`cols\` is 1 when column c is taken. The two diagonal masks store which squares of the **current row** are attacked diagonally; moving down one row shifts one mask left and the other right by one bit.

~~~cpp
unsigned full;

int go(unsigned cols, unsigned d1, unsigned d2) {
    if (cols == full) return 1;                  // n queens placed
    int count = 0;
    unsigned free = full & ~(cols | d1 | d2);    // squares in this row nobody attacks
    while (free) {
        unsigned bit = free & (0u - free);       // lowest free square (unsigned: no overflow)
        free -= bit;
        count += go(cols | bit, ((d1 | bit) << 1) & full, (d2 | bit) >> 1);
    }
    return count;
}

int totalNQueens(int n) {
    full = (1u << n) - 1;                        // n ones: every column of a row
    return go(0, 0, 0);
}
~~~

- \`full & ~(cols | d1 | d2)\` gives every safe square in the row in one operation.
- \`free & (0u - free)\` isolates the lowest set bit. On \`unsigned\`, negation is defined to wrap modulo 2³², so this is well-defined; doing the same with signed \`int\` is fine for small values but shifting a 1 into the sign bit (\`1 << 31\`) is the classic signed-overflow trap.
- \`__builtin_ctz(bit)\` would give the column number on GCC and Clang, but it is a compiler extension; the standard \`std::countr_zero\` lives in \`<bit>\` and needs **C++20** (we checked: g++ 13 rejects it with \`-std=c++17\` and accepts it with \`-std=c++20\`).
- \`& full\` after the left shift drops bits that moved past the last column.

📌 **Interview term: Bitmask** — an integer used as a set of small numbers, one bit per element; union is \`|\`, intersection is \`&\`, and the lowest element is \`x & -x\`.

## 8. Verified: Running the Code

Each example was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3). The same three programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — every solution for n = 4 drawn as a board, then the number of solutions for n = 0 to 8** prints:

~~~text
n=4: 2 solutions
columns [1, 3, 0, 2]
. Q . .
. . . Q
Q . . .
. . Q .
columns [2, 0, 3, 1]
. . Q .
Q . . .
. . . Q
. Q . .
n=0: 1
n=1: 1
n=2: 0
n=3: 0
n=4: 2
n=5: 10
n=6: 4
n=7: 40
n=8: 92
first solution for n=8: [0, 4, 7, 5, 2, 6, 1, 3]
~~~

The two boards for n = 4 are mirror images of each other. The counts 1, 0, 0, 2, 10, 4, 40, 92 show the two board sizes with no solution at all (n = 2 and 3), and that the count does not grow smoothly (n = 6 has fewer solutions than n = 5).

**Example 2 — brute force (generate every permutation, check diagonals at the end) against backtracking (check each queen as it is placed)** prints:

~~~text
n=4: brute force checks 24 full boards, backtracking places 16 queens, solutions 2 and 2
n=5: brute force checks 120 full boards, backtracking places 53 queens, solutions 10 and 10
n=6: brute force checks 720 full boards, backtracking places 152 queens, solutions 4 and 4
n=7: brute force checks 5040 full boards, backtracking places 551 queens, solutions 40 and 40
n=8: brute force checks 40320 full boards, backtracking places 2056 queens, solutions 92 and 92
n=8 boards with one queen per row and no rule at all: 16777216
~~~

Both methods find the same solutions, but backtracking places only 2,056 queens for n = 8 while brute force builds and checks 40,320 complete boards, each check costing up to 28 diagonal comparisons. The last line is the number of boards a search that ignored even the column rule would face: 16,777,216 for n = 8.

**Example 3 — counting solutions for n = 1 to 12 with the bitmask version** prints:

~~~text
n=1: 1
n=2: 0
n=3: 0
n=4: 2
n=5: 10
n=6: 4
n=7: 40
n=8: 92
n=9: 352
n=10: 724
n=11: 2680
n=12: 14200
0b10
~~~

The counts match example 1 where they overlap, which is a good way to test an optimised version against a simple one. The last line shows the lowest-set-bit trick on its own.

## 9. Complexity

| Measure | Cost | Why |
| :--- | :--- | :--- |
| Time (search) | O(n!) upper bound | row r has at most n - r free columns, so at most n · (n - 1) · ... · 1 leaves; pruning makes the real count far smaller (2,056 placements for n = 8, against 40,320 permutations) |
| Attack check | O(1) | three lookups: column, r - c, r + c |
| Copying a solution | O(n) each | the \`queens\` array is copied when a solution is found; building string boards costs O(n²) each |
| Extra space | O(n) | three collections of at most n, 2n - 1 and 2n - 1 entries, plus recursion depth n |
| Output space | O(S · n²) for S solution boards | only if every board is returned as strings |

No exact formula is known for the number of solutions, and there is no known polynomial way to count them, which is why interviewers accept the O(n!) bound. See [Big-O notation](/interview-question/what-is-big-o-notation) for how such bounds are read, and [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for the O(n) recursion depth.

## 10. Edge Cases

- **n = 1:** one solution, a single queen.
- **n = 2 and n = 3:** **zero** solutions. The code must return an empty list (or 0), not crash; example 1 prints \`n=2: 0\` and \`n=3: 0\`.
- **n = 0:** the loop records the empty board once, so the code returns 1 solution. LeetCode only asks for 1 ≤ n ≤ 9, so mention this convention rather than rely on it.
- **Recording a solution:** you must store a **copy** of \`queens\`; the array keeps changing as the search backtracks.
- **Symmetry:** every solution reflected left-to-right is another solution. For n = 8 there are 92 solutions but only 12 that are different under rotations and reflections (we checked by brute force). Trying only the left half of the first row and doubling the count is a classic follow-up optimisation; an odd n needs the middle column handled separately.

## 11. Where This Pattern Shows Up Again

N-Queens is the "constraint" member of the backtracking family. Generating [all subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array) and [generating all permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array) enumerate everything with no rule to break; [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem) prunes on a running sum; Sudoku solvers use exactly the N-Queens idea of marker sets for rows, columns and boxes. The base case and the depth of the recursion are covered in [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).

## Common Pitfalls

- **Passing the marker vectors by value.** Each call gets its own copy, the undo step no longer affects the caller, and every node costs O(n) extra.
- **Indexing \`diag[row - c]\` without the \`+ n\` offset.** A negative index is undefined behaviour and may silently corrupt memory instead of crashing.
- **Bit tricks on signed \`int\`.** \`1 << 31\` overflows a 32-bit \`int\`; use \`unsigned\` (or \`uint32_t\`) for every mask.
- **Taking \`bool&\` from a \`vector<bool>\`.** It does not compile, because the elements are packed bits; \`auto&\` gives you a proxy object instead.
- **Forgetting one unmark on the way back.** The search then hides valid boards; check against the counts 2, 10, 4, 40, 92 for n = 4..8.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">One queen per row, so the answer is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queens[row] = col</code>; I decide one row at a time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Search:</strong> <span style="color:#f0e2c8;">Backtracking: for each column, skip it if attacked, otherwise mark, recurse on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">row + 1</code>, and unmark.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. O(1) check:</strong> <span style="color:#f0e2c8;">Three marker arrays: columns, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r - c + n</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r + c</code>, all passed by reference.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n!) upper bound but heavy pruning: 2,056 placements for n = 8 versus 40,320 permutations; O(n) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ care:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back(queens)</code> copies the current solution; for counting only, three <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unsigned</code> bitmasks with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">free &amp; (0u - free)</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">r - c</code> the same along a diagonal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Moving one step down-right adds 1 to both r and c, so the difference does not change. Moving down-left adds 1 to r and subtracts 1 from c, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r + c</code> stays the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unsigned</code> for the bitmasks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unsigned arithmetic wraps by definition, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0u - free</code> and left shifts are well-defined. Signed overflow, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 &lt;&lt; 31</code> on a 32-bit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, is undefined behaviour.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you make it faster for counting only?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: three <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unsigned</code> masks and the lowest-bit trick. It counted 14,200 solutions for n = 12 here. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::bitset</code> is an alternative when n can exceed 64.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the time complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No tight closed form is known. O(n!) is a safe upper bound because row r has at most n - r free columns; pruning makes the real tree much smaller.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you use symmetry?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mirror images of solutions are solutions, so try only the left half of row 0, double the count, and for odd n add the solutions whose first queen is in the middle column.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **State-space search** | Exploring a tree of partial answers, one decision per level |
| **Diagonal invariant** | r - c is constant on a main diagonal, r + c on an anti-diagonal |
| **Constraint propagation (lightweight)** | Recording each decision so later checks are O(1) |
| **Pruning** | Abandoning a branch as soon as it breaks a rule |
| **Choose / explore / un-choose** | The three steps of a backtracking function; the last one restores shared state |
| **Bitmask** | An integer used as a set, one bit per element |

---
**Conclusion:** N-Queens is solved by deciding one row at a time, so a solution is just the column of the queen in each row. Backtracking tries each column, skips it in O(1) when its column, its r - c diagonal or its r + c anti-diagonal is already taken, recurses to the next row, and undoes the marks on the way back. Pruning keeps the search tiny compared with the n! permutations (2,056 placements for n = 8 instead of 40,320 complete boards). In C++ that is three marker vectors passed by reference, \`push_back(queens)\` at the leaves, and \`unsigned\` bitmasks when you only need the count.`,
        examples: [
          {
            label: `All solutions as boards for n = 4, solution counts for n = 0..8`,
            code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

// queens[r] = column of the queen in row r
void place(int row, int n, vector<int>& queens, vector<bool>& cols, vector<bool>& diag,
           vector<bool>& anti, vector<vector<int>>& solutions) {
    if (row == n) {                       // every row has a queen
        solutions.push_back(queens);      // push_back copies the vector
        return;
    }
    for (int c = 0; c < n; c++) {
        if (cols[c] || diag[row - c + n] || anti[row + c]) continue;  // prune
        cols[c] = diag[row - c + n] = anti[row + c] = true;
        queens.push_back(c);
        place(row + 1, n, queens, cols, diag, anti, solutions);
        queens.pop_back();
        cols[c] = diag[row - c + n] = anti[row + c] = false;          // undo
    }
}

vector<vector<int>> solveNQueens(int n) {
    vector<vector<int>> solutions;
    vector<int> queens;
    vector<bool> cols(n), diag(2 * n + 1), anti(2 * n + 1);  // r - c + n is never negative
    place(0, n, queens, cols, diag, anti, solutions);
    return solutions;
}

string fmt(const vector<int>& v) {
    string s = "[";
    for (size_t i = 0; i < v.size(); i++) s += (i ? ", " : "") + to_string(v[i]);
    return s + "]";
}

int main() {
    auto sols = solveNQueens(4);
    cout << "n=4: " << sols.size() << " solutions\\n";
    for (const auto& s : sols) {
        cout << "columns " << fmt(s) << "\\n";
        for (int q : s) {
            string line;
            for (int c = 0; c < (int)s.size(); c++) line += string(c ? " " : "") + (c == q ? "Q" : ".");
            cout << line << "\\n";
        }
    }
    for (int n = 0; n <= 8; n++) cout << "n=" << n << ": " << solveNQueens(n).size() << "\\n";
    cout << "first solution for n=8: " << fmt(solveNQueens(8)[0]) << "\\n";
}`,
          },
          {
            label: `Brute force over permutations vs backtracking: work counted for n = 4..8`,
            code: `#include <algorithm>
#include <cstdlib>
#include <iostream>
#include <numeric>
#include <vector>
using namespace std;

// Brute force: try every permutation (one queen per row, all columns different),
// then check the diagonals. Backtracking: check each queen as it is placed.

bool safe(const vector<int>& p) {
    int n = p.size();
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
            if (abs(p[i] - p[j]) == j - i) return false;   // same diagonal
    return true;
}

long long placed = 0, btFound = 0;

void place(int row, int n, vector<bool>& cols, vector<bool>& diag, vector<bool>& anti) {
    if (row == n) { btFound++; return; }
    for (int c = 0; c < n; c++) {
        if (cols[c] || diag[row - c + n] || anti[row + c]) continue;
        placed++;                                    // one node of the search tree
        cols[c] = diag[row - c + n] = anti[row + c] = true;
        place(row + 1, n, cols, diag, anti);
        cols[c] = diag[row - c + n] = anti[row + c] = false;
    }
}

int main() {
    for (int n = 4; n <= 8; n++) {
        vector<int> perm(n);
        iota(perm.begin(), perm.end(), 0);           // 0, 1, ..., n-1: the smallest permutation
        long long checked = 0, found = 0;
        do {
            checked++;
            if (safe(perm)) found++;
        } while (next_permutation(perm.begin(), perm.end()));

        placed = btFound = 0;
        vector<bool> cols(n), diag(2 * n), anti(2 * n);
        place(0, n, cols, diag, anti);
        cout << "n=" << n << ": brute force checks " << checked << " full boards, backtracking places "
             << placed << " queens, solutions " << found << " and " << btFound << "\\n";
    }
    long long all = 1;
    for (int i = 0; i < 8; i++) all *= 8;
    cout << "n=8 boards with one queen per row and no rule at all: " << all << "\\n";
}`,
          },
          {
            label: `N-Queens II: counting solutions for n = 1..12 with bitmasks`,
            code: `#include <iostream>
#include <string>
using namespace std;

// N-Queens II: count solutions with three bitmasks instead of three sets.
// Bit c of "cols" is 1 when column c is taken. "d1" and "d2" hold the squares
// attacked diagonally in the CURRENT row; they shift by one each row.
unsigned full;

int go(unsigned cols, unsigned d1, unsigned d2) {
    if (cols == full) return 1;                  // n queens placed
    int count = 0;
    unsigned free = full & ~(cols | d1 | d2);    // squares in this row nobody attacks
    while (free) {
        unsigned bit = free & (0u - free);       // lowest free square (unsigned: no overflow)
        free -= bit;
        count += go(cols | bit, ((d1 | bit) << 1) & full, (d2 | bit) >> 1);
    }
    return count;
}

int totalNQueens(int n) {
    full = (1u << n) - 1;                        // n ones: every column of a row
    return go(0, 0, 0);
}

int main() {
    for (int n = 1; n <= 12; n++) cout << "n=" << n << ": " << totalNQueens(n) << "\\n";
    unsigned x = 0b10110, low = x & (0u - x);
    string bits;
    for (unsigned v = low; v; v >>= 1) bits = char('0' + (v & 1)) + bits;
    cout << "0b" << bits << "\\n";                // 0b10
}`,
          },
        ],
      },
    },
  },
  {
    title: `How do you design an LRU cache?`,
    difficulty: "hard",
    seoDescription: `Design an LRU cache: a hash map plus a recency list for O(1) get and put, built-in shortcuts, and LRU vs FIFO hit rates, in Python, JS, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Design an LRU cache class in Python with get(key) and put(key, value), both O(1). When it is full, put must evict the least recently used key. Then tell me what you would change for a real service."

**What a strong answer should cover:**
- LRU definition and the two jobs: O(1) lookup by key and O(1) maintenance of recency order.
- The standard structure: a dict from key to node plus a doubly linked list ordered by recency, with eviction at the old end.
- Both \`get\` and \`put\` count as a use; updating an existing key never evicts; a miss leaves the order alone.
- The Python shortcut \`collections.OrderedDict\` with \`move_to_end(key)\` and \`popitem(last=False)\`, and why a plain dict is awkward (assigning to an existing key does not move it).
- Beyond the coding round: LRU vs FIFO/LFU, thrashing on scans, locks for threads, TTL, and \`functools.lru_cache\` for memoising functions.

**Clarifying questions expected:**
- Is capacity counted in entries or bytes, and can it be 0?
- Does \`put\` on an existing key count as a use?
- Is the cache shared between threads?

**Code / implementation expected:** Yes — an \`LRUCache\` class in Python 3, using \`OrderedDict\` or a hand-written dict plus doubly linked list.`,
        answer: `**Target Audience:** Developers preparing for coding and system design interviews who know maps and classes in Python.  
**Difficulty:** Hard  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a small desk with room for exactly five books, and a huge library down the hall. Fetching a book from the library takes ten minutes; grabbing one from the desk takes a second. When you need a sixth book and the desk is full, one book has to go back to the library. Which one?

A sensible rule: **send back the book you have not touched for the longest time.** The book you opened a minute ago is likely to be needed again soon; the one gathering dust since this morning probably is not. That rule is called **Least Recently Used (LRU)**, and the desk is a **cache**.

Every fast system has a desk like this: the CPU caches memory, the browser caches files, a web server caches database rows, Python caches function results with \`functools.lru_cache\`. The interview question "design an LRU cache" (LeetCode 146) asks you to build the desk with two operations that each take **O(1)** time:

- \`get(key)\`: return the value if it is cached (and mark it as just used), otherwise -1.
- \`put(key, value)\`: insert or update the value (and mark it as just used); if the cache is now over capacity, throw out the least recently used entry.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the capacity, and is it counted in entries or in bytes? | The classic version counts entries. Counting bytes means evicting until enough space is free, possibly several entries. |
| Does \`put\` on an existing key count as a use? | In LeetCode 146 it does: the key becomes the most recent and its value is replaced, with no eviction. |
| What does \`get\` return on a miss? | Usually -1; in a real API \`null\`, \`None\` or an optional. |
| Is a capacity of 0 possible? | If yes, every \`put\` must be a no-op, which naive code gets wrong. |
| Single-threaded or concurrent? | Concurrent access needs a lock (or a sharded design), because even \`get\` changes the order. |
| Do entries also expire after a time (TTL)? | Then you need expiry checks on read, and possibly a second ordering by expiry time. |

## 3. What the Cache Has to Do

An LRU cache needs to answer two different questions quickly:

1. **"Is this key here, and what is its value?"** That is a lookup by key, which is what a hash map does in O(1) on average (see [how a hash table works](/interview-question/how-does-a-hash-table-work)).
2. **"Which entry was used least recently?"** That is an ordering question. Every \`get\` and \`put\` moves one entry to the "most recent" end, and eviction removes from the "least recent" end.

📌 **Interview term: Cache hit / cache miss** — a hit means the key was in the cache; a miss means it was not and the slow source must be asked. The **hit rate** is hits divided by requests.

📌 **Interview term: Eviction policy** — the rule that decides which entry to remove when the cache is full. LRU, FIFO (oldest inserted) and LFU (least frequently used) are the common ones.

📌 **Interview term: Temporal locality** — the tendency of programs to reuse data they used recently. LRU is a bet on temporal locality.

A hash map alone has no notion of "least recent". A list alone can keep the order, but finding a key in it takes O(n). The standard design combines both: the **hash map points directly at a node in a doubly linked list**, and the list is kept in recency order.

<svg class="iq-diagram" width="100%" viewBox="0 0 770 290" role="img" aria-label="A hash map from key to node sits above a doubly linked list: head sentinel, key 7, key 3, key 9, tail sentinel. Each node links to both neighbours. The node next to head is the most recently used and the node next to tail is the least recently used.">
  <defs>
    <marker id="b32q2py-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="170" y="20" width="430" height="70" rx="10"/>
  <text class="d-text" x="385" y="50" text-anchor="middle">hash map: key to node</text>
  <text class="d-sub" x="385" y="74" text-anchor="middle">O(1) jump to any node</text>
  <path class="d-edge-dashed" d="M 225 92 L 225 152" marker-end="url(#b32q2py-a1)"/>
  <path class="d-edge-dashed" d="M 385 92 L 385 152" marker-end="url(#b32q2py-a1)"/>
  <path class="d-edge-dashed" d="M 545 92 L 545 152" marker-end="url(#b32q2py-a1)"/>
  <rect class="d-box-muted" x="20" y="160" width="100" height="60" rx="8"/>
  <text class="d-text" x="70" y="186" text-anchor="middle">head</text>
  <text class="d-sub" x="70" y="208" text-anchor="middle">sentinel</text>
  <rect class="d-box" x="170" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="225" y="186" text-anchor="middle">key 7</text>
  <text class="d-sub" x="225" y="208" text-anchor="middle">value 70</text>
  <rect class="d-box" x="330" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="385" y="186" text-anchor="middle">key 3</text>
  <text class="d-sub" x="385" y="208" text-anchor="middle">value 30</text>
  <rect class="d-box" x="490" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="545" y="186" text-anchor="middle">key 9</text>
  <text class="d-sub" x="545" y="208" text-anchor="middle">value 90</text>
  <rect class="d-box-muted" x="650" y="160" width="100" height="60" rx="8"/>
  <text class="d-text" x="700" y="186" text-anchor="middle">tail</text>
  <text class="d-sub" x="700" y="208" text-anchor="middle">sentinel</text>
  <path class="d-edge" d="M 122 176 L 164 176" marker-end="url(#b32q2py-a1)"/>
  <path class="d-edge" d="M 168 204 L 126 204" marker-end="url(#b32q2py-a1)"/>
  <path class="d-edge" d="M 282 176 L 324 176" marker-end="url(#b32q2py-a1)"/>
  <path class="d-edge" d="M 328 204 L 286 204" marker-end="url(#b32q2py-a1)"/>
  <path class="d-edge" d="M 442 176 L 484 176" marker-end="url(#b32q2py-a1)"/>
  <path class="d-edge" d="M 488 204 L 446 204" marker-end="url(#b32q2py-a1)"/>
  <path class="d-edge" d="M 602 176 L 644 176" marker-end="url(#b32q2py-a1)"/>
  <path class="d-edge" d="M 648 204 L 606 204" marker-end="url(#b32q2py-a1)"/>
  <text class="d-sub" x="225" y="256" text-anchor="middle">most recent</text>
  <text class="d-sub" x="545" y="256" text-anchor="middle">least recent</text>
</svg>

The map gives O(1) access to any node; the list order gives O(1) access to both ends, and because each node knows both neighbours, any node can be cut out and moved to the front in O(1).

📌 **Interview term: Recency list** — a list ordered by last use, most recent at one end and least recent at the other.

📌 **Interview term: Sentinel node** — a dummy node at each end of the list that is never removed, so inserting and unlinking never have to special-case an empty list.

Why it must be **doubly** linked, and why each simpler structure fails, is the whole subject of the companion question [why a doubly linked list plus a hash map](/interview-question/design-an-lru-cache-with-o-1-get-and-put-why-doubly-linked-list-hash-map). Here we focus on the design and on the shortcut every language offers.

## 4. The Two Operations, Step by Step

- **\`get(key)\`**: look the key up in the map. Miss: return -1. Hit: unlink its node, re-insert it at the front, return the value.
- **\`put(key, value)\`**: if the key exists, update the value and move the node to the front. Otherwise create a node at the front and add it to the map; if the size is now above capacity, remove the node at the back **and delete its key from the map**.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Three rows. Before: 7, 3, 9 with 9 least recent. After get 9: 9, 7, 3, because 9 moved to the front. After put 5 on a full cache: 5, 9, 7, because 3 was at the back and was evicted.">
  <defs>
    <marker id="b32q2py-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="120" height="50" rx="8"/>
  <text class="d-text" x="80" y="61" text-anchor="middle">start</text>
  <rect class="d-box" x="200" y="30" width="100" height="50" rx="8"/>
  <text class="d-text" x="250" y="61" text-anchor="middle">key 7</text>
  <path class="d-edge" d="M 302 55 L 344 55" marker-end="url(#b32q2py-a2)"/>
  <rect class="d-box" x="350" y="30" width="100" height="50" rx="8"/>
  <text class="d-text" x="400" y="61" text-anchor="middle">key 3</text>
  <path class="d-edge" d="M 452 55 L 494 55" marker-end="url(#b32q2py-a2)"/>
  <rect class="d-box" x="500" y="30" width="100" height="50" rx="8"/>
  <text class="d-text" x="550" y="61" text-anchor="middle">key 9</text>
  <rect class="d-box-muted" x="20" y="130" width="120" height="50" rx="8"/>
  <text class="d-text" x="80" y="161" text-anchor="middle">get(9)</text>
  <rect class="d-box-accent" x="200" y="130" width="100" height="50" rx="8"/>
  <text class="d-text" x="250" y="161" text-anchor="middle">key 9</text>
  <path class="d-edge" d="M 302 155 L 344 155" marker-end="url(#b32q2py-a2)"/>
  <rect class="d-box" x="350" y="130" width="100" height="50" rx="8"/>
  <text class="d-text" x="400" y="161" text-anchor="middle">key 7</text>
  <path class="d-edge" d="M 452 155 L 494 155" marker-end="url(#b32q2py-a2)"/>
  <rect class="d-box" x="500" y="130" width="100" height="50" rx="8"/>
  <text class="d-text" x="550" y="161" text-anchor="middle">key 3</text>
  <rect class="d-box-muted" x="20" y="230" width="120" height="50" rx="8"/>
  <text class="d-text" x="80" y="261" text-anchor="middle">put(5)</text>
  <rect class="d-box-accent" x="200" y="230" width="100" height="50" rx="8"/>
  <text class="d-text" x="250" y="261" text-anchor="middle">key 5</text>
  <path class="d-edge" d="M 302 255 L 344 255" marker-end="url(#b32q2py-a2)"/>
  <rect class="d-box" x="350" y="230" width="100" height="50" rx="8"/>
  <text class="d-text" x="400" y="261" text-anchor="middle">key 9</text>
  <path class="d-edge" d="M 452 255 L 494 255" marker-end="url(#b32q2py-a2)"/>
  <rect class="d-box" x="500" y="230" width="100" height="50" rx="8"/>
  <text class="d-text" x="550" y="261" text-anchor="middle">key 7</text>
  <rect class="d-box-muted" x="650" y="230" width="90" height="50" rx="8"/>
  <text class="d-sub" x="695" y="252" text-anchor="middle">evicted</text>
  <text class="d-text" x="695" y="272" text-anchor="middle">key 3</text>
</svg>

The first row is the cache after inserting 9, 3 and 7 (7 is the most recent). \`get(9)\` moves 9 to the front. The cache is full at 3 entries, so \`put(5)\` puts 5 at the front and evicts the entry at the back, key 3.

📌 **Interview term: O(1) average case** — hash map operations take constant time on average, not in the worst case (many colliding keys can slow them down), and occasional resizing makes inserts amortised O(1). List relinking is O(1) always. Together, \`get\` and \`put\` are O(1) on average.

## 5. The Quick Build in Python: \`OrderedDict\`

Python's \`collections.OrderedDict\` is a dict that remembers order **and** can reorder cheaply: \`move_to_end(key)\` moves a key to the end, and \`popitem(last=False)\` removes and returns the first item ([Python docs: OrderedDict objects](https://docs.python.org/3/library/collections.html#ordereddict-objects)). With "first = least recent, last = most recent", the whole cache is a few lines:

~~~python
class LRUCache:
    """LRU cache on OrderedDict: first key = least recently used, last = most recent."""

    def __init__(self, capacity):
        self.capacity = capacity
        self.data = OrderedDict()
        self.last_evicted = None

    def get(self, key):
        if key not in self.data:
            return -1
        self.data.move_to_end(key)            # a read is a "use": now most recent
        return self.data[key]

    def put(self, key, value):
        self.last_evicted = None
        if key in self.data:
            self.data.move_to_end(key)        # an update is a use too
        self.data[key] = value
        if len(self.data) > self.capacity:
            self.last_evicted, _ = self.data.popitem(last=False)   # drop the oldest

    def order(self):
        return list(self.data)                # least recent first
~~~

**What to point out in this code:**

- \`move_to_end(key)\` is the "mark as used" step, and it is needed in **both** \`get\` and \`put\`. On our machine it took about 70 ns per call whether the \`OrderedDict\` held a thousand keys or a million, which is what you expect from an O(1) operation.
- In \`put\`, the existing-key case moves the key first and then assigns the new value. Assigning to an existing key of a dict (or \`OrderedDict\`) **keeps its old position**; we checked that \`d[1] = 10\` on \`{1: 1, 2: 2}\` leaves the order \`[1, 2]\`. That is the bug in many plain-dict solutions.
- \`popitem(last=False)\` returns the \`(key, value)\` pair, so we know which key was evicted.
- \`key not in self.data\` uses the hash map, O(1) on average. A \`list\` of keys would make the same test O(n).

**Could a plain \`dict\` do it?** Since Python 3.7 a plain dict also keeps insertion order. You can refresh a key with \`value = d.pop(key); d[key] = value\` and find the oldest with \`next(iter(d))\`. It works, but it is clumsier, and \`OrderedDict\` states the intent. Interviewers often then say "now do it without the library", which is the hand-written version in [why a doubly linked list plus a hash map](/interview-question/design-an-lru-cache-with-o-1-get-and-put-why-doubly-linked-list-hash-map).

If what you actually want is to cache the **results of a function**, Python already has \`functools.lru_cache\`; see [how \`functools.lru_cache\` works](/interview-question/how-does-functools-lru-cache-work) and [how an LRU cache works internally in Python](/interview-question/how-does-an-lru-cache-work-internally).

## 6. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the LeetCode 146 sequence on a capacity-2 cache, plus an update on a full cache and a capacity-1 cache, printing the recency order (least recent first) after every call** prints:

~~~text
capacity 2 (least recent first):
put(1, 1)  order [1]
put(2, 2)  order [1, 2]
get(1) = 1  order [2, 1]
put(3, 3)  evicted 2  order [1, 3]
get(2) = -1  order [1, 3]
put(4, 4)  evicted 1  order [3, 4]
get(1) = -1  order [3, 4]
get(3) = 3  order [4, 3]
get(4) = 4  order [3, 4]
put(3, 30)  order [4, 3]
get(3) = 30  order [4, 3]
capacity 1:
put(1, 1)  order [1]
put(2, 2)  evicted 1  order [2]
get(1) = -1  order [2]
get(2) = 2  order [2]
~~~

Read it against the rules: \`get(1)\` moved 1 to the most-recent end, so \`put(3, 3)\` evicted 2, not 1. \`put(3, 30)\` on a full cache evicted nothing and moved 3 to the end. A miss (\`get(2) = -1\`) left the order unchanged.

**Example 2 — 20,000 requests from one fixed pseudo-random workload, replayed against LRU and FIFO caches of four sizes, then a loop over 11 keys** prints:

~~~text
capacity 20: LRU 29.9%, FIFO 28.4%
capacity 40: LRU 55.6%, FIFO 48.8%
capacity 80: LRU 77.2%, FIFO 65.7%
capacity 160: LRU 79.1%, FIFO 73.9%
loop of 11 keys, capacity 10: LRU hits 0 of 1100
loop of 11 keys, capacity 11: LRU hits 1089 of 1100
~~~

The pseudo-random numbers come from the same small generator (\`seed = seed * 48271 % 2147483647\`) in all four languages, so every language replays exactly the same requests and prints the same percentages.

## 7. LRU Is a Policy Choice, Not Magic

Example 2 replays one deterministic workload against LRU and FIFO caches of several sizes. 80% of the 20,000 requests go to a "hot" group of 40 keys, and that hot group changes every 4,000 requests; the rest go to 5,000 rarely used keys.

| Capacity | LRU hit rate | FIFO hit rate |
| :--- | :--- | :--- |
| 20 | 29.9% | 28.4% |
| 40 | 55.6% | 48.8% |
| 80 | 77.2% | 65.7% |
| 160 | 79.1% | 73.9% |

LRU wins at every size because every hit **refreshes** a hot key, so the cold one-off keys are the ones that fall off the end. FIFO evicts by insertion time, so even the hottest key is thrown out once it becomes the oldest insert, and has to miss again.

The last two lines of example 2 show LRU's weak spot. Requests that loop over 11 keys with a capacity of 10 get **zero** hits out of 1,100: each request evicts exactly the key that is needed next. With capacity 11, 1,089 of the 1,100 requests hit (every request after the first 11).

📌 **Interview term: Cache thrashing** — the working set is slightly larger than the cache, so entries are evicted just before they are needed again and the hit rate collapses. Sequential scans are the classic LRU killer.

| Policy | Evicts | Good at | Weak at |
| :--- | :--- | :--- | :--- |
| LRU | the entry unused for the longest time | recency-heavy workloads; O(1) with map + list | scans and loops slightly bigger than the cache |
| FIFO | the oldest inserted entry | simplicity; a queue and a set | throws out hot entries just because they are old |
| LFU | the least frequently used entry | stable popularity | slow to adapt when popularity shifts; needs frequency buckets for O(1) |

Real systems often approximate LRU. Redis, for example, documents that its LRU eviction is an approximation that samples a few keys and evicts the best candidate among them, rather than keeping an exact list ([Redis docs: key eviction](https://redis.io/docs/latest/develop/reference/eviction/)).

## 8. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`get\` hit | O(1) average | map lookup, then unlink and push to the front (a fixed number of pointer changes) |
| \`get\` miss | O(1) average | one map lookup |
| \`put\` new key | O(1) average | map insert, push to the front, and possibly evict the back node |
| \`put\` existing key | O(1) average | map lookup, update value, move to the front |
| Space | O(capacity) | one map entry and one list node per cached key |

The "average" comes from the hash map; the list part is O(1) in the worst case. The table of [the cost of common operations on arrays, hash maps and trees](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance) has the background.

## 9. What Changes for a Real Service

- **Threads.** \`get\` mutates the order, so every operation is a write. The GIL does not make "check, then move" atomic; wrap each method body in a \`threading.Lock\` (\`with self.lock:\`), or shard into several caches with one lock each.
- **TTL (time to live).** Store \`(value, expires_at)\` and treat an expired entry as a miss on \`get\`. Expired entries still use space until they are evicted or swept.
- **Size in bytes.** Keep a running total and evict from the old end in a loop until the new entry fits.
- **Memoising a function** is a different API: \`@functools.lru_cache(maxsize=128)\` wraps the function and keys the cache by its arguments.
- **Many processes or machines** need a shared cache server such as Redis, which uses an approximated LRU as described above.

## 10. Edge Cases

- **Capacity 1:** every new key evicts the previous one (example 1, second part: \`put(2, 2)\` evicts 1).
- **Updating an existing key on a full cache:** no eviction, the key just moves to the front with its new value (\`put(3, 30)\` in example 1).
- **\`get\` on a miss must not change the order** (\`get(2) = -1\` leaves \`[1, 3]\` unchanged).
- **Capacity 0:** decide with the interviewer; a correct implementation stores nothing. Code that inserts first and evicts after works; code that evicts "the back node" of an empty list crashes.
- **Eviction must remove the key from the map too,** or the map keeps growing and later \`get\`s return a value that is no longer in the list.

## 11. Related Designs

The same "hash map plus an auxiliary structure" idea shows up in other design questions: the [min stack](/interview-question/how-do-you-design-a-min-stack-with-o-1-getmin) pairs a stack with a running minimum, and [Design Twitter](/interview-question/design-twitter-feed-how-do-you-fan-out-with-heap-hash-for-timeline) pairs hash maps with a heap (and suggests caching feeds in an LRU). The structural trade-offs between the pieces are in [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).

## Common Pitfalls

- **Updating with \`self.data[key] = value\` and no \`move_to_end\`.** The value changes but the key stays in its old position, so a just-updated key can be evicted next.
- **Forgetting \`move_to_end\` in \`get\`.** The cache silently becomes FIFO; example 2 shows FIFO losing up to 11.5 percentage points of hit rate.
- **Using \`popitem()\` with no argument.** It defaults to \`last=True\` and evicts the **most** recent key, the exact opposite of LRU.
- **Evicting before inserting a new key without checking that the key is new.** An update of an existing key on a full cache must not evict anything.
- **Keeping keys in a \`list\` for order.** \`list.remove(key)\` is O(n), which turns the O(1) design into O(capacity) per operation.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Evict the entry that has gone unused longest; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code> both count as a use and must be O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Structure:</strong> <span style="color:#f0e2c8;">Hash map from key to node plus a doubly linked list in recency order: map for lookup, list for order, eviction at the old end.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Python:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OrderedDict</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">move_to_end(key)</code> on every hit or update, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popitem(last=False)</code> to evict the oldest.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edge cases:</strong> <span style="color:#f0e2c8;">Update on a full cache does not evict; a miss does not reorder; capacity 1 evicts on every new key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Beyond:</strong> <span style="color:#f0e2c8;">LRU beat FIFO in my simulation (77.2% vs 65.7% at capacity 80) but thrashes on loops; add a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Lock</code> for threads, TTL if data goes stale.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it without <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">OrderedDict</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: a dict from key to a node with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>, two sentinel nodes, and helpers to unlink and push to the front. Each operation changes at most six pointers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a heap ordered by last-use time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> would change a priority, which is O(log n) at best and needs a way to find the entry in the heap; the list does the same move in O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is your cache thread-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Even <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> changes the order. I would guard each method with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">threading.Lock</code>; the GIL alone does not make the compound check-and-move atomic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">functools.lru_cache</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lru_cache</code> memoises a function, keyed by its arguments, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxsize</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache_info()</code>. My class is a general key-value store with an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is LRU a bad choice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On scans or loops slightly larger than the cache: 11 keys in a loop with capacity 10 gave zero hits. LFU or a scan-resistant policy does better there.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cache hit / cache miss** | The key was in the cache / it was not; hit rate = hits divided by requests |
| **Eviction policy** | The rule for which entry to remove when full: LRU, FIFO, LFU |
| **Temporal locality** | Recently used data tends to be used again soon |
| **Recency list** | A list ordered by last use, most recent at one end |
| **Sentinel node** | A dummy node at each end of the list so inserts and removals need no special cases |
| **O(1) average case** | Constant time on average, though not guaranteed in the worst case, as with hash maps |
| **Cache thrashing** | Entries are evicted just before they are needed again, so the hit rate collapses |

---
**Conclusion:** An LRU cache answers two questions in O(1): "where is this key?" with a hash map, and "which entry is the oldest?" with a list kept in recency order, where every \`get\` and \`put\` moves its entry to the most-recent end and eviction removes from the other end. In Python, \`OrderedDict\` with \`move_to_end\` and \`popitem(last=False)\` is the idiomatic build; be ready to write the doubly linked list by hand, to explain that an update never evicts and a miss never reorders, and to discuss when LRU loses (loops just larger than the cache) and what a real service adds: locks, TTL and size limits.`,
        examples: [
          {
            label: `LRU trace: every get and put, with the eviction and the recency order`,
            code: `from collections import OrderedDict


class LRUCache:
    """LRU cache on OrderedDict: first key = least recently used, last = most recent."""

    def __init__(self, capacity):
        self.capacity = capacity
        self.data = OrderedDict()
        self.last_evicted = None

    def get(self, key):
        if key not in self.data:
            return -1
        self.data.move_to_end(key)            # a read is a "use": now most recent
        return self.data[key]

    def put(self, key, value):
        self.last_evicted = None
        if key in self.data:
            self.data.move_to_end(key)        # an update is a use too
        self.data[key] = value
        if len(self.data) > self.capacity:
            self.last_evicted, _ = self.data.popitem(last=False)   # drop the oldest

    def order(self):
        return list(self.data)                # least recent first


def run(cache, ops):
    for op in ops:
        if op[0] == "get":
            print("get(" + str(op[1]) + ") = " + str(cache.get(op[1])) + "  order " + str(cache.order()))
        else:
            cache.put(op[1], op[2])
            note = "" if cache.last_evicted is None else "  evicted " + str(cache.last_evicted)
            print("put(" + str(op[1]) + ", " + str(op[2]) + ")" + note + "  order " + str(cache.order()))


print("capacity 2 (least recent first):")
run(LRUCache(2), [("put", 1, 1), ("put", 2, 2), ("get", 1), ("put", 3, 3), ("get", 2),
                  ("put", 4, 4), ("get", 1), ("get", 3), ("get", 4), ("put", 3, 30), ("get", 3)])
print("capacity 1:")
run(LRUCache(1), [("put", 1, 1), ("put", 2, 2), ("get", 1), ("get", 2)])`,
          },
          {
            label: `Hit rate on one workload: LRU vs FIFO, and the loop that defeats LRU`,
            code: `from collections import OrderedDict, deque

# Deterministic pseudo-random numbers (MINSTD), identical in all four languages.
seed = 42
def rand():
    global seed
    seed = seed * 48271 % 2147483647
    return seed

# 20,000 requests: 80% go to a "hot" set of 40 keys that drifts every 4,000
# requests; 20% go to 5,000 rarely used keys.
requests = []
for i in range(20000):
    phase = i // 4000
    if rand() % 100 < 80:
        requests.append(phase * 40 + rand() % 40)
    else:
        requests.append(100000 + rand() % 5000)

def lru_hits(reqs, capacity):
    cache, hits = OrderedDict(), 0
    for k in reqs:
        if k in cache:
            hits += 1
            cache.move_to_end(k)              # refresh on every hit
        else:
            cache[k] = True
            if len(cache) > capacity:
                cache.popitem(last=False)     # evict least recently used
    return hits

def fifo_hits(reqs, capacity):
    cache, queue, hits = set(), deque(), 0
    for k in reqs:
        if k in cache:
            hits += 1                         # a hit does NOT change the order
        else:
            cache.add(k); queue.append(k)
            if len(queue) > capacity:
                cache.discard(queue.popleft())    # evict the oldest INSERTED key
    return hits

def pct(hits, total):
    t = hits * 1000 // total                  # integer math: same digits everywhere
    return str(t // 10) + "." + str(t % 10) + "%"

for cap in [20, 40, 80, 160]:
    print("capacity " + str(cap) + ": LRU " + pct(lru_hits(requests, cap), len(requests))
          + ", FIFO " + pct(fifo_hits(requests, cap), len(requests)))

loop = [i % 11 for i in range(1100)]          # 11 keys in a loop, cache holds 10
print("loop of 11 keys, capacity 10: LRU hits " + str(lru_hits(loop, 10)) + " of " + str(len(loop)))
print("loop of 11 keys, capacity 11: LRU hits " + str(lru_hits(loop, 11)) + " of " + str(len(loop)))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Design an LRU cache class in JavaScript with get(key) and put(key, value), both O(1). When it is full, put must evict the least recently used key. Then tell me what you would change for a real service."

**What a strong answer should cover:**
- LRU definition and the two jobs: O(1) lookup by key and O(1) maintenance of recency order.
- The standard structure: a \`Map\` from key to node plus a doubly linked list ordered by recency, with eviction at the old end.
- Both \`get\` and \`put\` count as a use; updating an existing key never evicts; a miss leaves the order alone.
- The JavaScript shortcut: a \`Map\` iterates in insertion order, so delete-and-set refreshes a key and \`map.keys().next().value\` is the oldest; \`map.set\` on an existing key does **not** move it.
- Why not a plain object (integer-like keys are iterated in numeric order, keys become strings), plus LRU vs FIFO/LFU, thrashing, TTL and memoisation.

**Clarifying questions expected:**
- Is capacity counted in entries or bytes, and can it be 0?
- Does \`put\` on an existing key count as a use?
- Are keys always strings or numbers, or any value?

**Code / implementation expected:** Yes — an \`LRUCache\` class in JavaScript, using a \`Map\` or a hand-written \`Map\` plus doubly linked list.`,
        answer: `**Target Audience:** Developers preparing for coding and system design interviews who know maps and classes in JavaScript.  
**Difficulty:** Hard  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a small desk with room for exactly five books, and a huge library down the hall. Fetching a book from the library takes ten minutes; grabbing one from the desk takes a second. When you need a sixth book and the desk is full, one book has to go back to the library. Which one?

A sensible rule: **send back the book you have not touched for the longest time.** The book you opened a minute ago is likely to be needed again soon; the one gathering dust since this morning probably is not. That rule is called **Least Recently Used (LRU)**, and the desk is a **cache**.

Every fast system has a desk like this: the CPU caches memory, the browser caches files, a web server caches database rows, Python caches function results with \`functools.lru_cache\`. The interview question "design an LRU cache" (LeetCode 146) asks you to build the desk with two operations that each take **O(1)** time:

- \`get(key)\`: return the value if it is cached (and mark it as just used), otherwise -1.
- \`put(key, value)\`: insert or update the value (and mark it as just used); if the cache is now over capacity, throw out the least recently used entry.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the capacity, and is it counted in entries or in bytes? | The classic version counts entries. Counting bytes means evicting until enough space is free, possibly several entries. |
| Does \`put\` on an existing key count as a use? | In LeetCode 146 it does: the key becomes the most recent and its value is replaced, with no eviction. |
| What does \`get\` return on a miss? | Usually -1; in a real API \`null\`, \`None\` or an optional. |
| Is a capacity of 0 possible? | If yes, every \`put\` must be a no-op, which naive code gets wrong. |
| Single-threaded or concurrent? | Concurrent access needs a lock (or a sharded design), because even \`get\` changes the order. |
| Do entries also expire after a time (TTL)? | Then you need expiry checks on read, and possibly a second ordering by expiry time. |

## 3. What the Cache Has to Do

An LRU cache needs to answer two different questions quickly:

1. **"Is this key here, and what is its value?"** That is a lookup by key, which is what a hash map does in O(1) on average (see [how a hash table works](/interview-question/how-does-a-hash-table-work)).
2. **"Which entry was used least recently?"** That is an ordering question. Every \`get\` and \`put\` moves one entry to the "most recent" end, and eviction removes from the "least recent" end.

📌 **Interview term: Cache hit / cache miss** — a hit means the key was in the cache; a miss means it was not and the slow source must be asked. The **hit rate** is hits divided by requests.

📌 **Interview term: Eviction policy** — the rule that decides which entry to remove when the cache is full. LRU, FIFO (oldest inserted) and LFU (least frequently used) are the common ones.

📌 **Interview term: Temporal locality** — the tendency of programs to reuse data they used recently. LRU is a bet on temporal locality.

A hash map alone has no notion of "least recent". A list alone can keep the order, but finding a key in it takes O(n). The standard design combines both: the **hash map points directly at a node in a doubly linked list**, and the list is kept in recency order.

<svg class="iq-diagram" width="100%" viewBox="0 0 770 290" role="img" aria-label="A hash map from key to node sits above a doubly linked list: head sentinel, key 7, key 3, key 9, tail sentinel. Each node links to both neighbours. The node next to head is the most recently used and the node next to tail is the least recently used.">
  <defs>
    <marker id="b32q2ja-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="170" y="20" width="430" height="70" rx="10"/>
  <text class="d-text" x="385" y="50" text-anchor="middle">hash map: key to node</text>
  <text class="d-sub" x="385" y="74" text-anchor="middle">O(1) jump to any node</text>
  <path class="d-edge-dashed" d="M 225 92 L 225 152" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge-dashed" d="M 385 92 L 385 152" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge-dashed" d="M 545 92 L 545 152" marker-end="url(#b32q2ja-a1)"/>
  <rect class="d-box-muted" x="20" y="160" width="100" height="60" rx="8"/>
  <text class="d-text" x="70" y="186" text-anchor="middle">head</text>
  <text class="d-sub" x="70" y="208" text-anchor="middle">sentinel</text>
  <rect class="d-box" x="170" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="225" y="186" text-anchor="middle">key 7</text>
  <text class="d-sub" x="225" y="208" text-anchor="middle">value 70</text>
  <rect class="d-box" x="330" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="385" y="186" text-anchor="middle">key 3</text>
  <text class="d-sub" x="385" y="208" text-anchor="middle">value 30</text>
  <rect class="d-box" x="490" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="545" y="186" text-anchor="middle">key 9</text>
  <text class="d-sub" x="545" y="208" text-anchor="middle">value 90</text>
  <rect class="d-box-muted" x="650" y="160" width="100" height="60" rx="8"/>
  <text class="d-text" x="700" y="186" text-anchor="middle">tail</text>
  <text class="d-sub" x="700" y="208" text-anchor="middle">sentinel</text>
  <path class="d-edge" d="M 122 176 L 164 176" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge" d="M 168 204 L 126 204" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge" d="M 282 176 L 324 176" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge" d="M 328 204 L 286 204" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge" d="M 442 176 L 484 176" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge" d="M 488 204 L 446 204" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge" d="M 602 176 L 644 176" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge" d="M 648 204 L 606 204" marker-end="url(#b32q2ja-a1)"/>
  <text class="d-sub" x="225" y="256" text-anchor="middle">most recent</text>
  <text class="d-sub" x="545" y="256" text-anchor="middle">least recent</text>
</svg>

The map gives O(1) access to any node; the list order gives O(1) access to both ends, and because each node knows both neighbours, any node can be cut out and moved to the front in O(1).

📌 **Interview term: Recency list** — a list ordered by last use, most recent at one end and least recent at the other.

📌 **Interview term: Sentinel node** — a dummy node at each end of the list that is never removed, so inserting and unlinking never have to special-case an empty list.

Why it must be **doubly** linked, and why each simpler structure fails, is the whole subject of the companion question [why a doubly linked list plus a hash map](/interview-question/design-an-lru-cache-with-o-1-get-and-put-why-doubly-linked-list-hash-map). Here we focus on the design and on the shortcut every language offers.

## 4. The Two Operations, Step by Step

- **\`get(key)\`**: look the key up in the map. Miss: return -1. Hit: unlink its node, re-insert it at the front, return the value.
- **\`put(key, value)\`**: if the key exists, update the value and move the node to the front. Otherwise create a node at the front and add it to the map; if the size is now above capacity, remove the node at the back **and delete its key from the map**.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Three rows. Before: 7, 3, 9 with 9 least recent. After get 9: 9, 7, 3, because 9 moved to the front. After put 5 on a full cache: 5, 9, 7, because 3 was at the back and was evicted.">
  <defs>
    <marker id="b32q2ja-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="120" height="50" rx="8"/>
  <text class="d-text" x="80" y="61" text-anchor="middle">start</text>
  <rect class="d-box" x="200" y="30" width="100" height="50" rx="8"/>
  <text class="d-text" x="250" y="61" text-anchor="middle">key 7</text>
  <path class="d-edge" d="M 302 55 L 344 55" marker-end="url(#b32q2ja-a2)"/>
  <rect class="d-box" x="350" y="30" width="100" height="50" rx="8"/>
  <text class="d-text" x="400" y="61" text-anchor="middle">key 3</text>
  <path class="d-edge" d="M 452 55 L 494 55" marker-end="url(#b32q2ja-a2)"/>
  <rect class="d-box" x="500" y="30" width="100" height="50" rx="8"/>
  <text class="d-text" x="550" y="61" text-anchor="middle">key 9</text>
  <rect class="d-box-muted" x="20" y="130" width="120" height="50" rx="8"/>
  <text class="d-text" x="80" y="161" text-anchor="middle">get(9)</text>
  <rect class="d-box-accent" x="200" y="130" width="100" height="50" rx="8"/>
  <text class="d-text" x="250" y="161" text-anchor="middle">key 9</text>
  <path class="d-edge" d="M 302 155 L 344 155" marker-end="url(#b32q2ja-a2)"/>
  <rect class="d-box" x="350" y="130" width="100" height="50" rx="8"/>
  <text class="d-text" x="400" y="161" text-anchor="middle">key 7</text>
  <path class="d-edge" d="M 452 155 L 494 155" marker-end="url(#b32q2ja-a2)"/>
  <rect class="d-box" x="500" y="130" width="100" height="50" rx="8"/>
  <text class="d-text" x="550" y="161" text-anchor="middle">key 3</text>
  <rect class="d-box-muted" x="20" y="230" width="120" height="50" rx="8"/>
  <text class="d-text" x="80" y="261" text-anchor="middle">put(5)</text>
  <rect class="d-box-accent" x="200" y="230" width="100" height="50" rx="8"/>
  <text class="d-text" x="250" y="261" text-anchor="middle">key 5</text>
  <path class="d-edge" d="M 302 255 L 344 255" marker-end="url(#b32q2ja-a2)"/>
  <rect class="d-box" x="350" y="230" width="100" height="50" rx="8"/>
  <text class="d-text" x="400" y="261" text-anchor="middle">key 9</text>
  <path class="d-edge" d="M 452 255 L 494 255" marker-end="url(#b32q2ja-a2)"/>
  <rect class="d-box" x="500" y="230" width="100" height="50" rx="8"/>
  <text class="d-text" x="550" y="261" text-anchor="middle">key 7</text>
  <rect class="d-box-muted" x="650" y="230" width="90" height="50" rx="8"/>
  <text class="d-sub" x="695" y="252" text-anchor="middle">evicted</text>
  <text class="d-text" x="695" y="272" text-anchor="middle">key 3</text>
</svg>

The first row is the cache after inserting 9, 3 and 7 (7 is the most recent). \`get(9)\` moves 9 to the front. The cache is full at 3 entries, so \`put(5)\` puts 5 at the front and evicts the entry at the back, key 3.

📌 **Interview term: O(1) average case** — hash map operations take constant time on average, not in the worst case (many colliding keys can slow them down), and occasional resizing makes inserts amortised O(1). List relinking is O(1) always. Together, \`get\` and \`put\` are O(1) on average.

## 5. The Quick Build in JavaScript: \`Map\` Order

A JavaScript \`Map\` iterates its keys **in insertion order** ([MDN: Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)). So if "first key = least recent", refreshing a key means deleting it and setting it again, and the eviction victim is the first key the iterator yields:

~~~javascript
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.data = new Map();
    this.lastEvicted = null;
  }

  get(key) {
    if (!this.data.has(key)) return -1;
    const value = this.data.get(key);
    this.data.delete(key);                 // re-insert: now the most recent
    this.data.set(key, value);
    return value;
  }

  put(key, value) {
    this.lastEvicted = null;
    if (this.data.has(key)) this.data.delete(key);   // an update is a use too
    this.data.set(key, value);
    if (this.data.size > this.capacity) {
      const oldest = this.data.keys().next().value;  // first key in iteration order
      this.data.delete(oldest);
      this.lastEvicted = oldest;
    }
  }

  // order() prints the keys, least recent first
}
~~~

**What to point out in this code:**

- \`this.data.delete(key); this.data.set(key, value)\` is the "mark as used" step. It is needed in **both** \`get\` and \`put\`.
- \`map.set(key, v)\` on a key that already exists **keeps its old position**. We checked: setting key 1 again on a map \`[1, 2]\` leaves the order \`1,2\`. That is why \`put\` deletes first.
- \`this.data.keys().next().value\` reads the first key without copying the whole key list (\`Array.from(map.keys())[0]\` would be O(n)).
- \`Map\` keys can be any value and compare with SameValueZero, so \`1\` and \`"1"\` are different keys and \`NaN\` works as a key.
- The ECMAScript specification requires \`Map\` to give access times that are sublinear on average in the number of entries, typically via hash tables ([ECMA-262: Map objects](https://tc39.es/ecma262/multipage/keyed-collections.html)); it does not literally promise O(1). A hand-written doubly linked list ([why a doubly linked list plus a hash map](/interview-question/design-an-lru-cache-with-o-1-get-and-put-why-doubly-linked-list-hash-map)) makes the O(1) relinking explicit, which is what interviewers usually want to see.

**Why not a plain object?** An object does not keep pure insertion order: integer-like keys come first in ascending numeric order. We checked that inserting \`b\`, \`2\`, \`1\`, \`a\` gives \`Object.keys\` order \`1,2,b,a\`. Object keys are also always strings. See also [Implement LRU Cache (get/put with O(1))](/interview-question/implement-lru-cache-get-put-with-o-1) and [memoize with a cache limit](/interview-question/implement-memoize-with-custom-resolver-and-cache-limit) on this site.

## 6. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22; the same scripts also run in the page, since they use only \`console.log\`). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the LeetCode 146 sequence on a capacity-2 cache, plus an update on a full cache and a capacity-1 cache, printing the recency order (least recent first) after every call** prints:

~~~text
capacity 2 (least recent first):
put(1, 1)  order [1]
put(2, 2)  order [1, 2]
get(1) = 1  order [2, 1]
put(3, 3)  evicted 2  order [1, 3]
get(2) = -1  order [1, 3]
put(4, 4)  evicted 1  order [3, 4]
get(1) = -1  order [3, 4]
get(3) = 3  order [4, 3]
get(4) = 4  order [3, 4]
put(3, 30)  order [4, 3]
get(3) = 30  order [4, 3]
capacity 1:
put(1, 1)  order [1]
put(2, 2)  evicted 1  order [2]
get(1) = -1  order [2]
get(2) = 2  order [2]
~~~

Read it against the rules: \`get(1)\` moved 1 to the most-recent end, so \`put(3, 3)\` evicted 2, not 1. \`put(3, 30)\` on a full cache evicted nothing and moved 3 to the end. A miss (\`get(2) = -1\`) left the order unchanged.

**Example 2 — 20,000 requests from one fixed pseudo-random workload, replayed against LRU and FIFO caches of four sizes, then a loop over 11 keys** prints:

~~~text
capacity 20: LRU 29.9%, FIFO 28.4%
capacity 40: LRU 55.6%, FIFO 48.8%
capacity 80: LRU 77.2%, FIFO 65.7%
capacity 160: LRU 79.1%, FIFO 73.9%
loop of 11 keys, capacity 10: LRU hits 0 of 1100
loop of 11 keys, capacity 11: LRU hits 1089 of 1100
~~~

The pseudo-random numbers come from the same small generator (\`seed = seed * 48271 % 2147483647\`) in all four languages, so every language replays exactly the same requests and prints the same percentages.

## 7. LRU Is a Policy Choice, Not Magic

Example 2 replays one deterministic workload against LRU and FIFO caches of several sizes. 80% of the 20,000 requests go to a "hot" group of 40 keys, and that hot group changes every 4,000 requests; the rest go to 5,000 rarely used keys.

| Capacity | LRU hit rate | FIFO hit rate |
| :--- | :--- | :--- |
| 20 | 29.9% | 28.4% |
| 40 | 55.6% | 48.8% |
| 80 | 77.2% | 65.7% |
| 160 | 79.1% | 73.9% |

LRU wins at every size because every hit **refreshes** a hot key, so the cold one-off keys are the ones that fall off the end. FIFO evicts by insertion time, so even the hottest key is thrown out once it becomes the oldest insert, and has to miss again.

The last two lines of example 2 show LRU's weak spot. Requests that loop over 11 keys with a capacity of 10 get **zero** hits out of 1,100: each request evicts exactly the key that is needed next. With capacity 11, 1,089 of the 1,100 requests hit (every request after the first 11).

📌 **Interview term: Cache thrashing** — the working set is slightly larger than the cache, so entries are evicted just before they are needed again and the hit rate collapses. Sequential scans are the classic LRU killer.

| Policy | Evicts | Good at | Weak at |
| :--- | :--- | :--- | :--- |
| LRU | the entry unused for the longest time | recency-heavy workloads; O(1) with map + list | scans and loops slightly bigger than the cache |
| FIFO | the oldest inserted entry | simplicity; a queue and a set | throws out hot entries just because they are old |
| LFU | the least frequently used entry | stable popularity | slow to adapt when popularity shifts; needs frequency buckets for O(1) |

Real systems often approximate LRU. Redis, for example, documents that its LRU eviction is an approximation that samples a few keys and evicts the best candidate among them, rather than keeping an exact list ([Redis docs: key eviction](https://redis.io/docs/latest/develop/reference/eviction/)).

## 8. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`get\` hit | O(1) average | map lookup, then unlink and push to the front (a fixed number of pointer changes) |
| \`get\` miss | O(1) average | one map lookup |
| \`put\` new key | O(1) average | map insert, push to the front, and possibly evict the back node |
| \`put\` existing key | O(1) average | map lookup, update value, move to the front |
| Space | O(capacity) | one map entry and one list node per cached key |

The "average" comes from the hash map; the list part is O(1) in the worst case. The table of [the cost of common operations on arrays, hash maps and trees](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance) has the background.

## 9. What Changes for a Real Service

- **Concurrency.** A single JavaScript thread never runs two methods at once, so no lock is needed inside one process. But an \`async\` function that awaits between "check the cache" and "fill the cache" can let two requests miss and both fetch; store the in-flight \`Promise\` in the cache to share it.
- **TTL (time to live).** Store \`{ value, expiresAt }\` and treat an expired entry as a miss on \`get\`; see [an in-memory key-value store with TTL expiry](/interview-question/design-a-simple-in-memory-key-value-store-with-ttl-expiry-mini-redis).
- **Size in bytes.** Keep a running total and evict from the old end in a loop until the new entry fits.
- **Other policies.** LFU needs frequency buckets for O(1); see [LFU cache frequency counters](/interview-question/lfu-cache-frequency-counters).
- **Many processes or machines** need a shared cache server such as Redis, which uses an approximated LRU as described above.

## 10. Edge Cases

- **Capacity 1:** every new key evicts the previous one (example 1, second part: \`put(2, 2)\` evicts 1).
- **Updating an existing key on a full cache:** no eviction, the key just moves to the front with its new value (\`put(3, 30)\` in example 1).
- **\`get\` on a miss must not change the order** (\`get(2) = -1\` leaves \`[1, 3]\` unchanged).
- **Capacity 0:** decide with the interviewer; a correct implementation stores nothing. Code that inserts first and evicts after works; code that evicts "the back node" of an empty list crashes.
- **Eviction must remove the key from the map too,** or the map keeps growing and later \`get\`s return a value that is no longer in the list.

## 11. Related Designs

The same "hash map plus an auxiliary structure" idea shows up in other design questions: the [min stack](/interview-question/how-do-you-design-a-min-stack-with-o-1-getmin) pairs a stack with a running minimum, and [Design Twitter](/interview-question/design-twitter-feed-how-do-you-fan-out-with-heap-hash-for-timeline) pairs hash maps with a heap (and suggests caching feeds in an LRU). The structural trade-offs between the pieces are in [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).

## Common Pitfalls

- **\`this.data.set(key, value)\` for an update with no delete.** The value changes but the key keeps its old position, so a just-updated key can be evicted next.
- **Forgetting to refresh in \`get\`.** The cache silently becomes FIFO; example 2 shows FIFO losing up to 11.5 percentage points of hit rate.
- **Finding the oldest key with \`[...map.keys()][0]\`.** That copies every key: O(n) per eviction. Use \`map.keys().next().value\`.
- **Using a plain object.** Integer-like keys are iterated in numeric order, not insertion order, so the "oldest" key is wrong.
- **Checking \`if (this.data.get(key))\` for presence.** A cached \`0\`, \`''\` or \`false\` is falsy and looks like a miss; use \`has\` or compare with \`undefined\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Evict the entry that has gone unused longest; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code> both count as a use and must be O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Structure:</strong> <span style="color:#f0e2c8;">Hash map from key to node plus a doubly linked list in recency order: map for lookup, list for order, eviction at the old end.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. JavaScript:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> keeps insertion order: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> to refresh, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keys().next().value</code> is the oldest key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edge cases:</strong> <span style="color:#f0e2c8;">Update on a full cache does not evict; a miss does not reorder; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> alone does not move an existing key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Beyond:</strong> <span style="color:#f0e2c8;">LRU beat FIFO in my simulation (77.2% vs 65.7% at capacity 80) but thrashes on loops; add TTL if data goes stale, cache in-flight promises.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it without relying on <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from key to a node object with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>, two sentinel nodes, and helpers to unlink and push to the front. Each operation changes at most six pointers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a plain object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Integer-like keys are iterated in ascending numeric order before string keys, and every key is turned into a string, so the insertion order trick breaks.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> really O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The spec only requires sublinear average access, normally a hash table. In practice it behaves like O(1) on average; the hand-written list makes the O(1) reordering explicit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a TTL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store the expiry time with each value, treat an expired entry as a miss in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> and delete it; optionally sweep the old end with a timer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is LRU a bad choice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On scans or loops slightly larger than the cache: 11 keys in a loop with capacity 10 gave zero hits. LFU or a scan-resistant policy does better there.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cache hit / cache miss** | The key was in the cache / it was not; hit rate = hits divided by requests |
| **Eviction policy** | The rule for which entry to remove when full: LRU, FIFO, LFU |
| **Temporal locality** | Recently used data tends to be used again soon |
| **Recency list** | A list ordered by last use, most recent at one end |
| **Sentinel node** | A dummy node at each end of the list so inserts and removals need no special cases |
| **O(1) average case** | Constant time on average, though not guaranteed in the worst case, as with hash maps |
| **Cache thrashing** | Entries are evicted just before they are needed again, so the hit rate collapses |

---
**Conclusion:** An LRU cache answers two questions in O(1): "where is this key?" with a hash map, and "which entry is the oldest?" with a list kept in recency order, where every \`get\` and \`put\` moves its entry to the most-recent end and eviction removes from the other end. In JavaScript, a \`Map\` with delete-then-set and \`keys().next().value\` is the idiomatic build; be ready to write the doubly linked list by hand, to explain that an update never evicts and a miss never reorders, and to discuss when LRU loses (loops just larger than the cache) and what a real service adds: locks, TTL and size limits.`,
        examples: [
          {
            label: `LRU trace: every get and put, with the eviction and the recency order`,
            code: `// LRU cache on a Map: a Map iterates in insertion order, so the FIRST key is the
// least recently used. "Touching" a key = delete it and set it again.
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.data = new Map();
    this.lastEvicted = null;
  }

  get(key) {
    if (!this.data.has(key)) return -1;
    const value = this.data.get(key);
    this.data.delete(key);                 // re-insert: now the most recent
    this.data.set(key, value);
    return value;
  }

  put(key, value) {
    this.lastEvicted = null;
    if (this.data.has(key)) this.data.delete(key);   // an update is a use too
    this.data.set(key, value);
    if (this.data.size > this.capacity) {
      const oldest = this.data.keys().next().value;  // first key in iteration order
      this.data.delete(oldest);
      this.lastEvicted = oldest;
    }
  }

  order() { return '[' + Array.from(this.data.keys()).join(', ') + ']'; }
}

function run(cache, ops) {
  for (const op of ops) {
    if (op[0] === 'get') {
      console.log('get(' + op[1] + ') = ' + cache.get(op[1]) + '  order ' + cache.order());
    } else {
      cache.put(op[1], op[2]);
      const note = cache.lastEvicted === null ? '' : '  evicted ' + cache.lastEvicted;
      console.log('put(' + op[1] + ', ' + op[2] + ')' + note + '  order ' + cache.order());
    }
  }
}

console.log('capacity 2 (least recent first):');
run(new LRUCache(2), [['put', 1, 1], ['put', 2, 2], ['get', 1], ['put', 3, 3], ['get', 2],
  ['put', 4, 4], ['get', 1], ['get', 3], ['get', 4], ['put', 3, 30], ['get', 3]]);
console.log('capacity 1:');
run(new LRUCache(1), [['put', 1, 1], ['put', 2, 2], ['get', 1], ['get', 2]]);`,
          },
          {
            label: `Hit rate on one workload: LRU vs FIFO, and the loop that defeats LRU`,
            code: `// Deterministic pseudo-random numbers (MINSTD), identical in all four languages.
// seed * 48271 stays below 2^53, so plain JS numbers are exact here.
let seed = 42;
function rand() {
  seed = (seed * 48271) % 2147483647;
  return seed;
}

// 20,000 requests: 80% go to a "hot" set of 40 keys that drifts every 4,000
// requests; 20% go to 5,000 rarely used keys.
const requests = [];
for (let i = 0; i < 20000; i++) {
  const phase = Math.floor(i / 4000);
  if (rand() % 100 < 80) requests.push(phase * 40 + rand() % 40);
  else requests.push(100000 + rand() % 5000);
}

function lruHits(reqs, capacity) {
  const cache = new Map();
  let hits = 0;
  for (const k of reqs) {
    if (cache.has(k)) {
      hits++;
      cache.delete(k); cache.set(k, true);     // refresh on every hit
    } else {
      cache.set(k, true);
      if (cache.size > capacity) cache.delete(cache.keys().next().value); // evict LRU
    }
  }
  return hits;
}

function fifoHits(reqs, capacity) {
  const cache = new Set();                     // a Set also iterates in insertion order
  let hits = 0;
  for (const k of reqs) {
    if (cache.has(k)) {
      hits++;                                  // a hit does NOT change the order
    } else {
      cache.add(k);
      if (cache.size > capacity) cache.delete(cache.values().next().value); // oldest INSERTED
    }
  }
  return hits;
}

function pct(hits, total) {
  const t = Math.floor(hits * 1000 / total);   // integer math: same digits everywhere
  return Math.floor(t / 10) + '.' + (t % 10) + '%';
}

for (const cap of [20, 40, 80, 160]) {
  console.log('capacity ' + cap + ': LRU ' + pct(lruHits(requests, cap), requests.length) +
    ', FIFO ' + pct(fifoHits(requests, cap), requests.length));
}

const loop = [];
for (let i = 0; i < 1100; i++) loop.push(i % 11);   // 11 keys in a loop
console.log('loop of 11 keys, capacity 10: LRU hits ' + lruHits(loop, 10) + ' of ' + loop.length);
console.log('loop of 11 keys, capacity 11: LRU hits ' + lruHits(loop, 11) + ' of ' + loop.length);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Design an LRU cache class in Java with get(key) and put(key, value), both O(1). When it is full, put must evict the least recently used key. Then tell me what you would change for a real service."

**What a strong answer should cover:**
- LRU definition and the two jobs: O(1) lookup by key and O(1) maintenance of recency order.
- The standard structure: a \`HashMap\` from key to node plus a doubly linked list ordered by recency, with eviction at the old end.
- Both \`get\` and \`put\` count as a use; updating an existing key never evicts; a miss leaves the order alone.
- The Java shortcut: \`new LinkedHashMap<>(16, 0.75f, true)\` (access order) plus an overridden \`removeEldestEntry\`; which calls count as an access.
- Beyond the coding round: LRU vs FIFO/LFU, thrashing on scans, \`LinkedHashMap\` is not thread-safe, \`Integer\` boxing and \`null\` on a miss.

**Clarifying questions expected:**
- Is capacity counted in entries or bytes, and can it be 0?
- Does \`put\` on an existing key count as a use?
- Is the cache shared between threads?

**Code / implementation expected:** Yes — an \`LRUCache\` class in Java, using \`LinkedHashMap\` in access order or a hand-written \`HashMap\` plus doubly linked list.`,
        answer: `**Target Audience:** Developers preparing for coding and system design interviews who know maps and classes in Java.  
**Difficulty:** Hard  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a small desk with room for exactly five books, and a huge library down the hall. Fetching a book from the library takes ten minutes; grabbing one from the desk takes a second. When you need a sixth book and the desk is full, one book has to go back to the library. Which one?

A sensible rule: **send back the book you have not touched for the longest time.** The book you opened a minute ago is likely to be needed again soon; the one gathering dust since this morning probably is not. That rule is called **Least Recently Used (LRU)**, and the desk is a **cache**.

Every fast system has a desk like this: the CPU caches memory, the browser caches files, a web server caches database rows, Python caches function results with \`functools.lru_cache\`. The interview question "design an LRU cache" (LeetCode 146) asks you to build the desk with two operations that each take **O(1)** time:

- \`get(key)\`: return the value if it is cached (and mark it as just used), otherwise -1.
- \`put(key, value)\`: insert or update the value (and mark it as just used); if the cache is now over capacity, throw out the least recently used entry.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the capacity, and is it counted in entries or in bytes? | The classic version counts entries. Counting bytes means evicting until enough space is free, possibly several entries. |
| Does \`put\` on an existing key count as a use? | In LeetCode 146 it does: the key becomes the most recent and its value is replaced, with no eviction. |
| What does \`get\` return on a miss? | Usually -1; in a real API \`null\`, \`None\` or an optional. |
| Is a capacity of 0 possible? | If yes, every \`put\` must be a no-op, which naive code gets wrong. |
| Single-threaded or concurrent? | Concurrent access needs a lock (or a sharded design), because even \`get\` changes the order. |
| Do entries also expire after a time (TTL)? | Then you need expiry checks on read, and possibly a second ordering by expiry time. |

## 3. What the Cache Has to Do

An LRU cache needs to answer two different questions quickly:

1. **"Is this key here, and what is its value?"** That is a lookup by key, which is what a hash map does in O(1) on average (see [how a hash table works](/interview-question/how-does-a-hash-table-work)).
2. **"Which entry was used least recently?"** That is an ordering question. Every \`get\` and \`put\` moves one entry to the "most recent" end, and eviction removes from the "least recent" end.

📌 **Interview term: Cache hit / cache miss** — a hit means the key was in the cache; a miss means it was not and the slow source must be asked. The **hit rate** is hits divided by requests.

📌 **Interview term: Eviction policy** — the rule that decides which entry to remove when the cache is full. LRU, FIFO (oldest inserted) and LFU (least frequently used) are the common ones.

📌 **Interview term: Temporal locality** — the tendency of programs to reuse data they used recently. LRU is a bet on temporal locality.

A hash map alone has no notion of "least recent". A list alone can keep the order, but finding a key in it takes O(n). The standard design combines both: the **hash map points directly at a node in a doubly linked list**, and the list is kept in recency order.

<svg class="iq-diagram" width="100%" viewBox="0 0 770 290" role="img" aria-label="A hash map from key to node sits above a doubly linked list: head sentinel, key 7, key 3, key 9, tail sentinel. Each node links to both neighbours. The node next to head is the most recently used and the node next to tail is the least recently used.">
  <defs>
    <marker id="b32q2ja-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="170" y="20" width="430" height="70" rx="10"/>
  <text class="d-text" x="385" y="50" text-anchor="middle">hash map: key to node</text>
  <text class="d-sub" x="385" y="74" text-anchor="middle">O(1) jump to any node</text>
  <path class="d-edge-dashed" d="M 225 92 L 225 152" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge-dashed" d="M 385 92 L 385 152" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge-dashed" d="M 545 92 L 545 152" marker-end="url(#b32q2ja-a1)"/>
  <rect class="d-box-muted" x="20" y="160" width="100" height="60" rx="8"/>
  <text class="d-text" x="70" y="186" text-anchor="middle">head</text>
  <text class="d-sub" x="70" y="208" text-anchor="middle">sentinel</text>
  <rect class="d-box" x="170" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="225" y="186" text-anchor="middle">key 7</text>
  <text class="d-sub" x="225" y="208" text-anchor="middle">value 70</text>
  <rect class="d-box" x="330" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="385" y="186" text-anchor="middle">key 3</text>
  <text class="d-sub" x="385" y="208" text-anchor="middle">value 30</text>
  <rect class="d-box" x="490" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="545" y="186" text-anchor="middle">key 9</text>
  <text class="d-sub" x="545" y="208" text-anchor="middle">value 90</text>
  <rect class="d-box-muted" x="650" y="160" width="100" height="60" rx="8"/>
  <text class="d-text" x="700" y="186" text-anchor="middle">tail</text>
  <text class="d-sub" x="700" y="208" text-anchor="middle">sentinel</text>
  <path class="d-edge" d="M 122 176 L 164 176" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge" d="M 168 204 L 126 204" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge" d="M 282 176 L 324 176" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge" d="M 328 204 L 286 204" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge" d="M 442 176 L 484 176" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge" d="M 488 204 L 446 204" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge" d="M 602 176 L 644 176" marker-end="url(#b32q2ja-a1)"/>
  <path class="d-edge" d="M 648 204 L 606 204" marker-end="url(#b32q2ja-a1)"/>
  <text class="d-sub" x="225" y="256" text-anchor="middle">most recent</text>
  <text class="d-sub" x="545" y="256" text-anchor="middle">least recent</text>
</svg>

The map gives O(1) access to any node; the list order gives O(1) access to both ends, and because each node knows both neighbours, any node can be cut out and moved to the front in O(1).

📌 **Interview term: Recency list** — a list ordered by last use, most recent at one end and least recent at the other.

📌 **Interview term: Sentinel node** — a dummy node at each end of the list that is never removed, so inserting and unlinking never have to special-case an empty list.

Why it must be **doubly** linked, and why each simpler structure fails, is the whole subject of the companion question [why a doubly linked list plus a hash map](/interview-question/design-an-lru-cache-with-o-1-get-and-put-why-doubly-linked-list-hash-map). Here we focus on the design and on the shortcut every language offers.

## 4. The Two Operations, Step by Step

- **\`get(key)\`**: look the key up in the map. Miss: return -1. Hit: unlink its node, re-insert it at the front, return the value.
- **\`put(key, value)\`**: if the key exists, update the value and move the node to the front. Otherwise create a node at the front and add it to the map; if the size is now above capacity, remove the node at the back **and delete its key from the map**.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Three rows. Before: 7, 3, 9 with 9 least recent. After get 9: 9, 7, 3, because 9 moved to the front. After put 5 on a full cache: 5, 9, 7, because 3 was at the back and was evicted.">
  <defs>
    <marker id="b32q2ja-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="120" height="50" rx="8"/>
  <text class="d-text" x="80" y="61" text-anchor="middle">start</text>
  <rect class="d-box" x="200" y="30" width="100" height="50" rx="8"/>
  <text class="d-text" x="250" y="61" text-anchor="middle">key 7</text>
  <path class="d-edge" d="M 302 55 L 344 55" marker-end="url(#b32q2ja-a2)"/>
  <rect class="d-box" x="350" y="30" width="100" height="50" rx="8"/>
  <text class="d-text" x="400" y="61" text-anchor="middle">key 3</text>
  <path class="d-edge" d="M 452 55 L 494 55" marker-end="url(#b32q2ja-a2)"/>
  <rect class="d-box" x="500" y="30" width="100" height="50" rx="8"/>
  <text class="d-text" x="550" y="61" text-anchor="middle">key 9</text>
  <rect class="d-box-muted" x="20" y="130" width="120" height="50" rx="8"/>
  <text class="d-text" x="80" y="161" text-anchor="middle">get(9)</text>
  <rect class="d-box-accent" x="200" y="130" width="100" height="50" rx="8"/>
  <text class="d-text" x="250" y="161" text-anchor="middle">key 9</text>
  <path class="d-edge" d="M 302 155 L 344 155" marker-end="url(#b32q2ja-a2)"/>
  <rect class="d-box" x="350" y="130" width="100" height="50" rx="8"/>
  <text class="d-text" x="400" y="161" text-anchor="middle">key 7</text>
  <path class="d-edge" d="M 452 155 L 494 155" marker-end="url(#b32q2ja-a2)"/>
  <rect class="d-box" x="500" y="130" width="100" height="50" rx="8"/>
  <text class="d-text" x="550" y="161" text-anchor="middle">key 3</text>
  <rect class="d-box-muted" x="20" y="230" width="120" height="50" rx="8"/>
  <text class="d-text" x="80" y="261" text-anchor="middle">put(5)</text>
  <rect class="d-box-accent" x="200" y="230" width="100" height="50" rx="8"/>
  <text class="d-text" x="250" y="261" text-anchor="middle">key 5</text>
  <path class="d-edge" d="M 302 255 L 344 255" marker-end="url(#b32q2ja-a2)"/>
  <rect class="d-box" x="350" y="230" width="100" height="50" rx="8"/>
  <text class="d-text" x="400" y="261" text-anchor="middle">key 9</text>
  <path class="d-edge" d="M 452 255 L 494 255" marker-end="url(#b32q2ja-a2)"/>
  <rect class="d-box" x="500" y="230" width="100" height="50" rx="8"/>
  <text class="d-text" x="550" y="261" text-anchor="middle">key 7</text>
  <rect class="d-box-muted" x="650" y="230" width="90" height="50" rx="8"/>
  <text class="d-sub" x="695" y="252" text-anchor="middle">evicted</text>
  <text class="d-text" x="695" y="272" text-anchor="middle">key 3</text>
</svg>

The first row is the cache after inserting 9, 3 and 7 (7 is the most recent). \`get(9)\` moves 9 to the front. The cache is full at 3 entries, so \`put(5)\` puts 5 at the front and evicts the entry at the back, key 3.

📌 **Interview term: O(1) average case** — hash map operations take constant time on average, not in the worst case (many colliding keys can slow them down), and occasional resizing makes inserts amortised O(1). List relinking is O(1) always. Together, \`get\` and \`put\` are O(1) on average.

## 5. The Quick Build in Java: \`LinkedHashMap\` in Access Order

\`java.util.LinkedHashMap\` is a hash map that also threads its entries on a doubly linked list. Its three-argument constructor takes an \`accessOrder\` flag; with \`true\`, iteration goes from the least recently accessed entry to the most recently accessed one, and the Javadoc says this "is well-suited to building LRU caches". Overriding \`removeEldestEntry\` lets the map evict automatically after each \`put\` ([Javadoc: LinkedHashMap](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/LinkedHashMap.html)).

~~~java
static class LRUCache {
    private final int capacity;
    Integer lastEvicted = null;
    private final LinkedHashMap<Integer, Integer> data;

    LRUCache(int capacity) {
        this.capacity = capacity;
        this.data = new LinkedHashMap<Integer, Integer>(16, 0.75f, true) {  // true = access order
            @Override
            protected boolean removeEldestEntry(Map.Entry<Integer, Integer> eldest) {
                if (size() > LRUCache.this.capacity) {
                    lastEvicted = eldest.getKey();
                    return true;                       // the map removes the eldest entry
                }
                return false;
            }
        };
    }

    int get(int key) {
        Integer v = data.get(key);                    // get() moves the entry to the end
        return v == null ? -1 : v;
    }

    void put(int key, int value) {
        lastEvicted = null;
        data.put(key, value);                         // put() on an existing key also moves it
    }

    String order() { return data.keySet().toString(); }   // least recent first
}
~~~

**What to point out in this code:**

- \`true\` as the third constructor argument switches from insertion order to **access order**. With the default (\`false\`) you would get a FIFO cache.
- \`removeEldestEntry\` is called by \`put\` after inserting; returning \`true\` makes the map remove its eldest entry. We record the key first so the trace can print it.
- What counts as an access: \`get\`, \`getOrDefault\` and \`put\` move the entry to the end. We checked that \`containsKey\` and iterating \`keySet()\` do **not** reorder.
- \`data.get(key)\` returns \`Integer\`, and \`null\` on a miss. Converting it straight to \`int\` would throw \`NullPointerException\`, hence the \`v == null ? -1 : v\`.
- Iterating an access-ordered \`LinkedHashMap\` while calling \`get\` on it throws \`ConcurrentModificationException\`, because in access order \`get\` is a structural change. We triggered it on purpose to confirm.

Many solutions write \`class LRUCache extends LinkedHashMap<Integer, Integer>\`. That is shorter, but it exposes every \`Map\` method (including ones that bypass your rules) on the cache; composition, as above, keeps the API to \`get\` and \`put\`. Interviewers often then say "now do it without \`LinkedHashMap\`", which is the hand-written version in [why a doubly linked list plus a hash map](/interview-question/design-an-lru-cache-with-o-1-get-and-put-why-doubly-linked-list-hash-map).

## 6. Verified: Running the Code

Each example was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21, using nothing newer than Java 17). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the LeetCode 146 sequence on a capacity-2 cache, plus an update on a full cache and a capacity-1 cache, printing the recency order (least recent first) after every call** prints:

~~~text
capacity 2 (least recent first):
put(1, 1)  order [1]
put(2, 2)  order [1, 2]
get(1) = 1  order [2, 1]
put(3, 3)  evicted 2  order [1, 3]
get(2) = -1  order [1, 3]
put(4, 4)  evicted 1  order [3, 4]
get(1) = -1  order [3, 4]
get(3) = 3  order [4, 3]
get(4) = 4  order [3, 4]
put(3, 30)  order [4, 3]
get(3) = 30  order [4, 3]
capacity 1:
put(1, 1)  order [1]
put(2, 2)  evicted 1  order [2]
get(1) = -1  order [2]
get(2) = 2  order [2]
~~~

Read it against the rules: \`get(1)\` moved 1 to the most-recent end, so \`put(3, 3)\` evicted 2, not 1. \`put(3, 30)\` on a full cache evicted nothing and moved 3 to the end. A miss (\`get(2) = -1\`) left the order unchanged.

**Example 2 — 20,000 requests from one fixed pseudo-random workload, replayed against LRU and FIFO caches of four sizes, then a loop over 11 keys** prints:

~~~text
capacity 20: LRU 29.9%, FIFO 28.4%
capacity 40: LRU 55.6%, FIFO 48.8%
capacity 80: LRU 77.2%, FIFO 65.7%
capacity 160: LRU 79.1%, FIFO 73.9%
loop of 11 keys, capacity 10: LRU hits 0 of 1100
loop of 11 keys, capacity 11: LRU hits 1089 of 1100
~~~

The pseudo-random numbers come from the same small generator (\`seed = seed * 48271 % 2147483647\`) in all four languages, so every language replays exactly the same requests and prints the same percentages.

## 7. LRU Is a Policy Choice, Not Magic

Example 2 replays one deterministic workload against LRU and FIFO caches of several sizes. 80% of the 20,000 requests go to a "hot" group of 40 keys, and that hot group changes every 4,000 requests; the rest go to 5,000 rarely used keys.

| Capacity | LRU hit rate | FIFO hit rate |
| :--- | :--- | :--- |
| 20 | 29.9% | 28.4% |
| 40 | 55.6% | 48.8% |
| 80 | 77.2% | 65.7% |
| 160 | 79.1% | 73.9% |

LRU wins at every size because every hit **refreshes** a hot key, so the cold one-off keys are the ones that fall off the end. FIFO evicts by insertion time, so even the hottest key is thrown out once it becomes the oldest insert, and has to miss again.

The last two lines of example 2 show LRU's weak spot. Requests that loop over 11 keys with a capacity of 10 get **zero** hits out of 1,100: each request evicts exactly the key that is needed next. With capacity 11, 1,089 of the 1,100 requests hit (every request after the first 11).

📌 **Interview term: Cache thrashing** — the working set is slightly larger than the cache, so entries are evicted just before they are needed again and the hit rate collapses. Sequential scans are the classic LRU killer.

| Policy | Evicts | Good at | Weak at |
| :--- | :--- | :--- | :--- |
| LRU | the entry unused for the longest time | recency-heavy workloads; O(1) with map + list | scans and loops slightly bigger than the cache |
| FIFO | the oldest inserted entry | simplicity; a queue and a set | throws out hot entries just because they are old |
| LFU | the least frequently used entry | stable popularity | slow to adapt when popularity shifts; needs frequency buckets for O(1) |

Real systems often approximate LRU. Redis, for example, documents that its LRU eviction is an approximation that samples a few keys and evicts the best candidate among them, rather than keeping an exact list ([Redis docs: key eviction](https://redis.io/docs/latest/develop/reference/eviction/)).

## 8. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`get\` hit | O(1) average | map lookup, then unlink and push to the front (a fixed number of pointer changes) |
| \`get\` miss | O(1) average | one map lookup |
| \`put\` new key | O(1) average | map insert, push to the front, and possibly evict the back node |
| \`put\` existing key | O(1) average | map lookup, update value, move to the front |
| Space | O(capacity) | one map entry and one list node per cached key |

The "average" comes from the hash map; the list part is O(1) in the worst case. The table of [the cost of common operations on arrays, hash maps and trees](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance) has the background.

## 9. What Changes for a Real Service

- **Threads.** The Javadoc states that \`LinkedHashMap\` is not synchronized, and in access order even \`get\` modifies it. Make \`get\` and \`put\` \`synchronized\`, or use a lock; for high throughput, use a purpose-built concurrent cache library rather than a single global lock.
- **TTL (time to live).** Store the value with an expiry time and treat an expired entry as a miss on \`get\`.
- **Size in bytes.** Keep a running total and evict from the old end in a loop until the new entry fits; \`removeEldestEntry\` can only remove one entry per \`put\`, so this needs the hand-written version or an explicit loop over the iterator.
- **Generic keys.** For \`LRUCache<K, V>\`, keys need correct \`equals\` and \`hashCode\`, exactly as for any \`HashMap\`.
- **Many processes or machines** need a shared cache server such as Redis, which uses an approximated LRU as described above.

## 10. Edge Cases

- **Capacity 1:** every new key evicts the previous one (example 1, second part: \`put(2, 2)\` evicts 1).
- **Updating an existing key on a full cache:** no eviction, the key just moves to the front with its new value (\`put(3, 30)\` in example 1).
- **\`get\` on a miss must not change the order** (\`get(2) = -1\` leaves \`[1, 3]\` unchanged).
- **Capacity 0:** decide with the interviewer; a correct implementation stores nothing. Code that inserts first and evicts after works; code that evicts "the back node" of an empty list crashes.
- **Eviction must remove the key from the map too,** or the map keeps growing and later \`get\`s return a value that is no longer in the list.

## 11. Related Designs

The same "hash map plus an auxiliary structure" idea shows up in other design questions: the [min stack](/interview-question/how-do-you-design-a-min-stack-with-o-1-getmin) pairs a stack with a running minimum, and [Design Twitter](/interview-question/design-twitter-feed-how-do-you-fan-out-with-heap-hash-for-timeline) pairs hash maps with a heap (and suggests caching feeds in an LRU). The structural trade-offs between the pieces are in [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).

## Common Pitfalls

- **Calling \`new LinkedHashMap<>()\` without the access-order flag.** The map stays in insertion order and the cache is FIFO; example 2 shows FIFO losing up to 11.5 percentage points of hit rate.
- **Unboxing a miss.** \`int v = map.get(key);\` throws \`NullPointerException\` when the key is absent.
- **Expecting \`containsKey\` to count as a use.** It does not reorder; only \`get\`, \`getOrDefault\`, \`put\` and friends do.
- **Comparing boxed values with \`==\`.** \`Integer\` objects are cached only from -128 to 127, so \`a == b\` is \`true\` for 127 and \`false\` for 128 (we printed both); use \`equals\`.
- **Sharing the cache between threads without a lock.** \`get\` mutates the list; concurrent calls can corrupt it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Evict the entry that has gone unused longest; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code> both count as a use and must be O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Structure:</strong> <span style="color:#f0e2c8;">Hash map from key to node plus a doubly linked list in recency order: map for lookup, list for order, eviction at the old end.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Java:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new LinkedHashMap&lt;&gt;(16, 0.75f, true)</code> for access order, override <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">removeEldestEntry</code> to return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size() &gt; capacity</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edge cases:</strong> <span style="color:#f0e2c8;">Update on a full cache does not evict; a miss returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> (not -1) from the map; capacity 1 evicts on every new key.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Beyond:</strong> <span style="color:#f0e2c8;">LRU beat FIFO in my simulation (77.2% vs 65.7% at capacity 80) but thrashes on loops; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LinkedHashMap</code> is not thread-safe.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it without <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LinkedHashMap</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Integer, Node&gt;</code>, a static nested <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Node</code> class with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>, two sentinels, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unlink</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pushFront</code> helpers. Each operation changes at most six references.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">get</code> throw <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ConcurrentModificationException</code> while iterating?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In access order, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> moves the entry, which counts as a structural modification, so the fail-fast iterator stops.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is your cache thread-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No; I would mark <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">synchronized</code> or use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReentrantLock</code>. A plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ConcurrentHashMap</code> does not track recency, so it is not an LRU by itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why composition rather than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">extends LinkedHashMap</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Extending exposes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">putAll</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">entrySet</code> and the rest on the cache. Composition keeps the API to exactly <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is LRU a bad choice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On scans or loops slightly larger than the cache: 11 keys in a loop with capacity 10 gave zero hits. LFU or a scan-resistant policy does better there.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cache hit / cache miss** | The key was in the cache / it was not; hit rate = hits divided by requests |
| **Eviction policy** | The rule for which entry to remove when full: LRU, FIFO, LFU |
| **Temporal locality** | Recently used data tends to be used again soon |
| **Recency list** | A list ordered by last use, most recent at one end |
| **Sentinel node** | A dummy node at each end of the list so inserts and removals need no special cases |
| **O(1) average case** | Constant time on average, though not guaranteed in the worst case, as with hash maps |
| **Cache thrashing** | Entries are evicted just before they are needed again, so the hit rate collapses |

---
**Conclusion:** An LRU cache answers two questions in O(1): "where is this key?" with a hash map, and "which entry is the oldest?" with a list kept in recency order, where every \`get\` and \`put\` moves its entry to the most-recent end and eviction removes from the other end. In Java, \`LinkedHashMap\` in access order with \`removeEldestEntry\` is the idiomatic build; be ready to write the doubly linked list by hand, to explain that an update never evicts and a miss never reorders, and to discuss when LRU loses (loops just larger than the cache) and what a real service adds: locks, TTL and size limits.`,
        examples: [
          {
            label: `LRU trace: every get and put, with the eviction and the recency order`,
            code: `import java.util.*;

public class Main {
    // LRU cache on LinkedHashMap in ACCESS order: iteration goes from least recently
    // accessed to most recently accessed, and removeEldestEntry evicts after a put.
    static class LRUCache {
        private final int capacity;
        Integer lastEvicted = null;
        private final LinkedHashMap<Integer, Integer> data;

        LRUCache(int capacity) {
            this.capacity = capacity;
            this.data = new LinkedHashMap<Integer, Integer>(16, 0.75f, true) {  // true = access order
                @Override
                protected boolean removeEldestEntry(Map.Entry<Integer, Integer> eldest) {
                    if (size() > LRUCache.this.capacity) {
                        lastEvicted = eldest.getKey();
                        return true;                       // the map removes the eldest entry
                    }
                    return false;
                }
            };
        }

        int get(int key) {
            Integer v = data.get(key);                    // get() moves the entry to the end
            return v == null ? -1 : v;
        }

        void put(int key, int value) {
            lastEvicted = null;
            data.put(key, value);                         // put() on an existing key also moves it
        }

        String order() { return data.keySet().toString(); }   // least recent first
    }

    static void run(LRUCache cache, int[][] ops) {
        for (int[] op : ops) {
            if (op.length == 1) {
                System.out.println("get(" + op[0] + ") = " + cache.get(op[0]) + "  order " + cache.order());
            } else {
                cache.put(op[0], op[1]);
                String note = cache.lastEvicted == null ? "" : "  evicted " + cache.lastEvicted;
                System.out.println("put(" + op[0] + ", " + op[1] + ")" + note + "  order " + cache.order());
            }
        }
    }

    public static void main(String[] args) {
        System.out.println("capacity 2 (least recent first):");
        // {k} is get(k), {k, v} is put(k, v)
        run(new LRUCache(2), new int[][] {{1, 1}, {2, 2}, {1}, {3, 3}, {2}, {4, 4}, {1}, {3}, {4}, {3, 30}, {3}});
        System.out.println("capacity 1:");
        run(new LRUCache(1), new int[][] {{1, 1}, {2, 2}, {1}, {2}});
    }
}`,
          },
          {
            label: `Hit rate on one workload: LRU vs FIFO, and the loop that defeats LRU`,
            code: `import java.util.*;

public class Main {
    // Deterministic pseudo-random numbers (MINSTD), identical in all four languages.
    static long seed = 42;
    static long rand() {
        seed = seed * 48271 % 2147483647L;           // long: the product overflows int
        return seed;
    }

    static int lruHits(int[] reqs, int capacity) {
        LinkedHashMap<Integer, Boolean> cache = new LinkedHashMap<Integer, Boolean>(16, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<Integer, Boolean> e) { return size() > capacity; }
        };
        int hits = 0;
        for (int k : reqs) {
            if (cache.get(k) != null) hits++;        // get() refreshes the entry (access order)
            else cache.put(k, Boolean.TRUE);         // may evict the least recently used
        }
        return hits;
    }

    static int fifoHits(int[] reqs, int capacity) {
        Set<Integer> cache = new HashSet<>();
        ArrayDeque<Integer> queue = new ArrayDeque<>();
        int hits = 0;
        for (int k : reqs) {
            if (cache.contains(k)) {
                hits++;                              // a hit does NOT change the order
            } else {
                cache.add(k); queue.addLast(k);
                if (queue.size() > capacity) cache.remove(queue.pollFirst()); // oldest INSERTED
            }
        }
        return hits;
    }

    static String pct(int hits, int total) {
        int t = hits * 1000 / total;                 // integer math: same digits everywhere
        return (t / 10) + "." + (t % 10) + "%";
    }

    public static void main(String[] args) {
        // 20,000 requests: 80% to a "hot" set of 40 keys that drifts every 4,000
        // requests; 20% to 5,000 rarely used keys.
        int[] requests = new int[20000];
        for (int i = 0; i < requests.length; i++) {
            int phase = i / 4000;
            if (rand() % 100 < 80) requests[i] = phase * 40 + (int) (rand() % 40);
            else requests[i] = 100000 + (int) (rand() % 5000);
        }
        for (int cap : new int[] {20, 40, 80, 160}) {
            System.out.println("capacity " + cap + ": LRU " + pct(lruHits(requests, cap), requests.length)
                + ", FIFO " + pct(fifoHits(requests, cap), requests.length));
        }
        int[] loop = new int[1100];
        for (int i = 0; i < loop.length; i++) loop[i] = i % 11;   // 11 keys in a loop
        System.out.println("loop of 11 keys, capacity 10: LRU hits " + lruHits(loop, 10) + " of " + loop.length);
        System.out.println("loop of 11 keys, capacity 11: LRU hits " + lruHits(loop, 11) + " of " + loop.length);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Design an LRU cache class in C++ with get(key) and put(key, value), both O(1). When it is full, put must evict the least recently used key. Then tell me what you would change for a real service."

**What a strong answer should cover:**
- LRU definition and the two jobs: O(1) lookup by key and O(1) maintenance of recency order.
- The standard structure: an \`unordered_map\` from key to a list iterator plus a \`std::list\` ordered by recency, with eviction at the old end.
- Both \`get\` and \`put\` count as a use; updating an existing key never evicts; a miss leaves the order alone.
- The C++ tools: \`list::splice\` moves a node in O(1) without invalidating iterators, so the iterators stored in the map stay valid; erase the map entry before \`pop_back\`.
- Beyond the coding round: LRU vs FIFO/LFU, thrashing on scans, \`std::mutex\` for threads, and why a \`vector\` would invalidate stored iterators.

**Clarifying questions expected:**
- Is capacity counted in entries or bytes, and can it be 0?
- Does \`put\` on an existing key count as a use?
- Is the cache shared between threads?

**Code / implementation expected:** Yes — an \`LRUCache\` class in C++17 with \`std::list\` and \`std::unordered_map\`.`,
        answer: `**Target Audience:** Developers preparing for coding and system design interviews who know maps and classes in C++.  
**Difficulty:** Hard  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a small desk with room for exactly five books, and a huge library down the hall. Fetching a book from the library takes ten minutes; grabbing one from the desk takes a second. When you need a sixth book and the desk is full, one book has to go back to the library. Which one?

A sensible rule: **send back the book you have not touched for the longest time.** The book you opened a minute ago is likely to be needed again soon; the one gathering dust since this morning probably is not. That rule is called **Least Recently Used (LRU)**, and the desk is a **cache**.

Every fast system has a desk like this: the CPU caches memory, the browser caches files, a web server caches database rows, Python caches function results with \`functools.lru_cache\`. The interview question "design an LRU cache" (LeetCode 146) asks you to build the desk with two operations that each take **O(1)** time:

- \`get(key)\`: return the value if it is cached (and mark it as just used), otherwise -1.
- \`put(key, value)\`: insert or update the value (and mark it as just used); if the cache is now over capacity, throw out the least recently used entry.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the capacity, and is it counted in entries or in bytes? | The classic version counts entries. Counting bytes means evicting until enough space is free, possibly several entries. |
| Does \`put\` on an existing key count as a use? | In LeetCode 146 it does: the key becomes the most recent and its value is replaced, with no eviction. |
| What does \`get\` return on a miss? | Usually -1; in a real API \`null\`, \`None\` or an optional. |
| Is a capacity of 0 possible? | If yes, every \`put\` must be a no-op, which naive code gets wrong. |
| Single-threaded or concurrent? | Concurrent access needs a lock (or a sharded design), because even \`get\` changes the order. |
| Do entries also expire after a time (TTL)? | Then you need expiry checks on read, and possibly a second ordering by expiry time. |

## 3. What the Cache Has to Do

An LRU cache needs to answer two different questions quickly:

1. **"Is this key here, and what is its value?"** That is a lookup by key, which is what a hash map does in O(1) on average (see [how a hash table works](/interview-question/how-does-a-hash-table-work)).
2. **"Which entry was used least recently?"** That is an ordering question. Every \`get\` and \`put\` moves one entry to the "most recent" end, and eviction removes from the "least recent" end.

📌 **Interview term: Cache hit / cache miss** — a hit means the key was in the cache; a miss means it was not and the slow source must be asked. The **hit rate** is hits divided by requests.

📌 **Interview term: Eviction policy** — the rule that decides which entry to remove when the cache is full. LRU, FIFO (oldest inserted) and LFU (least frequently used) are the common ones.

📌 **Interview term: Temporal locality** — the tendency of programs to reuse data they used recently. LRU is a bet on temporal locality.

A hash map alone has no notion of "least recent". A list alone can keep the order, but finding a key in it takes O(n). The standard design combines both: the **hash map points directly at a node in a doubly linked list**, and the list is kept in recency order.

<svg class="iq-diagram" width="100%" viewBox="0 0 770 290" role="img" aria-label="A hash map from key to node sits above a doubly linked list: head sentinel, key 7, key 3, key 9, tail sentinel. Each node links to both neighbours. The node next to head is the most recently used and the node next to tail is the least recently used.">
  <defs>
    <marker id="b32q2cp-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="170" y="20" width="430" height="70" rx="10"/>
  <text class="d-text" x="385" y="50" text-anchor="middle">hash map: key to node</text>
  <text class="d-sub" x="385" y="74" text-anchor="middle">O(1) jump to any node</text>
  <path class="d-edge-dashed" d="M 225 92 L 225 152" marker-end="url(#b32q2cp-a1)"/>
  <path class="d-edge-dashed" d="M 385 92 L 385 152" marker-end="url(#b32q2cp-a1)"/>
  <path class="d-edge-dashed" d="M 545 92 L 545 152" marker-end="url(#b32q2cp-a1)"/>
  <rect class="d-box-muted" x="20" y="160" width="100" height="60" rx="8"/>
  <text class="d-text" x="70" y="186" text-anchor="middle">head</text>
  <text class="d-sub" x="70" y="208" text-anchor="middle">sentinel</text>
  <rect class="d-box" x="170" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="225" y="186" text-anchor="middle">key 7</text>
  <text class="d-sub" x="225" y="208" text-anchor="middle">value 70</text>
  <rect class="d-box" x="330" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="385" y="186" text-anchor="middle">key 3</text>
  <text class="d-sub" x="385" y="208" text-anchor="middle">value 30</text>
  <rect class="d-box" x="490" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="545" y="186" text-anchor="middle">key 9</text>
  <text class="d-sub" x="545" y="208" text-anchor="middle">value 90</text>
  <rect class="d-box-muted" x="650" y="160" width="100" height="60" rx="8"/>
  <text class="d-text" x="700" y="186" text-anchor="middle">tail</text>
  <text class="d-sub" x="700" y="208" text-anchor="middle">sentinel</text>
  <path class="d-edge" d="M 122 176 L 164 176" marker-end="url(#b32q2cp-a1)"/>
  <path class="d-edge" d="M 168 204 L 126 204" marker-end="url(#b32q2cp-a1)"/>
  <path class="d-edge" d="M 282 176 L 324 176" marker-end="url(#b32q2cp-a1)"/>
  <path class="d-edge" d="M 328 204 L 286 204" marker-end="url(#b32q2cp-a1)"/>
  <path class="d-edge" d="M 442 176 L 484 176" marker-end="url(#b32q2cp-a1)"/>
  <path class="d-edge" d="M 488 204 L 446 204" marker-end="url(#b32q2cp-a1)"/>
  <path class="d-edge" d="M 602 176 L 644 176" marker-end="url(#b32q2cp-a1)"/>
  <path class="d-edge" d="M 648 204 L 606 204" marker-end="url(#b32q2cp-a1)"/>
  <text class="d-sub" x="225" y="256" text-anchor="middle">most recent</text>
  <text class="d-sub" x="545" y="256" text-anchor="middle">least recent</text>
</svg>

The map gives O(1) access to any node; the list order gives O(1) access to both ends, and because each node knows both neighbours, any node can be cut out and moved to the front in O(1).

📌 **Interview term: Recency list** — a list ordered by last use, most recent at one end and least recent at the other.

📌 **Interview term: Sentinel node** — a dummy node at each end of the list that is never removed, so inserting and unlinking never have to special-case an empty list.

Why it must be **doubly** linked, and why each simpler structure fails, is the whole subject of the companion question [why a doubly linked list plus a hash map](/interview-question/design-an-lru-cache-with-o-1-get-and-put-why-doubly-linked-list-hash-map). Here we focus on the design and on the shortcut every language offers.

## 4. The Two Operations, Step by Step

- **\`get(key)\`**: look the key up in the map. Miss: return -1. Hit: unlink its node, re-insert it at the front, return the value.
- **\`put(key, value)\`**: if the key exists, update the value and move the node to the front. Otherwise create a node at the front and add it to the map; if the size is now above capacity, remove the node at the back **and delete its key from the map**.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Three rows. Before: 7, 3, 9 with 9 least recent. After get 9: 9, 7, 3, because 9 moved to the front. After put 5 on a full cache: 5, 9, 7, because 3 was at the back and was evicted.">
  <defs>
    <marker id="b32q2cp-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="120" height="50" rx="8"/>
  <text class="d-text" x="80" y="61" text-anchor="middle">start</text>
  <rect class="d-box" x="200" y="30" width="100" height="50" rx="8"/>
  <text class="d-text" x="250" y="61" text-anchor="middle">key 7</text>
  <path class="d-edge" d="M 302 55 L 344 55" marker-end="url(#b32q2cp-a2)"/>
  <rect class="d-box" x="350" y="30" width="100" height="50" rx="8"/>
  <text class="d-text" x="400" y="61" text-anchor="middle">key 3</text>
  <path class="d-edge" d="M 452 55 L 494 55" marker-end="url(#b32q2cp-a2)"/>
  <rect class="d-box" x="500" y="30" width="100" height="50" rx="8"/>
  <text class="d-text" x="550" y="61" text-anchor="middle">key 9</text>
  <rect class="d-box-muted" x="20" y="130" width="120" height="50" rx="8"/>
  <text class="d-text" x="80" y="161" text-anchor="middle">get(9)</text>
  <rect class="d-box-accent" x="200" y="130" width="100" height="50" rx="8"/>
  <text class="d-text" x="250" y="161" text-anchor="middle">key 9</text>
  <path class="d-edge" d="M 302 155 L 344 155" marker-end="url(#b32q2cp-a2)"/>
  <rect class="d-box" x="350" y="130" width="100" height="50" rx="8"/>
  <text class="d-text" x="400" y="161" text-anchor="middle">key 7</text>
  <path class="d-edge" d="M 452 155 L 494 155" marker-end="url(#b32q2cp-a2)"/>
  <rect class="d-box" x="500" y="130" width="100" height="50" rx="8"/>
  <text class="d-text" x="550" y="161" text-anchor="middle">key 3</text>
  <rect class="d-box-muted" x="20" y="230" width="120" height="50" rx="8"/>
  <text class="d-text" x="80" y="261" text-anchor="middle">put(5)</text>
  <rect class="d-box-accent" x="200" y="230" width="100" height="50" rx="8"/>
  <text class="d-text" x="250" y="261" text-anchor="middle">key 5</text>
  <path class="d-edge" d="M 302 255 L 344 255" marker-end="url(#b32q2cp-a2)"/>
  <rect class="d-box" x="350" y="230" width="100" height="50" rx="8"/>
  <text class="d-text" x="400" y="261" text-anchor="middle">key 9</text>
  <path class="d-edge" d="M 452 255 L 494 255" marker-end="url(#b32q2cp-a2)"/>
  <rect class="d-box" x="500" y="230" width="100" height="50" rx="8"/>
  <text class="d-text" x="550" y="261" text-anchor="middle">key 7</text>
  <rect class="d-box-muted" x="650" y="230" width="90" height="50" rx="8"/>
  <text class="d-sub" x="695" y="252" text-anchor="middle">evicted</text>
  <text class="d-text" x="695" y="272" text-anchor="middle">key 3</text>
</svg>

The first row is the cache after inserting 9, 3 and 7 (7 is the most recent). \`get(9)\` moves 9 to the front. The cache is full at 3 entries, so \`put(5)\` puts 5 at the front and evicts the entry at the back, key 3.

📌 **Interview term: O(1) average case** — hash map operations take constant time on average, not in the worst case (many colliding keys can slow them down), and occasional resizing makes inserts amortised O(1). List relinking is O(1) always. Together, \`get\` and \`put\` are O(1) on average.

## 5. The Build in C++: \`std::list\` + \`unordered_map\` + \`splice\`

C++ has no ready-made LRU container, but the standard library has the exact pieces. \`std::list\` is a doubly linked list, and \`list::splice(pos, other, it)\` relinks a single element in **constant time**; no elements are copied, and no iterators or references are invalidated ([cppreference: std::list::splice](https://en.cppreference.com/w/cpp/container/list/splice)). So the map can store **iterators into the list**, and those iterators stay valid when nodes move.

~~~cpp
class LRUCache {
    size_t capacity;
    list<pair<int, int>> items;
    unordered_map<int, list<pair<int, int>>::iterator> where;
public:
    int lastEvicted = -1;          // -1 = nothing evicted by the last put
    explicit LRUCache(size_t capacity) : capacity(capacity) {}

    int get(int key) {
        auto it = where.find(key);
        if (it == where.end()) return -1;
        items.splice(items.begin(), items, it->second);   // relink to the front; iterator stays valid
        return it->second->second;
    }

    void put(int key, int value) {
        lastEvicted = -1;
        auto it = where.find(key);
        if (it != where.end()) {                            // update: change value, move to front
            it->second->second = value;
            items.splice(items.begin(), items, it->second);
            return;
        }
        items.emplace_front(key, value);
        where[key] = items.begin();
        if (items.size() > capacity) {
            lastEvicted = items.back().first;
            where.erase(lastEvicted);                       // erase from the map BEFORE pop_back
            items.pop_back();
        }
    }

    string order() const {                                  // least recent first
        string s = "[";
        for (auto it = items.rbegin(); it != items.rend(); ++it)
            s += (it == items.rbegin() ? "" : ", ") + to_string(it->first);
        return s + "]";
    }
};
~~~

**What to point out in this code:**

- \`unordered_map<int, list<pair<int, int>>::iterator>\` is the "key to node" map. The list element stores the **key too**, because eviction starts from the list's back and must know which map entry to erase.
- \`items.splice(items.begin(), items, it->second)\` moves that one node to the front. Nothing is allocated or copied, and \`it->second\` still points at the same element afterwards.
- In eviction, the key is read from \`items.back()\` and erased from the map **before** \`items.pop_back()\`. After \`pop_back\`, the back element is destroyed and reading its key would be undefined behaviour.
- \`where.find(key)\` instead of \`where[key]\`: \`operator[]\` inserts a default entry on a miss, which would put a garbage iterator into the map.
- \`std::list\` is the right container here precisely because its iterators are stable. A \`std::vector\` or \`std::deque\` would invalidate stored iterators when elements are inserted or erased.

## 6. Verified: Running the Code

Each example was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the LeetCode 146 sequence on a capacity-2 cache, plus an update on a full cache and a capacity-1 cache, printing the recency order (least recent first) after every call** prints:

~~~text
capacity 2 (least recent first):
put(1, 1)  order [1]
put(2, 2)  order [1, 2]
get(1) = 1  order [2, 1]
put(3, 3)  evicted 2  order [1, 3]
get(2) = -1  order [1, 3]
put(4, 4)  evicted 1  order [3, 4]
get(1) = -1  order [3, 4]
get(3) = 3  order [4, 3]
get(4) = 4  order [3, 4]
put(3, 30)  order [4, 3]
get(3) = 30  order [4, 3]
capacity 1:
put(1, 1)  order [1]
put(2, 2)  evicted 1  order [2]
get(1) = -1  order [2]
get(2) = 2  order [2]
~~~

Read it against the rules: \`get(1)\` moved 1 to the most-recent end, so \`put(3, 3)\` evicted 2, not 1. \`put(3, 30)\` on a full cache evicted nothing and moved 3 to the end. A miss (\`get(2) = -1\`) left the order unchanged.

**Example 2 — 20,000 requests from one fixed pseudo-random workload, replayed against LRU and FIFO caches of four sizes, then a loop over 11 keys** prints:

~~~text
capacity 20: LRU 29.9%, FIFO 28.4%
capacity 40: LRU 55.6%, FIFO 48.8%
capacity 80: LRU 77.2%, FIFO 65.7%
capacity 160: LRU 79.1%, FIFO 73.9%
loop of 11 keys, capacity 10: LRU hits 0 of 1100
loop of 11 keys, capacity 11: LRU hits 1089 of 1100
~~~

The pseudo-random numbers come from the same small generator (\`seed = seed * 48271 % 2147483647\`) in all four languages, so every language replays exactly the same requests and prints the same percentages.

## 7. LRU Is a Policy Choice, Not Magic

Example 2 replays one deterministic workload against LRU and FIFO caches of several sizes. 80% of the 20,000 requests go to a "hot" group of 40 keys, and that hot group changes every 4,000 requests; the rest go to 5,000 rarely used keys.

| Capacity | LRU hit rate | FIFO hit rate |
| :--- | :--- | :--- |
| 20 | 29.9% | 28.4% |
| 40 | 55.6% | 48.8% |
| 80 | 77.2% | 65.7% |
| 160 | 79.1% | 73.9% |

LRU wins at every size because every hit **refreshes** a hot key, so the cold one-off keys are the ones that fall off the end. FIFO evicts by insertion time, so even the hottest key is thrown out once it becomes the oldest insert, and has to miss again.

The last two lines of example 2 show LRU's weak spot. Requests that loop over 11 keys with a capacity of 10 get **zero** hits out of 1,100: each request evicts exactly the key that is needed next. With capacity 11, 1,089 of the 1,100 requests hit (every request after the first 11).

📌 **Interview term: Cache thrashing** — the working set is slightly larger than the cache, so entries are evicted just before they are needed again and the hit rate collapses. Sequential scans are the classic LRU killer.

| Policy | Evicts | Good at | Weak at |
| :--- | :--- | :--- | :--- |
| LRU | the entry unused for the longest time | recency-heavy workloads; O(1) with map + list | scans and loops slightly bigger than the cache |
| FIFO | the oldest inserted entry | simplicity; a queue and a set | throws out hot entries just because they are old |
| LFU | the least frequently used entry | stable popularity | slow to adapt when popularity shifts; needs frequency buckets for O(1) |

Real systems often approximate LRU. Redis, for example, documents that its LRU eviction is an approximation that samples a few keys and evicts the best candidate among them, rather than keeping an exact list ([Redis docs: key eviction](https://redis.io/docs/latest/develop/reference/eviction/)).

## 8. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`get\` hit | O(1) average | map lookup, then unlink and push to the front (a fixed number of pointer changes) |
| \`get\` miss | O(1) average | one map lookup |
| \`put\` new key | O(1) average | map insert, push to the front, and possibly evict the back node |
| \`put\` existing key | O(1) average | map lookup, update value, move to the front |
| Space | O(capacity) | one map entry and one list node per cached key |

The "average" comes from the hash map; the list part is O(1) in the worst case. The table of [the cost of common operations on arrays, hash maps and trees](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance) has the background.

## 9. What Changes for a Real Service

- **Threads.** Even \`get\` changes the list, so every method is a write: guard each one with a \`std::mutex\` and \`std::lock_guard\`. For high throughput, shard into several caches by key hash, each with its own mutex.
- **TTL (time to live).** Store an expiry \`std::chrono::steady_clock::time_point\` with each value and treat an expired entry as a miss on \`get\`.
- **Size in bytes.** Keep a running total and evict from the back in a loop until the new entry fits.
- **Generic keys.** A template \`LRUCache<K, V>\` needs \`std::hash<K>\` and \`operator==\` for the key, like any \`unordered_map\`.
- **Many processes or machines** need a shared cache server such as Redis, which uses an approximated LRU as described above.

## 10. Edge Cases

- **Capacity 1:** every new key evicts the previous one (example 1, second part: \`put(2, 2)\` evicts 1).
- **Updating an existing key on a full cache:** no eviction, the key just moves to the front with its new value (\`put(3, 30)\` in example 1).
- **\`get\` on a miss must not change the order** (\`get(2) = -1\` leaves \`[1, 3]\` unchanged).
- **Capacity 0:** decide with the interviewer; a correct implementation stores nothing. Code that inserts first and evicts after works; code that evicts "the back node" of an empty list crashes.
- **Eviction must remove the key from the map too,** or the map keeps growing and later \`get\`s return a value that is no longer in the list.

## 11. Related Designs

The same "hash map plus an auxiliary structure" idea shows up in other design questions: the [min stack](/interview-question/how-do-you-design-a-min-stack-with-o-1-getmin) pairs a stack with a running minimum, and [Design Twitter](/interview-question/design-twitter-feed-how-do-you-fan-out-with-heap-hash-for-timeline) pairs hash maps with a heap (and suggests caching feeds in an LRU). The structural trade-offs between the pieces are in [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).

## Common Pitfalls

- **Calling \`items.pop_back()\` before reading \`items.back().first\`.** The element is gone; reading its key afterwards is undefined behaviour.
- **Using \`where[key]\` to test for presence.** \`operator[]\` inserts a default-constructed iterator on a miss and corrupts the map.
- **Erasing and re-inserting instead of \`splice\`.** It works, but it frees and allocates a node every time and invalidates the iterator stored in the map, so you must update the map too.
- **Storing iterators into a \`vector\` or \`deque\`.** Insertions and erasures invalidate them; only node-based containers such as \`std::list\` keep iterators stable.
- **Passing the cache by value.** A copied \`LRUCache\` copies the list, but the copied map's iterators still point into the **original** list; pass by reference or delete the copy constructor.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Evict the entry that has gone unused longest; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code> both count as a use and must be O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Structure:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::list&lt;pair&lt;key, value&gt;&gt;</code> in recency order plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map&lt;key, list::iterator&gt;</code>; front is most recent.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Moves:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice(begin(), items, it)</code> moves a node in O(1) and keeps every iterator valid; evict from the back, erasing the map entry first.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Edge cases:</strong> <span style="color:#f0e2c8;">Update on a full cache does not evict; a miss does not reorder; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code>, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code>, to look up.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Beyond:</strong> <span style="color:#f0e2c8;">LRU beat FIFO in my simulation (77.2% vs 65.7% at capacity 80) but thrashes on loops; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::mutex</code> per cache or per shard for threads.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why store the key inside the list element?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Eviction starts from the list back and must erase that key from the map. Without the key in the node we would have no way to find the map entry in O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">splice</code> not break the map?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It only relinks the node; iterators and references to the moved element stay valid, so the iterator stored in the map still points at it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you write the list yourself?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Node</code> struct with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> pointers, two sentinels, and ownership handled in the destructor. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::list</code> just saves the pointer code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is your cache thread-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Every operation mutates the list, so I would lock a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::mutex</code> in each method, or shard the cache by key hash.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is LRU a bad choice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On scans or loops slightly larger than the cache: 11 keys in a loop with capacity 10 gave zero hits. LFU or a scan-resistant policy does better there.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cache hit / cache miss** | The key was in the cache / it was not; hit rate = hits divided by requests |
| **Eviction policy** | The rule for which entry to remove when full: LRU, FIFO, LFU |
| **Temporal locality** | Recently used data tends to be used again soon |
| **Recency list** | A list ordered by last use, most recent at one end |
| **Sentinel node** | A dummy node at each end of the list so inserts and removals need no special cases |
| **O(1) average case** | Constant time on average, though not guaranteed in the worst case, as with hash maps |
| **Cache thrashing** | Entries are evicted just before they are needed again, so the hit rate collapses |

---
**Conclusion:** An LRU cache answers two questions in O(1): "where is this key?" with a hash map, and "which entry is the oldest?" with a list kept in recency order, where every \`get\` and \`put\` moves its entry to the most-recent end and eviction removes from the other end. In C++, \`std::list\` plus an \`unordered_map\` of list iterators, moved with \`splice\`, is the idiomatic build; be ready to write the doubly linked list by hand, to explain that an update never evicts and a miss never reorders, and to discuss when LRU loses (loops just larger than the cache) and what a real service adds: locks, TTL and size limits.`,
        examples: [
          {
            label: `LRU trace: every get and put, with the eviction and the recency order`,
            code: `#include <iostream>
#include <list>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>
using namespace std;

// LRU cache: std::list of (key, value), FRONT = most recent, BACK = least recent,
// plus unordered_map from key to the list iterator. splice moves a node in O(1).
class LRUCache {
    size_t capacity;
    list<pair<int, int>> items;
    unordered_map<int, list<pair<int, int>>::iterator> where;
public:
    int lastEvicted = -1;          // -1 = nothing evicted by the last put
    explicit LRUCache(size_t capacity) : capacity(capacity) {}

    int get(int key) {
        auto it = where.find(key);
        if (it == where.end()) return -1;
        items.splice(items.begin(), items, it->second);   // relink to the front; iterator stays valid
        return it->second->second;
    }

    void put(int key, int value) {
        lastEvicted = -1;
        auto it = where.find(key);
        if (it != where.end()) {                            // update: change value, move to front
            it->second->second = value;
            items.splice(items.begin(), items, it->second);
            return;
        }
        items.emplace_front(key, value);
        where[key] = items.begin();
        if (items.size() > capacity) {
            lastEvicted = items.back().first;
            where.erase(lastEvicted);                       // erase from the map BEFORE pop_back
            items.pop_back();
        }
    }

    string order() const {                                  // least recent first
        string s = "[";
        for (auto it = items.rbegin(); it != items.rend(); ++it)
            s += (it == items.rbegin() ? "" : ", ") + to_string(it->first);
        return s + "]";
    }
};

void run(LRUCache& cache, const vector<vector<int>>& ops) {   // by reference: never copy the cache
    for (const auto& op : ops) {
        if (op.size() == 1) {
            int v = cache.get(op[0]);
            cout << "get(" << op[0] << ") = " << v << "  order " << cache.order() << "\\n";
        } else {
            cache.put(op[0], op[1]);
            string note = cache.lastEvicted == -1 ? "" : "  evicted " + to_string(cache.lastEvicted);
            cout << "put(" << op[0] << ", " << op[1] << ")" << note << "  order " << cache.order() << "\\n";
        }
    }
}

int main() {
    cout << "capacity 2 (least recent first):\\n";
    LRUCache two(2), one(1);                   // {k} = get(k), {k, v} = put(k, v)
    run(two, {{1, 1}, {2, 2}, {1}, {3, 3}, {2}, {4, 4}, {1}, {3}, {4}, {3, 30}, {3}});
    cout << "capacity 1:\\n";
    run(one, {{1, 1}, {2, 2}, {1}, {2}});
}`,
          },
          {
            label: `Hit rate on one workload: LRU vs FIFO, and the loop that defeats LRU`,
            code: `#include <deque>
#include <iostream>
#include <list>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
using namespace std;

// Deterministic pseudo-random numbers (MINSTD), identical in all four languages.
long long seed_ = 42;
long long rnd() {
    seed_ = seed_ * 48271 % 2147483647LL;          // 64-bit: the product overflows int
    return seed_;
}

int lruHits(const vector<int>& reqs, size_t capacity) {
    list<int> order;                               // front = most recent
    unordered_map<int, list<int>::iterator> where;
    int hits = 0;
    for (int k : reqs) {
        auto it = where.find(k);
        if (it != where.end()) {
            hits++;
            order.splice(order.begin(), order, it->second);   // refresh on every hit
        } else {
            order.push_front(k);
            where[k] = order.begin();
            if (order.size() > capacity) { where.erase(order.back()); order.pop_back(); }
        }
    }
    return hits;
}

int fifoHits(const vector<int>& reqs, size_t capacity) {
    unordered_set<int> cache;
    deque<int> queue;
    int hits = 0;
    for (int k : reqs) {
        if (cache.count(k)) {
            hits++;                                // a hit does NOT change the order
        } else {
            cache.insert(k); queue.push_back(k);
            if (queue.size() > capacity) { cache.erase(queue.front()); queue.pop_front(); }
        }
    }
    return hits;
}

string pct(int hits, int total) {
    int t = hits * 1000 / total;                   // integer math: same digits everywhere
    return to_string(t / 10) + "." + to_string(t % 10) + "%";
}

int main() {
    // 20,000 requests: 80% to a "hot" set of 40 keys that drifts every 4,000
    // requests; 20% to 5,000 rarely used keys.
    vector<int> requests;
    for (int i = 0; i < 20000; i++) {
        int phase = i / 4000;
        if (rnd() % 100 < 80) requests.push_back(phase * 40 + (int)(rnd() % 40));
        else requests.push_back(100000 + (int)(rnd() % 5000));
    }
    for (int cap : {20, 40, 80, 160}) {
        cout << "capacity " << cap << ": LRU " << pct(lruHits(requests, cap), requests.size())
             << ", FIFO " << pct(fifoHits(requests, cap), requests.size()) << "\\n";
    }
    vector<int> loop;
    for (int i = 0; i < 1100; i++) loop.push_back(i % 11);   // 11 keys in a loop
    cout << "loop of 11 keys, capacity 10: LRU hits " << lruHits(loop, 10) << " of " << loop.size() << "\\n";
    cout << "loop of 11 keys, capacity 11: LRU hits " << lruHits(loop, 11) << " of " << loop.size() << "\\n";
}`,
          },
        ],
      },
    },
  },
  {
    title: `Design an LRU Cache with O(1) get and put — why doubly linked list + hash map?`,
    difficulty: "hard",
    seoDescription: `Why an O(1) LRU cache needs a hash map plus a doubly linked list: what arrays, singly linked lists and heaps cost, sentinels, and measured step counts.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Implement an LRU cache in Python with get and put both in O(1), without using OrderedDict. Explain why you need a doubly linked list together with a hash map, and what would go wrong with an array or a singly linked list."

**What a strong answer should cover:**
- The three required operations: find by key, move any entry to the most-recent end, evict the least-recent end, all in O(1).
- Why each alternative fails: list of keys (O(n) shifts), dict only (no order), heap or tree (O(log n)), singly linked list (O(n) to find the predecessor).
- Doubly linked list with sentinel head and tail; the dict maps key to node; the node stores its key for eviction.
- Exact steps: unlink is 2 pointer writes, push front 4; eviction is \`tail.prev\` plus \`del self.map[node.key]\`.
- Python details: a small \`Node\` class with \`__slots__\`, \`dict.get\` for the lookup, identity checks with \`is\` for sentinels, and \`OrderedDict\` as the library equivalent.

**Clarifying questions expected:**
- May I use \`OrderedDict\`, or should I build the list myself?
- Does \`put\` on an existing key count as a use?
- Can capacity be 0?

**Code / implementation expected:** Yes — an \`LRUCache\` class with a \`Node\` class, a dict and two sentinels in Python 3.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know classes and references in Python and want to justify the LRU design, not just recite it.  
**Difficulty:** Hard  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think of a queue of people at a coffee shop where the barista has a strange rule: **whoever just ordered goes to the back of the line, and when the shop is full, the person at the front has to leave.** The person at the front is the one who has waited longest since their last order, the "least recently used" customer.

Two things must be fast. When someone orders, the barista must find that person instantly, no matter where they stand. And the barista must be able to pull that person out of the middle of the line and send them to the back without everyone else shuffling a step.

Finding a person instantly is a job for a **hash map** (a name-to-position directory). Pulling someone out of the middle of a line instantly needs each person to hold hands with **both** neighbours, so the two neighbours can simply join hands when the person leaves. That is a **doubly linked list**. This question is about why you need exactly those two structures, and why every simpler option is O(n) or O(log n) somewhere.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must both \`get\` and \`put\` be O(1), or just one? | O(1) for both is what forces the doubly linked list; O(log n) would allow a tree. |
| Does \`put\` on an existing key count as a use? | In LeetCode 146 it does, so \`put\` also needs the "move to front" operation. |
| May I use the built-in ordered map, or should I build the list myself? | The interviewer usually wants the list by hand, and the built-in as a follow-up. |
| What does \`get\` return on a miss? | Usually -1; it must not change the order. |
| Can the capacity be 0 or 1? | Both are good test cases for the eviction code. |

## 3. The Three Operations We Need in O(1)

Strip the cache down to what it does to its data, and there are exactly three operations:

1. **Find by key**: is the key present, and where is its entry?
2. **Move an entry to the "most recent" end**: on every hit and every update. The entry can be **anywhere** in the order.
3. **Remove the entry at the "least recent" end**: on eviction, and also delete its key.

📌 **Interview term: Recency order** — the entries sorted by time of last use; LRU always evicts the oldest one.

Operation 1 is a hash map (see [how a hash table works](/interview-question/how-does-a-hash-table-work)). Operations 2 and 3 are list surgery: cut a node out of the middle, insert it at one end, and delete at the other end. Here is how the candidates do:

| Structure for the order | Find key | Move to most recent | Evict least recent | Problem |
| :--- | :--- | :--- | :--- | :--- |
| Array / dynamic array of keys | O(n) scan | O(n) shift | O(n) shift from the front | every move shifts elements |
| Hash map only | O(1) | — | O(n): scan for the oldest timestamp | no order at all |
| Hash map + heap of last-use times | O(1) | O(log n) and needs the entry index in the heap | O(log n) | every \`get\` changes a priority |
| Hash map + balanced tree by time | O(1) | O(log n) | O(log n) | correct, but not O(1) |
| Hash map + **singly** linked list | O(1) to the node | **O(n)**: must find the previous node | **O(n)**: must find the node before the tail | a node cannot reach its predecessor |
| Hash map + **doubly** linked list | O(1) to the node | **O(1)** | **O(1)** | none: this is the answer |

The heap and tree rows are real options when O(log n) is acceptable; see [the cost of common operations on arrays, hash maps and trees](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance) for the background costs.

## 4. Why "Singly" Is Not Enough

To remove node B from a list, the node **before** B must be changed to point past it. In a singly linked list B only knows its successor:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="Singly linked list head, A, B, C. To remove B, A must point to C, but B has no link back to A, so the code has to walk from the head to find A.">
  <defs>
  <marker id="b32q3py-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="110" height="56" rx="8"/>
  <text class="d-text" x="75" y="73" text-anchor="middle">head</text>
  <path class="d-edge" d="M 132 68 L 174 68" marker-end="url(#b32q3py-a1)"/>
  <rect class="d-box" x="180" y="40" width="110" height="56" rx="8"/>
  <text class="d-text" x="235" y="73" text-anchor="middle">A</text>
  <path class="d-edge" d="M 292 68 L 344 68" marker-end="url(#b32q3py-a1)"/>
  <rect class="d-box-accent" x="350" y="40" width="110" height="56" rx="8"/>
  <text class="d-text" x="405" y="73" text-anchor="middle">B</text>
  <path class="d-edge" d="M 462 68 L 514 68" marker-end="url(#b32q3py-a1)"/>
  <rect class="d-box" x="520" y="40" width="110" height="56" rx="8"/>
  <text class="d-text" x="575" y="73" text-anchor="middle">C</text>
  <text class="d-sub" x="405" y="24" text-anchor="middle">remove B</text>
  <path class="d-edge-dashed" d="M 75 100 C 75 170, 235 170, 235 104" marker-end="url(#b32q3py-a1)"/>
  <text class="d-sub" x="155" y="196" text-anchor="middle">walk from head to find A</text>
  <rect class="d-box-muted" x="430" y="140" width="250" height="60" rx="8"/>
  <text class="d-text" x="555" y="166" text-anchor="middle">B has no prev link</text>
  <text class="d-sub" x="555" y="188" text-anchor="middle">so finding A is O(n)</text>
</svg>

The hash map can take us straight to B in O(1), but it cannot tell us who A is. The only way to find A is to walk from the head, which is O(n). The same problem appears at the other end: evicting the last node needs the node before it. (There is a known trick of copying the next node's data into B and deleting the next node instead, but it fails for the last node, and it moves keys between nodes, so every moved key's map entry would have to be updated.)

📌 **Interview term: Predecessor problem** — in a singly linked list, unlinking a node needs its predecessor, and finding the predecessor costs O(n) unless something else stores it.

## 5. Why "Doubly" Fixes It

Give every node a \`prev\` link as well as \`next\`. Now unlinking B needs no search: B tells us both neighbours.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="Doubly linked list A, B, C. To unlink B, set A.next to C and C.prev to A. B knows both neighbours, so this takes two pointer writes and no search.">
  <defs>
  <marker id="b32q3py-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="100" width="120" height="56" rx="8"/>
  <text class="d-text" x="100" y="133" text-anchor="middle">A</text>
  <rect class="d-box-muted" x="290" y="100" width="120" height="56" rx="8"/>
  <text class="d-text" x="350" y="133" text-anchor="middle">B</text>
  <rect class="d-box" x="540" y="100" width="120" height="56" rx="8"/>
  <text class="d-text" x="600" y="133" text-anchor="middle">C</text>
  <path class="d-edge-dashed" d="M 162 116 L 284 116" marker-end="url(#b32q3py-a2)"/>
  <path class="d-edge-dashed" d="M 412 116 L 534 116" marker-end="url(#b32q3py-a2)"/>
  <path class="d-edge-dashed" d="M 538 142 L 416 142" marker-end="url(#b32q3py-a2)"/>
  <path class="d-edge-dashed" d="M 288 142 L 166 142" marker-end="url(#b32q3py-a2)"/>
  <path class="d-edge-accent" d="M 100 96 C 100 30, 600 30, 600 92" marker-end="url(#b32q3py-a2)"/>
  <text class="d-text" x="350" y="40" text-anchor="middle">write 1: A.next = C</text>
  <path class="d-edge-accent" d="M 600 160 C 600 226, 100 226, 100 164" marker-end="url(#b32q3py-a2)"/>
  <text class="d-text" x="350" y="230" text-anchor="middle">write 2: C.prev = A</text>
</svg>

Unlinking is 2 pointer writes, inserting at the front is 4 more, so "move to front" is at most 6 pointer writes, whatever the size of the cache. Example 2 counts them.

📌 **Interview term: Doubly linked list** — each node links to both its successor and its predecessor, so any node can be removed in O(1) once you hold a reference to it.

The last piece is to make the hash map store **the node itself**, not an index or a copy of the value. Then a lookup lands directly on the node we need to move:

<svg class="iq-diagram" width="100%" viewBox="0 0 770 290" role="img" aria-label="A hash map from key to node sits above a doubly linked list: head sentinel, key 7, key 3, key 9, tail sentinel. Each node links to both neighbours. The node next to head is the most recently used and the node next to tail is the least recently used.">
  <defs>
    <marker id="b32q3py-a3" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="170" y="20" width="430" height="70" rx="10"/>
  <text class="d-text" x="385" y="50" text-anchor="middle">hash map: key to node</text>
  <text class="d-sub" x="385" y="74" text-anchor="middle">O(1) jump to any node</text>
  <path class="d-edge-dashed" d="M 225 92 L 225 152" marker-end="url(#b32q3py-a3)"/>
  <path class="d-edge-dashed" d="M 385 92 L 385 152" marker-end="url(#b32q3py-a3)"/>
  <path class="d-edge-dashed" d="M 545 92 L 545 152" marker-end="url(#b32q3py-a3)"/>
  <rect class="d-box-muted" x="20" y="160" width="100" height="60" rx="8"/>
  <text class="d-text" x="70" y="186" text-anchor="middle">head</text>
  <text class="d-sub" x="70" y="208" text-anchor="middle">sentinel</text>
  <rect class="d-box" x="170" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="225" y="186" text-anchor="middle">key 7</text>
  <text class="d-sub" x="225" y="208" text-anchor="middle">value 70</text>
  <rect class="d-box" x="330" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="385" y="186" text-anchor="middle">key 3</text>
  <text class="d-sub" x="385" y="208" text-anchor="middle">value 30</text>
  <rect class="d-box" x="490" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="545" y="186" text-anchor="middle">key 9</text>
  <text class="d-sub" x="545" y="208" text-anchor="middle">value 90</text>
  <rect class="d-box-muted" x="650" y="160" width="100" height="60" rx="8"/>
  <text class="d-text" x="700" y="186" text-anchor="middle">tail</text>
  <text class="d-sub" x="700" y="208" text-anchor="middle">sentinel</text>
  <path class="d-edge" d="M 122 176 L 164 176" marker-end="url(#b32q3py-a3)"/>
  <path class="d-edge" d="M 168 204 L 126 204" marker-end="url(#b32q3py-a3)"/>
  <path class="d-edge" d="M 282 176 L 324 176" marker-end="url(#b32q3py-a3)"/>
  <path class="d-edge" d="M 328 204 L 286 204" marker-end="url(#b32q3py-a3)"/>
  <path class="d-edge" d="M 442 176 L 484 176" marker-end="url(#b32q3py-a3)"/>
  <path class="d-edge" d="M 488 204 L 446 204" marker-end="url(#b32q3py-a3)"/>
  <path class="d-edge" d="M 602 176 L 644 176" marker-end="url(#b32q3py-a3)"/>
  <path class="d-edge" d="M 648 204 L 606 204" marker-end="url(#b32q3py-a3)"/>
  <text class="d-sub" x="225" y="256" text-anchor="middle">most recent</text>
  <text class="d-sub" x="545" y="256" text-anchor="middle">least recent</text>
</svg>

📌 **Interview term: Hash map to node (handle)** — storing a direct reference to a list node in the map, so a key lookup gives O(1) access to that node.

📌 **Interview term: Sentinel node** — dummy head and tail nodes that are never removed. Every real node always has a real \`prev\` and \`next\`, so \`unlink\` and \`push_front\` have no "is the list empty?" or "is this the first node?" branches.

Two details that interviewers check:

- **The node must store its key.** Eviction starts at the list (\`tail.prev\`) and must then delete that key from the map. Without the key in the node, there is no O(1) way back from the node to its map entry.
- **Evict and delete from the map together.** A node removed from the list but left in the map is a memory leak and makes \`get\` return stale values.

## 6. The Code in Python

Here is the full class from example 1.

~~~python
class Node:
    __slots__ = ("key", "value", "prev", "next")

    def __init__(self, key, value):
        self.key, self.value = key, value
        self.prev = self.next = None


class LRUCache:
    """Hash map (key -> node) + doubly linked list (head side = most recent)."""

    def __init__(self, capacity):
        self.capacity = capacity
        self.map = {}
        self.head, self.tail = Node(None, None), Node(None, None)   # sentinels, never removed
        self.head.next, self.tail.prev = self.tail, self.head
        self.last_evicted = None

    def _unlink(self, node):                  # O(1): the node knows both neighbours
        node.prev.next = node.next
        node.next.prev = node.prev

    def _push_front(self, node):              # O(1): insert right after the head sentinel
        node.prev, node.next = self.head, self.head.next
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        node = self.map.get(key)
        if node is None:
            return -1
        self._unlink(node)
        self._push_front(node)
        return node.value

    def put(self, key, value):
        self.last_evicted = None
        node = self.map.get(key)
        if node is not None:                  # update: new value, now most recent
            node.value = value
            self._unlink(node)
            self._push_front(node)
            return
        if len(self.map) == self.capacity:    # full: evict the node before the tail
            lru = self.tail.prev
            self._unlink(lru)
            del self.map[lru.key]             # the node stores its key for exactly this
            self.last_evicted = lru.key
        node = Node(key, value)
        self.map[key] = node
        self._push_front(node)

    def forward(self):
        out, cur = [], self.head.next
        while cur is not self.tail:
            out.append(cur.key); cur = cur.next
        return out

    def backward(self):
        out, cur = [], self.tail.prev
        while cur is not self.head:
            out.append(cur.key); cur = cur.prev
        return out
~~~

**What to point out in this code:**

- \`__slots__\` on \`Node\` stops Python from giving every node its own \`__dict__\`, which saves memory when the cache holds many nodes. It also turns a typo such as \`node.nxt = ...\` into an \`AttributeError\` instead of a silent new attribute.
- \`self.map.get(key)\` returns \`None\` on a miss, so one lookup answers both "is it there?" and "where is it?".
- The sentinels are compared with \`is\` (\`cur is not self.tail\`), which checks identity. \`==\` would also work here, but \`is\` says what we mean: "this exact object".
- \`_unlink\` only touches the two neighbours; it does not clear \`node.prev\` and \`node.next\`, because \`_push_front\` overwrites both straight away.
- Eviction runs **before** inserting the new node, and only on the new-key path, so an update can never evict.

If you are allowed the library, \`collections.OrderedDict\` gives the same behaviour in a few lines; see [How do you design an LRU cache?](/interview-question/how-do-you-design-an-lru-cache) for that version and [how an LRU cache works internally in Python](/interview-question/how-does-an-lru-cache-work-internally) for how Python's own caches do it.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the hand-written cache with capacity 3, printing the keys from newest to oldest after every call, then checking that walking the \`next\` links and walking the \`prev\` links give the same list and that the list and the map have the same size** prints:

~~~text
put(1, 1)  newest first [1]
put(2, 2)  newest first [2, 1]
put(3, 3)  newest first [3, 2, 1]
get(1) = 1  newest first [1, 3, 2]
put(4, 4) evicted 2  newest first [4, 1, 3]
get(2) = -1  newest first [4, 1, 3]
put(3, 33)  newest first [3, 4, 1]
put(5, 5) evicted 1  newest first [5, 3, 4]
get(4) = 4  newest first [4, 5, 3]
get(3) = 33  newest first [3, 4, 5]
prev and next links agree, list size = map size: true
~~~

\`get(1)\` moved 1 to the front, so \`put(4, 4)\` evicted 2, the oldest. \`put(3, 33)\` updated a key on a full cache without evicting anything, and the final check confirms that every \`prev\` link mirrors a \`next\` link.

**Example 2 — 20,000 requests replayed against three caches that differ only in how they keep the recency order** prints:

~~~text
capacity 10: steps per access: array 9.9, singly linked 7.2, doubly linked 0.0; hits 10041 (same in all three: true)
  doubly linked: at most 6 pointer writes in any single access
capacity 100: steps per access: array 99.4, singly linked 74.5, doubly linked 0.0; hits 9947 (same in all three: true)
  doubly linked: at most 6 pointer writes in any single access
capacity 1000: steps per access: array 943.8, singly linked 705.0, doubly linked 0.0; hits 9672 (same in all three: true)
  doubly linked: at most 6 pointer writes in any single access
~~~

The requests come from the same small pseudo-random generator (\`seed = seed * 48271 % 2147483647\`) in all four languages, so every language counts exactly the same work.

## 8. The Cost Difference, Measured

Example 2 runs the same 20,000 requests (keys drawn from a range twice the capacity) against three caches that all use a hash map for membership but keep the recency order differently. It counts the hidden work: elements scanned or shifted for the array, nodes walked to find a predecessor for the singly linked list.

| Capacity | Array (steps per access) | Singly linked list | Doubly linked list |
| :--- | :--- | :--- | :--- |
| 10 | 9.9 | 7.2 | 0.0 |
| 100 | 99.4 | 74.5 | 0.0 |
| 1,000 | 943.8 | 705.0 | 0.0 |

The array and the singly linked list both grow linearly with the capacity: ten times the capacity, about ten times the work per request. The doubly linked list never walks at all, and never makes more than 6 pointer writes in one access. All three return the same number of hits, so the difference is purely cost, not behaviour.

## 9. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`get\` | O(1) average | map lookup (average O(1)), then 2 writes to unlink and 4 to push front |
| \`put\` (update) | O(1) average | map lookup, value write, move to front |
| \`put\` (new key) | O(1) average | map insert, push front, and on overflow unlink \`tail.prev\` and delete its key |
| Space | O(capacity) | one map entry and one node (key, value, two links) per entry, plus two sentinels |

"Average" is the hash map's caveat; the list part is O(1) in the worst case.

## 10. Edge Cases

- **Updating an existing key on a full cache** (\`put(3, 33)\` in example 1): no eviction, the node moves to the front with the new value.
- **A miss** (\`get(2) = -1\` in example 1) must leave the order untouched.
- **Capacity 1:** the single real node is both the most and least recent; sentinels make this case need no extra code.
- **Capacity 0:** with the "evict when full, then insert" order used here, the first \`put\` would try to evict \`tail.prev\`, which is the head sentinel. Guard with \`if capacity == 0: return\` (or the equivalent) if the interviewer allows 0.
- **Getting the most recent key** repeatedly: unlink and push front of the same node must still leave a consistent list; example 1 checks that the \`next\` and \`prev\` chains agree after every operation.

## 11. Related Questions

The broader design (policies, hit rates, threads, TTL) is in [the LRU design question](/interview-question/how-do-you-design-an-lru-cache). The pointer surgery here is the same skill as [reversing a linked list](/interview-question/how-do-you-reverse-a-linked-list) and [removing the nth node from the end](/interview-question/how-do-you-remove-the-nth-node-from-the-end-of-a-linked-list), and the general trade-off between the two structures is in [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).

## Common Pitfalls

- **Forgetting \`del self.map[lru.key]\` on eviction.** The node leaves the list but stays reachable from the map, so \`get\` returns an evicted value and memory grows.
- **Not storing the key in the node.** Eviction finds the node via \`self.tail.prev\` and then has no way to know which dict entry to delete.
- **Updating the value on an existing key without moving the node.** The key looks old and is evicted next, although it was just written.
- **Wrong order of pointer writes in \`_push_front\`.** Setting \`self.head.next = node\` before \`self.head.next.prev = node\` makes the second write point the new node at itself, and the old first node keeps a stale \`prev\`, so backward walks and later unlinks break.
- **Using a \`list\` of keys for the order.** \`list.remove(key)\` and \`list.pop(0)\` are O(n); example 2 measured 943.8 steps per access at capacity 1,000.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Three operations:</strong> <span style="color:#f0e2c8;">Find by key, move any entry to the most-recent end, evict the least-recent end, all O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why both:</strong> <span style="color:#f0e2c8;">The dict finds the node in O(1); the doubly linked list moves or removes it in O(1) because each node knows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why not singly:</strong> <span style="color:#f0e2c8;">Unlinking needs the predecessor, which costs an O(n) walk; I measured 705 steps per access at capacity 1,000 against 0 for the doubly linked list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Details:</strong> <span style="color:#f0e2c8;">Sentinel <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail</code> remove edge cases; the node stores its key so eviction can <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">del self.map[node.key]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Node</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__slots__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict.get</code> for lookup; in production <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OrderedDict.move_to_end</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popitem(last=False)</code> do the same.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a heap of timestamps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> changes an entry priority, which is O(log n) and needs the entry index inside the heap. The list moves the node in O(1) with no reordering of anything else.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the node keep its key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Eviction starts from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self.tail.prev</code>, a node. To delete its dict entry in O(1) we need its key, so the node carries it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are the sentinels for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With a dummy head and tail, every real node always has real neighbours, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_unlink</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_push_front</code> need no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> checks for the first, last or only node.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dict</code> lookup really O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On average, yes; in the worst case many keys collide and it degrades. That is why we say O(1) average for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">OrderedDict</code> relate to this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It offers exactly the operations we built: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">move_to_end(key)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popitem(last=False)</code>. We timed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">move_to_end</code> at about 70 ns for both 1,000 and 1,000,000 keys.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Recency order** | Entries sorted by time of last use; LRU evicts the oldest |
| **Predecessor problem** | A singly linked node cannot reach the node before it without an O(n) walk |
| **Doubly linked list** | Each node links to both neighbours, so it can be unlinked in O(1) |
| **Hash map to node (handle)** | The map stores a direct reference to the list node, not a copy or an index |
| **Sentinel node** | A dummy head or tail that is never removed, so no empty-list special cases |

---
**Conclusion:** An O(1) LRU cache needs three operations to be constant time: find by key, move any entry to the most-recent end, and evict the least-recent end. A hash map does the first; only a doubly linked list does the other two, because each node can be unlinked using its own \`prev\` and \`next\` links, while an array shifts elements and a singly linked list must walk to find a predecessor (943.8 and 705.0 steps per access at capacity 1,000 in our measurement, against zero). The map stores the node itself, the node stores its key for eviction, and sentinels remove the edge cases. In Python that is a small \`Node\` class with \`__slots__\`, a dict and two sentinels; \`OrderedDict\` is the same idea packaged.`,
        examples: [
          {
            label: `Hand-written hash map + doubly linked list with sentinels, checked after every call`,
            code: `class Node:
    __slots__ = ("key", "value", "prev", "next")

    def __init__(self, key, value):
        self.key, self.value = key, value
        self.prev = self.next = None


class LRUCache:
    """Hash map (key -> node) + doubly linked list (head side = most recent)."""

    def __init__(self, capacity):
        self.capacity = capacity
        self.map = {}
        self.head, self.tail = Node(None, None), Node(None, None)   # sentinels, never removed
        self.head.next, self.tail.prev = self.tail, self.head
        self.last_evicted = None

    def _unlink(self, node):                  # O(1): the node knows both neighbours
        node.prev.next = node.next
        node.next.prev = node.prev

    def _push_front(self, node):              # O(1): insert right after the head sentinel
        node.prev, node.next = self.head, self.head.next
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        node = self.map.get(key)
        if node is None:
            return -1
        self._unlink(node)
        self._push_front(node)
        return node.value

    def put(self, key, value):
        self.last_evicted = None
        node = self.map.get(key)
        if node is not None:                  # update: new value, now most recent
            node.value = value
            self._unlink(node)
            self._push_front(node)
            return
        if len(self.map) == self.capacity:    # full: evict the node before the tail
            lru = self.tail.prev
            self._unlink(lru)
            del self.map[lru.key]             # the node stores its key for exactly this
            self.last_evicted = lru.key
        node = Node(key, value)
        self.map[key] = node
        self._push_front(node)

    def forward(self):
        out, cur = [], self.head.next
        while cur is not self.tail:
            out.append(cur.key); cur = cur.next
        return out

    def backward(self):
        out, cur = [], self.tail.prev
        while cur is not self.head:
            out.append(cur.key); cur = cur.prev
        return out


c = LRUCache(3)
for op in [("put", 1, 1), ("put", 2, 2), ("put", 3, 3), ("get", 1), ("put", 4, 4),
           ("get", 2), ("put", 3, 33), ("put", 5, 5), ("get", 4), ("get", 3)]:
    if op[0] == "get":
        text = "get(" + str(op[1]) + ") = " + str(c.get(op[1]))
    else:
        c.put(op[1], op[2])
        text = "put(" + str(op[1]) + ", " + str(op[2]) + ")"
        if c.last_evicted is not None:
            text += " evicted " + str(c.last_evicted)
    print(text + "  newest first " + str(c.forward()))
ok = c.forward() == c.backward()[::-1] and len(c.forward()) == len(c.map)
print("prev and next links agree, list size = map size: " + str(ok).lower())`,
          },
          {
            label: `Array vs singly vs doubly linked list: hidden steps per access as capacity grows`,
            code: `# Three ways to keep the recency order of an LRU cache, all with a hash map for
# membership. "steps" counts list elements visited or shifted, which is the
# hidden O(n) work; the doubly linked list never walks.

seed = 7
def rand():
    global seed
    seed = seed * 48271 % 2147483647
    return seed

def array_steps(reqs, cap):
    order, present, steps, hits = [], set(), 0, 0     # order[0] = least recent
    for k in reqs:
        if k in present:
            hits += 1
            i = 0
            while order[i] != k:                      # find it: i + 1 comparisons
                i += 1
            steps += (i + 1) + (len(order) - 1 - i)   # ... then shift the rest left
            order.pop(i); order.append(k)
        else:
            present.add(k); order.append(k)
            if len(order) > cap:
                steps += len(order) - 1               # pop(0) shifts every element
                present.discard(order.pop(0))
    return steps, hits

class SNode:
    def __init__(self, key):
        self.key, self.next = key, None

def singly_steps(reqs, cap):
    head, nodes, steps, hits = None, {}, 0, 0          # head = most recent
    for k in reqs:
        if k in nodes:
            hits += 1
            node = nodes[k]
            if node is head:
                continue
            prev = head
            steps += 1
            while prev.next is not node:              # no prev pointer: walk to find it
                prev = prev.next; steps += 1
            prev.next = node.next
            node.next, head = head, node
        else:
            node = SNode(k); node.next, head = head, node; nodes[k] = node
            if len(nodes) > cap:
                prev = head
                steps += 1
                while prev.next.next is not None:     # walk to the node before the tail
                    prev = prev.next; steps += 1
                del nodes[prev.next.key]
                prev.next = None
    return steps, hits

class DNode:
    def __init__(self, key):
        self.key, self.prev, self.next = key, None, None

def doubly_steps(reqs, cap):
    head, tail = DNode(None), DNode(None)             # sentinels
    head.next, tail.prev = tail, head
    nodes, hits, most_writes = {}, 0, 0
    for k in reqs:
        writes = 0
        if k in nodes:
            hits += 1
            node = nodes[k]
            node.prev.next, node.next.prev = node.next, node.prev    # unlink: 2 writes
            writes += 2
        else:
            node = DNode(k); nodes[k] = node
            if len(nodes) > cap:
                lru = tail.prev                                     # no walk: tail.prev
                lru.prev.next, tail.prev = tail, lru.prev           # unlink: 2 writes
                writes += 2
                del nodes[lru.key]
        node.prev, node.next = head, head.next                      # push front: 4 writes
        head.next.prev, head.next = node, node
        writes += 4
        most_writes = max(most_writes, writes)
    return 0, hits, most_writes                       # 0 steps: there is no loop to count

def avg(steps, n):
    t = steps * 10 // n
    return str(t // 10) + "." + str(t % 10)

for cap in [10, 100, 1000]:
    seed = 7
    reqs = [rand() % (2 * cap) for _ in range(20000)]
    a, ha = array_steps(reqs, cap)
    s, hs = singly_steps(reqs, cap)
    d, hd, w = doubly_steps(reqs, cap)
    print("capacity " + str(cap) + ": steps per access: array " + avg(a, len(reqs)) + ", singly linked "
          + avg(s, len(reqs)) + ", doubly linked " + avg(d, len(reqs)) + "; hits " + str(ha)
          + " (same in all three: " + str(ha == hs == hd).lower() + ")")
    print("  doubly linked: at most " + str(w) + " pointer writes in any single access")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Implement an LRU cache in JavaScript with get and put both in O(1), without relying on Map insertion order. Explain why you need a doubly linked list together with a hash map, and what would go wrong with an array or a singly linked list."

**What a strong answer should cover:**
- The three required operations: find by key, move any entry to the most-recent end, evict the least-recent end, all in O(1).
- Why each alternative fails: array of keys (\`splice\`/\`shift\` are O(n)), map only (no order), heap or tree (O(log n)), singly linked list (O(n) to find the predecessor).
- Doubly linked list with sentinel head and tail; a \`Map\` from key to node; the node stores its key for eviction.
- Exact steps: unlink is 2 pointer writes, push front 4; eviction is \`tail.prev\` plus \`map.delete(node.key)\`.
- JavaScript details: \`Map\` rather than a plain object (any key type, no string conversion), \`undefined\` on a miss, and the shorter \`Map\`-order version as a follow-up.

**Clarifying questions expected:**
- May I rely on \`Map\` insertion order, or should I build the list myself?
- Does \`put\` on an existing key count as a use?
- Can capacity be 0?

**Code / implementation expected:** Yes — an \`LRUCache\` class with a \`Node\` class, a \`Map\` and two sentinels in JavaScript.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know classes and references in JavaScript and want to justify the LRU design, not just recite it.  
**Difficulty:** Hard  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think of a queue of people at a coffee shop where the barista has a strange rule: **whoever just ordered goes to the back of the line, and when the shop is full, the person at the front has to leave.** The person at the front is the one who has waited longest since their last order, the "least recently used" customer.

Two things must be fast. When someone orders, the barista must find that person instantly, no matter where they stand. And the barista must be able to pull that person out of the middle of the line and send them to the back without everyone else shuffling a step.

Finding a person instantly is a job for a **hash map** (a name-to-position directory). Pulling someone out of the middle of a line instantly needs each person to hold hands with **both** neighbours, so the two neighbours can simply join hands when the person leaves. That is a **doubly linked list**. This question is about why you need exactly those two structures, and why every simpler option is O(n) or O(log n) somewhere.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must both \`get\` and \`put\` be O(1), or just one? | O(1) for both is what forces the doubly linked list; O(log n) would allow a tree. |
| Does \`put\` on an existing key count as a use? | In LeetCode 146 it does, so \`put\` also needs the "move to front" operation. |
| May I use the built-in ordered map, or should I build the list myself? | The interviewer usually wants the list by hand, and the built-in as a follow-up. |
| What does \`get\` return on a miss? | Usually -1; it must not change the order. |
| Can the capacity be 0 or 1? | Both are good test cases for the eviction code. |

## 3. The Three Operations We Need in O(1)

Strip the cache down to what it does to its data, and there are exactly three operations:

1. **Find by key**: is the key present, and where is its entry?
2. **Move an entry to the "most recent" end**: on every hit and every update. The entry can be **anywhere** in the order.
3. **Remove the entry at the "least recent" end**: on eviction, and also delete its key.

📌 **Interview term: Recency order** — the entries sorted by time of last use; LRU always evicts the oldest one.

Operation 1 is a hash map (see [how a hash table works](/interview-question/how-does-a-hash-table-work)). Operations 2 and 3 are list surgery: cut a node out of the middle, insert it at one end, and delete at the other end. Here is how the candidates do:

| Structure for the order | Find key | Move to most recent | Evict least recent | Problem |
| :--- | :--- | :--- | :--- | :--- |
| Array / dynamic array of keys | O(n) scan | O(n) shift | O(n) shift from the front | every move shifts elements |
| Hash map only | O(1) | — | O(n): scan for the oldest timestamp | no order at all |
| Hash map + heap of last-use times | O(1) | O(log n) and needs the entry index in the heap | O(log n) | every \`get\` changes a priority |
| Hash map + balanced tree by time | O(1) | O(log n) | O(log n) | correct, but not O(1) |
| Hash map + **singly** linked list | O(1) to the node | **O(n)**: must find the previous node | **O(n)**: must find the node before the tail | a node cannot reach its predecessor |
| Hash map + **doubly** linked list | O(1) to the node | **O(1)** | **O(1)** | none: this is the answer |

The heap and tree rows are real options when O(log n) is acceptable; see [the cost of common operations on arrays, hash maps and trees](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance) for the background costs.

## 4. Why "Singly" Is Not Enough

To remove node B from a list, the node **before** B must be changed to point past it. In a singly linked list B only knows its successor:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="Singly linked list head, A, B, C. To remove B, A must point to C, but B has no link back to A, so the code has to walk from the head to find A.">
  <defs>
  <marker id="b32q3ja-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="110" height="56" rx="8"/>
  <text class="d-text" x="75" y="73" text-anchor="middle">head</text>
  <path class="d-edge" d="M 132 68 L 174 68" marker-end="url(#b32q3ja-a1)"/>
  <rect class="d-box" x="180" y="40" width="110" height="56" rx="8"/>
  <text class="d-text" x="235" y="73" text-anchor="middle">A</text>
  <path class="d-edge" d="M 292 68 L 344 68" marker-end="url(#b32q3ja-a1)"/>
  <rect class="d-box-accent" x="350" y="40" width="110" height="56" rx="8"/>
  <text class="d-text" x="405" y="73" text-anchor="middle">B</text>
  <path class="d-edge" d="M 462 68 L 514 68" marker-end="url(#b32q3ja-a1)"/>
  <rect class="d-box" x="520" y="40" width="110" height="56" rx="8"/>
  <text class="d-text" x="575" y="73" text-anchor="middle">C</text>
  <text class="d-sub" x="405" y="24" text-anchor="middle">remove B</text>
  <path class="d-edge-dashed" d="M 75 100 C 75 170, 235 170, 235 104" marker-end="url(#b32q3ja-a1)"/>
  <text class="d-sub" x="155" y="196" text-anchor="middle">walk from head to find A</text>
  <rect class="d-box-muted" x="430" y="140" width="250" height="60" rx="8"/>
  <text class="d-text" x="555" y="166" text-anchor="middle">B has no prev link</text>
  <text class="d-sub" x="555" y="188" text-anchor="middle">so finding A is O(n)</text>
</svg>

The hash map can take us straight to B in O(1), but it cannot tell us who A is. The only way to find A is to walk from the head, which is O(n). The same problem appears at the other end: evicting the last node needs the node before it. (There is a known trick of copying the next node's data into B and deleting the next node instead, but it fails for the last node, and it moves keys between nodes, so every moved key's map entry would have to be updated.)

📌 **Interview term: Predecessor problem** — in a singly linked list, unlinking a node needs its predecessor, and finding the predecessor costs O(n) unless something else stores it.

## 5. Why "Doubly" Fixes It

Give every node a \`prev\` link as well as \`next\`. Now unlinking B needs no search: B tells us both neighbours.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="Doubly linked list A, B, C. To unlink B, set A.next to C and C.prev to A. B knows both neighbours, so this takes two pointer writes and no search.">
  <defs>
  <marker id="b32q3ja-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="100" width="120" height="56" rx="8"/>
  <text class="d-text" x="100" y="133" text-anchor="middle">A</text>
  <rect class="d-box-muted" x="290" y="100" width="120" height="56" rx="8"/>
  <text class="d-text" x="350" y="133" text-anchor="middle">B</text>
  <rect class="d-box" x="540" y="100" width="120" height="56" rx="8"/>
  <text class="d-text" x="600" y="133" text-anchor="middle">C</text>
  <path class="d-edge-dashed" d="M 162 116 L 284 116" marker-end="url(#b32q3ja-a2)"/>
  <path class="d-edge-dashed" d="M 412 116 L 534 116" marker-end="url(#b32q3ja-a2)"/>
  <path class="d-edge-dashed" d="M 538 142 L 416 142" marker-end="url(#b32q3ja-a2)"/>
  <path class="d-edge-dashed" d="M 288 142 L 166 142" marker-end="url(#b32q3ja-a2)"/>
  <path class="d-edge-accent" d="M 100 96 C 100 30, 600 30, 600 92" marker-end="url(#b32q3ja-a2)"/>
  <text class="d-text" x="350" y="40" text-anchor="middle">write 1: A.next = C</text>
  <path class="d-edge-accent" d="M 600 160 C 600 226, 100 226, 100 164" marker-end="url(#b32q3ja-a2)"/>
  <text class="d-text" x="350" y="230" text-anchor="middle">write 2: C.prev = A</text>
</svg>

Unlinking is 2 pointer writes, inserting at the front is 4 more, so "move to front" is at most 6 pointer writes, whatever the size of the cache. Example 2 counts them.

📌 **Interview term: Doubly linked list** — each node links to both its successor and its predecessor, so any node can be removed in O(1) once you hold a reference to it.

The last piece is to make the hash map store **the node itself**, not an index or a copy of the value. Then a lookup lands directly on the node we need to move:

<svg class="iq-diagram" width="100%" viewBox="0 0 770 290" role="img" aria-label="A hash map from key to node sits above a doubly linked list: head sentinel, key 7, key 3, key 9, tail sentinel. Each node links to both neighbours. The node next to head is the most recently used and the node next to tail is the least recently used.">
  <defs>
    <marker id="b32q3ja-a3" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="170" y="20" width="430" height="70" rx="10"/>
  <text class="d-text" x="385" y="50" text-anchor="middle">hash map: key to node</text>
  <text class="d-sub" x="385" y="74" text-anchor="middle">O(1) jump to any node</text>
  <path class="d-edge-dashed" d="M 225 92 L 225 152" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge-dashed" d="M 385 92 L 385 152" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge-dashed" d="M 545 92 L 545 152" marker-end="url(#b32q3ja-a3)"/>
  <rect class="d-box-muted" x="20" y="160" width="100" height="60" rx="8"/>
  <text class="d-text" x="70" y="186" text-anchor="middle">head</text>
  <text class="d-sub" x="70" y="208" text-anchor="middle">sentinel</text>
  <rect class="d-box" x="170" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="225" y="186" text-anchor="middle">key 7</text>
  <text class="d-sub" x="225" y="208" text-anchor="middle">value 70</text>
  <rect class="d-box" x="330" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="385" y="186" text-anchor="middle">key 3</text>
  <text class="d-sub" x="385" y="208" text-anchor="middle">value 30</text>
  <rect class="d-box" x="490" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="545" y="186" text-anchor="middle">key 9</text>
  <text class="d-sub" x="545" y="208" text-anchor="middle">value 90</text>
  <rect class="d-box-muted" x="650" y="160" width="100" height="60" rx="8"/>
  <text class="d-text" x="700" y="186" text-anchor="middle">tail</text>
  <text class="d-sub" x="700" y="208" text-anchor="middle">sentinel</text>
  <path class="d-edge" d="M 122 176 L 164 176" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge" d="M 168 204 L 126 204" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge" d="M 282 176 L 324 176" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge" d="M 328 204 L 286 204" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge" d="M 442 176 L 484 176" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge" d="M 488 204 L 446 204" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge" d="M 602 176 L 644 176" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge" d="M 648 204 L 606 204" marker-end="url(#b32q3ja-a3)"/>
  <text class="d-sub" x="225" y="256" text-anchor="middle">most recent</text>
  <text class="d-sub" x="545" y="256" text-anchor="middle">least recent</text>
</svg>

📌 **Interview term: Hash map to node (handle)** — storing a direct reference to a list node in the map, so a key lookup gives O(1) access to that node.

📌 **Interview term: Sentinel node** — dummy head and tail nodes that are never removed. Every real node always has a real \`prev\` and \`next\`, so \`unlink\` and \`push_front\` have no "is the list empty?" or "is this the first node?" branches.

Two details that interviewers check:

- **The node must store its key.** Eviction starts at the list (\`tail.prev\`) and must then delete that key from the map. Without the key in the node, there is no O(1) way back from the node to its map entry.
- **Evict and delete from the map together.** A node removed from the list but left in the map is a memory leak and makes \`get\` return stale values.

## 6. The Code in JavaScript

Here is the full class from example 1.

~~~javascript
class Node {
  constructor(key, value) {
    this.key = key; this.value = value;
    this.prev = null; this.next = null;
  }
}

// Hash map (key -> node) + doubly linked list (head side = most recent).
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
    this.head = new Node(null, null);          // sentinels, never removed
    this.tail = new Node(null, null);
    this.head.next = this.tail; this.tail.prev = this.head;
    this.lastEvicted = null;
  }

  unlink(node) {                               // O(1): the node knows both neighbours
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  pushFront(node) {                            // O(1): insert right after the head sentinel
    node.prev = this.head; node.next = this.head.next;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    const node = this.map.get(key);
    if (node === undefined) return -1;
    this.unlink(node); this.pushFront(node);
    return node.value;
  }

  put(key, value) {
    this.lastEvicted = null;
    const node = this.map.get(key);
    if (node !== undefined) {                  // update: new value, now most recent
      node.value = value;
      this.unlink(node); this.pushFront(node);
      return;
    }
    if (this.map.size === this.capacity) {     // full: evict the node before the tail
      const lru = this.tail.prev;
      this.unlink(lru);
      this.map.delete(lru.key);                // the node stores its key for exactly this
      this.lastEvicted = lru.key;
    }
    const fresh = new Node(key, value);
    this.map.set(key, fresh);
    this.pushFront(fresh);
  }

  forward() {
    const out = [];
    for (let cur = this.head.next; cur !== this.tail; cur = cur.next) out.push(cur.key);
    return out;
  }

  // backward() walks the prev links for the final check
}
~~~

**What to point out in this code:**

- The map is a \`Map\`, not a plain object: keys can be numbers or any other value without being turned into strings, and \`map.size\` is O(1).
- \`this.map.get(key)\` returns \`undefined\` on a miss; comparing with \`undefined\` (not a truthiness check) is correct even if a node could ever be falsy.
- \`unlink\` only touches the two neighbours; it does not reset \`node.prev\` and \`node.next\`, because \`pushFront\` overwrites both straight away.
- Eviction runs **before** inserting the new node, and only on the new-key path, so an update can never evict.
- Each \`Node\` is an ordinary object with four properties. Creating them all with the same property order in the constructor keeps their shape consistent, which JavaScript engines optimise well.

\`Array.prototype.splice(i, 1)\` and \`shift()\` look like one call but move every later element; example 2 measured 943.8 steps per access at capacity 1,000 for the array version. If you are allowed to rely on \`Map\` order, see [How do you design an LRU cache?](/interview-question/how-do-you-design-an-lru-cache) for the short version, and [Implement LRU Cache (get/put with O(1))](/interview-question/implement-lru-cache-get-put-with-o-1) on this site.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22; the same scripts also run in the page, since they use only \`console.log\`). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the hand-written cache with capacity 3, printing the keys from newest to oldest after every call, then checking that walking the \`next\` links and walking the \`prev\` links give the same list and that the list and the map have the same size** prints:

~~~text
put(1, 1)  newest first [1]
put(2, 2)  newest first [2, 1]
put(3, 3)  newest first [3, 2, 1]
get(1) = 1  newest first [1, 3, 2]
put(4, 4) evicted 2  newest first [4, 1, 3]
get(2) = -1  newest first [4, 1, 3]
put(3, 33)  newest first [3, 4, 1]
put(5, 5) evicted 1  newest first [5, 3, 4]
get(4) = 4  newest first [4, 5, 3]
get(3) = 33  newest first [3, 4, 5]
prev and next links agree, list size = map size: true
~~~

\`get(1)\` moved 1 to the front, so \`put(4, 4)\` evicted 2, the oldest. \`put(3, 33)\` updated a key on a full cache without evicting anything, and the final check confirms that every \`prev\` link mirrors a \`next\` link.

**Example 2 — 20,000 requests replayed against three caches that differ only in how they keep the recency order** prints:

~~~text
capacity 10: steps per access: array 9.9, singly linked 7.2, doubly linked 0.0; hits 10041 (same in all three: true)
  doubly linked: at most 6 pointer writes in any single access
capacity 100: steps per access: array 99.4, singly linked 74.5, doubly linked 0.0; hits 9947 (same in all three: true)
  doubly linked: at most 6 pointer writes in any single access
capacity 1000: steps per access: array 943.8, singly linked 705.0, doubly linked 0.0; hits 9672 (same in all three: true)
  doubly linked: at most 6 pointer writes in any single access
~~~

The requests come from the same small pseudo-random generator (\`seed = seed * 48271 % 2147483647\`) in all four languages, so every language counts exactly the same work.

## 8. The Cost Difference, Measured

Example 2 runs the same 20,000 requests (keys drawn from a range twice the capacity) against three caches that all use a hash map for membership but keep the recency order differently. It counts the hidden work: elements scanned or shifted for the array, nodes walked to find a predecessor for the singly linked list.

| Capacity | Array (steps per access) | Singly linked list | Doubly linked list |
| :--- | :--- | :--- | :--- |
| 10 | 9.9 | 7.2 | 0.0 |
| 100 | 99.4 | 74.5 | 0.0 |
| 1,000 | 943.8 | 705.0 | 0.0 |

The array and the singly linked list both grow linearly with the capacity: ten times the capacity, about ten times the work per request. The doubly linked list never walks at all, and never makes more than 6 pointer writes in one access. All three return the same number of hits, so the difference is purely cost, not behaviour.

## 9. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`get\` | O(1) average | map lookup (average O(1)), then 2 writes to unlink and 4 to push front |
| \`put\` (update) | O(1) average | map lookup, value write, move to front |
| \`put\` (new key) | O(1) average | map insert, push front, and on overflow unlink \`tail.prev\` and delete its key |
| Space | O(capacity) | one map entry and one node (key, value, two links) per entry, plus two sentinels |

"Average" is the hash map's caveat; the list part is O(1) in the worst case.

## 10. Edge Cases

- **Updating an existing key on a full cache** (\`put(3, 33)\` in example 1): no eviction, the node moves to the front with the new value.
- **A miss** (\`get(2) = -1\` in example 1) must leave the order untouched.
- **Capacity 1:** the single real node is both the most and least recent; sentinels make this case need no extra code.
- **Capacity 0:** with the "evict when full, then insert" order used here, the first \`put\` would try to evict \`tail.prev\`, which is the head sentinel. Guard with \`if capacity == 0: return\` (or the equivalent) if the interviewer allows 0.
- **Getting the most recent key** repeatedly: unlink and push front of the same node must still leave a consistent list; example 1 checks that the \`next\` and \`prev\` chains agree after every operation.

## 11. Related Questions

The broader design (policies, hit rates, threads, TTL) is in [the LRU design question](/interview-question/how-do-you-design-an-lru-cache). The pointer surgery here is the same skill as [reversing a linked list](/interview-question/how-do-you-reverse-a-linked-list) and [removing the nth node from the end](/interview-question/how-do-you-remove-the-nth-node-from-the-end-of-a-linked-list), and the general trade-off between the two structures is in [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).

## Common Pitfalls

- **Forgetting \`this.map.delete(lru.key)\` on eviction.** The node leaves the list but stays in the map, so \`get\` returns an evicted value and memory grows.
- **Not storing the key in the node.** Eviction finds the node via \`this.tail.prev\` and then cannot tell which map entry to delete.
- **Wrong order of pointer writes in \`pushFront\`.** Setting \`this.head.next = node\` before \`this.head.next.prev = node\` makes the second write point the new node at itself, and the old first node keeps a stale \`prev\`, so backward walks and later unlinks break.
- **Using a plain object as the map.** Keys become strings, so \`1\` and \`'1'\` collide, and lookups of keys like \`'__proto__'\` misbehave.
- **Using an array for the order.** \`indexOf\` + \`splice\` + \`shift\` are all O(n); the cache passes small tests and then slows down linearly with its capacity.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Three operations:</strong> <span style="color:#f0e2c8;">Find by key, move any entry to the most-recent end, evict the least-recent end, all O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why both:</strong> <span style="color:#f0e2c8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> finds the node in O(1); the doubly linked list moves or removes it in O(1) because each node knows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why not singly:</strong> <span style="color:#f0e2c8;">Unlinking needs the predecessor, which costs an O(n) walk; I measured 705 steps per access at capacity 1,000 against 0 for the doubly linked list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Details:</strong> <span style="color:#f0e2c8;">Sentinel <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail</code> remove edge cases; the node stores its key so eviction can call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map.delete(node.key)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> for key to node; in production a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> alone works too, because delete-then-set moves a key to the end of its iteration order.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a heap of timestamps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> changes an entry priority, which is O(log n) and needs the entry index inside the heap. The list moves the node in O(1) with no reordering of anything else.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the node keep its key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Eviction starts from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this.tail.prev</code>, a node. To delete its map entry in O(1) we need its key, so the node carries it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are the sentinels for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With a dummy head and tail, every real node always has real neighbours, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unlink</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pushFront</code> need no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> checks for the first, last or only node.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can, and it is shorter. But the specification only promises sublinear average access for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>, and the interviewer wants to see the O(1) relinking that makes the design work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add a TTL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expiresAt</code> in the node, treat an expired node as a miss in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> and unlink it there; the list order is unchanged otherwise.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Recency order** | Entries sorted by time of last use; LRU evicts the oldest |
| **Predecessor problem** | A singly linked node cannot reach the node before it without an O(n) walk |
| **Doubly linked list** | Each node links to both neighbours, so it can be unlinked in O(1) |
| **Hash map to node (handle)** | The map stores a direct reference to the list node, not a copy or an index |
| **Sentinel node** | A dummy head or tail that is never removed, so no empty-list special cases |

---
**Conclusion:** An O(1) LRU cache needs three operations to be constant time: find by key, move any entry to the most-recent end, and evict the least-recent end. A hash map does the first; only a doubly linked list does the other two, because each node can be unlinked using its own \`prev\` and \`next\` links, while an array shifts elements and a singly linked list must walk to find a predecessor (943.8 and 705.0 steps per access at capacity 1,000 in our measurement, against zero). The map stores the node itself, the node stores its key for eviction, and sentinels remove the edge cases. In JavaScript that is a \`Node\` class, a \`Map\` and two sentinels; a bare \`Map\` with delete-then-set is the packaged shortcut.`,
        examples: [
          {
            label: `Hand-written hash map + doubly linked list with sentinels, checked after every call`,
            code: `class Node {
  constructor(key, value) {
    this.key = key; this.value = value;
    this.prev = null; this.next = null;
  }
}

// Hash map (key -> node) + doubly linked list (head side = most recent).
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
    this.head = new Node(null, null);          // sentinels, never removed
    this.tail = new Node(null, null);
    this.head.next = this.tail; this.tail.prev = this.head;
    this.lastEvicted = null;
  }

  unlink(node) {                               // O(1): the node knows both neighbours
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  pushFront(node) {                            // O(1): insert right after the head sentinel
    node.prev = this.head; node.next = this.head.next;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    const node = this.map.get(key);
    if (node === undefined) return -1;
    this.unlink(node); this.pushFront(node);
    return node.value;
  }

  put(key, value) {
    this.lastEvicted = null;
    const node = this.map.get(key);
    if (node !== undefined) {                  // update: new value, now most recent
      node.value = value;
      this.unlink(node); this.pushFront(node);
      return;
    }
    if (this.map.size === this.capacity) {     // full: evict the node before the tail
      const lru = this.tail.prev;
      this.unlink(lru);
      this.map.delete(lru.key);                // the node stores its key for exactly this
      this.lastEvicted = lru.key;
    }
    const fresh = new Node(key, value);
    this.map.set(key, fresh);
    this.pushFront(fresh);
  }

  forward() {
    const out = [];
    for (let cur = this.head.next; cur !== this.tail; cur = cur.next) out.push(cur.key);
    return out;
  }

  backward() {
    const out = [];
    for (let cur = this.tail.prev; cur !== this.head; cur = cur.prev) out.push(cur.key);
    return out;
  }
}

const fmt = arr => '[' + arr.join(', ') + ']';
const c = new LRUCache(3);
const ops = [['put', 1, 1], ['put', 2, 2], ['put', 3, 3], ['get', 1], ['put', 4, 4],
  ['get', 2], ['put', 3, 33], ['put', 5, 5], ['get', 4], ['get', 3]];
for (const op of ops) {
  let text;
  if (op[0] === 'get') {
    text = 'get(' + op[1] + ') = ' + c.get(op[1]);
  } else {
    c.put(op[1], op[2]);
    text = 'put(' + op[1] + ', ' + op[2] + ')';
    if (c.lastEvicted !== null) text += ' evicted ' + c.lastEvicted;
  }
  console.log(text + '  newest first ' + fmt(c.forward()));
}
const ok = fmt(c.forward()) === fmt(c.backward().reverse()) && c.forward().length === c.map.size;
console.log('prev and next links agree, list size = map size: ' + ok);`,
          },
          {
            label: `Array vs singly vs doubly linked list: hidden steps per access as capacity grows`,
            code: `// Three ways to keep the recency order of an LRU cache, all with a hash map for
// membership. "steps" counts list elements visited or shifted, which is the
// hidden O(n) work; the doubly linked list never walks.
let seed = 7;
function rand() { seed = (seed * 48271) % 2147483647; return seed; }

function arraySteps(reqs, cap) {
  const order = [], present = new Set();      // order[0] = least recent
  let steps = 0, hits = 0;
  for (const k of reqs) {
    if (present.has(k)) {
      hits++;
      let i = 0;
      while (order[i] !== k) i++;             // find it: i + 1 comparisons
      steps += (i + 1) + (order.length - 1 - i); // ... then shift the rest left
      order.splice(i, 1); order.push(k);
    } else {
      present.add(k); order.push(k);
      if (order.length > cap) {
        steps += order.length - 1;            // shift() moves every element
        present.delete(order.shift());
      }
    }
  }
  return [steps, hits];
}

function singlySteps(reqs, cap) {
  let head = null, steps = 0, hits = 0;       // head = most recent
  const nodes = new Map();
  for (const k of reqs) {
    if (nodes.has(k)) {
      hits++;
      const node = nodes.get(k);
      if (node === head) continue;
      let prev = head; steps++;
      while (prev.next !== node) { prev = prev.next; steps++; }   // no prev pointer: walk
      prev.next = node.next;
      node.next = head; head = node;
    } else {
      const node = { key: k, next: head }; head = node; nodes.set(k, node);
      if (nodes.size > cap) {
        let prev = head; steps++;
        while (prev.next.next !== null) { prev = prev.next; steps++; } // node before the tail
        nodes.delete(prev.next.key);
        prev.next = null;
      }
    }
  }
  return [steps, hits];
}

function doublySteps(reqs, cap) {
  const head = { prev: null, next: null }, tail = { prev: null, next: null };   // sentinels
  head.next = tail; tail.prev = head;
  const nodes = new Map();
  let hits = 0, mostWrites = 0;
  for (const k of reqs) {
    let writes = 0, node;
    if (nodes.has(k)) {
      hits++;
      node = nodes.get(k);
      node.prev.next = node.next; node.next.prev = node.prev;    // unlink: 2 writes
      writes += 2;
    } else {
      node = { key: k, prev: null, next: null }; nodes.set(k, node);
      if (nodes.size > cap) {
        const lru = tail.prev;                                   // no walk: tail.prev
        lru.prev.next = tail; tail.prev = lru.prev;              // unlink: 2 writes
        writes += 2;
        nodes.delete(lru.key);
      }
    }
    node.prev = head; node.next = head.next;                     // push front: 4 writes
    head.next.prev = node; head.next = node;
    writes += 4;
    mostWrites = Math.max(mostWrites, writes);
  }
  return [0, hits, mostWrites];               // 0 steps: there is no loop to count
}

function avg(steps, n) {
  const t = Math.floor(steps * 10 / n);
  return Math.floor(t / 10) + '.' + (t % 10);
}

for (const cap of [10, 100, 1000]) {
  seed = 7;
  const reqs = [];
  for (let i = 0; i < 20000; i++) reqs.push(rand() % (2 * cap));
  const [a, ha] = arraySteps(reqs, cap);
  const [s, hs] = singlySteps(reqs, cap);
  const [d, hd, w] = doublySteps(reqs, cap);
  console.log('capacity ' + cap + ': steps per access: array ' + avg(a, reqs.length) + ', singly linked ' +
    avg(s, reqs.length) + ', doubly linked ' + avg(d, reqs.length) + '; hits ' + ha +
    ' (same in all three: ' + (ha === hs && hs === hd) + ')');
  console.log('  doubly linked: at most ' + w + ' pointer writes in any single access');
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Implement an LRU cache in Java with get and put both in O(1), without using LinkedHashMap. Explain why you need a doubly linked list together with a hash map, and what would go wrong with an ArrayList or a singly linked list."

**What a strong answer should cover:**
- The three required operations: find by key, move any entry to the most-recent end, evict the least-recent end, all in O(1).
- Why each alternative fails: \`ArrayList\` of keys (\`remove(index)\` shifts, O(n)), map only (no order), \`PriorityQueue\` or \`TreeMap\` by time (O(log n)), singly linked list (O(n) to find the predecessor).
- Doubly linked list with sentinel head and tail; a \`HashMap<Integer, Node>\`; the node stores its key for eviction.
- Exact steps: unlink is 2 reference writes, push front 4; eviction is \`tail.prev\` plus \`map.remove(node.key)\`.
- Java details: a \`static\` nested \`Node\` class, \`null\` on a miss, \`Integer\` boxing in the map, \`ArrayList.remove(int)\` vs \`remove(Object)\`, and \`LinkedHashMap\` as the library equivalent.

**Clarifying questions expected:**
- May I use \`LinkedHashMap\`, or should I build the list myself?
- Does \`put\` on an existing key count as a use?
- Can capacity be 0?

**Code / implementation expected:** Yes — an \`LRUCache\` class with a static nested \`Node\`, a \`HashMap\` and two sentinels in Java.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know classes and references in Java and want to justify the LRU design, not just recite it.  
**Difficulty:** Hard  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think of a queue of people at a coffee shop where the barista has a strange rule: **whoever just ordered goes to the back of the line, and when the shop is full, the person at the front has to leave.** The person at the front is the one who has waited longest since their last order, the "least recently used" customer.

Two things must be fast. When someone orders, the barista must find that person instantly, no matter where they stand. And the barista must be able to pull that person out of the middle of the line and send them to the back without everyone else shuffling a step.

Finding a person instantly is a job for a **hash map** (a name-to-position directory). Pulling someone out of the middle of a line instantly needs each person to hold hands with **both** neighbours, so the two neighbours can simply join hands when the person leaves. That is a **doubly linked list**. This question is about why you need exactly those two structures, and why every simpler option is O(n) or O(log n) somewhere.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must both \`get\` and \`put\` be O(1), or just one? | O(1) for both is what forces the doubly linked list; O(log n) would allow a tree. |
| Does \`put\` on an existing key count as a use? | In LeetCode 146 it does, so \`put\` also needs the "move to front" operation. |
| May I use the built-in ordered map, or should I build the list myself? | The interviewer usually wants the list by hand, and the built-in as a follow-up. |
| What does \`get\` return on a miss? | Usually -1; it must not change the order. |
| Can the capacity be 0 or 1? | Both are good test cases for the eviction code. |

## 3. The Three Operations We Need in O(1)

Strip the cache down to what it does to its data, and there are exactly three operations:

1. **Find by key**: is the key present, and where is its entry?
2. **Move an entry to the "most recent" end**: on every hit and every update. The entry can be **anywhere** in the order.
3. **Remove the entry at the "least recent" end**: on eviction, and also delete its key.

📌 **Interview term: Recency order** — the entries sorted by time of last use; LRU always evicts the oldest one.

Operation 1 is a hash map (see [how a hash table works](/interview-question/how-does-a-hash-table-work)). Operations 2 and 3 are list surgery: cut a node out of the middle, insert it at one end, and delete at the other end. Here is how the candidates do:

| Structure for the order | Find key | Move to most recent | Evict least recent | Problem |
| :--- | :--- | :--- | :--- | :--- |
| Array / dynamic array of keys | O(n) scan | O(n) shift | O(n) shift from the front | every move shifts elements |
| Hash map only | O(1) | — | O(n): scan for the oldest timestamp | no order at all |
| Hash map + heap of last-use times | O(1) | O(log n) and needs the entry index in the heap | O(log n) | every \`get\` changes a priority |
| Hash map + balanced tree by time | O(1) | O(log n) | O(log n) | correct, but not O(1) |
| Hash map + **singly** linked list | O(1) to the node | **O(n)**: must find the previous node | **O(n)**: must find the node before the tail | a node cannot reach its predecessor |
| Hash map + **doubly** linked list | O(1) to the node | **O(1)** | **O(1)** | none: this is the answer |

The heap and tree rows are real options when O(log n) is acceptable; see [the cost of common operations on arrays, hash maps and trees](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance) for the background costs.

## 4. Why "Singly" Is Not Enough

To remove node B from a list, the node **before** B must be changed to point past it. In a singly linked list B only knows its successor:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="Singly linked list head, A, B, C. To remove B, A must point to C, but B has no link back to A, so the code has to walk from the head to find A.">
  <defs>
  <marker id="b32q3ja-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="110" height="56" rx="8"/>
  <text class="d-text" x="75" y="73" text-anchor="middle">head</text>
  <path class="d-edge" d="M 132 68 L 174 68" marker-end="url(#b32q3ja-a1)"/>
  <rect class="d-box" x="180" y="40" width="110" height="56" rx="8"/>
  <text class="d-text" x="235" y="73" text-anchor="middle">A</text>
  <path class="d-edge" d="M 292 68 L 344 68" marker-end="url(#b32q3ja-a1)"/>
  <rect class="d-box-accent" x="350" y="40" width="110" height="56" rx="8"/>
  <text class="d-text" x="405" y="73" text-anchor="middle">B</text>
  <path class="d-edge" d="M 462 68 L 514 68" marker-end="url(#b32q3ja-a1)"/>
  <rect class="d-box" x="520" y="40" width="110" height="56" rx="8"/>
  <text class="d-text" x="575" y="73" text-anchor="middle">C</text>
  <text class="d-sub" x="405" y="24" text-anchor="middle">remove B</text>
  <path class="d-edge-dashed" d="M 75 100 C 75 170, 235 170, 235 104" marker-end="url(#b32q3ja-a1)"/>
  <text class="d-sub" x="155" y="196" text-anchor="middle">walk from head to find A</text>
  <rect class="d-box-muted" x="430" y="140" width="250" height="60" rx="8"/>
  <text class="d-text" x="555" y="166" text-anchor="middle">B has no prev link</text>
  <text class="d-sub" x="555" y="188" text-anchor="middle">so finding A is O(n)</text>
</svg>

The hash map can take us straight to B in O(1), but it cannot tell us who A is. The only way to find A is to walk from the head, which is O(n). The same problem appears at the other end: evicting the last node needs the node before it. (There is a known trick of copying the next node's data into B and deleting the next node instead, but it fails for the last node, and it moves keys between nodes, so every moved key's map entry would have to be updated.)

📌 **Interview term: Predecessor problem** — in a singly linked list, unlinking a node needs its predecessor, and finding the predecessor costs O(n) unless something else stores it.

## 5. Why "Doubly" Fixes It

Give every node a \`prev\` link as well as \`next\`. Now unlinking B needs no search: B tells us both neighbours.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="Doubly linked list A, B, C. To unlink B, set A.next to C and C.prev to A. B knows both neighbours, so this takes two pointer writes and no search.">
  <defs>
  <marker id="b32q3ja-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="100" width="120" height="56" rx="8"/>
  <text class="d-text" x="100" y="133" text-anchor="middle">A</text>
  <rect class="d-box-muted" x="290" y="100" width="120" height="56" rx="8"/>
  <text class="d-text" x="350" y="133" text-anchor="middle">B</text>
  <rect class="d-box" x="540" y="100" width="120" height="56" rx="8"/>
  <text class="d-text" x="600" y="133" text-anchor="middle">C</text>
  <path class="d-edge-dashed" d="M 162 116 L 284 116" marker-end="url(#b32q3ja-a2)"/>
  <path class="d-edge-dashed" d="M 412 116 L 534 116" marker-end="url(#b32q3ja-a2)"/>
  <path class="d-edge-dashed" d="M 538 142 L 416 142" marker-end="url(#b32q3ja-a2)"/>
  <path class="d-edge-dashed" d="M 288 142 L 166 142" marker-end="url(#b32q3ja-a2)"/>
  <path class="d-edge-accent" d="M 100 96 C 100 30, 600 30, 600 92" marker-end="url(#b32q3ja-a2)"/>
  <text class="d-text" x="350" y="40" text-anchor="middle">write 1: A.next = C</text>
  <path class="d-edge-accent" d="M 600 160 C 600 226, 100 226, 100 164" marker-end="url(#b32q3ja-a2)"/>
  <text class="d-text" x="350" y="230" text-anchor="middle">write 2: C.prev = A</text>
</svg>

Unlinking is 2 pointer writes, inserting at the front is 4 more, so "move to front" is at most 6 pointer writes, whatever the size of the cache. Example 2 counts them.

📌 **Interview term: Doubly linked list** — each node links to both its successor and its predecessor, so any node can be removed in O(1) once you hold a reference to it.

The last piece is to make the hash map store **the node itself**, not an index or a copy of the value. Then a lookup lands directly on the node we need to move:

<svg class="iq-diagram" width="100%" viewBox="0 0 770 290" role="img" aria-label="A hash map from key to node sits above a doubly linked list: head sentinel, key 7, key 3, key 9, tail sentinel. Each node links to both neighbours. The node next to head is the most recently used and the node next to tail is the least recently used.">
  <defs>
    <marker id="b32q3ja-a3" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="170" y="20" width="430" height="70" rx="10"/>
  <text class="d-text" x="385" y="50" text-anchor="middle">hash map: key to node</text>
  <text class="d-sub" x="385" y="74" text-anchor="middle">O(1) jump to any node</text>
  <path class="d-edge-dashed" d="M 225 92 L 225 152" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge-dashed" d="M 385 92 L 385 152" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge-dashed" d="M 545 92 L 545 152" marker-end="url(#b32q3ja-a3)"/>
  <rect class="d-box-muted" x="20" y="160" width="100" height="60" rx="8"/>
  <text class="d-text" x="70" y="186" text-anchor="middle">head</text>
  <text class="d-sub" x="70" y="208" text-anchor="middle">sentinel</text>
  <rect class="d-box" x="170" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="225" y="186" text-anchor="middle">key 7</text>
  <text class="d-sub" x="225" y="208" text-anchor="middle">value 70</text>
  <rect class="d-box" x="330" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="385" y="186" text-anchor="middle">key 3</text>
  <text class="d-sub" x="385" y="208" text-anchor="middle">value 30</text>
  <rect class="d-box" x="490" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="545" y="186" text-anchor="middle">key 9</text>
  <text class="d-sub" x="545" y="208" text-anchor="middle">value 90</text>
  <rect class="d-box-muted" x="650" y="160" width="100" height="60" rx="8"/>
  <text class="d-text" x="700" y="186" text-anchor="middle">tail</text>
  <text class="d-sub" x="700" y="208" text-anchor="middle">sentinel</text>
  <path class="d-edge" d="M 122 176 L 164 176" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge" d="M 168 204 L 126 204" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge" d="M 282 176 L 324 176" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge" d="M 328 204 L 286 204" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge" d="M 442 176 L 484 176" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge" d="M 488 204 L 446 204" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge" d="M 602 176 L 644 176" marker-end="url(#b32q3ja-a3)"/>
  <path class="d-edge" d="M 648 204 L 606 204" marker-end="url(#b32q3ja-a3)"/>
  <text class="d-sub" x="225" y="256" text-anchor="middle">most recent</text>
  <text class="d-sub" x="545" y="256" text-anchor="middle">least recent</text>
</svg>

📌 **Interview term: Hash map to node (handle)** — storing a direct reference to a list node in the map, so a key lookup gives O(1) access to that node.

📌 **Interview term: Sentinel node** — dummy head and tail nodes that are never removed. Every real node always has a real \`prev\` and \`next\`, so \`unlink\` and \`push_front\` have no "is the list empty?" or "is this the first node?" branches.

Two details that interviewers check:

- **The node must store its key.** Eviction starts at the list (\`tail.prev\`) and must then delete that key from the map. Without the key in the node, there is no O(1) way back from the node to its map entry.
- **Evict and delete from the map together.** A node removed from the list but left in the map is a memory leak and makes \`get\` return stale values.

## 6. The Code in Java

Here is the full class from example 1.

~~~java
static class Node {
    int key, value;
    Node prev, next;
    Node(int key, int value) { this.key = key; this.value = value; }
}

// Hash map (key -> node) + doubly linked list (head side = most recent).
static class LRUCache {
    private final int capacity;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0), tail = new Node(0, 0);   // sentinels
    Integer lastEvicted = null;

    LRUCache(int capacity) {
        this.capacity = capacity;
        head.next = tail; tail.prev = head;
    }

    private void unlink(Node node) {                 // O(1): the node knows both neighbours
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void pushFront(Node node) {              // O(1): insert right after the head sentinel
        node.prev = head; node.next = head.next;
        head.next.prev = node;
        head.next = node;
    }

    int get(int key) {
        Node node = map.get(key);
        if (node == null) return -1;
        unlink(node); pushFront(node);
        return node.value;
    }

    void put(int key, int value) {
        lastEvicted = null;
        Node node = map.get(key);
        if (node != null) {                          // update: new value, now most recent
            node.value = value;
            unlink(node); pushFront(node);
            return;
        }
        if (map.size() == capacity) {                // full: evict the node before the tail
            Node lru = tail.prev;
            unlink(lru);
            map.remove(lru.key);                     // the node stores its key for exactly this
            lastEvicted = lru.key;
        }
        Node fresh = new Node(key, value);
        map.put(key, fresh);
        pushFront(fresh);
    }

    List<Integer> forward() {
        List<Integer> out = new ArrayList<>();
        for (Node cur = head.next; cur != tail; cur = cur.next) out.add(cur.key);
        return out;
    }

    List<Integer> backward() {
        List<Integer> out = new ArrayList<>();
        for (Node cur = tail.prev; cur != head; cur = cur.prev) out.add(cur.key);
        return out;
    }

    // mapSize() is used by the final check
}
~~~

**What to point out in this code:**

- \`Node\` is a \`static\` nested class: it does not need a hidden reference to an enclosing object, so each node is a little smaller and can be created anywhere.
- \`map.get(key)\` returns \`null\` on a miss, so one lookup answers both "is it there?" and "where is it?". The map's keys are boxed \`Integer\`s; the node's \`key\` field is a plain \`int\`.
- \`map.remove(lru.key)\` passes an \`int\` that is boxed to an \`Integer\`, so it calls \`Map.remove(Object key)\`. On an \`ArrayList<Integer>\` the same-looking call \`list.remove(k)\` with an \`int\` would remove by **index** instead; example 2 calls \`order.remove(i)\` on purpose for the index version.
- \`unlink\` only touches the two neighbours; it does not clear \`node.prev\` and \`node.next\`, because \`pushFront\` overwrites both straight away.
- Eviction runs **before** inserting the new node, and only on the new-key path, so an update can never evict.

If you are allowed the library, \`LinkedHashMap\` in access order with \`removeEldestEntry\` gives the same behaviour in a few lines; see [How do you design an LRU cache?](/interview-question/how-do-you-design-an-lru-cache).

## 7. Verified: Running the Code

Each example was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21, using nothing newer than Java 17). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the hand-written cache with capacity 3, printing the keys from newest to oldest after every call, then checking that walking the \`next\` links and walking the \`prev\` links give the same list and that the list and the map have the same size** prints:

~~~text
put(1, 1)  newest first [1]
put(2, 2)  newest first [2, 1]
put(3, 3)  newest first [3, 2, 1]
get(1) = 1  newest first [1, 3, 2]
put(4, 4) evicted 2  newest first [4, 1, 3]
get(2) = -1  newest first [4, 1, 3]
put(3, 33)  newest first [3, 4, 1]
put(5, 5) evicted 1  newest first [5, 3, 4]
get(4) = 4  newest first [4, 5, 3]
get(3) = 33  newest first [3, 4, 5]
prev and next links agree, list size = map size: true
~~~

\`get(1)\` moved 1 to the front, so \`put(4, 4)\` evicted 2, the oldest. \`put(3, 33)\` updated a key on a full cache without evicting anything, and the final check confirms that every \`prev\` link mirrors a \`next\` link.

**Example 2 — 20,000 requests replayed against three caches that differ only in how they keep the recency order** prints:

~~~text
capacity 10: steps per access: array 9.9, singly linked 7.2, doubly linked 0.0; hits 10041 (same in all three: true)
  doubly linked: at most 6 pointer writes in any single access
capacity 100: steps per access: array 99.4, singly linked 74.5, doubly linked 0.0; hits 9947 (same in all three: true)
  doubly linked: at most 6 pointer writes in any single access
capacity 1000: steps per access: array 943.8, singly linked 705.0, doubly linked 0.0; hits 9672 (same in all three: true)
  doubly linked: at most 6 pointer writes in any single access
~~~

The requests come from the same small pseudo-random generator (\`seed = seed * 48271 % 2147483647\`) in all four languages, so every language counts exactly the same work.

## 8. The Cost Difference, Measured

Example 2 runs the same 20,000 requests (keys drawn from a range twice the capacity) against three caches that all use a hash map for membership but keep the recency order differently. It counts the hidden work: elements scanned or shifted for the array, nodes walked to find a predecessor for the singly linked list.

| Capacity | Array (steps per access) | Singly linked list | Doubly linked list |
| :--- | :--- | :--- | :--- |
| 10 | 9.9 | 7.2 | 0.0 |
| 100 | 99.4 | 74.5 | 0.0 |
| 1,000 | 943.8 | 705.0 | 0.0 |

The array and the singly linked list both grow linearly with the capacity: ten times the capacity, about ten times the work per request. The doubly linked list never walks at all, and never makes more than 6 pointer writes in one access. All three return the same number of hits, so the difference is purely cost, not behaviour.

## 9. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`get\` | O(1) average | map lookup (average O(1)), then 2 writes to unlink and 4 to push front |
| \`put\` (update) | O(1) average | map lookup, value write, move to front |
| \`put\` (new key) | O(1) average | map insert, push front, and on overflow unlink \`tail.prev\` and delete its key |
| Space | O(capacity) | one map entry and one node (key, value, two links) per entry, plus two sentinels |

"Average" is the hash map's caveat; the list part is O(1) in the worst case.

## 10. Edge Cases

- **Updating an existing key on a full cache** (\`put(3, 33)\` in example 1): no eviction, the node moves to the front with the new value.
- **A miss** (\`get(2) = -1\` in example 1) must leave the order untouched.
- **Capacity 1:** the single real node is both the most and least recent; sentinels make this case need no extra code.
- **Capacity 0:** with the "evict when full, then insert" order used here, the first \`put\` would try to evict \`tail.prev\`, which is the head sentinel. Guard with \`if capacity == 0: return\` (or the equivalent) if the interviewer allows 0.
- **Getting the most recent key** repeatedly: unlink and push front of the same node must still leave a consistent list; example 1 checks that the \`next\` and \`prev\` chains agree after every operation.

## 11. Related Questions

The broader design (policies, hit rates, threads, TTL) is in [the LRU design question](/interview-question/how-do-you-design-an-lru-cache). The pointer surgery here is the same skill as [reversing a linked list](/interview-question/how-do-you-reverse-a-linked-list) and [removing the nth node from the end](/interview-question/how-do-you-remove-the-nth-node-from-the-end-of-a-linked-list), and the general trade-off between the two structures is in [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).

## Common Pitfalls

- **Forgetting \`map.remove(lru.key)\` on eviction.** The node leaves the list but stays in the map, so \`get\` returns an evicted value and memory grows.
- **Not storing the key in the node.** Eviction finds the node via \`tail.prev\` and then cannot tell which map entry to remove.
- **Wrong order of reference writes in \`pushFront\`.** Setting \`head.next = node\` before \`head.next.prev = node\` makes the second write point the new node at itself, and the old first node keeps a stale \`prev\`, so backward walks and later unlinks break.
- **\`ArrayList.remove(k)\` with an \`int\` key.** That removes by index, not by value; use \`remove(Integer.valueOf(k))\` (we checked both on \`[5, 6, 7]\`). And with an \`ArrayList\` the order is O(n) anyway.
- **Comparing boxed keys with \`==\`.** \`Integer\` values are cached only from -128 to 127, so \`==\` happens to work in small tests and fails for 128; use \`equals\` or compare \`int\`s.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Three operations:</strong> <span style="color:#f0e2c8;">Find by key, move any entry to the most-recent end, evict the least-recent end, all O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why both:</strong> <span style="color:#f0e2c8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> finds the node in O(1); the doubly linked list moves or removes it in O(1) because each node knows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why not singly:</strong> <span style="color:#f0e2c8;">Unlinking needs the predecessor, which costs an O(n) walk; I measured 705 steps per access at capacity 1,000 against 0 for the doubly linked list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Details:</strong> <span style="color:#f0e2c8;">Sentinel <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail</code> remove edge cases; the node stores its key so eviction can call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map.remove(node.key)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java:</strong> <span style="color:#f0e2c8;">A static nested <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Node</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Integer, Node&gt;</code>; in production <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LinkedHashMap</code> in access order does exactly this internally.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">PriorityQueue</code> of timestamps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> changes a priority; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code> has no decrease-key, so you would remove and re-add the entry, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove(Object)</code> is O(n). Even a perfect heap is O(log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">TreeMap</code> keyed by last-use time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works with O(log n) per operation. The interviewer asked for O(1), which only the linked list gives.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are the sentinels for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With a dummy head and tail, every real node always has real neighbours, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unlink</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pushFront</code> need no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> checks for the first, last or only node.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LinkedHashMap</code> relate to this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> whose entries are also linked in a doubly linked list; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">accessOrder = true</code> every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> moves the entry to the end, exactly like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pushFront</code> here.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this thread-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> writes references; I would make <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">synchronized</code> or guard them with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReentrantLock</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Recency order** | Entries sorted by time of last use; LRU evicts the oldest |
| **Predecessor problem** | A singly linked node cannot reach the node before it without an O(n) walk |
| **Doubly linked list** | Each node links to both neighbours, so it can be unlinked in O(1) |
| **Hash map to node (handle)** | The map stores a direct reference to the list node, not a copy or an index |
| **Sentinel node** | A dummy head or tail that is never removed, so no empty-list special cases |

---
**Conclusion:** An O(1) LRU cache needs three operations to be constant time: find by key, move any entry to the most-recent end, and evict the least-recent end. A hash map does the first; only a doubly linked list does the other two, because each node can be unlinked using its own \`prev\` and \`next\` links, while an array shifts elements and a singly linked list must walk to find a predecessor (943.8 and 705.0 steps per access at capacity 1,000 in our measurement, against zero). The map stores the node itself, the node stores its key for eviction, and sentinels remove the edge cases. In Java that is a static nested \`Node\`, a \`HashMap<Integer, Node>\` and two sentinels; \`LinkedHashMap\` in access order is the same idea packaged.`,
        examples: [
          {
            label: `Hand-written hash map + doubly linked list with sentinels, checked after every call`,
            code: `import java.util.*;

public class Main {
    static class Node {
        int key, value;
        Node prev, next;
        Node(int key, int value) { this.key = key; this.value = value; }
    }

    // Hash map (key -> node) + doubly linked list (head side = most recent).
    static class LRUCache {
        private final int capacity;
        private final Map<Integer, Node> map = new HashMap<>();
        private final Node head = new Node(0, 0), tail = new Node(0, 0);   // sentinels
        Integer lastEvicted = null;

        LRUCache(int capacity) {
            this.capacity = capacity;
            head.next = tail; tail.prev = head;
        }

        private void unlink(Node node) {                 // O(1): the node knows both neighbours
            node.prev.next = node.next;
            node.next.prev = node.prev;
        }

        private void pushFront(Node node) {              // O(1): insert right after the head sentinel
            node.prev = head; node.next = head.next;
            head.next.prev = node;
            head.next = node;
        }

        int get(int key) {
            Node node = map.get(key);
            if (node == null) return -1;
            unlink(node); pushFront(node);
            return node.value;
        }

        void put(int key, int value) {
            lastEvicted = null;
            Node node = map.get(key);
            if (node != null) {                          // update: new value, now most recent
                node.value = value;
                unlink(node); pushFront(node);
                return;
            }
            if (map.size() == capacity) {                // full: evict the node before the tail
                Node lru = tail.prev;
                unlink(lru);
                map.remove(lru.key);                     // the node stores its key for exactly this
                lastEvicted = lru.key;
            }
            Node fresh = new Node(key, value);
            map.put(key, fresh);
            pushFront(fresh);
        }

        List<Integer> forward() {
            List<Integer> out = new ArrayList<>();
            for (Node cur = head.next; cur != tail; cur = cur.next) out.add(cur.key);
            return out;
        }

        List<Integer> backward() {
            List<Integer> out = new ArrayList<>();
            for (Node cur = tail.prev; cur != head; cur = cur.prev) out.add(cur.key);
            return out;
        }

        int mapSize() { return map.size(); }
    }

    public static void main(String[] args) {
        LRUCache c = new LRUCache(3);
        // {k} is get(k), {k, v} is put(k, v)
        int[][] ops = {{1, 1}, {2, 2}, {3, 3}, {1}, {4, 4}, {2}, {3, 33}, {5, 5}, {4}, {3}};
        for (int[] op : ops) {
            String text;
            if (op.length == 1) {
                text = "get(" + op[0] + ") = " + c.get(op[0]);
            } else {
                c.put(op[0], op[1]);
                text = "put(" + op[0] + ", " + op[1] + ")";
                if (c.lastEvicted != null) text += " evicted " + c.lastEvicted;
            }
            System.out.println(text + "  newest first " + c.forward());
        }
        List<Integer> back = c.backward();
        Collections.reverse(back);
        boolean ok = c.forward().equals(back) && c.forward().size() == c.mapSize();
        System.out.println("prev and next links agree, list size = map size: " + ok);
    }
}`,
          },
          {
            label: `Array vs singly vs doubly linked list: hidden steps per access as capacity grows`,
            code: `import java.util.*;

public class Main {
    // Three ways to keep the recency order of an LRU cache, all with a hash map for
    // membership. "steps" counts list elements visited or shifted, which is the
    // hidden O(n) work; the doubly linked list never walks.
    static long seed = 7;
    static long rand() { seed = seed * 48271 % 2147483647L; return seed; }

    static long[] arraySteps(int[] reqs, int cap) {
        ArrayList<Integer> order = new ArrayList<>();   // index 0 = least recent
        Set<Integer> present = new HashSet<>();
        long steps = 0, hits = 0;
        for (int k : reqs) {
            if (present.contains(k)) {
                hits++;
                int i = 0;
                while (order.get(i) != k) i++;          // unboxes to int, so != compares values
                steps += (i + 1) + (order.size() - 1 - i);
                order.remove(i);                        // remove(int index), not remove(Object)
                order.add(k);
            } else {
                present.add(k); order.add(k);
                if (order.size() > cap) {
                    steps += order.size() - 1;          // remove(0) shifts every element
                    present.remove(order.remove(0));
                }
            }
        }
        return new long[] {steps, hits};
    }

    static class SNode { int key; SNode next; SNode(int k) { key = k; } }

    static long[] singlySteps(int[] reqs, int cap) {
        SNode head = null;                              // head = most recent
        Map<Integer, SNode> nodes = new HashMap<>();
        long steps = 0, hits = 0;
        for (int k : reqs) {
            SNode node = nodes.get(k);
            if (node != null) {
                hits++;
                if (node == head) continue;
                SNode prev = head; steps++;
                while (prev.next != node) { prev = prev.next; steps++; }   // no prev pointer: walk
                prev.next = node.next;
                node.next = head; head = node;
            } else {
                node = new SNode(k); node.next = head; head = node; nodes.put(k, node);
                if (nodes.size() > cap) {
                    SNode prev = head; steps++;
                    while (prev.next.next != null) { prev = prev.next; steps++; }  // before the tail
                    nodes.remove(prev.next.key);
                    prev.next = null;
                }
            }
        }
        return new long[] {steps, hits};
    }

    static class DNode { int key; DNode prev, next; DNode(int k) { key = k; } }

    static long[] doublySteps(int[] reqs, int cap) {
        DNode head = new DNode(0), tail = new DNode(0);  // sentinels
        head.next = tail; tail.prev = head;
        Map<Integer, DNode> nodes = new HashMap<>();
        long hits = 0, mostWrites = 0;
        for (int k : reqs) {
            int writes = 0;
            DNode node = nodes.get(k);
            if (node != null) {
                hits++;
                node.prev.next = node.next; node.next.prev = node.prev;    // unlink: 2 writes
                writes += 2;
            } else {
                node = new DNode(k); nodes.put(k, node);
                if (nodes.size() > cap) {
                    DNode lru = tail.prev;                                 // no walk: tail.prev
                    lru.prev.next = tail; tail.prev = lru.prev;            // unlink: 2 writes
                    writes += 2;
                    nodes.remove(lru.key);
                }
            }
            node.prev = head; node.next = head.next;                       // push front: 4 writes
            head.next.prev = node; head.next = node;
            writes += 4;
            mostWrites = Math.max(mostWrites, writes);
        }
        return new long[] {0, hits, mostWrites};          // 0 steps: there is no loop to count
    }

    static String avg(long steps, int n) {
        long t = steps * 10 / n;
        return (t / 10) + "." + (t % 10);
    }

    public static void main(String[] args) {
        for (int cap : new int[] {10, 100, 1000}) {
            seed = 7;
            int[] reqs = new int[20000];
            for (int i = 0; i < reqs.length; i++) reqs[i] = (int) (rand() % (2 * cap));
            long[] a = arraySteps(reqs, cap), s = singlySteps(reqs, cap), d = doublySteps(reqs, cap);
            System.out.println("capacity " + cap + ": steps per access: array " + avg(a[0], reqs.length)
                + ", singly linked " + avg(s[0], reqs.length) + ", doubly linked " + avg(d[0], reqs.length)
                + "; hits " + a[1] + " (same in all three: " + (a[1] == s[1] && s[1] == d[1]) + ")");
            System.out.println("  doubly linked: at most " + d[2] + " pointer writes in any single access");
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Implement an LRU cache in C++ with get and put both in O(1), writing the linked list yourself. Explain why you need a doubly linked list together with a hash map, and what would go wrong with a vector or a singly linked list."

**What a strong answer should cover:**
- The three required operations: find by key, move any entry to the most-recent end, evict the least-recent end, all in O(1).
- Why each alternative fails: \`vector\` of keys (\`erase\` shifts, O(n)), map only (no order), heap or \`std::map\` by time (O(log n)), singly linked list (O(n) to find the predecessor).
- Doubly linked list with sentinel head and tail; an \`unordered_map<int, Node*>\`; the node stores its key for eviction.
- Exact steps: unlink is 2 pointer writes, push front 4; eviction is \`tail.prev\` plus \`map.erase(node->key)\` before \`delete\`.
- C++ details: who owns the nodes (destructor, deleted copy constructor), \`find\` instead of \`operator[]\`, use-after-free on eviction, and \`std::list\` with \`splice\` as the library equivalent.

**Clarifying questions expected:**
- May I use \`std::list\`, or should I build the list myself?
- Does \`put\` on an existing key count as a use?
- Can capacity be 0?

**Code / implementation expected:** Yes — an \`LRUCache\` class with a \`Node\` struct, an \`unordered_map\` and two sentinels in C++17.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know classes and references in C++ and want to justify the LRU design, not just recite it.  
**Difficulty:** Hard  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think of a queue of people at a coffee shop where the barista has a strange rule: **whoever just ordered goes to the back of the line, and when the shop is full, the person at the front has to leave.** The person at the front is the one who has waited longest since their last order, the "least recently used" customer.

Two things must be fast. When someone orders, the barista must find that person instantly, no matter where they stand. And the barista must be able to pull that person out of the middle of the line and send them to the back without everyone else shuffling a step.

Finding a person instantly is a job for a **hash map** (a name-to-position directory). Pulling someone out of the middle of a line instantly needs each person to hold hands with **both** neighbours, so the two neighbours can simply join hands when the person leaves. That is a **doubly linked list**. This question is about why you need exactly those two structures, and why every simpler option is O(n) or O(log n) somewhere.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must both \`get\` and \`put\` be O(1), or just one? | O(1) for both is what forces the doubly linked list; O(log n) would allow a tree. |
| Does \`put\` on an existing key count as a use? | In LeetCode 146 it does, so \`put\` also needs the "move to front" operation. |
| May I use the built-in ordered map, or should I build the list myself? | The interviewer usually wants the list by hand, and the built-in as a follow-up. |
| What does \`get\` return on a miss? | Usually -1; it must not change the order. |
| Can the capacity be 0 or 1? | Both are good test cases for the eviction code. |

## 3. The Three Operations We Need in O(1)

Strip the cache down to what it does to its data, and there are exactly three operations:

1. **Find by key**: is the key present, and where is its entry?
2. **Move an entry to the "most recent" end**: on every hit and every update. The entry can be **anywhere** in the order.
3. **Remove the entry at the "least recent" end**: on eviction, and also delete its key.

📌 **Interview term: Recency order** — the entries sorted by time of last use; LRU always evicts the oldest one.

Operation 1 is a hash map (see [how a hash table works](/interview-question/how-does-a-hash-table-work)). Operations 2 and 3 are list surgery: cut a node out of the middle, insert it at one end, and delete at the other end. Here is how the candidates do:

| Structure for the order | Find key | Move to most recent | Evict least recent | Problem |
| :--- | :--- | :--- | :--- | :--- |
| Array / dynamic array of keys | O(n) scan | O(n) shift | O(n) shift from the front | every move shifts elements |
| Hash map only | O(1) | — | O(n): scan for the oldest timestamp | no order at all |
| Hash map + heap of last-use times | O(1) | O(log n) and needs the entry index in the heap | O(log n) | every \`get\` changes a priority |
| Hash map + balanced tree by time | O(1) | O(log n) | O(log n) | correct, but not O(1) |
| Hash map + **singly** linked list | O(1) to the node | **O(n)**: must find the previous node | **O(n)**: must find the node before the tail | a node cannot reach its predecessor |
| Hash map + **doubly** linked list | O(1) to the node | **O(1)** | **O(1)** | none: this is the answer |

The heap and tree rows are real options when O(log n) is acceptable; see [the cost of common operations on arrays, hash maps and trees](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance) for the background costs.

## 4. Why "Singly" Is Not Enough

To remove node B from a list, the node **before** B must be changed to point past it. In a singly linked list B only knows its successor:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="Singly linked list head, A, B, C. To remove B, A must point to C, but B has no link back to A, so the code has to walk from the head to find A.">
  <defs>
  <marker id="b32q3cp-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="110" height="56" rx="8"/>
  <text class="d-text" x="75" y="73" text-anchor="middle">head</text>
  <path class="d-edge" d="M 132 68 L 174 68" marker-end="url(#b32q3cp-a1)"/>
  <rect class="d-box" x="180" y="40" width="110" height="56" rx="8"/>
  <text class="d-text" x="235" y="73" text-anchor="middle">A</text>
  <path class="d-edge" d="M 292 68 L 344 68" marker-end="url(#b32q3cp-a1)"/>
  <rect class="d-box-accent" x="350" y="40" width="110" height="56" rx="8"/>
  <text class="d-text" x="405" y="73" text-anchor="middle">B</text>
  <path class="d-edge" d="M 462 68 L 514 68" marker-end="url(#b32q3cp-a1)"/>
  <rect class="d-box" x="520" y="40" width="110" height="56" rx="8"/>
  <text class="d-text" x="575" y="73" text-anchor="middle">C</text>
  <text class="d-sub" x="405" y="24" text-anchor="middle">remove B</text>
  <path class="d-edge-dashed" d="M 75 100 C 75 170, 235 170, 235 104" marker-end="url(#b32q3cp-a1)"/>
  <text class="d-sub" x="155" y="196" text-anchor="middle">walk from head to find A</text>
  <rect class="d-box-muted" x="430" y="140" width="250" height="60" rx="8"/>
  <text class="d-text" x="555" y="166" text-anchor="middle">B has no prev link</text>
  <text class="d-sub" x="555" y="188" text-anchor="middle">so finding A is O(n)</text>
</svg>

The hash map can take us straight to B in O(1), but it cannot tell us who A is. The only way to find A is to walk from the head, which is O(n). The same problem appears at the other end: evicting the last node needs the node before it. (There is a known trick of copying the next node's data into B and deleting the next node instead, but it fails for the last node, and it moves keys between nodes, so every moved key's map entry would have to be updated.)

📌 **Interview term: Predecessor problem** — in a singly linked list, unlinking a node needs its predecessor, and finding the predecessor costs O(n) unless something else stores it.

## 5. Why "Doubly" Fixes It

Give every node a \`prev\` link as well as \`next\`. Now unlinking B needs no search: B tells us both neighbours.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="Doubly linked list A, B, C. To unlink B, set A.next to C and C.prev to A. B knows both neighbours, so this takes two pointer writes and no search.">
  <defs>
  <marker id="b32q3cp-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="100" width="120" height="56" rx="8"/>
  <text class="d-text" x="100" y="133" text-anchor="middle">A</text>
  <rect class="d-box-muted" x="290" y="100" width="120" height="56" rx="8"/>
  <text class="d-text" x="350" y="133" text-anchor="middle">B</text>
  <rect class="d-box" x="540" y="100" width="120" height="56" rx="8"/>
  <text class="d-text" x="600" y="133" text-anchor="middle">C</text>
  <path class="d-edge-dashed" d="M 162 116 L 284 116" marker-end="url(#b32q3cp-a2)"/>
  <path class="d-edge-dashed" d="M 412 116 L 534 116" marker-end="url(#b32q3cp-a2)"/>
  <path class="d-edge-dashed" d="M 538 142 L 416 142" marker-end="url(#b32q3cp-a2)"/>
  <path class="d-edge-dashed" d="M 288 142 L 166 142" marker-end="url(#b32q3cp-a2)"/>
  <path class="d-edge-accent" d="M 100 96 C 100 30, 600 30, 600 92" marker-end="url(#b32q3cp-a2)"/>
  <text class="d-text" x="350" y="40" text-anchor="middle">write 1: A.next = C</text>
  <path class="d-edge-accent" d="M 600 160 C 600 226, 100 226, 100 164" marker-end="url(#b32q3cp-a2)"/>
  <text class="d-text" x="350" y="230" text-anchor="middle">write 2: C.prev = A</text>
</svg>

Unlinking is 2 pointer writes, inserting at the front is 4 more, so "move to front" is at most 6 pointer writes, whatever the size of the cache. Example 2 counts them.

📌 **Interview term: Doubly linked list** — each node links to both its successor and its predecessor, so any node can be removed in O(1) once you hold a reference to it.

The last piece is to make the hash map store **the node itself**, not an index or a copy of the value. Then a lookup lands directly on the node we need to move:

<svg class="iq-diagram" width="100%" viewBox="0 0 770 290" role="img" aria-label="A hash map from key to node sits above a doubly linked list: head sentinel, key 7, key 3, key 9, tail sentinel. Each node links to both neighbours. The node next to head is the most recently used and the node next to tail is the least recently used.">
  <defs>
    <marker id="b32q3cp-a3" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="170" y="20" width="430" height="70" rx="10"/>
  <text class="d-text" x="385" y="50" text-anchor="middle">hash map: key to node</text>
  <text class="d-sub" x="385" y="74" text-anchor="middle">O(1) jump to any node</text>
  <path class="d-edge-dashed" d="M 225 92 L 225 152" marker-end="url(#b32q3cp-a3)"/>
  <path class="d-edge-dashed" d="M 385 92 L 385 152" marker-end="url(#b32q3cp-a3)"/>
  <path class="d-edge-dashed" d="M 545 92 L 545 152" marker-end="url(#b32q3cp-a3)"/>
  <rect class="d-box-muted" x="20" y="160" width="100" height="60" rx="8"/>
  <text class="d-text" x="70" y="186" text-anchor="middle">head</text>
  <text class="d-sub" x="70" y="208" text-anchor="middle">sentinel</text>
  <rect class="d-box" x="170" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="225" y="186" text-anchor="middle">key 7</text>
  <text class="d-sub" x="225" y="208" text-anchor="middle">value 70</text>
  <rect class="d-box" x="330" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="385" y="186" text-anchor="middle">key 3</text>
  <text class="d-sub" x="385" y="208" text-anchor="middle">value 30</text>
  <rect class="d-box" x="490" y="160" width="110" height="60" rx="8"/>
  <text class="d-text" x="545" y="186" text-anchor="middle">key 9</text>
  <text class="d-sub" x="545" y="208" text-anchor="middle">value 90</text>
  <rect class="d-box-muted" x="650" y="160" width="100" height="60" rx="8"/>
  <text class="d-text" x="700" y="186" text-anchor="middle">tail</text>
  <text class="d-sub" x="700" y="208" text-anchor="middle">sentinel</text>
  <path class="d-edge" d="M 122 176 L 164 176" marker-end="url(#b32q3cp-a3)"/>
  <path class="d-edge" d="M 168 204 L 126 204" marker-end="url(#b32q3cp-a3)"/>
  <path class="d-edge" d="M 282 176 L 324 176" marker-end="url(#b32q3cp-a3)"/>
  <path class="d-edge" d="M 328 204 L 286 204" marker-end="url(#b32q3cp-a3)"/>
  <path class="d-edge" d="M 442 176 L 484 176" marker-end="url(#b32q3cp-a3)"/>
  <path class="d-edge" d="M 488 204 L 446 204" marker-end="url(#b32q3cp-a3)"/>
  <path class="d-edge" d="M 602 176 L 644 176" marker-end="url(#b32q3cp-a3)"/>
  <path class="d-edge" d="M 648 204 L 606 204" marker-end="url(#b32q3cp-a3)"/>
  <text class="d-sub" x="225" y="256" text-anchor="middle">most recent</text>
  <text class="d-sub" x="545" y="256" text-anchor="middle">least recent</text>
</svg>

📌 **Interview term: Hash map to node (handle)** — storing a direct reference to a list node in the map, so a key lookup gives O(1) access to that node.

📌 **Interview term: Sentinel node** — dummy head and tail nodes that are never removed. Every real node always has a real \`prev\` and \`next\`, so \`unlink\` and \`push_front\` have no "is the list empty?" or "is this the first node?" branches.

Two details that interviewers check:

- **The node must store its key.** Eviction starts at the list (\`tail.prev\`) and must then delete that key from the map. Without the key in the node, there is no O(1) way back from the node to its map entry.
- **Evict and delete from the map together.** A node removed from the list but left in the map is a memory leak and makes \`get\` return stale values.

## 6. The Code in C++

Here is the full class from example 1.

~~~cpp
struct Node {
    int key, value;
    Node* prev = nullptr;
    Node* next = nullptr;
    Node(int k, int v) : key(k), value(v) {}
};

// Hash map (key -> node) + hand-written doubly linked list (head side = most recent).
class LRUCache {
    size_t capacity;
    unordered_map<int, Node*> map;
    Node head{0, 0}, tail{0, 0};                  // sentinels live inside the object

    void unlink(Node* n) { n->prev->next = n->next; n->next->prev = n->prev; }   // O(1)
    void pushFront(Node* n) {                     // O(1): right after the head sentinel
        n->prev = &head; n->next = head.next;
        head.next->prev = n; head.next = n;
    }
public:
    int lastEvicted = -1;                         // -1 = nothing evicted by the last put
    explicit LRUCache(size_t cap) : capacity(cap) { head.next = &tail; tail.prev = &head; }
    LRUCache(const LRUCache&) = delete;           // raw pointers: forbid accidental copies
    ~LRUCache() { for (auto& kv : map) delete kv.second; }   // we own the nodes

    int get(int key) {
        auto it = map.find(key);
        if (it == map.end()) return -1;
        unlink(it->second); pushFront(it->second);
        return it->second->value;
    }

    void put(int key, int value) {
        lastEvicted = -1;
        auto it = map.find(key);
        if (it != map.end()) {                    // update: new value, now most recent
            it->second->value = value;
            unlink(it->second); pushFront(it->second);
            return;
        }
        if (map.size() == capacity) {             // full: evict the node before the tail
            Node* lru = tail.prev;
            unlink(lru);
            map.erase(lru->key);                  // the node stores its key for exactly this
            lastEvicted = lru->key;
            delete lru;                           // free it AFTER the last use of lru->key
        }
        Node* fresh = new Node(key, value);
        map[key] = fresh;
        pushFront(fresh);
    }

    vector<int> forward() const {
        vector<int> out;
        for (Node* cur = head.next; cur != &tail; cur = cur->next) out.push_back(cur->key);
        return out;
    }
    vector<int> backward() const {
        vector<int> out;
        for (Node* cur = tail.prev; cur != &head; cur = cur->prev) out.push_back(cur->key);
        return out;
    }
    // mapSize() is used by the final check
};
~~~

**What to point out in this code:**

- **Ownership.** The cache allocates nodes with \`new\`, so it must free them: the destructor deletes every node still in the map, and eviction deletes the evicted node. The copy constructor is deleted, because a default copy would copy the raw pointers and two caches would delete the same nodes.
- The sentinels \`head\` and \`tail\` are plain members, not heap nodes, so they need no \`delete\` and the list is never empty.
- \`map.find(key)\` instead of \`map[key]\`: \`operator[]\` would insert a \`nullptr\` entry for a missing key.
- In eviction, \`map.erase(lru->key)\` and \`lastEvicted = lru->key\` come **before** \`delete lru\`. Reading \`lru->key\` after \`delete\` is a use-after-free: undefined behaviour that often "works" in tests.
- Eviction runs **before** inserting the new node, and only on the new-key path, so an update can never evict.

\`vector::erase(begin() + i)\` looks like one call but shifts every later element; example 2 measured 943.8 steps per access at capacity 1,000 for the vector version. In production, \`std::list\` plus \`splice\` gives the same O(1) moves without hand-written pointers; see [How do you design an LRU cache?](/interview-question/how-do-you-design-an-lru-cache).

## 7. Verified: Running the Code

Each example was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the hand-written cache with capacity 3, printing the keys from newest to oldest after every call, then checking that walking the \`next\` links and walking the \`prev\` links give the same list and that the list and the map have the same size** prints:

~~~text
put(1, 1)  newest first [1]
put(2, 2)  newest first [2, 1]
put(3, 3)  newest first [3, 2, 1]
get(1) = 1  newest first [1, 3, 2]
put(4, 4) evicted 2  newest first [4, 1, 3]
get(2) = -1  newest first [4, 1, 3]
put(3, 33)  newest first [3, 4, 1]
put(5, 5) evicted 1  newest first [5, 3, 4]
get(4) = 4  newest first [4, 5, 3]
get(3) = 33  newest first [3, 4, 5]
prev and next links agree, list size = map size: true
~~~

\`get(1)\` moved 1 to the front, so \`put(4, 4)\` evicted 2, the oldest. \`put(3, 33)\` updated a key on a full cache without evicting anything, and the final check confirms that every \`prev\` link mirrors a \`next\` link.

**Example 2 — 20,000 requests replayed against three caches that differ only in how they keep the recency order** prints:

~~~text
capacity 10: steps per access: array 9.9, singly linked 7.2, doubly linked 0.0; hits 10041 (same in all three: true)
  doubly linked: at most 6 pointer writes in any single access
capacity 100: steps per access: array 99.4, singly linked 74.5, doubly linked 0.0; hits 9947 (same in all three: true)
  doubly linked: at most 6 pointer writes in any single access
capacity 1000: steps per access: array 943.8, singly linked 705.0, doubly linked 0.0; hits 9672 (same in all three: true)
  doubly linked: at most 6 pointer writes in any single access
~~~

The requests come from the same small pseudo-random generator (\`seed = seed * 48271 % 2147483647\`) in all four languages, so every language counts exactly the same work.

## 8. The Cost Difference, Measured

Example 2 runs the same 20,000 requests (keys drawn from a range twice the capacity) against three caches that all use a hash map for membership but keep the recency order differently. It counts the hidden work: elements scanned or shifted for the array, nodes walked to find a predecessor for the singly linked list.

| Capacity | Array (steps per access) | Singly linked list | Doubly linked list |
| :--- | :--- | :--- | :--- |
| 10 | 9.9 | 7.2 | 0.0 |
| 100 | 99.4 | 74.5 | 0.0 |
| 1,000 | 943.8 | 705.0 | 0.0 |

The array and the singly linked list both grow linearly with the capacity: ten times the capacity, about ten times the work per request. The doubly linked list never walks at all, and never makes more than 6 pointer writes in one access. All three return the same number of hits, so the difference is purely cost, not behaviour.

## 9. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`get\` | O(1) average | map lookup (average O(1)), then 2 writes to unlink and 4 to push front |
| \`put\` (update) | O(1) average | map lookup, value write, move to front |
| \`put\` (new key) | O(1) average | map insert, push front, and on overflow unlink \`tail.prev\` and delete its key |
| Space | O(capacity) | one map entry and one node (key, value, two links) per entry, plus two sentinels |

"Average" is the hash map's caveat; the list part is O(1) in the worst case.

## 10. Edge Cases

- **Updating an existing key on a full cache** (\`put(3, 33)\` in example 1): no eviction, the node moves to the front with the new value.
- **A miss** (\`get(2) = -1\` in example 1) must leave the order untouched.
- **Capacity 1:** the single real node is both the most and least recent; sentinels make this case need no extra code.
- **Capacity 0:** with the "evict when full, then insert" order used here, the first \`put\` would try to evict \`tail.prev\`, which is the head sentinel. Guard with \`if capacity == 0: return\` (or the equivalent) if the interviewer allows 0.
- **Getting the most recent key** repeatedly: unlink and push front of the same node must still leave a consistent list; example 1 checks that the \`next\` and \`prev\` chains agree after every operation.

## 11. Related Questions

The broader design (policies, hit rates, threads, TTL) is in [the LRU design question](/interview-question/how-do-you-design-an-lru-cache). The pointer surgery here is the same skill as [reversing a linked list](/interview-question/how-do-you-reverse-a-linked-list) and [removing the nth node from the end](/interview-question/how-do-you-remove-the-nth-node-from-the-end-of-a-linked-list), and the general trade-off between the two structures is in [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).

## Common Pitfalls

- **\`delete lru\` before \`map.erase(lru->key)\`.** Reading a member of a deleted node is undefined behaviour and may pass every test you try.
- **Leaking nodes.** Without a destructor (or \`unique_ptr\` ownership), every node ever created stays allocated.
- **Allowing copies.** A default copy constructor copies the pointers; two caches then share and double-delete the same nodes. Delete the copy operations or use \`std::list\`.
- **Using \`map[key]\` to check presence.** It inserts a \`nullptr\` value on a miss, and the next \`get\` of that key dereferences it.
- **Wrong order of pointer writes in \`pushFront\`.** Setting \`head.next = n\` before \`head.next->prev = n\` makes the second write point the new node at itself, and the old first node keeps a stale \`prev\`, so backward walks and later unlinks break.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Three operations:</strong> <span style="color:#f0e2c8;">Find by key, move any entry to the most-recent end, evict the least-recent end, all O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why both:</strong> <span style="color:#f0e2c8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> finds the node in O(1); the doubly linked list moves or removes it in O(1) because each node knows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why not singly:</strong> <span style="color:#f0e2c8;">Unlinking needs the predecessor, which costs an O(n) walk; I measured 705 steps per access at capacity 1,000 against 0 for the doubly linked list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Details:</strong> <span style="color:#f0e2c8;">Sentinel <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail</code> remove edge cases; the node stores its key so eviction can <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">erase</code> it from the map before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++:</strong> <span style="color:#f0e2c8;">The cache owns its nodes (destructor, no copies); in production <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::list</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code> gives the same O(1) moves with no raw pointers.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">priority_queue</code> of timestamps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::priority_queue</code> cannot change or remove an arbitrary element, and even a heap that can is O(log n) per <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>. The list moves the node in O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::map</code> keyed by last-use time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works with O(log n) per operation. The interviewer asked for O(1), which only the linked list gives.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What are the sentinels for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With a dummy head and tail, every real node always has real neighbours, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unlink</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pushFront</code> need no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code> checks for the first, last or only node.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::list</code> change the code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The map would store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list&lt;pair&lt;int,int&gt;&gt;::iterator</code>, and moving a node becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items.splice(items.begin(), items, it)</code>, which is O(1) and keeps every iterator valid.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this thread-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> writes pointers; I would lock a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::mutex</code> in each method, or shard the cache by key hash.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Recency order** | Entries sorted by time of last use; LRU evicts the oldest |
| **Predecessor problem** | A singly linked node cannot reach the node before it without an O(n) walk |
| **Doubly linked list** | Each node links to both neighbours, so it can be unlinked in O(1) |
| **Hash map to node (handle)** | The map stores a direct reference to the list node, not a copy or an index |
| **Sentinel node** | A dummy head or tail that is never removed, so no empty-list special cases |

---
**Conclusion:** An O(1) LRU cache needs three operations to be constant time: find by key, move any entry to the most-recent end, and evict the least-recent end. A hash map does the first; only a doubly linked list does the other two, because each node can be unlinked using its own \`prev\` and \`next\` links, while an array shifts elements and a singly linked list must walk to find a predecessor (943.8 and 705.0 steps per access at capacity 1,000 in our measurement, against zero). The map stores the node itself, the node stores its key for eviction, and sentinels remove the edge cases. In C++ that is a \`Node\` struct the cache owns, an \`unordered_map<int, Node*>\` and two sentinels; \`std::list\` with \`splice\` is the same idea packaged.`,
        examples: [
          {
            label: `Hand-written hash map + doubly linked list with sentinels, checked after every call`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

struct Node {
    int key, value;
    Node* prev = nullptr;
    Node* next = nullptr;
    Node(int k, int v) : key(k), value(v) {}
};

// Hash map (key -> node) + hand-written doubly linked list (head side = most recent).
class LRUCache {
    size_t capacity;
    unordered_map<int, Node*> map;
    Node head{0, 0}, tail{0, 0};                  // sentinels live inside the object

    void unlink(Node* n) { n->prev->next = n->next; n->next->prev = n->prev; }   // O(1)
    void pushFront(Node* n) {                     // O(1): right after the head sentinel
        n->prev = &head; n->next = head.next;
        head.next->prev = n; head.next = n;
    }
public:
    int lastEvicted = -1;                         // -1 = nothing evicted by the last put
    explicit LRUCache(size_t cap) : capacity(cap) { head.next = &tail; tail.prev = &head; }
    LRUCache(const LRUCache&) = delete;           // raw pointers: forbid accidental copies
    ~LRUCache() { for (auto& kv : map) delete kv.second; }   // we own the nodes

    int get(int key) {
        auto it = map.find(key);
        if (it == map.end()) return -1;
        unlink(it->second); pushFront(it->second);
        return it->second->value;
    }

    void put(int key, int value) {
        lastEvicted = -1;
        auto it = map.find(key);
        if (it != map.end()) {                    // update: new value, now most recent
            it->second->value = value;
            unlink(it->second); pushFront(it->second);
            return;
        }
        if (map.size() == capacity) {             // full: evict the node before the tail
            Node* lru = tail.prev;
            unlink(lru);
            map.erase(lru->key);                  // the node stores its key for exactly this
            lastEvicted = lru->key;
            delete lru;                           // free it AFTER the last use of lru->key
        }
        Node* fresh = new Node(key, value);
        map[key] = fresh;
        pushFront(fresh);
    }

    vector<int> forward() const {
        vector<int> out;
        for (Node* cur = head.next; cur != &tail; cur = cur->next) out.push_back(cur->key);
        return out;
    }
    vector<int> backward() const {
        vector<int> out;
        for (Node* cur = tail.prev; cur != &head; cur = cur->prev) out.push_back(cur->key);
        return out;
    }
    size_t mapSize() const { return map.size(); }
};

string fmt(const vector<int>& v) {
    string s = "[";
    for (size_t i = 0; i < v.size(); i++) s += (i ? ", " : "") + to_string(v[i]);
    return s + "]";
}

int main() {
    LRUCache c(3);
    vector<vector<int>> ops = {{1, 1}, {2, 2}, {3, 3}, {1}, {4, 4}, {2}, {3, 33}, {5, 5}, {4}, {3}};
    for (const auto& op : ops) {                 // {k} = get(k), {k, v} = put(k, v)
        string text;
        if (op.size() == 1) {
            text = "get(" + to_string(op[0]) + ") = " + to_string(c.get(op[0]));
        } else {
            c.put(op[0], op[1]);
            text = "put(" + to_string(op[0]) + ", " + to_string(op[1]) + ")";
            if (c.lastEvicted != -1) text += " evicted " + to_string(c.lastEvicted);
        }
        cout << text << "  newest first " << fmt(c.forward()) << "\\n";
    }
    vector<int> back = c.backward();
    reverse(back.begin(), back.end());
    bool ok = c.forward() == back && c.forward().size() == c.mapSize();
    cout << boolalpha << "prev and next links agree, list size = map size: " << ok << "\\n";
}`,
          },
          {
            label: `Array vs singly vs doubly linked list: hidden steps per access as capacity grows`,
            code: `#include <algorithm>
#include <iostream>
#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
using namespace std;

// Three ways to keep the recency order of an LRU cache, all with a hash map for
// membership. "steps" counts list elements visited or shifted, which is the
// hidden O(n) work; the doubly linked list never walks.
long long seed_ = 7;
long long rnd() { seed_ = seed_ * 48271 % 2147483647LL; return seed_; }

struct Result { long long steps, hits, mostWrites; };

Result arraySteps(const vector<int>& reqs, size_t cap) {
    vector<int> order;                               // order[0] = least recent
    unordered_set<int> present;
    long long steps = 0, hits = 0;
    for (int k : reqs) {
        if (present.count(k)) {
            hits++;
            size_t i = 0;
            while (order[i] != k) i++;                // find it: i + 1 comparisons
            steps += (i + 1) + (order.size() - 1 - i);
            order.erase(order.begin() + i);           // shifts the tail left
            order.push_back(k);
        } else {
            present.insert(k); order.push_back(k);
            if (order.size() > cap) {
                steps += order.size() - 1;            // erasing the front shifts everything
                present.erase(order.front());
                order.erase(order.begin());
            }
        }
    }
    return {steps, hits, 0};
}

struct SNode { int key; SNode* next; };

Result singlySteps(const vector<int>& reqs, size_t cap) {
    vector<unique_ptr<SNode>> pool;                  // owns every node; freed at return
    unordered_map<int, SNode*> nodes;
    SNode* head = nullptr;                           // head = most recent
    long long steps = 0, hits = 0;
    for (int k : reqs) {
        auto it = nodes.find(k);
        if (it != nodes.end()) {
            hits++;
            SNode* node = it->second;
            if (node == head) continue;
            SNode* prev = head; steps++;
            while (prev->next != node) { prev = prev->next; steps++; }   // no prev pointer: walk
            prev->next = node->next;
            node->next = head; head = node;
        } else {
            pool.push_back(make_unique<SNode>(SNode{k, head}));
            head = pool.back().get(); nodes[k] = head;
            if (nodes.size() > cap) {
                SNode* prev = head; steps++;
                while (prev->next->next != nullptr) { prev = prev->next; steps++; } // before the tail
                nodes.erase(prev->next->key);
                prev->next = nullptr;
            }
        }
    }
    return {steps, hits, 0};
}

struct DNode { int key; DNode* prev; DNode* next; };

Result doublySteps(const vector<int>& reqs, size_t cap) {
    vector<unique_ptr<DNode>> pool;
    DNode head{0, nullptr, nullptr}, tail{0, nullptr, nullptr};          // sentinels
    head.next = &tail; tail.prev = &head;
    unordered_map<int, DNode*> nodes;
    long long hits = 0, mostWrites = 0;
    for (int k : reqs) {
        long long writes = 0;
        DNode* node;
        auto it = nodes.find(k);
        if (it != nodes.end()) {
            hits++;
            node = it->second;
            node->prev->next = node->next; node->next->prev = node->prev;  // unlink: 2 writes
            writes += 2;
        } else {
            pool.push_back(make_unique<DNode>(DNode{k, nullptr, nullptr}));
            node = pool.back().get(); nodes[k] = node;
            if (nodes.size() > cap) {
                DNode* lru = tail.prev;                                    // no walk: tail.prev
                lru->prev->next = &tail; tail.prev = lru->prev;            // unlink: 2 writes
                writes += 2;
                nodes.erase(lru->key);
            }
        }
        node->prev = &head; node->next = head.next;                        // push front: 4 writes
        head.next->prev = node; head.next = node;
        writes += 4;
        mostWrites = max(mostWrites, writes);
    }
    return {0, hits, mostWrites};                    // 0 steps: there is no loop to count
}

string avg(long long steps, size_t n) {
    long long t = steps * 10 / (long long)n;
    return to_string(t / 10) + "." + to_string(t % 10);
}

int main() {
    cout << boolalpha;
    for (int cap : {10, 100, 1000}) {
        seed_ = 7;
        vector<int> reqs;
        for (int i = 0; i < 20000; i++) reqs.push_back((int)(rnd() % (2 * cap)));
        Result a = arraySteps(reqs, cap), s = singlySteps(reqs, cap), d = doublySteps(reqs, cap);
        cout << "capacity " << cap << ": steps per access: array " << avg(a.steps, reqs.size())
             << ", singly linked " << avg(s.steps, reqs.size()) << ", doubly linked " << avg(d.steps, reqs.size())
             << "; hits " << a.hits << " (same in all three: " << (a.hits == s.hits && s.hits == d.hits) << ")\\n";
        cout << "  doubly linked: at most " << d.mostWrites << " pointer writes in any single access\\n";
    }
}`,
          },
        ],
      },
    },
  },
];

export default augments;
